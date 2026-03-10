import { cn } from "@/lib/utils";

type CardSkeletonProps = {
  className?: string;
};

type GridSkeletonProps = {
  className?: string;
  columns?: 2 | 3;
  count?: 4 | 9;
};

type TableSkeletonProps = {
  className?: string;
  rows?: number;
};

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={cn("glass-card overflow-hidden rounded-2xl p-4 sm:p-5", className)}>
      <div className="animate-pulse space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/10" />
          <div className="h-4 w-16 rounded-full bg-white/10" />
        </div>
        <div className="h-8 w-20 rounded-xl bg-white/10" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-white/10" />
          <div className="h-3 w-2/3 rounded-full bg-white/10" />
          <div className="h-3 w-1/2 rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ className, columns = 2, count }: GridSkeletonProps) {
  const total = count ?? (columns === 3 ? 9 : 4);

  return (
    <div className={cn("grid gap-4", columns === 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2", className)}>
      {Array.from({ length: total }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function TableSkeleton({ className, rows = 5 }: TableSkeletonProps) {
  return (
    <div className={cn("glass-panel rounded-2xl p-4 sm:p-5", className)}>
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-40 rounded-full bg-white/10" />
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="glass-card rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="h-3 w-1/3 rounded-full bg-white/10" />
              <div className="h-3 w-20 rounded-full bg-white/10" />
            </div>
            <div className="mt-3 h-3 w-2/3 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}
