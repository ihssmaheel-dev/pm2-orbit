# PM2 Orbit — Production-Grade Master Plan

**Goal:** Transform PM2 Orbit from prototype to production-grade open source PM2 monitoring dashboard.
**Scope:** Bug fixes, security, reliability, testing, CI/CD, documentation, accessibility, performance, and ecosystem.
**Total Tasks:** 67 | **Estimated Effort:** ~90 hours

---

## Phase 0 — Foundation & Open Source Infra (Do First)

> Establish CI, legal, and packaging before touching anything else.

### T0.1 — Add LICENSE file
**File:** `LICENSE` (new)
**Action:** Create MIT license file. `package.json` already declares MIT but the file is missing.
**Effort:** 5 min

### T0.2 — Add .npmignore
**File:** `.npmignore` (new)
**Action:** Exclude from npm package: `ui/`, `src/`, `test-servers/`, `.git/`, `node_modules/`, `dist-ui/`, `*.md`, `.husky/`, `ecosystem.config.js`
**Effort:** 10 min

### T0.3 — Add files field to package.json
**File:** `package.json`
**Action:** Add `"files": ["dist/", "bin/"]` to only ship compiled output and CLI entry point
**Effort:** 5 min

### T0.4 — Add GitHub Actions CI
**File:** `.github/workflows/ci.yml` (new)
**Action:**
```yaml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm test
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run build
```
**Effort:** 1 hr

### T0.5 — Add .editorconfig
**File:** `.editorconfig` (new)
**Action:** Consistent formatting across editors (indent: 2 spaces, line ending: lf, trim trailing whitespace)
**Effort:** 5 min

### T0.6 — Add issue templates
**File:** `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`
**Action:** Standard GitHub issue templates
**Effort:** 30 min

### T0.7 — Add PR template
**File:** `.github/pull_request_template.md`
**Action:** Checklist: type of change, testing, documentation, breaking changes
**Effort:** 15 min

---

## Phase 1 — Error & Empty States (Usability Foundation)

> Every page must handle loading, empty, error, and success states before adding new features.

### T1.1 — Create shared ErrorState component
**File:** `ui/src/components/shared/ErrorState.tsx` (new)
**Action:**
1. Create `ErrorState` component with props: `title`, `message`, `retry?` callback
2. Show error icon, message, and optional retry button
3. Integrate with existing design system (bg-card, border-border)
**Effort:** 30 min

### T1.2 — Add error/empty states to all pages
**Files:** All page components
**Action:** For each page, ensure:
- Loading spinner/skeleton while data fetches
- Error state with retry when API call fails
- Empty state with CTA when no data exists
- Success state with data rendered
**Pages to audit:** Dashboard/Processes, Logs, Alerts, History, Settings, ProcessDetail
**Effort:** 2 hrs

### T1.3 — Wrap each page in ErrorBoundary
**File:** `ui/src/components/layout/AppShell.tsx`
**Action:** Wrap each `<Page>` render with `ErrorBoundary` so a single page crash doesn't kill the whole app. Add `componentDidCatch` logging.
**Effort:** 30 min

### T1.4 — Add root ErrorBoundary logging
**File:** `ui/src/main.tsx`
**Action:** Verify `ErrorBoundary` wraps `<App />`. Add error info logging to console.
**Effort:** 15 min

### T1.5 — Add global toast on API errors
**File:** `ui/src/lib/api.ts` (new), integrate into stores
**Action:**
1. Create a thin fetch wrapper that catches HTTP errors and shows toast via sonner
2. Apply to all store fetch calls (alerts, history, settings, actions)
3. Show user-friendly error messages ("Failed to save settings", "Failed to load history")
**Effort:** 1 hr

---

## Phase 2 — Critical Bug Fixes (App-Breaking)

> These bugs cause data loss, crashes, or broken core features.

### T2.1 — Fix notification pipeline
**File:** `src/core/pm2/pipeline.ts`
**Problem:** `evaluateAlerts()` reads env vars for webhook URLs, but alert rules have per-rule `channels` and per-rule URLs that are never used.
**Fix:**
1. Import `AlertRule` type from `engine.ts`
2. After `alerts.evaluate()` returns fired events, look up the original rule by `alertEvent.ruleId`
3. For each fired event, iterate `rule.channels` and dispatch to correct channel
4. Wrap each in try/catch, log failures
**Effort:** 1 hr

### T2.2 — Fix LogViewer SSE reconnection storm
**File:** `ui/src/components/logs/LogViewer.tsx`
**Problem:** The `useEffect` dependency `processIds` changes on every WS tick because the Map reference changes, tearing down all SSE connections.
**Fix:**
1. Track process IDs with `useRef` and only reconnect when the set of process IDs actually changes
2. Compare sorted ID arrays, not joined strings
**Effort:** 30 min

### T2.3 — Fix alert store never fetching from server
**Files:** `ui/src/store/alerts.ts`, `ui/src/App.tsx`
**Problem:** `fetchRules()` and `fetchHistory()` are only called when Alerts page mounts. No data on app start.
**Fix:**
1. In `App.tsx`, call `useAlertsStore.getState().fetchRules()` and `fetchHistory()` on mount
2. Add `loaded` flag to avoid refetching
**Effort:** 30 min

### T2.4 — Add confirmation dialogs for bulk actions
**Files:** `ui/src/components/processes/ProcessTable.tsx`
**Problem:** "Stop All" and "Start All" execute immediately with no confirmation.
**Fix:**
1. Import `ConfirmDialog` from shared
2. Add `stopConfirm` and `startConfirm` state booleans
3. On button click, open confirmation dialog instead of executing immediately
4. On confirm, execute the bulk action
5. Show toast with count of affected processes
**Effort:** 30 min

### T2.5 — Sanitize process names in file paths
**File:** `src/core/logs/tailer.ts`, `src/routes/logs.ts`
**Problem:** `processName` is used directly in log file path construction. A malicious process name could cause path traversal.
**Fix:**
1. Create `sanitizeName(name: string): string` that strips `..`, `/`, `\`, and null bytes
2. Apply before using in `resolveLogPath()`
3. Apply in routes before passing to tailer
**Effort:** 30 min

### T2.6 — Fix memory leak in log buffers
**File:** `ui/src/store/logs.ts`, `ui/src/hooks/useWebSocket.ts`
**Problem:** When a process is deleted from PM2, its log buffer is never cleaned up. Stale entries accumulate.
**Fix:**
1. When `tick.events` contains `type: 'remove'`, call `useLogsStore.getState().clearLogs(event.process.id)`
2. Add `cleanup` method that removes buffers for processes not in the current list
3. Call cleanup on every full sync
**Effort:** 30 min

---

## Phase 3 — Security & Input Validation

> Lock down the attack surface before going public.

### T3.1 — Add input validation to all API routes
**Files:** `src/routes/processes.ts`, `src/routes/alerts.ts`, `src/routes/history.ts`
**Fix:**
1. Create `src/utils/validate.ts` with helper functions:
   - `parseIdParam(id: string): number | null` — returns null if invalid
   - `validateAlertRule(body: unknown): AlertRule | null` — validates structure
2. Apply to all routes that accept `:id` params
3. Return `400` with descriptive error messages
**Effort:** 1 hr

### T3.2 — Rate limit WebSocket connections
**File:** `src/server.ts`
**Problem:** No limit on WS connections per IP.
**Fix:**
1. Track connection count per IP in a `Map<string, number>`
2. Set max connections per IP to 5
3. On upgrade, check count before accepting
4. On close, decrement count
5. Destroy socket if limit exceeded
**Effort:** 45 min

### T3.3 — Add configurable CORS
**File:** `src/plugins/cors.ts` (new), `src/server.ts`
**Fix:**
1. Create `src/plugins/cors.ts` with `CORS_ORIGINS` env var support
2. Parse comma-separated origins
3. Default to localhost only
4. Register as Fastify plugin
**Effort:** 30 min

### T3.4 — Add structured logging
**File:** `src/utils/logger.ts` (new), all `src/` files
**Fix:**
1. Create logger with levels: debug, info, warn, error
2. Output JSON: `{ ts, level, msg, ...extra }`
3. Add `LOG_LEVEL` env var (default: info)
4. Replace all `console.log` with logger calls
5. Add request/response logging middleware with duration
6. Add request ID middleware (`X-Request-Id` header)
**Effort:** 3 hrs

---

## Phase 4 — Performance & Reliability

> Make it handle 1000+ processes without breaking a sweat.

### T4.1 — Fix getAllLogs selector performance
**File:** `ui/src/store/logs.ts`
**Fix:**
1. Create module-level empty array constant: `const EMPTY_LOGS: LogEntry[] = []`
2. Return `EMPTY_LOGS` instead of `[]`
3. Verify LogViewer uses `useMemo` for derived data
**Effort:** 15 min

### T4.2 — Fix ProcessTable full-map subscription
**File:** `ui/src/components/processes/ProcessTable.tsx`
**Fix:**
1. Derive `data` array only when Map size changes or processes added/removed
2. Track process count with a ref, don't re-derive on metric-only updates
3. Virtualizer already handles row-level memo
**Effort:** 30 min

### T4.3 — Fix persistence DELETE efficiency
**File:** `src/core/persistence/store.ts`
**Fix:**
1. Cleanup interval is already 5 min (verify)
2. Track `totalRows` with a counter
3. Only run DELETE when `totalRows > RETENTION_THRESHOLD`
**Effort:** 20 min

### T4.4 — Add SQLite WAL checkpoint after batch writes
**File:** `src/core/persistence/store.ts`
**Fix:**
1. After flushing, run `db.pragma('wal_checkpoint(TRUNCATE)')` every 50 flushes
2. Keeps WAL file bounded on high-write workloads
**Effort:** 15 min

### T4.5 — Add database migration system
**File:** `src/core/persistence/migrations.ts` (new)
**Fix:**
1. Create `schema_version` table
2. On startup, check current version
3. Run migration scripts for each version bump
4. Start with version 1 (current schema)
**Effort:** 1 hr

### T4.6 — Add WebSocket protocol versioning
**File:** `src/server.ts`, `ui/src/lib/ws.ts`
**Fix:**
1. Define `PROTOCOL_VERSION = 1` constant
2. Server sends welcome message on connect: `{ type: 'welcome', version: 1 }`
3. Client checks version, shows warning if incompatible
**Effort:** 45 min

### T4.7 — Add alert cooldown/debounce
**File:** `src/core/alerts/engine.ts`
**Fix:**
1. Add `cooldownMs?: number` to `AlertRule` (default: 60000)
2. Track `lastFiredAt: Map<string, number>`
3. Skip evaluation if within cooldown window
**Effort:** 45 min

### T4.8 — Add alert severity levels
**File:** `src/core/alerts/engine.ts`, `ui/src/types/alerts.ts`
**Fix:**
1. Add `severity: 'info' | 'warning' | 'critical'` to `AlertRule`
2. Pass severity through to `AlertEvent` and notifications
3. Color-code history entries in UI by severity
**Effort:** 30 min

### T4.9 — Improve PM2 daemon reconnect notification
**File:** `src/core/pm2/bridge.ts`
**Fix:**
1. On reconnect, emit a `'reconnect'` event to listeners
2. Pipeline broadcasts a special tick with `type: 'reconnect'`
3. Frontend shows toast: "PM2 daemon reconnected"
**Note:** Heartbeat already reduced to 15s in earlier work
**Effort:** 45 min

### T4.10 — Add self-monitoring
**File:** `src/core/system/metrics.ts`, `src/server.ts`
**Fix:**
1. Track PM2 Orbit's own process metrics (memory, CPU, uptime)
2. Expose at `/api/health` endpoint
3. Log warning when server memory exceeds 100MB
4. Track active WebSocket connections count
**Effort:** 45 min

---

## Phase 5 — Docker & Deployment

> Make it deployable anywhere.

### T5.1 — Add Dockerfile
**File:** `Dockerfile` (new)
**Action:**
1. Multi-stage build: node:22-alpine for build, node:22-alpine for runtime
2. Install only production dependencies
3. Expose port 9823
4. HEALTHCHECK instruction
5. Non-root user for security
**Effort:** 1 hr

### T5.2 — Add docker-compose.yml
**File:** `docker-compose.yml` (new)
**Action:**
1. Define service with volume mounts for `~/.pm2` and `~/.pm2-orbit`
2. Configurable ports and env vars
3. Restart policy: always
**Effort:** 30 min

### T5.3 — Add Docker CI workflow
**File:** `.github/workflows/docker.yml` (new)
**Action:**
1. Build and push Docker image to GitHub Container Registry on tag
2. Multi-arch build (linux/amd64, linux/arm64)
**Effort:** 1 hr

### T5.4 — Add .dockerignore
**File:** `.dockerignore` (new)
**Action:** Exclude `node_modules/`, `.git/`, `ui/node_modules/`, `test-servers/`
**Effort:** 5 min

---

## Phase 6 — Testing

> You can't ship production software without tests.

### T6.1 — Set up test infrastructure
**Files:** `vitest.config.ts` (verify exists), `tsconfig.json`
**Action:**
1. Ensure vitest config has path aliases matching `tsconfig.json`
2. Create `src/__tests__/` directory structure
3. Add `vitest` runner if missing
**Effort:** 30 min

### T6.2 — Unit tests: Alert Engine
**File:** `src/__tests__/alerts/engine.test.ts`
**Cases:**
- Rule with CPU > 80 fires when value is 90
- Rule with CPU > 80 does NOT fire when value is 70
- Cooldown prevents duplicate fires
- Global rules evaluate for all processes
- Per-process rules only evaluate for matching process
- Disabled rules are skipped
- History is capped at 50 entries
**Effort:** 2 hrs

### T6.3 — Unit tests: Circular Buffer
**File:** `src/__tests__/pm2/buffer.test.ts`
**Cases:**
- Push and read returns correct values
- Buffer wraps around correctly at size boundary
- Read returns empty array when empty
- BufferStore creates and retrieves per-process buffers
- BufferStore removes process buffer
**Effort:** 1 hr

### T6.4 — Unit tests: Settings encryption
**File:** `src/__tests__/persistence/settings.test.ts`
**Cases:**
- Settings round-trip: save → load returns same values
- Sensitive fields are encrypted on disk
- Encrypted fields are decrypted on load
- Missing settings file returns defaults
- `getSettingsSafe()` masks sensitive fields
**Effort:** 1 hr

### T6.5 — Unit tests: Validation utilities
**File:** `src/__tests__/utils/validate.test.ts`
**Cases:**
- `parseIdParam` returns number for valid input
- `parseIdParam` returns null for NaN, negative, empty
- `validateAlertRule` returns rule for valid input
- `validateAlertRule` returns null for missing/invalid fields
**Effort:** 30 min

### T6.6 — Unit tests: Formatters
**File:** `ui/src/__tests__/lib/format.test.ts`
**Cases:**
- `formatBytes(0)` returns "0 B"
- `formatBytes(1024)` returns "1 KB"
- `formatDuration(0)` returns "0s"
- `formatDuration(86400000)` returns "1d 0h"
- `formatPercent(50)` returns "50.0%"
**Effort:** 30 min

### T6.7 — Unit tests: WSClient
**File:** `ui/src/__tests__/lib/ws.test.ts`
**Cases:**
- Connect opens WebSocket
- Subscribe receives messages
- Disconnect cleans up listeners
- Reconnect schedules on close
- Exponential backoff caps at MAX_RECONNECT_DELAY
- Status listeners notified on state change
**Effort:** 1 hr

### T6.8 — Unit tests: Zustand stores
**File:** `ui/src/__tests__/store/processes.test.ts`
**Cases:**
- `applyDelta` adds new process
- `applyDelta` updates existing process
- `applyDelta` removes process
- `setAll` syncs full list
- `setAll` removes processes not in incoming list
- `select` / `getProcess` work correctly
**Effort:** 1 hr

### T6.9 — Integration tests: API routes
**File:** `src/__tests__/routes/api.test.ts`
**Cases:**
- GET /api/processes returns array
- POST /api/processes/:id/action with valid action succeeds
- POST /api/processes/:id/action with invalid action returns 400
- GET /api/health returns status object
- GET /api/ping returns "pong"
- GET /api/alerts returns rules array
- POST /api/alerts with valid rule succeeds
- POST /api/alerts with invalid rule returns 400
**Effort:** 3 hrs

### T6.10 — Integration tests: SSE log streaming
**File:** `src/__tests__/routes/logs.test.ts`
**Cases:**
- GET /api/logs/:id returns SSE stream
- SSE stream sends events
- SSE stream handles invalid process ID
- SSE stream closes on client disconnect
**Effort:** 2 hrs

### T6.11 — E2E tests: Critical user flow
**File:** `e2e/dashboard.spec.ts`
**Action:**
- Dashboard loads and shows system cards
- Process table displays processes
- Clicking a process opens detail panel
- Command palette opens with Ctrl+K
- Theme toggle works
**Effort:** 3 hrs

### T6.12 — Add bundle size check to CI
**File:** `.github/workflows/ci.yml`, `package.json`
**Action:**
1. Add `size-limit` dev dependency
2. Configure budgets: JS < 150KB, CSS < 30KB
3. Add CI step that fails if budget exceeded
**Effort:** 30 min

---

## Phase 7 — Feature Completion

> Fill in the gaps that users expect.

### T7.1 — Wire up custom metrics display
**Files:** `src/core/pm2/bridge.ts`, `ui/src/components/processes/ProcessDetail.tsx`
**Fix:**
1. Parse `data:*` events from PM2 bus, store in `processCache`
2. Expose in `ProcessSnapshot` as `customMetrics`
3. Add "Custom Metrics" tab in detail panel showing key-value pairs
**Effort:** 2 hrs

### T7.2 — Add process metadata to detail panel
**File:** `ui/src/components/processes/ProcessDetail.tsx`, `src/routes/processes.ts`
**Fix:**
1. Add `GET /api/processes/:id/meta` returning full PM2 env
2. Add "Metadata" tab showing: exec path, CWD, args, node version, log paths
3. Filter out sensitive system env vars
**Effort:** 1.5 hrs

### T7.3 — Add process status timeline
**Files:** `src/core/pm2/bridge.ts`, `ui/src/components/processes/ProcessDetail.tsx`
**Fix:**
1. Maintain `statusHistory` per process (capped at 100 entries)
2. Push on every status change
3. Show timeline view in detail panel
**Effort:** 2 hrs

### T7.4 — Add cluster worker visualization
**Files:** `ui/src/components/processes/ProcessDetail.tsx`, `src/routes/processes.ts`
**Fix:**
1. Add `GET /api/processes/:id/workers` using `pm2.describe(id)`
2. Show per-worker CPU/memory/status when process is in cluster mode
**Effort:** 2 hrs

### T7.5 — Add webhook test button
**Files:** `ui/src/pages/Settings.tsx`, `src/routes/health.ts`
**Fix:**
1. Add `POST /api/settings/test-webhook` endpoint
2. Send test payload to configured URL
3. Add "Test" button next to each webhook URL field
4. Show toast with result
**Effort:** 1 hr

### T7.6 — Add aggregate resource alerts
**Files:** `src/core/alerts/engine.ts`, `ui/src/types/alerts.ts`
**Fix:**
1. Add `scope: 'process' | 'system'` to `AlertRule`
2. Evaluate system-scoped rules against `SystemSnapshot`
3. UI shows scope in rule form
**Effort:** 1.5 hrs

### T7.7 — Add process search persistence
**Files:** `ui/src/store/ui.ts`
**Fix:**
1. Persist `searchQuery` to `localStorage`
2. Restore on app mount
3. Clear on explicit user action
**Effort:** 15 min

### T7.8 — Add resizable detail panel
**Files:** `ui/src/components/processes/ProcessDetail.tsx`
**Fix:**
1. Drag handle on left edge of detail panel
2. Track width in state with mousedown/mousemove/mouseup
3. Persist width to localStorage (min: 300px, max: 60% viewport)
**Effort:** 1.5 hrs

### T7.9 — Add process grouping
**Files:** `ui/src/components/processes/ProcessTable.tsx`
**Fix:**
1. Add group-by dropdown: None, Status, Mode, Name prefix
2. Group rows with headers showing count and aggregate metrics
3. Allow collapsing/expanding groups
**Effort:** 2 hrs

### T7.10 — Add export/import settings
**Files:** `ui/src/pages/Settings.tsx`, `src/routes/health.ts`
**Fix:**
1. Add `GET /api/settings/export` and `POST /api/settings/import`
2. Export/Import buttons in Settings page
3. Download as `.json` file
**Effort:** 1 hr

### T7.11 — Add process log download from detail panel
**Files:** `ui/src/components/processes/ProcessDetail.tsx`
**Fix:**
1. Add "Download Logs" button in detail panel header
2. Collect buffer from SSE endpoint, trigger download
**Effort:** 30 min

### T7.12 — Add process notes/tags
**Files:** `src/core/persistence/store.ts`, `ui/src/components/processes/ProcessDetail.tsx`
**Fix:**
1. Add `process_notes` table in SQLite (or in-memory store)
2. Add `PUT /api/processes/:id/notes` endpoint
3. Add notes/tags input in detail panel
**Effort:** 1.5 hrs

---

## Phase 8 — Accessibility

> Make it usable by everyone.

### T8.1 — Add ARIA roles to all shared components
**Files:** `ui/src/components/shared/Tabs.tsx`, `Dialog.tsx`, `Dropdown.tsx`
**Fix:**
- `role="tablist"`, `role="tab"`, `aria-selected` on Tabs
- `role="dialog"`, `aria-modal`, `aria-labelledby` on Dialog
- Verify Dropdown already has `role="menu"` and `aria-expanded`
**Effort:** 1 hr

### T8.2 — Add keyboard navigation to process table
**File:** `ui/src/components/processes/ProcessTable.tsx`
**Fix:**
- Arrow up/down to navigate rows
- Enter to select, Escape to deselect
- `aria-rowindex` and `aria-rowcount`
**Effort:** 1 hr

### T8.3 — Add focus visible styles
**File:** `ui/src/styles/globals.css`
**Fix:**
- Ensure all interactive elements have visible focus rings
- Use `focus-visible` for keyboard-only focus indicators
**Effort:** 30 min

### T8.4 — Add skip navigation link
**File:** `ui/src/components/layout/AppShell.tsx`
**Fix:**
- Hidden "Skip to main content" link, visible on focus
- Links to `<main>` element
**Effort:** 15 min

### T8.5 — Add live region for status updates
**File:** `ui/src/components/layout/StatusBar.tsx`
**Fix:**
- `aria-live="polite"` on status bar
- Announce connection status and process count changes
**Effort:** 15 min

### T8.6 — Run axe-core audit
**File:** `ui/src/__tests__/a11y.test.ts`
**Fix:**
1. Add `@axe-core/react` dev dependency
2. Create automated a11y test for each page
3. Fix any violations found
4. Add to CI pipeline
**Effort:** 2 hrs

---

## Phase 9 — UI Polish

> Make it look and feel professional.

### T9.1 — Add loading skeletons
**File:** `ui/src/components/shared/Skeleton.tsx` (new)
**Fix:**
1. Create `Skeleton` component with pulse animation
2. Add skeleton states to: SystemCards, ProcessTable, History charts, Settings
**Effort:** 1.5 hrs

### T9.2 — Add theme transition
**File:** `ui/src/styles/globals.css`
**Fix:**
```css
@media (prefers-reduced-motion: no-preference) {
  *, *::before, *::after {
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  }
}
```
**Effort:** 15 min

### T9.3 — Add process status badges with animation
**File:** `ui/src/components/processes/ProcessRow.tsx`
**Fix:**
- Pulse animation for online status (verify existing)
- Smooth color transition on status change
**Effort:** 30 min

### T9.4 — Verify empty states use shared EmptyState component
**Files:** All pages
**Fix:**
- Dashboard, Logs, Alerts, History pages all use `EmptyState` component
- Consistent icon + message + optional CTA
**Effort:** 30 min

### T9.5 — Add responsive breakpoints
**Files:** All components
**Fix:**
- Mobile (< 640px): Stack cards, hide detail panel, full-width table
- Tablet (640-1024px): 3-column cards, side detail panel
- Desktop (> 1024px): 6-column cards, resizable detail panel
**Effort:** 2 hrs

### T9.6 — Add favicon
**File:** `ui/public/favicon.svg` (new)
**Fix:**
1. Create SVG favicon with PM2 Orbit logo
2. Add apple-touch-icon for mobile
**Effort:** 30 min

### T9.7 — Add meta tags
**File:** `ui/index.html`
**Fix:**
- `<meta name="description">`, `<meta name="theme-color">`
- Open Graph and Twitter card tags
**Effort:** 15 min

### T9.8 — Add toast notifications for all actions
**Files:** `ui/src/components/processes/ActionMenu.tsx`, `ProcessRow.tsx`, `ui/src/pages/Settings.tsx`
**Fix:**
- Verify ActionMenu already has toasts
- Add to ProcessRow quick actions (restart, stop, start)
- Add to settings save
- Add to alert rule creation/deletion
**Effort:** 30 min

---

## Phase 10 — Documentation

> Make it self-documenting.

### T10.1 — Add CONTRIBUTING.md
**File:** `CONTRIBUTING.md` (new)
**Action:**
- Development setup (clone, install, dev mode)
- Architecture overview (backend/frontend structure)
- Coding conventions
- PR process and review checklist
**Effort:** 1 hr

### T10.2 — Add CHANGELOG.md
**File:** `CHANGELOG.md` (new)
**Action:**
- Document all features from v0.1.0
- Follow Keep a Changelog format
**Effort:** 1 hr

### T10.3 — Update README.md
**File:** `README.md` (update)
**Action:**
1. Badges (CI, npm version, license)
2. Quick start (`npx pm2-orbit`)
3. Features list with screenshots
4. Installation options
5. Configuration (env vars, CLI flags)
6. Development setup
7. Contributing link
**Effort:** 2 hrs

### T10.4 — Add API documentation
**File:** `docs/api.md` (new)
**Action:**
1. Document all REST endpoints with request/response examples
2. Document WebSocket protocol (tick format, events)
3. Document SSE log stream format
**Effort:** 2 hrs

### T10.5 — Add architecture documentation
**File:** `docs/architecture.md` (new)
**Action:**
1. Mermaid diagram of data flow
2. Component relationship diagram
3. State management explanation
4. Event bus architecture
**Effort:** 1 hr

### T10.6 — Add JSDoc to all exported functions
**Files:** All `src/` files
**Action:**
- Add JSDoc to exported functions, interfaces, types
- Include `@param`, `@returns`, `@example` tags
**Effort:** 3 hrs

---

## Phase 11 — Final Validation

> Verify everything works before shipping.

### T11.1 — Run full test suite
**Action:**
1. `npm run lint` — fix all TypeScript errors
2. `npm run typecheck` — fix all type errors
3. `npm run test` — all tests pass
4. `npm run build` — both server and UI build succeed
**Effort:** 2 hrs

### T11.2 — Manual testing checklist
**Action:**
- [ ] `npx pm2-orbit` starts without errors
- [ ] Dashboard shows system cards with live data
- [ ] Process table shows PM2 processes
- [ ] Detail panel opens and shows process info
- [ ] Process actions (restart, stop, start) work
- [ ] Bulk actions with confirmation work
- [ ] Log viewer shows live logs with search/filter
- [ ] Alert rules can be created, edited, deleted
- [ ] History page shows charts with time range selection
- [ ] Settings page saves and loads
- [ ] Theme toggle works (dark/light/system)
- [ ] Command palette opens with Ctrl+K
- [ ] Keyboardshortcuts work (1-5 tabs, R/S/T)
- [ ] Connection dot reflects WS status
- [ ] Error states render on API failure
- [ ] Empty states render when no data
- [ ] Error boundary catches crashes
- [ ] Graceful shutdown on Ctrl+C
- [ ] Docker container starts and is accessible
**Effort:** 3 hrs

### T11.3 — Performance validation
**Action:**
1. Start with 100+ PM2 processes
2. Dashboard opens in < 2s
3. 60fps process table updates
4. WS tick latency < 5ms
5. Server RAM < 60MB with 1000 processes
6. Frontend bundle < 150KB gzipped
7. Docker image < 150MB
**Effort:** 2 hrs

### T11.4 — Security audit
**Action:**
1. Run `npm audit` — fix all vulnerabilities
2. Test auth token enforcement
3. Test WS rate limiting
4. Test input validation on all endpoints
5. Test path traversal (process names with `../`)
6. Test XSS (process names with `<script>`)
**Effort:** 2 hrs

### T11.5 — Cross-browser testing
**Action:**
- Chrome, Firefox, Safari, Edge (latest desktop)
- Mobile Safari (iOS)
- Mobile Chrome (Android)
**Effort:** 2 hrs

### T11.6 — Create v1.0.0 release
**Action:**
1. Update version to `1.0.0` in `package.json`
2. Update CHANGELOG.md
3. Create git tag `v1.0.0`
4. Push to GitHub
5. Create GitHub Release
6. Publish to npm
**Effort:** 30 min

---

## Implementation Timeline

| Phase | Tasks | Hours | Dependencies |
|-------|-------|-------|--------------|
| **Phase 0** — Foundation | T0.1-T0.7 | 3h | None |
| **Phase 1** — Error States | T1.1-T1.5 | 4h | Phase 0 |
| **Phase 2** — Critical Bugs | T2.1-T2.6 | 4h | Phase 1 |
| **Phase 3** — Security | T3.1-T3.4 | 5h | Phase 2 |
| **Phase 4** — Performance | T4.1-T4.10 | 6h | Phase 2 |
| **Phase 5** — Docker | T5.1-T5.4 | 3h | Phase 0 |
| **Phase 6** — Testing | T6.1-T6.12 | 14h | Phase 2-4 |
| **Phase 7** — Features | T7.1-T7.12 | 15h | Phase 2-4 |
| **Phase 8** — A11y | T8.1-T8.6 | 5h | Phase 7 |
| **Phase 9** — UI Polish | T9.1-T9.8 | 6h | Phase 7 |
| **Phase 10** — Docs | T10.1-T10.6 | 10h | Phase 7 |
| **Phase 11** — Validation | T11.1-T11.6 | 11h | All |
| **TOTAL** | **67 tasks** | **~90h** | |

## Critical Path

```
Phase 0 (3h)
  └─→ Phase 1 (4h)
       └─→ Phase 2 (4h)
            ├─→ Phase 3 (5h)
            ├─→ Phase 4 (6h)
            └─→ Phase 6 (14h) ─→ Phase 11 (11h)
                 Phase 7 (15h) ─→ Phase 8 (5h)
                                ─→ Phase 9 (6h)
                                ─→ Phase 10 (10h)

Phase 5 (3h) — can run in parallel with anything
```

**Estimated total with parallelism: ~55-65 hours of focused work**

---

## Key Changes from Original Plan

| Change | Reason |
|--------|--------|
| Phase 0 merged with OS infra | CI must exist before any code changes |
| New Phase 1: Error/Empty states | Every API failure shows a blank page — fixes usability before features |
| T2.1 (path sanitization) moved to Phase 2 | Security fix is critical, not optional |
| New T2.6: Log buffer memory leak | Process deletions accumulate stale data forever |
| New T4.10: Self-monitoring | Can't manage production without knowing server health |
| New Phase 5: Docker | Container deployment is table stakes |
| T1.5 (ConnectionDot) removed | Already fixed in earlier work |
| T3.10 heartbeat reduced | Already done (15s) |
| T8.5 empty states merged into Phase 1 | Duplicated with T1.2 |
| All estimates adjusted | Based on real implementation experience |
