/* ============================================================================
   Ach580Drive.tsx
   3D model of the ABB ACH580 wall-mount HVAC drive unit, modelled after the
   ACH580-01 R7/R8 frame size (typical for 200…300 HP, 480 V service in a
   commercial chiller plant). Designed to be mounted on the door of a
   packaged-drive cabinet so the drive itself is the visible operator
   interface, with a recessed mount for the ABB ACH580 control panel
   (the refined ABB ACH580 panel UI — see <ABBPanel/>)
   that hosts the live operator interface as an Html overlay.

   Frame geometry (based on the ABB ACH580 dimensional drawings on
   pp. 228–230 of `ACH580 Installation, Operation and Maintenance Manual`,
   3AXD50000044839):

     Local axis convention — drive sits flat against a wall / door:
       +X = depth (front face is +X, mounting back is −X)
       +Y = vertical (top of the drive at +Y)
       +Z = width

     Default size:   W = 0.32 m (Z) · H = 0.78 m (Y) · D = 0.165 m (X)

   Visible features:
     1. Light-grey RAL 7035 plastic front cover (top half) with the ABB-red
        corporate logo + "ACH580" model designation
     2. Recessed mount for the ACH-AP-H Assistant Control Panel
        (~0.075 m × 0.145 m portrait window, snap-in plastic frame)
     3. Vented heat-sink section (lower half) with horizontal cooling slots
     4. Side cooling fins running the full height (drives use side-flow
        ventilation, intake at the bottom, exhaust at the top)
     5. Top-mounted name/spec plate (ABB silver-on-charcoal nameplate)
     6. Bottom cable knockout / strain-relief plate
     7. Mounting tabs (top + bottom) bolted to the cabinet door

   The component exposes:
     • `screenAnchorRef` — world-space anchor for the camera zoom target
     • `occluderRef` — invisible box collider for <Html occlude>
============================================================================ */

import { useRef, type MutableRefObject } from 'react';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  ABBPanel,
  ABB_PANEL_DESIGN_W,
  ABB_PANEL_DESIGN_H,
} from '../ui/ABBPanel';

/* ─── One-time CSS injection ─────────────────────────────────────────────────
   Promote the CSS3D wrapper of every ABB control panel to its own GPU
   layer. Without this, the drei <Html transform> wrapper re-rasterises on
   every camera-matrix update during walking, which manifests as the
   Html element "shifting out of place" while moving and snapping back
   when motion stops. */
if (typeof document !== 'undefined') {
  const STYLE_ID = 'abb-ach580-stable-html-style';
  if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      .abb-ach580-stable-html {
        will-change: transform;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
        transform-style: preserve-3d;
        -webkit-transform-style: preserve-3d;
      }
      .abb-ach580-stable-html > div {
        will-change: transform;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

/* ─── ABB drive palette ───────────────────────────────────────────────────
   Calibrated against the ACH580-01 product photography on abb.com and the
   reference photo `abb_ach580.jpg`. The drive is two-tone: a warm light-
   grey (RAL 7035-ish) molded plastic shell, with deep-charcoal louver
   shadow channels in the heat-sink window and an anthracite strain-relief
   plate at the bottom. The top mounting bracket is bare aluminium. */
const ABB_LIGHT_GREY     = '#cfcec4';   // RAL 7035 — drive front cover
const ABB_BRACKET_METAL  = '#b6b8b4';   // top mounting bracket (raw alu)
const ABB_LOUVER_DARK    = '#26282b';   // shadow channel between louver fins
const ABB_ANTHRACITE     = '#2c3034';   // bottom strain-relief plate
const ABB_RED            = '#e60012';   // Pantone 485 — corporate red
const HVAC_BAR_GREY      = '#7d8086';   // dark grey HVAC label band
const WARNING_YELLOW     = '#f4c81e';   // arc-flash hazard triangle
const PANEL_BEZEL_BLACK  = '#0d0e10';

export interface Ach580DriveProps {
  /** Local position of the drive's BACK face center (the face that mates
      to the cabinet door). The drive then projects in the local +X
      direction by `depth`. */
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Drive width along Z (door-width direction). Default 0.32 m. */
  width?:  number;
  /** Drive height along Y. Default 0.78 m. */
  height?: number;
  /** Drive depth along X (how far the drive sticks out from the door).
      Default 0.165 m (typical R7/R8 wall-mount frame depth). */
  depth?:  number;
  /** Tag printed on the spec plate (matches the pump tag, e.g. "CDWP-1"). */
  tag?: string;
  /** True ⇒ status LED on the Assistant Control Panel pulses green; HMI
      readouts come alive. */
  running?: boolean;
  /** True ⇒ camera has zoomed in; suppresses the click-to-zoom overlay. */
  zoomed?: boolean;
  /** Click-to-zoom callback. */
  onZoom?: () => void;
  /** Filled with the world-space anchor at the centre of the LCD area
      (used by the camera-zoom controller). */
  screenAnchorRef?: MutableRefObject<THREE.Group | null>;
  /** Filled with the invisible occluder mesh that wraps the entire drive
      bounding volume — so external <Html occlude> lists can include this
      drive as a depth blocker. */
  occluderRef?: MutableRefObject<THREE.Mesh | null>;
}

/* The ABB ACH-AP-H Assistant Control Panel is a real ~75 mm × 145 mm
   physical part. Rendering it at exactly the real-world size makes the
   text on the LCD and the function keys unreadable / unclickable when
   the operator is even a metre away, so we draw it dramatically larger
   (~0.30 m tall) on the drive face — still proportional to the actual
   ACH580 panel aspect, but big enough that the LOC/REM, START/STOP,
   arrow, and soft keys are usable at the eye-level mount and the LCD text
   is legible from a couple of metres back. World height is the single
   source of truth; world width follows from the design canvas aspect. */
const ACP_WORLD_H = 0.30;   // 300 mm vertical span on the drive front
const ACP_WORLD_W = ACP_WORLD_H * (ABB_PANEL_DESIGN_W / ABB_PANEL_DESIGN_H);

/* Fixed world-space scale for the <Html transform> overlay. This is
   computed ONCE (not per-frame from camera distance), which is what
   eliminates the "panel slides out of place during walking and snaps
   back when you stop" artifact that drei's Html transform mode otherwise
   exhibits when `distanceFactor` is recomputed every frame. */
const ACP_HTML_SCALE = ACP_WORLD_H / ABB_PANEL_DESIGN_H;

export function Ach580Drive({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  /* Real ABB ACH580-01 R9 frame: ~308 mm wide × 957 mm tall × 363 mm deep
     (per ACH580 dimensional drawings, IOM doc 3AXD50000044839). We push
     the width slightly past spec to 0.42 m so the recognisable broad-
     shouldered ABB silhouette is preserved while leaving enough lateral
     room on the right-hand control compartment to host an enlarged,
     clickable Assistant Control Panel and its HVAC / arc-flash labels.
     Aspect lands around 1 : 2.3 — true to a real R9/R10 frame. The
     depth stays at 0.20 m so the drive doesn't punch out further than
     the cabinet door itself is wide. */
  width  = 0.42,
  height = 0.96,
  depth  = 0.20,
  tag    = 'PUMP-1',
  running = false,
  zoomed = false,
  onZoom,
  screenAnchorRef,
  occluderRef: externalOccluderRef,
}: Ach580DriveProps) {
  const W = width;
  const H = height;
  const D = depth;

  /* The drive is rendered with its BACK face at local x = 0 and FRONT face
     at local x = +D. Convenience aliases used below. */
  const xBack  = 0;
  const xFront = D;

  /* ── Asymmetric face layout (matches the ABB ACH580-01 product photo) ──
       Looking at the FRONT face of the drive, with +Y up and +Z to the
       observer's right (in drive-local space):

         ┌─────────────────┬─────────────┐  Y = H
         │                 │  ABB logo   │  ── top strip
         │                 ├─────────────┤
         │  HEAT-SINK      │  CONTROL    │
         │  LOUVER WINDOW  │  PANEL      │  ── upper-right LCD
         │                 │  (LCD +     │
         │  vertical fins  │   keypad)   │
         │                 ├─────────────┤
         │                 │  HVAC bar   │  ── HVAC label
         │                 ├─────────────┤
         │                 │ ⚠ warning   │  ── arc-flash sticker
         ├─────────────────┴─────────────┤  Y = H × 0.10
         │   STRAIN-RELIEF PLATE         │  ── anthracite, cable glands
         └───────────────────────────────┘  Y = 0   (gland tails ↓ below)

     Z splits at zSplit ≈ −0.10·W (heat-sink occupies ~40 % of the width
     on the −Z side; the control compartment is the remaining ~60 %, big
     enough to host the enlarged ABB ACH-AP-H Assistant Control Panel
     plus the HVAC and arc-flash labels without crowding). */
  const zSplit = -W * 0.10;

  const zHeatLeft   = -W * 0.5;
  const zHeatRight  =  zSplit;
  const wHeat       =  zHeatRight - zHeatLeft;        // ≈ 0.55 · W
  const zHeatMid    = (zHeatLeft + zHeatRight) * 0.5;

  const zCtlLeft    =  zSplit;
  const zCtlRight   =  W * 0.5;
  const wCtl        =  zCtlRight - zCtlLeft;          // ≈ 0.45 · W
  const zCtlMid     = (zCtlLeft + zCtlRight) * 0.5;

  const yStrainTop  = H * 0.10;                       // strain-plate top
  const yLouverBot  = H * 0.13;                       // louver field bottom
  const yLouverTop  = H * 0.92;                       // louver field top
  const yLogoTop    = H * 1.00;                       // top of ABB strip
  const yLogoBot    = H * 0.88;                       // bottom of ABB strip
  const yPanelTop   = H * 0.85;
  const yPanelMidY  = H * 0.71;                       // centre of the ACP
  const yPanelBot   = H * 0.57;
  const yHvacMid    = H * 0.42;
  const yWarnMid    = H * 0.22;

  /* Control compartment protrudes ~12 mm forward of the heat-sink face so
     the LCD bezel is the most-forward feature on the drive (matches the
     stepped front profile in the reference photo). */
  const xHeatFront  = xFront;                         // heat-sink face
  const xCtlFront   = xFront + 0.012;                 // control face

  const internalOcc = useRef<THREE.Mesh>(null);

  return (
    <group name="abb-ach580-drive" position={position} rotation={rotation}>
      {/* ── 1. Invisible occluder spanning the full drive volume ──
            Used by <Html occlude={[ref]}> to depth-mask the LCD so it
            never bleeds through the cabinet door or the drive cover. */}
      <mesh
        ref={(el) => {
          internalOcc.current = el;
          if (externalOccluderRef) externalOccluderRef.current = el;
        }}
        position={[D * 0.5, H * 0.5, 0]}
        visible={false}
      >
        <boxGeometry args={[D, H, W]} />
        <meshBasicMaterial />
      </mesh>

      {/* ── 2. Drive shell (light-grey molded plastic body) ────────────────
              Replaces the dark heat-sink box with a single light-grey
              monocoque that matches ABB's molded RAL 7035 housing. The
              left half exposes a black louver window cut into it. */}
      <mesh position={[D * 0.5, H * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[D, H, W]} />
        <meshStandardMaterial color={ABB_LIGHT_GREY} roughness={0.62} metalness={0.16} />
      </mesh>

      {/* ── 3. Side cooling fins on the LEFT (heat-sink) flank only ────────
              Real ACH580 drives only expose extruded aluminium fins on the
              heat-sink half; the control-compartment side is closed plastic. */}
      <group>
        {Array.from({ length: 11 }).map((_, fi) => {
          const x = D * (0.10 + fi * (0.85 / 10));
          return (
            <mesh
              key={`fin-${fi}`}
              position={[x, H * 0.50, -W * 0.5 - 0.006]}
            >
              <boxGeometry args={[0.010, H * 0.94, 0.012]} />
              <meshStandardMaterial color="#7a7d82" roughness={0.50} metalness={0.78} />
            </mesh>
          );
        })}
      </group>

      {/* ── 4. Heat-sink louver window (left half of the front face) ───────
              A recessed black cavity behind a field of vertical louver
              slats. The slats are slightly proud of the cavity so they
              cast tiny shadows into the dark gaps between them. */}
      {/* 4a. Recessed black cavity */}
      <mesh position={[xHeatFront - 0.004, (yLouverBot + yLouverTop) * 0.5, zHeatMid]}>
        <boxGeometry args={[0.004, yLouverTop - yLouverBot, wHeat - 0.020]} />
        <meshStandardMaterial color={ABB_LOUVER_DARK} roughness={0.85} metalness={0.20} />
      </mesh>
      {/* 4b. Vertical louver slats */}
      {(() => {
        const slatCount = 22;
        const fieldZ = wHeat - 0.024;
        const pitch  = fieldZ / slatCount;
        const slatW  = pitch * 0.55;                 // slat width along Z
        const slats: React.ReactNode[] = [];
        for (let si = 0; si < slatCount; si++) {
          const z = zHeatLeft + 0.012 + (si + 0.5) * pitch;
          slats.push(
            <mesh
              key={`slat-${si}`}
              position={[xHeatFront + 0.0015, (yLouverBot + yLouverTop) * 0.5, z]}
            >
              <boxGeometry args={[0.003, yLouverTop - yLouverBot - 0.006, slatW]} />
              <meshStandardMaterial color={ABB_LIGHT_GREY} roughness={0.62} metalness={0.18} />
            </mesh>,
          );
        }
        return slats;
      })()}

      {/* ── 5. Control compartment — raised pad on the RIGHT half of the
              front face. Sits ~12 mm proud of the heat-sink face. ────── */}
      <mesh
        position={[xHeatFront + 0.006, (yStrainTop + yLogoTop) * 0.5, zCtlMid]}
        castShadow
      >
        <boxGeometry args={[0.012, yLogoTop - yStrainTop, wCtl - 0.004]} />
        <meshStandardMaterial color={ABB_LIGHT_GREY} roughness={0.55} metalness={0.20} />
      </mesh>
      {/* 5a. Subtle vertical seam where the control pad meets the heat-sink
              window — a thin recessed channel emphasises the two-tone face. */}
      <mesh position={[xHeatFront + 0.0008, H * 0.50, zSplit]}>
        <boxGeometry args={[0.0016, H * 0.84, 0.003]} />
        <meshStandardMaterial color="#5a5d62" roughness={0.7} metalness={0.40} />
      </mesh>

      {/* ── 6. ABB logo strip (top of the control compartment) ──
              The ABB wordmark sits on the molded plastic — no separate
              plaque, just printed/decal text on the light-grey surface.
              Rendered as flat <Text> rotated to face the drive's +X
              front (NOT a <Billboard>): a Billboard rotates the text
              plane to chase the camera, and at off-axis viewing angles
              its bounds rotate over the control-pad/heat-sink seam and
              the drive's top edge — that's the "clipped ABB logo" the
              operator sees when walking past the cabinet. Painted flat
              on the surface, it stays inside the control-compartment
              face from every angle. Letter-spacing + font size are
              tuned so "ABB" comfortably fits inside wCtl on the wider
              W=0.42 m frame. */}
      <Text
        position={[xCtlFront + 0.0012, (yLogoBot + yLogoTop) * 0.5 + 0.010, zCtlMid]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.034}
        color={ABB_RED}
        anchorX="center"
        anchorY="middle"
        fontWeight={900}
        fontStyle="italic"
        letterSpacing={0.012}
      >
        ABB
      </Text>
      <Text
        position={[xCtlFront + 0.0012, (yLogoBot + yLogoTop) * 0.5 - 0.020, zCtlMid]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.0105}
        color="#3a3c40"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
        letterSpacing={0.10}
      >
        ACH580
      </Text>

      {/* ── 7. ACH-AP-H Assistant Control Panel mount ── */}
      {/* Bezel housing — recessed dark frame in the control pad. */}
      <mesh position={[xCtlFront + 0.001, yPanelMidY, zCtlMid]}>
        <boxGeometry args={[0.003, ACP_WORLD_H + 0.020, ACP_WORLD_W + 0.020]} />
        <meshStandardMaterial color={PANEL_BEZEL_BLACK} roughness={0.45} metalness={0.55} />
      </mesh>
      {/* Glass / LCD lens behind the live HMI overlay. */}
      <mesh position={[xCtlFront + 0.0035, yPanelMidY, zCtlMid]}>
        <boxGeometry args={[0.001, ACP_WORLD_H + 0.010, ACP_WORLD_W + 0.010]} />
        <meshStandardMaterial color="#0d0f14" roughness={0.20} metalness={0.10} />
      </mesh>
      {/* Suppress unused-warning on yPanelTop / yPanelBot in compiler;
          they document the panel's vertical envelope used by the ACP. */}
      {(() => { void yPanelTop; void yPanelBot; return null; })()}

      {/* ── 8. HVAC label band + cooling-fan icon ──
              A dark grey horizontal stripe just below the control panel,
              with white "HVAC" text and a small fan glyph — exactly the
              ACH580's "HVAC" branding stripe in the reference photo. */}
      <mesh position={[xCtlFront + 0.0008, yHvacMid, zCtlMid]}>
        <boxGeometry args={[0.0014, 0.034, wCtl - 0.024]} />
        <meshStandardMaterial color={HVAC_BAR_GREY} roughness={0.55} metalness={0.30} />
      </mesh>
      <Text
        position={[xCtlFront + 0.0018, yHvacMid + 0.001, zCtlMid + 0.020]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.018}
        color="#f0f1f2"
        anchorX="center"
        anchorY="middle"
        fontWeight={800}
        letterSpacing={0.10}
      >
        HVAC
      </Text>
      {/* Tiny cooling-fan glyph to the left of the HVAC text */}
      <Text
        position={[xCtlFront + 0.0018, yHvacMid + 0.001, zCtlMid - 0.030]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.020}
        color="#1c1e22"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
      >
        ❄
      </Text>

      {/* ── 9. Yellow arc-flash hazard triangle (lower-right of front) ── */}
      <mesh position={[xCtlFront + 0.002, yWarnMid, zCtlMid + 0.008]}>
        <boxGeometry args={[0.001, 0.040, 0.040]} />
        <meshStandardMaterial color={WARNING_YELLOW} roughness={0.85} metalness={0.05} />
      </mesh>
      <Text
        position={[xCtlFront + 0.0028, yWarnMid + 0.002, zCtlMid + 0.008]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.022}
        color="#0a0b0d"
        anchorX="center"
        anchorY="middle"
        fontWeight={900}
      >
        ⚡
      </Text>

      {/* ── 10. Bottom strain-relief plate (anthracite) with cable glands
                projecting downward out of the bottom face ── */}
      <mesh position={[xFront + 0.003, yStrainTop * 0.5, 0]}>
        <boxGeometry args={[0.008, yStrainTop, W * 0.96]} />
        <meshStandardMaterial color={ABB_ANTHRACITE} roughness={0.70} metalness={0.45} />
      </mesh>
      {/* Three cable-gland nuts hanging out the BOTTOM of the strain plate
          (motor + line + ground glands), as seen in the reference photo. */}
      {[-W * 0.22, 0, W * 0.22].map((gz, gi) => (
        <group key={`gland-${gi}`} position={[xFront - D * 0.18, -0.012, gz]}>
          <mesh>
            <cylinderGeometry args={[0.014, 0.014, 0.024, 14]} />
            <meshStandardMaterial color="#7a7e84" roughness={0.45} metalness={0.85} />
          </mesh>
          <mesh position={[0, -0.020, 0]}>
            <cylinderGeometry args={[0.010, 0.010, 0.016, 12]} />
            <meshStandardMaterial color="#1a1c20" roughness={0.65} metalness={0.45} />
          </mesh>
        </group>
      ))}

      {/* ── 11. Top mounting bracket (L-shaped bare aluminium) ─────────────
                Sits on top of the drive shell and projects ~80 mm UP and
                slightly REARWARD, with two slot cut-outs for wall bolts —
                exactly the bracket profile visible in the reference photo. */}
      {(() => {
        const bktH      = 0.085;                           // bracket vertical height above drive
        const bktThk    = 0.004;                           // sheet-metal thickness
        const bktDepth  = D * 0.55;                        // bracket footprint depth
        const bktTopY   = H + bktH;
        const bktBackX  = xBack - 0.002;                   // sits a hair behind the drive back
        return (
          <group name="ach580-mount-bracket">
            {/* Horizontal foot (sits flush on top of the drive) */}
            <mesh position={[bktBackX + bktDepth * 0.5, H + bktThk * 0.5, 0]} castShadow>
              <boxGeometry args={[bktDepth, bktThk, W * 1.04]} />
              <meshStandardMaterial color={ABB_BRACKET_METAL} roughness={0.45} metalness={0.85} />
            </mesh>
            {/* Vertical wall-tab projecting upward from the rear edge */}
            <mesh position={[bktBackX + bktThk * 0.5, (H + bktTopY) * 0.5, 0]} castShadow>
              <boxGeometry args={[bktThk, bktH, W * 1.04]} />
              <meshStandardMaterial color={ABB_BRACKET_METAL} roughness={0.45} metalness={0.85} />
            </mesh>
            {/* Two slot cut-outs (rendered as small dark recesses on the
                vertical tab — wall-bolt locations). */}
            {[-W * 0.30, W * 0.30].map((sz, si) => (
              <mesh
                key={`bolt-slot-${si}`}
                position={[bktBackX + bktThk + 0.0012, H + bktH * 0.55, sz]}
              >
                <boxGeometry args={[0.0008, 0.020, 0.012]} />
                <meshStandardMaterial color="#1a1c20" roughness={0.7} metalness={0.4} />
              </mesh>
            ))}
          </group>
        );
      })()}

      {/* Live ABB ACH580 control panel — rendered as a CSS3D Html overlay.
            Mount strategy that fixes the "panel drifts during walking and
            snaps back" artifact:
              1.   Use a FIXED `scale` on the parent group so the world-
                   space size of the Html is constant. drei's `distance-
                   Factor` recomputes the scale every frame from camera
                   distance, which causes a one-frame lag visible as
                   sliding during continuous motion.
              2.   No `occlude` prop — that triggers a raycast against
                   the supplied meshes every frame, and during camera
                   motion the hit/miss boundary jitters (the panel
                   visually shifts in/out as the screen-space hit point
                   crosses sub-pixel boundaries).
              3.   `wrapperClass` adds a CSS rule with `will-change:
                   transform` and `backface-visibility: hidden` to
                   promote the wrapping div to its own GPU layer. This
                   eliminates sub-frame rasterisation lag in the CSS3D
                   compositor.
            Rotation [0, π/2, 0] makes the panel's native +Z face the
            drive front (cabinet local +X). */}
      <group
        ref={screenAnchorRef}
        position={[xCtlFront + 0.005, yPanelMidY, zCtlMid]}
        rotation={[0, Math.PI / 2, 0]}
        scale={ACP_HTML_SCALE}
      >
        <Html
          transform
          wrapperClass="abb-ach580-stable-html"
          zIndexRange={[28, 1]}
          style={{
            width:  `${ABB_PANEL_DESIGN_W}px`,
            height: `${ABB_PANEL_DESIGN_H}px`,
            pointerEvents: 'auto',
            overflow: 'hidden',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <ABBPanel running={!!running} />
            {onZoom && !zoomed && (
              <div
                role="button"
                tabIndex={0}
                aria-label={`Zoom into ${tag} ABB ACH580 control panel`}
                title="Click to zoom in and operate this ABB ACH580 control panel"
                onClick={(e) => { e.stopPropagation(); onZoom(); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onZoom(); }
                }}
                onPointerEnter={() => { document.body.style.cursor = 'zoom-in'; }}
                onPointerLeave={() => { document.body.style.cursor = 'auto'; }}
                style={{
                  position: 'absolute', inset: 0, zIndex: 50,
                  cursor: 'zoom-in', background: 'transparent',
                }}
              />
            )}
          </div>
        </Html>
      </group>

      {/* ── Invisible 3D click-to-zoom target ─────────────────────────────────
            The Html click overlay above only receives clicks when the
            browser pointer is unlocked (i.e. the user is in OrbitControls
            mode or has pressed Esc to release PointerLockControls). This
            transparent mesh sits in front of the panel in world units so
            R3F's own raycast-based onClick still fires when the user is
            walking around in first-person mode and the screen-centre
            crosshair is over the panel. The mesh is intentionally a few
            millimetres in FRONT of the Html plane so the raycast hits it
            before the drive housing. ─────────────────────────────────────── */}
      {onZoom && !zoomed && (
        <mesh
          position={[xCtlFront + 0.010, yPanelMidY, zCtlMid]}
          rotation={[0, Math.PI / 2, 0]}
          onClick={(e) => { e.stopPropagation(); onZoom(); }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'zoom-in'; }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          <planeGeometry args={[ACP_WORLD_W * 1.12, ACP_WORLD_H * 1.08]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {/* ── 12. Asset-tag stencil printed on the anthracite strain plate
                (white-on-charcoal, where a real chiller plant would label
                the drive with its loop tag, e.g. CDWP-1 / CHWP-1).
                Flat-painted on the plate (rotation around Y → faces +X). */}
      <Text
        position={[xFront + 0.0085, yStrainTop * 0.55, W * 0.30]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.018}
        color="#e8e9ea"
        anchorX="center"
        anchorY="middle"
        fontWeight={700}
        letterSpacing={0.05}
      >
        {tag}
      </Text>
    </group>
  );
}

/* ─── Convenience getter for callers that need to know how big the drive
       protrudes from its mounting surface (cabinet door). Must stay in
       sync with the default `width`/`height`/`depth` parameters of
       <Ach580Drive/> above — PumpAssemblies.tsx solves the eye-level
       mount height from these numbers. */
// eslint-disable-next-line react-refresh/only-export-components
export function getAch580DefaultExtents() {
  return { width: 0.42, height: 0.96, depth: 0.20 };
}
