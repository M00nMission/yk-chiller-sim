import { create } from 'zustand';

export type PlantLayerKey =
  | 'hydronics'
  | 'electrical'
  | 'instrumentation'
  | 'drains'
  | 'makeupChemical';

export type PlantLayers = Record<PlantLayerKey, boolean>;

const defaultLayers: PlantLayers = {
  hydronics: true,
  electrical: true,
  instrumentation: true,
  drains: true,
  makeupChemical: true,
};

interface PlantLayerStore {
  layers: PlantLayers;
  toggleLayer: (key: PlantLayerKey) => void;
  setLayer: (key: PlantLayerKey, value: boolean) => void;
}

export const usePlantLayerStore = create<PlantLayerStore>((set) => ({
  layers: { ...defaultLayers },
  toggleLayer: (key) =>
    set((s) => ({
      layers: { ...s.layers, [key]: !s.layers[key] },
    })),
  setLayer: (key, value) =>
    set((s) => ({
      layers: { ...s.layers, [key]: value },
    })),
}));
