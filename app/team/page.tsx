"use client";

import { useData } from "@/lib/hooks";
import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

type Member = {
  id: string;
  name: string;
  role: string;
  status: string;
  currentTask: string;
  model: string;
  avatar: string;
  type: string;
};

function statusMeta(status: string) {
  const value = (status || "").toLowerCase();
  if (["working", "active", "busy", "coding"].includes(value)) {
    return { label: "Active", dot: "status-dot status-active" };
  }
  if (["water-cooler", "away", "chatting", "break"].includes(value)) {
    return { label: "Away", dot: "status-dot status-away" };
  }
  return { label: "Idle", dot: "status-dot status-idle" };
}

export default function TeamPage() {
  const { data: team, loading, add, remove } = useData<Member[]>("/api/team", []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", model: "", type: "agent" });

  const leadership = useMemo(() => team.find((m) => m.type === "human"), [team]);
  const agents = useMemo(() => team.filter((m) => m.type !== "human"), [team]);
  const activeAgents = useMemo(
    () => agents.filter((m) => ["working", "active", "busy", "coding"].includes((m.status || "").toLowerCase())).length,
    [agents],
  );

  if (loading) {
    return <div className="text-sm text-slate-300">Loading team telemetry...</div>;
  }

  return (
    <section className="space-y-7">
      <div className="glass-surface relative overflow-hidden rounded-3xl px-6 py-8">
        <div className="pointer-events-none absolute -top-20 right-[-4rem] h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(32,147,255,0.35),rgba(32,147,255,0)_70%)]" />
        <p className="text-xs uppercase tracking-[0.28em] text-blue-200/75">Derby Digital</p>
        <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">Team Control Center</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
          Build Derby Digital into a $1M ARR agency by combining elite operators with always-on AI execution.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-blue-100">{team.length} total members</span>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-emerald-100">{activeAgents} active now</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Agent Roster</h2>
        <button
          onClick={() => setShowForm(true)}
          className="derby-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white transition duration-300 hover:opacity-90"
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={16} />
            Add Member
          </span>
        </button>
      </div>

      {leadership ? (
        <div className="glass-surface rounded-2xl p-5">
          <p className="mb-4 text-xs uppercase tracking-[0.24em] text-blue-200/75">Leadership</p>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-5xl">{leadership.avatar || "🧑‍💼"}</span>
            <div>
              <h3 className="text-xl font-semibold text-white">{leadership.name}</h3>
              <p className="text-sm text-slate-300">{leadership.role}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-200">
                <span className={statusMeta(leadership.status).dot} />
                {statusMeta(leadership.status).label}
              </div>
              {leadership.currentTask ? <p className="mt-2 text-sm text-slate-300">{leadership.currentTask}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((member) => {
          const meta = statusMeta(member.status);
          return (
            <article
              key={member.id}
              className="glass-surface group relative overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5 hover:border-white/30"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(32,147,255,0.35),rgba(32,147,255,0)_70%)] opacity-80" />
              <button
                onClick={() => remove(member.id)}
                className="absolute right-3 top-3 rounded-md border border-white/10 bg-white/5 p-1 text-slate-300 opacity-0 transition hover:border-red-400/40 hover:text-red-200 group-hover:opacity-100"
              >
                <X size={14} />
              </button>

              <span className="text-4xl">{member.avatar || "🤖"}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{member.name}</h3>
              <p className="text-sm text-slate-300">{member.role}</p>

              <div className="mt-3 flex items-center gap-2 text-xs text-slate-200">
                <span className={meta.dot} />
                {meta.label}
                <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-slate-300">
                  {member.model || "Unknown"}
                </span>
              </div>

              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                {member.currentTask || "Standing by for assignments."}
              </p>
            </article>
          );
        })}
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4" onClick={() => setShowForm(false)}>
          <div className="glass-surface w-full max-w-md rounded-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add Team Member</h3>
              <button onClick={() => setShowForm(false)} className="rounded-md border border-white/10 p-1 text-slate-300">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                placeholder="Name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              />
              <input
                placeholder="Role"
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              />
              <input
                placeholder="Model (e.g. GPT-5)"
                value={form.model}
                onChange={(event) => setForm({ ...form, model: event.target.value })}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              />
              <button
                onClick={async () => {
                  await add({ ...form, status: "idle", currentTask: "", avatar: "🤖" });
                  setShowForm(false);
                }}
                className="derby-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white transition duration-300 hover:opacity-90"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
