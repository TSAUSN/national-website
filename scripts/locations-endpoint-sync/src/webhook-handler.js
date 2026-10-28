const { logToFile, errorLogToFile } = require('./logger');
const { safeLog } = require('./log-utils');
const { triggerRebuild } = require('./locations-sync');

// The webhook is registered on the locations model for all actions (create, save, delete,
// publish, etc.), but Zesty's payload has no structured action field - just a human-readable
// message configured per trigger in the Zesty admin. Delete, publish and unpublish triggers
// change what's live, so they rebuild AND publish the view so it goes live immediately
// ("unpublished" is checked before "published", which it contains). Update/save triggers (e.g.
// "A location has been created!" or "A location has not been published yet" - note that
// text contains the word "published" despite being an update, not a publish; a sentence counts
// as a publish only if "published" isn't preceded by "not" in that sentence) should only
// rebuild the draft, since the data isn't live yet and shouldn't be pushed out.
function classifyAction(body) {
  const text = (body && body.text) || '';
  if (/delet/i.test(text)) return 'delete';
  if (/unpublished/i.test(text)) return 'unpublish';
  const published = text
    .split(/[.!?]/)
    .some((clause) => /\bpublished\b/i.test(clause) && !/\bnot\b.*\bpublished\b/i.test(clause));
  if (published) return 'publish';
  return 'update';
}

async function handleZestyWebhook(req, res) {
  const body = req.body;

  // Ack right away so Zesty doesn't time out / retry while the rebuild runs.
  res.status(202).json({ received: true });

  // Nothing below may stop the rebuild from being triggered, so classification falls back to
  // 'update' and every log call is guarded.
  let action = 'update';
  try {
    action = classifyAction(body);
  } catch (err) {
    safeLog(errorLogToFile, err, 'classify failed', 'handleZestyWebhook');
  }
  safeLog(
    logToFile,
    {
      action,
      contentType: req.headers && req.headers['content-type'],
      hasText: Boolean(body && body.text),
    },
    'received',
    'handleZestyWebhook',
  );

  try {
    await triggerRebuild(action !== 'update', action);
  } catch (err) {
    safeLog(errorLogToFile, err, 'trigger failed', 'handleZestyWebhook');
  }
}

module.exports = { handleZestyWebhook };
