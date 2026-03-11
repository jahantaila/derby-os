"use client";

import Link from "next/link";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Flame,
  MapPinned,
  PhoneCall,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  buildMorningSummary,
  diffEasternDays,
  EASTERN_TIME_ZONE,
  getPrimaryName,
  HOT_LEAD_STAGES,
  type CampaignStat,
  type MorningSummary,
  STAGE_META,
} from "@/lib/pipeline-dashboard";
import { type PipelineActivityEntry } from "@/lib/pipeline-activity";
import { type PipelineDeal, type PipelineStage } from "@/lib/pipeline-types";

type StatTrend = {
  value: number;
  direction: "up" | "down" | "neutral";
  label: string;
};

type DashboardData = {
  pipeline: PipelineDeal[];
  summary: MorningSummary;
  activity: PipelineActivityEntry[];
};

type PriorityItem = {
  id: string;
  href: string;
  icon: typeof Flame;
  eyebrow: string;
  title: string;
  detail: string;
  tone: string;
  priority: number;
};

type GeographyMode = "city" | "state";

const REFRESH_INTERVAL_MS = 30000;

function formatDate(value: string | null) {
  if (!value) return "--";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00.000Z`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: EASTERN_TIME_ZONE,
  }).format(parsed);
}

function formatRelativeFromNow(value: string, now: number) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "Unknown";
  const seconds = Math.max(0, Math.floor((now - parsed) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function buildTrend(value: number, labelUp: string, labelDown: string, labelNeutral: string): StatTrend {
  if (value > 0) return { value, direction: "up", label: labelUp };
  if (value < 0) return { value, direction: "down", label: labelDown };
  return { value, direction: "neutral", label: labelNeutral };
}

function getYesterdayCount(deals: PipelineDeal[]) {
  return deals.filter((deal) => diffEasternDays(deal.createdAt) === 1).length;
}

function getPreviousWeekCount(deals: PipelineDeal[]) {
  return deals.filter((deal) => {
    const age = diffEasternDays(deal.createdAt);
    return age >= 7 && age < 14;
  }).length;
}

function getOldestStageDate(deal: PipelineDeal) {
  return deal.stageUpdatedAt || deal.createdAt;
}

function buildPriorityItems(deals: PipelineDeal[], summary: MorningSummary): PriorityItem[] {
  const freshInterested = deals
    .filter((deal) => HOT_LEAD_STAGES.includes(deal.stage))
    .filter((deal) => diffEasternDays(deal.createdAt) <= 1)
    .slice(0, 3)
    .map((deal) => ({
      id: `fresh-${deal.id}`,
      href: `/pipeline?view=contacts&contact=${deal.id}`,
      icon: Flame,
      eyebrow: "New Interested Leads",
      title: `${getPrimaryName(deal)} at ${deal.client}`,
      detail: "New lead came in within the last 24 hours. Review, qualify, and assign next action.",
      tone: "border-emerald-400/30 bg-emerald-500/12 text-emerald-100",
      priority: 100 - diffEasternDays(deal.createdAt),
    }));

  const followUps = summary.needsFollowUp.slice(0, 3).map((lead) => ({
    id: `follow-up-${lead.id}`,
    href: `/pipeline?view=contacts&contact=${lead.id}`,
    icon: PhoneCall,
    eyebrow: "Overdue Follow-Ups",
    title: `Call ${lead.name} at ${lead.company}`,
    detail: `Contacted ${lead.ageDays} days ago with no stage change. Follow up now.`,
    tone: "border-amber-400/30 bg-amber-500/12 text-amber-100",
    priority: 90 - lead.ageDays,
  }));

  const staleLeads = deals
    .filter((deal) => deal.stage === "new-lead" && diffEasternDays(deal.createdAt) >= 7)
    .sort((left, right) => diffEasternDays(right.createdAt) - diffEasternDays(left.createdAt))
    .slice(0, 2)
    .map((deal) => ({
      id: `stale-${deal.id}`,
      href: `/pipeline?view=contacts&contact=${deal.id}`,
      icon: BriefcaseBusiness,
      eyebrow: "Stale Leads",
      title: `${getPrimaryName(deal)} at ${deal.client}`,
      detail: `Sitting in New Lead for ${diffEasternDays(deal.createdAt)} days. Needs first touch.`,
      tone: "border-sky-400/30 bg-sky-500/12 text-sky-100",
      priority: 70 - diffEasternDays(deal.createdAt),
    }));

  const closeOpportunities = deals
    .filter((deal) => deal.stage === "scheduled-meeting" || deal.stage === "negotiating")
    .sort((left, right) => getOldestStageDate(left).localeCompare(getOldestStageDate(right)))
    .slice(0, 3)
    .map((deal) => ({
      id: `close-${deal.id}`,
      href: `/pipeline?view=contacts&contact=${deal.id}`,
      icon: CalendarClock,
      eyebrow: "Close Opportunities",
      title: `${getPrimaryName(deal)} at ${deal.client}`,
      detail:
        deal.stage === "scheduled-meeting"
          ? "Meeting is on deck. Prep notes, objections, and offer before the call."
          : "Active negotiation. Tighten next step and push toward close.",
      tone: "border-blue-400/30 bg-blue-500/12 text-blue-100",
      priority: deal.stage === "negotiating" ? 95 : 85,
    }));

  return [...freshInterested, ...followUps, ...staleLeads, ...closeOpportunities]
    .sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title))
    .slice(0, 10);
}

function buildGeographyRows(deals: PipelineDeal[], mode: GeographyMode) {
  const counts = new Map<string, number>();
  deals.forEach((deal) => {
    const key = mode === "city" ? deal.city?.trim() : deal.state?.trim();
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 10);
}

function activityIcon(type: PipelineActivityEntry["type"]) {
  if (type === "new-lead") return "+";
  if (type === "stage-change") return "→";
  return "🔍";
}

function trendIcon(direction: StatTrend["direction"]) {
  if (direction === "up") return TrendingUp;
  if (direction === "down") return TrendingDown;
  return ArrowRight;
}

function trendClass(direction: StatTrend["direction"]) {
  if (direction === "up") return "text-emerald-300";
  if (direction === "down") return "text-rose-300";
  return "text-slate-300";
}

function campaignStatusClass(status: CampaignStat["status"]) {
  if (status === "active") return "border-emerald-400/30 bg-emerald-500/12 text-emerald-100";
  if (status === "cooling") return "border-amber-400/30 bg-amber-500/12 text-amber-100";
  return "border-slate-400/30 bg-slate-500/12 text-slate-200";
}

function sectionTitle(icon: ComponentType<{ className?: string }>, label: string) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-blue-200" />
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</h2>
    </div>
  );
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [pipelineRes, summaryRes, activityRes] = await Promise.all([
    fetch("/api/pipeline", { cache: "no-store" }),
    fetch("/api/pipeline/morning-summary", { cache: "no-store" }),
    fetch("/api/pipeline/activity", { cache: "no-store" }),
  ]);

  if (!pipelineRes.ok || !summaryRes.ok || !activityRes.ok) {
    throw new Error("Unable to load pipeline command center.");
  }

  const [pipeline, summary, activity] = await Promise.all([
    pipelineRes.json() as Promise<PipelineDeal[]>,
    summaryRes.json() as Promise<MorningSummary>,
    activityRes.json() as Promise<PipelineActivityEntry[]>,
  ]);

  return {
    pipeline: Array.isArray(pipeline) ? pipeline : [],
    summary: summary ?? buildMorningSummary([]),
    activity: Array.isArray(activity) ? activity : [],
  };
}

export default function HomePage() {
  const [pipeline, setPipeline] = useState<PipelineDeal[]>([]);
  const [summary, setSummary] = useState<MorningSummary>(() => buildMorningSummary([]));
  const [activity, setActivity] = useState<PipelineActivityEntry[]>([]);
  const [geographyMode, setGeographyMode] = useState<GeographyMode>("city");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadDashboard(isManual = false) {
    setError("");
    if (isManual || !loading) setRefreshing(true);

    try {
      const data = await fetchDashboardData();
      setPipeline(data.pipeline);
      setSummary(data.summary);
      setActivity(data.activity);
      setLastUpdatedAt(Date.now());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => {
      void loadDashboard();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const newTodayTrend = buildTrend(
      summary.newToday - getYesterdayCount(pipeline),
      "Ahead of yesterday",
      "Behind yesterday",
      "Flat vs yesterday",
    );
    const totalTrend = buildTrend(
      summary.newThisWeek - getPreviousWeekCount(pipeline),
      "Lead volume is up vs last week",
      "Lead volume is down vs last week",
      "Flat vs last week",
    );
    const followUpTrend = buildTrend(
      0 - summary.needsFollowUp.length,
      "Follow-ups cleared",
      "Backlog needs attention",
      "No change in follow-up load",
    );
    const hotLeadTrend = buildTrend(
      summary.hotLeads.length - pipeline.filter((deal) => HOT_LEAD_STAGES.includes(deal.stage) && diffEasternDays(getOldestStageDate(deal)) >= 7).length,
      "More late-stage momentum",
      "Late-stage pipeline cooled off",
      "Steady late-stage pipeline",
    );

    return [
      { label: "Total Leads", value: pipeline.length, trend: totalTrend },
      { label: "New Today", value: summary.newToday, trend: newTodayTrend },
      { label: "Needs Follow-Up", value: summary.needsFollowUp.length, trend: followUpTrend },
      { label: "Hot Leads", value: summary.hotLeads.length, trend: hotLeadTrend },
    ];
  }, [pipeline, summary]);

  const priorityItems = useMemo(() => buildPriorityItems(pipeline, summary), [pipeline, summary]);
  const geographyRows = useMemo(() => buildGeographyRows(pipeline, geographyMode), [pipeline, geographyMode]);
  const geographyMax = Math.max(...geographyRows.map((row) => row.count), 1);
  const funnelMax = Math.max(...summary.funnelData.map((item) => item.count), 1);

  if (loading) {
    return <section className="glass-panel rounded-[28px] p-6 text-sm text-slate-300">Loading pipeline command center...</section>;
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel page-header relative overflow-hidden rounded-[28px] p-6 sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(32,147,255,0.18),transparent_35%),linear-gradient(140deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200/80">Pipeline Command Center</p>
            <h1 className="page-title mt-3">Good morning, Jahan</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-300">
              Live pipeline visibility, follow-up pressure, campaign performance, and geographic lead flow in one command
              surface.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="glass-card rounded-2xl px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Last Updated</p>
              <p className="mt-1 text-sm text-white">{lastUpdatedAt ? `${Math.floor((now - lastUpdatedAt) / 1000)}s ago` : "Just now"}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
        {error ? <p className="relative mt-4 text-sm text-rose-200">{error}</p> : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {stats.map((card, index) => {
          const TrendIcon = trendIcon(card.trend.direction);
          return (
            <article
              key={card.label}
              className="glass-card animate-enter relative overflow-hidden rounded-[24px] p-5"
              style={{ animationDelay: `${80 + index * 60}ms` }}
            >
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#2093FF] via-[#58B8FF] to-[#0026FF]" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
              <p className="mt-4 text-3xl font-bold text-white">{card.value.toLocaleString()}</p>
              <div className={`mt-4 inline-flex items-center gap-2 text-xs ${trendClass(card.trend.direction)}`}>
                <TrendIcon className="h-3.5 w-3.5" />
                <span>{card.trend.label}</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <article className="glass-panel rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            {sectionTitle(Sparkles, "Today's Priority Actions")}
            <Link href="/pipeline" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200 transition hover:text-white">
              View All in Pipeline
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="mt-4 text-lg font-semibold text-white">Good morning, Jahan. Here&apos;s what needs attention today:</p>
          <div className="mt-5 space-y-3">
            {priorityItems.length ? (
              priorityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`glass-card flex items-start gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5 ${item.tone}`}
                  >
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">{item.eyebrow}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-300">{item.detail}</p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="glass-card rounded-2xl px-4 py-5 text-sm text-slate-300">No urgent actions right now.</div>
            )}
          </div>
        </article>

        <article className="glass-panel rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            {sectionTitle(RefreshCw, "Live Activity Feed")}
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Auto-refresh every 30s</p>
          </div>
          <div className="mt-5 space-y-3">
            {activity.length ? (
              activity.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/pipeline?view=contacts&contact=${entry.leadId}`}
                  className="glass-card flex items-start gap-3 rounded-2xl px-4 py-3 transition hover:-translate-y-0.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-blue-300/25 bg-[linear-gradient(135deg,rgba(32,147,255,0.18),rgba(0,38,255,0.18))] text-sm text-white">
                    {activityIcon(entry.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white">{entry.message}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{formatRelativeFromNow(entry.timestamp, now)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="glass-card rounded-2xl px-4 py-5 text-sm text-slate-300">No recent pipeline activity.</div>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="glass-panel rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            {sectionTitle(TrendingUp, "Pipeline Funnel")}
            <Link href="/pipeline?view=kanban" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200 transition hover:text-white">
              Open Pipeline
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {summary.funnelData.map((stage) => (
              <Link
                key={stage.stage}
                href={`/pipeline?view=segments&stage=${stage.stage}`}
                className="glass-card block rounded-2xl p-4 transition hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STAGE_META[stage.stage].color }} />
                    <div>
                      <p className="text-sm font-semibold text-white">{STAGE_META[stage.stage].label}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                        {stage.count} leads{stage.stage !== "closed-won" ? ` · ${stage.conversionRate}% to next stage` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-white">{stage.count}</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/6">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.max((stage.count / funnelMax) * 100, stage.count ? 10 : 0)}%`,
                      backgroundColor: STAGE_META[stage.stage].color,
                    }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="glass-panel rounded-[24px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            {sectionTitle(MapPinned, "Geographic Breakdown")}
            <div className="glass-card inline-flex rounded-full p-1">
              <button
                type="button"
                onClick={() => setGeographyMode("city")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${geographyMode === "city" ? "bg-[linear-gradient(135deg,#2093FF,#0026FF)] text-white" : "text-slate-300"}`}
              >
                View by City
              </button>
              <button
                type="button"
                onClick={() => setGeographyMode("state")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${geographyMode === "state" ? "bg-[linear-gradient(135deg,rgba(32,147,255,0.22),rgba(0,38,255,0.18))] text-white" : "text-slate-300"}`}
              >
                View by State
              </button>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {geographyRows.length ? (
              geographyRows.map((row) => (
                <Link
                  key={row.label}
                  href={geographyMode === "city" ? `/pipeline?view=segments&city=${encodeURIComponent(row.label)}` : `/pipeline?view=segments&state=${encodeURIComponent(row.label)}`}
                  className="glass-card block rounded-2xl px-4 py-3 transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{row.label}</p>
                    <p className="text-sm text-slate-300">{row.count}</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/6">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(90deg,#2093FF,#58B8FF,#0026FF)]"
                      style={{ width: `${(row.count / geographyMax) * 100}%` }}
                    />
                  </div>
                </Link>
              ))
            ) : (
              <div className="glass-card rounded-2xl px-4 py-5 text-sm text-slate-300">No geography data available yet.</div>
            )}
          </div>
        </article>
      </section>

      <section className="glass-panel rounded-[24px] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          {sectionTitle(Building2, "Campaign Performance")}
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sorted by most recent activity</p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-slate-400">
                <th className="px-3 py-3">Campaign Name</th>
                <th className="px-3 py-3">Total Leads</th>
                <th className="px-3 py-3">Interested</th>
                <th className="px-3 py-3">Reply Rate</th>
                <th className="px-3 py-3">Last Import</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.campaignStats.length ? (
                summary.campaignStats.map((campaign) => (
                  <tr key={campaign.campaign} className="border-b border-white/6 last:border-none">
                    <td className="px-3 py-4 text-white">{campaign.campaign}</td>
                    <td className="px-3 py-4 text-slate-200">{campaign.total}</td>
                    <td className="px-3 py-4 text-slate-200">{campaign.interested}</td>
                    <td className="px-3 py-4 text-slate-200">{campaign.replyRate}%</td>
                    <td className="px-3 py-4 text-slate-300">{formatDate(campaign.lastImport)}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${campaignStatusClass(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-slate-300">
                    No campaign data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
