import { create } from 'zustand';

/**
 * Component specification surfaced in the inspect HUD when the user hovers
 * a registered piece of equipment (pid `tooltips` — "Clicking any component
 * shows detailed info: tag, spec, installation note").
 */
export interface ComponentSpec {
  tag: string;
  service?: string;
  spec?: string;
  installNote?: string;
  pidRef?: string;
}

interface InspectStore {
  inspectMode: boolean;
  setInspectMode: (on: boolean) => void;
  hoveredName: string | null;
  hoveredPath: string | null;
  /** Multi-line triangle / face / material / UV readout */
  hoveredDetail: string | null;
  /** Resolved component spec (matched from registry by mesh-name path). */
  hoveredSpec: ComponentSpec | null;
  /** Short message after click-to-copy (e.g. success / error) */
  copyFeedback: string | null;
  setHovered: (
    name: string | null,
    path: string | null,
    detail: string | null,
    spec?: ComponentSpec | null,
  ) => void;
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
            hoveredSpec: null,
            copyFeedback: null,
          },
    ),
  hoveredName: null,
  hoveredPath: null,
  hoveredDetail: null,
  hoveredSpec: null,
  copyFeedback: null,
  setHovered: (hoveredName, hoveredPath, hoveredDetail, hoveredSpec = null) =>
    set({ hoveredName, hoveredPath, hoveredDetail, hoveredSpec }),
  setCopyFeedback: (copyFeedback) => set({ copyFeedback }),
}));
