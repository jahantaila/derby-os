"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";

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

type Point = { x: number; y: number };
type HoverState = {
  agent: OfficeAgent;
  clientX: number;
  clientY: number;
} | null;

const SCENE_WIDTH = 320;
const SCENE_HEIGHT = 200;
const SPRITE_SIZE = 16;

const PALETTE = {
  wall: "#8B6914",
  wallShade: "#6D5312",
  floorA: "#E8D5B7",
  floorB: "#DCC9A8",
  floorEdge: "#CDB187",
  deskTop: "#8F6239",
  deskEdge: "#6E482A",
  woodLight: "#AA7847",
  green: "#5D8A52",
  greenDark: "#40613A",
  greenLight: "#7BA86C",
  couch: "#6F8C55",
  couchShadow: "#53673E",
  cream: "#F2E7CF",
  black: "#2D241B",
  shadow: "#4B3823",
  rug: "#A86D44",
  rugDark: "#81502F",
  blue: "#7BA4C5",
  water: "#8FD3E8",
  monitor: "#88C7B8",
  paper: "#F4ECD8",
};

const AGENT_STATIONS: Record<
  string,
  {
    desk: Point;
    chair: Point;
    work: Point;
    idle: Point;
    facing: "up" | "down" | "left" | "right";
    shirt: string;
    hair: string;
    area: string;
  }
> = {
  kimberly: {
    desk: { x: 62, y: 48 },
    chair: { x: 67, y: 56 },
    work: { x: 67, y: 54 },
    idle: { x: 52, y: 42 },
    facing: "up",
    shirt: "#2093FF",
    hair: "#3B2818",
    area: "Executive Suite",
  },
  alex: {
    desk: { x: 236, y: 48 },
    chair: { x: 232, y: 58 },
    work: { x: 232, y: 56 },
    idle: { x: 206, y: 42 },
    facing: "up",
    shirt: "#F93C3C",
    hair: "#744826",
    area: "Marketing",
  },
  sabri: {
    desk: { x: 270, y: 48 },
    chair: { x: 274, y: 58 },
    work: { x: 274, y: 56 },
    idle: { x: 287, y: 42 },
    facing: "up",
    shirt: "#F93C3C",
    hair: "#201713",
    area: "Marketing",
  },
  jordan: {
    desk: { x: 249, y: 146 },
    chair: { x: 249, y: 156 },
    work: { x: 249, y: 154 },
    idle: { x: 217, y: 128 },
    facing: "up",
    shirt: "#22C55E",
    hair: "#8A4D26",
    area: "Sales",
  },
  kevin: {
    desk: { x: 68, y: 146 },
    chair: { x: 68, y: 156 },
    work: { x: 68, y: 154 },
    idle: { x: 108, y: 126 },
    facing: "up",
    shirt: "#FFBD59",
    hair: "#352B27",
    area: "Engineering",
  },
};

const FONT: Record<string, string[]> = {
  A: ["0110", "1001", "1111", "1001", "1001"],
  B: ["1110", "1001", "1110", "1001", "1110"],
  C: ["0111", "1000", "1000", "1000", "0111"],
  D: ["1110", "1001", "1001", "1001", "1110"],
  E: ["1111", "1000", "1110", "1000", "1111"],
  F: ["1111", "1000", "1110", "1000", "1000"],
  G: ["0111", "1000", "1011", "1001", "0110"],
  H: ["1001", "1001", "1111", "1001", "1001"],
  I: ["111", "010", "010", "010", "111"],
  J: ["0011", "0001", "0001", "1001", "0110"],
  K: ["1001", "1010", "1100", "1010", "1001"],
  L: ["1000", "1000", "1000", "1000", "1111"],
  M: ["10001", "11011", "10101", "10001", "10001"],
  N: ["1001", "1101", "1011", "1001", "1001"],
  O: ["0110", "1001", "1001", "1001", "0110"],
  P: ["1110", "1001", "1110", "1000", "1000"],
  Q: ["0110", "1001", "1001", "1011", "0111"],
  R: ["1110", "1001", "1110", "1010", "1001"],
  S: ["0111", "1000", "0110", "0001", "1110"],
  T: ["11111", "00100", "00100", "00100", "00100"],
  U: ["1001", "1001", "1001", "1001", "0110"],
  V: ["10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10101", "11011", "10001"],
  X: ["1001", "1001", "0110", "1001", "1001"],
  Y: ["10001", "01010", "00100", "00100", "00100"],
  Z: ["1111", "0001", "0010", "0100", "1111"],
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["1110", "0001", "0110", "1000", "1111"],
  3: ["1110", "0001", "0110", "0001", "1110"],
  4: ["1001", "1001", "1111", "0001", "0001"],
  5: ["1111", "1000", "1110", "0001", "1110"],
  6: ["0111", "1000", "1110", "1001", "0110"],
  7: ["1111", "0001", "0010", "0100", "0100"],
  8: ["0110", "1001", "0110", "1001", "0110"],
  9: ["0110", "1001", "0111", "0001", "1110"],
  ".": ["0", "0", "0", "0", "1"],
  "-": ["000", "000", "111", "000", "000"],
  "/": ["0001", "0010", "0100", "1000", "0000"],
  ":": ["0", "1", "0", "1", "0"],
  "&": ["010", "101", "010", "101", "011"],
  " ": ["0", "0", "0", "0", "0"],
};

function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function outlineRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  border: string,
  inner: string,
) {
  fill(ctx, x, y, w, h, border);
  fill(ctx, x + 1, y + 1, w - 2, h - 2, inner);
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: string[],
  x: number,
  y: number,
  color: string,
  scale = 1,
) {
  ctx.fillStyle = color;
  glyph.forEach((row, rowIndex) => {
    row.split("").forEach((bit, colIndex) => {
      if (bit === "1") {
        ctx.fillRect(x + colIndex * scale, y + rowIndex * scale, scale, scale);
      }
    });
  });
}

function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
) {
  let cursor = x;
  for (const rawChar of text.toUpperCase()) {
    const glyph = FONT[rawChar] ?? FONT[" "];
    drawGlyph(ctx, glyph, cursor, y, color, scale);
    cursor += (glyph[0]?.length ?? 3) * scale + scale;
  }
}

function truncateTask(task: string | null) {
  if (!task) return "IDLE";
  const normalized = task.replace(/\s+/g, " ").trim().toUpperCase();
  if (normalized.length <= 10) return normalized;
  return `${normalized.slice(0, 9)}.`;
}

function agentPose(agent: OfficeAgent, time: number) {
  const station = AGENT_STATIONS[agent.id];
  const working = agent.inProgressTasks.length > 0;
  const bob = working ? 0 : Math.sin(time / 420 + station.idle.x / 9) > 0 ? -1 : 0;
  const typeFrame = working && Math.sin(time / 120) > 0 ? 1 : 0;
  const wander = !working ? Math.sin(time / 900 + station.idle.y / 11) : 0;
  const base = working ? station.work : station.idle;

  return {
    x: Math.round(base.x + (working ? 0 : wander * 2)),
    y: base.y + bob,
    working,
    typeFrame,
    station,
  };
}

function drawFloor(ctx: CanvasRenderingContext2D) {
  fill(ctx, 0, 0, SCENE_WIDTH, SCENE_HEIGHT, PALETTE.floorA);
  for (let y = 8; y < SCENE_HEIGHT - 8; y += 8) {
    for (let x = 8; x < SCENE_WIDTH - 8; x += 8) {
      const even = ((x / 8) + (y / 8)) % 2 === 0;
      fill(ctx, x, y, 8, 8, even ? PALETTE.floorA : PALETTE.floorB);
      fill(ctx, x, y + 7, 8, 1, PALETTE.floorEdge);
      fill(ctx, x + 7, y, 1, 8, PALETTE.floorEdge);
    }
  }
}

function drawWalls(ctx: CanvasRenderingContext2D) {
  fill(ctx, 0, 0, SCENE_WIDTH, 8, PALETTE.wall);
  fill(ctx, 0, SCENE_HEIGHT - 8, SCENE_WIDTH, 8, PALETTE.wall);
  fill(ctx, 0, 0, 8, SCENE_HEIGHT, PALETTE.wall);
  fill(ctx, SCENE_WIDTH - 8, 0, 8, SCENE_HEIGHT, PALETTE.wall);

  fill(ctx, 8, 8, SCENE_WIDTH - 16, 2, PALETTE.cream);
  fill(ctx, 8, 8, 2, SCENE_HEIGHT - 16, PALETTE.cream);

  fill(ctx, 104, 8, 6, 46, PALETTE.wallShade);
  fill(ctx, 104, 78, 6, 44, PALETTE.wallShade);
  fill(ctx, 210, 8, 6, 46, PALETTE.wallShade);
  fill(ctx, 210, 78, 6, 44, PALETTE.wallShade);
  fill(ctx, 110, 120, 100, 6, PALETTE.wallShade);
  fill(ctx, 150, 8, 20, 6, PALETTE.wallShade);

  fill(ctx, 108, 52, 12, 2, PALETTE.cream);
  fill(ctx, 202, 52, 14, 2, PALETTE.cream);
  fill(ctx, 152, 120, 16, 6, PALETTE.floorA);
}

function drawDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  accents?: (ctx: CanvasRenderingContext2D) => void,
) {
  outlineRect(ctx, x, y, w, h, PALETTE.deskEdge, PALETTE.deskTop);
  fill(ctx, x + 2, y + 2, w - 4, 2, PALETTE.woodLight);
  fill(ctx, x + 2, y + h - 4, w - 4, 2, PALETTE.shadow);
  fill(ctx, x + 4, y + h, 3, 5, PALETTE.deskEdge);
  fill(ctx, x + w - 7, y + h, 3, 5, PALETTE.deskEdge);
  accents?.(ctx);
}

function drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  outlineRect(ctx, x, y, w, h, PALETTE.black, "#4E5B57");
  fill(ctx, x + 1, y + 1, w - 2, h - 2, PALETTE.monitor);
  fill(ctx, x + 2, y + 2, w - 4, 1, "#D9FFF2");
  fill(ctx, x + Math.floor(w / 2) - 1, y + h, 2, 2, PALETTE.black);
  fill(ctx, x + Math.floor(w / 2) - 3, y + h + 2, 6, 1, PALETTE.black);
}

function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  fill(ctx, x, y, 8, 3, color);
  fill(ctx, x + 2, y - 4, 4, 4, color);
  fill(ctx, x + 1, y + 3, 1, 3, PALETTE.black);
  fill(ctx, x + 6, y + 3, 1, 3, PALETTE.black);
}

function drawBookshelf(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  outlineRect(ctx, x, y, w, h, PALETTE.deskEdge, PALETTE.woodLight);
  for (let row = 0; row < 3; row += 1) {
    fill(ctx, x + 1, y + 5 + row * 8, w - 2, 1, PALETTE.deskEdge);
  }
  const colors = ["#C4543D", "#5378A6", "#6A8B4E", "#D7A250", "#8A5D3A"];
  for (let col = 0; col < w - 4; col += 3) {
    const c = colors[(col / 3) % colors.length];
    fill(ctx, x + 2 + col, y + 2, 2, 4, c);
    fill(ctx, x + 2 + col, y + 10, 2, 4, colors[(col / 3 + 2) % colors.length]);
    fill(ctx, x + 2 + col, y + 18, 2, 4, colors[(col / 3 + 4) % colors.length]);
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, hanging = false) {
  if (hanging) {
    fill(ctx, x + 2, y - 4, 1, 4, PALETTE.deskEdge);
  }
  fill(ctx, x + 1, y + 5, 6, 3, "#8A5B35");
  fill(ctx, x, y + 2, 8, 4, PALETTE.green);
  fill(ctx, x + 2, y, 4, 5, PALETTE.greenLight);
  fill(ctx, x + 3, y + 1, 2, 2, PALETTE.greenDark);
}

function drawCoffeeMachine(ctx: CanvasRenderingContext2D, x: number, y: number) {
  outlineRect(ctx, x, y, 10, 14, PALETTE.black, "#B8B0A1");
  fill(ctx, x + 2, y + 2, 6, 4, "#49433C");
  fill(ctx, x + 3, y + 7, 4, 4, "#EFE7D1");
  fill(ctx, x + 4, y + 11, 2, 2, "#7A4A2C");
}

function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number) {
  outlineRect(ctx, x, y + 5, 8, 10, PALETTE.black, "#CFC8B8");
  fill(ctx, x + 1, y, 6, 8, PALETTE.water);
  fill(ctx, x + 2, y + 1, 2, 2, "#D8F8FF");
}

function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number) {
  outlineRect(ctx, x, y, 12, 22, PALETTE.black, "#3A3E44");
  for (let row = 0; row < 5; row += 1) {
    fill(ctx, x + 2, y + 2 + row * 4, 8, 2, "#596068");
    fill(ctx, x + 9, y + 2 + row * 4, 1, 1, row % 2 === 0 ? "#55DD66" : "#E3B24D");
  }
}

function drawPrinter(ctx: CanvasRenderingContext2D, x: number, y: number) {
  outlineRect(ctx, x, y + 3, 12, 8, PALETTE.black, "#D5D0C4");
  fill(ctx, x + 2, y, 8, 4, "#F5F2E8");
  fill(ctx, x + 3, y + 6, 6, 2, "#96908A");
}

function drawPhone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  fill(ctx, x, y, 6, 3, PALETTE.black);
  fill(ctx, x + 1, y + 1, 4, 1, "#C9D5CA");
}

function drawLaptop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  fill(ctx, x, y, 8, 4, PALETTE.black);
  fill(ctx, x + 1, y + 1, 6, 2, PALETTE.monitor);
  fill(ctx, x - 1, y + 4, 10, 2, "#83827B");
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, x: number, y: number) {
  outlineRect(ctx, x, y, 18, 12, PALETTE.deskEdge, "#FAF8F1");
  fill(ctx, x + 3, y + 3, 8, 1, "#92A7D1");
  fill(ctx, x + 4, y + 6, 10, 1, "#C76A56");
}

function drawPoster(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  outlineRect(ctx, x, y, 18, 14, PALETTE.deskEdge, color);
  drawPixelText(ctx, text, x + 2, y + 4, PALETTE.cream, 1);
}

function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  outlineRect(ctx, x, y, 10, 10, PALETTE.black, "#F5F1E4");
  fill(ctx, x + 5, y + 2, 1, 3, PALETTE.black);
  fill(ctx, x + 5, y + 5, 2, 1, PALETTE.black);
}

function drawDDLogo(ctx: CanvasRenderingContext2D, x: number, y: number) {
  outlineRect(ctx, x, y, 22, 14, PALETTE.deskEdge, "#7A8F57");
  drawPixelText(ctx, "DD", x + 4, y + 4, PALETTE.cream, 2);
}

function drawFurniture(ctx: CanvasRenderingContext2D) {
  drawBookshelf(ctx, 18, 16, 24, 24);
  drawPlant(ctx, 86, 22);
  drawClock(ctx, 72, 14);

  drawDesk(ctx, 44, 42, 36, 16, (next) => {
    drawMonitor(next, 56, 43, 10, 8);
    fill(next, 51, 45, 4, 6, "#DAD2C3");
    fill(next, 70, 45, 4, 6, "#DAD2C3");
  });
  drawChair(ctx, 63, 58, "#425A63");

  fill(ctx, 126, 28, 40, 20, PALETTE.rugDark);
  fill(ctx, 128, 30, 36, 16, PALETTE.rug);
  fill(ctx, 130, 32, 32, 12, "#C78553");
  fill(ctx, 126, 54, 18, 10, PALETTE.couchShadow);
  fill(ctx, 128, 52, 14, 8, PALETTE.couch);
  fill(ctx, 154, 54, 18, 10, PALETTE.couchShadow);
  fill(ctx, 156, 52, 14, 8, PALETTE.couch);
  outlineRect(ctx, 143, 54, 12, 8, PALETTE.deskEdge, PALETTE.woodLight);
  drawCoffeeMachine(ctx, 176, 20);
  drawPlant(ctx, 182, 44, true);
  drawWaterCooler(ctx, 175, 84);

  drawDesk(ctx, 220, 42, 24, 16, (next) => {
    drawMonitor(next, 226, 43, 8, 7);
    fill(next, 236, 44, 4, 6, PALETTE.paper);
  });
  drawDesk(ctx, 254, 42, 24, 16, (next) => {
    drawMonitor(next, 260, 43, 8, 7);
    fill(next, 270, 44, 4, 6, PALETTE.paper);
  });
  drawChair(ctx, 228, 58, "#7A4B41");
  drawChair(ctx, 270, 58, "#7A4B41");
  outlineRect(ctx, 286, 20, 14, 18, PALETTE.deskEdge, "#B1A78F");
  fill(ctx, 289, 23, 8, 2, "#D2CCC1");
  fill(ctx, 289, 27, 8, 2, "#D2CCC1");
  drawPoster(ctx, 274, 72, "ADS", "#B04E3A");
  drawPrinter(ctx, 288, 48);

  drawDesk(ctx, 230, 140, 36, 16, (next) => {
    drawLaptop(next, 243, 142);
    drawPhone(next, 236, 145);
  });
  drawChair(ctx, 245, 156, "#5C6F45");
  drawWhiteboard(ctx, 281, 129);
  drawPlant(ctx, 285, 153);

  drawDesk(ctx, 42, 140, 40, 16, (next) => {
    drawMonitor(next, 48, 141, 8, 7);
    drawMonitor(next, 58, 141, 8, 7);
    fill(next, 70, 143, 5, 4, PALETTE.paper);
    fill(next, 74, 148, 2, 2, "#7C4F2B");
    fill(next, 46, 149, 6, 2, "#202830");
  });
  drawChair(ctx, 64, 156, "#4D5A73");
  drawServerRack(ctx, 18, 134);
  fill(ctx, 53, 150, 4, 2, PALETTE.paper);
  fill(ctx, 56, 151, 4, 2, PALETTE.paper);

  drawDDLogo(ctx, 146, 12);
  drawBookshelf(ctx, 118, 132, 20, 26);
}

function drawAgentSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shirt: string,
  hair: string,
  facing: "up" | "down" | "left" | "right",
  typeFrame: number,
  selected: boolean,
) {
  const skin = "#FFD5B8";
  const pants = "#4D4A59";
  const shoes = "#2A2320";
  const outline = "#1B1512";
  const ox = x - 8;
  const oy = y - 13;

  if (selected) {
    fill(ctx, x - 9, y + 2, 18, 2, "#F6E7A7");
    fill(ctx, x - 7, y + 1, 14, 1, "#D9B85F");
  } else {
    fill(ctx, x - 7, y + 2, 14, 2, "#8C7354");
  }

  fill(ctx, ox + 4, oy, 8, 2, hair);
  fill(ctx, ox + 3, oy + 2, 10, 2, hair);
  fill(ctx, ox + 2, oy + 4, 12, 5, skin);
  fill(ctx, ox + 3, oy + 3, 10, 1, hair);
  fill(ctx, ox + 4, oy + 6, 1, 1, outline);
  fill(ctx, ox + 11, oy + 6, 1, 1, outline);

  fill(ctx, ox + 6, oy + 9, 4, 2, skin);
  fill(ctx, ox + 3, oy + 11, 10, 4, shirt);
  fill(ctx, ox + 1, oy + 12, 3, 3, shirt);
  fill(ctx, ox + 12, oy + 12, 3, 3, shirt);
  fill(ctx, ox + 4, oy + 15, 8, 4, pants);
  fill(ctx, ox + 4, oy + 19, 3, 2, shoes);
  fill(ctx, ox + 9, oy + 19, 3, 2, shoes);

  if (facing === "up") {
    fill(ctx, ox + 5, oy + 1, 6, 1, hair);
  }

  if (typeFrame) {
    fill(ctx, ox + 1, oy + 13, 2, 1, skin);
    fill(ctx, ox + 13, oy + 13, 2, 1, skin);
  }
}

function drawSpeechBubble(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  const width = text.length * 5 + 8;
  const bubbleX = Math.max(10, Math.min(SCENE_WIDTH - width - 10, x - Math.floor(width / 2)));
  const bubbleY = y - 26;
  outlineRect(ctx, bubbleX, bubbleY, width, 10, PALETTE.black, PALETTE.cream);
  fill(ctx, x - 1, bubbleY + 10, 2, 2, PALETTE.cream);
  fill(ctx, x - 2, bubbleY + 12, 4, 1, PALETTE.black);
  drawPixelText(ctx, text, bubbleX + 4, bubbleY + 2, PALETTE.black, 1);
}

function drawRoomLabels(ctx: CanvasRenderingContext2D) {
  drawPixelText(ctx, "KIMBERLY", 22, 12, PALETTE.cream, 1);
  drawPixelText(ctx, "LOUNGE", 130, 12, PALETTE.cream, 1);
  drawPixelText(ctx, "ALEX&SABRI", 222, 12, PALETTE.cream, 1);
  drawPixelText(ctx, "KEVIN", 24, 126, PALETTE.cream, 1);
  drawPixelText(ctx, "JORDAN", 232, 126, PALETTE.cream, 1);
}

function drawScene(ctx: CanvasRenderingContext2D, agents: OfficeAgent[], selectedId: string | null, time: number) {
  ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
  drawFloor(ctx);
  drawWalls(ctx);
  drawFurniture(ctx);
  drawRoomLabels(ctx);

  const poses = agents
    .map((agent) => ({ agent, pose: agentPose(agent, time) }))
    .sort((left, right) => left.pose.y - right.pose.y);

  for (const { agent, pose } of poses) {
    drawAgentSprite(
      ctx,
      pose.x,
      pose.y,
      pose.station.shirt,
      pose.station.hair,
      pose.station.facing,
      pose.typeFrame,
      selectedId === agent.id,
    );
    if (pose.working) {
      drawSpeechBubble(ctx, truncateTask(agent.currentTask), pose.x, pose.y - 2);
    }
  }
}

function mapPointerToScene(canvas: HTMLCanvasElement, event: ReactMouseEvent<HTMLCanvasElement>) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = SCENE_WIDTH / rect.width;
  const scaleY = SCENE_HEIGHT / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function hitTestAgent(agents: OfficeAgent[], point: Point, time: number) {
  const sorted = [...agents].sort((left, right) => agentPose(left, time).y - agentPose(right, time).y);
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const agent = sorted[index];
    const pose = agentPose(agent, time);
    const left = pose.x - 8;
    const top = pose.y - 13;
    if (point.x >= left && point.x <= left + SPRITE_SIZE && point.y >= top && point.y <= top + 22) {
      return agent;
    }
  }
  return null;
}

export function OfficeScene({ agents, loading, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [hovered, setHovered] = useState<HoverState>(null);
  const [canvasHeight, setCanvasHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      setCanvasHeight(Math.round((width / SCENE_WIDTH) * SCENE_HEIGHT));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement ?? canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;

    const render = (time: number) => {
      lastTimeRef.current = time;
      drawScene(context, agents, selectedId, time);
      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [agents, selectedId]);

  function handleMove(event: ReactMouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = mapPointerToScene(canvas, event);
    const agent = hitTestAgent(agents, point, lastTimeRef.current);
    setHovered(agent ? { agent, clientX: event.clientX, clientY: event.clientY } : null);
  }

  function handleLeave() {
    setHovered(null);
  }

  function handleClick(event: ReactMouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = mapPointerToScene(canvas, event);
    const agent = hitTestAgent(agents, point, lastTimeRef.current);
    if (agent) onSelect(agent.id);
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[#5a4324] bg-[#2b2218] p-4 md:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,245,220,0.18),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.04),_transparent_34%)]" />
      <div className="relative mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#cdb792]">Pixel Office</p>
          <h2 className="mt-1 text-xl font-semibold text-[#fff4dc]">Derby Digital HQ</h2>
        </div>
        <div className="rounded-full border border-[#7b5d39] bg-[#3b2f22] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[#edd7b1]">
          Click an agent
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[1100px]">
        <canvas
          ref={canvasRef}
          width={SCENE_WIDTH}
          height={SCENE_HEIGHT}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          onClick={handleClick}
          className="block w-full cursor-pointer rounded-[20px] border border-[#6d5312] bg-[#e8d5b7]"
          style={
            {
              height: canvasHeight ? `${canvasHeight}px` : "auto",
              imageRendering: "pixelated",
            } as CSSProperties
          }
          aria-label="Virtual office map"
        />

        {loading ? (
          <div className="absolute inset-0 grid place-items-center rounded-[20px] bg-[rgba(43,34,24,0.68)]">
            <div className="rounded-xl border border-[#8b6914] bg-[#3b2f22] px-4 py-3 text-sm text-[#fff4dc]">
              Loading office...
            </div>
          </div>
        ) : null}

        {hovered ? (
          <div
            className="pointer-events-none fixed z-30 max-w-[260px] rounded-xl border border-[#7b5d39] bg-[#2a2118] px-3 py-2 text-[#fff4dc] shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
            style={{
              left: Math.min(window.innerWidth - 280, hovered.clientX + 14),
              top: Math.max(16, hovered.clientY - 16),
            }}
          >
            <p className="text-sm font-semibold">{hovered.agent.name}</p>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#d7bd91]">
              {hovered.agent.role} · {AGENT_STATIONS[hovered.agent.id]?.area ?? hovered.agent.department}
            </p>
            <p className="mt-1 text-xs text-[#f4e7ca]">
              {hovered.agent.currentTask ?? "Idle near their station"}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
