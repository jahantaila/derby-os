"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDown, ArrowUp, Building2, Calendar, ChevronRight, CreditCard,
  DollarSign, Edit3, Filter, Minus, Plus, Receipt, Search, Target,
  TrendingDown, TrendingUp, Trash2, Users, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { seedClients, seedRevenue } from "@/lib/seed";

const ReactEChartsCore = dynamic(() => import("echarts-for-react"), { ssr: false });

// ─── Types ───
type ExpenseCategory = "software" | "payroll" | "marketing" | "operations" | "other";
type ExpenseFrequency = "monthly" | "one-time";
type PaymentStatus = "paid" | "pending" | "overdue";

type Expense = {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  frequency: ExpenseFrequency;
  date: string;
  notes?: string;
};

type ClientFinance = {
  id: string;
  name: string;
  type: string;
  monthlyRevenue: number;
  services: string[];
  monthlyCost: number;
  margin: number;
  status: string;
  paymentDay: number;
  paymentStatus: PaymentStatus;
  lastPayment?: string;
};

// ─── Seed Data ───
const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
  { id: "software", label: "Software & Tools", color: "#60A5FA" },
  { id: "payroll", label: "Payroll & Contractors", color: "#F59E0B" },
  { id: "marketing", label: "Marketing", color: "#EF4444" },
  { id: "operations", label: "Operations", color: "#8B5CF6" },
  { id: "other", label: "Other", color: "#6B7280" },
];

const SEED_EXPENSES: Expense[] = [
  { id: "e1", name: "GoHighLevel", amount: 297, category: "software", frequency: "monthly", date: "2026-03-01" },
  { id: "e2", name: "OpenClaw Pro", amount: 49, category: "software", frequency: "monthly", date: "2026-03-01" },
  { id: "e3", name: "Vercel Pro", amount: 20, category: "software", frequency: "monthly", date: "2026-03-01" },
  { id: "e4", name: "Instantly", amount: 97, category: "software", frequency: "monthly", date: "2026-03-01" },
  { id: "e5", name: "Claude Max", amount: 200, category: "software", frequency: "monthly", date: "2026-03-01" },
  { id: "e6", name: "Hosting (Cloudways)", amount: 35, category: "software", frequency: "monthly", date: "2026-03-01" },
  { id: "e7", name: "Google Workspace", amount: 14, category: "software", frequency: "monthly", date: "2026-03-01" },
  { id: "e8", name: "Overseas Team - Fulfillment", amount: 2200, category: "payroll", frequency: "monthly", date: "2026-03-01" },
  { id: "e9", name: "Hamza - Landing Pages", amount: 500, category: "payroll", frequency: "monthly", date: "2026-03-01" },
  { id: "e10", name: "Domain Renewals", amount: 120, category: "operations", frequency: "one-time", date: "2026-02-15" },
  { id: "e11", name: "Cold Email Tool (Smartlead)", amount: 39, category: "marketing", frequency: "monthly", date: "2026-03-01" },
  { id: "e12", name: "Tavily API", amount: 20, category: "software", frequency: "monthly", date: "2026-03-01" },
];

const SEED_CLIENT_FINANCES: ClientFinance[] = seedClients.map((c, i) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  monthlyRevenue: c.monthlyRevenue,
  services: c.services,
  monthlyCost: Math.round(c.monthlyRevenue * (0.15 + Math.random() * 0.2)),
  margin: 0,
  status: c.status,
  paymentDay: [1, 5, 10, 15, 20, 25][i % 6],
  paymentStatus: (["paid", "paid", "paid", "pending", "paid"] as PaymentStatus[])[i % 5],
  lastPayment: `2026-03-${String([1, 5, 10, 15, 20][i % 5]).padStart(2, "0")}`,
})).map(c => ({ ...c, margin: Math.round(((c.monthlyRevenue - c.monthlyCost) / c.monthlyRevenue) * 100) }));

// ─── Helpers ───
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const moneyDetail = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Monthly Data Generator ───
// Generate realistic month-by-month snapshots so each month has its own revenue, expenses, clients
type MonthSnapshot = {
  key: string; // "2026-03"
  label: string; // "March 2026"
  shortLabel: string; // "Mar 2026"
  mrr: number;
  expenses: Expense[];
  clients: ClientFinance[];
};

function generateMonthSnapshots(): MonthSnapshot[] {
  const months = seedRevenue.mrrHistory;
  return months.map((m, idx) => {
    const [monthName, year] = m.month.split(" ");
    const monthNum = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(monthName) + 1;
    const key = `${year}-${String(monthNum).padStart(2, "0")}`;
    const scale = m.mrr / seedRevenue.mrr; // ratio vs current month

    // Scale expenses — earlier months had fewer tools
    const expenseScale = 0.7 + (idx / (months.length - 1)) * 0.3; // 70% → 100%
    const monthExpenses = SEED_EXPENSES.map(e => ({
      ...e,
      amount: e.frequency === "monthly" ? Math.round(e.amount * expenseScale) : (idx === months.length - 2 && e.frequency === "one-time" ? e.amount : 0),
      date: `${key}-01`,
    })).filter(e => e.amount > 0);

    // Scale client revenue
    const monthClients = SEED_CLIENT_FINANCES.map(c => {
      const rev = Math.round(c.monthlyRevenue * scale);
      const cost = Math.round(rev * (c.monthlyCost / c.monthlyRevenue));
      return {
        ...c,
        monthlyRevenue: rev,
        monthlyCost: cost,
        margin: rev > 0 ? Math.round(((rev - cost) / rev) * 100) : 0,
        paymentStatus: (idx === months.length - 1 ? c.paymentStatus : "paid") as PaymentStatus,
      };
    });

    return {
      key,
      label: `${monthName} ${year}`,
      shortLabel: m.month,
      mrr: m.mrr,
      expenses: monthExpenses,
      clients: monthClients,
    };
  });
}

const ALL_MONTHS = generateMonthSnapshots();

type TabId = "overview" | "revenue" | "expenses" | "clients";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: TrendingUp },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "clients", label: "Client P&L", icon: Users },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS[ALL_MONTHS.length - 1].key);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [expenseFilter, setExpenseFilter] = useState<ExpenseCategory | "all">("all");
  // Custom expenses added by user (only apply to current month for now)
  const [customExpenses, setCustomExpenses] = useState<Expense[]>([]);

  const currentSnapshot = useMemo(() => ALL_MONTHS.find(m => m.key === selectedMonth) || ALL_MONTHS[ALL_MONTHS.length - 1], [selectedMonth]);
  const isCurrentMonth = selectedMonth === ALL_MONTHS[ALL_MONTHS.length - 1].key;
  const prevSnapshot = useMemo(() => {
    const idx = ALL_MONTHS.findIndex(m => m.key === selectedMonth);
    return idx > 0 ? ALL_MONTHS[idx - 1] : null;
  }, [selectedMonth]);

  // Merge seed expenses with any custom ones for the selected month
  const expenses = useMemo(() => [...currentSnapshot.expenses, ...(isCurrentMonth ? customExpenses : [])], [currentSnapshot, customExpenses, isCurrentMonth]);
  const clients = currentSnapshot.clients;

  // Calculations
  const totalRevenue = currentSnapshot.mrr;
  const recurringExpenses = expenses.filter(e => e.frequency === "monthly").reduce((s, e) => s + e.amount, 0);
  const oneTimeExpenses = expenses.filter(e => e.frequency === "one-time").reduce((s, e) => s + e.amount, 0);
  const totalExpenses = recurringExpenses + oneTimeExpenses;
  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((profit / totalRevenue) * 100) : 0;
  const stripeFees = Math.round(totalRevenue * 0.029 + clients.length * 0.3);

  // Month-over-month changes
  const revChange = prevSnapshot ? ((totalRevenue - prevSnapshot.mrr) / prevSnapshot.mrr * 100).toFixed(1) : null;
  const prevExpenses = prevSnapshot ? prevSnapshot.expenses.reduce((s, e) => s + e.amount, 0) : 0;
  const profitChange = prevSnapshot ? (((totalRevenue - totalExpenses) - (prevSnapshot.mrr - prevExpenses)) / (prevSnapshot.mrr - prevExpenses) * 100).toFixed(1) : null;

  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.id).reduce((s, e) => s + e.amount, 0),
    count: expenses.filter(e => e.category === cat.id).length,
  })).filter(c => c.total > 0);

  // New expense form
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: "software", frequency: "monthly" });
  const addExpense = () => {
    if (!newExpense.name || !newExpense.amount) return;
    setCustomExpenses([...customExpenses, {
      id: `e${Date.now()}`,
      name: newExpense.name!,
      amount: newExpense.amount!,
      category: newExpense.category as ExpenseCategory || "other",
      frequency: newExpense.frequency as ExpenseFrequency || "monthly",
      date: new Date().toISOString().split("T")[0],
      notes: newExpense.notes,
    }]);
    setNewExpense({ category: "software", frequency: "monthly" });
    setShowAddExpense(false);
  };
  const deleteExpense = (id: string) => {
    setCustomExpenses(customExpenses.filter(e => e.id !== id));
  };

  // Monthly P&L data for chart
  const monthlyPL = seedRevenue.mrrHistory.map(m => {
    const expRatio = totalExpenses / totalRevenue;
    const rev = m.mrr;
    const exp = Math.round(rev * expRatio);
    return { month: m.month.split(" ")[0], revenue: rev, expenses: exp, profit: rev - exp };
  });

  const plChartOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "rgba(255,255,255,0.08)", textStyle: { color: "#e2e8f0", fontSize: 11 },
      formatter: (p: any[]) => p.map((s: any) => `${s.seriesName}: $${s.value.toLocaleString()}`).join("<br/>") },
    legend: { data: ["Revenue", "Expenses", "Profit"], textStyle: { color: "#64748b", fontSize: 10 }, top: 0, right: 0 },
    grid: { left: 50, right: 12, top: 28, bottom: 24 },
    xAxis: { type: "category", data: monthlyPL.map(m => m.month), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 9 } },
    yAxis: { type: "value", axisLabel: { color: "#475569", fontSize: 9, formatter: (v: number) => `$${(v/1000).toFixed(0)}k` }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } } },
    series: [
      { name: "Revenue", type: "bar", data: monthlyPL.map(m => m.revenue), barWidth: "25%", itemStyle: { borderRadius: [3,3,0,0], color: "#2093FF" } },
      { name: "Expenses", type: "bar", data: monthlyPL.map(m => m.expenses), barWidth: "25%", itemStyle: { borderRadius: [3,3,0,0], color: "#EF4444" } },
      { name: "Profit", type: "line", data: monthlyPL.map(m => m.profit), smooth: true, showSymbol: false, lineStyle: { color: "#22C55E", width: 2 }, areaStyle: { color: { type: "linear", x:0, y:0, x2:0, y2:1, colorStops: [{ offset: 0, color: "rgba(34,197,94,0.12)" }, { offset: 1, color: "rgba(34,197,94,0)" }] } } },
    ],
  };

  const expensePieOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "rgba(255,255,255,0.08)", textStyle: { color: "#e2e8f0", fontSize: 11 }, formatter: (p: any) => `${p.name}: $${p.value.toLocaleString()} (${p.percent}%)` },
    series: [{
      type: "pie", radius: ["50%", "75%"], center: ["50%", "50%"],
      label: { show: false },
      data: expensesByCategory.map(c => ({ name: c.label, value: c.total, itemStyle: { color: c.color } })),
      emphasis: { scaleSize: 4 },
    }],
  };

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Derby Digital</p>
            <h1 className="text-[20px] font-bold text-white">Finance</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Month selector */}
            <div className="flex items-center gap-1">
              <button onClick={() => {
                const idx = ALL_MONTHS.findIndex(m => m.key === selectedMonth);
                if (idx > 0) setSelectedMonth(ALL_MONTHS[idx - 1].key);
              }} disabled={selectedMonth === ALL_MONTHS[0].key}
                className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-20">
                <ArrowDown size={14} className="rotate-90" />
              </button>
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white outline-none font-medium min-w-[140px]">
                {ALL_MONTHS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
              <button onClick={() => {
                const idx = ALL_MONTHS.findIndex(m => m.key === selectedMonth);
                if (idx < ALL_MONTHS.length - 1) setSelectedMonth(ALL_MONTHS[idx + 1].key);
              }} disabled={selectedMonth === ALL_MONTHS[ALL_MONTHS.length - 1].key}
                className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-20">
                <ArrowUp size={14} className="rotate-90" />
              </button>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-slate-400">
              <CreditCard size={12} className="inline mr-1.5" />Stripe: Demo
            </span>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Revenue", value: money(totalRevenue), sub: "/month", color: "text-blue-400", icon: DollarSign, trend: revChange ? `${Number(revChange) >= 0 ? "+" : ""}${revChange}%` : null },
          { label: "Expenses", value: money(totalExpenses), sub: "/month", color: "text-red-400", icon: Receipt, trend: null },
          { label: "Profit", value: money(profit), sub: "/month", color: "text-emerald-400", icon: TrendingUp, trend: profitChange ? `${Number(profitChange) >= 0 ? "+" : ""}${profitChange}%` : null },
          { label: "Margin", value: `${profitMargin}%`, sub: "net", color: profitMargin >= 50 ? "text-emerald-400" : "text-amber-400", icon: Target, trend: null },
          { label: "Stripe Fees", value: money(stripeFees), sub: "~2.9%+30¢", color: "text-slate-400", icon: CreditCard, trend: null },
        ].map(s => (
          <div key={s.label} className="glass-panel p-4">
            <div className="flex items-center justify-between">
              <s.icon size={14} className={cn(s.color, "opacity-60")} />
              {s.trend && <span className="text-[9px] text-emerald-400 flex items-center gap-0.5"><ArrowUp size={8} />{s.trend}</span>}
            </div>
            <p className={cn("text-[22px] font-bold font-mono mt-2", s.color)}>{s.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.label} {s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-white/[0.06]">
        <div className="flex gap-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-1.5 px-5 py-3 text-[12px] font-medium border-b-2 transition-all",
                  activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                )}>
                <Icon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* P&L Chart */}
          <div className="lg:col-span-2 glass-panel p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Monthly P&L</p>
            <div className="h-[280px]">
              <ReactEChartsCore option={plChartOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
            </div>
          </div>

          {/* Expense breakdown */}
          <div className="glass-panel p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Expense Breakdown</p>
            <div className="h-[160px]">
              <ReactEChartsCore option={expensePieOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
            </div>
            <div className="space-y-2 mt-2">
              {expensesByCategory.map(c => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-[11px] text-slate-400">{c.label}</span>
                  </div>
                  <span className="text-[11px] text-white font-mono">{money(c.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ARR Progress */}
          <div className="lg:col-span-2 glass-panel p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Path to $1M ARR</p>
              <span className="text-[11px] text-slate-500">{money(seedRevenue.arr)} / {money(seedRevenue.target)}</span>
            </div>
            <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-1000"
                style={{ width: `${(seedRevenue.arr / seedRevenue.target) * 100}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <p className="text-[18px] font-bold font-mono text-blue-400">{money(seedRevenue.arr)}</p>
                <p className="text-[10px] text-slate-500">Current ARR</p>
              </div>
              <div>
                <p className="text-[18px] font-bold font-mono text-amber-400">{money(seedRevenue.target - seedRevenue.arr)}</p>
                <p className="text-[10px] text-slate-500">Gap to $1M</p>
              </div>
              <div>
                <p className="text-[18px] font-bold font-mono text-emerald-400">{Math.ceil((seedRevenue.target - seedRevenue.arr) / (seedRevenue.avgRevenuePerClient * 12))}</p>
                <p className="text-[10px] text-slate-500">Clients needed</p>
              </div>
            </div>
          </div>

          {/* Top clients by revenue */}
          <div className="glass-panel p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Top Clients by Revenue</p>
            <div className="space-y-2">
              {[...clients].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).slice(0, 6).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-[11px] text-white truncate">{c.name}</span>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-mono shrink-0">{money(c.monthlyRevenue)}/mo</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ REVENUE ═══ */}
      {activeTab === "revenue" && (
        <div className="space-y-4">
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monthly Recurring Revenue</p>
                <p className="text-[28px] font-bold font-mono text-emerald-400 mt-1">{money(totalRevenue)}<span className="text-[14px] text-slate-500">/mo</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500">Active clients</p>
                <p className="text-[18px] font-bold font-mono text-white">{clients.filter(c => c.status === "active").length}</p>
              </div>
            </div>

            {/* Revenue by service */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {seedRevenue.byService.map(s => (
                <div key={s.name} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-slate-500">{s.name}</p>
                  <p className="text-[16px] font-bold font-mono text-white mt-1">{money(s.value)}</p>
                  <p className="text-[9px] text-slate-600">{Math.round(s.value / totalRevenue * 100)}% of total</p>
                </div>
              ))}
            </div>
          </div>

          {/* Client payments table */}
          <div className="glass-panel">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Client Payments — {currentSnapshot.label}</p>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Client</th>
                  <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Services</th>
                  <th className="text-right px-3 py-2.5 text-slate-500 font-medium">Amount</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Pay Day</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <p className="text-white font-medium">{c.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{c.type}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {c.services.map(s => <span key={s} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-[9px] text-slate-400">{s}</span>)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-400">{money(c.monthlyRevenue)}</td>
                    <td className="px-3 py-2.5 text-center text-slate-400">{c.paymentDay}th</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-medium",
                        c.paymentStatus === "paid" ? "bg-emerald-400/10 text-emerald-400" :
                        c.paymentStatus === "pending" ? "bg-amber-400/10 text-amber-400" :
                        "bg-red-400/10 text-red-400"
                      )}>{c.paymentStatus}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.08]">
                  <td colSpan={2} className="px-4 py-3 text-slate-400 font-medium">Total</td>
                  <td className="px-3 py-3 text-right font-mono text-[13px] font-bold text-emerald-400">{money(totalRevenue)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ═══ EXPENSES ═══ */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Recurring</p>
              <p className="text-[20px] font-bold font-mono text-red-400 mt-1">{money(recurringExpenses)}<span className="text-[12px] text-slate-500">/mo</span></p>
            </div>
            <div className="glass-panel p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">One-time (this month)</p>
              <p className="text-[20px] font-bold font-mono text-amber-400 mt-1">{money(oneTimeExpenses)}</p>
            </div>
            <div className="glass-panel p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total</p>
              <p className="text-[20px] font-bold font-mono text-white mt-1">{money(totalExpenses)}</p>
            </div>
          </div>

          {/* Add + Filter */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {([{ id: "all", label: "All" }, ...EXPENSE_CATEGORIES] as { id: ExpenseCategory | "all"; label: string }[]).map(c => (
                <button key={c.id} onClick={() => setExpenseFilter(c.id)}
                  className={cn("px-2.5 py-1 rounded-lg text-[11px] transition-all",
                    expenseFilter === c.id ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-white"
                  )}>{c.label}</button>
              ))}
            </div>
            <button onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors">
              <Plus size={12} /> Add Expense
            </button>
          </div>

          {/* Add expense form */}
          {showAddExpense && (
            <div className="glass-panel p-4 border-blue-500/20">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-medium text-white">New Expense</p>
                <button onClick={() => setShowAddExpense(false)} className="text-slate-500 hover:text-white"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <input value={newExpense.name ?? ""} onChange={e => setNewExpense({ ...newExpense, name: e.target.value })}
                  placeholder="Expense name" className="col-span-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/30" />
                <input type="number" value={newExpense.amount ?? ""} onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  placeholder="Amount" className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/30" />
                <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value as ExpenseCategory })}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none">
                  {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select value={newExpense.frequency} onChange={e => setNewExpense({ ...newExpense, frequency: e.target.value as ExpenseFrequency })}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none">
                  <option value="monthly">Monthly</option>
                  <option value="one-time">One-time</option>
                </select>
                <button onClick={addExpense} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-medium">Save</button>
              </div>
            </div>
          )}

          {/* Expense list */}
          <div className="glass-panel">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Expense</th>
                  <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Category</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-medium">Frequency</th>
                  <th className="text-right px-3 py-2.5 text-slate-500 font-medium">Amount</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.filter(e => expenseFilter === "all" || e.category === expenseFilter).map(e => {
                  const cat = EXPENSE_CATEGORIES.find(c => c.id === e.category);
                  return (
                    <tr key={e.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 text-white font-medium">{e.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat?.color }} />
                          <span className="text-slate-400">{cat?.label}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn("px-2 py-0.5 rounded text-[9px]",
                          e.frequency === "monthly" ? "bg-blue-400/10 text-blue-400" : "bg-slate-400/10 text-slate-400"
                        )}>{e.frequency}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-red-400">{money(e.amount)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => deleteExpense(e.id)}
                          className={cn("transition-colors", customExpenses.some(x => x.id === e.id) ? "text-slate-600 hover:text-red-400" : "text-slate-800 cursor-not-allowed")}
                          disabled={!customExpenses.some(x => x.id === e.id)}
                          title={customExpenses.some(x => x.id === e.id) ? "Delete" : "Seed expense"}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/[0.08]">
                  <td colSpan={3} className="px-4 py-3 text-slate-400 font-medium">Total</td>
                  <td className="px-3 py-3 text-right font-mono text-[13px] font-bold text-red-400">
                    {money(expenses.filter(e => expenseFilter === "all" || e.category === expenseFilter).reduce((s, e) => s + e.amount, 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ═══ CLIENT P&L ═══ */}
      {activeTab === "clients" && (
        <div className="space-y-4">
          <div className="glass-panel p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Client Profitability</p>
            <p className="text-[12px] text-slate-500">Revenue vs estimated cost to service per client.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[...clients].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue).map(c => (
              <button key={c.id} onClick={() => setSelectedClient(selectedClient === c.id ? null : c.id)}
                className={cn("glass-panel p-4 text-left transition-all",
                  selectedClient === c.id ? "border-blue-500/30 bg-blue-500/[0.03]" : ""
                )}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{c.type} · {c.services.join(", ")}</p>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold font-mono",
                    c.margin >= 70 ? "bg-emerald-400/10 text-emerald-400" :
                    c.margin >= 50 ? "bg-blue-400/10 text-blue-400" :
                    "bg-amber-400/10 text-amber-400"
                  )}>{c.margin}% margin</span>
                </div>

                {/* Revenue bar */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Revenue</span>
                    <span className="text-emerald-400 font-mono">{money(c.monthlyRevenue)}</span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: "100%" }} />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Cost</span>
                    <span className="text-red-400 font-mono">{money(c.monthlyCost)}</span>
                  </div>
                  <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${(c.monthlyCost / c.monthlyRevenue) * 100}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.04]">
                  <span className="text-[10px] text-slate-500">Net profit</span>
                  <span className="text-[13px] font-bold font-mono text-emerald-400">{money(c.monthlyRevenue - c.monthlyCost)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
