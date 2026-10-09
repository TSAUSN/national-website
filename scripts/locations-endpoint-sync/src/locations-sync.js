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

// Delay before fetching, to avoid racing the CDN cache purge on publish events.
const PUBLISH_PROPAGATION_DELAY_MS = Number(process.env.PUBLISH_PROPAGATION_DELAY_MS) || 5000;

// In-memory debounce state for the current process.
let lastRunAt = 0;
let inFlight = null;

// Fetches the full locations JSON, from the live domain for publish/delete, preview otherwise.
async function fetchLocations(action) {
  const domain = action === 'update' ? LOCATIONS_PREVIEW_DOMAIN : LOCATIONS_LIVE_DOMAIN;
  const url = `${domain}${LOCATIONS_ENDPOINT_PATH}`;
  console.log(`[locationsSync] fetching (action=${action}): ${url}`);
  const { data } = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEV_TOKEN}`,
    },
  });
  return data;
}

// Waits out the propagation delay, fetches the source data, and writes it to the Zesty view.
async function runRebuild(publish, action) {
  if (PUBLISH_PROPAGATION_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, PUBLISH_PROPAGATION_DELAY_MS));
  }
  const locations = await fetchLocations(action);
  await updateLocationsView(locations, { publish });
  logToFile(
    { viewZuid: process.env.LOCATIONS_VIEW_ZUID, count: Array.isArray(locations) ? locations.length : undefined, publish, action },
    'rebuilt',
    'locationsSync',
  );
}

// Entry point called on webhook deliveries. Debounces bursts, then kicks off runRebuild.
function triggerRebuild(publish = true, action = 'update') {
  if (inFlight) return inFlight;

  const now = Date.now();
  const msSinceLastRun = now - lastRunAt;
  if (msSinceLastRun < DEBOUNCE_MS) {
    logToFile({ msSinceLastRun, debounceMs: DEBOUNCE_MS }, 'debounced', 'locationsSync');
    return Promise.resolve({ skipped: true });
  }

  lastRunAt = now;
  inFlight = runRebuild(publish, action)
    .catch((err) => errorLogToFile(err, 'rebuild failed', 'locationsSync'))
    .finally(() => { inFlight = null; });
  return inFlight;
}

module.exports = { triggerRebuild };
