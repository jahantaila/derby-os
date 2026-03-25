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

/* ── Pixel Art Character Data ── */
// Each character is a 9x12 pixel grid drawn via box-shadow
// Colors: skin=#FFD5B8, hair varies, shirt=dept color, pants=#2a2a3e
const PX = 4; // pixel scale

type PixelRow = [number, number, string][]; // [col, row, color]

function makePixelArt(hair: string, shirt: string, accessory?: string): PixelRow {
  const skin = "#FFD5B8";
  const pants = "#2a2a3e";
  const shoe = "#1a1a2e";
  const eye = "#1a1a2e";
  const acc = accessory || shirt;

  return [
    // Hair (rows 0-2)
    [3,0,hair],[4,0,hair],[5,0,hair],
    [2,1,hair],[3,1,hair],[4,1,hair],[5,1,hair],[6,1,hair],
    [2,2,hair],[3,2,hair],[4,2,hair],[5,2,hair],[6,2,hair],
    // Face (rows 3-4)
    [2,3,skin],[3,3,skin],[4,3,skin],[5,3,skin],[6,3,skin],
    [3,3,eye],[5,3,eye], // eyes
    [2,4,skin],[3,4,skin],[4,4,skin],[5,4,skin],[6,4,skin],
    [4,4,"#E88B8B"], // mouth/blush
    // Neck (row 5)
    [4,5,skin],
    // Shirt (rows 6-8)
    [2,6,shirt],[3,6,shirt],[4,6,shirt],[5,6,shirt],[6,6,shirt],
    [1,7,shirt],[2,7,shirt],[3,7,shirt],[4,7,acc],[5,7,shirt],[6,7,shirt],[7,7,shirt],
    [2,8,shirt],[3,8,shirt],[4,8,shirt],[5,8,shirt],[6,8,shirt],
    // Pants (rows 9-10)
    [2,9,pants],[3,9,pants],[4,9,pants],[5,9,pants],[6,9,pants],
    [2,10,pants],[3,10,pants],[5,10,pants],[6,10,pants],
    // Shoes (row 11)
    [1,11,shoe],[2,11,shoe],[3,11,shoe],[5,11,shoe],[6,11,shoe],[7,11,shoe],
  ];
}

const AGENT_PIXELS: Record<string, PixelRow> = {
  kimberly: makePixelArt("#4A2D0A", "#2093FF", "#FFD700"), // dark hair, blue shirt, gold badge
  alex: makePixelArt("#8B4513", "#F93C3C"),    // brown hair, red shirt
  sabri: makePixelArt("#1a1a2e", "#F93C3C"),   // black hair, red shirt
  jordan: makePixelArt("#C4721A", "#22C55E"),  // auburn hair, green shirt
  kevin: makePixelArt("#2a2a3e", "#FFBD59"),   // dark hair, yellow shirt
};

function PixelCharacter({ agentId, isWorking, accent }: { agentId: string; isWorking: boolean; accent: string }) {
  const pixels = AGENT_PIXELS[agentId] || AGENT_PIXELS.kimberly;
  
  const shadows = pixels
    .map(([col, row, color]) => `${col * PX}px ${row * PX}px 0 0 ${color}`)
    .join(",");

  return (
    <div className="pixel-character-wrap" style={{ width: 9 * PX, height: 12 * PX }}>
      <div
        className={`pixel-character ${isWorking ? "pixel-working" : "pixel-idle"}`}
        style={{
          width: PX,
          height: PX,
          boxShadow: shadows,
          imageRendering: "pixelated" as any,
        }}
      />
      {/* Shadow under character */}
      <div
        className="pixel-shadow"
        style={{
          width: 7 * PX,
          height: 2 * PX,
          left: PX,
          bottom: -PX,
          background: `radial-gradient(ellipse, ${accent}40, transparent 70%)`,
        }}
      />
    </div>
  );
}

/* ── Layout ── */
const ZONE_COPY: Record<OfficeAgent["department"], string> = {
  Executive: "Executive Suite",
  Marketing: "Marketing",
  Sales: "Sales",
  Development: "Engineering",
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
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">🎮 Pixel Office</p>
          <h2 className="mt-1 text-xl font-semibold text-white">The Derby Digital HQ</h2>
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

          {/* Furniture */}
          <div className="office-furniture executive-desk absolute left-[39%] top-[18%] h-[10%] w-[22%] rounded-[22px]" />
          <div className="office-furniture marketing-desk absolute left-[12%] top-[40%] h-[8%] w-[18%] rounded-[18px]" />
          <div className="office-furniture marketing-desk absolute left-[15%] top-[52%] h-[8%] w-[18%] rounded-[18px]" />
          <div className="office-furniture sales-desk absolute right-[12%] top-[44%] h-[8%] w-[17%] rounded-[18px]" />
          <div className="office-furniture development-desk absolute left-[37%] top-[71%] h-[8.5%] w-[26%] rounded-[20px]" />
          <div className="coffee-station absolute left-[68%] top-[15%] h-[10%] w-[10%] rounded-[18px]">
            <span className="coffee-label">☕ Break</span>
          </div>

          {/* Pixel Art Plant Decorations */}
          <div className="pixel-plant absolute left-[5%] top-[15%]">🌿</div>
          <div className="pixel-plant absolute right-[5%] top-[68%]">🪴</div>
          <div className="pixel-plant absolute left-[90%] top-[18%]">🌵</div>

          {/* Agents */}
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
                {/* Speech bubble */}
                <div className="activity-bubble max-w-[200px] rounded-xl border border-white/10 bg-[rgba(6,8,12,0.92)] px-3 py-1.5 text-[11px] text-slate-100 shadow-lg backdrop-blur-xl">
                  <span className="mr-1">{isWorking ? "💻" : "💤"}</span>
                  {agent.currentTask ? (agent.currentTask.length > 35 ? agent.currentTask.slice(0, 35) + "..." : agent.currentTask) : "Standing by..."}
                </div>

                {/* Pixel character */}
                <div className="mt-2 flex flex-col items-center">
                  <PixelCharacter agentId={agent.id} isWorking={isWorking} accent={agent.accent} />
                  
                  {/* Name tag */}
                  <div className="agent-nametag mt-1 rounded-lg border border-white/10 bg-[rgba(10,12,18,0.85)] px-2.5 py-1 backdrop-blur-xl">
                    <p className="text-center text-[11px] font-bold text-white">{agent.name}</p>
                    <p className="text-center text-[9px] uppercase tracking-[0.15em]" style={{ color: agent.accent }}>{agent.department}</p>
                  </div>
                </div>
              </button>
            );
          })}

          {loading ? (
            <div className="absolute inset-0 grid place-items-center rounded-[30px] bg-[rgba(4,5,8,0.5)] backdrop-blur-sm">
              <div className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-sm text-slate-300">
                Loading pixel office...
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

        .pixel-plant {
          font-size: 20px;
          opacity: 0.7;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
        }

        .pixel-character-wrap {
          position: relative;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }

        .pixel-character {
          image-rendering: pixelated;
          image-rendering: crisp-edges;
        }

        .pixel-shadow {
          position: absolute;
          border-radius: 50%;
          filter: blur(2px);
        }

        .agent-node {
          transform-style: preserve-3d;
        }

        .agent-idle {
          animation: idleFloat 2.5s ease-in-out infinite;
        }

        .agent-idle .pixel-character-wrap {
          animation: pixelBounce 2.5s ease-in-out infinite;
        }

        .agent-working .pixel-character-wrap {
          animation: pixelType 0.6s ease-in-out infinite;
        }

        .activity-bubble {
          opacity: 0;
          transform: translateY(4px) scale(0.95);
          transition: opacity 200ms ease, transform 200ms ease;
        }

        .agent-node:hover .activity-bubble,
        .agent-node:focus-visible .activity-bubble {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        @keyframes idleFloat {
          0%, 100% { transform: translate3d(-50%, -50%, 0) translateY(0); }
          50% { transform: translate3d(-50%, -50%, 0) translateY(-4px); }
        }

        @keyframes pixelBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes pixelType {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-1px) scale(1.02); }
          75% { transform: translateY(0px) scale(0.98); }
        }

        @media (max-width: 900px) {
          .office-floor {
            transform: rotateX(56deg) rotateZ(-45deg) scale(0.98);
          }
        }

        @media (max-width: 640px) {
          .office-floor {
            transform: rotateX(52deg) rotateZ(-45deg) scale(1.02);
          }

          .agent-nametag {
            padding: 0.3rem 0.5rem;
          }

          .agent-nametag p:first-child {
            font-size: 9px;
          }

          .activity-bubble {
            max-width: 140px;
            font-size: 10px;
          }
        }
      `}</style>
    </section>
  );
}
