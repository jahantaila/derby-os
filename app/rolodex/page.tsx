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
import { type PipelineDeal } from "@/lib/pipeline-types";
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
type SmartGroupKey = "city" | "stale-30" | "top-score" | "new-this-month" | "has-phone";
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

type PipelineImportResult = {
  imported: number;
  skipped: number;
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

const easternMonthDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "America/New_York",
});

function easternToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function easternTodayDate() {
  return new Date(`${easternToday()}T12:00:00.000Z`);
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

function daysSinceDate(date?: string) {
  if (!date) return null;
  const target = new Date(`${date}T12:00:00.000Z`).getTime();
  const today = easternTodayDate().getTime();
  if (Number.isNaN(target) || Number.isNaN(today)) return null;
  return Math.max(0, Math.floor((today - target) / 86400000));
}

function reminderFrequencyDays(reminder?: StayInTouchReminder) {
  if (!reminder) return undefined;
  if (reminder.frequency === "weekly") return 7;
  if (reminder.frequency === "biweekly") return 14;
  if (reminder.frequency === "monthly") return 30;
  if (reminder.frequency === "quarterly") return 90;
  if (reminder.frequency === "yearly") return 365;
  if (reminder.frequency === "custom") return reminder.customDays && reminder.customDays > 0 ? reminder.customDays : undefined;
  return undefined;
}

function startOfWeek(date = easternTodayDate()) {
  const start = new Date(date);
  const day = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - day);
  start.setUTCHours(12, 0, 0, 0);
  return start;
}

function shiftDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function shiftWeeks(date: Date, weeks: number) {
  return shiftDays(date, weeks * 7);
}

function weekLabel(date: Date) {
  return easternMonthDayFormatter.format(date);
}

function nextBirthdayOccurrence(birthday?: string) {
  if (!birthday) return null;
  const today = easternTodayDate();
  const monthDay = birthday.slice(5);
  const currentYear = today.getUTCFullYear();
  const thisYear = new Date(`${currentYear}-${monthDay}T12:00:00.000Z`);
  if (Number.isNaN(thisYear.getTime())) return null;
  if (thisYear.getTime() >= today.getTime()) return thisYear;
  const nextYear = new Date(`${currentYear + 1}-${monthDay}T12:00:00.000Z`);
  return Number.isNaN(nextYear.getTime()) ? null : nextYear;
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabelShort(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "America/New_York",
  }).format(date);
}

function formatTrendArrow(delta: number) {
  if (delta > 0) return "↑";
  if (delta < 0) return "↓";
  return "→";
}

function interactionTrendArrow(interactions: Interaction[]) {
  const latestSentiment = interactions[0]?.sentiment;
  if (latestSentiment === "positive") return "↑";
  if (latestSentiment === "negative") return "↓";
  return "→";
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

function RelationshipTrajectoryCard({
  interactions,
}: {
  interactions: Interaction[];
}) {
  const series = useMemo(() => {
    const current = easternTodayDate();
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const bucketDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - (5 - index), 1, 12));
      return {
        key: monthKey(bucketDate),
        label: monthLabelShort(bucketDate),
        count: 0,
      };
    });

    const bucketIndex = new Map(buckets.map((entry, index) => [entry.key, index]));
    interactions.forEach((interaction) => {
      const parsed = new Date(`${interaction.date}T12:00:00.000Z`);
      if (Number.isNaN(parsed.getTime())) return;
      const index = bucketIndex.get(monthKey(parsed));
      if (index === undefined) return;
      buckets[index]!.count += 1;
    });

    return buckets;
  }, [interactions]);

  const maxCount = Math.max(1, ...series.map((entry) => entry.count));
  const points = series.map((entry, index) => {
    const x = (index / Math.max(1, series.length - 1)) * 100;
    const y = 90 - (entry.count / maxCount) * 70;
    return { ...entry, x, y };
  });
  const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `0,90 ${polylinePoints} 100,90`;
  const firstHalf = series.slice(0, 3).reduce((sum, entry) => sum + entry.count, 0);
  const secondHalf = series.slice(3).reduce((sum, entry) => sum + entry.count, 0);
  const trend = secondHalf > firstHalf ? "Trending up" : secondHalf < firstHalf ? "Declining" : "Stable";

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {sectionTitle("Relationship Trajectory")}
          <p className="mt-2 text-sm text-slate-400">Interaction count across the last six months.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">{trend}</div>
      </div>

      <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-950/40 p-4">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full">
          <defs>
            <linearGradient id="trajectoryFill" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(56,189,248,0.35)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.04)" />
            </linearGradient>
          </defs>
          <line x1="0" y1="90" x2="100" y2="90" stroke="rgba(148,163,184,0.2)" strokeWidth="0.75" />
          <line x1="0" y1="55" x2="100" y2="55" stroke="rgba(148,163,184,0.12)" strokeWidth="0.75" strokeDasharray="2 2" />
          <line x1="0" y1="20" x2="100" y2="20" stroke="rgba(148,163,184,0.12)" strokeWidth="0.75" strokeDasharray="2 2" />
          <polygon points={areaPoints} fill="url(#trajectoryFill)" />
          <polyline points={polylinePoints} fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((point) => (
            <circle key={point.key} cx={point.x} cy={point.y} r="2.5" fill="#0f172a" stroke="#7dd3fc" strokeWidth="1.5" />
          ))}
        </svg>

        <div className="mt-4 grid grid-cols-6 gap-2">
          {series.map((entry) => (
            <div key={entry.key} className="text-center">
              <p className="text-xs text-slate-500">{entry.label}</p>
              <p className="mt-1 text-sm font-medium text-white">{entry.count}</p>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

function CommunicationInsightsCard({
  interactions,
}: {
  interactions: Interaction[];
}) {
  const insights = useMemo(() => {
    const total = interactions.length;
    const counts = interactions.reduce<Record<InteractionType, number>>(
      (accumulator, interaction) => {
        accumulator[interaction.type] += 1;
        return accumulator;
      },
      {
        call: 0,
        email: 0,
        meeting: 0,
        text: 0,
        social: 0,
        event: 0,
        note: 0,
        gift: 0,
        referral: 0,
        deal: 0,
      },
    );

    const orderedTypes = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1]) as Array<[InteractionType, number]>;

    const displayTypes = orderedTypes.slice(0, 4);
    const topType = orderedTypes[0]?.[0];

    const positiveByType = orderedTypes
      .map(([type, count]) => {
        const positive = interactions.filter((interaction) => interaction.type === type && interaction.sentiment === "positive").length;
        return {
          type,
          count,
          positive,
          positiveRate: count ? positive / count : 0,
        };
      })
      .filter((entry) => entry.positive > 0)
      .sort((left, right) => right.positiveRate - left.positiveRate || right.positive - left.positive);

    const bestSentimentType = positiveByType[0];
    const callCount = counts.call;
    const callPositive = interactions.filter((interaction) => interaction.type === "call" && interaction.sentiment === "positive").length;
    const callPositiveRate = callCount ? callPositive / callCount : 0;

    let suggestion = "Keep mixing channels to avoid over-relying on one format.";
    if (callCount > 0 && callPositiveRate >= 0.6 && topType !== "call") {
      suggestion = "Try calling more. Your calls tend to land well.";
    } else if (bestSentimentType && bestSentimentType.type !== topType) {
      suggestion = `Lean into ${INTERACTION_TYPE_LABELS[bestSentimentType.type].toLowerCase()} touchpoints. They carry the strongest positive signal.`;
    } else if (topType) {
      suggestion = `Stay consistent with ${INTERACTION_TYPE_LABELS[topType].toLowerCase()} and layer in one higher-touch follow-up this month.`;
    }

    return {
      total,
      displayTypes,
      topType,
      bestSentimentType,
      suggestion,
    };
  }, [interactions]);

  return (
    <GlassCard className="p-6">
      <div>
        {sectionTitle("Communication Insights")}
        <p className="mt-2 text-sm text-slate-400">How this relationship responds across channels.</p>
      </div>

      {insights.total ? (
        <>
          <div className="mt-5 overflow-hidden rounded-full border border-white/10 bg-slate-950/60">
            <div className="flex h-4 w-full">
              {insights.displayTypes.map(([type, count]) => (
                <div
                  key={type}
                  title={`${INTERACTION_TYPE_LABELS[type]}: ${Math.round((count / insights.total) * 100)}%`}
                  className="h-full"
                  style={{
                    width: `${(count / insights.total) * 100}%`,
                    backgroundColor: relationshipDot[
                      type === "call"
                        ? "client"
                        : type === "email"
                          ? "partner"
                          : type === "meeting"
                            ? "mentor"
                            : type === "text"
                              ? "friend"
                              : "industry"
                    ],
                  }}
                />
              ))}
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-300">
            {insights.displayTypes
              .map(([type, count]) => `${Math.round((count / insights.total) * 100)}% ${INTERACTION_TYPE_LABELS[type].toLowerCase()}`)
              .join(", ")}
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Most Common</p>
              <p className="mt-3 text-base font-semibold text-white">
                {insights.topType ? INTERACTION_TYPE_LABELS[insights.topType] : "No activity yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Best Sentiment</p>
              <p className="mt-3 text-base font-semibold text-white">
                {insights.bestSentimentType
                  ? `${INTERACTION_TYPE_LABELS[insights.bestSentimentType.type]} (${Math.round(
                      insights.bestSentimentType.positiveRate * 100,
                    )}% positive)`
                  : "No positive pattern yet"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Suggestion</p>
              <p className="mt-3 text-sm text-slate-200">{insights.suggestion}</p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Log a few interactions to surface channel patterns and sentiment signals.</p>
      )}
    </GlassCard>
  );
}

function TimelineItemCard({
  interaction,
  onOpen,
  onDelete,
}: {
  interaction: Interaction;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const Icon = interactionIcon(interaction.type);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.04]"
    >
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
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="opacity-0 transition group-hover:opacity-100 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-slate-400 hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function InteractionDetailModal({
  open,
  interaction,
  editing,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean;
  interaction: Interaction | null;
  editing: boolean;
  draft: Pick<QuickLogDraft, "summary" | "details" | "sentiment">;
  onDraftChange: (patch: Partial<Pick<QuickLogDraft, "summary" | "details" | "sentiment">>) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  useEffect(() => {
    if (open) setDetailsExpanded(false);
  }, [open, interaction?.id]);

  if (!open || !interaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#08101f]/95 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.6)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-300">
                {INTERACTION_TYPE_LABELS[interaction.type]}
              </span>
              {interaction.sentiment ? (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-sm text-slate-200">
                  {sentimentEmoji(interaction.sentiment)} {interaction.sentiment}
                </span>
              ) : null}
              <span className="text-sm text-slate-400">{formatDate(interaction.date)}</span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-white">{editing ? "Edit interaction" : interaction.summary}</p>
            <p className="mt-2 text-sm text-slate-500">{formatDateTime(interaction.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Summary</p>
            {editing ? (
              <input
                value={draft.summary}
                onChange={(event) => onDraftChange({ summary: event.target.value })}
                className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
              />
            ) : (
              <p className="mt-3 text-lg text-white">{interaction.summary}</p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Details</p>
              <button
                type="button"
                onClick={() => setDetailsExpanded((state) => !state)}
                className="text-sm text-slate-300 transition hover:text-white"
              >
                {detailsExpanded ? "Collapse" : "Expand"}
              </button>
            </div>
            {editing ? (
              <textarea
                value={draft.details}
                onChange={(event) => onDraftChange({ details: event.target.value })}
                className="mt-3 min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
              />
            ) : (
              <p className={cn("mt-3 whitespace-pre-wrap text-sm text-slate-300", detailsExpanded ? "" : "line-clamp-4")}>
                {interaction.details || "No extra details logged yet."}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sentiment</p>
              {editing ? (
                <label className="relative mt-3 block">
                  <select
                    value={draft.sentiment}
                    onChange={(event) => onDraftChange({ sentiment: event.target.value as SentimentValue })}
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-sky-400/60"
                  >
                    <option value="">Not set</option>
                    <option value="positive">😊 Positive</option>
                    <option value="neutral">😐 Neutral</option>
                    <option value="negative">😟 Negative</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                </label>
              ) : (
                <p className="mt-3 text-sm text-white">{interaction.sentiment ? `${sentimentEmoji(interaction.sentiment)} ${interaction.sentiment}` : "Not set"}</p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Attachments</p>
              <p className="mt-3 text-sm text-slate-400">Linked emails, files, and synced assets will appear here.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Full Email Content</p>
              <p className="mt-3 text-sm text-slate-400">Connect Gmail to see full email content.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 transition hover:bg-rose-500/20"
          >
            Delete
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-2xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  Save changes
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onStartEdit}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionLogModal({
  open,
  contacts,
  selectedContactId,
  draft,
  onContactChange,
  onDraftChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  contacts: RolodexContact[];
  selectedContactId: string;
  draft: QuickLogDraft;
  onContactChange: (value: string) => void;
  onDraftChange: (patch: Partial<QuickLogDraft>) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#08101f]/95 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.6)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xl font-semibold text-white">Log a Call</p>
            <p className="mt-1 text-sm text-slate-400">Pick a contact and add the call summary without leaving Home.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm text-slate-400">Contact</span>
            <select
              value={selectedContactId}
              onChange={(event) => onContactChange(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
            >
              <option value="">Select a contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {fullName(contact)}{contact.company ? ` • ${contact.company}` : ""}
                </option>
              ))}
            </select>
          </label>

          <input
            value={draft.summary}
            onChange={(event) => onDraftChange({ summary: event.target.value })}
            placeholder="Call summary"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />

          <textarea
            value={draft.details}
            onChange={(event) => onDraftChange({ details: event.target.value })}
            placeholder="Optional details"
            className="min-h-[120px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
          />

          <label className="relative block">
            <select
              value={draft.sentiment}
              onChange={(event) => onDraftChange({ sentiment: event.target.value as SentimentValue })}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-sky-400/60"
            >
              <option value="">Sentiment</option>
              <option value="positive">😊 Positive</option>
              <option value="neutral">😐 Neutral</option>
              <option value="negative">😟 Negative</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
            >
              Log call
            </button>
          </div>
        </form>
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
  const findByIntroducerName = (name?: string) =>
    contacts.find((entry) => name && fullName(entry).toLowerCase() === name.toLowerCase());
  const introducedBy = findByIntroducerName(contact.introducedBy);
  const referralChain = (() => {
    const chain: RolodexContact[] = [];
    const seen = new Set<string>([contact.id]);
    let current = introducedBy;

    while (current && !seen.has(current.id)) {
      chain.unshift(current);
      seen.add(current.id);
      current = findByIntroducerName(current.introducedBy);
    }

    return chain;
  })();
  const introducedOthersCount = contacts.filter(
    (entry) => entry.id !== contact.id && (entry.introducedBy ?? "").toLowerCase() === fullName(contact).toLowerCase(),
  ).length;

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
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              {sectionTitle("Referral Chain")}
              <p className="mt-2 text-sm text-slate-400">How this contact entered your network and who they may have brought in.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
              {introducedOthersCount} introduction{introducedOthersCount === 1 ? "" : "s"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-100">You</span>
            {referralChain.map((entry) => (
              <div key={entry.id} className="contents">
                <ArrowRight className="h-4 w-4 text-slate-500" />
                <button
                  type="button"
                  onClick={() => onJumpToContact(entry.id)}
                  className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white transition hover:border-sky-400/40"
                >
                  {fullName(entry)}
                </button>
              </div>
            ))}
            <ArrowRight className="h-4 w-4 text-slate-500" />
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-100">
              {fullName(contact)}
            </span>
          </div>

          {!referralChain.length && !contact.introducedBy ? (
            <p className="mt-4 text-sm text-slate-500">No introducer chain captured yet.</p>
          ) : null}
        </GlassCard>

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

function ImportPipelineModal({
  open,
  deals,
  selectedDealIds,
  loading,
  submitting,
  existingEmails,
  onToggleDeal,
  onToggleAll,
  onClose,
  onSubmit,
}: {
  open: boolean;
  deals: PipelineDeal[];
  selectedDealIds: string[];
  loading: boolean;
  submitting: boolean;
  existingEmails: Set<string>;
  onToggleDeal: (dealId: string) => void;
  onToggleAll: () => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  const allSelected = deals.length > 0 && selectedDealIds.length === deals.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl rounded-[32px] border border-white/10 bg-[#08101f]/95 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.6)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xl font-semibold text-white">Import from Pipeline</p>
            <p className="mt-1 text-sm text-slate-400">Select pipeline deals to create Rolodex contacts. Existing emails will be skipped.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">Loading pipeline deals…</div>
        ) : deals.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-slate-300">No pipeline deals available to import.</div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">{selectedDealIds.length} of {deals.length} selected</p>
              <button
                type="button"
                onClick={onToggleAll}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-slate-300 transition hover:text-white"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {deals.map((deal) => {
                const checked = selectedDealIds.includes(deal.id);
                const normalizedEmail = deal.email.trim().toLowerCase();
                const existsInRolodex = Boolean(normalizedEmail) && existingEmails.has(normalizedEmail);

                return (
                  <label
                    key={deal.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition",
                      checked ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-white/[0.03] hover:border-white/20",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleDeal(deal.id)}
                      className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950 text-sky-400 focus:ring-sky-400"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">{deal.name}</p>
                        {existsInRolodex ? (
                          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">
                            Already in Rolodex
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{deal.client}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>{deal.email || "No email"}</span>
                        <span>{deal.enrichmentData?.phone || "No phone"}</span>
                        <span>{[deal.city, deal.state].filter(Boolean).join(", ") || "No location"}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading || submitting || selectedDealIds.length === 0}
            className="rounded-2xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Importing..." : "Import Selected"}
          </button>
        </div>
      </div>
    </div>
  );
}

type ViewMode = "home" | "contacts" | "detail";
type BrowserMode = "grid" | "list";

function easternHour() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/New_York",
    }).format(new Date()),
  );
}

function greetingForHour() {
  const hour = easternHour();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatRelativeDateTime(value?: string) {
  if (!value) return "Just now";
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return value;

  const deltaMs = Date.now() - parsed;
  const minutes = Math.max(0, Math.floor(deltaMs / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(value);
}

function parseHashState(hashValue: string): { view: ViewMode; selectedContactId: string | null } {
  const raw = hashValue.replace(/^#/, "").trim();
  if (!raw || raw === "home") return { view: "home", selectedContactId: null };
  if (raw === "contacts") return { view: "contacts", selectedContactId: null };
  if (raw.startsWith("detail/")) {
    const selectedContactId = raw.slice("detail/".length).split("?")[0].trim();
    return selectedContactId ? { view: "detail", selectedContactId } : { view: "contacts", selectedContactId: null };
  }
  return { view: "home", selectedContactId: null };
}

function buildHash(view: ViewMode, selectedContactId?: string | null) {
  if (view === "contacts") return "#contacts";
  if (view === "detail" && selectedContactId) return `#detail/${selectedContactId}`;
  return "#home";
}

function topContactTypes(contacts: RolodexContact[]) {
  const counts = contacts.reduce<Record<string, number>>((accumulator, contact) => {
    accumulator[contact.relationshipType] = (accumulator[contact.relationshipType] ?? 0) + 1;
    return accumulator;
  }, {});

  const total = contacts.length || 1;
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([type, count]) => ({
      type: type as RelationshipType,
      count,
      width: `${Math.max(10, Math.round((count / total) * 100))}%`,
    }));
}

function startOfMonth(date = easternTodayDate()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12, 0, 0, 0));
}

function bubbleDiameter(interactionCount: number, maxInteractions: number) {
  if (maxInteractions <= 0) return 44;
  const scaled = 44 + (interactionCount / maxInteractions) * 56;
  return Math.round(Math.max(44, Math.min(100, scaled)));
}

function networkMapPosition(index: number) {
  if (index === 0) return { left: 50, top: 50 };
  const ring = Math.floor(Math.sqrt(index - 1)) + 1;
  const ringStart = (ring - 1) * (ring - 1) + 1;
  const positionInRing = index - ringStart;
  const itemsInRing = ring * 2 + 2;
  const angle = (Math.PI * 2 * positionInRing) / itemsInRing - Math.PI / 2;
  const radius = 14 + ring * 12;
  return {
    left: 50 + Math.cos(angle) * radius,
    top: 50 + Math.sin(angle) * radius,
  };
}

function buildNetworkAnswer(prompt: string, contacts: RolodexContact[]) {
  const lower = prompt.toLowerCase();
  const sortedByScore = [...contacts].sort((left, right) => right.relationshipScore - left.relationshipScore);
  const overdue = contacts
    .filter((contact) => contact.nextFollowUp && contact.nextFollowUp <= easternToday())
    .sort((left, right) => (left.nextFollowUp ?? "").localeCompare(right.nextFollowUp ?? ""));
  const recent = contacts
    .filter((contact) => contact.lastContactedAt)
    .sort((left, right) => (right.lastContactedAt ?? "").localeCompare(left.lastContactedAt ?? ""));

  if (lower.includes("follow up")) {
    const people = overdue.slice(0, 4).map((contact) => `${fullName(contact)} (${relativeTimeFromDate(contact.lastContactedAt)})`);
    return people.length
      ? `Priority follow-ups: ${people.join(", ")}.`
      : "No overdue follow-ups are flagged right now. Start with contacts you have not touched in the last two weeks.";
  }

  if (lower.includes("strongest") || lower.includes("best")) {
    return `Strongest relationships by score: ${sortedByScore
      .slice(0, 5)
      .map((contact) => `${fullName(contact)} (${contact.relationshipScore})`)
      .join(", ")}.`;
  }

  if (lower.includes("louisville")) {
    const matches = contacts.filter((contact) => locationLine(contact).toLowerCase().includes("louisville"));
    return matches.length
      ? `Louisville contacts: ${matches.slice(0, 6).map((contact) => fullName(contact)).join(", ")}.`
      : "No Louisville contacts are currently tagged in the rolodex.";
  }

  if (lower.includes("restaurant")) {
    const matches = contacts.filter((contact) => {
      const haystack = `${contact.company} ${contact.title} ${contact.industry} ${contact.tags.join(" ")}`.toLowerCase();
      return haystack.includes("restaurant") || haystack.includes("hospitality");
    });
    return matches.length
      ? `Restaurant and hospitality contacts you have not talked to recently: ${matches
          .sort((left, right) => (left.lastContactedAt ?? "").localeCompare(right.lastContactedAt ?? ""))
          .slice(0, 5)
          .map((contact) => `${fullName(contact)} (${relativeTimeFromDate(contact.lastContactedAt)})`)
          .join(", ")}.`
      : "I did not find obvious restaurant-owner tags in the current data set.";
  }

  if (lower.includes("nashville") || lower.includes("introduce")) {
    const matches = contacts.filter((contact) => locationLine(contact).toLowerCase().includes("nashville"));
    return matches.length
      ? `People who may help with a Nashville intro: ${matches
          .slice(0, 5)
          .map((contact) => `${fullName(contact)} at ${contact.company || "independent"}`)
          .join(", ")}.`
      : "No Nashville-based contacts are obvious from the saved location data.";
  }

  return `Network snapshot: ${contacts.length} contacts total, ${overdue.length} overdue follow-ups, and most recently touched contacts include ${recent
    .slice(0, 3)
    .map((contact) => fullName(contact))
    .join(", ") || "none yet"}.`;
}

function ViewTabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2.5 text-sm transition",
        active ? "border-sky-400/40 bg-sky-500/15 text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

function HomeMetricCard({
  title,
  value,
  detail,
  children,
}: {
  title: string;
  value: React.ReactNode;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <GlassCard className="rounded-[28px] p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-4 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </GlassCard>
  );
}

function ContactGridCard({
  contact,
  onSelect,
}: {
  contact: RolodexContact;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex h-full flex-col rounded-[28px] border border-white/10 bg-white/[0.03] p-6 text-left transition hover:border-sky-400/40 hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-white/10 text-base font-semibold text-white"
            style={{ backgroundColor: `${relationshipDot[contact.relationshipType]}22` }}
          >
            {initials(contact)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{fullName(contact)}</p>
            <p className="mt-1 truncate text-sm text-slate-300">{titleLine(contact)}</p>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
          {RELATIONSHIP_TYPE_LABELS[contact.relationshipType]}
        </span>
      </div>

      <div className="mt-6 space-y-3 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{locationLine(contact) || "No location set"}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Last contacted</span>
          <span className="text-slate-200">{relativeTimeFromDate(contact.lastContactedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>Quick actions</span>
          <div className="flex items-center gap-2 text-slate-300">
            {contact.phone ? <Phone className="h-4 w-4" /> : null}
            {contact.email ? <Mail className="h-4 w-4" /> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,_#38bdf8,_#22c55e)] transition-all duration-200"
          style={{ width: `${Math.max(8, contact.relationshipScore)}%` }}
        />
      </div>
    </button>
  );
}

export default function RolodexPage() {
  const [contacts, setContacts] = useState<RolodexContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>("home");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectedSmartGroup, setSelectedSmartGroup] = useState<{ key: SmartGroupKey; value?: string } | null>(null);
  const [smartGroupsOpen, setSmartGroupsOpen] = useState(true);
  const [sort, setSort] = useState<SortMode>("recently-contacted");
  const [browserMode, setBrowserMode] = useState<BrowserMode>("grid");
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
  const [homeAiPrompt, setHomeAiPrompt] = useState("");
  const [homeAiHistory, setHomeAiHistory] = useState<AiMessage[]>([]);
  const [homeAiExpanded, setHomeAiExpanded] = useState(true);
  const [homeHistoryOpen, setHomeHistoryOpen] = useState(false);
  const [quickActionLogOpen, setQuickActionLogOpen] = useState(false);
  const [quickActionContactId, setQuickActionContactId] = useState("");
  const [quickActionDraft, setQuickActionDraft] = useState<QuickLogDraft>({ ...EMPTY_QUICK_LOG, type: "call" });
  const [pipelineImportOpen, setPipelineImportOpen] = useState(false);
  const [pipelineImportDeals, setPipelineImportDeals] = useState<PipelineDeal[]>([]);
  const [pipelineImportSelectedIds, setPipelineImportSelectedIds] = useState<string[]>([]);
  const [pipelineImportLoading, setPipelineImportLoading] = useState(false);
  const [pipelineImportSubmitting, setPipelineImportSubmitting] = useState(false);
  const [pipelineImportResult, setPipelineImportResult] = useState<PipelineImportResult | null>(null);
  const [selectedTimelineInteractionId, setSelectedTimelineInteractionId] = useState<string | null>(null);
  const [timelineDetailEditing, setTimelineDetailEditing] = useState(false);
  const [timelineDetailDraft, setTimelineDetailDraft] = useState<Pick<QuickLogDraft, "summary" | "details" | "sentiment">>({
    summary: "",
    details: "",
    sentiment: "",
  });
  const deferredSearch = useDeferredValue(search);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const contactsSearchRef = useRef<HTMLInputElement | null>(null);
  const shouldFocusContactsSearchRef = useRef(false);
  const existingContactEmails = useMemo(
    () => new Set(contacts.map((contact) => contact.email?.trim().toLowerCase()).filter((email): email is string => Boolean(email))),
    [contacts],
  );

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
    const applyHash = () => {
      const next = parseHashState(window.location.hash);
      setCurrentView(next.view);
      if (next.selectedContactId) {
        setSelectedContactId(next.selectedContactId);
        setActiveTab("overview");
        setVisibleTimelineCount(12);
      }
    };

    if (!window.location.hash) {
      window.location.hash = "#home";
    } else {
      applyHash();
    }

    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
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

  useEffect(() => {
    if (!contacts.length) return;
    if (currentView === "detail" && !contacts.some((contact) => contact.id === selectedContactId)) {
      const fallbackId = contacts[0]?.id;
      if (fallbackId) {
        setSelectedContactId(fallbackId);
        window.location.hash = buildHash("detail", fallbackId);
      } else {
        setCurrentView("home");
        window.location.hash = "#home";
      }
    }
  }, [contacts, currentView, selectedContactId]);

  useEffect(() => {
    if (currentView !== "contacts" || !shouldFocusContactsSearchRef.current) return;
    contactsSearchRef.current?.focus();
    contactsSearchRef.current?.select();
    shouldFocusContactsSearchRef.current = false;
  }, [currentView]);

  const monthStart = useMemo(() => startOfMonth(), []);

  const smartGroups = useMemo(() => {
    const cityEntries = Array.from(
      contacts.reduce<Map<string, number>>((accumulator, contact) => {
        const city = contact.city?.trim();
        if (!city) return accumulator;
        accumulator.set(city, (accumulator.get(city) ?? 0) + 1);
        return accumulator;
      }, new Map()),
    )
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([city, count]) => ({
        id: `city:${city}`,
        key: "city" as const,
        value: city,
        label: `${city} (${count})`,
        count,
      }));

    const stale30Count = contacts.filter((contact) => (daysSinceDate(contact.lastContactedAt) ?? Number.POSITIVE_INFINITY) >= 30).length;
    const newThisMonthCount = contacts.filter((contact) => {
      const createdAt = Date.parse(contact.createdAt);
      return !Number.isNaN(createdAt) && createdAt >= monthStart.getTime();
    }).length;
    const hasPhoneCount = contacts.filter((contact) => Boolean(contact.phone?.trim() || contact.secondaryPhone?.trim())).length;

    return [
      ...cityEntries,
      {
        id: "stale-30",
        key: "stale-30" as const,
        label: `Haven't Talked To in 30+ Days (${stale30Count})`,
        count: stale30Count,
      },
      {
        id: "top-score",
        key: "top-score" as const,
        label: `Top 10 by Score (${Math.min(10, contacts.length)})`,
        count: Math.min(10, contacts.length),
      },
      {
        id: "new-this-month",
        key: "new-this-month" as const,
        label: `New This Month (${newThisMonthCount})`,
        count: newThisMonthCount,
      },
      {
        id: "has-phone",
        key: "has-phone" as const,
        label: `Has Phone Number (${hasPhoneCount})`,
        count: hasPhoneCount,
      },
    ];
  }, [contacts, monthStart]);

  const filteredContacts = useMemo(() => {
    return [...contacts]
      .filter((contact) => {
        if (filter !== "all" && contact.relationshipType !== filter) return false;
        if (selectedSmartGroup?.key === "city" && contact.city?.trim() !== selectedSmartGroup.value) return false;
        if (selectedSmartGroup?.key === "stale-30" && (daysSinceDate(contact.lastContactedAt) ?? Number.POSITIVE_INFINITY) < 30) return false;
        if (selectedSmartGroup?.key === "new-this-month") {
          const createdAt = Date.parse(contact.createdAt);
          if (Number.isNaN(createdAt) || createdAt < monthStart.getTime()) return false;
        }
        if (selectedSmartGroup?.key === "has-phone" && !(contact.phone?.trim() || contact.secondaryPhone?.trim())) return false;
        if (!deferredSearch.trim()) return true;
        return contactSearchIndex(contact).includes(deferredSearch.trim().toLowerCase());
      })
      .sort((left, right) => {
        if (selectedSmartGroup?.key === "top-score") return right.relationshipScore - left.relationshipScore;
        if (sort === "alphabetical") return fullName(left).localeCompare(fullName(right));
        if (sort === "relationship-score") return right.relationshipScore - left.relationshipScore;
        if (sort === "newest") return Date.parse(right.createdAt) - Date.parse(left.createdAt);
        return (right.lastContactedAt ?? "").localeCompare(left.lastContactedAt ?? "");
      })
      .slice(0, selectedSmartGroup?.key === "top-score" ? 10 : undefined);
  }, [contacts, deferredSearch, filter, monthStart, selectedSmartGroup, sort]);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedContactId) ?? filteredContacts[0] ?? null,
    [contacts, filteredContacts, selectedContactId],
  );

  const overdueContacts = useMemo(
    () =>
      [...contacts]
        .filter((contact) => contact.nextFollowUp && contact.nextFollowUp <= easternToday())
        .sort((left, right) => (left.nextFollowUp ?? "").localeCompare(right.nextFollowUp ?? "")),
    [contacts],
  );

  const newThisWeekCount = useMemo(() => {
    const weekStart = new Date(`${easternToday()}T12:00:00.000Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);
    return contacts.filter((contact) => Date.parse(contact.createdAt) >= weekStart.getTime()).length;
  }, [contacts]);

  const thisWeekActivityCount = useMemo(() => {
    const weekStart = new Date(`${easternToday()}T12:00:00.000Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);
    return contacts.reduce(
      (count, contact) =>
        count +
        contact.interactions.filter((interaction) => {
          const parsed = Date.parse(interaction.createdAt);
          return !Number.isNaN(parsed) && parsed >= weekStart.getTime();
        }).length,
      0,
    );
  }, [contacts]);

  const averageRelationshipScore = useMemo(() => {
    if (!contacts.length) return 0;
    return Math.round(contacts.reduce((sum, contact) => sum + contact.relationshipScore, 0) / contacts.length);
  }, [contacts]);

  const typeBreakdown = useMemo(() => topContactTypes(contacts), [contacts]);

  const recentActivity = useMemo(
    () =>
      contacts
        .flatMap((contact) =>
          contact.interactions.map((interaction) => ({
            interaction,
            contact,
          })),
        )
        .sort((left, right) => Date.parse(right.interaction.createdAt) - Date.parse(left.interaction.createdAt))
        .slice(0, 10),
    [contacts],
  );

  const recommendedNextSteps = useMemo(() => {
    const now = new Date(`${easternToday()}T12:00:00.000Z`).getTime();

    const items = contacts.flatMap((contact) => {
      const output: Array<{ id: string; contactId: string; title: string; body: string; priority: number; icon: React.ReactNode }> = [];

      if (contact.nextFollowUp) {
        const followUpTime = new Date(`${contact.nextFollowUp}T12:00:00.000Z`).getTime();
        if (!Number.isNaN(followUpTime) && followUpTime <= now) {
          output.push({
            id: `${contact.id}-followup`,
            contactId: contact.id,
            title: `Follow up with ${fullName(contact)}`,
            body: `${contact.nextFollowUp === easternToday() ? "Due today" : `Reminder overdue since ${formatDate(contact.nextFollowUp)}`}. Last contacted ${relativeTimeFromDate(contact.lastContactedAt)}.`,
            priority: 100 - Math.min(90, Math.max(0, Math.floor((now - followUpTime) / 86400000))),
            icon: <Mail className="h-4 w-4 text-sky-300" />,
          });
        }
      }

      if (contact.birthday) {
        const currentYear = new Date().getUTCFullYear();
        const upcoming = new Date(`${currentYear}-${contact.birthday.slice(5)}T12:00:00.000Z`);
        if (!Number.isNaN(upcoming.getTime())) {
          const diffDays = Math.ceil((upcoming.getTime() - now) / 86400000);
          if (diffDays >= 0 && diffDays <= 14) {
            output.push({
              id: `${contact.id}-birthday`,
              contactId: contact.id,
              title: `${fullName(contact)}'s birthday is coming up`,
              body: `${formatDate(upcoming.toISOString().slice(0, 10))} is ${diffDays === 0 ? "today" : `in ${diffDays} day${diffDays === 1 ? "" : "s"}`}.`,
              priority: 70 - diffDays,
              icon: <Gift className="h-4 w-4 text-amber-300" />,
            });
          }
        }
      }

      const latest = contact.interactions[0];
      if (latest && latest.type === "meeting") {
        const interactionTime = new Date(`${latest.date}T12:00:00.000Z`).getTime();
        const diffDays = Math.abs(Math.round((interactionTime - now) / 86400000));
        if (diffDays <= 1) {
          output.push({
            id: `${contact.id}-meeting`,
            contactId: contact.id,
            title: `Meeting touchpoint for ${fullName(contact)}`,
            body: `${latest.summary} ${diffDays === 0 ? "is today" : "was logged yesterday"}.`,
            priority: 65,
            icon: <Calendar className="h-4 w-4 text-emerald-300" />,
          });
        }
      }

      const lastTouchedDays =
        contact.lastContactedAt && !Number.isNaN(Date.parse(`${contact.lastContactedAt}T12:00:00.000Z`))
          ? Math.floor((now - Date.parse(`${contact.lastContactedAt}T12:00:00.000Z`)) / 86400000)
          : null;
      if (lastTouchedDays !== null && lastTouchedDays >= 14 && !contact.nextFollowUp) {
        output.push({
          id: `${contact.id}-stale`,
          contactId: contact.id,
          title: `Call ${fullName(contact)}`,
          body: `Last contacted ${lastTouchedDays} days ago. Relationship score is ${contact.relationshipScore}.`,
          priority: Math.min(60, lastTouchedDays),
          icon: <Phone className="h-4 w-4 text-sky-300" />,
        });
      }

      return output;
    });

    return items.sort((left, right) => right.priority - left.priority).slice(0, 6);
  }, [contacts]);

  const aiConversation = selectedContact ? aiHistory[selectedContact.id] ?? [] : [];

  const timelineItems = useMemo(() => {
    if (!selectedContact) return [];
    return selectedContact.interactions.filter((entry) => timelineFilter === "all" || entry.type === timelineFilter);
  }, [selectedContact, timelineFilter]);

  const visibleTimeline = useMemo(() => timelineItems.slice(0, visibleTimelineCount), [timelineItems, visibleTimelineCount]);

  const selectedTimelineInteraction = useMemo(() => {
    if (!selectedContact || !selectedTimelineInteractionId) return null;
    return selectedContact.interactions.find((entry) => entry.id === selectedTimelineInteractionId) ?? null;
  }, [selectedContact, selectedTimelineInteractionId]);

  useEffect(() => {
    if (!selectedTimelineInteractionId) return;
    if (selectedTimelineInteraction) return;
    setSelectedTimelineInteractionId(null);
    setTimelineDetailEditing(false);
  }, [selectedTimelineInteraction, selectedTimelineInteractionId]);

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

  const weekStart = useMemo(() => startOfWeek(), []);
  const nextWeekStart = useMemo(() => shiftWeeks(weekStart, 1), [weekStart]);
  const lastWeekStart = useMemo(() => shiftWeeks(weekStart, -1), [weekStart]);

  const contactsAddedThisWeek = useMemo(
    () =>
      contacts.filter((contact) => {
        const createdAt = Date.parse(contact.createdAt);
        return !Number.isNaN(createdAt) && createdAt >= weekStart.getTime() && createdAt < nextWeekStart.getTime();
      }),
    [contacts, nextWeekStart, weekStart],
  );

  const contactsAddedLastWeek = useMemo(
    () =>
      contacts.filter((contact) => {
        const createdAt = Date.parse(contact.createdAt);
        return !Number.isNaN(createdAt) && createdAt >= lastWeekStart.getTime() && createdAt < weekStart.getTime();
      }),
    [contacts, lastWeekStart, weekStart],
  );

  const thisWeekInteractions = useMemo(
    () =>
      contacts.flatMap((contact) =>
        contact.interactions
          .filter((interaction) => {
            const createdAt = Date.parse(interaction.createdAt);
            return !Number.isNaN(createdAt) && createdAt >= weekStart.getTime() && createdAt < nextWeekStart.getTime();
          })
          .map((interaction) => ({ interaction, contact })),
      ),
    [contacts, nextWeekStart, weekStart],
  );

  const lastWeekInteractions = useMemo(
    () =>
      contacts.flatMap((contact) =>
        contact.interactions
          .filter((interaction) => {
            const createdAt = Date.parse(interaction.createdAt);
            return !Number.isNaN(createdAt) && createdAt >= lastWeekStart.getTime() && createdAt < weekStart.getTime();
          })
          .map((interaction) => ({ interaction, contact })),
      ),
    [contacts, lastWeekStart, weekStart],
  );

  const weeklyFollowUpsCompleted = useMemo(
    () =>
      contacts.filter((contact) => {
        const hasReminder = Boolean(contact.stayInTouch || contact.nextFollowUp);
        const touchedThisWeek = contact.interactions.some((interaction) => {
          const createdAt = Date.parse(interaction.createdAt);
          return !Number.isNaN(createdAt) && createdAt >= weekStart.getTime() && createdAt < nextWeekStart.getTime();
        });
        return hasReminder && touchedThisWeek;
      }).length,
    [contacts, nextWeekStart, weekStart],
  );

  const lastWeekFollowUpsCompleted = useMemo(
    () =>
      contacts.filter((contact) => {
        const hasReminder = Boolean(contact.stayInTouch || contact.nextFollowUp);
        const touchedLastWeek = contact.interactions.some((interaction) => {
          const createdAt = Date.parse(interaction.createdAt);
          return !Number.isNaN(createdAt) && createdAt >= lastWeekStart.getTime() && createdAt < weekStart.getTime();
        });
        return hasReminder && touchedLastWeek;
      }).length,
    [contacts, lastWeekStart, weekStart],
  );

  const networkGrowth = useMemo(() => {
    const firstWeek = shiftWeeks(weekStart, -7);
    return Array.from({ length: 8 }, (_, index) => {
      const bucketStart = shiftWeeks(firstWeek, index);
      const bucketEnd = shiftWeeks(bucketStart, 1);
      const count = contacts.filter((contact) => {
        const createdAt = Date.parse(contact.createdAt);
        return !Number.isNaN(createdAt) && createdAt >= bucketStart.getTime() && createdAt < bucketEnd.getTime();
      }).length;
      return {
        label: weekLabel(bucketStart),
        count,
      };
    });
  }, [contacts, weekStart]);

  const upcomingBirthdays = useMemo(
    () =>
      contacts
        .map((contact) => {
          const nextBirthday = nextBirthdayOccurrence(contact.birthday);
          if (!nextBirthday) return null;
          const daysAway = Math.ceil((nextBirthday.getTime() - easternTodayDate().getTime()) / 86400000);
          if (daysAway < 0 || daysAway > 14) return null;
          return {
            contact,
            date: nextBirthday.toISOString().slice(0, 10),
            daysAway,
          };
        })
        .filter((entry): entry is { contact: RolodexContact; date: string; daysAway: number } => entry !== null)
        .sort((left, right) => left.daysAway - right.daysAway),
    [contacts],
  );

  const scoreDroppedContacts = useMemo(
    () =>
      contacts
        .filter((contact) => {
          const recentNegative = contact.interactions.some((interaction) => {
            const days = daysSinceDate(interaction.date);
            return days !== null && days <= 21 && interaction.sentiment === "negative";
          });
          return recentNegative || (contact.relationshipScore < 45 && (daysSinceDate(contact.lastContactedAt) ?? 999) > 21);
        })
        .sort((left, right) => left.relationshipScore - right.relationshipScore)
        .slice(0, 3),
    [contacts],
  );

  const todayCallOrMeetingContacts = useMemo(
    () =>
      contacts
        .flatMap((contact) =>
          contact.interactions
            .filter((interaction) => interaction.date === easternToday() && (interaction.type === "call" || interaction.type === "meeting"))
            .map((interaction) => ({ contact, interaction })),
        )
        .slice(0, 4),
    [contacts],
  );

  const dailyBriefing = useMemo(() => {
    const sentences: string[] = [`${greetingForHour()}, Jahan.`];

    if (todayCallOrMeetingContacts.length) {
      sentences.push(
        `Today includes ${todayCallOrMeetingContacts
          .map(({ contact, interaction }) => `${interaction.type === "meeting" ? "a meeting with" : "a call with"} ${fullName(contact)}`)
          .join(", ")}.`,
      );
    } else {
      sentences.push("There are no calls or meetings logged for today yet.");
    }

    if (overdueContacts.length) {
      sentences.push(
        `The most overdue follow-ups are ${overdueContacts
          .slice(0, 3)
          .map((contact) => `${fullName(contact)} (${contact.nextFollowUp ? formatDate(contact.nextFollowUp) : relativeTimeFromDate(contact.lastContactedAt)})`)
          .join(", ")}.`,
      );
    }

    if (scoreDroppedContacts.length) {
      sentences.push(`Relationship momentum slipped for ${scoreDroppedContacts.map((contact) => fullName(contact)).join(", ")}.`);
    }

    if (contactsAddedThisWeek.length) {
      sentences.push(
        `You added ${contactsAddedThisWeek.length} new contact${contactsAddedThisWeek.length === 1 ? "" : "s"} this week, including ${contactsAddedThisWeek
          .slice(0, 3)
          .map((contact) => fullName(contact))
          .join(", ")}.`,
      );
    }

    if (upcomingBirthdays.length) {
      sentences.push(
        `Upcoming birthdays in the next two weeks: ${upcomingBirthdays
          .slice(0, 3)
          .map(({ contact, date }) => `${fullName(contact)} on ${formatDate(date)}`)
          .join(", ")}.`,
      );
    }

    return sentences.join(" ");
  }, [contactsAddedThisWeek, overdueContacts, scoreDroppedContacts, todayCallOrMeetingContacts, upcomingBirthdays]);

  const goingColdContacts = useMemo(
    () =>
      contacts
        .map((contact) => {
          const daysSince = daysSinceDate(contact.lastContactedAt);
          const reminderDays = reminderFrequencyDays(contact.stayInTouch);
          const coldByReminder =
            reminderDays !== undefined &&
            daysSince !== null &&
            daysSince > reminderDays * 2 &&
            (!contact.stayInTouch?.snoozedUntil || contact.stayInTouch.snoozedUntil <= easternToday());
          const coldByScore = contact.relationshipScore < 30 && contact.interactions.length > 0;
          if (!coldByReminder && !coldByScore) return null;
          return {
            contact,
            daysSince: daysSince ?? 0,
            trend: interactionTrendArrow(contact.interactions),
            priority: Math.max(daysSince ?? 0, contact.relationshipScore <= 30 ? 60 - contact.relationshipScore : 0),
          };
        })
        .filter((entry): entry is { contact: RolodexContact; daysSince: number; trend: string; priority: number } => entry !== null)
        .sort((left, right) => right.priority - left.priority)
        .slice(0, 5),
    [contacts],
  );

  const upcomingEvents = useMemo(() => {
    const today = easternTodayDate().getTime();
    const nextFollowUps = contacts
      .filter((contact) => contact.nextFollowUp)
      .map((contact) => {
        const parsed = new Date(`${contact.nextFollowUp}T12:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) return null;
        const daysAway = Math.ceil((parsed.getTime() - today) / 86400000);
        if (daysAway < 0 || daysAway > 7) return null;
        return {
          id: `${contact.id}-followup`,
          contact,
          icon: "📅",
          date: contact.nextFollowUp!,
          daysAway,
        };
      })
      .filter((entry): entry is { id: string; contact: RolodexContact; icon: string; date: string; daysAway: number } => entry !== null);

    const birthdays = upcomingBirthdays.map(({ contact, date, daysAway }) => ({
      id: `${contact.id}-birthday`,
      contact,
      icon: "🎂",
      date,
      daysAway,
    }));

    return [...birthdays, ...nextFollowUps].sort((left, right) => left.daysAway - right.daysAway).slice(0, 5);
  }, [contacts, upcomingBirthdays]);

  const networkMapContacts = useMemo(() => {
    const ranked = [...contacts]
      .sort((left, right) => {
        const interactionDelta = right.interactions.length - left.interactions.length;
        if (interactionDelta !== 0) return interactionDelta;
        return right.relationshipScore - left.relationshipScore;
      })
      .slice(0, 20);

    const maxInteractions = Math.max(1, ...ranked.map((contact) => contact.interactions.length));
    return ranked.map((contact, index) => ({
      contact,
      diameter: bubbleDiameter(contact.interactions.length, maxInteractions),
      position: networkMapPosition(index),
    }));
  }, [contacts]);

  function navigateTo(view: ViewMode, contactId?: string | null) {
    const hash = buildHash(view, contactId);
    setCurrentView(view);
    if (contactId) setSelectedContactId(contactId);
    if (view !== "detail") setMenuOpen(false);
    if (window.location.hash === hash) return;
    window.location.hash = hash;
  }

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
    if (!selectedContact || !quickLog) return;
    await createInteractionForContact(selectedContact.id, quickLog);
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

  async function createInteractionForContact(contactId: string, draft: QuickLogDraft) {
    if (!draft.summary.trim()) return;

    const interaction: Interaction = {
      id: `ri_local_${Date.now().toString(36)}`,
      type: draft.type,
      date: easternToday(),
      summary: draft.summary.trim(),
      details: draft.details.trim() || undefined,
      sentiment: draft.sentiment || undefined,
      createdAt: new Date().toISOString(),
    };

    await optimisticContactMutation(
      contactId,
      (current) => ({
        ...current,
        interactions: [interaction, ...current.interactions].sort((left, right) => right.date.localeCompare(left.date)),
        lastContactedAt: interaction.date,
      }),
      () =>
        fetch(`/api/rolodex/${contactId}/interactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: draft.type,
            date: easternToday(),
            summary: draft.summary,
            details: draft.details,
            sentiment: draft.sentiment || undefined,
          }),
        }),
    );
  }

  async function updateInteraction(interactionId: string, patch: Pick<QuickLogDraft, "summary" | "details" | "sentiment">) {
    if (!selectedContact) return;

    await optimisticContactMutation(
      selectedContact.id,
      (current) => ({
        ...current,
        interactions: current.interactions.map((entry) =>
          entry.id === interactionId
            ? {
                ...entry,
                summary: patch.summary.trim(),
                details: patch.details.trim() || undefined,
                sentiment: patch.sentiment || undefined,
              }
            : entry,
        ),
      }),
      () =>
        fetch(`/api/rolodex/${selectedContact.id}/interactions/${interactionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: patch.summary,
            details: patch.details,
            sentiment: patch.sentiment || undefined,
          }),
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
    navigateTo("detail", created.id);
  }

  async function importFromPipeline() {
    setErrorMessage(null);
    setPipelineImportResult(null);
    setPipelineImportOpen(true);
    setPipelineImportLoading(true);

    try {
      const response = await fetch("/api/pipeline", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load pipeline deals.");
      const deals = (await response.json()) as PipelineDeal[];
      setPipelineImportDeals(deals);
      setPipelineImportSelectedIds(deals.map((deal) => deal.id));
    } catch (error) {
      setPipelineImportOpen(false);
      setErrorMessage(error instanceof Error ? error.message : "Unable to import contacts from pipeline.");
    } finally {
      setPipelineImportLoading(false);
    }
  }

  function togglePipelineImportDeal(dealId: string) {
    setPipelineImportSelectedIds((current) => (current.includes(dealId) ? current.filter((id) => id !== dealId) : [...current, dealId]));
  }

  function toggleAllPipelineImportDeals() {
    setPipelineImportSelectedIds((current) => (current.length === pipelineImportDeals.length ? [] : pipelineImportDeals.map((deal) => deal.id)));
  }

  async function submitPipelineImport() {
    setErrorMessage(null);
    setPipelineImportSubmitting(true);

    try {
      let imported = 0;
      let skipped = 0;
      const selectedDeals = pipelineImportDeals.filter((deal) => pipelineImportSelectedIds.includes(deal.id));
      const seenEmails = new Set(existingContactEmails);

      for (const deal of selectedDeals) {
        const normalizedEmail = deal.email.trim().toLowerCase();
        if (normalizedEmail && seenEmails.has(normalizedEmail)) {
          skipped += 1;
          continue;
        }

        const response = await fetch("/api/rolodex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: deal.name,
            lastName: "",
            email: deal.email || undefined,
            phone: deal.enrichmentData?.phone,
            company: deal.client || undefined,
            website: deal.website ?? deal.enrichmentData?.website,
            city: deal.city,
            state: deal.state,
            howWeMet: deal.source || undefined,
            personalNotes: deal.notes || undefined,
            tags: deal.tags,
            pipelineDealId: deal.id,
          }),
        });

        if (!response.ok) throw new Error("Unable to import contacts from pipeline.");

        imported += 1;
        if (normalizedEmail) seenEmails.add(normalizedEmail);
      }

      await fetchContacts();
      setPipelineImportResult({ imported, skipped });
      setPipelineImportOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to import contacts from pipeline.");
    } finally {
      setPipelineImportSubmitting(false);
    }
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
    navigateTo("detail", id);
  }

  function submitHomeAi(promptValue: string) {
    if (!promptValue.trim()) return;
    const now = new Date().toISOString();
    setHomeAiHistory((state) => [
      ...state,
      {
        id: `${now}-user`,
        role: "user",
        content: promptValue.trim(),
        createdAt: now,
      },
      {
        id: `${now}-assistant`,
        role: "assistant",
        content: buildNetworkAnswer(promptValue.trim(), contacts),
        createdAt: now,
      },
    ]);
    setHomeAiPrompt("");
    setHomeAiExpanded(true);
  }

  function openSearchContacts() {
    shouldFocusContactsSearchRef.current = true;
    navigateTo("contacts");
  }

  function applySmartGroup(group: { key: SmartGroupKey; value?: string }) {
    setFilter("all");
    setSelectedSmartGroup((current) =>
      current?.key === group.key && current?.value === group.value ? null : { key: group.key, value: group.value },
    );
  }

  function openQuickActionLog() {
    setQuickActionContactId(selectedContact?.id ?? "");
    setQuickActionDraft({ ...EMPTY_QUICK_LOG, type: "call" });
    setQuickActionLogOpen(true);
  }

  function openTimelineInteraction(interaction: Interaction) {
    setSelectedTimelineInteractionId(interaction.id);
    setTimelineDetailEditing(false);
    setTimelineDetailDraft({
      summary: interaction.summary,
      details: interaction.details ?? "",
      sentiment: interaction.sentiment ?? "",
    });
  }

  function closeTimelineInteraction() {
    setSelectedTimelineInteractionId(null);
    setTimelineDetailEditing(false);
  }

  async function submitQuickActionLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickActionContactId) {
      setErrorMessage("Select a contact before logging a call.");
      return;
    }
    await createInteractionForContact(quickActionContactId, quickActionDraft);
    setQuickActionLogOpen(false);
    setQuickActionDraft({ ...EMPTY_QUICK_LOG, type: "call" });
    navigateTo("detail", quickActionContactId);
  }

  async function saveTimelineInteractionChanges() {
    if (!selectedTimelineInteraction || !timelineDetailDraft.summary.trim()) return;
    await updateInteraction(selectedTimelineInteraction.id, timelineDetailDraft);
    setTimelineDetailEditing(false);
  }

  async function deleteTimelineInteraction() {
    if (!selectedTimelineInteraction) return;
    if (!window.confirm("Delete this interaction?")) return;
    await deleteInteraction(selectedTimelineInteraction.id);
    closeTimelineInteraction();
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
      <ImportPipelineModal
        open={pipelineImportOpen}
        deals={pipelineImportDeals}
        selectedDealIds={pipelineImportSelectedIds}
        loading={pipelineImportLoading}
        submitting={pipelineImportSubmitting}
        existingEmails={existingContactEmails}
        onToggleDeal={togglePipelineImportDeal}
        onToggleAll={toggleAllPipelineImportDeals}
        onClose={() => {
          if (pipelineImportSubmitting) return;
          setPipelineImportOpen(false);
        }}
        onSubmit={() => void submitPipelineImport()}
      />
      <QuickActionLogModal
        open={quickActionLogOpen}
        contacts={contacts}
        selectedContactId={quickActionContactId}
        draft={quickActionDraft}
        onContactChange={setQuickActionContactId}
        onDraftChange={(patch) => setQuickActionDraft((state) => ({ ...state, ...patch }))}
        onClose={() => setQuickActionLogOpen(false)}
        onSubmit={submitQuickActionLog}
      />
      <InteractionDetailModal
        open={Boolean(selectedTimelineInteraction)}
        interaction={selectedTimelineInteraction}
        editing={timelineDetailEditing}
        draft={timelineDetailDraft}
        onDraftChange={(patch) => setTimelineDetailDraft((state) => ({ ...state, ...patch }))}
        onStartEdit={() => {
          if (!selectedTimelineInteraction) return;
          setTimelineDetailDraft({
            summary: selectedTimelineInteraction.summary,
            details: selectedTimelineInteraction.details ?? "",
            sentiment: selectedTimelineInteraction.sentiment ?? "",
          });
          setTimelineDetailEditing(true);
        }}
        onCancelEdit={() => {
          if (!selectedTimelineInteraction) return;
          setTimelineDetailDraft({
            summary: selectedTimelineInteraction.summary,
            details: selectedTimelineInteraction.details ?? "",
            sentiment: selectedTimelineInteraction.sentiment ?? "",
          });
          setTimelineDetailEditing(false);
        }}
        onSave={saveTimelineInteractionChanges}
        onDelete={deleteTimelineInteraction}
        onClose={closeTimelineInteraction}
      />

      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Rolodex</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ViewTabButton label="Home" active={currentView === "home"} onClick={() => navigateTo("home")} />
                <ViewTabButton label="Contacts" active={currentView === "contacts"} onClick={() => navigateTo("contacts")} />
                {selectedContact ? (
                  <ViewTabButton
                    label={fullName(selectedContact)}
                    active={currentView === "detail"}
                    onClick={() => navigateTo("detail", selectedContact.id)}
                  />
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fetchContacts().catch(() => setErrorMessage("Unable to refresh contacts."))}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </span>
              </button>
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
              <SavePill status={saveState} lastSyncedLabel={detailSyncLabel} />
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{errorMessage}</div>
        ) : null}
        {pipelineImportResult ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Imported {pipelineImportResult.imported} contact{pipelineImportResult.imported === 1 ? "" : "s"} and skipped {pipelineImportResult.skipped}.
          </div>
        ) : null}

        {currentView === "home" ? (
          <main className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-xl">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_420px]">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-500">{easternDateFormatter.format(new Date())}</p>
                  <h1 className="mt-3 text-4xl font-semibold text-white sm:text-5xl">
                    {greetingForHour()}, Jahan
                  </h1>
                  <p className="mt-4 max-w-3xl text-lg text-slate-300">
                    You have {contacts.length} contacts, {overdueContacts.length} need follow-up, and {newThisWeekCount} are new this week.
                  </p>

                  <div className="mt-6 -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                    <button
                      type="button"
                      onClick={openQuickActionLog}
                      className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 transition hover:border-sky-400/40 hover:text-white"
                    >
                      📞 Log a Call
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddContactOpen(true)}
                      className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 transition hover:border-sky-400/40 hover:text-white"
                    >
                      ➕ Add Contact
                    </button>
                    <button
                      type="button"
                      onClick={importFromPipeline}
                      className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 transition hover:border-sky-400/40 hover:text-white"
                    >
                      📥 Import Pipeline
                    </button>
                    <button
                      type="button"
                      onClick={openSearchContacts}
                      className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 transition hover:border-sky-400/40 hover:text-white"
                    >
                      🔍 Search Contacts
                    </button>
                  </div>

                  <GlassCard className="mt-6 rounded-[28px] border-l-4 border-l-sky-400 p-6">
                    <div>
                      {sectionTitle("📋 Daily Briefing")}
                      <p className="mt-3 text-sm leading-7 text-slate-200">{dailyBriefing}</p>
                    </div>
                  </GlassCard>

                  <GlassCard className="mt-8 rounded-[28px] p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {sectionTitle("AI Chat")}
                        <p className="mt-2 text-sm text-slate-400">Ask anything about your network.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHomeAiExpanded((state) => !state)}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300 transition hover:text-white"
                      >
                        {homeAiExpanded ? "Collapse response" : "Expand response"}
                      </button>
                    </div>

                    <div className="mt-5 flex flex-col gap-3">
                      <div className="flex gap-3">
                        <input
                          value={homeAiPrompt}
                          onChange={(event) => setHomeAiPrompt(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              submitHomeAi(homeAiPrompt);
                            }
                          }}
                          placeholder="Ask anything about your network..."
                          className="flex-1 rounded-[22px] border border-white/10 bg-slate-950/70 px-5 py-4 text-sm text-white outline-none transition focus:border-sky-400/60"
                        />
                        <button
                          type="button"
                          onClick={() => submitHomeAi(homeAiPrompt)}
                          className="rounded-[22px] bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-5 py-4 text-sm font-medium text-white transition hover:brightness-110"
                        >
                          Ask
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {[
                          "Who should I follow up with this week?",
                          "Show me my strongest relationships",
                          "Which contacts are in Louisville?",
                          "Find me restaurant owners I haven't talked to",
                          "Who can introduce me to someone in Nashville?",
                        ].map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => submitHomeAi(prompt)}
                            className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-slate-300 transition hover:border-sky-400/40 hover:text-white"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {homeAiExpanded ? (
                      <div className="mt-6 space-y-3">
                        {homeAiHistory.slice(-2).map((entry) => (
                          <div
                            key={entry.id}
                            className={cn(
                              "rounded-2xl border p-4",
                              entry.role === "assistant" ? "border-sky-400/20 bg-sky-500/8" : "border-white/10 bg-white/[0.02]",
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {entry.role === "assistant" ? "AI Response" : "Prompt"}
                              </p>
                              <p className="text-xs text-slate-500">{formatRelativeDateTime(entry.createdAt)}</p>
                            </div>
                            <div className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{entry.content}</div>
                          </div>
                        ))}
                        {!homeAiHistory.length ? (
                          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                            No conversation yet.
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-5 border-t border-white/10 pt-5">
                      <button
                        type="button"
                        onClick={() => setHomeHistoryOpen((state) => !state)}
                        className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
                      >
                        <ChevronDown className={cn("h-4 w-4 transition", homeHistoryOpen ? "rotate-180" : "")} />
                        Conversation history
                      </button>
                      {homeHistoryOpen ? (
                        <div className="mt-4 space-y-3">
                          {homeAiHistory.map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-white">{entry.role === "assistant" ? "AI" : "You"}</span>
                                <span className="text-xs text-slate-500">{formatRelativeDateTime(entry.createdAt)}</span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap">{entry.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </GlassCard>
                </div>

                <div className="space-y-4">
                  <GlassCard className="rounded-[28px] p-6">
                    {sectionTitle("Recommended Next Steps")}
                    <div className="mt-5 space-y-3">
                      {recommendedNextSteps.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => jumpToContact(item.contactId)}
                          className="flex w-full items-start gap-3 rounded-[24px] border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-sky-400/40"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60">
                            {item.icon}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-white">{item.title}</span>
                            <span className="mt-1 block text-sm text-slate-400">{item.body}</span>
                          </span>
                        </button>
                      ))}
                      {!recommendedNextSteps.length ? <p className="text-sm text-slate-500">No urgent recommendations right now.</p> : null}
                    </div>
                  </GlassCard>

                  <GlassCard className="rounded-[28px] p-6">
                    {sectionTitle("Recent Activity")}
                    <div className="mt-5 space-y-3">
                      {recentActivity.map(({ interaction, contact }) => {
                        const Icon = interactionIcon(interaction.type);
                        return (
                          <button
                            key={interaction.id}
                            type="button"
                            onClick={() => jumpToContact(contact.id)}
                            className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-sky-400/40"
                          >
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60">
                              <Icon className="h-4 w-4 text-sky-300" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-white">
                                {fullName(contact)} - {interaction.summary}
                              </span>
                              <span className="mt-1 block text-xs text-slate-500">{formatRelativeDateTime(interaction.createdAt)}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </GlassCard>

                  <GlassCard className="rounded-[28px] p-6">
                    {sectionTitle("Upcoming Events")}
                    <div className="mt-5 space-y-3">
                      {upcomingEvents.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => jumpToContact(item.contact.id)}
                          className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-sky-400/40"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {item.icon} {fullName(item.contact)}
                            </p>
                            <p className="mt-1 truncate text-sm text-slate-400">{item.contact.company || titleLine(item.contact)}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm text-white">{formatDate(item.date)}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.daysAway === 0 ? "Today" : `In ${item.daysAway} day${item.daysAway === 1 ? "" : "s"}`}
                            </p>
                          </div>
                        </button>
                      ))}
                      {!upcomingEvents.length ? <p className="text-sm text-slate-500">No birthdays or scheduled follow-ups in the next few days.</p> : null}
                    </div>
                  </GlassCard>
                </div>
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-4">
              <HomeMetricCard title="Total Contacts" value={contacts.length} detail="Current network size across all relationship types.">
                <div className="space-y-3">
                  <div className="flex h-2 overflow-hidden rounded-full bg-slate-800">
                    {typeBreakdown.map((item) => (
                      <span key={item.type} style={{ width: item.width, backgroundColor: relationshipDot[item.type] }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    {typeBreakdown.map((item) => (
                      <span key={item.type} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-2.5 py-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: relationshipDot[item.type] }} />
                        {RELATIONSHIP_TYPE_LABELS[item.type]} {item.count}
                      </span>
                    ))}
                  </div>
                </div>
              </HomeMetricCard>
              <HomeMetricCard title="Needs Attention" value={overdueContacts.length} detail="Contacts with overdue follow-up dates." />
              <HomeMetricCard title="This Week's Activity" value={thisWeekActivityCount} detail="Interactions logged in the last 7 days." />
              <HomeMetricCard
                title="Avg Relationship Score"
                value={<span className={scoreTextTone(averageRelationshipScore)}>{averageRelationshipScore}</span>}
                detail="Average relationship strength across your rolodex."
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <GlassCard className="rounded-[28px] p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    {sectionTitle("Network Growth")}
                    <p className="mt-2 text-sm text-slate-400">
                      {networkGrowth[7]?.count ?? 0} contacts this week vs {networkGrowth[6]?.count ?? 0} last week.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex h-56 items-end gap-3">
                  {networkGrowth.map((entry, index) => {
                    const max = Math.max(1, ...networkGrowth.map((item) => item.count));
                    const height = `${Math.max(entry.count > 0 ? 16 : 8, (entry.count / max) * 100)}%`;
                    return (
                      <div key={`${entry.label}-${index}`} className="flex flex-1 flex-col items-center gap-3">
                        <div className="flex h-full w-full items-end">
                          <div
                            title={`${entry.count} contact${entry.count === 1 ? "" : "s"} added`}
                            className="w-full rounded-t-[18px] bg-[linear-gradient(180deg,_rgba(56,189,248,0.95),_rgba(37,99,235,0.45))] transition hover:brightness-110"
                            style={{ height }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">{entry.label}</span>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              <GlassCard className="rounded-[28px] p-6">
                {sectionTitle("Weekly Digest")}
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">New Contacts</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{contactsAddedThisWeek.length}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatTrendArrow(contactsAddedThisWeek.length - contactsAddedLastWeek.length)} vs last week
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Interactions</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{thisWeekInteractions.length}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatTrendArrow(thisWeekInteractions.length - lastWeekInteractions.length)} vs last week
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Follow-ups Closed</p>
                    <p className="mt-3 text-2xl font-semibold text-white">{weeklyFollowUpsCompleted}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {formatTrendArrow(weeklyFollowUpsCompleted - lastWeekFollowUpsCompleted)} vs last week
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400">
                  This week: {contactsAddedThisWeek.length} new contacts, {thisWeekInteractions.length} interactions logged, {weeklyFollowUpsCompleted} follow-ups completed.
                </p>
              </GlassCard>
            </section>

            <section>
              <GlassCard className="rounded-[28px] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {sectionTitle("Network Map")}
                    <p className="mt-2 text-sm text-slate-400">Top 20 contacts by interaction volume. Bubble size reflects activity and color reflects relationship type.</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
                    {networkMapContacts.length} shown
                  </div>
                </div>
                <div className="relative mt-6 h-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.12),_rgba(15,23,42,0.08)_42%,_rgba(2,6,23,0.55)_100%)]">
                  {networkMapContacts.map(({ contact, diameter, position }) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => jumpToContact(contact.id)}
                      title={`${fullName(contact)} · ${contact.interactions.length} interaction${contact.interactions.length === 1 ? "" : "s"}`}
                      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-center transition hover:z-10 hover:scale-105 hover:border-white/40"
                      style={{
                        left: `${position.left}%`,
                        top: `${position.top}%`,
                        width: diameter,
                        height: diameter,
                        backgroundColor: `${relationshipDot[contact.relationshipType]}33`,
                        borderColor: `${relationshipDot[contact.relationshipType]}66`,
                        boxShadow: `0 0 0 1px ${relationshipDot[contact.relationshipType]}22, 0 18px 40px rgba(2,6,23,0.35)`,
                      }}
                    >
                      <span
                        className="px-2 font-semibold text-white"
                        style={{ fontSize: diameter >= 88 ? 12 : diameter >= 64 ? 11 : 10, lineHeight: 1.1 }}
                      >
                        {initials(contact)}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                  {typeBreakdown.map((item) => (
                    <span key={item.type} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: relationshipDot[item.type] }} />
                      {RELATIONSHIP_TYPE_LABELS[item.type]}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </section>

            <section>
              <GlassCard className="rounded-[28px] p-6">
                {sectionTitle("🧊 Going Cold")}
                <div className="mt-5 space-y-3">
                  {goingColdContacts.map(({ contact, daysSince, trend }) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => jumpToContact(contact.id)}
                      className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-sky-400/40"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: relationshipDot[contact.relationshipType] }} />
                          <span className="truncate font-semibold text-white">{fullName(contact)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-400">{contact.company || "No company listed"}</p>
                        <p className="mt-2 text-sm text-slate-500">Last contacted {daysSince} day{daysSince === 1 ? "" : "s"} ago</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn("text-lg font-semibold", scoreTextTone(contact.relationshipScore))}>
                          {contact.relationshipScore} <span className="text-sm text-slate-400">{trend}</span>
                        </p>
                        <p className="text-xs text-slate-500">Score</p>
                      </div>
                    </button>
                  ))}
                  {!goingColdContacts.length ? <p className="text-sm text-slate-500">No relationships are showing cold-risk signals right now.</p> : null}
                </div>
              </GlassCard>
            </section>
          </main>
        ) : null}

        {currentView === "contacts" ? (
          <main className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-xl">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-center">
                  <label className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-4 h-4 w-4 text-slate-500" />
                    <input
                      ref={contactsSearchRef}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search name, company, email, tags, notes"
                      className="w-full rounded-[24px] border border-white/10 bg-slate-950/70 py-4 pl-11 pr-4 text-sm text-white outline-none transition focus:border-sky-400/60"
                    />
                  </label>
                  <label className="relative">
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as SortMode)}
                      className="appearance-none rounded-[24px] border border-white/10 bg-slate-950/70 px-4 py-4 pr-10 text-sm text-white outline-none transition focus:border-sky-400/60"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-4 h-4 w-4 text-slate-400" />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-[20px] border border-white/10 bg-white/[0.02] p-1">
                    <button
                      type="button"
                      onClick={() => setBrowserMode("grid")}
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm transition",
                        browserMode === "grid" ? "bg-sky-500/15 text-white" : "text-slate-400 hover:text-white",
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <GripHorizontal className="h-4 w-4" />
                        Grid
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBrowserMode("list")}
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm transition",
                        browserMode === "list" ? "bg-sky-500/15 text-white" : "text-slate-400 hover:text-white",
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        List
                      </span>
                    </button>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">
                    {filteredContacts.length} contacts
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-4">
                <button
                  type="button"
                  onClick={() => setSmartGroupsOpen((state) => !state)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    {sectionTitle("Smart Groups")}
                    <p className="mt-2 text-sm text-slate-400">Auto-generated from your current contact data.</p>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", smartGroupsOpen ? "rotate-180" : "")} />
                </button>
                {smartGroupsOpen ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {smartGroups.map((group) => {
                      const active = selectedSmartGroup?.key === group.key && selectedSmartGroup?.value === group.value;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => applySmartGroup({ key: group.key, value: group.value })}
                          className={cn(
                            "rounded-full border px-3 py-2 text-sm transition",
                            active ? "border-sky-400/40 bg-sky-500/15 text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white",
                          )}
                        >
                          {group.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTER_PILLS.map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => {
                      setFilter(pill.value);
                      setSelectedSmartGroup(null);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-2 text-sm transition",
                      filter === pill.value ? "border-sky-400/40 bg-sky-500/15 text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white",
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {browserMode === "grid" ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredContacts.map((contact) => (
                    <ContactGridCard key={contact.id} contact={contact} onSelect={() => jumpToContact(contact.id)} />
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.02]">
                  <div className="grid grid-cols-[1.4fr_1.1fr_0.8fr_0.9fr_0.9fr_1fr_0.9fr_0.7fr] gap-4 border-b border-white/10 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <span>Name</span>
                    <span>Company</span>
                    <span>Type</span>
                    <span>City</span>
                    <span>Phone</span>
                    <span>Email</span>
                    <span>Last Contacted</span>
                    <span>Score</span>
                  </div>
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => jumpToContact(contact.id)}
                      className="grid w-full grid-cols-[1.4fr_1.1fr_0.8fr_0.9fr_0.9fr_1fr_0.9fr_0.7fr] gap-4 border-b border-white/5 px-5 py-4 text-left text-sm text-slate-300 transition hover:bg-white/[0.04] last:border-b-0"
                    >
                      <span className="font-semibold text-white">{fullName(contact)}</span>
                      <span>{contact.company || "-"}</span>
                      <span>{RELATIONSHIP_TYPE_LABELS[contact.relationshipType]}</span>
                      <span>{contact.city || "-"}</span>
                      <span>{contact.phone || "-"}</span>
                      <span className="truncate">{contact.email || "-"}</span>
                      <span>{relativeTimeFromDate(contact.lastContactedAt)}</span>
                      <span className={scoreTextTone(contact.relationshipScore)}>{contact.relationshipScore}</span>
                    </button>
                  ))}
                </div>
              )}

              {!filteredContacts.length ? (
                <div className="rounded-[28px] border border-dashed border-white/10 px-4 py-12 text-center text-sm text-slate-500">
                  No contacts match the current filters.
                </div>
              ) : null}
            </div>
          </main>
        ) : null}

        {currentView === "detail" ? (
          <main className="flex min-h-[calc(100vh-210px)] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-xl">
            {selectedContact ? (
              <>
                <div className="border-b border-white/10 px-6 pt-6">
                  <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                    <button type="button" onClick={() => navigateTo("home")} className="transition hover:text-white">
                      Rolodex
                    </button>
                    <span>&gt;</span>
                    <button type="button" onClick={() => navigateTo("contacts")} className="transition hover:text-white">
                      Contacts
                    </button>
                    <span>&gt;</span>
                    <span className="text-white">{fullName(selectedContact)}</span>
                  </div>

                  <div className="flex flex-col gap-6 pb-6 2xl:flex-row 2xl:items-start 2xl:justify-between">
                    <div className="flex min-w-0 gap-5">
                      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[30px] border border-white/10 bg-slate-950/60 text-3xl font-semibold text-white">
                        {initials(selectedContact)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="min-w-0">
                            <h1 className="truncate text-4xl font-semibold text-white">{fullName(selectedContact)}</h1>
                            <p className="mt-2 truncate text-base text-slate-400">{titleLine(selectedContact)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
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

                        <div className="mt-5 flex flex-wrap items-center gap-2">
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

                    <div className="flex flex-wrap items-start gap-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <ContactMetric label="Interactions" value={selectedContact.interactions.length} />
                        <ContactMetric
                          label="Next Follow-up"
                          value={selectedContact.nextFollowUp ? formatDate(selectedContact.nextFollowUp) : "Unscheduled"}
                          tone="text-slate-200"
                        />
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

                <div className="border-b border-white/10 px-6">
                  <div className="flex overflow-x-auto">
                    {DETAIL_TABS.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        className={cn(
                          "relative px-4 py-5 text-sm transition",
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

                <div className="flex-1 overflow-y-auto p-6">
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
                    <div className="space-y-5">
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

                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <RelationshipTrajectoryCard interactions={selectedContact.interactions} />
                        <CommunicationInsightsCard interactions={selectedContact.interactions} />
                      </div>

                      <GlassCard className="p-6">
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

                      <GlassCard className="p-6">
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
                            <TimelineItemCard
                              key={interaction.id}
                              interaction={interaction}
                              onOpen={() => openTimelineInteraction(interaction)}
                              onDelete={() => deleteInteraction(interaction.id)}
                            />
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
                <EmptyPanel title="No contact selected" body="Choose a contact from Contacts or create a new one." />
              </div>
            )}
          </main>
        ) : null}

        <footer className="mt-6 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span>{contacts.length} contacts</span>
            <span>{contacts.reduce((count, contact) => count + contact.connections.length, 0)} total connections</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            <span>{footerSyncLabel}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}












