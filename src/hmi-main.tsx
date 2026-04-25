/* Standalone comparison entry — served by `vite.hmi.config.ts` on port 5180.
   Left half: official York OptiView reference screenshot for the active screen.
   Right half: the live React-rendered HMI simulation.
   Navigate the HMI and both panels track in sync, making it easy to spot
   visual differences between the reference and the simulation. */

import { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { HMIPanel, type PageKey } from './components/ui/HMIPanel';

/* ── Reference image imports ─────────────────────────────────────────── */
import refHome  from '../assets/york-optiview/york-optiview.png';
import refEvap  from '../assets/york-optiview/york-optiview-evaporator.png';
import refCond  from '../assets/york-optiview/york-optiview-condenser.png';
import refComp  from '../assets/york-optiview/york-optiview-compressor.png';
import refOil   from '../assets/york-optiview/york-optiview-oil-sump.png';
import refHR    from '../assets/york-optiview/york-optiview-heat-recovery.png';
import refRL    from '../assets/york-optiview/york-optiview-refrigerant-level.png';

const REF_IMAGES: Partial<Record<PageKey, string>> = {
  home:            refHome,
  evaporator:      refEvap,
  condenser:       refCond,
  compressor:      refComp,
  oilsump:         refOil,
  heatRecovery:    refHR,
  refrigerantLevel: refRL,
};

const PAGE_LABELS: Record<PageKey, string> = {
  home:            'Home Screen',
  evaporator:      'Evaporator Screen',
  condenser:       'Condenser Screen',
  compressor:      'Compressor Screen',
  oilsump:         'Oil Sump Screen',
  motor:           'Motor Screen',
  heatRecovery:    'Heat Recovery Screen',
  refrigerantLevel:'Refrigerant Level Control',
  headPressure:    'Head Pressure Control',
  capacityControl: 'Capacity Control',
  vsdTuning:       'VSD Tuning',
  surgeMap:        'Surge Protection',
  diagnostics:     'Diagnostics',
  setpoints:       'Setpoints',
  history:         'History',
};

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

  badge: (hasRef: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    color: '#444',
    fontSize: 9,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    userSelect: 'none',
    flexShrink: 0,
  }),

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

  noRef: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    color: '#222',
    userSelect: 'none',
  } satisfies React.CSSProperties,

  noRefIcon: {
    fontSize: 52,
    opacity: 0.35,
  } satisfies React.CSSProperties,

  noRefLabel: {
    fontSize: 10,
    letterSpacing: '2px',
    color: '#2a2a2a',
    textTransform: 'uppercase' as const,
  } satisfies React.CSSProperties,

  pageLabel: {
    fontSize: 9,
    letterSpacing: '2px',
    color: '#333',
    textTransform: 'uppercase' as const,
    userSelect: 'none' as const,
    flexShrink: 0,
  } satisfies React.CSSProperties,

  /* HMI wrapper — maintains 884:668 aspect ratio inside the right panel */
  hmiWrapper: {
    aspectRatio: '884 / 668',
    /* Fit entirely within the right half: constrained by whichever is smaller */
    width: 'min(100%, calc((100vh - 52px) * 884 / 668))',
    maxHeight: 'calc(100vh - 52px)',
    position: 'relative',
    flexShrink: 0,
  } satisfies React.CSSProperties,
} as const;

/* ── Comparison app ──────────────────────────────────────────────────── */
function CompareApp() {
  const [page, setPage] = useState<PageKey>('home');
  const handlePageChange = useCallback((p: PageKey) => setPage(p), []);

  const refImg = REF_IMAGES[page];
  const hasRef = !!refImg;
  const label  = PAGE_LABELS[page] ?? page;

  return (
    <div style={S.root}>
      {/* ── Left: reference screenshot ── */}
      <div style={S.panel}>
        <div style={S.badge(hasRef)}>
          <span style={S.dot('#2a2a2a', false)} />
          Reference · York OptiView
        </div>

        <div style={S.imgWrapper}>
          {hasRef ? (
            <img src={refImg} alt={label} style={S.refImg} />
          ) : (
            <div style={S.noRef}>
              <span style={S.noRefIcon}>🖼</span>
              <span style={S.noRefLabel}>No reference image</span>
              <span style={{ ...S.noRefLabel, color: '#333' }}>{label}</span>
            </div>
          )}
        </div>

        <div style={S.pageLabel}>{hasRef ? label : ''}</div>
      </div>

      <div style={S.divider} />

      {/* ── Right: live simulation ── */}
      <div style={S.panel}>
        <div style={S.badge(hasRef)}>
          <span style={S.dot(hasRef ? '#00cc44' : '#3a3a3a', hasRef)} />
          Simulation · {hasRef ? 'Reference available' : 'No reference — novel screen'}
        </div>

        <div style={S.hmiWrapper}>
          <HMIPanel onPageChange={handlePageChange} />
        </div>

        <div style={S.pageLabel}>{label}</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('hmi-root')!).render(<CompareApp />);
