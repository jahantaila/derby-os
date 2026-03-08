"use client";

import { useMemo, useState } from "react";
import { Calendar, Flag, Plus } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useData } from "@/lib/hooks";
import type { Client, Task, TaskPriority, TaskStatus, TeamMember } from "@/lib/mission-control";

const columns: Array<{ id: TaskStatus; label: string }> = [
  { id: "backlog", label: "Backlog" },
  { id: "in-progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const priorityStyles: Record<TaskPriority, string> = {
  low: "text-slate-300",
  medium: "text-blue-200",
  high: "text-orange-200",
  urgent: "text-red-200",
};

function TaskCard({ task, clientName, dragging = false }: { task: Task; clientName: string; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-xl border border-white/12 bg-black/25 p-3 text-sm text-slate-100 transition hover:border-blue-300/35 ${
        dragging ? "w-[270px] shadow-xl" : ""
      }`}
    >
      <p className="font-medium">{task.title}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{task.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        <span className={`inline-flex items-center gap-1 ${priorityStyles[task.priority]}`}>
          <Flag size={11} /> {task.priority}
        </span>
        <span>{task.assignedTo}</span>
        <span>{clientName}</span>
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1 text-slate-300">
            <Calendar size={11} /> {task.dueDate}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function Column({
  column,
  tasks,
  clientMap,
  onCreate,
}: {
  column: { id: TaskStatus; label: string };
  tasks: Task[];
  clientMap: Record<string, string>;
  onCreate: (status: TaskStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section className="glass-surface rounded-2xl p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-white">{column.label}</h3>
        <button
          onClick={() => onCreate(column.id)}
          className="rounded-md border border-white/15 bg-white/10 p-1 text-slate-200 transition hover:border-blue-300/35"
        >
          <Plus size={13} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[320px] space-y-2 rounded-xl border border-white/8 p-2 transition ${
          isOver ? "bg-blue-500/10" : "bg-black/15"
        }`}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} clientName={task.clientId ? clientMap[task.clientId] || "Unknown" : "Internal"} />
        ))}
      </div>
    </section>
  );
}

export default function TasksPage() {
  const { data: tasks, loading, add, update } = useData<Task[]>("/api/tasks", []);
  const { data: clients } = useData<Client[]>("/api/clients", []);
  const { data: team } = useData<TeamMember[]>("/api/team", []);

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("backlog");

  const [filterAssignedTo, setFilterAssignedTo] = useState("");
  const [filterClientId, setFilterClientId] = useState("");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "">("");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "">("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium" as TaskPriority,
    clientId: "",
    dueDate: "",
    notes: "",
  });

  const clientMap = useMemo(
    () => clients.reduce<Record<string, string>>((acc, client) => ({ ...acc, [client.id]: client.businessName }), {}),
    [clients],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (!filterAssignedTo || task.assignedTo === filterAssignedTo) &&
          (!filterClientId || task.clientId === filterClientId) &&
          (!filterPriority || task.priority === filterPriority) &&
          (!filterStatus || task.status === filterStatus),
      ),
    [tasks, filterAssignedTo, filterClientId, filterPriority, filterStatus],
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTaskId(null);
    const taskId = String(event.active.id);
    const task = tasks.find((entry) => entry.id === taskId);
    if (!task) return;

    const overId = event.over ? String(event.over.id) : null;
    if (!overId) return;

    const directStatus = columns.find((column) => column.id === overId)?.id;
    const overTask = tasks.find((entry) => entry.id === overId);
    const targetStatus = directStatus || overTask?.status;

    if (targetStatus && targetStatus !== task.status) {
      await update({ ...task, status: targetStatus });
    }
  };

  const activeTask = activeTaskId ? tasks.find((task) => task.id === activeTaskId) : null;

  if (loading) {
    return <div className="text-sm text-slate-300">Loading task board...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-white">Tasks</h1>
          <p className="mt-1 text-sm text-slate-300">Agency kanban: Backlog, In Progress, Review, Done.</p>
        </div>
        <button
          onClick={() => {
            setDefaultStatus("backlog");
            setShowForm(true);
          }}
          className="derby-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={16} /> New Task
          </span>
        </button>
      </div>

      <div className="glass-surface rounded-2xl p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={filterAssignedTo}
            onChange={(event) => setFilterAssignedTo(event.target.value)}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All agents</option>
            {team.map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
          <select
            value={filterClientId}
            onChange={(event) => setFilterClientId(event.target.value)}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.businessName}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(event) => setFilterPriority(event.target.value as TaskPriority | "")}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All priorities</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="urgent">urgent</option>
          </select>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as TaskStatus | "")}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All statuses</option>
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={filteredTasks.filter((task) => task.status === column.id)}
              clientMap={clientMap}
              onCreate={(status) => {
                setDefaultStatus(status);
                setShowForm(true);
              }}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              clientName={activeTask.clientId ? clientMap[activeTask.clientId] || "Unknown" : "Internal"}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4" onClick={() => setShowForm(false)}>
          <div className="glass-surface w-full max-w-xl rounded-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-white">Create Task</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                placeholder="Task title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none md:col-span-2"
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none md:col-span-2"
                rows={3}
              />
              <select
                value={form.assignedTo}
                onChange={(event) => setForm((prev) => ({ ...prev, assignedTo: event.target.value }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Assigned to</option>
                {team.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
              <select
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
              <select
                value={form.clientId}
                onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">No client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.businessName}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
              />
              <textarea
                placeholder="Notes"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none md:col-span-2"
                rows={2}
              />
              <button
                onClick={async () => {
                  if (!form.title.trim() || !form.assignedTo) return;
                  await add({
                    title: form.title,
                    description: form.description,
                    assignedTo: form.assignedTo,
                    priority: form.priority,
                    clientId: form.clientId || null,
                    status: defaultStatus,
                    createdAt: new Date().toISOString(),
                    dueDate: form.dueDate || null,
                    notes: form.notes,
                    subtasks: [],
                  });
                  setForm({
                    title: "",
                    description: "",
                    assignedTo: "",
                    priority: "medium",
                    clientId: "",
                    dueDate: "",
                    notes: "",
                  });
                  setShowForm(false);
                }}
                className="derby-gradient mt-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 md:col-span-2"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
