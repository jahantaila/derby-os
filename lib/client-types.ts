export const SERVICE_OPTIONS = [
  "Website",
  "SEO",
  "Social Media",
  "Google Ads",
  "Meta Ads",
  "Software",
  "DerbyFlow",
  "Email Marketing",
  "Review Automation",
  "Other",
] as const;

export type ClientService = (typeof SERVICE_OPTIONS)[number];
export type ClientStatus = "active" | "inactive" | "paused";
export type ClientType = "restaurant" | "home-service" | "gaming" | "other";

export const CLIENT_TYPE_OPTIONS = ["restaurant", "home-service", "gaming", "other"] as const;

export type ClientProfile = {
  id: string;
  name: string;
  clientType: ClientType;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  services: ClientService[];
  monthlyRetainer: number;
  monthlyBudgetRange?: "Under $500" | "$500-$1k" | "$1k-$2k" | "$2k-$5k" | "$5k+";
  startDate?: string;
  status: ClientStatus;
  notes?: string;
  createdAt: string;
};

export const SERVICE_BADGE_CLASSES: Record<ClientService, string> = {
  Website: "border-blue-400/35 bg-blue-500/20 text-blue-100",
  SEO: "border-emerald-400/35 bg-emerald-500/20 text-emerald-100",
  "Social Media": "border-purple-400/35 bg-purple-500/20 text-purple-100",
  "Google Ads": "border-yellow-400/35 bg-yellow-500/20 text-yellow-100",
  "Meta Ads": "border-indigo-400/35 bg-indigo-500/20 text-indigo-100",
  Software: "border-cyan-400/35 bg-cyan-500/20 text-cyan-100",
  DerbyFlow: "border-blue-400/35 bg-blue-500/20 text-blue-100",
  "Email Marketing": "border-sky-400/35 bg-sky-500/20 text-sky-100",
  "Review Automation": "border-orange-400/35 bg-orange-500/20 text-orange-100",
  Other: "border-slate-400/35 bg-slate-500/20 text-slate-200",
};

export const STATUS_BADGE_CLASSES: Record<ClientStatus, string> = {
  active: "border-emerald-400/40 bg-emerald-500/20 text-emerald-100",
  inactive: "border-rose-400/40 bg-rose-500/20 text-rose-100",
  paused: "border-amber-400/40 bg-amber-500/20 text-amber-100",
};

export const STATUS_LABEL: Record<ClientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  paused: "Paused",
};

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  restaurant: "Restaurant",
  "home-service": "Home Service",
  gaming: "Gaming",
  other: "Other",
};
