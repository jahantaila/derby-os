"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, BookUser, Briefcase, Calendar, ChevronDown, ChevronRight,
  Clock3, ExternalLink, Globe, Heart, Lightbulb, Mail, MapPin,
  MessageSquare, Phone, Plus, Search, Sparkles, Star, StickyNote,
  Target, TrendingUp, Users, Camera, Activity, Brain, Gift,
  BarChart3, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RolodexContact, type InteractionType,
  RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_TYPE_COLORS,
  INTERACTION_TYPE_LABELS,
} from "@/lib/rolodex-types";

const ReactEChartsCore = dynamic(() => import("echarts-for-react"), { ssr: false });

// ─── Score Calculator ───
function calculateScore(c: RolodexContact) {
  const now = Date.now();
  const signals: { label: string; value: number; weight: number }[] = [];
  const lastContact = c.lastContactedAt ? new Date(c.lastContactedAt).getTime() : 0;
  const daysSince = lastContact ? (now - lastContact) / 86400000 : 999;
  let recency = daysSince <= 1 ? 100 : daysSince <= 3 ? 90 : daysSince <= 7 ? 75 : daysSince <= 14 ? 60 : daysSince <= 30 ? 40 : daysSince <= 60 ? 20 : daysSince <= 90 ? 10 : 0;
  signals.push({ label: "Recency", value: recency, weight: 30 });
  const recent = c.interactions.filter(i => (now - new Date(i.date).getTime()) / 86400000 <= 90).length;
  signals.push({ label: "Frequency", value: Math.min(100, recent * 20), weight: 25 });
  const channels = new Set(c.interactions.map(i => i.type));
  signals.push({ label: "Channels", value: Math.min(100, channels.size * 25), weight: 10 });
  let importance = c.importanceScore ?? (c.relationshipType === "family" ? 100 : c.relationshipType === "investor" ? 95 : c.relationshipType === "client" ? 90 : c.relationshipType === "mentor" ? 80 : c.relationshipType === "team" ? 75 : c.relationshipType === "prospect" ? 70 : c.relationshipType === "partner" ? 70 : c.relationshipType === "friend" ? 60 : 50);
  if (c.tags.includes("vip")) importance = Math.min(100, importance + 15);
  signals.push({ label: "Importance", value: importance, weight: 20 });
  const dates = c.interactions.map(i => new Date(i.date).getTime()).sort();
  let consistency = dates.length >= 2 ? ((dates[dates.length - 1] - dates[0]) / 86400000 / (dates.length - 1) <= 7 ? 100 : 50) : dates.length === 1 ? 30 : 0;
  signals.push({ label: "Consistency", value: consistency, weight: 10 });
  signals.push({ label: "Boost", value: c.tags.includes("vip") ? 100 : c.tags.includes("hot-lead") ? 80 : 50, weight: 5 });
  const score = Math.round(signals.reduce((s, sig) => s + (sig.value * sig.weight / 100), 0));
  return { score: Math.min(100, Math.max(0, score)), signals };
}

// ─── Helpers ───
function getInitials(c: RolodexContact) { return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?"; }
function getFullName(c: RolodexContact) { return `${c.firstName} ${c.lastName}`.trim() || "Unknown"; }
function timeAgo(date?: string) {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 0) return `in ${Math.abs(days)}d`;
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
function formatDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function formatDuration(s?: number) { if (!s) return ""; const m = Math.floor(s / 60); return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`; }
function scoreColor(s: number) { return s >= 75 ? "text-emerald-400" : s >= 50 ? "text-blue-400" : s >= 25 ? "text-amber-400" : "text-slate-500"; }
function scoreLabel(s: number) { return s >= 75 ? "Strong" : s >= 50 ? "Moderate" : s >= 25 ? "Weak" : "Cold"; }

function interactionIcon(type: InteractionType) {
  const map: Record<string, React.ReactNode> = {
    call: <Phone size={13} />, email: <Mail size={13} />, meeting: <Users size={13} />,
    text: <MessageSquare size={13} />, social: <Globe size={13} />, event: <Calendar size={13} />,
    note: <StickyNote size={13} />, gift: <Gift size={13} />, referral: <ArrowLeft size={13} />,
    deal: <Briefcase size={13} />, photo: <Camera size={13} />, milestone: <Star size={13} />,
  };
  return map[type] || <Activity size={13} />;
}
function interactionColor(type: InteractionType) {
  const map: Record<string, string> = {
    call: "bg-green-500/10 text-green-400", email: "bg-blue-500/10 text-blue-400",
    meeting: "bg-indigo-500/10 text-indigo-400", text: "bg-cyan-500/10 text-cyan-400",
    social: "bg-pink-500/10 text-pink-400", gift: "bg-amber-500/10 text-amber-400",
    milestone: "bg-yellow-500/10 text-yellow-400",
  };
  return map[type] || "bg-white/[0.05] text-slate-400";
}

// ─── Inline Editable Field ───
function InlineField({ value, field, onSave, placeholder, className: cls, type = "text" }: {
  value?: string; field: string; onSave: (field: string, val: string) => void;
  placeholder?: string; className?: string; type?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) { setDraft(value ?? ""); setTimeout(() => inputRef.current?.focus(), 0); } }, [editing, value]);

  const commit = () => {
    setEditing(false);
    if (draft !== (value ?? "")) onSave(field, draft);
  };

  if (editing) {
    return (
      <input ref={inputRef} type={type} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className={cn("bg-white/[0.08] border border-blue-500/40 rounded px-2 py-1 outline-none text-white min-w-[80px]", cls)}
        placeholder={placeholder}
      />
    );
  }

  return (
    <span onClick={() => setEditing(true)}
      className={cn(
        "cursor-pointer rounded px-1.5 py-0.5 -mx-1 transition-all border border-transparent",
        "hover:bg-white/[0.06] hover:border-white/[0.08] hover:border-dashed",
        !value && "text-slate-600 italic",
        cls
      )}
      title="Click to edit">
      {value || placeholder || "Add..."}
    </span>
  );
}

// ─── Quick Add Note ───
function QuickAddNote({ contactId, onAdded }: { contactId: string; onAdded: (note: any) => void }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/rolodex/${contactId}/interactions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "note", summary: text.trim(), date: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data.interaction) onAdded(data.interaction);
      setText("");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="flex gap-2">
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Quick note... (Cmd+Enter to save)"
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save(); }}
        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/30 resize-none h-[60px]"
      />
      <button onClick={save} disabled={!text.trim() || saving}
        className="px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 self-end h-8">
        {saving ? "..." : "Save"}
      </button>
    </div>
  );
}

// ─── Quick Log Interaction ───
function QuickLogInteraction({ contactId, onAdded }: { contactId: string; onAdded: (int: any) => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<InteractionType>("call");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const types: InteractionType[] = ["call", "email", "meeting", "text", "social", "gift"];

  const save = async () => {
    if (!summary.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/rolodex/${contactId}/interactions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, summary: summary.trim(), date: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data.interaction) onAdded(data.interaction);
      setSummary("");
      setOpen(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-white/[0.1] text-[11px] text-slate-400 hover:text-white hover:border-white/[0.2] transition-all">
        <Plus size={12} /> Log Interaction
      </button>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] space-y-2">
      <div className="flex gap-1 flex-wrap">
        {types.map(t => (
          <button key={t} onClick={() => setType(t)}
            className={cn("px-2 py-0.5 rounded text-[10px] transition-all",
              type === t ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-slate-500 hover:text-white border border-transparent"
            )}>
            {INTERACTION_TYPE_LABELS[t]}
          </button>
        ))}
      </div>
      <input value={summary} onChange={e => setSummary(e.target.value)}
        placeholder="What happened?"
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setOpen(false); }}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-3 py-2 text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/30"
        autoFocus
      />
      <div className="flex gap-2 justify-end">
        <button onClick={() => setOpen(false)} className="px-3 py-1 rounded text-[11px] text-slate-400 hover:text-white transition-colors">Cancel</button>
        <button onClick={save} disabled={!summary.trim() || saving}
          className="px-3 py-1 rounded bg-blue-600 text-white text-[11px] font-medium disabled:opacity-30">
          {saving ? "..." : "Log"}
        </button>
      </div>
    </div>
  );
}

// ─── Activity Sparkline (ECharts) ───
function ActivityChart({ interactions }: { interactions: RolodexContact["interactions"] }) {
  const now = Date.now();
  // Last 12 weeks, one bar per week
  const weeks: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = now - (i + 1) * 7 * 86400000;
    const end = now - i * 7 * 86400000;
    const count = interactions.filter(int => {
      const t = new Date(int.date).getTime();
      return t >= start && t < end;
    }).length;
    const d = new Date(end);
    weeks.push({ label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count });
  }

  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", backgroundColor: "#1a1a2e", borderColor: "rgba(255,255,255,0.08)", textStyle: { color: "#e2e8f0", fontSize: 11 }, formatter: (p: any[]) => `${p[0].name}<br/>${p[0].value} interactions` },
    grid: { left: 0, right: 0, top: 8, bottom: 20 },
    xAxis: { type: "category", data: weeks.map(w => w.label), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#475569", fontSize: 9, interval: 2 }, splitLine: { show: false } },
    yAxis: { type: "value", show: false },
    series: [{
      type: "bar",
      data: weeks.map(w => w.count),
      barWidth: "60%",
      itemStyle: {
        borderRadius: [3, 3, 0, 0],
        color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "#2093FF" }, { offset: 1, color: "rgba(32,147,255,0.3)" }] }
      },
      emphasis: { itemStyle: { color: "#3ba3ff" } },
    }],
  };

  return <ReactEChartsCore option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />;
}

// ─── Score Ring (SVG) ───
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 75 ? "#34D399" : score >= 50 ? "#60A5FA" : score >= 25 ? "#FBBF24" : "#64748B";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[20px] font-bold font-mono" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

// ─── Score Breakdown ───
function ScoreBreakdown({ signals }: { signals: { label: string; value: number; weight: number }[] }) {
  return (
    <div className="space-y-2">
      {signals.map(s => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="text-[11px] text-slate-500 w-24">{s.label} ({s.weight}%)</span>
          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.value}%`, backgroundColor: s.value >= 75 ? "#34D399" : s.value >= 50 ? "#60A5FA" : s.value >= 25 ? "#FBBF24" : "#64748B" }} />
          </div>
          <span className="text-[11px] text-slate-400 w-8 text-right font-mono">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Location Map ───
function LocationMap({ city, state }: { city?: string; state?: string }) {
  if (!city) return null;
  const query = encodeURIComponent(`${city}${state ? `, ${state}` : ""}`);
  return (
    <iframe
      key={`${city}-${state}`}
      src={`https://www.google.com/maps?q=${query}&output=embed&z=13`}
      style={{ width: "100%", height: "100%", border: 0, filter: "invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2) saturate(0.3)" }}
      loading="lazy" referrerPolicy="no-referrer"
    />
  );
}

// ─── Tabs ───
const TABS = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "timeline", label: "Timeline", icon: Activity },
  { id: "notes", label: "Notes & Facts", icon: BookUser },
  { id: "connections", label: "Connections", icon: Users },
  { id: "ai", label: "AI Briefing", icon: Brain },
] as const;
type TabId = typeof TABS[number]["id"];

// ─── Main Page ───
export default function ContactPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const [contact, setContact] = useState<RolodexContact | null>(null);
  const [allContacts, setAllContacts] = useState<RolodexContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const [activityFilter, setActivityFilter] = useState<InteractionType | "all">("all");
  const [noteSearch, setNoteSearch] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Keyboard shortcuts: J/K for prev/next contact
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      const idx = allContacts.findIndex(c => c.id === contactId);
      if (e.key === "j" && idx < allContacts.length - 1) router.push(`/rolodex/${allContacts[idx + 1].id}`);
      if (e.key === "k" && idx > 0) router.push(`/rolodex/${allContacts[idx - 1].id}`);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [allContacts, contactId, router]);

  // Handle adding interaction/note to state
  const addInteraction = useCallback((int: any) => {
    if (!contact) return;
    setContact({ ...contact, interactions: [int, ...contact.interactions] });
  }, [contact]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/rolodex/${contactId}`).then(r => r.json()),
      fetch("/api/rolodex").then(r => r.json()),
    ]).then(([single, all]) => {
      setContact(single.contact ?? null);
      setAllContacts(all.contacts ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [contactId]);

  // Auto-save any field on blur
  const saveField = useCallback(async (field: string, value: string) => {
    if (!contact) return;
    const updated = { ...contact, [field]: value, updatedAt: new Date().toISOString() };
    setContact(updated);
    try {
      const res = await fetch(`/api/rolodex/${contact.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.contact) setContact(data.contact);
    } catch (e) { console.error(e); }
  }, [contact]);

  // Generate AI summary
  const generateSummary = useCallback(async () => {
    if (!contact) return;
    setAiLoading(true);
    try {
      const res = await fetch(`/api/rolodex/${contact.id}/ai-summary`, { method: "POST" });
      const data = await res.json();
      if (data.summary) setContact({ ...contact, aiSummary: data.summary });
    } catch (e) { console.error(e); }
    setAiLoading(false);
  }, [contact]);

  const scoreData = useMemo(() => contact ? calculateScore(contact) : null, [contact]);

  if (loading) return <div className="flex items-center justify-center h-[80vh]"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!contact || !scoreData) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="text-center">
        <Users size={48} className="mx-auto mb-4 text-slate-600" />
        <p className="text-[16px] text-white mb-2">Person not found</p>
        <Link href="/rolodex" className="text-[13px] text-blue-400 hover:text-blue-300">← Back to Rolodex</Link>
      </div>
    </div>
  );

  const calls = contact.interactions.filter(i => i.type === "call");
  const totalCallTime = calls.reduce((s, c) => s + (c.duration ?? 0), 0);
  const connectedContacts = allContacts.filter(c => contact.connections.includes(c.id));
  const filteredActivity = contact.interactions
    .filter(i => activityFilter === "all" || i.type === activityFilter)
    .sort((a, b) => b.date.localeCompare(a.date));
  const filteredNotes = contact.notes
    .filter(n => !noteSearch || n.content.toLowerCase().includes(noteSearch.toLowerCase()))
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt.localeCompare(a.createdAt));

  const oppStatusColors: Record<string, string> = {
    open: "text-blue-400 bg-blue-400/10", "in-progress": "text-amber-400 bg-amber-400/10",
    won: "text-emerald-400 bg-emerald-400/10", lost: "text-red-400 bg-red-400/10",
    "on-hold": "text-slate-400 bg-slate-400/10",
  };

  // Prev/Next navigation
  const currentIdx = allContacts.findIndex(c => c.id === contact.id);
  const prevContact = currentIdx > 0 ? allContacts[currentIdx - 1] : null;
  const nextContact = currentIdx < allContacts.length - 1 ? allContacts[currentIdx + 1] : null;

  return (
    <div className="min-h-screen">
      {/* ─── Breadcrumb ─── */}
      <div className="sticky top-0 z-20 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <Link href="/rolodex" className="flex items-center gap-2 text-[13px] text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={15} /> Rolodex
          </Link>
          <ChevronRight size={12} className="text-slate-600" />
          <span className="text-[13px] text-white font-medium">{getFullName(contact)}</span>
          <span className="text-[11px] text-slate-600 ml-1">{currentIdx + 1} of {allContacts.length}</span>
          <div className="ml-auto flex items-center gap-1">
            {prevContact && (
              <Link href={`/rolodex/${prevContact.id}`} className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all" title={getFullName(prevContact)}>
                <ArrowLeft size={14} />
              </Link>
            )}
            {nextContact && (
              <Link href={`/rolodex/${nextContact.id}`} className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.06] transition-all" title={getFullName(nextContact)}>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {/* ═══════ HERO HEADER ═══════ */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          {/* Left: Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-[24px] font-bold shrink-0 border border-white/[0.08]"
                style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[contact.relationshipType]}12`, color: RELATIONSHIP_TYPE_COLORS[contact.relationshipType] }}>
                {getInitials(contact)}
              </div>
              <div className="flex-1 min-w-0">
                {/* Name — click to edit */}
                <div className="flex items-baseline gap-2">
                  <InlineField value={contact.firstName} field="firstName" onSave={saveField} placeholder="First" className="text-[22px] font-bold tracking-tight" />
                  <InlineField value={contact.lastName} field="lastName" onSave={saveField} placeholder="Last" className="text-[22px] font-bold tracking-tight" />
                </div>
                {/* Title & Company */}
                <div className="flex items-center gap-1 mt-0.5 text-[13px] text-slate-400">
                  <InlineField value={contact.title} field="title" onSave={saveField} placeholder="Title" className="text-[13px] text-slate-400" />
                  <span className="text-slate-600">at</span>
                  <InlineField value={contact.company} field="company" onSave={saveField} placeholder="Company" className="text-[13px] text-slate-400" />
                </div>
                {/* Badges */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium"
                    style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[contact.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[contact.relationshipType] }}>
                    {RELATIONSHIP_TYPE_LABELS[contact.relationshipType]}
                  </span>
                  {contact.city && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin size={10} />
                      <InlineField value={contact.city} field="city" onSave={saveField} placeholder="City" className="text-[11px] text-slate-500" />
                      {contact.state && <>,&nbsp;<InlineField value={contact.state} field="state" onSave={saveField} placeholder="ST" className="text-[11px] text-slate-500 w-8" /></>}
                    </span>
                  )}
                  {contact.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] text-slate-500">{t}</span>
                  ))}
                </div>
                {/* Contact info — all inline editable */}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                    <Mail size={12} className="text-slate-500 shrink-0" />
                    <InlineField value={contact.email} field="email" onSave={saveField} placeholder="email" className="text-[12px] text-slate-400" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                    <Phone size={12} className="text-slate-500 shrink-0" />
                    <InlineField value={contact.phone} field="phone" onSave={saveField} placeholder="phone" className="text-[12px] text-slate-400" />
                  </div>
                </div>
                {/* Social icons */}
                <div className="flex items-center gap-1.5 mt-2">
                  {contact.website && <a href={contact.website} target="_blank" className="p-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-white transition-colors"><Globe size={12} /></a>}
                  {contact.linkedin && <a href={`https://${contact.linkedin}`} target="_blank" className="p-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-white transition-colors text-[10px] font-bold">in</a>}
                  {contact.twitter && <a href={`https://twitter.com/${contact.twitter}`} target="_blank" className="p-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-white transition-colors text-[10px] font-bold">𝕏</a>}
                  {contact.instagram && <a href={`https://instagram.com/${contact.instagram}`} target="_blank" className="p-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-slate-500 hover:text-white transition-colors"><Camera size={12} /></a>}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Score Ring + Quick Stats */}
          <div className="flex items-start gap-5 lg:gap-6 shrink-0">
            <button onClick={() => setShowScoreDetail(!showScoreDetail)} className="flex flex-col items-center gap-1 group">
              <ScoreRing score={scoreData.score} />
              <span className={cn("text-[11px] font-medium", scoreColor(scoreData.score))}>{scoreLabel(scoreData.score)}</span>
            </button>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px]">
              <div><span className="text-slate-500">Last contact</span><p className="text-white font-medium">{timeAgo(contact.lastContactedAt)}</p></div>
              <div><span className="text-slate-500">Interactions</span><p className="text-white font-medium">{contact.interactions.length}</p></div>
              <div><span className="text-slate-500">Follow up</span><p className={cn("font-medium", contact.nextFollowUp && new Date(contact.nextFollowUp) <= new Date() ? "text-red-400" : "text-white")}><InlineField value={contact.nextFollowUp?.split("T")[0]} field="nextFollowUp" onSave={saveField} placeholder="Set date" className="text-[11px]" type="date" /></p></div>
              <div><span className="text-slate-500">Talk time</span><p className="text-white font-medium">{formatDuration(totalCallTime) || "0m"}</p></div>
            </div>
          </div>
        </div>

        {/* Score breakdown (expandable) */}
        {showScoreDetail && (
          <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] max-w-md">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Score Breakdown</p>
            <ScoreBreakdown signals={scoreData.signals} />
          </div>
        )}

        {/* ═══════ TABS ═══════ */}
        <div className="border-b border-white/[0.06] mb-6">
          <div className="flex gap-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("flex items-center gap-1.5 px-5 py-3 text-[12px] font-medium border-b-2 transition-all",
                    activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                  )}>
                  <Icon size={13} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ TAB CONTENT ═══════ */}
        <div className="pb-20">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-6">
                {/* AI Summary */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/[0.04] to-transparent border border-blue-500/[0.08]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={13} className="text-blue-400" />
                      <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">AI Overview</span>
                    </div>
                    <button onClick={generateSummary} disabled={aiLoading}
                      className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors disabled:opacity-50">
                      {aiLoading ? "Generating..." : contact.aiSummary ? "Refresh" : "Generate"}
                    </button>
                  </div>
                  {contact.aiSummary ? (
                    <p className="text-[13px] text-slate-300 leading-relaxed">{contact.aiSummary}</p>
                  ) : (
                    <p className="text-[12px] text-slate-500 italic">Click Generate to create an AI relationship summary.</p>
                  )}
                  {/* Action items */}
                  {contact.aiInsights?.filter(i => i.actionable && !i.dismissed).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-blue-500/[0.08] space-y-1.5">
                      {contact.aiInsights.filter(i => i.actionable && !i.dismissed).map(insight => (
                        <div key={insight.id} className="flex items-start gap-2">
                          <Lightbulb size={11} className="text-amber-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] text-slate-400">{insight.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Note</p>
                    <QuickAddNote contactId={contact.id} onAdded={addInteraction} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Log Activity</p>
                    <QuickLogInteraction contactId={contact.id} onAdded={addInteraction} />
                  </div>
                </div>

                {/* Activity Chart */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Activity — Last 12 Weeks</p>
                  <div className="h-[120px]">
                    <ActivityChart interactions={contact.interactions} />
                  </div>
                </div>

                {/* Pinned notes */}
                {contact.notes.filter(n => n.pinned).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2">📌 Pinned Notes</p>
                    <div className="space-y-2">
                      {contact.notes.filter(n => n.pinned).map(note => (
                        <div key={note.id} className="p-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/[0.08]">
                          <p className="text-[12px] text-slate-300 leading-relaxed">{note.content}</p>
                          <p className="text-[10px] text-slate-600 mt-1.5">{timeAgo(note.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent activity */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-3">Recent Activity</p>
                  <div className="space-y-0.5">
                    {contact.interactions.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(int => (
                      <div key={int.id} className="flex gap-3 py-2.5 border-b border-white/[0.03] last:border-0">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", interactionColor(int.type))}>
                          {interactionIcon(int.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-white">{int.summary}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500">{timeAgo(int.date)}</span>
                            {int.duration && <span className="text-[10px] text-slate-600">· {formatDuration(int.duration)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {contact.interactions.length > 5 && (
                    <button onClick={() => setActiveTab("timeline")} className="text-[11px] text-blue-400 hover:text-blue-300 mt-2 transition-colors">
                      View all {contact.interactions.length} interactions →
                    </button>
                  )}
                </div>

                {/* Opportunities */}
                {(contact.opportunities ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2">Opportunities</p>
                    <div className="space-y-2">
                      {contact.opportunities.map(opp => (
                        <div key={opp.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                          <div>
                            <span className="text-[13px] font-medium text-white">{opp.title}</span>
                            {opp.nextStep && <p className="text-[11px] text-slate-500 mt-0.5">→ {opp.nextStep}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {opp.value && <span className="text-[13px] font-bold font-mono text-emerald-400">{opp.value}</span>}
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", oppStatusColors[opp.status])}>{opp.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar column */}
              <div className="space-y-5">
                {/* Details card — all inline editable */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Details</p>
                  {[
                    { label: "Birthday", field: "birthday", type: "date" },
                    { label: "Spouse", field: "spouse" },
                    { label: "College", field: "college" },
                    { label: "Interests", field: "interests" },
                    { label: "Source", field: "source" },
                    { label: "Introduced By", field: "introducedBy" },
                    { label: "How We Met", field: "howWeMet" },
                    { label: "Instagram", field: "instagram" },
                    { label: "LinkedIn", field: "linkedin" },
                    { label: "Website", field: "website" },
                  ].map(({ label, field, type }) => (
                    <div key={field} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 shrink-0">{label}</span>
                      <InlineField
                        value={(contact as any)[field]}
                        field={field}
                        onSave={saveField}
                        placeholder="Add..."
                        className="text-[11px] text-slate-300 text-right"
                        type={type}
                      />
                    </div>
                  ))}
                </div>

                {/* Key facts */}
                {contact.facts.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Facts</p>
                    <div className="space-y-2">
                      {contact.facts.map(f => (
                        <div key={f.id} className="flex justify-between gap-2">
                          <span className="text-[11px] text-slate-500">{f.label}</span>
                          <span className="text-[11px] text-slate-300 text-right">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location map */}
                {contact.city && (
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                    <div className="px-4 pt-3 pb-2">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Location</p>
                      <p className="text-[12px] text-slate-300 mt-1">{contact.city}{contact.state ? `, ${contact.state}` : ""}</p>
                    </div>
                    <div className="h-[120px]">
                      <LocationMap city={contact.city} state={contact.state} />
                    </div>
                  </div>
                )}

                {/* Connections */}
                {connectedContacts.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Connections ({connectedContacts.length})</p>
                    <div className="space-y-2">
                      {connectedContacts.map(cc => (
                        <Link key={cc.id} href={`/rolodex/${cc.id}`} className="flex items-center gap-2.5 group">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                            style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[cc.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[cc.relationshipType] }}>
                            {getInitials(cc)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] text-slate-300 group-hover:text-white truncate transition-colors">{getFullName(cc)}</p>
                            <p className="text-[10px] text-slate-500">{cc.company || RELATIONSHIP_TYPE_LABELS[cc.relationshipType]}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TIMELINE ── */}
          {activeTab === "timeline" && (
            <div>
              {/* Filter bar */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <div className="flex bg-white/[0.03] rounded-lg border border-white/[0.06] p-0.5 gap-0.5 flex-wrap">
                  {(["all", "call", "email", "meeting", "text", "social"] as const).map(f => (
                    <button key={f} onClick={() => setActivityFilter(f)}
                      className={cn("px-2.5 py-1 rounded-md text-[11px] transition-all",
                        activityFilter === f ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-white"
                      )}>
                      {f === "all" ? "All" : INTERACTION_TYPE_LABELS[f]}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500 ml-auto">{filteredActivity.length} interactions</span>
              </div>
              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-white/[0.04]" />
                <div className="space-y-0">
                  {filteredActivity.map(int => (
                    <div key={int.id} className="flex gap-4 py-3 relative">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 z-10 relative", interactionColor(int.type))}>
                        {interactionIcon(int.type)}
                      </div>
                      <div className="flex-1 min-w-0 pb-3 border-b border-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 uppercase font-medium">{INTERACTION_TYPE_LABELS[int.type]}</span>
                          {int.direction && <span className="text-[10px] text-slate-600">· {int.direction}</span>}
                          {int.sentiment && (
                            <span className={cn("text-[10px]",
                              int.sentiment === "positive" ? "text-emerald-400" : int.sentiment === "negative" ? "text-red-400" : "text-slate-500"
                            )}>· {int.sentiment}</span>
                          )}
                        </div>
                        <p className="text-[13px] text-white mt-0.5">{int.summary}</p>
                        {int.details && <p className="text-[12px] text-slate-400 mt-1 leading-relaxed">{int.details}</p>}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-slate-500">{formatDate(int.date)}</span>
                          {int.duration && <span className="text-[10px] text-slate-600">{formatDuration(int.duration)}</span>}
                          {int.location && <span className="text-[10px] text-slate-600 flex items-center gap-1"><MapPin size={9} />{int.location}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {filteredActivity.length === 0 && (
                <div className="flex flex-col items-center py-16 text-slate-500">
                  <Activity size={32} className="mb-3 opacity-30" />
                  <p className="text-[13px]">No activity matching filter</p>
                </div>
              )}
            </div>
          )}

          {/* ── NOTES & FACTS ── */}
          {activeTab === "notes" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notes ({contact.notes.length})</p>
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input type="text" value={noteSearch} onChange={e => setNoteSearch(e.target.value)}
                      placeholder="Search..."
                      className="pl-8 pr-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-[11px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/30 w-36" />
                  </div>
                </div>
                {/* Add note */}
                <div className="mb-3">
                  <QuickAddNote contactId={contact.id} onAdded={addInteraction} />
                </div>
                <div className="space-y-2">
                  {filteredNotes.map(note => (
                    <div key={note.id} className={cn("p-3 rounded-lg border",
                      note.pinned ? "bg-amber-500/[0.04] border-amber-500/[0.08]" : "bg-white/[0.02] border-white/[0.06]"
                    )}>
                      {note.pinned && <span className="text-[9px] text-amber-400 font-medium">📌 PINNED</span>}
                      <p className="text-[12px] text-slate-300 leading-relaxed mt-0.5">{note.content}</p>
                      <p className="text-[10px] text-slate-600 mt-1.5">{formatDate(note.createdAt)}</p>
                    </div>
                  ))}
                  {filteredNotes.length === 0 && (
                    <div className="flex flex-col items-center py-12 text-slate-500">
                      <StickyNote size={28} className="mb-2 opacity-30" />
                      <p className="text-[12px]">{noteSearch ? "No matching notes" : "No notes yet"}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Facts */}
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Fact Book ({contact.facts.length})</p>
                {contact.facts.length > 0 ? (
                  <div className="space-y-4">
                    {Array.from(new Set(contact.facts.map(f => f.category))).map(cat => (
                      <div key={cat}>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{cat}</p>
                        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04]">
                          {contact.facts.filter(f => f.category === cat).map(f => (
                            <div key={f.id} className="flex items-center justify-between px-3 py-2.5">
                              <span className="text-[11px] text-slate-400">{f.label}</span>
                              <span className="text-[12px] text-white font-medium text-right max-w-[55%]">{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 text-slate-500">
                    <BookUser size={28} className="mb-2 opacity-30" />
                    <p className="text-[12px]">No facts recorded</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CONNECTIONS ── */}
          {activeTab === "connections" && (
            <div>
              {connectedContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {connectedContacts.map(cc => (
                    <Link key={cc.id} href={`/rolodex/${cc.id}`}
                      className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0"
                        style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[cc.relationshipType]}12`, color: RELATIONSHIP_TYPE_COLORS[cc.relationshipType] }}>
                        {getInitials(cc)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white group-hover:text-blue-300 transition-colors truncate">{getFullName(cc)}</p>
                        <p className="text-[11px] text-slate-500 truncate">{cc.title ? `${cc.title} at ` : ""}{cc.company || RELATIONSHIP_TYPE_LABELS[cc.relationshipType]}</p>
                      </div>
                      <ChevronRight size={13} className="text-slate-600 group-hover:text-white transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-slate-500">
                  <Users size={32} className="mb-3 opacity-30" />
                  <p className="text-[13px]">No connections mapped yet</p>
                </div>
              )}
            </div>
          )}

          {/* ── AI BRIEFING ── */}
          {activeTab === "ai" && (
            <div className="max-w-2xl">
              {contact.aiBriefing ? (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl bg-gradient-to-br from-blue-500/[0.05] to-transparent border border-blue-500/[0.1]">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain size={15} className="text-blue-400" />
                      <span className="text-[12px] font-semibold text-blue-400">Pre-Meeting Briefing</span>
                    </div>
                    <p className="text-[13px] text-slate-300 leading-relaxed whitespace-pre-line">{contact.aiBriefing}</p>
                  </div>

                  {contact.aiInsights.filter(i => i.actionable && !i.dismissed).length > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-3">⚡ Action Items</p>
                      <div className="space-y-2">
                        {contact.aiInsights.filter(i => i.actionable && !i.dismissed).map(insight => (
                          <div key={insight.id} className="flex items-start gap-2.5 py-1">
                            <Lightbulb size={12} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[12px] text-slate-300">{insight.content}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Confidence: {Math.round(insight.confidence * 100)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {contact.facts.length > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">📋 Quick Reference</p>
                      <div className="grid grid-cols-2 gap-2">
                        {contact.facts.map(f => (
                          <div key={f.id} className="flex justify-between">
                            <span className="text-[11px] text-slate-500">{f.label}</span>
                            <span className="text-[11px] text-slate-300">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-slate-500">
                  <Brain size={32} className="mb-3 opacity-30" />
                  <p className="text-[14px] text-white mb-1">AI Briefing</p>
                  <p className="text-[12px]">Not enough data to generate a briefing yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
