"use client";

import { useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, ChevronRight, TrendingUp, Users, Clock3, Star, Calendar, Phone, Mail, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { RELATIONSHIP_TYPE_COLORS, RELATIONSHIP_TYPE_LABELS, type RolodexContact } from "@/lib/rolodex-types";
import { SEED_CONTACTS } from "@/lib/rolodex-seed";

const ReactEChartsCore = dynamic(() => import("echarts-for-react"), { ssr: false });

function getInitials(c: RolodexContact) { return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?"; }
function getFullName(c: RolodexContact) { return `${c.firstName} ${c.lastName}`.trim() || "Unknown"; }
function timeAgo(d?: string) { if (!d) return "Never"; const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return days === 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? `${days}d ago` : days < 30 ? `${Math.floor(days / 7)}w ago` : `${Math.floor(days / 30)}mo ago`; }

export default function AnalyticsPage() {
  const contacts = SEED_CONTACTS.filter(c => !c.archived);
  const now = Date.now();

  const stats = useMemo(() => {
    const totalInteractions = contacts.reduce((s, c) => s + c.interactions.length, 0);
    const last30 = contacts.reduce((s, c) => s + c.interactions.filter(i => (now - new Date(i.date).getTime()) / 86400000 <= 30).length, 0);
    const goingCold = contacts.filter(c => { const d = c.lastContactedAt ? (now - new Date(c.lastContactedAt).getTime()) / 86400000 : 999; return d > 30; });
    const followUpSoon = contacts.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) <= new Date(now + 7 * 86400000));
    const strongest = [...contacts].sort((a, b) => b.relationshipScore - a.relationshipScore).slice(0, 5);
    const mostActive = [...contacts].sort((a, b) => b.interactions.length - a.interactions.length).slice(0, 5);

    // Channel breakdown
    const channels: Record<string, number> = {};
    contacts.forEach(c => c.interactions.forEach(i => { channels[i.type] = (channels[i.type] ?? 0) + 1; }));

    // Type breakdown
    const types: Record<string, number> = {};
    contacts.forEach(c => { types[c.relationshipType] = (types[c.relationshipType] ?? 0) + 1; });

    return { totalInteractions, last30, goingCold, followUpSoon, strongest, mostActive, channels, types };
  }, [contacts, now]);

  const channelChart = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    series: [{
      type: "pie", radius: ["45%", "70%"],
      data: Object.entries(stats.channels).map(([k, v]) => ({ name: k, value: v })),
      label: { color: "#94A3B8", fontSize: 11 },
      itemStyle: { borderColor: "#0a0a0f", borderWidth: 2 },
    }],
  };

  const typeChart = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item" },
    series: [{
      type: "pie", radius: ["45%", "70%"],
      data: Object.entries(stats.types).map(([k, v]) => ({
        name: RELATIONSHIP_TYPE_LABELS[k as keyof typeof RELATIONSHIP_TYPE_LABELS] ?? k,
        value: v,
        itemStyle: { color: RELATIONSHIP_TYPE_COLORS[k as keyof typeof RELATIONSHIP_TYPE_COLORS] ?? "#64748B" },
      })),
      label: { color: "#94A3B8", fontSize: 11 },
      itemStyle: { borderColor: "#0a0a0f", borderWidth: 2 },
    }],
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <Link href="/rolodex" className="flex items-center gap-2 text-[13px] text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={15} /> Rolodex
          </Link>
          <ChevronRight size={12} className="text-slate-600" />
          <span className="text-[13px] text-white font-medium">Analytics</span>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-6">
        <h1 className="text-[20px] font-bold text-white mb-6">Relationship Analytics</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total People", value: contacts.length, color: "text-white" },
            { label: "Total Interactions", value: stats.totalInteractions, color: "text-white" },
            { label: "Last 30 Days", value: stats.last30, color: "text-blue-400" },
            { label: "Follow Up Soon", value: stats.followUpSoon.length, color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className={cn("text-[24px] font-bold font-mono", s.color)}>{s.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Channel breakdown */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Communication Channels</p>
            <div className="h-[200px]">
              <ReactEChartsCore option={channelChart} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
            </div>
          </div>

          {/* Type breakdown */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Relationship Types</p>
            <div className="h-[200px]">
              <ReactEChartsCore option={typeChart} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strongest */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Strongest Relationships</p>
            <div className="space-y-2">
              {stats.strongest.map(c => (
                <Link key={c.id} href={`/rolodex/${c.id}`} className="flex items-center gap-3 py-2 group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                    style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                    {getInitials(c)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-white group-hover:text-blue-300">{getFullName(c)}</p>
                    <p className="text-[10px] text-slate-500">{c.company || RELATIONSHIP_TYPE_LABELS[c.relationshipType]}</p>
                  </div>
                  <span className="text-[13px] font-mono font-bold text-emerald-400">{c.relationshipScore}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Most active */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Most Active</p>
            <div className="space-y-2">
              {stats.mostActive.map(c => (
                <Link key={c.id} href={`/rolodex/${c.id}`} className="flex items-center gap-3 py-2 group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                    style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                    {getInitials(c)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] text-white group-hover:text-blue-300">{getFullName(c)}</p>
                    <p className="text-[10px] text-slate-500">{timeAgo(c.lastContactedAt)}</p>
                  </div>
                  <span className="text-[12px] text-slate-300 font-mono">{c.interactions.length} events</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Going cold */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-3">⚠️ Going Cold</p>
            {stats.goingCold.length > 0 ? (
              <div className="space-y-2">
                {stats.goingCold.map(c => (
                  <Link key={c.id} href={`/rolodex/${c.id}`} className="flex items-center gap-3 py-2 group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                      style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                      {getInitials(c)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] text-white group-hover:text-blue-300">{getFullName(c)}</p>
                      <p className="text-[10px] text-slate-500">Last: {timeAgo(c.lastContactedAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-slate-500">All relationships are active 🎉</p>
            )}
          </div>

          {/* Follow up soon */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-3">📅 Follow Up Soon</p>
            {stats.followUpSoon.length > 0 ? (
              <div className="space-y-2">
                {stats.followUpSoon.map(c => (
                  <Link key={c.id} href={`/rolodex/${c.id}`} className="flex items-center gap-3 py-2 group">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                      style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                      {getInitials(c)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] text-white group-hover:text-blue-300">{getFullName(c)}</p>
                      <p className="text-[10px] text-amber-400">Follow up {timeAgo(c.nextFollowUp)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-slate-500">No pending follow-ups</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
