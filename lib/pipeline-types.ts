export type PipelineStage =
  | "new-lead"
  | "contacted"
  | "interested"
  | "scheduled-meeting"
  | "attended-meeting"
  | "negotiating"
  | "closed-won"
  | "closed-lost";
export type PipelineSource = "instantly" | "manual" | "referral" | "website";
export type EnrichmentStatus = "pending" | "enriched" | "failed";
export type ConversationHistoryItem = {
  date: string;
  from: string;
  message: string;
  direction: "outbound" | "inbound";
};

export type EnrichmentData = {
  phone?: string;
  ownerName?: string;
  address?: string;
  website?: string;
  googleRating?: number;
  reviewCount?: number;
  cuisine?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
  };
  notes?: string;
  enrichedAt?: string;
};

export type PipelineDeal = {
  id: string;
  name: string;
  stage: PipelineStage;
  value: number;
  client: string;
  contact: string;
  assignee: string;
  createdAt: string;
  notes: string;
  status: string;
  source: PipelineSource;
  email: string;
  enrichmentStatus: EnrichmentStatus;
  enrichmentData: EnrichmentData | null;
  competitor?: string;
  conversationHistory?: ConversationHistoryItem[];
  messagedFrom?: string;
  website?: string;
  rawWebhookData?: unknown;
  stageUpdatedAt?: string;
};

export const PIPELINE_STAGES: PipelineStage[] = [
  "new-lead",
  "contacted",
  "interested",
  "scheduled-meeting",
  "attended-meeting",
  "negotiating",
  "closed-won",
  "closed-lost",
];

export const PIPELINE_ASSIGNEES = ["jahan", "kimberly", "alex", "sabri", "kevin", "hamza"] as const;

export const INITIAL_PIPELINE_DEALS: PipelineDeal[] = [
  {
    id: "l1",
    name: "Mario's Pizzeria",
    stage: "new-lead",
    value: 2000,
    client: "Mario's Pizzeria",
    contact: "Mario Rossi",
    assignee: "kimberly",
    createdAt: "2026-03-09",
    notes: "Cold email reply - interested in marketing",
    status: "new",
    source: "instantly",
    email: "mario@mariospizzeria.com",
    enrichmentStatus: "pending",
    enrichmentData: null,
  },
  {
    id: "l2",
    name: "Sakura Sushi Louisville",
    stage: "contacted",
    value: 1500,
    client: "Sakura Sushi",
    contact: "Yuki Tanaka",
    assignee: "jahan",
    createdAt: "2026-03-08",
    notes: "Replied to cold email, sent intro",
    status: "new",
    source: "instantly",
    email: "yuki@sakurasushi.com",
    enrichmentStatus: "pending",
    enrichmentData: null,
  },
  {
    id: "l3",
    name: "Bluegrass Garage Door",
    stage: "closed-won",
    value: 1500,
    client: "Bluegrass Garage Door",
    contact: "Mike",
    assignee: "jahan",
    createdAt: "2026-02-15",
    notes: "Google Ads + LSA client",
    status: "new",
    source: "referral",
    email: "mike@bluegrassgaragedoor.com",
    enrichmentStatus: "pending",
    enrichmentData: null,
  },
  {
    id: "l4",
    name: "OlympusLou Expansion",
    stage: "negotiating",
    value: 2500,
    client: "OlympusLou",
    contact: "Owner",
    assignee: "jahan",
    createdAt: "2026-03-05",
    notes: "Upsell to full marketing + DerbyFlow",
    status: "new",
    source: "manual",
    email: "",
    enrichmentStatus: "pending",
    enrichmentData: null,
  },
];
