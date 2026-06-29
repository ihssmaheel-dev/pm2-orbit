# Contributing

## Setup

```bash
git clone https://github.com/ihssmaheel-dev/pm2-orbit.git
cd pm2-orbit
npm install
```

## Development

```bash
npm run dev
```

Opens Vite dev server at http://localhost:5151 with API proxy to http://localhost:9823.

## Code style

- TypeScript strict mode
- No semicolons
- Single quotes for strings
- 2-space indentation
- No unused variables or imports (`tsc --noEmit` must pass)

## Type checking

```bash
npm run typecheck
```

## Testing

```bash
npm test
```

## Project structure

```
src/              Backend (Fastify server)
  routes/         API route handlers
  core/           Business logic (PM2 bridge, alerts, logs, metrics)
  plugins/        Fastify plugins (auth, cors)
  utils/          Utilities (logger, validation)

ui/src/           Frontend (React + Vite)
  components/     Reusable UI components
  pages/          Page components (Dashboard, Logs, Alerts, History, Settings)
  hooks/          React hooks (useWebSocket, useTheme)
  store/          Zustand stores
  lib/            Utilities (WS client, API wrapper)

bin/              CLI entry point
```

## Pull requests

1. Fork the repo
2. Create a feature branch from `main`
3. Run `npm run typecheck` and `npm test`
4. Submit a PR with a clear description of the change
