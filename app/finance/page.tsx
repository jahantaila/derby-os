"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, CreditCard, DollarSign, Minus, Plus, Receipt, RefreshCw,
  TrendingUp, Trash2, Users, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const fmt = (n: number) => `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${n < 0 ? "" : ""}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

const CATEGORIES = ["software", "payroll", "marketing", "hosting", "fulfillment", "operations", "other"] as const;
const CAT_COLORS: Record<string, string> = {
  software: "#2093FF", payroll: "#FFBD59", marketing: "#F93C3C", hosting: "#22C55E",
  fulfillment: "#8B5CF6", operations: "#06B6D4", other: "#64748b",
};

type Tab = "overview" | "clients" | "expenses";

interface Expense {
  id: string;
  name: string;
  amount: number;
  type: string;
  category: string;
  client_id?: string;
  client_name?: string;
  notes?: string;
  month: string;
}

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [search, setSearch] = useState("");


  // New expense form
  const [newExp, setNewExp] = useState({ name: "", amount: "", type: "recurring", category: "other", client_name: "", notes: "" });

  const month = "2026-03"; // Current month

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/finance?month=${month}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const addExpense = async () => {
    if (!newExp.name || !newExp.amount) return;
    try {
      await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newExp, amount: parseFloat(newExp.amount), month }),
      });
      setNewExp({ name: "", amount: "", type: "recurring", category: "other", client_name: "", notes: "" });
      setShowAddExpense(false);
      load();
    } catch (e: any) {
      alert("Failed to add expense: " + e.message);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await fetch("/api/finance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      load();
    } catch (e: any) {
      alert("Failed: " + e.message);
    }
  };

  const summary = data?.summary || {};
  const customers = data?.customers || [];
  const expenses: Expense[] = data?.expenses || [];
  const filteredCustomers = customers.filter((c: any) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Charts
  const revenueChart = useMemo(() => {
    const sorted = [...(customers as any[])].filter(c => c.mrr > 0).sort((a, b) => b.mrr - a.mrr).slice(0, 15);
    return {
      tooltip: { trigger: "axis" as const, backgroundColor: "#1a1a2e", borderColor: "#2093FF44", textStyle: { color: "#fff", fontSize: 11 } },
      grid: { top: 8, right: 8, bottom: 24, left: 8, containLabel: true },
      xAxis: { type: "category" as const, data: sorted.map(c => c.name.length > 14 ? c.name.slice(0, 14) + "…" : c.name), axisLabel: { color: "#64748b", fontSize: 9, rotate: 45 }, axisLine: { show: false }, axisTick: { show: false } },
      yAxis: { type: "value" as const, axisLabel: { color: "#64748b", fontSize: 9, formatter: (v: number) => `$${v}` }, splitLine: { lineStyle: { color: "#ffffff08" } } },
      series: [{ type: "bar", data: sorted.map(c => ({ value: c.mrr, itemStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#2093FF" }, { offset: 1, color: "#0026FF" }] }, borderRadius: [4, 4, 0, 0] } })), barWidth: "60%" }],
    };
  }, [customers]);

  const expenseChart = useMemo(() => {
    const catTotals: Record<string, number> = {};
    for (const e of expenses) {
      catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount);
    }
    // Add Stripe fees
    if (summary.totalStripeFees > 0) catTotals["stripe"] = summary.totalStripeFees;
    const cats = Object.entries(catTotals).filter(([, v]) => v > 0).map(([k, v]) => ({
      name: k === "stripe" ? "Stripe Fees" : k.charAt(0).toUpperCase() + k.slice(1),
      value: Math.round(v * 100) / 100,
      itemStyle: { color: k === "stripe" ? "#EC4899" : CAT_COLORS[k] || "#64748b" },
    }));
    return {
      tooltip: { backgroundColor: "#1a1a2e", borderColor: "#2093FF44", textStyle: { color: "#fff", fontSize: 11 }, formatter: (p: any) => `${p.name}: ${fmt(p.value)}` },
      series: [{ type: "pie", radius: ["45%", "70%"], data: cats, label: { show: true, color: "#94a3b8", fontSize: 10, formatter: "{b}\n{d}%" }, emphasis: { label: { fontSize: 12, fontWeight: "bold" } } }],
    };
  }, [expenses, summary]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#2093FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-slate-500 text-sm mt-1">March 2026 — Live from Stripe + Supabase</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm border border-white/10">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: "Gross MRR", value: fmt(summary.grossMRR || 0), icon: DollarSign, color: "#22C55E" },
          { label: "Stripe Fees", value: fmt(summary.totalStripeFees || 0), icon: CreditCard, color: "#EC4899" },
          { label: "Net MRR", value: fmt(summary.netMRR || 0), icon: TrendingUp, color: "#2093FF" },
          { label: "Expenses", value: fmt(summary.totalExpenses || 0), icon: Receipt, color: "#F93C3C" },
          { label: "Profit", value: fmt(summary.profit || 0), icon: Zap, color: "#22C55E" },
          { label: "Margin", value: pct(summary.profitMargin || 0), icon: TrendingUp, color: "#FFBD59" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              <span className="text-[11px] text-slate-500 uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className="text-xl font-semibold font-mono">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ARR Progress */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Annual Run Rate → $1M Goal</span>
          <span className="text-sm font-mono text-[#2093FF]">{fmt(summary.arr || 0)}</span>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#2093FF] to-[#0026FF] transition-all"
            style={{ width: `${Math.min(((summary.arr || 0) / 1000000) * 100, 100)}%` }} />
        </div>
        <p className="text-[10px] text-slate-600 mt-1">{pct(((summary.arr || 0) / 1000000) * 100)} of $1M</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-lg p-1 w-fit">
        {(["overview", "clients", "expenses"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 rounded-md text-sm capitalize transition-colors",
              tab === t ? "bg-[#2093FF]/20 text-[#2093FF]" : "text-slate-500 hover:text-white")}>
            {t}
          </button>
        ))}
      </div>

      {/* ─── Overview Tab ─── */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Revenue by Client (Top 15)</h3>
              {customers.length > 0 ? <ReactECharts option={revenueChart} style={{ height: 300 }} /> : <p className="text-slate-600 text-sm">No data</p>}
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Expense Breakdown</h3>
              {(expenses.length > 0 || summary.totalStripeFees > 0) ? <ReactECharts option={expenseChart} style={{ height: 300 }} /> : <p className="text-slate-600 text-sm">No expenses yet — add some in the Expenses tab</p>}
            </div>
          </div>

          {/* Summary breakdown */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-400 mb-4">Monthly P&L</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1">
                <span className="text-sm text-slate-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400" /> Gross MRR ({summary.activeSubscriptions || 0} subscriptions)</span>
                <span className="text-sm font-mono text-green-400">{fmt(summary.grossMRR || 0)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-sm text-slate-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-pink-400" /> Stripe Fees (3.01% + $0.30/txn)</span>
                <span className="text-sm font-mono text-pink-400">-{fmt(summary.totalStripeFees || 0)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-sm text-slate-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-400" /> Net MRR</span>
                <span className="text-sm font-mono text-blue-400">{fmt(summary.netMRR || 0)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-sm text-slate-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-400" /> Expenses</span>
                <span className="text-sm font-mono text-red-400">-{fmt(summary.totalExpenses || 0)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="text-sm font-medium">Monthly Profit</span>
                <span className={cn("text-lg font-mono font-bold", (summary.profit || 0) >= 0 ? "text-green-400" : "text-red-400")}>{fmt(summary.profit || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Clients Tab ─── */}
      {tab === "clients" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..."
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:border-[#2093FF]/50" />
          </div>

          {/* Client detail panel */}
          {selectedCustomer && (
            <div className="bg-white/[0.03] border border-[#2093FF]/30 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                  <span className="text-xs text-slate-500">{selectedCustomer.email}</span>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase">MRR</p>
                  <p className="text-lg font-mono font-semibold text-green-400">{fmt(selectedCustomer.mrr)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase">Stripe Fee</p>
                  <p className="text-lg font-mono font-semibold text-pink-400">{fmt(selectedCustomer.stripeFee)}</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-[10px] text-slate-500 uppercase">Net MRR</p>
                  <p className="text-lg font-mono font-semibold text-blue-400">{fmt(selectedCustomer.netMrr)}</p>
                </div>
              </div>
              {/* Client-specific expenses */}
              {expenses.filter(e => e.client_name?.toLowerCase() === selectedCustomer.name.toLowerCase()).length > 0 && (
                <div>
                  <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Expenses</h4>
                  <div className="space-y-1">
                    {expenses.filter(e => e.client_name?.toLowerCase() === selectedCustomer.name.toLowerCase()).map(e => (
                      <div key={e.id} className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg">
                        <span className="text-sm">{e.name}</span>
                        <span className="text-sm font-mono text-red-400">-{fmt(Number(e.amount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Client table */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Client</th>
                  <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">MRR</th>
                  <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Stripe Fee</th>
                  <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Net MRR</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c: any) => (
                  <tr key={c.stripeId} onClick={() => setSelectedCustomer(c)}
                    className={cn("border-b border-white/[0.03] cursor-pointer transition-colors",
                      selectedCustomer?.stripeId === c.stripeId ? "bg-[#2093FF]/10" : "hover:bg-white/[0.03]")}>
                    <td className="p-4">
                      <span className="text-sm font-medium">{c.name}</span>
                      {c.email && <span className="text-[10px] text-slate-600 ml-2">{c.email}</span>}
                    </td>
                    <td className="p-4 text-right text-sm font-mono text-green-400">{fmt(c.mrr)}</td>
                    <td className="p-4 text-right text-sm font-mono text-pink-400">{fmt(c.stripeFee)}</td>
                    <td className="p-4 text-right text-sm font-mono text-blue-400">{fmt(c.netMrr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Expenses Tab ─── */}
      {tab === "expenses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{expenses.length} expenses for {month}</p>
            <button onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2093FF]/20 hover:bg-[#2093FF]/30 text-sm text-[#2093FF] border border-[#2093FF]/30">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>

          {/* Add expense form */}
          {showAddExpense && (
            <div className="bg-white/[0.03] border border-[#2093FF]/30 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-medium">New Expense</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Name *</label>
                  <input value={newExp.name} onChange={e => setNewExp({ ...newExp, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1" placeholder="e.g. Cloudways hosting" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Amount *</label>
                  <input value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} type="number" step="0.01"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Type</label>
                  <select value={newExp.type} onChange={e => setNewExp({ ...newExp, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 text-white">
                    <option value="recurring">Recurring</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Category</label>
                  <select value={newExp.category} onChange={e => setNewExp({ ...newExp, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 text-white">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Client (optional)</label>
                  <input value={newExp.client_name} onChange={e => setNewExp({ ...newExp, client_name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1" placeholder="Client name" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Notes</label>
                  <input value={newExp.notes} onChange={e => setNewExp({ ...newExp, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1" placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addExpense} className="px-4 py-2 rounded-lg bg-[#2093FF] hover:bg-[#2093FF]/80 text-sm font-medium">Save</button>
                <button onClick={() => setShowAddExpense(false)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Expense table */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Expense</th>
                  <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Category</th>
                  <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Type</th>
                  <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Client</th>
                  <th className="text-right text-[11px] text-slate-500 uppercase tracking-wider p-4">Amount</th>
                  <th className="text-center text-[11px] text-slate-500 uppercase tracking-wider p-4 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-600 text-sm">No expenses yet. Click "Add Expense" to get started.</td></tr>
                )}
                {expenses.map((e: Expense) => (
                  <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                    <td className="p-4">
                      <span className="text-sm font-medium">{e.name}</span>
                      {e.notes && <span className="text-[10px] text-slate-600 ml-2">— {e.notes}</span>}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${CAT_COLORS[e.category] || "#64748b"}15`, color: CAT_COLORS[e.category] || "#64748b" }}>
                        {e.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400">{e.type}</td>
                    <td className="p-4 text-sm text-slate-400">{e.client_name || "—"}</td>
                    <td className="p-4 text-right text-sm font-mono text-red-400">-{fmt(Number(e.amount))}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => deleteExpense(e.id)} className="p-1 hover:bg-red-500/20 rounded text-slate-600 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expense summary by category */}
          {expenses.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-medium text-slate-400 mb-3">By Category</h3>
              <div className="space-y-2">
                {CATEGORIES.map(cat => {
                  const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + Number(e.amount), 0);
                  if (total === 0) return null;
                  return (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[cat] }} />
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </span>
                      <span className="text-sm font-mono text-red-400">-{fmt(total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
