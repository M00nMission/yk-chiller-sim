import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSimulationStore } from '../../store/useSimulationStore';

export function CxAlloyPanel({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<'realTime' | 'history'>('realTime');
  const { state, setCompressorRunning, setOilHeaterOn } = useSimulationStore();

  // York brand red
  const YORK_RED = '#cc2222';

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#1a1a2e',
      fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif",
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── HEADER BAR ── */}
      <div style={{
        height: 56,
        background: '#16213e',
        borderBottom: '1px solid #2a2a4a',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
      }}>
        {/* York Logo */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: YORK_RED,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: 0.5,
          flexShrink: 0,
          boxShadow: '0 0 12px rgba(204,34,34,0.4)',
        }}>
          YORK
        </div>

        {/* Title */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>YORK Chiller System</div>
          <div style={{ fontSize: 10, color: '#5a6a8a' }}>CENTRIFUGAL LIQUID CHILLER</div>
        </div>

        {/* Unit selectors */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 20 }}>
          {['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4'].map((unit, i) => (
            <div key={unit} style={{
              padding: '4px 12px',
              background: i === 0 ? '#1e3a5f' : '#0f0f1a',
              border: `1px solid ${i === 0 ? '#3b82f6' : '#2a2a4a'}`,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: 10, color: '#8a9aba' }}>{unit}</span>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: i === 0 ? '#00ff88' : '#ff3333',
                boxShadow: i === 0 ? '0 0 6px #00ff88' : 'none',
              }} />
            </div>
          ))}
        </div>

        {/* Date / Time */}
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#7a8aaa', fontFamily: 'monospace' }}>
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
          {'  '}
          {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              marginLeft: 16,
              background: '#cc2222',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT PANEL - System Values ── */}
        <div style={{
          width: 280,
          background: '#12162a',
          borderRight: '1px solid #2a2a4a',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: '12px 0',
        }}>
          {[
            { label: 'LINE 1 MAX', value: `${(state.suctionTemp + 15).toFixed(1)}`, unit: '°C', color: '#00d4ff' },
            { label: 'LINE 2 MAX', value: `${(state.dischargeTemp - 20).toFixed(1)}`, unit: '°C', color: '#00d4ff' },
            { label: 'SUCTION', value: `${state.suctionPressure.toFixed(1)}`, unit: 'Bar', color: '#00d4ff' },
            { label: 'DISCHARGE', value: `${state.dischargePressure.toFixed(1)}`, unit: 'Bar', color: '#ff6b35' },
            { label: 'OIL SEP TEMP', value: `${state.oilTemp.toFixed(1)}`, unit: '°C', color: '#00d4ff' },
            { label: 'VAPORIZER TEMP', value: `${(state.suctionTemp + 5).toFixed(1)}`, unit: '°C', color: '#00d4ff' },
            { label: 'COOLER TERTIARY', value: `${(state.leavingChilledWaterTemp - 2).toFixed(1)}`, unit: '°C', color: '#00d4ff' },
            { label: 'LIQUID LINE TEMP', value: `${(state.leavingCondenserWaterTemp - 15).toFixed(1)}`, unit: '°C', color: '#00d4ff' },
            { label: 'SUB-COOLING', value: `${state.subcooling.toFixed(1)}`, unit: '°C', color: '#00ff88' },
            { label: 'SUPERHEAT', value: `${state.superheat.toFixed(1)}`, unit: '°C', color: '#00ff88' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} style={{
              padding: '8px 16px',
              borderBottom: '1px solid #1a1a2e',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 10, color: '#6a7a9a', fontWeight: 500 }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</span>
                <span style={{ fontSize: 9, color: '#4a5a7a' }}>{unit}</span>
              </div>
            </div>
          ))}

          {/* Capacity bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a1a2e' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#6a7a9a' }}>CAPACITY</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#00d4ff', fontFamily: 'monospace' }}>{state.capacity.toFixed(0)}%</span>
            </div>
            <div style={{ height: 8, background: '#0f0f1a', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${state.capacity}%`,
                height: '100%',
                background: state.capacity > 85 ? '#ff6b35' : '#00d4ff',
                borderRadius: 4,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        </div>

        {/* ── CENTER PANEL - Schematic + Tabs ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{
            height: 44,
            background: '#0f0f1a',
            borderBottom: '1px solid #2a2a4a',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 4,
          }}>
            <button
              onClick={() => setTab('realTime')}
              style={{
                padding: '6px 20px',
                background: tab === 'realTime' ? '#00d4ff' : 'transparent',
                color: tab === 'realTime' ? '#0f0f1a' : '#5a6a8a',
                border: 'none',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              REAL TIME
            </button>
            <button
              onClick={() => setTab('history')}
              style={{
                padding: '6px 20px',
                background: tab === 'history' ? '#00d4ff' : 'transparent',
                color: tab === 'history' ? '#0f0f1a' : '#5a6a8a',
                border: 'none',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: 0.5,
              }}
            >
              HISTORY
            </button>
          </div>

          {/* Schematic diagram */}
          {tab === 'realTime' && (
            <div style={{ flex: 1, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a' }}>
              <svg width="100%" height="100%" viewBox="0 0 600 340" style={{ maxWidth: 600, maxHeight: 340 }}>
                {/* Background */}
                <rect width="600" height="340" fill="#0f0f1a" rx="8" />

                {/* Condenser (right) */}
                <rect x="420" y="60" width="120" height="160" fill="#0a1a2e" stroke="#2a4a6a" strokeWidth="2" rx="4" />
                <text x="480" y="50" fill="#4a6a8a" fontSize="10" textAnchor="middle" fontWeight="600">CONDENSER</text>
                <text x="480" y="230" fill="#00d4ff" fontSize="9" textAnchor="middle" fontFamily="monospace">{state.leavingCondenserWaterTemp.toFixed(1)}°C OUT</text>
                <text x="480" y="245" fill="#4a6a8a" fontSize="9" textAnchor="middle">Water In/Out</text>

                {/* Cooler / Evaporator (left) */}
                <rect x="60" y="60" width="120" height="160" fill="#0a1a2e" stroke="#2a4a6a" strokeWidth="2" rx="4" />
                <text x="120" y="50" fill="#4a6a8a" fontSize="10" textAnchor="middle" fontWeight="600">COOLER</text>
                <text x="120" y="230" fill="#00d4ff" fontSize="9" textAnchor="middle" fontFamily="monospace">{state.leavingChilledWaterTemp.toFixed(1)}°C OUT</text>
                <text x="120" y="245" fill="#4a6a8a" fontSize="9" textAnchor="middle">Water In/Out</text>

                {/* Compressor (center) */}
                <rect x="230" y="80" width="140" height="120" fill="#0a1a2e" stroke="#2a4a6a" strokeWidth="2" rx="6" />
                <text x="300" y="100" fill="#4a6a8a" fontSize="10" textAnchor="middle" fontWeight="600">COMPRESSOR</text>
                <circle cx="300" cy="140" r="30" fill="none" stroke="#3a5a7a" strokeWidth="2" />
                <circle cx="300" cy="140" r="18" fill="none" stroke="#2a4a6a" strokeWidth="1.5" />
                <line x1="285" y1="140" x2="315" y2="140" stroke="#00d4ff" strokeWidth="2" />
                <line x1="300" y1="125" x2="300" y2="155" stroke="#00d4ff" strokeWidth="2" />
                <text x="300" y="175" fill="#00d4ff" fontSize="9" textAnchor="middle" fontFamily="monospace">{state.capacity.toFixed(0)}% LOAD</text>
                <text x="300" y="188" fill={state.compressorRunning ? '#00ff88' : '#ff3333'} fontSize="9" textAnchor="middle" fontWeight={600}>
                  {state.compressorRunning ? 'RUNNING' : 'OFF'}
                </text>

                {/* Oil Separator */}
                <rect x="240" y="220" width="60" height="50" fill="#0a1a2e" stroke="#2a4a6a" strokeWidth="1.5" rx="3" />
                <text x="270" y="240" fill="#4a6a8a" fontSize="8" textAnchor="middle">OIL SEP</text>
                <text x="270" y="258" fill="#00d4ff" fontSize="8" textAnchor="middle" fontFamily="monospace">{state.oilTemp.toFixed(0)}°</text>

                {/* Pipes - Discharge (hot gas) */}
                <line x1="370" y1="130" x2="420" y2="130" stroke="#ff6b35" strokeWidth="4" />
                <line x1="420" y1="130" x2="420" y2="100" stroke="#ff6b35" strokeWidth="4" />
                <text x="395" y="122" fill="#ff6b35" fontSize="8" fontFamily="monospace">{state.dischargePressure.toFixed(1)} Bar</text>

                {/* Pipes - Suction */}
                <line x1="180" y1="130" x2="230" y2="130" stroke="#00d4ff" strokeWidth="4" />
                <text x="195" y="122" fill="#00d4ff" fontSize="8" fontFamily="monospace">{state.suctionPressure.toFixed(1)} Bar</text>

                {/* Pipes - Liquid line (bottom) */}
                <line x1="420" y1="220" x2="420" y2="280" stroke="#00d4ff" strokeWidth="3" />
                <line x1="420" y1="280" x2="180" y2="280" stroke="#00d4ff" strokeWidth="3" />
                <line x1="180" y1="280" x2="180" y2="220" stroke="#00d4ff" strokeWidth="3" />

                {/* Expansion device */}
                <rect x="185" y="272" width="30" height="16" fill="#1a2a3e" stroke="#00d4ff" strokeWidth="1.5" rx="2" />
                <text x="200" y="280" fill="#4a6a8a" fontSize="7" textAnchor="middle">EXP</text>

                {/* Arrows - flow direction */}
                <polygon points="450,115 460,125 450,125" fill="#ff6b35" />
                <polygon points="200,125 190,135 200,135" fill="#00d4ff" />
                <polygon points="415,275 405,265 405,275" fill="#00d4ff" />
                <polygon points="185,265 175,275 185,275" fill="#00d4ff" />

                {/* Water in/out labels */}
                <text x="60" y="75" fill="#4a6a8a" fontSize="8">Water In</text>
                <text x="60" y="220" fill="#4a6a8a" fontSize="8">Water Out</text>
                <text x="500" y="75" fill="#4a6a8a" fontSize="8">Water In</text>
                <text x="500" y="220" fill="#4a6a8a" fontSize="8">Water Out</text>

                {/* Status indicators */}
                <rect x="10" y="10" width="8" height="8" rx="2" fill={state.compressorRunning ? '#00ff88' : '#ff3333'} />
                <text x="22" y="17" fill="#6a7a9a" fontSize="8">COMP</text>
                <rect x="10" y="24" width="8" height="8" rx="2" fill={state.oilHeaterOn ? '#ff6b35' : '#333'} />
                <text x="22" y="31" fill="#6a7a9a" fontSize="8">HEATER</text>
              </svg>
            </div>
          )}

          {tab === 'history' && (
            <div style={{ flex: 1, background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#4a5a7a', fontSize: 13 }}>History data — select a date range to view trends</span>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL - Operating Data ── */}
        <div style={{
          width: 260,
          background: '#12162a',
          borderLeft: '1px solid #2a2a4a',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          padding: '12px 0',
        }}>
          <div style={{ padding: '8px 16px', fontSize: 10, color: '#5a6a8a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #1a1a2e' }}>
            Operating Data
          </div>

          {[
            { label: 'RETURN WATER TEMP', value: `${(state.leavingChilledWaterTemp + 5).toFixed(1)}`, unit: '°C' },
            { label: 'SUPPLY WATER TEMP', value: `${state.leavingChilledWaterTemp.toFixed(1)}`, unit: '°C' },
            { label: 'CURRENT', value: `${(state.capacity * 2.4).toFixed(1)}`, unit: 'A' },
            { label: 'VOLTAGE', value: `${(380 + Math.random() * 2).toFixed(1)}`, unit: 'V' },
          ].map(({ label, value, unit }) => (
            <div key={label} style={{ padding: '8px 16px', borderBottom: '1px solid #1a1a2e' }}>
              <div style={{ fontSize: 9, color: '#5a6a8a', marginBottom: 4 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#00d4ff', fontFamily: 'monospace' }}>{value}</span>
                <span style={{ fontSize: 10, color: '#4a5a7a' }}>{unit}</span>
              </div>
            </div>
          ))}

          {/* Pumps */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #1a1a2e' }}>
            <div style={{ fontSize: 9, color: '#5a6a8a', marginBottom: 8 }}>PUMP STATUS</div>
            {[
              { label: 'PUMP 1', active: true },
              { label: 'PUMP 2', active: false },
            ].map(({ label, active }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#8a9aba' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: active ? '#00ff88' : '#ff3333',
                    boxShadow: active ? '0 0 6px #00ff88' : 'none',
                  }} />
                  <span style={{ fontSize: 10, color: active ? '#00ff88' : '#ff3333', fontWeight: 600 }}>{active ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Control toggles */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #1a1a2e' }}>
            <div style={{ fontSize: 9, color: '#5a6a8a', marginBottom: 8 }}>CONTROLS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                onClick={() => setOilHeaterOn(!state.oilHeaterOn)}
                style={{
                  padding: '8px 12px',
                  background: state.oilHeaterOn ? '#1a3a1a' : '#1a1a2a',
                  border: `1px solid ${state.oilHeaterOn ? '#00ff88' : '#2a2a4a'}`,
                  borderRadius: 6,
                  color: state.oilHeaterOn ? '#00ff88' : '#5a6a8a',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>OIL HEATER</span>
                <span style={{ fontFamily: 'monospace' }}>{state.oilHeaterOn ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={() => setCompressorRunning(!state.compressorRunning)}
                disabled={!state.oilHeaterOn}
                style={{
                  padding: '8px 12px',
                  background: state.compressorRunning ? '#1a3a1a' : '#1a1a2a',
                  border: `1px solid ${state.compressorRunning ? '#00ff88' : '#2a2a4a'}`,
                  borderRadius: 6,
                  color: !state.oilHeaterOn ? '#333' : state.compressorRunning ? '#00ff88' : '#5a6a8a',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: !state.oilHeaterOn ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>COMPRESSOR</span>
                <span style={{ fontFamily: 'monospace' }}>{state.compressorRunning ? 'RUN' : 'STOP'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER STATUS BAR ── */}
      <div style={{
        height: 40,
        background: '#0f0f1a',
        borderTop: '1px solid #2a2a4a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
            <span style={{ fontSize: 10, color: '#5a6a8a' }}>COMMUNICATION OK</span>
          </div>
          <span style={{ fontSize: 10, color: '#3a4a6a' }}>|</span>
          <span style={{ fontSize: 10, color: '#5a6a8a' }}>Unit 1: <span style={{ color: '#00ff88' }}>RUNNING</span></span>
          <span style={{ fontSize: 10, color: '#3a4a6a' }}>|</span>
          <span style={{ fontSize: 10, color: '#5a6a8a' }}>Units 2-4: <span style={{ color: '#ff3333' }}>OFF</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: state.compressorRunning ? '#00ff88' : '#ff3333' }} />
          <span style={{ fontSize: 10, color: '#5a6a8a' }}>System: {state.compressorRunning ? 'RUNNING' : 'IDLE'}</span>
          <span style={{ fontSize: 10, color: '#3a4a6a' }}>|</span>
          <span style={{ fontSize: 10, color: '#3a4a6a' }}>R-134a | 500 TR | YK-CENT-001</span>
        </div>
      </div>
    </div>
  );
}

// Realistic iPad widget showing actual CxAlloy app screenshot
export function CxAlloyWidget({ onOpen }: { onOpen: () => void }) {
  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 168,
        height: 240,
        background: 'linear-gradient(160deg, #2c2c2e 0%, #1a1a1c 40%, #0a0a0c 100%)',
        border: '1px solid #3a3a3e',
        borderRadius: 24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.85), 0 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 0,
        cursor: 'pointer',
        zIndex: 50,
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Top notch / camera area */}
      <div style={{
        width: '100%',
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 6,
        flexShrink: 0,
      }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#0d0d0d',
          border: '1px solid #2a2a2e',
          boxShadow: 'inset 0 0 3px rgba(0,0,0,1)',
        }} />
      </div>

      {/* iPad screen - actual CxAlloy screenshot */}
      <div style={{
        width: 148,
        height: 198,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)',
        position: 'relative',
        background: '#000',
        flexShrink: 0,
      }}>
        <img
          src="/cxalloy2.png"
          alt="CxAlloy App"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
            display: 'block',
          }}
        />
      </div>

      {/* Home indicator */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
      }}>
        <div style={{
          width: 64,
          height: 5,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 2.5,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </div>

      {/* Subtle app name */}
      <div style={{
        position: 'absolute',
        bottom: 5,
        fontSize: 7.5,
        color: 'rgba(255,255,255,0.25)',
        fontFamily: 'SF Pro Display, system-ui, -apple-system, sans-serif',
        fontWeight: 400,
        letterSpacing: 0.3,
      }}>
        CxAlloy
      </div>
    </motion.button>
  );
}