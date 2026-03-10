"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock3,
  DollarSign,
  Globe,
  LoaderCircle,
  Mail,
  MessagesSquare,
  NotebookPen,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserRoundPen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_STAGES, PipelineDeal, PipelineSource, PipelineStage } from "@/lib/pipeline-types";

type QuickNote = {
  text: string;
  timestamp: string;
};

type NotesState = {
  relationshipNote: string;
  relationshipTimestamp: string;
  quickNotes: QuickNote[];
};

type SortMode = "newest" | "alphabetical" | "stage";

type CreateContactForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: PipelineStage;
  source: PipelineSource;
  notes: string;
};

type EditForm = {
  name: string;
  company: string;
  email: string;
};

const EASTERN_TIME_ZONE = "America/New_York";
const MAIN_NOTE_PLACEHOLDER =
  "e.g., Louie runs a small Italian spot in Louisville. Business is slow right now. Interested in Google Ads but worried about budget. Has 2 kids, loves fishing...";

const STAGE_META: Record<
  PipelineStage,
  {
    label: string;
    color: string;
    dot: string;
    pill: string;
  }
> = {
  "new-lead": {
    label: "New",
    color: "#2093FF",
    dot: "bg-blue-400",
    pill: "border-blue-400/30 bg-blue-500/15 text-blue-100",
  },
  contacted: {
    label: "Contacted",
    color: "#22D3EE",
    dot: "bg-cyan-400",
    pill: "border-cyan-400/30 bg-cyan-500/15 text-cyan-100",
  },
  interested: {
    label: "Interested",
    color: "#10B981",
    dot: "bg-emerald-400",
    pill: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  },
  "scheduled-meeting": {
    label: "Meeting",
    color: "#F59E0B",
    dot: "bg-amber-400",
    pill: "border-amber-400/30 bg-amber-500/15 text-amber-100",
  },
  "attended-meeting": {
    label: "Attended",
    color: "#F97316",
    dot: "bg-orange-400",
    pill: "border-orange-400/30 bg-orange-500/15 text-orange-100",
  },
  negotiating: {
    label: "Negotiating",
    color: "#A855F7",
    dot: "bg-purple-400",
    pill: "border-purple-400/30 bg-purple-500/15 text-purple-100",
  },
  "closed-won": {
    label: "Won",
    color: "#22C55E",
    dot: "bg-green-400",
    pill: "border-green-400/30 bg-green-500/15 text-green-100",
  },
  "closed-lost": {
    label: "Lost",
    color: "#94A3B8",
    dot: "bg-slate-400",
    pill: "border-slate-400/30 bg-slate-500/15 text-slate-100",
  },
};

const STAGE_FILTERS: { value: "all" | PipelineStage; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new-lead", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "scheduled-meeting", label: "Meeting" },
  { value: "closed-won", label: "Won" },
  { value: "closed-lost", label: "Lost" },
];

const SOURCE_META: Record<PipelineSource, string> = {
  instantly: "border-blue-400/30 bg-blue-500/15 text-blue-100",
  manual: "border-slate-400/30 bg-slate-500/15 text-slate-100",
  referral: "border-emerald-400/30 bg-emerald-500/15 text-emerald-100",
  website: "border-indigo-400/30 bg-indigo-500/15 text-indigo-100",
};

const EMPTY_CREATE_FORM: CreateContactForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  stage: "new-lead",
  source: "manual",
  notes: "",
};

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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

function makeTimestamp(date = new Date()) {
  return date.toISOString();
}

function parseQuickNotes(notes: string, fallbackDate?: string): NotesState {
  const trimmed = notes.trim();
  const baseTimestamp = fallbackDate ? new Date(`${fallbackDate}T12:00:00`).toISOString() : makeTimestamp();

  if (!trimmed) {
    return {
      relationshipNote: "",
      relationshipTimestamp: baseTimestamp,
      quickNotes: [],
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const note = entry as { text?: unknown; timestamp?: unknown };
          if (typeof note.text !== "string") return null;
          return {
            text: note.text,
            timestamp: typeof note.timestamp === "string" && note.timestamp.trim() ? note.timestamp : baseTimestamp,
          };
        })
        .filter((entry): entry is QuickNote => entry !== null);

      if (normalized.length === 0) {
        return { relationshipNote: "", relationshipTimestamp: baseTimestamp, quickNotes: [] };
      }

      const [relationship, ...quickNotes] = normalized;
      return {
        relationshipNote: relationship.text,
        relationshipTimestamp: relationship.timestamp,
        quickNotes,
      };
    }
  } catch {}

  return {
    relationshipNote: trimmed,
    relationshipTimestamp: baseTimestamp,
    quickNotes: [],
  };
}

function serializeQuickNotes(notesState: NotesState): string {
  const entries: QuickNote[] = [];

  if (notesState.relationshipNote.trim()) {
    entries.push({
      text: notesState.relationshipNote.trim(),
      timestamp: notesState.relationshipTimestamp || makeTimestamp(),
    });
  }

  notesState.quickNotes.forEach((note) => {
    if (!note.text.trim()) return;
    entries.push({
      text: note.text.trim(),
      timestamp: note.timestamp || makeTimestamp(),
    });
  });

  return JSON.stringify(entries);
}

function formatMoney(value: number) {
  return moneyFormatter.format(value || 0);
}

function formatEasternDate(value?: string) {
  if (!value) return "Unknown";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return easternDateFormatter.format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return easternDateTimeFormatter.format(parsed);
}

function formatRelativeTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatEasternDate(value);

  const deltaMs = Date.now() - parsed.getTime();
  const deltaMinutes = Math.floor(deltaMs / 60000);
  if (deltaMinutes < 1) return "Just now";
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  if (deltaDays < 7) return `${deltaDays}d ago`;
  return formatEasternDate(value);
}

function getPrimaryName(deal: PipelineDeal) {
  return deal.contact || deal.name;
}

function getSearchableNotesText(deal: PipelineDeal) {
  const parsed = parseQuickNotes(deal.notes, deal.createdAt);
  const values = [parsed.relationshipNote, ...parsed.quickNotes.map((note) => note.text)];
  return values.join(" ").toLowerCase();
}

function getWebsite(deal: PipelineDeal) {
  return deal.website || deal.enrichmentData?.website || "";
}

function normalizeWebsite(url: string) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function getPhone(deal: PipelineDeal) {
  return deal.enrichmentData?.phone || "";
}

function isSameMonth(dateIso?: string) {
  if (!dateIso) return false;
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  return (
    parsed.getUTCFullYear() === now.getUTCFullYear() &&
    parsed.getUTCMonth() === now.getUTCMonth()
  );
}

function EmptyProfileState() {
  return (
    <section className="glass-panel flex min-h-[420px] items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-100">
          <MessagesSquare size={24} />
        </div>
        <h2 className="heading-font mt-5 text-3xl font-normal uppercase tracking-[0.04em] text-white">
          Contact Profile
        </h2>
        <p className="mt-3 text-sm text-slate-300">Select a contact from the sidebar or add a new one</p>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
}) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
        <Icon size={16} className="text-blue-200" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function PipelinePage() {
  const [contacts, setContacts] = useState<PipelineDeal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | PipelineStage>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateContactForm>(EMPTY_CREATE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [quickNoteDraft, setQuickNoteDraft] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", company: "", email: "" });
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadContacts() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/pipeline", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to load contacts.");
        }

        const data = (await response.json()) as PipelineDeal[];
        if (cancelled) return;
        setContacts(data);
        setSelectedId((current) => current ?? data[0]?.id ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load contacts.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadContacts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notesSaved) return undefined;
    const timeout = window.setTimeout(() => setNotesSaved(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [notesSaved]);

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === selectedId) ?? null,
    [contacts, selectedId],
  );

  const selectedNotesState = useMemo(
    () => parseQuickNotes(selectedContact?.notes ?? "", selectedContact?.createdAt),
    [selectedContact],
  );

  useEffect(() => {
    setNotesDraft(selectedNotesState.relationshipNote);
    setQuickNoteDraft("");
  }, [selectedNotesState.relationshipNote, selectedId]);

  useEffect(() => {
    if (!selectedContact) {
      setEditMode(false);
      setEditForm({ name: "", company: "", email: "" });
      return;
    }

    setEditForm({
      name: getPrimaryName(selectedContact),
      company: selectedContact.client,
      email: selectedContact.email,
    });
  }, [selectedContact]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const next = contacts.filter((contact) => {
      const matchesStage = stageFilter === "all" || contact.stage === stageFilter;
      if (!matchesStage) return false;
      if (!query) return true;

      const haystack = [
        getPrimaryName(contact),
        contact.client,
        contact.email,
        contact.contact,
        getSearchableNotesText(contact),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    next.sort((left, right) => {
      if (sortMode === "alphabetical") {
        return getPrimaryName(left).localeCompare(getPrimaryName(right));
      }

      if (sortMode === "stage") {
        return PIPELINE_STAGES.indexOf(left.stage) - PIPELINE_STAGES.indexOf(right.stage);
      }

      const leftTime = new Date(left.stageUpdatedAt ?? left.createdAt).getTime();
      const rightTime = new Date(right.stageUpdatedAt ?? right.createdAt).getTime();
      return rightTime - leftTime;
    });

    return next;
  }, [contacts, searchQuery, sortMode, stageFilter]);

  useEffect(() => {
    if (!filteredContacts.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !filteredContacts.some((contact) => contact.id === selectedId)) {
      setSelectedId(filteredContacts[0].id);
    }
  }, [filteredContacts, selectedId]);

  const stageCounts = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      stage,
      count: contacts.filter((contact) => contact.stage === stage).length,
    }));
  }, [contacts]);

  const maxStageCount = Math.max(1, ...stageCounts.map((entry) => entry.count));
  const wonThisMonth = contacts.filter(
    (contact) => contact.stage === "closed-won" && isSameMonth(contact.stageUpdatedAt ?? contact.createdAt),
  ).length;
  const conversionRate = contacts.length ? Math.round((contacts.filter((contact) => contact.stage === "closed-won").length / contacts.length) * 100) : 0;
  const recentActivity = useMemo(() => {
    return [...contacts]
      .sort((left, right) => {
        const leftTime = new Date(left.stageUpdatedAt ?? left.createdAt).getTime();
        const rightTime = new Date(right.stageUpdatedAt ?? right.createdAt).getTime();
        return rightTime - leftTime;
      })
      .slice(0, 5);
  }, [contacts]);

  async function patchContact(id: string, patch: Partial<Omit<PipelineDeal, "id" | "createdAt">>) {
    const response = await fetch(`/api/pipeline/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });

    if (!response.ok) {
      throw new Error("Unable to update contact.");
    }

    const updated = (await response.json()) as PipelineDeal;
    setContacts((current) => current.map((contact) => (contact.id === id ? updated : contact)));
    return updated;
  }

  async function handleStageChange(id: string, stage: PipelineStage) {
    try {
      await patchContact(id, { stage });
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : "Unable to update stage.");
    }
  }

  async function handleNotesBlur() {
    if (!selectedContact) return;

    const serialized = serializeQuickNotes({
      relationshipNote: notesDraft,
      relationshipTimestamp: selectedNotesState.relationshipTimestamp,
      quickNotes: selectedNotesState.quickNotes,
    });

    if (serialized === selectedContact.notes) return;

    setNotesSaving(true);
    try {
      await patchContact(selectedContact.id, { notes: serialized });
      setNotesSaved(true);
    } catch (notesError) {
      setError(notesError instanceof Error ? notesError.message : "Unable to save notes.");
    } finally {
      setNotesSaving(false);
    }
  }

  async function handleAddQuickNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact || !quickNoteDraft.trim()) return;

    const nextNotes = {
      relationshipNote: notesDraft,
      relationshipTimestamp: selectedNotesState.relationshipTimestamp,
      quickNotes: [
        {
          text: quickNoteDraft.trim(),
          timestamp: makeTimestamp(),
        },
        ...selectedNotesState.quickNotes,
      ],
    };

    try {
      await patchContact(selectedContact.id, { notes: serializeQuickNotes(nextNotes) });
      setQuickNoteDraft("");
      setNotesSaved(true);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Unable to add note.");
    }
  }

  async function handleDeleteQuickNote(timestamp: string) {
    if (!selectedContact) return;

    const nextNotes = {
      relationshipNote: notesDraft,
      relationshipTimestamp: selectedNotesState.relationshipTimestamp,
      quickNotes: selectedNotesState.quickNotes.filter((note) => note.timestamp !== timestamp),
    };

    try {
      await patchContact(selectedContact.id, { notes: serializeQuickNotes(nextNotes) });
      setNotesSaved(true);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : "Unable to delete note.");
    }
  }

  async function handleDeleteContact() {
    if (!selectedContact || !window.confirm(`Delete ${getPrimaryName(selectedContact)}?`)) return;

    try {
      const response = await fetch(`/api/pipeline/${selectedContact.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Unable to delete contact.");
      }

      setContacts((current) => current.filter((contact) => contact.id !== selectedContact.id));
      setSelectedId(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete contact.");
    }
  }

  async function handleSaveInlineEdit() {
    if (!selectedContact) return;

    try {
      await patchContact(selectedContact.id, {
        name: editForm.name,
        contact: editForm.name,
        client: editForm.company,
        email: editForm.email,
      });
      setEditMode(false);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Unable to save contact.");
    }
  }

  async function handleCreateContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          stage: createForm.stage,
          value: 0,
          client: createForm.company,
          contact: createForm.name,
          assignee: "kevin",
          notes: serializeQuickNotes({
            relationshipNote: createForm.notes,
            relationshipTimestamp: makeTimestamp(),
            quickNotes: [],
          }),
          source: createForm.source,
          email: createForm.email,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create contact.");
      }

      let created = (await response.json()) as PipelineDeal;
      setContacts((current) => [created, ...current]);

      if (createForm.phone.trim()) {
        created = await patchContact(created.id, {
          enrichmentData: {
            ...(created.enrichmentData ?? {}),
            phone: createForm.phone.trim(),
          },
        });
      }

      setSelectedId(created.id);
      setCreateForm(EMPTY_CREATE_FORM);
      setCreateOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create contact.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="glass-panel rounded-2xl p-6 text-sm text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle size={18} className="animate-spin text-blue-200" />
          Loading CRM...
        </div>
      </section>
    );
  }

  if (error && contacts.length === 0) {
    return (
      <section className="glass-panel rounded-2xl p-6 text-sm text-red-100">
        {error}
      </section>
    );
  }

  return (
    <>
      <div className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
        <header className="glass-panel page-header p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">CRM Pipeline</p>
              <h1 className="page-title mt-2">Relationships</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Salesforce-style contact memory for every conversation, company, and follow-up in Eastern time.
              </p>
            </div>
            <div className="glass-card inline-flex items-center gap-3 self-start rounded-2xl px-4 py-3 text-sm text-slate-200">
              <Clock3 size={16} className="text-blue-200" />
              {easternDateTimeFormatter.format(new Date())} ET
            </div>
          </div>
        </header>

        {error ? (
          <div className="glass-card rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_240px]">
          <aside
            className={cn(
              "glass-panel h-[calc(100vh-13rem)] min-h-[620px] flex-col p-4",
              selectedContact ? "hidden xl:flex" : "flex",
            )}
          >
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search contacts"
                className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-blue-400/50"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {STAGE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStageFilter(filter.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    stageFilter === filter.value
                      ? "border-blue-400/40 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.2))] text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-blue-400/30 hover:text-white",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Sort</label>
              <div className="mt-2 relative">
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none transition focus:border-blue-400/50"
                >
                  <option value="newest">Newest</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="stage">Stage</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              {filteredContacts.map((contact) => {
                const active = selectedId === contact.id;
                const competitor = contact.competitor?.trim();

                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setSelectedId(contact.id)}
                    className={cn(
                      "glass-card w-full rounded-2xl p-4 text-left transition",
                      active
                        ? "border-blue-400/40 bg-[linear-gradient(135deg,rgba(32,147,255,0.18),rgba(0,38,255,0.14))] shadow-[0_18px_48px_rgba(32,147,255,0.18)]"
                        : "hover:border-blue-400/25",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{getPrimaryName(contact)}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">{contact.client}</p>
                      </div>
                      <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", STAGE_META[contact.stage].dot)} />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {competitor ? (
                        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-200">
                          {competitor}
                        </span>
                      ) : null}
                      <span className={cn("rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em]", STAGE_META[contact.stage].pill)}>
                        {STAGE_META[contact.stage].label}
                      </span>
                    </div>
                  </button>
                );
              })}

              {!filteredContacts.length ? (
                <div className="glass-card rounded-2xl p-6 text-center text-sm text-slate-400">
                  No contacts match your filters.
                </div>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-500">{filteredContacts.length} contacts</p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/35 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-3 text-sm font-medium text-white shadow-[0_16px_32px_rgba(0,38,255,0.28)] transition hover:scale-[1.01]"
              >
                <Plus size={16} />
                Add Contact
              </button>
            </div>
          </aside>

          <main className={cn("min-w-0 space-y-4", selectedContact ? "block" : "hidden xl:block")}>
            {!selectedContact ? (
              <EmptyProfileState />
            ) : (
              <>
                <section className="glass-panel page-header p-5 sm:p-6">
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedId(null)}
                          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-300 xl:hidden"
                        >
                          <ArrowLeft size={14} />
                          Back
                        </button>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Contact Record</p>
                        <h2 className="heading-font mt-2 truncate text-3xl font-normal uppercase tracking-[0.04em] text-white sm:text-4xl">
                          {getPrimaryName(selectedContact)}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                          <span className="inline-flex items-center gap-2">
                            <Building2 size={15} className="text-blue-200" />
                            {selectedContact.client}
                          </span>
                          <span>Created {formatEasternDate(selectedContact.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <div className="relative">
                          <select
                            value={selectedContact.stage}
                            onChange={(event) => handleStageChange(selectedContact.id, event.target.value as PipelineStage)}
                            className={cn(
                              "appearance-none rounded-full border px-4 py-2 pr-9 text-xs font-semibold uppercase tracking-[0.18em] outline-none",
                              STAGE_META[selectedContact.stage].pill,
                            )}
                          >
                            {PIPELINE_STAGES.map((stage) => (
                              <option key={stage} value={stage} className="bg-slate-950 text-white">
                                {STAGE_META[stage].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-current" />
                        </div>

                        {selectedContact.competitor ? (
                          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-100">
                            {selectedContact.competitor}
                          </span>
                        ) : null}

                        <span className={cn("rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em]", SOURCE_META[selectedContact.source])}>
                          {selectedContact.source}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <a
                        href={selectedContact.email ? `mailto:${selectedContact.email}` : undefined}
                        className={cn(
                          "glass-card rounded-2xl p-4",
                          selectedContact.email ? "hover:border-blue-400/30" : "pointer-events-none opacity-70",
                        )}
                      >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                          <Mail size={14} className="text-blue-200" />
                          Email
                        </div>
                        <p className="mt-3 truncate text-sm text-white">{selectedContact.email || "No email"}</p>
                      </a>

                      <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                          <Phone size={14} className="text-blue-200" />
                          Phone
                        </div>
                        <p className="mt-3 truncate text-sm text-white">{getPhone(selectedContact) || "Not enriched"}</p>
                      </div>

                      <a
                        href={getWebsite(selectedContact) ? normalizeWebsite(getWebsite(selectedContact)) : undefined}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          "glass-card rounded-2xl p-4",
                          getWebsite(selectedContact) ? "hover:border-blue-400/30" : "pointer-events-none opacity-70",
                        )}
                      >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                          <Globe size={14} className="text-blue-200" />
                          Website
                        </div>
                        <p className="mt-3 truncate text-sm text-white">{getWebsite(selectedContact) || "No website"}</p>
                      </a>

                      <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                          <DollarSign size={14} className="text-blue-200" />
                          Retainer
                        </div>
                        <p className="mt-3 truncate text-sm text-white">{formatMoney(selectedContact.value)}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="glass-panel p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="section-title">Relationship Notes</p>
                      <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Personal context, business situation, conversation highlights, anything worth remembering.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {notesSaving ? <LoaderCircle size={14} className="animate-spin text-blue-200" /> : null}
                      {notesSaved ? "Saved" : notesSaving ? "Saving" : "Autosaves on blur"}
                    </div>
                  </div>

                  <textarea
                    value={notesDraft}
                    onChange={(event) => setNotesDraft(event.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder={MAIN_NOTE_PLACEHOLDER}
                    className="mt-4 min-h-[220px] w-full rounded-[1.25rem] border border-blue-400/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(10,10,15,0.7))] p-5 text-sm leading-6 text-white outline-none transition focus:border-blue-400/45"
                  />
                </section>

                <section className="glass-panel p-5 sm:p-6">
                  <div className="flex items-center gap-2">
                    <NotebookPen size={18} className="text-blue-200" />
                    <p className="section-title">Quick Notes Timeline</p>
                  </div>

                  <form onSubmit={handleAddQuickNote} className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={quickNoteDraft}
                      onChange={(event) => setQuickNoteDraft(event.target.value)}
                      placeholder="Add a quick note..."
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/50"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-400/35 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-3 text-sm font-medium text-white"
                    >
                      <Plus size={16} />
                      Add Note
                    </button>
                  </form>

                  <div className="mt-4 space-y-3">
                    {selectedNotesState.quickNotes.length ? (
                      selectedNotesState.quickNotes.map((note) => (
                        <div key={note.timestamp} className="glass-card rounded-2xl p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm text-white">{note.text}</p>
                              <p className="mt-2 text-xs text-slate-500">
                                {formatRelativeTime(note.timestamp)} · {formatEasternDate(note.timestamp)} ET
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuickNote(note.timestamp)}
                              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-red-400/30 hover:text-red-200"
                              aria-label="Delete note"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="glass-card rounded-2xl p-5 text-sm text-slate-400">
                        No quick notes yet.
                      </div>
                    )}
                  </div>
                </section>

                {selectedContact.conversationHistory?.length ? (
                  <section className="glass-panel p-5 sm:p-6">
                    <div className="flex items-center gap-2">
                      <MessagesSquare size={18} className="text-blue-200" />
                      <p className="section-title">Conversation History</p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedContact.conversationHistory.map((message, index) => (
                        <div
                          key={`${message.date}-${index}`}
                          className={cn(
                            "glass-card rounded-2xl p-4",
                            message.direction === "inbound"
                              ? "border-blue-400/20 bg-blue-500/10"
                              : "border-slate-400/20 bg-slate-500/10",
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                                {message.direction === "inbound" ? (
                                  <ArrowRight size={14} className="text-blue-200" />
                                ) : (
                                  <ArrowLeft size={14} className="text-slate-300" />
                                )}
                                {message.from}
                              </div>
                              <p className="mt-3 text-sm text-slate-100">{message.message}</p>
                            </div>
                            <p className="text-xs text-slate-500">{formatEasternDate(message.date)} ET</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {selectedContact.enrichmentData ? (
                  <section className="glass-panel p-5 sm:p-6">
                    <button
                      type="button"
                      onClick={() => setPanelOpen((current) => (current === "enrichment" ? null : "enrichment"))}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-blue-200" />
                        <p className="section-title">Enrichment Data</p>
                      </div>
                      {panelOpen === "enrichment" ? (
                        <ChevronUp size={18} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={18} className="text-slate-400" />
                      )}
                    </button>

                    {panelOpen === "enrichment" ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="glass-card rounded-2xl p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Google Rating</p>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {selectedContact.enrichmentData.googleRating ?? "N/A"}
                          </p>
                        </div>
                        <div className="glass-card rounded-2xl p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Review Count</p>
                          <p className="mt-2 text-lg font-semibold text-white">
                            {selectedContact.enrichmentData.reviewCount ?? "N/A"}
                          </p>
                        </div>
                        <div className="glass-card rounded-2xl p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Cuisine</p>
                          <p className="mt-2 text-sm text-white">{selectedContact.enrichmentData.cuisine || "N/A"}</p>
                        </div>
                        <div className="glass-card rounded-2xl p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Social Links</p>
                          <div className="mt-2 space-y-1 text-sm text-white">
                            <p>{selectedContact.enrichmentData.socialMedia?.facebook || "No Facebook"}</p>
                            <p>{selectedContact.enrichmentData.socialMedia?.instagram || "No Instagram"}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section className="glass-panel p-5 sm:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <p className="section-title">Actions</p>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative">
                          <select
                            value={selectedContact.stage}
                            onChange={(event) => handleStageChange(selectedContact.id, event.target.value as PipelineStage)}
                            className="appearance-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 pr-9 text-sm text-white outline-none transition focus:border-blue-400/50"
                          >
                            {PIPELINE_STAGES.map((stage) => (
                              <option key={stage} value={stage} className="bg-slate-950 text-white">
                                Move to {STAGE_META[stage].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditMode((current) => !current)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:border-blue-400/30"
                        >
                          <UserRoundPen size={16} />
                          {editMode ? "Close Edit" : "Edit"}
                        </button>

                        <button
                          type="button"
                          onClick={handleDeleteContact}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100 transition hover:border-red-400/40"
                        >
                          <Trash2 size={16} />
                          Delete Contact
                        </button>
                      </div>
                    </div>

                    {editMode ? (
                      <div className="grid w-full gap-3 sm:grid-cols-3 xl:max-w-3xl">
                        <input
                          value={editForm.name}
                          onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Name"
                          className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/50"
                        />
                        <input
                          value={editForm.company}
                          onChange={(event) => setEditForm((current) => ({ ...current, company: event.target.value }))}
                          placeholder="Company"
                          className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/50"
                        />
                        <div className="flex gap-3">
                          <input
                            value={editForm.email}
                            onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                            placeholder="Email"
                            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/50"
                          />
                          <button
                            type="button"
                            onClick={handleSaveInlineEdit}
                            className="rounded-2xl border border-blue-400/35 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-3 text-sm font-medium text-white"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              </>
            )}
          </main>

          <aside className="hidden space-y-4 xl:block">
            <section className="glass-panel p-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-200" />
                <p className="section-title">Stage Distribution</p>
              </div>
              <div className="mt-5 flex h-48 items-end gap-3">
                {stageCounts.map(({ stage, count }) => (
                  <div key={stage} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-2xl bg-[linear-gradient(180deg,#2093FF,#0026FF)]"
                      style={{
                        height: `${Math.max(10, (count / maxStageCount) * 100)}%`,
                        opacity: count === 0 ? 0.25 : 1,
                      }}
                    />
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{STAGE_META[stage].label}</p>
                    <p className="text-xs text-white">{count}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <MetricCard label="Total Contacts" value={`${contacts.length}`} icon={Building2} />
              <MetricCard label="Won This Month" value={`${wonThisMonth}`} icon={Sparkles} />
              <MetricCard label="Conversion Rate" value={`${conversionRate}%`} icon={BarChart3} />
            </section>

            <section className="glass-panel p-4">
              <p className="section-title">Recent Activity</p>
              <div className="mt-4 space-y-3">
                {recentActivity.map((contact) => (
                  <div key={contact.id} className="glass-card rounded-2xl p-3">
                    <p className="text-sm font-medium text-white">{getPrimaryName(contact)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Moved to {STAGE_META[contact.stage].label}
                    </p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      {formatEasternDate(contact.stageUpdatedAt ?? contact.createdAt)} ET
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">New Contact</p>
                <h2 className="heading-font mt-2 text-3xl font-normal uppercase tracking-[0.04em] text-white">
                  Add Contact
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:border-blue-400/30 hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Name"
                  required
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/50"
                />
                <input
                  value={createForm.company}
                  onChange={(event) => setCreateForm((current) => ({ ...current, company: event.target.value }))}
                  placeholder="Company"
                  required
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/50"
                />
                <input
                  value={createForm.email}
                  onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="Email"
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/50"
                />
                <input
                  value={createForm.phone}
                  onChange={(event) => setCreateForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Phone"
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/50"
                />
                <div className="relative">
                  <select
                    value={createForm.stage}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, stage: event.target.value as PipelineStage }))
                    }
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 pr-9 text-sm text-white outline-none transition focus:border-blue-400/50"
                  >
                    {PIPELINE_STAGES.map((stage) => (
                      <option key={stage} value={stage} className="bg-slate-950 text-white">
                        {STAGE_META[stage].label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
                <div className="relative">
                  <select
                    value={createForm.source}
                    onChange={(event) =>
                      setCreateForm((current) => ({ ...current, source: event.target.value as PipelineSource }))
                    }
                    className="w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 pr-9 text-sm text-white outline-none transition focus:border-blue-400/50"
                  >
                    <option value="instantly" className="bg-slate-950 text-white">
                      Instantly
                    </option>
                    <option value="manual" className="bg-slate-950 text-white">
                      Manual
                    </option>
                    <option value="referral" className="bg-slate-950 text-white">
                      Referral
                    </option>
                    <option value="website" className="bg-slate-950 text-white">
                      Website
                    </option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <textarea
                value={createForm.notes}
                onChange={(event) => setCreateForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder={MAIN_NOTE_PLACEHOLDER}
                className="min-h-[180px] w-full rounded-[1.25rem] border border-blue-400/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(10,10,15,0.7))] p-5 text-sm leading-6 text-white outline-none transition focus:border-blue-400/45"
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-blue-400/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-400/35 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
                  Create Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
