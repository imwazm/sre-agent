/**
 * Datadog — Stub Connector
 *
 * Returns pre-loaded scenario metrics. postEvent() is a no-op.
 * No network calls. Used during local development and pipeline testing.
 *
 * To go live: set STUB_MODE=false in .env
 * To remove entirely: delete this file and simplify index.js to:
 *   module.exports = require('./real')
 */

async function fetchMetrics(service, scenarioMetrics = {}) {
  const keys = Object.keys(scenarioMetrics);
  console.log(`[Datadog] Stub — returning pre-loaded metrics for: ${service} — [${keys.join(", ")}]`);
  return scenarioMetrics;
}

async function postEvent(title, text, tags = []) {
  console.log(`[Datadog] Stub — event skipped: "${title}"`);
  return { status: "stub" };
}

module.exports = { fetchMetrics, postEvent };
