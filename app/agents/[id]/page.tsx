"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AgentHistoryEntry, AgentRecord } from "@/lib/agents";
import { documentContentToHtml, formatDocumentCategory, formatDocumentDateTime } from "@/lib/documents-helpers";
import { DocumentRecord } from "@/lib/documents-types";

type SoulResponse = {
  content: string | null;
  error?: string;
};

type AgentDetailPageProps = {
  params: {
    id: string;
  };
};

function sortHistory(history: AgentHistoryEntry[]) {
  return [...history].sort((a, b) => toTimestampMs(b.timestamp) - toTimestampMs(a.timestamp));
}

function parseTimestamp(value: string): Date | null {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  const localMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!localMatch) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = localMatch;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  const asDate = new Date(year, month - 1, day, hour, minute);
  return Number.isNaN(asDate.getTime()) ? null : asDate;
}

function toTimestampMs(value: string): number {
  const parsed = parseTimestamp(value);
  return parsed ? parsed.getTime() : Number.NEGATIVE_INFINITY;
}

function formatTimestamp(value: string): string {
  const parsed = parseTimestamp(value);
  if (!parsed) return value;

  return parsed.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

export default function AgentDetailPage({ params }: AgentDetailPageProps) {
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [soul, setSoul] = useState<string | null>("Loading SOUL...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [agentRes, soulRes, documentsRes] = await Promise.all([
          fetch("/api/agents?type=agent", { cache: "no-store" }),
          fetch(`/api/agents/${params.id}/soul`, { cache: "no-store" }),
          fetch(`/api/documents?agentId=${params.id}`, { cache: "no-store" }),
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
          setSoul(soulData.content);
        } else {
          setSoul("SOUL content unavailable.");
        }

        if (documentsRes.ok) {
          const documentData = (await documentsRes.json()) as DocumentRecord[];
          setDocuments(documentData);
        } else {
          setDocuments([]);
        }
      } catch {
        if (!active) return;
        setAgent(null);
        setSoul("Failed to load SOUL content.");
        setDocuments([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [params.id]);

  const history = useMemo(() => sortHistory(agent?.history ?? []), [agent?.history]);
  const sessionLog = history.slice(0, 4);
  const lastActive = history[0] ? formatTimestamp(history[0].timestamp) : "No activity recorded";
  const selectedDocument = useMemo(
    () => (selectedDocumentId ? documents.find((document) => document.id === selectedDocumentId) ?? null : null),
    [documents, selectedDocumentId],
  );

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
          <h1 className="heading-font text-2xl font-normal uppercase tracking-[0.04em] text-white">Agent not found</h1>
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

      <section className={`glass-panel p-5 sm:p-8 ${isLive ? "live-view-active" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Live View</p>
            <h1 className="mt-3 page-title">{agent.name}</h1>
            <p className="mt-2 text-base text-slate-300">{agent.role}</p>
            <p className="mt-1 text-sm uppercase tracking-[0.16em] text-slate-400">{agent.department}</p>
          </div>
          <span className={`agent-type ${agent.type === "agent" ? "ai" : agent.type === "ceo" ? "ceo" : "employee"}`}>
            {agent.type === "agent" ? "AI Agent" : agent.type === "ceo" ? "CEO" : "Employee"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className={`status-dot ${isLive ? "live" : "idle"}`} />
              <span className="capitalize">{agent.status}</span>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-sm text-slate-300">
                Model: {agent.model ?? "N/A"}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="live-stat-card">
                <p className="live-stat-label">Current Task</p>
                <p className="live-stat-value">{agent.currentTask || (isLive ? "Waiting on next step" : "Agent is idle - no active session")}</p>
              </div>
              <div className="live-stat-card">
                <p className="live-stat-label">Last Active</p>
                <p className="live-stat-value">{lastActive}</p>
              </div>
            </div>
          </div>

          <div className="live-log-panel">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Session Log</h2>
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Recent output</span>
            </div>
            <div className="mt-4 space-y-2 font-mono text-sm text-slate-300">
              {isLive ? (
                sessionLog.length > 0 ? (
                  sessionLog.map((entry) => (
                    <div key={`${entry.timestamp}-${entry.action}`} className="live-log-line">
                      <span className="text-blue-200">[{formatTimestamp(entry.timestamp)}]</span> {entry.action}
                    </div>
                  ))
                ) : (
                  <div className="live-log-line">No session output yet.</div>
                )
              ) : (
                <div className="live-log-line">Agent is idle - no active session</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="section-title">SOUL</h2>
        <div className="soul-markdown mt-4 rounded-xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <ReactMarkdown>{soul || "No SOUL content found."}</ReactMarkdown>
        </div>
      </section>

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="section-title">Skills</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {agent.skills.length === 0 ? (
            <span className="text-sm text-slate-400">No listed skills.</span>
          ) : (
            agent.skills.map((skill) => (
              <span key={skill} className="rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-sm text-blue-100">
                {skill}
              </span>
            ))
          )}
        </div>
      </section>

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="section-title">History</h2>
        <div className="agent-timeline mt-6">
          {history.length === 0 ? (
            <p className="text-sm text-slate-400">No activity recorded.</p>
          ) : (
            history.map((entry) => (
              <div key={`${entry.timestamp}-${entry.action}`} className="agent-timeline-item">
                <div className="agent-timeline-time">{formatTimestamp(entry.timestamp)}</div>
                <div className="agent-timeline-marker" aria-hidden="true" />
                <div className="agent-timeline-content">{entry.action}</div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="glass-panel p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Documents</h2>
          <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{documents.length} linked</span>
        </div>

        {documents.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-slate-400">No documents yet</div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {documents.map((document) => (
              <button
                key={document.id}
                type="button"
                onClick={() => setSelectedDocumentId(document.id)}
                className="glass-card w-full p-4 text-left transition hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-white">{document.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{formatDocumentDateTime(document.updatedAt)} ET</p>
                  </div>
                  <FileText size={16} className="shrink-0 text-blue-200" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-blue-400/35 bg-blue-500/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-100">
                    {formatDocumentCategory(document.category)}
                  </span>
                  {document.clientId ? (
                    <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                      {document.clientId}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedDocument ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setSelectedDocumentId(null)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            aria-label="Close document"
          />
          <div className="absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-white/12 bg-[linear-gradient(180deg,rgba(7,10,18,0.97),rgba(10,10,15,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:max-w-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-blue-200">{formatDocumentCategory(selectedDocument.category)}</p>
                <h2 className="heading-font mt-1 text-3xl font-normal uppercase tracking-[0.04em] text-white">{selectedDocument.title}</h2>
                <p className="mt-2 text-sm text-slate-400">{formatDocumentDateTime(selectedDocument.updatedAt)} ET</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDocumentId(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 text-slate-200 transition hover:border-blue-300/40 hover:bg-blue-500/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="glass-panel p-4 sm:p-5">
              <div className="document-content" dangerouslySetInnerHTML={{ __html: documentContentToHtml(selectedDocument.content) }} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
