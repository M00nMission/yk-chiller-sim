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

const GUARD_MESH = '#4a5058';
const BASE = '#4d4a46';
const FLANGE_STEEL = '#8a8580';

const PALETTE: Record<
  PumpPaint,
  { volute: string; voluteDark: string; scroll: string; motor: string; motorFan: string }
> = {
  blue: {
    volute: '#355e8c',
    voluteDark: '#284870',
    scroll: '#3d6a9e',
    motor: '#3a5580',
    motorFan: '#243a5c',
  },
  gold: {
    volute: '#9a7a32',
    voluteDark: '#6a5220',
    scroll: '#b8923a',
    motor: '#7a6428',
    motorFan: '#4a4818',
  },
  crimson: {
    volute: '#9a2834',
    voluteDark: '#6a1822',
    scroll: '#b03848',
    motor: '#6a3040',
    motorFan: '#3a1820',
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
  const voluteRx = THREE.MathUtils.clamp(Rp * 2.85, 0.38, 0.62);
  const voluteRy = THREE.MathUtils.clamp(Rp * 2.05, 0.28, 0.48);
  const voluteRz = THREE.MathUtils.clamp(Rp * 2.35, 0.34, 0.56);
  const voluteX = Rp * 0.35;
  const shaftY = pumpShaftCenterlineY(branchPipeRadius, duty);
  const suctionPipeFaceX = voluteX + (-voluteRx * 0.92 - Rp * 0.72) - FLANGE_THK * 0.5;
  const dischargePipeFaceX = voluteX + (voluteRx * 0.95 + Rp * 1.55) + FLANGE_THK * 0.5;
  const flangeDiscR = Rp * 1.55;
  return { Rp, voluteX, voluteRx, voluteRy, voluteRz, shaftY, suctionPipeFaceX, dischargePipeFaceX, flangeDiscR };
}

/** Matches impeller / nozzle centerline for valve / pipe alignment. */
export function pumpShaftCenterlineY(branchPipeRadius: number, duty: 'chw' | 'cdw'): number {
  const scale = duty === 'cdw' ? 1.08 : 1.0;
  const Rp = branchPipeRadius * scale;
  const baseT = 0.11;
  return Math.max(baseT + Rp * 2.65, 0.51);
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

  const motorR = THREE.MathUtils.clamp(Rp * 1.95, 0.26, 0.42);
  const motorLen = THREE.MathUtils.clamp(Rp * 4.6, 0.72, 1.12);
  const baseL = THREE.MathUtils.clamp(Rp * 11.5, 1.85, 3.05);
  const baseW = THREE.MathUtils.clamp(Rp * 5.2, 0.95, 1.55);
  const baseT = 0.11;

  const couplingRef = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (couplingRef.current && running) {
      couplingRef.current.rotation.y += dt * 38;
    }
  });

  const footPrint = useMemo(() => {
    const w = baseW;
    const l = baseL;
    return { w, l, halfW: w / 2, halfL: l / 2 };
  }, [baseW, baseL]);

  const couplingFaceZ = voluteRz * 0.92;
  const motorCenterZ = couplingFaceZ + motorLen * 0.52 + 0.06;

  /* Volute scroll: torus arc in XZ (horizontal), opening toward +X discharge. */
  const scrollMajor = voluteRx * 1.05;
  const scrollTube = THREE.MathUtils.clamp(Rp * 0.82, 0.11, 0.2);
  const scrollArc = Math.PI * 1.35;

  return (
    <group name={name} position={position} rotation={rotation}>
      <mesh position={[0, baseT * 0.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[footPrint.l + 0.12, baseT, footPrint.w + 0.12]} />
        <meshStandardMaterial color="#6a6864" roughness={0.92} metalness={0.04} />
      </mesh>

      <mesh position={[0, baseT + 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[footPrint.l, 0.08, footPrint.w]} />
        <meshStandardMaterial color={BASE} roughness={0.72} metalness={0.35} />
      </mesh>
      {[-footPrint.halfL + 0.12, footPrint.halfL - 0.12].map((lx, i) => (
        <mesh key={`rail-${i}`} position={[lx, baseT + 0.09, 0]} castShadow>
          <boxGeometry args={[0.08, 0.06, footPrint.w - 0.06]} />
          <meshStandardMaterial color="#3f4246" roughness={0.75} metalness={0.45} />
        </mesh>
      ))}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
        [0, -1],
        [0, 1],
      ].map(([sx, sz], bi) => (
        <mesh
          key={`bolt-${bi}`}
          position={[sx * (footPrint.halfL - 0.14), baseT + 0.085, sz * (footPrint.halfW - 0.12)]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.028, 0.024, 0.055, 8]} />
          <meshStandardMaterial color="#9a9690" roughness={0.4} metalness={0.75} />
        </mesh>
      ))}

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
        {/* Main volute housing (wraps scroll + tongue) */}
        <mesh castShadow receiveShadow scale={[voluteRx * 0.92, voluteRy * 1.08, voluteRz * 1.02]}>
          <sphereGeometry args={[1, 26, 20]} />
          <meshStandardMaterial color={col.volute} roughness={0.5} metalness={0.62} />
        </mesh>
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
        <mesh position={[0, voluteRy * 0.82, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.12, 8]} />
          <meshStandardMaterial color="#6a6862" roughness={0.45} metalness={0.55} />
        </mesh>
      </group>

      <group position={[voluteX, shaftY, motorCenterZ]}>
        <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[motorR, motorR, motorLen, 28]} />
          <meshStandardMaterial color={col.motor} roughness={0.42} metalness={0.38} />
        </mesh>
        <mesh position={[0, 0, -motorLen * 0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[motorR * 1.08, motorR * 1.02, Rp * 0.55, 20]} />
          <meshStandardMaterial color={col.voluteDark} roughness={0.5} metalness={0.65} />
        </mesh>
        <mesh position={[0, 0, motorLen * 0.48]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[motorR * 0.92, motorR * 0.75, Rp * 0.42, 20]} />
          <meshStandardMaterial color={col.motorFan} roughness={0.55} metalness={0.4} />
        </mesh>
        {[-0.25, 0, 0.25].map((oz, fi) => (
          <mesh key={fi} position={[0, 0, oz * motorLen]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[motorR * 1.01, motorR * 1.01, 0.028, 24]} />
            <meshStandardMaterial color={col.motorFan} roughness={0.5} metalness={0.42} />
          </mesh>
        ))}
        <mesh position={[0, motorR * 1.05, motorLen * 0.15]} castShadow>
          <torusGeometry args={[0.055, 0.014, 8, 16]} />
          <meshStandardMaterial color="#b8b4a8" roughness={0.35} metalness={0.75} />
        </mesh>
        <mesh position={[motorR * 0.98, 0, -motorLen * 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.22, 0.12, 0.008]} />
          <meshStandardMaterial color="#d4d0c4" roughness={0.55} metalness={0.2} />
        </mesh>
        <Text
          position={[motorR * 1.01, 0, -motorLen * 0.05]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.055}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.18}
        >
          {tag}
        </Text>
      </group>

      <group position={[voluteX, shaftY, (couplingFaceZ + motorCenterZ - motorLen * 0.52) * 0.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[Rp * 1.1, Rp * 1.45, motorLen * 0.55 + voluteRz * 0.35]} />
          <meshStandardMaterial
            color={GUARD_MESH}
            roughness={0.55}
            metalness={0.35}
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </mesh>
        {Array.from({ length: 5 }).map((_, si) => (
          <mesh key={si} position={[0, (si - 2) * Rp * 0.28, 0]} rotation={[0, 0, Math.PI / 2]}>
            <boxGeometry args={[0.018, Rp * 1.35, motorLen * 0.5 + voluteRz * 0.35]} />
            <meshStandardMaterial color="#2a2e34" roughness={0.6} metalness={0.5} />
          </mesh>
        ))}
        <mesh ref={couplingRef} position={[0, 0, -motorLen * 0.26]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[Rp * 0.38, Rp * 0.38, Rp * 0.5, 16]} />
          <meshStandardMaterial color="#c0c4c8" roughness={0.28} metalness={0.88} />
        </mesh>
      </group>

      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[voluteX + sx * voluteRx * 0.35, baseT + 0.06, 0]} castShadow>
          <boxGeometry args={[0.14, 0.12, footPrint.w * 0.55]} />
          <meshStandardMaterial color={col.voluteDark} roughness={0.65} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
