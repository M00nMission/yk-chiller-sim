import { useSimulationStore } from '../../store/useSimulationStore';

// York YK HMI Screen - modeled after actual chiller operator interface
export function YK_HMI_Screen() {
  const { state } = useSimulationStore();

  // Determine status based on simulation values
  const getModeDisplay = () => {
    if (state.highDischargePressureTrip || state.lowSuctionPressureTrip) return 'TRIP';
    if (state.compressorRunning) return 'RUN';
    return 'OFF';
  };

  const getStatusColor = () => {
    if (state.highDischargePressureTrip || state.lowSuctionPressureTrip) return '#ff3b3b';
    if (state.compressorRunning) return '#3bff6f';
    return '#ffb84d';
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0a0a',
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      color: '#33ff66',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── TOP HEADER BAR ── */}
      <div style={{
        height: 32,
        background: '#111',
        borderBottom: '2px solid #1a3a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#33ff66', letterSpacing: 4 }}>YORK</span>
          <span style={{ fontSize: 10, color: '#1a6a1a' }}>CENTRIFUGAL LIQUID CHILLER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 10, color: '#33ff66' }}>STATUS: <span style={{ color: getStatusColor() }}>{getModeDisplay()}</span></span>
          <span style={{ fontSize: 10, color: '#33ff66' }}>LIMITS: <span style={{ color: '#ffb84d' }}>NORMAL</span></span>
          <span style={{ fontSize: 10, color: '#33ff66' }}>
            {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
            {' '}
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT PANEL: Refrigerant Cycle Diagram ── */}
        <div style={{ flex: '0 0 50%', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Title */}
          <div style={{ fontSize: 10, color: '#1a6a1a', letterSpacing: 2, borderBottom: '1px solid #1a3a1a', paddingBottom: 4 }}>
            REFRIGERANT CYCLE — R-134a
          </div>

          {/* Cycle diagram (stylized) */}
          <div style={{
            flex: 1,
            background: '#050a05',
            border: '1px solid #1a3a1a',
            borderRadius: 4,
            position: 'relative',
            padding: 12,
          }}>
            {/* SVG-style cycle diagram */}
            <svg width="100%" height="100%" viewBox="0 0 400 280" style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Axis labels */}
              <text x="5" y="20" fill="#1a6a1a" fontSize="8">PRESS (PSIG)</text>
              <text x="350" y="260" fill="#1a6a1a" fontSize="8">TEMP (°F)</text>

              {/* Horizontal grid lines */}
              {[0,1,2,3,4].map(i => (
                <line key={i} x1="40" y1={40 + i*50} x2="360" y2={40 + i*50} stroke="#0d1f0d" strokeWidth="1" />
              ))}

              {/* Pressure scale labels */}
              {([['-10', 240], ['0', 190], ['20', 140], ['45', 90], ['70', 40]] as [string, number][]).map(([label, y]) => (
                <text key={label} x="30" y={y + 4} fill="#1a6a1a" fontSize="7" textAnchor="end">{label}</text>
              ))}

              {/* Temperature scale labels */}
              {([['30', 250], ['50', 200], ['70', 150], ['90', 100], ['110', 50], ['130', 10]] as [string, number][]).map(([label, y]) => (
                <text key={label} x="370" y={y + 4} fill="#1a6a1a" fontSize="7">{label}</text>
              ))}

              {/* Evaporation pressure line (horizontal) */}
              <line x1="50" y1={190 - (state.suctionPressure - 50) * 3} x2="350" y2={190 - (state.suctionPressure - 50) * 3}
                stroke="#ffb84d" strokeWidth="1.5" strokeDasharray="4,2" />

              {/* Condensation pressure line */}
              <line x1="50" y1={140 - (state.dischargePressure - 100) * 2} x2="350" y2={140 - (state.dischargePressure - 100) * 2}
                stroke="#ffb84d" strokeWidth="1.5" strokeDasharray="4,2" />

              {/* Saturation envelope - simplified trapezoid */}
              {/* Evaporation zone */}
              <polygon
                points={`80,${190 - (state.suctionPressure - 50) * 3}
                         80,${180 - (state.suctionPressure - 50) * 3}
                         200,${140 - (state.dischargePressure - 100) * 2}
                         200,${150 - (state.dischargePressure - 100) * 2}`}
                fill="none"
                stroke="#3b8a3b"
                strokeWidth="2"
              />

              {/* Compression line */}
              <line x1="80" y1={185 - (state.suctionPressure - 50) * 3}
                    x2="200" y2={145 - (state.dischargePressure - 100) * 2}
                    stroke="#33ff66" strokeWidth="2.5" />

              {/* Discharge line */}
              <line x1="200" y1={145 - (state.dischargePressure - 100) * 2}
                    x2="320" y2={145 - (state.dischargePressure - 100) * 2}
                    stroke="#33ff66" strokeWidth="2" />

              {/* Condensation line */}
              <line x1="320" y1={145 - (state.dischargePressure - 100) * 2}
                    x2="320" y2={40}
                    stroke="#3b8a3b" strokeWidth="2" />

              {/* Expansion line */}
              <line x1="320" y1={40}
                    x2="80" y2={180 - (state.suctionPressure - 50) * 3}
                    stroke="#3b8a3b" strokeWidth="2" />

              {/* Suction line */}
              <line x1="80" y1={180 - (state.suctionPressure - 50) * 3}
                    x2="80" y2={185 - (state.suctionPressure - 50) * 3}
                    stroke="#33ff66" strokeWidth="2" />

              {/* Labels */}
              <text x="85" y={175 - (state.suctionPressure - 50) * 3} fill="#33ff66" fontSize="8" fontWeight="bold">SUCT</text>
              <text x="205" y={140 - (state.dischargePressure - 100) * 2} fill="#ff3b3b" fontSize="8" fontWeight="bold">DISC</text>
              <text x="325" y={30} fill="#3b8a3b" fontSize="8">COND</text>
            </svg>

            {/* Numeric readouts overlaid on diagram */}
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              fontSize: 9,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              <span style={{ color: '#33ff66' }}>SUCT: <span style={{ color: '#ffb84d' }}>{state.suctionPressure.toFixed(1)} PSIG</span></span>
              <span style={{ color: '#33ff66' }}>DISC: <span style={{ color: '#ffb84d' }}>{state.dischargePressure.toFixed(1)} PSIG</span></span>
              <span style={{ color: '#33ff66' }}>SH: <span style={{ color: '#ffb84d' }}>{state.superheat.toFixed(1)}°F</span></span>
              <span style={{ color: '#33ff66' }}>SC: <span style={{ color: '#ffb84d' }}>{state.subcooling.toFixed(1)}°F</span></span>
            </div>
          </div>

          {/* Bottom row of key readings */}
          <div style={{ display: 'flex', gap: 8, height: 90 }}>
            {/* Capacity bar */}
            <div style={{ flex: 1, background: '#050a05', border: '1px solid #1a3a1a', borderRadius: 4, padding: 8 }}>
              <div style={{ fontSize: 8, color: '#1a6a1a', marginBottom: 4 }}>CAPACITY</div>
              <div style={{ fontSize: 20, color: '#33ff66', fontWeight: 700 }}>{state.capacity.toFixed(0)} <span style={{ fontSize: 10, color: '#1a6a1a' }}>TR</span></div>
              <div style={{ height: 6, background: '#0d1f0d', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, state.capacity)}%`,
                  height: '100%',
                  background: state.capacity > 90 ? '#ff3b3b' : state.capacity > 70 ? '#ffb84d' : '#33ff66',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>

            {/* Oil temp */}
            <div style={{ flex: 1, background: '#050a05', border: '1px solid #1a3a1a', borderRadius: 4, padding: 8 }}>
              <div style={{ fontSize: 8, color: '#1a6a1a', marginBottom: 4 }}>OIL TEMP</div>
              <div style={{ fontSize: 20, color: state.oilTemp > 130 ? '#ff3b3b' : '#33ff66', fontWeight: 700 }}>
                {state.oilTemp.toFixed(1)} <span style={{ fontSize: 10, color: '#1a6a1a' }}>°F</span>
              </div>
              <div style={{ fontSize: 8, color: '#1a6a1a', marginTop: 4 }}>RANGE: 100-160°F</div>
            </div>

            {/* Oil pressure */}
            <div style={{ flex: 1, background: '#050a05', border: '1px solid #1a3a1a', borderRadius: 4, padding: 8 }}>
              <div style={{ fontSize: 8, color: '#1a6a1a', marginBottom: 4 }}>OIL PRESS</div>
              <div style={{ fontSize: 20, color: '#33ff66', fontWeight: 700 }}>
                {state.oilPressure.toFixed(1)} <span style={{ fontSize: 10, color: '#1a6a1a' }}>PSIG</span>
              </div>
              <div style={{ fontSize: 8, color: '#1a6a1a', marginTop: 4 }}>DELTA: {(state.oilPressure - state.suctionPressure).toFixed(1)} PSI</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Water temperatures row */}
          <div style={{ display: 'flex', height: 80, borderBottom: '1px solid #1a3a1a' }}>
            <div style={{ flex: 1, padding: 10, borderRight: '1px solid #1a3a1a', background: '#050a05' }}>
              <div style={{ fontSize: 8, color: '#1a6a1a', marginBottom: 4 }}>CHILLED WATER OUT</div>
              <div style={{ fontSize: 22, color: '#33ff66', fontWeight: 700 }}>
                {state.leavingChilledWaterTemp.toFixed(1)} <span style={{ fontSize: 10, color: '#1a6a1a' }}>°F</span>
              </div>
              <div style={{ fontSize: 8, color: '#1a6a1a', marginTop: 2 }}>SETPOINT: 44.0°F | ENTERING: {(state.leavingChilledWaterTemp + 10).toFixed(1)}°F</div>
            </div>
            <div style={{ flex: 1, padding: 10, background: '#050a05' }}>
              <div style={{ fontSize: 8, color: '#1a6a1a', marginBottom: 4 }}>CONDENSER WATER OUT</div>
              <div style={{ fontSize: 22, color: '#33ff66', fontWeight: 700 }}>
                {state.leavingCondenserWaterTemp.toFixed(1)} <span style={{ fontSize: 10, color: '#1a6a1a' }}>°F</span>
              </div>
              <div style={{ fontSize: 8, color: '#1a6a1a', marginTop: 2 }}>RANGE: 85-95°F | ENTERING: {(state.leavingCondenserWaterTemp - 10).toFixed(1)}°F</div>
            </div>
          </div>

          {/* Main data table */}
          <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a3a1a' }}>
                  {['PARAMETER', 'VALUE', 'UNIT', 'LIMITS'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#1a6a1a', fontWeight: 400, fontSize: 9 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Suction Pressure', state.suctionPressure.toFixed(2), 'psig', '45-75'],
                  ['Discharge Pressure', state.dischargePressure.toFixed(2), 'psig', '80-220'],
                  ['Suction Temperature', state.suctionTemp.toFixed(1), '°F', '35-55'],
                  ['Discharge Temperature', state.dischargeTemp.toFixed(1), '°F', '140-220'],
                  ['Oil Pressure', state.oilPressure.toFixed(1), 'psig', '60-90'],
                  ['Oil Temperature', state.oilTemp.toFixed(1), '°F', '100-160'],
                  ['Superheat', state.superheat.toFixed(1), '°F', '8-25'],
                  ['Subcooling', state.subcooling.toFixed(1), '°F', '5-20'],
                  ['Entering Chilled Water', (state.leavingChilledWaterTemp + 10).toFixed(1), '°F', '42-54'],
                  ['Entering Condenser Water', (state.leavingCondenserWaterTemp - 10).toFixed(1), '°F', '75-95'],
                ].map(([label, value, unit, limits], i) => (
                  <tr key={label} style={{ borderBottom: '1px solid #0d1f0d', background: i % 2 === 0 ? 'transparent' : '#050a05' }}>
                    <td style={{ padding: '6px 8px', color: '#1a6a1a' }}>{label}</td>
                    <td style={{ padding: '6px 8px', color: '#33ff66', fontWeight: 600 }}>{value}</td>
                    <td style={{ padding: '6px 8px', color: '#1a6a1a' }}>{unit}</td>
                    <td style={{ padding: '6px 8px', color: '#666' }}>{limits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Alphanumeric display panel */}
          <div style={{
            height: 60,
            background: '#001100',
            borderTop: '2px solid #1a3a1a',
            padding: '8px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <div style={{ fontSize: 8, color: '#1a6a1a', marginBottom: 4 }}>MESSAGE / ALARM</div>
            <div style={{ fontSize: 13, color: state.highDischargePressureTrip || state.lowSuctionPressureTrip ? '#ff3b3b' : '#33ff66', fontWeight: 600 }}>
              {state.highDischargePressureTrip
                ? 'HIGH DISCHARGE PRESSURE - TRIP'
                : state.lowSuctionPressureTrip
                ? 'LOW SUCTION PRESSURE - TRIP'
                : state.compressorRunning
                ? 'SYSTEM RUNNING — NORMAL OPERATION'
                : state.oilHeaterOn
                ? 'OIL HEATER ON — WAIT FOR TEMP'
                : 'SYSTEM OFF — PRESS START'}
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <div style={{
        height: 28,
        background: '#111',
        borderTop: '2px solid #1a3a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 10, color: '#1a6a1a' }}>MODE:</span>
          <span style={{ fontSize: 10, color: '#33ff66', fontWeight: 700 }}>AUTO</span>
          <span style={{ fontSize: 10, color: '#1a6a1a' }}>|</span>
          <span style={{ fontSize: 10, color: '#1a6a1a' }}>SOURCE:</span>
          <span style={{ fontSize: 10, color: '#ffb84d' }}>REMOTE</span>
          <span style={{ fontSize: 10, color: '#1a6a1a' }}>|</span>
          <span style={{ fontSize: 10, color: '#1a6a1a' }}>PROGRAM:</span>
          <span style={{ fontSize: 10, color: '#33ff66' }}>STARTUP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {([
            ['COMPR' as const, state.compressorRunning],
            ['OIL HTR' as const, state.oilHeaterOn],
            ['EVAP PUMP' as const, true],
            ['COND PUMP' as const, true],
          ] as [string, boolean][]).map(([label, active]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: active ? '#3bff6f' : '#1a3a1a',
                boxShadow: active ? '0 0 6px #3bff6f' : 'none',
              }} />
              <span style={{ fontSize: 9, color: '#1a6a1a' }}>{label}</span>
            </div>
          ))}
          <span style={{ fontSize: 9, color: '#1a6a1a' }}>∎ OPTIONS</span>
          <span style={{ fontSize: 9, color: '#1a6a1a' }}>∎ ALARMS</span>
          <span style={{ fontSize: 9, color: '#1a6a1a' }}>∎ DATA</span>
          <span style={{ fontSize: 9, color: '#1a6a1a' }}>∎ GRAPHICS</span>
          <span style={{ fontSize: 9, color: '#1a6a1a' }}>∎ HISTORY</span>
        </div>
      </div>
    </div>
  );
}