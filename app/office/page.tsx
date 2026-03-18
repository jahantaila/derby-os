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
      <div className="flex h-[680px] items-center justify-center rounded-[28px] border border-white/10 bg-white/5 text-sm text-slate-400 backdrop-blur-xl">
        Loading office simulation...
      </div>
    ),
  },
);

const OFFICE_AGENTS = TEAM_SEED.filter((member) => member.type === "agent");

function formatTask(task: string) {
  return task.trim() || "Awaiting next assignment";
}

export default function OfficePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const agents = useMemo(() => OFFICE_AGENTS, []);
  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedId) ?? null,
    [agents, selectedId],
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a0f] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle at top left, rgba(32,147,255,0.18), transparent 30%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.05), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0))",
          }}
        />

        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#2093FF]">
                Derby OS / Spatial View
              </p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
                The Office
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                A live isometric map of Derby Digital&apos;s agent floor, grouped by department and rendered as a procedural 3D workspace.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Agents</p>
                <p className="mt-2 text-2xl font-semibold text-white">{agents.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Departments</p>
                <p className="mt-2 text-2xl font-semibold text-white">4</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">View</p>
                <p className="mt-2 text-2xl font-semibold text-white">Isometric</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <OfficeScene
              agents={agents}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            {selectedAgent ? (
              <aside className="pointer-events-auto absolute right-4 top-4 z-10 w-full max-w-sm rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,24,38,0.84),rgba(10,10,15,0.92))] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#2093FF]">
                      Selected Agent
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">{selectedAgent.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">{selectedAgent.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-[#2093FF]/40 hover:text-white"
                    aria-label="Close info panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Department</p>
                    <p className="mt-2 text-sm font-medium text-white">{selectedAgent.department}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Status</p>
                    <p className="mt-2 text-sm font-medium capitalize text-white">{selectedAgent.status}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Current Task</p>
                  <p className="mt-2 text-sm text-slate-200">{formatTask(selectedAgent.currentTask)}</p>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedAgent.skills.length ? (
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
            ) : (
              <div className="pointer-events-none absolute right-4 top-4 z-10 max-w-sm rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,24,38,0.7),rgba(10,10,15,0.8))] px-4 py-3 text-sm text-slate-400 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                Click an agent to inspect their role, department, task, status, and skills.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
