/* Standalone comparison entry — served by `vite.abb.config.ts` on port 5185.
   Left half: official ABB ACH580 reference photograph.
   Right half: live React-rendered ABB ACH580 panel simulation.
   Both halves stay in sync visually so it's easy to spot differences. */

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
function AbbCompareApp() {
  return (
    <div style={S.root}>
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
          <ABBPanel />
        </div>

        <div style={S.pageLabel}>Interactive — Start / Stop / Nav</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('abb-root')!).render(<AbbCompareApp />);
