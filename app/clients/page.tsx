"use client";
import { useData } from "@/lib/hooks";
import { useState } from "react";
import { Plus, X, Users, DollarSign, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

type Client = { id: string; name: string; type: string; monthlyRevenue: number; services: string[]; status: string; lastContact: string; healthScore: number; contact: { email: string; phone: string }; notes: string };

const statusColors: Record<string, string> = { active: "bg-green-500/20 text-green-400", onboarding: "bg-blue-500/20 text-blue-400", paused: "bg-yellow-500/20 text-yellow-400" };
const healthColor = (s: number) => s >= 80 ? "text-green-400" : s >= 60 ? "text-yellow-400" : "text-red-400";

export default function ClientsPage() {
  const { data: clients, loading, add, update, remove } = useData<Client[]>("/api/clients", []);
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "restaurant", monthlyRevenue: 0, services: [] as string[], status: "onboarding", contact: { email: "", phone: "" }, notes: "" });

  const filtered = clients.filter(c => (!filterType || c.type === filterType) && (!filterStatus || c.status === filterStatus));
  const totalMRR = clients.reduce((s, c) => s + c.monthlyRevenue, 0);
  const avgRevenue = clients.length ? Math.round(totalMRR / clients.length) : 0;

  const handleAdd = async () => {
    if (!form.name) return;
    await add({ ...form, healthScore: 80, lastContact: new Date().toISOString().split("T")[0], createdAt: new Date().toISOString() });
    setForm({ name: "", type: "restaurant", monthlyRevenue: 0, services: [], status: "onboarding", contact: { email: "", phone: "" }, notes: "" });
    setShowForm(false);
  };

  const toggleService = (svc: string) => {
    setForm(f => ({ ...f, services: f.services.includes(svc) ? f.services.filter(s => s !== svc) : [...f.services, svc] }));
  };

  if (loading) return <div className="text-muted-foreground">Loading clients...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <div className="flex gap-3 items-center">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-card border border-border rounded px-3 py-1.5 text-sm">
            <option value="">All Types</option>
            <option value="restaurant">Restaurant</option>
            <option value="home-services">Home Services</option>
            <option value="other">Other</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-card border border-border rounded px-3 py-1.5 text-sm">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="paused">Paused</option>
          </select>
          <button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 hover:opacity-90">
            <Plus size={16} /> Add Client
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Users size={16} /> Total Clients</div>
          <div className="text-2xl font-bold">{clients.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><DollarSign size={16} /> Total MRR</div>
          <div className="text-2xl font-bold">${totalMRR.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><TrendingUp size={16} /> Avg Revenue/Client</div>
          <div className="text-2xl font-bold">${avgRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Revenue</th>
              <th className="text-left p-3 font-medium">Services</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Health</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(client => (
              <>
                <tr key={client.id} className="border-b border-border/50 hover:bg-accent/50 cursor-pointer" onClick={() => setExpanded(expanded === client.id ? null : client.id)}>
                  <td className="p-3 font-medium">{client.name}</td>
                  <td className="p-3 capitalize">{client.type.replace("-", " ")}</td>
                  <td className="p-3">${client.monthlyRevenue}/mo</td>
                  <td className="p-3">
                    <div className="flex gap-1">{client.services.map(s => <span key={s} className="text-xs bg-secondary px-2 py-0.5 rounded-full">{s}</span>)}</div>
                  </td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[client.status] || ""}`}>{client.status}</span></td>
                  <td className={`p-3 font-medium ${healthColor(client.healthScore)}`}>{client.healthScore}%</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {expanded === client.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <button onClick={e => { e.stopPropagation(); remove(client.id); }} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                    </div>
                  </td>
                </tr>
                {expanded === client.id && (
                  <tr key={`${client.id}-detail`} className="border-b border-border/50 bg-secondary/30">
                    <td colSpan={7} className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Contact</p>
                          <p className="text-sm">{client.contact.email}</p>
                          <p className="text-sm">{client.contact.phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Last Contact</p>
                          <p className="text-sm">{client.lastContact}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm">{client.notes}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">New Client</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Business Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm">
                <option value="restaurant">Restaurant</option>
                <option value="home-services">Home Services</option>
                <option value="other">Other</option>
              </select>
              <input type="number" placeholder="Monthly Revenue" value={form.monthlyRevenue || ""} onChange={e => setForm({ ...form, monthlyRevenue: Number(e.target.value) })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Services</p>
                <div className="flex gap-2">
                  {["ads", "website", "software"].map(svc => (
                    <button key={svc} onClick={() => toggleService(svc)} className={`text-xs px-3 py-1 rounded-full border ${form.services.includes(svc) ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground"}`}>{svc}</button>
                  ))}
                </div>
              </div>
              <input placeholder="Email" value={form.contact.email} onChange={e => setForm({ ...form, contact: { ...form.contact, email: e.target.value } })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <input placeholder="Phone" value={form.contact.phone} onChange={e => setForm({ ...form, contact: { ...form.contact, phone: e.target.value } })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" />
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm" rows={3} />
              <button onClick={handleAdd} className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:opacity-90">Add Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
