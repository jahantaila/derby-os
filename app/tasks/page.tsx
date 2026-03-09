"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { TaskPriority, TaskRecord, TaskStatus, TEAM_MEMBERS } from "@/lib/tasks-schema";

type PanelMode = "create" | "view" | null;
type TaskForm = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  client: string;
  dueDate: string;
};

const COLUMNS: { status: TaskStatus; title: string; color: string; accent: string }[] = [
  { status: "todo", title: "Todo", color: "#6b7280", accent: "rgba(107,114,128,0.2)" },
  { status: "in-progress", title: "In Progress", color: "#2093FF", accent: "rgba(32,147,255,0.2)" },
  { status: "blocked", title: "Blocked", color: "#F93C3C", accent: "rgba(249,60,60,0.2)" },
  { status: "done", title: "Done", color: "#22C55E", accent: "rgba(34,197,94,0.2)" },
];

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assignee: TEAM_MEMBERS[0].id,
  client: "",
  dueDate: "",
};

function formatDueDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
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

function priorityColor(priority: TaskPriority) {
  if (priority === "high") return "#F93C3C";
  if (priority === "medium") return "#FACC15";
  return "#9CA3AF";
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

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null),
    [selectedTaskId, tasks],
  );

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

  function openCreatePanel() {
    setForm({ ...EMPTY_FORM, client: "Derby Digital" });
    setSelectedTaskId(null);
    setPanelMode("create");
  }

  function openViewPanel(task: TaskRecord) {
    setSelectedTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      client: task.client,
      dueDate: task.dueDate ?? "",
    });
    setPanelMode("view");
  }

  function closePanel() {
    setPanelMode(null);
    setSelectedTaskId(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    try {
      setSaving(true);
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          status: form.status,
          priority: form.priority,
          assignee: form.assignee,
          client: form.client,
          dueDate: form.dueDate || null,
        }),
      });
      if (!response.ok) throw new Error("Create failed");
      const created = (await response.json()) as TaskRecord;
      setTasks((prev) => [...prev, created]);
      closePanel();
      setError(null);
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
          description: form.description,
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
      closePanel();
      setError(null);
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

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="mt-2 text-sm text-slate-300">Kanban board for Derby Digital execution.</p>
        </div>
        <button
          type="button"
          onClick={openCreatePanel}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/30"
        >
          <Plus size={16} />
          Add New Task
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      {loading ? (
        <div className="glass-panel p-6 text-sm text-slate-300">Loading tasks...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2 grid-cols-1">
          {COLUMNS.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);

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
                className="glass-panel min-h-[460px] p-3"
                style={{
                  borderColor:
                    dragOverStatus === column.status ? column.color : "rgba(125, 173, 255, 0.2)",
                  boxShadow:
                    dragOverStatus === column.status
                      ? `0 0 0 1px ${column.color}, 0 20px 34px rgba(0, 0, 0, 0.3)`
                      : undefined,
                }}
              >
                <div
                  className="mb-3 flex items-center justify-between rounded-lg border px-3 py-2"
                  style={{ borderColor: `${column.color}50`, background: column.accent }}
                >
                  <h2 className="text-sm font-semibold" style={{ color: column.color }}>
                    {column.title}
                  </h2>
                  <span className="text-xs text-slate-200">{columnTasks.length}</span>
                </div>

                <div className="space-y-3">
                  {columnTasks.map((task) => {
                    const assignee = assigneeName(task.assignee);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        draggable
                        onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)}
                        onClick={() => openViewPanel(task)}
                        className="glass-card w-full cursor-pointer p-3 text-left transition hover:-translate-y-1"
                      >
                        <div className="mb-2 text-sm font-bold leading-snug text-white">{task.title}</div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-slate-200">
                            {task.client}
                          </span>
                          <div className="inline-flex items-center gap-2 text-xs text-slate-200">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[10px] font-semibold">
                              {initialsFromName(assignee)}
                            </span>
                            {assignee}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priorityColor(task.priority) }} />
                            {task.priority}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={12} />
                            {formatDueDate(task.dueDate)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {columnTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/15 px-3 py-8 text-center text-xs text-slate-400">
                      No tasks
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {panelMode ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button type="button" onClick={closePanel} className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close panel" />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl border-l border-white/15 bg-[#0b0d15]/90 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{panelMode === "create" ? "Create Task" : "Task Details"}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  {panelMode === "create" ? "Add a new task to the board." : "Edit fields and save to persist changes."}
                </p>
              </div>
              {panelMode === "view" ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              ) : null}
            </div>

            <form className="space-y-4" onSubmit={panelMode === "create" ? handleCreate : handleUpdate}>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/70"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={4}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/70"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as TaskStatus }))}
                    className="w-full rounded-lg border border-white/20 bg-[#0f1222] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/70"
                  >
                    {COLUMNS.map((column) => (
                      <option key={column.status} value={column.status}>
                        {column.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))}
                    className="w-full rounded-lg border border-white/20 bg-[#0f1222] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/70"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Assignee</label>
                  <select
                    value={form.assignee}
                    onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
                    className="w-full rounded-lg border border-white/20 bg-[#0f1222] px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/70"
                  >
                    {TEAM_MEMBERS.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                    className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/70"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Client</label>
                <input
                  value={form.client}
                  onChange={(event) => setForm((prev) => ({ ...prev, client: event.target.value }))}
                  className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/70"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl border border-blue-300/35 bg-gradient-to-r from-[#2093FF]/35 to-[#0026FF]/35 px-4 py-2.5 text-sm font-semibold text-blue-100 transition hover:from-[#2093FF]/45 hover:to-[#0026FF]/45 disabled:cursor-not-allowed disabled:opacity-60"
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
