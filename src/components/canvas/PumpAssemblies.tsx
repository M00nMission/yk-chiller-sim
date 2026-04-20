/**
 * pump-assemblies.spec.json — dedicated React Three Fiber pump assemblies for
 * the YORK water-cooled chiller plant.
 *
 *   <CDWPPumpAssembly />  Condenser Water Pump (CDWP)
 *   <CHWPPumpAssembly />  Chilled Water Pump (CHWP)
 *
 * Each component is fully self-contained:
 *   - vertical riser dropping in from the ceiling
 *   - isolation gate valve
 *   - Y-strainer with bottom blow-down valve
 *   - eccentric reducer (CDW only — flat side up)
 *   - long-radius 90° elbow into a horizontal suction spool (≥ 6 pipe Ø)
 *   - end-suction centrifugal pump (procedural geometry)
 *   - swing check valve on discharge
 *   - isolation gate valve on discharge
 *   - inline magmeter flow transmitter (FT)
 *   - Pete's-plug / Schrader test ports at suction and discharge
 *   - local PG and TG at suction and discharge
 *   - differential pressure indicator (PDI) across the pump
 *   - wall-mounted VFD enclosure with running-status LED
 *   - low-point drain valve at the volute bottom
 *   - clear text tag and pipe service-band ID labels
 *
 * Geometry is pure procedural primitives + drei `<Text>` so the asset is
 * lightweight on M1 Pro (≪ 15k tris per assembly). Pump impeller / coupling
 * spins via {@link EndSuctionHvacPump} when `running === true`.
 *
 * Pipe-color rules (ASHRAE 2026 commercial convention):
 *   CDWP   suction = CWS dark green  ·  discharge = CWS dark green
 *   CHWP   suction = CHR light blue  ·  discharge = CHS dark blue
 */
import { useRef, type JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  EndSuctionHvacPump,
  FlangedSpool,
  getPumpHydraulicPorts,
  type PumpPaint,
} from './IndustrialCentrifugalPump';
import {
  GateValve,
  YStrainer,
  CheckValve,
  DrainValve,
  PressureGauge,
  TemperatureGauge,
  TestPort,
} from './PipingAccessories';

/* ─────────── shared layout constants (exported for parent tie-in routing) ─────────── */
export const PIPE_R = 0.165;                         // main hydronic radius (~12" Sch.40)
export const SUCTION_RUN_DIA_MULT = 6.5;             // ≥ 6–8 pipe diameters per spec
export const CEILING_Y = 8.6;                        // top-of-riser elevation (engine room)
export const VFD_OFFSET_Z = 1.55;                    // wall-mount distance from pump centerline
export const ELBOW_R_FACTOR = 4.5;                   // long-radius elbow R / pipe radius

/* ─────────── ASHRAE 2026 service colors ─────────── */
export const PUMP_COLOR = {
  CWS: '#1f5a3a',           // dark green
  CHR: '#4a8ab8',           // light blue
  CHS: '#2c4a72',           // dark blue
  insulation: '#d4d6da',
} as const;
const COLOR = PUMP_COLOR;

/* ============================================================================
   Inline magnetic flow transmitter (FT) — wafer-style mag meter.
   Flange-to-flange in the horizontal pipe, with a small junction-box head
   carrying the loop tag.
============================================================================ */
function InlineFlowTransmitter({
  position,
  rotation = [0, 0, 0],
  pipeRadius = PIPE_R,
  bodyColor,
  tag,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  pipeRadius?: number;
  bodyColor: string;
  tag: string;
}) {
  return (
    <group name={`instrument:${tag}`} position={position} rotation={rotation}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[pipeRadius * 1.18, pipeRadius * 1.18, 0.42, 22]} />
        <meshStandardMaterial color={bodyColor} roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh position={[-0.21, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[pipeRadius * 1.55, pipeRadius * 1.55, 0.05, 18]} />
        <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[0.21, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[pipeRadius * 1.55, pipeRadius * 1.55, 0.05, 18]} />
        <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[0, pipeRadius * 1.4 + 0.06, 0]}>
        <boxGeometry args={[0.22, 0.16, 0.22]} />
        <meshStandardMaterial color="#d6d8dc" roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh position={[0, pipeRadius * 1.4 + 0.16, 0]}>
        <cylinderGeometry args={[0.025, 0.02, 0.06, 8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.6} />
      </mesh>
      <Text
        position={[0, pipeRadius * 1.4 + 0.30, 0]}
        fontSize={0.075}
        color="#101216"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#ffffff"
      >
        {tag}
      </Text>
    </group>
  );
}

/* ============================================================================
   Differential Pressure Indicator (PDI) — wall-style cell with two capillary
   tubes that tap pump suction and discharge. Used to read pump dP at a glance.
============================================================================ */
function PdiAcrossPump({
  position,
  tag,
  suctionTapWorld,
  dischargeTapWorld,
}: {
  position: [number, number, number];
  tag: string;
  /** Local-coord (x,y,z) of suction sense-line tap into the pipe. */
  suctionTapWorld: [number, number, number];
  /** Local-coord (x,y,z) of discharge sense-line tap into the pipe. */
  dischargeTapWorld: [number, number, number];
}) {
  const tubeMat = '#b8babe';
  const tubeRadius = 0.012;
  const cellPos = new THREE.Vector3(...position);
  const sucPos = new THREE.Vector3(...suctionTapWorld);
  const disPos = new THREE.Vector3(...dischargeTapWorld);
  const renderTube = (a: THREE.Vector3, b: THREE.Vector3, key: string): JSX.Element => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    const e = new THREE.Euler().setFromQuaternion(q);
    return (
      <mesh key={key} position={[mid.x, mid.y, mid.z]} rotation={[e.x, e.y, e.z]}>
        <cylinderGeometry args={[tubeRadius, tubeRadius, len, 8]} />
        <meshStandardMaterial color={tubeMat} roughness={0.4} metalness={0.7} />
      </mesh>
    );
  };
  return (
    <group name={`instrument:${tag}`}>
      {/* sense lines from each tap to a common kneeing point near the cell */}
      {renderTube(sucPos, cellPos.clone().add(new THREE.Vector3(-0.08, 0, 0)), `pdi-${tag}-s`)}
      {renderTube(disPos, cellPos.clone().add(new THREE.Vector3(0.08, 0, 0)), `pdi-${tag}-d`)}
      <group position={position}>
        <mesh castShadow>
          <boxGeometry args={[0.24, 0.18, 0.14]} />
          <meshStandardMaterial color="#ecedef" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.005, 22]} />
          <meshStandardMaterial color="#fafafa" roughness={0.18} />
        </mesh>
        <mesh position={[0.012, 0.018, 0.078]} rotation={[0, 0, -Math.PI / 5]}>
          <boxGeometry args={[0.008, 0.05, 0.003]} />
          <meshStandardMaterial color="#cc1818" />
        </mesh>
        <Text position={[0, -0.13, 0.075]} fontSize={0.05} color="#0a0a0a" anchorX="center" anchorY="middle">
          {tag}
        </Text>
      </group>
    </group>
  );
}

/* ============================================================================
   Eccentric reducer (flat-side-up). Specced on CDWP suction to prevent
   air pockets when reducing pipe size into the pump suction.
   Drawn as a tilted truncated cone with the top edge horizontal.
============================================================================ */
function EccentricReducer({
  position,
  rotation = [0, 0, 0],
  largeR,
  smallR,
  length,
  bodyColor,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  largeR: number;
  smallR: number;
  length: number;
  bodyColor: string;
}) {
  /* Offset center so the upper generatrix is horizontal — flat-on-top per ASME. */
  const yShift = (largeR - smallR) * 0.5;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, -yShift, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[smallR, largeR, length, 22]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      <mesh position={[length / 2, -yShift, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[smallR * 1.55, smallR * 1.55, 0.05, 16]} />
        <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[-length / 2, -yShift, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[largeR * 1.55, largeR * 1.55, 0.05, 16]} />
        <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   Wall-mounted VFD enclosure with a green "RUN" status LED that pulses while
   the pump is energized. NEMA 12 indoor enclosure with local disconnect lever.
============================================================================ */
function VfdWallEnclosure({
  position,
  rotation = [0, 0, 0],
  tag,
  running,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag: string;
  running: boolean;
}) {
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    if (!ledRef.current) return;
    const t = state.clock.elapsedTime;
    ledRef.current.emissiveIntensity = running ? 1.2 + Math.sin(t * 2.2) * 0.45 : 0;
  });
  return (
    <group name={`electrical:VFD-${tag}`} position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.25, 1.95, 1.25]} />
        <meshStandardMaterial color="#6a6e74" roughness={0.48} metalness={0.42} />
      </mesh>
      <mesh position={[0.13, 0.50, 0]}>
        <planeGeometry args={[0.78, 0.55]} />
        <meshStandardMaterial color="#1a1c20" roughness={0.55} metalness={0.2} />
      </mesh>
      {/* keypad (cluster of nubs) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        return (
          <mesh
            key={i}
            position={[0.135, 0.18 - row * 0.08, -0.18 + col * 0.12]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <boxGeometry args={[0.05, 0.045, 0.012]} />
            <meshStandardMaterial color="#3a3c40" roughness={0.6} metalness={0.3} />
          </mesh>
        );
      })}
      {/* RUN status LED */}
      <mesh position={[0.135, -0.40, -0.42]}>
        <sphereGeometry args={[0.038, 14, 10]} />
        <meshStandardMaterial
          ref={ledRef}
          color="#0c2d10"
          emissive="#3bff6f"
          emissiveIntensity={running ? 1.3 : 0}
          toneMapped={false}
        />
      </mesh>
      <Text position={[0.135, -0.40, -0.27]} fontSize={0.05} color="#dadcde" anchorX="left" anchorY="middle">
        RUN
      </Text>
      {/* local disconnect lever */}
      <mesh position={[0.135, -0.78, 0.50]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.04, 0.20, 0.05]} />
        <meshStandardMaterial color="#c01818" roughness={0.4} metalness={0.45} />
      </mesh>
      <Text position={[0.135, 0.95, 0]} fontSize={0.10} color="#e8c627" anchorX="center" anchorY="middle" fontWeight={700}>
        VFD
      </Text>
      <Text position={[0.135, -0.95, 0]} fontSize={0.07} color="#dddddd" anchorX="center" anchorY="middle">
        {tag}
      </Text>
    </group>
  );
}

/* ============================================================================
   Vertical pipe segment (axis along +Y) with optional insulation jacket.
============================================================================ */
function VerticalPipe({
  x,
  z,
  y0,
  y1,
  pipeRadius = PIPE_R,
  pipeColor,
  insulated = false,
}: {
  x: number;
  z: number;
  y0: number;
  y1: number;
  pipeRadius?: number;
  pipeColor: string;
  insulated?: boolean;
}) {
  const a = Math.min(y0, y1);
  const b = Math.max(y0, y1);
  const len = Math.max(b - a, 0.04);
  const cy = (a + b) / 2;
  return (
    <group>
      <mesh position={[x, cy, z]} castShadow receiveShadow>
        <cylinderGeometry args={[pipeRadius, pipeRadius, len, 18]} />
        <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
      </mesh>
      {insulated ? (
        <mesh position={[x, cy, z]}>
          <cylinderGeometry args={[pipeRadius * 1.45, pipeRadius * 1.45, len - 0.10, 16]} />
          <meshStandardMaterial
            color={COLOR.insulation}
            roughness={0.92}
            metalness={0.0}
            transparent
            opacity={0.92}
          />
        </mesh>
      ) : null}
    </group>
  );
}

/* ============================================================================
   Long-radius 90° elbow in the XY plane (turns +Y descent into +X horizontal,
   with the torus arc placed so it tangentially mates the riser bottom and the
   horizontal suction spool inboard end).
============================================================================ */
function ElbowYtoX({
  xElbow,
  yElbow,
  z,
  pipeRadius = PIPE_R,
  pipeColor,
  /** +1 turns toward +X (riser at -X side going right), -1 turns toward -X. */
  toward = +1,
}: {
  xElbow: number;
  yElbow: number;
  z: number;
  pipeRadius?: number;
  pipeColor: string;
  toward?: 1 | -1;
}) {
  const R = pipeRadius * 4.5; // long-radius
  /* Torus default sits in XY plane, arc 0..π/2. We want a quarter that
     joins the bottom of a vertical riser to the horizontal pipe. */
  return (
    <mesh
      position={[xElbow + toward * R * 0, yElbow, z]}
      rotation={toward > 0 ? [0, 0, Math.PI] : [0, 0, Math.PI / 2]}
    >
      <torusGeometry args={[R, pipeRadius, 12, 22, Math.PI / 2]} />
      <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
    </mesh>
  );
}

/* ============================================================================
   Horizontal pipe along +X (no flanges) — used inside an assembly between
   close-coupled fittings where flange faces would visually clutter.
============================================================================ */
function HorizPipe({
  x0,
  x1,
  y,
  z,
  pipeRadius = PIPE_R,
  pipeColor,
}: {
  x0: number;
  x1: number;
  y: number;
  z: number;
  pipeRadius?: number;
  pipeColor: string;
}) {
  const a = Math.min(x0, x1);
  const b = Math.max(x0, x1);
  const len = Math.max(b - a, 0.04);
  const cx = (a + b) / 2;
  return (
    <mesh position={[cx, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[pipeRadius, pipeRadius, len, 18]} />
      <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
    </mesh>
  );
}

/* ============================================================================
   Common pump-assembly props.
============================================================================ */
export interface PumpAssemblyProps {
  /** World-space position of the pump baseplate origin. */
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Drives impeller/coupling spin and VFD RUN LED. */
  running: boolean;
  /** Tag printed on the motor and used in instrument loops (e.g. "CDWP-1"). */
  tag?: string;
  /** Valve store IDs (so the gate / drain handles toggle the same simulation). */
  suctionValveId: string;
  dischargeValveId: string;
  drainValveId: string;
  /** Optional override factory paint. */
  paint?: PumpPaint;
}

/* ─────────── shared layout solver ─────────── */
export type AssemblyLayout = ReturnType<typeof computeAssemblyLayout>;

export function computeAssemblyLayout(duty: 'chw' | 'cdw') {
  const ports = getPumpHydraulicPorts(PIPE_R, duty);
  const { suctionPipeFaceX, dischargePipeFaceX, voluteX, shaftY } = ports;

  const sucRunLen = SUCTION_RUN_DIA_MULT * (PIPE_R * 2);
  const xElbow = suctionPipeFaceX - sucRunLen;
  const yElbow = shaftY;
  const xRiser = xElbow;

  /* Suction train (left → right toward pump): elbow → spool → eccentric reducer
     (CDW only) → spool → suction gate → spool → suction face. */
  const xGateSuc = suctionPipeFaceX - 0.55;
  const xReducerEnd = xElbow + (duty === 'cdw' ? 0.55 : 0);
  const xReducerStart = xElbow + (duty === 'cdw' ? 0.10 : 0);

  /* Vertical riser train (top → bottom): ceiling → spool → vertical gate →
     spool → Y-strainer → short stub → elbow apex. */
  const yElbowExitTop = yElbow + 0.05; // small lift before elbow apex
  const yStrainerCenter = yElbowExitTop + 0.55;
  const yGateRiser = yStrainerCenter + 1.20;

  /* Discharge train (left → right away from pump): face → check → gate → FT
     → tie-off. */
  const xCheck = dischargePipeFaceX + 0.45;
  const xGateDis = xCheck + 0.62;
  const xFt = xGateDis + 0.55;
  const xDischargeOut = xFt + 0.45;

  return {
    ports,
    voluteX,
    shaftY,
    /* suction train */
    suctionPipeFaceX,
    xGateSuc,
    xReducerEnd,
    xReducerStart,
    xElbow,
    yElbow,
    /* vertical riser */
    xRiser,
    yElbowExitTop,
    yStrainerCenter,
    yGateRiser,
    /* discharge train */
    dischargePipeFaceX,
    xCheck,
    xGateDis,
    xFt,
    xDischargeOut,
  };
}

/* ============================================================================
   Internal renderer shared by both assemblies. Differs only in pipe colors,
   tags, eccentric reducer presence, and discharge tail (chiller stub vs.
   vertical CHS riser up).
============================================================================ */
function PumpAssemblyBody({
  layout,
  pipeColorSuction,
  pipeColorDischarge,
  tag,
  duty,
  paint,
  running,
  suctionValveId,
  dischargeValveId,
  drainValveId,
}: {
  layout: AssemblyLayout;
  pipeColorSuction: string;
  pipeColorDischarge: string;
  tag: string;
  duty: 'chw' | 'cdw';
  paint?: PumpPaint;
  running: boolean;
  suctionValveId: string;
  dischargeValveId: string;
  drainValveId: string;
}) {
  const yCL = layout.shaftY;
  const ftTag = `FT-${tag}`;
  const pdiTag = `PDI-${tag}`;

  return (
    <>
      {/* ── Concrete inertia-base / vibration-isolated pump (procedural geom) ── */}
      <EndSuctionHvacPump
        name={`pump:${tag}`}
        tag={tag}
        position={[0, 0, 0]}
        pipeRadius={PIPE_R}
        duty={duty}
        running={running}
        paint={paint}
      />

      {/* ===================== SUCTION TRAIN (vertical → horizontal) ===================== */}
      {/* 1. Vertical riser dropping from the ceiling penetration */}
      <VerticalPipe
        x={layout.xRiser}
        z={0}
        y0={CEILING_Y}
        y1={layout.yGateRiser + 0.30}
        pipeColor={pipeColorSuction}
        insulated
      />
      {/* Roof / ceiling penetration sleeve */}
      <mesh position={[layout.xRiser, CEILING_Y - 0.05, 0]}>
        <cylinderGeometry args={[PIPE_R * 1.85, PIPE_R * 1.95, 0.18, 16]} />
        <meshStandardMaterial color="#7c8086" roughness={0.55} metalness={0.55} />
      </mesh>

      {/* 2. Vertical isolation gate valve in the middle of the riser */}
      <GateValve
        valveId={suctionValveId}
        position={[layout.xRiser, layout.yGateRiser, 0]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorSuction}
      />
      <VerticalPipe
        x={layout.xRiser}
        z={0}
        y0={layout.yGateRiser - 0.30}
        y1={layout.yStrainerCenter + 0.30}
        pipeColor={pipeColorSuction}
      />

      {/* 3. Vertical Y-strainer with bottom blow-down valve */}
      <YStrainer
        position={[layout.xRiser, layout.yStrainerCenter, 0]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorSuction}
        idBand={false}
      />
      <VerticalPipe
        x={layout.xRiser}
        z={0}
        y0={layout.yStrainerCenter - 0.30}
        y1={layout.yElbowExitTop}
        pipeColor={pipeColorSuction}
      />

      {/* 4. Long-radius 90° elbow Y → X */}
      <ElbowYtoX
        xElbow={layout.xElbow}
        yElbow={layout.yElbow}
        z={0}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorSuction}
        toward={+1}
      />

      {/* 5. Horizontal suction spool out of the elbow */}
      <HorizPipe
        x0={layout.xElbow + PIPE_R * 4.5}
        x1={layout.xReducerStart}
        y={yCL}
        z={0}
        pipeColor={pipeColorSuction}
      />

      {/* 6. Eccentric reducer (CDW only — flat-side-up). For CHW the reducer
             segment collapses to zero length (xReducerStart === xReducerEnd). */}
      {duty === 'cdw' ? (
        <EccentricReducer
          position={[(layout.xReducerStart + layout.xReducerEnd) / 2, yCL, 0]}
          largeR={PIPE_R * 1.18}
          smallR={PIPE_R}
          length={layout.xReducerEnd - layout.xReducerStart}
          bodyColor={pipeColorSuction}
        />
      ) : null}

      {/* 7. Spool from reducer outlet (or elbow exit for CHW) to the suction gate */}
      <FlangedSpool
        x0={layout.xReducerEnd}
        x1={layout.xGateSuc - 0.30}
        y={yCL}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorSuction}
      />

      {/* 8. Suction-side close-coupled gate valve directly upstream of the pump */}
      <GateValve
        valveId={`${suctionValveId}-close`}
        position={[layout.xGateSuc, yCL, 0]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorSuction}
      />
      <FlangedSpool
        x0={layout.xGateSuc + 0.28}
        x1={layout.suctionPipeFaceX}
        y={yCL}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorSuction}
      />

      {/* 9. Suction-side instruments — local PG, TG and Pete's-plug test port */}
      <PressureGauge
        position={[layout.xGateSuc - 0.55, yCL, 0]}
        pipeRadius={PIPE_R}
        label={`PG-${tag}-S`}
      />
      <TemperatureGauge
        position={[layout.xGateSuc - 1.05, yCL, 0]}
        pipeRadius={PIPE_R}
        label={`TG-${tag}-S`}
      />
      <TestPort position={[layout.xGateSuc - 0.20, yCL, 0]} pipeRadius={PIPE_R} />

      {/* ===================== DISCHARGE TRAIN ===================== */}
      <FlangedSpool
        x0={layout.dischargePipeFaceX}
        x1={layout.xCheck - 0.30}
        y={yCL}
        z={0.10}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorDischarge}
      />
      {/* swing-type check valve */}
      <CheckValve
        position={[layout.xCheck, yCL, 0]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorDischarge}
      />
      <FlangedSpool
        x0={layout.xCheck + 0.30}
        x1={layout.xGateDis - 0.28}
        y={yCL}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorDischarge}
      />
      {/* discharge isolation gate */}
      <GateValve
        valveId={dischargeValveId}
        position={[layout.xGateDis, yCL, 0]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorDischarge}
      />
      <FlangedSpool
        x0={layout.xGateDis + 0.28}
        x1={layout.xFt - 0.22}
        y={yCL}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorDischarge}
      />
      {/* inline mag-meter flow transmitter */}
      <InlineFlowTransmitter
        position={[layout.xFt, yCL, 0]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorDischarge}
        tag={ftTag}
      />
      {/* Discharge instruments — local PG, TG and Schrader test port */}
      <PressureGauge
        position={[layout.xCheck + 0.05, yCL, 0]}
        pipeRadius={PIPE_R}
        label={`PG-${tag}-D`}
      />
      <TemperatureGauge
        position={[layout.xGateDis - 0.05, yCL, 0]}
        pipeRadius={PIPE_R}
        label={`TG-${tag}-D`}
      />
      <TestPort position={[layout.xCheck + 0.32, yCL, 0]} pipeRadius={PIPE_R} />

      {/* ===================== PDI ACROSS PUMP ===================== */}
      <PdiAcrossPump
        position={[layout.voluteX, yCL + 0.85, 0.42]}
        tag={pdiTag}
        suctionTapWorld={[layout.suctionPipeFaceX + 0.05, yCL + PIPE_R, 0]}
        dischargeTapWorld={[layout.dischargePipeFaceX - 0.05, yCL + PIPE_R, 0.10]}
      />

      {/* ===================== LOW-POINT DRAIN AT VOLUTE ===================== */}
      <DrainValve
        valveId={drainValveId}
        position={[layout.voluteX, 0.10, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        pipeRadius={PIPE_R * 0.55}
      />

      {/* ===================== TAG / SIGNAGE ===================== */}
      <Text
        position={[layout.voluteX, 1.55, 0]}
        fontSize={0.13}
        color="#f0f0f0"
        outlineWidth={0.008}
        outlineColor="#000000"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        {tag}
      </Text>
    </>
  );
}

/* ============================================================================
   <CDWPPumpAssembly />
   Condenser Water Pump assembly.
   ──────────────────────────────────────────────────────────────────────────
   FLOW PATH (per pump-assemblies.spec.json):
     Rooftop cooling-tower basin (CWS, dark green)
       → vertical CWS riser dropping into engine-room ceiling
       → suction isolation gate valve (vertical)
       → Y-strainer with blow-down
       → eccentric reducer (FLAT SIDE UP)
       → long-radius 90° elbow → horizontal suction spool (≥ 6 pipe Ø)
       → close-coupled suction isolation gate
       → CDWP suction inlet flange
       ──── pump ────
       → CDWP discharge flange
       → swing check valve (dark green)
       → discharge isolation gate (dark green)
       → inline magmeter FT (FT-CDWP-1)
       → discharge tie-off (heads to YORK chiller condenser water inlet)
   ──────────────────────────────────────────────────────────────────────────
   The discharge tail of this assembly ends at `xDischargeOut`; the parent
   scene is responsible for routing the short final spool / elbow into the
   chiller condenser inlet flange (its world position is plant-specific).
============================================================================ */
export function CDWPPumpAssembly({
  position,
  rotation = [0, 0, 0],
  running,
  tag = 'CDWP-1',
  suctionValveId,
  dischargeValveId,
  drainValveId,
  paint = 'gold',
}: PumpAssemblyProps) {
  const layout = computeAssemblyLayout('cdw');
  return (
    <group name={`pump-assembly:${tag}`} position={position} rotation={rotation}>
      <PumpAssemblyBody
        layout={layout}
        pipeColorSuction={COLOR.CWS}
        pipeColorDischarge={COLOR.CWS}
        tag={tag}
        duty="cdw"
        paint={paint}
        running={running}
        suctionValveId={suctionValveId}
        dischargeValveId={dischargeValveId}
        drainValveId={drainValveId}
      />
      {/* CDWP discharge tail — short stub heading toward the YORK chiller
          condenser inlet (the parent scene continues the route). */}
      <HorizPipe
        x0={layout.xDischargeOut}
        x1={layout.xDischargeOut + 0.65}
        y={layout.shaftY}
        z={0}
        pipeColor={COLOR.CWS}
      />
      <Text
        position={[layout.xDischargeOut + 0.32, layout.shaftY + 0.28, 0]}
        fontSize={0.07}
        color="#0a4a0a"
        anchorX="center"
        anchorY="middle"
      >
        → CHILLER COND IN
      </Text>
      {/* VFD enclosure — wall-mounted alongside the pump */}
      <VfdWallEnclosure
        position={[layout.voluteX, 1.05, VFD_OFFSET_Z]}
        tag={tag}
        running={running}
      />
    </group>
  );
}

/* ============================================================================
   <CHWPPumpAssembly />
   Chilled Water Pump assembly.
   ──────────────────────────────────────────────────────────────────────────
   FLOW PATH (per pump-assemblies.spec.json):
     Rooftop AHU/RTU coil leaving water (CHR, light blue)
       → vertical CHR riser dropping into engine-room ceiling
       → suction isolation gate valve (vertical)
       → Y-strainer with blow-down
       → long-radius 90° elbow → horizontal suction spool (≥ 6 pipe Ø)
       → close-coupled suction isolation gate
       → CHWP suction inlet flange
       ──── pump ────
       → CHWP discharge flange
       → swing check valve (dark blue)
       → discharge isolation gate (dark blue)
       → inline magmeter FT (FT-CHWP-1)
       → vertical CHS riser heading UP through the roof to the AHU coil
   ──────────────────────────────────────────────────────────────────────────
============================================================================ */
export function CHWPPumpAssembly({
  position,
  rotation = [0, 0, 0],
  running,
  tag = 'CHWP-1',
  suctionValveId,
  dischargeValveId,
  drainValveId,
  paint = 'blue',
}: PumpAssemblyProps) {
  const layout = computeAssemblyLayout('chw');
  return (
    <group name={`pump-assembly:${tag}`} position={position} rotation={rotation}>
      <PumpAssemblyBody
        layout={layout}
        pipeColorSuction={COLOR.CHR}
        pipeColorDischarge={COLOR.CHS}
        tag={tag}
        duty="chw"
        paint={paint}
        running={running}
        suctionValveId={suctionValveId}
        dischargeValveId={dischargeValveId}
        drainValveId={drainValveId}
      />
      {/* CHWP discharge tail — turns UP into a vertical CHS riser to the roof */}
      <HorizPipe
        x0={layout.xDischargeOut}
        x1={layout.xDischargeOut + 0.65}
        y={layout.shaftY}
        z={0}
        pipeColor={COLOR.CHS}
      />
      <ElbowYtoX
        xElbow={layout.xDischargeOut + 0.65}
        yElbow={layout.shaftY}
        z={0}
        pipeRadius={PIPE_R}
        pipeColor={COLOR.CHS}
        toward={-1}
      />
      <VerticalPipe
        x={layout.xDischargeOut + 0.65 + PIPE_R * 4.5}
        z={0}
        y0={layout.shaftY + 0.05}
        y1={CEILING_Y}
        pipeColor={COLOR.CHS}
        insulated
      />
      {/* Roof / ceiling penetration sleeve on the CHS up-riser */}
      <mesh position={[layout.xDischargeOut + 0.65 + PIPE_R * 4.5, CEILING_Y - 0.05, 0]}>
        <cylinderGeometry args={[PIPE_R * 1.85, PIPE_R * 1.95, 0.18, 16]} />
        <meshStandardMaterial color="#7c8086" roughness={0.55} metalness={0.55} />
      </mesh>
      <Text
        position={[layout.xDischargeOut + 0.65 + PIPE_R * 4.5 + 0.35, CEILING_Y - 0.45, 0]}
        fontSize={0.07}
        color="#0a2540"
        anchorX="left"
        anchorY="middle"
      >
        CHS ↑ AHU COIL
      </Text>
      {/* VFD enclosure — wall-mounted on the opposite side from the CDWP unit */}
      <VfdWallEnclosure
        position={[layout.voluteX, 1.05, -VFD_OFFSET_Z]}
        rotation={[0, Math.PI, 0]}
        tag={tag}
        running={running}
      />
    </group>
  );
}

/* ============================================================================
   INTEGRATION EXAMPLE (per pump-assemblies.spec output_expectations):
   ──────────────────────────────────────────────────────────────────────────
   Inside the engine-room scene — same world frame as the YORK chiller at
   (0, 0, 0), with the chiller's evaporator on the −X end and the condenser
   on the +X end:

     <CDWPPumpAssembly
       position={[2.74, 0, 5.6]}                // condenser end (right of chiller)
       running={cdwFlow}
       tag="CDWP-1"
       suctionValveId="pipe_gate_cdwp_suction"
       dischargeValveId="pipe_gate_cdwp_discharge"
       drainValveId="pipe_drain_cdwp_low"
     />

     <CHWPPumpAssembly
       position={[-4.20, 0, -5.6]}              // evaporator end (left of chiller)
       running={chwFlow}
       tag="CHWP-1"
       suctionValveId="pipe_gate_chwp_suction"
       dischargeValveId="pipe_gate_chwp_discharge"
       drainValveId="pipe_drain_chwp_low"
     />

   Each assembly handles its own suction riser, valve train, pump, and
   discharge train. The parent scene is responsible only for routing the
   short final stub from each `xDischargeOut` tail into the chiller nozzle
   or the rooftop riser, and the corresponding ceiling penetration.
============================================================================ */
