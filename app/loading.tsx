import { CardSkeleton, GridSkeleton, TableSkeleton } from "@/components/loading-skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-5">
        <div className="animate-pulse space-y-3">
          <div className="skeleton-shimmer h-3 w-28 rounded-full bg-white/10" />
          <div className="skeleton-shimmer h-9 w-56 rounded-full bg-white/10" />
        </div>
      </div>
      <GridSkeleton columns={2} count={4} className="lg:grid-cols-4" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TableSkeleton rows={4} />
        </div>
        <CardSkeleton className="h-full" />
      </div>
    </div>
  );
}
