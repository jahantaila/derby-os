"use client";

import { useData } from "@/lib/hooks";
import type { ReportItem } from "@/lib/mission-control";

export default function ReportsPage() {
  const { data: reports, loading } = useData<ReportItem[]>("/api/reports", []);

  if (loading) return <div className="text-sm text-slate-300">Loading reports...</div>;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-300">Agency report index pulled from Alex and Sabri project directories.</p>
      </div>

      <div className="grid gap-3">
        {reports.map((report) => (
          <article key={report.id} className="glass-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4">
            <div>
              <h2 className="font-semibold text-white">{report.title}</h2>
              <p className="text-sm text-slate-300">
                {report.type} · {report.client} · by {report.generatedBy}
              </p>
              <p className="mt-1 text-xs text-slate-400">Generated: {report.dateGenerated}</p>
            </div>
            <a
              href={report.path}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-2 text-xs text-blue-100 transition hover:border-blue-200/50"
            >
              View
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
