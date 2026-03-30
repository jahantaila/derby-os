"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AgentData = {
  id: string;
  name: string;
  role: string;
  department: string;
  accent: string;
  status: "idle" | "working";
  task: string | null;
};

const AGENT_DETAILS: Record<string, {
  emoji: string;
  description: string;
  skills: { label: string; color: string }[];
  layer: "executive" | "operations" | "meta";
}> = {
  kimberly: {
    emoji: "🔥",
    description: "Coordinates, delegates, tracks progress, QAs output. The first point of contact between Jahan and the team.",
    skills: [
      { label: "Orchestration", color: "#2093FF" },
      { label: "QA", color: "#2093FF" },
      { label: "Strategy", color: "#2093FF" },
      { label: "Delegation", color: "#2093FF" },
    ],
    layer: "executive",
  },
  alex: {
    emoji: "📊",
    description: "Finds leads, tracks competitors, analyzes ad performance, builds campaign proposals and market research reports.",
    skills: [
      { label: "Research", color: "#F93C3C" },
      { label: "Analytics", color: "#F93C3C" },
      { label: "Proposals", color: "#F93C3C" },
    ],
    layer: "operations",
  },
  sabri: {
    emoji: "✍️",
    description: "Writes all copy. Ad copy, landing pages, blog articles, email sequences, website content. Direct-response style.",
    skills: [
      { label: "Copy", color: "#F93C3C" },
      { label: "SEO", color: "#F93C3C" },
      { label: "Landing Pages", color: "#F93C3C" },
    ],
    layer: "operations",
  },
  jordan: {
    emoji: "🎯",
    description: "Manages CRM, scrapes leads, enriches data, handles bulk operations, API integrations, and GHL automations.",
    skills: [
      { label: "CRM", color: "#22C55E" },
      { label: "Scraping", color: "#22C55E" },
      { label: "Data Ops", color: "#22C55E" },
    ],
    layer: "operations",
  },
  kevin: {
    emoji: "⚡",
    description: "Builds features, ships code, handles frontend and backend. Derby OS, DerbyFlow, client websites, API integrations.",
    skills: [
      { label: "Code", color: "#FFBD59" },
      { label: "Systems", color: "#FFBD59" },
      { label: "Deploy", color: "#FFBD59" },
    ],
    layer: "meta",
  },
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: status === "working" ? "#22C55E" : "#555",
        display: "inline-block",
        boxShadow: status === "working" ? "0 0 8px #22C55E" : "none",
      }}
    />
  );
}

function AgentCard({
  agent,
  details,
  large,
  onClick,
}: {
  agent: AgentData;
  details: (typeof AGENT_DETAILS)[string];
  large?: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? "rgba(255,255,255,0.08)"
          : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? agent.accent + "60" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        padding: large ? "28px 32px" : "20px 24px",
        cursor: "pointer",
        transition: "all 0.2s ease",
        width: large ? "100%" : undefined,
        maxWidth: large ? 560 : 260,
        position: "relative" as const,
        overflow: "hidden",
      }}
    >
      {/* Accent glow */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${agent.accent}, transparent)`,
          opacity: hovered ? 0.8 : 0.3,
          transition: "opacity 0.2s",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <span style={{ fontSize: large ? 32 : 24 }}>{details.emoji}</span>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: large ? 20 : 16,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "-0.01em",
              }}
            >
              {agent.name}
            </span>
            <StatusDot status={agent.status} />
          </div>
          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
            {agent.role}
          </span>
        </div>
      </div>

      <p
        style={{
          fontSize: 13,
          color: "#8896a8",
          lineHeight: 1.5,
          margin: "0 0 14px 0",
        }}
      >
        {details.description}
      </p>

      {/* Task indicator */}
      {agent.task && (
        <div
          style={{
            fontSize: 12,
            color: "#22C55E",
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 6,
            padding: "4px 10px",
            marginBottom: 12,
            display: "inline-block",
          }}
        >
          ● {agent.task}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {details.skills.map((skill) => (
          <span
            key={skill.label}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: skill.color,
              background: skill.color + "18",
              borderRadius: 4,
              padding: "3px 8px",
              letterSpacing: "0.02em",
            }}
          >
            {skill.label}
          </span>
        ))}
      </div>

      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          color: "#556677",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        ROLE CARD <span style={{ fontSize: 14 }}>→</span>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agent-status");
        const data = await res.json();
        setAgents(data);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const getAgent = (id: string) =>
    agents.find((a) => a.id === id) || {
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      role: "",
      department: "",
      accent: "#2093FF",
      status: "idle" as const,
      task: null,
    };

  const workingCount = agents.filter((a) => a.status === "working").length;

  return (
    <div style={{ minHeight: "100vh", padding: "40px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-0.02em",
            margin: "0 0 8px 0",
          }}
        >
          Meet the Team
        </h1>
        <p style={{ fontSize: 16, color: "#8896a8", margin: "0 0 6px 0" }}>
          {agents.length} AI agents, each with a real role and a real personality.
        </p>
        <p style={{ fontSize: 14, color: "#556677", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
          We wanted to see what happens when AI doesn&apos;t just answer questions. Our agents actually run a
          company. Research markets. Write content. Build software. Ship products. AI without being
          told what to do.
        </p>

        {/* Live status */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: "6px 16px",
            fontSize: 13,
            color: "#8896a8",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: workingCount > 0 ? "#22C55E" : "#555",
              boxShadow: workingCount > 0 ? "0 0 6px #22C55E" : "none",
            }}
          />
          {loading ? "Loading..." : `${workingCount} of ${agents.length} active right now`}
        </div>
      </div>

      {/* EXECUTIVE LAYER */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <AgentCard
          agent={getAgent("kimberly")}
          details={AGENT_DETAILS.kimberly}
          large
          onClick={() => router.push("/agents/kimberly")}
        />
      </div>

      {/* Flow connector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, margin: "24px 0", color: "#445566" }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#556677" }}>
          ◆ INPUT SIGNAL
        </span>
        <div style={{ flex: 1, maxWidth: 180, height: 1, background: "linear-gradient(90deg, transparent, #334455, transparent)" }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#556677" }}>
          OUTPUT ACTION ◆
        </span>
      </div>

      {/* OPERATIONS LAYER */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 12,
        }}
      >
        <AgentCard
          agent={getAgent("alex")}
          details={AGENT_DETAILS.alex}
          onClick={() => router.push("/agents/alex")}
        />
        <AgentCard
          agent={getAgent("sabri")}
          details={AGENT_DETAILS.sabri}
          onClick={() => router.push("/agents/sabri")}
        />
        <AgentCard
          agent={getAgent("jordan")}
          details={AGENT_DETAILS.jordan}
          onClick={() => router.push("/agents/jordan")}
        />
      </div>

      {/* Meta layer connector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, margin: "24px 0", color: "#445566" }}>
        <div style={{ flex: 1, maxWidth: 120, height: 1, background: "linear-gradient(90deg, transparent, #334455)" }} />
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#556677" }}>
          ◆ BUILD LAYER
        </span>
        <div style={{ flex: 1, maxWidth: 120, height: 1, background: "linear-gradient(90deg, #334455, transparent)" }} />
      </div>

      {/* DEVELOPMENT LAYER */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <AgentCard
          agent={getAgent("kevin")}
          details={AGENT_DETAILS.kevin}
          large
          onClick={() => router.push("/agents/kevin")}
        />
      </div>
    </div>
  );
}
