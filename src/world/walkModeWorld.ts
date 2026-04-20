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

/** Horizontal bounds (main floor) — matches TechnicianController */
export const ROOM_BOUND = 32;

/** Inner deck where footing is solid (landing / stand checks) */
export const ROOF_SOLID_BOUND = 33;

/** Outer limit for walking on the roof — beyond ROOF_SOLID_BOUND there is no slab
    (step off or jump to fall to the machine-room floor). ~matches 72×72 deck vs parapet */
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
const HEAD_Z = 4.65;
const EVAP_X = -2.092;
const CHW_X_SUPPLY = EVAP_X - 0.45;
const CHW_X_RETURN = EVAP_X + 0.45;
const CHW_Z_SUPPLY = -(HEAD_Z + 0.95);
const CHW_Z_RETURN = -(HEAD_Z + 2.1);
const AHU_X = -22;
const HEADER_Y = 1.1;
const MAIN_PIPE_INS_R = 0.3 + 0.1;

const CW_X_SUPPLY = 0.335;
const CW_X_RETURN = -0.335;
const CW_Z_SUPPLY = HEAD_Z + 0.95;
const CW_Z_RETURN = HEAD_Z + 2.1;
const CW_Y_FLANGE = 2.05;
const CDW_BARREL_R = 0.35;
const ENG_BOT_Y = CW_Y_FLANGE - CDW_BARREL_R - 0.04;
const ROOF_MAIN_Y = 12.55;
const ROOF_ELBOW_R = 0.45;
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
const CDW_RISER_AABBS: Aabb[] = [CW_X_SUPPLY, CW_X_RETURN].map((xR) => {
  const zs = xR === CW_X_SUPPLY ? CW_Z_SUPPLY : CW_Z_RETURN;
  return {
    x0: xR - 0.48,
    x1: xR + 0.48,
    z0: zs - 0.48,
    z1: zs + 0.48,
    y0: ENG_BOT_Y - 0.05,
    y1: ENG_TOP_Y + 0.35,
  };
});

const MAIN_AABBS: Aabb[] = [
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
