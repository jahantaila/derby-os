"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AgentStatus = "idle" | "working";
type Facing = "left" | "right" | "up" | "down";
type AgentApiRecord = {
  id: string;
  name: string;
  role: string;
  department: "Executive" | "Marketing" | "Sales" | "Development";
  accent: string;
  status: AgentStatus;
  task: string | null;
};

type AgentSprite = AgentApiRecord & {
  x: number;
  y: number;
  seatX: number;
  seatY: number;
  deskX: number;
  deskY: number;
  path: Array<{ x: number; y: number }>;
  facing: Facing;
  mode: "idle" | "working" | "walking";
  lastMode: AgentStatus;
  hoverRadius: number;
};

type Viewport = {
  width: number;
  height: number;
};

type SceneTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type AgentArt = {
  shirt: string;
  hair: string;
  skin: string;
  pants: string;
  shoes: string;
  label: string;
  hairStyle: "long" | "short" | "fade" | "parted" | "curly";
};

const WORLD_WIDTH = 1408;
const WORLD_HEIGHT = 1100;
const TILE_SIZE = 32;
const PIXEL_SIZE = 5;
const SPRITE_SIZE = 16;
const HUD_TEXT = "#f6f2ea";
const HUD_MUTED = "#c9b7a2";
const OFFICE_AGENT_ORDER = ["kimberly", "kevin", "sabri", "alex", "jordan"] as const;

const DESK_POSITIONS = {
  kimberly: { x: 302, y: 320 },
  kevin: { x: 270, y: 640 },
  sabri: { x: 1060, y: 320 },
  alex: { x: 950, y: 320 },
  jordan: { x: 980, y: 640 },
};

const LOUNGE_POSITIONS = {
  kimberly: { x: 432, y: 880 },
  kevin: { x: 606, y: 900 },
  sabri: { x: 732, y: 900 },
  alex: { x: 554, y: 840 },
  jordan: { x: 684, y: 840 },
};

const AGENT_ART: Record<(typeof OFFICE_AGENT_ORDER)[number], AgentArt> = {
  kimberly: {
    shirt: "#2093FF",
    hair: "#20161A",
    skin: "#F0C1A1",
    pants: "#2A3550",
    shoes: "#1A130F",
    label: "#70B9FF",
    hairStyle: "long",
  },
  kevin: {
    shirt: "#FFBD59",
    hair: "#6B4126",
    skin: "#F4C8A4",
    pants: "#37445F",
    shoes: "#241A12",
    label: "#FFD47E",
    hairStyle: "short",
  },
  sabri: {
    shirt: "#F93C3C",
    hair: "#111111",
    skin: "#E0A884",
    pants: "#233046",
    shoes: "#17120F",
    label: "#FF7A7A",
    hairStyle: "fade",
  },
  alex: {
    shirt: "#F93C3C",
    hair: "#D8B250",
    skin: "#F6D4B3",
    pants: "#394967",
    shoes: "#2A211A",
    label: "#FF9A8D",
    hairStyle: "parted",
  },
  jordan: {
    shirt: "#22C55E",
    hair: "#231B1B",
    skin: "#D79A77",
    pants: "#2C3C58",
    shoes: "#17120F",
    label: "#67E096",
    hairStyle: "curly",
  },
};

function truncateTask(task: string | null, max = 28) {
  if (!task) return "Idle";
  return task.length > max ? `${task.slice(0, max - 1)}...` : task;
}

function formatSync(updatedAt: string | null) {
  if (!updatedAt) return "WAITING";
  return new Date(updatedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getViewport(): Viewport {
  if (typeof window === "undefined") {
    return { width: 1280, height: 720 };
  }

  const desktop = window.innerWidth >= 900;
  return {
    width: Math.max(1, window.innerWidth - (desktop ? 60 : 0)),
    height: Math.max(1, window.innerHeight - (desktop ? 0 : 72)),
  };
}

function getSceneTransform(width: number, height: number): SceneTransform {
  const scale = Math.max(width / WORLD_WIDTH, height / WORLD_HEIGHT);
  return {
    scale,
    offsetX: (width - WORLD_WIDTH * scale) / 2,
    offsetY: (height - WORLD_HEIGHT * scale) / 2,
  };
}

function makeTransitPath(start: { x: number; y: number }, target: { x: number; y: number }) {
  const corridorY = start.y < 500 || target.y < 500 ? 500 : 760;
  return [
    { x: start.x, y: start.y },
    { x: start.x, y: corridorY },
    { x: target.x, y: corridorY },
    { x: target.x, y: target.y },
  ];
}

function makeInitialAgent(record: AgentApiRecord): AgentSprite {
  const desk = DESK_POSITIONS[record.id as keyof typeof DESK_POSITIONS];
  const lounge = LOUNGE_POSITIONS[record.id as keyof typeof LOUNGE_POSITIONS];
  const atDesk = record.status === "working";
  const x = atDesk ? desk.x : lounge.x;
  const y = atDesk ? desk.y : lounge.y;

  return {
    ...record,
    x,
    y,
    seatX: lounge.x,
    seatY: lounge.y,
    deskX: desk.x,
    deskY: desk.y,
    path: [],
    facing: "down",
    mode: record.status,
    lastMode: record.status,
    hoverRadius: 48,
  };
}

function syncAgents(previous: AgentSprite[], nextData: AgentApiRecord[]): AgentSprite[] {
  const prevById = new Map(previous.map((agent) => [agent.id, agent]));

  return nextData.map((record) => {
    const current = prevById.get(record.id);
    if (!current) return makeInitialAgent(record);

    const desk = DESK_POSITIONS[record.id as keyof typeof DESK_POSITIONS];
    const lounge = LOUNGE_POSITIONS[record.id as keyof typeof LOUNGE_POSITIONS];
    const target = record.status === "working" ? desk : lounge;
    const statusChanged = current.lastMode !== record.status;

    if (!statusChanged) {
      const mode: AgentSprite["mode"] = current.mode === "walking" ? "walking" : record.status;
      return {
        ...current,
        ...record,
        seatX: lounge.x,
        seatY: lounge.y,
        deskX: desk.x,
        deskY: desk.y,
        mode,
        lastMode: record.status,
        hoverRadius: 48,
      };
    }

    return {
      ...current,
      ...record,
      seatX: lounge.x,
      seatY: lounge.y,
      deskX: desk.x,
      deskY: desk.y,
      path: makeTransitPath({ x: current.x, y: current.y }, target).slice(1),
      mode: "walking",
      lastMode: record.status,
      hoverRadius: 48,
    };
  });
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawWoodFloor(ctx: CanvasRenderingContext2D, x0: number, y0: number, width: number, height: number) {
  const startTileX = Math.floor(x0 / TILE_SIZE);
  const startTileY = Math.floor(y0 / TILE_SIZE);
  const endTileX = Math.ceil((x0 + width) / TILE_SIZE);
  const endTileY = Math.ceil((y0 + height) / TILE_SIZE);

  for (let y = startTileY; y < endTileY; y += 1) {
    for (let x = startTileX; x < endTileX; x += 1) {
      const tileX = x * TILE_SIZE;
      const tileY = y * TILE_SIZE;
      ctx.fillStyle = (x + y) % 2 === 0 ? "#3d3428" : "#4a3f32";
      ctx.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(tileX + 4, tileY + 3, TILE_SIZE - 8, 1);
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(tileX, tileY + TILE_SIZE - 2, TILE_SIZE, 2);
    }
  }
}

function drawWallsAndLights(ctx: CanvasRenderingContext2D, timeMs: number) {
  for (const [x, y] of [
    [260, 84],
    [548, 84],
    [836, 84],
    [1124, 84],
  ]) {
    drawGlow(ctx, x, y, 154, "#F5C77A", 0.18 + Math.sin(timeMs / 900 + x * 0.01) * 0.03);
    ctx.fillStyle = "#efe2bf";
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,245,220,0.24)";
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWindow(ctx: CanvasRenderingContext2D, hour: number, timeMs: number) {
  const x = 1188;
  const y = 118;
  const w = 172;
  const h = 188;
  const isDay = hour >= 6 && hour < 18;
  ctx.fillStyle = "#2a3545";
  ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, isDay ? "#8AB9E8" : "#0D1730");
  sky.addColorStop(1, isDay ? "#E7B270" : "#16284A");
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = isDay ? "#F8D567" : "#E6F0FF";
  ctx.globalAlpha = 0.92 + Math.sin(timeMs / 1400) * 0.04;
  ctx.beginPath();
  ctx.arc(x + 34, y + 34, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (!isDay) {
    ctx.fillStyle = "#16284A";
    ctx.beginPath();
    ctx.arc(x + 40, y + 29, 11, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "rgba(248, 213, 103, 0.5)";
    ctx.lineWidth = 2;
    for (const [dx, dy] of [
      [0, -19],
      [0, 19],
      [-19, 0],
      [19, 0],
      [-13, -13],
      [13, -13],
      [-13, 13],
      [13, 13],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x + 34 + dx * 0.72, y + 34 + dy * 0.72);
      ctx.lineTo(x + 34 + dx, y + 34 + dy);
      ctx.stroke();
    }
  }

  if (!isDay) {
    for (const [sx, sy, radius] of [
      [x + 76, y + 30, 2],
      [x + 144, y + 44, 1.5],
      [x + 116, y + 22, 1.75],
    ]) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x + 55, y, 4, h);
  ctx.fillRect(x + 112, y, 4, h);
  ctx.fillRect(x, y + 92, w, 4);

  const buildings = [
    { bx: x + 8, by: y + 96, bw: 28, bh: 82 },
    { bx: x + 44, by: y + 84, bw: 24, bh: 94 },
    { bx: x + 74, by: y + 110, bw: 20, bh: 68 },
    { bx: x + 102, by: y + 72, bw: 30, bh: 106 },
    { bx: x + 138, by: y + 104, bw: 24, bh: 74 },
  ];

  for (const building of buildings) {
    ctx.fillStyle = "#0A1222";
    ctx.fillRect(building.bx, building.by, building.bw, building.bh);
    for (let wy = building.by + 8; wy < building.by + building.bh - 6; wy += 12) {
      for (let wx = building.bx + 4; wx < building.bx + building.bw - 4; wx += 8) {
        ctx.fillStyle = isDay ? "#9FB5D0" : (wx + wy) % 3 === 0 ? "#FFBD59" : (wx + wy) % 4 === 0 ? "#2093FF" : "#E97474";
        ctx.fillRect(wx, wy, 3, 5);
      }
    }
  }

  ctx.fillStyle = isDay ? "rgba(255, 220, 140, 0.12)" : "rgba(160, 210, 255, 0.08)";
  ctx.fillRect(x, y, w, h);
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.fillStyle = "#4a3828";
  ctx.fillRect(x - 14 * scale, y, 28 * scale, 18 * scale);
  ctx.fillStyle = "#2d6b3f";
  ctx.fillRect(x - 10 * scale, y - 22 * scale, 20 * scale, 14 * scale);
  ctx.fillRect(x - 18 * scale, y - 14 * scale, 14 * scale, 12 * scale);
  ctx.fillRect(x + 4 * scale, y - 16 * scale, 14 * scale, 12 * scale);
  ctx.fillStyle = "#4a8f56";
  ctx.fillRect(x - 2 * scale, y - 34 * scale, 8 * scale, 16 * scale);
}

function drawSwivelChair(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string) {
  ctx.fillStyle = "#241E19";
  ctx.fillRect(x - 3, y + 8, 6, 18);
  ctx.fillRect(x - 16, y + 22, 32, 4);
  ctx.fillRect(x - 18, y + 26, 6, 4);
  ctx.fillRect(x + 12, y + 26, 6, 4);
  ctx.fillRect(x - 4, y + 28, 8, 4);
  ctx.fillStyle = "#2F353D";
  ctx.fillRect(x - 18, y - 10, 36, 18);
  ctx.fillStyle = accent;
  ctx.fillRect(x - 18, y - 10, 36, 4);
}

function drawTrashCan(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#3B404A";
  ctx.fillRect(x - 10, y - 16, 20, 18);
  ctx.fillStyle = "#59606D";
  ctx.fillRect(x - 12, y - 18, 24, 4);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(x - 4, y - 14, 2, 12);
  ctx.fillRect(x, y - 14, 2, 12);
  ctx.fillRect(x + 4, y - 14, 2, 12);
}

function drawScreensaver(ctx: CanvasRenderingContext2D, x: number, y: number, timeMs: number) {
  const width = 32;
  const height = 16;
  const radius = 3;
  const periodX = width - radius * 2;
  const periodY = height - radius * 2;
  const rawX = ((timeMs / 35) % (periodX * 2)) as number;
  const rawY = ((timeMs / 48) % (periodY * 2)) as number;
  const bounceX = rawX > periodX ? periodX * 2 - rawX : rawX;
  const bounceY = rawY > periodY ? periodY * 2 - rawY : rawY;

  ctx.fillStyle = "#1E6CFF";
  ctx.beginPath();
  ctx.arc(x - width / 2 + radius + bounceX, y - height / 2 + radius + bounceY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawDeskSetup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: "left" | "right",
  accent: string,
  label: string,
  occupied: boolean,
  timeMs: number,
) {
  const topX = side === "left" ? x - 70 : x - 18;
  const returnX = side === "left" ? x - 12 : x - 74;

  ctx.fillStyle = "#2A211A";
  ctx.fillRect(topX - 6, y - 48, 116, 62);
  ctx.fillRect(returnX - 6, y - 8, 60, 56);

  ctx.fillStyle = "#3A3530";
  ctx.fillRect(topX, y - 52, 108, 54);
  ctx.fillRect(returnX, y - 12, 52, 48);

  ctx.fillStyle = "#5A4A3B";
  ctx.fillRect(topX + 8, y - 48, 8, 50);
  ctx.fillRect(topX + 92, y - 48, 8, 50);
  ctx.fillRect(returnX + 6, y + 4, 8, 32);
  ctx.fillRect(returnX + 38, y + 4, 8, 32);

  ctx.fillStyle = "#191B25";
  ctx.fillRect(x - 20, y - 52, 40, 24);
  ctx.fillStyle = occupied ? "#2093FF" : "#0E1422";
  ctx.fillRect(x - 16, y - 48, 32, 16);
  if (occupied) {
    drawGlow(ctx, x, y - 40, 46, "#2093FF", 0.15);
  } else {
    drawScreensaver(ctx, x, y - 40, timeMs);
  }

  ctx.fillStyle = "#111827";
  ctx.fillRect(x - 4, y - 28, 8, 14);
  ctx.fillRect(x - 16, y - 16, 32, 4);
  ctx.fillStyle = "#D7DCE7";
  ctx.fillRect(returnX + 14, y + 4, 18, 10);
  ctx.fillStyle = accent;
  ctx.fillRect(returnX + 12, y + 18, 8, 8);
  ctx.fillStyle = "#B48B66";
  ctx.fillRect(returnX + 28, y + 16, 10, 2);
  ctx.fillStyle = "#F8E16A";
  ctx.fillRect(topX + 18, y - 42, 12, 12);
  ctx.fillStyle = "#FF9FB2";
  ctx.fillRect(topX + 34, y - 38, 10, 10);
  ctx.fillStyle = "#F5F1E6";
  ctx.fillRect(topX + 72, y - 40, 14, 8);

  ctx.fillStyle = "rgba(8,7,6,0.24)";
  ctx.fillRect(topX + 4, y + 6, 96, 4);

  ctx.fillStyle = "rgba(17,12,8,0.72)";
  drawRoundedRect(ctx, x - 44, y + 56, 88, 18, 9);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.font = "600 10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 68);

  drawTrashCan(ctx, side === "left" ? x - 82 : x + 82, y + 42);
}

function drawMeetingArea(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(748, 518, 154, 86, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7A604A";
  ctx.beginPath();
  ctx.ellipse(748, 500, 146, 78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9B7A58";
  ctx.beginPath();
  ctx.ellipse(748, 494, 132, 62, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const [x, y] of [
    [622, 500],
    [874, 500],
    [748, 398],
    [748, 602],
  ]) {
    drawSwivelChair(ctx, x, y, "#6A7280");
  }

  ctx.fillStyle = "#EFE4D1";
  ctx.fillRect(716, 476, 64, 14);
  ctx.fillStyle = "#C54747";
  ctx.fillRect(722, 480, 18, 6);
  ctx.fillStyle = "#2093FF";
  ctx.fillRect(746, 480, 28, 6);
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#4C3528";
  ctx.fillRect(x, y, 96, 120);
  ctx.fillStyle = "#674A37";
  ctx.fillRect(x + 8, y + 10, 80, 8);
  ctx.fillRect(x + 8, y + 42, 80, 8);
  ctx.fillRect(x + 8, y + 74, 80, 8);
  ctx.fillRect(x + 8, y + 106, 80, 8);

  for (const [bx, by, bw, color] of [
    [12, 18, 12, "#D4A373"],
    [28, 18, 10, "#70B9FF"],
    [42, 18, 14, "#E97474"],
    [60, 18, 11, "#8FD18A"],
    [16, 50, 16, "#F2C879"],
    [36, 50, 10, "#D98FB8"],
    [50, 50, 18, "#8AA6D9"],
    [16, 82, 12, "#E7B270"],
    [34, 82, 14, "#D6CFBF"],
    [52, 82, 10, "#F87171"],
  ] as const) {
    ctx.fillStyle = color;
    ctx.fillRect(x + bx, y + by, bw, 20);
  }
}

function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#CBD6E4";
  ctx.fillRect(x - 16, y - 40, 32, 86);
  ctx.fillStyle = "#9AB1C7";
  ctx.beginPath();
  ctx.arc(x, y - 24, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#75A9E3";
  ctx.beginPath();
  ctx.arc(x, y - 25, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#E9EDF5";
  ctx.fillRect(x - 12, y + 46, 24, 18);
  ctx.fillStyle = "#F87171";
  ctx.fillRect(x - 10, y + 8, 6, 10);
  ctx.fillStyle = "#60A5FA";
  ctx.fillRect(x + 4, y + 8, 6, 10);
}

function drawLounge(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.14)";
  drawRoundedRect(ctx, 470, 780, 220, 124, 28);
  ctx.fill();
  ctx.fillStyle = "#7A4F3C";
  drawRoundedRect(ctx, 482, 768, 196, 112, 24);
  ctx.fill();
  ctx.fillStyle = "#A56A52";
  drawRoundedRect(ctx, 496, 780, 168, 88, 22);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(508, 794, 144, 6);
  ctx.fillRect(508, 846, 144, 6);

  ctx.fillStyle = "#5B3A31";
  ctx.fillRect(408, 810, 312, 86);
  ctx.fillRect(394, 824, 18, 72);
  ctx.fillRect(720, 824, 18, 72);
  ctx.fillStyle = "#C59A73";
  ctx.fillRect(420, 798, 288, 74);
  ctx.fillStyle = "#E0B58C";
  ctx.fillRect(434, 810, 260, 24);
  ctx.fillRect(434, 842, 260, 24);
  ctx.fillStyle = "#7D5B45";
  ctx.fillRect(548, 872, 34, 14);
  ctx.fillRect(620, 872, 34, 14);

  ctx.fillStyle = "#6A4E37";
  ctx.fillRect(534, 918, 112, 38);
  ctx.fillStyle = "#8C6A4B";
  ctx.fillRect(542, 910, 96, 26);
  ctx.fillStyle = "#E6D8BF";
  ctx.fillRect(570, 916, 36, 10);
  ctx.fillStyle = "#C8A977";
  ctx.fillRect(552, 938, 18, 6);
  ctx.fillRect(610, 938, 18, 6);

  ctx.fillStyle = "#EAD7BE";
  ctx.font = "700 20px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("LOUNGE", 564, 778);

  drawBookshelf(ctx, 792, 792);
  drawWaterCooler(ctx, 860, 846);
  drawPlant(ctx, 916, 896, 1.3);
  ctx.restore();
}

function drawServerRack(ctx: CanvasRenderingContext2D, timeMs: number) {
  ctx.fillStyle = "#232833";
  ctx.fillRect(1164, 510, 86, 158);
  ctx.fillStyle = "#11141B";
  ctx.fillRect(1174, 520, 66, 138);

  for (let i = 0; i < 5; i += 1) {
    const y = 532 + i * 24;
    const tick = Math.floor(timeMs / 180);
    const firstBlink = (tick + i) % 4 <= 1;
    const secondBlink = (tick + i * 2) % 6 === 0 || (tick + i * 2) % 6 === 1;
    ctx.fillStyle = "#2D3640";
    ctx.fillRect(1182, y, 50, 14);
    ctx.fillStyle = i === 1 ? "#2093FF" : "#8FA5B8";
    ctx.fillRect(1186, y + 4, 26, 4);
    ctx.fillStyle = firstBlink ? "#22C55E" : "#56745F";
    ctx.fillRect(1218, y + 4, 4, 4);
    ctx.fillStyle = secondBlink ? "#F59E0B" : "#56745F";
    ctx.fillRect(1226, y + 4, 4, 4);
  }
}

function drawWallClock(ctx: CanvasRenderingContext2D, now: Date) {
  const cx = 280;
  const cy = 142;
  const minutes = now.getMinutes();
  const hours = now.getHours() % 12 + minutes / 60;

  ctx.fillStyle = "#E8E1D3";
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5B5046";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = "#43372D";
  ctx.lineCap = "round";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin((Math.PI * 2 * hours) / 12) * 12, cy - Math.cos((Math.PI * 2 * hours) / 12) * 12);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin((Math.PI * 2 * minutes) / 60) * 18, cy - Math.cos((Math.PI * 2 * minutes) / 60) * 18);
  ctx.stroke();

  ctx.fillStyle = "#43372D";
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawWallDecor(ctx: CanvasRenderingContext2D, now: Date) {
  drawWallClock(ctx, now);

  ctx.fillStyle = "#D6CFBF";
  ctx.fillRect(92, 110, 236, 92);
  ctx.fillStyle = "#F8F7F0";
  ctx.fillRect(100, 118, 220, 76);
  ctx.fillStyle = "#95A3B5";
  ctx.fillRect(118, 144, 72, 4);
  ctx.fillRect(200, 136, 82, 4);
  ctx.fillStyle = "#D94645";
  ctx.font = "700 24px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("SPRINT", 118, 171);

  ctx.fillStyle = "#DCCDBA";
  ctx.fillRect(420, 118, 150, 84);
  ctx.fillStyle = "#F4F0E8";
  ctx.fillRect(428, 126, 134, 68);
  ctx.fillStyle = "#95A3B5";
  ctx.fillRect(448, 150, 60, 4);
  ctx.fillRect(520, 140, 22, 22);
  ctx.fillStyle = "#F93C3C";
  ctx.fillRect(468, 168, 30, 4);
  ctx.fillStyle = "#2093FF";
  ctx.fillRect(510, 168, 24, 4);

  ctx.fillStyle = "#2C2220";
  drawRoundedRect(ctx, 698, 124, 204, 58, 16);
  ctx.fill();
  ctx.fillStyle = "#EAD7BE";
  ctx.font = "700 24px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("DERBY DIGITAL", 800, 160);
}

function drawCorridorAccents(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(160, 500, 1088, 10);
  ctx.fillRect(160, 760, 1088, 10);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(160, 510, 1088, 4);
  ctx.fillRect(160, 770, 1088, 4);
}

function drawDustMotes(ctx: CanvasRenderingContext2D, timeMs: number) {
  const particles = [
    { x: 196, y: 728, speed: 0.012, drift: 18, offset: 0 },
    { x: 498, y: 702, speed: 0.016, drift: 12, offset: 700 },
    { x: 884, y: 744, speed: 0.01, drift: 16, offset: 1300 },
    { x: 1162, y: 690, speed: 0.014, drift: 10, offset: 1900 },
  ];

  for (const particle of particles) {
    const progress = ((timeMs + particle.offset) * particle.speed) % 1;
    const px = particle.x + Math.sin((timeMs + particle.offset) / 1800) * particle.drift;
    const py = particle.y - progress * 280;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLightingOverlay(ctx: CanvasRenderingContext2D, hour: number) {
  const isDay = hour >= 6 && hour < 18;
  ctx.fillStyle = isDay ? "rgba(255, 223, 140, 0.08)" : "rgba(120, 170, 255, 0.1)";
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
}

function drawTaskBubble(ctx: CanvasRenderingContext2D, agent: AgentSprite, timeMs: number) {
  const text = truncateTask(agent.task, 22);
  ctx.save();
  ctx.font = "600 11px 'Courier New', monospace";
  const width = Math.max(94, ctx.measureText(text).width + 24);
  const x = agent.x - width / 2;
  const y = agent.y - 88 - Math.sin(timeMs / 420 + agent.x * 0.01) * 2;
  const alpha = 0.88 + Math.sin(timeMs / 600 + agent.x * 0.01) * 0.06;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#FFFDF8";
  ctx.strokeStyle = "rgba(42,32,24,0.18)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x, y, width, 28, 12);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(agent.x - 8, y + 28);
  ctx.lineTo(agent.x, y + 40);
  ctx.lineTo(agent.x + 8, y + 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2B221B";
  ctx.fillText(text, x + 12, y + 18);
  ctx.restore();
}

function drawTooltip(ctx: CanvasRenderingContext2D, agent: AgentSprite) {
  const art = AGENT_ART[agent.id as keyof typeof AGENT_ART];
  const width = 214;
  const height = 70;
  const x = agent.x - width / 2;
  const y = agent.y - 124;

  ctx.save();
  ctx.fillStyle = "rgba(17, 13, 12, 0.92)";
  ctx.strokeStyle = `${art.shirt}aa`;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 18;
  drawRoundedRect(ctx, x, y, width, height, 16);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(agent.x - 12, y + height - 1);
  ctx.lineTo(agent.x, y + height + 12);
  ctx.lineTo(agent.x + 12, y + height - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#FFF8F0";
  ctx.font = "600 15px var(--font-geist), sans-serif";
  ctx.fillText(agent.name, x + 16, y + 22);
  ctx.fillStyle = art.shirt;
  ctx.font = "600 11px 'Courier New', monospace";
  ctx.fillText(agent.role, x + 16, y + 40);
  ctx.fillStyle = "#E4D5C4";
  ctx.font = "12px var(--font-geist), sans-serif";
  ctx.fillText(truncateTask(agent.task, 30), x + 16, y + 58);
  ctx.restore();
}

function drawNameLabel(ctx: CanvasRenderingContext2D, agent: AgentSprite) {
  const art = AGENT_ART[agent.id as keyof typeof AGENT_ART];
  const width = Math.max(58, agent.name.length * 8 + 16);
  const x = agent.x - width / 2;
  const y = agent.y + 36;

  ctx.save();
  ctx.fillStyle = "rgba(22,16,12,0.82)";
  drawRoundedRect(ctx, x, y, width, 18, 9);
  ctx.fill();
  ctx.fillStyle = art.label;
  ctx.font = "600 10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(agent.name.toUpperCase(), agent.x, y + 12);
  ctx.restore();
}

function drawPixelFigure(ctx: CanvasRenderingContext2D, agent: AgentSprite, timeMs: number) {
  const art = AGENT_ART[agent.id as keyof typeof AGENT_ART];
  const walkFrame = Math.floor(timeMs / 120) % 4;
  const typingFrame = Math.floor(timeMs / 220) % 2;
  const isLoungeIdle = agent.mode === "idle";
  const swayX = isLoungeIdle ? Math.sin(timeMs / 520 + agent.x * 0.031) * 1.6 : 0;
  const swayY = isLoungeIdle ? Math.sin(timeMs / 680 + agent.y * 0.018) * 1.2 : 0;
  const bob = agent.mode === "walking" ? 0 : Math.round(Math.sin(timeMs / 360 + agent.x * 0.015) * 1 + swayY);
  const x = Math.round(agent.x - (SPRITE_SIZE * PIXEL_SIZE) / 2 + swayX);
  const y = Math.round(agent.y - SPRITE_SIZE * PIXEL_SIZE + bob);
  const armLift = agent.mode === "working" ? (typingFrame === 0 ? 0 : 1) : 0;
  const legOffset = agent.mode === "walking" ? (walkFrame === 0 ? -1 : walkFrame === 2 ? 1 : 0) : 0;

  const paint = (px: number, py: number, pw: number, ph: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px * PIXEL_SIZE, y + py * PIXEL_SIZE, pw * PIXEL_SIZE, ph * PIXEL_SIZE);
  };

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(agent.x + swayX * 0.35, agent.y + 8, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  paint(5, 2, 6, 5, art.skin);
  paint(6, 7, 4, 1, art.skin);
  paint(5, 7, 6, 1, "#D89F77");

  switch (art.hairStyle) {
    case "long":
      paint(4, 1, 8, 2, art.hair);
      paint(4, 3, 2, 5, art.hair);
      paint(10, 3, 2, 5, art.hair);
      paint(5, 0, 6, 2, art.hair);
      break;
    case "short":
      paint(5, 0, 6, 2, art.hair);
      paint(4, 1, 8, 2, art.hair);
      break;
    case "fade":
      paint(5, 0, 6, 2, art.hair);
      paint(4, 1, 8, 1, art.hair);
      paint(5, 2, 6, 1, art.hair);
      break;
    case "parted":
      paint(4, 1, 8, 2, art.hair);
      paint(5, 0, 3, 1, art.hair);
      paint(9, 0, 2, 1, art.hair);
      break;
    case "curly":
      paint(4, 1, 8, 2, art.hair);
      paint(5, 0, 6, 1, art.hair);
      paint(4, 3, 1, 1, art.hair);
      paint(11, 3, 1, 1, art.hair);
      break;
  }

  const lookingLeft = agent.facing === "left";
  const lookingRight = agent.facing === "right";
  paint(6 + (lookingLeft ? -1 : 0), 4, 1, 1, "#18120F");
  paint(9 + (lookingRight ? 1 : 0), 4, 1, 1, "#18120F");

  paint(5, 8, 6, 4, art.shirt);
  paint(4, 9 + armLift, 1, 3, art.skin);
  paint(11, 9 + armLift, 1, 3, art.skin);
  paint(3, 10 + armLift, 1, 2, art.skin);
  paint(12, 10 + armLift, 1, 2, art.skin);
  paint(5, 12, 6, 2, art.pants);

  paint(5, 14 + legOffset, 2, 2, art.shoes);
  paint(9, 14 - legOffset, 2, 2, art.shoes);

  if (agent.mode === "working") {
    paint(4, 10, 1, 2, art.skin);
    paint(11, 10, 1, 2, art.skin);
  }
}

function updateWalking(agent: AgentSprite, deltaMs: number) {
  if (agent.path.length === 0) {
    agent.mode = agent.lastMode;
    return;
  }

  const speed = 0.15 * deltaMs;
  const target = agent.path[0];
  const dx = target.x - agent.x;
  const dy = target.y - agent.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= speed) {
    agent.x = target.x;
    agent.y = target.y;
    agent.path.shift();
    if (agent.path.length === 0) {
      agent.mode = agent.lastMode;
    }
    return;
  }

  agent.x += (dx / distance) * speed;
  agent.y += (dy / distance) * speed;
  agent.mode = "walking";

  if (Math.abs(dx) > Math.abs(dy)) {
    agent.facing = dx > 0 ? "right" : "left";
  } else {
    agent.facing = dy > 0 ? "down" : "up";
  }
}

function drawOffice(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  agents: AgentSprite[],
  hoveredId: string | null,
  timeMs: number,
  isLoading: boolean,
  error: string | null,
  updatedAt: string | null,
) {
  const now = new Date();
  const hour = now.getHours();
  const occupiedDesks = new Set(agents.filter((agent) => agent.lastMode === "working").map((agent) => agent.id));
  const { scale, offsetX, offsetY } = getSceneTransform(width, height);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  // Draw floor tiles across the entire visible area (not just world bounds)
  const visX = -offsetX / scale;
  const visY = -offsetY / scale;
  const visW = width / scale;
  const visH = height / scale;
  drawWoodFloor(ctx, visX, visY, visW, visH);
  drawWallsAndLights(ctx, timeMs);
  drawWindow(ctx, hour, timeMs);
  drawWallDecor(ctx, now);
  drawCorridorAccents(ctx);

  drawDeskSetup(ctx, 302, 286, "left", "#2093FF", "KIMBERLY", occupiedDesks.has("kimberly"), timeMs);
  drawDeskSetup(ctx, 270, 608, "left", "#FFBD59", "KEVIN", occupiedDesks.has("kevin"), timeMs);
  drawDeskSetup(ctx, 950, 286, "right", "#F93C3C", "ALEX", occupiedDesks.has("alex"), timeMs);
  drawDeskSetup(ctx, 1060, 286, "right", "#F93C3C", "SABRI", occupiedDesks.has("sabri"), timeMs);
  drawDeskSetup(ctx, 980, 608, "right", "#22C55E", "JORDAN", occupiedDesks.has("jordan"), timeMs);

  drawSwivelChair(ctx, 302, 292, "#43648D");
  drawSwivelChair(ctx, 270, 614, "#7C6644");
  drawSwivelChair(ctx, 950, 292, "#8C4747");
  drawSwivelChair(ctx, 1060, 292, "#8C4747");
  drawSwivelChair(ctx, 980, 614, "#3E8558");

  drawMeetingArea(ctx);
  drawLounge(ctx);
  drawServerRack(ctx, timeMs);
  drawDustMotes(ctx, timeMs);

  drawPlant(ctx, 118, 154, 1.2);
  drawPlant(ctx, 138, 718, 1.15);
  drawPlant(ctx, 328, 750, 0.95);
  drawPlant(ctx, 448, 750, 0.95);
  drawPlant(ctx, 568, 750, 0.95);
  drawPlant(ctx, 688, 750, 0.95);
  drawPlant(ctx, 808, 750, 0.95);
  drawPlant(ctx, 928, 750, 0.95);
  drawPlant(ctx, 1090, 708, 1.1);
  drawPlant(ctx, 1244, 350, 1);
  drawLightingOverlay(ctx, hour);

  const sortedAgents = agents.slice().sort((a, b) => a.y - b.y);

  for (const agent of sortedAgents) {
    if (agent.mode === "working") {
      drawTaskBubble(ctx, agent, timeMs);
    }
  }

  for (const agent of sortedAgents) {
    drawPixelFigure(ctx, agent, timeMs);
    drawNameLabel(ctx, agent);
  }

  const counts = agents.reduce(
    (acc, agent) => {
      acc[agent.lastMode] += 1;
      return acc;
    },
    { idle: 0, working: 0 },
  );

  ctx.save();
  ctx.fillStyle = "rgba(10, 10, 20, 0.8)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  drawRoundedRect(ctx, 24, 24, 382, 72, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#22C55E";
  ctx.beginPath();
  ctx.arc(48, 48, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HUD_TEXT;
  ctx.font = "600 15px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText(`WORKING: ${counts.working}`, 62, 53);
  ctx.fillStyle = "#FFBD59";
  ctx.fillText(`IDLE: ${counts.idle}`, 202, 53);
  ctx.fillStyle = isLoading ? "#FFBD59" : error ? "#F87171" : "#6BE675";
  ctx.fillText("LIVE", 312, 53);
  ctx.fillStyle = HUD_MUTED;
  ctx.font = "14px 'Courier New', monospace";
  ctx.fillText(`LAST SYNC ${formatSync(updatedAt)}`, 62, 77);
  ctx.fillText(error ? "DEGRADED FEED" : "SUPABASE STREAM", 202, 77);
  ctx.restore();

  if (error) {
    ctx.save();
    ctx.fillStyle = "rgba(129, 29, 29, 0.9)";
    drawRoundedRect(ctx, 24, 108, 246, 34, 14);
    ctx.fill();
    ctx.fillStyle = "#FFE7E7";
    ctx.font = "600 11px 'Courier New', monospace";
    ctx.fillText(truncateTask(error, 32), 40, 129);
    ctx.restore();
  }

  const hovered = agents.find((agent) => agent.id === hoveredId) ?? null;
  if (hovered) {
    drawTooltip(ctx, hovered);
  }

  ctx.restore();
}

export default function OfficePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const agentsRef = useRef<AgentSprite[]>([]);
  const hoveredIdRef = useRef<string | null>(null);
  const lastFrameTimeRef = useRef(0);
  const [viewport, setViewport] = useState<Viewport>(() => getViewport());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("office-immersive");
    return () => {
      document.body.classList.remove("office-immersive");
    };
  }, []);

  useEffect(() => {
    const updateSize = () => setViewport(getViewport());
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await fetch("/api/agent-status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Status API returned ${response.status}`);
        }

        const data = (await response.json()) as AgentApiRecord[];
        if (!mounted) return;
        const ordered = OFFICE_AGENT_ORDER.map((id) => data.find((agent) => agent.id === id)).filter(Boolean) as AgentApiRecord[];
        agentsRef.current = syncAgents(agentsRef.current, ordered);
        setUpdatedAt(new Date().toISOString());
        setError(null);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load live status");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
    const intervalId = window.setInterval(() => {
      void load();
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = (time: number) => {
      const context = canvas.getContext("2d");
      if (!context) return;

      const dpr = window.devicePixelRatio || 1;
      const container = canvas.parentElement;
      const cw = container ? container.clientWidth : viewport.width;
      const ch = container ? container.clientHeight : viewport.height;
      if (canvas.width !== Math.floor(cw * dpr) || canvas.height !== Math.floor(ch * dpr)) {
        canvas.width = Math.max(1, Math.floor(cw * dpr));
        canvas.height = Math.max(1, Math.floor(ch * dpr));
        canvas.style.width = `${cw}px`;
        canvas.style.height = `${ch}px`;
      }

      const width = cw;
      const height = ch;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const last = lastFrameTimeRef.current || time;
      const deltaMs = Math.min(34, time - last);
      lastFrameTimeRef.current = time;

      for (const agent of agentsRef.current) {
        if (agent.mode === "walking") {
          updateWalking(agent, deltaMs);
        }
      }

      drawOffice(context, width, height, agentsRef.current, hoveredIdRef.current, time, isLoading, error, updatedAt);
      animationRef.current = window.requestAnimationFrame(render);
    };

    animationRef.current = window.requestAnimationFrame(render);

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [error, isLoading, updatedAt, viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const projectPointer = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const { scale, offsetX, offsetY } = getSceneTransform(rect.width, rect.height);
      return {
        x: (px - offsetX) / scale,
        y: (py - offsetY) / scale,
      };
    };

    const pickAgent = (x: number, y: number) =>
      agentsRef.current
        .slice()
        .reverse()
        .find((agent) => Math.hypot(agent.x - x, agent.y - y) <= agent.hoverRadius) ?? null;

    const onMove = (event: MouseEvent) => {
      const point = projectPointer(event);
      const hovered = pickAgent(point.x, point.y);
      hoveredIdRef.current = hovered?.id ?? null;
      canvas.style.cursor = hovered ? "pointer" : "default";
    };

    const onLeave = () => {
      hoveredIdRef.current = null;
      canvas.style.cursor = "default";
    };

    const onClick = (event: MouseEvent) => {
      const point = projectPointer(event);
      const hovered = pickAgent(point.x, point.y);
      if (hovered) {
        router.push(`/agents/${hovered.id}`);
      }
    };

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("click", onClick);

    return () => {
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, [router, viewport]);

  return (
    <section
      aria-label="Pixel office"
      className="office-canvas-wrap"
    >
      <h1 className="sr-only">Pixel Office</h1>
      <canvas ref={canvasRef} className="block" />
    </section>
  );
}
