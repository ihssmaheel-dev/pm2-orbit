# API Documentation

PM2 Orbit exposes a REST API and WebSocket interface for monitoring and controlling PM2 processes.

## Base URL

```
http://127.0.0.1:9823
```

## Authentication

When `PM2_ORBIT_TOKEN` is set, all endpoints require Bearer token authentication:

```
Authorization: Bearer <your-token>
```

**Exempt endpoints:** `/api/health`, `/api/ping`

---

## REST API

### Health & System

#### `GET /api/health`
Returns server health status.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "version": "1.0.6",
  "processes": 5,
  "nodeVersion": "v22.0.0",
  "pm2Version": "5.4.3"
}
```

#### `GET /api/ping`
Returns "pong". Lightweight health check for reverse proxies.

#### `GET /api/system`
Returns current system metrics.

**Response:**
```json
{
  "cpu": 12.5,
  "memory": { "used": 4294967296, "total": 17179869184 },
  "loadAvg": [1.5, 1.2, 0.8],
  "disk": { "read": 1048576, "write": 524288 },
  "network": { "rx": 1024000, "tx": 512000 },
  "cpuCores": 8
}
```

---

### Processes

#### `GET /api/processes`
Returns all PM2 processes.

**Response:**
```json
[
  {
    "id": 0,
    "name": "api-server",
    "status": "online",
    "pid": 12345,
    "cpu": 4.2,
    "memory": 155648000,
    "uptime": 86400000,
    "restarts": 0,
    "mode": "fork",
    "instances": 1,
    "history": { "ts": [], "cpu": [], "memory": [] }
  }
]
```

#### `GET /api/processes/:id/env`
Returns environment variables for a process (system vars filtered out).

#### `POST /api/processes/:id/action`
Execute an action on a process.

**Request body:**
```json
{
  "action": "restart",
  "instances": 2
}
```

**Valid actions:** `restart`, `stop`, `start`, `reload`, `delete`, `scale`, `flush`

**Response:**
```json
{ "success": true }
```

---

### Logs

#### `GET /api/logs/:id`
SSE (Server-Sent Events) stream for a specific process.

**Events:**
```
data: {"ts":1234567890,"stream":"stdout","message":"Server started"}

data: {"ts":1234567891,"stream":"stderr","message":"Error: Connection refused"}
```

#### `GET /api/logs/stream`
SSE stream for all processes.

---

### Alerts

#### `GET /api/alerts`
Returns all alert rules.

**Response:**
```json
[
  {
    "id": "rule-1",
    "scope": "process",
    "metric": "cpu",
    "operator": ">",
    "threshold": 80,
    "severity": "warning",
    "enabled": true,
    "channels": ["browser", "slack"]
  }
]
```

#### `POST /api/alerts`
Create a new alert rule.

**Request body:**
```json
{
  "id": "rule-1",
  "scope": "process",
  "metric": "cpu",
  "operator": ">",
  "threshold": 80,
  "severity": "warning",
  "enabled": true,
  "channels": ["browser", "slack"]
}
```

**Valid metrics (process):** `cpu`, `memory`, `restarts`, `status`
**Valid metrics (system):** `systemCpu`, `systemMemory`, `systemLoad`
**Valid operators:** `>`, `<`, `==`, `>=`, `<=`
**Valid severity:** `info`, `warning`, `critical`

#### `DELETE /api/alerts/:id`
Delete an alert rule.

#### `GET /api/alerts/history`
Returns recent alert events.

**Response:**
```json
{
  "events": [
    {
      "ruleId": "rule-1",
      "processId": 0,
      "processName": "api-server",
      "metric": "cpu",
      "value": 95.2,
      "threshold": 80,
      "severity": "warning",
      "message": "api-server: cpu > 80 (current: 95.2)",
      "ts": 1234567890
    }
  ],
  "truncated": false
}
```

---

### Settings

#### `GET /api/settings`
Returns current settings (sensitive values masked).

#### `PUT /api/settings`
Update settings.

**Request body:**
```json
{
  "theme": "dark",
  "slackWebhookUrl": "https://hooks.slack.com/...",
  "enabledChannels": { "slack": true, "discord": false }
}
```

#### `POST /api/settings/test-webhook`
Test a webhook endpoint.

**Request body:**
```json
{
  "url": "https://hooks.slack.com/...",
  "type": "slack"
}
```

**Response:**
```json
{ "success": true, "status": 200 }
```

#### `GET /api/channels`
Returns notification channel status.

**Response:**
```json
{
  "browser": { "configured": true, "enabled": true },
  "slack": { "configured": true, "enabled": true },
  "discord": { "configured": false, "enabled": true }
}
```

---

### History

#### `GET /api/history/:id`
Returns historical metrics for a process.

**Query params:** `hours` (1-168, default 24)

**Response:**
```json
[
  { "ts": 1234567890, "processId": 0, "processName": "api-server", "cpu": 4.2, "memory": 155648000 }
]
```

#### `GET /api/history/system`
Returns historical system metrics.

---

## WebSocket Protocol

### Connection
```
ws://127.0.0.1:9823/ws
```

### Tick Format
```json
{
  "ts": 1234567890,
  "events": [
    { "type": "update", "process": { ... } }
  ],
  "full": [ ... ],
  "fullSeq": 5,
  "system": { ... },
  "type": "update"
}
```

**Fields:**
- `ts` — Timestamp
- `events` — Delta events (only changed processes)
- `full` — Full process list (every 5s)
- `fullSeq` — Sequence number for full sync
- `system` — System metrics
- `type` — `"update"` (normal) or `"reconnect"` (PM2 daemon reconnected)

---

## Error Responses

All error responses follow this format:
```json
{
  "error": "Error message"
}
```

**HTTP Status Codes:**
- `200` — Success
- `400` — Bad request (invalid parameters)
- `401` — Missing authentication
- `403` — Invalid token
- `404` — Resource not found
- `500` — Internal server error
- `503` — Service unavailable (persistence not available)
