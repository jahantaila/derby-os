"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Clock3, Cpu, RefreshCw, WifiOff, X } from "lucide-react";
import { TEAM_SEED, type AgentHistoryEntry } from "@/lib/agents-data";

type TaskRecord = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  assignee?: string | null;
  priority?: string | null;
  category?: string | null;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  notes?: string | null;
};

type AgentApiRecord = {
  id: string;
  name: string;
  role: string;
  department: Department;
  model?: string | null;
  status?: string | null;
  current_task?: string | null;
  currentTask?: string | null;
  skills?: string[] | string | null;
  about?: string | null;
  soul?: string | null;
  history?: AgentHistoryEntry[] | null;
  active_tasks?: TaskRecord[] | null;
};

type DetailStatus = "working" | "idle" | "offline";
type Department = "Executive" | "Marketing" | "Development" | "Sales";

type OfficeAgent = {
  id: string;
  name: string;
  role: string;
  department: Department;
  model: string | null;
  skills: string[];
  about: string;
  history: AgentHistoryEntry[];
  activeTasks: TaskRecord[];
  currentTask: TaskRecord | null;
  completedTasks: TaskRecord[];
  status: DetailStatus;
  accent: string;
  shirt: string;
  lastActivity: string;
};

type LayoutBox = { x: number; y: number; w: number; h: number };

type Station = {
  desk: LayoutBox;
  sprite: { x: number; y: number };
  status: LayoutBox;
  accent: LayoutBox;
  label: { x: number; y: number };
  facing: "up" | "down";
  monitors?: number;
};

type SceneGeometry = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const OFFICE_AGENT_IDS = ["kimberly", "alex", "sabri", "kevin", "jordan"] as const;
const OFFICE_AGENT_ID_SET = new Set<string>(OFFICE_AGENT_IDS);
const INTERNAL_WIDTH = 480;
const INTERNAL_HEIGHT = 320;

const DEPARTMENT_META: Record<Department, { color: string; label: string }> = {
  Executive: { color: "#2093FF", label: "Executive" },
  Marketing: { color: "#F93C3C", label: "Marketing" },
  Development: { color: "#FFBD59", label: "Development" },
  Sales: { color: "#22C55E", label: "Sales" },
};

const STATIONS: Record<string, Station> = {
  kimberly: {
    desk: { x: 190, y: 42, w: 100, h: 32 },
    sprite: { x: 230, y: 68 },
    status: { x: 178, y: 18, w: 124, h: 18 },
    accent: { x: 178, y: 34, w: 124, h: 48 },
    label: { x: 206, y: 8 },
    facing: "up",
    monitors: 2,
  },
  alex: {
    desk: { x: 314, y: 70, w: 62, h: 26 },
    sprite: { x: 340, y: 95 },
    status: { x: 294, y: 42, w: 102, h: 18 },
    accent: { x: 306, y: 62, w: 78, h: 42 },
    label: { x: 314, y: 18 },
    facing: "up",
  },
  sabri: {
    desk: { x: 392, y: 70, w: 62, h: 26 },
    sprite: { x: 418, y: 95 },
    status: { x: 378, y: 42, w: 92, h: 18 },
    accent: { x: 384, y: 62, w: 78, h: 42 },
    label: { x: 398, y: 18 },
    facing: "up",
  },
  kevin: {
    desk: { x: 60, y: 208, w: 108, h: 30 },
    sprite: { x: 102, y: 232 },
    status: { x: 44, y: 180, w: 140, h: 18 },
    accent: { x: 44, y: 200, w: 144, h: 50 },
    label: { x: 66, y: 160 },
    facing: "up",
    monitors: 3,
  },
  jordan: {
    desk: { x: 334, y: 218, w: 84, h: 28 },
    sprite: { x: 368, y: 242 },
    status: { x: 320, y: 188, w: 112, h: 18 },
    accent: { x: 320, y: 210, w: 116, h: 48 },
    label: { x: 342, y: 166 },
    facing: "up",
  },
};

const ROOM = {
  background: "#5B4631",
  wallTop: "#B08A60",
  wallTrim: "#8A6541",
  floorA: "#DDBB8A",
  floorB: "#D3AF7E",
  floorShadow: "#B8925C",
  deskTop: "#7B5536",
  deskEdge: "#5A3C24",
  chair: "#334155",
  chairShadow: "#1E293B",
  monitor: "#111827",
  monitorGlow: "#7DD3FC",
  whiteboard: "#F8FAFC",
  coffee: "#6B4F35",
  plantLeaf: "#4D8C57",
  plantDark: "#2E5A35",
  pot: "#9A6B43",
  bubble: "#FFF8E7",
  ink: "#2B2116",
  glass: "#CDE9F3",
};

const SEED_BY_ID = new Map(TEAM_SEED.map((agent) => [agent.id, agent]));

function parseSkills(skills: AgentApiRecord["skills"], fallback: string[]): string[] {
  if (Array.isArray(skills)) return skills.filter(Boolean);
  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function toTimestamp(task: TaskRecord) {
  return new Date(task.updated_at ?? task.created_at ?? 0).getTime() || 0;
}

function formatTime(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatShortDate(value: string | number | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function relativeTime(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function truncate(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 3))}...`;
}

function normalizeAgent(agent: AgentApiRecord, taskList: TaskRecord[]): OfficeAgent {
  const seed = SEED_BY_ID.get(agent.id);
  const activeTasks = taskList
    .filter((task) => task.status !== "done")
    .sort((left, right) => toTimestamp(right) - toTimestamp(left));
  const completedTasks = taskList
    .filter((task) => task.status === "done")
    .sort((left, right) => toTimestamp(right) - toTimestamp(left));
  const currentTask =
    activeTasks.find((task) => task.status === "in_progress") ??
    activeTasks[0] ??
    null;
  const liveStatus = agent.status === "offline"
    ? "offline"
    : currentTask?.status === "in_progress"
      ? "working"
      : "idle";

  let lastActivity = "Standing by";
  if (liveStatus === "working" && currentTask) {
    lastActivity = currentTask.title;
  } else if (liveStatus === "offline") {
    lastActivity = "Offline";
  } else if (completedTasks[0]?.updated_at || completedTasks[0]?.created_at) {
    lastActivity = `Idle for ${relativeTime(completedTasks[0].updated_at ?? completedTasks[0].created_at)}`;
  }

  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    department: agent.department,
    model: agent.model ?? seed?.model ?? null,
    skills: parseSkills(agent.skills, seed?.skills ?? []),
    about: agent.about ?? agent.soul ?? seed?.soul ?? "",
    history: Array.isArray(agent.history) ? agent.history : seed?.history ?? [],
    activeTasks,
    currentTask: currentTask ?? (
      agent.current_task || agent.currentTask
        ? {
            id: `${agent.id}-current`,
            title: agent.current_task ?? agent.currentTask ?? "Active task",
            status: liveStatus === "working" ? "in_progress" : "todo",
          }
        : null
    ),
    completedTasks,
    status: liveStatus,
    accent: DEPARTMENT_META[agent.department].color,
    shirt: DEPARTMENT_META[agent.department].color,
    lastActivity,
  };
}

function drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawOutlineRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  border: string,
  fill: string,
) {
  drawRect(ctx, x, y, w, h, border);
  drawRect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, align: CanvasTextAlign = "left") {
  ctx.fillStyle = color;
  ctx.font = "bold 8px monospace";
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(text.toUpperCase(), x, y);
}

function drawDesk(ctx: CanvasRenderingContext2D, station: Station, accent: string) {
  drawRect(ctx, station.accent.x, station.accent.y, station.accent.w, station.accent.h, `${accent}44`);
  drawOutlineRect(ctx, station.desk.x, station.desk.y, station.desk.w, station.desk.h, ROOM.deskEdge, ROOM.deskTop);
  drawRect(ctx, station.desk.x + 8, station.desk.y + station.desk.h - 4, station.desk.w - 16, 3, "#3F2A18");

  const monitorCount = station.monitors ?? 1;
  for (let index = 0; index < monitorCount; index += 1) {
    const gap = 22;
    const offset = station.desk.x + 12 + index * gap;
    drawOutlineRect(ctx, offset, station.desk.y + 5, 16, 10, ROOM.monitor, ROOM.monitorGlow);
    drawRect(ctx, offset + 6, station.desk.y + 15, 4, 3, ROOM.monitor);
  }

  drawOutlineRect(ctx, station.sprite.x - 8, station.sprite.y + 5, 16, 10, ROOM.chairShadow, ROOM.chair);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawRect(ctx, x + 2, y + 6, 10, 7, ROOM.pot);
  drawRect(ctx, x + 1, y + 4, 12, 3, "#B17C52");
  drawRect(ctx, x + 5, y, 4, 8, ROOM.plantDark);
  drawRect(ctx, x + 1, y + 1, 12, 4, ROOM.plantLeaf);
  drawRect(ctx, x + 3, y - 2, 8, 4, ROOM.plantLeaf);
}

function drawCoffeeZone(ctx: CanvasRenderingContext2D) {
  drawOutlineRect(ctx, 18, 118, 58, 32, ROOM.wallTrim, "#B98958");
  drawLabel(ctx, "Coffee", 47, 122, "#FFF6E2", "center");
  drawOutlineRect(ctx, 28, 132, 18, 12, "#4B2F1C", ROOM.coffee);
  drawOutlineRect(ctx, 49, 132, 18, 12, "#4B2F1C", ROOM.coffee);
  drawRect(ctx, 33, 125, 6, 8, "#EEE2D0");
  drawRect(ctx, 54, 125, 6, 8, "#EEE2D0");
}

function drawWhiteboard(ctx: CanvasRenderingContext2D) {
  drawOutlineRect(ctx, 184, 126, 114, 44, ROOM.wallTrim, ROOM.whiteboard);
  drawLabel(ctx, "Q2 Push", 194, 135, "#0F172A");
  drawRect(ctx, 194, 148, 44, 2, "#2093FF");
  drawRect(ctx, 194, 154, 58, 2, "#F93C3C");
  drawRect(ctx, 194, 160, 34, 2, "#22C55E");
  drawRect(ctx, 258, 144, 22, 14, "#FFBD59");
}

function drawStatusCard(ctx: CanvasRenderingContext2D, station: Station, agent: OfficeAgent, selected: boolean) {
  const light = agent.status === "working" ? "#22C55E" : agent.status === "offline" ? "#EF4444" : "#FBBF24";
  const text = agent.currentTask ? truncate(agent.currentTask.title, 18) : truncate(agent.lastActivity, 18);

  drawOutlineRect(ctx, station.status.x, station.status.y, station.status.w, station.status.h, "#3B2D1E", ROOM.bubble);
  drawRect(ctx, station.status.x + 4, station.status.y + 6, 5, 5, light);
  drawLabel(ctx, text, station.status.x + 14, station.status.y + 5, ROOM.ink);
  if (selected) {
    drawRect(ctx, station.status.x, station.status.y + station.status.h + 2, station.status.w, 2, agent.accent);
  }
}

function drawAgent(ctx: CanvasRenderingContext2D, agent: OfficeAgent, station: Station, frame: number, hovered: boolean, selected: boolean) {
  const working = agent.status === "working";
  const bob = working ? 0 : Math.sin(frame / 16) > 0 ? -1 : 0;
  const typing = working && Math.sin(frame / 6) > 0 ? 1 : 0;
  const spriteX = station.sprite.x;
  const spriteY = station.sprite.y + bob;
  const skin = "#F1C27D";
  const hair = agent.id === "alex" ? "#7C4A29" : agent.id === "sabri" ? "#26160F" : agent.id === "jordan" ? "#9A5B2E" : "#3B2818";
  const outline = selected ? agent.accent : hovered ? "#FFF4D8" : "#1F150F";

  drawRect(ctx, spriteX - 9, spriteY - 14, 18, 3, outline);
  drawRect(ctx, spriteX - 8, spriteY - 13, 16, 2, outline);
  drawRect(ctx, spriteX - 4, spriteY - 10, 8, 5, hair);
  drawRect(ctx, spriteX - 3, spriteY - 6, 6, 5, skin);
  drawRect(ctx, spriteX - 5, spriteY - 1, 10, 7, agent.shirt);
  drawRect(ctx, spriteX - 6, spriteY + 6, 12, 6, "#1E293B");
  drawRect(ctx, spriteX - 7, spriteY + 3, 3, 2 + typing, skin);
  drawRect(ctx, spriteX + 4, spriteY + 3, 3, 2 + (typing ? 0 : 1), skin);
  drawRect(ctx, spriteX - 5, spriteY + 12, 3, 4, "#111827");
  drawRect(ctx, spriteX + 2, spriteY + 12, 3, 4, "#111827");

  drawLabel(ctx, agent.name, spriteX, spriteY + 19, ROOM.ink, "center");
}

function drawSpeechBubble(ctx: CanvasRenderingContext2D, agent: OfficeAgent, station: Station) {
  const message = agent.currentTask?.title ?? agent.lastActivity;
  const bubbleWidth = Math.min(172, Math.max(76, message.length * 4 + 18));
  const bubbleX = Math.max(6, Math.min(INTERNAL_WIDTH - bubbleWidth - 6, station.sprite.x - bubbleWidth / 2));
  const bubbleY = Math.max(10, station.sprite.y - 42);
  drawOutlineRect(ctx, bubbleX, bubbleY, bubbleWidth, 22, "#4A3623", ROOM.bubble);
  drawRect(ctx, station.sprite.x - 2, bubbleY + 22, 5, 5, ROOM.bubble);
  drawLabel(ctx, truncate(message, 34), bubbleX + 6, bubbleY + 7, ROOM.ink);
}

function drawRoom(ctx: CanvasRenderingContext2D, agents: OfficeAgent[], selectedId: string | null, hoveredId: string | null, frame: number) {
  drawRect(ctx, 0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT, ROOM.background);
  drawRect(ctx, 0, 0, INTERNAL_WIDTH, 72, ROOM.wallTop);
  drawRect(ctx, 0, 72, INTERNAL_WIDTH, 6, ROOM.wallTrim);

  for (let y = 78; y < INTERNAL_HEIGHT; y += 16) {
    for (let x = 0; x < INTERNAL_WIDTH; x += 16) {
      drawRect(ctx, x, y, 16, 16, (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0 ? ROOM.floorA : ROOM.floorB);
    }
  }

  drawRect(ctx, 0, INTERNAL_HEIGHT - 12, INTERNAL_WIDTH, 12, ROOM.floorShadow);
  drawLabel(ctx, "Executive", 240, 14, DEPARTMENT_META.Executive.color, "center");
  drawLabel(ctx, "Marketing", 382, 14, DEPARTMENT_META.Marketing.color, "center");
  drawLabel(ctx, "Development", 116, 156, DEPARTMENT_META.Development.color, "center");
  drawLabel(ctx, "Sales", 374, 162, DEPARTMENT_META.Sales.color, "center");

  drawOutlineRect(ctx, 212, 0, 56, 18, "#725230", "#EFD9AE");
  drawLabel(ctx, "HQ", 240, 6, ROOM.ink, "center");
  drawCoffeeZone(ctx);
  drawWhiteboard(ctx);
  drawPlant(ctx, 146, 108);
  drawPlant(ctx, 324, 120);
  drawPlant(ctx, 430, 118);
  drawOutlineRect(ctx, 408, 118, 42, 26, "#6C4A2A", "#E9D7B6");
  drawLabel(ctx, "Ideas", 429, 127, ROOM.ink, "center");
  drawRect(ctx, 414, 137, 30, 2, "#2093FF");

  agents.forEach((agent) => {
    const station = STATIONS[agent.id];
    if (!station) return;
    drawDesk(ctx, station, agent.accent);
    drawStatusCard(ctx, station, agent, selectedId === agent.id);
  });

  agents.forEach((agent) => {
    const station = STATIONS[agent.id];
    if (!station) return;
    drawAgent(ctx, agent, station, frame, hoveredId === agent.id, selectedId === agent.id);
  });

  if (hoveredId) {
    const hovered = agents.find((agent) => agent.id === hoveredId);
    const station = hovered ? STATIONS[hovered.id] : null;
    if (hovered && station) drawSpeechBubble(ctx, hovered, station);
  }
}

function hitAgent(x: number, y: number, agents: OfficeAgent[]) {
  for (const agent of agents) {
    const station = STATIONS[agent.id];
    if (!station) continue;
    const withinSprite =
      x >= station.sprite.x - 12 &&
      x <= station.sprite.x + 12 &&
      y >= station.sprite.y - 16 &&
      y <= station.sprite.y + 20;
    const withinStatus =
      x >= station.status.x &&
      x <= station.status.x + station.status.w &&
      y >= station.status.y &&
      y <= station.status.y + station.status.h + 4;
    if (withinSprite || withinStatus) return agent.id;
  }
  return null;
}

function SceneCanvas({
  agents,
  selectedId,
  onSelect,
}: {
  agents: OfficeAgent[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const geometryRef = useRef<SceneGeometry>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const scale = Math.max(rect.width / INTERNAL_WIDTH, rect.height / INTERNAL_HEIGHT);
      geometryRef.current = {
        scale,
        offsetX: (rect.width - INTERNAL_WIDTH * scale) / 2,
        offsetY: (rect.height - INTERNAL_HEIGHT * scale) / 2,
      };
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const offscreen = document.createElement("canvas");
    offscreen.width = INTERNAL_WIDTH;
    offscreen.height = INTERNAL_HEIGHT;
    const offscreenCtx = offscreen.getContext("2d");
    const visibleCtx = canvas.getContext("2d");
    if (!offscreenCtx || !visibleCtx) return;

    let frame = 0;
    let rafId = 0;

    const render = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      offscreenCtx.imageSmoothingEnabled = false;
      visibleCtx.imageSmoothingEnabled = false;
      offscreenCtx.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
      drawRoom(offscreenCtx, agents, selectedId, hoveredId, frame);

      visibleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      visibleCtx.clearRect(0, 0, rect.width, rect.height);

      const geometry = geometryRef.current;
      visibleCtx.drawImage(
        offscreen,
        0,
        0,
        INTERNAL_WIDTH,
        INTERNAL_HEIGHT,
        geometry.offsetX,
        geometry.offsetY,
        INTERNAL_WIDTH * geometry.scale,
        INTERNAL_HEIGHT * geometry.scale,
      );

      frame += 1;
      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [agents, hoveredId, selectedId]);

  const toInternalPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const geometry = geometryRef.current;
    const x = (event.clientX - rect.left - geometry.offsetX) / geometry.scale;
    const y = (event.clientY - rect.top - geometry.offsetY) / geometry.scale;
    if (x < 0 || y < 0 || x > INTERNAL_WIDTH || y > INTERNAL_HEIGHT) return null;
    return { x, y };
  };

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer touch-none [image-rendering:pixelated]"
        onPointerMove={(event) => {
          const point = toInternalPoint(event);
          setHoveredId(point ? hitAgent(point.x, point.y, agents) : null);
        }}
        onPointerLeave={() => setHoveredId(null)}
        onClick={(event) => {
          const point = toInternalPoint(event);
          onSelect(point ? hitAgent(point.x, point.y, agents) : null);
        }}
      />
    </div>
  );
}

function DetailPanel({
  agent,
  lastUpdated,
  onClose,
}: {
  agent: OfficeAgent | null;
  lastUpdated: Date | null;
  onClose: () => void;
}) {
  if (!agent) return null;

  const statusColor = agent.status === "working" ? "#22C55E" : agent.status === "offline" ? "#EF4444" : "#FBBF24";

  return (
    <div
      className="absolute inset-0 z-40 bg-black/45 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="absolute left-1/2 top-1/2 flex max-h-[calc(100%-2rem)] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[linear-gradient(180deg,rgba(14,14,18,0.82),rgba(8,8,12,0.72))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#D7BE9A]">Agent Detail</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{agent.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{agent.role}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10"
            aria-label="Close detail panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
            style={{ borderColor: `${agent.accent}80`, color: agent.accent, backgroundColor: `${agent.accent}15` }}
          >
            {agent.department}
          </span>
          <span
            className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
            style={{ borderColor: `${statusColor}80`, color: statusColor, backgroundColor: `${statusColor}18` }}
          >
            {agent.status}
          </span>
        </div>

        <div className="mt-6 space-y-3 overflow-y-auto pr-1">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Current Task</p>
            <p className="mt-3 text-base text-white">{agent.currentTask?.title ?? "No active task"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColor }} />
                {agent.lastActivity}
              </span>
              {lastUpdated ? (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Refreshed {formatTime(lastUpdated)}
                </span>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">About</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {agent.about || "No profile available for this agent yet."}
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Skills</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {agent.skills.length > 0 ? (
                agent.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-300">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No skills listed.</span>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Recent Completed Tasks</p>
            <div className="mt-3 space-y-2">
              {agent.completedTasks.slice(0, 5).length > 0 ? (
                agent.completedTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-sm text-slate-100">{task.title}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {formatShortDate(task.updated_at ?? task.created_at ?? "")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No completed tasks recorded yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Recent Activity</p>
            <div className="mt-3 space-y-2">
              {agent.history.slice(0, 5).length > 0 ? (
                agent.history.slice(0, 5).map((entry) => (
                  <div key={`${entry.timestamp}-${entry.action}`} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                    <p className="text-sm text-slate-200">{entry.action}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">{entry.timestamp}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No recent activity logged.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">System</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
              <Cpu className="h-4 w-4 text-slate-500" />
              <span>{agent.model ?? "Unassigned model"}</span>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

export default function OfficePage() {
  const [agents, setAgents] = useState<OfficeAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [agentsRes, tasksRes] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/tasks", { cache: "no-store" }),
        ]);

        if (!agentsRes.ok) throw new Error("Failed to fetch agents");
        if (!tasksRes.ok) throw new Error("Failed to fetch tasks");

        const agentsPayload = await agentsRes.json();
        const tasksPayload = await tasksRes.json();

        const agentRecords = (Array.isArray(agentsPayload) ? agentsPayload : agentsPayload.agents ?? []) as AgentApiRecord[];
        const taskRecords = (Array.isArray(tasksPayload) ? tasksPayload : tasksPayload.tasks ?? []) as TaskRecord[];

        const taskMap = new Map<string, TaskRecord[]>();
        taskRecords.forEach((task) => {
          const assignee = task.assignee?.toLowerCase();
          if (!assignee) return;
          const list = taskMap.get(assignee) ?? [];
          list.push(task);
          taskMap.set(assignee, list);
        });

        const nextAgents = agentRecords
          .filter((agent) => OFFICE_AGENT_ID_SET.has(agent.id))
          .map((agent) => normalizeAgent(agent, taskMap.get(agent.id) ?? agent.active_tasks ?? []))
          .sort(
            (left, right) =>
              OFFICE_AGENT_IDS.indexOf(left.id as (typeof OFFICE_AGENT_IDS)[number]) -
              OFFICE_AGENT_IDS.indexOf(right.id as (typeof OFFICE_AGENT_IDS)[number]),
          );

        if (!active) return;
        setAgents(nextAgents);
        setSelectedId((current) => (current && nextAgents.some((agent) => agent.id === current) ? current : null));
        setLastUpdated(new Date());
        setError(null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load office");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const intervalId = window.setInterval(load, 30000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const clockId = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(clockId);
  }, []);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedId) ?? null,
    [agents, selectedId],
  );

  const workingCount = agents.filter((agent) => agent.status === "working").length;

  return (
    <div className="fixed inset-y-0 right-0 left-[60px] overflow-hidden bg-[#120d08] text-white">
      <section className="relative h-full w-full">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,189,89,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_28%)]" />
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-3xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#D7BE9A]">Office</p>
          <div className="mt-2 flex items-center gap-4 text-sm text-slate-200">
            <span>{workingCount}/5 working</span>
            <span>{formatTime(currentTime)}</span>
            <span>Refresh 30s</span>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-3xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-slate-300 backdrop-blur-xl">
          <p>Click a desk to inspect the agent.</p>
          <p className="mt-1">Hover to read the live task bubble.</p>
        </div>

        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-3xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 backdrop-blur-xl">
          {error ? <WifiOff className="h-4 w-4 text-red-400" /> : <RefreshCw className="h-4 w-4 text-emerald-400" />}
          <span>{error ? error : lastUpdated ? `Live at ${formatTime(lastUpdated)}` : "Connecting..."}</span>
        </div>

        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">Loading office...</div>
          </div>
        ) : (
          <div className="h-full w-full">
            <SceneCanvas agents={agents} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        )}

        <DetailPanel agent={selectedAgent} lastUpdated={lastUpdated} onClose={() => setSelectedId(null)} />
      </section>
    </div>
  );
}
