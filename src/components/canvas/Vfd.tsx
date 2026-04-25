/* ============================================================================
   Vfd.tsx
   Variable Frequency Drive (VFD) — floor-standing NEMA 1 enclosure modelled
   after the YORK OptiSpeed™ Solid State Starter / VSD that ships with a
   YK centrifugal chiller. Dimensions match a fully-loaded drive cabinet
   lineup (~1.6 m W × 3.85 m H × 0.8 m D, sitting on a 200 mm housekeeping
   pad so the door-mounted HMI lands at chest/eye level and the harmonic-
   mitigation / DC-bus section reads as a proper full-height bay). Includes:

     • two-section cabinet (control bay on top, power bay on bottom)
     • hinged doors with louvered ventilation, lift-off hinges, latches
     • door-mounted operator interface:
         – status lamp stack (RUN/READY/FAULT)
         – Hand-Off-Auto cam switch
        – ABB ACH580-style assistant panel (live React ABBPanel overlay)
         – START / STOP / RESET pushbuttons
         – E-Stop mushroom
     • UL nameplate + warning labels
     • cooling fan exhaust grille on top
     • channel-iron base / housekeeping plinth + anchor bolts
     • top-entry power conduit hub + side-entry control conduit hub

   The companion <VfdWiring/> group draws the bonded EMT/RGS conduit run
   from the VFD to the chiller compressor motor terminal box (3-phase
   power) and a smaller signal-class conduit to the chiller's secondary
   control sub-cabinet (run-permissive, fault, speed-reference, BACnet).

   COORDINATE CONVENTION
     The cabinet is drawn at the origin with:
       • width   = local Z axis  (door is the W × H face)
       • height  = local Y axis
       • depth   = local X axis  (door normal points to local +X)
     i.e. an operator standing in front of the door looks toward local −X.
     Place + rotate the wrapping group to position the VFD in world space.
============================================================================ */

import { Text, Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef, type RefObject, type MutableRefObject } from 'react';
import {
  ABBPanel,
  ABB_PANEL_DESIGN_W,
  ABB_PANEL_DESIGN_H,
} from '../ui/ABBPanel';

type Triple = [number, number, number];

/* ─── shared palette ─────────────────────────────────────────────────────── */
const YORK_BLUE       = '#234a7d';
const YORK_BLUE_DARK  = '#1a3a63';
const PANEL_GREY      = '#2c2c2c';
const DARK_STEEL      = '#4a4a4a';
const GASKET_BLACK    = '#0e0e0e';
const NAMEPLATE_BG    = '#d9d4c5';
const WARNING_YELLOW  = '#e8c627';
const WARNING_RED     = '#a01818';
const ESTOP_RED       = '#c41010';
const ESTOP_YOKE      = '#e0c020';
const CONDUIT_GREY    = '#7c7c7c';
const COPPER          = '#b97334';

/* Orange-jacket THHN power conductors visible in the conduit gland nuts. */
const PHASE_A = '#cc4422';
const PHASE_B = '#1c1c1c';
const PHASE_C = '#1c4ec8';
const GROUND  = '#2aa436';

/* ============================================================================
   <Vfd/> — full drive cabinet
============================================================================ */
export interface VfdProps {
  /** World position of the cabinet centre at floor level (the model places
   *  the bottom of the plinth at y = 0 regardless of this Y value). */
  position?: Triple;
  /** World rotation. The default drawing has the door looking toward +X. */
  rotation?: Triple;
  /** Cabinet width  (door face W).   Default 1.6 m. */
  width?: number;
  /** Cabinet height (door face H).   Default 3.85 m (tall floor-standing
   *  drive enclosure with a full upper control bay above the power /
   *  harmonic-mitigation bay — door-mounted HMI stays at operator height). */
  height?: number;
  /** Cabinet depth.                  Default 0.8 m. */
  depth?: number;
  /** Tag printed on the nameplate.   Default 'VSD-1'. */
  tag?: string;
  /** True = show the green RUN lamp lit + drive HMI reading at 60 Hz. */
  running?: boolean;
  /** Filled each frame with the door HMI anchor world position (for camera zoom). */
  screenAnchorRef?: RefObject<THREE.Group | null>;
  /** When false and `onZoom` is set, a transparent overlay captures clicks to zoom in. */
  zoomed?: boolean;
  /** Invoked when the user clicks the HMI while not zoomed (same pattern as chiller OptiView). */
  onZoom?: () => void;
  /** Optional ref filled with the cabinet occluder mesh so external <Html occlude>
   *  lists can include this cabinet as a blocker (e.g. the chiller HMI panel). */
  occluderRef?: MutableRefObject<THREE.Mesh | null>;
}

export function Vfd({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width  = 1.6,
  height = 3.85,
  depth  = 0.8,
  tag    = 'VSD-1',
  running = true,
  screenAnchorRef,
  zoomed = false,
  onZoom,
  occluderRef: externalOccluderRef,
}: VfdProps) {
  const W = width;
  const H = height;
  const D = depth;

  /* Plinth / housekeeping pad — bumped to 200 mm to match a typical
     6–8″ poured concrete housekeeping curb installed under floor-
     standing 480 V drives in mechanical rooms. */
  const PLINTH_H = 0.20;

  /* Cabinet sits on top of the plinth */
  const cabY = PLINTH_H + H / 2;

  /* Front face (door normal) is local +X. Door surface plane sits at +D/2. */
  const FRONT_X = D / 2 + 0.001;

  /* Door split: upper section (control bay) ≈ 60% of height,
                 lower section (power bay)   ≈ 40% of height. */
  const UPPER_FRAC = 0.58;
  const SPLIT_Y   = -H / 2 + H * (1 - UPPER_FRAC);   // y of the horizontal seam
  const UPPER_H   = H * UPPER_FRAC;
  const LOWER_H   = H * (1 - UPPER_FRAC);
  const UPPER_CY  = SPLIT_Y + UPPER_H / 2;
  const LOWER_CY  = SPLIT_Y - LOWER_H / 2;

  /* Door inset — leaves a frame band around each door */
  const DOOR_INSET   = 0.05;
  const DOOR_W       = W - 2 * DOOR_INSET;
  const DOOR_UPPER_H = UPPER_H - 2 * DOOR_INSET;
  const DOOR_LOWER_H = LOWER_H - 2 * DOOR_INSET;

  /* Helper: hex anchor bolt head on the plinth corner */
  const Bolt = ({ p }: { p: Triple }) => (
    <mesh position={p}>
      <cylinderGeometry args={[0.03, 0.03, 0.04, 6]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.7} />
    </mesh>
  );

  /* Helper: pan-head screw on the door (flush corner fastener) */
  const Screw = ({ z, y }: { z: number; y: number }) => (
    <mesh position={[FRONT_X + 0.002, cabY + y, z]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.012, 0.012, 0.005, 8]} />
      <meshStandardMaterial color="#cccccc" roughness={0.3} metalness={0.95} />
    </mesh>
  );

  /* Invisible occluder box — same footprint as the cabinet body.
     Passed to <Html occlude> so drei raycasts against a real mesh
     instead of sampling the depth buffer, eliminating the one-frame
     "bleed" that occlude="blending" causes during camera movement. */
  const occluderRef = useRef<THREE.Mesh>(null);

  /* Louver slat geometry on the lower-bay door (for heatsink airflow) */
  const louverSlats = useMemo(() => {
    const n = 8;
    const totalH = DOOR_LOWER_H * 0.55;
    const span = totalH / n;
    const startY = -totalH / 2 + span / 2;
    return Array.from({ length: n }, (_, i) => startY + i * span);
  }, [DOOR_LOWER_H]);

  /* Top exhaust-fan grille slats */
  const topGrilleSlats = useMemo(
    () => Array.from({ length: 7 }, (_, i) => -0.21 + i * 0.07),
    [],
  );

  return (
    <group position={position} rotation={rotation}>
      {/* Invisible occluder — matches cabinet footprint exactly.
          Used by <Html occlude> for raycast-based occlusion (no depth
          buffer readback, so no single-frame "bleed" on camera move).
          Also forwarded via externalOccluderRef so the chiller HMI panel
          can list this cabinet as a blocker. */}
      <mesh
        ref={(el) => {
          occluderRef.current = el;
          if (externalOccluderRef) externalOccluderRef.current = el;
        }}
        position={[0, cabY, 0]}
        visible={false}
      >
        <boxGeometry args={[D, H, W]} />
        <meshBasicMaterial />
      </mesh>

      {/* ─── HOUSEKEEPING PAD / PLINTH ────────────────────────────────── */}
      <mesh position={[0, PLINTH_H / 2, 0]} receiveShadow>
        <boxGeometry args={[D + 0.20, PLINTH_H, W + 0.20]} />
        <meshStandardMaterial color="#bcb7ad" roughness={0.95} metalness={0.02} />
      </mesh>
      {/* anchor bolts at the four cabinet corners */}
      {([
        [ D / 2 + 0.04, PLINTH_H + 0.005,  W / 2 + 0.04],
        [ D / 2 + 0.04, PLINTH_H + 0.005, -W / 2 - 0.04],
        [-D / 2 - 0.04, PLINTH_H + 0.005,  W / 2 + 0.04],
        [-D / 2 - 0.04, PLINTH_H + 0.005, -W / 2 - 0.04],
      ] as Triple[]).map((p, i) => (
        <Bolt key={`abolt-${i}`} p={p} />
      ))}

      {/* ─── MAIN CABINET BODY ────────────────────────────────────────── */}
      <mesh position={[0, cabY, 0]} castShadow receiveShadow>
        <boxGeometry args={[D, H, W]} />
        <meshStandardMaterial color={YORK_BLUE} roughness={0.55} metalness={0.45} />
      </mesh>

      {/* horizontal seam between upper / lower sections (raised band) */}
      <mesh position={[FRONT_X, cabY + SPLIT_Y, 0]}>
        <boxGeometry args={[0.012, 0.04, W + 0.001]} />
        <meshStandardMaterial color={YORK_BLUE_DARK} roughness={0.7} metalness={0.4} />
      </mesh>
      {/* same seam wrapping around the +Z and −Z sides */}
      {([ W / 2, -W / 2 ] as const).map((zEdge, i) => (
        <mesh key={`seam-side-${i}`} position={[0, cabY + SPLIT_Y, zEdge + (zEdge > 0 ? 0.001 : -0.001)]}>
          <boxGeometry args={[D + 0.001, 0.04, 0.012]} />
          <meshStandardMaterial color={YORK_BLUE_DARK} roughness={0.7} metalness={0.4} />
        </mesh>
      ))}

      {/* top cap — slightly oversized lid */}
      <mesh position={[0, cabY + H / 2 + 0.012, 0]}>
        <boxGeometry args={[D + 0.04, 0.024, W + 0.04]} />
        <meshStandardMaterial color={YORK_BLUE_DARK} roughness={0.55} metalness={0.45} />
      </mesh>

      {/* ───────────────────────────────────────────────────────────────
          UPPER DOOR — control bay (operator interface)
      ─────────────────────────────────────────────────────────────── */}
      {/* door plate (slightly proud of the cabinet face) */}
      <mesh position={[FRONT_X + 0.005, cabY + UPPER_CY, 0]}>
        <boxGeometry args={[0.012, DOOR_UPPER_H, DOOR_W]} />
        <meshStandardMaterial color={YORK_BLUE} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* door gasket frame around the upper door (visible recessed black band) */}
      <mesh position={[FRONT_X - 0.003, cabY + UPPER_CY, 0]}>
        <boxGeometry args={[0.002, DOOR_UPPER_H + 0.018, DOOR_W + 0.018]} />
        <meshStandardMaterial color={GASKET_BLACK} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* corner screws on the upper door */}
      {([
        [-DOOR_W / 2 + 0.05, UPPER_CY + DOOR_UPPER_H / 2 - 0.05],
        [ DOOR_W / 2 - 0.05, UPPER_CY + DOOR_UPPER_H / 2 - 0.05],
        [-DOOR_W / 2 + 0.05, UPPER_CY - DOOR_UPPER_H / 2 + 0.05],
        [ DOOR_W / 2 - 0.05, UPPER_CY - DOOR_UPPER_H / 2 + 0.05],
      ] as [number, number][]).map(([z, y], i) => (
        <Screw key={`uds-${i}`} z={z} y={y} />
      ))}

      {/* hinges on the −Z edge of the upper door */}
      {[0.30, -0.30].map((dy, i) => (
        <group key={`uhinge-${i}`} position={[FRONT_X + 0.012, cabY + UPPER_CY + dy, -DOOR_W / 2 - 0.005]}>
          <mesh>
            <boxGeometry args={[0.05, 0.10, 0.04]} />
            <meshStandardMaterial color={DARK_STEEL} roughness={0.45} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0, -0.025]}>
            <cylinderGeometry args={[0.012, 0.012, 0.10, 8]} />
            <meshStandardMaterial color="#cccccc" roughness={0.3} metalness={0.95} />
          </mesh>
        </group>
      ))}

      {/* T-handle latch on the +Z edge of the upper door */}
      <group position={[FRONT_X + 0.022, cabY + UPPER_CY - 0.05, DOOR_W / 2 - 0.10]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.025, 16]} />
          <meshStandardMaterial color={DARK_STEEL} roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0.025, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.06, 10]} />
          <meshStandardMaterial color="#bbbbbb" roughness={0.3} metalness={0.95} />
        </mesh>
        <mesh position={[0.06, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.025, 0.11, 0.025]} />
          <meshStandardMaterial color="#bbbbbb" roughness={0.3} metalness={0.95} />
        </mesh>
      </group>

      {/* ─── OPERATOR INTERFACE (door-mounted) ─────────────────────────
          Layout, top → bottom on the upper door:
            (1) Status / mode lamp stack
            (2) HOA selector switch (Hand-Off-Auto)
            (3) Door-mounted ABB ACH580 assistant panel
            (4) START / STOP / RESET pushbuttons
            (5) E-Stop mushroom
            (6) Nameplate / warning labels
      ─────────────────────────────────────────────────────────────── */}

      {/* (1) status lamp stack — RUN (green), READY (amber), FAULT (red) */}
      {([
        ['#33ff44', '#1d7a25', running, 'RUN'],
        ['#ffaa22', '#cc7700', !running, 'RDY'],
        ['#ff3030', '#7a0e0e', false, 'FLT'],
      ] as const).map(([c, ec, lit, lbl], i) => (
        <group key={`lamp-${i}`} position={[FRONT_X + 0.014, cabY + UPPER_CY + DOOR_UPPER_H / 2 - 0.10, -DOOR_W / 2 + 0.10 + i * 0.13]}>
          {/* bezel */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.038, 0.038, 0.02, 18]} />
            <meshStandardMaterial color="#222" roughness={0.5} metalness={0.7} />
          </mesh>
          {/* lens */}
          <mesh position={[0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.029, 0.029, 0.012, 18]} />
            <meshStandardMaterial
              color={c}
              emissive={lit ? ec : '#000'}
              emissiveIntensity={lit ? 1.6 : 0}
              roughness={0.3}
              metalness={0.2}
              transparent
              opacity={0.92}
            />
          </mesh>
          <Billboard>
          <Text
            position={[0.018, -0.055, 0]}
            rotation={[0, Math.PI / 2, 0]}
            fontSize={0.025}
            color="#f4f1e6"
            anchorX="center"
            anchorY="middle"
          >
            {lbl}
          </Text>
          </Billboard>
        </group>
      ))}

      {/* (2) HOA selector switch — 3-position cam switch, knob currently on AUTO */}
      <group position={[FRONT_X + 0.012, cabY + UPPER_CY + DOOR_UPPER_H / 2 - 0.10, DOOR_W / 2 - 0.13]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.014, 18]} />
          <meshStandardMaterial color="#161616" roughness={0.55} metalness={0.55} />
        </mesh>
        {/* knob body */}
        <mesh position={[0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.034, 0.034, 0.02, 6]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* knob lever (pointing to AUTO = 2 o'clock) */}
        <mesh position={[0.024, 0.02, 0.02]}>
          <boxGeometry args={[0.012, 0.05, 0.014]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* HOA legend plate */}
        <mesh position={[0.0001, -0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.13, 0.04]} />
          <meshStandardMaterial color="#e8e3d2" roughness={0.6} metalness={0.05} />
        </mesh>
        <Billboard>
        <Text
          position={[0.0008, -0.06, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.022}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
        >
          HAND  OFF  AUTO
        </Text>
        </Billboard>
      </group>

      {/* (3) ABB ACH580 assistant panel — portrait React overlay mounted on
             the VFD cabinet door so the plant view uses the same refined ABB
             keypad/control-panel component as the standalone comparison. */}
      <group ref={screenAnchorRef} position={[FRONT_X + 0.012, cabY + UPPER_CY + 0.10, 0]}>
        {/* Bezel matches ABBPanel's portrait aspect. */}
        {(() => {
          const panelAspect = ABB_PANEL_DESIGN_W / ABB_PANEL_DESIGN_H;
          const bezelH = 0.46;
          const bezelW = bezelH * panelAspect;
          const inset = 0.020;
          const HMI_PX_H = ABB_PANEL_DESIGN_H;
          const HMI_PX_W = ABB_PANEL_DESIGN_W;
          const fz = (bezelW / 2) * 0.86;
          const fy = (bezelH / 2) * 0.86;
          return (
            <>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[bezelW, bezelH, 0.012]} />
                <meshStandardMaterial color="#0c0c0c" roughness={0.42} metalness={0.55} />
              </mesh>
              <mesh position={[0.008, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[bezelW - inset, bezelH - inset]} />
                <meshStandardMaterial color="#050608" roughness={0.7} metalness={0.1} />
              </mesh>
              {(
                [
                  [-fz,  fy],
                  [ fz,  fy],
                  [-fz, -fy],
                  [ fz, -fy],
                ] as const
              ).map(([z, y], i) => (
                <mesh
                  key={`hmi-fast-${i}`}
                  position={[0.0085, y, z]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.0035, 0.0035, 0.002, 8]} />
                  <meshStandardMaterial color="#888" roughness={0.4} metalness={0.85} />
                </mesh>
              ))}
              <group rotation={[0, Math.PI / 2, 0]}>
                <Html
                  transform
                  occlude={[occluderRef]}
                  position={[0, 0, 0.007]}
                  scale={bezelH / ABB_PANEL_DESIGN_H}
                  zIndexRange={[28, 1]}
                  style={{
                    width: `${HMI_PX_W}px`,
                    height: `${HMI_PX_H}px`,
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <ABBPanel running={running} />
                    {onZoom && !zoomed && (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label="Zoom in on VFD operator panel"
                        onClick={(e) => {
                          e.stopPropagation();
                          onZoom();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onZoom();
                          }
                        }}
                        onPointerEnter={() => {
                          document.body.style.cursor = 'pointer';
                        }}
                        onPointerLeave={() => {
                          document.body.style.cursor = 'auto';
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: 5,
                          cursor: 'zoom-in',
                          background: 'transparent',
                        }}
                      />
                    )}
                  </div>
                </Html>
              </group>
            </>
          );
        })()}
      </group>

      {/* (4) operator pushbuttons — START (green), STOP (red), RESET (blue),
             relocated to a horizontal strip directly below the HMI panel
             so they don't sit on top of the new full-graphic display. */}
      {([
        ['#1ea83a', '#0d6420', 'I',     -0.30],
        ['#cc1818', '#7a0e0e', 'O',     -0.15],
        ['#1c64c8', '#0d3d7a', 'RST',    0.00],
      ] as const).map(([face, ec, glyph, dz], i) => (
        <group key={`pb-${i}`} position={[FRONT_X + 0.012, cabY + UPPER_CY - 0.48, dz]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.014, 18]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.034, 0.034, 0.022, 18]} />
            <meshStandardMaterial color={face} emissive={ec} emissiveIntensity={0.18} roughness={0.4} metalness={0.45} />
          </mesh>
          <Billboard>
          <Text
            position={[0.025, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            fontSize={0.026}
            color="#ffffff"
            outlineColor="#000"
            outlineWidth={0.002}
            anchorX="center"
            anchorY="middle"
          >
            {glyph}
          </Text>
          </Billboard>
        </group>
      ))}

      {/* (5) E-STOP mushroom — yellow yoke + red mushroom head, on the
             same horizontal strip as the pushbuttons but pushed all the
             way to the right of the door so it's reachable without ever
             passing a hand over the live HMI. */}
      <group position={[FRONT_X + 0.012, cabY + UPPER_CY - 0.48, 0.42]}>
        {/* yellow yoke */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.075, 0.075, 0.012, 22]} />
          <meshStandardMaterial color={ESTOP_YOKE} roughness={0.6} metalness={0.2} />
        </mesh>
        {/* black bezel ring */}
        <mesh position={[0.011, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.058, 0.058, 0.014, 22]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* red mushroom head */}
        <mesh position={[0.026, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.054, 0.046, 0.024, 22]} />
          <meshStandardMaterial color={ESTOP_RED} roughness={0.45} metalness={0.3} />
        </mesh>
        <Billboard>
        <Text
          position={[0.001, -0.10, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.022}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
        >
          EMERGENCY  STOP
        </Text>
        </Billboard>
      </group>

      {/* (6) UL / nameplate strip with TAG */}
      <mesh
        position={[FRONT_X + 0.013, cabY + UPPER_CY - DOOR_UPPER_H / 2 + 0.075, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[0.6, 0.10]} />
        <meshStandardMaterial color={NAMEPLATE_BG} roughness={0.55} metalness={0.05} />
      </mesh>
      <Billboard>
      <Text
        position={[FRONT_X + 0.014, cabY + UPPER_CY - DOOR_UPPER_H / 2 + 0.092, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.030}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
      >
        YORK  OptiSpeed™  VSD
      </Text>
      </Billboard>
      <Billboard>
      <Text
        position={[FRONT_X + 0.014, cabY + UPPER_CY - DOOR_UPPER_H / 2 + 0.057, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.022}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
      >
        {tag} · 480V 3Ø · 600 HP · 720 A FLA
      </Text>
      </Billboard>

      {/* ───────────────────────────────────────────────────────────────
          LOWER DOOR — power bay (heatsink + DC bus + power conductors)
      ─────────────────────────────────────────────────────────────── */}
      <mesh position={[FRONT_X + 0.005, cabY + LOWER_CY, 0]}>
        <boxGeometry args={[0.012, DOOR_LOWER_H, DOOR_W]} />
        <meshStandardMaterial color={YORK_BLUE} roughness={0.5} metalness={0.5} />
      </mesh>
      {/* gasket frame */}
      <mesh position={[FRONT_X - 0.003, cabY + LOWER_CY, 0]}>
        <boxGeometry args={[0.002, DOOR_LOWER_H + 0.018, DOOR_W + 0.018]} />
        <meshStandardMaterial color={GASKET_BLACK} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* corner screws */}
      {([
        [-DOOR_W / 2 + 0.05, LOWER_CY + DOOR_LOWER_H / 2 - 0.05],
        [ DOOR_W / 2 - 0.05, LOWER_CY + DOOR_LOWER_H / 2 - 0.05],
        [-DOOR_W / 2 + 0.05, LOWER_CY - DOOR_LOWER_H / 2 + 0.05],
        [ DOOR_W / 2 - 0.05, LOWER_CY - DOOR_LOWER_H / 2 + 0.05],
      ] as [number, number][]).map(([z, y], i) => (
        <Screw key={`lds-${i}`} z={z} y={y} />
      ))}

      {/* hinges on the −Z edge of the lower door */}
      {[0.20, -0.20].map((dy, i) => (
        <group key={`lhinge-${i}`} position={[FRONT_X + 0.012, cabY + LOWER_CY + dy, -DOOR_W / 2 - 0.005]}>
          <mesh>
            <boxGeometry args={[0.05, 0.10, 0.04]} />
            <meshStandardMaterial color={DARK_STEEL} roughness={0.45} metalness={0.85} />
          </mesh>
          <mesh position={[0, 0, -0.025]}>
            <cylinderGeometry args={[0.012, 0.012, 0.10, 8]} />
            <meshStandardMaterial color="#cccccc" roughness={0.3} metalness={0.95} />
          </mesh>
        </group>
      ))}

      {/* T-handle latch (lower door) */}
      <group position={[FRONT_X + 0.022, cabY + LOWER_CY, DOOR_W / 2 - 0.10]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.025, 16]} />
          <meshStandardMaterial color={DARK_STEEL} roughness={0.4} metalness={0.85} />
        </mesh>
        <mesh position={[0.025, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.06, 10]} />
          <meshStandardMaterial color="#bbbbbb" roughness={0.3} metalness={0.95} />
        </mesh>
        <mesh position={[0.06, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.025, 0.11, 0.025]} />
          <meshStandardMaterial color="#bbbbbb" roughness={0.3} metalness={0.95} />
        </mesh>
      </group>

      {/* louvered ventilation slots (heatsink airflow) */}
      <group position={[FRONT_X + 0.014, cabY + LOWER_CY + 0.04, 0]}>
        {/* louver bezel */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[DOOR_W * 0.65, DOOR_LOWER_H * 0.55 + 0.04]} />
          <meshStandardMaterial color={PANEL_GREY} roughness={0.6} metalness={0.4} />
        </mesh>
        {louverSlats.map((y, i) => (
          <mesh key={`louv-${i}`} position={[0.005, y, 0]} rotation={[Math.PI / 14, Math.PI / 2, 0]}>
            <boxGeometry args={[DOOR_W * 0.62, 0.018, 0.005]} />
            <meshStandardMaterial color={DARK_STEEL} roughness={0.55} metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* warning label */}
      <mesh
        position={[FRONT_X + 0.013, cabY + LOWER_CY + DOOR_LOWER_H / 2 - 0.07, DOOR_W / 2 - 0.18]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[0.22, 0.10]} />
        <meshStandardMaterial color={WARNING_YELLOW} roughness={0.55} metalness={0.05} />
      </mesh>
      <Billboard>
      <Text
        position={[FRONT_X + 0.014, cabY + LOWER_CY + DOOR_LOWER_H / 2 - 0.052, DOOR_W / 2 - 0.18]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.024}
        color={WARNING_RED}
        anchorX="center"
        anchorY="middle"
      >
        DANGER
      </Text>
      </Billboard>
      <Billboard>
      <Text
        position={[FRONT_X + 0.014, cabY + LOWER_CY + DOOR_LOWER_H / 2 - 0.085, DOOR_W / 2 - 0.18]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.014}
        color="#1a1a1a"
        anchorX="center"
        anchorY="middle"
      >
        ARC FLASH HAZARD
      </Text>
      </Billboard>

      {/* ─── TOP COOLING-FAN GRILLE ───────────────────────────────────── */}
      <group position={[0, cabY + H / 2 + 0.026, 0]}>
        {/* recessed bezel */}
        <mesh>
          <boxGeometry args={[D * 0.65, 0.005, W * 0.55]} />
          <meshStandardMaterial color={PANEL_GREY} roughness={0.65} metalness={0.4} />
        </mesh>
        {topGrilleSlats.map((z, i) => (
          <mesh key={`tg-${i}`} position={[0, 0.004, z]}>
            <boxGeometry args={[D * 0.60, 0.006, 0.012]} />
            <meshStandardMaterial color={DARK_STEEL} roughness={0.55} metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* ─── TOP-ENTRY POWER CONDUIT HUB ─────────────────────────────── */}
      {/* a 3" rigid steel conduit stub that VfdWiring will connect to.
          Positioned on the local −X (chiller-facing) edge of the top so
          the overhead run drops straight into the chiller without crossing
          back over the cabinet. */}
      <group position={[-D / 2 + 0.18, cabY + H / 2 + 0.024, 0]}>
        {/* myers hub / locknut */}
        <mesh>
          <cylinderGeometry args={[0.07, 0.085, 0.05, 14]} />
          <meshStandardMaterial color={DARK_STEEL} roughness={0.5} metalness={0.85} />
        </mesh>
        {/* short conduit nipple — VfdWiring continues from the top of this */}
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.10, 14]} />
          <meshStandardMaterial color={CONDUIT_GREY} roughness={0.65} metalness={0.6} />
        </mesh>
      </group>

      {/* ─── SIDE-ENTRY CONTROL CONDUIT HUB ──────────────────────────── */}
      {/* Placed on the local −X (chiller-facing) side of the upper bay so
          the small signal-class EMT runs cleanly toward the chiller's
          secondary control cabinet without re-crossing the power conduit. */}
      <group position={[-D / 2 - 0.001, cabY + UPPER_CY + 0.05, W / 2 - 0.18]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.052, 0.04, 12]} />
          <meshStandardMaterial color={DARK_STEEL} roughness={0.5} metalness={0.85} />
        </mesh>
        <mesh position={[-0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, 0.08, 12]} />
          <meshStandardMaterial color={CONDUIT_GREY} roughness={0.65} metalness={0.6} />
        </mesh>
      </group>

      {/* ─── OVERHEAD TAG (helps locate the cabinet from across the room) */}
      <Billboard>
      <Text
        position={[0, cabY + H / 2 + 0.18, 0]}
        fontSize={0.18}
        color="#ffffff"
        outlineColor="#000"
        outlineWidth={0.012}
        anchorX="center"
        anchorY="middle"
      >
        {tag}
      </Text>
      </Billboard>
    </group>
  );
}

/* ============================================================================
   <VfdWiring/> — bonded conduit interconnect from the VFD top hub to the
   chiller compressor motor terminal box, plus a small signal-class conduit
   to the chiller's secondary control sub-cabinet.

   Positions are in WORLD coordinates so this can be dropped into the
   <EngineRoom/> group at the same level as <ChillerModel/>. The defaults
   correspond to the OptiSpeed VSD placed at world x≈4.2, z≈-2.6 with the
   chiller centred on the origin (Sphere003_Baked is the compressor housing
   at (0.91, 2.95, −2.61); Cube001_Baked is the secondary cabinet at
   (0.97, 2.78, −0.62)).
============================================================================ */
export interface VfdWiringProps {
  /** World position of the VFD top conduit hub (cabinet top, +Y face). */
  vfdTopHub: Triple;
  /** World position of the VFD side control hub (cabinet +Z side). */
  vfdSideHub: Triple;
  /** World position of the compressor motor terminal box on the chiller. */
  motorTerminal: Triple;
  /** World position of the chiller control-cabinet conduit entry. */
  controlEntry: Triple;
  /** Y elevation of the overhead conduit run (defaults just below ceiling). */
  runY?: number;
}

export function VfdWiring({
  vfdTopHub,
  vfdSideHub,
  motorTerminal,
  controlEntry,
  runY = 4.6,
}: VfdWiringProps) {
  /* ─── Power conduit (3" RGS) — “up and over” at true ceiling height ───
       1) ↑ riser at the VFD hub
       2) → short **+X** “roof lane” shift so nothing dog-legs in −Z while still
            over the VFD / room wall (avoids the open floor wedge toward OptiView)
       3) → −Z in the rear aisle, −X to aft of motor, +Z / +X / drop as before */
  const POWER_R = 0.05;          // 3" RGS outer radius
  const PWR_COL = CONDUIT_GREY;

  const pTop = new THREE.Vector3(...vfdTopHub);
  const pMot = new THREE.Vector3(...motorTerminal);

  const runZMotor = pMot.z;
  /* “Rear aisle” Z — tucked beside the evaporator head (z ≈ −4.65) but
     short of penetrating it; bias slightly more −Z than before. */
  const runZRear = THREE.MathUtils.clamp(runZMotor - 1.65, -4.5, runZMotor - 0.55);

  const Dx = pMot.x + 0.32;
  /* −X anchor for the +Z riser return: west of the motor so overhead pipe and
     hangers stay over massing, not over the VFD→OptiView floor corridor. */
  const xBehindMotor = THREE.MathUtils.clamp(pMot.x - 0.38, 0.85, Dx - 0.32);

  /* +X ceiling offset before any −Z trunk — keeps the rear dog-leg over the
     drive / perimeter wall (hypot ≳ chiller walk radius), not over the aisle. */
  const xRoofLane = Math.max(pTop.x + 0.92, 5.08);

  /* anchor points along the route */
  const A = new THREE.Vector3(pTop.x,           pTop.y + 0.10,  pTop.z);   // out of hub
  const B = new THREE.Vector3(pTop.x,           runY,           pTop.z);   // top of riser
  const B_roof = new THREE.Vector3(xRoofLane,   runY,           pTop.z);   // +X to roof lane
  const Bz = new THREE.Vector3(xRoofLane,      runY,           runZRear); // −Z at cleared X
  const BxRear = new THREE.Vector3(xBehindMotor, runY,           runZRear); // long −X at rear Z
  const BzMotor = new THREE.Vector3(xBehindMotor, runY,           runZMotor); // +Z at aft X
  const D = new THREE.Vector3(Dx,                runY,           runZMotor); // +X to drop column
  const E = new THREE.Vector3(pMot.x + 0.32,    pMot.y + 0.18,  runZMotor);
  const F = new THREE.Vector3(pMot.x,           pMot.y + 0.05,  runZMotor);

  /* helper: straight conduit cylinder between two points along world Y/X/Z */
  const Straight = ({
    p1, p2, r, color,
  }: { p1: THREE.Vector3; p2: THREE.Vector3; r: number; color: string }) => {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    if (len < 1e-4) return null;
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    /* default cylinder is along Y; rotate to align with dir */
    const yAxis = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(yAxis, dir.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    return (
      <mesh position={[mid.x, mid.y, mid.z]} rotation={[e.x, e.y, e.z]}>
        <cylinderGeometry args={[r, r, len, 14]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.6} />
      </mesh>
    );
  };

  /* helper: weatherhead / compression coupling at a vertex */
  const Coupling = ({ at, r, color }: { at: THREE.Vector3; r: number; color: string }) => (
    <mesh position={[at.x, at.y, at.z]}>
      <sphereGeometry args={[r * 1.15, 12, 10]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.7} />
    </mesh>
  );

  /* helper: pipe strap clamp on overhead steel (Unistrut + 2-hole strap) */
  const Strap = ({ at, axisY = false, r }: { at: THREE.Vector3; axisY?: boolean; r: number }) => (
    <group position={[at.x, at.y, at.z]}>
      <mesh rotation={[0, 0, axisY ? 0 : Math.PI / 2]}>
        <torusGeometry args={[r * 1.25, 0.012, 6, 14]} />
        <meshStandardMaterial color={DARK_STEEL} roughness={0.5} metalness={0.85} />
      </mesh>
    </group>
  );

  /* ─── Control conduit (¾" EMT) ───────────────────────────────────────
       Up to ceiling → +X into the same roof lane as power → along Z toward
       the cabinet → −X → vertical drop into the entry plate (all high). */
  const CTRL_R = 0.018;
  const CTRL_COL = '#a8a8a8';

  const cA = new THREE.Vector3(...vfdSideHub);
  const cE = new THREE.Vector3(...controlEntry);
  const cB = new THREE.Vector3(cA.x - 0.18, cA.y, cA.z);   // exit hub in −X
  /* True ceiling bundle (same idea as power): stay near runY, then use the
     shared +X roof lane before spanning Z toward the control cabinet. */
  const ctrlYHigh = THREE.MathUtils.clamp(runY - 0.22, cE.y + 1.25, runY - 0.12);
  const cB_hi = new THREE.Vector3(cB.x, ctrlYHigh, cB.z);
  const c_roof = new THREE.Vector3(xRoofLane, ctrlYHigh, cB.z);
  const c_hi_z = new THREE.Vector3(xRoofLane, ctrlYHigh, cE.z);
  const c_hi_x = new THREE.Vector3(cE.x - 0.10, ctrlYHigh, cE.z);
  const cE_pre = new THREE.Vector3(cE.x - 0.10, cE.y, cE.z);
  const cF = new THREE.Vector3(cE.x, cE.y, cE.z);

  return (
    <group>
      {/* ─── POWER CONDUIT — straight runs ──────────────────────────── */}
      <Straight p1={A} p2={B} r={POWER_R} color={PWR_COL} />
      <Straight p1={B} p2={B_roof} r={POWER_R} color={PWR_COL} />
      <Straight p1={B_roof} p2={Bz} r={POWER_R} color={PWR_COL} />
      <Straight p1={Bz} p2={BxRear} r={POWER_R} color={PWR_COL} />
      <Straight p1={BxRear} p2={BzMotor} r={POWER_R} color={PWR_COL} />
      <Straight p1={BzMotor} p2={D} r={POWER_R} color={PWR_COL} />
      <Straight p1={D} p2={E} r={POWER_R} color={PWR_COL} />
      <Straight p1={E} p2={F} r={POWER_R} color={PWR_COL} />

      {/* couplings at the elbow vertices */}
      <Coupling at={B} r={POWER_R} color={DARK_STEEL} />
      <Coupling at={B_roof} r={POWER_R} color={DARK_STEEL} />
      <Coupling at={Bz} r={POWER_R} color={DARK_STEEL} />
      <Coupling at={BxRear} r={POWER_R} color={DARK_STEEL} />
      <Coupling at={BzMotor} r={POWER_R} color={DARK_STEEL} />
      <Coupling at={D} r={POWER_R} color={DARK_STEEL} />
      <Coupling at={E} r={POWER_R} color={DARK_STEEL} />

      {/* ID bands every 1.5 m on the long rear-aisle −X overhead (POWER · 480V) */}
      {(() => {
        const segLen = Math.abs(BxRear.x - Bz.x);
        const n = Math.max(1, Math.floor(segLen / 1.5));
        return Array.from({ length: n }).map((_, i) => {
          const t = (i + 0.5) / n;
          const x = THREE.MathUtils.lerp(Bz.x, BxRear.x, t); // Bz.x === xRoofLane
          return (
            <mesh key={`pwr-band-${i}`} position={[x, runY, runZRear]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[POWER_R * 1.15, POWER_R * 1.15, 0.07, 14]} />
              <meshStandardMaterial color="#cc6018" roughness={0.6} metalness={0.2} />
            </mesh>
          );
        });
      })()}

      {/* hangers from ceiling — rear −X, +Z at aft X, short +X on motor Z */}
      {(() => {
        const hangAlongX = (x0: number, x1: number, z: number, keyPrefix: string) => {
          const segLen = Math.abs(x1 - x0);
          const n = Math.max(2, Math.ceil(segLen / 1.6));
          return Array.from({ length: n }).map((_, i) => {
            const t = i / (n - 1);
            const x = THREE.MathUtils.lerp(x0, x1, t);
            return (
              <group key={`${keyPrefix}-${i}`}>
                <mesh position={[x, (runY + 11.4) / 2, z]}>
                  <cylinderGeometry args={[0.008, 0.008, 11.4 - runY, 6]} />
                  <meshStandardMaterial color={DARK_STEEL} roughness={0.55} metalness={0.85} />
                </mesh>
                <mesh position={[x, runY + 0.075, z]}>
                  <boxGeometry args={[0.04, 0.05, 0.18]} />
                  <meshStandardMaterial color={DARK_STEEL} roughness={0.55} metalness={0.85} />
                </mesh>
                <Strap at={new THREE.Vector3(x, runY, z)} r={POWER_R} />
              </group>
            );
          });
        };
        const hangAlongZ = (z0: number, z1: number, x: number, keyPrefix: string) => {
          const segLen = Math.abs(z1 - z0);
          const n = Math.max(2, Math.ceil(segLen / 1.2));
          return Array.from({ length: n }).map((_, i) => {
            const t = i / (n - 1);
            const z = THREE.MathUtils.lerp(z0, z1, t);
            return (
              <group key={`${keyPrefix}-z-${i}`}>
                <mesh position={[x, (runY + 11.4) / 2, z]}>
                  <cylinderGeometry args={[0.008, 0.008, 11.4 - runY, 6]} />
                  <meshStandardMaterial color={DARK_STEEL} roughness={0.55} metalness={0.85} />
                </mesh>
                <mesh position={[x, runY + 0.075, z]}>
                  <boxGeometry args={[0.18, 0.05, 0.04]} />
                  <meshStandardMaterial color={DARK_STEEL} roughness={0.55} metalness={0.85} />
                </mesh>
                <Strap at={new THREE.Vector3(x, runY, z)} r={POWER_R} axisY />
              </group>
            );
          });
        };
        return (
          <>
            {hangAlongX(B.x, B_roof.x, pTop.z, 'pwr-hang-out')}
            {hangAlongZ(pTop.z, runZRear, B_roof.x, 'pwr-hang-dz')}
            {hangAlongX(Bz.x, BxRear.x, runZRear, 'pwr-hang-x')}
            {hangAlongZ(BxRear.z, BzMotor.z, xBehindMotor, 'pwr-hang-z')}
            {hangAlongX(BxRear.x, D.x, runZMotor, 'pwr-hang-x2')}
          </>
        );
      })()}

      {/* motor terminal junction box (NEMA-12) on the compressor +X face */}
      <group position={[motorTerminal[0] + 0.10, motorTerminal[1], motorTerminal[2]]}>
        {/* enclosure */}
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.42, 0.42]} />
          <meshStandardMaterial color={YORK_BLUE_DARK} roughness={0.55} metalness={0.5} />
        </mesh>
        {/* lid screws */}
        {([
          [-0.16, 0.18], [ 0.16, 0.18],
          [-0.16,-0.18], [ 0.16,-0.18],
        ] as [number, number][]).map(([z, y], i) => (
          <mesh key={`tbsc-${i}`} position={[0.092, y, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.012, 0.004, 8]} />
            <meshStandardMaterial color="#cccccc" roughness={0.3} metalness={0.95} />
          </mesh>
        ))}
        {/* nameplate */}
        <mesh position={[0.092, 0.10, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.30, 0.07]} />
          <meshStandardMaterial color={NAMEPLATE_BG} roughness={0.55} metalness={0.05} />
        </mesh>
        <Billboard>
        <Text
          position={[0.093, 0.10, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.032}
          color="#1a1a1a"
          anchorX="center"
          anchorY="middle"
        >
          MOTOR T-BOX
        </Text>
        </Billboard>
        <Billboard>
        <Text
          position={[0.093, -0.03, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.022}
          color="#e8e3d2"
          anchorX="center"
          anchorY="middle"
        >
          T1  T2  T3
        </Text>
        </Billboard>
        {/* visible THHN conductors stubbing out the top into the conduit */}
        {([PHASE_A, PHASE_B, PHASE_C, GROUND] as const).map((c, i) => (
          <mesh key={`thhn-${i}`} position={[0.05 - i * 0.025, 0.225, -0.12 + i * 0.05]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.06, 8]} />
            <meshStandardMaterial color={c} roughness={0.55} metalness={0.2} />
          </mesh>
        ))}
        {/* copper bond lug */}
        <mesh position={[0.092, -0.18, 0.18]}>
          <boxGeometry args={[0.02, 0.04, 0.04]} />
          <meshStandardMaterial color={COPPER} roughness={0.4} metalness={0.85} />
        </mesh>
      </group>

      {/* ─── CONTROL CONDUIT runs ──────────────────────────────────── */}
      <Straight p1={cA} p2={cB} r={CTRL_R} color={CTRL_COL} />
      <Straight p1={cB} p2={cB_hi} r={CTRL_R} color={CTRL_COL} />
      <Straight p1={cB_hi} p2={c_roof} r={CTRL_R} color={CTRL_COL} />
      <Straight p1={c_roof} p2={c_hi_z} r={CTRL_R} color={CTRL_COL} />
      <Straight p1={c_hi_z} p2={c_hi_x} r={CTRL_R} color={CTRL_COL} />
      <Straight p1={c_hi_x} p2={cE_pre} r={CTRL_R} color={CTRL_COL} />
      <Straight p1={cE_pre} p2={cF} r={CTRL_R} color={CTRL_COL} />
      <Coupling at={cB} r={CTRL_R} color={DARK_STEEL} />
      <Coupling at={cB_hi} r={CTRL_R} color={DARK_STEEL} />
      <Coupling at={c_roof} r={CTRL_R} color={DARK_STEEL} />
      <Coupling at={c_hi_z} r={CTRL_R} color={DARK_STEEL} />
      <Coupling at={c_hi_x} r={CTRL_R} color={DARK_STEEL} />
      <Coupling at={cE_pre} r={CTRL_R} color={DARK_STEEL} />

      {/* small yellow "CONTROL" identification flag along the first vertical */}
      <mesh
        position={[
          cB.x - 0.05,
          (cB.y + cB_hi.y) / 2,
          cB.z,
        ]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[0.05, 0.18]} />
        <meshStandardMaterial color="#f4d030" roughness={0.6} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
