export type TaskStatus = "todo" | "in-progress" | "needs-kimberly-approval" | "needs-jahan-approval" | "done";
export type TaskPriority = "urgent" | "high" | "medium" | "low";

export type TaskRecord = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  client: string;
  createdAt: string;
  updatedAt?: string;
  dueDate: string | null;
  subtasks?: { text: string; done: boolean }[];
  source?: "ai" | "manual" | "conversation";
  notes?: string;
};

export const TASK_STATUSES: { id: TaskStatus; label: string; color: string; icon: string }[] = [
  { id: "todo", label: "To Do", color: "#64748b", icon: "○" },
  { id: "in-progress", label: "In Progress", color: "#2093FF", icon: "◐" },
  { id: "needs-kimberly-approval", label: "Needs Kimberly Approval", color: "#FFBD59", icon: "◑" },
  { id: "needs-jahan-approval", label: "Needs Jahan Approval", color: "#F93C3C", icon: "◕" },
  { id: "done", label: "Done", color: "#22C55E", icon: "●" },
];

export const TEAM_MEMBERS = [
  { id: "jahan", name: "Jahan", role: "CEO", isHuman: true },
  { id: "kimberly", name: "Kimberly", role: "Chief of Staff", isHuman: false },
  { id: "alex", name: "Alex", role: "Marketing Analyst", isHuman: false },
  { id: "sabri", name: "Sabri", role: "Ad Producer", isHuman: false },
  { id: "kevin", name: "Kevin", role: "Developer", isHuman: false },
  { id: "jordan", name: "Jordan", role: "Operations", isHuman: false },
  { id: "hamza", name: "Hamza", role: "Landing Pages", isHuman: true },
  { id: "abdul", name: "Abdul", role: "Developer", isHuman: true },
  { id: "elang", name: "Elang", role: "Team", isHuman: true },
] as const;

export const INITIAL_TASKS: TaskRecord[] = [
  // Active tasks
  {
    id: "t1",
    title: "Fix Craig's Electric GBP suspension",
    description: "Google Business Profile keeps getting suspended. Client about to cancel. Research causes, create reinstatement plan.",
    status: "todo",
    priority: "urgent",
    assignee: "kimberly",
    client: "Craig's Electric",
    createdAt: "2026-03-16",
    dueDate: "2026-03-18",
    source: "conversation",
  },
  {
    id: "t2",
    title: "Finance dashboard — verify Stripe data matches spreadsheet",
    description: "Cross-reference Stripe live payments with Google Sheets data. Ensure all 44 active clients are correctly matched.",
    status: "needs-jahan-approval",
    priority: "high",
    assignee: "kimberly",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: "2026-03-17",
    source: "ai",
  },
  {
    id: "t3",
    title: "Rolodex — categorize 472 'other' contacts",
    description: "Go through remaining uncategorized contacts, assign proper relationship types (client, prospect, vendor, etc.)",
    status: "todo",
    priority: "medium",
    assignee: "jahan",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: null,
    source: "ai",
    notes: "Jahan needs to review these — only he knows the relationships",
  },
  {
    id: "t4",
    title: "Build GHL → Rolodex sync for Meeting Booked contacts",
    description: "When a lead moves to 'Meeting Booked' in GHL, auto-create/update their Rolodex contact with all notes, info, and facts.",
    status: "todo",
    priority: "high",
    assignee: "kimberly",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: "2026-03-18",
    source: "conversation",
  },
  {
    id: "t5",
    title: "Build 3D Office experience",
    description: "Create an interactive 3D office similar to @iamlukethedev's demo. Fully functional with live agent status.",
    status: "todo",
    priority: "medium",
    assignee: "kevin",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: "2026-03-20",
    source: "conversation",
  },
  {
    id: "t6",
    title: "Split AI Agents into departments",
    description: "Organize agents page by departments. Make it live and functional with real agent status.",
    status: "todo",
    priority: "medium",
    assignee: "kevin",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: "2026-03-19",
    source: "conversation",
  },
  {
    id: "t7",
    title: "Expand SpotHopper scraping to surrounding states",
    description: "Get more KY leads, then scrape IN, TN, OH, and every surrounding state. Organize by city.",
    status: "todo",
    priority: "medium",
    assignee: "jordan",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: "2026-03-21",
    source: "conversation",
  },
  {
    id: "t8",
    title: "Scrape PopMenu restaurant leads",
    description: "Same approach as SpotHopper — find restaurants using PopMenu and collect contact info.",
    status: "todo",
    priority: "medium",
    assignee: "jordan",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: "2026-03-21",
    source: "conversation",
  },
  {
    id: "t9",
    title: "Grand Slam Pizza — onboarding",
    description: "New client signed 3/12, $199/mo. Set up website, plan upsell to $850/mo.",
    status: "in-progress",
    priority: "high",
    assignee: "jahan",
    client: "Grand Slam Pizza",
    createdAt: "2026-03-12",
    dueDate: "2026-03-20",
    source: "conversation",
  },
  {
    id: "t10",
    title: "Set up daily email sync cron",
    description: "8am daily sync: pull new emails, update Rolodex contacts, morning briefing to Discord.",
    status: "done",
    priority: "high",
    assignee: "kimberly",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: "2026-03-17",
    source: "ai",
  },
  {
    id: "t11",
    title: "Finance page — import all spreadsheet data + Stripe",
    description: "Import 53 client P&L tabs from Google Sheets, connect Stripe API for live payment data.",
    status: "done",
    priority: "urgent",
    assignee: "kimberly",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: "2026-03-17",
    source: "conversation",
  },
  {
    id: "t12",
    title: "Rolodex — fix email dates and re-fetch all email bodies",
    description: "Dates were showing 'NaN ago' and '25y ago'. Re-fetched 4,921 emails via Gmail API with proper dates.",
    status: "done",
    priority: "urgent",
    assignee: "kimberly",
    client: "Derby Digital",
    createdAt: "2026-03-17",
    dueDate: "2026-03-17",
    source: "ai",
  },
  {
    id: "t13",
    title: "Ted Kasemir / Lujacks — confirm Monday meeting",
    description: "Zoom meeting Monday ~11:45 AM. Send confirmation Monday morning.",
    status: "todo",
    priority: "high",
    assignee: "kimberly",
    client: "Lujacks",
    createdAt: "2026-03-16",
    dueDate: "2026-03-17",
    source: "conversation",
  },
  {
    id: "t14",
    title: "Onboarding form — quiz-style multi-step with Stripe Checkout",
    description: "Build /onboard route with quiz-style form. Stripe Checkout placeholder until keys confirmed.",
    status: "todo",
    priority: "low",
    assignee: "kevin",
    client: "Derby Digital",
    createdAt: "2026-03-15",
    dueDate: null,
    source: "conversation",
  },
];
