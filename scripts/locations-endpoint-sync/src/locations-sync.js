// Rebuilds the full locations JSON from scratch on every trigger, rather than tracking
// which item changed. This is the logic that eventually moves into the GCP cloud function
// (cloud-functions/location-sync) - kept as a standalone module so it can be lifted as-is.
const axios = require('axios');
const { logToFile, errorLogToFile } = require('./logger');
const { updateLocationsView } = require('./zesty-view-commit');

// Source endpoint config: shared path/query, plus the two domains it gets fetched against.
const LOCATIONS_ENDPOINT_PATH = process.env.LOCATIONS_ENDPOINT_PATH;
const LOCATIONS_LIVE_DOMAIN = process.env.LOCATIONS_LIVE_DOMAIN;
const LOCATIONS_PREVIEW_DOMAIN = process.env.LOCATIONS_PREVIEW_DOMAIN;
const DEBOUNCE_MS = Number(process.env.REBUILD_DEBOUNCE_MS) || 45000;

// The source endpoint queries ~3500 items and can be slow to render, so give it generous
// headroom and retry transient gateway timeouts (502/503/504) from Varnish/nginx before
// giving up - a retry often lands once the backend/cache has warmed up.
const FETCH_TIMEOUT_MS = Number(process.env.LOCATIONS_FETCH_TIMEOUT_MS) || 120000;
const FETCH_MAX_RETRIES = Number(process.env.LOCATIONS_FETCH_MAX_RETRIES) || 3;
const FETCH_RETRY_DELAY_MS = Number(process.env.LOCATIONS_FETCH_RETRY_DELAY_MS) || 15000;
const RETRYABLE_STATUS_CODES = [502, 503, 504];

// Delay before fetching, to avoid racing the CDN cache purge on publish events.
const PUBLISH_PROPAGATION_DELAY_MS = Number(process.env.PUBLISH_PROPAGATION_DELAY_MS) || 5000;

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

// Fetches the full locations JSON, from the live domain for publish/delete, preview otherwise.
// Retries on gateway timeouts (502/503/504) since the source endpoint queries ~3500 items and
// can intermittently exceed Varnish/nginx's backend timeout before finishing.
async function fetchLocations(action) {
  const domain = action === 'update' ? LOCATIONS_PREVIEW_DOMAIN : LOCATIONS_LIVE_DOMAIN;
  const url = `${domain}${LOCATIONS_ENDPOINT_PATH}`;

  for (let attempt = 1; attempt <= FETCH_MAX_RETRIES; attempt += 1) {
    console.log(`[locationsSync] fetching (action=${action}, attempt=${attempt}/${FETCH_MAX_RETRIES}): ${url}`);
    try {
      const { data } = await axios.get(url, {
        timeout: FETCH_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DEV_TOKEN}`,
        },
      });
      return data;
    } catch (err) {
      const retryable = isRetryableError(err);
      if (!retryable || attempt === FETCH_MAX_RETRIES) throw err;
      const delay = FETCH_RETRY_DELAY_MS * attempt;
      logToFile(
        { attempt, maxRetries: FETCH_MAX_RETRIES, delayMs: delay, status: err.response && err.response.status, code: err.code },
        'fetch retry',
        'locationsSync',
      );
      await sleep(delay);
    }
  }
}

// Waits out the propagation delay, fetches the source data, and writes it to the Zesty view.
async function runRebuild(publish, action) {
  if (PUBLISH_PROPAGATION_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, PUBLISH_PROPAGATION_DELAY_MS));
  }
  const locations = await fetchLocations(action);
  const viewZuids = await updateLocationsView(locations, { publish });
  logToFile(
    { viewZuids, count: Array.isArray(locations) ? locations.length : undefined, publish, action },
    'rebuilt',
    'locationsSync',
  );
}

// Starts a run and, once it settles (success or failure), starts the queued publish follow-up
// if one was requested meanwhile. The returned promise never rejects.
function startRun(publish, action) {
  lastRunAt = Date.now();
  const run = runRebuild(publish, action)
    .catch((err) => {
      try {
        errorLogToFile(err, 'rebuild failed', 'locationsSync');
      } catch (logErr) {
        console.error('[locationsSync] rebuild failed (and could not be logged):', err, logErr);
      }
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
    logToFile({ action, coalesced: queued.actions.length }, 'queued behind in-flight run', 'locationsSync');
    return queued.promise;
  }

  if (inFlight) return inFlight;

  const now = Date.now();
  const msSinceLastRun = now - lastRunAt;
  if (msSinceLastRun < DEBOUNCE_MS) {
    logToFile({ msSinceLastRun, debounceMs: DEBOUNCE_MS }, 'debounced', 'locationsSync');
    return Promise.resolve({ skipped: true });
  }

  return startRun(false, action);
}

module.exports = { triggerRebuild };
