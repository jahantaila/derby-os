"use client";
import { useData } from "@/lib/hooks";
import { useState } from "react";
import { Plus, X, ArrowLeft, FileText } from "lucide-react";

type Doc = { id: string; title: string; category: string; format: string; createdAt: string; preview: string; filename: string };

const categoryColors: Record<string, string> = {
  research: "bg-blue-500/20 text-blue-400",
  copy: "bg-green-500/20 text-green-400",
  plan: "bg-purple-500/20 text-purple-400",
  template: "bg-yellow-500/20 text-yellow-400",
  report: "bg-red-500/20 text-red-400",
};

export default function DocsPage() {
  const { data: docs, loading, add, remove } = useData<Doc[]>("/api/docs", []);
  const [filterCat, setFilterCat] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", category: "plan", preview: "" });

  const filtered = docs.filter(d =>
    (!filterCat || d.category === filterCat) &&
    (!search || d.title.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1">
          <Plus size={16} /> New Doc
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <input placeholder="Search docs..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 bg-card border border-border rounded px-3 py-1.5 text-sm max-w-xs" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-card border border-border rounded px-3 py-1.5 text-sm">
          <option value="">All Categories</option>
          <option value="research">Research</option>
          <option value="copy">Copy</option>
          <option value="plan">Plan</option>
          <option value="template">Template</option>
          <option value="report">Report</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(doc => (
          <div key={doc.id} className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors group">
            <div className="flex items-start justify-between mb-2">
              <FileText size={20} className="text-muted-foreground" />
              <button onClick={() => remove(doc.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><X size={14} /></button>
            </div>
            <h3 className="font-semibold text-sm mb-1">{doc.title}</h3>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{doc.preview}</p>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[doc.category] || ""}`}>{doc.category}</span>
              <span className="text-xs text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">New Document</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm">
                <option value="research">Research</option><option value="copy">Copy</option><option value="plan">Plan</option><option value="template">Template</option><option value="report">Report</option>
              </select>
              <textarea placeholder="Preview/Description" value={form.preview} onChange={e => setForm({ ...form, preview: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" rows={3} />
              <button onClick={async () => { await add({ ...form, format: "md", createdAt: new Date().toISOString(), filename: `${form.title.toLowerCase().replace(/\s+/g, "-")}.md` }); setShowForm(false); }} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium">Create Doc</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
