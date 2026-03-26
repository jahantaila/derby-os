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
const formatFailedDueDate = (value?: string | null) => {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

// ─── Inline Editable Field ───
function EditableField({ value, onSave, type = "text", className = "" }: {
  value: string; onSave: (v: string) => void; type?: string; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);
  if (!editing) return (
    <span onClick={() => setEditing(true)}
      className={cn("cursor-pointer hover:bg-white/5 rounded px-1 -mx-1 transition-colors border border-transparent hover:border-dashed hover:border-white/20", className)}>
      {value || <span className="text-slate-600 italic">—</span>}
    </span>
  );
  return (
    <input autoFocus value={val} type={type} step={type === "number" ? "0.01" : undefined}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { setEditing(false); if (val !== value) onSave(val); }}
      onKeyDown={e => { if (e.key === "Enter") { setEditing(false); if (val !== value) onSave(val); } if (e.key === "Escape") { setEditing(false); setVal(value); } }}
      className={cn("bg-white/10 border border-[#2093FF]/50 rounded px-2 -mx-1 outline-none text-white", className)}
      style={{ width: type === "number" ? 100 : "100%", minWidth: type === "number" ? 80 : 200 }}
    />
  );
}

// ─── Expense Row with inline editing ───
function ExpenseRow({ expense, onUpdate, onDelete }: {
  expense: Expense; onUpdate: (id: string, field: string, value: any) => void; onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 group hover:bg-white/[0.02] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <EditableField value={expense.name} onSave={v => onUpdate(expense.id, "name", v)} className="text-sm font-medium" />
          {expense.type === "recurring" ? (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 flex-shrink-0">↻ RECURRING</span>
          ) : (
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 flex-shrink-0">① ONE-TIME</span>
          )}
        </div>
        {expense.notes && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            <EditableField value={expense.notes || ""} onSave={v => onUpdate(expense.id, "notes", v)} className="text-[11px] text-slate-400" />
          </p>
        )}
        {!expense.notes && (
          <p className="text-[10px] text-slate-700 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => onUpdate(expense.id, "notes", "Add notes...")}>
            + Add notes
          </p>
        )}
      </div>
      {expense.client_name && (
        <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded flex-shrink-0">
          {expense.client_name}
        </span>
      )}
      <div className="text-right flex-shrink-0 w-24">
        <EditableField value={String(expense.amount)} type="number" onSave={v => onUpdate(expense.id, "amount", parseFloat(v))}
          className="text-sm font-mono text-red-400" />
      </div>
      <button onClick={() => onDelete(expense.id)}
        className="p-1.5 rounded hover:bg-red-500/20 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
const pct = (n: number) => `${n.toFixed(1)}%`;

const CATEGORIES = ["software", "marketing", "hosting", "fulfillment", "operations", "other"] as const;
const PAYROLL_CATS = ["payroll"] as const;
const COMMISSION_CATS = ["commissions"] as const;
const ALL_CATS = [...CATEGORIES, ...PAYROLL_CATS, ...COMMISSION_CATS] as const;
const CAT_COLORS: Record<string, string> = {
  software: "#2093FF", payroll: "#FFBD59", marketing: "#F93C3C", hosting: "#22C55E",
  fulfillment: "#8B5CF6", operations: "#06B6D4", other: "#64748b", commissions: "#F97316",
};

type Tab = "overview" | "clients" | "expenses" | "payroll" | "commissions";

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

interface FailedPayment {
  customerName: string;
  email: string;
  amount: number;
  dueDate: string | null;
  invoiceUrl: string;
  stripeCustomerId: string;
}

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showFailedPaymentsModal, setShowFailedPaymentsModal] = useState(false);
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

  const updateExpense = async (id: string, field: string, value: any) => {
    try {
      await fetch("/api/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
      load();
    } catch (e: any) {
      alert("Failed to update: " + e.message);
    }
  };

  const summary = data?.summary || {};
  const customers = data?.customers || [];
  const expenses: Expense[] = data?.expenses || [];
  const failedPayments: FailedPayment[] = data?.failedPayments || [];
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
        {(["overview", "clients", "expenses", "payroll", "commissions"] as Tab[]).map(t => (
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

          {failedPayments.length > 0 && (
            <div className="bg-white/[0.03] border border-[#F93C3C]/20 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Failed Payments</h3>
                  <p className="text-xs text-slate-500 mt-1">Open, uncollectible, and past-due payment failures for this month.</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#F93C3C]/70">{failedPayments.length} items</span>
              </div>

              <button
                type="button"
                onClick={() => setShowFailedPaymentsModal(true)}
                className="mt-4 w-full text-left rounded-2xl border border-[#F93C3C]/30 bg-[#F93C3C]/10 px-5 py-4 transition hover:bg-[#F93C3C]/14 hover:border-[#F93C3C]/40"
              >
                <div className="flex items-center gap-2 text-[#F93C3C]">
                  <Minus className="w-4 h-4" />
                  <span className="text-[11px] uppercase tracking-wider">Total Failed Revenue</span>
                </div>
                <p className="mt-2 text-3xl font-bold font-mono text-[#F93C3C]">{fmt(summary.totalFailedRevenue || 0)}</p>
                <p className="mt-2 text-xs text-slate-400">Click for payment breakdown</p>
              </button>
            </div>
          )}
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
                      {c.pastDue && <span className="text-[9px] ml-2 text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">PAST DUE</span>}
                      {c.subscriptionCount > 1 && <span className="text-[9px] ml-1 text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{c.subscriptionCount} subs</span>}
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
        <div className="space-y-6">
          {/* Category summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => {
              const items = expenses.filter(e => e.category === cat);
              const total = items.reduce((s, e) => s + Number(e.amount), 0);
              if (total === 0) return null;
              const recurring = items.filter(e => e.type === "recurring").reduce((s, e) => s + Number(e.amount), 0);
              const oneTime = items.filter(e => e.type === "one-time").reduce((s, e) => s + Number(e.amount), 0);
              return (
                <div key={cat} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
                  style={{ borderLeftWidth: 3, borderLeftColor: CAT_COLORS[cat] }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: CAT_COLORS[cat] }}>
                      {cat}
                    </span>
                    <span className="text-[10px] text-slate-600">{items.length} items</span>
                  </div>
                  <p className="text-lg font-mono font-semibold text-white">{fmt(total)}</p>
                  <div className="flex gap-2 mt-1">
                    {recurring > 0 && <span className="text-[9px] text-slate-500">↻ {fmt(recurring)}</span>}
                    {oneTime > 0 && <span className="text-[9px] text-slate-500">① {fmt(oneTime)}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500">{expenses.length} expenses</p>
              <span className="text-[10px] text-slate-600">
                ↻ {fmt(expenses.filter(e => e.type === "recurring").reduce((s, e) => s + Number(e.amount), 0))} recurring
              </span>
              <span className="text-[10px] text-slate-600">
                ① {fmt(expenses.filter(e => e.type === "one-time").reduce((s, e) => s + Number(e.amount), 0))} one-time
              </span>
            </div>
            <button onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#2093FF]/20 hover:bg-[#2093FF]/30 text-sm text-[#2093FF] border border-[#2093FF]/30">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>

          {/* Add expense form */}
          {showAddExpense && (
            <div className="bg-white/[0.03] border border-[#2093FF]/30 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-medium">New Expense</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Name *</label>
                  <input value={newExp.name} onChange={e => setNewExp({ ...newExp, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[#2093FF]/50" placeholder="e.g. Cloudways hosting" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Amount *</label>
                  <input value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} type="number" step="0.01"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[#2093FF]/50" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Category</label>
                  <select value={newExp.category} onChange={e => setNewExp({ ...newExp, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 text-white focus:outline-none focus:border-[#2093FF]/50">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Type</label>
                  <select value={newExp.type} onChange={e => setNewExp({ ...newExp, type: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 text-white focus:outline-none focus:border-[#2093FF]/50">
                    <option value="recurring">Recurring</option>
                    <option value="one-time">One-time</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Client (optional)</label>
                  <input value={newExp.client_name} onChange={e => setNewExp({ ...newExp, client_name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[#2093FF]/50" placeholder="Client name" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Notes</label>
                  <input value={newExp.notes} onChange={e => setNewExp({ ...newExp, notes: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-[#2093FF]/50" placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addExpense} className="px-4 py-2 rounded-lg bg-[#2093FF] hover:bg-[#2093FF]/80 text-sm font-medium">Save</button>
                <button onClick={() => setShowAddExpense(false)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* Expenses grouped by category */}
          {CATEGORIES.map(cat => {
            const items = expenses.filter(e => e.category === cat);
            if (items.length === 0) return null;
            const total = items.reduce((s, e) => s + Number(e.amount), 0);
            return (
              <div key={cat} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[cat] }} />
                    <span className="text-sm font-medium capitalize">{cat}</span>
                    <span className="text-[10px] text-slate-600">{items.length} items</span>
                  </div>
                  <span className="text-sm font-mono text-red-400">-{fmt(total)}</span>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {items.map(e => (
                    <ExpenseRow key={e.id} expense={e} onUpdate={updateExpense} onDelete={deleteExpense} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Payroll Tab ─── */}
      {tab === "payroll" && (() => {
        const payrollItems = expenses.filter(e => e.category === "payroll");
        const total = payrollItems.reduce((s, e) => s + Number(e.amount), 0);
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5"
              style={{ borderLeftWidth: 3, borderLeftColor: CAT_COLORS.payroll }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-amber-400 mb-1">Total Payroll</p>
                  <p className="text-2xl font-mono font-bold text-white">{fmt(total)}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{payrollItems.length} team members</p>
                </div>
                <button onClick={() => { setNewExp({ ...newExp, category: "payroll" }); setShowAddExpense(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-sm text-amber-400 border border-amber-500/30">
                  <Plus className="w-4 h-4" /> Add Salary
                </button>
              </div>
            </div>

            {/* Add form (reuses global) */}
            {showAddExpense && newExp.category === "payroll" && (
              <div className="bg-white/[0.03] border border-amber-500/30 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-medium">New Salary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Name *</label>
                    <input value={newExp.name} onChange={e => setNewExp({ ...newExp, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-amber-500/50" placeholder="e.g. Abdul Salary" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Amount *</label>
                    <input value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} type="number" step="0.01"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-amber-500/50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Notes</label>
                    <input value={newExp.notes} onChange={e => setNewExp({ ...newExp, notes: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-amber-500/50" placeholder="Payment schedule, notes" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addExpense} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-500/80 text-sm font-medium text-black">Save</button>
                  <button onClick={() => setShowAddExpense(false)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Salary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {payrollItems.map(e => (
                <div key={e.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 group hover:border-amber-500/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <EditableField value={e.name} onSave={v => updateExpense(e.id, "name", v)} className="text-sm font-medium" />
                    <button onClick={() => deleteExpense(e.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <EditableField value={e.notes || ""} onSave={v => updateExpense(e.id, "notes", v)} className="text-[11px] text-slate-400" />
                      <div className="mt-1">
                        {e.type === "recurring" ? (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">↻ RECURRING</span>
                        ) : (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">① ONE-TIME</span>
                        )}
                      </div>
                    </div>
                    <EditableField value={String(e.amount)} type="number" onSave={v => updateExpense(e.id, "amount", parseFloat(v))}
                      className="text-xl font-mono font-semibold text-amber-400" />
                  </div>
                </div>
              ))}
            </div>

            {payrollItems.length === 0 && (
              <div className="text-center py-12 text-slate-600">No salaries yet. Click &quot;Add Salary&quot; to get started.</div>
            )}
          </div>
        );
      })()}

      {/* ─── Commissions Tab ─── */}
      {tab === "commissions" && (() => {
        const commItems = expenses.filter(e => e.category === "commissions");
        const total = commItems.reduce((s, e) => s + Number(e.amount), 0);
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5"
              style={{ borderLeftWidth: 3, borderLeftColor: CAT_COLORS.commissions }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-orange-400 mb-1">Total Commissions</p>
                  <p className="text-2xl font-mono font-bold text-white">{fmt(total)}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{commItems.length} payees</p>
                </div>
                <button onClick={() => { setNewExp({ ...newExp, category: "commissions" }); setShowAddExpense(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-sm text-orange-400 border border-orange-500/30">
                  <Plus className="w-4 h-4" /> Add Commission
                </button>
              </div>
            </div>

            {/* Add form */}
            {showAddExpense && newExp.category === "commissions" && (
              <div className="bg-white/[0.03] border border-orange-500/30 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-medium">New Commission</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Name *</label>
                    <input value={newExp.name} onChange={e => setNewExp({ ...newExp, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-orange-500/50" placeholder="e.g. Manu Commission" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Amount *</label>
                    <input value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} type="number" step="0.01"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-orange-500/50" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Client(s)</label>
                    <input value={newExp.client_name} onChange={e => setNewExp({ ...newExp, client_name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-orange-500/50" placeholder="Which clients" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 uppercase">Notes</label>
                    <input value={newExp.notes} onChange={e => setNewExp({ ...newExp, notes: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:border-orange-500/50" placeholder="Commission structure, payment timing" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addExpense} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-500/80 text-sm font-medium text-black">Save</button>
                  <button onClick={() => setShowAddExpense(false)} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Commission cards */}
            <div className="space-y-3">
              {commItems.map(e => (
                <div key={e.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 group hover:border-orange-500/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <EditableField value={e.name} onSave={v => updateExpense(e.id, "name", v)} className="text-sm font-medium" />
                        {e.type === "recurring" ? (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">↻ RECURRING</span>
                        ) : (
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">① ONE-TIME</span>
                        )}
                      </div>
                      {e.notes && (
                        <EditableField value={e.notes} onSave={v => updateExpense(e.id, "notes", v)} className="text-[11px] text-slate-400" />
                      )}
                      {!e.notes && (
                        <p className="text-[10px] text-slate-700 opacity-0 group-hover:opacity-100 cursor-pointer"
                          onClick={() => updateExpense(e.id, "notes", "Add notes...")}>+ Add notes</p>
                      )}
                      {e.client_name && (
                        <div className="mt-1">
                          <span className="text-[10px] text-orange-400/60 bg-orange-500/10 px-2 py-0.5 rounded">
                            {e.client_name}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <EditableField value={String(e.amount)} type="number" onSave={v => updateExpense(e.id, "amount", parseFloat(v))}
                        className="text-xl font-mono font-semibold text-orange-400" />
                      <button onClick={() => deleteExpense(e.id)}
                        className="p-1.5 rounded hover:bg-red-500/20 text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {commItems.length === 0 && (
              <div className="text-center py-12 text-slate-600">No commissions yet. Click &quot;Add Commission&quot; to get started.</div>
            )}
          </div>
        );
      })()}

      {showFailedPaymentsModal && failedPayments.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/40 backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Failed Payments</h3>
                <p className="text-sm text-slate-400 mt-1">{fmt(summary.totalFailedRevenue || 0)} outstanding this month</p>
              </div>
              <button
                type="button"
                onClick={() => setShowFailedPaymentsModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-3">
              {failedPayments.map((payment, index) => (
                <div key={`${payment.stripeCustomerId}-${payment.dueDate || index}-${payment.amount}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {payment.invoiceUrl ? (
                          <a
                            href={payment.invoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-white underline decoration-white/20 underline-offset-4 hover:text-[#F93C3C]"
                          >
                            {payment.customerName}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-white">{payment.customerName}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(payment.customerName)}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 transition hover:border-[#F93C3C]/30 hover:text-[#F93C3C]"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{payment.email || payment.stripeCustomerId}</p>
                    </div>
                    <span className="text-lg font-mono font-semibold text-[#F93C3C]">{fmt(payment.amount)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4 text-xs">
                    <span className="text-slate-400">Due {formatFailedDueDate(payment.dueDate)}</span>
                    <span className="text-slate-600">{payment.stripeCustomerId}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
