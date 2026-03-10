import Link from "next/link";
import { ArrowRight, Building2, Globe, Mail, MapPin, Phone, Plus } from "lucide-react";
import { CLIENT_TYPE_LABEL } from "@/lib/client-types";
import { getClients } from "@/lib/clients-store";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="glass-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(32,147,255,0),#2093FF,rgba(0,38,255,0))]" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Relationships</p>
            <h1 className="page-title mt-2">Clients</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Newly onboarded clients land here with their primary services, budget, and contact details.</p>
          </div>
          <Link
            href="/clients/onboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
          >
            <Plus size={16} />
            New Client
          </Link>
        </div>
      </div>

      {clients.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {clients.map((client, index) => (
            <article key={client.id} className="glass-card animate-enter rounded-2xl p-5" style={{ animationDelay: `${100 + index * 60}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="heading-font text-2xl font-normal uppercase tracking-[0.04em] text-white">{client.name}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-blue-100">{CLIENT_TYPE_LABEL[client.clientType]}</p>
                </div>
                <span className="rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-blue-100">
                  {client.monthlyBudgetRange ?? "Custom budget"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Building2 size={16} className="text-blue-200" />
                  <span>{client.contactName ?? "No contact yet"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Mail size={16} className="text-blue-200" />
                  <span>{client.email ?? "No email"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Phone size={16} className="text-blue-200" />
                  <span>{client.phone ?? "No phone"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Globe size={16} className="text-blue-200" />
                  <span>{client.website ?? "No website"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
                  <MapPin size={16} className="text-blue-200" />
                  <span>{client.address ?? "No address"}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {client.services.length ? (
                  client.services.map((service) => (
                    <span key={service} className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-200">
                      {service}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-400">No services set</span>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
                <p className="text-sm text-slate-400">{client.notes ?? "No notes added yet."}</p>
                <Link href="/clients/onboard" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200 transition hover:text-white">
                  Add another
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="glass-panel flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-blue-100">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="heading-font text-2xl font-normal uppercase tracking-[0.04em] text-white">No Clients Yet</h2>
            <p className="mt-2 text-sm text-slate-400">Start the onboarding wizard to create the first client profile.</p>
          </div>
          <Link
            href="/clients/onboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
          >
            <Plus size={16} />
            Launch Onboarding
          </Link>
        </div>
      )}
    </section>
  );
}
