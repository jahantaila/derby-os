"use client";
import { useData } from "@/lib/hooks";
import { useState } from "react";
import { Plus, X, ArrowLeft } from "lucide-react";

type Project = { id: string; name: string; description: string; progress: number; status: string; lastUpdated: string; color: string };

export default function ProjectsPage() {
  const { data: projects, loading, add, update, remove } = useData<Project[]>("/api/projects", []);
  const [selected, setSelected] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", progress: 0, color: "#6366f1" });

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft size={16} /> Back to Projects
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: selected.color }} />
          <h1 className="text-2xl font-bold">{selected.name}</h1>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selected.status}</span>
        </div>
        <p className="text-muted-foreground mb-6">{selected.description}</p>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-2xl font-bold">{selected.progress}%</p>
            <div className="w-full bg-secondary rounded-full h-2 mt-2">
              <div className="h-2 rounded-full transition-all" style={{ width: `${selected.progress}%`, backgroundColor: selected.color }} />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-2xl font-bold capitalize">{selected.status}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="text-lg font-semibold">{new Date(selected.lastUpdated).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input type="range" min="0" max="100" value={selected.progress} onChange={e => { const p = { ...selected, progress: Number(e.target.value) }; setSelected(p); update(p); }} className="flex-1" />
          <span className="text-sm text-muted-foreground w-12">{selected.progress}%</span>
        </div>
        <button onClick={() => { remove(selected.id); setSelected(null); }} className="mt-6 text-sm text-destructive hover:underline">Delete Project</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1">
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => (
          <button key={p.id} onClick={() => setSelected(p)} className="text-left bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: p.color }} />
              <h3 className="font-semibold">{p.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground capitalize">{p.status}</span>
              <span className="text-xs font-medium">{p.progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${p.progress}%`, backgroundColor: p.color }} />
            </div>
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">New Project</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Project name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" rows={3} />
              <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full h-10" />
              <button onClick={async () => { await add({ ...form, status: "active", lastUpdated: new Date().toISOString() }); setShowForm(false); }} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium">Create Project</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
