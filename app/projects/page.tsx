"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckSquare, FolderKanban, Plus, Trash2, X } from "lucide-react";
import { PROJECT_STATUSES, ProjectRecord, ProjectStatus } from "@/lib/projects-types";

const TEAM: Record<string, { name: string; role: string }> = {
  jahan: { name: "Jahan", role: "Founder & CEO" },
  kimberly: { name: "Kimberly", role: "Chief of Staff" },
  alex: { name: "Alex", role: "Marketing Analyst" },
  sabri: { name: "Sabri", role: "Ad Producer" },
  kevin: { name: "Kevin", role: "Developer" },
  hamza: { name: "Hamza", role: "Landing Pages" },
};

type HealthStatus = "on-track" | "at-risk" | "blocked";

type ProjectForm = {
  name: string;
  client: string;
  status: ProjectStatus;
  progress: string;
  assignees: string[];
  startDate: string;
  dueDate: string;
  description: string;
  tasksText: string;
};

const STATUS_STYLES: Record<ProjectStatus, { label: string; border: string; bg: string; text: string }> = {
  todo: { label: "Todo", border: "rgba(148,163,184,0.4)", bg: "rgba(148,163,184,0.16)", text: "#CBD5E1" },
  "in-progress": {
    label: "In Progress",
    border: "rgba(32,147,255,0.45)",
    bg: "rgba(32,147,255,0.2)",
    text: "#8DCDFF",
  },
  blocked: { label: "Blocked", border: "rgba(249,60,60,0.45)", bg: "rgba(249,60,60,0.18)", text: "#FCA5A5" },
  done: { label: "Done", border: "rgba(34,197,94,0.45)", bg: "rgba(34,197,94,0.18)", text: "#86EFAC" },
};

const EMPTY_FORM: ProjectForm = {
  name: "",
  client: "",
  status: "todo",
  progress: "0",
  assignees: ["jahan"],
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  description: "",
  tasksText: "",
};

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function initials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function normalizeProgress(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function completedTaskCount(project: ProjectRecord) {
  if (project.tasks.length === 0) return 0;
  if (project.status === "done") return project.tasks.length;
  return Math.min(project.tasks.length, Math.round((project.tasks.length * project.progress) / 100));
}

function projectHealth(project: ProjectRecord): HealthStatus {
  if (project.status === "blocked") return "blocked";
  if (project.status === "done") return "on-track";
  if (!project.dueDate) return "on-track";

  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(`${project.dueDate}T00:00:00`);
  const diffDays = Math.ceil((due.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "at-risk";
  if (diffDays <= 2 && project.progress < 75) return "at-risk";
  if (project.status === "todo" && diffDays <= 3 && project.progress < 20) return "at-risk";

  return "on-track";
}

function buildFormFromProject(project: ProjectRecord): ProjectForm {
  return {
    name: project.name,
    client: project.client,
    status: project.status,
    progress: String(project.progress),
    assignees: project.assignees,
    startDate: project.startDate,
    dueDate: project.dueDate ?? "",
    description: project.description,
    tasksText: project.tasks.join("\n"),
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const selectedProject = useMemo(
    () => (selectedProjectId ? projects.find((project) => project.id === selectedProjectId) ?? null : null),
    [projects, selectedProjectId],
  );

  const clientOptions = useMemo(() => {
    return Array.from(new Set(projects.map((project) => project.client))).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (clientFilter !== "all" && project.client !== clientFilter) return false;
      if (statusFilter !== "all" && project.status !== statusFilter) return false;
      return true;
    });
  }, [projects, clientFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = filteredProjects.filter((project) => project.status !== "done");
    return {
      activeCount: active.length,
      blockedCount: active.filter((project) => projectHealth(project) === "blocked").length,
      atRiskCount: active.filter((project) => projectHealth(project) === "at-risk").length,
      onTrackCount: active.filter((project) => projectHealth(project) === "on-track").length,
    };
  }, [filteredProjects]);

  async function loadProjects() {
    try {
      setLoading(true);
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (!response.ok) throw new Error("Load failed");
      const data = (await response.json()) as ProjectRecord[];
      setProjects(data);
      setError(null);
    } catch {
      setError("Could not load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  function openCreateForm() {
    setForm({ ...EMPTY_FORM, client: clientFilter === "all" ? "" : clientFilter });
    setFormOpen(true);
  }

  function closeCreateForm() {
    setFormOpen(false);
    setForm(EMPTY_FORM);
  }

  function openDetail(project: ProjectRecord) {
    setSelectedProjectId(project.id);
    setEditMode(false);
    setForm(buildFormFromProject(project));
  }

  function closeDetail() {
    setSelectedProjectId(null);
    setEditMode(false);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.client.trim()) {
      setError("Project name and client are required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          client: form.client,
          status: form.status,
          progress: normalizeProgress(form.progress),
          assignees: form.assignees,
          startDate: form.startDate,
          dueDate: form.dueDate || null,
          description: form.description,
          tasks: form.tasksText
            .split("\n")
            .map((task) => task.trim())
            .filter((task) => task.length > 0),
        }),
      });

      if (!response.ok) throw new Error("Create failed");
      const created = (await response.json()) as ProjectRecord;
      setProjects((prev) => [...prev, created]);
      setError(null);
      closeCreateForm();
    } catch {
      setError("Could not create project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          client: form.client,
          status: form.status,
          progress: normalizeProgress(form.progress),
          assignees: form.assignees,
          startDate: form.startDate,
          dueDate: form.dueDate || null,
          description: form.description,
          tasks: form.tasksText
            .split("\n")
            .map((task) => task.trim())
            .filter((task) => task.length > 0),
        }),
      });

      if (!response.ok) throw new Error("Update failed");
      const updated = (await response.json()) as ProjectRecord;
      setProjects((prev) => prev.map((project) => (project.id === updated.id ? updated : project)));
      setError(null);
      setEditMode(false);
    } catch {
      setError("Could not update project.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedProject) return;
    if (!window.confirm(`Delete project \"${selectedProject.name}\"?`)) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/projects/${selectedProject.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setProjects((prev) => prev.filter((project) => project.id !== selectedProject.id));
      setError(null);
      closeDetail();
    } catch {
      setError("Could not delete project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="mt-2 text-sm text-slate-300">Track client projects, ownership, and delivery timelines.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
            className="rounded-xl border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
          >
            <option value="all">All clients</option>
            {clientOptions.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | ProjectStatus)}
            className="rounded-xl border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
          >
            <option value="all">All statuses</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_STYLES[status].label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/30"
          >
            <Plus size={16} />
            Add Project
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Active Projects</p>
          <p className="mt-3 text-3xl font-semibold text-white">{stats.activeCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">On Track</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-300">{stats.onTrackCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">At Risk</p>
          <p className="mt-3 text-3xl font-semibold text-amber-300">{stats.atRiskCount}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Blocked</p>
          <p className="mt-3 text-3xl font-semibold text-red-300">{stats.blockedCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-6 text-sm text-slate-300">Loading projects...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const style = STATUS_STYLES[project.status];
            const completed = completedTaskCount(project);

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => openDetail(project)}
                className="glass-card w-full cursor-pointer p-5 text-left transition hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold tracking-[-0.02em] text-white">{project.name}</h2>
                    <div className="mt-2 inline-flex items-center rounded-full border border-blue-300/30 bg-blue-500/12 px-2.5 py-1 text-xs font-semibold text-blue-100">
                      {project.client}
                    </div>
                  </div>
                  <span
                    className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                    style={{ borderColor: style.border, background: style.bg, color: style.text }}
                  >
                    {style.label}
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                    <span>Progress</span>
                    <span className="font-semibold text-blue-100">{project.progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${project.progress}%`,
                        background: "linear-gradient(90deg, #2093FF 0%, #0026FF 100%)",
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {project.assignees.map((assignee) => {
                    const member = TEAM[assignee];
                    const name = member?.name ?? assignee;
                    return (
                      <span
                        key={`${project.id}-${assignee}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold text-white"
                        title={name}
                      >
                        {initials(name)}
                      </span>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Start</p>
                    <p className="mt-1 text-slate-100">{formatDate(project.startDate)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Due</p>
                    <p className="mt-1 text-slate-100">{formatDate(project.dueDate)}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] text-slate-300">
                    <CheckSquare size={12} />
                    Task checklist
                  </div>
                  <p>
                    {completed}/{project.tasks.length} complete
                  </p>
                </div>
              </button>
            );
          })}

          {filteredProjects.length === 0 ? (
            <div className="glass-panel col-span-full p-8 text-center text-sm text-slate-300">No projects match your filters.</div>
          ) : null}
        </div>
      )}

      {formOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={closeCreateForm}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close form"
          />
          <div className="absolute left-1/2 top-1/2 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-[#0b0d15]/95 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Add Project</h2>
                <p className="mt-1 text-sm text-slate-300">Create a new client project.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateForm}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
            <ProjectFormFields
              form={form}
              setForm={setForm}
              saving={saving}
              onSubmit={handleCreate}
              submitLabel="Create Project"
            />
          </div>
        </div>
      ) : null}

      {selectedProject ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={closeDetail}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close details"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-white/15 bg-[#0b0d15]/92 p-6 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-blue-200">Project Detail</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{selectedProject.name}</h2>
                <p className="mt-1 text-sm text-slate-300">{selectedProject.client}</p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-lg border border-white/15 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            {editMode ? (
              <ProjectFormFields
                form={form}
                setForm={setForm}
                saving={saving}
                onSubmit={handleUpdate}
                submitLabel="Save Changes"
              />
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-white/12 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Description</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-100">{selectedProject.description || "No description yet."}</p>
                </div>

                <div className="rounded-xl border border-white/12 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Task Checklist</h3>
                  <div className="mt-3 space-y-2">
                    {selectedProject.tasks.length > 0 ? (
                      selectedProject.tasks.map((task, index) => {
                        const checked = index < completedTaskCount(selectedProject);
                        return (
                          <label key={`${selectedProject.id}-task-${index}`} className="flex items-start gap-2.5 text-sm text-slate-100">
                            <input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500"
                            />
                            <span className={checked ? "text-slate-300 line-through" : "text-slate-100"}>{task}</span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-300">No tasks listed.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-white/12 bg-white/5 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Assignees</h3>
                  <div className="mt-3 space-y-2">
                    {selectedProject.assignees.map((id) => {
                      const member = TEAM[id] ?? { name: id, role: "Team Member" };
                      return (
                        <div key={`${selectedProject.id}-assignee-${id}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[11px] font-semibold text-white">
                              {initials(member.name)}
                            </span>
                            <span className="text-sm text-slate-100">{member.name}</span>
                          </div>
                          <span className="text-xs text-slate-300">{member.role}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/12 bg-white/5 p-4">
                    <h3 className="text-xs uppercase tracking-[0.14em] text-slate-300">Start Date</h3>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-100">
                      <CalendarDays size={14} />
                      {formatDate(selectedProject.startDate)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/12 bg-white/5 p-4">
                    <h3 className="text-xs uppercase tracking-[0.14em] text-slate-300">Due Date</h3>
                    <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-100">
                      <CalendarDays size={14} />
                      {formatDate(selectedProject.dueDate)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(buildFormFromProject(selectedProject));
                      setEditMode(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/30"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-400/40 bg-red-500/18 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ProjectFormFields({
  form,
  setForm,
  saving,
  onSubmit,
  submitLabel,
}: {
  form: ProjectForm;
  setForm: React.Dispatch<React.SetStateAction<ProjectForm>>;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm text-slate-200">
          <span>Name</span>
          <input
            required
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="w-full rounded-lg border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
          />
        </label>
        <label className="space-y-1.5 text-sm text-slate-200">
          <span>Client</span>
          <input
            required
            value={form.client}
            onChange={(event) => setForm((prev) => ({ ...prev, client: event.target.value }))}
            className="w-full rounded-lg border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1.5 text-sm text-slate-200">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ProjectStatus }))}
            className="w-full rounded-lg border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_STYLES[status].label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-sm text-slate-200">
          <span>Progress %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={form.progress}
            onChange={(event) => setForm((prev) => ({ ...prev, progress: event.target.value }))}
            className="w-full rounded-lg border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
          />
        </label>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Preview</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${normalizeProgress(form.progress)}%`,
                background: "linear-gradient(90deg, #2093FF 0%, #0026FF 100%)",
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm text-slate-200">
          <span>Start Date</span>
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
            className="w-full rounded-lg border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
          />
        </label>
        <label className="space-y-1.5 text-sm text-slate-200">
          <span>Due Date</span>
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            className="w-full rounded-lg border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
          />
        </label>
      </div>

      <fieldset className="rounded-lg border border-white/12 bg-white/5 p-3">
        <legend className="px-1 text-xs uppercase tracking-[0.12em] text-slate-300">Assignees</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {Object.entries(TEAM).map(([id, member]) => {
            const checked = form.assignees.includes(id);
            return (
              <label key={id} className="inline-flex items-center gap-2 text-sm text-slate-100">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setForm((prev) => {
                      if (event.target.checked) {
                        return { ...prev, assignees: Array.from(new Set([...prev.assignees, id])) };
                      }
                      const next = prev.assignees.filter((entry) => entry !== id);
                      return { ...prev, assignees: next.length > 0 ? next : ["jahan"] };
                    });
                  }}
                  className="h-4 w-4 rounded border-white/20 bg-white/10"
                />
                <span>{member.name}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="block space-y-1.5 text-sm text-slate-200">
        <span>Description</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          className="w-full rounded-lg border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
        />
      </label>

      <label className="block space-y-1.5 text-sm text-slate-200">
        <span>Tasks (one per line)</span>
        <textarea
          rows={5}
          value={form.tasksText}
          onChange={(event) => setForm((prev) => ({ ...prev, tasksText: event.target.value }))}
          className="w-full rounded-lg border border-white/15 bg-[#101625] px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-blue-300/50"
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl border border-blue-300/30 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FolderKanban size={15} />
        {saving ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
