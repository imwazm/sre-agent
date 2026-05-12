/**
 * ServiceNow — Stub Connector
 *
 * Simulates incident creation locally. Generates a fake INC number.
 * No network calls. Used during local development and pipeline testing.
 *
 * To go live: set STUB_MODE=false in .env
 * To remove entirely: delete this file and simplify index.js to:
 *   module.exports = require('./real')
 */

async function createIncident(triage, alert) {
  const number = `INC${Math.floor(Math.random() * 9000000 + 1000000)}`;

  console.log(`[ServiceNow] Stub — incident generated: ${number}`);
  console.log(`[ServiceNow] short_description : ${triage.short_description}`);
  console.log(`[ServiceNow] priority           : ${triage.priority} | urgency: ${triage.urgency} | impact: ${triage.impact}`);
  console.log(`[ServiceNow] category           : ${triage.category} → ${resolveAssignmentGroup(triage.category)}`);

  return {
    number,
    sys_id: `stub-${Date.now()}`,
    state: "1",
    priority: String(triage.priority),
    short_description: triage.short_description,
  };
}

function resolveAssignmentGroup(category) {
  const mapping = {
    Application:    "Application Support",
    Database:       "Database Administration",
    Infrastructure: "Infrastructure Team",
    Network:        "Network Operations",
  };
  return mapping[category] || "SRE On-Call";
}

module.exports = { createIncident };
