"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Circle,
  Clock3,
  FileText,
  FolderKanban,
  LayoutGrid,
  LineChart,
  Plus,
  Users,
} from "lucide-react";

type AgentStatus = "online" | "working" | "idle" | "offline";
type TaskStatus = "todo" | "in-progress" | "blocked" | "done";
type TaskPriority = "high" | "medium" | "low";

type Agent = {
  id: string;
  name: string;
  role: string;
  department: "Executive" | "Marketing" | "Development" | "Fulfillment";
  type: "ceo" | "agent" | "employee";
  model: string | null;
  status: string;
  currentTask: string;
};

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  client: string;
  dueDate: string | null;
};

type Client = {
  id: string;
  name: string;
  status?: string;
};

type ActivityItem = {
  id: string;
  message: string;
  timestamp: string;
  actor: string;
  type: string;
};

type PipelineLead = {
  id: string;
  createdAt: string;
};

type DocumentRecord = {
  id: string;
  title: string;
  category: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  assignee: string;
  type: "deadline" | "milestone" | "meeting" | "task";
  client: string;
};

type DashboardMetric = {
  label: string;
  value: number;
  href: string;
  icon: typeof Users;
};

type QuickAction = {
  label: string;
  href: string;
  icon: typeof Plus;
};

const TIME_ZONE = "America/New_York";

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  high: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  medium: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  low: "border-sky-400/30 bg-sky-500/10 text-sky-100",
};

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-slate-400",
  "in-progress": "bg-[#2093FF]",
  blocked: "bg-rose-400",
  done: "bg-emerald-400",
};

const AGENT_STATUS_STYLES: Record<AgentStatus, { dot: string; badge: string; pulse: boolean }> = {
  online: { dot: "bg-emerald-400", badge: "text-emerald-200", pulse: true },
  working: { dot: "bg-emerald-400", badge: "text-emerald-200", pulse: true },
  idle: { dot: "bg-amber-300", badge: "text-amber-100", pulse: false },
  offline: { dot: "bg-slate-500", badge: "text-slate-300", pulse: false },
};

const CATEGORY_STYLES: Record<string, string> = {
  report: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  "ad-copy": "border-indigo-400/30 bg-indigo-500/10 text-indigo-100",
  proposal: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  "campaign-plan": "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
  analysis: "border-blue-400/30 bg-blue-500/10 text-blue-100",
  other: "border-slate-400/30 bg-slate-500/10 text-slate-100",
};

const EVENT_TYPE_STYLES: Record<CalendarEvent["type"], string> = {
  deadline: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  milestone: "border-blue-400/30 bg-blue-500/10 text-blue-100",
  meeting: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  task: "border-slate-400/30 bg-slate-500/10 text-slate-100",
};

function normalizeAgentStatus(status: string): AgentStatus {
  const normalized = status.toLowerCase();
  if (normalized === "working") return "working";
  if (normalized === "active" || normalized === "online") return "online";
  if (normalized === "idle") return "idle";
  return "offline";
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(date);
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);
}

function formatShortDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TIME_ZONE,
  }).format(parsed);
}

function formatShortDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(parsed);
}

function formatCalendarEvent(event: CalendarEvent) {
  const base = new Date(`${event.date}T${event.time ?? "12:00"}:00`);
  if (Number.isNaN(base.getTime())) return "TBD";

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: TIME_ZONE,
  }).format(base);

  if (!event.time) return datePart;

  return `${datePart} · ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(base)}`;
}

function relativeTimeFromIso(value: string, now: Date): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Unknown";
  const seconds = Math.max(0, Math.floor((now.getTime() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function parseSortableDate(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveAssignee(assignee: string, agents: Agent[]) {
  const normalized = assignee.trim().toLowerCase();
  return agents.find((agent) => agent.id.toLowerCase() === normalized || agent.name.toLowerCase() === normalized) ?? null;
}

function DashboardSectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="section-title">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200 transition hover:text-white">
        View all
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [pipeline, setPipeline] = useState<PipelineLead[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const [agentRes, taskRes, clientRes, activityRes, pipelineRes, documentRes, calendarRes] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/tasks", { cache: "no-store" }),
          fetch("/api/clients", { cache: "no-store" }),
          fetch("/api/activity", { cache: "no-store" }),
          fetch("/api/pipeline", { cache: "no-store" }),
          fetch("/api/documents", { cache: "no-store" }),
          fetch("/api/calendar", { cache: "no-store" }),
        ]);

        if (!agentRes.ok || !taskRes.ok || !clientRes.ok || !activityRes.ok || !pipelineRes.ok || !documentRes.ok || !calendarRes.ok) {
          return;
        }

        const [agentData, taskData, clientData, activityData, pipelineData, documentData, calendarData] = await Promise.all([
          agentRes.json() as Promise<Agent[]>,
          taskRes.json() as Promise<Task[]>,
          clientRes.json() as Promise<Client[]>,
          activityRes.json() as Promise<ActivityItem[]>,
          pipelineRes.json() as Promise<PipelineLead[]>,
          documentRes.json() as Promise<DocumentRecord[]>,
          calendarRes.json() as Promise<CalendarEvent[]>,
        ]);

        if (!mounted) return;

        setAgents(Array.isArray(agentData) ? agentData : []);
        setTasks(Array.isArray(taskData) ? taskData : []);
        setClients(Array.isArray(clientData) ? clientData : []);
        setActivity(
          Array.isArray(activityData)
            ? activityData
                .filter((item) => typeof item?.id === "string" && typeof item?.message === "string")
                .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
            : [],
        );
        setPipeline(Array.isArray(pipelineData) ? pipelineData : []);
        setDocuments(Array.isArray(documentData) ? documentData : []);
        setCalendarEvents(Array.isArray(calendarData) ? calendarData : []);
      } catch {
        // Keep the last successful dashboard snapshot during transient failures.
      }
    };

    loadDashboard();
    const interval = window.setInterval(loadDashboard, 5000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const activeClientCount = useMemo(() => {
    if (clients.length === 0) return 0;
    return clients.filter((client) => (client.status ?? "active").toLowerCase() === "active").length;
  }, [clients]);

  const openTaskCount = useMemo(() => tasks.filter((task) => task.status !== "done").length, [tasks]);

  const metrics = useMemo<DashboardMetric[]>(
    () => [
      { label: "Total Active Clients", value: activeClientCount, href: "/clients", icon: BriefcaseBusiness },
      { label: "Open Tasks", value: openTaskCount, href: "/tasks", icon: FolderKanban },
      { label: "Pipeline Leads", value: pipeline.length, href: "/pipeline", icon: LineChart },
      { label: "Active Documents", value: documents.length, href: "/documents", icon: FileText },
    ],
    [activeClientCount, documents.length, openTaskCount, pipeline.length],
  );

  const featuredAgents = useMemo(() => {
    const preferredOrder = ["kimberly", "alex", "sabri", "kevin"];
    const ordered = preferredOrder
      .map((id) => agents.find((agent) => agent.id === id))
      .filter((agent): agent is Agent => Boolean(agent));

    if (ordered.length >= 4) return ordered.slice(0, 4);

    const remaining = agents.filter((agent) => agent.type !== "ceo" && !preferredOrder.includes(agent.id));
    return [...ordered, ...remaining].slice(0, 4);
  }, [agents]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => parseSortableDate(a.dueDate) - parseSortableDate(b.dueDate))
      .slice(0, 5);
  }, [tasks]);

  const recentDocuments = useMemo(() => {
    return [...documents]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 3);
  }, [documents]);

  const recentActivity = useMemo(() => activity.slice(0, 5), [activity]);

  const upcomingEvents = useMemo(() => {
    const currentDate = new Date(now.toLocaleString("en-US", { timeZone: TIME_ZONE }));

    return [...calendarEvents]
      .filter((event) => {
        const eventDate = new Date(`${event.date}T${event.time ?? "23:59"}:00`);
        return !Number.isNaN(eventDate.getTime()) && eventDate.getTime() >= currentDate.getTime() - 60_000;
      })
      .sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.time ?? "23:59"}:00`).getTime();
        const bTime = new Date(`${b.date}T${b.time ?? "23:59"}:00`).getTime();
        return aTime - bTime;
      })
      .slice(0, 3);
  }, [calendarEvents, now]);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      { label: "New Task", href: "/tasks", icon: Plus },
      { label: "New Document", href: "/documents", icon: FileText },
      { label: "View Pipeline", href: "/pipeline", icon: LineChart },
      { label: "View Finance", href: "/finance", icon: LayoutGrid },
    ],
    [],
  );

  return (
    <div className="space-y-6 pb-4 sm:space-y-8" style={{ backgroundColor: "#0a0a0f" }}>
      <section className="glass-panel animate-enter relative overflow-hidden p-5 sm:p-6" style={{ animationDelay: "40ms" }}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#2093FF] via-[#58B8FF] to-[#0026FF]" />
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#2093FF]/12 blur-3xl" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-300">
              <Clock3 className="h-3.5 w-3.5 text-sky-200" />
              Eastern Command Center
            </div>
            <div>
              <h1 className="page-title bg-gradient-to-r from-white via-[#9FD2FF] to-[#2093FF] bg-clip-text text-transparent">Welcome back, Jahan</h1>
              <p className="mt-2 text-sm text-slate-300">{formatDateLabel(now)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-card min-w-[180px] rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Current Time</p>
              <p className="mt-2 heading-font text-3xl font-normal uppercase tracking-[0.03em] text-white">{formatClock(now)}</p>
            </div>
            <div className="glass-card min-w-[180px] rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Live Status</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                <p className="text-sm font-medium text-white">Systems synced and monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="animate-enter" style={{ animationDelay: "90ms" }}>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;

            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="glass-card animate-enter relative overflow-hidden rounded-2xl p-4 sm:p-5"
                style={{ animationDelay: `${120 + index * 40}ms` }}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#2093FF]/0 via-[#2093FF] to-[#0026FF]/0" />
                <div className="flex items-start justify-between gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2.5">
                    <Icon className="h-5 w-5 text-sky-200" />
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                    <ArrowUpRight className="h-3.5 w-3.5 text-sky-300" />
                    Stable
                  </div>
                </div>
                <p className="mt-5 text-3xl font-semibold text-white sm:text-4xl">{metric.value}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400 sm:text-sm">{metric.label}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <article className="glass-panel animate-enter rounded-2xl p-4 sm:p-5" style={{ animationDelay: "180ms" }}>
            <DashboardSectionHeader title="Agent Status Grid" href="/agents" />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {featuredAgents.map((agent, index) => {
                const status = normalizeAgentStatus(agent.status);
                const statusStyle = AGENT_STATUS_STYLES[status];

                return (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="glass-card animate-enter rounded-2xl p-4"
                    style={{ animationDelay: `${220 + index * 35}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${statusStyle.dot} ${statusStyle.pulse ? "animate-pulse" : ""}`} />
                          <p className="truncate text-base font-semibold text-white">{agent.name}</p>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-400">{agent.role}</p>
                      </div>
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${statusStyle.badge}`}>{status}</span>
                    </div>
                    <div className="mt-4 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Current Task</p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-200">{agent.currentTask || "Standing by for assignment"}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </article>

          <article className="glass-panel animate-enter rounded-2xl p-4 sm:p-5" style={{ animationDelay: "220ms" }}>
            <DashboardSectionHeader title="Recent Tasks" href="/tasks" />
            <div className="mt-4 space-y-2">
              {recentTasks.length > 0 ? (
                recentTasks.map((task, index) => {
                  const assignee = resolveAssignee(task.assignee, agents);

                  return (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className="glass-card animate-enter flex flex-col gap-3 rounded-2xl px-4 py-3 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
                      style={{ animationDelay: `${260 + index * 30}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${TASK_STATUS_STYLES[task.status]}`} />
                          <p className="truncate text-sm font-semibold text-white">{task.title}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{assignee?.name ?? task.assignee} · {task.client}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className={`rounded-full border px-2 py-1 font-semibold uppercase tracking-[0.12em] ${PRIORITY_STYLES[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 uppercase tracking-[0.12em] text-slate-300">
                          {task.dueDate ? formatShortDate(task.dueDate) : "No due"}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="glass-card rounded-2xl px-4 py-5 text-sm text-slate-400">No recent tasks yet.</div>
              )}
            </div>
          </article>

          <article className="glass-panel animate-enter rounded-2xl p-4 sm:p-5" style={{ animationDelay: "260ms" }}>
            <DashboardSectionHeader title="Recent Documents" href="/documents" />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {recentDocuments.length > 0 ? (
                recentDocuments.map((document, index) => (
                  <Link
                    key={document.id}
                    href="/documents"
                    className="glass-card animate-enter rounded-2xl p-4"
                    style={{ animationDelay: `${300 + index * 35}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-semibold text-white">{document.title}</p>
                      <FileText className="h-4 w-4 shrink-0 text-sky-200" />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                      <span className={`rounded-full border px-2 py-1 ${CATEGORY_STYLES[document.category] ?? CATEGORY_STYLES.other}`}>
                        {titleCase(document.category)}
                      </span>
                      <span className="text-slate-500">{formatShortDateTime(document.updatedAt)}</span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">By {titleCase(document.createdBy)}</p>
                  </Link>
                ))
              ) : (
                <div className="glass-card rounded-2xl px-4 py-5 text-sm text-slate-400 md:col-span-3">No documents available.</div>
              )}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <article className="glass-panel animate-enter rounded-2xl p-4 sm:p-5" style={{ animationDelay: "200ms" }}>
            <DashboardSectionHeader title="Quick Actions" href="/office" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.map((action, index) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="glass-card animate-enter flex items-center justify-between rounded-2xl px-4 py-3"
                    style={{ animationDelay: `${230 + index * 30}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                        <Icon className="h-4 w-4 text-sky-200" />
                      </div>
                      <span className="text-sm font-medium text-white">{action.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                );
              })}
            </div>
          </article>

          <article className="glass-panel animate-enter rounded-2xl p-4 sm:p-5" style={{ animationDelay: "240ms" }}>
            <DashboardSectionHeader title="Activity Timeline" href="/team" />
            <div className="mt-4 space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((item, index) => (
                  <div key={item.id} className="relative pl-6">
                    <span className="absolute left-0 top-1.5 flex h-3 w-3 items-center justify-center rounded-full border border-[#2093FF]/40 bg-[#0a0a0f]">
                      <Circle className="h-1.5 w-1.5 fill-[#2093FF] text-[#2093FF]" />
                    </span>
                    {index < recentActivity.length - 1 ? <span className="absolute left-[5px] top-4 h-[calc(100%+10px)] w-px bg-gradient-to-b from-[#2093FF]/50 to-[#0026FF]/10" /> : null}
                    <p className="text-sm text-slate-200">{item.message}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">{relativeTimeFromIso(item.timestamp, now)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No recent activity yet.</p>
              )}
            </div>
          </article>

          <article className="glass-panel animate-enter rounded-2xl p-4 sm:p-5" style={{ animationDelay: "280ms" }}>
            <DashboardSectionHeader title="Calendar Preview" href="/calendar" />
            <div className="mt-4 space-y-3">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, index) => (
                  <Link
                    key={event.id}
                    href="/calendar"
                    className="glass-card animate-enter flex items-start justify-between gap-3 rounded-2xl px-4 py-3"
                    style={{ animationDelay: `${320 + index * 35}ms` }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-sky-200" />
                        <p className="truncate text-sm font-semibold text-white">{event.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{event.client}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">{formatCalendarEvent(event)}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${EVENT_TYPE_STYLES[event.type]}`}>
                      {event.type}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="glass-card rounded-2xl px-4 py-5 text-sm text-slate-400">No upcoming events.</div>
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
