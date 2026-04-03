"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  X,
  Zap,
} from "lucide-react";
import { CardSkeleton, GridSkeleton, TableSkeleton } from "@/components/loading-skeleton";
import { cn } from "@/lib/utils";

type TaskStatus = "todo" | "in_progress" | "needs_kimberly_approval" | "needs_jahan_approval" | "done";
type TaskPriority = "urgent" | "high" | "medium" | "low";
type ViewMode = "kanban" | "list";
type BoardColumnId = "todo" | "in_progress" | "approval" | "done";

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

type QuickAddPayload = {
  title: string;
  assignee: string;
  priority: TaskPriority;
  due_date: string | null;
};

const TEAM_MEMBERS = [
  { id: "kimberly", name: "Kimberly", initials: "KI" },
  { id: "kevin", name: "Kevin", initials: "KE" },
  { id: "sabri", name: "Sabri", initials: "SA" },
  { id: "alex", name: "Alex", initials: "AL" },
  { id: "jordan", name: "Jordan", initials: "JO" },
  { id: "jahan", name: "Jahan", initials: "JA" },
] as const;

const FILTER_ASSIGNEES = TEAM_MEMBERS.filter((member) => member.id !== "jahan");

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; tone: string; icon: typeof Zap }> = {
  urgent: { label: "Urgent", tone: "border-red-500/40 bg-red-500/12 text-red-300", icon: AlertTriangle },
  high: { label: "High", tone: "border-amber-400/40 bg-amber-400/12 text-amber-200", icon: Zap },
  medium: { label: "Medium", tone: "border-sky-400/40 bg-sky-400/12 text-sky-200", icon: Circle },
  low: { label: "Low", tone: "border-slate-400/30 bg-slate-400/10 text-slate-300", icon: Circle },
};

const STATUS_META: Record<TaskStatus, { label: string; icon: typeof Circle; tone: string }> = {
  todo: { label: "Todo", icon: Circle, tone: "text-slate-300" },
  in_progress: { label: "In Progress", icon: Loader2, tone: "text-sky-300" },
  needs_kimberly_approval: { label: "Kimberly Approval", icon: Shield, tone: "text-amber-200" },
  needs_jahan_approval: { label: "Jahan Approval", icon: ShieldAlert, tone: "text-rose-300" },
  done: { label: "Done", icon: CheckCircle2, tone: "text-emerald-300" },
};

const COLUMNS: Array<{
  id: BoardColumnId;
  label: string;
  accent: string;
  description: string;
}> = [
  { id: "todo", label: "Todo", accent: "from-slate-500/35 to-slate-500/5", description: "Queued and unstarted." },
  { id: "in_progress", label: "In Progress", accent: "from-sky-500/35 to-sky-500/5", description: "Actively moving." },
  {
    id: "approval",
    label: "Needs Approval",
    accent: "from-amber-400/35 to-rose-500/5",
    description: "Kimberly and Jahan review stages.",
  },
  { id: "done", label: "Done", accent: "from-emerald-500/35 to-emerald-500/5", description: "Completed and cleared." },
];

function getBoardColumn(status: TaskStatus): BoardColumnId {
  if (status === "needs_kimberly_approval" || status === "needs_jahan_approval") return "approval";
  return status;
}

function getMember(id: string) {
  return TEAM_MEMBERS.find((member) => member.id === id);
}

function formatShortDate(value: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function isOverdue(task: Task) {
  if (!task.due_date || task.status === "done") return false;
  const due = new Date(task.due_date);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

function sortTasks(tasks: Task[]) {
  const rank: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  return [...tasks].sort((left, right) => {
    const priorityDelta = rank[left.priority] - rank[right.priority];
    if (priorityDelta !== 0) return priorityDelta;
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

function getDropStatus(task: Task, target: BoardColumnId): TaskStatus | null {
  switch (target) {
    case "todo":
      return "todo";
    case "in_progress":
      return "in_progress";
    case "approval":
      if (task.status === "needs_jahan_approval") return "needs_jahan_approval";
      if (task.status === "needs_kimberly_approval") return "needs_kimberly_approval";
      return "needs_kimberly_approval";
    case "done":
      return task.status === "needs_jahan_approval" || task.status === "done" ? "done" : null;
    default:
      return null;
  }
}

function getNextApprovalStatus(task: Task): TaskStatus | null {
  if (task.status === "todo") return "in_progress";
  if (task.status === "in_progress") return "needs_kimberly_approval";
  if (task.status === "needs_kimberly_approval") return "needs_jahan_approval";
  if (task.status === "needs_jahan_approval") return "done";
  return null;
}

function QuickAddModal({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  onSubmit: (payload: QuickAddPayload) => Promise<void>;
  saving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("kimberly");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async () => {
    if (!title.trim() || saving) return;
    await onSubmit({
      title: title.trim(),
      assignee,
      priority,
      due_date: dueDate || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020611]/80 px-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#07111f] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Quick Add Task</h2>
            <p className="mt-1 text-sm text-slate-400">Title, assignee, and priority in one line. Optional due date below.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close task modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[minmax(0,1.9fr)_170px_150px]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="Ship the new task board"
            className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50"
          />
          <select
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
          >
            {TEAM_MEMBERS.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
          >
            {Object.entries(PRIORITY_CONFIG).map(([id, config]) => (
              <option key={id} value={id}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <label className="block text-sm text-slate-400">
            <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-slate-500">Due Date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!title.trim() || saving}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  dragging,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  dragging: boolean;
  onDelete: (id: string) => void;
  onStatusChange: (task: Task, nextStatus: TaskStatus) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
}) {
  const member = getMember(task.assignee);
  const priority = PRIORITY_CONFIG[task.priority];
  const statusMeta = STATUS_META[task.status];
  const StatusIcon = statusMeta.icon;
  const nextApprovalStatus = getNextApprovalStatus(task);
  const overdue = isOverdue(task);
  const createdByAi = task.created_by && task.created_by !== "jahan";

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group rounded-[24px] border bg-[#081224]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(0,0,0,0.32),0_0_32px_rgba(32,147,255,0.14)]",
        overdue ? "border-red-500/40" : "border-white/8 hover:border-white/16",
        dragging && "opacity-55"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-4 w-4 flex-shrink-0", task.status === "in_progress" && "animate-spin", statusMeta.tone)} />
            <h3 className="text-sm font-semibold leading-5 text-white">{task.title}</h3>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium", priority.tone)}>
              <priority.icon className="h-3 w-3" />
              {priority.label}
            </span>
            <span className={cn("inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px]", statusMeta.tone)}>
              {statusMeta.label}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/12 px-2.5 py-1 text-[11px] font-medium text-red-300">
                <AlertTriangle className="h-3 w-3" />
                Overdue
              </span>
            )}
            {createdByAi && (
              <span className="rounded-full border border-violet-400/30 bg-violet-500/12 px-2.5 py-1 text-[11px] text-violet-200">
                AI Assigned
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="rounded-full p-1.5 text-slate-500 opacity-0 transition hover:bg-red-500/12 hover:text-red-300 group-hover:opacity-100"
          aria-label={`Delete ${task.title}`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-[11px] font-semibold text-slate-950">
            {member?.initials ?? task.assignee.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Assignee</p>
            <p className="mt-0.5 font-medium text-white">{member?.name ?? task.assignee}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Timeline</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className={cn("inline-flex items-center gap-1", overdue ? "text-red-300" : "text-slate-200")}>
              <Calendar className="h-3.5 w-3.5" />
              Due {formatShortDate(task.due_date)}
            </span>
            <span className="text-slate-500">Created {formatCreatedDate(task.created_at)}</span>
          </div>
        </div>
      </div>

      {(task.description || task.notes) && (
        <div className="mt-4 rounded-2xl border border-white/8 bg-[#06111f] px-3 py-3 text-xs leading-5 text-slate-300">
          {task.description && <p>{task.description}</p>}
          {task.notes && <p className={cn(task.description && "mt-2", "text-slate-400")}>{task.notes}</p>}
        </div>
      )}

      {nextApprovalStatus && nextApprovalStatus !== task.status && (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStatusChange(task, nextApprovalStatus)}
            className="rounded-2xl border border-sky-400/30 bg-sky-500/12 px-3 py-2 text-xs font-medium text-sky-200 transition hover:bg-sky-500/18"
          >
            {nextApprovalStatus === "in_progress" && "Start Work"}
            {nextApprovalStatus === "needs_kimberly_approval" && "Send to Kimberly"}
            {nextApprovalStatus === "needs_jahan_approval" && "Kimberly Approved"}
            {nextApprovalStatus === "done" && "Jahan Approved"}
          </button>
        </div>
      )}
    </article>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingQuickAdd, setSavingQuickAdd] = useState(false);
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<BoardColumnId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const payload = await response.json();
      setTasks(Array.isArray(payload.tasks) ? payload.tasks : []);
      setError(null);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Could not load tasks from Supabase.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const interval = window.setInterval(() => void fetchTasks("refresh"), 30000);
    return () => window.clearInterval(interval);
  }, [fetchTasks]);

  const updateTaskStatus = useCallback(async (task: Task, nextStatus: TaskStatus) => {
    if (task.status === nextStatus) return;

    setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)));

    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });

      if (!response.ok) throw new Error("Failed to update task");
      setError(null);
    } catch (updateError) {
      console.error(updateError);
      setError("Task update failed. Reloading board.");
      void fetchTasks("refresh");
    }
  }, [fetchTasks]);

  const handleDelete = useCallback(async (taskId: string) => {
    const previous = tasks;
    setTasks((current) => current.filter((task) => task.id !== taskId));

    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete task");
      setError(null);
    } catch (deleteError) {
      console.error(deleteError);
      setError("Delete failed. Restoring board.");
      setTasks(previous);
    }
  }, [tasks]);

  const handleQuickAdd = useCallback(async (payload: QuickAddPayload) => {
    setSavingQuickAdd(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          status: "todo",
          created_by: "jahan",
        }),
      });

      if (!response.ok) throw new Error("Failed to create task");
      const body = await response.json();
      const createdTask = body.task as Task | undefined;

      if (createdTask?.id) {
        setTasks((current) => [createdTask, ...current]);
      } else {
        await fetchTasks("refresh");
      }

      setShowQuickAdd(false);
      setError(null);
    } catch (createError) {
      console.error(createError);
      setError("Quick add failed. Try again.");
    } finally {
      setSavingQuickAdd(false);
    }
  }, [fetchTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !search.trim() ||
        task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase());

      const matchesAssignee =
        assigneeFilter === "all" ? true : task.assignee === assigneeFilter;

      const matchesPriority =
        priorityFilter === "all" ? true : task.priority === priorityFilter;

      const matchesMyTasks = myTasksOnly ? task.assignee === "jahan" : true;

      return matchesSearch && matchesAssignee && matchesPriority && matchesMyTasks;
    });
  }, [assigneeFilter, myTasksOnly, priorityFilter, search, tasks]);

  const tasksByColumn = useMemo(() => {
    const grouped: Record<BoardColumnId, Task[]> = {
      todo: [],
      in_progress: [],
      approval: [],
      done: [],
    };

    for (const task of filteredTasks) {
      grouped[getBoardColumn(task.status)].push(task);
    }

    return {
      todo: sortTasks(grouped.todo),
      in_progress: sortTasks(grouped.in_progress),
      approval: sortTasks(grouped.approval),
      done: sortTasks(grouped.done),
    };
  }, [filteredTasks]);

  const stats = useMemo(() => {
    const overdue = tasks.filter((task) => isOverdue(task)).length;
    const active = tasks.filter((task) => task.status !== "done").length;
    const approvals = tasks.filter((task) => getBoardColumn(task.status) === "approval").length;
    const urgent = tasks.filter((task) => task.priority === "urgent" && task.status !== "done").length;

    return { active, overdue, approvals, urgent };
  }, [tasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,#020611_0%,#07101f_48%,#020611_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <section className="glass-panel rounded-[32px] p-6">
            <div className="animate-pulse space-y-4">
              <div className="skeleton-shimmer h-3 w-28 rounded-full bg-white/10" />
              <div className="skeleton-shimmer h-10 w-[min(100%,34rem)] rounded-full bg-white/10" />
              <div className="skeleton-shimmer h-4 w-[min(100%,44rem)] rounded-full bg-white/10" />
            </div>
          </section>
          <GridSkeleton columns={2} count={4} className="xl:grid-cols-4" />
          <TableSkeleton rows={6} />
          <div className="grid min-w-0 gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <CardSkeleton key={index} className="min-h-[240px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(180deg,#020611_0%,#07101f_48%,#020611_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#07111f]/92 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-sky-300">Task Board V2</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Daily operations, approvals, and overdue work in one board.</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-400">
                Native HTML drag and drop between board columns, fast Supabase-backed quick add, and a single approval lane that still preserves Kimberly and Jahan as separate review stages.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void fetchTasks("refresh")}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 transition hover:bg-white/10"
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setShowQuickAdd(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Quick Add
              </button>
              <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setView("kanban")}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm text-slate-300 transition",
                    view === "kanban" && "bg-sky-500 text-white"
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm text-slate-300 transition",
                    view === "list" && "bg-sky-500 text-white"
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Active</p>
              <p className="mt-3 text-3xl font-semibold text-white">{stats.active}</p>
              <p className="mt-1 text-sm text-slate-400">Open tasks across the workflow.</p>
            </div>
            <div className="rounded-[24px] border border-red-500/20 bg-red-500/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-red-200/80">Overdue</p>
              <p className="mt-3 text-3xl font-semibold text-red-200">{stats.overdue}</p>
              <p className="mt-1 text-sm text-red-200/70">Tasks past due date and not done.</p>
            </div>
            <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-200/80">Approvals</p>
              <p className="mt-3 text-3xl font-semibold text-amber-100">{stats.approvals}</p>
              <p className="mt-1 text-sm text-amber-100/70">Waiting on Kimberly or Jahan.</p>
            </div>
            <div className="rounded-[24px] border border-sky-400/20 bg-sky-400/8 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">Urgent</p>
              <p className="mt-3 text-3xl font-semibold text-sky-100">{stats.urgent}</p>
              <p className="mt-1 text-sm text-sky-100/70">High-pressure items still open.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#07111f]/92 p-4 shadow-[0_25px_80px_rgba(0,0,0,0.28)] sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-lg">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search task title or details"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setMyTasksOnly((current) => !current)}
                className={cn(
                  "rounded-2xl border px-4 py-2.5 text-sm transition",
                  myTasksOnly
                    ? "border-sky-400/40 bg-sky-500/12 text-sky-200"
                    : "border-white/10 bg-white/5 text-slate-300"
                )}
              >
                My Tasks
              </button>
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm transition",
                  showFilters
                    ? "border-sky-400/40 bg-sky-500/12 text-sky-200"
                    : "border-white/10 bg-white/5 text-slate-300"
                )}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_180px_auto]">
              <label className="block text-sm text-slate-400">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-slate-500">Assignee</span>
                <select
                  value={assigneeFilter}
                  onChange={(event) => setAssigneeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
                >
                  <option value="all">All Assignees</option>
                  {FILTER_ASSIGNEES.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-400">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.24em] text-slate-500">Priority</span>
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/50"
                >
                  <option value="all">All Priorities</option>
                  {Object.entries(PRIORITY_CONFIG).map(([id, config]) => (
                    <option key={id} value={id}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setAssigneeFilter("all");
                    setPriorityFilter("all");
                    setMyTasksOnly(false);
                    setSearch("");
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </section>

        {filteredTasks.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-white/12 bg-[#07111f]/85 px-6 py-16 text-center">
            <p className="text-lg font-medium text-white">No tasks match the current filters.</p>
            <p className="mt-2 text-sm text-slate-400">Clear filters or add a new task to seed the board.</p>
          </section>
        ) : view === "kanban" ? (
          <section className="overflow-x-auto pb-2">
            <div className="grid min-w-[1100px] gap-4 xl:grid-cols-4">
              {COLUMNS.map((column) => {
                const columnTasks = tasksByColumn[column.id];
                const isDropTarget = dropColumn === column.id;

                return (
                  <div
                    key={column.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropColumn(column.id);
                    }}
                    onDragLeave={() => {
                      if (dropColumn === column.id) setDropColumn(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
                      const task = tasks.find((item) => item.id === taskId);
                      setDropColumn(null);
                      setDraggedTaskId(null);

                      if (!task) return;
                      const nextStatus = getDropStatus(task, column.id);
                      if (!nextStatus) {
                        setError("This move skips the approval workflow. Move approval tasks through Kimberly and Jahan first.");
                        return;
                      }

                      setError(null);
                      void updateTaskStatus(task, nextStatus);
                    }}
                    className={cn(
                      "rounded-[28px] border border-white/10 bg-[#06111f]/90 p-4 transition",
                      isDropTarget && "border-sky-400/40 bg-[#081629]"
                    )}
                  >
                    <div className={cn("rounded-[22px] bg-gradient-to-r p-[1px]", column.accent)}>
                      <div className="rounded-[21px] bg-[#091526] px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-base font-semibold text-white">{column.label}</h2>
                            <p className="mt-1 text-xs text-slate-400">{column.description}</p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                            {columnTasks.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {columnTasks.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-500">
                          Drop a task here.
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            dragging={draggedTaskId === task.id}
                            onDelete={handleDelete}
                            onStatusChange={(currentTask, nextStatus) => void updateTaskStatus(currentTask, nextStatus)}
                            onDragStart={setDraggedTaskId}
                            onDragEnd={() => {
                              setDraggedTaskId(null);
                              setDropColumn(null);
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#07111f]/92 shadow-[0_25px_80px_rgba(0,0,0,0.28)]">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-white/8 bg-white/[0.03] text-left">
                  <tr className="text-[11px] uppercase tracking-[0.26em] text-slate-500">
                    <th className="px-5 py-4">Task</th>
                    <th className="px-5 py-4">Assignee</th>
                    <th className="px-5 py-4">Priority</th>
                    <th className="px-5 py-4">Stage</th>
                    <th className="px-5 py-4">Due</th>
                    <th className="px-5 py-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sortTasks(filteredTasks).map((task) => {
                    const member = getMember(task.assignee);
                    const priority = PRIORITY_CONFIG[task.priority];
                    const statusMeta = STATUS_META[task.status];
                    const overdue = isOverdue(task);

                    return (
                      <tr key={task.id} className="border-b border-white/6 text-sm text-slate-200 transition hover:bg-white/[0.03]">
                        <td className="px-5 py-4">
                          <div className="font-medium text-white">{task.title}</div>
                          {task.description && <div className="mt-1 max-w-xl text-xs text-slate-400">{task.description}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="inline-flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-[11px] font-semibold text-slate-950">
                              {member?.initials ?? task.assignee.slice(0, 2).toUpperCase()}
                            </span>
                            <span>{member?.name ?? task.assignee}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", priority.tone)}>
                            {priority.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs", statusMeta.tone)}>
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs", overdue ? "bg-red-500/12 text-red-300" : "bg-white/5 text-slate-300")}>
                            {task.due_date ? formatShortDate(task.due_date) : "No due date"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-400">{formatCreatedDate(task.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="text-xs text-slate-500">
          Dragging into <span className="text-slate-300">Done</span> only works after a task reaches <span className="text-slate-300">Jahan Approval</span>. The board visually combines both approval stages without removing the underlying five-step workflow.
        </p>
      </div>

      {showQuickAdd && (
        <QuickAddModal
          onClose={() => {
            if (!savingQuickAdd) setShowQuickAdd(false);
          }}
          onSubmit={handleQuickAdd}
          saving={savingQuickAdd}
        />
      )}
    </div>
  );
}
