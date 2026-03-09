export type TaskStatus = "todo" | "in-progress" | "blocked" | "done";
export type TaskPriority = "high" | "medium" | "low";

export type TaskRecord = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  client: string;
  createdAt: string;
  dueDate: string | null;
};

export const TEAM_MEMBERS = [
  { id: "jahan", name: "Jahan" },
  { id: "kimberly", name: "Kimberly" },
  { id: "alex", name: "Alex" },
  { id: "sabri", name: "Sabri" },
  { id: "kevin", name: "Kevin" },
  { id: "hamza", name: "Hamza" },
] as const;

export const INITIAL_TASKS: TaskRecord[] = [
  {
    id: "t1",
    title: "Set up Bluegrass Google Ads campaign",
    description: "Build campaign in Google Ads Editor with 6 ad groups, upload and launch",
    status: "in-progress",
    priority: "high",
    assignee: "jahan",
    client: "Bluegrass Garage Door",
    createdAt: "2026-03-08",
    dueDate: "2026-03-10",
  },
  {
    id: "t2",
    title: "Complete Google Ads advertiser verification",
    description: "Verify Bluegrass account for local services ads policy",
    status: "blocked",
    priority: "high",
    assignee: "jahan",
    client: "Bluegrass Garage Door",
    createdAt: "2026-03-09",
    dueDate: "2026-03-11",
  },
  {
    id: "t3",
    title: "Wait for Google Ads API Basic Access approval",
    description: "Applied Saturday 3/7, expected 1-3 business days",
    status: "blocked",
    priority: "medium",
    assignee: "kimberly",
    client: "Derby Digital",
    createdAt: "2026-03-07",
    dueDate: "2026-03-11",
  },
  {
    id: "t4",
    title: "Generate Olympus test proposal",
    description: "Use proposal_writer skill to create first test proposal for OlympusLou",
    status: "todo",
    priority: "medium",
    assignee: "alex",
    client: "OlympusLou",
    createdAt: "2026-03-08",
    dueDate: "2026-03-12",
  },
  {
    id: "t5",
    title: "Redo Palma Italian ad analysis",
    description: "Pull full creative details via API, reframe around messenger-to-customer conversion",
    status: "todo",
    priority: "medium",
    assignee: "alex",
    client: "Palma Italian Kitchen",
    createdAt: "2026-03-06",
    dueDate: "2026-03-14",
  },
  {
    id: "t6",
    title: "Rewrite veteran section for landing page",
    description: "Replace emergency pricing section with veteran-owned angle",
    status: "done",
    priority: "high",
    assignee: "sabri",
    client: "Bluegrass Garage Door",
    createdAt: "2026-03-09",
    dueDate: "2026-03-09",
  },
  {
    id: "t7",
    title: "Mission Control V3 build-out",
    description: "Build all pages: tasks, clients, finance, calendar, pipeline, projects",
    status: "in-progress",
    priority: "high",
    assignee: "kevin",
    client: "Derby Digital",
    createdAt: "2026-03-08",
    dueDate: "2026-03-12",
  },
  {
    id: "t8",
    title: "Deploy DerbyFlow to Vercel",
    description: "Get DerbyFlow SaaS deployed for WP plugin integration",
    status: "todo",
    priority: "low",
    assignee: "jahan",
    client: "Derby Digital",
    createdAt: "2026-03-01",
    dueDate: null,
  },
];
