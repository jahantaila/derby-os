"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronDown,
  Circle, Clock, Eye, Filter, GripVertical, LayoutGrid, List, Loader2,
  Plus, Search, Shield, ShieldAlert, User, X, Zap, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
type TaskStatus = "todo" | "in_progress" | "needs_kimberly_approval" | "needs_jahan_approval" | "done";
type TaskPriority = "urgent" | "high" | "medium" | "low";
type ViewMode = "kanban" | "list";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  category: string | null;
  due_date: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/* ── Constants ── */
const STATUSES: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "#64748b" },
  { id: "in_progress", label: "In Progress", color: "#2093FF" },
  { id: "needs_kimberly_approval", label: "Needs Kimberly Approval", color: "#FFBD59" },
  { id: "needs_jahan_approval", label: "Needs Jahan Approval", color: "#F93C3C" },
  { id: "done", label: "Done", color: "#22C55E" },
];

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Loader2,
  needs_kimberly_approval: Shield,
  needs_jahan_approval: ShieldAlert,
  done: CheckCircle2,
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: typeof Zap }> = {
  urgent: { label: "Urgent", color: "#F93C3C", icon: AlertTriangle },
  high: { label: "High", color: "#FFBD59", icon: Zap },
  medium: { label: "Medium", color: "#2093FF", icon: Circle },
  low: { label: "Low", color: "#64748b", icon: Circle },
};

const TEAM_MEMBERS = [
  { id: "jahan", name: "Jahan" },
  { id: "kimberly", name: "Kimberly" },
  { id: "alex", name: "Alex" },
  { id: "sabri", name: "Sabri" },
  { id: "kevin", name: "Kevin" },
  { id: "jordan", name: "Jordan" },
  { id: "hamza", name: "Hamza" },
  { id: "abdul", name: "Abdul" },
  { id: "elang", name: "Elang" },
];

const CATEGORIES = ["development", "marketing", "sales", "operations", "finance"];

function getNextStatus(current: TaskStatus): typeof STATUSES[number] | null {
  const order: TaskStatus[] = ["todo", "in_progress", "needs_kimberly_approval", "needs_jahan_approval", "done"];
  const idx = order.indexOf(current);
  if (idx < 0 || idx >= order.length - 1) return null;
  const nextId = order[idx + 1];
  if (nextId === "done") return null; // Only Jahan moves to done
  return STATUSES.find(s => s.id === nextId) || null;
}

/* ── Task Card ── */
function TaskCard({ task, onStatusChange, onDelete }: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_CONFIG[task.priority];
  const status = STATUSES.find(s => s.id === task.status)!;
  const StatusIcon = STATUS_ICONS[task.status];
  const assignee = TEAM_MEMBERS.find(m => m.id === task.assignee);
  const nextStatus = getNextStatus(task.status);
  const isAI = task.created_by && task.created_by !== "jahan";

  return (
    <div className={cn(
      "bg-white/[0.03] border rounded-lg p-3 hover:bg-white/[0.05] transition-all cursor-pointer group",
      task.priority === "urgent" ? "border-red-500/30" : "border-white/[0.06]",
    )} onClick={() => setExpanded(!expanded)}>
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
            {task.category && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-500 capitalize">{task.category}</span>
            )}
            {isAI && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400">AI</span>
            )}
            {task.due_date && (
              <span className={cn("text-[9px] flex items-center gap-0.5",
                new Date(task.due_date) < new Date() && task.status !== "done" ? "text-red-400" : "text-slate-600")}>
                <Calendar className="w-2.5 h-2.5" />
                {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
          {task.description && <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>}
          {task.notes && <p className="text-[10px] text-yellow-400/80 italic">{task.notes}</p>}

          <div className="flex items-center gap-2 pt-2">
            {task.status !== "done" && nextStatus && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, nextStatus.id); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                style={{ background: `${nextStatus.color}20`, color: nextStatus.color }}>
                <ArrowRight className="w-3 h-3" />
                Move to {nextStatus.label}
              </button>
            )}
            {task.status === "needs_jahan_approval" && (
              <button
                onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, "done"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:brightness-110 bg-green-500/20 text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Approve &amp; Done
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm("Delete this task?")) onDelete(task.id); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto">
              <X className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Add Task Modal ── */
function AddTaskModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Partial<Task>) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("kimberly");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [category, setCategory] = useState("");
  const [dueDate, setDueDate] = useState("");

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#12121a] border border-white/10 rounded-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Task</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:border-[#2093FF]" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details..." rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 outline-none focus:border-[#2093FF] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Assignee</label>
              <select value={assignee} onChange={e => setAssignee(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none">
                {TEAM_MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none">
                {Object.entries(PRIORITY_CONFIG).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none">
                <option value="">None</option>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white outline-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button
            disabled={!title.trim()}
            onClick={() => { onAdd({ title, description: description || null, assignee, priority, category: category || null, due_date: dueDate || null, created_by: "jahan" }); onClose(); }}
            className="px-4 py-2 bg-[#2093FF] text-white text-sm font-medium rounded-lg hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed">
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Auto-refresh every 30s
  useEffect(() => {
    const i = setInterval(fetchTasks, 30000);
    return () => clearInterval(i);
  }, [fetchTasks]);

  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
    } catch (e) {
      fetchTasks(); // Revert on error
    }
  };

  const handleDelete = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    } catch (e) {
      fetchTasks();
    }
  };

  const handleAdd = async (taskData: Partial<Task>) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      const data = await res.json();
      if (data.task) {
        fetchTasks(); // Refresh to get server-generated id
      }
    } catch (e) {
      console.error("Failed to create task:", e);
    }
  };

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterAssignee !== "all" && t.assignee !== filterAssignee) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, search, filterAssignee, filterPriority]);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], needs_kimberly_approval: [], needs_jahan_approval: [], done: [] };
    filtered.forEach(t => map[t.status]?.push(t));
    return map;
  }, [filtered]);

  const stats = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter(t => t.status !== "done").length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done").length,
    needsApproval: tasks.filter(t => t.status === "needs_jahan_approval").length,
  }), [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#2093FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.active} active
            {stats.overdue > 0 && <span className="text-red-400"> · {stats.overdue} overdue</span>}
            {stats.needsApproval > 0 && <span className="text-yellow-400"> · {stats.needsApproval} awaiting approval</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTasks} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2093FF] text-white text-sm font-medium rounded-lg hover:brightness-110">
            <Plus className="w-4 h-4" /> Add Task
          </button>
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

      {/* Empty State */}
      {tasks.length === 0 && !loading && (
        <div className="text-center py-20">
          <Circle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400">No tasks yet</h3>
          <p className="text-sm text-slate-600 mt-1">Add a task or Kimberly will start populating this board as work gets assigned.</p>
        </div>
      )}

      {/* Kanban View */}
      {view === "kanban" && tasks.length > 0 && (
        <div className="grid grid-cols-5 gap-4">
          {STATUSES.map(status => {
            const statusTasks = byStatus[status.id] || [];
            return (
              <div key={status.id} className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
                  <span className="text-xs font-medium text-slate-300">{status.label}</span>
                  <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full text-slate-500 ml-auto">{statusTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {statusTasks.sort((a, b) => {
                    const p = { urgent: 0, high: 1, medium: 2, low: 3 };
                    return p[a.priority] - p[b.priority];
                  }).map(task => (
                    <TaskCard key={task.id} task={task} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && tasks.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider p-4">Task</th>
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
                const status = STATUSES.find(s => s.id === task.status)!;
                const StatusIcon = STATUS_ICONS[task.status];
                const assignee = TEAM_MEMBERS.find(m => m.id === task.assignee);
                const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
                const isAI = task.created_by && task.created_by !== "jahan";

                return (
                  <tr key={task.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <StatusIcon className="w-4 h-4 flex-shrink-0" style={{ color: status.color }} />
                        <span className={cn("text-sm", task.status === "done" && "line-through text-slate-500")}>{task.title}</span>
                        {isAI && <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-400">AI</span>}
                      </div>
                    </td>
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
                      {task.due_date ? (
                        <span className={cn("text-xs font-mono", overdue ? "text-red-400" : "text-slate-500")}>
                          {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
        <span className="text-purple-400">AI = assigned by Kimberly</span>
        <span>·</span>
        <span className="text-red-400">Red dates = overdue</span>
        <span>·</span>
        <span>Auto-refreshes every 30s</span>
      </div>

      {/* Add Modal */}
      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  );
}
