"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DollarSign, Pencil, Plus, Trash2, X } from "lucide-react";
import { FinanceData, FinanceEntry, FinanceOverhead, FinanceSummary } from "@/lib/finance-types";

type EditableClientField = "monthlyRetainer" | "adSpend";
type OverheadKey = keyof FinanceOverhead;
type EditingCell = { clientId: string; field: EditableClientField } | null;

type EntryForm = {
  date: string;
  description: string;
  category: "revenue" | "expense";
  clientId: string;
  amount: string;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const EMPTY_ENTRY_FORM: EntryForm = {
  date: new Date().toISOString().slice(0, 10),
  description: "",
  category: "expense",
  clientId: "",
  amount: "0",
};

function formatCurrency(value: number) {
  return currency.format(value);
}

function formatPercent(value: number) {
  return `${percent.format(value)}%`;
}

function classForProfit(value: number) {
  return value >= 0 ? "text-emerald-300" : "text-red-300";
}

function classForMargin(value: number) {
  return value >= 0 ? "text-emerald-200" : "text-red-200";
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [cellDraft, setCellDraft] = useState("0");

  const [editingOverhead, setEditingOverhead] = useState<OverheadKey | null>(null);
  const [overheadDraft, setOverheadDraft] = useState("0");

  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<EntryForm>(EMPTY_ENTRY_FORM);

  const chartMax = useMemo(() => {
    if (!summary) return 1;
    return Math.max(
      1,
      ...summary.monthly.flatMap((point) => [point.revenue, point.expenses]),
    );
  }, [summary]);

  async function loadFinance() {
    try {
      setLoading(true);
      const [financeRes, summaryRes] = await Promise.all([
        fetch("/api/finance", { cache: "no-store" }),
        fetch("/api/finance/summary", { cache: "no-store" }),
      ]);

      if (!financeRes.ok || !summaryRes.ok) {
        throw new Error("Failed to load finance data");
      }

      const financeData = (await financeRes.json()) as FinanceData;
      const financeSummary = (await summaryRes.json()) as FinanceSummary;

      setData(financeData);
      setSummary(financeSummary);
      setError(null);
    } catch {
      setError("Could not load finance data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFinance();
  }, []);

  async function saveData(nextData: FinanceData) {
    try {
      setSaving(true);
      const response = await fetch("/api/finance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextData),
      });
      if (!response.ok) {
        throw new Error("Save failed");
      }
      const saved = (await response.json()) as FinanceData;
      setData(saved);

      const summaryResponse = await fetch("/api/finance/summary", { cache: "no-store" });
      if (!summaryResponse.ok) {
        throw new Error("Summary refresh failed");
      }
      const refreshed = (await summaryResponse.json()) as FinanceSummary;
      setSummary(refreshed);
      setError(null);
    } catch {
      setError("Could not save finance changes.");
    } finally {
      setSaving(false);
    }
  }

  function startClientCellEdit(clientId: string, field: EditableClientField, currentValue: number) {
    setEditingCell({ clientId, field });
    setCellDraft(String(currentValue));
  }

  async function commitClientCellEdit() {
    if (!data || !editingCell) return;

    const parsed = Number(cellDraft);
    const safeValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

    const nextData: FinanceData = {
      ...data,
      clients: data.clients.map((client) =>
        client.id === editingCell.clientId
          ? { ...client, [editingCell.field]: safeValue }
          : client,
      ),
    };

    setEditingCell(null);
    await saveData(nextData);
  }

  function startOverheadEdit(key: OverheadKey, currentValue: number) {
    setEditingOverhead(key);
    setOverheadDraft(String(currentValue));
  }

  async function commitOverheadEdit() {
    if (!data || !editingOverhead) return;

    const parsed = Number(overheadDraft);
    const safeValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

    const nextData: FinanceData = {
      ...data,
      monthlyOverhead: {
        ...data.monthlyOverhead,
        [editingOverhead]: safeValue,
      },
    };

    setEditingOverhead(null);
    await saveData(nextData);
  }

  function openAddEntryForm() {
    setEntryForm(EMPTY_ENTRY_FORM);
    setEditingEntryId(null);
    setEntryFormOpen(true);
  }

  function openEditEntryForm(entry: FinanceEntry) {
    setEntryForm({
      date: entry.date,
      description: entry.description,
      category: entry.category,
      clientId: entry.clientId ?? "",
      amount: String(entry.amount),
    });
    setEditingEntryId(entry.id);
    setEntryFormOpen(true);
  }

  async function handleSubmitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entryForm.description.trim()) {
      setError("Entry description is required.");
      return;
    }

    const amount = Number(entryForm.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Entry amount must be a positive number.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        date: entryForm.date,
        description: entryForm.description,
        category: entryForm.category,
        clientId: entryForm.clientId || null,
        amount,
      };

      const response = await fetch(
        editingEntryId ? `/api/finance/entries/${editingEntryId}` : "/api/finance/entries",
        {
          method: editingEntryId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Entry save failed");
      }

      setEntryFormOpen(false);
      setEditingEntryId(null);
      setError(null);
      await loadFinance();
    } catch {
      setError("Could not save transaction entry.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    try {
      setSaving(true);
      const response = await fetch(`/api/finance/entries/${entryId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Entry delete failed");
      }
      await loadFinance();
      setError(null);
    } catch {
      setError("Could not delete transaction entry.");
    } finally {
      setSaving(false);
    }
  }

  const totals = useMemo(() => {
    if (!summary) {
      return { revenue: 0, adSpend: 0, expenses: 0, profit: 0 };
    }

    return summary.clients.reduce(
      (acc, client) => ({
        revenue: acc.revenue + client.monthlyRetainer,
        adSpend: acc.adSpend + client.adSpend,
        expenses: acc.expenses + client.expenses,
        profit: acc.profit + client.profit,
      }),
      { revenue: 0, adSpend: 0, expenses: 0, profit: 0 },
    );
  }, [summary]);

  if (loading) {
    return <section className="glass-panel p-6 text-sm text-slate-300">Loading finance dashboard...</section>;
  }

  if (!data || !summary) {
    return <section className="glass-panel p-6 text-sm text-red-200">Finance data unavailable.</section>;
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="mt-2 text-sm text-slate-300">Per-client P&L, overhead tracking, and transaction management.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
          <DollarSign size={14} />
          Finance Manager
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Monthly Revenue</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-300">{formatCurrency(summary.overall.monthlyRevenue)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Monthly Expenses</p>
          <p className="mt-3 text-2xl font-semibold text-red-300">{formatCurrency(summary.overall.monthlyExpenses)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Net Profit</p>
          <p className={`mt-3 text-2xl font-semibold ${classForProfit(summary.overall.netProfit)}`}>
            {formatCurrency(summary.overall.netProfit)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Profit Margin</p>
          <p className={`mt-3 text-2xl font-semibold ${classForMargin(summary.overall.profitMargin)}`}>
            {formatPercent(summary.overall.profitMargin)}
          </p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="section-title">Per-Client P&L</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.12em] text-slate-300">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Monthly Retainer</th>
                <th className="px-4 py-3">Ad Spend</th>
                <th className="px-4 py-3">Expenses</th>
                <th className="px-4 py-3">Profit</th>
                <th className="px-4 py-3">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {summary.clients.map((client) => (
                <tr key={client.clientId} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{client.name}</td>
                  <td className="px-4 py-3">
                    {editingCell?.clientId === client.clientId && editingCell.field === "monthlyRetainer" ? (
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        step="1"
                        value={cellDraft}
                        onChange={(event) => setCellDraft(event.target.value)}
                        onBlur={() => {
                          void commitClientCellEdit();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void commitClientCellEdit();
                          }
                          if (event.key === "Escape") {
                            setEditingCell(null);
                          }
                        }}
                        className="w-28 rounded-md border border-blue-400/60 bg-slate-950/70 px-2 py-1 text-sm text-white outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startClientCellEdit(client.clientId, "monthlyRetainer", client.monthlyRetainer)}
                        className="rounded-md border border-transparent px-2 py-1 text-emerald-200 transition hover:border-blue-400/50 hover:bg-blue-500/10"
                      >
                        {formatCurrency(client.monthlyRetainer)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingCell?.clientId === client.clientId && editingCell.field === "adSpend" ? (
                      <input
                        autoFocus
                        type="number"
                        min="0"
                        step="1"
                        value={cellDraft}
                        onChange={(event) => setCellDraft(event.target.value)}
                        onBlur={() => {
                          void commitClientCellEdit();
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void commitClientCellEdit();
                          }
                          if (event.key === "Escape") {
                            setEditingCell(null);
                          }
                        }}
                        className="w-28 rounded-md border border-blue-400/60 bg-slate-950/70 px-2 py-1 text-sm text-white outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startClientCellEdit(client.clientId, "adSpend", client.adSpend)}
                        className="rounded-md border border-transparent px-2 py-1 text-red-200 transition hover:border-blue-400/50 hover:bg-blue-500/10"
                      >
                        {formatCurrency(client.adSpend)}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-red-200">{formatCurrency(client.expenses)}</td>
                  <td className={`px-4 py-3 font-semibold ${classForProfit(client.profit)}`}>{formatCurrency(client.profit)}</td>
                  <td className={`px-4 py-3 ${classForMargin(client.margin)}`}>{formatPercent(client.margin)}</td>
                </tr>
              ))}
              <tr className="bg-white/5 font-semibold">
                <td className="px-4 py-3">Totals</td>
                <td className="px-4 py-3 text-emerald-300">{formatCurrency(totals.revenue)}</td>
                <td className="px-4 py-3 text-red-300">{formatCurrency(totals.adSpend)}</td>
                <td className="px-4 py-3 text-red-200">{formatCurrency(totals.expenses)}</td>
                <td className={`px-4 py-3 ${classForProfit(totals.profit)}`}>{formatCurrency(totals.profit)}</td>
                <td className={`px-4 py-3 ${classForMargin(summary.overall.profitMargin)}`}>
                  {formatPercent(summary.overall.profitMargin)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="section-title">Monthly Overhead</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {([
            { key: "aiCosts", label: "AI Costs", description: "OpenAI, Anthropic, etc." },
            { key: "software", label: "Software", description: "GoHighLevel, hosting, tools" },
            { key: "team", label: "Team", description: "Contractor payments" },
            { key: "other", label: "Other", description: "Additional overhead" },
          ] as { key: OverheadKey; label: string; description: string }[]).map((item) => (
            <div key={item.key} className="glass-card p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">{item.label}</p>
              <p className="mt-1 text-xs text-slate-400">{item.description}</p>
              <div className="mt-3">
                {editingOverhead === item.key ? (
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    step="1"
                    value={overheadDraft}
                    onChange={(event) => setOverheadDraft(event.target.value)}
                    onBlur={() => {
                      void commitOverheadEdit();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void commitOverheadEdit();
                      }
                      if (event.key === "Escape") {
                        setEditingOverhead(null);
                      }
                    }}
                    className="w-32 rounded-md border border-blue-400/60 bg-slate-950/70 px-2 py-1 text-lg font-semibold text-white outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startOverheadEdit(item.key, data.monthlyOverhead[item.key])}
                    className="rounded-md border border-transparent px-2 py-1 text-left text-2xl font-semibold text-white transition hover:border-blue-400/50 hover:bg-blue-500/10"
                  >
                    {formatCurrency(data.monthlyOverhead[item.key])}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="section-title">Transaction Log</h2>
          <button
            type="button"
            onClick={openAddEntryForm}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300/40 bg-blue-500/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100 transition hover:border-blue-300/70 hover:bg-blue-500/30"
          >
            <Plus size={14} />
            Add Entry
          </button>
        </div>

        {entryFormOpen ? (
          <form onSubmit={handleSubmitEntry} className="grid gap-3 border-b border-white/10 bg-white/5 p-4 md:grid-cols-5">
            <label className="text-xs text-slate-300">
              Date
              <input
                type="date"
                value={entryForm.date}
                onChange={(event) => setEntryForm((prev) => ({ ...prev, date: event.target.value }))}
                className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/70 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-400/60"
              />
            </label>
            <label className="text-xs text-slate-300 md:col-span-2">
              Description
              <input
                type="text"
                value={entryForm.description}
                onChange={(event) => setEntryForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Meta ad reimbursement"
                className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/70 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-400/60"
              />
            </label>
            <label className="text-xs text-slate-300">
              Category
              <select
                value={entryForm.category}
                onChange={(event) => setEntryForm((prev) => ({ ...prev, category: event.target.value as EntryForm["category"] }))}
                className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/70 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-400/60"
              >
                <option value="expense">Expense</option>
                <option value="revenue">Revenue</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Client
              <select
                value={entryForm.clientId}
                onChange={(event) => setEntryForm((prev) => ({ ...prev, clientId: event.target.value }))}
                className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/70 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-400/60"
              >
                <option value="">No Client</option>
                {data.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Amount
              <input
                type="number"
                min="0"
                step="1"
                value={entryForm.amount}
                onChange={(event) => setEntryForm((prev) => ({ ...prev, amount: event.target.value }))}
                className="mt-1 w-full rounded-md border border-white/20 bg-slate-950/70 px-2 py-1.5 text-sm text-white outline-none focus:border-blue-400/60"
              />
            </label>
            <div className="md:col-span-5 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg border border-blue-300/40 bg-blue-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100 transition hover:bg-blue-500/35 disabled:opacity-50"
              >
                {editingEntryId ? "Update Entry" : "Create Entry"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryFormOpen(false);
                  setEditingEntryId(null);
                }}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.12em] text-slate-300">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.entries.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-400" colSpan={6}>
                    No entries yet.
                  </td>
                </tr>
              ) : (
                data.entries
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((entry) => {
                    const client = data.clients.find((item) => item.id === entry.clientId);
                    return (
                      <tr key={entry.id} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-slate-200">{entry.date}</td>
                        <td className="px-4 py-3 text-white">{entry.description}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.08em] ${
                              entry.category === "revenue"
                                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                                : "border-red-400/40 bg-red-500/15 text-red-200"
                            }`}
                          >
                            {entry.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200">{client?.name ?? "—"}</td>
                        <td className={`px-4 py-3 font-semibold ${entry.category === "revenue" ? "text-emerald-300" : "text-red-300"}`}>
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditEntryForm(entry)}
                              className="inline-flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-slate-200 transition hover:border-blue-400/50 hover:bg-blue-500/10"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleDeleteEntry(entry.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs text-red-200 transition hover:bg-red-500/20"
                            >
                              <Trash2 size={12} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel p-4">
        <h2 className="section-title">Monthly Revenue vs Expenses</h2>
        <p className="mt-2 text-xs text-slate-400">Last 6 months</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {summary.monthly.map((point) => {
            const revenueHeight = `${Math.max(8, Math.round((point.revenue / chartMax) * 110))}px`;
            const expenseHeight = `${Math.max(8, Math.round((point.expenses / chartMax) * 110))}px`;

            return (
              <div key={point.monthKey} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex h-32 items-end justify-center gap-2">
                  <div className="w-6 rounded-t-md bg-emerald-400/80" style={{ height: revenueHeight }} title={`Revenue ${formatCurrency(point.revenue)}`} />
                  <div className="w-6 rounded-t-md bg-red-400/80" style={{ height: expenseHeight }} title={`Expenses ${formatCurrency(point.expenses)}`} />
                </div>
                <p className="mt-2 text-center text-xs font-semibold text-slate-200">{point.label}</p>
                <p className="text-center text-[11px] text-emerald-300">{formatCurrency(point.revenue)}</p>
                <p className="text-center text-[11px] text-red-300">{formatCurrency(point.expenses)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {saving ? (
        <div className="fixed bottom-5 right-5 inline-flex items-center gap-2 rounded-lg border border-blue-300/40 bg-blue-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
          Saving
          <X size={12} className="animate-pulse" />
        </div>
      ) : null}
    </section>
  );
}
