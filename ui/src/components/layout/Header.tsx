import { Sun, Moon, Monitor } from "lucide-react";
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
    <header className="h-12 border-b border-border flex items-center px-4 shrink-0 bg-background">
      <div className="hidden sm:block w-[120px] shrink-0">
        <div className="font-semibold text-sm tracking-tight text-foreground select-none cursor-pointer" onClick={() => navigate('/')}>
          PM2 Orbit
        </div>
      </div>

      <nav className="flex-1 flex justify-start sm:justify-center gap-1 min-w-0 px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + "/");
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                isActive
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="w-auto sm:w-[120px] flex items-center justify-end gap-1 shrink-0">
        <button
          onClick={toggleTheme}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
          title={`Theme: ${theme}`}
        >
          {theme === "system" ? <Monitor size={16} /> : <ThemeIcon size={16} />}
        </button>

        <AlertBadge onClick={() => navigate("/alerts")} />

        <ConnectionDot connected={wsStatus === "connected"} />
      </div>
    </header>
  );
}
