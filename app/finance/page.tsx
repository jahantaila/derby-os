"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, DollarSign, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import {
  ExpenseCategory,
  FinanceData,
  FinanceMonthData,
  RevenueCategory,
} from "@/lib/finance-types";

const DEFAULT_GOAL = 15000;

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

function monthTitle(value: string) {
  const [year, month] = value.split("-").map(Number);
  const label = new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return `${label.toUpperCase()} FINANCES`;
}

function emptyMonth(month: string): FinanceMonthData {
  return {
    month,
    goalAmount: DEFAULT_GOAL,
    recurringExpenses: [],
    employeeExpenses: [],
    oneTimeExpenses: [],
    revenues: [],
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

function TypeBadge({ type }: { type: ExpenseCategory }) {
  const className =
    type === "marketing"
      ? "border-blue-400/35 bg-blue-500/15 text-blue-200"
      : type === "fulfillment"
        ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-200"
        : type === "hosting"
          ? "border-violet-400/35 bg-violet-500/15 text-violet-200"
          : "border-slate-400/35 bg-slate-500/15 text-slate-200";

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${className}`}>{type}</span>;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">{title}</h2>
      <div className="mt-2 h-[2px] w-40 bg-[linear-gradient(90deg,#2093FF,#0026FF)]" />
    </div>
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

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("2026-03");
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

      if (nextData.months[selectedMonth]) {
        setSelectedMonth(selectedMonth);
      } else if (nextData.months["2026-03"]) {
        setSelectedMonth("2026-03");
      } else {
        const fallback = Object.keys(nextData.months).sort().at(-1) ?? monthKey();
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

  const monthData = useMemo(() => {
    if (!data) return emptyMonth(selectedMonth);
    return data.months[selectedMonth] ?? emptyMonth(selectedMonth);
  }, [data, selectedMonth]);

  const summary = useMemo(() => {
    const grossRevenue = monthData.revenues.reduce((sum, row) => sum + row.amount, 0);
    const totalStripeFee = monthData.revenues.reduce((sum, row) => sum + (row.stripeFee ?? row.amount * 0.03), 0);
    const recurringTotal = monthData.recurringExpenses.reduce((sum, row) => sum + row.price, 0);
    const employeeTotal = monthData.employeeExpenses.reduce((sum, row) => sum + row.price, 0);
    const oneTimeTotal = monthData.oneTimeExpenses.reduce((sum, row) => sum + row.price, 0);
    const totalExpenditure = recurringTotal + employeeTotal + oneTimeTotal;
    const totalProfit = grossRevenue - totalExpenditure;
    const profitMargin = grossRevenue > 0 ? (totalProfit / grossRevenue) * 100 : 0;
    const goalPercent = monthData.goalAmount > 0 ? (totalProfit / monthData.goalAmount) * 100 : 0;

    return {
      grossRevenue,
      totalStripeFee,
      recurringTotal,
      employeeTotal,
      oneTimeTotal,
      totalExpenditure,
      totalProfit,
      profitMargin,
      goalPercent,
    };
  }, [monthData]);

  function commitMonth(nextMonthData: FinanceMonthData) {
    if (!data) return;
    const nextData: FinanceData = {
      months: {
        ...data.months,
        [selectedMonth]: nextMonthData,
      },
    };
    setData(nextData);
    void persist(nextData);
  }

  function updateMonth(updater: (monthData: FinanceMonthData) => FinanceMonthData) {
    const current = monthData;
    commitMonth(updater(current));
  }

  function addRecurringRow() {
    updateMonth((current) => ({
      ...current,
      recurringExpenses: [
        ...current.recurringExpenses,
        { id: crypto.randomUUID(), name: "", date: "", type: "other", recurring: "M", notes: "", price: 0 },
      ],
    }));
  }

  function addEmployeeRow() {
    updateMonth((current) => ({
      ...current,
      employeeExpenses: [...current.employeeExpenses, { id: crypto.randomUUID(), name: "", date: "", notes: "", price: 0, extraNotes: "" }],
    }));
  }

  function addOneTimeRow() {
    updateMonth((current) => ({
      ...current,
      oneTimeExpenses: [...current.oneTimeExpenses, { id: crypto.randomUUID(), name: "", date: "", notes: "", price: 0 }],
    }));
  }

  function addRevenueRow() {
    updateMonth((current) => ({
      ...current,
      revenues: [
        ...current.revenues,
        { id: crypto.randomUUID(), clientName: "", amount: 0, date: "", type: "retainer", notes: "", stripeFee: null },
      ],
    }));
  }

  function changeMonth(delta: number) {
    const next = shiftMonth(selectedMonth, delta);
    setSelectedMonth(next);

    if (data && !data.months[next]) {
      const nextData: FinanceData = {
        months: {
          ...data.months,
          [next]: emptyMonth(next),
        },
      };
      setData(nextData);
      void persist(nextData);
    }
  }

  function deleteWithConfirm(section: "recurring" | "employee" | "one-time" | "revenue", id: string) {
    const confirmed = window.confirm("Delete this row? This cannot be undone.");
    if (!confirmed) return;

    if (section === "recurring") {
      updateMonth((current) => ({ ...current, recurringExpenses: current.recurringExpenses.filter((row) => row.id !== id) }));
      return;
    }

    if (section === "employee") {
      updateMonth((current) => ({ ...current, employeeExpenses: current.employeeExpenses.filter((row) => row.id !== id) }));
      return;
    }

    if (section === "one-time") {
      updateMonth((current) => ({ ...current, oneTimeExpenses: current.oneTimeExpenses.filter((row) => row.id !== id) }));
      return;
    }

    updateMonth((current) => ({ ...current, revenues: current.revenues.filter((row) => row.id !== id) }));
  }

  if (loading && !data) {
    return <section className="glass-panel p-6 text-sm text-slate-300">Loading finance manager...</section>;
  }

  if (!data) {
    return <section className="glass-panel p-6 text-sm text-red-200">Finance data unavailable.</section>;
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">{monthTitle(selectedMonth)}</h1>
          <p className="mt-2 text-sm text-slate-300">Monthly summary dashboard and spreadsheet tracking for Derby Digital.</p>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
      </header>

      {error ? <div className="rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div> : null}
      {saving ? <div className="text-xs uppercase tracking-[0.2em] text-blue-200/80">Saving to Redis...</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard title="Gross Revenue (Derby Digital)" value={formatMoney(summary.grossRevenue)} icon={DollarSign} tone="text-emerald-300" />
        <SummaryCard title="Total Stripe Fee" value={formatMoney(summary.totalStripeFee)} icon={DollarSign} tone="text-amber-200" />
        <SummaryCard title="Total Expenditure" value={formatMoney(summary.totalExpenditure)} icon={DollarSign} tone="text-rose-300" />
        <SummaryCard
          title="Total Profit (Derby Digital)"
          value={formatMoney(summary.totalProfit)}
          icon={TrendingUp}
          tone={summary.totalProfit >= 0 ? "text-blue-100" : "text-rose-300"}
        />
        <SummaryCard title="Profit Margin" value={formatPercent(summary.profitMargin)} icon={Target} tone={summary.profitMargin >= 0 ? "text-cyan-200" : "text-rose-300"} />

        <article className="glass-card relative overflow-hidden p-4">
          <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(32,147,255,0),#2093FF,rgba(0,38,255,0))]" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Goal Tracking</p>
          <p className="mt-2 text-2xl font-semibold text-blue-100">{formatPercent(summary.goalPercent)}</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-[linear-gradient(90deg,#2093FF,#0026FF)]"
              style={{ width: `${Math.max(0, Math.min(100, summary.goalPercent))}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-300">
            <span>Goal</span>
            <div className="w-28">
              <EditableNumberCell
                value={monthData.goalAmount}
                onSave={(next) => {
                  updateMonth((current) => ({ ...current, goalAmount: Math.max(0, Number(next ?? 0)) }));
                }}
              />
            </div>
          </div>
        </article>
      </div>

      <section className="glass-panel p-4">
        <SectionHeader title="Recurring Expenses" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">Gross Recurring Expenditure: <span className="font-semibold text-white">{formatMoney(summary.recurringTotal)}</span></p>
          <button
            type="button"
            onClick={addRecurringRow}
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
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Recurring?</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {monthData.recurringExpenses.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-400" colSpan={7}>No recurring expenses yet.</td>
                </tr>
              ) : (
                monthData.recurringExpenses.map((row) => (
                  <tr key={row.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.name}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            recurringExpenses: current.recurringExpenses.map((item) => (item.id === row.id ? { ...item, name: next } : item)),
                          }))
                        }
                        placeholder="Expense name"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.date}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            recurringExpenses: current.recurringExpenses.map((item) => (item.id === row.id ? { ...item, date: next } : item)),
                          }))
                        }
                        placeholder="first of every month"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-2">
                        <TypeBadge type={row.type} />
                        <select
                          value={row.type}
                          onChange={(event) => {
                            const next = event.target.value as ExpenseCategory;
                            updateMonth((current) => ({
                              ...current,
                              recurringExpenses: current.recurringExpenses.map((item) => (item.id === row.id ? { ...item, type: next } : item)),
                            }));
                          }}
                          className="rounded-lg border border-white/10 bg-[#0d111d] px-2 py-1 text-xs text-slate-200"
                        >
                          <option value="other">other</option>
                          <option value="fulfillment">fulfillment</option>
                          <option value="marketing">marketing</option>
                          <option value="hosting">hosting</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.recurring}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            recurringExpenses: current.recurringExpenses.map((item) => (item.id === row.id ? { ...item, recurring: next } : item)),
                          }))
                        }
                        placeholder="M"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.notes}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            recurringExpenses: current.recurringExpenses.map((item) => (item.id === row.id ? { ...item, notes: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableNumberCell
                        value={row.price}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            recurringExpenses: current.recurringExpenses.map((item) => (item.id === row.id ? { ...item, price: Number(next ?? 0) } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        onClick={() => deleteWithConfirm("recurring", row.id)}
                        className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20"
                        aria-label="Delete recurring row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel p-4">
        <SectionHeader title="Employee Expenses" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">Gross Employee Expenditure: <span className="font-semibold text-white">{formatMoney(summary.employeeTotal)}</span></p>
          <button
            type="button"
            onClick={addEmployeeRow}
            className="inline-flex items-center gap-1 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
          >
            <Plus size={14} />
            Add Row
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-[920px] w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2">Extra Notes</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {monthData.employeeExpenses.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-400" colSpan={6}>No employee expenses yet.</td>
                </tr>
              ) : (
                monthData.employeeExpenses.map((row) => (
                  <tr key={row.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.name}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            employeeExpenses: current.employeeExpenses.map((item) => (item.id === row.id ? { ...item, name: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.date}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            employeeExpenses: current.employeeExpenses.map((item) => (item.id === row.id ? { ...item, date: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.notes}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            employeeExpenses: current.employeeExpenses.map((item) => (item.id === row.id ? { ...item, notes: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableNumberCell
                        value={row.price}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            employeeExpenses: current.employeeExpenses.map((item) => (item.id === row.id ? { ...item, price: Number(next ?? 0) } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.extraNotes}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            employeeExpenses: current.employeeExpenses.map((item) => (item.id === row.id ? { ...item, extraNotes: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        onClick={() => deleteWithConfirm("employee", row.id)}
                        className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20"
                        aria-label="Delete employee row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel p-4">
        <SectionHeader title="One-Time Expenses" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">Gross One Time Expenditure: <span className="font-semibold text-white">{formatMoney(summary.oneTimeTotal)}</span></p>
          <button
            type="button"
            onClick={addOneTimeRow}
            className="inline-flex items-center gap-1 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/25"
          >
            <Plus size={14} />
            Add Row
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-[760px] w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {monthData.oneTimeExpenses.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-400" colSpan={5}>No one-time expenses yet.</td>
                </tr>
              ) : (
                monthData.oneTimeExpenses.map((row) => (
                  <tr key={row.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.name}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            oneTimeExpenses: current.oneTimeExpenses.map((item) => (item.id === row.id ? { ...item, name: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.date}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            oneTimeExpenses: current.oneTimeExpenses.map((item) => (item.id === row.id ? { ...item, date: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.notes}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            oneTimeExpenses: current.oneTimeExpenses.map((item) => (item.id === row.id ? { ...item, notes: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableNumberCell
                        value={row.price}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            oneTimeExpenses: current.oneTimeExpenses.map((item) => (item.id === row.id ? { ...item, price: Number(next ?? 0) } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        onClick={() => deleteWithConfirm("one-time", row.id)}
                        className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20"
                        aria-label="Delete one-time row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel p-4">
        <SectionHeader title="Revenue" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">Gross Revenue: <span className="font-semibold text-white">{formatMoney(summary.grossRevenue)}</span></p>
          <button
            type="button"
            onClick={addRevenueRow}
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
                <th className="px-3 py-2">Client Name</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2">Date Received</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2 text-right">Stripe Fee</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {monthData.revenues.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-slate-400" colSpan={7}>No revenue entries yet.</td>
                </tr>
              ) : (
                monthData.revenues.map((row) => (
                  <tr key={row.id} className="transition hover:bg-white/[0.03]">
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.clientName}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            revenues: current.revenues.map((item) => (item.id === row.id ? { ...item, clientName: next } : item)),
                          }))
                        }
                        placeholder="Client"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableNumberCell
                        value={row.amount}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            revenues: current.revenues.map((item) => (item.id === row.id ? { ...item, amount: Number(next ?? 0) } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.date}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            revenues: current.revenues.map((item) => (item.id === row.id ? { ...item, date: next } : item)),
                          }))
                        }
                        placeholder="2026-03-01"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        value={row.type}
                        onChange={(event) => {
                          const next = event.target.value as RevenueCategory;
                          updateMonth((current) => ({
                            ...current,
                            revenues: current.revenues.map((item) => (item.id === row.id ? { ...item, type: next } : item)),
                          }));
                        }}
                        className="w-full rounded-lg border border-white/10 bg-[#0d111d] px-2.5 py-2 text-sm text-slate-100 outline-none"
                      >
                        <option value="retainer">retainer</option>
                        <option value="project">project</option>
                        <option value="ad management">ad management</option>
                        <option value="other">other</option>
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <EditableTextCell
                        value={row.notes}
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            revenues: current.revenues.map((item) => (item.id === row.id ? { ...item, notes: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <EditableNumberCell
                        value={row.stripeFee}
                        nullable
                        onSave={(next) =>
                          updateMonth((current) => ({
                            ...current,
                            revenues: current.revenues.map((item) => (item.id === row.id ? { ...item, stripeFee: next } : item)),
                          }))
                        }
                      />
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        onClick={() => deleteWithConfirm("revenue", row.id)}
                        className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200 transition hover:bg-rose-500/20"
                        aria-label="Delete revenue row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
