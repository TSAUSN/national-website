// Offline tests for the rebuild trigger (src/locations-sync.js) and webhook handler.
// axios and the file logger are replaced with in-memory stubs, so nothing touches the network
// or writes to logs/. Every test loads the src modules fresh, so module state never leaks.
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const AXIOS_STUB_ID = path.join(__dirname, '__axios_stub__.js');
const LOGGER_ID = path.join(SRC, 'logger.js');

const ENV = {
  INSTANCE_ZUID: 'inst',
  LOCATIONS_VIEW_ZUID: 'LIVE',
  LOCATIONS_VIEW_DEV_ZUID: 'DEV',
  LOCATIONS_LIVE_DOMAIN: 'https://live.test',
  LOCATIONS_PREVIEW_DOMAIN: 'https://preview.test',
  LOCATIONS_ENDPOINT_PATH: '/loc.json',
  REBUILD_DEBOUNCE_MS: '45000',
  PUBLISH_PROPAGATION_DELAY_MS: '1',
  LOCATIONS_FETCH_RETRY_DELAY_MS: '1',
};

const LIVE_URL = 'https://live.test/loc.json';
const PREVIEW_URL = 'https://preview.test/loc.json';
const DEV_PUT_URL = 'https://inst.api.zesty.io/v1/web/views/DEV';
const LIVE_PUT_URL = 'https://inst.api.zesty.io/v1/web/views/LIVE';
const PUBLISH_PARAMS = { action: 'publish', purge_cache: true };
const DATA = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];

// Route require('axios') to a stub, whether or not axios is installed.
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function resolve(request, ...rest) {
  if (request === 'axios') return AXIOS_STUB_ID;
  return originalResolve.call(this, request, ...rest);
};

function cacheModule(id, exports) {
  const m = new Module(id);
  m.filename = id;
  m.loaded = true;
  m.exports = exports;
  require.cache[id] = m;
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function httpError(status) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { error: status } },
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(cond, label) {
  for (let i = 0; i < 500; i += 1) {
    if (cond()) return;
    await sleep(2);
  }
  assert.fail(`timed out waiting for: ${label}`);
}

let h; // per-test harness
const realDateNow = Date.now;

beforeEach(() => {
  Object.assign(process.env, ENV);

  h = {
    now: 1000000,
    gets: [], // { url, config }
    puts: [], // { url, body, params }
    events: [], // ordered I/O events
    logs: [], // { label, data }
    errorLogs: [], // { label, error }
    unexpected: [],
    overlap: [],
    activeGets: 0,
    activePuts: 0,
    // Override per test: (url, index) => Promise|value. Default returns DATA.
    getImpl: null,
    // Override per test: (url, body, config, index) => Promise|value.
    putImpl: null,
  };
  Date.now = () => h.now;

  cacheModule(AXIOS_STUB_ID, {
    async get(url, config) {
      if (url !== LIVE_URL && url !== PREVIEW_URL) {
        h.unexpected.push(`GET ${url}`);
        throw new Error(`un-stubbed axios.get ${url}`);
      }
      // A GET starting while anything else is outstanding means two runs overlap.
      if (h.activeGets > 0 || h.activePuts > 0) h.overlap.push(`GET ${url}`);
      const index = h.gets.length;
      h.gets.push({ url, config });
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
      h.puts.push({ url, body, params: config && config.params, afterGet: lastGet && lastGet.url });
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
  cacheModule(LOGGER_ID, {
    logToFile(data, label) { h.logs.push({ label, data }); },
    errorLogToFile(error, label) { h.errorLogs.push({ label, error }); },
  });

  for (const f of ['locations-sync.js', 'zesty-view-commit.js', 'webhook-handler.js']) {
    delete require.cache[path.join(SRC, f)];
  }
  h.sync = require(path.join(SRC, 'locations-sync.js'));
  h.handler = require(path.join(SRC, 'webhook-handler.js'));
});

afterEach(() => {
  Date.now = realDateNow;
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

const trigger = (publish, action) => h.sync.triggerRebuild(publish, action);
const livePuts = () => h.puts.filter((p) => p.url === LIVE_PUT_URL);
const devPuts = () => h.puts.filter((p) => p.url === DEV_PUT_URL);
const logsLabelled = (label) => h.logs.filter((l) => l.label === label);
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

function track(promise) {
  const t = { settled: false, rejected: false, value: undefined };
  t.promise = promise.then(
    (v) => { t.settled = true; t.value = v; },
    (e) => { t.settled = true; t.rejected = e; },
  );
  return t;
}

// 1, 21
test('update on fresh state fetches preview and writes DEV only', async () => {
  await trigger(false, 'update');
  assert.deepEqual(h.gets.map((g) => g.url), [PREVIEW_URL]);
  assert.equal(devPuts().length, 1);
  assert.deepEqual(devPuts()[0].params, {});
  assert.deepEqual(devPuts()[0].body, expectedBody);
  assert.equal(livePuts().length, 0);
  const rebuilt = logsLabelled('rebuilt');
  assert.equal(rebuilt.length, 1);
  assert.deepEqual(rebuilt[0].data.viewZuids, ['DEV']);
});

// 2, 3, 21
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
    const rebuilt = logsLabelled('rebuilt');
    assert.equal(rebuilt.length, 1);
    assert.deepEqual(rebuilt[0].data.viewZuids, ['DEV', 'LIVE']);
  });
}

// 4, 5
for (const action of ['publish', 'delete']) {
  test(`${action} right after a completed update is not debounced`, async () => {
    await trigger(false, 'update');
    h.now += 1000;
    const result = await trigger(true, action);
    assert.notDeepEqual(result, { skipped: true });
    assert.equal(livePuts().length, 1);
    assert.equal(logsLabelled('debounced').length, 0);
    assert.deepEqual(h.gets.map((g) => g.url), [PREVIEW_URL, LIVE_URL]);
  });
}

// 6, 7, 22
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
  assert.equal(logsLabelled('queued behind in-flight run').length, 1);

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
  assert.deepEqual(logsLabelled('rebuilt').map((l) => l.data.viewZuids), [['DEV'], ['DEV', 'LIVE']]);
});

// 8, 22
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
  assert.equal(logsLabelled('queued behind in-flight run').length, 10);

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
test('update within the debounce window is skipped with no axios calls', async () => {
  await trigger(false, 'update');
  const gets = h.gets.length;
  const puts = h.puts.length;
  h.now += 44999;
  const result = await trigger(false, 'update');
  assert.deepEqual(result, { skipped: true });
  assert.equal(logsLabelled('debounced').length, 1);
  assert.equal(h.gets.length, gets);
  assert.equal(h.puts.length, puts);
});

// 13
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
test('failed in-flight update still runs the queued publish', async () => {
  const held = holdGet(0);
  const update = track(trigger(false, 'update'));
  await waitFor(() => h.gets.length === 1, 'update GET');
  const pub = track(trigger(true, 'publish'));
  held.reject(httpError(404));
  await Promise.all([update.promise, pub.promise]);
  assert.equal(update.rejected, false);
  assert.equal(pub.rejected, false);
  assert.deepEqual(h.errorLogs.map((e) => e.label), ['rebuild failed']);
  assert.equal(livePuts().length, 1);
  assert.deepEqual(h.gets.map((g) => g.url), [PREVIEW_URL, LIVE_URL]);
});

// 17
test('failed publish run clears state; next publish starts immediately', async () => {
  h.putImpl = (url, body, config, i) => {
    if (url === LIVE_PUT_URL && i < 2) throw httpError(500);
  };
  const first = track(trigger(true, 'publish'));
  await first.promise;
  assert.equal(first.rejected, false);
  assert.deepEqual(h.errorLogs.map((e) => e.label), ['rebuild failed']);

  h.now += 1;
  const second = await trigger(true, 'publish');
  assert.notDeepEqual(second, { skipped: true });
  assert.equal(logsLabelled('debounced').length, 0);
  assert.equal(h.gets.length, 2);
  assert.equal(livePuts().length, 2);
  assert.equal(logsLabelled('rebuilt').length, 1);
});

// 18
test('fetch retries a 503 then succeeds', async () => {
  h.getImpl = (url, i) => { if (i === 0) throw httpError(503); return DATA; };
  await trigger(true, 'publish');
  assert.equal(h.gets.length, 2);
  assert.equal(logsLabelled('fetch retry').length, 1);
  assert.equal(livePuts().length, 1);
  assert.equal(h.errorLogs.length, 0);
});

test('fetch does not retry a 404', async () => {
  h.getImpl = () => { throw httpError(404); };
  await trigger(true, 'publish');
  assert.equal(h.gets.length, 1);
  assert.equal(logsLabelled('fetch retry').length, 0);
  assert.deepEqual(h.errorLogs.map((e) => e.label), ['rebuild failed']);
  assert.equal(h.puts.length, 0);
});

test('fetch gives up after 3 x 503', async () => {
  h.getImpl = () => { throw httpError(503); };
  await trigger(true, 'publish');
  assert.equal(h.gets.length, 3);
  assert.equal(logsLabelled('fetch retry').length, 2);
  assert.deepEqual(h.errorLogs.map((e) => e.label), ['rebuild failed']);
  assert.equal(h.puts.length, 0);
});

// 19, 20
function mockRes() {
  const res = { calls: [] };
  res.status = (code) => { res.calls.push({ status: code, getsAtAck: h.gets.length }); return res; };
  res.json = (body) => { res.calls.push({ json: body }); return res; };
  return res;
}

test('handler acks 202 before fetching, and publishes', async () => {
  const res = mockRes();
  await h.handler.handleZestyWebhook({ body: { text: 'A location has been published' } }, res);
  assert.deepEqual(res.calls, [{ status: 202, getsAtAck: 0 }, { json: { received: true } }]);
  assert.deepEqual(h.gets.map((g) => g.url), [LIVE_URL]);
  assert.equal(livePuts().length, 1);
});

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
    const received = logsLabelled('received');
    assert.equal(received.length, 1);
    assert.equal(received[0].data.action, action);
    assert.deepEqual(h.gets.map((g) => g.url), [live ? LIVE_URL : PREVIEW_URL]);
    assert.equal(livePuts().length, live ? 1 : 0);
    assert.deepEqual(logsLabelled('rebuilt')[0].data.viewZuids, live ? ['DEV', 'LIVE'] : ['DEV']);
  });
}
