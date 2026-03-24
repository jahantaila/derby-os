"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ExternalLink, Facebook, Globe, Instagram, MapPin, Search, Target, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SPOTHOPPER_LEADS, type SpotHopperLead } from "@/lib/spothopper-data";
import { PARTNER_LEADS, type PartnerLead } from "@/lib/partners-data";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type IntelTab = "spothopper" | "partners";
type SpotGrouping = "region" | "city";
type SpotLeadView = SpotHopperLead & { owner_name: string };

type CityCoordinate = {
  aliases?: string[];
  lat: number;
  lng: number;
};

const TAB_OPTIONS: { id: IntelTab; label: string }[] = [
  { id: "spothopper", label: "SpotHopper" },
  { id: "partners", label: "Partners" },
];

const MAP_BOUNDS = {
  west: -89.9,
  east: -81.5,
  south: 35.8,
  north: 39.7,
};

const MAP_IFRAME_SRC =
  "https://www.openstreetmap.org/export/embed.html?bbox=-89.9%2C35.8%2C-81.5%2C39.7&layer=mapnik";

const CITY_COORDINATES: Record<string, CityCoordinate> = {
  Albany: { lat: 36.69, lng: -85.14 },
  Alexandria: { aliases: ["Alexandria ky."], lat: 38.96, lng: -84.39 },
  Ashland: { lat: 38.48, lng: -82.64 },
  Berea: { lat: 37.57, lng: -84.29 },
  Boonesboro: { lat: 37.94, lng: -84.27 },
  BowlingGreen: { aliases: ["Bowling Green"], lat: 36.99, lng: -86.44 },
  Brandenburg: { lat: 37.99, lng: -86.17 },
  Campbellsville: { lat: 37.34, lng: -85.34 },
  CentralKY: { aliases: ["Central KY"], lat: 37.84, lng: -84.27 },
  ChevyChase: { aliases: ["Chevy Chase"], lat: 38.03, lng: -84.48 },
  Corbin: { lat: 36.95, lng: -84.1 },
  Covington: { lat: 39.08, lng: -84.51 },
  CrescentSprings: { aliases: ["Crescent Springs"], lat: 39.05, lng: -84.57 },
  Crestwood: { lat: 38.33, lng: -85.47 },
  Danville: { aliases: ["Danville", "Downtown Danville"], lat: 37.65, lng: -84.77 },
  DistilleryDistrict: { aliases: ["Distillery District"], lat: 38.04, lng: -84.52 },
  DowntownLexington: { aliases: ["Downtown", "Downtown Lexington", "Close to downtown", "NoLi", "North Side", "suite 140"], lat: 38.05, lng: -84.5 },
  DowntownLouisville: { aliases: ["Downtown Louisville", "Historic Downtown Louisville", "Old Louisville", "NuLu", "Nulu", "Portland", "Whiskey Row / Bourbon trail"], lat: 38.25, lng: -85.76 },
  EasternKY: { aliases: ["Eastern KY", "The Village", "harlan heights"], lat: 37.08, lng: -82.92 },
  Edgewood: { lat: 39, lng: -84.58 },
  Elizabethtown: { lat: 37.69, lng: -85.86 },
  Erlanger: { lat: 39.02, lng: -84.6 },
  Fairdale: { lat: 38.1, lng: -85.75 },
  Florence: { lat: 38.99, lng: -84.63 },
  Frankfort: { lat: 38.2, lng: -84.87 },
  Franklin: { lat: 36.72, lng: -86.58 },
  FrenchQuarter: { aliases: ["French Quarter"], lat: 39.09, lng: -84.5 },
  Georgetown: { lat: 38.21, lng: -84.56 },
  Hamburg: { lat: 38.02, lng: -84.42 },
  Highlands: { lat: 38.23, lng: -85.71 },
  Jeffersonville: { lat: 38.28, lng: -85.74 },
  LaGrange: { aliases: ["La Grange"], lat: 38.41, lng: -85.38 },
  Lawrenceburg: { lat: 38.04, lng: -84.9 },
  Lebanon: { lat: 37.57, lng: -85.25 },
  Lexington: { aliases: ["Lexington", "Must-Try Bar in Lexington", "South Side / Nicholasville Road", "Tates Creek"], lat: 38.04, lng: -84.5 },
  London: { lat: 37.13, lng: -84.08 },
  Louisville: { lat: 38.25, lng: -85.76 },
  Middlesboro: { lat: 36.61, lng: -83.72 },
  Middletown: { lat: 38.24, lng: -85.54 },
  MountWashington: { aliases: ["Mount Washington"], lat: 38.05, lng: -85.55 },
  Murray: { aliases: ["Murray", "Murray Hill /Gramercy Park /Kips Bay / Flat Iron"], lat: 36.61, lng: -88.31 },
  NewAlbany: { aliases: ["New Albany"], lat: 38.29, lng: -85.82 },
  Newport: { lat: 39.09, lng: -84.5 },
  Nicholasville: { lat: 37.88, lng: -84.57 },
  Owensboro: { lat: 37.77, lng: -87.11 },
  Paris: { lat: 38.21, lng: -84.25 },
  Prestonsburg: { lat: 37.67, lng: -82.77 },
  Prospect: { lat: 38.37, lng: -85.61 },
  Radcliff: { lat: 37.84, lng: -85.95 },
  Richmond: { lat: 37.75, lng: -84.29 },
  Russell: { lat: 38.52, lng: -82.7 },
  Sellersburg: { lat: 38.4, lng: -85.75 },
  Shelbyville: { lat: 38.21, lng: -85.22 },
  Speedway: { lat: 39.8, lng: -86.25 },
  StMatthews: { aliases: ["St. Matthews"], lat: 38.25, lng: -85.65 },
  TaylorMill: { aliases: ["Taylor Mill"], lat: 39.02, lng: -84.5 },
  Versailles: { lat: 38.05, lng: -84.73 },
  Williamsburg: { lat: 36.74, lng: -84.16 },
  Winchester: { lat: 37.99, lng: -84.18 },
};

function getCoordinateForCity(city: string) {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalized = normalize(city);
  for (const [key, entry] of Object.entries(CITY_COORDINATES)) {
    const names = [key, ...(entry.aliases ?? [])];
    if (names.some((name) => normalize(name) === normalized)) return entry;
  }
  return undefined;
}

function projectToMap(lat: number, lng: number) {
  const x = ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100;
  const y = ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100;
  return { left: `${Math.min(96, Math.max(4, x))}%`, top: `${Math.min(93, Math.max(7, y))}%` };
}

function buildBarOption(items: [string, number][], palette: [string, string]) {
  return {
    backgroundColor: "transparent",
    animationDuration: 500,
    tooltip: {
      trigger: "item",
      backgroundColor: "#11131b",
      borderColor: "rgba(255,255,255,0.08)",
      textStyle: { color: "#e2e8f0", fontSize: 11 },
    },
    grid: { left: 96, right: 20, top: 8, bottom: 8 },
    xAxis: {
      type: "value",
      axisLabel: { color: "#64748b", fontSize: 10, fontFamily: "ui-monospace, SFMono-Regular, monospace" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
    },
    yAxis: {
      type: "category",
      data: items.map(([label]) => label),
      axisLabel: { color: "#e2e8f0", fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: "bar",
      data: items.map(([, count]) => count),
      barWidth: "58%",
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: palette[0] },
            { offset: 1, color: palette[1] },
          ],
        },
      },
    }],
  };
}

function normalizeWebsite(url: string) {
  if (!url) return "";
  return url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
}

export default function SpotHopperPage() {
  const [activeTab, setActiveTab] = useState<IntelTab>("spothopper");
  const [search, setSearch] = useState("");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [grouping, setGrouping] = useState<SpotGrouping>("region");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<SpotLeadView | null>(null);

  const spotLeads = useMemo<SpotLeadView[]>(
    () => SPOTHOPPER_LEADS.map((lead) => ({ ...lead, owner_name: "" })),
    [],
  );

  const regions = useMemo(() => {
    const counts = new Map<string, number>();
    spotLeads.forEach((lead) => counts.set(lead.region, (counts.get(lead.region) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [spotLeads]);

  const states = useMemo(() => {
    const counts = new Map<string, number>();
    spotLeads.forEach((lead) => counts.set(lead.state, (counts.get(lead.state) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [spotLeads]);

  const cityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    spotLeads.forEach((lead) => counts.set(lead.city, (counts.get(lead.city) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [spotLeads]);

  const filteredSpotLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return spotLeads.filter((lead) => {
      if (selectedRegion !== "all" && lead.region !== selectedRegion) return false;
      if (selectedState !== "all" && lead.state !== selectedState) return false;
      if (selectedCity !== "all" && lead.city !== selectedCity) return false;
      if (!query) return true;
      return [
        lead.restaurant_name,
        lead.city,
        lead.state,
        lead.email,
        lead.cuisine,
        lead.region,
        lead.owner_name,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [search, selectedRegion, selectedState, selectedCity, spotLeads]);

  const groupedSpotData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredSpotLeads.forEach((lead) => {
      const key = grouping === "region" ? lead.region : lead.city;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [filteredSpotLeads, grouping]);

  const mapCities = useMemo(() => {
    return cityCounts
      .map(([city, count]) => {
        const coordinate = getCoordinateForCity(city);
        return coordinate ? { city, count, ...coordinate, ...projectToMap(coordinate.lat, coordinate.lng) } : null;
      })
      .filter((item): item is { city: string; count: number; lat: number; lng: number; left: string; top: string } => Boolean(item));
  }, [cityCounts]);

  const spotStats = useMemo(() => ({
    total: filteredSpotLeads.length,
    withPhone: filteredSpotLeads.filter((lead) => Boolean(lead.phone)).length,
    withOwner: filteredSpotLeads.filter((lead) => Boolean(lead.owner_name)).length,
    cities: new Set(filteredSpotLeads.map((lead) => lead.city)).size,
  }), [filteredSpotLeads]);

  const partnerCategories = useMemo(() => {
    const counts = new Map<string, number>();
    PARTNER_LEADS.forEach((lead) => counts.set(lead.category, (counts.get(lead.category) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const filteredPartners = useMemo(() => {
    const query = partnerSearch.trim().toLowerCase();
    return PARTNER_LEADS.filter((lead) => {
      if (selectedCategory !== "all" && lead.category !== selectedCategory) return false;
      if (!query) return true;
      return [lead.company, lead.category, lead.email, lead.phone, lead.website, lead.notes]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [partnerSearch, selectedCategory]);

  const partnerStats = useMemo(() => ({
    total: filteredPartners.length,
    categories: new Set(filteredPartners.map((lead) => lead.category)).size,
    withEmail: filteredPartners.filter((lead) => Boolean(lead.email)).length,
    withPhone: filteredPartners.filter((lead) => Boolean(lead.phone)).length,
  }), [filteredPartners]);

  const partnerChartData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredPartners.forEach((lead) => counts.set(lead.category, (counts.get(lead.category) ?? 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredPartners]);

  const kpis = activeTab === "spothopper"
    ? [
      { label: "Total Restaurants", value: spotStats.total, color: "text-white" },
      { label: "With Phone", value: spotStats.withPhone, color: "text-sky-300" },
      { label: "With Owner Name", value: spotStats.withOwner, color: "text-amber-300" },
      { label: "Cities Covered", value: spotStats.cities, color: "text-red-300" },
    ]
    : [
      { label: "Total Partners", value: partnerStats.total, color: "text-white" },
      { label: "Categories", value: partnerStats.categories, color: "text-sky-300" },
      { label: "With Email", value: partnerStats.withEmail, color: "text-amber-300" },
      { label: "With Phone", value: partnerStats.withPhone, color: "text-red-300" },
    ];

  return (
    <div className="space-y-6 animate-enter">
      <div
        className="glass-panel overflow-hidden p-5"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(10,10,15,0.92) 100%), radial-gradient(circle at top left, rgba(249,115,22,0.22), transparent 34%), #0a0a0f" }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-red-500/20 via-orange-500/10 to-transparent">
              <Target size={20} className="text-red-300" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-red-300/80">Restaurant Intelligence</p>
              <h1 className="text-[22px] font-semibold text-white">Intel Hub</h1>
              <p className="mt-1 text-[12px] text-slate-400">Restaurant &amp; partner intelligence across all sources</p>
            </div>
          </div>

          <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-xl px-4 py-2 text-[12px] font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    : "text-slate-400 hover:text-white",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((item) => (
          <div key={item.label} className="glass-panel p-4" style={{ backgroundColor: "#0a0a0f" }}>
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
            <p className={cn("mt-1 font-mono text-[24px] font-semibold", item.color)}>{item.value}</p>
          </div>
        ))}
      </div>

      {activeTab === "spothopper" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="glass-panel p-4" style={{ backgroundColor: "#0a0a0f" }}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {grouping === "region" ? "By Region" : "By City"}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">Lead distribution for the current filter set</p>
                </div>
                <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                  {[
                    { id: "region", label: "By Region" },
                    { id: "city", label: "By City" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setGrouping(option.id as SpotGrouping)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-[11px] transition-all",
                        grouping === option.id ? "bg-sky-500/15 text-sky-200" : "text-slate-400 hover:text-white",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[280px]">
                <ReactECharts option={buildBarOption(groupedSpotData, ["#2093FF", "#F97316"])} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
              </div>
            </div>

            <div className="glass-panel p-4" style={{ backgroundColor: "#0a0a0f" }}>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Kentucky Coverage Map</p>
                  <p className="mt-1 text-[12px] text-slate-500">OpenStreetMap embed centered on Kentucky with clickable city markers</p>
                </div>
                {selectedCity !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCity("all")}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-white"
                  >
                    Clear City
                  </button>
                )}
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-white/10">
                <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,rgba(32,147,255,0.08),transparent_40%),linear-gradient(180deg,rgba(10,10,15,0.04),rgba(10,10,15,0.14))]" />
                <iframe
                  title="Kentucky lead map"
                  src={MAP_IFRAME_SRC}
                  className="h-[300px] w-full"
                  style={{ border: 0, filter: "invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2) saturate(0.3)" }}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 z-20">
                  {mapCities.map((city) => (
                    <button
                      key={city.city}
                      type="button"
                      onClick={() => setSelectedCity(city.city)}
                      className={cn(
                        "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-[10px] font-medium shadow-lg backdrop-blur-sm transition-all",
                        selectedCity === city.city
                          ? "border-sky-300/70 bg-sky-400/25 text-white"
                          : "border-white/15 bg-[#0f172a]/70 text-slate-200 hover:border-orange-300/60 hover:text-white",
                      )}
                      style={{ left: city.left, top: city.top }}
                    >
                      {city.city} <span className="font-mono text-[9px] text-slate-300">{city.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel flex flex-col overflow-hidden" style={{ backgroundColor: "#0a0a0f", maxHeight: "calc(100vh - 320px)" }}>
            <div className="flex flex-col gap-3 border-b border-white/[0.06] p-3">
              <div className="flex flex-col gap-2 xl:flex-row">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search restaurants, cities, cuisine, email..."
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-[12px] text-white outline-none focus:border-sky-400/40"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:w-[520px]">
                  <select
                    value={selectedRegion}
                    onChange={(event) => setSelectedRegion(event.target.value)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none"
                  >
                    <option value="all">All Regions ({spotLeads.length})</option>
                    {regions.map(([region, count]) => (
                      <option key={region} value={region}>{region} ({count})</option>
                    ))}
                  </select>
                  <select
                    value={selectedState}
                    onChange={(event) => setSelectedState(event.target.value)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none"
                  >
                    <option value="all">All States</option>
                    {states.map(([state, count]) => (
                      <option key={state} value={state}>{state} ({count})</option>
                    ))}
                  </select>
                  <select
                    value={selectedCity}
                    onChange={(event) => setSelectedCity(event.target.value)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none"
                  >
                    <option value="all">All Cities</option>
                    {cityCounts.map(([city, count]) => (
                      <option key={city} value={city}>{city} ({count})</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                {filteredSpotLeads.length} restaurants
                {selectedCity !== "all" ? ` in ${selectedCity}` : ""}
                {selectedState !== "all" ? ` • ${selectedState}` : ""}
              </p>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10 bg-[#0a0a0f]">
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Restaurant</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 lg:table-cell">City</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 md:table-cell">State</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 xl:table-cell">Owner</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 md:table-cell">Phone</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 2xl:table-cell">Email</th>
                    <th className="w-20 px-3 py-2 text-center font-medium text-slate-500">Links</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpotLeads.map((lead, index) => (
                    <tr
                      key={`${lead.restaurant_name}-${index}`}
                      onClick={() => setSelectedLead(selectedLead?.restaurant_name === lead.restaurant_name ? null : lead)}
                      className={cn(
                        "cursor-pointer border-b border-white/[0.03] transition-colors",
                        selectedLead?.restaurant_name === lead.restaurant_name ? "bg-sky-500/[0.08]" : "hover:bg-white/[0.03]",
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-white">{lead.restaurant_name}</p>
                        {lead.cuisine && <p className="text-[10px] text-slate-500">{lead.cuisine}</p>}
                      </td>
                      <td className="hidden px-3 py-2.5 text-slate-400 lg:table-cell">{lead.city}</td>
                      <td className="hidden px-3 py-2.5 text-slate-400 md:table-cell">{lead.state}</td>
                      <td className="hidden px-3 py-2.5 text-slate-400 xl:table-cell">{lead.owner_name || "—"}</td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        {lead.phone ? <a href={`tel:${lead.phone}`} className="text-slate-300 hover:text-white">{lead.phone}</a> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="hidden px-3 py-2.5 2xl:table-cell">
                        {lead.email ? <a href={`mailto:${lead.email}`} className="block max-w-[180px] truncate text-slate-300 hover:text-sky-300">{lead.email}</a> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          {lead.website && (
                            <a href={normalizeWebsite(lead.website)} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="text-slate-500 hover:text-white">
                              <Globe size={12} />
                            </a>
                          )}
                          {lead.facebook && (
                            <a href={lead.facebook} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="text-slate-500 hover:text-sky-300">
                              <Facebook size={12} />
                            </a>
                          )}
                          {lead.instagram && (
                            <a href={lead.instagram} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="text-slate-500 hover:text-orange-300">
                              <Instagram size={12} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selectedLead && (
            <div className="glass-panel p-5" style={{ backgroundColor: "#0a0a0f" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[16px] font-semibold text-white">{selectedLead.restaurant_name}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {selectedLead.city}, {selectedLead.state}</span>
                    {selectedLead.region && <span className="text-slate-500">Region: {selectedLead.region}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedLead(null)} className="text-slate-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Phone</p>
                  <p className="mt-0.5 text-[13px] text-white">{selectedLead.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Email</p>
                  <p className="mt-0.5 text-[13px] text-white">{selectedLead.email || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Owner</p>
                  <p className="mt-0.5 text-[13px] text-white">{selectedLead.owner_name || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Website</p>
                  {selectedLead.website ? (
                    <a href={normalizeWebsite(selectedLead.website)} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-[13px] text-sky-300 hover:text-sky-200">
                      {selectedLead.website} <ExternalLink size={10} />
                    </a>
                  ) : <p className="mt-0.5 text-[13px] text-slate-500">—</p>}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Cuisine</p>
                  <p className="mt-0.5 text-[13px] text-white">{selectedLead.cuisine || "—"}</p>
                </div>
              </div>
              {selectedLead.address && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Address</p>
                  <p className="mt-0.5 text-[13px] text-white">{selectedLead.address}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
          <div className="glass-panel p-4" style={{ backgroundColor: "#0a0a0f" }}>
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">By Category</p>
              <p className="mt-1 text-[12px] text-slate-500">Partner lead concentration by category</p>
            </div>
            <div className="h-[320px]">
              <ReactECharts option={buildBarOption(partnerChartData, ["#2093FF", "#38BDF8"])} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge />
            </div>
          </div>

          <div className="glass-panel flex flex-col overflow-hidden" style={{ backgroundColor: "#0a0a0f", maxHeight: "calc(100vh - 280px)" }}>
            <div className="flex flex-col gap-3 border-b border-white/[0.06] p-3 lg:flex-row">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={partnerSearch}
                  onChange={(event) => setPartnerSearch(event.target.value)}
                  placeholder="Search companies, categories, notes..."
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-[12px] text-white outline-none focus:border-sky-400/40"
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none lg:w-[260px]"
              >
                <option value="all">All Categories</option>
                {partnerCategories.map(([category, count]) => (
                  <option key={category} value={category}>{category} ({count})</option>
                ))}
              </select>
            </div>
            <p className="px-4 py-2 text-[10px] text-slate-500">{filteredPartners.length} partners</p>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10 bg-[#0a0a0f]">
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Company</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 lg:table-cell">Category</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 xl:table-cell">Contact</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 xl:table-cell">Email</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 md:table-cell">Phone</th>
                    <th className="hidden px-3 py-2 text-left font-medium text-slate-500 2xl:table-cell">Website</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((lead: PartnerLead, index) => (
                    <tr key={`${lead.company}-${index}`} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-white">{lead.company}</p>
                      </td>
                      <td className="hidden px-3 py-2.5 text-slate-400 lg:table-cell">{lead.category}</td>
                      <td className="hidden px-3 py-2.5 text-slate-500 xl:table-cell">—</td>
                      <td className="hidden px-3 py-2.5 xl:table-cell">
                        {lead.email ? <a href={`mailto:${lead.email}`} className="block max-w-[180px] truncate text-slate-300 hover:text-sky-300">{lead.email}</a> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="hidden px-3 py-2.5 md:table-cell">
                        {lead.phone ? <a href={`tel:${lead.phone}`} className="text-slate-300 hover:text-white">{lead.phone}</a> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="hidden px-3 py-2.5 2xl:table-cell">
                        {lead.website ? (
                          <a href={normalizeWebsite(lead.website)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate-300 hover:text-white">
                            <span className="max-w-[180px] truncate">{lead.website.replace(/^https?:\/\//, "")}</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">{lead.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
