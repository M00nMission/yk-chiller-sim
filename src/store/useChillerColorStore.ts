import { create } from 'zustand';

/* ─────────────────────────────────────────────────────────────────────────────
   Chiller shell colour store
   ────────────────────────────────────────────────────────────────────────────
   Pieces of procedural geometry that are welded directly INTO the chiller
   barrel (e.g. the vessel-side weld-neck of every CDW / CHW flange) need to
   read as continuous with the GLB shell, not as an independent painted spool.

   The GLB ships with baked textures, so the visible shell colour is buried
   inside an image — it isn't a flat material.colour we can read trivially.
   When the chiller model loads we sample the average pixel of the baked
   texture for each shell (condenser / evaporator) and push that hex into
   this store. Procedural neck tapers then subscribe to the colour and stay
   in sync if the GLB is ever swapped out.

   Defaults are a sensible YORK-beige used until the sampler resolves, so the
   first frame still looks plausible rather than green / white.
   ────────────────────────────────────────────────────────────────────────── */

interface ChillerColorState {
  /** Baked colour of the lower (condenser) shell — Cylinder002_Baked. */
  condenserShellColor: string;
  /** Baked colour of the upper (evaporator) shell — Cylinder001_Baked. */
  evaporatorShellColor: string;
  setShellColor: (which: 'condenser' | 'evaporator', hex: string) => void;
}

export const useChillerColorStore = create<ChillerColorState>((set) => ({
  condenserShellColor: '#c8b896',
  evaporatorShellColor: '#c8b896',
  setShellColor: (which, hex) =>
    set(which === 'condenser'
      ? { condenserShellColor: hex }
      : { evaporatorShellColor: hex }),
}));
