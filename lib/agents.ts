import { readData, writeData } from "@/lib/data";

export type AgentStatus = "active" | "working" | "idle";

export type AgentRecord = {
  id: string;
  name: string;
  role: string;
  department: "Executive" | "Marketing" | "Development";
  type: "human" | "agent";
  model: string | null;
  status: AgentStatus;
  currentTask: string;
  skills: string[];
};

export const TEAM_FILE = "team.json";

export const TEAM_SEED: AgentRecord[] = [
  { id: "jahan", name: "Jahan", role: "CEO", department: "Executive", type: "human", model: null, status: "active", currentTask: "Reviewing campaigns", skills: [] },
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
    status: "working",
    currentTask: "Bluegrass campaign",
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
    status: "working",
    currentTask: "Mission Control V3",
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
  { id: "hamza", name: "Hamza", role: "Landing Pages", department: "Development", type: "human", model: null, status: "working", currentTask: "Bluegrass landing page", skills: [] },
];

function hasExpectedBaseline(data: AgentRecord[]): boolean {
  if (data.length !== TEAM_SEED.length) return false;
  const ids = new Set(data.map((agent) => agent.id));
  return TEAM_SEED.every((agent) => ids.has(agent.id));
}

export function getAgents(): AgentRecord[] {
  let data = readData<AgentRecord[]>(TEAM_FILE, []);
  if (!hasExpectedBaseline(data)) {
    try {
      writeData(TEAM_FILE, TEAM_SEED);
    } catch {
      // In sandbox-restricted environments we can still serve seed data.
    }
    data = TEAM_SEED;
  }
  return data;
}

export function getAgentById(id: string): AgentRecord | null {
  return getAgents().find((agent) => agent.id === id) ?? null;
}

export function patchAgentById(
  id: string,
  patch: Partial<Pick<AgentRecord, "status" | "currentTask">>,
): AgentRecord | null {
  const data = getAgents();
  const idx = data.findIndex((agent) => agent.id === id);

  if (idx === -1) return null;

  data[idx] = {
    ...data[idx],
    ...(patch.status ? { status: patch.status } : {}),
    ...(typeof patch.currentTask === "string" ? { currentTask: patch.currentTask } : {}),
  };

  try {
    writeData(TEAM_FILE, data);
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
