"use client";

import type { AgentRecord } from "@/lib/agents-data";

type OfficeSceneProps = {
  agents: AgentRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function OfficeScene({ agents, selectedId, onSelect }: OfficeSceneProps) {
  return (
    <div className="flex h-[680px] items-center justify-center rounded-[28px] border border-white/10 bg-[#0a0a0f] text-sm text-slate-400">
      <button type="button" onClick={() => onSelect(selectedId === agents[0]?.id ? null : agents[0]?.id)}>
        Office scene placeholder
      </button>
    </div>
  );
}
