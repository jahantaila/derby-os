// ─── Relationship Types ───
export type RelationshipType =
  | "client"
  | "prospect"
  | "partner"
  | "vendor"
  | "mentor"
  | "investor"
  | "friend"
  | "family"
  | "industry"
  | "team"
  | "school"
  | "other";

export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "client", "prospect", "partner", "vendor", "mentor",
  "investor", "friend", "family", "industry", "team", "school", "other",
];

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  client: "Client", prospect: "Prospect", partner: "Partner",
  vendor: "Vendor", mentor: "Mentor", investor: "Investor",
  friend: "Friend", family: "Family", industry: "Industry",
  team: "Team", school: "School", other: "Other",
};

export const RELATIONSHIP_TYPE_COLORS: Record<RelationshipType, string> = {
  client: "#2093FF", prospect: "#FFBD59", partner: "#22C55E",
  vendor: "#94A3B8", mentor: "#F472B6", investor: "#A78BFA",
  friend: "#34D399", family: "#FB923C", industry: "#60A5FA",
  team: "#2093FF", school: "#FBBF24", other: "#64748B",
};

// ─── Interaction Types ───
export type InteractionType =
  | "call" | "email" | "meeting" | "text" | "social"
  | "event" | "note" | "gift" | "referral" | "deal";

export const INTERACTION_TYPES: InteractionType[] = [
  "call", "email", "meeting", "text", "social",
  "event", "note", "gift", "referral", "deal",
];

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: "Call", email: "Email", meeting: "Meeting", text: "Text",
  social: "Social", event: "Event", note: "Note", gift: "Gift",
  referral: "Referral", deal: "Deal",
};

// ─── Core Data Types ───
export type Interaction = {
  id: string;
  type: InteractionType;
  date: string;
  summary: string;
  details?: string;
  sentiment?: "positive" | "neutral" | "negative";
  createdAt: string;
};

export type RolodexNote = {
  id: string;
  content: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StayInTouchReminder = {
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "custom";
  customDays?: number;
  lastReminded?: string;
  snoozedUntil?: string;
};

export type PersonalFact = {
  id: string;
  category: string;
  label: string;
  value: string;
};

export type RolodexContact = {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  avatar?: string;
  // Contact info
  email?: string;
  phone?: string;
  secondaryEmail?: string;
  secondaryPhone?: string;
  // Professional
  company?: string;
  title?: string;
  industry?: string;
  website?: string;
  // Location
  city?: string;
  state?: string;
  country?: string;
  hometown?: string;
  // Personal
  birthday?: string;
  spouse?: string;
  children?: string;
  college?: string;
  interests?: string;
  // Social
  linkedin?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  // Relationship
  relationshipType: RelationshipType;
  tags: string[];
  howWeMet?: string;
  metDate?: string;
  introducedBy?: string;
  // Scores
  relationshipScore: number;
  importanceScore?: number;
  // Data
  interactions: Interaction[];
  notes: RolodexNote[];
  facts: PersonalFact[];
  connections: string[];
  stayInTouch?: StayInTouchReminder;
  // Meta
  lastContactedAt?: string;
  nextFollowUp?: string;
  source?: string;
  aiSummary?: string;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
};

// ─── View Types ───
export type ViewMode = "table" | "card";
export type SortField = "name" | "lastContacted" | "company" | "city" | "relationshipScore" | "createdAt";
export type SortDirection = "asc" | "desc";

export type SavedView = {
  id: string;
  name: string;
  filters: FilterState;
  sort: { field: SortField; direction: SortDirection };
};

export type FilterState = {
  search: string;
  relationshipTypes: RelationshipType[];
  tags: string[];
  cities: string[];
  companies: string[];
  hasPhone: boolean | null;
  hasEmail: boolean | null;
  lastContactedWithin: number | null; // days
  archived: boolean;
};

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  relationshipTypes: [],
  tags: [],
  cities: [],
  companies: [],
  hasPhone: null,
  hasEmail: null,
  lastContactedWithin: null,
  archived: false,
};

export const REMINDER_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "yearly", "custom"] as const;

// ─── Smart Groups ───
export type SmartGroup = {
  id: string;
  name: string;
  icon: string;
  filter: (contact: RolodexContact) => boolean;
};
