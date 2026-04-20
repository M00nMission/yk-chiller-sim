import { create } from 'zustand';

/**
 * Engine room garage doors. The south face of the building is fitted with
 * three roll-up overhead doors. `open === true` plays the rolling-up
 * animation (curtains retract into the header housing); `open === false`
 * plays the rolling-down animation. The actual lerp happens per-frame in
 * the 3D component using `useFrame`, so the store only needs to expose the
 * target state and a toggle.
 */
interface GarageDoorStore {
  /** Target state: true = doors retracted up into the header (open). */
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

export const useGarageDoorStore = create<GarageDoorStore>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
}));
