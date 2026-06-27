import { Sun, Moon, Bell } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { ConnectionDot } from '@/components/shared/ConnectionDot';

export function Header() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  return (
    <header className="h-14 border-b border-border flex items-center px-4 gap-4 shrink-0">
      <div className="font-light text-lg tracking-[0.2em] text-primary select-none">
        PM2 ORBIT
      </div>

      <nav className="flex gap-4 ml-8">
        {['Processes', 'Logs', 'Alerts', 'History', 'Settings'].map((item) => (
          <button
            key={item}
            className="text-sm text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title={`Theme: ${theme}`}
        >
          {theme === 'dark' ? <Moon size={16} /> : theme === 'light' ? <Sun size={16} /> : <Sun size={16} />}
        </button>

        <button className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell size={16} />
        </button>

        <ConnectionDot connected={true} />
      </div>
    </header>
  );
}
