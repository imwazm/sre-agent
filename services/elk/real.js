
/**
 * ELK — Live Connector
 *
 * Queries your remote Elastic Cloud cluster for recent ERROR logs using a time-windowed query.
 */

// Import the cloud client we initialized at the root level
const elasticClient = require("../../elasticClient");

// Must match the ECS data stream name used in seed.js
const INDEX_NAME = "logs-sre-agent-default";

async function fetchLogs(service, _scenarioLogs = []) {
  console.log(`[ELK] Querying Elastic Cloud for service: ${service}`);

  try {
    // Execute a secure search query against your cloud cluster instance
    const response = await elasticClient.search({
      index: INDEX_NAME,
      size: 50,        // Max logs to return to Claude
      query: {
        bool: {
          must: [
            { match: { service: service } },
            {
              range: {
                "@timestamp": {
                  gte: "now-30m",
                  lte: "now"
                }
              }
            }
          ],
          should: [
            { match: { level: "ERROR" } },
            { match: { level: "WARN"  } },
          ],
          minimum_should_match: 0   // include all, but boost errors/warns
        }
      },
      sort: [{ "@timestamp": { order: "desc" } }]
    });

    // Extract the raw document source data from the cloud hits array
    const logs = response.hits.hits.map(hit => hit._source);
    console.log(`[ELK] Found ${logs.length} log(s) for ${service}`);
    return logs;

  } catch (error) {
    // Catch cloud errors (like authentication issues or missing indexes) safely
    console.error(`❌ [ELK Cloud Error]: ${error.message}`);
    throw new Error(`[ELK Cloud Error] Failed to query cluster: ${error.message}`);
  }
}

module.exports = { fetchLogs };
