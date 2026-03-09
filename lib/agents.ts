import { readPersistentData, writePersistentData } from "@/lib/persistence";

export type AgentStatus = "active" | "working" | "idle" | "offline";
export type TeamMemberType = "ceo" | "agent" | "employee";

export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  department: "Executive" | "Marketing" | "Development" | "Fulfillment";
  type: TeamMemberType;
  model: string | null;
  status: AgentStatus;
  currentTask: string;
  skills: string[];
};

export const TEAM_FILE = "team.json";

export const TEAM_SEED: AgentRecord[] = [
  { id: "jahan", name: "Jahan", role: "CEO", department: "Executive", type: "ceo", model: null, status: "active", currentTask: "Managing agency", skills: [] },
  { id: "kimberly", name: "Kimberly", role: "Chief of Staff", department: "Executive", type: "agent", model: "Opus", status: "active", currentTask: "Coordinating team", skills: [] },
  {
    id: "alex",
    name: "Alex",
    role: "Marketing Analyst",
    department: "Marketing",
    type: "agent",
    model: "Sonnet",
    status: "idle",
    currentTask: "",
    skills: [
      "meta_ads_extractor",
      "meta_ads_analyser",
      "ad_creative_analysis",
      "landing_page_analysis",
      "cpa_diagnostics",
      "wasted_spend_finder",
      "anomaly_detection",
      "search_term_mining",
      "geo_performance_analysis",
      "campaign_analysis_standards",
      "report_standards",
      "proposal_writer",
    ],
  },
  {
    id: "sabri",
    name: "Sabri",
    role: "Ad Producer",
    department: "Marketing",
    type: "agent",
    model: "Sonnet",
    status: "idle",
    currentTask: "",
    skills: [
      "google-ads-campaign-builder",
      "lsa-setup-manager",
      "sabri-suby-copywriter",
      "offer-engineer",
      "landing-page-planner",
      "keyword-researcher",
      "ad-copy-ab-tester",
      "google-ads-optimizer",
      "sell-like-crazy",
    ],
  },
  {
    id: "kevin",
    name: "Kevin",
    role: "Developer",
    department: "Development",
    type: "agent",
    model: "Codex",
    status: "idle",
    currentTask: "",
    skills: [
      "frontend-design",
      "derby-design-system",
      "development-standards",
      "nextjs-expert",
      "nextjs",
      "tailwind-design-system",
      "corrections-protocol",
    ],
  },
  { id: "hamza", name: "Hamza", role: "Landing Pages", department: "Development", type: "employee", model: null, status: "offline", currentTask: "", skills: [] },
  {
    id: "abdul",
    name: "Abdul",
    role: "Fulfillment",
    department: "Fulfillment",
    type: "employee",
    model: null,
    status: "offline",
    currentTask: "",
    skills: [],
  },
  {
    id: "elang",
    name: "Elang",
    role: "Fulfillment",
    department: "Fulfillment",
    type: "employee",
    model: null,
    status: "offline",
    currentTask: "",
    skills: [],
  },
];

function hasExpectedBaseline(data: AgentRecord[]): boolean {
  if (data.length !== TEAM_SEED.length) return false;
  const byId = new Map(data.map((member) => [member.id, member]));
  return TEAM_SEED.every((seedMember) => {
    const existing = byId.get(seedMember.id);
    return existing && existing.type === seedMember.type;
  });
}

function normalizeMemberType(type: string | undefined, id: string): TeamMemberType {
  if (type === "agent" || type === "employee" || type === "ceo") return type;
  if (id === "jahan") return "ceo";
  return "employee";
}

function normalizeMemberRecord(member: Partial<AgentRecord>): AgentRecord | null {
  if (!member.id || !member.name || !member.role || !member.department) return null;
  const seed = TEAM_SEED.find((candidate) => candidate.id === member.id);
  if (!seed) return null;

  return {
    ...seed,
    ...member,
    type: normalizeMemberType(typeof member.type === "string" ? member.type : undefined, member.id),
    status: (member.status as AgentStatus) || seed.status,
    currentTask: typeof member.currentTask === "string" ? member.currentTask : seed.currentTask,
    skills: Array.isArray(member.skills) ? member.skills : seed.skills,
    model: member.model ?? seed.model,
  };
}

async function loadTeam(): Promise<AgentRecord[]> {
  const data = await readPersistentData<Partial<AgentRecord>[]>(TEAM_FILE, []);
  const normalized = data.map(normalizeMemberRecord).filter(Boolean) as AgentRecord[];

  if (!hasExpectedBaseline(normalized)) {
    try {
      await writePersistentData(TEAM_FILE, TEAM_SEED);
    } catch {
      // In sandbox-restricted environments we can still serve seed data.
    }
    return TEAM_SEED;
  }

  return normalized;
}

export async function getAgents(type?: TeamMemberType): Promise<AgentRecord[]> {
  const data = await loadTeam();
  if (!type) return data;
  return data.filter((member) => member.type === type);
}

export async function getAgentById(id: string): Promise<AgentRecord | null> {
  const data = await loadTeam();
  return data.find((agent) => agent.id === id) ?? null;
}

export async function patchAgentById(
  id: string,
  patch: Partial<Pick<AgentRecord, "status" | "currentTask">>,
): Promise<AgentRecord | null> {
  const data = await loadTeam();
  const idx = data.findIndex((agent) => agent.id === id);

  if (idx === -1) return null;

  data[idx] = {
    ...data[idx],
    ...(patch.status ? { status: patch.status } : {}),
    ...(typeof patch.currentTask === "string" ? { currentTask: patch.currentTask } : {}),
  };

  if (!hasExpectedBaseline(data)) {
    return null;
  }

  try {
    await writePersistentData(TEAM_FILE, data);
  } catch {
    // Ignore write failure in restricted environments; return updated in-memory shape.
  }

  return data[idx];
}

export function getSoulPath(id: string): string | null {
  const paths: Record<string, string> = {
    kimberly: "/home/kim/.openclaw/workspace/SOUL.md",
    alex: "/home/kim/.openclaw/workspace/agents/alex/SOUL.md",
    sabri: "/home/kim/.openclaw/workspace/agents/sabri/SOUL.md",
    kevin: "/home/kim/.openclaw/workspace/agents/kevin/SOUL.md",
  };

  return paths[id] ?? null;
}
