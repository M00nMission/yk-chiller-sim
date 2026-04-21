/* ============================================================================
   AhuComponents.tsx
   Reusable, training-oriented internal components for a built-up rooftop
   air-handling unit. Each export is a self-contained R3F group drawn in its
   own local coordinate frame (origin at the visible center, +Y up). Callers
   place / rotate them inside the AHU casing via a wrapping <group>.

   COMPONENTS
     • MervFilterBank        – pleated final-filter rack (MERV 13 cartridges)
     • ChwCopperCoil         – chilled-water cooling coil (Cu tube / Al fins)
     • EvaporatorCoilDx      – DX A-frame evaporator coil with distributor
     • HousedCentrifugalBlower – DWDI scroll fan with belt-drive motor
     • ServiceDisconnect     – NEMA 3R fused safety switch with lockable handle
     • OutsideAirDamper      – parallel-blade OA damper with linkage + actuator

   COORDINATE / ORIENTATION CONVENTION
     For air-side components (filter / coil / blower / damper) airflow is along
     local +X. The face the airstream HITS is the −X face; the face it leaves
     from is the +X face. Width is along Z, height along Y.
     The disconnect is a flat enclosure facing local +Z.

   The geometry is intentionally low-poly but instantly readable as the right
   piece of equipment: enough to teach a cooling-coil cross-section, a
   slide-in MERV cartridge, a V-belt drive, a fused safety switch, etc.
============================================================================ */

import { Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

type Triple = [number, number, number];

/* ─── Shared palette ──────────────────────────────────────────────────────── */
const STEEL_LIGHT      = '#b6bac0';
const STEEL_MID        = '#8d9097';
const STEEL_DARK       = '#5a5e64';
const STEEL_BLACK      = '#272a2e';
const COPPER           = '#b97334';
const COPPER_SHINE     = '#d28a44';
const ALUMINUM         = '#c8ccd2';
const ALUMINUM_DULL    = '#a3a8af';
const FILTER_MEDIA     = '#e7e2cf';
const FILTER_MEDIA_DK  = '#bdb6a0';
const FILTER_FRAME_KFT = '#3a4148';        // kraft / box-board edge
const SAFETY_YELLOW    = '#d8a722';
const SAFETY_RED       = '#a01818';
const ENCLOSURE_GREY   = '#3a3a38';
const NAMEPLATE_TAN    = '#d8d4c5';
const RUBBER_BLACK     = '#171717';
const SPRING_GREEN     = '#3b6a3b';        // isolator paint
const ACTUATOR_RED     = '#b03a2e';        // Belimo-ish barrel
const RELIEF_BLUE      = '#5a7fa8';

/* ============================================================================
   <MervFilterBank/>
   Pleated final-filter rack — visible through an open AHU access door so the
   technician sees the cartridges, the slide tracks they ride in, and the
   spring-loaded holding clips that seal them against the upstream face.

   Cartridges: standard 24 × 24 × 12 in. MERV 13 box filters. The pleat pack
   is modeled as a series of thin alternating-angle aluminum-edged kraft
   fingers — close enough to read at 1–2 m as a pleated cartridge.
============================================================================ */
export interface MervFilterBankProps {
  position?: Triple;
  rotation?: Triple;
  /** Total face dimensions (Z = width, Y = height). Default 5.0 × 3.2 m. */
  width?: number;
  height?: number;
  /** Cartridge box depth along airflow (X). Default 0.32 m (≈12"). */
  depth?: number;
  /** Pleated cartridges per row × column. Default 6 × 4. */
  cols?: number;
  rows?: number;
  /** Optional scene-graph name (for inspect picking). Default 'ahu:FILT-AHU'. */
  name?: string;
}

export function MervFilterBank({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 5.0,
  height = 3.2,
  depth = 0.32,
  cols = 6,
  rows = 4,
  name = 'ahu:FILT-AHU',
}: MervFilterBankProps) {
  const cellW = width  / cols;        // Z extent of one cartridge
  const cellH = height / rows;        // Y extent of one cartridge
  const innerCellW = cellW * 0.94;
  const innerCellH = cellH * 0.94;

  /* Pleat fingers per cartridge (about 14 — enough to read as pleated) */
  const PLEATS = 14;
  const pleatStep = innerCellW / PLEATS;

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── Steel rack frame ── */}
      {/* Outer box: thin plate channel iron border on the −X (upstream) face */}
      <mesh position={[-depth / 2, 0, 0]}>
        <boxGeometry args={[0.04, height + 0.10, width + 0.10]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
      </mesh>
      {/* Outer box: same on the +X (downstream) face — these two together
          let cartridges drop in between the upstream sealing face and the
          downstream retaining tabs. */}
      <mesh position={[depth / 2, 0, 0]}>
        <boxGeometry args={[0.04, height + 0.10, width + 0.10]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
      </mesh>

      {/* Vertical separators between columns (slide rails) */}
      {Array.from({ length: cols + 1 }).map((_, ci) => {
        const z = -width / 2 + ci * cellW;
        return (
          <mesh key={`vsep-${ci}`} position={[0, 0, z]}>
            <boxGeometry args={[depth + 0.03, height + 0.04, 0.045]} />
            <meshStandardMaterial color={STEEL_MID} roughness={0.55} metalness={0.65} />
          </mesh>
        );
      })}

      {/* Horizontal slide tracks between rows */}
      {Array.from({ length: rows + 1 }).map((_, ri) => {
        const y = -height / 2 + ri * cellH;
        return (
          <mesh key={`hsep-${ri}`} position={[0, y, 0]}>
            <boxGeometry args={[depth + 0.03, 0.045, width + 0.04]} />
            <meshStandardMaterial color={STEEL_MID} roughness={0.55} metalness={0.65} />
          </mesh>
        );
      })}

      {/* ── Cartridges ── */}
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => {
          const cy = -height / 2 + (ri + 0.5) * cellH;
          const cz = -width  / 2 + (ci + 0.5) * cellW;
          return (
            <group key={`cart-${ri}-${ci}`} position={[0, cy, cz]}>
              {/* Cartridge box-board border (4 thin sides) */}
              {/* top */}
              <mesh position={[0, innerCellH / 2 - 0.025, 0]}>
                <boxGeometry args={[depth - 0.02, 0.05, innerCellW]} />
                <meshStandardMaterial color={FILTER_FRAME_KFT} roughness={0.95} metalness={0.0} />
              </mesh>
              {/* bottom */}
              <mesh position={[0, -innerCellH / 2 + 0.025, 0]}>
                <boxGeometry args={[depth - 0.02, 0.05, innerCellW]} />
                <meshStandardMaterial color={FILTER_FRAME_KFT} roughness={0.95} metalness={0.0} />
              </mesh>
              {/* left edge */}
              <mesh position={[0, 0, -innerCellW / 2 + 0.025]}>
                <boxGeometry args={[depth - 0.02, innerCellH - 0.10, 0.05]} />
                <meshStandardMaterial color={FILTER_FRAME_KFT} roughness={0.95} metalness={0.0} />
              </mesh>
              {/* right edge */}
              <mesh position={[0, 0, innerCellW / 2 - 0.025]}>
                <boxGeometry args={[depth - 0.02, innerCellH - 0.10, 0.05]} />
                <meshStandardMaterial color={FILTER_FRAME_KFT} roughness={0.95} metalness={0.0} />
              </mesh>

              {/* Pleat pack — alternating angled fingers spanning between
                  upstream and downstream faces. Even pleats lean +X, odd
                  pleats lean −X, so the front face reads as pleated media. */}
              {Array.from({ length: PLEATS }).map((_, pi) => {
                const dz = -innerCellW / 2 + (pi + 0.5) * pleatStep;
                const lean = pi % 2 === 0 ? 0.20 : -0.20;
                return (
                  <mesh
                    key={`pleat-${pi}`}
                    position={[0, 0, dz]}
                    rotation={[lean, 0, 0]}
                  >
                    <boxGeometry args={[depth - 0.06, innerCellH - 0.12, pleatStep * 1.05]} />
                    <meshStandardMaterial
                      color={pi % 2 === 0 ? FILTER_MEDIA : FILTER_MEDIA_DK}
                      roughness={0.95}
                      metalness={0.0}
                    />
                  </mesh>
                );
              })}
              {/* End-cap pleat hairlines (visible chevrons on the −X face) */}
              <mesh position={[-depth / 2 + 0.005, 0, 0]}>
                <boxGeometry args={[0.005, innerCellH - 0.10, innerCellW - 0.05]} />
                <meshStandardMaterial
                  color={ALUMINUM_DULL}
                  roughness={0.5}
                  metalness={0.6}
                  wireframe
                />
              </mesh>

              {/* Spring-loaded holding clip on each cartridge top edge —
                  presses cartridge against upstream sealing face. */}
              <mesh
                position={[depth / 2 + 0.020, innerCellH / 2 - 0.05, 0]}
              >
                <boxGeometry args={[0.06, 0.03, 0.18]} />
                <meshStandardMaterial color={STEEL_LIGHT} roughness={0.4} metalness={0.85} />
              </mesh>
            </group>
          );
        })
      )}

      {/* Differential-pressure tap on the rack (shown as a tiny brass nipple
          poking out of the +Z side of the upstream frame plate) */}
      <mesh position={[-depth / 2 + 0.01, height / 2 - 0.20, width / 2 + 0.05]}>
        <cylinderGeometry args={[0.022, 0.022, 0.10, 8]} />
        <meshStandardMaterial color={'#9a7a3a'} roughness={0.45} metalness={0.85} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   <ChwCopperCoil/>
   Chilled-water cooling coil — copper tubes / aluminum fins, multi-row deep.
   Headers run vertical at the −Z (supply) end of the slab. The opposite end
   shows the visible copper U-bend "hairpin" returns that take each circuit
   180° back through the slab. A galvanized condensate drain pan sits below.

   This is the "evaporator" of a chilled-water AHU (the chiller barrel does the
   refrigerant evaporation; on the air-side this is the heat-transfer slab).
============================================================================ */
export interface ChwCopperCoilProps {
  position?: Triple;
  rotation?: Triple;
  /** Slab face Z width × Y height (the air-side face). Default 4.6 × 3.0 m. */
  width?: number;
  height?: number;
  /** Coil depth along airflow (X). 8 rows ≈ 0.40 m. Default 0.42 m. */
  depth?: number;
  /** Number of finned rows in the depth direction (visual). Default 8. */
  rows?: number;
  /** Optional scene-graph name. Default 'ahu:COIL-AHU'. */
  name?: string;
}

export function ChwCopperCoil({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 4.6,
  height = 3.0,
  depth = 0.42,
  rows = 8,
  name = 'ahu:COIL-AHU',
}: ChwCopperCoilProps) {
  /* Vertical hairpin tube spacing (≈25 mm tube OD × 32 mm stagger) */
  const TUBE_RADIUS = 0.020;
  const TUBES = Math.max(8, Math.floor(height / 0.085));
  const TUBE_PITCH_Y = (height - 0.10) / (TUBES - 1);

  /* Fin pack: many thin aluminum sheets stacked along Z. Use one
     instanced sheet at low spacing — visually reads as a corrugated fin pack
     without exploding the polycount. We render 60 thin slabs across the slab
     width regardless of true fin count (typical real fin density is ~12 fpi,
     i.e. hundreds — purely visual approximation). */
  const FIN_COUNT = 60;
  const FIN_PITCH = (width - 0.04) / (FIN_COUNT - 1);

  /* Header inside-diameter / OD for visual */
  const HDR_R = 0.060;
  const HDR_HALF_LEN = height / 2 - 0.05;

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── End plates (sheet-metal side panels) at ±Z ── */}
      {[-1, 1].map((s) => (
        <mesh key={`endplate-${s}`} position={[0, 0, s * (width / 2)]}>
          <boxGeometry args={[depth + 0.04, height + 0.04, 0.025]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
      ))}

      {/* ── Top & bottom angle-iron frame ── */}
      {[-1, 1].map((s) => (
        <mesh key={`frame-tb-${s}`} position={[0, s * (height / 2), 0]}>
          <boxGeometry args={[depth + 0.04, 0.045, width + 0.05]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
      ))}

      {/* ── Aluminum fin pack ── */}
      {Array.from({ length: FIN_COUNT }).map((_, fi) => {
        const z = -width / 2 + 0.02 + fi * FIN_PITCH;
        return (
          <mesh key={`fin-${fi}`} position={[0, 0, z]}>
            <boxGeometry args={[depth - 0.02, height - 0.06, 0.005]} />
            <meshStandardMaterial
              color={fi % 4 === 0 ? ALUMINUM : ALUMINUM_DULL}
              roughness={0.45}
              metalness={0.7}
            />
          </mesh>
        );
      })}

      {/* ── Copper U-bend hairpins on the +Z return end ──
          Each tube row pair shares a U-bend that pokes out past the end plate
          on the +Z side, looking like the classic copper hairpin returns. */}
      {Array.from({ length: TUBES }).map((_, ti) => {
        const y = -height / 2 + 0.05 + ti * TUBE_PITCH_Y;
        // Each row of the pack is at a different X depth (column). For a
        // multi-row coil with staggered tubes, alternate X by row.
        const x = -depth / 2 + 0.05 + (ti % rows) * ((depth - 0.10) / Math.max(rows - 1, 1));
        return (
          <group key={`hairpin-${ti}`} position={[x, y, width / 2 + 0.01]}>
            {/* Tube exits through end plate */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, 0.06, 10]} />
              <meshStandardMaterial color={COPPER} roughness={0.45} metalness={0.85} />
            </mesh>
            {/* 180° return bend: torus arc, oriented vertical so the
                hairpin loops up to the next-up tube. Plays nicely
                visually whether or not there is a partner tube. */}
            <mesh
              position={[0, TUBE_PITCH_Y / 2, 0.06]}
              rotation={[0, Math.PI / 2, 0]}
            >
              <torusGeometry args={[TUBE_PITCH_Y / 2, TUBE_RADIUS, 8, 14, Math.PI]} />
              <meshStandardMaterial color={COPPER_SHINE} roughness={0.4} metalness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* ── Single continuous header pipe on the −Z end face ──
          Matches the Carrier reference: one vertical copper header running
          the full coil height on the header-connection side.  The supply
          nozzle exits at the BOTTOM; the return nozzle exits at the TOP.
          Both nozzles point straight out (−Z) as short horizontal stubs
          with black-insulated sleeves, exactly as seen in the product photo. */}
      <group position={[0, 0, -width / 2 - 0.10]}>
        {/* Full-height header pipe */}
        <mesh>
          <cylinderGeometry args={[HDR_R, HDR_R, height - 0.06, 18]} />
          <meshStandardMaterial color={COPPER} roughness={0.45} metalness={0.88} />
        </mesh>
        {/* Bonnet end-cap at the very top */}
        <mesh position={[0, (height - 0.06) / 2 + 0.035, 0]}>
          <cylinderGeometry args={[HDR_R + 0.014, HDR_R + 0.014, 0.05, 18]} />
          <meshStandardMaterial color={STEEL_MID} roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Bonnet end-cap at the very bottom */}
        <mesh position={[0, -(height - 0.06) / 2 - 0.035, 0]}>
          <cylinderGeometry args={[HDR_R + 0.014, HDR_R + 0.014, 0.05, 18]} />
          <meshStandardMaterial color={STEEL_MID} roughness={0.5} metalness={0.7} />
        </mesh>

        {/* Tube taps — small copper stubs from header into the fin pack (+Z) */}
        {Array.from({ length: Math.min(10, TUBES) }).map((_, ti) => {
          const ly = -(height - 0.10) / 2 + 0.05 + ti * ((height - 0.10) / Math.max(TUBES - 1, 1)) * (TUBES / Math.min(10, TUBES));
          return (
            <mesh
              key={`tap-${ti}`}
              position={[0, ly, 0.12]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[TUBE_RADIUS * 1.1, TUBE_RADIUS * 1.1, 0.22, 8]} />
              <meshStandardMaterial color={COPPER} roughness={0.5} metalness={0.85} />
            </mesh>
          );
        })}

        {/* ── CHWS nozzle — TOP of header, pointing straight out (−Z) ──
            Supply enters at the top: cold water fills the header from the top
            and distributes down through the tube rows (counterflow to warm
            return rising out the bottom). */}
        <group position={[0, +(height / 2 - 0.28), 0]}>
          {/* Copper nozzle stub */}
          <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[HDR_R * 1.4, HDR_R * 1.4, 0.50, 16]} />
            <meshStandardMaterial color={COPPER} roughness={0.4} metalness={0.88} />
          </mesh>
          {/* Blue insulation sleeve (supply — cold) */}
          <mesh position={[0, 0, -0.38]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[HDR_R * 1.4 + 0.032, HDR_R * 1.4 + 0.032, 0.28, 14]} />
            <meshStandardMaterial color="#1a3a6a" roughness={0.92} metalness={0.0} />
          </mesh>
          {/* Companion flange at nozzle end */}
          <mesh position={[0, 0, -0.54]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[HDR_R * 2.0, HDR_R * 2.0, 0.055, 16]} />
            <meshStandardMaterial color={STEEL_MID} roughness={0.45} metalness={0.85} />
          </mesh>
          {/* Bolt circle on flange */}
          {Array.from({ length: 6 }).map((_, bi) => {
            const a = (bi / 6) * Math.PI * 2;
            return (
              <mesh key={`sup-bolt-${bi}`} position={[Math.cos(a) * HDR_R * 1.75, Math.sin(a) * HDR_R * 1.75, -0.57]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.014, 0.014, 0.04, 6]} />
                <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.85} />
              </mesh>
            );
          })}
          {/* "CHWS IN" label plate */}
          <mesh position={[HDR_R * 1.4 + 0.042, 0, -0.38]}>
            <boxGeometry args={[0.005, 0.06, 0.12]} />
            <meshStandardMaterial color="#1a5fa8" roughness={0.4} metalness={0.8} />
          </mesh>
        </group>

        {/* ── CHWR nozzle — BOTTOM of header, pointing straight out (−Z) ──
            Return exits at the bottom: warm water that has absorbed heat from
            the air stream collects at the bottom of the header and leaves. */}
        <group position={[0, -(height / 2 - 0.28), 0]}>
          {/* Copper nozzle stub */}
          <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[HDR_R * 1.4, HDR_R * 1.4, 0.50, 16]} />
            <meshStandardMaterial color={COPPER} roughness={0.4} metalness={0.88} />
          </mesh>
          {/* Grey/dark insulation sleeve (return — warm) */}
          <mesh position={[0, 0, -0.38]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[HDR_R * 1.4 + 0.032, HDR_R * 1.4 + 0.032, 0.28, 14]} />
            <meshStandardMaterial color={RUBBER_BLACK} roughness={0.92} metalness={0.0} />
          </mesh>
          {/* Companion flange */}
          <mesh position={[0, 0, -0.54]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[HDR_R * 2.0, HDR_R * 2.0, 0.055, 16]} />
            <meshStandardMaterial color={STEEL_MID} roughness={0.45} metalness={0.85} />
          </mesh>
          {/* Bolt circle */}
          {Array.from({ length: 6 }).map((_, bi) => {
            const a = (bi / 6) * Math.PI * 2;
            return (
              <mesh key={`ret-bolt-${bi}`} position={[Math.cos(a) * HDR_R * 1.75, Math.sin(a) * HDR_R * 1.75, -0.57]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.014, 0.014, 0.04, 6]} />
                <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.85} />
              </mesh>
            );
          })}
          {/* "CHWR OUT" label plate */}
          <mesh position={[HDR_R * 1.4 + 0.042, 0, -0.38]}>
            <boxGeometry args={[0.005, 0.06, 0.12]} />
            <meshStandardMaterial color="#4a8ab8" roughness={0.4} metalness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ── Galvanized condensate drain pan beneath the slab ── */}
      <mesh position={[0, -height / 2 - 0.08, 0]}>
        <boxGeometry args={[depth + 0.30, 0.07, width + 0.20]} />
        <meshStandardMaterial color={STEEL_LIGHT} roughness={0.7} metalness={0.55} />
      </mesh>
      {/* Drain pan trough lip (front edge slightly raised) */}
      <mesh position={[depth / 2 + 0.13, -height / 2 - 0.04, 0]}>
        <boxGeometry args={[0.04, 0.10, width + 0.20]} />
        <meshStandardMaterial color={STEEL_LIGHT} roughness={0.7} metalness={0.55} />
      </mesh>
      {/* Drain stub + P-trap (sticking out the +Z end of the pan) */}
      <mesh position={[0, -height / 2 - 0.18, width / 2 + 0.18]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.30, 12]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
      </mesh>
      <mesh position={[0, -height / 2 - 0.30, width / 2 + 0.32]}>
        <torusGeometry args={[0.12, 0.05, 8, 16, Math.PI]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
      </mesh>

      {/* ── ASME nameplate on the supply end plate ── */}
      <mesh position={[depth / 2 + 0.020, 0, -width / 2 - 0.013]}>
        <boxGeometry args={[0.16, 0.10, 0.006]} />
        <meshStandardMaterial color={NAMEPLATE_TAN} roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   <EvaporatorCoilDx/>
   Direct-expansion (refrigerant) A-frame evaporator coil — two slab halves
   leaned into a peak with a copper distributor at top of the −X face and a
   suction header at the bottom. Useful for showing a packaged-RTU style
   evaporator where the AHU is DX-cooled rather than chilled-water.

   Includes:
     • two angled coil slabs (Cu / Al)
     • copper distributor + 6 metering capillaries to slab inlets
     • suction header (insulated black armaflex)
     • thermal expansion valve (TXV) bulb on suction line
     • insulated condensate drain pan
============================================================================ */
export interface EvaporatorCoilDxProps {
  position?: Triple;
  rotation?: Triple;
  /** Plenum width (Z) × ridge height (Y). Default 2.6 × 1.4 m. */
  width?: number;
  height?: number;
  /** Footprint along airflow (X). Default 1.6 m. */
  depth?: number;
  name?: string;
}

export function EvaporatorCoilDx({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 2.6,
  height = 1.4,
  depth = 1.6,
  name = 'ahu:EVAP-DX',
}: EvaporatorCoilDxProps) {
  /* Each slab is a flat board canted toward the ridge */
  const slabLen = Math.sqrt((depth / 2) ** 2 + height ** 2);
  const slabAngle = Math.atan2(depth / 2, height); // tilt from vertical

  /* Number of fin sheets per slab (visual approximation) */
  const FINS = 36;
  const FIN_PITCH = (width - 0.06) / (FINS - 1);

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── Pan / base ── */}
      <mesh position={[0, -0.02, 0]}>
        <boxGeometry args={[depth + 0.20, 0.07, width + 0.20]} />
        <meshStandardMaterial color={STEEL_LIGHT} roughness={0.7} metalness={0.55} />
      </mesh>
      {/* Insulation closed-cell foam wrap on pan underside (black armaflex) */}
      <mesh position={[0, -0.075, 0]}>
        <boxGeometry args={[depth + 0.18, 0.025, width + 0.18]} />
        <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.0} />
      </mesh>

      {/* ── Two slab halves (A-frame) ── */}
      {[+1, -1].map((s) => (
        <group key={`slab-${s}`}>
          {/* Slab end plates */}
          {[-1, 1].map((ze) => (
            <mesh
              key={`ep-${s}-${ze}`}
              position={[
                s * (depth / 4),
                height / 2,
                ze * (width / 2),
              ]}
              rotation={[0, 0, s * slabAngle]}
            >
              <boxGeometry args={[0.025, slabLen, 0.04]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
            </mesh>
          ))}
          {/* Slab fin pack */}
          {Array.from({ length: FINS }).map((_, fi) => {
            const z = -width / 2 + 0.03 + fi * FIN_PITCH;
            return (
              <mesh
                key={`evapfin-${s}-${fi}`}
                position={[s * (depth / 4), height / 2, z]}
                rotation={[0, 0, s * slabAngle]}
              >
                <boxGeometry args={[0.04, slabLen - 0.03, 0.005]} />
                <meshStandardMaterial
                  color={fi % 4 === 0 ? ALUMINUM : ALUMINUM_DULL}
                  roughness={0.45}
                  metalness={0.7}
                />
              </mesh>
            );
          })}
          {/* Three copper tubes through each slab, drawn as thin cylinders
              along the local slab "length" axis (we approximate by a single
              orientation since the tilt is small — visually adequate). */}
          {[-0.30, 0.0, 0.30].map((dy, ti) => {
            const cx = s * (depth / 4 - Math.sin(s * slabAngle) * dy);
            const cy = height / 2 + Math.cos(slabAngle) * dy;
            return (
              <mesh
                key={`evtube-${s}-${ti}`}
                position={[cx, cy, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.014, 0.014, width - 0.04, 8]} />
                <meshStandardMaterial color={COPPER} roughness={0.5} metalness={0.85} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* ── Copper liquid-line distributor (a small brass "spider") at peak ── */}
      <mesh position={[0, height + 0.04, 0]}>
        <sphereGeometry args={[0.08, 16, 12]} />
        <meshStandardMaterial color={COPPER_SHINE} roughness={0.4} metalness={0.9} />
      </mesh>
      {/* Liquid-line stub coming up to the distributor */}
      <mesh position={[0, height + 0.30, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.55, 12]} />
        <meshStandardMaterial color={COPPER} roughness={0.5} metalness={0.85} />
      </mesh>
      {/* Six metering capillaries from distributor down to slab inlets */}
      {Array.from({ length: 6 }).map((_, ci) => {
        const ang = (ci / 6) * Math.PI - Math.PI / 2;
        const tx = Math.cos(ang) * 0.22;
        const ty = -0.22;
        const tz = Math.sin(ang) * 0.22;
        return (
          <mesh
            key={`cap-${ci}`}
            position={[tx / 2, height + 0.04 + ty / 2, tz / 2]}
            rotation={[0, Math.atan2(tz, tx), -Math.PI / 4]}
          >
            <cylinderGeometry args={[0.005, 0.005, 0.30, 6]} />
            <meshStandardMaterial color={COPPER_SHINE} roughness={0.4} metalness={0.9} />
          </mesh>
        );
      })}

      {/* ── Suction header on +Z side, insulated black armaflex ── */}
      <mesh position={[0, 0.20, width / 2 + 0.10]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.50, 16]} />
        <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.0} />
      </mesh>
      {/* TXV bulb strapped to suction line */}
      <mesh position={[0.18, 0.20, width / 2 + 0.10]}>
        <cylinderGeometry args={[0.035, 0.035, 0.10, 12]} />
        <meshStandardMaterial color={COPPER} roughness={0.5} metalness={0.85} />
      </mesh>
      <mesh position={[0.32, 0.20, width / 2 + 0.10]}>
        <boxGeometry args={[0.16, 0.16, 0.16]} />
        <meshStandardMaterial color={'#9a9a9a'} roughness={0.4} metalness={0.85} />
      </mesh>

      {/* ── Drain stub from pan ── */}
      <mesh position={[0, -0.18, width / 2 + 0.18]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.30, 12]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
      </mesh>

      {/* Service nameplate */}
      <mesh position={[0, 0.05, -width / 2 - 0.03]}>
        <boxGeometry args={[0.18, 0.10, 0.006]} />
        <meshStandardMaterial color={NAMEPLATE_TAN} roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   <HousedCentrifugalBlower/>
   Belt-drive housed centrifugal supply fan — DWDI scroll housing with the
   squirrel-cage wheel visible through the inlet cones, a TEFC induction motor
   on a slide-rail base, V-belt drive between the motor sheave and the fan
   sheave, an OSHA belt guard, and rubber-in-shear / spring isolators below
   the base. Wheel and motor sheave spin in useFrame so the fan reads as
   "running".
============================================================================ */
export interface HousedCentrifugalBlowerProps {
  position?: Triple;
  rotation?: Triple;
  /** Wheel diameter (m). Default 0.90. */
  wheelDiameter?: number;
  /** Wheel width (m, also scroll depth along Z). Default 0.95. */
  wheelWidth?: number;
  /** RPM (visual only). Default 720. */
  rpm?: number;
  name?: string;
}

export function HousedCentrifugalBlower({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  wheelDiameter = 0.90,
  wheelWidth = 0.95,
  rpm = 720,
  name = 'ahu:BLW-AHU',
}: HousedCentrifugalBlowerProps) {
  const wheelRef = useRef<THREE.Group>(null);
  const motorSheaveRef = useRef<THREE.Group>(null);
  const fanSheaveRef = useRef<THREE.Group>(null);

  /* Visual scaling: cap perceived RPM so it doesn't look like a smear */
  const wheelRadPerSec = (rpm / 60) * Math.PI * 2 * 0.10;
  const motorRadPerSec = wheelRadPerSec * 1.8;     // smaller motor sheave
  const motorSheaveRadius = 0.10;
  const fanSheaveRadius   = 0.18;
  const sheaveCenterZ     = -wheelWidth / 2 - 0.18;

  useFrame((_, dt) => {
    if (wheelRef.current)       wheelRef.current.rotation.z       += dt * wheelRadPerSec;
    if (fanSheaveRef.current)   fanSheaveRef.current.rotation.z   += dt * wheelRadPerSec;
    if (motorSheaveRef.current) motorSheaveRef.current.rotation.z += dt * motorRadPerSec;
  });

  const R = wheelDiameter / 2;
  /* Scroll housing: cylindrical shell sized just larger than the wheel. The
     rectangular discharge collar above the housing reads as the scroll exit;
     visually adequate for training without a true logarithmic-spiral profile. */
  const scrollR_out  = R + 0.32;       // outer scroll wall on +X / +Y side

  /* Discharge collar above wheel */
  const dischargeW = wheelDiameter * 1.15;
  const dischargeH = wheelDiameter * 0.55;

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── Slide-rail base + spring isolators ── */}
      <mesh position={[0, -R - 0.10, 0]}>
        <boxGeometry args={[wheelDiameter * 2.4, 0.10, wheelWidth + 0.40]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
      </mesh>
      {/* 4 spring isolators */}
      {[
        [-wheelDiameter,  -wheelWidth / 2 - 0.10],
        [+wheelDiameter,  -wheelWidth / 2 - 0.10],
        [-wheelDiameter,  +wheelWidth / 2 + 0.10],
        [+wheelDiameter,  +wheelWidth / 2 + 0.10],
      ].map(([sx, sz], si) => (
        <group key={`iso-${si}`} position={[sx as number, -R - 0.22, sz as number]}>
          <mesh>
            <cylinderGeometry args={[0.10, 0.10, 0.16, 14]} />
            <meshStandardMaterial color={SPRING_GREEN} roughness={0.6} metalness={0.4} />
          </mesh>
          {/* Spring coil illusion: torus stack */}
          {[0.04, 0, -0.04].map((dy, ki) => (
            <mesh key={`coil-${si}-${ki}`} position={[0, dy, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.07, 0.012, 6, 16]} />
              <meshStandardMaterial color={STEEL_LIGHT} roughness={0.45} metalness={0.85} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── Scroll housing ──
          Outer drum + inlet cones on each end. Cylindrical for visual
          simplicity; the cutoff and discharge collar at top read as a scroll. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[scrollR_out, scrollR_out, wheelWidth + 0.04, 32, 1, true]} />
        <meshStandardMaterial color={STEEL_LIGHT} roughness={0.5} metalness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Side end-walls (donuts) — outer disc with inlet hole */}
      {[-1, 1].map((s) => (
        <group key={`endwall-${s}`} position={[0, 0, s * (wheelWidth / 2 + 0.02)]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[R + 0.04, scrollR_out, 32]} />
            <meshStandardMaterial color={STEEL_LIGHT} roughness={0.5} metalness={0.7} side={THREE.DoubleSide} />
          </mesh>
          {/* Inlet cone (bell mouth) on each side — DWDI = double-width / dual-inlet */}
          <mesh position={[0, 0, s * 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[R - 0.02, R + 0.04, 0.25, 24, 1, true]} />
            <meshStandardMaterial color={STEEL_LIGHT} roughness={0.5} metalness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* ── Discharge collar (rectangular, exits +Y top) ── */}
      <mesh position={[0, scrollR_out + dischargeH / 2 - 0.02, 0]}>
        <boxGeometry args={[dischargeW, dischargeH, wheelWidth + 0.04]} />
        <meshStandardMaterial color={STEEL_LIGHT} roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Discharge collar flange lip */}
      <mesh position={[0, scrollR_out + dischargeH + 0.02, 0]}>
        <boxGeometry args={[dischargeW + 0.10, 0.05, wheelWidth + 0.14]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.75} />
      </mesh>

      {/* ── Squirrel-cage wheel (rotating) ── */}
      <group ref={wheelRef}>
        {/* Backplate disc */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R, R, 0.025, 28]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Hub */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.10, 0.10, wheelWidth - 0.08, 16]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.4} metalness={0.85} />
        </mesh>
        {/* Forward-curved blades — many short scoops around the perimeter */}
        {Array.from({ length: 36 }).map((_, bi) => {
          const ang = (bi / 36) * Math.PI * 2;
          return (
            <mesh
              key={`scwheelblade-${bi}`}
              position={[Math.cos(ang) * (R - 0.06), Math.sin(ang) * (R - 0.06), 0]}
              rotation={[0, 0, ang + Math.PI / 2]}
            >
              <boxGeometry args={[0.05, 0.10, wheelWidth - 0.10]} />
              <meshStandardMaterial color={STEEL_LIGHT} roughness={0.4} metalness={0.85} />
            </mesh>
          );
        })}
      </group>
      {/* Shaft passing out the −Z side toward the sheave */}
      <mesh
        position={[0, 0, sheaveCenterZ + 0.1]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.030, 0.030, Math.abs(sheaveCenterZ) + wheelWidth / 2 + 0.20, 12]} />
        <meshStandardMaterial color={STEEL_BLACK} roughness={0.4} metalness={0.85} />
      </mesh>
      {/* Pillow-block bearings on the shaft (one inboard, one outboard) */}
      {[-wheelWidth / 2 - 0.05, sheaveCenterZ + 0.20].map((bz, bi) => (
        <mesh key={`pblock-${bi}`} position={[0, -0.05, bz]}>
          <boxGeometry args={[0.20, 0.20, 0.10]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.8} />
        </mesh>
      ))}

      {/* ── Fan sheave (large) on the protruding shaft ── */}
      <group ref={fanSheaveRef} position={[0, 0, sheaveCenterZ]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[fanSheaveRadius, fanSheaveRadius, 0.05, 24]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.5} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[fanSheaveRadius, 0.012, 8, 24]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.85} />
        </mesh>
      </group>

      {/* ── TEFC motor on the slide-rail base, parallel to fan ── */}
      <group position={[0, -R + 0.05, sheaveCenterZ - 0.40]}>
        {/* Frame body */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.55, 18]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.5} metalness={0.75} />
        </mesh>
        {/* Cooling fins along the frame */}
        {Array.from({ length: 9 }).map((_, fi) => {
          const ang = (fi / 9) * Math.PI * 2;
          return (
            <mesh
              key={`mfin-${fi}`}
              rotation={[Math.PI / 2, 0, ang]}
            >
              <boxGeometry args={[0.42, 0.55, 0.02]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
            </mesh>
          );
        })}
        {/* Conduit box on top */}
        <mesh position={[0, 0.18, 0]}>
          <boxGeometry args={[0.18, 0.10, 0.20]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Output shaft toward +Z (toward fan side) */}
        <mesh position={[0, 0, 0.30]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.18, 10]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.4} metalness={0.85} />
        </mesh>
        {/* TEFC fan cowl on the −Z end */}
        <mesh position={[0, 0, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.20, 0.20, 0.10, 16]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
        {/* Nameplate on top */}
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[0.12, 0.006, 0.16]} />
          <meshStandardMaterial color={NAMEPLATE_TAN} roughness={0.45} metalness={0.85} />
        </mesh>
      </group>

      {/* ── Motor sheave on the motor's +Z (fan-side) shaft end ── */}
      <group ref={motorSheaveRef} position={[0, -R + 0.05, sheaveCenterZ - 0.05]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[motorSheaveRadius, motorSheaveRadius, 0.05, 18]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.5} metalness={0.85} />
        </mesh>
      </group>

      {/* ── V-belt loop between the two sheaves (static — visual only) ──
          Two short straight segments that connect the tangents. */}
      {[+1, -1].map((s) => (
        <mesh
          key={`belt-${s}`}
          position={[
            0,
            (-R + 0.05 + s * fanSheaveRadius * 0.95) / 2,
            sheaveCenterZ - 0.025,
          ]}
          rotation={[0, 0, Math.atan2(
            (fanSheaveRadius - motorSheaveRadius) * s,
            0.40,
          )]}
        >
          <boxGeometry args={[0.40, 0.018, 0.018]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.85} metalness={0.05} />
        </mesh>
      ))}

      {/* ── OSHA belt guard ── */}
      <mesh position={[0, -R / 2 + 0.05, sheaveCenterZ - 0.20]}>
        <boxGeometry args={[0.55, fanSheaveRadius * 2.4, 0.32]} />
        <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.5} metalness={0.4} transparent opacity={0.55} />
      </mesh>
      {/* Belt-guard expanded-mesh "screen" pattern (vertical bars on +Z face) */}
      {Array.from({ length: 9 }).map((_, gi) => (
        <mesh
          key={`bgbar-${gi}`}
          position={[
            -0.25 + gi * (0.50 / 8),
            -R / 2 + 0.05,
            sheaveCenterZ - 0.20 + 0.16,
          ]}
        >
          <boxGeometry args={[0.012, fanSheaveRadius * 2.2, 0.012]} />
          <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}

      {/* ── Inlet vane / damper actuator stub on +Z inlet cone ── */}
      <mesh position={[R + 0.20, 0, wheelWidth / 2 + 0.20]}>
        <cylinderGeometry args={[0.04, 0.04, 0.18, 12]} />
        <meshStandardMaterial color={ACTUATOR_RED} roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   <ServiceDisconnect/>
   Heavy-duty NEMA 3R fused safety switch ("service disconnect"). Side-mounted
   operating handle that can be padlocked in OFF position via a lockout staple
   for OSHA 1910.147 LOTO. Conduit hubs on top and bottom for line and load
   feeders. Drip-shield top and engraved nameplate.
============================================================================ */
export interface ServiceDisconnectProps {
  position?: Triple;
  rotation?: Triple;
  /** Enclosure W (Z) × H (Y) × D (X). Defaults sized for ~100 A 480 V switch. */
  width?: number;
  height?: number;
  depth?: number;
  /** Visual handle position. ON = up, OFF = down. Default 'on'. */
  state?: 'on' | 'off';
  /** Tag printed on the engraved nameplate. Default 'DS-AHU-1'. */
  tag?: string;
  /** Voltage / current label. Default '480V 3PH 100A FUSED'. */
  rating?: string;
  name?: string;
}

export function ServiceDisconnect({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.55,
  height = 0.95,
  depth = 0.28,
  state = 'on',
  tag = 'DS-AHU-1',
  rating = '480V 3PH 100A FUSED',
  name = 'electrical:DS-AHU',
}: ServiceDisconnectProps) {
  const handleAngle = state === 'on' ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── Enclosure body ── */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[depth, height, width]} />
        <meshStandardMaterial color={ENCLOSURE_GREY} roughness={0.55} metalness={0.55} />
      </mesh>

      {/* Drip-shield "hat" on top */}
      <mesh position={[0.02, height / 2 + 0.025, 0]}>
        <boxGeometry args={[depth + 0.10, 0.035, width + 0.06]} />
        <meshStandardMaterial color={ENCLOSURE_GREY} roughness={0.55} metalness={0.55} />
      </mesh>
      <mesh position={[depth / 2 + 0.05, height / 2 + 0.012, 0]}>
        <boxGeometry args={[0.03, 0.06, width + 0.06]} />
        <meshStandardMaterial color={ENCLOSURE_GREY} roughness={0.55} metalness={0.55} />
      </mesh>

      {/* ── Door (front face = +X) ── */}
      <mesh position={[depth / 2 + 0.005, 0, 0]}>
        <boxGeometry args={[0.012, height - 0.04, width - 0.04]} />
        <meshStandardMaterial color={STEEL_BLACK} roughness={0.55} metalness={0.55} />
      </mesh>

      {/* Door hinges on the −Z (left) edge */}
      {[-1, 1].map((s) => (
        <mesh
          key={`hinge-${s}`}
          position={[depth / 2 + 0.012, s * (height / 2 - 0.20), -width / 2 + 0.012]}
        >
          <boxGeometry args={[0.018, 0.10, 0.030]} />
          <meshStandardMaterial color={STEEL_LIGHT} roughness={0.5} metalness={0.85} />
        </mesh>
      ))}

      {/* ── Side-mounted operating handle (on +Z right side) ── */}
      <group position={[depth / 2 + 0.012, 0, width / 2 + 0.005]}>
        {/* Handle escutcheon plate engraved ON / OFF */}
        <mesh>
          <boxGeometry args={[0.012, 0.34, 0.18]} />
          <meshStandardMaterial color={STEEL_LIGHT} roughness={0.5} metalness={0.85} />
        </mesh>
        {/* Pivot boss */}
        <mesh position={[0.012, 0, 0]}>
          <cylinderGeometry args={[0.026, 0.026, 0.020, 16]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.85} />
        </mesh>
        {/* Lever (rotates handleAngle around X axis) */}
        <group rotation={[handleAngle, 0, 0]}>
          <mesh position={[0.025, 0.07, 0]}>
            <boxGeometry args={[0.030, 0.18, 0.040]} />
            <meshStandardMaterial color={SAFETY_RED} roughness={0.5} metalness={0.4} />
          </mesh>
          {/* Hand grip */}
          <mesh position={[0.025, 0.16, 0]}>
            <boxGeometry args={[0.038, 0.05, 0.060]} />
            <meshStandardMaterial color={SAFETY_RED} roughness={0.55} metalness={0.4} />
          </mesh>
          {/* Lockout staple at the pivot end of the lever */}
          <mesh position={[0.040, 0.005, 0]}>
            <torusGeometry args={[0.018, 0.005, 6, 12, Math.PI]} />
            <meshStandardMaterial color={STEEL_LIGHT} roughness={0.45} metalness={0.85} />
          </mesh>
        </group>
        {/* "ON" label */}
        <Text
          position={[0.020, 0.13, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.030}
          color={'#0a0a0a'}
          anchorX="center"
          anchorY="middle"
        >
          ON
        </Text>
        <Text
          position={[0.020, -0.13, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.030}
          color={'#0a0a0a'}
          anchorX="center"
          anchorY="middle"
        >
          OFF
        </Text>
      </group>

      {/* ── Conduit hubs (top + bottom, each side) ── */}
      {[
        [+height / 2 + 0.02, +width / 4],
        [+height / 2 + 0.02, -width / 4],
        [-height / 2 - 0.02, +width / 4],
        [-height / 2 - 0.02, -width / 4],
      ].map(([cy, cz], ci) => (
        <group key={`hub-${ci}`} position={[0, cy as number, cz as number]}>
          {/* Hub body */}
          <mesh>
            <cylinderGeometry args={[0.038, 0.038, 0.05, 16]} />
            <meshStandardMaterial color={STEEL_LIGHT} roughness={0.45} metalness={0.85} />
          </mesh>
          {/* Lock-nut ring */}
          <mesh position={[0, (cy as number) > 0 ? 0.035 : -0.035, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.012, 12]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.85} />
          </mesh>
          {/* Conduit stub */}
          <mesh position={[0, (cy as number) > 0 ? 0.10 : -0.10, 0]}>
            <cylinderGeometry args={[0.030, 0.030, 0.16, 14]} />
            <meshStandardMaterial color={STEEL_MID} roughness={0.55} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ── Engraved nameplate on the door ── */}
      <mesh position={[depth / 2 + 0.014, 0.30, 0]}>
        <boxGeometry args={[0.004, 0.10, width - 0.12]} />
        <meshStandardMaterial color={NAMEPLATE_TAN} roughness={0.45} metalness={0.85} />
      </mesh>
      <Text
        position={[depth / 2 + 0.018, 0.32, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.040}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        {tag}
      </Text>
      <Text
        position={[depth / 2 + 0.018, 0.27, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.024}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        {rating}
      </Text>

      {/* ── Warning sticker (yellow ARC-FLASH triangle) ── */}
      <mesh position={[depth / 2 + 0.014, -0.10, 0]}>
        <boxGeometry args={[0.004, 0.16, 0.20]} />
        <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.5} metalness={0.3} />
      </mesh>
      <Text
        position={[depth / 2 + 0.018, -0.06, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.024}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        DANGER
      </Text>
      <Text
        position={[depth / 2 + 0.018, -0.10, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.018}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        ARC FLASH HAZARD
      </Text>
      <Text
        position={[depth / 2 + 0.018, -0.14, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.014}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        PPE REQUIRED — NFPA 70E
      </Text>
    </group>
  );
}

/* ============================================================================
   <OutsideAirDamper/>
   Aluminum extruded parallel-blade outside-air damper with end-mounted
   modulating actuator (Belimo-style barrel) and external linkage. Blades
   rotate in useFrame to a slow demand-of-life sweep so the unit reads as
   actively modulating from a distance.
============================================================================ */
export interface OutsideAirDamperProps {
  position?: Triple;
  rotation?: Triple;
  /** Frame opening width (Z) × height (Y). Default 1.6 × 1.6 m. */
  width?: number;
  height?: number;
  /** Number of horizontal blades. Default 6. */
  blades?: number;
  /** Set to 'auto' to let the damper modulate; pass 0..1 for a fixed
   *  open-fraction. Default 'auto'. */
  open?: number | 'auto';
  name?: string;
}

export function OutsideAirDamper({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.6,
  height = 1.6,
  blades = 6,
  open = 'auto',
  name = 'ahu:OAD-AHU',
}: OutsideAirDamperProps) {
  const bladesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!bladesRef.current) return;
    let frac: number;
    if (open === 'auto') {
      // Slow modulation 25%–75% over ~30 s
      frac = 0.50 + 0.25 * Math.sin(state.clock.elapsedTime * 0.21);
    } else {
      frac = Math.min(1, Math.max(0, open));
    }
    /* 0% open => blades vertical (closed), 100% open => blades horizontal */
    const ang = (1 - frac) * (Math.PI / 2);
    bladesRef.current.children.forEach((c) => {
      (c as THREE.Object3D).rotation.x = ang;
    });
  });

  const bladeH = (height - 0.10) / blades;

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── Aluminum extruded frame (4 sides) ── */}
      {/* top */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.12, 0.05, width + 0.08]} />
        <meshStandardMaterial color={ALUMINUM} roughness={0.5} metalness={0.75} />
      </mesh>
      {/* bottom */}
      <mesh position={[0, -height / 2, 0]}>
        <boxGeometry args={[0.12, 0.05, width + 0.08]} />
        <meshStandardMaterial color={ALUMINUM} roughness={0.5} metalness={0.75} />
      </mesh>
      {/* left */}
      <mesh position={[0, 0, -width / 2]}>
        <boxGeometry args={[0.12, height + 0.04, 0.05]} />
        <meshStandardMaterial color={ALUMINUM} roughness={0.5} metalness={0.75} />
      </mesh>
      {/* right */}
      <mesh position={[0, 0, +width / 2]}>
        <boxGeometry args={[0.12, height + 0.04, 0.05]} />
        <meshStandardMaterial color={ALUMINUM} roughness={0.5} metalness={0.75} />
      </mesh>

      {/* ── Blades (parallel-action: all rotate the same direction together) ── */}
      <group ref={bladesRef}>
        {Array.from({ length: blades }).map((_, bi) => {
          const y = -height / 2 + bladeH / 2 + 0.04 + bi * bladeH;
          return (
            <group key={`oa-blade-${bi}`} position={[0, y, 0]}>
              <mesh>
                <boxGeometry args={[0.04, bladeH * 0.92, width - 0.04]} />
                <meshStandardMaterial color={ALUMINUM} roughness={0.4} metalness={0.85} />
              </mesh>
              {/* Blade edge-seal (rubber strip on +Y edge) */}
              <mesh position={[0, bladeH * 0.46, 0]}>
                <boxGeometry args={[0.045, 0.012, width - 0.04]} />
                <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.0} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ── External linkage bar on +Z edge ── */}
      <mesh position={[0.07, 0, width / 2 + 0.04]}>
        <boxGeometry args={[0.014, height - 0.10, 0.020]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
      </mesh>
      {/* Crank arms from each blade pivot to the linkage bar */}
      {Array.from({ length: blades }).map((_, bi) => {
        const y = -height / 2 + bladeH / 2 + 0.04 + bi * bladeH;
        return (
          <mesh key={`crank-${bi}`} position={[0.05, y, width / 2 + 0.02]}>
            <boxGeometry args={[0.030, 0.012, 0.040]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
          </mesh>
        );
      })}

      {/* ── Belimo-style modulating actuator (barrel + bracket on +Z side) ── */}
      <group position={[0.20, height / 2 - 0.18, width / 2 + 0.05]}>
        {/* Mount bracket */}
        <mesh position={[-0.06, -0.06, 0]}>
          <boxGeometry args={[0.20, 0.02, 0.18]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
        {/* Barrel body */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.20, 18]} />
          <meshStandardMaterial color={ACTUATOR_RED} roughness={0.5} metalness={0.4} />
        </mesh>
        {/* Cable gland */}
        <mesh position={[-0.10, 0, 0.06]}>
          <cylinderGeometry args={[0.020, 0.020, 0.08, 10]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Position-indicator dial face */}
        <mesh position={[0.105, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.005, 16]} />
          <meshStandardMaterial color={'#f2efe6'} roughness={0.3} metalness={0.1} />
        </mesh>
        <Text
          position={[0.110, 0.06, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.022}
          color={RELIEF_BLUE}
          anchorX="center"
          anchorY="middle"
        >
          OAD
        </Text>
      </group>

      {/* ── Bird-screen on the OA face (small vertical bars) ── */}
      {Array.from({ length: 18 }).map((_, gi) => (
        <mesh
          key={`oabar-${gi}`}
          position={[
            -0.07,
            0,
            -width / 2 + 0.04 + gi * ((width - 0.08) / 17),
          ]}
        >
          <boxGeometry args={[0.005, height - 0.08, 0.005]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.6} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/* ============================================================================
   <AhuGlbPreview/>
   Side-by-side A/B comparison rig: loads an external GLB asset (e.g. a
   commercially-modeled AHU) and drops it next to our procedural RooftopAHU
   on a labeled comparison pad so the team can decide whether to keep
   refining the native R3F build or swap to the imported model.

   Behaviour:
     • Auto-fits the model to a target footprint (default = our AHU's
       14.5 × 4.0 × 5.6 m envelope) by computing its world-axis-aligned
       bounding box and applying a uniform scale that makes the longest
       horizontal side land on `targetWidth`. Vertical scale is preserved
       proportionally.
     • Recenters the model so its X/Z midpoint sits on the wrapping group
       origin and its bottom rests on local y = 0 (drops cleanly onto a
       housekeeping curb / rooftop deck without floating or clipping).
     • Enables shadow casting / receiving on every mesh.
     • Optionally renders a labeled concrete pad and a floating "GLB MODEL"
       title so it is unambiguous which AHU is which when both are visible.

   Note: pass the URL via `url` so the same component can be reused for any
   AHU GLB without code changes.
============================================================================ */
export interface AhuGlbPreviewProps {
  /** Public-folder URL of the GLB to load. Default '/models/ahu/ahu.glb'. */
  url?: string;
  /** World position of the comparison pad center (curb top). */
  position?: Triple;
  /** Optional Y rotation (radians). Default 0. */
  rotationY?: number;
  /** Target footprint width to auto-fit to (m). Default 14.5 m to match our
   *  RooftopAHU casing. Pass `null` to leave the GLB at its native scale. */
  targetWidth?: number | null;
  /** Title text floated above the model. Default 'AHU.glb (3D model)'. */
  label?: string;
  /** Whether to draw the labeled concrete comparison pad. Default true. */
  showPad?: boolean;
  /** Optional scene-graph name for inspect picking. */
  name?: string;
}

export function AhuGlbPreview({
  url = '/models/ahu/ahu.glb',
  position = [0, 0, 0],
  rotationY = 0,
  targetWidth = 14.5,
  label = 'AHU.glb (3D model)',
  showPad = true,
  name = 'ahu:GLB-PREVIEW',
}: AhuGlbPreviewProps) {
  const { scene } = useGLTF(url);

  /* Clone once so multiple previews of the same URL don't share materials /
     transforms. Compute bounding box on the cloned scene and derive a
     uniform fit-scale + recentering offset. */
  const { displayScene, scale, offset, fittedW, fittedH, fittedD } = useMemo(() => {
    const cloned = scene.clone(true);

    /* Compute raw bounding box at native scale */
    const bbox = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    /* Pick a uniform fit-scale: longest horizontal axis → targetWidth */
    const horizMax = Math.max(size.x, size.z) || 1;
    const fit = targetWidth == null ? 1 : targetWidth / horizMax;

    /* Recenter so X/Z midpoint sits on origin and bottom rests on y=0 */
    const off = new THREE.Vector3(
      -center.x * fit,
      -bbox.min.y * fit,
      -center.z * fit,
    );

    /* Enable shadow casting + receiving on every mesh */
    cloned.traverse((o) => {
      const m = o as THREE.Mesh;
      if ((m as unknown as { isMesh?: boolean }).isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });

    return {
      displayScene: cloned,
      scale: fit,
      offset: off,
      fittedW: size.x * fit,
      fittedH: size.y * fit,
      fittedD: size.z * fit,
    };
  }, [scene, targetWidth]);

  return (
    <group position={position} rotation={[0, rotationY, 0]} name={name}>
      {/* Labeled housekeeping pad — bigger than the model footprint to read
          as a "comparison pad". Skip with showPad={false} if the GLB has its
          own base. */}
      {showPad && (
        <>
          <mesh position={[0, -0.06, 0]} receiveShadow>
            <boxGeometry args={[fittedW + 1.6, 0.12, fittedD + 1.6]} />
            <meshStandardMaterial color={'#9a958e'} roughness={0.95} metalness={0.02} />
          </mesh>
          {/* Bright stripe border so the pad reads as the comparison plinth */}
          <mesh position={[0, 0.005, fittedD / 2 + 0.65]}>
            <boxGeometry args={[fittedW + 1.4, 0.01, 0.10]} />
            <meshStandardMaterial color={'#d8a722'} roughness={0.55} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.005, -fittedD / 2 - 0.65]}>
            <boxGeometry args={[fittedW + 1.4, 0.01, 0.10]} />
            <meshStandardMaterial color={'#d8a722'} roughness={0.55} metalness={0.4} />
          </mesh>
        </>
      )}

      {/* The GLB itself — wrapped in a group that applies the auto-fit scale
          + recenter offset so it sits cleanly on the pad regardless of the
          authoring origin / orientation. */}
      <group position={offset.toArray() as Triple} scale={scale}>
        <primitive object={displayScene} />
      </group>

      {/* Floating overhead label */}
      <Text
        position={[0, fittedH + 1.20, 0]}
        fontSize={0.55}
        color={'#1a1f24'}
        anchorX="center"
        anchorY="middle"
        outlineColor={'#ffffff'}
        outlineWidth={0.020}
      >
        {label}
      </Text>
      <Text
        position={[0, fittedH + 0.65, 0]}
        fontSize={0.30}
        color={'#5a5e64'}
        anchorX="center"
        anchorY="middle"
        outlineColor={'#ffffff'}
        outlineWidth={0.012}
      >
        {`auto-fit to ${targetWidth ?? 'native'} m   ·   bbox ${fittedW.toFixed(1)}×${fittedH.toFixed(1)}×${fittedD.toFixed(1)} m`}
      </Text>
    </group>
  );
}

/* ============================================================================
   <HotWaterHeatingCoil/>
   Hot-water (preheat / reheat) heating coil — copper tubes / aluminum fins,
   typically 2–4 rows deep. Mounted upstream of the cooling coil for freeze
   protection (preheat) or downstream of the supply fan for zone reheat.
   Visually mirrors ChwCopperCoil but uses a smaller depth, fewer rows, and
   distinct brass supply/return elbows with control valve + actuator.

   Includes:
     • Aluminum fin pack (fewer rows than CHW coil — typical 2–4 rows)
     • Copper hairpin U-bends on the +Z return end
     • Brass supply / return headers on the −Z end with insulated stubs
     • Ball-type PICV (pressure-independent control valve) with modulating
       actuator on the supply connection
     • Condensation-guard copper drain pan (shallow — heating coils don't
       produce condensate under normal operation but the pan is specified
       to catch any residual moisture)
     • ASME rating nameplate
============================================================================ */
export interface HotWaterHeatingCoilProps {
  position?: Triple;
  rotation?: Triple;
  /** Face width (Z) × height (Y). Default 4.6 × 3.0 m. */
  width?: number;
  height?: number;
  /** Coil depth along airflow (X). 2–4 rows ≈ 0.18 m. Default 0.20 m. */
  depth?: number;
  /** Number of finned rows (visual). Default 3. */
  rows?: number;
  /** Valve actuator color ('blue' = cooling, 'red' = heating). Default 'red'. */
  valveColor?: string;
  /** Optional scene-graph name. Default 'ahu:COIL-HW'. */
  name?: string;
}

export function HotWaterHeatingCoil({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 4.6,
  height = 3.0,
  depth = 0.20,
  rows = 3,
  valveColor = '#c0392b',
  name = 'ahu:COIL-HW',
}: HotWaterHeatingCoilProps) {
  const TUBE_RADIUS = 0.018;
  const TUBES = Math.max(6, Math.floor(height / 0.090));
  const TUBE_PITCH_Y = (height - 0.10) / (TUBES - 1);

  const FIN_COUNT = 48;
  const FIN_PITCH = (width - 0.04) / (FIN_COUNT - 1);

  /* Header is smaller (2-pipe HW circuit) */
  const HDR_R = 0.048;
  const HDR_HALF_LEN = height / 2 - 0.05;

  /* Hot-water insulation: closed-cell elastomeric foam (black) on header stubs */
  const INS_R = HDR_R + 0.025;

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── End plates (sheet-metal side panels) at ±Z ── */}
      {[-1, 1].map((s) => (
        <mesh key={`ep-${s}`} position={[0, 0, s * (width / 2)]}>
          <boxGeometry args={[depth + 0.04, height + 0.04, 0.022]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
      ))}

      {/* ── Top & bottom angle-iron frame ── */}
      {[-1, 1].map((s) => (
        <mesh key={`frame-${s}`} position={[0, s * (height / 2), 0]}>
          <boxGeometry args={[depth + 0.04, 0.040, width + 0.04]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
      ))}

      {/* ── Aluminum fin pack (fewer fins than CHW — heating coil is shallower) ── */}
      {Array.from({ length: FIN_COUNT }).map((_, fi) => {
        const z = -width / 2 + 0.02 + fi * FIN_PITCH;
        return (
          <mesh key={`hwfin-${fi}`} position={[0, 0, z]}>
            <boxGeometry args={[depth - 0.02, height - 0.06, 0.004]} />
            <meshStandardMaterial
              color={fi % 5 === 0 ? ALUMINUM : ALUMINUM_DULL}
              roughness={0.45}
              metalness={0.7}
            />
          </mesh>
        );
      })}

      {/* ── Copper U-bend hairpins on the +Z return end ── */}
      {Array.from({ length: TUBES }).map((_, ti) => {
        const y = -height / 2 + 0.05 + ti * TUBE_PITCH_Y;
        const x = -depth / 2 + 0.04 + (ti % rows) * ((depth - 0.08) / Math.max(rows - 1, 1));
        return (
          <group key={`hwhp-${ti}`} position={[x, y, width / 2 + 0.01]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, 0.055, 10]} />
              <meshStandardMaterial color={COPPER} roughness={0.45} metalness={0.85} />
            </mesh>
            <mesh position={[0, TUBE_PITCH_Y / 2, 0.055]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[TUBE_PITCH_Y / 2, TUBE_RADIUS, 8, 14, Math.PI]} />
              <meshStandardMaterial color={COPPER_SHINE} roughness={0.4} metalness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* ── Hot-water supply / return headers on the −Z end ── */}
      {[
        { dy: -HDR_HALF_LEN / 2, label: 'HWS' },  // supply (bottom)
        { dy:  HDR_HALF_LEN / 2, label: 'HWR' },  // return (top)
      ].map((h, hi) => (
        <group key={`hwhdr-${hi}`} position={[0, h.dy, -width / 2 - 0.12]}>
          {/* Header pipe */}
          <mesh>
            <cylinderGeometry args={[HDR_R, HDR_R, HDR_HALF_LEN, 16]} />
            <meshStandardMaterial color={COPPER} roughness={0.5} metalness={0.85} />
          </mesh>
          {/* Insulation wrap (black elastomeric foam) */}
          <mesh>
            <cylinderGeometry args={[INS_R, INS_R, HDR_HALF_LEN + 0.02, 16, 1, true]} />
            <meshStandardMaterial color={RUBBER_BLACK} roughness={0.92} metalness={0.0} side={THREE.DoubleSide} />
          </mesh>
          {/* Bonnet cap */}
          <mesh position={[0, HDR_HALF_LEN / 2 + 0.035, 0]}>
            <cylinderGeometry args={[HDR_R + 0.012, HDR_R + 0.012, 0.045, 16]} />
            <meshStandardMaterial color={STEEL_MID} roughness={0.5} metalness={0.7} />
          </mesh>
          {/* Tube taps into the header */}
          {Array.from({ length: Math.min(6, TUBES / 2) }).map((_, ti) => {
            const ly = -HDR_HALF_LEN / 2 + 0.04 + ti * (HDR_HALF_LEN / 6);
            return (
              <mesh key={`hwtap-${hi}-${ti}`} position={[0, ly, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, 0.18, 8]} />
                <meshStandardMaterial color={COPPER} roughness={0.5} metalness={0.85} />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* ── PICV (pressure-independent control valve) on the supply header ──
          Modulating ball-type with spring-return electric actuator. Mounted
          on the HWS connection below the header, piped vertically to the
          building HW circuit stub. */}
      <group position={[0, -HDR_HALF_LEN / 2 - 0.14, -width / 2 - 0.22]}>
        {/* Valve body */}
        <mesh>
          <cylinderGeometry args={[HDR_R + 0.018, HDR_R + 0.018, 0.20, 16]} />
          <meshStandardMaterial color={'#8a6500'} roughness={0.4} metalness={0.9} />
        </mesh>
        {/* Flanges at each end */}
        {[-1, 1].map((s) => (
          <mesh key={`picvfl-${s}`} position={[0, s * 0.115, 0]}>
            <cylinderGeometry args={[HDR_R + 0.032, HDR_R + 0.032, 0.028, 16]} />
            <meshStandardMaterial color={STEEL_MID} roughness={0.5} metalness={0.75} />
          </mesh>
        ))}
        {/* Actuator body (top-mounted spring-return) */}
        <mesh position={[0.06, 0.22, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.28, 16]} />
          <meshStandardMaterial color={valveColor} roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Actuator cap */}
        <mesh position={[0.06, 0.38, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.035, 16]} />
          <meshStandardMaterial color={STEEL_MID} roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Position indicator window */}
        <mesh position={[0.06 + 0.065, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 0.005, 10]} />
          <meshStandardMaterial color={'#f0edd6'} roughness={0.3} metalness={0.0} />
        </mesh>
        {/* Wire conduit to actuator */}
        <mesh position={[0.06, 0.30, -0.08]}>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.85} metalness={0.05} />
        </mesh>
      </group>

      {/* ── Shallow drain pan below the slab ── */}
      <mesh position={[0, -height / 2 - 0.050, 0]}>
        <boxGeometry args={[depth + 0.22, 0.045, width + 0.16]} />
        <meshStandardMaterial color={STEEL_LIGHT} roughness={0.7} metalness={0.55} />
      </mesh>

      {/* ── ASME nameplate ── */}
      <mesh position={[depth / 2 + 0.016, 0, -width / 2 - 0.013]}>
        <boxGeometry args={[0.14, 0.08, 0.005]} />
        <meshStandardMaterial color={NAMEPLATE_TAN} roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

/* ============================================================================
   <ReturnAirDamper/>
   Motorized parallel-blade return-air (recirculation) damper — identical
   construction to OutsideAirDamper but wired to modulate 0–100% in the
   opposite sense (when OA damper opens, RA damper closes). Galvanized
   extruded-aluminum frame + opposed-action blades + Belimo-style actuator
   with an orange barrel to distinguish it from the blue OA actuator.

   Also used as a dedicated relief / barometric bypass damper (with `relief`
   flag true) where it mounts on a bypass duct collar above the supply fan
   discharge — in that mode the blades remain fully open when system static
   pressure reaches the setpoint.
============================================================================ */
export interface ReturnAirDamperProps {
  position?: Triple;
  rotation?: Triple;
  /** Frame opening width (Z) × height (Y). Default 1.6 × 1.6 m. */
  width?: number;
  height?: number;
  /** Number of horizontal blades. Default 6. */
  blades?: number;
  /** 0..1 fixed open fraction, or 'auto' for animated modulation. Default 'auto'. */
  open?: number | 'auto';
  /** When true, uses orange actuator + relief labeling. Default false. */
  relief?: boolean;
  name?: string;
}

export function ReturnAirDamper({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.6,
  height = 1.6,
  blades = 6,
  open = 'auto',
  relief = false,
  name = 'ahu:RAD-AHU',
}: ReturnAirDamperProps) {
  const bladesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!bladesRef.current) return;
    let frac: number;
    if (open === 'auto') {
      /* Opposite phase to OA damper: when OA is 75%, RA is 25% */
      frac = 0.50 - 0.25 * Math.sin(state.clock.elapsedTime * 0.21);
    } else {
      frac = Math.min(1, Math.max(0, open));
    }
    const ang = (1 - frac) * (Math.PI / 2);
    bladesRef.current.children.forEach((c) => {
      (c as THREE.Object3D).rotation.x = ang;
    });
  });

  const bladeH = (height - 0.10) / blades;
  /* RA / relief dampers: opposed-blade action means alternating blades
     rotate in opposing directions. We model this by flipping every odd blade's
     pivot polarity via a sign multiplier written into the blade-group transform. */
  const actuatorColor = relief ? '#e67e22' : '#2e86c1';
  const label         = relief ? 'REL' : 'RAD';

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── Aluminum extruded frame ── */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.12, 0.05, width + 0.08]} />
        <meshStandardMaterial color={ALUMINUM} roughness={0.5} metalness={0.75} />
      </mesh>
      <mesh position={[0, -height / 2, 0]}>
        <boxGeometry args={[0.12, 0.05, width + 0.08]} />
        <meshStandardMaterial color={ALUMINUM} roughness={0.5} metalness={0.75} />
      </mesh>
      <mesh position={[0, 0, -width / 2]}>
        <boxGeometry args={[0.12, height + 0.04, 0.05]} />
        <meshStandardMaterial color={ALUMINUM} roughness={0.5} metalness={0.75} />
      </mesh>
      <mesh position={[0, 0, +width / 2]}>
        <boxGeometry args={[0.12, height + 0.04, 0.05]} />
        <meshStandardMaterial color={ALUMINUM} roughness={0.5} metalness={0.75} />
      </mesh>

      {/* ── Blades (opposed-action: alternating pivot direction) ── */}
      <group ref={bladesRef}>
        {Array.from({ length: blades }).map((_, bi) => {
          const y = -height / 2 + bladeH / 2 + 0.04 + bi * bladeH;
          return (
            <group key={`ra-blade-${bi}`} position={[0, y, 0]} scale={[1, bi % 2 === 0 ? 1 : -1, 1]}>
              <mesh>
                <boxGeometry args={[0.04, bladeH * 0.92, width - 0.04]} />
                <meshStandardMaterial color={ALUMINUM} roughness={0.4} metalness={0.85} />
              </mesh>
              <mesh position={[0, bladeH * 0.46, 0]}>
                <boxGeometry args={[0.045, 0.012, width - 0.04]} />
                <meshStandardMaterial color={RUBBER_BLACK} roughness={0.95} metalness={0.0} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* ── External linkage bar on −Z edge (opposite side to OA damper) ── */}
      <mesh position={[0.07, 0, -width / 2 - 0.04]}>
        <boxGeometry args={[0.014, height - 0.10, 0.020]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
      </mesh>
      {Array.from({ length: blades }).map((_, bi) => {
        const y = -height / 2 + bladeH / 2 + 0.04 + bi * bladeH;
        return (
          <mesh key={`racrank-${bi}`} position={[0.05, y, -width / 2 - 0.02]}>
            <boxGeometry args={[0.030, 0.012, 0.040]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
          </mesh>
        );
      })}

      {/* ── Modulating actuator on −Z side ── */}
      <group position={[0.20, height / 2 - 0.18, -width / 2 - 0.05]}>
        <mesh position={[-0.06, -0.06, 0]}>
          <boxGeometry args={[0.20, 0.02, 0.18]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.20, 18]} />
          <meshStandardMaterial color={actuatorColor} roughness={0.5} metalness={0.35} />
        </mesh>
        <mesh position={[-0.10, 0, -0.06]}>
          <cylinderGeometry args={[0.020, 0.020, 0.08, 10]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Position-indicator dial */}
        <mesh position={[0.105, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.005, 16]} />
          <meshStandardMaterial color={'#f2efe6'} roughness={0.3} metalness={0.1} />
        </mesh>
        <Text
          position={[0.110, 0.06, 0]}
          rotation={[0, Math.PI / 2, 0]}
          fontSize={0.022}
          color={actuatorColor}
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    </group>
  );
}

/* ============================================================================
   <SteamHumidifier/>
   Steam-grid humidifier — jacketed stainless-steel manifold with multiple
   dispersion tubes projecting into the airstream. Steam enters through an
   insulated supply line with a modulating control valve; condensate returns
   via a P-trapped drain. Stainless dispersion tubes have evenly-spaced
   micro-orifice holes along their length (modeled as tiny domed stubs).

   Includes:
     • Stainless supply manifold (horizontal header across the air duct width)
     • 6–8 vertical dispersion tubes (the "harp" that teachers always draw)
     • Insulated steam-supply riser with modulating two-way control valve
     • Condensate drain leg with P-trap
     • Safety shutoff solenoid on the supply line
     • Nameplate tag "HUM-1"
============================================================================ */
export interface SteamHumidifierProps {
  position?: Triple;
  rotation?: Triple;
  /** Manifold length (Z) spanning the duct width. Default 4.4 m. */
  width?: number;
  /** Dispersion tube length (Y) extending into the airstream. Default 1.8 m. */
  tubeHeight?: number;
  /** Number of dispersion tubes. Default 7. */
  tubes?: number;
  name?: string;
}

export function SteamHumidifier({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 4.4,
  tubeHeight = 1.8,
  tubes = 7,
  name = 'ahu:HUM-1',
}: SteamHumidifierProps) {
  /* Stainless steel color */
  const SS = '#c4c8cc';
  const SS_DARK = '#8e9298';
  const MANIFOLD_R = 0.055;
  const TUBE_R = 0.022;
  const ORIFICE_R = 0.006;
  const ORIFICES_PER_TUBE = 10;

  const tubePitch = (width - 0.20) / (tubes - 1);

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── Supply manifold (horizontal stainless pipe across the duct) ── */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[MANIFOLD_R, MANIFOLD_R, width, 20]} />
        <meshStandardMaterial color={SS} roughness={0.25} metalness={0.9} />
      </mesh>
      {/* Manifold end caps */}
      {[-1, 1].map((s) => (
        <mesh key={`mcap-${s}`} position={[0, 0, s * (width / 2 + 0.02)]}>
          <cylinderGeometry args={[MANIFOLD_R + 0.008, MANIFOLD_R + 0.008, 0.030, 18]} />
          <meshStandardMaterial color={SS_DARK} roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
      {/* Manifold flange connections (pairs) */}
      {[-1, 1].map((s) => (
        <mesh key={`mfl-${s}`} position={[0, 0, s * (width / 2 - 0.25)]}>
          <cylinderGeometry args={[MANIFOLD_R + 0.018, MANIFOLD_R + 0.018, 0.022, 18]} />
          <meshStandardMaterial color={SS_DARK} roughness={0.3} metalness={0.9} />
        </mesh>
      ))}

      {/* ── Dispersion tubes — the "harp" ── */}
      {Array.from({ length: tubes }).map((_, ti) => {
        const z = -width / 2 + 0.10 + ti * tubePitch;
        return (
          <group key={`dtube-${ti}`} position={[0, tubeHeight / 2, z]}>
            {/* Tube body */}
            <mesh>
              <cylinderGeometry args={[TUBE_R, TUBE_R, tubeHeight, 12]} />
              <meshStandardMaterial color={SS} roughness={0.25} metalness={0.9} />
            </mesh>
            {/* Micro-orifice emission holes along the tube (facing +X into airstream) */}
            {Array.from({ length: ORIFICES_PER_TUBE }).map((_, oi) => {
              const dy = -tubeHeight / 2 + 0.08 + oi * ((tubeHeight - 0.16) / (ORIFICES_PER_TUBE - 1));
              return (
                <mesh key={`ori-${ti}-${oi}`} position={[TUBE_R + 0.005, dy, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[ORIFICE_R, ORIFICE_R, 0.012, 8]} />
                  <meshStandardMaterial color={SS_DARK} roughness={0.25} metalness={0.9} />
                </mesh>
              );
            })}
            {/* Tube bottom cap */}
            <mesh position={[0, -tubeHeight / 2 - 0.015, 0]}>
              <cylinderGeometry args={[TUBE_R + 0.006, TUBE_R + 0.006, 0.024, 12]} />
              <meshStandardMaterial color={SS_DARK} roughness={0.3} metalness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* ── Steam supply riser (from building steam header, entering from +Z end) ── */}
      <group position={[0, tubeHeight / 2 + 0.30, width / 2 + 0.18]}>
        {/* Insulated steam pipe (black armaflex jacket) */}
        <mesh>
          <cylinderGeometry args={[0.045, 0.045, 0.55, 14]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.9} metalness={0.0} />
        </mesh>
        {/* Modulating control valve */}
        <mesh position={[0, -0.38, 0]}>
          <cylinderGeometry args={[0.050, 0.050, 0.14, 14]} />
          <meshStandardMaterial color={'#5d8aa8'} roughness={0.4} metalness={0.85} />
        </mesh>
        {/* Control valve flanges */}
        {[-1, 1].map((s) => (
          <mesh key={`svfl-${s}`} position={[0, -0.38 + s * 0.08, 0]}>
            <cylinderGeometry args={[0.062, 0.062, 0.020, 14]} />
            <meshStandardMaterial color={SS_DARK} roughness={0.35} metalness={0.85} />
          </mesh>
        ))}
        {/* Spring-diaphragm actuator on control valve */}
        <mesh position={[0, -0.20, 0]}>
          <cylinderGeometry args={[0.070, 0.070, 0.18, 14]} />
          <meshStandardMaterial color={'#2c3e50'} roughness={0.5} metalness={0.3} />
        </mesh>
        {/* Safety shutoff solenoid (SSV-1) — inline, blue body */}
        <mesh position={[0, 0.20, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.10, 12]} />
          <meshStandardMaterial color={'#1a5276'} roughness={0.4} metalness={0.75} />
        </mesh>
        {/* Solenoid coil body */}
        <mesh position={[0.055, 0.20, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.09, 10]} />
          <meshStandardMaterial color={'#1f618d'} roughness={0.5} metalness={0.4} />
        </mesh>
      </group>

      {/* ── Condensate drain leg + P-trap on −Z end ── */}
      <group position={[0, -0.22, -width / 2 - 0.20]}>
        {/* Vertical drain stub */}
        <mesh>
          <cylinderGeometry args={[0.022, 0.022, 0.35, 12]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.6} metalness={0.7} />
        </mesh>
        {/* P-trap loop */}
        <mesh position={[0, -0.22, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.10, 0.022, 8, 16, Math.PI]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.6} metalness={0.7} />
        </mesh>
      </group>

      {/* ── HUM-1 nameplate on the manifold ── */}
      <mesh position={[MANIFOLD_R + 0.006, 0, 0]}>
        <boxGeometry args={[0.005, 0.08, 0.16]} />
        <meshStandardMaterial color={NAMEPLATE_TAN} roughness={0.4} metalness={0.85} />
      </mesh>
      <Text
        position={[MANIFOLD_R + 0.012, 0.025, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.030}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        HUM-1
      </Text>
      <Text
        position={[MANIFOLD_R + 0.012, -0.015, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.020}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        STEAM HUMIDIFIER
      </Text>
    </group>
  );
}

/* ============================================================================
   <RotaryEnergyWheel/>
   Sensible / enthalpy energy-recovery wheel (heat-recovery ventilator). A
   slowly rotating desiccant-coated aluminium rotor transfers heat (and
   latent energy in an enthalpy wheel) between the exhaust and supply
   air streams that pass through opposite halves of the wheel face.

   The wheel is split visually into:
     • Large cylindrical rotor drum (corrugated foil honeycomb matrix, shown
       as concentric ring texture) spinning slowly via useFrame
     • Drive motor + timing belt around the perimeter
     • Sector seal (a fixed dividing bar between supply and exhaust halves)
     • Purge sector (a small angled wedge that cross-flushes carryover air)
     • Bearing housing on each side with pillow-block
     • Bypass damper on the supply inlet (flat-plate, modulating)
     • Differential-pressure gauges for both airstreams (ISA bubbles)
     • Service nameplate "ERW-1"
============================================================================ */
export interface RotaryEnergyWheelProps {
  position?: Triple;
  rotation?: Triple;
  /** Rotor diameter (m). Default 2.4 m. */
  diameter?: number;
  /** Rotor depth (axial length, m). Default 0.30 m (typical 12"). */
  depth?: number;
  /** RPM (visual only — real units are ~10–20 RPM). Default 14. */
  rpm?: number;
  /** 'sensible' = aluminium foil (silver), 'enthalpy' = desiccant (tan). */
  wheelType?: 'sensible' | 'enthalpy';
  name?: string;
}

export function RotaryEnergyWheel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  diameter = 2.4,
  depth = 0.30,
  rpm = 14,
  wheelType = 'enthalpy',
  name = 'ahu:ERW-1',
}: RotaryEnergyWheelProps) {
  const rotorRef = useRef<THREE.Group>(null);
  const beltRef  = useRef<THREE.Group>(null);
  const radPerSec = (rpm / 60) * Math.PI * 2 * 0.08; // slow visual rotation

  useFrame((_, dt) => {
    if (rotorRef.current) rotorRef.current.rotation.z += dt * radPerSec;
    if (beltRef.current)  beltRef.current.rotation.z  -= dt * radPerSec * 0.65;
  });

  const R = diameter / 2;
  const matrixColor = wheelType === 'enthalpy' ? '#c8b87a' : ALUMINUM_DULL;
  const ringCount = 10;   // concentric rotor rings (visual approximation of honeycomb)

  /* Casing frame (rectangular box housing the wheel) */
  const frameW = diameter * 1.10;
  const frameH = diameter * 1.08;

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── Casing frame (steel angle-iron box) ── */}
      {/* Top and bottom */}
      {[-1, 1].map((s) => (
        <mesh key={`ewframe-tb-${s}`} position={[0, s * (frameH / 2 + 0.04), 0]}>
          <boxGeometry args={[0.06, 0.08, frameW + 0.08]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
      ))}
      {/* Left and right sides */}
      {[-1, 1].map((s) => (
        <mesh key={`ewframe-lr-${s}`} position={[0, 0, s * (frameW / 2 + 0.04)]}>
          <boxGeometry args={[0.06, frameH + 0.12, 0.08]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
      ))}
      {/* Front and back casing flanges (thin ring around the rotor face) */}
      {[-1, 1].map((s) => (
        <mesh key={`ewfacefl-${s}`} position={[s * (depth / 2 + 0.015), 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[R + 0.02, R + 0.08, 32]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* ── Sector seal dividing supply / exhaust halves (flat steel bar) ── */}
      {/* Horizontal divider through wheel center */}
      <mesh>
        <boxGeometry args={[depth + 0.04, 0.05, diameter + 0.06]} />
        <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
      </mesh>
      {/* Purge sector (angled 15° offset wedge, smaller) */}
      <mesh rotation={[0, 0, Math.PI * 0.083]}>
        <boxGeometry args={[depth + 0.04, 0.04, diameter * 0.85]} />
        <meshStandardMaterial color={STEEL_BLACK} roughness={0.5} metalness={0.7} />
      </mesh>

      {/* ── Rotating rotor (matrix) ── */}
      <group ref={rotorRef}>
        {/* Outer shell */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R, R, depth + 0.01, 40, 1, true]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} side={THREE.DoubleSide} />
        </mesh>
        {/* Matrix concentric rings (honeycomb approximation) */}
        {Array.from({ length: ringCount }).map((_, ri) => {
          const rr = R * ((ri + 1) / (ringCount + 1));
          return (
            <mesh key={`ewring-${ri}`} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[rr, rr, depth - 0.01, 32, 1, true]} />
              <meshStandardMaterial
                color={ri % 2 === 0 ? matrixColor : (wheelType === 'enthalpy' ? '#b8a060' : ALUMINUM)}
                roughness={0.55}
                metalness={wheelType === 'sensible' ? 0.75 : 0.2}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
        {/* Matrix spoke ribs (radial — appear as honeycomb structure cross section) */}
        {Array.from({ length: 16 }).map((_, si) => {
          const ang = (si / 16) * Math.PI * 2;
          return (
            <mesh key={`ewspoke-${si}`} rotation={[Math.PI / 2, 0, ang]}>
              <boxGeometry args={[R * 2, depth - 0.01, 0.012]} />
              <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.8} />
            </mesh>
          );
        })}
        {/* Hub bearing */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.10, 0.10, depth + 0.06, 20]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.4} metalness={0.85} />
        </mesh>
      </group>

      {/* ── Pillow-block bearing housings (front and back shaft ends) ── */}
      {[-1, 1].map((s) => (
        <mesh key={`ewpb-${s}`} position={[s * (depth / 2 + 0.06), 0, 0]}>
          <boxGeometry args={[0.12, 0.28, 0.22]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.5} metalness={0.8} />
        </mesh>
      ))}

      {/* ── Perimeter drive belt + small gear-motor on the +Z side ── */}
      <group ref={beltRef} rotation={[Math.PI / 2, 0, 0]}>
        {/* Drive belt (thin torus around rotor perimeter) */}
        <mesh>
          <torusGeometry args={[R + 0.01, 0.012, 6, 48]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.85} metalness={0.05} />
        </mesh>
      </group>
      {/* Gear-motor pod at 4 o'clock position */}
      <group position={[0, -R * 0.65, diameter / 2 + 0.08]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.18, 14]} />
          <meshStandardMaterial color={STEEL_BLACK} roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Drive sprocket */}
        <mesh position={[0, 0, -0.10]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R + 0.01, R + 0.01, 0.014, 48, 1, true]} />
          <meshStandardMaterial color={RUBBER_BLACK} roughness={0.85} metalness={0.05} visible={false} />
        </mesh>
        {/* Motor bracket */}
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.18, 0.06, 0.12]} />
          <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.7} />
        </mesh>
      </group>

      {/* ── DP gauges on supply and exhaust sides (ISA-style circular gauges) ── */}
      {[
        { side: 'SUP', dy: -R * 0.30, dz: diameter / 2 + 0.06 },
        { side: 'EXH', dy:  R * 0.30, dz: diameter / 2 + 0.06 },
      ].map((g) => (
        <group key={`ewdp-${g.side}`} position={[depth / 2 + 0.04, g.dy, g.dz]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.025, 16]} />
            <meshStandardMaterial color={STEEL_MID} roughness={0.45} metalness={0.7} />
          </mesh>
          <mesh position={[0.015, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.068, 0.068, 0.005, 16]} />
            <meshStandardMaterial color={'#f2efe6'} roughness={0.2} metalness={0.0} />
          </mesh>
          <Text
            position={[0.025, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
            fontSize={0.022}
            color={'#333333'}
            anchorX="center"
            anchorY="middle"
          >
            {g.side}
          </Text>
        </group>
      ))}

      {/* ── Nameplate ── */}
      <mesh position={[depth / 2 + 0.016, -R * 0.65, -diameter / 2 - 0.04]}>
        <boxGeometry args={[0.005, 0.10, 0.22]} />
        <meshStandardMaterial color={NAMEPLATE_TAN} roughness={0.4} metalness={0.85} />
      </mesh>
      <Text
        position={[depth / 2 + 0.020, -R * 0.65 + 0.028, -diameter / 2 - 0.04]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.032}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        ERW-1
      </Text>
      <Text
        position={[depth / 2 + 0.020, -R * 0.65 - 0.015, -diameter / 2 - 0.04]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.018}
        color={'#0a0a0a'}
        anchorX="center"
        anchorY="middle"
      >
        {wheelType === 'enthalpy' ? 'ENTHALPY WHEEL' : 'SENSIBLE WHEEL'}
      </Text>
    </group>
  );
}

/* ============================================================================
   <PreFilterBank/>
   MERV-8 flat-panel pre-filter rack — the coarser, first-stage filter
   upstream of the MERV-13 final bank. Flat-panel (NOT pleated) cartridges
   in a lighter slide-rail frame. The lower-efficiency media is modeled as
   a thin, open fibrous pad rather than the deep pleat pack of the MERV-13.

   Cartridges: standard 24 × 24 × 2 in. flat-panel MERV-8 in a galvanized
   wire-backed frame. Visible spring-loaded holding clips and a DP indicator
   port on the rack upstream face.
============================================================================ */
export interface PreFilterBankProps {
  position?: Triple;
  rotation?: Triple;
  /** Total face dimensions (Z = width, Y = height). Default 5.0 × 3.2 m. */
  width?: number;
  height?: number;
  /** Cartridge box depth along airflow (X). Default 0.055 m (≈2"). */
  depth?: number;
  /** Flat cartridges per row × column. Default 6 × 4. */
  cols?: number;
  rows?: number;
  name?: string;
}

export function PreFilterBank({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 5.0,
  height = 3.2,
  depth = 0.055,
  cols = 6,
  rows = 4,
  name = 'ahu:PREFILT-AHU',
}: PreFilterBankProps) {
  const cellW = width  / cols;
  const cellH = height / rows;
  const innerCellW = cellW * 0.94;
  const innerCellH = cellH * 0.94;

  /* Fibrous pad layers (flat panel — no pleat structure) */
  const PAD_LAYERS = 4;
  const padStep = depth / PAD_LAYERS;

  return (
    <group position={position} rotation={rotation} name={name}>
      {/* ── Galvanized wire-mesh face (upstream side, −X) — visible as diagonal grid ── */}
      <mesh position={[-depth / 2 + 0.003, 0, 0]}>
        <boxGeometry args={[0.006, height + 0.08, width + 0.08]} />
        <meshStandardMaterial color={STEEL_LIGHT} roughness={0.55} metalness={0.65} wireframe />
      </mesh>
      {/* Downstream retaining wire */}
      <mesh position={[depth / 2 - 0.003, 0, 0]}>
        <boxGeometry args={[0.006, height + 0.08, width + 0.08]} />
        <meshStandardMaterial color={STEEL_LIGHT} roughness={0.55} metalness={0.65} wireframe />
      </mesh>

      {/* ── Vertical separators (slide rails) ── */}
      {Array.from({ length: cols + 1 }).map((_, ci) => {
        const z = -width / 2 + ci * cellW;
        return (
          <mesh key={`pvsep-${ci}`} position={[0, 0, z]}>
            <boxGeometry args={[depth + 0.02, height + 0.03, 0.030]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.65} />
          </mesh>
        );
      })}
      {/* ── Horizontal tracks ── */}
      {Array.from({ length: rows + 1 }).map((_, ri) => {
        const y = -height / 2 + ri * cellH;
        return (
          <mesh key={`phsep-${ri}`} position={[0, y, 0]}>
            <boxGeometry args={[depth + 0.02, 0.030, width + 0.03]} />
            <meshStandardMaterial color={STEEL_DARK} roughness={0.55} metalness={0.65} />
          </mesh>
        );
      })}

      {/* ── Cartridges ── */}
      {Array.from({ length: rows }).map((_, ri) =>
        Array.from({ length: cols }).map((_, ci) => {
          const cy = -height / 2 + (ri + 0.5) * cellH;
          const cz = -width  / 2 + (ci + 0.5) * cellW;
          return (
            <group key={`pcart-${ri}-${ci}`} position={[0, cy, cz]}>
              {/* Cardboard border frame */}
              {/* top */}
              <mesh position={[0, innerCellH / 2 - 0.012, 0]}>
                <boxGeometry args={[depth - 0.005, 0.025, innerCellW]} />
                <meshStandardMaterial color={FILTER_FRAME_KFT} roughness={0.95} metalness={0.0} />
              </mesh>
              {/* bottom */}
              <mesh position={[0, -innerCellH / 2 + 0.012, 0]}>
                <boxGeometry args={[depth - 0.005, 0.025, innerCellW]} />
                <meshStandardMaterial color={FILTER_FRAME_KFT} roughness={0.95} metalness={0.0} />
              </mesh>
              {/* left */}
              <mesh position={[0, 0, -innerCellW / 2 + 0.012]}>
                <boxGeometry args={[depth - 0.005, innerCellH - 0.05, 0.025]} />
                <meshStandardMaterial color={FILTER_FRAME_KFT} roughness={0.95} metalness={0.0} />
              </mesh>
              {/* right */}
              <mesh position={[0, 0, innerCellW / 2 - 0.012]}>
                <boxGeometry args={[depth - 0.005, innerCellH - 0.05, 0.025]} />
                <meshStandardMaterial color={FILTER_FRAME_KFT} roughness={0.95} metalness={0.0} />
              </mesh>

              {/* Flat pad layers (graduated thickness to read as fibrous media) */}
              {Array.from({ length: PAD_LAYERS }).map((_, pi) => {
                const px = -depth / 2 + 0.005 + pi * padStep;
                const lightness = 0.80 + (pi / PAD_LAYERS) * 0.15;
                const padColor = `hsl(45, 15%, ${Math.round(lightness * 100)}%)`;
                return (
                  <mesh key={`pad-${ri}-${ci}-${pi}`} position={[px, 0, 0]}>
                    <boxGeometry args={[padStep * 0.85, innerCellH - 0.06, innerCellW - 0.04]} />
                    <meshStandardMaterial color={padColor} roughness={0.98} metalness={0.0} transparent opacity={0.88} />
                  </mesh>
                );
              })}

              {/* Holding spring clip on top edge */}
              <mesh position={[depth / 2 + 0.010, innerCellH / 2 - 0.025, 0]}>
                <boxGeometry args={[0.030, 0.018, 0.12]} />
                <meshStandardMaterial color={STEEL_LIGHT} roughness={0.4} metalness={0.85} />
              </mesh>
            </group>
          );
        })
      )}

      {/* ── DP indicator port on the upstream face (brass nipple) ── */}
      <mesh position={[-depth / 2 + 0.004, height / 2 - 0.16, width / 2 + 0.04]}>
        <cylinderGeometry args={[0.018, 0.018, 0.08, 8]} />
        <meshStandardMaterial color={'#9a7a3a'} roughness={0.45} metalness={0.85} />
      </mesh>

      {/* ── "MERV 8 PRE-FILTER" label stencil on the rack frame ── */}
      <Text
        position={[0, -height / 2 - 0.06, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        fontSize={0.060}
        color={'#4a4040'}
        anchorX="center"
        anchorY="middle"
      >
        MERV-8 PRE-FILTER
      </Text>
    </group>
  );
}

/* Preload the default AHU GLB so it's ready by the time the scene renders. */
useGLTF.preload('/models/ahu/ahu.glb');

