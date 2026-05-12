/**
 * Datadog — Connector
 *
 *   DATADOG_STUB=true  → stub.js  (pre-loaded scenario metrics, no network)
 *   DATADOG_STUB=false → real.js  (live Datadog Metrics API + APM annotations)
 *
 * To go fully live and remove stub support entirely:
 *   1. Delete stub.js
 *   2. Replace this file with: module.exports = require('./real')
 */

module.exports =
  process.env.DATADOG_STUB === "true"
    ? require("./stub")
    : require("./real");
