/**
 * Animated water-flow indicators for pipes (pid `animation` —
 * "Water flow animation in pipes (color-coded)").
 *
 * Renders a row of small arrow chevrons sitting on the +Y face of a
 * straight pipe segment. Chevrons slide along the pipe axis at a
 * fixed cadence whenever `flowing` is true, and are hidden when the
 * loop is idle. Color and direction are passed by the caller so the
 * same component drives every service (CHWS / CHWR / CWS / CWR …).
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Axis = 'x' | 'z';

interface PipeFlowMarkersProps {
  /** World-space center of the pipe segment. */
  center: [number, number, number];
  /** Length of the pipe segment along `axis`. */
  length: number;
  /** Pipe outer radius (used to seat chevrons just above the surface). */
  pipeRadius: number;
  /** Color for the chevron arrows (use the service color, e.g. dark-blue CHWS). */
  color: string;
  /** Master enable — drives visibility + animation. */
  flowing: boolean;
  /** Pipe axis the chevrons travel along. */
  axis?: Axis;
  /** Direction along `axis`: +1 forward, −1 reversed (for return mains). */
  direction?: 1 | -1;
  /** Cadence in m/s; defaults to 1.5 m/s (representative rated header velocity). */
  speed?: number;
  /** Spacing between chevrons (m). */
  spacing?: number;
  /** Optional name for the inspect HUD. */
  name?: string;
}

export function PipeFlowMarkers({
  center,
  length,
  pipeRadius,
  color,
  flowing,
  axis = 'x',
  direction = 1,
  speed = 1.5,
  spacing = 1.4,
  name,
}: PipeFlowMarkersProps) {
  const groupRef = useRef<THREE.Group>(null);
  const phaseRef = useRef(0);

  /* Build the chevron positions (centered around 0 along the axis). */
  const positions = useMemo(() => {
    const count = Math.max(2, Math.floor(length / spacing));
    const step = length / count;
    const arr: number[] = [];
    for (let i = 0; i < count; i++) arr.push(-length / 2 + i * step);
    return { arr, step };
  }, [length, spacing]);

  useFrame((_, dt) => {
    if (!flowing) return;
    const g = groupRef.current;
    if (!g) return;
    /* Slide all chevrons; wrap each into the [-step, 0] band so the row
       reads as a continuous train rather than chevrons leaving the pipe. */
    phaseRef.current = (phaseRef.current + dt * speed * direction) % positions.step;
    if (axis === 'x') g.position.x = phaseRef.current;
    else g.position.z = phaseRef.current;
  });

  /* Default cone axis is +Y; rotate so its tip points along the flow axis */
  const chevronRotation: [number, number, number] =
    axis === 'x'
      ? [0, 0, direction > 0 ? -Math.PI / 2 : Math.PI / 2]
      : [direction > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0];

  /* Chevron sits just above the pipe on the +Y surface so it's always visible. */
  const chevronYOffset = pipeRadius + 0.012;
  const chevronH = Math.max(0.08, pipeRadius * 0.72);
  const chevronR = Math.max(0.04, pipeRadius * 0.36);

  return (
    <group name={name ?? 'pipe:flow-markers'} position={center} visible={flowing}>
      <group ref={groupRef}>
        {positions.arr.map((p, i) => {
          const local: [number, number, number] =
            axis === 'x' ? [p, chevronYOffset, 0] : [0, chevronYOffset, p];
          return (
            <mesh key={i} position={local} rotation={chevronRotation} renderOrder={3}>
              <coneGeometry args={[chevronR, chevronH, 3]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.45}
                roughness={0.4}
                metalness={0.15}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
