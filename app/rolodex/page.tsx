"use client";

import { FormEvent, useDeferredValue, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  Briefcase,
  Calendar,
  ChevronDown,
  Clock3,
  Copy,
  Ellipsis,
  ExternalLink,
  Gift,
  Globe,
  Link2,
  Mail,
  MessageSquare,
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
  tags: string;
};

type QuickLogDraft = {
  type: InteractionType;
  summary: string;
  details: string;
  sentiment: SentimentValue;
};

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

const QUICK_LOG_TYPES: InteractionType[] = ["call", "email", "meeting", "text", "note", "gift", "referral", "deal"];
const TIMELINE_FILTERS: TimelineFilter[] = ["all", "call", "email", "meeting", "text", "note", "gift", "referral", "deal"];
const REMINDER_OPTIONS: StayInTouchReminder["frequency"][] = ["weekly", "biweekly", "monthly", "quarterly", "yearly"];
const EMPTY_NOTE_PROMPT = "Type markdown notes here. Changes save when the field blurs.";
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
  tags: "",
};

const EMPTY_QUICK_LOG: QuickLogDraft = {
  type: "call",
  summary: "",
  details: "",
  sentiment: "",
};

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

const easternTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
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
  const pieces = [contact.company, contact.title].filter(Boolean);
  return pieces.length ? pieces.join(" • ") : "No company details";
}

function locationLine(contact: RolodexContact) {
  return [contact.city, contact.state, contact.country].filter(Boolean).join(", ");
}

function relativeTimeFromDate(date?: string) {
  if (!date) return "Never";
  const target = new Date(`${date}T12:00:00.000Z`).getTime();
  const current = new Date(`${easternToday()}T12:00:00.000Z`).getTime();
  if (Number.isNaN(target) || Number.isNaN(current)) return date;
  const days = Math.max(0, Math.floor((current - target) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
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
  return easternTimeFormatter.format(parsed);
}

function scoreTone(score: number) {
  if (score <= 30) return "border-rose-400/30 text-rose-300";
  if (score <= 60) return "border-amber-400/30 text-amber-300";
  if (score <= 85) return "border-blue-400/30 text-sky-300";
  return "border-emerald-400/30 text-emerald-300";
}

function scoreRing(score: number) {
  if (score <= 30) return "#f87171";
  if (score <= 60) return "#fbbf24";
  if (score <= 85) return "#60a5fa";
  return "#4ade80";
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

function splitTags(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeUrl(url?: string) {
  if (!url) return undefined;
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
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < parsed.getUTCDate())) age -= 1;
  return age;
}

function inferInitiator(interaction: Interaction) {
  const text = `${interaction.summary} ${interaction.details ?? ""}`.toLowerCase();
  if (text.includes("she replied") || text.includes("he replied") || text.includes("inbound") || text.includes("introduced") || text.includes("sent over")) {
    return "them";
  }
  return "you";
}

function markdownPreview(content: string) {
  return content.trim() ? content : EMPTY_NOTE_PROMPT;
}

function interactionTypeIcon(type: InteractionType) {
  if (type === "call") return Phone;
  if (type === "email") return Mail;
  if (type === "meeting") return Calendar;
  if (type === "text") return MessageSquare;
  if (type === "gift") return Gift;
  if (type === "referral") return Users;
  if (type === "deal") return Briefcase;
  return StickyNote;
}

function sectionTitle(label: string) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>;
}

function buildHeatmap(interactions: Interaction[]) {
  const end = new Date(`${easternToday()}T12:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  const counts = new Map<string, number>();

  interactions.forEach((interaction) => {
    counts.set(interaction.date, (counts.get(interaction.date) ?? 0) + 1);
  });

  const days: Array<{ date: string; count: number }> = [];
  for (let index = 0; index < 371; index += 1) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    const key = current.toISOString().slice(0, 10);
    days.push({ date: key, count: counts.get(key) ?? 0 });
  }

  const padded = [...days];
  while (padded.length % 7 !== 0) padded.push({ date: "", count: 0 });
  const weeks: Array<typeof padded> = [];
  for (let index = 0; index < padded.length; index += 7) {
    weeks.push(padded.slice(index, index + 7));
  }
  return weeks;
}

function contactSearchIndex(contact: RolodexContact) {
  return [
    fullName(contact),
    contact.company,
    contact.email,
    contact.phone,
    contact.title,
    contact.industry,
    contact.tags.join(" "),
    contact.personalNotes,
    contact.notes.map((note) => note.content).join(" "),
    contact.interactions.map((interaction) => `${interaction.summary} ${interaction.details ?? ""}`).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildAiAnswer(contact: RolodexContact, prompt: string, contacts: RolodexContact[]) {
  const interactions = contact.interactions;
  const notes = contact.notes;
  const latestInteraction = interactions[0];
  const mutualTags = contacts.filter((candidate) => candidate.id !== contact.id && candidate.tags.some((tag) => contact.tags.includes(tag)));
  const promptValue = prompt.toLowerCase();

  if (promptValue.includes("summarize")) {
    return `${fullName(contact)} is a ${RELATIONSHIP_TYPE_LABELS[contact.relationshipType].toLowerCase()} connection with a relationship score of ${contact.relationshipScore}. You have ${interactions.length} logged interactions, last touched ${relativeTimeFromDate(contact.lastContactedAt)}, and the strongest themes are ${contact.tags.slice(0, 3).join(", ") || "general relationship building"}.`;
  }

  if (promptValue.includes("follow up")) {
    return contact.nextFollowUp
      ? `Next follow-up is due ${formatDate(contact.nextFollowUp)}. Reference ${latestInteraction?.summary ?? "your last interaction"} and keep the note grounded in ${contact.interests ?? contact.company ?? "their recent priorities"}.`
      : `There is no active follow-up reminder. A sensible next step is to reach out this week and reference ${latestInteraction?.summary ?? "your last conversation"}.`;
  }

  if (promptValue.includes("common")) {
    return `Shared context: ${contact.interests ?? "no personal interests logged yet"}. Mutual network overlap includes ${mutualTags.slice(0, 3).map((candidate) => fullName(candidate)).join(", ") || "no obvious overlaps yet"}.`;
  }

  if (promptValue.includes("email")) {
    return `Subject: Quick follow-up\n\nHi ${contact.firstName},\n\nWanted to follow up on ${latestInteraction?.summary?.toLowerCase() ?? "our last conversation"}. ${contact.company ? `I’ve been thinking about ${contact.company} and a few next steps we could take.` : "I have a few ideas that may be useful."}\n\nIf helpful, I can send over a short outline this week.\n\nBest,\nKevin`;
  }

  if (promptValue.includes("meeting")) {
    return `${fullName(contact)} last engaged ${relativeTimeFromDate(contact.lastContactedAt)}. Review notes about ${contact.personalNotes ?? latestInteraction?.details ?? "their current priorities"}, and be ready to discuss ${contact.tags.slice(0, 3).join(", ") || "current relationship goals"}.`;
  }

  return `Recent context for ${fullName(contact)}: ${latestInteraction?.summary ?? "no recent interactions logged"}. Notes highlight ${notes[0]?.content ?? "limited journal detail so far"}.`;
}

function inferSuggestedTags(contact: RolodexContact) {
  const haystack = `${contact.notes.map((note) => note.content).join(" ")} ${contact.interactions.map((interaction) => `${interaction.summary} ${interaction.details ?? ""}`).join(" ")}`
    .toLowerCase();
  const suggestions = new Set<string>();
  if (haystack.includes("referral")) suggestions.add("referrals");
  if (haystack.includes("restaurant")) suggestions.add("hospitality");
  if (haystack.includes("design") || haystack.includes("figma")) suggestions.add("design");
  if (haystack.includes("marketing") || haystack.includes("campaign")) suggestions.add("marketing");
  if (haystack.includes("contractor") || haystack.includes("home")) suggestions.add("home services");
  if (haystack.includes("invest") || haystack.includes("advisor")) suggestions.add("advice");
  return Array.from(suggestions).filter((tag) => !contact.tags.includes(tag));
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-4">{sectionTitle(title)}</div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 border-b border-white/5 pb-3 last:border-b-0 last:pb-0 md:grid-cols-[132px_minmax(0,1fr)]">
      <span className="text-sm text-slate-400">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function InlineField({
  value,
  placeholder,
  onSave,
  type = "text",
  multiline = false,
}: {
  value?: string;
  placeholder?: string;
  onSave: (value: string) => void;
  type?: "text" | "email" | "date" | "url" | "tel";
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  if (editing) {
    if (multiline) {
      return (
        <textarea
          autoFocus
          className="min-h-[90px] w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            setEditing(false);
            onSave(draft);
          }}
        />
      );
    }

    return (
      <input
        autoFocus
        type={type}
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
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
      />
    );
  }

  return (
    <button
      type="button"
      className="min-h-8 w-full rounded-lg px-0 py-1 text-left text-sm text-white transition hover:text-sky-200"
      onClick={() => setEditing(true)}
    >
      {value?.trim() ? value : <span className="text-slate-500">{placeholder ?? "Click to edit"}</span>}
    </button>
  );
}

function InlineSelectField<T extends string>({
  value,
  options,
  onSave,
}: {
  value: T;
  options: readonly T[];
  onSave: (value: T) => void;
}) {
  return (
    <label className="relative block">
      <select
        className="w-full appearance-none rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
        value={value}
        onChange={(event) => onSave(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
    </label>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("flex h-20 w-20 items-center justify-center rounded-full border bg-slate-950/60", scoreTone(score))}>
      <svg viewBox="0 0 64 64" className="absolute h-16 w-16">
        <circle cx="32" cy="32" r={radius} stroke="rgba(148,163,184,0.18)" strokeWidth="5" fill="none" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke={scoreRing(score)}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div className="relative text-center">
        <div className="text-lg font-semibold text-white">{score}</div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Score</div>
      </div>
    </div>
  );
}

export default function RolodexPage() {
  const [contacts, setContacts] = useState<RolodexContact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("recently-contacted");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all");
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(10);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);
  const [quickLog, setQuickLog] = useState<QuickLogDraft | null>(null);
  const [quickNote, setQuickNote] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiHistory, setAiHistory] = useState<Record<string, AiMessage[]>>({});
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [contactDraft, setContactDraft] = useState<ContactDraft>(EMPTY_CONTACT_DRAFT);
  const [connectionQuery, setConnectionQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const deferredSearch = useDeferredValue(search);

  async function fetchContacts(options?: { seedIfEmpty?: boolean }) {
    const response = await fetch("/api/rolodex", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to fetch contacts.");
    const data = (await response.json()) as RolodexContact[];

    if (options?.seedIfEmpty && data.length === 0) {
      const seedResponse = await fetch("/api/rolodex/seed", { method: "POST" });
      if (!seedResponse.ok) throw new Error("Unable to seed contacts.");
      return fetchContacts({ seedIfEmpty: false });
    }

    setContacts(data);
    setSelectedContactId((current) => {
      if (current && data.some((contact) => contact.id === current)) return current;
      return data[0]?.id ?? "";
    });
    setLastSyncedAt(new Date());
    setSecondsSinceSync(0);
    return data;
  }

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await fetchContacts({ seedIfEmpty: true });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
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

  const filteredContacts = [...contacts]
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

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId) ?? filteredContacts[0] ?? null;
  const selectedConnections = contacts.filter((contact) => selectedContact?.connections.includes(contact.id));
  const mutualTagContacts = contacts.filter(
    (contact) => selectedContact && contact.id !== selectedContact.id && contact.tags.some((tag) => selectedContact.tags.includes(tag)),
  );
  const sameCityContacts = contacts.filter(
    (contact) => selectedContact && contact.id !== selectedContact.id && contact.city && contact.city === selectedContact.city,
  );
  const selectedAiHistory = selectedContact ? aiHistory[selectedContact.id] ?? [] : [];
  const timelineItems = selectedContact
    ? selectedContact.interactions.filter((interaction) => timelineFilter === "all" || interaction.type === timelineFilter)
    : [];
  const visibleTimeline = timelineItems.slice(0, visibleTimelineCount);
  const heatmap = buildHeatmap(selectedContact?.interactions ?? []);
  const latestInteraction = selectedContact?.interactions[0];
  const interactionCounts = selectedContact?.interactions.reduce<Record<string, number>>((accumulator, interaction) => {
    accumulator[interaction.type] = (accumulator[interaction.type] ?? 0) + 1;
    return accumulator;
  }, {});
  const topInteractionType = selectedContact && interactionCounts ? Object.entries(interactionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] : undefined;
  const last30DayCount =
    selectedContact?.interactions.filter((interaction) => {
      const today = new Date(`${easternToday()}T12:00:00.000Z`).getTime();
      const date = new Date(`${interaction.date}T12:00:00.000Z`).getTime();
      return !Number.isNaN(date) && today - date <= 30 * 86400000;
    }).length ?? 0;
  const initiatorCounts = selectedContact?.interactions.reduce(
    (accumulator, interaction) => {
      const key = inferInitiator(interaction);
      accumulator[key] += 1;
      return accumulator;
    },
    { you: 0, them: 0 },
  ) ?? { you: 0, them: 0 };

  async function patchContact(contactId: string, patch: Partial<RolodexContact>) {
    const previous = contacts;
    setContacts((current) =>
      current.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              ...patch,
              tags: patch.tags ?? contact.tags,
              notes: patch.notes ?? contact.notes,
              interactions: patch.interactions ?? contact.interactions,
              connections: patch.connections ?? contact.connections,
            }
          : contact,
      ),
    );

    const response = await fetch(`/api/rolodex/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      setContacts(previous);
      throw new Error("Unable to save contact.");
    }

    const updated = (await response.json()) as RolodexContact;
    setContacts((current) => current.map((contact) => (contact.id === contactId ? updated : contact)));
  }

  async function patchConnections(contactId: string, body: { add?: string[]; remove?: string[] }) {
    const response = await fetch(`/api/rolodex/${contactId}/connections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error("Unable to update connections.");
    await fetchContacts();
  }

  async function createQuickInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact || !quickLog?.summary.trim()) return;
    const response = await fetch(`/api/rolodex/${selectedContact.id}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: quickLog.type,
        date: easternToday(),
        summary: quickLog.summary,
        details: quickLog.details,
        sentiment: quickLog.sentiment || undefined,
      }),
    });
    if (!response.ok) return;
    const data = (await response.json()) as { contact: RolodexContact; interaction: Interaction };
    setContacts((current) => current.map((contact) => (contact.id === selectedContact.id ? data.contact : contact)));
    setQuickLog(null);
  }

  async function addJournalNote() {
    if (!selectedContact || !quickNote.trim()) return;
    const nextNote: RolodexNote = {
      id: `rn_${Date.now().toString(36)}`,
      content: quickNote.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextNotes = [nextNote, ...selectedContact.notes];
    setQuickNote("");
    await patchContact(selectedContact.id, { notes: nextNotes });
  }

  async function deleteInteraction(interactionId: string) {
    if (!selectedContact) return;
    const response = await fetch(`/api/rolodex/${selectedContact.id}/interactions/${interactionId}`, { method: "DELETE" });
    if (!response.ok) return;
    const updated = (await response.json()) as RolodexContact;
    setContacts((current) => current.map((contact) => (contact.id === selectedContact.id ? updated : contact)));
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
        tags: splitTags(contactDraft.tags),
      }),
    });
    if (!response.ok) return;
    const created = (await response.json()) as RolodexContact;
    setContacts((current) => [created, ...current]);
    setSelectedContactId(created.id);
    setAddContactOpen(false);
    setContactDraft(EMPTY_CONTACT_DRAFT);
  }

  async function importFromPipeline() {
    await fetch("/api/rolodex/import-pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    await fetchContacts();
  }

  async function archiveSelected() {
    if (!selectedContact) return;
    await fetch(`/api/rolodex/${selectedContact.id}`, { method: "DELETE" });
    await fetchContacts();
    setMenuOpen(false);
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
    if (!response.ok) return;
    const createdDeal = (await response.json()) as { id: string };
    await patchContact(selectedContact.id, { pipelineDealId: createdDeal.id, relationshipType: "prospect" });
    setMenuOpen(false);
  }

  async function askAi(prompt: string) {
    if (!selectedContact || !prompt.trim()) return;
    const now = new Date().toISOString();
    const next: AiMessage[] = [
      ...(aiHistory[selectedContact.id] ?? []),
      { id: `${now}-user`, role: "user", content: prompt, createdAt: now },
      { id: `${now}-assistant`, role: "assistant", content: buildAiAnswer(selectedContact, prompt, contacts), createdAt: now },
    ];
    setAiHistory((current) => ({ ...current, [selectedContact.id]: next }));
    setAiPrompt("");
  }

  async function suggestTags() {
    if (!selectedContact) return;
    const suggestions = inferSuggestedTags(selectedContact);
    if (!suggestions.length) {
      await askAi("Summarize my relationship with this person");
      return;
    }
    await patchContact(selectedContact.id, { tags: [...selectedContact.tags, ...suggestions] });
    const now = new Date().toISOString();
    setAiHistory((current) => ({
      ...current,
      [selectedContact.id]: [
        ...(current[selectedContact.id] ?? []),
        { id: `${now}-assistant-tags`, role: "assistant", content: `Added suggested tags: ${suggestions.join(", ")}.`, createdAt: now },
      ],
    }));
  }

  const connectionOptions = contacts.filter(
    (contact) =>
      selectedContact &&
      contact.id !== selectedContact.id &&
      !selectedContact.connections.includes(contact.id) &&
      fullName(contact).toLowerCase().includes(connectionQuery.toLowerCase()),
  );

  if (loading) {
    return <div className="min-h-screen bg-slate-950 px-6 py-10 text-slate-200">Loading Rolodex…</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_34%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-center">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-sky-400/60"
                  placeholder="Search name, company, email, tags, notes"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <div className="flex max-w-full items-center gap-2 overflow-x-auto pb-1">
                {FILTER_PILLS.map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    className={cn(
                      "rounded-full border px-3 py-2 text-sm transition",
                      filter === pill.value ? "border-sky-400/40 bg-sky-500/15 text-white" : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-white",
                    )}
                    onClick={() => setFilter(pill.value)}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <select
                  className="appearance-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-sky-400/60"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortMode)}
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
                className="rounded-2xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-3 text-sm font-medium text-white transition hover:brightness-110"
                onClick={() => setAddContactOpen(true)}
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Contact
                </span>
              </button>

              <button
                type="button"
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200 transition hover:border-sky-400/40 hover:text-white"
                onClick={() => importFromPipeline()}
              >
                Import from Pipeline
              </button>

              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-300">{filteredContacts.length} contacts</div>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-[calc(100vh-186px)] flex-col rounded-[28px] border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between px-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Contact List</p>
                <p className="mt-1 text-sm text-slate-500">Real-time filtered roster</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:text-white"
                onClick={() => fetchContacts().catch(() => undefined)}
              >
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition duration-200",
                    selectedContact?.id === contact.id
                      ? "border-sky-400/60 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]"
                      : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
                  )}
                  onClick={() => {
                    setSelectedContactId(contact.id);
                    setActiveTab("overview");
                    setVisibleTimelineCount(10);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: relationshipDot[contact.relationshipType] }} />
                        <p className="truncate font-semibold text-white">{fullName(contact)}</p>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-400">{titleLine(contact)}</p>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      {contact.phone ? <Phone className="h-4 w-4" /> : null}
                      {contact.email ? <Mail className="h-4 w-4" /> : null}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Last contacted</span>
                    <span>{relativeTimeFromDate(contact.lastContactedAt)}</span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,_#38bdf8,_#22c55e)]"
                      style={{ width: `${Math.max(10, contact.relationshipScore)}%` }}
                    />
                  </div>
                </button>
              ))}

              {!filteredContacts.length ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">No contacts match the current filters.</div>
              ) : null}
            </div>
          </aside>

          <main className="flex min-h-[calc(100vh-186px)] flex-col rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl">
            {selectedContact ? (
              <>
                <div className="border-b border-white/10 p-5">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-slate-900/70 text-xl font-semibold text-white">
                        {initials(selectedContact)}
                      </div>
                      <div className="min-w-0">
                        <h1 className="truncate text-3xl font-semibold text-white">{fullName(selectedContact)}</h1>
                        <p className="mt-1 truncate text-sm text-slate-400">{titleLine(selectedContact)}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: relationshipDot[selectedContact.relationshipType] }} />
                            <select
                              className="bg-transparent text-white outline-none"
                              value={selectedContact.relationshipType}
                              onChange={(event) =>
                                patchContact(selectedContact.id, { relationshipType: event.target.value as RelationshipType }).catch(() => undefined)
                              }
                            >
                              {RELATIONSHIP_TYPES.map((type) => (
                                <option key={type} value={type} className="bg-slate-950">
                                  {RELATIONSHIP_TYPE_LABELS[type]}
                                </option>
                              ))}
                            </select>
                          </label>

                          <span className="text-sm text-slate-400">Last contacted {relativeTimeFromDate(selectedContact.lastContactedAt)}</span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {selectedContact.phone ? (
                            <a className="rounded-2xl border border-white/10 p-3 text-slate-300 transition hover:text-white" href={`tel:${selectedContact.phone}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          ) : null}
                          {selectedContact.email ? (
                            <a className="rounded-2xl border border-white/10 p-3 text-slate-300 transition hover:text-white" href={`mailto:${selectedContact.email}`}>
                              <Mail className="h-4 w-4" />
                            </a>
                          ) : null}
                          {selectedContact.website ? (
                            <a
                              className="rounded-2xl border border-white/10 p-3 text-slate-300 transition hover:text-white"
                              href={normalizeUrl(selectedContact.website)}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <Globe className="h-4 w-4" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            className="rounded-2xl border border-white/10 p-3 text-slate-300 transition hover:text-white"
                            onClick={() => navigator.clipboard.writeText([selectedContact.email, selectedContact.phone].filter(Boolean).join(" • "))}
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          {selectedContact.phone ? (
                            <a className="rounded-2xl border border-white/10 p-3 text-slate-300 transition hover:text-white" href={`sms:${selectedContact.phone}`}>
                              <MessageSquare className="h-4 w-4" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <ScoreCircle score={selectedContact.relationshipScore} />

                      <div className="relative">
                        <button
                          type="button"
                          className="rounded-2xl border border-white/10 p-3 text-slate-300 transition hover:text-white"
                          onClick={() => setMenuOpen((current) => !current)}
                        >
                          <Ellipsis className="h-5 w-5" />
                        </button>

                        {menuOpen ? (
                          <div className="absolute right-0 top-14 z-30 min-w-52 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl">
                            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5" onClick={() => archiveSelected()}>
                              <Clock3 className="h-4 w-4" />
                              Archive
                            </button>
                            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5" onClick={() => moveToPipeline()}>
                              <Link2 className="h-4 w-4" />
                              Move to Pipeline
                            </button>
                            <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-white/5" onClick={() => archiveSelected()}>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-white/5 pt-4">
                    {DETAIL_TABS.map((tab) => (
                      <button
                        key={tab.value}
                        type="button"
                        className={cn(
                          "border-b-2 pb-3 text-sm transition",
                          activeTab === tab.value ? "border-sky-400 text-white" : "border-transparent text-slate-400 hover:text-white",
                        )}
                        onClick={() => setActiveTab(tab.value)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {activeTab === "overview" ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <InfoCard title="Contact Info">
                        <FieldRow label="Email">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <InlineField value={selectedContact.email} placeholder="Add email" type="email" onSave={(value) => patchContact(selectedContact.id, { email: value }).catch(() => undefined)} />
                            </div>
                            {selectedContact.email ? (
                              <button className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:text-white" onClick={() => navigator.clipboard.writeText(selectedContact.email ?? "")}>
                                <Copy className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </FieldRow>
                        <FieldRow label="Phone">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <InlineField value={selectedContact.phone} placeholder="Add phone" type="tel" onSave={(value) => patchContact(selectedContact.id, { phone: value }).catch(() => undefined)} />
                            </div>
                            {selectedContact.phone ? (
                              <a className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:text-white" href={`tel:${selectedContact.phone}`}>
                                <Phone className="h-4 w-4" />
                              </a>
                            ) : null}
                          </div>
                        </FieldRow>
                        <FieldRow label="Secondary Email">
                          <InlineField value={selectedContact.secondaryEmail} placeholder="Add secondary email" type="email" onSave={(value) => patchContact(selectedContact.id, { secondaryEmail: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Secondary Phone">
                          <InlineField value={selectedContact.secondaryPhone} placeholder="Add secondary phone" type="tel" onSave={(value) => patchContact(selectedContact.id, { secondaryPhone: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Location">
                          <InlineField value={locationLine(selectedContact)} placeholder="City, state, country" onSave={(value) => {
                            const [city, state, country] = value.split(",").map((entry) => entry.trim());
                            patchContact(selectedContact.id, { city, state, country }).catch(() => undefined);
                          }} />
                        </FieldRow>
                        <FieldRow label="Website">
                          <InlineField value={selectedContact.website} placeholder="Add website" type="url" onSave={(value) => patchContact(selectedContact.id, { website: value }).catch(() => undefined)} />
                        </FieldRow>
                      </InfoCard>

                      <InfoCard title="Professional">
                        <FieldRow label="Company">
                          <InlineField value={selectedContact.company} placeholder="Add company" onSave={(value) => patchContact(selectedContact.id, { company: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Title">
                          <InlineField value={selectedContact.title} placeholder="Add title" onSave={(value) => patchContact(selectedContact.id, { title: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Industry">
                          <InlineField value={selectedContact.industry} placeholder="Add industry" onSave={(value) => patchContact(selectedContact.id, { industry: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Tags">
                          <InlineField
                            value={selectedContact.tags.join(", ")}
                            placeholder="Comma-separated tags"
                            onSave={(value) => patchContact(selectedContact.id, { tags: splitTags(value) }).catch(() => undefined)}
                          />
                        </FieldRow>
                      </InfoCard>

                      <InfoCard title="Relationship">
                        <FieldRow label="Type">
                          <InlineSelectField
                            value={selectedContact.relationshipType}
                            options={RELATIONSHIP_TYPES}
                            onSave={(value) => patchContact(selectedContact.id, { relationshipType: value }).catch(() => undefined)}
                          />
                        </FieldRow>
                        <FieldRow label="How We Met">
                          <InlineField value={selectedContact.howWeMet} placeholder="How did you meet?" onSave={(value) => patchContact(selectedContact.id, { howWeMet: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Met Date">
                          <InlineField value={selectedContact.metDate} placeholder="YYYY-MM-DD" type="date" onSave={(value) => patchContact(selectedContact.id, { metDate: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Introduced By">
                          <InlineField value={selectedContact.introducedBy} placeholder="Who introduced you?" onSave={(value) => patchContact(selectedContact.id, { introducedBy: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Pipeline">
                          {selectedContact.pipelineDealId ? (
                            <a href="/pipeline" className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200 transition hover:text-white">
                              View in Pipeline
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : (
                            <span className="text-sm text-slate-500">Not linked</span>
                          )}
                        </FieldRow>
                      </InfoCard>

                      <InfoCard title="Personal">
                        <FieldRow label="Birthday">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <InlineField value={selectedContact.birthday} placeholder="YYYY-MM-DD" type="date" onSave={(value) => patchContact(selectedContact.id, { birthday: value }).catch(() => undefined)} />
                            </div>
                            {selectedContact.birthday ? <span className="text-sm text-slate-500">Age {ageFromBirthday(selectedContact.birthday) ?? "?"}</span> : null}
                          </div>
                        </FieldRow>
                        <FieldRow label="Spouse">
                          <InlineField value={selectedContact.spouse} placeholder="Add spouse" onSave={(value) => patchContact(selectedContact.id, { spouse: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Children">
                          <InlineField value={selectedContact.children} placeholder="Add children" onSave={(value) => patchContact(selectedContact.id, { children: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Interests">
                          <InlineField value={selectedContact.interests} placeholder="Add interests" onSave={(value) => patchContact(selectedContact.id, { interests: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Favorite Food">
                          <InlineField value={selectedContact.favoriteFood} placeholder="Add favorite food" onSave={(value) => patchContact(selectedContact.id, { favoriteFood: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Personal Notes">
                          <InlineField
                            value={selectedContact.personalNotes}
                            placeholder="Add personal notes"
                            multiline
                            onSave={(value) => patchContact(selectedContact.id, { personalNotes: value }).catch(() => undefined)}
                          />
                        </FieldRow>
                      </InfoCard>

                      <InfoCard title="Social Links">
                        <FieldRow label="LinkedIn">
                          <InlineField value={selectedContact.linkedin} placeholder="Add LinkedIn URL" type="url" onSave={(value) => patchContact(selectedContact.id, { linkedin: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Instagram">
                          <InlineField value={selectedContact.instagram} placeholder="Add Instagram URL" type="url" onSave={(value) => patchContact(selectedContact.id, { instagram: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Twitter">
                          <InlineField value={selectedContact.twitter} placeholder="Add Twitter URL" type="url" onSave={(value) => patchContact(selectedContact.id, { twitter: value }).catch(() => undefined)} />
                        </FieldRow>
                        <FieldRow label="Facebook">
                          <InlineField value={selectedContact.facebook} placeholder="Add Facebook URL" type="url" onSave={(value) => patchContact(selectedContact.id, { facebook: value }).catch(() => undefined)} />
                        </FieldRow>
                      </InfoCard>

                      <InfoCard title="Stay In Touch">
                        <FieldRow label="Frequency">
                          <InlineSelectField
                            value={selectedContact.stayInTouch?.frequency ?? "monthly"}
                            options={REMINDER_OPTIONS}
                            onSave={(value) => patchContact(selectedContact.id, { stayInTouch: { ...selectedContact.stayInTouch, frequency: value } }).catch(() => undefined)}
                          />
                        </FieldRow>
                        <FieldRow label="Next Follow-up">
                          <span className="text-sm text-slate-300">{selectedContact.nextFollowUp ? formatDate(selectedContact.nextFollowUp) : "Calculated automatically from reminder cadence"}</span>
                        </FieldRow>
                        <FieldRow label="Snooze">
                          <button
                            type="button"
                            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:text-white"
                            onClick={() =>
                              patchContact(selectedContact.id, {
                                stayInTouch: {
                                  frequency: selectedContact.stayInTouch?.frequency ?? "monthly",
                                  customDays: selectedContact.stayInTouch?.customDays,
                                  lastReminded: selectedContact.stayInTouch?.lastReminded,
                                  snoozedUntil: easternToday(),
                                },
                              }).catch(() => undefined)
                            }
                          >
                            Snooze until today
                          </button>
                        </FieldRow>
                      </InfoCard>
                    </div>
                  ) : null}

                  {activeTab === "activity" ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 lg:grid-cols-4">
                        <InfoCard title="Total Interactions">
                          <p className="text-3xl font-semibold text-white">{selectedContact.interactions.length}</p>
                        </InfoCard>
                        <InfoCard title="Last 30 Days">
                          <p className="text-3xl font-semibold text-white">{last30DayCount}</p>
                        </InfoCard>
                        <InfoCard title="Most Common Type">
                          <p className="text-lg font-semibold text-white">{topInteractionType ? INTERACTION_TYPE_LABELS[topInteractionType as InteractionType] : "None yet"}</p>
                        </InfoCard>
                        <InfoCard title="Initiator">
                          <p className="text-lg font-semibold text-white">{initiatorCounts.you >= initiatorCounts.them ? "You lead" : "They lead"}</p>
                          <p className="mt-1 text-sm text-slate-500">{initiatorCounts.you} you / {initiatorCounts.them} them</p>
                        </InfoCard>
                      </div>

                      <InfoCard title="Activity Heatmap">
                        <div className="overflow-x-auto">
                          <div className="grid min-w-[760px] grid-flow-col gap-1">
                            {heatmap.map((week, weekIndex) => (
                              <div key={`week-${weekIndex}`} className="grid grid-rows-7 gap-1">
                                {week.map((day, dayIndex) => (
                                  <div
                                    key={`${day.date || weekIndex}-${dayIndex}`}
                                    className="h-3.5 w-3.5 rounded-[4px]"
                                    style={{ backgroundColor: day.date ? heatmapTone(day.count) : "transparent" }}
                                    title={day.date ? `${formatDate(day.date)}: ${day.count} interactions` : ""}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </InfoCard>

                      <InfoCard title="Quick Log">
                        <div className="flex flex-wrap gap-2">
                          {QUICK_LOG_TYPES.map((type) => {
                            const Icon = interactionTypeIcon(type);
                            return (
                              <button
                                key={type}
                                type="button"
                                className={cn(
                                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition",
                                  quickLog?.type === type ? "border-sky-400/40 bg-sky-500/10 text-white" : "border-white/10 bg-white/[0.02] text-slate-300 hover:text-white",
                                )}
                                onClick={() => setQuickLog({ ...EMPTY_QUICK_LOG, type })}
                              >
                                <Icon className="h-4 w-4" />
                                {INTERACTION_TYPE_LABELS[type]}
                              </button>
                            );
                          })}
                        </div>

                        {quickLog ? (
                          <form className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4" onSubmit={createQuickInteraction}>
                            <input
                              className="rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
                              placeholder="Summary"
                              value={quickLog.summary}
                              onChange={(event) => setQuickLog((current) => (current ? { ...current, summary: event.target.value } : current))}
                            />
                            <textarea
                              className="min-h-24 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/60"
                              placeholder="Optional details"
                              value={quickLog.details}
                              onChange={(event) => setQuickLog((current) => (current ? { ...current, details: event.target.value } : current))}
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              {[
                                { value: "positive", label: "😊" },
                                { value: "neutral", label: "😐" },
                                { value: "negative", label: "😟" },
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={cn(
                                    "rounded-xl border px-3 py-2 text-sm transition",
                                    quickLog.sentiment === option.value ? "border-sky-400/40 bg-sky-500/10 text-white" : "border-white/10 text-slate-300",
                                  )}
                                  onClick={() => setQuickLog((current) => (current ? { ...current, sentiment: option.value as SentimentValue } : current))}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <button className="rounded-xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-2 text-sm font-medium text-white" type="submit">
                                Save
                              </button>
                              <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300" type="button" onClick={() => setQuickLog(null)}>
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </InfoCard>

                      <InfoCard title="Timeline">
                        <div className="mb-4 flex flex-wrap gap-2">
                          {TIMELINE_FILTERS.map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] transition",
                                timelineFilter === value ? "border-sky-400/40 bg-sky-500/10 text-white" : "border-white/10 text-slate-400",
                              )}
                              onClick={() => {
                                setTimelineFilter(value);
                                setVisibleTimelineCount(10);
                              }}
                            >
                              {value === "all" ? "All" : INTERACTION_TYPE_LABELS[value]}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-3">
                          {visibleTimeline.map((interaction) => {
                            const Icon = interactionTypeIcon(interaction.type);
                            return (
                              <div key={interaction.id} className="group rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 gap-3">
                                    <div className="rounded-xl border border-white/10 p-2 text-slate-300">
                                      <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                                          {INTERACTION_TYPE_LABELS[interaction.type]}
                                        </span>
                                        <span className="text-xs text-slate-500">{formatDate(interaction.date)}</span>
                                        {interaction.sentiment ? <span className="text-sm">{interaction.sentiment === "positive" ? "😊" : interaction.sentiment === "negative" ? "😟" : "😐"}</span> : null}
                                      </div>
                                      <p className="mt-2 font-medium text-white">{interaction.summary}</p>
                                      {interaction.details ? <p className="mt-2 text-sm text-slate-400">{interaction.details}</p> : null}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="opacity-0 transition group-hover:opacity-100"
                                    onClick={() => deleteInteraction(interaction.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-slate-500 hover:text-rose-300" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {visibleTimelineCount < timelineItems.length ? (
                          <button className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:text-white" onClick={() => setVisibleTimelineCount((current) => current + 10)}>
                            Load More
                          </button>
                        ) : null}
                      </InfoCard>
                    </div>
                  ) : null}

                  {activeTab === "notes" ? (
                    <div className="space-y-4">
                      <InfoCard title="Quick Note">
                        <div className="flex flex-col gap-3">
                          <textarea
                            className="min-h-28 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                            placeholder="Add a timestamped note"
                            value={quickNote}
                            onChange={(event) => setQuickNote(event.target.value)}
                          />
                          <div className="flex items-center gap-2">
                            <button className="rounded-xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-2 text-sm font-medium text-white" onClick={() => addJournalNote()}>
                              Add Note
                            </button>
                            <span className="text-sm text-slate-500">Markdown supported</span>
                          </div>
                        </div>
                      </InfoCard>

                      <div className="space-y-3">
                        {selectedContact.notes.map((note) => (
                          <div key={note.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="text-sm text-slate-500">{formatDateTime(note.createdAt)}</div>
                              <button
                                type="button"
                                className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:text-white"
                                onClick={() =>
                                  patchContact(selectedContact.id, { notes: selectedContact.notes.filter((entry) => entry.id !== note.id) }).catch(() => undefined)
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <textarea
                              className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                              defaultValue={note.content}
                              onBlur={(event) =>
                                patchContact(selectedContact.id, {
                                  notes: selectedContact.notes.map((entry) =>
                                    entry.id === note.id ? { ...entry, content: event.target.value, updatedAt: new Date().toISOString() } : entry,
                                  ),
                                }).catch(() => undefined)
                              }
                            />
                            <div className="prose prose-invert mt-3 max-w-none text-sm">
                              <ReactMarkdown>{markdownPreview(note.content)}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeTab === "connections" ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
                        <InfoCard title="Linked Contacts">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedConnections.map((contact) => (
                              <button
                                key={contact.id}
                                type="button"
                                className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-left transition hover:border-sky-400/40"
                                onClick={() => setSelectedContactId(contact.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-sm font-semibold text-white">
                                    {initials(contact)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-white">{fullName(contact)}</p>
                                    <p className="truncate text-sm text-slate-500">{titleLine(contact)}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                            {!selectedConnections.length ? <p className="text-sm text-slate-500">No linked contacts yet.</p> : null}
                          </div>
                        </InfoCard>

                        <InfoCard title="Add Connection">
                          <input
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                            placeholder="Search contacts to connect"
                            value={connectionQuery}
                            onChange={(event) => setConnectionQuery(event.target.value)}
                          />
                          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                            {connectionOptions.slice(0, 8).map((contact) => (
                              <button
                                key={contact.id}
                                type="button"
                                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3 text-left transition hover:border-sky-400/40"
                                onClick={() => patchConnections(selectedContact.id, { add: [contact.id] }).catch(() => undefined)}
                              >
                                <div>
                                  <p className="font-medium text-white">{fullName(contact)}</p>
                                  <p className="text-sm text-slate-500">{titleLine(contact)}</p>
                                </div>
                                <UserPlus className="h-4 w-4 text-slate-400" />
                              </button>
                            ))}
                          </div>
                        </InfoCard>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-3">
                        <InfoCard title="Introduced By Chain">
                          <p className="text-sm text-slate-300">{selectedContact.introducedBy || "No introduction chain recorded."}</p>
                        </InfoCard>
                        <InfoCard title="Mutual Tags">
                          <div className="flex flex-wrap gap-2">
                            {mutualTagContacts.slice(0, 8).map((contact) => (
                              <button key={contact.id} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:text-white" onClick={() => setSelectedContactId(contact.id)}>
                                {fullName(contact)}
                              </button>
                            ))}
                            {!mutualTagContacts.length ? <span className="text-sm text-slate-500">No mutual tags yet.</span> : null}
                          </div>
                        </InfoCard>
                        <InfoCard title="Same City">
                          <div className="flex flex-wrap gap-2">
                            {sameCityContacts.slice(0, 8).map((contact) => (
                              <button key={contact.id} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:text-white" onClick={() => setSelectedContactId(contact.id)}>
                                {fullName(contact)}
                              </button>
                            ))}
                            {!sameCityContacts.length ? <span className="text-sm text-slate-500">No same-city contacts.</span> : null}
                          </div>
                        </InfoCard>
                      </div>
                    </div>
                  ) : null}

                  {activeTab === "ai" ? (
                    <div className="space-y-4">
                      <InfoCard title="Ask Anything">
                        <form
                          className="grid gap-3"
                          onSubmit={(event) => {
                            event.preventDefault();
                            askAi(aiPrompt).catch(() => undefined);
                          }}
                        >
                          <input
                            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60"
                            placeholder="Ask anything about this contact"
                            value={aiPrompt}
                            onChange={(event) => setAiPrompt(event.target.value)}
                          />
                          <div className="flex flex-wrap gap-2">
                            {[
                              "Summarize my relationship with this person",
                              "When should I follow up?",
                              "What do we have in common?",
                              "Draft a follow-up email",
                              "What should I know before our next meeting?",
                            ].map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:text-white"
                                onClick={() => askAi(prompt).catch(() => undefined)}
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="rounded-xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-2 text-sm font-medium text-white" type="submit">
                              Ask
                            </button>
                            <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:text-white" type="button" onClick={() => suggestTags().catch(() => undefined)}>
                              <span className="inline-flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Suggest tags & interests
                              </span>
                            </button>
                          </div>
                        </form>
                      </InfoCard>

                      <InfoCard title="Conversation History">
                        <div className="space-y-3">
                          {selectedAiHistory.map((message) => (
                            <div key={message.id} className={cn("rounded-2xl border p-4", message.role === "assistant" ? "border-sky-400/20 bg-sky-500/8" : "border-white/10 bg-slate-950/50")}>
                              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{message.role === "assistant" ? "AI" : "You"}</div>
                              <div className="whitespace-pre-wrap text-sm text-slate-100">{message.content}</div>
                            </div>
                          ))}
                          {!selectedAiHistory.length ? <p className="text-sm text-slate-500">No AI history yet.</p> : null}
                        </div>
                      </InfoCard>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-slate-500">Select a contact to view details.</div>
            )}
          </main>
        </div>

        <footer className="mt-4 flex items-center justify-between rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-slate-400 backdrop-blur-xl">
          <span>{selectedContact?.connections.length ?? 0} connections</span>
          <span>Last synced: {lastSyncedAt ? `${secondsSinceSync}s ago` : "never"}</span>
        </footer>
      </div>

      {addContactOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Add Contact</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Create a new Rolodex entry</h2>
              </div>
              <button className="rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-300" onClick={() => setAddContactOpen(false)}>
                Close
              </button>
            </div>

            <form className="grid gap-3 md:grid-cols-2" onSubmit={createContact}>
              {[
                ["firstName", "First Name"],
                ["lastName", "Last Name"],
                ["email", "Email"],
                ["phone", "Phone"],
                ["company", "Company"],
                ["title", "Title"],
                ["city", "City"],
                ["state", "State"],
                ["tags", "Tags"],
              ].map(([key, label]) => (
                <label key={key} className="grid gap-2 text-sm text-slate-300">
                  <span>{label}</span>
                  <input
                    className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none transition focus:border-sky-400/60"
                    value={contactDraft[key as keyof ContactDraft] as string}
                    onChange={(event) => setContactDraft((current) => ({ ...current, [key]: event.target.value }))}
                  />
                </label>
              ))}

              <label className="grid gap-2 text-sm text-slate-300">
                <span>Relationship Type</span>
                <select
                  className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white outline-none transition focus:border-sky-400/60"
                  value={contactDraft.relationshipType}
                  onChange={(event) => setContactDraft((current) => ({ ...current, relationshipType: event.target.value as RelationshipType }))}
                >
                  {RELATIONSHIP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {RELATIONSHIP_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <button className="rounded-xl bg-[linear-gradient(135deg,_#38bdf8,_#2563eb)] px-4 py-2 text-sm font-medium text-white" type="submit">
                  Create Contact
                </button>
                <button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300" type="button" onClick={() => setAddContactOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
