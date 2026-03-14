"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookUser, Briefcase, Calendar, ChevronRight, ExternalLink,
  Clock3, Filter, Globe, Heart, Mail, MapPin, MessageSquare,
  Phone, Plus, Search, Sparkles, Star,
  StickyNote, TrendingUp, Users, X,
  ArrowUpDown, Grid3X3, List, Hash, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RolodexContact, type RelationshipType, type SortField, type SortDirection,
  type ViewMode, type InteractionType,
  RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_TYPE_COLORS,
} from "@/lib/rolodex-types";
import { SEED_CONTACTS } from "@/lib/rolodex-seed";

// Lazy load ECharts
const ReactEChartsCore = nextDynamic(() => import("echarts-for-react"), { ssr: false });

// ─── Relationship Score Calculator ───
function calculateScore(c: RolodexContact): { score: number; signals: { label: string; value: number; weight: number }[] } {
  const now = Date.now();
  const signals: { label: string; value: number; weight: number }[] = [];

  // 1. Recency (30%) — how recently we interacted
  const lastContact = c.lastContactedAt ? new Date(c.lastContactedAt).getTime() : 0;
  const daysSince = lastContact ? (now - lastContact) / 86400000 : 999;
  let recency = 0;
  if (daysSince <= 1) recency = 100;
  else if (daysSince <= 3) recency = 90;
  else if (daysSince <= 7) recency = 75;
  else if (daysSince <= 14) recency = 60;
  else if (daysSince <= 30) recency = 40;
  else if (daysSince <= 60) recency = 20;
  else if (daysSince <= 90) recency = 10;
  else recency = 0;
  signals.push({ label: "Recency", value: recency, weight: 30 });

  // 2. Frequency (25%) — interaction count in last 90 days
  const recentInteractions = c.interactions.filter(i => {
    const d = new Date(i.date).getTime();
    return (now - d) / 86400000 <= 90;
  }).length;
  let frequency = Math.min(100, recentInteractions * 20); // 5+ in 90 days = 100
  signals.push({ label: "Frequency", value: frequency, weight: 25 });

  // 3. Channel diversity (10%) — unique interaction types
  const channels = new Set(c.interactions.map(i => i.type));
  let diversity = Math.min(100, channels.size * 25); // 4+ channels = 100
  signals.push({ label: "Channels", value: diversity, weight: 10 });

  // 4. Importance (20%) — based on relationship type + tags
  let importance = 50;
  if (c.relationshipType === "client") importance = 90;
  else if (c.relationshipType === "investor") importance = 95;
  else if (c.relationshipType === "mentor") importance = 80;
  else if (c.relationshipType === "family") importance = 100;
  else if (c.relationshipType === "prospect") importance = 70;
  else if (c.relationshipType === "team") importance = 75;
  else if (c.relationshipType === "partner") importance = 70;
  else if (c.relationshipType === "friend") importance = 60;
  if (c.tags.includes("vip")) importance = Math.min(100, importance + 15);
  if (c.importanceScore) importance = c.importanceScore;
  signals.push({ label: "Importance", value: importance, weight: 20 });

  // 5. Consistency (10%) — interactions spread over time
  const dates = c.interactions.map(i => new Date(i.date).getTime()).sort();
  let consistency = 0;
  if (dates.length >= 2) {
    const span = (dates[dates.length - 1] - dates[0]) / 86400000;
    const avgGap = span / (dates.length - 1);
    if (avgGap <= 7) consistency = 100;
    else if (avgGap <= 14) consistency = 75;
    else if (avgGap <= 30) consistency = 50;
    else consistency = 25;
  } else if (dates.length === 1) {
    consistency = 30;
  }
  signals.push({ label: "Consistency", value: consistency, weight: 10 });

  // 6. Manual boost (5%)
  const boost = c.tags.includes("vip") ? 100 : (c.tags.includes("hot-lead") ? 80 : 50);
  signals.push({ label: "Boost", value: boost, weight: 5 });

  // Calculate weighted score
  const score = Math.round(
    signals.reduce((sum, s) => sum + (s.value * s.weight / 100), 0)
  );

  return { score: Math.min(100, Math.max(0, score)), signals };
}

// ─── Helpers ───
function getInitials(c: RolodexContact) {
  return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

function getFullName(c: RolodexContact) {
  return `${c.firstName} ${c.lastName}`.trim() || "Unknown";
}

function timeAgo(date?: string) {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-blue-400";
  if (score >= 25) return "text-amber-400";
  return "text-slate-500";
}

function scoreBg(score: number) {
  if (score >= 75) return "bg-emerald-400/10";
  if (score >= 50) return "bg-blue-400/10";
  if (score >= 25) return "bg-amber-400/10";
  return "bg-slate-500/10";
}

function scoreLabel(score: number) {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Moderate";
  if (score >= 25) return "Weak";
  return "Cold";
}

// ─── Location coordinates for ECharts map ───
const CITY_COORDS: Record<string, [number, number]> = {
  "Louisville": [-85.7585, 38.2527],
  "Charlotte": [-80.8431, 35.2271],
  "New York": [-74.006, 40.7128],
  "Remote": [-98.5795, 39.8283],
  "San Francisco": [-122.4194, 37.7749],
  "Chicago": [-87.6298, 41.8781],
  "Austin": [-97.7431, 30.2672],
  "Nashville": [-86.7816, 36.1627],
  "Los Angeles": [-118.2437, 34.0522],
};

// ─── Smart Groups ───
const SMART_GROUPS = [
  { id: "all", name: "All People", icon: Users, count: (cs: RolodexContact[]) => cs.length },
  { id: "recent", name: "Recently Active", icon: Clock3, count: (cs: RolodexContact[]) => cs.filter(c => { const d = c.lastContactedAt ? (Date.now() - new Date(c.lastContactedAt).getTime()) / 86400000 : 999; return d <= 7; }).length },
  { id: "vip", name: "VIP", icon: Star, count: (cs: RolodexContact[]) => cs.filter(c => c.tags.includes("vip") || (c.importanceScore ?? 0) >= 90).length },
  { id: "follow-up", name: "Follow Up Soon", icon: Calendar, count: (cs: RolodexContact[]) => cs.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) <= new Date(Date.now() + 7 * 86400000)).length },
  { id: "stale", name: "Going Cold", icon: TrendingUp, count: (cs: RolodexContact[]) => cs.filter(c => { const d = c.lastContactedAt ? (Date.now() - new Date(c.lastContactedAt).getTime()) / 86400000 : 999; return d > 30; }).length },
];

const CATEGORY_GROUPS = [
  { id: "client", name: "Clients" }, { id: "prospect", name: "Prospects" },
  { id: "friend", name: "Friends" }, { id: "family", name: "Family" },
  { id: "team", name: "Team" }, { id: "investor", name: "Investors" },
  { id: "mentor", name: "Mentors" }, { id: "partner", name: "Partners" },
  { id: "school", name: "School" }, { id: "industry", name: "Industry" },
];

// ─── Location Map Component ───
function LocationMap({ city, state }: { city?: string; state?: string }) {
  if (!city) return null;
  const query = encodeURIComponent(`${city}${state ? `, ${state}` : ""}`);
  const coords = city ? CITY_COORDS[city] : null;
  const lat = coords ? coords[1] : null;
  const lon = coords ? coords[0] : null;

  // If we have exact coords, use them. Otherwise use Nominatim search via query string.
  const src = lat && lon
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.04},${lat-0.025},${lon+0.04},${lat+0.025}&layer=mapnik&marker=${lat},${lon}`
    : `https://www.google.com/maps?q=${query}&output=embed&z=13`;

  return (
    <div className="w-full h-[120px] rounded-lg overflow-hidden border border-white/[0.06] relative">
      <iframe
        key={`${city}-${state}`}
        src={src}
        style={{ width: "100%", height: "100%", border: 0, filter: "invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2) saturate(0.3)" }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

// ─── Score Breakdown Tooltip ───
function ScoreBreakdown({ signals }: { signals: { label: string; value: number; weight: number }[] }) {
  return (
    <div className="space-y-1.5">
      {signals.map(s => (
        <div key={s.label} className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-20">{s.label} ({s.weight}%)</span>
          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${s.value}%`,
                backgroundColor: s.value >= 75 ? "#34D399" : s.value >= 50 ? "#60A5FA" : s.value >= 25 ? "#FBBF24" : "#64748B",
              }}
            />
          </div>
          <span className="text-[10px] text-slate-400 w-6 text-right font-mono">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Inline Editable Field (click to edit, blur to save) ───
function InlineField({ label, value, field, contactId, onSaved, type = "text", icon }: {
  label: string; value?: string; field: string; contactId: string;
  onSaved: (field: string, value: string) => void; type?: string;
  icon?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalVal(value ?? ""); }, [value]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const save = useCallback(async () => {
    setEditing(false);
    if (localVal === (value ?? "")) return;
    try {
      await fetch(`/api/rolodex/${contactId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: localVal || undefined }),
      });
      onSaved(field, localVal);
    } catch {}
  }, [localVal, value, field, contactId, onSaved]);

  if (editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-slate-500 shrink-0">{label}</span>
        <input ref={inputRef} type={type} value={localVal}
          onChange={e => setLocalVal(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setLocalVal(value ?? ""); setEditing(false); } }}
          className="text-[12px] text-white bg-white/[0.06] border border-blue-500/30 rounded px-2 py-1 text-right max-w-[60%] outline-none" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between group cursor-pointer hover:bg-white/[0.03] -mx-1 px-1 rounded transition-colors"
      onClick={() => setEditing(true)}>
      <span className="text-[12px] text-slate-500 flex items-center gap-1.5">
        {icon}{label}
      </span>
      <span className="text-[12px] text-slate-300 text-right max-w-[60%]">
        {value || <span className="text-slate-600 italic text-[11px]">Add...</span>}
      </span>
    </div>
  );
}

// ─── Main Page ───
export default function RolodexPage() {
  const [contacts, setContacts] = useState<RolodexContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    fetch("/api/rolodex").then(r => r.json()).then(data => {
      setContacts(data.contacts ?? []);
      setLoadingContacts(false);
    }).catch(() => setLoadingContacts(false));
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastContacted");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [activeGroup, setActiveGroup] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeRelTypes, setActiveRelTypes] = useState<RelationshipType[]>([]);
  const [drawerTab, setDrawerTab] = useState<"overview" | "activity" | "notes" | "facts">("overview");
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newContact, setNewContact] = useState<Record<string, any>>({});
  const [creating, setCreating] = useState(false);
  const newNameRef = useRef<HTMLInputElement>(null);

  const handleCreate = useCallback(async () => {
    if (!newContact.firstName && !newContact.lastName && !newContact.email) return;
    setCreating(true);
    try {
      const res = await fetch("/api/rolodex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newContact,
          relationshipType: newContact.relationshipType || "other",
          tags: newContact.tags ? newContact.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
          groups: newContact.groups ? newContact.groups.split(",").map((g: string) => g.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (data.contact) {
        setContacts(prev => [data.contact, ...prev]);
        setShowCreate(false);
        setNewContact({});
        setSelectedId(data.contact.id);
      }
    } catch (e) { console.error(e); }
    setCreating(false);
  }, [newContact]);

  useEffect(() => {
    if (showCreate && newNameRef.current) newNameRef.current.focus();
  }, [showCreate]);

  const selected = useMemo(() => contacts.find(c => c.id === selectedId) ?? null, [contacts, selectedId]);
  const selectedScore = useMemo(() => selected ? calculateScore(selected) : null, [selected]);

  // ─── Universal mutation helper: updates contact, logs activity, saves to API ───
  const mutateContact = useCallback((updater: (c: any) => any, activityMsg: string, apiPayload?: any) => {
    if (!selectedId) return;
    const activity = { id: `act-${Date.now()}`, type: "note" as const, date: new Date().toISOString(), summary: activityMsg, createdAt: new Date().toISOString() };
    setContacts(prev => prev.map(c => {
      if (c.id !== selectedId) return c;
      const updated = { ...updater(c), updatedAt: new Date().toISOString(), interactions: [activity, ...c.interactions] };
      const payload = apiPayload ?? updater(c);
      const { id: _id, ...rest } = payload;
      fetch(`/api/rolodex/${c.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rest) });
      return updated;
    }));
  }, [selectedId]);

  // Field edits
  const onFieldSaved = useCallback((field: string, value: string) => {
    if (!selectedId) return;
    mutateContact(c => ({ ...c, [field]: value }), `Updated ${field}: ${value || "(cleared)"}`, { [field]: value });
  }, [selectedId, mutateContact]);

  // Tags
  const addTag = useCallback((tag: string) => {
    if (!selectedId || !tag.trim()) return;
    mutateContact(c => ({ ...c, tags: [...new Set([...c.tags, tag.trim()])] }), `Added tag: ${tag.trim()}`);
  }, [selectedId, mutateContact]);
  const removeTag = useCallback((tag: string) => {
    if (!selectedId) return;
    mutateContact(c => ({ ...c, tags: c.tags.filter((t: string) => t !== tag) }), `Removed tag: ${tag}`);
  }, [selectedId, mutateContact]);

  // Groups
  const addGroup = useCallback((group: string) => {
    if (!selectedId || !group.trim()) return;
    mutateContact(c => ({ ...c, groups: [...new Set([...(c.groups ?? []), group.trim()])] }), `Added to group: ${group.trim()}`);
  }, [selectedId, mutateContact]);
  const removeGroup = useCallback((group: string) => {
    if (!selectedId) return;
    mutateContact(c => ({ ...c, groups: (c.groups ?? []).filter((g: string) => g !== group) }), `Removed from group: ${group}`);
  }, [selectedId, mutateContact]);

  const [newTagInput, setNewTagInput] = useState("");
  const [newGroupInput, setNewGroupInput] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);

  // ─── Notes: add, edit, pin, delete ───
  const [newNoteInput, setNewNoteInput] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const addNote = useCallback((content: string) => {
    if (!selectedId || !content.trim()) return;
    const note = { id: `note-${Date.now()}`, content: content.trim(), pinned: false, createdAt: new Date().toISOString() };
    mutateContact(c => ({ ...c, notes: [note, ...c.notes] }), `Added note: "${content.trim().slice(0, 50)}${content.length > 50 ? "..." : ""}"`);
  }, [selectedId, mutateContact]);

  const editNote = useCallback((noteId: string, newContent: string) => {
    if (!selectedId || !newContent.trim()) return;
    mutateContact(
      c => ({ ...c, notes: c.notes.map((n: any) => n.id === noteId ? { ...n, content: newContent.trim() } : n) }),
      `Edited note: "${newContent.trim().slice(0, 50)}${newContent.length > 50 ? "..." : ""}"`
    );
    setEditingNoteId(null);
  }, [selectedId, mutateContact]);

  const pinNote = useCallback((noteId: string, pinned: boolean) => {
    if (!selectedId) return;
    mutateContact(
      c => ({ ...c, notes: c.notes.map((n: any) => n.id === noteId ? { ...n, pinned } : n) }),
      pinned ? "Pinned a note" : "Unpinned a note"
    );
  }, [selectedId, mutateContact]);

  const deleteNote = useCallback((noteId: string) => {
    if (!selectedId) return;
    mutateContact(
      c => ({ ...c, notes: c.notes.filter((n: any) => n.id !== noteId) }),
      "Deleted a note"
    );
  }, [selectedId, mutateContact]);

  // ─── Facts: add, edit, delete ───
  const [newFactLabel, setNewFactLabel] = useState("");
  const [newFactValue, setNewFactValue] = useState("");
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editingFactLabel, setEditingFactLabel] = useState("");
  const [editingFactValue, setEditingFactValue] = useState("");

  const addFact = useCallback((label: string, value: string) => {
    if (!selectedId || !label.trim() || !value.trim()) return;
    const fact = { id: `fact-${Date.now()}`, label: label.trim(), value: value.trim(), source: "manual" as const, createdAt: new Date().toISOString() };
    mutateContact(c => ({ ...c, facts: [...(c.facts ?? []), fact] }), `Added fact: ${label.trim()} = ${value.trim()}`);
  }, [selectedId, mutateContact]);

  const editFact = useCallback((factId: string, label: string, value: string) => {
    if (!selectedId || !label.trim() || !value.trim()) return;
    mutateContact(
      c => ({ ...c, facts: (c.facts ?? []).map((f: any) => f.id === factId ? { ...f, label: label.trim(), value: value.trim() } : f) }),
      `Edited fact: ${label.trim()} = ${value.trim()}`
    );
    setEditingFactId(null);
  }, [selectedId, mutateContact]);

  const deleteFact = useCallback((factId: string) => {
    if (!selectedId) return;
    mutateContact(
      c => ({ ...c, facts: (c.facts ?? []).filter((f: any) => f.id !== factId) }),
      "Deleted a fact"
    );
  }, [selectedId, mutateContact]);

  // AI Summary
  const [aiLoading, setAiLoading] = useState(false);
  const generateAiSummary = useCallback(async () => {
    if (!selectedId) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/rolodex/${selectedId}/ai-summary`, { method: "POST" });
      const data = await res.json();
      if (data.summary) {
        mutateContact(c => ({ ...c, aiSummary: data.summary }), "AI Summary generated");
      }
    } catch {} finally { setAiLoading(false); }
  }, [selectedId, mutateContact]);

  // Compute scores for all contacts
  const contactsWithScores = useMemo(() =>
    contacts.map(c => ({ ...c, relationshipScore: calculateScore(c).score })),
    [contacts]
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let result = contactsWithScores.filter(c => !c.archived);

    if (activeGroup === "recent") {
      result = result.filter(c => {
        const d = c.lastContactedAt ? (Date.now() - new Date(c.lastContactedAt).getTime()) / 86400000 : 999;
        return d <= 7;
      });
    } else if (activeGroup === "vip") {
      result = result.filter(c => c.tags.includes("vip") || (c.importanceScore ?? 0) >= 90);
    } else if (activeGroup === "follow-up") {
      result = result.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) <= new Date(Date.now() + 7 * 86400000));
    } else if (activeGroup === "stale") {
      result = result.filter(c => {
        const d = c.lastContactedAt ? (Date.now() - new Date(c.lastContactedAt).getTime()) / 86400000 : 999;
        return d > 30;
      });
    } else if (activeGroup !== "all") {
      result = result.filter(c => c.relationshipType === activeGroup);
    }

    if (activeRelTypes.length > 0) {
      result = result.filter(c => activeRelTypes.includes(c.relationshipType));
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        getFullName(c).toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q)) ||
        (c.groups ?? []).some(g => g.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = getFullName(a).localeCompare(getFullName(b)); break;
        case "lastContacted": cmp = (a.lastContactedAt ?? "").localeCompare(b.lastContactedAt ?? ""); break;
        case "company": cmp = (a.company ?? "").localeCompare(b.company ?? ""); break;
        case "city": cmp = (a.city ?? "").localeCompare(b.city ?? ""); break;
        case "relationshipScore": cmp = a.relationshipScore - b.relationshipScore; break;
        case "createdAt": cmp = a.createdAt.localeCompare(b.createdAt); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return result;
  }, [contactsWithScores, search, sortField, sortDir, activeGroup, activeRelTypes]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  // All groups across contacts
  const allGroups = useMemo(() =>
    Array.from(new Set(contacts.flatMap(c => c.groups ?? []))).sort(),
    [contacts]
  );

  return (
    <div className="flex h-[calc(100vh-1rem)] gap-0">
      {/* ─── Left Sidebar ─── */}
      <div className="hidden lg:flex w-[220px] flex-col border-r border-white/[0.06] bg-white/[0.02] shrink-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 pb-2">
          <h2 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider">Rolodex</h2>
        </div>

        <div className="px-2 py-1">
          <p className="px-2 py-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Views</p>
          {SMART_GROUPS.map(g => {
            const Icon = g.icon;
            const count = g.count(contactsWithScores.filter(c => !c.archived));
            return (
              <button key={g.id} onClick={() => setActiveGroup(g.id)}
                className={cn("w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-all",
                  activeGroup === g.id ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                )}>
                <Icon size={14} className="shrink-0 opacity-60" />
                <span className="flex-1 text-left">{g.name}</span>
                <span className="text-[11px] text-slate-500">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="px-2 py-1 mt-2">
          <p className="px-2 py-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Categories</p>
          {CATEGORY_GROUPS.map(g => {
            const count = contactsWithScores.filter(c => !c.archived && c.relationshipType === g.id).length;
            if (count === 0) return null;
            return (
              <button key={g.id} onClick={() => setActiveGroup(g.id)}
                className={cn("w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-all",
                  activeGroup === g.id ? "bg-white/[0.08] text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                )}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[g.id as RelationshipType] ?? "#64748B" }} />
                <span className="flex-1 text-left">{g.name}</span>
                <span className="text-[11px] text-slate-500">{count}</span>
              </button>
            );
          })}
        </div>

        {allGroups.length > 0 && (
          <div className="px-2 py-1 mt-2">
            <p className="px-2 py-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Groups</p>
            {allGroups.map(group => (
              <button key={group} onClick={() => { setSearch(group); setActiveGroup("all"); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-[12px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
                <Layers size={11} className="opacity-40" />
                <span>{group}</span>
              </button>
            ))}
          </div>
        )}

        <div className="px-2 py-1 mt-2">
          <p className="px-2 py-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tags</p>
          {Array.from(new Set(contacts.flatMap(c => c.tags))).sort().map(tag => (
            <button key={tag} onClick={() => { setSearch(tag); setActiveGroup("all"); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-[12px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all">
              <Hash size={11} className="opacity-40" />
              <span className="truncate">{tag}</span>
            </button>
          ))}
        </div>

        <div className="px-2 py-1 mt-4 pt-3 border-t border-white/[0.06]">
          <Link href="/rolodex/groups" className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all">
            <Layers size={13} className="opacity-50" /> Groups
          </Link>
          <Link href="/rolodex/analytics" className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all">
            <TrendingUp size={13} className="opacity-50" /> Analytics
          </Link>
          <Link href="/rolodex/reminders" className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[12px] text-slate-500 hover:text-white hover:bg-white/[0.04] transition-all">
            <Clock3 size={13} className="opacity-50" /> Reminders
          </Link>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search people, companies, tags..."
                className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/40 transition-colors" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] border transition-all",
                showFilters ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white"
              )}>
              <Filter size={13} />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex bg-white/[0.04] rounded-lg border border-white/[0.08] p-0.5">
              <button onClick={() => setViewMode("table")} className={cn("p-1.5 rounded-md transition-all", viewMode === "table" ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-white")}>
                <List size={14} />
              </button>
              <button onClick={() => setViewMode("card")} className={cn("p-1.5 rounded-md transition-all", viewMode === "card" ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-white")}>
                <Grid3X3 size={14} />
              </button>
            </div>
            <button onClick={() => { setShowCreate(true); setNewContact({}); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] bg-blue-600 hover:bg-blue-500 text-white transition-colors ml-2">
              <Plus size={14} />
              <span className="hidden sm:inline">Add Person</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.01]">
            {CATEGORY_GROUPS.map(g => (
              <button key={g.id}
                onClick={() => setActiveRelTypes(prev => prev.includes(g.id as RelationshipType) ? prev.filter(t => t !== g.id) : [...prev, g.id as RelationshipType])}
                className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] border transition-all",
                  activeRelTypes.includes(g.id as RelationshipType) ? "bg-blue-500/15 border-blue-500/30 text-blue-300" : "border-white/[0.08] text-slate-500 hover:text-slate-300"
                )}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[g.id as RelationshipType] }} />
                {g.name}
              </button>
            ))}
            {activeRelTypes.length > 0 && (
              <button onClick={() => setActiveRelTypes([])} className="text-[12px] text-slate-500 hover:text-white ml-1">Clear</button>
            )}
          </div>
        )}

        {/* Count + sort bar */}
        <div className="flex items-center justify-between px-5 py-2 text-[12px] text-slate-500">
          <span>{filtered.length} people</span>
          <div className="flex items-center gap-3">
            {(["name", "lastContacted", "company", "relationshipScore"] as SortField[]).map(f => (
              <button key={f} onClick={() => toggleSort(f)}
                className={cn("flex items-center gap-1 transition-colors", sortField === f ? "text-white" : "hover:text-slate-300")}>
                {f === "lastContacted" ? "Last Active" : f === "relationshipScore" ? "Score" : f.charAt(0).toUpperCase() + f.slice(1)}
                {sortField === f && <ArrowUpDown size={10} />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* ─── People List ─── */}
          <div className={cn("flex-1 overflow-y-auto", selected ? "hidden md:block" : "")}>
            {viewMode === "table" ? (
              <div className="divide-y divide-white/[0.04]">
                {filtered.map(c => (
                  <button key={c.id}
                    onClick={() => { setSelectedId(c.id); setDrawerTab("overview"); setShowScoreDetail(false); }}
                    onDoubleClick={() => router.push(`/rolodex/${c.id}`)}
                    className={cn("w-full flex items-center gap-4 px-5 py-3 text-left transition-all group",
                      selectedId === c.id ? "bg-blue-500/[0.06]" : "hover:bg-white/[0.03]"
                    )}>
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold"
                        style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                        {getInitials(c)}
                      </div>
                      {c.nextFollowUp && new Date(c.nextFollowUp) <= new Date() && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-[#0a0a0f]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white truncate">{getFullName(c)}</span>
                        {c.tags.includes("vip") && <Star size={11} className="text-amber-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.company && <span className="text-[12px] text-slate-500 truncate">{c.company}</span>}
                        {c.company && c.title && <span className="text-slate-600">·</span>}
                        {c.title && <span className="text-[12px] text-slate-600 truncate">{c.title}</span>}
                      </div>
                    </div>
                    <div className="hidden xl:flex items-center gap-1 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                        {RELATIONSHIP_TYPE_LABELS[c.relationshipType]}
                      </span>
                    </div>
                    <div className="hidden lg:flex items-center gap-1 w-28 shrink-0">
                      {c.city && (<><MapPin size={11} className="text-slate-600 shrink-0" /><span className="text-[12px] text-slate-500 truncate">{c.city}</span></>)}
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 w-16 shrink-0 justify-end">
                      <div className={cn("px-2 py-0.5 rounded text-[11px] font-mono font-medium", scoreBg(c.relationshipScore), scoreColor(c.relationshipScore))}>
                        {c.relationshipScore}
                      </div>
                    </div>
                    <div className="w-20 shrink-0 text-right">
                      <span className="text-[12px] text-slate-500">{timeAgo(c.lastContactedAt)}</span>
                    </div>
                    <span onClick={(e) => { e.stopPropagation(); router.push(`/rolodex/${c.id}`); }}
                      className="text-[10px] text-slate-600 hover:text-blue-400 shrink-0 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      Open →
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Users size={32} className="mb-3 opacity-30" />
                    <p className="text-[14px]">No people found</p>
                    <p className="text-[12px] mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
                {filtered.map(c => (
                  <button key={c.id} onClick={() => { setSelectedId(c.id); setDrawerTab("overview"); }}
                    className={cn("flex flex-col p-4 rounded-xl border text-left transition-all",
                      selectedId === c.id ? "bg-blue-500/[0.06] border-blue-500/20" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
                    )}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
                        style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                        {getInitials(c)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white truncate">{getFullName(c)}</p>
                        {c.company && <p className="text-[12px] text-slate-500 truncate">{c.company}</p>}
                      </div>
                      <div className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono", scoreBg(c.relationshipScore), scoreColor(c.relationshipScore))}>
                        {c.relationshipScore}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                        {RELATIONSHIP_TYPE_LABELS[c.relationshipType]}
                      </span>
                      {c.city && <span className="flex items-center gap-1 text-[11px] text-slate-500"><MapPin size={10} /> {c.city}</span>}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
                      <span className="text-[11px] text-slate-500">{timeAgo(c.lastContactedAt)}</span>
                      <div className="flex gap-1.5">
                        {c.phone && <Phone size={11} className="text-slate-600" />}
                        {c.email && <Mail size={11} className="text-slate-600" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Detail Drawer ─── */}
          {selected && selectedScore && (
            <div className="w-full md:w-[380px] lg:w-[420px] border-l border-white/[0.06] bg-white/[0.015] flex flex-col shrink-0">
              <div className="md:hidden flex justify-end p-2">
                <button onClick={() => setSelectedId(null)} className="p-2 text-slate-500 hover:text-white"><X size={16} /></button>
              </div>

              {/* ─── Header (collapsible) ─── */}
              <div className="px-5 pt-5 pb-0 shrink-0 max-h-[40vh] overflow-y-auto">
                <div className="flex items-start gap-3.5">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                    style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[selected.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[selected.relationshipType] }}>
                    {getInitials(selected)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/rolodex/${selected.id}`} className="text-[16px] font-semibold text-white hover:text-blue-300 transition-colors">{getFullName(selected)}</Link>
                    {selected.company && (
                      <p className="text-[13px] text-slate-400 mt-0.5">
                        {selected.title ? `${selected.title} at ` : ""}{selected.company}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[selected.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[selected.relationshipType] }}>
                        {RELATIONSHIP_TYPE_LABELS[selected.relationshipType]}
                      </span>
                      {selected.city && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin size={10} /> {selected.city}{selected.state ? `, ${selected.state}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Full Profile link */}
                <Link href={`/rolodex/${selected.id}`}
                  className="flex items-center justify-center gap-1.5 mt-3 px-3 py-2 rounded-lg bg-blue-500/[0.08] border border-blue-500/[0.15] text-[12px] text-blue-400 hover:text-blue-300 hover:bg-blue-500/[0.12] transition-all">
                  <ExternalLink size={12} /> View Full Profile
                </Link>

                {/* ─── Score ─── */}
                <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <button onClick={() => setShowScoreDetail(!showScoreDetail)} className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("text-[22px] font-bold font-mono", scoreColor(selectedScore.score))}>
                        {selectedScore.score}
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider">Relationship Score</p>
                        <p className={cn("text-[12px] font-medium", scoreColor(selectedScore.score))}>
                          {scoreLabel(selectedScore.score)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={14} className={cn("text-slate-500 transition-transform", showScoreDetail && "rotate-90")} />
                  </button>
                  {showScoreDetail && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <ScoreBreakdown signals={selectedScore.signals} />
                    </div>
                  )}
                </div>

                {/* ─── Key Properties (top) ─── */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">Created</span>
                    <span className="text-[12px] text-slate-300">{timeAgo(selected.createdAt)}</span>
                  </div>
                  {selected.lastContactedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-500">Last Contact</span>
                      <span className="text-[12px] text-slate-300">{timeAgo(selected.lastContactedAt)}</span>
                    </div>
                  )}
                </div>

                {/* ─── AI Summary ─── */}
                <div className="mt-4 p-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/[0.12]">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={12} className="text-blue-400" />
                      <span className="text-[11px] font-medium text-blue-400">AI Summary</span>
                    </div>
                    <button onClick={generateAiSummary} disabled={aiLoading}
                      className="text-[10px] text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors">
                      {aiLoading ? "Generating..." : selected.aiSummary ? "↻ Refresh" : "✦ Generate"}
                    </button>
                  </div>
                  {selected.aiSummary ? (
                    <p className="text-[12px] text-slate-300 leading-relaxed">{selected.aiSummary}</p>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">Click Generate to create an AI-powered relationship summary</p>
                  )}
                </div>
              </div>

              {/* ─── Tabs (sticky) ─── */}
              <div className="flex border-b border-white/[0.06] px-5 mt-0 sticky top-0 bg-[#0c0c12] z-10 shrink-0">
                {(["overview", "activity", "notes", "facts"] as const).map(tab => (
                  <button key={tab} onClick={() => { setDrawerTab(tab); /* scroll tab content into view */ const el = document.getElementById('drawer-tab-content'); if (el) el.scrollTop = 0; }}
                    className={cn("px-3 py-2.5 text-[12px] font-medium border-b-2 transition-all capitalize",
                      drawerTab === tab ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                    )}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* ─── Tab Content ─── */}
              <div id="drawer-tab-content" className="px-5 py-4 flex-1 overflow-y-auto">
                {drawerTab === "overview" && (
                  <div className="space-y-4">
                    {/* Contact — click to edit */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Contact</p>
                      <InlineField label="Email" value={selected.email} field="email" contactId={selected.id} onSaved={onFieldSaved} icon={<Mail size={11} />} />
                      <InlineField label="Phone" value={selected.phone} field="phone" contactId={selected.id} onSaved={onFieldSaved} icon={<Phone size={11} />} />
                      <InlineField label="Website" value={selected.website} field="website" contactId={selected.id} onSaved={onFieldSaved} icon={<Globe size={11} />} />
                    </div>

                    {/* Professional — click to edit */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Professional</p>
                      <InlineField label="Company" value={selected.company} field="company" contactId={selected.id} onSaved={onFieldSaved} />
                      <InlineField label="Title" value={selected.title} field="title" contactId={selected.id} onSaved={onFieldSaved} />
                    </div>

                    {/* Personal — click to edit */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Personal</p>
                      <InlineField label="Birthday" value={selected.birthday} field="birthday" contactId={selected.id} onSaved={onFieldSaved} type="date" />
                      <InlineField label="Spouse" value={selected.spouse} field="spouse" contactId={selected.id} onSaved={onFieldSaved} />
                      <InlineField label="College" value={selected.college} field="college" contactId={selected.id} onSaved={onFieldSaved} />
                      <InlineField label="Interests" value={selected.interests} field="interests" contactId={selected.id} onSaved={onFieldSaved} />
                    </div>

                    {/* Context — click to edit */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Context</p>
                      <InlineField label="How We Met" value={selected.howWeMet} field="howWeMet" contactId={selected.id} onSaved={onFieldSaved} />
                      <InlineField label="Introduced By" value={selected.introducedBy} field="introducedBy" contactId={selected.id} onSaved={onFieldSaved} />
                      <InlineField label="Source" value={selected.source} field="source" contactId={selected.id} onSaved={onFieldSaved} />
                    </div>

                    {/* Social — click to edit */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Social</p>
                      <InlineField label="LinkedIn" value={selected.linkedin} field="linkedin" contactId={selected.id} onSaved={onFieldSaved} />
                      <InlineField label="Instagram" value={selected.instagram} field="instagram" contactId={selected.id} onSaved={onFieldSaved} />
                      <InlineField label="Twitter" value={selected.twitter} field="twitter" contactId={selected.id} onSaved={onFieldSaved} />
                    </div>

                    {selected.notes.filter(n => n.pinned).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">📌 Pinned</p>
                        {selected.notes.filter(n => n.pinned).map(note => (
                          <div key={note.id} className="p-2.5 rounded-lg bg-amber-500/[0.05] border border-amber-500/[0.1]">
                            <p className="text-[12px] text-slate-300 leading-relaxed">{note.content}</p>
                            <p className="text-[10px] text-slate-600 mt-1.5">{timeAgo(note.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ─── Groups (editable) ─── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Groups</p>
                        <button onClick={() => setShowAddGroup(!showAddGroup)} className="text-[10px] text-blue-400 hover:text-blue-300">+ Add</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(selected.groups ?? []).map(group => (
                          <span key={group} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500/[0.08] border border-blue-500/[0.15] text-[11px] font-medium text-blue-300 group/chip">
                            {group}
                            <button onClick={() => removeGroup(group)} className="opacity-0 group-hover/chip:opacity-100 text-blue-400 hover:text-white transition-opacity">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        {(selected.groups ?? []).length === 0 && !showAddGroup && (
                          <span className="text-[11px] text-slate-600 italic cursor-pointer" onClick={() => setShowAddGroup(true)}>No groups — click + Add</span>
                        )}
                      </div>
                      {showAddGroup && (
                        <input autoFocus value={newGroupInput} onChange={e => setNewGroupInput(e.target.value)}
                          placeholder="Group name..."
                          onKeyDown={e => {
                            if (e.key === "Enter" && newGroupInput.trim()) { addGroup(newGroupInput); setNewGroupInput(""); }
                            if (e.key === "Escape") { setShowAddGroup(false); setNewGroupInput(""); }
                          }}
                          onBlur={() => { if (newGroupInput.trim()) addGroup(newGroupInput); setNewGroupInput(""); setShowAddGroup(false); }}
                          className="w-full px-2.5 py-1.5 bg-white/[0.04] border border-blue-500/30 rounded-lg text-[12px] text-white placeholder:text-slate-600 outline-none" />
                      )}
                    </div>

                    {/* ─── Tags (editable) ─── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Tags</p>
                        <button onClick={() => setShowAddTag(!showAddTag)} className="text-[10px] text-blue-400 hover:text-blue-300">+ Add</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.tags.map(tag => (
                          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-400 group/chip">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="opacity-0 group-hover/chip:opacity-100 text-slate-400 hover:text-white transition-opacity">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                        {selected.tags.length === 0 && !showAddTag && (
                          <span className="text-[11px] text-slate-600 italic cursor-pointer" onClick={() => setShowAddTag(true)}>No tags — click + Add</span>
                        )}
                      </div>
                      {showAddTag && (
                        <input autoFocus value={newTagInput} onChange={e => setNewTagInput(e.target.value)}
                          placeholder="Tag name..."
                          onKeyDown={e => {
                            if (e.key === "Enter" && newTagInput.trim()) { addTag(newTagInput); setNewTagInput(""); }
                            if (e.key === "Escape") { setShowAddTag(false); setNewTagInput(""); }
                          }}
                          onBlur={() => { if (newTagInput.trim()) addTag(newTagInput); setNewTagInput(""); setShowAddTag(false); }}
                          className="w-full px-2.5 py-1.5 bg-white/[0.04] border border-blue-500/30 rounded-lg text-[12px] text-white placeholder:text-slate-600 outline-none" />
                      )}
                    </div>

                    {/* ─── Location + Map ─── */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Location</p>
                      <InlineField label="City" value={selected.city} field="city" contactId={selected.id} onSaved={onFieldSaved} />
                      <InlineField label="State" value={selected.state} field="state" contactId={selected.id} onSaved={onFieldSaved} />
                      <InlineField label="Country" value={selected.country} field="country" contactId={selected.id} onSaved={onFieldSaved} />
                      {selected.city && <LocationMap city={selected.city} state={selected.state} />}
                    </div>

                    {/* ─── Details ─── */}
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-1">Details</p>
                      <InlineField label="Follow Up" value={selected.nextFollowUp?.split("T")[0]} field="nextFollowUp" contactId={selected.id} onSaved={onFieldSaved} type="date" />
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-slate-500">Last Edited</span>
                        <span className="text-[12px] text-slate-300">{timeAgo(selected.updatedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-slate-500">Created</span>
                        <span className="text-[12px] text-slate-300">{timeAgo(selected.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {drawerTab === "activity" && (
                  <div className="space-y-1">
                    {selected.interactions.length === 0 ? (
                      <p className="text-[12px] text-slate-500 py-8 text-center">No activity yet</p>
                    ) : (
                      selected.interactions.sort((a, b) => b.date.localeCompare(a.date)).map(int => (
                        <div key={int.id} className="flex gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            int.type === "call" ? "bg-green-500/10 text-green-400" :
                            int.type === "email" ? "bg-blue-500/10 text-blue-400" :
                            int.type === "meeting" ? "bg-purple-500/10 text-purple-400" :
                            int.type === "text" ? "bg-cyan-500/10 text-cyan-400" :
                            "bg-white/[0.05] text-slate-400"
                          )}>
                            {int.type === "call" ? <Phone size={12} /> :
                             int.type === "email" ? <Mail size={12} /> :
                             int.type === "meeting" ? <Users size={12} /> :
                             int.type === "text" ? <MessageSquare size={12} /> :
                             <Star size={12} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-white">{int.summary}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{timeAgo(int.date)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {drawerTab === "notes" && (
                  <div className="space-y-3">
                    {/* Add note — prominent, always first */}
                    <div className="p-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/[0.15]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-blue-400 flex items-center gap-1.5">
                          <StickyNote size={11} /> Quick Note
                        </span>
                        <span className="text-[10px] text-slate-600">⌘+Enter to save</span>
                      </div>
                      <textarea value={newNoteInput} onChange={e => setNewNoteInput(e.target.value)}
                        placeholder="Write a note about this person..."
                        rows={3}
                        onKeyDown={e => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && newNoteInput.trim()) {
                            addNote(newNoteInput); setNewNoteInput("");
                          }
                        }}
                        className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-md text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/40 resize-none transition-colors" />
                      <div className="flex justify-end mt-2">
                        <button onClick={() => { if (newNoteInput.trim()) { addNote(newNoteInput); setNewNoteInput(""); } }}
                          className={cn("px-3 py-1.5 text-[11px] font-medium rounded-md transition-all",
                            newNoteInput.trim()
                              ? "bg-blue-500 hover:bg-blue-400 text-white cursor-pointer"
                              : "bg-white/[0.04] text-slate-600 cursor-not-allowed"
                          )}>
                          + Add Note
                        </button>
                      </div>
                    </div>
                    {selected.notes.length === 0 ? (
                      <p className="text-[12px] text-slate-500 py-4 text-center">No notes yet — write one above!</p>
                    ) : (
                      [...selected.notes].sort((a, b) => {
                        if (a.pinned && !b.pinned) return -1;
                        if (!a.pinned && b.pinned) return 1;
                        return b.createdAt.localeCompare(a.createdAt);
                      }).map(note => (
                        <div key={note.id} className={cn("p-3 rounded-lg border group/note",
                          note.pinned ? "bg-amber-500/[0.05] border-amber-500/[0.1]" : "bg-white/[0.02] border-white/[0.06]"
                        )}>
                          {/* Note actions — visible on hover */}
                          <div className="flex items-center justify-between mb-1">
                            {note.pinned && <span className="text-[10px] text-amber-400 font-medium">📌 Pinned</span>}
                            {!note.pinned && <span />}
                            <div className="flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                              <button onClick={() => pinNote(note.id, !note.pinned)}
                                className={cn("px-1.5 py-0.5 rounded text-[10px] transition-colors",
                                  note.pinned ? "text-amber-400 hover:text-amber-300" : "text-slate-500 hover:text-amber-400"
                                )}>
                                {note.pinned ? "Unpin" : "📌 Pin"}
                              </button>
                              <button onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}
                                className="px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-blue-400 transition-colors">
                                Edit
                              </button>
                              <button onClick={() => deleteNote(note.id)}
                                className="px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-red-400 transition-colors">
                                Delete
                              </button>
                            </div>
                          </div>
                          {/* Editing mode */}
                          {editingNoteId === note.id ? (
                            <div>
                              <textarea value={editingNoteContent} onChange={e => setEditingNoteContent(e.target.value)}
                                rows={3} autoFocus
                                onKeyDown={e => {
                                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { editNote(note.id, editingNoteContent); }
                                  if (e.key === "Escape") { setEditingNoteId(null); }
                                }}
                                className="w-full px-2 py-1.5 bg-white/[0.06] border border-blue-500/30 rounded text-[12px] text-white outline-none resize-none" />
                              <div className="flex justify-end gap-2 mt-1.5">
                                <button onClick={() => setEditingNoteId(null)} className="text-[10px] text-slate-500 hover:text-white">Cancel</button>
                                <button onClick={() => editNote(note.id, editingNoteContent)} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium">Save</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[12px] text-slate-300 leading-relaxed">{note.content}</p>
                          )}
                          <p className="text-[10px] text-slate-600 mt-2">{timeAgo(note.createdAt)}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {drawerTab === "facts" && (
                  <div className="space-y-3">
                    {/* Add fact — always visible */}
                    <div className="p-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/[0.15]">
                      <span className="text-[11px] font-medium text-blue-400 flex items-center gap-1.5 mb-2">
                        <BookUser size={11} /> Add Fact
                      </span>
                      <div className="space-y-2">
                        <input value={newFactLabel} onChange={e => setNewFactLabel(e.target.value)}
                          placeholder="Label (e.g. Favorite food, Kids' names)"
                          className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-md text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/40 transition-colors" />
                        <input value={newFactValue} onChange={e => setNewFactValue(e.target.value)}
                          placeholder="Value"
                          onKeyDown={e => {
                            if (e.key === "Enter" && newFactLabel.trim() && newFactValue.trim()) {
                              addFact(newFactLabel, newFactValue); setNewFactLabel(""); setNewFactValue("");
                            }
                            if (e.key === "Escape") { setNewFactLabel(""); setNewFactValue(""); }
                          }}
                          className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-md text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/40 transition-colors" />
                        <div className="flex justify-end">
                          <button onClick={() => {
                            if (newFactLabel.trim() && newFactValue.trim()) {
                              addFact(newFactLabel, newFactValue); setNewFactLabel(""); setNewFactValue("");
                            }
                          }} className={cn("px-3 py-1.5 text-[11px] font-medium rounded-md transition-all",
                            newFactLabel.trim() && newFactValue.trim()
                              ? "bg-blue-500 hover:bg-blue-400 text-white cursor-pointer"
                              : "bg-white/[0.04] text-slate-600 cursor-not-allowed"
                          )}>+ Add Fact</button>
                        </div>
                      </div>
                    </div>
                    {/* Existing facts */}
                    {(!selected.facts || selected.facts.length === 0) ? (
                      <p className="text-[12px] text-slate-500 py-4 text-center">No facts yet — add one above!</p>
                    ) : (
                      <div className="space-y-0">
                        {(selected.facts ?? []).map(fact => (
                          <div key={fact.id} className="group/fact">
                            {editingFactId === fact.id ? (
                              <div className="py-2.5 space-y-1.5 border-b border-white/[0.04]">
                                <input value={editingFactLabel} onChange={e => setEditingFactLabel(e.target.value)}
                                  className="w-full px-2 py-1 bg-white/[0.06] border border-blue-500/30 rounded text-[12px] text-white outline-none" />
                                <input value={editingFactValue} onChange={e => setEditingFactValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") editFact(fact.id, editingFactLabel, editingFactValue);
                                    if (e.key === "Escape") setEditingFactId(null);
                                  }}
                                  className="w-full px-2 py-1 bg-white/[0.06] border border-blue-500/30 rounded text-[12px] text-white outline-none" />
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => setEditingFactId(null)} className="text-[10px] text-slate-500 hover:text-white">Cancel</button>
                                  <button onClick={() => editFact(fact.id, editingFactLabel, editingFactValue)} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium">Save</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                                <span className="text-[11px] text-slate-500">{fact.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] text-slate-300 text-right">{fact.value}</span>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover/fact:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingFactId(fact.id); setEditingFactLabel(fact.label); setEditingFactValue(fact.value); }}
                                      className="text-[10px] text-slate-500 hover:text-blue-400 px-1">✎</button>
                                    <button onClick={() => deleteFact(fact.id)}
                                      className="text-[10px] text-slate-500 hover:text-red-400 px-1">✕</button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Create Contact Slide-over ─── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-[480px] bg-[#0c0c12] border-l border-white/[0.06] overflow-y-auto animate-in slide-in-from-right">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0c0c12]/95 backdrop-blur-md border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-white">New Person</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowCreate(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={16} /></button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Name — the star of the show */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">First Name</label>
                  <input ref={newNameRef} value={newContact.firstName ?? ""} onChange={e => setNewContact({ ...newContact, firstName: e.target.value })}
                    placeholder="First name"
                    className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[14px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40 transition-colors"
                    onKeyDown={e => e.key === "Enter" && handleCreate()} />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Last Name</label>
                  <input value={newContact.lastName ?? ""} onChange={e => setNewContact({ ...newContact, lastName: e.target.value })}
                    placeholder="Last name"
                    className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[14px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40 transition-colors" />
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Contact</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input value={newContact.email ?? ""} onChange={e => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="Email" type="email"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                </div>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input value={newContact.phone ?? ""} onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="Phone"
                    className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                </div>
              </div>

              {/* Professional */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Professional</label>
                <div className="flex gap-3">
                  <input value={newContact.company ?? ""} onChange={e => setNewContact({ ...newContact, company: e.target.value })}
                    placeholder="Company"
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                  <input value={newContact.title ?? ""} onChange={e => setNewContact({ ...newContact, title: e.target.value })}
                    placeholder="Title"
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Location</label>
                <div className="flex gap-3">
                  <input value={newContact.city ?? ""} onChange={e => setNewContact({ ...newContact, city: e.target.value })}
                    placeholder="City"
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                  <input value={newContact.state ?? ""} onChange={e => setNewContact({ ...newContact, state: e.target.value })}
                    placeholder="State"
                    className="w-24 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                </div>
              </div>

              {/* Relationship type */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Relationship</label>
                <div className="flex flex-wrap gap-1.5">
                  {(["client", "prospect", "friend", "family", "team", "investor", "mentor", "partner", "school", "industry", "other"] as const).map(t => (
                    <button key={t} onClick={() => setNewContact({ ...newContact, relationshipType: t })}
                      className={cn("px-2.5 py-1.5 rounded-lg text-[12px] border transition-all",
                        newContact.relationshipType === t
                          ? "border-blue-500/40 text-white"
                          : "border-white/[0.06] text-slate-500 hover:text-white hover:border-white/[0.12]"
                      )}
                      style={newContact.relationshipType === t ? { backgroundColor: `${RELATIONSHIP_TYPE_COLORS[t]}15`, borderColor: `${RELATIONSHIP_TYPE_COLORS[t]}40` } : {}}>
                      {RELATIONSHIP_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* How we met + Source */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Context</label>
                <input value={newContact.howWeMet ?? ""} onChange={e => setNewContact({ ...newContact, howWeMet: e.target.value })}
                  placeholder="How we met"
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                <div className="flex gap-3">
                  <input value={newContact.source ?? ""} onChange={e => setNewContact({ ...newContact, source: e.target.value })}
                    placeholder="Source (e.g. Event, Referral)"
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                  <input value={newContact.introducedBy ?? ""} onChange={e => setNewContact({ ...newContact, introducedBy: e.target.value })}
                    placeholder="Introduced by"
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                </div>
              </div>

              {/* Tags + Groups */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Organization</label>
                <input value={newContact.tags ?? ""} onChange={e => setNewContact({ ...newContact, tags: e.target.value })}
                  placeholder="Tags (comma separated)"
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                <input value={newContact.groups ?? ""} onChange={e => setNewContact({ ...newContact, groups: e.target.value })}
                  placeholder="Groups (comma separated)"
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
              </div>

              {/* Personal */}
              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Personal</label>
                <div className="flex gap-3">
                  <input value={newContact.birthday ?? ""} onChange={e => setNewContact({ ...newContact, birthday: e.target.value })}
                    placeholder="Birthday" type="date"
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                  <input value={newContact.college ?? ""} onChange={e => setNewContact({ ...newContact, college: e.target.value })}
                    placeholder="College"
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                </div>
                <div className="flex gap-3">
                  <input value={newContact.linkedin ?? ""} onChange={e => setNewContact({ ...newContact, linkedin: e.target.value })}
                    placeholder="LinkedIn URL"
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                  <input value={newContact.website ?? ""} onChange={e => setNewContact({ ...newContact, website: e.target.value })}
                    placeholder="Website"
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40" />
                </div>
              </div>

              {/* Initial note */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5 block">Note</label>
                <textarea value={newContact.initialNote ?? ""} onChange={e => setNewContact({ ...newContact, initialNote: e.target.value })}
                  placeholder="Add a note about this person..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40 resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#0c0c12]/95 backdrop-blur-md border-t border-white/[0.06] px-6 py-4 flex items-center justify-between">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-[13px] text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating || (!newContact.firstName && !newContact.lastName && !newContact.email)}
                className="px-5 py-2.5 rounded-lg text-[13px] font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {creating ? "Creating..." : "Create Person"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
