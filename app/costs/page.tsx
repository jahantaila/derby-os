"use client";

import { useMemo } from "react";
import { useData } from "@/lib/hooks";
import type { CostEntry } from "@/lib/mission-control";

export default function CostsPage() {
  const { data: costs, loading } = useData<CostEntry[]>("/api/costs", []);

  const totals = useMemo(() => {
    const today = "2026-03-08";
    const weekPrefix = "2026-03";
    const monthPrefix = "2026-03";

    const totalToday = costs.filter((entry) => entry.date === today).reduce((sum, entry) => sum + entry.cost, 0);
    const totalWeek = costs.filter((entry) => entry.date.startsWith(weekPrefix)).reduce((sum, entry) => sum + entry.cost, 0);
    const totalMonth = costs.filter((entry) => entry.date.startsWith(monthPrefix)).reduce((sum, entry) => sum + entry.cost, 0);

    const byAgent = costs.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.agent] = (acc[entry.agent] || 0) + entry.cost;
      return acc;
    }, {});

    return { totalToday, totalWeek, totalMonth, byAgent };
  }, [costs]);

  if (loading) return <div className="text-sm text-slate-300">Loading costs...</div>;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold text-white">Costs</h1>
        <p className="mt-1 text-sm text-slate-300">AI token usage, agent breakdown, and budget tracking.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="glass-surface rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Today</p>
          <p className="mt-2 text-2xl font-semibold text-white">${totals.totalToday.toFixed(2)}</p>
        </article>
        <article className="glass-surface rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">This Week</p>
          <p className="mt-2 text-2xl font-semibold text-white">${totals.totalWeek.toFixed(2)}</p>
        </article>
        <article className="glass-surface rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">This Month</p>
          <p className="mt-2 text-2xl font-semibold text-white">${totals.totalMonth.toFixed(2)}</p>
        </article>
      </div>

      <article className="glass-surface rounded-2xl p-4">
        <h2 className="mb-3 text-sm uppercase tracking-wide text-blue-200/80">Cost By Agent</h2>
        <div className="space-y-2">
          {Object.entries(totals.byAgent).map(([agent, amount]) => (
            <div key={agent} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100">
              {agent}: ${amount.toFixed(2)}
            </div>
          ))}
        </div>
      </article>

      <div className="glass-surface overflow-x-auto rounded-2xl p-3">
        <table className="w-full min-w-[900px] text-sm text-slate-200">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Agent</th>
              <th className="px-3 py-2 text-left">Task</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Input Tokens</th>
              <th className="px-3 py-2 text-left">Output Tokens</th>
              <th className="px-3 py-2 text-left">Cost</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((entry) => (
              <tr key={entry.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="px-3 py-2">{entry.date}</td>
                <td className="px-3 py-2">{entry.agent}</td>
                <td className="px-3 py-2">{entry.task}</td>
                <td className="px-3 py-2">{entry.model}</td>
                <td className="px-3 py-2">{entry.inputTokens.toLocaleString()}</td>
                <td className="px-3 py-2">{entry.outputTokens.toLocaleString()}</td>
                <td className="px-3 py-2">${entry.cost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
