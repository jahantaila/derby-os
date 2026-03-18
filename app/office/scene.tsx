"use client";

import { Fragment, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import type { AgentRecord } from "@/lib/agents-data";

type OfficeSceneProps = {
  agents: AgentRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

type DepartmentName = "Executive" | "Marketing" | "Sales" | "Development";

const DEPARTMENT_COLORS: Record<DepartmentName, string> = {
  Executive: "#2093FF",
  Marketing: "#F93C3C",
  Sales: "#22C55E",
  Development: "#FFBD59",
};

const DESK_LAYOUT: Record<
  string,
  {
    desk: [number, number, number];
    agent: [number, number, number];
    rotation: number;
  }
> = {
  kimberly: { desk: [-4.8, 0, -2.6], agent: [-4.8, 0, -1.55], rotation: Math.PI },
  alex: { desk: [-4.8, 0, 1.3], agent: [-4.8, 0, 2.35], rotation: Math.PI },
  sabri: { desk: [-1.9, 0, 1.3], agent: [-1.9, 0, 2.35], rotation: Math.PI },
  jordan: { desk: [2.2, 0, -0.4], agent: [2.2, 0, 0.65], rotation: Math.PI },
  kevin: { desk: [5.0, 0, 1.8], agent: [5.0, 0, 2.85], rotation: Math.PI },
};

const DEPARTMENT_ZONES: Array<{
  name: DepartmentName;
  color: string;
  size: [number, number];
  position: [number, number, number];
  label: [number, number, number];
}> = [
  {
    name: "Executive",
    color: DEPARTMENT_COLORS.Executive,
    size: [3.2, 3.1],
    position: [-4.8, 0.01, -2.6],
    label: [-4.8, 0.7, -4.35],
  },
  {
    name: "Marketing",
    color: DEPARTMENT_COLORS.Marketing,
    size: [6.0, 4.2],
    position: [-3.35, 0.01, 1.3],
    label: [-3.35, 0.7, -1.1],
  },
  {
    name: "Sales",
    color: DEPARTMENT_COLORS.Sales,
    size: [3.1, 3.6],
    position: [2.2, 0.01, -0.4],
    label: [2.2, 0.7, -2.4],
  },
  {
    name: "Development",
    color: DEPARTMENT_COLORS.Development,
    size: [3.3, 3.8],
    position: [5.0, 0.01, 1.8],
    label: [5.0, 0.7, -0.5],
  },
];

function getDepartmentColor(department: AgentRecord["department"]) {
  if (department === "Executive") return DEPARTMENT_COLORS.Executive;
  if (department === "Marketing") return DEPARTMENT_COLORS.Marketing;
  if (department === "Sales") return DEPARTMENT_COLORS.Sales;
  return DEPARTMENT_COLORS.Development;
}

function GridFloor() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#0f1118" />
      </mesh>
      <gridHelper args={[24, 32, "#1b2433", "#151b27"]} position={[0, 0.001, 0]} />
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
              opacity={0.12}
              emissive={zone.color}
              emissiveIntensity={0.1}
            />
          </mesh>

          <group position={zone.label}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[2.4, 0.18, 0.4]} />
              <meshStandardMaterial color="#171c28" roughness={0.85} metalness={0.1} />
            </mesh>
            <Html center transform distanceFactor={10}>
              <div
                className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white"
                style={{ backgroundColor: `${zone.color}22` }}
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
  rotation,
  accent,
  selected,
}: {
  position: [number, number, number];
  rotation: number;
  accent: string;
  selected: boolean;
}) {
  return (
    <group position={position} rotation-y={rotation}>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.12, 1.0]} />
        <meshStandardMaterial color="#4a3127" roughness={0.8} />
      </mesh>

      {[
        [-0.78, 0.36, -0.4],
        [0.78, 0.36, -0.4],
        [-0.78, 0.36, 0.4],
        [0.78, 0.36, 0.4],
      ].map((leg, index) => (
        <mesh key={index} position={leg as [number, number, number]} castShadow>
          <boxGeometry args={[0.09, 0.72, 0.09]} />
          <meshStandardMaterial color="#261913" roughness={0.9} />
        </mesh>
      ))}

      <mesh position={[0, 1.08, -0.22]} castShadow>
        <boxGeometry args={[0.76, 0.45, 0.06]} />
        <meshStandardMaterial
          color="#9fd2ff"
          emissive={accent}
          emissiveIntensity={selected ? 1.1 : 0.7}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, 0.85, -0.18]} castShadow>
        <boxGeometry args={[0.12, 0.24, 0.12]} />
        <meshStandardMaterial color="#293242" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0.42, 0.82]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.1, 0.8]} />
        <meshStandardMaterial color="#181e2b" roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.18, 0.82]} castShadow>
        <boxGeometry args={[0.18, 0.36, 0.18]} />
        <meshStandardMaterial color="#111621" roughness={0.85} />
      </mesh>

      {selected ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.05, 1.22, 40]} />
          <meshBasicMaterial color={accent} transparent opacity={0.5} />
        </mesh>
      ) : null}
    </group>
  );
}

function AgentCharacter({
  agent,
  position,
  selected,
  onSelect,
}: {
  agent: AgentRecord;
  position: [number, number, number];
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const color = getDepartmentColor(agent.department);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;

    const bob = Math.sin(clock.getElapsedTime() * 1.8 + position[0]) * 0.02;
    group.position.y = bob;
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(agent.id);
      }}
    >
      <mesh position={[0, 1.74, 0]} castShadow>
        <boxGeometry args={[0.34, 0.34, 0.34]} />
        <meshStandardMaterial color="#e7bf9d" roughness={0.95} />
      </mesh>

      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[0.5, 0.62, 0.28]} />
        <meshStandardMaterial color={color} roughness={0.76} metalness={0.08} />
      </mesh>

      <mesh position={[-0.34, 1.3, 0]} castShadow rotation-z={0.18}>
        <boxGeometry args={[0.14, 0.54, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[0.34, 1.3, 0]} castShadow rotation-z={-0.18}>
        <boxGeometry args={[0.14, 0.54, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>

      <mesh position={[-0.13, 0.82, 0]} castShadow>
        <boxGeometry args={[0.15, 0.62, 0.15]} />
        <meshStandardMaterial color="#d9dfeb" roughness={0.88} />
      </mesh>
      <mesh position={[0.13, 0.82, 0]} castShadow>
        <boxGeometry args={[0.15, 0.62, 0.15]} />
        <meshStandardMaterial color="#d9dfeb" roughness={0.88} />
      </mesh>

      {selected ? (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.36, 0.48, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.78} />
        </mesh>
      ) : null}

      <Html position={[0, 2.32, 0]} center transform distanceFactor={10}>
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,31,0.9),rgba(10,10,15,0.94))] px-3 py-2 text-center text-white shadow-[0_14px_35px_rgba(0,0,0,0.4)]">
          <div className="text-[12px] font-semibold leading-none">{agent.name}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
            {agent.role}
          </div>
        </div>
      </Html>
    </group>
  );
}

function SceneContents({ agents, selectedId, onSelect }: OfficeSceneProps) {
  return (
    <>
      <color attach="background" args={["#0a0a0f"]} />

      <ambientLight intensity={0.85} color="#dfe8ff" />
      <directionalLight
        castShadow
        intensity={1.4}
        color="#d9ebff"
        position={[8, 12, 8]}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight intensity={0.35} color="#2093FF" position={[-10, 6, -6]} />

      <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={58} near={0.1} far={100} />
      <OrbitControls
        enablePan={false}
        minZoom={48}
        maxZoom={80}
        minPolarAngle={0.7}
        maxPolarAngle={1.05}
        target={[0, 1.2, 0]}
      />

      <GridFloor />
      <DepartmentZones />

      {agents.map((agent) => {
        const layout = DESK_LAYOUT[agent.id];
        if (!layout) return null;

        const color = getDepartmentColor(agent.department);

        return (
          <Fragment key={agent.id}>
            <Desk
              position={layout.desk}
              rotation={layout.rotation}
              accent={color}
              selected={selectedId === agent.id}
            />
            <AgentCharacter
              agent={agent}
              position={layout.agent}
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
  return (
    <div className="h-[720px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0f]">
      <Canvas
        shadows
        dpr={[1, 2]}
        onPointerMissed={() => props.onSelect(null)}
        gl={{ antialias: true }}
      >
        <SceneContents {...props} />
      </Canvas>
    </div>
  );
}
