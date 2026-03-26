"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BookUser, Calendar, DollarSign, Target, Users, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SEED_CONTACTS } from "@/lib/rolodex-seed";
import { RELATIONSHIP_TYPE_COLORS } from "@/lib/rolodex-types";
import type { AgentRecord } from "@/lib/agents";

function getInitials(first?: string, last?: string) { return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?"; }
function timeAgo(d?: string) { if (!d) return "—"; const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return days === 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`; }
function fmtCompactCurrency(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
function fmtCurrency(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type FinanceSummary = {
  grossMRR: number;
  arr: number;
  activeSubscriptions: number;
  totalStripeFees: number;
  profit: number;
  profitMargin: number;
};

type FinanceResponse = {
  summary?: Partial<FinanceSummary>;
};

export default function HomePage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>({
    grossMRR: 0,
    arr: 0,
    activeSubscriptions: 0,
    totalStripeFees: 0,
    profit: 0,
    profitMargin: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      try {
        const [financeRes, agentsRes] = await Promise.all([
          fetch("/api/finance", { cache: "no-store" }),
          fetch("/api/agents", { cache: "no-store" }),
        ]);

        const [financeData, agentsData]: [FinanceResponse, { agents?: AgentRecord[] } | AgentRecord[]] = await Promise.all([
          financeRes.json(),
          agentsRes.json(),
        ]);

        if (cancelled) return;

        const summary = financeData?.summary || {};
        setFinanceSummary({
          grossMRR: Number(summary.grossMRR || 0),
          arr: Number(summary.arr || 0),
          activeSubscriptions: Number(summary.activeSubscriptions || 0),
          totalStripeFees: Number(summary.totalStripeFees || 0),
          profit: Number(summary.profit || 0),
          profitMargin: Number(summary.profitMargin || 0),
        });

        const rawAgents = Array.isArray(agentsData) ? agentsData : agentsData?.agents || [];
        const normalizedAgents = rawAgents.map((agent: any) => ({
          ...agent,
          currentTask: agent.currentTask || agent.current_task || null,
        }));
        setAgents(normalizedAgents);
      } catch {
        if (!cancelled) {
          setFinanceSummary({
            grossMRR: 0,
            arr: 0,
            activeSubscriptions: 0,
            totalStripeFees: 0,
            profit: 0,
            profitMargin: 0,
          });
          setAgents([]);
        }
      }
    }

    loadHomeData();
    return () => { cancelled = true; };
  }, []);

  const contacts = SEED_CONTACTS.filter(c => !c.archived);
  const now = Date.now();
  const goingCold = contacts.filter(c => c.lastContactedAt && (now - new Date(c.lastContactedAt).getTime()) / 86400000 > 30);
  const overdue = contacts.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) <= new Date());
  const strongCount = contacts.filter(c => c.relationshipScore >= 75).length;
  const aiAgents = agents.filter(a => a.type === "agent");
  const activeAgents = aiAgents.filter(a => a.status === "working");
  const currentArr = financeSummary.grossMRR * 12;
  const arrTarget = 1000000;
  const arrProgress = Math.min(Math.round((currentArr / arrTarget) * 100), 100);

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="glass-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Derby Digital</p>
        <h1 className="text-[22px] font-bold mt-1 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Command Center</h1>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "MRR", value: fmtCompactCurrency(financeSummary.grossMRR), sub: `${arrProgress}% to $1M ARR`, color: "text-emerald-400", icon: DollarSign },
          { label: "Subscribers", value: `${financeSummary.activeSubscriptions}`, sub: `${fmtCompactCurrency(financeSummary.grossMRR)} MRR`, color: "text-blue-400", icon: Users },
          { label: "Relationships", value: `${contacts.length}`, sub: `${strongCount} strong`, color: "text-indigo-400", icon: BookUser },
          { label: "AI Agents", value: `${activeAgents.length}/${aiAgents.length}`, sub: "active", color: "text-cyan-400", icon: Zap },
        ].map(s => (
          <div key={s.label} className="glass-panel p-4 flex items-start gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04]", s.color)}>
              <s.icon size={16} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className={cn("text-[20px] font-bold font-mono mt-0.5", s.color)}>{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* MRR Overview */}
        <div className="lg:col-span-2 glass-panel p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">MRR Overview</p>
            <p className="text-[11px] text-slate-500">Live from finance API</p>
          </div>
          <div className="h-[180px] flex flex-col justify-center">
            <p className="text-[12px] text-slate-500 uppercase tracking-[0.22em]">Current Gross MRR</p>
            <p className="text-[44px] leading-none font-bold font-mono mt-3 text-white">{fmtCurrency(financeSummary.grossMRR)}</p>
            <div className="mt-4 flex items-center gap-5 text-[11px] text-slate-500">
              <span>{financeSummary.activeSubscriptions} active subscriptions</span>
              <span>{fmtCurrency(currentArr)} ARR</span>
            </div>
          </div>
          {/* ARR progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>{fmtCompactCurrency(currentArr)} ARR</span>
              <span>$1M target</span>
            </div>
            <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
                style={{ width: `${arrProgress}%` }} />
            </div>
          </div>
        </div>

        {/* Agent Status */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Agent Status</p>
            <Link href="/agents" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">View all <ArrowRight size={10} /></Link>
          </div>
          <div className="space-y-2.5">
            {aiAgents.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-[11px] font-bold text-slate-300">
                    {a.name[0]}
                  </div>
                  <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0f]",
                    a.status === "active" || a.status === "working" ? "bg-emerald-400" : a.status === "idle" ? "bg-amber-400" : "bg-slate-600"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white font-medium">{a.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{a.currentTask || a.role}</p>
                </div>
                <span className="text-[9px] text-slate-600 uppercase">{a.status}</span>
              </div>
            ))}
            {aiAgents.length === 0 && (
              <p className="text-[11px] text-slate-500">No agents available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Relationships needing attention */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Needs Attention</p>
            <Link href="/rolodex" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">Rolodex <ArrowRight size={10} /></Link>
          </div>
          {overdue.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] text-red-400 uppercase tracking-wider mb-1.5">Overdue Follow-ups</p>
              {overdue.slice(0, 3).map(c => (
                <Link key={c.id} href={`/rolodex/${c.id}`} className="flex items-center gap-2 py-1.5 hover:bg-white/[0.03] rounded px-1 -mx-1 transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold"
                    style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                    {getInitials(c.firstName, c.lastName)}
                  </div>
                  <span className="text-[11px] text-white flex-1 truncate">{c.firstName} {c.lastName}</span>
                  <span className="text-[10px] text-red-400">{timeAgo(c.nextFollowUp)}</span>
                </Link>
              ))}
            </div>
          )}
          {goingCold.length > 0 && (
            <div>
              <p className="text-[9px] text-amber-400 uppercase tracking-wider mb-1.5">Going Cold</p>
              {goingCold.slice(0, 3).map(c => (
                <Link key={c.id} href={`/rolodex/${c.id}`} className="flex items-center gap-2 py-1.5 hover:bg-white/[0.03] rounded px-1 -mx-1 transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold"
                    style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                    {getInitials(c.firstName, c.lastName)}
                  </div>
                  <span className="text-[11px] text-white flex-1 truncate">{c.firstName} {c.lastName}</span>
                  <span className="text-[10px] text-amber-400">{timeAgo(c.lastContactedAt)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Revenue by type */}
        <div className="glass-panel p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Finance Snapshot</p>
          <div className="space-y-3">
            {[
              { name: "Gross MRR", value: financeSummary.grossMRR, color: "bg-emerald-500" },
              { name: "Profit", value: financeSummary.profit, color: "bg-blue-500" },
              { name: "Stripe Fees", value: financeSummary.totalStripeFees, color: "bg-pink-500" },
            ].map(item => (
              <div key={item.name}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{item.name}</span>
                  <span className="text-white font-mono">{fmtCurrency(item.value)}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", item.color)}
                    style={{ width: `${financeSummary.grossMRR > 0 ? Math.min((item.value / financeSummary.grossMRR) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Metrics</p>
            {[
              { name: "Net Margin", value: `${financeSummary.profitMargin.toFixed(1)}%` },
              { name: "ARR", value: fmtCurrency(currentArr) },
              { name: "Subscriptions", value: `${financeSummary.activeSubscriptions}` },
            ].map(item => (
              <div key={item.name} className="flex justify-between text-[10px] py-1">
                <span className="text-slate-500">{item.name}</span>
                <span className="text-slate-300 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="glass-panel p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="space-y-2">
            {[
              { href: "/spothopper", label: "SpotHopper Intel", desc: "265 KY restaurant leads", icon: Target, color: "text-red-400" },
              { href: "/office", label: "The Office", desc: "See your team working", icon: Users, color: "text-blue-400" },
              { href: "/rolodex", label: "Rolodex", desc: `${contacts.length} contacts`, icon: BookUser, color: "text-indigo-400" },
              { href: "/tasks", label: "Tasks", desc: "Kanban board", icon: Calendar, color: "text-cyan-400" },
              { href: "/finance", label: "Finance", desc: `${fmtCompactCurrency(financeSummary.grossMRR)} MRR`, icon: DollarSign, color: "text-emerald-400" },
            ].map(q => (
              <Link key={q.href} href={q.href} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.04] transition-all group">
                <div className={cn("w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center", q.color)}>
                  <q.icon size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-white group-hover:text-blue-300 transition-colors">{q.label}</p>
                  <p className="text-[10px] text-slate-500">{q.desc}</p>
                </div>
                <ArrowRight size={12} className="text-slate-600 group-hover:text-white transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
