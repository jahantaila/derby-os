"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Building2, ChevronDown, ExternalLink, Globe, Mail, MapPin,
  Phone, Search, Target, X, Instagram, Facebook,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SPOTHOPPER_LEADS, type SpotHopperLead } from "@/lib/spothopper-data";

const ReactEChartsCore = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function SpotHopperPage() {
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<SpotHopperLead | null>(null);

  const regions = useMemo(() => {
    const counts: Record<string, number> = {};
    SPOTHOPPER_LEADS.forEach(l => { counts[l.region] = (counts[l.region] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, []);

  const filtered = useMemo(() => {
    return SPOTHOPPER_LEADS.filter(l => {
      if (selectedRegion !== "all" && l.region !== selectedRegion) return false;
      if (search) {
        const q = search.toLowerCase();
        return l.restaurant_name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.cuisine.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, selectedRegion]);

  const stats = useMemo(() => ({
    total: SPOTHOPPER_LEADS.length,
    withPhone: SPOTHOPPER_LEADS.filter(l => l.phone).length,
    withEmail: SPOTHOPPER_LEADS.filter(l => l.email).length,
    cities: new Set(SPOTHOPPER_LEADS.map(l => l.city)).size,
  }), []);

  const chartOption = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", backgroundColor: "#1a1a2e", borderColor: "rgba(255,255,255,0.08)", textStyle: { color: "#e2e8f0", fontSize: 11 } },
    grid: { left: 100, right: 20, top: 8, bottom: 8 },
    xAxis: { type: "value", axisLabel: { color: "#475569", fontSize: 10 }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.04)" } } },
    yAxis: { type: "category", data: regions.map(r => r[0]), axisLabel: { color: "#e2e8f0", fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: "bar",
      data: regions.map(r => r[1]),
      barWidth: "60%",
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: { type: "linear", x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: "#EF4444" }, { offset: 1, color: "#F97316" }] }
      },
    }],
  };

  return (
    <div className="space-y-6 animate-enter">
      {/* Header */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Target size={20} className="text-red-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-red-400/70">Competitor Intelligence</p>
            <h1 className="text-[20px] font-bold text-white">SpotHopper Intel — Kentucky</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">Every SpotHopper restaurant in KY. Your outreach target list.</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Restaurants", value: stats.total, color: "text-red-400" },
          { label: "With Phone", value: `${stats.withPhone} (${Math.round(stats.withPhone/stats.total*100)}%)`, color: "text-emerald-400" },
          { label: "With Email", value: `${stats.withEmail} (${Math.round(stats.withEmail/stats.total*100)}%)`, color: "text-blue-400" },
          { label: "Cities Covered", value: stats.cities, color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="glass-panel p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</p>
            <p className={cn("text-[22px] font-bold font-mono mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="glass-panel p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">By Region</p>
          <div className="h-[250px]">
            <ReactEChartsCore option={chartOption} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2 glass-panel flex flex-col" style={{ maxHeight: "calc(100vh - 360px)" }}>
          {/* Search + Filter */}
          <div className="flex items-center gap-2 p-3 border-b border-white/[0.06]">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search restaurants, cities, cuisine..."
                className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-white placeholder:text-slate-500 outline-none focus:border-red-500/30" />
            </div>
            <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-white outline-none">
              <option value="all">All Regions ({SPOTHOPPER_LEADS.length})</option>
              {regions.map(([r, c]) => <option key={r} value={r}>{r} ({c})</option>)}
            </select>
          </div>
          <p className="px-4 py-1.5 text-[10px] text-slate-500">{filtered.length} restaurants</p>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#0a0a0f]">
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-2 text-slate-500 font-medium">Restaurant</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium hidden lg:table-cell">City</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium hidden md:table-cell">Phone</th>
                  <th className="text-left px-3 py-2 text-slate-500 font-medium hidden xl:table-cell">Email</th>
                  <th className="text-center px-3 py-2 text-slate-500 font-medium w-16">Links</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={i}
                    onClick={() => setSelectedLead(selectedLead?.restaurant_name === l.restaurant_name ? null : l)}
                    className={cn("border-b border-white/[0.03] cursor-pointer transition-colors",
                      selectedLead?.restaurant_name === l.restaurant_name ? "bg-red-500/[0.06]" : "hover:bg-white/[0.03]"
                    )}>
                    <td className="px-4 py-2.5">
                      <p className="text-white font-medium">{l.restaurant_name}</p>
                      {l.cuisine && <p className="text-[10px] text-slate-500">{l.cuisine}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-400 hidden lg:table-cell">{l.city}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      {l.phone ? <a href={`tel:${l.phone}`} className="text-slate-300 hover:text-white">{l.phone}</a> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 hidden xl:table-cell">
                      {l.email ? <a href={`mailto:${l.email}`} className="text-slate-300 hover:text-blue-400 truncate block max-w-[180px]">{l.email}</a> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {l.website && <a href={`https://${l.website}`} target="_blank" onClick={e => e.stopPropagation()} className="text-slate-500 hover:text-white"><Globe size={12} /></a>}
                        {l.facebook && <a href={l.facebook} target="_blank" onClick={e => e.stopPropagation()} className="text-slate-500 hover:text-blue-400"><Facebook size={12} /></a>}
                        {l.instagram && <a href={l.instagram} target="_blank" onClick={e => e.stopPropagation()} className="text-slate-500 hover:text-pink-400"><Instagram size={12} /></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Selected Lead Detail */}
      {selectedLead && (
        <div className="glass-panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-white">{selectedLead.restaurant_name}</h2>
              <div className="flex items-center gap-3 mt-1 text-[12px] text-slate-400">
                <span className="flex items-center gap-1"><MapPin size={11} /> {selectedLead.city}, {selectedLead.state}</span>
                {selectedLead.region && <span className="text-slate-500">Region: {selectedLead.region}</span>}
              </div>
            </div>
            <button onClick={() => setSelectedLead(null)} className="text-slate-500 hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Phone</p>
              <p className="text-[13px] text-white mt-0.5">{selectedLead.phone || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Email</p>
              <p className="text-[13px] text-white mt-0.5">{selectedLead.email || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Website</p>
              {selectedLead.website ? (
                <a href={`https://${selectedLead.website}`} target="_blank" className="text-[13px] text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5">{selectedLead.website} <ExternalLink size={10} /></a>
              ) : <p className="text-[13px] text-slate-500 mt-0.5">—</p>}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Cuisine</p>
              <p className="text-[13px] text-white mt-0.5">{selectedLead.cuisine || "—"}</p>
            </div>
          </div>
          {selectedLead.address && (
            <div className="mt-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Address</p>
              <p className="text-[13px] text-white mt-0.5">{selectedLead.address}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
