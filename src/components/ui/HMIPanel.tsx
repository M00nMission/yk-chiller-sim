/* React port of public/hmi.html — the York OptiView HMI screen.
   Renders the full operator interface (top bar, animated process diagram
   on canvas, navigation, detail pages, setpoints, history, alarms) as a
   self-contained component with all simulation/animation handled in
   useEffects.  All CSS is scoped under `.hmi-root` to keep it from
   leaking into the rest of the app. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LOGINS = ['View', 'Operator', 'Service'] as const;
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PAGE_LABELS: Record<string, string> = {
  home: 'HOME SCREEN',
  evaporator: 'EVAPORATOR',
  condenser: 'CONDENSER',
  compressor: 'COMPRESSOR',
  steam: 'STEAM SYSTEM',
  capacity: 'CAPACITY CONTROL',
  setpoints: 'SETPOINTS',
  history: 'HISTORY',
};

type PageKey = keyof typeof PAGE_LABELS;

const HISTORY_ROWS = [
  { t: '2:05 PM', d: '10 Nov 2003', e: 'System Run — Chiller Online', c: 'N' },
  { t: '2:04 PM', d: '10 Nov 2003', e: 'Pre-lube Sequence Complete', c: 'N' },
  { t: '2:02 PM', d: '10 Nov 2003', e: 'Anti-Recycle Timer Satisfied', c: 'N' },
  { t: '2:01 PM', d: '10 Nov 2003', e: 'Start Command Received (Local)', c: 'N' },
  { t: '1:45 PM', d: '10 Nov 2003', e: 'System Stopped — Operator Command', c: 'N' },
  { t: '1:12 PM', d: '10 Nov 2003', e: 'High Condenser Pressure — Warning', c: 'W' },
  { t: '1:09 PM', d: '10 Nov 2003', e: 'High Condenser Pressure — Cleared', c: 'N' },
  { t: '9:22 AM', d: '10 Nov 2003', e: 'System Run — Chiller Online', c: 'N' },
  { t: '9:18 AM', d: '10 Nov 2003', e: 'Anti-Recycle Timer Satisfied', c: 'N' },
  { t: '8:55 PM', d: '09 Nov 2003', e: 'System Stopped — Normal Shutdown', c: 'N' },
  { t: '3:14 PM', d: '09 Nov 2003', e: 'Low Oil Pressure — Momentary', c: 'W' },
  { t: '3:14 PM', d: '09 Nov 2003', e: 'Low Oil Pressure — Cleared', c: 'N' },
  { t: '7:02 AM', d: '09 Nov 2003', e: 'System Run — Chiller Online', c: 'N' },
];

/* Stylesheet ported from hmi.html, fully scoped under `.hmi-root`. */
const HMI_CSS = `
.hmi-root,.hmi-root *{box-sizing:border-box;margin:0;padding:0}
.hmi-root{width:100%;height:100%;background:#3a2e18;font-family:'Courier New',monospace;border:3px solid #666;display:flex;flex-direction:column;overflow:hidden;color:#fff}

/* ── TOP BAR ── */
.hmi-root .topbar{background:#000;border-bottom:3px solid #222;display:flex;min-height:78px}
.hmi-root .tb-left{flex:1;padding:5px 10px;display:flex;flex-direction:column;justify-content:space-between;border-right:2px solid #222}
.hmi-root .run-txt{color:#00ff00;font-size:17px;font-weight:bold;letter-spacing:2px;text-shadow:0 0 6px #00cc00}
.hmi-root .det-txt{color:#007700;font-size:10px;letter-spacing:1px}
.hmi-root .mode-txt{color:#00ff00;font-size:14px;font-weight:bold;letter-spacing:1px}
.hmi-root .scr-txt{color:#555;font-size:10px;letter-spacing:1px}
.hmi-root .tb-mid{display:flex;align-items:center;padding:5px 14px;gap:14px;border-right:2px solid #222}
.hmi-root .dtg{display:flex;flex-direction:column;align-items:center;gap:2px}
.hmi-root .dtg-lbl{color:#555;font-size:8px;letter-spacing:1.5px;text-transform:uppercase}
.hmi-root .dtg-val{color:#eee;font-size:13px;font-weight:bold;letter-spacing:1px}
.hmi-root .vsep{width:1px;height:44px;background:#222}
.hmi-root .tb-right{padding:8px 10px;display:flex;align-items:center}

/* ── ARROW BUTTONS — exact York blue ── */
.hmi-root .abtn{display:inline-flex;align-items:center;justify-content:center;position:relative;background:#1a5fb4;border:2px solid #5090e0;border-right:none;color:#fff;font-family:'Arial Black','Arial',sans-serif;font-weight:900;font-size:12px;letter-spacing:0.5px;padding:8px 10px 8px 12px;cursor:pointer;min-width:88px;text-align:center;line-height:1.2;text-shadow:0 1px 2px #00008899}
.hmi-root .abtn::after{content:'';position:absolute;right:-16px;top:-2px;bottom:-2px;width:16px;background:#1a5fb4;border-top:2px solid #5090e0;border-bottom:2px solid #5090e0;border-right:2px solid #5090e0;clip-path:polygon(0 0,100% 50%,0 100%);z-index:1}
.hmi-root .abtn:hover{background:#2269c8}
.hmi-root .abtn:hover::after{background:#2269c8}
.hmi-root .abtn.on{background:#0e3a7a;border-color:#88aaff}
.hmi-root .abtn.on::after{background:#0e3a7a;border-color:#88aaff}
.hmi-root .abtn-sm{font-size:11px;min-width:96px;padding:6px 10px 6px 10px}

/* ── MAIN LAYOUT ── */
.hmi-root .main{flex:1;display:flex;overflow:hidden}
.hmi-root .center{flex:1;display:flex;flex-direction:column;padding:7px 8px;gap:6px}
.hmi-root .rnav{width:112px;background:#0a0a0a;border-left:3px solid #1a1a1a;display:flex;flex-direction:column;padding:6px 6px 6px 6px;gap:5px}
.hmi-root .rbtn{display:block;position:relative;background:#1a5fb4;border:2px solid #5090e0;border-right:none;color:#fff;font-family:'Arial Black','Arial',sans-serif;font-weight:900;font-size:11px;letter-spacing:0.3px;padding:7px 6px 7px 8px;cursor:pointer;text-align:left;line-height:1.25;width:calc(100% + 0px)}
.hmi-root .rbtn::after{content:'';position:absolute;right:-13px;top:-2px;bottom:-2px;width:13px;background:#1a5fb4;border-top:2px solid #5090e0;border-bottom:2px solid #5090e0;border-right:2px solid #5090e0;clip-path:polygon(0 0,100% 50%,0 100%);z-index:1}
.hmi-root .rbtn:hover{background:#2269c8}.hmi-root .rbtn:hover::after{background:#2269c8}
.hmi-root .rbtn.on{background:#0e3a7a;border-color:#88aaff}.hmi-root .rbtn.on::after{background:#0e3a7a;border-color:#88aaff}

/* ── HOME PAGE ── */
.hmi-root .metrics{display:flex;gap:18px;align-items:center;padding:2px 2px}
.hmi-root .met{display:flex;align-items:center;gap:7px;color:#ddd;font-size:13px;font-weight:bold;letter-spacing:0.3px}
.hmi-root .mval{background:#000;border:2px inset #333;border-style:inset;color:#00ffaa;font-weight:bold;font-size:14px;padding:2px 8px;min-width:95px;text-align:right;letter-spacing:0.5px;font-family:'Courier New',monospace}

.hmi-root .cview{flex:1;position:relative;background:#3a2e18;border:1px solid #2a2010;overflow:hidden}
.hmi-root .cview canvas{position:absolute;inset:0;width:100%;height:100%}

.hmi-root .temprow{display:flex;gap:7px}
.hmi-root .tcard{flex:1;background:#050505;border:2px solid #333;padding:6px 10px}
.hmi-root .tcard-title{color:#fff;font-size:12px;font-weight:bold;text-align:center;border-bottom:1px solid #222;padding-bottom:4px;margin-bottom:5px;letter-spacing:0.3px}
.hmi-root .trow{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#bbb;font-weight:bold;margin:3px 0}
.hmi-root .tval{background:#000;border:2px solid #333;color:#00ffaa;font-weight:bold;font-size:13px;padding:1px 7px;min-width:78px;text-align:right;font-family:'Courier New',monospace}

/* ── DETAIL PAGES ── */
.hmi-root .page{display:none;flex-direction:column;gap:6px;flex:1}
.hmi-root .page.vis{display:flex}
.hmi-root .dcard{background:#030303;border:2px solid #2a2a2a;padding:8px 12px}
.hmi-root .dcard h3{color:#00ccff;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;border-bottom:1px solid #111;padding-bottom:4px;margin-bottom:7px;font-family:'Arial',sans-serif}
.hmi-root .dgrid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.hmi-root .dr{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#888;gap:4px;font-weight:bold}
.hmi-root .dv{background:#000;border:1px solid #2a2a2a;color:#00ffaa;font-size:12px;font-weight:bold;padding:1px 5px;min-width:76px;text-align:right;white-space:nowrap;font-family:'Courier New',monospace}
.hmi-root .dv.amb{color:#ffbb00}.hmi-root .dv.red{color:#ff3333}.hmi-root .dv.blu{color:#55aaff}.hmi-root .dv.grn{color:#00ff66}
.hmi-root .btrack{height:10px;background:#111;border:1px solid #2a2a2a;margin-top:6px;overflow:hidden}
.hmi-root .bfill{height:100%;background:#00aa55;transition:width 1s}
.hmi-root .bfill.w{background:#dd8800}.hmi-root .bfill.d{background:#cc2222}
.hmi-root .blabel{font-size:10px;color:#555;letter-spacing:1px;margin-top:6px;font-weight:bold}

/* ── SETPOINTS ── */
.hmi-root .sprow{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #0d0d0d;font-size:12px;color:#888;font-weight:bold}
.hmi-root .spctl{display:flex;align-items:center;gap:4px}
.hmi-root .spinp{background:#000;border:1px solid #334;color:#00ffaa;font-size:13px;font-weight:bold;padding:2px 4px;width:68px;text-align:right;font-family:'Courier New',monospace}
.hmi-root .spu{color:#444;font-size:11px}
.hmi-root .sarr{background:#111;border:1px solid #444;color:#aaa;font-size:11px;padding:2px 6px;cursor:pointer;font-weight:bold}
.hmi-root .sarr:hover{background:#222;color:#fff}

/* ── HISTORY ── */
.hmi-root .ht{width:100%;border-collapse:collapse;font-size:11px}
.hmi-root .ht th{color:#555;font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:4px 6px;border-bottom:1px solid #1a1a1a;text-align:left;font-weight:bold}
.hmi-root .ht td{color:#888;padding:3px 6px;border-bottom:1px solid #0a0a0a}
.hmi-root .ht tr:nth-child(even) td{background:#030303}
.hmi-root .evN{color:#00cc55}.hmi-root .evW{color:#ffaa00}.hmi-root .evF{color:#ff3333}

/* ── BOTTOM BAR ── */
.hmi-root .botbar{background:#000;border-top:3px solid #1a1a1a;display:flex;justify-content:space-between;align-items:center;padding:6px 10px}
.hmi-root .alarmzone{flex:1;text-align:center;font-size:12px;font-weight:bold;letter-spacing:1px}
.hmi-root .alok{color:#00cc44}.hmi-root .alwarn{color:#ff2222;animation:hmiBlink 0.8s step-end infinite}
@keyframes hmiBlink{0%,100%{opacity:1}50%{opacity:0}}

/* ── MODAL ── */
.hmi-root .modal{display:none;position:absolute;inset:0;background:rgba(0,0,0,0.8);z-index:30;align-items:center;justify-content:center}
.hmi-root .modal.show{display:flex}
.hmi-root .mbox{background:#0a0a14;border:2px solid #1a5fb4;padding:22px 26px;min-width:270px;max-width:350px;text-align:center}
.hmi-root .mbox h3{color:#00ccff;font-size:14px;letter-spacing:1px;margin-bottom:10px;font-family:'Arial',sans-serif}
.hmi-root .mbox p{color:#aaa;font-size:12px;line-height:1.7;margin-bottom:16px;white-space:pre-line}
`;

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('hmi-panel-styles')) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'hmi-panel-styles';
  style.textContent = HMI_CSS;
  document.head.appendChild(style);
  stylesInjected = true;
}

function jit(v: number, r: number, lo: number, hi: number, dp = 1): number {
  return parseFloat(Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * r)).toFixed(dp));
}

/* Set the textContent of an element BY ID, scoped to the given root container.
   Mirrors the original $$() helper but limited to this HMI instance's DOM
   subtree so multiple panels could safely coexist. */
function setText(root: HTMLElement | null, id: string, value: string) {
  if (!root) return;
  const el = root.querySelector<HTMLElement>(`[data-h="${id}"]`);
  if (el) el.textContent = value;
}

export function HMIPanel() {
  const [page, setPage] = useState<PageKey>('home');
  const [accessIdx, setAccessIdx] = useState(0);
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);
  const [dt, setDt] = useState({ date: '--', time: '--' });

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sp1Ref = useRef<HTMLInputElement>(null);
  const sp2Ref = useRef<HTMLInputElement>(null);
  const sp3Ref = useRef<HTMLInputElement>(null);
  const sp4Ref = useRef<HTMLInputElement>(null);
  const sp5Ref = useRef<HTMLInputElement>(null);
  const sp6Ref = useRef<HTMLInputElement>(null);
  const sp7Ref = useRef<HTMLInputElement>(null);
  const sp8Ref = useRef<HTMLInputElement>(null);

  ensureStyles();

  /* Live clock — display-only state. */
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const date = `${String(n.getDate()).padStart(2, '0')} ${MO[n.getMonth()]} ${n.getFullYear()}`;
      let h = n.getHours();
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      const time = `${h}:${String(n.getMinutes()).padStart(2, '0')} ${ap}`;
      setDt({ date, time });
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);

  /* Animated process diagram on the home page canvas. Re-uses the original
     drawing routine essentially verbatim, ported to TypeScript. */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    if (!cx) return;

    let W = 0;
    let H = 0;
    const rsz = () => {
      const w = cv.parentElement;
      if (!w) return;
      W = cv.width = w.clientWidth;
      H = cv.height = w.clientHeight;
    };
    rsz();
    const ro = new ResizeObserver(rsz);
    if (cv.parentElement) ro.observe(cv.parentElement);

    let angle = 0;
    let raf = 0;

    const tube = (x: number, y: number, w: number, h: number, rx: number, hl: string, mid: string, dk: string) => {
      const g = cx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, hl);
      g.addColorStop(0.35, mid);
      g.addColorStop(1, dk);
      cx.beginPath();
      if (rx) cx.roundRect(x, y, w, h, rx);
      else cx.rect(x, y, w, h);
      cx.fillStyle = g;
      cx.fill();
      cx.strokeStyle = '#3faa3f';
      cx.lineWidth = 1.2;
      cx.stroke();
    };
    const ellipseCap = (ex: number, cy: number, rw: number, rh: number, hl: string, mid: string, dk: string) => {
      const g = cx.createRadialGradient(ex - rw * 0.3, cy - rh * 0.3, 1, ex, cy, Math.max(rw, rh));
      g.addColorStop(0, hl);
      g.addColorStop(0.5, mid);
      g.addColorStop(1, dk);
      cx.beginPath();
      cx.ellipse(ex, cy, rw, rh, 0, 0, Math.PI * 2);
      cx.fillStyle = g;
      cx.fill();
      cx.strokeStyle = '#3faa3f';
      cx.lineWidth = 1.2;
      cx.stroke();
    };
    const fatPipe = (pts: number[][], w: number, col1: string, col2: string) => {
      cx.beginPath();
      cx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        if (i + 1 < pts.length) {
          cx.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w * 0.8);
        } else {
          cx.lineTo(pts[i][0], pts[i][1]);
        }
      }
      cx.strokeStyle = col1;
      cx.lineWidth = w;
      cx.lineCap = 'round';
      cx.lineJoin = 'round';
      cx.stroke();
      cx.beginPath();
      cx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        if (i + 1 < pts.length) cx.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w * 0.8);
        else cx.lineTo(pts[i][0], pts[i][1]);
      }
      cx.strokeStyle = col2;
      cx.lineWidth = w * 0.3;
      cx.stroke();
    };
    const arr = (x: number, y: number, dir: number, clr: string) => {
      cx.save();
      cx.translate(x, y);
      cx.rotate(dir);
      cx.beginPath();
      cx.moveTo(-5, 0);
      cx.lineTo(6, 0);
      cx.lineTo(3, -4);
      cx.moveTo(6, 0);
      cx.lineTo(3, 4);
      cx.strokeStyle = clr;
      cx.lineWidth = 1.8;
      cx.lineCap = 'round';
      cx.stroke();
      cx.restore();
    };
    const flowDot = (x: number, y: number, clr: string) => {
      cx.beginPath();
      cx.arc(x, y, 4, 0, Math.PI * 2);
      cx.fillStyle = clr;
      cx.fill();
      cx.beginPath();
      cx.arc(x, y, 2, 0, Math.PI * 2);
      cx.fillStyle = 'rgba(200,255,200,0.7)';
      cx.fill();
    };

    const draw = () => {
      cx.clearRect(0, 0, W, H);
      cx.fillStyle = '#3a2e18';
      cx.fillRect(0, 0, W, H);

      const sc = Math.min(W / 640, H / 230) * 0.92;
      const ox = W / 2 - 310 * sc;
      const oy = H / 2 - 105 * sc;
      cx.save();
      cx.translate(ox, oy);
      cx.scale(sc, sc);

      const HL = '#7aee7a';
      const MID = '#228a22';
      const DK = '#0a3d0a';
      const HL2 = '#55dd55';
      const MID2 = '#1a6e1a';
      const DK2 = '#082808';

      cx.fillStyle = 'rgba(0,0,0,0.35)';
      cx.beginPath();
      cx.ellipse(310, 215, 270, 18, 0, 0, Math.PI * 2);
      cx.fill();

      tube(10, 95, 180, 72, 5, HL, MID, DK);
      ellipseCap(10, 131, 9, 36, HL, MID, DK);
      ellipseCap(190, 131, 9, 36, HL2, MID2, DK2);
      cx.beginPath();
      cx.roundRect(1, 120, 12, 14, 2);
      cx.fillStyle = MID;
      cx.fill();
      cx.strokeStyle = '#3faa3f';
      cx.lineWidth = 1;
      cx.stroke();
      cx.beginPath();
      cx.roundRect(190, 120, 12, 14, 2);
      cx.fillStyle = MID;
      cx.fill();
      cx.stroke();
      cx.fillStyle = 'rgba(255,255,255,0.06)';
      cx.beginPath();
      cx.roundRect(14, 97, 80, 28, 4);
      cx.fill();

      tube(430, 95, 195, 72, 5, HL, MID, DK);
      ellipseCap(430, 131, 9, 36, HL, MID, DK);
      ellipseCap(625, 131, 9, 36, HL2, MID2, DK2);
      cx.beginPath();
      cx.roundRect(420, 120, 12, 14, 2);
      cx.fillStyle = MID;
      cx.fill();
      cx.stroke();
      cx.beginPath();
      cx.roundRect(624, 120, 12, 14, 2);
      cx.fillStyle = MID;
      cx.fill();
      cx.stroke();
      cx.fillStyle = 'rgba(255,255,255,0.06)';
      cx.beginPath();
      cx.roundRect(434, 97, 80, 28, 4);
      cx.fill();

      const g2 = cx.createRadialGradient(295, 105, 5, 295, 120, 72);
      g2.addColorStop(0, '#88ee88');
      g2.addColorStop(0.4, '#229922');
      g2.addColorStop(1, '#0a3d0a');
      cx.beginPath();
      cx.ellipse(295, 120, 68, 68, 0, 0, Math.PI * 2);
      cx.fillStyle = g2;
      cx.fill();
      cx.strokeStyle = '#44bb44';
      cx.lineWidth = 2;
      cx.stroke();
      cx.beginPath();
      cx.ellipse(295, 120, 52, 52, 0, 0, Math.PI * 2);
      cx.strokeStyle = 'rgba(80,200,80,0.3)';
      cx.lineWidth = 1;
      cx.stroke();

      for (let i = 0; i < 8; i++) {
        const a = angle + i * Math.PI / 4;
        const ix1 = 295 + Math.cos(a) * 9;
        const iy1 = 120 + Math.sin(a) * 9;
        const ix2 = 295 + Math.cos(a + 0.25) * 50;
        const iy2 = 120 + Math.sin(a + 0.25) * 50;
        cx.beginPath();
        cx.moveTo(ix1, iy1);
        cx.lineTo(ix2, iy2);
        cx.strokeStyle = `rgba(100,255,100,${0.5 + Math.abs(Math.sin(a)) * 0.35})`;
        cx.lineWidth = 3.5;
        cx.lineCap = 'round';
        cx.stroke();
      }
      cx.beginPath();
      cx.arc(295, 120, 12, 0, Math.PI * 2);
      const hub = cx.createRadialGradient(291, 116, 1, 295, 120, 12);
      hub.addColorStop(0, '#4acc4a');
      hub.addColorStop(1, '#082808');
      cx.fillStyle = hub;
      cx.fill();
      cx.strokeStyle = '#44bb44';
      cx.lineWidth = 1.5;
      cx.stroke();
      cx.beginPath();
      cx.arc(295, 120, 4, 0, Math.PI * 2);
      cx.fillStyle = '#aaffaa';
      cx.fill();

      cx.beginPath();
      cx.roundRect(227, 115, 5, 12, 2);
      cx.fillStyle = '#3a8a3a';
      cx.fill();
      cx.stroke();

      fatPipe([[190, 124], [232, 124], [232, 124], [232, 120]], 13, MID, 'rgba(80,200,80,0.4)');
      fatPipe([[295, 52], [295, 22], [530, 22], [530, 95]], 13, MID, 'rgba(80,200,80,0.4)');
      fatPipe([[530, 167], [530, 200], [100, 200], [100, 167]], 10, '#1a6e1a', 'rgba(60,160,60,0.3)');

      arr(205, 124, 0, 'rgba(160,255,160,0.9)');
      arr(420, 22, 0, 'rgba(160,255,160,0.9)');
      arr(230, 200, Math.PI, 'rgba(120,220,120,0.7)');

      cx.fillStyle = '#0d0d1a';
      cx.beginPath();
      cx.roundRect(268, 98, 54, 40, 3);
      cx.fill();
      cx.strokeStyle = '#2255aa';
      cx.lineWidth = 1.5;
      cx.stroke();
      cx.fillStyle = '#001133';
      cx.beginPath();
      cx.roundRect(271, 101, 48, 31, 2);
      cx.fill();
      cx.fillStyle = 'rgba(0,80,200,0.12)';
      cx.beginPath();
      cx.roundRect(271, 101, 48, 31, 2);
      cx.fill();
      cx.fillStyle = '#1155cc';
      cx.font = 'bold 9px Arial';
      cx.textAlign = 'center';
      cx.fillText('YORK', 295, 114);
      cx.fillStyle = '#00ee88';
      cx.font = 'bold 7px Courier New';
      cx.fillText('OptiView', 295, 124);
      cx.fillStyle = '#0033aa';
      cx.font = '6px Courier New';
      cx.fillText('YK SERIES', 295, 133);

      const stg = cx.createLinearGradient(360, 60, 360, 160);
      stg.addColorStop(0, '#6add6a');
      stg.addColorStop(0.4, '#1e851e');
      stg.addColorStop(1, '#0a3a0a');
      cx.beginPath();
      cx.roundRect(355, 60, 70, 100, 8);
      cx.fillStyle = stg;
      cx.fill();
      cx.strokeStyle = '#3faa3f';
      cx.lineWidth = 1.5;
      cx.stroke();
      cx.fillStyle = 'rgba(255,255,255,0.05)';
      cx.beginPath();
      cx.roundRect(358, 62, 30, 40, 4);
      cx.fill();
      for (let i = 0; i < 5; i++) {
        cx.beginPath();
        cx.roundRect(359, 65 + i * 12, 60, 9, 2);
        cx.fillStyle = `rgba(30,100,30,${0.7 - i * 0.1})`;
        cx.fill();
      }
      cx.fillStyle = '#bbb';
      cx.font = 'bold 8px Courier New';
      cx.textAlign = 'center';
      cx.fillText('TURBINE', 390, 173);
      fatPipe([[390, 60], [390, 30], [390, 30]], 10, MID, 'rgba(80,200,80,0.4)');
      cx.beginPath();
      cx.roundRect(382, 20, 16, 14, 3);
      cx.fillStyle = '#1a5a1a';
      cx.fill();
      cx.strokeStyle = '#3faa3f';
      cx.lineWidth = 1;
      cx.stroke();
      fatPipe([[390, 160], [390, 195], [390, 195]], 8, '#1a6e1a', 'rgba(60,160,60,0.3)');

      cx.fillStyle = '#aaa';
      cx.font = 'bold 10px Courier New';
      cx.textAlign = 'center';
      cx.fillText('EVAPORATOR', 100, 185);
      cx.fillText('COMPRESSOR', 295, 205);
      cx.fillText('CONDENSER', 527, 185);

      flowDot(5, 127, '#00cc44');
      flowDot(632, 127, '#ffaa00');

      cx.restore();
    };

    const loop = () => {
      angle += 0.045;
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  /* Simulation loop — jiggles values and pushes them into the live <span>s
     (which are tagged with `data-h="<id>"`). */
  useEffect(() => {
    const root = rootRef.current;
    const S = {
      chwL: 42.0,
      chwR: 58.1,
      cndL: 93.1,
      cndR: 83.0,
      rpm: 4067,
      hrs: 0,
      load: 78.0,
      igv: 72.0,
      oilT: 118.6,
      bearF: 112.3,
      bearR: 108.9,
      oilP: 28.4,
      amps: 312,
      kw: 239,
      steamP: 115.0,
      steamT: 338.1,
      steamF: 8200,
      throttle: 68,
      tick: 0,
    };

    const sim = () => {
      S.tick++;
      S.chwL = jit(S.chwL, 0.06, 40.0, 44.5);
      S.chwR = jit(S.chwR, 0.08, 56.5, 60.5);
      S.cndL = jit(S.cndL, 0.10, 90.5, 96.5);
      S.cndR = jit(S.cndR, 0.07, 81.5, 85.0);
      S.rpm += Math.round((Math.random() - 0.5) * 12);
      S.rpm = Math.max(3950, Math.min(4180, S.rpm));
      S.load = jit(S.load, 0.5, 58, 97, 1);
      S.amps = Math.round(S.load * 4.02);
      S.kw = Math.round(S.load * 3.06);
      S.igv = jit(S.igv, 0.3, 62, 90, 1);
      S.oilT = jit(S.oilT, 0.06, 116, 124);
      S.bearF = jit(S.bearF, 0.04, 110, 116);
      S.bearR = jit(S.bearR, 0.04, 107, 113);
      S.steamP = jit(S.steamP, 0.12, 112, 118);
      S.throttle = jit(S.throttle, 0.3, 60, 80, 1);
      if (S.tick % 120 === 0) S.hrs++;

      setText(root, 'opHrs', S.hrs + ' Hr');
      setText(root, 'trbRPM', S.rpm + ' RPM');
      setText(root, 'pctFLA', Math.round(S.load) + ' %');
      setText(root, 'chwL', S.chwL.toFixed(1) + ' °F');
      setText(root, 'chwR', S.chwR.toFixed(1) + ' °F');
      setText(root, 'cndL', S.cndL.toFixed(1) + ' °F');
      setText(root, 'cndR', S.cndR.toFixed(1) + ' °F');

      const eRT = S.chwL - 3.6;
      const eST = eRT - 1.3;
      setText(root, 'e-lcl', S.chwL.toFixed(1) + ' °F');
      setText(root, 'e-rcl', S.chwR.toFixed(1) + ' °F');
      setText(root, 'e-rt', eRT.toFixed(1) + ' °F');
      setText(root, 'e-st', eST.toFixed(1) + ' °F');
      setText(root, 'e-at', (S.chwL - eRT).toFixed(1) + ' °F');
      setText(root, 'e-rp', (17.3 + (eRT - 38.4) * 0.12).toFixed(1) + ' PSI');
      const eCap = Math.round(S.load * 4.94);
      setText(root, 'e-cap', eCap + ' Tons');
      setText(root, 'e-dt', (S.chwR - S.chwL).toFixed(1) + ' °F');
      setText(root, 'e-eff', (S.kw / eCap).toFixed(2) + ' kW/T');
      const eb = root?.querySelector<HTMLDivElement>('[data-h="e-bar"]');
      if (eb) {
        eb.style.width = Math.round(S.load) + '%';
        eb.className = 'bfill' + (S.load > 90 ? ' w' : '');
      }

      const cRT = S.cndL + 0.5;
      setText(root, 'c-lcl', S.cndL.toFixed(1) + ' °F');
      setText(root, 'c-rcl', S.cndR.toFixed(1) + ' °F');
      setText(root, 'c-rt', cRT.toFixed(1) + ' °F');
      setText(root, 'c-st', (cRT + 1.4).toFixed(1) + ' °F');
      setText(root, 'c-at', (cRT - S.cndL).toFixed(1) + ' °F');
      setText(root, 'c-rp', (121.4 + (S.cndL - 93.1) * 0.5).toFixed(1) + ' PSI');
      setText(root, 'c-hr', Math.round(S.load * 6.26) + ' Tons');
      setText(root, 'c-dt', (S.cndL - S.cndR).toFixed(1) + ' °F');

      setText(root, 'p-spd', S.rpm + ' RPM');
      setText(root, 'p-vane', Math.round(S.igv) + ' %');
      setText(root, 'p-amp', S.amps + ' A');
      setText(root, 'p-kw', S.kw + ' kW');
      setText(root, 'p-fla', Math.round(S.load) + ' %');
      setText(root, 'p-bf', S.bearF.toFixed(1) + ' °F');
      setText(root, 'p-br', S.bearR.toFixed(1) + ' °F');
      setText(root, 'p-opdiff', S.oilP.toFixed(1) + ' PSID');
      setText(root, 'p-ot', S.oilT.toFixed(1) + ' °F');
      setText(root, 'p-os', (S.oilT + 13.8).toFixed(1) + ' °F');
      setText(root, 'p-disch', (S.cndL + 55.1).toFixed(1) + ' °F');

      const sm = Math.max(18, Math.min(88, 61 + (100 - S.load) * 0.5 + (Math.random() - 0.5) * 2));
      const sb = root?.querySelector<HTMLDivElement>('[data-h="sg-bar"]');
      if (sb) {
        sb.style.width = Math.round(sm) + '%';
        sb.className = 'bfill' + (sm < 30 ? ' d' : sm < 45 ? ' w' : '');
      }

      setText(root, 'ss-p', S.steamP.toFixed(1) + ' PSI');
      setText(root, 'ss-t', S.steamT.toFixed(1) + ' °F');
      setText(root, 'ss-f', Math.round(S.steamF) + ' lb/hr');
      setText(root, 'ss-ip', (S.steamP - 1.8).toFixed(1) + ' PSI');
      setText(root, 'ss-it', (S.steamT - 1.9).toFixed(1) + ' °F');
      setText(root, 'ss-ep', '4.8 PSI');
      setText(root, 'ss-et', '261.4 °F');
      setText(root, 'ss-tv', Math.round(S.throttle) + ' %');

      const sp5v = parseFloat(sp5Ref.current?.value ?? '4100') || 4100;
      setText(root, 'gv-sp', sp5v + ' RPM');
      setText(root, 'gv-act', S.rpm + ' RPM');
      const ge = Math.round(S.rpm - sp5v);
      const gEl = root?.querySelector<HTMLSpanElement>('[data-h="gv-err"]');
      if (gEl) {
        gEl.textContent = (ge >= 0 ? '+' : '') + ge + ' RPM';
        gEl.className = 'dv' + (Math.abs(ge) > 100 ? ' red' : ge !== 0 ? ' amb' : '');
      }
      setText(root, 'gv-out', Math.round(S.throttle) + ' %');

      setText(root, 'cc-pct', Math.round(S.load) + ' %');
      setText(root, 'cc-igv', Math.round(S.igv) + ' %');
      setText(root, 'cc-cmd', Math.round(S.igv + 2) + ' %');
      setText(root, 'cc-fbk', Math.round(S.igv - 1) + ' %');
      setText(root, 'll-act', S.amps + ' A');
      setText(root, 'll-akw', S.kw + ' kW');
      const cb = root?.querySelector<HTMLDivElement>('[data-h="cc-bar"]');
      if (cb) {
        cb.style.width = Math.round(S.load) + '%';
        cb.className = 'bfill' + (S.load > 90 ? ' w' : '');
      }

      const sp3v = parseFloat(sp3Ref.current?.value ?? '36.0') || 36.0;
      const sp4v = parseFloat(sp4Ref.current?.value ?? '105.0') || 105.0;
      const al = root?.querySelector<HTMLSpanElement>('[data-h="alarmTxt"]');
      if (al) {
        if (S.chwL < sp3v + 0.5) {
          al.textContent = 'FAULT — LOW CHILLED LIQUID TEMP CUTOUT APPROACHING';
          al.className = 'alwarn';
        } else if (S.cndL > sp4v - 3) {
          al.textContent = 'WARNING — HIGH CONDENSER LIQUID TEMP';
          al.className = 'alwarn';
        } else {
          al.textContent = 'No Active Alarms';
          al.className = 'alok';
        }
      }
    };

    sim();
    const id = setInterval(sim, 900);
    return () => clearInterval(id);
  }, []);

  const goPage = useCallback((name: PageKey) => setPage(name), []);

  const adj = useCallback((ref: React.RefObject<HTMLInputElement | null>, d: number) => {
    const e = ref.current;
    if (!e) return;
    e.value = String(parseFloat((parseFloat(e.value) + d).toFixed(2)));
  }, []);

  const doLogin = useCallback(() => {
    const next = (accessIdx + 1) % LOGINS.length;
    setAccessIdx(next);
    const lv = LOGINS[next];
    setModal({
      title: 'Access Level Change',
      body:
        `Access level changed to: ${lv}\n\n` +
        (lv === 'Operator'
          ? 'Setpoint changes and start/stop commands enabled.'
          : lv === 'Service'
            ? 'Full configuration access and diagnostic screens enabled.'
            : 'Read-only view access. No changes permitted.'),
    });
  }, [accessIdx]);

  const printScreen = useCallback(() => {
    setModal({
      title: 'Print',
      body: `Sending screen capture to configured printer port LPT1...\n\nPage: ${PAGE_LABELS[page] ?? page}`,
    });
  }, [page]);

  const accessLevel = LOGINS[accessIdx];
  const navItems = useMemo(
    () => [
      { id: 'evaporator' as PageKey, label: 'Evaporator' },
      { id: 'condenser' as PageKey, label: 'Condenser' },
      { id: 'compressor' as PageKey, label: 'Compressor' },
      { id: 'steam' as PageKey, label: 'Steam System', br: true },
      { id: 'capacity' as PageKey, label: 'Capacity Control', br: true },
      { id: 'setpoints' as PageKey, label: 'Setpoints' },
    ],
    [],
  );

  const cls = (base: string, on?: boolean) => (on ? `${base} on` : base);
  const pageCls = (key: PageKey) => (page === key ? 'page vis' : 'page');

  return (
    <div ref={rootRef} className="hmi-root">
      <div className="topbar">
        <div className="tb-left">
          <div className="run-txt">▪ SYSTEM RUN</div>
          <div className="det-txt">SYSTEM DETAILS</div>
          <div className="mode-txt">LEAVING CHILLED LIQUID CONTROL</div>
          <div className="scr-txt">{PAGE_LABELS[page]}</div>
        </div>
        <div className="tb-mid">
          <div className="dtg">
            <div className="dtg-lbl">Date</div>
            <div className="dtg-val">{dt.date}</div>
          </div>
          <div className="vsep" />
          <div className="dtg">
            <div className="dtg-lbl">Time</div>
            <div className="dtg-val">{dt.time}</div>
          </div>
          <div className="vsep" />
          <div className="dtg" style={{ gap: 4 }}>
            <div className="dtg-lbl">Control Source</div>
            <div className="dtg-val">Local</div>
            <div className="dtg-lbl" style={{ marginTop: 2 }}>Access Level</div>
            <div className="dtg-val">{accessLevel}</div>
          </div>
        </div>
        <div className="tb-right">
          <button className={cls('abtn', page === 'home')} onClick={() => goPage('home')}>
            System
          </button>
        </div>
      </div>

      <div className="main">
        <div className="center">
          {/* HOME */}
          <div className={pageCls('home')}>
            <div className="metrics">
              <div className="met">
                Operating Hours <span className="mval" data-h="opHrs">0 Hr</span>
              </div>
              <div className="met">
                Turbine Speed <span className="mval" data-h="trbRPM">4067 RPM</span>
              </div>
              <div className="met">
                % Full Load Amps <span className="mval" data-h="pctFLA">78 %</span>
              </div>
            </div>
            <div className="cview">
              <canvas ref={canvasRef} />
            </div>
            <div className="temprow">
              <div className="tcard">
                <div className="tcard-title">Chilled Liquid Temperature</div>
                <div className="trow">
                  Leaving <span className="tval" data-h="chwL">42.0 °F</span>
                </div>
                <div className="trow">
                  Return <span className="tval" data-h="chwR">58.1 °F</span>
                </div>
              </div>
              <div className="tcard">
                <div className="tcard-title">Condenser Liquid Temperature</div>
                <div className="trow">
                  Leaving <span className="tval" data-h="cndL">93.1 °F</span>
                </div>
                <div className="trow">
                  Return <span className="tval" data-h="cndR">83.0 °F</span>
                </div>
              </div>
            </div>
          </div>

          {/* EVAPORATOR */}
          <div className={pageCls('evaporator')}>
            <div className="dcard">
              <h3>Evaporator</h3>
              <div className="dgrid">
                <div className="dr">Leaving Chilled Liquid <span className="dv" data-h="e-lcl">42.0 °F</span></div>
                <div className="dr">Return Chilled Liquid <span className="dv" data-h="e-rcl">58.1 °F</span></div>
                <div className="dr">Refrigerant Temp <span className="dv" data-h="e-rt">38.4 °F</span></div>
                <div className="dr">Saturation Temp <span className="dv" data-h="e-st">37.1 °F</span></div>
                <div className="dr">Approach Temp <span className="dv" data-h="e-at">3.6 °F</span></div>
                <div className="dr">Refrigerant Pressure <span className="dv" data-h="e-rp">17.3 PSI</span></div>
                <div className="dr">Chilled Water Flow <span className="dv" data-h="e-fl">1240 GPM</span></div>
                <div className="dr">Refrigerant Level <span className="dv" data-h="e-lv">52 %</span></div>
                <div className="dr">Oil Concentration <span className="dv" data-h="e-oc">0.04 %</span></div>
                <div className="dr">Fouling Factor <span className="dv" data-h="e-ff">0.000089</span></div>
              </div>
            </div>
            <div className="dcard">
              <h3>Evaporator Performance</h3>
              <div className="dgrid">
                <div className="dr">Capacity <span className="dv" data-h="e-cap">385 Tons</span></div>
                <div className="dr">Delta T <span className="dv" data-h="e-dt">16.1 °F</span></div>
                <div className="dr">Efficiency <span className="dv" data-h="e-eff">0.62 kW/T</span></div>
                <div className="dr">Overall HTC <span className="dv" data-h="e-htc">245 BTU/hr·ft²·°F</span></div>
              </div>
              <div className="blabel">Capacity Loading</div>
              <div className="btrack">
                <div className="bfill" data-h="e-bar" style={{ width: '78%' }} />
              </div>
            </div>
          </div>

          {/* CONDENSER */}
          <div className={pageCls('condenser')}>
            <div className="dcard">
              <h3>Condenser</h3>
              <div className="dgrid">
                <div className="dr">Leaving Condenser Liquid <span className="dv" data-h="c-lcl">93.1 °F</span></div>
                <div className="dr">Return Condenser Liquid <span className="dv" data-h="c-rcl">83.0 °F</span></div>
                <div className="dr">Refrigerant Temp <span className="dv" data-h="c-rt">94.2 °F</span></div>
                <div className="dr">Saturation Temp <span className="dv" data-h="c-st">95.8 °F</span></div>
                <div className="dr">Approach Temp <span className="dv" data-h="c-at">1.1 °F</span></div>
                <div className="dr">Refrigerant Pressure <span className="dv" data-h="c-rp">121.4 PSI</span></div>
                <div className="dr">Condenser Water Flow <span className="dv" data-h="c-fl">1560 GPM</span></div>
                <div className="dr">Subcooling <span className="dv" data-h="c-sub">4.7 °F</span></div>
                <div className="dr">Fouling Factor <span className="dv" data-h="c-ff">0.000094</span></div>
                <div className="dr">Overall HTC <span className="dv" data-h="c-htc">198 BTU/hr·ft²·°F</span></div>
              </div>
            </div>
            <div className="dcard">
              <h3>Condenser Performance</h3>
              <div className="dgrid">
                <div className="dr">Heat Rejection <span className="dv" data-h="c-hr">487 Tons</span></div>
                <div className="dr">Delta T <span className="dv" data-h="c-dt">10.1 °F</span></div>
                <div className="dr">LMTD <span className="dv" data-h="c-lm">3.2 °F</span></div>
                <div className="dr">Design Fouling Factor <span className="dv">0.000100</span></div>
              </div>
            </div>
          </div>

          {/* COMPRESSOR */}
          <div className={pageCls('compressor')}>
            <div className="dcard">
              <h3>Compressor</h3>
              <div className="dgrid">
                <div className="dr">Turbine Speed <span className="dv" data-h="p-spd">4067 RPM</span></div>
                <div className="dr">Guide Vane Position <span className="dv" data-h="p-vane">72 %</span></div>
                <div className="dr">Motor Current <span className="dv" data-h="p-amp">312 A</span></div>
                <div className="dr">Motor Power <span className="dv" data-h="p-kw">239 kW</span></div>
                <div className="dr">% Full Load Amps <span className="dv" data-h="p-fla">78 %</span></div>
                <div className="dr">Power Factor <span className="dv" data-h="p-pf">0.88</span></div>
                <div className="dr">Bearing Temp (Front) <span className="dv" data-h="p-bf">112.3 °F</span></div>
                <div className="dr">Bearing Temp (Rear) <span className="dv" data-h="p-br">108.9 °F</span></div>
                <div className="dr">Oil Pressure Differential <span className="dv" data-h="p-opdiff">28.4 PSID</span></div>
                <div className="dr">Oil Supply Temp <span className="dv" data-h="p-ot">118.6 °F</span></div>
                <div className="dr">Oil Sump Temp <span className="dv" data-h="p-os">132.4 °F</span></div>
                <div className="dr">Discharge Temp <span className="dv" data-h="p-disch">148.2 °F</span></div>
              </div>
            </div>
            <div className="dcard">
              <h3>Surge / Stall Monitor</h3>
              <div className="dgrid">
                <div className="dr">Surge Status <span className="dv grn" data-h="sg-st">Normal</span></div>
                <div className="dr">Surge Count (Trip) <span className="dv" data-h="sg-ct">0</span></div>
                <div className="dr">Anti-Surge Control <span className="dv grn">Active</span></div>
                <div className="dr">Stall Status <span className="dv grn">Normal</span></div>
              </div>
              <div className="blabel">Surge Margin</div>
              <div className="btrack">
                <div className="bfill" data-h="sg-bar" style={{ width: '61%' }} />
              </div>
            </div>
          </div>

          {/* STEAM */}
          <div className={pageCls('steam')}>
            <div className="dcard">
              <h3>Steam System</h3>
              <div className="dgrid">
                <div className="dr">Steam Supply Pressure <span className="dv" data-h="ss-p">115.0 PSI</span></div>
                <div className="dr">Steam Supply Temp <span className="dv" data-h="ss-t">338.1 °F</span></div>
                <div className="dr">Steam Mass Flow <span className="dv" data-h="ss-f">8200 lb/hr</span></div>
                <div className="dr">Turbine Inlet Pressure <span className="dv" data-h="ss-ip">113.4 PSI</span></div>
                <div className="dr">Turbine Inlet Temp <span className="dv" data-h="ss-it">336.2 °F</span></div>
                <div className="dr">Turbine Exhaust Pressure <span className="dv" data-h="ss-ep">4.8 PSI</span></div>
                <div className="dr">Turbine Exhaust Temp <span className="dv" data-h="ss-et">261.4 °F</span></div>
                <div className="dr">Throttle Valve Position <span className="dv" data-h="ss-tv">68 %</span></div>
                <div className="dr">Nozzle Valve 1 <span className="dv" data-h="ss-nv1">Open</span></div>
                <div className="dr">Nozzle Valve 2 <span className="dv" data-h="ss-nv2">Open</span></div>
              </div>
            </div>
            <div className="dcard">
              <h3>Turbine Governor</h3>
              <div className="dgrid">
                <div className="dr">Speed Setpoint <span className="dv blu" data-h="gv-sp">4100 RPM</span></div>
                <div className="dr">Actual Speed <span className="dv" data-h="gv-act">4067 RPM</span></div>
                <div className="dr">Speed Error <span className="dv amb" data-h="gv-err">-33 RPM</span></div>
                <div className="dr">Governor Output <span className="dv" data-h="gv-out">63 %</span></div>
                <div className="dr">Overspeed Trip SP <span className="dv">4500 RPM</span></div>
                <div className="dr">Min Speed Limit <span className="dv">2400 RPM</span></div>
                <div className="dr">Acceleration Limit <span className="dv">100 RPM/s</span></div>
                <div className="dr">Droop Setting <span className="dv">5.0 %</span></div>
              </div>
            </div>
          </div>

          {/* CAPACITY */}
          <div className={pageCls('capacity')}>
            <div className="dcard">
              <h3>Capacity Control</h3>
              <div className="dgrid">
                <div className="dr">Control Mode <span className="dv blu">LCL</span></div>
                <div className="dr">% Capacity <span className="dv" data-h="cc-pct">78 %</span></div>
                <div className="dr">IGV Position <span className="dv" data-h="cc-igv">72 %</span></div>
                <div className="dr">IGV Command <span className="dv" data-h="cc-cmd">74 %</span></div>
                <div className="dr">IGV Feedback <span className="dv" data-h="cc-fbk">71 %</span></div>
                <div className="dr">Hot Gas Bypass <span className="dv">Off</span></div>
                <div className="dr">Minimum Load Override <span className="dv">Off</span></div>
                <div className="dr">Ramp Rate <span className="dv">4 %/min</span></div>
              </div>
              <div className="blabel">IGV / Load</div>
              <div className="btrack">
                <div className="bfill" data-h="cc-bar" style={{ width: '78%' }} />
              </div>
            </div>
            <div className="dcard">
              <h3>Load Limiting</h3>
              <div className="dgrid">
                <div className="dr">Current Limit Setpoint <span className="dv" data-h="ll-lim">400 A</span></div>
                <div className="dr">Actual Motor Current <span className="dv" data-h="ll-act">312 A</span></div>
                <div className="dr">kW Limit <span className="dv" data-h="ll-kl">350 kW</span></div>
                <div className="dr">Actual Motor kW <span className="dv" data-h="ll-akw">239 kW</span></div>
                <div className="dr">Demand Limit Input <span className="dv">None</span></div>
                <div className="dr">Pulldown Mode <span className="dv grn">Active</span></div>
              </div>
            </div>
          </div>

          {/* SETPOINTS */}
          <div className={pageCls('setpoints')}>
            <div className="dcard" style={{ flex: 1 }}>
              <h3>Setpoints</h3>
              <SetpointRow label="Chilled Liquid Leaving Setpoint" inputRef={sp1Ref} defaultValue="44.0" step={0.5} unit="°F" min={36} max={60} delta={0.5} adj={adj} />
              <SetpointRow label="Leaving Chilled Liquid High Limit" inputRef={sp2Ref} defaultValue="65.0" step={0.5} unit="°F" min={50} max={80} delta={0.5} adj={adj} />
              <SetpointRow label="Low Chilled Liquid Cutout" inputRef={sp3Ref} defaultValue="36.0" step={0.5} unit="°F" min={32} max={42} delta={0.5} adj={adj} />
              <SetpointRow label="Condenser High Limit Setpoint" inputRef={sp4Ref} defaultValue="105.0" step={0.5} unit="°F" min={85} max={115} delta={0.5} adj={adj} />
              <SetpointRow label="Turbine Speed Setpoint" inputRef={sp5Ref} defaultValue="4100" step={50} unit="RPM" min={2000} max={5000} delta={50} adj={adj} />
              <SetpointRow label="Current Limit Setpoint" inputRef={sp6Ref} defaultValue="400" step={5} unit="A" min={100} max={450} delta={5} adj={adj} />
              <SetpointRow label="Anti-Recycle Timer" inputRef={sp7Ref} defaultValue="30" step={1} unit="min" min={15} max={60} delta={1} adj={adj} />
              <SetpointRow label="Low Oil Pressure Cutout" inputRef={sp8Ref} defaultValue="15" step={1} unit="PSID" min={8} max={25} delta={1} adj={adj} />
            </div>
          </div>

          {/* HISTORY */}
          <div className={pageCls('history')}>
            <div className="dcard" style={{ flex: 1 }}>
              <h3>Event History</h3>
              <table className="ht">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {HISTORY_ROWS.map((h, i) => (
                    <tr key={i}>
                      <td>{h.t}</td>
                      <td>{h.d}</td>
                      <td className={`ev${h.c}`}>{h.e}</td>
                      <td className={`ev${h.c}`}>{h.c === 'N' ? 'Normal' : h.c === 'W' ? 'Warning' : 'Fault'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rnav">
          {navItems.map((it) => (
            <button
              key={it.id}
              className={cls('rbtn', page === it.id)}
              onClick={() => goPage(it.id)}
              dangerouslySetInnerHTML={{ __html: it.br ? it.label.replace(' ', '<br/>') : it.label }}
            />
          ))}
        </div>
      </div>

      <div className="botbar">
        <button className="abtn abtn-sm" onClick={printScreen}>
          Print
        </button>
        <button className="abtn abtn-sm" onClick={doLogin}>
          Login
        </button>
        <div className="alarmzone">
          <span className="alok" data-h="alarmTxt">No Active Alarms</span>
        </div>
        <button className="abtn abtn-sm" onClick={() => goPage('history')}>
          History
        </button>
      </div>

      {modal && (
        <div className="modal show" onClick={() => setModal(null)}>
          <div className="mbox" onClick={(e) => e.stopPropagation()}>
            <h3>{modal.title}</h3>
            <p>{modal.body}</p>
            <button className="abtn" style={{ margin: '0 auto' }} onClick={() => setModal(null)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SetpointRowProps {
  label: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  defaultValue: string;
  step: number;
  unit: string;
  min: number;
  max: number;
  delta: number;
  adj: (ref: React.RefObject<HTMLInputElement | null>, d: number) => void;
}

function SetpointRow({ label, inputRef, defaultValue, step, unit, min, max, delta, adj }: SetpointRowProps) {
  return (
    <div className="sprow">
      <span>{label}</span>
      <div className="spctl">
        <button className="sarr" onClick={() => adj(inputRef, -delta)}>
          ▼
        </button>
        <input
          ref={inputRef}
          className="spinp"
          defaultValue={defaultValue}
          type="number"
          step={step}
          min={min}
          max={max}
        />
        <span className="spu">{unit}</span>
        <button className="sarr" onClick={() => adj(inputRef, delta)}>
          ▲
        </button>
      </div>
    </div>
  );
}
