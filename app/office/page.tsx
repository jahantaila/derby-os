"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity, Brain, Code2, Coffee, Crown, Globe, LineChart,
  MessageSquare, Monitor, Target, Users, Wrench, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRecord } from "@/lib/agents";

// ─── Agent desk configs ───
const DESK_DATA: Record<string, {
  emoji: string;
  title: string;
  dept: string;
  deptColor: string;
  position: { row: number; col: number };
  monitors: string[];
}> = {
  jahan: {
    emoji: "👑", title: "CEO", dept: "Executive", deptColor: "#FFBD59",
    position: { row: 0, col: 1 },
    monitors: ["Stripe", "GHL", "Derby OS"],
  },
  kimberly: {
    emoji: "🧠", title: "Chief of Staff", dept: "Executive", deptColor: "#2093FF",
    position: { row: 0, col: 2 },
    monitors: ["Discord", "Gmail", "Mission Control"],
  },
  alex: {
    emoji: "📊", title: "Marketing Analyst", dept: "Marketing", deptColor: "#F93C3C",
    position: { row: 1, col: 0 },
    monitors: ["Meta Ads", "Analytics", "Reports"],
  },
  sabri: {
    emoji: "🎯", title: "Ad Producer", dept: "Marketing", deptColor: "#F93C3C",
    position: { row: 1, col: 1 },
    monitors: ["Google Ads", "Landing Pages", "Copy"],
  },
  jordan: {
    emoji: "🌐", title: "Operations", dept: "Marketing", deptColor: "#F93C3C",
    position: { row: 1, col: 2 },
    monitors: ["GHL CRM", "Instantly", "SpotHopper"],
  },
  kevin: {
    emoji: "💻", title: "Developer", dept: "Engineering", deptColor: "#2093FF",
    position: { row: 2, col: 0 },
    monitors: ["VS Code", "Terminal", "Vercel"],
  },
  hamza: {
    emoji: "🎨", title: "Landing Pages", dept: "Engineering", deptColor: "#2093FF",
    position: { row: 2, col: 1 },
    monitors: ["Framer", "Figma", "WordPress"],
  },
  abdul: {
    emoji: "⚙️", title: "Fulfillment", dept: "Fulfillment", deptColor: "#22C55E",
    position: { row: 2, col: 2 },
    monitors: ["Cloudways", "Client Sites"],
  },
  elang: {
    emoji: "🔧", title: "Fulfillment", dept: "Fulfillment", deptColor: "#22C55E",
    position: { row: 2, col: 3 },
    monitors: ["Tasks", "Support"],
  },
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22C55E",
  working: "#2093FF",
  idle: "#FFBD59",
  offline: "#64748b",
};

function IsometricDesk({ agent, desk, onClick, selected }: {
  agent?: AgentRecord;
  desk: typeof DESK_DATA[string] & { id: string };
  onClick: () => void;
  selected: boolean;
}) {
  const status = agent?.status || "offline";
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.offline;
  const isActive = status === "active" || status === "working";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer transition-all duration-300 group",
        selected && "scale-110 z-20",
        !selected && "hover:scale-105 hover:z-10",
      )}
      style={{
        width: 180,
        height: 200,
        perspective: "800px",
      }}
    >
      {/* Desk surface - isometric */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        height: 120,
        transform: "rotateX(60deg) rotateZ(-45deg)",
        transformOrigin: "bottom center",
      }}>
        {/* Desk top */}
        <div className={cn(
          "absolute inset-0 rounded-lg border transition-all duration-300",
          selected ? "border-[#2093FF]/50 shadow-[0_0_20px_rgba(32,147,255,0.3)]" : "border-white/10",
        )} style={{
          background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
          backdropFilter: "blur(10px)",
        }}>
          {/* Monitor glow */}
          {isActive && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-6 rounded-sm animate-pulse" style={{
              background: `radial-gradient(circle, ${desk.deptColor}40, transparent)`,
            }} />
          )}
        </div>
      </div>

      {/* Agent avatar */}
      <div className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all",
        "bg-gradient-to-br from-white/10 to-white/5 border border-white/10",
        isActive && "animate-[float_3s_ease-in-out_infinite]",
      )} style={{
        boxShadow: isActive ? `0 4px 20px ${statusColor}40` : "none",
      }}>
        {desk.emoji}
        {/* Status indicator */}
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0a0a0f]",
          isActive && "animate-pulse",
        )} style={{ background: statusColor }} />
      </div>

      {/* Name & info */}
      <div className="absolute bottom-[85px] left-0 right-0 text-center">
        <p className="text-sm font-semibold text-white">{agent?.name || desk.id}</p>
        <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: desk.deptColor }}>
          {desk.title}
        </p>
        {agent?.currentTask && isActive && (
          <p className="text-[9px] text-slate-500 mt-1 truncate px-2">
            {agent.currentTask}
          </p>
        )}
      </div>

      {/* Model badge */}
      {agent?.model && (
        <div className="absolute top-2 right-2 text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500 font-mono">
          {agent.model}
        </div>
      )}

      {/* Department badge */}
      <div className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded-full font-medium"
        style={{ background: `${desk.deptColor}15`, color: desk.deptColor }}>
        {desk.dept}
      </div>
    </div>
  );
}

export default function OfficePage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    fetch("/api/agents").then(r => r.json()).then(setAgents).catch(() => {});
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedAgent = useMemo(() => agents.find(a => a.id === selected), [agents, selected]);
  const deskEntries = useMemo(() =>
    Object.entries(DESK_DATA).map(([id, desk]) => ({ ...desk, id })),
    []
  );

  const stats = useMemo(() => ({
    active: agents.filter(a => a.status === "active" || a.status === "working").length,
    total: agents.length,
    ai: agents.filter(a => a.type === "agent").length,
    human: agents.filter(a => a.type === "employee" || a.type === "ceo").length,
  }), [agents]);

  // Group desks by row
  const rows = useMemo(() => {
    const grouped: Record<number, typeof deskEntries> = {};
    deskEntries.forEach(d => {
      if (!grouped[d.position.row]) grouped[d.position.row] = [];
      grouped[d.position.row].push(d);
    });
    return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
  }, [deskEntries]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">The Office</h1>
            <p className="text-slate-500 text-sm mt-1">
              Derby Digital HQ — {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-slate-300">{stats.active} active</span>
              <span className="text-slate-600">·</span>
              <span className="text-sm text-slate-500">{stats.total} team</span>
            </div>
          </div>
        </div>

        {/* Department legend */}
        <div className="flex items-center gap-4 mt-4">
          {[
            { name: "Executive", color: "#FFBD59", icon: Crown },
            { name: "Marketing", color: "#F93C3C", icon: Target },
            { name: "Engineering", color: "#2093FF", icon: Code2 },
            { name: "Fulfillment", color: "#22C55E", icon: Wrench },
          ].map(dept => (
            <div key={dept.name} className="flex items-center gap-1.5">
              <dept.icon className="w-3 h-3" style={{ color: dept.color }} />
              <span className="text-[10px] text-slate-500">{dept.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3D Office Floor */}
      <div className="relative mt-8 px-6" style={{
        perspective: "1200px",
        perspectiveOrigin: "50% 30%",
      }}>
        {/* Floor */}
        <div className="relative mx-auto" style={{
          maxWidth: 900,
          transform: "rotateX(15deg)",
          transformStyle: "preserve-3d",
        }}>
          {/* Floor grid */}
          <div className="absolute inset-0 -m-10 rounded-2xl" style={{
            background: `
              radial-gradient(circle at 50% 50%, rgba(32,147,255,0.05), transparent 70%),
              repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 60px),
              repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, transparent 1px, transparent 60px)
            `,
            transform: "translateZ(-2px)",
          }} />

          {/* Desk rows */}
          <div className="space-y-2 py-8">
            {rows.map(([rowIdx, desks]) => (
              <div key={rowIdx} className="flex justify-center gap-4 flex-wrap">
                {/* Row label */}
                <div className="w-full flex justify-center mb-2">
                  <span className="text-[9px] uppercase tracking-widest text-slate-700">
                    {rowIdx === "0" ? "Executive Row" : rowIdx === "1" ? "Marketing Row" : "Engineering & Fulfillment Row"}
                  </span>
                </div>
                {desks.sort((a, b) => a.position.col - b.position.col).map(desk => {
                  const agent = agents.find(a => a.id === desk.id);
                  return (
                    <IsometricDesk
                      key={desk.id}
                      agent={agent}
                      desk={desk}
                      selected={selected === desk.id}
                      onClick={() => setSelected(selected === desk.id ? null : desk.id)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Agent Detail */}
      {selectedAgent && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 p-6 z-30 animate-in slide-in-from-bottom">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-6">
              {/* Agent info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{DESK_DATA[selectedAgent.id]?.emoji}</span>
                  <div>
                    <h3 className="text-lg font-bold">{selectedAgent.name}</h3>
                    <p className="text-sm text-slate-400">{selectedAgent.role}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full",
                      (selectedAgent.status === "active" || selectedAgent.status === "working") && "animate-pulse")}
                      style={{ background: STATUS_COLORS[selectedAgent.status] }} />
                    <span className="text-sm capitalize" style={{ color: STATUS_COLORS[selectedAgent.status] }}>
                      {selectedAgent.status}
                    </span>
                  </div>
                </div>

                {selectedAgent.currentTask && (
                  <div className="bg-white/5 rounded-lg p-3 mb-3">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Current Task</p>
                    <p className="text-sm text-white">{selectedAgent.currentTask}</p>
                  </div>
                )}

                {/* Monitors */}
                <div className="flex gap-2 mb-3">
                  {DESK_DATA[selectedAgent.id]?.monitors.map(m => (
                    <div key={m} className="flex items-center gap-1.5 bg-white/5 rounded-md px-2.5 py-1.5 border border-white/5">
                      <Monitor className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] text-slate-400">{m}</span>
                    </div>
                  ))}
                </div>

                {/* Skills */}
                {selectedAgent.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedAgent.skills.map(s => (
                      <span key={s} className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-600">
                        {s.replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Activity log */}
              <div className="w-72 flex-shrink-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Recent Activity</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedAgent.history.slice(0, 5).map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Activity className="w-3 h-3 text-slate-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] text-slate-400">{h.action}</p>
                        <p className="text-[9px] text-slate-600">{h.timestamp}</p>
                      </div>
                    </div>
                  ))}
                  {selectedAgent.history.length === 0 && (
                    <p className="text-[11px] text-slate-600">No recent activity</p>
                  )}
                </div>
              </div>
            </div>

            <button onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors text-sm">
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* Float animation keyframes */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
