"use client";

import type { KeyboardEvent } from "react";

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

type Point3D = {
  x: number;
  y: number;
  z?: number;
};

type IsoPoint = {
  x: number;
  y: number;
};

type PrismPalette = {
  top: string;
  left: string;
  right: string;
  stroke?: string;
};

const VIEWBOX = "0 0 1000 620";
const ORIGIN = { x: 500, y: 170 };
const TILE_WIDTH = 56;
const TILE_HEIGHT = 30;
const HEIGHT_STEP = 24;

const SCENE_COLORS = {
  shellTop: "#f5f7fb",
  shellLeft: "#e6ebf2",
  shellRight: "#d7dee9",
  wallTop: "#fbfcfe",
  wallLeft: "#edf2f8",
  wallRight: "#dfe6f1",
  floorTop: "#eef3f8",
  floorLeft: "#dde6f0",
  floorRight: "#ced9e4",
  trim: "#b8c5d6",
  shadow: "rgba(15, 23, 42, 0.12)",
  ink: "#243244",
  muted: "#5f6f82",
  deskTop: "#f6f1e8",
  deskLeft: "#e1d6c5",
  deskRight: "#d3c5b0",
  screen: "#dfeeff",
  chairTop: "#d8e0ea",
  chairLeft: "#b7c3d1",
  chairRight: "#94a4b7",
  glassTop: "#eff8ff",
  glassLeft: "#d4ecfb",
  glassRight: "#bedff3",
  plantTop: "#a7d6b6",
  plantLeft: "#79b791",
  plantRight: "#5d9f76",
};

const ZONE_ACCENTS: Record<OfficeAgent["department"], { rug: string; line: string; label: string }> = {
  Executive: { rug: "#dcebff", line: "#8fb7e6", label: "Executive Desk" },
  Development: { rug: "#fff0d3", line: "#e2b96b", label: "Dev Area" },
  Marketing: { rug: "#ffe2e2", line: "#e69b9b", label: "Marketing Area" },
  Sales: { rug: "#dff6e8", line: "#8fc4a1", label: "Sales Area" },
};

const STATIONS: Record<
  string,
  {
    working: Point3D;
    idle: Point3D;
    department: OfficeAgent["department"];
  }
> = {
  kimberly: {
    working: { x: 3.8, y: 3, z: 0.85 },
    idle: { x: 2.2, y: 1.8, z: 0 },
    department: "Executive",
  },
  kevin: {
    working: { x: 3.1, y: 7.9, z: 0.85 },
    idle: { x: 1.9, y: 8.9, z: 0 },
    department: "Development",
  },
  alex: {
    working: { x: 11.5, y: 2.8, z: 0.85 },
    idle: { x: 10.2, y: 1.6, z: 0 },
    department: "Marketing",
  },
  sabri: {
    working: { x: 13.8, y: 2.8, z: 0.85 },
    idle: { x: 15.1, y: 1.8, z: 0 },
    department: "Marketing",
  },
  jordan: {
    working: { x: 12.7, y: 7.9, z: 0.85 },
    idle: { x: 14.5, y: 8.8, z: 0 },
    department: "Sales",
  },
};

function toIso(x: number, y: number, z = 0): IsoPoint {
  return {
    x: ORIGIN.x + (x - y) * (TILE_WIDTH / 2),
    y: ORIGIN.y + (x + y) * (TILE_HEIGHT / 2) - z * HEIGHT_STEP,
  };
}

function pointsToString(points: IsoPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function topFace(x: number, y: number, width: number, depth: number, z = 0) {
  return pointsToString([
    toIso(x, y, z),
    toIso(x + width, y, z),
    toIso(x + width, y + depth, z),
    toIso(x, y + depth, z),
  ]);
}

function frontRightFace(x: number, y: number, width: number, depth: number, z: number, height: number) {
  return pointsToString([
    toIso(x + width, y, z),
    toIso(x + width, y + depth, z),
    toIso(x + width, y + depth, z - height),
    toIso(x + width, y, z - height),
  ]);
}

function frontLeftFace(x: number, y: number, width: number, depth: number, z: number, height: number) {
  return pointsToString([
    toIso(x, y + depth, z),
    toIso(x + width, y + depth, z),
    toIso(x + width, y + depth, z - height),
    toIso(x, y + depth, z - height),
  ]);
}

function Prism({
  x,
  y,
  z = 0,
  width,
  depth,
  height,
  palette,
}: {
  x: number;
  y: number;
  z?: number;
  width: number;
  depth: number;
  height: number;
  palette: PrismPalette;
}) {
  const stroke = palette.stroke ?? "rgba(98, 115, 136, 0.25)";

  return (
    <g>
      <polygon points={frontLeftFace(x, y, width, depth, z, height)} fill={palette.left} stroke={stroke} />
      <polygon points={frontRightFace(x, y, width, depth, z, height)} fill={palette.right} stroke={stroke} />
      <polygon points={topFace(x, y, width, depth, z - height)} fill={palette.top} stroke={stroke} />
    </g>
  );
}

function Shadow({ x, y, width, depth, opacity = 0.16 }: { x: number; y: number; width: number; depth: number; opacity?: number }) {
  return <polygon points={topFace(x, y, width, depth, 0.01)} fill={`rgba(15, 23, 42, ${opacity})`} />;
}

function Desk({
  x,
  y,
  width,
  depth,
  height,
  monitorOffset,
}: {
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  monitorOffset: Point3D;
}) {
  return (
    <g>
      <Shadow x={x + 0.1} y={y + 0.15} width={width} depth={depth} />
      <Prism
        x={x}
        y={y}
        z={height}
        width={width}
        depth={depth}
        height={height}
        palette={{
          top: SCENE_COLORS.deskTop,
          left: SCENE_COLORS.deskLeft,
          right: SCENE_COLORS.deskRight,
        }}
      />
      <Prism
        x={x + monitorOffset.x}
        y={y + monitorOffset.y}
        z={height + 0.34}
        width={0.5}
        depth={0.35}
        height={0.42}
        palette={{
          top: SCENE_COLORS.screen,
          left: "#cdd7e4",
          right: "#b0bfd2",
        }}
      />
    </g>
  );
}

function Chair({ x, y, accent }: { x: number; y: number; accent: string }) {
  return (
    <g>
      <Shadow x={x} y={y} width={0.7} depth={0.7} opacity={0.12} />
      <Prism
        x={x}
        y={y}
        z={0.36}
        width={0.7}
        depth={0.7}
        height={0.36}
        palette={{
          top: SCENE_COLORS.chairTop,
          left: SCENE_COLORS.chairLeft,
          right: accent,
        }}
      />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <Shadow x={x} y={y} width={0.5} depth={0.5} opacity={0.1} />
      <Prism
        x={x + 0.1}
        y={y + 0.1}
        z={0.22}
        width={0.35}
        depth={0.35}
        height={0.22}
        palette={{
          top: "#ccb6a1",
          left: "#b49a82",
          right: "#9b8169",
        }}
      />
      <Prism x={x} y={y} z={0.58} width={0.55} depth={0.55} height={0.36} palette={{ top: SCENE_COLORS.plantTop, left: SCENE_COLORS.plantLeft, right: SCENE_COLORS.plantRight }} />
    </g>
  );
}

function GlassPanel({ x, y, width, depth, height }: { x: number; y: number; width: number; depth: number; height: number }) {
  return (
    <g opacity={0.95}>
      <polygon points={frontLeftFace(x, y, width, depth, height, height)} fill={SCENE_COLORS.glassLeft} stroke="rgba(120, 152, 176, 0.35)" />
      <polygon points={frontRightFace(x, y, width, depth, height, height)} fill={SCENE_COLORS.glassRight} stroke="rgba(120, 152, 176, 0.35)" />
      <polygon points={topFace(x, y, width, depth, 0)} fill={SCENE_COLORS.glassTop} stroke="rgba(120, 152, 176, 0.3)" />
    </g>
  );
}

function ZoneLabel({
  title,
  subtitle,
  x,
  y,
}: {
  title: string;
  subtitle: string;
  x: number;
  y: number;
}) {
  const anchor = toIso(x, y, 0);

  return (
    <g transform={`translate(${anchor.x} ${anchor.y})`}>
      <rect x={-82} y={-30} width={164} height={48} rx={18} fill="rgba(255, 255, 255, 0.88)" stroke="rgba(184, 197, 214, 0.72)" />
      <text x="0" y="-6" textAnchor="middle" fontSize="16" fontWeight="700" fill={SCENE_COLORS.ink}>
        {title}
      </text>
      <text x="0" y="14" textAnchor="middle" fontSize="11" letterSpacing="0.2em" fill={SCENE_COLORS.muted}>
        {subtitle}
      </text>
    </g>
  );
}

function AgentMarker({
  agent,
  selected,
  onSelect,
}: {
  agent: OfficeAgent;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const station = STATIONS[agent.id];
  const fallbackPoint = {
    Executive: { x: 3.8, y: 3, z: 0.85 },
    Development: { x: 3.1, y: 7.9, z: 0.85 },
    Marketing: { x: 11.5, y: 2.8, z: 0.85 },
    Sales: { x: 12.7, y: 7.9, z: 0.85 },
  }[agent.department];
  const point = station ? (agent.status === "working" ? station.working : station.idle) : fallbackPoint;
  const iso = toIso(point.x, point.y, point.z ?? 0);
  const statusColor = agent.status === "working" ? "#22c55e" : "#94a3b8";

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(agent.id);
    }
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Open ${agent.name} details`}
      onClick={() => onSelect(agent.id)}
      onKeyDown={handleKeyDown}
      className="cursor-pointer outline-none"
      transform={`translate(${iso.x} ${iso.y})`}
    >
      {selected ? (
        <ellipse cx="0" cy="20" rx="30" ry="12" fill={`${agent.accent}20`} />
      ) : null}
      {agent.status === "working" ? (
        <circle cx="0" cy="2" r="24" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.55">
          <animate attributeName="r" values="18;28;18" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.55;0.12;0.55" dur="1.8s" repeatCount="indefinite" />
        </circle>
      ) : null}
      <circle cx="0" cy="2" r={selected ? 22 : 19} fill="white" stroke={selected ? agent.accent : "#d7dee9"} strokeWidth={selected ? 4 : 3} />
      <circle cx="18" cy="-12" r="6" fill={statusColor} stroke="white" strokeWidth="2" />
      <text x="0" y="8" textAnchor="middle" fontSize="15" fontWeight="700" fill={SCENE_COLORS.ink}>
        {agent.initials}
      </text>
      <text x="0" y="42" textAnchor="middle" fontSize="13" fontWeight="700" fill={SCENE_COLORS.ink}>
        {agent.name}
      </text>
      <text x="0" y="60" textAnchor="middle" fontSize="10" letterSpacing="0.14em" fill={SCENE_COLORS.muted}>
        {(agent.currentTask ?? agent.department).slice(0, 28)}
      </text>
    </g>
  );
}

function LoadingState() {
  return (
    <div className="flex aspect-[1.55/1] min-h-[360px] w-full items-center justify-center rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-slate-200" />
        <p className="text-sm font-medium text-slate-500">Loading office layout</p>
      </div>
    </div>
  );
}

export function OfficeScene({ agents, loading, selectedId, onSelect }: Props) {
  if (loading && agents.length === 0) {
    return <LoadingState />;
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#fcfdff_0%,#edf3f8_100%)] shadow-[0_24px_90px_rgba(15,23,42,0.12)]">
      <div className="border-b border-slate-200/80 px-5 py-4 md:px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Office Layout</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-800">Isometric workspace map</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Executive desk</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Dev area</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Marketing area</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Sales area</span>
          </div>
        </div>
      </div>

      <div className="relative aspect-[1.55/1] min-h-[360px] w-full">
        <svg viewBox={VIEWBOX} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="floor-shadow" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="rgba(15,23,42,0.12)" />
            </filter>
            <linearGradient id="back-wall" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={SCENE_COLORS.wallLeft} />
              <stop offset="100%" stopColor={SCENE_COLORS.wallTop} />
            </linearGradient>
          </defs>

          <rect width="1000" height="620" fill="#f7fafc" />
          <path d="M140 128 L500 28 L860 128 L500 228 Z" fill="url(#back-wall)" opacity="0.8" />
          <path d="M140 128 L140 378 L500 478 L500 228 Z" fill={SCENE_COLORS.wallLeft} />
          <path d="M860 128 L860 378 L500 478 L500 228 Z" fill={SCENE_COLORS.wallRight} />

          <g filter="url(#floor-shadow)">
            <Prism x={0} y={0} z={0.18} width={16} depth={10} height={0.18} palette={{ top: SCENE_COLORS.floorTop, left: SCENE_COLORS.floorLeft, right: SCENE_COLORS.floorRight, stroke: SCENE_COLORS.trim }} />
          </g>

          <polygon points={topFace(1.1, 1.2, 4.2, 3.2, 0.2)} fill={ZONE_ACCENTS.Executive.rug} stroke={ZONE_ACCENTS.Executive.line} strokeDasharray="6 6" />
          <polygon points={topFace(1.1, 6.1, 6, 3, 0.2)} fill={ZONE_ACCENTS.Development.rug} stroke={ZONE_ACCENTS.Development.line} strokeDasharray="6 6" />
          <polygon points={topFace(9.4, 1.2, 5.2, 3.2, 0.2)} fill={ZONE_ACCENTS.Marketing.rug} stroke={ZONE_ACCENTS.Marketing.line} strokeDasharray="6 6" />
          <polygon points={topFace(10.2, 6.1, 4.8, 3, 0.2)} fill={ZONE_ACCENTS.Sales.rug} stroke={ZONE_ACCENTS.Sales.line} strokeDasharray="6 6" />

          <ZoneLabel title="Executive Desk" subtitle="LEADERSHIP" x={2.8} y={0.7} />
          <ZoneLabel title="Dev Area" subtitle="ENGINEERING" x={3.6} y={5.3} />
          <ZoneLabel title="Marketing Area" subtitle="CAMPAIGNS" x={12.1} y={0.7} />
          <ZoneLabel title="Sales Area" subtitle="PIPELINE" x={12.8} y={5.3} />

          <Desk x={2.2} y={2.1} width={2.4} depth={1.3} height={0.82} monitorOffset={{ x: 0.95, y: 0.35 }} />
          <Prism x={1.6} y={1.1} z={0.64} width={1.2} depth={0.7} height={0.64} palette={{ top: "#efe4d6", left: "#d8cab7", right: "#c9b79d" }} />
          <Chair x={3.5} y={3.15} accent="#9eb5d4" />

          <Desk x={2.1} y={7} width={2} depth={1.15} height={0.82} monitorOffset={{ x: 0.5, y: 0.28 }} />
          <Desk x={4.5} y={7} width={2} depth={1.15} height={0.82} monitorOffset={{ x: 0.54, y: 0.28 }} />
          <Chair x={2.9} y={8.15} accent="#b4c2d4" />
          <Chair x={5.3} y={8.15} accent="#b4c2d4" />
          <Prism x={0.9} y={7.1} z={0.8} width={0.8} depth={1.8} height={0.8} palette={{ top: "#dbe4ee", left: "#bcc8d7", right: "#a7b7ca" }} />

          <Desk x={10.5} y={2.1} width={1.8} depth={1.05} height={0.82} monitorOffset={{ x: 0.43, y: 0.24 }} />
          <Desk x={13} y={2.1} width={1.8} depth={1.05} height={0.82} monitorOffset={{ x: 0.43, y: 0.24 }} />
          <Chair x={11.15} y={3.15} accent="#d6a4a4" />
          <Chair x={13.65} y={3.15} accent="#d6a4a4" />
          <Prism x={14.9} y={1.2} z={0.7} width={0.7} depth={1.3} height={0.7} palette={{ top: "#f3e9dd", left: "#dcc9b7", right: "#ccb59d" }} />

          <Desk x={11.3} y={7.1} width={2.5} depth={1.2} height={0.82} monitorOffset={{ x: 0.95, y: 0.26 }} />
          <Chair x={12.3} y={8.15} accent="#a7cfb2" />
          <GlassPanel x={14.2} y={6.8} width={1.2} depth={0.1} height={1.4} />

          <Plant x={1.1} y={2} />
          <Plant x={6.5} y={1.3} />
          <Plant x={8.2} y={8.4} />
          <Plant x={14.8} y={8.6} />

          <g opacity="0.4">
            <line x1="500" y1="170" x2="780" y2="320" stroke={SCENE_COLORS.trim} strokeDasharray="5 8" />
            <line x1="500" y1="170" x2="220" y2="320" stroke={SCENE_COLORS.trim} strokeDasharray="5 8" />
            <line x1="500" y1="170" x2="500" y2="470" stroke={SCENE_COLORS.trim} strokeDasharray="5 8" />
          </g>

          {agents.map((agent) => (
            <AgentMarker key={agent.id} agent={agent} selected={selectedId === agent.id} onSelect={onSelect} />
          ))}
        </svg>

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap gap-3 md:left-auto md:right-6 md:max-w-sm md:justify-end">
          <div className="rounded-2xl border border-white/80 bg-white/88 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
              Working
              <span className="ml-3 h-2.5 w-2.5 rounded-full bg-[#94a3b8]" />
              Idle
            </div>
            <p className="mt-2 text-sm text-slate-500">Click any agent marker to open the existing detail panel.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
