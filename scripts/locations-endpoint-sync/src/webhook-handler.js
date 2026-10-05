const { logToFile } = require('./logger');
const { triggerRebuild } = require('./locations-sync');

// The webhook is registered on the locations model for all actions (create, save, delete,
// publish, etc.), but Zesty's payload has no structured action field - just a human-readable
// message configured per trigger in the Zesty admin. Delete and publish triggers should
// rebuild AND publish the view so it goes live immediately. Update/save triggers (e.g.
// "A location has been created!" or "A location has not been published yet" - note that
// text contains the word "published" despite being an update, not a publish) should only
// rebuild the draft, since the data isn't live yet and shouldn't be pushed out.
function classifyAction(body) {
  const text = (body && body.text) || '';
  if (/delet/i.test(text)) return 'delete';
  if (/published/i.test(text) && !/not[^.!]*published/i.test(text)) return 'publish';
  return 'update';
}

async function handleZestyWebhook(req, res) {
  const body = req.body;

  // Ack right away so Zesty doesn't time out / retry while the rebuild runs.
  res.status(202).json({ received: true });

  const action = classifyAction(body);
  logToFile({ raw: body, action }, 'received', 'handleZestyWebhook');

  await triggerRebuild(action !== 'update');
}

module.exports = { handleZestyWebhook };
