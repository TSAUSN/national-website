// Logs one JSON line per call to stdout/stderr, which Cloud Logging parses (`severity` sets the
// log level). File logging is opt-in (LOG_TO_FILE=true, under LOG_DIR or the OS temp dir) since
// the deployed source directory is read-only. Nothing here ever throws.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { redact } = require('./log-utils');

const MAX_RESPONSE_DATA_CHARS = 500;

function getDateStr() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

function serialize(entry) {
  try {
    return redact(JSON.stringify(entry));
  } catch (_) {
    return redact(JSON.stringify({ ...entry, data: String(entry.data) }));
  }
}

function writeFile(subdir, fileName, label, data) {
  if (process.env.LOG_TO_FILE !== 'true') return;
  try {
    const logDir = path.join(process.env.LOG_DIR || os.tmpdir(), subdir);
    fs.mkdirSync(logDir, { recursive: true });
    const body = redact(JSON.stringify(data, null, 2));
    fs.appendFileSync(path.join(logDir, fileName), `[${new Date().toISOString()}] ${label}\n${body}\n\n`);
  } catch (_) {
    // file logging is best-effort
  }
}

function emit(severity, label, fnName, data) {
  try {
    const line = serialize({ severity, label, fn: fnName, data });
    if (severity === 'ERROR') console.error(line);
    else console.log(line);
  } catch (_) {
    // stdout logging is best-effort
  }
}

function describeError(error) {
  if (!error || typeof error !== 'object') return { message: String(error) };
  const info = { message: error.message };
  if (error.code) info.code = error.code;
  if (error.response) {
    info.status = error.response.status;
    const { data } = error.response;
    if (data !== undefined) {
      let text;
      try {
        text = typeof data === 'string' ? data : JSON.stringify(data);
      } catch (_) {
        text = String(data);
      }
      info.responseData = text && text.slice(0, MAX_RESPONSE_DATA_CHARS);
    }
  }
  if (error.config && error.config.url) info.url = error.config.url;
  return info;
}

function logToFile(data, label, fnName) {
  try {
    emit('INFO', label, fnName, data);
    writeFile('webhook-logs', `webhook-${fnName}-${getDateStr()}.log`, label, data);
  } catch (_) {
    // logging must never throw
  }
}

function errorLogToFile(error, label, fnName) {
  try {
    const data = describeError(error);
    emit('ERROR', label, fnName, data);
    writeFile('error-logs', `webhook-${fnName}-error-${getDateStr()}.log`, label, data);
  } catch (_) {
    // logging must never throw
  }
}

module.exports = { logToFile, errorLogToFile };
