"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownUp,
  CalendarDays,
  CheckSquare,
  Funnel,
  GripVertical,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { TaskPriority, TaskRecord, TaskStatus, TEAM_MEMBERS } from "@/lib/tasks-schema";

type PanelMode = "create" | "view" | null;
type ViewMode = "kanban" | "list";
type PriorityFilter = "all" | TaskPriority;
type AssigneeFilter = "all" | (typeof TEAM_MEMBERS)[number]["id"];
type ClientFilter = "all" | string;
type SortKey = "title" | "client" | "assignee" | "priority" | "dueDate" | "status";
type SortDirection = "asc" | "desc";
type TaskForm = {
  title: string;
  description: string;
  subtasks: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  client: string;
  dueDate: string;
};

const EASTERN_TIMEZONE = "America/New_York";
const SUBTASKS_MARKER = "\n\nSubtasks:";

const COLUMNS: { status: TaskStatus; title: string; color: string; accent: string }[] = [
  { status: "todo", title: "Todo", color: "#94A3B8", accent: "rgba(148,163,184,0.14)" },
  { status: "in-progress", title: "In Progress", color: "#2093FF", accent: "rgba(32,147,255,0.18)" },
  { status: "blocked", title: "Blocked", color: "#F93C3C", accent: "rgba(249,60,60,0.16)" },
  { status: "done", title: "Done", color: "#22C55E", accent: "rgba(34,197,94,0.16)" },
];

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  subtasks: "",
  status: "todo",
  priority: "medium",
  assignee: TEAM_MEMBERS[0].id,
  client: "Derby Digital",
  dueDate: "",
};

const PRIORITY_META: Record<TaskPriority, { label: string; border: string; badge: string }> = {
  high: {
    label: "High",
    border: "#F93C3C",
    badge: "border-red-300/35 bg-red-500/15 text-red-100",
  },
  medium: {
    label: "Medium",
    border: "#FACC15",
    badge: "border-amber-300/35 bg-amber-500/15 text-amber-100",
  },
  low: {
    label: "Low",
    border: "#9CA3AF",
    badge: "border-slate-300/25 bg-slate-500/15 text-slate-200",
  },
};

const STATUS_META: Record<TaskStatus, { label: string; dot: string; glow: string }> = {
  todo: { label: "Todo", dot: "#94A3B8", glow: "rgba(148,163,184,0.32)" },
  "in-progress": { label: "In Progress", dot: "#2093FF", glow: "rgba(32,147,255,0.36)" },
  blocked: { label: "Blocked", dot: "#F93C3C", glow: "rgba(249,60,60,0.34)" },
  done: { label: "Done", dot: "#22C55E", glow: "rgba(34,197,94,0.34)" },
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
const STATUS_ORDER: Record<TaskStatus, number> = { todo: 0, "in-progress": 1, blocked: 2, done: 3 };

function parseTaskDescription(description: string) {
  const markerIndex = description.indexOf(SUBTASKS_MARKER);
  if (markerIndex < 0) {
    return { body: description.trim(), subtasks: [] as string[] };
  }

  const body = description.slice(0, markerIndex).trim();
  const rawSubtasks = description.slice(markerIndex + SUBTASKS_MARKER.length).trim();
  const subtasks = rawSubtasks
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return { body, subtasks };
}

function buildTaskDescription(description: string, subtasks: string) {
  const cleanDescription = description.trim();
  const cleanSubtasks = subtasks
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (cleanSubtasks.length === 0) return cleanDescription;
  if (!cleanDescription) return `Subtasks: ${cleanSubtasks.join(", ")}`;
  return `${cleanDescription}${SUBTASKS_MARKER} ${cleanSubtasks.join(", ")}`;
}

function assigneeName(assigneeId: string) {
  return TEAM_MEMBERS.find((member) => member.id === assigneeId)?.name ?? assigneeId;
}

function initialsFromName(value: string) {
  return value
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function formatTaskDate(value: string | null) {
  if (!value) return "No due date";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: EASTERN_TIMEZONE,
  }).format(date);
}

function dueDateTone(value: string | null): "late" | "today" | "normal" | "none" {
  if (!value) return "none";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: EASTERN_TIMEZONE });
  if (value < today) return "late";
  if (value === today) return "today";
  return "normal";
}

function clientPillClass(client: string) {
  const palettes = [
    "border-cyan-300/35 bg-cyan-500/15 text-cyan-100",
    "border-blue-300/35 bg-blue-500/15 text-blue-100",
    "border-indigo-300/35 bg-indigo-500/15 text-indigo-100",
    "border-emerald-300/35 bg-emerald-500/15 text-emerald-100",
    "border-sky-300/35 bg-sky-500/15 text-sky-100",
  ];
  const hash = client.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

function compareTasks(left: TaskRecord, right: TaskRecord, key: SortKey) {
  if (key === "priority") return PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
  if (key === "status") return STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
  if (key === "assignee") return assigneeName(left.assignee).localeCompare(assigneeName(right.assignee));
  if (key === "dueDate") {
    const leftValue = left.dueDate ?? "9999-12-31";
    const rightValue = right.dueDate ?? "9999-12-31";
    return leftValue.localeCompare(rightValue);
  }
  return left[key].localeCompare(right[key]);
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [isMobile, setIsMobile] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const [clientFilter, setClientFilter] = useState<ClientFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [quickAddTitle, setQuickAddTitle] = useState<Record<TaskStatus, string>>({
    todo: "",
    "in-progress": "",
    blocked: "",
    done: "",
  });
  const [checkedSubtasks, setCheckedSubtasks] = useState<Record<string, boolean>>({});
  const createInputRef = useRef<HTMLInputElement | null>(null);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null),
    [selectedTaskId, tasks],
  );

  const clientOptions = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.client))).sort((left, right) => left.localeCompare(right)),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tasks.filter((task) => {
      const assignee = assigneeName(task.assignee).toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        [task.title, task.client, assignee].some((value) => value.toLowerCase().includes(query));
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesAssignee = assigneeFilter === "all" || task.assignee === assigneeFilter;
      const matchesClient = clientFilter === "all" || task.client === clientFilter;

      return matchesSearch && matchesPriority && matchesAssignee && matchesClient;
    });
  }, [assigneeFilter, clientFilter, priorityFilter, searchQuery, tasks]);

  const sortedTasks = useMemo(() => {
    const next = [...filteredTasks];
    next.sort((left, right) => {
      const order = compareTasks(left, right, sortKey);
      return sortDirection === "asc" ? order : -order;
    });
    return next;
  }, [filteredTasks, sortDirection, sortKey]);

  const stats = useMemo(() => {
    const overdue = tasks.filter((task) => dueDateTone(task.dueDate) === "late").length;
    return {
      total: tasks.length,
      overdue,
      byStatus: Object.fromEntries(COLUMNS.map((column) => [column.status, tasks.filter((task) => task.status === column.status).length])) as Record<
        TaskStatus,
        number
      >,
    };
  }, [tasks]);

  const activeFilters = useMemo(() => {
    const chips: { key: "priority" | "assignee" | "client"; label: string }[] = [];
    if (priorityFilter !== "all") chips.push({ key: "priority", label: `Priority: ${PRIORITY_META[priorityFilter].label}` });
    if (assigneeFilter !== "all") chips.push({ key: "assignee", label: `Assignee: ${assigneeName(assigneeFilter)}` });
    if (clientFilter !== "all") chips.push({ key: "client", label: `Client: ${clientFilter}` });
    return chips;
  }, [assigneeFilter, clientFilter, priorityFilter]);

  const effectiveView = isMobile ? "list" : viewMode;

  async function loadTasks() {
    try {
      setLoading(true);
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load tasks");
      const data = (await response.json()) as TaskRecord[];
      setTasks(data);
      setError(null);
    } catch {
      setError("Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const syncMode = () => setIsMobile(mediaQuery.matches);
    syncMode();
    mediaQuery.addEventListener("change", syncMode);
    return () => mediaQuery.removeEventListener("change", syncMode);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() !== "n" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      openCreatePanel();
    }

    window.addEventListener("keydown", handleKeyDown as unknown as EventListener);
    return () => window.removeEventListener("keydown", handleKeyDown as unknown as EventListener);
  }, []);

  useEffect(() => {
    if (panelMode === "create") {
      window.setTimeout(() => createInputRef.current?.focus(), 30);
    }
  }, [panelMode]);

  function resetCheckedSubtasks(subtasks: string[]) {
    setCheckedSubtasks(Object.fromEntries(subtasks.map((item) => [item, false])));
  }

  function openCreatePanel(defaults?: Partial<TaskForm>) {
    setForm({ ...EMPTY_FORM, ...defaults });
    setSelectedTaskId(null);
    resetCheckedSubtasks([]);
    setPanelMode("create");
  }

  function openViewPanel(task: TaskRecord) {
    const parsed = parseTaskDescription(task.description);
    setSelectedTaskId(task.id);
    setForm({
      title: task.title,
      description: parsed.body,
      subtasks: parsed.subtasks.join(", "),
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      client: task.client,
      dueDate: task.dueDate ?? "",
    });
    resetCheckedSubtasks(parsed.subtasks);
    setPanelMode("view");
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedTaskId(null);
  }

  async function createTask(payload: Partial<Omit<TaskRecord, "id" | "createdAt">>) {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Create failed");
    return (await response.json()) as TaskRecord;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      setSaving(true);
      const created = await createTask({
        title: form.title.trim(),
        description: buildTaskDescription(form.description, form.subtasks),
        status: form.status,
        priority: form.priority,
        assignee: form.assignee,
        client: form.client,
        dueDate: form.dueDate || null,
      });
      setTasks((prev) => [...prev, created]);
      setError(null);
      closePanel();
    } catch {
      setError("Could not create task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: buildTaskDescription(form.description, form.subtasks),
          status: form.status,
          priority: form.priority,
          assignee: form.assignee,
          client: form.client,
          dueDate: form.dueDate || null,
        }),
      });
      if (!response.ok) throw new Error("Update failed");
      const updated = (await response.json()) as TaskRecord;
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      setError(null);
      closePanel();
    } catch {
      setError("Could not update task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedTask) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/tasks/${selectedTask.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setTasks((prev) => prev.filter((task) => task.id !== selectedTask.id));
      setError(null);
      closePanel();
    } catch {
      setError("Could not delete task.");
    } finally {
      setSaving(false);
    }
  }

  async function moveTask(taskId: string, status: TaskStatus) {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask || currentTask.status === status) return;

    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Move failed");
      const updated = (await response.json()) as TaskRecord;
      setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));
      setError(null);
    } catch {
      setTasks((prev) => prev.map((task) => (task.id === taskId ? currentTask : task)));
      setError("Could not move task.");
    }
  }

  async function handleQuickAdd(status: TaskStatus) {
    const title = quickAddTitle[status].trim();
    if (!title) return;

    try {
      const created = await createTask({
        title,
        description: "",
        status,
        priority: "medium",
        assignee: TEAM_MEMBERS[0].id,
        client: "Derby Digital",
        dueDate: null,
      });
      setTasks((prev) => [...prev, created]);
      setQuickAddTitle((prev) => ({ ...prev, [status]: "" }));
      setError(null);
    } catch {
      setError("Could not create task.");
    }
  }

  function handleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "priority" || nextKey === "dueDate" || nextKey === "status" ? "asc" : "desc");
  }

  function clearFilter(key: "priority" | "assignee" | "client") {
    if (key === "priority") setPriorityFilter("all");
    if (key === "assignee") setAssigneeFilter("all");
    if (key === "client") setClientFilter("all");
  }

  return (
    <section className="animate-enter space-y-5 sm:space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="glass-panel page-header p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="page-title">Tasks</h1>
            <p className="mt-2 text-sm text-slate-300">Execution board with list controls, quick add, and task details.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-slate-100">
              <span className="text-slate-400">Total</span>
              <span className="font-semibold text-white">{stats.total}</span>
            </div>
            {COLUMNS.map((column) => (
              <div key={column.status} className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-slate-100">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                <span>{column.title}</span>
                <span className="font-semibold text-white">{stats.byStatus[column.status]}</span>
              </div>
            ))}
            <div className="glass-card inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs text-red-100">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span>Overdue</span>
              <span className="font-semibold text-white">{stats.overdue}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-card inline-flex rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              disabled={isMobile}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                effectiveView === "kanban"
                  ? "bg-[linear-gradient(135deg,rgba(32,147,255,0.24),rgba(0,38,255,0.32))] text-white shadow-[0_10px_30px_rgba(0,38,255,0.18)]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              } ${isMobile ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <LayoutGrid size={16} />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                effectiveView === "list"
                  ? "bg-[linear-gradient(135deg,rgba(32,147,255,0.24),rgba(0,38,255,0.32))] text-white shadow-[0_10px_30px_rgba(0,38,255,0.18)]"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <List size={16} />
              List
            </button>
          </div>

          <button
            type="button"
            onClick={() => openCreatePanel()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.24),rgba(0,38,255,0.32))] px-4 py-2.5 text-sm font-semibold text-blue-50 shadow-[0_16px_40px_rgba(0,38,255,0.22)] transition hover:border-blue-200/60 hover:shadow-[0_20px_48px_rgba(32,147,255,0.28)]"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>
        </div>
      </div>

      <div className="glass-panel overflow-hidden p-3 md:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by task, client, or assignee..."
              className="min-h-11 w-full rounded-2xl border border-white/14 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.72))] py-3 pl-11 pr-4 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_40px_rgba(2,6,23,0.24)] outline-none transition placeholder:text-slate-500 focus:border-blue-400/55"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:min-w-[540px]">
            <label className="space-y-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                <FilterBadge />
                Priority
              </span>
              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
                className="min-h-11 w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Assignee</span>
              <select
                value={assigneeFilter}
                onChange={(event) => setAssigneeFilter(event.target.value as AssigneeFilter)}
                className="min-h-11 w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                <option value="all">All Assignees</option>
                {TEAM_MEMBERS.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Client</span>
              <select
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-white/12 bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-blue-400/60"
              >
                <option value="all">All Clients</option>
                {clientOptions.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => clearFilter(chip.key)}
              className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-100 transition hover:border-blue-200/45 hover:bg-blue-500/20"
            >
              {chip.label}
              <X size={12} />
            </button>
          ))}
          {activeFilters.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setPriorityFilter("all");
                setAssigneeFilter("all");
                setClientFilter("all");
              }}
              className="text-xs text-slate-400 transition hover:text-white"
            >
              Clear all
            </button>
          ) : (
            <span className="text-xs text-slate-500">No active filters.</span>
          )}
          {isMobile ? <span className="ml-auto text-xs text-slate-500">List view is pinned on mobile.</span> : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      {loading ? (
        <div className="glass-panel p-6 text-sm text-slate-300">Loading tasks...</div>
      ) : effectiveView === "kanban" ? (
        <div className="glass-panel overflow-x-auto p-3 md:p-4">
          <div className="grid min-w-max grid-flow-col auto-cols-[290px] gap-4">
            {COLUMNS.map((column) => {
              const columnTasks = sortedTasks.filter((task) => task.status === column.status);

              return (
                <div
                  key={column.status}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverStatus(column.status);
                  }}
                  onDragLeave={() => setDragOverStatus(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const taskId = event.dataTransfer.getData("text/task-id");
                    setDragOverStatus(null);
                    if (taskId) void moveTask(taskId, column.status);
                  }}
                  className="min-h-[560px] rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(7,10,18,0.78),rgba(7,10,18,0.52))] p-3"
                  style={{
                    borderColor: dragOverStatus === column.status ? column.color : undefined,
                    boxShadow: dragOverStatus === column.status ? `0 0 0 1px ${column.color}, 0 24px 60px rgba(0,0,0,0.34)` : undefined,
                  }}
                >
                  <div
                    className="mb-3 flex items-center justify-between rounded-2xl border px-3 py-2.5"
                    style={{ borderColor: `${column.color}60`, background: column.accent }}
                  >
                    <div>
                      <h2 className="heading-font text-lg font-normal uppercase tracking-[0.06em]" style={{ color: column.color }}>
                        {column.title}
                      </h2>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-300">{columnTasks.length} tasks</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/10 px-2 py-1 text-xs text-white">{columnTasks.length}</span>
                  </div>

                  <label className="mb-3 block">
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                      <Plus size={14} className="text-blue-200" />
                      <input
                        value={quickAddTitle[column.status]}
                        onChange={(event) => setQuickAddTitle((prev) => ({ ...prev, [column.status]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleQuickAdd(column.status);
                          }
                        }}
                        placeholder={`Quick add to ${column.title}`}
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </label>

                  <div className="space-y-3">
                    {columnTasks.map((task) => {
                      const assignee = assigneeName(task.assignee);
                      const dueTone = dueDateTone(task.dueDate);
                      const parsed = parseTaskDescription(task.description);

                      return (
                        <button
                          key={task.id}
                          type="button"
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)}
                          onClick={() => openViewPanel(task)}
                          className="glass-card group relative w-full cursor-pointer overflow-hidden rounded-2xl p-0 text-left transition duration-200 hover:scale-[1.015] hover:shadow-[0_20px_44px_rgba(32,147,255,0.18)]"
                          style={{ borderLeft: `4px solid ${PRIORITY_META[task.priority].border}` }}
                        >
                          <div className="flex gap-3 p-4">
                            <div className="pt-1 text-slate-500 transition group-hover:text-blue-100">
                              <GripVertical size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold leading-snug text-white">{task.title}</p>
                                  {parsed.body ? <p className="mt-1 line-clamp-2 text-xs text-slate-400">{parsed.body}</p> : null}
                                </div>
                                <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${PRIORITY_META[task.priority].badge}`}>
                                  {PRIORITY_META[task.priority].label}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${clientPillClass(task.client)}`}>
                                  {task.client}
                                </span>
                                {parsed.subtasks.length > 0 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-300">
                                    <CheckSquare size={11} />
                                    {parsed.subtasks.length} subtasks
                                  </span>
                                ) : null}
                              </div>

                              <div className="mt-4 flex items-end justify-between gap-3">
                                <div
                                  className={`inline-flex items-center gap-1.5 text-xs ${
                                    dueTone === "late"
                                      ? "text-red-200"
                                      : dueTone === "today"
                                        ? "text-amber-200"
                                        : "text-slate-400"
                                  }`}
                                >
                                  <CalendarDays size={12} />
                                  {formatTaskDate(task.dueDate)}
                                </div>

                                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[linear-gradient(135deg,rgba(32,147,255,0.18),rgba(255,255,255,0.08))] text-[10px] font-semibold text-white">
                                  {initialsFromName(assignee)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}

                    {columnTasks.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 px-3 py-10 text-center text-xs text-slate-400">
                        No tasks match this column.
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden p-2 sm:p-3">
          <div className="hidden grid-cols-[80px_minmax(240px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_110px_150px_100px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 lg:grid">
            <SortHeader label="Status" active={sortKey === "status"} direction={sortDirection} onClick={() => handleSort("status")} />
            <SortHeader label="Title" active={sortKey === "title"} direction={sortDirection} onClick={() => handleSort("title")} />
            <SortHeader label="Client" active={sortKey === "client"} direction={sortDirection} onClick={() => handleSort("client")} />
            <SortHeader label="Assignee" active={sortKey === "assignee"} direction={sortDirection} onClick={() => handleSort("assignee")} />
            <SortHeader label="Priority" active={sortKey === "priority"} direction={sortDirection} onClick={() => handleSort("priority")} />
            <SortHeader label="Due Date" active={sortKey === "dueDate"} direction={sortDirection} onClick={() => handleSort("dueDate")} />
            <div>Actions</div>
          </div>

          <div className="mt-2 space-y-2">
            {sortedTasks.map((task, index) => {
              const assignee = assigneeName(task.assignee);
              const dueTone = dueDateTone(task.dueDate);

              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openViewPanel(task)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openViewPanel(task);
                    }
                  }}
                  className={`grid cursor-pointer gap-3 rounded-2xl border px-4 py-3 transition hover:border-blue-300/35 hover:bg-white/8 hover:shadow-[0_14px_34px_rgba(32,147,255,0.12)] ${
                    index % 2 === 0 ? "border-white/10 bg-white/[0.035]" : "border-white/8 bg-white/[0.02]"
                  } lg:grid-cols-[80px_minmax(240px,2fr)_minmax(140px,1fr)_minmax(140px,1fr)_110px_150px_100px] lg:items-center`}
                >
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: STATUS_META[task.status].dot, boxShadow: `0 0 12px ${STATUS_META[task.status].glow}` }}
                    />
                    <span className="lg:hidden">{STATUS_META[task.status].label}</span>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{task.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{parseTaskDescription(task.description).body || "No description yet"}</p>
                  </div>

                  <div className="text-sm text-slate-300">{task.client}</div>

                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-semibold text-white">
                      {initialsFromName(assignee)}
                    </span>
                    {assignee}
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${PRIORITY_META[task.priority].badge}`}>
                      {PRIORITY_META[task.priority].label}
                    </span>
                  </div>

                  <div
                    className={`text-sm ${
                      dueTone === "late" ? "text-red-200" : dueTone === "today" ? "text-amber-200" : "text-slate-300"
                    }`}
                  >
                    {formatTaskDate(task.dueDate)}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openViewPanel(task);
                      }}
                      className="rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-blue-300/35 hover:bg-blue-500/10"
                    >
                      Open
                    </button>
                  </div>
                </div>
              );
            })}

            {sortedTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center text-sm text-slate-400">
                No tasks match the current search and filters.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {panelMode ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button type="button" onClick={closePanel} className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-label="Close panel" />
          <div className="absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-white/12 bg-[linear-gradient(180deg,rgba(7,10,18,0.97),rgba(10,10,15,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:max-w-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-blue-200">
                  {panelMode === "create" ? "New Task" : STATUS_META[form.status].label}
                </p>
                <h2 className="heading-font mt-1 text-3xl font-normal uppercase tracking-[0.04em] text-white">
                  {panelMode === "create" ? "Create Task" : form.title || "Task Details"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {panelMode === "create"
                    ? "Shortcut: press N anywhere outside inputs to open this panel."
                    : `Created ${formatTaskDate(selectedTask?.createdAt ?? null)}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {panelMode === "view" ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/12 px-3 py-2 text-sm font-semibold text-red-200 transition hover:border-red-400/55 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closePanel}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 text-slate-200 transition hover:border-blue-300/40 hover:bg-blue-500/10"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <form className="space-y-6" onSubmit={panelMode === "create" ? handleCreate : handleUpdate}>
              <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="glass-panel space-y-4 p-4 sm:p-5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Title</label>
                    <input
                      ref={createInputRef}
                      required
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                      className="min-h-11 w-full rounded-xl border border-white/14 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      rows={5}
                      className="w-full rounded-xl border border-white/14 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Subtasks</label>
                    <input
                      value={form.subtasks}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        setForm((prev) => ({ ...prev, subtasks: nextValue }));
                        resetCheckedSubtasks(
                          nextValue
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        );
                      }}
                      placeholder="Draft copy, QA review, client approval"
                      className="min-h-11 w-full rounded-xl border border-white/14 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                    />
                    <p className="mt-2 text-xs text-slate-500">Stored with the task description as comma-separated values.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="glass-panel p-4 sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Task Meta</p>
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Status</span>
                        <select
                          value={form.status}
                          onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as TaskStatus }))}
                          className="min-h-11 w-full rounded-xl border border-white/14 bg-slate-950/75 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                        >
                          {COLUMNS.map((column) => (
                            <option key={column.status} value={column.status}>
                              {column.title}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Priority</span>
                        <select
                          value={form.priority}
                          onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))}
                          className="min-h-11 w-full rounded-xl border border-white/14 bg-slate-950/75 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                        >
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Assignee</span>
                        <select
                          value={form.assignee}
                          onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
                          className="min-h-11 w-full rounded-xl border border-white/14 bg-slate-950/75 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                        >
                          {TEAM_MEMBERS.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Client</span>
                        <input
                          value={form.client}
                          onChange={(event) => setForm((prev) => ({ ...prev, client: event.target.value }))}
                          className="min-h-11 w-full rounded-xl border border-white/14 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Due Date</span>
                        <input
                          type="date"
                          value={form.dueDate}
                          onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                          className="min-h-11 w-full rounded-xl border border-white/14 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="glass-panel p-4 sm:p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Activity</p>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">
                      <p className="font-medium text-white">Task created</p>
                      <p className="mt-1 text-xs text-slate-400">{formatTaskDate(selectedTask?.createdAt ?? null)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="glass-panel p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Subtasks</p>
                  <div className="mt-4 space-y-2">
                    {form.subtasks
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .map((subtask) => (
                        <label key={subtask} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={checkedSubtasks[subtask] ?? false}
                            onChange={() => setCheckedSubtasks((prev) => ({ ...prev, [subtask]: !prev[subtask] }))}
                            className="h-4 w-4 rounded border-white/20 bg-slate-950 text-blue-500"
                          />
                          <span className={checkedSubtasks[subtask] ? "text-slate-500 line-through" : ""}>{subtask}</span>
                        </label>
                      ))}
                    {form.subtasks.trim().length === 0 ? <p className="text-sm text-slate-500">No subtasks yet.</p> : null}
                  </div>
                </div>

                <div className="glass-panel p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Comments</p>
                  <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-500">
                    No comments yet.
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <UserRound size={13} />
                  {panelMode === "view" ? `Assigned to ${assigneeName(form.assignee)}` : "New tasks default to Derby Digital if no client is set."}
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 rounded-2xl border border-blue-300/35 bg-[linear-gradient(135deg,rgba(32,147,255,0.28),rgba(0,38,255,0.34))] px-5 py-2.5 text-sm font-semibold text-blue-50 shadow-[0_16px_40px_rgba(0,38,255,0.22)] transition hover:border-blue-200/55 hover:shadow-[0_20px_48px_rgba(32,147,255,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : panelMode === "create" ? "Create Task" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 text-left transition ${active ? "text-white" : "hover:text-white"}`}>
      {label}
      <ArrowDownUp size={12} className={active && direction === "desc" ? "rotate-180" : ""} />
    </button>
  );
}

function FilterBadge() {
  return <Funnel size={11} className="text-slate-500" />;
}
