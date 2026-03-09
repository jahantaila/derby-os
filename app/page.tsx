"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AgentStatus = "online" | "working" | "idle" | "offline";

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

type TaskStatus = "todo" | "in-progress" | "blocked" | "done";
type TaskPriority = "high" | "medium" | "low";

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
  services?: string[];
  status?: string;
};

type Workload = {
  agent: Agent;
  status: AgentStatus;
  activeTasks: number;
  currentTask: string;
  completionRate: number;
};

type ActivityItem = {
  id: string;
  message: string;
  timestamp: string;
  actor: string;
  type: string;
};

const AGENT_DEPARTMENTS: Array<Agent["department"]> = ["Executive", "Marketing", "Development"];
const EMPLOYEE_DEPARTMENTS: Array<Agent["department"]> = ["Development", "Fulfillment"];

const DEPT_STYLES: Record<Agent["department"], { avatar: string; ring: string }> = {
  Executive: { avatar: "from-sky-500/70 to-blue-700/90", ring: "ring-sky-400/40" },
  Marketing: { avatar: "from-emerald-500/70 to-green-700/90", ring: "ring-emerald-400/40" },
  Development: { avatar: "from-violet-500/70 to-purple-700/90", ring: "ring-violet-400/40" },
  Fulfillment: { avatar: "from-amber-500/70 to-orange-700/90", ring: "ring-orange-400/40" },
};

const STATUS_STYLES: Record<AgentStatus, string> = {
  online: "text-sky-300 bg-sky-500/10 border border-sky-400/25",
  working: "text-emerald-300 bg-emerald-500/10 border border-emerald-400/25",
  idle: "text-slate-300 bg-slate-500/10 border border-slate-400/25",
  offline: "text-rose-300 bg-rose-500/10 border border-rose-400/25",
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: "bg-rose-400",
  medium: "bg-amber-300",
  low: "bg-sky-400",
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  todo: "text-slate-300 border-slate-500/40 bg-slate-700/20",
  "in-progress": "text-sky-300 border-sky-500/40 bg-sky-700/20",
  blocked: "text-rose-300 border-rose-500/40 bg-rose-700/20",
  done: "text-emerald-300 border-emerald-500/40 bg-emerald-700/20",
};

const clientFallback = [
  { id: "c1", name: "Bluegrass Garage Door", services: ["Google Ads setup"], status: "active" },
  { id: "c2", name: "Palma Italian Kitchen", services: ["Meta Ads"], status: "active" },
  { id: "c3", name: "OlympusLou", services: ["Meta Ads"], status: "active" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function normalizeAgentStatus(status: string): AgentStatus {
  const normalized = status.toLowerCase();
  if (normalized === "working") return "working";
  if (normalized === "active" || normalized === "online") return "online";
  if (normalized === "idle") return "idle";
  return "offline";
}

function formatStatus(status: AgentStatus) {
  if (status === "online") return "Online";
  if (status === "working") return "Working";
  if (status === "idle") return "Idle";
  return "Offline";
}

function formatDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTimeFromIso(value: string, now: Date): string {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "unknown";
  const seconds = Math.max(0, Math.floor((now.getTime() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function parseDueDate(value: string | null): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function dueDateLabel(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function resolveAssignee(assignee: string, agents: Agent[]) {
  const normalized = assignee.trim().toLowerCase();
  return agents.find((agent) => agent.id.toLowerCase() === normalized || agent.name.toLowerCase() === normalized) ?? null;
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        const [agentRes, taskRes, clientRes, activityRes] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/tasks", { cache: "no-store" }),
          fetch("/api/clients", { cache: "no-store" }),
          fetch("/api/activity", { cache: "no-store" }),
        ]);

        if (!agentRes.ok || !taskRes.ok || !clientRes.ok || !activityRes.ok) return;

        const [agentData, taskData, clientData, activityData] = await Promise.all([
          agentRes.json() as Promise<Agent[]>,
          taskRes.json() as Promise<Task[]>,
          clientRes.json() as Promise<Client[]>,
          activityRes.json() as Promise<ActivityItem[]>,
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
      } catch {
        // Keep last known dashboard state on transient fetch failures.
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

  const workloads = useMemo<Workload[]>(() => {
    return agents.map((agent) => {
      const assignedTasks = tasks.filter((task) => {
        const assignee = task.assignee.trim().toLowerCase();
        return assignee === agent.id.toLowerCase() || assignee === agent.name.toLowerCase();
      });

      const activeTasks = assignedTasks.filter((task) => task.status !== "done").length;
      const doneTasks = assignedTasks.filter((task) => task.status === "done").length;
      const completionRate = assignedTasks.length === 0 ? 0 : Math.round((doneTasks / assignedTasks.length) * 100);
      const status = normalizeAgentStatus(agent.status);
      const activeWorkingTask = assignedTasks.find((task) => task.status === "in-progress")?.title;

      return {
        agent,
        status,
        activeTasks,
        currentTask: agent.currentTask || activeWorkingTask || "",
        completionRate,
      };
    });
  }, [agents, tasks]);

  const ceoWorkload = useMemo(() => {
    return workloads.find((entry) => entry.agent.type === "ceo") ?? null;
  }, [workloads]);

  const groupedAgentWorkload = useMemo(() => {
    return AGENT_DEPARTMENTS.map((department) => ({
      department,
      members: workloads.filter((entry) => entry.agent.type === "agent" && entry.agent.department === department),
    })).filter((group) => group.members.length > 0);
  }, [workloads]);

  const groupedEmployeeWorkload = useMemo(() => {
    return EMPLOYEE_DEPARTMENTS.map((department) => ({
      department,
      members: workloads.filter((entry) => entry.agent.type === "employee" && entry.agent.department === department),
    })).filter((group) => group.members.length > 0);
  }, [workloads]);

  const taskStats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((task) => task.status === "in-progress").length;
    const blocked = tasks.filter((task) => task.status === "blocked").length;
    const done = tasks.filter((task) => task.status === "done").length;
    return { total, inProgress, blocked, done };
  }, [tasks]);

  const activeTasks = useMemo(() => {
    return tasks
      .filter((task) => task.status === "in-progress" || task.status === "blocked")
      .sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return parseDueDate(a.dueDate) - parseDueDate(b.dueDate);
      });
  }, [tasks]);

  const activeClients = useMemo(() => {
    const source = clients.length > 0 ? clients : clientFallback;
    return source.filter((client) => (client.status ?? "active").toLowerCase() === "active").slice(0, 3);
  }, [clients]);

  return (
    <div className="space-y-8 pb-4">
      <section className="glass-panel animate-enter p-5 sm:p-6" style={{ animationDelay: "40ms" }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="page-title">Welcome back, Jahan</h1>
            <p className="mt-2 text-sm text-slate-300">{formatDateTime(now)}</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { label: "New Task", href: "/tasks" },
              { label: "New Client", href: "/clients" },
              { label: "View Reports", href: "/revenue" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-xl border border-sky-400/30 bg-gradient-to-r from-[#2093ff]/30 to-[#0026ff]/30 px-4 py-2 text-center text-sm font-semibold text-white transition hover:border-sky-300/60 hover:shadow-[0_0_18px_rgba(32,147,255,0.35)]"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {ceoWorkload ? (
        <section className="animate-enter space-y-4" style={{ animationDelay: "100ms" }}>
          <h2 className="section-title">CEO</h2>
          <article className="glass-card card-accent-ceo animate-enter rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${DEPT_STYLES[ceoWorkload.agent.department].avatar} text-sm font-bold text-white ring-2 ${DEPT_STYLES[ceoWorkload.agent.department].ring}`}
                >
                  {getInitials(ceoWorkload.agent.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-white">{ceoWorkload.agent.name}</p>
                  <p className="truncate text-sm text-slate-300">{ceoWorkload.agent.role}</p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[ceoWorkload.status]}`}>
                {formatStatus(ceoWorkload.status)}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-300">{ceoWorkload.currentTask || "No current task"}</p>
          </article>
        </section>
      ) : null}

      <section className="animate-enter space-y-4" style={{ animationDelay: "120ms" }}>
        <h2 className="section-title">Agent Workload</h2>
        <div className="space-y-5">
          {groupedAgentWorkload.map((group) => (
            <div key={group.department} className="space-y-3">
              <p className="department-header">{group.department}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {group.members.map(({ agent, activeTasks, currentTask, completionRate, status }) => (
                  <article key={agent.id} className="glass-card card-accent-agent animate-enter rounded-2xl p-4" style={{ animationDelay: "140ms" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${DEPT_STYLES[agent.department].avatar} text-sm font-bold text-white ring-2 ${DEPT_STYLES[agent.department].ring}`}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{agent.name}</p>
                          <p className="truncate text-xs text-slate-400">{agent.role}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[status]}`}>{formatStatus(status)}</span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Active Tasks</span>
                        <span className="font-semibold text-white">{activeTasks}</span>
                      </div>
                      <p className="truncate text-xs text-slate-400">{currentTask || "No current task"}</p>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#2093FF] to-[#0026FF] transition-all duration-700"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">{completionRate}% completed</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="animate-enter space-y-4" style={{ animationDelay: "140ms" }}>
        <h2 className="section-title">Employees</h2>
        <div className="space-y-5">
          {groupedEmployeeWorkload.map((group) => (
            <div key={group.department} className="space-y-3">
              <p className="department-header">{group.department}</p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.members.map(({ agent, activeTasks, currentTask, status }) => (
                  <article key={agent.id} className="glass-card card-accent-employee animate-enter rounded-2xl p-4" style={{ animationDelay: "160ms" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${DEPT_STYLES[agent.department].avatar} text-sm font-bold text-white ring-2 ${DEPT_STYLES[agent.department].ring}`}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{agent.name}</p>
                          <p className="truncate text-xs text-slate-400">{agent.role}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_STYLES[status]}`}>{formatStatus(status)}</span>
                    </div>
                    <div className="mt-4 space-y-2 text-xs text-slate-300">
                      <div className="flex items-center justify-between">
                        <span>Active Tasks</span>
                        <span className="font-semibold text-white">{activeTasks}</span>
                      </div>
                      <p className="truncate text-xs text-slate-400">{currentTask || "No current task"}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="animate-enter" style={{ animationDelay: "180ms" }}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Tasks", value: taskStats.total },
            { label: "In Progress", value: taskStats.inProgress },
            { label: "Blocked", value: taskStats.blocked },
            { label: "Completed This Week", value: taskStats.done },
          ].map((stat, index) => (
            <article
              key={stat.label}
              className="glass-card animate-enter rounded-2xl p-5"
              style={{ animationDelay: `${220 + index * 40}ms` }}
            >
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="animate-enter" style={{ animationDelay: "260ms" }}>
        <div className="grid gap-4 lg:grid-cols-5">
          <article className="glass-panel rounded-2xl p-4 sm:p-5 lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-title">Active Tasks Feed</h2>
              <Link href="/tasks" className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300 transition hover:text-sky-200">
                View All
              </Link>
            </div>
            <div className="space-y-2">
              {activeTasks.map((task) => {
                const assignee = resolveAssignee(task.assignee, agents);
                return (
                  <Link
                    key={task.id}
                    href="/tasks"
                    className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-sky-400/35 hover:bg-white/[0.06]"
                  >
                    <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-center sm:gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[task.priority]}`} aria-hidden />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{task.title}</p>
                        <p className="truncate text-xs text-slate-400">{task.client}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${assignee ? DEPT_STYLES[assignee.department].avatar : "from-slate-500/70 to-slate-700/80"} text-[10px] font-semibold text-white`}
                        >
                          {getInitials(assignee?.name ?? task.assignee)}
                        </div>
                        <span className="hidden text-[11px] text-slate-400 xl:inline">{assignee?.name ?? task.assignee}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{dueDateLabel(task.dueDate)}</span>
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${STATUS_BADGE[task.status]}`}>
                        {task.status}
                      </span>
                    </div>
                  </Link>
                );
              })}

              {activeTasks.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">No active tasks yet.</div>
              )}
            </div>
          </article>

          <article className="glass-panel rounded-2xl p-4 sm:p-5 lg:col-span-2">
            <h2 className="section-title">Recent Activity Timeline</h2>
            <div className="mt-4 space-y-4">
              {activity.map((item, index) => (
                <div key={item.id} className="relative pl-6">
                  <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#2093FF] to-[#0026FF]" />
                  {index < activity.length - 1 && <span className="absolute left-[4px] top-4 h-[calc(100%+8px)] w-px bg-blue-400/25" />}
                  <p className="text-sm text-slate-200">{item.message}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    {relativeTimeFromIso(item.timestamp, now)}
                  </p>
                </div>
              ))}
              {activity.length === 0 && <p className="text-sm text-slate-400">No recent activity yet.</p>}
            </div>
          </article>
        </div>
      </section>

      <section className="animate-enter" style={{ animationDelay: "320ms" }}>
        <h2 className="section-title">Client Overview</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {activeClients.map((client, index) => (
            <article
              key={client.id}
              className="glass-card animate-enter rounded-2xl p-4"
              style={{ animationDelay: `${340 + index * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-white">{client.name}</p>
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-300">
                  Active
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">{client.services?.[0] ?? "Campaign setup"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
