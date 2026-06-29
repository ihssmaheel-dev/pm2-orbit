import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/store/ui";
import { ConnectionDot } from "@/components/shared/ConnectionDot";
import { AlertBadge } from "@/components/alerts/AlertBadge";

interface HeaderProps {
  wsStatus: "connecting" | "connected" | "disconnected";
}

export function Header({ wsStatus }: HeaderProps) {
  const { theme, setTheme, resolved } = useTheme();
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const toggleTheme = () => {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("system");
    else setTheme("dark");
  };

  const ThemeIcon = resolved === "dark" ? Moon : Sun;

  const tabs = [
    { id: "processes" as const, label: "Processes" },
    { id: "logs" as const, label: "Logs" },
    { id: "alerts" as const, label: "Alerts" },
    { id: "history" as const, label: "History" },
    { id: "settings" as const, label: "Settings" },
  ];

  return (
    <header className="h-14 border-b border-border flex items-center px-2 sm:px-6 shrink-0 overflow-x-auto">
      <div className="hidden sm:block w-[140px] shrink-0">
        <div className="font-light text-lg tracking-[0.2em] text-primary select-none">
          PM2 ORBIT
        </div>
      </div>

      <nav className="flex-1 flex justify-start sm:justify-center gap-1 sm:gap-6 min-w-0 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[11px] sm:text-sm uppercase tracking-wider transition-all cursor-pointer h-14 flex items-center border-b-2 shrink-0 px-1.5 sm:px-0 ${
              activeTab === tab.id
                ? "text-primary border-primary"
                : "text-muted-foreground hover:text-foreground border-transparent hover:border-border"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="w-auto sm:w-[140px] flex items-center justify-end gap-1 sm:gap-2 shrink-0">
        <button
          onClick={toggleTheme}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title={`Theme: ${theme}`}
        >
          {theme === "system" ? <Monitor size={16} /> : <ThemeIcon size={16} />}
        </button>

        <AlertBadge onClick={() => setActiveTab("alerts")} />

        <ConnectionDot connected={wsStatus === "connected"} />
      </div>
    </header>
  );
}
