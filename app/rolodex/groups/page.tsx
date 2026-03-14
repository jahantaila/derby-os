"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Layers, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { RELATIONSHIP_TYPE_COLORS, RELATIONSHIP_TYPE_LABELS } from "@/lib/rolodex-types";
import { SEED_CONTACTS } from "@/lib/rolodex-seed";

function getInitials(c: { firstName: string; lastName: string }) {
  return `${c.firstName?.[0] ?? ""}${c.lastName?.[0] ?? ""}`.toUpperCase() || "?";
}
function getFullName(c: { firstName: string; lastName: string }) {
  return `${c.firstName} ${c.lastName}`.trim() || "Unknown";
}

export default function GroupsPage() {
  const contacts = SEED_CONTACTS.filter(c => !c.archived);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const allGroups = useMemo(() => {
    const map = new Map<string, number>();
    contacts.forEach(c => (c.groups ?? []).forEach(g => map.set(g, (map.get(g) ?? 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [contacts]);

  const groupMembers = useMemo(() => {
    if (!selectedGroup) return [];
    return contacts.filter(c => (c.groups ?? []).includes(selectedGroup));
  }, [contacts, selectedGroup]);

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-6 py-3">
          <Link href="/rolodex" className="flex items-center gap-2 text-[13px] text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={15} /> Rolodex
          </Link>
          <ChevronRight size={12} className="text-slate-600" />
          <span className="text-[13px] text-white font-medium">Groups</span>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[20px] font-bold text-white">Groups</h1>
            <p className="text-[13px] text-slate-500 mt-1">{allGroups.length} groups · {contacts.length} people</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] bg-blue-600 hover:bg-blue-500 text-white transition-colors">
            <Plus size={14} /> New Group
          </button>
        </div>

        <div className="flex gap-6">
          {/* Group list */}
          <div className="w-[260px] shrink-0 space-y-1">
            {allGroups.map(([name, count]) => (
              <button key={name} onClick={() => setSelectedGroup(name)}
                className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                  selectedGroup === name ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                )}>
                <Layers size={15} className="shrink-0 text-blue-400/60" />
                <span className="flex-1 text-[13px]">{name}</span>
                <span className="text-[11px] text-slate-500">{count}</span>
              </button>
            ))}
            {allGroups.length === 0 && (
              <p className="text-[12px] text-slate-500 px-3 py-8 text-center">No groups yet</p>
            )}
          </div>

          {/* Group members */}
          <div className="flex-1">
            {selectedGroup ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[16px] font-semibold text-white">{selectedGroup}</h2>
                  <span className="text-[12px] text-slate-500">{groupMembers.length} members</span>
                </div>
                <div className="space-y-1">
                  {groupMembers.map(c => (
                    <Link key={c.id} href={`/rolodex/${c.id}`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-all group">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0"
                        style={{ backgroundColor: `${RELATIONSHIP_TYPE_COLORS[c.relationshipType]}15`, color: RELATIONSHIP_TYPE_COLORS[c.relationshipType] }}>
                        {getInitials(c)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white group-hover:text-blue-300 transition-colors">{getFullName(c)}</p>
                        <p className="text-[11px] text-slate-500">{c.company || RELATIONSHIP_TYPE_LABELS[c.relationshipType]}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Users size={40} className="mb-3 opacity-20" />
                <p className="text-[13px]">Select a group to view members</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
