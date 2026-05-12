/**
 * ELK — Stub Connector
 *
 * Returns pre-loaded scenario logs. No network calls.
 * Used during local development and pipeline testing.
 *
 * To go live: set STUB_MODE=false in .env
 * To remove entirely: delete this file and simplify index.js to:
 *   module.exports = require('./real')
 */

async function fetchLogs(service, scenarioLogs = []) {
  console.log(`[ELK] Stub — returning ${scenarioLogs.length} pre-loaded logs for: ${service}`);
  return scenarioLogs;
}

module.exports = { fetchLogs };
