"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Cpu, Sparkles, X } from "lucide-react";
import { OfficeScene, type OfficeAgent } from "./scene";

type AgentTask = {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
};

type AgentApiRecord = {
  id: string;
  name: string;
  role: string;
  department: string;
  type?: string;
  model?: string | null;
  status?: string;
  current_task?: string | null;
  currentTask?: string | null;
  skills?: string[];
  soul?: string | null;
  about?: string | null;
  history?: Array<{ timestamp: string; action: string }>;
  active_tasks?: AgentTask[];
};

const OFFICE_AGENT_IDS = ["kimberly", "kevin", "alex", "sabri", "jordan"] as const;

const DEPT_COLORS: Record<string, string> = {
  Executive: "#2093FF",
  Marketing: "#F93C3C",
  Sales: "#22C55E",
  Development: "#FFBD59",
};

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function normalizeAgent(agent: AgentApiRecord): OfficeAgent {
  const tasks = Array.isArray(agent.active_tasks) ? agent.active_tasks : [];
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const status = inProgressTasks.length > 0 ? "working" : "idle";

  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    department: agent.department as OfficeAgent["department"],
    model: agent.model ?? null,
    skills: Array.isArray(agent.skills) ? agent.skills : [],
    about: agent.about ?? agent.soul ?? "",
    history: Array.isArray(agent.history) ? agent.history : [],
    activeTasks: tasks,
    inProgressTasks,
    currentTask:
      inProgressTasks[0]?.title ??
      agent.current_task ??
      agent.currentTask ??
      null,
    status,
    accent: DEPT_COLORS[agent.department] ?? "#94A3B8",
    initials: initialsFor(agent.name),
  };
}

export default function OfficePage() {
  const [agents, setAgents] = useState<OfficeAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAgents() {
      try {
        const response = await fetch("/api/agents", { cache: "no-store" });
        const payload = await response.json();
        const records = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.agents)
            ? payload.agents
            : [];

        const nextAgents = (records as AgentApiRecord[])
          .filter((agent) => OFFICE_AGENT_IDS.includes(agent.id as (typeof OFFICE_AGENT_IDS)[number]))
          .map(normalizeAgent)
          .sort(
            (left, right) =>
              OFFICE_AGENT_IDS.indexOf(left.id as (typeof OFFICE_AGENT_IDS)[number]) -
              OFFICE_AGENT_IDS.indexOf(right.id as (typeof OFFICE_AGENT_IDS)[number]),
          );

        if (!active) return;
        setAgents(nextAgents);
        setSelectedId((current) =>
          current && nextAgents.some((agent) => agent.id === current) ? current : nextAgents[0]?.id ?? null,
        );
      } catch (error) {
        console.error("Failed to load office agents", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAgents();
    const refreshId = window.setInterval(loadAgents, 30000);

    return () => {
      active = false;
      window.clearInterval(refreshId);
    };
  }, []);

  useEffect(() => {
    const clockId = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(clockId);
  }, []);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedId) ?? null,
    [agents, selectedId],
  );

  const workingCount = useMemo(
    () => agents.filter((agent) => agent.inProgressTasks.length > 0).length,
    [agents],
  );

  const tasksInProgress = useMemo(
    () => agents.reduce((count, agent) => count + agent.inProgressTasks.length, 0),
    [agents],
  );

  const timeLabel = useMemo(
    () =>
      currentTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }),
    [currentTime],
  );

  return (
    <div className="min-h-[calc(100vh-7rem)] rounded-[28px] border border-white/10 bg-[#0a0a0f] p-4 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:p-6">
      <div className="relative overflow-hidden rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(32,147,255,0.16),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.04),_rgba(255,255,255,0.01))]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20" />
        <div className="relative flex flex-col gap-6 p-5 md:p-7">
          <header className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.38em] text-slate-500">Derby Digital</p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">The Office</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  Live office map for Derby Digital&apos;s AI agents. Click any station to inspect the agent, their model,
                  skills, and active work.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Live Stats</p>
                <div className="mt-2 flex items-baseline gap-4 font-mono">
                  <span className="text-2xl text-white">{workingCount}</span>
                  <span className="text-xs text-slate-400">agents working</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-2xl text-white">{tasksInProgress}</span>
                  <span className="text-xs text-slate-400">tasks in progress</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  <Clock3 className="h-3.5 w-3.5" />
                  Current Time
                </p>
                <p className="mt-2 font-mono text-2xl text-white">{timeLabel}</p>
              </div>
            </div>
          </header>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <OfficeScene
              agents={agents}
              loading={loading}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
            />

            <aside
              className={[
                "relative overflow-hidden rounded-[24px] border border-white/10 bg-white/7 p-5 backdrop-blur-2xl transition-all duration-500",
                selectedAgent ? "translate-x-0 opacity-100" : "translate-x-6 opacity-60",
              ].join(" ")}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_34%)]" />
              {selectedAgent ? (
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Agent Detail</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-full border-2 bg-[#11131b] text-lg font-semibold"
                          style={{ borderColor: selectedAgent.accent, boxShadow: `0 0 0 6px ${selectedAgent.accent}22` }}
                        >
                          {selectedAgent.initials}
                        </div>
                        <div>
                          <h2 className="text-2xl font-semibold text-white">{selectedAgent.name}</h2>
                          <p className="text-sm text-slate-400">{selectedAgent.role}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                      aria-label="Close detail panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span
                      className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.28em]"
                      style={{ borderColor: `${selectedAgent.accent}66`, color: selectedAgent.accent, backgroundColor: `${selectedAgent.accent}12` }}
                    >
                      {selectedAgent.department}
                    </span>
                    <span
                      className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.28em]"
                      style={{
                        borderColor: selectedAgent.status === "working" ? "#22C55E66" : "#FFBD5966",
                        color: selectedAgent.status === "working" ? "#22C55E" : "#FFBD59",
                        backgroundColor: selectedAgent.status === "working" ? "#22C55E12" : "#FFBD5912",
                      }}
                    >
                      {selectedAgent.status === "working" ? "Working" : "Idle"}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Model</p>
                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-200">
                        <Cpu className="h-4 w-4 text-slate-400" />
                        <span>{selectedAgent.model ?? "Unassigned"}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Active Tasks</p>
                      <div className="mt-3 space-y-2">
                        {selectedAgent.activeTasks.length > 0 ? (
                          selectedAgent.activeTasks.map((task) => (
                            <div
                              key={task.id}
                              className="rounded-xl border border-white/8 bg-white/5 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm text-slate-100">{task.title}</span>
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.24em]"
                                  style={{
                                    color: task.status === "in_progress" ? "#22C55E" : "#FFBD59",
                                    backgroundColor: task.status === "in_progress" ? "#22C55E14" : "#FFBD5914",
                                  }}
                                >
                                  {task.status.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">No active tasks. This agent is standing by.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedAgent.skills.length > 0 ? (
                          selectedAgent.skills.map((skill) => (
                            <span
                              key={skill}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">No skills listed.</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">About</p>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {selectedAgent.about || "No profile available for this agent yet."}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-500">
                        <Sparkles className="h-3.5 w-3.5" />
                        Recent Activity
                      </p>
                      <div className="mt-3 space-y-3">
                        {selectedAgent.history.length > 0 ? (
                          selectedAgent.history.slice(0, 4).map((entry) => (
                            <div key={`${entry.timestamp}-${entry.action}`} className="border-l border-white/10 pl-3">
                              <p className="text-sm text-slate-200">{entry.action}</p>
                              <p className="mt-1 font-mono text-[11px] text-slate-500">{entry.timestamp}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">No recent activity logged.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                  <div className="rounded-full border border-white/10 bg-white/5 p-4">
                    <Sparkles className="h-6 w-6 text-slate-300" />
                  </div>
                  <h2 className="mt-5 text-xl font-semibold text-white">Select an agent</h2>
                  <p className="mt-2 max-w-xs text-sm text-slate-500">
                    Click any workstation in the office to inspect the agent, their capabilities, and live tasks.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
