"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  BookUser,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  Gift,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Share2,
  Trash2,
  Users,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INTERACTION_TYPE_LABELS,
  INTERACTION_TYPES,
  type InteractionType,
  type RelationshipType,
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_TYPES,
  type RolodexContact,
  type StayInTouchReminder,
} from "@/lib/rolodex-types";
import { type ConversationHistoryItem, type PipelineDeal } from "@/lib/pipeline-types";

type ViewMode = "grid" | "list";
type SortMode = "recently-contacted" | "alphabetical" | "relationship-score" | "needs-attention";
type DetailTab = "overview" | "timeline" | "notes";
type QuickFilter = "follow-up" | "new-this-month" | "birthday-this-month";

type ContactFormState = {
  firstName: string;
  lastName: string;
  nickname: string;
  avatar: string;
  email: string;
  phone: string;
  secondaryEmail: string;
  secondaryPhone: string;
  company: string;
  title: string;
  industry: string;
  website: string;
  city: string;
  state: string;
  country: string;
  relationshipType: RelationshipType;
  tags: string;
  howWeMet: string;
  metDate: string;
  introducedBy: string;
  birthday: string;
  spouse: string;
  children: string;
  interests: string;
  favoriteFood: string;
  personalNotes: string;
  linkedin: string;
  instagram: string;
  twitter: string;
  facebook: string;
  pipelineDealId: string;
  stayInTouchEnabled: boolean;
  stayInTouchFrequency: StayInTouchReminder["frequency"];
  stayInTouchCustomDays: string;
  stayInTouchSnoozedUntil: string;
};

type InteractionFormState = {
  type: InteractionType;
  date: string;
  summary: string;
  details: string;
  sentiment: "" | "positive" | "neutral" | "negative";
};

const RELATIONSHIP_FILTERS: Array<{ value: "all" | RelationshipType; label: string }> = [
  { value: "all", label: "All" },
  { value: "client", label: "Clients" },
  { value: "prospect", label: "Prospects" },
  { value: "partner", label: "Partners" },
  { value: "vendor", label: "Vendors" },
  { value: "mentor", label: "Mentors" },
  { value: "friend", label: "Friends" },
  { value: "industry", label: "Industry" },
  { value: "team", label: "Team" },
];

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "recently-contacted", label: "Recently Contacted" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "relationship-score", label: "Relationship Score" },
  { value: "needs-attention", label: "Needs Attention" },
];

const QUICK_FILTERS: Array<{ value: QuickFilter; label: string }> = [
  { value: "follow-up", label: "Needs Follow-Up" },
  { value: "new-this-month", label: "New This Month" },
  { value: "birthday-this-month", label: "Birthday This Month" },
];

const EMPTY_CONTACT_FORM: ContactFormState = {
  firstName: "",
  lastName: "",
  nickname: "",
  avatar: "",
  email: "",
  phone: "",
  secondaryEmail: "",
  secondaryPhone: "",
  company: "",
  title: "",
  industry: "",
  website: "",
  city: "",
  state: "",
  country: "",
  relationshipType: "other",
  tags: "",
  howWeMet: "",
  metDate: "",
  introducedBy: "",
  birthday: "",
  spouse: "",
  children: "",
  interests: "",
  favoriteFood: "",
  personalNotes: "",
  linkedin: "",
  instagram: "",
  twitter: "",
  facebook: "",
  pipelineDealId: "",
  stayInTouchEnabled: false,
  stayInTouchFrequency: "monthly",
  stayInTouchCustomDays: "",
  stayInTouchSnoozedUntil: "",
};

const EMPTY_INTERACTION_FORM: InteractionFormState = {
  type: "meeting",
  date: easternDate(),
  summary: "",
  details: "",
  sentiment: "",
};

function easternDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function monthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth() {
  return new Date().getMonth() + 1;
}

function contactFullName(contact: Pick<RolodexContact, "firstName" | "lastName" | "nickname">) {
  return [contact.firstName, contact.nickname ? `"${contact.nickname}"` : "", contact.lastName].filter(Boolean).join(" ");
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatRelativeDate(value?: string) {
  if (!value) return "Never";
  const target = new Date(`${value}T12:00:00.000Z`).getTime();
  if (Number.isNaN(target)) return value;
  const today = new Date(`${easternDate()}T12:00:00.000Z`).getTime();
  const days = Math.max(0, Math.floor((today - target) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? "" : "s"} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? "" : "s"} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? "" : "s"} ago`;
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function relationshipTone(type: RelationshipType) {
  return {
    client: "border-blue-300/30 bg-blue-500/15 text-blue-100",
    prospect: "border-amber-300/30 bg-amber-500/15 text-amber-100",
    partner: "border-green-300/30 bg-green-500/15 text-green-100",
    vendor: "border-purple-300/30 bg-purple-500/15 text-purple-100",
    mentor: "border-cyan-300/30 bg-cyan-500/15 text-cyan-100",
    investor: "border-yellow-300/30 bg-yellow-500/15 text-yellow-100",
    friend: "border-pink-300/30 bg-pink-500/15 text-pink-100",
    industry: "border-slate-300/30 bg-slate-500/15 text-slate-100",
    team: "border-indigo-300/30 bg-indigo-500/15 text-indigo-100",
    other: "border-white/10 bg-white/5 text-slate-200",
  }[type];
}

function interactionTone(type: InteractionType) {
  return {
    call: "border-blue-300/30 bg-blue-500/15 text-blue-100",
    email: "border-violet-300/30 bg-violet-500/15 text-violet-100",
    meeting: "border-green-300/30 bg-green-500/15 text-green-100",
    text: "border-cyan-300/30 bg-cyan-500/15 text-cyan-100",
    social: "border-sky-300/30 bg-sky-500/15 text-sky-100",
    event: "border-amber-300/30 bg-amber-500/15 text-amber-100",
    note: "border-white/10 bg-white/5 text-slate-200",
    gift: "border-pink-300/30 bg-pink-500/15 text-pink-100",
    referral: "border-emerald-300/30 bg-emerald-500/15 text-emerald-100",
    deal: "border-yellow-300/30 bg-yellow-500/15 text-yellow-100",
  }[type];
}

function scoreBarClass(score: number) {
  if (score >= 80) return "from-emerald-400 via-green-300 to-cyan-300";
  if (score >= 60) return "from-blue-400 via-sky-300 to-cyan-300";
  if (score >= 40) return "from-amber-400 via-yellow-300 to-orange-300";
  return "from-rose-400 via-orange-300 to-amber-300";
}

function interactionIcon(type: InteractionType) {
  if (type === "call") return Phone;
  if (type === "email") return Mail;
  if (type === "meeting") return Calendar;
  if (type === "text") return MessageSquare;
  if (type === "social") return Globe;
  if (type === "event") return Users;
  if (type === "note") return FileText;
  if (type === "gift") return Gift;
  if (type === "referral") return Share2;
  return DollarSign;
}

function reminderLabel(contact: RolodexContact, reminderIds: Set<string>) {
  if (reminderIds.has(contact.id)) return `Due now${contact.nextFollowUp ? ` · ${formatDate(contact.nextFollowUp)}` : ""}`;
  if (contact.nextFollowUp) return `Next follow-up ${formatDate(contact.nextFollowUp)}`;
  return "No reminder";
}

function buildContactForm(contact?: RolodexContact): ContactFormState {
  if (!contact) return EMPTY_CONTACT_FORM;
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    nickname: contact.nickname ?? "",
    avatar: contact.avatar ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    secondaryEmail: contact.secondaryEmail ?? "",
    secondaryPhone: contact.secondaryPhone ?? "",
    company: contact.company ?? "",
    title: contact.title ?? "",
    industry: contact.industry ?? "",
    website: contact.website ?? "",
    city: contact.city ?? "",
    state: contact.state ?? "",
    country: contact.country ?? "",
    relationshipType: contact.relationshipType,
    tags: contact.tags.join(", "),
    howWeMet: contact.howWeMet ?? "",
    metDate: contact.metDate ?? "",
    introducedBy: contact.introducedBy ?? "",
    birthday: contact.birthday ?? "",
    spouse: contact.spouse ?? "",
    children: contact.children ?? "",
    interests: contact.interests ?? "",
    favoriteFood: contact.favoriteFood ?? "",
    personalNotes: contact.personalNotes ?? "",
    linkedin: contact.linkedin ?? "",
    instagram: contact.instagram ?? "",
    twitter: contact.twitter ?? "",
    facebook: contact.facebook ?? "",
    pipelineDealId: contact.pipelineDealId ?? "",
    stayInTouchEnabled: Boolean(contact.stayInTouch),
    stayInTouchFrequency: contact.stayInTouch?.frequency ?? "monthly",
    stayInTouchCustomDays: contact.stayInTouch?.customDays ? String(contact.stayInTouch.customDays) : "",
    stayInTouchSnoozedUntil: contact.stayInTouch?.snoozedUntil ?? "",
  };
}

function buildContactPayload(form: ContactFormState) {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    nickname: form.nickname || undefined,
    avatar: form.avatar || undefined,
    email: form.email || undefined,
    phone: form.phone || undefined,
    secondaryEmail: form.secondaryEmail || undefined,
    secondaryPhone: form.secondaryPhone || undefined,
    company: form.company || undefined,
    title: form.title || undefined,
    industry: form.industry || undefined,
    website: form.website || undefined,
    city: form.city || undefined,
    state: form.state || undefined,
    country: form.country || undefined,
    relationshipType: form.relationshipType || "other",
    tags: splitTags(form.tags),
    howWeMet: form.howWeMet || undefined,
    metDate: form.metDate || undefined,
    introducedBy: form.introducedBy || undefined,
    birthday: form.birthday || undefined,
    spouse: form.spouse || undefined,
    children: form.children || undefined,
    interests: form.interests || undefined,
    favoriteFood: form.favoriteFood || undefined,
    personalNotes: form.personalNotes || undefined,
    linkedin: form.linkedin || undefined,
    instagram: form.instagram || undefined,
    twitter: form.twitter || undefined,
    facebook: form.facebook || undefined,
    pipelineDealId: form.pipelineDealId || undefined,
    stayInTouch: form.stayInTouchEnabled
      ? {
          frequency: form.stayInTouchFrequency,
          customDays: form.stayInTouchFrequency === "custom" && form.stayInTouchCustomDays ? Number(form.stayInTouchCustomDays) : undefined,
          snoozedUntil: form.stayInTouchSnoozedUntil || undefined,
        }
      : null,
  };
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Request failed.");
  }
  return (await response.json()) as T;
}

function fieldClassName() {
  return "min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60";
}

function textAreaClassName() {
  return `${fieldClassName()} min-h-[120px] resize-y`;
}

function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  name: keyof ContactFormState;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <input name={name} type={type} value={value} onChange={onChange} className={fieldClassName()} placeholder={placeholder} />
    </label>
  );
}

function FormTextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: keyof ContactFormState;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <textarea name={name} value={value} onChange={onChange} className={textAreaClassName()} placeholder={placeholder} />
    </label>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="relative flex h-20 w-20 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${score >= 80 ? "#22c55e" : score >= 60 ? "#38bdf8" : score >= 40 ? "#f59e0b" : "#fb7185"} ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
      }}
    >
      <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-white/10 bg-slate-950/90 text-lg font-semibold text-white">
        {score}
      </div>
    </div>
  );
}

export default function RolodexPage() {
  const [contacts, setContacts] = useState<RolodexContact[]>([]);
  const [reminders, setReminders] = useState<Array<RolodexContact & { overdueDays?: number }>>([]);
  const [pipelineDeals, setPipelineDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortMode, setSortMode] = useState<SortMode>("recently-contacted");
  const [relationshipFilter, setRelationshipFilter] = useState<"all" | RelationshipType>("all");
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [timelineFilter, setTimelineFilter] = useState<"all" | InteractionType>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [addForm, setAddForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM);
  const [detailForm, setDetailForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM);
  const [interactionForm, setInteractionForm] = useState<InteractionFormState>(EMPTY_INTERACTION_FORM);
  const [quickNote, setQuickNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [pipelinePrefillId, setPipelinePrefillId] = useState("");
  const [showMoreAddFields, setShowMoreAddFields] = useState(false);

  async function loadRolodex() {
    setError("");
    try {
      const [contactData, reminderData, pipelineData] = await Promise.all([
        readJson<RolodexContact[]>("/api/rolodex"),
        readJson<Array<RolodexContact & { overdueDays?: number }>>("/api/rolodex/reminders"),
        readJson<PipelineDeal[]>("/api/pipeline"),
      ]);
      setContacts(Array.isArray(contactData) ? contactData : []);
      setReminders(Array.isArray(reminderData) ? reminderData : []);
      setPipelineDeals(Array.isArray(pipelineData) ? pipelineData : []);
      if (!selectedId && Array.isArray(contactData) && contactData[0]) {
        setSelectedId(contactData[0].id);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load rolodex.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRolodex();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedContact = contacts.find((contact) => contact.id === selectedId) ?? null;
  const reminderIds = new Set(reminders.map((contact) => contact.id));
  const selectedPipeline = selectedContact?.pipelineDealId
    ? pipelineDeals.find((deal) => deal.id === selectedContact.pipelineDealId) ?? null
    : null;
  const conversationHistory: ConversationHistoryItem[] = selectedPipeline?.conversationHistory ?? [];

  useEffect(() => {
    setDetailForm(buildContactForm(selectedContact ?? undefined));
  }, [selectedContact?.id, selectedContact?.updatedAt]);

  const filteredContacts = contacts
    .filter((contact) => {
      if (relationshipFilter !== "all" && contact.relationshipType !== relationshipFilter) return false;
      if (quickFilters.includes("follow-up") && !reminderIds.has(contact.id)) return false;
      if (quickFilters.includes("new-this-month") && !contact.createdAt.startsWith(monthKey())) return false;
      if (quickFilters.includes("birthday-this-month")) {
        const birthdayMonth = contact.birthday ? Number(contact.birthday.split("-")[1]) : 0;
        if (birthdayMonth !== currentMonth()) return false;
      }

      if (!search.trim()) return true;
      const haystack = [
        contact.firstName,
        contact.lastName,
        contact.nickname,
        contact.company,
        contact.email,
        contact.phone,
        contact.tags.join(" "),
        contact.personalNotes,
        contact.howWeMet,
        contact.industry,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    })
    .sort((left, right) => {
      if (sortMode === "alphabetical") {
        return contactFullName(left).localeCompare(contactFullName(right));
      }
      if (sortMode === "relationship-score") {
        return right.relationshipScore - left.relationshipScore || contactFullName(left).localeCompare(contactFullName(right));
      }
      if (sortMode === "needs-attention") {
        const leftWeight = reminderIds.has(left.id) ? 1 : 0;
        const rightWeight = reminderIds.has(right.id) ? 1 : 0;
        return rightWeight - leftWeight || (left.nextFollowUp ?? "9999-99-99").localeCompare(right.nextFollowUp ?? "9999-99-99");
      }
      return (right.lastContactedAt ?? right.createdAt).localeCompare(left.lastContactedAt ?? left.createdAt);
    });

  const timelineEntries = (selectedContact?.interactions ?? []).filter((interaction) => timelineFilter === "all" || interaction.type === timelineFilter);
  const noteEntries = (selectedContact?.interactions ?? []).filter((interaction) => interaction.type === "note");

  function handleContactInputChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    const checked = "checked" in event.target ? event.target.checked : false;
    const nextValue = type === "checkbox" ? checked : value;
    setAddForm((current) => ({ ...current, [name]: nextValue }));
  }

  function handleDetailInputChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = event.target;
    const checked = "checked" in event.target ? event.target.checked : false;
    const nextValue = type === "checkbox" ? checked : value;
    setDetailForm((current) => ({ ...current, [name]: nextValue }));
  }

  function handlePrimaryContactChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    const looksLikeEmail = value.includes("@");
    setAddForm((current) => ({
      ...current,
      email: looksLikeEmail ? value : "",
      phone: looksLikeEmail ? "" : value,
    }));
  }

  function prefillFromPipeline(dealId: string, target: "add" | "detail") {
    const deal = pipelineDeals.find((entry) => entry.id === dealId);
    if (!deal) return;
    const sourceName = (deal.contact || deal.name || "").trim();
    const parts = sourceName.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || deal.client || "";
    const nextState = {
      firstName,
      lastName,
      email: deal.email ?? "",
      phone: deal.enrichmentData?.phone ?? "",
      company: deal.client ?? "",
      website: deal.website ?? deal.enrichmentData?.website ?? "",
      city: deal.city ?? "",
      state: deal.state ?? "",
      relationshipType: deal.stage === "closed-won" ? "client" : ("prospect" as RelationshipType),
      tags: deal.tags.join(", "),
      howWeMet: deal.source ? `Imported from pipeline (${deal.source})` : "Imported from pipeline",
      metDate: deal.createdAt ?? "",
      personalNotes: deal.notes ?? "",
      pipelineDealId: deal.id,
    };

    if (target === "add") {
      setAddForm((current) => ({ ...current, ...nextState }));
      return;
    }
    setDetailForm((current) => ({ ...current, ...nextState }));
  }

  async function createContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addForm.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setSaving(true);
    try {
      const contact = await readJson<RolodexContact>("/api/rolodex", {
        method: "POST",
        body: JSON.stringify(buildContactPayload(addForm)),
      });
      setContacts((current) => [contact, ...current]);
      setSelectedId(contact.id);
      setShowAddModal(false);
      setAddForm(EMPTY_CONTACT_FORM);
      setShowMoreAddFields(false);
      setPipelinePrefillId("");
      setToast("Contact added");
      await loadRolodex();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to create contact.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDetailForm() {
    if (!selectedContact) return;
    setSaving(true);
    try {
      const updated = await readJson<RolodexContact>(`/api/rolodex/${selectedContact.id}`, {
        method: "PATCH",
        body: JSON.stringify(buildContactPayload(detailForm)),
      });
      setContacts((current) => current.map((contact) => (contact.id === updated.id ? updated : contact)));
      setToast("Contact updated");
      await loadRolodex();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update contact.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveContact() {
    if (!selectedContact) return;
    setSaving(true);
    try {
      await readJson(`/api/rolodex/${selectedContact.id}`, { method: "DELETE" });
      setSelectedId("");
      setToast("Contact archived");
      await loadRolodex();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to archive contact.");
    } finally {
      setSaving(false);
    }
  }

  async function submitInteraction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact) return;
    setSaving(true);
    try {
      const result = await readJson<{ contact: RolodexContact }>(`/api/rolodex/${selectedContact.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          type: interactionForm.type,
          date: interactionForm.date,
          summary: interactionForm.summary,
          details: interactionForm.details || undefined,
          sentiment: interactionForm.sentiment || undefined,
        }),
      });
      setContacts((current) => current.map((contact) => (contact.id === result.contact.id ? result.contact : contact)));
      setInteractionForm({ ...EMPTY_INTERACTION_FORM, date: easternDate() });
      setShowInteractionModal(false);
      setToast("Interaction added");
      await loadRolodex();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add interaction.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteInteraction(interactionId: string) {
    if (!selectedContact) return;
    setSaving(true);
    try {
      const updated = await readJson<RolodexContact>(`/api/rolodex/${selectedContact.id}/interactions/${interactionId}`, { method: "DELETE" });
      setContacts((current) => current.map((contact) => (contact.id === updated.id ? updated : contact)));
      setToast("Interaction deleted");
      await loadRolodex();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to delete interaction.");
    } finally {
      setSaving(false);
    }
  }

  async function addQuickNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact || !quickNote.trim()) return;
    setSaving(true);
    try {
      const result = await readJson<{ contact: RolodexContact }>(`/api/rolodex/${selectedContact.id}/interactions`, {
        method: "POST",
        body: JSON.stringify({
          type: "note",
          date: easternDate(),
          summary: quickNote.trim(),
        }),
      });
      setContacts((current) => current.map((contact) => (contact.id === result.contact.id ? result.contact : contact)));
      setQuickNote("");
      setToast("Note added");
      await loadRolodex();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to add note.");
    } finally {
      setSaving(false);
    }
  }

  async function importSelectedPipelineContacts() {
    setSaving(true);
    try {
      await readJson("/api/rolodex/import-pipeline", {
        method: "POST",
        body: JSON.stringify(pipelinePrefillId ? { dealIds: [pipelinePrefillId] } : {}),
      });
      setToast("Pipeline contacts imported");
      await loadRolodex();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to import pipeline contacts.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="glass-panel rounded-[28px] p-6 text-sm text-slate-300">Loading rolodex...</section>;
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="glass-panel page-header relative overflow-hidden rounded-[28px] p-5 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(32,147,255,0.2),transparent_34%),linear-gradient(140deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
              <BookUser className="h-3.5 w-3.5" />
              Relationship System
            </div>
            <h1 className="page-title mt-3 flex items-center gap-3">
              <BookUser className="h-7 w-7 text-blue-100" />
              ROLODEX
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">{contacts.length.toLocaleString()} connections tracked across clients, prospects, partners, vendors, friends, and industry relationships.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="glass-card flex min-h-11 items-center gap-3 rounded-2xl px-4 py-2 text-sm text-slate-300">
              <Search className="h-4 w-4 text-blue-200" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, company, email, tags, notes"
                className="w-72 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setShowMoreAddFields(false);
                setShowAddModal(true);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
            >
              <Plus className="h-4 w-4" />
              Add Contact
            </button>
          </div>
        </div>
        {error ? <p className="relative mt-4 text-sm text-rose-200">{error}</p> : null}
      </div>

      <div className="glass-panel rounded-[24px] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIP_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setRelationshipFilter(filter.value)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                  relationshipFilter === filter.value
                    ? "border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((filter) => {
                const active = quickFilters.includes(filter.value);
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() =>
                      setQuickFilters((current) =>
                        current.includes(filter.value) ? current.filter((entry) => entry !== filter.value) : [...current, filter.value],
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                      active ? "border-cyan-300/30 bg-cyan-500/15 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300",
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <div className="glass-card inline-flex items-center rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition",
                    viewMode === "grid" ? "bg-[linear-gradient(135deg,#2093FF,#0026FF)] text-white" : "text-slate-300",
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition",
                    viewMode === "list" ? "bg-[linear-gradient(135deg,#2093FF,#0026FF)] text-white" : "text-slate-300",
                  )}
                >
                  <List className="h-3.5 w-3.5" />
                  List
                </button>
              </div>
              <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-slate-300">
                <Filter className="h-4 w-4 text-blue-200" />
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="bg-transparent text-sm text-white outline-none">
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-950">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="glass-card rounded-[24px] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Needs Attention</p>
              <p className="mt-3 text-3xl font-bold text-white">{reminders.length}</p>
              <p className="mt-2 text-sm text-slate-300">Sorted by most overdue first through the stay-in-touch system.</p>
            </article>
            <article className="glass-card rounded-[24px] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Average Score</p>
              <p className="mt-3 text-3xl font-bold text-white">
                {contacts.length ? Math.round(contacts.reduce((sum, contact) => sum + contact.relationshipScore, 0) / contacts.length) : 0}
              </p>
              <p className="mt-2 text-sm text-slate-300">Relationship strength based on recency, depth, sentiment, and engagement.</p>
            </article>
            <article className="glass-card rounded-[24px] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Pipeline Links</p>
              <p className="mt-3 text-3xl font-bold text-white">{contacts.filter((contact) => contact.pipelineDealId).length}</p>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <button type="button" onClick={() => void importSelectedPipelineContacts()} className="font-semibold text-blue-100 transition hover:text-white">
                  Import pipeline contacts
                </button>
                <ChevronRight className="h-4 w-4 text-blue-200" />
              </div>
            </article>
          </div>

          {viewMode === "grid" ? (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredContacts.map((contact) => (
                <article
                  key={contact.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedId(contact.id);
                    setDetailTab("overview");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(contact.id);
                      setDetailTab("overview");
                    }
                  }}
                  className={cn(
                    "glass-card relative overflow-hidden rounded-[24px] p-5 text-left transition hover:-translate-y-1",
                    selectedId === contact.id && "border-blue-300/35 shadow-[0_0_28px_rgba(32,147,255,0.18)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xl font-semibold text-white">{contactFullName(contact)}</p>
                      <p className="mt-1 truncate text-sm text-slate-300">
                        {[contact.company, contact.title].filter(Boolean).join(" · ") || "No company or title set"}
                      </p>
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", relationshipTone(contact.relationshipType))}>
                      {RELATIONSHIP_TYPE_LABELS[contact.relationshipType]}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1.5 transition hover:text-white">
                        <Phone className="h-4 w-4 text-blue-200" />
                        {contact.phone}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-blue-200" />
                        No phone
                      </span>
                    )}
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} onClick={(event) => event.stopPropagation()} className="inline-flex items-center gap-1.5 transition hover:text-white">
                        <Mail className="h-4 w-4 text-blue-200" />
                        {contact.email}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-blue-200" />
                        No email
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-blue-200" />
                      {[contact.city, contact.state].filter(Boolean).join(", ") || "Location unknown"}
                    </span>
                    <span>{formatRelativeDate(contact.lastContactedAt)}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {contact.tags.length ? (
                      contact.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-200">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                        No tags
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.14em] text-slate-400">
                    <div className="flex items-center gap-2">
                      {contact.phone ? <Phone className="h-3.5 w-3.5 text-blue-100" /> : null}
                      {contact.email ? <Mail className="h-3.5 w-3.5 text-blue-100" /> : null}
                      <span>{reminderLabel(contact, reminderIds)}</span>
                    </div>
                    <span>Score {contact.relationshipScore}</span>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className={cn("h-full rounded-full bg-gradient-to-r", scoreBarClass(contact.relationshipScore))} style={{ width: `${contact.relationshipScore}%` }} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="glass-panel overflow-hidden rounded-[24px]">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="border-b border-white/10 bg-white/5 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Phone</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Last Contacted</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((contact) => (
                      <tr
                        key={contact.id}
                        onClick={() => setSelectedId(contact.id)}
                        className="cursor-pointer border-b border-white/6 text-sm text-slate-200 transition hover:bg-white/5"
                      >
                        <td className="px-4 py-3 font-semibold text-white">{contactFullName(contact)}</td>
                        <td className="px-4 py-3">{contact.company || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]", relationshipTone(contact.relationshipType))}>
                            {RELATIONSHIP_TYPE_LABELS[contact.relationshipType]}
                          </span>
                        </td>
                        <td className="px-4 py-3">{contact.phone || "—"}</td>
                        <td className="px-4 py-3">{contact.email || "—"}</td>
                        <td className="px-4 py-3">{formatRelativeDate(contact.lastContactedAt)}</td>
                        <td className="px-4 py-3">{contact.relationshipScore}</td>
                        <td className="px-4 py-3">{contact.tags.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!filteredContacts.length ? (
            <div className="glass-panel flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-[24px] p-8 text-center">
              <div className="rounded-2xl border border-blue-300/25 bg-blue-500/10 p-4 text-blue-100">
                <BookUser className="h-6 w-6" />
              </div>
              <div>
                <h2 className="heading-font text-2xl font-normal uppercase tracking-[0.04em] text-white">No Contacts Match</h2>
                <p className="mt-2 text-sm text-slate-400">Adjust search or filters, or add a new relationship to the rolodex.</p>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="glass-panel sticky top-24 h-fit rounded-[28px] p-5 sm:p-6">
          {selectedContact ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-2xl font-semibold text-white">{contactFullName(selectedContact)}</p>
                  <p className="mt-1 text-sm text-slate-300">{[selectedContact.company, selectedContact.title].filter(Boolean).join(" · ") || "No company or title set"}</p>
                  <div className="mt-3">
                    <select
                      name="relationshipType"
                      value={detailForm.relationshipType}
                      onChange={handleDetailInputChange}
                      className={cn("rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] outline-none", relationshipTone(detailForm.relationshipType))}
                    >
                      {RELATIONSHIP_TYPES.map((type) => (
                        <option key={type} value={type} className="bg-slate-950 text-white">
                          {RELATIONSHIP_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <ScoreRing score={selectedContact.relationshipScore} />
              </div>

              <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
                <a
                  href={selectedContact.phone ? `tel:${selectedContact.phone}` : "#"}
                  className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition", selectedContact.phone ? "border-blue-300/25 bg-blue-500/10 text-blue-100 hover:bg-blue-500/15" : "pointer-events-none border-white/10 bg-white/5 text-slate-500")}
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
                <a
                  href={selectedContact.email ? `mailto:${selectedContact.email}` : "#"}
                  className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition", selectedContact.email ? "border-blue-300/25 bg-blue-500/10 text-blue-100 hover:bg-blue-500/15" : "pointer-events-none border-white/10 bg-white/5 text-slate-500")}
                >
                  <Mail className="h-4 w-4" />
                  Email
                </a>
                <a
                  href={selectedContact.phone ? `sms:${selectedContact.phone}` : "#"}
                  className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition", selectedContact.phone ? "border-cyan-300/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15" : "pointer-events-none border-white/10 bg-white/5 text-slate-500")}
                >
                  <MessageSquare className="h-4 w-4" />
                  Text
                </a>
                <a
                  href={selectedContact.linkedin || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition", selectedContact.linkedin ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "pointer-events-none border-white/10 bg-white/5 text-slate-500")}
                >
                  <ExternalLink className="h-4 w-4" />
                  LinkedIn
                </a>
                <a
                  href={selectedContact.website || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className={cn("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition", selectedContact.website ? "border-white/10 bg-white/5 text-white hover:bg-white/10" : "pointer-events-none border-white/10 bg-white/5 text-slate-500")}
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                <p>Last contacted {formatRelativeDate(selectedContact.lastContactedAt)}.</p>
                <p className="mt-2">{reminderLabel(selectedContact, reminderIds)}</p>
              </div>

              <div className="glass-card inline-flex rounded-full p-1">
                {(["overview", "timeline", "notes"] as DetailTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition",
                      detailTab === tab ? "bg-[linear-gradient(135deg,#2093FF,#0026FF)] text-white" : "text-slate-300",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {detailTab === "overview" ? (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="First Name" name="firstName" value={detailForm.firstName} onChange={handleDetailInputChange} />
                    <FormField label="Last Name" name="lastName" value={detailForm.lastName} onChange={handleDetailInputChange} />
                    <FormField label="Email" name="email" value={detailForm.email} onChange={handleDetailInputChange} type="email" />
                    <FormField label="Phone" name="phone" value={detailForm.phone} onChange={handleDetailInputChange} />
                    <FormField label="Company" name="company" value={detailForm.company} onChange={handleDetailInputChange} />
                    <FormField label="Title" name="title" value={detailForm.title} onChange={handleDetailInputChange} />
                    <FormField label="How We Met" name="howWeMet" value={detailForm.howWeMet} onChange={handleDetailInputChange} />
                    <FormField label="Met Date" name="metDate" value={detailForm.metDate} onChange={handleDetailInputChange} type="date" />
                    <FormField label="Birthday" name="birthday" value={detailForm.birthday} onChange={handleDetailInputChange} type="date" />
                    <FormField label="Spouse" name="spouse" value={detailForm.spouse} onChange={handleDetailInputChange} />
                    <FormField label="Children" name="children" value={detailForm.children} onChange={handleDetailInputChange} />
                    <FormField label="Interests" name="interests" value={detailForm.interests} onChange={handleDetailInputChange} />
                    <FormField label="Favorite Food" name="favoriteFood" value={detailForm.favoriteFood} onChange={handleDetailInputChange} />
                    <FormField label="Tags" name="tags" value={detailForm.tags} onChange={handleDetailInputChange} placeholder="VIP, Derby, Referral" />
                    <FormField label="LinkedIn" name="linkedin" value={detailForm.linkedin} onChange={handleDetailInputChange} />
                    <FormField label="Website" name="website" value={detailForm.website} onChange={handleDetailInputChange} />
                    <FormField label="City" name="city" value={detailForm.city} onChange={handleDetailInputChange} />
                    <FormField label="State" name="state" value={detailForm.state} onChange={handleDetailInputChange} />
                  </div>

                  <FormTextArea label="Personal Notes" name="personalNotes" value={detailForm.personalNotes} onChange={handleDetailInputChange} placeholder="Personal context worth remembering." />

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">Stay In Touch</p>
                        <p className="mt-1 text-sm text-slate-400">Reminder cadence for keeping the relationship warm.</p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                        <input type="checkbox" name="stayInTouchEnabled" checked={detailForm.stayInTouchEnabled} onChange={handleDetailInputChange} />
                        Enabled
                      </label>
                    </div>
                    {detailForm.stayInTouchEnabled ? (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Frequency</span>
                          <select name="stayInTouchFrequency" value={detailForm.stayInTouchFrequency} onChange={handleDetailInputChange} className={fieldClassName()}>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Biweekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                            <option value="custom">Custom</option>
                          </select>
                        </label>
                        {detailForm.stayInTouchFrequency === "custom" ? (
                          <FormField label="Custom Days" name="stayInTouchCustomDays" value={detailForm.stayInTouchCustomDays} onChange={handleDetailInputChange} type="number" />
                        ) : null}
                        <FormField label="Snoozed Until" name="stayInTouchSnoozedUntil" value={detailForm.stayInTouchSnoozedUntil} onChange={handleDetailInputChange} type="date" />
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">Pipeline Link</p>
                    <div className="mt-3 flex flex-col gap-3">
                      <select
                        value={detailForm.pipelineDealId}
                        name="pipelineDealId"
                        onChange={handleDetailInputChange}
                        className={fieldClassName()}
                      >
                        <option value="">No linked deal</option>
                        {pipelineDeals.map((deal) => (
                          <option key={deal.id} value={deal.id} className="bg-slate-950">
                            {(deal.contact || deal.name) && deal.client ? `${deal.contact || deal.name} · ${deal.client}` : deal.id}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => prefillFromPipeline(detailForm.pipelineDealId, "detail")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                      >
                        <Building2 className="h-4 w-4 text-blue-200" />
                        Autofill from linked pipeline deal
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={archiveContact}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15"
                    >
                      <Trash2 className="h-4 w-4" />
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveDetailForm()}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
                    >
                      <Check className="h-4 w-4" />
                      Save Contact
                    </button>
                  </div>
                </div>
              ) : null}

              {detailTab === "timeline" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <select value={timelineFilter} onChange={(event) => setTimelineFilter(event.target.value as "all" | InteractionType)} className={fieldClassName()}>
                      <option value="all">All interactions</option>
                      {INTERACTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {INTERACTION_TYPE_LABELS[type]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowInteractionModal(true)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
                    >
                      <Plus className="h-4 w-4" />
                      Add Interaction
                    </button>
                  </div>

                  <div className="space-y-3">
                    {timelineEntries.map((interaction) => {
                      const Icon = interactionIcon(interaction.type);
                      return (
                        <article key={interaction.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", interactionTone(interaction.type))}>
                                    {INTERACTION_TYPE_LABELS[interaction.type]}
                                  </span>
                                  <span className="text-xs uppercase tracking-[0.14em] text-slate-400">{formatDate(interaction.date)}</span>
                                </div>
                                <p className="mt-2 text-sm font-semibold text-white">{interaction.summary}</p>
                                {interaction.details ? <p className="mt-1 text-sm text-slate-300">{interaction.details}</p> : null}
                              </div>
                            </div>
                            <button type="button" onClick={() => void deleteInteraction(interaction.id)} className="text-slate-500 transition hover:text-rose-200">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {!timelineEntries.length ? <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">No interactions yet.</div> : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold text-white">Instantly Conversation History</p>
                    <div className="mt-3 space-y-3">
                      {conversationHistory.length ? (
                        conversationHistory.map((item, index) => (
                          <div key={`${item.date}-${index}`} className="rounded-2xl border border-white/8 bg-slate-950/50 p-3">
                            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                              <span>{item.direction}</span>
                              <span>{item.date}</span>
                            </div>
                            <p className="mt-2 text-sm text-white">{item.message}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.from}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-400">No linked Instantly conversation history.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {detailTab === "notes" ? (
                <div className="space-y-4">
                  <form onSubmit={addQuickNote} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <label className="block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Quick Note</span>
                      <textarea value={quickNote} onChange={(event) => setQuickNote(event.target.value)} className="mt-2 min-h-[90px] w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60" placeholder="Capture a quick observation, reminder, or context." />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]">
                        <Plus className="h-4 w-4" />
                        Add Note
                      </button>
                    </div>
                  </form>

                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Rich Notes Area</span>
                    <textarea name="personalNotes" value={detailForm.personalNotes} onChange={handleDetailInputChange} className="mt-2 min-h-[180px] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/60" placeholder="Long-form relationship notes, context, and memory cues." />
                  </label>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => void saveDetailForm()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]">
                      <Check className="h-4 w-4" />
                      Save Notes
                    </button>
                  </div>

                  <div className="space-y-3">
                    {noteEntries.length ? (
                      noteEntries.map((note) => (
                        <div key={note.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                            <span>{formatDate(note.date)}</span>
                            <span>{note.createdAt.replace("T", " ").slice(0, 16)}</span>
                          </div>
                          <p className="mt-2 text-sm text-white">{note.summary}</p>
                          {note.details ? <p className="mt-1 text-sm text-slate-300">{note.details}</p> : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300">No note history yet.</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4 text-blue-100">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <h2 className="heading-font text-2xl font-normal uppercase tracking-[0.04em] text-white">Select A Contact</h2>
                <p className="mt-2 text-sm text-slate-400">Open any card to see details, manage reminders, and log interactions.</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/80 px-4 py-10 backdrop-blur-md">
          <div className="glass-panel w-full max-w-5xl rounded-[28px] p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/70">New Relationship</p>
                <h2 className="page-title mt-2">Add Contact</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMoreAddFields(false);
                  setShowAddModal(false);
                }}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={createContact} className="mt-6 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                  <label className="flex-1 space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Import from Pipeline</span>
                    <select value={pipelinePrefillId} onChange={(event) => setPipelinePrefillId(event.target.value)} className={fieldClassName()}>
                      <option value="">Choose a pipeline lead</option>
                      {pipelineDeals.map((deal) => (
                        <option key={deal.id} value={deal.id} className="bg-slate-950">
                          {(deal.contact || deal.name) && deal.client ? `${deal.contact || deal.name} · ${deal.client}` : deal.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={() => prefillFromPipeline(pipelinePrefillId, "add")} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                    <Building2 className="h-4 w-4 text-blue-200" />
                    Autofill Fields
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Basic Info</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">First Name</span>
                    <input
                      name="firstName"
                      value={addForm.firstName}
                      onChange={handleContactInputChange}
                      className={fieldClassName()}
                      required
                    />
                  </label>
                  <FormField label="Last Name" name="lastName" value={addForm.lastName} onChange={handleContactInputChange} />
                  <label className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Email/Phone</span>
                    <input
                      value={addForm.email || addForm.phone}
                      onChange={handlePrimaryContactChange}
                      className={fieldClassName()}
                      placeholder="name@company.com or (555) 555-5555"
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5">
                  <button
                    type="button"
                    onClick={() => setShowMoreAddFields((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">Show More Fields</p>
                      <p className="text-xs text-slate-400">Company, relationship details, personal notes, socials, reminders, and more.</p>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-slate-300 transition", showMoreAddFields ? "rotate-90" : "")} />
                  </button>

                  {showMoreAddFields ? (
                    <div className="space-y-6 border-t border-white/10 px-4 py-4">
                      <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Additional Contact</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField label="Email" name="email" value={addForm.email} onChange={handleContactInputChange} type="email" />
                          <FormField label="Phone" name="phone" value={addForm.phone} onChange={handleContactInputChange} />
                          <FormField label="Secondary Email" name="secondaryEmail" value={addForm.secondaryEmail} onChange={handleContactInputChange} type="email" />
                          <FormField label="Secondary Phone" name="secondaryPhone" value={addForm.secondaryPhone} onChange={handleContactInputChange} />
                          <FormField label="Nickname" name="nickname" value={addForm.nickname} onChange={handleContactInputChange} />
                          <FormField label="Avatar" name="avatar" value={addForm.avatar} onChange={handleContactInputChange} placeholder="URL or emoji" />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Professional</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField label="Company" name="company" value={addForm.company} onChange={handleContactInputChange} />
                          <FormField label="Title" name="title" value={addForm.title} onChange={handleContactInputChange} />
                          <FormField label="Industry" name="industry" value={addForm.industry} onChange={handleContactInputChange} />
                          <FormField label="Website" name="website" value={addForm.website} onChange={handleContactInputChange} />
                          <FormField label="City" name="city" value={addForm.city} onChange={handleContactInputChange} />
                          <FormField label="State" name="state" value={addForm.state} onChange={handleContactInputChange} />
                          <FormField label="Country" name="country" value={addForm.country} onChange={handleContactInputChange} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Relationship</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Type</span>
                            <select name="relationshipType" value={addForm.relationshipType || "other"} onChange={handleContactInputChange} className={fieldClassName()}>
                              {RELATIONSHIP_TYPES.map((type) => (
                                <option key={type} value={type} className="bg-slate-950">
                                  {RELATIONSHIP_TYPE_LABELS[type]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <FormField label="Met Date" name="metDate" value={addForm.metDate} onChange={handleContactInputChange} type="date" />
                          <FormField label="Tags" name="tags" value={addForm.tags} onChange={handleContactInputChange} placeholder="Client, VIP, Referral" />
                          <FormField label="How We Met" name="howWeMet" value={addForm.howWeMet} onChange={handleContactInputChange} />
                          <FormField label="Introduced By" name="introducedBy" value={addForm.introducedBy} onChange={handleContactInputChange} />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Personal</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField label="Birthday" name="birthday" value={addForm.birthday} onChange={handleContactInputChange} type="date" />
                          <FormField label="Spouse" name="spouse" value={addForm.spouse} onChange={handleContactInputChange} />
                          <FormField label="Children" name="children" value={addForm.children} onChange={handleContactInputChange} />
                          <FormField label="Favorite Food" name="favoriteFood" value={addForm.favoriteFood} onChange={handleContactInputChange} />
                          <FormField label="Interests" name="interests" value={addForm.interests} onChange={handleContactInputChange} />
                        </div>
                        <FormTextArea label="Personal Notes" name="personalNotes" value={addForm.personalNotes} onChange={handleContactInputChange} />
                      </div>

                      <div className="space-y-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Social Links</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField label="LinkedIn" name="linkedin" value={addForm.linkedin} onChange={handleContactInputChange} />
                          <FormField label="Instagram" name="instagram" value={addForm.instagram} onChange={handleContactInputChange} />
                          <FormField label="Twitter" name="twitter" value={addForm.twitter} onChange={handleContactInputChange} />
                          <FormField label="Facebook" name="facebook" value={addForm.facebook} onChange={handleContactInputChange} />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                          <input type="checkbox" name="stayInTouchEnabled" checked={addForm.stayInTouchEnabled} onChange={handleContactInputChange} />
                          Enable stay-in-touch reminders
                        </label>
                        {addForm.stayInTouchEnabled ? (
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="space-y-2">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Frequency</span>
                              <select name="stayInTouchFrequency" value={addForm.stayInTouchFrequency} onChange={handleContactInputChange} className={fieldClassName()}>
                                <option value="weekly">Weekly</option>
                                <option value="biweekly">Biweekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="yearly">Yearly</option>
                                <option value="custom">Custom</option>
                              </select>
                            </label>
                            {addForm.stayInTouchFrequency === "custom" ? (
                              <FormField label="Custom Days" name="stayInTouchCustomDays" value={addForm.stayInTouchCustomDays} onChange={handleContactInputChange} type="number" />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreAddFields(false);
                    setShowAddModal(false);
                  }}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)] disabled:opacity-60">
                  <Plus className="h-4 w-4" />
                  Create Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showInteractionModal && selectedContact ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-10 backdrop-blur-md">
          <div className="glass-panel w-full max-w-2xl rounded-[28px] p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/70">Timeline Update</p>
                <h2 className="page-title mt-2">Add Interaction</h2>
              </div>
              <button type="button" onClick={() => setShowInteractionModal(false)} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitInteraction} className="mt-6 space-y-5">
              <div className="grid gap-2 sm:grid-cols-5">
                {INTERACTION_TYPES.map((type) => {
                  const Icon = interactionIcon(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInteractionForm((current) => ({ ...current, type }))}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-center transition",
                        interactionForm.type === type ? interactionTone(type) : "border-white/10 bg-white/5 text-slate-300",
                      )}
                    >
                      <div className="flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em]">{INTERACTION_TYPE_LABELS[type]}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Date</span>
                  <input type="date" value={interactionForm.date} onChange={(event) => setInteractionForm((current) => ({ ...current, date: event.target.value }))} className={fieldClassName()} />
                </label>
                <label className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sentiment</span>
                  <select value={interactionForm.sentiment} onChange={(event) => setInteractionForm((current) => ({ ...current, sentiment: event.target.value as InteractionFormState["sentiment"] }))} className={fieldClassName()}>
                    <option value="">Optional</option>
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                </label>
              </div>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Summary</span>
                <input value={interactionForm.summary} onChange={(event) => setInteractionForm((current) => ({ ...current, summary: event.target.value }))} className={fieldClassName()} placeholder="What happened?" />
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Details</span>
                <textarea value={interactionForm.details} onChange={(event) => setInteractionForm((current) => ({ ...current, details: event.target.value }))} className={textAreaClassName()} placeholder="Optional longer notes." />
              </label>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowInteractionModal(false)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)] disabled:opacity-60">
                  <Plus className="h-4 w-4" />
                  Add Interaction
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-blue-300/25 bg-[linear-gradient(135deg,rgba(32,147,255,0.18),rgba(0,38,255,0.16))] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(0,0,0,0.35)]">
          {toast}
        </div>
      ) : null}
    </section>
  );
}
