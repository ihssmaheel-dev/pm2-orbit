import { cn } from '@/lib/utils';

interface ConnectionDotProps {
  connected: boolean;
  className?: string;
}

export function ConnectionDot({ connected, className }: ConnectionDotProps) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {connected && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
      )}
      <span
        className={cn(
          'relative inline-flex h-2 w-2 rounded-full transition-colors',
          connected ? 'bg-success' : 'bg-destructive',
          className,
        )}
      />
    </span>
  );
}
