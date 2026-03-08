"use client";

import { useEffect, useMemo } from "react";
import { useData } from "@/lib/hooks";

type TeamMember = {
  id: string;
  name: string;
  role?: string;
  status?: string;
  currentTask?: string;
  avatar?: string;
  model?: string;
  type?: string;
};

type WaterCoolerMessage = {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
};

function normalizeStatus(input?: string) {
  const value = (input || "").toLowerCase();
  if (["working", "active", "busy", "coding"].includes(value)) {
    return { label: "Active", dot: "status-dot status-active", bucket: "active" as const };
  }
  if (["water-cooler", "watercooler", "away", "chatting"].includes(value)) {
    return { label: "At Water Cooler", dot: "status-dot status-away", bucket: "away" as const };
  }
  return { label: "Idle", dot: "status-dot status-idle", bucket: "idle" as const };
}

function AgentCard({ member }: { member: TeamMember }) {
  const status = normalizeStatus(member.status);

  return (
    <article className="glass-surface group relative overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/25">
      <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(32,147,255,0.35),rgba(32,147,255,0)_70%)] opacity-80" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-4xl">{member.avatar || "🤖"}</span>
          <h3 className="mt-3 text-lg font-semibold text-white">{member.name}</h3>
          <p className="text-sm text-slate-300">{member.role || "Agent"}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">{member.model || "Unknown"}</span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-200">
        <span className={status.dot} />
        {status.label}
      </div>
      <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
        {member.currentTask || "No active task assigned."}
      </p>
    </article>
  );
}

export default function OfficePage() {
  const { data: team, loading, refresh } = useData<TeamMember[]>("/api/team", []);
  const { data: waterCoolerMessages, refresh: refreshWaterCooler } = useData<WaterCoolerMessage[]>("/api/water-cooler", []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      refresh();
      refreshWaterCooler();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh, refreshWaterCooler]);

  const sortedMessages = useMemo(
    () => [...(waterCoolerMessages || [])].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 8),
    [waterCoolerMessages],
  );

  const buckets = useMemo(() => {
    const active: TeamMember[] = [];
    const away: TeamMember[] = [];
    const idle: TeamMember[] = [];

    for (const member of team || []) {
      const state = normalizeStatus(member.status).bucket;
      if (state === "active") active.push(member);
      else if (state === "away") away.push(member);
      else idle.push(member);
    }

    return { active, away, idle };
  }, [team]);

  return (
    <section className="space-y-7">
      <div className="glass-surface relative overflow-hidden rounded-3xl px-6 py-8">
        <div className="pointer-events-none absolute -left-10 top-2 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(0,38,255,0.35),rgba(0,38,255,0)_70%)]" />
        <p className="text-xs uppercase tracking-[0.28em] text-blue-200/75">Office Live</p>
        <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Derby HQ Activity Grid</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
          Real-time floor view of agent activity, task focus, and water-cooler conversations across the office.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-emerald-100">
            {buckets.active.length} active
          </span>
          <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1.5 text-sky-100">
            {buckets.away.length} at water cooler
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-slate-200">
            {buckets.idle.length} idle
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.1fr]">
        <div className="space-y-4">
          <div className="glass-surface rounded-2xl p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">Active Agents</h2>
          </div>
          <div className="grid gap-4">
            {buckets.active.length > 0 ? buckets.active.map((member) => <AgentCard key={member.id} member={member} />) : (
              <p className="glass-surface rounded-2xl p-4 text-sm text-slate-300">No active agents right now.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-surface rounded-2xl p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-100">Idle Or Offline</h2>
          </div>
          <div className="grid gap-4">
            {buckets.idle.length > 0 ? buckets.idle.map((member) => <AgentCard key={member.id} member={member} />) : (
              <p className="glass-surface rounded-2xl p-4 text-sm text-slate-300">Everyone is active right now.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-surface rounded-2xl p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-100">Water Cooler</h2>
            <p className="mt-1 text-xs text-slate-300">Live social stream and away statuses.</p>
          </div>

          <div className="grid gap-4">
            {buckets.away.length > 0 ? buckets.away.map((member) => <AgentCard key={member.id} member={member} />) : (
              <p className="glass-surface rounded-2xl p-4 text-sm text-slate-300">No one is at the cooler right now.</p>
            )}
          </div>

          <div className="glass-surface rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-white">Recent Messages</h3>
            <div className="mt-3 space-y-3">
              {sortedMessages.length > 0 ? (
                sortedMessages.map((entry) => {
                  const timestamp = new Date(entry.timestamp);
                  const formatted = Number.isNaN(timestamp.getTime())
                    ? entry.timestamp
                    : timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div key={entry.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
                      <p className="font-medium text-slate-100">
                        {entry.from} to {entry.to}
                      </p>
                      <p className="mt-1 text-slate-300">{entry.message}</p>
                      <p className="mt-2 text-[11px] text-slate-400">{formatted}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-300">No water-cooler messages yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? <p className="text-xs text-slate-400">Loading office telemetry...</p> : null}
    </section>
  );
}
