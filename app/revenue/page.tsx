"use client";
import { useData } from "@/lib/hooks";
import { DollarSign, Target, Users, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, ReferenceLine, Legend } from "recharts";

type RevenueData = {
  mrr: number; arr: number; target: number; totalClients: number; avgRevenuePerClient: number;
  mrrHistory: { month: string; mrr: number }[];
  byType: { name: string; value: number }[];
  byService: { name: string; value: number }[];
};

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function RevenuePage() {
  const { data, loading } = useData<RevenueData>("/api/revenue", { mrr: 0, arr: 0, target: 0, totalClients: 0, avgRevenuePerClient: 0, mrrHistory: [], byType: [], byService: [] });

  if (loading) return <div className="text-muted-foreground">Loading revenue...</div>;

  const targetMonthly = Math.round(data.target / 12);
  const progressPct = Math.round((data.arr / data.target) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
        <div className="text-sm text-muted-foreground">Target: $1M ARR ({progressPct}% achieved)</div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign size={14} /> Current MRR</div>
          <div className="text-xl font-bold">${data.mrr.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp size={14} /> ARR</div>
          <div className="text-xl font-bold">${data.arr.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Target size={14} /> Target</div>
          <div className="text-xl font-bold">$1M</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Users size={14} /> Clients</div>
          <div className="text-xl font-bold">{data.totalClients}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign size={14} /> Avg/Client</div>
          <div className="text-xl font-bold">${data.avgRevenuePerClient}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-4">MRR Growth</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.mrrHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 12 }} />
              <YAxis tick={{ fill: "#888", fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "MRR"]} />
              <ReferenceLine y={targetMonthly} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `Target: $${(targetMonthly / 1000).toFixed(0)}k`, fill: "#ef4444", fontSize: 11 }} />
              <Line type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-4">Revenue by Client Type</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.byType} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {data.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold text-sm mb-4">Revenue by Service</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.byService}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 12 }} />
            <YAxis tick={{ fill: "#888", fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
