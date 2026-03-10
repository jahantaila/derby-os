"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Funnel, LoaderCircle, Plus, Search, Trash2, X } from "lucide-react";
import { TEAM_MEMBERS } from "@/lib/tasks-schema";
import { PipelineDeal, PipelineSource, PipelineStage } from "@/lib/pipeline-types";

type PanelMode = "create" | "view" | null;
type SourceFilter = "all" | PipelineSource;
type StageFilter = "all" | PipelineStage;
type AssigneeFilter = "all" | (typeof TEAM_MEMBERS)[number]["id"];
type DateRangeFilter = "7d" | "30d" | "90d" | "all";
type CompetitorName = "SpotHopper" | "Owner.com" | "Fisherman" | "BentoBox" | "Popmenu" | "DONT KNOW";
type CompetitorFilter = "all" | CompetitorName;
type DealForm = {
  name: string;
  stage: PipelineStage;
  value: string;
  client: string;
  contact: string;
  assignee: string;
  notes: string;
};
type ToastState = {
  message: string;
  tone: "success" | "error";
} | null;

const STAGE_COLUMNS: { stage: PipelineStage; title: string; color: string; accent: string }[] = [
  { stage: "new-lead", title: "New Lead", color: "#94A3B8", accent: "rgba(148,163,184,0.18)" },
  { stage: "contacted", title: "Contacted", color: "#2093FF", accent: "rgba(32,147,255,0.22)" },
  { stage: "interested", title: "Interested", color: "#FFBD59", accent: "rgba(255,189,89,0.2)" },
  { stage: "scheduled-meeting", title: "Scheduled Meeting", color: "#A855F7", accent: "rgba(168,85,247,0.2)" },
  { stage: "attended-meeting", title: "Attended Meeting", color: "#22D3EE", accent: "rgba(34,211,238,0.2)" },
  { stage: "negotiating", title: "Negotiating", color: "#F97316", accent: "rgba(249,115,22,0.2)" },
  { stage: "closed-won", title: "Closed Won", color: "#22C55E", accent: "rgba(34,197,94,0.2)" },
  { stage: "closed-lost", title: "Closed Lost", color: "#F93C3C", accent: "rgba(249,60,60,0.2)" },
];

const EMPTY_FORM: DealForm = {
  name: "",
  stage: "new-lead",
  value: "0",
  client: "",
  contact: "",
  assignee: TEAM_MEMBERS[0].id,
  notes: "",
};

const CLOSED_STAGES: PipelineStage[] = ["closed-won", "closed-lost"];

const SOURCE_META: Record<PipelineSource, { label: string; className: string }> = {
  instantly: {
    label: "Instantly",
    className: "border-purple-300/35 bg-purple-500/25 text-purple-100",
  },
  manual: {
    label: "Manual",
    className: "border-slate-300/30 bg-slate-500/20 text-slate-100",
  },
  referral: {
    label: "Referral",
    className: "border-emerald-300/35 bg-emerald-500/25 text-emerald-100",
  },
  website: {
    label: "Website",
    className: "border-blue-300/35 bg-blue-500/25 text-blue-100",
  },
};

const SOURCE_FILTER_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All Sources" },
  { value: "instantly", label: "Instantly" },
  { value: "manual", label: "Manual" },
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
];

const STAGE_FILTER_OPTIONS: { value: StageFilter; label: string }[] = [
  { value: "all", label: "All Stages" },
  ...STAGE_COLUMNS.map((column) => ({ value: column.stage, label: column.title })),
];

const ASSIGNEE_FILTER_OPTIONS: { value: AssigneeFilter; label: string }[] = [
  { value: "all", label: "All Assignees" },
  ...TEAM_MEMBERS.map((member) => ({ value: member.id, label: member.name })),
];

const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const ENRICHMENT_META: Record<PipelineDeal["enrichmentStatus"], { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-amber-400" },
  enriched: { label: "Enriched", dot: "bg-emerald-400" },
  failed: { label: "Failed", dot: "bg-red-400" },
};

const COMPETITOR_META: Record<CompetitorName, { label: string; className: string }> = {
  SpotHopper: {
    label: "SpotHopper",
    className: "bg-orange-500 text-white",
  },
  "Owner.com": {
    label: "Owner.com",
    className: "bg-red-500 text-white",
  },
  Fisherman: {
    label: "Fisherman",
    className: "bg-blue-500 text-white",
  },
  BentoBox: {
    label: "BentoBox",
    className: "bg-green-500 text-white",
  },
  Popmenu: {
    label: "Popmenu",
    className: "bg-purple-500 text-white",
  },
  "DONT KNOW": {
    label: "DONT KNOW",
    className: "bg-slate-500 text-white",
  },
};

const COMPETITOR_FILTER_OPTIONS: { value: CompetitorFilter; label: string }[] = [
  { value: "all", label: "All Competitors" },
  ...Object.values(COMPETITOR_META).map((competitor) => ({
    value: competitor.label as CompetitorFilter,
    label: competitor.label,
  })),
];

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

function normalizeWebsiteUrl(value: string): string {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function formatTimestamp(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const direct = Date.parse(trimmed);
  if (!Number.isNaN(direct)) {
    return new Date(direct).toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZoneName: "short",
    });
  }

  const localMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!localMatch) return value;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = localMatch;
  const localDate = new Date(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw), Number(hourRaw), Number(minuteRaw));
  if (Number.isNaN(localDate.getTime())) return value;

  return localDate.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

function leadDaysInStage(deal: PipelineDeal): number {
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

function isWithinDateRange(value: string, range: DateRangeFilter): boolean {
  if (range === "all") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  if (Number.isNaN(target.getTime())) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deltaMs = today.getTime() - target.getTime();
  if (deltaMs < 0) return false;

  const maxDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return deltaMs <= maxDays * 24 * 60 * 60 * 1000;
}

function getCompetitorMeta(competitor?: string) {
  if (competitor && competitor in COMPETITOR_META) {
    return COMPETITOR_META[competitor as CompetitorName];
  }
  return null;
}

function CompetitorBadge({ competitor }: { competitor?: string }) {
  const meta = getCompetitorMeta(competitor);
  if (!meta) return null;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function PipelinePage() {
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [form, setForm] = useState<DealForm>(EMPTY_FORM);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [competitorFilter, setCompetitorFilter] = useState<CompetitorFilter>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("all");

  const assigneeNames = useMemo(() => {
    return Object.fromEntries(TEAM_MEMBERS.map((member) => [member.id, member.name]));
  }, []);

  const selectedDeal = useMemo(
    () => (selectedDealId ? deals.find((deal) => deal.id === selectedDealId) ?? null : null),
    [deals, selectedDealId],
  );

  const visibleDeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return deals.filter((deal) => {
      const matchesSearch =
        query.length === 0 ||
        [deal.name, deal.client, deal.contact, deal.email].some((value) => value.toLowerCase().includes(query));
      const matchesStage = stageFilter === "all" || deal.stage === stageFilter;
      const matchesAssignee = assigneeFilter === "all" || deal.assignee === assigneeFilter;
      const matchesSource = sourceFilter === "all" || deal.source === sourceFilter;
      const matchesCompetitor = competitorFilter === "all" || deal.competitor === competitorFilter;
      const matchesDateRange = isWithinDateRange(deal.createdAt, dateRangeFilter);

      return matchesSearch && matchesStage && matchesAssignee && matchesSource && matchesCompetitor && matchesDateRange;
    });
  }, [assigneeFilter, competitorFilter, dateRangeFilter, deals, searchQuery, sourceFilter, stageFilter]);

  const stats = useMemo(() => {
    const activeLeads = deals.filter((deal) => !CLOSED_STAGES.includes(deal.stage));
    const newLeads = deals.filter((deal) => deal.stage === "new-lead");
    const wonThisMonthLeads = deals.filter(
      (deal) => deal.stage === "closed-won" && isThisMonth(deal.stageUpdatedAt ?? deal.createdAt),
    );
    const lostThisMonthLeads = deals.filter(
      (deal) => deal.stage === "closed-lost" && isThisMonth(deal.stageUpdatedAt ?? deal.createdAt),
    );
    const wonThisMonthValue = wonThisMonthLeads.reduce((sum, deal) => sum + deal.value, 0);

    return {
      totalLeads: activeLeads.length,
      newThisWeek: newLeads.length,
      wonThisMonthCount: wonThisMonthLeads.length,
      wonThisMonthValue,
      lostThisMonthCount: lostThisMonthLeads.length,
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
      setError("Could not load pipeline leads.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeals();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function openCreatePanel() {
    setPanelMode("create");
    setSelectedDealId(null);
    setForm(EMPTY_FORM);
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
      setError("Lead name and client are required.");
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
      setError("Could not create lead.");
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
      setError("Could not update lead.");
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
      setError("Could not delete lead.");
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
      setError("Could not move lead.");
    }
  }

  async function handleInstantlyImport() {
    try {
      setImporting(true);
      const response = await fetch("/api/instantly/import", { method: "POST" });
      const payload = (await response.json()) as { imported?: number; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Import failed");
      }

      await loadDeals();
      setError(null);
      setToast({
        message: `Imported ${payload.imported ?? 0} new leads from Instantly`,
        tone: "success",
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not import from Instantly.";
      setError(message);
      setToast({ message, tone: "error" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="pointer-events-none fixed right-4 top-4 z-50">
        {toast ? (
          <div
            className={`pointer-events-auto min-w-[280px] rounded-2xl border px-4 py-3 text-sm text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl animate-[toast-in_220ms_ease-out] ${
              toast.tone === "success"
                ? "border-white/20 bg-[linear-gradient(135deg,rgba(108,43,217,0.32),rgba(15,23,42,0.72))]"
                : "border-red-300/25 bg-[linear-gradient(135deg,rgba(185,28,28,0.28),rgba(15,23,42,0.72))]"
            }`}
          >
            {toast.message}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="mt-2 text-sm text-slate-300">Sales pipeline and client acquisition tracking.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleInstantlyImport}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-300/35 bg-[linear-gradient(135deg,rgba(139,92,246,0.28),rgba(91,33,182,0.38))] px-4 py-2 text-sm font-semibold text-fuchsia-50 shadow-[0_12px_34px_rgba(91,33,182,0.28)] transition hover:border-fuchsia-200/60 hover:bg-[linear-gradient(135deg,rgba(168,85,247,0.34),rgba(109,40,217,0.42))] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {importing ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}
            Import from Instantly
          </button>
          <button
            type="button"
            onClick={openCreatePanel}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/30"
          >
            <Plus size={16} />
            Add Lead
          </button>
        </div>
      </div>

      <div className="glass-panel p-3 md:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search leads..."
              className="w-full rounded-2xl border border-white/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.72))] py-3 pl-11 pr-4 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(2,6,23,0.24)] backdrop-blur-xl outline-none transition placeholder:text-slate-500 focus:border-blue-400/55 focus:bg-slate-900/80"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:min-w-[780px] xl:flex-1 xl:grid-cols-5">
            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Stage</span>
              <select
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value as StageFilter)}
                className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                {STAGE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Assignee</span>
              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value as AssigneeFilter)}
                className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                {ASSIGNEE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Source</span>
              <select
                value={sourceFilter}
                onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
                className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                {SOURCE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Competitor</span>
              <select
                value={competitorFilter}
                onChange={(event) => setCompetitorFilter(event.target.value as CompetitorFilter)}
                className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                {COMPETITOR_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Date Range</span>
              <select
                value={dateRangeFilter}
                onChange={(event) => setDateRangeFilter(event.target.value as DateRangeFilter)}
                className="w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                {DATE_RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Total Leads</p>
          <p className="mt-3 text-2xl font-semibold text-blue-100">{stats.totalLeads}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">New This Week</p>
          <p className="mt-3 text-2xl font-semibold text-slate-100">{stats.newThisWeek}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Won This Month</p>
          <p className="mt-3 text-2xl font-semibold text-emerald-300">
            {stats.wonThisMonthCount} <span className="text-base text-emerald-200">({toCurrency(stats.wonThisMonthValue)})</span>
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Lost This Month</p>
          <p className="mt-3 text-2xl font-semibold text-rose-300">{stats.lostThisMonthCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-6 text-sm text-slate-300">Loading pipeline...</div>
      ) : (
        <div className="glass-panel overflow-x-auto p-3 md:p-4">
          <div className="grid min-w-max grid-flow-col auto-cols-[260px] gap-3 pb-2 xl:grid-flow-row xl:grid-cols-8 xl:auto-cols-fr">
            {STAGE_COLUMNS.map((column) => {
              const stageDeals = visibleDeals.filter((deal) => deal.stage === column.stage);

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
                    const dealId = event.dataTransfer.getData("text/pipeline-lead-id");
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
                      {column.title} ({stageDeals.length})
                    </p>
                  </div>

                  <div className="space-y-3">
                    {stageDeals.map((deal) => {
                      const assignee = assigneeNames[deal.assignee] ?? deal.assignee;
                      return (
                        <button
                          key={deal.id}
                          type="button"
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("text/pipeline-lead-id", deal.id)}
                          onClick={() => openDealPanel(deal)}
                          className="glass-card w-full cursor-pointer p-3 text-left transition hover:-translate-y-1"
                          aria-label={`Lead ${deal.name}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold leading-snug text-white">{deal.name}</p>
                            <span
                              title={ENRICHMENT_META[deal.enrichmentStatus].label}
                              className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${ENRICHMENT_META[deal.enrichmentStatus].dot}`}
                            />
                          </div>
                          <p className="mt-1 text-xs text-slate-300">{deal.client}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${SOURCE_META[deal.source].className}`}
                            >
                              {SOURCE_META[deal.source].label}
                            </span>
                            <CompetitorBadge competitor={deal.competitor} />
                          </div>
                          <p className="mt-3 text-xl font-semibold text-blue-100">{toCurrency(deal.value)}</p>
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-semibold text-slate-100">
                              {toInitials(assignee)}
                            </span>
                            <span>{leadDaysInStage(deal)}d in stage</span>
                          </div>
                        </button>
                      );
                    })}
                    {stageDeals.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-white/15 px-3 py-8 text-center text-xs text-slate-400">
                        No leads
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
                  {panelMode === "create" ? "New Lead" : "Lead Details"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {panelMode === "create" ? "Add Pipeline Lead" : selectedDeal?.name ?? "Lead"}
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
              {panelMode === "view" && selectedDeal ? (
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${SOURCE_META[selectedDeal.source].className}`}
                    >
                      {SOURCE_META[selectedDeal.source].label}
                    </span>
                    <CompetitorBadge competitor={selectedDeal.competitor} />
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${ENRICHMENT_META[selectedDeal.enrichmentStatus].dot}`}
                    />
                    <span className="text-xs text-slate-300">{ENRICHMENT_META[selectedDeal.enrichmentStatus].label}</span>
                  </div>
                  {selectedDeal.competitor ? (
                    <p className="mt-2 text-xs text-slate-300">
                      Competitor: <span className="text-slate-100">{selectedDeal.competitor}</span>
                    </p>
                  ) : null}
                  {selectedDeal.email ? (
                    <p className="mt-2 text-xs text-slate-300">
                      Email: <span className="text-slate-100">{selectedDeal.email}</span>
                    </p>
                  ) : null}
                  {selectedDeal.messagedFrom ? (
                    <p className="mt-2 text-xs text-slate-300">
                      Messaged from: <span className="text-blue-100">{selectedDeal.messagedFrom}</span>
                    </p>
                  ) : null}
                  {selectedDeal.website ? (
                    <p className="mt-2 text-xs text-slate-300">
                      Website:{" "}
                      <a
                        href={normalizeWebsiteUrl(selectedDeal.website)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-200 underline decoration-blue-400/50 underline-offset-2 transition hover:text-blue-100"
                      >
                        {selectedDeal.website}
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <label className="block space-y-1.5">
                <span className="text-xs uppercase tracking-[0.11em] text-slate-300">Lead Name</span>
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

              {panelMode === "view" && selectedDeal ? (
                <div className="space-y-3 rounded-xl border border-white/10 bg-slate-900/50 p-3">
                  <p className="text-xs uppercase tracking-[0.11em] text-slate-300">Conversation Timeline</p>
                  {selectedDeal.conversationHistory?.length ? (
                    <div className="space-y-2">
                      {selectedDeal.conversationHistory.map((entry, index) => (
                        <div
                          key={`${selectedDeal.id}-${entry.date}-${index}`}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            entry.direction === "outbound"
                              ? "border-blue-400/25 bg-blue-500/12 text-blue-50"
                              : "border-emerald-400/25 bg-emerald-500/12 text-emerald-50"
                          }`}
                        >
                          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-300">{formatTimestamp(entry.date)}</p>
                          <p className="mt-1 leading-relaxed">{entry.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">No conversation history yet.</p>
                  )}
                </div>
              ) : null}

              {panelMode === "view" && selectedDeal ? (
                <div className="space-y-2 rounded-xl border border-white/10 bg-slate-900/50 p-3">
                  <p className="text-xs uppercase tracking-[0.11em] text-slate-300">Enrichment Data</p>
                  {selectedDeal.enrichmentStatus === "pending" ? (
                    <p className="text-sm text-amber-300">Awaiting research...</p>
                  ) : selectedDeal.enrichmentStatus === "failed" ? (
                    <p className="text-sm text-red-300">Enrichment failed. Retry research.</p>
                  ) : (
                    <div className="space-y-1.5 text-sm text-slate-200">
                      <p>Phone: {selectedDeal.enrichmentData?.phone || "N/A"}</p>
                      <p>Owner Name: {selectedDeal.enrichmentData?.ownerName || "N/A"}</p>
                      <p>Address: {selectedDeal.enrichmentData?.address || "N/A"}</p>
                      <p>Website: {selectedDeal.website || selectedDeal.enrichmentData?.website || "N/A"}</p>
                      <p>
                        Google Rating:{" "}
                        {selectedDeal.enrichmentData?.googleRating !== undefined
                          ? selectedDeal.enrichmentData.googleRating
                          : "N/A"}
                      </p>
                      <p>
                        Review Count:{" "}
                        {selectedDeal.enrichmentData?.reviewCount !== undefined
                          ? selectedDeal.enrichmentData.reviewCount
                          : "N/A"}
                      </p>
                      {selectedDeal.enrichmentData?.cuisine ? <p>Cuisine: {selectedDeal.enrichmentData.cuisine}</p> : null}
                      {selectedDeal.enrichmentData?.notes ? <p>Notes: {selectedDeal.enrichmentData.notes}</p> : null}
                    </div>
                  )}
                </div>
              ) : null}

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
                  {panelMode === "create" ? "Create Lead" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
