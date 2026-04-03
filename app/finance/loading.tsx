import { CardSkeleton, GridSkeleton, TableSkeleton } from "@/components/loading-skeleton";

export default function FinanceLoading() {
  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="animate-pulse space-y-3">
          <div className="skeleton-shimmer h-10 w-40 rounded-full bg-white/10" />
          <div className="skeleton-shimmer h-4 w-72 rounded-full bg-white/10" />
        </div>
        <div className="flex gap-3">
          <div className="skeleton-shimmer h-11 w-44 rounded-2xl bg-white/10" />
          <div className="skeleton-shimmer h-11 w-36 rounded-2xl bg-white/10" />
        </div>
      </div>
      <GridSkeleton columns={3} count={6} className="md:grid-cols-3 xl:grid-cols-6" />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <TableSkeleton className="xl:col-span-2" rows={4} />
        <CardSkeleton className="h-full" />
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}
