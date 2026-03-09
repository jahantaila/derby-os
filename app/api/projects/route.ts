import { NextResponse } from "next/server";
import { getProjects, writeProjects } from "@/lib/projects-store";
import { PROJECT_ASSIGNEES, PROJECT_STATUSES, ProjectRecord, ProjectStatus } from "@/lib/projects-types";

type CreateProjectInput = Partial<Omit<ProjectRecord, "id">>;

const VALID_STATUSES = new Set<ProjectStatus>(PROJECT_STATUSES);
const VALID_ASSIGNEES = new Set<string>(PROJECT_ASSIGNEES);

function buildProjectId() {
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeDate(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallback;
}

function normalizeStatus(value: unknown): ProjectStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as ProjectStatus)
    ? (value as ProjectStatus)
    : "todo";
}

function normalizeProgress(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(100, Math.max(0, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(100, Math.max(0, Math.round(parsed)));
    }
  }
  return 0;
}

function normalizeAssignees(value: unknown): string[] {
  if (!Array.isArray(value)) return ["jahan"];
  const assignees = value
    .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
    .filter((entry): entry is string => entry.length > 0 && VALID_ASSIGNEES.has(entry));
  return assignees.length > 0 ? assignees : ["jahan"];
}

function normalizeTasks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export async function GET() {
  return NextResponse.json(await getProjects());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateProjectInput;
    const name = body.name?.trim();
    const client = body.client?.trim();

    if (!name || !client) {
      return NextResponse.json({ error: "Project name and client are required." }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const project: ProjectRecord = {
      id: buildProjectId(),
      name,
      client,
      status: normalizeStatus(body.status),
      progress: normalizeProgress(body.progress),
      assignees: normalizeAssignees(body.assignees),
      startDate: normalizeDate(body.startDate, today),
      dueDate:
        body.dueDate === null
          ? null
          : typeof body.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
            ? body.dueDate
            : null,
      description: body.description?.trim() ?? "",
      tasks: normalizeTasks(body.tasks),
    };

    const projects = await getProjects();
    projects.push(project);
    await writeProjects(projects);

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create project." }, { status: 500 });
  }
}
