"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDown, ArrowUp, Building2, ChevronLeft, ChevronRight, CreditCard,
  DollarSign, Edit3, ExternalLink, Filter, Minus, Plus, Receipt, Search,
  TrendingDown, TrendingUp, Trash2, Users, X, Zap, RefreshCw, Check,
  AlertCircle, Clock, Repeat, CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CLIENT_FINANCES, GENERAL_RECURRING, EMPLOYEE_EXPENSES, MARCH_SUMMARY,
  type ClientFinance, type FinanceLineItem, type GeneralExpense,
} from "@/lib/finance-seed";

const ReactEChartsCore = dynamic(() => import("echarts-for-react"), { ssr: false });

// ─── Helpers ───
const fmt = (n: number) => n < 0
  ? `-$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : fmt(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

type Tab = "overview" | "clients" | "expenses" | "stripe";

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedClient, setSelectedClient] = useState<ClientFinance | null>(null);
  const [search, setSearch] = useState("");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [stripeData, setStripeData] = useState<any>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "churned" | "paused">("all");

  // Load Stripe data
  const loadStripe = useCallback(async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/finance?month=2026-03");
      const data = await res.json();
      setStripeData(data);
    } catch (e) {
      console.error("Stripe fetch failed:", e);
    }
    setStripeLoading(false);
  }, []);

  useEffect(() => { loadStripe(); }, [loadStripe]);

  const summary = MARCH_SUMMARY;
  const activeClients = CLIENT_FINANCES.filter(c => c.status === "active");
  const filteredClients = CLIENT_FINANCES.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ─── Charts ───
  const revenueByClientChart = useMemo(() => ({
    tooltip: { trigger: "axis" as const, backgroundColor: "#1a1a2e", borderColor: "#2093FF44", textStyle: { color: "#fff", fontSize: 11 } },
    grid: { top: 8, right: 8, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: activeClients.sort((a, b) => b.grossRevenue - a.grossRevenue).slice(0, 15).map(c => c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name),
      axisLabel: { color: "#64748b", fontSize: 9, rotate: 45 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    yAxis: { type: "value" as const, axisLabel: { color: "#64748b", fontSize: 9, formatter: (v: number) => `$${v}` }, splitLine: { lineStyle: { color: "#ffffff08" } } },
    series: [{
      type: "bar",
      data: activeClients.sort((a, b) => b.grossRevenue - a.grossRevenue).slice(0, 15).map(c => ({
        value: c.grossRevenue,
        itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#2093FF" }, { offset: 1, color: "#0026FF" }] }, borderRadius: [4, 4, 0, 0] },
      })),
      barWidth: "60%",
    }],
  }), [activeClients]);

  const expenseBreakdownChart = useMemo(() => {
    const categories = [
      { name: "Software & Tools", value: GENERAL_RECURRING.reduce((s, e) => s + (["software", "fulfillment", "other"].includes(e.category) ? e.amount : 0), 0), color: "#2093FF" },
      { name: "Marketing", value: GENERAL_RECURRING.reduce((s, e) => s + (e.category === "marketing" ? e.amount : 0), 0), color: "#F93C3C" },
      { name: "Hosting", value: GENERAL_RECURRING.reduce((s, e) => s + (e.category === "hosting" ? e.amount : 0), 0), color: "#22C55E" },
      { name: "Payroll", value: EMPLOYEE_EXPENSES.reduce((s, e) => s + e.amount, 0), color: "#FFBD59" },
      { name: "Client Costs", value: summary.totalClientExpenses, color: "#8B5CF6" },
      { name: "Stripe Fees", value: summary.totalStripeFees, color: "#EC4899" },
    ].filter(c => c.value > 0);
    return {
      tooltip: { backgroundColor: "#1a1a2e", borderColor: "#2093FF44", textStyle: { color: "#fff", fontSize: 11 }, formatter: (p: any) => `${p.name}: ${fmt(p.value)}` },
      series: [{
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "50%"],
        data: categories.map(c => ({ name: c.name, value: Math.round(c.value * 100) / 100, itemStyle: { color: c.color } })),
        label: { show: true, color: "#94a3b8", fontSize: 10, formatter: "{b}\n{d}%" },
        emphasis: { label: { fontSize: 12, fontWeight: "bold" } },
      }],
    };
  }, [summary]);

  const profitMarginChart = useMemo(() => ({
    tooltip: { trigger: "axis" as const, backgroundColor: "#1a1a2e", borderColor: "#2093FF44", textStyle: { color: "#fff", fontSize: 11 } },
    grid: { top: 8, right: 8, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: activeClients.filter(c => c.grossRevenue > 0).sort((a, b) => a.profitMargin - b.profitMargin).slice(0, 15).map(c => c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name),
      axisLabel: { color: "#64748b", fontSize: 9, rotate: 45 },
      axisLine: { show: false }, axisTick: { show: false },
    },
    yAxis: { type: "value" as const, axisLabel: { color: "#64748b", fontSize: 9, formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: "#ffffff08" } }, max: 100 },
    series: [{
      type: "bar",
      data: activeClients.filter(c => c.grossRevenue > 0).sort((a, b) => a.profitMargin - b.profitMargin).slice(0, 15).map(c => ({
        value: c.profitMargin,
        itemStyle: { color: c.profitMargin > 90 ? "#22C55E" : c.profitMargin > 50 ? "#FFBD59" : "#F93C3C", borderRadius: [4, 4, 0, 0] },
      })),
      barWidth: "60%",
    }],
  }), [activeClients]);

  // ─── Render ───
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-slate-500 text-sm mt-1">March 2026 — Derby Digital P&L</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadStripe} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm border border-white/10">
            <RefreshCw className={cn("w-4 h-4", stripeLoading && "animate-spin")} />
            Sync Stripe
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Gross Revenue", value: fmt(summary.grossRevenue), icon: DollarSign, color: "#22C55E" },
          { label: "Net Profit", value: fmt(summary.netProfit), icon: TrendingUp, color: "#2093FF" },
          { label: "Profit Margin", value: pct(summary.profitMargin), icon: Zap, color: "#FFBD59" },
          { label: "Total Expenses", value: fmt(summary.totalExpenditure), icon: Receipt, color: "#F93C3C" },
          { label: "Active Clients", value: String(summary.activeClients), icon: Users, color: "#8B5CF6" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className="text-xl font-semibold font-mono">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 border border-white/[0.06] w-fit">
        {(["overview", "clients", "expenses", "stripe"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 rounded-md text-sm font-medium capitalize transition-all",
              tab === t ? "bg-[#2093FF] text-white" : "text-slate-400 hover:text-white hover:bg-white/5")}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Client */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-300 mb-4">Revenue by Client (Top 15)</h3>
            <ReactEChartsCore option={revenueByClientChart} style={{ height: 300 }} />
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-300 mb-4">Expense Breakdown</h3>
            <ReactEChartsCore option={expenseBreakdownChart} style={{ height: 300 }} />
          </div>

          {/* Profit Margin by Client */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-300 mb-4">Profit Margins (Lowest 15)</h3>
            <ReactEChartsCore option={profitMarginChart} style={{ height: 300 }} />
          </div>

          {/* Quick Stats */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-slate-300 mb-4">March Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: "Client Revenue", value: summary.grossRevenue, color: "#22C55E" },
                { label: "Stripe Fees", value: -summary.totalStripeFees, color: "#EC4899" },
                { label: "Client-Specific Costs", value: -summary.totalClientExpenses, color: "#8B5CF6" },
                { label: "General Recurring", value: -summary.generalRecurring, color: "#2093FF" },
                { label: "Employee Costs", value: -summary.employeeExpenses, color: "#FFBD59" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                    <span className="text-sm text-slate-400">{row.label}</span>
                  </div>
                  <span className={cn("text-sm font-mono font-medium", row.value < 0 ? "text-red-400" : "text-green-400")}>
                    {row.value < 0 ? `-${fmt(Math.abs(row.value))}` : fmt(row.value)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-sm font-medium text-white">Net Profit</span>
                <span className="text-lg font-mono font-bold text-green-400">{fmt(summary.netProfit)}</span>
              </div>
            </div>

            {/* ARR Progress */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Annual Run Rate → $1M Goal</span>
                <span className="text-sm font-mono text-[#2093FF]">{fmt(summary.grossRevenue * 12)}</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2093FF] to-[#0026FF] transition-all"
                  style={{ width: `${Math.min((summary.grossRevenue * 12) / 1000000 * 100, 100)}%` }} />
              </div>
              <p className="text-[10px] text-slate-600 mt-1 text-right">{pct(summary.grossRevenue * 12 / 1000000 * 100)} of $1M</p>
            </div>
          </div>
        </div>
      )}

      {tab === "clients" && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:border-[#2093FF] outline-none" />
            </div>
            <div className="flex gap-1">
              {(["all", "active", "churned", "paused"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={cn("px-3 py-2 rounded-lg text-xs font-medium capitalize",
                    statusFilter === s ? "bg-[#2093FF] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}>
                  {s} {s === "all" ? `(${CLIENT_FINANCES.length})` : `(${CLIENT_FINANCES.filter(c => c.status === s).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Client Detail Panel */}
          {selectedClient && (
            <div className="bg-white/[0.03] border border-[#2093FF]/30 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedClient.name}</h3>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full",
                    selectedClient.status === "active" ? "bg-green-500/10 text-green-400" :
                    selectedClient.status === "churned" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400")}>
                    {selectedClient.status}
                  </span>
                </div>
                <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase">Gross Revenue</p>
                  <p className="text-lg font-mono font-semibold text-green-400">{fmt(selectedClient.grossRevenue)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase">Stripe Fee</p>
                  <p className="text-lg font-mono font-semibold text-pink-400">{fmt(selectedClient.grossRevenue - selectedClient.stripeFee)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase">Expenses</p>
                  <p className="text-lg font-mono font-semibold text-red-400">{fmt(selectedClient.totalExpenditure)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase">Net Profit</p>
                  <p className={cn("text-lg font-mono font-semibold", selectedClient.netProfit >= 0 ? "text-green-400" : "text-red-400")}>{fmt(selectedClient.netProfit)}</p>
                </div>
              </div>

              {selectedClient.manuCut && (
                <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4" />
                  Manu&apos;s cut: {fmt(selectedClient.manuCut)} (50/50 split)
                </div>
              )}

              {/* Income Lines */}
              {selectedClient.income.length > 0 && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Income</h4>
                  <div className="space-y-1">
                    {selectedClient.income.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg">
                        <div className="flex items-center gap-2">
                          {item.type === "recurring" ? <Repeat className="w-3 h-3 text-green-400" /> : <CircleDot className="w-3 h-3 text-blue-400" />}
                          <span className="text-sm">{item.name}</span>
                          {item.notes && <span className="text-[10px] text-slate-600">— {item.notes}</span>}
                        </div>
                        <span className="text-sm font-mono text-green-400">{fmt(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expense Lines */}
              {selectedClient.expenses.length > 0 && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Expenses</h4>
                  <div className="space-y-1">
                    {selectedClient.expenses.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg">
                        <div className="flex items-center gap-2">
                          {item.type === "recurring" ? <Repeat className="w-3 h-3 text-yellow-400" /> : <CircleDot className="w-3 h-3 text-red-400" />}
                          <span className="text-sm">{item.name}</span>
                          {item.notes && <span className="text-[10px] text-slate-600">— {item.notes}</span>}
                        </div>
                        <span className="text-sm font-mono text-red-400">-{fmt(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Client Table */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Client</th>
                  <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Revenue</th>
                  <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Stripe Fee</th>
                  <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Expenses</th>
                  <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Net Profit</th>
                  <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Margin</th>
                  <th className="text-center text-[11px] text-slate-500 uppercase tracking-wider p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.sort((a, b) => b.grossRevenue - a.grossRevenue).map(client => (
                  <tr key={client.id} onClick={() => setSelectedClient(client)}
                    className={cn("border-b border-white/[0.03] cursor-pointer transition-colors",
                      selectedClient?.id === client.id ? "bg-[#2093FF]/10" : "hover:bg-white/[0.03]")}>
                    <td className="p-4">
                      <span className="text-sm font-medium">{client.name}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-mono text-green-400">{client.grossRevenue > 0 ? fmt(client.grossRevenue) : "—"}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-mono text-pink-400">{client.grossRevenue > 0 ? fmt(client.grossRevenue - client.stripeFee) : "—"}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-mono text-red-400">{client.totalExpenditure > 0 ? fmt(client.totalExpenditure) : "—"}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn("text-sm font-mono font-medium", client.netProfit >= 0 ? "text-green-400" : "text-red-400")}>
                        {client.netProfit !== 0 ? fmt(client.netProfit) : "—"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn("text-sm font-mono",
                        client.profitMargin > 90 ? "text-green-400" : client.profitMargin > 50 ? "text-yellow-400" : "text-red-400")}>
                        {client.profitMargin > 0 ? pct(client.profitMargin) : "—"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full",
                        client.status === "active" ? "bg-green-500/10 text-green-400" :
                        client.status === "churned" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400")}>
                        {client.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "expenses" && (
        <div className="space-y-6">
          {/* General Recurring */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Recurring Expenses</h3>
              <span className="text-sm font-mono text-red-400">{fmt(GENERAL_RECURRING.reduce((s, e) => s + e.amount, 0))}/mo</span>
            </div>
            <div className="space-y-1">
              {GENERAL_RECURRING.map(e => (
                <div key={e.id} className="flex items-center justify-between py-2.5 px-3 bg-white/[0.02] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Repeat className="w-3.5 h-3.5 text-blue-400" />
                    <div>
                      <span className="text-sm">{e.name}</span>
                      {e.notes && <p className="text-[10px] text-slate-600">{e.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 capitalize")}>{e.category}</span>
                    <span className="text-sm font-mono text-red-400">{fmt(e.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Employee Expenses */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Employee & Contractor Expenses</h3>
              <span className="text-sm font-mono text-red-400">{fmt(EMPLOYEE_EXPENSES.reduce((s, e) => s + e.amount, 0))}/mo</span>
            </div>
            <div className="space-y-1">
              {EMPLOYEE_EXPENSES.map(e => (
                <div key={e.id} className="flex items-center justify-between py-2.5 px-3 bg-white/[0.02] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-3.5 h-3.5 text-yellow-400" />
                    <div>
                      <span className="text-sm">{e.name}</span>
                      {e.notes && <p className="text-[10px] text-slate-600">{e.notes}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-mono text-red-400">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client-Specific Expenses */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-300">Client-Specific Expenses</h3>
              <span className="text-sm font-mono text-red-400">{fmt(CLIENT_FINANCES.reduce((s, c) => s + c.totalExpenditure, 0))}/mo</span>
            </div>
            <div className="space-y-1">
              {CLIENT_FINANCES.filter(c => c.expenses.length > 0).map(c => (
                <div key={c.id}>
                  {c.expenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-2.5 px-3 bg-white/[0.02] rounded-lg mb-1">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-3.5 h-3.5 text-purple-400" />
                        <div>
                          <span className="text-sm">{c.name}</span>
                          <p className="text-[10px] text-slate-600">{e.name}{e.notes ? ` — ${e.notes}` : ""}</p>
                        </div>
                      </div>
                      <span className="text-sm font-mono text-red-400">{fmt(e.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "stripe" && (
        <div className="space-y-6">
          {stripeLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-[#2093FF] animate-spin" />
              <span className="ml-3 text-slate-400">Loading Stripe data...</span>
            </div>
          ) : stripeData ? (
            <>
              {/* Stripe KPIs */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase">Stripe Revenue (MTD)</p>
                  <p className="text-xl font-mono font-semibold text-green-400">{fmt(stripeData.totalRevenue)}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase">Stripe Fees</p>
                  <p className="text-xl font-mono font-semibold text-pink-400">{fmt(stripeData.totalFees)}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase">Payments</p>
                  <p className="text-xl font-mono font-semibold text-white">{stripeData.chargeCount}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase">Active Subscriptions</p>
                  <p className="text-xl font-mono font-semibold text-[#2093FF]">{stripeData.subscriptionCount}</p>
                </div>
              </div>

              {/* Stripe Customers Table */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-sm font-medium text-slate-300">March Payments from Stripe</h3>
                  <p className="text-[10px] text-slate-600 mt-1">Live data from your Stripe account — {stripeData.customerCount} customers with payments this month</p>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Customer</th>
                      <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Email</th>
                      <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Amount</th>
                      <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Stripe Fee</th>
                      <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Net</th>
                      <th className="text-center text-[11px] text-slate-500 uppercase tracking-wider p-4">Payments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stripeData.customers.map((cust: any) => (
                      <tr key={cust.stripeId} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                        <td className="p-4">
                          <span className="text-sm font-medium">{cust.name}</span>
                          {cust.hasSubscription && <Repeat className="inline w-3 h-3 text-blue-400 ml-2" />}
                        </td>
                        <td className="p-4 text-sm text-slate-500">{cust.email || "—"}</td>
                        <td className="p-4 text-right text-sm font-mono text-green-400">{fmt(cust.totalRevenue)}</td>
                        <td className="p-4 text-right text-sm font-mono text-pink-400">{fmt(cust.stripeFee)}</td>
                        <td className="p-4 text-right text-sm font-mono text-white">{fmt(cust.totalRevenue - cust.stripeFee)}</td>
                        <td className="p-4 text-center text-sm font-mono text-slate-400">{cust.charges.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stripe vs Spreadsheet comparison */}
              <div className="bg-white/[0.03] border border-yellow-500/20 rounded-xl p-5">
                <h3 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Stripe vs Spreadsheet Comparison
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Spreadsheet (Full Month)</p>
                    <p className="text-lg font-mono font-semibold text-white">{fmt(summary.grossRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Stripe (MTD)</p>
                    <p className="text-lg font-mono font-semibold text-white">{fmt(stripeData.totalRevenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Remaining Expected</p>
                    <p className="text-lg font-mono font-semibold text-yellow-400">
                      {fmt(Math.max(0, summary.grossRevenue - stripeData.totalRevenue))}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 mt-3">
                  {stripeData.totalRevenue >= summary.grossRevenue
                    ? "✅ All expected payments received"
                    : `⏳ ${Math.round((summary.grossRevenue - stripeData.totalRevenue) / summary.grossRevenue * 100)}% of payments still pending — ${31 - new Date().getDate()} days left in March`}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500">
              <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>Failed to load Stripe data. Click &quot;Sync Stripe&quot; to retry.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
