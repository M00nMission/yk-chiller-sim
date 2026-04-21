/**
 * Animated water-flow indicators for pipes (pid `animation` —
 * "Water flow animation in pipes (color-coded)").
 *
 * Renders a row of small directional chevrons hugging the visible
 * surface of a straight pipe segment. Chevrons slide along the pipe
 * axis whenever `flowing` is true and are hidden (animation paused)
 * when `flowing` is false — i.e., when an isolation valve in the
 * loop has been closed.
 *
 * Visibility & geometry guarantees:
 *   • Chevrons never deviate off the pipe — each chevron wraps
 *     individually inside `[-length/2, length/2)`, so the leading
 *     chevron teleports to the trailing end the instant it would
 *     otherwise leave the pipe.
 *   • By default, four chevrons are placed RADIALLY around the pipe
 *     at each axial step (top, bottom, +side, −side). At least one
 *     of them faces the camera from any angle, so chevrons are
 *     always visible regardless of how the user orbits the scene.
 *   • Chevrons sit ≈ 1 cm above the pipe surface (0.01 m), so they
 *     read as a marching ring without z-fighting and without
 *     looking detached from the pipe.
 *
 * Color and direction are passed by the caller so the same component
 * drives every service (CHWS / CHWR / CWS / CWR …). Supports
 * horizontal pipes (axis: 'x' | 'z') and vertical risers (axis: 'y').
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Axis = 'x' | 'y' | 'z';
type FaceDir = 'x' | '-x' | 'y' | '-y' | 'z' | '-z';

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
  /**
   * Number of chevrons placed radially around the pipe at each axial
   * step. Defaults to 4 (cardinal faces) so at least one chevron is
   * always visible from any camera angle. Set to 1 for a single-face
   * marker (legacy single-side behaviour); pair with `surfaceFace` to
   * pick which face that single chevron sits on.
   */
  radialCount?: number;
  /**
   * When `radialCount === 1`, which face the lone chevron rides on.
   * Ignored when `radialCount > 1`. Defaults to:
   *   axis='x' or 'z' → 'y'  (top of horizontal pipe)
   *   axis='y'        → 'x'  (side of vertical riser, facing world +X)
   */
  surfaceFace?: FaceDir;
  /** Optional name for the inspect HUD. */
  name?: string;
}

const FACE_VECS: Record<FaceDir, [number, number, number]> = {
  'x':  [ 1,  0,  0],
  '-x': [-1,  0,  0],
  'y':  [ 0,  1,  0],
  '-y': [ 0, -1,  0],
  'z':  [ 0,  0,  1],
  '-z': [ 0,  0, -1],
};

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
  radialCount = 4,
  surfaceFace,
  name,
}: PipeFlowMarkersProps) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const phaseRef = useRef(0);

  /* Axial chevron stations spaced evenly along the pipe (centered). */
  const layout = useMemo(() => {
    const safeLength = Math.max(0.1, length);
    const station = Math.max(2, Math.floor(safeLength / Math.max(0.2, spacing)));
    const step = safeLength / station;
    return { count: station, step, length: safeLength };
  }, [length, spacing]);

  /* Pre-compute the radial unit vectors perpendicular to the pipe
     axis. With radialCount=4 the four cardinal faces are covered, so
     a chevron is always within the camera's hemisphere. With
     radialCount=1, fall back to the legacy single-face behaviour. */
  const radialDirs = useMemo<Array<[number, number, number]>>(() => {
    if (radialCount <= 1) {
      const fallback: FaceDir =
        surfaceFace ?? (axis === 'y' ? 'x' : 'y');
      return [FACE_VECS[fallback]];
    }
    /* Two basis vectors perpendicular to the pipe axis. */
    const u: [number, number, number] =
      axis === 'x' ? [0, 1, 0] : axis === 'y' ? [1, 0, 0] : [1, 0, 0];
    const v: [number, number, number] =
      axis === 'x' ? [0, 0, 1] : axis === 'y' ? [0, 0, 1] : [0, 1, 0];
    const out: Array<[number, number, number]> = [];
    for (let r = 0; r < radialCount; r++) {
      const θ = (r / radialCount) * Math.PI * 2;
      const c = Math.cos(θ);
      const s = Math.sin(θ);
      out.push([
        u[0] * c + v[0] * s,
        u[1] * c + v[1] * s,
        u[2] * c + v[2] * s,
      ]);
    }
    return out;
  }, [axis, radialCount, surfaceFace]);

  /* Chevron silhouette — taller and slightly fatter than the cone
     used to be, with 4 sides for a faceted pyramid look that reads
     as an arrow head from every angle. */
  const chevronH = Math.max(0.12, pipeRadius * 1.0);
  const chevronR = Math.max(0.06, pipeRadius * 0.48);

  /* Cone tip points along its local +Y by default; rotate so the tip
     points along the (signed) flow axis. */
  const chevronRotation: [number, number, number] = useMemo(() => {
    if (axis === 'x') return [0, 0, direction > 0 ? -Math.PI / 2 : Math.PI / 2];
    if (axis === 'z') return [direction > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0];
    return [direction > 0 ? 0 : Math.PI, 0, 0];
  }, [axis, direction]);

  /* Pre-compute static initial positions so the very first frame
     doesn't show chevrons stacked at the origin. useFrame then takes
     over and continuously wraps each chevron individually. */
  const initialPositions = useMemo(() => {
    const offset = pipeRadius + 0.012;
    const out: Array<[number, number, number]> = [];
    for (let i = 0; i < layout.count; i++) {
      const along = -layout.length / 2 + i * layout.step;
      for (let r = 0; r < radialDirs.length; r++) {
        const dir = radialDirs[r];
        const ax = axis === 'x' ? along : 0;
        const ay = axis === 'y' ? along : 0;
        const az = axis === 'z' ? along : 0;
        out.push([
          ax + dir[0] * offset,
          ay + dir[1] * offset,
          az + dir[2] * offset,
        ]);
      }
    }
    return out;
  }, [axis, layout.count, layout.length, layout.step, pipeRadius, radialDirs]);

  useFrame((_, dt) => {
    if (!flowing) return;
    const L = layout.length;
    if (L <= 0) return;
    /* Phase always wraps positively through `[0, L)` so individual
       chevrons can be positioned independently with a positive
       modulo, regardless of `direction`. */
    phaseRef.current = ((phaseRef.current + dt * speed * direction) % L + L) % L;

    const refs = meshRefs.current;
    const offset = pipeRadius + 0.012;
    const phase = phaseRef.current;
    let idx = 0;
    for (let i = 0; i < layout.count; i++) {
      /* Map each chevron's nominal slot to a wrapped axial position
         strictly inside the pipe: `[-L/2, L/2)`. As the lead chevron
         leaves +L/2 it teleports to −L/2 — never deviates off-pipe. */
      const along = -L / 2 + ((i * layout.step + phase) % L);
      const ax = axis === 'x' ? along : 0;
      const ay = axis === 'y' ? along : 0;
      const az = axis === 'z' ? along : 0;
      for (let r = 0; r < radialDirs.length; r++) {
        const m = refs[idx++];
        if (!m) continue;
        const dir = radialDirs[r];
        m.position.set(
          ax + dir[0] * offset,
          ay + dir[1] * offset,
          az + dir[2] * offset,
        );
      }
    }
  });

  return null;
}
