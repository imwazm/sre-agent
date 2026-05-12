/**
 * ELK — Connector
 *
 *   ELK_STUB=true  → stub.js  (pre-loaded scenario logs, no network)
 *   ELK_STUB=false → real.js  (live Elasticsearch queries)
 *
 * To go fully live and remove stub support entirely:
 *   1. Delete stub.js
 *   2. Replace this file with: module.exports = require('./real')
 */

module.exports =
  process.env.ELK_STUB === "true"
    ? require("./stub")
    : require("./real");
