import { NextResponse } from "next/server";
import { supabaseReq } from "@/lib/finance-server";

type AgentMeta = {
  id: string;
  name: string;
  role: string;
  department: string;
};

const AGENTS: AgentMeta[] = [
  { id: "kimberly", name: "Kimberly", role: "Chief of Staff", department: "Executive" },
  { id: "alex", name: "Alex", role: "Marketing Analyst", department: "Marketing" },
  { id: "sabri", name: "Sabri", role: "Ad Producer", department: "Marketing" },
  { id: "kevin", name: "Kevin", role: "Developer", department: "Development" },
  { id: "jordan", name: "Jordan", role: "Operations Specialist", department: "Sales" },
];

const ACCENTS: Record<string, string> = {
  kimberly: "#2093FF",
  alex: "#F93C3C",
  sabri: "#F93C3C",
  kevin: "#FFBD59",
  jordan: "#22C55E",
};

export async function GET() {
  let tasks: any[] = [];
  let debugError: string | null = null;

  try {
    const rows = await supabaseReq("GET", "tasks", {
      params: "select=id,title,status,assignee&order=updated_at.desc",
    });
    tasks = Array.isArray(rows) ? rows : [];
  } catch (err: any) {
    debugError = err.message;
  }

  const inProgress = tasks.filter((t) => t.status === "in_progress");

  const agents = AGENTS.map((agent) => {
    const assignee = inProgress.find((t) => {
      const a = (t.assignee || "").toLowerCase();
      return a.includes(agent.id) || a.includes(agent.name.toLowerCase());
    });

    const now = new Date();
    const hour = now.getUTCHours() - 4; // EST rough
    const day = now.getUTCDay();
    const kimWorking = agent.id === "kimberly" && day >= 1 && day <= 5 && hour >= 9 && hour < 18;

    const status = assignee || kimWorking ? "working" : "idle";
    const task = assignee?.title ?? (kimWorking ? "Coordinating team" : null);

    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      department: agent.department,
      accent: ACCENTS[agent.id] || "#2093FF",
      status,
      task,
    };
  });

  return NextResponse.json(agents, {
    headers: {
      "Cache-Control": "no-store",
      "X-Debug-Error": debugError || "none",
      "X-Debug-Tasks": String(tasks.length),
      "X-Debug-InProgress": String(inProgress.length),
    },
  });
}
