"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { TEAM_SEED } from "@/lib/agents-data";

const OfficeScene = dynamic(
  () => import("./scene").then((mod) => mod.OfficeScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[720px] items-center justify-center rounded-[28px] border border-white/10 bg-white/5 text-sm text-slate-400">
        Loading office scene...
      </div>
    ),
  },
);

const AI_AGENTS = TEAM_SEED.filter((a) => a.type === "agent");

function formatTask(task: string) {
  return task.trim() || "Awaiting next assignment";
}

export default function OfficePage() {
  const [selectedId, setSelectedId] = useState<string | null>(AI_AGENTS[0]?.id ?? null);

  const selectedAgent = useMemo(
    () => AI_AGENTS.find((agent) => agent.id === selectedId) ?? null,
    [selectedId],
  );

  return (
    <section className="rounded-[32px] border border-white/10 bg-[#0a0a0f] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#2093FF]">
            Office Simulation
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
            AI Agent Floor
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Five AI agents only, grouped by department in a real Three.js isometric office.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Agents</p>
            <p className="mt-2 text-2xl font-semibold text-white">{AI_AGENTS.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Camera</p>
            <p className="mt-2 text-2xl font-semibold text-white">Ortho</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <OfficeScene
          agents={AI_AGENTS}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <aside className="absolute right-4 top-4 z-10 w-full max-w-sm rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,24,35,0.92),rgba(10,10,15,0.96))] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#2093FF]">
                Agent Details
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {selectedAgent?.name ?? "No agent selected"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {selectedAgent?.role ?? "Click an agent in the office."}
              </p>
            </div>

            {selectedAgent ? (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-white/20 hover:text-white"
                aria-label="Clear selected agent"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Department</p>
              <p className="mt-2 text-sm font-medium text-white">
                {selectedAgent?.department ?? "N/A"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Model</p>
              <p className="mt-2 text-sm font-medium text-white">
                {selectedAgent?.model ?? "N/A"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Current Task</p>
            <p className="mt-2 text-sm text-slate-200">
              {selectedAgent ? formatTask(selectedAgent.currentTask) : "Select an agent to inspect their current assignment."}
            </p>
          </div>

          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Skills</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedAgent?.skills.length ? (
                selectedAgent.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No registered skills.</span>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
// deploy 1773847212
