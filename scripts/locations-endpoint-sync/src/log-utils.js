// Helpers shared by the logger and its callers. Kept separate from logger.js so callers can
// still use them when the logger is swapped out (e.g. stubbed in tests).
const SECRET_PARAM_RE = /([?&](?:zpw|token|access_token|auth|apikey|api_key|key|password)=)[^&#\s"']*/gi;
const BEARER_RE = /(Bearer\s+)[^\s"',]+/gi;

function redact(value) {
  if (typeof value !== 'string') return value;
  return value.replace(SECRET_PARAM_RE, '$1[REDACTED]').replace(BEARER_RE, '$1[REDACTED]');
}

// Runs a logging call, swallowing anything it throws so logging can never interrupt real work.
function safeLog(fn, ...args) {
  try {
    fn(...args);
  } catch (err) {
    try {
      console.error(JSON.stringify({ severity: 'ERROR', label: 'log failed', data: redact(String(err && err.message)) }));
    } catch (_) {
      // nothing left to do
    }
  }
}

module.exports = { redact, safeLog };
