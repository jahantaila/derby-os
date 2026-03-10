import {
  Bell,
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Database,
  Globe,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ServerCog,
  Settings2,
  Users,
  XCircle,
} from "lucide-react";
import { getAgents, type AgentRecord } from "@/lib/agents";

type IntegrationStatus = "connected" | "pending" | "not-connected";

const agencyProfile = [
  { label: "Company Name", value: "Derby Digital", icon: Building2 },
  { label: "Email", value: "hello@derbydigital.com", icon: Mail },
  { label: "Phone", value: "(502) 555-0147", icon: Phone },
  { label: "Address", value: "Louisville, KY", icon: MapPin },
] as const;

const integrations: Array<{
  name: string;
  description: string;
  status: IntegrationStatus;
  detail: string;
  icon: typeof Globe;
}> = [
  { name: "Vercel", description: "Primary app hosting and preview deployments.", status: "connected", detail: "Hobby plan", icon: Globe },
  { name: "Redis", description: "Persistent storage backing finance and operational state.", status: "connected", detail: "30MB", icon: Database },
  { name: "Meta Ads API", description: "Campaign reporting and creative analysis pipeline.", status: "connected", detail: "Active connection", icon: Bot },
  { name: "Google Ads API", description: "Ads account access is staged behind test credentials.", status: "pending", detail: "Test account", icon: Clock3 },
  { name: "Instantly.ai", description: "Outbound campaign sync and webhook ingestion.", status: "connected", detail: "Connected", icon: Mail },
  { name: "GoHighLevel", description: "CRM and automation handoff is not configured yet.", status: "not-connected", detail: "Not connected", icon: ServerCog },
  { name: "Stripe", description: "Billing and payments are reserved for a future rollout.", status: "not-connected", detail: "Not connected", icon: CreditCard },
];

const notifications = [
  { label: "Discord notifications", enabled: true },
  { label: "Email notifications", enabled: true },
  { label: "Sub-agent completion alerts", enabled: true },
  { label: "Daily summary emails", enabled: false },
] as const;

function formatEasternTime(date: Date) {
  return date.toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

function maskSecret(value: string | undefined) {
  if (!value) return "Not configured";
  const visible = value.slice(-4);
  return `${"*".repeat(Math.max(8, value.length - 4))}${visible}`;
}

function statusLabel(status: IntegrationStatus) {
  if (status === "connected") return "Connected";
  if (status === "pending") return "Pending";
  return "Not Connected";
}

function statusClass(status: IntegrationStatus) {
  if (status === "connected") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "pending") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-slate-400/20 bg-slate-500/10 text-slate-300";
}

function memberTypeLabel(member: AgentRecord) {
  if (member.type === "ceo") return "CEO";
  if (member.type === "agent") return "Agent";
  return "Employee";
}

function memberStatusClass(status: AgentRecord["status"]) {
  if (status === "active" || status === "working") return "text-emerald-200";
  if (status === "idle") return "text-amber-100";
  return "text-slate-400";
}

function memberStatusLabel(status: AgentRecord["status"]) {
  if (status === "active") return "Active";
  if (status === "working") return "Working";
  if (status === "idle") return "Idle";
  return "Offline";
}

export default async function SettingsPage() {
  const members = await getAgents();
  const sortedMembers = [...members].sort((a, b) => {
    const typeOrder = { ceo: 0, agent: 1, employee: 2 } as const;
    return typeOrder[a.type] - typeOrder[b.type] || a.department.localeCompare(b.department) || a.name.localeCompare(b.name);
  });

  const apiKeys = [
    { label: "Instantly API Key", value: maskSecret(process.env.INSTANTLY_API_KEY) },
    { label: "Redis URL", value: maskSecret(process.env.REDIS_URL) },
    { label: "Cron Secret", value: maskSecret(process.env.CRON_SECRET) },
    { label: "Meta Ads API", value: "********1A2B" },
    { label: "Google Ads API", value: "Not configured" },
    { label: "Stripe Secret", value: "Not configured" },
  ];

  return (
    <div className="space-y-8">
      <section className="glass-panel page-header animate-enter p-5 sm:p-6" style={{ animationDelay: "40ms" }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Operations</p>
            <h1 className="page-title mt-2">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">Agency identity, team roster, integrations, and notification defaults in one place.</p>
          </div>
          <div className="glass-card inline-flex items-center gap-3 self-start rounded-2xl px-4 py-3 text-sm text-slate-200">
            <Clock3 className="text-blue-200" size={16} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Eastern Time</p>
              <p>{formatEasternTime(new Date())}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="glass-panel animate-enter p-5 sm:p-6" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-100">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="section-title">Agency Profile</h2>
              <p className="mt-1 text-sm text-slate-400">Read-only agency details for Mission Control.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {agencyProfile.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="glass-card rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-blue-100">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                      <p className="mt-1 text-sm text-white">{item.value}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="glass-panel animate-enter p-5 sm:p-6" style={{ animationDelay: "140ms" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-100">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="section-title">Notifications</h2>
              <p className="mt-1 text-sm text-slate-400">Visual toggles only. No backend wiring yet.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {notifications.map((item) => (
              <div key={item.label} className="glass-card flex items-center justify-between rounded-2xl p-4">
                <div>
                  <p className="text-sm text-white">{item.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{item.enabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div
                  className={`flex h-7 w-12 items-center rounded-full border p-1 transition ${
                    item.enabled ? "border-blue-400/40 bg-[linear-gradient(135deg,#2093FF,#0026FF)] justify-end" : "border-white/10 bg-white/5 justify-start"
                  }`}
                  aria-hidden="true"
                >
                  <span className="h-5 w-5 rounded-full bg-white/90 shadow-[0_4px_12px_rgba(0,0,0,0.35)]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="glass-panel animate-enter p-5 sm:p-6" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-100">
            <Users size={18} />
          </div>
          <div>
            <h2 className="section-title">Team Members</h2>
            <p className="mt-1 text-sm text-slate-400">All agents and employees with their current roles, model assignments, and statuses.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {sortedMembers.map((member) => (
            <article key={member.id} className="glass-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="heading-font text-xl font-normal uppercase tracking-[0.04em] text-white">{member.name}</p>
                  <p className="mt-1 text-sm text-slate-300">{member.role}</p>
                </div>
                <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-blue-100">
                  {memberTypeLabel(member)}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Department</p>
                  <p className="mt-1 text-sm text-slate-200">{member.department}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Model</p>
                  <p className="mt-1 text-sm text-slate-200">{member.model ?? "Human"}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Status</p>
                  <p className={`mt-1 text-sm ${memberStatusClass(member.status)}`}>{memberStatusLabel(member.status)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel animate-enter p-5 sm:p-6" style={{ animationDelay: "220ms" }}>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-100">
            <Settings2 size={18} />
          </div>
          <div>
            <h2 className="section-title">Integrations</h2>
            <p className="mt-1 text-sm text-slate-400">Connection health across the services Mission Control depends on.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <article key={integration.name} className="glass-card rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-blue-100">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{integration.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{integration.detail}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${statusClass(integration.status)}`}>
                    {statusLabel(integration.status)}
                  </span>
                </div>
                <p className="mt-4 text-sm text-slate-300">{integration.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="glass-panel animate-enter p-5 sm:p-6" style={{ animationDelay: "260ms" }}>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-100">
            <KeyRound size={18} />
          </div>
          <div>
            <h2 className="section-title">API Keys</h2>
            <p className="mt-1 text-sm text-slate-400">Masked values only. Last four characters stay visible when a key is configured.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {apiKeys.map((item) => (
            <article key={item.label} className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-white">{item.label}</p>
                {item.value === "Not configured" ? <XCircle size={16} className="text-slate-500" /> : <CheckCircle2 size={16} className="text-emerald-300" />}
              </div>
              <p className="mt-3 font-mono text-sm text-slate-300">{item.value}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
