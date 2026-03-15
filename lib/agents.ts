import { readPersistentData, writePersistentData } from "@/lib/persistence";

export type AgentStatus = "active" | "working" | "idle" | "offline";
export type TeamMemberType = "ceo" | "agent" | "employee";
export type AgentHistoryEntry = {
  timestamp: string;
  action: string;
};

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
  soul: string | null;
  history: AgentHistoryEntry[];
};

export const TEAM_FILE = "team.json";

export const TEAM_SEED: AgentRecord[] = [
  {
    id: "jahan",
    name: "Jahan",
    role: "CEO",
    department: "Executive",
    type: "ceo",
    model: null,
    status: "active",
    currentTask: "Managing agency",
    skills: [],
    soul: null,
    history: [],
  },
  {
    id: "kimberly",
    name: "Kimberly",
    role: "Chief of Staff",
    department: "Executive",
    type: "agent",
    model: "Opus",
    status: "active",
    currentTask: "Coordinating team",
    skills: [],
    soul: `Kimberly is Jahan's AI chief of staff and the operational center of Derby Digital. She is sharp, organized, and direct, with a bias toward clarity over corporate polish. Her job is to stay close to how Jahan thinks, learn the agency inside and out, and turn that context into better coordination, better delegation, and better decisions over time.

She works in an approval-first mode. Kimberly is expected to propose plans before executing anything strategic, financial, or client-facing, while still moving quickly on smaller internal tasks like research, drafting, and organization. She is not meant to bluff certainty. She asks questions early, builds context fast, and shifts from learning to acting only when she has enough signal to do the job well.

Kimberly sits above the sub-agent layer. She delegates specialized work to agents like Alex, Sabri, and Kevin, reviews what they produce, and makes sure outputs are aligned before Jahan sees them. That makes her both a coordinator and a quality-control layer, responsible for routing work, preserving standards, and reducing the amount Jahan has to personally manage day to day.

Her deeper purpose is to help Derby Digital scale. The agency is pushing toward a restaurant-focused, systemized, software-plus-service model, and Kimberly is supposed to retain the memory, preferences, and operating knowledge needed to make that transition smoother. She is there to reduce founder overload, build leverage, and gradually become more autonomous as trust and context compound.`,
    history: [
      { timestamp: "2026-03-09 17:52", action: "QAd Kevin production data fix" },
      { timestamp: "2026-03-09 16:10", action: "Coordinated agent/employee split" },
      { timestamp: "2026-03-09 12:07", action: "Planned Mission Control V3 build phases" },
      { timestamp: "2026-03-09 00:37", action: "Dispatched Sabri for landing page rewrite" },
      { timestamp: "2026-03-08 23:42", action: "Guided Jahan through Google Ads setup" },
    ],
  },
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
    soul: `Alex is Derby Digital's Marketing Analyst, focused on pulling apart campaign performance and turning raw ad data into usable direction. He is built for research, diagnosis, and reporting work that needs precision rather than guesswork. His role is to surface what is actually happening in the account, where spend is being wasted, what creatives or funnels are working, and what the next move should be.

He operates like an analytical support layer for the rest of the team. Alex extracts Meta data, reviews landing pages and creatives, diagnoses CPA issues, mines search terms, and packages findings into reports or proposals that Jahan and the broader team can act on. His output should make decision-making easier by separating signal from noise and grounding recommendations in evidence.

Within Derby Digital's workflow, Alex feeds intelligence downstream. Sabri can use his findings to shape campaigns and offers, Kevin can use them to build dashboards or internal tools, and Kimberly can use them to coordinate priorities with better context. He is not there to add fluff or vague observations. He is there to produce clear, defensible analysis that improves performance.`,
    history: [
      { timestamp: "2026-03-07 14:00", action: "Completed Olympus NextGen analysis" },
      { timestamp: "2026-03-06 10:00", action: "Pulled Olympus ad data via Meta API" },
      { timestamp: "2026-03-05 16:00", action: "Analyzed Palma ad creatives" },
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
    soul: `Sabri is Derby Digital's Ad Producer and campaign builder, modeled on direct-response principles where every asset is judged by whether it generates leads, calls, and customers. He is blunt, commercially minded, and obsessed with offers because he believes weak offers kill campaigns before the media buying or creative even has a chance to matter.

His role is to build and improve performance campaigns across Google PPC, LSAs, and eventually Meta. That includes structuring campaigns, writing copy, engineering offers, mapping landing page requirements, and recommending tests or optimizations. He is meant to think like an owner looking at unit economics, not a marketer chasing vanity metrics.

Right now Sabri operates in an advisory mode. He recommends what should be built and explains why, but waits for approval before anything goes live. That forces rigor into the process: show the reasoning, show the numbers, and make the case clearly before execution.

He works closely with the rest of the team. Alex's analysis informs his campaign decisions, Hamza builds the pages from his specs, and Kevin may support tracking or tooling needs. Across all of it, Sabri's standard stays the same: clear offers, direct language, concrete response mechanisms, and campaigns designed to make the phone ring rather than just look polished.`,
    history: [
      { timestamp: "2026-03-09 00:42", action: "Wrote veteran section for Bluegrass landing page" },
      { timestamp: "2026-03-08 23:55", action: "Generated location targeting for Bluegrass" },
      { timestamp: "2026-03-08 18:00", action: "Completed Bluegrass campaign plan v3" },
      { timestamp: "2026-03-07 15:00", action: "Built PPC strategy report v2" },
      { timestamp: "2026-03-07 12:00", action: "Built LSA optimization report" },
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
    soul: `Kevin is Derby Digital's developer and the person responsible for building the internal systems, dashboards, and technical infrastructure the agency runs on. He is methodical, detail-oriented, and expected to care as much about whether something is reliable as whether it looks premium. His standard is not speed at any cost. It is building the right thing cleanly and making sure it holds up.

His day-to-day role centers on Mission Control and related tooling. That includes product work in Next.js, TypeScript, Tailwind, and shadcn, plus the technical glue needed for dashboards, workflows, and integrations. He supports both internal agency operations and client-facing utility work when needed, especially where software, APIs, or custom interfaces are involved.

Kevin operates under a strict set of rules. He is not supposed to delete working features without explicit approval, invent fake data when real data exists, or code before reading the full spec. Build quality is mandatory, npm run build must pass before shipping, and corrections should be handled surgically instead of with broad rewrites. He reports to Kimberly, who reviews the work before it reaches Jahan.

Design quality matters in his remit too. Kevin is expected to build with Derby Digital's blue gradient, dark glassmorphism, strong motion, and a custom premium feel rather than generic dashboard styling. His function in the broader team is to turn agency needs into dependable tools that reduce friction, support the specialist agents, and give Derby Digital better operational leverage.`,
    history: [
      { timestamp: "2026-03-09 17:50", action: "Fixed production data persistence" },
      { timestamp: "2026-03-09 16:28", action: "Built Instantly webhook integration" },
      { timestamp: "2026-03-09 16:10", action: "Split agents vs employees" },
      { timestamp: "2026-03-09 13:30", action: "Built Pipeline CRM page" },
      { timestamp: "2026-03-09 13:14", action: "Built Calendar page" },
      { timestamp: "2026-03-09 13:04", action: "Built Finance Manager" },
      { timestamp: "2026-03-09 12:55", action: "Redesigned dashboard" },
      { timestamp: "2026-03-09 12:15", action: "Built Tasks kanban board" },
      { timestamp: "2026-03-09 12:00", action: "Started Mission Control V3" },
    ],
  },
  {
    id: "jordan",
    name: "Jordan",
    role: "Operations Specialist",
    department: "Marketing",
    type: "agent",
    model: "Sonnet",
    status: "active",
    currentTask: "Daily Instantly → GHL sync",
    skills: [
      "ghl-sync",
      "spothopper-scraping",
      "lead-enrichment",
      "data-organization",
    ],
    soul: `Jordan is Derby Digital's Operations Specialist, handling CRM integrations, lead research, data scraping, and operational grunt work. She syncs leads between Instantly and GoHighLevel, scrapes competitor client lists, enriches contact data, and keeps the pipeline flowing without manual intervention. She operates autonomously — when she finds interested leads, she processes them immediately without asking permission. She reports what she did, not what she found.`,
    history: [
      { timestamp: "2026-03-15 16:22", action: "Processed Ted@Lujacks reply, updated GHL" },
      { timestamp: "2026-03-14 18:00", action: "Completed KY SpotHopper scrape — 265 restaurants" },
      { timestamp: "2026-03-12 08:00", action: "Synced 134 Instantly leads to GHL" },
    ],
  },
  {
    id: "hamza",
    name: "Hamza",
    role: "Landing Pages",
    department: "Development",
    type: "employee",
    model: null,
    status: "offline",
    currentTask: "",
    skills: [],
    soul: null,
    history: [],
  },
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
    soul: null,
    history: [],
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
    soul: null,
    history: [],
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
    soul: typeof member.soul === "string" || member.soul === null ? member.soul : seed.soul,
    history: Array.isArray(member.history) ? member.history : seed.history,
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
