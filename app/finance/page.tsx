"use client";
import { useData } from "@/lib/hooks";
import { DollarSign, TrendingUp, TrendingDown, Percent } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type FinanceData = { months: { month: string; revenue: number; expenses: Record<string, number>; profit: number }[] };

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function FinancePage() {
  const { data, loading } = useData<FinanceData>("/api/finance", { months: [] });

  if (loading) return <div className="text-muted-foreground">Loading finance...</div>;

  const latest = data.months[data.months.length - 1];
  if (!latest) return <div className="text-muted-foreground">No financial data yet.</div>;

  const totalExpenses = Object.values(latest.expenses).reduce((s, v) => s + v, 0);
  const margin = Math.round((latest.profit / latest.revenue) * 100);
  const expenseBreakdown = Object.entries(latest.expenses).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  const profitHistory = data.months.map(m => ({ month: m.month, profit: m.profit, revenue: m.revenue }));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Finance</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign size={14} /> Revenue</div>
          <div className="text-xl font-bold">${latest.revenue.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingDown size={14} /> Expenses</div>
          <div className="text-xl font-bold">${totalExpenses.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><TrendingUp size={14} /> Profit</div>
          <div className="text-xl font-bold text-green-400">${latest.profit.toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Percent size={14} /> Margin</div>
          <div className="text-xl font-bold">{margin}%</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {data.months.map(m => {
          const exp = Object.values(m.expenses).reduce((s, v) => s + v, 0);
          const mar = Math.round((m.profit / m.revenue) * 100);
          return (
            <div key={m.month} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-3">{m.month}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span>${m.revenue.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="text-red-400">-${exp.toLocaleString()}</span></div>
                <div className="border-t border-border pt-2 flex justify-between font-medium"><span>Profit</span><span className="text-green-400">${m.profit.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Margin</span><span>{mar}%</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Expenses Breakdown</p>
                {Object.entries(m.expenses).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground capitalize">{k}</span>
                    <span>${v.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-4">Profit Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={profitHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" tick={{ fill: "#888", fontSize: 12 }} />
              <YAxis tick={{ fill: "#888", fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} formatter={(v: number) => [`$${v.toLocaleString()}`]} />
              <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-4">Expense Breakdown (Current)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }} formatter={(v: number) => [`$${v.toLocaleString()}`]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
