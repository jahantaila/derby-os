"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  Archive,
  CalendarDays,
  CreditCard,
  DollarSign,
  Minus,
  Plus,
  Receipt,
  RefreshCw,
  TrendingUp,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { CardSkeleton, GridSkeleton, TableSkeleton } from "@/components/loading-skeleton";
import { cn } from "@/lib/utils";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

const CATEGORIES = ["software", "marketing", "hosting", "fulfillment", "operations", "other"] as const;
const CAT_COLORS: Record<string, string> = {
  software: "#2093FF",
  payroll: "#FFBD59",
  marketing: "#F93C3C",
  hosting: "#22C55E",
  fulfillment: "#8B5CF6",
  operations: "#06B6D4",
  other: "#64748b",
  commissions: "#F97316",
  stripe: "#EC4899",
};

type Tab = "overview" | "clients" | "expenses" | "payroll" | "commissions";

type Expense = {
  id: string;
  name: string;
  amount: number;
  type: string;
  category: string;
  client_name?: string;
  notes?: string;
  month: string;
};

type FailedPayment = {
  customerName: string;
  email: string;
  amount: number;
  dueDate: string | null;
  invoiceUrl: string;
  stripeCustomerId: string;
};

type Customer = {
  stripeId: string;
  name: string;
  email: string;
  mrr: number;
  stripeFee: number;
  netMrr: number;
  subscriptionCount: number;
  pastDue: boolean;
};

type FinanceSummary = {
  grossMRR: number;
  totalStripeFees: number;
  netMRR: number;
  totalExpenses: number;
  totalFailedRevenue: number;
  profit: number;
  profitMargin: number;
  activeSubscriptions: number;
  arr: number;
};

type FinanceResponse = {
  month: string;
  monthLabel: string;
  source: "live" | "snapshot";
  hasSnapshot: boolean;
  noSnapshot: boolean;
  snapshotCreatedAt: string | null;
  customers: Customer[];
  expenses: Expense[];
  failedPayments: FailedPayment[];
  summary: FinanceSummary;
  error?: string;
};

type SnapshotRow = {
  id: string;
  month: string;
  gross_mrr: number;
  total_expenses: number;
  profit: number;
  created_at: string;
};

const fmt = (value: number) =>
  `$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (value: number) => `${value.toFixed(1)}%`;

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "03";
  return `${year}-${month}`;
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, monthNumber - 1, 1))
  );
}

function buildMonthOptions(_count: number, historyMonths: string[] = []) {
  const current = getCurrentMonth();
  const values = new Set<string>([current]);
  for (const m of historyMonths) values.add(m);

  return Array.from(values)
    .sort((a, b) => b.localeCompare(a))
    .map((month) => ({ value: month, label: formatMonthLabel(month) }));
}

function formatSnapshotTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFailedDueDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EditableField({
  value,
  onSave,
  disabled = false,
  type = "text",
  className = "",
}: {
  value: string;
  onSave: (value: string) => void;
  disabled?: boolean;
  type?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  if (disabled) {
    return <span className={className}>{value || <span className="text-slate-600 italic">—</span>}</span>;
  }

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        className={cn(
          "cursor-pointer rounded px-1 -mx-1 transition-colors border border-transparent hover:bg-white/5 hover:border-dashed hover:border-white/20",
          className
        )}
      >
        {value || <span className="text-slate-600 italic">—</span>}
      </span>
    );
  }

  return (
    <input
      autoFocus
      type={type}
      step={type === "number" ? "0.01" : undefined}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onSave(draft);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          setEditing(false);
          if (draft !== value) onSave(draft);
        }
        if (event.key === "Escape") {
          setEditing(false);
          setDraft(value);
        }
      }}
      className={cn("rounded border border-[#2093FF]/50 bg-white/10 px-2 -mx-1 text-white outline-none", className)}
      style={{ width: type === "number" ? 100 : "100%", minWidth: type === "number" ? 80 : 160 }}
    />
  );
}

function ExpenseRow({
  expense,
  readOnly,
  onUpdate,
  onDelete,
}: {
  expense: Expense;
  readOnly: boolean;
  onUpdate: (id: string, field: string, value: string | number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <EditableField
            value={expense.name}
            onSave={(value) => onUpdate(expense.id, "name", value)}
            disabled={readOnly}
            className="text-sm font-medium"
          />
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[8px] flex-shrink-0",
              expense.type === "recurring" ? "bg-blue-500/10 text-blue-400" : "bg-amber-500/10 text-amber-400"
            )}
          >
            {expense.type === "recurring" ? "↻ RECURRING" : "① ONE-TIME"}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-slate-400">
          <EditableField
            value={expense.notes || ""}
            onSave={(value) => onUpdate(expense.id, "notes", value)}
            disabled={readOnly}
            className="text-[11px] text-slate-400"
          />
        </div>
      </div>
      {expense.client_name ? (
        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">{expense.client_name}</span>
      ) : null}
      <div className="w-24 flex-shrink-0 text-right">
        <EditableField
          value={String(expense.amount)}
          type="number"
          disabled={readOnly}
          onSave={(value) => onUpdate(expense.id, "amount", Number.parseFloat(value))}
          className="text-sm font-mono text-red-400"
        />
      </div>
      {!readOnly ? (
        <button
          onClick={() => onDelete(expense.id)}
          className="rounded p-1.5 text-slate-700 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export default function FinancePage() {
  const currentMonth = getCurrentMonth();
  const [tab, setTab] = useState<Tab>("overview");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [data, setData] = useState<FinanceResponse | null>(null);
  const [history, setHistory] = useState<SnapshotRow[]>([]);
  const [currentLiveSummary, setCurrentLiveSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showFailedPaymentsModal, setShowFailedPaymentsModal] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [snapshotSaving, setSnapshotSaving] = useState(false);
  const [newExp, setNewExp] = useState({
    name: "",
    amount: "",
    type: "recurring",
    category: "other",
    client_name: "",
    notes: "",
  });

  const isCurrentMonth = selectedMonth === currentMonth;
  const readOnly = !isCurrentMonth;
  const monthOptions = buildMonthOptions(
    12,
    history.map((snapshot) => snapshot.month).filter((month): month is string => Boolean(month))
  );

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await fetch("/api/finance/history", { cache: "no-store" });
      const json = await res.json();
      setHistory(Array.isArray(json.snapshots) ? json.snapshots : []);
      if (json.error) setHistoryError(String(json.error));
    } catch (err: any) {
      setHistory([]);
      setHistoryError(err.message || "Failed to load finance history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadCurrentLiveSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance?month=${currentMonth}`, { cache: "no-store" });
      const json = (await res.json()) as FinanceResponse;
      if (!(json as { error?: string }).error && json.summary) {
        setCurrentLiveSummary(json.summary);
      }
    } catch {
      setCurrentLiveSummary(null);
    }
  }, [currentMonth]);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/finance?month=${selectedMonth}`, { cache: "no-store" });
      const json = (await res.json()) as FinanceResponse;
      if ((json as { error?: string }).error) throw new Error((json as { error?: string }).error);
      setData(json);
      setSelectedCustomer(null);
    } catch (err: any) {
      setError(err.message || "Failed to load finance data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    loadCurrentLiveSummary();
  }, [loadCurrentLiveSummary]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const addExpense = async () => {
    if (readOnly || !newExp.name || !newExp.amount) return;
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newExp, amount: Number.parseFloat(newExp.amount), month: currentMonth }),
      });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      setNewExp({ name: "", amount: "", type: "recurring", category: "other", client_name: "", notes: "" });
      setShowAddExpense(false);
      await loadMonth();
    } catch (err: any) {
      setError(err.message || "Failed to add expense");
    }
  };

  const deleteExpense = async (id: string) => {
    if (readOnly || !confirm("Delete this expense?")) return;
    try {
      const res = await fetch("/api/finance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      await loadMonth();
    } catch (err: any) {
      setError(err.message || "Failed to delete expense");
    }
  };

  const updateExpense = async (id: string, field: string, value: string | number) => {
    if (readOnly) return;
    try {
      const res = await fetch("/api/finance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      await loadMonth();
    } catch (err: any) {
      setError(err.message || "Failed to update expense");
    }
  };

  const captureSnapshot = async () => {
    setSnapshotSaving(true);
    setError("");
    try {
      const res = await fetch("/api/finance/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth }),
      });
      const json = await res.json();
      if (json?.error) throw new Error(json.error);
      await Promise.all([loadHistory(), loadMonth()]);
    } catch (err: any) {
      setError(err.message || "Failed to capture snapshot");
    } finally {
      setSnapshotSaving(false);
    }
  };

  const summary = data?.summary ?? {
    grossMRR: 0,
    totalStripeFees: 0,
    netMRR: 0,
    totalExpenses: 0,
    totalFailedRevenue: 0,
    profit: 0,
    profitMargin: 0,
    activeSubscriptions: 0,
    arr: 0,
  };
  const customers = data?.customers ?? [];
  const expenses = data?.expenses ?? [];
  const failedPayments = data?.failedPayments ?? [];
  const filteredCustomers = customers.filter((customer) =>
    !search || customer.name.toLowerCase().includes(search.toLowerCase())
  );

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
    return acc;
  }, {});
  if (summary.totalStripeFees > 0) categoryTotals.stripe = summary.totalStripeFees;

  const clientChartData = [...customers]
    .filter((customer) => customer.mrr > 0)
    .sort((a, b) => b.mrr - a.mrr)
    .slice(0, 15);

  const trendMap = new Map<string, { month: string; grossMRR: number; totalExpenses: number; profit: number }>();
  for (const snapshot of history) {
    trendMap.set(snapshot.month, {
      month: snapshot.month,
      grossMRR: Number(snapshot.gross_mrr || 0),
      totalExpenses: Number(snapshot.total_expenses || 0),
      profit: Number(snapshot.profit || 0),
    });
  }
  trendMap.set(currentMonth, {
    month: currentMonth,
    grossMRR: Number((isCurrentMonth ? summary : currentLiveSummary)?.grossMRR || 0),
    totalExpenses: Number((isCurrentMonth ? summary : currentLiveSummary)?.totalExpenses || 0),
    profit: Number((isCurrentMonth ? summary : currentLiveSummary)?.profit || 0),
  });
  const trendSeries = Array.from(trendMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  const revenueTrendOption = {
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "#111827",
      borderColor: "#334155",
      textStyle: { color: "#fff" },
    },
    legend: {
      top: 0,
      textStyle: { color: "#94a3b8" },
    },
    grid: { top: 36, right: 20, bottom: 20, left: 20, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: trendSeries.map((entry) => formatMonthLabel(entry.month)),
      axisLabel: { color: "#64748b", fontSize: 10 },
      axisLine: { lineStyle: { color: "#1e293b" } },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: {
        color: "#64748b",
        formatter: (value: number) => `$${Math.round(value).toLocaleString("en-US")}`,
      },
      splitLine: { lineStyle: { color: "#ffffff10" } },
    },
    series: [
      {
        name: "MRR",
        type: "line",
        smooth: true,
        data: trendSeries.map((entry) => entry.grossMRR),
        lineStyle: { color: "#22C55E", width: 3 },
        itemStyle: { color: "#22C55E" },
      },
      {
        name: "Expenses",
        type: "line",
        smooth: true,
        data: trendSeries.map((entry) => entry.totalExpenses),
        lineStyle: { color: "#F93C3C", width: 3 },
        itemStyle: { color: "#F93C3C" },
      },
      {
        name: "Profit",
        type: "line",
        smooth: true,
        data: trendSeries.map((entry) => entry.profit),
        lineStyle: { color: "#2093FF", width: 3 },
        itemStyle: { color: "#2093FF" },
      },
    ],
  };

  const revenueByClientOption = {
    tooltip: {
      trigger: "axis" as const,
      backgroundColor: "#111827",
      borderColor: "#334155",
      textStyle: { color: "#fff" },
    },
    grid: { top: 8, right: 8, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: "category" as const,
      data: clientChartData.map((customer) =>
        customer.name.length > 14 ? `${customer.name.slice(0, 14)}…` : customer.name
      ),
      axisLabel: { color: "#64748b", fontSize: 9, rotate: 35 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: { color: "#64748b", fontSize: 9, formatter: (value: number) => `$${value}` },
      splitLine: { lineStyle: { color: "#ffffff10" } },
    },
    series: [
      {
        type: "bar",
        data: clientChartData.map((customer) => ({
          value: customer.mrr,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#2093FF" },
                { offset: 1, color: "#0026FF" },
              ],
            },
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: "60%",
      },
    ],
  };

  const expenseBreakdownOption = {
    tooltip: {
      backgroundColor: "#111827",
      borderColor: "#334155",
      textStyle: { color: "#fff" },
      formatter: (params: { name: string; value: number }) => `${params.name}: ${fmt(params.value)}`,
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        label: { show: true, color: "#94a3b8", fontSize: 10, formatter: "{b}\n{d}%" },
        data: Object.entries(categoryTotals)
          .filter(([, value]) => value > 0)
          .map(([key, value]) => ({
            name: key === "stripe" ? "Stripe Fees" : `${key.charAt(0).toUpperCase()}${key.slice(1)}`,
            value: Math.round(value * 100) / 100,
            itemStyle: { color: CAT_COLORS[key] || "#64748b" },
          })),
      },
    ],
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="animate-pulse space-y-3">
            <div className="skeleton-shimmer h-10 w-40 rounded-full bg-white/10" />
            <div className="skeleton-shimmer h-4 w-72 rounded-full bg-white/10" />
          </div>
          <div className="flex gap-3">
            <div className="skeleton-shimmer h-11 w-44 rounded-2xl bg-white/10" />
            <div className="skeleton-shimmer h-11 w-36 rounded-2xl bg-white/10" />
          </div>
        </div>
        <GridSkeleton columns={3} count={6} className="md:grid-cols-3 xl:grid-cols-6" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <TableSkeleton className="xl:col-span-2" rows={4} />
          <CardSkeleton className="h-full" />
        </div>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6 text-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data?.monthLabel || formatMonthLabel(selectedMonth)}{" "}
            {data?.source === "live" ? "Live from Stripe + Supabase" : "Historical snapshot"}
          </p>
          {data?.snapshotCreatedAt ? (
            <p className="mt-1 text-xs text-slate-600">Snapshot captured {formatSnapshotTime(data.snapshotCreatedAt)}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-900">
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={loadMonth}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>

          <button
            onClick={captureSnapshot}
            disabled={!isCurrentMonth || snapshotSaving}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
              isCurrentMonth
                ? "border-[#2093FF]/30 bg-[#2093FF]/20 text-[#2093FF] hover:bg-[#2093FF]/30"
                : "cursor-not-allowed border-white/10 bg-white/5 text-slate-500"
            )}
          >
            <Archive className={cn("h-4 w-4", snapshotSaving && "animate-pulse")} />
            Save Snapshot
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {!isCurrentMonth && data?.noSnapshot ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-300">No data captured for {data.monthLabel}.</p>
          <p className="mt-1 text-xs text-amber-100/70">
            Historical months load only from `monthly_snapshots`. Select the current month to view live data or capture
            a snapshot at month end.
          </p>
        </div>
      ) : null}

      {!isCurrentMonth && data?.hasSnapshot ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
          Historical snapshot loaded. Expense edits are disabled for archived months.
        </div>
      ) : null}

      {historyError ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-400">
          Revenue history fallback: {historyError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {[
          { label: "Gross MRR", value: fmt(summary.grossMRR), icon: DollarSign, color: "#22C55E" },
          { label: "Stripe Fees", value: fmt(summary.totalStripeFees), icon: CreditCard, color: "#EC4899" },
          { label: "Net MRR", value: fmt(summary.netMRR), icon: TrendingUp, color: "#2093FF" },
          { label: "Expenses", value: fmt(summary.totalExpenses), icon: Receipt, color: "#F93C3C" },
          { label: "Profit", value: fmt(summary.profit), icon: Zap, color: "#22C55E" },
          { label: "Margin", value: pct(summary.profitMargin), icon: TrendingUp, color: "#FFBD59" },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-4">
            <div className="mb-2 flex items-center gap-2">
              <card.icon className="h-4 w-4" style={{ color: card.color }} />
              <span className="text-[11px] uppercase tracking-wider text-slate-500">{card.label}</span>
            </div>
            <p className="font-mono text-xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-slate-400">Annual Run Rate → $1M Goal</span>
          <span className="font-mono text-sm text-[#2093FF]">{fmt(summary.arr)}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2093FF] to-[#0026FF] transition-all"
            style={{ width: `${Math.min((summary.arr / 1000000) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-600">{pct((summary.arr / 1000000) * 100)} of $1M</p>
      </div>

      <div className="flex w-fit gap-1 rounded-lg bg-white/[0.03] p-1">
        {(["overview", "clients", "expenses", "payroll", "commissions"] as Tab[]).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={cn(
              "rounded-md px-4 py-2 text-sm capitalize transition-colors",
              tab === item ? "bg-[#2093FF]/20 text-[#2093FF]" : "text-slate-500 hover:text-white"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="glass-panel rounded-xl p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-400">Revenue Trends</h3>
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-600">
                  {historyLoading ? "Loading" : `${Math.max(trendSeries.length, 1)} months`}
                </span>
              </div>
              <ReactECharts option={revenueTrendOption} style={{ height: 320 }} />
            </div>

            <div className="glass-panel rounded-xl p-5">
              <h3 className="mb-4 text-sm font-medium text-slate-400">Monthly P&amp;L</h3>
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    Gross MRR ({summary.activeSubscriptions} subscriptions)
                  </span>
                  <span className="font-mono text-sm text-green-400">{fmt(summary.grossMRR)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-pink-400" />
                    Stripe Fees
                  </span>
                  <span className="font-mono text-sm text-pink-400">-{fmt(summary.totalStripeFees)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    Net MRR
                  </span>
                  <span className="font-mono text-sm text-blue-400">{fmt(summary.netMRR)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    Expenses
                  </span>
                  <span className="font-mono text-sm text-red-400">-{fmt(summary.totalExpenses)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-sm font-medium">Monthly Profit</span>
                  <span className={cn("font-mono text-lg font-bold", summary.profit >= 0 ? "text-green-400" : "text-red-400")}>
                    {fmt(summary.profit)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
              <h3 className="mb-4 text-sm font-medium text-slate-400">Revenue by Client (Top 15)</h3>
              {clientChartData.length > 0 ? (
                <ReactECharts option={revenueByClientOption} style={{ height: 300 }} />
              ) : (
                <p className="text-sm text-slate-600">No revenue data for this month.</p>
              )}
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
              <h3 className="mb-4 text-sm font-medium text-slate-400">Expense Breakdown</h3>
              {Object.keys(categoryTotals).length > 0 ? (
                <ReactECharts option={expenseBreakdownOption} style={{ height: 300 }} />
              ) : (
                <p className="text-sm text-slate-600">No expenses captured for this month.</p>
              )}
            </div>
          </div>

          {failedPayments.length > 0 ? (
            <div className="rounded-xl border border-[#F93C3C]/20 bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-400">Failed Payments</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Open, uncollectible, and past-due payment failures for this month.
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#F93C3C]/70">{failedPayments.length} items</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFailedPaymentsModal(true)}
                className="mt-4 w-full rounded-2xl border border-[#F93C3C]/30 bg-[#F93C3C]/10 px-5 py-4 text-left transition hover:border-[#F93C3C]/40 hover:bg-[#F93C3C]/14"
              >
                <div className="flex items-center gap-2 text-[#F93C3C]">
                  <Minus className="h-4 w-4" />
                  <span className="text-[11px] uppercase tracking-wider">Total Failed Revenue</span>
                </div>
                <p className="mt-2 font-mono text-3xl font-bold text-[#F93C3C]">{fmt(summary.totalFailedRevenue)}</p>
                <p className="mt-2 text-xs text-slate-400">Click for payment breakdown</p>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "clients" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search clients..."
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-[#2093FF]/50 focus:outline-none"
            />
          </div>

          {selectedCustomer ? (
            <div className="space-y-4 rounded-xl border border-[#2093FF]/30 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                  <span className="text-xs text-slate-500">{selectedCustomer.email}</span>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="rounded-lg p-2 hover:bg-white/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "MRR", value: fmt(selectedCustomer.mrr), color: "text-green-400" },
                  { label: "Stripe Fee", value: fmt(selectedCustomer.stripeFee), color: "text-pink-400" },
                  { label: "Net MRR", value: fmt(selectedCustomer.netMrr), color: "text-blue-400" },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase text-slate-500">{item.label}</p>
                    <p className={cn("font-mono text-lg font-semibold", item.color)}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="p-4 text-left text-[11px] uppercase tracking-wider text-slate-500">Client</th>
                  <th className="p-4 text-right text-[11px] uppercase tracking-wider text-slate-500">MRR</th>
                  <th className="p-4 text-right text-[11px] uppercase tracking-wider text-slate-500">Stripe Fee</th>
                  <th className="p-4 text-right text-[11px] uppercase tracking-wider text-slate-500">Net MRR</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.stripeId}
                    onClick={() => setSelectedCustomer(customer)}
                    className={cn(
                      "cursor-pointer border-b border-white/[0.03] transition-colors",
                      selectedCustomer?.stripeId === customer.stripeId ? "bg-[#2093FF]/10" : "hover:bg-white/[0.03]"
                    )}
                  >
                    <td className="p-4">
                      <span className="text-sm font-medium">{customer.name}</span>
                      {customer.pastDue ? (
                        <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-400">
                          PAST DUE
                        </span>
                      ) : null}
                      {customer.subscriptionCount > 1 ? (
                        <span className="ml-1 rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-500">
                          {customer.subscriptionCount} subs
                        </span>
                      ) : null}
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-green-400">{fmt(customer.mrr)}</td>
                    <td className="p-4 text-right font-mono text-sm text-pink-400">{fmt(customer.stripeFee)}</td>
                    <td className="p-4 text-right font-mono text-sm text-blue-400">{fmt(customer.netMrr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "expenses" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {CATEGORIES.map((category) => {
              const items = expenses.filter((expense) => expense.category === category);
              const total = items.reduce((sum, expense) => sum + Number(expense.amount), 0);
              if (total === 0) return null;
              return (
                <div
                  key={category}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"
                  style={{ borderLeftWidth: 3, borderLeftColor: CAT_COLORS[category] }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: CAT_COLORS[category] }}>
                      {category}
                    </span>
                    <span className="text-[10px] text-slate-600">{items.length} items</span>
                  </div>
                  <p className="font-mono text-lg font-semibold text-white">{fmt(total)}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500">{expenses.length} expenses</p>
              {readOnly ? <span className="text-[10px] text-slate-600">Historical snapshot</span> : null}
            </div>
            {!readOnly ? (
              <button
                onClick={() => setShowAddExpense((value) => !value)}
                className="flex items-center gap-2 rounded-lg border border-[#2093FF]/30 bg-[#2093FF]/20 px-3 py-2 text-sm text-[#2093FF] hover:bg-[#2093FF]/30"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </button>
            ) : null}
          </div>

          {showAddExpense && !readOnly ? (
            <div className="space-y-4 rounded-xl border border-[#2093FF]/30 bg-white/[0.03] p-5">
              <h3 className="text-sm font-medium">New Expense</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <input
                  value={newExp.name}
                  onChange={(event) => setNewExp({ ...newExp, name: event.target.value })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-[#2093FF]/50 focus:outline-none"
                  placeholder="Expense name"
                />
                <input
                  value={newExp.amount}
                  onChange={(event) => setNewExp({ ...newExp, amount: event.target.value })}
                  type="number"
                  step="0.01"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-[#2093FF]/50 focus:outline-none"
                  placeholder="0.00"
                />
                <select
                  value={newExp.category}
                  onChange={(event) => setNewExp({ ...newExp, category: event.target.value })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-[#2093FF]/50 focus:outline-none"
                >
                  {[
                    ...CATEGORIES,
                    "payroll",
                    "commissions",
                  ].map((category) => (
                    <option key={category} value={category} className="bg-slate-900">
                      {category}
                    </option>
                  ))}
                </select>
                <select
                  value={newExp.type}
                  onChange={(event) => setNewExp({ ...newExp, type: event.target.value })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-[#2093FF]/50 focus:outline-none"
                >
                  <option value="recurring" className="bg-slate-900">
                    Recurring
                  </option>
                  <option value="one-time" className="bg-slate-900">
                    One-time
                  </option>
                </select>
                <input
                  value={newExp.client_name}
                  onChange={(event) => setNewExp({ ...newExp, client_name: event.target.value })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-[#2093FF]/50 focus:outline-none"
                  placeholder="Client name"
                />
                <input
                  value={newExp.notes}
                  onChange={(event) => setNewExp({ ...newExp, notes: event.target.value })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-[#2093FF]/50 focus:outline-none"
                  placeholder="Notes"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={addExpense} className="rounded-lg bg-[#2093FF] px-4 py-2 text-sm font-medium hover:bg-[#2093FF]/80">
                  Save
                </button>
                <button onClick={() => setShowAddExpense(false)} className="rounded-lg bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {["software", "marketing", "hosting", "fulfillment", "operations", "other"].map((category) => {
            const items = expenses.filter((expense) => expense.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: CAT_COLORS[category] }} />
                    <span className="text-sm font-medium capitalize">{category}</span>
                    <span className="text-[10px] text-slate-600">{items.length} items</span>
                  </div>
                  <span className="font-mono text-sm text-red-400">-{fmt(items.reduce((sum, expense) => sum + Number(expense.amount), 0))}</span>
                </div>
                <div className="divide-y divide-white/[0.03]">
                  {items.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      readOnly={readOnly}
                      onUpdate={updateExpense}
                      onDelete={deleteExpense}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "payroll" ? (
        <div className="space-y-4">
          {expenses.filter((expense) => expense.category === "payroll").map((expense) => (
            <div key={expense.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <EditableField
                    value={expense.name}
                    onSave={(value) => updateExpense(expense.id, "name", value)}
                    disabled={readOnly}
                    className="text-sm font-medium"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">{expense.notes || "No notes"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <EditableField
                    value={String(expense.amount)}
                    type="number"
                    onSave={(value) => updateExpense(expense.id, "amount", Number.parseFloat(value))}
                    disabled={readOnly}
                    className="font-mono text-xl font-semibold text-amber-400"
                  />
                  {!readOnly ? (
                    <button onClick={() => deleteExpense(expense.id)} className="rounded p-1.5 hover:bg-red-500/20 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {expenses.filter((expense) => expense.category === "payroll").length === 0 ? (
            <div className="py-12 text-center text-slate-600">No payroll items for this month.</div>
          ) : null}
        </div>
      ) : null}

      {tab === "commissions" ? (
        <div className="space-y-4">
          {expenses.filter((expense) => expense.category === "commissions").map((expense) => (
            <div key={expense.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <EditableField
                    value={expense.name}
                    onSave={(value) => updateExpense(expense.id, "name", value)}
                    disabled={readOnly}
                    className="text-sm font-medium"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">{expense.client_name || expense.notes || "No notes"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <EditableField
                    value={String(expense.amount)}
                    type="number"
                    onSave={(value) => updateExpense(expense.id, "amount", Number.parseFloat(value))}
                    disabled={readOnly}
                    className="font-mono text-xl font-semibold text-orange-400"
                  />
                  {!readOnly ? (
                    <button onClick={() => deleteExpense(expense.id)} className="rounded p-1.5 hover:bg-red-500/20 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {expenses.filter((expense) => expense.category === "commissions").length === 0 ? (
            <div className="py-12 text-center text-slate-600">No commissions for this month.</div>
          ) : null}
        </div>
      ) : null}

      {showFailedPaymentsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-[#0f1118] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Failed Payments</h3>
                <p className="text-sm text-slate-500">{data?.monthLabel}</p>
              </div>
              <button onClick={() => setShowFailedPaymentsModal(false)} className="rounded-lg p-2 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {failedPayments.map((payment) => (
                <div key={`${payment.stripeCustomerId}-${payment.amount}-${payment.dueDate}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{payment.customerName}</p>
                      <p className="text-xs text-slate-500">{payment.email || "No email"}</p>
                      <p className="mt-2 text-xs text-slate-400">Due {formatFailedDueDate(payment.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-semibold text-red-400">{fmt(payment.amount)}</p>
                      {payment.invoiceUrl ? (
                        <a
                          href={payment.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs text-blue-400 hover:text-blue-300"
                        >
                          Open invoice
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
