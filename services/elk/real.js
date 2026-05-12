/**
 * ELK — Live Connector
 *
 * Queries Elasticsearch for recent ERROR logs using a time-windowed DSL query.
 *
 * Required in .env:
 *   ELASTICSEARCH_URL=http://your-elasticsearch-host:9200
 */

const axios = require("axios");

async function fetchLogs(service, _scenarioLogs = []) {
  const url = process.env.ELASTICSEARCH_URL;

  if (!url) {
    throw new Error("[ELK] ELASTICSEARCH_URL is not set in .env");
  }

  const query = {
    query: {
      bool: {
        must: [
          { match: { service } },
          { match: { level: "ERROR" } },
          {
            range: {
              "@timestamp": {
                gte: "now-15m",
                lte: "now",
              },
            },
          },
        ],
      },
    },
    sort: [{ "@timestamp": { order: "desc" } }],
    size: 50,
  };

  console.log(`[ELK] Querying Elasticsearch for service: ${service}`);

  const response = await axios.post(
    `${url}/logs-*/_search`,
    query,
    { timeout: 5000, headers: { "Content-Type": "application/json" } }
  );

  const hits = response.data.hits?.hits || [];
  console.log(`[ELK] Retrieved ${hits.length} log entries`);
  return hits.map((hit) => hit._source);
}

module.exports = { fetchLogs };
