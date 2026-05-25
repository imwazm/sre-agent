/**
 * ServiceNow — Live Connector
 *
 * Creates a fully populated incident via the ServiceNow REST API.
 * Maps Claude's triage output directly to incident table fields.
 *
 * Required in .env:
 *   SERVICENOW_INSTANCE, SERVICENOW_USERNAME, SERVICENOW_PASSWORD
 */

const axios = require("axios");
const https  = require("https");

// On Cognizant laptops, Zscaler intercepts SSL traffic.
// This agent tells axios to accept the corporate SSL certificate.
// Safe for internal POC/dev use — revisit for production.
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function createIncident(triage, alert) {
  const instance = process.env.SERVICENOW_INSTANCE;

  if (!instance) {
    throw new Error("[ServiceNow] SERVICENOW_INSTANCE is not set in .env");
  }

  const payload = {
    short_description: triage.short_description,
    description:       buildDescription(triage, alert),
    urgency:           String(triage.urgency),
    impact:            String(triage.impact),
    priority:          String(triage.priority),
    category:          triage.category || "Application",
    subcategory:       triage.subcategory || "",
    caller_id:         "sre-agent",
    assignment_group:  resolveAssignmentGroup(triage.category),
    work_notes:        buildWorkNotes(triage),
  };

  console.log(`[ServiceNow] Creating incident — priority: ${payload.priority} | category: ${payload.category}`);

  const response = await axios.post(
    `https://${instance}/api/now/table/incident`,
    payload,
    {
      auth: {
        username: process.env.SERVICENOW_USERNAME,
        password: process.env.SERVICENOW_PASSWORD,
      },
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      timeout: 10000,
      httpsAgent,
    }
  );

  console.log(`[ServiceNow] Raw response status : ${response.status}`);
  console.log(`[ServiceNow] Raw response data   :`, JSON.stringify(response.data).slice(0, 300));

  const result = response.data.result;

  if (!result) {
    throw new Error(`ServiceNow returned no result. Response: ${JSON.stringify(response.data).slice(0, 200)}`);
  }

  console.log(`[ServiceNow] Incident created: ${result.number}`);

  return {
    number:            result.number,
    sys_id:            result.sys_id,
    state:             result.state,
    priority:          result.priority,
    short_description: result.short_description,
  };
}

function buildDescription(triage, alert) {
  return [
    `Service   : ${alert.service || "unknown"}`,
    `Threshold : ${alert.threshold || "N/A"}`,
    `Triggered : ${alert.triggered_at || new Date().toISOString()}`,
    "",
    "ROOT CAUSE",
    "----------",
    triage.root_cause,
    "",
    "CONTRIBUTING FACTORS",
    "--------------------",
    ...(triage.contributing_factors || []).map((f) => `- ${f}`),
    "",
    `AI Confidence : ${triage.confidence}`,
    "Triage by     : SRE Agent (Claude Sonnet)",
  ].join("\n");
}

function buildWorkNotes(triage) {
  const steps = (triage.remediation_steps || [])
    .map((s, i) => `${i + 1}. ${s}`)
    .join("\n");
  return `REMEDIATION STEPS\n-----------------\n${steps}`;
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
