"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Funnel, Plus, Trash2, X } from "lucide-react";
import { TEAM_MEMBERS } from "@/lib/tasks-schema";
import { PipelineDeal, PipelineStage } from "@/lib/pipeline-types";

type PanelMode = "create" | "view" | null;
type DealForm = {
  name: string;
  stage: PipelineStage;
  value: string;
  client: string;
  contact: string;
  assignee: string;
  notes: string;
};

const STAGE_COLUMNS: { stage: PipelineStage; title: string; color: string; accent: string }[] = [
  { stage: "lead", title: "Lead", color: "#94A3B8", accent: "rgba(148,163,184,0.18)" },
  { stage: "outreach", title: "Outreach", color: "#2093FF", accent: "rgba(32,147,255,0.22)" },
  { stage: "proposal", title: "Proposal", color: "#FFBD59", accent: "rgba(255,189,89,0.2)" },
  { stage: "negotiation", title: "Negotiation", color: "#A855F7", accent: "rgba(168,85,247,0.2)" },
  { stage: "won", title: "Won", color: "#22C55E", accent: "rgba(34,197,94,0.2)" },
];

const EMPTY_FORM: DealForm = {
  name: "",
  stage: "lead",
  value: "0",
  client: "",
  contact: "",
  assignee: TEAM_MEMBERS[0].id,
  notes: "",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function toCurrency(value: number) {
  return currency.format(value);
}

function toInitials(value: string) {
  return value
    .split(" ")
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function dealDaysInStage(deal: PipelineDeal): number {
  const source = deal.stageUpdatedAt ?? deal.createdAt;
  const date = new Date(`${source}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const deltaMs = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(deltaMs / (1000 * 60 * 60 * 24)));
}

function isThisMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const now = new Date();
  const [year, month] = value.split("-").map(Number);
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(EMPTY_FORM);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);

  const assigneeNames = useMemo(() => {
    return Object.fromEntries(TEAM_MEMBERS.map((member) => [member.id, member.name]));
  }, []);

  const selectedDeal = useMemo(
    () => (selectedDealId ? deals.find((deal) => deal.id === selectedDealId) ?? null : null),
    [deals, selectedDealId],
  );

  const stats = useMemo(() => {
    const wonDeals = deals.filter((deal) => deal.stage === "won");
    const activeDeals = deals.filter((deal) => deal.stage !== "won");
    const wonThisMonthDeals = wonDeals.filter((deal) => isThisMonth(deal.stageUpdatedAt ?? deal.createdAt));

    const totalPipelineValue = activeDeals.reduce((sum, deal) => sum + deal.value, 0);
    const wonThisMonthValue = wonThisMonthDeals.reduce((sum, deal) => sum + deal.value, 0);
    const conversionRate = deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0;

    return {
      totalPipelineValue,
      dealsInPipeline: activeDeals.length,
      wonThisMonthCount: wonThisMonthDeals.length,
      wonThisMonthValue,
      conversionRate,
    };
  }, [deals]);

  async function loadDeals() {
    try {
      setLoading(true);
      const response = await fetch("/api/pipeline", { cache: "no-store" });
      if (!response.ok) throw new Error("Load failed");
      const data = (await response.json()) as PipelineDeal[];
      setDeals(data);
      setError(null);
    } catch {
      setError("Could not load pipeline deals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeals();
  }, []);

  function openCreatePanel() {
    setPanelMode("create");
    setSelectedDealId(null);
    setForm({ ...EMPTY_FORM, client: "Derby Digital", value: "1000" });
  }

  function openDealPanel(deal: PipelineDeal) {
    setPanelMode("view");
    setSelectedDealId(deal.id);
    setForm({
      name: deal.name,
      stage: deal.stage,
      value: String(deal.value),
      client: deal.client,
      contact: deal.contact,
      assignee: deal.assignee,
      notes: deal.notes,
    });
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedDealId(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.client.trim()) {
      setError("Deal name and client are required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          stage: form.stage,
          value: Number(form.value),
          client: form.client,
          contact: form.contact,
          assignee: form.assignee,
          notes: form.notes,
        }),
      });
      if (!response.ok) throw new Error("Create failed");
      const created = (await response.json()) as PipelineDeal;
      setDeals((prev) => [...prev, created]);
      closePanel();
      setError(null);
    } catch {
      setError("Could not create deal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDeal) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/pipeline/${selectedDeal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          stage: form.stage,
          value: Number(form.value),
          client: form.client,
          contact: form.contact,
          assignee: form.assignee,
          notes: form.notes,
        }),
      });
      if (!response.ok) throw new Error("Update failed");
      const updated = (await response.json()) as PipelineDeal;
      setDeals((prev) => prev.map((deal) => (deal.id === updated.id ? updated : deal)));
      closePanel();
      setError(null);
    } catch {
      setError("Could not update deal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedDeal) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/pipeline/${selectedDeal.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setDeals((prev) => prev.filter((deal) => deal.id !== selectedDeal.id));
      closePanel();
      setError(null);
    } catch {
      setError("Could not delete deal.");
    } finally {
      setSaving(false);
    }
  }

  async function moveDeal(dealId: string, stage: PipelineStage) {
    const current = deals.find((deal) => deal.id === dealId);
    if (!current || current.stage === stage) return;

    setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal)));

    try {
      const response = await fetch(`/api/pipeline/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!response.ok) throw new Error("Move failed");
      const updated = (await response.json()) as PipelineDeal;
      setDeals((prev) => prev.map((deal) => (deal.id === updated.id ? updated : deal)));
      setError(null);
    } catch {
      setDeals((prev) => prev.map((deal) => (deal.id === dealId ? current : deal)));
      setError("Could not move deal.");
    }
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="mt-2 text-sm text-slate-300">Sales pipeline and client acquisition tracking.</p>
        </div>
        <button
          type="button"
          onClick={openCreatePanel}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/30"
        >
          <Plus size={16} />
          Add Deal
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Total Pipeline Value</p>
          <p className="mt-3 text-2xl font-semibold text-blue-100">{toCurrency(stats.totalPipelineValue)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Deals In Pipeline</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">{stats.dealsInPipeline}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Won This Month</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-300">
            {stats.wonThisMonthCount} <span className="text-base text-emerald-200">({toCurrency(stats.wonThisMonthValue)})</span>
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Conversion Rate</p>
          <p className="mt-3 text-2xl font-semibold text-purple-200">{stats.conversionRate.toFixed(1)}%</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-6 text-sm text-slate-300">Loading pipeline...</div>
      ) : (
        <div className="glass-panel p-3 md:p-4">
          <div className="grid gap-3 overflow-x-auto pb-2 xl:grid-cols-5 md:grid-cols-2 grid-cols-1">
            {STAGE_COLUMNS.map((column) => {
              const stageDeals = deals.filter((deal) => deal.stage === column.stage);

              return (
                <div
                  key={column.stage}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverStage(column.stage);
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const dealId = event.dataTransfer.getData("text/pipeline-deal-id");
                    setDragOverStage(null);
                    if (dealId) void moveDeal(dealId, column.stage);
                  }}
                  className="min-h-[460px] min-w-[250px] rounded-xl border border-white/10 bg-slate-950/35 p-3"
                  style={{
                    borderColor: dragOverStage === column.stage ? column.color : undefined,
                    boxShadow: dragOverStage === column.stage ? `0 0 0 1px ${column.color}` : undefined,
                  }}
                >
                  <div
                    className="mb-3 flex items-center justify-between rounded-lg border px-3 py-2"
                    style={{ borderColor: `${column.color}66`, background: column.accent }}
                  >
                    <p className="text-sm font-semibold" style={{ color: column.color }}>
                      {column.title}
                    </p>
                    <span className="text-xs text-slate-200">{stageDeals.length}</span>
                  </div>

                  <div className="space-y-3">
                    {stageDeals.map((deal) => {
                      const assignee = assigneeNames[deal.assignee] ?? deal.assignee;
                      return (
                        <button
                          key={deal.id}
                          type="button"
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("text/pipeline-deal-id", deal.id)}
                          onClick={() => openDealPanel(deal)}
                          className="glass-card w-full cursor-pointer p-3 text-left transition hover:-translate-y-1"
                        >
                          <p className="text-sm font-bold leading-snug text-white">{deal.name}</p>
                          <p className="mt-1 text-xs text-slate-300">{deal.client}</p>
                          <p className="mt-3 text-xl font-semibold text-blue-100">{toCurrency(deal.value)}</p>
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-semibold text-slate-100">
                              {toInitials(assignee)}
                            </span>
                            <span>{dealDaysInStage(deal)}d in stage</span>
                          </div>
                        </button>
                      );
                    })}
                    {stageDeals.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/15 px-3 py-8 text-center text-xs text-slate-400">
                        No deals
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {panelMode ? (
        <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm">
          <div className="ml-auto h-full w-full max-w-md overflow-y-auto border-l border-white/15 bg-slate-950/95 p-5 shadow-[0_12px_42px_rgba(0,0,0,0.5)]">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-blue-200">
                  {panelMode === "create" ? "New Deal" : "Deal Details"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {panelMode === "create" ? "Add Pipeline Deal" : selectedDeal?.name ?? "Deal"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-200 transition hover:border-blue-300/50 hover:bg-blue-500/20"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={panelMode === "create" ? handleCreate : handleUpdate} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.11em] text-slate-300">Deal Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/70"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-[0.11em] text-slate-300">Stage</span>
                  <select
                    value={form.stage}
                    onChange={(event) => setForm((prev) => ({ ...prev, stage: event.target.value as PipelineStage }))}
                    className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/70"
                  >
                    {STAGE_COLUMNS.map((column) => (
                      <option key={column.stage} value={column.stage}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs uppercase tracking-[0.11em] text-slate-300">Value ($)</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={form.value}
                    onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                    className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/70"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.11em] text-slate-300">Client</span>
                <input
                  value={form.client}
                  onChange={(event) => setForm((prev) => ({ ...prev, client: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/70"
                  required
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.11em] text-slate-300">Contact</span>
                <input
                  value={form.contact}
                  onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/70"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.11em] text-slate-300">Assignee</span>
                <select
                  value={form.assignee}
                  onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/70"
                >
                  {TEAM_MEMBERS.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.11em] text-slate-300">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={5}
                  className="w-full rounded-xl border border-white/15 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/70"
                />
              </label>

              <div className="flex items-center justify-between gap-3 pt-2">
                {panelMode === "view" ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-100 transition hover:border-red-300/65 hover:bg-red-500/30 disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-300/35 bg-blue-500/25 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/70 hover:bg-blue-500/35 disabled:opacity-60"
                >
                  <Funnel size={15} />
                  {panelMode === "create" ? "Create Deal" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
