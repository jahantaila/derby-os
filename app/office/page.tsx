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

const PIXEL_SIZE = 4;
const SPRITE_PIXELS = 12;
const HUD_TEXT = "#dce8ff";
const HUD_MUTED = "#8ba0c9";
const OFFICE_BG = "#081018";
const DESK_POSITIONS = {
  kimberly: { x: 264, y: 212 },
  kevin: { x: 214, y: 520 },
  sabri: { x: 892, y: 258 },
  alex: { x: 762, y: 258 },
  jordan: { x: 832, y: 528 },
};
const LOUNGE_POSITIONS = {
  kimberly: { x: 260, y: 116 },
  kevin: { x: 546, y: 552 },
  sabri: { x: 660, y: 548 },
  alex: { x: 600, y: 548 },
  jordan: { x: 718, y: 548 },
};
const OFFICE_AGENT_ORDER = ["kimberly", "kevin", "sabri", "alex", "jordan"] as const;

function truncateTask(task: string | null, max = 30) {
  if (!task) return "Idle";
  return task.length > max ? `${task.slice(0, max - 1)}…` : task;
}

function makeTransitPath(start: { x: number; y: number }, target: { x: number; y: number }) {
  const corridorY = target.y < 320 ? 344 : 448;
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
    hoverRadius: 28,
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

function drawPixelFigure(ctx: CanvasRenderingContext2D, agent: AgentSprite, timeMs: number) {
  const walkFrame = Math.floor(timeMs / 130) % 2;
  const typingFrame = Math.floor(timeMs / 220) % 2;
  const bob = agent.mode === "walking" ? 0 : Math.sin(timeMs / 220 + agent.x * 0.01) * 1.2;
  const x = Math.round(agent.x - (SPRITE_PIXELS * PIXEL_SIZE) / 2);
  const y = Math.round(agent.y - SPRITE_PIXELS * PIXEL_SIZE + bob);
  const skin = "#f3c6a0";
  const hair = "#121826";
  const shirt = agent.accent;
  const pants = "#1f2a3d";
  const shoe = "#05070b";
  const armShift = agent.mode === "working" ? (typingFrame === 0 ? 0 : PIXEL_SIZE) : 0;
  const legShift = agent.mode === "walking" ? (walkFrame === 0 ? PIXEL_SIZE : -PIXEL_SIZE) : 0;

  const draw = (px: number, py: number, pw: number, ph: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px * PIXEL_SIZE, y + py * PIXEL_SIZE, pw * PIXEL_SIZE, ph * PIXEL_SIZE);
  };

  ctx.fillStyle = "rgba(5, 8, 15, 0.34)";
  ctx.fillRect(x + PIXEL_SIZE * 2, y + PIXEL_SIZE * 11.5, PIXEL_SIZE * 8, PIXEL_SIZE * 1.2);

  draw(3, 0, 6, 1, hair);
  draw(2, 1, 8, 3, skin);
  draw(2, 1, 1, 1, hair);
  draw(9, 1, 1, 1, hair);
  draw(3, 2, 1, 1, "#0b1220");
  draw(7, 2, 1, 1, "#0b1220");
  draw(3, 4, 6, 1, skin);
  draw(3, 5, 6, 3, shirt);
  draw(2, 6, 1, 3, skin);
  draw(9, 6, 1, 3, skin);
  draw(1 + armShift / PIXEL_SIZE, 7, 1, 2, skin);
  draw(10 - armShift / PIXEL_SIZE, 7, 1, 2, skin);
  draw(3, 8, 6, 2, pants);
  draw(3, 10, 2, 2, shoe);
  draw(7, 10, 2, 2, shoe);

  if (agent.mode === "walking") {
    draw(3, 10, 2, 1, shoe);
    draw(7, 10, 2, 1, shoe);
    ctx.fillRect(x + PIXEL_SIZE * 3, y + PIXEL_SIZE * 10 + legShift, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
    ctx.fillRect(x + PIXEL_SIZE * 7, y + PIXEL_SIZE * 10 - legShift, PIXEL_SIZE * 2, PIXEL_SIZE * 2);
  }

  if (agent.mode === "working") {
    ctx.fillStyle = "#d8e8ff";
    ctx.fillRect(x + PIXEL_SIZE * 1, y + PIXEL_SIZE * 5.5, PIXEL_SIZE * 10, PIXEL_SIZE * 0.8);
  }
}

function drawTooltip(ctx: CanvasRenderingContext2D, agent: AgentSprite) {
  const width = 188;
  const height = 62;
  const x = agent.x - width / 2;
  const y = agent.y - 102;

  ctx.save();
  ctx.fillStyle = "rgba(5, 10, 18, 0.84)";
  ctx.strokeStyle = `${agent.accent}cc`;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 18;
  drawRoundedRect(ctx, x, y, width, height, 16);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(agent.x - 10, y + height - 1);
  ctx.lineTo(agent.x, y + height + 12);
  ctx.lineTo(agent.x + 10, y + height - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#f8fbff";
  ctx.font = "600 14px var(--font-geist), sans-serif";
  ctx.fillText(agent.name, x + 14, y + 20);
  ctx.fillStyle = agent.accent;
  ctx.font = "600 11px var(--font-geist), sans-serif";
  ctx.fillText(agent.role, x + 14, y + 37);
  ctx.fillStyle = "#c9d8f5";
  ctx.font = "12px var(--font-geist), sans-serif";
  ctx.fillText(truncateTask(agent.task), x + 14, y + 53);
  ctx.restore();
}

function drawTaskBubble(ctx: CanvasRenderingContext2D, agent: AgentSprite) {
  const text = truncateTask(agent.task);
  const width = Math.max(92, ctx.measureText(text).width + 22);
  const x = agent.x - width / 2;
  const y = agent.y - 76;

  ctx.save();
  ctx.fillStyle = "rgba(16, 24, 39, 0.92)";
  ctx.strokeStyle = `${agent.accent}66`;
  drawRoundedRect(ctx, x, y, width, 28, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#eff6ff";
  ctx.font = "11px var(--font-geist), sans-serif";
  ctx.fillText(text, x + 11, y + 18);
  ctx.restore();
}

function drawDeskLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, accent: string) {
  ctx.save();
  ctx.fillStyle = "rgba(8, 14, 24, 0.7)";
  drawRoundedRect(ctx, x - 38, y, 76, 18, 9);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.font = "600 10px var(--font-geist), sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 12);
  ctx.restore();
}

function updateWalking(agent: AgentSprite, deltaMs: number) {
  if (agent.path.length === 0) {
    agent.mode = agent.lastMode;
    return;
  }

  const speed = 0.13 * deltaMs;
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

function drawOffice(ctx: CanvasRenderingContext2D, width: number, height: number, agents: AgentSprite[], hoveredId: string | null, timeMs: number, isLoading: boolean, error: string | null, updatedAt: string | null) {
  const scale = Math.min(width / 1200, height / 760);
  const offsetX = (width - 1200 * scale) / 2;
  const offsetY = (height - 760 * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  const gradient = ctx.createLinearGradient(0, 0, 0, 760);
  gradient.addColorStop(0, "#0d1a2a");
  gradient.addColorStop(0.45, "#10243a");
  gradient.addColorStop(1, "#081018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 760);

  ctx.fillStyle = "rgba(68, 114, 184, 0.22)";
  ctx.fillRect(48, 56, 1104, 648);
  ctx.fillStyle = "#10263f";
  ctx.fillRect(70, 78, 1060, 604);

  for (let y = 0; y < 14; y += 1) {
    for (let x = 0; x < 24; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#12314f" : "#0f2841";
      ctx.fillRect(90 + x * 42, 102 + y * 42, 40, 40);
    }
  }

  ctx.strokeStyle = "rgba(186, 214, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.strokeRect(88, 100, 1008, 590);

  ctx.fillStyle = "#173756";
  ctx.fillRect(120, 118, 320, 120);
  ctx.fillRect(708, 118, 280, 170);
  ctx.fillRect(470, 312, 240, 150);
  ctx.fillRect(106, 486, 272, 162);
  ctx.fillRect(844, 464, 184, 180);

  ctx.fillStyle = "rgba(32, 147, 255, 0.12)";
  ctx.fillRect(136, 132, 284, 92);
  ctx.fillStyle = "rgba(249, 60, 60, 0.12)";
  ctx.fillRect(722, 132, 248, 142);
  ctx.fillStyle = "rgba(255, 189, 89, 0.14)";
  ctx.fillRect(122, 500, 242, 134);
  ctx.fillStyle = "rgba(34, 197, 94, 0.14)";
  ctx.fillRect(858, 478, 152, 152);

  const drawDesk = (x: number, y: number, label: string, accent: string) => {
    ctx.fillStyle = "#25384f";
    ctx.fillRect(x - 54, y - 32, 108, 64);
    ctx.fillStyle = "#445c78";
    ctx.fillRect(x - 48, y - 28, 96, 56);
    ctx.fillStyle = "#0f1724";
    ctx.fillRect(x - 24, y - 21, 48, 28);
    ctx.fillStyle = "#88c8ff";
    ctx.fillRect(x - 21, y - 18, 42, 22);
    ctx.fillStyle = accent;
    ctx.fillRect(x - 54, y - 32, 108, 6);
    ctx.fillStyle = "#161f2b";
    ctx.fillRect(x - 20, y + 18, 40, 12);
    drawDeskLabel(ctx, label, x, y + 44, accent);
  };

  drawDesk(264, 212, "KIMBERLY", "#2093FF");
  drawDesk(214, 520, "KEVIN", "#FFBD59");
  drawDesk(762, 258, "ALEX", "#F93C3C");
  drawDesk(892, 258, "SABRI", "#F93C3C");
  drawDesk(832, 528, "JORDAN", "#22C55E");

  ctx.fillStyle = "#2a3b4c";
  ctx.fillRect(522, 486, 218, 74);
  ctx.fillStyle = "#42566d";
  ctx.fillRect(534, 498, 194, 50);
  ctx.fillStyle = "#d7b489";
  ctx.beginPath();
  ctx.arc(602, 380, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#596f85";
  ctx.fillRect(594, 372, 16, 16);

  for (const [chairX, chairY] of [
    [532, 380],
    [672, 380],
    [602, 300],
    [602, 460],
  ]) {
    ctx.fillStyle = "#38485b";
    ctx.fillRect(chairX - 18, chairY - 18, 36, 36);
    ctx.fillStyle = "#556a80";
    ctx.fillRect(chairX - 14, chairY - 14, 28, 28);
  }

  ctx.fillStyle = "#2e3e50";
  ctx.fillRect(960, 486, 44, 112);
  ctx.fillStyle = "#1e2936";
  ctx.fillRect(968, 496, 28, 90);
  ctx.fillStyle = "#66e6ff";
  ctx.fillRect(973, 507, 18, 7);
  ctx.fillRect(973, 525, 18, 7);
  ctx.fillRect(973, 543, 18, 7);
  ctx.fillStyle = "#22C55E";
  ctx.fillRect(973, 561, 18, 7);

  ctx.fillStyle = "#27384a";
  ctx.fillRect(430, 116, 52, 88);
  ctx.fillStyle = "#cbd7e6";
  ctx.fillRect(438, 126, 36, 18);
  ctx.fillStyle = "#080c13";
  ctx.fillRect(446, 158, 20, 18);

  for (const [plantX, plantY] of [
    [128, 134],
    [1048, 132],
    [108, 618],
    [1042, 616],
  ]) {
    ctx.fillStyle = "#6d4c41";
    ctx.fillRect(plantX, plantY, 24, 18);
    ctx.fillStyle = "#3fc56d";
    ctx.fillRect(plantX - 6, plantY - 18, 36, 16);
    ctx.fillRect(plantX + 2, plantY - 34, 22, 18);
  }

  ctx.fillStyle = "#d6e8ff";
  ctx.font = "700 28px var(--font-geist), sans-serif";
  ctx.fillText("Pixel Office", 90, 62);
  ctx.fillStyle = HUD_MUTED;
  ctx.font = "14px var(--font-geist), sans-serif";
  ctx.fillText("Live Supabase task state. Hover for detail. Click to open agent page.", 90, 86);

  ctx.fillStyle = "rgba(6, 12, 20, 0.55)";
  drawRoundedRect(ctx, 886, 28, 226, 68, 18);
  ctx.fill();
  ctx.fillStyle = HUD_TEXT;
  ctx.font = "600 13px var(--font-geist), sans-serif";
  ctx.fillText("SYNC", 908, 52);
  ctx.fillStyle = isLoading ? "#FFBD59" : error ? "#F93C3C" : "#7ee787";
  ctx.fillText(isLoading ? "LOADING" : error ? "DEGRADED" : "LIVE", 962, 52);
  ctx.fillStyle = HUD_MUTED;
  ctx.font = "12px var(--font-geist), sans-serif";
  ctx.fillText(updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Waiting for first poll", 908, 74);

  ctx.fillStyle = "rgba(6, 12, 20, 0.45)";
  drawRoundedRect(ctx, 90, 664, 320, 44, 16);
  ctx.fill();
  ctx.fillStyle = HUD_TEXT;
  ctx.font = "600 12px var(--font-geist), sans-serif";
  ctx.fillText("LOUNGE", 114, 691);
  ctx.fillText("MEETING", 574, 691);
  ctx.fillText("SERVER", 964, 691);

  const counts = agents.reduce(
    (acc, agent) => {
      acc[agent.lastMode] += 1;
      return acc;
    },
    { idle: 0, working: 0 },
  );
  ctx.fillStyle = "rgba(6, 12, 20, 0.55)";
  drawRoundedRect(ctx, 90, 28, 260, 58, 18);
  ctx.fill();
  ctx.fillStyle = "#7ee787";
  ctx.font = "600 13px var(--font-geist), sans-serif";
  ctx.fillText(`WORKING ${counts.working}`, 112, 52);
  ctx.fillStyle = "#ffd166";
  ctx.fillText(`IDLE ${counts.idle}`, 212, 52);
  ctx.fillStyle = HUD_MUTED;
  ctx.font = "12px var(--font-geist), sans-serif";
  ctx.fillText("Agents walk to desks and lounge as task state changes.", 112, 73);

  for (const agent of agents) {
    if (agent.mode === "working") {
      ctx.font = "11px var(--font-geist), sans-serif";
      drawTaskBubble(ctx, agent);
    }
  }

  for (const agent of agents) {
    drawPixelFigure(ctx, agent, timeMs);
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

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

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const render = (time: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const last = lastFrameTimeRef.current || time;
      const deltaMs = Math.min(34, time - last);
      lastFrameTimeRef.current = time;

      for (const agent of agentsRef.current) {
        if (agent.mode === "walking") {
          updateWalking(agent, deltaMs);
        }
      }

      drawOffice(ctx, width, height, agentsRef.current, hoveredIdRef.current, time, isLoading, error, updatedAt);
      animationRef.current = window.requestAnimationFrame(render);
    };

    animationRef.current = window.requestAnimationFrame(render);

    return () => {
      observer.disconnect();
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [error, isLoading, updatedAt]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const projectPointer = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const scale = Math.min(rect.width / 1200, rect.height / 760);
      const offsetX = (rect.width - 1200 * scale) / 2;
      const offsetY = (rect.height - 760 * scale) / 2;
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
  }, [router]);

  return (
    <section className="-mx-5 -mb-5 -mt-2 md:-mx-6" aria-label="Pixel office">
      <h1 className="sr-only">Pixel Office</h1>
      <canvas
        ref={canvasRef}
        className="block h-[calc(100vh-7.25rem)] min-h-[640px] w-full rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(32,147,255,0.14),transparent_28%),#081018] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      />
    </section>
  );
}
