"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, ChevronRight, Clock3, Star, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RELATIONSHIP_TYPE_COLORS, RELATIONSHIP_TYPE_LABELS, type RolodexContact } from "@/lib/rolodex-types";
import { SEED_CONTACTS } from "@/lib/rolodex-seed";

function getInitials(c: RolodexContact) { return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?"; }
function getFullName(c: RolodexContact) { return `${c.firstName} ${c.lastName}`.trim() || "Unknown"; }
function timeAgo(d?: string) { if (!d) return "Never"; const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return days < 0 ? `in ${Math.abs(days)}d` : days === 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? `${days}d ago` : days < 30 ? `${Math.floor(days / 7)}w ago` : `${Math.floor(days / 30)}mo ago`; }

export default function RemindersPage() {
  const contacts = SEED_CONTACTS.filter(c => !c.archived);
  const now = Date.now();

  const sections = useMemo(() => {
    const overdue = contacts.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) < new Date());
    const upcoming = contacts.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) >= new Date() && new Date(c.nextFollowUp) <= new Date(now + 7 * 86400000));
    const staleVips = contacts.filter(c => {
      const d = c.lastContactedAt ? (now - new Date(c.lastContactedAt).getTime()) / 86400000 : 999;
      return d > 14 && (c.tags.includes("vip") || (c.importanceScore ?? 0) >= 80);
    });
    const birthdays = contacts.filter(c => {
      if (!c.birthday) return false;
      const bd = new Date(c.birthday);
      const thisYear = new Date(new Date().getFullYear(), bd.getMonth(), bd.getDate());
      const diff = (thisYear.getTime() - now) / 86400000;
      return diff >= 0 && diff <= 30;
    });
    const goingCold = contacts.filter(c => {
      const d = c.lastContactedAt ? (now - new Date(c.lastContactedAt).getTime()) / 86400000 : 999;
      return d > 30;
    });
    return { overdue, upcoming, staleVips, birthdays, goingCold };
  }, [contacts, now]);

  function PersonRow({ c, subtitle }: { c: RolodexContact; subtitle: string }) {
    return (
      <Link href={`/rolodex/${c.id}`} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-all group">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
          style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
          {getInitials(c)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-white group-hover:text-blue-300 transition-colors">{getFullName(c)}</p>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <ChevronRight size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <Link href="/rolodex" className="flex items-center gap-2 text-[13px] text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={15} /> Rolodex
          </Link>
          <ChevronRight size={12} className="text-slate-600" />
          <span className="text-[13px] text-white font-medium">Reminders</span>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-6 space-y-8">
        <h1 className="text-[20px] font-bold text-white">Reminders & Follow-ups</h1>

        {/* Overdue */}
        {sections.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-red-400" />
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Overdue ({sections.overdue.length})</p>
            </div>
            <div className="rounded-xl bg-red-500/[0.03] border border-red-500/[0.1] divide-y divide-white/[0.04]">
              {sections.overdue.map(c => <PersonRow key={c.id} c={c} subtitle={`Follow up was ${timeAgo(c.nextFollowUp)}`} />)}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {sections.upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-amber-400" />
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">This Week ({sections.upcoming.length})</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04]">
              {sections.upcoming.map(c => <PersonRow key={c.id} c={c} subtitle={`Follow up ${timeAgo(c.nextFollowUp)}`} />)}
            </div>
          </div>
        )}

        {/* Stale VIPs */}
        {sections.staleVips.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star size={14} className="text-amber-400" />
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Stale VIPs ({sections.staleVips.length})</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04]">
              {sections.staleVips.map(c => <PersonRow key={c.id} c={c} subtitle={`Last contact: ${timeAgo(c.lastContactedAt)}`} />)}
            </div>
          </div>
        )}

        {/* Birthdays */}
        {sections.birthdays.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[14px]">🎂</span>
              <p className="text-[11px] font-semibold text-pink-400 uppercase tracking-wider">Upcoming Birthdays ({sections.birthdays.length})</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04]">
              {sections.birthdays.map(c => <PersonRow key={c.id} c={c} subtitle={c.birthday ? new Date(c.birthday).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : ""} />)}
            </div>
          </div>
        )}

        {/* Going cold */}
        {sections.goingCold.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock3 size={14} className="text-slate-400" />
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Going Cold ({sections.goingCold.length})</p>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] divide-y divide-white/[0.04]">
              {sections.goingCold.map(c => <PersonRow key={c.id} c={c} subtitle={`Last contact: ${timeAgo(c.lastContactedAt)}`} />)}
            </div>
          </div>
        )}

        {sections.overdue.length === 0 && sections.upcoming.length === 0 && sections.staleVips.length === 0 && sections.goingCold.length === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-500">
            <Calendar size={40} className="mb-3 opacity-20" />
            <p className="text-[14px] text-white mb-1">All clear</p>
            <p className="text-[12px]">No pending reminders or follow-ups</p>
          </div>
        )}
      </div>
    </div>
  );
}
