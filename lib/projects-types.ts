export type ProjectStatus = "todo" | "in-progress" | "blocked" | "done";

export type ProjectRecord = {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  progress: number;
  assignees: string[];
  startDate: string;
  dueDate: string | null;
  description: string;
  tasks: string[];
};

export const PROJECT_STATUSES: ProjectStatus[] = ["todo", "in-progress", "blocked", "done"];

export const PROJECT_ASSIGNEES = ["jahan", "kimberly", "alex", "sabri", "kevin", "hamza"] as const;

export const INITIAL_PROJECTS: ProjectRecord[] = [
  {
    id: "p1",
    name: "Google Ads Setup",
    client: "Bluegrass Garage Door",
    status: "in-progress",
    progress: 60,
    assignees: ["jahan", "sabri"],
    startDate: "2026-03-01",
    dueDate: "2026-03-10",
    description: "LSA optimization + PPC search campaign setup",
    tasks: ["LSA report", "PPC strategy", "Campaign plan", "Ad copy", "Landing page", "Launch"],
  },
  {
    id: "p2",
    name: "Ad Account Audit + Proposal",
    client: "OlympusLou",
    status: "in-progress",
    progress: 40,
    assignees: ["alex"],
    startDate: "2026-03-01",
    dueDate: "2026-03-12",
    description: "Full Meta ads audit and sales proposal",
    tasks: ["Pull ad data", "Analyze performance", "Creative analysis", "Generate proposal"],
  },
  {
    id: "p3",
    name: "Ad Analysis Redo",
    client: "Palma Italian Kitchen",
    status: "todo",
    progress: 0,
    assignees: ["alex"],
    startDate: "2026-03-08",
    dueDate: "2026-03-14",
    description: "Redo analysis with correct framing - messenger to customer conversion",
    tasks: ["Pull creative details", "Reframe analysis", "Generate report"],
  },
  {
    id: "p4",
    name: "Mission Control V3",
    client: "Derby Digital",
    status: "in-progress",
    progress: 80,
    assignees: ["kevin"],
    startDate: "2026-03-08",
    dueDate: "2026-03-12",
    description: "Full rebuild of internal dashboard",
    tasks: ["Dashboard", "Tasks", "Finance", "Calendar", "Pipeline", "Projects", "Polish"],
  },
  {
    id: "p5",
    name: "DerbyFlow WordPress Plugin",
    client: "Derby Digital",
    status: "blocked",
    progress: 20,
    assignees: ["kevin"],
    startDate: "2026-02-20",
    dueDate: null,
    description: "Elementor integration for restaurant menus",
    tasks: ["Architecture design", "Widget development", "Webhook sync", "Testing"],
  },
];
