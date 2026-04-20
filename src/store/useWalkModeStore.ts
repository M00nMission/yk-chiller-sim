import { create } from 'zustand';

/* ============================================================================
   Walk Mode store
   Toggles between free-orbit and a first-person walking view through the
   engine room (camera at the technician's eye height, mouse-look via
   PointerLockControls).
============================================================================ */

interface WalkModeStore {
  walkMode: boolean;
  setWalkMode: (on: boolean) => void;
  /** Live status pushed by the controller, useful for HUDs. */
  motionState: 'idle' | 'walk' | 'run';
  setMotionState: (m: 'idle' | 'walk' | 'run') => void;
}

export const useWalkModeStore = create<WalkModeStore>((set) => ({
  walkMode: false,
  setWalkMode: (walkMode) => set({ walkMode, motionState: 'idle' }),
  motionState: 'idle',
  setMotionState: (motionState) => set({ motionState }),
}));
