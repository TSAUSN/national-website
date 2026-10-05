const fs = require('fs');
const path = require('path');

function getDateStr() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${mm}${dd}${yyyy}`;
}

function logToFile(data, label, fnName) {
  const logDir = path.join(__dirname, '..', 'logs', 'webhook-logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `webhook-${fnName}-${getDateStr()}.log`);
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${label}\n${JSON.stringify(data, null, 2)}\n\n`);
}

function errorLogToFile(error, label, fnName) {
  const logDir = path.join(__dirname, '..', 'logs', 'error-logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, `webhook-${fnName}-error-${getDateStr()}.log`);
  const errorData = error.response ? error.response.data : error.message;
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${label}\n${JSON.stringify(errorData, null, 2)}\n\n`);
}

module.exports = { logToFile, errorLogToFile };
