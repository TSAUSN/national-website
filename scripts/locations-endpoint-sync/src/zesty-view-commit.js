// Writes the rebuilt locations JSON straight into a Zesty.io view file via the Instances API
// (PUT the view's code, publishing it immediately), replacing the old GitHub Contents API commit.
const axios = require('axios');

const INSTANCE_ZUID = process.env.INSTANCE_ZUID;
const DEV_TOKEN = process.env.DEV_TOKEN;
const LOCATIONS_VIEW_ZUID = process.env.LOCATIONS_VIEW_ZUID;

const API_BASE = `https://${INSTANCE_ZUID}.api.zesty.io/v1`;

function authHeaders() {
  return {
    Authorization: `Bearer ${DEV_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// Overwrites LOCATIONS_VIEW_ZUID's code with the rebuilt locations JSON. Publishes and
// purges the cache in the same call unless `publish: false` (used for update/save events,
// which should update the draft without making it live).
async function updateLocationsView(data, { publish = true } = {}) {
  await axios.put(
    `${API_BASE}/web/views/${LOCATIONS_VIEW_ZUID}`,
    { code: JSON.stringify(data, null, 2) },
    { headers: authHeaders(), params: publish ? { action: 'publish', purge_cache: true } : {} },
  );
}

module.exports = { updateLocationsView };
