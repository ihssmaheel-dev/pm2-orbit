// Shared column layout for the process table.
// Header (ProcessTable) and rows (ProcessRow) MUST use these exact classes so
// widths and responsive visibility always stay in sync.

// Columns appear progressively as the viewport grows. Because the table shares
// the row with a fixed 420px detail panel from `lg` up, columns are gated so the
// visible set always fits without horizontal overflow and never disappears as the
// screen widens:
//   base (<sm): Name, CPU, Status   (tap a row to open detail + actions)
//   sm:        + Memory, Actions
//   xl:        + Mode, Restarts, History (sparkline)
//   2xl:       + PID, Uptime
export const COL = {
  name: "flex-1 min-w-0",
  mode: "hidden xl:block w-20",
  pid: "hidden 2xl:block w-20",
  cpu: "w-20 sm:w-24",
  memory: "hidden sm:block w-24",
  restarts: "hidden xl:block w-16",
  sparkline: "hidden xl:flex w-[104px]",
  status: "w-[76px] sm:w-[96px]",
  uptime: "hidden 2xl:block w-[112px]",
  actions: "hidden sm:flex w-[76px]",
} as const;

// Outer row padding (header + row) — tighter on mobile for more content space.
export const ROW_PAD = "px-3 sm:px-5";
