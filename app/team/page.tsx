"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ChevronDown, ChevronRight, Circle, Clock, Code,
  Cpu, Crown, Loader2, RefreshCw, Search, Shield, Target,
  TrendingUp, User, Zap, X, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
interface Agent {
  id: string;
  name: string;
  role: string;
  department: string;
  department_color: string;
  model: string | null;
  status: string;
  avatar_emoji: string | null;
  about: string | null;
  skills: string[];
  current_task: string | null;
  total_tasks_completed: number;
  last_active: string;
  active_tasks: { id: string; title: string; status: string; priority: string }[];
  active_task_count: number;
}

/* ── Constants ── */
const DEPT_ICONS: Record<string, typeof Crown> = {
  Executive: Crown,
  Marketing: Target,
  Sales: TrendingUp,
  Development: Code,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  active: { label: "Online", color: "#22C55E", pulse: true },
  working: { label: "Working", color: "#FFBD59", pulse: true },
  idle: { label: "Idle", color: "#64748b", pulse: false },
  offline: { label: "Offline", color: "#374151", pulse: false },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#F93C3C",
  high: "#FFBD59",
  medium: "#2093FF",
  low: "#64748b",
};

/* ── Agent Card ── */
function AgentCard({ agent, isExpanded, onToggle }: { agent: Agent; isExpanded: boolean; onToggle: () => void }) {
  const DeptIcon = DEPT_ICONS[agent.department] || Cpu;
  const statusConf = STATUS_CONFIG[agent.active_task_count > 0 ? "working" : agent.status] || STATUS_CONFIG.active;
  const topTask = agent.active_tasks[0];

  return (
    <div className={cn(
      "bg-white/[0.02] border rounded-xl transition-all overflow-hidden",
      isExpanded ? "border-white/[0.12]" : "border-white/[0.06] hover:border-white/[0.1]"
    )}>
      {/* Main row */}
      <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={onToggle}>
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: `${agent.department_color}15` }}>
            {agent.avatar_emoji || "🤖"}
          </div>
          <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0f]", statusConf.pulse && "animate-pulse")}
            style={{ background: statusConf.color }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{agent.name}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${agent.department_color}15`, color: agent.department_color }}>
              {agent.department}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{agent.role}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mr-4">
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-white">{agent.active_task_count}</div>
            <div className="text-[9px] text-slate-600 uppercase tracking-wider">Active</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold font-mono text-white">{agent.total_tasks_completed}</div>
            <div className="text-[9px] text-slate-600 uppercase tracking-wider">Done</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: statusConf.color }} />
            <span className="text-xs" style={{ color: statusConf.color }}>{statusConf.label}</span>
          </div>
        </div>

        {/* Current task preview */}
        {topTask && (
          <div className="hidden lg:flex items-center gap-2 max-w-[250px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5">
            <Zap className="w-3 h-3 flex-shrink-0" style={{ color: PRIORITY_COLORS[topTask.priority] || "#2093FF" }} />
            <span className="text-[11px] text-slate-400 truncate">{topTask.title}</span>
          </div>
        )}

        {/* Expand arrow */}
        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </div>

      {/* Expanded detail panel */}
      {isExpanded && (
        <div className="border-t border-white/[0.06] bg-white/[0.01]">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* About */}
            <div className="lg:col-span-2 space-y-4">
              {agent.about && (
                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">About</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{agent.about}</p>
                </div>
              )}

              {/* Active Tasks */}
              <div>
                <h4 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                  Active Tasks ({agent.active_task_count})
                </h4>
                {agent.active_tasks.length > 0 ? (
                  <div className="space-y-1.5">
                    {agent.active_tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: PRIORITY_COLORS[t.priority] || "#2093FF" }} />
                        <span className="text-xs text-slate-300 flex-1">{t.title}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize"
                          style={{
                            background: t.status === "in_progress" ? "#2093FF15" : t.status === "needs_kimberly_approval" ? "#FFBD5915" : t.status === "needs_jahan_approval" ? "#F93C3C15" : "#64748b15",
                            color: t.status === "in_progress" ? "#2093FF" : t.status === "needs_kimberly_approval" ? "#FFBD59" : t.status === "needs_jahan_approval" ? "#F93C3C" : "#64748b",
                          }}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic">No active tasks — standing by</p>
                )}
              </div>
            </div>

            {/* Right column: Skills + Meta */}
            <div className="space-y-4">
              {/* Model */}
              {agent.model && (
                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Model</h4>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-sm text-slate-300">{agent.model}</span>
                  </div>
                </div>
              )}

              {/* Skills */}
              {agent.skills.length > 0 && (
                <div>
                  <h4 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Skills ({agent.skills.length})</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {agent.skills.map(s => (
                      <span key={s} className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-slate-400">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Active */}
              <div>
                <h4 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Last Active</h4>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">
                    {new Date(agent.last_active).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function TeamPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);
  useEffect(() => { const i = setInterval(fetchAgents, 30000); return () => clearInterval(i); }, [fetchAgents]);

  const departments = useMemo(() => [...new Set(agents.map(a => a.department))], [agents]);

  const filtered = useMemo(() => {
    return agents.filter(a => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.role.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterDept !== "all" && a.department !== filterDept) return false;
      return true;
    });
  }, [agents, search, filterDept]);

  const grouped = useMemo(() => {
    const map: Record<string, Agent[]> = {};
    filtered.forEach(a => { (map[a.department] ??= []).push(a); });
    return map;
  }, [filtered]);

  const stats = useMemo(() => ({
    total: agents.length,
    working: agents.filter(a => a.active_task_count > 0).length,
    totalTasks: agents.reduce((sum, a) => sum + a.active_task_count, 0),
    totalCompleted: agents.reduce((sum, a) => sum + a.total_tasks_completed, 0),
  }), [agents]);

  if (loading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#2093FF]" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.total} agents · {stats.working} working · {stats.totalTasks} active tasks · {stats.totalCompleted} completed
          </p>
        </div>
        <button onClick={fetchAgents} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Agents", value: stats.total, color: "#2093FF", icon: User },
          { label: "Currently Working", value: stats.working, color: "#22C55E", icon: Activity },
          { label: "Active Tasks", value: stats.totalTasks, color: "#FFBD59", icon: Zap },
          { label: "Tasks Completed", value: stats.totalCompleted, color: "#A855F7", icon: CheckCircle2 },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{kpi.label}</span>
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search agents..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:border-[#2093FF] outline-none" />
        </div>
        <div className="flex bg-white/5 rounded-lg p-0.5">
          <button onClick={() => setFilterDept("all")}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium", filterDept === "all" ? "bg-[#2093FF] text-white" : "text-slate-400")}>
            All
          </button>
          {departments.map(dept => {
            const DeptIcon = DEPT_ICONS[dept] || Cpu;
            const agent = agents.find(a => a.department === dept);
            const color = agent?.department_color || "#666";
            return (
              <button key={dept} onClick={() => setFilterDept(dept)}
                className={cn("px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5",
                  filterDept === dept ? "text-white" : "text-slate-400")}
                style={filterDept === dept ? { background: `${color}30`, color } : {}}>
                <DeptIcon className="w-3 h-3" />
                {dept}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agent List by Department */}
      {Object.entries(grouped).map(([dept, deptAgents]) => {
        const DeptIcon = DEPT_ICONS[dept] || Cpu;
        const color = deptAgents[0]?.department_color || "#666";
        return (
          <div key={dept} className="space-y-3">
            <div className="flex items-center gap-2">
              <DeptIcon className="w-4 h-4" style={{ color }} />
              <h2 className="text-sm font-semibold" style={{ color }}>{dept}</h2>
              <span className="text-[10px] text-slate-600">{deptAgents.length} agent{deptAgents.length > 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-2">
              {deptAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isExpanded={expandedId === agent.id}
                  onToggle={() => setExpandedId(expandedId === agent.id ? null : agent.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-600">
        <span>Auto-refreshes every 30s</span>
        <span>·</span>
        <span>Tasks pulled live from Supabase</span>
        <span>·</span>
        <span>Add agents via API — page auto-discovers</span>
      </div>
    </div>
  );
}
