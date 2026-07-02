# PM2 Orbit

High-performance PM2 monitoring dashboard. Event-driven, supports 1000+ processes.

## Quick Start

```bash
npx pm2-orbit
```

Opens at [http://localhost:9823](http://localhost:9823)

## Install

```bash
npm install -g pm2-orbit
pm2-orbit
```

## Usage

```
pm2-orbit [options]

Options:
  -p, --port <port>    Port to listen on (default: 9823)
  -H, --host <host>    Host to bind to (default: 127.0.0.1)
  -t, --theme <theme>  Theme: dark | light | system
  -n, --no-open        Don't open browser on start
  -h, --help           Show help
  -v, --version        Show version
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PM2_ORBIT_PORT` | Server port | 9823 |
| `PM2_ORBIT_TOKEN` | Auth token for API access | — |
| `PM2_ORBIT_LOG_BUFFER` | Max log lines per process | 2000 |
| `LOG_LEVEL` | Logger level: debug \| info \| warn \| error | info |
| `CORS_ORIGINS` | Comma-separated allowed origins | http://127.0.0.1:9823 |
| `SLACK_WEBHOOK_URL` | Slack webhook for alerts | — |
| `DISCORD_WEBHOOK_URL` | Discord webhook for alerts | — |
| `WEBHOOK_URL` | Generic webhook for alerts | — |
| `SMTP_HOST` | SMTP server for email alerts | — |

## Features

- Real-time process monitoring via WebSocket
- System metrics (CPU, memory, load, network, disk)
- Per-process CPU/memory history with sparklines
- Log viewer with live tailing and search
- Alert rules with multi-channel notifications (Slack, Discord, webhook, email)
- Dark/light/system theme
- Historical metrics with charts
- Virtual scrolling for 1000+ processes
- Keyboard shortcuts (R restart, S stop, End scroll to bottom)
- Command palette (Ctrl+K)
- Export/import settings

## Docker

```bash
docker build -t pm2-orbit .
docker run -p 9823:9823 -v /run/pm2.sock:/run/pm2.sock pm2-orbit
```

## Development

```bash
git clone https://github.com/ihssmaheel-dev/pm2-orbit.git
cd pm2-orbit
npm install
npm run dev
```

## Architecture

```
pm2 bus → bridge → pipeline → WebSocket → React UI
                  → buffer   → log tailer
                  → alerts   → notifications
                  → store    → SQLite / in-memory
```

## Tech Stack

- **Backend:** Fastify, esbuild, ws, systeminformation
- **Frontend:** React, Tailwind CSS, Zustand, TanStack Virtual, uPlot
- **Storage:** better-sqlite3 (optional, falls back to in-memory)

## License

MIT
