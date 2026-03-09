import { NextResponse } from "next/server";
import { getProjects, writeProjects } from "@/lib/projects-store";
import { PROJECT_ASSIGNEES, PROJECT_STATUSES, ProjectRecord, ProjectStatus } from "@/lib/projects-types";

type UpdateProjectInput = Partial<Omit<ProjectRecord, "id">>;

const VALID_STATUSES = new Set<ProjectStatus>(PROJECT_STATUSES);
const VALID_ASSIGNEES = new Set<string>(PROJECT_ASSIGNEES);

function normalizeStatus(value: unknown): ProjectStatus | undefined {
  if (typeof value === "string" && VALID_STATUSES.has(value as ProjectStatus)) {
    return value as ProjectStatus;
  }
  return undefined;
}

function normalizeProgress(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(100, Math.max(0, Math.round(parsed)));
    }
  }
  return undefined;
}

function normalizeAssignees(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const assignees = value
    .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
    .filter((entry): entry is string => entry.length > 0 && VALID_ASSIGNEES.has(entry));

  return assignees.length > 0 ? assignees : undefined;
}

function normalizeTasks(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const tasks = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
  return tasks;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const patch = (await request.json()) as UpdateProjectInput;
    const projects = getProjects();
    const index = projects.findIndex((project) => project.id === id);

    if (index < 0) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const current = projects[index];
    const status = normalizeStatus(patch.status);
    const progress = normalizeProgress(patch.progress);
    const assignees = normalizeAssignees(patch.assignees);
    const tasks = normalizeTasks(patch.tasks);

    const updated: ProjectRecord = {
      ...current,
      name: patch.name?.trim() || current.name,
      client: patch.client?.trim() || current.client,
      status: status ?? current.status,
      progress: progress ?? current.progress,
      assignees: assignees ?? current.assignees,
      startDate:
        typeof patch.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch.startDate)
          ? patch.startDate
          : current.startDate,
      dueDate:
        patch.dueDate === undefined
          ? current.dueDate
          : patch.dueDate === null
            ? null
            : typeof patch.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch.dueDate)
              ? patch.dueDate
              : current.dueDate,
      description: patch.description === undefined ? current.description : patch.description.trim(),
      tasks: tasks ?? current.tasks,
    };

    projects[index] = updated;
    writeProjects(projects);

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update project." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const projects = getProjects();
    const next = projects.filter((project) => project.id !== id);

    if (next.length === projects.length) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    writeProjects(next);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete project." }, { status: 500 });
  }
}
