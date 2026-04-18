import { useSimulationStore } from '../store/useSimulationStore';
import type { SimulationState } from './types';

// R-134a saturation properties (simplified table for simulation)
// P in psig, returns T in °F
function P_sat_R134a(P: number): number {
  // Antoine equation coefficients for R-134a
  const A = 3.56320;
  const B = 643.629;
  const C = -82.393;
  return (B / (A - Math.log10(P + 0.1))) + C;
}

// Simple isentropic efficiency model for centrifugal compressor
function isentropicEfficiency(ratio: number): number {
  // Peak efficiency around ratio 2.5-3.0
  const peakRatio = 2.75;
  const peakEfficiency = 0.78;
  const falloff = 0.15;
  const deviation = Math.abs(Math.log(ratio) - Math.log(peakRatio));
  return Math.max(0.55, peakEfficiency - falloff * deviation * deviation * 10);
}

export class SimulationEngine {
  private lastTick = 0;
  private tickInterval = 100; // 10 Hz
  private animationId: number | null = null;

  start() {
    if (this.animationId !== null) return;
    this.lastTick = Date.now();

    const tick = () => {
      const now = Date.now();
      if (now - this.lastTick >= this.tickInterval) {
        this.computeStep();
        this.lastTick = now;
      }
      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private computeStep() {
    const store = useSimulationStore.getState();
    const { state, config, valves } = store;

    // Find valve states
    const dischargeOpen = valves.find(v => v.id === 'discharge')?.open ?? true;
    const suctionOpen = valves.find(v => v.id === 'suction')?.open ?? true;
    const liquidLineOpen = valves.find(v => v.id === 'liquidLine')?.open ?? true;

    // Base saturation temperatures
    const T_sat_suc = P_sat_R134a(state.suctionPressure);
    const T_sat_dis = P_sat_R134a(state.dischargePressure);

    // Oil heater effect
    let newOilTemp = state.oilTemp;
    if (state.oilHeaterOn) {
      newOilTemp = Math.min(130, state.oilTemp + 0.05); // Slow warm-up
    } else {
      newOilTemp = Math.max(50, state.oilTemp - 0.02); // Slow cool-down
    }

    // Compressor is running
    let newState: Partial<SimulationState> = {
      oilTemp: newOilTemp,
    };

    if (state.compressorRunning && dischargeOpen && suctionOpen && state.condenserWaterFlowing && state.evaporatorWaterFlowing) {
      // Centrifugal compressor model
      const pressureRatio = state.dischargePressure / Math.max(state.suctionPressure, 1);
      const eta_isentropic = isentropicEfficiency(pressureRatio);

      // Refrigerant mass flow (proportional to speed and pressure ratio)
      const baseFlow = config.designCapacity * 0.02;
      const speedFactor = state.compressorSpeed / 100;
      const m_dot_ref = baseFlow * speedFactor * Math.sqrt(pressureRatio);

      // Calculate superheat based on suction line heat gain
      const superheat = 8 + Math.random() * 4;

      // Discharge temperature (isentropic + efficiency losses)
      const h_suc = 90 + superheat; // Approximate enthalpy at suction
      const h_dis_isentropic = h_suc * Math.pow(pressureRatio, 0.35);
      const h_dis = h_suc + (h_dis_isentropic - h_suc) / eta_isentropic;
      const T_dis = 100 + (h_dis - 90) * 0.5;

      // Refrigerant effect (evaporator)
      const refrigerantEffect = 80; // Btu/lb

      // Capacity calculation
      const capacity = m_dot_ref * refrigerantEffect / 200;

      // Subcooling (typically 8-15°F for properly charged system)
      const subcooling = liquidLineOpen ? 10 + Math.random() * 3 : 2;

      // Oil pressure differential (always positive when running)
      const oilPumpOn = state.compressorRunning;
      const oilPressureDiff = oilPumpOn ? 25 + Math.random() * 15 : 0;

      newState = {
        ...newState,
        suctionTemp: T_sat_suc + superheat,
        dischargeTemp: T_dis,
        superheat,
        subcooling,
        capacity,
        oilPressure: state.suctionPressure + oilPressureDiff,
        leavingChilledWaterTemp: config.designEvapTemp + (1 - speedFactor) * 3,
        leavingCondenserWaterTemp: config.designCondTemp + speedFactor * 8,
        condenserRefrigerantTemp: T_sat_dis,
        evaporatorRefrigerantTemp: T_sat_suc,
      };

      // Safety checks
      if (state.dischargePressure > 300) {
        newState.highDischargePressureTrip = true;
      }
      if (state.suctionPressure < 20) {
        newState.lowSuctionPressureTrip = true;
      }
      if (newOilTemp > 150) {
        newState.oilTempTrip = true;
      }
    } else {
      // Compressor off - system at rest
      const coolDownRate = 0.1;
      newState = {
        ...newState,
        suctionTemp: T_sat_suc,
        dischargeTemp: state.dischargeTemp > T_sat_dis ? T_sat_dis : state.dischargeTemp + coolDownRate,
        capacity: 0,
        oilPressure: state.oilHeaterOn ? state.suctionPressure + 15 : state.suctionPressure,
      };
    }

    // Update store
    store.updateSimulation(newState);
  }
}

export const simulationEngine = new SimulationEngine();