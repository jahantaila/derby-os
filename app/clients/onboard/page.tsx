"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { CLIENT_TYPE_LABEL, type ClientProfile, type ClientService } from "@/lib/client-types";

type Step = 0 | 1 | 2;
type BudgetRange = NonNullable<ClientProfile["monthlyBudgetRange"]>;
type OnboardingForm = {
  name: string;
  clientType: ClientProfile["clientType"];
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  services: ClientService[];
  monthlyBudgetRange: BudgetRange;
  notes: string;
};

const STEPS = ["Basic Info", "Services", "Review"] as const;
const SERVICE_CHOICES: ClientService[] = ["Website", "Google Ads", "Meta Ads", "SEO", "Social Media", "DerbyFlow", "Email Marketing"];
const BUDGET_OPTIONS: BudgetRange[] = ["Under $500", "$500-$1k", "$1k-$2k", "$2k-$5k", "$5k+"];
const RETAINER_BY_RANGE: Record<BudgetRange, number> = {
  "Under $500": 500,
  "$500-$1k": 1000,
  "$1k-$2k": 2000,
  "$2k-$5k": 5000,
  "$5k+": 5000,
};

const EMPTY_FORM: OnboardingForm = {
  name: "",
  clientType: "restaurant",
  contactName: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  services: [],
  monthlyBudgetRange: "$1k-$2k",
  notes: "",
};

function fieldClassName() {
  return "min-h-11 w-full rounded-xl border border-white/14 bg-[#101625] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60";
}

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<OnboardingForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(
    () => [
      { label: "Client", value: form.name || "Not provided" },
      { label: "Business Type", value: CLIENT_TYPE_LABEL[form.clientType] },
      { label: "Contact", value: form.contactName || "Not provided" },
      { label: "Email", value: form.email || "Not provided" },
      { label: "Phone", value: form.phone || "Not provided" },
      { label: "Website", value: form.website || "Not provided" },
      { label: "Address", value: form.address || "Not provided" },
      { label: "Services", value: form.services.length ? form.services.join(", ") : "No services selected" },
      { label: "Budget", value: form.monthlyBudgetRange },
      { label: "Notes", value: form.notes || "No notes added" },
    ],
    [form],
  );

  function toggleService(service: ClientService) {
    setForm((current) => ({
      ...current,
      services: current.services.includes(service) ? current.services.filter((item) => item !== service) : [...current.services, service],
    }));
  }

  function canContinue(currentStep: Step) {
    if (currentStep === 0) return form.name.trim().length > 0 && form.contactName.trim().length > 0 && form.email.trim().length > 0;
    if (currentStep === 1) return form.services.length > 0;
    return true;
  }

  function handleNext() {
    if (!canContinue(step)) {
      setError(step === 0 ? "Client name, contact name, and email are required." : "Select at least one service.");
      return;
    }

    setError(null);
    setStep((current) => Math.min(2, current + 1) as Step);
  }

  function handleBack() {
    setError(null);
    setStep((current) => Math.max(0, current - 1) as Step);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue(1)) {
      setStep(1);
      setError("Select at least one service before submitting.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          clientType: form.clientType,
          contactName: form.contactName,
          email: form.email,
          phone: form.phone || undefined,
          website: form.website || undefined,
          address: form.address || undefined,
          services: form.services,
          monthlyRetainer: RETAINER_BY_RANGE[form.monthlyBudgetRange],
          monthlyBudgetRange: form.monthlyBudgetRange,
          notes: form.notes || undefined,
          status: "active",
        } satisfies Partial<ClientProfile>),
      });

      if (!response.ok) throw new Error("submit");
      router.push("/clients");
    } catch {
      setError("Could not create client profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="glass-panel page-header p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Client Intake</p>
            <h1 className="page-title mt-2">Client Onboarding</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Capture a new client, their services, and budget before handing them into Mission Control.</p>
          </div>
          <div className="glass-card inline-flex items-center gap-3 self-start rounded-2xl px-4 py-3 text-sm text-slate-200">
            <Sparkles size={16} className="text-blue-200" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Progress</p>
              <p>Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel p-5 sm:p-6">
        <div className="mb-6 flex items-center justify-center gap-3">
          {STEPS.map((label, index) => {
            const active = index === step;
            const complete = index < step;

            return (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition ${
                    complete
                      ? "border-blue-300/50 bg-[linear-gradient(135deg,#2093FF,#0026FF)] text-white"
                      : active
                        ? "border-blue-300/45 bg-blue-500/15 text-blue-50"
                        : "border-white/12 bg-white/5 text-slate-400"
                  }`}
                >
                  {complete ? <Check size={16} /> : index + 1}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-xs uppercase tracking-[0.18em] ${active || complete ? "text-blue-100" : "text-slate-500"}`}>{label}</p>
                </div>
                {index < STEPS.length - 1 ? <div className="hidden h-px w-10 bg-white/10 sm:block" /> : null}
              </div>
            );
          })}
        </div>

        {error ? <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}

        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Client Name</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={fieldClassName()} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Business Type</span>
              <select value={form.clientType} onChange={(event) => setForm((current) => ({ ...current, clientType: event.target.value as ClientProfile["clientType"] }))} className={fieldClassName()}>
                {Object.entries(CLIENT_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Contact Name</span>
              <input value={form.contactName} onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))} className={fieldClassName()} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Email</span>
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={fieldClassName()} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Phone</span>
              <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={fieldClassName()} />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Website</span>
              <input value={form.website} onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))} className={fieldClassName()} placeholder="https://example.com" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm text-slate-300">Address</span>
              <input value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className={fieldClassName()} />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {SERVICE_CHOICES.map((service) => {
                const selected = form.services.includes(service);

                return (
                  <label
                    key={service}
                    className={`glass-card flex cursor-pointer items-center justify-between gap-3 rounded-2xl p-4 transition ${
                      selected ? "border-blue-400/45 bg-blue-500/12" : ""
                    }`}
                  >
                    <div>
                      <p className="text-sm text-white">{service}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">{selected ? "Selected" : "Optional"}</p>
                    </div>
                    <input type="checkbox" checked={selected} onChange={() => toggleService(service)} className="h-4 w-4 accent-[#2093FF]" />
                  </label>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Monthly Budget Range</span>
                <select value={form.monthlyBudgetRange} onChange={(event) => setForm((current) => ({ ...current, monthlyBudgetRange: event.target.value as BudgetRange }))} className={fieldClassName()}>
                  {BUDGET_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={5}
                  className={`${fieldClassName()} py-3`}
                  placeholder="Goals, launch timing, or context for the team."
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {summary.map((item) => (
                <article key={item.label} className="glass-card rounded-2xl p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-sm text-white">{item.value}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
            >
              Next
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Submit Client
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
