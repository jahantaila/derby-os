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
const WORLD_HEIGHT = 832;
const TILE_SIZE = 32;
const SPRITE_SCALE = 3;
const SPRITE_SIZE = 16;
const HUD_TEXT = "#f6f2ea";
const HUD_MUTED = "#c9b7a2";
const OFFICE_AGENT_ORDER = ["kimberly", "kevin", "sabri", "alex", "jordan"] as const;

const DESK_POSITIONS = {
  kimberly: { x: 302, y: 244 },
  kevin: { x: 270, y: 606 },
  sabri: { x: 1104, y: 244 },
  alex: { x: 950, y: 244 },
  jordan: { x: 1028, y: 606 },
};

const LOUNGE_POSITIONS = {
  kimberly: { x: 432, y: 632 },
  kevin: { x: 606, y: 654 },
  sabri: { x: 732, y: 654 },
  alex: { x: 554, y: 586 },
  jordan: { x: 684, y: 586 },
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
    width: Math.max(320, window.innerWidth - (desktop ? 60 : 0)),
    height: Math.max(560, window.innerHeight - (desktop ? 0 : 72)),
  };
}

function makeTransitPath(start: { x: number; y: number }, target: { x: number; y: number }) {
  const corridorY = target.y < WORLD_HEIGHT * 0.48 ? 388 : 522;
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
    hoverRadius: 34,
  };
}

function syncAgents(previous: AgentSprite[], nextData: AgentApiRecord[]) {
  const prevById = new Map(previous.map((agent) => [agent.id, agent]));

  return nextData.map((record) => {
    const current = prevById.get(record.id);
    if (!current) return makeInitialAgent(record);

    const target = record.status === "working" ? { x: current.deskX, y: current.deskY } : { x: current.seatX, y: current.seatY };
    const statusChanged = current.lastMode !== record.status;

    if (!statusChanged) {
      return {
        ...current,
        ...record,
        mode: current.mode === "walking" ? "walking" : record.status,
        lastMode: record.status,
      };
    }

    return {
      ...current,
      ...record,
      path: makeTransitPath({ x: current.x, y: current.y }, target).slice(1),
      mode: "walking",
      lastMode: record.status,
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

function drawWoodFloor(ctx: CanvasRenderingContext2D) {
  for (let y = 0; y < WORLD_HEIGHT / TILE_SIZE; y += 1) {
    for (let x = 0; x < WORLD_WIDTH / TILE_SIZE; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#3d3428" : "#4a3f32";
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 3, TILE_SIZE - 8, 1);
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE + TILE_SIZE - 2, TILE_SIZE, 2);
    }
  }
}

function drawWallsAndLights(ctx: CanvasRenderingContext2D, timeMs: number) {
  ctx.fillStyle = "#1a2030";
  ctx.fillRect(0, 0, WORLD_WIDTH, 64);
  ctx.fillRect(0, 0, 64, WORLD_HEIGHT);
  ctx.fillStyle = "#2a3545";
  ctx.fillRect(0, 64, WORLD_WIDTH, 8);
  ctx.fillRect(64, 0, 8, WORLD_HEIGHT);

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

function drawWindow(ctx: CanvasRenderingContext2D) {
  const x = 1188;
  const y = 118;
  const w = 172;
  const h = 188;
  ctx.fillStyle = "#2a3545";
  ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, "#0D1730");
  sky.addColorStop(1, "#16284A");
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

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
        ctx.fillStyle = (wx + wy) % 3 === 0 ? "#FFBD59" : (wx + wy) % 4 === 0 ? "#2093FF" : "#E97474";
        ctx.fillRect(wx, wy, 3, 5);
      }
    }
  }
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

function drawDeskSetup(ctx: CanvasRenderingContext2D, x: number, y: number, side: "left" | "right", accent: string, label: string) {
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
  ctx.fillStyle = "#2093FF";
  ctx.fillRect(x - 16, y - 48, 32, 16);
  drawGlow(ctx, x, y - 40, 46, "#2093FF", 0.15);

  ctx.fillStyle = "#111827";
  ctx.fillRect(x - 4, y - 28, 8, 14);
  ctx.fillRect(x - 16, y - 16, 32, 4);
  ctx.fillStyle = "#D7DCE7";
  ctx.fillRect(returnX + 14, y + 4, 18, 10);
  ctx.fillStyle = accent;
  ctx.fillRect(returnX + 12, y + 18, 8, 8);
  ctx.fillStyle = "#B48B66";
  ctx.fillRect(returnX + 28, y + 16, 10, 2);

  ctx.fillStyle = "rgba(8,7,6,0.24)";
  ctx.fillRect(topX + 4, y + 6, 96, 4);

  ctx.fillStyle = "rgba(17,12,8,0.72)";
  drawRoundedRect(ctx, x - 44, y + 56, 88, 18, 9);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.font = "600 10px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 68);
}

function drawMeetingArea(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(748, 368, 154, 86, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#7A604A";
  ctx.beginPath();
  ctx.ellipse(748, 350, 146, 78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9B7A58";
  ctx.beginPath();
  ctx.ellipse(748, 344, 132, 62, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const [x, y] of [
    [622, 350],
    [874, 350],
    [748, 248],
    [748, 452],
  ]) {
    drawSwivelChair(ctx, x, y, "#6A7280");
  }

  ctx.fillStyle = "#EFE4D1";
  ctx.fillRect(716, 326, 64, 14);
  ctx.fillStyle = "#C54747";
  ctx.fillRect(722, 330, 18, 6);
  ctx.fillStyle = "#2093FF";
  ctx.fillRect(746, 330, 28, 6);
}

function drawLounge(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#5B3A31";
  ctx.fillRect(408, 560, 312, 86);
  ctx.fillRect(394, 574, 18, 72);
  ctx.fillRect(720, 574, 18, 72);
  ctx.fillStyle = "#C59A73";
  ctx.fillRect(420, 548, 288, 74);
  ctx.fillStyle = "#E0B58C";
  ctx.fillRect(434, 560, 260, 24);
  ctx.fillRect(434, 592, 260, 24);
  ctx.fillStyle = "#7D5B45";
  ctx.fillRect(548, 622, 34, 14);
  ctx.fillRect(620, 622, 34, 14);

  ctx.fillStyle = "#6A4E37";
  ctx.fillRect(534, 668, 112, 38);
  ctx.fillStyle = "#8C6A4B";
  ctx.fillRect(542, 660, 96, 26);
  ctx.fillStyle = "#E6D8BF";
  ctx.fillRect(570, 666, 36, 10);
  ctx.fillStyle = "#C8A977";
  ctx.fillRect(552, 688, 18, 6);
  ctx.fillRect(610, 688, 18, 6);

  ctx.fillStyle = "#CBD6E4";
  ctx.fillRect(830, 570, 28, 84);
  ctx.fillStyle = "#9AB1C7";
  ctx.beginPath();
  ctx.arc(844, 586, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#75A9E3";
  ctx.beginPath();
  ctx.arc(844, 585, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#E9EDF5";
  ctx.fillRect(834, 654, 20, 18);

  drawPlant(ctx, 916, 646, 1.3);
}

function drawServerRack(ctx: CanvasRenderingContext2D, timeMs: number) {
  const leds = Math.floor(timeMs / 400) % 2 === 0;
  ctx.fillStyle = "#232833";
  ctx.fillRect(1164, 510, 86, 158);
  ctx.fillStyle = "#11141B";
  ctx.fillRect(1174, 520, 66, 138);

  for (let i = 0; i < 5; i += 1) {
    const y = 532 + i * 24;
    ctx.fillStyle = "#2D3640";
    ctx.fillRect(1182, y, 50, 14);
    ctx.fillStyle = i === 1 ? "#2093FF" : "#8FA5B8";
    ctx.fillRect(1186, y + 4, 26, 4);
    ctx.fillStyle = leds || i % 2 === 0 ? "#22C55E" : "#56745F";
    ctx.fillRect(1218, y + 4, 4, 4);
    ctx.fillStyle = !leds && i % 2 === 1 ? "#22C55E" : "#56745F";
    ctx.fillRect(1226, y + 4, 4, 4);
  }
}

function drawWallDecor(ctx: CanvasRenderingContext2D) {
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
  ctx.fillRect(160, 388, 1088, 10);
  ctx.fillRect(160, 520, 1088, 10);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(160, 398, 1088, 4);
  ctx.fillRect(160, 530, 1088, 4);
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
  const bob = agent.mode === "walking" ? 0 : Math.round(Math.sin(timeMs / 360 + agent.x * 0.015) * 1);
  const x = Math.round(agent.x - (SPRITE_SIZE * SPRITE_SCALE) / 2);
  const y = Math.round(agent.y - SPRITE_SIZE * SPRITE_SCALE + bob);
  const armLift = agent.mode === "working" ? (typingFrame === 0 ? 0 : 1) : 0;
  const legOffset = agent.mode === "walking" ? (walkFrame === 0 ? -1 : walkFrame === 2 ? 1 : 0) : 0;

  const paint = (px: number, py: number, pw: number, ph: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px * SPRITE_SCALE, y + py * SPRITE_SCALE, pw * SPRITE_SCALE, ph * SPRITE_SCALE);
  };

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(agent.x, agent.y + 6, 18, 7, 0, 0, Math.PI * 2);
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
  const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
  const offsetX = (width - WORLD_WIDTH * scale) / 2;
  const offsetY = (height - WORLD_HEIGHT * scale) / 2;

  const backdrop = ctx.createLinearGradient(0, 0, 0, height);
  backdrop.addColorStop(0, "#181110");
  backdrop.addColorStop(1, "#080708");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  const roomGlow = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
  roomGlow.addColorStop(0, "#120F10");
  roomGlow.addColorStop(1, "#080708");
  ctx.fillStyle = roomGlow;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawWoodFloor(ctx);
  drawWallsAndLights(ctx, timeMs);
  drawWindow(ctx);
  drawWallDecor(ctx);
  drawCorridorAccents(ctx);

  drawDeskSetup(ctx, 302, 246, "left", "#2093FF", "KIMBERLY");
  drawDeskSetup(ctx, 270, 608, "left", "#FFBD59", "KEVIN");
  drawDeskSetup(ctx, 950, 246, "right", "#F93C3C", "ALEX");
  drawDeskSetup(ctx, 1104, 246, "right", "#F93C3C", "SABRI");
  drawDeskSetup(ctx, 1028, 608, "right", "#22C55E", "JORDAN");

  drawSwivelChair(ctx, 302, 252, "#43648D");
  drawSwivelChair(ctx, 270, 614, "#7C6644");
  drawSwivelChair(ctx, 950, 252, "#8C4747");
  drawSwivelChair(ctx, 1104, 252, "#8C4747");
  drawSwivelChair(ctx, 1028, 614, "#3E8558");

  drawMeetingArea(ctx);
  drawLounge(ctx);
  drawServerRack(ctx, timeMs);

  drawPlant(ctx, 118, 154, 1.2);
  drawPlant(ctx, 138, 718, 1.15);
  drawPlant(ctx, 1090, 708, 1.1);
  drawPlant(ctx, 1244, 350, 1);

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
  ctx.font = "12px 'Courier New', monospace";
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

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
    canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const render = (time: number) => {
      const context = canvas.getContext("2d");
      if (!context) return;

      const width = viewport.width;
      const height = viewport.height;
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
      const scale = Math.min(rect.width / WORLD_WIDTH, rect.height / WORLD_HEIGHT);
      const offsetX = (rect.width - WORLD_WIDTH * scale) / 2;
      const offsetY = (rect.height - WORLD_HEIGHT * scale) / 2;
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
      className="relative overflow-hidden bg-[#080708]"
      style={{ width: `${viewport.width}px`, height: `${viewport.height}px` }}
    >
      <h1 className="sr-only">Pixel Office</h1>
      <canvas ref={canvasRef} className="block" />
    </section>
  );
}
