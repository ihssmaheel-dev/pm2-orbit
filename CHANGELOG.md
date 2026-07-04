# Changelog

All notable changes to PM2 Orbit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.4.0] - 2026-07-04

### Fixed
- **Status metric never fires** — Pipeline now passes process status to alert evaluation
- **PUT update has zero validation** — Added field type and value validation on alert rule updates
- **processName not sent on edit** — AlertForm now includes process name in edit requests
- **Clear History only clears client state** — Added `DELETE /api/alerts/history` server endpoint

### Added
- **Alert duration evaluation** — Sustained condition check: alerts only fire after condition holds for N seconds
- **Cooldown field in UI** — Configurable cooldown per rule (default 60s)
- **Duration field in UI** — Configurable sustained duration per rule
- **History persistence to disk** — Alert history saved to `~/.pm2-orbit/alerts-history.json`, survives restarts
- **History cap 200** — Increased from 50 to 200 events with `truncated` flag in API response
- **Monotonic log IDs** — Each log entry gets unique ID for SSE diff stability and React key uniqueness

## [1.3.3] - 2026-07-04

### Fixed
- **SSE diff stall** — Replaced buffer length tracking with monotonic counter to prevent log stream from stalling after buffer trim
- **React key collisions** — Added unique monotonic IDs to log entries to prevent garbled display at high throughput
- **Auto-scroll on process select** — Logs now scroll to bottom when selecting a process
- **Virtualizer key stability** — Removed index from React keys to prevent unnecessary remounts

### Changed
- Log buffer reduced to 1000 per process for stable virtualizer rendering
- Scroll handler throttled via requestAnimationFrame
- SSE errors now logged instead of silently swallowed

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
- Removed better-sqlite3 from dependencies (requires native compilation without Python)
- Server now uses in-memory history fallback gracefully
- Bin script no longer tries to auto-install better-sqlite3
- Store catches require errors properly

### Changed
- System fonts instead of self-hosted Exo/JetBrains Mono (smaller package)
- Moved pm2 to peerDependencies (skips ~100 packages on install)
- Package size reduced to 731 KB packed, 466 packages

## [1.3.0] - 2026-07-03

### Added
- Alert rule editing with pre-filled form and server persistence
- Alert rule enable/disable toggle in table
- Scale controls dialog for cluster-mode processes
- Process-specific alert rules (target individual processes)
- Disk usage percentage in system metrics cards
- History retention and log buffer size settings in UI
- CSV export for process list
- Real-time chart updates via WebSocket system metrics
- Test suite with 28 unit tests (alert engine, buffer, validation)
- Alert cooldown (60s) to prevent notification spam
- Alert severity levels (info, warning, critical)
- Aggregate system resource alerts
- WebSocket authentication support
- API documentation
- CHANGELOG.md

### Fixed
- Alert rule editing now persists to server (was only local state)
- Dialog button text changes to "Update Rule" when editing
- X-axis removed from charts (Now/Peak stats in header suffice)
- Chart real-time data debouncing prevents duplicate/zigzag lines
- Alert evaluation in 2s tick interval (was missing system alerts)
- Consistent headers across Logs, Alerts, History, Settings pages
- Alert action buttons always visible (no hover required)
- History table redesigned with wider threshold column
- Duplicate code cleanup in History page

### Changed
- Removed auto-token auth system (was causing 401 errors)
- Reverted to token-in-Settings approach for auth

### Added
- **PWA support** — Install PM2 Orbit as a standalone app from your browser
- **Alert severity levels** — Info, Warning, Critical with visual indicators
- **Aggregate system alerts** — Alert on total CPU, memory, load (not just per-process)
- **Webhook test button** — Verify Slack, Discord, and webhook URLs before saving
- **Alert cooldown** — 60-second cooldown per rule to prevent notification spam
- **PM2 reconnect notification** — Toast when daemon recovers from disconnection
- **Search persistence** — Process search query saved across sessions
- **Export/import settings** — Backup and restore configuration as JSON
- **Responsive layout** — Mobile-friendly table with hidden columns on small screens
- **Toast notifications** — Feedback on all process actions (restart, stop, start, delete)
- **Keyboard navigation** — Arrow keys, j/k, Enter in process table
- **Skip navigation** — Accessible skip-to-content link for keyboard users
- **Live region** — Screen reader announcements for connection status
- **ARIA roles** — Tabs, Dialog, and interactive components
- **Focus visible styles** — Clear keyboard focus indicators
- **Theme transition** — Smooth 150ms color transition on theme switch
- **Meta tags** — Open Graph and Twitter card metadata
- **PR template** — GitHub pull request checklist
- **API documentation** — Complete REST and WebSocket reference
- **CHANGELOG.md** — Version history documentation

### Fixed
- **ProcessRow re-render cascade** — 60% fewer re-renders via shallow comparison
- **PowerShell execSync** — Async execution prevents 3s event loop freezes on Windows
- **PM2 stale reconciliation** — Single IPC call instead of N parallel calls
- **Log buffer memory leak** — Cleaned up for removed processes
- **Fastify 5 compatibility** — All plugins upgraded to v9+
- **Button visibility** — Brighter text and better hover states

### Changed
- SQLite WAL checkpoint every 50 flushes for better performance
- Responsive breakpoints for mobile/tablet layouts
- Notification bell now navigates to alerts history

## [1.0.6] - 2026-07-03

### Added
- Alert cooldown (60s default) to prevent notification spam
- PM2 reconnect toast notification when daemon recovers
- Webhook test button in Settings for Slack, Discord, and generic webhooks
- Search query persistence across sessions (localStorage)
- Alert severity levels (info, warning, critical)
- Aggregate system resource alerts (CPU, memory, load)
- ARIA roles on Tabs, Dialog components
- Keyboard navigation in process table (Arrow keys, j/k, Enter)
- Focus visible styles for accessibility
- Skip navigation link for keyboard users
- Live region for connection status announcements
- Smooth color transitions for process status changes
- Toast notifications for all process actions
- Theme CSS transition (150ms)
- Open Graph and Twitter card meta tags
- PR template
- .dockerignore
- SQLite WAL checkpoint every 50 flushes

### Fixed
- ProcessRow re-render cascade (60% fewer re-renders)
- PowerShell execSync blocking event loop on Windows
- PM2 stale process reconciliation (single IPC call instead of N)
- Log buffer memory leak for removed processes
- Button text visibility in process table

### Changed
- Upgraded all Fastify plugins to v9+ for Fastify 5 compatibility
- Responsive breakpoints for mobile/tablet layouts

## [1.0.5] - 2026-07-02

### Added
- PWA support — installable as standalone app
- Service worker for offline static asset caching
- GitHub logo link in header
- Notification bell navigates to alerts history

## [1.0.4] - 2026-07-02

### Fixed
- Updated all Fastify plugins for Fastify 5 compatibility
- Regenerated lockfile with correct dependency versions

## [1.0.3] - 2026-07-02

### Fixed
- Rebuilt with @fastify/helmet v13 for Fastify 5

## [1.0.2] - 2026-07-02

### Fixed
- Upgraded @fastify/helmet to v13 for Fastify 5 compatibility

## [1.0.1] - 2026-07-02

### Added
- Auto-install PM2 and better-sqlite3 on first run
- CLI improvements (host flag, colored output)

## [1.0.0] - 2026-07-02

### Features
- Event-driven PM2 monitoring via `pm2.launchBus()`
- Real-time process table with virtual scrolling (1000+ processes)
- Per-process CPU/memory sparklines with 120-point history
- Live log viewer with ANSI stripping and regex search
- System metrics: CPU, memory, load, network, disk I/O
- Historical charts with 1h / 6h / 24h time ranges
- Alert engine with multi-channel notifications (Slack, Discord, webhook, email)
- Dark / Light / System theme
- Command palette (Ctrl+K)
- Keyboard shortcuts
- Docker support
- Export/import settings
