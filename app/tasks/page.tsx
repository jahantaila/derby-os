"use client";
import { useData } from "@/lib/hooks";
import { useState, useCallback } from "react";
import { Plus, X, Flag, Calendar, User, Link2, GripVertical, MessageSquare } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Task = {
  id: string;
  title: string;
  description: string;
  assignee: string;
  priority: string;
  status: string;
  projectId: string;
  createdAt: string;
  dueDate?: string;
  tags?: string[];
  subtasks?: { title: string; done: boolean }[];
  comments?: number;
};

const columns = [
  { id: "backlog", label: "Backlog", color: "bg-gray-500", dotColor: "bg-gray-400" },
  { id: "in-progress", label: "In Progress", color: "bg-blue-500", dotColor: "bg-blue-400" },
  { id: "review", label: "Review", color: "bg-yellow-500", dotColor: "bg-yellow-400" },
  { id: "done", label: "Done", color: "bg-green-500", dotColor: "bg-green-400" },
];

const priorityConfig: Record<string, { label: string; color: string; flagColor: string }> = {
  urgent: { label: "Urgent", color: "text-red-400", flagColor: "text-red-400" },
  high: { label: "High", color: "text-orange-400", flagColor: "text-orange-400" },
  med: { label: "Normal", color: "text-blue-400", flagColor: "text-blue-400" },
  low: { label: "Low", color: "text-gray-400", flagColor: "text-gray-500" },
};

const assigneeColors: Record<string, string> = {
  Jahan: "bg-teal-600",
  Kimberly: "bg-purple-600",
  "Sub-agent": "bg-indigo-600",
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const isOverdue = d < now;
  const month = d.toLocaleString("en", { month: "short" });
  const day = d.getDate();
  return { text: `${month} ${day}`, isOverdue };
}

// ─── Sortable Task Card ────────────────────────────────────
function SortableTaskCard({ task, onRemove, onUpdate }: { task: Task; onRemove: (id: string) => void; onUpdate: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCard task={task} onRemove={onRemove} onUpdate={onUpdate} dragListeners={listeners} />
    </div>
  );
}

// ─── Task Card (ClickUp style) ─────────────────────────────
function TaskCard({ task, onRemove, onUpdate, dragListeners, overlay }: {
  task: Task;
  onRemove: (id: string) => void;
  onUpdate: (task: Task) => void;
  dragListeners?: any;
  overlay?: boolean;
}) {
  const priority = priorityConfig[task.priority] || priorityConfig.med;
  const due = formatDate(task.dueDate);
  const subtasksDone = task.subtasks?.filter(s => s.done).length || 0;
  const subtasksTotal = task.subtasks?.length || 0;

  return (
    <div className={`bg-[#1e1f25] border border-[#2a2b33] rounded-lg p-3 hover:border-[#3a3b45] transition-all group cursor-pointer ${overlay ? "shadow-2xl shadow-black/50 rotate-2 scale-105" : ""}`}>
      {/* Drag handle + title row */}
      <div className="flex items-start gap-2">
        <div {...dragListeners} className="mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity">
          <GripVertical size={14} className="text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-[13px] text-gray-100 leading-snug">{task.title}</h4>
            <button onClick={(e) => { e.stopPropagation(); onRemove(task.id); }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all ml-2 mt-0.5">
              <X size={13} />
            </button>
          </div>

          {/* Description preview */}
          {task.description && (
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{task.description}</p>
          )}

          {/* Metadata row — ClickUp style */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {/* Assignee avatar */}
            <div className={`w-5 h-5 rounded-full ${assigneeColors[task.assignee] || "bg-gray-600"} flex items-center justify-center`} title={task.assignee}>
              <span className="text-[8px] font-bold text-white">{getInitials(task.assignee)}</span>
            </div>

            {/* Due date */}
            {due && (
              <span className={`text-[11px] flex items-center gap-1 ${due.isOverdue ? "text-red-400" : "text-gray-400"}`}>
                <Calendar size={11} />
                {due.text}
              </span>
            )}

            {/* Priority flag */}
            <span className={`flex items-center gap-1 text-[11px] ${priority.color}`}>
              <Flag size={11} className={priority.flagColor} />
              {priority.label}
            </span>

            {/* Subtasks progress */}
            {subtasksTotal > 0 && (
              <span className="text-[11px] text-gray-500">
                {subtasksDone}/{subtasksTotal}
              </span>
            )}

            {/* Comments */}
            {(task.comments || 0) > 0 && (
              <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                <MessageSquare size={10} />
                {task.comments}
              </span>
            )}

            {/* Tags */}
            {task.tags?.map((tag, i) => (
              <span key={i} className="text-[10px] bg-[#2a2b33] text-gray-400 px-1.5 py-0.5 rounded">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Droppable Column ──────────────────────────────────────
function DroppableColumn({ column, tasks, onRemove, onUpdate, onAddClick }: {
  column: typeof columns[0];
  tasks: Task[];
  onRemove: (id: string) => void;
  onUpdate: (task: Task) => void;
  onAddClick: (status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${column.dotColor}`} />
          <h3 className="font-semibold text-[13px] text-gray-200 uppercase tracking-wide">{column.label}</h3>
          <span className="text-[11px] text-gray-500 bg-[#1e1f25] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {tasks.length}
          </span>
        </div>
        <button onClick={() => onAddClick(column.id)} className="text-gray-500 hover:text-gray-300 transition-colors">
          <Plus size={16} />
        </button>
      </div>

      {/* Column body */}
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 min-h-[200px] rounded-lg p-1 transition-colors ${isOver ? "bg-[#1a1b22] ring-1 ring-blue-500/30" : ""}`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onRemove={onRemove} onUpdate={onUpdate} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div className="text-center py-8 text-gray-600 text-xs">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────
export default function TasksPage() {
  const { data: tasks, loading, add, update, remove } = useData<Task[]>("/api/tasks", []);
  const [showForm, setShowForm] = useState(false);
  const [formStatus, setFormStatus] = useState("backlog");
  const [form, setForm] = useState({ title: "", description: "", assignee: "Kimberly", priority: "med", dueDate: "", tags: "" });
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const filtered = tasks.filter(t =>
    (!filterAssignee || t.assignee === filterAssignee) &&
    (!filterPriority || t.priority === filterPriority)
  );

  const handleAdd = async () => {
    if (!form.title) return;
    const tags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    await add({
      title: form.title,
      description: form.description,
      assignee: form.assignee,
      priority: form.priority,
      status: formStatus,
      projectId: "",
      createdAt: new Date().toISOString(),
      dueDate: form.dueDate || undefined,
      tags: tags.length > 0 ? tags : undefined,
      comments: 0,
    });
    setForm({ title: "", description: "", assignee: "Kimberly", priority: "med", dueDate: "", tags: "" });
    setShowForm(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = tasks.find(t => t.id === active.id);
    if (!task) return;

    // Determine target column
    const overColumn = columns.find(c => c.id === over.id);
    const overTask = tasks.find(t => t.id === over.id);
    const targetStatus = overColumn?.id || overTask?.status;

    if (targetStatus && targetStatus !== task.status) {
      await update({ ...task, status: targetStatus });
    }
  }, [tasks, update]);

  const openAddForm = (status: string) => {
    setFormStatus(status);
    setShowForm(true);
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading tasks...</div>;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Task Board</h1>
          <p className="text-xs text-gray-500 mt-1">{tasks.length} total tasks · {tasks.filter(t => t.status === "done").length} completed</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="bg-[#1e1f25] border border-[#2a2b33] rounded-md px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
            <option value="">All Assignees</option>
            <option value="Kimberly">Kimberly</option>
            <option value="Jahan">Jahan</option>
            <option value="Sub-agent">Sub-agent</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="bg-[#1e1f25] border border-[#2a2b33] rounded-md px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="med">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <button onClick={() => openAddForm("backlog")} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors">
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      {/* New Task Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-[#1e1f25] border border-[#2a2b33] rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-semibold text-gray-100">New Task</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Task name" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-[#15161b] border border-[#2a2b33] rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" autoFocus />
              <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-[#15161b] border border-[#2a2b33] rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Assignee</label>
                  <select value={form.assignee} onChange={e => setForm({ ...form, assignee: e.target.value })} className="w-full bg-[#15161b] border border-[#2a2b33] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
                    <option>Kimberly</option><option>Jahan</option><option>Sub-agent</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full bg-[#15161b] border border-[#2a2b33] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
                    <option value="low">Low</option><option value="med">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-[#15161b] border border-[#2a2b33] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 mb-1 block">Tags (comma separated)</label>
                  <input placeholder="e.g. derbyflow, urgent" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="w-full bg-[#15161b] border border-[#2a2b33] rounded-lg px-3 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 mb-1 block">Column</label>
                <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className="w-full bg-[#15161b] border border-[#2a2b33] rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50">
                  {columns.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <button onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors mt-1">Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board with Drag & Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-5 flex-1 min-h-0">
          {columns.map(col => (
            <DroppableColumn
              key={col.id}
              column={col}
              tasks={filtered.filter(t => t.status === col.id)}
              onRemove={remove}
              onUpdate={update}
              onAddClick={openAddForm}
            />
          ))}
        </div>

        {/* Drag overlay — shows the card being dragged */}
        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} onRemove={() => {}} onUpdate={() => {}} overlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
