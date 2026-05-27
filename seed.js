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
const mins  = (m) => new Date(now - m * 60_000).toISOString();
const days  = (d, extraMins = 0) => new Date(now - d * 86_400_000 - extraMins * 60_000).toISOString();

// ECS data stream fields required by logsdb index mode
const ds = {
  "data_stream.type":      "logs",
  "data_stream.dataset":   "sre-agent",
  "data_stream.namespace": "default",
};

// ── helpers ───────────────────────────────────────────────────────────────────
const log = (overrides) => ({ ...ds, ...overrides });

// ── 30-day log history ────────────────────────────────────────────────────────
// Each "incident cluster" is a realistic burst of related errors on a given day.
// The most recent cluster (today, last 15 min) is what the live demo queries.

const logs = [

  // ══════════════════════════════════════════════════════════════════════════
  // TODAY — last 15 min  (live demo window)
  // ══════════════════════════════════════════════════════════════════════════

  // payment-service · high-error-rate
  log({ "@timestamp": mins(12), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "NullPointerException in PaymentProcessor.charge()", trace_id: "abc123", stack_trace: "java.lang.NullPointerException at com.app.PaymentProcessor.charge(PaymentProcessor.java:142)" }),
  log({ "@timestamp": mins(10), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "Database connection timeout after 30s", trace_id: "abc124" }),
  log({ "@timestamp": mins(8),  level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "Circuit breaker OPEN — downstream stripe-gateway unreachable", trace_id: "abc125" }),
  log({ "@timestamp": mins(6),  level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "Request queue full — rejecting incoming payment requests", trace_id: "abc126" }),
  log({ "@timestamp": mins(4),  level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p2" }, message: "Pod health check failed — liveness probe timeout", trace_id: "abc127" }),

  // order-service · memory-leak
  log({ "@timestamp": mins(11), level: "WARN",  service: "order-service", host: { name: "order-pod-5c6d7e-abc99" }, message: "Heap memory usage at 85% — approaching limit" }),
  log({ "@timestamp": mins(9),  level: "ERROR", service: "order-service", host: { name: "order-pod-5c6d7e-abc99" }, message: "OutOfMemoryError: Java heap space", stack_trace: "java.lang.OutOfMemoryError: Java heap space at java.util.Arrays.copyOf" }),
  log({ "@timestamp": mins(7),  level: "ERROR", service: "order-service", host: { name: "order-pod-5c6d7e-abc99" }, message: "GC overhead limit exceeded — JVM spending >98% time in garbage collection" }),
  log({ "@timestamp": mins(5),  level: "ERROR", service: "order-service", host: { name: "order-pod-5c6d7e-abc99" }, message: "Order processing halted — unable to allocate memory for new requests" }),

  // user-service · db-slowdown
  log({ "@timestamp": mins(13), level: "WARN",  service: "user-service", host: { name: "user-pod-3a4b5c-def88" }, message: "Slow query detected: SELECT * FROM users WHERE email=? took 2340ms" }),
  log({ "@timestamp": mins(10), level: "ERROR", service: "user-service", host: { name: "user-pod-3a4b5c-def88" }, message: "Query timeout after 5000ms — missing index on users.email column suspected" }),
  log({ "@timestamp": mins(8),  level: "ERROR", service: "user-service", host: { name: "user-pod-3a4b5c-def88" }, message: "DB connection pool exhausted — all 100 connections in use" }),
  log({ "@timestamp": mins(6),  level: "ERROR", service: "user-service", host: { name: "user-pod-3a4b5c-def88" }, message: "User authentication failing — login requests timing out" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 1
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(1, 5),  level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "Stripe webhook signature validation failed" }),
  log({ "@timestamp": days(1, 3),  level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "Duplicate transaction detected — idempotency key collision" }),
  log({ "@timestamp": days(1, 10), level: "WARN",  service: "order-service",   host: { name: "order-pod-5c6d7e-abc99" }, message: "Heap memory at 70% — monitor closely" }),
  log({ "@timestamp": days(1, 8),  level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc99" }, message: "Failed to deserialize order payload — schema mismatch" }),
  log({ "@timestamp": days(1, 15), level: "INFO",  service: "user-service",    host: { name: "user-pod-3a4b5c-def88" }, message: "User login rate spike — 3x normal volume" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 2
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(2, 20), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p3" }, message: "SSL handshake timeout connecting to payment gateway" }),
  log({ "@timestamp": days(2, 18), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p3" }, message: "Refund processing failed — downstream returned HTTP 503" }),
  log({ "@timestamp": days(2, 12), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def88" }, message: "Password reset email delivery failed — SMTP timeout" }),
  log({ "@timestamp": days(2, 9),  level: "WARN",  service: "user-service",    host: { name: "user-pod-3a4b5c-def88" }, message: "Rate limiter triggered for IP 192.168.1.42 — 500 req/min" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 3
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(3, 30), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc99" }, message: "Kafka consumer lag exceeded 10000 messages" }),
  log({ "@timestamp": days(3, 25), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc99" }, message: "Order status update deadlock — rolled back transaction" }),
  log({ "@timestamp": days(3, 20), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc99" }, message: "Inventory service unavailable — order fulfilment paused" }),
  log({ "@timestamp": days(3, 5),  level: "WARN",  service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "High response latency on charge endpoint — p99 at 4200ms" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 5
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(5, 45), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def99" }, message: "JWT secret rotation failed — tokens invalidated for all users" }),
  log({ "@timestamp": days(5, 40), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def99" }, message: "Session store Redis connection refused" }),
  log({ "@timestamp": days(5, 35), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def99" }, message: "Auth service returning HTTP 500 for all /login requests" }),
  log({ "@timestamp": days(5, 30), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p2" }, message: "PCI audit log write failed — disk quota exceeded" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 7
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(7, 60), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc88" }, message: "Elasticsearch index write rejected — circuit breaker open" }),
  log({ "@timestamp": days(7, 55), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc88" }, message: "Bulk order import timed out after 30s" }),
  log({ "@timestamp": days(7, 50), level: "WARN",  service: "order-service",   host: { name: "order-pod-5c6d7e-abc88" }, message: "Retry queue depth at 8500 — approaching max capacity" }),
  log({ "@timestamp": days(7, 10), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def88" }, message: "LDAP sync failed — directory service unreachable" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 10
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(10, 5),  level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "Fraud detection model returned null — defaulting to allow" }),
  log({ "@timestamp": days(10, 3),  level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "3DS authentication service timeout — 6000ms exceeded" }),
  log({ "@timestamp": days(10, 20), level: "WARN",  service: "order-service",   host: { name: "order-pod-5c6d7e-abc99" }, message: "Shipping provider API rate limit reached — backing off 60s" }),
  log({ "@timestamp": days(10, 18), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc99" }, message: "Tax calculation service returned invalid response" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 14
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(14, 90), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def77" }, message: "Database failover triggered — primary node unreachable" }),
  log({ "@timestamp": days(14, 85), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def77" }, message: "Replica lag 45s — read queries returning stale data" }),
  log({ "@timestamp": days(14, 80), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def77" }, message: "Connection pool exhausted during failover — 200 requests dropped" }),
  log({ "@timestamp": days(14, 30), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "Currency conversion API returned HTTP 429 — quota exhausted" }),
  log({ "@timestamp": days(14, 28), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "Settlement batch job failed — missing FX rates" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 18
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(18, 10), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc99" }, message: "Warehouse callback webhook rejected — HMAC mismatch" }),
  log({ "@timestamp": days(18, 8),  level: "WARN",  service: "order-service",   host: { name: "order-pod-5c6d7e-abc99" }, message: "Order reconciliation job running 3x slower than baseline" }),
  log({ "@timestamp": days(18, 40), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def88" }, message: "MFA service degraded — TOTP validation latency at 8000ms" }),
  log({ "@timestamp": days(18, 38), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def88" }, message: "Brute force lockout triggered for 14 accounts simultaneously" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 21
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(21, 120), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p3" }, message: "Chargeback processor queue stuck — no progress for 10 min" }),
  log({ "@timestamp": days(21, 115), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p3" }, message: "Dead letter queue size critical — 12000 unprocessed messages" }),
  log({ "@timestamp": days(21, 60),  level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc88" }, message: "Product catalogue service returned empty response — orders blocked" }),
  log({ "@timestamp": days(21, 58),  level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc88" }, message: "Cache stampede detected — Redis hit rate dropped to 12%" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 25
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(25, 15), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def66" }, message: "OAuth token introspection endpoint returning HTTP 503" }),
  log({ "@timestamp": days(25, 12), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def66" }, message: "SSO provider certificate expired — all federated logins failing" }),
  log({ "@timestamp": days(25, 10), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p2" }, message: "Bank transfer ACH file generation failed — invalid routing number format" }),
  log({ "@timestamp": days(25, 8),  level: "WARN",  service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p2" }, message: "Payment retry storm detected — 400 retries/sec above normal" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 28
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(28, 200), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc77" }, message: "Distributed lock acquisition timed out — concurrent update conflict" }),
  log({ "@timestamp": days(28, 195), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc77" }, message: "Order state machine in invalid transition — manual review required" }),
  log({ "@timestamp": days(28, 190), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc77" }, message: "Event sourcing replay failed at offset 884231 — data corruption suspected" }),
  log({ "@timestamp": days(28, 50),  level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def88" }, message: "GDPR data export job failed — S3 bucket permission denied" }),
  log({ "@timestamp": days(28, 45),  level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p1" }, message: "PSD2 strong authentication bypass attempt detected and blocked" }),

  // ══════════════════════════════════════════════════════════════════════════
  // DAY 30
  // ══════════════════════════════════════════════════════════════════════════
  log({ "@timestamp": days(30, 300), level: "ERROR", service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p0" }, message: "Cold start latency spike — JVM warmup taking 45s" }),
  log({ "@timestamp": days(30, 295), level: "WARN",  service: "payment-service", host: { name: "payment-pod-7d9f8b-xk2p0" }, message: "Connection pool pre-warming failed — starting cold" }),
  log({ "@timestamp": days(30, 290), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc66" }, message: "Database schema migration failed — rollback initiated" }),
  log({ "@timestamp": days(30, 285), level: "ERROR", service: "order-service",   host: { name: "order-pod-5c6d7e-abc66" }, message: "Foreign key constraint violation during migration rollback" }),
  log({ "@timestamp": days(30, 180), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def55" }, message: "New user registration failing — email uniqueness check timeout" }),
  log({ "@timestamp": days(30, 175), level: "ERROR", service: "user-service",    host: { name: "user-pod-3a4b5c-def55" }, message: "Profile image upload rejected — CDN endpoint unreachable" }),
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

  console.log("\n📋 Services seeded (30-day history):");
  console.log("   payment-service — incidents across days: today, 1, 2, 3, 5, 7, 10, 14, 18, 21, 25, 28, 30");
  console.log("   order-service   — incidents across days: today, 1, 3, 7, 10, 18, 21, 28, 30");
  console.log("   user-service    — incidents across days: today, 1, 2, 5, 7, 14, 18, 25, 28, 30");
  console.log("\n🚀 Ready. Run npm start and fire your scenarios.\n");
}

seed().catch((err) => {
  console.error(`❌ Seeder failed: ${err.message}`);
  process.exit(1);
});
