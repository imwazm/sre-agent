const scenarios = [
  {
    id: "high-error-rate",
    alert: {
      title: "High Error Rate Detected",
      service: "payment-service",
      severity: "critical",
      threshold: "error_rate > 5%",
      triggered_at: new Date().toISOString(),
    },
    elkLogs: [
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: "ERROR",
        service: "payment-service",
        message: "NullPointerException in PaymentProcessor.charge()",
        trace_id: "abc123",
        stack_trace: "java.lang.NullPointerException at com.app.PaymentProcessor.charge(PaymentProcessor.java:142)",
      },
      {
        timestamp: new Date(Date.now() - 50000).toISOString(),
        level: "ERROR",
        service: "payment-service",
        message: "Database connection timeout after 30s",
        trace_id: "abc124",
        host: "payment-pod-7d9f8b-xk2p1",
      },
      {
        timestamp: new Date(Date.now() - 40000).toISOString(),
        level: "ERROR",
        service: "payment-service",
        message: "Circuit breaker OPEN — downstream stripe-gateway unreachable",
        trace_id: "abc125",
        host: "payment-pod-7d9f8b-xk2p1",
      },
    ],
    datadogMetrics: {
      error_rate: [
        { timestamp: Date.now() - 300000, value: 0.8 },
        { timestamp: Date.now() - 240000, value: 1.2 },
        { timestamp: Date.now() - 180000, value: 3.5 },
        { timestamp: Date.now() - 120000, value: 6.1 },
        { timestamp: Date.now() - 60000, value: 8.4 },
      ],
      p99_latency_ms: [
        { timestamp: Date.now() - 300000, value: 220 },
        { timestamp: Date.now() - 240000, value: 480 },
        { timestamp: Date.now() - 180000, value: 1200 },
        { timestamp: Date.now() - 120000, value: 4800 },
        { timestamp: Date.now() - 60000, value: 9200 },
      ],
      pod_restarts: [
        { timestamp: Date.now() - 180000, value: 1 },
        { timestamp: Date.now() - 120000, value: 3 },
        { timestamp: Date.now() - 60000, value: 7 },
      ],
    },
  },
  {
    id: "memory-leak",
    alert: {
      title: "Memory Usage Critical",
      service: "order-service",
      severity: "high",
      threshold: "memory_usage > 90%",
      triggered_at: new Date().toISOString(),
    },
    elkLogs: [
      {
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: "WARN",
        service: "order-service",
        message: "Heap memory usage at 85% — approaching limit",
        host: "order-pod-5c6d7e-abc99",
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: "ERROR",
        service: "order-service",
        message: "OutOfMemoryError: Java heap space",
        host: "order-pod-5c6d7e-abc99",
      },
    ],
    datadogMetrics: {
      memory_usage_percent: [
        { timestamp: Date.now() - 600000, value: 65 },
        { timestamp: Date.now() - 300000, value: 78 },
        { timestamp: Date.now() - 120000, value: 88 },
        { timestamp: Date.now() - 60000, value: 94 },
      ],
      gc_pause_ms: [
        { timestamp: Date.now() - 300000, value: 120 },
        { timestamp: Date.now() - 120000, value: 850 },
        { timestamp: Date.now() - 60000, value: 3200 },
      ],
    },
  },
  {
    id: "db-slowdown",
    alert: {
      title: "Database Query Latency Spike",
      service: "user-service",
      severity: "high",
      threshold: "db_query_p95 > 2000ms",
      triggered_at: new Date().toISOString(),
    },
    elkLogs: [
      {
        timestamp: new Date(Date.now() - 90000).toISOString(),
        level: "WARN",
        service: "user-service",
        message: "Slow query detected: SELECT * FROM users WHERE email=? took 2340ms",
        host: "user-pod-3a4b5c-def88",
      },
      {
        timestamp: new Date(Date.now() - 45000).toISOString(),
        level: "ERROR",
        service: "user-service",
        message: "Query timeout after 5000ms — missing index on users.email column suspected",
        host: "user-pod-3a4b5c-def88",
      },
    ],
    datadogMetrics: {
      db_query_p95_ms: [
        { timestamp: Date.now() - 600000, value: 45 },
        { timestamp: Date.now() - 300000, value: 210 },
        { timestamp: Date.now() - 90000, value: 2340 },
        { timestamp: Date.now() - 45000, value: 5100 },
      ],
      active_db_connections: [
        { timestamp: Date.now() - 600000, value: 12 },
        { timestamp: Date.now() - 300000, value: 45 },
        { timestamp: Date.now() - 90000, value: 98 },
        { timestamp: Date.now() - 45000, value: 100 },
      ],
    },
  },
];

function getScenario(id) {
  return scenarios.find((s) => s.id === id) || scenarios[0];
}

function getRandomScenario() {
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

module.exports = { scenarios, getScenario, getRandomScenario };
