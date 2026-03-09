"use client";

import Link from "next/link";
import { AgentRecord } from "@/lib/agents";

type AgentCardProps = {
  agent: AgentRecord;
  large?: boolean;
  hrefBase?: "/agents" | "/employees";
};

export function AgentCard({ agent, large = false, hrefBase = "/agents" }: AgentCardProps) {
  const isLive = agent.status === "active" || agent.status === "working";
  const accentClass = agent.type === "ceo" ? "card-accent-ceo" : agent.type === "employee" ? "card-accent-employee" : "card-accent-agent";

  return (
    <Link
      href={`${hrefBase}/${agent.id}`}
      className={`glass-card block animate-enter ${large ? "p-6 sm:p-7" : "p-5"} agent-card-link ${accentClass}`}
      aria-label={`Open ${agent.name} details`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`${large ? "text-xl" : "text-lg"} font-semibold text-white`}>{agent.name}</p>
          <p className="text-sm text-slate-400">{agent.role}</p>
        </div>
        <span className={`agent-type ${agent.type === "agent" ? "ai" : agent.type === "ceo" ? "ceo" : "employee"}`}>
          {agent.type === "agent" ? "AI" : agent.type === "ceo" ? "CEO" : "Employee"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
        <span className={`status-dot ${isLive ? "live" : "idle"}`} />
        <span className="capitalize">{agent.status}</span>
        {agent.model ? (
          <span className="ml-2 rounded-full border border-white/15 px-2 py-0.5 text-xs text-slate-300">{agent.model}</span>
        ) : null}
      </div>

      <p className="mt-4 text-sm text-slate-300">{agent.currentTask || "-"}</p>
    </Link>
  );
}
