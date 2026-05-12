const express = require("express");
const router = express.Router();

const { fetchLogs }          = require("../services/elk");
const { fetchMetrics, postEvent } = require("../services/datadog");
const { analyzeIncident }    = require("../services/claudeService");
const { createIncident }     = require("../services/servicenow");

// Each connector has its own stub flag — can be switched independently
const elkIsStub      = process.env.ELK_STUB      === "true";
const datadogIsStub  = process.env.DATADOG_STUB  === "true";
const snowIsStub     = process.env.SERVICENOW_STUB === "true";

// Scenario data is only needed if at least one connector is in stub mode
const needsScenario  = elkIsStub || datadogIsStub;
const { getScenario, getRandomScenario } = needsScenario
  ? require("../data/scenarios")
  : { getScenario: null, getRandomScenario: null };

/**
 * POST /webhook/alert
 *
 * Each connector is independently controlled via .env:
 *
 *   ELK_STUB=true/false
 *   DATADOG_STUB=true/false
 *   SERVICENOW_STUB=true/false
 *
 * Mix and match — e.g. keep ELK + Datadog on stub while ServiceNow is live.
 * Send { "scenario_id": "high-error-rate" } to use stub scenario data.
 * In full live mode, send a real alert payload { service, title, severity }.
 */
router.post("/alert", async (req, res) => {
  const startTime = Date.now();

  try {
    const body = req.body || {};

    // Load scenario if any stub connector needs it
    // If all connectors are live, scenarios.js is never touched
    let alert, stubLogs, stubMetrics;

    if (needsScenario) {
      const scenarioId = body.scenario_id || null;
      const scenario   = scenarioId ? getScenario(scenarioId) : getRandomScenario();
      alert       = scenario.alert;
      stubLogs    = elkIsStub     ? scenario.elkLogs       : [];
      stubMetrics = datadogIsStub ? scenario.datadogMetrics : {};
    } else {
      // Full live mode — alert comes directly from the webhook body
      alert       = body;
      stubLogs    = [];
      stubMetrics = {};
    }

    if (!alert || !alert.service) {
      return res.status(400).json({
        error: needsScenario
          ? 'Missing scenario_id. Example: { "scenario_id": "high-error-rate" }'
          : "Missing alert payload. Required fields: service, title, severity.",
      });
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[Pipeline] ELK: ${elkIsStub ? "stub" : "live"} | Datadog: ${datadogIsStub ? "stub" : "live"} | ServiceNow: ${snowIsStub ? "stub" : "live"}`);
    console.log(`[Pipeline] Alert   : ${alert.title || alert.short_description}`);
    console.log(`[Pipeline] Service : ${alert.service} | Severity: ${alert.severity}`);

    // Step 1 — Fetch logs from ELK
    console.log("\n[Step 1] ELK — fetching logs...");
    const logs = await fetchLogs(alert.service, stubLogs);
    console.log(`[Step 1] ${logs.length} log entries retrieved`);

    // Step 2 — Fetch metrics from Datadog
    console.log("\n[Step 2] Datadog — fetching metrics...");
    const metrics    = await fetchMetrics(alert.service, stubMetrics);
    const metricKeys = Object.keys(metrics);
    console.log(`[Step 2] Metrics retrieved: ${metricKeys.join(", ")}`);

    // Step 3 — Claude root cause analysis
    console.log("\n[Step 3] Claude — analysing signals...");
    const triage = await analyzeIncident(alert, logs, metrics);
    console.log(`[Step 3] Confidence  : ${triage.confidence}`);
    console.log(`[Step 3] Root cause  : ${triage.root_cause}`);

    // Step 4 — Create ServiceNow incident
    console.log("\n[Step 4] ServiceNow — creating incident...");
    const incident = await createIncident(triage, alert);
    console.log(`[Step 4] Incident    : ${incident.number}`);

    // Step 5 — Write annotation back to Datadog APM timeline
    console.log("\n[Step 5] Datadog — posting APM annotation...");
    await postEvent(
      `SRE Agent — ${incident.number} Created`,
      `Root cause: ${triage.root_cause}\nPriority: ${triage.priority}`,
      [`service:${alert.service}`, `incident:${incident.number}`]
    );

    const elapsed = Date.now() - startTime;
    console.log(`\n[Pipeline] Complete in ${elapsed}ms`);
    console.log("=".repeat(60));

    return res.status(200).json({
      status:      "success",
      elapsed_ms:  elapsed,
      alert: {
        title:    alert.title,
        service:  alert.service,
        severity: alert.severity,
      },
      triage: {
        short_description:   triage.short_description,
        root_cause:          triage.root_cause,
        urgency:             triage.urgency,
        impact:              triage.impact,
        priority:            triage.priority,
        confidence:          triage.confidence,
        remediation_steps:   triage.remediation_steps,
        contributing_factors: triage.contributing_factors,
      },
      incident: {
        number:   incident.number,
        sys_id:   incident.sys_id,
        priority: incident.priority,
      },
    });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`[Pipeline] Failed after ${elapsed}ms: ${err.message}`);

    return res.status(500).json({
      status:     "error",
      elapsed_ms: elapsed,
      error:      err.message,
    });
  }
});

module.exports = router;
