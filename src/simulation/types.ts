export type RefrigerantType = 'R-134a' | 'R-123' | 'R-513A';

export interface SimulationState {
  // Compressor
  compressorRunning: boolean;
  compressorSpeed: number; // 0-100%
  suctionPressure: number; // psig
  dischargePressure: number; // psig
  suctionTemp: number; // °F
  dischargeTemp: number; // °F

  // Evaporator
  leavingChilledWaterTemp: number; // °F
  enteringChilledWaterTemp: number; // °F
  evaporatorRefrigerantTemp: number; // °F
  chilledWaterFlow: number; // GPM

  // Condenser
  leavingCondenserWaterTemp: number; // °F
  enteringCondenserWaterTemp: number; // °F
  condenserRefrigerantTemp: number; // °F
  condenserWaterFlow: number; // GPM

  // Oil System
  oilPressure: number; // psig (above suction)
  oilTemp: number; // °F
  oilHeaterOn: boolean;
  oilLevel: number; // 0-100%

  // Calculated
  superheat: number; // °F
  subcooling: number; // °F
  capacity: number; // tons

  // Safety
  highDischargePressureTrip: boolean;
  lowSuctionPressureTrip: boolean;
  oilTempTrip: boolean;
  flowSwitchTrip: boolean;
  motorOverloadTrip: boolean;

  // Valves
  dischargeValveOpen: boolean;
  suctionValveOpen: boolean;
  liquidLineValveOpen: boolean;
  economizerValveOpen: boolean;

  // Water Flow
  condenserWaterFlowing: boolean;
  evaporatorWaterFlowing: boolean;

  // Time
  lastUpdate: number;
}

export interface ChillerConfig {
  refrigerant: RefrigerantType;
  designCapacity: number; // tons
  designSuctionPressure: number;
  designDischargePressure: number;
  designEvapTemp: number;
  designCondTemp: number;
  compressorEfficiency: number;
}

export interface ValveState {
  id: string;
  type: 'ball' | 'gate' | 'check' | 'butterfly' | 'globe' | 'motorized' | 'drain';
  open: boolean;
  position: number; // 0 = closed, 1 = open
}

export interface AlarmState {
  active: boolean;
  code: string;
  description: string;
  timestamp: number;
}

export interface StartupStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  checkType: 'valve' | 'switch' | 'timer' | 'measurement' | 'manual';
  targetValue?: boolean | number | string;
  tolerance?: number;
}