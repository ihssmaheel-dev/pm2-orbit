# PM2 Orbit

> High-performance, real-time PM2 monitoring dashboard. Event-driven architecture supporting 100+ processes with zero configuration.

<img width="1918" height="932" alt="image" src="https://github.com/user-attachments/assets/ea4c4aac-86ed-455b-96e1-458662c55cb2" />

## Why PM2 Orbit?

Most PM2 dashboards poll the daemon every few hundred milliseconds, wasting resources and introducing latency. PM2 Orbit subscribes directly to PM2's event bus — updates arrive the instant they happen, with zero polling overhead.

```bash
npx pm2-orbit
```

That's it. No config files, no databases, no Docker required. Opens in your browser and starts monitoring.

---

## Features

**Process Monitoring**
- Real-time process status via WebSocket (online, stopped, errored, launching)
- Virtualized table handling 1000+ processes at 60fps
- Per-process CPU/memory sparklines with 120-point history
- Cluster mode support with per-worker breakdown
- One-click restart, stop, start, reload, delete for any process
- Bulk actions: Restart All, Stop All, Start All, Delete All

**Log Viewer**
- Live SSE log tailing from PM2's event bus
- ANSI escape code stripping for clean display
- Per-process or merged view with color coding
- Regex search with highlight
- Pause/resume without disconnecting
- Copy individual lines or download full buffer

<img width="1918" height="936" alt="image" src="https://github.com/user-attachments/assets/d19c1242-024a-4c3e-b4cb-5b31b0118681" />

**System Metrics**
- Host CPU, memory, load average, network I/O, disk I/O
- Auto-collecting via `systeminformation` with smart caching
- Historical charts with 1h / 6h / 24h time ranges

**Alert Engine**
- Rule-based alerts: CPU > N%, memory > NMB, restarts > N, process offline
- Multi-channel notifications: Slack, Discord, webhook, email, browser push
- Per-rule channel configuration with enable/disable toggles
- Cooldown to prevent alert fatigue
- Alert history with severity levels

**Developer Experience**
- Keyboard shortcuts: `R` restart, `S` stop, `End` scroll to bottom, `Ctrl+K` command palette
- Command palette for fuzzy process search and quick actions
- Dark / Light / System theme with smooth transitions
- Export/import settings as JSON

---

## Install

```bash
# One command — installs pm2 automatically if missing
npm install -g pm2-orbit
pm2-orbit
```

Or run without installing:

```bash
npx pm2-orbit
```

---

## CLI Options

```
pm2-orbit [options]

Options:
  -p, --port <port>     Port to listen on (default: 9823)
  -H, --host <host>     Host to bind to (default: 127.0.0.1)
  -t, --theme <theme>   Theme: dark | light | system
  -n, --no-open         Don't open browser on start
  -h, --help            Show help
  -v, --version         Show version

Examples:
  pm2-orbit                      # Start on default port
  pm2-orbit -p 3000              # Start on port 3000
  pm2-orbit --host 0.0.0.0       # Allow remote access
  pm2-orbit --no-open            # Don't open browser
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PM2_ORBIT_PORT` | Server port | `9823` |
| `PM2_ORBIT_TOKEN` | Bearer auth token (required for non-localhost) | — |
| `PM2_ORBIT_LOG_BUFFER` | Max log lines per process | `2000` |
| `LOG_LEVEL` | Logger level: `debug`, `info`, `warn`, `error` | `info` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://127.0.0.1:9823,http://localhost:9823` |

### Notification Channels

Notifications can be configured via environment variables **or** the Settings UI (accessible at `/settings` in the browser). The Settings UI saves to `~/.pm2-orbit/settings.json` and applies values at startup.

| Variable | Description |
|----------|-------------|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL |
| `WEBHOOK_URL` | Generic POST webhook URL |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender email address |
| `SMTP_TO` | Recipient email address |
| `NOTIFY_*_ENABLED` | Set to `0` to disable a channel (e.g., `NOTIFY_SLACK_ENABLED=0`) |

---

## Docker

```bash
# Build
docker build -t pm2-orbit .

# Run (mount PM2 socket for process access)
docker run -p 9823:9823 -v /run/pm2.sock:/run/pm2.sock pm2-orbit
```

---

## Development

```bash
git clone https://github.com/ihssmaheel-dev/pm2-orbit.git
cd pm2-orbit
npm install
npm run dev
```

Starts Vite dev server on port 5151 with API proxy to the backend on port 9823.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev mode (UI + server with hot reload) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Type-check backend |
| `npm run typecheck` | Type-check both backend and frontend |
| `npm test` | Run tests |

---

## Architecture

```
PM2 Daemon
    │
    │ pm2.launchBus() — event-driven, zero polling
    ▼
PM2 Bridge
    │
    ├──► Event Pipeline (batched, debounced)
    │
    ├──► Circular Buffer (120 points × typed arrays)
    │
    ├──► Alert Engine (rule evaluation, per-process indexed)
    │
    ├──► SQLite Store (optional, 24h retention)
    │
    └──► WebSocket Broadcaster
              │
              ▼
         React Frontend
              │
              ├──► Zustand Store (single source of truth)
              ├──► Virtual Table (1000+ rows)
              ├──► Log Viewer (SSE + virtual scroll)
              └──► Charts (uPlot, canvas-rendered)
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 18+ |
| **HTTP** | Fastify 5 |
| **WebSocket** | ws |
| **PM2 Integration** | `pm2.launchBus()` event subscription |
| **Metrics** | `systeminformation` |
| **Persistence** | better-sqlite3 (optional) |
| **Frontend** | React 19, Tailwind CSS, Zustand |
| **Virtualization** | TanStack Virtual |
| **Charts** | uPlot |
| **Build** | esbuild (backend), Vite (frontend) |

---

## Security

- Bearer token authentication via `PM2_ORBIT_TOKEN`
- CORS locked to localhost by default
- Rate limiting: 100 requests/minute per IP
- WebSocket connection limiting: 5 per IP
- Helmet security headers (XSS, CSP, HSTS)
- Environment variables masked in UI by default
- Process name sanitization in file paths
- Request ID tracking for audit trails

---

## License

[MIT](LICENSE)
