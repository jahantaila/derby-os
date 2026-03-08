"use client";

import { useState } from "react";
import { Building2, Plus } from "lucide-react";
import { useData } from "@/lib/hooks";
import type { Client, ClientStatus } from "@/lib/mission-control";

const serviceOptions = ["LSA", "PPC", "Meta Ads", "Website", "Creative", "Community Growth"];
const statusOptions: ClientStatus[] = ["Active", "Onboarding", "Paused"];

const statusStyles: Record<ClientStatus, string> = {
  Active: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
  Onboarding: "border-blue-300/35 bg-blue-500/15 text-blue-100",
  Paused: "border-amber-300/35 bg-amber-500/15 text-amber-100",
};

export default function ClientsPage() {
  const { data: clients, loading, add } = useData<Client[]>("/api/clients", []);
  const { data: team } = useData<{ id: string; name: string }[]>("/api/team", []);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    industry: "",
    location: "",
    services: [] as string[],
    monthlyBudget: 0,
    assignedTeam: [] as string[],
    status: "Onboarding" as ClientStatus,
  });

  if (loading) {
    return <div className="text-sm text-slate-300">Loading clients...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Clients</h1>
          <p className="mt-1 text-sm text-slate-300">Client operations, monthly performance, and team ownership.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="derby-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={16} /> Add Client
          </span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((client) => {
          const cpl = client.monthLeads > 0 ? client.monthSpend / client.monthLeads : 0;
          return (
            <article key={client.id} className="glass-surface rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">{client.businessName}</h2>
                  <p className="text-sm text-slate-300">{client.industry}</p>
                  <p className="text-xs text-slate-400">{client.location}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${statusStyles[client.status]}`}>{client.status}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {client.services.map((service) => (
                  <span key={service} className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-xs text-slate-200">
                    {service}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-200">
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="block text-xs text-slate-400">Budget</span>${client.monthlyBudget.toLocaleString()}
                </p>
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="block text-xs text-slate-400">Spend</span>${client.monthSpend.toLocaleString()}
                </p>
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="block text-xs text-slate-400">Leads</span>{client.monthLeads}
                </p>
                <p className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <span className="block text-xs text-slate-400">CPL</span>${cpl.toFixed(2)}
                </p>
              </div>

              <div className="mt-4 space-y-1 text-xs text-slate-300">
                <p>
                  <span className="text-slate-400">Assigned:</span> {client.assignedTeam.join(", ")}
                </p>
                <p>
                  <span className="text-slate-400">Last Report:</span> {client.lastReportDate}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {isAdding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4" onClick={() => setIsAdding(false)}>
          <div className="glass-surface w-full max-w-xl rounded-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-white">Add Client</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                placeholder="Business name"
                value={form.businessName}
                onChange={(event) => setForm((prev) => ({ ...prev, businessName: event.target.value }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              />
              <input
                placeholder="Industry"
                value={form.industry}
                onChange={(event) => setForm((prev) => ({ ...prev, industry: event.target.value }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              />
              <input
                placeholder="Location"
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              />
              <input
                type="number"
                placeholder="Monthly budget"
                value={form.monthlyBudget || ""}
                onChange={(event) => setForm((prev) => ({ ...prev, monthlyBudget: Number(event.target.value) }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              />
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ClientStatus }))}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value=""
                onChange={(event) => {
                  const memberName = event.target.value;
                  if (!memberName || form.assignedTeam.includes(memberName)) return;
                  setForm((prev) => ({ ...prev, assignedTeam: [...prev.assignedTeam, memberName] }));
                }}
                className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              >
                <option value="">Assign team member</option>
                {team.map((member) => (
                  <option key={member.id} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {serviceOptions.map((service) => (
                <button
                  key={service}
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      services: prev.services.includes(service)
                        ? prev.services.filter((entry) => entry !== service)
                        : [...prev.services, service],
                    }));
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    form.services.includes(service)
                      ? "border-blue-300/40 bg-blue-500/20 text-blue-100"
                      : "border-white/15 bg-black/25 text-slate-300"
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>

            {form.assignedTeam.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {form.assignedTeam.map((member) => (
                  <button
                    key={member}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, assignedTeam: prev.assignedTeam.filter((entry) => entry !== member) }));
                    }}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-slate-200"
                  >
                    {member} ×
                  </button>
                ))}
              </div>
            ) : null}

            <button
              onClick={async () => {
                if (!form.businessName || !form.industry || !form.location) return;
                await add({
                  ...form,
                  monthSpend: 0,
                  monthLeads: 0,
                  lastReportDate: new Date().toISOString().slice(0, 10),
                });
                setIsAdding(false);
              }}
              className="derby-gradient mt-5 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <span className="inline-flex items-center gap-2">
                <Building2 size={15} /> Save Client
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
