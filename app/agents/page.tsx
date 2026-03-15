"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, Brain, ChevronRight, Clock3, Code2, Cpu, LineChart,
  MessageSquare, Search, Shield, Target, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRecord } from "@/lib/agents";

const MODEL_COLORS: Record<string, string> = {
  Opus: "text-blue-400 bg-blue-400/10",
  Sonnet: "text-cyan-400 bg-cyan-400/10",
  Codex: "text-violet-400 bg-violet-400/10",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  "Chief of Staff": Brain,
  "Marketing Analyst": LineChart,
  "Ad Producer": Target,
  "Developer": Code2,
  "Operations Specialist": Search,
};

function SkillBadge({ skill }: { skill: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[9px] text-slate-500">
      {skill.replace(/-/g, " ")}
    </span>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "idle" | "offline">("all");

  useEffect(() => {
    fetch("/api/agents?type=agent").then(r => r.json()).then(setAgents).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/agents?type=agent").then(r => r.json()).then(setAgents).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = agents.filter(a => filter === "all" || a.status === filter);
  const selectedAgent = agents.find(a => a.id === selected);

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Operations</p>
            <h1 className="text-[20px] font-bold text-white">AI Agents</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">{agents.filter(a => a.status === "active" || a.status === "working").length} of {agents.length} agents online</p>
          </div>
          <div className="flex gap-1">
            {(["all", "active", "idle", "offline"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-3 py-1.5 rounded-lg text-[11px] transition-all",
                  filter === f ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-white"
                )}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Agent cards */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(agent => {
            const Icon = ROLE_ICONS[agent.role] || Cpu;
            const modelColor = MODEL_COLORS[agent.model || ""] || "text-slate-400 bg-slate-400/10";
            const isOnline = agent.status === "active" || agent.status === "working";

            return (
              <button key={agent.id} onClick={() => setSelected(agent.id)}
                className={cn(
                  "text-left p-4 rounded-xl border transition-all",
                  selected === agent.id ? "border-blue-500/30 bg-blue-500/[0.05]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                )}>
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.05] flex items-center justify-center">
                      <Icon size={18} className={isOnline ? "text-white" : "text-slate-500"} />
                    </div>
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0a0a0f]",
                      isOnline ? "bg-emerald-400" : agent.status === "idle" ? "bg-amber-400" : "bg-slate-600"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-white">{agent.name}</p>
                      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", modelColor)}>{agent.model}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{agent.role} · {agent.department}</p>
                    {agent.currentTask && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Activity size={10} className={cn(isOnline ? "text-emerald-400 animate-pulse" : "text-slate-500")} />
                        <p className="text-[10px] text-slate-300 truncate">{agent.currentTask}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills preview */}
                {agent.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {agent.skills.slice(0, 4).map(s => <SkillBadge key={s} skill={s} />)}
                    {agent.skills.length > 4 && (
                      <span className="text-[9px] text-slate-600">+{agent.skills.length - 4} more</span>
                    )}
                  </div>
                )}

                {/* Last activity */}
                {agent.history.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/[0.04]">
                    <Clock3 size={9} className="text-slate-600" />
                    <p className="text-[9px] text-slate-500 truncate">{agent.history[0].action}</p>
                    <span className="text-[8px] text-slate-600 shrink-0">{agent.history[0].timestamp.split(" ")[1]}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {selectedAgent && (
          <div className="hidden lg:block w-[350px] glass-panel p-5 self-start sticky top-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center text-[18px]">
                {(() => { const Icon = ROLE_ICONS[selectedAgent.role] || Cpu; return <Icon size={20} className="text-white" />; })()}
              </div>
              <div>
                <p className="text-[16px] font-bold text-white">{selectedAgent.name}</p>
                <p className="text-[11px] text-slate-400">{selectedAgent.role}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 mb-4">
              <div className={cn("w-2 h-2 rounded-full",
                selectedAgent.status === "active" || selectedAgent.status === "working" ? "bg-emerald-400" :
                selectedAgent.status === "idle" ? "bg-amber-400" : "bg-slate-600"
              )} />
              <span className="text-[11px] text-slate-300 capitalize">{selectedAgent.status}</span>
              <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium ml-auto", MODEL_COLORS[selectedAgent.model || ""] || "text-slate-400 bg-slate-400/10")}>{selectedAgent.model}</span>
            </div>

            {selectedAgent.currentTask && (
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-4">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider">Current Task</p>
                <p className="text-[12px] text-white mt-1">{selectedAgent.currentTask}</p>
              </div>
            )}

            {/* Skills */}
            {selectedAgent.skills.length > 0 && (
              <div className="mb-4">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Skills ({selectedAgent.skills.length})</p>
                <div className="flex flex-wrap gap-1">
                  {selectedAgent.skills.map(s => <SkillBadge key={s} skill={s} />)}
                </div>
              </div>
            )}

            {/* History */}
            {selectedAgent.history.length > 0 && (
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">Activity Log</p>
                <div className="space-y-2">
                  {selectedAgent.history.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Clock3 size={10} className="text-slate-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] text-slate-300">{h.action}</p>
                        <p className="text-[8px] text-slate-600">{h.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Soul excerpt */}
            {selectedAgent.soul && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Personality</p>
                <p className="text-[10px] text-slate-400 leading-relaxed">{selectedAgent.soul.slice(0, 200)}...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
