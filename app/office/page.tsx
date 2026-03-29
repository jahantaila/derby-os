"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, RefreshCw, WifiOff, X } from "lucide-react";
import { TEAM_SEED } from "@/lib/agents-data";

type Department = "Executive" | "Marketing" | "Sales" | "Development";
type AgentStatus = "idle" | "working" | "offline";

type SeedAgent = {
  id: string;
  name: string;
  role: string;
  department: Department;
};

type LiveStatusResponse = {
  agents?: Array<{
    id: string;
    status?: "idle" | "working" | "offline";
    currentTask?: string | null;
    current_task?: string | null;
    source?: string;
  }>;
  timestamp?: string;
};

type OfficeAgent = {
  id: string;
  name: string;
  role: string;
  department: Department;
  accent: string;
  status: AgentStatus;
  currentTask: string;
  detail: string;
  x: number;
  y: number;
  zone: string;
};

const DEPARTMENT_COLORS: Record<Department, string> = {
  Executive: "#2093FF",
  Marketing: "#F93C3C",
  Sales: "#22C55E",
  Development: "#FFBD59",
};

const STATUS_META: Record<AgentStatus, { label: string; color: string }> = {
  idle: { label: "Idle", color: "#F59E0B" },
  working: { label: "Working", color: "#22C55E" },
  offline: { label: "Offline", color: "#94A3B8" },
};

const OFFICE_LAYOUT: Record<string, { x: number; y: number; zone: string }> = {
  kimberly: { x: 49, y: 18, zone: "Executive desk" },
  alex: { x: 78, y: 34, zone: "Marketing row" },
  sabri: { x: 72, y: 50, zone: "Marketing row" },
  jordan: { x: 82, y: 72, zone: "Sales pod" },
  kevin: { x: 24, y: 68, zone: "Development bay" },
};

const OFFICE_AGENT_IDS = new Set(Object.keys(OFFICE_LAYOUT));

const OFFICE_AGENTS: SeedAgent[] = TEAM_SEED
  .filter((agent): agent is typeof agent & { department: Department } =>
    OFFICE_AGENT_IDS.has(agent.id) &&
    (agent.department === "Executive" ||
      agent.department === "Marketing" ||
      agent.department === "Sales" ||
      agent.department === "Development"),
  )
  .map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    department: agent.department,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

function formatTime(timestamp?: string | null) {
  if (!timestamp) return "No live timestamp";
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) return "No live timestamp";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function buildAgents(payload?: LiveStatusResponse | null, failed = false): OfficeAgent[] {
  const liveById = new Map(
    (payload?.agents ?? []).map((agent) => [
      agent.id,
      {
        status: agent.status ?? "idle",
        currentTask: agent.currentTask ?? agent.current_task ?? null,
      },
    ]),
  );

  return OFFICE_AGENTS.map((agent) => {
    const live = liveById.get(agent.id);
    const status: AgentStatus = failed ? "offline" : live?.status === "working" ? "working" : live?.status === "offline" ? "offline" : "idle";
    const currentTask =
      status === "offline"
        ? "Status feed unavailable"
        : live?.currentTask?.trim() || (status === "working" ? "Active task in progress" : "Waiting for next task");

    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      department: agent.department,
      accent: DEPARTMENT_COLORS[agent.department],
      status,
      currentTask,
      detail:
        status === "working"
          ? "Focused on live work"
          : status === "offline"
            ? "Connection to live status is down"
            : "Available for assignment",
      x: OFFICE_LAYOUT[agent.id].x,
      y: OFFICE_LAYOUT[agent.id].y,
      zone: OFFICE_LAYOUT[agent.id].zone,
    };
  });
}

function OfficeScene({
  agents,
  selectedId,
  onSelect,
}: {
  agents: OfficeAgent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative mx-auto h-full w-full max-w-[1600px]">
      <svg
        viewBox="0 0 1200 760"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="floorBase" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F7FAFF" />
            <stop offset="100%" stopColor="#DCE7F7" />
          </linearGradient>
          <linearGradient id="floorEdge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#D7E1F0" />
            <stop offset="100%" stopColor="#B9C8DC" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="18" stdDeviation="18" floodColor="#0f172a" floodOpacity="0.16" />
          </filter>
        </defs>

        <rect width="1200" height="760" rx="32" fill="url(#floorBase)" />
        <polygon points="155,110 1025,110 1110,185 240,185" fill="#FDFEFF" opacity="0.9" />
        <polygon points="240,185 1110,185 1015,620 145,620" fill="url(#floorBase)" filter="url(#softShadow)" />
        <polygon points="145,620 1015,620 942,676 74,676" fill="url(#floorEdge)" />

        <polygon points="330,170 565,170 522,308 286,308" fill="#2093FF" opacity="0.11" />
        <polygon points="690,240 930,240 886,430 646,430" fill="#F93C3C" opacity="0.11" />
        <polygon points="640,490 926,490 884,640 598,640" fill="#22C55E" opacity="0.11" />
        <polygon points="170,480 430,480 388,636 130,636" fill="#FFBD59" opacity="0.14" />

        <polygon points="486,250 702,250 672,365 456,365" fill="#FFFFFF" stroke="#B9C8DC" strokeWidth="3" />
        <line x1="525" y1="285" x2="640" y2="285" stroke="#2093FF" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
        <line x1="512" y1="316" x2="625" y2="316" stroke="#F93C3C" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
        <line x1="545" y1="345" x2="635" y2="345" stroke="#22C55E" strokeWidth="8" strokeLinecap="round" opacity="0.8" />

        <polygon points="164,335 250,335 234,398 148,398" fill="#E9EEF6" stroke="#B9C8DC" strokeWidth="3" />
        <circle cx="725" cy="142" r="18" fill="#C5D4E8" />
        <circle cx="765" cy="132" r="14" fill="#D3DDEC" />
        <circle cx="848" cy="610" r="18" fill="#C5D4E8" />
        <circle cx="300" cy="604" r="16" fill="#D3DDEC" />
      </svg>

      {agents.map((agent) => {
        const isSelected = selectedId === agent.id;
        const statusMeta = STATUS_META[agent.status];
        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => onSelect(agent.id)}
            className="group absolute z-10 flex w-[120px] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-left outline-none transition-transform duration-200 hover:scale-[1.03] focus-visible:scale-[1.03]"
            style={{ left: `${agent.x}%`, top: `${agent.y}%` }}
          >
            <span
              className="absolute top-[58px] h-7 w-16 rounded-full bg-slate-950/18 blur-md"
              aria-hidden="true"
            />
            <span className="relative block h-[58px] w-[92px]">
              <span
                className="absolute inset-0 rounded-[18px] border border-slate-900/6 shadow-[0_18px_30px_rgba(15,23,42,0.12)]"
                style={{
                  background: `linear-gradient(160deg, ${agent.accent}24, rgba(255,255,255,0.92))`,
                  transform: "skew(-28deg) rotate(-11deg)",
                }}
              />
              <span
                className="absolute left-[13px] top-[14px] h-7 w-8 rounded-md border border-slate-900/10 bg-[#152033]"
                style={{ transform: "skew(-28deg) rotate(-11deg)" }}
              />
              <span
                className="absolute left-[49px] top-[20px] h-4 w-6 rounded-sm border border-slate-900/10 bg-white/90"
                style={{ transform: "skew(-28deg) rotate(-11deg)" }}
              />
            </span>

            <span className="relative -mt-1 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)]">
              {agent.name.slice(0, 2).toUpperCase()}
              <span
                className="absolute -right-0.5 top-0.5 h-4 w-4 rounded-full border-2 border-white"
                style={{ backgroundColor: statusMeta.color }}
                aria-hidden="true"
              />
            </span>

            <span
              className="mt-3 w-full rounded-2xl border px-3 py-2 backdrop-blur-xl transition-colors"
              style={{
                borderColor: isSelected ? `${agent.accent}55` : "rgba(148,163,184,0.22)",
                background: isSelected ? "rgba(255,255,255,0.74)" : "rgba(255,255,255,0.56)",
                boxShadow: isSelected ? `0 12px 32px ${agent.accent}22` : "0 12px 32px rgba(15,23,42,0.1)",
              }}
            >
              <span className="block text-[13px] font-semibold text-slate-950">{agent.name}</span>
              <span className="mt-0.5 block text-[11px] uppercase tracking-[0.18em] text-slate-500">{agent.department}</span>
              <span className="mt-2 flex items-center gap-2 text-[11px] font-medium text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusMeta.color }} />
                {statusMeta.label}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AgentModal({
  agent,
  lastUpdated,
  onClose,
}: {
  agent: OfficeAgent | null;
  lastUpdated: string | null;
  onClose: () => void;
}) {
  if (!agent) return null;

  const statusMeta = STATUS_META[agent.status];

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${agent.name} details`}>
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
        onClick={onClose}
        aria-label="Close agent details"
      />
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.12))] p-5 shadow-[0_32px_80px_rgba(15,23,42,0.35)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.38),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(32,147,255,0.14),transparent_38%)]" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Agent Overview</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">{agent.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{agent.role}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/35 text-slate-700 transition hover:bg-white/55"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ borderColor: `${agent.accent}50`, color: agent.accent, backgroundColor: `${agent.accent}14` }}
            >
              {agent.department}
            </span>
            <span
              className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ borderColor: `${statusMeta.color}55`, color: statusMeta.color, backgroundColor: `${statusMeta.color}14` }}
            >
              {statusMeta.label}
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-3xl border border-white/35 bg-white/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Current Task</p>
              <p className="mt-3 text-base font-medium text-slate-950">{agent.currentTask}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-white/35 bg-white/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Department</p>
                <p className="mt-3 text-sm font-medium text-slate-900">{agent.department}</p>
              </div>
              <div className="rounded-3xl border border-white/35 bg-white/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Desk Zone</p>
                <p className="mt-3 text-sm font-medium text-slate-900">{agent.zone}</p>
              </div>
              <div className="rounded-3xl border border-white/35 bg-white/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Role</p>
                <p className="mt-3 text-sm font-medium text-slate-900">{agent.role}</p>
              </div>
              <div className="rounded-3xl border border-white/35 bg-white/30 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Last Refresh</p>
                <p className="mt-3 text-sm font-medium text-slate-900">{formatTime(lastUpdated)}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/35 bg-white/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Status Summary</p>
              <div className="mt-3 flex items-center gap-3 text-sm text-slate-700">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: statusMeta.color }} />
                <span>{agent.detail}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OfficePage() {
  const [agents, setAgents] = useState<OfficeAgent[]>(() => buildAgents());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadStatus = async () => {
      try {
        const response = await fetch("/api/agent-status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Status API returned ${response.status}`);
        }
        const payload = (await response.json()) as LiveStatusResponse;
        if (!mounted) return;
        setAgents(buildAgents(payload));
        setLastUpdated(payload.timestamp ?? new Date().toISOString());
        setError(null);
      } catch (loadError) {
        if (!mounted) return;
        setAgents(buildAgents(null, true));
        setLastUpdated(new Date().toISOString());
        setError(loadError instanceof Error ? loadError.message : "Live status unavailable");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStatus();
    const intervalId = window.setInterval(loadStatus, 30000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedId) ?? null,
    [agents, selectedId],
  );

  const counts = useMemo(
    () =>
      agents.reduce(
        (accumulator, agent) => {
          accumulator[agent.status] += 1;
          return accumulator;
        },
        { idle: 0, working: 0, offline: 0 } as Record<AgentStatus, number>,
      ),
    [agents],
  );

  return (
    <>
      <section className="relative -mx-5 -mb-5 overflow-hidden rounded-[1.4rem] border border-white/15 bg-[linear-gradient(180deg,#f4f8ff_0%,#e7eef8_100%)] text-slate-950 md:-mx-6 min-h-[calc(100vh-7.75rem)] md:min-h-[calc(100vh-7rem)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(32,147,255,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.1),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,255,255,0))]" aria-hidden="true" />
        <div className="relative flex h-full min-h-[inherit] flex-col">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-900/8 px-5 py-5 md:px-7">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Task 6 · Office Page Rebuild</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">Live Agent Office</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Click any desk to inspect the live assignment. Status updates poll from <code>/api/agent-status</code> every 30 seconds.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["working", "idle", "offline"] as AgentStatus[]).map((status) => (
                <div key={status} className="rounded-2xl border border-white/35 bg-white/55 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_META[status].color }} />
                    {STATUS_META[status].label}
                  </div>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{counts[status]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid flex-1 gap-5 px-5 py-5 md:px-7 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/40 bg-white/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-6">
              <OfficeScene agents={agents} selectedId={selectedId} onSelect={setSelectedId} />
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-sm">
                  <div className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                    Loading office status...
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="flex flex-col gap-4">
              <div className="rounded-[1.75rem] border border-white/35 bg-white/45 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {error ? <WifiOff className="h-4 w-4 text-slate-500" /> : <RefreshCw className="h-4 w-4 text-slate-500" />}
                  Live Feed
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {error ? error : `Last synced at ${formatTime(lastUpdated)}.`}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">Refresh cadence: 30 seconds</p>
              </div>

              <div className="rounded-[1.75rem] border border-white/35 bg-white/45 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <BriefcaseBusiness className="h-4 w-4 text-slate-500" />
                  Departments
                </div>
                <div className="mt-4 grid gap-3">
                  {Object.entries(DEPARTMENT_COLORS).map(([department, color]) => (
                    <div key={department} className="flex items-center justify-between rounded-2xl border border-white/35 bg-white/55 px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium text-slate-800">{department}</span>
                      </div>
                      <span className="text-xs uppercase tracking-[0.14em] text-slate-500">
                        {agents.filter((agent) => agent.department === department).length} desk
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/35 bg-white/45 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl">
                <p className="text-sm font-semibold text-slate-900">Office Notes</p>
                <div className="mt-4 grid gap-3 text-sm text-slate-600">
                  <div className="rounded-2xl border border-white/35 bg-white/55 px-3 py-3">
                    Executive is centered up front for Kimberly.
                  </div>
                  <div className="rounded-2xl border border-white/35 bg-white/55 px-3 py-3">
                    Marketing shares the right-side campaign pod with Alex and Sabri.
                  </div>
                  <div className="rounded-2xl border border-white/35 bg-white/55 px-3 py-3">
                    Kevin anchors the development bay and Jordan runs the sales pod.
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <AgentModal agent={selectedAgent} lastUpdated={lastUpdated} onClose={() => setSelectedId(null)} />
    </>
  );
}
