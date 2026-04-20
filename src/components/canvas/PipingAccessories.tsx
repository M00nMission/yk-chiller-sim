/* ============================================================================
   PipingAccessories.tsx
   Reusable mechanical-room piping fittings for the chiller / cooling-tower
   loops: gauges, isolation valves, motorized control valves, drains,
   strainers, check valves, air vents and braided flex connectors.

   CONVENTION
   Every accessory is modelled with its host pipe running along LOCAL +X
   ("up" is LOCAL +Y, gauge face looks down LOCAL +Z). To place one on a
   real pipe, set the wrapping group's rotation:
     • pipe along world  X  →  rotation = [0, 0,            0]
     • pipe along world  Y  →  rotation = [0, 0,  Math.PI/2 ]
     • pipe along world  Z  →  rotation = [0, Math.PI/2,    0]
============================================================================ */

import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Text, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/useSimulationStore';

type Triple = [number, number, number];

/** When `valveId` is set, open state and clicks come from the simulation store. */
export type PipingValveInteractive = { valveId?: string };

/** Helical thread form on a stud (axis +X); tube sits slightly proud of the shank. */
function createGateBoltThreadGeometry(
  threadLen: number,
  boltShaftR: number,
  boltDia: number,
): THREE.TubeGeometry {
  const pitch = THREE.MathUtils.clamp(boltDia * 0.7, 0.0042, 0.024);
  const helixR = boltShaftR * 1.05;
  const tubeR = THREE.MathUtils.clamp(boltShaftR * 0.095, 0.001, 0.0042);
  const segs = Math.min(180, Math.max(36, Math.ceil((threadLen / pitch) * 14)));
  const pts: THREE.Vector3[] = [];
  const half = threadLen * 0.5;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = -half + t * threadLen;
    const rev = (x + half) / pitch;
    const ang = rev * Math.PI * 2;
    pts.push(new THREE.Vector3(x, helixR * Math.cos(ang), helixR * Math.sin(ang)));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tubular = Math.min(120, Math.max(32, Math.floor(segs * 1.2)));
  return new THREE.TubeGeometry(curve, tubular, tubeR, 5, false);
}

/** Through-studs + hex nuts on bolt circle; host pipe along LOCAL +X. */
function PipingFlangeBoltsAlongX({
  id,
  boltCount,
  boltCircleR,
  studLen,
  nutXL,
  nutXR,
  boltShaftR = 0.013,
  nutR = 0.023,
  nutT = 0.018,
}: {
  id: string;
  boltCount: number;
  boltCircleR: number;
  studLen: number;
  nutXL: number;
  nutXR: number;
  boltShaftR?: number;
  nutR?: number;
  nutT?: number;
}) {
  return (
    <>
      {Array.from({ length: boltCount }).map((_, i) => {
        const a = (i / boltCount) * Math.PI * 2 + Math.PI / boltCount;
        const by = Math.cos(a) * boltCircleR;
        const bz = Math.sin(a) * boltCircleR;
        return (
          <group key={`${id}-bf-${i}`} position={[0, by, bz]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[boltShaftR, boltShaftR, studLen, 6]} />
              <meshStandardMaterial
                color="#aeb2bc"
                metalness={0.9}
                roughness={0.22}
              />
            </mesh>
            <mesh position={[nutXL, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[nutR, nutR, nutT, 6]} />
              <meshStandardMaterial
                color="#8f939c"
                metalness={0.88}
                roughness={0.24}
              />
            </mesh>
            <mesh position={[nutXR, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[nutR, nutR, nutT, 6]} />
              <meshStandardMaterial
                color="#8f939c"
                metalness={0.88}
                roughness={0.24}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

/** Exponential smoothing for 0↔1 valve motion; lower = slower, more mechanical (~0.9–1.4s to settle at 60fps). */
const PIPING_VALVE_VISUAL_RATE = 3.35;

type PipingValveMotionOptions = {
  /** Override default {@link PIPING_VALVE_VISUAL_RATE} (higher = snappier). */
  smoothRate?: number;
};

function usePipingValveLogic(
  valveId: string | undefined,
  /** Used only when `valveId` is omitted (static / storybook). */
  openProp: boolean,
  opts?: PipingValveMotionOptions,
) {
  const storeOpen = useSimulationStore((s) =>
    valveId ? s.valves.find((v) => v.id === valveId)?.open : undefined,
  );
  const toggleValve = useSimulationStore((s) => s.toggleValve);
  const logicalOpen = storeOpen !== undefined ? storeOpen : openProp;
  const [hovered, setHovered] = useState(false);
  useCursor(Boolean(valveId) && hovered);
  const visual = useRef(logicalOpen ? 1 : 0);
  const smoothRate = opts?.smoothRate ?? PIPING_VALVE_VISUAL_RATE;
  /* Negative priority: update smoothed open fraction before valve meshes read it this frame. */
  useFrame((_, dt) => {
    const tgt = logicalOpen ? 1 : 0;
    visual.current = THREE.MathUtils.lerp(visual.current, tgt, 1 - Math.exp(-smoothRate * dt));
  }, -1);
  const groupProps =
    valveId != null && valveId !== ''
      ? {
          onClick: (e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            toggleValve(valveId);
          },
          onPointerOver: (e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            setHovered(true);
          },
          onPointerOut: () => setHovered(false),
        }
      : {};
  return { visual, groupProps };
}

export interface AccessoryBase {
  position?: Triple;
  rotation?: Triple;
  /** Outside radius of the host pipe (controls fitting bore + body size). */
  pipeRadius?: number;
}

/* ─── shared palette ─────────────────────────────────────────────────────── */
const STEEL          = '#8c8c8c';
const DARK_STEEL     = '#4d4d4d';
const BRASS          = '#b89540';
const VALVE_BODY     = '#3a4756';
const HANDWHEEL_RED  = '#cc2222';
const ACTUATOR_BLUE  = '#1f3f9a';
const GAUGE_FACE     = '#f4efde';
const POINTER_RED    = '#cc1010';
const POINTER_BLUE   = '#1f49a8';

/* ============================================================================
   1. PRESSURE GAUGE — Bourdon-tube dial on a needle isolation cock + pigtail
============================================================================ */
export function PressureGauge({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  label = 'P',
  faceColor = GAUGE_FACE,
}: AccessoryBase & { label?: string; faceColor?: string }) {
  const baseY = pipeRadius;
  const r = 0.13;
  return (
    <group position={position} rotation={rotation}>
      {/* weld-o-let on pipe */}
      <mesh position={[0, baseY + 0.025, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.05, 10]} />
        <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
      </mesh>
      {/* needle isolation cock body */}
      <mesh position={[0, baseY + 0.10, 0]}>
        <boxGeometry args={[0.085, 0.09, 0.085]} />
        <meshStandardMaterial color={BRASS} roughness={0.32} metalness={0.9} />
      </mesh>
      {/* needle-cock T-handle */}
      <mesh position={[0.075, baseY + 0.135, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.11, 6]} />
        <meshStandardMaterial color={DARK_STEEL} roughness={0.35} metalness={0.85} />
      </mesh>
      {/* siphon / pigtail riser to gauge */}
      <mesh position={[0, baseY + 0.22, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.13, 8]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* gauge case (brass bezel) */}
      <mesh position={[0, baseY + 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, 0.07, 22]} />
        <meshStandardMaterial color={BRASS} roughness={0.28} metalness={0.95} />
      </mesh>
      {/* dial face */}
      <mesh position={[0, baseY + 0.36, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r - 0.018, 24]} />
        <meshStandardMaterial color={faceColor} roughness={0.18} />
      </mesh>
      {/* tick marks */}
      {Array.from({ length: 9 }).map((_, i) => {
        const a = -Math.PI * 1.2 + (i / 8) * Math.PI * 1.4;
        const tx = Math.cos(a) * (r - 0.03);
        const ty = Math.sin(a) * (r - 0.03);
        return (
          <mesh key={i} position={[tx, baseY + 0.36 + ty, 0.04]}>
            <boxGeometry args={[0.01, 0.018, 0.003]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        );
      })}
      {/* pointer (showing ~2/3 of scale) */}
      <mesh
        position={[0.025, baseY + 0.385, 0.043]}
        rotation={[0, 0, -Math.PI / 6]}
      >
        <boxGeometry args={[0.012, 0.085, 0.005]} />
        <meshStandardMaterial color={POINTER_RED} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* center hub */}
      <mesh position={[0, baseY + 0.36, 0.044]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.006, 10]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* tag */}
      <Text
        position={[0, baseY + 0.50, 0.045]}
        fontSize={0.07}
        color="#ffffff"
        outlineColor="#000"
        outlineWidth={0.006}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

/* ============================================================================
   2. TEMPERATURE GAUGE — Bimetal dial on a thermowell stem (longer than P)
============================================================================ */
export function TemperatureGauge({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  label = 'T',
  faceColor = GAUGE_FACE,
}: AccessoryBase & { label?: string; faceColor?: string }) {
  const baseY = pipeRadius;
  const r = 0.12;
  return (
    <group position={position} rotation={rotation}>
      {/* thermowell hex bushing */}
      <mesh position={[0, baseY + 0.045, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.09, 6]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.9} />
      </mesh>
      {/* extension stem to dial */}
      <mesh position={[0, baseY + 0.24, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.27, 8]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* dial case (black bimetal style) */}
      <mesh position={[0, baseY + 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, 0.06, 22]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.7} />
      </mesh>
      {/* dial face */}
      <mesh position={[0, baseY + 0.44, 0.033]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r - 0.018, 24]} />
        <meshStandardMaterial color={faceColor} roughness={0.18} />
      </mesh>
      {/* tick marks */}
      {Array.from({ length: 9 }).map((_, i) => {
        const a = -Math.PI * 1.2 + (i / 8) * Math.PI * 1.4;
        const tx = Math.cos(a) * (r - 0.028);
        const ty = Math.sin(a) * (r - 0.028);
        return (
          <mesh key={i} position={[tx, baseY + 0.44 + ty, 0.034]}>
            <boxGeometry args={[0.009, 0.016, 0.003]} />
            <meshStandardMaterial color="#111" />
          </mesh>
        );
      })}
      {/* blue pointer (cold-side bias) */}
      <mesh
        position={[-0.018, baseY + 0.46, 0.037]}
        rotation={[0, 0, Math.PI / 4]}
      >
        <boxGeometry args={[0.011, 0.082, 0.005]} />
        <meshStandardMaterial color={POINTER_BLUE} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* hub */}
      <mesh position={[0, baseY + 0.44, 0.038]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.006, 10]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <Text
        position={[0, baseY + 0.57, 0.04]}
        fontSize={0.07}
        color="#ffffff"
        outlineColor="#000"
        outlineWidth={0.006}
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  );
}

/* ============================================================================
   3. GATE VALVE — Manual handwheel-operated isolation valve (OS&Y style)
============================================================================ */
export function GateValve({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  bodyColor = VALVE_BODY,
  handwheelColor = HANDWHEEL_RED,
  valveId,
  open: openProp = true,
  /** Max radius in YZ from the pipe (+X) axis — use insulated OD on jacketed mains (e.g. bare R + jacket). */
  outerRadius,
}: AccessoryBase &
  PipingValveInteractive & {
    bodyColor?: string;
    handwheelColor?: string;
    open?: boolean;
    outerRadius?: number;
  }) {
  const r = pipeRadius;
  const R_env = outerRadius ?? r;
  const D = 2 * R_env;

  const barrelR = R_env * 0.996;
  const bodyLen = THREE.MathUtils.clamp(D * 0.392, 0.22, 0.64);
  const bodyHalfLen = bodyLen * 0.5;
  const flangeT = THREE.MathUtils.clamp(D * 0.056, 0.034, 0.082);
  const flangeCtrX = bodyHalfLen + flangeT * 0.5;
  const flangeOuterR = THREE.MathUtils.clamp(R_env * 1.24, barrelR * 1.045, R_env * 1.33);
  const raisedFaceR = Math.min(barrelR * 1.005, flangeOuterR * 0.78);
  const boltCircleR = flangeOuterR * 0.812;
  const boltCount = D >= 0.62 ? 12 : 8;
  const boltDia = THREE.MathUtils.clamp(flangeT * 0.5, 0.0115, 0.027);
  const boltShaftR = boltDia * 0.5;
  const nutAcrossFlats = boltDia * 1.58;
  const nutR = nutAcrossFlats / Math.sqrt(3);
  const nutT = boltDia * 0.76;
  const nutJamT = nutT * 0.82;
  const washerT = THREE.MathUtils.clamp(boltDia * 0.34, 0.004, 0.012);
  const washerR = nutAcrossFlats * 0.62;

  const faceL = -(bodyHalfLen + flangeT);
  const faceR = bodyHalfLen + flangeT;
  const gap = 0.0011;
  const washCL = faceL - washerT * 0.5 - gap * 0.5;
  const washCR = faceR + washerT * 0.5 + gap * 0.5;
  const nutOuterXL = faceL - washerT - nutT * 0.5 - gap * 1.5;
  const nutOuterXR = faceR + washerT + nutT * 0.5 + gap * 1.5;
  const nutJamXL = faceL - washerT - nutT - nutJamT * 0.5 - gap * 2.6;
  const nutJamXR = faceR + washerT + nutT + nutJamT * 0.5 + gap * 2.6;
  const nutBackXL = -bodyHalfLen + nutT * 0.48 + gap * 2;
  const nutBackXR = bodyHalfLen - nutT * 0.48 - gap * 2;

  const boltLen = nutJamXR - nutJamXL + 0.014;
  const threadLen = THREE.MathUtils.clamp(boltLen * 0.68, boltDia * 2.4, boltLen * 0.82);

  const yBonFl = barrelR + D * 0.042;
  const rBonFl = Math.min(R_env * 0.9, flangeOuterR * 0.68);
  const bonnetH = THREE.MathUtils.clamp(D * 0.14, 0.11, 0.34);
  const yBonBody = yBonFl + bonnetH * 0.52;
  const rBonBodyBot = rBonFl * 0.82;
  const rBonBodyTop = rBonFl * 0.92;
  const stemR = THREE.MathUtils.clamp(D * 0.046, 0.014, 0.038);
  const stemLen = THREE.MathUtils.clamp(D * 0.36, 0.28, 0.78);
  const yStem = yBonBody + bonnetH * 0.42 + stemLen * 0.38;
  const yWheel = yStem + stemLen * 0.48;
  const handwheelMajor = THREE.MathUtils.clamp(D * 0.168, R_env * 0.14, R_env * 0.32);
  const tubeR = THREE.MathUtils.clamp(D * 0.022, 0.012, 0.034);
  const spokeHalf = Math.min(handwheelMajor * 0.88, R_env * 0.29);
  const hubR = THREE.MathUtils.clamp(boltDia * 1.35, 0.014, R_env * 0.088);

  const stemTravel = THREE.MathUtils.clamp(D * 0.052, 0.05, 0.14);
  /* Turns over full stroke — stem rise stays locked to this lead (OS&Y). */
  const handwheelTurns = THREE.MathUtils.clamp(5.2 - D * 1.1, 2.8, 4.6);

  const stemRaiseRef = useRef<THREE.Group>(null);
  const handwheelRef = useRef<THREE.Group>(null);
  const { visual, groupProps } = usePipingValveLogic(valveId, openProp);
  const boltThreadGeom = useMemo(
    () => createGateBoltThreadGeometry(threadLen, boltShaftR, boltDia),
    [threadLen, boltShaftR, boltDia],
  );
  useEffect(() => () => boltThreadGeom.dispose(), [boltThreadGeom]);
  useFrame(() => {
    const v = THREE.MathUtils.clamp(visual.current, 0, 1);
    const stemG = stemRaiseRef.current;
    const w = handwheelRef.current;
    /* Rising stem height and handwheel angle share one stroke fraction (thread lead). */
    const stemY = -(1 - v) * stemTravel;
    if (stemG) stemG.position.y = stemY;
    if (w) {
      const strokeFrac = stemTravel > 1e-6 ? (stemY + stemTravel) / stemTravel : v;
      w.rotation.y = strokeFrac * handwheelTurns * Math.PI * 2;
    }
  });

  return (
    <group position={position} rotation={rotation} {...groupProps}>
      {/* body run first (bolts pass through; drawn after for clean ends) */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[barrelR, barrelR, bodyLen, 20]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* companion flanges (protrude past barrel OD) */}
      <mesh position={[-flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[flangeOuterR, flangeOuterR, flangeT, 22]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[flangeOuterR, flangeOuterR, flangeT, 22]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* raised faces + spiral-wound gasket at joint */}
      <mesh position={[-bodyHalfLen + 0.004, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[raisedFaceR, raisedFaceR, 0.007, 20]} />
        <meshStandardMaterial color="#a8a8a6" roughness={0.32} metalness={0.9} />
      </mesh>
      <mesh position={[bodyHalfLen - 0.004, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[raisedFaceR, raisedFaceR, 0.007, 20]} />
        <meshStandardMaterial color="#a8a8a6" roughness={0.32} metalness={0.9} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[raisedFaceR + 0.004, raisedFaceR + 0.004, 0.008, 20]} />
        <meshStandardMaterial color="#9a1818" roughness={0.6} metalness={0.18} />
      </mesh>
      {Array.from({ length: boltCount }).map((_, i) => {
        const a = (i / boltCount) * Math.PI * 2 + Math.PI / boltCount;
        const by = Math.cos(a) * boltCircleR;
        const bz = Math.sin(a) * boltCircleR;
        return (
          <group key={`gv-bolt-${i}`} position={[0, by, bz]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[boltShaftR, boltShaftR, boltLen, 6]} />
              <meshStandardMaterial
                color="#aeb2bc"
                metalness={0.94}
                roughness={0.18}
              />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} geometry={boltThreadGeom}>
              <meshStandardMaterial
                color="#9fa4ae"
                metalness={0.9}
                roughness={0.34}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
              />
            </mesh>
            <mesh position={[washCL, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[washerR, washerR, washerT, 20]} />
              <meshStandardMaterial
                color="#c4c8d0"
                metalness={0.88}
                roughness={0.26}
              />
            </mesh>
            <mesh position={[washCR, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[washerR, washerR, washerT, 20]} />
              <meshStandardMaterial
                color="#c4c8d0"
                metalness={0.88}
                roughness={0.26}
              />
            </mesh>
            <mesh position={[nutOuterXL, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[nutR, nutR, nutT, 6]} />
              <meshStandardMaterial
                color="#8f939c"
                metalness={0.91}
                roughness={0.24}
              />
            </mesh>
            <mesh position={[nutOuterXR, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[nutR, nutR, nutT, 6]} />
              <meshStandardMaterial
                color="#8f939c"
                metalness={0.91}
                roughness={0.24}
              />
            </mesh>
            <mesh position={[nutJamXL, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[nutR * 0.98, nutR * 0.98, nutJamT, 6]} />
              <meshStandardMaterial
                color="#7a7e88"
                metalness={0.9}
                roughness={0.27}
              />
            </mesh>
            <mesh position={[nutJamXR, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[nutR * 0.98, nutR * 0.98, nutJamT, 6]} />
              <meshStandardMaterial
                color="#7a7e88"
                metalness={0.9}
                roughness={0.27}
              />
            </mesh>
            <mesh position={[nutBackXL, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[nutR * 0.92, nutR * 0.92, nutT * 0.72, 6]} />
              <meshStandardMaterial
                color="#858994"
                metalness={0.89}
                roughness={0.26}
              />
            </mesh>
            <mesh position={[nutBackXR, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[nutR * 0.92, nutR * 0.92, nutT * 0.72, 6]} />
              <meshStandardMaterial
                color="#858994"
                metalness={0.89}
                roughness={0.26}
              />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, yBonFl, 0]}>
        <cylinderGeometry args={[rBonFl, rBonFl, flangeT * 0.95, 14]} />
        <meshStandardMaterial color={STEEL} roughness={0.42} metalness={0.82} />
      </mesh>
      <mesh position={[0, yBonBody, 0]}>
        <cylinderGeometry args={[rBonBodyBot, rBonBodyTop, bonnetH, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      <group ref={stemRaiseRef}>
        <mesh position={[0, yStem, 0]}>
          <cylinderGeometry args={[stemR, stemR, stemLen, 10]} />
          <meshStandardMaterial
            color="#d6d8dc"
            roughness={0.22}
            metalness={0.92}
          />
        </mesh>
        <group ref={handwheelRef} position={[0, yWheel, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[handwheelMajor, tubeR, 8, 30]} />
            <meshStandardMaterial
              color={handwheelColor}
              roughness={0.42}
              metalness={0.58}
            />
          </mesh>
          {[0, Math.PI / 3, (2 * Math.PI) / 3].map((a, i) => (
            <mesh key={i} rotation={[0, a, 0]}>
              <boxGeometry args={[spokeHalf * 2, tubeR * 0.88, tubeR * 0.88]} />
              <meshStandardMaterial
                color={handwheelColor}
                roughness={0.46}
                metalness={0.52}
              />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[hubR, hubR, boltDia * 1.9, 6]} />
            <meshStandardMaterial color="#2a2c32" roughness={0.48} metalness={0.72} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ============================================================================
   3b. GLOBE VALVE — Throttling / manual balancing (linear plug + handwheel)
============================================================================ */
export function GlobeValve({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  bodyColor = VALVE_BODY,
  handwheelColor = HANDWHEEL_RED,
  valveId,
  open: openProp = true,
}: AccessoryBase &
  PipingValveInteractive & { bodyColor?: string; handwheelColor?: string; open?: boolean }) {
  const r = pipeRadius;
  const plugTravel = r * 0.22;
  const handwheelTurns = 5.0;
  const flangeCtrX = 0.16;
  const flangeT = 0.045;
  const faceL = -flangeCtrX - flangeT * 0.5;
  const faceR = flangeCtrX + flangeT * 0.5;
  const boltCircleR = r * 1.36;
  const boltCount = 2 * r >= 0.31 ? 12 : 8;
  const nutT = 0.018;
  const nutXL = faceL + nutT * 0.5 + 0.004;
  const nutXR = faceR - nutT * 0.5 - 0.004;
  const studLen = Math.max(0.12, faceR - faceL - 0.02);
  const stemRef = useRef<THREE.Group>(null);
  const handwheelRef = useRef<THREE.Group>(null);
  const { visual, groupProps } = usePipingValveLogic(valveId, openProp);
  useFrame(() => {
    const v = THREE.MathUtils.clamp(visual.current, 0, 1);
    const g = stemRef.current;
    const w = handwheelRef.current;
    const stemY = -(1 - v) * plugTravel;
    if (g) g.position.y = stemY;
    if (w) {
      const strokeFrac = plugTravel > 1e-6 ? (stemY + plugTravel) / plugTravel : v;
      w.rotation.y = strokeFrac * handwheelTurns * Math.PI * 2;
    }
  });
  return (
    <group position={position} rotation={rotation} {...groupProps}>
      <mesh position={[-flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.52, r * 1.52, flangeT, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.52, r * 1.52, flangeT, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      <PipingFlangeBoltsAlongX
        id="globe"
        boltCount={boltCount}
        boltCircleR={boltCircleR}
        studLen={studLen}
        nutXL={nutXL}
        nutXR={nutXR}
      />
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.05, r * 1.05, 0.28, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* seat / body bulge */}
      <mesh position={[0.04, 0, 0]}>
        <sphereGeometry args={[r * 1.18, 16, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* bonnet */}
      <mesh position={[0, r * 0.88, 0]}>
        <cylinderGeometry args={[r * 0.62, r * 0.72, 0.38, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      <mesh position={[0, r * 1.12, 0]}>
        <cylinderGeometry args={[r * 0.5, r * 0.5, 0.06, 12]} />
        <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.75} />
      </mesh>
      <group ref={stemRef}>
        <mesh position={[0, r * 1.42, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.55, 8]} />
          <meshStandardMaterial color="#ccc" roughness={0.25} metalness={0.95} />
        </mesh>
        <group ref={handwheelRef} position={[0, r * 1.92, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * 0.55, 0.022, 8, 24]} />
            <meshStandardMaterial color={handwheelColor} roughness={0.45} metalness={0.55} />
          </mesh>
          {[0, Math.PI / 2].map((a, i) => (
            <mesh key={i} rotation={[0, a, 0]}>
              <boxGeometry args={[r * 1.1, 0.016, 0.016]} />
              <meshStandardMaterial color={handwheelColor} roughness={0.5} metalness={0.5} />
            </mesh>
          ))}
          <mesh>
            <cylinderGeometry args={[0.035, 0.035, 0.05, 6]} />
            <meshStandardMaterial color="#222" roughness={0.5} metalness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ============================================================================
   4. BUTTERFLY VALVE — Wafer body, lever-actuated (notched plate)
   Sizes scale with host OD D = 2×R_env (use outerRadius on jacketed mains).
============================================================================ */
export function ButterflyValve({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  bodyColor = VALVE_BODY,
  handleColor = HANDWHEEL_RED,
  valveId,
  open: openProp = true,
  outerRadius,
}: AccessoryBase &
  PipingValveInteractive & {
    bodyColor?: string;
    handleColor?: string;
    open?: boolean;
    outerRadius?: number;
  }) {
  const R_env = outerRadius ?? pipeRadius;
  const D = 2 * R_env;

  /* Wafer only — line flanges live on the pipe spool, not repeated on the valve. */
  const waferOuterR = THREE.MathUtils.clamp(R_env * 1.12, R_env * 1.02, R_env * 1.22);
  const waferT = THREE.MathUtils.clamp(D * 0.082, 0.048, 0.15);

  /* Top of wafer profile in +Y (pipe axis +X). */
  const waferTopY = waferOuterR;

  const stemR = THREE.MathUtils.clamp(D * 0.041, 0.0095, 0.032);
  const neckR = THREE.MathUtils.clamp(stemR * 2.75, D * 0.064, R_env * 0.21);
  const neckH = THREE.MathUtils.clamp(D * 0.152, 0.065, 0.22);
  const bonnetH = THREE.MathUtils.clamp(D * 0.098, 0.042, 0.14);
  const bonnetRBot = THREE.MathUtils.clamp(neckR * 1.42, D * 0.1, R_env * 0.24);
  const bonnetRTop = THREE.MathUtils.clamp(neckR * 1.68, D * 0.115, R_env * 0.28);
  const shoulderT = THREE.MathUtils.clamp(D * 0.018, 0.012, 0.034);
  const plateR = THREE.MathUtils.clamp(D * 0.172, neckR * 1.35, R_env * 0.36);
  const plateT = THREE.MathUtils.clamp(D * 0.026, 0.018, 0.042);
  const pivotGap = THREE.MathUtils.clamp(D * 0.012, 0.006, 0.022);

  const yNeckCenter = waferTopY + neckH * 0.5 + 0.002;
  const yNeckTop = waferTopY + neckH;
  const yBonnetCenter = yNeckTop + bonnetH * 0.5;
  const yPlateBottom = yNeckTop + bonnetH + pivotGap * 0.35;
  const yPivot = yPlateBottom + plateT * 0.5 + pivotGap;

  /* Lever — longer / thicker grip than bare minimum for visibility at scene scale. */
  const leverLen = THREE.MathUtils.clamp(D * 0.56, D * 0.44, D * 0.72);
  const leverH = THREE.MathUtils.clamp(D * 0.06, 0.02, 0.072);
  const leverW = THREE.MathUtils.clamp(D * 0.054, 0.018, 0.065);
  /* Stem only above the opaque neck so it reads through bonnet / plate. */
  const yStemBottom = yNeckTop + THREE.MathUtils.clamp(D * 0.012, 0.004, 0.022);
  const yStemTop = yPivot - THREE.MathUtils.clamp(D * 0.02, 0.008, 0.028);
  const stemThruLen = Math.max(D * 0.055, yStemTop - yStemBottom);
  const yStemCenter = (yStemBottom + yStemTop) * 0.5;
  const stemBossH = THREE.MathUtils.clamp(D * 0.028, 0.012, 0.038);
  const yStemBossCenter = waferTopY - stemBossH * 0.35;

  const leverRef = useRef<THREE.Group>(null);
  const { visual, groupProps } = usePipingValveLogic(valveId, openProp);
  useFrame(() => {
    const v = THREE.MathUtils.clamp(visual.current, 0, 1);
    const a = (1 - v) * (Math.PI / 2 - 0.04);
    if (leverRef.current) leverRef.current.rotation.y = a;
  });
  return (
    <group position={position} rotation={rotation} {...groupProps}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[waferOuterR, waferOuterR, waferT, 20]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Stem boss at disk (visible from side). */}
      <mesh position={[0, yStemBossCenter, 0]}>
        <cylinderGeometry args={[stemR * 1.35, stemR * 1.35, stemBossH, 10]} />
        <meshStandardMaterial
          color="#b8bcc4"
          roughness={0.28}
          metalness={0.88}
        />
      </mesh>
      {/* Stem through bonnet / plate (neck housing hides lower shaft). */}
      <mesh position={[0, yStemCenter, 0]}>
        <cylinderGeometry args={[stemR, stemR, stemThruLen, 10]} />
        <meshStandardMaterial
          color="#cfd2d8"
          roughness={0.24}
          metalness={0.9}
        />
      </mesh>
      <mesh position={[0, yNeckCenter, 0]}>
        <cylinderGeometry args={[neckR, neckR, neckH, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.52} metalness={0.62} />
      </mesh>
      {/* Bonnet / gear housing */}
      <mesh position={[0, yBonnetCenter, 0]}>
        <cylinderGeometry args={[bonnetRBot, bonnetRTop, bonnetH, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.64} />
      </mesh>
      <mesh position={[0, yNeckTop - shoulderT * 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[neckR * 1.32, neckR * 1.32, shoulderT, 16]} />
        <meshStandardMaterial color={DARK_STEEL} roughness={0.48} metalness={0.8} />
      </mesh>
      <mesh position={[0, yPlateBottom + plateT * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[plateR, plateR, plateT, 20]} />
        <meshStandardMaterial color="#3a3a38" roughness={0.52} metalness={0.74} />
      </mesh>
      <group ref={leverRef} position={[0, yPivot, 0]}>
        <mesh position={[leverLen * 0.5, 0, 0]}>
          <boxGeometry args={[leverLen, leverH, leverW]} />
          <meshStandardMaterial color={handleColor} roughness={0.44} metalness={0.52} />
        </mesh>
      </group>
    </group>
  );
}

/* ============================================================================
   5. MOTORIZED / ACTUATED VALVE — Butterfly body + electric actuator on yoke
============================================================================ */
export function MotorizedValve({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  bodyColor = VALVE_BODY,
  actuatorColor = ACTUATOR_BLUE,
  label,
  valveId,
  open: openProp = true,
}: AccessoryBase &
  PipingValveInteractive & {
    bodyColor?: string;
    actuatorColor?: string;
    label?: string;
    open?: boolean;
  }) {
  const r = pipeRadius;
  const knobRef = useRef<THREE.Mesh>(null);
  const ledRef = useRef<THREE.Mesh>(null);
  const { visual, groupProps } = usePipingValveLogic(valveId, openProp);
  useFrame(() => {
    const v = THREE.MathUtils.clamp(visual.current, 0, 1);
    const a = (1 - v) * (Math.PI / 2 - 0.04);
    if (knobRef.current) knobRef.current.rotation.y = a;
    const led = ledRef.current;
    if (led) {
      const mats = Array.isArray(led.material) ? led.material : [led.material];
      const on = v > 0.55;
      for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.color.set(on ? '#33ff44' : '#ff3333');
          m.emissive.set(on ? '#22aa22' : '#aa2222');
        }
      }
    }
  });
  return (
    <group position={position} rotation={rotation} {...groupProps}>
      {/* wafer body */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.45, r * 1.45, 0.18, 18]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.7} />
      </mesh>
      {/* yoke / stem extension */}
      <mesh position={[0, r * 1.6, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.38, 10]} />
        <meshStandardMaterial color="#3a3a38" roughness={0.55} metalness={0.7} />
      </mesh>
      {/* yoke top flange */}
      <mesh position={[0, r * 1.6 + 0.22, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.05, 14]} />
        <meshStandardMaterial color="#3a3a38" roughness={0.55} metalness={0.7} />
      </mesh>
      {/* actuator housing */}
      <mesh position={[0, r * 1.6 + 0.45, 0]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.46]} />
        <meshStandardMaterial color={actuatorColor} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* actuator top cap */}
      <mesh position={[0, r * 1.6 + 0.68, 0]}>
        <boxGeometry args={[0.55, 0.06, 0.42]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.45} />
      </mesh>
      {/* nameplate on front */}
      <mesh position={[0, r * 1.6 + 0.45, 0.235]}>
        <planeGeometry args={[0.34, 0.18]} />
        <meshStandardMaterial color="#cccccc" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* manual override hand-knob */}
      <mesh ref={knobRef} position={[0.22, r * 1.6 + 0.45, 0.235]}>
        <cylinderGeometry args={[0.045, 0.045, 0.04, 14]} />
        <meshStandardMaterial color="#e0a418" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* status LED */}
      <mesh ref={ledRef} position={[-0.2, r * 1.6 + 0.58, 0.235]}>
        <sphereGeometry args={[0.025, 10, 10]} />
        <meshStandardMaterial
          color="#33ff44"
          emissive="#22aa22"
          emissiveIntensity={1.6}
        />
      </mesh>
      {/* conduit entry (low-voltage control + power) */}
      <mesh
        position={[-0.32, r * 1.6 + 0.32, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.028, 0.028, 0.18, 8]} />
        <meshStandardMaterial color="#444" roughness={0.7} metalness={0.6} />
      </mesh>
      {label && (
        <Text
          position={[0, r * 1.6 + 0.45, 0.245]}
          fontSize={0.07}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  );
}

/* ============================================================================
   6. SWING CHECK VALVE — Cast-iron body with bolted bonnet cap + arrow
============================================================================ */
export function CheckValve({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  bodyColor = VALVE_BODY,
}: AccessoryBase & { bodyColor?: string }) {
  const r = pipeRadius;
  const flangeCtrX = 0.22;
  const flangeT = 0.05;
  const faceL = -flangeCtrX - flangeT * 0.5;
  const faceR = flangeCtrX + flangeT * 0.5;
  const boltCircleR = r * 1.36;
  const boltCount = 2 * r >= 0.31 ? 12 : 8;
  const nutT = 0.018;
  const nutXL = faceL + nutT * 0.5 + 0.004;
  const nutXR = faceR - nutT * 0.5 - 0.004;
  const studLen = Math.max(0.14, faceR - faceL - 0.02);
  return (
    <group position={position} rotation={rotation}>
      {/* end flange L */}
      <mesh position={[-flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, flangeT, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* end flange R */}
      <mesh position={[flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, flangeT, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      <PipingFlangeBoltsAlongX
        id="check"
        boltCount={boltCount}
        boltCircleR={boltCircleR}
        studLen={studLen}
        nutXL={nutXL}
        nutXR={nutXR}
      />
      {/* body run */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.1, r * 1.1, 0.4, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* swing-arm dome (offset upward) */}
      <mesh position={[-0.05, r * 0.55, 0]}>
        <sphereGeometry args={[r * 1.0, 18, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* access cap with bolts */}
      <mesh position={[-0.05, r * 1.4, 0]}>
        <cylinderGeometry args={[r * 0.55, r * 0.55, 0.1, 8]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[-0.05 + Math.cos(a) * r * 0.45, r * 1.45, Math.sin(a) * r * 0.45]}
          >
            <cylinderGeometry args={[0.018, 0.018, 0.04, 6]} />
            <meshStandardMaterial color="#222" roughness={0.55} metalness={0.7} />
          </mesh>
        );
      })}
      {/* directional flow arrow (visible on +Z body face) */}
      <mesh position={[0.08, 0, r * 1.12]} rotation={[Math.PI / 2, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.045, 0.11, 4]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[-0.05, 0, r * 1.13]}>
        <boxGeometry args={[0.16, 0.025, 0.005]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   7. Y-STRAINER — Body + angled mesh basket leg + blowdown valve & cap
============================================================================ */
export function YStrainer({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  bodyColor = VALVE_BODY,
  idBand = true,
}: AccessoryBase & { bodyColor?: string; idBand?: boolean }) {
  const r = pipeRadius;
  const flangeCtrX = 0.22;
  const flangeT = 0.05;
  const faceL = -flangeCtrX - flangeT * 0.5;
  const faceR = flangeCtrX + flangeT * 0.5;
  const boltCircleR = r * 1.36;
  const boltCount = 2 * r >= 0.31 ? 12 : 8;
  const nutT = 0.018;
  const nutXL = faceL + nutT * 0.5 + 0.004;
  const nutXR = faceR - nutT * 0.5 - 0.004;
  const studLen = Math.max(0.14, faceR - faceL - 0.02);
  return (
    <group position={position} rotation={rotation}>
      {/* end flange L */}
      <mesh position={[-flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, flangeT, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* end flange R */}
      <mesh position={[flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, flangeT, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      <PipingFlangeBoltsAlongX
        id="ystrainer"
        boltCount={boltCount}
        boltCircleR={boltCircleR}
        studLen={studLen}
        nutXL={nutXL}
        nutXR={nutXR}
      />
      {/* main run */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.1, r * 1.1, 0.4, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* angled basket leg (pointing down + downstream) */}
      <mesh position={[0.18, -r * 0.7, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[r * 0.75, r * 0.6, 0.7, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* basket retaining cap (bolted plug at end of leg) */}
      <mesh position={[0.46, -r * 1.0, 0]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[r * 0.65, r * 0.65, 0.08, 8]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* blowdown ball valve hanging off the cap */}
      <group position={[0.6, -r * 1.18, 0]} rotation={[0, 0, Math.PI / 4]}>
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 0.1, 8]} />
          <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
        </mesh>
        <mesh position={[0, -0.09, 0]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
        </mesh>
        {/* hose-end connection */}
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.07, 8]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
        </mesh>
        {/* lever (perpendicular = closed) */}
        <mesh position={[0.09, -0.09, 0]}>
          <boxGeometry args={[0.18, 0.025, 0.025]} />
          <meshStandardMaterial color={HANDWHEEL_RED} roughness={0.5} metalness={0.5} />
        </mesh>
      </group>
      {idBand ? (
        <mesh position={[0, r * 1.12, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 1.11, r * 1.11, 0.06, 16]} />
          <meshStandardMaterial color="#d6a624" roughness={0.65} metalness={0.3} />
        </mesh>
      ) : null}
    </group>
  );
}

/* ============================================================================
   8. DRAIN VALVE — Bronze ball valve + hose-end on a short nipple, hangs down
============================================================================ */
export function DrainValve({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  handleColor = HANDWHEEL_RED,
  valveId,
  open: openProp = false,
}: AccessoryBase &
  PipingValveInteractive & { handleColor?: string; open?: boolean }) {
  const r = pipeRadius;
  const leverRef = useRef<THREE.Group>(null);
  const { visual, groupProps } = usePipingValveLogic(valveId, openProp);
  useFrame(() => {
    const g = leverRef.current;
    if (!g) return;
    const v = THREE.MathUtils.clamp(visual.current, 0, 1);
    /* Closed ≈ π/2 (lever across port); open ≈ 0 (inline with branch). */
    g.rotation.x = (1 - v) * (Math.PI / 2 - 0.08);
  });
  return (
    <group position={position} rotation={rotation} {...groupProps}>
      {/* weld-o-let on bottom of pipe */}
      <mesh position={[0, -r - 0.04, 0]}>
        <cylinderGeometry args={[0.06, 0.065, 0.08, 10]} />
        <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
      </mesh>
      {/* short threaded nipple */}
      <mesh position={[0, -r - 0.13, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* bronze ball valve body */}
      <mesh position={[0, -r - 0.23, 0]}>
        <boxGeometry args={[0.11, 0.11, 0.11]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.9} />
      </mesh>
      {/* hose-end / cap */}
      <mesh position={[0, -r - 0.34, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.09, 10]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* chained dust cap */}
      <mesh position={[0.07, -r - 0.39, 0.04]}>
        <cylinderGeometry args={[0.035, 0.035, 0.05, 8]} />
        <meshStandardMaterial color="#222" roughness={0.7} metalness={0.4} />
      </mesh>
      <group ref={leverRef} position={[0, -r - 0.18, 0.08]}>
        <mesh>
          <boxGeometry args={[0.025, 0.04, 0.18]} />
          <meshStandardMaterial color={handleColor} roughness={0.5} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/* ============================================================================
   9. AUTOMATIC AIR VENT — Small float-style vent on isolation cock at top
============================================================================ */
export function AirVent({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
}: AccessoryBase) {
  const r = pipeRadius;
  return (
    <group position={position} rotation={rotation}>
      {/* weld-o-let on top */}
      <mesh position={[0, r + 0.04, 0]}>
        <cylinderGeometry args={[0.05, 0.055, 0.08, 10]} />
        <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
      </mesh>
      {/* nipple */}
      <mesh position={[0, r + 0.12, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.1, 8]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* isolation ball cock */}
      <mesh position={[0, r + 0.21, 0]}>
        <boxGeometry args={[0.085, 0.085, 0.085]} />
        <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* small lever */}
      <mesh position={[0.08, r + 0.21, 0]}>
        <boxGeometry args={[0.13, 0.022, 0.022]} />
        <meshStandardMaterial color={HANDWHEEL_RED} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* float chamber body */}
      <mesh position={[0, r + 0.36, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.2, 14]} />
        <meshStandardMaterial color="#bdbdbd" roughness={0.4} metalness={0.85} />
      </mesh>
      {/* dome cap */}
      <mesh position={[0, r + 0.48, 0]}>
        <sphereGeometry args={[0.08, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#bdbdbd" roughness={0.4} metalness={0.85} />
      </mesh>
      {/* discharge nipple */}
      <mesh position={[0, r + 0.56, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.05, 6]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.7} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   10. FLEX CONNECTOR — Braided stainless / EPDM vibration isolator with flanges
============================================================================ */
export function FlexConnector({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  length = 0.5,
}: AccessoryBase & { length?: number }) {
  const r = pipeRadius;
  const discT = 0.05;
  const flangeCtrX = length * 0.5;
  const faceL = -flangeCtrX - discT * 0.5;
  const faceR = flangeCtrX + discT * 0.5;
  const boltCircleR = r * 1.36;
  const boltCount = 2 * r >= 0.31 ? 12 : 8;
  const nutT = 0.018;
  const nutXL = faceL + nutT * 0.5 + 0.004;
  const nutXR = faceR - nutT * 0.5 - 0.004;
  const studLen = Math.max(0.14, faceR - faceL - 0.02);
  return (
    <group position={position} rotation={rotation}>
      {/* end flange L */}
      <mesh position={[-flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, discT, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* braid body */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.04, r * 1.04, length - 0.1, 16]} />
        <meshStandardMaterial color="#9a9a9a" roughness={0.85} metalness={0.65} />
      </mesh>
      {/* corrugation rings */}
      {Array.from({ length: 5 }).map((_, i) => {
        const t = (i + 0.5) / 5;
        const x = -length / 2 + 0.05 + t * (length - 0.1);
        return (
          <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 1.12, r * 1.12, 0.025, 16]} />
            <meshStandardMaterial color="#5d5d5d" roughness={0.7} metalness={0.7} />
          </mesh>
        );
      })}
      {/* end flange R */}
      <mesh position={[flangeCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, discT, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      <PipingFlangeBoltsAlongX
        id="flex"
        boltCount={boltCount}
        boltCircleR={boltCircleR}
        studLen={studLen}
        nutXL={nutXL}
        nutXR={nutXR}
      />
    </group>
  );
}

/* ============================================================================
   11. PETE'S PLUG / TEST PORT — Tiny needle port with cap
============================================================================ */
export function TestPort({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
}: AccessoryBase) {
  const r = pipeRadius;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, r + 0.03, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.06, 8]} />
        <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
      </mesh>
      <mesh position={[0, r + 0.1, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.08, 8]} />
        <meshStandardMaterial color={BRASS} roughness={0.35} metalness={0.9} />
      </mesh>
      <mesh position={[0, r + 0.15, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.025, 8]} />
        <meshStandardMaterial color="#1144aa" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   12. FLANGED CONNECTION — ANSI raised-face welded-neck flange pair
   ─────────────────────────────────────────────────────────────────────
   Bolts a pipe to a vessel nozzle (e.g. shell-and-tube barrel head) or to
   another flanged spool. Geometry is centred on the GASKET PLANE
   (LOCAL X = 0). Pipe runs along LOCAL +X.
       • Vessel-side weld-neck flange extends in LOCAL −X
       • Companion (pipe-side) flange extends in LOCAL +X
   Total assembly length ≈ 2·(neckLen + discT) ≈ 0.42 m at default 0.30 m
   pipe radius. Position the component so its origin sits a half-assembly
   length OUTSIDE the vessel face — the welded-neck root will land flush
   on the vessel skin. Use the helper FLANGE_OUTSET below to compute the
   pipe-side end ↔ gasket-plane offset.
============================================================================ */
export const FLANGE_NECK_LEN = 0.16;
export const FLANGE_DISC_T   = 0.05;
/** Distance from gasket plane to the open pipe end on either side. */
export const FLANGE_OUTSET   = FLANGE_NECK_LEN + FLANGE_DISC_T;  // 0.21 m

export function FlangedConnection({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.30,
  bodyColor = '#5a5854',
  boltCount = 8,
  showVesselNeck = true,
  showPipeNeck = true,
}: AccessoryBase & {
  bodyColor?: string;
  /** Bolt count around the bolt circle (typ. 8 for 6", 12 for 12"). */
  boltCount?: number;
  /** Render the vessel-side welded neck taper (local −X). */
  showVesselNeck?: boolean;
  /** Render the pipe-side welded neck taper (local +X). */
  showPipeNeck?: boolean;
}) {
  const r            = pipeRadius;
  const flangeOuter  = r * 1.55;
  const raisedFaceR  = r * 1.18;
  const boltCircleR  = r * 1.36;
  const neckLen      = FLANGE_NECK_LEN;
  const discT        = FLANGE_DISC_T;
  // Distance from gasket plane to the OUTER face of each flange disc.
  const discFaceX    = discT / 2 + 0.001;
  // Distance from gasket plane to the centre of each weld-neck taper.
  const neckCtrX     = discT + neckLen / 2;

  return (
    <group position={position} rotation={rotation}>
      {/* ── VESSEL-SIDE welded-neck taper (root flush with vessel skin) ── */}
      {showVesselNeck && (
        <mesh position={[-neckCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 1.20, r * 1.04, neckLen, 18]} />
          <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.65} />
        </mesh>
      )}
      {/* ── VESSEL-SIDE flange disc ── */}
      <mesh position={[-discFaceX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[flangeOuter, flangeOuter, discT, 26]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* Raised face on vessel side */}
      <mesh position={[-0.0015, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[raisedFaceR, raisedFaceR, 0.008, 22]} />
        <meshStandardMaterial color="#a1a1a1" roughness={0.28} metalness={0.95} />
      </mesh>
      {/* ── Spiral-wound gasket (red sealing band on the gasket plane) ── */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[raisedFaceR + 0.005, raisedFaceR + 0.005, 0.006, 22]} />
        <meshStandardMaterial color="#9a1818" roughness={0.6} metalness={0.15} />
      </mesh>
      {/* Raised face on pipe side */}
      <mesh position={[0.0015, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[raisedFaceR, raisedFaceR, 0.008, 22]} />
        <meshStandardMaterial color="#a1a1a1" roughness={0.28} metalness={0.95} />
      </mesh>
      {/* ── PIPE-SIDE companion flange disc ── */}
      <mesh position={[discFaceX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[flangeOuter, flangeOuter, discT, 26]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* ── PIPE-SIDE welded-neck taper ── */}
      {showPipeNeck && (
        <mesh position={[neckCtrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 1.04, r * 1.20, neckLen, 18]} />
          <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.65} />
        </mesh>
      )}
      {/* ── BOLT CIRCLE — through-bolts with hex nuts on each face ── */}
      {Array.from({ length: boltCount }).map((_, i) => {
        const a  = (i / boltCount) * Math.PI * 2 + Math.PI / boltCount;
        const by = Math.cos(a) * boltCircleR;
        const bz = Math.sin(a) * boltCircleR;
        const shaftLen = discT * 2 + 0.022;
        return (
          <group key={i} position={[0, by, bz]}>
            {/* Stud */}
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.014, 0.014, shaftLen, 6]} />
              <meshStandardMaterial color="#3b3a38" roughness={0.55} metalness={0.85} />
            </mesh>
            {/* Hex nut on +X face */}
            <mesh position={[discT + 0.013, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.026, 0.026, 0.022, 6]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.85} />
            </mesh>
            {/* Hex nut on −X face */}
            <mesh position={[-(discT + 0.013), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.026, 0.026, 0.022, 6]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.85} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ============================================================================
   13. PIPE TAG — Wall-tag plate (yellow ID band w/ short text)
============================================================================ */
export function PipeTag({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  text,
  color = '#d6a624',
  textColor = '#1a1a1a',
}: AccessoryBase & { text: string; color?: string; textColor?: string }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.55, 0.16, 0.025]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.3} />
      </mesh>
      <Text
        position={[0, 0, 0.018]}
        fontSize={0.08}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
    </group>
  );
}
