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
