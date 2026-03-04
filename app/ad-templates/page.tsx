"use client";
import { useData } from "@/lib/hooks";
import { useState } from "react";
import { Plus, X, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

type Template = { id: string; headline: string; body: string; cta: string; type: string; style: string; niche: string; notes: string };

const typeColors: Record<string, string> = { Facebook: "bg-blue-500/20 text-blue-400", Instagram: "bg-pink-500/20 text-pink-400", Google: "bg-yellow-500/20 text-yellow-400" };
const styleColors: Record<string, string> = { "Direct Response": "bg-red-500/20 text-red-400", "Social Proof": "bg-green-500/20 text-green-400", Urgency: "bg-orange-500/20 text-orange-400", "Lead Gen": "bg-purple-500/20 text-purple-400" };

export default function AdTemplatesPage() {
  const { data: templates, loading, add, remove } = useData<Template[]>("/api/ad-templates", []);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterStyle, setFilterStyle] = useState("");
  const [filterNiche, setFilterNiche] = useState("");
  const [form, setForm] = useState({ headline: "", body: "", cta: "", type: "Facebook", style: "Direct Response", niche: "Restaurant", notes: "" });

  const filtered = templates.filter(t => (!filterType || t.type === filterType) && (!filterStyle || t.style === filterStyle) && (!filterNiche || t.niche === filterNiche));

  const handleCopy = (t: Template) => {
    navigator.clipboard.writeText(`${t.headline}\n\n${t.body}\n\n${t.cta}`);
    setCopied(t.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleAdd = async () => {
    if (!form.headline) return;
    await add(form);
    setForm({ headline: "", body: "", cta: "", type: "Facebook", style: "Direct Response", niche: "Restaurant", notes: "" });
    setShowForm(false);
  };

  if (loading) return <div className="text-muted-foreground">Loading templates...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ad Templates</h1>
        <div className="flex gap-3 items-center">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-card border border-border rounded px-3 py-1.5 text-sm">
            <option value="">All Types</option>
            <option>Facebook</option><option>Instagram</option><option>Google</option>
          </select>
          <select value={filterStyle} onChange={e => setFilterStyle(e.target.value)} className="bg-card border border-border rounded px-3 py-1.5 text-sm">
            <option value="">All Styles</option>
            <option>Direct Response</option><option>Social Proof</option><option>Urgency</option><option>Lead Gen</option>
          </select>
          <select value={filterNiche} onChange={e => setFilterNiche(e.target.value)} className="bg-card border border-border rounded px-3 py-1.5 text-sm">
            <option value="">All Niches</option>
            <option>Restaurant</option><option>Home Services</option><option>General</option>
          </select>
          <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
            <Plus size={16} /> Add Template
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm flex-1">{t.headline}</h3>
              <div className="flex gap-1 ml-2">
                <button onClick={() => handleCopy(t)} className="p-1 text-muted-foreground hover:text-foreground">
                  {copied === t.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
                <button onClick={() => remove(t.id)} className="p-1 text-muted-foreground hover:text-destructive"><X size={14} /></button>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${typeColors[t.type] || "bg-secondary"}`}>{t.type}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${styleColors[t.style] || "bg-secondary"}`}>{t.style}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary">{t.niche}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">{t.body}</p>
            <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="text-xs text-primary mt-2 flex items-center gap-1">
              {expanded === t.id ? <><ChevronUp size={12} /> Collapse</> : <><ChevronDown size={12} /> Expand</>}
            </button>
            {expanded === t.id && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm whitespace-pre-line mb-3">{t.body}</p>
                <div className="bg-primary/10 rounded-md p-2 mb-2">
                  <p className="text-xs text-muted-foreground">CTA</p>
                  <p className="text-sm font-medium text-primary">{t.cta}</p>
                </div>
                {t.notes && <p className="text-xs text-muted-foreground italic">💡 {t.notes}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">New Ad Template</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Headline" value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <textarea placeholder="Body Copy" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" rows={6} />
              <input placeholder="CTA" value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <div className="grid grid-cols-3 gap-3">
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="bg-secondary border border-border rounded px-3 py-2 text-sm">
                  <option>Facebook</option><option>Instagram</option><option>Google</option>
                </select>
                <select value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} className="bg-secondary border border-border rounded px-3 py-2 text-sm">
                  <option>Direct Response</option><option>Social Proof</option><option>Urgency</option><option>Lead Gen</option>
                </select>
                <select value={form.niche} onChange={e => setForm({ ...form, niche: e.target.value })} className="bg-secondary border border-border rounded px-3 py-2 text-sm">
                  <option>Restaurant</option><option>Home Services</option><option>General</option>
                </select>
              </div>
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" rows={2} />
              <button onClick={handleAdd} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:opacity-90">Add Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
