"use client";
import { useData } from "@/lib/hooks";
import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, Crosshair, AlertTriangle } from "lucide-react";

type Competitor = { id: string; name: string; pricing: string; threatLevel?: string; weaknesses: string[]; ourAdvantage: string; lastUpdated: string; salesAmmo: string[]; details: string };

const threatColors: Record<string, string> = { high: "bg-red-500/20 text-red-400", medium: "bg-yellow-500/20 text-yellow-400", low: "bg-green-500/20 text-green-400" };
const threatIcons: Record<string, string> = { high: "🔴", medium: "🟡", low: "🟢" };

export default function CompetitorsPage() {
  const { data: competitors, loading } = useData<Competitor[]>("/api/competitors", []);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) return <div className="text-muted-foreground">Loading competitors...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Competitor Intel</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield size={16} /> {competitors.length} competitors tracked
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8">
        {competitors.map(comp => (
          <div key={comp.id} className="bg-card border border-border rounded-lg p-5 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center text-lg font-bold">{comp.name[0]}</div>
                <div>
                  <h3 className="font-semibold text-lg">{comp.name}</h3>
                  <p className="text-sm text-muted-foreground">{comp.pricing}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {comp.threatLevel && (
                  <span className={`text-xs px-2 py-1 rounded-full ${threatColors[comp.threatLevel] || ""}`}>
                    {threatIcons[comp.threatLevel] || ""} {comp.threatLevel} threat
                  </span>
                )}
                <button onClick={() => setExpanded(expanded === comp.id ? null : comp.id)} className="p-1 text-muted-foreground hover:text-foreground">
                  {expanded === comp.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Key Weaknesses</p>
                <ul className="space-y-1">
                  {comp.weaknesses.slice(0, 3).map((w, i) => <li key={i} className="text-sm text-red-400">• {w}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Crosshair size={12} /> Our Advantage</p>
                <p className="text-sm text-green-400">{comp.ourAdvantage}</p>
              </div>
            </div>

            {expanded === comp.id && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Full Intel</p>
                  <p className="text-sm">{comp.details}</p>
                </div>
                {comp.weaknesses.length > 3 && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">All Weaknesses</p>
                    <ul className="space-y-1">
                      {comp.weaknesses.map((w, i) => <li key={i} className="text-sm text-red-400">• {w}</li>)}
                    </ul>
                  </div>
                )}
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-primary mb-2">🎯 Sales Ammunition</p>
                  <ul className="space-y-1">
                    {comp.salesAmmo.map((a, i) => <li key={i} className="text-sm">💬 &ldquo;{a}&rdquo;</li>)}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Last updated: {comp.lastUpdated}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
