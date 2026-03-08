"use client";

import Link from "next/link";
import { Activity, Bot, CircleDollarSign, DollarSign, TrendingUp, Users } from "lucide-react";
import { useData } from "@/lib/hooks";
import type { ActivityItem, Client, CostEntry, TeamMember } from "@/lib/mission-control";

function relativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(deltaMs / 60000));
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const quickActions = [
  { href: "/clients", label: "New Client" },
  { href: "/tasks", label: "Assign Task" },
  { href: "/reports", label: "View Reports" },
];

export default function Home() {
  const { data: team } = useData<TeamMember[]>("/api/team", []);
  const { data: clients } = useData<Client[]>("/api/clients", []);
  const { data: activity } = useData<ActivityItem[]>("/api/activity", []);
  const { data: costs } = useData<CostEntry[]>("/api/costs", []);

  const activeAgents = team.filter((member) => member.type === "AI" && member.status === "active").length;
  const adSpend = clients.reduce((sum, client) => sum + client.monthSpend, 0);
  const totalLeads = clients.reduce((sum, client) => sum + client.monthLeads, 0);
  const agencyRevenue = clients.reduce((sum, client) => sum + client.monthlyBudget, 0);
  const agentCosts = costs.reduce((sum, entry) => sum + entry.cost, 0);

  return (
    <section className="space-y-7">
      <div className="glass-surface relative overflow-hidden rounded-3xl px-6 py-7">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(32,147,255,0.35),rgba(32,147,255,0)_70%)]" />
        <p className="text-xs uppercase tracking-[0.26em] text-blue-200/75">Command Center</p>
        <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Derby Digital Mission Control</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300 md:text-base">
          Real-time agency snapshot for team activity, client performance, and operating costs.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-blue-100 transition hover:border-blue-300/40 hover:bg-white/15"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Active Agents", value: activeAgents, icon: Bot },
          { label: "Active Clients", value: clients.length, icon: Users },
          { label: "Total Ad Spend", value: `$${adSpend.toLocaleString()}`, icon: TrendingUp },
          { label: "Total Leads", value: totalLeads, icon: Activity },
          { label: "Agency Revenue", value: `$${agencyRevenue.toLocaleString()}`, icon: DollarSign },
          { label: "Agent Costs", value: `$${agentCosts.toFixed(2)}`, icon: CircleDollarSign },
        ].map((item) => (
          <article
            key={item.label}
            className="glass-surface rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5 hover:border-blue-300/35"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{item.label}</p>
              <item.icon size={18} className="text-blue-200" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </article>
        ))}
      </div>

      <article className="glass-surface rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Activity Feed</h2>
          <span className="rounded-full border border-blue-300/30 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-100">
            Live
          </span>
        </div>

        <div className="space-y-3">
          {activity
            .slice()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200 transition hover:border-white/20"
              >
                <p>
                  <span className="font-semibold text-blue-100">{item.agent}</span> {item.action}
                </p>
                <p className="mt-1 text-xs text-slate-400">{relativeTime(item.timestamp)}</p>
              </div>
            ))}
        </div>
      </article>
    </section>
  );
}
