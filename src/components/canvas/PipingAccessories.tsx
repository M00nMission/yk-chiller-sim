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

import { Text } from '@react-three/drei';

type Triple = [number, number, number];

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
}: AccessoryBase & { bodyColor?: string; handwheelColor?: string }) {
  const r = pipeRadius;
  return (
    <group position={position} rotation={rotation}>
      {/* end flange L */}
      <mesh position={[-0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, 0.05, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* end flange R */}
      <mesh position={[0.18, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, 0.05, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* body run */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.1, r * 1.1, 0.32, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* central seat bulge */}
      <mesh>
        <sphereGeometry args={[r * 1.32, 18, 14]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* bonnet flange */}
      <mesh position={[0, r * 0.95, 0]}>
        <cylinderGeometry args={[r * 0.95, r * 0.95, 0.07, 12]} />
        <meshStandardMaterial color={STEEL} roughness={0.45} metalness={0.75} />
      </mesh>
      {/* bonnet body */}
      <mesh position={[0, r * 1.25, 0]}>
        <cylinderGeometry args={[r * 0.6, r * 0.78, 0.45, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* rising stem */}
      <mesh position={[0, r * 1.95, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.85, 8]} />
        <meshStandardMaterial color="#cccccc" roughness={0.25} metalness={0.95} />
      </mesh>
      {/* handwheel rim */}
      <mesh position={[0, r * 2.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r * 0.78, 0.028, 8, 28]} />
        <meshStandardMaterial color={handwheelColor} roughness={0.45} metalness={0.55} />
      </mesh>
      {/* handwheel spokes */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3].map((a, i) => (
        <mesh
          key={i}
          position={[0, r * 2.55, 0]}
          rotation={[0, a, 0]}
        >
          <boxGeometry args={[r * 1.55, 0.018, 0.018]} />
          <meshStandardMaterial color={handwheelColor} roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      {/* hub nut */}
      <mesh position={[0, r * 2.55, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 6]} />
        <meshStandardMaterial color="#222" roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   4. BUTTERFLY VALVE — Wafer body, lever-actuated (notched plate)
============================================================================ */
export function ButterflyValve({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius = 0.35,
  bodyColor = VALVE_BODY,
  handleColor = HANDWHEEL_RED,
  open = true,
}: AccessoryBase & { bodyColor?: string; handleColor?: string; open?: boolean }) {
  const r = pipeRadius;
  return (
    <group position={position} rotation={rotation}>
      {/* wafer body */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.42, r * 1.42, 0.16, 18]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.7} />
      </mesh>
      {/* mating flanges */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.105, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 1.55, r * 1.55, 0.04, 18]} />
          <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
        </mesh>
      ))}
      {/* stem boss / neck */}
      <mesh position={[0, r * 1.55, 0]}>
        <cylinderGeometry args={[0.075, 0.085, 0.22, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      {/* notched indexing plate (for handle) */}
      <mesh position={[0, r * 1.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r * 0.6, r * 0.6, 0.045, 14]} />
        <meshStandardMaterial color="#3a3a38" roughness={0.55} metalness={0.7} />
      </mesh>
      {/* lever — pivots on stem; aligned with pipe = open */}
      <group position={[0, r * 1.78, 0]} rotation={[0, open ? 0 : Math.PI / 2, 0]}>
        <mesh position={[r * 0.7, 0, 0]}>
          <boxGeometry args={[r * 1.55, 0.04, 0.04]} />
          <meshStandardMaterial color={handleColor} roughness={0.45} metalness={0.5} />
        </mesh>
        {/* trigger / squeeze release */}
        <mesh position={[r * 1.4, 0.05, 0]}>
          <boxGeometry args={[0.12, 0.05, 0.04]} />
          <meshStandardMaterial color="#222" roughness={0.5} metalness={0.6} />
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
}: AccessoryBase & { bodyColor?: string; actuatorColor?: string; label?: string }) {
  const r = pipeRadius;
  return (
    <group position={position} rotation={rotation}>
      {/* wafer body */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.45, r * 1.45, 0.18, 18]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.7} />
      </mesh>
      {/* mating flanges */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.115, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 1.6, r * 1.6, 0.045, 18]} />
          <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
        </mesh>
      ))}
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
      <mesh position={[0.22, r * 1.6 + 0.45, 0.235]}>
        <cylinderGeometry args={[0.045, 0.045, 0.04, 14]} />
        <meshStandardMaterial color="#e0a418" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* status LED */}
      <mesh position={[-0.2, r * 1.6 + 0.58, 0.235]}>
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
  return (
    <group position={position} rotation={rotation}>
      {/* end flange L */}
      <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, 0.05, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* end flange R */}
      <mesh position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, 0.05, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
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
}: AccessoryBase & { bodyColor?: string }) {
  const r = pipeRadius;
  return (
    <group position={position} rotation={rotation}>
      {/* end flange L */}
      <mesh position={[-0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, 0.05, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* end flange R */}
      <mesh position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, 0.05, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
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
      {/* yellow ID band */}
      <mesh position={[0, r * 1.12, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.11, r * 1.11, 0.06, 16]} />
        <meshStandardMaterial color="#d6a624" roughness={0.65} metalness={0.3} />
      </mesh>
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
}: AccessoryBase & { handleColor?: string }) {
  const r = pipeRadius;
  return (
    <group position={position} rotation={rotation}>
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
      {/* lever along pipe axis (closed = perpendicular; here drawn closed) */}
      <mesh position={[0, -r - 0.18, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.04, 0.18, 0.025]} />
        <meshStandardMaterial color={handleColor} roughness={0.5} metalness={0.5} />
      </mesh>
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
  return (
    <group position={position} rotation={rotation}>
      {/* end flange L */}
      <mesh position={[-length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, 0.05, 16]} />
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
      <mesh position={[length / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 1.55, r * 1.55, 0.05, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.4} metalness={0.85} />
      </mesh>
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
