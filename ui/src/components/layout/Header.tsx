import { Sun, Moon, Monitor, Search } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/store/ui";
import { useLocation, useNavigate } from "react-router-dom";
import { ConnectionDot } from "@/components/shared/ConnectionDot";
import { AlertBadge } from "@/components/alerts/AlertBadge";

export function Header() {
  const { theme, setTheme, resolved } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const wsStatus = useUIStore((s) => s.wsStatus);

  const themeLabels: Record<string, string> = { dark: "Dark", light: "Light", system: "System" };

  const toggleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const ThemeIcon = resolved === "dark" ? Moon : Sun;

  const tabs = [
    { path: "/processes", label: "Processes" },
    { path: "/logs", label: "Logs" },
    { path: "/alerts", label: "Alerts" },
    { path: "/history", label: "History" },
    { path: "/settings", label: "Settings" },
  ];

  return (
    <header className="h-12 sm:h-14 border-b border-border/60 flex items-center px-2 sm:px-6 shrink-0">
      {/* Logo — always visible */}
      <div className="shrink-0 mr-3 sm:mr-6">
        <div className="font-light text-sm sm:text-base tracking-[0.15em] text-primary select-none whitespace-nowrap">
          PM2 ORBIT
        </div>
      </div>

      {/* Nav — desktop only */}
      <nav className="hidden sm:flex flex-1 items-center justify-center gap-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + "/");
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`text-[12px] font-medium uppercase tracking-[0.08em] transition-all cursor-pointer h-14 flex items-center border-b-2 shrink-0 px-3 ${
                isActive
                  ? "text-primary border-primary"
                  : "text-muted-foreground/50 hover:text-foreground border-transparent"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Spacer for mobile */}
      <div className="flex-1 sm:hidden" />

      {/* Right icons */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
          }}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer rounded-md hover:bg-subtle/30"
          title="Command palette"
        >
          <Search size={14} />
        </button>

        <a
          href="https://github.com/ihssmaheel-dev/pm2-orbit"
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 w-8 hidden sm:flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer rounded-md hover:bg-subtle/30"
          title="GitHub"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.303 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>

        <button
          onClick={toggleTheme}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer rounded-md hover:bg-subtle/30"
          title={`Theme: ${themeLabels[theme] || theme}`}
        >
          {theme === "system" ? <Monitor size={14} /> : <ThemeIcon size={14} />}
        </button>

        <AlertBadge onClick={() => navigate("/alerts/history")} />

        <div className="h-5 w-px bg-border/40 mx-0.5 hidden sm:block" />

        <div className="flex items-center px-1">
          <ConnectionDot connected={wsStatus === "connected"} />
        </div>
      </div>
    </header>
  );
}
