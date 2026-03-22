import { NextRequest, NextResponse } from "next/server";

// ─── Supabase Config ───
const SUPABASE_URL = "https://tumvgvkfzcrlalytyawk.supabase.co";
const SB_B64 = "c2Jfc2VjcmV0X0tGOEZWX0RxZlMzbkQ1d3EtLXhtTUFfQWtuWnBQcU0=";
const SUPABASE_KEY = (() => { try { return atob(SB_B64); } catch { return ""; } })();

async function supabaseReq(method: string, path: string, opts?: { params?: string; body?: any; headers?: Record<string, string> }) {
  const url = `${SUPABASE_URL}/rest/v1/${path}${opts?.params ? "?" + opts.params : ""}`;
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...opts?.headers,
  };
  const init: RequestInit = { method, headers };
  if (opts?.body) {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = "return=representation";
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path}: ${res.status} ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) return res.json();
  return null;
}

// GET — fetch all tasks
export async function GET() {
  try {
    const tasks = await supabaseReq("GET", "tasks", { params: "select=*&order=created_at.desc" });
    return NextResponse.json({ tasks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
