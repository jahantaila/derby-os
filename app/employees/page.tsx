import { AgentGroups } from "@/components/agents/agent-groups";

export default function EmployeesPage() {
  return (
    <div className="space-y-8">
      <section className="animate-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="page-title">Employees</h1>
        <p className="mt-2 text-sm text-slate-400">Human team members grouped by department.</p>
      </section>

      <AgentGroups title="Employee Team" largeCards type="employee" hrefBase="/employees" />
    </div>
  );
}
