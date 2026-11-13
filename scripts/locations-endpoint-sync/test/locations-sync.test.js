// Unit tests for the locations-endpoint-sync function.
//
// What the function does:
//   A Cloud Functions (2nd gen) HTTP function (entryPoint `locationsWebhook` in index.js) that
//   receives Zesty.io locations-model webhooks. src/webhook-handler.js acks with 202 right away
//   and classifies the event (publish/delete/unpublish vs. update). src/locations-sync.js
//   debounces update bursts, queues publish events behind an in-flight run, fetches the full
//   locations JSON (preview domain for updates, live domain for publishes), and validates it.
//   src/zesty-view-commit.js then writes it into the locations.json views: the DEV view as a
//   draft on every run, and the LIVE view (published) on publish/delete/unpublish runs.
//
// What this file covers:
//   Debounce and queueing of rebuilds, retries on timeouts and 503/504, payload validation,
//   cache-buster URLs, Authorization headers, missing env vars, partial PUT failures, webhook
//   classification, and that error logs never print request config or tokens.
//
// How it stays offline:
//   axios is replaced with an in-memory stub and console.error is captured, so nothing touches
//   the network. Env values are fake (reserved `.test` domain), no .env is loaded and no
//   credentials are needed. Every test loads the src modules fresh, so module state never leaks.
//
// Disclaimer: every URL in this file (api.example.test, live.test, preview.test) is a
// placeholder, not a real Zesty.io URL. The .test domain is reserved and never resolves, so
// nothing here can reach a real Zesty instance, preview or live site.
//
// How to run (from scripts/locations-endpoint-sync, Node 18+, no npm install needed):
//   npm test
//   node --test test/locations-sync.test.js
//
// This is not `npm run start:function`: that starts the real function with the real .env and
// makes real calls to the website and the Zesty API.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('path');

// Paths to the code under test and the fake module id used for the axios stub.
const SRC = path.join(__dirname, '..', 'src');
const AXIOS_STUB_ID = path.join(__dirname, '__axios_stub__.js');
const OPTIONAL_ENV = ['LOCATIONS_MIN_COUNT'];

// All URLs below are placeholders, not real Zesty.io URLs (see the disclaimer at the top).
// Fake env applied before every test. Same variable names as deploy.config.example.json
// (plus DEV_TOKEN and ZESTY_API_BASE), with placeholder values and 1 ms delays so retries and
// the publish propagation wait don't slow the tests down.
const ENV = {
  INSTANCE_ZUID: 'inst',
  DEV_TOKEN: 'tok',
  ZESTY_API_BASE: 'https://api.example.test/v1/',
  LOCATIONS_VIEW_ZUID: 'LIVE',
  LOCATIONS_VIEW_DEV_ZUID: 'DEV',
  LOCATIONS_LIVE_DOMAIN: 'https://live.test',
  LOCATIONS_PREVIEW_DOMAIN: 'https://preview.test',
  LOCATIONS_ENDPOINT_PATH: '/loc.json',
  REBUILD_DEBOUNCE_MS: '45000',
  PUBLISH_PROPAGATION_DELAY_MS: '1',
  LOCATIONS_FETCH_RETRY_DELAY_MS: '1',
};

// URLs and payloads the stub expects, derived from ENV.
const LIVE_URL = 'https://live.test/loc.json';
const PREVIEW_URL = 'https://preview.test/loc.json';
const DEV_PUT_URL = 'https://api.example.test/v1/web/views/DEV';
const LIVE_PUT_URL = 'https://api.example.test/v1/web/views/LIVE';
const PUBLISH_PARAMS = { action: 'publish', purge_cache: true };
const DATA = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
const CACHE_BUSTER_RE = /[?&]_cb=\d+$/;

// Route require('axios') to a stub, whether or not axios is installed.
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, ...rest) {
  if (request === 'axios') return AXIOS_STUB_ID;
  return originalResolve.call(this, request, ...rest);
};

// Puts a ready-made module into require's cache so require() returns `exports` directly.
function cacheModule(id, exports) {
  const m = new Module(id);
  m.filename = id;
  m.loaded = true;
  m.exports = exports;
  require.cache[id] = m;
}

// A promise plus its resolve/reject, used to hold a stubbed request open mid-run.
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Builds an error shaped like an axios HTTP error response.
function httpError(status) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { error: status } },
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Polls until cond() is true, failing the test after ~500 polls (about 1 s or more).
async function waitFor(cond, label) {
  for (let i = 0; i < 500; i += 1) {
    if (cond()) return;
    await sleep(2);
  }
  assert.fail(`timed out waiting for: ${label}`);
}

let h; // per-test harness
// Real Date.now and console.error, saved so afterEach can restore them.
const realDateNow = Date.now;
const realConsoleError = console.error;

// Before each test: reset env, create a fresh harness, freeze the clock, capture errors,
// install the axios stub and reload the src modules so no run state carries over.
beforeEach(() => {
  for (const key of OPTIONAL_ENV) delete process.env[key];
  Object.assign(process.env, ENV);

  h = {
    now: 1000000,
    gets: [], // { url (cache-buster stripped), rawUrl, config }
    puts: [], // { url, body, params, headers }
    events: [], // ordered I/O events
    errors: [], // console.error lines
    unexpected: [],
    allowedGetUrls: [LIVE_URL, PREVIEW_URL],
    overlap: [],
    activeGets: 0,
    activePuts: 0,
    // Override per test: (url, index) => Promise|value. Default returns DATA.
    getImpl: null,
    // Override per test: (url, body, config, index) => Promise|value.
    putImpl: null,
  };
  // Tests move time forward by changing h.now; errors are collected instead of printed.
  Date.now = () => h.now;
  console.error = (...args) => h.errors.push(args.join(' '));

  // In-memory axios: records every GET/PUT, rejects any URL the test didn't expect, and
  // flags overlapping runs. Responses come from h.getImpl / h.putImpl or the defaults.
  cacheModule(AXIOS_STUB_ID, {
    async get(rawUrl, config) {
      const url = rawUrl.replace(CACHE_BUSTER_RE, '');
      if (!h.allowedGetUrls.includes(url) || url === rawUrl) {
        h.unexpected.push(`GET ${rawUrl}`);
        throw new Error(`un-stubbed axios.get ${rawUrl}`);
      }
      // A GET starting while anything else is outstanding means two runs overlap.
      if (h.activeGets > 0 || h.activePuts > 0) h.overlap.push(`GET ${url}`);
      const index = h.gets.length;
      h.gets.push({ url, rawUrl, config });
      h.events.push(`get:${url}`);
      h.activeGets += 1;
      try {
        const data = h.getImpl ? await h.getImpl(url, index) : DATA;
        return { data };
      } finally {
        h.activeGets -= 1;
      }
    },
    async put(url, body, config) {
      if (url !== DEV_PUT_URL && url !== LIVE_PUT_URL) {
        h.unexpected.push(`PUT ${url}`);
        throw new Error(`un-stubbed axios.put ${url}`);
      }
      if (h.activeGets > 0) h.overlap.push(`PUT ${url}`);
      const index = h.puts.length;
      const lastGet = h.gets[h.gets.length - 1];
      h.puts.push({
        url,
        body,
        params: config && config.params,
        headers: config && config.headers,
        afterGet: lastGet && lastGet.url,
      });
      h.activePuts += 1;
      try {
        if (h.putImpl) await h.putImpl(url, body, config, index);
        h.events.push(`put-done:${url}`);
        return { data: {} };
      } finally {
        h.activePuts -= 1;
      }
    },
    async request() {
      h.unexpected.push('request');
      throw new Error('un-stubbed axios.request');
    },
  });
  // Drop cached src modules so each test gets fresh in-memory run state.
  for (const f of ['locations-sync.js', 'zesty-view-commit.js', 'webhook-handler.js']) {
    delete require.cache[path.join(SRC, f)];
  }
  h.sync = require(path.join(SRC, 'locations-sync.js'));
  h.handler = require(path.join(SRC, 'webhook-handler.js'));
});

// After each test: restore Date.now and console.error, then check the shared invariants.
afterEach(() => {
  Date.now = realDateNow;
  console.error = realConsoleError;
  assert.deepEqual(h.unexpected, [], 'no un-stubbed axios calls');
  assert.deepEqual(h.overlap, [], 'never more than one run executing at once');
  // Invariant: every LIVE PUT publishes, and only follows a live-domain fetch (never an update run).
  for (const p of h.puts) {
    if (p.url === LIVE_PUT_URL) {
      assert.deepEqual(p.params, PUBLISH_PARAMS);
      assert.equal(p.afterGet, LIVE_URL);
    } else {
      assert.deepEqual(p.params, {});
    }
  }
});

// Shortcuts: start a rebuild, and filter recorded PUTs by target view.
const trigger = (publish, action) => h.sync.triggerRebuild(publish, action);
const livePuts = () => h.puts.filter((p) => p.url === LIVE_PUT_URL);
const devPuts = () => h.puts.filter((p) => p.url === DEV_PUT_URL);
const expectedBody = { code: JSON.stringify(DATA, null, 2) };

// Holds the GET with the given index until the returned deferred is settled.
function holdGet(index) {
  const d = deferred();
  const prev = h.getImpl;
  h.getImpl = (url, i) => {
    if (i === index) return d.promise;
    return prev ? prev(url, i) : DATA;
  };
  return d;
}

// Wraps a promise so a test can check whether it has settled yet without awaiting it.
function track(promise) {
  const t = { settled: false, rejected: false, value: undefined };
  t.promise = promise.then(
    (v) => { t.settled = true; t.value = v; },
    (e) => { t.settled = true; t.rejected = e; },
  );
  return t;
}

// 1, 21
// An update with no prior runs fetches the preview endpoint and writes only the DEV draft.
test('update on fresh state fetches preview and writes DEV only', async () => {
  await trigger(false, 'update');
  assert.deepEqual(h.gets.map((g) => g.url), [PREVIEW_URL]);
  assert.equal(devPuts().length, 1);
  assert.deepEqual(devPuts()[0].params, {});
  assert.deepEqual(devPuts()[0].body, expectedBody);
  assert.equal(livePuts().length, 0);
  assert.deepEqual(h.errors, []);
});

// 2, 3, 21
// Publish, delete and unpublish fetch the live endpoint and write DEV (draft) and LIVE (published).
for (const action of ['publish', 'delete', 'unpublish']) {
  test(`${action} on fresh state fetches live and writes DEV draft + LIVE published`, async () => {
    await trigger(true, action);
    assert.deepEqual(h.gets.map((g) => g.url), [LIVE_URL]);
    assert.equal(devPuts().length, 1);
    assert.deepEqual(devPuts()[0].params, {});
    assert.deepEqual(devPuts()[0].body, expectedBody);
    assert.equal(livePuts().length, 1);
    assert.deepEqual(livePuts()[0].params, PUBLISH_PARAMS);
    assert.deepEqual(livePuts()[0].body, expectedBody);
    assert.deepEqual(h.errors, []);
  });
}

// 4, 5
// A publish or delete right after an update is never debounced; it runs and writes LIVE.
for (const action of ['publish', 'delete']) {
  test(`${action} right after a completed update is not debounced`, async () => {
    await trigger(false, 'update');
    h.now += 1000;
    const result = await trigger(true, action);
    assert.notDeepEqual(result, { skipped: true });
    assert.equal(livePuts().length, 1);
    assert.deepEqual(h.gets.map((g) => g.url), [PREVIEW_URL, LIVE_URL]);
  });
}

// 6, 7, 22
// A publish arriving mid-update waits for the update, then runs once and resolves after its LIVE PUT.
test('publish during an in-flight update is queued and runs once after it settles', async () => {
  const held = holdGet(0);
  const update = track(trigger(false, 'update'));
  await waitFor(() => h.gets.length === 1, 'update GET');

  let liveHeld;
  h.putImpl = (url) => {
    if (url !== LIVE_PUT_URL) return undefined;
    liveHeld = deferred();
    return liveHeld.promise;
  };
  const pub = track(trigger(true, 'publish'));

  await sleep(20);
  assert.equal(h.gets.length, 1, 'no new GET before held GET resolves');
  assert.equal(livePuts().length, 0);

  held.resolve(DATA);
  await update.promise;
  assert.equal(update.rejected, false);
  // The update itself wrote DEV only.
  assert.equal(h.puts[0].url, DEV_PUT_URL);

  await waitFor(() => livePuts().length === 1, 'follow-up LIVE PUT');
  await sleep(10);
  assert.equal(pub.settled, false, 'queued publish resolves only after the LIVE PUT completes');
  liveHeld.resolve();
  await pub.promise;
  assert.equal(pub.rejected, false);

  assert.deepEqual(h.gets.map((g) => g.url), [PREVIEW_URL, LIVE_URL]);
  assert.equal(livePuts().length, 1);
  assert.deepEqual(livePuts()[0].params, PUBLISH_PARAMS);
  assert.equal(devPuts().length, 2);
});

// 8, 22
// Many publish/delete events during one run collapse into a single follow-up run.
test('10 mixed publish/delete during an in-flight update coalesce into one follow-up', async () => {
  const held = holdGet(0);
  const update = track(trigger(false, 'update'));
  await waitFor(() => h.gets.length === 1, 'update GET');

  const queued = [];
  for (let i = 0; i < 10; i += 1) {
    const t = track(trigger(true, i % 2 ? 'delete' : 'publish'));
    t.promise.then(() => h.events.push('resolved'));
    queued.push(t);
  }

  held.resolve(DATA);
  await Promise.all([update.promise, ...queued.map((t) => t.promise)]);
  assert.ok(queued.every((t) => t.settled && !t.rejected));
  assert.equal(h.gets.length, 2);
  assert.equal(livePuts().length, 1);
  const liveDone = h.events.indexOf(`put-done:${LIVE_PUT_URL}`);
  const firstResolved = h.events.indexOf('resolved');
  assert.ok(liveDone >= 0 && firstResolved > liveDone, 'all resolve after the follow-up LIVE PUT');
});

// 9
// A publish in flight plus any number of new publish events gives exactly one extra run.
for (const n of [1, 5]) {
  test(`publish in flight + ${n} more publish/delete -> 2 LIVE PUTs`, async () => {
    const held = holdGet(0);
    const first = trigger(true, 'publish');
    await waitFor(() => h.gets.length === 1, 'first GET');
    const more = [];
    for (let i = 0; i < n; i += 1) more.push(trigger(true, i % 2 ? 'delete' : 'publish'));
    held.resolve(DATA);
    await Promise.all([first, ...more]);
    assert.equal(h.gets.length, 2);
    assert.equal(livePuts().length, 2);
  });
}

// 10
// A publish arriving during the queued follow-up gets its own run instead of being dropped.
test('publish arriving while the follow-up is in flight is not lost', async () => {
  const held0 = holdGet(0);
  const held1 = holdGet(1);
  const p1 = trigger(true, 'publish');
  await waitFor(() => h.gets.length === 1, 'first GET');
  const p2 = trigger(true, 'publish');
  held0.resolve(DATA);
  await waitFor(() => h.gets.length === 2, 'follow-up GET');
  const p3 = trigger(true, 'delete');
  held1.resolve(DATA);
  await Promise.all([p1, p2, p3]);
  assert.equal(h.gets.length, 3);
  assert.equal(livePuts().length, 3);
  assert.deepEqual(
    h.events.filter((e) => e.startsWith('get:') || e === `put-done:${LIVE_PUT_URL}`),
    [`get:${LIVE_URL}`, `put-done:${LIVE_PUT_URL}`, `get:${LIVE_URL}`, `put-done:${LIVE_PUT_URL}`,
      `get:${LIVE_URL}`, `put-done:${LIVE_PUT_URL}`],
  );
});

// 12
// A second update inside REBUILD_DEBOUNCE_MS returns { skipped: true } and makes no calls.
test('update within the debounce window is skipped with no axios calls', async () => {
  await trigger(false, 'update');
  const gets = h.gets.length;
  const puts = h.puts.length;
  h.now += 44999;
  const result = await trigger(false, 'update');
  assert.deepEqual(result, { skipped: true });
  assert.equal(h.gets.length, gets);
  assert.equal(h.puts.length, puts);
});

// 13
// Updates arriving while a run is in flight or a publish is queued add no extra run.
test('update while a run is in flight or a publish follow-up is pending adds no run', async () => {
  const held = holdGet(0);
  const first = trigger(false, 'update');
  await waitFor(() => h.gets.length === 1, 'update GET');
  h.now += 100000; // even past the debounce window
  const u1 = trigger(false, 'update');
  const pub = trigger(true, 'publish');
  const u2 = trigger(false, 'update');
  held.resolve(DATA);
  await Promise.all([first, u1, pub, u2]);
  await sleep(20);
  assert.equal(h.gets.length, 2);
  assert.equal(livePuts().length, 1);
});

// An update during a publish run is skipped and causes no second LIVE PUT.
test('update while a publish run is in flight adds no run and no LIVE PUT', async () => {
  const held = holdGet(0);
  const pub = trigger(true, 'publish');
  await waitFor(() => h.gets.length === 1, 'publish GET');
  h.now += 100000;
  const u = trigger(false, 'update');
  held.resolve(DATA);
  await Promise.all([pub, u]);
  await sleep(20);
  assert.equal(h.gets.length, 1);
  assert.equal(livePuts().length, 1);
});

// 14
// An update after the debounce window runs again and writes DEV only.
test('update after the debounce window runs normally', async () => {
  await trigger(false, 'update');
  h.now += 45000;
  const result = await trigger(false, 'update');
  assert.notDeepEqual(result, { skipped: true });
  assert.deepEqual(h.gets.map((g) => g.url), [PREVIEW_URL, PREVIEW_URL]);
  assert.equal(devPuts().length, 2);
  assert.equal(livePuts().length, 0);
});

// 16
// If the in-flight update fails, the queued publish still runs and writes LIVE.
test('failed in-flight update still runs the queued publish', async () => {
  const held = holdGet(0);
  const update = track(trigger(false, 'update'));
  await waitFor(() => h.gets.length === 1, 'update GET');
  const pub = track(trigger(true, 'publish'));
  held.reject(httpError(404));
  await Promise.all([update.promise, pub.promise]);
  assert.equal(update.rejected, false);
  assert.equal(pub.rejected, false);
  assert.deepEqual(h.errors, ['locationsSync: rebuild failed: Request failed with status code 404']);
  assert.equal(livePuts().length, 1);
  assert.deepEqual(h.gets.map((g) => g.url), [PREVIEW_URL, LIVE_URL]);
});

// 17
// A failed publish run logs the error and resets state, so the next publish runs right away.
test('failed publish run clears state; next publish starts immediately', async () => {
  h.putImpl = (url, body, config, i) => {
    if (url === LIVE_PUT_URL && i < 2) throw httpError(500);
  };
  const first = track(trigger(true, 'publish'));
  await first.promise;
  assert.equal(first.rejected, false);
  assert.match(h.errors.at(-1), /^locationsSync: rebuild failed: /);

  h.now += 1;
  const errorCount = h.errors.length;
  const second = await trigger(true, 'publish');
  assert.notDeepEqual(second, { skipped: true });
  assert.equal(h.gets.length, 2);
  assert.equal(livePuts().length, 2);
  assert.equal(h.errors.length, errorCount, 'second run succeeds');
});

// 18
// Fetch retry rules: a 503 is retried, a 404 is not, and it gives up after 3 attempts.
test('fetch retries a 503 then succeeds', async () => {
  h.getImpl = (url, i) => { if (i === 0) throw httpError(503); return DATA; };
  await trigger(true, 'publish');
  assert.equal(h.gets.length, 2);
  assert.equal(livePuts().length, 1);
  assert.deepEqual(h.errors, []);
});

test('fetch does not retry a 404', async () => {
  h.getImpl = () => { throw httpError(404); };
  await trigger(true, 'publish');
  assert.equal(h.gets.length, 1);
  assert.deepEqual(h.errors, ['locationsSync: rebuild failed: Request failed with status code 404']);
  assert.equal(h.puts.length, 0);
});

test('fetch gives up after 3 x 503', async () => {
  h.getImpl = () => { throw httpError(503); };
  await trigger(true, 'publish');
  assert.equal(h.gets.length, 3);
  assert.deepEqual(h.errors, ['locationsSync: rebuild failed: Request failed with status code 503']);
  assert.equal(h.puts.length, 0);
});

// 19, 20
// Minimal Express-style response that records status/json calls and how many GETs had started.
function mockRes() {
  const res = { calls: [] };
  res.status = (code) => { res.calls.push({ status: code, getsAtAck: h.gets.length }); return res; };
  res.json = (body) => { res.calls.push({ json: body }); return res; };
  return res;
}

// The handler responds 202 before any fetch, then runs the publish rebuild.
test('handler acks 202 before fetching, and publishes', async () => {
  const res = mockRes();
  await h.handler.handleZestyWebhook({ body: { text: 'A location has been published' } }, res);
  assert.deepEqual(res.calls, [{ status: 202, getsAtAck: 0 }, { json: { received: true } }]);
  assert.deepEqual(h.gets.map((g) => g.url), [LIVE_URL]);
  assert.equal(livePuts().length, 1);
});

// The handler still acks immediately while an update is running, and the publish writes LIVE after it.
test('handler acks a publish immediately while an update is in flight, then writes LIVE', async () => {
  const held = holdGet(0);
  const update = trigger(false, 'update');
  await waitFor(() => h.gets.length === 1, 'update GET');
  const res = mockRes();
  const handled = track(h.handler.handleZestyWebhook({ body: { text: 'A location has been published' } }, res));
  assert.deepEqual(res.calls, [{ status: 202, getsAtAck: 1 }, { json: { received: true } }]);
  held.resolve(DATA);
  await Promise.all([update, handled.promise]);
  assert.equal(handled.rejected, false);
  assert.equal(livePuts().length, 1);
});

// Webhook text -> expected action and whether it writes LIVE. Matching is case-insensitive;
// "delete" wins over "publish", "unpublish" over "publish", and "not published" on its own is an update.
const CLASSIFICATION = [
  ['A location has been published', 'publish', true],
  ['A location has been deleted', 'delete', true],
  ['A location has been created!', 'update', false],
  ['A location has not been published yet', 'update', false],
  ['A location has been unpublished', 'unpublish', true],
  ['Another location has been published', 'publish', true],
  ['notification: A location has been published', 'publish', true],
  ['Not published. Now published!', 'publish', true],
  ['A LOCATION HAS BEEN PUBLISHED', 'publish', true],
  ['A notification was sent. Location has been published', 'publish', true],
  ['NOT PUBLISHED yet', 'update', false],
  ['Item has been unpublished', 'unpublish', true],
  ['Item UNPUBLISHED', 'unpublish', true],
  ['Deleted and republished', 'delete', true],
  ['DELETED', 'delete', true],
  ['Location saved', 'update', false],
  ['', 'update', false],
  [undefined, 'update', false],
];
for (const [text, action, live] of CLASSIFICATION) {
  test(`handler classifies "${text}" as ${action}`, async () => {
    await h.handler.handleZestyWebhook({ body: { text } }, mockRes());
    assert.deepEqual(h.gets.map((g) => g.url), [live ? LIVE_URL : PREVIEW_URL]);
    assert.equal(livePuts().length, live ? 1 : 0);
    assert.equal(devPuts().length, 1);
  });
}

// A request timeout (ECONNABORTED) is retried like a 503.
test('fetch retries a timeout', async () => {
  h.getImpl = (url, i) => {
    if (i === 0) throw Object.assign(new Error('timeout of 120000ms exceeded'), { code: 'ECONNABORTED' });
    return DATA;
  };
  await trigger(true, 'publish');
  assert.equal(h.gets.length, 2);
  assert.equal(livePuts().length, 1);
});

// A payload that isn't a non-empty array fails the run and writes nothing.
for (const [name, payload] of [
  ['HTML string', '<!DOCTYPE html><html><body>Error</body></html>'],
  ['object', { error: 'nope' }],
  ['empty array', []],
  ['null', null],
]) {
  test(`invalid payload (${name}) writes nothing`, async () => {
    h.getImpl = () => payload;
    await trigger(true, 'publish');
    assert.equal(h.gets.length, 1);
    assert.equal(h.puts.length, 0);
    assert.equal(h.errors.length, 1);
    assert.match(h.errors[0], /^locationsSync: rebuild failed: invalid payload/);
  });
}

// Fewer items than LOCATIONS_MIN_COUNT also fails the run and writes nothing.
test('payload below LOCATIONS_MIN_COUNT writes nothing', async () => {
  process.env.LOCATIONS_MIN_COUNT = '3';
  await trigger(true, 'publish');
  assert.equal(h.puts.length, 0);
  assert.match(h.errors[0], /^locationsSync: rebuild failed: invalid payload/);
});

// Cache-buster: `?_cb=` on a plain path, `&_cb=` when the path already has a query, new on each retry.
test('GET URL gets a cache-buster with a single "?"', async () => {
  await trigger(true, 'publish');
  assert.equal(h.gets[0].rawUrl, `${LIVE_URL}?_cb=${h.now}`);
});

test('GET URL cache-buster is appended with "&" when the path has a query', async () => {
  process.env.LOCATIONS_ENDPOINT_PATH = '/loc.json?zpw=secret';
  h.allowedGetUrls.push('https://preview.test/loc.json?zpw=secret');
  await trigger(false, 'update');
  const { rawUrl } = h.gets[0];
  assert.equal(rawUrl, `https://preview.test/loc.json?zpw=secret&_cb=${h.now}`);
  assert.equal(rawUrl.split('?').length, 2);
});

test('each retry attempt gets a fresh cache-buster', async () => {
  h.getImpl = (url, i) => {
    h.now += 1;
    if (i === 0) throw httpError(504);
    return DATA;
  };
  await trigger(true, 'publish');
  assert.equal(h.gets.length, 2);
  assert.notEqual(h.gets[0].rawUrl, h.gets[1].rawUrl);
  for (const g of h.gets) assert.match(g.rawUrl, /^https:\/\/live\.test\/loc\.json\?_cb=\d+$/);
});

// Fetches from the website never send the Zesty token.
test('GET sends no Authorization header', async () => {
  await trigger(true, 'publish');
  h.now += 100000;
  await trigger(false, 'update');
  assert.equal(h.gets.length, 2);
  for (const g of h.gets) {
    const headers = (g.config && g.config.headers) || {};
    assert.ok(!Object.keys(headers).some((k) => k.toLowerCase() === 'authorization'));
  }
});

// A token with stray whitespace or a newline still produces a valid `Bearer` header.
test('DEV_TOKEN whitespace is trimmed in the PUT Authorization header', async () => {
  process.env.DEV_TOKEN = '  tok\n';
  await trigger(true, 'publish');
  assert.equal(h.puts.length, 2);
  for (const p of h.puts) assert.equal(p.headers.Authorization, 'Bearer tok');
});

// Missing required env vars stop the run before any fetch and list the missing names.
test('missing required env vars fail the run without fetching', async () => {
  delete process.env.DEV_TOKEN;
  delete process.env.LOCATIONS_VIEW_DEV_ZUID;
  await trigger(true, 'publish');
  assert.equal(h.gets.length, 0);
  assert.equal(h.puts.length, 0);
  assert.deepEqual(h.errors, [
    'locationsSync: rebuild failed: missing required env vars: DEV_TOKEN, LOCATIONS_VIEW_DEV_ZUID',
  ]);
});

// One view PUT failing doesn't block the other; both errors are logged and the run fails.
test('one PUT failing still writes the other and the run fails', async () => {
  h.putImpl = (url) => { if (url === LIVE_PUT_URL) throw httpError(500); };
  await trigger(true, 'publish');
  assert.equal(h.puts.length, 2);
  assert.deepEqual(h.errors, [
    'updateLocationsView: view write failed for LIVE: Request failed with status code 500',
    'locationsSync: rebuild failed: Request failed with status code 500',
  ]);
});

test('DEV PUT failing still writes LIVE, and the run fails', async () => {
  h.putImpl = (url) => { if (url === DEV_PUT_URL) throw httpError(401); };
  await trigger(true, 'publish');
  assert.equal(livePuts().length, 1);
  assert.deepEqual(h.errors, [
    'updateLocationsView: view write failed for DEV: Request failed with status code 401',
    'locationsSync: rebuild failed: Request failed with status code 401',
  ]);
});

// Calling updateLocationsView directly for a draft-only write rejects when that PUT fails.
test('updateLocationsView rejects when its only PUT fails', async () => {
  h.putImpl = () => { throw httpError(401); };
  const { updateLocationsView } = require(path.join(SRC, 'zesty-view-commit.js'));
  await assert.rejects(updateLocationsView(DATA, { publish: false }), /status code 401/);
  assert.deepEqual(h.errors, ['updateLocationsView: view write failed for DEV: Request failed with status code 401']);
});

// Error logs contain only the message, so the token and zpw value never appear.
test('errors print only the message, never the request config', async () => {
  process.env.LOCATIONS_ENDPOINT_PATH = '/loc.json?zpw=secret';
  h.allowedGetUrls.push('https://live.test/loc.json?zpw=secret');
  h.getImpl = (url) => {
    throw Object.assign(httpError(404), { config: { url, headers: { Authorization: 'Bearer tok' } } });
  };
  await trigger(true, 'publish');
  assert.deepEqual(h.errors, ['locationsSync: rebuild failed: Request failed with status code 404']);
});
