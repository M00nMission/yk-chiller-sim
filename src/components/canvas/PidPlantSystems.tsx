/**
 * YORK water-cooled plant add-ons per pid.json / must_install_components.
 * Layout constants mirror EngineRoom in App.tsx — keep in sync when moving equipment.
 */
import { type JSX } from 'react';
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
} from './PipingAccessories';

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

/** Chilled water headers (world). */
const CHW_ZS = -5.6;
const CHW_ZR = -6.75;
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

/* 90° elbow torus oriented to join two perpendicular pipe runs. The torus
   sits in the plane spanned by `axisA` and `axisB`; both unit vectors
   should be perpendicular and originate from the elbow corner. */
function ElbowAt({
  corner,
  axisA,
  axisB,
  pipeRadius,
  pipeColor,
}: {
  corner: [number, number, number];
  axisA: 'x' | 'y' | 'z';
  axisB: 'x' | 'y' | 'z';
  pipeRadius: number;
  pipeColor: string;
}) {
  const R = pipeRadius * PUMP_ELBOW_R_FACTOR;
  /* Build a torus rotation that maps the default torus plane (XY) to the
     plane spanned by axisA and axisB, with the arc starting along axisA
     and ending along axisB. Default torus arc goes from +X (φ=0) to +Y
     (φ=π/2) in the XY plane. */
  const unit: Record<'x' | 'y' | 'z', THREE.Vector3> = {
    x: new THREE.Vector3(1, 0, 0),
    y: new THREE.Vector3(0, 1, 0),
    z: new THREE.Vector3(0, 0, 1),
  };
  const a = unit[axisA].clone();
  const b = unit[axisB].clone();
  const m = new THREE.Matrix4().makeBasis(
    a,
    b,
    new THREE.Vector3().crossVectors(a, b),
  );
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  const e = new THREE.Euler().setFromQuaternion(q);
  /* Torus center is offset by R along both axisA and axisB so the arc
     tangents leave the corner cleanly along each axis direction. */
  const cx = corner[0] - a.x * R - b.x * R;
  const cy = corner[1] - a.y * R - b.y * R;
  const cz = corner[2] - a.z * R - b.z * R;
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

  /* ── World-space riser / discharge anchor tops (assembly-local → world) ── */
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
  /* CHWP discharge: HorizPipe → ElbowYtoX(toward=-1) → vertical up-riser.
     Riser centerline X in assembly-local = xDischargeOut + 0.65 + R*4.5. */
  const chsRiserLocalX = chwLay.xDischargeOut + 0.65 + PUMP_PIPE_R * PUMP_ELBOW_R_FACTOR;
  const chwChsRiserTop: [number, number, number] = [
    CHWP_ORIGIN[0] + chsRiserLocalX,
    PUMP_CEILING_Y,
    CHWP_ORIGIN[2],
  ];

  /* ── Existing main-pipe connection points (kept in sync with App.tsx) ── */
  const HEADER_Y = 1.10;                                   // CHW low-level header elevation
  /* CWS main riser runs vertically at (CW_XS=0, *, CW_ZS=5.6).
     The pump suction riser top bridges horizontally at ceiling height to
     this riser, then water flows down through App.tsx barrel-head chain. */
  const CWS_RISER_TOP: [number, number, number] = [CW_XS, PUMP_CEILING_Y, CW_ZS];
  /* CDWP discharge bridges UP and tees into the CWS riser at a safe
     clearance height above all chiller barrels (condenser top ≈ 1.89 m). */
  const CDWP_BRDG_Y = 3.0;
  /* CHR (return) header runs along X at y=HEADER_Y, z=CHW_ZR.
     CHWS (supply) header runs along X at y=HEADER_Y, z=CHW_ZS. */

  return (
    <group name="pump-tie-ins">

      {/* ═══════════ CDWP SUCTION TIE-IN ═══════════
          CDWP suction-riser top is at (xRiser_world≈-2.71, CEILING_Y, 9.0).
          CWS main riser is at (X=0, CEILING_Y, Z=5.6).
          Path: pump riser top → horizontal +X spool (at ceiling) to X=0
                → horizontal -Z spool to Z=5.6 → tee into CWS riser. */}
      <group name="tie:CDWP-suction-bridge">
        {/* Leg 1: +X run to CWS riser X at pump's Z */}
        <StraightPipe3D
          a={cdwSucRiserTop}
          b={[CW_XS, PUMP_CEILING_Y, cdwSucRiserTop[2]]}
          pipeRadius={PUMP_PIPE_R}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* Collar at the X=0 corner */}
        <mesh position={[CW_XS, PUMP_CEILING_Y, cdwSucRiserTop[2]]} rotation={[Math.PI / 4, 0, 0]}>
          <cylinderGeometry args={[PUMP_PIPE_R * 1.55, PUMP_PIPE_R * 1.55, 0.08, 16]} />
          <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
        </mesh>
        {/* Leg 2: -Z run to CWS riser at Z=5.6 */}
        <StraightPipe3D
          a={[CW_XS, PUMP_CEILING_Y, cdwSucRiserTop[2]]}
          b={CWS_RISER_TOP}
          pipeRadius={PUMP_PIPE_R}
          pipeColor={PUMP_COLOR.CWS}
        />
        {/* Tee collar at the junction on the CWS main riser */}
        <mesh position={CWS_RISER_TOP} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[PUMP_PIPE_R * 1.55, PUMP_PIPE_R * 1.55, 0.10, 16]} />
          <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
        </mesh>
      </group>

      {/* ═══════════ CDWP DISCHARGE TIE-IN ═══════════
          CDWP discharges into the CWS condenser-water loop.
          The pump discharge tail is at (xDischarge, shaftY, 9.0).
          Path: pump tail → vertical up to overhead bridge height (3.0 m)
                → 90° elbow → horizontal −Z spool at Z=9.0→Z=5.6
                → 90° elbow → horizontal −X spool at Z=5.6 to X=CW_XS=0
                → bull-tee into the CWS main riser (X=0, Z=5.6).
          Bridge height 3.0 m keeps the spool clear of the condenser barrel
          top (≈1.89 m) with OSHA 1910.23 maintenance clearance. */}
      {(() => {
        const eR    = PUMP_PIPE_R * PUMP_ELBOW_R_FACTOR;
        const xPump = cdwDischargeEnd[0];     // ≈ +3.57 (discharge side of pump at X=0)
        const zPump = cdwDischargeEnd[2];     // 9.0
        const zRiser = CW_ZS;                 // 5.6 — CWS riser Z
        const xRiser = CW_XS;                 // 0.0 — CWS riser X
        const yUp   = CDWP_BRDG_Y;           // 3.0 m overhead bridge
        return (
          <group name="tie:CDWP-discharge-bridge">
            {/* 1. Vertical rise from pump discharge tail to bridge height */}
            <StraightPipe3D
              a={cdwDischargeEnd}
              b={[xPump, yUp, zPump]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CWS}
            />
            {/* 2. 90° elbow: +Y → −Z */}
            <ElbowAt
              corner={[xPump, yUp, zPump]}
              axisA="y"
              axisB="z"
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CWS}
            />
            {/* 3. Horizontal spool at bridge height: −Z from pump Z to CWS riser Z */}
            <StraightPipe3D
              a={[xPump, yUp, zPump - eR]}
              b={[xPump, yUp, zRiser]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CWS}
            />
            {/* 4. 90° elbow: +Z (approaching from pump side) → +X → turns −X
                   Use axisA="z" axisB="x" so arc turns from +Z approach to +X
                   then the spool runs −X to X=0. ElbowAt corner sits at the
                   junction of the Z-run and the X-run. */}
            <ElbowAt
              corner={[xPump, yUp, zRiser]}
              axisA="z"
              axisB="x"
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CWS}
            />
            {/* 5. Horizontal −X spool from pump X to CWS riser X */}
            <StraightPipe3D
              a={[xPump + eR, yUp, zRiser]}
              b={[xRiser, yUp, zRiser]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CWS}
            />
            {/* 6. Bull-tee collar on CWS riser at bridge elevation */}
            <mesh position={[xRiser, yUp, zRiser]}>
              <cylinderGeometry args={[PUMP_PIPE_R * 1.05, PUMP_PIPE_R * 1.05, PUMP_PIPE_R * 3.2, 18]} />
              <meshStandardMaterial color={PUMP_COLOR.CWS} roughness={0.55} metalness={0.45} />
            </mesh>
            <mesh position={[xRiser, yUp, zRiser]}>
              <cylinderGeometry args={[PUMP_PIPE_R * 1.55, PUMP_PIPE_R * 1.55, 0.06, 18]} />
              <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
            </mesh>
          </group>
        );
      })()}

      {/* ═══════════ CHWP SUCTION TIE-IN (CHR return header) ═══════════
          The CHWP draws return chilled water (CHR) from the low-level CHR header.
          CHR header: y=1.10, z=CHW_ZR (≈ -6.675).
          Pump suction-riser top is at (chwSucRiserTop[0], CEILING_Y, -9.5).
          Path: ceiling anchor → vertical drop to header height
                → corner tee → lateral +Z horizontal spool
                → tee saddle onto CHR header at z=CHW_ZR.
          (Elbow is represented as a mitered tee collar because ElbowAt only
           supports +axis tangent conventions; the visual read is clear.) */}
      {(() => {
        const xR   = chwSucRiserTop[0];
        const zR   = chwSucRiserTop[2];     // -9.5 (pump Z)
        const zHdr = CHW_ZR;               // ≈ -6.675 — CHR header Z
        const yHdr = HEADER_Y;
        return (
          <group name="tie:CHWP-suction-bridge">
            {/* 1. Vertical drop from ceiling to header level */}
            <StraightPipe3D
              a={chwSucRiserTop}
              b={[xR, yHdr, zR]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CHR}
            />
            {/* 2. Mitered corner collar */}
            <mesh position={[xR, yHdr, zR]} rotation={[Math.PI / 4, 0, 0]}>
              <cylinderGeometry args={[PUMP_PIPE_R * 1.55, PUMP_PIPE_R * 1.55, 0.08, 16]} />
              <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
            </mesh>
            {/* 3. Horizontal spool at header height: pump Z → CHR header Z (+Z dir) */}
            <StraightPipe3D
              a={[xR, yHdr, zR]}
              b={[xR, yHdr, zHdr]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CHR}
            />
            {/* 4. Tee saddle on CHR header */}
            <mesh position={[xR, yHdr, zHdr]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[PUMP_PIPE_R * 1.55, PUMP_PIPE_R * 1.55, 0.10, 16]} />
              <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
            </mesh>
          </group>
        );
      })()}

      {/* ═══════════ CHWP DISCHARGE TIE-IN (CHWS supply header) ═══════════
          CHWP pumps cold chilled water into the CHWS supply header.
          CHWS header: y=1.10, z=CHW_ZS (≈ -5.525).
          Pump CHS up-riser top is at (chwChsRiserTop[0], CEILING_Y, -9.5).
          Path: ceiling anchor → vertical drop to header height
                → corner tee → lateral +Z horizontal spool
                → tee saddle onto CHWS header at z=CHW_ZS. */}
      {(() => {
        const xR   = chwChsRiserTop[0];
        const zR   = chwChsRiserTop[2];    // -9.5 (pump Z)
        const zHdr = CHW_ZS;              // ≈ -5.525 — CHWS header Z
        const yHdr = HEADER_Y;
        return (
          <group name="tie:CHWP-discharge-bridge">
            {/* 1. Vertical drop from ceiling to header level */}
            <StraightPipe3D
              a={chwChsRiserTop}
              b={[xR, yHdr, zR]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CHS}
            />
            {/* 2. Mitered corner collar */}
            <mesh position={[xR, yHdr, zR]} rotation={[Math.PI / 4, 0, 0]}>
              <cylinderGeometry args={[PUMP_PIPE_R * 1.55, PUMP_PIPE_R * 1.55, 0.08, 16]} />
              <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
            </mesh>
            {/* 3. Horizontal spool at header height: pump Z → CHWS header Z (+Z dir) */}
            <StraightPipe3D
              a={[xR, yHdr, zR]}
              b={[xR, yHdr, zHdr]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CHS}
            />
            {/* 4. Tee saddle on CHWS header */}
            <mesh position={[xR, yHdr, zHdr]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[PUMP_PIPE_R * 1.55, PUMP_PIPE_R * 1.55, 0.10, 16]} />
              <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
            </mesh>
          </group>
        );
      })()}
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

function ChemicalPotFeeder({ position }: { position: [number, number, number] }) {
  return (
    <group name="chemical:POT-CT" position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.42, 0.75, 16]} />
        <meshStandardMaterial color="#d96818" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 0.15, 12]} />
        <meshStandardMaterial color="#5a5a58" roughness={0.45} metalness={0.6} />
      </mesh>
      <GlobeValve position={[0.55, 0.35, 0]} pipeRadius={0.08} bodyColor="#d96818" handwheelColor="#cc2222" />
      <GlobeValve position={[0.85, 0.35, 0]} pipeRadius={0.08} bodyColor="#d96818" handwheelColor="#cc2222" />
      <Billboard>
      <Text position={[0, 0.95, 0]} fontSize={0.08} color="#1a1a1a" anchorX="center" anchorY="middle">
        CHEM POT
      </Text>
      </Billboard>
    </group>
  );
}

function ShotFeederCHR({ position }: { position: [number, number, number] }) {
  return (
    <group name="chemical:SHOT-CHR" position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.55, 12]} />
        <meshStandardMaterial color="#c85a12" roughness={0.5} metalness={0.35} />
      </mesh>
      <mesh position={[0.28, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.45, 10]} />
        <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.4} />
      </mesh>
      <Billboard>
      <Text position={[0, 0.45, 0]} fontSize={0.06} color="#111" anchorX="center" anchorY="middle">
        SHOT / CHW
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
      <GlobeValve position={[x0 + 4.5, ROOF_Y, TOWER_Z + 3.8]} rotation={[0, 0, Math.PI / 2]} pipeRadius={0.055} bodyColor="#e8ecf0" handwheelColor="#d4a017" />
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

function InjectionQuillToCWR() {
  return (
    <group name="chemical:injection-CWR">
      <mesh position={[8.5, ROOF_Y, CW_ZR]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 6.5, 10]} />
        <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[12, ROOF_Y, CW_ZR]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
        <meshStandardMaterial color="#c0c4c8" roughness={0.4} metalness={0.75} />
      </mesh>
      <Billboard>
      <Text position={[5.5, ROOF_Y + 0.22, CW_ZR]} fontSize={0.075} color="#111" anchorX="center" anchorY="middle">
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
 * PID-aligned add-ons: pumps, makeup, chemical, expansion, electrical, extra instruments.
 * Parent: EngineRoom world group (same origin as chiller at [0,0,0]).
 */
export function PidPlantSystems() {
  const cdwFlow = useSimulationStore((s) => s.state.condenserWaterFlowing);
  const chwFlow = useSimulationStore((s) => s.state.evaporatorWaterFlowing);

  return (
    <>
      {/* pump-assemblies.spec.json — dedicated CDWP / CHWP assemblies */}
      <CDWPPumpAssembly
        position={CDWP_ORIGIN}
        running={cdwFlow}
        tag="CDWP-1"
        suctionValveId="pipe_gate_cdwp_suction"
        dischargeValveId="pipe_gate_cdwp_discharge"
        drainValveId="pipe_drain_cdwp_low"
      />
      <CHWPPumpAssembly
        position={CHWP_ORIGIN}
        running={chwFlow}
        tag="CHWP-1"
        suctionValveId="pipe_gate_chwp_suction"
        dischargeValveId="pipe_gate_chwp_discharge"
        drainValveId="pipe_drain_chwp_low"
      />
      <PumpHydraulicTieIns />
      <ExpansionTankWithLegs position={[-26, 0, CHW_ZR]} />
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-14, HDR_Y + 0.12, CHW_ZR]}>
        <cylinderGeometry args={[0.07, 0.07, 11.5, 12]} />
        <meshStandardMaterial color="#7a6e4e" roughness={0.55} metalness={0.42} />
      </mesh>

      <MakeupWaterRooftop />
      <InjectionQuillToCWR />
      <ChemicalPotFeeder position={[5.5, 0, -3.8]} />
      <ShotFeederCHR position={[-11.2, HDR_Y + 0.35, CHW_ZR]} />
      <mesh position={[5.5, HDR_Y + 0.08, -3.8]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 2.8, 10]} />
        <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.28} />
      </mesh>
      <mesh position={[4.1, HDR_Y + 0.08, CHW_ZR]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 2.8, 10]} />
        <meshStandardMaterial color="#d96818" roughness={0.5} metalness={0.28} />
      </mesh>

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

      <ChillerHxAirVents />
      <ChillerPetcocksAndDrains />

      <IsaInstrumentBubble position={[-12, HDR_Y + 0.55, CHW_ZS]} type="TT" loop="CHWS" />
      <IsaInstrumentBubble position={[-12, HDR_Y - 0.55, CHW_ZS]} type="PT" loop="CHWS" />
      <IsaInstrumentBubble position={[-12, HDR_Y + 0.55, CHW_ZR]} type="TT" loop="CHWR" />
      <IsaInstrumentBubble position={[-12, HDR_Y - 0.55, CHW_ZR]} type="PT" loop="CHWR" />
      <IsaInstrumentBubble position={[CW_XS, 7.85, CW_ZS]} rotation={[0, 0, Math.PI / 2]} type="TT" loop="CWS" />
      <IsaInstrumentBubble position={[CW_XS, 6.55, CW_ZS]} rotation={[0, 0, Math.PI / 2]} type="PT" loop="CWS" />
      <IsaInstrumentBubble position={[CW_XR, 7.85, CW_ZR]} rotation={[0, 0, Math.PI / 2]} type="TT" loop="CWR" />
      <IsaInstrumentBubble position={[CW_XR, 6.55, CW_ZR]} rotation={[0, 0, Math.PI / 2]} type="PT" loop="CWR" />

      <DrainValve
        valveId="pipe_drain_ahu_coil"
        position={[-15.5, ROOF_Y + 0.55, CHW_ZS]}
        rotation={[Math.PI / 2, 0, 0]}
        pipeRadius={MAIN_R * 0.55}
      />

      <PadMountTransformer position={[32, 0, -26]} />
      <MainServiceBreaker position={[30.2, 0, -26]} />
      <DisconnectSwitch position={[30.2, 1.8, -26]} tag="MAIN" />
      <DisconnectSwitch position={[2.8, 2.6, -3.6]} tag="CHILLER" />
      <DisconnectSwitch position={[TOWER_X - 1.5, ROOF_Y + 1.2, TOWER_Z]} tag="CT-FAN" />
      <DisconnectSwitch position={[-15.5, ROOF_Y + 1.8, CHW_ZS + 0.5]} tag="AHU" />
      <>
          <PadMountTransformer position={[32, 0, -26]} />
          {/* pid `electrical_system` — Main service breaker right after transformer */}
          <MainServiceBreaker position={[30.2, 0, -26]} />
          <DisconnectSwitch position={[30.2, 1.8, -26]} tag="MAIN" />
          <DisconnectSwitch position={[2.8, 2.6, -3.6]} tag="CHILLER" />
          <DisconnectSwitch position={[TOWER_X - 1.5, ROOF_Y + 1.2, TOWER_Z]} tag="CT-FAN" />
          <DisconnectSwitch position={[-15.5, ROOF_Y + 1.8, CHW_ZS + 0.5]} tag="AHU" />
          {/* NOTE: each pump assembly already renders its own free-standing VFD
              cabinet (see VfdWallEnclosure inside CDWPPumpAssembly / CHWPPumpAssembly).
              We only add the overhead motor-feeder conduit between the VFD top and
              the motor terminal box here. CDWP VFD is at +Z of pump (toward back wall);
              CHWP VFD is at -Z of pump (away from chiller). */}
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
      </>
    </>
  );
}
