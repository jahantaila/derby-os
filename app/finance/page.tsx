"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, ArrowRight, ChevronDown, Search, Trash2 } from "lucide-react";
import {
  FinanceClientType,
  FinanceData,
  FinanceGeneralMonthData,
  FinanceLedgerRow,
  FinanceServiceType,
} from "@/lib/finance-types";

const DEFAULT_GOAL = 15000;

type DashboardTab = "revenue" | "expenses" | "clients" | "reports";
type ExpenseSectionKey = "recurringExpenses" | "employeeExpenses" | "oneTimeExpenses";
type RevenueSortKey = "clientName" | "service" | "amount" | "recurring" | "date" | "status";
type ClientSortKey = "name" | "revenue" | "profitMargin";

type RevenueRow = {
  id: string;
  clientId: string;
  clientName: string;
  clientType: FinanceClientType;
  service: FinanceServiceType;
  amount: number;
  recurring: "M" | "1-time";
  date: string;
  status: "paid" | "pending";
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percent = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const SERVICE_OPTIONS: FinanceServiceType[] = [
  "Website",
  "SEO",
  "Social Media",
  "Google Ads",
  "Meta Ads",
  "Software",
  "Review Automation",
  "Other",
];

const CLIENT_TYPE_LABEL: Record<FinanceClientType, string> = {
  restaurant: "Restaurant",
  "home-service": "Home Service",
  gaming: "Gaming",
  other: "Other",
};

const SERVICE_COLORS: Record<FinanceServiceType, string> = {
  Website: "#3b82f6",
  SEO: "#10b981",
  "Social Media": "#f59e0b",
  "Google Ads": "#ef4444",
  "Meta Ads": "#60a5fa",
  Software: "#6366f1",
  "Review Automation": "#14b8a6",
  Other: "#94a3b8",
};

const CLIENT_TYPE_COLORS: Record<FinanceClientType, string> = {
  restaurant: "#2093FF",
  "home-service": "#10b981",
  gaming: "#f59e0b",
  other: "#ef4444",
};

const SERVICE_BADGE_CLASS: Record<FinanceServiceType, string> = {
  Website: "border-blue-400/40 bg-blue-500/15 text-blue-100",
  SEO: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  "Social Media": "border-amber-400/40 bg-amber-500/15 text-amber-100",
  "Google Ads": "border-rose-400/40 bg-rose-500/15 text-rose-100",
  "Meta Ads": "border-sky-400/40 bg-sky-500/15 text-sky-100",
  Software: "border-indigo-400/40 bg-indigo-500/15 text-indigo-100",
  "Review Automation": "border-teal-400/40 bg-teal-500/15 text-teal-100",
  Other: "border-slate-400/40 bg-slate-500/15 text-slate-200",
};

function formatMoney(value: number) {
  return money.format(Number.isFinite(value) ? value : 0);
}

function formatCompactMoney(value: number) {
  return compactMoney.format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number) {
  return `${percent.format(Number.isFinite(value) ? value : 0)}%`;
}

function monthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return `${year}-${month}`;
}

function shiftMonth(value: string, delta: number) {
  const [year, month] = value.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthShortLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function emptyClientMonth(month: string) {
  return {
    month,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [] as FinanceLedgerRow[],
    expenses: [] as FinanceLedgerRow[],
  };
}

function emptyGeneralMonth(month: string): FinanceGeneralMonthData {
  return {
    month,
    goalAmount: DEFAULT_GOAL,
    recurringExpenses: [],
    employeeExpenses: [],
    oneTimeExpenses: [],
  };
}

function cloneRecurringRows(rows: FinanceLedgerRow[]): FinanceLedgerRow[] {
  return rows
    .filter((row) => row.recurring === "M")
    .map((row) => ({
      ...row,
      id: crypto.randomUUID(),
    }));
}

function ensureMonthData(data: FinanceData, month: string): FinanceData {
  const prev = shiftMonth(month, -1);
  const nextClients = data.clients.map((client) => {
    if (client.months[month]) return client;

    const prevMonth = client.months[prev];
    const nextMonth = prevMonth
      ? {
          month,
          goalAmount: prevMonth.goalAmount,
          stripeFeeOverride: null,
          income: cloneRecurringRows(prevMonth.income),
          expenses: cloneRecurringRows(prevMonth.expenses),
        }
      : emptyClientMonth(month);

    return {
      ...client,
      months: {
        ...client.months,
        [month]: nextMonth,
      },
    };
  });

  const nextGeneralMonths = { ...data.generalData.months };
  if (!nextGeneralMonths[month]) {
    const prevGeneral = nextGeneralMonths[prev];
    nextGeneralMonths[month] = prevGeneral
      ? {
          month,
          goalAmount: prevGeneral.goalAmount,
          recurringExpenses: cloneRecurringRows(prevGeneral.recurringExpenses),
          employeeExpenses: cloneRecurringRows(prevGeneral.employeeExpenses),
          oneTimeExpenses: [],
        }
      : emptyGeneralMonth(month);
  }

  return {
    ...data,
    clients: nextClients,
    generalData: {
      months: nextGeneralMonths,
    },
  };
}

function totalGeneralExpenses(month: FinanceGeneralMonthData) {
  return (
    month.recurringExpenses.reduce((sum, row) => sum + row.amount, 0) +
    month.employeeExpenses.reduce((sum, row) => sum + row.amount, 0) +
    month.oneTimeExpenses.reduce((sum, row) => sum + row.amount, 0)
  );
}

function inferServiceFromText(value: string): FinanceServiceType {
  const normalized = value.toLowerCase();
  if (normalized.includes("review")) return "Review Automation";
  if (normalized.includes("software") || normalized.includes("saas")) return "Software";
  if (normalized.includes("meta") || normalized.includes("facebook") || normalized.includes("instagram")) return "Meta Ads";
  if (normalized.includes("google") || normalized.includes("ppc")) return "Google Ads";
  if (normalized.includes("social")) return "Social Media";
  if (normalized.includes("seo")) return "SEO";
  if (normalized.includes("website") || normalized.includes("hosting") || normalized.includes("site")) return "Website";
  return "Other";
}

function compareValue(a: string | number, b: string | number, dir: "asc" | "desc") {
  const ratio = dir === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * ratio;
  return String(a).localeCompare(String(b)) * ratio;
}

function trailingMonths(month: string, count: number) {
  return Array.from({ length: count }).map((_, idx) => shiftMonth(month, -(count - idx - 1)));
}

function statValueClass(value: number) {
  return value >= 0 ? "text-emerald-200" : "text-rose-200";
}

function MetricCard({ title, value, caption }: { title: string; value: string; caption?: string }) {
  return (
    <article className="glass-card relative overflow-hidden rounded-2xl p-3 sm:p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(32,147,255,0),#2093FF,rgba(0,38,255,0))]" />
      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">{value}</p>
      {caption ? <p className="mt-1 text-sm text-slate-400">{caption}</p> : null}
    </article>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-panel rounded-2xl p-3 sm:p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-200">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey());
  const [activeTab, setActiveTab] = useState<DashboardTab>("revenue");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestSaveRequest = useRef(0);

  const [revenueSearch, setRevenueSearch] = useState("");
  const [revenueServiceFilter, setRevenueServiceFilter] = useState<"all" | FinanceServiceType>("all");
  const [revenueClientTypeFilter, setRevenueClientTypeFilter] = useState<"all" | FinanceClientType>("all");
  const [revenueRecurringFilter, setRevenueRecurringFilter] = useState<"all" | "M" | "1-time">("all");
  const [revenueSort, setRevenueSort] = useState<{ key: RevenueSortKey; dir: "asc" | "desc" }>({ key: "amount", dir: "desc" });

  const [expensesOpen, setExpensesOpen] = useState<Record<ExpenseSectionKey, boolean>>({
    recurringExpenses: true,
    employeeExpenses: true,
    oneTimeExpenses: true,
  });

  const [clientSort, setClientSort] = useState<ClientSortKey>("revenue");
  const [clientTypeFilter, setClientTypeFilter] = useState<"all" | FinanceClientType>("all");
  const [clientStatusFilter, setClientStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [clientServiceFilter, setClientServiceFilter] = useState<"all" | FinanceServiceType>("all");

  async function loadFinance() {
    try {
      setLoading(true);
      const response = await fetch("/api/finance", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load finance");

      const nextData = (await response.json()) as FinanceData;
      setData(nextData);

      const availableMonths = Object.keys(nextData.generalData.months).sort();
      const nowMonth = monthKey();
      const fallback = availableMonths[availableMonths.length - 1] ?? nowMonth;
      setSelectedMonth((current) => (nextData.generalData.months[current] ? current : nextData.generalData.months[nowMonth] ? nowMonth : fallback));

      setError(null);
    } catch {
      setError("Could not load finance data.");
    } finally {
      setLoading(false);
    }
  }

  async function persist(nextData: FinanceData) {
    const requestId = latestSaveRequest.current + 1;
    latestSaveRequest.current = requestId;

    try {
      setSaving(true);
      const response = await fetch("/api/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextData),
      });
      if (!response.ok) throw new Error("Failed to save finance");
      const saved = (await response.json()) as FinanceData;
      if (requestId !== latestSaveRequest.current) return;
      setData(saved);
      setError(null);
    } catch {
      if (requestId !== latestSaveRequest.current) return;
      setError("Could not save finance changes.");
    } finally {
      if (requestId !== latestSaveRequest.current) return;
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadFinance();
  }, []);

  const monthData = useMemo(() => {
    if (!data) return null;
    return ensureMonthData(data, selectedMonth);
  }, [data, selectedMonth]);

  const generalMonth = useMemo(() => {
    if (!monthData) return emptyGeneralMonth(selectedMonth);
    return monthData.generalData.months[selectedMonth] ?? emptyGeneralMonth(selectedMonth);
  }, [monthData, selectedMonth]);

  function commit(nextData: FinanceData) {
    setData(nextData);
    void persist(nextData);
  }

  function withMonth(updater: (current: FinanceData) => FinanceData) {
    if (!monthData) return;
    const next = updater(monthData);
    commit(next);
  }

  function changeMonth(delta: number) {
    const next = shiftMonth(selectedMonth, delta);
    setSelectedMonth(next);

    if (!data) return;
    const nextData = ensureMonthData(data, next);
    if (JSON.stringify(nextData) !== JSON.stringify(data)) {
      commit(nextData);
    }
  }

  function updateGeneralMonth(updater: (current: FinanceGeneralMonthData) => FinanceGeneralMonthData) {
    withMonth((currentData) => ({
      ...currentData,
      generalData: {
        months: {
          ...currentData.generalData.months,
          [selectedMonth]: updater(currentData.generalData.months[selectedMonth] ?? emptyGeneralMonth(selectedMonth)),
        },
      },
    }));
  }

  function addGeneralRow(section: ExpenseSectionKey) {
    updateGeneralMonth((current) => ({
      ...current,
      [section]: [
        ...current[section],
        {
          id: crypto.randomUUID(),
          name: "",
          date: "",
          recurring: section === "oneTimeExpenses" ? "1-time" : "M",
          notes: "",
          amount: 0,
          paymentStatus: "pending",
          service: "Other",
        },
      ],
    }));
  }

  function updateGeneralRow(section: ExpenseSectionKey, id: string, updater: (row: FinanceLedgerRow) => FinanceLedgerRow) {
    updateGeneralMonth((current) => ({
      ...current,
      [section]: current[section].map((row) => (row.id === id ? updater(row) : row)),
    }));
  }

  function deleteGeneralRow(section: ExpenseSectionKey, id: string) {
    if (!window.confirm("Delete this row?")) return;
    updateGeneralMonth((current) => ({
      ...current,
      [section]: current[section].filter((row) => row.id !== id),
    }));
  }

  const summary = useMemo(() => {
    if (!monthData) {
      return {
        monthlyRevenue: 0,
        monthlyExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        mrr: 0,
        activeClients: 0,
        goalProgress: 0,
      };
    }

    const monthlyRevenue = monthData.clients.reduce(
      (sum, client) => sum + (client.months[selectedMonth]?.income ?? []).reduce((rowSum, row) => rowSum + row.amount, 0),
      0,
    );

    const clientExpenses = monthData.clients.reduce(
      (sum, client) => sum + (client.months[selectedMonth]?.expenses ?? []).reduce((rowSum, row) => rowSum + row.amount, 0),
      0,
    );

    const monthlyExpenses = totalGeneralExpenses(generalMonth) + clientExpenses;
    const netProfit = monthlyRevenue - monthlyExpenses;
    const profitMargin = monthlyRevenue > 0 ? (netProfit / monthlyRevenue) * 100 : 0;
    const mrr = monthData.clients.reduce(
      (sum, client) =>
        sum +
        (client.months[selectedMonth]?.income ?? [])
          .filter((row) => row.recurring === "M")
          .reduce((rowSum, row) => rowSum + row.amount, 0),
      0,
    );
    const activeClients = monthData.clients.filter((client) => client.status === "active").length;
    const goalProgress = Math.max(0, Math.min(100, (netProfit / DEFAULT_GOAL) * 100));

    return {
      monthlyRevenue,
      monthlyExpenses,
      netProfit,
      profitMargin,
      mrr,
      activeClients,
      goalProgress,
    };
  }, [generalMonth, monthData, selectedMonth]);

  const sixMonthSeries = useMemo(() => {
    if (!monthData) return [];
    return trailingMonths(selectedMonth, 6).map((month) => {
      const monthRevenue = monthData.clients.reduce(
        (sum, client) => sum + (client.months[month]?.income ?? []).reduce((rowSum, row) => rowSum + row.amount, 0),
        0,
      );
      const monthClientExpenses = monthData.clients.reduce(
        (sum, client) => sum + (client.months[month]?.expenses ?? []).reduce((rowSum, row) => rowSum + row.amount, 0),
        0,
      );
      const monthGeneral = monthData.generalData.months[month] ?? emptyGeneralMonth(month);
      const monthExpenses = totalGeneralExpenses(monthGeneral) + monthClientExpenses;
      const profit = monthRevenue - monthExpenses;
      const margin = monthRevenue > 0 ? (profit / monthRevenue) * 100 : 0;

      return {
        month,
        label: monthShortLabel(month),
        revenue: Number(monthRevenue.toFixed(2)),
        expenses: Number(monthExpenses.toFixed(2)),
        margin: Number(margin.toFixed(2)),
        goalMet: profit >= DEFAULT_GOAL,
      };
    });
  }, [monthData, selectedMonth]);

  const revenueByService = useMemo(() => {
    if (!monthData) return [];
    const totals = new Map<FinanceServiceType, number>();

    for (const service of SERVICE_OPTIONS) totals.set(service, 0);

    for (const client of monthData.clients) {
      const rows = client.months[selectedMonth]?.income ?? [];
      for (const row of rows) {
        const service = row.service ?? client.services[0] ?? inferServiceFromText(`${row.name} ${row.notes}`);
        totals.set(service, (totals.get(service) ?? 0) + row.amount);
      }
    }

    return SERVICE_OPTIONS.map((service) => ({
      name: service,
      value: Number((totals.get(service) ?? 0).toFixed(2)),
      color: SERVICE_COLORS[service],
    })).filter((item) => item.value > 0);
  }, [monthData, selectedMonth]);

  const revenueByClientType = useMemo(() => {
    if (!monthData) return [];
    const totals = new Map<FinanceClientType, number>();

    for (const type of Object.keys(CLIENT_TYPE_LABEL) as FinanceClientType[]) totals.set(type, 0);

    for (const client of monthData.clients) {
      const revenue = (client.months[selectedMonth]?.income ?? []).reduce((sum, row) => sum + row.amount, 0);
      totals.set(client.clientType, (totals.get(client.clientType) ?? 0) + revenue);
    }

    return (Object.keys(CLIENT_TYPE_LABEL) as FinanceClientType[])
      .map((type) => ({
        name: CLIENT_TYPE_LABEL[type],
        value: Number((totals.get(type) ?? 0).toFixed(2)),
        color: CLIENT_TYPE_COLORS[type],
      }))
      .filter((entry) => entry.value > 0);
  }, [monthData, selectedMonth]);

  const revenueRows = useMemo<RevenueRow[]>(() => {
    if (!monthData) return [];

    return monthData.clients.flatMap((client) => {
      const rows = client.months[selectedMonth]?.income ?? [];
      return rows.map((row) => ({
        id: row.id,
        clientId: client.id,
        clientName: client.name,
        clientType: client.clientType,
        service: row.service ?? client.services[0] ?? inferServiceFromText(`${row.name} ${row.notes}`),
        amount: row.amount,
        recurring: row.recurring,
        date: row.date,
        status: row.paymentStatus ?? "paid",
      }));
    });
  }, [monthData, selectedMonth]);

  const filteredRevenueRows = useMemo(() => {
    const search = revenueSearch.trim().toLowerCase();

    return [...revenueRows]
      .filter((row) => {
        if (search && !`${row.clientName} ${row.service} ${row.date}`.toLowerCase().includes(search)) return false;
        if (revenueServiceFilter !== "all" && row.service !== revenueServiceFilter) return false;
        if (revenueClientTypeFilter !== "all" && row.clientType !== revenueClientTypeFilter) return false;
        if (revenueRecurringFilter !== "all" && row.recurring !== revenueRecurringFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (revenueSort.key === "amount") return compareValue(a.amount, b.amount, revenueSort.dir);
        if (revenueSort.key === "clientName") return compareValue(a.clientName, b.clientName, revenueSort.dir);
        if (revenueSort.key === "service") return compareValue(a.service, b.service, revenueSort.dir);
        if (revenueSort.key === "recurring") return compareValue(a.recurring, b.recurring, revenueSort.dir);
        if (revenueSort.key === "date") return compareValue(a.date, b.date, revenueSort.dir);
        return compareValue(a.status, b.status, revenueSort.dir);
      });
  }, [revenueClientTypeFilter, revenueRecurringFilter, revenueRows, revenueSearch, revenueServiceFilter, revenueSort]);

  const totalFilteredRevenue = useMemo(
    () => filteredRevenueRows.reduce((sum, row) => sum + row.amount, 0),
    [filteredRevenueRows],
  );

  const clientCards = useMemo(() => {
    if (!monthData) return [];

    const base = monthData.clients.map((client) => {
      const monthRows = client.months[selectedMonth] ?? emptyClientMonth(selectedMonth);
      const revenue = monthRows.income.reduce((sum, row) => sum + row.amount, 0);
      const expenses = monthRows.expenses.reduce((sum, row) => sum + row.amount, 0);
      const profit = revenue - expenses;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        client,
        revenue,
        profitMargin,
      };
    });

    return base
      .filter((entry) => {
        if (clientTypeFilter !== "all" && entry.client.clientType !== clientTypeFilter) return false;
        if (clientStatusFilter !== "all" && entry.client.status !== clientStatusFilter) return false;
        if (clientServiceFilter !== "all" && !entry.client.services.includes(clientServiceFilter)) return false;
        return true;
      })
      .sort((a, b) => {
        if (clientSort === "name") return a.client.name.localeCompare(b.client.name);
        if (clientSort === "profitMargin") return b.profitMargin - a.profitMargin;
        return b.revenue - a.revenue;
      });
  }, [clientServiceFilter, clientSort, clientStatusFilter, clientTypeFilter, monthData, selectedMonth]);

  const reportData = useMemo(() => {
    if (!monthData) {
      return {
        ytdRevenue: 0,
        ytdExpenses: 0,
        ytdProfit: 0,
        topClients: [] as Array<{ name: string; profit: number }>,
        expenseBreakdown: { recurring: 0, employee: 0, oneTime: 0 },
      };
    }

    const [year] = selectedMonth.split("-").map(Number);
    const monthsInYear = Object.keys(monthData.generalData.months)
      .filter((month) => month.startsWith(`${year}-`) && month <= selectedMonth)
      .sort();

    let ytdRevenue = 0;
    let ytdExpenses = 0;

    for (const month of monthsInYear) {
      const monthRevenue = monthData.clients.reduce(
        (sum, client) => sum + (client.months[month]?.income ?? []).reduce((rowSum, row) => rowSum + row.amount, 0),
        0,
      );

      const monthClientExpenses = monthData.clients.reduce(
        (sum, client) => sum + (client.months[month]?.expenses ?? []).reduce((rowSum, row) => rowSum + row.amount, 0),
        0,
      );

      const monthGeneral = monthData.generalData.months[month] ?? emptyGeneralMonth(month);
      ytdRevenue += monthRevenue;
      ytdExpenses += totalGeneralExpenses(monthGeneral) + monthClientExpenses;
    }

    const topClients = monthData.clients
      .map((client) => {
        const monthRows = client.months[selectedMonth] ?? emptyClientMonth(selectedMonth);
        const revenue = monthRows.income.reduce((sum, row) => sum + row.amount, 0);
        const expenses = monthRows.expenses.reduce((sum, row) => sum + row.amount, 0);
        return { name: client.name, profit: revenue - expenses };
      })
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);

    return {
      ytdRevenue,
      ytdExpenses,
      ytdProfit: ytdRevenue - ytdExpenses,
      topClients,
      expenseBreakdown: {
        recurring: generalMonth.recurringExpenses.reduce((sum, row) => sum + row.amount, 0),
        employee: generalMonth.employeeExpenses.reduce((sum, row) => sum + row.amount, 0),
        oneTime: generalMonth.oneTimeExpenses.reduce((sum, row) => sum + row.amount, 0),
      },
    };
  }, [generalMonth, monthData, selectedMonth]);

  if (loading && !data) {
    return <section className="glass-panel rounded-2xl p-6 text-sm text-slate-300">Loading finance dashboard...</section>;
  }

  if (!monthData) {
    return <section className="glass-panel rounded-2xl p-6 text-sm text-red-200">Finance data unavailable.</section>;
  }

  const marginLineColor = sixMonthSeries[sixMonthSeries.length - 1]?.goalMet ? "#10b981" : "#ef4444";

  return (
    <section className="animate-enter space-y-5 sm:space-y-6" style={{ animationDelay: "80ms", backgroundColor: "#0a0a0f" }}>
      <header className="glass-panel page-header mb-4 p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="page-title">Finance Dashboard</h1>
            <p className="mt-2 text-sm text-slate-300">QuickBooks-style financial intelligence across revenue, expenses, clients, and reports.</p>
          </div>
          <div className="glass-card inline-flex items-center gap-2 self-start rounded-xl px-2 py-2 md:self-auto">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="min-h-11 rounded-lg border border-white/10 bg-white/5 p-2.5 text-slate-100 transition hover:border-blue-300/40 hover:bg-blue-500/15"
              aria-label="Previous month"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-[8.5rem] text-center text-sm font-semibold text-white sm:min-w-[9rem]">{`< ${monthLabel(selectedMonth)} >`}</div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="min-h-11 rounded-lg border border-white/10 bg-white/5 p-2.5 text-slate-100 transition hover:border-blue-300/40 hover:bg-blue-500/15"
              aria-label="Next month"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </header>

      {error ? <div className="mb-3 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div> : null}
      {saving ? <div className="mb-3 text-xs uppercase tracking-[0.18em] text-blue-200/80">Saving finance data...</div> : null}

      <div className="sticky top-2 z-30 mb-5 rounded-2xl border border-white/10 bg-[#0a0a0f]/70 p-2 backdrop-blur-lg">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
          <MetricCard title="Monthly Revenue" value={formatMoney(summary.monthlyRevenue)} />
          <MetricCard title="Monthly Expenses" value={formatMoney(summary.monthlyExpenses)} />
          <MetricCard title="Net Profit" value={formatMoney(summary.netProfit)} caption={summary.netProfit >= 0 ? "Above break-even" : "Under break-even"} />
          <MetricCard title="Profit Margin" value={formatPercent(summary.profitMargin)} caption={summary.profitMargin >= 30 ? "Healthy margin" : "Below target margin"} />
          <MetricCard title="MRR" value={formatMoney(summary.mrr)} />
          <MetricCard title="Active Clients" value={String(summary.activeClients)} />
          <article className="glass-card relative overflow-hidden rounded-2xl p-3 sm:p-4">
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(32,147,255,0),#2093FF,rgba(0,38,255,0))]" />
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Goal Progress</p>
            <p className={`mt-2 text-xl font-semibold tracking-[-0.02em] sm:text-2xl ${statValueClass(summary.netProfit)}`}>{formatPercent(summary.goalProgress)}</p>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-[linear-gradient(90deg,#2093FF,#0026FF)] transition-all duration-500"
                style={{ width: `${Math.max(4, Math.min(100, summary.goalProgress))}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-slate-400">Target: {formatMoney(DEFAULT_GOAL)} monthly profit</p>
          </article>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Revenue vs Expenses (Last 6 Months)">
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sixMonthSeries}>
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactMoney(value as number)} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatMoney(value), name === "revenue" ? "Revenue" : "Expenses"]}
                  contentStyle={{ background: "#0f1322", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 10 }}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]} fill="#2093FF" />
                <Bar dataKey="expenses" radius={[6, 6, 0, 0]} fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Revenue by Service Type">
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByService} dataKey="value" nameKey="name" innerRadius={55} outerRadius={86} paddingAngle={2}>
                  {revenueByService.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={{ background: "#0f1322", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {revenueByService.map((item) => (
              <span key={item.name} className={`rounded-full border px-2 py-1 text-xs ${SERVICE_BADGE_CLASS[item.name as FinanceServiceType]}`}>
                {item.name}
              </span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Revenue by Client Type">
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByClientType} dataKey="value" nameKey="name" innerRadius={55} outerRadius={86} paddingAngle={2}>
                  {revenueByClientType.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMoney(value)} contentStyle={{ background: "#0f1322", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-300">
            {revenueByClientType.map((item) => (
              <span key={item.name} className="rounded-full border border-white/20 px-2 py-1">{item.name}</span>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Profit Margin Trend (Last 6 Months)">
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sixMonthSeries}>
                <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} contentStyle={{ background: "#0f1322", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 10 }} />
                <Line dataKey="margin" type="monotone" strokeWidth={3} stroke={marginLineColor} dot={{ strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-slate-400">Green when above profit goal, red when below.</p>
        </SectionCard>
      </div>

      <div className="mt-6">
        <div className="sticky top-[5.25rem] z-20 -mx-1 mb-3 overflow-x-auto px-1 pb-1 sm:top-2">
          <div className="flex min-w-max gap-2">
          {(["revenue", "expenses", "clients", "reports"] as DashboardTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm font-semibold capitalize transition ${
                activeTab === tab
                  ? "border-blue-300/35 bg-[linear-gradient(90deg,rgba(32,147,255,0.28),rgba(0,38,255,0.24))] text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              {tab}
            </button>
          ))}
          </div>
        </div>

        <div key={activeTab} className="animate-[toast-in_260ms_ease]">
          {activeTab === "revenue" ? (
            <section className="glass-panel rounded-2xl p-3 sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-sm">
                  <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                  <input
                    value={revenueSearch}
                    onChange={(event) => setRevenueSearch(event.target.value)}
                    placeholder="Search client, service, date"
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-[#0d111d] px-9 py-2.5 text-sm text-slate-100 outline-none focus:border-blue-300/35"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:w-[44rem]">
                  <select value={revenueServiceFilter} onChange={(event) => setRevenueServiceFilter(event.target.value as "all" | FinanceServiceType)} className="min-h-11 rounded-xl border border-white/10 bg-[#0d111d] px-3 py-2.5 text-sm text-slate-100">
                    <option value="all">All services</option>
                    {SERVICE_OPTIONS.map((service) => (
                      <option key={service} value={service}>{service}</option>
                    ))}
                  </select>
                  <select value={revenueClientTypeFilter} onChange={(event) => setRevenueClientTypeFilter(event.target.value as "all" | FinanceClientType)} className="min-h-11 rounded-xl border border-white/10 bg-[#0d111d] px-3 py-2.5 text-sm text-slate-100">
                    <option value="all">All client types</option>
                    {(Object.keys(CLIENT_TYPE_LABEL) as FinanceClientType[]).map((type) => (
                      <option key={type} value={type}>{CLIENT_TYPE_LABEL[type]}</option>
                    ))}
                  </select>
                  <select value={revenueRecurringFilter} onChange={(event) => setRevenueRecurringFilter(event.target.value as "all" | "M" | "1-time")} className="min-h-11 rounded-xl border border-white/10 bg-[#0d111d] px-3 py-2.5 text-sm text-slate-100">
                    <option value="all">All billing types</option>
                    <option value="M">Recurring</option>
                    <option value="1-time">One-time</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-[980px] w-full text-sm">
                  <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.14em] text-slate-400">
                    <tr>
                      {[
                        { key: "clientName", label: "Client Name" },
                        { key: "service", label: "Service" },
                        { key: "amount", label: "Amount" },
                        { key: "recurring", label: "Type" },
                        { key: "date", label: "Date" },
                        { key: "status", label: "Status" },
                      ].map((column) => (
                        <th key={column.key} className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setRevenueSort((current) => ({ key: column.key as RevenueSortKey, dir: current.key === column.key && current.dir === "desc" ? "asc" : "desc" }))}
                            className="inline-flex min-h-11 items-center gap-1 py-1"
                          >
                            {column.label}
                            <ChevronDown size={12} className={revenueSort.key === column.key && revenueSort.dir === "asc" ? "rotate-180" : ""} />
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRevenueRows.map((row) => (
                      <tr key={row.id} className="border-t border-white/10 text-slate-200 hover:bg-white/[0.03]">
                        <td className="px-3 py-2">{row.clientName}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full border px-2 py-1 text-xs ${SERVICE_BADGE_CLASS[row.service]}`}>{row.service}</span>
                        </td>
                        <td className="px-3 py-2 font-semibold">{formatMoney(row.amount)}</td>
                        <td className="px-3 py-2">{row.recurring === "M" ? "Recurring" : "One-time"}</td>
                        <td className="px-3 py-2">{row.date || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full border px-2 py-1 text-xs ${row.status === "paid" ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100" : "border-amber-400/35 bg-amber-500/15 text-amber-100"}`}>
                            {row.status === "paid" ? "Paid" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/10 bg-white/[0.03]">
                      <td colSpan={2} className="px-3 py-3 text-sm font-semibold text-slate-200">Filtered Total</td>
                      <td className="px-3 py-3 text-sm font-semibold text-white">{formatMoney(totalFilteredRevenue)}</td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ) : null}

          {activeTab === "expenses" ? (
            <section className="space-y-4">
              {(
                [
                  { key: "recurringExpenses", title: "Recurring (tools/subscriptions)" },
                  { key: "employeeExpenses", title: "Employee (salaries + commissions)" },
                  { key: "oneTimeExpenses", title: "One-Time" },
                ] as Array<{ key: ExpenseSectionKey; title: string }>
              ).map((section) => {
                const rows = generalMonth[section.key];
                const total = rows.reduce((sum, row) => sum + row.amount, 0);
                const isOpen = expensesOpen[section.key];

                return (
                  <div key={section.key} className="glass-panel rounded-2xl p-3 sm:p-4">
                    <button
                      type="button"
                      onClick={() => setExpensesOpen((current) => ({ ...current, [section.key]: !current[section.key] }))}
                      className="flex min-h-11 w-full items-center justify-between"
                    >
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">{section.title}</h3>
                      <ChevronDown size={16} className={isOpen ? "rotate-180" : ""} />
                    </button>

                    <div className="mt-2 flex flex-col gap-2 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                      <span>Total: <span className="font-semibold text-white">{formatMoney(total)}</span></span>
                      <button
                        type="button"
                        onClick={() => addGeneralRow(section.key)}
                        className="min-h-11 rounded-lg border border-blue-300/30 bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-100"
                      >
                        Add Row
                      </button>
                    </div>

                    {isOpen ? (
                      <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                        <table className="min-w-[980px] w-full text-sm">
                          <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.14em] text-slate-400">
                            <tr>
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Recurring</th>
                              <th className="px-3 py-2">Notes</th>
                              <th className="px-3 py-2">Amount</th>
                              <th className="px-3 py-2">Delete</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row.id} className="border-t border-white/10 text-slate-200">
                                <td className="px-2 py-1">
                                  <input
                                    value={row.name}
                                    onChange={(event) => updateGeneralRow(section.key, row.id, (item) => ({ ...item, name: event.target.value }))}
                                    className="min-h-11 w-full rounded-lg border border-white/10 bg-[#0d111d] px-2 py-2"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    value={row.date}
                                    onChange={(event) => updateGeneralRow(section.key, row.id, (item) => ({ ...item, date: event.target.value }))}
                                    className="min-h-11 w-full rounded-lg border border-white/10 bg-[#0d111d] px-2 py-2"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <select
                                    value={row.recurring}
                                    onChange={(event) => updateGeneralRow(section.key, row.id, (item) => ({ ...item, recurring: event.target.value as "M" | "1-time" }))}
                                    className="min-h-11 w-full rounded-lg border border-white/10 bg-[#0d111d] px-2 py-2"
                                  >
                                    <option value="M">M</option>
                                    <option value="1-time">1-time</option>
                                  </select>
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    value={row.notes}
                                    onChange={(event) => updateGeneralRow(section.key, row.id, (item) => ({ ...item, notes: event.target.value }))}
                                    className="min-h-11 w-full rounded-lg border border-white/10 bg-[#0d111d] px-2 py-2"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={Number.isFinite(row.amount) ? row.amount : 0}
                                    onChange={(event) => updateGeneralRow(section.key, row.id, (item) => ({ ...item, amount: Math.max(0, Number(event.target.value) || 0) }))}
                                    className="min-h-11 w-full rounded-lg border border-white/10 bg-[#0d111d] px-2 py-2"
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <button
                                    type="button"
                                    onClick={() => deleteGeneralRow(section.key, row.id)}
                                    className="min-h-11 rounded-lg border border-rose-400/30 bg-rose-500/10 p-2.5 text-rose-200"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div className="glass-card rounded-2xl p-4 text-sm text-slate-300">
                Grand Total: <span className="font-semibold text-white">{formatMoney(totalGeneralExpenses(generalMonth))}</span>
              </div>
            </section>
          ) : null}

          {activeTab === "clients" ? (
            <section className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <select value={clientSort} onChange={(event) => setClientSort(event.target.value as ClientSortKey)} className="min-h-11 rounded-xl border border-white/10 bg-[#0d111d] px-3 py-2.5 text-sm text-slate-100">
                  <option value="revenue">Sort: Revenue</option>
                  <option value="name">Sort: Name</option>
                  <option value="profitMargin">Sort: Profit Margin</option>
                </select>
                <select value={clientTypeFilter} onChange={(event) => setClientTypeFilter(event.target.value as "all" | FinanceClientType)} className="min-h-11 rounded-xl border border-white/10 bg-[#0d111d] px-3 py-2.5 text-sm text-slate-100">
                  <option value="all">All client types</option>
                  {(Object.keys(CLIENT_TYPE_LABEL) as FinanceClientType[]).map((type) => (
                    <option key={type} value={type}>{CLIENT_TYPE_LABEL[type]}</option>
                  ))}
                </select>
                <select value={clientStatusFilter} onChange={(event) => setClientStatusFilter(event.target.value as "all" | "active" | "inactive")} className="min-h-11 rounded-xl border border-white/10 bg-[#0d111d] px-3 py-2.5 text-sm text-slate-100">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select value={clientServiceFilter} onChange={(event) => setClientServiceFilter(event.target.value as "all" | FinanceServiceType)} className="min-h-11 rounded-xl border border-white/10 bg-[#0d111d] px-3 py-2.5 text-sm text-slate-100">
                  <option value="all">All services</option>
                  {SERVICE_OPTIONS.map((service) => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {clientCards.map((entry) => (
                  <Link key={entry.client.id} href={`/clients/${entry.client.id}`} className="glass-card rounded-2xl p-4 transition hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">{entry.client.name}</h3>
                      <span className={`rounded-full border px-2 py-1 text-xs ${entry.client.status === "active" ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100" : "border-slate-400/35 bg-slate-500/15 text-slate-200"}`}>
                        {entry.client.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm uppercase tracking-[0.1em] text-slate-400">{CLIENT_TYPE_LABEL[entry.client.clientType]}</p>
                    <p className="mt-3 text-xl font-semibold text-white sm:text-2xl">{formatMoney(entry.revenue)}</p>
                    <p className="mt-1 text-sm text-slate-300">Profit Margin: <span className="font-semibold">{formatPercent(entry.profitMargin)}</span></p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.client.services.map((service) => (
                        <span key={service} className={`rounded-full border px-2 py-1 text-xs ${SERVICE_BADGE_CLASS[service]}`}>{service}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === "reports" ? (
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">Monthly P&L ({monthLabel(selectedMonth)})</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p>Revenue: <span className="font-semibold text-white">{formatMoney(summary.monthlyRevenue)}</span></p>
                  <p>Expenses: <span className="font-semibold text-white">{formatMoney(summary.monthlyExpenses)}</span></p>
                  <p>Net Profit: <span className={`font-semibold ${summary.netProfit >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{formatMoney(summary.netProfit)}</span></p>
                  <p>Profit Margin: <span className="font-semibold text-white">{formatPercent(summary.profitMargin)}</span></p>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">Year-to-Date Summary</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p>YTD Revenue: <span className="font-semibold text-white">{formatMoney(reportData.ytdRevenue)}</span></p>
                  <p>YTD Expenses: <span className="font-semibold text-white">{formatMoney(reportData.ytdExpenses)}</span></p>
                  <p>YTD Profit: <span className={`font-semibold ${reportData.ytdProfit >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{formatMoney(reportData.ytdProfit)}</span></p>
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">Client Profitability Ranking</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {reportData.topClients.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                      <span>{index + 1}. {entry.name}</span>
                      <span className="font-semibold text-white">{formatMoney(entry.profit)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel rounded-2xl p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-200">Expense Category Breakdown</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <p>Recurring: <span className="font-semibold text-white">{formatMoney(reportData.expenseBreakdown.recurring)}</span></p>
                  <p>Employee: <span className="font-semibold text-white">{formatMoney(reportData.expenseBreakdown.employee)}</span></p>
                  <p>One-Time: <span className="font-semibold text-white">{formatMoney(reportData.expenseBreakdown.oneTime)}</span></p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}
