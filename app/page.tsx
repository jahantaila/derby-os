import { AgentGroups } from "@/components/agents/agent-groups";

type Stat = {
  label: string;
  value: string;
};

type Activity = {
  text: string;
  time: string;
};

const stats: Stat[] = [
  { label: "Active Agents", value: "4" },
  { label: "Total Clients", value: "3" },
  { label: "Tasks in Progress", value: "5" },
  { label: "AI Cost Today", value: "$4.45" },
];

const activity: Activity[] = [
  { text: "Sabri completed Bluegrass PPC campaign plan", time: "2h ago" },
  { text: "Alex generated Olympus proposal", time: "1d ago" },
  { text: "Kevin started Mission Control V3 rebuild", time: "just now" },
  { text: "Kimberly set up Google Ads API", time: "1d ago" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <section className="animate-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="page-title">Mission Control</h1>
        <p className="mt-2 text-sm text-slate-400">Bird&apos;s-eye view of Derby Digital operations.</p>
      </section>

      <AgentGroups />

      <section className="animate-enter" style={{ animationDelay: "300ms" }}>
        <h2 className="section-title">Quick Stats</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat, index) => (
            <article key={stat.label} className="glass-card p-5 animate-enter" style={{ animationDelay: `${340 + index * 60}ms` }}>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="animate-enter" style={{ animationDelay: "420ms" }}>
        <h2 className="section-title">Recent Activity</h2>
        <div className="glass-panel mt-4 p-4 sm:p-5">
          <ul className="space-y-2">
            {activity.map((item, index) => (
              <li
                key={`${item.text}-${item.time}`}
                className="activity-row animate-enter"
                style={{ animationDelay: `${460 + index * 70}ms` }}
              >
                <span className="text-sm text-slate-200">{item.text}</span>
                <span className="text-xs uppercase tracking-[0.12em] text-slate-400">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
