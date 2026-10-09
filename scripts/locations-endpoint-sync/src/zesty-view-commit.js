// Writes the rebuilt locations JSON straight into a Zesty.io view file via the Instances API
// (PUT the view's code, publishing it immediately), replacing the old GitHub Contents API commit.
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

// Writes the rebuilt locations JSON to both the live view (LOCATIONS_VIEW_ZUID, publishing
// unless `publish: false`) and the dev view (LOCATIONS_VIEW_DEV_ZUID, always draft-only -
// the dev domain serves draft content, so it never needs publishing).
async function updateLocationsView(data, { publish = true } = {}) {
  const code = JSON.stringify(data, null, 2);
  await Promise.all([
    putViewCode(LOCATIONS_VIEW_ZUID, code, publish),
    putViewCode(LOCATIONS_VIEW_DEV_ZUID, code, false),
  ]);
}

module.exports = { updateLocationsView };
