"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  BookUser, Briefcase, Calendar, ChevronDown, ChevronRight,
  Clock3, Filter, Globe, Heart, Mail, MapPin, MessageSquare,
  MoreHorizontal, Phone, Plus, Search, Sparkles, Star,
  StickyNote, Tag, TrendingUp, User, UserPlus, Users, X,
  ArrowUpDown, Grid3X3, List, Archive, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RolodexContact, type RelationshipType, type SortField, type SortDirection,
  type FilterState, type ViewMode,
  RELATIONSHIP_TYPE_LABELS, RELATIONSHIP_TYPE_COLORS, DEFAULT_FILTERS,
} from "@/lib/rolodex-types";
import { SEED_CONTACTS } from "@/lib/rolodex-seed";

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
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-blue-400";
  if (score >= 40) return "text-amber-400";
  return "text-slate-500";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-400/10";
  if (score >= 60) return "bg-blue-400/10";
  if (score >= 40) return "bg-amber-400/10";
  return "bg-slate-500/10";
}

// ─── Smart Groups ───
const SMART_GROUPS = [
  { id: "all", name: "All People", icon: Users, count: (cs: RolodexContact[]) => cs.length },
  { id: "recent", name: "Recently Active", icon: Clock3, count: (cs: RolodexContact[]) => cs.filter(c => { const d = c.lastContactedAt ? (Date.now() - new Date(c.lastContactedAt).getTime()) / 86400000 : 999; return d <= 7; }).length },
  { id: "vip", name: "VIP", icon: Star, count: (cs: RolodexContact[]) => cs.filter(c => c.tags.includes("vip") || (c.importanceScore ?? 0) >= 90).length },
  { id: "follow-up", name: "Follow Up Soon", icon: Calendar, count: (cs: RolodexContact[]) => cs.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) <= new Date(Date.now() + 7 * 86400000)).length },
  { id: "stale", name: "Going Cold", icon: TrendingUp, count: (cs: RolodexContact[]) => cs.filter(c => { const d = c.lastContactedAt ? (Date.now() - new Date(c.lastContactedAt).getTime()) / 86400000 : 999; return d > 30; }).length },
];

const CATEGORY_GROUPS = [
  { id: "client", name: "Clients" },
  { id: "prospect", name: "Prospects" },
  { id: "friend", name: "Friends" },
  { id: "family", name: "Family" },
  { id: "team", name: "Team" },
  { id: "investor", name: "Investors" },
  { id: "mentor", name: "Mentors" },
  { id: "partner", name: "Partners" },
  { id: "school", name: "School" },
  { id: "industry", name: "Industry" },
];

// ─── Main Page ───
export default function RolodexPage() {
  const [contacts] = useState<RolodexContact[]>(SEED_CONTACTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("lastContacted");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [activeGroup, setActiveGroup] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeRelTypes, setActiveRelTypes] = useState<RelationshipType[]>([]);
  const [drawerTab, setDrawerTab] = useState<"overview" | "activity" | "notes" | "facts">("overview");

  const selected = useMemo(() => contacts.find(c => c.id === selectedId) ?? null, [contacts, selectedId]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = contacts.filter(c => !c.archived);

    // Smart group filter
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
      // Category group
      result = result.filter(c => c.relationshipType === activeGroup);
    }

    // Relationship type filter
    if (activeRelTypes.length > 0) {
      result = result.filter(c => activeRelTypes.includes(c.relationshipType));
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        getFullName(c).toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort
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
  }, [contacts, search, sortField, sortDir, activeGroup, activeRelTypes]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  return (
    <div className="flex h-[calc(100vh-1rem)] gap-0">
      {/* ─── Left Sidebar ─── */}
      <div className="hidden lg:flex w-[220px] flex-col border-r border-white/[0.06] bg-white/[0.02] shrink-0">
        <div className="p-4 pb-2">
          <h2 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider">Rolodex</h2>
        </div>

        {/* Smart Groups */}
        <div className="px-2 py-1">
          <p className="px-2 py-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Views</p>
          {SMART_GROUPS.map(g => {
            const Icon = g.icon;
            const count = g.count(contacts.filter(c => !c.archived));
            return (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-all",
                  activeGroup === g.id
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                )}
              >
                <Icon size={14} className="shrink-0 opacity-60" />
                <span className="flex-1 text-left">{g.name}</span>
                <span className="text-[11px] text-slate-500">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Category Groups */}
        <div className="px-2 py-1 mt-2">
          <p className="px-2 py-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Categories</p>
          {CATEGORY_GROUPS.map(g => {
            const count = contacts.filter(c => !c.archived && c.relationshipType === g.id).length;
            if (count === 0) return null;
            return (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-all",
                  activeGroup === g.id
                    ? "bg-white/[0.08] text-white"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                )}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[g.id as RelationshipType] ?? "#64748B" }}
                />
                <span className="flex-1 text-left">{g.name}</span>
                <span className="text-[11px] text-slate-500">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Tags (dynamic) */}
        <div className="px-2 py-1 mt-2">
          <p className="px-2 py-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tags</p>
          {Array.from(new Set(contacts.flatMap(c => c.tags))).sort().slice(0, 10).map(tag => (
            <button
              key={tag}
              onClick={() => {
                setSearch(tag);
                setActiveGroup("all");
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1 rounded-lg text-[12px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all"
            >
              <Hash size={11} className="opacity-40" />
              <span>{tag}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06]">
          <div className="flex-1 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search people, companies, tags..."
                className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[13px] text-white placeholder:text-slate-500 outline-none focus:border-blue-500/40 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] border transition-all",
                showFilters
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white"
              )}
            >
              <Filter size={13} />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex bg-white/[0.04] rounded-lg border border-white/[0.08] p-0.5">
              <button
                onClick={() => setViewMode("table")}
                className={cn("p-1.5 rounded-md transition-all", viewMode === "table" ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-white")}
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={cn("p-1.5 rounded-md transition-all", viewMode === "card" ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-white")}
              >
                <Grid3X3 size={14} />
              </button>
            </div>

            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] bg-blue-600 hover:bg-blue-500 text-white transition-colors ml-2">
              <Plus size={14} />
              <span className="hidden sm:inline">Add Person</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-white/[0.06] bg-white/[0.01]">
            {CATEGORY_GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => {
                  setActiveRelTypes(prev =>
                    prev.includes(g.id as RelationshipType)
                      ? prev.filter(t => t !== g.id)
                      : [...prev, g.id as RelationshipType]
                  );
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] border transition-all",
                  activeRelTypes.includes(g.id as RelationshipType)
                    ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                    : "border-white/[0.08] text-slate-500 hover:text-slate-300"
                )}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: RELATIONSHIP_TYPE_COLORS[g.id as RelationshipType] }} />
                {g.name}
              </button>
            ))}
            {activeRelTypes.length > 0 && (
              <button onClick={() => setActiveRelTypes([])} className="text-[12px] text-slate-500 hover:text-white ml-1">
                Clear
              </button>
            )}
          </div>
        )}

        {/* Count bar */}
        <div className="flex items-center justify-between px-5 py-2 text-[12px] text-slate-500">
          <span>{filtered.length} people</span>
          <div className="flex items-center gap-3">
            {(["name", "lastContacted", "company", "relationshipScore"] as SortField[]).map(f => (
              <button
                key={f}
                onClick={() => toggleSort(f)}
                className={cn(
                  "flex items-center gap-1 transition-colors",
                  sortField === f ? "text-white" : "hover:text-slate-300"
                )}
              >
                {f === "lastContacted" ? "Last Active" : f === "relationshipScore" ? "Score" : f.charAt(0).toUpperCase() + f.slice(1)}
                {sortField === f && <ArrowUpDown size={10} />}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* ─── People List ─── */}
          <div className={cn("flex-1 overflow-y-auto", selected ? "hidden md:block" : "")}>
            {viewMode === "table" ? (
              <div className="divide-y divide-white/[0.04]">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedId(c.id); setDrawerTab("overview"); }}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3 text-left transition-all group",
                      selectedId === c.id
                        ? "bg-blue-500/[0.06]"
                        : "hover:bg-white/[0.03]"
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {c.avatar ? (
                        <img src={c.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold"
                          style={{
                            backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`,
                            color: RELATIONSHIP_TYPE_COLORS[c.relationshipType],
                          }}
                        >
                          {getInitials(c)}
                        </div>
                      )}
                      {c.nextFollowUp && new Date(c.nextFollowUp) <= new Date() && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-[#0a0a0f]" />
                      )}
                    </div>

                    {/* Name + Company */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-white truncate">{getFullName(c)}</span>
                        {c.tags.includes("vip") && <Star size={11} className="text-amber-400 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.company && (
                          <span className="text-[12px] text-slate-500 truncate">{c.company}</span>
                        )}
                        {c.company && c.title && <span className="text-slate-600">·</span>}
                        {c.title && (
                          <span className="text-[12px] text-slate-600 truncate">{c.title}</span>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="hidden xl:flex items-center gap-1 shrink-0">
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`,
                          color: RELATIONSHIP_TYPE_COLORS[c.relationshipType],
                        }}
                      >
                        {RELATIONSHIP_TYPE_LABELS[c.relationshipType]}
                      </span>
                    </div>

                    {/* City */}
                    <div className="hidden lg:flex items-center gap-1 w-28 shrink-0">
                      {c.city && (
                        <>
                          <MapPin size={11} className="text-slate-600 shrink-0" />
                          <span className="text-[12px] text-slate-500 truncate">{c.city}</span>
                        </>
                      )}
                    </div>

                    {/* Score */}
                    <div className="hidden md:flex items-center gap-1.5 w-16 shrink-0 justify-end">
                      <div className={cn("px-2 py-0.5 rounded text-[11px] font-mono font-medium", scoreBg(c.relationshipScore), scoreColor(c.relationshipScore))}>
                        {c.relationshipScore}
                      </div>
                    </div>

                    {/* Last active */}
                    <div className="w-20 shrink-0 text-right">
                      <span className="text-[12px] text-slate-500">{timeAgo(c.lastContactedAt)}</span>
                    </div>

                    {/* Chevron */}
                    <ChevronRight size={14} className="text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
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
              /* Card View */
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedId(c.id); setDrawerTab("overview"); }}
                    className={cn(
                      "flex flex-col p-4 rounded-xl border text-left transition-all",
                      selectedId === c.id
                        ? "bg-blue-500/[0.06] border-blue-500/20"
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0"
                        style={{
                          backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`,
                          color: RELATIONSHIP_TYPE_COLORS[c.relationshipType],
                        }}
                      >
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
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`,
                          color: RELATIONSHIP_TYPE_COLORS[c.relationshipType],
                        }}
                      >
                        {RELATIONSHIP_TYPE_LABELS[c.relationshipType]}
                      </span>
                      {c.city && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin size={10} /> {c.city}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/[0.06]">
                      <span className="text-[11px] text-slate-500">{timeAgo(c.lastContactedAt)}</span>
                      <div className="flex gap-1.5">
                        {c.phone && <Phone size={11} className="text-slate-600" />}
                        {c.email && <Mail size={11} className="text-slate-600" />}
                        {c.notes.length > 0 && <StickyNote size={11} className="text-slate-600" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ─── Detail Drawer ─── */}
          {selected && (
            <div className="w-full md:w-[380px] lg:w-[420px] border-l border-white/[0.06] bg-white/[0.015] overflow-y-auto shrink-0">
              {/* Close button (mobile) */}
              <div className="md:hidden flex justify-end p-2">
                <button onClick={() => setSelectedId(null)} className="p-2 text-slate-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Profile header */}
              <div className="px-5 pt-4 pb-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                    style={{
                      backgroundColor: `${RELATIONSHIP_TYPE_COLORS[selected.relationshipType]}15`,
                      color: RELATIONSHIP_TYPE_COLORS[selected.relationshipType],
                    }}
                  >
                    {getInitials(selected)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-semibold text-white">{getFullName(selected)}</h3>
                    {selected.company && (
                      <p className="text-[13px] text-slate-400 mt-0.5">
                        {selected.title ? `${selected.title} at ` : ""}{selected.company}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          backgroundColor: `${RELATIONSHIP_TYPE_COLORS[selected.relationshipType]}15`,
                          color: RELATIONSHIP_TYPE_COLORS[selected.relationshipType],
                        }}
                      >
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

                {/* Contact actions */}
                <div className="flex items-center gap-2 mt-4">
                  {selected.phone && (
                    <a href={`tel:${selected.phone}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[12px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all">
                      <Phone size={12} /> Call
                    </a>
                  )}
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[12px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all">
                      <Mail size={12} /> Email
                    </a>
                  )}
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[12px] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-all">
                    <StickyNote size={12} /> Note
                  </button>
                </div>

                {/* Score + Last contact */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.06]">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Score</p>
                    <p className={cn("text-[18px] font-bold font-mono", scoreColor(selected.relationshipScore))}>
                      {selected.relationshipScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Last Contact</p>
                    <p className="text-[14px] text-white">{timeAgo(selected.lastContactedAt)}</p>
                  </div>
                  {selected.nextFollowUp && (
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Follow Up</p>
                      <p className={cn("text-[14px]", new Date(selected.nextFollowUp) <= new Date() ? "text-amber-400" : "text-white")}>
                        {timeAgo(selected.nextFollowUp)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/[0.06] px-5">
                {(["overview", "activity", "notes", "facts"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDrawerTab(tab)}
                    className={cn(
                      "px-3 py-2.5 text-[12px] font-medium border-b-2 transition-all capitalize",
                      drawerTab === tab
                        ? "border-blue-500 text-white"
                        : "border-transparent text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="px-5 py-4">
                {drawerTab === "overview" && (
                  <div className="space-y-4">
                    {/* AI Summary */}
                    {selected.aiSummary && (
                      <div className="p-3 rounded-lg bg-blue-500/[0.06] border border-blue-500/[0.12]">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles size={12} className="text-blue-400" />
                          <span className="text-[11px] font-medium text-blue-400">AI Summary</span>
                        </div>
                        <p className="text-[12px] text-slate-300 leading-relaxed">{selected.aiSummary}</p>
                      </div>
                    )}

                    {/* Contact info */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Contact</p>
                      {selected.email && (
                        <div className="flex items-center gap-2.5">
                          <Mail size={12} className="text-slate-600" />
                          <span className="text-[12px] text-slate-300">{selected.email}</span>
                        </div>
                      )}
                      {selected.phone && (
                        <div className="flex items-center gap-2.5">
                          <Phone size={12} className="text-slate-600" />
                          <span className="text-[12px] text-slate-300">{selected.phone}</span>
                        </div>
                      )}
                      {selected.website && (
                        <div className="flex items-center gap-2.5">
                          <Globe size={12} className="text-slate-600" />
                          <span className="text-[12px] text-slate-300">{selected.website}</span>
                        </div>
                      )}
                    </div>

                    {/* Personal */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Personal</p>
                      {selected.birthday && (
                        <div className="flex items-center gap-2.5">
                          <Calendar size={12} className="text-slate-600" />
                          <span className="text-[12px] text-slate-300">Birthday: {selected.birthday}</span>
                        </div>
                      )}
                      {selected.spouse && (
                        <div className="flex items-center gap-2.5">
                          <Heart size={12} className="text-slate-600" />
                          <span className="text-[12px] text-slate-300">Spouse: {selected.spouse}</span>
                        </div>
                      )}
                      {selected.college && (
                        <div className="flex items-center gap-2.5">
                          <BookUser size={12} className="text-slate-600" />
                          <span className="text-[12px] text-slate-300">{selected.college}</span>
                        </div>
                      )}
                      {selected.interests && (
                        <div className="flex items-center gap-2.5">
                          <Star size={12} className="text-slate-600" />
                          <span className="text-[12px] text-slate-300">{selected.interests}</span>
                        </div>
                      )}
                    </div>

                    {/* How we met */}
                    {selected.howWeMet && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">How We Met</p>
                        <p className="text-[12px] text-slate-300">{selected.howWeMet}</p>
                        {selected.introducedBy && (
                          <p className="text-[11px] text-slate-500">Introduced by {selected.introducedBy}</p>
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Pinned notes */}
                    {selected.notes.filter(n => n.pinned).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">📌 Pinned</p>
                        {selected.notes.filter(n => n.pinned).map(note => (
                          <div key={note.id} className="p-2.5 rounded-lg bg-amber-500/[0.05] border border-amber-500/[0.1]">
                            <p className="text-[12px] text-slate-300 leading-relaxed">{note.content}</p>
                            <p className="text-[10px] text-slate-600 mt-1.5">{timeAgo(note.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {drawerTab === "activity" && (
                  <div className="space-y-1">
                    {selected.interactions.length === 0 ? (
                      <p className="text-[12px] text-slate-500 py-8 text-center">No activity yet</p>
                    ) : (
                      selected.interactions
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map(int => (
                          <div key={int.id} className="flex gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                            <div className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px]",
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
                    {selected.notes.length === 0 ? (
                      <p className="text-[12px] text-slate-500 py-8 text-center">No notes yet</p>
                    ) : (
                      selected.notes
                        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                        .map(note => (
                          <div key={note.id} className={cn(
                            "p-3 rounded-lg border",
                            note.pinned
                              ? "bg-amber-500/[0.05] border-amber-500/[0.1]"
                              : "bg-white/[0.02] border-white/[0.06]"
                          )}>
                            {note.pinned && <span className="text-[10px] text-amber-400 font-medium">📌 Pinned</span>}
                            <p className="text-[12px] text-slate-300 leading-relaxed mt-1">{note.content}</p>
                            <p className="text-[10px] text-slate-600 mt-2">{timeAgo(note.createdAt)}</p>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {drawerTab === "facts" && (
                  <div className="space-y-3">
                    {(!selected.facts || selected.facts.length === 0) ? (
                      <p className="text-[12px] text-slate-500 py-8 text-center">No facts recorded yet</p>
                    ) : (
                      selected.facts.map(fact => (
                        <div key={fact.id} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                          <span className="text-[10px] text-slate-500 uppercase tracking-wider w-24 shrink-0 pt-0.5">{fact.label}</span>
                          <span className="text-[12px] text-slate-300">{fact.value}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
