# PM2 Orbit — Progress Status

**Total:** 67 tasks · **Done:** 13 · **Pending:** 54 · **Progress:** 19%

---

## Phase 0 — Foundation & Open Source Infra

- [x] T0.1 — Add LICENSE file
- [x] T0.2 — Add .npmignore
- [x] T0.3 — Add files field to package.json
- [ ] T0.4 — Add GitHub Actions CI
- [x] T0.5 — Add .editorconfig
- [ ] T0.6 — Add issue templates
- [ ] T0.7 — Add PR template

## Phase 1 — Error & Empty States

- [ ] T1.1 — Create shared ErrorState component
- [x] T1.2 — Add error/empty states to all pages
- [x] T1.3 — Wrap each page in ErrorBoundary
- [ ] T1.4 — Add root ErrorBoundary logging
- [x] T1.5 — Add global toast on API errors

## Phase 2 — Critical Bug Fixes

- [x] T2.1 — Fix notification pipeline (per-rule channels + global toggles)
- [x] T2.2 — Fix LogViewer SSE reconnection storm
- [x] T2.3 — Fix alert store never fetching from server
- [x] T2.4 — Add confirmation dialogs for bulk actions
- [x] T2.5 — Sanitize process names in file paths
- [ ] T2.6 — Fix memory leak in log buffers

## Phase 3 — Security

- [x] T3.1 — Add input validation to all API routes
- [ ] T3.2 — Rate limit WebSocket connections
- [ ] T3.3 — Add configurable CORS
- [ ] T3.4 — Add structured logging

## Phase 4 — Performance

- [ ] T4.1 — Fix getAllLogs selector performance
- [ ] T4.2 — Fix ProcessTable full-map subscription
- [ ] T4.3 — Fix persistence DELETE efficiency
- [ ] T4.4 — Add SQLite WAL checkpoint after batch writes
- [ ] T4.5 — Add database migration system
- [ ] T4.6 — Add WebSocket protocol versioning
- [ ] T4.7 — Add alert cooldown/debounce
- [ ] T4.8 — Add alert severity levels
- [ ] T4.9 — Improve PM2 daemon reconnect notification
- [ ] T4.10 — Add self-monitoring

## Phase 5 — Docker & Deployment

- [ ] T5.1 — Add Dockerfile
- [ ] T5.2 — Add docker-compose.yml
- [ ] T5.3 — Add Docker CI workflow
- [ ] T5.4 — Add .dockerignore

## Phase 6 — Testing

- [ ] T6.1 — Set up test infrastructure
- [ ] T6.2 — Unit tests: Alert Engine
- [ ] T6.3 — Unit tests: Circular Buffer
- [ ] T6.4 — Unit tests: Settings encryption
- [ ] T6.5 — Unit tests: Validation utilities
- [ ] T6.6 — Unit tests: Formatters
- [ ] T6.7 — Unit tests: WSClient
- [ ] T6.8 — Unit tests: Zustand stores
- [ ] T6.9 — Integration tests: API routes
- [ ] T6.10 — Integration tests: SSE log streaming
- [ ] T6.11 — E2E tests: Critical user flow
- [ ] T6.12 — Add bundle size check to CI

## Phase 7 — Feature Completion

- [ ] T7.1 — Wire up custom metrics display
- [ ] T7.2 — Add process metadata to detail panel
- [ ] T7.3 — Add process status timeline
- [ ] T7.4 — Add cluster worker visualization
- [ ] T7.5 — Add webhook test button
- [ ] T7.6 — Add aggregate resource alerts
- [ ] T7.7 — Add process search persistence
- [ ] T7.8 — Add resizable detail panel
- [ ] T7.9 — Add process grouping
- [ ] T7.10 — Add export/import settings
- [ ] T7.11 — Add process log download from detail panel
- [ ] T7.12 — Add process notes/tags

## Phase 8 — Accessibility

- [ ] T8.1 — Add ARIA roles to all shared components
- [ ] T8.2 — Add keyboard navigation to process table
- [ ] T8.3 — Add focus visible styles
- [ ] T8.4 — Add skip navigation link
- [ ] T8.5 — Add live region for status updates
- [ ] T8.6 — Run axe-core audit

## Phase 9 — UI Polish

- [ ] T9.1 — Add loading skeletons
- [ ] T9.2 — Add theme transition
- [ ] T9.3 — Add process status badges with animation
- [ ] T9.4 — Verify empty states use shared EmptyState component
- [ ] T9.5 — Add responsive breakpoints
- [ ] T9.6 — Add favicon
- [ ] T9.7 — Add meta tags
- [ ] T9.8 — Add toast notifications for all actions

## Phase 10 — Documentation

- [ ] T10.1 — Add CONTRIBUTING.md
- [ ] T10.2 — Add CHANGELOG.md
- [ ] T10.3 — Update README.md
- [ ] T10.4 — Add API documentation
- [ ] T10.5 — Add architecture documentation
- [ ] T10.6 — Add JSDoc to all exported functions

## Phase 11 — Final Validation

- [ ] T11.1 — Run full test suite
- [ ] T11.2 — Manual testing checklist
- [ ] T11.3 — Performance validation
- [ ] T11.4 — Security audit
- [ ] T11.5 — Cross-browser testing
- [ ] T11.6 — Create v1.0.0 release
