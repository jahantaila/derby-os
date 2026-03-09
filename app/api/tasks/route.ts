import { NextResponse } from "next/server";
import { getTasks, saveTasks } from "@/lib/tasks-store";
import { TaskPriority, TaskRecord, TaskStatus } from "@/lib/tasks-schema";

type CreateTaskInput = Partial<Omit<TaskRecord, "id" | "createdAt">>;

const VALID_STATUS: TaskStatus[] = ["todo", "in-progress", "blocked", "done"];
const VALID_PRIORITY: TaskPriority[] = ["high", "medium", "low"];

function buildTaskId() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function isStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && VALID_STATUS.includes(value as TaskStatus);
}

function isPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && VALID_PRIORITY.includes(value as TaskPriority);
}

export async function GET() {
  return NextResponse.json(await getTasks());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateTaskInput;
    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);
    const task: TaskRecord = {
      id: buildTaskId(),
      title,
      description: body.description?.trim() ?? "",
      status: isStatus(body.status) ? body.status : "todo",
      priority: isPriority(body.priority) ? body.priority : "medium",
      assignee: body.assignee?.trim() || "jahan",
      client: body.client?.trim() || "Derby Digital",
      createdAt: today,
      dueDate: body.dueDate === null ? null : body.dueDate?.trim() || null,
    };

    const tasks = await getTasks();
    tasks.push(task);
    await saveTasks(tasks);

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create task." }, { status: 500 });
  }
}
