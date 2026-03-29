import { NextRequest, NextResponse } from "next/server";
import { supabaseReq } from "@/lib/finance-server";

// GET — fetch all tasks
export async function GET() {
  try {
    const tasks = await supabaseReq("GET", "tasks", { params: "select=*&order=created_at.desc" });
    return NextResponse.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch tasks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, status, assignee, priority, category, due_date, created_by, notes } = body;
    if (!title || !assignee) {
      return NextResponse.json({ error: "title and assignee required" }, { status: 400 });
    }
    const row = {
      title,
      description: description || null,
      status: status || "todo",
      assignee,
      priority: priority || "medium",
      category: category || null,
      due_date: due_date || null,
      created_by: created_by || null,
      notes: notes || null,
    };
    const result = await supabaseReq("POST", "tasks", { body: row });
    return NextResponse.json({ task: result?.[0] || row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH — update task
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    updates.updated_at = new Date().toISOString();
    const result = await supabaseReq("PATCH", "tasks", {
      params: `id=eq.${id}`,
      body: updates,
    });
    return NextResponse.json({ task: result?.[0] || updates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — delete task
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await supabaseReq("DELETE", "tasks", { params: `id=eq.${id}` });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
