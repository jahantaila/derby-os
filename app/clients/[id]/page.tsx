"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CreditCard, ExternalLink, FileText, Globe, Mail, MapPin, PencilLine, Phone, ReceiptText, Save, X } from "lucide-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { GridSkeleton, TableSkeleton } from "@/components/loading-skeleton";
import { CLIENT_TYPE_LABEL, SERVICE_BADGE_CLASSES, STATUS_BADGE_CLASSES, STATUS_LABEL, type ClientProfile } from "@/lib/client-types";
import type { DocumentRecord } from "@/lib/documents-types";

type ClientDetailPageProps = {
  params: {
    id: string;
  };
};

type EditForm = {
  name: string;
  clientType: ClientProfile["clientType"];
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  services: string;
  monthlyRetainer: string;
  monthlyBudgetRange: string;
  startDate: string;
  status: ClientProfile["status"];
  notes: string;
};

const TIME_ZONE = "America/New_York";

function fieldClassName() {
  return "min-h-11 w-full rounded-xl border border-white/14 bg-[#101625] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60";
}

function toEditForm(client: ClientProfile): EditForm {
  return {
    name: client.name,
    clientType: client.clientType,
    contactName: client.contactName ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    website: client.website ?? "",
    address: client.address ?? "",
    services: client.services.join(", "),
    monthlyRetainer: String(client.monthlyRetainer),
    monthlyBudgetRange: client.monthlyBudgetRange ?? "",
    startDate: client.startDate ?? "",
    status: client.status,
    notes: client.notes ?? "",
  };
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value?: string) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(parsed);
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(parsed);
}

function sanitizeWebsite(value: string) {
  if (!value) return "";
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [clientRes, documentsRes] = await Promise.all([
          fetch(`/api/clients/${params.id}`, { cache: "no-store" }),
          fetch(`/api/documents?clientId=${params.id}`, { cache: "no-store" }),
        ]);

        if (!active) return;

        if (!clientRes.ok) {
          setClient(null);
          setDocuments([]);
          return;
        }

        const clientData = (await clientRes.json()) as ClientProfile;
        const documentData = documentsRes.ok ? ((await documentsRes.json()) as DocumentRecord[]) : [];

        setClient(clientData);
        setForm(toEditForm(clientData));
        setDocuments(Array.isArray(documentData) ? documentData : []);
      } catch {
        if (!active) return;
        setError("Could not load client details.");
        setClient(null);
        setDocuments([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [params.id]);

  const documentList = useMemo(
    () => [...documents].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [documents],
  );

  async function handleSave() {
    if (!form) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/clients/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          contactName: form.contactName || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          website: form.website || undefined,
          address: form.address || undefined,
          services: form.services
            .split(",")
            .map((service) => service.trim())
            .filter(Boolean),
          monthlyRetainer: Number(form.monthlyRetainer) || 0,
          monthlyBudgetRange: form.monthlyBudgetRange || undefined,
          startDate: form.startDate || undefined,
          notes: form.notes || undefined,
        }),
      });

      if (!response.ok) throw new Error("save");

      const updated = (await response.json()) as ClientProfile | null;
      if (!updated) throw new Error("missing");

      setClient(updated);
      setForm(toEditForm(updated));
      setIsEditing(false);
    } catch {
      setError("Could not save client changes.");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) {
    return (
      <ErrorBoundary fallbackTitle="Client profile unavailable">
        <div className="space-y-6">
          <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-blue-300 transition hover:text-blue-200">
            <ArrowLeft size={16} />
            Back to clients
          </Link>
          <GridSkeleton columns={2} count={4} />
          <TableSkeleton />
        </div>
      </ErrorBoundary>
    );
  }

  if (!client || !form) {
    return (
      <ErrorBoundary fallbackTitle="Client profile unavailable">
        <div className="space-y-6">
          <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-blue-300 transition hover:text-blue-200">
            <ArrowLeft size={16} />
            Back to clients
          </Link>
          <div className="glass-panel p-8">
            <h1 className="heading-font text-3xl font-normal uppercase tracking-[0.04em] text-white">Client not found</h1>
            <p className="mt-2 text-sm text-slate-400">No client profile exists for {params.id}.</p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallbackTitle="Client profile unavailable">
      <div className="space-y-6">
        <Link href="/clients" className="inline-flex items-center gap-2 text-sm text-blue-300 transition hover:text-blue-200">
          <ArrowLeft size={16} />
          Back to clients
        </Link>

        <section className="glass-panel page-header p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Client Profile</p>
              <h1 className="page-title mt-2">{client.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-blue-100">
                  {CLIENT_TYPE_LABEL[client.clientType]}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${STATUS_BADGE_CLASSES[client.status]}`}>
                  {STATUS_LABEL[client.status]}
                </span>
                <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-200">
                  Budget {client.monthlyBudgetRange ?? "Custom"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setForm(toEditForm(client));
                setIsEditing((current) => !current);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
            >
              {isEditing ? <X size={16} /> : <PencilLine size={16} />}
              {isEditing ? "Close Editor" : "Edit Client"}
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Monthly Retainer</p>
              <p className="mt-2 heading-font text-3xl font-normal uppercase tracking-[0.03em] text-white">{formatMoney(client.monthlyRetainer)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Start Date</p>
              <p className="mt-2 text-sm text-white">{formatDate(client.startDate)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Created</p>
              <p className="mt-2 text-sm text-white">{formatDateTime(client.createdAt)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Contact</p>
              <p className="mt-2 text-sm text-white">{client.contactName ?? "Not set"}</p>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}

        {isEditing ? (
          <section className="glass-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Edit Client</h2>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={16} />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Client Name</span>
                <input value={form.name} onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)} className={fieldClassName()} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Business Type</span>
                <select value={form.clientType} onChange={(event) => setForm((current) => current ? { ...current, clientType: event.target.value as ClientProfile["clientType"] } : current)} className={fieldClassName()}>
                  {Object.entries(CLIENT_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Contact Name</span>
                <input value={form.contactName} onChange={(event) => setForm((current) => current ? { ...current, contactName: event.target.value } : current)} className={fieldClassName()} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Email</span>
                <input value={form.email} onChange={(event) => setForm((current) => current ? { ...current, email: event.target.value } : current)} className={fieldClassName()} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Phone</span>
                <input value={form.phone} onChange={(event) => setForm((current) => current ? { ...current, phone: event.target.value } : current)} className={fieldClassName()} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Website</span>
                <input value={form.website} onChange={(event) => setForm((current) => current ? { ...current, website: event.target.value } : current)} className={fieldClassName()} />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Address</span>
                <input value={form.address} onChange={(event) => setForm((current) => current ? { ...current, address: event.target.value } : current)} className={fieldClassName()} />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Services</span>
                <input value={form.services} onChange={(event) => setForm((current) => current ? { ...current, services: event.target.value } : current)} className={fieldClassName()} placeholder="Website, SEO, Google Ads" />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Monthly Retainer</span>
                <input value={form.monthlyRetainer} onChange={(event) => setForm((current) => current ? { ...current, monthlyRetainer: event.target.value } : current)} className={fieldClassName()} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Budget Range</span>
                <input value={form.monthlyBudgetRange} onChange={(event) => setForm((current) => current ? { ...current, monthlyBudgetRange: event.target.value } : current)} className={fieldClassName()} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Start Date</span>
                <input type="date" value={form.startDate} onChange={(event) => setForm((current) => current ? { ...current, startDate: event.target.value } : current)} className={fieldClassName()} />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Status</span>
                <select value={form.status} onChange={(event) => setForm((current) => current ? { ...current, status: event.target.value as ClientProfile["status"] } : current)} className={fieldClassName()}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-slate-300">Notes</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => current ? { ...current, notes: event.target.value } : current)} rows={5} className={`${fieldClassName()} py-3`} />
              </label>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="space-y-4">
            <section className="glass-panel p-5 sm:p-6">
              <h2 className="section-title">Services</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {client.services.length ? (
                  client.services.map((service) => (
                    <span key={service} className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${SERVICE_BADGE_CLASSES[service]}`}>
                      {service}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-400">No services assigned</span>
                )}
              </div>
            </section>

            <section className="glass-panel p-5 sm:p-6">
              <h2 className="section-title">Contact Info</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="glass-card flex items-center gap-3 rounded-2xl p-4">
                  <Mail className="h-4 w-4 text-blue-200" />
                  <span className="text-sm text-slate-200">{client.email ?? "No email on file"}</span>
                </div>
                <div className="glass-card flex items-center gap-3 rounded-2xl p-4">
                  <Phone className="h-4 w-4 text-blue-200" />
                  <span className="text-sm text-slate-200">{client.phone ?? "No phone on file"}</span>
                </div>
                <div className="glass-card flex items-center gap-3 rounded-2xl p-4">
                  <Globe className="h-4 w-4 text-blue-200" />
                  {client.website ? (
                    <a href={sanitizeWebsite(client.website)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-100 transition hover:text-white">
                      {client.website}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className="text-sm text-slate-200">No website on file</span>
                  )}
                </div>
                <div className="glass-card flex items-center gap-3 rounded-2xl p-4 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-blue-200" />
                  <span className="text-sm text-slate-200">{client.address ?? "No address on file"}</span>
                </div>
              </div>
            </section>

            <section className="glass-panel p-5 sm:p-6">
              <h2 className="section-title">Notes</h2>
              <div className="glass-card mt-4 rounded-2xl p-4">
                <p className="text-sm leading-6 text-slate-200">{client.notes ?? "No notes added yet."}</p>
              </div>
            </section>

            <section className="glass-panel p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="section-title">Documents</h2>
                <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{documentList.length} linked</span>
              </div>
              <div className="mt-4 space-y-3">
                {documentList.length ? (
                  documentList.map((document) => (
                    <div key={document.id} className="glass-card rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{document.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{document.category}</p>
                        </div>
                        <FileText className="h-4 w-4 text-blue-200" />
                      </div>
                      <p className="mt-3 text-xs text-slate-400">Updated {formatDateTime(document.updatedAt)}</p>
                    </div>
                  ))
                ) : (
                  <div className="glass-card rounded-2xl p-4 text-sm text-slate-400">No documents linked to this client yet.</div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <section className="glass-panel p-5 sm:p-6">
              <h2 className="section-title">Budget Range</h2>
              <div className="glass-card mt-4 rounded-2xl p-4">
                <p className="heading-font text-3xl font-normal uppercase tracking-[0.03em] text-white">{client.monthlyBudgetRange ?? "Custom"}</p>
                <p className="mt-2 text-sm text-slate-300">Monthly retainer: {formatMoney(client.monthlyRetainer)}</p>
              </div>
            </section>

            <section className="glass-panel p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-blue-200" />
                <h2 className="section-title">Billing & Payments</h2>
              </div>

              <div className="glass-card mt-4 rounded-2xl border border-blue-300/20 bg-[linear-gradient(135deg,rgba(32,147,255,0.12),rgba(0,38,255,0.12))] p-4">
                <p className="text-sm font-semibold text-white">Stripe integration coming soon</p>
                <p className="mt-2 text-sm text-slate-300">Production billing hooks will land once Stripe API credentials and webhook handling are added.</p>
              </div>

              <div className="mt-4 space-y-3">
                <div className="glass-card flex items-center justify-between rounded-2xl p-4">
                  <span className="text-sm text-slate-300">Payment status</span>
                  <span className="rounded-full border border-amber-400/35 bg-amber-500/12 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-100">Placeholder</span>
                </div>
                <div className="glass-card flex items-center justify-between rounded-2xl p-4">
                  <span className="text-sm text-slate-300">Monthly retainer amount</span>
                  <span className="text-sm font-semibold text-white">{formatMoney(client.monthlyRetainer)}</span>
                </div>
                <div className="glass-card flex items-center justify-between rounded-2xl p-4">
                  <span className="text-sm text-slate-300">Payment method</span>
                  <span className="text-sm text-slate-400">Placeholder</span>
                </div>
              </div>

              <button
                type="button"
                disabled
                title="Stripe API required"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                Generate Payment Link
              </button>
            </section>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
