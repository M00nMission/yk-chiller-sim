import { create } from 'zustand';
import type { SimulationState, ChillerConfig, ValveState, AlarmState, StartupStep } from '../simulation/types';

interface SimulationStore {
  state: SimulationState;
  config: ChillerConfig;
  valves: ValveState[];
  alarms: AlarmState[];
  startupSteps: StartupStep[];
  activeStep: number;

  // Actions
  setValve: (id: string, open: boolean) => void;
  toggleValve: (id: string) => void;
  setCompressorRunning: (running: boolean) => void;
  setOilHeaterOn: (on: boolean) => void;
  setWaterFlow: (type: 'condenser' | 'evaporator', flowing: boolean) => void;
  updateSimulation: (state: Partial<SimulationState>) => void;
  triggerAlarm: (code: string, description: string) => void;
  clearAlarm: (code: string) => void;
  completeStartupStep: (stepId: number) => void;
  setActiveStep: (step: number) => void;
}

const defaultState: SimulationState = {
  compressorRunning: true,
  compressorSpeed: 78,
  suctionPressure: 58.5,
  dischargePressure: 185.0,
  suctionTemp: 44.2,
  dischargeTemp: 152.0,
  leavingChilledWaterTemp: 44.0,
  enteringChilledWaterTemp: 54.0,
  evaporatorRefrigerantTemp: 38.5,
  chilledWaterFlow: 0,
  leavingCondenserWaterTemp: 85.0,
  enteringCondenserWaterTemp: 75.0,
  condenserRefrigerantTemp: 91.2,
  condenserWaterFlow: 0,
  oilPressure: 0,
  oilTemp: 110.0,
  oilHeaterOn: false,
  oilLevel: 75,
  superheat: 8.5,
  subcooling: 10.2,
  capacity: 0,
  highDischargePressureTrip: false,
  lowSuctionPressureTrip: false,
  oilTempTrip: false,
  flowSwitchTrip: false,
  motorOverloadTrip: false,
  dischargeValveOpen: true,
  suctionValveOpen: true,
  liquidLineValveOpen: true,
  economizerValveOpen: false,
  condenserWaterFlowing: true,
  evaporatorWaterFlowing: true,
  lastUpdate: Date.now(),
};

const defaultConfig: ChillerConfig = {
  refrigerant: 'R-134a',
  designCapacity: 500,
  designSuctionPressure: 65.0,
  designDischargePressure: 190.0,
  designEvapTemp: 44.0,
  designCondTemp: 85.0,
  compressorEfficiency: 0.72,
};

const defaultValves: ValveState[] = [
  { id: 'discharge', type: 'gate', open: true, position: 1 },
  { id: 'suction', type: 'gate', open: true, position: 1 },
  { id: 'liquidLine', type: 'ball', open: true, position: 1 },
  { id: 'economizer', type: 'ball', open: false, position: 0 },
  { id: 'oilSupply', type: 'ball', open: true, position: 1 },
  { id: 'purge', type: 'ball', open: false, position: 0 },
  { id: 'condenserWaterInlet', type: 'butterfly', open: true, position: 1 },
  { id: 'evaporatorWaterInlet', type: 'butterfly', open: true, position: 1 },
  /* Field piping — CHW header OS&Y isolation */
  { id: 'pipe_gate_chw_supply_chiller', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_chw_return_chiller', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_chw_supply_ahu', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_chw_return_ahu', type: 'gate', open: true, position: 1 },
  /* CDW riser + roof isolation (per supply/return loop) */
  { id: 'pipe_gate_cdw_riser_sup', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_cdw_roof_sup', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_cdw_riser_ret', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_cdw_roof_ret', type: 'gate', open: true, position: 1 },
  /* Butterflies + actuated valves */
  { id: 'pipe_bf_chws_secondary', type: 'butterfly', open: true, position: 1 },
  { id: 'pipe_bf_chwr_secondary', type: 'butterfly', open: true, position: 1 },
  { id: 'pipe_cv_chws_tcv1', type: 'motorized', open: true, position: 1 },
  { id: 'pipe_bf_cdws_riser', type: 'butterfly', open: true, position: 1 },
  { id: 'pipe_cv_cdws_tbv1', type: 'motorized', open: true, position: 1 },
  { id: 'pipe_bf_cdws_tower', type: 'butterfly', open: true, position: 1 },
  { id: 'pipe_bf_cdwr_strainer_out', type: 'butterfly', open: true, position: 1 },
  { id: 'pipe_bf_cdwr_tower', type: 'butterfly', open: true, position: 1 },
  /* Manual balancing globes */
  { id: 'pipe_globe_chws_balance', type: 'globe', open: true, position: 1 },
  { id: 'pipe_globe_chwr_balance', type: 'globe', open: true, position: 1 },
  /* Low-point and header drains */
  { id: 'pipe_drain_chws_header', type: 'drain', open: false, position: 0 },
  { id: 'pipe_drain_chwr_header', type: 'drain', open: false, position: 0 },
  { id: 'pipe_drain_cdws_riser_base', type: 'drain', open: false, position: 0 },
  { id: 'pipe_drain_cdwr_riser_base', type: 'drain', open: false, position: 0 },
  { id: 'pipe_drain_cdws_roof', type: 'drain', open: false, position: 0 },
  /* PID pump trains + tower overflow + chiller low-point drains */
  { id: 'pipe_gate_cdwp_suction', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_cdwp_suction-close', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_cdwp_discharge', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_chwp_suction', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_chwp_suction-close', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_chwp_discharge', type: 'gate', open: true, position: 1 },
  { id: 'pipe_gate_tower_overflow', type: 'gate', open: true, position: 1 },
  { id: 'pipe_drain_evap_low', type: 'drain', open: false, position: 0 },
  { id: 'pipe_drain_cond_low', type: 'drain', open: false, position: 0 },
  /* pid.json drains — pump volute low points + AHU coil header */
  { id: 'pipe_drain_cdwp_low', type: 'drain', open: false, position: 0 },
  { id: 'pipe_drain_chwp_low', type: 'drain', open: false, position: 0 },
  { id: 'pipe_drain_ahu_coil', type: 'drain', open: false, position: 0 },
];

const defaultStartupSteps: StartupStep[] = [
  { id: 1, title: 'Pre-Start Inspection', description: 'Verify all safety devices and perimeter are clear', completed: false, required: true, checkType: 'manual' },
  { id: 2, title: 'Check Oil Heater Status', description: 'Confirm oil heater has been energized for 12+ hours. Oil temp must be > 40°C', completed: false, required: true, checkType: 'measurement', targetValue: 40, tolerance: 3 },
  { id: 3, title: 'Verify Water Flow', description: 'Confirm condenser and evaporator water pumps are running and flow switches are closed', completed: false, required: true, checkType: 'switch' },
  { id: 4, title: 'Check Service Valves', description: 'Verify discharge and suction service valves are fully open', completed: false, required: true, checkType: 'valve' },
  { id: 5, title: 'Reset Faults', description: 'Clear any accumulated faults or interlocks', completed: false, required: false, checkType: 'switch' },
  { id: 6, title: 'Start Compressor', description: 'Turn key switch to ON or press START pushbutton', completed: false, required: true, checkType: 'switch' },
  { id: 7, title: 'Monitor Warm-up', description: 'Allow system to warm up. Monitor suction/discharge pressures and temperatures', completed: false, required: true, checkType: 'measurement' },
  { id: 8, title: 'Verify Safe Operating Parameters', description: 'Confirm all operating parameters are within safe limits', completed: false, required: true, checkType: 'measurement' },
];

export const useSimulationStore = create<SimulationStore>((set) => ({
  state: defaultState,
  config: defaultConfig,
  valves: defaultValves,
  alarms: [],
  startupSteps: defaultStartupSteps,
  activeStep: 0,

  setValve: (id, open) => set((store) => ({
    valves: store.valves.map(v => v.id === id ? { ...v, open, position: open ? 1 : 0 } : v)
  })),

  toggleValve: (id) => set((store) => ({
    valves: store.valves.map(v => v.id === id ? { ...v, open: !v.open, position: v.open ? 0 : 1 } : v)
  })),

  setCompressorRunning: (running) => set((store) => ({
    state: { ...store.state, compressorRunning: running }
  })),

  setOilHeaterOn: (on) => set((store) => ({
    state: { ...store.state, oilHeaterOn: on }
  })),

  setWaterFlow: (type, flowing) => set((store) => ({
    state: {
      ...store.state,
      [type === 'condenser' ? 'condenserWaterFlowing' : 'evaporatorWaterFlowing']: flowing
    }
  })),

  updateSimulation: (newState) => set((store) => ({
    state: { ...store.state, ...newState, lastUpdate: Date.now() }
  })),

  triggerAlarm: (code, description) => set((store) => ({
    alarms: [...store.alarms, { active: true, code, description, timestamp: Date.now() }]
  })),

  clearAlarm: (code) => set((store) => ({
    alarms: store.alarms.map(a => a.code === code ? { ...a, active: false } : a)
  })),

  completeStartupStep: (stepId) => set((store) => ({
    startupSteps: store.startupSteps.map(s => s.id === stepId ? { ...s, completed: true } : s)
  })),

  setActiveStep: (step) => set({ activeStep: step }),
}))