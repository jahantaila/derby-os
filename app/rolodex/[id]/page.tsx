"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowLeft, BookUser, Briefcase, Calendar, ChevronRight,
  Clock3, ExternalLink, FileText, Globe, Heart,
  Layers, Lightbulb, Mail, MapPin, MessageSquare,
  Phone, Plus, Search, Sparkles, Star,
  StickyNote, Target, TrendingUp, Users, X,
  Image as ImageIcon, Activity, Brain, Gift,
  ChevronDown, Hash, Filter, Camera, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RolodexContact, type InteractionType,
  RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_TYPE_COLORS,
  INTERACTION_TYPE_LABELS,
} from "@/lib/rolodex-types";
import { SEED_CONTACTS } from "@/lib/rolodex-seed";

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
  if (days < 0) return `in ${Math.abs(days)}d`;
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatDuration(seconds?: number) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function scoreColor(s: number) { return s >= 75 ? "text-emerald-400" : s >= 50 ? "text-blue-400" : s >= 25 ? "text-amber-400" : "text-slate-500"; }
function scoreBg(s: number) { return s >= 75 ? "bg-emerald-400/10" : s >= 50 ? "bg-blue-400/10" : s >= 25 ? "bg-amber-400/10" : "bg-slate-500/10"; }
function scoreLabel(s: number) { return s >= 75 ? "Strong" : s >= 50 ? "Moderate" : s >= 25 ? "Weak" : "Cold"; }

function interactionIcon(type: InteractionType) {
  switch (type) {
    case "call": return <Phone size={13} />;
    case "email": return <Mail size={13} />;
    case "meeting": return <Users size={13} />;
    case "text": return <MessageSquare size={13} />;
    case "social": return <Globe size={13} />;
    case "event": return <Calendar size={13} />;
    case "note": return <StickyNote size={13} />;
    case "gift": return <Gift size={13} />;
    case "referral": return <ArrowLeft size={13} />;
    case "deal": return <Briefcase size={13} />;
    case "photo": return <Camera size={13} />;
    case "milestone": return <Star size={13} />;
    default: return <Activity size={13} />;
  }
}
function interactionColor(type: InteractionType) {
  switch (type) {
    case "call": return "bg-green-500/10 text-green-400";
    case "email": return "bg-blue-500/10 text-blue-400";
    case "meeting": return "bg-indigo-500/10 text-indigo-400";
    case "text": return "bg-cyan-500/10 text-cyan-400";
    case "social": return "bg-pink-500/10 text-pink-400";
    case "gift": return "bg-amber-500/10 text-amber-400";
    case "milestone": return "bg-yellow-500/10 text-yellow-400";
    default: return "bg-white/[0.05] text-slate-400";
  }
}

const CITY_COORDS: Record<string, [number, number]> = {
  "Louisville": [-85.7585, 38.2527], "Charlotte": [-80.8431, 35.2271],
  "New York": [-74.006, 40.7128], "Remote": [-98.5795, 39.8283],
  "San Francisco": [-122.4194, 37.7749], "Nashville": [-86.7816, 36.1627],
};

// ─── All tabs ───
const TABS = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "email", label: "Email", icon: Mail },
  { id: "photos", label: "Photos", icon: Camera },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "weekly", label: "Weekly", icon: BarChart3 },
  { id: "connections", label: "Connections", icon: Users },
  { id: "factbook", label: "Fact Book", icon: BookUser },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "opportunities", label: "Opps", icon: Target },
  { id: "briefing", label: "AI Briefing", icon: Brain },
] as const;

type TabId = typeof TABS[number]["id"];

// ─── Location Map ───
function LocationMap({ city }: { city?: string }) {
  const coords = city ? CITY_COORDS[city] : null;
  if (!city) return null;
  const option = {
    backgroundColor: "transparent",
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    xAxis: { show: false, min: -130, max: -65 },
    yAxis: { show: false, min: 24, max: 50 },
    series: [
      { type: "scatter", data: Array.from({ length: 40 }, () => [-130 + Math.random() * 65, 24 + Math.random() * 26]), symbolSize: 1.5, itemStyle: { color: "rgba(255,255,255,0.06)" }, silent: true },
      ...(coords ? [{ type: "effectScatter", data: [[coords[0], coords[1]]], symbolSize: 10, rippleEffect: { brushType: "stroke", scale: 5, period: 3 }, itemStyle: { color: "#2093FF", shadowBlur: 20, shadowColor: "#2093FF" }, zlevel: 1 }] : []),
    ],
  };
  return (
    <div className="w-full h-[140px] rounded-lg overflow-hidden bg-gradient-to-b from-white/[0.02] to-transparent border border-white/[0.06] relative">
      <ReactEChartsCore option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0a0f] to-transparent pointer-events-none" />
    </div>
  );
}

// ─── Weekly Heatmap ───
function WeeklyHeatmap({ interactions }: { interactions: RolodexContact["interactions"] }) {
  // Build 52 weeks of data
  const now = Date.now();
  const weeks: number[] = Array(52).fill(0);
  interactions.forEach(i => {
    const w = Math.floor((now - new Date(i.date).getTime()) / (7 * 86400000));
    if (w >= 0 && w < 52) weeks[51 - w]++;
  });
  const max = Math.max(...weeks, 1);
  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];
  const monthLabels: string[] = [];
  for (let i = 0; i < 52; i++) {
    const d = new Date(now - (51 - i) * 7 * 86400000);
    monthLabels.push(i % 4 === 0 ? d.toLocaleDateString("en-US", { month: "short" }) : "");
  }
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", formatter: (p: { value: number[] }) => `Week ${p.value[0] + 1}: ${p.value[1]} interactions` },
    grid: { left: 40, right: 10, top: 30, bottom: 20 },
    xAxis: { type: "category", data: monthLabels, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#64748B", fontSize: 10 }, splitLine: { show: false } },
    yAxis: { type: "category", data: [""], axisLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false }, splitLine: { show: false } },
    visualMap: { min: 0, max, show: false, inRange: { color: ["rgba(32,147,255,0.05)", "rgba(32,147,255,0.2)", "rgba(32,147,255,0.4)", "rgba(32,147,255,0.6)", "#2093FF"] } },
    series: [{ type: "heatmap", data: weeks.map((v, i) => [i, 0, v]), label: { show: false }, itemStyle: { borderWidth: 2, borderColor: "#0a0a0f", borderRadius: 3 }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "#2093FF" } } }],
  };
  return (
    <div className="w-full h-[100px]">
      <ReactEChartsCore option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
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
            <div className="h-full rounded-full transition-all" style={{ width: `${s.value}%`, backgroundColor: s.value >= 75 ? "#34D399" : s.value >= 50 ? "#60A5FA" : s.value >= 25 ? "#FBBF24" : "#64748B" }} />
          </div>
          <span className="text-[11px] text-slate-400 w-8 text-right font-mono">{s.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Contact Page ───
export default function ContactPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const contact = SEED_CONTACTS.find(c => c.id === contactId);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showScoreDetail, setShowScoreDetail] = useState(false);
  const [activityFilter, setActivityFilter] = useState<InteractionType | "all">("all");
  const [activitySort, setActivitySort] = useState<"newest" | "oldest">("newest");
  const [noteSearch, setNoteSearch] = useState("");

  const scoreData = useMemo(() => contact ? calculateScore(contact) : null, [contact]);

  if (!contact || !scoreData) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <Users size={48} className="mx-auto mb-4 text-slate-600" />
          <p className="text-[16px] text-white mb-2">Person not found</p>
          <Link href="/rolodex" className="text-[13px] text-blue-400 hover:text-blue-300">← Back to Rolodex</Link>
        </div>
      </div>
    );
  }

  const calls = contact.interactions.filter(i => i.type === "call");
  const emails = contact.interactions.filter(i => i.type === "email");
  const messages = contact.interactions.filter(i => i.type === "text");
  const meetings = contact.interactions.filter(i => i.type === "meeting");
  const photos = contact.interactions.filter(i => i.type === "photo");
  const totalCallTime = calls.reduce((s, c) => s + (c.duration ?? 0), 0);
  const connectedContacts = SEED_CONTACTS.filter(c => contact.connections.includes(c.id));

  const filteredActivity = contact.interactions
    .filter(i => activityFilter === "all" || i.type === activityFilter)
    .sort((a, b) => activitySort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));

  const filteredNotes = contact.notes
    .filter(n => !noteSearch || n.content.toLowerCase().includes(noteSearch.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const oppStatusColors: Record<string, string> = {
    open: "text-blue-400 bg-blue-400/10",
    "in-progress": "text-amber-400 bg-amber-400/10",
    won: "text-emerald-400 bg-emerald-400/10",
    lost: "text-red-400 bg-red-400/10",
    "on-hold": "text-slate-400 bg-slate-400/10",
  };

  return (
    <div className="min-h-screen">
      {/* ─── Back nav ─── */}
      <div className="sticky top-0 z-20 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <Link href="/rolodex" className="flex items-center gap-2 text-[13px] text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={15} />
            <span>Rolodex</span>
          </Link>
          <ChevronRight size={12} className="text-slate-600" />
          <span className="text-[13px] text-white font-medium">{getFullName(contact)}</span>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {/* ═══════ PROFILE HEADER ═══════ */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Avatar + core info */}
          <div className="flex-1">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0 border border-white/[0.08]"
                style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[contact.relationshipType]}12`, color: RELATIONSHIP_TYPE_COLORS[contact.relationshipType] }}>
                {getInitials(contact)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-[24px] font-bold text-white tracking-tight">{getFullName(contact)}</h1>
                {(contact.title || contact.company) && (
                  <p className="text-[14px] text-slate-400 mt-1">
                    {contact.title}{contact.title && contact.company ? " at " : ""}{contact.company}
                  </p>
                )}
                <div className="flex items-center gap-2.5 mt-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium"
                    style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[contact.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[contact.relationshipType] }}>
                    {RELATIONSHIP_TYPE_LABELS[contact.relationshipType]}
                  </span>
                  {contact.city && (
                    <span className="flex items-center gap-1 text-[12px] text-slate-500">
                      <MapPin size={11} /> {contact.city}{contact.state ? `, ${contact.state}` : ""}
                    </span>
                  )}
                  {contact.college && (
                    <span className="flex items-center gap-1 text-[12px] text-slate-500">
                      <BookUser size={11} /> {contact.college}
                    </span>
                  )}
                  {contact.spouse && (
                    <span className="flex items-center gap-1 text-[12px] text-slate-500">
                      <Heart size={11} /> {contact.spouse}
                    </span>
                  )}
                </div>
                {/* Contact links */}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-blue-400 transition-colors">
                      <Mail size={12} /> {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-green-400 transition-colors">
                      <Phone size={12} /> {contact.phone}
                    </a>
                  )}
                </div>
                {/* Social links */}
                <div className="flex items-center gap-2 mt-2">
                  {contact.website && <a href={contact.website} target="_blank" className="p-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500 hover:text-white transition-colors"><Globe size={13} /></a>}
                  {contact.linkedin && <a href={`https://${contact.linkedin}`} target="_blank" className="p-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500 hover:text-white transition-colors text-[11px] font-bold">in</a>}
                  {contact.twitter && <a href={`https://twitter.com/${contact.twitter}`} target="_blank" className="p-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500 hover:text-white transition-colors text-[11px] font-bold">𝕏</a>}
                  {contact.instagram && <a href={`https://instagram.com/${contact.instagram}`} target="_blank" className="p-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500 hover:text-white transition-colors"><Camera size={13} /></a>}
                </div>
              </div>
            </div>

            {/* Tags + Groups */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {(contact.groups ?? []).map(g => (
                <span key={g} className="px-2.5 py-1 rounded-md bg-blue-500/[0.08] border border-blue-500/[0.15] text-[11px] font-medium text-blue-300">{g}</span>
              ))}
              {contact.tags.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-400">{t}</span>
              ))}
            </div>
          </div>

          {/* Right: Score + Meta cards */}
          <div className="w-full lg:w-[280px] space-y-3 shrink-0">
            {/* Score card */}
            <button onClick={() => setShowScoreDetail(!showScoreDetail)}
              className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-left hover:border-white/[0.12] transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("text-[28px] font-bold font-mono", scoreColor(scoreData.score))}>{scoreData.score}</div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Score</p>
                    <p className={cn("text-[13px] font-medium", scoreColor(scoreData.score))}>{scoreLabel(scoreData.score)}</p>
                  </div>
                </div>
                <ChevronDown size={14} className={cn("text-slate-500 transition-transform", showScoreDetail && "rotate-180")} />
              </div>
              {showScoreDetail && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <ScoreBreakdown signals={scoreData.signals} />
                </div>
              )}
            </button>

            {/* Meta properties */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
              <div className="flex justify-between">
                <span className="text-[11px] text-slate-500">Created</span>
                <span className="text-[11px] text-slate-300">{formatDate(contact.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-slate-500">Last Contact</span>
                <span className="text-[11px] text-slate-300">{timeAgo(contact.lastContactedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-slate-500">Updated</span>
                <span className="text-[11px] text-slate-300">{timeAgo(contact.updatedAt)}</span>
              </div>
              {contact.nextFollowUp && (
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-500">Follow Up</span>
                  <span className={cn("text-[11px]", new Date(contact.nextFollowUp) <= new Date() ? "text-amber-400 font-medium" : "text-slate-300")}>{timeAgo(contact.nextFollowUp)}</span>
                </div>
              )}
              {contact.introducedBy && (
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-500">Introduced By</span>
                  <span className="text-[11px] text-blue-400">{contact.introducedBy}</span>
                </div>
              )}
              {contact.howWeMet && (
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-500">How We Met</span>
                  <span className="text-[11px] text-slate-300 text-right max-w-[60%]">{contact.howWeMet.length > 40 ? contact.howWeMet.slice(0, 40) + "…" : contact.howWeMet}</span>
                </div>
              )}
              {contact.source && (
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-500">Source</span>
                  <span className="text-[11px] text-slate-300">{contact.source}</span>
                </div>
              )}
            </div>

            {/* Mutual connections */}
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

        {/* ═══════ SMART SUMMARY STRIP ═══════ */}
        {contact.aiBriefing && (
          <div className="mt-6 p-4 rounded-xl bg-blue-500/[0.04] border border-blue-500/[0.1]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-blue-400" />
              <span className="text-[12px] font-semibold text-blue-400 uppercase tracking-wider">Relationship Briefing</span>
            </div>
            <p className="text-[13px] text-slate-300 leading-relaxed">{contact.aiSummary}</p>
            {/* Open loops / action items */}
            {contact.aiInsights.filter(i => i.actionable && !i.dismissed).length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-500/[0.1] space-y-1.5">
                {contact.aiInsights.filter(i => i.actionable && !i.dismissed).map(insight => (
                  <div key={insight.id} className="flex items-start gap-2">
                    <Lightbulb size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-[12px] text-slate-300">{insight.content}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════ TABS ═══════ */}
        <div className="mt-6 border-b border-white/[0.06] overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn("flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium border-b-2 transition-all whitespace-nowrap",
                    activeTab === tab.id ? "border-blue-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                  )}>
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════ TAB CONTENT ═══════ */}
        <div className="mt-6 pb-20">

          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                {/* AI Summary */}
                {contact.aiSummary && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={13} className="text-blue-400" />
                      <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">AI Overview</span>
                    </div>
                    <p className="text-[13px] text-slate-300 leading-relaxed">{contact.aiSummary}</p>
                  </div>
                )}

                {/* Pinned notes */}
                {contact.notes.filter(n => n.pinned).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2">📌 Pinned Notes</p>
                    <div className="space-y-2">
                      {contact.notes.filter(n => n.pinned).map(note => (
                        <div key={note.id} className="p-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/[0.1]">
                          <p className="text-[12px] text-slate-300 leading-relaxed">{note.content}</p>
                          <p className="text-[10px] text-slate-600 mt-2">{timeAgo(note.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent timeline */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-3">Recent Activity</p>
                  <div className="space-y-0.5">
                    {contact.interactions.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(int => (
                      <div key={int.id} className="flex gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", interactionColor(int.type))}>
                          {interactionIcon(int.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-white">{int.summary}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500">{timeAgo(int.date)}</span>
                            {int.duration && <span className="text-[11px] text-slate-600">· {formatDuration(int.duration)}</span>}
                            {int.location && <span className="text-[11px] text-slate-600">· {int.location}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Opportunities */}
                {(contact.opportunities ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2">Opportunities</p>
                    <div className="space-y-2">
                      {contact.opportunities.map(opp => (
                        <div key={opp.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-medium text-white">{opp.title}</span>
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", oppStatusColors[opp.status])}>{opp.status}</span>
                          </div>
                          {opp.value && <p className="text-[12px] text-emerald-400 mt-1">{opp.value}</p>}
                          {opp.nextStep && <p className="text-[11px] text-slate-400 mt-1">→ {opp.nextStep}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Key facts */}
                {contact.facts.length > 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-3">Key Facts</p>
                    <div className="space-y-2">
                      {contact.facts.slice(0, 6).map(f => (
                        <div key={f.id} className="flex justify-between">
                          <span className="text-[11px] text-slate-500">{f.label}</span>
                          <span className="text-[12px] text-slate-300 text-right max-w-[55%]">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                {contact.city && (
                  <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                    <div className="px-4 pt-3 pb-2">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em]">Location</p>
                      <p className="text-[12px] text-slate-300 mt-1">{contact.city}{contact.state ? `, ${contact.state}` : ""}</p>
                    </div>
                    <LocationMap city={contact.city} />
                  </div>
                )}

                {/* Quick stats */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-3">Activity Stats</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[18px] font-bold font-mono text-white">{contact.interactions.length}</p>
                      <p className="text-[10px] text-slate-500">Interactions</p>
                    </div>
                    <div>
                      <p className="text-[18px] font-bold font-mono text-white">{calls.length}</p>
                      <p className="text-[10px] text-slate-500">Calls</p>
                    </div>
                    <div>
                      <p className="text-[18px] font-bold font-mono text-white">{contact.notes.length}</p>
                      <p className="text-[10px] text-slate-500">Notes</p>
                    </div>
                    <div>
                      <p className="text-[18px] font-bold font-mono text-white">{formatDuration(totalCallTime) || "0m"}</p>
                      <p className="text-[10px] text-slate-500">Talk Time</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {activeTab === "activity" && (
            <div>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex bg-white/[0.04] rounded-lg border border-white/[0.08] p-0.5 gap-0.5 flex-wrap">
                  {(["all", "call", "email", "meeting", "text", "social"] as const).map(f => (
                    <button key={f} onClick={() => setActivityFilter(f)}
                      className={cn("px-2.5 py-1 rounded-md text-[11px] transition-all",
                        activityFilter === f ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-white"
                      )}>
                      {f === "all" ? "All" : INTERACTION_TYPE_LABELS[f]}
                    </button>
                  ))}
                </div>
                <button onClick={() => setActivitySort(s => s === "newest" ? "oldest" : "newest")}
                  className="text-[11px] text-slate-500 hover:text-white transition-colors">
                  {activitySort === "newest" ? "Newest first ↓" : "Oldest first ↑"}
                </button>
              </div>
              <div className="space-y-0.5">
                {filteredActivity.map(int => (
                  <div key={int.id} className="flex gap-3 py-3 border-b border-white/[0.04] last:border-0">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", interactionColor(int.type))}>
                      {interactionIcon(int.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase">{INTERACTION_TYPE_LABELS[int.type]}</span>
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
                        <span className="text-[11px] text-slate-500">{formatDate(int.date)}</span>
                        {int.duration && <span className="text-[11px] text-slate-600">{formatDuration(int.duration)}</span>}
                        {int.location && <span className="text-[11px] text-slate-600 flex items-center gap-1"><MapPin size={10} />{int.location}</span>}
                        {int.subject && <span className="text-[11px] text-slate-600 flex items-center gap-1"><Mail size={10} />{int.subject}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredActivity.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-slate-500">
                    <Activity size={32} className="mb-3 opacity-30" />
                    <p className="text-[13px]">No activity matching filter</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CALLS ── */}
          {activeTab === "calls" && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Total Calls", value: calls.length.toString() },
                  { label: "Total Talk Time", value: formatDuration(totalCallTime) || "0m" },
                  { label: "Inbound", value: calls.filter(c => c.direction === "inbound").length.toString() },
                  { label: "Outbound", value: calls.filter(c => c.direction === "outbound").length.toString() },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[20px] font-bold font-mono text-white">{s.value}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-0.5">
                {calls.sort((a, b) => b.date.localeCompare(a.date)).map(c => (
                  <div key={c.id} className="flex gap-3 py-3 border-b border-white/[0.04]">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      c.direction === "missed" ? "bg-red-500/10 text-red-400" :
                      c.direction === "inbound" ? "bg-blue-500/10 text-blue-400" :
                      "bg-green-500/10 text-green-400"
                    )}>
                      <Phone size={13} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase">{c.direction ?? "call"}</span>
                        {c.duration && <span className="text-[11px] text-slate-500">· {formatDuration(c.duration)}</span>}
                      </div>
                      <p className="text-[13px] text-white mt-0.5">{c.summary}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{formatDate(c.date)}</p>
                    </div>
                  </div>
                ))}
                {calls.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-slate-500">
                    <Phone size={32} className="mb-3 opacity-30" />
                    <p className="text-[13px]">No call history</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MESSAGES ── */}
          {activeTab === "messages" && (
            <div>
              <div className="space-y-0.5">
                {messages.sort((a, b) => b.date.localeCompare(a.date)).map(m => (
                  <div key={m.id} className="flex gap-3 py-3 border-b border-white/[0.04]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-cyan-500/10 text-cyan-400">
                      <MessageSquare size={13} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-white">{m.summary}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{formatDate(m.date)}</p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-slate-500">
                    <MessageSquare size={32} className="mb-3 opacity-30" />
                    <p className="text-[13px]">No message history</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── EMAIL ── */}
          {activeTab === "email" && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-white">{emails.length}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Total Emails</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-amber-400">{emails.filter(e => e.needsReply).length}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Needs Reply</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-white">{emails.filter(e => e.hasAttachment).length}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">With Attachments</p>
                </div>
              </div>
              <div className="space-y-0.5">
                {emails.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                  <div key={e.id} className={cn("flex gap-3 py-3 border-b border-white/[0.04]", e.needsReply && "bg-amber-500/[0.02]")}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-400">
                      <Mail size={13} />
                    </div>
                    <div className="flex-1">
                      {e.subject && <p className="text-[11px] text-slate-500 font-medium">{e.subject}</p>}
                      <p className="text-[13px] text-white mt-0.5">{e.summary}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-500">{formatDate(e.date)}</span>
                        {e.needsReply && <span className="text-[10px] text-amber-400 font-medium">⚡ Needs reply</span>}
                        {e.hasAttachment && <span className="text-[10px] text-slate-500">📎</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {emails.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-slate-500">
                    <Mail size={32} className="mb-3 opacity-30" />
                    <p className="text-[13px]">No email history</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PHOTOS ── */}
          {activeTab === "photos" && (
            <div className="flex flex-col items-center py-16 text-slate-500">
              <Camera size={40} className="mb-3 opacity-20" />
              <p className="text-[14px] text-white mb-1">Photos & Memories</p>
              <p className="text-[12px]">No photos yet. Photos with this person will appear here.</p>
            </div>
          )}

          {/* ── CALENDAR ── */}
          {activeTab === "calendar" && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-white">{meetings.length}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Total Meetings</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-white">{meetings.filter(m => m.recurring).length}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Recurring</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-white">{formatDuration(meetings.reduce((s, m) => s + (m.duration ?? 0), 0)) || "0m"}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Total Time</p>
                </div>
              </div>
              <div className="space-y-0.5">
                {meetings.sort((a, b) => b.date.localeCompare(a.date)).map(m => (
                  <div key={m.id} className="flex gap-3 py-3 border-b border-white/[0.04]">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-indigo-500/10 text-indigo-400">
                      <Calendar size={13} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-white">{m.summary}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] text-slate-500">{formatDate(m.date)}</span>
                        {m.duration && <span className="text-[11px] text-slate-600">{formatDuration(m.duration)}</span>}
                        {m.location && <span className="text-[11px] text-slate-600 flex items-center gap-1"><MapPin size={10} />{m.location}</span>}
                        {m.recurring && <span className="text-[10px] text-blue-400">🔁 Recurring</span>}
                      </div>
                      {m.attendees && m.attendees.length > 0 && (
                        <p className="text-[11px] text-slate-500 mt-1">With: {m.attendees.join(", ")}</p>
                      )}
                    </div>
                  </div>
                ))}
                {meetings.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-slate-500">
                    <Calendar size={32} className="mb-3 opacity-30" />
                    <p className="text-[13px]">No meeting history</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── WEEKLY ACTIVITY ── */}
          {activeTab === "weekly" && (
            <div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-6">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">52-Week Activity</p>
                <WeeklyHeatmap interactions={contact.interactions} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-white">{contact.interactions.length}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">All Time</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-white">
                    {contact.interactions.filter(i => (Date.now() - new Date(i.date).getTime()) / 86400000 <= 30).length}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Last 30 Days</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-white">
                    {contact.interactions.filter(i => (Date.now() - new Date(i.date).getTime()) / 86400000 <= 7).length}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Last 7 Days</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <p className="text-[20px] font-bold font-mono text-white">{new Set(contact.interactions.map(i => i.type)).size}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Channels Used</p>
                </div>
              </div>
            </div>
          )}

          {/* ── CONNECTIONS ── */}
          {activeTab === "connections" && (
            <div>
              {connectedContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {connectedContacts.map(cc => (
                    <Link key={cc.id} href={`/rolodex/${cc.id}`}
                      className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all group">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-[14px] font-bold shrink-0"
                        style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[cc.relationshipType]}12`, color: RELATIONSHIP_TYPE_COLORS[cc.relationshipType] }}>
                        {getInitials(cc)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-white group-hover:text-blue-300 transition-colors">{getFullName(cc)}</p>
                        <p className="text-[12px] text-slate-500">{cc.title ? `${cc.title} at ` : ""}{cc.company || RELATIONSHIP_TYPE_LABELS[cc.relationshipType]}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-1.5 py-0.5 rounded text-[10px]"
                            style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[cc.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[cc.relationshipType] }}>
                            {RELATIONSHIP_TYPE_LABELS[cc.relationshipType]}
                          </span>
                          {cc.city && <span className="text-[10px] text-slate-500">{cc.city}</span>}
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
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

          {/* ── FACT BOOK ── */}
          {activeTab === "factbook" && (
            <div>
              {contact.facts.length > 0 ? (
                <div className="space-y-6">
                  {Array.from(new Set(contact.facts.map(f => f.category))).map(cat => (
                    <div key={cat}>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-3">{cat}</p>
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04]">
                        {contact.facts.filter(f => f.category === cat).map(f => (
                          <div key={f.id} className="flex items-center justify-between px-4 py-3">
                            <span className="text-[12px] text-slate-400">{f.label}</span>
                            <span className="text-[13px] text-white font-medium text-right max-w-[60%]">{f.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-slate-500">
                  <BookUser size={32} className="mb-3 opacity-30" />
                  <p className="text-[13px]">No facts recorded yet</p>
                </div>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {activeTab === "notes" && (
            <div>
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={noteSearch} onChange={e => setNoteSearch(e.target.value)}
                    placeholder="Search notes..."
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/40" />
                </div>
              </div>
              <div className="space-y-3">
                {filteredNotes.map(note => (
                  <div key={note.id} className={cn("p-4 rounded-xl border",
                    note.pinned ? "bg-amber-500/[0.04] border-amber-500/[0.1]" : "bg-white/[0.02] border-white/[0.06]"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {note.pinned && <span className="text-[10px] text-amber-400 font-medium">📌 Pinned</span>}
                      {note.category && <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.05] text-slate-400">{note.category}</span>}
                    </div>
                    <p className="text-[13px] text-slate-300 leading-relaxed">{note.content}</p>
                    <p className="text-[11px] text-slate-600 mt-2">{formatDate(note.createdAt)}</p>
                  </div>
                ))}
                {filteredNotes.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-slate-500">
                    <StickyNote size={32} className="mb-3 opacity-30" />
                    <p className="text-[13px]">{noteSearch ? "No matching notes" : "No notes yet"}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── OPPORTUNITIES ── */}
          {activeTab === "opportunities" && (
            <div>
              {(contact.opportunities ?? []).length > 0 ? (
                <div className="space-y-3">
                  {contact.opportunities.map(opp => (
                    <div key={opp.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[14px] font-medium text-white">{opp.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium", oppStatusColors[opp.status])}>{opp.status}</span>
                            <span className="text-[10px] text-slate-500 uppercase">{opp.type}</span>
                          </div>
                        </div>
                        {opp.value && (
                          <span className="text-[16px] font-bold font-mono text-emerald-400">{opp.value}</span>
                        )}
                      </div>
                      {opp.notes && <p className="text-[12px] text-slate-400 mt-2">{opp.notes}</p>}
                      {opp.nextStep && (
                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/[0.06]">
                          <span className="text-[11px] text-blue-400">→ Next: {opp.nextStep}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-600 mt-2">Updated {timeAgo(opp.updatedAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-16 text-slate-500">
                  <Target size={32} className="mb-3 opacity-30" />
                  <p className="text-[13px]">No opportunities tracked</p>
                </div>
              )}
            </div>
          )}

          {/* ── AI BRIEFING ── */}
          {activeTab === "briefing" && (
            <div>
              {contact.aiBriefing ? (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl bg-blue-500/[0.04] border border-blue-500/[0.1]">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain size={16} className="text-blue-400" />
                      <span className="text-[13px] font-semibold text-blue-400">Pre-Meeting Briefing</span>
                    </div>
                    <p className="text-[14px] text-slate-300 leading-relaxed whitespace-pre-line">{contact.aiBriefing}</p>
                  </div>

                  {/* Open loops */}
                  {contact.aiInsights.filter(i => i.type === "open-loop" || i.actionable).length > 0 && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-3">⚡ Action Items & Open Loops</p>
                      <div className="space-y-2">
                        {contact.aiInsights.filter(i => i.actionable && !i.dismissed).map(insight => (
                          <div key={insight.id} className="flex items-start gap-2.5 py-1.5">
                            <Lightbulb size={13} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[12px] text-slate-300">{insight.content}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Confidence: {Math.round(insight.confidence * 100)}%</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick facts for the meeting */}
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
