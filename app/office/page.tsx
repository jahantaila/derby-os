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
type LayoutPoint = { x: number; y: number };
type RelativeLayoutBox = { x: number; y: number; w: number; h: number };
type RelativeLayoutPoint = { x: number; y: number };

type Station = {
  desk: RelativeLayoutBox;
  sprite: RelativeLayoutPoint;
  status: RelativeLayoutBox;
  accent: RelativeLayoutBox;
  label: RelativeLayoutPoint;
  facing: "up" | "down";
  monitors?: number;
};

type ResolvedStation = {
  desk: LayoutBox;
  sprite: LayoutPoint;
  status: LayoutBox;
  accent: LayoutBox;
  label: LayoutPoint;
  facing: "up" | "down";
  monitors?: number;
};

type SceneMetrics = {
  width: number;
  height: number;
  unit: number;
};

type SafeInsets = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

const OFFICE_AGENT_IDS = ["kimberly", "alex", "sabri", "kevin", "jordan"] as const;
const OFFICE_AGENT_ID_SET = new Set<string>(OFFICE_AGENT_IDS);
const INTERNAL_WIDTH = 480;
const INTERNAL_HEIGHT = 320;
const SAFE_EDGE_X = 0.08;
const SAFE_EDGE_Y = 0.08;

const DEPARTMENT_META: Record<Department, { color: string; label: string }> = {
  Executive: { color: "#2093FF", label: "Executive" },
  Marketing: { color: "#F93C3C", label: "Marketing" },
  Development: { color: "#FFBD59", label: "Development" },
  Sales: { color: "#22C55E", label: "Sales" },
};

function boxFromCenter(x: number, y: number, w: number, h: number): RelativeLayoutBox {
  return { x: x - w / 2, y: y - h / 2, w, h };
}

function point(x: number, y: number): RelativeLayoutPoint {
  return { x, y };
}

const STATIONS: Record<string, Station> = {
  kimberly: {
    desk: boxFromCenter(0.5, 0.2, 0.2, 0.1),
    sprite: point(0.5, 0.245),
    status: boxFromCenter(0.5, 0.115, 0.24, 0.06),
    accent: boxFromCenter(0.5, 0.2, 0.24, 0.15),
    label: point(0.5, 0.085),
    facing: "up",
    monitors: 2,
  },
  kevin: {
    desk: boxFromCenter(0.25, 0.7, 0.22, 0.095),
    sprite: point(0.25, 0.75),
    status: boxFromCenter(0.25, 0.615, 0.28, 0.06),
    accent: boxFromCenter(0.25, 0.705, 0.3, 0.16),
    label: point(0.25, 0.575),
    facing: "up",
    monitors: 3,
  },
  alex: {
    desk: boxFromCenter(0.75, 0.25, 0.14, 0.08),
    sprite: point(0.75, 0.29),
    status: boxFromCenter(0.75, 0.165, 0.2, 0.06),
    accent: boxFromCenter(0.75, 0.25, 0.22, 0.13),
    label: point(0.75, 0.13),
    facing: "up",
  },
  sabri: {
    desk: boxFromCenter(0.75, 0.35, 0.14, 0.08),
    sprite: point(0.75, 0.39),
    status: boxFromCenter(0.75, 0.265, 0.2, 0.06),
    accent: boxFromCenter(0.75, 0.35, 0.22, 0.13),
    label: point(0.75, 0.23),
    facing: "up",
  },
  jordan: {
    desk: boxFromCenter(0.75, 0.7, 0.18, 0.09),
    sprite: point(0.75, 0.745),
    status: boxFromCenter(0.75, 0.615, 0.22, 0.06),
    accent: boxFromCenter(0.75, 0.705, 0.24, 0.15),
    label: point(0.75, 0.575),
    facing: "up",
  },
};

const DEPARTMENT_ZONES: Array<{ department: Department; box: RelativeLayoutBox }> = [
  { department: "Executive", box: boxFromCenter(0.5, 0.18, 0.34, 0.22) },
  { department: "Marketing", box: boxFromCenter(0.77, 0.29, 0.22, 0.31) },
  { department: "Development", box: boxFromCenter(0.24, 0.68, 0.3, 0.24) },
  { department: "Sales", box: boxFromCenter(0.76, 0.69, 0.26, 0.24) },
];

const COFFEE_ZONE = boxFromCenter(0.15, 0.5, 0.13, 0.1);
const WHITEBOARD = boxFromCenter(0.5, 0.5, 0.24, 0.14);
const IDEAS_BOARD = boxFromCenter(0.85, 0.5, 0.11, 0.08);
const HQ_SIGN = boxFromCenter(0.5, 0.08, 0.12, 0.06);
const PLANTS = [point(0.31, 0.43), point(0.66, 0.5), point(0.88, 0.49)];

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeInsets(metrics: SceneMetrics): SafeInsets {
  return {
    left: Math.round(metrics.width * SAFE_EDGE_X),
    right: Math.round(metrics.width * SAFE_EDGE_X),
    top: Math.round(metrics.height * SAFE_EDGE_Y),
    bottom: Math.round(metrics.height * SAFE_EDGE_Y),
  };
}

function px(metrics: SceneMetrics, value: number) {
  return Math.round(metrics.width * (value / INTERNAL_WIDTH));
}

function py(metrics: SceneMetrics, value: number) {
  return Math.round(metrics.height * (value / INTERNAL_HEIGHT));
}

function fontSize(metrics: SceneMetrics, size: number) {
  return Math.max(8, Math.round(metrics.unit * size));
}

function bubbleWidth(metrics: SceneMetrics, text: string) {
  return clamp(
    Math.round(text.length * metrics.unit * 4 + metrics.unit * 18),
    Math.round(metrics.unit * 76),
    Math.round(metrics.width * 0.24),
  );
}

function resolveBox(metrics: SceneMetrics, box: RelativeLayoutBox, inset = safeInsets(metrics)): LayoutBox {
  const w = Math.round(metrics.width * box.w);
  const h = Math.round(metrics.height * box.h);
  return {
    x: clamp(Math.round(metrics.width * box.x), inset.left, metrics.width - inset.right - w),
    y: clamp(Math.round(metrics.height * box.y), inset.top, metrics.height - inset.bottom - h),
    w,
    h,
  };
}

function resolvePoint(metrics: SceneMetrics, point: RelativeLayoutPoint, inset = safeInsets(metrics)): LayoutPoint {
  return {
    x: clamp(Math.round(metrics.width * point.x), inset.left, metrics.width - inset.right),
    y: clamp(Math.round(metrics.height * point.y), inset.top, metrics.height - inset.bottom),
  };
}

function resolveStation(metrics: SceneMetrics, station: Station): ResolvedStation {
  const inset = safeInsets(metrics);
  return {
    desk: resolveBox(metrics, station.desk, inset),
    sprite: resolvePoint(metrics, station.sprite, inset),
    status: resolveBox(metrics, station.status, inset),
    accent: resolveBox(metrics, station.accent, inset),
    label: resolvePoint(metrics, station.label, inset),
    facing: station.facing,
    monitors: station.monitors,
  };
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  metrics: SceneMetrics,
  text: string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign = "left",
) {
  const size = fontSize(metrics, 8);
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const label = text.toUpperCase();
  const width = ctx.measureText(label).width;
  const inset = safeInsets(metrics);
  const anchorX =
    align === "center"
      ? clamp(x, width / 2 + inset.left, metrics.width - inset.right - width / 2)
      : clamp(x, inset.left, metrics.width - inset.right - width);
  const anchorY = clamp(y, inset.top, metrics.height - inset.bottom - size);
  ctx.fillText(label, anchorX, anchorY);
}

function drawDesk(ctx: CanvasRenderingContext2D, metrics: SceneMetrics, station: ResolvedStation, accent: string) {
  drawRect(ctx, station.accent.x, station.accent.y, station.accent.w, station.accent.h, `${accent}44`);
  drawOutlineRect(ctx, station.desk.x, station.desk.y, station.desk.w, station.desk.h, ROOM.deskEdge, ROOM.deskTop);
  drawRect(ctx, station.desk.x + px(metrics, 8), station.desk.y + station.desk.h - py(metrics, 4), station.desk.w - px(metrics, 16), py(metrics, 3), "#3F2A18");

  const monitorCount = station.monitors ?? 1;
  for (let index = 0; index < monitorCount; index += 1) {
    const gap = px(metrics, 22);
    const offset = station.desk.x + px(metrics, 12) + index * gap;
    drawOutlineRect(ctx, offset, station.desk.y + py(metrics, 5), px(metrics, 16), py(metrics, 10), ROOM.monitor, ROOM.monitorGlow);
    drawRect(ctx, offset + px(metrics, 6), station.desk.y + py(metrics, 15), px(metrics, 4), py(metrics, 3), ROOM.monitor);
  }

  drawOutlineRect(ctx, station.sprite.x - px(metrics, 8), station.sprite.y + py(metrics, 5), px(metrics, 16), py(metrics, 10), ROOM.chairShadow, ROOM.chair);
}

function drawPlant(ctx: CanvasRenderingContext2D, metrics: SceneMetrics, x: number, y: number) {
  drawRect(ctx, x + px(metrics, 2), y + py(metrics, 6), px(metrics, 10), py(metrics, 7), ROOM.pot);
  drawRect(ctx, x + px(metrics, 1), y + py(metrics, 4), px(metrics, 12), py(metrics, 3), "#B17C52");
  drawRect(ctx, x + px(metrics, 5), y, px(metrics, 4), py(metrics, 8), ROOM.plantDark);
  drawRect(ctx, x + px(metrics, 1), y + py(metrics, 1), px(metrics, 12), py(metrics, 4), ROOM.plantLeaf);
  drawRect(ctx, x + px(metrics, 3), y - py(metrics, 2), px(metrics, 8), py(metrics, 4), ROOM.plantLeaf);
}

function drawCoffeeZone(ctx: CanvasRenderingContext2D, metrics: SceneMetrics) {
  const zone = resolveBox(metrics, COFFEE_ZONE);
  drawOutlineRect(ctx, zone.x, zone.y, zone.w, zone.h, ROOM.wallTrim, "#B98958");
  drawLabel(ctx, metrics, "Coffee", zone.x + zone.w / 2, zone.y + py(metrics, 6), "#FFF6E2", "center");
  drawOutlineRect(ctx, zone.x + Math.round(zone.w * 0.16), zone.y + Math.round(zone.h * 0.42), Math.round(zone.w * 0.3), Math.round(zone.h * 0.32), "#4B2F1C", ROOM.coffee);
  drawOutlineRect(ctx, zone.x + Math.round(zone.w * 0.54), zone.y + Math.round(zone.h * 0.42), Math.round(zone.w * 0.3), Math.round(zone.h * 0.32), "#4B2F1C", ROOM.coffee);
  drawRect(ctx, zone.x + Math.round(zone.w * 0.24), zone.y + Math.round(zone.h * 0.18), Math.round(zone.w * 0.1), Math.round(zone.h * 0.24), "#EEE2D0");
  drawRect(ctx, zone.x + Math.round(zone.w * 0.6), zone.y + Math.round(zone.h * 0.18), Math.round(zone.w * 0.1), Math.round(zone.h * 0.24), "#EEE2D0");
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, metrics: SceneMetrics) {
  const board = resolveBox(metrics, WHITEBOARD);
  drawOutlineRect(ctx, board.x, board.y, board.w, board.h, ROOM.wallTrim, ROOM.whiteboard);
  drawLabel(ctx, metrics, "Q2 Push", board.x + Math.round(board.w * 0.1), board.y + Math.round(board.h * 0.18), "#0F172A");
  drawRect(ctx, board.x + Math.round(board.w * 0.1), board.y + Math.round(board.h * 0.48), Math.round(board.w * 0.32), py(metrics, 2), "#2093FF");
  drawRect(ctx, board.x + Math.round(board.w * 0.1), board.y + Math.round(board.h * 0.62), Math.round(board.w * 0.42), py(metrics, 2), "#F93C3C");
  drawRect(ctx, board.x + Math.round(board.w * 0.1), board.y + Math.round(board.h * 0.76), Math.round(board.w * 0.24), py(metrics, 2), "#22C55E");
  drawRect(ctx, board.x + Math.round(board.w * 0.66), board.y + Math.round(board.h * 0.4), Math.round(board.w * 0.18), Math.round(board.h * 0.26), "#FFBD59");
}

function drawZoneBackground(ctx: CanvasRenderingContext2D, metrics: SceneMetrics, department: Department, box: RelativeLayoutBox) {
  const zone = resolveBox(metrics, box);
  drawRect(ctx, zone.x, zone.y, zone.w, zone.h, `${DEPARTMENT_META[department].color}18`);
  drawRect(ctx, zone.x, zone.y, zone.w, py(metrics, 2), `${DEPARTMENT_META[department].color}55`);
  drawLabel(ctx, metrics, department, zone.x + zone.w / 2, zone.y + py(metrics, 6), DEPARTMENT_META[department].color, "center");
}

function drawStatusCard(ctx: CanvasRenderingContext2D, metrics: SceneMetrics, station: ResolvedStation, agent: OfficeAgent, selected: boolean) {
  const light = agent.status === "working" ? "#22C55E" : agent.status === "offline" ? "#EF4444" : "#FBBF24";
  const text = agent.currentTask ? truncate(agent.currentTask.title, 18) : truncate(agent.lastActivity, 18);

  drawOutlineRect(ctx, station.status.x, station.status.y, station.status.w, station.status.h, "#3B2D1E", ROOM.bubble);
  drawRect(ctx, station.status.x + px(metrics, 4), station.status.y + py(metrics, 6), px(metrics, 5), py(metrics, 5), light);
  drawLabel(ctx, metrics, text, station.status.x + px(metrics, 14), station.status.y + py(metrics, 5), ROOM.ink);
  if (selected) {
    drawRect(ctx, station.status.x, station.status.y + station.status.h + py(metrics, 2), station.status.w, py(metrics, 2), agent.accent);
  }
}

function drawAgent(ctx: CanvasRenderingContext2D, metrics: SceneMetrics, agent: OfficeAgent, station: ResolvedStation, frame: number, hovered: boolean, selected: boolean) {
  const working = agent.status === "working";
  const bob = working ? 0 : Math.sin(frame / 16) > 0 ? -py(metrics, 1) : 0;
  const typing = working && Math.sin(frame / 6) > 0 ? py(metrics, 1) : 0;
  const spriteX = station.sprite.x;
  const spriteY = station.sprite.y + bob;
  const skin = "#F1C27D";
  const hair = agent.id === "alex" ? "#7C4A29" : agent.id === "sabri" ? "#26160F" : agent.id === "jordan" ? "#9A5B2E" : "#3B2818";
  const outline = selected ? agent.accent : hovered ? "#FFF4D8" : "#1F150F";

  drawRect(ctx, spriteX - px(metrics, 9), spriteY - py(metrics, 14), px(metrics, 18), py(metrics, 3), outline);
  drawRect(ctx, spriteX - px(metrics, 8), spriteY - py(metrics, 13), px(metrics, 16), py(metrics, 2), outline);
  drawRect(ctx, spriteX - px(metrics, 4), spriteY - py(metrics, 10), px(metrics, 8), py(metrics, 5), hair);
  drawRect(ctx, spriteX - px(metrics, 3), spriteY - py(metrics, 6), px(metrics, 6), py(metrics, 5), skin);
  drawRect(ctx, spriteX - px(metrics, 5), spriteY - py(metrics, 1), px(metrics, 10), py(metrics, 7), agent.shirt);
  drawRect(ctx, spriteX - px(metrics, 6), spriteY + py(metrics, 6), px(metrics, 12), py(metrics, 6), "#1E293B");
  drawRect(ctx, spriteX - px(metrics, 7), spriteY + py(metrics, 3), px(metrics, 3), py(metrics, 2) + typing, skin);
  drawRect(ctx, spriteX + px(metrics, 4), spriteY + py(metrics, 3), px(metrics, 3), py(metrics, 2) + (typing ? 0 : py(metrics, 1)), skin);
  drawRect(ctx, spriteX - px(metrics, 5), spriteY + py(metrics, 12), px(metrics, 3), py(metrics, 4), "#111827");
  drawRect(ctx, spriteX + px(metrics, 2), spriteY + py(metrics, 12), px(metrics, 3), py(metrics, 4), "#111827");

  drawLabel(ctx, metrics, agent.name, station.label.x, station.label.y, ROOM.ink, "center");
}

function drawSpeechBubble(ctx: CanvasRenderingContext2D, metrics: SceneMetrics, agent: OfficeAgent, station: ResolvedStation) {
  const message = agent.currentTask?.title ?? agent.lastActivity;
  const width = bubbleWidth(metrics, message);
  const height = py(metrics, 22);
  const inset = safeInsets(metrics);
  const bubbleX = clamp(Math.round(station.sprite.x - width / 2), inset.left, metrics.width - inset.right - width);
  const bubbleY = clamp(station.sprite.y - py(metrics, 42), inset.top, metrics.height - inset.bottom - height - py(metrics, 8));
  const tailX = clamp(station.sprite.x - px(metrics, 2), bubbleX + px(metrics, 4), bubbleX + width - px(metrics, 9));

  drawOutlineRect(ctx, bubbleX, bubbleY, width, height, "#4A3623", ROOM.bubble);
  if (bubbleY + height + py(metrics, 5) <= metrics.height - inset.bottom) {
    drawRect(ctx, tailX, bubbleY + height, px(metrics, 5), py(metrics, 5), ROOM.bubble);
  }
  drawLabel(ctx, metrics, truncate(message, 34), bubbleX + px(metrics, 6), bubbleY + py(metrics, 7), ROOM.ink);
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  metrics: SceneMetrics,
  agents: OfficeAgent[],
  selectedId: string | null,
  hoveredId: string | null,
  frame: number,
) {
  const hq = resolveBox(metrics, HQ_SIGN);
  const ideas = resolveBox(metrics, IDEAS_BOARD);

  drawRect(ctx, 0, 0, metrics.width, metrics.height, ROOM.background);
  drawRect(ctx, 0, 0, metrics.width, py(metrics, 72), ROOM.wallTop);
  drawRect(ctx, 0, py(metrics, 72), metrics.width, py(metrics, 6), ROOM.wallTrim);

  for (let y = py(metrics, 78); y < metrics.height; y += py(metrics, 16)) {
    for (let x = 0; x < metrics.width; x += px(metrics, 16)) {
      drawRect(ctx, x, y, px(metrics, 16), py(metrics, 16), (Math.floor(x / px(metrics, 16)) + Math.floor(y / py(metrics, 16))) % 2 === 0 ? ROOM.floorA : ROOM.floorB);
    }
  }

  drawRect(ctx, 0, metrics.height - py(metrics, 12), metrics.width, py(metrics, 12), ROOM.floorShadow);

  DEPARTMENT_ZONES.forEach((zone) => drawZoneBackground(ctx, metrics, zone.department, zone.box));

  drawOutlineRect(ctx, hq.x, hq.y, hq.w, hq.h, "#725230", "#EFD9AE");
  drawLabel(ctx, metrics, "HQ", hq.x + hq.w / 2, hq.y + py(metrics, 4), ROOM.ink, "center");
  drawCoffeeZone(ctx, metrics);
  drawWhiteboard(ctx, metrics);
  PLANTS.forEach((plant) => {
    const resolved = resolvePoint(metrics, plant);
    drawPlant(ctx, metrics, resolved.x, resolved.y);
  });
  drawOutlineRect(ctx, ideas.x, ideas.y, ideas.w, ideas.h, "#6C4A2A", "#E9D7B6");
  drawLabel(ctx, metrics, "Ideas", ideas.x + ideas.w / 2, ideas.y + py(metrics, 8), ROOM.ink, "center");
  drawRect(ctx, ideas.x + Math.round(ideas.w * 0.15), ideas.y + Math.round(ideas.h * 0.68), Math.round(ideas.w * 0.7), py(metrics, 2), "#2093FF");

  agents.forEach((agent) => {
    const baseStation = STATIONS[agent.id];
    const station = baseStation ? resolveStation(metrics, baseStation) : null;
    if (!station) return;
    drawDesk(ctx, metrics, station, agent.accent);
    drawStatusCard(ctx, metrics, station, agent, selectedId === agent.id);
  });

  agents.forEach((agent) => {
    const baseStation = STATIONS[agent.id];
    const station = baseStation ? resolveStation(metrics, baseStation) : null;
    if (!station) return;
    drawAgent(ctx, metrics, agent, station, frame, hoveredId === agent.id, selectedId === agent.id);
  });

  if (hoveredId) {
    const hovered = agents.find((agent) => agent.id === hoveredId);
    const station = hovered ? STATIONS[hovered.id] : null;
    if (hovered && station) drawSpeechBubble(ctx, metrics, hovered, resolveStation(metrics, station));
  }
}

function hitAgent(x: number, y: number, agents: OfficeAgent[], metrics: SceneMetrics) {
  for (const agent of agents) {
    const baseStation = STATIONS[agent.id];
    const station = baseStation ? resolveStation(metrics, baseStation) : null;
    if (!station) continue;
    const withinSprite =
      x >= station.sprite.x - px(metrics, 12) &&
      x <= station.sprite.x + px(metrics, 12) &&
      y >= station.sprite.y - py(metrics, 16) &&
      y <= station.sprite.y + py(metrics, 20);
    const withinStatus =
      x >= station.status.x &&
      x <= station.status.x + station.status.w &&
      y >= station.status.y &&
      y <= station.status.y + station.status.h + py(metrics, 4);
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const visibleCtx = canvas.getContext("2d");
    if (!visibleCtx) return;

    let frame = 0;
    let rafId = 0;

    const render = () => {
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }

      visibleCtx.imageSmoothingEnabled = false;
      visibleCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      visibleCtx.clearRect(0, 0, rect.width, rect.height);
      drawRoom(visibleCtx, {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
        unit: Math.max(1, Math.min(rect.width / INTERNAL_WIDTH, rect.height / INTERNAL_HEIGHT)),
      }, agents, selectedId, hoveredId, frame);

      frame += 1;
      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [agents, hoveredId, selectedId]);

  const toInternalPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return {
      x,
      y,
      metrics: {
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
        unit: Math.max(1, Math.min(rect.width / INTERNAL_WIDTH, rect.height / INTERNAL_HEIGHT)),
      },
    };
  };

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer touch-none [image-rendering:pixelated]"
        onPointerMove={(event) => {
          const point = toInternalPoint(event);
          setHoveredId(point ? hitAgent(point.x, point.y, agents, point.metrics) : null);
        }}
        onPointerLeave={() => setHoveredId(null)}
        onClick={(event) => {
          const point = toInternalPoint(event);
          onSelect(point ? hitAgent(point.x, point.y, agents, point.metrics) : null);
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
