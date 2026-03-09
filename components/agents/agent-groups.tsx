"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentRecord } from "@/lib/agents";
import { AgentCard } from "@/components/agents/agent-card";

type AgentGroupsProps = {
  title?: string;
  largeCards?: boolean;
  type?: "agent" | "employee";
  hrefBase?: "/agents" | "/employees";
};

type Department = "Executive" | "Marketing" | "Development" | "Fulfillment";

const DEPARTMENTS: Array<{ id: Department; accentClass: string }> = [
  { id: "Executive", accentClass: "department-executive" },
  { id: "Marketing", accentClass: "department-marketing" },
  { id: "Development", accentClass: "department-development" },
  { id: "Fulfillment", accentClass: "department-fulfillment" },
];

export function AgentGroups({ title = "Agent Status", largeCards = false, type = "agent", hrefBase = "/agents" }: AgentGroupsProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      try {
        const res = await fetch(`/api/agents?type=${type}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as AgentRecord[];
        if (active) setAgents(data);
      } catch {
        // Ignore transient API errors and keep last known state.
      }
    };

    refresh();
    const interval = setInterval(refresh, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [type]);

  const grouped = useMemo(() => {
    return DEPARTMENTS.map((dept) => ({
      ...dept,
      agents: agents.filter((agent) => agent.department === dept.id),
    })).filter((group) => group.agents.length > 0);
  }, [agents]);

  return (
    <section className="animate-enter" style={{ animationDelay: "120ms" }}>
      <h2 className="section-title">{title}</h2>
      <div className="mt-4 space-y-5">
        {grouped.map((group, groupIndex) => (
          <div key={group.id} className="glass-panel p-4 sm:p-5 animate-enter" style={{ animationDelay: `${180 + groupIndex * 80}ms` }}>
            <div className={`department-header ${group.accentClass}`}>{group.id}</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {group.agents.map((agent, index) => (
                <div key={agent.id} style={{ animationDelay: `${220 + index * 50}ms` }}>
                  <AgentCard agent={agent} large={largeCards} hrefBase={hrefBase} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
