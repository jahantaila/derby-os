export type AgentStatus = "active" | "idle" | "offline";
export type Department = "Executive" | "Marketing" | "Development";

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  department: Department;
  type: "AI" | "Human";
  model: string | null;
  status: AgentStatus;
  currentTask: string;
  skillsCount: number;
  tasksCompleted: number;
  lastActive: string;
};

export type ClientStatus = "Active" | "Onboarding" | "Paused";

export type Client = {
  id: string;
  businessName: string;
  industry: string;
  location: string;
  services: string[];
  monthlyBudget: number;
  monthSpend: number;
  monthLeads: number;
  status: ClientStatus;
  assignedTeam: string[];
  lastReportDate: string;
};

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "backlog" | "in-progress" | "review" | "done";

export type Task = {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: TaskPriority;
  clientId: string | null;
  status: TaskStatus;
  createdAt: string;
  dueDate: string | null;
  notes: string;
  subtasks: { id: string; text: string; done: boolean }[];
};

export type ActivityItem = {
  id: string;
  agent: string;
  action: string;
  timestamp: string;
};

export type Campaign = {
  id: string;
  clientName: string;
  campaignName: string;
  platform: "Google Ads" | "Meta" | "LSA";
  status: "Active" | "Paused" | "Draft" | "Ended";
  budgetMonthly: number;
  spendMonth: number;
  leads: number;
  cpl: number;
  ctr: number;
  lastOptimized: string;
};

export type CostEntry = {
  id: string;
  date: string;
  agent: string;
  task: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
};

export type ReportItem = {
  id: string;
  title: string;
  type: "Analysis" | "Proposal" | "Campaign Plan" | "Optimization Report";
  client: string;
  generatedBy: string;
  dateGenerated: string;
  path: string;
};

export const seedTeam: TeamMember[] = [
  {
    id: "team-jahan",
    name: "Jahan",
    role: "CEO",
    department: "Executive",
    type: "Human",
    model: null,
    status: "active",
    currentTask: "Agency strategy review",
    skillsCount: 0,
    tasksCompleted: 221,
    lastActive: "2026-03-08T11:35:00.000Z",
  },
  {
    id: "team-kimberly",
    name: "Kimberly",
    role: "Chief of Staff",
    department: "Executive",
    type: "AI",
    model: "Opus",
    status: "active",
    currentTask: "Operating cadence and priorities",
    skillsCount: 34,
    tasksCompleted: 1489,
    lastActive: "2026-03-08T11:38:00.000Z",
  },
  {
    id: "team-alex",
    name: "Alex",
    role: "Marketing Analyst",
    department: "Marketing",
    type: "AI",
    model: "Sonnet",
    status: "active",
    currentTask: "Olympus Q2 audience analysis",
    skillsCount: 21,
    tasksCompleted: 802,
    lastActive: "2026-03-08T10:52:00.000Z",
  },
  {
    id: "team-sabri",
    name: "Sabri",
    role: "Ad Producer",
    department: "Marketing",
    type: "AI",
    model: "Sonnet",
    status: "idle",
    currentTask: "Bluegrass LSA creative iteration",
    skillsCount: 19,
    tasksCompleted: 715,
    lastActive: "2026-03-08T09:44:00.000Z",
  },
  {
    id: "team-kevin",
    name: "Kevin",
    role: "Developer",
    department: "Development",
    type: "AI",
    model: "Codex",
    status: "active",
    currentTask: "Mission Control v3 rebuild",
    skillsCount: 27,
    tasksCompleted: 934,
    lastActive: "2026-03-08T11:40:00.000Z",
  },
  {
    id: "team-hamza",
    name: "Hamza",
    role: "Landing Page Designer",
    department: "Development",
    type: "Human",
    model: null,
    status: "active",
    currentTask: "Palma spring promo LP refresh",
    skillsCount: 0,
    tasksCompleted: 276,
    lastActive: "2026-03-08T10:21:00.000Z",
  },
];

export const seedClients: Client[] = [
  {
    id: "client-bluegrass-garage-door",
    businessName: "Bluegrass Garage Door",
    industry: "Home Services",
    location: "Louisville, KY",
    services: ["LSA", "PPC"],
    monthlyBudget: 12000,
    monthSpend: 9340,
    monthLeads: 186,
    status: "Active",
    assignedTeam: ["Alex", "Sabri", "Kimberly"],
    lastReportDate: "2026-03-03",
  },
  {
    id: "client-palma-italian-kitchen",
    businessName: "Palma Italian Kitchen",
    industry: "Restaurant",
    location: "Louisville, KY",
    services: ["Meta Ads", "Creative"],
    monthlyBudget: 8500,
    monthSpend: 6170,
    monthLeads: 124,
    status: "Active",
    assignedTeam: ["Sabri", "Alex", "Hamza"],
    lastReportDate: "2026-03-05",
  },
  {
    id: "client-olympus-gaming-lounge",
    businessName: "Olympus Gaming Lounge",
    industry: "Entertainment",
    location: "Louisville, KY",
    services: ["Meta Ads", "Community Growth"],
    monthlyBudget: 6000,
    monthSpend: 4045,
    monthLeads: 88,
    status: "Onboarding",
    assignedTeam: ["Alex", "Sabri", "Kevin"],
    lastReportDate: "2026-02-28",
  },
];

export const seedTasks: Task[] = [
  {
    id: "task-1",
    title: "Launch Bluegrass Q2 LSA refresh",
    description: "Ship revised call asset set and location extensions for all top service lines.",
    assignedTo: "Sabri",
    priority: "high",
    clientId: "client-bluegrass-garage-door",
    status: "in-progress",
    createdAt: "2026-03-05T13:20:00.000Z",
    dueDate: "2026-03-10",
    notes: "Prioritize spring replacement demand spike.",
    subtasks: [
      { id: "st-1", text: "Finalize service ad copy", done: true },
      { id: "st-2", text: "Approve conversion tracking", done: false },
    ],
  },
  {
    id: "task-2",
    title: "Palma offer angle test",
    description: "Run A/B messaging for family bundle vs date-night promo.",
    assignedTo: "Alex",
    priority: "medium",
    clientId: "client-palma-italian-kitchen",
    status: "review",
    createdAt: "2026-03-04T09:10:00.000Z",
    dueDate: "2026-03-09",
    notes: "Review CTR deltas before budget shift.",
    subtasks: [],
  },
  {
    id: "task-3",
    title: "Mission Control v3 API scaffold",
    description: "Implement JSON-backed routes for team, clients, tasks, activity, campaigns, costs, reports.",
    assignedTo: "Kevin",
    priority: "urgent",
    clientId: null,
    status: "in-progress",
    createdAt: "2026-03-08T10:00:00.000Z",
    dueDate: "2026-03-08",
    notes: "Must pass build and commit.",
    subtasks: [],
  },
  {
    id: "task-4",
    title: "Olympus onboarding checklist",
    description: "Complete pixel verification and audience handoff packet.",
    assignedTo: "Kimberly",
    priority: "high",
    clientId: "client-olympus-gaming-lounge",
    status: "backlog",
    createdAt: "2026-03-07T14:44:00.000Z",
    dueDate: "2026-03-12",
    notes: "Coordinate with Kevin for tracking QA.",
    subtasks: [],
  },
  {
    id: "task-5",
    title: "Build landing page variant for Palma",
    description: "Produce mobile-first hero and menu-focused conversion block.",
    assignedTo: "Hamza",
    priority: "medium",
    clientId: "client-palma-italian-kitchen",
    status: "done",
    createdAt: "2026-03-01T12:12:00.000Z",
    dueDate: "2026-03-06",
    notes: "Version B shipped.",
    subtasks: [],
  },
];

export const seedActivity: ActivityItem[] = [
  {
    id: "act-1",
    agent: "Sabri",
    action: "completed Bluegrass Garage Door campaign plan",
    timestamp: "2026-03-08T11:36:00.000Z",
  },
  {
    id: "act-2",
    agent: "Alex",
    action: "generated Olympus NextGen proposal",
    timestamp: "2026-03-08T10:40:00.000Z",
  },
  {
    id: "act-3",
    agent: "Kevin",
    action: "deployed Mission Control v3",
    timestamp: "2026-03-08T08:22:00.000Z",
  },
  {
    id: "act-4",
    agent: "Kimberly",
    action: "assigned onboarding tasks for Olympus Gaming Lounge",
    timestamp: "2026-03-08T07:55:00.000Z",
  },
];

export const seedCampaigns: Campaign[] = [
  {
    id: "camp-1",
    clientName: "Bluegrass Garage Door",
    campaignName: "Emergency Spring Repairs",
    platform: "Google Ads",
    status: "Active",
    budgetMonthly: 9000,
    spendMonth: 6610,
    leads: 142,
    cpl: 46.55,
    ctr: 8.4,
    lastOptimized: "2026-03-06",
  },
  {
    id: "camp-2",
    clientName: "Palma Italian Kitchen",
    campaignName: "Family Bundle Weekend Push",
    platform: "Meta",
    status: "Active",
    budgetMonthly: 5000,
    spendMonth: 3740,
    leads: 98,
    cpl: 38.16,
    ctr: 5.9,
    lastOptimized: "2026-03-07",
  },
  {
    id: "camp-3",
    clientName: "Bluegrass Garage Door",
    campaignName: "Louisville LSA Core",
    platform: "LSA",
    status: "Paused",
    budgetMonthly: 3000,
    spendMonth: 1975,
    leads: 44,
    cpl: 44.88,
    ctr: 0,
    lastOptimized: "2026-02-25",
  },
];

export const seedCosts: CostEntry[] = [
  {
    id: "cost-1",
    date: "2026-03-08",
    agent: "Kimberly",
    task: "Daily operations sync",
    model: "Opus",
    inputTokens: 32411,
    outputTokens: 9093,
    cost: 8.42,
  },
  {
    id: "cost-2",
    date: "2026-03-08",
    agent: "Alex",
    task: "Olympus audience analysis",
    model: "Sonnet",
    inputTokens: 21920,
    outputTokens: 6211,
    cost: 3.15,
  },
  {
    id: "cost-3",
    date: "2026-03-08",
    agent: "Sabri",
    task: "Creative campaign draft",
    model: "Sonnet",
    inputTokens: 18820,
    outputTokens: 5405,
    cost: 2.76,
  },
  {
    id: "cost-4",
    date: "2026-03-08",
    agent: "Kevin",
    task: "Mission Control rebuild",
    model: "Codex",
    inputTokens: 41109,
    outputTokens: 13019,
    cost: 6.98,
  },
];

export const seedReports: ReportItem[] = [
  {
    id: "report-1",
    title: "Bluegrass March Optimization Report",
    type: "Optimization Report",
    client: "Bluegrass Garage Door",
    generatedBy: "Alex",
    dateGenerated: "2026-03-03",
    path: "/home/kim/.openclaw/workspace/agents/alex/projects/bluegrass-march-optimization/report.html",
  },
  {
    id: "report-2",
    title: "Palma Meta Campaign Plan",
    type: "Campaign Plan",
    client: "Palma Italian Kitchen",
    generatedBy: "Sabri",
    dateGenerated: "2026-03-05",
    path: "/home/kim/.openclaw/workspace/agents/sabri/projects/palma-meta-campaign-plan/plan.html",
  },
];
