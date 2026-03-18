"use client";

import { Fragment, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, OrthographicCamera, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { AgentRecord } from "@/lib/agents";

type OfficeSceneProps = {
  agents: AgentRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

type DeskConfig = {
  desk: [number, number, number];
  walk: [number, number, number];
};

const DEPARTMENT_COLORS = {
  Executive: "#2093FF",
  Marketing: "#F93C3C",
  Sales: "#22C55E",
  Development: "#FFBD59",
} as const;

const DEPARTMENT_ZONES = [
  {
    name: "Executive",
    color: DEPARTMENT_COLORS.Executive,
    position: [0, 0.02, -3.6] as [number, number, number],
    size: [5.4, 4.2] as [number, number],
    sign: [0, 0.65, -6] as [number, number, number],
  },
  {
    name: "Marketing",
    color: DEPARTMENT_COLORS.Marketing,
    position: [-4.2, 0.02, 1.8] as [number, number, number],
    size: [4.2, 5.2] as [number, number],
    sign: [-6.2, 0.65, 1.8] as [number, number, number],
  },
  {
    name: "Sales",
    color: DEPARTMENT_COLORS.Sales,
    position: [0, 0.02, 2.2] as [number, number, number],
    size: [3.6, 4.6] as [number, number],
    sign: [0, 0.65, 5.1] as [number, number, number],
  },
  {
    name: "Development",
    color: DEPARTMENT_COLORS.Development,
    position: [4.2, 0.02, 1.8] as [number, number, number],
    size: [4.2, 5.2] as [number, number],
    sign: [6.1, 0.65, 1.8] as [number, number, number],
  },
] as const;

const DESK_LAYOUT: Record<string, DeskConfig> = {
  kimberly: { desk: [-1.35, 0, -3.6], walk: [-0.6, 0, -2.55] },
  alex: { desk: [-4.2, 0, 1.1], walk: [-3.15, 0, 0.15] },
  sabri: { desk: [-4.2, 0, 3.2], walk: [-3.15, 0, 4.1] },
  jordan: { desk: [0, 0, 2.2], walk: [1.0, 0, 2.9] },
  kevin: { desk: [4.2, 0, 2.2], walk: [3.15, 0, 1.25] },
};

const MONITOR_ACCENTS: Record<string, string> = {
  kimberly: "#2093FF",
  alex: "#F93C3C",
  sabri: "#F93C3C",
  jordan: "#22C55E",
  kevin: "#FFBD59",
};

function GridFloor() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color="#11131b" />
      </mesh>
      <gridHelper args={[22, 32, "#1e3a5f", "#161c29"]} position={[0, 0.001, 0]} />
    </group>
  );
}

function DepartmentZones() {
  return (
    <Fragment>
      {DEPARTMENT_ZONES.map((zone) => (
        <group key={zone.name}>
          <mesh rotation-x={-Math.PI / 2} position={zone.position} receiveShadow>
            <planeGeometry args={zone.size} />
            <meshStandardMaterial
              color={zone.color}
              transparent
              opacity={0.1}
              emissive={zone.color}
              emissiveIntensity={0.08}
            />
          </mesh>

          <group position={zone.sign}>
            <RoundedBox args={[1.8, 0.3, 0.12]} radius={0.04} smoothness={4} castShadow>
              <meshStandardMaterial color="#151925" metalness={0.2} roughness={0.6} />
            </RoundedBox>
            <Html center distanceFactor={10} transform>
              <div
                className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-xl"
                style={{ background: `${zone.color}22`, boxShadow: `0 0 24px ${zone.color}22` }}
              >
                {zone.name}
              </div>
            </Html>
          </group>
        </group>
      ))}
    </Fragment>
  );
}

function Desk({
  position,
  accent,
  isSelected,
}: {
  position: [number, number, number];
  accent: string;
  isSelected: boolean;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.12, 1.0]} />
        <meshStandardMaterial color="#4a2f24" roughness={0.82} metalness={0.08} />
      </mesh>

      {[
        [-0.72, 0.34, -0.38],
        [0.72, 0.34, -0.38],
        [-0.72, 0.34, 0.38],
        [0.72, 0.34, 0.38],
      ].map((leg, index) => (
        <mesh key={index} position={leg as [number, number, number]} castShadow>
          <boxGeometry args={[0.1, 0.68, 0.1]} />
          <meshStandardMaterial color="#2a1b14" roughness={0.85} />
        </mesh>
      ))}

      <mesh position={[0, 1.08, -0.22]} castShadow>
        <boxGeometry args={[0.7, 0.46, 0.06]} />
        <meshStandardMaterial
          color="#90c7ff"
          emissive={accent}
          emissiveIntensity={isSelected ? 1.1 : 0.7}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, 0.82, -0.18]} castShadow>
        <boxGeometry args={[0.12, 0.22, 0.12]} />
        <meshStandardMaterial color="#2e3440" roughness={0.8} />
      </mesh>

      <mesh position={[0, 0.38, 0.88]} castShadow receiveShadow>
        <boxGeometry args={[0.75, 0.1, 0.75]} />
        <meshStandardMaterial color="#1b202c" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.17, 0.88]} castShadow>
        <boxGeometry args={[0.18, 0.34, 0.18]} />
        <meshStandardMaterial color="#151925" roughness={0.8} />
      </mesh>

      {isSelected ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
          <ringGeometry args={[1.1, 1.25, 48]} />
          <meshBasicMaterial color={accent} transparent opacity={0.5} />
        </mesh>
      ) : null}
    </group>
  );
}

function AgentCharacter({
  agent,
  deskPosition,
  walkPosition,
  selected,
  onSelect,
}: {
  agent: AgentRecord;
  deskPosition: [number, number, number];
  walkPosition: [number, number, number];
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const positionRef = useRef(new THREE.Vector3(...deskPosition));
  const targetRef = useRef(new THREE.Vector3(...deskPosition));
  const color = DEPARTMENT_COLORS[agent.department as keyof typeof DEPARTMENT_COLORS];

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const elapsed = state.clock.getElapsedTime() + deskPosition[0] * 0.2;
    const bob = Math.sin(elapsed * 1.8) * 0.02;
    const cycle = elapsed % 14;
    const movingOut = cycle > 5 && cycle <= 8;
    const movingBack = cycle > 8 && cycle <= 11;
    const nextTarget = movingOut
      ? walkPosition
      : movingBack
        ? deskPosition
        : cycle <= 5
          ? deskPosition
          : walkPosition;

    targetRef.current.set(...nextTarget);
    positionRef.current.lerp(targetRef.current, 0.04);

    group.position.set(positionRef.current.x, bob, positionRef.current.z);

    const dx = targetRef.current.x - positionRef.current.x;
    const dz = targetRef.current.z - positionRef.current.z;
    if (Math.abs(dx) > 0.02 || Math.abs(dz) > 0.02) {
      group.rotation.y = Math.atan2(dx, dz);
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(agent.id);
      }}
    >
      <group position={[0, 0.95, 0.36]}>
        <mesh position={[0, 0.8, 0]} castShadow>
          <boxGeometry args={[0.34, 0.34, 0.34]} />
          <meshStandardMaterial color="#f1c8a7" roughness={0.95} />
        </mesh>

        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.46, 0.56, 0.26]} />
          <meshStandardMaterial color={color} roughness={0.75} metalness={0.1} />
        </mesh>

        <mesh position={[-0.32, 0.42, 0]} castShadow rotation-z={Math.sin(deskPosition[0]) * 0.15}>
          <boxGeometry args={[0.13, 0.48, 0.13]} />
          <meshStandardMaterial color={color} roughness={0.78} />
        </mesh>
        <mesh position={[0.32, 0.42, 0]} castShadow rotation-z={-Math.sin(deskPosition[0]) * 0.15}>
          <boxGeometry args={[0.13, 0.48, 0.13]} />
          <meshStandardMaterial color={color} roughness={0.78} />
        </mesh>

        <mesh position={[-0.13, -0.04, 0]} castShadow>
          <boxGeometry args={[0.14, 0.54, 0.14]} />
          <meshStandardMaterial color="#d6dde8" roughness={0.88} />
        </mesh>
        <mesh position={[0.13, -0.04, 0]} castShadow>
          <boxGeometry args={[0.14, 0.54, 0.14]} />
          <meshStandardMaterial color="#d6dde8" roughness={0.88} />
        </mesh>
      </group>

      {selected ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0.34]}>
          <ringGeometry args={[0.38, 0.48, 40]} />
          <meshBasicMaterial color={color} transparent opacity={0.72} />
        </mesh>
      ) : null}

      <Html position={[0, 2.35, 0.34]} center distanceFactor={9} transform occlude>
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(17,20,31,0.88),rgba(10,10,15,0.94))] px-3 py-2 text-center text-white shadow-[0_14px_35px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="text-[12px] font-semibold leading-none">{agent.name}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">{agent.role}</div>
        </div>
      </Html>
    </group>
  );
}

function OfficeContent({ agents, selectedId, onSelect }: OfficeSceneProps) {
  return (
    <>
      <color attach="background" args={["#0a0a0f"]} />

      <ambientLight intensity={0.85} color="#dce6ff" />
      <directionalLight
        castShadow
        intensity={1.45}
        color="#d4e7ff"
        position={[8, 14, 10]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <directionalLight intensity={0.35} color="#2093FF" position={[-12, 8, -10]} />

      <OrthographicCamera makeDefault position={[9, 9, 9]} zoom={62} near={0.1} far={100} />
      <OrbitControls
        enablePan={false}
        minZoom={48}
        maxZoom={88}
        minPolarAngle={0.6}
        maxPolarAngle={1.15}
        target={[0, 1.1, 0]}
      />

      <GridFloor />
      <DepartmentZones />

      {agents.map((agent) => {
        const config = DESK_LAYOUT[agent.id];
        const accent = MONITOR_ACCENTS[agent.id] ?? "#2093FF";
        return (
          <Fragment key={agent.id}>
            <Desk position={config.desk} accent={accent} isSelected={selectedId === agent.id} />
            <AgentCharacter
              agent={agent}
              deskPosition={config.desk}
              walkPosition={config.walk}
              selected={selectedId === agent.id}
              onSelect={onSelect}
            />
          </Fragment>
        );
      })}
    </>
  );
}

export function OfficeScene(props: OfficeSceneProps) {
  const agents = useMemo(
    () => props.agents.filter((agent) => agent.id in DESK_LAYOUT),
    [props.agents],
  );

  return (
    <div className="h-[680px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0f]">
      <Canvas shadows dpr={[1, 1.75]} onPointerMissed={() => props.onSelect(null)}>
        <OfficeContent {...props} agents={agents} />
      </Canvas>
    </div>
  );
}
