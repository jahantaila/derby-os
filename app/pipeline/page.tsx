"use client";
import { useData } from "@/lib/hooks";
import { useState } from "react";
import { Plus, X, DollarSign, TrendingUp, BarChart3 } from "lucide-react";

type Deal = { id: string; name: string; contact: string; email: string; dealValue: number; source: string; stage: string; daysInStage: number; notes: string };

const stages = [
  { id: "lead", label: "Lead", color: "border-gray-500" },
  { id: "contacted", label: "Contacted", color: "border-blue-500" },
  { id: "demo-scheduled", label: "Demo Scheduled", color: "border-purple-500" },
  { id: "demo-done", label: "Demo Done", color: "border-indigo-500" },
  { id: "proposal-sent", label: "Proposal Sent", color: "border-yellow-500" },
  { id: "closed-won", label: "Closed Won", color: "border-green-500" },
  { id: "closed-lost", label: "Closed Lost", color: "border-red-500" },
];

const sourceColors: Record<string, string> = { "cold-email": "bg-blue-500/20 text-blue-400", referral: "bg-green-500/20 text-green-400", inbound: "bg-purple-500/20 text-purple-400" };

export default function PipelinePage() {
  const { data: deals, loading, add, update, remove } = useData<Deal[]>("/api/pipeline", []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", email: "", dealValue: 0, source: "cold-email", notes: "" });

  const activeDeals = deals.filter(d => !d.stage.startsWith("closed"));
  const pipelineValue = activeDeals.reduce((s, d) => s + d.dealValue, 0);
  const won = deals.filter(d => d.stage === "closed-won").length;
  const lost = deals.filter(d => d.stage === "closed-lost").length;
  const convRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const handleAdd = async () => {
    if (!form.name) return;
    await add({ ...form, stage: "lead", daysInStage: 0 });
    setForm({ name: "", contact: "", email: "", dealValue: 0, source: "cold-email", notes: "" });
    setShowForm(false);
  };

  const moveDeal = async (deal: Deal, newStage: string) => {
    await update({ ...deal, stage: newStage, daysInStage: 0 });
  };

  if (loading) return <div className="text-muted-foreground">Loading pipeline...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sales Pipeline</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
          <Plus size={16} /> Add Deal
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><BarChart3 size={16} /> Total Deals</div>
          <div className="text-2xl font-bold">{deals.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><DollarSign size={16} /> Pipeline Value</div>
          <div className="text-2xl font-bold">${pipelineValue.toLocaleString()}/mo</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><TrendingUp size={16} /> Win Rate</div>
          <div className="text-2xl font-bold">{convRate}%</div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div key={stage.id} className={`border-t-2 ${stage.color} bg-card/50 rounded-lg p-3 min-w-[200px] flex-1`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">{stage.label}</h3>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {deals.filter(d => d.stage === stage.id).length}
              </span>
            </div>
            <div className="space-y-2">
              {deals.filter(d => d.stage === stage.id).map(deal => (
                <div key={deal.id} className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors group">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-sm">{deal.name}</h4>
                    <button onClick={() => remove(deal.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><X size={14} /></button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{deal.contact}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-green-400">${deal.dealValue}/mo</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sourceColors[deal.source] || ""}`}>{deal.source.replace("-", " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{deal.daysInStage}d in stage</p>
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select onChange={e => { if (e.target.value) moveDeal(deal, e.target.value); e.target.value = ""; }} defaultValue="" className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs">
                      <option value="" disabled>Move to...</option>
                      {stages.filter(s => s.id !== stage.id).map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">New Deal</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Business Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <input placeholder="Contact Name" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <input type="number" placeholder="Deal Value ($/mo)" value={form.dealValue || ""} onChange={e => setForm({ ...form, dealValue: Number(e.target.value) })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm">
                <option value="cold-email">Cold Email</option>
                <option value="referral">Referral</option>
                <option value="inbound">Inbound</option>
              </select>
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" rows={3} />
              <button onClick={handleAdd} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:opacity-90">Add Deal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
