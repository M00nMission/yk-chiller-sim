/* ABB ACH580 Variable Frequency Drive — Control Panel Simulation
   Faithfully replicates the ACH580's OLED/LCD display and physical
   keypad. Interactive: Start / Stop / Loc-Rem / D-pad navigation,
   with live-animated motor parameters. */

import { useState, useEffect, useCallback, useRef } from 'react';

/* ── Types ─────────────────────────────────────────────────────────── */
export type DriveState = 'stopped' | 'running' | 'faulted';
export type ControlLocation = 'Local' | 'Remote' | 'Fieldbus';

interface Param {
  name: string;
  unit: string;
  value: number;
  min: number;
  max: number;
}

/* ── Constants ──────────────────────────────────────────────────────── */
const BASE_PARAMS: Param[] = [
  { name: 'Motor speed',   unit: 'Rpm',   value: 1400.0, min: 0,   max: 1500 },
  { name: 'Motor current', unit: 'A',     value: 28.8,   min: 0,   max: 60   },
  { name: 'Flow rate',     unit: 'm³/s',  value: 10.9,   min: 0,   max: 20   },
  { name: 'Output power',  unit: 'kW',    value: 18.4,   min: 0,   max: 45   },
  { name: 'DC bus volt',   unit: 'V',     value: 540.0,  min: 400, max: 700  },
  { name: 'Drive temp',    unit: '°C',    value: 42.0,   min: 0,   max: 100  },
  { name: 'Energy kWh',    unit: 'kWh',   value: 2841.0, min: 0,   max: 9999 },
];

const VISIBLE_ROWS = 3;

/* ── Colour palette — matches ACH580 hardware ───────────────────────── */
const C = {
  /* Device body */
  body:        '#e5e2d8',
  bodyDark:    '#c8c4b9',
  bodyAccent:  '#b7b4aa',
  bodyLine:    '#a09c91',
  blackFace:   '#171819',
  blackEdge:   '#0a0b0c',
  /* Display */
  dispBg:      '#f5f6f1',
  dispText:    '#050505',
  dispBorder:  '#050505',
  dispBezel:   '#1d1f20',
  /* Buttons */
  navBtn:      '#ddd9ce',
  navBtnBdr:   '#aaa69b',
  navBtnText:  '#303234',
  stopBtn:     '#b54949',
  startBtn:    '#42724f',
  locRemBtn:   '#e4e0d5',
  softKey:     '#18191a',
  /* LED */
  ledOn:       '#2abd61',
  ledOff:      '#5da375',
  /* Panel */
  panelBg:     'transparent',
  panelBdr:    '#111',
} as const;

/* ── Utility ────────────────────────────────────────────────────────── */
function fmt(v: number, unit: string): string {
  if (unit === 'Rpm') return v.toFixed(1);
  if (unit === 'kWh') return v.toFixed(0);
  if (unit === 'V') return v.toFixed(0);
  return v.toFixed(1);
}

function clock(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/* ── Subcomponents ──────────────────────────────────────────────────── */

function BluetoothIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity={0.75}>
      <path d="M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z"/>
    </svg>
  );
}

function UsbIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill={C.navBtnText} opacity={0.78}>
      <path d="M15 7v4h1v2h-3V5h2l-3-4-3 4h2v8H8v-2.07c.7-.37 1.2-1.08 1.2-1.93 0-1.21-.99-2.2-2.2-2.2S4.8 7.79 4.8 9c0 .85.5 1.56 1.2 1.93V13c0 1.11.89 2 2 2h3v3.05c-.71.37-1.2 1.1-1.2 1.95 0 1.22.98 2.2 2.2 2.2s2.2-.98 2.2-2.2c0-.85-.49-1.58-1.2-1.95V15h3c1.11 0 2-.89 2-2v-2h1V7h-4z"/>
    </svg>
  );
}

interface DisplayProps {
  params:    Param[];
  topRow:    number;
  selected:  number;
  state:     DriveState;
  control:   ControlLocation;
  setpoint:  number;
}

function Display({ params, topRow, selected, state, control, setpoint }: DisplayProps) {
  const [time, setTime] = useState(clock);
  useEffect(() => {
    const id = setInterval(() => setTime(clock()), 10_000);
    return () => clearInterval(id);
  }, []);

  const displayedParams = params.slice(topRow, topRow + VISIBLE_ROWS);

  const rotIcon = state === 'running' ? '↻' : '○';

  return (
    <div style={{
      background: C.dispBg,
      border: `3px solid ${C.dispBorder}`,
      borderRadius: 2,
      padding: 0,
      fontFamily: '"Arial Narrow", "Roboto Condensed", "Helvetica Neue Condensed", Arial, sans-serif',
      color: C.dispText,
      userSelect: 'none',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: `0 0 0 5px ${C.dispBezel}, 0 0 0 8px #0b0c0d, inset 0 0 8px rgba(0,0,0,0.07)`,
      containerType: 'inline-size',
      textRendering: 'geometricPrecision',
    }}>
      {/* Status row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        fontSize: 'clamp(15px, 5.15cqw, 22px)',
        lineHeight: 1,
        borderBottom: `2px solid ${C.dispText}`,
        padding: '3px 6px 4px',
        fontWeight: 800,
        letterSpacing: '-0.045em',
      }}>
        <span style={{ fontWeight: 'bold' }}>{control}</span>
        <span style={{ fontSize: '1.15em', transform: state === 'running' ? 'rotate(-20deg)' : undefined }}>{rotIcon}</span>
        <span style={{
          fontWeight: 'bold',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.015em',
        }}>
          {setpoint.toFixed(1)} Rpm
        </span>
      </div>

      {/* Parameter rows */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateRows: 'repeat(3, 1fr)',
        gap: 3,
        padding: '3px 21px 4px',
        minHeight: 0,
      }}>
        {displayedParams.map((p, i) => {
          const absIdx = topRow + i;
          const isSel  = absIdx === selected;
          return (
            <div key={p.name} style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(128px, 1fr) auto',
              alignItems: 'center',
              border: `2px solid ${C.dispText}`,
              borderRadius: 4,
              padding: '2px 9px 4px',
              background: isSel ? '#fafbf7' : 'transparent',
              position: 'relative',
              minHeight: 0,
              overflow: 'visible',
            }}>
              {isSel && (
                <>
                  <span style={{ position: 'absolute', left: -22, top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(20px, 7cqw, 31px)', lineHeight: 1 }}>◀</span>
                  <span style={{ position: 'absolute', right: -22, top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(20px, 7cqw, 31px)', lineHeight: 1 }}>▶</span>
                </>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 0.94, minWidth: 0, alignSelf: 'stretch' }}>
                <span style={{ fontWeight: 500, fontSize: 'clamp(16px, 5.35cqw, 24px)', letterSpacing: '-0.065em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                <span style={{ fontWeight: 500, fontSize: 'clamp(15px, 5.2cqw, 23px)', letterSpacing: '-0.055em' }}>{p.unit}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', alignSelf: 'stretch', minWidth: 0 }}>
                <span style={{
                  fontSize: 'clamp(42px, 13.7cqw, 64px)',
                  fontWeight: 400,
                  letterSpacing: '0.018em',
                  lineHeight: 0.86,
                  fontVariantNumeric: 'tabular-nums',
                  transform: 'scaleX(0.9)',
                  transformOrigin: 'right center',
                }}>
                  {fmt(p.value, p.unit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Soft-key row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        fontSize: 'clamp(16px, 5.45cqw, 24px)',
        lineHeight: 1,
        borderTop: `2px solid ${C.dispText}`,
        padding: '2px 6px 4px',
        fontWeight: 900,
        letterSpacing: '-0.055em',
      }}>
        <span>Options</span>
        <span style={{ opacity: 0.75, fontWeight: 500 }}>{time}</span>
        <span style={{ textAlign: 'right' }}>Menu</span>
      </div>
    </div>
  );
}

interface NavBtnProps {
  label: React.ReactNode;
  onClick: () => void;
  style?: React.CSSProperties;
  size?: number;
}
function NavBtn({ label, onClick, style, size = 32 }: NavBtnProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => { setPressed(false); onClick(); }}
      onMouseLeave={() => setPressed(false)}
      style={{
        width: size, height: size,
        borderRadius: 11,
        border: `2px solid ${C.navBtnBdr}`,
        background: pressed
          ? `linear-gradient(180deg, #bbb7ad 0%, #d4d0c5 100%)`
          : `linear-gradient(180deg, #eeeae0 0%, ${C.navBtn} 58%, #cbc7bd 100%)`,
        color: C.navBtnText,
        fontSize: 13,
        fontWeight: 900,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 1,
        transform: pressed ? 'scale(0.94)' : 'none',
        transition: 'transform 0.06s, background 0.06s',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.75), inset 0 -4px 5px rgba(0,0,0,0.13), 0 2px 5px rgba(0,0,0,0.22)',
        ...style,
      }}
    >
      {label}
    </button>
  );
}

function SoftKeyButton({ side }: { side: 'left' | 'right' }) {
  const isRight = side === 'right';
  const shellPath = isRight
    ? 'M48 7 H136 Q151 7 156 22 Q160 34 151 47 L126 70 Q121 75 111 75 H38 Q28 75 23 67 L8 43 Q2 34 7 22 Q12 7 26 7 H48 Z'
    : 'M112 7 H24 Q9 7 4 22 Q0 34 9 47 L34 70 Q39 75 49 75 H122 Q132 75 137 67 L152 43 Q158 34 153 22 Q148 7 134 7 H112 Z';
  const markPath = isRight ? 'M34 31 L68 54 H127' : 'M126 31 L92 54 H33';

  return (
    <button
      onClick={() => {}}
      aria-label={`${side} soft key`}
      style={{
        position: 'absolute',
        left: isRight ? undefined : '7.1%',
        right: isRight ? '7.1%' : undefined,
        top: '51.4%',
        width: '28.0%',
        height: '8.6%',
        border: 0,
        padding: 0,
        background: 'transparent',
        cursor: 'pointer',
        zIndex: 7,
      }}
    >
      <svg viewBox="0 0 160 82" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path d={shellPath} fill="#171819" stroke="#f7f7f2" strokeWidth="7" strokeLinejoin="round" />
        <path d={shellPath} fill="none" stroke="#050607" strokeWidth="3" strokeLinejoin="round" opacity="0.92" />
        <path d={markPath} fill="none" stroke="#f7f7f2" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* ── Main Panel ─────────────────────────────────────────────────────── */
export function ABBPanel() {
  const [params, setParams]     = useState<Param[]>(BASE_PARAMS);
  const [state, setState]       = useState<DriveState>('stopped');
  const [control, setControl]   = useState<ControlLocation>('Local');
  const [topRow, setTopRow]     = useState(0);
  const [selected, setSelected] = useState(0);
  const [setpoint]              = useState(1400.0);
  const animRef                 = useRef<number | null>(null);

  /* Live parameter animation while running */
  useEffect(() => {
    if (state !== 'running') {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setParams(prev => prev.map(p => {
        const noise = (Math.random() - 0.5) * 2 * dt;
        const driftScale = p.max * 0.004;
        const next = Math.max(p.min, Math.min(p.max, p.value + noise * driftScale));
        return { ...p, value: next };
      }));
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [state]);

  const maxTop = Math.max(0, params.length - VISIBLE_ROWS);

  const moveUp = useCallback(() => {
    setSelected(s => {
      const next = Math.max(0, s - 1);
      setTopRow(t => (next < t ? next : t));
      return next;
    });
  }, []);

  const moveDown = useCallback(() => {
    setSelected(s => {
      const next = Math.min(params.length - 1, s + 1);
      setTopRow(t => (next >= t + VISIBLE_ROWS ? Math.min(maxTop, t + 1) : t));
      return next;
    });
  }, [params.length, maxTop]);

  const handleStart = useCallback(() => {
    if (state !== 'running') setState('running');
  }, [state]);

  const handleStop = useCallback(() => {
    setState('stopped');
    /* Decay values gently back toward base when stopped */
    setParams(BASE_PARAMS.map((b, i) => ({ ...b, value: params[i]?.value ?? b.value })));
  }, [params]);

  const handleLocRem = useCallback(() => {
    setControl(c => c === 'Local' ? 'Remote' : c === 'Remote' ? 'Fieldbus' : 'Local');
  }, []);

  const ledOn = state === 'running';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      background: C.panelBg,
      padding: 0,
    }}>
      <div style={{
        width: 'min(96%, 520px, 55vh)',
        aspectRatio: '576 / 1024',
        position: 'relative',
        filter: 'drop-shadow(0 24px 42px rgba(0,0,0,0.55))',
        isolation: 'isolate',
      }}>

        {/* Top hanger cap visible above the black fascia. */}
        <div style={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          top: 0,
          height: '6.4%',
          background: `linear-gradient(180deg, #e6e4dc 0%, #b5b2a8 58%, #8f8d85 100%)`,
          borderRadius: '8px 8px 0 0',
          boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.65), 0 3px 8px rgba(0,0,0,0.35)',
          zIndex: 0,
        }} />

        {/* Black upper housing. */}
        <div style={{
          position: 'absolute',
          inset: '5.8% 0 39.2% 0',
          background: `linear-gradient(180deg, #202122 0%, ${C.blackFace} 48%, #101112 100%)`,
          borderRadius: '48px 48px 4px 4px',
          boxShadow: `inset 0 0 0 2px ${C.blackEdge}, inset 0 22px 42px rgba(255,255,255,0.04), inset 0 -16px 28px rgba(0,0,0,0.38)`,
          zIndex: 1,
        }} />

        {/* Warm lower keypad plate. It rises in the center, like the real molded part. */}
        <div style={{
          position: 'absolute',
          inset: '57.0% 0 0 0',
          background: `linear-gradient(155deg, #f1eee4 0%, ${C.body} 48%, ${C.bodyDark} 100%)`,
          clipPath: 'polygon(0 8%, 32% 8%, 41% 0, 59% 0, 68% 8%, 100% 8%, 100% 77%, 97% 84%, 88% 91%, 72% 96%, 62% 98%, 56% 100%, 50% 98.5%, 44% 100%, 38% 98%, 28% 96%, 12% 91%, 3% 84%, 0 77%)',
          borderRadius: '0 0 86px 86px',
          boxShadow: `inset 0 0 0 2px ${C.bodyLine}, inset 0 16px 18px rgba(255,255,255,0.32), inset 0 -22px 36px rgba(0,0,0,0.13)`,
          zIndex: 2,
        }} />

        {/* Tiny side witness marks visible on both black side rails. */}
        {[
          { left: '1.4%', top: '39.2%', rot: '6deg' },
          { left: '3.4%', top: '45.3%', rot: '-6deg' },
          { left: '8.7%', top: '39.8%', rot: '0deg' },
          { right: '1.4%', top: '39.2%', rot: '-6deg' },
          { right: '3.4%', top: '45.3%', rot: '6deg' },
          { right: '8.7%', top: '39.8%', rot: '0deg' },
        ].map(({ rot, ...mark }, i) => (
          <span
            key={`side-mark-${i}`}
            style={{
              position: 'absolute',
              ...mark,
              width: '4.4%',
              height: 4,
              background: '#080909',
              opacity: 0.72,
              borderRadius: 2,
              transform: `rotate(${rot})`,
              zIndex: 3,
            }}
          />
        ))}

        <div style={{
          position: 'absolute',
          left: '48%',
          top: '13.2%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          color: '#eceeed',
          opacity: 0.76,
          fontSize: 8,
          letterSpacing: 0.1,
          fontFamily: 'Arial, sans-serif',
          zIndex: 3,
        }}>
          <BluetoothIcon />
          <span style={{ fontStyle: 'italic', fontWeight: 700 }}>Bluetooth</span>
        </div>

        <div style={{
          position: 'absolute',
          left: '9.2%',
          right: '9.2%',
          top: '18.4%',
          height: '28.7%',
          zIndex: 4,
        }}>
          <Display
            params={params}
            topRow={topRow}
            selected={selected}
            state={state}
            control={control}
            setpoint={setpoint}
          />
        </div>

        {/* Soft keys aligned below the LCD Options/Menu labels. */}
        <SoftKeyButton side="left" />
        <SoftKeyButton side="right" />

        <div style={{
          position: 'absolute',
          left: '8.6%',
          top: '62.1%',
          width: 17,
          height: 13,
          borderRadius: 2,
          background: ledOn ? C.ledOn : C.ledOff,
          border: '2px solid #58715e',
          boxShadow: ledOn ? `0 0 8px ${C.ledOn}` : 'inset 0 1px 2px rgba(0,0,0,0.35)',
          zIndex: 6,
        }} />

        {/* Very shallow molded depressions around the physical key groups. */}
        <div style={{
          position: 'absolute',
          left: '28.0%',
          top: '58.6%',
          width: '44.0%',
          height: '23.0%',
          borderRadius: 24,
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.025) 42%, transparent 70%)',
          zIndex: 3,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          left: '6.2%',
          right: '6.2%',
          top: '77.0%',
          height: '13.5%',
          borderRadius: 28,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(0,0,0,0.045))',
          zIndex: 3,
          pointerEvents: 'none',
        }} />

        <NavBtn
          label="▲"
          onClick={moveUp}
          size={64}
          style={{
            position: 'absolute',
            left: '43.7%',
            top: '58.9%',
            width: '12.6%',
            height: '8.0%',
            borderRadius: '13px 13px 15px 15px',
            fontSize: 29,
            paddingBottom: 3,
            zIndex: 8,
          }}
        />
        <NavBtn
          label="◀"
          onClick={() => {}}
          size={64}
          style={{
            position: 'absolute',
            left: '29.8%',
            top: '66.5%',
            width: '16.5%',
            height: '7.1%',
            borderRadius: '13px 15px 15px 13px',
            fontSize: 28,
            paddingRight: 4,
            zIndex: 8,
          }}
        />
        <NavBtn
          label="▶"
          onClick={() => {}}
          size={64}
          style={{
            position: 'absolute',
            right: '29.8%',
            top: '66.5%',
            width: '16.5%',
            height: '7.1%',
            borderRadius: '15px 13px 13px 15px',
            fontSize: 28,
            paddingLeft: 4,
            zIndex: 8,
          }}
        />
        <NavBtn
          label="▼"
          onClick={moveDown}
          size={64}
          style={{
            position: 'absolute',
            left: '43.7%',
            top: '73.6%',
            width: '12.6%',
            height: '8.0%',
            borderRadius: '15px 15px 13px 13px',
            fontSize: 29,
            paddingTop: 3,
            zIndex: 8,
          }}
        />

        <NavBtn
          label="?"
          onClick={() => {}}
          size={82}
          style={{
            position: 'absolute',
            right: '6.5%',
            top: '63.2%',
            width: '9.0%',
            height: '11.6%',
            borderRadius: 12,
            fontSize: 28,
            fontStyle: 'italic',
            zIndex: 8,
          }}
        />

        <button
          onClick={handleStop}
          style={{
            position: 'absolute',
            left: '8.2%',
            top: '77.8%',
            width: '27.4%',
            height: '10.6%',
            background: 'linear-gradient(160deg, rgba(248,246,240,0.95) 0%, rgba(226,222,211,0.92) 100%)',
            border: `2px solid #ceb8b4`,
            borderRadius: '18px 30px 18px 13px',
            clipPath: 'polygon(0 23%, 13% 0, 69% 0, 100% 34%, 100% 100%, 0 100%)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            color: C.stopBtn,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: 20,
            zIndex: 8,
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.72), inset 0 -4px 5px rgba(0,0,0,0.08), 0 2px 5px rgba(0,0,0,0.14)',
          }}
        >
          <svg width="38" height="34" viewBox="0 0 42 34">
            <circle cx="21" cy="17" r="12" stroke={C.stopBtn} strokeWidth="4" fill="none" />
            <path d="M21 6 L21 28 M11 11 L31 23" stroke={C.stopBtn} strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span>Stop</span>
        </button>

        <button
          onClick={handleLocRem}
          style={{
            position: 'absolute',
            left: '39.7%',
            top: '83.1%',
            width: '20.6%',
            height: '4.9%',
            background: `linear-gradient(180deg, #f1ede3 0%, ${C.locRemBtn} 62%, #cac6bc 100%)`,
            border: `2px solid ${C.navBtnBdr}`,
            borderRadius: 9,
            cursor: 'pointer',
            color: C.navBtnText,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: 18,
            zIndex: 8,
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.76), inset 0 -3px 4px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.18)',
          }}
        >
          Loc/Rem
        </button>

        <button
          onClick={handleStart}
          style={{
            position: 'absolute',
            right: '8.2%',
            top: '77.8%',
            width: '27.4%',
            height: '10.6%',
            background: 'linear-gradient(160deg, rgba(248,246,240,0.95) 0%, rgba(226,222,211,0.92) 100%)',
            border: `2px solid #bbc9b8`,
            borderRadius: '30px 18px 13px 18px',
            clipPath: 'polygon(31% 0, 87% 0, 100% 23%, 100% 100%, 0 100%, 0 34%)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            color: C.startBtn,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: 20,
            zIndex: 8,
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.72), inset 0 -4px 5px rgba(0,0,0,0.08), 0 2px 5px rgba(0,0,0,0.14)',
          }}
        >
          <svg width="38" height="34" viewBox="0 0 42 34">
            <polygon points="21,3 35,17 21,31 7,17" stroke={C.startBtn} strokeWidth="4" fill="none" />
            <rect x="19" y="10" width="5" height="14" fill={C.startBtn} />
          </svg>
          <span>Start</span>
        </button>

        <div style={{
          position: 'absolute',
          left: '32.8%',
          right: '32.8%',
          bottom: '0.0%',
          height: '10.8%',
          background: `linear-gradient(180deg, #f0ece2 0%, #d8d4ca 72%, #c9c5bb 100%)`,
          clipPath: 'polygon(19% 0, 81% 0, 100% 86%, 77% 100%, 50% 96%, 23% 100%, 0 86%)',
          border: `2px solid ${C.bodyLine}`,
          borderBottom: 0,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '6%',
        }}>
          <UsbIcon />
        </div>
      </div>
    </div>
  );
}
