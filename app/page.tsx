"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookUser,
  Calendar,
  DollarSign,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SEED_CONTACTS } from "@/lib/rolodex-seed";
import { RELATIONSHIP_TYPE_COLORS } from "@/lib/rolodex-types";
import type { AgentRecord } from "@/lib/agents";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

function getInitials(first?: string, last?: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function timeAgo(d?: string) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? `${days}d ago` : `${Math.floor(days / 7)}w ago`;
}

function relativeTime(value?: string | null) {
  if (!value) return "Just now";
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff) || diff < 60000) return "Just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function fmtCompactCurrency(value: number) {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
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
  totalExpenses: number;
  totalFailedRevenue: number;
  profit: number;
  profitMargin: number;
};

type FailedPayment = {
  customerName: string;
  amount: number;
  dueDate: string | null;
};

type FinanceResponse = {
  summary?: Partial<FinanceSummary>;
  failedPayments?: FailedPayment[];
};

type SnapshotRow = {
  id: string;
  month: string;
  gross_mrr: number;
  created_at: string;
};

type TaskRecord = {
  id: string;
  title: string;
  status: string;
  assignee?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AgentsApiRecord = AgentRecord & {
  created_at?: string | null;
  current_task?: string | null;
};

type ActivityItem = {
  id: string;
  title: string;
  meta: string;
  timestamp: string | null;
  tone: "emerald" | "blue";
};

const EMPTY_FINANCE_SUMMARY: FinanceSummary = {
  grossMRR: 0,
  arr: 0,
  activeSubscriptions: 0,
  totalStripeFees: 0,
  totalExpenses: 0,
  totalFailedRevenue: 0,
  profit: 0,
  profitMargin: 0,
};

export default function HomePage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary>(EMPTY_FINANCE_SUMMARY);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [mrrTrend, setMrrTrend] = useState<Array<{ month: string; value: number }>>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      try {
        const [financeRes, historyRes, agentsRes, tasksRes] = await Promise.all([
          fetch("/api/finance", { cache: "no-store" }),
          fetch("/api/finance/history", { cache: "no-store" }),
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/tasks", { cache: "no-store" }),
        ]);

        const [financeData, historyData, agentsData, tasksData]: [
          FinanceResponse,
          { snapshots?: SnapshotRow[] },
          { agents?: AgentsApiRecord[] } | AgentsApiRecord[],
          { tasks?: TaskRecord[] } | TaskRecord[],
        ] = await Promise.all([
          financeRes.json(),
          historyRes.json(),
          agentsRes.json(),
          tasksRes.json(),
        ]);

        if (cancelled) return;

        const summary = financeData?.summary || {};
        const nextFinanceSummary: FinanceSummary = {
          grossMRR: Number(summary.grossMRR || 0),
          arr: Number(summary.arr || Number(summary.grossMRR || 0) * 12),
          activeSubscriptions: Number(summary.activeSubscriptions || 0),
          totalStripeFees: Number(summary.totalStripeFees || 0),
          totalExpenses: Number(summary.totalExpenses || 0),
          totalFailedRevenue: Number(summary.totalFailedRevenue || 0),
          profit: Number(summary.profit || 0),
          profitMargin: Number(summary.profitMargin || 0),
        };
        setFinanceSummary(nextFinanceSummary);
        setFailedPayments(Array.isArray(financeData?.failedPayments) ? financeData.failedPayments : []);

        const rawAgents = Array.isArray(agentsData) ? agentsData : agentsData?.agents || [];
        const normalizedAgents = rawAgents.map((agent) => ({
          ...agent,
          currentTask: agent.currentTask || agent.current_task || "",
        }));
        setAgents(normalizedAgents);

        const snapshots = Array.isArray(historyData?.snapshots) ? historyData.snapshots : [];
        const trendSource = snapshots
          .slice(-5)
          .map((snapshot) => ({
            month: snapshot.month,
            value: Number(snapshot.gross_mrr || 0),
          }));
        const liveMonth = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
        }).format(new Date());
        setMrrTrend(
          [...trendSource, { month: liveMonth, value: nextFinanceSummary.grossMRR }].slice(-6)
        );

        const rawTasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || [];
        const completedTasks = rawTasks
          .filter((task) => task.status === "done")
          .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
          .slice(0, 4)
          .map((task) => ({
            id: `task-${task.id}`,
            title: task.title,
            meta: `Task completed${task.assignee ? ` by ${task.assignee}` : ""}`,
            timestamp: task.updated_at || task.created_at || null,
            tone: "emerald" as const,
          }));

        const spawnedAgents = rawAgents
          .filter((agent) => agent.created_at)
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 3)
          .map((agent) => ({
            id: `agent-${agent.id}`,
            title: `${agent.name} added`,
            meta: `${agent.role} in ${agent.department}`,
            timestamp: agent.created_at || null,
            tone: "blue" as const,
          }));

        setActivityFeed(
          [...completedTasks, ...spawnedAgents]
            .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
            .slice(0, 6)
        );
      } catch {
        if (cancelled) return;
        setFinanceSummary(EMPTY_FINANCE_SUMMARY);
        setFailedPayments([]);
        setAgents([]);
        setMrrTrend([]);
        setActivityFeed([]);
      }
    }

    loadHomeData();
    return () => {
      cancelled = true;
    };
  }, []);

  const contacts = SEED_CONTACTS.filter((c) => !c.archived);
  const now = Date.now();
  const goingCold = contacts.filter((c) => c.lastContactedAt && (now - new Date(c.lastContactedAt).getTime()) / 86400000 > 30);
  const overdue = contacts.filter((c) => c.nextFollowUp && new Date(c.nextFollowUp) <= new Date());
  const strongCount = contacts.filter((c) => c.relationshipScore >= 75).length;
  const aiAgents = agents.filter((a) => a.type === "agent");
  const activeAgents = aiAgents.filter((a) => a.status === "working" || a.status === "active");
  const currentArr = financeSummary.arr || financeSummary.grossMRR * 12;
  const arrTarget = 1000000;
  const arrProgress = Math.min(Math.round((currentArr / arrTarget) * 100), 100);
  const failedPaymentsCount = failedPayments.length;
  const failedPaymentsTotal = failedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const trendOption = {
    animationDuration: 700,
    grid: { left: 8, right: 8, top: 16, bottom: 12, containLabel: true },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(7, 12, 24, 0.95)",
      borderColor: "rgba(32,147,255,0.25)",
      textStyle: { color: "#E2E8F0" },
      valueFormatter: (value: number) => fmtCurrency(value),
    },
    xAxis: {
      type: "category",
      data: mrrTrend.map((point) => formatMonthLabel(point.month)),
      axisLine: { lineStyle: { color: "rgba(148, 163, 184, 0.18)" } },
      axisTick: { show: false },
      axisLabel: { color: "#64748B", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.08)" } },
      axisLabel: {
        color: "#64748B",
        fontSize: 10,
        formatter: (value: number) => fmtCompactCurrency(value),
      },
    },
    series: [
      {
        name: "MRR",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        data: mrrTrend.map((point) => point.value),
        lineStyle: { width: 3, color: "#22C55E" },
        itemStyle: { color: "#22C55E", borderColor: "#b6f3c5", borderWidth: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(34, 197, 94, 0.32)" },
              { offset: 1, color: "rgba(34, 197, 94, 0.02)" },
            ],
          },
        },
      },
    ],
  };

  return (
    <div className="space-y-6 animate-enter">
      <div className="glass-panel p-5">
        <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Derby Digital</p>
        <h1 className="mt-1 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-[22px] font-bold text-transparent">Command Center</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Gross MRR",
            value: fmtCompactCurrency(financeSummary.grossMRR),
            sub: `${financeSummary.activeSubscriptions} active subscribers`,
            color: "text-emerald-400",
            icon: DollarSign,
          },
          {
            label: "Net Profit",
            value: fmtCompactCurrency(financeSummary.profit),
            sub: `${financeSummary.profitMargin.toFixed(1)}% margin`,
            color: financeSummary.profit >= 0 ? "text-blue-400" : "text-red-400",
            icon: TrendingUp,
          },
          {
            label: "Subscribers",
            value: `${financeSummary.activeSubscriptions}`,
            sub: `${fmtCompactCurrency(financeSummary.totalStripeFees)} Stripe fees`,
            color: "text-cyan-400",
            icon: Users,
          },
          {
            label: "AI Agents",
            value: `${activeAgents.length}/${aiAgents.length}`,
            sub: "active right now",
            color: "text-indigo-400",
            icon: Zap,
          },
        ].map((s) => (
          <div key={s.label} className="glass-panel flex items-start gap-3 p-4">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04]", s.color)}>
              <s.icon size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
              <p className={cn("mt-0.5 font-mono text-[20px] font-bold", s.color)}>{s.value}</p>
              <p className="text-[10px] text-slate-500">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Live Business Metrics</p>
              <p className="text-[11px] text-slate-500">6-month MRR trend from snapshots plus live current month</p>
            </div>
            <Link href="/finance" className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
              Finance <ArrowRight size={10} />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[12px] uppercase tracking-[0.22em] text-slate-500">Current Gross MRR</p>
              <p className="mt-3 font-mono text-[42px] font-bold leading-none text-white">{fmtCurrency(financeSummary.grossMRR)}</p>
              <div className="mt-4 flex items-center gap-5 text-[11px] text-slate-500">
                <span>{financeSummary.activeSubscriptions} subscribers</span>
                <span>{fmtCurrency(financeSummary.profit)} profit</span>
              </div>
              <div className="mt-6">
                <div className="mb-1 flex justify-between text-[10px] text-slate-500">
                  <span>{fmtCompactCurrency(currentArr)} ARR</span>
                  <span>{arrProgress}% of $1M</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-1000"
                    style={{ width: `${arrProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="h-[220px] rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              {mrrTrend.length > 0 ? (
                <ReactECharts option={trendOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
              ) : (
                <div className="flex h-full items-center justify-center text-[11px] text-slate-500">No MRR trend data yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Failed Payments</p>
            <AlertTriangle size={14} className={failedPaymentsCount > 0 ? "text-amber-400" : "text-slate-600"} />
          </div>
          <div className={cn("rounded-2xl border p-4", failedPaymentsCount > 0 ? "border-amber-400/20 bg-amber-500/10" : "border-white/[0.06] bg-white/[0.02]")}>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">At Risk</p>
            <p className={cn("mt-2 font-mono text-[32px] font-bold", failedPaymentsCount > 0 ? "text-amber-300" : "text-white")}>{failedPaymentsCount}</p>
            <p className="text-[11px] text-slate-400">{fmtCurrency(failedPaymentsTotal)} in failed revenue</p>
            <div className="mt-4 space-y-2">
              {failedPayments.slice(0, 3).map((payment) => (
                <div key={`${payment.customerName}-${payment.dueDate ?? "no-date"}-${payment.amount}`} className="rounded-xl bg-black/20 px-3 py-2">
                  <p className="truncate text-[12px] font-medium text-white">{payment.customerName}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{payment.dueDate ? relativeTime(payment.dueDate) : "Due date unavailable"}</span>
                    <span className="font-mono text-amber-300">{fmtCurrency(payment.amount)}</span>
                  </div>
                </div>
              ))}
              {failedPaymentsCount === 0 && <p className="text-[11px] text-slate-500">No failed payments detected this month.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recent Activity</p>
            <Target size={14} className="text-blue-400" />
          </div>
          <div className="space-y-2.5">
            {activityFeed.map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3">
                <div className={cn("mt-0.5 h-2.5 w-2.5 rounded-full", item.tone === "emerald" ? "bg-emerald-400" : "bg-blue-400")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium text-white">{item.title}</p>
                  <p className="text-[10px] text-slate-500">{item.meta}</p>
                </div>
                <span className="whitespace-nowrap text-[9px] uppercase text-slate-600">{relativeTime(item.timestamp)}</span>
              </div>
            ))}
            {activityFeed.length === 0 && <p className="text-[11px] text-slate-500">No recent task or agent activity available.</p>}
          </div>
        </div>

        <div className="glass-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Agent Status</p>
            <Link href="/agents" className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
              View all <ArrowRight size={10} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {aiAgents.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] text-[11px] font-bold text-slate-300">
                    {a.name[0]}
                  </div>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0f]",
                      a.status === "active" || a.status === "working" ? "bg-emerald-400" : a.status === "idle" ? "bg-amber-400" : "bg-slate-600"
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white">{a.name}</p>
                  <p className="truncate text-[10px] text-slate-500">{a.currentTask || a.role}</p>
                </div>
                <span className="text-[9px] uppercase text-slate-600">{a.status}</span>
              </div>
            ))}
            {aiAgents.length === 0 && <p className="text-[11px] text-slate-500">No agents available.</p>}
          </div>
        </div>

        <div className="glass-panel p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Finance Snapshot</p>
          <div className="space-y-3">
            {[
              { name: "Gross MRR", value: financeSummary.grossMRR, color: "bg-emerald-500" },
              { name: "Profit", value: financeSummary.profit, color: financeSummary.profit >= 0 ? "bg-blue-500" : "bg-red-500" },
              { name: "Expenses", value: financeSummary.totalExpenses, color: "bg-pink-500" },
            ].map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-slate-400">{item.name}</span>
                  <span className="font-mono text-white">{fmtCurrency(item.value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={cn("h-full rounded-full transition-all", item.color)}
                    style={{ width: `${financeSummary.grossMRR > 0 ? Math.min((Math.abs(item.value) / financeSummary.grossMRR) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-white/[0.06] pt-3">
            <p className="mb-2 text-[9px] uppercase tracking-wider text-slate-500">Metrics</p>
            {[
              { name: "ARR", value: fmtCurrency(currentArr) },
              { name: "Goal Progress", value: `${arrProgress}%` },
              { name: "Failed Revenue", value: fmtCurrency(failedPaymentsTotal) },
            ].map((item) => (
              <div key={item.name} className="flex justify-between py-1 text-[10px]">
                <span className="text-slate-500">{item.name}</span>
                <span className="font-mono text-slate-300">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Needs Attention</p>
            <Link href="/rolodex" className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
              Rolodex <ArrowRight size={10} />
            </Link>
          </div>
          {overdue.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[9px] uppercase tracking-wider text-red-400">Overdue Follow-ups</p>
              {overdue.slice(0, 3).map((c) => (
                <Link key={c.id} href={`/rolodex/${c.id}`} className="-mx-1 flex items-center gap-2 rounded px-1 py-1.5 transition-colors hover:bg-white/[0.03]">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold"
                    style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}
                  >
                    {getInitials(c.firstName, c.lastName)}
                  </div>
                  <span className="flex-1 truncate text-[11px] text-white">{c.firstName} {c.lastName}</span>
                  <span className="text-[10px] text-red-400">{timeAgo(c.nextFollowUp)}</span>
                </Link>
              ))}
            </div>
          )}
          {goingCold.length > 0 && (
            <div>
              <p className="mb-1.5 text-[9px] uppercase tracking-wider text-amber-400">Going Cold</p>
              {goingCold.slice(0, 3).map((c) => (
                <Link key={c.id} href={`/rolodex/${c.id}`} className="-mx-1 flex items-center gap-2 rounded px-1 py-1.5 transition-colors hover:bg-white/[0.03]">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold"
                    style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}
                  >
                    {getInitials(c.firstName, c.lastName)}
                  </div>
                  <span className="flex-1 truncate text-[11px] text-white">{c.firstName} {c.lastName}</span>
                  <span className="text-[10px] text-amber-400">{timeAgo(c.lastContactedAt)}</span>
                </Link>
              ))}
            </div>
          )}
          {overdue.length === 0 && goingCold.length === 0 && <p className="text-[11px] text-slate-500">No rolodex follow-ups need attention right now.</p>}
        </div>

        <div className="glass-panel p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Relationship Health</p>
          <div className="space-y-3">
            {[
              { name: "Total Contacts", value: `${contacts.length}`, color: "text-indigo-300" },
              { name: "Strong Relationships", value: `${strongCount}`, color: "text-emerald-300" },
              { name: "Overdue Follow-ups", value: `${overdue.length}`, color: "text-red-300" },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-3">
                <span className="text-[11px] text-slate-400">{item.name}</span>
                <span className={cn("font-mono text-sm font-bold", item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quick Actions</p>
          <div className="space-y-2">
            {[
              { href: "/spothopper", label: "SpotHopper Intel", desc: "265 KY restaurant leads", icon: Target, color: "text-red-400" },
              { href: "/office", label: "The Office", desc: "See your team working", icon: Users, color: "text-blue-400" },
              { href: "/rolodex", label: "Rolodex", desc: `${contacts.length} contacts`, icon: BookUser, color: "text-indigo-400" },
              { href: "/tasks", label: "Tasks", desc: "Kanban board", icon: Calendar, color: "text-cyan-400" },
              { href: "/finance", label: "Finance", desc: `${fmtCompactCurrency(financeSummary.grossMRR)} MRR`, icon: DollarSign, color: "text-emerald-400" },
            ].map((q) => (
              <Link key={q.href} href={q.href} className="group flex items-center gap-3 rounded-lg p-2.5 transition-all hover:bg-white/[0.04]">
                <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]", q.color)}>
                  <q.icon size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-white transition-colors group-hover:text-blue-300">{q.label}</p>
                  <p className="text-[10px] text-slate-500">{q.desc}</p>
                </div>
                <ArrowRight size={12} className="text-slate-600 transition-colors group-hover:text-white" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
