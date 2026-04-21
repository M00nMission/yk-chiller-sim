import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useState, useRef, useEffect, useLayoutEffect, type MutableRefObject } from 'react';
import { useGLTF, Text, OrbitControls, PointerLockControls, Html, Sky, Cloud, Clouds } from '@react-three/drei';
import * as THREE from 'three';
import { Scene, CHILLER_ORBIT_TARGET, DEFAULT_SIM_CAMERA_POSITION, SUN_POSITION } from './components/canvas/Scene';
import { InspectRaycaster } from './components/canvas/InspectRaycaster';
import { TechnicianController } from './components/canvas/TechnicianController';
import { CxAlloyWidget, CxAlloyHtmlMaximized } from './components/ui/CxAlloyPanel';
import { ControlPanelUI } from './components/ui/ControlPanelUI';
import { LADDER, ROOF_WALK_Y } from './world/walkModeWorld';
import { HMIPanel } from './components/ui/HMIPanel';
import {
  PressureGauge,
  TemperatureGauge,
  GateValve,
  GlobeValve,
  ButterflyValve,
  MotorizedValve,
  CheckValve,
  YStrainer,
  DrainValve,
  AirVent,
  FlexConnector,
  TestPort,
  FlangedConnection,
  FLANGE_OUTSET,
} from './components/canvas/PipingAccessories';
import { Vfd, VfdWiring } from './components/canvas/Vfd';
import { PidPlantSystems, type PidPlantSystemsProps } from './components/canvas/PidPlantSystems';
import { PipeFlowMarkers } from './components/canvas/PipeFlowMarkers';
import { useCdwLoopFlowing, useChwLoopFlowing } from './hooks/useLoopFlow';
import { EndSuctionHvacPump } from './components/canvas/IndustrialCentrifugalPump';
import {
  MervFilterBank,
  ChwCopperCoil,
  HousedCentrifugalBlower,
  ServiceDisconnect,
  OutsideAirDamper,
  AhuGlbPreview,
  HotWaterHeatingCoil,
  ReturnAirDamper,
  SteamHumidifier,
  RotaryEnergyWheel,
  PreFilterBank,
} from './components/canvas/AhuComponents';
import { useSimulationStore } from './store/useSimulationStore';
import { useGarageDoorStore } from './store/useGarageDoorStore';
import { useChillerColorStore } from './store/useChillerColorStore';
import { simulationEngine } from './simulation/SimulationEngine';

/**
 * Wraparound ANSI/ASME A13.1-style pipe identification label.
 *
 * Renders a colored sleeve that wraps fully around the pipe (the "vinyl band"),
 * with bold white service-name text on the camera-facing (+Z) side and a
 * triangular flow direction arrow.
 *
 * Assumes the pipe axis is horizontal (along world X) and the camera looks from +Z.
 */
function PipeLabel({
  position,
  axisAlong,
  pipeRadius,
  bgColor,
  text,
  flowSign,
  width = 2.4,
}: {
  position: [number, number, number];
  axisAlong: 'x' | 'y' | 'z';
  pipeRadius: number;
  bgColor: string;
  text: string;
  flowSign: 1 | -1;
  width?: number;
}) {
  /* Sleeve sits a hair outside the pipe insulation to avoid z-fighting */
  const sleeveRadius = pipeRadius + 0.012;
  const faceOffset = sleeveRadius + 0.006;

  /* Default cylinder axis is +Y. Rotate to align with chosen world axis.
     'y' → no rotation needed (cylinder already vertical). */
  const sleeveRot: [number, number, number] =
    axisAlong === 'x' ? [0, 0, Math.PI / 2]
    : axisAlong === 'z' ? [Math.PI / 2, 0, 0]
    : [0, 0, 0];

  /* Visible label "face" height — the colored band on the front of the pipe */
  const faceHeight = pipeRadius * 1.55;
  const fontSize = faceHeight * 0.42;
  const arrowSize = faceHeight * 0.55;
  const textWidth = width - arrowSize * 2.4;

  /* For 'y' axis (vertical pipes) the sleeve bands shift in Y and the text
     faces the camera on the +Z face, arrow points up/down along Y. */
  const isY = axisAlong === 'y';

  return (
    <group position={position}>
      {/* Wraparound colored sleeve (open cylinder shell) */}
      <mesh rotation={sleeveRot}>
        <cylinderGeometry args={[sleeveRadius, sleeveRadius, width, 32, 1, true]} />
        <meshStandardMaterial
          color={bgColor}
          roughness={0.55}
          metalness={0.05}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>

      {/* Thin black borders top/bottom of the band for the printed-edge look */}
      <mesh rotation={sleeveRot} position={[0, isY ? 0 : 0, 0]}>
        <cylinderGeometry args={[sleeveRadius + 0.002, sleeveRadius + 0.002, 0.02, 24, 1, true]} />
        <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
      </mesh>
      <mesh
        rotation={sleeveRot}
        position={
          axisAlong === 'x' ? [width / 2 - 0.01, 0, 0]
          : axisAlong === 'z' ? [0, 0, width / 2 - 0.01]
          : [0, width / 2 - 0.01, 0]
        }
      >
        <cylinderGeometry args={[sleeveRadius + 0.002, sleeveRadius + 0.002, 0.02, 24, 1, true]} />
        <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
      </mesh>
      <mesh
        rotation={sleeveRot}
        position={
          axisAlong === 'x' ? [-width / 2 + 0.01, 0, 0]
          : axisAlong === 'z' ? [0, 0, -width / 2 + 0.01]
          : [0, -width / 2 + 0.01, 0]
        }
      >
        <cylinderGeometry args={[sleeveRadius + 0.002, sleeveRadius + 0.002, 0.02, 24, 1, true]} />
        <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
      </mesh>

      {/* Service-name text on the camera-facing side (+Z) */}
      <Text
        position={
          axisAlong === 'x'
            ? [-flowSign * arrowSize * 0.4, 0, faceOffset]
            : axisAlong === 'z'
            ? [faceOffset, 0, -flowSign * arrowSize * 0.4]
            : [0, -flowSign * arrowSize * 0.4, faceOffset]
        }
        rotation={
          axisAlong === 'x' ? [0, 0, 0]
          : axisAlong === 'z' ? [0, Math.PI / 2, 0]
          : [0, 0, 0]
        }
        fontSize={fontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={textWidth}
        fontWeight={700}
        letterSpacing={0.02}
        outlineWidth={fontSize * 0.04}
        outlineColor="#000000"
        renderOrder={2}
      >
        {text}
      </Text>

      {/* Triangular flow-direction arrow at the leading edge of the label */}
      {axisAlong === 'x' ? (
        <mesh
          position={[flowSign * (width / 2 - arrowSize * 0.7), 0, faceOffset]}
          rotation={[Math.PI / 2, 0, flowSign > 0 ? -Math.PI / 2 : Math.PI / 2]}
          renderOrder={2}
        >
          <coneGeometry args={[arrowSize * 0.55, arrowSize, 3]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
        </mesh>
      ) : axisAlong === 'z' ? (
        <mesh
          position={[faceOffset, 0, flowSign * (width / 2 - arrowSize * 0.7)]}
          rotation={[flowSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0]}
          renderOrder={2}
        >
          <coneGeometry args={[arrowSize * 0.55, arrowSize, 3]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
        </mesh>
      ) : (
        /* 'y' — vertical pipe: arrow points up (+Y) or down (-Y) */
        <mesh
          position={[0, flowSign * (width / 2 - arrowSize * 0.7), faceOffset]}
          rotation={[flowSign > 0 ? 0 : Math.PI, 0, 0]}
          renderOrder={2}
        >
          <coneGeometry args={[arrowSize * 0.55, arrowSize, 3]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
        </mesh>
      )}
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   COOLING TOWER SPRAY ANIMATION
   Simulates water nozzles misting downward through the fill pack while the
   induced-draft fan draws air upward from the louver inlets to the stack.
   Each droplet starts at a random nozzle position near the distribution
   header (y ≈ CASING_TOP + 0.15) and falls through the fill zone, resetting
   to the top when it reaches the basin surface. Only visible when flowing.
   ───────────────────────────────────────────────────────────────────────── */
function CoolingTowerSpray({
  flowing,
  W,
  D,
  casingTop,
  basinTop,
}: {
  flowing: boolean;
  W: number;
  D: number;
  casingTop: number;
  basinTop: number;
}) {
  const COUNT = 80;
  const FALL_SPEED = 0.9; // m/s fall rate (slowed to show misting)
  const SPRAY_Y_START = casingTop + 0.12;
  const SPRAY_Y_END   = basinTop  - 0.05;
  const FALL_RANGE    = SPRAY_Y_START - SPRAY_Y_END;

  // Phase offsets — random per-drop start position in the fall cycle.
  // useMemo with [] gives a stable array that is only computed once.
  const phaseRef  = useRef(
    (() => { const a = new Float32Array(COUNT); for (let i = 0; i < COUNT; i++) a[i] = Math.random(); return a; })()
  );
  const positionsRef = useRef(new Float32Array(COUNT * 3));
  const sizesRef     = useRef(new Float32Array(COUNT));

  // Pre-generate random X/Z scatter positions within the fill footprint
  const xzRef = useRef(
    (() => {
      const a = new Float32Array(COUNT * 2);
      for (let i = 0; i < COUNT; i++) {
        a[i * 2    ] = (Math.random() - 0.5) * (W - 0.50);
        a[i * 2 + 1] = (Math.random() - 0.5) * (D - 0.50);
      }
      return a;
    })()
  );

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((_, dt) => {
    if (!flowing) return;
    const ph  = phaseRef.current;
    const xz  = xzRef.current;
    const pos = positionsRef.current;
    const siz = sizesRef.current;
    for (let i = 0; i < COUNT; i++) {
      ph[i] = (ph[i] + (dt * FALL_SPEED) / FALL_RANGE) % 1.0;
      pos[i * 3    ] = xz[i * 2    ];
      pos[i * 3 + 1] = SPRAY_Y_START - ph[i] * FALL_RANGE;
      pos[i * 3 + 2] = xz[i * 2 + 1];
      // Drops grow slightly as they fall and break up
      siz[i] = 0.04 + ph[i] * 0.06;
    }
    if (pointsRef.current) {
      const geom = pointsRef.current.geometry;
      const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
      const sizeAttr = geom.getAttribute('size') as THREE.BufferAttribute;
      posAttr.array.set(pos);
      sizeAttr.array.set(siz);
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }
  });

  if (!flowing) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionsRef.current, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizesRef.current, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#7ec8e8"
        size={0.12}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
      />
    </points>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROOFTOP COOLING TOWER
   Rectangular packaged induced-draft counterflow cooling tower
   (BAC / Marley / Evapco style). Local +Y is up; origin sits at the
   approximate vertical mid-point of the casing (matches the legacy
   placement so the existing condenser-water risers still meet the unit).

   Local layout (Y):
     -2.50 .. -1.70  cold-water basin (steel pan)
     -1.70 .. +1.40  louvered air inlet section + internal fill
     +1.40 .. +1.55  drift eliminator pack
     +1.55 .. +2.30  hot-water distribution box (solid casing)
     +2.30 .. +2.42  fan deck
     +2.42 .. +3.45  fan stack (venturi inlet + cylinder)
   Footprint: 4.0 (X) × 3.6 (Z).
   Supply (hot CWS) enters from TOP through fan deck into distribution header.
   Return (cold CWR) exits from BASIN BOTTOM on −X face.
   ───────────────────────────────────────────────────────────────────────── */
function RooftopCoolingTower({ position, flowing }: { position: [number, number, number]; flowing?: boolean }) {
  const fanRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (fanRef.current) fanRef.current.rotation.y += dt * 4.2;
  });

  const W = 4.0;
  const D = 3.6;
  const BASIN_BOT = -2.50;
  const BASIN_TOP = -1.70;
  const LOUVER_BOT = -1.70;
  const LOUVER_TOP = +1.40;
  const DRIFT_TOP = +1.55;
  const CASING_TOP = +2.30;
  const FAN_DECK_TOP = +2.42;
  const STACK_TOP = +3.45;

  const galvLight = '#b3b8be';
  const galvMid   = '#9097a0';
  const galvDark  = '#6c727a';
  const struct    = '#3c4046';
  const louver    = '#5a6168';
  const drift     = '#d2cdb4';
  const fillMat   = '#3a5a48';
  const water     = '#3d6f86';
  const safetyYel = '#d8a722';
  const motorBlk  = '#262626';
  const bladeMat  = '#cfd2d6';
  const concrete  = '#9a958e';

  return (
    <group position={position}>
      {/* ─── HOUSEKEEPING PAD ─── */}
      <mesh position={[0, BASIN_BOT - 0.13, 0]} receiveShadow castShadow>
        <boxGeometry args={[W + 0.7, 0.22, D + 0.7]} />
        <meshStandardMaterial color={concrete} roughness={0.95} metalness={0.02} />
      </mesh>

      {/* ─── STRUCTURAL I-BEAM SUPPORTS (under basin) ─── */}
      {[-(W / 2) + 0.35, 0, (W / 2) - 0.35].map((bx, bi) => (
        <group key={`isup-${bi}`} position={[bx, BASIN_BOT - 0.18, 0]}>
          <mesh>
            <boxGeometry args={[0.04, 0.32, D + 0.4]} />
            <meshStandardMaterial color={struct} roughness={0.7} metalness={0.55} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[0.22, 0.05, D + 0.4]} />
            <meshStandardMaterial color={struct} roughness={0.7} metalness={0.55} />
          </mesh>
          <mesh position={[0, -0.14, 0]}>
            <boxGeometry args={[0.22, 0.05, D + 0.4]} />
            <meshStandardMaterial color={struct} roughness={0.7} metalness={0.55} />
          </mesh>
        </group>
      ))}

      {/* ─── COLD WATER BASIN (welded steel pan) ─── */}
      <mesh position={[0, (BASIN_BOT + BASIN_TOP) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, BASIN_TOP - BASIN_BOT, D]} />
        <meshStandardMaterial color={galvMid} roughness={0.55} metalness={0.6} />
      </mesh>
      <mesh position={[0, BASIN_TOP + 0.02, 0]}>
        <boxGeometry args={[W + 0.04, 0.06, D + 0.04]} />
        <meshStandardMaterial color={galvDark} roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, BASIN_TOP - 0.06, 0]}>
        <boxGeometry args={[W - 0.18, 0.02, D - 0.18]} />
        <meshStandardMaterial color={water} roughness={0.18} metalness={0.25} transparent opacity={0.92} />
      </mesh>
      <mesh position={[W / 2 - 0.6, BASIN_BOT + 0.18, D / 2 + 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.18, 12]} />
        <meshStandardMaterial color={galvDark} roughness={0.45} metalness={0.75} />
      </mesh>
      <mesh position={[W / 2 - 0.6, BASIN_BOT + 0.18, D / 2 + 0.16]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.04, 12]} />
        <meshStandardMaterial color={galvDark} roughness={0.45} metalness={0.8} />
      </mesh>
      <mesh position={[-(W / 2) + 0.7, BASIN_TOP - 0.12, -(D / 2) - 0.06]}>
        <boxGeometry args={[0.32, 0.32, 0.16]} />
        <meshStandardMaterial color={galvLight} roughness={0.55} metalness={0.55} />
      </mesh>

      {/* ─── INTERNAL PVC FILL (dimly visible behind louvers) ─── */}
      <mesh position={[0, (LOUVER_BOT + LOUVER_TOP) / 2 - 0.1, 0]}>
        <boxGeometry args={[W - 0.30, LOUVER_TOP - LOUVER_BOT - 0.6, D - 0.30]} />
        <meshStandardMaterial color={fillMat} roughness={0.95} metalness={0.0} />
      </mesh>

      {/* ─── SOLID END CASING PANELS (±Z faces) ─── */}
      {([-1, 1] as const).map((sz) => (
        <group key={`endwall-${sz}`}>
          <mesh position={[0, (LOUVER_BOT + CASING_TOP) / 2, sz * (D / 2)]} castShadow>
            <boxGeometry args={[W, CASING_TOP - LOUVER_BOT, 0.05]} />
            <meshStandardMaterial color={galvLight} roughness={0.55} metalness={0.55} />
          </mesh>
          {[-1.2, -0.4, 0.4, 1.2].map((rx, ri) => (
            <mesh key={`seam-${sz}-${ri}`} position={[rx, (LOUVER_BOT + CASING_TOP) / 2, sz * (D / 2 + 0.025)]}>
              <boxGeometry args={[0.04, CASING_TOP - LOUVER_BOT - 0.1, 0.025]} />
              <meshStandardMaterial color={galvDark} roughness={0.6} metalness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ─── LOUVERED AIR INLETS (±X faces) ─── */}
      {([-1, 1] as const).map((sx) => {
        const slats: React.ReactElement[] = [];
        const SLAT_COUNT = 13;
        const span = LOUVER_TOP - LOUVER_BOT - 0.2;
        for (let k = 0; k < SLAT_COUNT; k++) {
          const ly = LOUVER_BOT + 0.1 + (k / (SLAT_COUNT - 1)) * span;
          slats.push(
            <mesh
              key={`slat-${sx}-${k}`}
              position={[sx * (W / 2 + 0.005), ly, 0]}
              rotation={[Math.PI / 9, 0, 0]}
            >
              <boxGeometry args={[0.05, 0.20, D - 0.18]} />
              <meshStandardMaterial color={louver} roughness={0.7} metalness={0.4} />
            </mesh>,
          );
        }
        return (
          <group key={`louver-side-${sx}`}>
            <mesh position={[sx * (W / 2 + 0.005), LOUVER_BOT + 0.04, 0]}>
              <boxGeometry args={[0.08, 0.10, D - 0.06]} />
              <meshStandardMaterial color={struct} roughness={0.7} metalness={0.55} />
            </mesh>
            <mesh position={[sx * (W / 2 + 0.005), LOUVER_TOP - 0.04, 0]}>
              <boxGeometry args={[0.08, 0.10, D - 0.06]} />
              <meshStandardMaterial color={struct} roughness={0.7} metalness={0.55} />
            </mesh>
            <mesh position={[sx * (W / 2 + 0.005), (LOUVER_BOT + LOUVER_TOP) / 2, (D / 2) - 0.04]}>
              <boxGeometry args={[0.08, LOUVER_TOP - LOUVER_BOT - 0.1, 0.08]} />
              <meshStandardMaterial color={struct} roughness={0.7} metalness={0.55} />
            </mesh>
            <mesh position={[sx * (W / 2 + 0.005), (LOUVER_BOT + LOUVER_TOP) / 2, -(D / 2) + 0.04]}>
              <boxGeometry args={[0.08, LOUVER_TOP - LOUVER_BOT - 0.1, 0.08]} />
              <meshStandardMaterial color={struct} roughness={0.7} metalness={0.55} />
            </mesh>
            {slats}
          </group>
        );
      })}

      {/* ─── DRIFT ELIMINATOR PANEL ─── */}
      <mesh position={[0, (LOUVER_TOP + DRIFT_TOP) / 2, 0]}>
        <boxGeometry args={[W - 0.16, DRIFT_TOP - LOUVER_TOP, D - 0.16]} />
        <meshStandardMaterial color={drift} roughness={0.95} metalness={0.02} />
      </mesh>

      {/* ─── HOT-WATER DISTRIBUTION BOX (solid casing above drift eliminator) ─── */}
      <mesh position={[0, (DRIFT_TOP + CASING_TOP) / 2, 0]} castShadow>
        <boxGeometry args={[W, CASING_TOP - DRIFT_TOP, D]} />
        <meshStandardMaterial color={galvLight} roughness={0.55} metalness={0.55} />
      </mesh>
      <mesh position={[W / 2 - 0.7, (DRIFT_TOP + CASING_TOP) / 2 + 0.05, D / 2 + 0.03]}>
        <boxGeometry args={[0.55, 0.55, 0.04]} />
        <meshStandardMaterial color={galvMid} roughness={0.5} metalness={0.65} />
      </mesh>
      <mesh position={[W / 2 - 0.55, (DRIFT_TOP + CASING_TOP) / 2 + 0.05, D / 2 + 0.05]}>
        <boxGeometry args={[0.06, 0.06, 0.025]} />
        <meshStandardMaterial color={galvDark} roughness={0.4} metalness={0.85} />
      </mesh>

      {/* ─── CORNER ANGLE-IRON POSTS ─── */}
      {([[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]] as Array<[number, number]>).map(
        ([cx, cz], ci) => (
          <mesh key={`post-${ci}`} position={[cx, (BASIN_TOP + CASING_TOP) / 2, cz]} castShadow>
            <boxGeometry args={[0.10, CASING_TOP - BASIN_TOP, 0.10]} />
            <meshStandardMaterial color={struct} roughness={0.7} metalness={0.6} />
          </mesh>
        ),
      )}
      {[LOUVER_BOT - 0.02, LOUVER_TOP + 0.02, CASING_TOP - 0.04].map((by, bi) => (
        <group key={`band-${bi}`}>
          <mesh position={[0, by, D / 2 + 0.03]}>
            <boxGeometry args={[W + 0.04, 0.10, 0.05]} />
            <meshStandardMaterial color={struct} roughness={0.7} metalness={0.6} />
          </mesh>
          <mesh position={[0, by, -(D / 2) - 0.03]}>
            <boxGeometry args={[W + 0.04, 0.10, 0.05]} />
            <meshStandardMaterial color={struct} roughness={0.7} metalness={0.6} />
          </mesh>
          <mesh position={[W / 2 + 0.03, by, 0]}>
            <boxGeometry args={[0.05, 0.10, D + 0.04]} />
            <meshStandardMaterial color={struct} roughness={0.7} metalness={0.6} />
          </mesh>
          <mesh position={[-(W / 2) - 0.03, by, 0]}>
            <boxGeometry args={[0.05, 0.10, D + 0.04]} />
            <meshStandardMaterial color={struct} roughness={0.7} metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* ─── FAN DECK ─── */}
      <mesh position={[0, (CASING_TOP + FAN_DECK_TOP) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.04, FAN_DECK_TOP - CASING_TOP, D + 0.04]} />
        <meshStandardMaterial color={galvDark} roughness={0.7} metalness={0.55} />
      </mesh>

      {/* ─── FAN STACK (venturi inlet cone + cylinder + lip) ─── */}
      <mesh position={[0, FAN_DECK_TOP + 0.18, 0]}>
        <cylinderGeometry args={[1.30, 1.55, 0.36, 32, 1, true]} />
        <meshStandardMaterial color={galvLight} roughness={0.5} metalness={0.65} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, FAN_DECK_TOP + 0.66, 0]}>
        <cylinderGeometry args={[1.30, 1.30, 0.60, 32, 1, true]} />
        <meshStandardMaterial color={galvLight} roughness={0.5} metalness={0.65} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, STACK_TOP - 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.30, 0.05, 10, 32]} />
        <meshStandardMaterial color={galvDark} roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, FAN_DECK_TOP + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.20, 1.50, 32]} />
        <meshStandardMaterial color={'#1a1c1f'} roughness={0.95} metalness={0.0} side={THREE.DoubleSide} />
      </mesh>

      {/* ─── FAN ASSEMBLY ─── */}
      {[0, Math.PI / 2].map((a, ai) => (
        <mesh key={`xarm-${ai}`} position={[0, FAN_DECK_TOP + 0.55, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[2.55, 0.06, 0.10]} />
          <meshStandardMaterial color={struct} roughness={0.7} metalness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, FAN_DECK_TOP + 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.50, 16]} />
        <meshStandardMaterial color={motorBlk} roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, FAN_DECK_TOP + 0.83, 0]}>
        <sphereGeometry args={[0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={'#1f1f1f'} roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0.34, FAN_DECK_TOP + 0.32, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.45, 8]} />
        <meshStandardMaterial color={'#3c3c3c'} roughness={0.6} metalness={0.6} />
      </mesh>

      {/* Rotating fan (6-blade FRP propeller) */}
      <group ref={fanRef} position={[0, FAN_DECK_TOP + 0.46, 0]}>
        <mesh>
          <cylinderGeometry args={[0.20, 0.20, 0.18, 16]} />
          <meshStandardMaterial color={'#2a2a2a'} roughness={0.4} metalness={0.7} />
        </mesh>
        {Array.from({ length: 6 }).map((_, bi) => {
          const ang = (bi / 6) * Math.PI * 2;
          return (
            <group key={`blade-${bi}`} rotation={[0, ang, 0]}>
              <mesh position={[0.70, 0, 0]} rotation={[0, 0, -0.28]} castShadow>
                <boxGeometry args={[1.10, 0.05, 0.30]} />
                <meshStandardMaterial color={bladeMat} roughness={0.45} metalness={0.55} />
              </mesh>
              <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.07, 0.07, 0.16, 8]} />
                <meshStandardMaterial color={'#3a3a3a'} roughness={0.5} metalness={0.7} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ─── TOP MAINTENANCE PLATFORM (around fan stack, +Z side) ─── */}
      <mesh position={[0, FAN_DECK_TOP + 0.02, D / 2 + 0.45]} castShadow>
        <boxGeometry args={[W + 1.0, 0.05, 0.85]} />
        <meshStandardMaterial color={galvDark} roughness={0.85} metalness={0.4} />
      </mesh>
      {[0.5, 0.95].map((hy, hi) => (
        <group key={`prail-${hi}`}>
          <mesh position={[0, FAN_DECK_TOP + hy, D / 2 + 0.85]}>
            <boxGeometry args={[W + 1.0, 0.05, 0.04]} />
            <meshStandardMaterial color={safetyYel} roughness={0.55} metalness={0.4} />
          </mesh>
          <mesh position={[(W + 1.0) / 2 - 0.02, FAN_DECK_TOP + hy, D / 2 + 0.65]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.45, 0.05, 0.04]} />
            <meshStandardMaterial color={safetyYel} roughness={0.55} metalness={0.4} />
          </mesh>
          <mesh position={[-((W + 1.0) / 2 - 0.02), FAN_DECK_TOP + hy, D / 2 + 0.65]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.45, 0.05, 0.04]} />
            <meshStandardMaterial color={safetyYel} roughness={0.55} metalness={0.4} />
          </mesh>
        </group>
      ))}
      {[-((W + 1.0) / 2 - 0.04), -1.0, 0, 1.0, ((W + 1.0) / 2 - 0.04)].map((px, pi) => (
        <mesh key={`post-rail-${pi}`} position={[px, FAN_DECK_TOP + 0.5, D / 2 + 0.85]}>
          <cylinderGeometry args={[0.025, 0.025, 1.0, 6]} />
          <meshStandardMaterial color={safetyYel} roughness={0.55} metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, FAN_DECK_TOP + 0.12, D / 2 + 0.85]}>
        <boxGeometry args={[W + 1.0, 0.10, 0.025]} />
        <meshStandardMaterial color={'#4a4d52'} roughness={0.85} metalness={0.3} />
      </mesh>

      {/* ─── ACCESS LADDER WITH SAFETY CAGE (on -Z face) ─── */}
      <group position={[W / 2 - 0.4, 0, -(D / 2) - 0.18]}>
        <mesh position={[-0.18, (BASIN_BOT + FAN_DECK_TOP) / 2, 0]}>
          <boxGeometry args={[0.04, FAN_DECK_TOP - BASIN_BOT, 0.04]} />
          <meshStandardMaterial color={'#666'} roughness={0.5} metalness={0.7} />
        </mesh>
        <mesh position={[0.18, (BASIN_BOT + FAN_DECK_TOP) / 2, 0]}>
          <boxGeometry args={[0.04, FAN_DECK_TOP - BASIN_BOT, 0.04]} />
          <meshStandardMaterial color={'#666'} roughness={0.5} metalness={0.7} />
        </mesh>
        {Array.from({ length: 14 }).map((_, ri) => {
          const ry = BASIN_BOT + 0.25 + ri * ((FAN_DECK_TOP - BASIN_BOT - 0.5) / 13);
          return (
            <mesh key={`rung-${ri}`} position={[0, ry, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.022, 0.022, 0.40, 6]} />
              <meshStandardMaterial color={'#777'} roughness={0.5} metalness={0.75} />
            </mesh>
          );
        })}
        {Array.from({ length: 6 }).map((_, hi) => {
          const hy = -1.0 + hi * 0.55;
          return (
            <mesh key={`cage-hoop-${hi}`} position={[0, hy, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.32, 0.018, 6, 16, Math.PI]} />
              <meshStandardMaterial color={safetyYel} roughness={0.55} metalness={0.4} />
            </mesh>
          );
        })}
        {[-0.30, -0.18, 0, 0.18, 0.30].map((cx, ci) => (
          <mesh key={`cage-bar-${ci}`} position={[cx, (-1.0 + 1.75) / 2, -Math.sqrt(Math.max(0, 0.32 * 0.32 - cx * cx))]}>
            <boxGeometry args={[0.025, 2.75, 0.025]} />
            <meshStandardMaterial color={safetyYel} roughness={0.55} metalness={0.4} />
          </mesh>
        ))}
      </group>

      {/* ─── SUPPLY INLET FLANGE (TOP) ──────────────────────────────────
         Hot condenser water enters the tower from the TOP through the
         fan deck into the hot-water distribution header. The supply
         pipe comes vertically down through the fan deck, centred in Z
         but offset in X so it clears the fan shaft. This is the correct
         counterflow path: hot water distributes across the top and falls
         down through fill as air is drawn upward by the fan. */}
      {/* Vertical inlet pipe stub through fan deck — supply (green) */}
      <mesh position={[-(W / 4), FAN_DECK_TOP + 0.30, -0.575]}>
        <cylinderGeometry args={[0.30, 0.30, 0.65, 16]} />
        <meshStandardMaterial color={'#1d7a3a'} roughness={0.55} metalness={0.45} />
      </mesh>
      {/* Companion flange at deck penetration */}
      <mesh position={[-(W / 4), FAN_DECK_TOP + 0.06, -0.575]}>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 16]} />
        <meshStandardMaterial color={'#b07030'} roughness={0.25} metalness={0.95} />
      </mesh>
      {Array.from({ length: 8 }).map((_, fi) => {
        const a = (fi / 8) * Math.PI * 2;
        return (
          <mesh
            key={`bolt-sup-${fi}`}
            position={[-(W / 4) + Math.cos(a) * 0.36, FAN_DECK_TOP + 0.055, -0.575 + Math.sin(a) * 0.36]}
          >
            <cylinderGeometry args={[0.025, 0.025, 0.05, 6]} />
            <meshStandardMaterial color={'#222'} roughness={0.5} metalness={0.8} />
          </mesh>
        );
      })}

      {/* ─── HOT-WATER DISTRIBUTION HEADER (inside casing, below fan deck) ─── */}
      {/* Lateral distribution header spanning the full Z width */}
      <mesh position={[0, CASING_TOP + 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, D - 0.30, 16]} />
        <meshStandardMaterial color={'#1d7a3a'} roughness={0.55} metalness={0.45} />
      </mesh>
      {/* Distribution laterals — two parallel runs along X */}
      {([-0.70, 0.70] as const).map((zOff, li) => (
        <mesh key={`dist-lat-${li}`} position={[0, CASING_TOP + 0.35, zOff]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, W - 0.50, 16]} />
          <meshStandardMaterial color={'#1d7a3a'} roughness={0.55} metalness={0.45} />
        </mesh>
      ))}
      {/* Drop nozzle stubs — spray heads pointing down through fill */}
      {Array.from({ length: 12 }).map((_, ni) => {
        const nx = -(W / 2 - 0.40) + (ni % 4) * ((W - 0.80) / 3);
        const nz = ni < 4 ? -0.70 : ni < 8 ? 0 : 0.70;
        return (
          <mesh key={`nozzle-stub-${ni}`} position={[nx, CASING_TOP + 0.20, nz]}>
            <cylinderGeometry args={[0.055, 0.07, 0.30, 8]} />
            <meshStandardMaterial color={'#aab8c0'} roughness={0.45} metalness={0.75} />
          </mesh>
        );
      })}

      {/* ─── RETURN OUTLET FLANGE (BASIN BOTTOM, -X face) ───────────────
         Cold water collects in the bottom basin and exits through a
         flanged stub on the −X face near the bottom of the basin.
         The pump suction draws cooled water back to the chiller condenser. */}
      <group position={[-(W / 2), BASIN_BOT + 0.45, +0.575]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.30, 0.30, 0.45, 16]} />
          <meshStandardMaterial color={'#7ec07a'} roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.42, 0.42, 0.06, 16]} />
          <meshStandardMaterial color={'#b07030'} roughness={0.25} metalness={0.95} />
        </mesh>
        {Array.from({ length: 8 }).map((_, fi) => {
          const a = (fi / 8) * Math.PI * 2;
          return (
            <mesh
              key={`bolt-ret-${fi}`}
              position={[-0.225, Math.cos(a) * 0.36, Math.sin(a) * 0.36]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.025, 0.025, 0.05, 6]} />
              <meshStandardMaterial color={'#222'} roughness={0.5} metalness={0.8} />
            </mesh>
          );
        })}
      </group>

      {/* ─── NAMEPLATE (small stainless tag on -Z face) ─── */}
      <mesh position={[-(W / 2) + 0.7, 0.1, -(D / 2) - 0.03]}>
        <boxGeometry args={[0.55, 0.32, 0.02]} />
        <meshStandardMaterial color={'#d8d8d8'} roughness={0.4} metalness={0.85} />
      </mesh>
      <Text
        position={[-(W / 2) + 0.7, 0.18, -(D / 2) - 0.045]}
        fontSize={0.07}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        MODEL VTL-176
      </Text>
      <Text
        position={[-(W / 2) + 0.7, 0.08, -(D / 2) - 0.045]}
        fontSize={0.05}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        500 NOM TONS
      </Text>
      <Text
        position={[-(W / 2) + 0.7, 0.00, -(D / 2) - 0.045]}
        fontSize={0.045}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        SN: CT-2024-0118
      </Text>

      {/* ─── EQUIPMENT LABEL on +Z casing ─── */}
      <Text
        position={[0, 0.7, D / 2 + 0.04]}
        fontSize={0.34}
        color={'#1a1f24'}
        anchorX="center"
        anchorY="middle"
        outlineColor={'#ffffff'}
        outlineWidth={0.012}
      >
        COOLING TOWER
      </Text>
      <Text
        position={[0, 0.34, D / 2 + 0.04]}
        fontSize={0.16}
        color={'#1a1f24'}
        anchorX="center"
        anchorY="middle"
      >
        CT-1
      </Text>

      <Text position={[0, STACK_TOP + 0.45, 0]} fontSize={0.32} color="#ffffff" anchorX="center" anchorY="middle">
        CT-1
      </Text>

      {/* ─── NOZZLE SPRAY ANIMATION ───────────────────────────────────────
         Water droplets fall from the distribution header down through the
         fill pack as the fan draws air upward. Only rendered when the CDW
         loop is flowing. */}
      <CoolingTowerSpray
        flowing={!!flowing}
        W={W}
        D={D}
        casingTop={CASING_TOP}
        basinTop={BASIN_TOP}
      />
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROOFTOP AIR-HANDLING UNIT  (built-up horizontal-flow AHU)
   Sized to load up a single 500-ton centrifugal chiller (~200,000 CFM @
   ≈400 CFM/ton). This is a custom built-up cabinet, not a packaged RTU —
   roughly the footprint of a small bus. Local +Y up; origin at the
   casing's vertical mid-point so the unit drops cleanly onto its roof curb.

   Local layout (X — direction of airflow, OA → SA):
     -7.00 .. -4.40  outside-air / mixing box with bird-screen louvers
     -4.40 .. -1.80  pre-filter + final-filter section (twin access doors)
     -1.80 .. +3.20  cooling coil section — 8-row chilled-water coil bank
                      (CHW supply / return enter from below through the
                       curb at this section)
     +3.20 .. +6.20  draw-through fan-array section (twin housed
                      centrifugal blowers visible through screened access)
     +6.20 .. +7.50  discharge plenum (supply air drops through curb to
                      the duct distribution below)
   Footprint: 14.5 (X) × 5.6 (Z), casing 4.0 (Y) tall.

   Top: large rotating relief-fan stack (axial) plus a smaller exhaust fan
   atop the mixing box — both spin to make the unit clearly read as
   "operating" at a distance, matching the cooling-tower visual language.
   ───────────────────────────────────────────────────────────────────────── */
function RooftopAHU({
  position,
  cutaway = false,
}: {
  position: [number, number, number];
  /** When true, hides the exterior shell — main casing, panel seams,
   *  access doors, door frames, fan grilles, end caps, OA hood, equipment
   *  labels — so the internal MERV filter bank, CHW coil, housed centrifugal
   *  blowers, OA damper, and service disconnect are fully visible. The
   *  rooftop curb, walkway, top-mounted relief / exhaust fans, and the
   *  floating overhead AHU-1 label are kept so the unit still reads as an
   *  AHU at a distance. */
  cutaway?: boolean;
}) {
  const reliefFanRef = useRef<THREE.Group>(null);
  const exhaustFanRef = useRef<THREE.Group>(null);
  const runLedRef = useRef<THREE.MeshStandardMaterial>(null);
  const alarmLedRef = useRef<THREE.MeshStandardMaterial>(null);

  /* Constant-speed supply fan rotation at 760 RPM.
     Centrifugal blowers: airflow is draw-through (+X direction).
     Viewed from the −Z inlet side, the DWDI wheel rotates counter-clockwise
     (standard forward-curved centrifugal = rotation.z negative in local frame).
     rad/s = (760/60)*2π ≈ 79.6 rad/s → cap visual to 22 rad/s so it reads
     clearly without motion-blur smear at 60 fps. */
  const BLOWER_RAD_S = 22.0;
  /* Rooftop axial fans: slower, 4.6 rad/s relief fan, 5.8 rad/s exhaust */
  useFrame((state, dt) => {
    if (reliefFanRef.current) reliefFanRef.current.rotation.y += dt * 4.6;
    if (exhaustFanRef.current) exhaustFanRef.current.rotation.y -= dt * 5.8;
    const t = state.clock.elapsedTime;
    if (runLedRef.current) {
      runLedRef.current.emissiveIntensity = 1.4 + Math.sin(t * 3.0) * 0.45;
    }
    if (alarmLedRef.current) {
      alarmLedRef.current.emissiveIntensity = 0.6 + (Math.sin(t * 1.2) + 1) * 0.4;
    }
  });
  void BLOWER_RAD_S; // used inside HousedCentrifugalBlower rpm prop below

  /* ── Casing dimensions ── (upsized for 500-ton / 200,000 CFM service)
     W=18 m  — long axis along X (airflow direction, OA→supply discharge)
     D=6.4 m — depth (cabinet width along Z)
     H=5.0 m — height
     These match ASHRAE Handbook proportions for a 500-ton draw-through
     built-up AHU: 12–14 ft tall casing, 18–21 ft wide, 55–65 ft long. */
  const W = 18.0;
  const D = 6.4;
  const H = 5.0;

  /* Section X-positions (local, origin at casing center)
     OA / Mixing : 3.5 m  — OA hood + RA mixing box + ERW
     Pre-Filter  : 1.8 m  — MERV-8 + preheat coil
     Final Filter: 1.8 m  — MERV-13
     Coil        : 5.8 m  — CHW cooling coil (8-row deep, full span)
     Humidifier  : 0.8 m  — steam grid
     Fan         : 3.5 m  — twin DWDI blowers side by side
     Discharge   : 0.8 m  — discharge plenum + curb opening */
  const OA_X_MIN   = -W / 2;              // -9.0
  const OA_X_MAX   = -W / 2 + 3.50;      // -5.5
  const FILT_X_MIN = OA_X_MAX;            // -5.5
  const FILT_X_MAX = OA_X_MAX + 3.60;    // -1.9
  const COIL_X_MIN = FILT_X_MAX;          // -1.9
  const COIL_X_MAX = FILT_X_MAX + 5.80;  // +3.9
  const FAN_X_MIN  = COIL_X_MAX;          // +3.9
  const FAN_X_MAX  = COIL_X_MAX + 3.50;  // +7.4
  const DISC_X_MIN = FAN_X_MAX;           // +7.4
  const DISC_X_MAX = +W / 2;              // +9.0

  /* Section centers (handy for placing access doors / labels) */
  const FILT_X = (FILT_X_MIN + FILT_X_MAX) / 2;
  const COIL_X = (COIL_X_MIN + COIL_X_MAX) / 2;
  const FAN_X  = (FAN_X_MIN  + FAN_X_MAX)  / 2;
  const OA_X   = (OA_X_MIN   + OA_X_MAX)   / 2;

  /* Materials */
  const casing      = '#a8acb0';   // painted / galvanized exterior
  const casingDark  = '#7c8086';
  const seam        = '#5d6166';   // panel seam strip
  const accent      = '#3a4148';
  const louver      = '#5a6168';
  const door        = '#9aa0a5';
  const grille      = '#1f2227';
  const safetyYel   = '#d8a722';
  const blower      = '#cfd2d6';
  const motorBlk    = '#262626';
  const concrete    = '#9a958e';

  return (
    <group position={position}>
      {/* ─── HOUSEKEEPING / ISOLATION RAIL on rooftop ─── */}
      <mesh position={[0, -H / 2 - 0.06, 0]} receiveShadow>
        <boxGeometry args={[W + 0.7, 0.10, D + 0.7]} />
        <meshStandardMaterial color={concrete} roughness={0.95} metalness={0.02} />
      </mesh>

      {/* ─── EXTERIOR SHELL ─── (hidden when `cutaway` so the trainee can see
          straight into the cabinet at the filter bank, coil, blowers, OA
          damper, and service disconnect) */}
      {!cutaway && (
        <group name="ahu:shell">
          {/* MAIN CASING */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[W, H, D]} />
            <meshStandardMaterial color={casing} roughness={0.55} metalness={0.45} />
          </mesh>

          {/* Top deck slightly inset (gives a flanged-roof look) */}
          <mesh position={[0, H / 2 + 0.04, 0]}>
            <boxGeometry args={[W + 0.06, 0.08, D + 0.06]} />
            <meshStandardMaterial color={casingDark} roughness={0.6} metalness={0.5} />
          </mesh>

          {/* Vertical panel seams along +Z and -Z faces (every section
              boundary plus mid-bay seams, since each section is too wide
              for one panel) */}
          {[
            OA_X_MAX, FILT_X_MIN + 1.30, FILT_X_MAX,
            COIL_X_MIN + 1.25, COIL_X_MIN + 2.50, COIL_X_MIN + 3.75, COIL_X_MAX,
            FAN_X_MIN + 1.50, FAN_X_MAX,
          ].map((sx, si) => (
            <group key={`seam-${si}`}>
              <mesh position={[sx, 0, D / 2 + 0.012]}>
                <boxGeometry args={[0.05, H - 0.10, 0.030]} />
                <meshStandardMaterial color={seam} roughness={0.6} metalness={0.55} />
              </mesh>
              <mesh position={[sx, 0, -D / 2 - 0.012]}>
                <boxGeometry args={[0.05, H - 0.10, 0.030]} />
                <meshStandardMaterial color={seam} roughness={0.6} metalness={0.55} />
              </mesh>
            </group>
          ))}

          {/* Horizontal mid-band (visual panel reinforcement) */}
          {[H * 0.20, -H * 0.20].map((by, bi) => (
            <group key={`hband-${bi}`}>
              <mesh position={[0, by, D / 2 + 0.012]}>
                <boxGeometry args={[W - 0.10, 0.05, 0.030]} />
                <meshStandardMaterial color={seam} roughness={0.6} metalness={0.55} />
              </mesh>
              <mesh position={[0, by, -D / 2 - 0.012]}>
                <boxGeometry args={[W - 0.10, 0.05, 0.030]} />
                <meshStandardMaterial color={seam} roughness={0.6} metalness={0.55} />
              </mesh>
            </group>
          ))}

          {/* OUTSIDE-AIR INTAKE HOOD (−X end) */}
          <mesh position={[OA_X_MIN - 0.32, 0.30, 0]}>
            <boxGeometry args={[0.70, H * 0.75, D - 0.45]} />
            <meshStandardMaterial color={casingDark} roughness={0.55} metalness={0.5} />
          </mesh>
          {/* Rain hood drip-edge lip */}
          <mesh position={[OA_X_MIN - 0.70, 0.30 + (H * 0.75) / 2 + 0.06, 0]}>
            <boxGeometry args={[0.85, 0.08, D - 0.40]} />
            <meshStandardMaterial color={casingDark} roughness={0.55} metalness={0.5} />
          </mesh>
          {/* Storm / bird-screen louvers on the OA hood (−X face) */}
          {Array.from({ length: 11 }).map((_, ki) => {
            const span = H * 0.68;
            const ly = 0.30 - span / 2 + (ki / 10) * span;
            return (
              <mesh
                key={`oalouv-${ki}`}
                position={[OA_X_MIN - 0.66, ly, 0]}
                rotation={[Math.PI / 9, 0, 0]}
              >
                <boxGeometry args={[0.06, 0.18, D - 0.55]} />
                <meshStandardMaterial color={louver} roughness={0.7} metalness={0.4} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Outside-air damper just inside the OA hood — modulating
          parallel-blade aluminum damper with end-mounted Belimo actuator.
          Faces the OA stream (−X) so its actuator and linkage are visible
          through the access door and louvers. */}
      <OutsideAirDamper
        position={[OA_X_MIN + 0.45, 0.30, 0]}
        rotation={[0, 0, 0]}
        width={D - 0.70}
        height={H * 0.70}
        blades={6}
      />

      {/* ─── RETURN-AIR DAMPER — mixing-box RA inlet ───
          Opposed-blade RA damper at the mixing box on the −Z (back) face,
          modulating opposite to the OA damper. Blue actuator distinguishes it
          from the OA actuator; orange actuator variant used for relief. */}
      <ReturnAirDamper
        position={[OA_X_MIN + 1.10, 0.30, -D / 2 + 0.08]}
        rotation={[0, Math.PI / 2, 0]}
        width={H * 0.68}
        height={H * 0.68}
        blades={5}
        open="auto"
        relief={false}
      />

      {/* ─── ENTHALPY ENERGY-RECOVERY WHEEL — OA section ───
          Rotary energy-recovery wheel (ERW-1) installed across the OA and
          exhaust halves of the mixing box. The slowly rotating rotor transfers
          enthalpy between the exhaust return air (bottom half) and the fresh
          OA stream (top half), pre-conditioning outdoor air before it reaches
          the preheat coil and filters. Only shown in cutaway so the internal
          section is visible; not rendered when the casing is solid. */}
      <RotaryEnergyWheel
        position={[OA_X_MIN + 2.00, 0.30, 0]}
        rotation={[0, 0, 0]}
        diameter={H * 0.75}
        depth={0.35}
        rpm={14}
        wheelType="enthalpy"
        name="ahu:ERW-1"
      />
      {!cutaway && (
        <Text
          position={[OA_X_MIN + 2.00, 1.55, D / 2 + 0.034]}
          fontSize={0.13}
          color={'#1a1f24'}
          anchorX="center"
          anchorY="middle"
        >
          ENERGY RECOVERY WHEEL
        </Text>
      )}

      {/* ─── PREHEAT HOT-WATER COIL — freeze-protection coil ───
          Located between the OA damper and the pre-filter bank. Provides
          freeze protection by pre-heating the entering mixed air when OAT
          drops near freezing. PICV + modulating actuator on HWS connection. */}
      <HotWaterHeatingCoil
        position={[OA_X_MAX - 0.60, -0.05, 0]}
        rotation={[0, 0, 0]}
        width={D - 0.60}
        height={H - 1.00}
        depth={0.20}
        rows={3}
        valveColor="#c0392b"
        name="ahu:COIL-HW-PREHEAT"
      />
      {!cutaway && (
        <Text
          position={[OA_X_MAX - 0.60, 1.55, D / 2 + 0.034]}
          fontSize={0.13}
          color={'#1a1f24'}
          anchorX="center"
          anchorY="middle"
        >
          PREHEAT COIL
        </Text>
      )}

      {/* ─── PRE-FILTER + FINAL-FILTER SECTION ───
          The −X (left) door stays closed (DP gauge mounted on it). The +X
          (right) door is rendered as an open service cutaway revealing the
          MERV-13 pleated filter rack so a trainee can identify the
          cartridges, slide tracks, and spring clips.
          Both pieces are part of the casing shell and disappear in cutaway. */}
      {!cutaway && (
        <group name="ahu:shell-filter-doors">
          {/* Closed left door */}
          <group key="filt-door-closed">
            <mesh position={[FILT_X - 0.65, -0.10, D / 2 + 0.014]}>
              <boxGeometry args={[1.10, H - 0.70, 0.025]} />
              <meshStandardMaterial color={door} roughness={0.55} metalness={0.45} />
            </mesh>
            <mesh position={[FILT_X - 0.65 + 0.42, -0.10, D / 2 + 0.038]}>
              <boxGeometry args={[0.14, 0.14, 0.05]} />
              <meshStandardMaterial color={accent} roughness={0.45} metalness={0.7} />
            </mesh>
            {[-0.6, 0.6].map((hy, hi) => (
              <mesh key={`fhinge-L-${hi}`} position={[FILT_X - 0.65 - 0.50, hy * 0.65, D / 2 + 0.032]}>
                <boxGeometry args={[0.08, 0.14, 0.022]} />
                <meshStandardMaterial color={accent} roughness={0.5} metalness={0.7} />
              </mesh>
            ))}
          </group>
          {/* Open service cutaway — right door removed, frame revealed */}
          <group key="filt-cutaway">
            {/* Door frame border (open hole) */}
            {[
              [FILT_X + 0.65, +(H - 0.70) / 2 + 0.04, 0.05, 1.18],
              [FILT_X + 0.65, -(H - 0.70) / 2 - 0.04, 0.05, 1.18],
              [FILT_X + 0.65 - 0.59, -0.10, H - 0.70 + 0.10, 0.05],
              [FILT_X + 0.65 + 0.59, -0.10, H - 0.70 + 0.10, 0.05],
            ].map((b, bi) => (
              <mesh key={`fframe-${bi}`} position={[b[0], b[1], D / 2 + 0.014]}>
                <boxGeometry args={[b[3], b[2], 0.030]} />
                <meshStandardMaterial color={accent} roughness={0.55} metalness={0.7} />
              </mesh>
            ))}
            {/* Open door swung to the side (parked against casing) */}
            <mesh position={[FILT_X + 0.65 + 0.55, -0.10, D / 2 + 0.55]} rotation={[0, -Math.PI / 2.2, 0]}>
              <boxGeometry args={[1.10, H - 0.70, 0.025]} />
              <meshStandardMaterial color={door} roughness={0.55} metalness={0.45} />
            </mesh>
          </group>
        </group>
      )}
      {/* ─── MERV-8 PRE-FILTER BANK — upstream / left half of filter section ───
          Flat-panel coarse-efficiency pre-filter protects the MERV-13 final
          bank from loading prematurely. Positioned on the entering-air side
          (−X) of the filter section, leaving room for the final bank on the +X. */}
      <PreFilterBank
        position={[FILT_X - 0.72, -0.05, 0]}
        rotation={[0, 0, 0]}
        width={D - 0.50}
        height={H - 0.80}
        depth={0.055}
        cols={8}
        rows={4}
        name="ahu:PREFILT-AHU"
      />

      {/* MERV-13 pleated filter bank inside the filter section.
          Center the rack on the cabinet centerline and rotate so its airflow
          axis aligns with cabinet +X (default). Width spans the full cabinet
          depth Z (with side clearance), height fills most of the cabinet H. */}
      <MervFilterBank
        position={[FILT_X + 0.60, -0.05, 0]}
        rotation={[0, 0, 0]}
        width={D - 0.50}
        height={H - 0.80}
        depth={0.32}
        cols={8}
        rows={4}
      />
      {/* DP gauge + section stencil — door-mounted, hide with shell */}
      {!cutaway && (
        <group name="ahu:shell-filter-dp">
          <mesh position={[FILT_X, 1.30, D / 2 + 0.030]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.04, 16]} />
            <meshStandardMaterial color={accent} roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[FILT_X, 1.30, D / 2 + 0.052]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.11, 0.11, 0.005, 16]} />
            <meshStandardMaterial color={'#f2efe6'} roughness={0.2} metalness={0.05} />
          </mesh>
          <mesh position={[FILT_X, 1.30, D / 2 + 0.058]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.012, 0.10, 0.005]} />
            <meshStandardMaterial color={'#cc0000'} roughness={0.4} metalness={0.4} />
          </mesh>
          <Text
            position={[FILT_X, 1.55, D / 2 + 0.034]}
            fontSize={0.13}
            color={'#1a1f24'}
            anchorX="center"
            anchorY="middle"
          >
            FILTER SECTION
          </Text>
        </group>
      )}

      {/* ─── COOLING COIL SECTION ───
          Two outer access doors stay closed (sight glass on each); the
          middle door is rendered as an open service cutaway revealing the
          chilled-water cooling coil — copper hairpin returns, aluminum fin
          pack, vertical headers, and condensate drain pan all visible.
          The doors / frames are part of the casing and disappear in cutaway. */}
      {!cutaway && (
        <group name="ahu:shell-coil-doors">
          {[COIL_X - 1.55, COIL_X + 1.55].map((dx, di) => (
            <group key={`coil-door-closed-${di}`}>
              <mesh position={[dx, -0.10, D / 2 + 0.014]}>
                <boxGeometry args={[1.40, H - 0.70, 0.025]} />
                <meshStandardMaterial color={door} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Sight glass on each door */}
              <mesh position={[dx, 0.50, D / 2 + 0.030]}>
                <boxGeometry args={[0.55, 0.40, 0.014]} />
                <meshStandardMaterial color={'#1c2530'} roughness={0.15} metalness={0.2} transparent opacity={0.45} />
              </mesh>
              <mesh position={[dx, 0.50, D / 2 + 0.024]}>
                <boxGeometry args={[0.62, 0.46, 0.014]} />
                <meshStandardMaterial color={accent} roughness={0.5} metalness={0.7} />
              </mesh>
              {/* Handle */}
              <mesh position={[dx + 0.55, -0.10, D / 2 + 0.038]}>
                <boxGeometry args={[0.14, 0.14, 0.05]} />
                <meshStandardMaterial color={accent} roughness={0.45} metalness={0.7} />
              </mesh>
              {/* Hinges */}
              {[-0.6, 0.6].map((hy, hi) => (
                <mesh key={`chinge-${di}-${hi}`} position={[dx - 0.65, hy * 0.65, D / 2 + 0.032]}>
                  <boxGeometry args={[0.08, 0.14, 0.022]} />
                  <meshStandardMaterial color={accent} roughness={0.5} metalness={0.7} />
                </mesh>
              ))}
            </group>
          ))}
          {/* Middle coil door cutaway — open frame + parked door */}
          <group key="coil-door-cutaway">
            {[
              [COIL_X, +(H - 0.70) / 2 + 0.04, 0.05, 1.48],
              [COIL_X, -(H - 0.70) / 2 - 0.04, 0.05, 1.48],
              [COIL_X - 0.74, -0.10, H - 0.70 + 0.10, 0.05],
              [COIL_X + 0.74, -0.10, H - 0.70 + 0.10, 0.05],
            ].map((b, bi) => (
              <mesh key={`cframe-${bi}`} position={[b[0], b[1], D / 2 + 0.014]}>
                <boxGeometry args={[b[3], b[2], 0.030]} />
                <meshStandardMaterial color={accent} roughness={0.55} metalness={0.7} />
              </mesh>
            ))}
            {/* Open door parked +X-side */}
            <mesh position={[COIL_X + 0.70, -0.10, D / 2 + 0.55]} rotation={[0, -Math.PI / 2.2, 0]}>
              <boxGeometry args={[1.40, H - 0.70, 0.025]} />
              <meshStandardMaterial color={door} roughness={0.55} metalness={0.45} />
            </mesh>
          </group>
        </group>
      )}
      {/* Chilled-water cooling coil (copper / aluminum) inside the coil section */}
      <ChwCopperCoil
        position={[COIL_X, -0.05, 0]}
        rotation={[0, 0, 0]}
        width={D - 0.60}
        height={H - 1.00}
        depth={0.42}
        rows={8}
      />
      {!cutaway && (
        <Text
          position={[COIL_X, 1.55, D / 2 + 0.034]}
          fontSize={0.16}
          color={'#1a1f24'}
          anchorX="center"
          anchorY="middle"
        >
          CHILLED WATER COOLING COIL
        </Text>
      )}
      {/* Auto air vents at coil header high points (pid air_management) */}
      <AirVent
        position={[COIL_X - 0.9, H / 2 - 0.35, D / 2 + 0.22]}
        rotation={[0, Math.PI / 2, 0]}
        pipeRadius={0.12}
      />
      <AirVent
        position={[COIL_X + 0.9, H / 2 - 0.55, -D / 2 - 0.22]}
        rotation={[0, -Math.PI / 2, 0]}
        pipeRadius={0.12}
      />

      {/* ─── STEAM HUMIDIFIER — between coil and fan sections ───
          Steam-grid manifold with 7 vertical dispersion tubes projects into
          the supply-air stream immediately downstream of the cooling coil,
          before the supply fan. Maintains space relative humidity per BMS
          setpoint. Modulating control valve + safety shutoff solenoid on the
          insulated steam supply riser. */}
      <SteamHumidifier
        position={[COIL_X_MAX - 0.50, -0.10, 0]}
        rotation={[0, 0, 0]}
        width={D - 0.60}
        tubeHeight={H - 1.20}
        tubes={7}
        name="ahu:HUM-1"
      />
      {!cutaway && (
        <Text
          position={[COIL_X_MAX - 0.50, 1.55, D / 2 + 0.034]}
          fontSize={0.13}
          color={'#1a1f24'}
          anchorX="center"
          anchorY="middle"
        >
          STEAM HUMIDIFIER
        </Text>
      )}

      {/* ─── FAN SECTION — screened access doors (shell, hide in cutaway) ─── */}
      {!cutaway && (
        <group name="ahu:shell-fan-doors">
          {[FAN_X - 0.75, FAN_X + 0.75].map((dx, di) => (
            <group key={`fan-grille-${di}`}>
              <mesh position={[dx, 0.0, D / 2 + 0.014]}>
                <boxGeometry args={[1.20, H - 0.70, 0.025]} />
                <meshStandardMaterial color={door} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Cut-out frame */}
              <mesh position={[dx, 0.0, D / 2 + 0.030]}>
                <boxGeometry args={[1.00, H - 1.10, 0.014]} />
                <meshStandardMaterial color={accent} roughness={0.5} metalness={0.7} />
              </mesh>
              {/* Dark recess behind grille */}
              <mesh position={[dx, 0.0, D / 2 + 0.020]}>
                <boxGeometry args={[0.94, H - 1.18, 0.014]} />
                <meshStandardMaterial color={grille} roughness={0.95} metalness={0.0} />
              </mesh>
              {/* Horizontal bird-screen bars */}
              {Array.from({ length: 14 }).map((_, gi) => (
                <mesh
                  key={`fanbar-${di}-${gi}`}
                  position={[dx, -((H - 1.20) / 2) + gi * ((H - 1.20) / 13), D / 2 + 0.038]}
                >
                  <boxGeometry args={[0.96, 0.014, 0.010]} />
                  <meshStandardMaterial color={'#3a3a3a'} roughness={0.6} metalness={0.6} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      )}
      {/* Twin DWDI housed centrifugal supply blowers sized for 500-ton /
          200,000 CFM service. Wheel diameter 1.20 m, width 1.10 m.
          Each blower handles 100,000 CFM at ~2.5" SP.
          Inlet bell-mouths face ±Z (cross-cabinet plenum draw);
          discharge collar points +Y into the discharge plenum above.
          Components self-animate via their internal useFrame at 760 RPM. */}
      <HousedCentrifugalBlower
        position={[FAN_X - 1.00, -0.60, 0]}
        rotation={[0, 0, 0]}
        wheelDiameter={1.20}
        wheelWidth={1.10}
        rpm={760}
      />
      <HousedCentrifugalBlower
        position={[FAN_X + 1.00, -0.60, 0]}
        rotation={[0, 0, 0]}
        wheelDiameter={1.20}
        wheelWidth={1.10}
        rpm={760}
      />
      {/* VFD enclosures stacked on the −Z face of the fan section, one per blower */}
      {[FAN_X - 1.00, FAN_X + 1.00].map((vx, vi) => (
        <group key={`vfd-${vi}`} position={[vx, -0.85, -D / 2 - 0.10]}>
          <mesh castShadow>
            <boxGeometry args={[0.70, 1.30, 0.32]} />
            <meshStandardMaterial color={'#3a3a38'} roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.30, 0.18]}>
            <boxGeometry args={[0.40, 0.22, 0.012]} />
            <meshStandardMaterial color={'#001100'} emissive={'#003300'} emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[0.20, -0.30, 0.18]}>
            <boxGeometry args={[0.10, 0.22, 0.04]} />
            <meshStandardMaterial color={safetyYel} roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      ))}

      {/* ─── DS-AHU service disconnect ───
          NEMA-3R fused safety switch mounted on the −Z face of the FAN
          section, between the two VFDs. Per pid spec + NEC 430, this
          provides a positive lock-off "within sight of the supply-fan
          motor" (OSHA 1910.147 LOTO point). Door faces −Z (outward away
          from cabinet). Inspect-registry pattern 'electrical:DS-AHU' is
          baked into the component's group name. */}
      <ServiceDisconnect
        position={[FAN_X, 0.50, -D / 2 - 0.18]}
        rotation={[0, Math.PI / 2, 0]}
        width={0.55}
        height={0.95}
        depth={0.28}
        state={'on'}
        tag={'DS-AHU-1'}
        rating={'480V 3PH 100A FUSED'}
      />

      {/* ─── DISCHARGE PLENUM END CAP (+X end) — shell, hide in cutaway ─── */}
      {!cutaway && (
        <group name="ahu:shell-discharge-end">
          <mesh position={[DISC_X_MAX + 0.014, 0, 0]}>
            <boxGeometry args={[0.030, H - 0.08, D - 0.08]} />
            <meshStandardMaterial color={casingDark} roughness={0.55} metalness={0.5} />
          </mesh>
          {[-0.8, -0.3, 0.3, 0.8].map((py, pi) => (
            <mesh key={`tport-${pi}`} position={[DISC_X_MAX + 0.034, py, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.07, 0.07, 0.025, 12]} />
              <meshStandardMaterial color={accent} roughness={0.4} metalness={0.8} />
            </mesh>
          ))}
        </group>
      )}

      {/* ─── LOCAL CONTROL / HMI ENCLOSURE on +Z face (discharge end) ───
          Door-mounted on the casing, so we hide the whole thing in cutaway
          rather than leaving it floating in mid-air. */}
      {!cutaway && (
        <group position={[DISC_X_MIN - 0.20, -0.40, D / 2 + 0.13]} name="ahu:shell-control-enclosure">
          <mesh castShadow>
            <boxGeometry args={[1.00, 1.50, 0.32]} />
            <meshStandardMaterial color={'#3a3a38'} roughness={0.5} metalness={0.4} />
          </mesh>
          {/* Door */}
          <mesh position={[0, 0, 0.18]}>
            <boxGeometry args={[0.88, 1.40, 0.014]} />
            <meshStandardMaterial color={'#2a2a28'} roughness={0.5} metalness={0.5} />
          </mesh>
          {/* Operating handle */}
          <mesh position={[0.35, 0.45, 0.205]}>
            <boxGeometry args={[0.10, 0.32, 0.06]} />
            <meshStandardMaterial color={safetyYel} roughness={0.5} metalness={0.4} />
          </mesh>
          {/* Run LED (green, pulsing) */}
          <mesh position={[-0.22, 0.55, 0.205]}>
            <sphereGeometry args={[0.06, 12, 8]} />
            <meshStandardMaterial
              ref={runLedRef}
              color={'#33ff66'}
              emissive={'#00cc44'}
              emissiveIntensity={1.4}
            />
          </mesh>
          {/* Comm / status LED (amber) */}
          <mesh position={[-0.22, 0.32, 0.205]}>
            <sphereGeometry args={[0.05, 12, 8]} />
            <meshStandardMaterial
              ref={alarmLedRef}
              color={'#ffaa22'}
              emissive={'#ff8800'}
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Fault LED (steady red) */}
          <mesh position={[-0.22, 0.12, 0.205]}>
            <sphereGeometry args={[0.05, 12, 8]} />
            <meshStandardMaterial color={'#ff3333'} emissive={'#ff0000'} emissiveIntensity={0.6} />
          </mesh>
          {/* Local HMI faceplate */}
          <mesh position={[0.05, -0.20, 0.205]}>
            <boxGeometry args={[0.55, 0.40, 0.012]} />
            <meshStandardMaterial color={'#001a14'} emissive={'#003a28'} emissiveIntensity={0.4} />
          </mesh>
          {/* Nameplate */}
          <mesh position={[0, -0.62, 0.205]}>
            <boxGeometry args={[0.70, 0.18, 0.006]} />
            <meshStandardMaterial color={'#d8d8d8'} roughness={0.4} metalness={0.85} />
          </mesh>
          <Text position={[0, -0.62, 0.213]} fontSize={0.075} color={'#0a0a0a'} anchorX="center" anchorY="middle">
            AHU-1 CONTROL
          </Text>
        </group>
      )}

      {/* ─── ROOFTOP MAINTENANCE WALKWAY along +Z side ─── */}
      <mesh position={[0, H / 2 + 0.10, D / 2 + 0.55]} castShadow>
        <boxGeometry args={[W * 0.85, 0.06, 1.00]} />
        <meshStandardMaterial color={'#6c6f74'} roughness={0.85} metalness={0.4} />
      </mesh>
      {/* Walkway grating texture stripes */}
      {Array.from({ length: 12 }).map((_, wi) => (
        <mesh key={`walkstripe-${wi}`} position={[-W * 0.40 + wi * (W * 0.80 / 11), H / 2 + 0.135, D / 2 + 0.55]}>
          <boxGeometry args={[0.025, 0.005, 0.95]} />
          <meshStandardMaterial color={'#3a3d40'} roughness={0.85} metalness={0.4} />
        </mesh>
      ))}
      {/* Safety-yellow handrails along walkway */}
      {[0.55, 1.10].map((hy, hi) => (
        <mesh key={`hrail-${hi}`} position={[0, H / 2 + 0.10 + hy, D / 2 + 1.04]}>
          <boxGeometry args={[W * 0.85, 0.05, 0.04]} />
          <meshStandardMaterial color={safetyYel} roughness={0.55} metalness={0.4} />
        </mesh>
      ))}
      {[-W * 0.40, -W * 0.20, 0, W * 0.20, W * 0.40].map((px, pi) => (
        <mesh key={`hrpost-${pi}`} position={[px, H / 2 + 0.65, D / 2 + 1.04]}>
          <cylinderGeometry args={[0.028, 0.028, 1.10, 6]} />
          <meshStandardMaterial color={safetyYel} roughness={0.55} metalness={0.4} />
        </mesh>
      ))}
      {/* Toe-kick strip */}
      <mesh position={[0, H / 2 + 0.18, D / 2 + 1.04]}>
        <boxGeometry args={[W * 0.85, 0.10, 0.025]} />
        <meshStandardMaterial color={'#4a4d52'} roughness={0.85} metalness={0.3} />
      </mesh>

      {/* ─── ROOFTOP RELIEF FAN STACK (large axial, above fan section) ───
          Throws the obvious "running" tell: visible at the far edge of the
          rooftop scene next to the cooling tower. */}
      <mesh position={[FAN_X, H / 2 + 0.30, 0]}>
        <cylinderGeometry args={[0.95, 1.20, 0.40, 28, 1, true]} />
        <meshStandardMaterial color={casingDark} roughness={0.55} metalness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[FAN_X, H / 2 + 0.95, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.90, 28, 1, true]} />
        <meshStandardMaterial color={casingDark} roughness={0.55} metalness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[FAN_X, H / 2 + 1.41, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.05, 8, 28]} />
        <meshStandardMaterial color={accent} roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Spider arms supporting the motor */}
      {[0, Math.PI / 2].map((a, ai) => (
        <mesh key={`rxarm-${ai}`} position={[FAN_X, H / 2 + 0.85, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[1.90, 0.06, 0.10]} />
          <meshStandardMaterial color={accent} roughness={0.6} metalness={0.55} />
        </mesh>
      ))}
      {/* Motor pod */}
      <mesh position={[FAN_X, H / 2 + 0.85, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.50, 16]} />
        <meshStandardMaterial color={motorBlk} roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Rotating axial propeller (5 blades, big) */}
      <group ref={reliefFanRef} position={[FAN_X, H / 2 + 0.65, 0]}>
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.16, 14]} />
          <meshStandardMaterial color={'#2a2a2a'} roughness={0.4} metalness={0.7} />
        </mesh>
        {Array.from({ length: 5 }).map((_, bi) => {
          const ang = (bi / 5) * Math.PI * 2;
          return (
            <group key={`rblade-${bi}`} rotation={[0, ang, 0]}>
              <mesh position={[0.55, 0, 0]} rotation={[0, 0, -0.32]} castShadow>
                <boxGeometry args={[0.92, 0.05, 0.30]} />
                <meshStandardMaterial color={blower} roughness={0.45} metalness={0.55} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ─── SECONDARY EXHAUST FAN above the OA / mixing box ───
          Smaller, spins the opposite direction for visual variety. */}
      <mesh position={[OA_X, H / 2 + 0.20, 0]}>
        <cylinderGeometry args={[0.55, 0.70, 0.26, 24, 1, true]} />
        <meshStandardMaterial color={casingDark} roughness={0.55} metalness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[OA_X, H / 2 + 0.62, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.58, 24, 1, true]} />
        <meshStandardMaterial color={casingDark} roughness={0.55} metalness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[OA_X, H / 2 + 0.91, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.04, 8, 24]} />
        <meshStandardMaterial color={accent} roughness={0.5} metalness={0.7} />
      </mesh>
      {[0, Math.PI / 2].map((a, ai) => (
        <mesh key={`oxarm-${ai}`} position={[OA_X, H / 2 + 0.55, 0]} rotation={[0, a, 0]}>
          <boxGeometry args={[1.10, 0.04, 0.06]} />
          <meshStandardMaterial color={accent} roughness={0.6} metalness={0.55} />
        </mesh>
      ))}
      <mesh position={[OA_X, H / 2 + 0.55, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.30, 14]} />
        <meshStandardMaterial color={motorBlk} roughness={0.4} metalness={0.7} />
      </mesh>
      <group ref={exhaustFanRef} position={[OA_X, H / 2 + 0.42, 0]}>
        <mesh>
          <cylinderGeometry args={[0.10, 0.10, 0.10, 12]} />
          <meshStandardMaterial color={'#2a2a2a'} roughness={0.4} metalness={0.7} />
        </mesh>
        {Array.from({ length: 4 }).map((_, bi) => {
          const ang = (bi / 4) * Math.PI * 2;
          return (
            <group key={`oxblade-${bi}`} rotation={[0, ang, 0]}>
              <mesh position={[0.32, 0, 0]} rotation={[0, 0, 0.30]} castShadow>
                <boxGeometry args={[0.55, 0.04, 0.20]} />
                <meshStandardMaterial color={blower} roughness={0.45} metalness={0.55} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ─── EQUIPMENT LABEL + NAMEPLATE — stencilled on the casing skin,
          hide with the shell so they aren't floating in mid-air. ─── */}
      {!cutaway && (
        <group name="ahu:shell-labels">
          {/* Camera-facing AIR HANDLER stencil on +Z face */}
          <Text
            position={[0, 1.85, D / 2 + 0.04]}
            fontSize={0.55}
            color={'#1a1f24'}
            anchorX="center"
            anchorY="middle"
            outlineColor={'#ffffff'}
            outlineWidth={0.018}
          >
            AIR HANDLER
          </Text>
          <Text
            position={[0, 1.30, D / 2 + 0.04]}
            fontSize={0.26}
            color={'#1a1f24'}
            anchorX="center"
            anchorY="middle"
          >
            AHU-1
          </Text>

          {/* Nameplate on -Z face */}
          <mesh position={[OA_X + 1.0, -0.75, -D / 2 - 0.014]}>
            <boxGeometry args={[1.10, 0.65, 0.025]} />
            <meshStandardMaterial color={'#d8d8d8'} roughness={0.4} metalness={0.85} />
          </mesh>
          <Text position={[OA_X + 1.0, -0.55, -D / 2 - 0.029]} rotation={[0, Math.PI, 0]} fontSize={0.11} color={'#0a0a0a'} anchorX="center" anchorY="middle">
            AHU-1
          </Text>
          <Text position={[OA_X + 1.0, -0.72, -D / 2 - 0.029]} rotation={[0, Math.PI, 0]} fontSize={0.075} color={'#0a0a0a'} anchorX="center" anchorY="middle">
            MODEL DSH-220
          </Text>
          <Text position={[OA_X + 1.0, -0.85, -D / 2 - 0.029]} rotation={[0, Math.PI, 0]} fontSize={0.060} color={'#0a0a0a'} anchorX="center" anchorY="middle">
            200,000 CFM @ 3.5" SP
          </Text>
          <Text position={[OA_X + 1.0, -0.95, -D / 2 - 0.029]} rotation={[0, Math.PI, 0]} fontSize={0.055} color={'#0a0a0a'} anchorX="center" anchorY="middle">
            500 TON CHW LOAD
          </Text>
          <Text position={[OA_X + 1.0, -1.04, -D / 2 - 0.029]} rotation={[0, Math.PI, 0]} fontSize={0.048} color={'#0a0a0a'} anchorX="center" anchorY="middle">
            SN: AH-2024-0118
          </Text>
        </group>
      )}

      {/* Floating overhead label — kept in cutaway so the unit still reads
          as AHU-1 from across the rooftop, with a "CUTAWAY" annotation when
          the shell is hidden so it's obvious this is an x-ray view. */}
      <Text position={[0, H / 2 + 1.95, 0]} fontSize={0.42} color="#ffffff" anchorX="center" anchorY="middle">
        {cutaway ? 'AHU-1 — CUTAWAY' : 'AHU-1'}
      </Text>
    </group>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ENGINE-ROOM ROLL-UP GARAGE DOOR
   Industrial sectional overhead door on the +Z (south) face. Each door has
   side guide rails, a header housing, and a horizontally-ribbed curtain
   that retracts upward into the housing when "open". The curtain Y is
   smoothly lerped each frame toward the target driven by useGarageDoorStore.

   `centerX` / `z` place the door on the south wall plane, `width`/`height`
   size the bay. Depth (Z thickness) of the curtain is intentionally thin so
   it sits flush with the wall.
   ───────────────────────────────────────────────────────────────────────── */
function GarageDoor({
  centerX,
  z,
  width,
  height,
  tag,
}: {
  centerX: number;
  z: number;
  width: number;
  height: number;
  tag: string;
}) {
  const open = useGarageDoorStore((s) => s.open);
  const progressRef = useRef(0);

  /* ─── Sectional-door geometry ──────────────────────────────────────────
     The curtain is N rigid horizontal panels. Each panel travels along a
     fixed S-curve "track" that runs straight up the wall, bends 90° just
     above the header on a curve of radius `TRACK_R`, then runs horizontally
     back along the ceiling toward −Z (into the engine room). At any frame
     each panel's position/rotation is derived from a single track-distance
     parameter `s` so the panels stay rigidly chained together as the door
     opens and closes. */
  // Real industrial sectional doors have panel sections about 0.5–0.8 m tall
  // so each panel can navigate the corner radius without binding. For a 11 m
  // door, 14 panels gives ~0.79 m sections — typical of high-lift commercial
  // overhead doors. The bend radius is sized so PANEL_H < ARC_LEN, which
  // keeps the chord-vs-arc deviation small while transitioning the corner.
  const N_PANELS    = 14;
  const PANEL_H     = height / N_PANELS;     // ~0.79 m per section
  const PANEL_THICK = 0.07;
  const TRACK_R     = 0.70;                  // bend radius at the header
  const ARC_LEN     = TRACK_R * Math.PI / 2; // ≈1.10 m of curved track
  // Total lift needed to put the entire chain on the horizontal ceiling run:
  // bottom-of-bottom-panel must reach the start of the horizontal section.
  const L_MAX       = height + ARC_LEN;
  const VISION_IDX  = N_PANELS - 2;          // second-from-top section

  // Track parametrization: returns (y, z) at arc-distance `s` from the floor.
  // Vertical run → quarter-circle bend → horizontal ceiling run.
  const trackPoint = (s: number): [number, number] => {
    if (s <= height) return [s, 0];
    if (s <= height + ARC_LEN) {
      const theta = (s - height) / TRACK_R;
      return [
        height + TRACK_R * Math.sin(theta),
        -TRACK_R * (1 - Math.cos(theta)),
      ];
    }
    return [height + TRACK_R, -TRACK_R - (s - height - ARC_LEN)];
  };

  const panelRefs = useRef<Array<THREE.Group | null>>([]);

  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    const cur = progressRef.current;
    // Critically-damped exponential smoothing toward target (~1.5 s travel).
    const k = 1 - Math.exp(-dt * 2.2);
    const next = cur + (target - cur) * k;
    progressRef.current = Math.abs(next - target) < 0.0005 ? target : next;
    const L = progressRef.current * L_MAX;
    for (let i = 0; i < N_PANELS; i++) {
      const g = panelRefs.current[i];
      if (!g) continue;
      // Each panel is a rigid plate hinged at its top and bottom edges. The
      // hinge points slide along the track at constant arc-length spacing
      // PANEL_H apart. We position the panel as the chord between those two
      // endpoints — this guarantees adjacent panels share their hinge point
      // at every frame, so the chain reads as one continuous garage door.
      const [y0, z0] = trackPoint(i * PANEL_H + L);
      const [y1, z1] = trackPoint((i + 1) * PANEL_H + L);
      g.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2);
      // Rotation around X so panel's local +Y axis aligns with the chord
      // (vertical when closed; rotates through −π/2 as the panel transitions
      // from vertical wall to horizontal ceiling track).
      g.rotation.x = Math.atan2(z1 - z0, y1 - y0);
    }
  });

  // ─── Material palette ─────────────────────────────────────────────────
  const panelColor   = '#c8c2b5';   // ivory steel skin
  const trimColor    = '#7a7670';   // mid-tone gray-brown trim
  const railColor    = '#3a3a38';   // dark powder-coated steel
  const railLip      = '#9a9a96';   // brushed inner guide face
  const hingeColor   = '#222220';   // black hinge backplates
  const motorColor   = '#2a2a2a';   // operator housing
  const motorAccent  = '#cc4422';   // safety-red E-stop
  const springColor  = '#4a4a48';   // raw-steel torsion spring
  const shaftColor   = '#5a5a58';   // chromed torsion shaft

  /* ─── One sectional panel ─────────────────────────────────────────────
     Renders the slab + outside embossing + inside stiffeners + hinges.
     The vision section (i === VISION_IDX) builds itself from a frame of
     strips so the panes can be transparent on BOTH faces. */
  const renderPanel = (i: number) => {
    const isVision = i === VISION_IDX;
    const isBottom = i === 0;
    const isTop    = i === N_PANELS - 1;

    // Outside embossed-cell pattern: a 6-wide row of slightly raised
    // rectangles per panel — the classic "raised panel" garage-door look.
    // 14 panels × 6 cells gives a clean rectangular grid that reads as a
    // sectional overhead door from any sensible viewing distance.
    const embossCols    = 6;
    const embossMargX   = 0.20;
    const embossMargY   = 0.10;
    const cellGap       = 0.10;
    const cellW         = (width - 2 * embossMargX - (embossCols - 1) * cellGap) / embossCols;
    const cellH         = PANEL_H - 2 * embossMargY;

    // Vision-row layout (only used when isVision)
    const sideStripW = 0.40;
    const winSlots   = 8;
    const mullionW   = 0.06;
    const visionW    = width - 2 * sideStripW;
    const winW       = (visionW - (winSlots - 1) * mullionW) / winSlots;
    const stride     = winW + mullionW;
    const winH       = PANEL_H * 0.62;

    return (
      <group
        key={`panel-${i}`}
        ref={(el) => { panelRefs.current[i] = el; }}
        position={[0, (i + 0.5) * PANEL_H, 0]}
      >
        {!isVision && (
          <>
            {/* Main panel slab (solid section) */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[width, PANEL_H, PANEL_THICK]} />
              <meshStandardMaterial color={panelColor} roughness={0.78} metalness={0.18} />
            </mesh>
            {/* OUTSIDE: embossed raised-panel cells */}
            {Array.from({ length: embossCols }, (_, c) => {
              const cx = -width / 2 + embossMargX + cellW / 2 + c * (cellW + cellGap);
              return (
                <mesh
                  key={`emb-${c}`}
                  position={[cx, 0, PANEL_THICK / 2 + 0.012]}
                  castShadow
                >
                  <boxGeometry args={[cellW, cellH, 0.024]} />
                  <meshStandardMaterial color={panelColor} roughness={0.78} metalness={0.18} />
                </mesh>
              );
            })}
          </>
        )}

        {isVision && (
          <>
            {/* Top horizontal stile */}
            <mesh
              position={[0, PANEL_H / 2 - (PANEL_H * 0.19) / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[width, PANEL_H * 0.19, PANEL_THICK]} />
              <meshStandardMaterial color={panelColor} roughness={0.78} metalness={0.18} />
            </mesh>
            {/* Bottom horizontal stile */}
            <mesh
              position={[0, -PANEL_H / 2 + (PANEL_H * 0.19) / 2, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[width, PANEL_H * 0.19, PANEL_THICK]} />
              <meshStandardMaterial color={panelColor} roughness={0.78} metalness={0.18} />
            </mesh>
            {/* Left side stile */}
            <mesh position={[-width / 2 + sideStripW / 2, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[sideStripW, winH, PANEL_THICK]} />
              <meshStandardMaterial color={panelColor} roughness={0.78} metalness={0.18} />
            </mesh>
            {/* Right side stile */}
            <mesh position={[width / 2 - sideStripW / 2, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[sideStripW, winH, PANEL_THICK]} />
              <meshStandardMaterial color={panelColor} roughness={0.78} metalness={0.18} />
            </mesh>
            {/* Vertical mullions between window panes */}
            {Array.from({ length: winSlots - 1 }, (_, m) => {
              const mx = -width / 2 + sideStripW + winW + mullionW / 2 + m * stride;
              return (
                <mesh key={`mull-${m}`} position={[mx, 0, 0]} castShadow>
                  <boxGeometry args={[mullionW, winH, PANEL_THICK]} />
                  <meshStandardMaterial color={panelColor} roughness={0.78} metalness={0.18} />
                </mesh>
              );
            })}
            {/* Window panes — transparent both faces, framed both faces */}
            {Array.from({ length: winSlots }, (_, w) => {
              const wx = -width / 2 + sideStripW + winW / 2 + w * stride;
              return (
                <group key={`win-${w}`} position={[wx, 0, 0]}>
                  {/* Glazing */}
                  <mesh>
                    <boxGeometry args={[winW, winH, PANEL_THICK * 0.65]} />
                    <meshStandardMaterial
                      color="#3b556a"
                      roughness={0.16}
                      metalness={0.5}
                      emissive="#1a2a35"
                      emissiveIntensity={0.45}
                      transparent
                      opacity={0.42}
                    />
                  </mesh>
                  {/* Outside frame bezel */}
                  <mesh position={[0, 0, PANEL_THICK / 2 + 0.006]}>
                    <boxGeometry args={[winW + 0.05, winH + 0.05, 0.014]} />
                    <meshStandardMaterial color={trimColor} roughness={0.5} metalness={0.55} />
                  </mesh>
                  <mesh position={[0, 0, PANEL_THICK / 2 + 0.014]}>
                    <boxGeometry args={[winW - 0.04, winH - 0.04, 0.006]} />
                    <meshStandardMaterial
                      color="#7e95a8"
                      roughness={0.18}
                      metalness={0.6}
                      transparent
                      opacity={0.30}
                    />
                  </mesh>
                  {/* Inside frame bezel */}
                  <mesh position={[0, 0, -PANEL_THICK / 2 - 0.006]}>
                    <boxGeometry args={[winW + 0.05, winH + 0.05, 0.014]} />
                    <meshStandardMaterial color={trimColor} roughness={0.5} metalness={0.55} />
                  </mesh>
                </group>
              );
            })}
          </>
        )}

        {/* INSIDE (−Z): horizontal stiffener strut at panel mid-height.
            Visible from inside the engine room when the door is closed. */}
        {!isVision && (
          <mesh
            position={[0, 0, -PANEL_THICK / 2 - 0.04]}
            castShadow
          >
            <boxGeometry args={[width - 0.40, 0.06, 0.06]} />
            <meshStandardMaterial color={trimColor} roughness={0.6} metalness={0.5} />
          </mesh>
        )}

        {/* INSIDE: hinges along the TOP edge of every panel except the
            topmost — these connect this panel to the section above and are
            the most-recognizable "garage door" cue from inside. */}
        {!isTop && (
          <>
            {[-width / 4, 0, width / 4].map((hx, hi) => (
              <group
                key={`hinge-${hi}`}
                position={[hx, PANEL_H / 2, -PANEL_THICK / 2 - 0.025]}
              >
                <mesh castShadow>
                  <boxGeometry args={[0.40, 0.18, 0.04]} />
                  <meshStandardMaterial color={hingeColor} roughness={0.5} metalness={0.7} />
                </mesh>
                {/* Knuckle pin (cylinder along X) */}
                <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, -0.030]} castShadow>
                  <cylinderGeometry args={[0.040, 0.040, 0.42, 10]} />
                  <meshStandardMaterial color="#5e5e5a" roughness={0.4} metalness={0.85} />
                </mesh>
              </group>
            ))}
            {/* End-stile hinges with track rollers — outboard of the door
                edges, riding inside the side rails. */}
            {[-1, 1].map((sx) => (
              <group
                key={`endhinge-${sx}`}
                position={[sx * (width / 2 - 0.10), PANEL_H / 2, -PANEL_THICK / 2 - 0.035]}
              >
                <mesh castShadow>
                  <boxGeometry args={[0.28, 0.20, 0.06]} />
                  <meshStandardMaterial color={hingeColor} roughness={0.5} metalness={0.7} />
                </mesh>
                {/* Roller stem extending outward beyond door edge into the rail */}
                <mesh
                  position={[sx * 0.22, 0, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                  castShadow
                >
                  <cylinderGeometry args={[0.025, 0.025, 0.34, 8]} />
                  <meshStandardMaterial color={railLip} roughness={0.4} metalness={0.85} />
                </mesh>
                {/* Roller wheel at end of stem (rides in the rail) */}
                <mesh
                  position={[sx * 0.40, 0, 0]}
                  rotation={[0, 0, Math.PI / 2]}
                  castShadow
                >
                  <cylinderGeometry args={[0.075, 0.075, 0.045, 14]} />
                  <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.35} />
                </mesh>
              </group>
            ))}
          </>
        )}

        {/* BOTTOM PANEL extras: outside lift bar + grab handles + astragal seal */}
        {isBottom && (
          <group position={[0, -PANEL_H / 2, 0]}>
            {/* Outside push bar (full-width) */}
            <mesh position={[0, 0.30, PANEL_THICK / 2 + 0.06]} castShadow>
              <boxGeometry args={[width * 0.55, 0.10, 0.05]} />
              <meshStandardMaterial color="#2a2a28" roughness={0.5} metalness={0.7} />
            </mesh>
            {/* Push-bar mounting brackets */}
            {[-0.6 * width / 2 + 0.5, 0.6 * width / 2 - 0.5].map((bx, bi) => (
              <mesh
                key={`brkt-${bi}`}
                position={[bx, 0.30, PANEL_THICK / 2 + 0.025]}
                castShadow
              >
                <boxGeometry args={[0.12, 0.20, 0.10]} />
                <meshStandardMaterial color={trimColor} roughness={0.55} metalness={0.55} />
              </mesh>
            ))}
            {/* Grab handles for manual operation */}
            {[-0.7, 0.7].map((hx, hi) => (
              <mesh
                key={`out-handle-${hi}`}
                position={[hx, 0.30, PANEL_THICK / 2 + 0.18]}
                castShadow
              >
                <torusGeometry args={[0.12, 0.020, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.7} />
              </mesh>
            ))}
            {/* Astragal — black rubber weather seal across the bottom edge */}
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[width - 0.04, 0.10, PANEL_THICK + 0.06]} />
              <meshStandardMaterial color="#141414" roughness={0.95} metalness={0.0} />
            </mesh>
            {/* Bottom inside lift handle (visible from inside when closed) */}
            <mesh position={[0, 0.30, -PANEL_THICK / 2 - 0.06]} castShadow>
              <boxGeometry args={[width * 0.55, 0.10, 0.05]} />
              <meshStandardMaterial color="#2a2a28" roughness={0.5} metalness={0.7} />
            </mesh>
          </group>
        )}
      </group>
    );
  };

  // ─── STATIC: side guide rails (vertical run + curved bend + ceiling run) ───
  const renderTrackRail = (sx: -1 | 1) => {
    const segments = 14;
    const horizLen = height + 0.6;
    return (
      <group key={`rail-${sx}`} position={[sx * (width / 2 + 0.18), 0, 0]}>
        {/* Vertical rail (full door height) */}
        <mesh position={[0, height / 2, 0]} castShadow>
          <boxGeometry args={[0.10, height, 0.22]} />
          <meshStandardMaterial color={railColor} roughness={0.55} metalness={0.75} />
        </mesh>
        {/* Inner guide lip (lighter face the rollers ride against) */}
        <mesh position={[-sx * 0.06, height / 2, 0]}>
          <boxGeometry args={[0.025, height, 0.16]} />
          <meshStandardMaterial color={railLip} roughness={0.40} metalness={0.85} />
        </mesh>
        {/* Curved bend — quarter circle at the header */}
        {Array.from({ length: segments }, (_, k) => {
          const tm = ((k + 0.5) / segments) * (Math.PI / 2);
          const py = height + TRACK_R * Math.sin(tm);
          const pz = -TRACK_R * (1 - Math.cos(tm));
          const segLen = ARC_LEN / segments + 0.005;
          return (
            <mesh
              key={`bend-${k}`}
              position={[0, py, pz]}
              rotation={[-tm, 0, 0]}
              castShadow
            >
              <boxGeometry args={[0.10, segLen, 0.22]} />
              <meshStandardMaterial color={railColor} roughness={0.55} metalness={0.75} />
            </mesh>
          );
        })}
        {/* Horizontal ceiling rail — receives the panels when door is open */}
        <mesh
          position={[0, height + TRACK_R, -TRACK_R - horizLen / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.10, horizLen, 0.22]} />
          <meshStandardMaterial color={railColor} roughness={0.55} metalness={0.75} />
        </mesh>
        {/* Two ceiling drop-rod hangers supporting the horizontal rail.
            Short (≈0.20 m) so they tuck under the rooftop deck (y ≈ 11.86)
            without punching through. */}
        {[0.30, 0.70].map((f, hi) => (
          <mesh
            key={`hang-${hi}`}
            position={[0, height + TRACK_R + 0.12, -TRACK_R - horizLen * f]}
            castShadow
          >
            <boxGeometry args={[0.05, 0.22, 0.05]} />
            <meshStandardMaterial color={railColor} roughness={0.55} metalness={0.75} />
          </mesh>
        ))}
      </group>
    );
  };

  return (
    <group position={[centerX, 0, z]} name={`garage-door:${tag}`}>
      {/* Side guide rails (static — vertical + bend + ceiling run) */}
      {renderTrackRail(-1)}
      {renderTrackRail(1)}

      {/* TORSION SPRING ASSEMBLY — long shaft along the inside header with
          two large helical springs flanking a center anchor plate, and a
          cable drum at each end. Stationary; purely visual. Sits just above
          the swept volume of the panels (y = height + R ≈ 11.7) and slightly
          inside the wall plane so it reads clearly from inside the engine
          room. Stays clear of the rooftop deck above (deck underside ≈ 11.86). */}
      <group position={[0, height + TRACK_R + 0.12, -0.30]}>
        {/* Shaft (thin steel tube spanning slightly past the door width) */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, width + 0.6, 12]} />
          <meshStandardMaterial color={shaftColor} roughness={0.4} metalness={0.85} />
        </mesh>
        {/* Cable drums at each end */}
        {[-1, 1].map((sx) => (
          <mesh
            key={`drum-${sx}`}
            position={[sx * (width / 2 + 0.05), 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.16, 0.16, 0.16, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.7} />
          </mesh>
        ))}
        {/* Center anchor plate */}
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.34, 0.20]} />
          <meshStandardMaterial color={hingeColor} roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Two helical torsion springs flanking the center plate */}
        {[-1, 1].map((sx) => {
          const springLen = width * 0.32;
          const coilCount = 18;
          return (
            <group
              key={`spring-${sx}`}
              position={[sx * (springLen / 2 + 0.30), 0, 0]}
            >
              {/* Spring tube (open cylinder body so the coils show through) */}
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.13, 0.13, springLen, 16, 1, true]} />
                <meshStandardMaterial
                  color={springColor}
                  roughness={0.55}
                  metalness={0.7}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Helical coils suggested with thin rings stepped along X */}
              {Array.from({ length: coilCount }, (_, c) => {
                const cx = -springLen / 2 + (c + 0.5) * (springLen / coilCount);
                return (
                  <mesh
                    key={`coil-${c}`}
                    position={[cx, 0, 0]}
                    rotation={[0, Math.PI / 2, 0]}
                  >
                    <torusGeometry args={[0.13, 0.014, 6, 18]} />
                    <meshStandardMaterial color="#2a2a28" roughness={0.6} metalness={0.6} />
                  </mesh>
                );
              })}
              {/* End cone at outboard end (winding cone) */}
              <mesh
                position={[sx * (springLen / 2 + 0.04), 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.10, 0.14, 0.10, 14]} />
                <meshStandardMaterial color={hingeColor} roughness={0.5} metalness={0.7} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* JACKSHAFT OPERATOR (commercial side-mount door operator) — bolted
          to the inside wall just above the right rail. Drives the torsion
          shaft via a chain housing. Visible from inside the engine room. */}
      <group position={[width / 2 + 0.55, height + 0.30, -0.55]}>
        {/* Operator housing */}
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.50, 0.55]} />
          <meshStandardMaterial color={motorColor} roughness={0.6} metalness={0.55} />
        </mesh>
        {/* Brushed faceplate / model badge */}
        <mesh position={[0, 0.05, 0.281]}>
          <boxGeometry args={[0.42, 0.20, 0.006]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Status indicator LED */}
        <mesh position={[0.16, 0.16, 0.288]}>
          <cylinderGeometry args={[0.018, 0.018, 0.012, 12]} />
          <meshStandardMaterial
            color="#88ff88"
            emissive="#44ff44"
            emissiveIntensity={1.4}
          />
        </mesh>
        {/* Red E-stop pushbutton */}
        <mesh position={[-0.16, -0.14, 0.288]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.05, 16]} />
          <meshStandardMaterial color={motorAccent} roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Mushroom cap of E-stop */}
        <mesh position={[-0.16, -0.14, 0.318]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.018, 16]} />
          <meshStandardMaterial color={motorAccent} roughness={0.45} metalness={0.3} />
        </mesh>
        {/* Drive sprocket on top of operator (couples to vertical drive chain) */}
        <mesh position={[-0.18, 0.30, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.04, 16]} />
          <meshStandardMaterial color="#5e5e5a" roughness={0.4} metalness={0.85} />
        </mesh>
        {/* Vertical drive chain — climbs from operator top up to the
            torsion shaft sprocket sitting directly above */}
        <mesh position={[-0.18, 0.55, 0.02]}>
          <boxGeometry args={[0.025, 0.55, 0.025]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.7} />
        </mesh>
        <mesh position={[-0.18, 0.55, -0.02]}>
          <boxGeometry args={[0.025, 0.55, 0.025]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.7} />
        </mesh>
        {/* Sprocket on the torsion shaft (above the operator) */}
        <mesh position={[-0.18, 0.86, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.05, 18]} />
          <meshStandardMaterial color="#5e5e5a" roughness={0.4} metalness={0.85} />
        </mesh>
        {/* Manual emergency-release chain hoist drop (red guide pulley + chain) */}
        <mesh position={[0.30, -0.05, 0.10]} castShadow>
          <torusGeometry args={[0.06, 0.012, 6, 16]} />
          <meshStandardMaterial color={motorAccent} roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0.30, -0.90, 0.10]}>
          <cylinderGeometry args={[0.005, 0.005, 1.7, 6]} />
          <meshStandardMaterial color="#5a5a58" roughness={0.5} metalness={0.85} />
        </mesh>
      </group>

      {/* DOOR TAG PLATE — stays put on the outside of the right rail */}
      <group
        position={[width / 2 + 0.55, 1.6, 0.12]}
        rotation={[0, -Math.PI / 8, 0]}
      >
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.20, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.4} />
        </mesh>
        <Text
          position={[0, 0, 0.012]}
          fontSize={0.10}
          color="#f4f4f0"
          anchorX="center"
          anchorY="middle"
        >
          {tag}
        </Text>
      </group>

      {/* THE DOOR PANELS — animated along the S-curve track */}
      {Array.from({ length: N_PANELS }, (_, i) => renderPanel(i))}
    </group>
  );
}

function EngineRoom({
  onHmiZoom,
  hmiLookAtRef,
  hmiZoomed,
  onVfdZoom,
  vfdLookAtRef,
  vfdZoomed,
  onCdwpVfdZoom,
  onChwpVfdZoom,
  cdwpVfdZoomed,
  chwpVfdZoomed,
  cdwpVfdLookAtRef,
  chwpVfdLookAtRef,
  cdwpVfdCamPosRef,
  chwpVfdCamPosRef,
}: {
  onHmiZoom: () => void;
  hmiLookAtRef: MutableRefObject<THREE.Vector3>;
  hmiZoomed: boolean;
  onVfdZoom: () => void;
  vfdLookAtRef: MutableRefObject<THREE.Vector3>;
  vfdZoomed: boolean;
  onCdwpVfdZoom: () => void;
  onChwpVfdZoom: () => void;
  cdwpVfdZoomed: boolean;
  chwpVfdZoomed: boolean;
  cdwpVfdLookAtRef: MutableRefObject<THREE.Vector3>;
  chwpVfdLookAtRef: MutableRefObject<THREE.Vector3>;
  cdwpVfdCamPosRef: MutableRefObject<THREE.Vector3>;
  chwpVfdCamPosRef: MutableRefObject<THREE.Vector3>;
}) {
  const vfdOccluderRef = useRef<THREE.Mesh>(null);

  /* ── Pump VFD screen anchor refs + look-at + camera-pose updater ─────────
     The panel anchor inside <Ach580Drive/> has rotation [0, π/2, 0] so its
     local +Z axis faces the drive's front cover. After the cabinet's own
     rotation is applied, the anchor's WORLD quaternion encodes exactly
     which way the panel is facing in the engine room — we extract the
     world-space "panel-out" vector from it and offset the camera along
     that vector by a fixed standoff distance. This is what guarantees
     the click-to-zoom always lands the camera squarely in front of the
     ABB control panel rather than zooming "into the wall". */
  const cdwpVfdScreenAnchorRef = useRef<THREE.Group>(null);
  const chwpVfdScreenAnchorRef = useRef<THREE.Group>(null);
  const cdwpVfdOccluderRef     = useRef<THREE.Mesh>(null);
  const chwpVfdOccluderRef     = useRef<THREE.Mesh>(null);
  /* Standoff matched to the ACP's enlarged 0.30 m world height (see
     Ach580Drive.tsx → ACP_WORLD_H). At ~0.42 m the panel fills roughly
     two-thirds of the vertical viewport on a 78° FOV — close enough for
     every key (HAND/OFF/AUTO/START/STOP/menu) to be a comfortable mouse
     click target while still leaving the surrounding drive face visible
     for context. */
  const VFD_ZOOM_STANDOFF  = 0.42;   // metres in front of the ACP face
  const VFD_ZOOM_TILT_DOWN = 0.020;  // small tilt-down for natural reading angle
  const _quat   = useRef(new THREE.Quaternion()).current;
  const _fwd    = useRef(new THREE.Vector3()).current;
  useFrame(() => {
    if (cdwpVfdScreenAnchorRef.current) {
      cdwpVfdScreenAnchorRef.current.getWorldPosition(cdwpVfdLookAtRef.current);
      cdwpVfdScreenAnchorRef.current.getWorldQuaternion(_quat);
      _fwd.set(0, 0, 1).applyQuaternion(_quat);
      cdwpVfdCamPosRef.current
        .copy(cdwpVfdLookAtRef.current)
        .addScaledVector(_fwd, VFD_ZOOM_STANDOFF);
      cdwpVfdCamPosRef.current.y += VFD_ZOOM_TILT_DOWN;
    }
    if (chwpVfdScreenAnchorRef.current) {
      chwpVfdScreenAnchorRef.current.getWorldPosition(chwpVfdLookAtRef.current);
      chwpVfdScreenAnchorRef.current.getWorldQuaternion(_quat);
      _fwd.set(0, 0, 1).applyQuaternion(_quat);
      chwpVfdCamPosRef.current
        .copy(chwpVfdLookAtRef.current)
        .addScaledVector(_fwd, VFD_ZOOM_STANDOFF);
      chwpVfdCamPosRef.current.y += VFD_ZOOM_TILT_DOWN;
    }
  });

  const compressorRunning = useSimulationStore((s) => s.state.compressorRunning);
  const condenserWaterFlowing = useSimulationStore((s) => s.state.condenserWaterFlowing);
  const evaporatorWaterFlowing = useSimulationStore((s) => s.state.evaporatorWaterFlowing);
  /* Animated-arrow gates: true only when the master loop flag is set AND
     every isolation valve along the loop's hydraulic path is open.
     Closing any one valve in a loop instantly hides every arrow on that
     loop (mirroring real-plant dead-head behaviour). */
  const cdwLoopFlowing = useCdwLoopFlowing();
  const chwLoopFlowing = useChwLoopFlowing();
  /* Live shell tints sampled by ChillerModel from the baked GLB textures.
     Subscribed here (not inside the barrel-head IIFE) so EngineRoom re-renders
     once when the colours resolve, after which the procedural weld-necks
     read as continuous with the YORK barrel skin. */
  const evapShellColor = useChillerColorStore((s) => s.evaporatorShellColor);
  const condShellColor = useChillerColorStore((s) => s.condenserShellColor);
  const vfdScreenAnchorRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = vfdScreenAnchorRef.current;
    if (g) g.getWorldPosition(vfdLookAtRef.current);
  });
  /* ─── Chiller_R2.glb shell geometry (verified via scripts/inspect-chiller.mjs) ───
     Two horizontal heat-exchanger shells run along Z, capped by flat head plates
     (Plane_Baked / Plane001_Baked) whose outer face sits at z ≈ ±4.575.

     LOWER shell — condenser side (CDW circuit)
       Cylinder_Baked / Cylinder002_Baked / Cylinder009_Baked
       center=(0.000, 0.800),  outer R≈1.087,  top y≈1.887
       modelled water nozzle Cylinder017_Baked at (0.335, 2.042, +3.657).

     UPPER shell — evaporator side (CHW circuit)
       Cylinder001_Baked / Cylinder003_Baked / Cylinder010_Baked
       center=(-2.092, 1.218), outer R≈0.895, top y≈2.113
       modelled water nozzle Cylinder018_Baked at (-1.984, 2.304, -3.531). */
  const HEAD_Z = 4.575;           // outer face of evaporator dished head end-plate (matches Plane001_Baked, −Z side)
  /* Evaporator barrel −Z end face (Cylinder003_Baked): Z∈[−4.759, +4.759].
     Bolt CHW flanges onto this face (z=−4.759) just as CDW flanges bolt
     onto the condenser barrel +Z face — closing any gap between the spool
     and the visible barrel cap. */
  const EVAP_HEAD_Z = 4.759;      // outer −Z face of evaporator barrel (CHW flange seat)
  /* Condenser barrel +Z end face (Cylinder002_Baked.001) sits 0.185 m
     proud of the modelled head plate at z=4.575. Bolt the CDW flanges
     onto THIS face so they kiss the actual visible barrel cap instead
     of leaving a daylight gap between the spool and the shell. Verified
     by mesh probe: world-space face hit ≈ (−0.20, 0.87, +4.7588),
     normal +Z, on Cylinder.002_Baked.001 (lower / condenser shell). */
  const COND_HEAD_Z = 4.76;       // outer +Z face of condenser barrel (CDW flange seat)

  // Evaporator (upper) shell — chilled water side
  const EVAP_X        = -2.092;   // shell axis X (Cylinder001/003/010_Baked center)
  const EVAP_NOZZLE_X = -1.984;   // marine waterbox face center X (Cylinder018_Baked)
  void EVAP_X;                    // documentation alias (real nozzle is offset toward chiller axis)
  void HEAD_Z;                    // kept for CHW_Z_SUPPLY/RETURN derivation below

  // Condenser (lower) shell — condenser water side
  /* YORK YK convention: 2-pass marine waterbox with the inlet (CWS) and
     outlet (CWR) flanges VERTICALLY STACKED on the head-face centerline
     of the barrel. The cool entering water (denser) feeds the lower
     pass first, so the inlet is the LOWER nozzle; the warmed exit
     water leaves through the UPPER nozzle. Both nozzles are bolted
     onto the +Z barrel face (Cylinder002_Baked.001 at COND_HEAD_Z).
     The legacy modelled Cylinder017_Baked at (0.335, 2.042, 3.657)
     is a top-of-shell tap (vent/relief), NOT the waterbox connection. */
  const COND_NOZZLE_X     =  0.0;    // centerline of barrel face (per YORK YK marine waterbox)
  const COND_NOZZLE_Y_INL =  0.30;   // LOWER nozzle — CWS inlet (cool entering water)
  const COND_NOZZLE_Y_OUT =  1.30;   // UPPER nozzle — CWR outlet (warmed leaving water)

  /* ─── Piping geometry constants ────────────────────────────────────────
     For the modelled barrel sizes (~2.17 m OD condenser, ~1.79 m OD
     evaporator → ≈1500-ton class YORK YK), the realistic main-pipe size
     is 17–18″ Sch.40 carbon steel (D ≈ 0.44 m). Earlier 24″ pipe was
     visually oversized relative to the barrels. Horizontal mains run
     overhead at code-compliant headroom (>2.4m / 8ft AFF; here ~9m for
     clearance over the chiller, walkways, and pumps). All elbows are
     long-radius (centerline R = 1.5 D). */
  // Pipe sizing: YORK YK 500-ton chiller, CDW flow ≈ 1,500 GPM @ 3 GPM/ton.
  // 18" Sch.40 carbon steel OD = 457 mm → pipe radius ≈ 0.22 m is correct
  // for this duty. Velocity = 1500 GPM / (π × 0.203² m²) ≈ 1.8 m/s (5.9 fps)
  // — within the 4–8 fps recommended range for condenser water mains.
  // Note: comments elsewhere claim 24" pipe but geometry correctly uses 18".
  /** 18" Sch.40 CDW / 16" CHW main — single outer radius for straights, elbows, and fittings. */
  const MAIN_PIPE_RADIUS = 0.22;
  const MAIN_PIPE_INS_RADIUS = MAIN_PIPE_RADIUS + 0.07; // ~7 cm closed-cell jacket per ASHRAE 90.1
  // CHW (chilled water) — YORK YK 2-pass marine waterbox convention:
  //   Both nozzles at the same X (barrel-face nozzle centerline, EVAP_NOZZLE_X = -1.984),
  //   stacked vertically (SUP lower, RET upper) on the −Z barrel face.
  //   Their risers run to different Z positions so elbows sweep in separate
  //   Z planes — no X offset needed, and both nozzles land on the barrel face.
  //   Evaporator barrel X∈[-2.987, -1.197]; EVAP_NOZZLE_X=-1.984 is well inside.
  const CHW_X_SUPPLY    = EVAP_NOZZLE_X;    // -1.984 — on the barrel face
  const CHW_X_RETURN    = EVAP_NOZZLE_X;    // -1.984 — same X; risers diverge in Z, not X
  const CHW_Z_SUPPLY    = -(HEAD_Z + 0.95);        // -5.525 (riser Z — clear of barrel face)
  const CHW_Z_RETURN    = -(HEAD_Z + 2.10);        // -6.675 (1.15 m apart, no overlap)
  const CHW_Y_FLG_SUP   = 1.00;                    // LOWER nozzle — CHWS inlet (cold entering water)
  const CHW_Y_FLG_RET   = 1.80;                    // UPPER nozzle — CHWR outlet (warmed leaving water)

  // CDW (condenser water) — both nozzles bolt onto the +Z condenser barrel face.
  // Supply is at the barrel centerline (X=0). Return is offset +0.55 m in X
  // so its spool, elbow, and riser don't intersect the supply riser.
  const CW_X_SUPPLY     =  COND_NOZZLE_X;         // 0.0 — barrel-face centerline
  /* Return nozzle is offset +0.55 m in X so its lateral spool and elbow
     arc run clear of the supply riser that rises straight up at X=0.
     Both flanges still bolt onto the same +Z barrel face (COND_HEAD_Z). */
  const CW_X_RETURN     =  COND_NOZZLE_X + 0.55;  // +0.55 — stepped aside to avoid supply riser
  /* Riser Z is computed off the actual condenser barrel face (COND_HEAD_Z=4.76)
     plus a generous lateral spool length so the rooftop / engine-room riser
     centerlines land at exactly z=+5.60 (supply) and z=+6.75 (return) —
     the same world coordinates assumed by PidPlantSystems.tsx (CW_ZS / CW_ZR)
     and walkModeWorld.ts collision AABBs. */
  const CW_Z_SUPPLY     =  COND_HEAD_Z + 0.84; // +5.60 (riser Z — clear of barrel face)
  const CW_Z_RETURN     =  COND_HEAD_Z + 1.99; // +6.75
  const CW_Y_FLG_SUP    =  COND_NOZZLE_Y_INL;  // 0.30 — lower nozzle CL (CWS inlet)
  const CW_Y_FLG_RET    =  COND_NOZZLE_Y_OUT;  // 1.30 — upper nozzle CL (CWR outlet)
  const CW_Y_ROOF_TOP   = 12.55;             // horizontal main elevation on roof
  const CW_TOWER_X      =  25;               // cooling tower position X
  const CW_TOWER_Z      = (CW_Z_SUPPLY + CW_Z_RETURN) / 2;  // 6.175 — tower-curb Z

  // ── CORRECTED COUNTERFLOW CONNECTIONS ──────────────────────────────────────
  // Supply (hot CWS IN): enters tower TOP through fan deck into distribution
  //   header. Stub at local [-(W/4), FAN_DECK_TOP+0.30, -0.575] →
  //   world X = 25 − 1.0 = 24.0, world Y = 14.68 + 2.42 + 0.06 = 17.16,
  //   world Z = CW_Z_SUPPLY = 5.60. Pipe arrives from ABOVE (vertical drop).
  // Return (cold CWR OUT): exits tower BASIN on −X face at basin bottom.
  //   Stub at local [−W/2, BASIN_BOT+0.45, +0.575] →
  //   world X = 23.0 (−X face), world Y = 14.68 − 2.05 = 12.63, Z = 6.725.
  const CW_TOWER_SUP_X  = CW_TOWER_X - 1.0;  // 24.0 — supply inlet X (top, thru deck)
  const CW_TOWER_SUP_Y  = 14.68 + 2.42 + 0.06; // 17.16 — supply flange world Y (top of fan deck)
  const CW_TOWER_SUP_Z  = CW_Z_SUPPLY;        // 5.60 — supply vertical riser Z
  const CW_TOWER_FLG_X  = CW_TOWER_X - 2.0;  // 23.0 — −X face of tower (return outlet)
  const CW_TOWER_RET_Y  = 14.68 + (-2.50 + 0.45); // 12.63 — return flange world Y (basin)
  const CW_TOWER_FLG_Z_SUP = CW_Z_SUPPLY;     // supply Z (same as riser)
  const CW_TOWER_FLG_Z_RET = CW_Z_RETURN;     // return Z (same as riser)
  void CW_TOWER_FLG_Z_SUP; void CW_TOWER_FLG_Z_RET;   // documentation aliases
  // Legacy aliases kept for flow-marker references below
  const CW_TOWER_FLG_Y_SUP = CW_TOWER_SUP_Y;
  const CW_TOWER_FLG_Y_RET = CW_TOWER_RET_Y;

  /* Z positions where lateral barrel-stubs terminate — both keyed to the
     actual barrel end faces (not the legacy flat dished head plates) so
     flanges kiss the visible barrel caps with no daylight gap. */
  const CHW_STUB_Z_IN = -EVAP_HEAD_Z;        // -4.759 — evaporator barrel −Z end face
  const CW_STUB_Z_IN  =  COND_HEAD_Z;        // +4.760 — condenser barrel +Z end face

  /* ─── ROOFTOP AIR-HANDLING UNIT (AHU-1) ───
     Upsized to W=18 m × D=6.4 m × H=5.0 m to serve the full 500-ton chiller
     (200,000 CFM design flow, twin 1.2 m DWDI blowers at 760 RPM).

     CHW piping enters through the SOUTH face (−Z side, world Z = AHU_Z − D/2)
     of the coil section so the risers run directly under the cabinet with no
     rooftop stubs crossing the access walkway.  The coil section center is at
     local X ≈ +1.0 m inside the casing (see RooftopAHU section constants).

     Supply duct exits the EAST (+X) face of the discharge plenum, turns 90°
     south (+Z) and then penetrates through the roof deck (−Y) into the engine
     room below as a 1.6 m × 1.6 m rectangular supply trunk.  Return duct
     comes back up on the west (−X) side of the building at the OA mixing box. */
  const AHU_X     = -22;                       // unit center on roof (world X)
  const AHU_W     = 18.0;                      // MUST match RooftopAHU W
  const AHU_D     = 6.4;                       // MUST match RooftopAHU D
  const AHU_H     = 5.0;                       // MUST match RooftopAHU H
  const AHU_Z     = (CHW_Z_SUPPLY + CHW_Z_RETURN) / 2;   // midpoint of CHW headers
  const AHU_BASE_Y = 12.55;                    // top of rooftop curb
  const AHU_Y     = AHU_BASE_Y + AHU_H / 2;   // 15.05 — casing center Y
  const AHU_TOP_Y = AHU_BASE_Y + AHU_H;        // 17.55 — top of casing
  const AHU_EAST_X = AHU_X + AHU_W / 2;        // -13.0 — discharge (+X) face
  const AHU_WEST_X = AHU_X - AHU_W / 2;        // -31.0 — OA (−X) face
  const AHU_SOUTH_Z = AHU_Z - AHU_D / 2;       // south (−Z) face — CHW entry side
  /* Coil section local center at X ≈ +1.0 inside casing
     → world X = AHU_X + 1.0 = -21.0.
     Both CHW risers share the same X (coil centre) — they differ only in Y
     (supply at bottom nozzle, return at top nozzle), matching the Carrier
     chilled-water coil reference where both connections exit the same header end. */
  const AHU_COIL_WORLD_X = AHU_X + 1.0;
  /* Both risers at coil-centre X; the pipe flow markers use these for their
     animation centre, so keep both pointing to the same world X. */
  const CHW_RISER_X_SUP = AHU_COIL_WORLD_X;
  const CHW_RISER_X_RET = AHU_COIL_WORLD_X;
  /* Duct constants */
  const DUCT_W    = 1.80;   // supply trunk width (along Z)
  const DUCT_H    = 1.40;   // supply trunk height (along Y)
  const DUCT_SKIN = '#8a9098';  // galvanized duct color
  const DUCT_DARK = '#5a6066';
  void AHU_WEST_X; void AHU_TOP_Y;

  return (
    <group>
      {/* ─── OUTDOOR GRASS YARD ───
          Large lawn plane that wraps the entire building. Sits 8 cm below
          the indoor concrete slab top (y=0) so the slab's exposed edge
          reads as a real curb above grade and the grass is fully tucked
          under the slab box where they overlap (no z-fighting). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.08, 0]}
        receiveShadow
      >
        <planeGeometry args={[420, 420, 1, 1]} />
        <meshStandardMaterial
          color="#5a7d3a"
          roughness={0.96}
          metalness={0.0}
        />
      </mesh>
      {/* Subtle darker grass tiles for depth — slightly lower than the
          main lawn so they never cause z-fight on the slab's footprint. */}
      {[[-90, -90], [-90, 0], [-90, 90], [0, -90], [0, 90], [90, -90], [90, 0], [90, 90]].map(([x, z], i) => (
        <mesh
          key={`lawn-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, -0.079, z]}
          receiveShadow
        >
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#638a3f' : '#527033'}
            roughness={0.97}
            metalness={0.0}
          />
        </mesh>
      ))}

      {/* ─── CONCRETE INDOOR SLAB (3D box, sized to building footprint + curb)
          Top surface sits exactly at y=0 so every existing equipment piece,
          column, valve, drain, etc. that was placed at y=0 still rests on
          the floor. Slab is 0.20 m thick, with the bottom face at y=-0.20
          (well below grade so the grass plane at y=-0.08 is hidden inside
          the slab volume and never z-fights the top surface). */}
      <mesh position={[0, -0.10, 0]} receiveShadow castShadow>
        <boxGeometry args={[70.5, 0.20, 70.5]} />
        <meshStandardMaterial color="#9a958e" roughness={0.97} metalness={0.01} />
      </mesh>

      {/* Quartered concrete pour joints — thin painted bands sitting just
          above the slab top to avoid z-fighting (slab top is y=0). */}
      {[[-17.5, -17.5], [-17.5, 17.5], [17.5, -17.5], [17.5, 17.5]].map(([x, z], i) => (
        <mesh key={`slab-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.005, z]}>
          <planeGeometry args={[34.5, 34.5]} />
          <meshStandardMaterial color="#8c8780" roughness={0.98} metalness={0.01} />
        </mesh>
      ))}

      {/* Concrete entrance pad — extends out the open south face onto the lawn.
          Sits at the slab top (y=0) and continues out past the building edge. */}
      <mesh position={[0, -0.04, 41]} receiveShadow castShadow>
        <boxGeometry args={[16, 0.12, 12]} />
        <meshStandardMaterial color="#a39e96" roughness={0.94} metalness={0.02} />
      </mesh>
      {/* Threshold strip at the building edge (sits on top of the slab) */}
      <mesh position={[0, 0.07, 35.05]} castShadow receiveShadow>
        <boxGeometry args={[16.2, 0.14, 0.45]} />
        <meshStandardMaterial color="#7a766f" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* A few decorative bushes flanking the entrance (low cost, big mood) */}
      {([
        [-9, 0, 41],
        [9, 0, 41],
        [-12, 0, 47],
        [12, 0, 47],
        [-26, 0, 22],
        [26, 0, 22],
        [-30, 0, -15],
        [30, 0, -15],
      ] as const).map(([bx, by, bz], i) => (
        <group key={`bush-${i}`} position={[bx, by, bz]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <sphereGeometry args={[0.85, 12, 8]} />
            <meshStandardMaterial color="#3e6b2c" roughness={0.95} />
          </mesh>
          <mesh position={[0.55, 0.42, 0.2]} castShadow>
            <sphereGeometry args={[0.55, 10, 7]} />
            <meshStandardMaterial color="#4a7a32" roughness={0.95} />
          </mesh>
          <mesh position={[-0.45, 0.5, -0.3]} castShadow>
            <sphereGeometry args={[0.6, 10, 7]} />
            <meshStandardMaterial color="#3a6028" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* A few simple trees in the corners of the yard */}
      {([
        [-55, 0, -50],
        [55, 0, -50],
        [-65, 0, 35],
        [65, 0, 35],
        [-45, 0, 60],
        [45, 0, 60],
      ] as const).map(([tx, ty, tz], i) => (
        <group key={`tree-${i}`} position={[tx, ty, tz]}>
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.42, 3.2, 8]} />
            <meshStandardMaterial color="#5a3a22" roughness={0.95} />
          </mesh>
          <mesh position={[0, 4.2, 0]} castShadow>
            <sphereGeometry args={[2.2, 14, 10]} />
            <meshStandardMaterial color="#3a6028" roughness={0.95} />
          </mesh>
          <mesh position={[1.0, 4.6, 0.6]} castShadow>
            <sphereGeometry args={[1.4, 12, 8]} />
            <meshStandardMaterial color="#4a7a32" roughness={0.95} />
          </mesh>
          <mesh position={[-0.9, 4.0, -0.5]} castShadow>
            <sphereGeometry args={[1.5, 12, 8]} />
            <meshStandardMaterial color="#2f4f24" roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* ─── CEILING BEAMS ─── */}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <mesh key={`beam-${i}`} position={[x, 12, 0]}>
          <boxGeometry args={[0.5, 1.0, 80]} />
          <meshStandardMaterial color="#4a4a48" roughness={0.6} metalness={0.7} />
        </mesh>
      ))}
      {[-30, -15, 0, 15, 30].map((z, i) => (
        <mesh key={`xbeam-${i}`} position={[0, 12, z]}>
          <boxGeometry args={[80, 0.4, 0.4]} />
          <meshStandardMaterial color="#555553" roughness={0.6} metalness={0.7} />
        </mesh>
      ))}

      {/* ─── HANGING LIGHT FIXTURES ───
          The southernmost row sits at z=22 (not the building edge at z=30)
          so the rolled-up garage-door panels — which stack along the ceiling
          between world z≈23 and z≈34 when the doors are open — don't pierce
          through the pendants and lamp housings. */}
      {[-20, -10, 0, 10, 20].map((x, xi) =>
        [-30, -15, 0, 15, 22].map((z, zi) => (
          <group key={`light-${xi}-${zi}`} position={[x, 11.5, z]}>
            <mesh>
              <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
              <meshStandardMaterial color="#333" roughness={0.8} metalness={0.6} />
            </mesh>
            <mesh position={[0, -0.45, 0]}>
              <boxGeometry args={[1.6, 0.12, 0.4]} />
              <meshStandardMaterial color="#555" roughness={0.5} metalness={0.7} />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <boxGeometry args={[1.4, 0.05, 0.25]} />
              <meshStandardMaterial color="#fff8e0" emissive="#ffeecc" emissiveIntensity={2.5} />
            </mesh>
          </group>
        ))
      )}

      {/* ─── WALLS ─── */}
      {/* Back wall */}
      <mesh position={[0, 6, -35]}>
        <boxGeometry args={[80, 12, 0.5]} />
        <meshStandardMaterial color="#7a7570" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-35, 6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[80, 12, 0.5]} />
        <meshStandardMaterial color="#7a7570" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Right wall */}
      <mesh position={[35, 6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[80, 12, 0.5]} />
        <meshStandardMaterial color="#7a7570" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* ─── SOUTH FACE: garage-door bays (3 roll-up doors + masonry piers) ───
          The +Z face used to be a single open opening. It now has three
          industrial roll-up overhead doors flanked by short masonry piers
          and a continuous header beam at the top. Doors animate via
          <GarageDoor/> driven by useGarageDoorStore.

          South wall layout (x = −35 .. +35, total span 70 m):
            wall 1m | door 20m | pier 1.5m | door 20m | pier 1.5m | door 20m | wall 6m
          For visual symmetry of the door bays, the three door centers are
          at x = −24, 0, +24, each door 20 m wide. */}
      {(() => {
        const Z   = 35;
        const WT  = 0.5;
        const WALL_H = 12;
        const DOOR_W = 20;
        const DOOR_H = 11;            // bottom of header beam at y=11
        const HEADER_H = WALL_H - DOOR_H;  // 1.0 m header housing band
        const wallMatProps = { color: '#7a7570', roughness: 0.95, metalness: 0.05 } as const;
        const doorXs = [-24, 0, 24];
        // Pier (masonry) bays between/outside the doors
        const pierBays: Array<[number, number]> = [
          [-35, -24 - DOOR_W / 2],          // left outer wall (x=-35 .. -34)
          [-24 + DOOR_W / 2, -DOOR_W / 2],  // pier between door1 & door2 (-14..-10)
          [DOOR_W / 2, 24 - DOOR_W / 2],    // pier between door2 & door3 (10..14)
          [24 + DOOR_W / 2, 35],            // right outer wall (34..35)
        ];
        return (
          <group name="south-face">
            {/* Masonry piers between doors — full height */}
            {pierBays.map(([x0, x1], i) => {
              const w = x1 - x0;
              if (w <= 0.001) return null;
              return (
                <mesh
                  key={`south-pier-${i}`}
                  position={[(x0 + x1) / 2, WALL_H / 2, Z]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[w, WALL_H, WT]} />
                  <meshStandardMaterial {...wallMatProps} />
                </mesh>
              );
            })}
            {/* Continuous painted header lintel above all three doors —
                kept thin in Z so the torsion-spring assembly inside each
                door bay (mounted just behind the wall plane) reads from
                inside the engine room rather than being hidden inside a
                deep beam volume. */}
            <mesh position={[0, DOOR_H + HEADER_H / 2, Z]} castShadow receiveShadow>
              <boxGeometry args={[doorXs.length * DOOR_W + 3.0, HEADER_H, WT * 0.55]} />
              <meshStandardMaterial color="#5a5854" roughness={0.7} metalness={0.35} />
            </mesh>
            {/* Three garage doors */}
            {doorXs.map((dx, di) => (
              <GarageDoor
                key={`gdoor-${di}`}
                centerX={dx}
                z={Z}
                width={DOOR_W}
                height={DOOR_H}
                tag={`OHD-${di + 1}`}
              />
            ))}
          </group>
        );
      })()}

      {/* ─── ROOF ACCESS: fixed ladder + open roof hatch (walkModeWorld LADDER volume) ─── */}
      {(() => {
        const lx = (LADDER.xMin + LADDER.xMax) / 2;
        const lz = (LADDER.zMin + LADDER.zMax) / 2;
        const rungCount = Math.ceil((ROOF_WALK_Y - 0.2) / 0.34);
        const railMat = (
          <meshStandardMaterial color="#4a4a46" roughness={0.45} metalness={0.75} />
        );
        const rungMat = (
          <meshStandardMaterial color="#5c5c58" roughness={0.42} metalness={0.65} />
        );
        return (
          <group position={[lx, 0, lz]}>
            {/* Vertical rails */}
            <mesh position={[-0.52, ROOF_WALK_Y / 2, 0]} castShadow>
              <boxGeometry args={[0.07, ROOF_WALK_Y, 0.07]} />
              {railMat}
            </mesh>
            <mesh position={[0.52, ROOF_WALK_Y / 2, 0]} castShadow>
              <boxGeometry args={[0.07, ROOF_WALK_Y, 0.07]} />
              {railMat}
            </mesh>
            {/* Side cage stringers */}
            <mesh position={[-0.66, ROOF_WALK_Y / 2, -0.55]} castShadow>
              <boxGeometry args={[0.05, ROOF_WALK_Y, 0.05]} />
              {railMat}
            </mesh>
            <mesh position={[0.66, ROOF_WALK_Y / 2, -0.55]} castShadow>
              <boxGeometry args={[0.05, ROOF_WALK_Y, 0.05]} />
              {railMat}
            </mesh>
            {/* Rungs */}
            {Array.from({ length: rungCount }, (_, i) => (
              <mesh key={`rung-${i}`} position={[0, 0.18 + i * 0.34, 0]} castShadow>
                <boxGeometry args={[1.06, 0.035, 0.07]} />
                {rungMat}
              </mesh>
            ))}
            {/* Hatch opening (flush with walk surface y≈12.24) */}
            <mesh position={[0, 12.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.25, 1.85]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
            </mesh>
            {/* Corner trim through slab */}
            {[
              [-0.68, -0.72],
              [0.68, -0.72],
              [-0.68, 0.72],
              [0.68, 0.72],
            ].map(([px, pz], i) => (
              <mesh key={`trim-${i}`} position={[px, 12.06, pz]} castShadow>
                <boxGeometry args={[0.09, 0.45, 0.09]} />
                <meshStandardMaterial color="#6a6862" roughness={0.88} metalness={0.06} />
              </mesh>
            ))}
            {/* Safety grab rail at hatch */}
            <mesh position={[0, 12.72, 0.78]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 1.45, 8]} />
              <meshStandardMaterial color="#f4c430" roughness={0.35} metalness={0.5} />
            </mesh>
            {/* Small sign at base */}
            <mesh position={[0.85, 1.1, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[0.55, 0.22]} />
              <meshStandardMaterial color="#e8b010" roughness={0.55} metalness={0.15} />
            </mesh>
            <Text
              position={[0.86, 1.1, 0]}
              rotation={[0, -Math.PI / 2, 0]}
              fontSize={0.09}
              color="#1a1a1a"
              anchorX="center"
              anchorY="middle"
            >
              ROOF ACCESS
            </Text>
          </group>
        );
      })()}

      {/* ─── PIPES ON BACK WALL ─── */}
      <mesh position={[0, 10, -34.5]}>
        <cylinderGeometry args={[0.2, 0.2, 70, 12]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 8, -34.5]}>
        <cylinderGeometry args={[0.15, 0.15, 70, 12]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 6, -34.5]}>
        <cylinderGeometry args={[0.25, 0.25, 70, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[0, 3.5, -34.5]}>
        <cylinderGeometry args={[0.12, 0.12, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.5, -34.5]}>
        <cylinderGeometry args={[0.1, 0.1, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Vertical pipe drops on back wall */}
      {[-25, -15, -5, 5, 15, 25].map((x, i) => (
        <mesh key={`vdrop-${i}`} position={[x, 6, -34.5]}>
          <cylinderGeometry args={[0.06, 0.06, 8, 8]} />
          <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* Pipe flanges on back wall */}
      {[-20, 0, 20].map((x, i) => (
        <group key={`flng-${i}`} position={[x, 8, -34.5]}>
          <mesh>
            <cylinderGeometry args={[0.22, 0.22, 0.1, 12]} />
            <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
          </mesh>
          <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
            <meshStandardMaterial color="#999" roughness={0.3} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ─── PIPES ON LEFT WALL ─── */}
      <mesh position={[-34.5, 9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[-34.5, 6.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 70, 10]} />
        <meshStandardMaterial color="#b07030" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[-34.5, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 70, 12]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[-34.5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* ─── PIPES ON RIGHT WALL ─── */}
      <mesh position={[34.5, 9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[34.5, 6.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 70, 10]} />
        <meshStandardMaterial color="#b07030" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[34.5, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 70, 12]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[34.5, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* ─── CEILING PIPE RUNS ─── */}
      {[[-25, 11, 0], [0, 11, 0], [25, 11, 0]].map(([x, y, z], i) => (
        <mesh key={`cpr-${i}`} position={[x, y, z]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 60, 8]} />
          <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* Pipe hangers */}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <group key={`ph-${i}`} position={[x, 10, -20]}>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2, 5]} />
            <meshStandardMaterial color="#555" roughness={0.7} metalness={0.7} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.08, 0.06, 0.08]} />
            <meshStandardMaterial color="#666" roughness={0.6} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ─── SUPPORT COLUMNS ───
          Steel W-shape columns rest on the concrete slab (top at y=0) and
          run all the way up to the ceiling beams at y=12. Previous code
          centered the boxes at y=0 which buried half of every column
          below grade and left a 6 m air-gap between the column tops and
          the ceiling beams. */}
      {[[-25, -25], [-25, 25], [25, -25], [25, 25]].map(([x, z], i) => (
        <group key={`col-${i}`} position={[x, 0, z]}>
          {/* Column shaft — bottom at y=0.04 (above base plate), top at y=12.0 */}
          <mesh position={[0, (12.0 - 0.04) / 2 + 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.8, 12.0 - 0.04, 0.8]} />
            <meshStandardMaterial color="#6a6a68" roughness={0.7} metalness={0.5} />
          </mesh>
          {/* Bolted base plate sitting on top of the slab */}
          <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.2, 0.04, 1.2]} />
            <meshStandardMaterial color="#4a4a48" roughness={0.7} metalness={0.6} />
          </mesh>
          {/* Column cap plate at the underside of the ceiling beam */}
          <mesh position={[0, 12.05, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.10, 0.9]} />
            <meshStandardMaterial color="#555" roughness={0.5} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ─── WATER PUMPS (stand-in secondary sets — main duty pumps at CDWP/CHWP skids) ─── */}
      <group name="pump-standby-front" position={[-22, 0, -22]} rotation={[0, Math.PI * 0.22, 0]}>
        <EndSuctionHvacPump
          pipeRadius={0.22}
          duty="cdw"
          tag="P-BK1"
          name="pump:standby-1"
          running={condenserWaterFlowing}
          paint="crimson"
        />
      </group>
      <group name="pump-standby-rear" position={[-22, 0, 22]} rotation={[0, -Math.PI * 0.18, 0]}>
        <EndSuctionHvacPump
          pipeRadius={0.2}
          duty="chw"
          tag="P-BK2"
          name="pump:standby-2"
          running={evaporatorWaterFlowing}
          paint="crimson"
        />
      </group>

      {/* ─── WATER TANKS ─── */}
      {/* Vertical tank — right rear */}
      <group position={[22, 0, -22]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.4, 1.4, 5.5, 20]} />
          <meshStandardMaterial color="#5a5a58" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[1.5, 1.2, 0.8, 20]} />
          <meshStandardMaterial color="#4a4a48" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, -3.1, 0]}>
          <cylinderGeometry args={[1.5, 1.4, 0.6, 20]} />
          <meshStandardMaterial color="#4a4a48" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Legs */}
        {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((a, li) => (
          <mesh key={`leg-${li}`} position={[Math.cos(a)*1.6, -4.2, Math.sin(a)*1.6]}>
            <cylinderGeometry args={[0.08, 0.08, 1.8, 8]} />
            <meshStandardMaterial color="#555" roughness={0.6} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Bladder expansion tank — modeled in PidPlantSystems (CHR suction / CHWP). */}

      {/* ─── DUCTWORK ─── */}
      {/* Main supply duct */}
      <mesh position={[0, 11.5, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.8, 0.8, 70, 12]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Branch ducts */}
      <mesh position={[0, 10.5, 20]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 35, 10]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0, 10.5, -20]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 35, 10]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Duct reducers */}
      <mesh position={[0, 11.0, 20]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.8, 1.0, 10]} />
        <meshStandardMaterial color="#999999" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* ─── CABLE TRAY ─── */}
      <mesh position={[0, 11, -28]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[0.6, 0.1, 70]} />
        <meshStandardMaterial color="#4a8a4a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 11, 28]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[0.6, 0.1, 70]} />
        <meshStandardMaterial color="#4a8a4a" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Cable tray vertical drops */}
      {[-25, -15, -5, 5, 15, 25].map((x, i) => (
        <mesh key={`ctv-${i}`} position={[x, 9, -28]}>
          <boxGeometry args={[0.12, 4, 0.08]} />
          <meshStandardMaterial color="#4a8a4a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* ─── ELECTRIC CABINETS ─── */}
      <group position={[22, 0, 8]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 2.8, 0.9]} />
          <meshStandardMaterial color="#3a3a38" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.47]}>
          <planeGeometry args={[1.2, 2.4]} />
          <meshStandardMaterial color="#2a2a28" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0.5, 0, 0.5]}>
          <boxGeometry args={[0.08, 0.5, 0.06]} />
          <meshStandardMaterial color="#888" roughness={0.3} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.5, 0.48]}>
          <planeGeometry args={[0.8, 0.5]} />
          <meshStandardMaterial color="#001100" emissive="#003300" emissiveIntensity={0.8} />
        </mesh>
        {[[-0.3, 0.3], [0.3, 0.3], [-0.3, 0], [0.3, 0], [-0.3, -0.3], [0.3, -0.3]].map(([x, y], ci) => (
          <mesh key={`cled-${ci}`} position={[x, y, 0.5]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#00ff00" emissive="#00cc00" emissiveIntensity={1.2} />
          </mesh>
        ))}
      </group>

      {/* ─── CONTROL PANEL ─── */}
      <group position={[-28, 0, 0]} rotation={[0, Math.PI/2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[5, 3, 0.15]} />
          <meshStandardMaterial color="#2a2a28" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.4, 0.1]}>
          <planeGeometry args={[3.2, 1.6]} />
          <meshStandardMaterial color="#001400" emissive="#002800" emissiveIntensity={0.6} />
        </mesh>
        {Array.from({ length: 16 }).map((_, i) => (
          <mesh key={`led-${i}`} position={[-2 + (i % 4) * 1.3, 0.8 - Math.floor(i/4) * 0.35, 0.1]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? '#ff3333' : i % 3 === 1 ? '#ffaa22' : '#33ff66'}
              emissive={i % 3 === 0 ? '#ff0000' : i % 3 === 1 ? '#ff8800' : '#00cc44'}
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
        <mesh position={[-1.5, -0.9, 0.1]}>
          <planeGeometry args={[1.2, 0.8]} />
          <meshStandardMaterial color="#222" roughness={0.6} />
        </mesh>
        {[[-1.2, -1.0], [-1.2, -0.75], [-1.2, -0.5], [0, -1.0], [0, -0.75], [0, -0.5]].map(([x, y], bi) => (
          <mesh key={`key-${bi}`} position={[x, y, 0.12]}>
            <boxGeometry args={[0.18, 0.12, 0.05]} />
            <meshStandardMaterial color="#444" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/* ─── INSTRUMENT PANEL ─── */}
      <group position={[15, 0, -34]}>
        <mesh castShadow>
          <boxGeometry args={[1.0, 1.8, 0.4]} />
          <meshStandardMaterial color="#2a2a28" roughness={0.5} metalness={0.4} />
        </mesh>
        {[0, 0.6, 1.2].map((y, gi) => (
          <group key={`g-${gi}`} position={[0, y - 0.4, 0.22]}>
            <mesh>
              <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
              <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.12, 16]} />
              <meshStandardMaterial color="#f0ede6" roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI/3]}>
              <coneGeometry args={[0.015, 0.12, 4]} />
              <meshStandardMaterial color="#cc0000" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─── FIRE SAFETY ─── */}
      {/* Fire extinguisher 1 */}
      <group position={[8, 0, -30]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.85, 10]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.12, 0.08, 0.2, 8]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
      {/* Fire extinguisher 2 */}
      <group position={[-8, 0, -30]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.85, 10]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.12, 0.08, 0.2, 8]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>

      {/* Fire alarm panel */}
      <group position={[-33, 4, 10]} rotation={[0, Math.PI/2, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 1.0, 0.1]} />
          <meshStandardMaterial color="#333" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[0.6, 0.8]} />
          <meshStandardMaterial color="#220000" emissive="#440000" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.35, 0.06]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2.0} />
        </mesh>
      </group>

      {/* ─── SPRINKLER SYSTEM ─── */}
      <mesh position={[0, 11.8, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.06, 0.06, 70, 6]} />
        <meshStandardMaterial color="#cc3333" roughness={0.5} metalness={0.6} />
      </mesh>
      {[[-20, -15], [-10, -15], [0, -15], [10, -15], [20, -15],
        [-20, 0], [-10, 0], [0, 0], [10, 0], [20, 0],
        [-20, 15], [-10, 15], [0, 15], [10, 15], [20, 15]].map(([x, z], i) => (
        <group key={`spr-${i}`} position={[x, 11.3, z]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
            <meshStandardMaterial color="#cc3333" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, -0.4, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.12, 8]} />
            <meshStandardMaterial color="#dd4444" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ─── CONDUIT ON WALLS ─── */}
      <mesh position={[-33.5, 5, -15]} rotation={[0, Math.PI/2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 40, 6]} />
        <meshStandardMaterial color="#555" roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[-33.5, 7, 5]} rotation={[0, Math.PI/2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 40, 6]} />
        <meshStandardMaterial color="#555" roughness={0.7} metalness={0.5} />
      </mesh>

      {/* ─── FLOOR DRAINS ───
          Cast-iron drain frames sit on the slab top (y=0.004 / y=0.008 to
          stay slightly proud of the concrete and avoid z-fighting). */}
      {[[-15, -15], [-15, 15], [15, -15], [15, 15]].map(([x, z], i) => (
        <group key={`drain-${i}`} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.004, 0]}>
            <ringGeometry args={[0.25, 0.4, 12]} />
            <meshStandardMaterial color="#3a3a38" roughness={0.95} metalness={0.3} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.008, 0]}>
            <circleGeometry args={[0.25, 12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ─── SAFETY SHOWER ─── */}
      <group position={[10, 0, 30]}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[2.0, 2.0]} />
          <meshStandardMaterial color="#2a2a28" roughness={0.95} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[0.2, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 2.5, 8]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 2.1, 0]} rotation={[Math.PI, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.06, 0.2, 10]} />
          <meshStandardMaterial color="#888" roughness={0.3} metalness={0.9} />
        </mesh>
      </group>

      {/* ─── PIPE IDENTIFICATION BANDS ─── */}
      {[[-25, 10, -34.5], [0, 6, -34.5], [25, 8, -34.5]].map(([x, y, z], i) => (
        <mesh key={`band-${i}`} position={[x, y, z]} rotation={[0, Math.PI/2, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}

      {/* ─── CHILLER ANCHOR BOLTS ───
          Embedded plate + raised washer/nut on the slab top. */}
      {[[-2.5, -3], [-2.5, 3], [2.5, -3], [2.5, 3]].map(([x, z], i) => (
        <group key={`bolt-${i}`} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.004, 0]}>
            <circleGeometry args={[0.12, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.05, 0.1, 8]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ─── WALL CLOCK ─── */}
      <group position={[33, 10, -10]} rotation={[0, Math.PI/2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 24]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[0.32, 24]} />
          <meshStandardMaterial color="#f0ede6" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <boxGeometry args={[0.03, 0.22, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI/3]}>
          <boxGeometry args={[0.025, 0.16, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
      </group>

      {/* ─── WARNING SIGNS ─── */}
      {[[-33, 7, -20], [33, 7, -20], [0, 7, -33.5]].map(([x, y, z], i) => (
        <group key={`sign-${i}`} position={[x, y, z]} rotation={[0, i === 0 ? Math.PI/2 : i === 1 ? -Math.PI/2 : 0, 0]}>
          <mesh>
            <boxGeometry args={[0.6, 0.4, 0.03]} />
            <meshStandardMaterial color="#c8a830" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[0.5, 0.3]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        </group>
      ))}


      {/* ═══════════════════════════════════════════════
          CHILLED WATER PIPING (CHWS / CHWR)
          ─────────────────────────────────────────────
          Primary loop between the chiller evaporator
          (−Z barrel-head nozzles) and the rooftop AHU-1
          cooling coil. Each circuit:
            barrel-head nozzle (y≈2.30)
              → lateral stub  (along −Z)
              → 90° elbow     (existing barrel-head kit)
              → vertical drop (y=1.60 → y=1.10)
              → low-level header along −X
              → 90° tee at AHU column (x = AHU_X)
              → vertical riser through roof penetration
              → AHU coil section flange (y≈13.10)
          Pipe sizes: 24" Sch.40 carbon steel with 3"
          closed-cell foam insulation jacket per ASHRAE
          90.1 minimum thickness for chilled water service.
      ═══════════════════════════════════════════════ */}
      {(() => {
        const HEADER_Y    = 1.10;                         // low-level header centerline
        const CHW_ELBOW_R = 0.30;                         // long-radius barrel-head elbow (≈1.4 D for 17″ pipe)
        const HEADER_LEN  = Math.abs(CHW_X_SUPPLY - AHU_X) + 1.0; // chiller riser → past AHU tee
        const HEADER_CTR_X = (CHW_X_SUPPLY + AHU_X) / 2 - 0.5;
        return (
          <group>
            {(
              [
                ['sup', CHW_X_SUPPLY, CHW_Z_SUPPLY, CHW_Y_FLG_SUP, '#1c5aa8', '#143f7a'] as const,
                ['ret', CHW_X_RETURN, CHW_Z_RETURN, CHW_Y_FLG_RET, '#7eb8d8', '#5a9ec4'] as const,
              ]
            ).map(([key, xRiser, z, yFlg, pipeC, insC]) => {
              // Per-nozzle elbow tangent: the elbow centre is at yFlg − R, and
              // the riser-side tangent is at the same Y. Overlap 4 cm into
              // elbow body for a clean welded appearance.
              const elbowTanY = yFlg - CHW_ELBOW_R;
              const elbowOutY = elbowTanY + 0.04;
              const dropLen   = elbowOutY - HEADER_Y;
              const dropCtrY  = (elbowOutY + HEADER_Y) / 2;
              return (
              <group key={`chw-leg-${key}`}>
                {/* Short vertical drop from barrel-head elbow to header */}
                <mesh position={[xRiser, dropCtrY, z]}>
                  <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, dropLen, 16]} />
                  <meshStandardMaterial color={pipeC} roughness={0.6} metalness={0.4} />
                </mesh>
                <mesh position={[xRiser, dropCtrY, z]}>
                  <cylinderGeometry args={[MAIN_PIPE_INS_RADIUS, MAIN_PIPE_INS_RADIUS, Math.max(dropLen - 0.18, 0.05), 14]} />
                  <meshStandardMaterial color={insC} roughness={0.9} metalness={0.0} transparent opacity={0.92} />
                </mesh>
                {/* Welded tee at the chiller end of the header (vertical drop ↔ horizontal main) */}
                <mesh position={[xRiser, HEADER_Y, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.40, MAIN_PIPE_RADIUS * 1.40, 0.55, 16]} />
                  <meshStandardMaterial color={pipeC} roughness={0.5} metalness={0.5} />
                </mesh>
                {/* Companion flange pair at the tee (welded-neck flanges, ANSI 150) */}
                {[-MAIN_PIPE_RADIUS * 1.30, +MAIN_PIPE_RADIUS * 1.30].map((dx, fi) => (
                  <mesh
                    key={`chw-tee-flg-${key}-${fi}`}
                    position={[xRiser + dx, HEADER_Y, z]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.55, MAIN_PIPE_RADIUS * 1.55, 0.06, 16]} />
                    <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
                  </mesh>
                ))}
                {/* Horizontal header — 17" Sch.40 carbon steel (ASHRAE 90.1 + ARI 590) */}
                <mesh position={[HEADER_CTR_X, HEADER_Y, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, HEADER_LEN, 16]} />
                  <meshStandardMaterial color={pipeC} roughness={0.6} metalness={0.4} />
                </mesh>
                {/* Insulation jacket — full length minus the tee/valve gaps */}
                <mesh position={[HEADER_CTR_X, HEADER_Y, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[MAIN_PIPE_INS_RADIUS, MAIN_PIPE_INS_RADIUS, HEADER_LEN - 1.6, 14]} />
                  <meshStandardMaterial color={insC} roughness={0.9} metalness={0.0} transparent opacity={0.92} />
                </mesh>
                {/* Pipe support saddle on housekeeping pad mid-run */}
                {[-19, -10].map((sx, si) => (
                  <group key={`chw-saddle-${key}-${si}`} position={[sx, 0, z]}>
                    <mesh position={[0, 0.06, 0]}>
                      <boxGeometry args={[0.6, 0.12, 0.7]} />
                      <meshStandardMaterial color="#9a958e" roughness={0.95} metalness={0.02} />
                    </mesh>
                    <mesh position={[0, 0.42, 0]}>
                      <boxGeometry args={[0.18, 0.60, 0.18]} />
                      <meshStandardMaterial color="#5a5854" roughness={0.6} metalness={0.6} />
                    </mesh>
                    <mesh position={[0, HEADER_Y - 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
                      <torusGeometry args={[0.42, 0.022, 8, 18, Math.PI]} />
                      <meshStandardMaterial color="#666" roughness={0.55} metalness={0.7} />
                    </mesh>
                  </group>
                ))}
              </group>
              );
            })}

            {/* Inline OS&Y gate valves at chiller side of each header (~3 m from tee) */}
            <GateValve
              valveId="pipe_gate_chw_supply_chiller"
              position={[CHW_X_SUPPLY - 3.0, HEADER_Y, CHW_Z_SUPPLY]}
              pipeRadius={MAIN_PIPE_RADIUS}
              outerRadius={MAIN_PIPE_INS_RADIUS}
              bodyColor="#1c5aa8"
            />
            <GateValve
              valveId="pipe_gate_chw_return_chiller"
              position={[CHW_X_RETURN - 3.0, HEADER_Y, CHW_Z_RETURN]}
              pipeRadius={MAIN_PIPE_RADIUS}
              outerRadius={MAIN_PIPE_INS_RADIUS}
              bodyColor="#5a9ec4"
            />

            {/* Inline OS&Y gate valves at AHU coil riser branch points */}
            <GateValve
              valveId="pipe_gate_chw_supply_ahu"
              position={[CHW_RISER_X_SUP - 0.80, HEADER_Y, CHW_Z_SUPPLY]}
              pipeRadius={MAIN_PIPE_RADIUS}
              outerRadius={MAIN_PIPE_INS_RADIUS}
              bodyColor="#1c5aa8"
            />
            <GateValve
              valveId="pipe_gate_chw_return_ahu"
              position={[CHW_RISER_X_RET - 0.80, HEADER_Y, CHW_Z_RETURN]}
              pipeRadius={MAIN_PIPE_RADIUS}
              outerRadius={MAIN_PIPE_INS_RADIUS}
              bodyColor="#5a9ec4"
            />
          </group>
        );
      })()}

      {/* ─── ROOFTOP DECK (above machine room walls, y≈12) ───
          Slab is split so the roof-access shaft matches walkModeWorld LADDER
          (open hatch — no concrete over the opening). */}
      <group position={[0, 12.05, 0]}>
        {/* Depth-only occluder: invisible plane that writes depth across the
            entire roof footprint so the machine room is hidden when viewed from
            the rooftop. Rendered before the slab to establish occlusion. */}
        <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-1}>
          <planeGeometry args={[74, 74]} />
          <meshBasicMaterial colorWrite={false} depthWrite={true} />
        </mesh>
        {(() => {
          const m = 0.22;
          const hx0 = LADDER.xMin - m;
          const hx1 = LADDER.xMax + m;
          const hz0 = LADDER.zMin - m;
          const hz1 = LADDER.zMax + m;
          const deckMat = (
            <meshStandardMaterial color="#8c8880" roughness={0.92} metalness={0.04} />
          );
          const slabH = 0.38;
          const topY = slabH * 0.5;
          const holeW = hx1 - hx0;
          const holeD = hz1 - hz0;
          const cx = (hx0 + hx1) * 0.5;
          const cz = (hz0 + hz1) * 0.5;
          /* Four slabs around the rectangular void */
          const westW = hx0 - -36;
          const eastW = 36 - hx1;
          const southD = hz0 - -36;
          const northD = 36 - hz1;
          const openAngle = 1.12; /* ~64° — hatch propped open toward −Z (back corner) */
          return (
            <>
              <mesh position={[(hx0 + -36) * 0.5, 0, 0]} receiveShadow castShadow>
                <boxGeometry args={[westW, slabH, 72]} />
                {deckMat}
              </mesh>
              <mesh position={[(hx1 + 36) * 0.5, 0, 0]} receiveShadow castShadow>
                <boxGeometry args={[eastW, slabH, 72]} />
                {deckMat}
              </mesh>
              <mesh position={[cx, 0, (hz0 + -36) * 0.5]} receiveShadow castShadow>
                <boxGeometry args={[holeW, slabH, southD]} />
                {deckMat}
              </mesh>
              <mesh position={[cx, 0, (hz1 + 36) * 0.5]} receiveShadow castShadow>
                <boxGeometry args={[holeW, slabH, northD]} />
                {deckMat}
              </mesh>
              {/* Galvanized curb around the opening */}
              {[
                [cx, topY + 0.04, hz0 - 0.03, holeW + 0.16, 0.08, 0.06],
                [cx, topY + 0.04, hz1 + 0.03, holeW + 0.16, 0.08, 0.06],
                [hx0 - 0.03, topY + 0.04, cz, 0.06, 0.08, holeD + 0.16],
                [hx1 + 0.03, topY + 0.04, cz, 0.06, 0.08, holeD + 0.16],
              ].map(([px, py, pz, sx, sy, sz], i) => (
                <mesh key={`hatch-curb-${i}`} position={[px as number, py as number, pz as number]} castShadow>
                  <boxGeometry args={[sx as number, sy as number, sz as number]} />
                  <meshStandardMaterial color="#9a9a92" roughness={0.55} metalness={0.35} />
                </mesh>
              ))}
              {/* Hinged cover — open, resting back on the deck */}
              <group position={[cx, topY + 0.02, hz0]} rotation={[-openAngle, 0, 0]}>
                <mesh position={[0, 0.025, holeD * 0.5]} castShadow>
                  <boxGeometry args={[holeW + 0.08, 0.05, holeD + 0.06]} />
                  <meshStandardMaterial color="#5c5c58" roughness={0.42} metalness={0.55} />
                </mesh>
                <mesh position={[holeW * 0.42, 0.04, holeD * 0.55]} castShadow>
                  <cylinderGeometry args={[0.035, 0.035, 0.09, 8]} />
                  <meshStandardMaterial color="#3a3a38" roughness={0.4} metalness={0.75} />
                </mesh>
                <mesh position={[-holeW * 0.42, 0.04, holeD * 0.55]} castShadow>
                  <cylinderGeometry args={[0.035, 0.035, 0.09, 8]} />
                  <meshStandardMaterial color="#3a3a38" roughness={0.4} metalness={0.75} />
                </mesh>
              </group>
            </>
          );
        })()}
        {/* Parapet */}
        <mesh position={[0, 0.32, -36.1]}>
          <boxGeometry args={[74, 0.65, 0.35]} />
          <meshStandardMaterial color="#6a6862" roughness={0.9} metalness={0.06} />
        </mesh>
        <mesh position={[0, 0.32, 36.1]}>
          <boxGeometry args={[74, 0.65, 0.35]} />
          <meshStandardMaterial color="#6a6862" roughness={0.9} metalness={0.06} />
        </mesh>
        <mesh position={[-36.1, 0.32, 0]}>
          <boxGeometry args={[0.35, 0.65, 74]} />
          <meshStandardMaterial color="#6a6862" roughness={0.9} metalness={0.06} />
        </mesh>
        <mesh position={[36.1, 0.32, 0]}>
          <boxGeometry args={[0.35, 0.65, 74]} />
          <meshStandardMaterial color="#6a6862" roughness={0.9} metalness={0.06} />
        </mesh>
        {/* Roof curb around tower footprint */}
        <mesh position={[25, 0.28, CW_TOWER_Z]}>
          <boxGeometry args={[5.2, 0.45, 5.2]} />
          <meshStandardMaterial color="#5a5854" roughness={0.88} metalness={0.08} />
        </mesh>
        <mesh position={[25, 0.32, CW_TOWER_Z]}>
          <boxGeometry args={[4.4, 0.35, 4.4]} />
          <meshStandardMaterial color="#7a7670" roughness={0.9} metalness={0.05} />
        </mesh>
        {/* Roof curb around AHU footprint (rectangular, matches casing) */}
        <mesh position={[AHU_X, 0.28, AHU_Z]}>
          <boxGeometry args={[15.2, 0.45, 6.2]} />
          <meshStandardMaterial color="#5a5854" roughness={0.88} metalness={0.08} />
        </mesh>
        <mesh position={[AHU_X, 0.32, AHU_Z]}>
          <boxGeometry args={[14.4, 0.35, 5.4]} />
          <meshStandardMaterial color="#7a7670" roughness={0.9} metalness={0.05} />
        </mesh>
      </group>
      {/* (Roof penetration sleeves & flashing collars are emitted inline
          inside each CHW/CDW pipe group below for accurate per-pipe sizing.) */}

      {/* ── COOLING TOWER (rooftop, packaged induced-draft counterflow unit) ── */}
      <RooftopCoolingTower position={[25, 14.68, CW_TOWER_Z]} flowing={cdwLoopFlowing} />

      {/* ═══════════════════════════════════════════════
          CONDENSER WATER PIPING (CDWS / CDWR)
          ─────────────────────────────────────────────
          Counterflow cooling tower — CORRECT hydraulic path:

          CWS (hot water IN → tower TOP):
            chiller condenser supply nozzle (y≈0.30)
              → vertical riser up through roof
              → 90° elbow on rooftop turning +X
              → rooftop horizontal main
              → 90° elbow turning +Y (vertical)
              → vertical riser continues past distribution header
              → 90° elbow at fan deck turning −X (inward)
              → short stub into supply inlet stub on TOP of fan deck

          CWR (cold water OUT ← tower BASIN):
            basin outlet flange on −X face (y≈12.63)
              → short horizontal stub out through tower wall
              → 90° elbow turning −Y
              → vertical drop on tower exterior to roof main level
              → 90° elbow turning −X (toward chiller)
              → rooftop horizontal main back toward building
              → 90° elbow at building turning −Y
              → vertical riser down through roof penetration
              → chiller condenser return nozzle (y≈1.30)

          Pipe sizes: 24" Sch.40 carbon steel (uninsulated).
      ═══════════════════════════════════════════════ */}
      {(() => {
        const R            = 0.40;          // long-radius elbow CL radius
        const CDW_BARREL_R = 0.30;          // barrel-head elbow
        const ROOF_LINE_Y  = 12.05;         // top of rooftop deck
        const MAIN_Y       = CW_Y_ROOF_TOP; // 12.55 — horizontal main on roof

        // ── SUPPLY (CWS): chiller → tower top ────────────────────────────
        // Engine-room riser (supply): barrel nozzle → roof
        const SUP_ENG_BOT  = CW_Y_FLG_SUP - CDW_BARREL_R - 0.04;   // 0.30 − 0.30 − 0.04 = −0.04
        const SUP_ENG_TOP  = MAIN_Y - R;
        const SUP_ENG_LEN  = SUP_ENG_TOP - SUP_ENG_BOT;
        const SUP_ENG_CTR  = (SUP_ENG_BOT + SUP_ENG_TOP) / 2;
        // Rooftop horizontal main (supply): building riser → tower X
        const SUP_ROOF_X0  = CW_X_SUPPLY + R;         // after upper elbow
        const SUP_ROOF_X1  = CW_TOWER_SUP_X - R;      // before tower riser elbow (X=23.6)
        const SUP_ROOF_LEN = SUP_ROOF_X1 - SUP_ROOF_X0;
        const SUP_ROOF_CTR = (SUP_ROOF_X0 + SUP_ROOF_X1) / 2;
        // Tower-side vertical riser (supply): MAIN_Y up to fan-deck stub
        const SUP_TWR_BOT  = MAIN_Y + R;              // after elbow at tower base
        const SUP_TWR_TOP  = CW_TOWER_SUP_Y - R;      // below fan-deck elbow (17.16 − 0.40 = 16.76)
        const SUP_TWR_LEN  = SUP_TWR_TOP - SUP_TWR_BOT;
        const SUP_TWR_CTR  = (SUP_TWR_BOT + SUP_TWR_TOP) / 2;
        // Fan-deck entry stub: horizontal −X into top stub (supply at X=24.0)
        const SUP_STUB_X0  = CW_TOWER_SUP_X + R;      // from elbow face (24.0 + 0.40)
        const SUP_STUB_X1  = CW_TOWER_SUP_X - 0.05;   // into fan-deck flange
        const SUP_STUB_LEN = SUP_STUB_X0 - SUP_STUB_X1;
        const SUP_STUB_CTR = (SUP_STUB_X0 + SUP_STUB_X1) / 2;

        // ── RETURN (CWR): tower basin → chiller ──────────────────────────
        // Basin outlet flange at world [23.0, 12.63, CW_Z_RETURN]
        // Stub out from -X face: horizontal from flange to tower-exterior riser
        const RET_STUB_X0  = CW_TOWER_FLG_X - 0.05;  // just outside basin wall
        const RET_STUB_X1  = CW_TOWER_FLG_X - 0.95;  // tower-exterior riser X = 22.05
        const RET_TWR_X    = RET_STUB_X1 - 0;         // 22.05
        const RET_STUB_LEN = RET_STUB_X0 - RET_STUB_X1;
        const RET_STUB_CTR = (RET_STUB_X0 + RET_STUB_X1) / 2;
        // Tower-exterior vertical drop (return): basin Y → MAIN_Y
        const RET_TWR_TOP  = CW_TOWER_RET_Y - R;      // 12.63 − 0.40 = 12.23
        const RET_TWR_BOT  = MAIN_Y - R;              // 12.15
        const RET_TWR_LEN  = RET_TWR_TOP - RET_TWR_BOT;
        const RET_TWR_CTR  = (RET_TWR_BOT + RET_TWR_TOP) / 2;
        // Rooftop horizontal main (return): tower riser → building riser
        const RET_ROOF_X0  = CW_X_RETURN + R;
        const RET_ROOF_X1  = RET_TWR_X - R;
        const RET_ROOF_LEN = RET_ROOF_X1 - RET_ROOF_X0;
        const RET_ROOF_CTR = (RET_ROOF_X0 + RET_ROOF_X1) / 2;
        // Engine-room riser (return): barrel nozzle → roof
        const RET_ENG_BOT  = CW_Y_FLG_RET - CDW_BARREL_R - 0.04;
        const RET_ENG_TOP  = MAIN_Y - R;
        const RET_ENG_LEN  = RET_ENG_TOP - RET_ENG_BOT;
        const RET_ENG_CTR  = (RET_ENG_BOT + RET_ENG_TOP) / 2;

        const supC = '#1d7a3a'; const supLbl = '#0e5a22';
        const retC = '#7ec07a'; const retLbl = '#3e7a3a';

        return (
          <>
            {/* ── CWS: ENGINE-ROOM RISER (chiller supply nozzle → roof) ── */}
            <group key="cdw-sup">
              <mesh position={[CW_X_SUPPLY, SUP_ENG_CTR, CW_Z_SUPPLY]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, SUP_ENG_LEN, 16]} />
                <meshStandardMaterial color={supC} roughness={0.55} metalness={0.45} />
              </mesh>
              <mesh position={[CW_X_SUPPLY, ROOF_LINE_Y - 0.40, CW_Z_SUPPLY]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.55, MAIN_PIPE_RADIUS * 1.55, 0.06, 16]} />
                <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
              </mesh>
              <mesh position={[CW_X_SUPPLY, ROOF_LINE_Y, CW_Z_SUPPLY]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.45, MAIN_PIPE_RADIUS * 1.55, 0.45, 16]} />
                <meshStandardMaterial color="#7c8086" roughness={0.55} metalness={0.55} />
              </mesh>
              <mesh position={[CW_X_SUPPLY, ROOF_LINE_Y + 0.30, CW_Z_SUPPLY]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.85, MAIN_PIPE_RADIUS * 1.85, 0.04, 16]} />
                <meshStandardMaterial color="#5a5854" roughness={0.85} metalness={0.15} />
              </mesh>
              {/* 90° elbow: riser +Y → roof main +X */}
              <mesh position={[CW_X_SUPPLY + R, MAIN_Y - R, CW_Z_SUPPLY]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
                <meshStandardMaterial color={supC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Rooftop horizontal CWS main */}
              <mesh position={[SUP_ROOF_CTR, MAIN_Y, CW_Z_SUPPLY]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, SUP_ROOF_LEN, 16]} />
                <meshStandardMaterial color={supC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Sleepers */}
              {[SUP_ROOF_CTR - 4, SUP_ROOF_CTR + 4].map((sx, si) => (
                <group key={`sup-sleeper-${si}`}>
                  <mesh position={[sx, ROOF_LINE_Y + 0.36, CW_Z_SUPPLY]}>
                    <boxGeometry args={[0.32, 0.20, 0.50]} />
                    <meshStandardMaterial color="#3a3835" roughness={0.95} metalness={0.05} />
                  </mesh>
                  <mesh position={[sx, ROOF_LINE_Y + 0.50, CW_Z_SUPPLY]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.32, 0.022, 8, 18, Math.PI]} />
                    <meshStandardMaterial color="#666" roughness={0.55} metalness={0.7} />
                  </mesh>
                </group>
              ))}
              {/* 90° elbow at tower base: roof main +X → tower riser +Y */}
              <mesh position={[CW_TOWER_SUP_X - R, MAIN_Y, CW_Z_SUPPLY]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
                <meshStandardMaterial color={supC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Tower-side vertical riser (supply): roof level → fan deck */}
              <mesh position={[CW_TOWER_SUP_X, SUP_TWR_CTR, CW_Z_SUPPLY]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, SUP_TWR_LEN, 16]} />
                <meshStandardMaterial color={supC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* 90° elbow at fan deck: riser +Y → fan-deck stub −X (into tower top) */}
              <mesh position={[CW_TOWER_SUP_X, CW_TOWER_SUP_Y - R, CW_Z_SUPPLY]} rotation={[0, 0, Math.PI]}>
                <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
                <meshStandardMaterial color={supC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Fan-deck entry stub: horizontal stub into top of tower */}
              <mesh position={[SUP_STUB_CTR, CW_TOWER_SUP_Y, CW_Z_SUPPLY]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, SUP_STUB_LEN, 16]} />
                <meshStandardMaterial color={supC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Companion flange at fan-deck penetration */}
              <mesh position={[CW_TOWER_SUP_X - 0.05, CW_TOWER_SUP_Y, CW_Z_SUPPLY]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.55, MAIN_PIPE_RADIUS * 1.55, 0.06, 16]} />
                <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
              </mesh>
              {/* OS&Y gate valve — engine-room riser */}
              <GateValve
                valveId="pipe_gate_cdw_riser_sup"
                position={[CW_X_SUPPLY, 4.50, CW_Z_SUPPLY]}
                rotation={[0, 0, Math.PI / 2]}
                pipeRadius={MAIN_PIPE_RADIUS}
                bodyColor={supC}
              />
              {/* OS&Y gate valve — rooftop near tower */}
              <GateValve
                valveId="pipe_gate_cdw_roof_sup"
                position={[SUP_ROOF_X1 - 1.6, MAIN_Y, CW_Z_SUPPLY]}
                pipeRadius={MAIN_PIPE_RADIUS}
                bodyColor={supC}
              />
              <PipeLabel position={[SUP_ROOF_CTR - 4, MAIN_Y, CW_Z_SUPPLY]} axisAlong="x" pipeRadius={MAIN_PIPE_RADIUS} bgColor={supLbl} text="CONDENSER WATER SUPPLY" flowSign={-1} width={3.0} />
              <PipeLabel position={[SUP_ROOF_CTR + 4, MAIN_Y, CW_Z_SUPPLY]} axisAlong="x" pipeRadius={MAIN_PIPE_RADIUS} bgColor={supLbl} text="CWS" flowSign={-1} width={1.6} />
              <PipeLabel position={[CW_X_SUPPLY, 5.5, CW_Z_SUPPLY]} axisAlong="y" pipeRadius={MAIN_PIPE_RADIUS} bgColor={supLbl} text="CWS" flowSign={1} width={1.4} />
            </group>

            {/* ── CWR: TOWER BASIN → ENGINE-ROOM (cold water back to chiller) ── */}
            <group key="cdw-ret">
              {/* Basin stub-out from -X face */}
              <mesh position={[RET_STUB_CTR, CW_TOWER_RET_Y, CW_Z_RETURN]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, RET_STUB_LEN, 16]} />
                <meshStandardMaterial color={retC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Companion flange at basin wall */}
              <mesh position={[CW_TOWER_FLG_X - 0.05, CW_TOWER_RET_Y, CW_Z_RETURN]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.55, MAIN_PIPE_RADIUS * 1.55, 0.06, 16]} />
                <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
              </mesh>
              {/* 90° elbow: stub −X → vertical drop −Y */}
              <mesh position={[RET_TWR_X, CW_TOWER_RET_Y - R, CW_Z_RETURN]} rotation={[0, 0, -Math.PI / 2]}>
                <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
                <meshStandardMaterial color={retC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Tower exterior vertical drop (return): basin → roof main */}
              <mesh position={[RET_TWR_X, RET_TWR_CTR, CW_Z_RETURN]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, RET_TWR_LEN, 16]} />
                <meshStandardMaterial color={retC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* 90° elbow at roof level: riser −Y → roof main −X */}
              <mesh position={[RET_TWR_X - R, MAIN_Y, CW_Z_RETURN]} rotation={[0, 0, -Math.PI / 2]}>
                <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
                <meshStandardMaterial color={retC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Rooftop horizontal CWR main: tower → building */}
              <mesh position={[RET_ROOF_CTR, MAIN_Y, CW_Z_RETURN]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, RET_ROOF_LEN, 16]} />
                <meshStandardMaterial color={retC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Sleepers */}
              {[RET_ROOF_CTR - 4, RET_ROOF_CTR + 4].map((sx, si) => (
                <group key={`ret-sleeper-${si}`}>
                  <mesh position={[sx, ROOF_LINE_Y + 0.36, CW_Z_RETURN]}>
                    <boxGeometry args={[0.32, 0.20, 0.50]} />
                    <meshStandardMaterial color="#3a3835" roughness={0.95} metalness={0.05} />
                  </mesh>
                  <mesh position={[sx, ROOF_LINE_Y + 0.50, CW_Z_RETURN]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.32, 0.022, 8, 18, Math.PI]} />
                    <meshStandardMaterial color="#666" roughness={0.55} metalness={0.7} />
                  </mesh>
                </group>
              ))}
              {/* 90° elbow at building riser: roof main −X → riser −Y */}
              <mesh position={[CW_X_RETURN + R, MAIN_Y - R, CW_Z_RETURN]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
                <meshStandardMaterial color={retC} roughness={0.55} metalness={0.45} />
              </mesh>
              {/* Engine-room riser (return): roof → chiller return nozzle */}
              <mesh position={[CW_X_RETURN, RET_ENG_CTR, CW_Z_RETURN]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, RET_ENG_LEN, 16]} />
                <meshStandardMaterial color={retC} roughness={0.55} metalness={0.45} />
              </mesh>
              <mesh position={[CW_X_RETURN, ROOF_LINE_Y - 0.40, CW_Z_RETURN]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.55, MAIN_PIPE_RADIUS * 1.55, 0.06, 16]} />
                <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
              </mesh>
              <mesh position={[CW_X_RETURN, ROOF_LINE_Y, CW_Z_RETURN]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.45, MAIN_PIPE_RADIUS * 1.55, 0.45, 16]} />
                <meshStandardMaterial color="#7c8086" roughness={0.55} metalness={0.55} />
              </mesh>
              <mesh position={[CW_X_RETURN, ROOF_LINE_Y + 0.30, CW_Z_RETURN]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS * 1.85, MAIN_PIPE_RADIUS * 1.85, 0.04, 16]} />
                <meshStandardMaterial color="#5a5854" roughness={0.85} metalness={0.15} />
              </mesh>
              {/* OS&Y gate valve — engine-room riser */}
              <GateValve
                valveId="pipe_gate_cdw_riser_ret"
                position={[CW_X_RETURN, 4.50, CW_Z_RETURN]}
                rotation={[0, 0, Math.PI / 2]}
                pipeRadius={MAIN_PIPE_RADIUS}
                bodyColor={retC}
              />
              {/* OS&Y gate valve — rooftop near tower */}
              <GateValve
                valveId="pipe_gate_cdw_roof_ret"
                position={[RET_ROOF_X0 + 1.6, MAIN_Y, CW_Z_RETURN]}
                pipeRadius={MAIN_PIPE_RADIUS}
                bodyColor={retC}
              />
              <PipeLabel position={[RET_ROOF_CTR - 4, MAIN_Y, CW_Z_RETURN]} axisAlong="x" pipeRadius={MAIN_PIPE_RADIUS} bgColor={retLbl} text="CONDENSER WATER RETURN" flowSign={1} width={3.0} />
              <PipeLabel position={[RET_ROOF_CTR + 4, MAIN_Y, CW_Z_RETURN]} axisAlong="x" pipeRadius={MAIN_PIPE_RADIUS} bgColor={retLbl} text="CWR" flowSign={1} width={1.6} />
              <PipeLabel position={[CW_X_RETURN, 5.5, CW_Z_RETURN]} axisAlong="y" pipeRadius={MAIN_PIPE_RADIUS} bgColor={retLbl} text="CWR" flowSign={-1} width={1.4} />
            </group>
          </>
        );
      })()}

      {/* ═══════════════════════════════════════════════
          ROOFTOP AIR HANDLING UNIT (AHU-1)
          Conditions engine-room air via CHW coil.

          CHW SUPPLY / RETURN connection:
            in-room low-level header
              → 90° tee at coil-riser world-X
              → vertical riser through roof deck
              → 90° elbow on rooftop turning south (−Z)
              → short rooftop stub into AHU south (−Z) face
              → companion flange at casing penetration
              → internal coil-header stub (+Z into section)

          Supply enters the bottom of the coil headers (lower Y),
          return leaves the top (higher Y) — counter-flow against
          the air stream for maximum heat transfer effectiveness.
      ═══════════════════════════════════════════════ */}

      {/* AHU casing on rooftop curb.
          `cutaway` hides the exterior shell — main casing, panel seams,
          access doors, door frames, fan grilles, end caps, OA hood, control
          enclosure, and equipment labels — so the trainee can see straight
          into the cabinet at the MERV filter bank, CHW copper coil, twin
          housed centrifugal blowers, OA damper, and DS-AHU service
          disconnect. The rooftop curb, walkway, top-mounted relief / exhaust
          fans, VFDs, and overhead "AHU-1 — CUTAWAY" label remain so the
          unit still reads as an AHU at a distance. */}
      {/* ─── ROOFTOP AHU — imported GLB model (AHU-1) ─── */}
      <AhuGlbPreview
        url="/models/ahu/ahu.glb"
        position={[AHU_X, ROOF_WALK_Y, AHU_Z]}
        rotationY={0}
        targetWidth={AHU_W}
        label="AHU-1"
      />

      {/* ═══════════════════════════════════════════════════════════════
          CHW SUPPLY & RETURN — ENGINE ROOM HEADERS TO AHU GLB MODEL

          The GLB AHU sits at (AHU_X, ROOF_WALK_Y, AHU_Z), auto-scaled to
          AHU_W wide. Its south casing face is at Z = AHU_Z − AHU_D/2.
          Coil stub-outs exit through that south face at mid-unit X, at two
          heights: CHWS (supply, blue) at upper position, CHWR (return) below.

          Each pipe path:
            ① Casing stub: exits south face (−Z) horizontally ~0.6 m
            ② Companion flange at stub end
            ③ 90° long-radius elbow: turns −Z → −Y (straight down)
            ④ Vertical riser drops through rooftop curb + roof deck
            ⑤ Roof penetration flashing boot
            ⑥ Continues dropping to engine-room ceiling height
            ⑦ 90° elbow: −Y → ±Z toward respective CHW main
            ⑧ Horizontal run + tee into engine-room low-level CHW header
      ═══════════════════════════════════════════════════════════════ */}
      {(() => {
        const R    = 0.40;                 // long-radius elbow CL radius
        const PR   = MAIN_PIPE_RADIUS;
        const PINS = MAIN_PIPE_INS_RADIUS;

        /* AHU south casing face world Z */
        const SOUTH_FACE_Z = AHU_Z - AHU_D / 2;

        /* Stub-out X: centred on AHU, nudged ±0.30 m so pipes don't overlap */
        const CHWS_X = AHU_X + 0.30;    // supply — slight +X offset
        const CHWR_X = AHU_X - 0.30;    // return  — slight −X offset

        /* Stub-out Y heights on the south casing face.
           AHU GLB base = ROOF_WALK_Y, height ≈ AHU_H.
           Place CHWS at ~60 % of unit height, CHWR at ~35 %. */
        const CHWS_Y = ROOF_WALK_Y + AHU_H * 0.60;   // supply — upper stub
        const CHWR_Y = ROOF_WALK_Y + AHU_H * 0.35;   // return  — lower stub

        /* Stub extends 0.60 m south from the casing face before the elbow */
        const STUB_LEN  = 0.60;
        const STUB_TIP_Z = SOUTH_FACE_Z - STUB_LEN;   // where elbow entry starts

        /* Riser drops at Z = STUB_TIP_Z − R (south of elbow centre) */
        const RISER_Z = STUB_TIP_Z - R;

        /* Engine-room low-level CHW main elevation */
        const HEADER_Y = 1.10;

        return (
          <>
            {([
              {
                key:      'sup',
                pipeX:    CHWS_X,
                stubY:    CHWS_Y,
                hdrZ:     CHW_Z_SUPPLY,
                pipeC:    '#1c5aa8',
                insC:     '#143f7a',
                lblC:     '#0d3f7a',
                txt:      'CHWS',
                flowSign: -1 as const,
              },
              {
                key:      'ret',
                pipeX:    CHWR_X,
                stubY:    CHWR_Y,
                hdrZ:     CHW_Z_RETURN,
                pipeC:    '#7eb8d8',
                insC:     '#5a9ec4',
                lblC:     '#4a8ab8',
                txt:      'CHWR',
                flowSign: +1 as const,
              },
            ] as const).map(({ key, pipeX, stubY, hdrZ, pipeC, insC, lblC, txt, flowSign }) => {

              /* ① Casing stub — runs from south face outward in −Z */
              const STUB_CTR_Z = SOUTH_FACE_Z - STUB_LEN / 2;

              /* ② Companion flange at stub tip */
              const FLG_Z = STUB_TIP_Z;

              /* ③ Elbow centre: R south of flange, same Y as stub */
              const ELB_Z = FLG_Z - R;

              /* ④ Vertical drop: from elbow bottom to just above base elbow */
              const DROP_TOP_Y = stubY - R;
              const DROP_BOT_Y = HEADER_Y + R;
              const DROP_LEN   = Math.max(DROP_TOP_Y - DROP_BOT_Y, 0.05);
              const DROP_CTR_Y = (DROP_TOP_Y + DROP_BOT_Y) / 2;

              /* ⑦ Base elbow direction toward CHW main */
              const dir        = hdrZ > RISER_Z ? 1 : -1;
              const BASE_ELB_Z = RISER_Z + dir * R;

              /* ⑧ Horizontal run to tee */
              const H_LEN   = Math.max(Math.abs(RISER_Z - hdrZ) - R, 0.05);
              const H_CTR_Z = (RISER_Z + hdrZ) / 2;

              return (
                <group key={`chw-ahu-${key}`}>

                  {/* ① Casing stub (exits south face in −Z) */}
                  <mesh position={[pipeX, stubY, STUB_CTR_Z]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[PR, PR, STUB_LEN, 16]} />
                    <meshStandardMaterial color={pipeC} roughness={0.5} metalness={0.5} />
                  </mesh>
                  {/* Insulation on stub */}
                  <mesh position={[pipeX, stubY, STUB_CTR_Z]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[PINS, PINS, STUB_LEN - 0.10, 14]} />
                    <meshStandardMaterial color={insC} roughness={0.9} metalness={0.0} transparent opacity={0.92} />
                  </mesh>
                  {/* Casing wall boss (galvanized sleeve where pipe exits AHU) */}
                  <mesh position={[pipeX, stubY, SOUTH_FACE_Z - 0.06]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[PINS + 0.07, PINS + 0.07, 0.12, 14]} />
                    <meshStandardMaterial color="#6a7078" roughness={0.6} metalness={0.6} />
                  </mesh>

                  {/* ② Companion flange at stub tip */}
                  <mesh position={[pipeX, stubY, FLG_Z]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[PR * 1.90, PR * 1.90, 0.055, 16]} />
                    <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
                  </mesh>
                  {Array.from({ length: 6 }).map((_, bi) => {
                    const a = (bi / 6) * Math.PI * 2;
                    const bR = PR * 1.65;
                    return (
                      <mesh key={`flg-bolt-${key}-${bi}`}
                        position={[pipeX + Math.cos(a) * bR, stubY + Math.sin(a) * bR, FLG_Z - 0.04]}
                        rotation={[Math.PI / 2, 0, 0]}
                      >
                        <cylinderGeometry args={[0.016, 0.016, 0.06, 6]} />
                        <meshStandardMaterial color="#3b3a38" roughness={0.5} metalness={0.85} />
                      </mesh>
                    );
                  })}

                  {/* ③ 90° long-radius elbow: −Z → −Y (stub exits −Z, turns down −Y)
                       Torus centre at (pipeX, stubY, ELB_Z).
                       Rotation [−π/2, 0, π] sweeps the default XZ arc from the
                       +Z tangent point (meets stub tip) down to the −Y exit.   */}
                  <mesh position={[pipeX, stubY, ELB_Z]} rotation={[-Math.PI / 2, 0, Math.PI]}>
                    <torusGeometry args={[R, PR, 12, 24, Math.PI / 2]} />
                    <meshStandardMaterial color={pipeC} roughness={0.5} metalness={0.45} />
                  </mesh>

                  {/* ④ Vertical drop through curb + roof deck */}
                  <mesh position={[pipeX, DROP_CTR_Y, RISER_Z]}>
                    <cylinderGeometry args={[PR, PR, DROP_LEN, 16]} />
                    <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
                  </mesh>
                  {/* Insulation on drop */}
                  <mesh position={[pipeX, DROP_CTR_Y, RISER_Z]}>
                    <cylinderGeometry args={[PINS, PINS, Math.max(DROP_LEN - 0.50, 0.10), 14]} />
                    <meshStandardMaterial color={insC} roughness={0.9} metalness={0.0} transparent opacity={0.92} />
                  </mesh>

                  {/* ⑤ Roof penetration flashing boot */}
                  <mesh position={[pipeX, ROOF_WALK_Y - 0.12, RISER_Z]}>
                    <cylinderGeometry args={[PINS + 0.06, PINS + 0.14, 0.36, 16]} />
                    <meshStandardMaterial color="#7c8086" roughness={0.55} metalness={0.55} />
                  </mesh>

                  {/* ⑦ Base elbow: −Y → ±Z toward engine-room CHW main */}
                  <mesh
                    position={[pipeX, DROP_BOT_Y, BASE_ELB_Z]}
                    rotation={[Math.PI / 2, dir > 0 ? 0 : Math.PI, 0]}
                  >
                    <torusGeometry args={[R, PR, 12, 24, Math.PI / 2]} />
                    <meshStandardMaterial color={pipeC} roughness={0.5} metalness={0.45} />
                  </mesh>

                  {/* ⑧ Horizontal run to CHW main */}
                  <mesh position={[pipeX, HEADER_Y, H_CTR_Z]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[PR, PR, H_LEN, 16]} />
                    <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
                  </mesh>
                  <mesh position={[pipeX, HEADER_Y, H_CTR_Z]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[PINS, PINS, Math.max(H_LEN - 0.20, 0.05), 14]} />
                    <meshStandardMaterial color={insC} roughness={0.9} metalness={0.0} transparent opacity={0.92} />
                  </mesh>

                  {/* Tee fitting on engine-room CHW main */}
                  <mesh position={[pipeX, HEADER_Y, hdrZ]}>
                    <cylinderGeometry args={[PR * 1.35, PR * 1.35, 0.48, 16]} />
                    <meshStandardMaterial color={pipeC} roughness={0.5} metalness={0.5} />
                  </mesh>
                  {[-PR * 1.25, +PR * 1.25].map((dz, fi) => (
                    <mesh
                      key={`tee-flg-${key}-${fi}`}
                      position={[pipeX, HEADER_Y, hdrZ + dz]}
                      rotation={[Math.PI / 2, 0, 0]}
                    >
                      <cylinderGeometry args={[PR * 1.50, PR * 1.50, 0.06, 16]} />
                      <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
                    </mesh>
                  ))}

                  {/* Air vent below roof penetration */}
                  <AirVent
                    position={[pipeX, ROOF_WALK_Y - 0.60, RISER_Z]}
                    rotation={[0, 0, Math.PI / 2]}
                    pipeRadius={PR}
                  />

                  {/* Service ID label on vertical riser */}
                  <PipeLabel
                    position={[pipeX, DROP_CTR_Y, RISER_Z]}
                    axisAlong="y"
                    pipeRadius={PR + 0.05}
                    bgColor={lblC}
                    text={txt}
                    flowSign={flowSign}
                    width={1.0}
                  />
                </group>
              );
            })}
          </>
        );
      })()}

      {/* ── PIPE IDENTIFICATION BANDS on the low-level CHW headers ──
           ANSI A13.1 wraparound vinyl bands at maintenance-eye level
           every ~6 m on each header. Bands placed between equipment
           where the pipe is visible to operators in the engine room. */}
      {(
        [
          ['sup', CHW_Z_SUPPLY, '#0d3f7a', 'CHILLED WATER SUPPLY', 'CHWS', -1] as const,
          ['ret', CHW_Z_RETURN, '#4a8ab8', 'CHILLED WATER RETURN', 'CHWR', +1] as const,
        ]
      ).map(([key, z, bg, full, short, flow]) => (
        <group key={`chw-id-${key}`}>
          <PipeLabel
            position={[-15, 1.10, z]}
            axisAlong="x"
            pipeRadius={0.40}
            bgColor={bg}
            text={full}
            flowSign={flow}
            width={3.2}
          />
          <PipeLabel
            position={[-7, 1.10, z]}
            axisAlong="x"
            pipeRadius={0.40}
            bgColor={bg}
            text={short}
            flowSign={flow}
            width={1.6}
          />
        </group>
      ))}

      {/* ═══════════════════════════════════════════════════════════════════
          AHU-1 DUCT SYSTEM
          Supply air flows: AHU discharge plenum → supply trunk (roof)
            → roof penetration → engine-room ceiling trunk (west half)
            → branch ducts at each structural bay → supply diffusers
          Return air flows: engine-room ceiling return grilles
            → return trunk (east of building) → roof penetration
            → AHU mixing-box return connection

          Duct materials: 22-gauge galvanized steel, Pittsburgh lock seam.
          Supply trunk: 1.80 m wide × 1.40 m tall.
          Return trunk: 1.60 m wide × 1.20 m tall.
          Branches:     0.90 m wide × 0.50 m tall.
          All sizes correspond to ~200,000 CFM at 1,200 FPM face velocity.
      ═══════════════════════════════════════════════════════════════════ */}
      {(() => {
        /* ── Supply duct geometry ── */
        const SUP_Y_CEIL    = 11.0;           // bottom of supply trunk (hung from ceiling beams)
        const RET_Y_CEIL    = 10.6;           // bottom of return trunk
        const TRUNK_Z_CTR   = AHU_Z + 1.0;   // supply trunk Z (south of AHU)
        const RET_TRUNK_Z   = AHU_Z - 6.0;   // return trunk Z (north, toward chiller)

        /* Roof penetration world X — aligned with AHU discharge plenum center.
           Discharge plenum local center X ≈ (DISC_X_MIN+DISC_X_MAX)/2 = +8.2
           → world X = AHU_X + 8.2 = -13.8 */
        const PEN_X   = AHU_X + 8.2;         // supply duct roof penetration X
        const PEN_Z   = TRUNK_Z_CTR;         // same Z as supply trunk
        const PEN_Y_TOP  = AHU_BASE_Y - 0.10; // just below curb bottom
        const PEN_Y_BOT  = SUP_Y_CEIL;        // trunk top = engine-room ceiling level

        /* Engine-room supply trunk runs from penetration westward to far wall */
        const TRUNK_X_END  = -30;             // west end of engine room
        const TRUNK_LEN    = PEN_X - TRUNK_X_END;
        const TRUNK_X_CTR  = (PEN_X + TRUNK_X_END) / 2;

        /* Return trunk world X: west side of building */
        const RET_X_EAST   = -5;              // east end of return trunk (where building ends)
        const RET_X_WEST   = -30;             // west end
        const RET_TRUNK_LEN = RET_X_EAST - RET_X_WEST;
        const RET_TRUNK_CTR = (RET_X_EAST + RET_X_WEST) / 2;

        /* Branch ducts drop from the supply trunk at structural bay centers */
        const BRANCH_DROPS: number[] = [-22, -16, -10, -4];
        const BRANCH_LEN = 5.0;               // branch runs in Z away from trunk
        const BRANCH_Y_CTR = SUP_Y_CEIL + DUCT_H / 2 - 0.25 - 0.30;

        return (
          <group name="ahu:duct-system">
            {/* ═══════════════ SUPPLY SIDE ═══════════════ */}

            {/* Roof-level horizontal connector from AHU east discharge face
                to the vertical roof penetration — runs along the roof deck. */}
            <mesh
              position={[(AHU_EAST_X + PEN_X) / 2, AHU_BASE_Y + DUCT_H / 2, PEN_Z]}
              castShadow
            >
              <boxGeometry args={[Math.abs(PEN_X - AHU_EAST_X) + 0.02, DUCT_H, DUCT_W]} />
              <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
            </mesh>
            {/* Seam strips on top and sides of rooftop connector */}
            {[0, 1, 2, 3].map((si) => {
              const isX = si < 2;
              const offset = isX ? (si === 0 ? DUCT_W / 2 : -DUCT_W / 2) : (si === 2 ? DUCT_H : 0);
              const rotZ   = isX ? 0 : Math.PI / 2;
              const len    = Math.abs(PEN_X - AHU_EAST_X);
              return (
                <mesh
                  key={`sup-roof-seam-${si}`}
                  position={[(AHU_EAST_X + PEN_X) / 2, AHU_BASE_Y + (isX ? DUCT_H / 2 : offset / 2), PEN_Z + (isX ? offset : 0)]}
                  rotation={[0, 0, rotZ]}
                >
                  <boxGeometry args={[len, 0.04, 0.04]} />
                  <meshStandardMaterial color={DUCT_DARK} roughness={0.6} metalness={0.6} />
                </mesh>
              );
            })}

            {/* Roof-to-engine-room supply elbow / transition — vertical drop */}
            <mesh position={[PEN_X, (PEN_Y_TOP + PEN_Y_BOT) / 2, PEN_Z]} castShadow>
              <boxGeometry args={[DUCT_W, PEN_Y_TOP - PEN_Y_BOT + 0.20, DUCT_W]} />
              <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
            </mesh>
            {/* Roof penetration curb flashing */}
            <mesh position={[PEN_X, AHU_BASE_Y - 0.12, PEN_Z]}>
              <boxGeometry args={[DUCT_W + 0.22, 0.18, DUCT_W + 0.22]} />
              <meshStandardMaterial color="#7a8088" roughness={0.65} metalness={0.55} />
            </mesh>

            {/* Engine-room supply trunk — horizontal, hung at ceiling level
                running west from the supply penetration. */}
            <mesh position={[TRUNK_X_CTR, SUP_Y_CEIL + DUCT_H / 2, TRUNK_Z_CTR]} castShadow receiveShadow>
              <boxGeometry args={[TRUNK_LEN, DUCT_H, DUCT_W]} />
              <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
            </mesh>
            {/* Trunk seam strips (Pittsburgh lock, every 1.2 m) */}
            {Array.from({ length: Math.ceil(TRUNK_LEN / 1.2) }).map((_, si) => (
              <mesh
                key={`trunk-seam-${si}`}
                position={[TRUNK_X_END + si * 1.2, SUP_Y_CEIL + DUCT_H, TRUNK_Z_CTR]}
              >
                <boxGeometry args={[0.03, 0.03, DUCT_W + 0.04]} />
                <meshStandardMaterial color={DUCT_DARK} roughness={0.6} metalness={0.6} />
              </mesh>
            ))}
            {/* Duct hanger rods (every 2.4 m — code maximum) */}
            {Array.from({ length: Math.ceil(TRUNK_LEN / 2.4) }).map((_, hi) => {
              const hx = TRUNK_X_END + hi * 2.4;
              return (
                <group key={`trunk-hanger-${hi}`}>
                  {[-DUCT_W / 2 + 0.10, DUCT_W / 2 - 0.10].map((hz, hzi) => (
                    <mesh key={`hrod-${hi}-${hzi}`} position={[hx, 11.5, TRUNK_Z_CTR + hz]}>
                      <cylinderGeometry args={[0.016, 0.016, 11.5 - (SUP_Y_CEIL + DUCT_H), 6]} />
                      <meshStandardMaterial color="#5a5e64" roughness={0.5} metalness={0.85} />
                    </mesh>
                  ))}
                  {/* Trapeze angle iron */}
                  <mesh position={[hx, SUP_Y_CEIL + DUCT_H + 0.04, TRUNK_Z_CTR]}>
                    <boxGeometry args={[0.06, 0.06, DUCT_W + 0.30]} />
                    <meshStandardMaterial color="#4a4e54" roughness={0.55} metalness={0.75} />
                  </mesh>
                </group>
              );
            })}

            {/* ── Branch ducts dropping off the south face of the supply trunk ── */}
            {BRANCH_DROPS.map((bx, bi) => (
              <group key={`branch-${bi}`}>
                {/* Branch duct body */}
                <mesh
                  position={[bx, SUP_Y_CEIL + DUCT_H / 4, TRUNK_Z_CTR + DUCT_W / 2 + BRANCH_LEN / 2]}
                  castShadow
                >
                  <boxGeometry args={[0.90, 0.50, BRANCH_LEN]} />
                  <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
                </mesh>
                {/* Branch takeoff / tee at trunk */}
                <mesh
                  position={[bx, SUP_Y_CEIL + DUCT_H / 2 + 0.10, TRUNK_Z_CTR + DUCT_W / 2 + 0.02]}
                >
                  <boxGeometry args={[0.95, 0.55, 0.08]} />
                  <meshStandardMaterial color={DUCT_DARK} roughness={0.6} metalness={0.6} />
                </mesh>
                {/* Supply diffuser at branch end — perforated face plate */}
                <mesh
                  position={[bx, SUP_Y_CEIL + DUCT_H / 4, TRUNK_Z_CTR + DUCT_W / 2 + BRANCH_LEN + 0.03]}
                >
                  <boxGeometry args={[1.10, 0.65, 0.06]} />
                  <meshStandardMaterial color="#c8ccd2" roughness={0.4} metalness={0.5} />
                </mesh>
                {/* Diffuser face grid (horizontal bars) */}
                {Array.from({ length: 6 }).map((_, gi) => (
                  <mesh
                    key={`diff-bar-${bi}-${gi}`}
                    position={[bx, SUP_Y_CEIL + DUCT_H / 4 - 0.23 + gi * 0.09, TRUNK_Z_CTR + DUCT_W / 2 + BRANCH_LEN + 0.065]}
                  >
                    <boxGeometry args={[1.00, 0.015, 0.015]} />
                    <meshStandardMaterial color={DUCT_DARK} roughness={0.5} metalness={0.7} />
                  </mesh>
                ))}
                {/* Blue airflow indicator light on diffuser frame */}
                <mesh
                  position={[bx + 0.42, SUP_Y_CEIL + DUCT_H / 4 + 0.20, TRUNK_Z_CTR + DUCT_W / 2 + BRANCH_LEN + 0.07]}
                >
                  <boxGeometry args={[0.08, 0.08, 0.02]} />
                  <meshStandardMaterial color="#4488cc" emissive="#2266aa" emissiveIntensity={0.8} />
                </mesh>
                {/* Branch duct hanger */}
                <mesh
                  position={[bx, 11.5, TRUNK_Z_CTR + DUCT_W / 2 + BRANCH_LEN / 2]}
                >
                  <cylinderGeometry args={[0.012, 0.012, 11.5 - (SUP_Y_CEIL + 0.50), 6]} />
                  <meshStandardMaterial color="#5a5e64" roughness={0.5} metalness={0.85} />
                </mesh>
                {/* Branch section label */}
                <Text
                  position={[bx, BRANCH_Y_CTR + 0.35, TRUNK_Z_CTR + DUCT_W / 2 + 0.60]}
                  rotation={[0, 0, 0]}
                  fontSize={0.14}
                  color="#1a2030"
                  anchorX="center"
                  anchorY="middle"
                >
                  {`SA-${bi + 1}`}
                </Text>
              </group>
            ))}

            {/* ── Supply volume-control dampers in each branch (motorized VCD) ── */}
            {BRANCH_DROPS.map((bx, bi) => (
              <group key={`vcd-${bi}`} position={[bx, SUP_Y_CEIL + DUCT_H / 4, TRUNK_Z_CTR + DUCT_W / 2 + 0.60]}>
                {/* VCD body (thin slab across branch duct) */}
                <mesh>
                  <boxGeometry args={[0.88, 0.48, 0.06]} />
                  <meshStandardMaterial color="#4a5058" roughness={0.55} metalness={0.65} />
                </mesh>
                {/* VCD blade (single blade, horizontal pivot) */}
                <mesh>
                  <boxGeometry args={[0.82, 0.03, 0.42]} />
                  <meshStandardMaterial color="#6a7078" roughness={0.5} metalness={0.7} />
                </mesh>
                {/* Actuator box on branch side */}
                <mesh position={[0.50, 0.10, 0]}>
                  <boxGeometry args={[0.16, 0.14, 0.12]} />
                  <meshStandardMaterial color="#2a3240" roughness={0.5} metalness={0.4} />
                </mesh>
              </group>
            ))}

            {/* ═══════════════ RETURN SIDE ═══════════════ */}

            {/* Return air ceiling grilles — one per structural bay on north side */}
            {BRANCH_DROPS.map((bx, bi) => (
              <group key={`ret-grille-${bi}`}>
                {/* Grille face plate */}
                <mesh
                  position={[bx, RET_Y_CEIL + 1.20 - 0.03, RET_TRUNK_Z - 0.70]}
                >
                  <boxGeometry args={[1.20, 0.05, 0.80]} />
                  <meshStandardMaterial color="#c0c4c8" roughness={0.4} metalness={0.5} />
                </mesh>
                {/* Return grille horizontal bars */}
                {Array.from({ length: 6 }).map((_, gi) => (
                  <mesh
                    key={`ret-bar-${bi}-${gi}`}
                    position={[bx, RET_Y_CEIL + 1.17, RET_TRUNK_Z - 0.70 - 0.32 + gi * 0.12]}
                  >
                    <boxGeometry args={[1.14, 0.015, 0.015]} />
                    <meshStandardMaterial color={DUCT_DARK} roughness={0.5} metalness={0.7} />
                  </mesh>
                ))}
                {/* Return plenum box from grille to trunk */}
                <mesh position={[bx, RET_Y_CEIL + 1.20 / 2, RET_TRUNK_Z - 0.30]} castShadow>
                  <boxGeometry args={[1.10, 1.20, 0.70]} />
                  <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
                </mesh>
              </group>
            ))}

            {/* Return trunk running east → toward return riser */}
            <mesh position={[RET_TRUNK_CTR, RET_Y_CEIL + 0.60, RET_TRUNK_Z]} castShadow receiveShadow>
              <boxGeometry args={[RET_TRUNK_LEN, 1.20, 1.60]} />
              <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
            </mesh>
            {/* Return trunk hanger rods */}
            {Array.from({ length: Math.ceil(RET_TRUNK_LEN / 2.4) }).map((_, hi) => {
              const hx = RET_X_WEST + hi * 2.4;
              return (
                <group key={`ret-hanger-${hi}`}>
                  {[-0.65, 0.65].map((hz, hzi) => (
                    <mesh key={`rethrod-${hi}-${hzi}`} position={[hx, 11.5, RET_TRUNK_Z + hz]}>
                      <cylinderGeometry args={[0.012, 0.012, 11.5 - (RET_Y_CEIL + 1.20), 6]} />
                      <meshStandardMaterial color="#5a5e64" roughness={0.5} metalness={0.85} />
                    </mesh>
                  ))}
                  <mesh position={[hx, RET_Y_CEIL + 1.20 + 0.04, RET_TRUNK_Z]}>
                    <boxGeometry args={[0.06, 0.06, 1.50]} />
                    <meshStandardMaterial color="#4a4e54" roughness={0.55} metalness={0.75} />
                  </mesh>
                </group>
              );
            })}

            {/* Return trunk seam strips */}
            {Array.from({ length: Math.ceil(RET_TRUNK_LEN / 1.2) }).map((_, si) => (
              <mesh
                key={`ret-seam-${si}`}
                position={[RET_X_WEST + si * 1.2, RET_Y_CEIL + 1.20, RET_TRUNK_Z]}
              >
                <boxGeometry args={[0.03, 0.03, 1.64]} />
                <meshStandardMaterial color={DUCT_DARK} roughness={0.6} metalness={0.6} />
              </mesh>
            ))}

            {/* ═══ RETURN AIR — mounted on the AHU south face ═══
                The return-air connection is a sheet-metal plenum collar
                bolted directly to the AHU casing south (−Z) panel, in
                the OA / mixing-box section.  The return trunk runs along
                the engine-room ceiling and rises vertically through the
                roof deck into this collar.

                OA section world X centre = AHU_X + (OA_X_MIN+OA_X_MAX)/2
                  = AHU_X + (−9.0 + −5.5)/2 = AHU_X − 7.25 = −29.25
                South face world Z = AHU_SOUTH_Z
                Collar sits at mid-height of the casing on that face. */}
            {(() => {
              const OA_SEC_WX  = AHU_X - 7.25;       // world X of OA section centre
              const COL_W      = 2.20;                // collar width (along X)
              const COL_H      = 1.80;                // collar height (along Y)
              const COL_D      = 0.30;                // collar depth (along Z, protruding south)
              const COL_CY     = AHU_Y - 0.20;        // collar centre Y (mid-casing)
              const COL_FACE_Z = AHU_SOUTH_Z - COL_D / 2;  // collar box centre Z

              /* Return riser rises from the return trunk to the collar inlet face */
              const RET_RISER_X   = OA_SEC_WX;
              const RET_RISER_Z   = RET_TRUNK_Z;
              const RET_RISER_BOT = RET_Y_CEIL + 1.20;
              const RET_RISER_TOP = AHU_SOUTH_Z - COL_D;   // bottom of collar
              const RET_RISER_LEN = RET_RISER_TOP - RET_RISER_BOT;
              const RET_RISER_CTR = (RET_RISER_BOT + RET_RISER_TOP) / 2;

              /* Horizontal rooftop run from riser to directly below collar */
              const ROOF_RUN_LEN_Z = Math.abs(RET_RISER_Z - AHU_SOUTH_Z);
              const ROOF_RUN_CTR_Z = (RET_RISER_Z + AHU_SOUTH_Z) / 2;
              const ROOF_ELBOW_Y   = RET_Y_CEIL + 1.20; // top of riser = bottom of elbow

              return (
                <group name="ahu:return-air-assembly">
                  {/* ── Collar / plenum box bolted onto AHU south face ── */}
                  <mesh position={[OA_SEC_WX, COL_CY, COL_FACE_Z]} castShadow>
                    <boxGeometry args={[COL_W, COL_H, COL_D]} />
                    <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
                  </mesh>
                  {/* Collar flange bolted to AHU casing — dark border ring */}
                  {[
                    [COL_W / 2 + 0.05, 0],
                    [-COL_W / 2 - 0.05, 0],
                    [0, COL_H / 2 + 0.05],
                    [0, -COL_H / 2 - 0.05],
                  ].map(([dx, dy], fi) => (
                    <mesh
                      key={`col-flg-${fi}`}
                      position={[OA_SEC_WX + dx, COL_CY + dy, AHU_SOUTH_Z - 0.02]}
                    >
                      <boxGeometry
                        args={[
                          Math.abs(dy) > 0 ? COL_W + 0.12 : 0.07,
                          Math.abs(dy) > 0 ? 0.07 : COL_H + 0.12,
                          0.04,
                        ]}
                      />
                      <meshStandardMaterial color={DUCT_DARK} roughness={0.6} metalness={0.65} />
                    </mesh>
                  ))}
                  {/* Bolt pattern on collar flange */}
                  {Array.from({ length: 10 }).map((_, bi) => {
                    const ang = (bi / 10) * Math.PI * 2;
                    const bx  = OA_SEC_WX + Math.cos(ang) * (COL_W / 2 + 0.03);
                    const by  = COL_CY     + Math.sin(ang) * (COL_H / 2 + 0.03);
                    return (
                      <mesh key={`col-bolt-${bi}`} position={[bx, by, AHU_SOUTH_Z - 0.03]}>
                        <cylinderGeometry args={[0.018, 0.018, 0.05, 6]} />
                        <meshStandardMaterial color="#3b3a38" roughness={0.5} metalness={0.85} />
                      </mesh>
                    );
                  })}
                  {/* Return-air grille face on the south (outside) face of the collar */}
                  <mesh position={[OA_SEC_WX, COL_CY, AHU_SOUTH_Z - COL_D - 0.025]}>
                    <boxGeometry args={[COL_W - 0.04, COL_H - 0.04, 0.05]} />
                    <meshStandardMaterial color="#c0c4c8" roughness={0.4} metalness={0.5} />
                  </mesh>
                  {/* Grille horizontal bars */}
                  {Array.from({ length: 9 }).map((_, gi) => (
                    <mesh
                      key={`ret-col-bar-${gi}`}
                      position={[OA_SEC_WX, COL_CY - COL_H / 2 + 0.10 + gi * (COL_H - 0.20) / 8, AHU_SOUTH_Z - COL_D - 0.05]}
                    >
                      <boxGeometry args={[COL_W - 0.08, 0.018, 0.018]} />
                      <meshStandardMaterial color={DUCT_DARK} roughness={0.5} metalness={0.7} />
                    </mesh>
                  ))}

                  {/* ── Vertical return riser from engine-room ceiling trunk ── */}
                  <mesh position={[RET_RISER_X, RET_RISER_CTR, RET_RISER_Z]} castShadow>
                    <boxGeometry args={[COL_W, RET_RISER_LEN, COL_W]} />
                    <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
                  </mesh>
                  {/* Roof penetration boot on riser */}
                  <mesh position={[RET_RISER_X, AHU_BASE_Y - 0.12, RET_RISER_Z]}>
                    <boxGeometry args={[COL_W + 0.22, 0.18, COL_W + 0.22]} />
                    <meshStandardMaterial color="#7a8088" roughness={0.65} metalness={0.55} />
                  </mesh>
                  {/* Riser seam strips */}
                  {[0, 1, 2, 3].map((si) => (
                    <mesh
                      key={`ret-riser-seam-${si}`}
                      position={[
                        RET_RISER_X + (si % 2 === 0 ? 1 : -1) * (COL_W / 2 + 0.015),
                        RET_RISER_CTR,
                        RET_RISER_Z + (si < 2 ? 1 : -1) * (COL_W / 2 + 0.015),
                      ]}
                    >
                      <boxGeometry args={[0.03, RET_RISER_LEN, 0.03]} />
                      <meshStandardMaterial color={DUCT_DARK} roughness={0.6} metalness={0.6} />
                    </mesh>
                  ))}

                  {/* 90° rooftop elbow: riser turns from +Y to −Z (toward AHU south face) */}
                  <mesh position={[RET_RISER_X, ROOF_ELBOW_Y + COL_W / 2, AHU_SOUTH_Z + COL_W / 2]}>
                    <boxGeometry args={[COL_W, COL_W, COL_W]} />
                    <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
                  </mesh>

                  {/* Rooftop horizontal run from elbow to collar south face */}
                  <mesh position={[RET_RISER_X, RET_Y_CEIL + 1.20 + COL_W / 2, ROOF_RUN_CTR_Z]} castShadow>
                    <boxGeometry args={[COL_W, COL_H * 0.70, ROOF_RUN_LEN_Z]} />
                    <meshStandardMaterial color={DUCT_SKIN} roughness={0.55} metalness={0.55} />
                  </mesh>
                  {/* Seam on rooftop horizontal */}
                  {[-COL_W / 2 + 0.015, COL_W / 2 - 0.015].map((dx, si) => (
                    <mesh
                      key={`ret-roof-seam-${si}`}
                      position={[RET_RISER_X + dx, RET_Y_CEIL + 1.20 + COL_W / 2, ROOF_RUN_CTR_Z]}
                    >
                      <boxGeometry args={[0.03, COL_H * 0.70 + 0.04, ROOF_RUN_LEN_Z]} />
                      <meshStandardMaterial color={DUCT_DARK} roughness={0.6} metalness={0.6} />
                    </mesh>
                  ))}

                  {/* Return duct service label on the collar face */}
                  <Text
                    position={[OA_SEC_WX, COL_CY + COL_H / 2 + 0.25, AHU_SOUTH_Z - COL_D / 2]}
                    fontSize={0.20}
                    color="#1a2030"
                    anchorX="center"
                    anchorY="middle"
                  >
                    RETURN AIR
                  </Text>
                  <Text
                    position={[OA_SEC_WX, COL_CY - COL_H / 2 - 0.18, AHU_SOUTH_Z - COL_D / 2]}
                    fontSize={0.13}
                    color="#4a5058"
                    anchorX="center"
                    anchorY="middle"
                  >
                    RA-1 / AHU-1
                  </Text>
                </group>
              );
            })()}

            {/* Supply duct label on engine-room trunk */}
            <Text
              position={[TRUNK_X_CTR, SUP_Y_CEIL + DUCT_H + 0.22, TRUNK_Z_CTR]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.22}
              color="#1a2030"
              anchorX="center"
              anchorY="middle"
            >
              SUPPLY AIR — SA-MAIN
            </Text>
          </group>
        );
      })()}

      {/* Chiller GLB model + HMI mounted on the cabinet's +X face (the same
          face that displays the YORK_Baked logo plate, on Cube002_Baked). */}
      <ChillerModel
        position={[0, 0, 0]}
        onHmiZoom={onHmiZoom}
        hmiLookAtRef={hmiLookAtRef}
        hmiZoomed={hmiZoomed}
        vfdOccluderRef={vfdOccluderRef}
      />

      {/* ─── YORK OptiSpeed™ VARIABLE FREQUENCY DRIVE ───
           Floor-standing 480 V / 600 HP VSD that powers the chiller's
           centrifugal compressor motor. Sited on the +X side of the
           chiller, longitudinally aligned with the compressor housing
           (Sphere003_Baked center z ≈ −2.61) so the top-entry power
           conduit runs in a clean two-elbow path back to the motor
           terminal box. The −X face of the VFD also exits a small ¾"
           EMT carrying RUN, FAULT, SPEED-REF, and BACnet over to the
           secondary chiller control sub-cabinet (Cube001_Baked, center
           z ≈ −0.62) on the same +X face the OptiView HMI is mounted
           to. Door faces +X (away from chiller) so a technician stands
           with their back to the chiller while operating the drive,
           leaving full clearance to the OptiView HMI on the chiller. */}
      {(() => {
        // Cabinet siting (matches Vfd defaults: W=1.6 along Z, D=0.8 along X,
        // H=3.85 along Y, sitting on a PLINTH_H=0.20 m housekeeping pad).
        // The taller 3.85 m enclosure represents a fully-loaded YORK
        // OptiSpeed™ lineup (control + power + harmonic-mitigation bays)
        // and gives the drive proper visual presence next to the chiller.
        const VFD_X     = 4.2;
        const VFD_Z     = -2.6;
        const VFD_W     = 1.6;
        const VFD_H     = 3.85;
        const VFD_D     = 0.8;
        const PLINTH_H  = 0.20;
        const UPPER_FRAC = 0.58;

        // Top conduit hub world position (matches Vfd internal layout):
        //   local (-D/2 + 0.18, cabY + H/2 + 0.024, 0) at the top of nipple
        //   cabY = PLINTH_H + H/2
        const TOP_HUB: [number, number, number] = [
          VFD_X - VFD_D / 2 + 0.18,
          PLINTH_H + VFD_H + 0.024 + 0.10,    // include the 0.10 m nipple stub
          VFD_Z,
        ];

        // Side control hub world position:
        //   local (-D/2 - 0.001, cabY + UPPER_CY + 0.05, W/2 - 0.18)
        //   UPPER_CY = SPLIT_Y + UPPER_H/2 with UPPER_H = UPPER_FRAC * H
        const cabY      = PLINTH_H + VFD_H / 2;
        const SPLIT_Y   = -VFD_H / 2 + VFD_H * (1 - UPPER_FRAC);
        const UPPER_CY  = SPLIT_Y + (VFD_H * UPPER_FRAC) / 2;
        const SIDE_HUB: [number, number, number] = [
          VFD_X - VFD_D / 2 - 0.06,        // include nipple end
          cabY + UPPER_CY + 0.05,
          VFD_Z + VFD_W / 2 - 0.18,
        ];

        // Compressor motor terminal box on the +X face of Sphere003_Baked
        // (center 0.91, 2.95, −2.61, size 1.57 × 2.77 × 1.57). +X face = 1.69.
        const MOTOR_T: [number, number, number] = [1.70, 2.95, -2.60];

        // Control entry on the chiller secondary cabinet (Cube001_Baked,
        // center 0.97, 2.78, −0.62, size 0.67 × 2.26 × 1.57). +X face = 1.30.
        const CTRL_E: [number, number, number] = [1.31, 2.30, -0.62];

        return (
          <>
            <Vfd
              position={[VFD_X, 0, VFD_Z]}
              height={VFD_H}
              tag="VSD-1"
              running={compressorRunning}
              screenAnchorRef={vfdScreenAnchorRef}
              zoomed={vfdZoomed}
              onZoom={onVfdZoom}
              occluderRef={vfdOccluderRef}
            />
            <VfdWiring
              vfdTopHub={TOP_HUB}
              vfdSideHub={SIDE_HUB}
              motorTerminal={MOTOR_T}
              controlEntry={CTRL_E}
              runY={5.0}
            />
          </>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════
          BARREL-HEAD CONNECTION KIT
          ────────────────────────────────────────────────────────────────
          Marine-waterbox style flanged tie-ins from the chiller piping
          to the shell-and-tube barrel HEADS (planar dished end-plates):

            Plane001_Baked  z = −4.65   ←  CHW (evaporator, upper shell)
            Plane_Baked     z = +4.65   ←  CDW (condenser,  lower shell)

          Each circuit has TWO nozzles per head (split-pass waterbox):
          one supply, one return, side-by-side at the modelled Y of the
          OEM nozzle (CHW @ 2.30, CDW @ 2.05 — snapped to Cylinder017/018
          in Chiller_R2.glb).

          For each nozzle the geometry chain is:
            head plate face
              → bolted ANSI raised-face flange pair (welded-neck +
                companion + spiral-wound gasket + bolt circle)
              → short pipe spool (lateral stub)
              → 90° long-radius elbow turning toward the riser
              → vertical riser to the rest of the loop
          All Z math is derived from the constants block so the spool
          length is exactly (riser_z − head_face) − R_elbow − FLANGE_OUTSET
          with NO overlap or daylight at any joint.
      ════════════════════════════════════════════════════════════════ */}

      {(() => {
        // Common per-circuit elbow + stub geometry helper.
        // ──────────────────────────────────────────────────────────────
        // Inputs are world-space scalars; outputs are positions/lengths
        // for the ONE-circuit chain (one supply or one return).
        function chain(opts: {
          xRiser: number;          // riser/lateral X (= nozzle X on head)
          yFlange: number;         // gasket/lateral centerline Y
          zHeadFace: number;       // head plate outer face Z (signed)
          zRiser: number;          // riser centerline Z (signed)
          elbowR: number;          // long-radius elbow radius
        }) {
          const { xRiser, yFlange, zHeadFace, zRiser, elbowR } = opts;
          // Sign convention: zSign = direction from head toward riser
          //   CHW: head at −4.65, riser at −5.60 → zSign = −1
          //   CDW: head at +4.65, riser at +5.60 → zSign = +1
          const zSign = Math.sign(zRiser - zHeadFace);
          // Gasket plane sits one FLANGE_OUTSET outside the head face.
          const zFlange    = zHeadFace + zSign * FLANGE_OUTSET;
          // Pipe-side end of the flange assembly (where the spool starts).
          const zPipeEnd   = zFlange   + zSign * FLANGE_OUTSET;
          // Elbow centerline + its lateral-side tangent.
          const zElbowCtr  = zRiser    - zSign * elbowR;
          const zElbowTan  = zElbowCtr;                     // lateral tangent (Z of elbow ctr)
          // Spool spans from flange pipe end to elbow tangent.
          // Add a small 0.03 overlap into the elbow body for a clean weld.
          const overlap    = 0.03;
          const zSpoolFar  = zElbowTan - zSign * overlap;   // toward elbow, slip in a hair
          const spoolLen   = Math.abs(zPipeEnd - zSpoolFar);
          const zSpoolCtr  = (zPipeEnd + zSpoolFar) / 2;
          // Elbow geometry (verified by tracing torus rotation):
          //   CHW (rotation [0, π/2, 0]):  elbow loop = (0, R sinθ, −R cosθ)
          //     θ=0:    (z_ctr − R, y_ctr)   tangent +Y → riser side
          //     θ=π/2:  (z_ctr,    y_ctr+R) tangent +Z → lateral side
          //   CDW (rotation [0, −π/2, 0]): elbow loop = (0, R sinθ, +R cosθ)
          //     θ=0:    (z_ctr + R, y_ctr)   tangent +Y → riser side
          //     θ=π/2:  (z_ctr,    y_ctr+R) tangent −Z → lateral side
          // In BOTH cases the lateral pipe (at y = yFlange) sits R above
          // the elbow centre, so the elbow centre Y must be yFlange − R.
          // The riser-side tangent point is at the same Y as the elbow
          // centre, so the riser TERMINATES at y = yFlange − R.
          const yElbowCtr = yFlange - elbowR;
          const yElbowTan = yElbowCtr;                       // riser bottom Y
          return {
            zSign, zFlange, zPipeEnd, zElbowCtr,
            zSpoolCtr, spoolLen, yElbowCtr, yElbowTan,
            xRiser, yFlange,
          };
        }

        // Bend centerline radii at the barrel-head 90° (must exceed MAIN_PIPE_RADIUS for torus mesh).
        // Matches CHW_ELBOW_R / CDW_BARREL_R in the riser blocks above so the
        // riser-side tangent and the lateral-side tangent meet exactly.
        const CHW_R = 0.30;
        const CDW_R = 0.30;
        const chwSup = chain({ xRiser: CHW_X_SUPPLY, yFlange: CHW_Y_FLG_SUP,
                               zHeadFace: CHW_STUB_Z_IN, zRiser: CHW_Z_SUPPLY, elbowR: CHW_R });
        const chwRet = chain({ xRiser: CHW_X_RETURN, yFlange: CHW_Y_FLG_RET,
                               zHeadFace: CHW_STUB_Z_IN, zRiser: CHW_Z_RETURN, elbowR: CHW_R });
        const cdwSup = chain({ xRiser: CW_X_SUPPLY,  yFlange: CW_Y_FLG_SUP,
                               zHeadFace: CW_STUB_Z_IN,  zRiser: CW_Z_SUPPLY,  elbowR: CDW_R });
        const cdwRet = chain({ xRiser: CW_X_RETURN,  yFlange: CW_Y_FLG_RET,
                               zHeadFace: CW_STUB_Z_IN,  zRiser: CW_Z_RETURN,  elbowR: CDW_R });

        // Render one nozzle's complete connection chain.
        // ──────────────────────────────────────────────────────────────
        // For the FlangedConnection rotation: pipe extends along world Z
        // away from the head. With our component's pipe along LOCAL +X:
        //    zSign = −1 (CHW, pipe goes −Z) → rotation Y = +π/2
        //    zSign = +1 (CDW, pipe goes +Z) → rotation Y = −π/2
        // For the elbow torus: rotation orients the arc in the YZ plane.
        //    CHW arc 0→π/2 with rotation [0, π/2, 0] sweeps from
        //      (z = elbowCtr − R) tangent +Y → (z = elbowCtr) tangent +Z
        //    CDW arc 0→π/2 with rotation [0, −π/2, 0] sweeps from
        //      (z = elbowCtr + R) tangent +Y → (z = elbowCtr) tangent −Z
        function NozzleChain({
          c, pipeColor, insColor, elbowR, boltCount, insulated, vesselColor,
        }: {
          c: ReturnType<typeof chain>;
          pipeColor: string;
          insColor:  string;
          elbowR:    number;
          boltCount: number;
          insulated: boolean;
          /** Colour of the chiller shell this nozzle is welded into — used
           *  for the vessel-side weld-neck taper so it reads as part of the
           *  beige barrel rather than a separately-painted spool stub. */
          vesselColor: string;
        }) {
          const isCHW = c.zSign < 0;
          const flangeRotY = isCHW ? +Math.PI / 2 : -Math.PI / 2;
          const elbowRotY  = isCHW ? +Math.PI / 2 : -Math.PI / 2;
          // Spool is at constant y = yFlange, axis along world Z.
          // For an insulated spool (CHW), an outer foam jacket overlays
          // the bare carbon-steel pipe just like the rest of the run.
          return (
            <group>
              {/* ── Bolted ANSI raised-face flange tying pipe to head ── */}
              <FlangedConnection
                position={[c.xRiser, c.yFlange, c.zFlange]}
                rotation={[0, flangeRotY, 0]}
                pipeRadius={MAIN_PIPE_RADIUS}
                bodyColor={pipeColor}
                vesselNeckColor={vesselColor}
                boltCount={boltCount}
              />
              {/* ── Lateral spool: pipe-side flange end → elbow tangent ── */}
              <mesh position={[c.xRiser, c.yFlange, c.zSpoolCtr]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, c.spoolLen, 18]} />
                <meshStandardMaterial color={pipeColor} roughness={0.6} metalness={0.4} />
              </mesh>
              {insulated && (
                <mesh position={[c.xRiser, c.yFlange, c.zSpoolCtr]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[MAIN_PIPE_INS_RADIUS, MAIN_PIPE_INS_RADIUS, Math.max(c.spoolLen - 0.18, 0.04), 16]} />
                  <meshStandardMaterial color={insColor} roughness={0.9} metalness={0.0} transparent opacity={0.92} />
                </mesh>
              )}
              {/* ── 90° long-radius elbow at the lateral/riser corner ── */}
              <mesh
                position={[c.xRiser, c.yElbowCtr, c.zElbowCtr]}
                rotation={[0, elbowRotY, 0]}
              >
                <torusGeometry args={[elbowR, MAIN_PIPE_RADIUS, 12, 22, Math.PI / 2]} />
                <meshStandardMaterial color={pipeColor} roughness={0.6} metalness={0.4} />
              </mesh>
            </group>
          );
        }

        return (
          <>
            {/* ── CHW circuit → EVAPORATOR (upper) shell, −Z head ── */}
            <group>
              <NozzleChain c={chwSup} pipeColor="#1c5aa8" insColor="#143f7a"
                           elbowR={CHW_R} boltCount={12} insulated
                           vesselColor={evapShellColor} />
              <NozzleChain c={chwRet} pipeColor="#7eb8d8" insColor="#5a9ec4"
                           elbowR={CHW_R} boltCount={12} insulated
                           vesselColor={evapShellColor} />
              {/* No separate cover plate — the evaporator barrel end cap in the
                  GLB already reads as the marine-waterbox face. The two stacked
                  FlangedConnections bolt directly onto the visible barrel cap. */}
            </group>

            {/* ── CDW circuit → CONDENSER (lower) shell, +Z head ──
                The barrel-head cap of Cylinder002_Baked.001 already reads
                as the marine-waterbox face in the GLB, so we don't draw
                a separate cover plate / bonnet here — the two stacked
                FlangedConnections bolt directly onto the visible barrel
                cap and that's all the user needs to see. */}
            <group>
              <NozzleChain c={cdwSup} pipeColor="#1d7a3a" insColor="#155a28"
                           elbowR={CDW_R} boltCount={12} insulated={false}
                           vesselColor={condShellColor} />
              <NozzleChain c={cdwRet} pipeColor="#7ec07a" insColor="#5fa05c"
                           elbowR={CDW_R} boltCount={12} insulated={false}
                           vesselColor={condShellColor} />
            </group>
          </>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════
          PIPING ACCESSORIES — gauges, valves, drains, vents, strainers
          - Pipes along world  X  →  rotation = [0, 0, 0]
          - Pipes along world  Y  →  rotation = [0, 0, Math.PI / 2]
      ════════════════════════════════════════════════════════════════ */}

      {/* ─── CHILLED WATER SUPPLY accessory train (on the y=1.10 header) ───
           All fittings sit ON the actual horizontal CHWS header (MAIN_PIPE_RADIUS).
           Positions are interleaved with the inline gate valves at x=−5.54
           (chiller-side isolation) and x=−12.0 (AHU-side isolation) drawn
           in the CHW-header block above. Pipe-radius matches the 24" Sch.40
           main so the fitting necks/flanges land on the pipe wall. */}
      {/* vibration isolator just outside the barrel-head tee */}
      <FlexConnector
        position={[-3.4, 1.10, CHW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        length={0.55}
      />
      {/* chiller-outlet gauges */}
      <PressureGauge
        position={[-4.4, 1.10, CHW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        label="PT-1"
      />
      <TemperatureGauge
        position={[-7.4, 1.10, CHW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        label="TS"
      />
      <GlobeValve
        valveId="pipe_globe_chws_balance"
        position={[-8.05, 1.10, CHW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#2c4a72"
      />
      {/* secondary butterfly isolation just downstream of the gate valve */}
      <ButterflyValve
        valveId="pipe_bf_chws_secondary"
        position={[-8.6, 1.10, CHW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        outerRadius={MAIN_PIPE_INS_RADIUS}
        bodyColor="#2c4a72"
      />
      {/* electric modulating control valve mid-run */}
      <MotorizedValve
        valveId="pipe_cv_chws_tcv1"
        position={[-15.0, 1.10, CHW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#2c4a72"
        label="TCV-1"
      />
      {/* test port (Pete's plug) for portable instrumentation */}
      <TestPort
        position={[-17.5, 1.10, CHW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />
      {/* drain valve at low point on the AHU-side leg of the header */}
      <DrainValve
        valveId="pipe_drain_chws_header"
        position={[-19.5, 1.10, CHW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />

      {/* ─── CHILLED WATER RETURN accessory train (on the y=1.10 header) ─── */}
      <FlexConnector
        position={[-3.4, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
        length={0.55}
      />
      <PressureGauge
        position={[-4.4, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
        label="PR-1"
      />
      <TemperatureGauge
        position={[-6.5, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
        label="TR"
      />
      {/* Y-strainer on return — protects evaporator tubes from system debris */}
      <YStrainer
        position={[-8.8, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#4a7a9a"
        idBand={false}
      />
      <GlobeValve
        valveId="pipe_globe_chwr_balance"
        position={[-9.65, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#4a7a9a"
      />
      <ButterflyValve
        valveId="pipe_bf_chwr_secondary"
        position={[-10.5, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
        outerRadius={MAIN_PIPE_INS_RADIUS}
        bodyColor="#4a7a9a"
      />
      {/* swing check valve — stops reverse flow through evap when pump off */}
      <CheckValve
        position={[-15.0, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#4a7a9a"
      />
      <TestPort
        position={[-17.5, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />
      <DrainValve
        valveId="pipe_drain_chwr_header"
        position={[-19.5, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />

      {/* ─── CDWS riser accessories (vertical, x = CW_X_SUPPLY, z = CW_Z_SUPPLY) ─── */}
      {/* low-point drain at base of riser */}
      <DrainValve
        valveId="pipe_drain_cdws_riser_base"
        position={[CW_X_SUPPLY, 2.3, CW_Z_SUPPLY]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />
      <PressureGauge
        position={[CW_X_SUPPLY, 4.0, CW_Z_SUPPLY]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        label="PT-2"
      />
      <TemperatureGauge
        position={[CW_X_SUPPLY, 5.2, CW_Z_SUPPLY]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        label="TC-S"
      />
      <ButterflyValve
        valveId="pipe_bf_cdws_riser"
        position={[CW_X_SUPPLY, 6.8, CW_Z_SUPPLY]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        outerRadius={MAIN_PIPE_INS_RADIUS}
        bodyColor="#1f5a3a"
      />
      <TestPort
        position={[CW_X_SUPPLY, 9.0, CW_Z_SUPPLY]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />

      {/* ─── CDWS rooftop horizontal — air vent + tower bypass control valve ─── */}
      <AirVent
        position={[4.0, 12.38, CW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />
      <DrainValve
        valveId="pipe_drain_cdws_roof"
        position={[3.25, 12.38, CW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />
      <MotorizedValve
        valveId="pipe_cv_cdws_tbv1"
        position={[14.0, 12.38, CW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#1f5a3a"
        actuatorColor="#7a4d1c"
        label="TBV-1"
      />

      {/* ─── CDWS tower-side vertical riser accessories (x = CW_TOWER_SUP_X = 24.0, z = CW_Z_SUPPLY) ─── */}
      <ButterflyValve
        valveId="pipe_bf_cdws_tower"
        position={[CW_TOWER_SUP_X, 14.5, CW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        outerRadius={MAIN_PIPE_INS_RADIUS}
        bodyColor="#1f5a3a"
      />
      <AirVent
        position={[CW_TOWER_SUP_X, 16.5, CW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />

      {/* ─── CDWR riser accessories (vertical, x = CW_X_RETURN, z = CW_Z_RETURN) ─── */}
      <DrainValve
        valveId="pipe_drain_cdwr_riser_base"
        position={[CW_X_RETURN, 2.3, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />
      <PressureGauge
        position={[CW_X_RETURN, 4.0, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        label="PR-2"
      />
      <TemperatureGauge
        position={[CW_X_RETURN, 5.2, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        label="TC-R"
      />
      {/* Y-strainer protects condenser tubes from cooling-tower basin debris */}
      <YStrainer
        position={[CW_X_RETURN, 6.8, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#5a3a1f"
      />
      <ButterflyValve
        valveId="pipe_bf_cdwr_strainer_out"
        position={[CW_X_RETURN, 8.4, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        outerRadius={MAIN_PIPE_INS_RADIUS}
        bodyColor="#5a3a1f"
      />
      <CheckValve
        position={[CW_X_RETURN, 10.0, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#5a3a1f"
      />

      {/* ─── CDWR rooftop horizontal — air vent ─── */}
      <AirVent
        position={[4.0, CW_Y_ROOF_TOP - 0.18, CW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />

      {/* ─── CDWR tower-exterior riser accessories (x = CW_TOWER_FLG_X − 0.95 = 22.05) ─── */}
      <ButterflyValve
        valveId="pipe_bf_cdwr_tower"
        position={[CW_TOWER_FLG_X - 0.95, CW_TOWER_RET_Y - 0.8, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        outerRadius={MAIN_PIPE_INS_RADIUS}
        bodyColor="#5a3a1f"
      />

      {/* pid.json — makeup, chemical, pumps, expansion, electrical, FT/PDI/PSV */}
      <PidPlantSystems
        cdwpVfdZoomed={cdwpVfdZoomed}
        onCdwpVfdZoom={onCdwpVfdZoom}
        cdwpVfdScreenAnchorRef={cdwpVfdScreenAnchorRef}
        cdwpVfdOccluderRef={cdwpVfdOccluderRef}
        chwpVfdZoomed={chwpVfdZoomed}
        onChwpVfdZoom={onChwpVfdZoom}
        chwpVfdScreenAnchorRef={chwpVfdScreenAnchorRef}
        chwpVfdOccluderRef={chwpVfdOccluderRef}
      />

      {/* ─────────────────────────────────────────────────────────────────
          ANIMATED FLOW INDICATORS (pid `animation` — water flow animation
          in pipes, color-coded). Chevrons slide along the pipe surface
          while the corresponding loop is energized; hidden when idle.
          Placed on the long, visible header / rooftop runs.
          CHWS/CHWR: HEADER_Y = 1.10, span = chiller riser (X≈-2) to past
                     AHU tee (X≈-12.25). Use mid-point + length.
          CDWS/CDWR rooftop horizontals: y = 12.38, span riser to tower-X.
         ───────────────────────────────────────────────────────────────── */}
      {(() => {
        const HEADER_Y = 1.10;
        /* Engine-room CHW header span (chiller riser → AHU coil riser branch).
           Chiller risers land at X = CHW_X_SUPPLY (-1.984); AHU coil supply
           riser is at CHW_RISER_X_SUP. Animate over visible header length. */
        const chHdrLen = Math.abs(CHW_X_SUPPLY - CHW_RISER_X_SUP);
        const chHdrCtrX = (CHW_X_SUPPLY + CHW_RISER_X_SUP) / 2;
        /* Rooftop CWS horizontal run: building riser (X≈CW_X_SUPPLY) → tower riser (X=CW_TOWER_SUP_X).
           Rooftop CWR horizontal run: tower exterior riser (X≈22.05) → building riser (X≈CW_X_RETURN). */
        const cdSupRoofLen = Math.max(0.1, (CW_TOWER_SUP_X - 0.40) - (CW_X_SUPPLY + 0.40));
        const cdSupRoofCtrX = ((CW_X_SUPPLY + 0.40) + (CW_TOWER_SUP_X - 0.40)) / 2;
        const cdRetRoofLen = Math.max(0.1, (CW_TOWER_FLG_X - 0.95 - 0.40) - (CW_X_RETURN + 0.40));
        const cdRetRoofCtrX = ((CW_X_RETURN + 0.40) + (CW_TOWER_FLG_X - 0.95 - 0.40)) / 2;
        return (
          <>
            <PipeFlowMarkers
              name="flow:CHWS"
              center={[chHdrCtrX, HEADER_Y, CHW_Z_SUPPLY]}
              length={chHdrLen}
              pipeRadius={MAIN_PIPE_RADIUS}
              color="#1c5aa8"
              flowing={chwLoopFlowing}
              direction={-1}
            />
            <PipeFlowMarkers
              name="flow:CHWR"
              center={[chHdrCtrX, HEADER_Y, CHW_Z_RETURN]}
              length={chHdrLen}
              pipeRadius={MAIN_PIPE_RADIUS}
              color="#7eb8d8"
              flowing={chwLoopFlowing}
              direction={1}
            />
            {/* CWS roof main: supply travels +X toward tower */}
            <PipeFlowMarkers
              name="flow:CDWS-roof"
              center={[cdSupRoofCtrX, CW_Y_ROOF_TOP, CW_Z_SUPPLY]}
              length={cdSupRoofLen}
              pipeRadius={MAIN_PIPE_RADIUS}
              color="#1f7a3a"
              flowing={cdwLoopFlowing}
              direction={1}
            />
            {/* CWR roof main: return travels −X back from tower */}
            <PipeFlowMarkers
              name="flow:CDWR-roof"
              center={[cdRetRoofCtrX, CW_Y_ROOF_TOP, CW_Z_RETURN]}
              length={cdRetRoofLen}
              pipeRadius={MAIN_PIPE_RADIUS}
              color="#7ec07a"
              flowing={cdwLoopFlowing}
              direction={-1}
            />

            {/* Engine-room CWS riser: hot water rises up to roof (+Y) */}
            <PipeFlowMarkers
              name="flow:CWS-riser-engine"
              center={[CW_X_SUPPLY, (CW_Y_FLG_SUP + CW_Y_ROOF_TOP - 0.4) / 2, CW_Z_SUPPLY]}
              length={Math.max(0.1, CW_Y_ROOF_TOP - 0.4 - CW_Y_FLG_SUP)}
              pipeRadius={MAIN_PIPE_RADIUS}
              color="#1f7a3a"
              flowing={cdwLoopFlowing}
              axis="y"
              direction={1}
              surfaceFace="x"
            />
            {/* Engine-room CWR riser: cold water drops down from roof (−Y) */}
            <PipeFlowMarkers
              name="flow:CWR-riser-engine"
              center={[CW_X_RETURN, (CW_Y_FLG_RET + CW_Y_ROOF_TOP - 0.4) / 2, CW_Z_RETURN]}
              length={Math.max(0.1, CW_Y_ROOF_TOP - 0.4 - CW_Y_FLG_RET)}
              pipeRadius={MAIN_PIPE_RADIUS}
              color="#7ec07a"
              flowing={cdwLoopFlowing}
              axis="y"
              direction={-1}
              surfaceFace="x"
            />

            {/* CWS tower riser: rises from roof main to fan-deck top entry (+Y) */}
            <PipeFlowMarkers
              name="flow:CWS-riser-tower"
              center={[CW_TOWER_SUP_X, (CW_Y_ROOF_TOP + 0.4 + CW_TOWER_SUP_Y - 0.4) / 2, CW_Z_SUPPLY]}
              length={Math.max(0.1, CW_TOWER_SUP_Y - 0.4 - (CW_Y_ROOF_TOP + 0.4))}
              pipeRadius={MAIN_PIPE_RADIUS}
              color="#1f7a3a"
              flowing={cdwLoopFlowing}
              axis="y"
              direction={1}
              surfaceFace="-x"
            />
            {/* CWR tower exterior drop: cold water drops from basin to roof (−Y) */}
            <PipeFlowMarkers
              name="flow:CWR-riser-tower"
              center={[CW_TOWER_FLG_X - 0.95, (CW_TOWER_RET_Y - 0.4 + CW_Y_ROOF_TOP - 0.4) / 2, CW_Z_RETURN]}
              length={Math.max(0.1, CW_TOWER_RET_Y - 0.4 - (CW_Y_ROOF_TOP - 0.4))}
              pipeRadius={MAIN_PIPE_RADIUS}
              color="#7ec07a"
              flowing={cdwLoopFlowing}
              axis="y"
              direction={-1}
              surfaceFace="-x"
            />

            {/* Vertical AHU risers — both at coil-centre X, same Z (below nozzle stubs).
                Supply drops from coil bottom nozzle → engine-room main (direction +1 up).
                Return rises from coil top nozzle → engine-room main (direction −1 down).
                Riser Z = AHU_Z − 3.94 (nozzle flange Z − elbow radius). */}
            {(() => {
              const CHW_RISER_WZ = AHU_Z - 3.94;   // both risers share this Z
              const RISER_TOP_Y  = AHU_BASE_Y - 0.40;  // just below curb underside
              const RISER_BOT_Y  = 1.40;                // engine-room header elevation
              const RISER_LEN    = Math.max(0.1, RISER_TOP_Y - RISER_BOT_Y);
              const RISER_CTR_Y  = (RISER_TOP_Y + RISER_BOT_Y) / 2;
              return (
                <>
                  <PipeFlowMarkers
                    name="flow:CHWS-riser-AHU"
                    center={[CHW_RISER_X_SUP, RISER_CTR_Y, CHW_RISER_WZ]}
                    length={RISER_LEN}
                    pipeRadius={MAIN_PIPE_RADIUS}
                    color="#1c5aa8"
                    flowing={chwLoopFlowing}
                    axis="y"
                    direction={1}
                    surfaceFace="-x"
                  />
                  <PipeFlowMarkers
                    name="flow:CHWR-riser-AHU"
                    center={[CHW_RISER_X_RET, RISER_CTR_Y, CHW_RISER_WZ]}
                    length={RISER_LEN}
                    pipeRadius={MAIN_PIPE_RADIUS}
                    color="#7eb8d8"
                    flowing={chwLoopFlowing}
                    axis="y"
                    direction={-1}
                    surfaceFace="-x"
                  />
                </>
              );
            })()}
          </>
        );
      })()}
    </group>
  );
}

/* Raw geometry of <HMIPanel3D/> at scale 1: 1.22 wide × 0.92 tall × 0.06 deep,
   centered on its origin, with the screen oriented toward local +Z. */
const HMI_PANEL_W = 1.22;
const HMI_PANEL_H = 0.92;

/* Cube001_Baked = the smaller secondary control sub-cabinet on the chiller
   (center≈(0.97, 2.78, −0.62), size≈(0.67, 2.26, 1.57)). We mount the HMI
   centered on its +X face — that's the operator-facing door panel. */
function findChillerCabinet(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (found || !(o instanceof THREE.Mesh)) return;
    const n = o.name;
    if (n === 'Cube.001_Baked' || n === 'Cube001_Baked') {
      found = o;
    }
  });
  return found;
}

function ChillerModel({
  position,
  onHmiZoom,
  hmiLookAtRef,
  hmiZoomed,
  vfdOccluderRef,
}: {
  position: [number, number, number];
  onHmiZoom: () => void;
  hmiLookAtRef: MutableRefObject<THREE.Vector3>;
  hmiZoomed: boolean;
  vfdOccluderRef: MutableRefObject<THREE.Mesh | null>;
}) {
  const { scene } = useGLTF('/models/chiller-r2/Chiller_R2.glb');
  const hmiMountRef = useRef<THREE.Group>(null);

  /* ── Sample baked shell colours so procedural weld-necks match the GLB ──
     The condenser & evaporator shells are textured-not-flat-coloured, so we
     can't read the tint off material.color directly. Instead we render the
     baked diffuse map into a 1×1 canvas via drawImage and read the resulting
     averaged pixel — that gives us a solid hex that visually matches the
     beige YORK barrel. The colour is pushed into useChillerColorStore where
     procedural geometry (FlangedConnection vesselNeckColor) consumes it. */
  useLayoutEffect(() => {
    const setShellColor = useChillerColorStore.getState().setShellColor;
    // Mesh-name → which shell it belongs to. Only the canonical 002 / 001
    // names are required; the suffixed duplicates get the same map anyway.
    const targets: Array<[string, 'condenser' | 'evaporator']> = [
      ['Cylinder002_Baked', 'condenser'],
      ['Cylinder001_Baked', 'evaporator'],
    ];

    function avgPixelHex(tex: THREE.Texture | null): string | null {
      const img = tex && (tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined);
      if (!img) return null;
      const w = (img as HTMLImageElement).width || (img as ImageBitmap).width;
      const h = (img as HTMLImageElement).height || (img as ImageBitmap).height;
      if (!w || !h) return null;
      try {
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        const ctx = c.getContext('2d');
        if (!ctx) return null;
        // Drawing into a 1×1 canvas asks the browser to filter the image
        // down to a single average pixel — perfect for grabbing the gross
        // tint of a complex baked diffuse map.
        ctx.drawImage(img as CanvasImageSource, 0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        const r = d[0].toString(16).padStart(2, '0');
        const gg = d[1].toString(16).padStart(2, '0');
        const b = d[2].toString(16).padStart(2, '0');
        return `#${r}${gg}${b}`;
      } catch {
        return null;
      }
    }

    for (const [meshName, which] of targets) {
      const mesh = scene.getObjectByName(meshName) as THREE.Mesh | undefined;
      if (!mesh) continue;
      const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial | undefined;
      const map = mat?.map ?? null;
      const hex = avgPixelHex(map);
      if (hex) setShellColor(which, hex);
    }
  }, [scene]);

  useLayoutEffect(() => {
    const g = hmiMountRef.current;
    if (!g) return;

    const mesh = findChillerCabinet(scene);
    if (!mesh) {
      g.position.set(3.5, 2.5, 0);
      g.rotation.set(0, Math.PI / 2, 0);
      g.scale.setScalar(0.6);
      hmiLookAtRef.current.set(3.5, 2.5, 0);
      return;
    }

    /* Compute the cabinet's WORLD-axis-aligned bounding box. This is what
       determines which face faces world +X regardless of any baked rotation
       on the GLB mesh — using mesh.geometry.boundingBox would give the
       LOCAL extents and could end up sideways if the cabinet has its own
       rotation in the GLB (which Cube001_Baked does). */
    mesh.updateWorldMatrix(true, true);
    const wbox = new THREE.Box3().setFromObject(mesh);
    const wsy = wbox.max.y - wbox.min.y;
    const wsz = wbox.max.z - wbox.min.z;
    /* Drop the panel slightly below the geometric centroid of the cabinet
       face — real chiller HMIs sit at operator chest height, not dead-
       centre on a tall sub-cabinet. */
    const wcy = (wbox.min.y + wbox.max.y) * 0.5 - 0.20;
    const wcz = (wbox.min.z + wbox.max.z) * 0.5;
    const wcx = wbox.max.x + 0.012;

    /* Cap the rendered HMI to a realistic compact OptiView door panel
       (~0.18 m wide ≈ 7"). Both caps share the same scaling ratio so the
       Math.min(...) below preserves the native 1.22:0.92 aspect ratio. */
    const REAL_HMI_W = 0.18;
    const REAL_HMI_H = HMI_PANEL_H * (REAL_HMI_W / HMI_PANEL_W);
    const targetWworld = Math.min(0.92 * wsz, REAL_HMI_W);
    const targetHworld = Math.min(0.92 * wsy, REAL_HMI_H);
    const fit = Math.max(
      0.05,
      Math.min(targetWworld / HMI_PANEL_W, targetHworld / HMI_PANEL_H),
    );

    /* Compose the panel's WORLD-space transform (position, rotation, scale)
       and decompose it into a LOCAL transform relative to scene's parent
       (the outer <group>) — accounting for the +0.8 m Y offset that
       <primitive position={[0, 0.8, 0]} /> adds. Using `g.position.set()`
       directly would treat (wcx, wcy, wcz) as scene-local coordinates and
       end up with the panel 0.8 m higher than the camera look-at target. */
    scene.add(g);
    scene.updateWorldMatrix(true, false);
    const desiredWorld = new THREE.Matrix4().compose(
      new THREE.Vector3(wcx, wcy, wcz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
      new THREE.Vector3(fit, fit, fit),
    );
    const sceneWorldInv = new THREE.Matrix4().copy(scene.matrixWorld).invert();
    const localMatrix = new THREE.Matrix4().multiplyMatrices(
      sceneWorldInv,
      desiredWorld,
    );
    localMatrix.decompose(g.position, g.quaternion, g.scale);
    g.updateMatrixWorld(true);

    /* Re-parent under the cabinet so the HMI follows the chiller if it
       ever moves; attach() preserves the now-correct world transform. */
    mesh.attach(g);

    hmiLookAtRef.current.set(wcx, wcy, wcz);

    return () => {
      if (g.parent) g.parent.remove(g);
    };
  }, [scene, hmiLookAtRef]);

  return (
    <group position={position}>
      <primitive
        object={scene}
        position={[0, 0.8, 0]}
        castShadow
        receiveShadow
      />
      <group ref={hmiMountRef}>
        <HMIPanel3D onZoom={onHmiZoom} zoomed={hmiZoomed} vfdOccluderRef={vfdOccluderRef} />
      </group>
    </group>
  );
}

function HMIPanel3D({ onZoom, zoomed, vfdOccluderRef }: { onZoom: () => void; zoomed: boolean; vfdOccluderRef: MutableRefObject<THREE.Mesh | null> }) {
  /* Parent group is pinned by ChillerModel to Cube001_Baked's +X face. The
     cabinet rotates the group so its local +Z normal points outward (world
     +X), so we keep the panel geometry in the local XY plane facing +Z.
     The housing box is pushed slightly behind (local −Z) so its front face
     sits flush with the parent group's origin, and the React HMIPanel sits
     just in front of that face — exactly on the cabinet's outer surface,
     visible to the user.

     Click behaviour:
       - !zoomed: a transparent overlay above the HMI captures clicks and
         triggers onZoom(). The user can click anywhere on the panel to
         enlarge it — they can't read or interact with the tiny HMI yet.
       - zoomed: the overlay is gone, so the HMI's own buttons receive
         pointer events normally. The user can read/click through the UI. */
  const housingRef = useRef<THREE.Mesh>(null);
  return (
    <group>
      <mesh ref={housingRef} castShadow position={[0, 0, -0.03]}>
        <boxGeometry args={[HMI_PANEL_W, HMI_PANEL_H, 0.06]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[HMI_PANEL_W * 0.9, HMI_PANEL_H * 0.87]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.35} metalness={0.15} />
      </mesh>
      <Html
        transform
        occlude={[housingRef, vfdOccluderRef]}
        position={[0, 0, 0.003]}
        distanceFactor={4.35}
        zIndexRange={[28, 1]}
        style={{
          width: '680px',
          height: '495px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 'inset 0 0 0 2px #1a1a1a',
          }}
        >
          <HMIPanel />
          {!zoomed && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Zoom in on HMI panel"
              onClick={(e) => {
                e.stopPropagation();
                onZoom();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onZoom();
                }
              }}
              onPointerEnter={() => {
                document.body.style.cursor = 'pointer';
              }}
              onPointerLeave={() => {
                document.body.style.cursor = 'auto';
              }}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                cursor: 'zoom-in',
                background: 'transparent',
              }}
            />
          )}
        </div>
      </Html>
    </group>
  );
}

type HmiPanelZoomMode = 'none' | 'hmi' | 'vfd' | 'cdwp-vfd' | 'chwp-vfd';

function CameraController({
  panelZoom,
  hmiLookAtRef,
  vfdLookAtRef,
  cdwpVfdLookAtRef,
  chwpVfdLookAtRef,
  cdwpVfdCamPosRef,
  chwpVfdCamPosRef,
}: {
  panelZoom: HmiPanelZoomMode;
  hmiLookAtRef: MutableRefObject<THREE.Vector3>;
  vfdLookAtRef: MutableRefObject<THREE.Vector3>;
  cdwpVfdLookAtRef: MutableRefObject<THREE.Vector3>;
  chwpVfdLookAtRef: MutableRefObject<THREE.Vector3>;
  cdwpVfdCamPosRef: MutableRefObject<THREE.Vector3>;
  chwpVfdCamPosRef: MutableRefObject<THREE.Vector3>;
}) {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.Camera;
    controls: { target: THREE.Vector3; update?: () => void } | null;
  };
  const activeRef = useRef(false);
  const progressRef = useRef(0);
  const lastModeRef = useRef<HmiPanelZoomMode>(panelZoom);

  /* Captured at the moment the user toggles zoom — we always lerp from the
     CURRENT camera/target state, never from a hard-coded "wide" position.
     This makes the transition smooth no matter where the user has orbited
     to, and prevents the camera from snapping if they've already moved. */
  const fromPosRef = useRef(new THREE.Vector3());
  const fromTargetRef = useRef(new THREE.Vector3());

  /* Snapshot of the camera pose taken the instant the user enters a zoom
     from `panelZoom === 'none'`. When they later exit the zoom we tween
     BACK to this exact pose instead of to a hard-coded sim default —
     which means the technician controller resumes at the player's
     original eye position with no visible snap on hand-off. */
  const preZoomPosRef     = useRef(new THREE.Vector3());
  const preZoomTargetRef  = useRef(new THREE.Vector3());
  const havePreZoomRef    = useRef(false);

  /* Scratch vectors for per-frame work (avoid allocations in useFrame). */
  const toPosRef = useRef(new THREE.Vector3());
  const toTargetRef = useRef(new THREE.Vector3());
  /* Camera offset from panel center to close-up position for the chiller
     OptiView HMI and the chiller VFD HMI. Both panels face world +X, so a
     positive +X offset sits the camera in front of the glass. The pump
     VFD close-up no longer uses a hard-coded directional offset — its
     destination camera position is computed each frame inside <EngineRoom/>
     from the panel anchor's world quaternion (see cdwpVfdCamPosRef /
     chwpVfdCamPosRef) so it's always normal to the actual front face. */
  const closeOffsetHmiRef  = useRef(new THREE.Vector3(1.0,  0.0,  0.0));
  const closeOffsetVfdRef  = useRef(new THREE.Vector3(0.58, 0.0,  0.0));

  useFrame((_, delta) => {
    if (panelZoom !== lastModeRef.current) {
      /* Capture pre-zoom pose once, on the FIRST transition out of 'none'.
         We use it as the destination on the matching exit so there's no
         camera snap when the technician controller resumes ownership. */
      if (lastModeRef.current === 'none' && panelZoom !== 'none') {
        preZoomPosRef.current.copy(camera.position);
        preZoomTargetRef.current.copy(
          controls?.target ??
            new THREE.Vector3(
              CHILLER_ORBIT_TARGET[0],
              CHILLER_ORBIT_TARGET[1],
              CHILLER_ORBIT_TARGET[2],
            ),
        );
        havePreZoomRef.current = true;
      }
      lastModeRef.current = panelZoom;
      activeRef.current = true;
      progressRef.current = 0;
      fromPosRef.current.copy(camera.position);
      fromTargetRef.current.copy(
        controls?.target ??
          new THREE.Vector3(
            CHILLER_ORBIT_TARGET[0],
            CHILLER_ORBIT_TARGET[1],
            CHILLER_ORBIT_TARGET[2],
          ),
      );
    }

    /* Resolve the destination camera position + look-at target. We do
       this every frame (not just during the tween) so that:
        (a) the resolved pose tracks live updates to the panel anchor's
            world position/quaternion (the pump VFD anchors are moving
            refs computed inside <EngineRoom/>), and
        (b) once the tween completes we can KEEP writing the resolved
            pose to the camera, preventing other camera writers
            (TechnicianController, PointerLockControls) from drifting
            it away from the panel — the "camera breaks away when
            stationary" symptom. */
    if (panelZoom === 'hmi') {
      toTargetRef.current.copy(hmiLookAtRef.current);
      toPosRef.current.copy(hmiLookAtRef.current).add(closeOffsetHmiRef.current);
    } else if (panelZoom === 'vfd') {
      toTargetRef.current.copy(vfdLookAtRef.current);
      toPosRef.current.copy(vfdLookAtRef.current).add(closeOffsetVfdRef.current);
    } else if (panelZoom === 'cdwp-vfd') {
      toTargetRef.current.copy(cdwpVfdLookAtRef.current);
      toPosRef.current.copy(cdwpVfdCamPosRef.current);
    } else if (panelZoom === 'chwp-vfd') {
      toTargetRef.current.copy(chwpVfdLookAtRef.current);
      toPosRef.current.copy(chwpVfdCamPosRef.current);
    } else {
      /* Return-to-world (panelZoom === 'none'): land the camera back
         exactly where it was just before the zoom began. This is the
         player's eye position when in walk mode, or their orbit pose
         in explore mode — either way the next system to take over the
         camera (TechnicianController in walk mode) inherits the same
         transform with no visible snap. We fall back to the hard-coded
         sim default only on first paint, before any zoom has happened. */
      if (havePreZoomRef.current) {
        toPosRef.current.copy(preZoomPosRef.current);
        toTargetRef.current.copy(preZoomTargetRef.current);
      } else {
        toTargetRef.current.set(
          CHILLER_ORBIT_TARGET[0],
          CHILLER_ORBIT_TARGET[1],
          CHILLER_ORBIT_TARGET[2],
        );
        toPosRef.current.set(
          DEFAULT_SIM_CAMERA_POSITION[0],
          DEFAULT_SIM_CAMERA_POSITION[1],
          DEFAULT_SIM_CAMERA_POSITION[2],
        );
      }
    }

    /* If we're currently tweening, advance progress and lerp. */
    if (activeRef.current && progressRef.current < 1) {
      progressRef.current = Math.min(progressRef.current + delta * 1.4, 1);
      const t = progressRef.current;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      camera.position.lerpVectors(fromPosRef.current, toPosRef.current, ease);

      /* Drive the OrbitControls target in lock-step. Without this, drei's
         <OrbitControls> would re-orient the camera every frame back toward
         its previous target (CHILLER_ORBIT_TARGET) — fighting our lookAt
         and pushing the HMI off-screen. */
      if (controls?.target) {
        controls.target.lerpVectors(
          fromTargetRef.current,
          toTargetRef.current,
          ease,
        );
        controls.update?.();
      } else {
        camera.lookAt(toTargetRef.current);
      }

      if (progressRef.current >= 1) {
        activeRef.current = false;
      }
      return;
    }

    /* Tween is done. While the user is still zoomed into a panel, keep
       pinning the camera to the resolved pose so nothing else can pull
       it away. (When panelZoom === 'none' we leave the camera alone so
       walk-mode / orbit controls own the transform.) */
    if (panelZoom !== 'none') {
      camera.position.copy(toPosRef.current);
      if (controls?.target) {
        controls.target.copy(toTargetRef.current);
        controls.update?.();
      } else {
        camera.lookAt(toTargetRef.current);
      }
    }
  });

  return null;
}

export default function App() {
  const [showCxAlloy, setShowCxAlloy] = useState(false);
  const [zoomedHMI, setZoomedHMI]     = useState(false);
  const [zoomedVfd, setZoomedVfd]     = useState(false);
  const [zoomedCdwpVfd, setZoomedCdwpVfd] = useState(false);
  const [zoomedChwpVfd, setZoomedChwpVfd] = useState(false);
  const hmiLookAtRef     = useRef(new THREE.Vector3(0, 2.5, 0));
  const vfdLookAtRef     = useRef(new THREE.Vector3(4.6, 2.2, -2.6));
  const cdwpVfdLookAtRef = useRef(new THREE.Vector3(0, 2.5, 9.0));
  const chwpVfdLookAtRef = useRef(new THREE.Vector3(-2.0, 2.5, -9.5));
  /* Camera-position refs for the pump VFD zooms. Populated each frame
     inside <EngineRoom/>'s useFrame from the panel anchor's WORLD
     quaternion + a fixed standoff distance, so the camera always lands
     exactly normal to the actual front face of whichever ABB control
     panel was clicked — regardless of how the cabinet is rotated in
     world space. Replaces the previous hard-coded directional offset
     that was zooming "into the wall" instead of onto the panel. */
  const cdwpVfdCamPosRef = useRef(new THREE.Vector3(0, 1.6, 8.0));
  const chwpVfdCamPosRef = useRef(new THREE.Vector3(-2.0, 1.6, -8.5));
  const panelZoom: HmiPanelZoomMode =
    zoomedVfd     ? 'vfd'      :
    zoomedHMI     ? 'hmi'      :
    zoomedCdwpVfd ? 'cdwp-vfd' :
    zoomedChwpVfd ? 'chwp-vfd' : 'none';

  const clearAllZoom = () => {
    setZoomedHMI(false); setZoomedVfd(false);
    setZoomedCdwpVfd(false); setZoomedChwpVfd(false);
  };
  // Keep browser page-zoom (Ctrl/Cmd + wheel, trackpad pinch) from scaling the chrome
  // (top bar, iPad widget). OrbitControls still receives the wheel event for dolly.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    const onGesture = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('gesturestart', onGesture, { capture: true });
    window.addEventListener('gesturechange', onGesture, { capture: true });
    window.addEventListener('gestureend', onGesture, { capture: true });
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('gesturestart', onGesture, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('gesturechange', onGesture, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('gestureend', onGesture, { capture: true } as AddEventListenerOptions);
    };
  }, []);

  useEffect(() => {
    simulationEngine.start();
    return () => simulationEngine.stop();
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#9bd0ff', position: 'relative', overflow: 'hidden' }}>
      <ControlPanelUI />
      {/* iPad widget */}
      <CxAlloyWidget onOpen={() => setShowCxAlloy(true)} />

      {/* CxAlloy — full interactive HTML from the iPad widget */}
      {showCxAlloy && <CxAlloyHtmlMaximized onClose={() => setShowCxAlloy(false)} />}

      {/* 3D Canvas */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas
          shadows
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{
            position: DEFAULT_SIM_CAMERA_POSITION,
            fov: 45,
            near: 0.1,
            far: 500,
          }}
        >
          <Suspense fallback={null}>
            {/* Scene background fallback color — visible behind the Sky shader
                while it warms up, and in the rare patches that aren't covered
                by the skydome (e.g. extreme camera FOV). */}
            <color attach="background" args={['#9bd0ff']} />
            {/* Atmospheric scattering sky — sun position matches the
                directional light in <Scene/> for consistent shading. */}
            <Sky
              distance={4500}
              sunPosition={SUN_POSITION}
              inclination={0}
              azimuth={0.25}
              turbidity={3}
              rayleigh={1.4}
              mieCoefficient={0.005}
              mieDirectionalG={0.8}
            />
            {/* Drifting cumulus over the yard — three discrete formations so
                the sky has parallax / depth without a uniform fog look. */}
            <Clouds material={THREE.MeshLambertMaterial} limit={120} range={120}>
              <Cloud
                seed={1}
                position={[-30, 55, -30]}
                segments={28}
                bounds={[28, 4, 8]}
                volume={9}
                color="#ffffff"
                opacity={0.85}
                fade={140}
                growth={4}
                speed={0.08}
              />
              <Cloud
                seed={2}
                position={[40, 62, 25]}
                segments={26}
                bounds={[24, 5, 8]}
                volume={8}
                color="#fafdff"
                opacity={0.78}
                fade={140}
                growth={4}
                speed={0.06}
              />
              <Cloud
                seed={3}
                position={[5, 48, 70]}
                segments={20}
                bounds={[18, 3, 6]}
                volume={6}
                color="#ffffff"
                opacity={0.7}
                fade={140}
                growth={3}
                speed={0.05}
              />
              <Cloud
                seed={4}
                position={[-60, 70, 50]}
                segments={22}
                bounds={[20, 4, 7]}
                volume={7}
                color="#f4f8ff"
                opacity={0.72}
                fade={140}
                growth={3}
                speed={0.04}
              />
            </Clouds>
            <Scene />
            <EngineRoom
              onHmiZoom={() => { clearAllZoom(); setZoomedHMI(true); }}
              hmiLookAtRef={hmiLookAtRef}
              hmiZoomed={zoomedHMI}
              onVfdZoom={() => { clearAllZoom(); setZoomedVfd(true); }}
              vfdLookAtRef={vfdLookAtRef}
              vfdZoomed={zoomedVfd}
              onCdwpVfdZoom={() => { clearAllZoom(); setZoomedCdwpVfd(true); }}
              onChwpVfdZoom={() => { clearAllZoom(); setZoomedChwpVfd(true); }}
              cdwpVfdZoomed={zoomedCdwpVfd}
              chwpVfdZoomed={zoomedChwpVfd}
              cdwpVfdLookAtRef={cdwpVfdLookAtRef}
              chwpVfdLookAtRef={chwpVfdLookAtRef}
              cdwpVfdCamPosRef={cdwpVfdCamPosRef}
              chwpVfdCamPosRef={chwpVfdCamPosRef}
            />
            <InspectRaycaster />

            {/* Camera animation on OptiView / VFD panel zoom (click-to-zoom + lerp). */}
            <CameraController
              panelZoom={panelZoom}
              hmiLookAtRef={hmiLookAtRef}
              vfdLookAtRef={vfdLookAtRef}
              cdwpVfdLookAtRef={cdwpVfdLookAtRef}
              chwpVfdLookAtRef={chwpVfdLookAtRef}
              cdwpVfdCamPosRef={cdwpVfdCamPosRef}
              chwpVfdCamPosRef={chwpVfdCamPosRef}
            />

            {/* HVAC technician — first-person camera, WASD / Arrows to move,
                Shift to run, mouse-look via PointerLockControls (click to lock,
                Esc to release pointer-lock).

                While a panel is zoomed (`panelZoom !== 'none'`) we PAUSE
                the technician (so its useFrame stops writing camera.position
                every frame) AND we unmount PointerLockControls (so mouse
                motion doesn't keep rotating the camera quaternion).
                Together this lets <CameraController/> be the sole owner of
                the camera transform while the operator is reading an
                instrument panel — fixing the symptom of the camera
                "breaking away" from the panel once the zoom tween settles. */}
            <TechnicianController
              enabled
              paused={panelZoom !== 'none'}
              spawnPosition={[10, 0, 12]}
            />
            {panelZoom === 'none' && <PointerLockControls makeDefault />}
          </Suspense>
        </Canvas>
      </div>

      {/* Centered crosshair (Minecraft-style reticle) */}
      <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 22,
            height: 22,
            zIndex: 25,
            pointerEvents: 'none',
            mixBlendMode: 'difference',
            opacity: 0.85,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              height: 2,
              marginTop: -1,
              background: '#fff',
              borderRadius: 1,
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              width: 2,
              height: '100%',
              marginLeft: -1,
              background: '#fff',
              borderRadius: 1,
            }}
          />
        </div>

      {/* Exit-zoom button — appears top-left when HMI is zoomed in.
          We deliberately DO NOT cover the screen with a click-shield, so
          the HMI itself remains fully interactive (the user can read and
          click through the enlarged UI). */}
      {panelZoom !== 'none' && (
        <button
          type="button"
          onClick={clearAllZoom}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 60,
            padding: '8px 14px',
            fontSize: 13,
            fontFamily: 'system-ui, sans-serif',
            color: '#f0f0f0',
            background: 'rgba(20,20,20,0.78)',
            border: '1px solid #555',
            borderRadius: 6,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {panelZoom === 'vfd'      ? '← Exit VFD HMI'      :
           panelZoom === 'cdwp-vfd' ? '← Exit CDWP VFD HMI' :
           panelZoom === 'chwp-vfd' ? '← Exit CHWP VFD HMI' :
                                      '← Exit OptiView'}
        </button>
      )}
    </div>
  );
}