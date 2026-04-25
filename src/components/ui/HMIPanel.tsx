/* React port of the York YK OptiView HMI screen.

   Renders the operator interface (top bar with status + clock + access
   level, animated process diagram on the home screen, programmatic data
   blocks for evaporator / condenser / compressor / oil sump / heat
   recovery / refrigerant level control, page-specific right-side blue
   arrow nav, page-specific bottom command row, setpoints, history and
   alarms).  All CSS is scoped under `.hmi-root`.

   Detail screens are rendered entirely from React/CSS — there are no
   reference PNGs in the runtime UI.  The visual design (colours, layout,
   button shapes) is matched against the york-optiview*.png references at
   assets/york-optiview/, but the screens themselves are built programmatically
   from the per-screen `blocks` declared in the SCREENS table below. */

import { useCallback, useEffect, useRef, useState } from 'react';

const LOGINS = ['View', 'Operator', 'Service'] as const;
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type PageKey =
  | 'home'
  | 'evaporator'
  | 'condenser'
  | 'compressor'
  | 'oilsump'
  | 'motor'
  | 'heatRecovery'
  | 'refrigerantLevel'
  | 'setpoints'
  | 'history';

const PAGE_LABELS: Record<PageKey, string> = {
  home: 'HOME SCREEN',
  evaporator: 'EVAPORATOR SCREEN',
  condenser: 'CONDENSER SCREEN',
  compressor: 'COMPRESSOR SCREEN',
  oilsump: 'OIL SUMP SCREEN',
  motor: 'MOTOR SCREEN',
  heatRecovery: 'HEAT RECOVERY SCREEN',
  refrigerantLevel: 'REFRIGERANT LEVEL CONTROL SCREEN',
  setpoints: 'SETPOINTS',
  history: 'HISTORY',
};

const HISTORY_ROWS = [
  { t: '2:05 PM', d: '18 Jun 2009', e: 'System Run — Chiller Online', c: 'N' },
  { t: '2:04 PM', d: '18 Jun 2009', e: 'Pre-lube Sequence Complete', c: 'N' },
  { t: '2:02 PM', d: '18 Jun 2009', e: 'Anti-Recycle Timer Satisfied', c: 'N' },
  { t: '2:01 PM', d: '18 Jun 2009', e: 'Start Command Received (Local)', c: 'N' },
  { t: '1:45 PM', d: '18 Jun 2009', e: 'System Stopped — Operator Command', c: 'N' },
  { t: '1:12 PM', d: '18 Jun 2009', e: 'High Condenser Pressure — Warning', c: 'W' },
  { t: '1:09 PM', d: '18 Jun 2009', e: 'High Condenser Pressure — Cleared', c: 'N' },
  { t: '9:22 AM', d: '18 Jun 2009', e: 'System Run — Chiller Online', c: 'N' },
  { t: '9:18 AM', d: '18 Jun 2009', e: 'Anti-Recycle Timer Satisfied', c: 'N' },
  { t: '8:55 PM', d: '17 Jun 2009', e: 'System Stopped — Normal Shutdown', c: 'N' },
  { t: '3:14 PM', d: '17 Jun 2009', e: 'Low Oil Pressure — Momentary', c: 'W' },
  { t: '3:14 PM', d: '17 Jun 2009', e: 'Low Oil Pressure — Cleared', c: 'N' },
  { t: '7:02 AM', d: '17 Jun 2009', e: 'System Run — Chiller Online', c: 'N' },
];

const HMI_CSS = `
.hmi-root,.hmi-root *{box-sizing:border-box;margin:0;padding:0}
.hmi-root{width:100%;height:100%;background:#b59a6e;font-family:'Arial',sans-serif;border:3px solid #444;display:flex;flex-direction:column;overflow:hidden;color:#fff;position:relative}

/* ── TOP BAR ── */
.hmi-root .topbar{background:#000;display:flex;min-height:84px;border-bottom:2px solid #1a1a1a;position:relative;z-index:10}
.hmi-root .tb-left{flex:1;padding:6px 12px 14px;display:flex;flex-direction:column;justify-content:space-between;border-right:2px solid #2a2a2a;position:relative;background:#1a1408;min-width:0}
.hmi-root .lbl-status,.hmi-root .lbl-details{color:#7a7060;font-size:10px;letter-spacing:2.5px;font-weight:bold;font-family:'Arial',sans-serif;text-transform:uppercase}
.hmi-root .lbl-details{margin-top:4px}
.hmi-root .run-txt{color:#00ff00;font-size:18px;font-weight:bold;letter-spacing:3px;text-shadow:0 0 8px #00aa00,0 0 2px #00ff00;margin-top:1px;font-family:'Arial Black','Arial',sans-serif}
.hmi-root .mode-txt{color:#00ff00;font-size:14px;font-weight:bold;letter-spacing:2px;text-shadow:0 0 6px #00aa00,0 0 2px #00ff00;margin-top:1px;font-family:'Arial Black','Arial',sans-serif}
.hmi-root .scr-tab{position:absolute;left:14px;bottom:-12px;background:#b59a6e;color:#1a1408;font-size:10px;font-weight:bold;letter-spacing:2px;padding:3px 22px 4px;border:2px solid #555;border-top:none;clip-path:polygon(8px 0,calc(100% - 8px) 0,100% 100%,0 100%);z-index:6;font-family:'Arial Black','Arial',sans-serif;white-space:nowrap}
.hmi-root .tb-mid{display:flex;align-items:stretch;background:#000}
.hmi-root .dt-cell{display:flex;flex-direction:column;border-right:2px solid #2a2a2a;min-width:108px}
.hmi-root .dt-lbl{background:#1a1408;color:#988064;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-weight:bold;padding:3px 8px 2px;text-align:center;font-family:'Arial',sans-serif}
.hmi-root .dt-val{flex:1;background:#fff;color:#1a1408;font-size:14px;font-weight:bold;padding:6px 10px;text-align:center;display:flex;align-items:center;justify-content:center;font-family:'Arial',sans-serif;border-top:1px solid #444}
.hmi-root .ctrl-cell{display:flex;flex-direction:column;border-right:2px solid #2a2a2a;min-width:108px}
.hmi-root .ctrl-lbl{background:#1a1408;color:#988064;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:bold;padding:2px 6px;text-align:center;font-family:'Arial',sans-serif}
.hmi-root .ctrl-val{background:#fff;color:#1a1408;font-size:12px;font-weight:bold;padding:3px 6px;text-align:center;font-family:'Arial',sans-serif;border-top:1px solid #444;flex:1;display:flex;align-items:center;justify-content:center}
.hmi-root .tb-right{padding:6px 0 6px 18px;display:flex;align-items:center;background:#000}

/* ── ARROW BUTTONS — york blue, chevrons pointing INTO the screen ── */
.hmi-root .abtn{display:inline-flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(180deg,#2470c8 0%,#1a5fb4 45%,#0d3d80 100%);border:2px solid #6aa0ec;border-left:none;color:#fff;font-family:'Arial Black','Arial',sans-serif;font-weight:900;font-size:13px;letter-spacing:0.4px;padding:9px 14px 9px 10px;cursor:pointer;min-width:104px;text-align:center;line-height:1.2;text-shadow:0 1px 2px rgba(0,0,40,0.7);box-shadow:inset 1px 0 0 rgba(255,255,255,0.2),inset 0 -2px 0 rgba(0,0,40,0.3)}
.hmi-root .abtn::before{content:'';position:absolute;left:-20px;top:-2px;bottom:-2px;width:22px;background:linear-gradient(180deg,#2470c8 0%,#1a5fb4 45%,#0d3d80 100%);border-top:2px solid #6aa0ec;border-bottom:2px solid #6aa0ec;border-left:2px solid #6aa0ec;clip-path:polygon(100% 0,0 50%,100% 100%);z-index:1}
.hmi-root .abtn:hover{background:linear-gradient(180deg,#2e7fdc 0%,#2470c8 45%,#1248a0 100%)}
.hmi-root .abtn:hover::before{background:linear-gradient(180deg,#2e7fdc 0%,#2470c8 45%,#1248a0 100%)}
.hmi-root .abtn.on{background:linear-gradient(180deg,#1248a0 0%,#0d3d80 45%,#08285a 100%);border-color:#88aaff}
.hmi-root .abtn.on::before{background:linear-gradient(180deg,#1248a0 0%,#0d3d80 45%,#08285a 100%);border-color:#88aaff}

/* Bottom-row buttons: chevron on the TOP pointing up into the page */
.hmi-root .abtn-up{display:inline-flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(90deg,#2470c8 0%,#1a5fb4 50%,#0d3d80 100%);border:2px solid #6aa0ec;border-top:none;color:#fff;font-family:'Arial Black','Arial',sans-serif;font-weight:900;font-size:13px;letter-spacing:0.3px;padding:8px 14px;cursor:pointer;min-width:80px;text-align:center;line-height:1.05;text-shadow:0 1px 2px rgba(0,0,40,0.7);box-shadow:inset 0 -1px 0 rgba(255,255,255,0.18),inset -2px 0 0 rgba(0,0,40,0.3)}
.hmi-root .abtn-up::before{content:'';position:absolute;top:-20px;left:-2px;right:-2px;height:22px;background:linear-gradient(90deg,#2470c8 0%,#1a5fb4 50%,#0d3d80 100%);border-left:2px solid #6aa0ec;border-right:2px solid #6aa0ec;border-top:2px solid #6aa0ec;clip-path:polygon(0 100%,50% 0,100% 100%);z-index:1}
.hmi-root .abtn-up:hover{background:linear-gradient(90deg,#2e7fdc 0%,#2470c8 50%,#1248a0 100%)}
.hmi-root .abtn-up:hover::before{background:linear-gradient(90deg,#2e7fdc 0%,#2470c8 50%,#1248a0 100%)}
.hmi-root .abtn-up.tall{padding:6px 14px}

.hmi-root .rbadge{display:inline-block;background:#000;border:1.5px inset #555;color:#fff;font-family:'Arial Black','Arial',sans-serif;font-weight:900;font-size:11px;padding:2px 8px;margin-left:6px;letter-spacing:0.5px;min-width:42px;text-align:center;text-shadow:none;box-shadow:inset 0 1px 2px rgba(0,0,0,0.7)}
.hmi-root .rled{display:inline-block;width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8888,#cc1111 55%,#440000);box-shadow:0 0 5px rgba(255,40,40,0.8),inset 0 -1px 1px rgba(0,0,0,0.4);border:1px solid #220000;margin-left:6px;vertical-align:middle}

/* ── MAIN LAYOUT ── */
.hmi-root .main{flex:1;display:flex;overflow:hidden;background:#b59a6e;min-height:0}
.hmi-root .center{flex:1;display:flex;flex-direction:column;padding:0;background:#b59a6e;position:relative;min-width:0;min-height:0}

/* Right nav — page-driven blue arrow buttons. */
.hmi-root .rnav{width:158px;background:#b59a6e;display:flex;flex-direction:column;padding:14px 0;justify-content:space-between;align-items:flex-end;flex-shrink:0}
.hmi-root .rbtn{display:flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(180deg,#2470c8 0%,#1a5fb4 45%,#0d3d80 100%);border:2px solid #6aa0ec;border-left:none;color:#fff;font-family:'Arial Black','Arial',sans-serif;font-weight:900;font-size:12px;letter-spacing:0.3px;padding:6px 8px 6px 4px;cursor:pointer;text-align:center;line-height:1.05;width:148px;min-height:34px;text-shadow:0 1px 2px rgba(0,0,40,0.7);box-shadow:inset 1px 0 0 rgba(255,255,255,0.2),inset 0 -2px 0 rgba(0,0,40,0.3)}
.hmi-root .rbtn::before{content:'';position:absolute;left:-20px;top:-2px;bottom:-2px;width:22px;background:linear-gradient(180deg,#2470c8 0%,#1a5fb4 45%,#0d3d80 100%);border-top:2px solid #6aa0ec;border-bottom:2px solid #6aa0ec;border-left:2px solid #6aa0ec;clip-path:polygon(100% 0,0 50%,100% 100%);z-index:1}
.hmi-root .rbtn:hover{background:linear-gradient(180deg,#2e7fdc 0%,#2470c8 45%,#1248a0 100%)}
.hmi-root .rbtn:hover::before{background:linear-gradient(180deg,#2e7fdc 0%,#2470c8 45%,#1248a0 100%)}
.hmi-root .rbtn.on{background:linear-gradient(180deg,#1248a0 0%,#0d3d80 45%,#08285a 100%);border-color:#88aaff}
.hmi-root .rbtn.on::before{background:linear-gradient(180deg,#1248a0 0%,#0d3d80 45%,#08285a 100%);border-color:#88aaff}
.hmi-root .rbtn .rbtn-lbl{flex:1;padding:0 2px}

/* ── HOME PAGE — overlay layout matching assets/york-optiview/york-optiview.png ── */
.hmi-root .home-stage{flex:1;position:relative;overflow:hidden;background:#b59a6e}
.hmi-root .home-stage canvas{position:absolute;inset:0;width:100%;height:100%}
.hmi-root .home-meta{position:absolute;top:18px;left:18px;display:flex;flex-direction:column;gap:14px;z-index:5}
.hmi-root .meta-row{display:flex;align-items:center;gap:10px;color:#fff;font-family:'Arial Black','Arial',sans-serif;font-size:14px;font-weight:900;letter-spacing:0.5px;text-shadow:1px 1px 2px rgba(0,0,0,0.85),-1px -1px 1px rgba(0,0,0,0.4),0 0 4px rgba(0,0,0,0.35)}
.hmi-root .meta-val{background:#000;border:1.5px inset #555;color:#00ffaa;font-family:'Courier New',monospace;font-weight:bold;font-size:14px;padding:2px 12px;min-width:80px;text-align:right;letter-spacing:1px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.8);text-shadow:0 0 4px rgba(0,255,170,0.4)}
.hmi-root .led{width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8888,#dd2020 55%,#660000);box-shadow:0 0 8px rgba(255,40,40,0.85),inset 0 -1px 2px rgba(0,0,0,0.5),inset 0 1px 2px rgba(255,200,200,0.6);border:1px solid #110000;margin-left:2px;display:inline-block}

.hmi-root .home-temps{position:absolute;left:0;right:0;bottom:14px;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:auto auto;gap:14px 8px;padding:0 22px;z-index:5;align-items:end;justify-items:center}
.hmi-root .tblock{display:flex;flex-direction:column;align-items:center;gap:3px}
.hmi-root .tblock.heating{grid-column:2;grid-row:1}
.hmi-root .tblock.chilled{grid-column:1;grid-row:2}
.hmi-root .tblock.cond{grid-column:3;grid-row:2}
.hmi-root .ttitle{color:#fff;font-family:'Arial Black','Arial',sans-serif;font-size:13px;font-weight:900;letter-spacing:0.3px;text-shadow:1px 1px 2px rgba(0,0,0,0.85),0 0 4px rgba(0,0,0,0.4);margin-bottom:3px;text-align:center;white-space:nowrap}
.hmi-root .tline{display:flex;align-items:center;gap:10px;color:#fff;font-family:'Arial Black','Arial',sans-serif;font-size:13px;font-weight:900;text-shadow:1px 1px 2px rgba(0,0,0,0.8)}
.hmi-root .tlabel{min-width:62px;text-align:right}
.hmi-root .tval{background:#000;border:1.5px inset #555;color:#00ffaa;font-family:'Courier New',monospace;font-weight:bold;font-size:13px;padding:1px 12px;min-width:90px;text-align:right;letter-spacing:1px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.8);text-shadow:0 0 4px rgba(0,255,170,0.4)}

/* ── PROGRAMMATIC DETAIL SCREENS — beige floor with data blocks ──
   Used by every non-home screen.  Rows of label + black-box / green-CRT
   value boxes, optional amber setpoints, optional red status LEDs and
   optional centered status pills, all on the same beige floor as Home. */
.hmi-root .det-stage{flex:1;background:linear-gradient(180deg,#9a7f54 0%,#b89c70 42%,#c4a878 55%,#d3b888 100%);padding:14px 18px;display:flex;flex-direction:column;gap:12px;overflow:auto}
.hmi-root .det-screen-title{color:#fff;font-family:'Arial Black','Arial',sans-serif;font-size:18px;letter-spacing:2.5px;text-shadow:1px 1px 2px rgba(0,0,0,0.7),0 0 6px rgba(0,0,0,0.4);text-transform:uppercase;display:flex;align-items:center;gap:14px;flex-shrink:0}
.hmi-root .det-screen-title .pill{background:#1a1408;color:#00ff66;padding:4px 14px;font-size:13px;letter-spacing:2px;border:1.5px solid #5e4f30;text-shadow:0 0 4px rgba(0,255,80,0.4)}
.hmi-root .det-blocks{display:flex;flex-wrap:wrap;gap:14px;align-content:flex-start}
.hmi-root .det-block{background:rgba(0,0,0,0.18);border:1.5px solid #5e4f30;padding:10px 12px;min-width:280px;flex:1 1 320px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08)}
.hmi-root .det-block-title{color:#1a1408;font-family:'Arial Black','Arial',sans-serif;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:1.5px solid #5e4f30}
.hmi-root .det-row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;gap:12px}
.hmi-root .det-row-lbl{color:#fff;font-family:'Arial Black','Arial',sans-serif;font-size:12px;font-weight:900;text-shadow:1px 1px 1px rgba(0,0,0,0.7);flex:1}
.hmi-root .det-row-val{background:#000;border:1.5px inset #555;color:#00ffaa;font-family:'Courier New',monospace;font-weight:bold;font-size:12px;padding:1px 10px;min-width:96px;text-align:right;box-shadow:inset 0 1px 2px rgba(0,0,0,0.8);text-shadow:0 0 4px rgba(0,255,170,0.4);letter-spacing:0.5px}
.hmi-root .det-row-val.amb{color:#ffbb00;text-shadow:0 0 4px rgba(255,187,0,0.4)}
.hmi-root .det-row-val.text{color:#fff;text-shadow:none;font-family:'Arial Black','Arial',sans-serif}
.hmi-root .det-row-led{width:11px;height:11px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff9090,#cc1010 55%,#440000);box-shadow:0 0 5px rgba(255,40,40,0.8),inset 0 -1px 1px rgba(0,0,0,0.4);border:1px solid #220000;display:inline-block;margin-right:8px;flex-shrink:0}
.hmi-root .det-row-led.dim{background:radial-gradient(circle at 35% 30%,#5a3030,#3a1010 55%,#1a0000);box-shadow:none}

/* ── FALLBACK CARD-STYLE PAGES (motor / setpoints / history) ── */
.hmi-root .page{display:none;flex-direction:column;gap:6px;flex:1;padding:8px 10px;background:#241c0e;overflow:auto}
.hmi-root .page.vis{display:flex}
.hmi-root .dcard{background:#030303;border:2px solid #2a2a2a;padding:8px 12px}
.hmi-root .dcard h3{color:#00ccff;font-size:10px;letter-spacing:2.5px;text-transform:uppercase;border-bottom:1px solid #111;padding-bottom:4px;margin-bottom:7px;font-family:'Arial',sans-serif}
.hmi-root .dgrid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.hmi-root .dr{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#888;gap:4px;font-weight:bold}
.hmi-root .dv{background:#000;border:1px solid #2a2a2a;color:#00ffaa;font-size:12px;font-weight:bold;padding:1px 5px;min-width:76px;text-align:right;white-space:nowrap;font-family:'Courier New',monospace}
.hmi-root .dv.grn{color:#00ff66}

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
.hmi-root .botbar{background:#b59a6e;border-top:none;display:flex;align-items:flex-end;padding:0 18px 0;gap:14px;min-height:54px;position:relative;z-index:7;flex-shrink:0}
.hmi-root .botbar .bb-left{display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap}
.hmi-root .botbar .bb-spacer{flex:1}
.hmi-root .alarmzone{position:absolute;left:50%;transform:translateX(-50%);top:6px;text-align:center;font-size:11px;font-weight:bold;letter-spacing:1px;font-family:'Arial Black','Arial',sans-serif;pointer-events:none}
.hmi-root .alok{color:#0a4a14;text-shadow:0 1px 1px rgba(255,255,255,0.4)}
.hmi-root .alwarn{color:#c01010;text-shadow:0 1px 1px rgba(255,255,255,0.4);animation:hmiBlink 0.8s step-end infinite}
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

function setText(root: HTMLElement | null, id: string, value: string) {
  if (!root) return;
  const el = root.querySelector<HTMLElement>(`[data-h="${id}"]`);
  if (el) el.textContent = value;
}

/* ── Right-nav and bottom-bar button definitions ── */
type RBtn = {
  label: string | string[];
  go?: PageKey;
  cmd?: string;
  badge?: string;
  ledOn?: boolean;
};
type BBtn = RBtn & { tall?: boolean };

/* ── Detail-screen data blocks ──
   Each row binds either a live data id (with optional default value and
   colour) OR a static text value, OR a red status LED.  Rows are rendered
   as `Label ............ [box]`, with optional LED before the label. */
type Row =
  | {
      kind: 'val';
      id?: string;
      label: string;
      defaultVal: string;
      amb?: boolean;       // amber digits for setpoints / limits
      text?: boolean;      // white Arial text instead of CRT digits
    }
  | { kind: 'led'; id?: string; label: string; on?: boolean };

type Block = { title?: string; rows: Row[] };

type ScreenDef = {
  label: string;
  /* special render mode: 'home' = canvas chiller scene, 'cards' = legacy
     dark-card layout (motor/setpoints/history), 'detail' = beige-floor
     programmatic blocks driven by `blocks` below. */
  kind: 'home' | 'cards' | 'detail';
  /* short subtitle shown in the title bar of detail screens. */
  subtitle?: string;
  rightNav: RBtn[];
  botBar: BBtn[];
  blocks?: Block[];
};

const NAV_HOME: RBtn = { label: 'Home', go: 'home' };

const BOT_DEFAULT: BBtn[] = [
  { label: 'Print', cmd: 'print' },
  { label: 'Logout', cmd: 'logout' },
  { label: ['Soft', 'Shutdown'], cmd: 'softShutdown', tall: true },
  { label: 'History', go: 'history' },
];

const SCREENS: Record<PageKey, ScreenDef> = {
  home: {
    label: 'HOME SCREEN',
    kind: 'home',
    rightNav: [
      { label: 'Evaporator', go: 'evaporator' },
      { label: 'Condenser', go: 'condenser' },
      { label: 'Compressor', go: 'compressor' },
      { label: 'Oil Sump', go: 'oilsump' },
      { label: 'Motor', go: 'motor' },
      { label: 'Setpoints', go: 'setpoints' },
      { label: 'History', go: 'history' },
    ],
    botBar: BOT_DEFAULT,
  },

  evaporator: {
    label: 'EVAPORATOR SCREEN',
    kind: 'detail',
    subtitle: 'Heat Pump · Heating Mode',
    rightNav: [
      NAV_HOME,
      { label: 'Heat Pump', cmd: 'modeHeatPump' },
      { label: 'Sensitivity', badge: 'Normal', cmd: 'cycleSensitivity' },
      { label: 'Smart Freeze', badge: 'Off', cmd: 'toggleSmartFreeze' },
    ],
    botBar: [
      { label: 'Setpoint', badge: '40.0 °F', cmd: 'spChwSetpoint' },
      { label: 'Range', badge: '30.0 °F', cmd: 'spRange' },
      { label: 'Shutdown', badge: '6.0 °F', cmd: 'spShutdown' },
      { label: 'Restart', badge: '0.0 °F', cmd: 'spRestart' },
      { label: 'Refrigerant', badge: 'Enabled', cmd: 'toggleRefrigerant' },
    ],
    blocks: [
      {
        title: 'Evaporator',
        rows: [
          { kind: 'val', id: 'e-lcl', label: 'Leaving Chilled Liquid Temperature', defaultVal: '44.0 °F' },
          { kind: 'val', id: 'e-rcl', label: 'Return Chilled Liquid Temperature', defaultVal: '56.0 °F' },
          { kind: 'val', id: 'e-stdiff', label: 'Evaporator Small Temp Difference', defaultVal: '1.5 °F' },
          { kind: 'val', id: 'e-pres', label: 'Evaporator Pressure', defaultVal: '37.5 PSIG' },
          { kind: 'val', id: 'e-satT', label: 'Evaporator Saturation Temperature', defaultVal: '42.5 °F' },
          { kind: 'val', id: 'e-refT', label: 'Evaporator Refrigerant Temperature', defaultVal: '42.5 °F' },
        ],
      },
      {
        title: 'Leaving Chilled Liquid Temperature Setpoints',
        rows: [
          { kind: 'val', label: 'Setpoint', defaultVal: '40.0 °F', amb: true },
          { kind: 'val', label: 'Remote Range', defaultVal: '30.0 °F', amb: true },
          { kind: 'val', label: 'Shutdown', defaultVal: '36.0 °F', amb: true },
          { kind: 'val', label: 'Effective Offset', defaultVal: '4.0 °F', amb: true },
          { kind: 'val', label: 'Restart', defaultVal: '40.0 °F', amb: true },
          { kind: 'val', label: 'Offset', defaultVal: '0.0 °F', amb: true },
        ],
      },
      {
        title: 'Status',
        rows: [
          { kind: 'val', label: 'Chilled Liquid Flow Switch', defaultVal: 'Closed', text: true },
          { kind: 'val', label: 'Chilled Liquid Pump', defaultVal: 'Run', text: true },
          { kind: 'val', label: 'Local Leaving Chilled Liquid Temperature', defaultVal: 'Auto', text: true },
          { kind: 'val', label: 'Leaving Chilled Liquid Temperature Cycling Offset', defaultVal: '0.0 °F', amb: true },
        ],
      },
    ],
  },

  condenser: {
    label: 'CONDENSER SCREEN',
    kind: 'detail',
    subtitle: 'Heat Pump · Heating Mode',
    rightNav: [
      NAV_HOME,
      { label: ['Refrigerant', 'Level Control'], go: 'refrigerantLevel' },
      { label: 'Heat Pump', go: 'heatRecovery' },
    ],
    botBar: [
      { label: 'Drop Leg', badge: 'Enabled', cmd: 'toggleDropLeg' },
      { label: ['High Pressure', 'Warning Threshold'], badge: '162.5 PSIG', cmd: 'spHighPress', tall: true },
    ],
    blocks: [
      {
        title: 'Condenser',
        rows: [
          { kind: 'val', id: 'c-rcl', label: 'Return Condenser Liquid Temperature', defaultVal: '85.2 °F' },
          { kind: 'val', id: 'c-lcl', label: 'Leaving Condenser Liquid Temperature', defaultVal: '95.1 °F' },
          { kind: 'val', id: 'c-satT', label: 'Condenser Saturation Temperature', defaultVal: '96.8 °F' },
          { kind: 'val', id: 'c-stdiff', label: 'Condenser Small Temp Difference', defaultVal: '1.7 °F' },
          { kind: 'val', id: 'c-pres', label: 'Condenser Pressure', defaultVal: '117.6 PSIG' },
        ],
      },
      {
        title: 'Refrigerant',
        rows: [
          { kind: 'val', label: 'Setpoint', defaultVal: '110.0 °F', amb: true },
          { kind: 'val', id: 'c-dropleg', label: 'Drop Leg Refrigerant Temperature', defaultVal: '75.5 °F' },
          { kind: 'val', id: 'c-subcool', label: 'Sub Cooling Temperature', defaultVal: '21.3 °F' },
        ],
      },
      {
        title: 'Status',
        rows: [
          { kind: 'val', label: 'High Pressure Switch', defaultVal: 'Closed', text: true },
          { kind: 'val', label: 'Condenser Liquid Flow Switch', defaultVal: 'Closed', text: true },
          { kind: 'val', label: 'Condenser Liquid Pump', defaultVal: 'Run', text: true },
          { kind: 'val', id: 'c-rlpos', label: 'Refrigerant Level Position', defaultVal: '50.1 %' },
          { kind: 'val', label: 'Refrigerant Level Setpoint', defaultVal: '50 %', amb: true },
        ],
      },
    ],
  },

  compressor: {
    label: 'COMPRESSOR SCREEN',
    kind: 'detail',
    rightNav: [
      NAV_HOME,
      { label: 'VSD Tuning', cmd: 'vsdTuning' },
      { label: 'Hot Gas', cmd: 'toggleHotGas' },
      { label: 'Surge', cmd: 'surgeWindow' },
    ],
    botBar: [
      { label: 'Open', cmd: 'pvOpen', ledOn: true },
      { label: 'Close', cmd: 'pvClose', ledOn: true },
      { label: 'Hold', cmd: 'pvHold' },
      { label: 'Auto', cmd: 'pvAuto' },
    ],
    blocks: [
      {
        title: 'Compressor',
        rows: [
          { kind: 'val', id: 'p-opdiff', label: 'Oil Pressure', defaultVal: '56.3 PSID' },
          { kind: 'val', id: 'p-os', label: 'Oil Sump Temperature', defaultVal: '142.5 °F' },
          { kind: 'val', id: 'p-disch', label: 'Discharge Temperature', defaultVal: '112.3 °F' },
          { kind: 'val', id: 'p-suph', label: 'Discharge Superheat', defaultVal: '35.1 °F' },
        ],
      },
      {
        title: 'Status',
        rows: [
          { kind: 'led', label: 'High Speed Thrust Bearing Limit Switch' },
          { kind: 'led', label: 'Vane Motor Switch' },
          { kind: 'led', label: 'Oil Return Solenoid' },
        ],
      },
      {
        title: 'Pre-Rotation Vanes',
        rows: [
          { kind: 'val', id: 'p-fla', label: '% Full Load Amps', defaultVal: '29 %' },
          { kind: 'val', id: 'p-vane', label: 'Pre-Rotation Vanes Position', defaultVal: '40 %' },
          { kind: 'val', id: 'p-hotgas', label: 'Hot Gas Bypass Valve Position', defaultVal: '0 %' },
          { kind: 'val', id: 'p-oilfreq', label: 'Oil Pump Drive Command Frequency', defaultVal: '25.0 Hz' },
          { kind: 'val', label: 'Pre-Rotation Vanes Control Mode', defaultVal: 'Auto', text: true },
        ],
      },
    ],
  },

  oilsump: {
    label: 'OIL SUMP SCREEN',
    kind: 'detail',
    rightNav: [
      NAV_HOME,
      { label: 'Standby Lube', badge: 'Disabled', cmd: 'toggleStandbyLube' },
      { label: 'Oil Return Min', badge: '95.0 °F', cmd: 'spOilReturnMin' },
      { label: ['Pressure', 'Setpoint'], badge: '35 PSID', cmd: 'spOilPress' },
      { label: 'Control Period', badge: '0.9 Sec', cmd: 'spControlPeriod' },
    ],
    botBar: [
      { label: 'Raise', cmd: 'oilRaise' },
      { label: 'Lower', cmd: 'oilLower' },
      { label: 'Set', cmd: 'oilSet' },
      { label: 'Auto', cmd: 'oilAuto' },
    ],
    blocks: [
      {
        title: 'Oil Sump',
        rows: [
          { kind: 'val', id: 'o-pdiff', label: 'Oil Pressure', defaultVal: '34.9 PSID' },
          { kind: 'val', id: 'o-sump', label: 'Oil Sump Temperature', defaultVal: '137.1 °F' },
          { kind: 'val', id: 'o-cnddiff', label: 'Oil – Saturated Condenser Temp. Differential', defaultVal: '40.3 °F' },
          { kind: 'val', id: 'o-pump', label: 'Pump Oil Pressure (HOP)', defaultVal: '72.1 PSIG' },
          { kind: 'val', id: 'o-sumpP', label: 'Sump Oil Pressure (LOP)', defaultVal: '37.1 PSIG' },
        ],
      },
      {
        title: 'Status',
        rows: [
          { kind: 'led', label: 'Oil Heater' },
          { kind: 'led', label: 'Oil Return Solenoid' },
          { kind: 'led', label: 'Oil Pump Run Output' },
        ],
      },
      {
        title: 'Oil Pump Control',
        rows: [
          { kind: 'val', id: 'o-freq', label: 'Oil Pump Drive Command Frequency', defaultVal: '25.0 Hz' },
          { kind: 'val', label: 'Setpoint Oil Pressure', defaultVal: '35 PSID', amb: true },
          { kind: 'val', label: 'Variable Speed Oil Pump Control Mode', defaultVal: 'Auto', text: true },
        ],
      },
    ],
  },

  heatRecovery: {
    label: 'HEAT RECOVERY SCREEN',
    kind: 'detail',
    rightNav: [
      NAV_HOME,
      { label: 'Condenser', go: 'condenser' },
      { label: ['Hot Water', 'Control'], badge: 'Enabled', cmd: 'toggleHotWater' },
      { label: ['Hot Water', 'Setpoint'], badge: '95.0 °F', cmd: 'spHotWater' },
      { label: ['Head Pressure', 'Setpoint'], badge: '30.0 PSID', cmd: 'spHeadPress' },
    ],
    botBar: [
      { label: ['Remote', 'Input Type'], badge: '0-10V', cmd: 'inputType' },
      { label: 'Type', badge: '0-10V', cmd: 'pidType' },
      { label: ['PID', 'Output'], badge: 'Direct', cmd: 'pidOutput' },
      { label: 'Set', cmd: 'cvSet' },
      { label: 'Auto', cmd: 'cvAuto' },
      { label: ['Change', 'Setpoints'], cmd: 'cvChangeSp', tall: true },
    ],
    blocks: [
      {
        title: 'Heating Condenser',
        rows: [
          { kind: 'val', id: 'hr-rhc', label: 'Return Heating Condenser Liquid Temperature', defaultVal: '85.0 °F' },
          { kind: 'val', id: 'hr-lhc', label: 'Leaving Heating Condenser Liquid Temperature', defaultVal: '95.3 °F' },
          { kind: 'val', label: 'Active Hot Water Setpoint', defaultVal: '103.6 °F', amb: true },
        ],
      },
      {
        title: 'Condenser',
        rows: [
          { kind: 'val', id: 'hr-rcl', label: 'Return Condenser Liquid Temperature', defaultVal: '85.0 °F' },
          { kind: 'val', id: 'hr-lcl', label: 'Leaving Condenser Liquid Temperature', defaultVal: '94.9 °F' },
        ],
      },
      {
        title: 'Pressure',
        rows: [
          { kind: 'val', id: 'hr-deltaP', label: 'Delta P', defaultVal: '80.0 PSID' },
          { kind: 'val', label: 'Head Pressure Setpoint', defaultVal: '30.0 PSID', amb: true },
        ],
      },
      {
        title: 'Flow Status',
        rows: [
          { kind: 'led', label: 'Heating Condenser Liquid Flow Switch' },
          { kind: 'led', label: 'Condenser Liquid Flow Switch' },
        ],
      },
      {
        title: 'PID Control',
        rows: [
          { kind: 'val', label: 'PID Control Mode', defaultVal: 'Inactive', text: true },
          { kind: 'val', label: 'Control Valve Output', defaultVal: '0.0 %' },
          { kind: 'val', label: 'Control Valve Control Mode', defaultVal: 'Auto', text: true },
        ],
      },
    ],
  },

  refrigerantLevel: {
    label: 'REFRIGERANT LEVEL CONTROL SCREEN',
    kind: 'detail',
    rightNav: [
      NAV_HOME,
      { label: 'Condenser', go: 'condenser' },
      { label: 'Setpoint', badge: '50 %', cmd: 'spRefLevel' },
      { label: 'Period', badge: '3.5 Sec', cmd: 'spPeriod' },
      { label: ['Proportion', 'Limit Open'], badge: '15 %', cmd: 'spPropOpen' },
      { label: ['Proportion', 'Limit Close'], badge: '45 %', cmd: 'spPropClose' },
      { label: ['Rate Limit', 'Open'], badge: '10 %', cmd: 'spRateOpen' },
      { label: ['Rate Limit', 'Close'], badge: '10 %', cmd: 'spRateClose' },
    ],
    botBar: [
      { label: 'Lower', cmd: 'rlLower', ledOn: true },
      { label: 'Raise', cmd: 'rlRaise', ledOn: true },
      { label: 'Hold', cmd: 'rlHold' },
      { label: 'Auto', cmd: 'rlAuto' },
    ],
    blocks: [
      {
        title: 'Refrigerant Level Control',
        rows: [
          { kind: 'val', id: 'rl-pos', label: 'Refrigerant Level Position', defaultVal: '50 %' },
          { kind: 'val', label: 'Refrigerant Level Control Mode', defaultVal: 'Auto', text: true },
        ],
      },
    ],
  },

  motor: {
    label: 'MOTOR SCREEN',
    kind: 'detail',
    rightNav: [
      NAV_HOME,
      { label: 'Setpoints', go: 'setpoints' },
      { label: 'History', go: 'history' },
    ],
    botBar: BOT_DEFAULT,
    blocks: [
      {
        title: 'Motor',
        rows: [
          { kind: 'val', id: 'm-amp',   label: 'Motor Current',        defaultVal: '132 A'    },
          { kind: 'val', id: 'm-kw',    label: 'Motor Power',          defaultVal: '101 kW'   },
          { kind: 'val', id: 'm-fla',   label: '% Full Load Amps',     defaultVal: '33 %'     },
          { kind: 'val',               label: 'Power Factor',           defaultVal: '0.88'     },
          { kind: 'val', id: 'm-volt',  label: 'Line Voltage',          defaultVal: '460 V'    },
          { kind: 'val', id: 'm-rpm',   label: 'Motor Speed',           defaultVal: '4067 RPM' },
          { kind: 'val', id: 'm-runtime', label: 'Total Run Time',      defaultVal: '13 Hr'    },
          { kind: 'val',               label: 'Number of Starts',       defaultVal: '147'      },
        ],
      },
      {
        title: 'Winding Temperatures',
        rows: [
          { kind: 'val', id: 'm-windT',  label: 'Winding Temp Phase A', defaultVal: '189.4 °F' },
          { kind: 'val', id: 'm-windT2', label: 'Winding Temp Phase B', defaultVal: '187.1 °F' },
          { kind: 'val', id: 'm-windT3', label: 'Winding Temp Phase C', defaultVal: '191.2 °F' },
          { kind: 'val',                label: 'High Winding Temp Trip', defaultVal: '266 °F', amb: true },
        ],
      },
      {
        title: 'Motor Protection',
        rows: [
          { kind: 'val', label: 'Overload Trip Setting', defaultVal: '115 %', amb: true },
          { kind: 'val', label: 'Motor Cooling',   defaultVal: 'Normal',  text: true },
          { kind: 'val', label: 'Phase Loss',       defaultVal: 'Normal',  text: true },
          { kind: 'val', label: 'Phase Imbalance',  defaultVal: 'Normal',  text: true },
        ],
      },
    ],
  },

  setpoints: {
    label: 'SETPOINTS',
    kind: 'cards',
    rightNav: [NAV_HOME, { label: 'History', go: 'history' }],
    botBar: BOT_DEFAULT,
  },

  history: {
    label: 'HISTORY',
    kind: 'cards',
    rightNav: [NAV_HOME, { label: 'Setpoints', go: 'setpoints' }],
    botBar: [
      { label: 'Print', cmd: 'print' },
      { label: 'Logout', cmd: 'logout' },
      { label: ['Soft', 'Shutdown'], cmd: 'softShutdown', tall: true },
    ],
  },
};

export function HMIPanel() {
  const [page, setPage] = useState<PageKey>('home');
  const [accessIdx, setAccessIdx] = useState(2);
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

  /* Live clock. */
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

  /* Animated chiller render on the home stage. */
  useEffect(() => {
    if (page !== 'home') return;
    const cv = canvasRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    if (!cx) return;

    let W = 0;
    let H = 0;
    const rsz = () => {
      const w = cv.parentElement;
      if (!w) return;
      const dpr = window.devicePixelRatio || 1;
      const cw = w.clientWidth;
      const ch = w.clientHeight;
      cv.width = Math.floor(cw * dpr);
      cv.height = Math.floor(ch * dpr);
      cv.style.width = cw + 'px';
      cv.style.height = ch + 'px';
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = cw;
      H = ch;
    };
    rsz();
    const ro = new ResizeObserver(rsz);
    if (cv.parentElement) ro.observe(cv.parentElement);

    let angle = 0;
    let raf = 0;

    const shellGradient = (x: number, y: number, _w: number, h: number) => {
      const g = cx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, '#7ed05a');
      g.addColorStop(0.22, '#46a838');
      g.addColorStop(0.55, '#2c8a2c');
      g.addColorStop(0.85, '#155215');
      g.addColorStop(1, '#0a2e0a');
      return g;
    };

    const drawShell = (cxn: number, cyn: number, len: number, rad: number) => {
      const x0 = cxn - len / 2;
      const x1 = cxn + len / 2;
      cx.beginPath();
      cx.moveTo(x0 + rad * 0.18, cyn - rad);
      cx.lineTo(x1 - rad * 0.18, cyn - rad);
      cx.quadraticCurveTo(x1 + rad * 0.05, cyn - rad, x1 + rad * 0.18, cyn - rad * 0.6);
      cx.lineTo(x1 + rad * 0.18, cyn + rad * 0.6);
      cx.quadraticCurveTo(x1 + rad * 0.05, cyn + rad, x1 - rad * 0.18, cyn + rad);
      cx.lineTo(x0 + rad * 0.18, cyn + rad);
      cx.quadraticCurveTo(x0 - rad * 0.05, cyn + rad, x0 - rad * 0.18, cyn + rad * 0.6);
      cx.lineTo(x0 - rad * 0.18, cyn - rad * 0.6);
      cx.quadraticCurveTo(x0 - rad * 0.05, cyn - rad, x0 + rad * 0.18, cyn - rad);
      cx.closePath();
      cx.fillStyle = shellGradient(x0, cyn - rad, len, rad * 2);
      cx.fill();
      cx.strokeStyle = '#0e3a0e';
      cx.lineWidth = 1.4;
      cx.stroke();

      const sheen = cx.createLinearGradient(0, cyn - rad, 0, cyn - rad * 0.4);
      sheen.addColorStop(0, 'rgba(255,255,255,0.35)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = sheen;
      cx.fillRect(x0 + 6, cyn - rad + 1, len - 12, rad * 0.6);

      cx.beginPath();
      cx.moveTo(x0 + 6, cyn + rad * 0.05);
      cx.lineTo(x1 - 6, cyn + rad * 0.05);
      cx.strokeStyle = 'rgba(0,0,0,0.18)';
      cx.lineWidth = 1;
      cx.stroke();

      const capR = cx.createRadialGradient(x1 + 4, cyn - rad * 0.3, 1, x1, cyn, rad);
      capR.addColorStop(0, '#7fcd5a');
      capR.addColorStop(0.55, '#1f7a1f');
      capR.addColorStop(1, '#072807');
      cx.beginPath();
      cx.ellipse(x1, cyn, rad * 0.32, rad, 0, 0, Math.PI * 2);
      cx.fillStyle = capR;
      cx.fill();
      cx.strokeStyle = '#0e3a0e';
      cx.lineWidth = 1.2;
      cx.stroke();
    };

    const drawSupports = (cxn: number, cyn: number, len: number, rad: number) => {
      const sw = rad * 0.6;
      const sh = rad * 1.0;
      cx.fillStyle = '#1f5e1f';
      cx.strokeStyle = '#0a3d0a';
      cx.lineWidth = 1;
      [cxn - len * 0.3, cxn + len * 0.3].forEach((sx) => {
        cx.beginPath();
        cx.moveTo(sx - sw / 2, cyn + rad * 0.55);
        cx.lineTo(sx + sw / 2, cyn + rad * 0.55);
        cx.lineTo(sx + sw / 2 + sh * 0.4, cyn + rad + sh);
        cx.lineTo(sx - sw / 2 - sh * 0.4, cyn + rad + sh);
        cx.closePath();
        const sg = cx.createLinearGradient(sx, cyn + rad * 0.55, sx, cyn + rad + sh);
        sg.addColorStop(0, '#2a7a2a');
        sg.addColorStop(1, '#0a3010');
        cx.fillStyle = sg;
        cx.fill();
        cx.stroke();
      });
    };

    const drawWaterBox = (cxn: number, cyn: number, len: number, rad: number) => {
      const bw = rad * 0.85;
      const bh = rad * 2.65;
      const bx = cxn - len / 2 - bw + rad * 0.05;
      const by = cyn - bh / 2;

      cx.fillStyle = 'rgba(0,0,0,0.18)';
      cx.beginPath();
      cx.roundRect(bx + 2, by + 4, bw + 6, bh, 4);
      cx.fill();

      cx.beginPath();
      cx.roundRect(bx, by, bw, bh, 4);
      const wbg = cx.createLinearGradient(bx, by, bx + bw, by);
      wbg.addColorStop(0, '#0a3a0a');
      wbg.addColorStop(0.45, '#2a8a2a');
      wbg.addColorStop(1, '#0d4810');
      cx.fillStyle = wbg;
      cx.fill();
      cx.strokeStyle = '#072807';
      cx.lineWidth = 1.4;
      cx.stroke();

      cx.beginPath();
      cx.roundRect(bx - 4, by - 4, bw + 8, bh + 8, 5);
      cx.strokeStyle = '#0a3d0a';
      cx.lineWidth = 1;
      cx.stroke();

      const noz = 3;
      const nw = bw * 1.5;
      const nh = (bh / (noz + 1)) * 0.55;
      for (let i = 0; i < noz; i++) {
        const ny = by + (bh / (noz + 1)) * (i + 1) - nh / 2;
        const nx = bx - nw + 4;

        cx.fillStyle = 'rgba(0,0,0,0.25)';
        cx.beginPath();
        cx.roundRect(nx + 2, ny + 4, nw + 8, nh, 4);
        cx.fill();

        cx.beginPath();
        cx.roundRect(nx, ny, nw, nh, nh * 0.45);
        const ng = cx.createLinearGradient(nx, ny, nx, ny + nh);
        ng.addColorStop(0, '#a0d6ff');
        ng.addColorStop(0.45, '#2a7ae0');
        ng.addColorStop(1, '#0a2e6e');
        cx.fillStyle = ng;
        cx.fill();
        cx.strokeStyle = '#06204c';
        cx.lineWidth = 1;
        cx.stroke();

        cx.beginPath();
        cx.roundRect(nx - 5, ny - 3, 7, nh + 6, 1.5);
        const fg = cx.createLinearGradient(nx - 5, ny, nx + 2, ny);
        fg.addColorStop(0, '#3a78c8');
        fg.addColorStop(1, '#0a2e6e');
        cx.fillStyle = fg;
        cx.fill();
        cx.stroke();

        cx.fillStyle = '#020a18';
        cx.beginPath();
        cx.ellipse(nx - 1, ny + nh / 2, 1.6, nh / 2 - 2, 0, 0, Math.PI * 2);
        cx.fill();
      }
    };

    const drawCompressor = (cxn: number, cyn: number, len: number, rad: number) => {
      cx.lineCap = 'round';
      cx.lineJoin = 'round';

      const cmpY = cyn - rad * 2.2;
      const cmpCenterX = cxn + len * 0.05;
      const motorL = len * 0.42;
      const motorR = rad * 0.55;
      const voluteR = rad * 0.95;

      const elbowStartX = cxn - len * 0.42;
      const elbowStartY = cyn - rad * 0.8;
      cx.beginPath();
      cx.moveTo(elbowStartX, elbowStartY);
      cx.bezierCurveTo(
        elbowStartX,
        cmpY - rad * 0.4,
        cmpCenterX - motorL / 2 - voluteR * 0.4,
        cmpY - voluteR * 0.6,
        cmpCenterX - motorL / 2 - voluteR * 0.05,
        cmpY,
      );
      cx.strokeStyle = '#1a6a1a';
      cx.lineWidth = rad * 0.55;
      cx.stroke();
      cx.beginPath();
      cx.moveTo(elbowStartX - rad * 0.14, elbowStartY);
      cx.bezierCurveTo(
        elbowStartX - rad * 0.14,
        cmpY - rad * 0.5,
        cmpCenterX - motorL / 2 - voluteR * 0.55,
        cmpY - voluteR * 0.75,
        cmpCenterX - motorL / 2 - voluteR * 0.2,
        cmpY - rad * 0.18,
      );
      cx.strokeStyle = 'rgba(170,240,170,0.55)';
      cx.lineWidth = rad * 0.13;
      cx.stroke();

      cx.beginPath();
      cx.moveTo(cmpCenterX + motorL * 0.1, cmpY + motorR * 0.6);
      cx.bezierCurveTo(
        cmpCenterX + motorL * 0.1,
        cmpY + motorR * 1.4,
        cxn + len * 0.18,
        cyn - rad * 1.4,
        cxn + len * 0.18,
        cyn - rad * 0.85,
      );
      cx.strokeStyle = '#1a6a1a';
      cx.lineWidth = rad * 0.45;
      cx.stroke();

      cx.save();
      cx.translate(cmpCenterX, cmpY);
      cx.fillStyle = 'rgba(0,0,0,0.25)';
      cx.beginPath();
      cx.ellipse(0, motorR + rad * 1.1, motorL / 2, rad * 0.16, 0, 0, Math.PI * 2);
      cx.fill();

      cx.beginPath();
      cx.roundRect(-motorL / 2, -motorR, motorL, motorR * 2, motorR * 0.35);
      const mg = cx.createLinearGradient(0, -motorR, 0, motorR);
      mg.addColorStop(0, '#7ed05a');
      mg.addColorStop(0.4, '#3aa033');
      mg.addColorStop(0.85, '#155515');
      mg.addColorStop(1, '#0a2e0a');
      cx.fillStyle = mg;
      cx.fill();
      cx.strokeStyle = '#0e3a0e';
      cx.lineWidth = 1.2;
      cx.stroke();

      cx.fillStyle = 'rgba(255,255,255,0.18)';
      cx.beginPath();
      cx.roundRect(-motorL / 2 + 4, -motorR + 1, motorL - 8, motorR * 0.55, motorR * 0.2);
      cx.fill();

      const finCount = Math.max(8, Math.floor(motorL / 8));
      for (let i = 1; i < finCount; i++) {
        const fx = -motorL / 2 + (motorL / finCount) * i;
        cx.beginPath();
        cx.moveTo(fx, -motorR + 4);
        cx.lineTo(fx, motorR - 4);
        cx.strokeStyle = 'rgba(0,0,0,0.22)';
        cx.lineWidth = 0.8;
        cx.stroke();
      }

      cx.beginPath();
      cx.ellipse(motorL / 2, 0, motorR * 0.22, motorR, 0, 0, Math.PI * 2);
      cx.fillStyle = '#1a6a1a';
      cx.fill();
      cx.strokeStyle = '#0a3d0a';
      cx.stroke();

      cx.restore();

      const voluteX = cmpCenterX - motorL / 2 - voluteR * 0.45;
      const voluteY = cmpY + voluteR * 0.05;
      cx.beginPath();
      cx.arc(voluteX, voluteY, voluteR, 0, Math.PI * 2);
      const vg = cx.createRadialGradient(voluteX - voluteR * 0.35, voluteY - voluteR * 0.35, 1, voluteX, voluteY, voluteR);
      vg.addColorStop(0, '#9adf6a');
      vg.addColorStop(0.55, '#2f9333');
      vg.addColorStop(1, '#072807');
      cx.fillStyle = vg;
      cx.fill();
      cx.strokeStyle = '#0e3a0e';
      cx.lineWidth = 1.4;
      cx.stroke();

      cx.beginPath();
      cx.arc(voluteX, voluteY, voluteR * 0.65, 0, Math.PI * 2);
      cx.strokeStyle = 'rgba(0,0,0,0.25)';
      cx.lineWidth = 1;
      cx.stroke();

      const blades = 7;
      for (let i = 0; i < blades; i++) {
        const a = angle * 1.8 + (i * 2 * Math.PI) / blades;
        cx.beginPath();
        cx.moveTo(voluteX, voluteY);
        cx.lineTo(voluteX + Math.cos(a) * voluteR * 0.55, voluteY + Math.sin(a) * voluteR * 0.55);
        cx.strokeStyle = `rgba(180,255,180,${0.25 + Math.abs(Math.sin(a)) * 0.4})`;
        cx.lineWidth = 2.2;
        cx.stroke();
      }
      cx.beginPath();
      cx.arc(voluteX, voluteY, voluteR * 0.16, 0, Math.PI * 2);
      cx.fillStyle = '#0a3010';
      cx.fill();
    };

    const drawHmiBox = (cxn: number, cyn: number, rad: number) => {
      const pw = rad * 1.3;
      const ph = rad * 1.05;
      const px = cxn - pw / 2;
      const py = cyn - ph * 0.18;

      cx.fillStyle = 'rgba(0,0,0,0.35)';
      cx.beginPath();
      cx.roundRect(px + 2, py + 3, pw, ph, 4);
      cx.fill();

      cx.fillStyle = '#0a0a14';
      cx.beginPath();
      cx.roundRect(px, py, pw, ph, 3);
      cx.fill();
      cx.strokeStyle = '#3a78c8';
      cx.lineWidth = 1.4;
      cx.stroke();

      const dw = pw - 8;
      const dh = ph * 0.62;
      cx.fillStyle = '#001e4a';
      cx.beginPath();
      cx.roundRect(px + 4, py + 4, dw, dh, 2);
      cx.fill();

      cx.fillStyle = '#1167cc';
      cx.font = `bold ${Math.max(7, rad * 0.22)}px Arial`;
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText('YORK', px + pw / 2, py + 4 + dh * 0.32);
      cx.fillStyle = '#00ee88';
      cx.font = `bold ${Math.max(6, rad * 0.16)}px "Courier New"`;
      cx.fillText('OptiView', px + pw / 2, py + 4 + dh * 0.62);

      cx.fillStyle = '#1a1a1a';
      cx.fillRect(px + 4, py + ph * 0.7, dw, ph * 0.18);
      cx.fillStyle = '#666';
      cx.font = `${Math.max(5, rad * 0.13)}px Arial`;
      cx.fillText('YK CENTRIFUGAL', px + pw / 2, py + ph * 0.79);
    };

    const draw = () => {
      cx.clearRect(0, 0, W, H);

      const wallG = cx.createLinearGradient(0, 0, 0, H);
      wallG.addColorStop(0, '#9a7f54');
      wallG.addColorStop(0.42, '#b89c70');
      wallG.addColorStop(0.55, '#c4a878');
      wallG.addColorStop(1, '#d3b888');
      cx.fillStyle = wallG;
      cx.fillRect(0, 0, W, H);

      cx.fillStyle = 'rgba(80,55,25,0.15)';
      cx.fillRect(0, H * 0.5, W, 1.5);

      cx.fillStyle = 'rgba(80,55,25,0.06)';
      for (let i = 0; i < 22; i++) {
        cx.fillRect(0, H * 0.55 + i * Math.max(4, (H * 0.45) / 22), W, 1);
      }

      const len = Math.min(W * 0.62, 480);
      const rad = Math.min(H * 0.18, len * 0.2);
      const cxn = W * 0.54;
      const cyn = H * 0.5 + rad * 0.6;

      cx.fillStyle = 'rgba(0,0,0,0.28)';
      cx.beginPath();
      cx.ellipse(cxn, cyn + rad * 1.85, len * 0.62, rad * 0.18, 0, 0, Math.PI * 2);
      cx.fill();
      cx.fillStyle = 'rgba(0,0,0,0.15)';
      cx.beginPath();
      cx.ellipse(cxn, cyn + rad * 1.95, len * 0.74, rad * 0.12, 0, 0, Math.PI * 2);
      cx.fill();

      drawCompressor(cxn, cyn, len, rad);
      drawShell(cxn, cyn, len, rad);
      drawSupports(cxn, cyn, len, rad);
      drawWaterBox(cxn, cyn, len, rad);
      drawHmiBox(cxn, cyn, rad);
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
  }, [page]);

  /* Simulation loop. */
  useEffect(() => {
    const root = rootRef.current;
    const S = {
      chwL: 44.0,
      chwR: 56.2,
      cndL: 95.1,
      cndR: 85.2,
      hcndL: 95.3,
      hcndR: 85.0,
      rpm: 4067,
      hrs: 13,
      load: 33.0,
      igv: 38.0,
      oilT: 137.1,
      bearF: 112.3,
      bearR: 108.9,
      oilP: 56.3,
      oilSumpP: 37.1,
      oilPumpP: 72.1,
      amps: 132,
      kw: 101,
      throttle: 32,
      rlPos: 50.1,
      tick: 0,
    };

    const sim = () => {
      S.tick++;
      S.chwL = jit(S.chwL, 0.06, 43.0, 45.0);
      S.chwR = jit(S.chwR, 0.08, 55.0, 57.5);
      S.cndL = jit(S.cndL, 0.1, 94.0, 96.5);
      S.cndR = jit(S.cndR, 0.07, 84.0, 86.5);
      S.hcndL = jit(S.hcndL, 0.08, 94.5, 96.5);
      S.hcndR = jit(S.hcndR, 0.06, 84.0, 86.0);
      S.rpm += Math.round((Math.random() - 0.5) * 12);
      S.rpm = Math.max(3950, Math.min(4180, S.rpm));
      S.load = jit(S.load, 0.4, 28, 40, 1);
      S.amps = Math.round(S.load * 4.02);
      S.kw = Math.round(S.load * 3.06);
      S.igv = jit(S.igv, 0.3, 32, 48, 1);
      S.oilT = jit(S.oilT, 0.06, 132, 142);
      S.bearF = jit(S.bearF, 0.04, 110, 116);
      S.bearR = jit(S.bearR, 0.04, 107, 113);
      S.oilP = jit(S.oilP, 0.1, 54, 58);
      S.oilSumpP = jit(S.oilSumpP, 0.1, 35, 39);
      S.oilPumpP = jit(S.oilPumpP, 0.15, 70, 74);
      S.rlPos = jit(S.rlPos, 0.2, 48, 52);
      S.throttle = jit(S.throttle, 0.3, 28, 38, 1);
      if (S.tick % 120 === 0) S.hrs++;

      /* Home overlays */
      setText(root, 'h-fla', Math.round(S.load) + ' %');
      setText(root, 'h-hrs', S.hrs + ' Hr');
      setText(root, 'h-chwL', S.chwL.toFixed(1) + ' °F');
      setText(root, 'h-chwR', S.chwR.toFixed(1) + ' °F');
      setText(root, 'h-cndL', S.cndL.toFixed(1) + ' °F');
      setText(root, 'h-cndR', S.cndR.toFixed(1) + ' °F');
      setText(root, 'h-hcndL', S.hcndL.toFixed(1) + ' °F');
      setText(root, 'h-hcndR', S.hcndR.toFixed(1) + ' °F');

      /* Evaporator */
      const eSatT = S.chwL - 1.5;
      setText(root, 'e-lcl', S.chwL.toFixed(1) + ' °F');
      setText(root, 'e-rcl', S.chwR.toFixed(1) + ' °F');
      setText(root, 'e-stdiff', '1.5 °F');
      setText(root, 'e-pres', (37.5 + (eSatT - 42.5) * 0.25).toFixed(1) + ' PSIG');
      setText(root, 'e-satT', eSatT.toFixed(1) + ' °F');
      setText(root, 'e-refT', eSatT.toFixed(1) + ' °F');

      /* Condenser */
      const cSatT = S.cndL + 1.7;
      setText(root, 'c-lcl', S.cndL.toFixed(1) + ' °F');
      setText(root, 'c-rcl', S.cndR.toFixed(1) + ' °F');
      setText(root, 'c-satT', cSatT.toFixed(1) + ' °F');
      setText(root, 'c-stdiff', '1.7 °F');
      setText(root, 'c-pres', (117.6 + (S.cndL - 95.1) * 0.55).toFixed(1) + ' PSIG');
      setText(root, 'c-dropleg', (75.5 + Math.random() * 0.6).toFixed(1) + ' °F');
      setText(root, 'c-subcool', (21.3 + Math.random() * 0.4).toFixed(1) + ' °F');
      setText(root, 'c-rlpos', S.rlPos.toFixed(1) + ' %');

      /* Compressor */
      setText(root, 'p-opdiff', S.oilP.toFixed(1) + ' PSID');
      setText(root, 'p-os', S.oilT.toFixed(1) + ' °F');
      setText(root, 'p-disch', (S.cndL + 17.2).toFixed(1) + ' °F');
      setText(root, 'p-suph', (35.1 + Math.random() * 0.4).toFixed(1) + ' °F');
      setText(root, 'p-fla', Math.round(S.load) + ' %');
      setText(root, 'p-vane', Math.round(S.igv) + ' %');
      setText(root, 'p-hotgas', '0 %');
      setText(root, 'p-oilfreq', '25.0 Hz');

      /* Oil sump */
      setText(root, 'o-pdiff', S.oilP.toFixed(1) + ' PSID');
      setText(root, 'o-sump', S.oilT.toFixed(1) + ' °F');
      setText(root, 'o-cnddiff', (S.oilT - cSatT).toFixed(1) + ' °F');
      setText(root, 'o-pump', S.oilPumpP.toFixed(1) + ' PSIG');
      setText(root, 'o-sumpP', S.oilSumpP.toFixed(1) + ' PSIG');
      setText(root, 'o-freq', '25.0 Hz');

      /* Heat recovery */
      setText(root, 'hr-rhc', S.hcndR.toFixed(1) + ' °F');
      setText(root, 'hr-lhc', S.hcndL.toFixed(1) + ' °F');
      setText(root, 'hr-rcl', S.cndR.toFixed(1) + ' °F');
      setText(root, 'hr-lcl', S.cndL.toFixed(1) + ' °F');
      setText(root, 'hr-deltaP', (80 + Math.random() * 0.8).toFixed(1) + ' PSID');

      /* Refrigerant level */
      setText(root, 'rl-pos', S.rlPos.toFixed(0) + ' %');

      /* Motor card layout */
      setText(root, 'm-amp', S.amps + ' A');
      setText(root, 'm-kw', S.kw + ' kW');
      setText(root, 'm-fla', Math.round(S.load) + ' %');
      setText(root, 'm-volt', '460 V');
      setText(root, 'm-windT', (188 + Math.random() * 6).toFixed(1) + ' °F');
      setText(root, 'm-windT2', (185 + Math.random() * 6).toFixed(1) + ' °F');
      setText(root, 'm-windT3', (190 + Math.random() * 6).toFixed(1) + ' °F');
      setText(root, 'm-rpm', S.rpm + ' RPM');
      setText(root, 'm-runtime', S.hrs + ' Hr');

      const sp3v = parseFloat(sp3Ref.current?.value ?? '36.0') || 36.0;
      const sp4v = parseFloat(sp4Ref.current?.value ?? '105.0') || 105.0;
      const al = root?.querySelector<HTMLSpanElement>('[data-h="alarmTxt"]');
      if (al) {
        if (S.chwL < sp3v + 0.5) {
          al.textContent = 'FAULT — LOW CHILLED LIQUID TEMP CUTOUT APPROACHING';
          al.className = 'alarmzone alwarn';
        } else if (S.cndL > sp4v - 3) {
          al.textContent = 'WARNING — HIGH CONDENSER LIQUID TEMP';
          al.className = 'alarmzone alwarn';
        } else {
          al.textContent = 'No Active Alarms';
          al.className = 'alarmzone alok';
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

  const doLogout = useCallback(() => {
    setAccessIdx(0);
    setModal({
      title: 'Logout',
      body: 'Access level reset to: View\n\nRead-only view access. No changes permitted.',
    });
  }, []);

  const doSoftShutdown = useCallback(() => {
    setModal({
      title: 'Soft Shutdown',
      body:
        'Soft shutdown sequence initiated.\n\nCompressor unloading IGVs to minimum position. Oil pump will continue post-lube cycle for 60 seconds after stop.',
    });
  }, []);

  const printScreen = useCallback(() => {
    setModal({
      title: 'Print',
      body: `Sending screen capture to configured printer port LPT1...\n\nPage: ${PAGE_LABELS[page] ?? page}`,
    });
  }, [page]);

  const fireCmd = useCallback(
    (cmd: string, label: string) => {
      switch (cmd) {
        case 'print':
          printScreen();
          return;
        case 'logout':
          doLogout();
          return;
        case 'softShutdown':
          doSoftShutdown();
          return;
        default:
          setModal({
            title: label,
            body: `Command "${label}" issued.\n\nThis is a simulated control — on a live York OptiView panel this would change the corresponding setpoint or operating mode.`,
          });
      }
    },
    [printScreen, doLogout, doSoftShutdown],
  );

  const accessLevel = LOGINS[accessIdx];
  const screenDef = SCREENS[page];

  const cls = (base: string, on?: boolean) => (on ? `${base} on` : base);

  const renderBtnLabel = (label: string | string[]) =>
    Array.isArray(label)
      ? label.map((l, i) => (
          <span key={i} style={{ display: 'block' }}>{l}</span>
        ))
      : label;

  const handleNavClick = useCallback(
    (b: RBtn | BBtn) => {
      if (b.go) {
        goPage(b.go);
        return;
      }
      if (b.cmd) {
        const lbl = Array.isArray(b.label) ? b.label.join(' ') : b.label;
        fireCmd(b.cmd, lbl);
      }
    },
    [goPage, fireCmd],
  );

  return (
    <div ref={rootRef} className="hmi-root">
      <div className="topbar">
        <div className="tb-left">
          <div className="lbl-status">SYSTEM STATUS</div>
          <div className="run-txt">SYSTEM RUN</div>
          <div className="lbl-details">SYSTEM DETAILS</div>
          <div className="mode-txt">LEAVING CHILLED LIQUID CONTROL</div>
          <div className="scr-tab">{screenDef.label}</div>
        </div>
        <div className="tb-mid">
          <div className="dt-cell">
            <div className="dt-lbl">Date</div>
            <div className="dt-val">{dt.date}</div>
          </div>
          <div className="dt-cell">
            <div className="dt-lbl">Time</div>
            <div className="dt-val">{dt.time}</div>
          </div>
          <div className="ctrl-cell">
            <div className="ctrl-lbl">Control Source</div>
            <div className="ctrl-val">Local</div>
            <div className="ctrl-lbl" style={{ borderTop: '1px solid #222' }}>
              Access Level
            </div>
            <div className="ctrl-val">{accessLevel}</div>
          </div>
        </div>
        <div className="tb-right">
          {page === 'home' ? (
            <button className={cls('abtn', true)} onClick={() => setModal({ title: 'System', body: 'York YK Centrifugal Chiller\nControl System v4.12\n\nLocal control active. All subsystems nominal.' })}>
              System
            </button>
          ) : (
            <button className="abtn" onClick={() => goPage('home')}>
              Home
            </button>
          )}
        </div>
      </div>

      <div className="main">
        <div className="center">
          {/* HOME — chiller scene with overlaid readouts */}
          {page === 'home' && (
            <div className="home-stage">
              <canvas ref={canvasRef} />

              <div className="home-meta">
                <div className="meta-row">
                  % Full Load Amps <span className="meta-val" data-h="h-fla">33 %</span>
                </div>
                <div className="meta-row">
                  Operating Hours <span className="meta-val" data-h="h-hrs">13 Hr</span>
                </div>
                <div className="meta-row">
                  Motor Run <span className="led" />
                </div>
              </div>

              <div className="home-temps">
                <div className="tblock heating">
                  <div className="ttitle">Heating Condenser Liquid Temperature</div>
                  <div className="tline">
                    <span className="tlabel">Leaving</span>
                    <span className="tval" data-h="h-hcndL">95.3 °F</span>
                  </div>
                  <div className="tline">
                    <span className="tlabel">Return</span>
                    <span className="tval" data-h="h-hcndR">85.0 °F</span>
                  </div>
                </div>

                <div className="tblock chilled">
                  <div className="ttitle">Chilled Liquid Temperature</div>
                  <div className="tline">
                    <span className="tlabel">Leaving</span>
                    <span className="tval" data-h="h-chwL">44.0 °F</span>
                  </div>
                  <div className="tline">
                    <span className="tlabel">Return</span>
                    <span className="tval" data-h="h-chwR">56.2 °F</span>
                  </div>
                </div>

                <div className="tblock cond">
                  <div className="ttitle">Condenser Liquid Temperature</div>
                  <div className="tline">
                    <span className="tlabel">Leaving</span>
                    <span className="tval" data-h="h-cndL">95.1 °F</span>
                  </div>
                  <div className="tline">
                    <span className="tlabel">Return</span>
                    <span className="tval" data-h="h-cndR">85.2 °F</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DETAIL SCREENS — programmatic data blocks on the beige floor */}
          {screenDef.kind === 'detail' && (
            <div className="det-stage">
              <div className="det-screen-title">
                <span>{screenDef.label.replace(' SCREEN', '')}</span>
                {screenDef.subtitle && <span className="pill">{screenDef.subtitle}</span>}
              </div>
              <div className="det-blocks">
                {(screenDef.blocks ?? []).map((blk, bi) => (
                  <div key={bi} className="det-block">
                    {blk.title && <div className="det-block-title">{blk.title}</div>}
                    {blk.rows.map((row, ri) => {
                      if (row.kind === 'led') {
                        return (
                          <div key={ri} className="det-row">
                            <span className="det-row-led" />
                            <span className="det-row-lbl">{row.label}</span>
                          </div>
                        );
                      }
                      const valCls =
                        'det-row-val' + (row.amb ? ' amb' : '') + (row.text ? ' text' : '');
                      return (
                        <div key={ri} className="det-row">
                          <span className="det-row-lbl">{row.label}</span>
                          <span className={valCls} {...(row.id ? { 'data-h': row.id } : {})}>
                            {row.defaultVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* SETPOINTS */}
          {page === 'setpoints' && (
            <div className="page vis">
              <div className="dcard" style={{ flex: 1 }}>
                <h3>Setpoints</h3>
                <SetpointRow label="Chilled Liquid Leaving Setpoint" inputRef={sp1Ref} defaultValue="44.0" step={0.5} unit="°F" min={36} max={60} delta={0.5} adj={adj} />
                <SetpointRow label="Leaving Chilled Liquid High Limit" inputRef={sp2Ref} defaultValue="65.0" step={0.5} unit="°F" min={50} max={80} delta={0.5} adj={adj} />
                <SetpointRow label="Low Chilled Liquid Cutout" inputRef={sp3Ref} defaultValue="36.0" step={0.5} unit="°F" min={32} max={42} delta={0.5} adj={adj} />
                <SetpointRow label="Condenser High Limit Setpoint" inputRef={sp4Ref} defaultValue="105.0" step={0.5} unit="°F" min={85} max={115} delta={0.5} adj={adj} />
                <SetpointRow label="Motor Speed Setpoint" inputRef={sp5Ref} defaultValue="4100" step={50} unit="RPM" min={2000} max={5000} delta={50} adj={adj} />
                <SetpointRow label="Current Limit Setpoint" inputRef={sp6Ref} defaultValue="400" step={5} unit="A" min={100} max={450} delta={5} adj={adj} />
                <SetpointRow label="Anti-Recycle Timer" inputRef={sp7Ref} defaultValue="30" step={1} unit="min" min={15} max={60} delta={1} adj={adj} />
                <SetpointRow label="Low Oil Pressure Cutout" inputRef={sp8Ref} defaultValue="15" step={1} unit="PSID" min={8} max={25} delta={1} adj={adj} />
              </div>
            </div>
          )}

          {/* HISTORY */}
          {page === 'history' && (
            <div className="page vis">
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
          )}
        </div>

        <div className="rnav">
          {screenDef.rightNav.map((b, i) => (
            <button
              key={i}
              className={cls('rbtn', b.go ? page === b.go : false)}
              onClick={() => handleNavClick(b)}
            >
              <span className="rbtn-lbl">{renderBtnLabel(b.label)}</span>
              {b.badge && <span className="rbadge">{b.badge}</span>}
              {b.ledOn && <span className="rled" />}
            </button>
          ))}
        </div>
      </div>

      <div className="botbar">
        <div className="bb-left">
          {screenDef.botBar.map((b, i) => (
            <button
              key={i}
              className={cls('abtn-up' + (b.tall ? ' tall' : ''), b.go ? page === b.go : false)}
              onClick={() => handleNavClick(b)}
            >
              <span>{renderBtnLabel(b.label)}</span>
              {b.badge && <span className="rbadge">{b.badge}</span>}
              {b.ledOn && <span className="rled" />}
            </button>
          ))}
        </div>
        <div className="bb-spacer" />
        <span className="alarmzone alok" data-h="alarmTxt">No Active Alarms</span>
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
