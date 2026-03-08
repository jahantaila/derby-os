"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { useData } from "@/lib/hooks";
import type { Department, TeamMember } from "@/lib/mission-control";

const statusClasses: Record<TeamMember["status"], string> = {
  active: "bg-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.7)]",
  idle: "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.55)]",
  offline: "bg-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.35)]",
};

const departmentOrder: Department[] = ["Executive", "Marketing", "Development"];

export default function TeamPage() {
  const { data: team, loading, add } = useData<TeamMember[]>("/api/team", []);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "",
    department: "Marketing" as Department,
    type: "AI" as TeamMember["type"],
    model: "",
  });

  const membersByDepartment = useMemo(
    () => departmentOrder.map((department) => ({ department, members: team.filter((member) => member.department === department) })),
    [team],
  );

  const jahan = team.find((member) => member.name === "Jahan");
  const kimberly = team.find((member) => member.name === "Kimberly");
  const directs = team.filter((member) => !["Jahan", "Kimberly"].includes(member.name));

  if (loading) {
    return <div className="text-sm text-slate-300">Loading team...</div>;
  }

  return (
    <section className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Team</h1>
          <p className="mt-1 text-sm text-slate-300">Org hierarchy, department coverage, and agent status telemetry.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="derby-gradient rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <span className="inline-flex items-center gap-2">
            <Plus size={16} /> Add Team Member
          </span>
        </button>
      </div>

      <article className="glass-surface rounded-2xl p-6">
        <h2 className="mb-5 text-lg font-semibold text-white">Org Chart</h2>
        <div className="space-y-5">
          {jahan ? (
            <div className="mx-auto max-w-sm rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
              <p className="font-semibold text-white">{jahan.name}</p>
              <p className="text-xs text-slate-300">{jahan.role}</p>
            </div>
          ) : null}

          <div className="mx-auto h-8 w-px bg-white/20" />

          {kimberly ? (
            <div className="mx-auto max-w-sm rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
              <p className="font-semibold text-white">{kimberly.name}</p>
              <p className="text-xs text-slate-300">{kimberly.role}</p>
            </div>
          ) : null}

          <div className="mx-auto h-8 w-px bg-white/20" />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {directs.map((member) => (
              <div key={member.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-center">
                <p className="font-medium text-white">{member.name}</p>
                <p className="text-xs text-slate-300">{member.role}</p>
                <p className="mt-1 text-[11px] text-blue-100">{member.department}</p>
              </div>
            ))}
          </div>
        </div>
      </article>

      {membersByDepartment.map((group) => (
        <section key={group.department} className="space-y-3">
          <h3 className="text-sm uppercase tracking-[0.2em] text-blue-200/80">{group.department}</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.members.map((member) => (
              <article key={member.id} className="glass-surface rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{member.name}</h4>
                    <p className="text-sm text-slate-300">{member.role}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      member.type === "AI"
                        ? "border border-blue-300/35 bg-blue-500/15 text-blue-100"
                        : "border border-emerald-300/35 bg-emerald-500/15 text-emerald-100"
                    }`}
                  >
                    {member.type}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-200">
                  <p className="flex items-center justify-between">
                    <span className="text-slate-400">Model</span>
                    <span>{member.model ?? "N/A"}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${statusClasses[member.status]}`} />
                      {member.status}
                    </span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-slate-400">Current Task</span>
                    <span className="max-w-[60%] truncate text-right">{member.currentTask || "None"}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-slate-400">Skills Loaded</span>
                    <span>{member.skillsCount}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-slate-400">Tasks Completed</span>
                    <span>{member.tasksCompleted}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span className="text-slate-400">Last Active</span>
                    <span>{new Date(member.lastActive).toLocaleString()}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {isAdding ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4" onClick={() => setIsAdding(false)}>
          <div className="glass-surface w-full max-w-md rounded-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-white">Add Team Member</h3>
            <div className="space-y-3">
              <input
                placeholder="Name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              />
              <input
                placeholder="Role"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              />
              <select
                value={form.department}
                onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value as Department }))}
                className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
              >
                {departmentOrder.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as TeamMember["type"] }))}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
                >
                  <option value="AI">AI</option>
                  <option value="Human">Human</option>
                </select>
                <input
                  placeholder="Model (if AI)"
                  value={form.model}
                  onChange={(event) => setForm((prev) => ({ ...prev, model: event.target.value }))}
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition focus:border-blue-400/80"
                />
              </div>
              <button
                onClick={async () => {
                  if (!form.name.trim() || !form.role.trim()) return;
                  await add({
                    name: form.name,
                    role: form.role,
                    department: form.department,
                    type: form.type,
                    model: form.type === "AI" ? form.model || "Sonnet" : null,
                    status: "idle",
                    currentTask: "",
                    skillsCount: form.type === "AI" ? 8 : 0,
                    tasksCompleted: 0,
                    lastActive: new Date().toISOString(),
                  });
                  setIsAdding(false);
                }}
                className="derby-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <span className="inline-flex items-center gap-2">
                  <Users size={15} /> Save Member
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
