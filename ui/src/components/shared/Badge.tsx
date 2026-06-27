import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'accent' | 'outline';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary-subtle text-primary border border-primary/20',
  success: 'bg-success-subtle text-success border border-success/20',
  warning: 'bg-warning-subtle text-warning border border-warning/20',
  destructive: 'bg-destructive-subtle text-destructive border border-destructive/20',
  accent: 'bg-accent/10 text-accent border border-accent/20',
  outline: 'bg-transparent text-foreground border border-border',
};

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-normal uppercase tracking-wider',
        'rounded-none',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
