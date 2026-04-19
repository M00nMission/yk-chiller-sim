import { create } from 'zustand';

interface InspectStore {
  inspectMode: boolean;
  setInspectMode: (on: boolean) => void;
  hoveredName: string | null;
  hoveredPath: string | null;
  /** Multi-line triangle / face / material / UV readout */
  hoveredDetail: string | null;
  /** Short message after click-to-copy (e.g. success / error) */
  copyFeedback: string | null;
  setHovered: (name: string | null, path: string | null, detail: string | null) => void;
  setCopyFeedback: (msg: string | null) => void;
}

export const useInspectStore = create<InspectStore>((set) => ({
  inspectMode: false,
  setInspectMode: (inspectMode) =>
    set(
      inspectMode
        ? { inspectMode }
        : {
            inspectMode,
            hoveredName: null,
            hoveredPath: null,
            hoveredDetail: null,
            copyFeedback: null,
          },
    ),
  hoveredName: null,
  hoveredPath: null,
  hoveredDetail: null,
  copyFeedback: null,
  setHovered: (hoveredName, hoveredPath, hoveredDetail) =>
    set({ hoveredName, hoveredPath, hoveredDetail }),
  setCopyFeedback: (copyFeedback) => set({ copyFeedback }),
}));
