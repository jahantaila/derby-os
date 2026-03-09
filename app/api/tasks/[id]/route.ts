import { NextResponse } from "next/server";
import { getTasks, saveTasks } from "@/lib/tasks-store";
import { TaskPriority, TaskRecord, TaskStatus } from "@/lib/tasks-schema";

type UpdateTaskInput = Partial<Omit<TaskRecord, "id" | "createdAt">>;

const VALID_STATUS: TaskStatus[] = ["todo", "in-progress", "blocked", "done"];
const VALID_PRIORITY: TaskPriority[] = ["high", "medium", "low"];

function isStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && VALID_STATUS.includes(value as TaskStatus);
}

function isPriority(value: unknown): value is TaskPriority {
  return typeof value === "string" && VALID_PRIORITY.includes(value as TaskPriority);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const patch = (await request.json()) as UpdateTaskInput;
    const tasks = getTasks();
    const index = tasks.findIndex((task) => task.id === id);

    if (index < 0) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const current = tasks[index];
    const updated: TaskRecord = {
      ...current,
      title: patch.title?.trim() ?? current.title,
      description: patch.description?.trim() ?? current.description,
      status: isStatus(patch.status) ? patch.status : current.status,
      priority: isPriority(patch.priority) ? patch.priority : current.priority,
      assignee: patch.assignee?.trim() ?? current.assignee,
      client: patch.client?.trim() ?? current.client,
      dueDate: patch.dueDate === undefined ? current.dueDate : patch.dueDate,
    };

    tasks[index] = updated;
    saveTasks(tasks);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update task." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const tasks = getTasks();
    const next = tasks.filter((task) => task.id !== id);

    if (next.length === tasks.length) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    saveTasks(next);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete task." }, { status: 500 });
  }
}
