/**
 * Datadog — Live Connector
 *
 * Fetches time-series metrics from the Datadog Metrics Query API.
 * Posts incident annotations back to the Datadog APM timeline.
 *
 * Required in .env:
 *   DATADOG_API_KEY, DATADOG_APP_KEY, DATADOG_SITE
 */

const axios = require("axios");

function getHeaders() {
  return {
    "DD-API-KEY": process.env.DATADOG_API_KEY,
    "DD-APPLICATION-KEY": process.env.DATADOG_APP_KEY,
    "Content-Type": "application/json",
  };
}

function getBaseUrl() {
  return `https://api.${process.env.DATADOG_SITE || "datadoghq.com"}`;
}

async function fetchMetrics(service, _scenarioMetrics = {}) {
  if (!process.env.DATADOG_API_KEY || !process.env.DATADOG_APP_KEY) {
    throw new Error("[Datadog] DATADOG_API_KEY or DATADOG_APP_KEY is not set in .env");
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - 900; // last 15 minutes

  const metricQueries = [
    { key: "error_rate",            query: `avg:trace.web.request.errors{service:${service}}` },
    { key: "p99_latency_ms",        query: `avg:trace.web.request.duration{service:${service}}` },
    { key: "pod_restarts",          query: `sum:kubernetes.containers.restarts{kube_service:${service}}` },
    { key: "active_db_connections", query: `avg:postgresql.connections{service:${service}}` },
  ];

  const results = {};

  for (const { key, query } of metricQueries) {
    try {
      const response = await axios.get(`${getBaseUrl()}/api/v1/query`, {
        params: { from, to: now, query },
        headers: getHeaders(),
        timeout: 5000,
      });

      const series = response.data.series || [];
      if (series.length > 0) {
        results[key] = series[0].pointlist.map(([ts, val]) => ({
          timestamp: ts,
          value: val,
        }));
      }
    } catch (err) {
      console.warn(`[Datadog] Could not fetch "${key}": ${err.message}`);
    }
  }

  console.log(`[Datadog] Retrieved metrics: [${Object.keys(results).join(", ")}]`);
  return results;
}

async function postEvent(title, text, tags = []) {
  if (!process.env.DATADOG_API_KEY) {
    console.warn("[Datadog] Skipping event — DATADOG_API_KEY not set");
    return null;
  }

  try {
    console.log(`[Datadog] Posting APM annotation: "${title}"`);
    const response = await axios.post(
      `${getBaseUrl()}/api/v1/events`,
      { title, text, tags, alert_type: "error", source_type_name: "sre-agent" },
      { headers: getHeaders(), timeout: 5000 }
    );
    return response.data;
  } catch (err) {
    console.error(`[Datadog] Failed to post event: ${err.message}`);
    return null;
  }
}

module.exports = { fetchMetrics, postEvent };
