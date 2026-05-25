/**
 * seed.js — Elastic Cloud Log Seeder
 *
 * Pushes realistic incident logs into your Elastic Cloud cluster
 * so the live ELK connector has real data to query.
 *
 * Run once before your demo:
 *   node seed.js
 */

require("dotenv").config();

const { Client } = require("@elastic/elasticsearch");

const client = new Client({
  cloud: { id: process.env.ELASTIC_CLOUD_ID.trim() },
  auth: { username: "elastic", password: process.env.ELASTIC_PASSWORD.trim() },
});

const now = Date.now();
const mins = (m) => new Date(now - m * 60000).toISOString();

// ECS data stream fields required by logsdb index mode
const ds = {
  "data_stream.type":      "logs",
  "data_stream.dataset":   "sre-agent",
  "data_stream.namespace": "default",
};

const logs = [

  // ── Scenario 1: high-error-rate (payment-service) ─────────────────────────
  {
    ...ds,
    "@timestamp":  mins(12),
    level:         "ERROR",
    service:       "payment-service",
    message:       "NullPointerException in PaymentProcessor.charge()",
    trace_id:      "abc123",
    host:          { name: "payment-pod-7d9f8b-xk2p1" },
    stack_trace:   "java.lang.NullPointerException at com.app.PaymentProcessor.charge(PaymentProcessor.java:142)",
  },
  {
    ...ds,
    "@timestamp":  mins(10),
    level:         "ERROR",
    service:       "payment-service",
    message:       "Database connection timeout after 30s",
    trace_id:      "abc124",
    host:          { name: "payment-pod-7d9f8b-xk2p1" },
  },
  {
    ...ds,
    "@timestamp":  mins(8),
    level:         "ERROR",
    service:       "payment-service",
    message:       "Circuit breaker OPEN — downstream stripe-gateway unreachable",
    trace_id:      "abc125",
    host:          { name: "payment-pod-7d9f8b-xk2p1" },
  },
  {
    ...ds,
    "@timestamp":  mins(6),
    level:         "ERROR",
    service:       "payment-service",
    message:       "Request queue full — rejecting incoming payment requests",
    trace_id:      "abc126",
    host:          { name: "payment-pod-7d9f8b-xk2p1" },
  },
  {
    ...ds,
    "@timestamp":  mins(4),
    level:         "ERROR",
    service:       "payment-service",
    message:       "Pod health check failed — liveness probe timeout",
    trace_id:      "abc127",
    host:          { name: "payment-pod-7d9f8b-xk2p2" },
  },

  // ── Scenario 2: memory-leak (order-service) ───────────────────────────────
  {
    ...ds,
    "@timestamp":  mins(11),
    level:         "WARN",
    service:       "order-service",
    message:       "Heap memory usage at 85% — approaching limit",
    host:          { name: "order-pod-5c6d7e-abc99" },
  },
  {
    ...ds,
    "@timestamp":  mins(9),
    level:         "ERROR",
    service:       "order-service",
    message:       "OutOfMemoryError: Java heap space",
    host:          { name: "order-pod-5c6d7e-abc99" },
    stack_trace:   "java.lang.OutOfMemoryError: Java heap space at java.util.Arrays.copyOf",
  },
  {
    ...ds,
    "@timestamp":  mins(7),
    level:         "ERROR",
    service:       "order-service",
    message:       "GC overhead limit exceeded — JVM spending >98% time in garbage collection",
    host:          { name: "order-pod-5c6d7e-abc99" },
  },
  {
    ...ds,
    "@timestamp":  mins(5),
    level:         "ERROR",
    service:       "order-service",
    message:       "Order processing halted — unable to allocate memory for new requests",
    host:          { name: "order-pod-5c6d7e-abc99" },
  },

  // ── Scenario 3: db-slowdown (user-service) ────────────────────────────────
  {
    ...ds,
    "@timestamp":  mins(13),
    level:         "WARN",
    service:       "user-service",
    message:       "Slow query detected: SELECT * FROM users WHERE email=? took 2340ms",
    host:          { name: "user-pod-3a4b5c-def88" },
  },
  {
    ...ds,
    "@timestamp":  mins(10),
    level:         "ERROR",
    service:       "user-service",
    message:       "Query timeout after 5000ms — missing index on users.email column suspected",
    host:          { name: "user-pod-3a4b5c-def88" },
  },
  {
    ...ds,
    "@timestamp":  mins(8),
    level:         "ERROR",
    service:       "user-service",
    message:       "DB connection pool exhausted — all 100 connections in use",
    host:          { name: "user-pod-3a4b5c-def88" },
  },
  {
    ...ds,
    "@timestamp":  mins(6),
    level:         "ERROR",
    service:       "user-service",
    message:       "User authentication failing — login requests timing out",
    host:          { name: "user-pod-3a4b5c-def88" },
  },
];

// ── Index name follows ECS pattern: logs-{dataset}-{namespace} ────────────
const INDEX_NAME = "logs-sre-agent-default";

async function seed() {
  console.log("\n🌱 SRE Agent — Elastic Cloud Log Seeder");
  console.log("─".repeat(50));

  // Verify connection
  try {
    const info = await client.info();
    console.log(`✅ Connected to cluster: ${info.cluster_name}`);
  } catch (err) {
    console.error(`❌ Cannot connect to Elastic Cloud: ${err.message}`);
    process.exit(1);
  }

  // Delete old stream if it exists (clean slate)
  try {
    await client.indices.deleteDataStream({ name: INDEX_NAME });
    console.log(`🗑️  Deleted old data stream: ${INDEX_NAME}`);
  } catch (_) {
    // Not found — that's fine
  }

  // Also clean up old misnamed stream from previous runs
  try {
    await client.indices.deleteDataStream({ name: "logs-sre-agent" });
    console.log(`🗑️  Deleted legacy data stream: logs-sre-agent`);
  } catch (_) {
    // Not found — that's fine
  }

  // Create fresh data stream
  try {
    await client.indices.createDataStream({ name: INDEX_NAME });
    console.log(`✅ Data stream created: ${INDEX_NAME}`);
  } catch (err) {
    if (err.message?.includes("already exists")) {
      console.log(`✅ Data stream already exists: ${INDEX_NAME}`);
    } else {
      console.error(`❌ Failed to create data stream: ${err.message}`);
      throw err;
    }
  }

  // Bulk insert — data streams require op_type: create
  const operations = logs.flatMap((doc) => [
    { create: { _index: INDEX_NAME } },
    doc,
  ]);

  const result = await client.bulk({ operations, refresh: true });

  if (result.errors) {
    const errors = result.items.filter((i) => i.create?.error);
    console.error(`❌ ${errors.length} documents failed to index`);
    errors.forEach((e) => console.error(JSON.stringify(e.create.error, null, 2)));
  } else {
    // Check for failure_store routing
    const failureStoreItems = result.items.filter(
      (i) => i.create?.failure_store === "used"
    );
    if (failureStoreItems.length > 0) {
      console.error(
        `⚠️  ${failureStoreItems.length} docs routed to failure_store — check field mappings`
      );
      console.error(JSON.stringify(failureStoreItems[0], null, 2));
    } else {
      console.log(`✅ ${logs.length} log entries seeded successfully`);
    }
  }

  // Verify the docs actually landed
  const count = await client.count({ index: INDEX_NAME });
  console.log(`\n📊 Verification: ${count.count} documents in ${INDEX_NAME}`);

  console.log("\n📋 Services seeded:");
  console.log("   payment-service → 5 logs (high-error-rate scenario)");
  console.log("   order-service   → 4 logs (memory-leak scenario)");
  console.log("   user-service    → 4 logs (db-slowdown scenario)");
  console.log("\n🚀 Ready. Run npm start and fire your scenarios.\n");
}

seed().catch((err) => {
  console.error(`❌ Seeder failed: ${err.message}`);
  process.exit(1);
});
