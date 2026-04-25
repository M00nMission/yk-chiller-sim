/* Standalone comparison entry — served by `vite.abb.config.ts` on port 5185.
   Left half: official ABB ACH580 reference photograph.
   Right half: live React-rendered ABB ACH580 panel simulation.
   Both halves stay in sync visually so it's easy to spot differences. */

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ABBPanel } from './components/ui/ABBPanel';

import refImage from '../ABB_ACH580.png';

/* ── Inline styles ───────────────────────────────────────────────────── */
const S = {
  root: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    background: '#070707',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
  } satisfies React.CSSProperties,

  toolbar: {
    position: 'fixed',
    top: 14,
    right: 18,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 10px',
    border: '1px solid #242424',
    borderRadius: 999,
    background: 'rgba(12, 12, 12, 0.82)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.38)',
    color: '#d8d8d8',
    fontSize: 10,
    letterSpacing: '1.3px',
    textTransform: 'uppercase' as const,
    userSelect: 'none' as const,
  } satisfies React.CSSProperties,

  toggleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  } satisfies React.CSSProperties,

  toggleButton: (active: boolean): React.CSSProperties => ({
    border: '1px solid #343434',
    borderRadius: 999,
    padding: '6px 10px',
    background: active ? '#f4d35e' : '#191919',
    color: active ? '#121212' : '#bcbcbc',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    boxShadow: active ? '0 0 18px rgba(244, 211, 94, 0.28)' : 'none',
  }),

  panel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '6px 10px 10px',
    overflow: 'hidden',
  } satisfies React.CSSProperties,

  divider: {
    width: 1,
    background: '#1e1e1e',
    flexShrink: 0,
  } satisfies React.CSSProperties,

  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    color: '#444',
    fontSize: 9,
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    fontWeight: 'bold',
    userSelect: 'none' as const,
    flexShrink: 0,
  } satisfies React.CSSProperties,

  dot: (color: string, glow: boolean): React.CSSProperties => ({
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: color,
    boxShadow: glow ? `0 0 6px ${color}` : 'none',
    flexShrink: 0,
  }),

  imgWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    width: '100%',
  } satisfies React.CSSProperties,

  refImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    display: 'block',
    border: '1px solid #1a1a1a',
    imageRendering: 'crisp-edges',
  } satisfies React.CSSProperties,

  pageLabel: {
    fontSize: 9,
    letterSpacing: '2px',
    color: '#333',
    textTransform: 'uppercase' as const,
    userSelect: 'none' as const,
    flexShrink: 0,
  } satisfies React.CSSProperties,

  simWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    width: '100%',
  } satisfies React.CSSProperties,
} as const;

/* ── Comparison app ──────────────────────────────────────────────────── */
export function AbbCompareApp() {
  const [showControlLabels, setShowControlLabels] = useState(false);
  const [showStatusIconStates, setShowStatusIconStates] = useState(false);

  return (
    <div style={S.root}>
      <div style={S.toolbar}>
        <span style={S.toggleGroup}>
          Control labels
          <button
            type="button"
            aria-pressed={showControlLabels}
            onClick={() => setShowControlLabels((shown) => !shown)}
            style={S.toggleButton(showControlLabels)}
          >
            {showControlLabels ? 'Shown' : 'Hidden'}
          </button>
        </span>
        <span style={S.toggleGroup}>
          Status icons
          <button
            type="button"
            aria-pressed={showStatusIconStates}
            onClick={() => setShowStatusIconStates((shown) => !shown)}
            style={S.toggleButton(showStatusIconStates)}
          >
            {showStatusIconStates ? 'Shown' : 'Hidden'}
          </button>
        </span>
      </div>

      {/* ── Left: reference photograph ── */}
      <div style={S.panel}>
        <div style={S.badge}>
          <span style={S.dot('#2a2a2a', false)} />
          Reference · ABB ACH580
        </div>

        <div style={S.imgWrapper}>
          <img src={refImage} alt="ABB ACH580 Reference" style={S.refImg} />
        </div>

        <div style={S.pageLabel}>Control Panel · Main Screen</div>
      </div>

      <div style={S.divider} />

      {/* ── Right: live simulation ── */}
      <div style={S.panel}>
        <div style={S.badge}>
          <span style={S.dot('#00cc44', true)} />
          Simulation · ABB ACH580 VFD
        </div>

        <div style={S.simWrapper}>
          <ABBPanel
            showControlLabels={showControlLabels}
            showStatusIconStates={showStatusIconStates}
          />
        </div>

        <div style={S.pageLabel}>Interactive — Start / Stop / Nav</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('abb-root')!).render(<AbbCompareApp />);
