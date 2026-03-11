"use client";

import { FormEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  Filter,
  Gift,
  Globe,
  GripHorizontal,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INTERACTION_TYPE_LABELS,
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_TYPES,
  type Interaction,
  type InteractionType,
  type RelationshipType,
  type RolodexContact,
  type RolodexNote,
  type StayInTouchReminder,
} from "@/lib/rolodex-types";

type DetailTab = "overview" | "activity" | "notes" | "connections" | "ai";
type SortMode = "recently-contacted" | "alphabetical" | "relationship-score" | "newest";
type FilterMode = "all" | RelationshipType;
type TimelineFilter = "all" | InteractionType;
type SentimentValue = "" | "positive" | "neutral" | "negative";

type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type ContactDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  relationshipType: RelationshipType;
  city: string;
  state: string;
  country: string;
  tags: string;
};

type QuickLogDraft = {
  type: InteractionType;
  summary: string;
  details: string;
  sentiment: SentimentValue;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type OverviewEditableKey =
  | "email"
  | "phone"
  | "secondaryEmail"
  | "secondaryPhone"
  | "website"
  | "city"
  | "state"
  | "country"
  | "company"
  | "title"
  | "industry"
  | "howWeMet"
  | "metDate"
  | "introducedBy"
  | "birthday"
  | "spouse"
  | "children"
  | "interests"
  | "favoriteFood"
  | "personalNotes"
  | "linkedin"
  | "instagram"
  | "twitter"
  | "facebook"
  | "nextFollowUp"
  | "pipelineDealId";

const FILTER_PILLS: Array<{ value: FilterMode; label: string }> = [
  { value: "all", label: "All" },
  { value: "client", label: "Clients" },
  { value: "prospect", label: "Prospects" },
  { value: "partner", label: "Partners" },
  { value: "vendor", label: "Vendors" },
  { value: "friend", label: "Friends" },
  { value: "mentor", label: "Mentors" },
  { value: "investor", label: "Investors" },
  { value: "industry", label: "Industry" },
  { value: "team", label: "Team" },
  { value: "other", label: "Other" },
];

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "recently-contacted", label: "Recently Contacted" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "relationship-score", label: "Relationship Score" },
  { value: "newest", label: "Newest" },
];

const DETAIL_TABS: Array<{ value: DetailTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "activity", label: "Activity" },
  { value: "notes", label: "Notes" },
  { value: "connections", label: "Connections" },
  { value: "ai", label: "AI Insights" },
];

const QUICK_LOG_BUTTONS: Array<{ type: InteractionType; label: string }> = [
  { type: "call", label: "Call" },
  { type: "email", label: "Email" },
  { type: "meeting", label: "Meeting" },
  { type: "text", label: "Text" },
  { type: "note", label: "Note" },
  { type: "gift", label: "Gift" },
  { type: "referral", label: "Referral" },
  { type: "deal", label: "Deal" },
];

const TIMELINE_FILTERS: TimelineFilter[] = [
  "all",
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

const REMINDER_OPTIONS: StayInTouchReminder["frequency"][] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];

const AI_PROMPTS = [
  "Summarize my relationship with this person",
  "When should I follow up?",
  "What do we have in common?",
  "Draft a follow-up email",
  "What should I know before our next meeting?",
];

const EMPTY_CONTACT_DRAFT: ContactDraft = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  title: "",
  relationshipType: "other",
  city: "",
  state: "",
  country: "",
  tags: "",
};

const EMPTY_QUICK_LOG: QuickLogDraft = {
  type: "call",
  summary: "",
  details: "",
  sentiment: "",
};

const EMPTY_NOTES_MARKDOWN = "Write timestamped notes, relationship context, follow-up prep, and anything you want the AI prompts to use later.";

const relationshipDot: Record<RelationshipType, string> = {
  client: "#3B82F6",
  prospect: "#F59E0B",
  partner: "#22C55E",
  vendor: "#A855F7",
  mentor: "#06B6D4",
  investor: "#EAB308",
  friend: "#EC4899",
  industry: "#64748B",
  team: "#6366F1",
  other: "#94A3B8",
};

const easternDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

const easternDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

const easternMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "America/New_York",
});

function easternToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function fullName(contact?: Pick<RolodexContact, "firstName" | "lastName" | "nickname"> | null) {
  if (!contact) return "";
  return [contact.firstName, contact.nickname ? `"${contact.nickname}"` : "", contact.lastName].filter(Boolean).join(" ").trim();
}

function titleLine(contact: RolodexContact) {
  const line = [contact.company, contact.title].filter(Boolean).join(" • ");
  return line || "No company details";
}

function locationLine(contact?: RolodexContact | null) {
  if (!contact) return "";
  return [contact.city, contact.state, contact.country].filter(Boolean).join(", ");
}

function formatDate(date?: string) {
  if (!date) return "Not set";
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return easternDateFormatter.format(parsed);
}

function formatDateTime(value?: string) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return easternDateTimeFormatter.format(parsed);
}

function relativeTimeFromDate(date?: string) {
  if (!date) return "Never";
  const target = new Date(`${date}T12:00:00.000Z`).getTime();
  const today = new Date(`${easternToday()}T12:00:00.000Z`).getTime();
  if (Number.isNaN(target) || Number.isNaN(today)) return date;
  const days = Math.max(0, Math.floor((today - target) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function scoreRingColor(score: number) {
  if (score <= 30) return "#f87171";
  if (score <= 60) return "#fbbf24";
  if (score <= 85) return "#60a5fa";
  return "#4ade80";
}

function scoreTextTone(score: number) {
  if (score <= 30) return "text-rose-300";
  if (score <= 60) return "text-amber-300";
  if (score <= 85) return "text-sky-300";
  return "text-emerald-300";
}

function heatmapTone(count: number) {
  if (count <= 0) return "#1e293b";
  if (count <= 2) return "#166534";
  if (count <= 4) return "#22c55e";
  return "#4ade80";
}

function initials(contact: RolodexContact) {
  return `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase() || "?";
}

function splitCommaList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeUrl(url?: string) {
  if (!url?.trim()) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function ageFromBirthday(date?: string) {
  if (!date) return undefined;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const now = new Date();
  let age = now.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - parsed.getUTCMonth();
  const dayDelta = now.getUTCDate() - parsed.getUTCDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) age -= 1;
  return age;
}

function interactionIcon(type: InteractionType) {
  if (type === "call") return Phone;
  if (type === "email") return Mail;
  if (type === "meeting") return Calendar;
  if (type === "text") return MessageSquare;
  if (type === "gift") return Gift;
  if (type === "referral") return Users;
  if (type === "deal") return Briefcase;
  return StickyNote;
}

function sentimentEmoji(value?: Interaction["sentiment"]) {
  if (value === "positive") return "😊";
  if (value === "neutral") return "😐";
  if (value === "negative") return "😟";
  return "";
}

function sectionTitle(label: string) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>;
}

function contactSearchIndex(contact: RolodexContact) {
  return [
    fullName(contact),
    contact.company,
    contact.title,
    contact.email,
    contact.phone,
    contact.secondaryEmail,
    contact.secondaryPhone,
    contact.industry,
    contact.city,
    contact.state,
    contact.country,
    contact.tags.join(" "),
    contact.personalNotes,
    contact.notes.map((note) => note.content).join(" "),
    contact.interactions.map((entry) => `${entry.summary} ${entry.details ?? ""}`).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function computeMonthInteractionCount(interactions: Interaction[], days = 30) {
  const today = new Date(`${easternToday()}T12:00:00.000Z`).getTime();
  return interactions.filter((entry) => {
    const date = new Date(`${entry.date}T12:00:00.000Z`).getTime();
    if (Number.isNaN(date)) return false;
    return today - date <= days * 86400000;
  }).length;
}

function inferInitiator(interaction: Interaction) {
  const haystack = `${interaction.summary} ${interaction.details ?? ""}`.toLowerCase();
  if (
    haystack.includes("replied") ||
    haystack.includes("reply") ||
    haystack.includes("inbound") ||
    haystack.includes("introduced") ||
    haystack.includes("sent over") ||
    haystack.includes("called me") ||
    haystack.includes("texted me")
  ) {
    return "them";
  }
  return "you";
}

function buildHeatmap(interactions: Interaction[]) {
  const counts = new Map<string, number>();
  interactions.forEach((entry) => {
    counts.set(entry.date, (counts.get(entry.date) ?? 0) + 1);
  });

  const end = new Date(`${easternToday()}T12:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 363);

  const days: Array<{ date: string; count: number }> = [];
  for (let index = 0; index < 364; index += 1) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    const date = current.toISOString().slice(0, 10);
    days.push({ date, count: counts.get(date) ?? 0 });
  }

  const paddedStartCount = start.getUTCDay();
  const padded = [...Array.from({ length: paddedStartCount }, () => ({ date: "", count: 0 })), ...days];
  while (padded.length % 7 !== 0) {
    padded.push({ date: "", count: 0 });
  }

  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let index = 0; index < padded.length; index += 7) {
    weeks.push(padded.slice(index, index + 7));
  }

  return weeks;
}

function groupHeatmapMonths(weeks: Array<Array<{ date: string; count: number }>>) {
  const labels: Array<{ label: string; span: number }> = [];
  let currentLabel = "";
  let currentSpan = 0;

  weeks.forEach((week) => {
    const firstDatedCell = week.find((cell) => cell.date);
    const label = firstDatedCell ? easternMonthFormatter.format(new Date(`${firstDatedCell.date}T12:00:00.000Z`)) : "";
    if (!label) return;
    if (label === currentLabel) {
      currentSpan += 1;
      return;
    }
    if (currentLabel) {
      labels.push({ label: currentLabel, span: currentSpan });
    }
    currentLabel = label;
    currentSpan = 1;
  });

  if (currentLabel) {
    labels.push({ label: currentLabel, span: currentSpan });
  }

  return labels;
}

function sortNotes(notes: RolodexNote[]) {
  return [...notes].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function makeNote(content: string): RolodexNote {
  const now = new Date().toISOString();
  return {
    id: `rn_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    content,
    createdAt: now,
    updatedAt: now,
  };
}

function parseTags(value: string[]) {
  return value.map((tag) => tag.trim()).filter(Boolean);
}

function buildAiAnswer(contact: RolodexContact, prompt: string, contacts: RolodexContact[]) {
  const latestInteraction = contact.interactions[0];
  const mutualTags = contacts.filter(
    (candidate) => candidate.id !== contact.id && candidate.tags.some((tag) => contact.tags.includes(tag)),
  );
  const lower = prompt.toLowerCase();

  if (lower.includes("summarize")) {
    return `${fullName(contact)} is currently labeled ${RELATIONSHIP_TYPE_LABELS[contact.relationshipType].toLowerCase()} with a relationship score of ${contact.relationshipScore}. You have ${contact.interactions.length} interactions logged, the latest happened ${relativeTimeFromDate(contact.lastContactedAt)}, and the strongest context is ${contact.tags.slice(0, 3).join(", ") || "still being built"}.`;
  }

  if (lower.includes("follow up")) {
    if (contact.nextFollowUp) {
      return `The current follow-up date is ${formatDate(contact.nextFollowUp)}. A practical outreach would reference ${latestInteraction?.summary ?? "your last touchpoint"} and keep the message tied to ${contact.company ?? contact.interests ?? "their current priorities"}.`;
    }
    return `There is no active stay-in-touch reminder. Based on the current recency, reaching out this week with a short, useful note would make sense.`;
  }

  if (lower.includes("common")) {
    const overlap = mutualTags.slice(0, 4).map((candidate) => fullName(candidate)).join(", ");
    return `Common ground: ${contact.interests ?? "no interests logged yet"}. Network overlap includes ${overlap || "no obvious overlap yet"}, and the shared tags are ${contact.tags.join(", ") || "still sparse"}.`;
  }

  if (lower.includes("email")) {
    return `Subject: Quick follow-up\n\nHi ${contact.firstName},\n\nWanted to circle back on ${latestInteraction?.summary?.toLowerCase() ?? "our last conversation"}. ${contact.company ? `I’ve been thinking about ${contact.company} and one or two concrete next steps.` : "I have a couple of ideas that may be useful."}\n\nIf helpful, I can send a tighter outline this week.\n\nBest,\nKevin`;
  }

  if (lower.includes("meeting")) {
    return `${fullName(contact)} last engaged ${relativeTimeFromDate(contact.lastContactedAt)}. Review notes about ${contact.personalNotes ?? latestInteraction?.details ?? "their current context"}, be ready on ${contact.tags.slice(0, 3).join(", ") || "the relationship basics"}, and check whether a follow-up date should be reset after the meeting.`;
  }

  return `Recent relationship context: ${latestInteraction?.summary ?? "No recent interaction logged."} Notes currently emphasize ${contact.notes[0]?.content ?? "limited personal context so far"}.`;
}

function inferSuggestedTags(contact: RolodexContact) {
  const haystack = `${contact.notes.map((note) => note.content).join(" ")} ${contact.interactions
    .map((entry) => `${entry.summary} ${entry.details ?? ""}`)
    .join(" ")}`.toLowerCase();

  const suggestions = new Set<string>();
  if (haystack.includes("restaurant") || haystack.includes("kitchen")) suggestions.add("hospitality");
  if (haystack.includes("marketing") || haystack.includes("campaign")) suggestions.add("marketing");
  if (haystack.includes("electric") || haystack.includes("garage") || haystack.includes("painting")) suggestions.add("home services");
  if (haystack.includes("designer") || haystack.includes("website")) suggestions.add("design");
  if (haystack.includes("investor") || haystack.includes("advisor") || haystack.includes("capital")) suggestions.add("advice");
  if (haystack.includes("referral")) suggestions.add("referrals");
  if (haystack.includes("meeting") || haystack.includes("coffee")) suggestions.add("networking");

  return Array.from(suggestions).filter((tag) => !contact.tags.includes(tag));
}

function saveStatusTone(status: SaveState) {
  if (status === "saving") return "text-sky-300";
  if (status === "saved") return "text-emerald-300";
  if (status === "error") return "text-rose-300";
  return "text-slate-500";
}

function saveStatusLabel(status: SaveState) {
  if (status === "saving") return "Saving";
  if (status === "saved") return "Saved";
  if (status === "error") return "Save failed";
  return "Idle";
}

function copyText(value?: string) {
  if (!value) return;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(() => undefined);
  }
}

function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-4", className)}>{children}</section>;
}

function LabelValue({
  label,
  value,
  action,
}: {
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-white/5 pb-3 last:border-b-0 last:pb-0 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{value}</div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

function EmptyPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <GlassCard className="flex min-h-[240px] items-center justify-center">
      <div className="max-w-md text-center">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="mt-2 text-sm text-slate-400">{body}</p>
      </div>
    </GlassCard>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg viewBox="0 0 72 72" className="absolute h-24 w-24">
        <circle cx="36" cy="36" r={radius} stroke="rgba(148,163,184,0.18)" strokeWidth="6" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke={scoreRingColor(score)}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center">
        <span className={cn("text-2xl font-semibold", scoreTextTone(score))}>{score}</span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Score</span>
      </div>
    </div>
  );
}

function SavePill({
  status,
  lastSyncedLabel,
}: {
  status: SaveState;
  lastSyncedLabel: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
      <span className={cn("font-medium", saveStatusTone(status))}>{saveStatusLabel(status)}</span>
      <span className="text-slate-500">·</span>
      <span className="text-slate-400">{lastSyncedLabel}</span>
    </div>
  );
}

function IconAction({
  href,
  onClick,
  label,
  children,
  external = false,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
      >
        {children}
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function ContactMetric({
  label,
  value,
  tone = "text-white",
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={cn("mt-2 text-lg font-semibold", tone)}>{value}</div>
    </div>
  );
}

function ContactListCard({
  contact,
  selected,
  onSelect,
}: {
  contact: RolodexContact;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition duration-200",
        selected
          ? "border-sky-400/60 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: relationshipDot[contact.relationshipType] }} />
            <p className="truncate font-semibold text-white">{fullName(contact)}</p>
          </div>
          <p className="mt-1 truncate text-sm text-slate-400">{titleLine(contact)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-slate-500">
          {contact.phone ? <Phone className="h-4 w-4" /> : null}
          {contact.email ? <Mail className="h-4 w-4" /> : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{RELATIONSHIP_TYPE_LABELS[contact.relationshipType]}</span>
        <span>{relativeTimeFromDate(contact.lastContactedAt)}</span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,_#38bdf8,_#22c55e)] transition-all duration-200"
          style={{ width: `${Math.max(8, contact.relationshipScore)}%` }}
        />
      </div>
    </button>
  );
}

function EditableTextField({
  value,
  placeholder,
  type = "text",
  multiline = false,
  onSave,
  prefix,
}: {
  value?: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url" | "date";
  multiline?: boolean;
  onSave: (value: string) => void;
  prefix?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  if (editing && multiline) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          setEditing(false);
          onSave(draft);
        }}
        className="min-h-[96px] w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
      />
    );
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          setEditing(false);
          onSave(draft);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            setEditing(false);
            onSave(draft);
          }
          if (event.key === "Escape") {
            setEditing(false);
            setDraft(value ?? "");
          }
        }}
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex min-h-8 w-full items-center gap-2 rounded-lg py-1 text-left text-sm text-white transition hover:text-sky-200"
    >
      {prefix}
      {value?.trim() ? value : <span className="text-slate-500">{placeholder ?? "Click to edit"}</span>}
    </button>
  );
}

function EditableSelectField<T extends string>({
  value,
  options,
  labels,
  onSave,
}: {
  value: T;
  options: readonly T[];
  labels?: Record<string, string>;
  onSave: (value: T) => void;
}) {
  return (
    <label className="relative block">
      <select
        value={value}
        onChange={(event) => onSave(event.target.value as T)}
        className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 pr-9 text-sm text-white outline-none transition focus:border-sky-400/60"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels?.[option] ?? option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
    </label>
  );
}

function InlineTagEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onChange(tags.filter((entry) => entry !== tag))}
            className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200"
          >
            {tag}
          </button>
        ))}
        {!tags.length ? <span className="text-sm text-slate-500">Click to add tags</span> : null}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (!draft.trim()) return;
              onChange(parseTags([...tags, draft.trim()]));
              setDraft("");
            }
          }}
          placeholder="Add tag and press Enter"
          className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
        />
        <button
          type="button"
          onClick={() => {
            if (!draft.trim()) return;
            onChange(parseTags([...tags, draft.trim()]));
            setDraft("");
          }}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ActivityHeatmap({
  interactions,
}: {
  interactions: Interaction[];
}) {
  const weeks = useMemo(() => buildHeatmap(interactions), [interactions]);
  const monthLabels = useMemo(() => groupHeatmapMonths(weeks), [weeks]);
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-3">
        <div>
          {sectionTitle("Activity Heatmap")}
          <p className="mt-2 text-sm text-slate-400">Twelve-month interaction density in Eastern time.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Low</span>
          {[0, 1, 3, 5].map((count) => (
            <span key={count} className="h-3.5 w-3.5 rounded-[4px]" style={{ backgroundColor: heatmapTone(count) }} />
          ))}
          <span>High</span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="ml-10 grid gap-1" style={{ gridTemplateColumns: monthLabels.map((item) => `${item.span}fr`).join(" ") }}>
            {monthLabels.map((item, index) => (
              <span key={`${item.label}-${index}`} className="text-[11px] text-slate-500">
                {item.label}
              </span>
            ))}
          </div>

          <div className="mt-2 flex gap-2">
            <div className="grid gap-1 pt-1">
              {dayLabels.map((label, index) => (
                <span key={`${label}-${index}`} className="flex h-4 items-center text-[11px] text-slate-500">
                  {index % 2 === 1 ? label : ""}
                </span>
              ))}
            </div>

            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={`week-${weekIndex}`} className="grid gap-1">
                  {week.map((cell, cellIndex) => (
                    <div
                      key={`${cell.date || "empty"}-${cellIndex}`}
                      title={cell.date ? `${formatDate(cell.date)}: ${cell.count} interaction${cell.count === 1 ? "" : "s"}` : ""}
                      className="h-4 w-4 rounded-[4px] transition-transform duration-200 hover:scale-110"
                      style={{ backgroundColor: cell.date ? heatmapTone(cell.count) : "transparent" }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function TimelineItemCard({
  interaction,
  onDelete,
}: {
  interaction: Interaction;
  onDelete: () => void;
}) {
  const Icon = interactionIcon(interaction.type);

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60">
            <Icon className="h-4 w-4 text-sky-300" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
                {INTERACTION_TYPE_LABELS[interaction.type]}
              </span>
              {interaction.sentiment ? <span className="text-lg">{sentimentEmoji(interaction.sentiment)}</span> : null}
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{interaction.summary}</p>
            {interaction.details ? <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{interaction.details}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-3">
          <div className="text-right">
            <p className="text-sm text-white">{formatDate(interaction.date)}</p>
            <p className="mt-1 text-xs text-slate-500">{formatDateTime(interaction.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="opacity-0 transition group-hover:opacity-100 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-400 hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddContactModal({
  open,
  draft,
  onDraftChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  draft: ContactDraft;
  onDraftChange: (patch: Partial<ContactDraft>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#08101f] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.5)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xl font-semibold text-white">Add Contact</p>
            <p className="mt-1 text-sm text-slate-400">Create a new rolodex record without leaving the detail flow.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <input
            value={draft.firstName}
            onChange={(event) => onDraftChange({ firstName: event.target.value })}
            placeholder="First name"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <input
            value={draft.lastName}
            onChange={(event) => onDraftChange({ lastName: event.target.value })}
            placeholder="Last name"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <input
            value={draft.email}
            onChange={(event) => onDraftChange({ email: event.target.value })}
            placeholder="Email"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <input
            value={draft.phone}
            onChange={(event) => onDraftChange({ phone: event.target.value })}
            placeholder="Phone"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <input
            value={draft.company}
            onChange={(event) => onDraftChange({ company: event.target.value })}
            placeholder="Company"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <input
            value={draft.title}
            onChange={(event) => onDraftChange({ title: event.target.value })}
            placeholder="Title"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <label className="relative md:col-span-1">
            <select
              value={draft.relationshipType}
              onChange={(event) => onDraftChange({ relationshipType: event.target.value as RelationshipType })}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-sky-400/60"
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {RELATIONSHIP_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
          </label>
          <input
            value={draft.tags}
            onChange={(event) => onDraftChange({ tags: event.target.value })}
            placeholder="Tags (comma separated)"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <input
            value={draft.city}
            onChange={(event) => onDraftChange({ city: event.target.value })}
            placeholder="City"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <input
            value={draft.state}
            onChange={(event) => onDraftChange({ state: event.target.value })}
            placeholder="State"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <input
            value={draft.country}
            onChange={(event) => onDraftChange({ country: event.target.value })}
            placeholder="Country"
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60 md:col-span-2"
          />

          <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
            <p className="text-sm text-slate-500">At minimum, first name is required by the store.</p>
            <button
              type="submit"
              className="rounded-2xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-5 py-3 text-sm font-medium text-white transition hover:brightness-110"
            >
              Create Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OverviewTab({
  contact,
  onFieldSave,
  onTagsSave,
  onRelationshipTypeSave,
  onReminderSave,
  onSnooze,
}: {
  contact: RolodexContact;
  onFieldSave: (key: OverviewEditableKey, value: string) => void;
  onTagsSave: (tags: string[]) => void;
  onRelationshipTypeSave: (value: RelationshipType) => void;
  onReminderSave: (value: StayInTouchReminder["frequency"]) => void;
  onSnooze: () => void;
}) {
  const age = ageFromBirthday(contact.birthday);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <GlassCard>
        <div className="mb-4">{sectionTitle("Contact Info")}</div>
        <div className="space-y-3">
          <LabelValue
            label="Email"
            value={<EditableTextField value={contact.email} placeholder="Add email" type="email" onSave={(value) => onFieldSave("email", value)} />}
            action={
              <button type="button" onClick={() => copyText(contact.email)} className="rounded-lg p-2 text-slate-400 hover:text-white">
                <Copy className="h-4 w-4" />
              </button>
            }
          />
          <LabelValue
            label="Phone"
            value={<EditableTextField value={contact.phone} placeholder="Add phone" type="tel" onSave={(value) => onFieldSave("phone", value)} />}
            action={
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => copyText(contact.phone)} className="rounded-lg p-2 text-slate-400 hover:text-white">
                  <Copy className="h-4 w-4" />
                </button>
                {contact.phone ? (
                  <a href={`tel:${contact.phone}`} className="rounded-lg p-2 text-slate-400 hover:text-white">
                    <Phone className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            }
          />
          <LabelValue
            label="Secondary Email"
            value={
              <EditableTextField
                value={contact.secondaryEmail}
                placeholder="Add secondary email"
                type="email"
                onSave={(value) => onFieldSave("secondaryEmail", value)}
              />
            }
          />
          <LabelValue
            label="Secondary Phone"
            value={
              <EditableTextField
                value={contact.secondaryPhone}
                placeholder="Add secondary phone"
                type="tel"
                onSave={(value) => onFieldSave("secondaryPhone", value)}
              />
            }
          />
          <LabelValue
            label="Location"
            value={
              <div className="grid gap-2 md:grid-cols-3">
                <EditableTextField value={contact.city} placeholder="City" onSave={(value) => onFieldSave("city", value)} />
                <EditableTextField value={contact.state} placeholder="State" onSave={(value) => onFieldSave("state", value)} />
                <EditableTextField value={contact.country} placeholder="Country" onSave={(value) => onFieldSave("country", value)} />
              </div>
            }
          />
          <LabelValue
            label="Website"
            value={<EditableTextField value={contact.website} placeholder="Add website" type="url" onSave={(value) => onFieldSave("website", value)} />}
            action={
              contact.website ? (
                <a
                  href={normalizeUrl(contact.website)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-2 text-slate-400 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null
            }
          />
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-4">{sectionTitle("Professional")}</div>
        <div className="space-y-3">
          <LabelValue label="Company" value={<EditableTextField value={contact.company} placeholder="Add company" onSave={(value) => onFieldSave("company", value)} />} />
          <LabelValue label="Title" value={<EditableTextField value={contact.title} placeholder="Add title" onSave={(value) => onFieldSave("title", value)} />} />
          <LabelValue label="Industry" value={<EditableTextField value={contact.industry} placeholder="Add industry" onSave={(value) => onFieldSave("industry", value)} />} />
          <LabelValue label="Tags" value={<InlineTagEditor tags={contact.tags} onChange={onTagsSave} />} />
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-4">{sectionTitle("Relationship")}</div>
        <div className="space-y-3">
          <LabelValue
            label="Type"
            value={
              <EditableSelectField
                value={contact.relationshipType}
                options={RELATIONSHIP_TYPES}
                labels={RELATIONSHIP_TYPE_LABELS}
                onSave={onRelationshipTypeSave}
              />
            }
          />
          <LabelValue label="How We Met" value={<EditableTextField value={contact.howWeMet} placeholder="Add context" onSave={(value) => onFieldSave("howWeMet", value)} />} />
          <LabelValue label="Met Date" value={<EditableTextField value={contact.metDate} type="date" onSave={(value) => onFieldSave("metDate", value)} />} />
          <LabelValue
            label="Introduced By"
            value={<EditableTextField value={contact.introducedBy} placeholder="Add introducer" onSave={(value) => onFieldSave("introducedBy", value)} />}
          />
          <LabelValue
            label="Pipeline"
            value={
              contact.pipelineDealId ? (
                <a
                  href={`/pipeline?deal=${contact.pipelineDealId}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 hover:text-white"
                >
                  View in Pipeline
                  <ArrowRight className="h-4 w-4" />
                </a>
              ) : (
                <EditableTextField value={contact.pipelineDealId} placeholder="Not linked" onSave={(value) => onFieldSave("pipelineDealId", value)} />
              )
            }
          />
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-4">{sectionTitle("Personal")}</div>
        <div className="space-y-3">
          <LabelValue
            label="Birthday"
            value={
              <div className="flex flex-wrap items-center gap-2">
                <EditableTextField value={contact.birthday} type="date" onSave={(value) => onFieldSave("birthday", value)} />
                {age !== undefined ? <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-400">{age} years old</span> : null}
              </div>
            }
          />
          <LabelValue label="Spouse" value={<EditableTextField value={contact.spouse} placeholder="Add spouse" onSave={(value) => onFieldSave("spouse", value)} />} />
          <LabelValue label="Children" value={<EditableTextField value={contact.children} placeholder="Add children" onSave={(value) => onFieldSave("children", value)} />} />
          <LabelValue label="Interests" value={<EditableTextField value={contact.interests} placeholder="Add interests" onSave={(value) => onFieldSave("interests", value)} />} />
          <LabelValue
            label="Favorite Food"
            value={<EditableTextField value={contact.favoriteFood} placeholder="Add favorite food" onSave={(value) => onFieldSave("favoriteFood", value)} />}
          />
          <LabelValue
            label="Personal Notes"
            value={<EditableTextField value={contact.personalNotes} placeholder="Add personal notes" multiline onSave={(value) => onFieldSave("personalNotes", value)} />}
          />
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-4">{sectionTitle("Social Links")}</div>
        <div className="space-y-3">
          <LabelValue label="LinkedIn" value={<EditableTextField value={contact.linkedin} placeholder="Add LinkedIn" onSave={(value) => onFieldSave("linkedin", value)} />} />
          <LabelValue label="Instagram" value={<EditableTextField value={contact.instagram} placeholder="Add Instagram" onSave={(value) => onFieldSave("instagram", value)} />} />
          <LabelValue label="Twitter" value={<EditableTextField value={contact.twitter} placeholder="Add Twitter" onSave={(value) => onFieldSave("twitter", value)} />} />
          <LabelValue label="Facebook" value={<EditableTextField value={contact.facebook} placeholder="Add Facebook" onSave={(value) => onFieldSave("facebook", value)} />} />
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-4">{sectionTitle("Stay In Touch")}</div>
        <div className="space-y-3">
          <LabelValue
            label="Frequency"
            value={
              <EditableSelectField
                value={contact.stayInTouch?.frequency && contact.stayInTouch.frequency !== "custom" ? contact.stayInTouch.frequency : "monthly"}
                options={REMINDER_OPTIONS}
                onSave={onReminderSave}
              />
            }
          />
          <LabelValue
            label="Next Follow-up"
            value={<EditableTextField value={contact.nextFollowUp} type="date" onSave={(value) => onFieldSave("nextFollowUp", value)} />}
          />
          <LabelValue
            label="Snooze"
            value={
              <button
                type="button"
                onClick={onSnooze}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
              >
                Snooze 7 days
              </button>
            }
          />
        </div>
      </GlassCard>
    </div>
  );
}

function NotesTab({
  contact,
  quickNote,
  onQuickNoteChange,
  onQuickNoteSubmit,
  onNoteSave,
  onNoteDelete,
}: {
  contact: RolodexContact;
  quickNote: string;
  onQuickNoteChange: (value: string) => void;
  onQuickNoteSubmit: () => void;
  onNoteSave: (noteId: string, content: string) => void;
  onNoteDelete: (noteId: string) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <GlassCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            {sectionTitle("Journal")}
            <p className="mt-2 text-sm text-slate-400">Free-form markdown notes about this person. Blur a field to auto-save.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">{contact.notes.length} notes</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <textarea
            value={quickNote}
            onChange={(event) => onQuickNoteChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                onQuickNoteSubmit();
              }
            }}
            placeholder="Quick note. Cmd/Ctrl+Enter adds a timestamped note."
            className="min-h-[120px] w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Markdown supported. Use this for journal-style updates, not interaction logs.</p>
            <button
              type="button"
              onClick={onQuickNoteSubmit}
              className="rounded-2xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              Add Note
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {contact.notes.map((note) => (
            <GlassCard key={note.id} className="bg-white/[0.02]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{formatDateTime(note.updatedAt)}</p>
                  <p className="mt-1 text-xs text-slate-500">Created {formatDateTime(note.createdAt)}</p>
                </div>
                <button type="button" onClick={() => onNoteDelete(note.id)} className="rounded-xl p-2 text-slate-400 hover:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <textarea
                  defaultValue={note.content}
                  onBlur={(event) => onNoteSave(note.id, event.target.value)}
                  className="min-h-[180px] w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none transition focus:border-sky-400/60"
                />
                <div className="min-h-[180px] rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="prose prose-invert max-w-none text-sm prose-p:text-slate-200 prose-strong:text-white prose-a:text-sky-300">
                    <ReactMarkdown>{note.content || EMPTY_NOTES_MARKDOWN}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}

          {!contact.notes.length ? <EmptyPanel title="No notes yet" body="Create a quick note to start a running journal for this contact." /> : null}
        </div>
      </GlassCard>

      <div className="space-y-4">
        <GlassCard>
          <div className="mb-4">{sectionTitle("Recent Context")}</div>
          <div className="space-y-3 text-sm text-slate-300">
            <p>Last interaction: {contact.interactions[0] ? contact.interactions[0].summary : "None logged yet"}.</p>
            <p>Personal notes: {contact.personalNotes || "No personal notes recorded yet."}</p>
            <p>Current themes: {contact.tags.join(", ") || "No tags yet."}</p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4">{sectionTitle("Markdown Tips")}</div>
          <div className="space-y-2 text-sm text-slate-400">
            <p>`# Heading` for sections</p>
            <p>`- bullet` for lists</p>
            <p>`**bold**` for key reminders</p>
            <p>`[link](https://...)` for external context</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ConnectionsTab({
  contact,
  contacts,
  connectionQuery,
  onConnectionQueryChange,
  onAddConnection,
  onRemoveConnection,
  onJumpToContact,
}: {
  contact: RolodexContact;
  contacts: RolodexContact[];
  connectionQuery: string;
  onConnectionQueryChange: (value: string) => void;
  onAddConnection: (id: string) => void;
  onRemoveConnection: (id: string) => void;
  onJumpToContact: (id: string) => void;
}) {
  const directConnections = contacts.filter((entry) => contact.connections.includes(entry.id));
  const searchOptions = contacts.filter(
    (entry) =>
      entry.id !== contact.id &&
      !contact.connections.includes(entry.id) &&
      fullName(entry).toLowerCase().includes(connectionQuery.toLowerCase()),
  );
  const mutualTags = contacts.filter(
    (entry) => entry.id !== contact.id && entry.tags.some((tag) => contact.tags.includes(tag)),
  );
  const sameCity = contacts.filter(
    (entry) => entry.id !== contact.id && entry.city && contact.city && entry.city.toLowerCase() === contact.city.toLowerCase(),
  );
  const introducedBy = contacts.find((entry) => fullName(entry).toLowerCase() === (contact.introducedBy ?? "").toLowerCase());

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <GlassCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              {sectionTitle("Direct Connections")}
              <p className="mt-2 text-sm text-slate-400">Linked contacts in this rolodex network.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">{directConnections.length} linked</div>
          </div>

          {directConnections.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {directConnections.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onJumpToContact(entry.id)}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-sky-400/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-sm font-semibold text-white">
                        {initials(entry)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{fullName(entry)}</p>
                        <p className="mt-1 truncate text-sm text-slate-400">{titleLine(entry)}</p>
                        <p className="mt-2 text-xs text-slate-500">{locationLine(entry) || "No location set"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveConnection(entry.id);
                      }}
                      className="rounded-xl p-2 text-slate-500 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No linked contacts yet" body="Use the add connection search to create a relationship map." />
          )}
        </GlassCard>

        <GlassCard>
          <div className="mb-4">
            {sectionTitle("Add Connection")}
            <p className="mt-2 text-sm text-slate-400">Search the rolodex and link another person to this relationship graph.</p>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input
              value={connectionQuery}
              onChange={(event) => onConnectionQueryChange(event.target.value)}
              placeholder="Search contacts to link"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-10 pr-4 text-sm text-white outline-none transition focus:border-sky-400/60"
            />
          </label>

          <div className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {searchOptions.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onAddConnection(entry.id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-sky-400/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{fullName(entry)}</p>
                  <p className="mt-1 truncate text-sm text-slate-400">{titleLine(entry)}</p>
                </div>
                <Plus className="h-4 w-4 text-sky-300" />
              </button>
            ))}

            {!searchOptions.length ? <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">No matching contacts available to link.</div> : null}
          </div>
        </GlassCard>
      </div>

      <div className="space-y-4">
        <GlassCard>
          <div className="mb-4">{sectionTitle("Introduced By")}</div>
          {introducedBy ? (
            <button
              type="button"
              onClick={() => onJumpToContact(introducedBy.id)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-sky-400/40"
            >
              <p className="font-semibold text-white">{fullName(introducedBy)}</p>
              <p className="mt-1 text-sm text-slate-400">{titleLine(introducedBy)}</p>
            </button>
          ) : (
            <p className="text-sm text-slate-500">{contact.introducedBy || "No introducer chain captured."}</p>
          )}
        </GlassCard>

        <GlassCard>
          <div className="mb-4">{sectionTitle("Mutual Tags")}</div>
          <div className="space-y-2">
            {mutualTags.slice(0, 6).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onJumpToContact(entry.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:border-sky-400/40"
              >
                <span className="truncate text-sm text-white">{fullName(entry)}</span>
                <span className="text-xs text-slate-500">{entry.tags.filter((tag) => contact.tags.includes(tag)).slice(0, 2).join(", ")}</span>
              </button>
            ))}
            {!mutualTags.length ? <p className="text-sm text-slate-500">No shared tag matches yet.</p> : null}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4">{sectionTitle("Same City")}</div>
          <div className="space-y-2">
            {sameCity.slice(0, 6).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onJumpToContact(entry.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:border-sky-400/40"
              >
                <span className="truncate text-sm text-white">{fullName(entry)}</span>
                <span className="text-xs text-slate-500">{locationLine(entry)}</span>
              </button>
            ))}
            {!sameCity.length ? <p className="text-sm text-slate-500">No local overlap found.</p> : null}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function AiInsightsTab({
  contact,
  history,
  prompt,
  onPromptChange,
  onPromptSubmit,
  onQuickPrompt,
  onSuggestTags,
}: {
  contact: RolodexContact;
  history: AiMessage[];
  prompt: string;
  onPromptChange: (value: string) => void;
  onPromptSubmit: (prompt: string) => void;
  onQuickPrompt: (prompt: string) => void;
  onSuggestTags: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <GlassCard>
          <div className="mb-4">{sectionTitle("Prompt Library")}</div>
          <div className="space-y-2">
            {AI_PROMPTS.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => onQuickPrompt(entry)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
              >
                {entry}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4">{sectionTitle("Signal Summary")}</div>
          <div className="space-y-3 text-sm text-slate-300">
            <p>{contact.interactions.length} interactions logged.</p>
            <p>Last touched {relativeTimeFromDate(contact.lastContactedAt)}.</p>
            <p>Current tags: {contact.tags.join(", ") || "No tags yet"}.</p>
          </div>
          <button
            type="button"
            onClick={onSuggestTags}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
          >
            <Sparkles className="h-4 w-4 text-sky-300" />
            Suggest tags & interests
          </button>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            {sectionTitle("Ask Anything")}
            <p className="mt-2 text-sm text-slate-400">Natural-language prompts grounded in the current rolodex record.</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">{history.length / 2} prompts</div>
        </div>

        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && prompt.trim()) {
                event.preventDefault();
                onPromptSubmit(prompt);
              }
            }}
            placeholder="Ask anything about this contact"
            className="flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />
          <button
            type="button"
            onClick={() => onPromptSubmit(prompt)}
            className="rounded-2xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-3 text-sm font-medium text-white transition hover:brightness-110"
          >
            Ask
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "rounded-2xl border p-4",
                entry.role === "assistant" ? "border-sky-400/20 bg-sky-500/8" : "border-white/10 bg-white/[0.02]",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{entry.role === "assistant" ? "AI Insight" : "Prompt"}</p>
                <p className="text-xs text-slate-500">{formatDateTime(entry.createdAt)}</p>
              </div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{entry.content}</div>
            </div>
          ))}

          {!history.length ? <EmptyPanel title="No AI history yet" body="Use a quick prompt or ask your own question to build insight history." /> : null}
        </div>
      </GlassCard>
    </div>
  );
}

export default function RolodexPage() {
  const [contacts, setContacts] = useState<RolodexContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("recently-contacted");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(12);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [quickLog, setQuickLog] = useState<QuickLogDraft | null>(null);
  const [quickNote, setQuickNote] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiHistory, setAiHistory] = useState<Record<string, AiMessage[]>>({});
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
  const [connectionQuery, setConnectionQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const menuRef = useRef<HTMLDivElement | null>(null);

  async function fetchContacts(options?: { seedIfEmpty?: boolean }) {
    const response = await fetch("/api/rolodex", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load rolodex contacts.");
    const data = (await response.json()) as RolodexContact[];

    if (options?.seedIfEmpty && data.length === 0) {
      const seedResponse = await fetch("/api/rolodex/seed", { method: "POST" });
      if (!seedResponse.ok) throw new Error("Unable to seed rolodex contacts.");
      return fetchContacts({ seedIfEmpty: false });
    }

    setContacts(data);
    setSelectedContactId((current) => {
      if (current && data.some((entry) => entry.id === current)) return current;
      return data[0]?.id ?? "";
    });
    setLastSyncedAt(new Date());
    setSecondsSinceSync(0);
    return data;
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await fetchContacts({ seedIfEmpty: true });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to load rolodex.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!lastSyncedAt) return;
    const interval = window.setInterval(() => {
      setSecondsSinceSync(Math.max(0, Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [lastSyncedAt]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchContacts().catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredContacts = useMemo(() => {
    return [...contacts]
      .filter((contact) => {
        if (filter !== "all" && contact.relationshipType !== filter) return false;
        if (!deferredSearch.trim()) return true;
        return contactSearchIndex(contact).includes(deferredSearch.trim().toLowerCase());
      })
      .sort((left, right) => {
        if (sort === "alphabetical") return fullName(left).localeCompare(fullName(right));
        if (sort === "relationship-score") return right.relationshipScore - left.relationshipScore;
        if (sort === "newest") return Date.parse(right.createdAt) - Date.parse(left.createdAt);
        return (right.lastContactedAt ?? "").localeCompare(left.lastContactedAt ?? "");
      });
  }, [contacts, deferredSearch, filter, sort]);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? filteredContacts[0] ?? null,
    [contacts, filteredContacts, selectedContactId],
  );

  const aiConversation = selectedContact ? aiHistory[selectedContact.id] ?? [] : [];

  const timelineItems = useMemo(() => {
    if (!selectedContact) return [];
    return selectedContact.interactions.filter((entry) => timelineFilter === "all" || entry.type === timelineFilter);
  }, [selectedContact, timelineFilter]);

  const visibleTimeline = useMemo(() => timelineItems.slice(0, visibleTimelineCount), [timelineItems, visibleTimelineCount]);

  const interactionStats = useMemo(() => {
    if (!selectedContact) {
      return {
        total: 0,
        last30: 0,
        topType: "",
        initiator: "Balanced",
        you: 0,
        them: 0,
      };
    }

    const typeCounts = selectedContact.interactions.reduce<Record<string, number>>((accumulator, entry) => {
      accumulator[entry.type] = (accumulator[entry.type] ?? 0) + 1;
      return accumulator;
    }, {});

    const topType = Object.entries(typeCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "";
    const initiators = selectedContact.interactions.reduce(
      (accumulator, entry) => {
        const key = inferInitiator(entry);
        accumulator[key] += 1;
        return accumulator;
      },
      { you: 0, them: 0 },
    );

    return {
      total: selectedContact.interactions.length,
      last30: computeMonthInteractionCount(selectedContact.interactions, 30),
      topType: topType ? INTERACTION_TYPE_LABELS[topType as InteractionType] : "None yet",
      initiator:
        initiators.you === initiators.them ? "Balanced" : initiators.you > initiators.them ? "You initiate more" : "They initiate more",
      you: initiators.you,
      them: initiators.them,
    };
  }, [selectedContact]);

  const footerSyncLabel = lastSyncedAt ? `Last synced ${secondsSinceSync}s ago` : "Not synced yet";
  const detailSyncLabel = lastSyncedAt ? `${secondsSinceSync}s since sync` : "waiting to sync";

  async function optimisticContactMutation(
    contactId: string,
    buildNext: (current: RolodexContact) => RolodexContact,
    request: () => Promise<Response>,
  ) {
    const previousContacts = contacts;
    const current = contacts.find((entry) => entry.id === contactId);
    if (!current) return;

    const optimistic = buildNext(current);
    setSaveState("saving");
    setErrorMessage(null);

    setContacts((state) => state.map((entry) => (entry.id === contactId ? optimistic : entry)));

    try {
      const response = await request();
      if (!response.ok) throw new Error("Unable to save rolodex changes.");
      const data = (await response.json()) as RolodexContact | { contact: RolodexContact };
      const updated = "contact" in data ? data.contact : data;
      setContacts((state) => state.map((entry) => (entry.id === contactId ? updated : entry)));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1000);
    } catch (error) {
      setContacts(previousContacts);
      setSaveState("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to save rolodex changes.");
    }
  }

  async function patchContactField<K extends OverviewEditableKey>(key: K, value: string) {
    if (!selectedContact) return;

    const patch: Partial<RolodexContact> = { [key]: value || undefined } as Partial<RolodexContact>;

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({
        ...current,
        ...patch,
      }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }),
    );
  }

  async function patchRelationshipType(value: RelationshipType) {
    if (!selectedContact) return;
    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({ ...current, relationshipType: value }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationshipType: value }),
        }),
    );
  }

  async function patchTags(tags: string[]) {
    if (!selectedContact) return;
    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({ ...current, tags }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags }),
        }),
    );
  }

  async function patchReminderFrequency(value: StayInTouchReminder["frequency"]) {
    if (!selectedContact) return;
    const nextReminder = { ...(selectedContact.stayInTouch ?? {}), frequency: value };
    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({ ...current, stayInTouch: nextReminder }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stayInTouch: nextReminder }),
        }),
    );
  }

  async function snoozeReminder() {
    if (!selectedContact) return;
    const parsed = new Date(`${easternToday()}T12:00:00.000Z`);
    parsed.setUTCDate(parsed.getUTCDate() + 7);
    const snoozedUntil = parsed.toISOString().slice(0, 10);
    const nextReminder = { ...(selectedContact.stayInTouch ?? { frequency: "monthly" as const }), snoozedUntil };

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({ ...current, stayInTouch: nextReminder }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stayInTouch: nextReminder }),
        }),
    );
  }

  async function submitQuickLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact || !quickLog?.summary.trim()) return;

    const interaction: Interaction = {
      id: `ri_local_${Date.now().toString(36)}`,
      type: quickLog.type,
      date: easternToday(),
      summary: quickLog.summary.trim(),
      details: quickLog.details.trim() || undefined,
      sentiment: quickLog.sentiment || undefined,
      createdAt: new Date().toISOString(),
    };

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({
        ...current,
        interactions: [interaction, ...current.interactions].sort((left, right) => right.date.localeCompare(left.date)),
        lastContactedAt: interaction.date,
      }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}/interactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: quickLog.type,
            date: easternToday(),
            summary: quickLog.summary,
            details: quickLog.details,
            sentiment: quickLog.sentiment || undefined,
          }),
        }),
    );

    setQuickLog(null);
  }

  async function deleteInteraction(interactionId: string) {
    if (!selectedContact) return;

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({
        ...current,
        interactions: current.interactions.filter((entry) => entry.id !== interactionId),
      }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}/interactions/${interactionId}`, {
          method: "DELETE",
        }),
    );
  }

  async function addJournalNote() {
    if (!selectedContact || !quickNote.trim()) return;
    const timestamped = `### ${formatDateTime(new Date().toISOString())}\n\n${quickNote.trim()}`;
    const note = makeNote(timestamped);
    const notes = sortNotes([note, ...selectedContact.notes]);

    setQuickNote("");

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({
        ...current,
        notes,
      }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        }),
    );
  }

  async function saveNote(noteId: string, content: string) {
    if (!selectedContact) return;
    const notes = sortNotes(
      selectedContact.notes.map((note) =>
        note.id === noteId
          ? {
              ...note,
              content: content.trim() || EMPTY_NOTES_MARKDOWN,
              updatedAt: new Date().toISOString(),
            }
          : note,
      ),
    );

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({ ...current, notes }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        }),
    );
  }

  async function deleteNote(noteId: string) {
    if (!selectedContact) return;
    const notes = selectedContact.notes.filter((note) => note.id !== noteId);

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({ ...current, notes }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        }),
    );
  }

  async function addConnection(id: string) {
    if (!selectedContact) return;

    const nextConnections = Array.from(new Set([...selectedContact.connections, id]));

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({ ...current, connections: nextConnections }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}/connections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ add: [id] }),
        }),
    );

    setConnectionQuery("");
  }

  async function removeConnection(id: string) {
    if (!selectedContact) return;
    const nextConnections = selectedContact.connections.filter((entry) => entry !== id);

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({ ...current, connections: nextConnections }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}/connections`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remove: [id] }),
        }),
    );
  }

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/rolodex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: contactDraft.firstName,
        lastName: contactDraft.lastName,
        email: contactDraft.email,
        phone: contactDraft.phone,
        company: contactDraft.company,
        title: contactDraft.title,
        relationshipType: contactDraft.relationshipType,
        city: contactDraft.city,
        state: contactDraft.state,
        country: contactDraft.country,
        tags: splitCommaList(contactDraft.tags),
      }),
    });

    if (!response.ok) {
      setErrorMessage("Unable to create contact.");
      return;
    }

    const created = (await response.json()) as RolodexContact;
    setContacts((state) => [created, ...state]);
    setSelectedContactId(created.id);
    setActiveTab("overview");
    setAddContactOpen(false);
    setContactDraft(EMPTY_CONTACT_DRAFT);
  }

  async function importFromPipeline() {
    const response = await fetch("/api/rolodex/import-pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      setErrorMessage("Unable to import contacts from pipeline.");
      return;
    }

    await fetchContacts();
  }

  async function archiveSelected() {
    if (!selectedContact) return;
    const response = await fetch(`/api/rolodex/${selectedContact.id}`, { method: "DELETE" });
    if (!response.ok) {
      setErrorMessage("Unable to archive contact.");
      return;
    }
    setMenuOpen(false);
    await fetchContacts();
  }

  async function moveToPipeline() {
    if (!selectedContact) return;
    const response = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fullName(selectedContact),
        contact: fullName(selectedContact),
        client: selectedContact.company ?? fullName(selectedContact),
        email: selectedContact.email ?? "",
        phone: selectedContact.phone ?? "",
        notes: selectedContact.personalNotes ?? "",
        source: "manual",
        tags: selectedContact.tags,
      }),
    });
    if (!response.ok) {
      setErrorMessage("Unable to move contact into pipeline.");
      return;
    }
    const createdDeal = (await response.json()) as { id: string };
    setMenuOpen(false);
    await patchContactField("pipelineDealId", createdDeal.id);
    await patchRelationshipType("prospect");
  }

  async function askAi(promptValue: string) {
    if (!selectedContact || !promptValue.trim()) return;
    const now = new Date().toISOString();
    const next = [
      ...(aiHistory[selectedContact.id] ?? []),
      {
        id: `${now}-user`,
        role: "user" as const,
        content: promptValue,
        createdAt: now,
      },
      {
        id: `${now}-assistant`,
        role: "assistant" as const,
        content: buildAiAnswer(selectedContact, promptValue, contacts),
        createdAt: now,
      },
    ];

    setAiHistory((state) => ({ ...state, [selectedContact.id]: next }));
    setAiPrompt("");
  }

  async function suggestTags() {
    if (!selectedContact) return;
    const suggestions = inferSuggestedTags(selectedContact);
    if (!suggestions.length) {
      await askAi("Summarize my relationship with this person");
      return;
    }
    await patchTags([...selectedContact.tags, ...suggestions]);
    const now = new Date().toISOString();
    setAiHistory((state) => ({
      ...state,
      [selectedContact.id]: [
        ...(state[selectedContact.id] ?? []),
        {
          id: `${now}-assistant-tags`,
          role: "assistant",
          content: `Added suggested tags: ${suggestions.join(", ")}.`,
          createdAt: now,
        },
      ],
    }));
  }

  function jumpToContact(id: string) {
    setSelectedContactId(id);
    setActiveTab("overview");
    setConnectionQuery("");
    setVisibleTimelineCount(12);
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-200">Loading Rolodex…</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.08),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-slate-100">
      <AddContactModal
        open={addContactOpen}
        draft={contactDraft}
        onDraftChange={(patch) => setContactDraft((state) => ({ ...state, ...patch }))}
        onClose={() => setAddContactOpen(false)}
        onSubmit={createContact}
      />

      <div className="mx-auto flex min-h-screen max-w-[1760px] flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 rounded-[30px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, company, email, tags, notes"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-sky-400/60"
                  />
                </label>

                <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
                  {FILTER_PILLS.map((pill) => (
                    <button
                      key={pill.value}
                      type="button"
                      onClick={() => setFilter(pill.value)}
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm transition",
                        filter === pill.value ? "border-sky-400/40 bg-sky-500/15 text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white",
                      )}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
                  <Filter className="h-3.5 w-3.5" />
                  Real-time filtering
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Polling every 15s
                </span>
                <SavePill status={saveState} lastSyncedLabel={detailSyncLabel} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
                  className="appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-sky-400/60"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
              </label>

              <button
                type="button"
                onClick={() => setAddContactOpen(true)}
                className="rounded-2xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-3 text-sm font-medium text-white transition hover:brightness-110"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Contact
                </span>
              </button>

              <button
                type="button"
                onClick={importFromPipeline}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
              >
                Import from Pipeline
              </button>

              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{filteredContacts.length} contacts</div>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div>
        ) : null}

        <div className="grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-[calc(100vh-188px)] flex-col rounded-[30px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between px-2">
              <div>
                {sectionTitle("Contact List")}
                <p className="mt-1 text-sm text-slate-500">Left sidebar roster with live updates.</p>
              </div>
              <button
                type="button"
                onClick={() => fetchContacts().catch(() => setErrorMessage("Unable to refresh contacts."))}
                className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:text-white"
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredContacts.map((contact) => (
                <ContactListCard
                  key={contact.id}
                  contact={contact}
                  selected={selectedContact?.id === contact.id}
                  onSelect={() => {
                    setSelectedContactId(contact.id);
                    setActiveTab("overview");
                    setVisibleTimelineCount(12);
                  }}
                />
              ))}

              {!filteredContacts.length ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                  No contacts match the current filters.
                </div>
              ) : null}
            </div>
          </aside>

          <main className="flex min-h-[calc(100vh-188px)] flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
            {selectedContact ? (
              <>
                <div className="border-b border-white/10 p-5">
                  <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[28px] border border-white/10 bg-slate-950/60 text-2xl font-semibold text-white">
                        {initials(selectedContact)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="min-w-0">
                            <h1 className="truncate text-3xl font-semibold text-white">{fullName(selectedContact)}</h1>
                            <p className="mt-1 truncate text-sm text-slate-400">{titleLine(selectedContact)}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: relationshipDot[selectedContact.relationshipType] }} />
                                <select
                                  value={selectedContact.relationshipType}
                                  onChange={(event) => patchRelationshipType(event.target.value as RelationshipType)}
                                  className="bg-transparent text-white outline-none"
                                >
                                  {RELATIONSHIP_TYPES.map((type) => (
                                    <option key={type} value={type} className="bg-slate-950">
                                      {RELATIONSHIP_TYPE_LABELS[type]}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <span className="text-sm text-slate-400">Last contacted {relativeTimeFromDate(selectedContact.lastContactedAt)}</span>
                              {locationLine(selectedContact) ? (
                                <span className="inline-flex items-center gap-2 text-sm text-slate-400">
                                  <MapPin className="h-4 w-4" />
                                  {locationLine(selectedContact)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <IconAction href={selectedContact.phone ? `tel:${selectedContact.phone}` : undefined} label="Call">
                            <Phone className="h-4 w-4 text-sky-300" />
                          </IconAction>
                          <IconAction href={selectedContact.email ? `mailto:${selectedContact.email}` : undefined} label="Email">
                            <Mail className="h-4 w-4 text-sky-300" />
                          </IconAction>
                          <IconAction href={normalizeUrl(selectedContact.website)} label="Website" external>
                            <Globe className="h-4 w-4 text-sky-300" />
                          </IconAction>
                          <IconAction label="Copy" onClick={() => copyText([selectedContact.email, selectedContact.phone].filter(Boolean).join(" / "))}>
                            <Copy className="h-4 w-4 text-sky-300" />
                          </IconAction>
                          <IconAction href={selectedContact.phone ? `sms:${selectedContact.phone}` : undefined} label="Text">
                            <MessageSquare className="h-4 w-4 text-sky-300" />
                          </IconAction>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-start justify-end gap-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ContactMetric label="Interactions" value={selectedContact.interactions.length} />
                        <ContactMetric label="Next Follow-up" value={selectedContact.nextFollowUp ? formatDate(selectedContact.nextFollowUp) : "Unscheduled"} tone="text-slate-200" />
                      </div>

                      <ScoreCircle score={selectedContact.relationshipScore} />

                      <div ref={menuRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setMenuOpen((state) => !state)}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-slate-300 transition hover:text-white"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {menuOpen ? (
                          <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-white/10 bg-[#091224] p-2 shadow-[0_20px_60px_rgba(2,6,23,0.55)]">
                            <button
                              type="button"
                              onClick={archiveSelected}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.04] hover:text-white"
                            >
                              <Trash2 className="h-4 w-4" />
                              Archive
                            </button>
                            <button
                              type="button"
                              onClick={moveToPipeline}
                              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.04] hover:text-white"
                            >
                              <GripHorizontal className="h-4 w-4" />
                              Move to Pipeline
                            </button>
                            <button
                              type="button"
                              onClick={archiveSelected}
                              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-b border-white/10 px-5">
                  <div className="flex overflow-x-auto">
                    {DETAIL_TABS.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                          "relative px-4 py-4 text-sm transition",
                          activeTab === tab.value ? "text-white" : "text-slate-400 hover:text-white",
                        )}
                      >
                        {tab.label}
                        <span
                          className={cn(
                            "absolute inset-x-4 bottom-0 h-0.5 rounded-full transition",
                            activeTab === tab.value ? "bg-sky-400" : "bg-transparent",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {activeTab === "overview" ? (
                    <OverviewTab
                      contact={selectedContact}
                      onFieldSave={patchContactField}
                      onTagsSave={patchTags}
                      onRelationshipTypeSave={patchRelationshipType}
                      onReminderSave={patchReminderFrequency}
                      onSnooze={snoozeReminder}
                    />
                  ) : null}

                  {activeTab === "activity" ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 xl:grid-cols-4">
                        <ContactMetric label="Total Interactions" value={interactionStats.total} />
                        <ContactMetric label="Last 30 Days" value={interactionStats.last30} />
                        <ContactMetric label="Common Type" value={interactionStats.topType} tone="text-sky-300" />
                        <ContactMetric
                          label="Who Initiates"
                          value={
                            <div>
                              <div>{interactionStats.initiator}</div>
                              <div className="mt-1 text-xs font-normal text-slate-500">
                                You {interactionStats.you} · Them {interactionStats.them}
                              </div>
                            </div>
                          }
                        />
                      </div>

                      <ActivityHeatmap interactions={selectedContact.interactions} />

                      <GlassCard>
                        <div className="mb-4">
                          {sectionTitle("Quick Log")}
                          <p className="mt-2 text-sm text-slate-400">Fast entry for calls, emails, meetings, notes, gifts, referrals, and deals.</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {QUICK_LOG_BUTTONS.map((entry) => {
                            const Icon = interactionIcon(entry.type);
                            return (
                              <button
                                key={entry.type}
                                type="button"
                                onClick={() => setQuickLog({ ...EMPTY_QUICK_LOG, type: entry.type })}
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition",
                                  quickLog?.type === entry.type ? "border-sky-400/40 bg-sky-500/10 text-white" : "border-white/10 bg-white/[0.02] text-slate-300 hover:text-white",
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                {entry.label}
                              </button>
                            );
                          })}
                        </div>

                        {quickLog ? (
                          <form onSubmit={submitQuickLog} className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_200px]">
                              <input
                                value={quickLog.summary}
                                onChange={(event) => setQuickLog((state) => (state ? { ...state, summary: event.target.value } : state))}
                                placeholder="Summary"
                                className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                              />
                              <label className="relative">
                                <select
                                  value={quickLog.sentiment}
                                  onChange={(event) => setQuickLog((state) => (state ? { ...state, sentiment: event.target.value as SentimentValue } : state))}
                                  className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-sky-400/60"
                                >
                                  <option value="">Sentiment</option>
                                  <option value="positive">😊 Positive</option>
                                  <option value="neutral">😐 Neutral</option>
                                  <option value="negative">😟 Negative</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                              </label>
                            </div>

                            <textarea
                              value={quickLog.details}
                              onChange={(event) => setQuickLog((state) => (state ? { ...state, details: event.target.value } : state))}
                              placeholder="Optional details"
                              className="mt-3 min-h-[96px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                            />

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <p className="text-xs text-slate-500">Entries are logged with today&apos;s Eastern date and inserted into the timeline immediately.</p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setQuickLog(null)}
                                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-200 transition hover:text-white"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="rounded-2xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                                >
                                  Log Interaction
                                </button>
                              </div>
                            </div>
                          </form>
                        ) : null}
                      </GlassCard>

                      <GlassCard>
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div>
                            {sectionTitle("Timeline")}
                            <p className="mt-2 text-sm text-slate-400">Chronological feed of all interactions with type filters and delete actions.</p>
                          </div>

                          <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
                            {TIMELINE_FILTERS.map((entry) => (
                              <button
                                key={entry}
                                type="button"
                                onClick={() => {
                                  setTimelineFilter(entry);
                                  setVisibleTimelineCount(12);
                                }}
                                className={cn(
                                  "whitespace-nowrap rounded-full border px-3 py-2 text-sm transition",
                                  timelineFilter === entry
                                    ? "border-sky-400/40 bg-sky-500/15 text-white"
                                    : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white",
                                )}
                              >
                                {entry === "all" ? "All" : INTERACTION_TYPE_LABELS[entry]}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          {visibleTimeline.map((interaction) => (
                            <TimelineItemCard key={interaction.id} interaction={interaction} onDelete={() => deleteInteraction(interaction.id)} />
                          ))}

                          {!visibleTimeline.length ? (
                            <EmptyPanel title="No activity yet" body="Use the quick log controls to start building an interaction history." />
                          ) : null}
                        </div>

                        {visibleTimeline.length < timelineItems.length ? (
                          <div className="mt-4 flex justify-center">
                            <button
                              type="button"
                              onClick={() => setVisibleTimelineCount((count) => count + 12)}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
                            >
                              Load More
                            </button>
                          </div>
                        ) : null}
                      </GlassCard>
                    </div>
                  ) : null}

                  {activeTab === "notes" ? (
                    <NotesTab
                      contact={selectedContact}
                      quickNote={quickNote}
                      onQuickNoteChange={setQuickNote}
                      onQuickNoteSubmit={addJournalNote}
                      onNoteSave={saveNote}
                      onNoteDelete={deleteNote}
                    />
                  ) : null}

                  {activeTab === "connections" ? (
                    <ConnectionsTab
                      contact={selectedContact}
                      contacts={contacts}
                      connectionQuery={connectionQuery}
                      onConnectionQueryChange={setConnectionQuery}
                      onAddConnection={addConnection}
                      onRemoveConnection={removeConnection}
                      onJumpToContact={jumpToContact}
                    />
                  ) : null}

                  {activeTab === "ai" ? (
                    <AiInsightsTab
                      contact={selectedContact}
                      history={aiConversation}
                      prompt={aiPrompt}
                      onPromptChange={setAiPrompt}
                      onPromptSubmit={(promptValue) => askAi(promptValue)}
                      onQuickPrompt={askAi}
                      onSuggestTags={suggestTags}
                    />
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <EmptyPanel title="No contact selected" body="Choose a contact from the left sidebar or create a new one." />
              </div>
            )}
          </main>
        </div>

        <footer className="mt-4 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              {contacts.reduce((count, contact) => count + contact.connections.length, 0)} total connections
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              {footerSyncLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span>{contacts.length} contacts in memory</span>
            <span>{selectedContact ? `${selectedContact.interactions.length} interactions on selected contact` : "No contact selected"}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}













































































