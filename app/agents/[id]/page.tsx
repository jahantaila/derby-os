"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AgentRecord } from "@/lib/agents";

type SoulResponse = {
  content?: string;
  error?: string;
};

type AgentDetailPageProps = {
  params: {
    id: string;
  };
};

function buildCalendar(now: Date) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const leading = first.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const today = now.getDate();

  return {
    monthLabel: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
    cells: Array.from({ length: totalCells }, (_, index) => {
      const day = index - leading + 1;
      if (day < 1 || day > daysInMonth) return null;
      return { day, isToday: day === today };
    }),
  };
}

export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [soul, setSoul] = useState("Loading SOUL...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [agentRes, soulRes] = await Promise.all([
          fetch("/api/agents?type=agent", { cache: "no-store" }),
          fetch(`/api/agents/${params.id}/soul`, { cache: "no-store" }),
        ]);

        if (!active) return;

        if (agentRes.ok) {
          const allAgents = (await agentRes.json()) as AgentRecord[];
          setAgent(allAgents.find((entry) => entry.id === params.id) ?? null);
        } else {
          setAgent(null);
        }

        if (soulRes.ok) {
          const soulData = (await soulRes.json()) as SoulResponse;
          setSoul(soulData.content || "No SOUL content found.");
        } else {
          setSoul("SOUL file unavailable.");
        }
      } catch {
        if (!active) return;
        setAgent(null);
        setSoul("Failed to load SOUL content.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [params.id]);

  const calendar = useMemo(() => buildCalendar(new Date()), []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        <div className="glass-panel p-8 text-sm text-slate-300">Loading agent details...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
        <div className="glass-panel p-8">
          <h1 className="text-2xl font-semibold text-white">Agent not found</h1>
          <p className="mt-2 text-sm text-slate-400">No agent found for ID: {params.id}</p>
        </div>
      </div>
    );
  }

  const isLive = agent.status === "active" || agent.status === "working";

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200">
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <section className="glass-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{agent.name}</h1>
            <p className="mt-2 text-base text-slate-300">{agent.role}</p>
            <p className="mt-1 text-sm uppercase tracking-[0.16em] text-slate-400">{agent.department}</p>
          </div>
          <span className={`agent-type ${agent.type === "agent" ? "ai" : agent.type === "ceo" ? "ceo" : "employee"}`}>
            {agent.type === "agent" ? "AI Agent" : agent.type === "ceo" ? "CEO" : "Employee"}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className={`status-dot ${isLive ? "live" : "idle"}`} />
          <span className="capitalize">{agent.status}</span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-slate-300">
            Model: {agent.model ?? "N/A"}
          </span>
          <span className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-slate-300">
            Current Task: {agent.currentTask || "-"}
          </span>
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-8">
        <h2 className="section-title">SOUL</h2>
        <div className="soul-markdown mt-4 rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <ReactMarkdown>{soul}</ReactMarkdown>
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-8">
        <h2 className="section-title">Skills</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {agent.skills.length === 0 ? (
            <span className="text-sm text-slate-400">No listed skills.</span>
          ) : (
            agent.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-xs text-blue-100">
                {skill}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="glass-panel p-6 sm:p-8">
        <h2 className="section-title">History</h2>
        <p className="mt-2 text-sm text-slate-400">{calendar.monthLabel}</p>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {calendar.cells.map((cell, idx) => (
            <div
              key={`${idx}-${cell?.day ?? "blank"}`}
              className={`agent-calendar-cell ${cell?.isToday ? "today" : ""} ${cell ? "" : "empty"}`}
            >
              {cell?.day ?? ""}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
