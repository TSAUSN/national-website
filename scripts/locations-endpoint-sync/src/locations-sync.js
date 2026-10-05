// Rebuilds the full locations JSON from scratch on every trigger, rather than tracking
// which item changed. This is the logic that eventually moves into the GCP cloud function
// (cloud-functions/location-sync) - kept as a standalone module so it can be lifted as-is.
const axios = require('axios');
const { logToFile, errorLogToFile } = require('./logger');
const { updateLocationsView } = require('./zesty-view-commit');

// Same code as the old locations endpoint, exposed as a Parsley endpoint (may become the
// REST API later, per Gisele's suggestion) - it returns the full locations output in one shot.
const LOCATIONS_ENDPOINT_URL = process.env.LOCATIONS_ENDPOINT_URL;
const DEBOUNCE_MS = Number(process.env.REBUILD_DEBOUNCE_MS) || 45000;

// The Parsley endpoint sits behind Zesty's CDN (Fastly/Varnish), cached and purged by
// content tag rather than TTL. The purge fires off the same publish event as our webhook,
// so a fetch started the instant the webhook arrives can race the purge and read the
// still-cached pre-publish response (commit lands with no actual diff). This delay gives
// the purge time to land before we fetch.
const PUBLISH_PROPAGATION_DELAY_MS = Number(process.env.PUBLISH_PROPAGATION_DELAY_MS) || 5000;

// In-memory state works because this runs inside a long-lived server process. A stateless
// cloud function would need to persist lastRunAt somewhere durable to debounce across
// invocations - that's part of the deployment work we're holding off on for now.
let lastRunAt = 0;
let inFlight = null;

async function fetchLocations() {
  const { data } = await axios.get(LOCATIONS_ENDPOINT_URL, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEV_TOKEN}`,
    },
  });
  return data;
}

async function runRebuild(publish) {
  if (PUBLISH_PROPAGATION_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, PUBLISH_PROPAGATION_DELAY_MS));
  }
  const locations = await fetchLocations();
  await updateLocationsView(locations, { publish });
  logToFile(
    { viewZuid: process.env.LOCATIONS_VIEW_ZUID, count: Array.isArray(locations) ? locations.length : undefined, publish },
    'rebuilt',
    'locationsSync',
  );
}

// Call this on webhook deliveries. It ignores the payload content - it's only a "something
// changed" trigger - and always regenerates the full file from source so it never needs to
// know which item changed. `publish` controls whether the rebuilt view is also published/cache
// -purged: true for delete/publish events, false for update/save events (draft only). Bursts
// (e.g. a sync publishing hundreds of items) collapse into a single rebuild: skip if the last
// run started within DEBOUNCE_MS.
function triggerRebuild(publish = true) {
  if (inFlight) return inFlight;

  const now = Date.now();
  const msSinceLastRun = now - lastRunAt;
  if (msSinceLastRun < DEBOUNCE_MS) {
    logToFile({ msSinceLastRun, debounceMs: DEBOUNCE_MS }, 'debounced', 'locationsSync');
    return Promise.resolve({ skipped: true });
  }

  lastRunAt = now;
  inFlight = runRebuild(publish)
    .catch((err) => errorLogToFile(err, 'rebuild failed', 'locationsSync'))
    .finally(() => { inFlight = null; });
  return inFlight;
}

module.exports = { triggerRebuild };
