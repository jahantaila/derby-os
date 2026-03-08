"use client";
import { useData } from "@/lib/hooks";
import { UtensilsCrossed, ShoppingCart, DollarSign, BarChart3 } from "lucide-react";

type DerbyFlowData = {
  platformStatus: string;
  tenants: { id: string; name: string; slug: string; plan: string; mrr: number; orderCount: number; menuItems: number; status: string }[];
  stats: { totalOrders: number; totalRevenue: number; avgOrderValue: number };
};

const planColors: Record<string, string> = { starter: "bg-gray-500/20 text-gray-400", basic: "bg-gray-500/20 text-gray-400", pro: "bg-blue-500/20 text-blue-400", enterprise: "bg-purple-500/20 text-purple-400" };
const statusColors: Record<string, string> = { active: "bg-green-500/20 text-green-400", onboarding: "bg-yellow-500/20 text-yellow-400" };

export default function DerbyFlowPage() {
  const { data, loading } = useData<DerbyFlowData>("/api/derbyflow", { platformStatus: "", tenants: [], stats: { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 } });

  if (loading) return <div className="text-muted-foreground">Loading DerbyFlow...</div>;

  const totalMRR = data.tenants.reduce((s, t) => s + t.mrr, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">DerbyFlow Admin</h1>
          <p className="text-sm text-muted-foreground">Platform Status: <span className="text-yellow-400 capitalize">{data.platformStatus}</span></p>
        </div>
        <div className="text-xs text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">Will connect to real API later</div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><UtensilsCrossed size={14} /> Total Tenants</div>
          <div className="text-xl font-bold">{data.tenants.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ShoppingCart size={14} /> Total Orders</div>
          <div className="text-xl font-bold">{data.stats.totalOrders.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign size={14} /> Revenue Processed</div>
          <div className="text-xl font-bold">${data.stats.totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><BarChart3 size={14} /> Avg Order Value</div>
          <div className="text-xl font-bold">${data.stats.avgOrderValue}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-3 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold text-sm">Tenants</h3>
          <span className="text-xs text-muted-foreground">MRR: ${totalMRR}/mo</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="text-left p-3 font-medium">Restaurant</th>
              <th className="text-left p-3 font-medium">Slug</th>
              <th className="text-left p-3 font-medium">Plan</th>
              <th className="text-left p-3 font-medium">MRR</th>
              <th className="text-left p-3 font-medium">Orders</th>
              <th className="text-left p-3 font-medium">Menu Items</th>
              <th className="text-left p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.tenants.map(t => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-accent/50">
                <td className="p-3 font-medium">{t.name}</td>
                <td className="p-3 text-muted-foreground font-mono text-xs">{t.slug}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${planColors[t.plan] || ""}`}>{t.plan}</span></td>
                <td className="p-3">${t.mrr}</td>
                <td className="p-3">{t.orderCount.toLocaleString()}</td>
                <td className="p-3">{t.menuItems}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[t.status] || ""}`}>{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
