import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full px-3 bg-input border border-border text-foreground text-sm',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-1 focus:ring-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'rounded-none',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
