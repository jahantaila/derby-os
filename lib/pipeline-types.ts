export type PipelineStage = "lead" | "outreach" | "proposal" | "negotiation" | "won";
export type PipelineSource = "instantly" | "manual" | "referral" | "website";
export type EnrichmentStatus = "pending" | "enriched" | "failed";

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
  rawWebhookData?: unknown;
  stageUpdatedAt?: string;
};

export const PIPELINE_STAGES: PipelineStage[] = ["lead", "outreach", "proposal", "negotiation", "won"];

export const PIPELINE_ASSIGNEES = ["jahan", "kimberly", "alex", "sabri", "kevin", "hamza"] as const;

export const INITIAL_PIPELINE_DEALS: PipelineDeal[] = [
  {
    id: "d1",
    name: "Restaurant cold email batch 1",
    stage: "outreach",
    value: 2000,
    client: "New Restaurants",
    contact: "",
    assignee: "kimberly",
    createdAt: "2026-03-08",
    notes: "SpotHopper/BentoBox competitor targets",
    status: "new",
    source: "manual",
    email: "",
    enrichmentStatus: "pending",
    enrichmentData: null,
  },
  {
    id: "d2",
    name: "Bluegrass Garage Door - PPC",
    stage: "won",
    value: 1500,
    client: "Bluegrass Garage Door",
    contact: "Owner",
    assignee: "jahan",
    createdAt: "2026-02-15",
    notes: "Google Ads campaign being set up",
    status: "new",
    source: "manual",
    email: "",
    enrichmentStatus: "pending",
    enrichmentData: null,
  },
  {
    id: "d3",
    name: "Palma Italian - Renewal",
    stage: "proposal",
    value: 1000,
    client: "Palma Italian Kitchen",
    contact: "Owner",
    assignee: "alex",
    createdAt: "2026-03-01",
    notes: "Needs new proposal with proper analysis",
    status: "new",
    source: "manual",
    email: "",
    enrichmentStatus: "pending",
    enrichmentData: null,
  },
  {
    id: "d4",
    name: "OlympusLou - Expansion",
    stage: "negotiation",
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
