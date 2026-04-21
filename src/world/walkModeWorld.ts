/* ============================================================================
   Walk-mode world geometry: main floor obstacles, rooftop deck, ladder shaft.
   Kept in sync with EngineRoom in App.tsx (roof slab y≈12.05, thickness 0.38).

   Horizontal movement uses a vertical “body” segment [feetY, feetY +
   PLAYER_COLLISION_HEIGHT] so low piping blocks walking on the floor but the
   same pipe can be cleared while airborne (jump arc).
============================================================================ */

/** Top of walkable concrete in the machine room */
export const MAIN_FLOOR_Y = 0;

/** Rooftop deck group is at y=12.05; slab half-height 0.19 → walk surface */
export const ROOF_WALK_Y = 12.05 + 0.19;

/** Horizontal bounds (main floor, legacy — used as inside-room clamp before walls existed) */
export const ROOM_BOUND = 32;

/**
 * Outdoor world clamp — applied on the main "ground level" layer so the
 * technician can walk well past the building footprint onto the surrounding
 * grass yard. The 3 enclosed walls (back/left/right) and equipment AABBs
 * still block lateral movement; the +Z (south) face is open and lets the
 * player exit the engine room onto the lawn.
 */
export const OUTDOOR_BOUND = 95;

/** Building footprint (matches the 3 wall slabs in EngineRoom). */
export const BUILDING_X_MIN = -35;
export const BUILDING_X_MAX = 35;
export const BUILDING_Z_MIN = -35;
/** South face is open (no wall). Anything past here is "outside / yard". */
export const BUILDING_Z_MAX = 35;

/** Inner deck where footing is solid (landing / stand checks).
    Slab spans ±36 in both axes; parapet inner face is at ±35.85.
    35.5 keeps the player well inside the concrete and away from the parapet lip. */
export const ROOF_SOLID_BOUND = 35.5;

/** Outer limit for walking on the roof — parapet blocks further movement. */
export const ROOF_MOVEMENT_BOUND = 35.75;

/**
 * Standing / walking collision height above the feet (m) — full upright body
 * for cabinets, columns, and roof standing checks.
 */
export const PLAYER_COLLISION_HEIGHT = 1.82;

/**
 * Airborne horizontal collision height (m). A jump clears low piping by
 * lifting the feet; the torso need not stay inside a full standing capsule.
 */
export const PLAYER_AIR_COLLISION_HEIGHT = 0.92;

/* ─── Shared piping layout (mirrors EngineRoom constants in App.tsx) ───── */
const EVAP_HEAD_Z = 4.759; void EVAP_HEAD_Z;  // evaporator barrel −Z end face — matches App.tsx
const COND_HEAD_Z = 4.76;                     // condenser barrel +Z end face — matches App.tsx
const EVAP_NOZZLE_X = -1.984;           // marine waterbox face center X (Cylinder018_Baked)
const CHW_X_SUPPLY = EVAP_NOZZLE_X;   // -1.984 — on the barrel face, matches App.tsx
const CHW_X_RETURN = EVAP_NOZZLE_X;   // -1.984 — same X; risers diverge in Z, matches App.tsx
const CHW_Z_SUPPLY = -5.525;   // matches App.tsx -(HEAD_Z + 0.95) = -(4.575 + 0.95)
const CHW_Z_RETURN = -6.675;   // matches App.tsx -(HEAD_Z + 2.10) = -(4.575 + 2.10)
const AHU_X = -22;
const HEADER_Y = 1.1;
const MAIN_PIPE_INS_R = 0.22 + 0.07;     // 17″ Sch.40 + 7 cm closed-cell jacket (matches App.tsx)

/* CDW risers: supply at X=0, return offset +0.55 m in X so its elbow
   arc and riser clear the supply riser that rises straight up at X=0.
   Both flanges bolt onto the +Z condenser barrel face at COND_HEAD_Z.
   Mirrors App.tsx CW_X_SUPPLY / CW_X_RETURN and PidPlantSystems CW_XS/CW_XR. */
const CW_X_SUPPLY = 0.0;
const CW_X_RETURN = 0.55;   // offset in X to clear the supply riser — matches App.tsx CW_X_RETURN
/* CDW risers measured off the actual condenser barrel face so they
   land at exactly z=+5.60 (sup) / +6.75 (ret) — matches App.tsx
   CW_Z_SUPPLY/RETURN and PidPlantSystems CW_ZS/CW_ZR. */
const CW_Z_SUPPLY = COND_HEAD_Z + 0.84;
const CW_Z_RETURN = COND_HEAD_Z + 1.99;
/* Per-circuit nozzle-CL Y on the head face (matches App.tsx
   COND_NOZZLE_Y_INL / COND_NOZZLE_Y_OUT — vertically stacked on the
   centerline per the YORK YK marine waterbox convention). */
const CW_Y_FLG_SUP = 0.30;                // lower (CWS inlet)
const CW_Y_FLG_RET = 1.30;                // upper (CWR outlet)
const CDW_BARREL_R = 0.30;
/* Engine-room riser bottom Y per circuit (riser-side tangent of the
   barrel-head 90° elbow — see App.tsx for the same derivation). The
   two CDW circuits start at very different elevations because their
   nozzles are stacked vertically on the head-face centerline. */
const ENG_BOT_Y_SUP = CW_Y_FLG_SUP - CDW_BARREL_R - 0.04;     // -0.04 (riser bottom right at floor)
const ENG_BOT_Y_RET = CW_Y_FLG_RET - CDW_BARREL_R - 0.04;     //  0.96 (riser bottom ~1 m AFF)
const ROOF_MAIN_Y = 12.55;
const ROOF_ELBOW_R = 0.40;
const ENG_TOP_Y = ROOF_MAIN_Y - ROOF_ELBOW_R;
const CW_TOWER_FLG_X = 23;
const TWR_X = CW_TOWER_FLG_X + 0.95;
const ROOF_X_END = TWR_X - ROOF_ELBOW_R;

type Aabb = { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number };

function segOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a1 > b0 && a0 < b1;
}

function inAabbXZ(x: number, z: number, b: Aabb): boolean {
  return x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1;
}

function aabbBlocks(x: number, z: number, feetY: number, topY: number, b: Aabb): boolean {
  return inAabbXZ(x, z, b) && segOverlap(feetY, topY, b.y0, b.y1);
}

function cylBlocks(
  x: number,
  z: number,
  feetY: number,
  topY: number,
  cx: number,
  cz: number,
  r: number,
  y0: number,
  y1: number,
): boolean {
  if (Math.hypot(x - cx, z - cz) >= r) return false;
  return segOverlap(feetY, topY, y0, y1);
}

function chwHeaderSpan(xRiser: number): { x0: number; x1: number } {
  const headerLen = Math.abs(xRiser - AHU_X) + 1.0;
  const ctr = (xRiser + AHU_X) / 2 - 0.5;
  return { x0: ctr - headerLen / 2, x1: ctr + headerLen / 2 };
}

const CHW_HDR_SUP = chwHeaderSpan(CHW_X_SUPPLY);
const CHW_HDR_RET = chwHeaderSpan(CHW_X_RETURN);

/** Low horizontal CHW mains + insulation (approx. AABB). */
const CHW_HEADER_AABBS: Aabb[] = [
  {
    ...CHW_HDR_SUP,
    z0: CHW_Z_SUPPLY - MAIN_PIPE_INS_R - 0.06,
    z1: CHW_Z_SUPPLY + MAIN_PIPE_INS_R + 0.06,
    y0: HEADER_Y - MAIN_PIPE_INS_R - 0.05,
    y1: HEADER_Y + MAIN_PIPE_INS_R + 0.12,
  },
  {
    ...CHW_HDR_RET,
    z0: CHW_Z_RETURN - MAIN_PIPE_INS_R - 0.06,
    z1: CHW_Z_RETURN + MAIN_PIPE_INS_R + 0.06,
    y0: HEADER_Y - MAIN_PIPE_INS_R - 0.05,
    y1: HEADER_Y + MAIN_PIPE_INS_R + 0.12,
  },
];

/** CDW engine-room risers (includes inline gate valve envelope). */
const CDW_RISER_AABBS: Aabb[] = (
  [
    [CW_X_SUPPLY, CW_Z_SUPPLY, ENG_BOT_Y_SUP],
    [CW_X_RETURN, CW_Z_RETURN, ENG_BOT_Y_RET],
  ] as const
).map(([xR, zs, yBot]) => ({
  x0: xR - 0.48,
  x1: xR + 0.48,
  z0: zs - 0.48,
  z1: zs + 0.48,
  y0: yBot - 0.05,
  y1: ENG_TOP_Y + 0.35,
}));

/* ─── Engine-room walls (back / left / right). +Z face is the open south
   entrance — leave it un-blocked so the technician can walk onto the lawn. */
const WALL_THICKNESS = 0.5;
const WALL_HEIGHT = 12.0;
const WALL_AABBS: Aabb[] = [
  /* Back wall (z = -35) */
  {
    x0: BUILDING_X_MIN - WALL_THICKNESS,
    x1: BUILDING_X_MAX + WALL_THICKNESS,
    z0: BUILDING_Z_MIN - WALL_THICKNESS / 2,
    z1: BUILDING_Z_MIN + WALL_THICKNESS / 2,
    y0: 0,
    y1: WALL_HEIGHT,
  },
  /* Left wall (x = -35) — gap at the +Z face for the open entrance */
  {
    x0: BUILDING_X_MIN - WALL_THICKNESS / 2,
    x1: BUILDING_X_MIN + WALL_THICKNESS / 2,
    z0: BUILDING_Z_MIN - WALL_THICKNESS,
    z1: BUILDING_Z_MAX + WALL_THICKNESS,
    y0: 0,
    y1: WALL_HEIGHT,
  },
  /* Right wall (x = +35) */
  {
    x0: BUILDING_X_MAX - WALL_THICKNESS / 2,
    x1: BUILDING_X_MAX + WALL_THICKNESS / 2,
    z0: BUILDING_Z_MIN - WALL_THICKNESS,
    z1: BUILDING_Z_MAX + WALL_THICKNESS,
    y0: 0,
    y1: WALL_HEIGHT,
  },
];

const MAIN_AABBS: Aabb[] = [
  ...WALL_AABBS,
  ...CHW_HEADER_AABBS,
  ...CDW_RISER_AABBS,
  /* Pipe support saddles (CHW mains, −X side of room) */
  ...[-19, -10].flatMap((sx) =>
    [CHW_Z_SUPPLY, CHW_Z_RETURN].map(
      (zLine): Aabb => ({
        x0: sx - 0.42,
        x1: sx + 0.42,
        z0: zLine - 0.42,
        z1: zLine + 0.42,
        y0: 0,
        y1: HEADER_Y + 0.08,
      }),
    ),
  ),
  /* YORK VFD cabinet (+X of chiller) — matches App.tsx siting */
  { x0: 3.75, x1: 4.65, z0: -3.45, z1: -1.75, y0: 0, y1: 3.35 },
  /* Wall control panel (−X wall) */
  { x0: -30.6, x1: -25.4, z0: -0.85, z1: 0.85, y0: 0, y1: 3.05 },
  /* Electrical cabinet */
  { x0: 21.2, x1: 22.8, z0: 7.2, z1: 8.8, y0: 0, y1: 2.95 },
  /* Instrument board on back wall */
  { x0: 14.45, x1: 15.55, z0: -34.35, z1: -33.65, y0: 0, y1: 2.0 },
  /* Horizontal bladder tank (right front) */
  { x0: 20.75, x1: 23.25, z0: 20.35, z1: 23.65, y0: -1.15, y1: 1.25 },
  /* Steel columns (four corners of the open bay) */
  ...([-25, 25] as const).flatMap((cx) =>
    [-25, 25].map(
      (cz): Aabb => ({
        x0: cx - 0.48,
        x1: cx + 0.48,
        z0: cz - 0.48,
        z1: cz + 0.48,
        y0: 0,
        y1: 12.2,
      }),
    ),
  ),
];

/* ─── Main-floor equipment cylinders (XZ + vertical span) ───────────────── */
const CHILLER_R = 5.0;
const CHILLER_Y1 = 2.85;
const PUMP_R = 2.4;
const PUMP_Y1 = 3.35;
const TANK_R = 2.0;
const VERT_TANK_Y0 = -0.35;
const VERT_TANK_Y1 = 3.65;

/* ─── Rooftop obstacles (tower + AHU footprints) + CDW horizontals ───────── */
const CW_TOWER_X = 25;
const CW_TOWER_Z = 6.175;
const TOWER_BLOCK_R = 3.2;

const AHU_Z = (CHW_Z_SUPPLY + CHW_Z_RETURN) / 2;
const AHU_HALF_W = 14.5 / 2 + 0.4;
const AHU_HALF_D = 5.6 / 2 + 0.4;

const ROOF_CDW_AABBS: Aabb[] = (() => {
  const y0 = ROOF_MAIN_Y - MAIN_PIPE_INS_R - 0.04;
  const y1 = ROOF_MAIN_Y + MAIN_PIPE_INS_R + 0.12;
  const mk = (xR: number, zLine: number): Aabb => {
    const xStart = xR + ROOF_ELBOW_R;
    const x0 = Math.min(xStart, ROOF_X_END) - 0.08;
    const x1 = Math.max(xStart, ROOF_X_END) + 0.08;
    return {
      x0,
      x1,
      z0: zLine - MAIN_PIPE_INS_R - 0.06,
      z1: zLine + MAIN_PIPE_INS_R + 0.06,
      y0,
      y1,
    };
  };
  return [mk(CW_X_SUPPLY, CW_Z_SUPPLY), mk(CW_X_RETURN, CW_Z_RETURN)];
})();

/** Rooftop equipment curbs / sleepers (low boxes on the deck). */
const ROOF_LOW_AABBS: Aabb[] = [
  { x0: 22.5, x1: 27.5, z0: CW_TOWER_Z - 2.75, z1: CW_TOWER_Z + 2.75, y0: 12.28, y1: 12.78 },
  { x0: AHU_X - 7.35, x1: AHU_X + 7.35, z0: AHU_Z - 2.95, z1: AHU_Z + 2.95, y0: 12.28, y1: 12.78 },
];

/* ─── Ladder collision geometry ───────────────────────────────────────────
   All four sides of the shaft are blocked so the player cannot walk through
   the rail structure from any direction.  Climbing is initiated explicitly
   in TechnicianController when the player presses W near the south face,
   which snaps them into the shaft and lifts y above the floor endpoint
   threshold so inShaft activates.

   World-space ladder centre: x=28, z=-31.1  (LADDER.xMin/Max, zMin/Max)
   Rail positions (from App.tsx local offsets ±0.52):  x≈27.48 and 28.52
*/
const LADDER_X_MIN = 27.35;
const LADDER_X_MAX = 28.65;
const LADDER_Z_MIN = -32.15;
const LADDER_Z_MAX = -30.05;
const LADDER_SLAB_H = 12.2; /* full height — rails run floor to roof */
const LADDER_SLAB_T = 0.28; /* slab thickness — wide enough to be reliable */

/** How close to the south face the player must be to trigger a floor-entry climb. */
export const LADDER_ENTRY_DIST = 1.2;

const LADDER_AABBS: Aabb[] = [
  /* Left rail slab */
  {
    x0: LADDER_X_MIN - LADDER_SLAB_T,
    x1: LADDER_X_MIN + LADDER_SLAB_T,
    z0: LADDER_Z_MIN - LADDER_SLAB_T,
    z1: LADDER_Z_MAX + LADDER_SLAB_T,
    y0: 0,
    y1: LADDER_SLAB_H,
  },
  /* Right rail slab */
  {
    x0: LADDER_X_MAX - LADDER_SLAB_T,
    x1: LADDER_X_MAX + LADDER_SLAB_T,
    z0: LADDER_Z_MIN - LADDER_SLAB_T,
    z1: LADDER_Z_MAX + LADDER_SLAB_T,
    y0: 0,
    y1: LADDER_SLAB_H,
  },
  /* Back plate — ladder meets the building's back wall */
  {
    x0: LADDER_X_MIN - LADDER_SLAB_T,
    x1: LADDER_X_MAX + LADDER_SLAB_T,
    z0: LADDER_Z_MIN - LADDER_SLAB_T,
    z1: LADDER_Z_MIN + LADDER_SLAB_T,
    y0: 0,
    y1: LADDER_SLAB_H,
  },
  /* South face — blocks the player from walking through the open front;
     climbing is handled explicitly by the controller's floor-entry logic. */
  {
    x0: LADDER_X_MIN - LADDER_SLAB_T,
    x1: LADDER_X_MAX + LADDER_SLAB_T,
    z0: LADDER_Z_MAX - LADDER_SLAB_T,
    z1: LADDER_Z_MAX + LADDER_SLAB_T,
    y0: 0,
    y1: LADDER_SLAB_H,
  },
];

export function volumeBlockMain(
  x: number,
  z: number,
  feetY: number,
  bodyHeight: number = PLAYER_COLLISION_HEIGHT,
): boolean {
  const topY = feetY + bodyHeight;
  if (cylBlocks(x, z, feetY, topY, 0, 0, CHILLER_R, MAIN_FLOOR_Y, CHILLER_Y1)) return true;
  if (cylBlocks(x, z, feetY, topY, -22, -22, PUMP_R, MAIN_FLOOR_Y, PUMP_Y1)) return true;
  if (cylBlocks(x, z, feetY, topY, -22, 22, PUMP_R, MAIN_FLOOR_Y, PUMP_Y1)) return true;
  if (cylBlocks(x, z, feetY, topY, 22, -22, TANK_R, VERT_TANK_Y0, VERT_TANK_Y1)) return true;
  for (const b of MAIN_AABBS) {
    if (aabbBlocks(x, z, feetY, topY, b)) return true;
  }
  for (const b of LADDER_AABBS) {
    if (aabbBlocks(x, z, feetY, topY, b)) return true;
  }
  return false;
}

export function volumeBlockRoof(
  x: number,
  z: number,
  feetY: number,
  bodyHeight: number = PLAYER_COLLISION_HEIGHT,
): boolean {
  const topY = feetY + bodyHeight;
  if (Math.hypot(x - CW_TOWER_X, z - CW_TOWER_Z) < TOWER_BLOCK_R) return true;
  if (Math.abs(x - AHU_X) < AHU_HALF_W && Math.abs(z - AHU_Z) < AHU_HALF_D) return true;
  /* Hatch shaft opening — treat as a solid wall on the roof so the player
     bumps into it laterally rather than accidentally stepping into the void
     and falling. The shaft has no concrete over it so inLadderVolume cannot
     provide footing; blocking XZ movement is the only safe option. */
  if (
    x >= LADDER.xMin - 0.05 &&
    x <= LADDER.xMax + 0.05 &&
    z >= LADDER.zMin - 0.05 &&
    z <= LADDER.zMax + 0.05
  ) return true;
  for (const b of ROOF_CDW_AABBS) {
    if (aabbBlocks(x, z, feetY, topY, b)) return true;
  }
  for (const b of ROOF_LOW_AABBS) {
    if (aabbBlocks(x, z, feetY, topY, b)) return true;
  }
  return false;
}

/** @deprecated Use volumeBlockMain — kept for callers that only need XZ at floor level */
export function isBlockedMain(x: number, z: number): boolean {
  return volumeBlockMain(x, z, MAIN_FLOOR_Y);
}

export function isBlockedRoof(x: number, z: number): boolean {
  if (Math.hypot(x - CW_TOWER_X, z - CW_TOWER_Z) < TOWER_BLOCK_R) return true;
  if (Math.abs(x - AHU_X) < AHU_HALF_W && Math.abs(z - AHU_Z) < AHU_HALF_D) return true;
  return false;
}

/** Solid roof tiles you can stand on (excludes outer rim = fall zone). */
export function inRoofSolidArea(x: number, z: number): boolean {
  return (
    Math.abs(x) <= ROOF_SOLID_BOUND &&
    Math.abs(z) <= ROOF_SOLID_BOUND
  );
}

/* ─── Roof-access ladder (back-right corner, clear of main equipment) ─────
   Vertical shaft in XZ; climb with W/S while inside. */
export const LADDER = {
  xMin: 27.35,
  xMax: 28.65,
  zMin: -32.15,
  zMax: -30.05,
} as const;

/** After climbing up, spawn feet here (solid deck, just inside the room) */
export const LADDER_ROOF_EXIT: [number, number, number] = [28, ROOF_WALK_Y, -28.4];

/** After climbing down, land here — XZ clear of the shaft so the player
    can walk freely in any direction without re-entering the ladder volume. */
export const LADDER_FLOOR_EXIT: [number, number, number] = [
  (LADDER.xMin + LADDER.xMax) / 2,
  MAIN_FLOOR_Y,
  LADDER.zMax + 0.8,
];

/** Center of shaft at hatch lip — placed here when initiating a roof-down descent */
export const LADDER_ROOF_ENTRY: [number, number, number] = [
  (LADDER.xMin + LADDER.xMax) / 2,
  ROOF_WALK_Y - 0.14,
  (LADDER.zMin + LADDER.zMax) / 2,
];

/** Snap-in point when the player grabs the ladder from the ground floor.
 *  XZ is shaft centre; y is just above the floor endpoint threshold so
 *  inShaft activates on the very next frame. */
export const LADDER_FLOOR_ENTRY: [number, number, number] = [
  (LADDER.xMin + LADDER.xMax) / 2,
  MAIN_FLOOR_Y + 0.12,
  (LADDER.zMin + LADDER.zMax) / 2,
];

/** True when the player is on the ground floor, approaching the ladder from
 *  the south (positive-Z side) and horizontally aligned with the shaft opening.
 *  The trigger window sits just outside the south-face slab so pressing W
 *  while bumped against it snaps the player into climb mode. */
export function nearLadderBase(x: number, z: number): boolean {
  const cx = (LADDER.xMin + LADDER.xMax) / 2;
  const southFace = LADDER.zMax; // = -30.05
  return (
    Math.abs(x - cx) <= (LADDER.xMax - LADDER.xMin) / 2 + 0.3 &&
    z >= southFace - 0.1 &&              // just inside or at the slab face
    z <= southFace + LADDER_ENTRY_DIST   // up to 1.2 m away on approach side
  );
}

/** True when the player is on the roof within reach of the hatch opening. */
export function nearLadderHatch(x: number, z: number): boolean {
  const cx = (LADDER.xMin + LADDER.xMax) / 2;
  const cz = (LADDER.zMin + LADDER.zMax) / 2;
  const dx = x - cx;
  const dz = z - cz;
  return dx * dx + dz * dz <= 4.5 * 4.5; // 4.5 m radius around hatch centre
}

export function inLadderVolume(x: number, z: number): boolean {
  return (
    x >= LADDER.xMin &&
    x <= LADDER.xMax &&
    z >= LADDER.zMin &&
    z <= LADDER.zMax
  );
}

export function canStandOnRoof(x: number, z: number): boolean {
  if (inLadderVolume(x, z)) return false;
  return (
    inRoofSolidArea(x, z) &&
    !volumeBlockRoof(x, z, ROOF_WALK_Y - 0.02)
  );
}
