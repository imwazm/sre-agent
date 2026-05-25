
/**
 * ELK — Live Connector
 *
 * Queries your remote Elastic Cloud cluster for recent ERROR logs using a time-windowed query.
 */

// Import the cloud client we initialized at the root level
const elasticClient = require("../../elasticClient");

async function fetchLogs(service, _scenarioLogs = []) {
  console.log(`[ELK] Querying Elastic Cloud for service: ${service}`);

  try {
    // Execute a secure search query against your cloud cluster instance
    const response = await elasticClient.search({
      index: "logs-*", // Matches your log data indexes on Elastic Cloud
      size: 50,        // Max logs to return to Claude
      query: {
        bool: {
          must: [
            { match: { service: service } },
            { match: { level: "ERROR" } },
            {
              range: {
                "@timestamp": {
                  gte: "now-15m",
                  lte: "now"
                }
              }
            }
          ]
        }
      },
      sort: [{ "@timestamp": { order: "desc" } }]
    });

    // Extract the raw document source data from the cloud hits array
    const logs = response.hits.hits.map(hit => hit._source);
    return logs;

  } catch (error) {
    // Catch cloud errors (like authentication issues or missing indexes) safely
    console.error(`❌ [ELK Cloud Error]: ${error.message}`);
    throw new Error(`[ELK Cloud Error] Failed to query cluster: ${error.message}`);
  }
}

module.exports = { fetchLogs };