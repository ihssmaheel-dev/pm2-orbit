import { cn } from '@/lib/utils';

interface ConnectionDotProps {
  connected: boolean;
  className?: string;
}

export function ConnectionDot({ connected, className }: ConnectionDotProps) {
  return (
    <div
      className={cn(
        'w-2 h-2 rounded-full transition-colors',
        connected ? 'bg-success' : 'bg-destructive',
        className,
      )}
    />
  );
}
