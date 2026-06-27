import { cn } from '@/lib/utils';
import type { ProcessStatus } from '@/types/pm2';

const statusColors: Record<ProcessStatus, string> = {
  online: 'bg-success',
  stopped: 'bg-muted-foreground',
  errored: 'bg-destructive',
  launching: 'bg-warning',
  stopping: 'bg-warning',
};

interface StatusDotProps {
  status: ProcessStatus;
  className?: string;
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span className={cn('relative inline-flex h-2 w-2', className)}>
      {status === 'online' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75 motion-safe:animate-[ping_1.5s_ease-in-out_infinite]" />
      )}
      <span
        className={cn(
          'relative inline-flex h-2 w-2 rounded-full',
          statusColors[status],
        )}
      />
    </span>
  );
}
