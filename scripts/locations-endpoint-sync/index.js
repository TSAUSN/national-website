// Cloud Functions (2nd gen) HTTP entry point. Deployed with --source=. --entry-point=locationsWebhook
// (see scripts/deploy.js). Reuses the same handler the local Express server in
// src/webhook-server.js uses - functions-framework provides an Express-compatible (req, res)
// and parses the JSON body the same way, so no translation layer is needed.
require('dotenv').config();

const { handleZestyWebhook } = require('./src/webhook-handler');

exports.locationsWebhook = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  await handleZestyWebhook(req, res);
};
