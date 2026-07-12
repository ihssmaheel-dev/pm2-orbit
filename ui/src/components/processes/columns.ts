// Shared column layout for the process table.
// Header (ProcessTable) and rows (ProcessRow) MUST use these exact classes so
// widths and responsive visibility always stay in sync.

export const COL = {
  name: "flex-1 min-w-0",
  mode: "hidden md:block w-20",
  pid: "hidden lg:block w-20",
  cpu: "w-20 sm:w-24",
  memory: "w-20 sm:w-24",
  restarts: "hidden sm:block w-16",
  sparkline: "hidden md:flex w-[104px]",
  status: "w-[96px]",
  uptime: "hidden lg:block w-[112px]",
  actions: "w-[76px]",
} as const;

// Horizontal padding applied to every cell (header + row) for consistent gutters.
export const CELL_PAD = "px-3";
