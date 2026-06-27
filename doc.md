# PM2 Orbit v4.1 — Revised Build Plan

**One command. Zero config. Event-driven. Unmatched scale.**

```bash
npx pm2-orbit
```

Opens in your browser. Handles **1000+ processes** at **60fps** with **< 35MB server RAM** and **< 150KB gzipped frontend**. The only PM2 dashboard powered by **event-driven architecture** — no polling, zero waste.

---

## 1. Product Vision

A modern PM2 monitoring dashboard that launches with a single command and instantly provides process monitoring, live metrics, logs, alerts, process controls, cluster monitoring, and historical charts — without databases, Docker, external services, cloud dependencies, or configuration files.

**What makes it unique:**
- **Event-driven PM2 integration** — `pm2.launchBus()` subscription instead of polling. Zero-cost updates. No other PM2 dashboard does this.
- **Optional pm2 dependency** — Works with globally installed PM2, no redundant 40MB download.
- **Embedded persistence** — SQLite-backed 24h history survives restarts (optional, zero-config).
- **Remote connection support** — Monitor PM2 instances across machines via SSH tunnel.
- **Open source from day one** — CI/CD, tests, contribution guides, community plugins.

**Optimization principle:** Every dependency must earn its bytes. The stack is engineered around Event Bus + WebSocket + Zustand + Virtualization + Canvas charts to hit extreme performance targets while keeping the codebase small and maintainable.

---

## 2. Performance Targets

| Metric | Target |
|---|---|
| Server Idle RAM | < 35 MB |
| Server Peak RAM (1000 processes) | < 60 MB |
| Frontend Initial Payload | < 150 KB gz |
| Full Payload | < 250 KB gz |
| Dashboard Open Time | < 1.2 s |
| **WS Tick Latency** | **< 5 ms** (event-driven, no polling) |
| **Event Bus Reconciliation** | **10s stale detection** + 5s full sync |
| Process Table | 1000+ processes, 60fps |
| Chart Render (120 points) | < 5 ms |
| Cold Start | < 2 s |
| Memory per process in buffer | < 2 KB (typed arrays) |

---

## 3. Technology Stack

### Backend
| Layer | Technology | Bytes |
|---|---|---|
| Runtime | Node.js 22 | — |
| HTTP | Fastify 4 | ~2MB |
| WebSocket | ws | ~50KB |
| PM2 Integration | **pm2.launchBus() event subscription** (no polling) | external |
| Metrics | **Node `os` module** (built-in, zero dependency) | 0 |
| **Persistence** | **better-sqlite3 (optional)** | ~2MB |
| Logs | fs + readline (built-in) | 0 |
| Security Headers | @fastify/helmet | ~30KB |
| Rate Limiting | @fastify/rate-limit | ~20KB |
| Bundler | esbuild | dev only |
| Auth | Node crypto (built-in) | 0 |
| **CLI Parsing** | **mri** (~200B) | ~0.2KB |

### Frontend
| Layer | Technology | Why |
|---|---|---|
| Framework | **React 19** | Concurrent rendering, transitions, automatic batching |
| Build Tool | **Vite 5** | esbuild-backed, optimal tree-shaking |
| Language | **TypeScript 5** | Type safety, IDE support |
| Styling | **Tailwind CSS v4** | CSS-first config, tiny purged output, zero runtime |
| State | **Zustand** | < 1KB, selector-based, no Provider hell |
| Tables | **TanStack Table v8** | Headless, sortable, filterable |
| Virtualization | **TanStack Virtual** | 1000+ rows at 60fps |
| Charts | **uPlot** | Fastest canvas chart library, 45KB |
| Icons | **Lucide React** | Tree-shakeable SVG |
| Command Palette | **cmdk** | ⌘K fuzzy search |
| Toasts | **Sonner** | Themeable, accessible |
| Utility | **clsx + tailwind-merge** | Conditional class composition |

### Removed from previous plans
- ❌ **Recharts** → Replaced by uPlot (10× faster, 1/3 the size)
- ❌ **TanStack Query** → WS pushes directly to Zustand, no cache layer needed
- ❌ **next-themes** → 3 lines of code for theme toggle, no dependency
- ❌ **date-fns** → Native `Intl.DateTimeFormat` + `Intl.RelativeTimeFormat`
- ❌ **react-hook-form + zod** → Forms are simple, native React state
- ❌ **Most Radix components** → Custom primitives (smaller, full control)
- ❌ **Polling-based PM2 integration** → Event-driven via `pm2.launchBus()`
- ❌ **node-os-utils** → Replaced with built-in `os` module (zero dependency, unmaintained package)
- ❌ **tailwind.config.ts** → Tailwind v4 uses CSS-first configuration in `globals.css`

### Production Dependencies

**Backend (7 + 1 optional):**
```json
{
  "fastify": "^4",
  "@fastify/helmet": "^11",
  "@fastify/rate-limit": "^9",
  "ws": "^8",
  "open": "^10",
  "mri": "^1.2",
  "better-sqlite3": "^11"
}
```

**pm2 is an optionalDependency:**
```json
{
  "optionalDependencies": {
    "pm2": "^5"
  }
}
```

**Frontend (10):**
```json
{
  "react": "^19",
  "react-dom": "^19",
  "zustand": "^4",
  "@tanstack/react-table": "^8",
  "@tanstack/react-virtual": "^3",
  "uplot": "^1.6",
  "lucide-react": "^0.400",
  "cmdk": "^0.2",
  "sonner": "^1.4",
  "clsx": "^2",
  "tailwind-merge": "^2"
}
```

**Dev Dependencies:**
```json
{
  "esbuild": "^0.20",
  "vite": "^5",
  "@vitejs/plugin-react": "^4",
  "typescript": "^5",
  "tsx": "^4",
  "tailwindcss": "^4",
  "@tailwindcss/postcss": "^4",
  "postcss": "^8",
  "autoprefixer": "^10",
  "concurrently": "^8",
  "vitest": "^1",
  "@testing-library/react": "^14",
  "husky": "^9",
  "lint-staged": "^15"
}
```

---

## 4. Architecture

### High-Level Flow (Event-Driven)
```
PM2 Daemon
     │
     │ process:event (on start/stop/exit/data)
     ▼
PM2 Bridge (event bus subscription — NO polling)
     │
     ├──► Event Queue (batched, debounced 100ms)
     │
     ├──► Stale Detection (force refresh if no event in 10s)
     │
     ├──► Circular Buffer (typed arrays, per-process)
     │
     ├──► Alert Engine (rule evaluation on events)
     │
     ├──► SQLite Store (optional, batch writes every 5s)
     │
     └──► Fastify Server (:9823)
              │
              ├── REST  /api/*
              ├── WS    /ws
              ├── SSE   /api/logs/:id
              └── GET   /  (Vite-built SPA)
                     │
                     │ HTTP + WebSocket
                     ▼
                Browser
                     │
                     ▼
              WebSocket Client
                     │
                     ▼
              Zustand Store (single source of truth)
                     │
                     ├── useProcesses() ──► selectors ──► components
                     ├── useSystem()     ──► selectors ──► components
                     ├── useLogs()       ──► selectors ──► components
                     └── useAlerts()     ──► selectors ──► components
```

### Event Bus Architecture (The Key Innovation)

Instead of polling `pm2.list()` every 500ms (which does IPC to the daemon and serializes all process data), we subscribe to PM2's built-in event bus with **stale detection** for reliability:

**Why this is better:**
- **Zero polling overhead** — Events fire only when things change
- **Sub-millisecond latency** — Event bus delivers in-process, no IPC round trip
- **Batched by design** — Multiple rapid events are debounced into a single broadcast (100ms window)
- **Custom metrics support** — PM2's `data:*` events stream custom metrics natively
- **Stale detection** — Processes with no events in 10s are force-refreshed via `pm2.list()`
- **Full-list hash** — SHA-256 checksum skips frontend re-processing when list is unchanged

### State Architecture (the key optimization)

All data flows: **WebSocket → Zustand → Selectors → Components**

```ts
// components/ProcessRow.tsx — only this row re-renders on its own data change
const cpu = useProcessStore(s => s.processes.get(id)?.cpu);
const status = useProcessStore(s => s.processes.get(id)?.status);
```

This achieves **O(1) re-renders** even with 1000+ processes updating. No virtual DOM diffing storm.

---

## 5. Backend Structure

```
src/
├── server.ts                       ← Fastify bootstrap, plugin registration, graceful shutdown
│
├── core/
│   ├── pm2/
│   │   ├── bridge.ts               ← PM2 event bus subscription, reconnect, list, action
│   │   ├── bus.ts                   ← Event bus client layer (process:event, data:* handlers)
│   │   └── buffer.ts               ← Circular buffer: 120 pts × 60min per process
│   │
│   ├── ws/
│   │   └── broadcaster.ts          ← WebSocket server, client registry, fan-out
│   │
│   ├── logs/
│   │   └── tailer.ts               ← SSE log stream, rolling N-line buffer (configurable via PM2_ORBIT_LOG_BUFFER)
│   │
│   ├── system/
│   │   └── metrics.ts              ← CPU, RAM, disk, network via built-in os module (zero dependency)
│   │
│   ├── persistence/
│   │   ├── store.ts                ← SQLite store (optional, graceful fallback if better-sqlite3 missing)
│   │   └── migrations.ts           ← Schema migrations
│   │
│   ├── notifications/
│   │   ├── channel.ts              ← Notification channel interface
│   │   ├── slack.ts                ← Slack webhook
│   │   ├── discord.ts              ← Discord webhook
│   │   └── email.ts                ← SMTP email (optional)
│   │
│   └── alerts/
│       ├── engine.ts               ← Rule evaluation on every event (indexed by process ID)
│       └── webhook.ts              ← HTTP POST to configured URLs
│
├── routes/
│   ├── index.ts                    ← Route registration (single source of truth)
│   ├── processes.ts                ← GET /api/processes
│   ├── actions.ts                  ← POST /api/processes/:id/action
│   ├── logs.ts                     ← GET /api/logs/:id (SSE, gzip if accepted)
│   ├── system.ts                   ← GET /api/system
│   ├── alerts.ts                   ← GET/POST/DELETE /api/alerts
│   ├── history.ts                  ← GET /api/history (SQLite-backed, 24h)
│   ├── remote.ts                   ← POST /api/remote/connect (SSH tunnel management)
│   ├── settings.ts                 ← GET/PUT /api/settings
│   └── health.ts                   ← GET /api/health, GET /api/ping
│
├── plugins/
│   ├── auth.ts                     ← HMAC token verification hook
│   ├── cors.ts                     ← Localhost-only CORS + Vite dev proxy detection
│   └── static.ts                   ← Serves built React SPA from /dist-ui
│
└── types/
    └── index.ts                    ← All shared TypeScript interfaces
```

---

## 6. Frontend Structure

```
ui/
├── index.html                      ← Vite entry, FOUC-free theme script
├── vite.config.ts                  ← Vite config with manualChunks + dev proxy to :9823
├── postcss.config.js               ← Tailwind v4 + autoprefixer
├── tsconfig.json
│
├── public/
│   └── fonts/
│       ├── Exo-300.woff2
│       ├── Exo-400.woff2
│       ├── Exo-600.woff2
│       └── JetBrainsMono-400.woff2
│
├── src/
│   ├── main.tsx                    ← ReactDOM.createRoot, mounts <App />
│   ├── App.tsx                     ← Layout + global hooks (WS, shortcuts)
│   │
│   ├── lib/
│   │   ├── utils.ts                ← cn(), formatters
│   │   ├── format.ts               ← bytes, duration, percent formatters
│   │   └── ws.ts                   ← WebSocket client with auto-reconnect
│   │
│   ├── store/
│   │   ├── processes.ts            ← Zustand: process map, history, selection
│   │   ├── system.ts               ← Zustand: host CPU, RAM, load, net, disk
│   │   ├── logs.ts                 ← Zustand: log buffers per process
│   │   ├── alerts.ts               ← Zustand: rules, history
│   │   └── ui.ts                   ← Zustand: theme, active tab, sidebar
│   │
│   ├── hooks/
│   │   ├── useWebSocket.ts         ← Global WS connection, dispatches to stores
│   │   ├── useProcessActions.ts    ← restart/stop/start/reload/delete/scale
│   │   ├── useLogs.ts              ← SSE log stream subscription
│   │   ├── useAlerts.ts            ← Alert rules CRUD
│   │   ├── useTheme.ts             ← 3-line theme toggle (no library)
│   │   └── useKeyboardShortcuts.ts ← R, S, L, ?, Esc, T, ⌘K
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx        ← Header + content + status bar
│   │   │   ├── Header.tsx          ← Logo + nav + theme + bell
│   │   │   ├── Nav.tsx             ← Processes / Logs / Alerts / Settings
│   │   │   └── StatusBar.tsx       ← Connection dot, versions, last tick
│   │   │
│   │   ├── processes/
│   │   │   ├── ProcessTable.tsx    ← TanStack Table + Virtual
│   │   │   ├── ProcessRow.tsx      ← Status dot, sparkline (SVG), metrics
│   │   │   ├── ProcessDetail.tsx   ← Expanded panel: charts + metadata + controls
│   │   │   ├── StatusDot.tsx       ← Animated online indicator (pulse-glow, respects prefers-reduced-motion)
│   │   │   ├── Sparkline.tsx       ← Pure SVG sparkline (80×24, no library)
│   │   │   ├── ClusterWorkers.tsx  ← Per-worker breakdown
│   │   │   ├── EnvVars.tsx         ← Masked env vars viewer
│   │   │   └── ActionMenu.tsx      ← Restart/Reload/Stop/Scale/Delete
│   │   │
│   │   ├── charts/                 ← All uPlot-based
│   │   │   ├── UPlotChart.tsx      ← Generic wrapper, themed via CSS vars
│   │   │   ├── CpuChart.tsx
│   │   │   ├── MemoryChart.tsx
│   │   │   ├── NetworkChart.tsx
│   │   │   └── LoadChart.tsx
│   │   │
│   │   ├── logs/
│   │   │   ├── LogViewer.tsx       ← SSE-fed, search, pause, download
│   │   │   ├── LogLine.tsx         ← Level-colored
│   │   │   └── LogControls.tsx     ← Pause/Resume/Clear/Download
│   │   │
│   │   ├── alerts/
│   │   │   ├── AlertList.tsx       ← Rules list
│   │   │   ├── AlertForm.tsx       ← Create/edit rule (native React state)
│   │   │   ├── AlertHistory.tsx    ← Last 50 events
│   │   │   └── AlertBadge.tsx      ← Bell with unread count
│   │   │
│   │   ├── system/
│   │   │   └── SystemCards.tsx     ← Host CPU/RAM/Load/Net/Disk
│   │   │
│   │   ├── command/
│   │   │   └── CommandPalette.tsx  ← cmdk-based ⌘K
│   │   │
│   │   ├── remote/
│   │   │   ├── RemoteConnect.tsx   ← Connect to remote PM2 instance
│   │   │   └── RemoteStatus.tsx    ← Connection status, latency
│   │   │
│   │   ├── settings/
│   │   │   ├── NotificationSettings.tsx ← Slack/Discord/Email webhook config
│   │   │   └── GeneralSettings.tsx ← Theme, port, log buffer size
│   │   │
│   │   └── shared/
│   │       ├── Button.tsx          ← PM2-styled (outline, cyan, purple, destructive)
│   │       ├── Dialog.tsx          ← Custom (no Radix)
│   │       ├── Tabs.tsx            ← Custom
│   │       ├── Badge.tsx           ← Status variants
│   │       ├── Input.tsx
│   │       ├── Dropdown.tsx        ← Custom (no Radix)
│   │       ├── ConfirmDialog.tsx
│   │       ├── ConnectionDot.tsx
│   │       ├── MetricPill.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx           ← System cards + process table
│   │   ├── Logs.tsx                ← Per-process log viewer
│   │   ├── Alerts.tsx              ← Rules + history
│   │   ├── Settings.tsx            ← All settings (theme, notifications, remote connections)
│   │   └── History.tsx             ← 24h historical charts (SQLite-backed)
│   │
│   ├── types/
│   │   ├── pm2.ts
│   │   ├── system.ts
│   │   ├── alerts.ts
│   │   └── api.ts
│   │
│   └── styles/
│       └── globals.css             ← Tailwind v4 @theme + @import + PM2 CSS variables + reduced-motion
```

---

## 7. Data Flow

### Event-Driven Tick Contract
```ts
interface Tick {
  ts: number;
  events: ProcessEvent[];          // Only changed processes (delta)
  full?: ProcessSnapshot[];        // Full list every 5s (coarse sync)
  fullHash?: string;               // SHA-256 of full list — frontend skips re-processing if unchanged
  system: SystemSnapshot;
}

interface ProcessEvent {
  type: 'update' | 'add' | 'remove';
  process: ProcessSnapshot;
}

interface ProcessSnapshot {
  id: number;
  name: string;
  status: 'online' | 'stopped' | 'errored' | 'launching' | 'stopping';
  pid: number;
  cpu: number;
  memory: number;
  uptime: number;
  restarts: number;
  mode: 'fork' | 'cluster';
  instances: number;
  history: { ts: number[]; cpu: number[]; memory: number[] };
  customMetrics?: Record<string, number>;
}

interface SystemSnapshot {
  cpu: number;
  memory: { used: number; total: number };
  loadAvg: [number, number, number];
  disk: { read: number; write: number };
  network: { rx: number; tx: number };
}
```

### Event Bus → WebSocket Pipeline
```ts
// core/pm2/event-handler.ts
import { createPm2Bridge } from './bridge';
import { createHash } from 'crypto';

export function createEventHandler(bridge: Pm2Bridge, buffer: BufferStore) {
  let lastFullSync = 0;
  let lastFullHash = '';
  const FULL_SYNC_INTERVAL = 5000;

  function computeHash(snapshots: ProcessSnapshot[]): string {
    const data = JSON.stringify(snapshots.map(s => [s.id, s.status, s.cpu, s.memory]));
    return createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  bridge.subscribe((events) => {
    const now = Date.now();

    for (const event of events) {
      if (event.type === 'update' || event.type === 'add') {
        buffer.push(event.process.id, now, event.process.cpu, event.process.memory);
      }
    }

    const needsFullSync = (now - lastFullSync) > FULL_SYNC_INTERVAL;
    if (needsFullSync) lastFullSync = now;

    const fullList = needsFullSync ? bridge.list() : undefined;
    const fullHash = fullList ? computeHash(fullList) : undefined;

    return {
      ts: now,
      events,
      full: fullList,
      fullHash: fullHash !== lastFullHash ? fullHash : undefined,
      system: systemMetrics.read(),
    };
  });
}
```

### WebSocket Client (auto-reconnect)
```ts
// lib/ws.ts
export class WSClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private listeners = new Set<(tick: Tick) => void>();

  connect(url: string) {
    // ... exponential backoff: 1s, 2s, 4s, max 10s
  }

  subscribe(fn: (tick: Tick) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

// In useWebSocket.ts — handle fullHash to skip re-processing
function handleTick(tick: Tick) {
  if (tick.full && tick.fullHash) {
    const lastHash = localStorage.getItem('pm2-orbit-full-hash');
    if (tick.fullHash !== lastHash) {
      processStore.setAll(tick.full);
      localStorage.setItem('pm2-orbit-full-hash', tick.fullHash);
    }
  }
  if (tick.events.length > 0) {
    processStore.applyDelta(tick.events);
  }
  systemStore.update(tick.system);
}
```

### Zustand Store (the heart of performance)

```ts
// store/processes.ts
import { create } from 'zustand';

interface ProcessStore {
  processes: Map<number, ProcessSnapshot>;
  selectedId: number | null;
  applyDelta: (events: ProcessEvent[]) => void;
  setAll: (snapshots: ProcessSnapshot[]) => void;
  select: (id: number | null) => void;
}

export const useProcessStore = create<ProcessStore>((set) => ({
  processes: new Map(),
  selectedId: null,

  applyDelta: (events) => {
    set((state) => {
      const next = new Map(state.processes);
      for (const event of events) {
        if (event.type === 'remove') {
          next.delete(event.process.id);
        } else {
          const existing = next.get(event.process.id);
          if (existing) {
            Object.assign(existing, event.process);
          } else {
            next.set(event.process.id, event.process);
          }
        }
      }
      return { processes: next };
    });
  },

  setAll: (snapshots) => {
    set((state) => {
      const next = new Map(state.processes);
      for (const snap of snapshots) {
        const existing = next.get(snap.id);
        if (existing) {
          Object.assign(existing, snap);
        } else {
          next.set(snap.id, snap);
        }
      }
      const incomingIds = new Set(snapshots.map(s => s.id));
      for (const id of next.keys()) {
        if (!incomingIds.has(id)) next.delete(id);
      }
      return { processes: next };
    });
  },

  select: (id) => set({ selectedId: id }),
}));
```

**Key insight:** Using a `Map` + `Object.assign` keeps unchanged process objects referentially stable, so React selectors that compare by reference skip re-renders entirely for rows that didn't change.

### Circular Buffer (typed arrays — 8× more efficient than plain arrays)
```ts
// core/pm2/buffer.ts
class CircularBuffer {
  private size = 120;
  private ptr = 0;
  ts:     Float64Array = new Float64Array(120);
  cpu:    Float32Array  = new Float32Array(120);
  memory: Float32Array  = new Float32Array(120);

  push(ts: number, cpu: number, mem: number): void {
    this.ts[this.ptr]     = ts;
    this.cpu[this.ptr]    = cpu;
    this.memory[this.ptr] = mem;
    this.ptr = (this.ptr + 1) % this.size;
  }

  read(): { ts: number[]; cpu: number[]; memory: number[] } {
    return {
      ts:     Array.from(this.ts),
      cpu:    Array.from(this.cpu),
      memory: Array.from(this.memory),
    };
  }
}
```

**Memory cost**: 120 × (8 + 4 + 4) bytes = **1.92 KB per process**. Even 1000 processes = ~2 MB total.

---

## 8. REST API Contract

```
GET    /api/processes              → ProcessSnapshot[]
GET    /api/processes/:id          → ProcessSnapshot
POST   /api/processes/:id/action   → { action: 'restart'|'stop'|'start'|'reload'|'delete'|'scale', instances?: number }
GET    /api/logs/:id               → SSE stream (text/event-stream, gzip if accepted)
GET    /api/system                 → SystemSnapshot
GET    /api/alerts                 → AlertRule[]
POST   /api/alerts                 → Create AlertRule
DELETE /api/alerts/:id             → Delete AlertRule
GET    /api/alerts/history         → AlertEvent[]
GET    /api/history/:id            → Historical metrics (24h, SQLite-backed)
GET    /api/history/system         → Historical system metrics (24h)
POST   /api/remote/connect         → { host: string, port: number, key?: string }
DELETE   /api/remote/connect/:id   → Disconnect remote
GET    /api/settings               → All settings
PUT    /api/settings               → Update settings
GET    /api/health                 → { status: 'ok', uptime: number, version: string, processes: number }
GET    /api/ping                   → 200 (lightweight, for reverse proxy health checks)
```

---

## 9. UI Design System (PM2 Keymetrics-Inspired)

### Tailwind v4 Configuration (CSS-First)

Tailwind v4 uses CSS-first configuration — no `tailwind.config.ts` needed. All tokens are defined in `globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  --color-accent: var(--accent);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-destructive: var(--destructive);
  --color-muted: var(--muted);
  --color-border: var(--border);
  --color-ring: var(--ring);

  --font-sans: 'Exo', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --radius: 0px;
  --radius-sm: 0px;
  --radius-md: 2px;
  --radius-lg: 2px;
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --background: #2b037a;
    --foreground: #ffffff;
    /* ... dark theme variables */
  }
}

.light {
  --background: #f5f5f7;
  --foreground: #1a1a2e;
  /* ... light theme variables */
}
```

### PostCSS Config
```js
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};
```

### Color Palette — Dark Mode (Default / Primary)

Extracted directly from `pm2.keymetrics.io`:
- Background: `#2b037a` (PM2 purple)
- Primary accent: `#019cf6` (cyan)
- Accent secondary: `#7f45e7` (purple)
- Text: `#ffffff`
- Muted text: `#999999`
- Border: `#222222`
- Card surface: `#000000`

```css
.dark {
  --background: #2b037a;
  --background-deep: #1f0257;
  --foreground: #ffffff;
  --card: #000000;
  --card-foreground: #ffffff;
  --popover: #1a0265;
  --popover-foreground: #ffffff;
  --muted: #1a0265;
  --muted-foreground: #999999;
  --subtle: #2a0575;
  --input: #000000;
  --border: #222222;
  --ring: #019cf6;

  --primary: #019cf6;
  --primary-foreground: #ffffff;
  --primary-hover: #33adff;
  --primary-deep: #0078c0;
  --primary-subtle: rgba(1, 156, 246, 0.12);

  --accent: #7f45e7;
  --accent-foreground: #ffffff;

  --success: #10b981;
  --success-subtle: rgba(16, 185, 129, 0.15);
  --warning: #f59e0b;
  --warning-subtle: rgba(245, 158, 11, 0.15);
  --destructive: #ef4444;
  --destructive-subtle: rgba(239, 68, 68, 0.15);

  --chart-cpu: #019cf6;
  --chart-memory: #7f45e7;
  --chart-network: #33adff;
  --chart-disk: #c084fc;
  --chart-grid: #2a0575;
  --chart-axis: #999999;

  /* PM2 signature inset glow shadows */
  --shadow-glow-sm: inset 0 0 25px 0 rgba(84, 167, 255, 0.3), 0 0 30px 0 rgba(0, 0, 0, 0.2);
  --shadow-glow-md: inset 0 0 50px 0 rgba(84, 167, 255, 0.4), 0 0 30px 0 rgba(0, 0, 0, 0.2);
  --shadow-glow-lg: inset 0 0 100px 0 rgba(84, 167, 255, 0.4), 0 0 30px 0 rgba(0, 0, 0, 0.2);

  /* SHARP corners per PM2 spec */
  --radius: 0px;
  --radius-sm: 0px;
  --radius-md: 2px;
  --radius-lg: 2px;
}
```

### Color Palette — Light Mode (Secondary)
```css
:root {
  --background: #f5f5f7;
  --foreground: #1a1a2e;
  --card: #ffffff;
  --card-foreground: #1a1a2e;
  --popover: #ffffff;
  --popover-foreground: #1a1a2e;
  --muted: #ececf0;
  --muted-foreground: #6b7280;
  --subtle: #e5e5ea;
  --input: #ffffff;
  --border: #d1d1d6;
  --ring: #019cf6;

  --primary: #019cf6;
  --primary-foreground: #ffffff;
  --primary-hover: #0078c0;
  --primary-subtle: rgba(1, 156, 246, 0.08);

  --accent: #7f45e7;
  --accent-foreground: #ffffff;

  --success: #10b981;
  --warning: #f59e0b;
  --destructive: #ef4444;

  --chart-cpu: #019cf6;
  --chart-memory: #7f45e7;
  --chart-network: #0078c0;
  --chart-disk: #a855f7;
  --chart-grid: #e5e5ea;
  --chart-axis: #9ca3af;

  --shadow-glow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-glow-md: 0 4px 12px 0 rgba(0, 0, 0, 0.08);
  --shadow-glow-lg: 0 10px 30px 0 rgba(0, 0, 0, 0.1);

  --radius: 0px;
  --radius-sm: 0px;
  --radius-md: 2px;
  --radius-lg: 2px;
}
```

### Typography
- **All UI text**: `Exo` (per PM2 spec) — sans-serif fallback
- **All numeric/data**: `JetBrains Mono` — monospace
- **Heading weight**: 300 (light, refined per PM2)
- **Body weight**: 300 default, 400 for emphasis
- **Type scale**: `40px / 28px / 22px / 19.2px / 16px / 14.4px / 12.8px / 13px` (mono)

### Font Loading Strategy
- Self-host woff2 files in `public/fonts/` (no Google Fonts CDN)
- Use `font-display: swap` to prevent invisible text during load
- Subset fonts to Latin characters only (~60KB total, down from 70KB)
- Load Exo 300 (headings) and 400 (body) only — skip 600 if unused in v1

### Spacing (10px base unit per PM2 spec)
All gaps are multiples of 10px: `10 / 20 / 30 / 34 / 36 px`. Slight off-grid values (6, 14, 16px) used only where the extracted PM2 site uses them.

### Iconography (Lucide, `strokeWidth={1.5}`)
- 16px default, 14px in tables, 20px in nav, 24px in hero
- Set: `Cpu`, `MemoryStick`, `Network`, `HardDrive`, `RotateCw`, `Play`, `Square`, `Trash2`, `Plus`, `Minus`, `RefreshCw`, `LayoutGrid`, `Terminal`, `Bell`, `Settings`, `Wifi`, `WifiOff`, `Sun`, `Moon`, `Monitor`, `MoreHorizontal`, `Server`, `History`, `Plug`

---

## 10. Components (Minimal, Custom)

### Why custom instead of shadcn/ui
shadcn/ui depends on many Radix packages. We need a **smaller bundle** and **full control**. Keep the component list minimal:

| Component | Implementation | Replaces Radix |
|---|---|---|
| `Button` | Native `<button>` with Tailwind variants | `@radix-ui/react-slot` |
| `Input` | Native `<input>` | — |
| `Dialog` | Native `<dialog>` element | `@radix-ui/react-dialog` |
| `Dropdown` | Native `<details>` or lightweight popover | `@radix-ui/react-dropdown-menu` |
| `Tabs` | Custom (10 lines) | `@radix-ui/react-tabs` |
| `Tooltip` | Native `title` attr + CSS hover | `@radix-ui/react-tooltip` |
| `Toast` | **Sonner** (already in stack) | `@radix-ui/react-toast` |
| `Command` | **cmdk** (already in stack) | `@radix-ui/react-dialog` |
| `Badge` | Native `<span>` | — |
| `Table` | Native `<table>` + TanStack Table | — |
| `ConfirmDialog` | Built on `Dialog` | — |
| `ConnectionDot` | Plain `<div>` | — |
| `MetricPill` | Plain `<div>` | — |

**Bundle savings**: ~80KB gzipped by dropping Radix.

### Custom Component Examples

#### Button (PM2-styled, sharp corners, uppercase Exo)
```tsx
import { cn } from '@/lib/utils';
import { forwardRef, ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'outline' | 'accent' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  default:     'bg-primary text-primary-foreground hover:bg-primary-hover',
  outline:     'border border-primary bg-transparent text-foreground hover:bg-primary hover:text-primary-foreground',
  accent:      'border border-accent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
  ghost:       'hover:bg-subtle text-foreground',
  destructive: 'border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground',
};

const sizes: Record<Size, string> = {
  sm:   'h-8 px-3 text-xs',
  md:   'h-10 px-5 text-sm',
  lg:   'h-12 px-7 text-base',
  icon: 'h-10 w-10',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-sans uppercase tracking-wider font-normal transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:opacity-50 disabled:pointer-events-none',
        'rounded-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
```

#### Sparkline (pure SVG, zero chart library)
```tsx
import { memo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export const Sparkline = memo(function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'currentColor',
  fill = true,
}: SparklineProps) {
  // NOTE: data.length is always ≤ 120 (circular buffer size), so Math.max(...data) is safe
  if (data.length < 2) return <svg width={width} height={height} />;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
});
```

**Why SVG sparklines instead of uPlot**: For tiny 80×24px sparklines, uPlot is overkill. Pure SVG is **< 1KB** and renders identically across browsers.

#### uPlot Chart (for full timeline charts)
```tsx
import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface UPlotChartProps {
  data: uPlot.AlignedData;
  series: uPlot.Series[];
  width: number;
  height: number;
}

export function UPlotChart({ data, series, width, height }: UPlotChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const opts: uPlot.Options = {
      width,
      height,
      series,
      cursor: { drag: { x: false, y: false } },
      scales: { x: { time: false } },
      axes: [
        { stroke: 'hsl(var(--chart-axis))', grid: { stroke: 'hsl(var(--chart-grid))' } },
        { stroke: 'hsl(var(--chart-axis))', grid: { stroke: 'hsl(var(--chart-grid))' } },
      ],
    };

    plotRef.current = new uPlot(opts, data, containerRef.current);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, []);

  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  useEffect(() => {
    if (plotRef.current) {
      plotRef.current.setSize({ width, height });
    }
  }, [width, height]);

  return <div ref={containerRef} />;
}
```

---

## 11. Layout

### App Shell
```
┌──────────────────────────────────────────────────────────────────┐
│  [PM2 ORBIT]  Processes  Logs  Alerts  History  Settings   ☀ 🔔 │  56px header
├──────────────────────────────────────────────────────────────────┤
│  SYSTEM OVERVIEW (cyan glow cards)                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐│  120px
│  │ CPU 12% │ │MEM 3.2GB│ │LOAD 0.4 │ │NET 1.2MB│ │DISK 45M    ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────────┘│
├──────────────────────────────────────────────────────────────────┤
│  Processes (6)                       [Search...] [Filter ▾]       │  40px
├──────────────────────────────────────────────────────────────────┤
│  ●  api-server     fork   4821  ▄▃▅▆▇▅   4.2%  148MB  2d3h       │
│  ●  worker         clust  4912  ▁▂▃▄▃▂   8.1%  220MB  1d2h       │  flex-1
│  ●  cron           fork   4999  ▁▁▁▁▁▁   0.1%   12MB  5d         │  scrollable
├──────────────────────────────────────────────────────────────────┤
│  ● Connected · pm2 v5.3.0 · Node v22 · v1.0.0 · Last event 0.1s │  28px
└──────────────────────────────────────────────────────────────────┘
```

### Process Detail (slide-in panel)
```
┌──────────────────────────────────────────────────────────────────┐
│  Header                                                            │
├──────────────────────────────┬───────────────────────────────────┤
│  PROCESSES (35%)             │  PROCESS DETAIL (65%)             │
│  ┌────────────────────────┐  │  ┌─────────────────────────────┐  │
│  │ ● api-server           │← │  │ api-server        ● online  │  │
│  │ ● worker               │  │  │ fork · PID 4821             │  │
│  │ ● cron                 │  │  ├─────────────────────────────┤  │
│  └────────────────────────┘  │  │ [RESTART][RELOAD][STOP]···  │  │
│                              │  ├─────────────────────────────┤  │
│                              │  │ CPU timeline (24h, uPlot)   │  │
│                              │  │ Memory timeline (24h, uPlot)│  │
│                              │  ├─────────────────────────────┤  │
│                              │  │ Stats | Env | Logs | Config │  │
│                              │  └─────────────────────────────┘  │
└──────────────────────────────┴───────────────────────────────────┘
```

### Virtualization

ProcessTable uses **TanStack Virtual** to render only visible rows. With 1000 processes and 48px row height in a 600px viewport, only **~13 row components** exist in the DOM at any time, regardless of total process count.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,
  overscan: 10,
});

return (
  <div ref={parentRef} className="h-full overflow-auto">
    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
      {rowVirtualizer.getVirtualItems().map((virtualRow) => (
        <ProcessRow
          key={rows[virtualRow.index].id}
          process={rows[virtualRow.index]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }}
        />
      ))}
    </div>
  </div>
);
```

---

## 12. Feature Specification

### Process Monitoring
- [x] Live process table, **virtualized** for 1000+ processes
- [x] **Event-driven updates** via `pm2.launchBus()` — no polling, sub-ms latency
- [x] **10s stale detection** — force refresh processes with no events
- [x] **Full-list hash** — SHA-256 checksum to skip frontend re-processing
- [x] Per-row CPU sparkline (60s history, **pure SVG**)
- [x] Status badges: online / stopped / errored / launching / stopping
- [x] Pulse-glow animation for online (respects `prefers-reduced-motion`)
- [x] Sort by: name, CPU, memory, uptime, restarts (column click)
- [x] Filter bar: search by name, filter by status
- [x] Click row → expand detail panel
- [x] Cluster mode: expandable workers list with per-worker metrics

### Detail View
- [x] **uPlot** CPU timeline chart (24h, SQLite-backed, cyan gradient)
- [x] **uPlot** Memory timeline chart (24h, SQLite-backed, purple gradient)
- [x] Live stats: uptime, restarts, PID, heap, event loop lag
- [x] Process metadata: exec path, cwd, args, node version, mode
- [x] Env vars viewer with mask toggle (regex: `KEY|SECRET|TOKEN|PASS|PWD`)
- [x] PM2 config viewer

### Process Controls
- [x] Restart, Reload, Stop, Start, Delete (with confirmation), Scale, Flush logs, Send signal
- [x] Optimistic UI: button disables + spinner during action
- [x] Toast notification on success/failure (Sonner)

### Log Viewer
- [x] Live SSE tail per process (last N lines, configurable via `PM2_ORBIT_LOG_BUFFER`, default 500)
- [x] SSE stream gzipped when client sends `accept-encoding: gzip`
- [x] Pause / Resume without disconnecting
- [x] Log level auto-coloring (ERROR red, WARN amber, INFO muted)
- [x] Inline regex search with cyan highlight
- [x] Auto-scroll with manual override
- [x] Download buffer as `.txt`
- [x] Merged view: all processes interleaved, color-coded by name

### System Overview Cards
- [x] Host CPU % (updates every 2s)
- [x] Host memory: used / total
- [x] Load average: 1m / 5m / 15m
- [x] Network I/O: rx / tx bytes/s
- [x] Disk I/O: read / write bytes/s
- [x] PM2 version, Node.js version
- [x] Connection status dot
- [x] **Health endpoint**: `/api/health` returns status, uptime, version, process count
- [x] **Ping endpoint**: `/api/ping` for reverse proxy health checks

### Historical Charts (SQLite, New)
- [x] 24h CPU history per process
- [x] 24h Memory history per process
- [x] 24h System metrics (CPU, RAM, load)
- [x] Time-range selector (1h / 6h / 24h)
- [x] Survives server restart (persistent SQLite DB)

### Remote Connections (New)
- [x] Connect to remote PM2 instances via SSH tunnel
- [x] Connection management UI (add/remove/list)
- [x] Per-connection status and latency
- [x] Secure key-based auth

### Alert Engine
- [x] Rules: CPU > N%, memory > NMB, restarts > N in 5min, process offline
- [x] **Indexed by process ID** for O(1) evaluation — no allocations in hot path
- [x] Per-process or global rules
- [x] Browser Notification API push
- [x] Webhook POST with JSON payload
- [x] **Slack webhook integration**
- [x] **Discord webhook integration**
- [x] **Email notification (SMTP, optional)**
- [x] Alert history panel (last 50 events)
- [x] Rules persisted to `~/.pm2-orbit/alerts.json`

### Security
- [x] `PM2_ORBIT_TOKEN` env var enables Bearer auth
- [x] CORS locked to localhost + 127.0.0.1 (detects Vite dev proxy automatically)
- [x] Rate limiting: 100 req/min per IP
- [x] Helmet: XSS, CSP, X-Frame-Options, HSTS
- [x] Env vars masked by default
- [x] **Zero external HTTP calls ever made by the server** (notifications are opt-in outbound)
- [x] **Remote connections require token auth** — `PM2_ORBIT_TOKEN` is mandatory when binding to non-localhost interfaces
- [x] **Health endpoints are unauthenticated** — `/api/health` and `/api/ping` skip auth for reverse proxy checks
- [x] **Token validation** — reject requests with invalid or missing tokens when auth is enabled

### Theme System
- [x] Dark mode (default — PM2 brand), Light mode, System
- [x] **3-line theme toggle** (no next-themes dependency)
- [x] Persisted to `localStorage`
- [x] Smooth transition on theme switch (respects `prefers-reduced-motion`)
- [x] All charts themed via CSS variables
- [x] No FOUC (inline script in `index.html`)

### Developer Experience
- [x] **Keyboard shortcuts**: `R` restart, `S` stop, `L` logs, `?` help, `Esc` close, `T` toggle theme, `⌘K`/`Ctrl+K` palette
- [x] Auto-reconnect WS (exponential backoff: 1s, 2s, 4s, max 10s)
- [x] Reconnect toast
- [x] `--port`, `--no-open`, `--theme`, `--remote` CLI flags (robust mri-based parsing)
- [x] update-notifier check
- [x] `pm2-orbit --version`, `--help`

### Command Palette (⌘K / Ctrl+K)
- [x] Fuzzy search processes by name/PID (cmdk)
- [x] Quick actions: Restart All, Stop All, Reload All
- [x] Jump to: Settings, Alerts, Logs, History
- [x] Switch theme
- [x] Connect to remote server
- [x] Keyboard navigation (↑↓, Enter, Esc)

---

## 13. Theme System (3 lines, no dependency)

```ts
// hooks/useTheme.ts
const STORAGE_KEY = 'pm2-orbit-theme';

export function useTheme() {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return (localStorage.getItem(STORAGE_KEY) as 'light' | 'dark' | 'system') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    const apply = (t: 'light' | 'dark') => {
      root.classList.toggle('dark', t === 'dark');
      root.style.colorScheme = t;
    };
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      apply(theme);
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return { theme, setTheme: setThemeState };
}
```

---

## 14. Clean Code Standards

### TypeScript Strictness
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Note on `noUnusedParameters`**: All unused parameters MUST be prefixed with `_` (e.g., `_req`, `_reply`) to satisfy the strict mode. This is enforced via linting.

### Error Handling Pattern
```ts
type Ok<T>  = { ok: true;  value: T };
type Err<E> = { ok: false; error: E };
type Result<T, E = string> = Ok<T> | Err<E>;

const ok  = <T>(v: T): Ok<T>   => ({ ok: true,  value: v });
const err = <E>(e: E): Err<E>  => ({ ok: false, error: e });
```

### Graceful Shutdown
```ts
// server.ts
export async function createServer(opts: ServerOpts) {
  const app = Fastify({ logger: false, trustProxy: false });

  // ... register plugins, routes, deps ...

  async function shutdown(signal: string) {
    console.log(`\n  Received ${signal}. Shutting down gracefully...`);
    poller?.stop();
    broadcaster?.close();
    alerts?.shutdown();
    persistence?.close();
    bridge?.disconnect();
    await app.close();
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
  });

  return app;
}
```

### Module Contract Pattern (no singletons)
```ts
export interface Pm2Bridge {
  list(): Promise<Result<ProcessSnapshot[]>>;
  action(id: number, action: ProcessAction): Promise<Result<void>>;
  connect(): Promise<Result<void>>;
  subscribe(fn: (events: ProcessEvent[]) => void): () => void;
  disconnect(): void;
}

export function createPm2Bridge(): Pm2Bridge { ... }

// server.ts — explicit dependency injection
const bridge      = createPm2Bridge();
const buffer      = createBufferStore();
const eventBus    = createEventHandler(bridge, buffer);
const broadcaster = createBroadcaster();
const alerts      = createAlertEngine(buffer);
const persistence = createPersistence();

await bridge.connect();
eventBus.start(broadcaster.broadcast, alerts.evaluate);
```

### pm2 Optional Dependency Handling
```ts
// core/pm2/bridge.ts
let pm2: typeof import('pm2');

try {
  pm2 = require('pm2');
} catch {
  console.error([
    '  PM2 is not installed.',
    '  Install it globally: npm install -g pm2',
    '  Or locally:          npm install pm2',
    '',
    '  PM2 Orbit requires PM2 to be installed.',
  ].join('\n'));
  process.exit(1);
}
```

### System Metrics (built-in os module, zero dependency)
```ts
// core/system/metrics.ts
import os from 'os';

let prevCpuTimes: { idle: number; total: number }[] = [];

function readCpu(): number {
  const cpus = os.cpus();
  let idleDiff = 0;
  let totalDiff = 0;

  for (let i = 0; i < cpus.length; i++) {
    const prev = prevCpuTimes[i] || { idle: 0, total: 0 };
    const { idle, user, nice, sys, irq } = cpus[i].times;
    const total = user + nice + sys + irq + idle;

    idleDiff += idle - prev.idle;
    totalDiff += total - prev.total;
  }

  prevCpuTimes = cpus.map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b, 0) }));

  return totalDiff === 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 100 * 10) / 10;
}

function readMemory() {
  return { used: os.totalmem() - os.freemem(), total: os.totalmem() };
}

function readLoadAvg() {
  return os.loadavg() as [number, number, number];
}

### Zustand Selector Pattern (the performance rule)
**Never** subscribe to the full store in components. Always use narrow selectors that return primitives or stable references:

```tsx
// ✅ Correct — only re-renders when THIS process's CPU changes
const cpu = useProcessStore(s => s.processes.get(id)?.cpu);

// ❌ Wrong — re-renders on ANY process change
const { processes } = useProcessStore();
const cpu = processes.get(id)?.cpu;
```

### Alert Engine (indexed by process ID, zero allocations in hot path)
```ts
// core/alerts/engine.ts
export function createAlertEngine(buffer: BufferStore) {
  // Pre-index rules by process ID for O(1) lookup
  const globalRules: AlertRule[] = [];
  const perProcessRules = new Map<number, AlertRule[]>();

  function addRule(rule: AlertRule) {
    if (rule.processId) {
      const existing = perProcessRules.get(rule.processId) || [];
      existing.push(rule);
      perProcessRules.set(rule.processId, existing);
    } else {
      globalRules.push(rule);
    }
  }

  function evaluate(processes: ProcessSnapshot[]) {
    // Reuse result array to avoid allocation
    const fired: AlertEvent[] = [];
    for (const proc of processes) {
      const rules = perProcessRules.get(proc.id);
      if (rules) {
        for (let i = 0; i < rules.length; i++) {
          if (checkRule(rules[i], proc)) {
            fired.push({ ruleId: rules[i].id, processId: proc.id, ts: Date.now() });
          }
        }
      }
    }
    // Global rules
    for (let i = 0; i < globalRules.length; i++) {
      for (const proc of processes) {
        if (checkRule(globalRules[i], proc)) {
          fired.push({ ruleId: globalRules[i].id, processId: proc.id, ts: Date.now() });
        }
      }
    }
    return fired;
  }

  return { addRule, removeRule, evaluate, getRules, shutdown };
}
```

### Component Pattern
```ts
interface ProcessRowProps {
  process: ProcessSnapshot;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

export function ProcessRow({ process, isSelected, onSelect }: ProcessRowProps) {
  // Pure presentational component
  // Receives data as props, dispatches via callbacks
}
```

### Route Registration
```ts
export function registerRoutes(app: FastifyInstance, deps: Deps): void {
  app.register(processRoutes, { prefix: '/api/processes', ...deps });
  app.register(actionRoutes,  { prefix: '/api/processes', ...deps });
  app.register(logRoutes,     { prefix: '/api/logs',      ...deps });
  app.register(systemRoutes,  { prefix: '/api/system',    ...deps });
  app.register(alertRoutes,   { prefix: '/api/alerts',    ...deps });
  app.register(historyRoutes, { prefix: '/api/history',   ...deps });
  app.register(remoteRoutes,  { prefix: '/api/remote',    ...deps });
  app.register(settingsRoutes,{ prefix: '/api/settings',  ...deps });
  app.register(healthRoutes,  { prefix: '/api',           ...deps });
}
```

---

## 15. Build System

### Vite Configuration (with dev proxy)
```ts
// ui/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:9823', changeOrigin: true },
      '/ws':  { target: 'ws://127.0.0.1:9823', ws: true },
    },
  },
  build: {
    outDir: 'dist-ui',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'table-virtual': ['@tanstack/react-table', '@tanstack/react-virtual'],
          'charts':       ['uplot'],
          'icons':        ['lucide-react'],
          'cmdk':         ['cmdk'],
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

### Unified Build Script
```js
// build.js
const { build: esbuild } = require('esbuild');
const { build: vite }    = require('vite');
const path = require('path');

async function buildUI() {
  console.log('▸ Building UI with Vite...');
  await vite({
    configFile: path.join(__dirname, 'ui/vite.config.ts'),
    build: { outDir: path.join(__dirname, 'dist-ui'), emptyOutDir: true },
  });
}

async function buildServer() {
  console.log('▸ Building server with esbuild...');
  await esbuild({
    entryPoints: ['src/server.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/server.js',
    external: ['pm2', 'better-sqlite3'],
    minify: true,
  });
}

(async () => {
  await buildUI();
  await buildServer();
  console.log('✓ Build complete');
})().catch((e) => { console.error(e); process.exit(1); });
```

### Package Scripts
```json
{
  "scripts": {
    "dev:ui":     "cd ui && vite",
    "dev:server": "tsx watch src/server.ts",
    "dev":        "concurrently -k -n ui,server -c blue,green \"npm:dev:ui\" \"npm:dev:server\"",
    "build":      "node build.js",
    "start":      "node dist/server.js",
    "lint":       "tsc --noEmit",
    "typecheck":  "tsc --noEmit && cd ui && tsc --noEmit",
    "test":       "vitest run",
    "test:watch": "vitest",
    "test:e2e":   "vitest --config vitest.e2e.config.ts",
    "prepare":    "husky"
  }
}
```

### FOUC Prevention (inline in index.html)
```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <script>
      (function() {
        try {
          var stored = localStorage.getItem('pm2-orbit-theme');
          var theme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          if (theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
          }
        } catch (_) {}
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## 16. File Reference

### Complete package.json (root)
```json
{
  "name": "pm2-orbit",
  "version": "1.0.0",
  "description": "High-performance PM2 monitoring dashboard — event-driven, 1000+ processes, < 150KB",
  "main": "dist/server.js",
  "bin": { "pm2-orbit": "bin/pm2-orbit.js" },
  "scripts": {
    "dev:ui":     "cd ui && vite",
    "dev:server": "tsx watch src/server.ts",
    "dev":        "concurrently -k -n ui,server -c blue,green \"npm:dev:ui\" \"npm:dev:server\"",
    "build":      "node build.js",
    "start":      "node dist/server.js",
    "lint":       "tsc --noEmit",
    "typecheck":  "tsc --noEmit && cd ui && tsc --noEmit",
    "test":       "vitest run",
    "test:watch": "vitest",
    "test:e2e":   "vitest --config vitest.e2e.config.ts",
    "prepare":    "husky"
  },
  "engines": { "node": ">=18" },
  "dependencies": {
    "fastify":             "^4",
    "@fastify/helmet":     "^11",
    "@fastify/rate-limit": "^9",
    "ws":                  "^8",
    "open":                "^10",
    "mri":                 "^1.2"
  },
  "optionalDependencies": {
    "pm2":                 "^5",
    "better-sqlite3":      "^11"
  },
  "devDependencies": {
    "esbuild":              "^0.20",
    "vite":                 "^5",
    "@vitejs/plugin-react": "^4",
    "typescript":           "^5",
    "tsx":                  "^4",
    "tailwindcss":          "^4",
    "@tailwindcss/postcss": "^4",
    "postcss":              "^8",
    "autoprefixer":         "^10",
    "concurrently":         "^8",
    "vitest":               "^1",
    "@testing-library/react": "^14",
    "husky":                "^9",
    "lint-staged":          "^15"
  }
```

### bin/pm2-orbit.js
```js
#!/usr/bin/env node
'use strict';

const mri = require('mri');
const { createServer } = require('../dist/server');
const open = require('open');

const args = mri(process.argv.slice(2), {
  alias: {
    port: 'p',
    theme: 't',
    'no-open': 'n',
    help: 'h',
    version: 'v',
    remote: 'r',
  },
  default: {
    port: parseInt(process.env.PM2_ORBIT_PORT || '9823', 10),
    'no-open': false,
  },
  boolean: ['no-open', 'help', 'version'],
  string: ['port', 'theme', 'remote'],
});

if (args.help) {
  console.log(`
  PM2 Orbit — High-performance PM2 monitoring dashboard

  Usage:
    $ pm2-orbit [options]

  Options:
    --port, -p       Port to listen on (default: 9823)
    --no-open, -n    Don't open browser automatically
    --theme, -t      Force theme (dark|light|system)
    --remote, -r     Connect to remote PM2 instance (user@host)
    --help, -h       Show this help
    --version, -v    Show version
  `);
  process.exit(0);
}

if (args.version) {
  console.log(require('../package.json').version);
  process.exit(0);
}

if (args.theme) process.env.PM2_ORBIT_THEME = args.theme;

async function main() {
  const server = await createServer({ port: args.port, remote: args.remote });
  await server.listen({ port: args.port, host: '127.0.0.1' });
  console.log(`\n  PM2 Orbit running at http://localhost:${args.port}\n`);
  if (!args['no-open']) open(`http://localhost:${args.port}`);
}

main().catch((err) => {
  console.error('PM2 Orbit failed to start:', err.message);
  process.exit(1);
});
```

### ui/src/lib/utils.ts
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
```

### ui/src/main.tsx
```ts
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### ui/src/App.tsx
```ts
import { AppShell } from './components/layout/AppShell';
import { CommandPalette } from './components/command/CommandPalette';
import { Toaster } from 'sonner';
import { useWebSocket } from './hooks/useWebSocket';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  useWebSocket();
  useKeyboardShortcuts();

  return (
    <>
      <AppShell />
      <CommandPalette />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0px',
            fontFamily: 'Exo, sans-serif',
          },
        }}
      />
    </>
  );
}
```

### Server src/server.ts
```ts
import Fastify from 'fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { registerRoutes } from './routes';
import {
  createPm2Bridge, createEventHandler, createBufferStore,
  createBroadcaster, createAlertEngine, createSystemMetrics,
  createPersistence,
} from './core';

export interface ServerOpts {
  port: number;
  remote?: string;
}

export async function createServer(opts: ServerOpts) {
  const app = Fastify({ logger: false, trustProxy: false });

  const isDev = process.env.NODE_ENV === 'development';

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc:  ["'self'", "'unsafe-inline'"],
        imgSrc:    ["'self'", 'data:'],
        connectSrc: isDev
          ? ["'self'", 'ws:', 'wss:', 'http://127.0.0.1:5173', 'ws://127.0.0.1:5173']
          : ["'self'", 'ws:', 'wss:'],
        fontSrc:   ["'self'", 'data:'],
      },
    },
  });

  await app.register(fastifyRateLimit, { max: 100, timeWindow: '1 minute' });

  if (!isDev) {
    await app.register(fastifyStatic, {
      root: path.join(__dirname, 'dist-ui'),
      prefix: '/',
      decorateReply: false,
    });

    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Not found' });
      return reply.sendFile('index.html');
    });
  }

  const bridge = createPm2Bridge();
  const buffer = createBufferStore();
  const broadcaster = createBroadcaster();
  const system = createSystemMetrics();
  const alerts = createAlertEngine(buffer);
  const persistence = createPersistence();

  await bridge.connect();

  if (opts.remote) {
    await handleRemoteConnection(opts.remote);
  }

  const eventBus = createEventHandler(bridge, buffer, system);
  eventBus.start(broadcaster.broadcast, alerts.evaluate);

  registerRoutes(app, { bridge, buffer, broadcaster, system, alerts, persistence });

  // Health check route (unauthenticated, for reverse proxy checks)
  app.get('/api/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    version: require('../package.json').version,
    processes: bridge.list().length,
  }));

  app.get('/api/ping', async () => 'pong');

  async function shutdown(signal: string) {
    console.log(`\n  Received ${signal}. Shutting down gracefully...`);
    eventBus.stop();
    broadcaster.close();
    alerts.shutdown();
    persistence?.close();
    bridge.disconnect();
    await app.close();
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    process.exit(1);
  });

  return app;
}
```

---

## 17. Development Phases

### Phase 1 — Foundation (Days 1–2)
- [ ] Monorepo: `src/` (server) + `ui/` (frontend)
- [ ] `tsconfig.json` (server) + `ui/tsconfig.json` (frontend, path aliases)
- [ ] Vite + React 19 + TypeScript setup
- [ ] Tailwind CSS v4 with CSS-first config in `globals.css` (PM2 Keymetrics palette)
- [ ] Self-host Exo (300, 400) + JetBrains Mono (400) with `font-display: swap`
- [ ] Font-face declarations, Latin subsetting for ~60KB total
- [ ] Fastify serves built `dist-ui/index.html` (with Vite dev proxy fallback)
- [ ] `bin/pm2-orbit.js`: mri-based CLI, starts server, opens browser
- [ ] `npx pm2-orbit` works end-to-end

### Phase 2 — Design System + Components (Days 3–4)
- [ ] `globals.css` with full dark + light CSS variables (PM2 spec) — Tailwind v4 CSS-first config
- [ ] Custom components: Button, Input, Dialog, Dropdown, Tabs, Badge, ConfirmDialog, ConnectionDot, MetricPill
- [ ] Theme toggle (3-line hook, no dependency)
- [ ] Status dot with pulse-glow animation (respects `prefers-reduced-motion`)
- [ ] AppShell layout: header + content + status bar
- [ ] FOUC-free theme script in index.html

### Phase 3 — State + WebSocket (Days 5–6)
- [ ] `lib/ws.ts`: WS client with auto-reconnect (exponential backoff)
- [ ] `store/processes.ts`: Zustand Map-based store with stable references + `applyDelta` for events
- [ ] `store/system.ts`: host metrics store
- [ ] `store/ui.ts`: selection, theme, active tab
- [ ] `hooks/useWebSocket.ts`: connects, dispatches to stores
- [ ] Connection status reflected in UI

### Phase 4 — Backend Data Pipeline (Days 7–9)
- [ ] `bridge.ts`: PM2 event bus subscription (`pm2.launchBus()`), auto-reconnect
- [ ] `bus.ts`: Event handler layer (process:event, data:*)
- [ ] `buffer.ts`: typed circular buffer (Float32Array, Float64Array)
- [ ] `broadcaster.ts`: WebSocket server, fan-out on each event
- [ ] **Stale detection**: force refresh processes with no events in 10s
- [ ] **Full-list hash**: SHA-256 checksum to skip frontend re-processing on unchanged lists
- [ ] `/api/processes`, `/api/system` routes
- [ ] **`/api/health`, `/api/ping` routes** (unauthenticated for reverse proxy checks)
- [ ] pm2 as optionalDependency with graceful fallback error
- [ ] Graceful shutdown (SIGTERM/SIGINT + error handlers)
- [ ] **Health endpoint returns**: status, uptime, version, process count

### Phase 5 — Process Table + Virtualization (Days 10–13)
- [ ] System overview cards (CPU, Memory, Load, Network, Disk)
- [ ] `ProcessTable` with TanStack Table + TanStack Virtual
- [ ] `ProcessRow` with status dot, inline SVG sparkline, metrics
- [ ] `Sparkline` component (pure SVG, no library)
- [ ] Status badges with cyan glow
- [ ] Sort, filter, search wired to TanStack Table
- [ ] Row hover, selected states (PM2-style border-left + glow)
- [ ] Cluster mode worker breakdown
- [ ] Live event-driven data flowing from WS, table stays at 60fps with 1000+ processes

### Phase 6 — Detail Panel + uPlot Charts (Days 14–15)
- [ ] `ProcessDetail` slides in on row select
- [ ] `UPlotChart` wrapper component (themed via CSS vars)
- [ ] CPU timeline (uPlot, cyan gradient)
- [ ] Memory timeline (uPlot, purple gradient)
- [ ] Tabs: Overview, Metrics, Logs, Environment, Config
- [ ] `ActionMenu`: Restart, Reload, Stop, Scale, Flush, Signal, Delete
- [ ] `useProcessActions` with optimistic updates + Sonner toasts
- [ ] Delete confirmation dialog
- [ ] Env vars viewer with mask toggle

### Phase 7 — Logs (Days 16–17)
- [ ] `tailer.ts` SSE log stream (gzip when accepted)
- [ ] `LogViewer` rolling window, pause, search, level colors
- [ ] Regex search with cyan highlight
- [ ] Auto-scroll with manual override
- [ ] Download log buffer as `.txt`
- [ ] Merged view: all processes interleaved
- [ ] Status bar with connection dot, versions
- [ ] Log buffer size configurable via `PM2_ORBIT_LOG_BUFFER` env var

### Phase 8 — Alerts + Notifications (Days 18–19)
- [ ] `engine.ts` rule evaluation (indexed by process ID, zero allocations)
- [ ] `webhook.ts` outbound HTTP POST
- [ ] Slack webhook integration
- [ ] Discord webhook integration
- [ ] Email notification (SMTP, optional)
- [ ] Browser notifications
- [ ] `auth.ts` HMAC token verification
- [ ] **Token auth required for non-localhost bindings**
- [ ] Helmet + rate limiting wired (dynamic CSP for dev)
- [ ] Env var masking in UI
- [ ] Alert rules editor (native React state, no react-hook-form)
- [ ] Alert history panel
- [ ] Bell icon with unread count

### Phase 9 — SQLite Persistence + History (Days 20–21)
- [ ] `persistence/store.ts`: SQLite schema (process_history, system_history, settings)
- [ ] `migrations.ts`: auto-run schema migrations
- [ ] Batch write every 5s (INSERT, not upsert — append-only for time-series)
- [ ] `/api/history/:id`: return 24h of process metrics
- [ ] `/api/history/system`: return 24h of system metrics
- [ ] History page with time-range selector (1h / 6h / 24h)
- [ ] uPlot charts wired to historical data (not just live)
- [ ] Graceful fallback if `better-sqlite3` not installed

### Phase 10 — Remote Connections (Days 22–23)
- [ ] SSH tunnel manager (key-based auth)
- [ ] `/api/remote/connect` POST endpoint
- [ ] **Token auth mandatory for remote connections**
- [ ] Remote connection UI (add, list, status, disconnect)
- [ ] Remote PM2 event bus proxying
- [ ] Per-connection latency metrics

### Phase 11 — Command Palette + Polish (Days 24–25)
- [ ] `CommandPalette` (⌘K / Ctrl+K) with cmdk + fuzzy process search
- [ ] All keyboard shortcuts wired (R, S, L, ?, Esc, T, ⌘K)
- [ ] Auto-reconnect with exponential backoff
- [ ] Update-notifier
- [ ] CLI flags: `--port`, `--no-open`, `--theme`, `--remote`
- [ ] Help overlay (?)
- [ ] Responsive layout (≤900px stacks, ≤640px mobile)
- [ ] PWA manifest + service worker (offline-capable)
- [ ] README + GIF demo + badges
- [ ] npm publish

### Phase 12 — Open Source Readiness (Days 26–28)
- [ ] LICENSE file (MIT)
- [ ] CONTRIBUTING.md
- [ ] CODE_OF_CONDUCT.md
- [ ] SECURITY.md
- [ ] GitHub issue templates (bug, feature, question)
- [ ] GitHub PR template
- [ ] GitHub Actions CI (lint, typecheck, test, build)
- [ ] Semantic release + changelog automation
- [ ] Husky + lint-staged (pre-commit hooks)
- [ ] Vitest unit tests for core modules
- [ ] Vitest e2e tests for API routes
- [ ] React Testing Library tests for components
- [ ] Performance benchmark suite (k6 or autocannon)
- [ ] npm publish CI workflow

---

## 18. Performance Budget Verification

| Metric | Target | Strategy |
|---|---|---|
| Server idle RAM | < 35 MB | Zero framework on backend, typed arrays, 7 deps only (no node-os-utils) |
| Server peak RAM (1000 procs) | < 60 MB | 1.92 KB buffer × 1000 = 1.92 MB |
| Initial bundle (gz) | < 150 KB | React 19 + Zustand + TanStack Table + Virtual + uPlot + Lucide + cmdk + Sonner ≈ 140KB |
| Full bundle (gz) | < 250 KB | + Tailwind v4 CSS + theme tokens + fonts ≈ 210KB |
| Time to interactive | < 1.2 s | Vite esbuild + chunk splitting + lazy detail panel |
| **WS tick latency** | **< 5 ms** | **Event-driven via pm2.launchBus() — no polling, sub-ms IPC** |
| **Event bus reliability** | **10s stale + 5s full sync + hash check** | **Force refresh + skip re-processing on unchanged lists** |
| Process table FPS | 60 | Map-based Zustand + selector-based subscriptions + virtualization |
| Chart render (120 pts) | < 5 ms | uPlot canvas, typed arrays |
| Cold start | < 2 s | esbuild server bundle + Vite UI bundle |

---

## 19. Bundle Size Budget (Detailed)

| Library | Approx Size (gz) |
|---|---|
| react + react-dom | ~45 KB |
| zustand | ~1 KB |
| @tanstack/react-table | ~14 KB |
| @tanstack/react-virtual | ~3 KB |
| uplot | ~40 KB |
| lucide-react (used icons only) | ~5 KB |
| cmdk | ~10 KB |
| sonner | ~5 KB |
| clsx + tailwind-merge | ~2 KB |
| **App code** | ~15 KB |
| **Total initial** | **~140 KB gz** |
| Tailwind CSS v4 (purged) | ~12 KB |
| Fonts (Exo 300/400 + JetBrains Mono 400, woff2 Latin subset) | ~60 KB |
| **Total first paint** | **~210 KB gz** |

---

## 20. Do's and Don'ts (Final)

### Do
- ✅ Use **pm2.launchBus()** for event-driven updates (NO polling)
- ✅ Use **Map** for process storage in Zustand (referential stability)
- ✅ Use **narrow selectors** that return primitives or stable refs
- ✅ Use **typed arrays** (Float32Array, Float64Array) for history buffers
- ✅ Use **pure SVG** for sparklines (no chart library)
- ✅ Use **uPlot** only for full timeline charts
- ✅ Use **virtualization** for tables > 50 rows
- ✅ Use **`React.memo`** on row components
- ✅ Use **sharp corners** (0–2px) per PM2 spec
- ✅ Use **Exo font** at weight 300 for headings
- ✅ Use **cyan #019cf6** as the single dominant accent
- ✅ Use **inset glow shadows** for hero/selected surfaces
- ✅ Default to **dark mode** (PM2 brand)
- ✅ Lazy-load the process detail panel (with uPlot) via `React.lazy`
- ✅ Handle **pm2 as optionalDependency** with clear install guidance
- ✅ **Graceful shutdown** on SIGTERM/SIGINT
- ✅ **Index alert rules** by process ID for O(1) evaluation
- ✅ **Respect `prefers-reduced-motion`** for all animations
- ✅ **Configurable log buffer** via environment variable
- ✅ **Proxy WS through Vite** in development mode
- ✅ **10s stale detection** — force refresh processes with no events
- ✅ **Full-list hash** — skip frontend re-processing on unchanged lists
- ✅ **Health endpoints** — `/api/health` and `/api/ping` for reverse proxy checks
- ✅ **Token auth for non-localhost** — require `PM2_ORBIT_TOKEN` when binding to 0.0.0.0
- ✅ **Font subsetting** — Latin only, `font-display: swap`, ~60KB total
- ✅ **Built-in `os` module** — zero dependency for system metrics

### Don't
- ❌ Don't poll `pm2.list()` — subscribe to event bus instead
- ❌ Don't add Radix, shadcn, react-hook-form, zod, date-fns, next-themes, TanStack Query, Recharts
- ❌ Don't subscribe to full store in components — always use selectors
- ❌ Don't use plain JS arrays for time-series data — use typed arrays
- ❌ Don't render > 50 process rows without virtualization
- ❌ Don't use round border-radius — keep PM2 sharp aesthetic
- ❌ Don't use Inter or generic sans-serif — use Exo
- ❌ Don't use Recharts/D3/Chart.js for live monitoring — use uPlot
- ❌ Don't use external HTTP from server — fully self-hosted
- ❌ Don't ignore unused parameter warnings — use `_` prefix
- ❌ Don't use `node-os-utils` — use built-in `os` module instead
- ❌ Don't bind to 0.0.0.0 without requiring `PM2_ORBIT_TOKEN` auth
- ❌ Don't use `tailwind.config.ts` — Tailwind v4 uses CSS-first config in `globals.css`

---

## 21. Acceptance Criteria

A v1.0 release is ready when:

- [ ] `npx pm2-orbit` installs, starts, opens browser in < 2s
- [ ] Cold start bundle < 250 KB gzipped
- [ ] Server idle RAM < 35 MB
- [ ] **1000+ processes** render at 60fps in the table
- [ ] **Event-driven PM2 updates** via `pm2.launchBus()` — no polling
- [ ] **WS tick latency < 5ms** (measured with 1000 processes)
- [ ] **10s stale detection** — processes with no events are force-refreshed
- [ ] **Full-list hash** — frontend skips re-processing when list is unchanged
- [ ] Default theme is dark (PM2 purple #2b037a)
- [ ] All UI uses Exo font at weight 300 for headings
- [ ] All corners are sharp (0–2px)
- [ ] Cyan #019cf6 is the single dominant accent
- [ ] Inset glow shadows applied to hero cards and selected process
- [ ] System overview cards show host metrics correctly
- [ ] Process table is sortable, filterable, searchable
- [ ] Row click opens detail panel with CPU + memory uPlot charts
- [ ] All controls (restart, stop, start, reload, delete, scale) work
- [ ] Log viewer shows live SSE stream with pause, search, level colors
- [ ] Log buffer size configurable via `PM2_ORBIT_LOG_BUFFER`
- [ ] SSE stream is gzipped when client supports it
- [ ] Alert rules create, evaluate, fire webhooks + Slack + Discord + Email
- [ ] Alert rules indexed by process ID — zero GC pressure
- [ ] Light + dark + system theme works, persists across reloads
- [ ] No FOUC on theme switch
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Command palette (⌘K) opens, searches processes, triggers actions
- [ ] Keyboard shortcuts work: R, S, L, ?, Esc, T
- [ ] CLI flags: `--port`, `--no-open`, `--theme`, `--remote` (mri-based, supports space and `=` formats)
- [ ] Auth via `PM2_ORBIT_TOKEN` env var works
- [ ] **Token auth required for non-localhost bindings**
- [ ] **Health endpoints unauthenticated** — `/api/health` and `/api/ping` skip auth
- [ ] Helmet CSP, rate limiting active (CSP relaxed for Vite dev)
- [ ] Env vars masked by default
- [ ] No external HTTP calls from server
- [ ] **Graceful shutdown** on SIGTERM/SIGINT
- [ ] **Error handlers** for uncaughtException, unhandledRejection
- [ ] **pm2 is optionalDependency** with clear error if missing
- [ ] **SQLite persistence** for 24h history (optional, graceful fallback)
- [ ] **Remote connections** via SSH tunnel
- [ ] **Font subset to Latin** (~60KB total) with `font-display: swap`
- [ ] CI passes (lint, typecheck, test, build)
- [ ] README with GIF demo + badges
- [ ] Published to npm with semantic release

---

## 22. Open Source Governance

### Repository Structure
```
pm2-orbit/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              ← Lint, typecheck, test, build
│   │   ├── release.yml         ← Semantic release on main
│   │   └── benchmark.yml       ← Performance regression detection
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── config.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── src/                        ← Server code
├── ui/                         ← Frontend code
├── tests/                      ← Unit + integration tests
├── e2e/                        ← End-to-end tests
├── benchmarks/                 ← Performance benchmarks
├── bin/                        ← CLI entry point
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
├── CHANGELOG.md
└── README.md
```

### CI Pipeline (GitHub Actions)
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### Release Workflow
```yaml
# .github/workflows/release.yml
name: Release
on:
  push: { branches: [main] }
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run build
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

**Plan version 4.1 — React 19 + Vite + Tailwind v4 + Zustand + uPlot + TanStack Virtual + Event-Driven PM2, designed from the ground up for scale (1000+ processes), speed (< 5ms event latency, < 5ms chart render), and a tiny footprint (< 150KB gz initial, < 35MB server RAM). Design language extracted directly from `pm2.keymetrics.io`: purple canvas, cyan accent, Exo typography, sharp corners, cinematic inset glow shadows. Event bus reliability reinforced with 10s stale detection and full-list hash for efficient re-sync. System metrics via built-in `os` module — zero dependency. Health endpoints for reverse proxy monitoring. Token auth mandatory for non-localhost bindings. The only PM2 dashboard that listens, not polls.**
