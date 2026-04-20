import { motion, AnimatePresence } from 'framer-motion';
import { useSimulationStore } from '../../store/useSimulationStore';
import { useInspectStore } from '../../store/useInspectStore';
import { useGarageDoorStore } from '../../store/useGarageDoorStore';

export function ControlPanelUI() {
  const { state } = useSimulationStore();
  const inspectMode = useInspectStore((s) => s.inspectMode);
  const setInspectMode = useInspectStore((s) => s.setInspectMode);
  const hoveredName = useInspectStore((s) => s.hoveredName);
  const hoveredPath = useInspectStore((s) => s.hoveredPath);
  const hoveredDetail = useInspectStore((s) => s.hoveredDetail);
  const copyFeedback = useInspectStore((s) => s.copyFeedback);
  const garageDoorsOpen = useGarageDoorStore((s) => s.open);
  const toggleGarageDoors = useGarageDoorStore((s) => s.toggle);

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-[#1a1d21] border-b border-[#2d3239] flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4 mx-3">
          <h1 className="text-white font-semibold text-lg tracking-tight">YORK Water-Cooled Chiller Plant</h1>
          <span className="text-[#666] text-sm">Simulator · pid.json layout</span>
        </div>
        <div className="flex items-center gap-3 mx-3">
          <button
            type="button"
            onClick={() => setInspectMode(!inspectMode)}
            className={
              inspectMode
                ? 'text-xs font-medium px-2.5 py-1 rounded border border-cyan-600 bg-cyan-950/80 text-cyan-100'
                : 'text-xs font-medium px-2.5 py-1 rounded border border-[#3d4249] bg-[#23272c] text-[#bbb] hover:bg-[#2a2f35] hover:text-white'
            }
            aria-pressed={inspectMode}
          >
            Inspect
          </button>
          <button
            type="button"
            onClick={toggleGarageDoors}
            className={
              garageDoorsOpen
                ? 'text-xs font-medium px-2.5 py-1 rounded border border-amber-500 bg-amber-950/80 text-amber-100 inline-flex items-center gap-1.5'
                : 'text-xs font-medium px-2.5 py-1 rounded border border-[#3d4249] bg-[#23272c] text-[#bbb] hover:bg-[#2a2f35] hover:text-white inline-flex items-center gap-1.5'
            }
            aria-pressed={garageDoorsOpen}
            title="Open or close the south-face roll-up garage doors (OHD-1 / OHD-2 / OHD-3)"
          >
            <span
              aria-hidden
              className={`inline-block w-1.5 h-1.5 rounded-full ${garageDoorsOpen ? 'bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.85)]' : 'bg-[#666]'}`}
            />
            Garage {garageDoorsOpen ? 'Open' : 'Closed'}
          </button>
          <StatusIndicator label="Compressor" active={state.compressorRunning} color="green" />
          <StatusIndicator label="Oil Heater" active={state.oilHeaterOn} color="amber" />
          <StatusIndicator label="Fault" active={state.highDischargePressureTrip || state.lowSuctionPressureTrip} color="red" />
        </div>
      </div>

      {/* Color / service legend (pid color_coding_standards_2026) */}
      <div
        className="absolute top-14 right-4 z-20 max-w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-[#2d3239] bg-[#121518]/92 px-3 py-2.5 text-[11px] text-[#c8d0d8] shadow-lg backdrop-blur-sm pointer-events-none"
        aria-hidden
      >
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] mb-1.5">Service colors</div>
        <ul className="space-y-1 leading-snug">
          <li><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1.5" style={{ background: '#0d3f7a' }} /> CHWS — chilled supply</li>
          <li><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1.5" style={{ background: '#4a8ab8' }} /> CHWR — chilled return</li>
          <li><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1.5" style={{ background: '#1d7a3a' }} /> CWS — condenser supply</li>
          <li><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1.5" style={{ background: '#7ec07a' }} /> CWR — condenser return</li>
          <li><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1.5" style={{ background: '#f2f4f7' }} /> Makeup (domestic)</li>
          <li><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1.5" style={{ background: '#d96818' }} /> Chemical feed</li>
          <li><span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1.5" style={{ background: '#8a8d92' }} /> Drain / overflow</li>
        </ul>
      </div>

      {/* Inspect mode: mesh id readout */}
      {inspectMode && (
        <div
          className="absolute bottom-4 left-4 z-30 max-w-[min(42rem,calc(100vw-2rem))] rounded-lg border border-[#2d3239] bg-[#121518]/95 px-4 py-3 shadow-xl backdrop-blur-sm pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">Inspect</div>
          <div className="mt-1 font-mono text-sm text-white break-all">
            {hoveredName ?? '—'}
          </div>
          {hoveredPath && hoveredPath !== hoveredName && (
            <div className="mt-2 text-[11px] leading-snug text-[#8aa8a0] break-all border-t border-[#2a2f34] pt-2">
              {hoveredPath}
            </div>
          )}
          {hoveredDetail && (
            <div className="mt-3 border-t border-[#2a2f34] pt-2 pointer-events-auto max-h-[42vh] overflow-y-auto overscroll-contain">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-[#5a6578] mb-1.5">
                Surface / triangle
              </div>
              <pre className="font-mono text-[10px] leading-relaxed text-[#b8c5c0] whitespace-pre-wrap wrap-break-word select-text">
                {hoveredDetail}
              </pre>
            </div>
          )}
          {copyFeedback && (
            <div className="mt-2 rounded border border-cyan-900/60 bg-cyan-950/40 px-2 py-1.5 font-mono text-[11px] text-cyan-100/95">
              {copyFeedback}
            </div>
          )}
          <div className="mt-2 text-[10px] text-[#555]">
            Hover for live readout. <span className="text-[#7a8a88]">Click the 3D view</span> on a mesh to copy mesh + surface details to the clipboard.
          </div>
        </div>
      )}

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
