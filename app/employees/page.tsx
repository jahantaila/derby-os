import { AgentGroups } from "@/components/agents/agent-groups";

export default function EmployeesPage() {
  return (
    <div className="space-y-8">
      <section className="glass-panel page-header animate-enter p-5 sm:p-6" style={{ animationDelay: "40ms" }}>
        <p className="text-[11px] uppercase tracking-[0.24em] text-blue-200/70">Team</p>
        <h1 className="page-title mt-2">Employees</h1>
        <p className="mt-2 text-sm text-slate-400">Human team members grouped by department.</p>
      </section>

      <AgentGroups title="Employee Team" largeCards type="employee" hrefBase="/employees" />
    </div>
  );
}
