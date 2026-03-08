type Agent = {
  name: string;
  role: string;
  type: "AI" | "Human";
  model?: string;
  status: "Active" | "Working" | "Idle";
  task?: string;
};

type Stat = {
  label: string;
  value: string;
};

type Activity = {
  text: string;
  time: string;
};

const agents: Agent[] = [
  { name: "Jahan", role: "CEO", type: "Human", status: "Active", task: "Reviewing campaigns" },
  { name: "Kimberly", role: "Chief of Staff", type: "AI", model: "Opus", status: "Active", task: "Coordinating team" },
  { name: "Alex", role: "Marketing Analyst", type: "AI", model: "Sonnet", status: "Idle" },
  { name: "Sabri", role: "Ad Producer", type: "AI", model: "Sonnet", status: "Working", task: "Bluegrass campaign" },
  { name: "Kevin", role: "Developer", type: "AI", model: "Codex", status: "Working", task: "Mission Control V3" },
  { name: "Hamza", role: "Landing Pages", type: "Human", status: "Working", task: "Bluegrass landing page" },
];

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

      <section className="animate-enter" style={{ animationDelay: "120ms" }}>
        <h2 className="section-title">Agent Status</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent, index) => {
            const isLive = agent.status === "Active" || agent.status === "Working";
            return (
              <article
                key={agent.name}
                className="glass-card p-5 animate-enter"
                style={{ animationDelay: `${180 + index * 50}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{agent.name}</p>
                    <p className="text-sm text-slate-400">{agent.role}</p>
                  </div>
                  <span className={`agent-type ${agent.type === "AI" ? "ai" : "human"}`}>{agent.type}</span>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                  <span className={`status-dot ${isLive ? "live" : "idle"}`} />
                  <span>{agent.status}</span>
                  {agent.model ? <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">{agent.model}</span> : null}
                </div>

                <p className="mt-4 text-sm text-slate-300">{agent.task ? agent.task : "-"}</p>
              </article>
            );
          })}
        </div>
      </section>

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
