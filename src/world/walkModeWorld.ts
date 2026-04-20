/* ============================================================================
   Walk-mode world geometry: main floor obstacles, rooftop deck, ladder shaft.
   Kept in sync with EngineRoom in App.tsx (roof slab y≈12.05, thickness 0.38).
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

/* ─── Main-floor obstacle cylinders (same as original isBlocked) ─────────── */
const CHILLER_R = 5.0;
const PUMP_R = 2.4;
const TANK_R = 2.0;

export function isBlockedMain(x: number, z: number): boolean {
  if (Math.hypot(x, z) < CHILLER_R) return true;
  if (Math.hypot(x - -22, z - -22) < PUMP_R) return true;
  if (Math.hypot(x - -22, z - 22) < PUMP_R) return true;
  if (Math.hypot(x - 22, z - -22) < TANK_R) return true;
  if (Math.hypot(x - 22, z - 22) < TANK_R) return true;
  return false;
}

/* ─── Rooftop obstacles (from EngineRoom: tower + AHU footprints) ─────── */
const CW_TOWER_X = 25;
const CW_TOWER_Z = 6.175;
const TOWER_BLOCK_R = 3.2;

const AHU_X = -22;
const AHU_Z = (() => {
  const HEAD_Z = 4.65;
  const CHW_Z_SUPPLY = -(HEAD_Z + 0.95);
  const CHW_Z_RETURN = -(HEAD_Z + 2.1);
  return (CHW_Z_SUPPLY + CHW_Z_RETURN) / 2;
})();
const AHU_HALF_W = 14.5 / 2 + 0.4;
const AHU_HALF_D = 5.6 / 2 + 0.4;

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
  return inRoofSolidArea(x, z) && !isBlockedRoof(x, z);
}
