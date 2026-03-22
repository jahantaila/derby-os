"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Cpu, Zap, Crown, Target, TrendingUp, Code } from "lucide-react";
import { TEAM_SEED } from "@/lib/agents-data";
import { cn } from "@/lib/utils";

const OfficeScene = dynamic(
  () => import("./scene").then((mod) => mod.OfficeScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[700px] items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0a0a0f]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#2093FF] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading 3D office...</p>
        </div>
      </div>
    ),
  },
);

interface LiveTask {
  id: string;
  title: string;
  status: string;
  assignee: string;
  priority: string;
}

const AI_AGENTS = TEAM_SEED.filter((a) => a.type === "agent");

const DEPT_ICONS: Record<string, any> = {
  Executive: Crown,
  Marketing: Target,
  Sales: TrendingUp,
  Development: Code,
};

const DEPT_COLORS: Record<string, string> = {
  Executive: "#2093FF",
  Marketing: "#F93C3C",
  Sales: "#22C55E",
  Development: "#FFBD59",
};

export default function OfficePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.tasks) setLiveTasks(data.tasks.filter((t: LiveTask) => t.status === "in_progress"));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchTasks(); const i = setInterval(fetchTasks, 30000); return () => clearInterval(i); }, [fetchTasks]);

  // Map agent id → their current in-progress task
  const agentTasks = useMemo(() => {
    const map: Record<string, LiveTask> = {};
    liveTasks.forEach(t => { if (!map[t.assignee]) map[t.assignee] = t; });
    return map;
  }, [liveTasks]);

  const selectedAgent = useMemo(
    () => AI_AGENTS.find((a) => a.id === selectedId) ?? null,
    [selectedId]
  );

  const activeCount = AI_AGENTS.filter((a) => {
    const hasTask = !!agentTasks[a.id];
    return hasTask || a.status === "active" || a.status === "working";
  }).length;
  const depts = [...new Set(AI_AGENTS.map((a) => a.department))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-200 to-[#2093FF] bg-clip-text text-transparent">
            The Office
          </h1>
          <p className="text-[11px] text-slate-500 mt-1">
            Derby Digital HQ · {AI_AGENTS.length} agents · {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          {depts.map((dept) => {
            const Icon = DEPT_ICONS[dept] || Cpu;
            const color = DEPT_COLORS[dept] || "#666";
            return (
              <div key={dept} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
                <Icon className="w-3 h-3" style={{ color }} />
                <span className="text-[10px] text-slate-400">{dept}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3D Scene */}
      <div className="relative">
        <OfficeScene
          agents={AI_AGENTS}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {/* Agent info panel overlay */}
        {selectedAgent && (
          <div className="absolute top-4 right-4 w-72 bg-[#0c0c14]/95 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-2xl shadow-black/50 z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedAgent.status === "active" ? "#22C55E" : selectedAgent.status === "working" ? "#FFBD59" : "#64748b" }}
                />
                <h3 className="text-sm font-semibold">{selectedAgent.name}</h3>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    color: DEPT_COLORS[selectedAgent.department],
                    backgroundColor: `${DEPT_COLORS[selectedAgent.department]}15`,
                  }}
                >
                  {selectedAgent.department}
                </span>
                <span className="text-[10px] text-slate-500">{selectedAgent.role}</span>
              </div>

              {selectedAgent.model && (
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-slate-500" />
                  <span className="text-[11px] text-slate-400">{selectedAgent.model}</span>
                </div>
              )}

              {(agentTasks[selectedAgent.id] || selectedAgent.currentTask) && (
                <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05]">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">
                    {agentTasks[selectedAgent.id] ? "🔴 Live Task" : "Current Task"}
                  </p>
                  <p className="text-[11px] text-slate-300">
                    {agentTasks[selectedAgent.id]?.title || selectedAgent.currentTask}
                  </p>
                  {agentTasks[selectedAgent.id] && (
                    <span className="text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">In Progress</span>
                  )}
                </div>
              )}
              {!agentTasks[selectedAgent.id] && !selectedAgent.currentTask && (
                <div className="bg-white/[0.03] rounded-lg p-2.5 border border-white/[0.05]">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-[11px] text-slate-500 italic">Idle — no active tasks</p>
                </div>
              )}

              {selectedAgent.skills.length > 0 && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedAgent.skills.slice(0, 8).map((s) => (
                      <span
                        key={s}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 border border-white/[0.05]"
                      >
                        {s}
                      </span>
                    ))}
                    {selectedAgent.skills.length > 8 && (
                      <span className="text-[9px] text-slate-600">+{selectedAgent.skills.length - 8}</span>
                    )}
                  </div>
                </div>
              )}

              {selectedAgent.history.length > 0 && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">Recent Activity</p>
                  <div className="space-y-1">
                    {selectedAgent.history.slice(0, 3).map((h, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Zap className="w-2.5 h-2.5 text-slate-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-400">{h.action}</p>
                          <p className="text-[8px] text-slate-600 font-mono">{h.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Controls hint */}
        <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-black/60 backdrop-blur rounded-lg px-3 py-2 border border-white/[0.06]">
          <span className="text-[10px] text-slate-500">🖱️ Drag to rotate</span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">🔍 Scroll to zoom</span>
          <span className="text-[10px] text-slate-600">·</span>
          <span className="text-[10px] text-slate-500">👆 Click agent for info</span>
        </div>
      </div>
    </div>
  );
}
