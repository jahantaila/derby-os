"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { ClientMarketingEffort, ClientOnboardingState } from "@/lib/client-types";

type PageProps = {
  params: {
    id: string;
  };
};

type PublicOnboardingResponse = {
  clientId: string;
  businessName: string;
  onboarding: ClientOnboardingState | null;
};

type FormState = {
  ownerManagerName: string;
  bestEmail: string;
  bestPhone: string;
  businessAddress: string;
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  googleBusinessUrl: string;
  businessHours: string;
  currentMarketingEfforts: ClientMarketingEffort[];
  monthlyMarketingBudgetRange: string;
  biggestChallenges: string;
  additionalInfo: string;
};

const MARKETING_EFFORTS: ClientMarketingEffort[] = ["Google Ads", "Meta Ads", "SEO", "Social Media", "Email Marketing", "None"];
const BUDGET_OPTIONS = ["Under $500", "$500-$1k", "$1k-$2k", "$2k-$5k", "$5k+", "$5k-$10k", "$10k+"] as const;
const EMPTY_FORM: FormState = {
  ownerManagerName: "",
  bestEmail: "",
  bestPhone: "",
  businessAddress: "",
  websiteUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  googleBusinessUrl: "",
  businessHours: "",
  currentMarketingEfforts: [],
  monthlyMarketingBudgetRange: "$1k-$2k",
  biggestChallenges: "",
  additionalInfo: "",
};

function fieldClassName() {
  return "min-h-11 w-full rounded-xl border border-white/14 bg-[#101625] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60";
}

export default function PublicOnboardingPage({ params }: PageProps) {
  const [businessName, setBusinessName] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/clients/${params.id}/onboarding`, { cache: "no-store" });
        if (!response.ok) throw new Error("load");
        const payload = (await response.json()) as PublicOnboardingResponse;
        if (!active) return;

        setBusinessName(payload.businessName);
        if (payload.onboarding?.data) {
          setForm({
            ownerManagerName: payload.onboarding.data.ownerManagerName,
            bestEmail: payload.onboarding.data.bestEmail,
            bestPhone: payload.onboarding.data.bestPhone,
            businessAddress: payload.onboarding.data.businessAddress,
            websiteUrl: payload.onboarding.data.websiteUrl,
            instagramUrl: payload.onboarding.data.instagramUrl,
            facebookUrl: payload.onboarding.data.facebookUrl,
            googleBusinessUrl: payload.onboarding.data.googleBusinessUrl,
            businessHours: payload.onboarding.data.businessHours,
            currentMarketingEfforts: payload.onboarding.data.currentMarketingEfforts,
            monthlyMarketingBudgetRange: payload.onboarding.data.monthlyMarketingBudgetRange || "$1k-$2k",
            biggestChallenges: payload.onboarding.data.biggestChallenges,
            additionalInfo: payload.onboarding.data.additionalInfo,
          });
          setSubmitted(true);
        }
      } catch {
        if (!active) return;
        setError("This onboarding form could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  const confetti = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, index) => ({
        id: index,
        left: `${6 + index * 6}%`,
        delay: `${(index % 6) * 0.18}s`,
        duration: `${3 + (index % 4) * 0.4}s`,
      })),
    [],
  );

  function toggleEffort(effort: ClientMarketingEffort) {
    setForm((current) => {
      if (effort === "None") {
        return { ...current, currentMarketingEfforts: current.currentMarketingEfforts.includes("None") ? [] : ["None"] };
      }

      const withoutNone = current.currentMarketingEfforts.filter((item) => item !== "None");
      return {
        ...current,
        currentMarketingEfforts: withoutNone.includes(effort) ? withoutNone.filter((item) => item !== effort) : [...withoutNone, effort],
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/clients/${params.id}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("submit");
      setSubmitted(true);
    } catch {
      setError("Could not submit onboarding form.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="min-h-screen bg-[#0a0a0f] px-4 py-10 text-sm text-slate-300">Loading onboarding form...</section>;
  }

  if (error && !businessName) {
    return <section className="min-h-screen bg-[#0a0a0f] px-4 py-10 text-sm text-red-200">{error}</section>;
  }

  return (
    <section className="min-h-screen bg-[#0a0a0f] px-4 py-8 text-white sm:px-6 lg:px-8">
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            opacity: 0;
            transform: translate3d(0, -30px, 0) rotate(0deg);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(0, 110vh, 0) rotate(540deg);
          }
        }
      `}</style>

      <div className="mx-auto max-w-5xl">
        <header className="glass-panel page-header overflow-hidden rounded-[28px] p-0">
          <div className="bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-6 py-8 sm:px-8">
            <p className="heading-font bg-gradient-to-r from-white via-[#D9ECFF] to-white bg-clip-text text-2xl font-normal uppercase tracking-[0.08em] text-transparent">
              Derby Digital
            </p>
            <h1 className="heading-font mt-5 text-3xl font-normal uppercase tracking-[0.05em] text-white sm:text-4xl">Client Onboarding</h1>
            <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
              Welcome to Derby Digital! Please fill out the following to get started.
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <aside className="glass-panel p-5 sm:p-6">
            <div className="glass-card rounded-2xl p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-blue-200/75">Business</p>
              <p className="heading-font mt-3 text-3xl font-normal uppercase tracking-[0.04em] text-white">{businessName}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Share the essentials for launch, communication, and current marketing so the Derby team can start with a complete picture.
              </p>
            </div>
          </aside>

          <div className="glass-panel relative overflow-hidden p-5 sm:p-6">
            {submitted ? (
              <div className="relative overflow-hidden rounded-[24px] border border-blue-300/20 bg-[linear-gradient(180deg,rgba(32,147,255,0.12),rgba(0,38,255,0.08))] p-8 text-center">
                {confetti.map((piece) => (
                  <span
                    key={piece.id}
                    className="absolute top-0 h-3 w-2 rounded-full bg-[linear-gradient(180deg,#2093FF,#ffffff)]"
                    style={{
                      left: piece.left,
                      animationName: "confetti-fall",
                      animationDelay: piece.delay,
                      animationDuration: piece.duration,
                      animationIterationCount: "infinite",
                    }}
                  />
                ))}
                <div className="relative z-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/15">
                    <CheckCircle2 className="h-8 w-8 text-blue-100" />
                  </div>
                  <h2 className="heading-font mt-5 text-3xl font-normal uppercase tracking-[0.04em] text-white">Thank You</h2>
                  <p className="mt-3 text-sm text-slate-200">Thank you! We will be in touch shortly.</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-slate-300">Business name</span>
                    <input value={businessName} readOnly className={`${fieldClassName()} cursor-not-allowed opacity-80`} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Owner/manager name</span>
                    <input value={form.ownerManagerName} onChange={(event) => setForm((current) => ({ ...current, ownerManagerName: event.target.value }))} className={fieldClassName()} required />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Best email</span>
                    <input type="email" value={form.bestEmail} onChange={(event) => setForm((current) => ({ ...current, bestEmail: event.target.value }))} className={fieldClassName()} required />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Best phone number</span>
                    <input value={form.bestPhone} onChange={(event) => setForm((current) => ({ ...current, bestPhone: event.target.value }))} className={fieldClassName()} required />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Website URL (if any)</span>
                    <input value={form.websiteUrl} onChange={(event) => setForm((current) => ({ ...current, websiteUrl: event.target.value }))} className={fieldClassName()} placeholder="https://example.com" />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-slate-300">Business address</span>
                    <input value={form.businessAddress} onChange={(event) => setForm((current) => ({ ...current, businessAddress: event.target.value }))} className={fieldClassName()} required />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Instagram</span>
                    <input value={form.instagramUrl} onChange={(event) => setForm((current) => ({ ...current, instagramUrl: event.target.value }))} className={fieldClassName()} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Facebook</span>
                    <input value={form.facebookUrl} onChange={(event) => setForm((current) => ({ ...current, facebookUrl: event.target.value }))} className={fieldClassName()} />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-slate-300">Google Business</span>
                    <input value={form.googleBusinessUrl} onChange={(event) => setForm((current) => ({ ...current, googleBusinessUrl: event.target.value }))} className={fieldClassName()} />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-slate-300">Business hours</span>
                    <input value={form.businessHours} onChange={(event) => setForm((current) => ({ ...current, businessHours: event.target.value }))} className={fieldClassName()} />
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-slate-300">Current marketing efforts</p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {MARKETING_EFFORTS.map((effort) => {
                      const selected = form.currentMarketingEfforts.includes(effort);
                      return (
                        <label
                          key={effort}
                          className={`glass-card flex cursor-pointer items-center justify-between gap-3 rounded-2xl p-4 transition ${
                            selected ? "border-blue-400/45 bg-blue-500/12" : ""
                          }`}
                        >
                          <span className="text-sm text-white">{effort}</span>
                          <input type="checkbox" checked={selected} onChange={() => toggleEffort(effort)} className="h-4 w-4 accent-[#2093FF]" />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">Monthly marketing budget range</span>
                    <select value={form.monthlyMarketingBudgetRange} onChange={(event) => setForm((current) => ({ ...current, monthlyMarketingBudgetRange: event.target.value }))} className={fieldClassName()}>
                      {BUDGET_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="glass-card flex items-center gap-3 rounded-2xl p-4">
                    <Sparkles className="h-4 w-4 text-blue-200" />
                    <p className="text-sm text-slate-300">Responses go directly onto your Derby Digital client record.</p>
                  </div>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-slate-300">What are your biggest challenges?</span>
                    <textarea value={form.biggestChallenges} onChange={(event) => setForm((current) => ({ ...current, biggestChallenges: event.target.value }))} rows={5} className={`${fieldClassName()} py-3`} />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm text-slate-300">Anything else we should know?</span>
                    <textarea value={form.additionalInfo} onChange={(event) => setForm((current) => ({ ...current, additionalInfo: event.target.value }))} rows={4} className={`${fieldClassName()} py-3`} />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,#2093FF,#0026FF)] px-4 py-2 text-sm font-semibold text-white transition hover:shadow-[0_0_24px_rgba(32,147,255,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  Submit Onboarding Form
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
