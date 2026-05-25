require("dotenv").config();
require("./elasticClient");

const express = require("express");
const app = express();

const webhookRouter = require("./routes/webhook");

app.use(express.json());

const connectorModes = {
  elk:        process.env.ELK_STUB     === "true" ? "stub" : "live",
  datadog:    process.env.DATADOG_STUB === "true" ? "stub" : "live",
  servicenow: "live", // stub removed — always uses dev instance
};

app.get("/health", (req, res) => {
  res.json({
    status:     "ok",
    service:    "sre-agent",
    connectors: connectorModes,
    timestamp:  new Date().toISOString(),
  });
});

app.use("/webhook", webhookRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nSRE Agent running on http://localhost:${PORT}`);
  console.log(`ELK        : ${connectorModes.elk}`);
  console.log(`Datadog    : ${connectorModes.datadog}`);
  console.log(`ServiceNow : ${connectorModes.servicenow}`);
  console.log(`POST http://localhost:${PORT}/webhook/alert\n`);
});
