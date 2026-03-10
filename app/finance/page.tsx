"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, DollarSign, Plus, Trash2, TrendingUp, Users } from "lucide-react";
import { FinanceClient, FinanceData, FinanceGeneralMonthData, FinanceLedgerRow, FinanceMonthData } from "@/lib/finance-types";

const DEFAULT_GOAL = 15000;

type ActiveTab = "home" | string;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatMoney(value: number) {
  return money.format(Number.isFinite(value) ? value : 0);
}

function formatPercent(value: number) {
  return `${percent.format(Number.isFinite(value) ? value : 0)}%`;
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
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

function monthTitle(value: string, activeTab: ActiveTab, clientName?: string) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(Date.UTC(year, month - 1, 1)));
  if (activeTab === "home") return `${label.toUpperCase()} FINANCES`;
  return `${label.toUpperCase()} · ${clientName?.toUpperCase() ?? "CLIENT"}`;
}

function emptyClientMonth(month: string): FinanceMonthData {
  return {
    month,
    goalAmount: DEFAULT_GOAL,
    stripeFeeOverride: null,
    income: [],
    expenses: [],
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
      id: crypto.randomUUID(),
      name: row.name,
      date: row.date,
      recurring: row.recurring,
      notes: row.notes,
      amount: row.amount,
    }));
}

function ensureMonthData(data: FinanceData, month: string): FinanceData {
  const prev = shiftMonth(month, -1);
  const nextClients = data.clients.map((client) => {
    if (client.months[month]) return client;

    const prevMonth = client.months[prev];
    const nextMonth: FinanceMonthData = prevMonth
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

function cellBaseClassName() {
  return "w-full rounded-lg border border-white/10 bg-[#0d111d] px-2.5 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50";
}

function EditableTextCell({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-slate-100 transition hover:bg-white/5"
      >
        {value || <span className="text-slate-500">{placeholder ?? "Click to edit"}</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) onSave(draft);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      placeholder={placeholder}
      className={cellBaseClassName()}
    />
  );
}

function EditableNumberCell({
  value,
  onSave,
  nullable,
}: {
  value: number | null;
  onSave: (next: number | null) => void;
  nullable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value === null ? "" : String(value));

  useEffect(() => {
    setDraft(value === null ? "" : String(value));
  }, [value]);

  if (!editing) {
    const shown = value === null ? "auto (3%)" : formatMoney(value);
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full rounded-lg px-2.5 py-2 text-right text-sm font-semibold text-slate-100 transition hover:bg-white/5"
      >
        {shown}
      </button>
    );
  }

  return (
    <input
      autoFocus
      inputMode="decimal"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setEditing(false);
        if (!draft.trim()) {
          onSave(nullable ? null : 0);
          return;
        }

        const parsed = Number(draft);
        if (!Number.isFinite(parsed) || parsed < 0) {
          setDraft(value === null ? "" : String(value));
          return;
        }

        onSave(parsed);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value === null ? "" : String(value));
          setEditing(false);
        }
      }}
      placeholder={nullable ? "auto" : "0.00"}
      className={`${cellBaseClassName()} text-right font-semibold`}
    />
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  icon: typeof DollarSign;
  tone?: string;
}) {
  return (
    <article className="glass-card relative overflow-hidden p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(32,147,255,0),#2093FF,rgba(0,38,255,0))]" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className={`mt-2 text-2xl font-semibold tracking-[-0.02em] ${tone ?? "text-white"}`}>{value}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-blue-100">
          <Icon size={16} />
        </div>
      </div>
    </article>
  );
}

function sectionHeader(title: string) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">{title}</h2>
      <div className="mt-2 h-[2px] w-40 bg-[linear-gradient(90deg,#2093FF,#0026FF)]" />
    </div>
  );
}

function RecurringSelector({
  value,
  onSave,
}: {
  value: "M" | "1-time";
  onSave: (next: "M" | "1-time") => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onSave(event.target.value as "M" | "1-time")}
      className="w-full rounded-lg border border-white/10 bg-[#0d111d] px-2.5 py-2 text-sm text-slate-100 outline-none"
    >
      <option value="M">M</option>
      <option value="1-time">1-time</option>
    </select>
  );
}

function hasAnyClientData(client: FinanceClient) {
  return Object.values(client.months).some((month) => month.income.length > 0 || month.expenses.length > 0);
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("2026-03");
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFinance() {
    try {
      setLoading(true);
      const response = await fetch("/api/finance", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load finance");

      const nextData = (await response.json()) as FinanceData;
      setData(nextData);

      if (nextData.generalData.months[selectedMonth]) {
        setSelectedMonth(selectedMonth);
      } else if (nextData.generalData.months["2026-03"]) {
        setSelectedMonth("2026-03");
      } else {
        const fallback = Object.keys(nextData.generalData.months).sort().at(-1) ?? monthKey();
        setSelectedMonth(fallback);
      }

      setError(null);
    } catch {
      setError("Could not load finance data.");
    } finally {
      setLoading(false);
    }
  }

  async function persist(nextData: FinanceData) {
    try {
      setSaving(true);
      const response = await fetch("/api/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextData),
      });
      if (!response.ok) throw new Error("Failed to save finance");
      const saved = (await response.json()) as FinanceData;
      setData(saved);
      setError(null);
    } catch {
      setError("Could not save finance changes.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadFinance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeData = useMemo(() => {
    if (!data) return null;
    if (data.clients.some((client) => client.id === activeTab) || activeTab === "home") {
      return data;
    }

    setActiveTab("home");
    return data;
  }, [data, activeTab]);

  const monthData = useMemo(() => {
    if (!safeData) return null;
    return ensureMonthData(safeData, selectedMonth);
  }, [safeData, selectedMonth]);

  const currentClient = useMemo(() => {
    if (!monthData || activeTab === "home") return null;
    return monthData.clients.find((client) => client.id === activeTab) ?? null;
  }, [monthData, activeTab]);

  const generalMonth = useMemo(() => {
    if (!monthData) return emptyGeneralMonth(selectedMonth);
    return monthData.generalData.months[selectedMonth] ?? emptyGeneralMonth(selectedMonth);
  }, [monthData, selectedMonth]);

  const clientMonth = useMemo(() => {
    if (!currentClient) return emptyClientMonth(selectedMonth);
    return currentClient.months[selectedMonth] ?? emptyClientMonth(selectedMonth);
  }, [currentClient, selectedMonth]);

  const summary = useMemo(() => {
    if (!monthData) {
      return {
        grossRevenue: 0,
        netRevenue: 0,
        stripeFee: 0,
        totalExpenditure: 0,
        totalProfit: 0,
        profitMargin: 0,
      };
    }

    if (activeTab === "home") {
      const grossRevenue = monthData.clients.reduce(
        (sum, client) => sum + (client.months[selectedMonth]?.income ?? []).reduce((x, row) => x + row.amount, 0),
        0,
      );
      const stripeFee = monthData.clients.reduce((sum, client) => {
        const cm = client.months[selectedMonth] ?? emptyClientMonth(selectedMonth);
        if (cm.stripeFeeOverride !== null) return sum + cm.stripeFeeOverride;
        return sum + cm.income.reduce((x, row) => x + row.amount * 0.03, 0);
      }, 0);

      const totalExpenditure =
        generalMonth.recurringExpenses.reduce((sum, row) => sum + row.amount, 0) +
        generalMonth.employeeExpenses.reduce((sum, row) => sum + row.amount, 0) +
        generalMonth.oneTimeExpenses.reduce((sum, row) => sum + row.amount, 0);

      const netRevenue = grossRevenue - stripeFee;
      const totalProfit = netRevenue - totalExpenditure;
      const profitMargin = grossRevenue > 0 ? (totalProfit / grossRevenue) * 100 : 0;

      return { grossRevenue, netRevenue, stripeFee, totalExpenditure, totalProfit, profitMargin };
    }

    const grossRevenue = clientMonth.income.reduce((sum, row) => sum + row.amount, 0);
    const stripeFee = clientMonth.stripeFeeOverride ?? clientMonth.income.reduce((sum, row) => sum + row.amount * 0.03, 0);
    const netRevenue = grossRevenue - stripeFee;
    const totalExpenditure = clientMonth.expenses.reduce((sum, row) => sum + row.amount, 0);
    const totalProfit = netRevenue - totalExpenditure;
    const profitMargin = grossRevenue > 0 ? (totalProfit / grossRevenue) * 100 : 0;

    return { grossRevenue, netRevenue, stripeFee, totalExpenditure, totalProfit, profitMargin };
  }, [monthData, activeTab, selectedMonth, generalMonth, clientMonth]);

  function commit(nextData: FinanceData) {
    setData(nextData);
    void persist(nextData);
  }

  function withMonth(updater: (current: FinanceData) => FinanceData) {
    if (!monthData) return;
    const next = updater(monthData);
    commit(next);
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

  function updateClientMonth(updater: (current: FinanceMonthData) => FinanceMonthData) {
    if (!currentClient) return;

    withMonth((currentData) => ({
      ...currentData,
      clients: currentData.clients.map((client) => {
        if (client.id !== currentClient.id) return client;
        return {
          ...client,
          months: {
            ...client.months,
            [selectedMonth]: updater(client.months[selectedMonth] ?? emptyClientMonth(selectedMonth)),
          },
        };
      }),
    }));
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

  function addClient() {
    if (!monthData) return;

    const name = window.prompt("Client name");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    const exists = monthData.clients.some((client) => client.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setError("Client already exists.");
      return;
    }

    const created: FinanceClient = {
      id: crypto.randomUUID(),
      name: trimmed,
      months: {
        [selectedMonth]: emptyClientMonth(selectedMonth),
      },
    };

    const nextData: FinanceData = {
      ...monthData,
      clients: [...monthData.clients, created].sort((a, b) => a.name.localeCompare(b.name)),
    };
    setActiveTab(created.id);
    commit(nextData);
  }

  function deleteClient(client: FinanceClient) {
    if (hasAnyClientData(client)) {
      window.alert("Client has finance data and cannot be deleted.");
      return;
    }

    const confirmed = window.confirm(`Delete client '${client.name}'?`);
    if (!confirmed || !monthData) return;

    const nextData: FinanceData = {
      ...monthData,
      clients: monthData.clients.filter((entry) => entry.id !== client.id),
    };

    setActiveTab("home");
    commit(nextData);
  }

  function addGeneralRow(section: "recurringExpenses" | "employeeExpenses" | "oneTimeExpenses") {
    updateGeneralMonth((current) => ({
      ...current,
      [section]: [...current[section], { id: crypto.randomUUID(), name: "", date: "", recurring: section === "oneTimeExpenses" ? "1-time" : "M", notes: "", amount: 0 }],
    }));
  }

  function addClientRow(section: "income" | "expenses") {
    updateClientMonth((current) => ({
      ...current,
      [section]: [...current[section], { id: crypto.randomUUID(), name: "", date: "", recurring: "M", notes: "", amount: 0 }],
    }));
  }

  function updateGeneralRow(
    section: "recurringExpenses" | "employeeExpenses" | "oneTimeExpenses",
    id: string,
    updater: (row: FinanceLedgerRow) => FinanceLedgerRow,
  ) {
    updateGeneralMonth((current) => ({
      ...current,
      [section]: current[section].map((row) => (row.id === id ? updater(row) : row)),
    }));
  }

  function updateClientRow(section: "income" | "expenses", id: string, updater: (row: FinanceLedgerRow) => FinanceLedgerRow) {
    updateClientMonth((current) => ({
      ...current,
      [section]: current[section].map((row) => (row.id === id ? updater(row) : row)),
    }));
  }

  function deleteGeneralRow(section: "recurringExpenses" | "employeeExpenses" | "oneTimeExpenses", id: string) {
    const confirmed = window.confirm("Delete this row? This cannot be undone.");
    if (!confirmed) return;

    updateGeneralMonth((current) => ({
      ...current,
      [section]: current[section].filter((row) => row.id !== id),
    }));
  }

  function deleteClientRow(section: "income" | "expenses", id: string) {
    const confirmed = window.confirm("Delete this row? This cannot be undone.");
    if (!confirmed) return;

    updateClientMonth((current) => ({
      ...current,
      [section]: current[section].filter((row) => row.id !== id),
    }));
  }

  if (loading && !data) {
    return <section className="glass-panel p-6 text-sm text-slate-300">Loading finance manager...</section>;
  }

  if (!monthData) {
    return <section className="glass-panel p-6 text-sm text-red-200">Finance data unavailable.</section>;
  }

  return (
    <section className="animate-enter" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-[290px]">
          <div className="hidden lg:flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setActiveTab("home")}
              className={`mb-2 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                activeTab === "home"
                  ? "bg-[linear-gradient(90deg,rgba(32,147,255,0.35),rgba(0,38,255,0.35))] text-white"
                  : "bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
              }`}
            >
              Derby Digital (Home)
            </button>

            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {monthData.clients.map((client) => (
                <div key={client.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab(client.id)}
                    className={`flex-1 rounded-xl px-3 py-2 text-left text-sm transition ${
                      activeTab === client.id
                        ? "bg-[linear-gradient(90deg,rgba(32,147,255,0.35),rgba(0,38,255,0.35))] text-white"
                        : "bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
                    }`}
                  >
                    {client.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteClient(client)}
                    className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20"
                    aria-label={`Delete ${client.name}`}
                    title="Delete client (only if no data)"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addClient}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/25"
            >
              <Plus size={14} />
              Add Client
            </button>
          </div>

          <div className="lg:hidden space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
            <select
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0d111d] px-3 py-2 text-sm text-slate-100"
            >
              <option value="home">Derby Digital (Home)</option>
              {monthData.clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addClient}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-100"
            >
              <Plus size={14} />
              Add Client
            </button>
          </div>
        </aside>

        <div className="flex-1 space-y-6" style={{ backgroundColor: "#0a0a0f" }}>
          <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="page-title">{monthTitle(selectedMonth, activeTab, currentClient?.name)}</h1>
              <p className="mt-2 text-sm text-slate-300">
                {activeTab === "home"
                  ? "Aggregate client revenue + Derby Digital operating expenses."
                  : `${currentClient?.name ?? "Client"} finance sheet for recurring and one-time items.`}
              </p>
            </div>

            <div className="glass-card inline-flex items-center gap-2 px-2 py-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-100 transition hover:border-blue-300/40 hover:bg-blue-500/15"
                aria-label="Previous month"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-[10rem] text-center">
                <p className="text-sm font-semibold text-white">{monthLabel(selectedMonth)}</p>
              </div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-100 transition hover:border-blue-300/40 hover:bg-blue-500/15"
                aria-label="Next month"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </header>

          {error ? <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div> : null}
          {saving ? <div className="text-xs uppercase tracking-[0.2em] text-blue-200/80">Saving to Redis...</div> : null}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard title="Gross Revenue" value={formatMoney(summary.grossRevenue)} icon={DollarSign} tone="text-emerald-300" />
            <SummaryCard title="Net Revenue" value={formatMoney(summary.netRevenue)} icon={TrendingUp} tone="text-cyan-200" />
            <article className="glass-card relative overflow-hidden p-4">
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(32,147,255,0),#2093FF,rgba(0,38,255,0))]" />
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Stripe Fee</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-amber-200">{formatMoney(summary.stripeFee)}</p>
              {activeTab !== "home" ? (
                <div className="mt-3 text-xs text-slate-300">
                  Manual override
                  <EditableNumberCell
                    value={clientMonth.stripeFeeOverride}
                    nullable
                    onSave={(next) => updateClientMonth((current) => ({ ...current, stripeFeeOverride: next }))}
                  />
                </div>
              ) : null}
            </article>
            <SummaryCard title="Total Expenditure" value={formatMoney(summary.totalExpenditure)} icon={DollarSign} tone="text-rose-300" />
            <SummaryCard title="Total Profit" value={formatMoney(summary.totalProfit)} icon={TrendingUp} tone={summary.totalProfit >= 0 ? "text-blue-100" : "text-rose-300"} />
            <SummaryCard title="Profit Margin" value={formatPercent(summary.profitMargin)} icon={Users} tone={summary.profitMargin >= 0 ? "text-cyan-200" : "text-rose-300"} />
          </div>

          {activeTab === "home" ? (
            <>
              <section className="glass-panel p-4">
                {sectionHeader("General Recurring Expenses")}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">
                    Total: <span className="font-semibold text-white">{formatMoney(generalMonth.recurringExpenses.reduce((sum, row) => sum + row.amount, 0))}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => addGeneralRow("recurringExpenses")}
                    className="inline-flex items-center gap-1 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
                  >
                    <Plus size={14} />
                    Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-[980px] w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Recurring?</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {generalMonth.recurringExpenses.map((row) => (
                        <tr key={row.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-2 py-1"><EditableTextCell value={row.name} onSave={(next) => updateGeneralRow("recurringExpenses", row.id, (item) => ({ ...item, name: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.date} onSave={(next) => updateGeneralRow("recurringExpenses", row.id, (item) => ({ ...item, date: next }))} /></td>
                          <td className="px-2 py-1"><RecurringSelector value={row.recurring} onSave={(next) => updateGeneralRow("recurringExpenses", row.id, (item) => ({ ...item, recurring: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.notes} onSave={(next) => updateGeneralRow("recurringExpenses", row.id, (item) => ({ ...item, notes: next }))} /></td>
                          <td className="px-2 py-1"><EditableNumberCell value={row.amount} onSave={(next) => updateGeneralRow("recurringExpenses", row.id, (item) => ({ ...item, amount: Number(next ?? 0) }))} /></td>
                          <td className="px-2 py-1"><button type="button" onClick={() => deleteGeneralRow("recurringExpenses", row.id)} className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="glass-panel p-4">
                {sectionHeader("Employee Expenses")}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">
                    Total: <span className="font-semibold text-white">{formatMoney(generalMonth.employeeExpenses.reduce((sum, row) => sum + row.amount, 0))}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => addGeneralRow("employeeExpenses")}
                    className="inline-flex items-center gap-1 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
                  >
                    <Plus size={14} />
                    Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-[980px] w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Recurring?</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {generalMonth.employeeExpenses.map((row) => (
                        <tr key={row.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-2 py-1"><EditableTextCell value={row.name} onSave={(next) => updateGeneralRow("employeeExpenses", row.id, (item) => ({ ...item, name: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.date} onSave={(next) => updateGeneralRow("employeeExpenses", row.id, (item) => ({ ...item, date: next }))} /></td>
                          <td className="px-2 py-1"><RecurringSelector value={row.recurring} onSave={(next) => updateGeneralRow("employeeExpenses", row.id, (item) => ({ ...item, recurring: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.notes} onSave={(next) => updateGeneralRow("employeeExpenses", row.id, (item) => ({ ...item, notes: next }))} /></td>
                          <td className="px-2 py-1"><EditableNumberCell value={row.amount} onSave={(next) => updateGeneralRow("employeeExpenses", row.id, (item) => ({ ...item, amount: Number(next ?? 0) }))} /></td>
                          <td className="px-2 py-1"><button type="button" onClick={() => deleteGeneralRow("employeeExpenses", row.id)} className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="glass-panel p-4">
                {sectionHeader("One-Time Expenses")}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">
                    Total: <span className="font-semibold text-white">{formatMoney(generalMonth.oneTimeExpenses.reduce((sum, row) => sum + row.amount, 0))}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => addGeneralRow("oneTimeExpenses")}
                    className="inline-flex items-center gap-1 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
                  >
                    <Plus size={14} />
                    Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-[980px] w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Recurring?</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {generalMonth.oneTimeExpenses.map((row) => (
                        <tr key={row.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-2 py-1"><EditableTextCell value={row.name} onSave={(next) => updateGeneralRow("oneTimeExpenses", row.id, (item) => ({ ...item, name: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.date} onSave={(next) => updateGeneralRow("oneTimeExpenses", row.id, (item) => ({ ...item, date: next }))} /></td>
                          <td className="px-2 py-1"><RecurringSelector value={row.recurring} onSave={(next) => updateGeneralRow("oneTimeExpenses", row.id, (item) => ({ ...item, recurring: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.notes} onSave={(next) => updateGeneralRow("oneTimeExpenses", row.id, (item) => ({ ...item, notes: next }))} /></td>
                          <td className="px-2 py-1"><EditableNumberCell value={row.amount} onSave={(next) => updateGeneralRow("oneTimeExpenses", row.id, (item) => ({ ...item, amount: Number(next ?? 0) }))} /></td>
                          <td className="px-2 py-1"><button type="button" onClick={() => deleteGeneralRow("oneTimeExpenses", row.id)} className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="glass-panel p-4">
                {sectionHeader("Income")}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">
                    Gross Income: <span className="font-semibold text-white">{formatMoney(clientMonth.income.reduce((sum, row) => sum + row.amount, 0))}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => addClientRow("income")}
                    className="inline-flex items-center gap-1 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
                  >
                    <Plus size={14} />
                    Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-[980px] w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Recurring?</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {clientMonth.income.map((row) => (
                        <tr key={row.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-2 py-1"><EditableTextCell value={row.name} onSave={(next) => updateClientRow("income", row.id, (item) => ({ ...item, name: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.date} onSave={(next) => updateClientRow("income", row.id, (item) => ({ ...item, date: next }))} /></td>
                          <td className="px-2 py-1"><RecurringSelector value={row.recurring} onSave={(next) => updateClientRow("income", row.id, (item) => ({ ...item, recurring: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.notes} onSave={(next) => updateClientRow("income", row.id, (item) => ({ ...item, notes: next }))} /></td>
                          <td className="px-2 py-1"><EditableNumberCell value={row.amount} onSave={(next) => updateClientRow("income", row.id, (item) => ({ ...item, amount: Number(next ?? 0) }))} /></td>
                          <td className="px-2 py-1"><button type="button" onClick={() => deleteClientRow("income", row.id)} className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="glass-panel p-4">
                {sectionHeader("Expenses")}
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-400">
                    Gross Expenses: <span className="font-semibold text-white">{formatMoney(clientMonth.expenses.reduce((sum, row) => sum + row.amount, 0))}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => addClientRow("expenses")}
                    className="inline-flex items-center gap-1 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
                  >
                    <Plus size={14} />
                    Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="min-w-[980px] w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Recurring?</th>
                        <th className="px-3 py-2">Notes</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {clientMonth.expenses.map((row) => (
                        <tr key={row.id} className="transition hover:bg-white/[0.03]">
                          <td className="px-2 py-1"><EditableTextCell value={row.name} onSave={(next) => updateClientRow("expenses", row.id, (item) => ({ ...item, name: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.date} onSave={(next) => updateClientRow("expenses", row.id, (item) => ({ ...item, date: next }))} /></td>
                          <td className="px-2 py-1"><RecurringSelector value={row.recurring} onSave={(next) => updateClientRow("expenses", row.id, (item) => ({ ...item, recurring: next }))} /></td>
                          <td className="px-2 py-1"><EditableTextCell value={row.notes} onSave={(next) => updateClientRow("expenses", row.id, (item) => ({ ...item, notes: next }))} /></td>
                          <td className="px-2 py-1"><EditableNumberCell value={row.amount} onSave={(next) => updateClientRow("expenses", row.id, (item) => ({ ...item, amount: Number(next ?? 0) }))} /></td>
                          <td className="px-2 py-1"><button type="button" onClick={() => deleteClientRow("expenses", row.id)} className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
