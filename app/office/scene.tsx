"use client";

import { useEffect, useRef, useCallback } from "react";
import type { AgentRecord } from "@/lib/agents-data";

type Props = {
  agents: AgentRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

const DEPT_COLORS: Record<string, number> = {
  Executive: 0x2093ff,
  Marketing: 0xf93c3c,
  Sales: 0x22c55e,
  Development: 0xffbd59,
};

const SKIN = 0xffdbac;

const DESK_POSITIONS: Record<string, { pos: [number, number]; facing: number; dept: string }> = {
  kimberly: { pos: [-4, -3], facing: 0, dept: "Executive" },
  alex: { pos: [-1, -3], facing: 0, dept: "Marketing" },
  sabri: { pos: [2, -3], facing: 0, dept: "Marketing" },
  jordan: { pos: [5, -3], facing: 0, dept: "Sales" },
  kevin: { pos: [-4, 3], facing: Math.PI, dept: "Development" },
};

function createMaterial(THREE: any, color: number, opts?: any) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...opts });
}

// ─── Low-poly horse decoration ───
function createHorse(THREE: any, color: number, scale: number = 1) {
  const group = new THREE.Group();
  const mat = createMaterial(THREE, color);
  const darkMat = createMaterial(THREE, 0x1a1a1a);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.8), mat);
  body.position.y = 1.4;
  body.castShadow = true;
  group.add(body);

  // Neck (angled)
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), mat);
  neck.position.set(0.9, 2.1, 0);
  neck.rotation.z = -0.4;
  neck.castShadow = true;
  group.add(neck);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.45), mat);
  head.position.set(1.5, 2.5, 0);
  head.castShadow = true;
  group.add(head);

  // Snout
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.35), mat);
  snout.position.set(1.95, 2.35, 0);
  group.add(snout);

  // Eyes
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }));
    eye.position.set(1.7, 2.58, side * 0.2);
    group.add(eye);
  }

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 4), mat);
    ear.position.set(1.3, 2.8, side * 0.15);
    ear.rotation.z = side * 0.3;
    group.add(ear);
  }

  // Mane
  for (let i = 0; i < 5; i++) {
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.15), darkMat);
    mane.position.set(0.5 + i * 0.25, 2.0 + i * 0.15, 0);
    mane.rotation.z = -0.2;
    group.add(mane);
  }

  // Legs
  const legPositions = [[-0.55, -1], [-0.55, 1], [0.55, -1], [0.55, 1]];
  for (const [lx, lside] of legPositions) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), mat);
    leg.position.set(lx, 0.5, lside * 0.25);
    leg.castShadow = true;
    group.add(leg);
    // Hoof
    const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.15, 0.22), darkMat);
    hoof.position.set(lx, 0.05, lside * 0.25);
    group.add(hoof);
  }

  // Tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), darkMat);
  tail.position.set(-1.0, 1.6, 0);
  tail.rotation.z = 0.3;
  group.add(tail);

  group.scale.setScalar(scale);
  return group;
}

// ─── Character ───
function createCharacter(THREE: any, color: number) {
  const group = new THREE.Group();
  const skinMat = createMaterial(THREE, SKIN);
  const bodyMat = createMaterial(THREE, color);
  const darkMat = createMaterial(THREE, 0x2a2a2a);
  const shoeMat = createMaterial(THREE, 0x111111);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), skinMat);
  head.position.y = 1.92;
  head.castShadow = true;
  group.add(head);

  // Hair
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.15, 0.44), darkMat);
  hair.position.set(0, 2.15, -0.02);
  group.add(hair);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.65, 0.32), bodyMat);
  body.position.y = 1.38;
  body.castShadow = true;
  group.add(body);

  // Arms
  for (const side of [-1, 1]) {
    // Upper arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, 0.16), bodyMat);
    arm.position.set(side * 0.36, 1.5, 0);
    arm.castShadow = true;
    group.add(arm);
    // Forearm
    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.14), skinMat);
    forearm.position.set(side * 0.36, 1.2, 0.1);
    forearm.rotation.x = -0.3;
    group.add(forearm);
  }

  // Legs
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.5, 0.19), darkMat);
    leg.position.set(side * 0.14, 0.75, 0);
    leg.castShadow = true;
    group.add(leg);
    // Shoes
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.28), shoeMat);
    shoe.position.set(side * 0.14, 0.48, 0.04);
    group.add(shoe);
  }

  return group;
}

// ─── Desk with monitor ───
function createDesk(THREE: any, accent: number) {
  const group = new THREE.Group();
  const woodMat = createMaterial(THREE, 0x4a3828, { roughness: 0.85 });
  const darkWood = createMaterial(THREE, 0x2a1a10);
  const metalMat = createMaterial(THREE, 0x555555, { metalness: 0.5, roughness: 0.3 });

  // Desktop surface
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.9), woodMat);
  top.position.y = 0.75;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Desk legs (metal)
  for (const [lx, lz] of [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), metalMat);
    leg.position.set(lx, 0.375, lz);
    group.add(leg);
  }

  // Under-desk panel
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.04), darkWood);
  panel.position.set(0, 0.5, -0.42);
  group.add(panel);

  // Monitor
  const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.04), createMaterial(THREE, 0x1a1a1a));
  monitorFrame.position.set(0, 1.12, -0.3);
  monitorFrame.castShadow = true;
  group.add(monitorFrame);

  // Screen (glowing)
  const screenMat = new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.1,
  });
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.43, 0.01), screenMat);
  screen.position.set(0, 1.12, -0.275);
  group.add(screen);

  // Monitor stand
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 8), metalMat);
  stand.position.set(0, 0.84, -0.3);
  group.add(stand);

  // Monitor base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), metalMat);
  base.position.set(0, 0.77, -0.3);
  group.add(base);

  // Keyboard
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.02, 0.15), createMaterial(THREE, 0x222222));
  kb.position.set(0, 0.78, 0.1);
  group.add(kb);

  // Mouse
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.12), createMaterial(THREE, 0x222222));
  mouse.position.set(0.4, 0.78, 0.1);
  group.add(mouse);

  // Coffee mug
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.1, 12), createMaterial(THREE, accent, { roughness: 0.3 }));
  mug.position.set(-0.6, 0.82, 0.2);
  group.add(mug);

  // Chair
  const chairGroup = new THREE.Group();
  const chairMat = createMaterial(THREE, 0x1c1c2e, { roughness: 0.6 });
  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), chairMat);
  seat.position.set(0, 0.5, 0.8);
  chairGroup.add(seat);
  // Backrest
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.06), chairMat);
  backrest.position.set(0, 0.82, 1.05);
  chairGroup.add(backrest);
  // Chair base
  const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), metalMat);
  chairBase.position.set(0, 0.25, 0.8);
  chairGroup.add(chairBase);
  // Chair star base
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.25), metalMat);
    armMesh.position.set(Math.sin(angle) * 0.12, 0.02, 0.8 + Math.cos(angle) * 0.12);
    armMesh.rotation.y = angle;
    chairGroup.add(armMesh);
    // Wheels
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), createMaterial(THREE, 0x111111));
    wheel.position.set(Math.sin(angle) * 0.22, 0.02, 0.8 + Math.cos(angle) * 0.22);
    chairGroup.add(wheel);
  }
  group.add(chairGroup);

  return group;
}

// ─── Room ───
function createRoom(THREE: any) {
  const group = new THREE.Group();

  // Floor — dark polished concrete
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x141820, roughness: 0.4, metalness: 0.05 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // Subtle floor grid lines
  const grid = new THREE.GridHelper(22, 22, 0x1a2030, 0x161c28);
  grid.position.y = 0.005;
  group.add(grid);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x12161f, roughness: 0.9, metalness: 0 });
  // Back wall
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(22, 6), wallMat);
  backWall.position.set(0, 3, -9);
  backWall.receiveShadow = true;
  group.add(backWall);
  // Left wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 6), wallMat);
  leftWall.position.set(-11, 3, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  group.add(leftWall);
  // Right wall
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 6), wallMat);
  rightWall.position.set(11, 3, 0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  group.add(rightWall);

  // Wall accent strips (neon blue lines)
  const neonMat = new THREE.MeshStandardMaterial({ color: 0x2093ff, emissive: 0x2093ff, emissiveIntensity: 0.8 });
  for (const z of [-8.98]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(20, 0.04, 0.02), neonMat);
    strip.position.set(0, 1.5, z);
    group.add(strip);
  }
  // Left wall accent
  const lStrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 16), neonMat);
  lStrip.position.set(-10.98, 1.5, 0);
  group.add(lStrip);

  // "DERBY DIGITAL" sign on back wall
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 96;
  const ctx = signCanvas.getContext("2d")!;
  ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = "#2093FF";
  ctx.font = "bold 52px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DERBY DIGITAL", 256, 60);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.minFilter = THREE.LinearFilter;
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    transparent: true,
    emissive: 0x2093ff,
    emissiveIntensity: 0.6,
    emissiveMap: signTex,
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), signMat);
  sign.position.set(0, 4.5, -8.95);
  group.add(sign);

  // Ceiling
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x0d1017, roughness: 0.95 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 6;
  group.add(ceil);

  // Ceiling lights (recessed)
  for (const [lx, lz] of [[-4, -3], [0, -3], [4, -3], [-2, 3], [3, 3]]) {
    const lightPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeeeeff, emissiveIntensity: 0.5 })
    );
    lightPanel.rotation.x = Math.PI / 2;
    lightPanel.position.set(lx, 5.98, lz);
    group.add(lightPanel);
  }

  // Plant decorations
  for (const [px, pz] of [[-9.5, -7.5], [9.5, -7.5], [-9.5, 7.5]]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.4, 12), createMaterial(THREE, 0x4a3020));
    pot.position.set(px, 0.2, pz);
    pot.castShadow = true;
    group.add(pot);
    // Plant leaves (simple cones)
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8 + i * 0.3, 8), createMaterial(THREE, 0x1a6b3a));
      leaf.position.set(px, 0.8 + i * 0.25, pz);
      leaf.castShadow = true;
      group.add(leaf);
    }
  }

  // Whiteboard on left wall
  const wbFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2, 3), createMaterial(THREE, 0x333333));
  wbFrame.position.set(-10.95, 3, -2);
  group.add(wbFrame);
  const wb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.8, 2.8), createMaterial(THREE, 0xf0f0f0, { roughness: 0.3 }));
  wb.position.set(-10.92, 3, -2);
  group.add(wb);

  return group;
}

// ─── Floating label ───
function createLabel(THREE: any, name: string, role: string, dept: string, color: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  // Background
  ctx.fillStyle = "rgba(10,10,15,0.9)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 312, 72, 10);
  ctx.fill();
  ctx.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(4, 4, 312, 72, 10);
  ctx.stroke();
  // Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name, 160, 32);
  // Role
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "14px system-ui, sans-serif";
  ctx.fillText(role + " · " + dept, 160, 56);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.4, 0.6, 1);
  return sprite;
}

// ─── Department zone floor marker ───
function createZoneMarker(THREE: any, label: string, color: number, x: number, z: number, w: number, h: number) {
  const group = new THREE.Group();
  // Glowing floor area
  const zoneMat = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 0.06,
    emissive: color,
    emissiveIntensity: 0.15,
  });
  const zonePlane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), zoneMat);
  zonePlane.rotation.x = -Math.PI / 2;
  zonePlane.position.set(x, 0.02, z);
  zonePlane.receiveShadow = true;
  group.add(zonePlane);

  // Border lines
  const borderMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, transparent: true, opacity: 0.4 });
  const edges = [
    [x, 0.015, z - h / 2, w, 0.02, 0.04],
    [x, 0.015, z + h / 2, w, 0.02, 0.04],
    [x - w / 2, 0.015, z, 0.04, 0.02, h],
    [x + w / 2, 0.015, z, 0.04, 0.02, h],
  ];
  for (const [ex, ey, ez, ew, eh, ed] of edges) {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(ew, eh, ed), borderMat);
    edge.position.set(ex, ey, ez);
    group.add(edge);
  }

  return group;
}

export function OfficeScene({ agents, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const handleClickRef = useRef(onSelect);
  handleClickRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    import("three").then((THREE) => {
      if (destroyed || !containerRef.current) return;

      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      containerRef.current.appendChild(renderer.domElement);

      // Camera
      const d = 7;
      const aspect = w / h;
      const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100);

      // Lights
      const ambient = new THREE.AmbientLight(0x303050, 1.0);
      scene.add(ambient);

      const mainLight = new THREE.DirectionalLight(0xfff5ee, 2.0);
      mainLight.position.set(8, 15, 8);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      mainLight.shadow.camera.left = -15;
      mainLight.shadow.camera.right = 15;
      mainLight.shadow.camera.top = 15;
      mainLight.shadow.camera.bottom = -15;
      mainLight.shadow.camera.near = 0.5;
      mainLight.shadow.camera.far = 40;
      mainLight.shadow.bias = -0.001;
      scene.add(mainLight);

      // Blue accent light from the sign
      const blueLight = new THREE.PointLight(0x2093ff, 2.0, 15);
      blueLight.position.set(0, 4, -7);
      scene.add(blueLight);

      // Warm fill light
      const fillLight = new THREE.PointLight(0xffaa55, 0.4, 20);
      fillLight.position.set(-5, 3, 5);
      scene.add(fillLight);

      // Room
      scene.add(createRoom(THREE));

      // Department zones
      const zones = [
        { label: "Executive", color: DEPT_COLORS.Executive, x: -4, z: -3, w: 3.5, h: 3.5 },
        { label: "Marketing", color: DEPT_COLORS.Marketing, x: 0.5, z: -3, w: 5, h: 3.5 },
        { label: "Sales", color: DEPT_COLORS.Sales, x: 5, z: -3, w: 3.5, h: 3.5 },
        { label: "Development", color: DEPT_COLORS.Development, x: -4, z: 3, w: 3.5, h: 3.5 },
      ];
      for (const z of zones) {
        scene.add(createZoneMarker(THREE, z.label, z.color, z.x, z.z, z.w, z.h));
      }

      // Agents
      const agentMeshes = new Map<string, any>();
      const aiAgents = agents.filter(a => a.id in DESK_POSITIONS);
      for (const agent of aiAgents) {
        const config = DESK_POSITIONS[agent.id];
        const color = DEPT_COLORS[agent.department] || 0x666666;

        const desk = createDesk(THREE, color);
        desk.position.set(config.pos[0], 0, config.pos[1]);
        desk.rotation.y = config.facing;
        scene.add(desk);

        const character = createCharacter(THREE, color);
        const charZ = config.facing === Math.PI ? config.pos[1] - 0.7 : config.pos[1] + 0.7;
        character.position.set(config.pos[0], 0, charZ);
        character.rotation.y = config.facing;
        character.userData = { id: agent.id };
        scene.add(character);
        agentMeshes.set(agent.id, character);

        const label = createLabel(THREE, agent.name, agent.role, agent.department, color);
        label.position.set(config.pos[0], 2.9, charZ);
        scene.add(label);

        // Desk glow light
        const deskLight = new THREE.PointLight(color, 0.3, 3);
        deskLight.position.set(config.pos[0], 1.5, config.pos[1]);
        scene.add(deskLight);
      }

      // ─── Horse decorations! 🐴 ───
      // Horse 1: by the entrance (right side)
      const horse1 = createHorse(THREE, 0x2093ff, 0.8);
      horse1.position.set(8, 0, 5);
      horse1.rotation.y = -Math.PI / 4;
      scene.add(horse1);

      // Horse 2: trophy horse on the left
      const horse2 = createHorse(THREE, 0xc4a35a, 0.6);
      horse2.position.set(-8, 0, 5);
      horse2.rotation.y = Math.PI / 3;
      scene.add(horse2);

      // Horse 3: small desk decoration near Kevin
      const horse3 = createHorse(THREE, 0xf0f0f0, 0.25);
      horse3.position.set(-2.5, 0.78, 2.5);
      scene.add(horse3);

      // Pedestal for trophy horse
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.3, 16), createMaterial(THREE, 0x222233, { metalness: 0.3 }));
      pedestal.position.set(-8, 0.15, 5);
      scene.add(pedestal);

      // Pedestal for blue horse
      const pedestal2 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.25, 16), createMaterial(THREE, 0x222233, { metalness: 0.3 }));
      pedestal2.position.set(8, 0.125, 5);
      scene.add(pedestal2);

      // ─── Camera controls ───
      let theta = Math.PI / 4;
      let phi = Math.PI / 5.5;
      let zoom = 7;
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;

      function updateCamera() {
        const r = 25;
        camera.position.set(
          r * Math.cos(phi) * Math.sin(theta),
          r * Math.sin(phi) + 3,
          r * Math.cos(phi) * Math.cos(theta)
        );
        camera.lookAt(0, 1, 0);
        const a = w / h;
        camera.left = -zoom * a;
        camera.right = zoom * a;
        camera.top = zoom;
        camera.bottom = -zoom;
        camera.updateProjectionMatrix();
      }
      updateCamera();

      const onPointerDown = (e: PointerEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
      const onPointerUp = () => { isDragging = false; };
      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return;
        theta += (e.clientX - prevX) * 0.004;
        phi = Math.max(0.08, Math.min(Math.PI / 2.8, phi + (e.clientY - prevY) * 0.004));
        prevX = e.clientX;
        prevY = e.clientY;
        updateCamera();
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        zoom = Math.max(3, Math.min(14, zoom + e.deltaY * 0.008));
        updateCamera();
      };

      // Click detection
      const raycaster = new THREE.Raycaster();
      const mouseVec = new THREE.Vector2();
      const onClick = (e: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseVec, camera);
        let hit: string | null = null;
        for (const [id, mesh] of agentMeshes.entries()) {
          const intersects = raycaster.intersectObjects(mesh.children, true);
          if (intersects.length > 0) { hit = id; break; }
        }
        handleClickRef.current(hit);
      };

      const el = renderer.domElement;
      el.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointermove", onPointerMove);
      el.addEventListener("wheel", onWheel, { passive: false });
      el.addEventListener("click", onClick);
      el.style.cursor = "grab";

      // ─── Animate ───
      const clock = new THREE.Clock();
      function animate() {
        if (destroyed) return;
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        // Agent idle bob
        for (const [id, mesh] of agentMeshes.entries()) {
          mesh.position.y = Math.sin(t * 1.8 + mesh.position.x * 2) * 0.025;
          // Head look around
          const head = mesh.children[0];
          if (head) {
            head.rotation.y = Math.sin(t * 0.5 + mesh.position.x) * 0.15;
          }
        }

        // Horse tail wag
        if (horse1.children.length > 0) {
          const tail1 = horse1.children[horse1.children.length - 1];
          tail1.rotation.x = Math.sin(t * 3) * 0.15;
        }
        if (horse2.children.length > 0) {
          const tail2 = horse2.children[horse2.children.length - 1];
          tail2.rotation.x = Math.sin(t * 2.5 + 1) * 0.12;
        }

        // Blue accent light pulse
        blueLight.intensity = 1.5 + Math.sin(t * 1.5) * 0.5;

        renderer.render(scene, camera);
      }
      animate();

      // Handle resize
      const onResize = () => {
        if (!containerRef.current) return;
        const nw = containerRef.current.clientWidth;
        const nh = containerRef.current.clientHeight;
        renderer.setSize(nw, nh);
        const a = nw / nh;
        camera.left = -zoom * a;
        camera.right = zoom * a;
        camera.top = zoom;
        camera.bottom = -zoom;
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", onResize);

      cleanupRef.current = () => {
        el.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointermove", onPointerMove);
        el.removeEventListener("wheel", onWheel);
        el.removeEventListener("click", onClick);
        window.removeEventListener("resize", onResize);
        if (containerRef.current && el.parentNode === containerRef.current) {
          containerRef.current.removeChild(el);
        }
        renderer.dispose();
      };
    });

    return () => {
      destroyed = true;
      cleanupRef.current?.();
    };
  }, [agents]);

  return (
    <div
      ref={containerRef}
      className="h-[700px] w-full overflow-hidden rounded-2xl border border-white/[0.08]"
      style={{ background: "#0a0a0f" }}
    />
  );
}
