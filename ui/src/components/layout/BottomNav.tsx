import { useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, Terminal, Bell, Clock, Settings } from "lucide-react";

const tabs = [
  { path: "/logs", label: "Logs", icon: Terminal, position: "left" },
  { path: "/alerts", label: "Alerts", icon: Bell, position: "left" },
  { path: "/processes", label: "Processes", icon: LayoutGrid, position: "center" },
  { path: "/history", label: "History", icon: Clock, position: "right" },
  { path: "/settings", label: "Settings", icon: Settings, position: "right" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="sm:hidden h-14 border-t border-border/60 flex items-center justify-around px-2 bg-card shrink-0 safe-area-bottom">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + "/");
        const Icon = tab.icon;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors cursor-pointer min-w-0 ${
              isActive
                ? "text-primary"
                : "text-muted-foreground/50"
            }`}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className={`text-[9px] font-medium tracking-wide ${isActive ? "text-primary" : ""}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
