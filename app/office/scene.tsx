"use client";

import type { CSSProperties } from "react";

type AgentTask = {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
};

type AgentHistoryEntry = {
  timestamp: string;
  action: string;
};

export type OfficeAgent = {
  id: string;
  name: string;
  role: string;
  department: "Executive" | "Marketing" | "Sales" | "Development";
  model: string | null;
  skills: string[];
  about: string;
  history: AgentHistoryEntry[];
  activeTasks: AgentTask[];
  inProgressTasks: AgentTask[];
  currentTask: string | null;
  status: "working" | "idle";
  accent: string;
  initials: string;
};

type Props = {
  agents: OfficeAgent[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const ZONE_COPY: Record<OfficeAgent["department"], string> = {
  Executive: "Executive Suite",
  Marketing: "Marketing",
  Sales: "Sales",
  Development: "Development",
};

const ZONE_LAYOUT: Record<
  OfficeAgent["department"],
  { className: string; style: Record<string, string>; labelClassName: string }
> = {
  Executive: {
    className: "left-[23%] top-[7%] h-[32%] w-[54%]",
    style: { "--zone-color": "#2093FF" },
    labelClassName: "left-1/2 top-5 -translate-x-1/2",
  },
  Marketing: {
    className: "left-[7%] top-[25%] h-[38%] w-[26%]",
    style: { "--zone-color": "#F93C3C" },
    labelClassName: "left-6 top-5",
  },
  Sales: {
    className: "right-[7%] top-[25%] h-[38%] w-[26%]",
    style: { "--zone-color": "#22C55E" },
    labelClassName: "right-6 top-5",
  },
  Development: {
    className: "left-[18%] bottom-[7%] h-[30%] w-[64%]",
    style: { "--zone-color": "#FFBD59" },
    labelClassName: "left-1/2 top-5 -translate-x-1/2",
  },
};

const AGENT_LAYOUT: Record<string, { x: string; y: string; idleX?: string; idleY?: string }> = {
  kimberly: { x: "50%", y: "23%", idleX: "57%", idleY: "18%" },
  alex: { x: "18%", y: "43%", idleX: "12%", idleY: "49%" },
  sabri: { x: "28%", y: "53%", idleX: "21%", idleY: "59%" },
  jordan: { x: "82%", y: "45%", idleX: "87%", idleY: "52%" },
  kevin: { x: "50%", y: "77%", idleX: "42%", idleY: "84%" },
};

function zoneStyle(style: Record<string, string>) {
  return style as CSSProperties;
}

export function OfficeScene({ agents, loading, selectedId, onSelect }: Props) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.03),_rgba(255,255,255,0.015))] p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Interactive Map</p>
          <h2 className="mt-1 text-xl font-semibold text-white">Virtual Office Floor</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-400">
          Click an agent
        </div>
      </div>

      <div className="office-stage relative mx-auto aspect-[16/10] w-full max-w-[1100px]">
        <div className="office-floor absolute inset-[3%]">
          <div className="office-floor-grid absolute inset-0 rounded-[30px]" />
          <div className="office-floor-glow absolute inset-0 rounded-[30px]" />

          {Object.entries(ZONE_LAYOUT).map(([department, layout]) => (
            <div
              key={department}
              className={`office-zone absolute rounded-[26px] border border-white/8 ${layout.className}`}
              style={zoneStyle(layout.style)}
            >
              <div className={`office-zone-label absolute ${layout.labelClassName}`}>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/90 backdrop-blur-md">
                  {ZONE_COPY[department as OfficeAgent["department"]]}
                </span>
              </div>
            </div>
          ))}

          <div className="office-furniture executive-desk absolute left-[39%] top-[18%] h-[10%] w-[22%] rounded-[22px]" />
          <div className="office-furniture marketing-desk absolute left-[12%] top-[40%] h-[8%] w-[18%] rounded-[18px]" />
          <div className="office-furniture marketing-desk absolute left-[15%] top-[52%] h-[8%] w-[18%] rounded-[18px]" />
          <div className="office-furniture sales-desk absolute right-[12%] top-[44%] h-[8%] w-[17%] rounded-[18px]" />
          <div className="office-furniture development-desk absolute left-[37%] top-[71%] h-[8.5%] w-[26%] rounded-[20px]" />
          <div className="coffee-station absolute left-[68%] top-[15%] h-[10%] w-[10%] rounded-[18px]">
            <span className="coffee-label">Break</span>
          </div>

          {agents.map((agent) => {
            const layout = AGENT_LAYOUT[agent.id];
            if (!layout) return null;

            const isWorking = agent.inProgressTasks.length > 0;
            const left = isWorking ? layout.x : layout.idleX ?? layout.x;
            const top = isWorking ? layout.y : layout.idleY ?? layout.y;

            return (
              <button
                key={agent.id}
                type="button"
                className={[
                  "agent-node absolute -translate-x-1/2 -translate-y-1/2 text-left transition duration-500",
                  selectedId === agent.id ? "z-20" : "z-10",
                  isWorking ? "agent-working" : "agent-idle",
                ].join(" ")}
                style={{ left, top, "--agent-color": agent.accent } as CSSProperties}
                onClick={() => onSelect(agent.id)}
                aria-label={`Open ${agent.name} details`}
                title={`${agent.name} · ${isWorking ? "working" : "idle"}`}
              >
                <div className="activity-bubble max-w-[200px] rounded-2xl border border-white/10 bg-[rgba(6,8,12,0.88)] px-3 py-2 text-xs text-slate-100 shadow-[0_12px_35px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  {agent.currentTask ?? "Standing by"}
                </div>

                <div className="agent-body mt-3 flex items-center gap-3">
                  <div className="relative">
                    <div className="agent-avatar flex h-16 w-16 items-center justify-center rounded-full border-[3px] bg-[#10131b] text-sm font-semibold text-white">
                      {agent.initials}
                    </div>
                    <span className={`status-dot ${isWorking ? "status-working" : "status-idle"}`} />
                  </div>

                  <div className="agent-label min-w-[120px] rounded-2xl border border-white/10 bg-[rgba(10,12,18,0.82)] px-3 py-2 backdrop-blur-xl">
                    <p className="text-sm font-semibold text-white">{agent.name}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{agent.role}</p>
                  </div>
                </div>
              </button>
            );
          })}

          {loading ? (
            <div className="absolute inset-0 grid place-items-center rounded-[30px] bg-[rgba(4,5,8,0.5)] backdrop-blur-sm">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-slate-300">
                Syncing live office state...
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <style jsx>{`
        .office-stage {
          perspective: 1800px;
        }

        .office-floor {
          transform: rotateX(60deg) rotateZ(-45deg);
          transform-style: preserve-3d;
          border-radius: 30px;
          background:
            linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent 45%),
            linear-gradient(180deg, rgba(10, 14, 22, 0.98), rgba(18, 22, 30, 0.96));
          box-shadow:
            0 35px 90px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .office-floor-grid {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: 0.25;
        }

        .office-floor-glow {
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .office-zone {
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--zone-color) 22%, transparent), transparent 68%),
            color-mix(in srgb, var(--zone-color) 12%, rgba(255, 255, 255, 0.03));
          box-shadow:
            inset 0 0 0 1px color-mix(in srgb, var(--zone-color) 35%, rgba(255, 255, 255, 0.08)),
            0 20px 50px rgba(0, 0, 0, 0.16);
        }

        .office-furniture {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.04)),
            linear-gradient(180deg, rgba(22, 28, 39, 0.95), rgba(10, 14, 19, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow:
            0 18px 35px rgba(0, 0, 0, 0.25),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .executive-desk {
          box-shadow:
            0 18px 35px rgba(0, 0, 0, 0.25),
            0 0 0 1px rgba(32, 147, 255, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .marketing-desk {
          box-shadow:
            0 18px 35px rgba(0, 0, 0, 0.22),
            0 0 0 1px rgba(249, 60, 60, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .sales-desk {
          box-shadow:
            0 18px 35px rgba(0, 0, 0, 0.22),
            0 0 0 1px rgba(34, 197, 94, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .development-desk {
          box-shadow:
            0 18px 35px rgba(0, 0, 0, 0.22),
            0 0 0 1px rgba(255, 189, 89, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .coffee-station {
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.18), transparent 35%),
            linear-gradient(180deg, rgba(22, 28, 39, 0.95), rgba(10, 14, 19, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 18px 35px rgba(0, 0, 0, 0.25);
        }

        .coffee-label {
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.75);
        }

        .agent-node {
          transform-style: preserve-3d;
        }

        .agent-avatar {
          border-color: var(--agent-color);
          box-shadow:
            0 0 0 7px color-mix(in srgb, var(--agent-color) 18%, transparent),
            0 14px 28px rgba(0, 0, 0, 0.28);
        }

        .status-dot {
          position: absolute;
          right: 2px;
          bottom: 1px;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid #0a0a0f;
        }

        .status-working {
          background: #22c55e;
          box-shadow: 0 0 0 rgba(34, 197, 94, 0.45);
          animation: statusPulse 1.8s ease-in-out infinite;
        }

        .status-idle {
          background: #ffbd59;
          box-shadow: 0 0 18px rgba(255, 189, 89, 0.4);
        }

        .activity-bubble {
          opacity: 0.96;
          transform-origin: bottom center;
          transition:
            opacity 200ms ease,
            transform 200ms ease;
        }

        .agent-node:hover .activity-bubble,
        .agent-node:focus-visible .activity-bubble {
          transform: translateY(-2px) scale(1.01);
        }

        .agent-idle {
          animation: idleFloat 2s ease-in-out infinite;
        }

        .agent-working .agent-avatar,
        .agent-working .agent-label {
          animation: typingPulse 1.2s ease-in-out infinite;
        }

        @keyframes idleFloat {
          0%,
          100% {
            transform: translate3d(-50%, -50%, 0) translateY(0);
          }
          50% {
            transform: translate3d(-50%, -50%, 0) translateY(-3px);
          }
        }

        @keyframes typingPulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }

        @keyframes statusPulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
          }
        }

        @media (max-width: 900px) {
          .office-floor {
            transform: rotateX(56deg) rotateZ(-45deg) scale(0.98);
          }

          .agent-label {
            min-width: 102px;
          }
        }

        @media (max-width: 640px) {
          .office-floor {
            transform: rotateX(52deg) rotateZ(-45deg) scale(1.02);
          }

          .agent-body {
            gap: 0.5rem;
          }

          .agent-avatar {
            width: 3.25rem;
            height: 3.25rem;
          }

          .agent-label {
            min-width: 88px;
            padding: 0.55rem 0.7rem;
          }

          .agent-label p:first-child {
            font-size: 0.75rem;
          }

          .activity-bubble {
            max-width: 140px;
            font-size: 11px;
            padding: 0.45rem 0.65rem;
          }
        }
      `}</style>
    </section>
  );
}
