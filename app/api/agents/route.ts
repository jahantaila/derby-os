import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://tumvgvkfzcrlalytyawk.supabase.co";
const SB_B64 = "c2Jfc2VjcmV0X0tGOEZWX0RxZlMzbkQ1d3EtLXhtTUFfQWtuWnBQcU0=";
const SUPABASE_KEY = (() => { try { return atob(SB_B64); } catch { return ""; } })();

async function sb(method: string, path: string, opts?: { params?: string; body?: any }) {
  const url = `${SUPABASE_URL}/rest/v1/${path}${opts?.params ? "?" + opts.params : ""}`;
  const headers: Record<string, string> = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  const init: RequestInit = { method, headers };
  if (opts?.body) {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = "return=representation";
    init.body = JSON.stringify(opts.body);
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: ${res.status} ${await res.text()}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("json") ? res.json() : null;
}

export async function GET() {
  try {
    // Get agents
    const agents = await sb("GET", "agents", { params: "select=*&order=department.asc,name.asc" });
    
    // Get active tasks for each agent
    const tasks = await sb("GET", "tasks", { params: "select=id,title,status,assignee,priority&status=neq.done&order=created_at.desc" });
    
    // Merge tasks into agents
    const tasksByAgent: Record<string, any[]> = {};
    (tasks || []).forEach((t: any) => { (tasksByAgent[t.assignee] ??= []).push(t); });
    
    const enriched = (agents || []).map((a: any) => ({
      ...a,
      skills: typeof a.skills === "string" ? JSON.parse(a.skills) : a.skills || [],
      active_tasks: tasksByAgent[a.id] || [],
      active_task_count: (tasksByAgent[a.id] || []).length,
    }));
    
    return NextResponse.json({ agents: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    updates.updated_at = new Date().toISOString();
    const result = await sb("PATCH", "agents", { params: `id=eq.${id}`, body: updates });
    return NextResponse.json({ agent: result?.[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, role, department } = body;
    if (!id || !name || !role || !department) return NextResponse.json({ error: "id, name, role, department required" }, { status: 400 });
    const result = await sb("POST", "agents", { body });
    return NextResponse.json({ agent: result?.[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
