/**
 * End-suction centrifugal pump (hydronic) with scroll-style volute, RF flanges,
 * and optional factory paint (blue / gold / crimson).
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

type Triple = [number, number, number];

export type PumpPaint = 'blue' | 'gold' | 'crimson';

/* Coupling guard color — OSHA 1910.219 / ANSI Z535 SAFETY ORANGE.
   On every brand of process pump (Goulds, B&G, Peerless, Aurora, Patterson)
   the inboard coupling guard is painted bright safety orange so the spinning
   coupling cage is unmistakably a hazard zone. */
const GUARD_FRAME = '#e85518';        // safety orange (Pantone 1505 C-ish)
const GUARD_BAR = '#a83008';          // shadowed orange for bar shadows
const BASE = '#3a3a3a';               // dark factory enamel base-frame
const FLANGE_STEEL = '#8a8580';

const PALETTE: Record<
  PumpPaint,
  {
    volute: string;
    voluteDark: string;
    scroll: string;
    motor: string;
    motorFan: string;
    motorEnd: string;
  }
> = {
  /* B&G "Bell & Gossett blue" — saturated cobalt blue matches their VSC/VSCS
     hydronic circulator factory paint. */
  blue: {
    volute: '#1f4f8c',
    voluteDark: '#15386a',
    scroll: '#2a6abf',
    motor: '#1f4f8c',
    motorFan: '#152a4a',
    motorEnd: '#1a3a6e',
  },
  /* BALDOR-RELIANCE gold — warm amber-bronze industrial gold used on
     Super-E premium-efficiency TEFC motors that ship with Goulds / Bell &
     Gossett chiller pumps. Closer to RAL 1005 "Honey Yellow" / Pantone 124C
     with a distinct bronze warmth. The pump volute is painted to match
     (factory long-coupled package). */
  gold: {
    volute: '#d9a12a',                // Baldor bronze-gold — primary cast surface
    voluteDark: '#8a6414',             // deep shadowed castings / split-line pockets
    scroll: '#ecba3e',                 // scroll spiral — sun-side highlight
    motor: '#cf9824',                  // motor frame — slightly cooler than pump casting
    motorFan: '#3e2d08',               // dark olive cowl interior
    motorEnd: '#a37318',               // end-bell castings (darker amber)
  },
  /* Peerless / Patterson crimson option (kept for legacy callers). */
  crimson: {
    volute: '#9a2834',
    voluteDark: '#6a1822',
    scroll: '#b03848',
    motor: '#6a3040',
    motorFan: '#3a1820',
    motorEnd: '#7a2030',
  },
};

const FLANGE_THK = 0.055;

export type PumpHydraulicPorts = {
  Rp: number;
  voluteX: number;
  voluteRx: number;
  voluteRy: number;
  voluteRz: number;
  shaftY: number;
  /** Pipe-side mating face of suction flange (toward −X). */
  suctionPipeFaceX: number;
  /** Pipe-side mating face of discharge flange (toward +X). */
  dischargePipeFaceX: number;
  flangeDiscR: number;
};

/** Shared sizing / connection math — keep in sync with mesh layout in {@link EndSuctionHvacPump}. */
export function getPumpHydraulicPorts(branchPipeRadius: number, duty: 'chw' | 'cdw'): PumpHydraulicPorts {
  const scale = duty === 'cdw' ? 1.08 : 1.0;
  const Rp = branchPipeRadius * scale;
  /* Volute scaling — clamps sized for plants up to ~2000 tons (≈ 5000 GPM,
     400 HP class end-suction centrifugal). */
  const voluteRx = THREE.MathUtils.clamp(Rp * 2.85, 0.38, 0.78);
  const voluteRy = THREE.MathUtils.clamp(Rp * 2.05, 0.28, 0.58);
  const voluteRz = THREE.MathUtils.clamp(Rp * 2.35, 0.34, 0.64);
  const voluteX = Rp * 0.35;
  const shaftY = pumpShaftCenterlineY(branchPipeRadius, duty);
  const suctionPipeFaceX = voluteX + (-voluteRx * 0.92 - Rp * 0.72) - FLANGE_THK * 0.5;
  const dischargePipeFaceX = voluteX + (voluteRx * 0.95 + Rp * 1.55) + FLANGE_THK * 0.5;
  const flangeDiscR = Rp * 1.55;
  return { Rp, voluteX, voluteRx, voluteRy, voluteRz, shaftY, suctionPipeFaceX, dischargePipeFaceX, flangeDiscR };
}

/** Matches impeller / nozzle centerline for valve / pipe alignment.
 *  Includes the full skid stack: 200 mm housekeeping pad + 110 mm pump base. */
export function pumpShaftCenterlineY(branchPipeRadius: number, duty: 'chw' | 'cdw'): number {
  const scale = duty === 'cdw' ? 1.08 : 1.0;
  const Rp = branchPipeRadius * scale;
  const skidH = 0.20;       // concrete housekeeping pad height (8″)
  const baseT = 0.11;       // pump steel base-frame thickness
  return Math.max(skidH + baseT + Rp * 2.65, 0.78);
}

/** Baseplate footprint for the long-coupled pump/motor assembly. Long axis
 *  along Z (motor-to-pump), short axis along X (parallel to pipe flanges).
 *  Must match the math inside {@link EndSuctionHvacPump}. */
export function getPumpBaseFootprint(branchPipeRadius: number, duty: 'chw' | 'cdw'): {
  baseL: number;
  baseW: number;
  baseCenterZ: number;
} {
  const scale = duty === 'cdw' ? 1.08 : 1.0;
  const Rp = branchPipeRadius * scale;
  const voluteRz = THREE.MathUtils.clamp(Rp * 2.35, 0.34, 0.64);
  const motorLen = THREE.MathUtils.clamp(Rp * 4.6, 0.78, 1.18);
  const couplingFaceZ = voluteRz * 0.92;
  const COUPLING_GAP = Math.max(motorLen * 0.40, 0.44);
  const motorDEFaceZ = couplingFaceZ + COUPLING_GAP;
  const motorCenterZ = motorDEFaceZ + motorLen * 0.46;
  const assemblyZBack = -voluteRz - 0.18;
  const assemblyZFront = motorCenterZ + motorLen * 0.50 + Rp * 0.18;
  const baseW = Math.max(assemblyZFront - assemblyZBack + 0.12, Rp * 10.5);
  const baseCenterZ = (assemblyZBack + assemblyZFront) / 2;
  const baseL = THREE.MathUtils.clamp(Rp * 6.2, 1.20, 1.75);
  return { baseL, baseW, baseCenterZ };
}

function FlangedDisc({
  position,
  rotation,
  discR,
  color = FLANGE_STEEL,
}: {
  position: Triple;
  rotation: Triple;
  discR: number;
  color?: string;
}) {
  const boltR = discR * 0.72;
  const n = 8;
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[discR, discR, FLANGE_THK, 26]} />
        <meshStandardMaterial color={color} roughness={0.36} metalness={0.84} />
      </mesh>
      <mesh position={[0, FLANGE_THK * 0.25, 0]}>
        <cylinderGeometry args={[discR * 0.78, discR * 0.78, 0.012, 22]} />
        <meshStandardMaterial color="#a8a4a0" roughness={0.32} metalness={0.9} />
      </mesh>
      {Array.from({ length: n }).map((_, i) => {
        const a = (i / n) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[FLANGE_THK * 0.5 - 0.015, Math.cos(a) * boltR, Math.sin(a) * boltR]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.022, 0.02, 0.045, 6]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.55} metalness={0.75} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Horizontal pipe + raised-face discs (flange-to-flange). */
export function FlangedSpool({
  x0,
  x1,
  y,
  z = 0,
  pipeRadius,
  pipeColor,
  rotation = [0, 0, Math.PI / 2],
}: {
  x0: number;
  x1: number;
  y: number;
  z?: number;
  pipeRadius: number;
  pipeColor: string;
  rotation?: Triple;
}) {
  const a = Math.min(x0, x1);
  const b = Math.max(x0, x1);
  const len = Math.max(b - a, 0.04);
  const cx = (a + b) / 2;
  const discR = pipeRadius * 1.52;
  return (
    <group>
      <mesh position={[cx, y, z]} rotation={rotation} castShadow receiveShadow>
        <cylinderGeometry args={[pipeRadius * 1.02, pipeRadius * 1.02, len, 18]} />
        <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
      </mesh>
      <FlangedDisc position={[a, y, z]} rotation={rotation} discR={discR} />
      <FlangedDisc position={[b, y, z]} rotation={rotation} discR={discR} />
    </group>
  );
}

export interface EndSuctionHvacPumpProps {
  position?: Triple;
  rotation?: Triple;
  pipeRadius: number;
  duty: 'chw' | 'cdw';
  running?: boolean;
  name?: string;
  tag?: string;
  /** Factory paint — default CHW blue, CDW gold. */
  paint?: PumpPaint;
}

export function EndSuctionHvacPump({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  pipeRadius,
  duty,
  running = false,
  name = 'pump:end-suction',
  tag = 'PUMP',
  paint: paintProp,
}: EndSuctionHvacPumpProps) {
  const paint: PumpPaint = paintProp ?? (duty === 'chw' ? 'blue' : 'gold');
  const col = PALETTE[paint];

  const ports = useMemo(() => getPumpHydraulicPorts(pipeRadius, duty), [pipeRadius, duty]);
  const { Rp, voluteX, voluteRx, voluteRy, voluteRz, shaftY, suctionPipeFaceX, dischargePipeFaceX, flangeDiscR } =
    ports;

  /* Sized for ≈ 1500-ton plant duty (≈ 350 HP TEFC induction motor):
       motorR  → motor frame OD scaled with Rp, capped at 460 mm OD
       motorLen → 1140 mm max (NEMA 449T frame envelope)
       baseL/W → fabricated channel-iron base + 6-pole vibration isolators
     NOTE: the baseplate's LONG axis now runs along Z (motor-to-pump direction)
     matching the shaft centerline. baseL is therefore the SHORT dimension (X,
     parallel to the suction/discharge pipes) and baseW is the LONG dimension
     (Z, from behind the volute to behind the motor NDE fan). */
  const motorR = THREE.MathUtils.clamp(Rp * 1.95, 0.28, 0.46);
  const motorLen = THREE.MathUtils.clamp(Rp * 4.6, 0.78, 1.18);
  const baseL = THREE.MathUtils.clamp(Rp * 6.2, 1.20, 1.75);
  const baseT = 0.11;
  /* The base must sit ON TOP of the housekeeping pad — pumpShaftCenterlineY()
     above includes a 200 mm skid stack, so the pump base-frame Y is offset by
     the same amount. Keep this in sync with PumpAssemblies.SKID_HEIGHT. */
  const baseElev = Math.max(shaftY - Rp * 2.65 - baseT, 0);

  const couplingRef = useRef<THREE.Group>(null);
  const fanBladesRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (running) {
      /* Coupling assembly (hubs + spacer) rotates around the shaft axis (Z). */
      if (couplingRef.current) couplingRef.current.rotation.z += dt * 38;
      /* Fan shares the shaft — spins at the same rate about Z. */
      if (fanBladesRef.current) fanBladesRef.current.rotation.z += dt * 38;
    }
  });

  /* Long-coupled layout — the pump bearing housing terminates at couplingFaceZ,
     then there is an OPEN, VISIBLE span of polished steel shaft + spacer
     coupling, then the motor drive-end face begins at motorDEFaceZ. On real
     HVAC frame-mounted pumps this span is ~350–450 mm so the coupling can be
     unbolted and the pump pulled back without disturbing the motor. */
  const couplingFaceZ = voluteRz * 0.92;
  const COUPLING_GAP = Math.max(motorLen * 0.40, 0.44);
  const motorDEFaceZ = couplingFaceZ + COUPLING_GAP;
  const motorCenterZ = motorDEFaceZ + motorLen * 0.46;
  const couplingCenterZ = couplingFaceZ + COUPLING_GAP * 0.5;
  /* Shaft diameter scales with pump size (1018 cold-rolled steel, polished).
     Clamped to a reasonable min so small duties still show a visible shaft. */
  const shaftR = Math.max(Rp * 0.22, 0.042);
  const hubR = shaftR * 2.05;
  const hubLen = THREE.MathUtils.clamp(COUPLING_GAP * 0.22, 0.06, 0.14);
  const spacerR = shaftR * 1.55;
  /* Reserve ~60 mm of BARE polished shaft on each side of the coupling
     (between bearing-frame face and pump hub, and between motor DE and motor
     hub). This is what the user sees between the pump and the motor — the
     iconic "exposed shaft" span of a frame-mounted pump. */
  const exposedShaftEach = 0.060;
  const spacerLen = Math.max(
    COUPLING_GAP - hubLen * 2 - exposedShaftEach * 2,
    0.05,
  );

  /* Baseplate long-axis (Z) span — wraps from the volute's back side out to
     behind the motor NDE fan so the motor feet actually sit on the steel base
     (no cantilever). The base is then re-centered in Z to match. */
  const assemblyZBack = -voluteRz - 0.18;
  const assemblyZFront = motorCenterZ + motorLen * 0.50 + Rp * 0.18;
  const baseW = Math.max(assemblyZFront - assemblyZBack + 0.12, Rp * 10.5);
  const baseCenterZ = (assemblyZBack + assemblyZFront) / 2;

  const footPrint = useMemo(() => {
    return { w: baseW, l: baseL, halfW: baseW / 2, halfL: baseL / 2 };
  }, [baseW, baseL]);

  /* Volute scroll: torus arc in XZ (horizontal), opening toward +X discharge. */
  const scrollMajor = voluteRx * 1.05;
  const scrollTube = THREE.MathUtils.clamp(Rp * 0.82, 0.11, 0.2);
  const scrollArc = Math.PI * 1.35;

  return (
    <group name={name} position={position} rotation={rotation}>
      {/* ──────────────────────────────────────────────────────────────────
          BASEPLATE GROUP — centered in Z on the pump+motor assembly (not on
          the volute). The long axis runs along Z (motor-to-pump), the short
          axis along X (parallel to the pipes). All grout / frame / rails /
          bolts / isolators live inside this group so they shift together.
          ────────────────────────────────────────────────────────────────── */}
      <group position={[0, 0, baseCenterZ]}>
        {/* Grout collar atop the housekeeping pad (filled inside the base channel).
            Note: boxGeometry args are [X, Y, Z] — short-axis first. */}
        <mesh position={[0, baseElev + baseT * 0.5, 0]} receiveShadow castShadow>
          <boxGeometry args={[footPrint.l + 0.12, baseT, footPrint.w + 0.12]} />
          <meshStandardMaterial color="#6a6864" roughness={0.92} metalness={0.04} />
        </mesh>

        {/* Steel channel-iron base-frame (factory-painted to match volute) */}
        <mesh position={[0, baseElev + baseT + 0.04, 0]} castShadow receiveShadow>
          <boxGeometry args={[footPrint.l, 0.08, footPrint.w]} />
          <meshStandardMaterial color={BASE} roughness={0.72} metalness={0.35} />
        </mesh>
        {/* Two longitudinal mounting rails running along the LONG axis (Z).
            Rails sit at the ±X edges of the base-frame. */}
        {[-footPrint.halfL + 0.12, footPrint.halfL - 0.12].map((lx, i) => (
          <mesh key={`rail-${i}`} position={[lx, baseElev + baseT + 0.09, 0]} castShadow>
            <boxGeometry args={[0.08, 0.06, footPrint.w - 0.06]} />
            <meshStandardMaterial color="#3f4246" roughness={0.75} metalness={0.45} />
          </mesh>
        ))}
        {/* Hex anchor-bolt heads tying the base-frame to the J-bolt cage.
            Expanded bolt pattern: 4 corners + 4 mid-span (2 on long edges, 2
            on short edges) so the long baseplate is properly tied down. */}
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].map(([sx, sz], bi) => (
          <mesh
            key={`bolt-${bi}`}
            position={[
              sx * (footPrint.halfL - 0.14),
              baseElev + baseT + 0.085,
              sz * (footPrint.halfW - 0.18),
            ]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.028, 0.024, 0.055, 8]} />
            <meshStandardMaterial color="#9a9690" roughness={0.4} metalness={0.75} />
          </mesh>
        ))}
        {/* Spring vibration isolators (eight per skid — matching the bolt pattern).
            Steel housing with visible coil spring inside, between base channel and grout. */}
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ].map(([sx, sz], ii) => {
          const ix = sx * (footPrint.halfL - 0.18);
          const iz = sz * (footPrint.halfW - 0.14);
          return (
            <group key={`iso-${ii}`} position={[ix, baseElev + baseT + 0.005, iz]}>
              <mesh position={[0, -0.045, 0]} castShadow>
                <cylinderGeometry args={[0.052, 0.052, 0.022, 14]} />
                <meshStandardMaterial color="#1a1c20" roughness={0.55} metalness={0.5} />
              </mesh>
              <mesh position={[0, -0.075, 0]}>
                <torusGeometry args={[0.034, 0.006, 6, 14]} />
                <meshStandardMaterial color="#7a7e84" roughness={0.4} metalness={0.85} />
              </mesh>
            </group>
          );
        })}
        {/* ── MOTOR-END SOLEPLATE SHIMS ── four machined shims under the motor
            feet (standard long-coupled practice so the motor can be shimmed
            flat to the pump shaft without touching the baseplate). */}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`shim-${sx}-${sz}`}
              position={[
                sx * motorR * 0.65,
                baseElev + baseT + 0.105,
                (motorCenterZ - baseCenterZ) + sz * motorLen * 0.35,
              ]}
              castShadow
            >
              <boxGeometry args={[0.11, 0.012, 0.09]} />
              <meshStandardMaterial color="#8e8a84" roughness={0.42} metalness={0.65} />
            </mesh>
          )),
        )}
      </group>
      {/* Pump-end center pedestal — supports the volute directly. Sized to the
          VOLUTE footprint (not the full baseplate) so it's a compact cast-iron
          column under the pump body only. */}
      <mesh
        position={[voluteX - voluteRx * 0.05, baseElev + baseT + 0.20, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[voluteRx * 0.95, 0.30, voluteRz * 1.25]} />
        <meshStandardMaterial color={col.voluteDark} roughness={0.6} metalness={0.55} />
      </mesh>
      {/* Tapered transition from the pedestal up into the volute */}
      <mesh
        position={[voluteX - voluteRx * 0.05, baseElev + baseT + 0.42, 0]}
        castShadow
      >
        <boxGeometry args={[voluteRx * 0.65, 0.10, voluteRz * 0.90]} />
        <meshStandardMaterial color={col.voluteDark} roughness={0.55} metalness={0.6} />
      </mesh>

      {/* ── Volute assembly (scroll + eye + tongue / discharge) ── */}
      <group position={[voluteX, shaftY, 0]}>
        {/* Spiral scroll — torus in XZ plane */}
        <mesh
          position={[scrollMajor * 0.08, 0, 0]}
          rotation={[Math.PI / 2, 0, -scrollArc * 0.5 + 0.15]}
          castShadow
          receiveShadow
        >
          <torusGeometry args={[scrollMajor, scrollTube, 22, 48, scrollArc]} />
          <meshStandardMaterial color={col.scroll} roughness={0.48} metalness={0.58} />
        </mesh>
        {/* Impeller eye / hub (suction side recess) */}
        <mesh position={[-voluteRx * 0.55, 0, 0]} castShadow>
          <sphereGeometry args={[Rp * 1.05, 20, 16]} />
          <meshStandardMaterial color={col.voluteDark} roughness={0.55} metalness={0.55} />
        </mesh>
        {/* Main volute housing (wraps scroll + tongue) — cast-iron ellipsoidal
            casing scaled so the impeller eye sits near -X and the tongue peels
            out toward +X. */}
        <mesh castShadow receiveShadow scale={[voluteRx * 0.92, voluteRy * 1.08, voluteRz * 1.02]}>
          <sphereGeometry args={[1, 32, 22]} />
          <meshStandardMaterial color={col.volute} roughness={0.46} metalness={0.66} />
        </mesh>
        {/* ── HORIZONTAL SPLIT-LINE FLANGE ── cast pads that bolt the upper and
            lower halves of the casing together at the shaft centerline. The
            mating face is a rectangular ring running around the XZ equator of
            the volute — the single most visually recognizable feature of a
            split-case / end-suction centrifugal pump. */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[voluteRx * 2.0, 0.038, voluteRz * 2.12]} />
          <meshStandardMaterial color={col.voluteDark} roughness={0.5} metalness={0.62} />
        </mesh>
        {/* Bolt heads around the split-line flange perimeter (hex-grade SAE
            studs, visible from the side aisle). 12 bolts total — 6 per long
            edge — follows NEMA / ASME B16.5 bolt spacing for this casing. */}
        {Array.from({ length: 12 }).map((_, bi) => {
          const ratio = bi / 11;             // 0..1 along perimeter
          const half = Math.floor(bi / 6);    // 0 = −Z edge, 1 = +Z edge
          const along = (ratio * 2) % 1;      // 0..1 along one edge
          const zEdge = (half === 0 ? -1 : 1) * voluteRz * 0.98;
          const xPos = (along - 0.5) * voluteRx * 1.82;
          return (
            <mesh
              key={`split-bolt-${bi}`}
              position={[xPos, 0.022, zEdge]}
              rotation={[0, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.020, 0.020, 0.028, 6]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.45} metalness={0.82} />
            </mesh>
          );
        })}
        {/* ── BACK COVER / STUFFING BOX cover on the motor side of the volute ──
            Cast-iron disc bolted to the casing with an evenly spaced ring of
            studs — the "backhead" visible through the baseplate gap. */}
        <group position={[0, 0, voluteRz * 0.92]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[voluteRy * 1.05, voluteRy * 1.05, 0.055, 28]} />
            <meshStandardMaterial color={col.voluteDark} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.028]}>
            <cylinderGeometry args={[voluteRy * 0.95, voluteRy * 0.95, 0.010, 28]} />
            <meshStandardMaterial color={col.volute} roughness={0.52} metalness={0.58} />
          </mesh>
          {/* 10-bolt ring around the back cover */}
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <mesh
                key={`bc-bolt-${i}`}
                position={[Math.cos(a) * voluteRy * 0.90, Math.sin(a) * voluteRy * 0.90, 0.034]}
                castShadow
              >
                <cylinderGeometry args={[0.018, 0.018, 0.024, 6]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.45} metalness={0.82} />
              </mesh>
            );
          })}
        </group>
        {/* Cutwater / tongue — wedges flow into discharge nozzle */}
        <mesh position={[voluteRx * 0.42, -voluteRy * 0.12, 0]} rotation={[0, 0, -0.35]} castShadow>
          <boxGeometry args={[Rp * 1.1, Rp * 0.55, Rp * 1.45]} />
          <meshStandardMaterial color={col.voluteDark} roughness={0.52} metalness={0.6} />
        </mesh>
        {/* Suction nozzle barrel */}
        <mesh position={[suctionPipeFaceX + FLANGE_THK * 0.5 + Rp * 0.34, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[Rp * 1.05, Rp * 1.1, Rp * 0.62, 18]} />
          <meshStandardMaterial color={col.volute} roughness={0.48} metalness={0.62} />
        </mesh>
        <FlangedDisc
          position={[suctionPipeFaceX + FLANGE_THK * 0.5, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          discR={flangeDiscR}
        />
        {/* Discharge nozzle barrel */}
        <mesh position={[dischargePipeFaceX - FLANGE_THK * 0.5 - Rp * 0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[Rp * 1.04, Rp * 1.04, Rp * 1.22, 18]} />
          <meshStandardMaterial color={col.volute} roughness={0.46} metalness={0.64} />
        </mesh>
        <FlangedDisc
          position={[dischargePipeFaceX - FLANGE_THK * 0.5, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          discR={flangeDiscR}
        />
        {/* Top-of-volute boss (cast pad with vent / instrument tap) */}
        <mesh position={[0, voluteRy * 0.82, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.12, 8]} />
          <meshStandardMaterial color="#6a6862" roughness={0.45} metalness={0.55} />
        </mesh>
        {/* ── CAST-IN MANUFACTURER LABEL on the front of the volute ──
            Goulds / Bell & Gossett both cast their brand into the volute
            front-facing pad so it's visible from the operator aisle. */}
        <group position={[voluteRx * 0.05, 0, voluteRz * 0.92]}>
          <mesh castShadow>
            <boxGeometry args={[voluteRx * 0.85, voluteRy * 0.55, 0.012]} />
            <meshStandardMaterial color={col.voluteDark} roughness={0.55} metalness={0.5} />
          </mesh>
          <Text
            position={[0, voluteRy * 0.10, 0.010]}
            fontSize={voluteRy * 0.30}
            color="#1a1a1a"
            anchorX="center"
            anchorY="middle"
            fontWeight={700}
            outlineWidth={0.003}
            outlineColor={col.scroll}
          >
            {paint === 'gold' ? 'GOULDS' : paint === 'blue' ? 'B&G' : 'PEERLESS'}
          </Text>
          <Text
            position={[0, -voluteRy * 0.18, 0.010]}
            fontSize={voluteRy * 0.14}
            color="#0a0a0a"
            anchorX="center"
            anchorY="middle"
          >
            {paint === 'gold' ? '3196 MTX' : paint === 'blue' ? 'VSC-S' : 'AE-F'}
          </Text>
        </group>
        {/* ── Casing relief / air-vent valve at the high-point of the volute ── */}
        <group position={[0, voluteRy * 0.95, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.026, 0.026, 0.080, 10]} />
            <meshStandardMaterial color={col.voluteDark} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.060, 0]}>
            <boxGeometry args={[0.085, 0.030, 0.030]} />
            <meshStandardMaterial color="#3a3c40" roughness={0.55} metalness={0.6} />
          </mesh>
          <mesh position={[0.075, 0.060, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.040, 0.005, 6, 14]} />
            <meshStandardMaterial color="#c83018" roughness={0.42} metalness={0.4} />
          </mesh>
        </group>
        {/* ── Two lifting eyebolts on the volute top (ASME-compliant) ── */}
        {[-voluteRx * 0.45, voluteRx * 0.30].map((ex, ei) => (
          <group key={`eyebolt-${ei}`} position={[ex, voluteRy * 0.90, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.020, 0.020, 0.045, 8]} />
              <meshStandardMaterial color="#4a4a48" roughness={0.42} metalness={0.78} />
            </mesh>
            <mesh position={[0, 0.045, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <torusGeometry args={[0.038, 0.012, 8, 18]} />
              <meshStandardMaterial color="#4a4a48" roughness={0.42} metalness={0.78} />
            </mesh>
          </group>
        ))}
        {/* ── Suction-nozzle pressure tap stub (PG-S) and gauge cock ── */}
        <group position={[suctionPipeFaceX + Rp * 0.22, Rp * 1.15, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.10, 10]} />
            <meshStandardMaterial color={col.voluteDark} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.045, 0.030, 0.045]} />
            <meshStandardMaterial color="#5a5c60" roughness={0.5} metalness={0.55} />
          </mesh>
          <mesh position={[0.04, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.018, 0.004, 6, 12]} />
            <meshStandardMaterial color="#cc1818" roughness={0.4} metalness={0.4} />
          </mesh>
        </group>
        {/* ── Discharge-nozzle pressure tap stub (PG-D) and gauge cock ── */}
        <group position={[dischargePipeFaceX - Rp * 0.30, Rp * 1.15, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.10, 10]} />
            <meshStandardMaterial color={col.voluteDark} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.045, 0.030, 0.045]} />
            <meshStandardMaterial color="#5a5c60" roughness={0.5} metalness={0.55} />
          </mesh>
          <mesh position={[0.04, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.018, 0.004, 6, 12]} />
            <meshStandardMaterial color="#cc1818" roughness={0.4} metalness={0.4} />
          </mesh>
        </group>
        {/* ── Low-point drain boss at the bottom of the volute ── */}
        <group position={[voluteX === 0 ? 0 : 0, -voluteRy * 0.90, 0]}>
          <mesh castShadow rotation={[Math.PI, 0, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.060, 10]} />
            <meshStandardMaterial color={col.voluteDark} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, -0.040, 0]} castShadow>
            <cylinderGeometry args={[0.040, 0.040, 0.020, 6]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.55} metalness={0.7} />
          </mesh>
        </group>
        {/* ── Mechanical seal flush / gland plate visible behind the impeller eye ── */}
        <mesh position={[-voluteRx * 0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[Rp * 1.32, Rp * 1.35, 0.045, 22]} />
          <meshStandardMaterial color="#7a7a78" roughness={0.4} metalness={0.78} />
        </mesh>
        {/* gland-plate studs (4) */}
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <mesh
              key={`gland-${i}`}
              position={[
                -voluteRx * 0.94,
                Math.cos(a) * Rp * 1.18,
                Math.sin(a) * Rp * 1.18,
              ]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.014, 0.014, 0.060, 6]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.75} />
            </mesh>
          );
        })}
        {/* ── BEARING FRAME (inboard between volute back cover and coupling) ──
            Cast-iron frame that carries the pump-shaft thrust and radial
            bearings (inboard = sleeve, outboard = angular-contact ball). The
            back face of this frame ends at couplingFaceZ so the shaft can
            exit cleanly into the open coupling span. */}
        <group position={[0, 0, (voluteRz * 0.92 + couplingFaceZ) * 0.5]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[Rp * 1.10, Rp * 1.32, couplingFaceZ - voluteRz * 0.92, 26]} />
            <meshStandardMaterial color={col.voluteDark} roughness={0.5} metalness={0.6} />
          </mesh>
          {/* Cooling fins on the bearing frame (3 radial ribs)
              — only place fins if the housing is long enough to show them. */}
          {(couplingFaceZ - voluteRz * 0.92) > 0.06 && [
            -0.04, 0, 0.04,
          ].map((zf, fi) => (
            <mesh key={`bfin-${fi}`} position={[0, 0, zf]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[Rp * 1.18, Rp * 1.18, 0.010, 28]} />
              <meshStandardMaterial color={col.voluteDark} roughness={0.55} metalness={0.55} />
            </mesh>
          ))}
          {/* Grease zerks on top (inboard / outboard bearings) */}
          {[-0.05, 0.05].map((zg, gi) => (
            <mesh key={`zerk-${gi}`} position={[0, Rp * 1.28, zg]} castShadow>
              <cylinderGeometry args={[0.014, 0.014, 0.030, 8]} />
              <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.7} />
            </mesh>
          ))}
          {/* Oiler sight-glass on the side (constant-level oiler) */}
          <mesh position={[Rp * 1.20, -Rp * 0.15, 0]} castShadow>
            <sphereGeometry args={[0.028, 12, 10]} />
            <meshStandardMaterial
              color="#aed0d4"
              roughness={0.15}
              metalness={0.2}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      </group>

      {/* ── EXPOSED MOTOR / PUMP SHAFT ── polished 1018 cold-rolled steel,
          the iconic bare-shaft span of a frame-mounted long-coupled pump.
          Two sub-shafts (pump shaft + motor shaft), each stopped at the
          OUTER face of its coupling hub. The span between the two hubs is
          occupied by the spacer sleeve. */}
      {(() => {
        const pumpHubOuterZ = couplingCenterZ - (spacerLen * 0.5 + hubLen);
        const motorHubOuterZ = couplingCenterZ + (spacerLen * 0.5 + hubLen);
        const pumpShaftLen = Math.max(pumpHubOuterZ - couplingFaceZ, 0.02);
        const motorShaftLen = Math.max(motorDEFaceZ - motorHubOuterZ, 0.02);
        return (
          <group position={[voluteX, shaftY, 0]}>
            {/* Pump-side bare polished shaft: bearing frame → pump hub */}
            <mesh
              position={[0, 0, (couplingFaceZ + pumpHubOuterZ) * 0.5]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[shaftR, shaftR, pumpShaftLen, 18]} />
              <meshStandardMaterial
                color="#c8cacc"
                roughness={0.16}
                metalness={0.95}
              />
            </mesh>
            {/* Motor-side bare polished shaft: motor DE → motor hub */}
            <mesh
              position={[0, 0, (motorHubOuterZ + motorDEFaceZ) * 0.5]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[shaftR, shaftR, motorShaftLen, 18]} />
              <meshStandardMaterial
                color="#c8cacc"
                roughness={0.16}
                metalness={0.95}
              />
            </mesh>
            {/* Key-way slot on the pump-side shaft (visible rectangular cut) */}
            <mesh
              position={[0, shaftR * 0.92, pumpHubOuterZ - 0.025]}
              castShadow
            >
              <boxGeometry args={[0.008, 0.008, 0.032]} />
              <meshStandardMaterial color="#3a3a3a" roughness={0.55} metalness={0.7} />
            </mesh>
            {/* Key-way slot on the motor-side shaft */}
            <mesh
              position={[0, shaftR * 0.92, motorHubOuterZ + 0.025]}
              castShadow
            >
              <boxGeometry args={[0.008, 0.008, 0.032]} />
              <meshStandardMaterial color="#3a3a3a" roughness={0.55} metalness={0.7} />
            </mesh>
          </group>
        );
      })()}

      {/* ── SPACER COUPLING ── Falk Steelflex / Lovejoy-style spacer coupling:
          two tapered hubs keyed to the pump and motor shafts, connected by a
          removable spacer sleeve. Spins with the shaft when the pump runs so
          the operator can see rotation through the guard windows. */}
      <group ref={couplingRef} position={[voluteX, shaftY, couplingCenterZ]}>
        {/* Pump-side hub — tapered cone outward toward the bearing frame */}
        <mesh
          position={[0, 0, -(spacerLen * 0.5 + hubLen * 0.5)]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[hubR * 0.78, hubR, hubLen, 18]} />
          <meshStandardMaterial color="#5a5c5e" roughness={0.32} metalness={0.85} />
        </mesh>
        {/* Motor-side hub — mirrored taper */}
        <mesh
          position={[0, 0, spacerLen * 0.5 + hubLen * 0.5]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[hubR, hubR * 0.78, hubLen, 18]} />
          <meshStandardMaterial color="#5a5c5e" roughness={0.32} metalness={0.85} />
        </mesh>
        {/* Spacer sleeve — the removable mid-section (drop-out for maintenance) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[spacerR, spacerR, spacerLen, 18]} />
          <meshStandardMaterial color="#7a7c7e" roughness={0.3} metalness={0.9} />
        </mesh>
        {/* Six bolt-heads on each hub face (visible through the guard louvers) */}
        {[-(spacerLen * 0.5), spacerLen * 0.5].map((hz, hi) =>
          Array.from({ length: 6 }).map((_, bi) => {
            const a = (bi / 6) * Math.PI * 2;
            return (
              <mesh
                key={`cp-bolt-${hi}-${bi}`}
                position={[Math.cos(a) * hubR * 0.72, Math.sin(a) * hubR * 0.72, hz]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.012, 0.012, 0.018, 6]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.75} />
              </mesh>
            );
          }),
        )}
        {/* Drive key visible on the motor-hub face (standard square key) */}
        <mesh position={[0, hubR * 0.85, spacerLen * 0.5 + hubLen * 0.95]}>
          <boxGeometry args={[0.012, 0.012, 0.030]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.75} />
        </mesh>
      </group>

      <group position={[voluteX, shaftY, motorCenterZ]}>
        {/* ── Motor frame (TEFC induction, NEMA 449T-class for ~350 HP) ──
            Cast-iron stator housing painted to match the pump volute — Goulds
            ships their close-coupled units with the motor and pump in the same
            paint code so the package looks integrated. */}
        <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[motorR, motorR, motorLen * 0.92, 32]} />
          <meshStandardMaterial color={col.motor} roughness={0.40} metalness={0.42} />
        </mesh>
        {/* ── Axial cooling fins running the length of the motor frame.
            Real TEFC frames have 16–24 longitudinal radial ribs that triple
            the convective surface area for the rear-mounted fan to push air
            across. Each fin is a thin radial vane standing about 12% of the
            frame radius proud. ── */}
        {Array.from({ length: 18 }).map((_, fi) => {
          const a = (fi / 18) * Math.PI * 2;
          return (
            <mesh
              key={`mfin-${fi}`}
              position={[Math.cos(a) * motorR * 1.06, Math.sin(a) * motorR * 1.06, 0]}
              rotation={[0, 0, a + Math.PI / 2]}
              castShadow
            >
              <boxGeometry args={[0.012, motorR * 0.22, motorLen * 0.78]} />
              <meshStandardMaterial color={col.motor} roughness={0.5} metalness={0.4} />
            </mesh>
          );
        })}
        {/* Two factory-applied black banding rings (frame stiffeners) */}
        {[-motorLen * 0.30, motorLen * 0.18].map((oz, ri) => (
          <mesh
            key={`mband-${ri}`}
            position={[0, 0, oz]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[motorR * 1.13, motorR * 1.13, 0.028, 36]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.35} />
          </mesh>
        ))}
        {/* ── Drive-end (DE) bearing end-bell with shaft seal ── */}
        <mesh position={[0, 0, -motorLen * 0.46]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[motorR * 1.06, motorR * 1.00, Rp * 0.55, 24]} />
          <meshStandardMaterial color={col.motorEnd} roughness={0.5} metalness={0.55} />
        </mesh>
        {/* DE end-bell ribs (cast-in radial ribs around the bearing housing) */}
        {Array.from({ length: 8 }).map((_, ri) => {
          const a = (ri / 8) * Math.PI * 2;
          return (
            <mesh
              key={`de-rib-${ri}`}
              position={[
                Math.cos(a) * motorR * 0.75,
                Math.sin(a) * motorR * 0.75,
                -motorLen * 0.50,
              ]}
              rotation={[0, 0, a]}
              castShadow
            >
              <boxGeometry args={[motorR * 0.42, 0.018, 0.018]} />
              <meshStandardMaterial color={col.motorEnd} roughness={0.55} metalness={0.5} />
            </mesh>
          );
        })}
        {/* ── Non-drive-end (NDE) fan COWL — open wire-guard cage that keeps
            fingers out but lets the user see the fan blades spinning behind
            it. Consists of:
              • A thin outer rim ring (no solid sheet — just the lip)
              • 12 radial spokes running to the centre hub
              • 3 concentric wire rings tying the spokes together
            The back face has NO solid plate so the fan is fully visible. ── */}
        <group position={[0, 0, motorLen * 0.50]}>
          {/* Outer rim — thin hoop, open-faced */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[motorR * 1.07, motorR * 1.05, 0.012, 32, 1, false]} />
            <meshStandardMaterial
              color={col.motorFan}
              roughness={0.55}
              metalness={0.55}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Mounting lip at the motor end-bell face */}
          <mesh position={[0, 0, -Rp * 0.26]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[motorR * 1.07, motorR * 1.05, 0.010, 32, 1, false]} />
            <meshStandardMaterial color={col.motorFan} roughness={0.55} metalness={0.55} />
          </mesh>
          {/* 6 radial wire spokes — fewer spokes = bigger open sectors */}
          {Array.from({ length: 6 }).map((_, bi) => {
            const a = (bi / 6) * Math.PI * 2;
            return (
              <mesh
                key={`cowl-spoke-${bi}`}
                position={[Math.cos(a) * motorR * 0.54, Math.sin(a) * motorR * 0.54, Rp * 0.28]}
                rotation={[0, 0, a]}
                castShadow
              >
                <boxGeometry args={[motorR * 1.08, 0.007, 0.007]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.5} />
              </mesh>
            );
          })}
          {/* 2 concentric wire rings — only mid and outer, leaves big open centre */}
          {[0.55, 0.82].map((rr, ci) => (
            <mesh
              key={`cowl-ring-${ci}`}
              position={[0, 0, Rp * 0.28]}
            >
              <torusGeometry args={[motorR * rr, 0.005, 6, 36]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.5} />
            </mesh>
          ))}
          {/* Centre hub disc — small solid disc at the axis */}
          <mesh position={[0, 0, Rp * 0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[motorR * 0.10, motorR * 0.10, 0.016, 14]} />
            <meshStandardMaterial color={col.motorFan} roughness={0.5} metalness={0.6} />
          </mesh>
          {/* ── ROTATING FAN — visible blades inside the cowl that spin with
              the shaft. 6 sheet-metal blades pitched forward like a real
              centrifugal motor cooling fan. ── */}
          <group ref={fanBladesRef} position={[0, 0, Rp * 0.10]}>
            {/* Hub */}
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[motorR * 0.20, motorR * 0.20, Rp * 0.18, 14]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.6} />
            </mesh>
            {/* 6 fan blades */}
            {Array.from({ length: 6 }).map((_, bi) => {
              const a = (bi / 6) * Math.PI * 2;
              return (
                <mesh
                  key={`fan-blade-${bi}`}
                  position={[Math.cos(a) * motorR * 0.50, Math.sin(a) * motorR * 0.50, 0]}
                  rotation={[Math.PI / 12, 0, a + Math.PI / 2]}
                  castShadow
                >
                  <boxGeometry args={[motorR * 0.62, 0.008, Rp * 0.30]} />
                  <meshStandardMaterial color="#3a3a3a" roughness={0.55} metalness={0.55} />
                </mesh>
              );
            })}
          </group>
        </group>
        {/* ── Lifting eyebolt on top of the motor (forged, 5/8″ shoulder eye) ── */}
        <group position={[0, motorR * 1.04, motorLen * 0.05]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.050, 8]} />
            <meshStandardMaterial color="#4a4a48" roughness={0.42} metalness={0.78} />
          </mesh>
          <mesh position={[0, 0.050, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.045, 0.014, 8, 18]} />
            <meshStandardMaterial color="#4a4a48" roughness={0.42} metalness={0.78} />
          </mesh>
        </group>
        {/* ── Conduit/terminal box (NEMA T-box) on the motor side ── */}
        <group position={[motorR * 0.95, motorR * 0.55, -motorLen * 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[0.16, 0.18, 0.22]} />
            <meshStandardMaterial color={col.voluteDark} roughness={0.5} metalness={0.55} />
          </mesh>
          {/* lid screws (4 corners) */}
          {[
            [-0.06, 0.07],
            [ 0.06, 0.07],
            [-0.06,-0.07],
            [ 0.06,-0.07],
          ].map(([dy, dz], si) => (
            <mesh key={`tb-screw-${si}`} position={[0.082, dy, dz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, 0.005, 6]} />
              <meshStandardMaterial color="#2a2a2a" />
            </mesh>
          ))}
          {/* Conduit hub on top, pointing toward VFD */}
          <mesh position={[0, 0.10, 0]}>
            <cylinderGeometry args={[0.040, 0.040, 0.060, 12]} />
            <meshStandardMaterial color="#7a7e84" roughness={0.5} metalness={0.55} />
          </mesh>
        </group>
        {/* ── Manufacturer nameplate (anodized aluminum) on motor side ── */}
        <mesh position={[motorR * 0.98, -motorR * 0.05, motorLen * 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.28, 0.16, 0.008]} />
          <meshStandardMaterial color="#d4d0c4" roughness={0.55} metalness={0.25} />
        </mesh>
        <Text
          position={[motorR * 1.005, -motorR * 0.01, motorLen * 0.05]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.040}
          color="#0a0a0a"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
          maxWidth={0.24}
        >
          {tag}
        </Text>
        <Text
          position={[motorR * 1.005, -motorR * 0.10, motorLen * 0.05]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.022}
          color="#222222"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.24}
        >
          350 HP · 1780 RPM · 460V · 3PH
        </Text>
        {/* Motor service-end grease zerk */}
        <mesh position={[motorR * 0.55, motorR * 0.95, -motorLen * 0.42]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.030, 8]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.7} />
        </mesh>
      </group>

      {/* ── COUPLING GUARD ── OSHA 1910.219 safety-orange HOOD guard. Classic
          inverted-U / saddle design used on frame-mounted HVAC pumps:
            • Flat top sheet running the length of the coupling span
            • Two vertical side panels pierced by expanded-metal grille
              (operator can see the coupling spinning through the openings)
            • Open at both ENDS (shaft entry / exit — required for inspection)
            • Open at the BOTTOM (drain pan gap)
            • Two mounting feet bolted to the baseplate
            • Hazard-striped warning band across the top */}
      {(() => {
        const hoodW = Rp * 1.90;                            // X-extent (straddling the shaft)
        const hoodH = Rp * 1.55;                            // Y-extent (sits above centerline)
        const hoodLen = COUPLING_GAP + Rp * 0.35;           // Z-extent (wraps coupling span)
        const hoodCenterY = shaftY + hoodH * 0.18;          // lifted above centerline
        const panelT = 0.010;                               // sheet-metal gauge
        return (
          <group position={[voluteX, hoodCenterY, couplingCenterZ]}>
            {/* Top cap — solid orange sheet-metal lid with a slight crown */}
            <mesh position={[0, hoodH * 0.46, 0]} castShadow receiveShadow>
              <boxGeometry args={[hoodW + 0.03, 0.014, hoodLen]} />
              <meshStandardMaterial color={GUARD_FRAME} roughness={0.45} metalness={0.3} />
            </mesh>
            {/* Safety-yellow + black hazard-stripe band across the top lid */}
            <mesh position={[0, hoodH * 0.47, 0]}>
              <boxGeometry args={[hoodW * 0.94, 0.003, hoodLen * 0.55]} />
              <meshStandardMaterial color="#f4c41c" roughness={0.55} metalness={0.2} />
            </mesh>
            {Array.from({ length: 8 }).map((_, hi) => (
              <mesh
                key={`hood-hzd-${hi}`}
                position={[0, hoodH * 0.472, (hi - 3.5) * (hoodLen * 0.55) / 8]}
                rotation={[0, 0.45, 0]}
              >
                <boxGeometry args={[hoodW * 0.95, 0.002, 0.030]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.55} metalness={0.2} />
              </mesh>
            ))}
            {/* ── LEFT + RIGHT SIDE PANELS ──
                 Each panel is a thin translucent orange sheet with vertical
                 expanded-metal bars, so the coupling and polished shaft remain
                 visible through the side windows. */}
            {[-1, 1].map((sx) => (
              <group key={`hood-panel-${sx}`} position={[sx * (hoodW * 0.5), 0, 0]}>
                {/* Solid orange frame border (U-shape) — top rail */}
                <mesh position={[0, hoodH * 0.42, 0]} castShadow>
                  <boxGeometry args={[panelT * 2.6, 0.045, hoodLen]} />
                  <meshStandardMaterial color={GUARD_FRAME} roughness={0.45} metalness={0.3} />
                </mesh>
                {/* Front and back edge stiles */}
                {[-1, 1].map((sz) => (
                  <mesh
                    key={`stile-${sz}`}
                    position={[0, hoodH * 0.10, sz * (hoodLen * 0.5)]}
                    castShadow
                  >
                    <boxGeometry args={[panelT * 2.6, hoodH * 0.82, 0.045]} />
                    <meshStandardMaterial color={GUARD_FRAME} roughness={0.45} metalness={0.3} />
                  </mesh>
                ))}
                {/* Translucent mesh screen — lets operator see the coupling */}
                <mesh position={[0, hoodH * 0.10, 0]} castShadow>
                  <boxGeometry args={[panelT, hoodH * 0.82, hoodLen - 0.01]} />
                  <meshStandardMaterial
                    color={GUARD_FRAME}
                    roughness={0.55}
                    metalness={0.2}
                    transparent
                    opacity={0.35}
                    depthWrite={false}
                  />
                </mesh>
                {/* Expanded-metal vertical bars (6 slats — grille pattern) */}
                {Array.from({ length: 6 }).map((_, vi) => (
                  <mesh
                    key={`grille-${vi}`}
                    position={[
                      0,
                      hoodH * 0.10,
                      ((vi + 0.5) / 6 - 0.5) * (hoodLen - 0.08),
                    ]}
                    castShadow
                  >
                    <boxGeometry args={[panelT * 1.2, hoodH * 0.74, 0.008]} />
                    <meshStandardMaterial color={GUARD_BAR} roughness={0.55} metalness={0.35} />
                  </mesh>
                ))}
                {/* Expanded-metal horizontal bars (3 crossbars) */}
                {Array.from({ length: 3 }).map((_, hi) => (
                  <mesh
                    key={`hbar-${hi}`}
                    position={[
                      0,
                      ((hi + 0.5) / 3 - 0.5) * (hoodH * 0.74) + hoodH * 0.10,
                      0,
                    ]}
                    castShadow
                  >
                    <boxGeometry args={[panelT * 1.2, 0.008, hoodLen - 0.04]} />
                    <meshStandardMaterial color={GUARD_BAR} roughness={0.55} metalness={0.35} />
                  </mesh>
                ))}
              </group>
            ))}
            {/* ── MOUNTING FEET ── two L-brackets bolted through the baseplate */}
            {[-1, 1].map((sz) => (
              <group key={`foot-${sz}`} position={[0, -(hoodCenterY - shaftY) - Rp * 0.55, sz * (hoodLen * 0.38)]}>
                <mesh castShadow>
                  <boxGeometry args={[hoodW * 0.92, 0.024, 0.085]} />
                  <meshStandardMaterial color={GUARD_FRAME} roughness={0.5} metalness={0.3} />
                </mesh>
                {/* Foot anchor bolts */}
                {[-1, 1].map((sx) => (
                  <mesh
                    key={`foot-bolt-${sx}`}
                    position={[sx * hoodW * 0.38, -0.012, 0]}
                    rotation={[Math.PI / 2, 0, 0]}
                  >
                    <cylinderGeometry args={[0.015, 0.015, 0.020, 6]} />
                    <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.78} />
                  </mesh>
                ))}
              </group>
            ))}
            {/* ── "COUPLING GUARD" warning label on the top, left of center ── */}
            <Text
              position={[-hoodW * 0.22, hoodH * 0.472, hoodLen * 0.28]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.055}
              color="#1a1a1a"
              anchorX="center"
              anchorY="middle"
              fontWeight={700}
              outlineWidth={0.003}
              outlineColor="#f4c41c"
            >
              ⚠ COUPLING GUARD
            </Text>
          </group>
        );
      })()}

      {/* Discharge / suction soleplate stiffeners under the volute. Sized to
          the volute footprint (not the full long baseplate). */}
      {[-1, 1].map((sx) => (
        <mesh
          key={sx}
          position={[voluteX + sx * voluteRx * 0.35, baseElev + baseT + 0.06, 0]}
          castShadow
        >
          <boxGeometry args={[0.14, 0.12, voluteRz * 1.10]} />
          <meshStandardMaterial color={col.voluteDark} roughness={0.65} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
