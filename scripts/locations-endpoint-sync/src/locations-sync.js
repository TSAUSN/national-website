// Rebuilds the full locations JSON from scratch on every trigger, rather than tracking
// which item changed. This is the logic that eventually moves into the GCP cloud function
// (cloud-functions/location-sync) - kept as a standalone module so it can be lifted as-is.
const axios = require('axios');
const { updateLocationsView } = require('./zesty-view-commit');

const REQUIRED_ENV = [
  'LOCATIONS_ENDPOINT_PATH',
  'LOCATIONS_LIVE_DOMAIN',
  'LOCATIONS_PREVIEW_DOMAIN',
  'DEV_TOKEN',
  'INSTANCE_ZUID',
  'LOCATIONS_VIEW_ZUID',
  'LOCATIONS_VIEW_DEV_ZUID',
];
const RETRYABLE_STATUS_CODES = [502, 503, 504];

// Read on every call so the values in effect are whatever the runtime currently provides.
// The source endpoint queries ~3500 items and can be slow to render, so it gets generous
// headroom and transient gateway timeouts (502/503/504) from Varnish/nginx are retried - a
// retry often lands once the backend/cache has warmed up. The propagation delay avoids racing
// the CDN cache purge on publish events.
function getConfig() {
  return {
    endpointPath: process.env.LOCATIONS_ENDPOINT_PATH,
    liveDomain: process.env.LOCATIONS_LIVE_DOMAIN,
    previewDomain: process.env.LOCATIONS_PREVIEW_DOMAIN,
    debounceMs: Number(process.env.REBUILD_DEBOUNCE_MS) || 45000,
    fetchTimeoutMs: Number(process.env.LOCATIONS_FETCH_TIMEOUT_MS) || 120000,
    fetchMaxRetries: Number(process.env.LOCATIONS_FETCH_MAX_RETRIES) || 3,
    fetchRetryDelayMs: Number(process.env.LOCATIONS_FETCH_RETRY_DELAY_MS) || 15000,
    publishPropagationDelayMs: Number(process.env.PUBLISH_PROPAGATION_DELAY_MS) || 5000,
    minCount: Math.max(1, Number(process.env.LOCATIONS_MIN_COUNT) || 1),
  };
}

// In-memory run state for the current process (deploy is single-instance, concurrency 1).
// `inFlight` is the run currently executing (at most one at a time). `queued` is the single
// coalesced publish follow-up waiting for it to settle - every publish/delete/unpublish that
// arrives mid-run shares it, so a burst collapses into one extra run instead of being dropped.
let lastRunAt = 0;
let inFlight = null;
let queued = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') return true;
  return Boolean(err.response && RETRYABLE_STATUS_CODES.includes(err.response.status));
}

function assertRequiredEnv() {
  const missing = REQUIRED_ENV.filter((key) => !String(process.env[key] || '').trim());
  if (!missing.length) return;
  throw new Error(`missing required env vars: ${missing.join(', ')}`);
}

// Unique query param per request so the CDN can't answer with a stale cached copy.
function withCacheBuster(url) {
  let separator = '?';
  if (url.includes('?')) separator = /[?&]$/.test(url) ? '' : '&';
  return `${url}${separator}_cb=${Date.now()}`;
}

function describePayload(data) {
  if (Array.isArray(data)) return `array of ${data.length}`;
  if (typeof data === 'string') return `string starting ${JSON.stringify(data.slice(0, 80))}`;
  return data === null ? 'null' : typeof data;
}

function assertValidPayload(data, minCount) {
  if (Array.isArray(data) && data.length >= minCount) return;
  throw new Error(`invalid payload: expected an array of at least ${minCount} item(s), got ${describePayload(data)}`);
}

// Fetches the full locations JSON, from the live domain for publish/delete, preview otherwise.
// Retries on gateway timeouts (502/503/504) since the source endpoint queries ~3500 items and
// can intermittently exceed Varnish/nginx's backend timeout before finishing. No auth header:
// it's a public website URL (preview access comes from the zpw query in the path).
async function fetchLocations(action, config) {
  const domain = action === 'update' ? config.previewDomain : config.liveDomain;
  const baseUrl = `${domain}${config.endpointPath}`;
  const maxRetries = config.fetchMaxRetries;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const { data } = await axios.get(withCacheBuster(baseUrl), {
        timeout: config.fetchTimeoutMs,
        headers: { 'Content-Type': 'application/json' },
      });
      return data;
    } catch (err) {
      if (!isRetryableError(err) || attempt === maxRetries) throw err;
      await sleep(config.fetchRetryDelayMs * attempt);
    }
  }
  throw new Error('fetch failed: no attempts made');
}

// Waits out the propagation delay, fetches the source data, and writes it to the Zesty view.
async function runRebuild(publish, action) {
  assertRequiredEnv();
  const config = getConfig();
  if (config.publishPropagationDelayMs > 0) {
    await sleep(config.publishPropagationDelayMs);
  }
  const locations = await fetchLocations(action, config);
  assertValidPayload(locations, config.minCount);
  await updateLocationsView(locations, { publish });
}

// Starts a run and, once it settles (success or failure), starts the queued publish follow-up
// if one was requested meanwhile. The returned promise never rejects. Only the error message is
// printed: axios errors carry the request config (Authorization header, zpw in the URL).
function startRun(publish, action) {
  lastRunAt = Date.now();
  const run = runRebuild(publish, action)
    .catch((err) => {
      console.error('locationsSync: rebuild failed:', err && err.message);
    })
    .then(() => {
      inFlight = null;
      if (queued) {
        const next = queued;
        queued = null;
        startRun(true, 'publish').then(next.resolve);
      }
    });
  inFlight = run;
  return run;
}

// Entry point called on webhook deliveries. Live-affecting triggers (publish/delete/unpublish,
// i.e. `publish` = true) are never debounced: they run now, or - if a run is in flight - are
// coalesced into one publish follow-up that starts after it settles. Updates are debounced and
// skipped while a run is in flight, since only the draft is affected.
function triggerRebuild(publish = true, action = 'update') {
  if (publish) {
    if (!inFlight) return startRun(true, action);
    if (!queued) {
      let resolve;
      const promise = new Promise((r) => { resolve = r; });
      queued = { promise, resolve, actions: [] };
    }
    queued.actions.push(action);
    return queued.promise;
  }

  if (inFlight) return inFlight;

  const { debounceMs } = getConfig();
  const msSinceLastRun = Date.now() - lastRunAt;
  if (msSinceLastRun < debounceMs) {
    return Promise.resolve({ skipped: true });
  }

  return startRun(false, action);
}

module.exports = { triggerRebuild };
