"use client";

import { type ReactNode, ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Download,
  FileSpreadsheet,
  Globe,
  Mail,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneLogEntry, PIPELINE_STAGES, PipelineDeal, PipelineStage } from "@/lib/pipeline-types";

type SortMode = "newest" | "alphabetical" | "stage";

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
  source: string;
  stage: PipelineStage;
  notes: string;
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

const EASTERN_TIME_ZONE = "America/New_York";
const SOURCE_TAB_ORDER = ["instantly", "allgood", "referral", "manual"];
const EMPTY_NOTES: DealNotesState = { rolodex: "", quickNotes: [] };
const EMPTY_ADD_FORM: AddContactForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  source: "manual",
  stage: "new-lead",
  notes: "",
};

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

  const ordered = SOURCE_TAB_ORDER.map((source) => ({
    value: source,
    label: formatSourceLabel(source),
    count: counts.get(source) ?? 0,
  }));

  const dynamic = Array.from(counts.keys())
    .filter((source) => !SOURCE_TAB_ORDER.includes(source))
    .sort((a, b) => a.localeCompare(b))
    .map((source) => ({
      value: source,
      label: formatSourceLabel(source),
      count: counts.get(source) ?? 0,
    }));

  return [{ value: "all", label: "ALL", count: deals.length }, ...ordered, ...dynamic];
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

  return next.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
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
    notes.rolodex,
    ...notes.quickNotes.map((entry) => entry.text),
    ...deal.phoneLog.map((entry) => entry.notes),
  ]
    .join(" ")
    .toLowerCase();
}

function normalizeStageValue(value: string): PipelineStage {
  return PIPELINE_STAGES.includes(value as PipelineStage) ? (value as PipelineStage) : "new-lead";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#02040a]/80 p-4 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-4xl p-5 sm:p-6">
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
  );
}

export default function PipelinePage() {
  const router = useRouter();
  const [deals, setDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSource, setActiveSource] = useState("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [selectedId, setSelectedId] = useState("");
  const [mobileOpenId, setMobileOpenId] = useState("");
  const [rolodexDraft, setRolodexDraft] = useState("");
  const [quickNoteDraft, setQuickNoteDraft] = useState("");
  const [showPhoneComposer, setShowPhoneComposer] = useState(false);
  const [phoneDateDraft, setPhoneDateDraft] = useState("");
  const [phoneNotesDraft, setPhoneNotesDraft] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [addForm, setAddForm] = useState<AddContactForm>(EMPTY_ADD_FORM);
  const [submittingContact, setSubmittingContact] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<CsvImportRow[]>([]);
  const [importPreviewError, setImportPreviewError] = useState("");
  const [importing, setImporting] = useState(false);
  const [workingDealId, setWorkingDealId] = useState("");
  const [convertingDealId, setConvertingDealId] = useState("");

  async function loadDeals() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/pipeline", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load pipeline.");
      const data = (await response.json()) as PipelineDeal[];
      setDeals(data);
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

  const filteredDeals = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = deals.filter((deal) => {
      const sourceMatch = activeSource === "all" || normalizeSourceValue(deal.source) === activeSource;
      const searchMatch = !normalizedSearch || getSearchableText(deal).includes(normalizedSearch);
      return sourceMatch && searchMatch;
    });

    return sortDeals(filtered, sortMode);
  }, [activeSource, deals, search, sortMode]);

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
      return;
    }

    const parsed = parseNotes(selectedDeal.notes, selectedDeal.createdAt);
    setRolodexDraft(parsed.rolodex);
    setQuickNoteDraft("");
    setShowPhoneComposer(false);
    setPhoneDateDraft(formatPhoneLogDate());
    setPhoneNotesDraft("");
  }, [selectedDeal]);

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

  const wonThisMonth = deals.filter((deal) => deal.stage === "closed-won" && isCurrentEasternMonth(deal.stageUpdatedAt ?? deal.createdAt)).length;

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

  async function deletePhoneCall(deal: PipelineDeal, callId: string) {
    await patchDeal(deal.id, {
      phoneLog: deal.phoneLog.filter((entry) => entry.id !== callId),
    });
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
          source: addForm.source,
          stage: addForm.stage,
          notes: serializeNotes({ rolodex: addForm.notes, quickNotes: [] }),
        }),
      });

      if (!response.ok) throw new Error("Unable to create contact.");
      const created = (await response.json()) as PipelineDeal;

      setDeals((current) => [created, ...current]);
      setSelectedId(created.id);
      setMobileOpenId(created.id);
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
              CRM pipeline with source tabs, call tracking, quick notes, and direct client conversion.
            </p>
          </div>
          <div className="glass-card inline-flex items-center gap-3 self-start rounded-2xl px-4 py-3 text-sm text-slate-200">
            <BarChart3 size={16} className="text-blue-200" />
            <span>{deals.length} active contacts</span>
          </div>
        </div>
      </header>

      <div className="glass-panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <div className="flex min-w-max gap-1 px-3 pt-3">
            {sourceTabs.map((tab) => {
              const active = activeSource === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveSource(tab.value)}
                  className={cn(
                    "relative inline-flex items-center gap-2 whitespace-nowrap rounded-t-2xl border-b-2 px-4 py-3 text-xs font-semibold tracking-[0.18em] transition",
                    active
                      ? "border-[#2093FF] text-[#7FC2FF]"
                      : "border-transparent text-slate-400 hover:text-slate-200",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px]",
                      active ? "border-blue-300/35 bg-blue-500/10 text-blue-100" : "border-white/10 bg-white/5 text-slate-300",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error ? <div className="glass-card rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

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
                <option value="newest">Newest</option>
                <option value="alphabetical">A-Z</option>
                <option value="stage">Stage</option>
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

            <div className="max-h-[calc(100vh-24rem)] space-y-2 overflow-y-auto pr-1">
              {filteredDeals.length ? (
                filteredDeals.map((deal) => {
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
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="glass-card rounded-2xl p-5 text-sm text-slate-400">No contacts match this source filter.</div>
              )}
            </div>

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
                      <h2 className="heading-font mt-2 text-3xl font-normal uppercase tracking-[0.04em] text-white sm:text-4xl">
                        {getPrimaryName(detailDeal)}
                      </h2>
                      <p className="mt-2 text-sm text-slate-300">{getCompanyName(detailDeal)}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <select
                        value={detailDeal.stage}
                        onChange={(event) => void patchDeal(detailDeal.id, { stage: event.target.value as PipelineStage })}
                        className={cn("rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em] outline-none", STAGE_META[detailDeal.stage].pill)}
                      >
                        {PIPELINE_STAGES.map((stage) => (
                          <option key={stage} value={stage}>
                            {STAGE_META[stage].label}
                          </option>
                        ))}
                      </select>
                      <span className="rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-blue-100">
                        {formatSourceLabel(detailDeal.source)}
                      </span>
                      {detailDeal.competitor ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-200">
                          {detailDeal.competitor}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="glass-panel p-5 sm:p-6">
                <div className="grid gap-3 md:grid-cols-3">
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
                    phoneLog.map((entry) => (
                      <div key={entry.id} className="glass-card flex items-start justify-between gap-3 rounded-2xl p-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.16em] text-blue-100">{entry.date}</p>
                          <p className="mt-2 text-sm text-white">{entry.notes}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void deletePhoneCall(detailDeal, entry.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-red-400/40 hover:text-red-200"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
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
                      .map((note) => (
                        <div key={note.id} className="glass-card rounded-2xl p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-blue-100">{formatCreatedAt(note.timestamp)}</p>
                          <p className="mt-2 text-sm text-white">{note.text}</p>
                        </div>
                      ))
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

            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60"
            >
              <Upload size={16} />
              Import CSV
            </button>
          </div>
        </aside>
      </div>

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
              <span className="text-xs uppercase tracking-[0.16em] text-slate-400">Stage</span>
              <select
                value={addForm.stage}
                onChange={(event) => setAddForm((current) => ({ ...current, stage: event.target.value as PipelineStage }))}
                className="w-full rounded-2xl border border-white/10 bg-[#0a0a0f] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
              >
                {PIPELINE_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_META[stage].label}
                  </option>
                ))}
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
