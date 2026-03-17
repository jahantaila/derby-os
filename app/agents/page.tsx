"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, Brain, ChevronRight, Clock3, Code2, Cpu, Crown, Globe,
  LineChart, Megaphone, MessageSquare, Search, Shield, Target, User,
  Users, Wrench, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRecord } from "@/lib/agents";

const MODEL_COLORS: Record<string, string> = {
  Opus: "text-blue-400 bg-blue-400/10",
  Sonnet: "text-cyan-400 bg-cyan-400/10",
  Codex: "text-violet-400 bg-violet-400/10",
};

const DEPT_CONFIG: Record<string, { label: string; icon: typeof Brain; color: string; gradient: string }> = {
  Executive: { label: "Executive", icon: Crown, color: "#FFBD59", gradient: "from-yellow-500/10 to-amber-500/5" },
  Marketing: { label: "Marketing & Sales", icon: Megaphone, color: "#F93C3C", gradient: "from-red-500/10 to-pink-500/5" },
  Development: { label: "Engineering", icon: Code2, color: "#2093FF", gradient: "from-blue-500/10 to-cyan-500/5" },
  Fulfillment: { label: "Fulfillment", icon: Wrench, color: "#22C55E", gradient: "from-green-500/10 to-emerald-500/5" },
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  "CEO": Crown,
  "Chief of Staff": Brain,
  "Marketing Analyst": LineChart,
  "Ad Producer": Target,
  "Developer": Code2,
  "Operations Specialist": Globe,
  "Landing Pages": Code2,
  "Fulfillment": Wrench,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  active: { label: "Active", color: "#22C55E", pulse: true },
  working: { label: "Working", color: "#2093FF", pulse: true },
  idle: { label: "Idle", color: "#FFBD59", pulse: false },
  offline: { label: "Offline", color: "#64748b", pulse: false },
};

function AgentCard({ agent, selected, onClick }: { agent: AgentRecord; selected: boolean; onClick: () => void }) {
  const Icon = ROLE_ICONS[agent.role] || User;
  const status = STATUS_CONFIG[agent.status] || STATUS_CONFIG.offline;
  const modelColor = agent.model ? MODEL_COLORS[agent.model] || "text-slate-400 bg-white/5" : "";

  return (
    <div onClick={onClick}
      className={cn(
        "bg-white/[0.03] border rounded-xl p-4 cursor-pointer transition-all hover:bg-white/[0.05] group",
        selected ? "border-[#2093FF]/50 bg-[#2093FF]/5" : "border-white/[0.06]",
      )}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center",
          agent.type === "ceo" ? "bg-gradient-to-br from-yellow-500/20 to-amber-500/10" :
          agent.type === "agent" ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/10" :
          "bg-white/5")}>
          <Icon className="w-5 h-5" style={{ color: DEPT_CONFIG[agent.department]?.color || "#64748b" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{agent.name}</h3>
            {/* Status dot */}
            <div className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", status.pulse && "animate-pulse")}
                style={{ background: status.color }} />
              <span className="text-[9px]" style={{ color: status.color }}>{status.label}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">{agent.role}</p>

          {/* Model badge */}
          {agent.model && (
            <span className={cn("inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-mono", modelColor)}>
              {agent.model}
            </span>
          )}
          {agent.type === "employee" && (
            <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400">
              Human
            </span>
          )}
          {agent.type === "ceo" && (
            <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
              Boss
            </span>
          )}

          {/* Current task */}
          {agent.currentTask && (
            <p className="text-[10px] text-slate-600 mt-1.5 truncate">→ {agent.currentTask}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "agent" | "employee">("all");

  useEffect(() => {
    fetch("/api/agents").then(r => r.json()).then(setAgents).catch(() => {});
  }, []);

  const selectedAgent = useMemo(() => agents.find(a => a.id === selected), [agents, selected]);

  const departments = useMemo(() => {
    const depts = ["Executive", "Marketing", "Development", "Fulfillment"];
    return depts.map(dept => ({
      ...DEPT_CONFIG[dept],
      dept,
      members: agents.filter(a => {
        if (filter === "agent" && a.type !== "agent") return false;
        if (filter === "employee" && a.type === "agent") return false;
        return a.department === dept;
      }),
    })).filter(d => d.members.length > 0);
  }, [agents, filter]);

  const stats = useMemo(() => ({
    total: agents.length,
    ai: agents.filter(a => a.type === "agent").length,
    human: agents.filter(a => a.type === "employee" || a.type === "ceo").length,
    active: agents.filter(a => a.status === "active" || a.status === "working").length,
  }), [agents]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.ai} AI agents · {stats.human} humans · {stats.active} active now
          </p>
        </div>
        <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
          {(["all", "agent", "employee"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium capitalize",
                filter === f ? "bg-[#2093FF] text-white" : "text-slate-400 hover:text-white")}>
              {f === "all" ? "All" : f === "agent" ? "AI Agents" : "Humans"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left — Department Grid */}
        <div className="flex-1 space-y-6">
          {departments.map(dept => {
            const DeptIcon = dept.icon;
            return (
              <div key={dept.dept}>
                {/* Department Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br", dept.gradient)}>
                    <DeptIcon className="w-3.5 h-3.5" style={{ color: dept.color }} />
                  </div>
                  <h2 className="text-sm font-semibold" style={{ color: dept.color }}>{dept.label}</h2>
                  <span className="text-[10px] text-slate-600 ml-1">({dept.members.length})</span>
                </div>

                {/* Agent Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dept.members.map(agent => (
                    <AgentCard key={agent.id} agent={agent} selected={selected === agent.id}
                      onClick={() => setSelected(selected === agent.id ? null : agent.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right — Detail Panel */}
        {selectedAgent && (
          <div className="w-96 flex-shrink-0 bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-5 sticky top-6 self-start">
            {/* Agent Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2093FF]/20 to-[#0026FF]/10 flex items-center justify-center">
                {(() => { const I = ROLE_ICONS[selectedAgent.role] || User; return <I className="w-6 h-6 text-[#2093FF]" />; })()}
              </div>
              <div>
                <h3 className="text-lg font-bold">{selectedAgent.name}</h3>
                <p className="text-sm text-slate-400">{selectedAgent.role}</p>
                <div className="flex items-center gap-2 mt-1">
                  {selectedAgent.model && (
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-mono", MODEL_COLORS[selectedAgent.model])}>
                      {selectedAgent.model}
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                    background: `${DEPT_CONFIG[selectedAgent.department]?.color || "#64748b"}20`,
                    color: DEPT_CONFIG[selectedAgent.department]?.color || "#64748b",
                  }}>{selectedAgent.department}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", STATUS_CONFIG[selectedAgent.status]?.pulse && "animate-pulse")}
                  style={{ background: STATUS_CONFIG[selectedAgent.status]?.color }} />
                <span className="text-sm font-medium">{STATUS_CONFIG[selectedAgent.status]?.label}</span>
              </div>
              {selectedAgent.currentTask && (
                <p className="text-xs text-slate-400 mt-1.5">Current: {selectedAgent.currentTask}</p>
              )}
            </div>

            {/* Skills */}
            {selectedAgent.skills.length > 0 && (
              <div>
                <h4 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Skills ({selectedAgent.skills.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.skills.map(skill => (
                    <span key={skill} className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[9px] text-slate-500">
                      {skill.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Soul */}
            {selectedAgent.soul && (
              <div>
                <h4 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">About</h4>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-6">{selectedAgent.soul.split("\n")[0]}</p>
              </div>
            )}

            {/* History */}
            {selectedAgent.history.length > 0 && (
              <div>
                <h4 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Recent Activity</h4>
                <div className="space-y-2">
                  {selectedAgent.history.slice(0, 5).map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Clock3 className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-slate-400">{h.action}</p>
                        <p className="text-[9px] text-slate-600">{h.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
