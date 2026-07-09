# Changelog

All notable changes to PM2 Orbit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.10.0] - 2026-07-08

### Added
- **Historical log loading** — When connecting, the last 100 log lines per process are read from PM2's log files (`~/.pm2/logs/`) and displayed immediately, so you see past logs even if pm2-orbit started after PM2
- **PM2 log file reader** — Reads `*-out.log` and `*-err.log` files, strips ANSI codes, interleaves stdout/stderr in order
- **Historical logs in SSE stream** — Initial SSE connection sends historical logs before streaming new ones
- **Historical logs in REST endpoint** — `/api/logs/history` supplements in-memory buffer with PM2 file logs when buffer is small

## [1.9.2] - 2026-07-08

### Fixed
- **Env API called infinitely** — useEffect dependency changed from process object reference to process.id, preventing re-fetch on every 2s full sync tick

## [1.9.1] - 2026-07-08

### Fixed
- **Uptime bar shows no data** — Processes now record their initial status on first discovery, so the uptime bar shows data immediately

## [1.9.0] - 2026-07-08

### Added
- **Uptime/downtime visualization** — Color-coded horizontal timeline bar showing process status history (green=online, gray=stopped, red=errored, yellow=launching)
- **Uptime percentage** — Calculated from status history, color-coded (green >=99%, yellow >=95%, red <95%)
- **Hover tooltips** — Hover any segment to see status, start time, and duration
- **Status legend** — Color key below the bar
- **Status history tracking** — Server tracks status changes in a 200-entry ring buffer per process

## [1.8.0] - 2026-07-08

### Added
- **Process notes** — Add text annotations to processes explaining what they do and who owns them
- **Note persistence** — Notes saved to `~/.pm2-orbit/notes.json`, survive server restarts
- **Note indicator in process table** — FileText icon appears next to process names with notes
- **Note editor in detail panel** — Click-to-edit textarea in the Overview tab with save/cancel/delete
- **Note API** — `GET /api/notes`, `PUT /api/notes/:processName`, `DELETE /api/notes/:processName`

## [1.7.4] - 2026-07-08

### Fixed
- **Service worker crash** — SW catch handler now always returns a valid Response object. Cache version bumped to v2

## [1.7.3] - 2026-07-08

### Added
- **User-friendly startup banner** — Shows auth status with masked token, LAN access URL, security warnings, and how to pass the token

## [1.7.2] - 2026-07-08

### Fixed
- **Auth blocks localhost connections** — HTTP and WebSocket auth now allow connections from 127.0.0.1/::1 without token

## [1.7.1] - 2026-07-08

### Fixed
- **Auth blocks static assets** — Exempted /assets/*, favicon, sw.js, manifest.json, and .well-known from token auth
- **Dev mode auth** — Auth hook skipped when running via Vite dev server

## [1.7.0] - 2026-07-06

### Security
- **Auth token enforcement** — Auth hook validates Bearer token and query param when PM2_ORBIT_TOKEN is set. WebSocket upgrade also checks token
- **SSRF protection** — Test-webhook validates URL protocol, blocks internal/private IPs, adds 10s timeout
- **PM2 action timeout** — Actions (restart/stop/start/delete) time out after 15s
- **Notification webhook timeout** — All webhook/Slack/Discord fetch calls have 10s timeout

### Fixed
- **Duplicate Cooldown/Duration fields** — Removed second set of fields in AlertForm
- **AlertHistory index keys** — Changed from `key={i}` to `key={ts-i}` for stable rendering

## [1.6.5] - 2026-07-06

### Fixed
- **Infinite tag API calls** — Tag fetch runs exactly once on startup via ref guard, then re-applies locally after each full sync

## [1.6.4] - 2026-07-06

### Fixed
- **Duplicate tag API calls** — Single fetch point in useWebSocket, removed redundant calls from ProcessTable and TagManager

## [1.6.3] - 2026-07-06

### Fixed
- **Tags persist on refresh** — Client fetches tag assignments from server and merges them into process snapshots locally, eliminating server enrichment race condition

## [1.6.2] - 2026-07-06

### Fixed
- **Tags disappear on refresh** — fetchTags runs on WebSocket full sync
- **Color picker overflow** — Replaced absolute-positioned dropdown with inline grid
- **Tag assignment menu clipping** — Removed overflow-hidden from name cell
- **Immediate tag reflection** — Tags update instantly in UI after assignment

## [1.6.1] - 2026-07-06

### Fixed
- **Tag assignment not reflecting in UI** — Tags update instantly in process store after assignment
- **Tag filter not working** — Fixed process snapshot merging losing tags on delta updates
- **TagManager UI** — Redesigned with inline color picker, cleaner layout

### Changed
- Tag assignment menu stays open after toggling (allows multiple assignments)
- Up to 3 tag color dots shown on process name

## [1.6.0] - 2026-07-06

### Added
- **Process tagging** — Create color-coded tags, assign to processes, filter by tag
- **Tag management UI** — Create/edit/delete tags with 8-color palette picker
- **Tag filter chips** — Click tag chips in process table toolbar to filter
- **Tag-aware bulk actions** — Restart/Stop/Start/Delete All target only filtered processes when tag filter is active
- **Tag persistence** — Tags and assignments stored in `~/.pm2-orbit/tags.json`

## [1.5.4] - 2026-07-06

### Fixed
- **Helmet headers blocking remote access** — Disabled CSP, COEP, COOP, CORP, and Origin-Agent-Cluster headers for remote access

## [1.5.3] - 2026-07-05

### Fixed
- **Logs repeating on reconnect** — SSE no longer dumps full buffer on connect

## [1.5.2] - 2026-07-05

### Fixed
- **Processes vanish on restart** — Removed exit-based cache eviction. Delete action now emits remove event directly

## [1.5.0] - 2026-07-05

### Fixed
- **Delete All shows wrong count** — Confirm dialog shows actual process count
- **Delete All 10s UI delay** — Bridge emits 'remove' event on process exit
- **Start action calls restart()** — Fixed to use pm2.start()
- **No progress indicator on bulk ops** — Buttons show "done/total" counter with spinning icon

## [1.4.5] - 2026-07-05

### Fixed
- **Logs appearing twice** — Removed redundant PM2 bus wildcard listener
- **SSE diff stall after buffer trim** — Capped effective count to prevent re-sending entire buffer
- **Auto-scroll on process select** — Logs reliably scroll to bottom (100ms delay)

### Changed
- Removed unused REST `/api/logs/history` endpoint

## [1.4.1] - 2026-07-04

### Fixed
- **Status metric never fires** — Pipeline now passes process status to alert evaluation
- **PUT update has zero validation** — Added field type and value validation
- **processName not sent on edit** — AlertForm includes process name in edit requests
- **Clear History only clears client state** — Added `DELETE /api/alerts/history` server endpoint

### Added
- **Alert duration evaluation** — Sustained condition check
- **Cooldown field in UI** — Configurable per rule
- **Duration field in UI** — Configurable per rule
- **History persistence to disk** — Alert history saved to `~/.pm2-orbit/alerts-history.json`
- **History cap 200** — Increased from 50 with `truncated` flag
- **Monotonic log IDs** — Unique ID per log entry for SSE diff stability

## [1.3.3] - 2026-07-04

### Fixed
- **SSE diff stall** — Monotonic counter instead of buffer length tracking
- **React key collisions** — Unique monotonic IDs prevent garbled display
- **Auto-scroll on process select** — Logs scroll to bottom
- **Virtualizer key stability** — Removed index from React keys

### Changed
- Log buffer reduced to 1000 per process
- Scroll handler throttled via requestAnimationFrame
- SSE errors logged instead of silently swallowed

## [1.3.2] - 2026-07-04

### Added
- Click log line to view full message in dialog with copy button
- CSP allows inline scripts for theme initialization
- CORS accepts all origins when running with `--host` flag

### Fixed
- CSP blocking inline scripts on remote access
- CORS rejecting requests from non-localhost origins

## [1.3.1] - 2026-07-03

### Fixed
- Removed better-sqlite3 from dependencies (requires native compilation)
- Server uses in-memory history fallback gracefully

### Changed
- System fonts instead of self-hosted Exo/JetBrains Mono
- Moved pm2 to peerDependencies
- Package size reduced to 731 KB packed

## [1.3.0] - 2026-07-03

### Added
- Alert rule editing with pre-filled form and server persistence
- Alert rule enable/disable toggle
- Scale controls for cluster-mode processes
- Process-specific alert rules
- Disk usage percentage in system cards
- CSV export for process list
- Real-time chart updates via WebSocket
- Alert cooldown (60s) and severity levels
- Aggregate system resource alerts
- PWA support
- Command palette (Ctrl+K)
- Keyboard shortcuts
- API documentation

### Fixed
- Alert rule editing now persists to server
- X-axis removed from charts
- Chart real-time data debouncing
- Alert evaluation in 2s tick interval
- Consistent headers across pages
- ProcessRow re-render cascade (60% fewer re-renders)
- PowerShell execSync blocking event loop
- PM2 stale reconciliation (single IPC call)

### Changed
- Removed auto-token auth system
- SQLite WAL checkpoint every 50 flushes

## [1.0.6] - 2026-07-03

### Added
- Alert cooldown, severity levels, aggregate alerts
- Webhook test button in Settings
- Search query persistence
- Toast notifications for process actions
- ARIA roles, keyboard navigation, focus styles

### Fixed
- ProcessRow re-render cascade
- PowerShell execSync blocking event loop
- PM2 stale reconciliation
- Log buffer memory leak

## [1.0.5] - 2026-07-02

### Added
- PWA support
- Service worker for offline static asset caching

## [1.0.4] - 2026-07-02

### Fixed
- Fastify 5 plugin compatibility

## [1.0.3] - 2026-07-02

### Fixed
- @fastify/helmet v13 rebuild

## [1.0.2] - 2026-07-02

### Fixed
- @fastify/helmet v13 upgrade

## [1.0.1] - 2026-07-02

### Added
- Auto-install PM2 and better-sqlite3 on first run
- CLI improvements (host flag, colored output)

## [1.0.0] - 2026-07-02

### Features
- Event-driven PM2 monitoring via `pm2.launchBus()`
- Real-time process table with virtual scrolling (1000+ processes)
- Per-process CPU/memory sparklines
- Live log viewer with ANSI stripping and regex search
- System metrics: CPU, memory, load, network, disk I/O
- Historical charts with 1h / 6h / 24h time ranges
- Alert engine with multi-channel notifications
- Dark / Light / System theme
- Command palette, keyboard shortcuts
- Docker support
- Export/import settings
