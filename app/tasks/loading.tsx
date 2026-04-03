import { CardSkeleton, GridSkeleton, TableSkeleton } from "@/components/loading-skeleton";

export default function TasksLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,#020611_0%,#07101f_48%,#020611_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="glass-panel rounded-[32px] p-6">
          <div className="animate-pulse space-y-4">
            <div className="skeleton-shimmer h-3 w-28 rounded-full bg-white/10" />
            <div className="skeleton-shimmer h-10 w-[min(100%,34rem)] rounded-full bg-white/10" />
            <div className="skeleton-shimmer h-4 w-[min(100%,44rem)] rounded-full bg-white/10" />
          </div>
        </section>
        <GridSkeleton columns={2} count={4} className="xl:grid-cols-4" />
        <TableSkeleton rows={6} />
        <div className="grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <CardSkeleton key={index} className="min-h-[240px]" />
          ))}
        </div>
      </div>
    </div>
  );
}
