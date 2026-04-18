import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '../../store/useSimulationStore';

export function ControlPanelUI() {
  const { state } = useSimulationStore();

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#1a1d21] border-b border-[#2d3239] flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-4 ml-2">
          <h1 className="text-white font-semibold text-lg tracking-tight">York YK Centrifugal Chiller</h1>
          <span className="text-[#666] text-sm">Simulator v1.0</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator label="Compressor" active={state.compressorRunning} color="green" />
          <StatusIndicator label="Oil Heater" active={state.oilHeaterOn} color="amber" />
          <StatusIndicator label="Fault" active={state.highDischargePressureTrip || state.lowSuctionPressureTrip} color="red" />
        </div>
      </div>

      {/* Floating alarm banner */}
      <AnimatePresence>
        {(state.highDischargePressureTrip || state.lowSuctionPressureTrip) && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 60, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-500 px-6 py-3 rounded-lg z-20 flex items-center gap-3"
          >
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-semibold">
              {state.highDischargePressureTrip ? 'HIGH DISCHARGE PRESSURE TRIP' : 'LOW SUCTION PRESSURE TRIP'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StatusIndicator({ label, active, color }: { label: string; active: boolean; color: 'green' | 'amber' | 'red' }) {
  const colorMap = {
    green: { on: '#3bff6f', off: '#1a3320' },
    amber: { on: '#ffb84d', off: '#332a10' },
    red: { on: '#ff3b3b', off: '#331a1a' },
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-2.5 h-2.5 rounded-full transition-colors"
        style={{ backgroundColor: active ? colorMap[color].on : colorMap[color].off, boxShadow: active ? `0 0 8px ${colorMap[color].on}` : 'none' }}
      />
      <span className="text-[#aaa] text-xs">{label}</span>
    </div>
  );
}
