/**
 * Loop-flow selectors.
 *
 * Each selector resolves to `true` only when the named loop is actually
 * able to convey water — that is, the simulation's master "<loop>WaterFlowing"
 * flag is set AND every isolation valve along that loop's hydraulic path is
 * open. Closing any one of these valves immediately drops the selector to
 * `false`, which the <PipeFlowMarkers/> component uses to hide the moving
 * chevrons across every segment of that loop.
 *
 * The valve groups below are deliberately conservative: any single closed
 * isolation, balancing, butterfly, motorized, or pump-skid gate dead-heads
 * the loop, just as in the real plant. Drains, vents, and pump-skid
 * "close-on-isolation" trim valves that are normally CLOSED are not
 * considered, so opening or closing them does not affect flow.
 */
import { useSimulationStore } from '../store/useSimulationStore';

/* ── Hydraulic path: chiller condenser ↔ rooftop induced-draft tower ──
 *
 *   chiller condenser nozzle
 *     → CDWS riser (pipe_gate_cdw_riser_sup)
 *     → CDWS rooftop main (pipe_gate_cdw_roof_sup)
 *     → CDWS tower-side butterflies (pipe_bf_cdws_riser, pipe_cv_cdws_tbv1,
 *                                    pipe_bf_cdws_tower)
 *     → tower basin
 *     → CDWR tower butterfly (pipe_bf_cdwr_tower)
 *     → CDWR rooftop main (pipe_gate_cdw_roof_ret)
 *     → CDWR riser (pipe_gate_cdw_riser_ret)
 *     → strainer-out butterfly (pipe_bf_cdwr_strainer_out)
 *     → CDWP suction (pipe_gate_cdwp_suction & ‑close)
 *     → CDWP discharge (pipe_gate_cdwp_discharge)
 *     → back to chiller condenser nozzle
 */
export const CDW_LOOP_VALVES: readonly string[] = [
  'pipe_gate_cdw_riser_sup',
  'pipe_gate_cdw_roof_sup',
  'pipe_gate_cdw_riser_ret',
  'pipe_gate_cdw_roof_ret',
  'pipe_bf_cdws_riser',
  'pipe_cv_cdws_tbv1',
  'pipe_bf_cdws_tower',
  'pipe_bf_cdwr_strainer_out',
  'pipe_bf_cdwr_tower',
  'pipe_gate_cdwp_suction',
  'pipe_gate_cdwp_suction-close',
  'pipe_gate_cdwp_discharge',
];

/* ── Hydraulic path: chiller evaporator ↔ rooftop AHU coil ──
 *
 *   chiller evaporator nozzle
 *     → CHWS chiller-side gate (pipe_gate_chw_supply_chiller)
 *     → CHWS balance + secondary butterfly + 2-way TCV
 *           (pipe_globe_chws_balance, pipe_bf_chws_secondary, pipe_cv_chws_tcv1)
 *     → AHU CHWS coil header gate (pipe_gate_chw_supply_ahu)
 *     → coil
 *     → AHU CHWR header gate (pipe_gate_chw_return_ahu)
 *     → CHWR balance + secondary butterfly
 *           (pipe_globe_chwr_balance, pipe_bf_chwr_secondary)
 *     → CHWR chiller-side gate (pipe_gate_chw_return_chiller)
 *     → CHWP suction (pipe_gate_chwp_suction & ‑close)
 *     → CHWP discharge (pipe_gate_chwp_discharge)
 *     → back to chiller evaporator nozzle
 */
export const CHW_LOOP_VALVES: readonly string[] = [
  'pipe_gate_chw_supply_chiller',
  'pipe_gate_chw_return_chiller',
  'pipe_gate_chw_supply_ahu',
  'pipe_gate_chw_return_ahu',
  'pipe_bf_chws_secondary',
  'pipe_bf_chwr_secondary',
  'pipe_cv_chws_tcv1',
  'pipe_globe_chws_balance',
  'pipe_globe_chwr_balance',
  'pipe_gate_chwp_suction',
  'pipe_gate_chwp_suction-close',
  'pipe_gate_chwp_discharge',
];

function allValvesOpen(
  valves: ReadonlyArray<{ id: string; open: boolean }>,
  ids: readonly string[],
): boolean {
  for (const id of ids) {
    const v = valves.find((x) => x.id === id);
    /* Missing valves are treated as open — they may not yet be defined in
     * the store but we don't want a missing entry to permanently kill flow. */
    if (v && !v.open) return false;
  }
  return true;
}

/**
 * `true` only when the condenser-water loop is energised AND every gate /
 * butterfly / TCV / pump-skid valve along the chiller↔tower path is open.
 */
export function useCdwLoopFlowing(): boolean {
  const master = useSimulationStore((s) => s.state.condenserWaterFlowing);
  const valves = useSimulationStore((s) => s.valves);
  return master && allValvesOpen(valves, CDW_LOOP_VALVES);
}

/**
 * `true` only when the chilled-water loop is energised AND every gate /
 * butterfly / TCV / balancing-globe / pump-skid valve along the
 * chiller↔AHU path is open.
 */
export function useChwLoopFlowing(): boolean {
  const master = useSimulationStore((s) => s.state.evaporatorWaterFlowing);
  const valves = useSimulationStore((s) => s.valves);
  return master && allValvesOpen(valves, CHW_LOOP_VALVES);
}
