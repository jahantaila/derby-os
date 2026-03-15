"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, Brain, Building2, Clock3, Coffee, Code2, LineChart,
  MessageSquare, Monitor, Search, Target, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentRecord } from "@/lib/agents";

const DESK_CONFIGS: Record<string, {
  emoji: string;
  deskColor: string;
  statusActivities: Record<string, { icon: React.ElementType; label: string; animation?: string }>;
  monitors: string[];
}> = {
  kimberly: {
    emoji: "👩‍💼",
    deskColor: "from-blue-500/20 to-indigo-500/10",
    statusActivities: {
      active: { icon: MessageSquare, label: "Coordinating team", animation: "animate-pulse" },
      working: { icon: Brain, label: "Deep in strategy", animation: "animate-bounce" },
      idle: { icon: Coffee, label: "On break" },
      offline: { icon: Monitor, label: "Away" },
    },
    monitors: ["Discord", "GHL Pipeline", "Derby OS"],
  },
  alex: {
    emoji: "📊",
    deskColor: "from-emerald-500/20 to-cyan-500/10",
    statusActivities: {
      active: { icon: LineChart, label: "Analyzing campaigns", animation: "animate-pulse" },
      working: { icon: Search, label: "Deep in data", animation: "animate-bounce" },
      idle: { icon: Coffee, label: "Between analyses" },
      offline: { icon: Monitor, label: "Offline" },
    },
    monitors: ["Meta Ads Manager", "Analytics", "Reports"],
  },
  sabri: {
    emoji: "🎯",
    deskColor: "from-orange-500/20 to-red-500/10",
    statusActivities: {
      active: { icon: Target, label: "Building campaigns", animation: "animate-pulse" },
      working: { icon: Zap, label: "Writing ad copy", animation: "animate-bounce" },
      idle: { icon: Coffee, label: "Waiting for brief" },
      offline: { icon: Monitor, label: "Offline" },
    },
    monitors: ["Google Ads", "Landing Pages", "Copy Docs"],
  },
  kevin: {
    emoji: "💻",
    deskColor: "from-violet-500/20 to-purple-500/10",
    statusActivities: {
      active: { icon: Code2, label: "Shipping code", animation: "animate-pulse" },
      working: { icon: Code2, label: "Deep in build", animation: "animate-bounce" },
      idle: { icon: Coffee, label: "Between tasks" },
      offline: { icon: Monitor, label: "Offline" },
    },
    monitors: ["VS Code", "Terminal", "Derby OS"],
  },
  jordan: {
    emoji: "🔍",
    deskColor: "from-cyan-500/20 to-blue-500/10",
    statusActivities: {
      active: { icon: Activity, label: "Syncing leads", animation: "animate-pulse" },
      working: { icon: Search, label: "Scraping data", animation: "animate-bounce" },
      idle: { icon: Coffee, label: "Sync complete" },
      offline: { icon: Monitor, label: "Offline" },
    },
    monitors: ["GHL CRM", "Instantly", "Scraper"],
  },
};

function AgentDesk({ agent }: { agent: AgentRecord }) {
  const config = DESK_CONFIGS[agent.id] || {
    emoji: "🤖", deskColor: "from-slate-500/20 to-slate-500/10",
    statusActivities: { active: { icon: Activity, label: "Working" }, idle: { icon: Coffee, label: "Idle" }, offline: { icon: Monitor, label: "Offline" }, working: { icon: Zap, label: "Busy" } },
    monitors: ["Dashboard"],
  };
  const activity = config.statusActivities[agent.status] || config.statusActivities.idle;
  const ActivityIcon = activity.icon;
  const isOnline = agent.status === "active" || agent.status === "working";

  return (
    <div className={cn(
      "relative rounded-2xl border p-5 transition-all duration-500",
      isOnline ? "border-white/[0.1] bg-gradient-to-br shadow-lg shadow-blue-500/[0.03]" : "border-white/[0.05] bg-white/[0.01] opacity-60",
      config.deskColor,
    )}>
      {/* Status light */}
      <div className={cn(
        "absolute top-3 right-3 w-2.5 h-2.5 rounded-full",
        agent.status === "active" || agent.status === "working" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]" :
        agent.status === "idle" ? "bg-amber-400" : "bg-slate-600",
        isOnline && "animate-pulse"
      )} />

      {/* Agent avatar area */}
      <div className="flex items-start gap-4">
        <div className="relative">
          {/* Desk */}
          <div className="w-20 h-14 rounded-lg bg-[#1a1a2e] border border-white/[0.08] flex items-end justify-center pb-1 relative overflow-hidden">
            {/* Monitor glow */}
            {isOnline && <div className="absolute inset-0 bg-blue-500/[0.05]" />}
            {/* Monitors */}
            <div className="flex gap-0.5">
              {config.monitors.slice(0, 2).map((m, i) => (
                <div key={i} className={cn(
                  "w-7 h-5 rounded-sm border text-[4px] flex items-center justify-center",
                  isOnline ? "border-blue-500/30 bg-blue-500/[0.08] text-blue-300" : "border-white/[0.06] bg-white/[0.02] text-slate-600"
                )}>
                  {m.slice(0, 3)}
                </div>
              ))}
            </div>
          </div>
          {/* Chair / Agent */}
          <div className={cn(
            "absolute -bottom-3 left-1/2 -translate-x-1/2 text-2xl transition-all",
            isOnline ? "" : "grayscale opacity-50",
            activity.animation,
          )}>
            {config.emoji}
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <p className="text-[14px] font-bold text-white">{agent.name}</p>
          <p className="text-[11px] text-slate-400">{agent.role}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <ActivityIcon size={12} className={cn(
              isOnline ? "text-emerald-400" : "text-slate-500",
              activity.animation
            )} />
            <span className={cn("text-[10px]", isOnline ? "text-emerald-300" : "text-slate-500")}>
              {agent.currentTask || activity.label}
            </span>
          </div>
          <p className="text-[9px] text-slate-600 mt-1 uppercase">{agent.model || "Human"}</p>
        </div>
      </div>

      {/* Activity log */}
      {agent.history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5">Recent</p>
          {agent.history.slice(0, 2).map((h, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              <Clock3 size={9} className="text-slate-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] text-slate-400 leading-tight">{h.action}</p>
                <p className="text-[8px] text-slate-600">{h.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OfficePage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    fetch("/api/agents").then(r => r.json()).then(setAgents).catch(() => {});
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const aiAgents = agents.filter(a => a.type === "agent");
  const humans = agents.filter(a => a.type === "ceo" || a.type === "employee");
  const activeCount = aiAgents.filter(a => a.status === "active" || a.status === "working").length;

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="glass-panel p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Derby Digital</p>
              <h1 className="text-[20px] font-bold text-white">The Office</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-mono text-white">{time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
            <p className="text-[11px] text-slate-500">{activeCount}/{aiAgents.length} agents online</p>
          </div>
        </div>
      </div>

      {/* Office floor */}
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">🤖 AI Agents</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {aiAgents.map(a => <AgentDesk key={a.id} agent={a} />)}
        </div>
      </div>

      {humans.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">👥 Team</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {humans.map(a => <AgentDesk key={a.id} agent={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
