import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useState, useRef, useEffect, useLayoutEffect, type MutableRefObject, type CSSProperties } from 'react';
import { useGLTF, Text, OrbitControls, PointerLockControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Scene, CHILLER_ORBIT_TARGET, DEFAULT_SIM_CAMERA_POSITION } from './components/canvas/Scene';
import { InspectRaycaster } from './components/canvas/InspectRaycaster';
import { TechnicianController } from './components/canvas/TechnicianController';
import { CxAlloyWidget, CxAlloyHtmlMaximized } from './components/ui/CxAlloyPanel';
import { ControlPanelUI } from './components/ui/ControlPanelUI';
import { useWalkModeStore } from './store/useWalkModeStore';
import { LADDER, ROOF_WALK_Y } from './world/walkModeWorld';
import { HMIPanel } from './components/ui/HMIPanel';
import {
  PressureGauge,
  TemperatureGauge,
  GateValve,
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
import { useSimulationStore } from './store/useSimulationStore';
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
  axisAlong: 'x' | 'z';
  pipeRadius: number;
  bgColor: string;
  text: string;
  flowSign: 1 | -1;
  width?: number;
}) {
  /* Sleeve sits a hair outside the pipe insulation to avoid z-fighting */
  const sleeveRadius = pipeRadius + 0.012;
  const faceOffset = sleeveRadius + 0.006;

  /* Default cylinder axis is +Y. Rotate to align with chosen world axis. */
  const sleeveRot: [number, number, number] =
    axisAlong === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];

  /* Visible label "face" height — the colored band on the front of the pipe */
  const faceHeight = pipeRadius * 1.55;
  const fontSize = faceHeight * 0.42;
  const arrowSize = faceHeight * 0.55;
  const textWidth = width - arrowSize * 2.4;

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
      <mesh rotation={sleeveRot} position={[axisAlong === 'x' ? 0 : 0, 0, 0]}>
        <cylinderGeometry args={[sleeveRadius + 0.002, sleeveRadius + 0.002, 0.02, 24, 1, true]} />
        <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
      </mesh>
      <mesh
        rotation={sleeveRot}
        position={
          axisAlong === 'x' ? [width / 2 - 0.01, 0, 0] : [0, 0, width / 2 - 0.01]
        }
      >
        <cylinderGeometry args={[sleeveRadius + 0.002, sleeveRadius + 0.002, 0.02, 24, 1, true]} />
        <meshStandardMaterial color="#0a0a0a" side={THREE.DoubleSide} />
      </mesh>
      <mesh
        rotation={sleeveRot}
        position={
          axisAlong === 'x' ? [-width / 2 + 0.01, 0, 0] : [0, 0, -width / 2 + 0.01]
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
            : [faceOffset, 0, -flowSign * arrowSize * 0.4]
        }
        rotation={axisAlong === 'x' ? [0, 0, 0] : [0, Math.PI / 2, 0]}
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
      ) : (
        <mesh
          position={[faceOffset, 0, flowSign * (width / 2 - arrowSize * 0.7)]}
          rotation={[flowSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0]}
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
   Side condenser-water flanges on −X face at y≈+2.04 / +2.20.
   ───────────────────────────────────────────────────────────────────────── */
function RooftopCoolingTower({ position }: { position: [number, number, number] }) {
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

      {/* ─── SIDE PIPING CONNECTION FLANGES (-X face) ───────────────────
         Two stub-out connections on the −X end-wall of the tower casing,
         spread in Z to align with the engine-room CDW pipe pair (1.15 m
         centerline spacing, matching the chiller's CW_Z_SUPPLY / RETURN
         constants in EngineRoom). Supply flange is the upper / north
         connection (green); return is lower / south (light green). */}
      {[
        { y: +2.20, z: -0.575, body: '#1d7a3a' as const, key: 'sup' }, // supply (green)
        { y: +2.04, z: +0.575, body: '#7ec07a' as const, key: 'ret' }, // return (light green)
      ].map(({ y, z, body, key }) => (
        <group key={`twr-flg-${key}`} position={[-(W / 2), y, z]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.30, 0.30, 0.45, 16]} />
            <meshStandardMaterial color={body} roughness={0.7} metalness={0.3} />
          </mesh>
          <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.42, 0.42, 0.06, 16]} />
            <meshStandardMaterial color={'#b07030'} roughness={0.25} metalness={0.95} />
          </mesh>
          {Array.from({ length: 8 }).map((_, fi) => {
            const a = (fi / 8) * Math.PI * 2;
            return (
              <mesh
                key={`bolt-${key}-${fi}`}
                position={[-0.225, Math.cos(a) * 0.36, Math.sin(a) * 0.36]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.025, 0.025, 0.05, 6]} />
                <meshStandardMaterial color={'#222'} roughness={0.5} metalness={0.8} />
              </mesh>
            );
          })}
        </group>
      ))}

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
function RooftopAHU({ position }: { position: [number, number, number] }) {
  const reliefFanRef = useRef<THREE.Group>(null);
  const exhaustFanRef = useRef<THREE.Group>(null);
  const blowerARef = useRef<THREE.Group>(null);
  const blowerBRef = useRef<THREE.Group>(null);
  const runLedRef = useRef<THREE.MeshStandardMaterial>(null);
  const alarmLedRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, dt) => {
    if (reliefFanRef.current) reliefFanRef.current.rotation.y += dt * 4.6;
    if (exhaustFanRef.current) exhaustFanRef.current.rotation.y -= dt * 5.8;
    /* Centrifugal blowers spin much faster than the axial roof fans */
    if (blowerARef.current) blowerARef.current.rotation.x += dt * 14.0;
    if (blowerBRef.current) blowerBRef.current.rotation.x += dt * 14.0;
    const t = state.clock.elapsedTime;
    if (runLedRef.current) {
      runLedRef.current.emissiveIntensity = 1.4 + Math.sin(t * 3.0) * 0.45;
    }
    if (alarmLedRef.current) {
      /* Slow steady amber "communicating" pulse */
      alarmLedRef.current.emissiveIntensity = 0.6 + (Math.sin(t * 1.2) + 1) * 0.4;
    }
  });

  /* ── Casing dimensions ── */
  const W = 14.5;           // length (airflow axis)
  const D = 5.6;            // depth
  const H = 4.0;            // height

  /* Section X-positions (local) */
  const OA_X_MIN   = -W / 2;            // -7.25
  const OA_X_MAX   = -W / 2 + 2.85;     // -4.40
  const FILT_X_MIN = OA_X_MAX;          // -4.40
  const FILT_X_MAX = OA_X_MAX + 2.60;   // -1.80
  const COIL_X_MIN = FILT_X_MAX;        // -1.80
  const COIL_X_MAX = FILT_X_MAX + 5.00; // +3.20
  const FAN_X_MIN  = COIL_X_MAX;        // +3.20
  const FAN_X_MAX  = COIL_X_MAX + 3.00; // +6.20
  const DISC_X_MIN = FAN_X_MAX;         // +6.20
  const DISC_X_MAX = +W / 2;            // +7.25

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

      {/* ─── MAIN CASING ─── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={casing} roughness={0.55} metalness={0.45} />
      </mesh>

      {/* Top deck slightly inset (gives a flanged-roof look) */}
      <mesh position={[0, H / 2 + 0.04, 0]}>
        <boxGeometry args={[W + 0.06, 0.08, D + 0.06]} />
        <meshStandardMaterial color={casingDark} roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Vertical panel seams along +Z and -Z faces (every section boundary
          plus mid-bay seams, since each section is too wide for one panel) */}
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

      {/* Horizontal mid-band (visual panel reinforcement, two bands on tall casing) */}
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

      {/* ─── OUTSIDE-AIR INTAKE HOOD (−X end) ─── */}
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

      {/* ─── PRE-FILTER + FINAL-FILTER SECTION — twin access doors (+Z) ─── */}
      {[FILT_X - 0.65, FILT_X + 0.65].map((dx, di) => (
        <group key={`filt-door-${di}`}>
          <mesh position={[dx, -0.10, D / 2 + 0.014]}>
            <boxGeometry args={[1.10, H - 0.70, 0.025]} />
            <meshStandardMaterial color={door} roughness={0.55} metalness={0.45} />
          </mesh>
          {/* Door handle */}
          <mesh position={[dx + 0.42, -0.10, D / 2 + 0.038]}>
            <boxGeometry args={[0.14, 0.14, 0.05]} />
            <meshStandardMaterial color={accent} roughness={0.45} metalness={0.7} />
          </mesh>
          {/* Hinges */}
          {[-0.6, 0.6].map((hy, hi) => (
            <mesh key={`fhinge-${di}-${hi}`} position={[dx - 0.50, hy * 0.65, D / 2 + 0.032]}>
              <boxGeometry args={[0.08, 0.14, 0.022]} />
              <meshStandardMaterial color={accent} roughness={0.5} metalness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Differential-pressure gauge on the filter section (telltale of a real filter bank) */}
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
      {/* "FILTER SECTION" stencil */}
      <Text
        position={[FILT_X, 1.55, D / 2 + 0.034]}
        fontSize={0.13}
        color={'#1a1f24'}
        anchorX="center"
        anchorY="middle"
      >
        FILTER SECTION
      </Text>

      {/* ─── COOLING COIL SECTION — three access doors (+Z face) ─── */}
      {[COIL_X - 1.55, COIL_X, COIL_X + 1.55].map((dx, di) => (
        <group key={`coil-door-${di}`}>
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
      <Text
        position={[COIL_X, 1.55, D / 2 + 0.034]}
        fontSize={0.16}
        color={'#1a1f24'}
        anchorX="center"
        anchorY="middle"
      >
        CHILLED WATER COOLING COIL
      </Text>

      {/* ─── FAN SECTION — twin centrifugal blowers behind screened access ─── */}
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
      {/* Twin centrifugal blowers (rotating wheels visible behind grilles) */}
      {[
        { ref: blowerARef, x: FAN_X - 0.75 },
        { ref: blowerBRef, x: FAN_X + 0.75 },
      ].map((b, bi) => (
        <group key={`blower-${bi}`} ref={b.ref} position={[b.x, 0.0, D / 2 - 0.30]}>
          <mesh>
            <cylinderGeometry args={[0.55, 0.55, 0.95, 28]} />
            <meshStandardMaterial color={'#1d1f23'} roughness={0.5} metalness={0.6} />
          </mesh>
          {Array.from({ length: 22 }).map((_, ji) => {
            const ang = (ji / 22) * Math.PI * 2;
            return (
              <mesh
                key={`bblade-${bi}-${ji}`}
                position={[Math.cos(ang) * 0.50, 0, Math.sin(ang) * 0.50]}
                rotation={[0, -ang, 0]}
              >
                <boxGeometry args={[0.04, 0.95, 0.18]} />
                <meshStandardMaterial color={blower} roughness={0.45} metalness={0.55} />
              </mesh>
            );
          })}
          <mesh>
            <cylinderGeometry args={[0.10, 0.10, 1.00, 12]} />
            <meshStandardMaterial color={motorBlk} roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      ))}
      {/* VFD enclosures stacked on the −Z face of the fan section, one per blower */}
      {[FAN_X - 0.75, FAN_X + 0.75].map((vx, vi) => (
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

      {/* ─── DISCHARGE PLENUM END CAP (+X end) ─── */}
      <mesh position={[DISC_X_MAX + 0.014, 0, 0]}>
        <boxGeometry args={[0.030, H - 0.08, D - 0.08]} />
        <meshStandardMaterial color={casingDark} roughness={0.55} metalness={0.5} />
      </mesh>
      {/* Test port covers on discharge end */}
      {[-0.8, -0.3, 0.3, 0.8].map((py, pi) => (
        <mesh key={`tport-${pi}`} position={[DISC_X_MAX + 0.034, py, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.025, 12]} />
          <meshStandardMaterial color={accent} roughness={0.4} metalness={0.8} />
        </mesh>
      ))}

      {/* ─── DISCONNECT SWITCH / CONTROL ENCLOSURE on +Z face (discharge end) ─── */}
      <group position={[DISC_X_MIN - 0.20, -0.40, D / 2 + 0.13]}>
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

      {/* ─── EQUIPMENT LABEL on +Z face (camera-facing) ─── */}
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

      {/* ─── NAMEPLATE on -Z face (back side, visible from rooftop walkway) ─── */}
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

      {/* Floating overhead label (mirrors cooling-tower style) */}
      <Text position={[0, H / 2 + 1.95, 0]} fontSize={0.42} color="#ffffff" anchorX="center" anchorY="middle">
        AHU-1
      </Text>
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
}: {
  onHmiZoom: () => void;
  hmiLookAtRef: MutableRefObject<THREE.Vector3>;
  hmiZoomed: boolean;
  onVfdZoom: () => void;
  vfdLookAtRef: MutableRefObject<THREE.Vector3>;
  vfdZoomed: boolean;
}) {
  const compressorRunning = useSimulationStore((s) => s.state.compressorRunning);
  const vfdScreenAnchorRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = vfdScreenAnchorRef.current;
    if (g) g.getWorldPosition(vfdLookAtRef.current);
  });
  /* ─── Chiller_R2.glb shell geometry (verified via scripts/inspect-chiller.mjs) ───
     Two horizontal heat-exchanger shells run along Z, capped by flat head plates
     (Plane_Baked / Plane001_Baked) whose outer face sits at z ≈ ±4.65.

     LOWER shell — condenser side (CDW circuit)
       Cylinder_Baked / Cylinder002_Baked / Cylinder009_Baked
       center=(0.000, 0.800),  outer R≈1.087,  top y≈1.887
       modelled water nozzle Cylinder017_Baked at (0.335, 2.042, +3.657).

     UPPER shell — evaporator side (CHW circuit)
       Cylinder001_Baked / Cylinder003_Baked / Cylinder010_Baked
       center=(-2.092, 1.218), outer R≈0.895, top y≈2.113
       modelled water nozzle Cylinder018_Baked at (-1.984, 2.304, -3.531). */
  const HEAD_Z = 4.65;            // outer face of dished head end-plate

  // Evaporator (upper) shell — chilled water side
  const EVAP_X        = -2.092;   // shell axis X
  const EVAP_NOZZLE_Y =  2.30;    // matches modelled Cylinder018_Baked

  // Condenser (lower) shell — condenser water side
  const COND_NOZZLE_X =  0.335;   // matches modelled Cylinder017_Baked
  const COND_NOZZLE_Y =  2.05;    // matches modelled Cylinder017_Baked

  /* ─── Piping geometry constants ────────────────────────────────────────
     Pipe centerlines are spaced so 0.44m insulated jackets never intersect
     (centerline spacing ≥ 0.90m). Horizontal mains run overhead at code-
     compliant headroom (>2.4m / 8ft AFF; here ~9m / 30ft for clearance over
     the chiller, walkways, and pumps). All elbows are short-radius (1.0 D). */
  /** 24" Sch.40 main — single outer radius for straights, elbows (torus tube), and fittings. */
  const MAIN_PIPE_RADIUS = 0.30;
  const MAIN_PIPE_INS_RADIUS = MAIN_PIPE_RADIUS + 0.10; // closed-cell jacket over bare pipe
  // CHW (chilled water) — both stubs leave the −Z evaporator head, run parallel
  // toward −Z to the riser tops, then turn UP to the overhead main, run along
  // −X to the side wall, and drop to the wall penetration.
  const CHW_X_SUPPLY    = EVAP_X - 0.45;     // -2.542 (left nozzle on −Z head)
  const CHW_X_RETURN    = EVAP_X + 0.45;     // -1.642 (right nozzle on −Z head)
  const CHW_Z_SUPPLY    = -(HEAD_Z + 0.95);  // -5.60 (riser Z — clear of head)
  const CHW_Z_RETURN    = -(HEAD_Z + 2.10);  // -6.75 (1.15m apart, no overlap)
  const CHW_Y_FLANGE    = EVAP_NOZZLE_Y;     // 2.30 — head nozzle centerline

  // CDW (condenser water) — both stubs leave the +Z condenser head, run parallel
  // toward +Z, turn UP, pass through roof penetrations, run on roof to tower.
  const CW_X_SUPPLY     =  COND_NOZZLE_X;    // +0.335 (snaps to modelled nozzle)
  const CW_X_RETURN     = -COND_NOZZLE_X;    // -0.335 (mirrored — return nozzle)
  const CW_Z_SUPPLY     =  +(HEAD_Z + 0.95); // +5.60 (riser Z — clear of head)
  const CW_Z_RETURN     =  +(HEAD_Z + 2.10); // +6.75
  const CW_Y_FLANGE     =  COND_NOZZLE_Y;    // 2.05 — head nozzle centerline
  const CW_Y_ROOF_TOP   = 12.55;             // horizontal main elevation on roof
  const CW_TOWER_X      =  25;               // cooling tower position X
  const CW_TOWER_Z      = (CW_Z_SUPPLY + CW_Z_RETURN) / 2;  // 6.175 — tower-curb Z
  // Tower side-flange world positions (set by RooftopCoolingTower component).
  // Local Z offsets (-0.575 supply, +0.575 return) snap exactly to CW_Z_SUPPLY
  // and CW_Z_RETURN because CW_TOWER_Z is the average of those.
  const CW_TOWER_FLG_Y_SUP = 14.68 + 2.20;   // 16.88 (green / supply)
  const CW_TOWER_FLG_Y_RET = 14.68 + 2.04;   // 16.72 (return)
  const CW_TOWER_FLG_X     = CW_TOWER_X - 2.0;        // 23.0 — outer face of tower (-X)
  const CW_TOWER_FLG_Z_SUP = CW_TOWER_Z - 0.575;      // = CW_Z_SUPPLY
  const CW_TOWER_FLG_Z_RET = CW_TOWER_Z + 0.575;      // = CW_Z_RETURN
  void CW_TOWER_FLG_Z_SUP; void CW_TOWER_FLG_Z_RET;   // documentation aliases

  /* Z position where the lateral barrel-stub terminates (= head outer face). */
  const CHW_STUB_Z_IN = -HEAD_Z;             // -4.65
  const CW_STUB_Z_IN  =  HEAD_Z;             //  4.65

  /* ─── ROOFTOP AIR-HANDLING UNIT (AHU-1) ───
     Built-up cabinet sized to load up the full 500-ton chiller. Centered
     between the two CHW pipes in Z so the chilled-water risers come
     straight up under the cooling-coil section. */
  const AHU_X = -22;                         // unit center on roof
  const AHU_W = 14.5;                        // casing width along X (must match RooftopAHU)
  const AHU_D = 5.6;                         // casing depth along Z (must match RooftopAHU)
  const AHU_Z = (CHW_Z_SUPPLY + CHW_Z_RETURN) / 2;
  const AHU_H = 4.0;                         // casing height (must match RooftopAHU)
  const AHU_BASE_Y = 12.55;                  // top of curb (deck y=12.05 + curb top 0.50)
  const AHU_Y = AHU_BASE_Y + AHU_H / 2;      // 14.55 — center of casing in world Y
  const AHU_TOP_Y = AHU_BASE_Y + AHU_H;      // 16.55 — top of casing
  const AHU_EAST_X = AHU_X + AHU_W / 2;      // -14.75 — east (downstream) end face
  const AHU_TEE_X  = AHU_EAST_X + 1.25;      // -13.50 — header tee just east of the casing
  // Reference dims kept for documentation; consumed inside RooftopAHU prop math.
  void AHU_D; void AHU_TOP_Y;

  return (
    <group>
      {/* ─── CONCRETE FLOOR SLAB ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#9a958e" roughness={0.97} metalness={0.01} />
      </mesh>

      {/* Slab section marks */}
      {[[-30, -30], [-30, 0], [-30, 30], [0, -30], [0, 0], [0, 30], [30, -30], [30, 0], [30, 30]].map(([x, z], i) => (
        <mesh key={`slab-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.03, z]}>
          <planeGeometry args={[59.9, 59.9]} />
          <meshStandardMaterial color="#8c8780" roughness={0.98} metalness={0.01} />
        </mesh>
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

      {/* ─── HANGING LIGHT FIXTURES ─── */}
      {[-20, -10, 0, 10, 20].map((x, xi) =>
        [-30, -15, 0, 15, 30].map((z, zi) => (
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

      {/* ─── SUPPORT COLUMNS ─── */}
      {[[-25, -25], [-25, 25], [25, -25], [25, 25]].map(([x, z], i) => (
        <group key={`col-${i}`} position={[x, 0, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.8, 12, 0.8]} />
            <meshStandardMaterial color="#6a6a68" roughness={0.7} metalness={0.5} />
          </mesh>
          {/* Column base plate */}
          <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[1.2, 1.2, 0.1]} />
            <meshStandardMaterial color="#4a4a48" roughness={0.7} metalness={0.6} />
          </mesh>
          {/* Column cap */}
          <mesh position={[0, 6.1, 0]}>
            <boxGeometry args={[0.9, 0.2, 0.9]} />
            <meshStandardMaterial color="#555" roughness={0.5} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ─── WATER PUMPS ─── */}
      {/* Pump 1 — left front */}
      <group position={[-22, 0, -22]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.0, 1.0, 2.5, 20]} />
          <meshStandardMaterial color="#5a5a58" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 1.6, 16]} />
          <meshStandardMaterial color="#4a6a4a" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[2.2, 0.35, 2.2]} />
          <meshStandardMaterial color="#444" roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh position={[0, 3.0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.7, 16]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>

      {/* Pump 2 — left rear */}
      <group position={[-22, 0, 22]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.9, 0.9, 2.2, 20]} />
          <meshStandardMaterial color="#5a5a58" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.65, 0.65, 1.4, 16]} />
          <meshStandardMaterial color="#4a6a4a" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[2.0, 0.3, 2.0]} />
          <meshStandardMaterial color="#444" roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh position={[0, 2.7, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.6, 16]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
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

      {/* Horizontal bladder tank — right front */}
      <group position={[22, 0, 22]}>
        <mesh castShadow receiveShadow rotation={[0, Math.PI/2, 0]}>
          <cylinderGeometry args={[1.1, 1.1, 3.5, 20]} />
          <meshStandardMaterial color="#6a6a68" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0, 2.1]} rotation={[0, Math.PI/2, 0]}>
          <cylinderGeometry args={[1.15, 1.15, 0.1, 20]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0, -2.1]} rotation={[0, Math.PI/2, 0]}>
          <cylinderGeometry args={[1.15, 1.15, 0.1, 20]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Saddle supports */}
        <mesh position={[0, -1.4, 0.8]}>
          <boxGeometry args={[0.3, 2.0, 0.3]} />
          <meshStandardMaterial color="#555" roughness={0.6} metalness={0.6} />
        </mesh>
        <mesh position={[0, -1.4, -0.8]}>
          <boxGeometry args={[0.3, 2.0, 0.3]} />
          <meshStandardMaterial color="#555" roughness={0.6} metalness={0.6} />
        </mesh>
      </group>

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

      {/* ─── FLOOR DRAINS ─── */}
      {[[-15, -15], [-15, 15], [15, -15], [15, 15]].map(([x, z], i) => (
        <group key={`drain-${i}`} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.25, 0.4, 12]} />
            <meshStandardMaterial color="#3a3a38" roughness={0.95} metalness={0.3} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
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

      {/* ─── CHILLER ANCHOR BOLTS ─── */}
      {[[-2.5, -3], [-2.5, 3], [2.5, -3], [2.5, 3]].map(([x, z], i) => (
        <group key={`bolt-${i}`} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
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
        const CHW_ELBOW_R = 0.35;                         // long-radius barrel-head elbow
        // The barrel-head elbow's lower tangent (riser-side) sits at
        // CHW_Y_FLANGE − R = 1.95. The drop riser must come up to this Y
        // and slip a few cm INTO the elbow body so the joint visually reads
        // as a continuous welded ell — no daylight at the seam.
        const ELBOW_TAN_Y = CHW_Y_FLANGE - CHW_ELBOW_R;   // 1.95 — exact tangent
        const ELBOW_OUT_Y = ELBOW_TAN_Y + 0.04;           // 1.99 — small overlap
        const DROP_LEN    = ELBOW_OUT_Y - HEADER_Y;       // 0.89 m drop to header
        const DROP_CTR_Y  = (ELBOW_OUT_Y + HEADER_Y) / 2;
        const HEADER_LEN  = Math.abs(CHW_X_SUPPLY - AHU_X) + 1.0; // chiller riser → past AHU tee
        const HEADER_CTR_X = (CHW_X_SUPPLY + AHU_X) / 2 - 0.5;
        return (
          <group>
            {(
              [
                ['sup', CHW_X_SUPPLY, CHW_Z_SUPPLY, '#1c5aa8', '#143f7a'] as const,
                ['ret', CHW_X_RETURN, CHW_Z_RETURN, '#c9b68c', '#a89270'] as const,
              ]
            ).map(([key, xRiser, z, pipeC, insC]) => (
              <group key={`chw-leg-${key}`}>
                {/* Short vertical drop from barrel-head elbow to header */}
                <mesh position={[xRiser, DROP_CTR_Y, z]}>
                  <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, DROP_LEN, 16]} />
                  <meshStandardMaterial color={pipeC} roughness={0.6} metalness={0.4} />
                </mesh>
                <mesh position={[xRiser, DROP_CTR_Y, z]}>
                  <cylinderGeometry args={[MAIN_PIPE_INS_RADIUS, MAIN_PIPE_INS_RADIUS, Math.max(DROP_LEN - 0.18, 0.05), 14]} />
                  <meshStandardMaterial color={insC} roughness={0.9} metalness={0.0} transparent opacity={0.92} />
                </mesh>
                {/* Welded tee at the chiller end of the header (vertical drop ↔ horizontal main) */}
                <mesh position={[xRiser, HEADER_Y, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.42, 0.42, 0.7, 16]} />
                  <meshStandardMaterial color={pipeC} roughness={0.5} metalness={0.5} />
                </mesh>
                {/* Companion flange pair at the tee (welded-neck flanges, ANSI 150) */}
                {[-0.36, +0.36].map((dx, fi) => (
                  <mesh
                    key={`chw-tee-flg-${key}-${fi}`}
                    position={[xRiser + dx, HEADER_Y, z]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[0.46, 0.46, 0.06, 16]} />
                    <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
                  </mesh>
                ))}
                {/* Horizontal header — 24" Sch.40 carbon steel */}
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
            ))}

            {/* Inline OS&Y gate valves at chiller side of each header (~3 m from tee) */}
            <GateValve position={[CHW_X_SUPPLY - 3.0, HEADER_Y, CHW_Z_SUPPLY]} pipeRadius={MAIN_PIPE_RADIUS} bodyColor="#1c5aa8" />
            <GateValve position={[CHW_X_RETURN - 3.0, HEADER_Y, CHW_Z_RETURN]} pipeRadius={MAIN_PIPE_RADIUS} bodyColor="#a89270" />

            {/* Inline OS&Y gate valves at AHU side of each header
                (just chiller-side of the new AHU east-face tee at AHU_TEE_X) */}
            <GateValve position={[AHU_TEE_X + 1.5, HEADER_Y, CHW_Z_SUPPLY]} pipeRadius={MAIN_PIPE_RADIUS} bodyColor="#1c5aa8" />
            <GateValve position={[AHU_TEE_X + 1.5, HEADER_Y, CHW_Z_RETURN]} pipeRadius={MAIN_PIPE_RADIUS} bodyColor="#a89270" />
          </group>
        );
      })()}

      {/* ─── ROOFTOP DECK (above machine room walls, y≈12) ───
          Slab is split so the roof-access shaft matches walkModeWorld LADDER
          (open hatch — no concrete over the opening). */}
      <group position={[0, 12.05, 0]}>
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
      <RooftopCoolingTower position={[25, 14.68, CW_TOWER_Z]} />

      {/* ═══════════════════════════════════════════════
          CONDENSER WATER PIPING (CDWS / CDWR)
          ─────────────────────────────────────────────
          Loop between the chiller condenser (+Z barrel-
          head nozzles) and the rooftop induced-draft
          cooling tower. Each circuit:
            barrel-head nozzle (y≈2.05)
              → lateral stub  (along +Z)
              → 90° elbow     (existing barrel-head kit)
              → vertical riser through roof penetration
              → 90° elbow on rooftop turning toward +X
              → horizontal main on roof toward tower
              → 90° elbow at tower riser
              → vertical lift to tower side flange
          Pipe sizes: 24" Sch.40 carbon steel (uninsulated
          per ASHRAE 90.1 — heat gain on the outdoor
          condenser loop is negligible). Color identifies
          service per ASME A13.1 / SMACNA.
      ═══════════════════════════════════════════════ */}
      {(
        [
          ['sup', CW_X_SUPPLY, CW_Z_SUPPLY, '#1d7a3a', '#0e5a22', 'CONDENSER WATER SUPPLY', 'CWS', -1, CW_TOWER_FLG_Y_SUP] as const,
          ['ret', CW_X_RETURN, CW_Z_RETURN, '#7ec07a', '#3e7a3a', 'CONDENSER WATER RETURN', 'CWR', +1, CW_TOWER_FLG_Y_RET] as const,
        ]
      ).map(([key, xRiser, z, pipeC, lblC, fullName, shortName, flow, twrY]) => {
        const R             = 0.45;                            // long-radius elbow on rooftop main
        const CDW_BARREL_R  = 0.35;                            // barrel-head elbow centerline (matches barrel-head kit; > MAIN_PIPE_RADIUS)
        const ROOF_LINE_Y   = 12.05;                           // top of rooftop deck
        const MAIN_Y        = CW_Y_ROOF_TOP;                   // 12.55 — horizontal main on roof
        // Engine-room riser TERMINATES exactly at the barrel-head elbow's
        // riser-side tangent. The barrel-head elbow centre sits at
        // y = CW_Y_FLANGE − R (so the lateral spool, which is R above the
        // centre, lands on CW_Y_FLANGE). The riser-side tangent point is
        // at the same Y as the elbow centre, with the riser extending in
        // +Y from there. A 4 cm overlap tucks the riser end inside the
        // elbow body for a clean welded appearance with no daylight at
        // the seam — the previous −0.70 offset overshot the elbow by a
        // full meter, leaving an orphan pipe stub hanging in the air.
        const ENG_BOT_Y     = CW_Y_FLANGE - CDW_BARREL_R - 0.04; // 1.71
        const ENG_TOP_Y     = MAIN_Y - R;                      // top of engine-room riser (below upper elbow)
        const ENG_LEN       = ENG_TOP_Y - ENG_BOT_Y;
        const ENG_CTR_Y     = (ENG_BOT_Y + ENG_TOP_Y) / 2;
        // Tower-side riser sits 1.0 m back from the flange face so a short
        // horizontal stub (length R + 0.05) can enter the flange in -X.
        const TWR_X         = CW_TOWER_FLG_X + 0.95;
        const ROOF_X_START  = xRiser + R;                      // after upper elbow
        const ROOF_X_END    = TWR_X - R;                       // before tower elbow
        const ROOF_LEN      = ROOF_X_END - ROOF_X_START;
        const ROOF_CTR_X    = (ROOF_X_START + ROOF_X_END) / 2;
        const TWR_BOT_Y     = MAIN_Y + R;                      // after lower tower elbow
        const TWR_TOP_Y     = twrY;                            // flange face Y
        const TWR_LEN       = TWR_TOP_Y - TWR_BOT_Y;
        const TWR_CTR_Y     = (TWR_BOT_Y + TWR_TOP_Y) / 2;
        const STUB_X_START  = TWR_X - R;                       // after top tower elbow
        const STUB_X_END    = CW_TOWER_FLG_X + 0.05;           // just inside flange face
        const STUB_LEN      = STUB_X_START - STUB_X_END;
        const STUB_CTR_X    = (STUB_X_START + STUB_X_END) / 2;
        return (
          <group key={`cdw-${key}`}>
            {/* Engine-room vertical riser */}
            <mesh position={[xRiser, ENG_CTR_Y, z]}>
              <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, ENG_LEN, 16]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>
            {/* Welded-neck flange just under the roof penetration (service / break point) */}
            <mesh position={[xRiser, ROOF_LINE_Y - 0.40, z]}>
              <cylinderGeometry args={[0.46, 0.46, 0.06, 16]} />
              <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
            </mesh>
            {/* Roof penetration sleeve (galvanized) */}
            <mesh position={[xRiser, ROOF_LINE_Y, z]}>
              <cylinderGeometry args={[0.42, 0.45, 0.45, 16]} />
              <meshStandardMaterial color="#7c8086" roughness={0.55} metalness={0.55} />
            </mesh>
            {/* Roof flashing storm-collar */}
            <mesh position={[xRiser, ROOF_LINE_Y + 0.30, z]}>
              <cylinderGeometry args={[0.55, 0.55, 0.04, 16]} />
              <meshStandardMaterial color="#5a5854" roughness={0.85} metalness={0.15} />
            </mesh>
            {/* 90° elbow at top of engine-room riser (riser +Y → main +X) */}
            <mesh
              position={[xRiser + R, MAIN_Y - R, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>
            {/* Rooftop horizontal main toward cooling tower */}
            <mesh position={[ROOF_CTR_X, MAIN_Y, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, ROOF_LEN, 16]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>
            {/* Roof pipe support sleepers (rubber-pad isolators on the deck) */}
            {[ROOF_CTR_X - 4, ROOF_CTR_X + 4].map((sx, si) => (
              <group key={`cdw-sleeper-${key}-${si}`}>
                <mesh position={[sx, ROOF_LINE_Y + 0.36, z]}>
                  <boxGeometry args={[0.32, 0.20, 0.50]} />
                  <meshStandardMaterial color="#3a3835" roughness={0.95} metalness={0.05} />
                </mesh>
                <mesh position={[sx, ROOF_LINE_Y + 0.50, z]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.32, 0.022, 8, 18, Math.PI]} />
                  <meshStandardMaterial color="#666" roughness={0.55} metalness={0.7} />
                </mesh>
              </group>
            ))}
            {/* 90° elbow at tower base (main +X → tower riser +Y) */}
            <mesh
              position={[TWR_X - R, MAIN_Y, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>
            {/* Tower-side vertical lift to side-flange elevation */}
            <mesh position={[TWR_X, TWR_CTR_Y, z]}>
              <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, TWR_LEN, 16]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>
            {/* 90° elbow at top of tower riser (tower riser +Y → stub −X) */}
            <mesh
              position={[TWR_X, TWR_TOP_Y, z]}
              rotation={[0, 0, Math.PI]}
            >
              <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>
            {/* Short horizontal stub into the tower side-flange */}
            <mesh position={[STUB_CTR_X, TWR_TOP_Y, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, STUB_LEN, 16]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>
            {/* Companion flange at tower connection */}
            <mesh position={[CW_TOWER_FLG_X + 0.05, TWR_TOP_Y, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.46, 0.46, 0.06, 16]} />
              <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
            </mesh>
            {/* OS&Y gate valve in engine-room riser at maintenance height */}
            <GateValve
              position={[xRiser, 4.50, z]}
              rotation={[0, 0, Math.PI / 2]}
              pipeRadius={MAIN_PIPE_RADIUS}
              bodyColor={pipeC}
            />
            {/* OS&Y gate valve on rooftop main near tower (service isolation) */}
            <GateValve
              position={[ROOF_X_END - 1.6, MAIN_Y, z]}
              pipeRadius={MAIN_PIPE_RADIUS}
              bodyColor={pipeC}
            />
            {/* ANSI A13.1 wraparound bands on the rooftop main */}
            <PipeLabel
              position={[ROOF_CTR_X - 4, MAIN_Y, z]}
              axisAlong="x"
              pipeRadius={MAIN_PIPE_RADIUS}
              bgColor={lblC}
              text={fullName}
              flowSign={flow}
              width={3.0}
            />
            <PipeLabel
              position={[ROOF_CTR_X + 4, MAIN_Y, z]}
              axisAlong="x"
              pipeRadius={MAIN_PIPE_RADIUS}
              bgColor={lblC}
              text={shortName}
              flowSign={flow}
              width={1.6}
            />
            {/* Vertical riser ID band (engine-room side, eye level) */}
            <PipeLabel
              position={[xRiser, 5.5, z]}
              axisAlong="z"
              pipeRadius={MAIN_PIPE_RADIUS}
              bgColor={lblC}
              text={shortName}
              flowSign={flow === -1 ? +1 : -1}
              width={1.4}
            />
          </group>
        );
      })}

      {/* ═══════════════════════════════════════════════
          ROOFTOP AIR HANDLING UNIT (AHU-1)
          Conditions engine-room air via CHW coil.

          CHW SUPPLY / RETURN connection (mirrors the
          cooling-tower CDW pattern):
            in-room low-level header
              → 90° tee at AHU_TEE_X (just east of casing)
              → vertical riser through roof penetration
              → 90° elbow on rooftop turning toward −X
              → short rooftop stub into AHU east end-cap
              → companion flange at casing penetration
              → coil-section header inside the cabinet

          Supply enters the bottom of the coil headers,
          return leaves the top — counter-flow against the
          air stream. This puts the two pipes at clearly
          different heights so service identification is
          obvious from the rooftop.
      ═══════════════════════════════════════════════ */}

      {/* AHU casing on rooftop curb */}
      <RooftopAHU position={[AHU_X, AHU_Y, AHU_Z]} />

      {(
        [
          // [key, z (header line), entry-Y on AHU east face, pipeC, insC, lblC, label]
          ['sup', CHW_Z_SUPPLY, AHU_BASE_Y + 0.85, '#1c5aa8', '#143f7a', '#0d3f7a', 'CHWS'] as const,
          ['ret', CHW_Z_RETURN, AHU_BASE_Y + 3.05, '#c9b68c', '#a89270', '#8a7a52', 'CHWR'] as const,
        ]
      ).map(([key, z, entryY, pipeC, insC, lblC, txt]) => {
        const R             = 0.45;                          // long-radius elbow centerline
        const HEADER_Y      = 1.10;                          // engine-room horizontal main
        const RISER_BOT_Y   = HEADER_Y + 0.30;               // above tee body
        const RISER_TOP_Y   = entryY - R;                    // below upper elbow
        const RISER_LEN     = RISER_TOP_Y - RISER_BOT_Y;
        const RISER_CTR_Y   = (RISER_BOT_Y + RISER_TOP_Y) / 2;
        // Rooftop stub: from elbow exit (x = AHU_TEE_X − R) to AHU east face
        const STUB_X_START  = AHU_TEE_X - R;
        const STUB_X_END    = AHU_EAST_X + 0.04;             // just inside skin panel
        const STUB_LEN      = STUB_X_START - STUB_X_END;
        const STUB_CTR_X    = (STUB_X_START + STUB_X_END) / 2;
        // Internal coil-header stub poking through the east end-cap
        const HDR_X_END     = AHU_EAST_X - 1.10;             // ~1 m into coil section
        const HDR_LEN       = AHU_EAST_X - HDR_X_END;
        const HDR_CTR_X     = (AHU_EAST_X + HDR_X_END) / 2;
        return (
          <group key={`chw-ahu-riser-${key}`}>
            {/* ── Tee body on the in-room horizontal header ── */}
            <mesh position={[AHU_TEE_X, HEADER_Y, z]}>
              <cylinderGeometry args={[0.42, 0.42, 0.62, 16]} />
              <meshStandardMaterial color={pipeC} roughness={0.5} metalness={0.5} />
            </mesh>
            {/* Companion flange pair at the tee */}
            {[-0.36, +0.36].map((dx, fi) => (
              <mesh
                key={`chw-ahu-tee-flg-${key}-${fi}`}
                position={[AHU_TEE_X + dx, HEADER_Y, z]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.46, 0.46, 0.06, 16]} />
                <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
              </mesh>
            ))}

            {/* ── Vertical engine-room riser ── */}
            <mesh position={[AHU_TEE_X, RISER_CTR_Y, z]}>
              <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, RISER_LEN, 16]} />
              <meshStandardMaterial color={pipeC} roughness={0.6} metalness={0.4} />
            </mesh>
            {/* Insulation jacket — full length minus curb flashing zone */}
            <mesh position={[AHU_TEE_X, RISER_CTR_Y - 0.05, z]}>
              <cylinderGeometry args={[MAIN_PIPE_INS_RADIUS, MAIN_PIPE_INS_RADIUS, RISER_LEN - 0.55, 14]} />
              <meshStandardMaterial color={insC} roughness={0.9} metalness={0.0} transparent opacity={0.92} />
            </mesh>
            {/* Roof penetration sleeve (galvanized boot at rooftop deck) */}
            <mesh position={[AHU_TEE_X, 12.10, z]}>
              <cylinderGeometry args={[0.50, 0.55, 0.36, 16]} />
              <meshStandardMaterial color="#7c8086" roughness={0.55} metalness={0.55} />
            </mesh>

            {/* ── Long-radius elbow at top of riser (turns +Y → −X) ──
                 Torus center placed so its default 0→π/2 arc spans
                 from the riser top (R right of center) to the stub
                 right-end (R above center). */}
            <mesh
              position={[AHU_TEE_X - R, RISER_TOP_Y, z]}
            >
              <torusGeometry args={[R, MAIN_PIPE_RADIUS, 12, 20, Math.PI / 2]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>

            {/* ── Rooftop stub into AHU east end-cap ── */}
            <mesh position={[STUB_CTR_X, entryY, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, STUB_LEN, 16]} />
              <meshStandardMaterial color={pipeC} roughness={0.6} metalness={0.4} />
            </mesh>
            {/* Insulation jacket on the rooftop stub */}
            <mesh position={[STUB_CTR_X, entryY, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[MAIN_PIPE_INS_RADIUS, MAIN_PIPE_INS_RADIUS, Math.max(STUB_LEN - 0.20, 0.05), 14]} />
              <meshStandardMaterial color={insC} roughness={0.9} metalness={0.0} transparent opacity={0.92} />
            </mesh>

            {/* Pipe support / saddle on the rooftop deck under the stub */}
            <mesh position={[STUB_CTR_X, 12.40, z]}>
              <boxGeometry args={[0.45, 0.30, 0.50]} />
              <meshStandardMaterial color="#5a5854" roughness={0.85} metalness={0.1} />
            </mesh>

            {/* ── Companion flange pair at the AHU casing penetration ── */}
            <mesh
              position={[AHU_EAST_X + 0.07, entryY, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.46, 0.46, 0.06, 16]} />
              <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
            </mesh>
            {/* Boss / penetration ring on the cabinet skin */}
            <mesh
              position={[AHU_EAST_X + 0.005, entryY, z]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.50, 0.50, 0.04, 18]} />
              <meshStandardMaterial color="#7c8086" roughness={0.5} metalness={0.6} />
            </mesh>
            {/* Bolt circle on the companion flange */}
            {Array.from({ length: 8 }).map((_, bi) => {
              const a = (bi / 8) * Math.PI * 2;
              const r = 0.36;
              return (
                <mesh
                  key={`chw-ahu-bolt-${key}-${bi}`}
                  position={[AHU_EAST_X + 0.10, entryY + Math.sin(a) * r, z + Math.cos(a) * r]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.020, 0.020, 0.05, 6]} />
                  <meshStandardMaterial color="#3b3a38" roughness={0.5} metalness={0.85} />
                </mesh>
              );
            })}

            {/* ── Internal coil-header stub (visible inside on east end-cap) ── */}
            <mesh position={[HDR_CTR_X, entryY, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[MAIN_PIPE_RADIUS, MAIN_PIPE_RADIUS, HDR_LEN, 16]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>
            {/* Header end cap (welded dished cap) */}
            <mesh position={[HDR_X_END - 0.04, entryY, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.30, 0.26, 0.10, 16]} />
              <meshStandardMaterial color={pipeC} roughness={0.55} metalness={0.45} />
            </mesh>

            {/* ── ANSI A13.1 service-ID band on the rooftop stub ── */}
            <PipeLabel
              position={[STUB_CTR_X, entryY, z]}
              axisAlong="x"
              pipeRadius={0.40}
              bgColor={lblC}
              text={txt}
              flowSign={key === 'sup' ? -1 : +1}
              width={1.0}
            />
          </group>
        );
      })}

      {/* ── PIPE IDENTIFICATION BANDS on the low-level CHW headers ──
           ANSI A13.1 wraparound vinyl bands at maintenance-eye level
           every ~6 m on each header. Bands placed between equipment
           where the pipe is visible to operators in the engine room. */}
      {(
        [
          ['sup', CHW_Z_SUPPLY, '#0d3f7a', 'CHILLED WATER SUPPLY', 'CHWS', -1] as const,
          ['ret', CHW_Z_RETURN, '#8a7a52', 'CHILLED WATER RETURN', 'CHWR', +1] as const,
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

      {/* Chiller GLB model + HMI mounted on the cabinet's +X face (the same
          face that displays the YORK_Baked logo plate, on Cube002_Baked). */}
      <ChillerModel
        position={[0, 0, 0]}
        onHmiZoom={onHmiZoom}
        hmiLookAtRef={hmiLookAtRef}
        hmiZoomed={hmiZoomed}
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
        // H=3.05 along Y, sitting on a PLINTH_H=0.20 m housekeeping pad).
        const VFD_X     = 4.2;
        const VFD_Z     = -2.6;
        const VFD_W     = 1.6;
        const VFD_H     = 3.05;
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
        const CHW_R = 0.35;
        const CDW_R = 0.35;
        const chwSup = chain({ xRiser: CHW_X_SUPPLY, yFlange: CHW_Y_FLANGE,
                               zHeadFace: CHW_STUB_Z_IN, zRiser: CHW_Z_SUPPLY, elbowR: CHW_R });
        const chwRet = chain({ xRiser: CHW_X_RETURN, yFlange: CHW_Y_FLANGE,
                               zHeadFace: CHW_STUB_Z_IN, zRiser: CHW_Z_RETURN, elbowR: CHW_R });
        const cdwSup = chain({ xRiser: CW_X_SUPPLY,  yFlange: CW_Y_FLANGE,
                               zHeadFace: CW_STUB_Z_IN,  zRiser: CW_Z_SUPPLY,  elbowR: CDW_R });
        const cdwRet = chain({ xRiser: CW_X_RETURN,  yFlange: CW_Y_FLANGE,
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
          c, pipeColor, insColor, elbowR, boltCount, insulated,
        }: {
          c: ReturnType<typeof chain>;
          pipeColor: string;
          insColor:  string;
          elbowR:    number;
          boltCount: number;
          insulated: boolean;
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
                           elbowR={CHW_R} boltCount={12} insulated />
              <NozzleChain c={chwRet} pipeColor="#c9b68c" insColor="#a89270"
                           elbowR={CHW_R} boltCount={12} insulated />
              {/* Marine-waterbox cover plate / bonnet behind both flanges */}
              <mesh
                position={[
                  (CHW_X_SUPPLY + CHW_X_RETURN) / 2,
                  CHW_Y_FLANGE,
                  CHW_STUB_Z_IN - 0.04,
                ]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <boxGeometry args={[Math.abs(CHW_X_SUPPLY - CHW_X_RETURN) + 1.20, 0.08, 1.10]} />
                <meshStandardMaterial color="#7a7270" roughness={0.55} metalness={0.65} />
              </mesh>
              {/* Cover-plate retaining bolts around the perimeter */}
              {(() => {
                const cx = (CHW_X_SUPPLY + CHW_X_RETURN) / 2;
                const w  = Math.abs(CHW_X_SUPPLY - CHW_X_RETURN) + 1.10;
                const h  = 1.0;
                const out: React.ReactElement[] = [];
                const N_X = 7, N_Y = 5;
                for (let i = 0; i < N_X; i++) {
                  for (let j = 0; j < N_Y; j++) {
                    if (i > 0 && i < N_X - 1 && j > 0 && j < N_Y - 1) continue;
                    const bx = cx - w / 2 + (i / (N_X - 1)) * w;
                    const by = CHW_Y_FLANGE - h / 2 + (j / (N_Y - 1)) * h;
                    out.push(
                      <mesh key={`chw-cover-bolt-${i}-${j}`} position={[bx, by, CHW_STUB_Z_IN - 0.084]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.022, 0.022, 0.02, 6]} />
                        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.85} />
                      </mesh>
                    );
                  }
                }
                return <>{out}</>;
              })()}
            </group>

            {/* ── CDW circuit → CONDENSER (lower) shell, +Z head ── */}
            <group>
              <NozzleChain c={cdwSup} pipeColor="#1d7a3a" insColor="#155a28"
                           elbowR={CDW_R} boltCount={12} insulated={false} />
              <NozzleChain c={cdwRet} pipeColor="#7ec07a" insColor="#5fa05c"
                           elbowR={CDW_R} boltCount={12} insulated={false} />
              {/* Marine-waterbox cover plate / bonnet behind both flanges */}
              <mesh
                position={[
                  (CW_X_SUPPLY + CW_X_RETURN) / 2,
                  CW_Y_FLANGE,
                  CW_STUB_Z_IN + 0.04,
                ]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <boxGeometry args={[Math.abs(CW_X_SUPPLY - CW_X_RETURN) + 1.20, 0.08, 1.10]} />
                <meshStandardMaterial color="#7a7270" roughness={0.55} metalness={0.65} />
              </mesh>
              {/* Cover-plate retaining bolts around the perimeter */}
              {(() => {
                const cx = (CW_X_SUPPLY + CW_X_RETURN) / 2;
                const w  = Math.abs(CW_X_SUPPLY - CW_X_RETURN) + 1.10;
                const h  = 1.0;
                const out: React.ReactElement[] = [];
                const N_X = 7, N_Y = 5;
                for (let i = 0; i < N_X; i++) {
                  for (let j = 0; j < N_Y; j++) {
                    if (i > 0 && i < N_X - 1 && j > 0 && j < N_Y - 1) continue;
                    const bx = cx - w / 2 + (i / (N_X - 1)) * w;
                    const by = CW_Y_FLANGE - h / 2 + (j / (N_Y - 1)) * h;
                    out.push(
                      <mesh key={`cdw-cover-bolt-${i}-${j}`} position={[bx, by, CW_STUB_Z_IN + 0.084]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.022, 0.022, 0.02, 6]} />
                        <meshStandardMaterial color="#1c1c1c" roughness={0.5} metalness={0.85} />
                      </mesh>
                    );
                  }
                }
                return <>{out}</>;
              })()}
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
      {/* secondary butterfly isolation just downstream of the gate valve */}
      <ButterflyValve
        position={[-8.6, 1.10, CHW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#2c4a72"
      />
      {/* electric modulating control valve mid-run */}
      <MotorizedValve
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
        bodyColor="#7a6e4e"
      />
      <ButterflyValve
        position={[-10.5, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#7a6e4e"
      />
      {/* swing check valve — stops reverse flow through evap when pump off */}
      <CheckValve
        position={[-15.0, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#7a6e4e"
      />
      <TestPort
        position={[-17.5, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />
      <DrainValve
        position={[-19.5, 1.10, CHW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />

      {/* ─── CDWS riser accessories (vertical, x = CW_X_SUPPLY, z = CW_Z_SUPPLY) ─── */}
      {/* low-point drain at base of riser */}
      <DrainValve
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
        position={[CW_X_SUPPLY, 6.8, CW_Z_SUPPLY]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
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
      <MotorizedValve
        position={[14.0, 12.38, CW_Z_SUPPLY]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#1f5a3a"
        actuatorColor="#7a4d1c"
        label="TBV-1"
      />

      {/* ─── CDWS tower-side vertical riser accessories (x = 23.5, z = CW_Z_SUPPLY) ─── */}
      <ButterflyValve
        position={[23.5, 13.9, CW_Z_SUPPLY]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#1f5a3a"
      />
      <AirVent
        position={[23.5, 16.0, CW_Z_SUPPLY]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />

      {/* ─── CDWR riser accessories (vertical, x = CW_X_RETURN, z = CW_Z_RETURN) ─── */}
      <DrainValve
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
        position={[CW_X_RETURN, 8.4, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
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
        position={[4.0, 12.32, CW_Z_RETURN]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />

      {/* ─── CDWR tower-side vertical riser accessories ─── */}
      <ButterflyValve
        position={[23.5, 13.9, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
        bodyColor="#5a3a1f"
      />
      <AirVent
        position={[23.5, 16.0, CW_Z_RETURN]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={MAIN_PIPE_RADIUS}
      />
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
}: {
  position: [number, number, number];
  onHmiZoom: () => void;
  hmiLookAtRef: MutableRefObject<THREE.Vector3>;
  hmiZoomed: boolean;
}) {
  const { scene } = useGLTF('/models/Chiller_R2.glb');
  const hmiMountRef = useRef<THREE.Group>(null);

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
        <HMIPanel3D onZoom={onHmiZoom} zoomed={hmiZoomed} />
      </group>
    </group>
  );
}

function HMIPanel3D({ onZoom, zoomed }: { onZoom: () => void; zoomed: boolean }) {
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
  return (
    <group>
      <mesh castShadow position={[0, 0, -0.03]}>
        <boxGeometry args={[HMI_PANEL_W, HMI_PANEL_H, 0.06]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[HMI_PANEL_W * 0.9, HMI_PANEL_H * 0.87]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.35} metalness={0.15} />
      </mesh>
      <Html
        transform
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

type HmiPanelZoomMode = 'none' | 'hmi' | 'vfd';

function CameraController({
  panelZoom,
  hmiLookAtRef,
  vfdLookAtRef,
}: {
  panelZoom: HmiPanelZoomMode;
  hmiLookAtRef: MutableRefObject<THREE.Vector3>;
  vfdLookAtRef: MutableRefObject<THREE.Vector3>;
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

  /* Scratch vectors for per-frame work (avoid allocations in useFrame). */
  const toPosRef = useRef(new THREE.Vector3());
  const toTargetRef = useRef(new THREE.Vector3());
  /* Camera offset from panel center to close-up position. Both OptiView and
     the VFD door face world +X; +X is "in front of" the glass. */
  const closeOffsetHmiRef = useRef(new THREE.Vector3(1.0, 0.0, 0.0));
  const closeOffsetVfdRef = useRef(new THREE.Vector3(0.58, 0.0, 0.0));

  useFrame((_, delta) => {
    if (panelZoom !== lastModeRef.current) {
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

    if (!activeRef.current || progressRef.current >= 1) return;

    progressRef.current = Math.min(progressRef.current + delta * 1.4, 1);
    const t = progressRef.current;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    /* Resolve the destination camera position + look-at target. */
    if (panelZoom === 'hmi') {
      toTargetRef.current.copy(hmiLookAtRef.current);
      toPosRef.current.copy(hmiLookAtRef.current).add(closeOffsetHmiRef.current);
    } else if (panelZoom === 'vfd') {
      toTargetRef.current.copy(vfdLookAtRef.current);
      toPosRef.current.copy(vfdLookAtRef.current).add(closeOffsetVfdRef.current);
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
  });

  return null;
}

export default function App() {
  const [showCxAlloy, setShowCxAlloy] = useState(false);
  const [zoomedHMI, setZoomedHMI] = useState(false);
  const [zoomedVfd, setZoomedVfd] = useState(false);
  const hmiLookAtRef = useRef(new THREE.Vector3(0, 2.5, 0));
  const vfdLookAtRef = useRef(new THREE.Vector3(4.6, 2.2, -2.6));
  const panelZoom: HmiPanelZoomMode = zoomedVfd ? 'vfd' : zoomedHMI ? 'hmi' : 'none';
  const walkMode = useWalkModeStore((s) => s.walkMode);
  const setWalkMode = useWalkModeStore((s) => s.setWalkMode);
  const motionState = useWalkModeStore((s) => s.motionState);

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

  // Note: in walk mode we deliberately let Esc fall through to the browser
  // so it just releases pointer-lock (Minecraft-style "open menu"). The user
  // exits walk mode via the on-screen "Exit Walk" button.

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
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
            <Scene />
            <EngineRoom
              onHmiZoom={() => {
                setZoomedVfd(false);
                setZoomedHMI(true);
              }}
              hmiLookAtRef={hmiLookAtRef}
              hmiZoomed={zoomedHMI}
              onVfdZoom={() => {
                setZoomedHMI(false);
                setZoomedVfd(true);
              }}
              vfdLookAtRef={vfdLookAtRef}
              vfdZoomed={zoomedVfd}
            />
            <InspectRaycaster />

            {/* Camera animation on OptiView / VFD panel zoom (click-to-zoom + lerp). */}
            <CameraController
              panelZoom={panelZoom}
              hmiLookAtRef={hmiLookAtRef}
              vfdLookAtRef={vfdLookAtRef}
            />

            {/* HVAC technician — when walk mode is on, drives a first-person
                camera with arrows/WASD + Shift; mouse-look comes from
                <PointerLockControls/> below. */}
            <TechnicianController enabled={walkMode} spawnPosition={[10, 0, 12]} />

            {walkMode ? (
              <PointerLockControls makeDefault />
            ) : (
              <OrbitControls
                makeDefault
                target={CHILLER_ORBIT_TARGET}
                minDistance={panelZoom !== 'none' ? 0.05 : 8}
                maxDistance={panelZoom !== 'none' ? 5 : 150}
                minPolarAngle={0.2}
                maxPolarAngle={Math.PI / 2 - 0.1}
                enableDamping
                dampingFactor={0.05}
                enabled={panelZoom === 'none'}
              />
            )}
          </Suspense>
        </Canvas>
      </div>

      {/* Centered crosshair (Minecraft-style reticle) — only in walk mode */}
      {walkMode && (
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
      )}

      {/* Walk-mode toggle button (bottom-right) */}
      <button
        type="button"
        onClick={() => setWalkMode(!walkMode)}
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 30,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
          color: walkMode ? '#0a1a14' : '#dde2e8',
          background: walkMode ? '#3bff9f' : '#1d2128',
          border: `1px solid ${walkMode ? '#2bd181' : '#3d4249'}`,
          borderRadius: 8,
          cursor: 'pointer',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          boxShadow: walkMode
            ? '0 0 0 2px rgba(59,255,159,0.18), 0 4px 14px rgba(0,0,0,0.45)'
            : '0 4px 14px rgba(0,0,0,0.45)',
        }}
        title={walkMode ? 'Exit walk mode' : 'Walk through the engine room (Minecraft-style controls)'}
      >
        {walkMode ? '◼ Exit Walk' : '▶ Walk Mode'}
      </button>

      {/* Walk-mode HUD (bottom-left): controls + live status */}
      {walkMode && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            bottom: 16,
            zIndex: 30,
            padding: '12px 16px',
            background: 'rgba(18,21,24,0.92)',
            border: '1px solid #2d3239',
            borderRadius: 10,
            color: '#dde2e8',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 12,
            backdropFilter: 'blur(6px)',
            minWidth: 240,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1.2,
              color: '#5a6578',
              marginBottom: 6,
            }}
          >
            FIELD TECHNICIAN
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background:
                  motionState === 'run'  ? '#ff7b3b' :
                  motionState === 'walk' ? '#3bff9f' :
                                           '#5a6578',
                boxShadow:
                  motionState === 'idle'
                    ? 'none'
                    : `0 0 8px ${motionState === 'run' ? '#ff7b3b' : '#3bff9f'}`,
              }}
            />
            <span style={{ textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
              {motionState}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 4, color: '#a8b1bd' }}>
            <kbd style={kbdStyle}>W A S D</kbd>     <span>move</span>
            <kbd style={kbdStyle}>Mouse</kbd>       <span>look around</span>
            <kbd style={kbdStyle}>Space</kbd>       <span>jump</span>
            <kbd style={kbdStyle}>⇧ Shift</kbd>     <span>sneak</span>
            <kbd style={kbdStyle}>Ctrl / W,W</kbd>  <span>sprint</span>
            <kbd style={kbdStyle}>Click</kbd>       <span>capture mouse</span>
            <kbd style={kbdStyle}>Esc</kbd>         <span>release mouse</span>
            <kbd style={kbdStyle}>W / S</kbd>       <span>climb roof ladder (in shaft)</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#7a8594', lineHeight: 1.45 }}>
            Rooftop: open hatch over the ladder in the back-right corner — walk onto the opening to descend (yellow “ROOF ACCESS” sign).
          </div>
        </div>
      )}

      {/* Exit-zoom button — appears top-left when HMI is zoomed in.
          We deliberately DO NOT cover the screen with a click-shield, so
          the HMI itself remains fully interactive (the user can read and
          click through the enlarged UI). */}
      {panelZoom !== 'none' && (
        <button
          type="button"
          onClick={() => {
            setZoomedHMI(false);
            setZoomedVfd(false);
          }}
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
          {panelZoom === 'vfd' ? '← Exit drive HMI' : '← Exit OptiView'}
        </button>
      )}
    </div>
  );
}

const kbdStyle: CSSProperties = {
  display: 'inline-block',
  padding: '1px 6px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 10,
  color: '#dde2e8',
  background: '#23272c',
  border: '1px solid #3d4249',
  borderRadius: 4,
  whiteSpace: 'nowrap',
};