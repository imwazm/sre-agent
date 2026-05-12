# SRE Agent — AI-Powered Incident Triage Pipeline

> Automatically correlates ELK logs + Datadog metrics, runs Claude root cause analysis, and creates a resolved ServiceNow incident — without any human intervention.

**Team:** Waseem · Akhil · Iswarya  
**Stack:** Claude Sonnet 4 · ELK · Datadog · ServiceNow · Node.js · Docker

---

## What This App Does

When your system throws an alert (high error rate, memory spike, slow DB queries), someone has to:

1. Dig through logs
2. Pull up metrics dashboards
3. Figure out the root cause
4. Manually file a ServiceNow ticket

**SRE Agent does all of that automatically in under 2 seconds.**

It listens for webhook alerts, pulls the relevant logs and metrics, asks Claude to reason over all the signals, and creates a fully populated ServiceNow incident — urgency, impact, priority, root cause, remediation steps included.

---

## How It Works — The 5-Step Pipeline

```
Kibana Watcher / Datadog Monitor
          │
          ▼
  POST /webhook/alert          ← Your alert fires here
          │
          ▼
  Step 1: Receive Alert         ← Parse service name, severity, threshold
          │
          ▼
  Step 2: Fetch ELK Logs        ← Last 15 min of ERROR logs for that service
          │
          ▼
  Step 3: Fetch Datadog Metrics ← Error rate, latency, pod restarts (time-series)
          │
          ▼
  Step 4: Claude Analysis       ← Correlate all signals → structured JSON triage
          │
          ▼
  Step 5: ServiceNow Incident   ← Auto-created with root cause + remediation steps
          │
          ▼
  Datadog APM Annotation        ← Incident number written back to your timeline
```

---

## Project Structure

```
sre-agent/
├── index.js                      # Entry point — starts Express on port 3000
├── routes/
│   └── webhook.js                # POST /webhook/alert — runs the full pipeline
├── services/
│   ├── elk/
│   │   ├── index.js              # Plug selector — loads mock or real based on .env
│   │   ├── mock.js               # DUMMY PLUG — returns scenario logs, no network
│   │   └── real.js               # REAL PLUG  — queries live Elasticsearch
│   ├── datadog/
│   │   ├── index.js              # Plug selector — loads mock or real based on .env
│   │   ├── mock.js               # DUMMY PLUG — returns scenario metrics, no network
│   │   └── real.js               # REAL PLUG  — calls live Datadog API
│   ├── claudeService.js          # Calls Claude Sonnet for root cause analysis
│   └── serviceNow.js             # Creates the ServiceNow incident via REST API
├── data/
│   └── scenarios.js              # 3 pre-built mock scenarios for testing
├── .env                          # API keys, URLs, mock mode toggle
└── package.json                  # express, axios, dotenv, @anthropic-ai/sdk
```

### Plug Architecture — Swapping Mock ↔ Real

Each external integration (ELK, Datadog) has three files:

```
services/elk/
  index.js   ← reads USE_MOCK_DATA, silently loads the right plug
  mock.js    ← DUMMY PLUG: hardcoded scenario data, zero network calls
  real.js    ← REAL PLUG:  live Elasticsearch DSL queries
```

To switch from mock to real, **change one line in `.env`**:
```env
USE_MOCK_DATA=false   # unplugs mock, connects real ELK + Datadog instantly
```

Nothing else in the app changes. `routes/webhook.js` calls `require('./services/elk')` and gets whichever plug is active — it never knows the difference.

### File-by-File Explanation

| File | What It Does |
|---|---|
| `index.js` | Boots the Express server, loads `.env`, mounts the `/webhook` route, exposes `GET /health` |
| `routes/webhook.js` | The brain — calls each service in order, collects results, returns the full triage JSON |
| `services/elk/index.js` | Plug selector — loads `mock.js` or `real.js` based on `USE_MOCK_DATA` |
| `services/elk/mock.js` | Dummy plug — returns scenario logs instantly, no network |
| `services/elk/real.js` | Real plug — queries Elasticsearch with time-windowed DSL for ERROR logs |
| `services/datadog/index.js` | Plug selector — loads `mock.js` or `real.js` based on `USE_MOCK_DATA` |
| `services/datadog/mock.js` | Dummy plug — returns scenario metrics instantly, no network |
| `services/datadog/real.js` | Real plug — queries Datadog Metrics API + posts APM event annotations |
| `services/claudeService.js` | Formats a structured prompt with all signals and sends to Claude Sonnet; parses the JSON response |
| `services/serviceNow.js` | Maps Claude's output to ServiceNow fields and POSTs to `/api/now/table/incident` |
| `data/scenarios.js` | Hardcoded mock alerts + logs + metrics for 3 realistic incidents (no real APIs needed) |
| `.env` | Single place to configure everything — switch between mock and live with one flag |
| `package.json` | Four dependencies: `express` (server), `axios` (HTTP), `dotenv` (config), `@anthropic-ai/sdk` (Claude) |

---

## Mock Scenarios

Three realistic incidents are built in for testing — no ELK or Datadog connection needed.

| Scenario ID | Service | Alert | Key Signals |
|---|---|---|---|
| `high-error-rate` | payment-service | error_rate > 5% | NullPointerException → DB timeout → circuit breaker OPEN on stripe-gateway |
| `memory-leak` | order-service | memory_usage > 90% | OutOfMemoryError: Java heap space, GC pause spiking to 3200ms |
| `db-slowdown` | user-service | db_query_p95 > 2000ms | Slow query 2340ms, DB connection pool at 100/100 (exhausted) |

---

## Setup & Running

### Prerequisites
- Node.js 18+ installed
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### 1. Install dependencies
```bash
cd sre-agent
npm install
```

### 2. Configure environment
Open `.env` and set your Anthropic API key:
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
USE_MOCK_DATA=true       # Keep true to test without real ELK/Datadog/ServiceNow
```

### 3. Start the server
```bash
npm start
```
You'll see:
```
SRE Agent running on http://localhost:3000
Mock mode: ON
POST http://localhost:3000/webhook/alert to trigger the pipeline
```

### 4. Fire a test alert

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/webhook/alert" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"scenario_id": "high-error-rate"}'
```

**curl:**
```bash
curl -X POST http://localhost:3000/webhook/alert \
  -H "Content-Type: application/json" \
  -d '{"scenario_id": "high-error-rate"}'
```

Try all three scenarios:
- `high-error-rate`
- `memory-leak`
- `db-slowdown`

---

## What Claude Returns

Claude receives the alert + logs + metrics and returns this structured JSON:

```json
{
  "short_description": "payment-service circuit breaker open due to DB timeout cascade",
  "root_cause": "A NullPointerException in PaymentProcessor.charge() triggered repeated failures, exhausting the DB connection pool. Timeouts caused the stripe-gateway circuit breaker to open, halting all payment processing.",
  "urgency": 1,
  "impact": 1,
  "priority": 1,
  "category": "Application",
  "subcategory": "Payment Processing",
  "confidence": "high",
  "contributing_factors": [
    "Null reference in PaymentProcessor.java line 142",
    "DB connection pool exhaustion",
    "No circuit breaker retry backoff configured"
  ],
  "remediation_steps": [
    "Restart payment-service pods to clear the connection pool",
    "Fix null reference in PaymentProcessor.java line 142",
    "Check stripe-gateway health and manually reset circuit breaker",
    "Increase DB connection pool size as temporary mitigation"
  ]
}
```

---

## Full API Response

```json
{
  "status": "success",
  "elapsed_ms": 1842,
  "alert": {
    "title": "High Error Rate Detected",
    "service": "payment-service",
    "severity": "critical"
  },
  "triage": {
    "short_description": "payment-service circuit breaker open due to DB timeout cascade",
    "root_cause": "...",
    "urgency": 1,
    "impact": 1,
    "priority": 1,
    "confidence": "high",
    "remediation_steps": ["..."]
  },
  "incident": {
    "number": "INC1042873",
    "sys_id": "mock-sys-id-1715432100000",
    "priority": "1"
  }
}
```

---

## ServiceNow Field Mapping

| Claude Output | ServiceNow Field | Scale |
|---|---|---|
| `triage.short_description` | `short_description` | — |
| `triage.root_cause` + alert metadata | `description` | — |
| `triage.urgency` | `urgency` | 1=Critical · 2=High · 3=Medium |
| `triage.impact` | `impact` | 1=Critical · 2=High · 3=Medium |
| `triage.priority` | `priority` | 1=Critical · 2=High · 3=Medium · 4=Low |
| `triage.category` | `category` | Application / Database / Infrastructure |
| `triage.remediation_steps` | `work_notes` | Numbered action list |
| `triage.category` (mapped) | `assignment_group` | Auto-resolved to correct team |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `ANTHROPIC_API_KEY` | Anthropic API key | — |
| `ELASTICSEARCH_URL` | Elasticsearch base URL | `http://localhost:9200` |
| `KIBANA_URL` | Kibana base URL | `http://localhost:5601` |
| `DATADOG_API_KEY` | Datadog API key | — |
| `DATADOG_APP_KEY` | Datadog Application key | — |
| `DATADOG_SITE` | Datadog site | `datadoghq.com` |
| `SERVICENOW_INSTANCE` | ServiceNow hostname | — |
| `SERVICENOW_USERNAME` | ServiceNow username | — |
| `SERVICENOW_PASSWORD` | ServiceNow password | — |
| `USE_MOCK_DATA` | Skip real APIs, use mock scenarios | `true` |

---

## Technology Choices

| Technology | Why |
|---|---|
| **Claude Sonnet 4** | Best balance of reasoning depth and speed for real-time triage. Structured output format ensures consistent parsing into ServiceNow fields. |
| **ELK Stack** | Elasticsearch DSL makes time-windowed log retrieval trivial. Kibana Watcher fires webhook alerts directly into the agent. |
| **Datadog** | Single API call returns full time-series metrics. Events API closes the feedback loop by writing the incident number back to the APM timeline. |
| **ServiceNow REST API** | Incident table accepts structured JSON and maps directly to urgency/impact/priority — no manual field translation. |
| **Node.js + Express** | Lightweight enough to run as a sidecar service. `@anthropic-ai/sdk` handles Claude natively. |
| **Docker Compose** | Runs the entire ELK stack locally on one machine for the POC with a single command. |

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns server status and mock mode flag |
| `POST` | `/webhook/alert` | Triggers the full 5-step triage pipeline |

---

*Built by Waseem · Akhil · Iswarya — Powered by Claude Sonnet 4*
