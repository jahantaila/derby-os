import { AgentGroups } from "@/components/agents/agent-groups";

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <section className="animate-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="page-title">Agents</h1>
        <p className="mt-2 text-sm text-slate-400">Department view of Derby Digital team operations.</p>
      </section>

      <AgentGroups title="All Agents" largeCards />
    </div>
  );
}
