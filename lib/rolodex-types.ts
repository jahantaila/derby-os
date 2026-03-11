export type RelationshipType =
  | "client"
  | "prospect"
  | "partner"
  | "vendor"
  | "mentor"
  | "investor"
  | "friend"
  | "industry"
  | "team"
  | "other";

export type InteractionType =
  | "call"
  | "email"
  | "meeting"
  | "text"
  | "social"
  | "event"
  | "note"
  | "gift"
  | "referral"
  | "deal";

export type Interaction = {
  id: string;
  type: InteractionType;
  date: string;
  summary: string;
  details?: string;
  sentiment?: "positive" | "neutral" | "negative";
  createdAt: string;
};

export type StayInTouchReminder = {
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "custom";
  customDays?: number;
  lastReminded?: string;
  snoozedUntil?: string;
};

export type RolodexContact = {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  secondaryEmail?: string;
  secondaryPhone?: string;
  company?: string;
  title?: string;
  industry?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  relationshipType: RelationshipType;
  tags: string[];
  howWeMet?: string;
  metDate?: string;
  introducedBy?: string;
  birthday?: string;
  spouse?: string;
  children?: string;
  interests?: string;
  favoriteFood?: string;
  personalNotes?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  interactions: Interaction[];
  stayInTouch?: StayInTouchReminder;
  relationshipScore: number;
  lastContactedAt?: string;
  nextFollowUp?: string;
  pipelineDealId?: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "client",
  "prospect",
  "partner",
  "vendor",
  "mentor",
  "investor",
  "friend",
  "industry",
  "team",
  "other",
];

export const INTERACTION_TYPES: InteractionType[] = [
  "call",
  "email",
  "meeting",
  "text",
  "social",
  "event",
  "note",
  "gift",
  "referral",
  "deal",
];

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  client: "Client",
  prospect: "Prospect",
  partner: "Partner",
  vendor: "Vendor",
  mentor: "Mentor",
  investor: "Investor",
  friend: "Friend",
  industry: "Industry",
  team: "Team",
  other: "Other",
};

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  text: "Text",
  social: "Social",
  event: "Event",
  note: "Note",
  gift: "Gift",
  referral: "Referral",
  deal: "Deal",
};

export const REMINDER_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly", "custom"] as const;
