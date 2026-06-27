import { Bell } from 'lucide-react';
import { useAlertsStore } from '@/store/alerts';

interface AlertBadgeProps {
  onClick?: () => void;
}

export function AlertBadge({ onClick }: AlertBadgeProps) {
  const history = useAlertsStore((s) => s.history);
  const count = history.length;

  return (
    <button
      onClick={onClick}
      className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
    >
      <Bell size={16} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 text-[9px] font-mono bg-destructive text-white flex items-center justify-center rounded-full">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
