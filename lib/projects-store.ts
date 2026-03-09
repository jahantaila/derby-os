import { readPersistentData, writePersistentData } from "@/lib/persistence";
import {
  INITIAL_PROJECTS,
  PROJECT_ASSIGNEES,
  PROJECT_STATUSES,
  ProjectRecord,
  ProjectStatus,
} from "@/lib/projects-types";

const PROJECTS_FILE = "projects.json";
const VALID_STATUSES = new Set<ProjectStatus>(PROJECT_STATUSES);
const VALID_ASSIGNEES = new Set<string>(PROJECT_ASSIGNEES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value: unknown, fallback: string): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallback;
}

function normalizeStatus(value: unknown): ProjectStatus {
  if (typeof value === "string" && VALID_STATUSES.has(value as ProjectStatus)) {
    return value as ProjectStatus;
  }
  return "todo";
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
  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
    .filter((entry): entry is string => entry.length > 0 && VALID_ASSIGNEES.has(entry));

  return normalized.length > 0 ? normalized : ["jahan"];
}

function normalizeTasks(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function normalizeProject(raw: unknown): ProjectRecord | null {
  if (!isRecord(raw)) return null;

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const client = typeof raw.client === "string" ? raw.client.trim() : "";
  if (!id || !name || !client) return null;

  const startDate = normalizeDate(raw.startDate, todayIsoDate());

  return {
    id,
    name,
    client,
    status: normalizeStatus(raw.status),
    progress: normalizeProgress(raw.progress),
    assignees: normalizeAssignees(raw.assignees),
    startDate,
    dueDate:
      raw.dueDate === null
        ? null
        : typeof raw.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dueDate)
          ? raw.dueDate
          : null,
    description: typeof raw.description === "string" ? raw.description.trim() : "",
    tasks: normalizeTasks(raw.tasks),
  };
}

function normalizeProjects(raw: unknown): ProjectRecord[] {
  if (!Array.isArray(raw)) return INITIAL_PROJECTS;
  const projects = raw
    .map((entry) => normalizeProject(entry))
    .filter((entry): entry is ProjectRecord => entry !== null);
  return projects.length > 0 ? projects : INITIAL_PROJECTS;
}

export async function getProjects(): Promise<ProjectRecord[]> {
  const raw = await readPersistentData<unknown>(PROJECTS_FILE, INITIAL_PROJECTS);
  const normalized = normalizeProjects(raw);
  if (JSON.stringify(raw) !== JSON.stringify(normalized)) {
    try {
      await writeProjects(normalized);
    } catch {
      // Sandbox-restricted environments may not allow writes outside workspace.
    }
  }
  return normalized;
}

export async function writeProjects(projects: ProjectRecord[]) {
  await writePersistentData(PROJECTS_FILE, normalizeProjects(projects));
}
