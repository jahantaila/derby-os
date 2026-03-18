"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Brain,
  BriefcaseBusiness,
  ChevronRight,
  Clock3,
  Code2,
  Crown,
  Layers3,
  Megaphone,
  Sparkles,
  Target,
} from "lucide-react";
import { TEAM_SEED } from "@/lib/agents-data";
import type { AgentRecord } from "@/lib/agents-data";
import { cn } from "@/lib/utils";

const DEPARTMENT_STYLES = {
  Executive: {
    color: "#2093FF",
    icon: Crown,
    description: "Leadership, routing, and agency-level decision support.",
  },
  Marketing: {
    color: "#F93C3C",
    icon: Megaphone,
    description: "Performance analysis, offer strategy, and campaign production.",
  },
  Sales: {
    color: "#22C55E",
    icon: Target,
    description: "Pipeline operations, lead sync, and outbound system throughput.",
  },
  Development: {
    color: "#FFBD59",
    icon: Code2,
    description: "Product delivery, infrastructure, and internal platform engineering.",
  },
} as const;

type DepartmentName = keyof typeof DEPARTMENT_STYLES;
type ModelName = "Opus" | "Sonnet" | "Codex";

const MODEL_STYLES: Record<ModelName, string> = {
  Opus: "border-[#2093FF]/30 bg-[#2093FF]/10 text-[#8DC8FF]",
  Sonnet: "border-[#F93C3C]/25 bg-[#F93C3C]/10 text-[#FF9B9B]",
  Codex: "border-[#FFBD59]/25 bg-[#FFBD59]/10 text-[#FFD98F]",
};

const STATUS_STYLES: Record<AgentRecord["status"], { dot: string; label: string }> = {
  active: { dot: "bg-emerald-400", label: "Active" },
  working: { dot: "bg-amber-400", label: "Working" },
  idle: { dot: "bg-zinc-500", label: "Idle" },
  offline: { dot: "bg-zinc-600", label: "Offline" },
};

function roleIcon(role: AgentRecord["role"]) {
  if (role === "CEO") return Crown;
  if (role === "Chief of Staff") return BriefcaseBusiness;
  if (role === "Marketing Analyst") return Brain;
  if (role === "Ad Producer") return Megaphone;
  if (role === "Operations Specialist") return Activity;
  return Code2;
}

function formatTimestamp(timestamp: string) {
  return timestamp.replace(" ", " · ");
}

function AgentCard({
  agent,
  expanded,
  onClick,
}: {
  agent: AgentRecord;
  expanded: boolean;
  onClick: () => void;
}) {
  const RoleIcon = roleIcon(agent.role);
  const status = STATUS_STYLES[agent.status];
  const recentHistory = agent.history.slice(0, 3);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-[24px] border bg-white/[0.03] p-5 text-left backdrop-blur-xl transition-all",
        "border-white/[0.06] hover:border-white/15 hover:bg-white/[0.045]",
        expanded && "border-[#2093FF]/35 bg-white/[0.055] shadow-[0_0_0_1px_rgba(32,147,255,0.18)]",
      )}
      aria-expanded={expanded}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.04]">
            <RoleIcon className="h-5 w-5 text-white/80" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold text-white">{agent.name}</h3>
              <span className="flex items-center gap-1">
                <span className={cn("h-2.5 w-2.5 rounded-full", status.dot)} />
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">{status.label}</span>
              </span>
            </div>
            <p className="mt-1 text-sm text-white/62">{agent.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {agent.model && (
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                MODEL_STYLES[agent.model as ModelName] ?? "border-white/[0.08] bg-white/[0.06] text-white/70",
              )}
            >
              {agent.model}
            </span>
          )}
          <ChevronRight className={cn("h-4 w-4 text-white/28 transition-transform", expanded && "rotate-90 text-white/55")} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.05] bg-black/20 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">Current Task</p>
        <p className="mt-2 text-sm text-white/78">{agent.currentTask || "No active task assigned"}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {agent.skills.length > 0 ? (
          agent.skills.slice(0, 6).map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/60"
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/45">
            No registered skills
          </span>
        )}
      </div>

      <div className="mt-5 space-y-2.5">
        {recentHistory.length > 0 ? (
          recentHistory.map((entry) => (
            <div key={`${agent.id}-${entry.timestamp}-${entry.action}`} className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 text-[12px] text-white/72">{entry.action}</p>
              <span className="shrink-0 font-mono text-[11px] text-white/36">{formatTimestamp(entry.timestamp)}</span>
            </div>
          ))
        ) : (
          <p className="text-[12px] text-white/40">No recent activity logged.</p>
        )}
      </div>
    </button>
  );
}

function DetailPanel({ agent }: { agent: AgentRecord }) {
  const status = STATUS_STYLES[agent.status];
  const dept = DEPARTMENT_STYLES[agent.department as DepartmentName];

  return (
    <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-white">{agent.name}</h2>
            <span className={cn("h-2.5 w-2.5 rounded-full", status.dot)} />
          </div>
          <p className="mt-1 text-white/60">{agent.role}</p>
        </div>
        {agent.model && (
          <span
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]",
              MODEL_STYLES[agent.model as ModelName] ?? "border-white/[0.08] bg-white/[0.06] text-white/70",
            )}
          >
            {agent.model}
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">Department</p>
          <p className="mt-2 text-sm font-medium" style={{ color: dept?.color ?? "#fff" }}>
            {agent.department}
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">Current Status</p>
          <p className="mt-2 text-sm text-white/78">{status.label}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/[0.05] bg-black/20 p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">Tasking</p>
        <p className="mt-2 text-sm text-white/78">{agent.currentTask || "No active task assigned"}</p>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-white/48" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">Soul Description</p>
        </div>
        <div className="mt-3 rounded-2xl border border-white/[0.05] bg-black/20 p-4">
          <p className="whitespace-pre-line text-sm leading-7 text-white/72">
            {agent.soul || "No expanded description available."}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-white/48" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">All Skills</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {agent.skills.length > 0 ? (
            agent.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/66"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/45">
              No registered skills
            </span>
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-white/48" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">Full Activity History</p>
        </div>
        <div className="mt-3 space-y-3 rounded-2xl border border-white/[0.05] bg-black/20 p-4">
          {agent.history.length > 0 ? (
            agent.history.map((entry) => (
              <div
                key={`${agent.id}-${entry.timestamp}-${entry.action}`}
                className="flex items-start justify-between gap-3 border-b border-white/[0.05] pb-3 last:border-b-0 last:pb-0"
              >
                <p className="min-w-0 flex-1 text-sm text-white/76">{entry.action}</p>
                <span className="shrink-0 font-mono text-[11px] text-white/38">{formatTimestamp(entry.timestamp)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-white/45">No activity history logged.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const agents = useMemo(() => TEAM_SEED.filter((member) => member.type === "agent"), []);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(agents[0]?.id ?? "");

  const departments = useMemo(() => {
    const grouped = new Map<DepartmentName, AgentRecord[]>();

    agents.forEach((agent) => {
      if (!(agent.department in DEPARTMENT_STYLES)) return;
      const department = agent.department as DepartmentName;
      const existing = grouped.get(department) ?? [];
      existing.push(agent);
      grouped.set(department, existing);
    });

    return Array.from(grouped.entries()).map(([department, members]) => ({
      department,
      members,
      ...DEPARTMENT_STYLES[department],
    }));
  }, [agents]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
  const activeCount = agents.filter((agent) => agent.status === "active").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <div className="overflow-hidden rounded-[32px] border border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(32,147,255,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(249,60,60,0.1),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">Mission Control</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Formal AI Agents Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
                Live team intelligence sourced directly from the shared agent registry. Departments, status, tasking,
                and operational history are discovered from seed data without hardcoded rosters.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Total Agents", value: String(agents.length), icon: Brain },
                { label: "Active", value: String(activeCount), icon: Activity },
                { label: "Departments", value: String(departments.length), icon: Layers3 },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-[180px] rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">{stat.label}</p>
                    <stat.icon className="h-4 w-4 text-white/42" />
                  </div>
                  <p className="mt-3 font-mono text-3xl text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_420px]">
          <div className="space-y-6">
            {departments.map((department) => {
              const DepartmentIcon = department.icon;

              return (
                <section
                  key={department.department}
                  className="overflow-hidden rounded-[28px] border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl"
                >
                  <div
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    style={{
                      background: `linear-gradient(90deg, ${department.color} 0%, ${department.color}CC 35%, rgba(255,255,255,0.03) 100%)`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-black/15">
                        <DepartmentIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{department.department}</h2>
                        <p className="text-sm text-white/80">{department.description}</p>
                      </div>
                    </div>
                    <div className="font-mono text-sm text-white/85">{department.members.length} online records</div>
                  </div>

                  <div className="grid gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
                    {department.members.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        expanded={selectedAgentId === agent.id}
                        onClick={() => setSelectedAgentId((current) => (current === agent.id ? "" : agent.id))}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="xl:sticky xl:top-6 xl:self-start">
            {selectedAgent ? (
              <DetailPanel agent={selectedAgent} />
            ) : (
              <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">Detail Panel</p>
                <p className="mt-3 text-sm leading-6 text-white/58">
                  Select an agent card to inspect the full profile, narrative description, skills registry, and complete
                  activity history.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
