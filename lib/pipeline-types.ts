export type PipelineStage =
  | "new-lead"
  | "contacted"
  | "interested"
  | "scheduled-meeting"
  | "attended-meeting"
  | "negotiating"
  | "closed-won"
  | "closed-lost";
export type PipelineSource = "instantly" | "allgood" | "manual" | "referral" | "website" | (string & {});
export type EnrichmentStatus = "pending" | "enriched" | "failed";
export type ConversationHistoryItem = {
  date: string;
  from: string;
  message: string;
  direction: "outbound" | "inbound";
};

export type PhoneLogEntry = {
  id: string;
  date: string;
  notes: string;
  createdAt: string;
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
  phoneLog: PhoneLogEntry[];
  tags: string[];
  competitor?: string;
  conversationHistory?: ConversationHistoryItem[];
  messagedFrom?: string;
  website?: string;
  city?: string;
  state?: string;
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

export const INITIAL_PIPELINE_DEALS: PipelineDeal[] = [];
