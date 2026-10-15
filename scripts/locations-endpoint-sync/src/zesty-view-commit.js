// Writes the rebuilt locations JSON straight into Zesty.io view files via the Instances API
// (PUT the view's code): always the dev view as a draft, plus the live view - published with a
// cache purge - only for live-affecting triggers. Replaces the old GitHub Contents API commit.
const axios = require('axios');

const INSTANCE_ZUID = process.env.INSTANCE_ZUID;
const DEV_TOKEN = process.env.DEV_TOKEN;
const LOCATIONS_VIEW_ZUID = process.env.LOCATIONS_VIEW_ZUID;
const LOCATIONS_VIEW_DEV_ZUID = process.env.LOCATIONS_VIEW_DEV_ZUID;

const API_BASE = `https://${INSTANCE_ZUID}.api.zesty.io/v1`;

function authHeaders() {
  return {
    Authorization: `Bearer ${DEV_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// PUTs the rebuilt JSON into a single view's code, optionally publishing and purging the cache.
async function putViewCode(viewZuid, code, publish) {
  await axios.put(
    `${API_BASE}/web/views/${viewZuid}`,
    { code },
    { headers: authHeaders(), params: publish ? { action: 'publish', purge_cache: true } : {} },
  );
}

// Writes the rebuilt locations JSON to the dev view (LOCATIONS_VIEW_DEV_ZUID, always
// draft-only - the dev domain serves draft content, so it never needs publishing) and,
// only when `publish` is true, to the live view (LOCATIONS_VIEW_ZUID). The live view is
// skipped entirely on non-publishing triggers so it doesn't accumulate unpublished draft
// versions from updates that aren't meant to go live yet. Resolves to the view zuids written.
async function updateLocationsView(data, { publish = true } = {}) {
  const code = JSON.stringify(data, null, 2);
  const viewZuids = [LOCATIONS_VIEW_DEV_ZUID];
  const writes = [putViewCode(LOCATIONS_VIEW_DEV_ZUID, code, false)];
  if (publish) {
    viewZuids.push(LOCATIONS_VIEW_ZUID);
    writes.push(putViewCode(LOCATIONS_VIEW_ZUID, code, publish));
  }
  await Promise.all(writes);
  return viewZuids;
}

module.exports = { updateLocationsView };
