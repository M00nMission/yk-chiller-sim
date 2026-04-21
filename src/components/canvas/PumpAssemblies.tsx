/**
 * pump-assemblies.spec.json — dedicated React Three Fiber pump assemblies for
 * the YORK water-cooled chiller plant.
 *
 *   <CDWPPumpAssembly />  Condenser Water Pump (CDWP)
 *   <CHWPPumpAssembly />  Chilled Water Pump (CHWP)
 *
 * Each component is fully self-contained:
 *   - vertical riser dropping in from the ceiling
 *   - isolation gate valve
 *   - Y-strainer with bottom blow-down valve
 *   - eccentric reducer (CDW only — flat side up)
 *   - long-radius 90° elbow into a horizontal suction spool (≥ 6 pipe Ø)
 *   - end-suction centrifugal pump (procedural geometry)
 *   - swing check valve on discharge
 *   - isolation gate valve on discharge
 *   - inline magmeter flow transmitter (FT)
 *   - Pete's-plug / Schrader test ports at suction and discharge
 *   - local PG and TG at suction and discharge
 *   - differential pressure indicator (PDI) across the pump
 *   - wall-mounted VFD enclosure with running-status LED
 *   - low-point drain valve at the volute bottom
 *   - clear text tag and pipe service-band ID labels
 *
 * Geometry is pure procedural primitives + drei `<Text>` so the asset is
 * lightweight on M1 Pro (≪ 15k tris per assembly). Pump impeller / coupling
 * spins via {@link EndSuctionHvacPump} when `running === true`.
 *
 * Pipe-color rules (ASHRAE 2026 commercial convention):
 *   CDWP   suction = CWS dark green  ·  discharge = CWS dark green
 *   CHWP   suction = CHR light blue  ·  discharge = CHS dark blue
 */
import { useRef, type JSX, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Ach580Drive, getAch580DefaultExtents } from './Ach580Drive';
import {
  EndSuctionHvacPump,
  FlangedSpool,
  getPumpBaseFootprint,
  getPumpHydraulicPorts,
  type PumpPaint,
} from './IndustrialCentrifugalPump';
import {
  GateValve,
  YStrainer,
  CheckValve,
  DrainValve,
  PressureGauge,
  TemperatureGauge,
  TestPort,
} from './PipingAccessories';

/* ─────────── shared layout constants (exported for parent tie-in routing) ─────────── */
/* Pipe sizing rationale (≈ 1500-ton YORK YK chiller):
     CHW load   3,600 GPM  → 16″ Sch.40 OD ≈ 0.41 m → R ≈ 0.20 m
     CDW load   4,500 GPM  → 18″ Sch.40 OD ≈ 0.46 m → R ≈ 0.22 m  (PIPE_R × 1.08 inside duty='cdw')
   Pump body autosizes off PIPE_R, so this single constant scales the
   nozzle barrel, base-frame, motor, and skid all together.                */
export const PIPE_R = 0.20;                          // main pump-side hydronic radius (~16" Sch.40)
export const SUCTION_RUN_DIA_MULT = 6.5;             // ≥ 6–8 pipe diameters per spec
export const CEILING_Y = 8.6;                        // top-of-riser elevation (engine room)
export const SKID_HEIGHT = 0.20;                     // concrete housekeeping pad height (8″)
export const VFD_OFFSET_Z = 2.95;                    // VFD enclosure wall-mount stand-off from pump CL
export const ELBOW_R_FACTOR = 4.5;                   // long-radius elbow R / pipe radius

/* ─────────── ASHRAE 2026 service colors ───────────
   Values are kept in sync with the rooftop main risers / engine-room
   headers in App.tsx so the bridge tie-ins are seamless with the loops
   they connect to (no visible color step at the welded tees). */
export const PUMP_COLOR = {
  CWS: '#1d7a3a',           // dark green — matches App.tsx CWS riser
  CHR: '#4a8ab8',           // light blue — matches App.tsx CHWR
  CHS: '#0d3f7a',           // dark blue  — matches App.tsx CHWS
  insulation: '#d4d6da',
} as const;
const COLOR = PUMP_COLOR;

/* ============================================================================
   Inline magnetic flow transmitter (FT) — wafer-style mag meter.
   Flange-to-flange in the horizontal pipe, with a small junction-box head
   carrying the loop tag.
============================================================================ */
function InlineFlowTransmitter({
  position,
  rotation = [0, 0, 0],
  pipeRadius = PIPE_R,
  bodyColor,
  tag,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  pipeRadius?: number;
  bodyColor: string;
  tag: string;
}) {
  return (
    <group name={`instrument:${tag}`} position={position} rotation={rotation}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[pipeRadius * 1.18, pipeRadius * 1.18, 0.42, 22]} />
        <meshStandardMaterial color={bodyColor} roughness={0.45} metalness={0.6} />
      </mesh>
      <mesh position={[-0.21, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[pipeRadius * 1.55, pipeRadius * 1.55, 0.05, 18]} />
        <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[0.21, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[pipeRadius * 1.55, pipeRadius * 1.55, 0.05, 18]} />
        <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[0, pipeRadius * 1.4 + 0.06, 0]}>
        <boxGeometry args={[0.22, 0.16, 0.22]} />
        <meshStandardMaterial color="#d6d8dc" roughness={0.4} metalness={0.45} />
      </mesh>
      <mesh position={[0, pipeRadius * 1.4 + 0.16, 0]}>
        <cylinderGeometry args={[0.025, 0.02, 0.06, 8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.5} metalness={0.6} />
      </mesh>
      <Billboard>
        <Text
          position={[0, pipeRadius * 1.4 + 0.30, 0]}
          fontSize={0.075}
          color="#101216"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.005}
          outlineColor="#ffffff"
        >
          {tag}
        </Text>
      </Billboard>
    </group>
  );
}

/* ============================================================================
   Differential Pressure Indicator (PDI) — wall-style cell with two capillary
   tubes that tap pump suction and discharge. Used to read pump dP at a glance.
============================================================================ */
function PdiAcrossPump({
  position,
  tag,
  suctionTapWorld,
  dischargeTapWorld,
}: {
  position: [number, number, number];
  tag: string;
  /** Local-coord (x,y,z) of suction sense-line tap into the pipe. */
  suctionTapWorld: [number, number, number];
  /** Local-coord (x,y,z) of discharge sense-line tap into the pipe. */
  dischargeTapWorld: [number, number, number];
}) {
  const tubeMat = '#b8babe';
  const tubeRadius = 0.012;
  const cellPos = new THREE.Vector3(...position);
  const sucPos = new THREE.Vector3(...suctionTapWorld);
  const disPos = new THREE.Vector3(...dischargeTapWorld);
  const renderTube = (a: THREE.Vector3, b: THREE.Vector3, key: string): JSX.Element => {
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    const e = new THREE.Euler().setFromQuaternion(q);
    return (
      <mesh key={key} position={[mid.x, mid.y, mid.z]} rotation={[e.x, e.y, e.z]}>
        <cylinderGeometry args={[tubeRadius, tubeRadius, len, 8]} />
        <meshStandardMaterial color={tubeMat} roughness={0.4} metalness={0.7} />
      </mesh>
    );
  };
  return (
    <group name={`instrument:${tag}`}>
      {/* sense lines from each tap to a common kneeing point near the cell */}
      {renderTube(sucPos, cellPos.clone().add(new THREE.Vector3(-0.08, 0, 0)), `pdi-${tag}-s`)}
      {renderTube(disPos, cellPos.clone().add(new THREE.Vector3(0.08, 0, 0)), `pdi-${tag}-d`)}
      <group position={position}>
        <mesh castShadow>
          <boxGeometry args={[0.24, 0.18, 0.14]} />
          <meshStandardMaterial color="#ecedef" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.072]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.005, 22]} />
          <meshStandardMaterial color="#fafafa" roughness={0.18} />
        </mesh>
        <mesh position={[0.012, 0.018, 0.078]} rotation={[0, 0, -Math.PI / 5]}>
          <boxGeometry args={[0.008, 0.05, 0.003]} />
          <meshStandardMaterial color="#cc1818" />
        </mesh>
        <Billboard>
          <Text position={[0, -0.13, 0.075]} fontSize={0.05} color="#0a0a0a" anchorX="center" anchorY="middle">
            {tag}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

/* ============================================================================
   Eccentric reducer (flat-side-up). Specced on CDWP suction to prevent
   air pockets when reducing pipe size into the pump suction.
   Drawn as a tilted truncated cone with the top edge horizontal.
============================================================================ */
function EccentricReducer({
  position,
  rotation = [0, 0, 0],
  largeR,
  smallR,
  length,
  bodyColor,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  largeR: number;
  smallR: number;
  length: number;
  bodyColor: string;
}) {
  /* Offset center so the upper generatrix is horizontal — flat-on-top per ASME. */
  const yShift = (largeR - smallR) * 0.5;
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, -yShift, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[smallR, largeR, length, 22]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.55} />
      </mesh>
      <mesh position={[length / 2, -yShift, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[smallR * 1.55, smallR * 1.55, 0.05, 16]} />
        <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
      </mesh>
      <mesh position={[-length / 2, -yShift, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[largeR * 1.55, largeR * 1.55, 0.05, 16]} />
        <meshStandardMaterial color="#8a8580" roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   ABB ACH580-PCR/PDR Packaged Drive cabinet — floor-standing NEMA 12
   enclosure with the actual ABB ACH580 drive unit mounted on the door.
   Modeled after the ACH580-PCR/PDR Packaged Drive with Disconnect family
   (1…200 HP) per the ABB ACH580 IOM Manual (3AXD50000044839):

     • Light-grey RAL 7035 cabinet body + RAL 7016 anthracite plinth
     • ABB-red corporate accent stripe across upper door
     • Door-mounted ABB ACH580 wall-mount drive (R7 frame, ~0.32 m × 0.78 m
       × 0.165 m) — see <Ach580Drive/> for the drive geometry. The drive's
       face hosts the live <AbbAch580ControlPanel/> overlay (the ACH-AP-H
       Assistant Control Panel).
     • 3-point latching door handle with padlock hasp
     • Lockable rotary disconnect (red on yellow OSHA LOTO yoke)
     • Top-mounted cooling-fan exhaust louver
     • Conduit hubs on top for incoming line and outgoing motor leads
     • Concrete housekeeping pad

   Exposes occluderRef + screenAnchorRef for camera zoom (forwarded from
   the embedded <Ach580Drive/>).
============================================================================ */
function VfdWallEnclosure({
  position,
  rotation = [0, 0, 0],
  tag,
  running,
  zoomed = false,
  onZoom,
  screenAnchorRef,
  occluderRef: externalOccluderRef,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  tag: string;
  running: boolean;
  zoomed?: boolean;
  onZoom?: () => void;
  screenAnchorRef?: MutableRefObject<THREE.Group | null>;
  occluderRef?: MutableRefObject<THREE.Mesh | null>;
}) {
  const ledRef          = useRef<THREE.MeshStandardMaterial>(null);
  const cabinetOccRef   = useRef<THREE.Mesh>(null);
  const driveOccRef     = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ledRef.current) return;
    const t = state.clock.elapsedTime;
    ledRef.current.emissiveIntensity = running ? 1.2 + Math.sin(t * 2.2) * 0.45 : 0;
  });

  /* ABB ACH580-PCR R6/R7 packaged-drive cabinet dimensions
     (frame size for ~300 HP, 480 V service in a chiller plant). */
  const W = 0.55;       // depth along X (door faces local +X)
  const H = 3.85;       // total height (matches chiller VFD)
  const D = 1.40;       // width along Z
  const plinth = 0.20;
  const yCabCenter = plinth + (H - plinth) * 0.5;
  const yDoor = W * 0.5 + 0.001;

  /* Drive is mounted on the cabinet door so the ABB ACH580 control panel
     sits just below the in-world player's eye line. The simulation uses a
     doubled ergonomic scale (TechnicianController.EYE_HEIGHT = 3.61 m), so
     a real-world 1.6 m mount would fall at the operator's waist. We target
     a panel centre of 3.48 m — roughly 13 cm / ~10° below the eye line,
     which is the ISO-recommended downward glance angle for HMIs while
     still keeping the drive + its 85 mm top mounting bracket inside the
     3.85 m cabinet (drive top ≈ 3.68 m, bracket top ≈ 3.77 m).
     The Assistant Control Panel's vertical centre on the drive face is at
     H × 0.71 from the drive bottom (see Ach580Drive.tsx → yPanelMidY), so
     driveYBase = TARGET_PANEL_EYE_HEIGHT − driveH × 0.71. */
  const driveExt = getAch580DefaultExtents();
  const TARGET_PANEL_EYE_HEIGHT = 3.48;   // metres above engine-room floor
  const PANEL_REL_Y_ON_DRIVE    = 0.71;   // matches yPanelMidY in Ach580Drive
  const driveYBase = TARGET_PANEL_EYE_HEIGHT - driveExt.height * PANEL_REL_Y_ON_DRIVE;

  /* ── ABB cabinet palette ──
     ABB Drives standard enclosure is RAL 7035 light grey with a darker
     RAL 7016 anthracite plinth and the corporate ABB-red corner accent. */
  const ABB_LIGHT_GREY = '#c8c9c3';   // RAL 7035 (cabinet body + door)
  const ABB_ANTHRACITE = '#2c3034';   // RAL 7016 (plinth, accent strip)
  const ABB_RED        = '#e60012';   // Pantone 485 (logo + accent)
  const DOOR_HINGE     = '#3e4046';

  return (
    <group name={`electrical:VFD-${tag}`} position={position} rotation={rotation}>
      {/* ── Invisible cabinet occluder — used by the on-drive HMI's
            <Html occlude> list so the LCD never renders through the
            cabinet body when the camera is on the wrong side. ── */}
      <mesh
        ref={(el) => {
          cabinetOccRef.current = el;
          if (externalOccluderRef) externalOccluderRef.current = el;
        }}
        position={[0, yCabCenter, 0]}
        visible={false}
      >
        <boxGeometry args={[W, H - plinth, D]} />
        <meshBasicMaterial />
      </mesh>

      {/* ── Concrete housekeeping pad ── */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[W + 0.45, 0.08, D + 0.30]} />
        <meshStandardMaterial color="#a89e8c" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* ── Anthracite plinth (RAL 7016) ── */}
      <mesh position={[0, 0.08 + plinth * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.95, plinth, D * 0.95]} />
        <meshStandardMaterial color={ABB_ANTHRACITE} roughness={0.62} metalness={0.45} />
      </mesh>

      {/* ── Main cabinet body — RAL 7035 light grey ── */}
      <mesh position={[0, yCabCenter, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H - plinth, D]} />
        <meshStandardMaterial color={ABB_LIGHT_GREY} roughness={0.55} metalness={0.32} />
      </mesh>

      {/* ── Door panel (slightly proud of cabinet face for the seam line) ── */}
      <mesh position={[yDoor, yCabCenter, 0]}>
        <planeGeometry args={[D * 0.94, H - plinth - 0.06]} />
        <meshStandardMaterial color={ABB_LIGHT_GREY} roughness={0.50} metalness={0.30} />
      </mesh>

      {/* Door perimeter shadow gasket */}
      {([
        [yDoor + 0.0005,  (H + plinth) * 0.5 - 0.03,    0,   D * 0.94, 0.005,  0.005], // top
        [yDoor + 0.0005,  plinth + 0.04,                0,   D * 0.94, 0.005,  0.005], // bottom
        [yDoor + 0.0005,  yCabCenter,                   D * 0.47 - 0.005, 0.005, H - plinth - 0.06, 0.005], // right edge
        [yDoor + 0.0005,  yCabCenter,                  -D * 0.47 + 0.005, 0.005, H - plinth - 0.06, 0.005], // left edge
      ] as const).map(([x, y, z, w, h, t], i) => (
        <mesh key={`gasket-${i}`} position={[x, y, z]}>
          <boxGeometry args={[t * 2, h, w]} />
          <meshStandardMaterial color="#15171a" roughness={0.85} metalness={0.05} />
        </mesh>
      ))}

      {/* ── Top accent stripe — ABB red horizontal band across upper door ── */}
      <mesh position={[yDoor + 0.001, H - plinth - 0.04, 0]}>
        <planeGeometry args={[D * 0.92, 0.045]} />
        <meshStandardMaterial color={ABB_RED} roughness={0.55} metalness={0.10} emissive={ABB_RED} emissiveIntensity={0.05} />
      </mesh>

      {/* ── Door hinges (left side) ── */}
      {[yCabCenter + 0.85, yCabCenter, yCabCenter - 0.85].map((hy, i) => (
        <mesh key={`hinge-${i}`} position={[yDoor + 0.005, hy, -D * 0.46]}>
          <boxGeometry args={[0.018, 0.12, 0.038]} />
          <meshStandardMaterial color={DOOR_HINGE} roughness={0.45} metalness={0.7} />
        </mesh>
      ))}

      {/* ════════════════════════════════════════════════════════════════
           THE ACTUAL ABB ACH580 DRIVE UNIT — wall-mounted to the cabinet
           door so the operator interfaces directly with the drive face.
           The drive's local +X axis points outward from the door, so we
           place its BACK at the door surface (x = yDoor) and let it
           project +driveExt.depth in the cabinet's local +X. The drive
           hosts the live AbbAch580ControlPanel Html overlay on its
           Assistant Control Panel
           mount, and forwards both screenAnchorRef and occluderRef.
         ════════════════════════════════════════════════════════════════ */}
      <group
        position={[yDoor + 0.001, driveYBase, -D * 0.18]}
      >
        <Ach580Drive
          tag={tag}
          running={running}
          zoomed={zoomed}
          onZoom={onZoom}
          screenAnchorRef={screenAnchorRef}
          occluderRef={driveOccRef}
        />
      </group>

      {/* ── External hardware status LEDs immediately below the drive
            (RUN/FAULT pilot lights bolted to the door, mirroring the
             status LED on the Assistant Control Panel itself). They sit
             just under the drive's strain-relief plate so the cabling
             gland row and the pilot lamps read as a single service
             interface. ── */}
      {([
        ['#33ff44', '#1d7a25', running, 'RUN'],
        ['#ff3030', '#7a0e0e', false,   'FLT'],
      ] as const).map(([c, ec, lit, lbl], i) => (
        <group key={lbl} position={[yDoor + 0.014, driveYBase - 0.10, -D * 0.30 + i * 0.10]}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.026, 0.026, 0.014, 14]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0.010, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.008, 14]} />
            <meshStandardMaterial
              ref={lbl === 'RUN' ? ledRef : undefined}
              color={c} emissive={lit ? ec : '#000'}
              emissiveIntensity={lit ? 1.5 : 0}
              roughness={0.3} metalness={0.2} toneMapped={false}
            />
          </mesh>
          <Billboard>
            <Text
              position={[0.014, 0, 0.038]}
              fontSize={0.024}
              color="#1a1c20"
              anchorX="left"
              anchorY="middle"
              fontWeight={700}
            >
              {lbl}
            </Text>
          </Billboard>
        </group>
      ))}

      {/* ── Door-mounted panel-meter cluster below the drive ──
            A real chiller-plant pump VFD cabinet typically has a row of
            panel-mount digital meters (voltmeter, ammeter, frequency)
            so the operator can read line-side quantities without
            unlocking the door. With the drive itself mounted at eye
            level, the meters drop to roughly chest-height on the
            door — still comfortable to read while the primary HMI
            (the ACH580 control panel) stays in the prime viewing zone. */}
      {(() => {
        const metersY = driveYBase - 0.38;
        const meters = [
          { lbl: 'VOLTS',  val: '480',   units: 'V',  c: '#ff5a18' },
          { lbl: 'AMPS',   val: running ? '218' : '000', units: 'A', c: '#ff5a18' },
          { lbl: 'FREQ',   val: running ? '52.4' : '00.0', units: 'Hz', c: '#ff5a18' },
        ];
        return (
          <group>
            {/* Mounting subpanel (charcoal back-plate behind the three meters) */}
            <mesh position={[yDoor + 0.0035, metersY, 0]}>
              <boxGeometry args={[0.004, 0.110, 0.50]} />
              <meshStandardMaterial color="#1a1c20" roughness={0.55} metalness={0.45} />
            </mesh>
            {meters.map((m, mi) => {
              const dz = -0.16 + mi * 0.16;
              return (
                <group key={m.lbl} position={[yDoor + 0.006, metersY, dz]}>
                  {/* Bezel */}
                  <mesh>
                    <boxGeometry args={[0.005, 0.085, 0.13]} />
                    <meshStandardMaterial color="#0d0e10" roughness={0.45} metalness={0.55} />
                  </mesh>
                  {/* LCD lens */}
                  <mesh position={[0.004, 0, 0]}>
                    <boxGeometry args={[0.001, 0.060, 0.108]} />
                    <meshStandardMaterial
                      color="#0a1a0e"
                      emissive={running ? '#0e2a14' : '#040504'}
                      emissiveIntensity={running ? 0.55 : 0.10}
                      roughness={0.30}
                    />
                  </mesh>
                  <Billboard position={[0.0065, 0.010, 0]}>
                    <Text
                      fontSize={0.030}
                      color={running ? m.c : '#3a2412'}
                      anchorX="center"
                      anchorY="middle"
                      fontWeight={800}
                      letterSpacing={0.04}
                    >
                      {m.val}
                    </Text>
                  </Billboard>
                  <Billboard position={[0.0065, -0.018, 0]}>
                    <Text
                      fontSize={0.014}
                      color={running ? '#ffae6e' : '#5a3a18'}
                      anchorX="center"
                      anchorY="middle"
                      fontWeight={600}
                    >
                      {m.units}
                    </Text>
                  </Billboard>
                  <Billboard position={[0.0065, -0.052, 0]}>
                    <Text
                      fontSize={0.012}
                      color="#c8c9c3"
                      anchorX="center"
                      anchorY="middle"
                      fontWeight={700}
                      letterSpacing={0.04}
                    >
                      {m.lbl}
                    </Text>
                  </Billboard>
                </group>
              );
            })}
          </group>
        );
      })()}

      {/* ── ABB corporate logo plaque on the lower door
            (silver-on-charcoal). With the drive occupying the upper door
            at eye level, the ABB plaque drops to the lower-mid door so
            it remains readable from across the engine room without
            colliding with the drive's mounting footprint. ── */}
      {(() => {
        const plaqueY = driveYBase - 0.80;
        return (
          <group>
            <mesh position={[yDoor + 0.0035, plaqueY, 0]}>
              <boxGeometry args={[0.004, 0.20, 0.50]} />
              <meshStandardMaterial color="#1a1c20" roughness={0.55} metalness={0.45} />
            </mesh>
            <Billboard position={[yDoor + 0.007, plaqueY + 0.04, 0]}>
              <Text
                fontSize={0.085}
                color={ABB_RED}
                anchorX="center"
                anchorY="middle"
                fontWeight={900}
                fontStyle="italic"
                letterSpacing={0.04}
              >
                ABB
              </Text>
            </Billboard>
            <Billboard position={[yDoor + 0.007, plaqueY - 0.06, 0]}>
              <Text
                fontSize={0.030}
                color="#e0e2e6"
                anchorX="center"
                anchorY="middle"
                fontWeight={700}
                letterSpacing={0.10}
              >
                ACH580 · PCR · HVAC DRIVE
              </Text>
            </Billboard>
          </group>
        );
      })()}

      {/* ── Hazard / arc-flash warning placard on the door, below the
            drive and to the latch side so it's read before the operator
            reaches for the handle (OSHA 1910.335 / NFPA 70E practice). ── */}
      {(() => {
        const warnY = driveYBase - 0.14;
        return (
          <group>
            <mesh position={[yDoor + 0.003, warnY, D * 0.30]}>
              <planeGeometry args={[0.12, 0.12]} />
              <meshStandardMaterial color="#f7c819" roughness={0.85} metalness={0.05} />
            </mesh>
            <Billboard position={[yDoor + 0.005, warnY + 0.04, D * 0.30]}>
              <Text fontSize={0.022} color="#0a0b0d" anchorX="center" anchorY="middle" fontWeight={900}>
                ⚠ DANGER
              </Text>
            </Billboard>
            <Billboard position={[yDoor + 0.005, warnY, D * 0.30]}>
              <Text fontSize={0.011} color="#0a0b0d" anchorX="center" anchorY="middle" fontWeight={700}>
                ARC FLASH
              </Text>
            </Billboard>
            <Billboard position={[yDoor + 0.005, warnY - 0.03, D * 0.30]}>
              <Text fontSize={0.010} color="#0a0b0d" anchorX="center" anchorY="middle">
                PPE Cat 2 · 8 cal/cm²
              </Text>
            </Billboard>
          </group>
        );
      })()}

      {/* ── 3-point door latch handle ── */}
      <group position={[yDoor + 0.010, yCabCenter - 0.20, D * 0.40]}>
        <mesh>
          <boxGeometry args={[0.005, 0.32, 0.06]} />
          <meshStandardMaterial color="#1c1e22" roughness={0.45} metalness={0.65} />
        </mesh>
        <mesh position={[0.022, 0, 0]}>
          <boxGeometry args={[0.038, 0.18, 0.038]} />
          <meshStandardMaterial color="#9a1010" roughness={0.4} metalness={0.55} />
        </mesh>
        <mesh position={[0.045, 0, 0]}>
          <boxGeometry args={[0.014, 0.16, 0.030]} />
          <meshStandardMaterial color="#16181b" roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh position={[0.025, -0.12, 0]}>
          <boxGeometry args={[0.020, 0.020, 0.020]} />
          <meshStandardMaterial color="#7a7c80" roughness={0.5} metalness={0.85} />
        </mesh>
      </group>

      {/* ── Lockable rotary disconnect ── */}
      <group position={[yDoor + 0.012, yCabCenter - 0.95, D * 0.40]}>
        <mesh>
          <boxGeometry args={[0.005, 0.16, 0.16]} />
          <meshStandardMaterial color="#e8c627" roughness={0.62} metalness={0.18} />
        </mesh>
        <mesh position={[0.014, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.058, 0.058, 0.022, 18]} />
          <meshStandardMaterial color="#161718" roughness={0.5} metalness={0.55} />
        </mesh>
        <mesh position={[0.030, 0, 0]} rotation={[0, 0, -Math.PI / 5]}>
          <boxGeometry args={[0.018, 0.20, 0.044]} />
          <meshStandardMaterial color="#c41010" roughness={0.4} metalness={0.45} />
        </mesh>
        <Billboard position={[0.022, -0.10, 0]}>
          <Text fontSize={0.020} color="#1a1c20" anchorX="center" anchorY="middle" fontWeight={700}>
            ON · OFF
          </Text>
        </Billboard>
      </group>

      {/* ── Top-of-cabinet exhaust louver ── */}
      <mesh position={[0, H - plinth - 0.02, 0]}>
        <boxGeometry args={[W * 0.92, 0.018, D * 0.55]} />
        <meshStandardMaterial color={ABB_ANTHRACITE} roughness={0.7} metalness={0.4} />
      </mesh>
      {Array.from({ length: 14 }).map((_, vi) => (
        <mesh key={`top-vent-${vi}`}
          position={[0, H - plinth - 0.024, -D * 0.26 + vi * (D * 0.52 / 13)]}>
          <boxGeometry args={[W * 0.84, 0.006, 0.018]} />
          <meshStandardMaterial color="#0d0e10" roughness={0.85} />
        </mesh>
      ))}

      {/* ── Top-of-cabinet conduit hubs (line in / motor out) ── */}
      {[-D * 0.36, D * 0.36].map((dz, i) => (
        <mesh key={`conduit-${i}`} position={[0, H + 0.04, dz]}>
          <cylinderGeometry args={[0.058, 0.058, 0.090, 14]} />
          <meshStandardMaterial color="#7a7e84" roughness={0.5} metalness={0.55} />
        </mesh>
      ))}

      {/* ── UL / cataloging nameplate at the bottom of the door ── */}
      <mesh position={[yDoor + 0.001, plinth + 0.50, D * 0.28]}>
        <planeGeometry args={[0.34, 0.10]} />
        <meshStandardMaterial color="#e8e4d4" roughness={0.85} metalness={0.05} />
      </mesh>
      <Billboard position={[yDoor + 0.003, plinth + 0.52, D * 0.28]}>
        <Text fontSize={0.020} color="#0a0b0d" anchorX="center" anchorY="middle" fontWeight={700}>
          ACH580-PCR-052A-4
        </Text>
      </Billboard>
      <Billboard position={[yDoor + 0.003, plinth + 0.49, D * 0.28]}>
        <Text fontSize={0.013} color="#3a3c40" anchorX="center" anchorY="middle">
          480 V · 300 HP · UL Type 12 · Sn 7702-{tag}
        </Text>
      </Billboard>

      {/* ── Pump tag stencil at the bottom of the door ── */}
      <Billboard position={[yDoor + 0.004, plinth + 0.30, -D * 0.28]}>
        <Text
          fontSize={0.060}
          color="#1a1c20"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
          letterSpacing={0.05}
        >
          {tag}
        </Text>
      </Billboard>
    </group>
  );
}

/* ============================================================================
   Vertical pipe segment (axis along +Y) with optional insulation jacket.
============================================================================ */
function VerticalPipe({
  x,
  z,
  y0,
  y1,
  pipeRadius = PIPE_R,
  pipeColor,
  insulated = false,
}: {
  x: number;
  z: number;
  y0: number;
  y1: number;
  pipeRadius?: number;
  pipeColor: string;
  insulated?: boolean;
}) {
  const a = Math.min(y0, y1);
  const b = Math.max(y0, y1);
  const len = Math.max(b - a, 0.04);
  const cy = (a + b) / 2;
  return (
    <group>
      <mesh position={[x, cy, z]} castShadow receiveShadow>
        <cylinderGeometry args={[pipeRadius, pipeRadius, len, 18]} />
        <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
      </mesh>
      {insulated ? (
        <mesh position={[x, cy, z]}>
          <cylinderGeometry args={[pipeRadius * 1.45, pipeRadius * 1.45, len - 0.10, 16]} />
          <meshStandardMaterial
            color={COLOR.insulation}
            roughness={0.92}
            metalness={0.0}
            transparent
            opacity={0.92}
          />
        </mesh>
      ) : null}
    </group>
  );
}

/* ============================================================================
   Long-radius 90° elbow in the XY plane — turns a DESCENDING riser (−Y flow)
   into a HORIZONTAL run (+X when toward=+1, −X when toward=−1).

   Geometry derivation (toward=+1):
     Three.js TorusGeometry default: ring in XY plane, phi sweeps CCW around Z.
       phi=0   → tube centre at (+R,  0, 0), tangent = (0, +R, 0)  [+Y]
       phi=π/2 → tube centre at ( 0, +R, 0), tangent = (−R, 0, 0) [−X]
     Apply Euler XYZ rotation [π, 0, π/2]:
       phi=0   → centre (0, +R, 0), tangent (+R, 0, 0)  [+X ← horizontal exit]
       phi=π/2 → centre (−R, 0, 0), tangent (0, −R, 0)  [−Y ← riser entry]
     With torus centre at (xElbow + R, shaftY − R, z):
       phi=0 (exit)  → world pos (xElbow+R, shaftY, z) at y = shaftY  ✓
       phi=π/2 (entry) → world pos (xElbow, shaftY−R, z) at x = xElbow ✓
     The riser must therefore terminate at y = shaftY − R (not shaftY).
     The horizontal pipe starts at x = xElbow + R.

   For toward=−1 (CHWP discharge up-riser turns leftward):
     Mirror: centre at (xElbow − R, shaftY − R), rotation [π, 0, −π/2].
============================================================================ */
function ElbowYtoX({
  xElbowCenter,
  yElbowCenter,
  z,
  elbowR,
  pipeRadius = PIPE_R,
  pipeColor,
  toward = +1,
}: {
  /** Pre-computed torus centre X  = xRiser ± elbowR  (from computeAssemblyLayout). */
  xElbowCenter: number;
  /** Pre-computed torus centre Y  = shaftY − elbowR  (from computeAssemblyLayout). */
  yElbowCenter: number;
  z: number;
  /** Same elbowR used in computeAssemblyLayout. */
  elbowR: number;
  pipeRadius?: number;
  pipeColor: string;
  toward?: 1 | -1;
}) {
  return (
    <mesh
      position={[xElbowCenter, yElbowCenter, z]}
      rotation={toward > 0
        ? [Math.PI, 0,  Math.PI / 2]
        : [Math.PI, 0, -Math.PI / 2]}
    >
      <torusGeometry args={[elbowR, pipeRadius, 12, 22, Math.PI / 2]} />
      <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
    </mesh>
  );
}

/* ============================================================================
   Horizontal pipe along +X (no flanges) — used inside an assembly between
   close-coupled fittings where flange faces would visually clutter.
============================================================================ */
function HorizPipe({
  x0,
  x1,
  y,
  z,
  pipeRadius = PIPE_R,
  pipeColor,
}: {
  x0: number;
  x1: number;
  y: number;
  z: number;
  pipeRadius?: number;
  pipeColor: string;
}) {
  const a = Math.min(x0, x1);
  const b = Math.max(x0, x1);
  const len = Math.max(b - a, 0.04);
  const cx = (a + b) / 2;
  return (
    <mesh position={[cx, y, z]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
      <cylinderGeometry args={[pipeRadius, pipeRadius, len, 18]} />
      <meshStandardMaterial color={pipeColor} roughness={0.55} metalness={0.45} />
    </mesh>
  );
}

/* ============================================================================
   Concrete inertia skid / housekeeping pad for a pump assembly.
   8″ (200 mm) reinforced-concrete pad with a 25 mm grout layer on top, sized
   per ASHRAE / SMACNA practice for hydronic plant pumps:
     - Pump steel base-frame anchored with cast-in J-bolts (8 per skid)
     - 150 mm overhang on each side of the base-frame for grout chamfer and
       a clean drip ledge
     - Grout cap (lighter color) provides the actual mating surface
     - 25 mm chamfer on all top edges
     - Visible J-bolt heads + nuts + washers around the pad perimeter
     - Isolated from the slab by a 12 mm cork/rubber isolation strip (color band)
   Total stack height: 200 mm pad + 25 mm grout + 110 mm pump base = 335 mm
   to shaft-mounting plate, keeping the impeller well clear of any floor
   wash-down water (NPLV / chiller plant best practice).
============================================================================ */
function ConcreteSkid({
  baseL,
  baseW,
  overhang = 0.22,
  height = 0.20,
}: {
  /** Base-frame length along X (from EndSuctionHvacPump geometry). */
  baseL: number;
  /** Base-frame width along Z. */
  baseW: number;
  /** How much the skid overhangs each edge of the frame (m). */
  overhang?: number;
  /** Concrete pad height (m), default 200 mm (8 inch). */
  height?: number;
}) {
  const padL = baseL + overhang * 2;
  const padW = baseW + overhang * 2;
  const padH = height;
  const groutH = 0.025;
  const isoStripH = 0.012;
  const chamH = 0.030;
  const padTopY = padH;
  /* Eight J-bolts: corners + mid-spans on the long edges (matches typical
     pump base-frame footprint with 6-bolt or 8-bolt anchor pattern). */
  const boltLocs: Array<[number, number]> = [
    [-baseL * 0.42, -baseW * 0.36],
    [ baseL * 0.42, -baseW * 0.36],
    [-baseL * 0.42,  baseW * 0.36],
    [ baseL * 0.42,  baseW * 0.36],
    [ 0,            -baseW * 0.36],
    [ 0,             baseW * 0.36],
    [-baseL * 0.42,  0],
    [ baseL * 0.42,  0],
  ];
  return (
    <group name="concrete-skid">
      {/* 12 mm cork/rubber vibration-isolation strip between slab and pad */}
      <mesh position={[0, isoStripH * 0.5, 0]} receiveShadow>
        <boxGeometry args={[padL + 0.02, isoStripH, padW + 0.02]} />
        <meshStandardMaterial color="#3a2f24" roughness={0.98} metalness={0.0} />
      </mesh>
      {/* Main reinforced-concrete pad */}
      <mesh position={[0, isoStripH + padH * 0.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[padL, padH, padW]} />
        <meshStandardMaterial color="#a89e8c" roughness={0.95} metalness={0.02} />
      </mesh>
      {/* Form-tie marks (vertical scribes around the perimeter) */}
      {Array.from({ length: 6 }).map((_, i) => {
        const t = -padL * 0.5 + (i + 0.5) * (padL / 6);
        return (
          <group key={`form-${i}`}>
            {[-padW * 0.5 - 0.001, padW * 0.5 + 0.001].map((zw, zi) => (
              <mesh key={zi} position={[t, isoStripH + padH * 0.5, zw]} rotation={[0, 0, 0]}>
                <boxGeometry args={[0.01, padH * 0.92, 0.005]} />
                <meshStandardMaterial color="#8a8276" roughness={0.95} metalness={0.0} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* Grout cap on top of pad — lighter, smoother finish */}
      <mesh position={[0, padTopY + isoStripH + groutH * 0.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[padL - 0.04, groutH, padW - 0.04]} />
        <meshStandardMaterial color="#bdb6a8" roughness={0.78} metalness={0.05} />
      </mesh>
      {/* Top-edge chamfer strips — long sides (along X) */}
      {[-padW * 0.5, padW * 0.5].map((pz, i) => (
        <mesh
          key={`cham-z-${i}`}
          position={[
            0,
            isoStripH + padH - chamH * 0.5,
            pz + (i === 0 ? chamH : -chamH) * 0.5,
          ]}
          rotation={[i === 0 ? Math.PI / 4 : -Math.PI / 4, 0, 0]}
          castShadow
        >
          <boxGeometry args={[padL, chamH * 1.42, chamH * 1.42]} />
          <meshStandardMaterial color="#9a9080" roughness={0.97} metalness={0.01} />
        </mesh>
      ))}
      {/* Top-edge chamfer strips — short sides (along Z) */}
      {[-padL * 0.5, padL * 0.5].map((px, i) => (
        <mesh
          key={`cham-x-${i}`}
          position={[
            px + (i === 0 ? chamH : -chamH) * 0.5,
            isoStripH + padH - chamH * 0.5,
            0,
          ]}
          rotation={[0, 0, i === 0 ? -Math.PI / 4 : Math.PI / 4]}
          castShadow
        >
          <boxGeometry args={[chamH * 1.42, chamH * 1.42, padW]} />
          <meshStandardMaterial color="#9a9080" roughness={0.97} metalness={0.01} />
        </mesh>
      ))}
      {/* Cast-in J-bolt anchors with washer + hex-nut */}
      {boltLocs.map(([bx, bz], bi) => {
        const yTop = padTopY + isoStripH + groutH;
        return (
          <group key={`bolt-skid-${bi}`} position={[bx, yTop, bz]}>
            {/* Threaded stud */}
            <mesh position={[0, 0.045, 0]} castShadow>
              <cylinderGeometry args={[0.020, 0.020, 0.090, 10]} />
              <meshStandardMaterial color="#8a8684" roughness={0.42} metalness={0.82} />
            </mesh>
            {/* Hex nut */}
            <mesh position={[0, 0.062, 0]} castShadow>
              <cylinderGeometry args={[0.034, 0.034, 0.026, 6]} />
              <meshStandardMaterial color="#3a3a38" roughness={0.55} metalness={0.78} />
            </mesh>
            {/* Washer */}
            <mesh position={[0, 0.043, 0]}>
              <cylinderGeometry args={[0.040, 0.040, 0.005, 16]} />
              <meshStandardMaterial color="#9a9690" roughness={0.4} metalness={0.85} />
            </mesh>
          </group>
        );
      })}
      {/* "DO NOT PAINT" yellow safety stripe along front edge */}
      <mesh
        position={[0, isoStripH + padH - chamH - 0.001, padW * 0.5 - 0.06]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[padL * 0.78, 0.045]} />
        <meshStandardMaterial color="#e8b923" roughness={0.85} metalness={0.05} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   Common pump-assembly props.
============================================================================ */
export interface PumpAssemblyProps {
  /** World-space position of the pump baseplate origin. */
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Drives impeller/coupling spin and VFD RUN LED. */
  running: boolean;
  /** Tag printed on the motor and used in instrument loops (e.g. "CDWP-1"). */
  tag?: string;
  /** Valve store IDs (so the gate / drain handles toggle the same simulation). */
  suctionValveId: string;
  dischargeValveId: string;
  drainValveId: string;
  /** Optional override factory paint. */
  paint?: PumpPaint;
  /* ── VFD zoom / occlusion ── */
  /** True when the camera has zoomed into this assembly's VFD panel. */
  vfdZoomed?: boolean;
  /** Called when the user clicks the VFD HMI to zoom in. */
  onVfdZoom?: () => void;
  /** Ref filled with the VFD HMI anchor group (for camera look-at). */
  vfdScreenAnchorRef?: MutableRefObject<THREE.Group | null>;
  /** Ref filled with the VFD cabinet occluder mesh (for <Html occlude>). */
  vfdOccluderRef?: MutableRefObject<THREE.Mesh | null>;
}

/* ─────────── shared layout solver ─────────── */
export type AssemblyLayout = ReturnType<typeof computeAssemblyLayout>;

export function computeAssemblyLayout(duty: 'chw' | 'cdw') {
  const ports = getPumpHydraulicPorts(PIPE_R, duty);
  const { suctionPipeFaceX, dischargePipeFaceX, voluteX, shaftY } = ports;

  const sucRunLen = SUCTION_RUN_DIA_MULT * (PIPE_R * 2);
  const xElbow = suctionPipeFaceX - sucRunLen;
  const xRiser = xElbow;

  /* Long-radius elbow turning the descending riser into the horizontal suction
     run.  R is the standard 4.5× long-radius, but capped so that the riser
     bottom (shaftY − R) stays at least 20 mm above the floor slab (y = 0).
     This matters because shaftY ≈ 0.88 m and the nominal R = 0.90 m would put
     the elbow bottom 18 mm below grade. */
  const elbowR = Math.min(PIPE_R * ELBOW_R_FACTOR, shaftY - 0.02);

  /* Correct elbow geometry (DOWN → RIGHT, toward = +1):
       torus center  : (xElbow + elbowR, shaftY − elbowR, z)
       riser entry   : center + (−elbowR, 0) = (xElbow, shaftY − elbowR)  ← bottom of riser
       horiz exit    : center + (0, +elbowR) = (xElbow + elbowR, shaftY)   ← start of horiz pipe
     The horizontal pipe therefore starts at xElbow + elbowR. */
  const xElbowCenter = xElbow + elbowR;   // torus center X
  const yElbowCenter = shaftY - elbowR;   // torus center Y
  const xHorizStart  = xElbow + elbowR;   // where horiz pipe leaves the elbow
  const yRiserBottom = shaftY - elbowR;   // bottom of the vertical riser

  /* Suction train (left → right toward pump): elbow → spool → eccentric reducer
     (CDW only) → spool → suction gate → spool → suction face. */
  const xGateSuc = suctionPipeFaceX - 0.55;
  const xReducerEnd = xElbow + (duty === 'cdw' ? 0.55 : 0);
  const xReducerStart = xElbow + (duty === 'cdw' ? 0.10 : 0);

  /* Vertical riser train (top → bottom): ceiling → spool → vertical gate →
     spool → Y-strainer → short stub → bottom of elbow arc. */
  const yStrainerCenter = yRiserBottom + 0.55;
  const yGateRiser = yStrainerCenter + 1.20;

  /* Discharge train (left → right away from pump): face → check → gate → FT
     → tie-off → short horizontal stub → elbow → vertical CHS up-riser. */
  const xCheck = dischargePipeFaceX + 0.45;
  const xGateDis = xCheck + 0.62;
  const xFt = xGateDis + 0.55;
  const xDischargeOut = xFt + 0.45;

  /* CHWP discharge up-riser elbow (RIGHT → UP, toward = −1):
       Horizontal stub ends at xH = xDischargeOut + 0.65.
       Elbow: rotation [0, π, 0]; centre at (xH, shaftY − elbowR, z).
         phi=π/2 entry: centre + (0, +elbowR) = (xH, shaftY)     ← horiz end ✓
         phi=0   exit:  centre + (−elbowR, 0) = (xH−elbowR, shaftY−elbowR) → tangent +Y
       Riser centre-line X = xH − elbowR; riser starts at y = shaftY − elbowR. */
  const xDischargeHorizEnd = xDischargeOut + 0.65;
  const xDischargeRiserX   = xDischargeHorizEnd - elbowR;   // riser CL (was xH + elbowR — now LEFT of stub end)
  const yDischargeElbowCY  = shaftY - elbowR;               // elbow centre Y (also riser start Y)

  return {
    ports,
    voluteX,
    shaftY,
    /* suction train */
    suctionPipeFaceX,
    xGateSuc,
    xReducerEnd,
    xReducerStart,
    xElbow,
    elbowR,
    xElbowCenter,
    yElbowCenter,
    xHorizStart,
    yRiserBottom,
    /* vertical riser */
    xRiser,
    yStrainerCenter,
    yGateRiser,
    /* discharge train */
    dischargePipeFaceX,
    xCheck,
    xGateDis,
    xFt,
    xDischargeOut,
    xDischargeHorizEnd,
    xDischargeRiserX,
    yDischargeElbowCY,
  };
}

/* ============================================================================
   Internal renderer shared by both assemblies. Differs only in pipe colors,
   tags, eccentric reducer presence, and discharge tail (chiller stub vs.
   vertical CHS riser up).
============================================================================ */
function PumpAssemblyBody({
  layout,
  pipeColorSuction,
  pipeColorDischarge,
  tag,
  duty,
  paint,
  running,
  suctionValveId,
  dischargeValveId,
  drainValveId,
}: {
  layout: AssemblyLayout;
  pipeColorSuction: string;
  pipeColorDischarge: string;
  tag: string;
  duty: 'chw' | 'cdw';
  paint?: PumpPaint;
  running: boolean;
  suctionValveId: string;
  dischargeValveId: string;
  drainValveId: string;
}) {
  const yCL = layout.shaftY;
  const ftTag = `FT-${tag}`;
  const pdiTag = `PDI-${tag}`;

  return (
    <>
      {/* ── Concrete inertia-base / vibration-isolated pump (procedural geom).
            EndSuctionHvacPump uses pumpShaftCenterlineY() internally, which now
            already includes the skid stack height — so the steel base-frame is
            rendered sitting on top of the grout cap. ── */}
      <EndSuctionHvacPump
        name={`pump:${tag}`}
        tag={tag}
        position={[0, 0, 0]}
        pipeRadius={PIPE_R}
        duty={duty}
        running={running}
        paint={paint}
      />

      {/* ===================== SUCTION TRAIN (vertical → horizontal) =====================
           Vertical fitting half-widths (fitting axis along Y when rotation=[0,0,π/2]):
             GateValve  : 0.144 m (bodyHalfLen + flangeT = 0.11 + 0.034)
             YStrainer  : 0.245 m (flangeCtrX + flangeT/2 = 0.22 + 0.025)
      */}
      {/* 1. Vertical riser dropping from the ceiling penetration down to the
             top flange face of the isolation gate valve */}
      <VerticalPipe
        x={layout.xRiser}
        z={0}
        y0={CEILING_Y}
        y1={layout.yGateRiser + 0.144}
        pipeColor={pipeColorSuction}
        insulated
      />
      {/* Roof / ceiling penetration sleeve */}
      <mesh position={[layout.xRiser, CEILING_Y - 0.05, 0]}>
        <cylinderGeometry args={[PIPE_R * 1.85, PIPE_R * 1.95, 0.18, 16]} />
        <meshStandardMaterial color="#7c8086" roughness={0.55} metalness={0.55} />
      </mesh>

      {/* 2. Vertical isolation gate valve in the middle of the riser */}
      <GateValve
        valveId={suctionValveId}
        position={[layout.xRiser, layout.yGateRiser, 0]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorSuction}
      />
      {/* Pipe from gate bottom face to Y-strainer top face */}
      <VerticalPipe
        x={layout.xRiser}
        z={0}
        y0={layout.yGateRiser - 0.144}
        y1={layout.yStrainerCenter + 0.245}
        pipeColor={pipeColorSuction}
      />

      {/* 3. Vertical Y-strainer with bottom blow-down valve */}
      <YStrainer
        position={[layout.xRiser, layout.yStrainerCenter, 0]}
        rotation={[0, 0, Math.PI / 2]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorSuction}
        idBand={false}
      />
      {/* Pipe from strainer bottom face down to the riser entry of the elbow */}
      <VerticalPipe
        x={layout.xRiser}
        z={0}
        y0={layout.yStrainerCenter - 0.245}
        y1={layout.yRiserBottom}
        pipeColor={pipeColorSuction}
      />

      {/* 4. Long-radius 90° elbow — turns descending riser into horizontal suction run.
             Torus centre = (xElbowCenter, yElbowCenter); rotation [π, 0, π/2].
             Entry at (xRiser, yRiserBottom), exit at (xHorizStart, shaftY). */}
      <ElbowYtoX
        xElbowCenter={layout.xElbowCenter}
        yElbowCenter={layout.yElbowCenter}
        z={0}
        elbowR={layout.elbowR}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorSuction}
        toward={+1}
      />

      {/* 5. Horizontal suction spool from elbow exit to reducer / gate. */}
      <HorizPipe
        x0={layout.xHorizStart}
        x1={layout.xReducerStart}
        y={yCL}
        z={0}
        pipeColor={pipeColorSuction}
      />

      {/* 6. Eccentric reducer (CDW only — flat-side-up). For CHW the reducer
             segment collapses to zero length (xReducerStart === xReducerEnd). */}
      {duty === 'cdw' ? (
        <EccentricReducer
          position={[(layout.xReducerStart + layout.xReducerEnd) / 2, yCL, 0]}
          largeR={PIPE_R * 1.18}
          smallR={PIPE_R}
          length={layout.xReducerEnd - layout.xReducerStart}
          bodyColor={pipeColorSuction}
        />
      ) : null}

      {/* 7. Spool from reducer outlet (or elbow exit for CHW) to the suction gate.
             Gate half-width = bodyHalfLen + flangeT = 0.11 + 0.034 = 0.144 m at PIPE_R=0.20.
             Spool must end flush at the gate's pipe-facing flange face. */}
      <FlangedSpool
        x0={layout.xReducerEnd}
        x1={layout.xGateSuc - 0.144}
        y={yCL}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorSuction}
      />

      {/* 8. Suction-side close-coupled gate valve directly upstream of the pump */}
      <GateValve
        valveId={`${suctionValveId}-close`}
        position={[layout.xGateSuc, yCL, 0]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorSuction}
      />
      {/* Spool from gate right face to pump suction flange face — 0.144 m half-width */}
      <FlangedSpool
        x0={layout.xGateSuc + 0.144}
        x1={layout.suctionPipeFaceX}
        y={yCL}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorSuction}
      />

      {/* 9. Suction-side instruments — local PG, TG and Pete's-plug test port */}
      <PressureGauge
        position={[layout.xGateSuc - 0.55, yCL, 0]}
        pipeRadius={PIPE_R}
        label={`PG-${tag}-S`}
      />
      <TemperatureGauge
        position={[layout.xGateSuc - 1.05, yCL, 0]}
        pipeRadius={PIPE_R}
        label={`TG-${tag}-S`}
      />
      <TestPort position={[layout.xGateSuc - 0.20, yCL, 0]} pipeRadius={PIPE_R} />

      {/* ===================== DISCHARGE TRAIN =====================
           Spool half-widths used to butt-connect spools to fittings:
             GateValve  : bodyHalfLen + flangeT = 0.11 + 0.034 = 0.144 m
             CheckValve : flangeCtrX  + flangeT/2 = 0.22 + 0.025 = 0.245 m
             InlineFT   : body flange at ±0.21 m, flange half-T 0.025 m → 0.235 m
      */}
      <FlangedSpool
        x0={layout.dischargePipeFaceX}
        x1={layout.xCheck - 0.245}
        y={yCL}
        z={0}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorDischarge}
      />
      {/* swing-type check valve */}
      <CheckValve
        position={[layout.xCheck, yCL, 0]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorDischarge}
      />
      {/* Spool from check right face to discharge gate left face */}
      <FlangedSpool
        x0={layout.xCheck + 0.245}
        x1={layout.xGateDis - 0.144}
        y={yCL}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorDischarge}
      />
      {/* discharge isolation gate */}
      <GateValve
        valveId={dischargeValveId}
        position={[layout.xGateDis, yCL, 0]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorDischarge}
      />
      {/* Spool from gate right face to FT left flange face */}
      <FlangedSpool
        x0={layout.xGateDis + 0.144}
        x1={layout.xFt - 0.235}
        y={yCL}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorDischarge}
      />
      {/* inline mag-meter flow transmitter */}
      <InlineFlowTransmitter
        position={[layout.xFt, yCL, 0]}
        pipeRadius={PIPE_R}
        bodyColor={pipeColorDischarge}
        tag={ftTag}
      />
      {/* Spool from FT right flange face to xDischargeOut */}
      <FlangedSpool
        x0={layout.xFt + 0.235}
        x1={layout.xDischargeOut}
        y={yCL}
        pipeRadius={PIPE_R}
        pipeColor={pipeColorDischarge}
      />
      {/* Discharge instruments — local PG, TG and Schrader test port */}
      <PressureGauge
        position={[layout.xCheck + 0.05, yCL, 0]}
        pipeRadius={PIPE_R}
        label={`PG-${tag}-D`}
      />
      <TemperatureGauge
        position={[layout.xGateDis - 0.05, yCL, 0]}
        pipeRadius={PIPE_R}
        label={`TG-${tag}-D`}
      />
      <TestPort position={[layout.xCheck + 0.32, yCL, 0]} pipeRadius={PIPE_R} />

      {/* ===================== PDI ACROSS PUMP ===================== */}
      <PdiAcrossPump
        position={[layout.voluteX, yCL + 0.85, 0.42]}
        tag={pdiTag}
        suctionTapWorld={[layout.suctionPipeFaceX + 0.05, yCL + PIPE_R, 0]}
        dischargeTapWorld={[layout.dischargePipeFaceX - 0.05, yCL + PIPE_R, 0]}
      />

      {/* ===================== LOW-POINT DRAIN AT VOLUTE =====================
          Drain valve hangs off a short stub from the bottom of the volute, just
          above the skid grout cap so the operator can plumb a hose to a floor
          drain when servicing the pump. */}
      <DrainValve
        valveId={drainValveId}
        position={[layout.voluteX, layout.shaftY - PIPE_R * 2.0, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        pipeRadius={PIPE_R * 0.55}
      />

      {/* ===================== TAG / SIGNAGE ===================== */}
      <Billboard position={[layout.voluteX, 1.55, 0]}>
        <Text
          fontSize={0.13}
          color="#f0f0f0"
          outlineWidth={0.008}
          outlineColor="#000000"
          anchorX="center"
          anchorY="middle"
          fontWeight={700}
        >
          {tag}
        </Text>
      </Billboard>
    </>
  );
}

/* ============================================================================
   <CDWPPumpAssembly />
   Condenser Water Pump assembly.
   ──────────────────────────────────────────────────────────────────────────
   FLOW PATH (per pump-assemblies.spec.json):
     Rooftop cooling-tower basin (CWS, dark green)
       → vertical CWS riser dropping into engine-room ceiling
       → suction isolation gate valve (vertical)
       → Y-strainer with blow-down
       → eccentric reducer (FLAT SIDE UP)
       → long-radius 90° elbow → horizontal suction spool (≥ 6 pipe Ø)
       → close-coupled suction isolation gate
       → CDWP suction inlet flange
       ──── pump ────
       → CDWP discharge flange
       → swing check valve (dark green)
       → discharge isolation gate (dark green)
       → inline magmeter FT (FT-CDWP-1)
       → discharge tie-off (heads to YORK chiller condenser water inlet)
   ──────────────────────────────────────────────────────────────────────────
   The discharge tail of this assembly ends at `xDischargeOut`; the parent
   scene is responsible for routing the short final spool / elbow into the
   chiller condenser inlet flange (its world position is plant-specific).
============================================================================ */
export function CDWPPumpAssembly({
  position,
  rotation = [0, 0, 0],
  running,
  tag = 'CDWP-1',
  suctionValveId,
  dischargeValveId,
  drainValveId,
  paint = 'gold',
  vfdZoomed,
  onVfdZoom,
  vfdScreenAnchorRef,
  vfdOccluderRef,
}: PumpAssemblyProps) {
  const layout = computeAssemblyLayout('cdw');
  /* Concrete skid footprint matches the long-coupled pump/motor baseplate:
       • Long axis along Z (motor-to-pump), short axis along X (flange direction)
       • Centered on the assembly midpoint in Z (NOT on Z=0 / volute) so the
         pad actually underlies the motor as well as the pump. */
  const baseFoot = getPumpBaseFootprint(PIPE_R, 'cdw');
  return (
    <group name={`pump-assembly:${tag}`} position={position} rotation={rotation}>
      {/* Reinforced-concrete inertia pad — keeps pump above floor washdown */}
      <group position={[layout.voluteX, 0, baseFoot.baseCenterZ]}>
        <ConcreteSkid baseL={baseFoot.baseL} baseW={baseFoot.baseW} />
      </group>
      <PumpAssemblyBody
        layout={layout}
        pipeColorSuction={COLOR.CWS}
        pipeColorDischarge={COLOR.CWS}
        tag={tag}
        duty="cdw"
        paint={paint}
        running={running}
        suctionValveId={suctionValveId}
        dischargeValveId={dischargeValveId}
        drainValveId={drainValveId}
      />
      {/* CDWP discharge tail — short stub; parent scene bridges to CWS riser */}
      <HorizPipe
        x0={layout.xDischargeOut}
        x1={layout.xDischargeOut + 0.65}
        y={layout.shaftY}
        z={0}
        pipeColor={COLOR.CWS}
      />
      <Billboard position={[layout.xDischargeOut + 0.32, layout.shaftY + 0.28, 0]}>
        <Text
          fontSize={0.07}
          color="#0a4a0a"
          anchorX="center"
          anchorY="middle"
        >
          → CWS CONDENSER
        </Text>
      </Billboard>
      {/* VFD enclosure — free-standing on the floor, well clear of the motor
          tail (motor reaches Z ≈ +1.55 at 1500-ton sizing). Door (HMI / LEDs /
          E-Stop) is on +X locally; rotate −90° about Y so it faces the pump
          which sits in the −Z direction. */}
      <VfdWallEnclosure
        position={[layout.voluteX, 0, VFD_OFFSET_Z]}
        rotation={[0, -Math.PI / 2, 0]}
        tag={tag}
        running={running}
        zoomed={vfdZoomed}
        onZoom={onVfdZoom}
        screenAnchorRef={vfdScreenAnchorRef}
        occluderRef={vfdOccluderRef}
      />
    </group>
  );
}

/* ============================================================================
   <CHWPPumpAssembly />
   Chilled Water Pump assembly.
   ──────────────────────────────────────────────────────────────────────────
   FLOW PATH (per pump-assemblies.spec.json):
     Rooftop AHU/RTU coil leaving water (CHR, light blue)
       → vertical CHR riser dropping into engine-room ceiling
       → suction isolation gate valve (vertical)
       → Y-strainer with blow-down
       → long-radius 90° elbow → horizontal suction spool (≥ 6 pipe Ø)
       → close-coupled suction isolation gate
       → CHWP suction inlet flange
       ──── pump ────
       → CHWP discharge flange
       → swing check valve (dark blue)
       → discharge isolation gate (dark blue)
       → inline magmeter FT (FT-CHWP-1)
       → vertical CHS riser heading UP through the roof to the AHU coil
   ──────────────────────────────────────────────────────────────────────────
============================================================================ */
export function CHWPPumpAssembly({
  position,
  rotation = [0, 0, 0],
  running,
  tag = 'CHWP-1',
  suctionValveId,
  dischargeValveId,
  drainValveId,
  paint = 'blue',
  vfdZoomed,
  onVfdZoom,
  vfdScreenAnchorRef,
  vfdOccluderRef,
}: PumpAssemblyProps) {
  const layout = computeAssemblyLayout('chw');
  /* Concrete skid footprint matches the long-coupled pump/motor baseplate
     (long in Z, short in X, centered on assembly midpoint). */
  const baseFoot = getPumpBaseFootprint(PIPE_R, 'chw');
  /* CHWP discharge tail — short horizontal spool, RIGHT→UP elbow, then vertical
     CHS up-riser toward ceiling. The riser X and Y start are pre-computed in
     the layout (xDischargeRiserX, yDischargeElbowCY). */
  const dischargeRiserX = layout.xDischargeRiserX;
  return (
    <group name={`pump-assembly:${tag}`} position={position} rotation={rotation}>
      {/* Reinforced-concrete inertia pad */}
      <group position={[layout.voluteX, 0, baseFoot.baseCenterZ]}>
        <ConcreteSkid baseL={baseFoot.baseL} baseW={baseFoot.baseW} />
      </group>
      <PumpAssemblyBody
        layout={layout}
        pipeColorSuction={COLOR.CHR}
        pipeColorDischarge={COLOR.CHS}
        tag={tag}
        duty="chw"
        paint={paint}
        running={running}
        suctionValveId={suctionValveId}
        dischargeValveId={dischargeValveId}
        drainValveId={drainValveId}
      />
      {/* CHWP discharge tail:
            flange → horizontal stub → 90° RIGHT→UP elbow → vertical CHS riser up.
          Elbow geometry (rotation [0,π,0]):
            phi=π/2 entry: (xDischargeHorizEnd, shaftY) — end of horiz stub ✓
            phi=0   exit:  (xDischargeRiserX,   yDischargeElbowCY) — riser base ✓
          The riser exits through the ceiling at (dischargeRiserX, CEILING_Y, 0);
          PumpHydraulicTieIns bridges this to the CHWS low header. */}
      <HorizPipe
        x0={layout.xDischargeOut}
        x1={layout.xDischargeHorizEnd}
        y={layout.shaftY}
        z={0}
        pipeColor={COLOR.CHS}
      />
      {/* RIGHT→UP elbow: centre = (xDischargeHorizEnd, yDischargeElbowCY).
          rotation [0,π,0]: phi=0→tube at (−elbowR,0)+centre → (+Y tangent exit),
                            phi=π/2→tube at (0,+elbowR)+centre → (+X tangent entry). */}
      <mesh
        position={[layout.xDischargeHorizEnd, layout.yDischargeElbowCY, 0]}
        rotation={[0, Math.PI, 0]}
      >
        <torusGeometry args={[layout.elbowR, PIPE_R, 12, 22, Math.PI / 2]} />
        <meshStandardMaterial color={COLOR.CHS} roughness={0.55} metalness={0.45} />
      </mesh>
      <VerticalPipe
        x={dischargeRiserX}
        z={0}
        y0={layout.yDischargeElbowCY}
        y1={CEILING_Y}
        pipeColor={COLOR.CHS}
        insulated
      />
      {/* Ceiling penetration sleeve */}
      <mesh position={[dischargeRiserX, CEILING_Y - 0.05, 0]}>
        <cylinderGeometry args={[PIPE_R * 1.85, PIPE_R * 1.95, 0.18, 16]} />
        <meshStandardMaterial color="#7c8086" roughness={0.55} metalness={0.55} />
      </mesh>
      <Billboard position={[dischargeRiserX + 0.35, CEILING_Y - 0.45, 0]}>
        <Text
          fontSize={0.07}
          color="#0a2540"
          anchorX="center"
          anchorY="middle"
        >
          CHS → CHWS HDR
        </Text>
      </Billboard>
      {/* VFD enclosure — free-standing on the −Z side (away from the chiller,
          since CHWP is at world Z = −9.5 with the chiller at Z = 0). This
          keeps cabling and heat clear of the suction-side instrument cluster.
          Door (HMI on +X locally) rotated +90° about Y to face the pump (+Z). */}
      <VfdWallEnclosure
        position={[layout.voluteX, 0, -VFD_OFFSET_Z]}
        rotation={[0, Math.PI / 2, 0]}
        tag={tag}
        running={running}
        zoomed={vfdZoomed}
        onZoom={onVfdZoom}
        screenAnchorRef={vfdScreenAnchorRef}
        occluderRef={vfdOccluderRef}
      />
    </group>
  );
}

/* ============================================================================
   INTEGRATION EXAMPLE (per pump-assemblies.spec output_expectations):
   ──────────────────────────────────────────────────────────────────────────
   Inside the engine-room scene — same world frame as the YORK chiller at
   (0, 0, 0), with the chiller's evaporator on the −X end and the condenser
   on the +X end:

     <CDWPPumpAssembly
       position={[2.74, 0, 5.6]}                // condenser end (right of chiller)
       running={cdwFlow}
       tag="CDWP-1"
       suctionValveId="pipe_gate_cdwp_suction"
       dischargeValveId="pipe_gate_cdwp_discharge"
       drainValveId="pipe_drain_cdwp_low"
     />

     <CHWPPumpAssembly
       position={[-4.20, 0, -5.6]}              // evaporator end (left of chiller)
       running={chwFlow}
       tag="CHWP-1"
       suctionValveId="pipe_gate_chwp_suction"
       dischargeValveId="pipe_gate_chwp_discharge"
       drainValveId="pipe_drain_chwp_low"
     />

   Each assembly handles its own suction riser, valve train, pump, and
   discharge train. The parent scene is responsible only for routing the
   short final stub from each `xDischargeOut` tail into the chiller nozzle
   or the rooftop riser, and the corresponding ceiling penetration.
============================================================================ */
