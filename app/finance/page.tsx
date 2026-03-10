"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Landmark,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { FinanceClient, FinanceData, FinanceRecord, FinanceRecordCategory, FinanceRecordType, FinanceSummary } from "@/lib/finance-types";

type TransactionForm = {
  type: FinanceRecordType;
  client: string;
  amount: string;
  category: FinanceRecordCategory;
  date: string;
  notes: string;
  recurring: boolean;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const CATEGORY_OPTIONS: FinanceRecordCategory[] = ["retainer", "ad spend", "tool cost", "freelancer", "other"];

function formatCurrency(value: number) {
  return currency.format(value);
}

function formatPercent(value: number) {
  return `${percent.format(value)}%`;
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function shiftMonth(value: string, delta: number) {
  const [year, month] = value.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function emptyTransactionForm(selectedMonth: string): TransactionForm {
  return {
    type: "income",
    client: "",
    amount: "",
    category: "retainer",
    date: `${selectedMonth}-01`,
    notes: "",
    recurring: false,
  };
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <article className="glass-card relative overflow-hidden p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#2093FF]/0 via-[#2093FF] to-[#0026FF]/0" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className={`mt-3 text-2xl font-semibold tracking-[-0.03em] ${tone}`}>{value}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2.5 text-blue-100">
          <Icon size={18} />
        </div>
      </div>
    </article>
  );
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey());
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [transactionForm, setTransactionForm] = useState<TransactionForm>(emptyTransactionForm(monthKey()));

  async function loadFinance(month = selectedMonth) {
    try {
      setLoading(true);
      const [financeResponse, summaryResponse] = await Promise.all([
        fetch("/api/finance", { cache: "no-store" }),
        fetch(`/api/finance/summary?month=${month}`, { cache: "no-store" }),
      ]);

      if (!financeResponse.ok || !summaryResponse.ok) {
        throw new Error("Failed to load finance data");
      }

      const financeData = (await financeResponse.json()) as FinanceData;
      const financeSummary = (await summaryResponse.json()) as FinanceSummary;

      setData(financeData);
      setSummary(financeSummary);
      setSelectedMonth(financeSummary.overall.month);
      setSelectedClientId((previous) => {
        if (previous && financeSummary.clients.some((client) => client.clientId === previous)) {
          return previous;
        }
        return financeSummary.clients[0]?.clientId ?? null;
      });
      setError(null);
    } catch {
      setError("Could not load finance data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFinance(selectedMonth);
  }, [selectedMonth]);

  const chartMax = useMemo(() => {
    if (!summary) return 1;
    return Math.max(1, ...summary.trend.flatMap((point) => [point.revenue, point.costs]));
  }, [summary]);

  const selectedClient = useMemo(
    () => summary?.clients.find((client) => client.clientId === selectedClientId) ?? null,
    [selectedClientId, summary],
  );

  const clientTransactions = useMemo(() => {
    if (!summary || !selectedClientId) return [];
    return summary.transactions.filter((record) => record.client === selectedClientId);
  }, [selectedClientId, summary]);

  function openCreateTransaction() {
    setEditingRecordId(null);
    setTransactionForm(emptyTransactionForm(selectedMonth));
    setTransactionFormOpen(true);
  }

  function openEditTransaction(record: FinanceRecord) {
    setEditingRecordId(record.id);
    setTransactionForm({
      type: record.type,
      client: record.client ?? "",
      amount: String(record.amount),
      category: record.category,
      date: record.date,
      notes: record.notes,
      recurring: record.recurring,
    });
    setTransactionFormOpen(true);
  }

  async function handleSubmitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(transactionForm.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Transaction amount must be a positive number.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionForm.date)) {
      setError("Transaction date must be YYYY-MM-DD.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        editingRecordId ? `/api/finance/entries/${editingRecordId}` : "/api/finance/entries",
        {
          method: editingRecordId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: transactionForm.type,
            client: transactionForm.client || null,
            amount,
            category: transactionForm.category,
            date: transactionForm.date,
            notes: transactionForm.notes,
            recurring: transactionForm.recurring,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save transaction");
      }

      setTransactionFormOpen(false);
      setEditingRecordId(null);
      setError(null);
      await loadFinance(selectedMonth);
    } catch {
      setError("Could not save transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTransaction(recordId: string) {
    if (!window.confirm("Delete this transaction? This cannot be undone.")) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/finance/entries/${recordId}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }
      setError(null);
      await loadFinance(selectedMonth);
    } catch {
      setError("Could not delete transaction.");
    } finally {
      setSaving(false);
    }
  }

  const currentMonth = monthKey();

  if (loading && !summary) {
    return <section className="glass-panel p-6 text-sm text-slate-300">Loading finance dashboard...</section>;
  }

  if (!data || !summary) {
    return <section className="glass-panel p-6 text-sm text-red-200">Finance data unavailable.</section>;
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Month-based revenue tracking, client profitability, and transaction history in one view.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="glass-card inline-flex items-center gap-2 px-2 py-2">
            <button
              type="button"
              onClick={() => setSelectedMonth((value) => shiftMonth(value, -1))}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-100 transition hover:border-blue-300/40 hover:bg-blue-500/15"
              aria-label="Previous month"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-[10.5rem] px-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Selected Month</p>
              <p className="mt-1 text-base font-semibold text-white">{summary.overall.monthLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMonth((value) => shiftMonth(value, 1))}
              disabled={selectedMonth >= currentMonth}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-100 transition hover:border-blue-300/40 hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next month"
            >
              <ArrowRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateTransaction}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.26),rgba(0,38,255,0.28))] px-4 py-3 text-sm font-semibold text-blue-50 shadow-[0_18px_35px_rgba(0,38,255,0.18)] transition hover:-translate-y-0.5 hover:border-blue-200/50"
          >
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={DollarSign} label="Monthly Revenue" value={formatCurrency(summary.overall.monthlyRevenue)} tone="text-emerald-300" />
        <StatCard icon={Receipt} label="Monthly Costs" value={formatCurrency(summary.overall.monthlyCosts)} tone="text-rose-300" />
        <StatCard icon={Wallet} label="Net Profit" value={formatCurrency(summary.overall.netProfit)} tone={summary.overall.netProfit >= 0 ? "text-blue-100" : "text-rose-300"} />
        <StatCard icon={TrendingUp} label="MRR" value={formatCurrency(summary.overall.mrr)} tone="text-cyan-200" />
        <StatCard icon={Landmark} label="Active Clients" value={String(summary.overall.activeClients)} tone="text-white" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-panel overflow-hidden p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-title">Revenue vs Costs</h2>
              <p className="mt-2 text-sm text-slate-400">Last six months ending {summary.overall.monthLabel}.</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Revenue
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                Costs
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-6 gap-3">
            {summary.trend.map((point) => (
              <div key={point.month} className="flex flex-col items-center gap-3">
                <div className="flex h-52 w-full items-end justify-center gap-2 rounded-[1.4rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-2 py-3">
                  <div
                    className="w-full rounded-full bg-[linear-gradient(180deg,#6ee7b7,#10b981)] shadow-[0_8px_24px_rgba(16,185,129,0.28)]"
                    style={{ height: `${Math.max(10, (point.revenue / chartMax) * 100)}%` }}
                    title={`Revenue ${formatCurrency(point.revenue)}`}
                  />
                  <div
                    className="w-full rounded-full bg-[linear-gradient(180deg,#fb7185,#e11d48)] shadow-[0_8px_24px_rgba(225,29,72,0.24)]"
                    style={{ height: `${Math.max(10, (point.costs / chartMax) * 100)}%` }}
                    title={`Costs ${formatCurrency(point.costs)}`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-200">{point.label}</p>
                  <p className={`mt-1 text-[11px] ${point.profit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {formatCurrency(point.profit)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel overflow-hidden p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="section-title">Month Snapshot</h2>
              <p className="mt-2 text-sm text-slate-400">{summary.availableMonths.length} tracked month(s) persisted in Redis.</p>
            </div>
            <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-200/70">Net Profit</p>
              <p className={`mt-1 text-lg font-semibold ${summary.overall.netProfit >= 0 ? "text-blue-100" : "text-rose-300"}`}>
                {formatCurrency(summary.overall.netProfit)}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Revenue</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatCurrency(summary.overall.monthlyRevenue)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Costs</p>
              <p className="mt-2 text-2xl font-semibold text-rose-300">{formatCurrency(summary.overall.monthlyCosts)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(32,147,255,0.18),rgba(0,38,255,0.16))] p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-blue-100/70">Selected Window</p>
              <p className="mt-2 text-lg font-semibold text-white">{summary.overall.monthLabel}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="section-title">Clients</h2>
              <p className="mt-2 text-sm text-slate-400">Tap a client to inspect their monthly contribution and transaction history.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {summary.clients.length} client{summary.clients.length === 1 ? "" : "s"}
            </div>
          </div>

          {summary.clients.length === 0 ? (
            <div className="glass-panel p-6 text-sm text-slate-300">No clients are stored yet. Add transactions once client records exist in persistence.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {summary.clients.map((client, index) => (
                <button
                  key={client.clientId}
                  type="button"
                  onClick={() => setSelectedClientId(client.clientId)}
                  className={`glass-card group relative overflow-hidden p-5 text-left transition hover:-translate-y-1 ${
                    selectedClientId === client.clientId ? "border-blue-300/60 shadow-[0_22px_40px_rgba(0,38,255,0.22)]" : ""
                  }`}
                  style={{ animationDelay: `${100 + index * 40}ms` }}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#2093FF]/0 via-[#2093FF] to-[#0026FF]/0 opacity-80" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">{client.name}</h3>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{client.status}</p>
                    </div>
                    <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${client.netProfit >= 0 ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-rose-400/30 bg-rose-500/10 text-rose-200"}`}>
                      {formatCurrency(client.netProfit)}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Revenue</p>
                      <p className="mt-2 font-semibold text-emerald-300">{formatCurrency(client.revenue)}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Costs</p>
                      <p className="mt-2 font-semibold text-rose-300">{formatCurrency(client.costs)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-300">
                    <span>Retainer {formatCurrency(client.monthlyRetainer)}</span>
                    <span>Ad Spend {formatCurrency(client.adSpendManaged)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="glass-panel overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="section-title">Client Detail</h2>
            <p className="mt-2 text-sm text-slate-400">
              {selectedClient ? `Focused on ${selectedClient.name} for ${summary.overall.monthLabel}.` : "Select a client to inspect their month."}
            </p>
          </div>

          {selectedClient ? (
            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Monthly Retainer</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatCurrency(selectedClient.monthlyRetainer)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Ad Spend Managed</p>
                  <p className="mt-2 text-2xl font-semibold text-blue-100">{formatCurrency(selectedClient.adSpendManaged)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Additional Costs</p>
                  <p className="mt-2 text-2xl font-semibold text-rose-300">{formatCurrency(selectedClient.additionalCosts)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(32,147,255,0.18),rgba(0,38,255,0.14))] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-blue-100/70">Profit Margin</p>
                  <p className={`mt-2 text-2xl font-semibold ${selectedClient.netProfit >= 0 ? "text-white" : "text-rose-200"}`}>
                    {formatCurrency(selectedClient.netProfit)}
                  </p>
                  <p className="mt-1 text-xs text-blue-100/70">{formatPercent(selectedClient.marginPercent)}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Revenue from Client</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(selectedClient.revenue)}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total Costs</p>
                    <p className="mt-1 text-lg font-semibold text-rose-300">{formatCurrency(selectedClient.costs)}</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">Transaction History</h3>
                  <span className="text-xs text-slate-400">{clientTransactions.length} item(s)</span>
                </div>

                <div className="mt-3 space-y-3">
                  {clientTransactions.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                      No transactions for this client in {summary.overall.monthLabel}.
                    </div>
                  ) : (
                    clientTransactions.map((record) => (
                      <div key={record.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{record.notes || "Untitled transaction"}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {record.date} · {record.category} {record.recurring ? "· recurring" : ""}
                            </p>
                          </div>
                          <p className={`text-sm font-semibold ${record.type === "income" ? "text-emerald-300" : "text-rose-300"}`}>
                            {formatCurrency(record.amount)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 text-sm text-slate-300">No client selected.</div>
          )}
        </section>
      </div>

      <section className="glass-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title">Transactions</h2>
            <p className="mt-2 text-sm text-slate-400">Income and expenses active in {summary.overall.monthLabel}.</p>
          </div>
          <button
            type="button"
            onClick={openCreateTransaction}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-200/50 hover:bg-blue-500/25"
          >
            <Plus size={16} />
            New Transaction
          </button>
        </div>

        {transactionFormOpen ? (
          <form onSubmit={handleSubmitTransaction} className="grid gap-4 border-b border-white/10 bg-white/5 p-5 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs text-slate-300">
              Type
              <select
                value={transactionForm.type}
                onChange={(event) =>
                  setTransactionForm((previous) => ({
                    ...previous,
                    type: event.target.value as FinanceRecordType,
                    category: event.target.value === "income" ? "retainer" : previous.category === "retainer" ? "ad spend" : previous.category,
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0f1422] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/50"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Client
              <select
                value={transactionForm.client}
                onChange={(event) => setTransactionForm((previous) => ({ ...previous, client: event.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0f1422] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/50"
              >
                <option value="">No client</option>
                {data.clients.map((client: FinanceClient) => (
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
                step="0.01"
                value={transactionForm.amount}
                onChange={(event) => setTransactionForm((previous) => ({ ...previous, amount: event.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0f1422] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/50"
              />
            </label>

            <label className="text-xs text-slate-300">
              Category
              <select
                value={transactionForm.category}
                onChange={(event) => setTransactionForm((previous) => ({ ...previous, category: event.target.value as FinanceRecordCategory }))}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0f1422] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/50"
              >
                {CATEGORY_OPTIONS.filter((category) => transactionForm.type === "income" || category !== "retainer").map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Date
              <input
                type="date"
                value={transactionForm.date}
                onChange={(event) => setTransactionForm((previous) => ({ ...previous, date: event.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0f1422] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/50"
              />
            </label>

            <label className="text-xs text-slate-300">
              Notes
              <input
                type="text"
                value={transactionForm.notes}
                onChange={(event) => setTransactionForm((previous) => ({ ...previous, notes: event.target.value }))}
                placeholder="Meta reimbursement, freelancer invoice, monthly retainer"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#0f1422] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-300/50"
              />
            </label>

            <label className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 md:col-span-2 xl:col-span-1">
              <input
                type="checkbox"
                checked={transactionForm.recurring}
                onChange={(event) => setTransactionForm((previous) => ({ ...previous, recurring: event.target.checked }))}
                className="h-4 w-4 rounded border-white/20 bg-[#0f1422]"
              />
              Repeat every month from this date
            </label>

            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.22),rgba(0,38,255,0.24))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-200/50 disabled:opacity-50"
              >
                {editingRecordId ? "Update Transaction" : "Create Transaction"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransactionFormOpen(false);
                  setEditingRecordId(null);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {summary.transactions.length === 0 ? (
                <tr>
                  <td className="px-5 py-5 text-slate-400" colSpan={7}>
                    No transactions in {summary.overall.monthLabel}.
                  </td>
                </tr>
              ) : (
                summary.transactions.map((record) => {
                  const clientName = data.clients.find((client) => client.id === record.client)?.name ?? "No client";
                  return (
                    <tr key={record.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-4 text-slate-200">{record.date}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${record.type === "income" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-rose-400/30 bg-rose-500/10 text-rose-200"}`}>
                          {record.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-white">{clientName}</td>
                      <td className="px-5 py-4 text-slate-200">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{record.category}</span>
                          {record.recurring ? (
                            <span className="rounded-full border border-blue-300/25 bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-blue-100">
                              recurring
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-300">{record.notes || "—"}</td>
                      <td className={`px-5 py-4 font-semibold ${record.type === "income" ? "text-emerald-300" : "text-rose-300"}`}>
                        {formatCurrency(record.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditTransaction(record)}
                            className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-blue-300/40 hover:bg-blue-500/10"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void handleDeleteTransaction(record.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
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
      </section>
    </section>
  );
}
