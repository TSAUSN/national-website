require('dotenv').config();
const express = require('express');
const { handleZestyWebhook } = require('./webhook-handler');

const app = express();
app.use(express.json());

app.post('/webhooks/zesty', handleZestyWebhook);

const PORT = process.env.WEBHOOK_PORT || 3000;
app.listen(PORT, () => console.log(`webhook server listening on ${PORT}`));
