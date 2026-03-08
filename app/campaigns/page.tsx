"use client";

import { useData } from "@/lib/hooks";
import type { Campaign } from "@/lib/mission-control";

export default function CampaignsPage() {
  const { data: campaigns, loading } = useData<Campaign[]>("/api/campaigns", []);

  if (loading) return <div className="text-sm text-slate-300">Loading campaigns...</div>;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold text-white">Campaigns</h1>
        <p className="mt-1 text-sm text-slate-300">Cross-client campaign view (placeholder until direct platform APIs are connected).</p>
      </div>

      <div className="glass-surface overflow-x-auto rounded-2xl p-3">
        <table className="w-full min-w-[900px] text-sm text-slate-200">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Campaign</th>
              <th className="px-3 py-2 text-left">Platform</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Budget</th>
              <th className="px-3 py-2 text-left">Spend</th>
              <th className="px-3 py-2 text-left">Leads</th>
              <th className="px-3 py-2 text-left">CPL</th>
              <th className="px-3 py-2 text-left">CTR</th>
              <th className="px-3 py-2 text-left">Last Optimized</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="px-3 py-2">{campaign.clientName}</td>
                <td className="px-3 py-2">{campaign.campaignName}</td>
                <td className="px-3 py-2">{campaign.platform}</td>
                <td className="px-3 py-2">{campaign.status}</td>
                <td className="px-3 py-2">${campaign.budgetMonthly.toLocaleString()}</td>
                <td className="px-3 py-2">${campaign.spendMonth.toLocaleString()}</td>
                <td className="px-3 py-2">{campaign.leads}</td>
                <td className="px-3 py-2">${campaign.cpl.toFixed(2)}</td>
                <td className="px-3 py-2">{campaign.ctr.toFixed(2)}%</td>
                <td className="px-3 py-2">{campaign.lastOptimized}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
