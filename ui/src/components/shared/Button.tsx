import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'outline' | 'accent' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  default:
    'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-deep',
  outline:
    'border border-primary bg-transparent text-foreground hover:bg-primary hover:text-primary-foreground',
  accent:
    'border border-accent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-subtle text-foreground',
  destructive:
    'border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-white',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
  icon: 'h-10 w-10',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-sans uppercase tracking-wider font-normal transition-all duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:opacity-50 disabled:pointer-events-none',
        'rounded-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
