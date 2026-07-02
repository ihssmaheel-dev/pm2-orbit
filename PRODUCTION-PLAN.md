# PM2 Orbit — Production-Grade Master Plan

**Goal:** Transform PM2 Orbit from prototype to production-grade open source PM2 monitoring dashboard.
**Total Tasks:** 67 | **Completed:** 17 | **Remaining:** 50 | **Estimated Effort:** ~70h

---

## Phase 0 — Foundation & Open Source Infra

### T0.1 — Add LICENSE file ✅
### T0.2 — Add .npmignore ✅
### T0.3 — Add files field to package.json ✅
### T0.4 — Add GitHub Actions CI ❌ → `.github/workflows/ci.yml` (1h)
### T0.5 — Add .editorconfig ✅
### T0.6 — Add issue templates ❌ → `.github/ISSUE_TEMPLATE/` (30min)
### T0.7 — Add PR template ❌ → `.github/pull_request_template.md` (15min)

---

## Phase 1 — Error & Empty States

### T1.1 — Create shared ErrorState component ❌ → `ui/src/components/shared/ErrorState.tsx` (30min)
### T1.2 — Add error states to LogViewer SSE ❌ (1h)
### T1.3 — Wrap each page in ErrorBoundary ✅
### T1.4 — Add root ErrorBoundary logging ✅
### T1.5 — Add global toast on API errors ✅

---

## Phase 2 — Critical Bug Fixes

### T2.1 — Fix notification pipeline ✅
### T2.2 — Fix LogViewer SSE reconnection storm ✅
### T2.3 — Fix alert store never fetching from server ✅
### T2.4 — Add confirmation dialogs for bulk actions ✅
### T2.5 — Sanitize process names in file paths ✅
### T2.6 — Fix log buffer memory leak ❌ → bridge.ts pruneCache + logBuffers cleanup (30min)

---

## Phase 3 — Security ✅ ALL DONE

### T3.1 — Input validation ✅
### T3.2 — WS rate limiting ✅
### T3.3 — Configurable CORS ✅
### T3.4 — Structured logging ✅

---

## Phase 4 — Performance & Reliability

### T4.1 — Fix getAllLogs selector ✅
### T4.2 — Fix ProcessTable full-map subscription ❌ (30min)
### T4.3 — Fix persistence DELETE efficiency ✅
### T4.4 — SQLite WAL checkpoint ❌ (15min)
### T4.5 — Database migration system ❌ (1h)
### T4.6 — WS protocol versioning ❌ (45min)
### T4.7 — Alert cooldown/debounce ❌ (45min)
### T4.8 — Alert severity levels ❌ (30min)
### T4.9 — PM2 daemon reconnect notification ❌ (45min)
### T4.10 — Self-monitoring ❌ (45min)

---

## Phase 5 — Docker & Deployment

### T5.1 — Add Dockerfile ✅
### T5.2 — Add docker-compose.yml ❌ (30min)
### T5.3 — Add Docker CI workflow ❌ (1h)
### T5.4 — Add .dockerignore ❌ (5min)

---

## Phase 6 — Testing (0/12 done)

### T6.1 — Test infrastructure setup (30min)
### T6.2 — Unit tests: Alert Engine (2h)
### T6.3 — Unit tests: Circular Buffer (1h)
### T6.4 — Unit tests: Settings encryption (1h)
### T6.5 — Unit tests: Validation utilities (30min)
### T6.6 — Unit tests: Formatters (30min)
### T6.7 — Unit tests: WSClient (1h)
### T6.8 — Unit tests: Zustand stores (1h)
### T6.9 — Integration tests: API routes (3h)
### T6.10 — Integration tests: SSE log streaming (2h)
### T6.11 — E2E tests: Critical user flow (3h)
### T6.12 — Bundle size check in CI (30min)

---

## Phase 7 — Feature Completion (0/12 done)

### T7.1 — Custom metrics display (2h)
### T7.2 — Process metadata in detail panel (1.5h)
### T7.3 — Process status timeline (2h)
### T7.4 — Cluster worker visualization (2h)
### T7.5 — Webhook test button (1h)
### T7.6 — Aggregate resource alerts (1.5h)
### T7.7 — Process search persistence (15min)
### T7.8 — Resizable detail panel (1.5h)
### T7.9 — Process grouping (2h)
### T7.10 — Export/import settings (1h)
### T7.11 — Log download from detail panel (30min)
### T7.12 — Process notes/tags (1.5h)

---

## Phase 8 — Accessibility (0/6 done)

### T8.1 — ARIA roles on shared components (1h)
### T8.2 — Keyboard navigation in table (1h)
### T8.3 — Focus visible styles (30min)
### T8.4 — Skip navigation link (15min)
### T8.5 — Live region for status updates (15min)
### T8.6 — axe-core audit (2h)

---

## Phase 9 — UI Polish

### T9.1 — Loading skeletons ✅
### T9.2 — Theme transition ❌ (15min)
### T9.3 — Process status animation ❌ (30min)
### T9.4 — Verify empty states ❌ (30min)
### T9.5 — Responsive breakpoints ❌ (2h)
### T9.6 — Favicon ❌ (30min)
### T9.7 — Meta tags ❌ (15min)
### T9.8 — Toast for all actions ❌ (30min)

---

## Phase 10 — Documentation

### T10.1 — CONTRIBUTING.md ✅
### T10.2 — CHANGELOG.md ❌ (1h)
### T10.3 — README.md ✅ (fix "Recharts" → "uPlot" in tech stack)
### T10.4 — API documentation ❌ (2h)
### T10.5 — Architecture documentation ❌ (1h)
### T10.6 — JSDoc all exported functions (3h)

---

## Phase 11 — Final Validation (0/6 done)

### T11.1 — Run full test suite (2h)
### T11.2 — Manual testing checklist (3h)
### T11.3 — Performance validation (2h)
### T11.4 — Security audit (2h)
### T11.5 — Cross-browser testing (2h)
### T11.6 — Create v1.0.0 release (30min)

---

## Quick Wins (High Impact, Low Effort)

1. T2.6 — Fix log buffer memory leak (30min)
2. T4.4 — SQLite WAL checkpoint (15min)
3. T9.2 — Theme transition (15min)
4. T7.7 — Process search persistence (15min)
5. T8.4 — Skip navigation link (15min)
6. T8.5 — Live region for status (15min)
7. T9.7 — Add meta tags (15min)
8. T0.7 — PR template (15min)
9. T5.4 — .dockerignore (5min)
10. T10.3 — Fix README typo (5min)

**Total quick wins: ~2.5 hours**
