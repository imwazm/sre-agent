/**
 * ServiceNow — Connector
 *
 *   SERVICENOW_STUB=true  → stub.js  (generates fake INC number, no network)
 *   SERVICENOW_STUB=false → real.js  (live ServiceNow REST API)
 *
 * To go fully live and remove stub support entirely:
 *   1. Delete stub.js
 *   2. Replace this file with: module.exports = require('./real')
 */

module.exports =
  process.env.SERVICENOW_STUB === "true"
    ? require("./stub")
    : require("./real");
