import { NextResponse } from "next/server";

// Bridge: calls OpenClaw's local API to get real-time subagent status
// Falls back to Supabase task-based status if OpenClaw is unreachable

const OPENCLAW_URL = process.env.OPENCLAW_API_URL || "http://localhost:3284";
const SB_URL = "https://tumvgvkfzcrlalytyawk.supabase.co/rest/v1";
const SB_KEY = Buffer.from("c2Jfc2VjcmV0X0tGOEZWX0RxZlMzbkQ1d3EtLXhtTUFfQWtuWnBQcU0=", "base64").toString();

// Map subagent labels to agent IDs
const LABEL_TO_AGENT: Record<string, string> = {
  "kevin": "kevin",
  "jordan": "jordan",
  "alex": "alex",
  "sabri": "sabri",
  "kimberly": "kimberly",
};

function matchLabel(label: string): string | null {
  const lower = label.toLowerCase();
  for (const [key, agentId] of Object.entries(LABEL_TO_AGENT)) {
    if (lower.includes(key)) return agentId;
  }
  return null;
}

interface AgentLiveStatus {
  id: string;
  status: "working" | "idle";
  currentTask: string | null;
  source: "openclaw" | "supabase";
}

export async function GET() {
  const statuses: Record<string, AgentLiveStatus> = {};

  // Initialize all agents as idle
  for (const agentId of ["kimberly", "kevin", "alex", "sabri", "jordan"]) {
    statuses[agentId] = { id: agentId, status: "idle", currentTask: null, source: "supabase" };
  }

  // Try OpenClaw sessions API first
  let openclawWorked = false;
  try {
    const res = await fetch(`${OPENCLAW_URL}/api/sessions?active=true`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      const sessions = data.sessions || data.active || data || [];
      if (Array.isArray(sessions)) {
        for (const session of sessions) {
          const label = session.label || session.name || "";
          const task = session.task || session.message || "";
          const agentId = matchLabel(label);
          if (agentId) {
            statuses[agentId] = {
              id: agentId,
              status: "working",
              currentTask: task.slice(0, 100) || `Running (${label})`,
              source: "openclaw",
            };
            openclawWorked = true;
          }
        }
      }
    }
  } catch {
    // OpenClaw not reachable, fall back to Supabase
  }

  // Always check Supabase tasks as supplementary data
  try {
    const res = await fetch(
      `${SB_URL}/tasks?status=eq.in_progress&select=title,assignee`,
      {
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.ok) {
      const tasks = await res.json();
      for (const task of tasks) {
        const agentId = task.assignee?.toLowerCase();
        if (agentId && statuses[agentId] && statuses[agentId].status !== "working") {
          statuses[agentId] = {
            id: agentId,
            status: "working",
            currentTask: task.title,
            source: "supabase",
          };
        }
      }
    }
  } catch {
    // Supabase unreachable
  }

  return NextResponse.json({
    agents: Object.values(statuses),
    openclawConnected: openclawWorked,
    timestamp: new Date().toISOString(),
  });
}

// POST: Update agent status (called by Kimberly when spawning/completing sub-agents)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentId, status, task } = body;
    if (!agentId || !status) {
      return NextResponse.json({ error: "agentId and status required" }, { status: 400 });
    }

    // Update the agent's task in Supabase to reflect live status
    if (status === "working" && task) {
      // Create or update an in_progress task for this agent
      const existing = await fetch(
        `${SB_URL}/tasks?assignee=eq.${agentId}&status=eq.in_progress&limit=1`,
        { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
      );
      const rows = await existing.json();

      if (rows.length > 0) {
        // Update existing
        await fetch(`${SB_URL}/tasks?id=eq.${rows[0].id}`, {
          method: "PATCH",
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ title: task, updated_at: new Date().toISOString() }),
        });
      } else {
        // Create a live-status task
        await fetch(`${SB_URL}/tasks`, {
          method: "POST",
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            title: task,
            assignee: agentId,
            status: "in_progress",
            priority: "medium",
            created_by: "system",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        });
      }
    } else if (status === "idle") {
      // Clear in_progress tasks for this agent (set to todo)
      await fetch(
        `${SB_URL}/tasks?assignee=eq.${agentId}&status=eq.in_progress&created_by=eq.system`,
        {
          method: "PATCH",
          headers: {
            apikey: SB_KEY,
            Authorization: `Bearer ${SB_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ status: "todo", updated_at: new Date().toISOString() }),
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
