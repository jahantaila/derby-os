"use client";

import { type ReactNode, ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  Brain,
  Building2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Globe,
  KanbanSquare,
  Mail,
  Map as MapIcon,
  MapPin,
  Phone,
  PhoneCall,
  Plus,
  Pencil,
  Search,
  SendHorizontal,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneLogEntry, PIPELINE_STAGES, PipelineDeal, PipelineStage } from "@/lib/pipeline-types";

type SortMode = "newest" | "alphabetical" | "stage";
type PipelineSubview = "dashboard" | "kanban" | "segments" | "contacts";

type QuickNoteEntry = {
  id: string;
  text: string;
  timestamp: string;
};

type DealNotesState = {
  rolodex: string;
  quickNotes: QuickNoteEntry[];
};

type AddContactForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  source: string;
  stage: PipelineStage;
  notes: string;
  tags: string[];
};

type CsvImportRow = {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  stage: PipelineStage;
  notes: string;
  competitor: string;
};

type SourceTab = {
  value: string;
  label: string;
  count: number;
};

type SubviewTab = {
  value: PipelineSubview;
  label: string;
  icon: typeof BarChart3;
};

type InsightResponse = {
  response: string;
  contacts?: string[];
};

type ActivityEntry = {
  id: string;
  type: "created" | "stage-change";
  name: string;
  stage?: PipelineStage;
  timestamp: string;
};

type SegmentsFilters = {
  city: string;
  state: string;
  tag: string;
  source: string;
  stage: string;
  dateFrom: string;
  dateTo: string;
};

type SegmentsSortKey = "name" | "company" | "email" | "city" | "state" | "tags" | "stage" | "source" | "created";
type SegmentsSortDirection = "asc" | "desc";

const EASTERN_TIME_ZONE = "America/New_York";
const SOURCE_TABS_CONFIG = [
  { value: "all", label: "ALL" },
  { value: "instantly", label: "INSTANTLY" },
] as const;
const SUBVIEW_TABS: SubviewTab[] = [
  { value: "dashboard", label: "DASHBOARD", icon: BarChart3 },
  { value: "kanban", label: "KANBAN", icon: KanbanSquare },
  { value: "segments", label: "SEGMENTS", icon: Download },
  { value: "contacts", label: "CONTACTS", icon: Users },
];
const INSIGHT_PROMPTS = [
  "Meeting prep for [contact name]",
  "Summary of all interested leads",
  "Which leads need follow-up?",
] as const;
const EMPTY_NOTES: DealNotesState = { rolodex: "", quickNotes: [] };
const EMPTY_ADD_FORM: AddContactForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  source: "manual",
  stage: "new-lead",
  notes: "",
  tags: [],
};
const EMPTY_SEGMENTS_FILTERS: SegmentsFilters = {
  city: "",
  state: "",
  tag: "",
  source: "",
  stage: "",
  dateFrom: "",
  dateTo: "",
};
const TAG_SUGGESTIONS = ["SpotHopper", "BentoBox", "Owner.com", "Popmenu", "Fisherman", "Hot Lead", "Follow Up", "VIP"] as const;
const TAG_PILL_STYLES = [
  "border-blue-300/30 bg-blue-500/15 text-blue-100",
  "border-emerald-300/30 bg-emerald-500/15 text-emerald-100",
  "border-amber-300/30 bg-amber-500/15 text-amber-100",
  "border-violet-300/30 bg-violet-500/15 text-violet-100",
  "border-cyan-300/30 bg-cyan-500/15 text-cyan-100",
  "border-rose-300/30 bg-rose-500/15 text-rose-100",
] as const;
const HEADER_TAG_PILL_CLASS = "border-red-400/40 bg-red-500/20 text-red-200";
const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

const STAGE_META: Record<PipelineStage, { label: string; color: string; pill: string }> = {
  "new-lead": {
    label: "New Lead",
    color: "#3B82F6",
    pill: "border-blue-400/30 bg-blue-500/15 text-blue-100",
  },
  contacted: {
    label: "Contacted",
    color: "#06B6D4",
    pill: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
  },
  interested: {
    label: "Interested",
    color: "#10B981",
    pill: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  },
  "scheduled-meeting": {
    label: "Scheduled Meeting",
    color: "#F59E0B",
    pill: "border-amber-400/30 bg-amber-500/15 text-amber-100",
  },
  "attended-meeting": {
    label: "Attended Meeting",
    color: "#F97316",
    pill: "border-orange-400/30 bg-orange-500/15 text-orange-100",
  },
  negotiating: {
    label: "Negotiating",
    color: "#8B5CF6",
    pill: "border-violet-400/30 bg-violet-500/15 text-violet-100",
  },
  "closed-won": {
    label: "Closed Won",
    color: "#22C55E",
    pill: "border-green-400/30 bg-green-500/15 text-green-100",
  },
  "closed-lost": {
    label: "Closed Lost",
    color: "#6B7280",
    pill: "border-slate-400/30 bg-slate-500/15 text-slate-100",
  },
};

const easternDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: EASTERN_TIME_ZONE,
});

const easternDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: EASTERN_TIME_ZONE,
});

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPrimaryName(deal: PipelineDeal) {
  return deal.contact || deal.name;
}

function getCompanyName(deal: PipelineDeal) {
  return deal.client || deal.name;
}

function getPhone(deal: PipelineDeal) {
  return deal.enrichmentData?.phone || "";
}

function getWebsite(deal: PipelineDeal) {
  return deal.website || deal.enrichmentData?.website || "";
}

function formatLocation(city?: string, state?: string) {
  const parts = [city?.trim(), state?.trim()].filter(Boolean);
  return parts.join(", ");
}

function formatSourceLabel(source: string) {
  return source.trim().toUpperCase() || "UNKNOWN";
}

function normalizeSourceValue(source: string) {
  return source.trim().toLowerCase() || "manual";
}

function getSourceTabs(deals: PipelineDeal[]): SourceTab[] {
  const counts = new Map<string, number>();

  deals.forEach((deal) => {
    const key = normalizeSourceValue(deal.source);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return SOURCE_TABS_CONFIG.map((tab) => ({
    value: tab.value,
    label: tab.label,
    count: tab.value === "all" ? deals.length : counts.get(tab.value) ?? 0,
  }));
}

function getSourceOptionLabel(tab: SourceTab) {
  const normalized = tab.label.charAt(0) + tab.label.slice(1).toLowerCase();
  return `${normalized} (${tab.count})`;
}

function formatCreatedAt(value?: string) {
  if (!value) return "Unknown";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return easternDateFormatter.format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return easternDateTimeFormatter.format(parsed);
}

function formatPhoneLogDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    timeZone: EASTERN_TIME_ZONE,
  });
  return formatter.format(date);
}

function isCurrentEasternMonth(value?: string) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  const nowFormatter = new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    year: "numeric",
    timeZone: EASTERN_TIME_ZONE,
  });

  return nowFormatter.format(parsed) === nowFormatter.format(new Date());
}

function isWithinLastSevenDays(value?: string) {
  if (!value) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() - parsed.getTime() <= 7 * 24 * 60 * 60 * 1000;
}

function parseNotes(raw: string, fallbackDate?: string): DealNotesState {
  const trimmed = raw.trim();
  const fallbackTimestamp = fallbackDate ? `${fallbackDate}T12:00:00.000Z` : new Date().toISOString();

  if (!trimmed) return EMPTY_NOTES;

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    if (Array.isArray(parsed)) {
      const entries = parsed
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const candidate = entry as { text?: unknown; timestamp?: unknown };
          if (typeof candidate.text !== "string" || !candidate.text.trim()) return null;
          return {
            id: makeId("note"),
            text: candidate.text.trim(),
            timestamp: typeof candidate.timestamp === "string" && candidate.timestamp ? candidate.timestamp : fallbackTimestamp,
          };
        })
        .filter((entry): entry is QuickNoteEntry => entry !== null);

      if (!entries.length) return EMPTY_NOTES;

      const [rolodex, ...quickNotes] = entries;
      return { rolodex: rolodex.text, quickNotes };
    }

    if (parsed && typeof parsed === "object") {
      const candidate = parsed as { rolodex?: unknown; relationshipNote?: unknown; quickNotes?: unknown };
      const quickNotes = Array.isArray(candidate.quickNotes)
        ? candidate.quickNotes
            .map((entry) => {
              if (!entry || typeof entry !== "object") return null;
              const quickNote = entry as { id?: unknown; text?: unknown; timestamp?: unknown };
              if (typeof quickNote.text !== "string" || !quickNote.text.trim()) return null;
              return {
                id: typeof quickNote.id === "string" && quickNote.id ? quickNote.id : makeId("note"),
                text: quickNote.text.trim(),
                timestamp:
                  typeof quickNote.timestamp === "string" && quickNote.timestamp ? quickNote.timestamp : fallbackTimestamp,
              };
            })
            .filter((entry): entry is QuickNoteEntry => entry !== null)
        : [];

      return {
        rolodex:
          (typeof candidate.rolodex === "string" && candidate.rolodex.trim()) ||
          (typeof candidate.relationshipNote === "string" && candidate.relationshipNote.trim()) ||
          "",
        quickNotes,
      };
    }
  } catch {}

  return {
    rolodex: trimmed,
    quickNotes: [],
  };
}

function serializeNotes(notes: DealNotesState) {
  return JSON.stringify({
    rolodex: notes.rolodex.trim(),
    quickNotes: notes.quickNotes
      .filter((entry) => entry.text.trim())
      .map((entry) => ({
        id: entry.id,
        text: entry.text.trim(),
        timestamp: entry.timestamp,
      })),
  });
}

function sortDeals(deals: PipelineDeal[], sortMode: SortMode) {
  const next = [...deals];

  if (sortMode === "alphabetical") {
    return next.sort((a, b) => getPrimaryName(a).localeCompare(getPrimaryName(b)));
  }

  if (sortMode === "stage") {
    return next.sort((a, b) => {
      const aIndex = PIPELINE_STAGES.indexOf(a.stage);
      const bIndex = PIPELINE_STAGES.indexOf(b.stage);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return getPrimaryName(a).localeCompare(getPrimaryName(b));
    });
  }

  return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function getSearchableText(deal: PipelineDeal) {
  const notes = parseNotes(deal.notes, deal.createdAt);
  return [
    getPrimaryName(deal),
    getCompanyName(deal),
    deal.email,
    getPhone(deal),
    getWebsite(deal),
    deal.competitor ?? "",
    ...deal.tags,
    notes.rolodex,
    ...notes.quickNotes.map((entry) => entry.text),
    ...deal.phoneLog.map((entry) => entry.notes),
  ]
    .join(" ")
    .toLowerCase();
}

function getSegmentsSearchableText(deal: PipelineDeal) {
  const notes = parseNotes(deal.notes, deal.createdAt);
  return [
    getPrimaryName(deal),
    getCompanyName(deal),
    deal.email,
    deal.city ?? "",
    deal.state ?? "",
    getPhone(deal),
    ...deal.tags,
    notes.rolodex,
    ...notes.quickNotes.map((entry) => entry.text),
  ]
    .join(" ")
    .toLowerCase();
}

function normalizeTagValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function hasTag(tags: string[], value: string) {
  const normalized = normalizeTagValue(value).toLowerCase();
  return tags.some((tag) => tag.toLowerCase() === normalized);
}

function addTag(tags: string[], value: string) {
  const normalized = normalizeTagValue(value);
  if (!normalized || hasTag(tags, normalized)) return tags;
  return [...tags, normalized];
}

function removeTag(tags: string[], value: string) {
  const normalized = value.toLowerCase();
  return tags.filter((tag) => tag.toLowerCase() !== normalized);
}

function getUniqueTags(deals: PipelineDeal[]) {
  const unique: string[] = [];
  const seen = new Set<string>();

  deals.forEach((deal) => {
    deal.tags.forEach((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(tag);
    });
  });

  return unique.sort((a, b) => a.localeCompare(b));
}

function getTagPillClass(index: number) {
  return TAG_PILL_STYLES[index % TAG_PILL_STYLES.length];
}

function getUniqueValues(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
}

function getCompetitorTagOptions(deals: PipelineDeal[]) {
  return getUniqueValues(deals.flatMap((deal) => [deal.competitor, ...deal.tags]));
}

function getDateOnlyValue(value?: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (!text.includes(",") && !text.includes('"') && !text.includes("\n")) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function normalizeStageValue(value: string): PipelineStage {
  return PIPELINE_STAGES.includes(value as PipelineStage) ? (value as PipelineStage) : "new-lead";
}

function getActivityTimestamp(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function buildRecentActivity(deals: PipelineDeal[]) {
  return deals
    .flatMap((deal) => {
      const createdTimestamp = /^\d{4}-\d{2}-\d{2}$/.test(deal.createdAt) ? `${deal.createdAt}T12:00:00.000Z` : deal.createdAt;
      const entries: ActivityEntry[] = [
        {
          id: `${deal.id}-created`,
          type: "created",
          name: getPrimaryName(deal),
          timestamp: createdTimestamp,
        },
      ];

      if (deal.stageUpdatedAt && deal.stageUpdatedAt !== deal.createdAt) {
        entries.push({
          id: `${deal.id}-stage`,
          type: "stage-change",
          name: getPrimaryName(deal),
          stage: deal.stage,
          timestamp: /^\d{4}-\d{2}-\d{2}$/.test(deal.stageUpdatedAt) ? `${deal.stageUpdatedAt}T12:00:00.000Z` : deal.stageUpdatedAt,
        });
      }

      return entries;
    })
    .sort((a, b) => getActivityTimestamp(b.timestamp) - getActivityTimestamp(a.timestamp))
    .slice(0, 10);
}

function SelectOptions({ values, getLabel }: { values: readonly string[]; getLabel: (value: string) => string }) {
  return (
    <>
      {values.map((value) => (
        <option key={value} value={value} className="text-black" style={{ color: "black" }}>
          {getLabel(value)}
        </option>
      ))}
    </>
  );
}

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
  suggestions = TAG_SUGGESTIONS,
  alwaysShowSuggestions = false,
}: {
  tags: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  suggestions?: readonly string[];
  alwaysShowSuggestions?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  const visibleSuggestions = suggestions.filter((suggestion) => !hasTag(tags, suggestion));

  function submitTag() {
    const next = normalizeTagValue(draft);
    if (!next) return;
    onAdd(next);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      {tags.length ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em]",
                getTagPillClass(index),
              )}
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => onRemove(tag)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-current/80 transition hover:text-current"
                aria-label={`Remove ${tag}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_48px]">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitTag();
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
        />
        <button
          type="button"
          onClick={submitTag}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] text-white"
          aria-label="Add tag"
        >
          <Plus size={16} />
        </button>
      </div>

      {(alwaysShowSuggestions || focused) && visibleSuggestions.length ? (
        <div className="flex flex-wrap gap-2">
          {visibleSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onAdd(suggestion)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] transition hover:brightness-110",
                getTagPillClass(index),
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AIInsightsPanel({
  query,
  onQueryChange,
  onSubmit,
  onPromptSelect,
  loading,
  response,
  className,
  responseClassName,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  onPromptSelect: (value: string) => void;
  loading: boolean;
  response: string;
  className?: string;
  responseClassName?: string;
}) {
  return (
    <section className={cn("glass-card rounded-2xl p-4", className)}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
        <Brain size={14} className="text-blue-200" />
        <span>AI INSIGHTS</span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="Ask about any contact..."
          className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !query.trim()}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <SendHorizontal size={16} />
          Send
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {INSIGHT_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPromptSelect(prompt)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-blue-300/30 hover:text-white"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className={cn("glass-card mt-4 min-h-[180px] rounded-2xl p-4", responseClassName)}>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-blue-100">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-300" />
            <span className="animate-pulse">Thinking...</span>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none text-slate-200">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        )}
      </div>
    </section>
  );
}

function ModalShell({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-[#02040a]/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="absolute left-1/2 top-4 w-[calc(100%-1rem)] max-w-4xl -translate-x-1/2 px-2 sm:w-full sm:px-4">
        <div className="glass-panel max-h-[90vh] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="glass-card inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm text-blue-100">
                {icon}
                <span>{title}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-blue-300/40 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const router = useRouter();
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSubview, setActiveSubview] = useState<PipelineSubview>("dashboard");
  const [activeSource, setActiveSource] = useState("all");
  const [activeTagFilter, setActiveTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [visibleCount, setVisibleCount] = useState(25);
  const [selectedId, setSelectedId] = useState("");
  const [mobileOpenId, setMobileOpenId] = useState("");
  const [rolodexDraft, setRolodexDraft] = useState("");
  const [quickNoteDraft, setQuickNoteDraft] = useState("");
  const [showPhoneComposer, setShowPhoneComposer] = useState(false);
  const [phoneDateDraft, setPhoneDateDraft] = useState("");
  const [phoneNotesDraft, setPhoneNotesDraft] = useState("");
  const [editingPhoneId, setEditingPhoneId] = useState("");
  const [editingPhoneDateDraft, setEditingPhoneDateDraft] = useState("");
  const [editingPhoneNotesDraft, setEditingPhoneNotesDraft] = useState("");
  const [editingQuickNoteId, setEditingQuickNoteId] = useState("");
  const [editingQuickNoteDraft, setEditingQuickNoteDraft] = useState("");
  const [editingLocationField, setEditingLocationField] = useState<"city" | "state" | "">("");
  const [editingLocationDraft, setEditingLocationDraft] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [addForm, setAddForm] = useState<AddContactForm>(EMPTY_ADD_FORM);
  const [submittingContact, setSubmittingContact] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<CsvImportRow[]>([]);
  const [importPreviewError, setImportPreviewError] = useState("");
  const [importing, setImporting] = useState(false);
  const [workingDealId, setWorkingDealId] = useState("");
  const [convertingDealId, setConvertingDealId] = useState("");
  const [insightsQuery, setInsightsQuery] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsResponse, setInsightsResponse] = useState(
    "I can help with meeting prep, lead summaries, and follow-up recommendations. Try asking about a specific contact!",
  );
  const [draggedDealId, setDraggedDealId] = useState("");
  const [dropStage, setDropStage] = useState<PipelineStage | "">("");
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [segmentsFilters, setSegmentsFilters] = useState<SegmentsFilters>(EMPTY_SEGMENTS_FILTERS);
  const [segmentsSearch, setSegmentsSearch] = useState("");
  const [segmentsVisibleCount, setSegmentsVisibleCount] = useState(50);
  const [segmentsSortKey, setSegmentsSortKey] = useState<SegmentsSortKey>("created");
  const [segmentsSortDirection, setSegmentsSortDirection] = useState<SegmentsSortDirection>("desc");
  const tagEditorRef = useRef<HTMLDivElement | null>(null);
  const [kanbanVisibleCounts, setKanbanVisibleCounts] = useState<Record<PipelineStage, number>>({
    "new-lead": 20,
    contacted: 20,
    interested: 20,
    "scheduled-meeting": 20,
    "attended-meeting": 20,
    negotiating: 20,
    "closed-won": 20,
    "closed-lost": 20,
  });

  async function loadDeals() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/pipeline", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load pipeline.");
      setDeals((await response.json()) as PipelineDeal[]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load pipeline.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeals();
  }, []);

  const sourceTabs = useMemo(() => getSourceTabs(deals), [deals]);
  const availableTags = useMemo(() => getUniqueTags(deals), [deals]);

  const filteredDeals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = deals.filter((deal) => {
      const sourceMatch = activeSource === "all" || normalizeSourceValue(deal.source) === activeSource;
      const tagMatch = !activeTagFilter || hasTag(deal.tags, activeTagFilter);
      const searchMatch = !normalizedSearch || getSearchableText(deal).includes(normalizedSearch);
      return sourceMatch && tagMatch && searchMatch;
    });

    return sortDeals(filtered, sortMode);
  }, [activeSource, activeTagFilter, deals, search, sortMode]);

  useEffect(() => {
    setVisibleCount(25);
  }, [activeSource, activeTagFilter, search, sortMode]);

  useEffect(() => {
    setKanbanVisibleCounts({
      "new-lead": 20,
      contacted: 20,
      interested: 20,
      "scheduled-meeting": 20,
      "attended-meeting": 20,
      negotiating: 20,
      "closed-won": 20,
      "closed-lost": 20,
    });
  }, [deals]);

  useEffect(() => {
    setSegmentsVisibleCount(50);
  }, [segmentsFilters, segmentsSearch, segmentsSortDirection, segmentsSortKey]);

  useEffect(() => {
    if (activeTagFilter && !availableTags.some((tag) => tag.toLowerCase() === activeTagFilter.toLowerCase())) {
      setActiveTagFilter("");
    }
  }, [activeTagFilter, availableTags]);

  useEffect(() => {
    if (!filteredDeals.length) {
      setSelectedId("");
      setMobileOpenId("");
      return;
    }

    if (!filteredDeals.some((deal) => deal.id === selectedId)) {
      setSelectedId(filteredDeals[0].id);
    }

    if (mobileOpenId && !filteredDeals.some((deal) => deal.id === mobileOpenId)) {
      setMobileOpenId("");
    }
  }, [filteredDeals, mobileOpenId, selectedId]);

  const selectedDeal = useMemo(() => deals.find((deal) => deal.id === selectedId) ?? null, [deals, selectedId]);
  const activeDetailId = mobileOpenId || selectedId;
  const activeDetailDeal = useMemo(() => deals.find((deal) => deal.id === activeDetailId) ?? null, [activeDetailId, deals]);

  useEffect(() => {
    if (!selectedDeal) {
      setRolodexDraft("");
      setQuickNoteDraft("");
      setShowPhoneComposer(false);
      setPhoneDateDraft("");
      setPhoneNotesDraft("");
      setEditingPhoneId("");
      setEditingPhoneDateDraft("");
      setEditingPhoneNotesDraft("");
      setEditingQuickNoteId("");
      setEditingQuickNoteDraft("");
      setEditingLocationField("");
      setEditingLocationDraft("");
      return;
    }

    const parsed = parseNotes(selectedDeal.notes, selectedDeal.createdAt);
    setRolodexDraft(parsed.rolodex);
    setQuickNoteDraft("");
    setShowPhoneComposer(false);
    setPhoneDateDraft(formatPhoneLogDate());
    setPhoneNotesDraft("");
    setEditingPhoneId("");
    setEditingPhoneDateDraft("");
    setEditingPhoneNotesDraft("");
    setEditingQuickNoteId("");
    setEditingQuickNoteDraft("");
    setEditingLocationField("");
    setEditingLocationDraft("");
  }, [selectedDeal]);

  useEffect(() => {
    setShowTagEditor(false);
  }, [activeDetailId]);

  useEffect(() => {
    setEditingLocationField("");
    setEditingLocationDraft("");
  }, [activeDetailId]);

  useEffect(() => {
    if (!showTagEditor) return;

    function handlePointerDown(event: MouseEvent) {
      if (!tagEditorRef.current?.contains(event.target as Node)) {
        setShowTagEditor(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showTagEditor]);

  const selectedNotes = useMemo(
    () => (selectedDeal ? parseNotes(selectedDeal.notes, selectedDeal.createdAt) : EMPTY_NOTES),
    [selectedDeal],
  );

  const phoneLog = useMemo(() => {
    if (!activeDetailDeal) return [];
    return [...activeDetailDeal.phoneLog].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeDetailDeal]);

  const stageDistribution = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => ({
        stage,
        count: deals.filter((deal) => deal.stage === stage).length,
      })),
    [deals],
  );

  const sourceBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    deals.forEach((deal) => {
      const key = normalizeSourceValue(deal.source);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source));
  }, [deals]);

  const recentActivity = useMemo(() => buildRecentActivity(deals), [deals]);
  const segmentCities = useMemo(() => getUniqueValues(deals.map((deal) => deal.city)), [deals]);
  const segmentStates = useMemo(() => getUniqueValues(deals.map((deal) => deal.state)), [deals]);
  const segmentTags = useMemo(() => getCompetitorTagOptions(deals), [deals]);
  const segmentSources = useMemo(() => getUniqueValues(deals.map((deal) => normalizeSourceValue(deal.source))), [deals]);

  const segmentedDeals = useMemo(() => {
    const normalizedSegmentsSearch = segmentsSearch.trim().toLowerCase();
    const filtered = deals.filter((deal) => {
      if (segmentsFilters.city && (deal.city ?? "").trim() !== segmentsFilters.city) return false;
      if (segmentsFilters.state && (deal.state ?? "").trim() !== segmentsFilters.state) return false;
      if (segmentsFilters.tag) {
        const matchesTag = deal.tags.some((tag) => tag === segmentsFilters.tag) || (deal.competitor ?? "") === segmentsFilters.tag;
        if (!matchesTag) return false;
      }
      if (segmentsFilters.source && normalizeSourceValue(deal.source) !== segmentsFilters.source) return false;
      if (segmentsFilters.stage && deal.stage !== segmentsFilters.stage) return false;

      const createdDate = getDateOnlyValue(deal.createdAt);
      if (segmentsFilters.dateFrom && (!createdDate || createdDate < segmentsFilters.dateFrom)) return false;
      if (segmentsFilters.dateTo && (!createdDate || createdDate > segmentsFilters.dateTo)) return false;
      if (normalizedSegmentsSearch && !getSegmentsSearchableText(deal).includes(normalizedSegmentsSearch)) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const leftValue = (() => {
        switch (segmentsSortKey) {
          case "name":
            return getPrimaryName(a);
          case "company":
            return getCompanyName(a);
          case "email":
            return a.email;
          case "city":
            return a.city ?? "";
          case "state":
            return a.state ?? "";
          case "tags":
            return [a.competitor, ...a.tags].filter(Boolean).join(", ");
          case "stage":
            return STAGE_META[a.stage].label;
          case "source":
            return formatSourceLabel(a.source);
          case "created":
            return a.createdAt;
        }
      })();

      const rightValue = (() => {
        switch (segmentsSortKey) {
          case "name":
            return getPrimaryName(b);
          case "company":
            return getCompanyName(b);
          case "email":
            return b.email;
          case "city":
            return b.city ?? "";
          case "state":
            return b.state ?? "";
          case "tags":
            return [b.competitor, ...b.tags].filter(Boolean).join(", ");
          case "stage":
            return STAGE_META[b.stage].label;
          case "source":
            return formatSourceLabel(b.source);
          case "created":
            return b.createdAt;
        }
      })();

      const comparison =
        segmentsSortKey === "created"
          ? new Date(String(leftValue)).getTime() - new Date(String(rightValue)).getTime()
          : String(leftValue).localeCompare(String(rightValue));

      return segmentsSortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [deals, segmentsFilters, segmentsSearch, segmentsSortDirection, segmentsSortKey]);
  const activeSegmentsFilters = useMemo(
    () =>
      [
        segmentsFilters.city ? { key: "city", label: `City: ${segmentsFilters.city}` } : null,
        segmentsFilters.state ? { key: "state", label: `State: ${segmentsFilters.state}` } : null,
        segmentsFilters.tag ? { key: "tag", label: `Competitor/Tag: ${segmentsFilters.tag}` } : null,
        segmentsFilters.source ? { key: "source", label: `Source: ${formatSourceLabel(segmentsFilters.source)}` } : null,
        segmentsFilters.stage
          ? { key: "stage", label: `Stage: ${STAGE_META[segmentsFilters.stage as PipelineStage].label}` }
          : null,
        segmentsFilters.dateFrom ? { key: "dateFrom", label: `From: ${segmentsFilters.dateFrom}` } : null,
        segmentsFilters.dateTo ? { key: "dateTo", label: `To: ${segmentsFilters.dateTo}` } : null,
      ].filter((entry): entry is { key: keyof SegmentsFilters; label: string } => entry !== null),
    [segmentsFilters],
  );
  const totalContacts = deals.length;
  const newThisWeek = useMemo(() => deals.filter((deal) => isWithinLastSevenDays(deal.createdAt)).length, [deals]);
  const wonThisMonth = useMemo(
    () => deals.filter((deal) => deal.stage === "closed-won" && isCurrentEasternMonth(deal.stageUpdatedAt ?? deal.createdAt)).length,
    [deals],
  );
  const conversionRate = totalContacts ? Math.round((wonThisMonth / totalContacts) * 100) : 0;
  const maxStageCount = Math.max(...stageDistribution.map((entry) => entry.count), 0);
  const maxSourceCount = Math.max(...sourceBreakdown.map((entry) => entry.count), 0);

  async function submitInsightsQuery(nextQuery?: string) {
    const query = (nextQuery ?? insightsQuery).trim();
    if (!query) return;

    setInsightsQuery(query);
    setInsightsLoading(true);

    try {
      const response = await fetch("/api/pipeline/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, contacts: deals }),
      });

      if (!response.ok) {
        throw new Error("Unable to generate insights.");
      }

      const data = (await response.json()) as InsightResponse;
      setInsightsResponse(data.response);
    } catch (caughtError) {
      setInsightsResponse(caughtError instanceof Error ? caughtError.message : "Unable to generate insights.");
    } finally {
      setInsightsLoading(false);
    }
  }

  async function patchDeal(id: string, patch: Partial<PipelineDeal>) {
    setWorkingDealId(id);

    try {
      const response = await fetch(`/api/pipeline/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        throw new Error("Unable to update contact.");
      }

      const updated = (await response.json()) as PipelineDeal;
      setDeals((current) => current.map((deal) => (deal.id === id ? updated : deal)));
      return updated;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update contact.");
      return null;
    } finally {
      setWorkingDealId("");
    }
  }

  async function saveRolodexNotes() {
    if (!selectedDeal) return;
    const current = parseNotes(selectedDeal.notes, selectedDeal.createdAt);
    const nextSerialized = serializeNotes({
      rolodex: rolodexDraft,
      quickNotes: current.quickNotes,
    });

    if (nextSerialized === selectedDeal.notes) return;
    await patchDeal(selectedDeal.id, { notes: nextSerialized });
  }

  async function addQuickNote() {
    if (!selectedDeal || !quickNoteDraft.trim()) return;
    const current = parseNotes(selectedDeal.notes, selectedDeal.createdAt);
    const nextSerialized = serializeNotes({
      rolodex: current.rolodex,
      quickNotes: [
        {
          id: makeId("note"),
          text: quickNoteDraft.trim(),
          timestamp: new Date().toISOString(),
        },
        ...current.quickNotes,
      ],
    });
    await patchDeal(selectedDeal.id, { notes: nextSerialized });
    setQuickNoteDraft("");
  }

  async function addPhoneCall() {
    if (!selectedDeal || !phoneNotesDraft.trim()) return;
    const nextEntry: PhoneLogEntry = {
      id: makeId("call"),
      date: phoneDateDraft || formatPhoneLogDate(),
      notes: phoneNotesDraft.trim(),
      createdAt: new Date().toISOString(),
    };

    await patchDeal(selectedDeal.id, {
      phoneLog: [nextEntry, ...selectedDeal.phoneLog],
    });

    setPhoneNotesDraft("");
    setPhoneDateDraft(formatPhoneLogDate());
    setShowPhoneComposer(false);
  }

  function startEditingPhoneCall(entry: PhoneLogEntry) {
    setEditingPhoneId(entry.id);
    setEditingPhoneDateDraft(entry.date);
    setEditingPhoneNotesDraft(entry.notes);
  }

  function cancelEditingPhoneCall() {
    setEditingPhoneId("");
    setEditingPhoneDateDraft("");
    setEditingPhoneNotesDraft("");
  }

  async function savePhoneCallEdit(deal: PipelineDeal, callId: string) {
    const nextNotes = editingPhoneNotesDraft.trim();
    const nextDate = editingPhoneDateDraft.trim() || formatPhoneLogDate();
    if (!nextNotes) return;

    const nextPhoneLog = deal.phoneLog.map((entry) =>
      entry.id === callId
        ? {
            ...entry,
            date: nextDate,
            notes: nextNotes,
          }
        : entry,
    );

    const updated = await patchDeal(deal.id, { phoneLog: nextPhoneLog });
    if (updated) cancelEditingPhoneCall();
  }

  async function deletePhoneCall(deal: PipelineDeal, callId: string) {
    if (!window.confirm("Delete this phone call entry?")) return;
    await patchDeal(deal.id, {
      phoneLog: deal.phoneLog.filter((entry) => entry.id !== callId),
    });
  }

  function startEditingQuickNote(entry: QuickNoteEntry) {
    setEditingQuickNoteId(entry.id);
    setEditingQuickNoteDraft(entry.text);
  }

  function cancelEditingQuickNote() {
    setEditingQuickNoteId("");
    setEditingQuickNoteDraft("");
  }

  async function saveQuickNoteEdit(deal: PipelineDeal, noteId: string) {
    const current = parseNotes(deal.notes, deal.createdAt);
    const nextText = editingQuickNoteDraft.trim();
    if (!nextText) return;

    const nextSerialized = serializeNotes({
      rolodex: current.rolodex,
      quickNotes: current.quickNotes.map((entry) => (entry.id === noteId ? { ...entry, text: nextText } : entry)),
    });

    const updated = await patchDeal(deal.id, { notes: nextSerialized });
    if (updated) cancelEditingQuickNote();
  }

  async function deleteQuickNote(deal: PipelineDeal, noteId: string) {
    if (!window.confirm("Delete this quick note?")) return;

    const current = parseNotes(deal.notes, deal.createdAt);
    await patchDeal(deal.id, {
      notes: serializeNotes({
        rolodex: current.rolodex,
        quickNotes: current.quickNotes.filter((entry) => entry.id !== noteId),
      }),
    });
  }

  function startEditingLocation(field: "city" | "state", value?: string) {
    setEditingLocationField(field);
    setEditingLocationDraft(value ?? "");
  }

  function cancelEditingLocation() {
    setEditingLocationField("");
    setEditingLocationDraft("");
  }

  async function saveLocationField(deal: PipelineDeal, field: "city" | "state") {
    const updated = await patchDeal(deal.id, { [field]: editingLocationDraft } as Partial<PipelineDeal>);
    if (updated) cancelEditingLocation();
  }

  function updateSegmentsFilter<Key extends keyof SegmentsFilters>(key: Key, value: SegmentsFilters[Key]) {
    setSegmentsFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleSegmentsSort(key: SegmentsSortKey) {
    if (segmentsSortKey === key) {
      setSegmentsSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSegmentsSortKey(key);
    setSegmentsSortDirection(key === "created" ? "desc" : "asc");
  }

  function downloadSegmentsExport(format: "csv" | "json") {
    const filename = `pipeline-segments-${new Date().toISOString().slice(0, 10)}.${format}`;
    const rows = segmentedDeals.map((deal) => ({
      id: deal.id,
      name: getPrimaryName(deal),
      company: getCompanyName(deal),
      email: deal.email,
      phone: getPhone(deal),
      website: getWebsite(deal),
      city: deal.city ?? "",
      state: deal.state ?? "",
      source: normalizeSourceValue(deal.source),
      sourceLabel: formatSourceLabel(deal.source),
      stage: deal.stage,
      stageLabel: STAGE_META[deal.stage].label,
      competitor: deal.competitor ?? "",
      tags: deal.tags.join(", "),
      createdAt: deal.createdAt,
      stageUpdatedAt: deal.stageUpdatedAt ?? "",
      rolodex: parseNotes(deal.notes, deal.createdAt).rolodex,
      quickNotes: parseNotes(deal.notes, deal.createdAt).quickNotes.map((entry) => entry.text).join(" | "),
      phoneLog: deal.phoneLog.map((entry) => `${entry.date}: ${entry.notes}`).join(" | "),
    }));

    const payload =
      format === "json"
        ? JSON.stringify(rows, null, 2)
        : [
            Object.keys(rows[0] ?? {
              id: "",
              name: "",
              company: "",
              email: "",
              phone: "",
              website: "",
              city: "",
              state: "",
              source: "",
              sourceLabel: "",
              stage: "",
              stageLabel: "",
              competitor: "",
              tags: "",
              createdAt: "",
              stageUpdatedAt: "",
              rolodex: "",
              quickNotes: "",
              phoneLog: "",
            }).join(","),
            ...rows.map((row) => Object.values(row).map(csvEscape).join(",")),
          ].join("\n");

    const blob = new Blob([payload], { type: format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function convertToClient(deal: PipelineDeal) {
    setConvertingDealId(deal.id);

    try {
      const notes = parseNotes(deal.notes, deal.createdAt);
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: getCompanyName(deal),
          clientType: "other",
          contactName: getPrimaryName(deal),
          email: deal.email,
          phone: getPhone(deal),
          website: getWebsite(deal),
          services: [],
          monthlyRetainer: deal.value,
          status: "active",
          notes: [notes.rolodex, deal.competitor ? `Competitor: ${deal.competitor}` : ""].filter(Boolean).join("\n"),
          createdAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Unable to convert contact to client.");
      const created = (await response.json()) as { id: string };
      router.push(`/clients/${created.id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to convert contact to client.");
    } finally {
      setConvertingDealId("");
    }
  }

  async function deleteContact(deal: PipelineDeal) {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;

    setWorkingDealId(deal.id);
    setError("");

    try {
      const response = await fetch(`/api/pipeline/${deal.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete contact.");
      }

      await loadDeals();
      setSelectedId("");
      setMobileOpenId("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete contact.");
    } finally {
      setWorkingDealId("");
    }
  }

  async function submitAddContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingContact(true);
    setError("");

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name,
          contact: addForm.name,
          client: addForm.company,
          email: addForm.email,
          phone: addForm.phone,
          city: addForm.city,
          state: addForm.state,
          source: addForm.source,
          stage: addForm.stage,
          notes: serializeNotes({ rolodex: addForm.notes, quickNotes: [] }),
          tags: addForm.tags,
        }),
      });

      if (!response.ok) throw new Error("Unable to create contact.");
      const created = (await response.json()) as PipelineDeal;

      setDeals((current) => [created, ...current]);
      setSelectedId(created.id);
      setMobileOpenId(created.id);
      setActiveSubview("contacts");
      setShowAddContact(false);
      setAddForm(EMPTY_ADD_FORM);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create contact.");
    } finally {
      setSubmittingContact(false);
    }
  }

  function handleCsvUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportPreviewError("");
    setImportRows([]);

    void file.text().then((text) => {
      try {
        const rows = parseCsv(text);
        if (rows.length < 2) throw new Error("CSV must include a header row and at least one contact.");

        const [headerRow, ...dataRows] = rows;
        const headers = headerRow.map((cell) => cell.trim().toLowerCase());

        const requiredHeaders = ["name", "company", "email", "phone", "source", "stage", "notes", "competitor"];
        const missing = requiredHeaders.filter((header) => !headers.includes(header));
        if (missing.length) throw new Error(`Missing columns: ${missing.join(", ")}`);

        const parsedRows = dataRows
          .map((cells) => {
            const getCell = (header: string) => cells[headers.indexOf(header)]?.trim() ?? "";
            return {
              name: getCell("name"),
              company: getCell("company"),
              email: getCell("email"),
              phone: getCell("phone"),
              source: normalizeSourceValue(getCell("source")),
              stage: normalizeStageValue(getCell("stage")),
              notes: getCell("notes"),
              competitor: getCell("competitor"),
            } satisfies CsvImportRow;
          })
          .filter((row) => row.name && row.company);

        if (!parsedRows.length) throw new Error("No valid contacts found in the CSV.");
        setImportRows(parsedRows);
      } catch (caughtError) {
        setImportPreviewError(caughtError instanceof Error ? caughtError.message : "Unable to read CSV.");
      }
    });

    event.target.value = "";
  }

  async function importCsvRows() {
    if (!importRows.length) return;
    setImporting(true);
    setImportPreviewError("");

    try {
      const created: PipelineDeal[] = [];

      for (const row of importRows) {
        const response = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name,
            contact: row.name,
            client: row.company,
            email: row.email,
            phone: row.phone,
            source: row.source,
            stage: row.stage,
            notes: serializeNotes({ rolodex: row.notes, quickNotes: [] }),
            competitor: row.competitor,
          }),
        });

        if (!response.ok) throw new Error("Unable to import CSV rows.");
        created.push((await response.json()) as PipelineDeal);
      }

      setDeals((current) => [...created, ...current]);
      setShowImportModal(false);
      setImportRows([]);
    } catch (caughtError) {
      setImportPreviewError(caughtError instanceof Error ? caughtError.message : "Unable to import CSV.");
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const template = [
      "name,company,email,phone,source,stage,notes,competitor",
      'Jamie Carter,Bluegrass Dental,jamie@bluegrassdental.com,502-555-0147,instantly,new-lead,"Asked about SEO and website refresh",Popmenu',
    ].join("\n");
    const blob = new Blob([template], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pipeline-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function openContact(dealId: string) {
    setSelectedId(dealId);
    setMobileOpenId(dealId);
    setActiveSubview("contacts");
  }

  async function handleKanbanDrop(stage: PipelineStage) {
    if (!draggedDealId) return;
    const deal = deals.find((entry) => entry.id === draggedDealId);
    setDropStage("");
    setDraggedDealId("");

    if (!deal || deal.stage === stage) return;
    await patchDeal(deal.id, { stage });
  }

  function parseCsv(text: string) {
    const rows: string[][] = [];
    let current = "";
    let row: string[] = [];
    let inQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const next = text[index + 1];

      if (character === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (character === "," && !inQuotes) {
        row.push(current);
        current = "";
        continue;
      }

      if ((character === "\n" || character === "\r") && !inQuotes) {
        if (character === "\r" && next === "\n") index += 1;
        row.push(current);
        if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
        row = [];
        current = "";
        continue;
      }

      current += character;
    }

    row.push(current);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);

    return rows;
  }

  const showMobileDetail = Boolean(mobileOpenId);
  const detailDeal = activeDetailDeal;

  if (loading) {
    return <section className="glass-panel rounded-2xl p-6 text-sm text-slate-300">Loading pipeline...</section>;
  }

  if (error && !deals.length) {
    return <section className="glass-panel rounded-2xl p-6 text-sm text-red-100">{error}</section>;
  }

  return (
    <section className="animate-enter space-y-4" style={{ animationDelay: "80ms" }}>
      <header className="glass-panel page-header p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Relationships</p>
            <h1 className="page-title mt-2">Pipeline</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              CRM analytics, stage movement, and contact management in a single pipeline workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="glass-card inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-200">
              <BarChart3 size={16} className="text-blue-200" />
              <span>{deals.length} total contacts</span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddContact(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
            >
              <Plus size={16} />
              Add Contact
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60"
            >
              <Upload size={16} />
              Import CSV
            </button>
          </div>
        </div>
      </header>

      <div className="glass-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1 px-3 pt-3">
            {SUBVIEW_TABS.map((tab) => {
              const active = activeSubview === tab.value;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveSubview(tab.value)}
                  className={cn(
                    "relative inline-flex items-center gap-2 whitespace-nowrap rounded-t-2xl border-b-2 px-4 py-3 text-xs font-semibold tracking-[0.18em] transition",
                    active ? "border-[#2093FF] text-[#7FC2FF]" : "border-transparent text-slate-400 hover:text-slate-200",
                  )}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error ? <div className="glass-card rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      {activeSubview === "dashboard" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Contacts", value: `${totalContacts}`, icon: Users },
              { label: "New This Week", value: `${newThisWeek}`, icon: Sparkles },
              { label: "Won This Month", value: `${wonThisMonth}`, icon: Building2 },
              { label: "Conversion Rate", value: `${conversionRate}%`, icon: BarChart3 },
            ].map(({ label, value, icon: Icon }) => (
              <article key={label} className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <div className="rounded-full border border-blue-300/20 bg-blue-500/10 p-2 text-blue-100">
                    <Icon size={16} />
                  </div>
                </div>
                <p className="heading-font mt-5 text-4xl font-normal uppercase tracking-[0.04em] text-white">{value}</p>
              </article>
            ))}
          </div>

          <section className="glass-panel p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-blue-200">
              <Brain size={14} />
              <span>AI Pipeline Assistant</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">Ask for deal summaries, meeting prep, or follow-up priorities across the full pipeline.</p>
            <AIInsightsPanel
              query={insightsQuery}
              onQueryChange={setInsightsQuery}
              onSubmit={() => void submitInsightsQuery()}
              onPromptSelect={(prompt) => {
                setInsightsQuery(prompt);
                void submitInsightsQuery(prompt);
              }}
              loading={insightsLoading}
              response={insightsResponse}
              className="mt-5 border border-blue-400/15 bg-[linear-gradient(135deg,rgba(32,147,255,0.08),rgba(0,38,255,0.06))]"
              responseClassName="min-h-[240px]"
            />
          </section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <section className="glass-panel p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-200" />
                <div>
                  <p className="section-title">Stage Funnel</p>
                  <p className="mt-1 text-sm text-slate-400">Counts by pipeline stage with proportional bars.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {stageDistribution.map(({ stage, count }) => {
                  const width = maxStageCount ? `${Math.max((count / maxStageCount) * 100, count > 0 ? 8 : 0)}%` : "0%";
                  return (
                    <div key={stage} className="grid grid-cols-[120px_minmax(0,1fr)_32px] items-center gap-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-300">{STAGE_META[stage].label}</p>
                      <div className="h-3 rounded-full bg-white/5">
                        <div className="h-3 rounded-full transition-all" style={{ width, backgroundColor: STAGE_META[stage].color }} />
                      </div>
                      <p className="text-right text-sm text-white">{count}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="glass-panel p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-blue-200" />
                <div>
                  <p className="section-title">Source Breakdown</p>
                  <p className="mt-1 text-sm text-slate-400">Where contacts are entering the pipeline.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {sourceBreakdown.length ? (
                  sourceBreakdown.map(({ source, count }) => (
                    <div key={source} className="glass-card rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-300">{formatSourceLabel(source)}</p>
                        <p className="text-sm text-white">{count}</p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/5">
                        <div
                          className="h-2 rounded-full bg-[linear-gradient(135deg,#2093FF,#0026FF)]"
                          style={{ width: maxSourceCount ? `${(count / maxSourceCount) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="glass-card rounded-2xl p-5 text-sm text-slate-400">No contact sources yet.</div>
                )}
              </div>
            </section>
          </div>

          <section className="glass-panel p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-200" />
              <div>
                <p className="section-title">Recent Activity</p>
                <p className="mt-1 text-sm text-slate-400">Latest contact creation and stage movement across the pipeline.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {recentActivity.length ? (
                recentActivity.map((entry) => (
                  <div key={entry.id} className="glass-card flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                        {entry.type === "created"
                          ? "Created contact"
                          : `Moved to ${entry.stage ? STAGE_META[entry.stage].label : "another stage"}`}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.16em] text-blue-100">{formatCreatedAt(entry.timestamp)}</p>
                  </div>
                ))
              ) : (
                <div className="glass-card rounded-2xl p-5 text-sm text-slate-400">No recent activity yet.</div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeSubview === "kanban" ? (
        <section className="glass-panel p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-title">Kanban Board</p>
              <p className="mt-1 text-sm text-slate-400">Drag contacts between stages to update the pipeline.</p>
            </div>
            {draggedDealId ? <p className="text-xs uppercase tracking-[0.16em] text-blue-200">Drop on a stage to move</p> : null}
          </div>

          <div className="mt-5 overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {stageDistribution.map(({ stage, count }) => {
                const stageDeals = deals.filter((deal) => deal.stage === stage);
                const isDropTarget = dropStage === stage;
                const visibleStageCount = kanbanVisibleCounts[stage] ?? 20;
                const visibleStageDeals = stageDeals.slice(0, visibleStageCount);

                return (
                  <div
                    key={stage}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (dropStage !== stage) setDropStage(stage);
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setDropStage((current) => (current === stage ? "" : current));
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleKanbanDrop(stage);
                    }}
                    className={cn(
                      "glass-card w-[290px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition",
                      isDropTarget && "border-blue-400/50 shadow-[0_0_28px_rgba(32,147,255,0.24)]",
                    )}
                    style={{ borderTopWidth: "3px", borderTopColor: STAGE_META[stage].color }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{STAGE_META[stage].label}</p>
                        <p className="heading-font mt-2 text-3xl font-normal uppercase tracking-[0.04em] text-white">{count}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-200">
                        {count} cards
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {stageDeals.length ? (
                        visibleStageDeals.map((deal) => (
                          <button
                            key={deal.id}
                            type="button"
                            draggable
                            onDragStart={() => {
                              setDraggedDealId(deal.id);
                              setDropStage(stage);
                            }}
                            onDragEnd={() => {
                              setDraggedDealId("");
                              setDropStage("");
                            }}
                            onClick={() => openContact(deal.id)}
                            className={cn(
                              "glass-card block w-full rounded-2xl p-4 text-left transition hover:-translate-y-0.5",
                              draggedDealId === deal.id && "opacity-50",
                            )}
                          >
                            <p className="text-sm font-semibold text-white">{getPrimaryName(deal)}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{getCompanyName(deal)}</p>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="rounded-full border border-blue-300/25 bg-blue-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-blue-100">
                                {formatSourceLabel(deal.source)}
                              </span>
                              {workingDealId === deal.id ? <span className="text-[10px] uppercase tracking-[0.16em] text-blue-200">Saving</span> : null}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a0a0f] px-4 py-8 text-center text-sm text-slate-500">
                          Drop contacts here.
                        </div>
                      )}
                      {stageDeals.length > visibleStageCount ? (
                        <button
                          type="button"
                          onClick={() =>
                            setKanbanVisibleCounts((current) => ({
                              ...current,
                              [stage]: visibleStageCount + 20,
                            }))
                          }
                          className="glass-card w-full rounded-2xl py-3 text-sm text-blue-200 transition hover:bg-white/5"
                        >
                          Show More ({visibleStageCount} of {stageDeals.length})
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {activeSubview === "segments" ? (
        <div className="space-y-4">
          <section className="glass-panel p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-blue-200" />
              <div>
                <p className="section-title">Segments & Export</p>
                <p className="mt-1 text-sm text-slate-400">Filter the pipeline, inspect matching contacts, and export the current slice.</p>
              </div>
            </div>

            <div className="glass-card mt-5 grid gap-3 rounded-2xl p-4 xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,1.4fr)]">
              <label className="relative xl:col-span-full">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={segmentsSearch}
                  onChange={(event) => setSegmentsSearch(event.target.value)}
                  placeholder="Search contacts by name, email, company, notes..."
                  className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 pl-11 text-sm text-white outline-none focus:border-blue-400/40"
                />
              </label>
              <select
                value={segmentsFilters.city}
                onChange={(event) => updateSegmentsFilter("city", event.target.value)}
                className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              >
                <option value="" className="text-black">All Cities</option>
                {segmentCities.map((city) => (
                  <option key={city} value={city} className="text-black">{city}</option>
                ))}
              </select>
              <select
                value={segmentsFilters.state}
                onChange={(event) => updateSegmentsFilter("state", event.target.value)}
                className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              >
                <option value="" className="text-black">All States</option>
                {segmentStates.map((state) => (
                  <option key={state} value={state} className="text-black">{state}</option>
                ))}
              </select>
              <select
                value={segmentsFilters.tag}
                onChange={(event) => updateSegmentsFilter("tag", event.target.value)}
                className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              >
                <option value="" className="text-black">All Competitors/Tags</option>
                {segmentTags.map((tag) => (
                  <option key={tag} value={tag} className="text-black">{tag}</option>
                ))}
              </select>
              <select
                value={segmentsFilters.source}
                onChange={(event) => updateSegmentsFilter("source", event.target.value)}
                className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              >
                <option value="" className="text-black">All Sources</option>
                {segmentSources.map((source) => (
                  <option key={source} value={source} className="text-black">{formatSourceLabel(source)}</option>
                ))}
              </select>
              <select
                value={segmentsFilters.stage}
                onChange={(event) => updateSegmentsFilter("stage", event.target.value)}
                className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              >
                <option value="" className="text-black">All Stages</option>
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage} value={stage} className="text-black">{STAGE_META[stage].label}</option>
                ))}
              </select>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="date"
                  value={segmentsFilters.dateFrom}
                  onChange={(event) => updateSegmentsFilter("dateFrom", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                />
                <input
                  type="date"
                  value={segmentsFilters.dateTo}
                  onChange={(event) => updateSegmentsFilter("dateTo", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                />
              </div>
            </div>

            {activeSegmentsFilters.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeSegmentsFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => updateSegmentsFilter(filter.key, "")}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-blue-100"
                  >
                    <span>{filter.label}</span>
                    <X size={12} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSegmentsFilters(EMPTY_SEGMENTS_FILTERS)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-slate-300"
                >
                  Clear All
                </button>
              </div>
            ) : null}
          </section>

          <section className="glass-panel p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="section-title">{segmentedDeals.length} contacts match filters</p>
                <p className="mt-1 text-sm text-slate-400">Sortable table view of the current segment.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => downloadSegmentsExport("csv")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white"
                >
                  <Download size={16} />
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => downloadSegmentsExport("json")}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
                >
                  <FileSpreadsheet size={16} />
                  Download JSON
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#05070d]">
              <table className="min-w-full text-left text-sm text-slate-200">
                <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    {[
                      ["name", "Name"],
                      ["company", "Company"],
                      ["email", "Email"],
                      ["city", "City"],
                      ["state", "State"],
                      ["tags", "Tags"],
                      ["stage", "Stage"],
                      ["source", "Source"],
                      ["created", "Created"],
                    ].map(([key, label]) => {
                      const active = segmentsSortKey === key;
                      return (
                        <th key={key} className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleSegmentsSort(key as SegmentsSortKey)}
                            className="inline-flex items-center gap-2 text-left transition hover:text-white"
                          >
                            <span>{label}</span>
                            {active ? (
                              <ChevronUp size={14} className={cn("transition", segmentsSortDirection === "desc" && "rotate-180")} />
                            ) : (
                              <ArrowUpDown size={14} />
                            )}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {segmentedDeals.length ? (
                    segmentedDeals.slice(0, segmentsVisibleCount).map((deal, index) => (
                      <tr key={deal.id} className={cn("border-t border-white/10", index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent")}>
                        <td className="px-4 py-3 font-semibold text-white">{getPrimaryName(deal)}</td>
                        <td className="px-4 py-3">{getCompanyName(deal)}</td>
                        <td className="px-4 py-3">{deal.email || "-"}</td>
                        <td className="px-4 py-3">{deal.city || "-"}</td>
                        <td className="px-4 py-3">{deal.state || "-"}</td>
                        <td className="px-4 py-3">
                          {[deal.competitor, ...deal.tags].filter(Boolean).join(", ") || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]", STAGE_META[deal.stage].pill)}>
                            {STAGE_META[deal.stage].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatSourceLabel(deal.source)}</td>
                        <td className="px-4 py-3">{formatCreatedAt(deal.createdAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">No contacts match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {segmentedDeals.length > segmentsVisibleCount ? (
              <button
                type="button"
                onClick={() => setSegmentsVisibleCount((current) => current + 50)}
                className="glass-card mt-4 w-full rounded-2xl py-3 text-sm text-blue-200 transition hover:bg-white/5"
              >
                Load More ({Math.min(segmentsVisibleCount, segmentedDeals.length)} of {segmentedDeals.length})
              </button>
            ) : null}
          </section>
        </div>
      ) : null}

      {activeSubview === "contacts" ? (
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_240px]">
          <aside className={cn("glass-panel p-4", showMobileDetail ? "hidden lg:block" : "block")}>
            <div className="space-y-4">
              <div className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3">
                <Search size={16} className="text-blue-200" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search contacts"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="glass-card rounded-2xl px-3 py-3 text-sm text-white outline-none"
                >
                  <option value="newest" className="text-black" style={{ color: "black" }}>
                    Newest
                  </option>
                  <option value="alphabetical" className="text-black" style={{ color: "black" }}>
                    A-Z
                  </option>
                  <option value="stage" className="text-black" style={{ color: "black" }}>
                    Stage
                  </option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddContact(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
                >
                  <Plus size={16} />
                  Add Contact
                </button>
              </div>

              <div className="glass-panel overflow-hidden p-0">
                <div className="px-3 pt-3">
                  <div className="relative w-full max-w-[200px]">
                    <select
                      value={activeSource}
                      onChange={(event) => setActiveSource(event.target.value)}
                      className="glass-card w-full appearance-none rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 pr-10 text-sm font-semibold text-white outline-none transition focus:border-[#2093FF] focus:ring-2 focus:ring-[#2093FF]/30"
                    >
                      {sourceTabs.map((tab) => (
                        <option key={tab.value} value={tab.value} className="text-black" style={{ color: "black" }}>
                          {getSourceOptionLabel(tab)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7FC2FF]"
                    />
                  </div>
                </div>
              </div>

              {availableTags.length ? (
                <div className="glass-card rounded-2xl p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tag Filter</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableTags.map((tag, index) => {
                      const active = activeTagFilter.toLowerCase() === tag.toLowerCase();
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setActiveTagFilter((current) => (current && current.toLowerCase() === tag.toLowerCase() ? "" : tag))}
                          className={cn(
                            "rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] transition",
                            active
                              ? "border-blue-300/40 bg-[linear-gradient(135deg,rgba(32,147,255,0.24),rgba(0,38,255,0.22))] text-blue-50"
                              : getTagPillClass(index),
                          )}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="max-h-[calc(100vh-24rem)] space-y-2 overflow-y-auto pr-1">
                {filteredDeals.length ? (
                  filteredDeals.slice(0, visibleCount).map((deal) => {
                    const active = deal.id === activeDetailId;
                    return (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(deal.id);
                          setMobileOpenId(deal.id);
                        }}
                        className={cn(
                          "glass-card w-full rounded-2xl p-4 text-left transition",
                          active && "border-blue-400/40 bg-[linear-gradient(135deg,rgba(32,147,255,0.18),rgba(0,38,255,0.14))]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{getPrimaryName(deal)}</p>
                            <p className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-slate-400">{getCompanyName(deal)}</p>
                          </div>
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STAGE_META[deal.stage].color }} />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={cn("rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]", STAGE_META[deal.stage].pill)}>
                            {STAGE_META[deal.stage].label}
                          </span>
                          {deal.competitor ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-200">
                              {deal.competitor}
                            </span>
                          ) : null}
                          {deal.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={tag}
                              className={cn("rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]", getTagPillClass(index))}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="glass-card rounded-2xl p-5 text-sm text-slate-400">No contacts match the current filters.</div>
                )}
              </div>

              {filteredDeals.length > visibleCount ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((current) => current + 25)}
                  className="glass-card w-full rounded-2xl py-3 text-sm text-blue-200 transition hover:bg-white/5"
                >
                  Load More (showing {Math.min(visibleCount, filteredDeals.length)} of {filteredDeals.length})
                </button>
              ) : null}

              <div className="flex items-center justify-between border-t border-white/8 pt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                <span>Total</span>
                <span>{filteredDeals.length}</span>
              </div>
            </div>
          </aside>

          <main className={cn(showMobileDetail ? "block" : "hidden lg:block")}>
            {detailDeal ? (
              <div className="space-y-4">
                <section className="glass-panel page-header p-5 sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-3 lg:hidden">
                      <button
                        type="button"
                        onClick={() => setMobileOpenId("")}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-200"
                      >
                        <ArrowLeft size={14} />
                        Back
                      </button>
                    </div>

                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Contact Profile</p>
                        <h2 className="heading-font mt-2 max-w-3xl break-all text-2xl font-normal uppercase leading-tight tracking-[0.04em] text-white md:text-3xl">
                          {getPrimaryName(detailDeal)}
                        </h2>
                        <p className="mt-2 text-sm text-slate-300">{getCompanyName(detailDeal)}</p>
                      </div>

                      <div ref={tagEditorRef} className="relative flex flex-wrap gap-2">
                        <select
                          value={detailDeal.stage}
                          onChange={(event) => void patchDeal(detailDeal.id, { stage: event.target.value as PipelineStage })}
                          className={cn("rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em] outline-none", STAGE_META[detailDeal.stage].pill)}
                        >
                          <SelectOptions values={PIPELINE_STAGES} getLabel={(stage) => STAGE_META[stage as PipelineStage].label} />
                        </select>
                        <span className="rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-blue-100">
                          {formatSourceLabel(detailDeal.source)}
                        </span>
                        {detailDeal.tags.length ? (
                          detailDeal.tags.slice(0, 3).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setShowTagEditor((current) => !current)}
                              className={cn(
                                "rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em] transition hover:border-red-300/60 hover:bg-red-500/30",
                                HEADER_TAG_PILL_CLASS,
                              )}
                            >
                              {tag}
                            </button>
                          ))
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowTagEditor(true)}
                            className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-red-200 transition hover:bg-red-500/20"
                          >
                            + Tag
                          </button>
                        )}
                        {showTagEditor ? (
                          <div className="absolute left-0 top-full z-20 mt-2 w-full min-w-[280px] max-w-md rounded-2xl border border-white/10 bg-[#05070d] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Manage Tags</p>
                              {workingDealId === detailDeal.id ? (
                                <span className="text-xs uppercase tracking-[0.16em] text-blue-200">Saving</span>
                              ) : null}
                            </div>
                            <div className="mt-3">
                              <TagInput
                                key={`header-tags-${detailDeal.id}`}
                                tags={detailDeal.tags}
                                placeholder="Add tag..."
                                alwaysShowSuggestions
                                onAdd={(value) => {
                                  const nextTags = addTag(detailDeal.tags, value);
                                  if (nextTags === detailDeal.tags) return;
                                  void patchDeal(detailDeal.id, { tags: nextTags });
                                }}
                                onRemove={(value) => {
                                  void patchDeal(detailDeal.id, { tags: removeTag(detailDeal.tags, value) });
                                }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="glass-panel p-5 sm:p-6">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <div className="glass-card rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <Mail size={14} className="text-blue-200" />
                        Email
                      </div>
                      <p className="mt-2 break-all text-sm text-white">{detailDeal.email || "No email"}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <Phone size={14} className="text-blue-200" />
                        Phone
                      </div>
                      <p className="mt-2 text-sm text-white">{getPhone(detailDeal) || "No phone"}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <Globe size={14} className="text-blue-200" />
                        Website
                      </div>
                      <p className="mt-2 break-all text-sm text-white">{getWebsite(detailDeal) || "No website"}</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <MapPin size={14} className="text-blue-200" />
                        City
                      </div>
                      {editingLocationField === "city" ? (
                        <div className="mt-2 space-y-2">
                          <input
                            value={editingLocationDraft}
                            onChange={(event) => setEditingLocationDraft(event.target.value)}
                            placeholder="Enter city"
                            className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void saveLocationField(detailDeal, "city")}
                              disabled={workingDealId === detailDeal.id}
                              className="rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingLocation}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <p className="min-w-0 text-sm text-white">{detailDeal.city || "No city"}</p>
                          <button
                            type="button"
                            onClick={() => startEditingLocation("city", detailDeal.city)}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-blue-400/40 hover:text-blue-100"
                            aria-label="Edit city"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <MapIcon size={14} className="text-blue-200" />
                        State
                      </div>
                      {editingLocationField === "state" ? (
                        <div className="mt-2 space-y-2">
                          <input
                            value={editingLocationDraft}
                            onChange={(event) => setEditingLocationDraft(event.target.value)}
                            placeholder="Enter state"
                            className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void saveLocationField(detailDeal, "state")}
                              disabled={workingDealId === detailDeal.id}
                              className="rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditingLocation}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <p className="min-w-0 text-sm text-white">{detailDeal.state || "No state"}</p>
                          <button
                            type="button"
                            onClick={() => startEditingLocation("state", detailDeal.state)}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-blue-400/40 hover:text-blue-100"
                            aria-label="Edit state"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="glass-panel p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="section-title">Rolodex Notes</p>
                      <p className="mt-1 text-sm text-slate-400">Auto-saves when focus leaves the note field.</p>
                    </div>
                    {workingDealId === detailDeal.id ? <span className="text-xs uppercase tracking-[0.16em] text-blue-200">Saving</span> : null}
                  </div>
                  <textarea
                    value={rolodexDraft}
                    onChange={(event) => setRolodexDraft(event.target.value)}
                    onBlur={() => void saveRolodexNotes()}
                    placeholder="Track family details, objections, deal context, and what matters before the next touch."
                    className="mt-4 min-h-[180px] w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
                  />
                </section>

                <section className="glass-panel p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="section-title">Phone Call Log</p>
                      <p className="mt-1 text-sm text-slate-400">Store every call with an Eastern time date stamp.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhoneComposer((current) => !current);
                        setPhoneDateDraft(formatPhoneLogDate());
                      }}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60"
                    >
                      <PhoneCall size={16} />
                      Add Phone Call
                    </button>
                  </div>

                  {showPhoneComposer ? (
                    <div className="glass-card mt-4 grid gap-3 rounded-2xl p-4 md:grid-cols-[160px_minmax(0,1fr)_120px]">
                      <input
                        value={phoneDateDraft}
                        onChange={(event) => setPhoneDateDraft(event.target.value)}
                        className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-3 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                      />
                      <input
                        value={phoneNotesDraft}
                        onChange={(event) => setPhoneNotesDraft(event.target.value)}
                        placeholder="Call notes"
                        className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
                      />
                      <button
                        type="button"
                        onClick={() => void addPhoneCall()}
                        className="inline-flex items-center justify-center rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Save
                      </button>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-3">
                    {phoneLog.length ? (
                      phoneLog.map((entry) => {
                        const isEditing = editingPhoneId === entry.id;

                        return (
                          <div key={entry.id} className="glass-card rounded-2xl p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                {isEditing ? (
                                  <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                                    <input
                                      value={editingPhoneDateDraft}
                                      onChange={(event) => setEditingPhoneDateDraft(event.target.value)}
                                      className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-3 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                                    />
                                    <input
                                      value={editingPhoneNotesDraft}
                                      onChange={(event) => setEditingPhoneNotesDraft(event.target.value)}
                                      className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-3 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-xs uppercase tracking-[0.16em] text-blue-100">{entry.date}</p>
                                    <p className="mt-2 text-sm text-white">{entry.notes}</p>
                                  </>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => void savePhoneCallEdit(detailDeal, entry.id)}
                                      disabled={!editingPhoneNotesDraft.trim()}
                                      className="rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditingPhoneCall}
                                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-slate-300"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => startEditingPhoneCall(entry)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-blue-400/40 hover:text-blue-100"
                                      aria-label="Edit phone call"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deletePhoneCall(detailDeal, entry.id)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
                                      aria-label="Delete phone call"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="glass-card rounded-2xl p-5 text-sm text-slate-400">No phone calls logged yet.</div>
                    )}
                  </div>
                </section>

                <section className="glass-panel p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="section-title">Quick Notes Timeline</p>
                      <p className="mt-1 text-sm text-slate-400">Timestamped updates for each touchpoint.</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                    <input
                      value={quickNoteDraft}
                      onChange={(event) => setQuickNoteDraft(event.target.value)}
                      placeholder="Add a quick update"
                      className="rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400/40"
                    />
                    <button
                      type="button"
                      onClick={() => void addQuickNote()}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      <Plus size={16} />
                      Add Note
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedNotes.quickNotes.length ? (
                      selectedNotes.quickNotes
                        .slice()
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((note) => {
                          const isEditing = editingQuickNoteId === note.id;

                          return (
                            <div key={note.id} className="glass-card rounded-2xl p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs uppercase tracking-[0.16em] text-blue-100">{formatCreatedAt(note.timestamp)}</p>
                                  {isEditing ? (
                                    <input
                                      value={editingQuickNoteDraft}
                                      onChange={(event) => setEditingQuickNoteDraft(event.target.value)}
                                      className="mt-3 w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                                    />
                                  ) : (
                                    <p className="mt-2 text-sm text-white">{note.text}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void saveQuickNoteEdit(detailDeal, note.id)}
                                        disabled={!editingQuickNoteDraft.trim()}
                                        className="rounded-full border border-blue-300/30 bg-blue-500/10 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEditingQuickNote}
                                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.16em] text-slate-300"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => startEditingQuickNote(note)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-blue-400/40 hover:text-blue-100"
                                        aria-label="Edit quick note"
                                      >
                                        <Pencil size={14} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void deleteQuickNote(detailDeal, note.id)}
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
                                        aria-label="Delete quick note"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="glass-card rounded-2xl p-5 text-sm text-slate-400">No quick notes yet.</div>
                    )}
                  </div>
                </section>

                <section className="glass-panel p-5 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="section-title">Convert</p>
                      <p className="mt-1 text-sm text-slate-400">Create a client profile from this contact and open it immediately.</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void deleteContact(detailDeal)}
                        disabled={workingDealId === detailDeal.id}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={16} />
                        {workingDealId === detailDeal.id ? "Deleting..." : "Delete Contact"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void convertToClient(detailDeal)}
                        disabled={convertingDealId === detailDeal.id}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Building2 size={16} />
                        {convertingDealId === detailDeal.id ? "Converting..." : "Convert to Client"}
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <section className="glass-panel flex min-h-[420px] items-center justify-center p-8 text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-100">
                    <UserRound size={24} />
                  </div>
                  <h2 className="heading-font mt-5 text-3xl font-normal uppercase tracking-[0.04em] text-white">Select a Contact</h2>
                  <p className="mt-2 text-sm text-slate-400">Choose a lead from the left panel to open the CRM profile.</p>
                </div>
              </section>
            )}
          </main>

          <aside className="glass-panel hidden p-4 lg:block">
            <div className="space-y-4">
              <div>
                <p className="section-title">Stage Distribution</p>
                <div className="mt-4 space-y-3">
                  {stageDistribution.map(({ stage, count }) => {
                    const width = deals.length ? `${(count / deals.length) * 100}%` : "0%";
                    return (
                      <div key={stage} className="glass-card rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-300">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STAGE_META[stage].color }} />
                            <span>{STAGE_META[stage].label}</span>
                          </div>
                          <span className="text-sm text-white">{count}</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/5">
                          <div className="h-2 rounded-full" style={{ width, backgroundColor: STAGE_META[stage].color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="section-title">Quick Stats</p>
                <div className="mt-4 grid gap-3">
                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total Contacts</p>
                    <p className="heading-font mt-2 text-3xl font-normal uppercase tracking-[0.04em] text-white">{deals.length}</p>
                  </div>
                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Won This Month</p>
                    <p className="heading-font mt-2 text-3xl font-normal uppercase tracking-[0.04em] text-white">{wonThisMonth}</p>
                  </div>
                </div>
              </div>

              <AIInsightsPanel
                query={insightsQuery}
                onQueryChange={setInsightsQuery}
                onSubmit={() => void submitInsightsQuery()}
                onPromptSelect={(prompt) => {
                  setInsightsQuery(prompt);
                  void submitInsightsQuery(prompt);
                }}
                loading={insightsLoading}
                response={insightsResponse}
              />
            </div>
          </aside>
        </div>
      ) : null}

      {showAddContact ? (
        <ModalShell title="Add Contact" icon={<Plus size={16} className="text-blue-200" />} onClose={() => setShowAddContact(false)}>
          <form onSubmit={submitAddContact} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Name</span>
              <input
                value={addForm.name}
                onChange={(event) => setAddForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Company</span>
              <input
                value={addForm.company}
                onChange={(event) => setAddForm((current) => ({ ...current, company: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Email</span>
              <input
                value={addForm.email}
                onChange={(event) => setAddForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Phone</span>
              <input
                value={addForm.phone}
                onChange={(event) => setAddForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Source</span>
              <input
                value={addForm.source}
                onChange={(event) => setAddForm((current) => ({ ...current, source: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">City</span>
              <input
                value={addForm.city}
                onChange={(event) => setAddForm((current) => ({ ...current, city: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">State</span>
              <select
                value={addForm.state}
                onChange={(event) => setAddForm((current) => ({ ...current, state: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              >
                <option value="" className="text-black" style={{ color: "black" }}>
                  Select state
                </option>
                {US_STATES.map((state) => (
                  <option key={state} value={state} className="text-black" style={{ color: "black" }}>
                    {state}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Stage</span>
              <select
                value={addForm.stage}
                onChange={(event) => setAddForm((current) => ({ ...current, stage: event.target.value as PipelineStage }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              >
                <SelectOptions values={PIPELINE_STAGES} getLabel={(stage) => STAGE_META[stage as PipelineStage].label} />
              </select>
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Rolodex Notes</span>
              <textarea
                value={addForm.notes}
                onChange={(event) => setAddForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              />
            </label>
            <div className="space-y-2 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Tags</span>
              <TagInput
                tags={addForm.tags}
                placeholder="Add tag..."
                onAdd={(value) => setAddForm((current) => ({ ...current, tags: addTag(current.tags, value) }))}
                onRemove={(value) => setAddForm((current) => ({ ...current, tags: removeTag(current.tags, value) }))}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submittingContact}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} />
                {submittingContact ? "Creating..." : "Create Contact"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {showImportModal ? (
        <ModalShell title="Import CSV" icon={<FileSpreadsheet size={16} className="text-blue-200" />} onClose={() => setShowImportModal(false)}>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50">
                <Upload size={16} />
                Upload CSV
                <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="hidden" />
              </label>
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200"
              >
                <Download size={16} />
                Download Template
              </button>
              <button
                type="button"
                onClick={() => void importCsvRows()}
                disabled={!importRows.length || importing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={16} />
                {importing ? "Importing..." : `Import ${importRows.length || ""}`.trim()}
              </button>
            </div>

            {importPreviewError ? (
              <div className="glass-card rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{importPreviewError}</div>
            ) : null}

            <div className="glass-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Expected columns</p>
              <p className="mt-2 text-sm text-slate-200">name, company, email, phone, source, stage, notes, competitor</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full overflow-hidden rounded-2xl border border-white/10 text-left text-sm text-slate-200">
                <thead className="bg-white/5 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 5).map((row, index) => (
                    <tr key={`${row.email}-${index}`} className="border-t border-white/10">
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{row.company}</td>
                      <td className="px-4 py-3">{row.email || "-"}</td>
                      <td className="px-4 py-3">{row.phone || "-"}</td>
                      <td className="px-4 py-3">{formatSourceLabel(row.source)}</td>
                      <td className="px-4 py-3">{STAGE_META[row.stage].label}</td>
                    </tr>
                  ))}
                  {!importRows.length ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                        Upload a CSV to preview the first five rows.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </section>
  );
}
