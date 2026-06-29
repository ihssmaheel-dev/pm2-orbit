interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-subtle/40 ${className}`}
    />
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-0.5 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 h-11">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-12 ml-auto" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card border border-border/50 px-4 py-3.5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-3.5 rounded" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="h-5 w-24 mb-2" />
      <Skeleton className="h-1 w-full rounded-full" />
    </div>
  );
}
