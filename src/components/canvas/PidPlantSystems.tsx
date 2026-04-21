/**
 * YORK water-cooled plant add-ons per pid.json / must_install_components.
 * Layout constants mirror EngineRoom in App.tsx — keep in sync when moving equipment.
 */
import { type JSX, type MutableRefObject } from 'react';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/useSimulationStore';
import { pumpShaftCenterlineY, FlangedSpool } from './IndustrialCentrifugalPump';
import {
  CDWPPumpAssembly,
  CHWPPumpAssembly,
  computeAssemblyLayout,
  PIPE_R as PUMP_PIPE_R,
  CEILING_Y as PUMP_CEILING_Y,
  ELBOW_R_FACTOR as PUMP_ELBOW_R_FACTOR,
  PUMP_COLOR,
} from './PumpAssemblies';
import {
  GateValve,
  DrainValve,
  AirVent,
  GlobeValve,
  CheckValve,
  TestPort,
} from './PipingAccessories';
import { PipeFlowMarkers } from './PipeFlowMarkers';
import { usePlantLayerStore } from '../../store/usePlantLayerStore';
import { useCdwLoopFlowing, useChwLoopFlowing } from '../../hooks/useLoopFlow';

const STEEL          = '#8c8c8c';
const HANDWHEEL_RED  = '#cc2222';
const BRASS          = '#b89540';

const MAIN_R = 0.30;

/** Condenser water nozzle / riser (world). */
/* CDW supply nozzle is at X=0 (barrel centerline); the return nozzle is
   offset +0.55 m in X so its elbow arc and vertical riser run clear of
   the supply riser. Both flanges bolt onto the +Z condenser barrel face.
   Matches App.tsx CW_X_SUPPLY (0.0) / CW_X_RETURN (+0.55) and their risers. */
const CW_XS = 0.0;
const CW_XR = 0.55;   // return riser offset in X to clear the supply riser (matches App.tsx CW_X_RETURN)
const CW_ZS = 5.6;
const CW_ZR = 6.75;

/** Chilled water headers (world).
 * App.tsx: CHW_Z_SUPPLY = -(HEAD_Z + 0.95) = -(4.575 + 0.95) = -5.525
 *          CHW_Z_RETURN = -(HEAD_Z + 2.10)  = -(4.575 + 2.10) = -6.675
 * Keep in sync with App.tsx CHW_Z_SUPPLY / CHW_Z_RETURN. */
const CHW_ZS = -5.525;
const CHW_ZR = -6.675;
const HDR_Y = 1.1;

const TOWER_X = 25;
const TOWER_Z = 6.175;
const ROOF_Y = 12.38;

function FlowTransmitterMagMeter({
  position,
  rotation = [0, 0, 0],
  tag = 'FT-1',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag?: string;
}) {
  return (
    <group name={`instrument:${tag}`} position={position} rotation={rotation}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[MAIN_R * 1.06, MAIN_R * 1.06, 0.42, 20]} />
        <meshStandardMaterial color="#c8ccd2" roughness={0.35} metalness={0.75} />
      </mesh>
      <mesh position={[0, MAIN_R + 0.22, 0]}>
        <boxGeometry args={[0.28, 0.18, 0.34]} />
        <meshStandardMaterial color="#d0d4da" roughness={0.4} metalness={0.5} />
      </mesh>
      <Billboard>
      <Text position={[0, MAIN_R + 0.38, 0.18]} fontSize={0.07} color="#111" anchorX="center" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
    </group>
  );
}

function DifferentialPressureCell({
  position,
  rotation = [0, 0, 0],
  tag = 'PDI-1',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag?: string;
}) {
  return (
    <group name={`instrument:${tag}`} position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.22, 0.16, 0.12]} />
        <meshStandardMaterial color="#e8eaee" roughness={0.45} metalness={0.35} />
      </mesh>
      <mesh position={[-0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.04, 0.08, 8]} />
        <meshStandardMaterial color="#8a9098" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.04, 0.08, 8]} />
        <meshStandardMaterial color="#8a9098" roughness={0.4} metalness={0.8} />
      </mesh>
      <Billboard>
      <Text position={[0, 0, 0.07]} fontSize={0.055} color="#111" anchorX="center" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
    </group>
  );
}

/**
 * ISA-style instrument balloon (pid `instruments` — FT, TT, PT bubble tag).
 * Renders a thin disc with a horizontal centre line and a 2-line tag (e.g. "PT" / "CHWS").
 * Cheap to draw; intended as a marker on long straight pipe runs.
 */
function IsaInstrumentBubble({
  position,
  rotation = [0, 0, 0],
  type,
  loop,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  type: 'FT' | 'TT' | 'PT' | 'LC' | 'PDI';
  loop: string;
}) {
  return (
    <group name={`instrument:${type}-${loop}`} position={position} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.018, 24]} />
        <meshStandardMaterial color="#f4f5f7" roughness={0.45} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0.011]}>
        <boxGeometry args={[0.30, 0.006, 0.001]} />
        <meshStandardMaterial color="#101216" />
      </mesh>
      <Billboard>
      <Text position={[0, 0.06, 0.012]} fontSize={0.07} color="#101216" anchorX="center" anchorY="middle" fontWeight={700}>
        {type}
      </Text>
      </Billboard>
      <Billboard>
      <Text position={[0, -0.06, 0.012]} fontSize={0.055} color="#101216" anchorX="center" anchorY="middle">
        {loop}
      </Text>
      </Billboard>
    </group>
  );
}

/**
 * Float-operated basin level control valve (pid `makeup_water_loop` — LC).
 * Body is a brass globe with a horizontal arm carrying a copper float ball.
 * Mounted on the makeup drop pipe at the air-gap, at basin water surface elevation.
 */
function FloatLevelControlValve({
  position,
  rotation = [0, 0, 0],
  tag = 'LC-CT',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag?: string;
}) {
  return (
    <group name={`valve:${tag}`} position={position} rotation={rotation}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.085, 0.085, 0.18, 14]} />
        <meshStandardMaterial color="#a48238" roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.55, 8]} />
        <meshStandardMaterial color="#b87333" roughness={0.35} metalness={0.9} />
      </mesh>
      <mesh position={[0.46, -0.08, 0]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshStandardMaterial color="#c97e34" roughness={0.45} metalness={0.55} />
      </mesh>
      <Billboard>
      <Text position={[0, 0.22, 0]} fontSize={0.07} color="#0a4a0a" anchorX="center" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
    </group>
  );
}

/**
 * Main service breaker / fused disconnect cabinet (pid `electrical_system`
 * — "Main service disconnect/breaker right after transformer").
 * NEMA 3R outdoor-rated enclosure with a 4-position gang lever.
 */
function MainServiceBreaker({ position }: { position: [number, number, number] }) {
  return (
    <group name="electrical:MAIN-BREAKER" position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.55, 1.65, 1.10]} />
        <meshStandardMaterial color="#5e6268" roughness={0.5} metalness={0.42} />
      </mesh>
      <mesh position={[0.30, 0.30, 0]}>
        <boxGeometry args={[0.06, 0.78, 1.00]} />
        <meshStandardMaterial color="#3c4046" roughness={0.5} metalness={0.55} />
      </mesh>
      <mesh position={[0.34, 0.30, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <boxGeometry args={[0.06, 0.45, 0.12]} />
        <meshStandardMaterial color="#c01818" roughness={0.4} metalness={0.5} />
      </mesh>
      <Billboard>
      <Text position={[0.32, 0.95, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.10} color="#e8c627" anchorX="center" anchorY="middle">
        MAIN BREAKER
      </Text>
      </Billboard>
      <Billboard>
      <Text position={[0.32, -0.55, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.07} color="#e8e8e8" anchorX="center" anchorY="middle">
        480V / 3Φ / 1200A
      </Text>
      </Billboard>
    </group>
  );
}

function PressureReliefValve({
  position,
  rotation = [0, 0, 0],
  tag = 'PSV',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag?: string;
}) {
  return (
    <group name={`valve:${tag}`} position={position} rotation={rotation}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 12]} />
        <meshStandardMaterial color="#6a6e74" roughness={0.45} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.1, 12]} />
        <meshStandardMaterial color="#b8bcc4" roughness={0.35} metalness={0.65} />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.045, 0.04, 0.08, 8]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.5} />
      </mesh>
      <Billboard>
      <Text position={[0.16, 0.1, 0]} fontSize={0.06} color="#222" anchorX="left" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
    </group>
  );
}

/* Pump skid replaced by <CDWPPumpAssembly /> and <CHWPPumpAssembly />
   from ./PumpAssemblies (pump-assemblies.spec.json). */

/* ════════════════════════════════════════════════════════════════════════════
   PUMP HYDRAULIC TIE-INS
   ──────────────────────────────────────────────────────────────────────────
   The pump assemblies are self-contained but their suction-riser tops and
   discharge tail-ends sit in mid-air relative to the rest of the plant
   piping defined in `App.tsx`. This block adds the missing bridge pipe
   geometry so each pump is hydraulically continuous with:
     CDWP   suction  ←→ existing rooftop CWS riser  (CW_XS, *, CW_ZS)
     CDWP   discharge ←→ chiller condenser nozzle   (z ≈ 4.55, y ≈ 1.0)
     CHWP   suction  ←→ existing low CHR header     (y = 1.10, z = CHW_ZR)
     CHWP   discharge ←→ existing low CHWS header    (y = 1.10, z = CHW_ZS)
   ────────────────────────────────────────────────────────────────────── */

/* Single straight pipe between two arbitrary 3-D points (no flanges). */
function StraightPipe3D({
  a,
  b,
  pipeRadius,
  pipeColor,
  name,
}: {
  a: [number, number, number];
  b: [number, number, number];
  pipeRadius: number;
  pipeColor: string;
  name?: string;
}) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = Math.max(dir.length(), 0.04);
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <mesh
      name={name}
      position={[mid.x, mid.y, mid.z]}
      rotation={[e.x, e.y, e.z]}
      castShadow
      receiveShadow
    >
      <cylinderGeometry args={[pipeRadius, pipeRadius, len, 16]} />
      <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
    </mesh>
  );
}

/* 90° long-radius elbow torus joining two perpendicular pipe runs.

   Convention (used by every PumpHydraulicTieIns call):
     `axisA` and `axisB` are the directions, FROM the corner, along which
     the two straight pipe runs extend. Both must be unit cardinal axes
     and perpendicular to each other.

   Geometry produced:
     • Sweep radius R = pipeRadius × PUMP_ELBOW_R_FACTOR.
     • Torus centre = corner + R·axisA + R·axisB  (sits on the inside of
       the L-bend, equidistant from both pipe centrelines).
     • Arc tangent points (where the elbow meets the straight runs):
         on the axisA leg → corner + R·axisA
         on the axisB leg → corner + R·axisB
     ⇒ Each connecting StraightPipe3D must terminate at exactly that
       tangent point (corner offset by R along the pipe's outgoing axis).

   Signed axis literals: prefix with '-' for negative direction
     ('y' = +Y, '-z' = −Z, …). */
function ElbowAt({
  corner,
  axisA,
  axisB,
  pipeRadius,
  pipeColor,
}: {
  corner: [number, number, number];
  axisA: 'x' | 'y' | 'z' | '-x' | '-y' | '-z';
  axisB: 'x' | 'y' | 'z' | '-x' | '-y' | '-z';
  pipeRadius: number;
  pipeColor: string;
}) {
  const R = pipeRadius * PUMP_ELBOW_R_FACTOR;
  const unitMap: Record<string, THREE.Vector3> = {
    'x':  new THREE.Vector3( 1,  0,  0),
    'y':  new THREE.Vector3( 0,  1,  0),
    'z':  new THREE.Vector3( 0,  0,  1),
    '-x': new THREE.Vector3(-1,  0,  0),
    '-y': new THREE.Vector3( 0, -1,  0),
    '-z': new THREE.Vector3( 0,  0, -1),
  };
  const a = unitMap[axisA].clone();
  const b = unitMap[axisB].clone();
  /* Right-handed orthonormal basis chosen so that the default Three.js
     TorusGeometry arc (which spans local +X → +Y in the local XY plane)
     lands its φ=0 endpoint at world (corner + R·axisA) and its φ=π/2
     endpoint at world (corner + R·axisB).
       local +X  → world  −axisB
       local +Y  → world  −axisA
       local +Z  → world  axisB × axisA   (= −(axisA × axisB))
     This yields det = +1 (right-handed). */
  const negA = a.clone().negate();
  const negB = b.clone().negate();
  const localZ = new THREE.Vector3().crossVectors(b, a);   // = b × a
  const m = new THREE.Matrix4().makeBasis(negB, negA, localZ);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  const e = new THREE.Euler().setFromQuaternion(q);
  const cx = corner[0] + a.x * R + b.x * R;
  const cy = corner[1] + a.y * R + b.y * R;
  const cz = corner[2] + a.z * R + b.z * R;
  return (
    <mesh position={[cx, cy, cz]} rotation={[e.x, e.y, e.z]} castShadow receiveShadow>
      <torusGeometry args={[R, pipeRadius, 12, 22, Math.PI / 2]} />
      <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
    </mesh>
  );
}

/**
 * Pump skid world origins — must match the `position` props passed to
 * <CDWPPumpAssembly> and <CHWPPumpAssembly> below.
 *
 * Placement rationale (engine room looking from +Z):
 *   CDWP: X=CW_XS=0 (aligns with CWS supply riser), Z=9.0 (behind the CWR
 *         riser at Z=6.75 by 2.25 m — no pipe/riser overlap).
 *   CHWP: X=-1.984 (aligns under CHWS/CHWR header X), Z=-9.5 (behind the
 *         CHWR header at Z≈-6.675 by 2.8 m — no header overlap).
 */
export const CDWP_ORIGIN: [number, number, number] = [CW_XS, 0, 9.0];
export const CHWP_ORIGIN: [number, number, number] = [-1.984, 0, -9.5];

function PumpHydraulicTieIns() {
  const cdwLay = computeAssemblyLayout('cdw');
  const chwLay = computeAssemblyLayout('chw');

  /* ── World-space anchor points (assembly-local coords → world) ── */
  const cdwSucRiserTop: [number, number, number] = [
    CDWP_ORIGIN[0] + cdwLay.xRiser,
    PUMP_CEILING_Y,
    CDWP_ORIGIN[2],
  ];
  const cdwDischargeEnd: [number, number, number] = [
    CDWP_ORIGIN[0] + cdwLay.xDischargeOut + 0.65,
    cdwLay.shaftY,
    CDWP_ORIGIN[2],
  ];
  const chwSucRiserTop: [number, number, number] = [
    CHWP_ORIGIN[0] + chwLay.xRiser,
    PUMP_CEILING_Y,
    CHWP_ORIGIN[2],
  ];
  const chwChsRiserTop: [number, number, number] = [
    CHWP_ORIGIN[0] + chwLay.xDischargeRiserX,
    PUMP_CEILING_Y,
    CHWP_ORIGIN[2],
  ];

  /* ── Constants shared across both loops ── */
  const HEADER_Y   = 1.10;          // CHW low-level header elevation
  const BRIDGE_Y   = 3.20;          // CDWP discharge bridge elevation (clears condenser top ≈1.89 m)
  /* Pipe radius used for all bridge segments — matches App.tsx MAIN_PIPE_RADIUS (0.22 m)
     so bridge spools join the main riser without a visible step. */
  const BR         = 0.22;
  /* Run-pipe (riser / header) radius — must mirror MAIN_PIPE_RADIUS in App.tsx. */
  const MAIN_PIPE_RADIUS = 0.22;
  /* Elbow sweep radius must match BR so straight-pipe offsets and ElbowAt arcs agree. */
  const ER         = BR * PUMP_ELBOW_R_FACTOR;  // 0.22 × 4.5 = 0.99 m
  /* Distance from a tee's run-pipe centerline to where the branch spool
     terminates: outer surface of the run pipe + length of the welded
     saddle stub. Bridge spools land on the stub's outer face for a
     visually continuous tee. */
  const TEE_STUB_LEN = 0.18;
  const TEE_BRANCH_OFFSET = MAIN_PIPE_RADIUS + TEE_STUB_LEN;

  /* ── Bull-tee saddle: renders the welded fitting where a branch pipe
        intersects a larger run pipe (riser or header).
        The saddle is a short, slightly over-sized stub aligned with the
        branch pipe, starting at the run-pipe surface and projecting
        outward by `stubLen`. A small reinforcement weld bead is drawn
        flush with the run-pipe surface for the printed-fitting look. */
  const TeeSaddle = ({
    runPosition,
    branchAxis,
    pipeColor,
  }: {
    /** World position of the run-pipe centerline at the tee. */
    runPosition: [number, number, number];
    /** Cardinal axis (with sign) the branch extends from the run-pipe surface. */
    branchAxis: 'x' | '-x' | 'y' | '-y' | 'z' | '-z';
    /** Service color of the branch (matches the bridge spool that lands here). */
    pipeColor: string;
  }) => {
    const stubLen   = TEE_STUB_LEN;
    const stubR     = BR * 1.18;             // weld-on saddle is a touch larger than branch OD
    const beadR     = BR * 1.45;             // reinforcement bead sits flush on the run pipe
    const beadT     = 0.05;
    const runSurfaceOffset = MAIN_PIPE_RADIUS;   // centerline → outer surface of the run pipe
    const unitMap: Record<string, [number, number, number]> = {
      'x':  [ 1,  0,  0],
      '-x': [-1,  0,  0],
      'y':  [ 0,  1,  0],
      '-y': [ 0, -1,  0],
      'z':  [ 0,  0,  1],
      '-z': [ 0,  0, -1],
    };
    const u = unitMap[branchAxis];
    const stubMid: [number, number, number] = [
      runPosition[0] + u[0] * (runSurfaceOffset + stubLen / 2),
      runPosition[1] + u[1] * (runSurfaceOffset + stubLen / 2),
      runPosition[2] + u[2] * (runSurfaceOffset + stubLen / 2),
    ];
    const beadCenter: [number, number, number] = [
      runPosition[0] + u[0] * (runSurfaceOffset + beadT / 2),
      runPosition[1] + u[1] * (runSurfaceOffset + beadT / 2),
      runPosition[2] + u[2] * (runSurfaceOffset + beadT / 2),
    ];
    /* Default cylinder axis is +Y; rotate so the cylinder points along
       the branch axis. The cross-axis the cylinder is rotated about is
       arbitrary so long as the result aligns with `u`. */
    const stubRot: [number, number, number] =
      branchAxis === 'y'  ? [0, 0, 0] :
      branchAxis === '-y' ? [Math.PI, 0, 0] :
      branchAxis === 'x'  ? [0, 0, -Math.PI / 2] :
      branchAxis === '-x' ? [0, 0,  Math.PI / 2] :
      branchAxis === 'z'  ? [Math.PI / 2, 0, 0] :
                            [-Math.PI / 2, 0, 0];
    return (
      <group>
        {/* Reinforcement weld bead (carbon-steel grey) sitting on run-pipe surface */}
        <mesh position={beadCenter} rotation={stubRot} castShadow>
          <cylinderGeometry args={[beadR, beadR, beadT, 20]} />
          <meshStandardMaterial color="#8a8580" roughness={0.45} metalness={0.85} />
        </mesh>
        {/* Branch stub — same service color as the spool that connects to it */}
        <mesh position={stubMid} rotation={stubRot} castShadow>
          <cylinderGeometry args={[stubR, stubR, stubLen, 20]} />
          <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
        </mesh>
      </group>
    );
  };

  /* Computed CDWP suction riser X/Z, and Z-corner coordinate */
  const sucRX  = cdwSucRiserTop[0];   // ≈ −3.27 world X
  const sucRZ  = cdwSucRiserTop[2];   // 9.0 world Z  (same as CDWP_ORIGIN[2])
  const CY     = PUMP_CEILING_Y;      // 8.6 m

  /* ── CDWP discharge: world X of pump tail ── */
  const disX = cdwDischargeEnd[0];    // ≈ +3.74 world X
  const disZ = cdwDischargeEnd[2];    // 9.0 world Z

  /* ── CHWP geometry ── */
  const chwSucX = chwSucRiserTop[0];  // ≈ −5.58 world X
  const chwSucZ = chwSucRiserTop[2];  // −9.5 world Z
  const chwDisX = chwChsRiserTop[0];  // ≈ +1.21 world X
  const chwDisZ = chwChsRiserTop[2];  // −9.5 world Z
  const xHdr    = -1.984;             // CHWS/CHWR header eastern end X

  return (
    <group name="pump-tie-ins">

      {/* ═══════════════════════════════════════════════════════════════
          CDWP SUCTION TIE-IN
          Pump suction riser (CWS, dark green) at (sucRX ≈ −3.27, CY, 9.0)
          bridges to the CWS main riser at (0, *, 5.6).

          Path (all at PUMP_CEILING_Y = 8.6):
            pump-riser top (sucRX, CY, 9.0)
              → long-radius +X elbow corner at (0, CY, 9.0)   [+X → −Z turn]
              → −Z spool along ceiling to (0, CY, 5.6)
              → tee saddle into CWS main riser (vertical, App.tsx)
         ══════════════════════════════════════════════════════════════ */}
      <group name="tie:CDWP-suction-bridge">
        {/* Horizontal spool from pump riser top to the elbow's −X tangent
            point at (CW_XS − ER, CY, sucRZ). Stops short of the corner by
            ER so the next ElbowAt arc lands flush. */}
        <StraightPipe3D
          a={cdwSucRiserTop}
          b={[CW_XS - ER, CY, sucRZ]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* Long-radius elbow at corner (0, CY, 9.0): legs extend in −X and −Z. */}
        <ElbowAt
          corner={[CW_XS, CY, sucRZ]}
          axisA="-x"
          axisB="-z"
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* −Z ceiling spool: elbow exit → outer face of the tee saddle on
            the CWS main riser. Far end lands on the saddle stub so the
            joint reads as a continuous welded tee. */}
        <StraightPipe3D
          a={[CW_XS, CY, sucRZ - ER]}
          b={[CW_XS, CY, CW_ZS + TEE_BRANCH_OFFSET]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* Tee saddle where bridge lands on the CWS main riser (vertical riser,
            branch projects in +Z toward the bridge). */}
        <TeeSaddle
          runPosition={[CW_XS, CY, CW_ZS]}
          branchAxis="z"
          pipeColor={PUMP_COLOR.CWS}
        />
      </group>

      {/* ═══════════════════════════════════════════════════════════════
          CDWP DISCHARGE TIE-IN
          Pump discharge tail (CWS) at (disX ≈ +3.74, shaftY ≈ 0.88, 9.0).
          Bridges at BRIDGE_Y = 3.2 m, tees into CWS main riser at (0, *, 5.6).

          Path:
            pump discharge tail
              → vertical rise to (disX, BRIDGE_Y, 9.0)          [corner A: +Y → −Z]
              → −Z spool at BRIDGE_Y to (disX, BRIDGE_Y, 5.6)   [corner B: −Z → −X]
              → −X spool at BRIDGE_Y to (0,    BRIDGE_Y, 5.6)
              → tee saddle into CWS main riser
         ══════════════════════════════════════════════════════════════ */}
      <group name="tie:CDWP-discharge-bridge">
        {/* Vertical rise: pump tail → −Y tangent of elbow A (stops ER below
            BRIDGE_Y so the elbow arc seats flush). */}
        <StraightPipe3D
          a={cdwDischargeEnd}
          b={[disX, BRIDGE_Y - ER, disZ]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* Elbow A: corner at (disX, BRIDGE_Y, disZ=9.0); legs extend in
            −Y (back down to pump) and −Z (forward toward CWS riser). */}
        <ElbowAt
          corner={[disX, BRIDGE_Y, disZ]}
          axisA="-y"
          axisB="-z"
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* −Z horizontal spool at BRIDGE_Y */}
        <StraightPipe3D
          a={[disX, BRIDGE_Y, disZ - ER]}
          b={[disX, BRIDGE_Y, CW_ZS + ER]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* Elbow B: corner at (disX, BRIDGE_Y, CW_ZS=5.6); legs extend in
            +Z (back to elbow A) and −X (over to the CWS main riser). */}
        <ElbowAt
          corner={[disX, BRIDGE_Y, CW_ZS]}
          axisA="z"
          axisB="-x"
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* −X horizontal spool: elbow exit → outer face of the tee saddle on
            the CWS main riser. Lands on the saddle stub so the bridge
            visually meets the riser without a daylight gap. */}
        <StraightPipe3D
          a={[disX - ER, BRIDGE_Y, CW_ZS]}
          b={[CW_XS + TEE_BRANCH_OFFSET, BRIDGE_Y, CW_ZS]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* Tee saddle into CWS main riser at BRIDGE_Y (vertical riser,
            branch projects in +X toward the bridge). */}
        <TeeSaddle
          runPosition={[CW_XS, BRIDGE_Y, CW_ZS]}
          branchAxis="x"
          pipeColor={PUMP_COLOR.CWS}
        />
      </group>

      {/* ═══════════════════════════════════════════════════════════════
          CHWP SUCTION TIE-IN
          Pump suction riser (CHR, light blue) tops out at the engine-room
          ceiling at (chwSucX ≈ −5.58, CY, −9.5). The CHR header runs at
          (*, HEADER_Y, CHW_ZR = −6.675).

          The pump itself occupies the column (chwSucX..chwDisX, 0..2.5,
          −10.15..−7.71), so we cannot drop the bridge straight from the
          ceiling to HEADER_Y at z=−9.5 — that would clip the pump body
          and overlap the existing suction riser. Instead, route OVER the
          pump at PUMP_CEILING_Y, traverse +Z until clear of the pump
          body (z = CHW_ZR), then drop straight down to the header tee.

          Path:
            pump riser top (chwSucX, CY, −9.5)
              → elbow A [−Y / +Z]
              → +Z ceiling spool to (chwSucX, CY, CHW_ZR)
              → elbow B [−Z / −Y]
              → vertical drop to (chwSucX, HEADER_Y, CHW_ZR)
              → tee saddle into CHR header (branch from +Y above)
         ══════════════════════════════════════════════════════════════ */}
      <group name="tie:CHWP-suction-bridge">
        {/* Elbow A — at the riser top, transitions vertical pump riser
            (extending −Y back into the pump) into the +Z ceiling spool. */}
        <ElbowAt
          corner={chwSucRiserTop}
          axisA="-y"
          axisB="z"
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHR}
        />
        {/* +Z ceiling spool: elbow A exit → elbow B entry, at PUMP_CEILING_Y,
            traversing the +Z gap from above the pump to above the header. */}
        <StraightPipe3D
          a={[chwSucX, PUMP_CEILING_Y, chwSucZ + ER]}
          b={[chwSucX, PUMP_CEILING_Y, CHW_ZR - ER]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHR}
        />
        {/* Elbow B — at (chwSucX, CY, CHW_ZR); transitions the −Z ceiling
            spool into the vertical drop heading down to the header. */}
        <ElbowAt
          corner={[chwSucX, PUMP_CEILING_Y, CHW_ZR]}
          axisA="-z"
          axisB="-y"
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHR}
        />
        {/* Vertical drop: elbow B exit → outer face of the tee saddle on
            the CHR header (saddle stub projects up in +Y). */}
        <StraightPipe3D
          a={[chwSucX, PUMP_CEILING_Y - ER, CHW_ZR]}
          b={[chwSucX, HEADER_Y + TEE_BRANCH_OFFSET, CHW_ZR]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHR}
        />
        {/* Tee saddle on CHR header (header runs along X at z=CHW_ZR;
            bridge drops from above, so it lands on the saddle's +Y face). */}
        <TeeSaddle
          runPosition={[chwSucX, HEADER_Y, CHW_ZR]}
          branchAxis="y"
          pipeColor={PUMP_COLOR.CHR}
        />
      </group>

      {/* ═══════════════════════════════════════════════════════════════
          CHWP DISCHARGE TIE-IN
          Pump CHS up-riser tops out at (chwDisX ≈ +1.21, CY, −9.5).
          CHWS header: (*, HEADER_Y, CHW_ZS = −5.525), eastern end at
          x = xHdr = −1.984 (which happens to be the CHWP centerline).

          We must avoid the pump body entirely — it occupies roughly
          (chwSucX..chwDisX, 0..2.5, −10.15..−7.71). Routing the bridge
          at HEADER_Y across the pump (the previous design) clipped the
          motor and the discharge train. Instead, route OVER the pump at
          PUMP_CEILING_Y all the way to the CHWS header centerline
          (xHdr, *, CHW_ZS), then drop straight down to the tee. CHW_ZS
          (≈ −5.525) is well north of the pump body in Z, so the drop
          column is clear.

          Path:
            riser top (chwDisX, CY, −9.5)
              → elbow A [−Y / −X]
              → −X ceiling spool to (xHdr, CY, −9.5)
              → elbow B [+X / +Z]
              → +Z ceiling spool to (xHdr, CY, CHW_ZS)
              → elbow C [−Z / −Y]
              → vertical drop to (xHdr, HEADER_Y, CHW_ZS)
              → tee saddle into CHWS header (branch from +Y above)
         ══════════════════════════════════════════════════════════════ */}
      <group name="tie:CHWP-discharge-bridge">
        {/* Elbow A — at the riser top, transitions vertical pump riser
            (extending −Y back into the pump) into the −X ceiling spool. */}
        <ElbowAt
          corner={chwChsRiserTop}
          axisA="-y"
          axisB="-x"
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHS}
        />
        {/* −X ceiling spool: elbow A exit → elbow B entry, at PUMP_CEILING_Y,
            traversing over the pump from chwDisX to xHdr. */}
        <StraightPipe3D
          a={[chwDisX - ER, PUMP_CEILING_Y, chwDisZ]}
          b={[xHdr + ER, PUMP_CEILING_Y, chwDisZ]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHS}
        />
        {/* Elbow B — at (xHdr, CY, −9.5); transitions the +X ceiling spool
            into the +Z ceiling spool heading toward the header. */}
        <ElbowAt
          corner={[xHdr, PUMP_CEILING_Y, chwDisZ]}
          axisA="x"
          axisB="z"
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHS}
        />
        {/* +Z ceiling spool: elbow B exit → elbow C entry, at PUMP_CEILING_Y,
            traversing the +Z gap from above the pump to above the header. */}
        <StraightPipe3D
          a={[xHdr, PUMP_CEILING_Y, chwDisZ + ER]}
          b={[xHdr, PUMP_CEILING_Y, CHW_ZS - ER]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHS}
        />
        {/* Elbow C — at (xHdr, CY, CHW_ZS); transitions the −Z ceiling spool
            into the vertical drop heading down to the header. */}
        <ElbowAt
          corner={[xHdr, PUMP_CEILING_Y, CHW_ZS]}
          axisA="-z"
          axisB="-y"
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHS}
        />
        {/* Vertical drop: elbow C exit → outer face of the tee saddle on
            the CHWS header (saddle stub projects up in +Y). */}
        <StraightPipe3D
          a={[xHdr, PUMP_CEILING_Y - ER, CHW_ZS]}
          b={[xHdr, HEADER_Y + TEE_BRANCH_OFFSET, CHW_ZS]}
          pipeRadius={BR}
          pipeColor={PUMP_COLOR.CHS}
        />
        {/* Tee saddle on CHWS header (header runs along X at z=CHW_ZS;
            bridge drops from above, so it lands on the saddle's +Y face). */}
        <TeeSaddle
          runPosition={[xHdr, HEADER_Y, CHW_ZS]}
          branchAxis="y"
          pipeColor={PUMP_COLOR.CHS}
        />
      </group>
    </group>
  );
}

function RpzAssembly({ position }: { position: [number, number, number] }) {
  return (
    <group name="makeup:RPZ-BFP" position={position}>
      {[-0.28, 0, 0.28].map((dx, i) => (
        <mesh key={i} position={[dx, 0.18, 0]} castShadow>
          <boxGeometry args={[0.22, 0.36, 0.22]} />
          <meshStandardMaterial color="#6a5238" roughness={0.5} metalness={0.45} />
        </mesh>
      ))}
      <Billboard>
      <Text position={[0, 0.55, 0]} fontSize={0.09} color="#1a1a1a" anchorX="center" anchorY="middle">
        RPZ / BFP
      </Text>
      </Billboard>
    </group>
  );
}

/**
 * Pressure Reducing Valve (PRV) body — Watts/Wilkins style spring-loaded
 * domestic-water PRV (pid `makeup_water_loop` + `pressure_regulation`).
 *
 * Geometry: in-line bronze body running along the local pipe (X-axis when
 * `rotation=[0,0,π/2]` is applied externally), with a tall bell-housing on
 * top that holds the regulating spring + adjustment bonnet. Sized for a
 * 1-1/2" line on the rooftop makeup-water main.
 */
function PressureReducingValve({
  position,
  rotation = [0, 0, 0],
  pipeRadius = 0.055,
  tag = 'PRV',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  pipeRadius?: number;
  tag?: string;
}) {
  const r = pipeRadius;
  return (
    <group name={`valve:${tag}`} position={position} rotation={rotation}>
      {/* bronze body (in-line, axis = local X via parent rotation) */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.9, r * 1.9, 0.18, 16]} />
        <meshStandardMaterial color="#a48238" roughness={0.4} metalness={0.85} />
      </mesh>
      {/* end flanges (BSP-tapped union nuts) */}
      {[-0.10, 0.10].map((dx, i) => (
        <mesh key={i} position={[dx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 2.2, r * 2.2, 0.025, 12]} />
          <meshStandardMaterial color="#5a4a28" roughness={0.55} metalness={0.6} />
        </mesh>
      ))}
      {/* spring bell housing (cast iron, painted) */}
      <mesh position={[0, r * 1.9 + 0.16, 0]}>
        <cylinderGeometry args={[r * 1.6, r * 2.1, 0.32, 14]} />
        <meshStandardMaterial color="#3a4a5e" roughness={0.55} metalness={0.45} />
      </mesh>
      {/* adjustment bonnet on top of the bell */}
      <mesh position={[0, r * 1.9 + 0.36, 0]}>
        <cylinderGeometry args={[r * 0.85, r * 0.85, 0.06, 12]} />
        <meshStandardMaterial color="#5a5a5a" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* hex adjustment cap nut */}
      <mesh position={[0, r * 1.9 + 0.42, 0]}>
        <cylinderGeometry args={[r * 0.55, r * 0.55, 0.04, 6]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* downstream pressure gauge stub (small dial face on +Z body) */}
      <mesh position={[0.02, r * 1.0, r * 1.95]}>
        <cylinderGeometry args={[0.045, 0.045, 0.018, 14]} />
        <meshStandardMaterial color="#f4f5f7" roughness={0.45} metalness={0.1} />
      </mesh>
      <Billboard>
      <Text position={[0, r * 1.9 + 0.58, 0]} fontSize={0.07} color="#0a4a0a" anchorX="center" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
    </group>
  );
}

/**
 * Chemical-injection quill body (pid `chemical_treatment` — "injection quill").
 * Sized for a 1/2" stainless quill threaded into a CWR weld-o-let, with a
 * lance reaching to the centerline of the main and a corporation-stop ball
 * valve on top for in-service removal.
 */
function ChemInjectionQuill({
  position,
  rotation = [0, 0, 0],
  mainRadius,
  tag = 'INJ-Q',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  mainRadius: number;
  tag?: string;
}) {
  return (
    <group name={`chemical:${tag}`} position={position} rotation={rotation}>
      {/* weld-o-let saddle on the main */}
      <mesh position={[0, mainRadius + 0.04, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.08, 10]} />
        <meshStandardMaterial color="#5e636a" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* corp-stop ball-valve cube */}
      <mesh position={[0, mainRadius + 0.14, 0]}>
        <boxGeometry args={[0.085, 0.085, 0.085]} />
        <meshStandardMaterial color="#a48238" roughness={0.4} metalness={0.85} />
      </mesh>
      {/* removal lever */}
      <mesh position={[0.085, mainRadius + 0.14, 0]}>
        <boxGeometry args={[0.13, 0.022, 0.022]} />
        <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* lance protruding down into the pipe centerline */}
      <mesh position={[0, mainRadius * 0.5 + 0.04, 0]}>
        <cylinderGeometry args={[0.012, 0.012, mainRadius + 0.08, 8]} />
        <meshStandardMaterial color="#c0c4c8" roughness={0.35} metalness={0.85} />
      </mesh>
      <Billboard>
      <Text position={[0, mainRadius + 0.32, 0]} fontSize={0.06} color="#d96818" anchorX="center" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
    </group>
  );
}

/**
 * VFD bypass cabinet (pid `electrical_system` — "VFDs for both pumps with
 * local disconnects and bypass"). Slim NEMA-12 enclosure with Drive/Off/Bypass
 * three-position selector + line and bypass contactors visible through the
 * door. Mounted directly adjacent to the corresponding VFD.
 */
function VfdBypassCabinet({
  position,
  rotation = [0, 0, 0],
  tag,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag: string;
}) {
  const W = 0.42;
  const H = 1.85;
  const D = 0.95;
  const plinth = 0.10;
  const yCab = plinth + (H - plinth) * 0.5;
  const yDoor = W * 0.5 + 0.001;
  return (
    <group name={`electrical:BYP-${tag}`} position={position} rotation={rotation}>
      {/* concrete pad */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[W + 0.30, 0.08, D + 0.20]} />
        <meshStandardMaterial color="#a89e8c" roughness={0.95} metalness={0.02} />
      </mesh>
      {/* plinth */}
      <mesh position={[0, 0.08 + plinth * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.95, plinth, D * 0.95]} />
        <meshStandardMaterial color="#2c2e32" roughness={0.62} metalness={0.45} />
      </mesh>
      {/* body */}
      <mesh position={[0, yCab, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H - plinth, D]} />
        <meshStandardMaterial color="#6a6e74" roughness={0.48} metalness={0.42} />
      </mesh>
      {/* door */}
      <mesh position={[yDoor, yCab, 0]}>
        <planeGeometry args={[D * 0.94, H - plinth - 0.06]} />
        <meshStandardMaterial color="#5e6268" roughness={0.55} metalness={0.45} />
      </mesh>
      {/* 3-position selector switch (Drive / Off / Bypass) */}
      <mesh position={[yDoor + 0.012, yCab + 0.40, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.018, 16]} />
        <meshStandardMaterial color="#1c1e22" roughness={0.55} metalness={0.4} />
      </mesh>
      <mesh position={[yDoor + 0.022, yCab + 0.40, 0]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.012, 0.085, 0.022]} />
        <meshStandardMaterial color="#c01818" roughness={0.4} metalness={0.45} />
      </mesh>
      {/* bypass-engaged amber pilot light */}
      <mesh position={[yDoor + 0.012, yCab + 0.18, 0]}>
        <sphereGeometry args={[0.030, 12, 8]} />
        <meshStandardMaterial color="#3a2a08" emissive="#e8a722" emissiveIntensity={0.05} />
      </mesh>
      {/* nameplate */}
      <mesh position={[yDoor + 0.004, yCab + 0.78, 0]}>
        <planeGeometry args={[0.18, D * 0.55]} />
        <meshStandardMaterial color="#0e1014" roughness={0.5} metalness={0.3} />
      </mesh>
      <Billboard>
      <Text position={[yDoor + 0.013, yCab + 0.78, 0]} fontSize={0.060} color="#e8c627" anchorX="center" anchorY="middle">
        BYPASS
      </Text>
      </Billboard>
      <Billboard>
      <Text position={[yDoor + 0.013, yCab + 0.71, 0]} fontSize={0.045} color="#dadcde" anchorX="center" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
      <Billboard>
      <Text position={[yDoor + 0.013, yCab + 0.40, 0.10]} fontSize={0.034} color="#dadcde" anchorX="left" anchorY="middle">
        DRIVE / OFF / BYPASS
      </Text>
      </Billboard>
      {/* top conduit hub linking back to the VFD */}
      <mesh position={[0, H + 0.04, -D * 0.32]}>
        <cylinderGeometry args={[0.045, 0.045, 0.080, 12]} />
        <meshStandardMaterial color="#7a7e84" roughness={0.5} metalness={0.55} />
      </mesh>
    </group>
  );
}

function SlimVfdWallMount({
  position,
  rotation = [0, 0, 0],
  tag,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag: string;
}) {
  return (
    <group name={`electrical:${tag}`} position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.22, 1.85, 1.15]} />
        <meshStandardMaterial color="#6a6e74" roughness={0.48} metalness={0.42} />
      </mesh>
      <mesh position={[0.12, 0.35, 0]}>
        <planeGeometry args={[0.72, 0.52]} />
        <meshStandardMaterial color="#1a1c20" roughness={0.55} metalness={0.2} />
      </mesh>
      <mesh position={[0.12, -0.55, 0.52]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.14, 12]} />
        <meshStandardMaterial color="#b01010" roughness={0.35} metalness={0.5} />
      </mesh>
      <Billboard>
      <Text position={[0.12, 0.95, 0]} fontSize={0.09} color="#e8c627" anchorX="center" anchorY="middle">
        VFD
      </Text>
      </Billboard>
      <Billboard>
      <Text position={[0.12, -0.95, 0]} fontSize={0.07} color="#ddd" anchorX="center" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
    </group>
  );
}

function DisconnectSwitch({
  position,
  rotation = [0, 0, 0],
  tag,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag: string;
}) {
  return (
    <group name={`electrical:DS-${tag}`} position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.35, 0.55, 0.18]} />
        <meshStandardMaterial color="#5c6068" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.12, 10]} />
        <meshStandardMaterial color="#c01818" roughness={0.4} metalness={0.45} />
      </mesh>
      <Billboard>
      <Text position={[0, -0.38, 0.1]} fontSize={0.055} color="#111" anchorX="center" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
    </group>
  );
}

function PadMountTransformer({ position }: { position: [number, number, number] }) {
  return (
    <group name="electrical:XFMR-MAIN" position={position}>
      <mesh receiveShadow castShadow position={[0, 0.55, 0]}>
        <boxGeometry args={[1.8, 1.1, 2.2]} />
        <meshStandardMaterial color="#4a5a38" roughness={0.65} metalness={0.25} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[1.85, 0.14, 2.25]} />
        <meshStandardMaterial color="#3a4530" roughness={0.7} metalness={0.2} />
      </mesh>
      {[-0.55, 0.55].map((dx) => (
        <mesh key={dx} position={[dx, 0.4, 1.12]}>
          <cylinderGeometry args={[0.14, 0.12, 0.35, 10]} />
          <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.55} />
        </mesh>
      ))}
      <Billboard>
      <Text position={[0, 1.45, 0]} fontSize={0.11} color="#dde8cc" anchorX="center" anchorY="middle">
        480V SERVICE
      </Text>
      </Billboard>
    </group>
  );
}

/**
 * 5-gallon bypass pot feeder for cooling-tower (CWR) chemical treatment.
 *
 * Real installation:
 *   • CWR water taps off the riser, drops down to the pot bottom inlet,
 *     dissolves the slug-fed chemical inside the vessel, exits the top
 *     outlet, and rejoins the CWR riser downstream.
 *   • Two isolation gates (CHM-IN / CHM-OUT) on the bypass branch and
 *     a bypass gate (CHM-BYP) on the CWR riser between the taps. The
 *     bypass gate is normally OPEN; closing it forces all CWR flow
 *     through the pot when batching chemical.
 *   • Top fill funnel with hinged cap + handle for slug-feeding solid
 *     or liquid product, vent valve, and a 2.5" pressure gauge to verify
 *     CWR pressure is present before opening the cap.
 *   • Bottom drain valve with hose bib for emptying the vessel.
 *   • Side sight-glass column to verify liquid level.
 *   • Spill-containment pallet (EPA SPCC) under the pot, sized for 110%
 *     of vessel volume.
 *
 * Origin = base of the pot at floor level (slab line, Y = 0).
 */
function ChemicalPotFeeder({ position }: { position: [number, number, number] }) {
  /* Vessel dimensions — ~40-gal bypass pot feeder sized for 1,500–2,500 ton CDW loop, ~0.48 m dia × 0.82 m tall */
  const vesselR = 0.24;        // body radius
  const vesselH = 0.82;        // body height (cylindrical section)
  const skirtH = 0.08;         // welded leg skirt
  const yBase = skirtH;        // bottom of cylindrical body
  const yTop = yBase + vesselH;
  const yMid = yBase + vesselH * 0.5;
  /* Pallet (EPA spill containment) — square pan with a low curb, sized >110% of ~40-gal vessel */
  const pallW = 1.00;
  const pallD = 0.82;
  const pallCurb = 0.10;
  return (
    <group name="chemical:POT-CT" position={position}>
      {/* ── Spill-containment pallet (EPA SPCC, sized to >110% of pot volume) ── */}
      <mesh position={[0, 0.005, 0]}>
        <boxGeometry args={[pallW, 0.01, pallD]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* curbs around the pallet */}
      {[
        { p: [0, pallCurb / 2, pallD / 2 - 0.018], s: [pallW, pallCurb, 0.036] },
        { p: [0, pallCurb / 2, -pallD / 2 + 0.018], s: [pallW, pallCurb, 0.036] },
        { p: [pallW / 2 - 0.018, pallCurb / 2, 0], s: [0.036, pallCurb, pallD] },
        { p: [-pallW / 2 + 0.018, pallCurb / 2, 0], s: [0.036, pallCurb, pallD] },
      ].map((b, i) => (
        <mesh key={`curb-${i}`} position={b.p as [number, number, number]}>
          <boxGeometry args={b.s as [number, number, number]} />
          <meshStandardMaterial color="#ca8a04" roughness={0.75} metalness={0.1} />
        </mesh>
      ))}
      {/* ── Welded support skirt (legs / pad) ── */}
      <mesh position={[0, skirtH / 2 + pallCurb * 0.5, 0]}>
        <cylinderGeometry args={[vesselR * 1.05, vesselR * 1.20, skirtH, 14]} />
        <meshStandardMaterial color="#52525b" roughness={0.55} metalness={0.55} />
      </mesh>
      {/* ── Vessel body — orange (chemical service) cylindrical pot ── */}
      <mesh position={[0, yMid + pallCurb * 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[vesselR, vesselR, vesselH, 20]} />
        <meshStandardMaterial color="#d96818" roughness={0.55} metalness={0.25} />
      </mesh>
      {/* welded girth band (visual weld seam) */}
      <mesh position={[0, yMid + pallCurb * 0.5, 0]}>
        <torusGeometry args={[vesselR + 0.002, 0.005, 6, 24]} />
        <meshStandardMaterial color="#9a4912" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* ── Hemispherical top head ── */}
      <mesh
        position={[0, yTop + pallCurb * 0.5, 0]}
        rotation={[0, 0, 0]}
      >
        <sphereGeometry args={[vesselR, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d96818" roughness={0.55} metalness={0.25} />
      </mesh>
      {/* ── Top fill funnel + hinged cap with operator handle ── */}
      <group position={[0, yTop + pallCurb * 0.5 + vesselR * 0.55, 0]}>
        {/* funnel throat */}
        <mesh>
          <cylinderGeometry args={[0.06, 0.085, 0.10, 14]} />
          <meshStandardMaterial color="#e8c627" roughness={0.55} metalness={0.4} />
        </mesh>
        {/* hinged cap (sits slightly tilted to read as openable) */}
        <mesh position={[0, 0.06, 0]} rotation={[0.18, 0, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.022, 14]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.5} metalness={0.55} />
        </mesh>
        {/* hinge boss */}
        <mesh position={[0, 0.062, -0.07]}>
          <cylinderGeometry args={[0.012, 0.012, 0.045, 8]} />
          <meshStandardMaterial color="#71717a" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* T-handle on cap for tool-free opening */}
        <mesh position={[0, 0.10, 0.04]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[0.14, 0.018, 0.018]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.4} />
        </mesh>
      </group>
      {/* ── 2.5" liquid-filled pressure gauge on top dome ── */}
      <group position={[vesselR * 0.55, yTop + pallCurb * 0.5 + 0.02, vesselR * 0.55]}>
        <mesh>
          <cylinderGeometry args={[0.014, 0.014, 0.05, 8]} />
          <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.022, 16]} />
          <meshStandardMaterial color="#e7e7e7" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.062, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.003, 16]} />
          <meshStandardMaterial color="#fafafa" roughness={0.45} metalness={0.05} />
        </mesh>
      </group>
      {/* ── Top vent ball-cock (opens to vent the pot before slug-feeding) ── */}
      <group position={[-vesselR * 0.55, yTop + pallCurb * 0.5 + 0.04, -vesselR * 0.55]}>
        <mesh>
          <cylinderGeometry args={[0.014, 0.014, 0.06, 8]} />
          <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.05, 0.040, 0.05]} />
          <meshStandardMaterial color="#a48238" roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0.06, 0.06, 0]}>
          <boxGeometry args={[0.10, 0.012, 0.012]} />
          <meshStandardMaterial color={HANDWHEEL_RED} roughness={0.5} metalness={0.5} />
        </mesh>
      </group>
      {/* ── Sight-glass column (front face) so operator sees liquid level ── */}
      <group position={[vesselR + 0.018, yMid + pallCurb * 0.5, 0]}>
        {/* upper isolation cock */}
        <mesh position={[0, vesselH * 0.30, 0]}>
          <boxGeometry args={[0.045, 0.035, 0.045]} />
          <meshStandardMaterial color="#a48238" roughness={0.4} metalness={0.85} />
        </mesh>
        {/* lower isolation cock */}
        <mesh position={[0, -vesselH * 0.30, 0]}>
          <boxGeometry args={[0.045, 0.035, 0.045]} />
          <meshStandardMaterial color="#a48238" roughness={0.4} metalness={0.85} />
        </mesh>
        {/* glass tube between cocks (translucent) */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.011, 0.011, vesselH * 0.55, 10]} />
          <meshStandardMaterial
            color="#bae6fd"
            roughness={0.18}
            metalness={0.05}
            transparent
            opacity={0.55}
          />
        </mesh>
        {/* protective stainless guard rods */}
        {[-0.018, 0.018].map((dz, i) => (
          <mesh key={`gd-${i}`} position={[0, 0, dz]}>
            <cylinderGeometry args={[0.0035, 0.0035, vesselH * 0.55, 6]} />
            <meshStandardMaterial color="#a1a1aa" roughness={0.4} metalness={0.85} />
          </mesh>
        ))}
      </group>
      {/* ── Bottom drain ball-cock with hose-bib (empties the vessel) ── */}
      <group position={[0, pallCurb * 0.5 + 0.02, vesselR + 0.05]}>
        <mesh>
          <cylinderGeometry args={[0.018, 0.018, 0.06, 8]} />
          <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.06, 0.05, 0.05]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.05, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.10, 0.012, 0.012]} />
          <meshStandardMaterial color={HANDWHEEL_RED} roughness={0.5} metalness={0.5} />
        </mesh>
        {/* hose-bib spout */}
        <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.022, 0.024, 0.045, 8]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
        </mesh>
      </group>
      {/* ── Inlet / outlet bypass connections ── */}
      {/* INLET (bottom side) — water in from CWR riser */}
      <mesh position={[-vesselR - 0.06, yBase + pallCurb * 0.5 + 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.030, 0.030, 0.12, 10]} />
        <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* OUTLET (top side) — water out to CWR riser downstream */}
      <mesh position={[-vesselR - 0.06, yTop + pallCurb * 0.5 - 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.030, 0.030, 0.12, 10]} />
        <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* ── ASME / manufacturer nameplate on +Z face ── */}
      <mesh position={[0, yMid + pallCurb * 0.5 - 0.05, vesselR + 0.001]}>
        <planeGeometry args={[0.18, 0.10]} />
        <meshStandardMaterial color="#fafafa" roughness={0.55} metalness={0.15} />
      </mesh>
      <Billboard position={[0, yMid + pallCurb * 0.5 - 0.04, vesselR + 0.005]}>
        <Text fontSize={0.022} color="#0a0a0a" anchorX="center" anchorY="middle">
          POT-CT
        </Text>
        <Text position={[0, -0.030, 0]} fontSize={0.014} color="#0a0a0a" anchorX="center" anchorY="middle">
          BYPASS POT FEEDER · 5 GAL · ASME
        </Text>
      </Billboard>
      {/* ── Service label (chemical color code) ── */}
      <Billboard position={[0, yTop + pallCurb * 0.5 + 0.34, 0]}>
        <Text fontSize={0.075} color="#0a0a0a" anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#fff7ed">
          POT FEEDER · CWR
        </Text>
      </Billboard>
    </group>
  );
}

/**
 * Liquid chemical day-tanks + diaphragm metering pumps.
 *
 * Real installations dose biocide and corrosion inhibitor continuously into
 * the recirculating cooling water (not just slug-fed via the pot). Two HDPE
 * drum-style day tanks sit on a bunded pallet next to the pot feeder. Each
 * tank carries its own diaphragm metering pump (LMI / ProMinent class) on
 * top with stroke-length adjustment knob and a foot-valve / tube assembly
 * dipping into the chemical.
 */
function ChemicalDayTanks({ position }: { position: [number, number, number] }) {
  const tankR = 0.16;
  const tankH = 0.62;
  const yBase = 0.10;          // sits on a 100 mm pallet
  const yMid = yBase + tankH * 0.5;
  const yTop = yBase + tankH;
  const tanks: Array<{ x: number; color: string; label: string; tagL2: string }> = [
    { x: -0.22, color: '#0e7490', label: 'BIOCIDE',   tagL2: 'OXIDIZER · NaOCl' },
    { x: 0.22,  color: '#7e22ce', label: 'INHIBITOR', tagL2: 'CORR / SCALE' },
  ];
  return (
    <group name="chemical:DAY-TANKS" position={position}>
      {/* shared bunded pallet */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[0.95, 0.10, 0.45]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* curbs */}
      {[
        { p: [0, 0.13, 0.21], s: [0.95, 0.06, 0.030] },
        { p: [0, 0.13, -0.21], s: [0.95, 0.06, 0.030] },
        { p: [0.475, 0.13, 0], s: [0.030, 0.06, 0.45] },
        { p: [-0.475, 0.13, 0], s: [0.030, 0.06, 0.45] },
      ].map((b, i) => (
        <mesh key={`dtcurb-${i}`} position={b.p as [number, number, number]}>
          <boxGeometry args={b.s as [number, number, number]} />
          <meshStandardMaterial color="#ca8a04" roughness={0.75} metalness={0.1} />
        </mesh>
      ))}
      {tanks.map((t) => (
        <group key={t.label} position={[t.x, 0, 0]}>
          {/* HDPE drum body (translucent so chemical level reads visually) */}
          <mesh position={[0, yMid, 0]} castShadow>
            <cylinderGeometry args={[tankR, tankR, tankH, 18]} />
            <meshStandardMaterial color={t.color} roughness={0.55} metalness={0.05} transparent opacity={0.78} />
          </mesh>
          {/* visible chemical liquid level (~ 70%) */}
          <mesh position={[0, yBase + tankH * 0.34, 0]}>
            <cylinderGeometry args={[tankR * 0.97, tankR * 0.97, tankH * 0.66, 18]} />
            <meshStandardMaterial color={t.color} roughness={0.4} metalness={0.05} transparent opacity={0.50} />
          </mesh>
          {/* Top closure plate */}
          <mesh position={[0, yTop, 0]}>
            <cylinderGeometry args={[tankR * 1.04, tankR * 1.04, 0.022, 18]} />
            <meshStandardMaterial color="#3f3f46" roughness={0.55} metalness={0.45} />
          </mesh>
          {/* ── Diaphragm metering pump on top of tank ── */}
          <group position={[0, yTop + 0.01, 0]}>
            {/* base flange */}
            <mesh position={[0, 0.025, 0]}>
              <cylinderGeometry args={[0.07, 0.075, 0.05, 14]} />
              <meshStandardMaterial color="#52525b" roughness={0.55} metalness={0.55} />
            </mesh>
            {/* pump body (head + drive) */}
            <mesh position={[0, 0.115, 0]}>
              <boxGeometry args={[0.13, 0.13, 0.18]} />
              <meshStandardMaterial color="#1e3a8a" roughness={0.5} metalness={0.45} />
            </mesh>
            {/* stroke-length adjustment knob (yellow) */}
            <mesh position={[0.072, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.027, 0.027, 0.030, 14]} />
              <meshStandardMaterial color="#facc15" roughness={0.5} metalness={0.4} />
            </mesh>
            {/* discharge head (white plastic) */}
            <mesh position={[0, 0.17, 0.10]}>
              <boxGeometry args={[0.05, 0.05, 0.06]} />
              <meshStandardMaterial color="#fafafa" roughness={0.45} metalness={0.1} />
            </mesh>
            {/* discharge tubing rising up to chemical-feed line */}
            <mesh position={[0, 0.30, 0.10]}>
              <cylinderGeometry args={[0.006, 0.006, 0.22, 6]} />
              <meshStandardMaterial color="#fde68a" roughness={0.5} metalness={0.05} />
            </mesh>
            {/* status LED */}
            <mesh position={[0.045, 0.075, 0.066]}>
              <sphereGeometry args={[0.008, 8, 6]} />
              <meshStandardMaterial color="#22c55e" emissive="#16a34a" emissiveIntensity={0.6} toneMapped={false} />
            </mesh>
          </group>
          {/* Foot-valve / suction tube dipping inside the tank */}
          <mesh position={[0, yBase + 0.02, 0]}>
            <cylinderGeometry args={[0.0045, 0.0045, tankH * 0.95, 6]} />
            <meshStandardMaterial color="#e7e5e4" roughness={0.4} metalness={0.1} />
          </mesh>
          {/* Side label */}
          <Billboard position={[0, yMid, tankR + 0.01]}>
            <Text fontSize={0.045} color="#fafafa" anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#0a0a0a">
              {t.label}
            </Text>
            <Text position={[0, -0.060, 0]} fontSize={0.022} color="#fef3c7" anchorX="center" anchorY="middle">
              {t.tagL2}
            </Text>
          </Billboard>
        </group>
      ))}
      {/* Group label */}
      <Billboard position={[0, yTop + 0.45, 0]}>
        <Text fontSize={0.060} color="#0a0a0a" anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#fff7ed">
          DAY TANKS · CHEM METERING
        </Text>
      </Billboard>
    </group>
  );
}

/**
 * Conductivity-controlled blowdown for cooling-tower TDS management.
 *
 * Real practice: a conductivity probe sits in the CWR line; the controller
 * compares µS/cm vs. setpoint and opens a normally-closed solenoid bleed
 * valve when TDS rises above target (typically ~3,000–5,000 µS/cm). Bleed
 * water dumps to a roof drain. This is the single most important chemical-
 * treatment instrument because it controls cycles of concentration.
 *
 * Origin = the controller wall enclosure; probe + bleed are placed at the
 * caller-supplied probeWorld / bleedWorld positions.
 */
function ConductivityControlAndBleed({
  controllerPosition,
  probePosition,
  bleedPosition,
}: {
  controllerPosition: [number, number, number];
  probePosition: [number, number, number];
  bleedPosition: [number, number, number];
}) {
  return (
    <group name="chemical:CONDUCTIVITY-CTRL">
      {/* ── Wall-mount conductivity controller ── */}
      <group position={controllerPosition}>
        <mesh>
          <boxGeometry args={[0.30, 0.34, 0.10]} />
          <meshStandardMaterial color="#fafafa" roughness={0.55} metalness={0.18} />
        </mesh>
        {/* digital display */}
        <mesh position={[0, 0.05, 0.051]}>
          <boxGeometry args={[0.20, 0.10, 0.005]} />
          <meshStandardMaterial color="#0a0a0a" emissive="#16a34a" emissiveIntensity={0.18} toneMapped={false} />
        </mesh>
        {/* keypad buttons */}
        {[-0.08, -0.04, 0, 0.04, 0.08].map((dx, i) => (
          <mesh key={`kp-${i}`} position={[dx, -0.07, 0.051]}>
            <cylinderGeometry args={[0.012, 0.012, 0.005, 12]} />
            <meshStandardMaterial color="#3f3f46" roughness={0.55} metalness={0.4} />
          </mesh>
        ))}
        <Billboard position={[0, 0.20, 0]}>
          <Text fontSize={0.030} color="#0a0a0a" anchorX="center" anchorY="middle">
            CONDUCTIVITY · TDS
          </Text>
          <Text position={[0, -0.040, 0]} fontSize={0.020} color="#dc2626" anchorX="center" anchorY="middle">
            COND-CT-1
          </Text>
        </Billboard>
        {/* signal cable exiting the bottom */}
        <mesh position={[0.10, -0.18, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.06, 6]} />
          <meshStandardMaterial color="#2563eb" roughness={0.55} metalness={0.25} />
        </mesh>
      </group>
      {/* ── Conductivity probe inserted into CWR (or basin) ── */}
      <group position={probePosition}>
        {/* weld-o-let saddle on pipe */}
        <mesh>
          <cylinderGeometry args={[0.026, 0.030, 0.06, 10]} />
          <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
        </mesh>
        {/* compression-fit body */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.07, 10]} />
          <meshStandardMaterial color="#52525b" roughness={0.5} metalness={0.65} />
        </mesh>
        {/* probe head with cable gland (orange to read as instrument cable) */}
        <mesh position={[0, 0.13, 0]}>
          <boxGeometry args={[0.06, 0.05, 0.06]} />
          <meshStandardMaterial color="#fafafa" roughness={0.55} metalness={0.2} />
        </mesh>
        <Billboard position={[0, 0.22, 0]}>
          <Text fontSize={0.050} color="#0a0a0a" anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#fff7ed">
            CT-PROBE
          </Text>
        </Billboard>
      </group>
      {/* ── Solenoid bleed valve discharging to roof drain ── */}
      <group position={bleedPosition}>
        {/* tee on CWR (saddle) */}
        <mesh>
          <cylinderGeometry args={[0.030, 0.034, 0.07, 10]} />
          <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
        </mesh>
        {/* solenoid body (red coil, brass body) */}
        <mesh position={[0, 0.10, 0]}>
          <boxGeometry args={[0.10, 0.08, 0.08]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.075, 10]} />
          <meshStandardMaterial color="#b91c1c" roughness={0.45} metalness={0.55} />
        </mesh>
        {/* signal cable from controller (analog blue) */}
        <mesh position={[0.05, 0.22, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.04, 6]} />
          <meshStandardMaterial color="#2563eb" roughness={0.55} metalness={0.25} />
        </mesh>
        {/* bleed discharge nipple to floor / roof drain */}
        <mesh position={[0, -0.13, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.18, 8]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.55} metalness={0.4} />
        </mesh>
        <Billboard position={[0, 0.28, 0]}>
          <Text fontSize={0.050} color="#0a0a0a" anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#fff7ed">
            BLOWDOWN · SV-CT
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

/**
 * 2-gallon shot feeder for the closed CHILLED-WATER (CHR) loop.
 *
 * Real installation:
 *   • Smaller orange ASME pressure pot mounted on a wall bracket near the
 *     CHR header (closed loops only need slug feeding once per quarter, so
 *     a continuous metering pump isn't required here).
 *   • Tap from CHR drops down to the pot bottom inlet through CHM-CHR-IN
 *     gate, water flows up through the pot dissolving the slug, and exits
 *     through CHM-CHR-OUT gate back into CHR a short distance downstream.
 *   • Top fill cap with hinged lid for slug-feeding solid product.
 *   • Top vent ball-cock to relieve pressure before opening the cap.
 *   • Bottom drain ball-cock with hose-bib for emptying.
 *   • Wall mount bracket — origin = bottom of vessel skirt.
 */
function ShotFeederCHR({
  position,
  hostPipeRadius = MAIN_R,
}: {
  position: [number, number, number];
  hostPipeRadius?: number;
}) {
  const vesselR = 0.18;        // ~12-gal shot feeder sized for closed CHW loop
  const vesselH = 0.55;
  const yBase = 0.04;          // skirt
  const yTop = yBase + vesselH;
  const yMid = yBase + vesselH * 0.5;
  /* Branch pipes between CHR header (above) and the pot (below)
     — branch radius is small (3/4" Sch 40 ≈ 0.013 m) */
  const branchR = 0.022;
  /* Caller positions the feeder just below the CHR header so the inlet/
     outlet drop straight up to taps spaced 0.5 m apart. */
  return (
    <group name="chemical:SHOT-CHR" position={position}>
      {/* Wall bracket (steel angle, painted gray) */}
      <mesh position={[-vesselR - 0.06, yMid, 0]}>
        <boxGeometry args={[0.04, vesselH, 0.16]} />
        <meshStandardMaterial color="#52525b" roughness={0.55} metalness={0.55} />
      </mesh>
      {[-vesselH * 0.32, vesselH * 0.32].map((dy, i) => (
        <mesh key={`bs-${i}`} position={[-vesselR * 0.5, yMid + dy, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, vesselR + 0.06, 8]} />
          <meshStandardMaterial color="#71717a" roughness={0.55} metalness={0.55} />
        </mesh>
      ))}
      {/* ── Pot body (ASME pressure pot, orange chemical service) ── */}
      <mesh position={[0, yMid, 0]} castShadow>
        <cylinderGeometry args={[vesselR, vesselR, vesselH, 18]} />
        <meshStandardMaterial color="#d96818" roughness={0.55} metalness={0.25} />
      </mesh>
      {/* Hemispherical heads (top + bottom) for ASME pressure rating */}
      <mesh position={[0, yTop, 0]}>
        <sphereGeometry args={[vesselR, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d96818" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0, yBase, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[vesselR, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d96818" roughness={0.55} metalness={0.25} />
      </mesh>
      {/* ── Top fill cap with hinge + handle ── */}
      <group position={[0, yTop + vesselR * 0.42, 0]}>
        <mesh>
          <cylinderGeometry args={[0.045, 0.06, 0.06, 12]} />
          <meshStandardMaterial color="#e8c627" roughness={0.55} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.045, 0]} rotation={[0.18, 0, 0]}>
          <cylinderGeometry args={[0.058, 0.058, 0.018, 14]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.5} metalness={0.55} />
        </mesh>
        <mesh position={[0, 0.07, 0.025]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[0.10, 0.014, 0.014]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.4} />
        </mesh>
      </group>
      {/* ── Top vent ball-cock ── */}
      <group position={[vesselR * 0.55, yTop + 0.04, 0]}>
        <mesh>
          <cylinderGeometry args={[0.011, 0.011, 0.045, 8]} />
          <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0.045, 0]}>
          <boxGeometry args={[0.045, 0.035, 0.045]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0.05, 0.045, 0]}>
          <boxGeometry args={[0.085, 0.011, 0.011]} />
          <meshStandardMaterial color={HANDWHEEL_RED} roughness={0.5} metalness={0.5} />
        </mesh>
      </group>
      {/* ── Inlet branch on +Z (rises from CHR header above) ── */}
      <group position={[0, yBase + 0.04, vesselR + 0.03]}>
        {/* short stub off pot bottom */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[branchR, branchR, 0.06, 10]} />
          <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* CHM-CHR-IN gate (manual, normally open during shot-feed cycle) */}
        <GateValve
          position={[0, 0.16, 0]}
          pipeRadius={branchR}
          bodyColor="#d96818"
          handwheelColor="#cc2222"
        />
        {/* riser up to the CHR header tap */}
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[branchR, branchR, 0.40, 10]} />
          <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.4} />
        </mesh>
        {/* CHR weld-o-let saddle (host pipe radius defines the seat) */}
        <mesh position={[0, 0.60, 0]}>
          <cylinderGeometry args={[branchR * 1.6, branchR * 1.4, 0.05, 10]} />
          <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.7} />
        </mesh>
      </group>
      {/* ── Outlet branch on −Z (back into CHR header upstream of inlet) ── */}
      <group position={[0, yTop - 0.05, -vesselR - 0.03]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[branchR, branchR, 0.06, 10]} />
          <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.4} />
        </mesh>
        <GateValve
          position={[0, 0.13, 0]}
          pipeRadius={branchR}
          bodyColor="#d96818"
          handwheelColor="#cc2222"
        />
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[branchR, branchR, 0.36, 10]} />
          <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[branchR * 1.6, branchR * 1.4, 0.05, 10]} />
          <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.7} />
        </mesh>
      </group>
      {/* ── Bottom drain ball-cock with hose bib ── */}
      <group position={[0, yBase - 0.04, vesselR + 0.04]}>
        <mesh>
          <cylinderGeometry args={[0.014, 0.014, 0.05, 8]} />
          <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
        </mesh>
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0.05, -0.06, 0]}>
          <boxGeometry args={[0.085, 0.011, 0.011]} />
          <meshStandardMaterial color={HANDWHEEL_RED} roughness={0.5} metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.13, 0]}>
          <cylinderGeometry args={[0.020, 0.022, 0.040, 8]} />
          <meshStandardMaterial color={BRASS} roughness={0.4} metalness={0.85} />
        </mesh>
      </group>
      {/* mark the host pipe radius so future iterations can re-derive saddles */}
      <mesh visible={false} position={[0, 0, 0]}>
        <sphereGeometry args={[hostPipeRadius * 0.001, 4, 4]} />
      </mesh>
      {/* Service nameplate */}
      <Billboard position={[0, yMid, vesselR + 0.01]}>
        <Text fontSize={0.040} color="#fafafa" anchorX="center" anchorY="middle" outlineWidth={0.003} outlineColor="#0a0a0a">
          SHOT-CHR
        </Text>
        <Text position={[0, -0.050, 0]} fontSize={0.020} color="#fef3c7" anchorX="center" anchorY="middle">
          2-GAL ASME
        </Text>
      </Billboard>
      <Billboard position={[0, yTop + 0.30, 0]}>
        <Text fontSize={0.060} color="#0a0a0a" anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#fff7ed">
          SHOT FEEDER · CHR
        </Text>
      </Billboard>
    </group>
  );
}

/** Rooftop makeup: building edge → RPZ → PRV → air gap above tower basin. */
function MakeupWaterRooftop() {
  const x0 = -32;
  const x1 = TOWER_X - 3.2;
  const mid = (x0 + x1) / 2;
  const basinWorldY = 14.68 + -1.7;
  return (
    <group name="makeup:rooftop-loop">
      <mesh position={[mid, ROOF_Y, TOWER_Z + 3.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.055, Math.abs(x1 - x0), 10]} />
        <meshStandardMaterial color="#f2f4f7" roughness={0.35} metalness={0.15} />
      </mesh>
      <RpzAssembly position={[x0 + 2.2, ROOF_Y, TOWER_Z + 3.8]} />
      {/* pid `pressure_regulation` — PRV station immediately downstream of RPZ
         (city pressure → 50 psig house pressure). Spring-bell housing on top. */}
      <PressureReducingValve
        position={[x0 + 3.5, ROOF_Y, TOWER_Z + 3.8]}
        pipeRadius={0.055}
        tag="PRV-MU"
      />
      <GlobeValve position={[x0 + 4.7, ROOF_Y, TOWER_Z + 3.8]} rotation={[0, 0, Math.PI / 2]} pipeRadius={0.055} bodyColor="#e8ecf0" handwheelColor="#d4a017" />
      <mesh position={[TOWER_X - 1.1, ROOF_Y + 0.85, TOWER_Z + 0.2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.5, 10]} />
        <meshStandardMaterial color="#f2f4f7" roughness={0.35} metalness={0.12} />
      </mesh>
      <mesh position={[TOWER_X - 1.1, basinWorldY + 0.55, TOWER_Z + 0.2]}>
        <cylinderGeometry args={[0.08, 0.1, 0.06, 12]} />
        <meshStandardMaterial color="#6a90b0" roughness={0.25} metalness={0.35} transparent opacity={0.85} />
      </mesh>
      <Billboard>
      <Text position={[TOWER_X - 1.1, basinWorldY + 0.95, TOWER_Z + 0.2]} fontSize={0.08} color="#0a4a0a" anchorX="center" anchorY="middle">
        AIR GAP
      </Text>
      </Billboard>
      {/* pid `makeup_water_loop` — float-operated level control valve at basin water surface */}
      <FloatLevelControlValve
        position={[TOWER_X - 1.1, basinWorldY + 0.18, TOWER_Z + 0.2]}
        tag="LC-CT"
      />
      <IsaInstrumentBubble
        position={[TOWER_X - 1.1, basinWorldY + 0.55, TOWER_Z - 0.65]}
        type="LC"
        loop="CT-BASIN"
      />
      <Billboard>
      <Text position={[mid, ROOF_Y + 0.35, TOWER_Z + 3.8]} fontSize={0.1} color="#0a4a0a" anchorX="center" anchorY="middle">
        MAKEUP (DOMESTIC)
      </Text>
      </Billboard>
      <mesh position={[TOWER_X + 1.8, ROOF_Y, TOWER_Z - 2.4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 3.2, 8]} />
        <meshStandardMaterial color="#8a8d92" roughness={0.6} metalness={0.35} />
      </mesh>
      <GateValve
        position={[TOWER_X + 3.4, ROOF_Y, TOWER_Z - 2.4]}
        rotation={[0, Math.PI / 2, 0]}
        pipeRadius={0.05}
        bodyColor="#8a8d92"
        valveId="pipe_gate_tower_overflow"
      />
      <Billboard>
      <Text position={[TOWER_X + 2.2, ROOF_Y + 0.25, TOWER_Z - 2.4]} fontSize={0.07} color="#111" anchorX="center" anchorY="middle">
        OVERFLOW / ROOF DRAIN
      </Text>
      </Billboard>
    </group>
  );
}

/**
 * Pid `chemical_treatment` — "Chemical feed line with isolation valves,
 * check valve, and injection quill into cooling tower basin or CWR line."
 *
 * Layout along the CWR riser at engine-room ceiling level:
 *   pot-feeder discharge → upstream gate (CHM-A) → check valve → downstream
 *   gate (CHM-B) → orange chemical-feed line → corp-stop quill into CWR.
 * Valve handles are red per pid color_coding (isolation = red).
 */
/**
 * Continuous orange chemical-feed line from the engine-room pot-feeder
 * (and metering-pump day tanks) up through a ceiling penetration sleeve,
 * across the ceiling at the back wall, then east along the rooftop to the
 * injection quill on the CWR header.
 *
 * Path (world coordinates) — segment list passed to the polyline helper:
 *   pot outlet  → vertical riser  → ceiling penetration  → horizontal run
 *   (through 90° elbow at +Z)     → continue east in +X   → drop to header
 *   → into corp-stop / quill on CWR.
 *
 * Inline equipment along the path (in the direction of flow):
 *   ① pot-side isolation gate          (CHM-IN  — closes off pot for service)
 *   ② chemical-feed pressure gauge     (PG-CF — reads pot discharge head)
 *   ③ swing-check valve                (CHK-CF — prevents CWR back-flow)
 *   ④ ceiling penetration / wall sleeve
 *   ⑤ quill-side isolation gate        (CHM-OUT — isolates quill for removal)
 *   ⑥ corp-stop ball + lance into CWR  (INJ-CWR)
 *
 * Pipe colour is orange (#d96818) with black "CHEM" labels per pid
 * `color_coding_standards_2026.pipes.chemical_feed`.
 */
function ChemicalFeedRunSegment({
  from,
  to,
  radius = 0.022,
  color = '#d96818',
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius?: number;
  color?: string;
}) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  if (len < 0.005) return null;
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <mesh position={[mid.x, mid.y, mid.z]} rotation={[e.x, e.y, e.z]}>
      <cylinderGeometry args={[radius, radius, len, 12]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.25} />
    </mesh>
  );
}

function InjectionQuillToCWR() {
  const r = 0.022;             // 3/4" Sch 40 chemical-feed pipe radius
  /* Pot-feeder world position is [5.5, 0, -3.8] (set in the parent scene)
     and its OUTLET stub exits the back-side at [-vesselR-0.06, ~0.65, 0]
     local → world (5.26, 0.65, -3.8). Day-tank metering-pump discharges
     also tee into this riser via small tubing at the same elevation. */
  const xRiser = 5.26;
  const zRiser = -3.80;
  const yPotOut = 0.85;        // pot outlet (top stub) world Y
  const yCeil = 11.85;         // just below the rooftop slab (slab at 12.05)
  const yRoof = ROOF_Y;        // 12.38 — chemical line elevation on rooftop
  const xQuill = 12.0;
  const zQuill = CW_ZR;        // 6.75
  /* Y of the gate just above the pot — must clear the pot top dome */
  const yGate1 = 1.55;
  /* Inline pressure gauge sits between gate1 and the check valve */
  const yPg = 2.15;
  /* Check valve at the bottom of the riser to prevent CWR pressure
     from siphoning into the pot when isolation gate is opened */
  const yChk = 2.85;
  /* Quill-side isolation just before the corp-stop */
  const xGate2 = xQuill - 0.55;
  return (
    <group name="chemical:injection-CWR">
      {/* ── ① pot-side isolation gate (lance is vertical → rotate gate so its
            bore is vertical: pipe normally runs +X, here +Y, so rotate +Z by
            90°). */}
      <GateValve
        position={[xRiser, yGate1, zRiser]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={r}
        bodyColor="#d96818"
        handwheelColor="#cc2222"
        valveId="chem_gate_pot_side"
      />
      {/* short pipe pot-outlet → gate1 */}
      <ChemicalFeedRunSegment from={[xRiser, yPotOut, zRiser]} to={[xRiser, yGate1 - 0.34, zRiser]} radius={r} />
      {/* ── ② small chemical-feed pressure gauge (reads pot discharge head) */}
      <group position={[xRiser, yPg, zRiser]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, r + 0.05]}>
          <cylinderGeometry args={[0.045, 0.045, 0.022, 16]} />
          <meshStandardMaterial color="#fafafa" roughness={0.45} metalness={0.18} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, r + 0.062]}>
          <cylinderGeometry args={[0.040, 0.040, 0.003, 16]} />
          <meshStandardMaterial color="#fff7ed" roughness={0.5} metalness={0.05} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, r + 0.025]}>
          <cylinderGeometry args={[0.012, 0.012, 0.05, 8]} />
          <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.85} />
        </mesh>
      </group>
      {/* short pipe gate1 → gauge → check */}
      <ChemicalFeedRunSegment from={[xRiser, yGate1 + 0.34, zRiser]} to={[xRiser, yChk - 0.20, zRiser]} radius={r} />
      {/* ── ③ swing-check valve (vertical, flow upward) */}
      <CheckValve
        position={[xRiser, yChk, zRiser]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={r}
        bodyColor="#d96818"
      />
      {/* riser from check up to ceiling penetration sleeve */}
      <ChemicalFeedRunSegment from={[xRiser, yChk + 0.20, zRiser]} to={[xRiser, yCeil, zRiser]} radius={r} />
      {/* ── ④ ceiling penetration sleeve (gray steel sleeve through slab) */}
      <mesh position={[xRiser, 12.06, zRiser]}>
        <cylinderGeometry args={[r * 1.85, r * 1.85, 0.22, 14]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* short stub through ceiling */}
      <ChemicalFeedRunSegment from={[xRiser, yCeil, zRiser]} to={[xRiser, yRoof, zRiser]} radius={r} />
      {/* 90° elbow on the rooftop turning from +Y to +Z */}
      <mesh position={[xRiser, yRoof, zRiser + 0.05]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.05, r, 8, 14, Math.PI / 2]} />
        <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* horizontal +Z run from over the pot to the CWR alignment */}
      <ChemicalFeedRunSegment from={[xRiser, yRoof, zRiser + 0.05]} to={[xRiser, yRoof, zQuill - 0.05]} radius={r} />
      {/* 90° elbow at zQuill turning from +Z to +X */}
      <mesh position={[xRiser + 0.05, yRoof, zQuill]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, r, 8, 14, Math.PI / 2]} />
        <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* horizontal +X run east toward the quill area */}
      <ChemicalFeedRunSegment from={[xRiser + 0.05, yRoof, zQuill]} to={[xGate2 - 0.34, yRoof, zQuill]} radius={r} />
      {/* ── ⑤ quill-side isolation gate (in-service quill removal) */}
      <GateValve
        position={[xGate2, yRoof, zQuill]}
        rotation={[0, 0, 0]}
        pipeRadius={r}
        bodyColor="#d96818"
        handwheelColor="#cc2222"
        valveId="chem_gate_quill_side"
      />
      {/* short pipe gate2 → quill saddle */}
      <ChemicalFeedRunSegment from={[xGate2 + 0.34, yRoof, zQuill]} to={[xQuill, yRoof, zQuill]} radius={r} />
      {/* ── ⑥ injection quill — corp-stop + lance into CWR centerline */}
      <ChemInjectionQuill
        position={[xQuill, yRoof, zQuill]}
        mainRadius={MAIN_R}
        tag="INJ-CWR"
      />
      {/* ── Service labels (pid color_coding_standards_2026.pipes.chemical_feed) */}
      <Billboard position={[xRiser - 0.18, (yChk + yCeil) / 2, zRiser]}>
        <Text fontSize={0.08} color="#0a0a0a" anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#fff7ed">
          CHEM
        </Text>
        <Text position={[0, -0.10, 0]} fontSize={0.045} color="#0a0a0a" anchorX="center" anchorY="middle">
          → CWR
        </Text>
      </Billboard>
      <Billboard position={[(xRiser + xQuill) / 2, yRoof + 0.30, zQuill]}>
        <Text fontSize={0.075} color="#0a0a0a" anchorX="center" anchorY="middle" outlineWidth={0.004} outlineColor="#fff7ed">
          CHEM INJECT → CWR
        </Text>
      </Billboard>
    </group>
  );
}

function ExpansionTankWithLegs({ position }: { position: [number, number, number] }) {
  return (
    <group name="hydronic:EXP-TANK-CHR" position={position}>
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.75, 0.75, 2.2, 20]} />
        <meshStandardMaterial color="#c4c6ca" roughness={0.48} metalness={0.35} />
      </mesh>
      <mesh position={[0, -0.55, 0.95]}>
        <boxGeometry args={[0.2, 1.05, 0.2]} />
        <meshStandardMaterial color="#555" roughness={0.65} metalness={0.5} />
      </mesh>
      <mesh position={[0, -0.55, -0.95]}>
        <boxGeometry args={[0.2, 1.05, 0.2]} />
        <meshStandardMaterial color="#555" roughness={0.65} metalness={0.5} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-1.15, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.4, 10]} />
        <meshStandardMaterial color="#7a6e4e" roughness={0.55} metalness={0.4} />
      </mesh>
      <PressureReliefValve position={[-0.2, 0.95, 0]} tag="PSV-EXP" />
      <Billboard>
      <Text position={[0, 1.05, 0]} fontSize={0.1} color="#222" anchorX="center" anchorY="middle">
        BLADDER / CHR
      </Text>
      </Billboard>
    </group>
  );
}

function ChillerHxAirVents() {
  return (
    <group name="chiller:air-vents-hx">
      <AirVent position={[-2.1, 2.35, -4.5]} rotation={[0, Math.PI / 2, 0]} pipeRadius={0.12} />
      <AirVent position={[0.35, 2.1, 4.55]} rotation={[0, Math.PI / 2, 0]} pipeRadius={0.12} />
      <PressureReliefValve position={[0.5, 2.45, 4.85]} rotation={[0, Math.PI / 2, 0]} tag="PSV-COND" />
    </group>
  );
}

function ChillerPetcocksAndDrains() {
  return (
    <group name="chiller:petcocks-drains">
      {[
        [-2.4, 1.85, -4.2],
        [0.5, 1.85, 4.2],
        [-1.8, 0.9, -3.9],
      ].map((p, i) => (
        <mesh key={i} name={`chiller:petcock-${i + 1}`} position={p as [number, number, number]}>
          <sphereGeometry args={[0.045, 10, 10]} />
          <meshStandardMaterial color="#b87333" roughness={0.35} metalness={0.85} />
        </mesh>
      ))}
      <DrainValve
        position={[-2.15, 0.85, -4.55]}
        rotation={[Math.PI / 2, 0, 0]}
        pipeRadius={0.12}
        valveId="pipe_drain_evap_low"
      />
      <DrainValve
        position={[0.4, 0.85, 4.75]}
        rotation={[Math.PI / 2, 0, 0]}
        pipeRadius={0.12}
        valveId="pipe_drain_cond_low"
      />
    </group>
  );
}

/**
 * BMS / BAS controller panel (pid `electrical_system` — control-system
 * destination for analog/digital wiring routed back from FT/TT/PT/PDI/LC
 * field instruments). Wall-mounted NEMA-12 enclosure with HMI screen,
 * RUN/COMM/ALM LEDs, and an antenna for cellular/wireless telemetry.
 */
function BmsControlPanel({
  position,
  rotation = [0, 0, 0],
  tag = 'BMS-1',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag?: string;
}) {
  return (
    <group name={`electrical:${tag}`} position={position} rotation={rotation}>
      {/* Wall-mount enclosure (door faces +X locally) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.95, 0.78]} />
        <meshStandardMaterial color="#5e6268" roughness={0.5} metalness={0.42} />
      </mesh>
      {/* Door panel */}
      <mesh position={[0.092, 0, 0]}>
        <planeGeometry args={[0.74, 0.91]} />
        <meshStandardMaterial color="#52565c" roughness={0.55} metalness={0.45} />
      </mesh>
      {/* HMI touchscreen (color, glowing) */}
      <mesh position={[0.094, 0.08, 0]}>
        <boxGeometry args={[0.005, 0.46, 0.62]} />
        <meshStandardMaterial color="#08141e" roughness={0.4} metalness={0.2} emissive="#0c4a6e" emissiveIntensity={0.18} />
      </mesh>
      {/* HMI bezel highlight */}
      <mesh position={[0.0945, 0.08, 0]}>
        <boxGeometry args={[0.001, 0.42, 0.58]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={0.05} />
      </mesh>
      {/* RUN / COMM / ALARM LEDs (column) */}
      {[
        { y: -0.22, color: '#22c55e', emissive: '#16a34a', label: 'RUN' },
        { y: -0.30, color: '#3b82f6', emissive: '#2563eb', label: 'COMM' },
        { y: -0.38, color: '#1f1212', emissive: '#dc2626', label: 'ALM' },
      ].map((p, i) => (
        <mesh key={i} position={[0.094, p.y, -0.32]}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshStandardMaterial color={p.color} emissive={p.emissive} emissiveIntensity={i === 2 ? 0.04 : 0.45} toneMapped={false} />
        </mesh>
      ))}
      {/* Manufacturer / tag nameplate */}
      <mesh position={[0.0935, 0.41, 0]}>
        <planeGeometry args={[0.66, 0.10]} />
        <meshStandardMaterial color="#0e1014" roughness={0.5} metalness={0.3} />
      </mesh>
      <Billboard>
      <Text position={[0.095, 0.41, 0]} fontSize={0.060} color="#e8c627" anchorX="center" anchorY="middle">
        BMS / BAS
      </Text>
      </Billboard>
      <Billboard>
      <Text position={[0.095, 0.345, 0]} fontSize={0.045} color="#dadcde" anchorX="center" anchorY="middle">
        {tag}
      </Text>
      </Billboard>
      {/* Antenna for cellular telemetry */}
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.006, 0.006, 0.30, 6]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <sphereGeometry args={[0.014, 8, 6]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Cable entry hub at bottom */}
      <mesh position={[0, -0.50, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.06, 14]} />
        <meshStandardMaterial color="#7a7e84" roughness={0.5} metalness={0.55} />
      </mesh>
    </group>
  );
}

/**
 * Open-bottom ladder cable tray run for control wiring (pid
 * `electrical_system` — "Power and control wiring runs clearly routed
 * along walls/ceiling/trays"). Renders two side rails + evenly-spaced
 * rungs along an arbitrary 2-point segment (assumed horizontal along X
 * or Z).
 */
function CableTray({
  from,
  to,
  width = 0.30,
  depth = 0.07,
}: {
  from: [number, number, number];
  to: [number, number, number];
  width?: number;
  depth?: number;
}) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a).normalize();
  /* Yaw the tray so the long axis matches dir; assume nearly horizontal */
  const yaw = Math.atan2(dir.x, dir.z);
  const railOffsetX = width / 2;
  const rungSpacing = 0.30;
  const rungCount = Math.max(2, Math.floor(len / rungSpacing));
  const rails = [-railOffsetX, railOffsetX];
  return (
    <group name="electrical:control-tray" position={[mid.x, mid.y, mid.z]} rotation={[0, yaw, 0]}>
      {/* side rails (steel C-channel) */}
      {rails.map((rx, ri) => (
        <mesh key={`rail-${ri}`} position={[rx, 0, 0]}>
          <boxGeometry args={[0.018, depth, len]} />
          <meshStandardMaterial color="#7a8088" roughness={0.55} metalness={0.55} />
        </mesh>
      ))}
      {/* rungs (every 300 mm) */}
      {Array.from({ length: rungCount + 1 }).map((_, i) => {
        const t = i / rungCount;
        const z = -len / 2 + t * len;
        return (
          <mesh key={`rung-${i}`} position={[0, -depth * 0.35, z]}>
            <boxGeometry args={[width - 0.018, 0.012, 0.020]} />
            <meshStandardMaterial color="#7a8088" roughness={0.55} metalness={0.55} />
          </mesh>
        );
      })}
    </group>
  );
}

/**
 * Polyline tube for a single control-cable run. Pid color_coding_standards_2026:
 *   control_wiring: Blue for analog, Black for digital.
 * Defaults to a thin analog-blue tube — pass `signal="digital"` for black.
 */
function ControlCable({
  path,
  signal = 'analog',
  radius = 0.012,
}: {
  path: Array<[number, number, number]>;
  signal?: 'analog' | 'digital';
  radius?: number;
}) {
  const color = signal === 'analog' ? '#2563eb' : '#0a0a0a';
  const segs: JSX.Element[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = new THREE.Vector3(...path[i]);
    const b = new THREE.Vector3(...path[i + 1]);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    if (len < 0.005) continue;
    const dir = b.clone().sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    segs.push(
      <mesh key={i} position={[mid.x, mid.y, mid.z]} rotation={[e.x, e.y, e.z]}>
        <cylinderGeometry args={[radius, radius, len, 6]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.25} />
      </mesh>,
    );
  }
  return <group name={`control:cable-${signal}`}>{segs}</group>;
}

function MotorFeederConduit({ path }: { path: Array<[number, number, number]> }) {
  const segs: JSX.Element[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = new THREE.Vector3(...path[i]);
    const b = new THREE.Vector3(...path[i + 1]);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    const dir = b.clone().sub(a).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    segs.push(
      <mesh
        key={i}
        name={`electrical:conduit-seg-${i}`}
        position={[mid.x, mid.y, mid.z]}
        rotation={[e.x, e.y, e.z]}
      >
        <cylinderGeometry args={[0.04, 0.04, len, 8]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.75} metalness={0.25} />
      </mesh>,
    );
  }
  return <group name="electrical:motor-feeders">{segs}</group>;
}

/**
 * Automatic air vents at the highest point of every vertical riser on the
 * rooftop per pid `air_management`.  Each riser top is at ROOF_Y (engine-room
 * ceiling penetration sleeve top) on the rooftop side.
 *
 * Riser world-X/Z values are kept in sync with App.tsx barrel-head nozzles:
 *   CWS  (X= 0.0,  Z= 5.6)   dark-green condenser supply
 *   CWR  (X= 0.55, Z= 6.75)  light-green condenser return
 *   CHS  (X≈+1.2,  Z=-9.5)   dark-blue chilled supply (CHWP discharge riser)
 *   CHR  (X≈-5.6,  Z=-9.5)   light-blue chilled return (CHWP suction riser)
 *   AHU coil: top supply/return headers sit at ROOF_Y on the AHU east face.
 */
function RooftopRiserAirVents() {
  /* Compute CHWP riser world positions from the layout (same math as App.tsx) */
  const chwLay = computeAssemblyLayout('chw');
  /* CHWP suction riser (CHR) world X/Z */
  const chrRiserX = CHWP_ORIGIN[0] + chwLay.xRiser;
  const chrRiserZ = CHWP_ORIGIN[2];
  /* CHWP discharge riser (CHS) world X/Z */
  const chsRiserX = CHWP_ORIGIN[0] + chwLay.xDischargeRiserX;
  const chsRiserZ = CHWP_ORIGIN[2];

  /* All vents are placed just above the roof sleeve (ROOF_Y + 0.25) so they
     sit visibly proud of the roof deck.  AirVent default axis is +Y (rising
     discharge pipe), which is correct for the riser-top position. */
  const ventY = ROOF_Y + 0.25;
  const vR = 0.055; /* small vent body, 2" max per standard detail */

  return (
    <group name="air-management:rooftop-riser-vents">
      {/* CWS riser top — dark-green condenser supply */}
      <AirVent
        name="vent:CWS-RISER-TOP"
        position={[CW_XS, ventY, CW_ZS]}
        pipeRadius={vR}
      />
      {/* CWR riser top — light-green condenser return */}
      <AirVent
        name="vent:CWR-RISER-TOP"
        position={[CW_XR, ventY, CW_ZR]}
        pipeRadius={vR}
      />
      {/* CHS riser top — dark-blue chilled supply */}
      <AirVent
        name="vent:CHS-RISER-TOP"
        position={[chsRiserX, ventY, chsRiserZ]}
        pipeRadius={vR}
      />
      {/* CHR riser top — light-blue chilled return */}
      <AirVent
        name="vent:CHR-RISER-TOP"
        position={[chrRiserX, ventY, chrRiserZ]}
        pipeRadius={vR}
      />
      {/* AHU coil top — supply and return header high points
          AHU is centered at X=-22; the coil supply header exits at ~X=-14.75.
          Top of coil box is at ROOF_Y + ~3.5 m (AHU height).  The two vent
          positions match the coil header center-lines in App.tsx RooftopAHU. */}
      <AirVent
        name="vent:AHU-COIL-SUP-TOP"
        position={[-14.85, ROOF_Y + 3.55, CHW_ZS]}
        pipeRadius={vR}
      />
      <AirVent
        name="vent:AHU-COIL-RET-TOP"
        position={[-14.85, ROOF_Y + 3.55, CHW_ZR]}
        pipeRadius={vR}
      />
    </group>
  );
}

/**
 * Pete's-plug / Schrader test ports on the main header runs and at the AHU
 * coil connection per pid `pressure_test_ports`.
 *
 * Per spec: "across strainers, and at AHU coil" — the pump-assembly
 * strainer ports are already rendered inside PumpAssemblies.tsx.  This
 * function adds the remaining header-run ports.
 *
 * Positions are on the low-level CHW headers (Y=1.10) and on the rooftop
 * AHU coil stub (ROOF_Y).  TestPort axis is +Y (upward pointing nub).
 */
function HeaderAndAhuTestPorts() {
  const hY = HDR_Y;
  /* CHW supply header — two ports bracketing the FT-CHWS mag-meter at X=-12 */
  /* CHW return header — two ports spanning the header mid-run */
  /* AHU coil supply and return — at the stub tee on each riser */
  return (
    <group name="pressure-test:header-ahu-ports">
      {/* CHWS header — upstream of FT (X=-10.5) */}
      <TestPort
        name="test:CHWS-HDR-UP"
        position={[-10.5, hY, CHW_ZS]}
        pipeRadius={MAIN_R}
      />
      {/* CHWS header — downstream of FT (X=-13.5) */}
      <TestPort
        name="test:CHWS-HDR-DN"
        position={[-13.5, hY, CHW_ZS]}
        pipeRadius={MAIN_R}
      />
      {/* CHWR header — upstream of PDI-YST-CHW (X=-7.5) */}
      <TestPort
        name="test:CHWR-HDR-UP"
        position={[-7.5, hY, CHW_ZR]}
        pipeRadius={MAIN_R}
      />
      {/* CHWR header — downstream (X=-10.0) */}
      <TestPort
        name="test:CHWR-HDR-DN"
        position={[-10.0, hY, CHW_ZR]}
        pipeRadius={MAIN_R}
      />
      {/* AHU coil supply stub (rooftop riser top, before coil entry) */}
      <TestPort
        name="test:AHU-COIL-SUP"
        position={[-14.85, ROOF_Y + 0.55, CHW_ZS]}
        pipeRadius={MAIN_R * 0.65}
      />
      {/* AHU coil return stub (rooftop riser top, after coil exit) */}
      <TestPort
        name="test:AHU-COIL-RET"
        position={[-14.85, ROOF_Y + 0.55, CHW_ZR]}
        pipeRadius={MAIN_R * 0.65}
      />
    </group>
  );
}

/**
 * Animated pipe-flow chevrons on the horizontal bridge spools that connect
 * pumps to the main CWS riser per pid `animation` — "Water flow animation
 * in pipes (color-coded)".
 *
 * PipeFlowMarkers supports horizontal runs (axis: 'x' | 'z') only.
 * App.tsx already covers the CHW low-level headers and the rooftop CWS/CWR
 * horizontal runs.  This component adds the remaining horizontal spools that
 * are rendered inside PidPlantSystems:
 *
 *   • CDWP discharge bridge spool (−Z at bridge height) — CWS dark green
 *   • CDWP suction ceiling spool (−Z from pump riser to CWS riser) — CWS
 *   • CHWP suction drop spool (+Z from pump riser down to CHR header) — CHR
 *   • CHWP discharge cross spool (+Z from riser to CHWS header) — CHS
 *
 * ASHRAE 2026 colors:
 *   CWS dark green #1f5a3a  CWR light green #7ec07a
 *   CHS dark blue  #2c4a72  CHR light blue  #4a8ab8
 */
function PlantFlowMarkers({
  cdwFlowing,
  chwFlowing,
}: {
  cdwFlowing: boolean;
  chwFlowing: boolean;
}) {
  const cdwLay = computeAssemblyLayout('cdw');
  const chwLay = computeAssemblyLayout('chw');

  const BR_FM = 0.22;  // must match BR in PumpHydraulicTieIns
  const ER_FM = BR_FM * PUMP_ELBOW_R_FACTOR;  // 0.22 × 4.5 = 0.99 m — matches ElbowAt arc radius
  /* Tee-side reach: bridge spools terminate on the saddle stub on the
     riser/header (MAIN_PIPE_RADIUS + saddle stub length). Must mirror
     TEE_BRANCH_OFFSET in PumpHydraulicTieIns. */
  const TEE_OFFSET_FM = 0.22 + 0.18;  // 0.40 m

  /* ── CDWP suction ceiling bridge — −Z leg at PUMP_CEILING_Y ──
     Runs from elbow exit at (CW_XS, CY, sucRZ − ER) to the tee saddle on
     the CWS riser at (CW_XS, CY, CW_ZS + TEE_OFFSET). */
  const sucRZ_FM  = CDWP_ORIGIN[2];   // 9.0
  const ceilZfrom = sucRZ_FM - ER_FM;
  const ceilZto   = CW_ZS + TEE_OFFSET_FM;
  const cdwCeilZlen  = Math.max(0.1, ceilZfrom - ceilZto);
  const cdwCeilZctr  = (ceilZfrom + ceilZto) / 2;

  /* ── CDWP discharge bridge — horizontal −Z spool at BRIDGE_Y (3.2 m) ──
     Runs from (disX, BRIDGE_Y, disZ − ER) to the tee saddle on the
     CWS riser at (disX, BRIDGE_Y, CW_ZS + TEE_OFFSET). */
  const cdwDisX_FM   = CDWP_ORIGIN[0] + cdwLay.xDischargeOut + 0.65;
  const disZ_FM      = CDWP_ORIGIN[2];  // 9.0
  const bridgeZfrom  = disZ_FM - ER_FM;
  const bridgeZto    = CW_ZS + TEE_OFFSET_FM;
  const bridgeZlen   = Math.max(0.1, bridgeZfrom - bridgeZto);
  const bridgeZctr   = (bridgeZfrom + bridgeZto) / 2;

  /* ── CHWP suction ceiling bridge — +Z spool at PUMP_CEILING_Y ──
     Routes OVER the pump from the suction-riser top at
     (chwSucX, CY, −9.5) north to (chwSucX, CY, CHW_ZR), where it
     turns down to the CHR header. (See PumpHydraulicTieIns:
     "tie:CHWP-suction-bridge" for the full path.) */
  const chwSucRiserWorldX = CHWP_ORIGIN[0] + chwLay.xRiser;
  const chwSucZ_FM   = CHWP_ORIGIN[2];  // −9.5
  const chwSucZfrom  = chwSucZ_FM + ER_FM;
  const chwSucZto    = CHW_ZR - ER_FM;
  const chwSucZlen   = Math.max(0.1, chwSucZto - chwSucZfrom);
  const chwSucZctr   = (chwSucZfrom + chwSucZto) / 2;

  /* ── CHWP discharge ceiling bridge — −X then +Z spools at PUMP_CEILING_Y ──
     Routes OVER the pump from the discharge-riser top at
     (chwDisX, CY, −9.5) west to (xHdr, CY, −9.5), then north to
     (xHdr, CY, CHW_ZS), where it drops to the CHWS header.
     (See PumpHydraulicTieIns: "tie:CHWP-discharge-bridge".) */
  const xHdr_FM      = -1.984;
  const chwDisX_FM   = CHWP_ORIGIN[0] + chwLay.xDischargeRiserX;
  const chwDisZ_FM   = CHWP_ORIGIN[2];  // −9.5

  /* −X leg over the pump, at PUMP_CEILING_Y, z=chwDisZ */
  const chwDisXfrom  = chwDisX_FM - ER_FM;     // east end (near pump riser)
  const chwDisXto    = xHdr_FM + ER_FM;        // west end (above header column)
  const chwDisXlen   = Math.max(0.1, chwDisXfrom - chwDisXto);
  const chwDisXctr   = (chwDisXfrom + chwDisXto) / 2;

  /* +Z leg from above pump column to above CHWS header, at x=xHdr */
  const chwDisZfrom  = chwDisZ_FM + ER_FM;
  const chwDisZto    = CHW_ZS - ER_FM;
  const chwDisZlen   = Math.max(0.1, chwDisZto - chwDisZfrom);
  const chwDisZctr   = (chwDisZfrom + chwDisZto) / 2;

  return (
    <group name="flow-markers:plant">
      {/* CDWP suction ceiling bridge — −Z leg at PUMP_CEILING_Y, X=0 */}
      <PipeFlowMarkers
        name="flow:CWS-ceil-bridge"
        center={[CW_XS, PUMP_CEILING_Y, cdwCeilZctr]}
        length={cdwCeilZlen}
        pipeRadius={0.22}
        color={PUMP_COLOR.CWS}
        flowing={cdwFlowing}
        axis="z"
        direction={-1}
        speed={1.2}
        spacing={1.6}
      />
      {/* CDWP discharge bridge — horizontal −Z spool at BRIDGE_Y */}
      <PipeFlowMarkers
        name="flow:CWS-discharge-bridge"
        center={[cdwDisX_FM, 3.2, bridgeZctr]}
        length={bridgeZlen}
        pipeRadius={0.22}
        color={PUMP_COLOR.CWS}
        flowing={cdwFlowing}
        axis="z"
        direction={-1}
        speed={1.2}
        spacing={1.6}
      />
      {/* CHWP suction ceiling bridge — +Z spool at PUMP_CEILING_Y, x=chwSucX.
          Return water (CHR) flows FROM the AHU header TOWARD the pump,
          which on this segment is the −Z direction (from the header at
          z≈−6.7 toward the pump at z=−9.5). */}
      <PipeFlowMarkers
        name="flow:CHR-suction-ceil-bridge"
        center={[chwSucRiserWorldX, PUMP_CEILING_Y, chwSucZctr]}
        length={chwSucZlen}
        pipeRadius={0.22}
        color={PUMP_COLOR.CHR}
        flowing={chwFlowing}
        axis="z"
        direction={-1}
        speed={1.2}
        spacing={1.6}
      />
      {/* CHWP discharge ceiling bridge — −X spool at PUMP_CEILING_Y, z=chwDisZ.
          Supply water (CHS) flows FROM the pump discharge riser TOWARD
          the header tee at xHdr, i.e., in the −X direction. */}
      <PipeFlowMarkers
        name="flow:CHS-discharge-ceil-bridge-x"
        center={[chwDisXctr, PUMP_CEILING_Y, chwDisZ_FM]}
        length={chwDisXlen}
        pipeRadius={0.22}
        color={PUMP_COLOR.CHS}
        flowing={chwFlowing}
        axis="x"
        direction={-1}
        speed={1.2}
        spacing={1.6}
      />
      {/* CHWP discharge ceiling bridge — +Z spool at PUMP_CEILING_Y, x=xHdr.
          Continues from the −X leg over to the CHWS header column,
          flowing +Z from above the pump (z=−9.5) to above the header
          (z=CHW_ZS≈−5.5). */}
      <PipeFlowMarkers
        name="flow:CHS-discharge-ceil-bridge-z"
        center={[xHdr_FM, PUMP_CEILING_Y, chwDisZctr]}
        length={chwDisZlen}
        pipeRadius={0.22}
        color={PUMP_COLOR.CHS}
        flowing={chwFlowing}
        axis="z"
        direction={1}
        speed={1.2}
        spacing={1.6}
      />
    </group>
  );
}

/**
 * PID-aligned add-ons: pumps, makeup, chemical, expansion, electrical, extra instruments.
 * Parent: EngineRoom world group (same origin as chiller at [0,0,0]).
 */
export interface PidPlantSystemsProps {
  /* CDWP VFD zoom */
  cdwpVfdZoomed?: boolean;
  onCdwpVfdZoom?: () => void;
  cdwpVfdScreenAnchorRef?: MutableRefObject<THREE.Group | null>;
  cdwpVfdOccluderRef?: MutableRefObject<THREE.Mesh | null>;
  /* CHWP VFD zoom */
  chwpVfdZoomed?: boolean;
  onChwpVfdZoom?: () => void;
  chwpVfdScreenAnchorRef?: MutableRefObject<THREE.Group | null>;
  chwpVfdOccluderRef?: MutableRefObject<THREE.Mesh | null>;
}

export function PidPlantSystems({
  cdwpVfdZoomed,
  onCdwpVfdZoom,
  cdwpVfdScreenAnchorRef,
  cdwpVfdOccluderRef,
  chwpVfdZoomed,
  onChwpVfdZoom,
  chwpVfdScreenAnchorRef,
  chwpVfdOccluderRef,
}: PidPlantSystemsProps = {}) {
  /* Pump-running flag is the master loop flag — pumps spin whenever the
     loop is energised, even if a user happens to close one isolation
     valve while the pump is running (which would dead-head the pump in
     real life). */
  const cdwFlow = useSimulationStore((s) => s.state.condenserWaterFlowing);
  const chwFlow = useSimulationStore((s) => s.state.evaporatorWaterFlowing);
  /* Animated-arrow flag: master AND every isolation valve along the
     hydraulic path open. Closing any one of them drops these to false
     and instantly hides the chevrons everywhere on that loop. */
  const cdwLoopFlowing = useCdwLoopFlowing();
  const chwLoopFlowing = useChwLoopFlowing();
  const layers = usePlantLayerStore((s) => s.layers);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────
          HYDRONICS — pumps, header tie-ins, expansion tank, chiller air
          vents and chiller petcocks (pid `pumps`, `air_management`,
          `pressure_regulation`).
         ───────────────────────────────────────────────────────────────── */}
      <group name="layer:hydronics" visible={layers.hydronics}>
        <CDWPPumpAssembly
          position={CDWP_ORIGIN}
          running={cdwFlow}
          tag="CDWP-1"
          suctionValveId="pipe_gate_cdwp_suction"
          dischargeValveId="pipe_gate_cdwp_discharge"
          drainValveId="pipe_drain_cdwp_low"
          vfdZoomed={cdwpVfdZoomed}
          onVfdZoom={onCdwpVfdZoom}
          vfdScreenAnchorRef={cdwpVfdScreenAnchorRef}
          vfdOccluderRef={cdwpVfdOccluderRef}
        />
        <CHWPPumpAssembly
          position={CHWP_ORIGIN}
          running={chwFlow}
          tag="CHWP-1"
          suctionValveId="pipe_gate_chwp_suction"
          dischargeValveId="pipe_gate_chwp_discharge"
          drainValveId="pipe_drain_chwp_low"
          vfdZoomed={chwpVfdZoomed}
          onVfdZoom={onChwpVfdZoom}
          vfdScreenAnchorRef={chwpVfdScreenAnchorRef}
          vfdOccluderRef={chwpVfdOccluderRef}
        />
        <PumpHydraulicTieIns />
        <ExpansionTankWithLegs position={[-26, 0, CHW_ZR]} />
        {/* Bladder-tank tie-in pipe: CHR header → bottom of expansion tank */}
        <mesh rotation={[0, 0, Math.PI / 2]} position={[-14, HDR_Y + 0.12, CHW_ZR]}>
          <cylinderGeometry args={[0.07, 0.07, 11.5, 12]} />
          <meshStandardMaterial color="#7a6e4e" roughness={0.55} metalness={0.42} />
        </mesh>
        <ChillerHxAirVents />
        {/* pid `air_management` — auto vents at highest point of every rooftop riser */}
        <RooftopRiserAirVents />
        {/* pid `animation` — animated flow chevrons on vertical risers and
            CDWP discharge bridge spool (CHW low-level headers are in App.tsx) */}
        <PlantFlowMarkers cdwFlowing={cdwLoopFlowing} chwFlowing={chwLoopFlowing} />
      </group>

      {/* ─────────────────────────────────────────────────────────────────
          MAKEUP + CHEMICAL TREATMENT (pid `makeup_water_loop` and
          `chemical_treatment`).

          Engine-room chemical layout (looking down, +X right, +Z front):
            • Pot-feeder       at [ 5.5, 0, -3.80]  — bypass slug pot
            • Day tanks        at [ 3.9, 0, -3.80]  — biocide + inhibitor
                                                      drums w/ metering pumps
            • Conductivity ctl at [ 3.50, 1.55, -3.65] — back wall
            • Conductivity probe + bleed valve on the engine-room CWR riser
              (CW_XR, *, CW_ZR) — bleed discharges to engine-room floor
              drain (per most municipal codes; roof drains are not rated for
              continuous chemical discharge).
            • Shot feeder      at [-11.2, HDR_Y + 0.35, CHW_ZR]
                              (mounted on the CHR header for closed-loop dosing)
         ───────────────────────────────────────────────────────────────── */}
      <group name="layer:makeup-chemical" visible={layers.makeupChemical}>
        <MakeupWaterRooftop />
        <InjectionQuillToCWR />
        <ChemicalPotFeeder position={[5.5, 0, -3.8]} />
        <ChemicalDayTanks position={[3.9, 0, -3.8]} />
        <ConductivityControlAndBleed
          controllerPosition={[3.50, 1.55, -3.65]}
          probePosition={[CW_XR + MAIN_R, 1.85, CW_ZR]}
          bleedPosition={[CW_XR + MAIN_R, 0.55, CW_ZR]}
        />
        <ShotFeederCHR position={[-11.2, HDR_Y + 0.35, CHW_ZR]} hostPipeRadius={MAIN_R} />
      </group>

      {/* ─────────────────────────────────────────────────────────────────
          PRESSURE TEST PORTS on main headers + AHU coil stubs
          (pid `pressure_test_ports`: "across strainers, and at AHU coil").
          Pump-assembly strainer test ports are in PumpAssemblies.tsx.
         ───────────────────────────────────────────────────────────────── */}
      <group name="layer:instrumentation" visible={layers.instrumentation}>
        <HeaderAndAhuTestPorts />
        <FlowTransmitterMagMeter position={[-12, HDR_Y, CHW_ZS]} tag="FT-CHWS" />
        <FlowTransmitterMagMeter position={[CW_XS, 7.2, CW_ZS]} rotation={[0, 0, Math.PI / 2]} tag="FT-CWS" />
        <DifferentialPressureCell
          position={[
            CDWP_ORIGIN[0] + 0.15,
            pumpShaftCenterlineY(PUMP_PIPE_R, 'cdw') + 0.55,
            CDWP_ORIGIN[2] + 0.55,
          ]}
          tag="PDI-CDWP"
        />
        <DifferentialPressureCell
          position={[
            CHWP_ORIGIN[0] - 0.25,
            pumpShaftCenterlineY(PUMP_PIPE_R, 'chw') + 0.55,
            CHWP_ORIGIN[2] + 0.55,
          ]}
          tag="PDI-CHWP"
        />
        <DifferentialPressureCell position={[CW_XR, 7.4, CW_ZR]} rotation={[0, 0, Math.PI / 2]} tag="PDI-YST-CDW" />
        <DifferentialPressureCell position={[-8.8, HDR_Y + 0.2, CHW_ZR]} tag="PDI-YST-CHW" />

        <IsaInstrumentBubble position={[-12, HDR_Y + 0.55, CHW_ZS]} type="TT" loop="CHWS" />
        <IsaInstrumentBubble position={[-12, HDR_Y - 0.55, CHW_ZS]} type="PT" loop="CHWS" />
        <IsaInstrumentBubble position={[-12, HDR_Y + 0.55, CHW_ZR]} type="TT" loop="CHWR" />
        <IsaInstrumentBubble position={[-12, HDR_Y - 0.55, CHW_ZR]} type="PT" loop="CHWR" />
        <IsaInstrumentBubble position={[CW_XS, 7.85, CW_ZS]} rotation={[0, 0, Math.PI / 2]} type="TT" loop="CWS" />
        <IsaInstrumentBubble position={[CW_XS, 6.55, CW_ZS]} rotation={[0, 0, Math.PI / 2]} type="PT" loop="CWS" />
        <IsaInstrumentBubble position={[CW_XR, 7.85, CW_ZR]} rotation={[0, 0, Math.PI / 2]} type="TT" loop="CWR" />
        <IsaInstrumentBubble position={[CW_XR, 6.55, CW_ZR]} rotation={[0, 0, Math.PI / 2]} type="PT" loop="CWR" />
      </group>

      {/* ─────────────────────────────────────────────────────────────────
          DRAINS (pid `drains` — low-point drain valves on chiller HX
          shells, AHU coil, pump assemblies, and CT basin overflow).
         ───────────────────────────────────────────────────────────────── */}
      <group name="layer:drains" visible={layers.drains}>
        <ChillerPetcocksAndDrains />
        <DrainValve
          valveId="pipe_drain_ahu_coil"
          position={[-15.5, ROOF_Y + 0.55, CHW_ZS]}
          rotation={[Math.PI / 2, 0, 0]}
          pipeRadius={MAIN_R * 0.55}
        />
        {/* pid `makeup_water_loop` — CT basin overflow/drain line with isolation
            valve routed to the rooftop roof-drain scupper.
            The overflow stub exits the basin south face (−Z side of the tower
            at TOWER_X≈25, TOWER_Z≈6.175) at basin water-surface elevation
            (ROOF_Y + ~0.55), runs south in −Z to the roof drain at Z≈3.0,
            then drops vertically to the roof-drain body at ROOF_Y. */}
        <group name="drain:CT-basin-overflow">
          {/* Horizontal overflow stub — exits basin south face, runs −Z to drain */}
          <ChemicalFeedRunSegment
            from={[TOWER_X - 0.5, ROOF_Y + 0.55, TOWER_Z - 1.6]}
            to={[TOWER_X - 0.5, ROOF_Y + 0.55, TOWER_Z - 4.8]}
            radius={0.048}
            color="#8a8d92"
          />
          {/* Isolation gate valve on the overflow line */}
          <GateValve
            valveId="pipe_gate_ct_overflow_drain"
            position={[TOWER_X - 0.5, ROOF_Y + 0.55, TOWER_Z - 3.0]}
            rotation={[0, Math.PI / 2, 0]}
            pipeRadius={0.048}
            bodyColor="#8a8d92"
          />
          {/* Vertical drop from horizontal overflow run to the roof-drain body */}
          <ChemicalFeedRunSegment
            from={[TOWER_X - 0.5, ROOF_Y + 0.55, TOWER_Z - 4.8]}
            to={[TOWER_X - 0.5, ROOF_Y + 0.06, TOWER_Z - 4.8]}
            radius={0.048}
            color="#8a8d92"
          />
          {/* Roof drain body (flat-top cast-iron, visible on the roof deck) */}
          <mesh
            name="drain:CT-OVERFLOW-ROOF-DRAIN"
            position={[TOWER_X - 0.5, ROOF_Y + 0.04, TOWER_Z - 4.8]}
          >
            <cylinderGeometry args={[0.12, 0.14, 0.08, 14]} />
            <meshStandardMaterial color="#5a5852" roughness={0.75} metalness={0.45} />
          </mesh>
          <mesh position={[TOWER_X - 0.5, ROOF_Y + 0.075, TOWER_Z - 4.8]}>
            <cylinderGeometry args={[0.11, 0.11, 0.01, 14]} />
            <meshStandardMaterial color="#3a3830" roughness={0.9} metalness={0.3} />
          </mesh>
          <Billboard>
            <Text
              position={[TOWER_X - 0.5, ROOF_Y + 0.38, TOWER_Z - 4.8]}
              fontSize={0.07}
              color="#5a5852"
              anchorX="center"
              anchorY="middle"
            >
              CT OVERFLOW → ROOF DRAIN
            </Text>
          </Billboard>
        </group>
      </group>

      {/* ─────────────────────────────────────────────────────────────────
          ELECTRICAL SYSTEM (pid `electrical_system` — transformer, main
          breaker, lockable disconnects, VFD bypasses, feeder conduits).
         ───────────────────────────────────────────────────────────────── */}
      <group name="layer:electrical" visible={layers.electrical}>
        <PadMountTransformer position={[32, 0, -26]} />
        <MainServiceBreaker position={[30.2, 0, -26]} />
        <DisconnectSwitch position={[30.2, 1.8, -26]} tag="MAIN" />
        <DisconnectSwitch position={[2.8, 2.6, -3.6]} tag="CHILLER" />
        <DisconnectSwitch position={[TOWER_X - 1.5, ROOF_Y + 1.2, TOWER_Z]} tag="CT-FAN" />
        <DisconnectSwitch position={[-15.5, ROOF_Y + 1.8, CHW_ZS + 0.5]} tag="AHU" />
        {/* NOTE: each pump assembly already renders its own free-standing VFD
            cabinet (see VfdWallEnclosure inside CDWPPumpAssembly / CHWPPumpAssembly).
            CDWP VFD is at +Z of pump (toward back wall); CHWP VFD is at −Z. */}
        <VfdBypassCabinet
          position={[CDWP_ORIGIN[0] + 0.075 + 1.05, 0, CDWP_ORIGIN[2] + 2.95]}
          rotation={[0, -Math.PI / 2, 0]}
          tag="CDWP-1"
        />
        <VfdBypassCabinet
          position={[CHWP_ORIGIN[0] + 0.07 + 1.05, 0, CHWP_ORIGIN[2] - 2.95]}
          rotation={[0, -Math.PI / 2, 0]}
          tag="CHWP-1"
        />
        <MotorFeederConduit
          path={[
            /* VFD top hub (CDWP origin + voluteX, ~2.10 m, +VFD_OFFSET_Z) */
            [CDWP_ORIGIN[0] + 0.075, 2.12, CDWP_ORIGIN[2] + 2.95],
            /* Up to ceiling tray */
            [CDWP_ORIGIN[0] + 0.075, 5.50, CDWP_ORIGIN[2] + 2.95],
            /* Across over the pump (toward -Z to come over the motor) */
            [CDWP_ORIGIN[0] + 0.075, 5.50, CDWP_ORIGIN[2] + 1.05],
            /* Down to the motor terminal box */
            [CDWP_ORIGIN[0] + 0.40, 1.13, CDWP_ORIGIN[2] + 1.05],
          ]}
        />
        <MotorFeederConduit
          path={[
            /* VFD top hub (CHWP origin + voluteX, ~2.10 m, -VFD_OFFSET_Z) */
            [CHWP_ORIGIN[0] + 0.07, 2.12, CHWP_ORIGIN[2] - 2.95],
            /* Up to ceiling tray */
            [CHWP_ORIGIN[0] + 0.07, 5.20, CHWP_ORIGIN[2] - 2.95],
            /* Across over the pump (toward +Z to come over the motor) */
            [CHWP_ORIGIN[0] + 0.07, 5.20, CHWP_ORIGIN[2] + 1.05],
            /* Down to the motor terminal box */
            [CHWP_ORIGIN[0] + 0.37, 1.13, CHWP_ORIGIN[2] + 1.05],
          ]}
        />

        {/* ─────────────────────────────────────────────────────────────
            BMS / control wiring (pid `electrical_system` — control runs
            along ceiling tray; pid color_coding_standards_2026 — analog
            wiring is blue). Wall-mount BMS panel near the chiller
            disconnect, ceiling tray runs west across the engine room,
            blue analog cables drop from the tray to each transmitter.
           ───────────────────────────────────────────────────────────── */}
        {(() => {
          /* Geometry constants for the control-wiring run */
          const TRAY_Y = 5.50;             // ceiling cable-tray elevation
          const TRAY_Z = -3.60;            // tray follows the back-wall line
          const BMS_X = 4.50;              // BMS panel X (next to chiller disconnect at 2.8)
          const BMS_Y = 1.45;              // BMS panel mount height (eye level)
          const TRAY_X_WEST = -22.0;       // tray runs west to AHU-side wall
          const TRAY_X_EAST = BMS_X + 0.4; // tray east end terminates above the BMS
          /* Drop-points along tray for branch cables */
          const dropAt = (x: number): [number, number, number] => [x, TRAY_Y, TRAY_Z];
          return (
            <group name="electrical:bms-loop">
              <BmsControlPanel position={[BMS_X, BMS_Y, TRAY_Z]} tag="BMS-1" />
              {/* Riser conduit BMS → ceiling tray */}
              <ControlCable
                signal="digital"
                path={[
                  [BMS_X, BMS_Y + 0.50, TRAY_Z],
                  [BMS_X, TRAY_Y - 0.07, TRAY_Z],
                ]}
                radius={0.018}
              />
              {/* Main ceiling cable tray (E-W along back wall) */}
              <CableTray
                from={[TRAY_X_EAST, TRAY_Y, TRAY_Z]}
                to={[TRAY_X_WEST, TRAY_Y, TRAY_Z]}
              />
              {/* ── Analog signal drops from tray to each transmitter ── */}
              {/* FT-CHWS at world [-12, HDR_Y, CHW_ZS] */}
              <ControlCable
                path={[
                  dropAt(-12),
                  [-12, HDR_Y + 0.7, TRAY_Z],
                  [-12, HDR_Y + 0.7, CHW_ZS],
                  [-12, HDR_Y + 0.20, CHW_ZS],
                ]}
              />
              {/* FT-CWS at world [CW_XS, 7.2, CW_ZS] (rooftop/upper riser) */}
              <ControlCable
                path={[
                  dropAt(CW_XS + 0.6),
                  [CW_XS + 0.6, 7.2, TRAY_Z],
                  [CW_XS + 0.6, 7.2, CW_ZS],
                  [CW_XS + 0.10, 7.2, CW_ZS],
                ]}
              />
              {/* PDI-CDWP near the CDWP volute */}
              <ControlCable
                path={[
                  dropAt(CDWP_ORIGIN[0] + 0.6),
                  [CDWP_ORIGIN[0] + 0.6, 2.2, TRAY_Z],
                  [CDWP_ORIGIN[0] + 0.6, 2.2, CDWP_ORIGIN[2] + 0.55],
                  [CDWP_ORIGIN[0] + 0.30, 1.85, CDWP_ORIGIN[2] + 0.55],
                ]}
              />
              {/* PDI-CHWP near the CHWP volute */}
              <ControlCable
                path={[
                  dropAt(CHWP_ORIGIN[0] + 0.6),
                  [CHWP_ORIGIN[0] + 0.6, 2.2, TRAY_Z],
                  [CHWP_ORIGIN[0] + 0.6, 2.2, CHWP_ORIGIN[2] + 0.55],
                  [CHWP_ORIGIN[0] - 0.10, 1.85, CHWP_ORIGIN[2] + 0.55],
                ]}
              />
              {/* PDI-YST-CHW (across CHWR strainer at -8.8, HDR_Y+0.2, CHW_ZR) */}
              <ControlCable
                path={[
                  dropAt(-8.8),
                  [-8.8, HDR_Y + 0.7, TRAY_Z],
                  [-8.8, HDR_Y + 0.7, CHW_ZR],
                  [-8.8, HDR_Y + 0.25, CHW_ZR],
                ]}
              />
              {/* TT/PT bubbles on CHWS/CHWR header at X=-12 (one shared drop) */}
              <ControlCable
                path={[
                  dropAt(-11.4),
                  [-11.4, HDR_Y + 0.7, TRAY_Z],
                  [-11.4, HDR_Y + 0.7, CHW_ZR],
                  [-11.4, HDR_Y + 0.55, CHW_ZR],
                ]}
              />
              {/* Chiller refrigerant-side panel link (digital Modbus to chiller PLC) */}
              <ControlCable
                signal="digital"
                path={[
                  dropAt(0.5),
                  [0.5, 2.6, TRAY_Z],
                  [0.5, 2.6, -1.5],
                ]}
              />
            </group>
          );
        })()}
      </group>
    </>
  );
}
