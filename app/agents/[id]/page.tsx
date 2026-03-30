import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TEAM_SEED } from "@/lib/agents-data";
import { getAgentTasks, getLiveOfficeAgents, OFFICE_AGENT_ACCENTS, type OfficeAgentId } from "@/lib/office-live";

type PageProps = {
  params: {
    id: string;
  };
};

function toTs(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "No timestamp";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildTimeline(agentHistory: Array<{ timestamp: string; action: string }>, tasks: Awaited<ReturnType<typeof getAgentTasks>>) {
  const taskEvents = tasks.flatMap((task) => {
    const entries = [];
    if (task.updated_at) {
      entries.push({
        timestamp: task.updated_at,
        action: `${task.title} moved to ${task.status.replaceAll("_", " ")}`,
      });
    }
    if (task.created_at) {
      entries.push({
        timestamp: task.created_at,
        action: `Task created: ${task.title}`,
      });
    }
    return entries;
  });

  return [...agentHistory, ...taskEvents].sort((a, b) => toTs(b.timestamp) - toTs(a.timestamp)).slice(0, 10);
}

export default async function AgentDetailPage({ params }: PageProps) {
  const agentId = params.id as OfficeAgentId;
  const baseAgent = TEAM_SEED.find((agent) => agent.id === agentId);

  if (!baseAgent || !(agentId in OFFICE_AGENT_ACCENTS)) {
    notFound();
  }

  const [liveAgents, tasks] = await Promise.all([getLiveOfficeAgents(), getAgentTasks(agentId)]);
  const liveAgent = liveAgents.find((agent) => agent.id === agentId);
  const recentTasks = [...tasks].sort((a, b) => toTs(b.updated_at ?? b.created_at) - toTs(a.updated_at ?? a.created_at)).slice(0, 8);
  const currentTask = liveAgent?.task ?? null;
  const timeline = buildTimeline(baseAgent.history, tasks);
  const status = liveAgent?.status ?? "idle";
  const accent = OFFICE_AGENT_ACCENTS[agentId];

  return (
    <div className="space-y-6">
      <Link href="/office" className="inline-flex items-center gap-2 text-sm text-blue-200 transition hover:text-white">
        <ArrowLeft size={16} />
        Back to office
      </Link>

      <section className="page-header overflow-hidden rounded-[1.6rem] border border-white/12 bg-[linear-gradient(160deg,rgba(9,14,22,0.92),rgba(16,24,39,0.78))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="section-title">Agent Detail</p>
            <h1 className="page-title mt-3">{baseAgent.name}</h1>
            <p className="mt-2 text-base text-slate-300">{baseAgent.role}</p>
            <p className="mt-1 text-sm uppercase tracking-[0.16em] text-slate-500">{baseAgent.department}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span
              className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ borderColor: `${accent}66`, color: accent, backgroundColor: `${accent}18` }}
            >
              {baseAgent.department}
            </span>
            <span
              className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{
                borderColor: status === "working" ? "rgba(34,197,94,0.5)" : "rgba(255,189,89,0.5)",
                color: status === "working" ? "#7ee787" : "#ffd166",
                backgroundColor: status === "working" ? "rgba(34,197,94,0.1)" : "rgba(255,189,89,0.1)",
              }}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Current Task</p>
            <p className="mt-3 text-xl font-semibold text-white">{currentTask ?? "Idle"}</p>
            <p className="mt-2 text-sm text-slate-400">
              Live status is derived from Supabase tasks with status <code>in_progress</code>.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Model</p>
              <p className="mt-3 text-lg font-semibold text-white">{baseAgent.model ?? "N/A"}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Recent Tasks</p>
              <p className="mt-3 text-lg font-semibold text-white">{tasks.length}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Skills</p>
              <p className="mt-3 text-lg font-semibold text-white">{baseAgent.skills.length}</p>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Last Event</p>
              <p className="mt-3 text-lg font-semibold text-white">{timeline[0] ? formatDateTime(timeline[0].timestamp) : "No activity"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div className="glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Recent Task History</h2>
            <span className="text-xs uppercase tracking-[0.16em] text-slate-500">{recentTasks.length} shown</span>
          </div>
          <div className="mt-5 space-y-3">
            {recentTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/12 px-4 py-8 text-sm text-slate-400">No Supabase tasks found for this agent.</div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="rounded-[1.2rem] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-white">{task.title}</h3>
                      <p className="mt-1 text-sm text-slate-400">{task.client || "Derby Digital"}</p>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                      {task.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Priority: {task.priority || "medium"}</span>
                    <span>Updated: {formatDateTime(task.updated_at ?? task.created_at)}</span>
                    {task.due_date ? <span>Due: {formatDateTime(task.due_date)}</span> : null}
                  </div>
                  {task.description ? <p className="mt-3 text-sm text-slate-300">{task.description}</p> : null}
                  {task.notes ? <p className="mt-2 text-sm text-slate-400">{task.notes}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="glass-panel p-5 sm:p-6">
            <h2 className="section-title">Activity Timeline</h2>
            <div className="agent-timeline mt-6">
              {timeline.length === 0 ? (
                <p className="text-sm text-slate-400">No activity recorded.</p>
              ) : (
                timeline.map((entry) => (
                  <div key={`${entry.timestamp}-${entry.action}`} className="agent-timeline-item">
                    <div className="agent-timeline-time">{formatDateTime(entry.timestamp)}</div>
                    <div className="agent-timeline-marker" aria-hidden="true" />
                    <div className="agent-timeline-content">{entry.action}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="glass-panel p-5 sm:p-6">
            <h2 className="section-title">Skills</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {baseAgent.skills.length === 0 ? (
                <span className="text-sm text-slate-400">No listed skills.</span>
              ) : (
                baseAgent.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border px-3 py-1 text-sm"
                    style={{ borderColor: `${accent}55`, color: "#dce8ff", backgroundColor: `${accent}12` }}
                  >
                    {skill}
                  </span>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
