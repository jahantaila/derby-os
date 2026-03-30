import { TEAM_SEED } from "@/lib/agents-data";
import { supabaseReq } from "@/lib/finance-server";

export type OfficeAgentId = "kimberly" | "kevin" | "sabri" | "alex" | "jordan";
export type OfficeAgentStatus = "idle" | "working";

export type OfficeAgentTaskRecord = {
  id: string;
  title: string;
  status: string;
  assignee: string | null;
  priority?: string | null;
  description?: string | null;
  notes?: string | null;
  client?: string | null;
  category?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OfficeLiveAgent = {
  id: OfficeAgentId;
  name: string;
  role: string;
  department: "Executive" | "Marketing" | "Sales" | "Development";
  accent: string;
  status: OfficeAgentStatus;
  task: string | null;
};

const OFFICE_AGENT_IDS = new Set<OfficeAgentId>(["kimberly", "kevin", "sabri", "alex", "jordan"]);

export const OFFICE_AGENT_META = TEAM_SEED.filter(
  (agent): agent is typeof agent & { id: OfficeAgentId; department: OfficeLiveAgent["department"] } =>
    OFFICE_AGENT_IDS.has(agent.id as OfficeAgentId) &&
    (agent.department === "Executive" ||
      agent.department === "Marketing" ||
      agent.department === "Sales" ||
      agent.department === "Development"),
).map((agent) => ({
  id: agent.id,
  name: agent.name,
  role: agent.role,
  department: agent.department,
}));

export const OFFICE_AGENT_ACCENTS: Record<OfficeAgentId, string> = {
  kimberly: "#2093FF",
  kevin: "#FFBD59",
  sabri: "#F93C3C",
  alex: "#F93C3C",
  jordan: "#22C55E",
};

function normalizeAssignee(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function taskMatchesAgent(task: OfficeAgentTaskRecord, agent: { id: string; name: string }) {
  const assignee = normalizeAssignee(task.assignee);
  if (!assignee) return false;

  const compactName = agent.name.toLowerCase();
  return assignee.includes(agent.id) || assignee.includes(compactName);
}

function formatTaskTitle(value: string | null | undefined) {
  const text = value?.trim();
  return text && text.length > 0 ? text : null;
}

function getEasternParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);

  return {
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "Sun",
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
  };
}

export function isBusinessHours(date = new Date()) {
  const { weekday, hour } = getEasternParts(date);
  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);
  return isWeekday && hour >= 9 && hour < 18;
}

async function getAllTasks() {
  const rows = await supabaseReq("GET", "tasks", {
    params:
      "select=id,title,status,assignee,priority,description,notes,client,category,due_date,created_at,updated_at&order=updated_at.desc",
    useAnonKey: true,
  });

  return Array.isArray(rows) ? (rows as OfficeAgentTaskRecord[]) : [];
}

export async function getLiveOfficeAgents(): Promise<OfficeLiveAgent[]> {
  let tasks: OfficeAgentTaskRecord[] = [];

  try {
    tasks = await getAllTasks();
  } catch {
    tasks = [];
  }

  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");

  return OFFICE_AGENT_META.map((agent) => {
    const currentTask = inProgressTasks.find((task) => taskMatchesAgent(task, agent));
    const kimberlyWorking = agent.id === "kimberly" && isBusinessHours();
    const status: OfficeAgentStatus = currentTask || kimberlyWorking ? "working" : "idle";

    return {
      ...agent,
      accent: OFFICE_AGENT_ACCENTS[agent.id],
      status,
      task: formatTaskTitle(currentTask?.title) ?? (kimberlyWorking ? "Coordinating team" : null),
    };
  });
}

export async function getAgentTasks(agentId: OfficeAgentId) {
  const agent = OFFICE_AGENT_META.find((entry) => entry.id === agentId);
  if (!agent) return [];

  try {
    const tasks = await getAllTasks();
    return tasks.filter((task) => taskMatchesAgent(task, agent));
  } catch {
    return [];
  }
}
