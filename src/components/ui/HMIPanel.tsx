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

export type PageKey =
  | 'home'
  | 'evaporator'
  | 'condenser'
  | 'compressor'
  | 'oilsump'
  | 'motor'
  | 'heatRecovery'
  | 'refrigerantLevel'
  | 'headPressure'
  | 'capacityControl'
  | 'vsdTuning'
  | 'surgeMap'
  | 'diagnostics'
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
  headPressure: 'HEAD PRESSURE CONTROL SCREEN',
  capacityControl: 'CAPACITY CONTROL SCREEN',
  vsdTuning: 'VSD TUNING SCREEN',
  surgeMap: 'SURGE PROTECTION SCREEN',
  diagnostics: 'DIAGNOSTICS SCREEN',
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
.hmi-root .det-stage{flex:1;background:linear-gradient(180deg,#9a7f54 0%,#b89c70 42%,#c4a878 55%,#d3b888 100%);padding:10px 14px 0;display:flex;flex-direction:column;gap:8px;overflow:hidden}
.hmi-root .det-canvas-area{flex:1;position:relative;min-height:130px;overflow:hidden}
.hmi-root .det-canvas-area canvas{position:absolute;inset:0;width:100%;height:100%}
.hmi-root .det-screen-title{color:#fff;font-family:'Arial Black','Arial',sans-serif;font-size:18px;letter-spacing:2.5px;text-shadow:1px 1px 2px rgba(0,0,0,0.7),0 0 6px rgba(0,0,0,0.4);text-transform:uppercase;display:flex;align-items:center;gap:14px;flex-shrink:0}
.hmi-root .det-screen-title .pill{background:#1a1408;color:#00ff66;padding:4px 14px;font-size:13px;letter-spacing:2px;border:1.5px solid #5e4f30;text-shadow:0 0 4px rgba(0,255,80,0.4)}
.hmi-root .det-blocks{display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start;flex-shrink:0}
.hmi-root .det-block{background:rgba(0,0,0,0.18);border:1.5px solid #5e4f30;padding:6px 10px;min-width:220px;flex:1 1 260px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08)}
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
      { label: ['Heat', 'Recovery'], go: 'heatRecovery' },
      { label: ['Refrigerant', 'Level'], go: 'refrigerantLevel' },
      { label: 'Diagnostics', go: 'diagnostics' },
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
      { label: ['Capacity', 'Control'], go: 'capacityControl' },
      { label: ['VSD', 'Tuning'], go: 'vsdTuning' },
      { label: ['Surge', 'Map'], go: 'surgeMap' },
      { label: 'Hot Gas', cmd: 'toggleHotGas' },
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
      { label: ['Head Pressure', 'Control'], go: 'headPressure' },
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

  headPressure: {
    label: 'HEAD PRESSURE CONTROL SCREEN',
    kind: 'detail',
    subtitle: 'Condenser · Control Valve',
    rightNav: [
      NAV_HOME,
      { label: 'Condenser', go: 'condenser' },
      { label: ['Heat', 'Recovery'], go: 'heatRecovery' },
      { label: ['Head Pressure', 'Setpoint'], badge: '30.0 PSID', cmd: 'spHeadPressCtrl' },
      { label: ['Minimum', 'Position'], badge: '10.0 %', cmd: 'spMinPos' },
      { label: ['Shutdown', 'Position'], badge: '0.0 %', cmd: 'spShutdownPos' },
    ],
    botBar: [
      { label: ['Input', 'Type'], badge: '0-10V', cmd: 'inputType' },
      { label: 'Direction', badge: 'Direct', cmd: 'pidDirection' },
      { label: 'Set', cmd: 'cvSet' },
      { label: 'Auto', cmd: 'cvAuto' },
      { label: ['Change', 'Setpoints'], cmd: 'cvChangeSp', tall: true },
    ],
    blocks: [
      {
        title: 'Condenser',
        rows: [
          { kind: 'val', id: 'hp-rcl', label: 'Return Condenser Liquid Temperature', defaultVal: '85.0 °F' },
          { kind: 'val', id: 'hp-lcl', label: 'Leaving Condenser Liquid Temperature', defaultVal: '94.9 °F' },
        ],
      },
      {
        title: 'Head Pressure Control',
        rows: [
          { kind: 'val', id: 'hp-deltaP', label: 'Delta P', defaultVal: '80.0 PSID' },
          { kind: 'val', label: 'Head Pressure Setpoint', defaultVal: '30.0 PSID', amb: true },
          { kind: 'val', label: 'Minimum Position', defaultVal: '10.0 %', amb: true },
          { kind: 'val', label: 'Shutdown Position', defaultVal: '0.0 %', amb: true },
        ],
      },
      {
        title: 'Control Valve',
        rows: [
          { kind: 'val', id: 'hp-valveOut', label: 'Control Valve Output', defaultVal: '0.0 %' },
          { kind: 'val', label: 'Control Valve Control Mode', defaultVal: 'Auto', text: true },
          { kind: 'val', label: 'PID Control Mode', defaultVal: 'Active', text: true },
        ],
      },
    ],
  },

  capacityControl: {
    label: 'CAPACITY CONTROL SCREEN',
    kind: 'detail',
    subtitle: 'Pre-Rotation Vanes',
    rightNav: [
      NAV_HOME,
      { label: 'Compressor', go: 'compressor' },
      { label: ['VSD', 'Tuning'], go: 'vsdTuning' },
      { label: ['PID Auto', 'Reset'], cmd: 'pidReset' },
    ],
    botBar: [
      { label: 'Open', cmd: 'pvOpen', ledOn: true },
      { label: 'Close', cmd: 'pvClose', ledOn: true },
      { label: 'Hold', cmd: 'pvHold' },
      { label: 'Auto', cmd: 'pvAuto' },
      { label: 'Setpoint', badge: '40 %', cmd: 'spCapacity' },
    ],
    blocks: [
      {
        title: 'Pre-Rotation Vanes',
        rows: [
          { kind: 'val', id: 'cc-fla', label: '% Full Load Amps', defaultVal: '33 %' },
          { kind: 'val', id: 'cc-vane', label: 'Pre-Rotation Vanes Position', defaultVal: '40 %' },
          { kind: 'val', label: 'Vane Motor Switch', defaultVal: 'Closed', text: true },
          { kind: 'val', label: 'Control Mode', defaultVal: 'Auto', text: true },
        ],
      },
      {
        title: 'Setpoints',
        rows: [
          { kind: 'val', label: 'Leaving Chilled Liquid Setpoint', defaultVal: '44.0 °F', amb: true },
          { kind: 'val', label: 'Low Chilled Liquid Cutout', defaultVal: '36.0 °F', amb: true },
          { kind: 'val', label: 'Current Limit Setpoint', defaultVal: '115 %', amb: true },
          { kind: 'val', label: 'Effective Chilled Liquid Setpoint', defaultVal: '44.0 °F', amb: true },
        ],
      },
      {
        title: 'Status',
        rows: [
          { kind: 'val', id: 'cc-chwL', label: 'Leaving Chilled Liquid Temperature', defaultVal: '44.0 °F' },
          { kind: 'val', label: 'Chilled Liquid Pump', defaultVal: 'Run', text: true },
          { kind: 'val', label: 'Safety Chain', defaultVal: 'Closed', text: true },
        ],
      },
    ],
  },

  vsdTuning: {
    label: 'VSD TUNING SCREEN',
    kind: 'detail',
    subtitle: 'Variable Speed Drive',
    rightNav: [
      NAV_HOME,
      { label: 'Compressor', go: 'compressor' },
      { label: ['Capacity', 'Control'], go: 'capacityControl' },
      { label: ['Fault', 'Reset'], cmd: 'vsdFaultReset' },
    ],
    botBar: [
      { label: ['Speed', 'Raise'], cmd: 'vsdRaise', ledOn: true },
      { label: ['Speed', 'Lower'], cmd: 'vsdLower', ledOn: true },
      { label: 'Hold', cmd: 'vsdHold' },
      { label: 'Auto', cmd: 'vsdAuto' },
    ],
    blocks: [
      {
        title: 'Drive Status',
        rows: [
          { kind: 'val', id: 'vsd-speed', label: 'Motor Speed', defaultVal: '4067 RPM' },
          { kind: 'val', id: 'vsd-freq',  label: 'Output Frequency', defaultVal: '67.8 Hz' },
          { kind: 'val', id: 'vsd-volt',  label: 'Output Voltage', defaultVal: '458 V' },
          { kind: 'val', id: 'vsd-dc',    label: 'DC Bus Voltage', defaultVal: '642 V' },
          { kind: 'val', id: 'vsd-temp',  label: 'Drive Temperature', defaultVal: '104.2 °F' },
          { kind: 'val', id: 'vsd-amps',  label: 'Drive Output Current', defaultVal: '132 A' },
        ],
      },
      {
        title: 'Setpoints',
        rows: [
          { kind: 'val', label: 'Speed Setpoint', defaultVal: '4100 RPM', amb: true },
          { kind: 'val', label: 'Minimum Speed',  defaultVal: '2000 RPM', amb: true },
          { kind: 'val', label: 'Maximum Speed',  defaultVal: '4800 RPM', amb: true },
          { kind: 'val', label: 'Ramp Rate',      defaultVal: '50 RPM/s', amb: true },
        ],
      },
      {
        title: 'Drive Protection',
        rows: [
          { kind: 'val', label: 'Drive Status', defaultVal: 'Run',  text: true },
          { kind: 'val', label: 'Drive Fault',  defaultVal: 'None', text: true },
          { kind: 'led', label: 'Drive Ready Output' },
          { kind: 'led', label: 'Drive Run Output' },
        ],
      },
    ],
  },

  surgeMap: {
    label: 'SURGE PROTECTION SCREEN',
    kind: 'detail',
    subtitle: 'Compressor Protection',
    rightNav: [
      NAV_HOME,
      { label: 'Compressor', go: 'compressor' },
      { label: ['Capacity', 'Control'], go: 'capacityControl' },
      { label: ['Surge', 'Sensitivity'], badge: 'Normal', cmd: 'cycleSensitivity' },
    ],
    botBar: [
      { label: ['Clear', 'Surge Count'], cmd: 'clearSurgeCount' },
      { label: ['Surge', 'Deadband'], badge: '5 %', cmd: 'spSurgeDeadband' },
      { label: ['Anti-Surge', 'Limit'], badge: '15 %', cmd: 'spAntiSurgeLimit' },
    ],
    blocks: [
      {
        title: 'Surge Detection',
        rows: [
          { kind: 'val', id: 'sg-count',  label: 'Surge Count', defaultVal: '0' },
          { kind: 'val', id: 'sg-deltaP', label: 'Differential Pressure', defaultVal: '80.0 PSID' },
          { kind: 'val', id: 'sg-fla',    label: '% Full Load Amps', defaultVal: '33 %' },
          { kind: 'val', id: 'sg-vane',   label: 'Pre-Rotation Vanes Position', defaultVal: '40 %' },
          { kind: 'val', label: 'Surge State', defaultVal: 'Normal', text: true },
        ],
      },
      {
        title: 'Anti-Surge Settings',
        rows: [
          { kind: 'val', label: 'Surge Sensitivity', defaultVal: 'Normal',   text: true },
          { kind: 'val', label: 'Surge Deadband',    defaultVal: '5 %',      amb: true },
          { kind: 'val', label: 'Anti-Surge Limit',  defaultVal: '15 %',     amb: true },
          { kind: 'val', label: 'Smart Freeze',      defaultVal: 'Disabled', text: true },
        ],
      },
      {
        title: 'Hot Gas Bypass',
        rows: [
          { kind: 'led', label: 'Surge Detected' },
          { kind: 'led', label: 'Hot Gas Bypass Active' },
          { kind: 'val', label: 'Hot Gas Bypass Valve', defaultVal: '0 %' },
        ],
      },
    ],
  },

  diagnostics: {
    label: 'DIAGNOSTICS SCREEN',
    kind: 'detail',
    subtitle: 'System Diagnostics',
    rightNav: [
      NAV_HOME,
      { label: 'History', go: 'history' },
      { label: 'Setpoints', go: 'setpoints' },
      { label: ['Clear', 'Faults'], cmd: 'clearFaults' },
    ],
    botBar: BOT_DEFAULT,
    blocks: [
      {
        title: 'Active Faults',
        rows: [
          { kind: 'val', label: 'Active Fault',  defaultVal: 'None', text: true },
          { kind: 'val', label: 'Fault Source',  defaultVal: 'N/A',  text: true },
          { kind: 'val', label: 'Fault Time',    defaultVal: '--:-- --', text: true },
        ],
      },
      {
        title: 'Safety Chain',
        rows: [
          { kind: 'val', label: 'High Pressure Switch',        defaultVal: 'Closed', text: true },
          { kind: 'val', label: 'Low Oil Pressure Switch',     defaultVal: 'Closed', text: true },
          { kind: 'val', label: 'Chilled Liquid Flow Switch',  defaultVal: 'Closed', text: true },
          { kind: 'val', label: 'Condenser Liquid Flow Switch', defaultVal: 'Closed', text: true },
          { kind: 'val', label: 'Motor Thermal Protection',    defaultVal: 'Normal', text: true },
        ],
      },
      {
        title: 'System Counters',
        rows: [
          { kind: 'val', id: 'd-starts',  label: 'Number of Starts', defaultVal: '147' },
          { kind: 'val', id: 'd-runtime', label: 'Total Runtime',     defaultVal: '13 Hr' },
          { kind: 'val', id: 'd-surges',  label: 'Total Surge Count', defaultVal: '0' },
          { kind: 'val', label: 'Last Start', defaultVal: '18 Jun 2009', text: true },
          { kind: 'val', label: 'Last Stop',  defaultVal: '17 Jun 2009', text: true },
        ],
      },
    ],
  },

  setpoints: {
    label: 'SETPOINTS',
    kind: 'cards',
    rightNav: [NAV_HOME, { label: 'History', go: 'history' }, { label: 'Diagnostics', go: 'diagnostics' }],
    botBar: BOT_DEFAULT,
  },

  history: {
    label: 'HISTORY',
    kind: 'cards',
    rightNav: [NAV_HOME, { label: 'Setpoints', go: 'setpoints' }, { label: 'Diagnostics', go: 'diagnostics' }],
    botBar: [
      { label: 'Print', cmd: 'print' },
      { label: 'Logout', cmd: 'logout' },
      { label: ['Soft', 'Shutdown'], cmd: 'softShutdown', tall: true },
    ],
  },
};

interface HMIPanelProps {
  /** Called whenever the active screen changes (e.g. for parent comparison views). */
  onPageChange?: (page: PageKey) => void;
}

export function HMIPanel({ onPageChange }: HMIPanelProps = {}) {
  const [page, setPage] = useState<PageKey>('home');

  useEffect(() => {
    onPageChange?.(page);
    // onPageChange identity is intentionally excluded — we only want to fire on
    // actual page changes, not on parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);
  const [accessIdx, setAccessIdx] = useState(2);
  const [modal, setModal] = useState<{ title: string; body: string } | null>(null);
  const [dt, setDt] = useState({ date: '--', time: '--' });

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detCanvasRef = useRef<HTMLCanvasElement>(null);
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

  /* Detail-screen component graphics. */
  useEffect(() => {
    if (page === 'home' || SCREENS[page]?.kind !== 'detail') return;
    const cv = detCanvasRef.current;
    if (!cv || !cv.parentElement) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, angle = 0, raf = 0;
    const ANIMATING = new Set(['compressor', 'refrigerantLevel']);

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cw = cv.parentElement!.clientWidth;
      const ch = cv.parentElement!.clientHeight;
      cv.width  = Math.floor(cw * dpr);
      cv.height = Math.floor(ch * dpr);
      cv.style.width  = cw + 'px';
      cv.style.height = ch + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = cw; H = ch;
    };

    /* ── Shared helpers ── */
    const bg = () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0,    '#9a7f54');
      g.addColorStop(0.5,  '#b89c70');
      g.addColorStop(1,    '#d3b888');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(80,55,25,0.18)';
      ctx.fillRect(0, H * 0.72, W, 1.5);
      ctx.fillStyle = 'rgba(80,55,25,0.06)';
      for (let i = 0; i < 12; i++) ctx.fillRect(0, H * 0.74 + i * (H * 0.26 / 12), W, 1);
    };

    const shellGrad = (x: number, y: number, h: number) => {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0,    '#7ed05a');
      g.addColorStop(0.22, '#46a838');
      g.addColorStop(0.55, '#2c8a2c');
      g.addColorStop(0.85, '#155215');
      g.addColorStop(1,    '#0a2e0a');
      return g;
    };

    /* Horizontal shell body (evaporator / condenser / heat-recovery) */
    const drawHShell = (cx0: number, cy0: number, len: number, rad: number) => {
      const x0 = cx0 - len / 2, x1 = cx0 + len / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.beginPath();
      ctx.ellipse(cx0, cy0 + rad + 9, len * 0.46, rad * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x0 + rad * 0.18, cy0 - rad);
      ctx.lineTo(x1 - rad * 0.18, cy0 - rad);
      ctx.quadraticCurveTo(x1 + rad * 0.05, cy0 - rad, x1 + rad * 0.18, cy0 - rad * 0.6);
      ctx.lineTo(x1 + rad * 0.18, cy0 + rad * 0.6);
      ctx.quadraticCurveTo(x1 + rad * 0.05, cy0 + rad, x1 - rad * 0.18, cy0 + rad);
      ctx.lineTo(x0 + rad * 0.18, cy0 + rad);
      ctx.quadraticCurveTo(x0 - rad * 0.05, cy0 + rad, x0 - rad * 0.18, cy0 + rad * 0.6);
      ctx.lineTo(x0 - rad * 0.18, cy0 - rad * 0.6);
      ctx.quadraticCurveTo(x0 - rad * 0.05, cy0 - rad, x0 + rad * 0.18, cy0 - rad);
      ctx.closePath();
      ctx.fillStyle = shellGrad(x0, cy0 - rad, rad * 2);
      ctx.fill();
      ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 1.4; ctx.stroke();
      const sh = ctx.createLinearGradient(0, cy0 - rad, 0, cy0 - rad * 0.4);
      sh.addColorStop(0, 'rgba(255,255,255,0.32)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sh;
      ctx.fillRect(x0 + 6, cy0 - rad + 1, len - 12, rad * 0.56);
      const cg = ctx.createRadialGradient(x1 + 4, cy0 - rad * 0.3, 1, x1, cy0, rad);
      cg.addColorStop(0, '#7fcd5a'); cg.addColorStop(0.55, '#1f7a1f'); cg.addColorStop(1, '#072807');
      ctx.beginPath();
      ctx.ellipse(x1, cy0, rad * 0.32, rad, 0, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();
      ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 1.2; ctx.stroke();
    };

    const drawLegs = (cx0: number, cy0: number, len: number, rad: number) => {
      const sw = rad * 0.6, sh = rad * 0.9;
      [cx0 - len * 0.28, cx0 + len * 0.28].forEach(sx => {
        ctx.beginPath();
        ctx.moveTo(sx - sw / 2, cy0 + rad * 0.55);
        ctx.lineTo(sx + sw / 2, cy0 + rad * 0.55);
        ctx.lineTo(sx + sw / 2 + sh * 0.35, cy0 + rad + sh);
        ctx.lineTo(sx - sw / 2 - sh * 0.35, cy0 + rad + sh);
        ctx.closePath();
        const g = ctx.createLinearGradient(sx, cy0 + rad * 0.55, sx, cy0 + rad + sh);
        g.addColorStop(0, '#2a7a2a'); g.addColorStop(1, '#0a3010');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#0a3d0a'; ctx.lineWidth = 1; ctx.stroke();
      });
    };

    const drawWaterBox = (x0: number, cy0: number, rad: number, col = '#1a5fb4') => {
      const bw = rad * 0.72, bh = rad * 2.35, bx = x0 - bw, by = cy0 - bh / 2;
      const wg = ctx.createLinearGradient(bx, by, bx + bw, by);
      wg.addColorStop(0, '#0a3a0a'); wg.addColorStop(0.5, '#2a8a2a'); wg.addColorStop(1, '#0d4810');
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4);
      ctx.fillStyle = wg; ctx.fill();
      ctx.strokeStyle = '#072807'; ctx.lineWidth = 1.4; ctx.stroke();
      [0.28, 0.72].forEach(fy => {
        const ny = by + bh * fy - rad * 0.2, nx = bx - bw * 1.35;
        const ng = ctx.createLinearGradient(nx, ny, nx, ny + rad * 0.4);
        ng.addColorStop(0, col === '#1a5fb4' ? '#a0d6ff' : '#8899ff');
        ng.addColorStop(0.45, col); ng.addColorStop(1, '#0a1e50');
        ctx.beginPath(); ctx.roundRect(nx, ny, bw * 1.35, rad * 0.4, rad * 0.2);
        ctx.fillStyle = ng; ctx.fill();
        ctx.strokeStyle = '#06204c'; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.roundRect(nx - 5, ny - 3, 7, rad * 0.4 + 6, 1.5);
        ctx.fillStyle = '#2a5a9a'; ctx.fill(); ctx.stroke();
      });
    };

    /* Evaporator cutaway — boiling blue refrigerant + tube rows */
    const drawEvapInterior = (cx0: number, cy0: number, len: number, rad: number) => {
      const x0 = cx0 - len / 2;
      const cutX = x0 + len * 0.22, cutW = len * 0.46;
      ctx.save();
      ctx.beginPath(); ctx.rect(cutX, cy0 - rad + 2, cutW, rad * 2 - 4); ctx.clip();
      const ig = ctx.createLinearGradient(0, cy0 - rad, 0, cy0 + rad);
      ig.addColorStop(0, '#d8f4ff'); ig.addColorStop(0.35, '#90d8f8');
      ig.addColorStop(0.65, '#50a8e8'); ig.addColorStop(1, '#1868b8');
      ctx.fillStyle = ig; ctx.fillRect(cutX, cy0 - rad + 2, cutW, rad * 2 - 4);
      const rows = 7, ts = (rad * 1.8) / (rows + 1);
      ctx.strokeStyle = 'rgba(60,100,170,0.5)'; ctx.lineWidth = 2;
      for (let r = 0; r < rows; r++) {
        const ty = cy0 - rad * 0.9 + ts * (r + 1);
        ctx.beginPath(); ctx.moveTo(cutX + 8, ty); ctx.lineTo(cutX + cutW - 8, ty); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      [[0.2,0.2],[0.55,0.12],[0.78,0.42],[0.33,0.62],[0.65,0.75],[0.12,0.82]].forEach(([fx, fy]) => {
        ctx.beginPath(); ctx.arc(cutX + cutW * fx, cy0 - rad * 0.9 + rad * 1.8 * fy, 3.5, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillRect(cutX, cy0 - rad + 2, cutW, rad * 0.32);
      ctx.restore();
      ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 2;
      [[cutX, cutX],[cutX + cutW, cutX + cutW]].forEach(([sx]) => {
        ctx.beginPath(); ctx.moveTo(sx, cy0 - rad + 2); ctx.lineTo(sx, cy0 + rad - 2); ctx.stroke();
      });
    };

    /* Condenser / heat-recovery cutaway — copper tube bundle */
    const drawCondInterior = (cx0: number, cy0: number, len: number, rad: number) => {
      const x0 = cx0 - len / 2;
      const cutX = x0 + len * 0.22, cutW = len * 0.46;
      ctx.save();
      ctx.beginPath(); ctx.rect(cutX, cy0 - rad + 2, cutW, rad * 2 - 4); ctx.clip();
      const ig = ctx.createLinearGradient(0, cy0 - rad, 0, cy0 + rad);
      ig.addColorStop(0, '#2a1800'); ig.addColorStop(0.45, '#5a3200'); ig.addColorStop(1, '#1a0e00');
      ctx.fillStyle = ig; ctx.fillRect(cutX, cy0 - rad + 2, cutW, rad * 2 - 4);
      const rows = 6, cols = 8, tubeR = rad * 0.08;
      const hs = cutW / (cols + 1), vs = (rad * 1.8) / (rows + 1);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tx = cutX + hs * (c + 1) + (r % 2) * (hs / 2);
          const ty = cy0 - rad * 0.9 + vs * (r + 1);
          if (tx > cutX + 4 && tx < cutX + cutW - 4) {
            const tg = ctx.createRadialGradient(tx - tubeR * 0.3, ty - tubeR * 0.3, tubeR * 0.1, tx, ty, tubeR);
            tg.addColorStop(0, '#ffd080'); tg.addColorStop(0.5, '#c87020'); tg.addColorStop(1, '#603008');
            ctx.beginPath(); ctx.arc(tx, ty, tubeR, 0, Math.PI * 2);
            ctx.fillStyle = tg; ctx.fill();
            ctx.strokeStyle = '#401808'; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      ctx.strokeStyle = 'rgba(160,100,20,0.45)'; ctx.lineWidth = 2;
      [0.32, 0.65].forEach(fx => {
        ctx.beginPath(); ctx.moveTo(cutX + cutW * fx, cy0 - rad * 0.82); ctx.lineTo(cutX + cutW * fx, cy0 + rad * 0.82); ctx.stroke();
      });
      ctx.restore();
      ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 2;
      [cutX, cutX + cutW].forEach(sx => {
        ctx.beginPath(); ctx.moveTo(sx, cy0 - rad + 2); ctx.lineTo(sx, cy0 + rad - 2); ctx.stroke();
      });
    };

    /* Centrifugal compressor — animated impeller */
    const drawCompressor = (a: number) => {
      bg();
      const cx0 = W * 0.52, cy0 = H * 0.52;
      const R = Math.min(W, H) * 0.37;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(cx0, cy0 + R * 0.86, R * 0.92, R * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      const vg = ctx.createRadialGradient(cx0 - R * 0.28, cy0 - R * 0.28, R * 0.1, cx0, cy0, R);
      vg.addColorStop(0, '#9adf6a'); vg.addColorStop(0.35, '#46b838'); vg.addColorStop(0.72, '#1f7a1f'); vg.addColorStop(1, '#062806');
      ctx.beginPath(); ctx.arc(cx0, cy0, R, 0, Math.PI * 2);
      ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 2.5; ctx.stroke();
      const sheen = ctx.createRadialGradient(cx0 - R * 0.35, cy0 - R * 0.38, 0, cx0 - R * 0.2, cy0 - R * 0.2, R * 0.62);
      sheen.addColorStop(0, 'rgba(255,255,255,0.36)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0.1)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen; ctx.beginPath(); ctx.arc(cx0, cy0, R, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx0 + R * 0.06, cy0 - R * 0.06, R * 0.72, Math.PI * 0.25, Math.PI * 1.65);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = R * 0.16; ctx.stroke();
      const iR = R * 0.52;
      const ieg = ctx.createRadialGradient(cx0, cy0, iR * 0.3, cx0, cy0, iR);
      ieg.addColorStop(0, '#101810'); ieg.addColorStop(0.7, '#2a5a2a'); ieg.addColorStop(1, '#0a3a0a');
      ctx.beginPath(); ctx.arc(cx0, cy0, iR, 0, Math.PI * 2);
      ctx.fillStyle = ieg; ctx.fill(); ctx.strokeStyle = '#b8b8b8'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx0, cy0, iR * 0.86, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,220,200,0.28)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.lineCap = 'round';
      for (let i = 0; i < 11; i++) {
        const ba = a + (i * 2 * Math.PI) / 11;
        const ix = cx0 + Math.cos(ba) * iR * 0.22, iy = cy0 + Math.sin(ba) * iR * 0.22;
        const ox = cx0 + Math.cos(ba + 0.36) * iR * 0.78, oy = cy0 + Math.sin(ba + 0.36) * iR * 0.78;
        ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy);
        ctx.strokeStyle = `rgba(200,240,200,${0.28 + Math.abs(Math.sin(ba)) * 0.55})`;
        ctx.lineWidth = iR * 0.055; ctx.stroke();
      }
      ctx.lineCap = 'butt';
      const hg = ctx.createRadialGradient(cx0 - iR * 0.08, cy0 - iR * 0.08, 2, cx0, cy0, iR * 0.18);
      hg.addColorStop(0, '#8adb5a'); hg.addColorStop(0.6, '#2a8a2a'); hg.addColorStop(1, '#082808');
      ctx.beginPath(); ctx.arc(cx0, cy0, iR * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 1.5; ctx.stroke();
      const dw = R * 0.26, dh = R * 0.88, dx = cx0 - R - dw * 0.3, dy = cy0 - dh / 2;
      const dg = ctx.createLinearGradient(dx, 0, dx + dw, 0);
      dg.addColorStop(0, '#0a3a0a'); dg.addColorStop(0.5, '#2a8a2a'); dg.addColorStop(1, '#1a5a1a');
      ctx.beginPath(); ctx.roundRect(dx, dy, dw, dh, dw * 0.14);
      ctx.fillStyle = dg; ctx.fill(); ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx0, cy0 - R * 0.88);
      ctx.bezierCurveTo(cx0 + R * 0.28, cy0 - R * 1.1, cx0 + R * 0.78, cy0 - R * 0.8, cx0 + R, cy0 - R * 0.38);
      ctx.strokeStyle = '#1a6a1a'; ctx.lineWidth = R * 0.18; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx0, cy0 - R * 0.88);
      ctx.bezierCurveTo(cx0 + R * 0.28, cy0 - R * 1.1, cx0 + R * 0.78, cy0 - R * 0.8, cx0 + R, cy0 - R * 0.38);
      ctx.strokeStyle = 'rgba(180,240,180,0.32)'; ctx.lineWidth = R * 0.05; ctx.stroke();
    };

    /* Oil sump pump — large circular motor face + sump vessel */
    const drawOilSump = () => {
      bg();
      const cx0 = W * 0.56, cy0 = H * 0.5;
      const fR = Math.min(W * 0.27, H * 0.37);
      const tw = fR * 0.52, th = fR * 2.2, tx = cx0 - fR * 2.1 - tw / 2, ty = cy0 - th / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(tx + tw / 2, ty + th + 8, tw * 0.5, 8, 0, 0, Math.PI * 2); ctx.fill();
      const tg = ctx.createLinearGradient(tx, 0, tx + tw, 0);
      tg.addColorStop(0, '#0a3a0a'); tg.addColorStop(0.5, '#3aaa3a'); tg.addColorStop(1, '#0d4810');
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, tw * 0.1);
      ctx.fillStyle = tg; ctx.fill(); ctx.strokeStyle = '#0a3a0a'; ctx.lineWidth = 1.5; ctx.stroke();
      const ts = ctx.createLinearGradient(tx, ty, tx + tw * 0.4, ty);
      ts.addColorStop(0, 'rgba(255,255,255,0.22)'); ts.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = ts; ctx.beginPath(); ctx.roundRect(tx, ty, tw * 0.4, th, tw * 0.1); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(tx + tw, cy0 - fR * 0.12); ctx.lineTo(cx0 - fR - 4, cy0 - fR * 0.12);
      ctx.strokeStyle = '#1a6a1a'; ctx.lineWidth = fR * 0.21; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx + tw, cy0 - fR * 0.12); ctx.lineTo(cx0 - fR - 4, cy0 - fR * 0.12);
      ctx.strokeStyle = 'rgba(150,220,150,0.28)'; ctx.lineWidth = fR * 0.05; ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(cx0 + 4, cy0 + fR + 12, fR * 0.9, fR * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      const pg = ctx.createRadialGradient(cx0 - fR * 0.3, cy0 - fR * 0.3, fR * 0.1, cx0, cy0, fR);
      pg.addColorStop(0, '#8ae05a'); pg.addColorStop(0.35, '#3aaa2a'); pg.addColorStop(0.72, '#1a7a1a'); pg.addColorStop(1, '#062806');
      ctx.beginPath(); ctx.arc(cx0, cy0, fR, 0, Math.PI * 2);
      ctx.fillStyle = pg; ctx.fill(); ctx.strokeStyle = '#0a3a0a'; ctx.lineWidth = 2.5; ctx.stroke();
      const fs = ctx.createRadialGradient(cx0 - fR * 0.32, cy0 - fR * 0.36, 0, cx0 - fR * 0.18, cy0 - fR * 0.18, fR * 0.62);
      fs.addColorStop(0, 'rgba(255,255,255,0.34)'); fs.addColorStop(0.6, 'rgba(255,255,255,0.08)'); fs.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fs; ctx.beginPath(); ctx.arc(cx0, cy0, fR, 0, Math.PI * 2); ctx.fill();
      const bR = fR * 0.82;
      for (let i = 0; i < 12; i++) {
        const ba = (i / 12) * Math.PI * 2, bx = cx0 + Math.cos(ba) * bR, by = cy0 + Math.sin(ba) * bR;
        const bg2 = ctx.createRadialGradient(bx - 1, by - 1, 0.5, bx, by, 5);
        bg2.addColorStop(0, '#aaddaa'); bg2.addColorStop(1, '#1a5a1a');
        ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fillStyle = bg2; ctx.fill(); ctx.strokeStyle = '#0a3a0a'; ctx.lineWidth = 0.7; ctx.stroke();
      }
      const hg = ctx.createRadialGradient(cx0 - fR * 0.07, cy0 - fR * 0.07, 2, cx0, cy0, fR * 0.22);
      hg.addColorStop(0, '#aaffaa'); hg.addColorStop(0.5, '#2a8a2a'); hg.addColorStop(1, '#0a2a0a');
      ctx.beginPath(); ctx.arc(cx0, cy0, fR * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = '#0a3a0a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#88aa88'; ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ha = (i / 6) * Math.PI * 2, hx = cx0 + Math.cos(ha) * fR * 0.1, hy = cy0 + Math.sin(ha) * fR * 0.1;
        i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
      }
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#0a3a0a'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx0 - fR * 0.18, cy0 - fR);
      ctx.bezierCurveTo(cx0 - fR * 0.18, cy0 - fR * 1.32, cx0 + fR * 0.28, cy0 - fR * 1.32, cx0 + fR * 0.28, cy0 - fR * 0.9);
      ctx.strokeStyle = '#1a7a1a'; ctx.lineWidth = fR * 0.16; ctx.stroke();
    };

    /* Refrigerant level — evaporator shell top + animated liquid level + accumulator */
    const drawRefrigerantLevel = (a: number) => {
      bg();
      const sCx = W * 0.46, sCy = H * 0.2, sLen = W * 0.82, sRad = H * 0.15;
      ctx.fillStyle = shellGrad(sCx - sLen / 2, sCy, sRad);
      ctx.fillRect(sCx - sLen / 2, sCy, sLen, sRad + 2);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, sCy + sRad * 1.18); ctx.clip();
      const cg = ctx.createRadialGradient(sCx + sLen / 2 + 4, sCy - sRad * 0.3, 1, sCx + sLen / 2, sCy, sRad);
      cg.addColorStop(0, '#7fcd5a'); cg.addColorStop(0.55, '#1f7a1f'); cg.addColorStop(1, '#072807');
      ctx.beginPath(); ctx.ellipse(sCx + sLen / 2, sCy + sRad * 0.05, sRad * 0.3, sRad, 0, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      const lvFrac = 0.5 + Math.sin(a * 0.5) * 0.018;
      const lvY = sCy + sRad * 2 * (1 - lvFrac);
      ctx.save();
      ctx.beginPath(); ctx.rect(sCx - sLen / 2 + 4, sCy + 2, sLen - 8, sRad - 4); ctx.clip();
      const rlg = ctx.createLinearGradient(0, lvY, 0, sCy + sRad);
      rlg.addColorStop(0, '#60b0e8'); rlg.addColorStop(1, '#1a4878');
      ctx.fillStyle = rlg; ctx.fillRect(sCx - sLen / 2 + 4, lvY, sLen - 8, sCy + sRad - lvY);
      ctx.beginPath(); ctx.moveTo(sCx - sLen / 2 + 4, lvY);
      for (let x = sCx - sLen / 2 + 4; x < sCx + sLen / 2 - 4; x += 5) {
        ctx.lineTo(x, lvY + Math.sin(x * 0.1 + a * 1.2) * 2.5);
      }
      ctx.lineTo(sCx + sLen / 2 - 4, lvY);
      ctx.strokeStyle = 'rgba(180,220,255,0.65)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 1.5;
      ctx.strokeRect(sCx - sLen / 2, sCy, sLen, sRad + 2);
      const pX = sCx - sLen * 0.24;
      ctx.beginPath(); ctx.moveTo(pX, sCy + sRad + 2); ctx.lineTo(pX, H * 0.47);
      ctx.strokeStyle = '#1a6a1a'; ctx.lineWidth = 17; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(pX, sCy + sRad + 2); ctx.lineTo(pX, H * 0.47);
      ctx.strokeStyle = 'rgba(140,210,140,0.28)'; ctx.lineWidth = 5; ctx.stroke();
      const aCx = W * 0.36, aCy = H * 0.72, aRx = W * 0.15, aRy = H * 0.19;
      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.beginPath(); ctx.ellipse(aCx, aCy + aRy + 9, aRx * 0.84, 9, 0, 0, Math.PI * 2); ctx.fill();
      const ag = ctx.createRadialGradient(aCx - aRx * 0.28, aCy - aRy * 0.28, aRx * 0.1, aCx, aCy, aRx);
      ag.addColorStop(0, '#8ae05a'); ag.addColorStop(0.45, '#3aaa3a'); ag.addColorStop(0.8, '#1a7a1a'); ag.addColorStop(1, '#062806');
      ctx.beginPath(); ctx.ellipse(aCx, aCy, aRx, aRy, 0, 0, Math.PI * 2);
      ctx.fillStyle = ag; ctx.fill(); ctx.strokeStyle = '#0a3a0a'; ctx.lineWidth = 1.8; ctx.stroke();
      const aSheen = ctx.createRadialGradient(aCx - aRx * 0.3, aCy - aRy * 0.34, 2, aCx - aRx * 0.14, aCy - aRy * 0.14, aRx * 0.62);
      aSheen.addColorStop(0, 'rgba(255,255,255,0.28)'); aSheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = aSheen; ctx.beginPath(); ctx.ellipse(aCx, aCy, aRx, aRy, 0, 0, Math.PI * 2); ctx.fill();
      const vCx = W * 0.64, vCy = H * 0.6, vr = W * 0.038;
      ctx.beginPath(); ctx.arc(vCx, vCy, vr, 0, Math.PI * 2);
      ctx.fillStyle = '#888'; ctx.fill(); ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#555'; ctx.fillRect(vCx - vr * 0.38, vCy - vr * 2.1, vr * 0.76, vr * 1.15);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.strokeRect(vCx - vr * 0.38, vCy - vr * 2.1, vr * 0.76, vr * 1.15);
      [-2.4, 1].forEach(dx => {
        ctx.beginPath(); ctx.moveTo(vCx + vr * dx, vCy); ctx.lineTo(vCx + vr * (dx < 0 ? -1 : 2.4), vCy);
        ctx.strokeStyle = '#1a6a1a'; ctx.lineWidth = vr * 0.65; ctx.stroke();
      });
    };

    /* Motor assembly */
    const drawMotor = () => {
      bg();
      const cx0 = W * 0.52, cy0 = H * 0.52;
      const mL = W * 0.5, mR = Math.min(H * 0.27, mL * 0.26);
      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.beginPath(); ctx.ellipse(cx0, cy0 + mR + 10, mL * 0.47, mR * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      const mg = ctx.createLinearGradient(cx0, cy0 - mR, cx0, cy0 + mR);
      mg.addColorStop(0, '#7ed05a'); mg.addColorStop(0.4, '#3aa033'); mg.addColorStop(0.85, '#155515'); mg.addColorStop(1, '#0a2e0a');
      ctx.beginPath(); ctx.roundRect(cx0 - mL / 2, cy0 - mR, mL, mR * 2, mR * 0.3);
      ctx.fillStyle = mg; ctx.fill(); ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.roundRect(cx0 - mL / 2 + 5, cy0 - mR + 2, mL - 10, mR * 0.54, mR * 0.2); ctx.fill();
      const fins = Math.max(10, Math.floor(mL / 10));
      for (let i = 1; i < fins; i++) {
        const fx = cx0 - mL / 2 + (mL / fins) * i;
        ctx.beginPath(); ctx.moveTo(fx, cy0 - mR + 4); ctx.lineTo(fx, cy0 + mR - 4);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.8; ctx.stroke();
      }
      const cg = ctx.createRadialGradient(cx0 + mL / 2 + 4, cy0 - mR * 0.3, 1, cx0 + mL / 2, cy0, mR);
      cg.addColorStop(0, '#7fcd5a'); cg.addColorStop(0.55, '#1f7a1f'); cg.addColorStop(1, '#072807');
      ctx.beginPath(); ctx.ellipse(cx0 + mL / 2, cy0, mR * 0.28, mR, 0, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx0 - mL / 2, cy0, mR * 0.2, mR * 0.84, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2a6a2a'; ctx.fill(); ctx.strokeStyle = '#0a3a0a'; ctx.stroke();
      const nW = mL * 0.3, nH = mR * 0.54, nX = cx0 - nW / 2, nY = cy0 - nH / 2;
      ctx.fillStyle = '#0a0a1a'; ctx.beginPath(); ctx.roundRect(nX, nY, nW, nH, 3); ctx.fill();
      ctx.strokeStyle = '#2a6ab4'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#1a8aff'; ctx.font = `bold ${Math.max(7, mR * 0.28)}px Arial`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('YORK', cx0, nY + nH * 0.32);
      ctx.fillStyle = '#00ee88'; ctx.font = `${Math.max(6, mR * 0.18)}px "Courier New"`;
      ctx.fillText('YK-VSD', cx0, nY + nH * 0.7);
      [cx0 - mL * 0.32, cx0 + mL * 0.32].forEach(sx => {
        const sw = mR * 0.54, sh = mR * 0.82;
        ctx.beginPath();
        ctx.moveTo(sx - sw / 2, cy0 + mR * 0.55); ctx.lineTo(sx + sw / 2, cy0 + mR * 0.55);
        ctx.lineTo(sx + sw / 2 + sh * 0.34, cy0 + mR + sh); ctx.lineTo(sx - sw / 2 - sh * 0.34, cy0 + mR + sh);
        ctx.closePath(); ctx.fillStyle = '#1f5e1f'; ctx.fill(); ctx.strokeStyle = '#0a3d0a'; ctx.lineWidth = 1; ctx.stroke();
      });
    };

    /* VFD drive cabinet */
    const drawVSD = () => {
      bg();
      const px = W * 0.16, py = H * 0.05, pw = W * 0.68, ph = H * 0.88;
      const dm = 12;
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.beginPath(); ctx.roundRect(px + 5, py + 8, pw, ph, 6); ctx.fill();
      const cbg = ctx.createLinearGradient(px, py, px + pw, py + ph);
      cbg.addColorStop(0, '#282838'); cbg.addColorStop(0.5, '#181828'); cbg.addColorStop(1, '#0a0a18');
      ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 5);
      ctx.fillStyle = cbg; ctx.fill(); ctx.strokeStyle = '#4a4a6a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(px + dm, py + dm, pw - dm * 2, ph * 0.54, 3);
      ctx.fillStyle = '#0a0a14'; ctx.fill(); ctx.strokeStyle = '#1a5fb4'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(px + dm * 2, py + dm * 2, pw - dm * 4, ph * 0.26, 2);
      ctx.fillStyle = '#001e3a'; ctx.fill();
      ctx.fillStyle = '#00ccff'; ctx.font = `bold ${Math.max(9, H * 0.038)}px "Courier New"`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('4067 RPM', px + pw / 2, py + dm * 2 + ph * 0.1);
      ctx.fillStyle = '#00ee88'; ctx.font = `${Math.max(7, H * 0.026)}px "Courier New"`;
      ctx.fillText('OUTPUT: 67.8 Hz   458 V', px + pw / 2, py + dm * 2 + ph * 0.2);
      ctx.strokeStyle = '#2a2a4a'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const fy = py + dm + (ph * 0.54 / 9) * (i + 1);
        ctx.beginPath(); ctx.moveTo(px + dm, fy); ctx.lineTo(px + pw - dm, fy); ctx.stroke();
      }
      const ctY = py + ph * 0.6;
      ctx.fillStyle = '#141424'; ctx.beginPath(); ctx.roundRect(px + dm, ctY, pw - dm * 2, ph * 0.3, 3); ctx.fill();
      ctx.strokeStyle = '#2a4a6a'; ctx.lineWidth = 1; ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const tx = px + pw * 0.1 + (pw * 0.78 / 8) * i;
        ctx.fillStyle = i < 3 ? '#442200' : '#002244';
        ctx.fillRect(tx, ctY + 8, pw * 0.07, ph * 0.12);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 0.5; ctx.strokeRect(tx, ctY + 8, pw * 0.07, ph * 0.12);
        ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.arc(tx + pw * 0.035, ctY + 8 + ph * 0.06, 4, 0, Math.PI * 2); ctx.fill();
      }
      [['#00ff44','RDY'],['#00ff44','RUN'],['#444','FLT'],['#444','LOC']].forEach(([col, lbl], i) => {
        const lx = px + pw * 0.18 + i * pw * 0.18, ly = ctY + ph * 0.17;
        ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        if (col === '#00ff44') { ctx.shadowColor = col; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0; }
        ctx.fillStyle = '#888'; ctx.font = `${Math.max(6, H * 0.02)}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(lbl, lx, ly + 8);
      });
    };

    /* Surge curve chart */
    const drawSurgeMap = () => {
      bg();
      const cX = W * 0.12, cY = H * 0.06, cW = W * 0.76, cH = H * 0.84;
      ctx.fillStyle = '#080e08'; ctx.fillRect(cX, cY, cW, cH);
      ctx.strokeStyle = '#181e18'; ctx.lineWidth = 1; ctx.strokeRect(cX, cY, cW, cH);
      ctx.strokeStyle = '#181e18'; ctx.lineWidth = 0.8;
      for (let i = 1; i < 8; i++) {
        ctx.beginPath(); ctx.moveTo(cX + cW * i / 8, cY); ctx.lineTo(cX + cW * i / 8, cY + cH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cX, cY + cH * i / 8); ctx.lineTo(cX + cW, cY + cH * i / 8); ctx.stroke();
      }
      ctx.fillStyle = '#557755'; ctx.font = `${Math.max(7, H * 0.023)}px Arial`;
      ctx.textAlign = 'center'; ctx.fillText('% FULL LOAD AMPS', cX + cW / 2, cY + cH + 18);
      ctx.save(); ctx.translate(cX - 20, cY + cH / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center'; ctx.fillText('DIFFERENTIAL PRESSURE (PSID)', 0, 0); ctx.restore();
      ctx.beginPath();
      ctx.moveTo(cX + cW * 0.07, cY + cH * 0.06);
      ctx.bezierCurveTo(cX + cW * 0.25, cY + cH * 0.1, cX + cW * 0.45, cY + cH * 0.28, cX + cW * 0.7, cY + cH * 0.55);
      ctx.bezierCurveTo(cX + cW * 0.82, cY + cH * 0.68, cX + cW * 0.93, cY + cH * 0.79, cX + cW * 0.98, cY + cH * 0.89);
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2.5; ctx.setLineDash([]); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cX + cW * 0.15, cY + cH * 0.06);
      ctx.bezierCurveTo(cX + cW * 0.33, cY + cH * 0.1, cX + cW * 0.53, cY + cH * 0.28, cX + cW * 0.78, cY + cH * 0.55);
      ctx.bezierCurveTo(cX + cW * 0.88, cY + cH * 0.68, cX + cW * 0.96, cY + cH * 0.79, cX + cW * 0.99, cY + cH * 0.91);
      ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 1.8; ctx.setLineDash([6, 4]); ctx.stroke();
      ctx.setLineDash([]);
      const opX = cX + cW * 0.52, opY = cY + cH * 0.65;
      ctx.beginPath(); ctx.arc(opX, opY, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      const lX = cX + cW * 0.64, lY = cY + cH * 0.1;
      ctx.fillStyle = '#ff4444'; ctx.fillRect(lX, lY, 20, 3);
      ctx.fillStyle = '#aaffaa'; ctx.font = `${Math.max(7, H * 0.022)}px Arial`; ctx.textAlign = 'left';
      ctx.fillText('Surge Limit', lX + 26, lY + 4);
      ctx.fillStyle = '#ffaa00'; ctx.fillRect(lX, lY + 18, 20, 2);
      ctx.fillStyle = '#aaffaa'; ctx.fillText('Anti-Surge Limit', lX + 26, lY + 22);
      ctx.fillStyle = '#00ff88'; ctx.beginPath(); ctx.arc(lX + 10, lY + 38, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#aaffaa'; ctx.fillText('Operating Point', lX + 26, lY + 42);
    };

    /* System diagnostics block diagram */
    const drawDiagnostics = () => {
      bg();
      const items = [
        { x: 0.07, y: 0.06, w: 0.22, h: 0.22, lbl: 'EVAPORATOR' },
        { x: 0.38, y: 0.06, w: 0.22, h: 0.22, lbl: 'COMPRESSOR' },
        { x: 0.69, y: 0.06, w: 0.22, h: 0.22, lbl: 'CONDENSER' },
        { x: 0.07, y: 0.44, w: 0.22, h: 0.22, lbl: 'OIL SYSTEM' },
        { x: 0.38, y: 0.44, w: 0.22, h: 0.22, lbl: 'MOTOR' },
        { x: 0.69, y: 0.44, w: 0.22, h: 0.22, lbl: 'VSD DRIVE' },
      ];
      items.forEach(b => {
        const bx = W * b.x, by = H * b.y, bw = W * b.w, bh = H * b.h;
        ctx.fillStyle = 'rgba(0,0,0,0.24)'; ctx.beginPath(); ctx.roundRect(bx + 3, by + 4, bw, bh, 5); ctx.fill();
        const bg2 = ctx.createLinearGradient(bx, by, bx, by + bh);
        bg2.addColorStop(0, '#0e1a0e'); bg2.addColorStop(1, '#050d05');
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 5);
        ctx.fillStyle = bg2; ctx.fill(); ctx.strokeStyle = '#00aa44'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(bx + 14, by + 14, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff66'; ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = '#aaffaa'; ctx.font = `bold ${Math.max(7, H * 0.026)}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.lbl, bx + bw / 2, by + bh / 2 - 7);
        ctx.fillStyle = '#00ff66'; ctx.font = `${Math.max(6, H * 0.02)}px Arial`;
        ctx.fillText('OK', bx + bw / 2, by + bh / 2 + 10);
      });
      [[0.29,0.17,0.38,0.17],[0.60,0.17,0.69,0.17],[0.18,0.28,0.18,0.44],[0.49,0.28,0.49,0.44],[0.60,0.55,0.69,0.55]].forEach(([ax,ay,bx2,by2]) => {
        const x1 = W * ax, y1 = H * ay, x2 = W * bx2, y2 = H * by2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#00aa44'; ctx.lineWidth = 2; ctx.stroke();
        const dx = x2 - x1, dy = y2 - y1, l = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / l, uy = dy / l;
        ctx.beginPath(); ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - ux * 8 - uy * 5, y2 - uy * 8 + ux * 5);
        ctx.lineTo(x2 - ux * 8 + uy * 5, y2 - uy * 8 - ux * 5);
        ctx.closePath(); ctx.fillStyle = '#00aa44'; ctx.fill();
      });
      ctx.fillStyle = 'rgba(0,16,0,0.8)'; ctx.fillRect(W * 0.04, H * 0.78, W * 0.92, H * 0.16);
      ctx.strokeStyle = '#00aa44'; ctx.lineWidth = 1; ctx.strokeRect(W * 0.04, H * 0.78, W * 0.92, H * 0.16);
      ctx.fillStyle = '#00ff66'; ctx.font = `bold ${Math.max(8, H * 0.028)}px "Courier New"`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('ALL SYSTEMS NOMINAL — NO ACTIVE FAULTS', W * 0.5, H * 0.86);
    };

    /* Capacity control — pre-rotation vane ring */
    const drawCapacityControl = () => {
      bg();
      const cx0 = W * 0.5, cy0 = H * 0.52, R = Math.min(W * 0.32, H * 0.42);
      ctx.fillStyle = 'rgba(0,0,0,0.26)';
      ctx.beginPath(); ctx.ellipse(cx0, cy0 + R * 0.88, R * 0.88, R * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      const og = ctx.createRadialGradient(cx0 - R * 0.28, cy0 - R * 0.28, R * 0.1, cx0, cy0, R);
      og.addColorStop(0, '#7cd058'); og.addColorStop(0.4, '#3a9a30'); og.addColorStop(0.8, '#1a6a1a'); og.addColorStop(1, '#062806');
      ctx.beginPath(); ctx.arc(cx0, cy0, R, 0, Math.PI * 2);
      ctx.fillStyle = og; ctx.fill(); ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx0, cy0, R * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = '#0a1a0a'; ctx.fill(); ctx.strokeStyle = '#2a5a2a'; ctx.lineWidth = 1.5; ctx.stroke();
      const vanes = 9, vMaxA = Math.PI / 2.5, vA = vMaxA * 0.4;
      for (let i = 0; i < vanes; i++) {
        const bA = (i / vanes) * Math.PI * 2, pR = R * 0.8;
        const pX = cx0 + Math.cos(bA) * pR, pY = cy0 + Math.sin(bA) * pR;
        const vL = R * 0.4, vW = R * 0.058;
        ctx.save(); ctx.translate(pX, pY); ctx.rotate(bA + Math.PI + vA);
        const vg = ctx.createLinearGradient(-vW / 2, 0, vW / 2, 0);
        vg.addColorStop(0, '#5aba3a'); vg.addColorStop(0.5, '#8adf5a'); vg.addColorStop(1, '#3a8a20');
        ctx.beginPath(); ctx.roundRect(-vW / 2, 0, vW, vL, 2);
        ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = '#0e3a0e'; ctx.lineWidth = 0.8; ctx.stroke();
        ctx.restore();
      }
      const hg = ctx.createRadialGradient(cx0 - R * 0.06, cy0 - R * 0.06, 2, cx0, cy0, R * 0.18);
      hg.addColorStop(0, '#aaffaa'); hg.addColorStop(0.5, '#2a8a2a'); hg.addColorStop(1, '#0a2a0a');
      ctx.beginPath(); ctx.arc(cx0, cy0, R * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = hg; ctx.fill(); ctx.strokeStyle = '#0a3a0a'; ctx.lineWidth = 1.5; ctx.stroke();
      const lX = cx0 + R * 1.04, lY = cy0;
      ctx.fillStyle = '#2a5a2a'; ctx.fillRect(lX, lY - R * 0.12, R * 0.22, R * 0.24);
      ctx.strokeStyle = '#0a3a0a'; ctx.lineWidth = 1.2; ctx.strokeRect(lX, lY - R * 0.12, R * 0.22, R * 0.24);
      ctx.beginPath(); ctx.moveTo(cx0 + R, lY); ctx.lineTo(lX, lY);
      ctx.strokeStyle = '#1a6a1a'; ctx.lineWidth = R * 0.08; ctx.stroke();
    };

    /* Head pressure control — condenser shell + control valve */
    const drawHeadPressure = () => {
      bg();
      const len = W * 0.6, rad = Math.min(H * 0.23, len * 0.18);
      const sCx = W * 0.5, sCy = H * 0.52;
      drawHShell(sCx, sCy, len, rad);
      drawLegs(sCx, sCy, len, rad);
      drawCondInterior(sCx, sCy, len, rad);
      drawWaterBox(sCx - len / 2, sCy, rad);
      const vCx = sCx + len * 0.12, vCy = sCy - rad - H * 0.09, vr = rad * 0.35;
      const vg = ctx.createRadialGradient(vCx - vr * 0.2, vCy - vr * 0.2, vr * 0.1, vCx, vCy, vr);
      vg.addColorStop(0, '#888898'); vg.addColorStop(0.6, '#4a4a5a'); vg.addColorStop(1, '#1a1a28');
      ctx.beginPath(); ctx.arc(vCx, vCy, vr, 0, Math.PI * 2);
      ctx.fillStyle = vg; ctx.fill(); ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1.5; ctx.stroke();
      const aW = vr * 1.55, aH = vr * 1.1;
      ctx.fillStyle = '#3a3a4a'; ctx.fillRect(vCx - aW / 2, vCy - vr - aH, aW, aH);
      ctx.strokeStyle = '#5a5a6a'; ctx.lineWidth = 1; ctx.strokeRect(vCx - aW / 2, vCy - vr - aH, aW, aH);
      ctx.beginPath(); ctx.moveTo(vCx, vCy - vr); ctx.lineTo(vCx, vCy - vr - aH);
      ctx.strokeStyle = '#888'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(vCx, sCy - rad); ctx.lineTo(vCx, vCy + vr);
      ctx.strokeStyle = '#1a6a1a'; ctx.lineWidth = 13; ctx.stroke();
      ctx.fillStyle = '#00ffaa'; ctx.font = `bold ${Math.max(7, H * 0.022)}px "Courier New"`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('CONTROL VALVE', vCx + vr * 2.6, vCy + vr * 0.4);
    };

    /* ── Master draw dispatcher ── */
    const draw = () => {
      if (W === 0 || H === 0) return;
      switch (page) {
        case 'evaporator': {
          bg();
          const len = W * 0.65, rad = Math.min(H * 0.26, len * 0.19);
          const sCx = W * 0.54, sCy = H * 0.52;
          drawHShell(sCx, sCy, len, rad);
          drawLegs(sCx, sCy, len, rad);
          drawEvapInterior(sCx, sCy, len, rad);
          drawWaterBox(sCx - len / 2, sCy, rad);
          break;
        }
        case 'condenser': {
          bg();
          const len = W * 0.65, rad = Math.min(H * 0.26, len * 0.19);
          const sCx = W * 0.54, sCy = H * 0.52;
          drawHShell(sCx, sCy, len, rad);
          drawLegs(sCx, sCy, len, rad);
          drawCondInterior(sCx, sCy, len, rad);
          drawWaterBox(sCx - len / 2, sCy, rad);
          break;
        }
        case 'heatRecovery': {
          bg();
          const len = W * 0.66, rad = Math.min(H * 0.25, len * 0.18);
          const sCx = W * 0.53, sCy = H * 0.52;
          drawHShell(sCx, sCy, len, rad);
          drawLegs(sCx, sCy, len, rad);
          drawCondInterior(sCx, sCy, len, rad);
          drawWaterBox(sCx - len / 2, sCy, rad, '#1a3a8a');
          break;
        }
        case 'compressor':       drawCompressor(angle); break;
        case 'oilsump':          drawOilSump();         break;
        case 'motor':            drawMotor();           break;
        case 'refrigerantLevel': drawRefrigerantLevel(angle); break;
        case 'headPressure':     drawHeadPressure();    break;
        case 'capacityControl':  drawCapacityControl(); break;
        case 'vsdTuning':        drawVSD();             break;
        case 'surgeMap':         drawSurgeMap();        break;
        case 'diagnostics':      drawDiagnostics();     break;
        default: break;
      }
    };

    resize();
    const ro = new ResizeObserver(() => { resize(); if (!ANIMATING.has(page)) draw(); });
    ro.observe(cv.parentElement!);

    if (ANIMATING.has(page)) {
      const loop = () => { angle += 0.04; draw(); raf = requestAnimationFrame(loop); };
      loop();
    } else {
      draw();
    }

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
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

      /* Head pressure control */
      setText(root, 'hp-rcl', S.cndR.toFixed(1) + ' °F');
      setText(root, 'hp-lcl', S.cndL.toFixed(1) + ' °F');
      setText(root, 'hp-deltaP', (80 + Math.random() * 0.8).toFixed(1) + ' PSID');
      setText(root, 'hp-valveOut', (Math.random() * 2.5).toFixed(1) + ' %');

      /* Capacity control */
      setText(root, 'cc-fla', Math.round(S.load) + ' %');
      setText(root, 'cc-vane', Math.round(S.igv) + ' %');
      setText(root, 'cc-chwL', S.chwL.toFixed(1) + ' °F');

      /* VSD tuning */
      setText(root, 'vsd-speed', S.rpm + ' RPM');
      setText(root, 'vsd-freq', (S.rpm / 60).toFixed(1) + ' Hz');
      setText(root, 'vsd-volt', (455 + Math.random() * 8).toFixed(0) + ' V');
      setText(root, 'vsd-dc', (640 + Math.random() * 5).toFixed(0) + ' V');
      setText(root, 'vsd-temp', (103 + Math.random() * 3).toFixed(1) + ' °F');
      setText(root, 'vsd-amps', S.amps + ' A');

      /* Surge map */
      setText(root, 'sg-count', '0');
      setText(root, 'sg-deltaP', (80 + Math.random() * 0.8).toFixed(1) + ' PSID');
      setText(root, 'sg-fla', Math.round(S.load) + ' %');
      setText(root, 'sg-vane', Math.round(S.igv) + ' %');

      /* Diagnostics */
      setText(root, 'd-starts', '147');
      setText(root, 'd-runtime', S.hrs + ' Hr');
      setText(root, 'd-surges', '0');

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
              <div className="det-blocks" style={{ maxHeight: '42%', overflow: 'hidden' }}>
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
            <div className="det-canvas-area">
              <canvas ref={detCanvasRef} />
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
