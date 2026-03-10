import { ReceiptText } from "lucide-react";

const INVOICE_FEATURES = [
  "Auto-generated invoices",
  "Payment link generation",
  "Recurring billing",
  "Payment status tracking",
] as const;

export default function InvoicesPage() {
  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="glass-panel page-header p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Finance</p>
            <h1 className="page-title mt-2">Invoices</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Track payments, generate invoices, and manage billing</p>
          </div>
          <div className="glass-card inline-flex items-center gap-3 self-start rounded-2xl px-4 py-3 text-sm text-slate-200">
            <ReceiptText size={16} className="text-blue-200" />
            Stripe Prep
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="glass-panel flex min-h-[280px] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-blue-100">
            <ReceiptText size={24} />
          </div>
          <div>
            <h2 className="heading-font text-2xl font-normal uppercase tracking-[0.04em] text-white">Coming Soon</h2>
            <p className="mt-2 text-sm text-slate-400">Stripe integration required to generate invoices. Coming soon.</p>
          </div>
        </section>

        <section className="glass-panel p-5 sm:p-6">
          <h2 className="section-title">What you'll get</h2>
          <div className="mt-4 space-y-3">
            {INVOICE_FEATURES.map((feature) => (
              <div key={feature} className="glass-card rounded-2xl p-4">
                <p className="text-sm text-slate-200">{feature}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
