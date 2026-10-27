// Writes the rebuilt locations JSON straight into Zesty.io view files via the Instances API
// (PUT the view's code): always the dev view as a draft, plus the live view - published with a
// cache purge - only for live-affecting triggers. Replaces the old GitHub Contents API commit.
const axios = require('axios');
const { logToFile } = require('./logger');
const { safeLog } = require('./log-utils');

// Read on every call; the token is trimmed since a secret created with a trailing newline
// makes an invalid Authorization header.
function getConfig() {
  return {
    apiBase: `https://${process.env.INSTANCE_ZUID}.api.zesty.io/v1`,
    token: String(process.env.DEV_TOKEN || '').trim(),
    liveViewZuid: process.env.LOCATIONS_VIEW_ZUID,
    devViewZuid: process.env.LOCATIONS_VIEW_DEV_ZUID,
  };
}

// PUTs the rebuilt JSON into a single view's code, optionally publishing and purging the cache.
// Resolves to the response status.
async function putViewCode(config, viewZuid, code, publish) {
  const response = await axios.put(
    `${config.apiBase}/web/views/${viewZuid}`,
    { code },
    {
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      params: publish ? { action: 'publish', purge_cache: true } : {},
    },
  );
  return response && response.status;
}

// Writes the rebuilt locations JSON to the dev view (LOCATIONS_VIEW_DEV_ZUID, always
// draft-only - the dev domain serves draft content, so it never needs publishing) and,
// only when `publish` is true, to the live view (LOCATIONS_VIEW_ZUID). The live view is
// skipped entirely on non-publishing triggers so it doesn't accumulate unpublished draft
// versions from updates that aren't meant to go live yet. Every write is attempted and logged;
// rejects with the first failure if any failed, otherwise resolves to the view zuids written.
async function updateLocationsView(data, { publish = true } = {}) {
  const config = getConfig();
  const code = JSON.stringify(data, null, 2);
  const viewZuids = [config.devViewZuid];
  const writes = [putViewCode(config, config.devViewZuid, code, false)];
  if (publish) {
    viewZuids.push(config.liveViewZuid);
    writes.push(putViewCode(config, config.liveViewZuid, code, publish));
  }
  const results = await Promise.allSettled(writes);
  results.forEach((result, i) => {
    const ok = result.status === 'fulfilled';
    const { reason } = result;
    safeLog(
      logToFile,
      {
        viewZuid: viewZuids[i],
        ok,
        status: ok ? result.value : reason && reason.response && reason.response.status,
        error: ok ? undefined : reason && reason.message,
      },
      'view write',
      'updateLocationsView',
    );
  });
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
  return viewZuids;
}

module.exports = { updateLocationsView };
