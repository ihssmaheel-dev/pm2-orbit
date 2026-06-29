# PM2 Orbit

High-performance PM2 monitoring dashboard. Event-driven, supports 1000+ processes, < 150KB.

## Quick Start

```bash
npx pm2-orbit
```

Opens at [http://127.0.0.1:9823](http://127.0.0.1:9823)

## Installation

```bash
npm install -g pm2-orbit
pm2-orbit
```

Or run without installing:

```bash
npx pm2-orbit
```

## Usage

```
Usage: pm2-orbit [options]

Options:
  -p, --port <port>   Port to listen on (default: 9823)
  -t, --theme <theme> Default theme: dark | light | system
  -n, --no-open       Don't open browser on start
  -h, --help          Show help
  -v, --version       Show version

Environment variables:
  PM2_ORBIT_PORT        Server port (default: 9823)
  PM2_ORBIT_TOKEN       Auth token for API access
  PM2_ORBIT_LOG_BUFFER  Max log lines per process (default: 2000)
  LOG_LEVEL             Logger level: debug | info | warn | error (default: info)
  CORS_ORIGINS          Comma-separated allowed origins (default: http://127.0.0.1:9823,http://localhost:9823)

Notification channels:
  SLACK_WEBHOOK_URL     Slack webhook URL
  DISCORD_WEBHOOK_URL   Discord webhook URL
  WEBHOOK_URL           Generic webhook URL
  SMTP_HOST             SMTP server host
  SMTP_PORT             SMTP server port
  SMTP_USER             SMTP username
  SMTP_PASS             SMTP password
  SMTP_FROM             Sender email address
  SMTP_TO               Recipient email address
  NOTIFY_*_ENABLED      Set to 0 to disable a channel (e.g. NOTIFY_SLACK_ENABLED=0)
```

## Features

- Real-time process monitoring via WebSocket
- System metrics (CPU, memory, load, network, disk)
- Per-process CPU/memory history with sparklines
- Log viewer with live tailing
- Configurable alert rules with multi-channel notifications (browser, Slack, Discord, webhook, email)
- Dark/light/system theme
- Historical metrics with charts
- Keyboard shortcuts (`/` search, `j`/`k` navigate, `n` new alert rule)
- Virtual scrolling for 1000+ processes
- Export/import settings as JSON

## Docker

```bash
docker build -t pm2-orbit .
docker run -p 9823:9823 -v /run/pm2.sock:/run/pm2.sock pm2-orbit
```

## Build from source

```bash
git clone https://github.com/ihssmaheel-dev/pm2-orbit.git
cd pm2-orbit
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

Starts Vite dev server on port 5151 and the API server on port 9823 with hot reload.

## Architecture

```
pm2 bus → bridge → pipeline → WebSocket → React UI
                  → buffer   → log tailer
                  → alerts   → notifications
                  → store    → SQLite / in-memory
```

## Tech Stack

- **Backend:** Fastify, esbuild, ws, systeminformation
- **Frontend:** React, Tailwind CSS, Zustand, TanStack Virtual, Recharts
- **Storage:** better-sqlite3 (optional, falls back to in-memory)

## License

MIT
