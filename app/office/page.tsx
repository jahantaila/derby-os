"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "@/lib/hooks";

type AgentStatus = "sleeping" | "working" | "water-cooler";

type TeamMember = {
  id: string;
  name: string;
  role?: string;
  status?: string;
  currentTask?: string;
  avatar?: string;
};

type RenderAgent = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  currentTask: string;
  status: AgentStatus;
};

type WaterCoolerMessage = {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
};

const CORE = ["jahan", "kimberly", "kevin"] as const;
const FALLBACKS: Record<(typeof CORE)[number], Omit<RenderAgent, "id">> = {
  jahan: {
    name: "Jahan",
    role: "CEO",
    avatar: "🧑‍💼",
    currentTask: "Vision and strategy",
    status: "sleeping",
  },
  kimberly: {
    name: "Kimberly",
    role: "Chief of Staff",
    avatar: "👩‍💻",
    currentTask: "Coordinating operations",
    status: "working",
  },
  kevin: {
    name: "Kevin",
    role: "Developer",
    avatar: "🧑‍💻",
    currentTask: "Shipping features",
    status: "working",
  },
};

const CAT_SPOTS = [
  "left-[8%] top-[18%]",
  "left-[78%] top-[22%]",
  "left-[68%] top-[74%]",
  "left-[14%] top-[75%]",
  "left-[45%] top-[64%]",
];

const PLANT_SPOTS = [
  "left-[4%] top-[12%]",
  "right-[4%] top-[16%]",
  "left-[7%] top-[48%]",
  "right-[8%] top-[56%]",
  "left-[18%] bottom-[7%]",
  "right-[16%] bottom-[8%]",
];

function normalizeStatus(input?: string): AgentStatus {
  const value = (input || "").toLowerCase();
  if (["working", "active", "busy", "coding"].includes(value)) return "working";
  if (["water-cooler", "watercooler", "away", "chatting"].includes(value)) return "water-cooler";
  return "sleeping";
}

function roleAccent(name: string) {
  const key = name.toLowerCase();
  if (key === "jahan") return "ring-amber-300/70";
  if (key === "kimberly") return "ring-violet-300/70";
  if (key === "kevin") return "ring-orange-300/70";
  return "ring-cyan-300/50";
}

function Desk({
  agent,
  labelTone,
  className = "",
}: {
  agent: RenderAgent;
  labelTone: string;
  className?: string;
}) {
  const sleeping = agent.status === "sleeping";
  const working = agent.status === "working";
  const away = agent.status === "water-cooler";
  const statusBadge = away
    ? "bg-blue-500/20 text-blue-100 border border-blue-300/50"
    : working
      ? "bg-emerald-500/20 text-emerald-100 border border-emerald-300/50"
      : "bg-slate-700/70 text-slate-300 border border-slate-500/70";
  const statusLabel = away ? "At Water Cooler" : working ? "Active" : "Idle";

  return (
    <div className={`relative ${className}`}>
      <div
        className={[
          "relative h-44 rounded-lg border border-slate-700/90 px-3 pt-2",
          "bg-slate-900/70 backdrop-blur-[1px]",
          sleeping ? "grayscale-[0.6] opacity-75" : "",
        ].join(" ")}
      >
        <div className="mx-auto mt-3 h-20 w-40 rounded-sm border-2 border-slate-700 bg-[#3e2f2b] shadow-[inset_0_-8px_0_rgba(0,0,0,0.25)]">
          <div className="mx-auto mt-1 h-11 w-20 rounded-sm border border-slate-700 bg-slate-950 px-1.5 pt-1">
            {working ? (
              <div className="monitor-on h-full rounded-sm border border-emerald-500/70 bg-emerald-900/70 p-1">
                <div className="h-1 w-9 rounded bg-emerald-300/75" />
                <div className="mt-1 h-1 w-7 rounded bg-emerald-200/80" />
                <div className="mt-1 h-1 w-8 rounded bg-emerald-300/75" />
              </div>
            ) : (
              <div
                className={[
                  "h-full rounded-sm border p-1 text-center text-[8px]",
                  sleeping
                    ? "border-slate-800 bg-slate-950 text-slate-600"
                    : "border-amber-600/50 bg-amber-950/50 text-amber-200",
                ].join(" ")}
              >
                {sleeping ? "OFF" : "BRB"}
              </div>
            )}
          </div>
          <div className="mx-auto mt-0.5 h-1.5 w-10 rounded bg-slate-700" />
        </div>

        <div className="absolute bottom-8 left-1/2 h-10 w-10 -translate-x-1/2 rounded-full border border-slate-600 bg-slate-800" />

        {!away ? (
          <div className={[
            "absolute bottom-9 left-1/2 -translate-x-1/2 text-2xl",
            sleeping ? "-rotate-12" : "",
          ].join(" ")}>
            {agent.avatar}
          </div>
        ) : null}

        {sleeping ? (
          <div className="absolute left-[60%] top-[30%] text-slate-300">
            <span className="z-float inline-block text-xs">💤</span>
            <span className="z-float inline-block text-xs [animation-delay:180ms]">💤</span>
          </div>
        ) : null}
      </div>

      <div className={`mx-auto mt-2 w-fit rounded px-2 py-0.5 text-[11px] font-semibold ${labelTone}`}>
        {agent.name} - {agent.role}
      </div>
      <div className="mt-1 space-y-1 text-center">
        <div className={`mx-auto flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge}`}>
          <span className={["h-2 w-2 rounded-full", away ? "bg-blue-300" : working ? "bg-emerald-300" : "bg-slate-400"].join(" ")} />
          {statusLabel}
        </div>
        <div className={["text-[11px]", sleeping ? "text-slate-400" : away ? "text-blue-100" : "text-emerald-100"].join(" ")}>
          {agent.currentTask}
        </div>
      </div>

      <div className={`pointer-events-none absolute inset-0 rounded-lg ring-2 ${roleAccent(agent.name)}`} />
    </div>
  );
}

export default function OfficePage() {
  const { data: team, loading, refresh } = useData<TeamMember[]>("/api/team", []);
  const {
    data: waterCoolerMessages,
    refresh: refreshWaterCooler,
  } = useData<WaterCoolerMessage[]>("/api/water-cooler", []);

  const [catSpot] = useState(() => CAT_SPOTS[Math.floor(Math.random() * CAT_SPOTS.length)] || CAT_SPOTS[0]);
  const [showWaterCooler, setShowWaterCooler] = useState(false);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refresh();
      refreshWaterCooler();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh, refreshWaterCooler]);

  useEffect(() => {
    if (!showWaterCooler || !chatListRef.current) return;
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [showWaterCooler, waterCoolerMessages]);

  const agents = useMemo<RenderAgent[]>(() => {
    const members = team || [];
    const byName = new Map(members.map((m) => [m.name.toLowerCase(), m]));

    const core = CORE.map((nameKey) => {
      const member = byName.get(nameKey);
      const fallback = FALLBACKS[nameKey];
      return {
        id: member?.id || `core-${nameKey}`,
        name: member?.name || fallback.name,
        role: member?.role || fallback.role,
        avatar: member?.avatar || fallback.avatar,
        currentTask: member?.currentTask || fallback.currentTask,
        status: normalizeStatus(member?.status || fallback.status),
      };
    });

    const extras = members
      .filter((m) => !CORE.includes(m.name.toLowerCase() as (typeof CORE)[number]))
      .map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role || "Agent",
        avatar: m.avatar || "🤖",
        currentTask: m.currentTask || "Standing by",
        status: normalizeStatus(m.status),
      }));

    return [...core, ...extras];
  }, [team]);

  const jahan = agents[0];
  const kimberly = agents[1];
  const kevin = agents[2];
  const lowerAgents = [kevin, ...agents.slice(3)].filter(Boolean) as RenderAgent[];
  const waterCoolerAgents = agents.filter((a) => a.status === "water-cooler");
  const normalizedMessages = useMemo(
    () =>
      [...(waterCoolerMessages || [])]
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
        .slice(-50),
    [waterCoolerMessages],
  );
  const recentMessageCount = useMemo(() => {
    return normalizedMessages.length;
  }, [normalizedMessages]);
  const latestMessagesByAgent = useMemo(() => {
    const byAgent = new Map<string, WaterCoolerMessage>();
    const agentNames = new Set(waterCoolerAgents.map((agent) => agent.name.toLowerCase()));

    for (let i = normalizedMessages.length - 1; i >= 0; i -= 1) {
      const message = normalizedMessages[i];
      const from = message.from.toLowerCase();
      const to = message.to.toLowerCase();
      if (agentNames.has(from) && !byAgent.has(from)) byAgent.set(from, message);
      if (agentNames.has(to) && !byAgent.has(to)) byAgent.set(to, message);
      if (byAgent.size === agentNames.size) break;
    }

    return byAgent;
  }, [normalizedMessages, waterCoolerAgents]);

  return (
    <section>
      <style>{`
        @keyframes floatZ {
          0% { transform: translateY(0) scale(0.9); opacity: 0; }
          30% { opacity: 0.8; }
          100% { transform: translateY(-18px) scale(1.1); opacity: 0; }
        }
        @keyframes monitorPulse {
          0%, 100% { box-shadow: 0 0 2px rgba(16,185,129,0.5), inset 0 0 8px rgba(16,185,129,0.25); }
          50% { box-shadow: 0 0 10px rgba(16,185,129,0.8), inset 0 0 14px rgba(16,185,129,0.35); }
        }
        @keyframes steamRise {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          30% { opacity: 0.8; }
          100% { transform: translateY(-18px) scale(1.2); opacity: 0; }
        }
        @keyframes tailWag {
          0%, 100% { transform: rotate(12deg); }
          50% { transform: rotate(-14deg); }
        }
        .z-float { animation: floatZ 2s infinite; }
        .monitor-on { animation: monitorPulse 1.9s ease-in-out infinite; }
        .steam { animation: steamRise 1.8s ease-out infinite; }
        .cat-tail { transform-origin: left center; animation: tailWag 2.3s ease-in-out infinite; }
      `}</style>

      <div className="relative min-h-[860px] overflow-hidden rounded-2xl border border-slate-600/80 bg-slate-950 p-4 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.15)] md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:34px_34px]" />

        <div className="absolute inset-x-3 top-3 h-3 rounded bg-slate-700/80" />
        <div className="absolute inset-x-3 bottom-3 h-3 rounded bg-slate-700/80" />
        <div className="absolute bottom-3 left-[45%] h-3 w-20 rounded bg-amber-600/70" />
        <div className="absolute bottom-0 left-[47%] h-7 w-16 rounded-t-md border-x-2 border-t-2 border-amber-300/70 bg-slate-900" />
        <div className="absolute inset-y-3 left-3 w-3 rounded bg-slate-700/80" />
        <div className="absolute inset-y-3 right-3 w-3 rounded bg-slate-700/80" />

        <div className="absolute right-8 top-8 h-16 w-64 rounded border-2 border-slate-300 bg-slate-100/95 px-2 py-2 text-center font-semibold text-slate-900 shadow">
          Derby Digital HQ
          <div className="text-[11px] font-medium">Building toward $1M ARR</div>
        </div>

        <div className="absolute right-8 top-[64%] z-20 h-24 w-20 rounded-md border border-amber-300/70 bg-amber-900/50 p-2 text-center">
          <div className="relative">
            <span className="steam absolute left-4 top-0 text-xs text-slate-100">~</span>
            <span className="steam absolute left-8 top-1 text-xs text-slate-200 [animation-delay:300ms]">~</span>
            <span className="steam absolute left-12 top-0 text-xs text-slate-100 [animation-delay:600ms]">~</span>
          </div>
          <div className="mt-4 text-2xl">☕</div>
          <div className="text-[10px] font-bold uppercase text-amber-100">Coffee</div>
        </div>

        {PLANT_SPOTS.map((spot) => (
          <div key={spot} className={`absolute z-10 text-xl ${spot}`}>
            🪴
          </div>
        ))}

        <div className={`absolute z-20 text-2xl ${catSpot}`}>
          <span>🐱</span>
          <span className="cat-tail ml-[-4px] inline-block text-lg">~</span>
        </div>

        <div className="relative z-10 grid h-full gap-5 pt-6">
          <div className="rounded-xl border border-slate-300/60 bg-slate-50/95 p-3 text-slate-900">
            <div className="text-center text-sm font-black uppercase tracking-[0.2em]">Derby Digital HQ</div>
          </div>

          <div className="rounded-xl border border-slate-300/60 bg-slate-100/95 p-3 text-slate-900">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide">Whiteboard</div>
            <div className="text-sm font-semibold">Mission: Build systems that compound delivery, revenue, and team focus.</div>
          </div>

          <div className="rounded-xl border border-amber-300/50 bg-amber-900/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="rounded bg-amber-300/90 px-2 py-0.5 text-xs font-bold uppercase text-slate-900">CEO</div>
              <div className="text-xs text-amber-100">Corner Office</div>
            </div>
            {jahan ? <Desk agent={jahan} labelTone="bg-amber-300/90 text-slate-900" className="mx-auto max-w-md" /> : null}
          </div>

          <div className="rounded-xl border border-violet-300/50 bg-violet-900/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="rounded bg-violet-300/90 px-2 py-0.5 text-xs font-bold uppercase text-slate-900">Chief of Staff</div>
              <div className="text-xs text-violet-100">Operations Bay</div>
            </div>
            {kimberly ? <Desk agent={kimberly} labelTone="bg-violet-300/90 text-slate-900" className="mx-auto max-w-md" /> : null}
          </div>

          <div className="rounded-xl border border-cyan-300/50 bg-cyan-900/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded bg-cyan-300/90 px-2 py-0.5 text-xs font-bold uppercase text-slate-900">Water Cooler Area</div>
              <div className="text-xs text-cyan-100">Center of office</div>
            </div>
            <div className="rounded-xl border border-cyan-300/50 bg-cyan-950/60 p-3">
              <div className="mx-auto mb-3 w-fit text-center">
                <div className="text-4xl">🚰</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-100">Water Cooler</div>
              </div>
              {waterCoolerAgents.length === 0 ? (
                <div className="text-center text-xs text-cyan-100/80">No one at the cooler right now.</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {waterCoolerAgents.slice(0, 6).map((agent) => (
                    <div key={`cooler-${agent.id}`} className="rounded-lg border border-cyan-300/40 bg-slate-900/70 p-2 text-center">
                      <div className="text-2xl">{agent.avatar}</div>
                      <div className="text-xs font-semibold text-cyan-100">{agent.name}</div>
                      <div className="mt-1 text-[11px] text-cyan-50">
                        &quot;{latestMessagesByAgent.get(agent.name.toLowerCase())?.message || agent.currentTask || "Quick sync"}&quot;
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-cyan-300/40 bg-cyan-900/10 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="rounded bg-cyan-300/90 px-2 py-0.5 text-xs font-bold uppercase text-slate-900">Engineering Row</div>
              <div className="text-xs text-cyan-100">Auto-scales with new agents</div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lowerAgents.map((agent) => (
                <Desk
                  key={agent.id}
                  agent={agent}
                  labelTone={agent.name.toLowerCase() === "kevin" ? "bg-orange-300/90 text-slate-900" : "bg-cyan-300/90 text-slate-900"}
                />
              ))}

              {Array.from({ length: Math.max(0, 2 - lowerAgents.length) }).map((_, idx) => (
                <div key={`future-${idx}`} className="h-44 rounded-lg border border-dashed border-slate-600 bg-slate-900/50 p-3 text-center text-slate-400">
                  <div className="mt-8 text-4xl">🪑</div>
                  <div className="mt-3 text-xs uppercase tracking-wide">Future Agent Desk</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowWaterCooler((open) => !open)}
        className="fixed bottom-4 right-4 z-50 rounded-full border border-cyan-300/60 bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-cyan-100 shadow-xl transition hover:bg-slate-800"
      >
        💬 Water Cooler
        <span className="ml-2 rounded-full border border-cyan-100/70 bg-cyan-500 px-1.5 py-0.5 text-[10px] leading-none text-slate-950">
          {recentMessageCount}
        </span>
      </button>

      <div
        className={[
          "fixed bottom-20 right-0 top-20 z-40 w-[92%] max-w-md transition-transform duration-300 ease-out sm:right-4",
          showWaterCooler ? "translate-x-0" : "translate-x-[115%]",
        ].join(" ")}
      >
        <div className="flex h-full flex-col rounded-l-xl border border-slate-700 bg-slate-900/95 shadow-2xl shadow-black/40 sm:rounded-xl">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-cyan-100">Water Cooler Feed</h2>
              <p className="text-[11px] text-slate-400">Live updates every 5 seconds</p>
            </div>
            <button
              type="button"
              onClick={() => setShowWaterCooler(false)}
              className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-200 transition hover:bg-slate-800"
            >
              Close
            </button>
          </div>

          <div ref={chatListRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {normalizedMessages.length === 0 ? (
              <p className="text-xs text-slate-400">No messages yet.</p>
            ) : (
              normalizedMessages.map((entry) => {
                const ts = new Date(entry.timestamp);
                const stamp = Number.isNaN(ts.getTime()) ? entry.timestamp : ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const fromKevin = entry.from.toLowerCase() === "kevin";
                return (
                  <div
                    key={entry.id}
                    className={["flex", fromKevin ? "justify-end" : "justify-start"].join(" ")}
                  >
                    <div
                      className={[
                        "max-w-[85%] rounded-2xl border px-3 py-2",
                        fromKevin
                          ? "border-cyan-400/50 bg-cyan-900/40 text-cyan-50"
                          : "border-slate-600 bg-slate-800 text-slate-100",
                      ].join(" ")}
                    >
                      <div className="mb-1 text-[11px] font-semibold text-slate-300">
                        {entry.from} to {entry.to}
                      </div>
                      <div className="text-sm">{entry.message}</div>
                      <div className="mt-1 text-right text-[10px] text-slate-400">{stamp}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {loading ? <p className="mt-2 text-xs text-slate-400">Loading office telemetry...</p> : null}
    </section>
  );
}
