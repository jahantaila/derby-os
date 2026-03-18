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

const DESK_POSITIONS: Record<string, [number, number]> = {
  kimberly: [-5, -2],
  alex: [-2, -2],
  sabri: [1, -2],
  jordan: [4, 2],
  kevin: [-2, 2],
};

function createHumanoid(THREE: any, color: number) {
  const group = new THREE.Group();
  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: SKIN }));
  head.position.y = 1.9;
  head.castShadow = true;
  group.add(head);
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), new THREE.MeshLambertMaterial({ color }));
  body.position.y = 1.35;
  body.castShadow = true;
  group.add(body);
  // Arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.15), new THREE.MeshLambertMaterial({ color }));
    arm.position.set(side * 0.35, 1.35, 0);
    arm.castShadow = true;
    group.add(arm);
  }
  // Legs
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    leg.position.set(side * 0.14, 0.75, 0);
    leg.castShadow = true;
    group.add(leg);
  }
  return group;
}

function createDesk(THREE: any, accent: number) {
  const group = new THREE.Group();
  // Desktop
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.8), new THREE.MeshLambertMaterial({ color: 0x3a2519 }));
  top.position.y = 0.72;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);
  // Legs
  for (const [lx, lz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), new THREE.MeshLambertMaterial({ color: 0x261913 }));
    leg.position.set(lx, 0.36, lz);
    group.add(leg);
  }
  // Monitor
  const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.04), new THREE.MeshLambertMaterial({ color: accent, emissive: accent, emissiveIntensity: 0.3 }));
  monitor.position.set(0, 1.05, -0.25);
  monitor.castShadow = true;
  group.add(monitor);
  // Monitor stand
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  stand.position.set(0, 0.82, -0.25);
  group.add(stand);
  // Chair
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), new THREE.MeshLambertMaterial({ color: 0x1a1a2e }));
  seat.position.set(0, 0.5, 0.7);
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.06), new THREE.MeshLambertMaterial({ color: 0x1a1a2e }));
  back.position.set(0, 0.78, 1.0);
  group.add(back);
  return group;
}

function createLabel(THREE: any, name: string, role: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(10,10,15,0.85)";
  ctx.roundRect(0, 0, 256, 64, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(name, 128, 26);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "14px system-ui";
  ctx.fillText(role, 128, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2, 0.5, 1);
  return sprite;
}

function createDeptZone(THREE: any, color: number, x: number, z: number, w: number, h: number, label: string) {
  const group = new THREE.Group();
  // Floor zone
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.08 });
  const plane = new THREE.Mesh(geo, mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, 0.01, z);
  plane.receiveShadow = true;
  group.add(plane);
  // Zone label
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  ctx.font = "bold 18px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), 128, 30);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(sMat);
  sprite.scale.set(2.5, 0.5, 1);
  sprite.position.set(x, 0.3, z - h / 2 - 0.4);
  group.add(sprite);
  return group;
}

export function OfficeScene({ agents, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const agentMeshes = useRef<Map<string, any>>(new Map());
  const raycaster = useRef<any>(null);
  const mouse = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  const handleClick = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !raycaster.current || !mouse.current || !cameraRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    
    let hit: string | null = null;
    for (const [id, mesh] of agentMeshes.current.entries()) {
      const intersects = raycaster.current.intersectObjects(mesh.children, true);
      if (intersects.length > 0) { hit = id; break; }
    }
    onSelect(hit);
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    import("three").then((THREE) => {
      if (destroyed || !containerRef.current) return;

      const w = containerRef.current.clientWidth;
      const h = 680;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);
      scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);

      // Camera — isometric
      const d = 8;
      const aspect = w / h;
      const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 100);
      camera.position.set(12, 10, 12);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Raycaster
      raycaster.current = new THREE.Raycaster();
      mouse.current = new THREE.Vector2();

      // Lights
      const ambient = new THREE.AmbientLight(0x404060, 1.2);
      scene.add(ambient);
      const dir = new THREE.DirectionalLight(0xffffff, 1.5);
      dir.position.set(8, 12, 8);
      dir.castShadow = true;
      dir.shadow.mapSize.width = 2048;
      dir.shadow.mapSize.height = 2048;
      dir.shadow.camera.left = -15;
      dir.shadow.camera.right = 15;
      dir.shadow.camera.top = 15;
      dir.shadow.camera.bottom = -15;
      scene.add(dir);
      const point = new THREE.PointLight(0x2093ff, 0.5, 20);
      point.position.set(0, 5, 0);
      scene.add(point);

      // Grid floor
      const floorGeo = new THREE.PlaneGeometry(30, 30);
      const floorMat = new THREE.MeshLambertMaterial({ color: 0x0f1118 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      const grid = new THREE.GridHelper(30, 40, 0x1b2433, 0x151b27);
      grid.position.y = 0.005;
      scene.add(grid);

      // Department zones
      const deptGroups: Record<string, { agents: string[]; x: number; z: number }> = {
        Executive: { agents: ["kimberly"], x: -5, z: -2 },
        Marketing: { agents: ["alex", "sabri"], x: -0.5, z: -2 },
        Sales: { agents: ["jordan"], x: 4, z: 2 },
        Development: { agents: ["kevin"], x: -2, z: 2 },
      };
      for (const [dept, info] of Object.entries(deptGroups)) {
        const zone = createDeptZone(THREE, DEPT_COLORS[dept] || 0x666666, info.x, info.z, 4, 4, dept);
        scene.add(zone);
      }

      // Agents + desks
      const aiAgents = agents.filter(a => a.id in DESK_POSITIONS);
      for (const agent of aiAgents) {
        const [dx, dz] = DESK_POSITIONS[agent.id];
        const color = DEPT_COLORS[agent.department] || 0x666666;

        // Desk
        const desk = createDesk(THREE, color);
        desk.position.set(dx, 0, dz);
        scene.add(desk);

        // Character
        const character = createHumanoid(THREE, color);
        character.position.set(dx, 0, dz + 0.7);
        character.userData = { id: agent.id };
        scene.add(character);
        agentMeshes.current.set(agent.id, character);

        // Label
        const label = createLabel(THREE, agent.name, agent.role);
        label.position.set(dx, 2.5, dz + 0.7);
        scene.add(label);
      }

      // Orbit controls (manual)
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;
      let theta = Math.PI / 4;
      let phi = Math.PI / 6;
      let zoom = 8;

      function updateCamera() {
        const r = 20;
        camera.position.set(
          r * Math.cos(phi) * Math.sin(theta),
          r * Math.sin(phi) + 5,
          r * Math.cos(phi) * Math.cos(theta)
        );
        camera.lookAt(0, 0, 0);
        const a = w / h;
        camera.left = -zoom * a;
        camera.right = zoom * a;
        camera.top = zoom;
        camera.bottom = -zoom;
        camera.updateProjectionMatrix();
      }

      const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY; };
      const onMouseUp = () => { isDragging = false; };
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        theta += (e.clientX - prevX) * 0.005;
        phi = Math.max(0.1, Math.min(Math.PI / 3, phi + (e.clientY - prevY) * 0.005));
        prevX = e.clientX;
        prevY = e.clientY;
        updateCamera();
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        zoom = Math.max(3, Math.min(15, zoom + e.deltaY * 0.01));
        updateCamera();
      };

      renderer.domElement.addEventListener("mousedown", onMouseDown);
      renderer.domElement.addEventListener("mouseup", onMouseUp);
      renderer.domElement.addEventListener("mousemove", onMouseMove);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
      renderer.domElement.addEventListener("click", handleClick as any);

      updateCamera();

      // Animate
      const clock = new THREE.Clock();
      function animate() {
        if (destroyed) return;
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        // Idle bob
        for (const [, mesh] of agentMeshes.current.entries()) {
          mesh.position.y = Math.sin(t * 2 + mesh.position.x) * 0.03;
        }
        renderer.render(scene, camera);
      }
      animate();
    });

    return () => {
      destroyed = true;
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [agents, handleClick]);

  return (
    <div
      ref={containerRef}
      className="h-[680px] w-full overflow-hidden rounded-2xl border border-white/10"
      style={{ background: "#0a0a0f" }}
    />
  );
}
