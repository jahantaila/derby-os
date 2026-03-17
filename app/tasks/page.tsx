"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronDown,
  Circle, Clock, Eye, Filter, GripVertical, LayoutGrid, List, Loader2,
  Plus, Search, Shield, ShieldAlert, User, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INITIAL_TASKS, TASK_STATUSES, TEAM_MEMBERS,
  type TaskRecord, type TaskStatus, type TaskPriority,
} from "@/lib/tasks-schema";

type ViewMode = "kanban" | "list";

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: typeof Zap }> = {
  urgent: { label: "Urgent", color: "#F93C3C", icon: AlertTriangle },
  high: { label: "High", color: "#FFBD59", icon: Zap },
  medium: { label: "Medium", color: "#2093FF", icon: Circle },
  low: { label: "Low", color: "#64748b", icon: Circle },
};

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  "todo": Circle,
  "in-progress": Loader2,
  "needs-kimberly-approval": Shield,
  "needs-jahan-approval": ShieldAlert,
  "done": CheckCircle2,
};

function TaskCard({ task, onStatusChange }: { task: TaskRecord; onStatusChange: (id: string, status: TaskStatus) => void }) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_CONFIG[task.priority];
  const status = TASK_STATUSES.find(s => s.id === task.status)!;
  const StatusIcon = STATUS_ICONS[task.status];
  const assignee = TEAM_MEMBERS.find(m => m.id === task.assignee);
  const nextStatus = getNextStatus(task.status);

  return (
    <div className={cn(
      "bg-white/[0.03] border rounded-lg p-3 hover:bg-white/[0.05] transition-all cursor-pointer group",
      task.priority === "urgent" ? "border-red-500/30" : "border-white/[0.06]",
    )} onClick={() => setExpanded(!expanded)}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <StatusIcon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: status.color }} />
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium leading-tight", task.status === "done" && "line-through text-slate-500")}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${priority.color}20`, color: priority.color }}>
              {priority.label}
            </span>
            {task.client && task.client !== "Derby Digital" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500">{task.client}</span>
            )}
            {task.source === "ai" && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400">AI</span>
            )}
            {task.dueDate && (
              <span className={cn("text-[9px] flex items-center gap-0.5",
                new Date(task.dueDate) < new Date() && task.status !== "done" ? "text-red-400" : "text-slate-600")}>
                <Calendar className="w-2.5 h-2.5" />
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        </div>
        {assignee && (
          <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
            <User className="w-2.5 h-2.5 text-slate-500" />
            <span className="text-[9px] text-slate-400">{assignee.name}</span>
          </div>
        )}
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
          {task.notes && <p className="text-[10px] text-yellow-400/80 italic">{task.notes}</p>}

          {/* Status Actions */}
          {task.status !== "done" && nextStatus && (
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, nextStatus.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                style={{ background: `${nextStatus.color}20`, color: nextStatus.color }}>
                <ArrowRight className="w-3 h-3" />
                Move to {nextStatus.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getNextStatus(current: TaskStatus): typeof TASK_STATUSES[number] | null {
  const order: TaskStatus[] = ["todo", "in-progress", "needs-kimberly-approval", "needs-jahan-approval", "done"];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  // Skip "done" — only Jahan can move there
  const nextId = order[idx + 1];
  if (nextId === "done") return null; // Can't auto-move to done
  return TASK_STATUSES.find(s => s.id === nextId) || null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>(INITIAL_TASKS);
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const handleStatusChange = (id: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, updatedAt: new Date().toISOString().slice(0, 10) } : t));
  };

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.client.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterAssignee !== "all" && t.assignee !== filterAssignee) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, search, filterAssignee, filterPriority]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskRecord[]> = { "todo": [], "in-progress": [], "needs-kimberly-approval": [], "needs-jahan-approval": [], "done": [] };
    filtered.forEach(t => map[t.status]?.push(t));
    return map;
  }, [filtered]);

  const stats = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter(t => t.status !== "done").length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done").length,
    needsApproval: tasks.filter(t => t.status === "needs-jahan-approval").length,
  }), [tasks]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.active} active · {stats.overdue > 0 && <span className="text-red-400">{stats.overdue} overdue · </span>}
            {stats.needsApproval > 0 && <span className="text-yellow-400">{stats.needsApproval} awaiting approval</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button onClick={() => setView("kanban")} className={cn("p-2 rounded-md", view === "kanban" && "bg-[#2093FF] text-white")}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView("list")} className={cn("p-2 rounded-md", view === "list" && "bg-[#2093FF] text-white")}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:border-[#2093FF] outline-none" />
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm border",
            showFilters ? "bg-[#2093FF]/10 border-[#2093FF]/30 text-[#2093FF]" : "bg-white/5 border-white/10 text-slate-400")}>
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Assignee</label>
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
              <option value="all">All</option>
              {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Priority</label>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none">
              <option value="all">All</option>
              {Object.entries(PRIORITY_CONFIG).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && (
        <div className="grid grid-cols-5 gap-4">
          {TASK_STATUSES.map(status => {
            const statusTasks = byStatus[status.id] || [];
            return (
              <div key={status.id} className="space-y-3">
                {/* Column Header */}
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                  <span className="text-xs font-medium text-slate-300">{status.label}</span>
                  <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full text-slate-500 ml-auto">{statusTasks.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2 min-h-[200px]">
                  {statusTasks.sort((a, b) => {
                    const p = { urgent: 0, high: 1, medium: 2, low: 3 };
                    return p[a.priority] - p[b.priority];
                  }).map(task => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Task</th>
                <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Client</th>
                <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Assignee</th>
                <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Priority</th>
                <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Status</th>
                <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Due</th>
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => {
                const p = { urgent: 0, high: 1, medium: 2, low: 3 };
                return p[a.priority] - p[b.priority];
              }).map(task => {
                const priority = PRIORITY_CONFIG[task.priority];
                const status = TASK_STATUSES.find(s => s.id === task.status)!;
                const StatusIcon = STATUS_ICONS[task.status];
                const assignee = TEAM_MEMBERS.find(m => m.id === task.assignee);
                const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";

                return (
                  <tr key={task.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-4 h-4 flex-shrink-0" style={{ color: status.color }} />
                        <span className={cn("text-sm", task.status === "done" && "line-through text-slate-500")}>{task.title}</span>
                        {task.source === "ai" && <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400">AI</span>}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-400">{task.client}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span className="text-sm text-slate-400">{assignee?.name || task.assignee}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${priority.color}20`, color: priority.color }}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: `${status.color}20`, color: status.color }}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4">
                      {task.dueDate ? (
                        <span className={cn("text-xs font-mono", overdue ? "text-red-400" : "text-slate-500")}>
                          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      ) : <span className="text-xs text-slate-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-600">
        <span>Only Jahan can move tasks to Done</span>
        <span>·</span>
        <span className="text-purple-400">AI = auto-assigned by Kimberly</span>
        <span>·</span>
        <span className="text-red-400">Red dates = overdue</span>
      </div>
    </div>
  );
}
