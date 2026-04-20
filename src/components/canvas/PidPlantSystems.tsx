/**
 * YORK water-cooled plant add-ons per pid.json / must_install_components.
 * Layout constants mirror EngineRoom in App.tsx — keep in sync when moving equipment.
 */
import { type JSX } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { usePlantLayerStore } from '../../store/usePlantLayerStore';
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
      <Text position={[0, MAIN_R + 0.38, 0.18]} fontSize={0.07} color="#111" anchorX="center" anchorY="middle">
        {tag}
      </Text>
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
      <Text position={[0, 0, 0.07]} fontSize={0.055} color="#111" anchorX="center" anchorY="middle">
        {tag}
      </Text>
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
      <Text position={[0, 0.06, 0.012]} fontSize={0.07} color="#101216" anchorX="center" anchorY="middle" fontWeight={700}>
        {type}
      </Text>
      <Text position={[0, -0.06, 0.012]} fontSize={0.055} color="#101216" anchorX="center" anchorY="middle">
        {loop}
      </Text>
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
      <Text position={[0, 0.22, 0]} fontSize={0.07} color="#0a4a0a" anchorX="center" anchorY="middle">
        {tag}
      </Text>
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
      <Text position={[0.32, 0.95, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.10} color="#e8c627" anchorX="center" anchorY="middle">
        MAIN BREAKER
      </Text>
      <Text position={[0.32, -0.55, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={0.07} color="#e8e8e8" anchorX="center" anchorY="middle">
        480V / 3Φ / 1200A
      </Text>
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
      <Text position={[0.16, 0.1, 0]} fontSize={0.06} color="#222" anchorX="left" anchorY="middle">
        {tag}
      </Text>
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

function PumpHydraulicTieIns() {
  /* ── Layout solvers (local pump-frame anchor coordinates) ── */
  const cdwLay = computeAssemblyLayout('cdw');
  const chwLay = computeAssemblyLayout('chw');

  /* ── Pump world origins must mirror invocation in PidPlantSystems below ── */
  const CDWP_ORIGIN: [number, number, number] = [CW_XS + 2.4, 0, CW_ZS];
  const CHWP_ORIGIN: [number, number, number] = [-4.2, 0, CHW_ZS];

  /* World anchors for CDWP */
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

  /* World anchors for CHWP */
  const chwSucRiserTop: [number, number, number] = [
    CHWP_ORIGIN[0] + chwLay.xRiser,
    PUMP_CEILING_Y,
    CHWP_ORIGIN[2],
  ];
  /* CHWP discharge tail in the assembly: HorizPipe to xOut+0.65, then
     ElbowYtoX(toward=-1) which curves into a vertical CHS up-riser at
     x = xOut + 0.65 + R*4.5. The riser top sits at CEILING_Y. */
  const chsRiserX = CHWP_ORIGIN[0] + chwLay.xDischargeOut + 0.65 + PUMP_PIPE_R * PUMP_ELBOW_R_FACTOR;
  const chwChsRiserTop: [number, number, number] = [chsRiserX, PUMP_CEILING_Y, CHWP_ORIGIN[2]];

  /* Existing-piping connection points ──────────────────────────────────
     Pulled from App.tsx layout constants (kept in sync manually because
     `App.tsx` doesn't export them as a module):
       CHW headers:        y = 1.10, z = CHW_ZS / CHW_ZR
       CWS riser drop:     x = CW_XS=0, z = CW_ZS=5.6 (vertical pipe)
       Chiller CDW inlet:  per YORK YK 2-pass marine waterbox — LOWER
                           nozzle (CWS) on the head-face centerline at
                           x=0, y=0.30, z=COND_HEAD_Z. The barrel-head
                           chain in App.tsx (lateral spool + 90° elbow +
                           vertical riser) carries water from this flange
                           UP through the rooftop CWS riser at (0,*,5.6).
       Head face Z:        z=+4.76 (condenser barrel +Z cap). */
  const HEADER_Y = 1.10;
  const HEAD_Z_FACE = 4.76;                           // matches App.tsx COND_HEAD_Z
  const CWS_RISER: [number, number, number] = [CW_XS, PUMP_CEILING_Y, CW_ZS];
  /* Discharge bridge tees into the rooftop CWS riser at an overhead
     elevation. The rooftop riser is the same physical pipe that runs
     down through the App.tsx barrel-head chain into the chiller CDW
     supply (inlet) flange at (0, 0.30, 4.76); teeing in here keeps
     the discharge route clear of the chiller barrel and avoids
     fighting the App.tsx barrel-head fitting kit at the inlet flange.
     Set well above the pump shaft (≈0.58 m) and above the chiller
     condenser barrel top (≈1.89 m) so the long horizontal -X spool
     clears all obstructions with code-compliant headroom. */
  const CDWP_DISCHARGE_BRIDGE_Y = 2.40;
  void HEAD_Z_FACE;                                   // kept as documentation alias for the App.tsx barrel-face Z
  const CHWR_HEADER_TIE: [number, number, number] = [chwSucRiserTop[0], HEADER_Y, CHW_ZR];
  const CHWS_HEADER_TIE: [number, number, number] = [chsRiserX, HEADER_Y, CHW_ZS];

  return (
    <group name="pump-tie-ins">
      {/* ───────── CDWP — suction tie-in ─────────
          Short horizontal bridge along the engine-room ceiling joining the
          pump's internal suction-riser top to the rooftop CWS riser. */}
      <StraightPipe3D
        a={cdwSucRiserTop}
        b={CWS_RISER}
        pipeRadius={PUMP_PIPE_R}
        pipeColor={PUMP_COLOR.CWS}
        name="tie:CDWP-suction-bridge"
      />

      {/* ───────── CDWP — discharge tie-in ─────────
          With the YORK YK 2-pass marine waterbox, the CDW supply (inlet)
          flange is the LOWER of the two stacked nozzles on the head-face
          centerline at world (0, 0.30, 4.76). The pump's discharge tail
          sits ABOVE that elevation (shaftY ≈ 0.58 m) and the rooftop CWS
          riser sails right past the pump at (0, *, 5.6) on its way down
          to the same flange (via the App.tsx barrel-head chain). Rather
          than fight the barrel-head fitting kit at the inlet flange, the
          pump discharge bridges UP and OVER, then TEES into the rooftop
          CWS riser at code-compliant headroom — which is how field-piped
          chiller plants with engine-room CDWPs are actually routed.
          Path: pump tail (y=shaftY, z=CW_ZS)
                → vertical up to bridge elevation (y=BRIDGE_Y, z=CW_ZS)
                → 90° → run -X along z=CW_ZS at bridge elevation
                → tee into the existing CWS riser at (CW_XS, BRIDGE_Y, CW_ZS).
          Water then flows DOWN the riser and through the App.tsx
          barrel-head spool/elbow into the chiller condenser inlet. */}
      {(() => {
        const eR     = PUMP_PIPE_R * PUMP_ELBOW_R_FACTOR;
        const yBrdg  = CDWP_DISCHARGE_BRIDGE_Y;          // 2.40 — overhead bridge centerline
        const xPump  = cdwDischargeEnd[0];
        const xTee   = CW_XS;                             // 0 — rooftop CWS riser X
        const zPipe  = CW_ZS;                             // 5.60 — both pump + riser sit on this Z
        return (
          <group name="tie:CDWP-discharge-bridge">
            {/* 1. Vertical riser-up from pump tail to bridge elevation */}
            <StraightPipe3D
              a={cdwDischargeEnd}
              b={[xPump, yBrdg, zPipe]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CWS}
            />
            <ElbowAt
              corner={[xPump, yBrdg, zPipe]}
              axisA="y"
              axisB="x"
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CWS}
            />
            {/* 2. Horizontal -X spool to the rooftop CWS riser. Stops at
                   the riser centerline (x=CW_XS=0) where the tee fitting
                   merges the discharge into the descending CWS column. */}
            <FlangedSpool
              x0={xPump - eR}
              x1={xTee}
              y={yBrdg}
              z={zPipe}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CWS}
            />
            {/* 3. Bull-tee fitting onto the CWS riser. Modelled as a short
                   transverse spool (along Y, matching the riser axis) with
                   a flange band at the joint — visually reads as the run
                   of the tee with the discharge spool branching off in -X. */}
            <mesh position={[xTee, yBrdg, zPipe]}>
              <cylinderGeometry args={[PUMP_PIPE_R * 1.05, PUMP_PIPE_R * 1.05, PUMP_PIPE_R * 3.2, 18]} />
              <meshStandardMaterial color={PUMP_COLOR.CWS} roughness={0.55} metalness={0.45} />
            </mesh>
            <mesh position={[xTee, yBrdg, zPipe]}>
              <cylinderGeometry args={[PUMP_PIPE_R * 1.55, PUMP_PIPE_R * 1.55, 0.06, 18]} />
              <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
            </mesh>
          </group>
        );
      })()}

      {/* ───────── CHWP — suction tie-in (CHR header) ─────────
          Path: pump suction-riser top (y=CEILING_Y, z=CHW_ZS) → vertical
          drop to header level → 90° → lateral -Z to CHR header at
          z=CHW_ZR → tee into CHR header. */}
      {(() => {
        const yHdr = HEADER_Y;
        const xR = chwSucRiserTop[0];
        return (
          <group name="tie:CHWP-suction-bridge">
            {/* 1. Long vertical drop from ceiling to header level */}
            <StraightPipe3D
              a={chwSucRiserTop}
              b={[xR, yHdr + PUMP_PIPE_R * PUMP_ELBOW_R_FACTOR, CHW_ZS]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CHR}
            />
            <ElbowAt
              corner={[xR, yHdr, CHW_ZS]}
              axisA="y"
              axisB="z"
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CHR}
            />
            {/* 2. Lateral run in -Z from z=CHW_ZS to z=CHW_ZR (1.15 m) */}
            <StraightPipe3D
              a={[xR, yHdr, CHW_ZS - PUMP_PIPE_R * PUMP_ELBOW_R_FACTOR]}
              b={[xR, yHdr, CHWR_HEADER_TIE[2]]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CHR}
            />
            {/* 3. Tee saddle on the CHR header */}
            <mesh
              position={[xR, yHdr, CHWR_HEADER_TIE[2]]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[PUMP_PIPE_R * 1.55, PUMP_PIPE_R * 1.55, 0.10, 16]} />
              <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
            </mesh>
          </group>
        );
      })()}

      {/* ───────── CHWP — discharge tie-in (CHWS header) ─────────
          Path: pump CHS-up-riser top (y=CEILING_Y, z=CHW_ZS) → vertical
          drop straight down to CHWS low header at y=1.10, z=CHW_ZS. */}
      {(() => {
        const yHdr = HEADER_Y;
        const xR = chwChsRiserTop[0];
        return (
          <group name="tie:CHWP-discharge-bridge">
            <StraightPipe3D
              a={chwChsRiserTop}
              b={[xR, yHdr, CHW_ZS]}
              pipeRadius={PUMP_PIPE_R}
              pipeColor={PUMP_COLOR.CHS}
            />
            {/* Tee saddle on the CHWS header */}
            <mesh position={[xR, yHdr, CHWS_HEADER_TIE[2]]} rotation={[0, 0, Math.PI / 2]}>
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
      <Text position={[0, 0.55, 0]} fontSize={0.09} color="#1a1a1a" anchorX="center" anchorY="middle">
        RPZ / BFP
      </Text>
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
      <Text position={[0.12, 0.95, 0]} fontSize={0.09} color="#e8c627" anchorX="center" anchorY="middle">
        VFD
      </Text>
      <Text position={[0.12, -0.95, 0]} fontSize={0.07} color="#ddd" anchorX="center" anchorY="middle">
        {tag}
      </Text>
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
      <Text position={[0, -0.38, 0.1]} fontSize={0.055} color="#111" anchorX="center" anchorY="middle">
        {tag}
      </Text>
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
      <Text position={[0, 1.45, 0]} fontSize={0.11} color="#dde8cc" anchorX="center" anchorY="middle">
        480V SERVICE
      </Text>
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
      <Text position={[0, 0.95, 0]} fontSize={0.08} color="#1a1a1a" anchorX="center" anchorY="middle">
        CHEM POT
      </Text>
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
      <Text position={[0, 0.45, 0]} fontSize={0.06} color="#111" anchorX="center" anchorY="middle">
        SHOT / CHW
      </Text>
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
      <Text position={[TOWER_X - 1.1, basinWorldY + 0.95, TOWER_Z + 0.2]} fontSize={0.08} color="#0a4a0a" anchorX="center" anchorY="middle">
        AIR GAP
      </Text>
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
      <Text position={[mid, ROOF_Y + 0.35, TOWER_Z + 3.8]} fontSize={0.1} color="#0a4a0a" anchorX="center" anchorY="middle">
        MAKEUP (DOMESTIC)
      </Text>
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
      <Text position={[TOWER_X + 2.2, ROOF_Y + 0.25, TOWER_Z - 2.4]} fontSize={0.07} color="#111" anchorX="center" anchorY="middle">
        OVERFLOW / ROOF DRAIN
      </Text>
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
      <Text position={[5.5, ROOF_Y + 0.22, CW_ZR]} fontSize={0.075} color="#111" anchorX="center" anchorY="middle">
        CHEM INJECT → CWR
      </Text>
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
      <Text position={[0, 1.05, 0]} fontSize={0.1} color="#222" anchorX="center" anchorY="middle">
        BLADDER / CHR
      </Text>
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
  const layers = usePlantLayerStore((s) => s.layers);
  const cdwFlow = useSimulationStore((s) => s.state.condenserWaterFlowing);
  const chwFlow = useSimulationStore((s) => s.state.evaporatorWaterFlowing);

  return (
    <>
      {layers.hydronics && (
        <>
          {/* pump-assemblies.spec.json — dedicated CDWP / CHWP assemblies
              with full vertical-riser suction trains and discharge trains. */}
          <CDWPPumpAssembly
            position={[CW_XS + 2.4, 0, CW_ZS]}
            running={cdwFlow}
            tag="CDWP-1"
            suctionValveId="pipe_gate_cdwp_suction"
            dischargeValveId="pipe_gate_cdwp_discharge"
            drainValveId="pipe_drain_cdwp_low"
          />
          <CHWPPumpAssembly
            position={[-4.2, 0, CHW_ZS]}
            running={chwFlow}
            tag="CHWP-1"
            suctionValveId="pipe_gate_chwp_suction"
            dischargeValveId="pipe_gate_chwp_discharge"
            drainValveId="pipe_drain_chwp_low"
          />
          {/* Bridge piping that ties the self-contained pump assemblies into
              the existing rooftop CWS riser, the chiller condenser nozzle,
              and the engine-room CHWS / CHWR low headers. */}
          <PumpHydraulicTieIns />
          <ExpansionTankWithLegs position={[-26, 0, CHW_ZR]} />
          <mesh rotation={[0, 0, Math.PI / 2]} position={[-14, HDR_Y + 0.12, CHW_ZR]}>
            <cylinderGeometry args={[0.07, 0.07, 11.5, 12]} />
            <meshStandardMaterial color="#7a6e4e" roughness={0.55} metalness={0.42} />
          </mesh>
        </>
      )}

      {layers.makeupChemical && (
        <>
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
        </>
      )}

      {layers.instrumentation && (
        <>
          <FlowTransmitterMagMeter position={[-12, HDR_Y, CHW_ZS]} tag="FT-CHWS" />
          <FlowTransmitterMagMeter position={[CW_XS, 7.2, CW_ZS]} rotation={[0, 0, Math.PI / 2]} tag="FT-CWS" />
          <DifferentialPressureCell
            position={[CW_XS + 2.15, pumpShaftCenterlineY(MAIN_R * 0.55, 'cdw'), CW_ZS + 0.35]}
            tag="PDI-CDWP"
          />
          <DifferentialPressureCell
            position={[-4.45, pumpShaftCenterlineY(MAIN_R * 0.55, 'chw'), CHW_ZS - 0.32]}
            tag="PDI-CHWP"
          />
          <DifferentialPressureCell position={[CW_XR, 7.4, CW_ZR]} rotation={[0, 0, Math.PI / 2]} tag="PDI-YST-CDW" />
          <DifferentialPressureCell position={[-8.8, HDR_Y + 0.2, CHW_ZR]} tag="PDI-YST-CHW" />
        </>
      )}

      {layers.hydronics && <ChillerHxAirVents />}
      {layers.drains && <ChillerPetcocksAndDrains />}

      {layers.instrumentation && (
        <>
          {/* pid `instruments` — explicit FT / TT / PT bubbles on each hydronic main */}
          <IsaInstrumentBubble position={[-12, HDR_Y + 0.55, CHW_ZS]} type="TT" loop="CHWS" />
          <IsaInstrumentBubble position={[-12, HDR_Y - 0.55, CHW_ZS]} type="PT" loop="CHWS" />
          <IsaInstrumentBubble position={[-12, HDR_Y + 0.55, CHW_ZR]} type="TT" loop="CHWR" />
          <IsaInstrumentBubble position={[-12, HDR_Y - 0.55, CHW_ZR]} type="PT" loop="CHWR" />
          <IsaInstrumentBubble
            position={[CW_XS, 7.85, CW_ZS]}
            rotation={[0, 0, Math.PI / 2]}
            type="TT"
            loop="CWS"
          />
          <IsaInstrumentBubble
            position={[CW_XS, 6.55, CW_ZS]}
            rotation={[0, 0, Math.PI / 2]}
            type="PT"
            loop="CWS"
          />
          <IsaInstrumentBubble
            position={[CW_XR, 7.85, CW_ZR]}
            rotation={[0, 0, Math.PI / 2]}
            type="TT"
            loop="CWR"
          />
          <IsaInstrumentBubble
            position={[CW_XR, 6.55, CW_ZR]}
            rotation={[0, 0, Math.PI / 2]}
            type="PT"
            loop="CWR"
          />
        </>
      )}

      {layers.drains && (
        <>
          {/* pid `drains` — AHU cooling-coil low-point drain valve at coil section base */}
          <DrainValve
            valveId="pipe_drain_ahu_coil"
            position={[-15.5, ROOF_Y + 0.55, CHW_ZS]}
            rotation={[Math.PI / 2, 0, 0]}
            pipeRadius={MAIN_R * 0.55}
          />
        </>
      )}

      {layers.electrical && (
        <>
          <PadMountTransformer position={[32, 0, -26]} />
          {/* pid `electrical_system` — Main service breaker right after transformer */}
          <MainServiceBreaker position={[30.2, 0, -26]} />
          <DisconnectSwitch position={[30.2, 1.8, -26]} tag="MAIN" />
          <DisconnectSwitch position={[2.8, 2.6, -3.6]} tag="CHILLER" />
          <DisconnectSwitch position={[TOWER_X - 1.5, ROOF_Y + 1.2, TOWER_Z]} tag="CT-FAN" />
          <DisconnectSwitch position={[-15.5, ROOF_Y + 1.8, CHW_ZS + 0.5]} tag="AHU" />
          <SlimVfdWallMount position={[CW_XS + 2.4, 1.95, CW_ZS + 1.35]} tag="CDWP VFD" />
          <SlimVfdWallMount position={[-4.2, 1.95, CHW_ZS - 1.35]} tag="CHWP VFD" />
          <MotorFeederConduit
            path={[
              [CW_XS + 2.4, 2.85, CW_ZS + 1.35],
              [CW_XS + 2.4, 5.5, CW_ZS + 1.35],
              [CW_XS + 0.2, 5.5, CW_ZS + 1.35],
              [CW_XS + 0.2, 5.5, CW_ZS],
            ]}
          />
          <MotorFeederConduit
            path={[
              [-4.2, 2.85, CHW_ZS - 1.35],
              [-4.2, 5.2, CHW_ZS - 1.35],
              [-4.2, 5.2, CHW_ZS],
            ]}
          />
        </>
      )}
    </>
  );
}
