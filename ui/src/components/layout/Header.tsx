import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useUIStore } from '@/store/ui';
import { ConnectionDot } from '@/components/shared/ConnectionDot';
import { AlertBadge } from '@/components/alerts/AlertBadge';

export function Header() {
  const { theme, setTheme, resolved } = useTheme();
  const activeTab = useUIStore((s) => s.activeTab);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const ThemeIcon = resolved === 'dark' ? Moon : Sun;

  const tabs = [
    { id: 'processes' as const, label: 'Processes' },
    { id: 'logs' as const, label: 'Logs' },
    { id: 'alerts' as const, label: 'Alerts' },
    { id: 'history' as const, label: 'History' },
    { id: 'settings' as const, label: 'Settings' },
  ];

  return (
    <header className="h-14 border-b border-border flex items-center px-4 gap-4 shrink-0">
      <div className="font-light text-lg tracking-[0.2em] text-primary select-none">
        PM2 ORBIT
      </div>

      <nav className="flex gap-4 ml-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-sm uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary -mb-[2px]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title={`Theme: ${theme}`}
        >
          {theme === 'system' ? <Monitor size={16} /> : <ThemeIcon size={16} />}
        </button>

        <AlertBadge onClick={() => setActiveTab('alerts')} />

        <ConnectionDot connected={true} />
      </div>
    </header>
  );
}
