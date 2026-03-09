import { readData, writeData } from "@/lib/data";
import { INITIAL_TASKS, TaskRecord } from "@/lib/tasks-schema";

const TASKS_FILE = "tasks.json";
const VALID_STATUS = new Set(["todo", "in-progress", "blocked", "done"]);
const VALID_PRIORITY = new Set(["high", "medium", "low"]);

function isTaskRecord(value: unknown): value is TaskRecord {
  if (!value || typeof value !== "object") return false;
  const task = value as TaskRecord;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.description === "string" &&
    typeof task.status === "string" &&
    VALID_STATUS.has(task.status) &&
    typeof task.priority === "string" &&
    VALID_PRIORITY.has(task.priority) &&
    typeof task.assignee === "string" &&
    typeof task.client === "string" &&
    typeof task.createdAt === "string" &&
    (typeof task.dueDate === "string" || task.dueDate === null)
  );
}

function isTaskArray(value: unknown): value is TaskRecord[] {
  return Array.isArray(value) && value.every(isTaskRecord);
}

export function getTasks(): TaskRecord[] {
  const raw = readData<unknown>(TASKS_FILE, INITIAL_TASKS);
  if (isTaskArray(raw) && raw.length > 0) return raw;

  try {
    writeData(TASKS_FILE, INITIAL_TASKS);
  } catch {
    // Sandbox-restricted environments may not allow writes outside workspace.
  }

  return INITIAL_TASKS;
}

export function saveTasks(tasks: TaskRecord[]) {
  writeData(TASKS_FILE, tasks);
}
