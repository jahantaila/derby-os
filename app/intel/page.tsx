"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Building2,
  CheckSquare,
  ChevronDown,
  Download,
  ExternalLink,
  Phone,
  Search,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntelLead } from "@/app/api/intel/leads/route";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

type IntelTab = "KY" | "IN" | "ALL";
type OwnerFilter = "all" | IntelLead["ownerStatus"];
type ContactedFilter = "all" | IntelLead["contactedStatus"];

const TAB_LABELS: Record<IntelTab, string> = {
  KY: "KY Leads",
  IN: "IN Leads",
  ALL: "All Leads",
};

const OWNER_FILTER_LABELS: Record<IntelLead["ownerStatus"], string> = {
  yes: "Has owner",
  no: "No owner",
  unknown: "Owner unknown",
};

const CONTACTED_FILTER_LABELS: Record<IntelLead["contactedStatus"], string> = {
  contacted: "Contacted",
  not_contacted: "Not contacted",
  unknown: "Unknown",
};

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone || "No phone";
}

function exportCsv(leads: IntelLead[]) {
  const rows = [
    ["restaurant_name", "owner_name", "owner_status", "phone", "website", "city", "state", "current_provider", "contacted_status"],
    ...leads.map((lead) => [
      lead.restaurantName,
      lead.ownerName,
      lead.ownerStatus,
      lead.phone,
      lead.website,
      lead.city,
      lead.state,
      lead.currentProvider,
      lead.contactedStatus,
    ]),
  ];

  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  link.href = url;
  link.download = `intel-leads-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildCityChartOption(cityCounts: Array<[string, number]>) {
  return {
    animationDuration: 500,
    backgroundColor: "transparent",
    grid: { left: 96, right: 16, top: 16, bottom: 16 },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "#07111f",
      borderColor: "rgba(148, 163, 184, 0.18)",
      textStyle: { color: "#e2e8f0" },
    },
    xAxis: {
      type: "value",
      axisLabel: { color: "#94a3b8", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(148, 163, 184, 0.08)" } },
    },
    yAxis: {
      type: "category",
      data: cityCounts.map(([city]) => city),
      axisLabel: { color: "#e2e8f0", fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: "bar",
        data: cityCounts.map(([, count]) => count),
        barWidth: "55%",
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: "#38bdf8" },
              { offset: 1, color: "#2563eb" },
            ],
          },
        },
      },
    ],
  };
}

function filterByTab(leads: IntelLead[], tab: IntelTab) {
  if (tab === "ALL") return leads;
  return leads.filter((lead) => lead.state === tab);
}

export default function IntelPage() {
  const [tab, setTab] = useState<IntelTab>("KY");
  const [leads, setLeads] = useState<IntelLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [contactedFilter, setContactedFilter] = useState<ContactedFilter>("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadLeads() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/intel/leads", { cache: "no-store" });
        const payload = (await response.json()) as { leads?: IntelLead[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load leads");
        }

        if (cancelled) return;
        setLeads(Array.isArray(payload.leads) ? payload.leads : []);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load leads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLeads();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabLeads = useMemo(() => filterByTab(leads, tab), [leads, tab]);

  const cityOptions = useMemo(() => {
    return Array.from(new Set(tabLeads.map((lead) => lead.city))).sort((a, b) => a.localeCompare(b));
  }, [tabLeads]);

  useEffect(() => {
    if (cityFilter !== "all" && !cityOptions.includes(cityFilter)) {
      setCityFilter("all");
    }
  }, [cityFilter, cityOptions]);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tabLeads.filter((lead) => {
      if (ownerFilter !== "all" && lead.ownerStatus !== ownerFilter) return false;
      if (contactedFilter !== "all" && lead.contactedStatus !== contactedFilter) return false;
      if (cityFilter !== "all" && lead.city !== cityFilter) return false;
      if (!query) return true;

      return [lead.restaurantName, lead.ownerName, lead.city, lead.state, lead.currentProvider]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [cityFilter, contactedFilter, ownerFilter, search, tabLeads]);

  const groupedCities = useMemo(() => {
    const groups = new Map<string, IntelLead[]>();
    filteredLeads.forEach((lead) => {
      const key = lead.city || "Unknown City";
      const existing = groups.get(key) ?? [];
      groups.set(key, [...existing, lead]);
    });

    return Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
      .map(([city, cityLeads]) => ({
        city,
        leads: cityLeads.sort((a, b) => a.restaurantName.localeCompare(b.restaurantName)),
      }));
  }, [filteredLeads]);

  useEffect(() => {
    setExpandedCities((current) => {
      const next: Record<string, boolean> = {};
      groupedCities.forEach((group, index) => {
        next[group.city] = current[group.city] ?? index < 4;
      });
      return next;
    });
  }, [groupedCities]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredLeads.some((lead) => lead.id === id)));
  }, [filteredLeads]);

  const selectedLeads = useMemo(() => {
    const selected = new Set(selectedIds);
    return filteredLeads.filter((lead) => selected.has(lead.id));
  }, [filteredLeads, selectedIds]);

  const stats = useMemo(() => {
    return {
      totalLeads: filteredLeads.length,
      verifiedOwners: filteredLeads.filter((lead) => lead.ownerStatus === "yes").length,
      citiesCovered: new Set(filteredLeads.map((lead) => lead.city)).size,
      unknownOwners: filteredLeads.filter((lead) => lead.ownerStatus === "unknown").length,
    };
  }, [filteredLeads]);

  const cityChartData = useMemo(() => {
    return groupedCities.slice(0, 8).map((group) => [group.city, group.leads.length] as [string, number]).reverse();
  }, [groupedCities]);

  function toggleCity(city: string) {
    setExpandedCities((current) => ({ ...current, [city]: !current[city] }));
  }

  function toggleLead(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  function toggleSelectAllVisible() {
    const visibleIds = filteredLeads.map((lead) => lead.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,8,23,0.98))] shadow-[0_30px_100px_rgba(2,6,23,0.45)]">
        <div className="border-b border-white/10 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                <Target className="h-3.5 w-3.5" />
                Leads Intelligence Hub
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Cold outreach command center</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Live SpotHopper leads from Supabase, organized by city for campaign prep and export.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-100 transition hover:bg-white/10"
              >
                <CheckSquare className="h-4 w-4" />
                {filteredLeads.length > 0 && filteredLeads.every((lead) => selectedIds.includes(lead.id)) ? "Clear visible" : "Select visible"}
              </button>
              <button
                type="button"
                onClick={() => exportCsv(selectedLeads)}
                disabled={selectedLeads.length === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                <Download className="h-4 w-4" />
                Export CSV{selectedLeads.length > 0 ? ` (${selectedLeads.length})` : ""}
              </button>
              <button
                type="button"
                disabled
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-slate-500"
              >
                Push to GHL
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-white/10 px-5 py-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-7">
          {[
            { label: "Total Leads", value: stats.totalLeads, icon: Building2 },
            { label: "Verified Owners", value: stats.verifiedOwners, icon: Users },
            { label: "Cities Covered", value: stats.citiesCovered, icon: Target },
            { label: "Unknown Owners", value: stats.unknownOwners, icon: Search },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</span>
                  <Icon className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="mt-3 text-3xl font-semibold text-white">{item.value}</div>
              </div>
            );
          })}
        </div>

        <Tabs.Root value={tab} onValueChange={(value) => setTab(value as IntelTab)}>
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4 xl:min-w-0 xl:flex-1">
                <Tabs.List className="inline-flex w-full flex-wrap gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-1.5 md:w-auto">
                  {(Object.keys(TAB_LABELS) as IntelTab[]).map((value) => (
                    <Tabs.Trigger
                      key={value}
                      value={value}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 transition data-[state=active]:bg-cyan-400 data-[state=active]:text-slate-950"
                    >
                      {TAB_LABELS[value]}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.7fr))]">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search restaurant, city, owner, provider"
                      className="min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-10 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
                    />
                  </label>

                  <select
                    value={ownerFilter}
                    onChange={(event) => setOwnerFilter(event.target.value as OwnerFilter)}
                    className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                  >
                    <option value="all">All owner states</option>
                    {Object.entries(OWNER_FILTER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={contactedFilter}
                    onChange={(event) => setContactedFilter(event.target.value as ContactedFilter)}
                    className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                  >
                    <option value="all">All contact states</option>
                    {Object.entries(CONTACTED_FILTER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>

                  <select
                    value={cityFilter}
                    onChange={(event) => setCityFilter(event.target.value)}
                    className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                  >
                    <option value="all">All cities</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>{filteredLeads.length} leads shown</span>
                  <span>{groupedCities.length} city groups</span>
                  <span>{selectedLeads.length} selected</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 xl:w-[360px]">
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-white">Top cities</h2>
                  <p className="text-xs text-slate-400">Lead concentration in the current view</p>
                </div>
                <div className="h-[260px]">
                  <ReactECharts option={buildCityChartOption(cityChartData)} style={{ height: "100%", width: "100%" }} />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-400">
                Loading live leads from Supabase...
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {!loading && !error && groupedCities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-400">
                No leads match the current filters.
              </div>
            ) : null}

            {!loading && !error ? (
              <div className="space-y-3">
                {groupedCities.map((group) => {
                  const isExpanded = expandedCities[group.city] ?? false;
                  const cityIds = group.leads.map((lead) => lead.id);
                  const allCitySelected = cityIds.length > 0 && cityIds.every((id) => selectedIds.includes(id));

                  return (
                    <section key={group.city} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          onClick={() => toggleCity(group.city)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span className={cn("rounded-full border border-white/10 p-2 text-slate-300 transition", isExpanded && "bg-cyan-400/10 text-cyan-200")}>
                            <ChevronDown className={cn("h-4 w-4 transition", isExpanded && "rotate-180")} />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-white">{group.city}</div>
                            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{group.leads.length} leads</div>
                          </div>
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedIds((current) => allCitySelected ? current.filter((id) => !cityIds.includes(id)) : Array.from(new Set([...current, ...cityIds])))}
                            className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                          >
                            {allCitySelected ? "Clear city" : "Select city"}
                          </button>
                          <button
                            type="button"
                            disabled
                            className="min-h-10 rounded-xl bg-cyan-400 px-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                          >
                            Start Campaign
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-2 2xl:grid-cols-3">
                          {group.leads.map((lead) => {
                            const selected = selectedIds.includes(lead.id);
                            return (
                              <article
                                key={lead.id}
                                className={cn(
                                  "rounded-2xl border p-4 transition",
                                  selected ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-slate-950/35 hover:border-white/20"
                                )}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => toggleLead(lead.id)}
                                      className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-cyan-400 focus:ring-cyan-400"
                                    />
                                    <div className="min-w-0">
                                      <h3 className="truncate text-base font-semibold text-white">{lead.restaurantName}</h3>
                                      <p className="mt-1 text-sm text-slate-300">{lead.ownerName || "Owner not identified"}</p>
                                    </div>
                                  </label>
                                  {lead.website ? (
                                    <a
                                      href={lead.website}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-200"
                                      aria-label={`Open ${lead.restaurantName} website`}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  ) : null}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <span className={cn(
                                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                                    lead.ownerStatus === "yes" && "bg-emerald-400/15 text-emerald-200",
                                    lead.ownerStatus === "no" && "bg-amber-400/15 text-amber-100",
                                    lead.ownerStatus === "unknown" && "bg-slate-700 text-slate-200"
                                  )}>
                                    {OWNER_FILTER_LABELS[lead.ownerStatus]}
                                  </span>
                                  <span className={cn(
                                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                                    lead.contactedStatus === "contacted" && "bg-cyan-400/15 text-cyan-200",
                                    lead.contactedStatus === "not_contacted" && "bg-rose-400/15 text-rose-200",
                                    lead.contactedStatus === "unknown" && "bg-slate-700 text-slate-200"
                                  )}>
                                    {CONTACTED_FILTER_LABELS[lead.contactedStatus]}
                                  </span>
                                </div>

                                <div className="mt-4 space-y-3 text-sm">
                                  <div className="flex items-start gap-2 text-slate-300">
                                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                    <span>{formatPhone(lead.phone)}</span>
                                  </div>
                                  <div className="flex items-start gap-2 text-slate-300">
                                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                    <span>{lead.currentProvider || "Provider unknown"}</span>
                                  </div>
                                  <div className="flex items-start gap-2 text-slate-300">
                                    <Target className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                    <span>{lead.city}, {lead.state || "N/A"}</span>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            ) : null}
          </div>
        </Tabs.Root>
      </section>
    </div>
  );
}
