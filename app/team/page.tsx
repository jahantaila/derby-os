"use client";
import { useData } from "@/lib/hooks";
import { Plus, X } from "lucide-react";
import { useState } from "react";

type Member = { id: string; name: string; role: string; status: string; currentTask: string; model: string; avatar: string; type: string };

export default function TeamPage() {
  const { data: team, loading, add, remove } = useData<Member[]>("/api/team", []);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", model: "", type: "agent" });

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  const boss = team.find(m => m.type === "human");
  const agents = team.filter(m => m.type === "agent");

  return (
    <div>
      <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-lg p-6 mb-8 text-center">
        <p className="text-lg font-semibold">🎯 Mission</p>
        <p className="text-muted-foreground mt-1">Build Derby Digital into a $1M ARR agency by leveraging AI, custom software, and systematized fulfillment</p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Team</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1">
          <Plus size={16} /> Add Member
        </button>
      </div>

      {boss && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Leadership</h2>
          <div className="bg-card border border-border rounded-lg p-6 flex items-center gap-4 max-w-md">
            <span className="text-4xl">{boss.avatar}</span>
            <div>
              <h3 className="font-bold text-lg">{boss.name}</h3>
              <p className="text-sm text-muted-foreground">{boss.role}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${boss.status === "active" ? "bg-green-400" : "bg-gray-400"}`} />
                <span className="text-xs text-muted-foreground">{boss.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{boss.currentTask}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">AI Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(m => (
            <div key={m.id} className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors group relative">
              <button onClick={() => remove(m.id)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><X size={14} /></button>
              <span className="text-3xl">{m.avatar}</span>
              <h3 className="font-semibold mt-2">{m.name}</h3>
              <p className="text-sm text-muted-foreground">{m.role}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full ${m.status === "active" ? "bg-green-400" : "bg-gray-400"}`} />
                <span className="text-xs">{m.status}</span>
                <span className="text-xs text-muted-foreground ml-auto">{m.model}</span>
              </div>
              {m.currentTask && <p className="text-xs text-muted-foreground mt-2 bg-secondary px-2 py-1 rounded">{m.currentTask}</p>}
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Add Team Member</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <input placeholder="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <input placeholder="Model (e.g. Claude Sonnet)" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <button onClick={async () => { await add({ ...form, status: "idle", currentTask: "", avatar: "🤖" }); setShowForm(false); }} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium">Add Member</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
