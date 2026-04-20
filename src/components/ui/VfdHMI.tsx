/* ============================================================================
   VfdHMI.tsx
   Door-mounted operator interface for the YORK OptiSpeed™ Variable Speed
   Drive that powers the YK chiller's centrifugal compressor motor. Modelled
   after a real industrial VFD keypad UI (think YASKAWA P1000 / ABB ACH580 /
   YORK OptiSpeed) with the full set of operator data points and parameter
   controls grouped into pages:

       HOME    — large 3-panel readout (output Hz, motor A, motor kW)
                 plus a live mini-trend strip and the most-needed status
       METERS  — every analog data point the drive computes (frequency,
                 voltage, current, torque, speed, DC bus, heatsinks, run
                 time, lifetime energy, switching frequency, etc.)
       PARAMS  — full P-numbered configuration tree:
                   P1 Motor data
                   P2 Start / Stop control
                   P3 Reference / ramps
                   P4 Limits
                   P5 I/O configuration
                   P6 Communications
                   P7 Protection
                   P8 Application (PID / energy-savings)
                 Each parameter is editable with ▲ / ▼ steppers and shows
                 units + min/max + access level.
       I/O     — live monitor of digital inputs (DI1-DI6), digital outputs
                 (DO1-DO3), analog inputs (AI1, AI2 — speed ref + PT-1
                 pressure xducer), analog outputs (AO1, AO2 — Hz + load %)
       FAULTS  — last 16 events with code, time, frequency-at-trip, and
                 motor current-at-trip
       TREND   — 60-second rolling chart of frequency, motor current and
                 motor power, drawn on a <canvas/> ref so it updates 5×/sec

   The UI is fully self-contained and re-uses the same `<Html transform/>`
   pattern as the chiller's OptiView HMI so it scales cleanly into 3D.
============================================================================ */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

/** Fixed “logical” HMI canvas (original layout). Always laid out at this
 *  size, then uniformly scaled to fit the 3D <Html> viewport — aspect ratio
 *  and internal proportions stay constant; no scrollbars, no cropping. */
export const VFD_HMI_DESIGN_WIDTH = 1100;
export const VFD_HMI_DESIGN_HEIGHT = 750;
export const VFD_HMI_ASPECT_RATIO = VFD_HMI_DESIGN_WIDTH / VFD_HMI_DESIGN_HEIGHT;

/* ─── Page model ─────────────────────────────────────────────────────────── */
type PageKey = 'home' | 'meters' | 'params' | 'io' | 'faults' | 'trend';

const PAGE_LABELS: Record<PageKey, string> = {
  home:   'OPERATING STATUS',
  meters: 'DRIVE METERS',
  params: 'PROGRAMMING',
  io:     'I/O MONITOR',
  faults: 'FAULT HISTORY',
  trend:  'TREND',
};

/* ─── Parameter tree ─────────────────────────────────────────────────────── */
type Group = { id: string; title: string; access: 'View' | 'Op' | 'Svc'; rows: Param[] };
type Param = {
  code: string;
  name: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  /** Displayed default. Becomes editable through the keypad ▲ / ▼ buttons. */
  def: number | string;
  /** When set, the value is rendered as one of these strings instead of a
   *  numeric value (and ▲ / ▼ cycle through the list). */
  enum?: string[];
};

const PARAM_GROUPS: Group[] = [
  {
    id: 'P1',
    title: 'P1  Motor Data',
    access: 'Svc',
    rows: [
      { code: 'P1.01', name: 'Motor Rated Voltage',     unit: 'V',   min: 200,  max: 690,   step: 1,    def: 460 },
      { code: 'P1.02', name: 'Motor Rated Current',     unit: 'A',   min: 50,   max: 1000,  step: 1,    def: 720 },
      { code: 'P1.03', name: 'Motor Rated Frequency',   unit: 'Hz',  min: 30,   max: 120,   step: 1,    def: 60 },
      { code: 'P1.04', name: 'Motor Rated Speed',       unit: 'RPM', min: 600,  max: 18000, step: 5,    def: 3565 },
      { code: 'P1.05', name: 'Motor Rated Power',       unit: 'HP',  min: 1,    max: 1500,  step: 1,    def: 600 },
      { code: 'P1.06', name: 'Motor Power Factor',      unit: '',    min: 0.5,  max: 1.0,   step: 0.01, def: 0.91 },
      { code: 'P1.07', name: 'Motor Pole Pairs',        unit: '',    min: 1,    max: 6,     step: 1,    def: 1 },
      { code: 'P1.08', name: 'Motor Cooling Type',      unit: '',    min: 0,    max: 2,     step: 1,    def: 'TEFC', enum: ['ODP', 'TEFC', 'TEAAC'] },
    ],
  },
  {
    id: 'P2',
    title: 'P2  Start / Stop Control',
    access: 'Op',
    rows: [
      { code: 'P2.01', name: 'Start Mode',              unit: '',   min: 0, max: 3,   step: 1, def: 'Ramp', enum: ['Ramp', 'Flying-Start', 'Pre-Magnetize', 'DC-Brake'] },
      { code: 'P2.02', name: 'Stop Mode',               unit: '',   min: 0, max: 2,   step: 1, def: 'Ramp', enum: ['Coast', 'Ramp', 'DC-Brake'] },
      { code: 'P2.03', name: 'Acceleration Time',       unit: 's',  min: 1,  max: 600, step: 1, def: 60 },
      { code: 'P2.04', name: 'Deceleration Time',       unit: 's',  min: 1,  max: 600, step: 1, def: 90 },
      { code: 'P2.05', name: 'Pre-Magnetize Time',      unit: 's',  min: 0,  max: 30,  step: 1, def: 4 },
      { code: 'P2.06', name: 'Auto-Restart',            unit: '',   min: 0,  max: 1,   step: 1, def: 'Off', enum: ['Off', 'On'] },
      { code: 'P2.07', name: 'Restart Attempts',        unit: '',   min: 0,  max: 10,  step: 1, def: 3 },
      { code: 'P2.08', name: 'Restart Delay',           unit: 's',  min: 1,  max: 300, step: 1, def: 30 },
    ],
  },
  {
    id: 'P3',
    title: 'P3  Reference / Ramps',
    access: 'Op',
    rows: [
      { code: 'P3.01', name: 'Reference Source',        unit: '', min: 0,    max: 4,    step: 1,    def: 'BACnet',   enum: ['Keypad', '0-10V (AI1)', '4-20mA (AI2)', 'BACnet', 'Modbus'] },
      { code: 'P3.02', name: 'Min Frequency',           unit: 'Hz', min: 0,  max: 30,   step: 0.1,  def: 12.0 },
      { code: 'P3.03', name: 'Max Frequency',           unit: 'Hz', min: 30, max: 120,  step: 0.1,  def: 60.0 },
      { code: 'P3.04', name: 'Jog Frequency',           unit: 'Hz', min: 0,  max: 30,   step: 0.5,  def: 5.0 },
      { code: 'P3.05', name: 'Skip Freq Band 1',        unit: 'Hz', min: 0,  max: 60,   step: 0.5,  def: 0.0 },
      { code: 'P3.06', name: 'Skip Freq Band 2',        unit: 'Hz', min: 0,  max: 60,   step: 0.5,  def: 0.0 },
      { code: 'P3.07', name: 'S-Curve %',               unit: '%',  min: 0,  max: 100,  step: 1,    def: 25 },
      { code: 'P3.08', name: 'Reverse Direction',       unit: '',   min: 0,  max: 1,    step: 1,    def: 'Disabled', enum: ['Disabled', 'Enabled'] },
    ],
  },
  {
    id: 'P4',
    title: 'P4  Limits',
    access: 'Op',
    rows: [
      { code: 'P4.01', name: 'Current Limit',           unit: '%FLA',  min: 50,  max: 200, step: 1, def: 110 },
      { code: 'P4.02', name: 'Torque Limit (Motoring)', unit: '%',     min: 50,  max: 250, step: 1, def: 150 },
      { code: 'P4.03', name: 'Torque Limit (Regen)',    unit: '%',     min: 50,  max: 250, step: 1, def: 150 },
      { code: 'P4.04', name: 'kW Limit',                unit: 'kW',    min: 0,   max: 600, step: 1, def: 480 },
      { code: 'P4.05', name: 'Surge Avoid Min Hz',      unit: 'Hz',    min: 0,   max: 30,  step: 0.5, def: 18.0 },
      { code: 'P4.06', name: 'DC Bus Over-V Trip',      unit: 'V',     min: 700, max: 900, step: 1, def: 820 },
      { code: 'P4.07', name: 'DC Bus Under-V Trip',     unit: 'V',     min: 350, max: 600, step: 1, def: 460 },
    ],
  },
  {
    id: 'P5',
    title: 'P5  I/O Configuration',
    access: 'Svc',
    rows: [
      { code: 'P5.01', name: 'DI1 Function', unit: '', min: 0, max: 6, step: 1, def: 'Run/Stop',     enum: ['Disabled', 'Run/Stop', 'Run-FWD', 'Run-REV', 'Jog', 'Reset', 'E-Stop'] },
      { code: 'P5.02', name: 'DI2 Function', unit: '', min: 0, max: 6, step: 1, def: 'Reset',        enum: ['Disabled', 'Run/Stop', 'Run-FWD', 'Run-REV', 'Jog', 'Reset', 'E-Stop'] },
      { code: 'P5.03', name: 'DI3 Function', unit: '', min: 0, max: 6, step: 1, def: 'E-Stop',       enum: ['Disabled', 'Run/Stop', 'Run-FWD', 'Run-REV', 'Jog', 'Reset', 'E-Stop'] },
      { code: 'P5.04', name: 'AI1 Function', unit: '', min: 0, max: 3, step: 1, def: 'Speed Ref',    enum: ['Disabled', 'Speed Ref', 'PID Setpoint', 'PID Feedback'] },
      { code: 'P5.05', name: 'AI1 Min',      unit: 'V', min: 0, max: 10, step: 0.1, def: 0.0 },
      { code: 'P5.06', name: 'AI1 Max',      unit: 'V', min: 0, max: 10, step: 0.1, def: 10.0 },
      { code: 'P5.07', name: 'DO1 Function', unit: '', min: 0, max: 5, step: 1, def: 'Run',          enum: ['Disabled', 'Run', 'Fault', 'At Speed', 'Ready', 'Warning'] },
      { code: 'P5.08', name: 'DO2 Function', unit: '', min: 0, max: 5, step: 1, def: 'Fault',        enum: ['Disabled', 'Run', 'Fault', 'At Speed', 'Ready', 'Warning'] },
      { code: 'P5.09', name: 'AO1 Function', unit: '', min: 0, max: 3, step: 1, def: 'Output Hz',    enum: ['Disabled', 'Output Hz', 'Motor Current', 'Motor Power'] },
    ],
  },
  {
    id: 'P6',
    title: 'P6  Communications',
    access: 'Svc',
    rows: [
      { code: 'P6.01', name: 'Comm Protocol', unit: '', min: 0, max: 3, step: 1, def: 'BACnet/IP', enum: ['Off', 'Modbus RTU', 'BACnet MS/TP', 'BACnet/IP'] },
      { code: 'P6.02', name: 'Drive Address', unit: '', min: 1, max: 247, step: 1, def: 17 },
      { code: 'P6.03', name: 'Baud Rate',     unit: 'kbps', min: 0, max: 4, step: 1, def: '38.4', enum: ['9.6', '19.2', '38.4', '57.6', '115.2'] },
      { code: 'P6.04', name: 'Comm Timeout',  unit: 's', min: 0, max: 60, step: 1, def: 5 },
      { code: 'P6.05', name: 'Comm Loss Action', unit: '', min: 0, max: 2, step: 1, def: 'Hold Last', enum: ['Coast Stop', 'Hold Last', 'Run at Pre-Set Hz'] },
    ],
  },
  {
    id: 'P7',
    title: 'P7  Protection',
    access: 'Svc',
    rows: [
      { code: 'P7.01', name: 'Motor Thermal I²t', unit: '%', min: 80, max: 120, step: 1, def: 100 },
      { code: 'P7.02', name: 'Motor Therm Class', unit: '', min: 0, max: 2, step: 1, def: 'Class 20', enum: ['Class 10', 'Class 20', 'Class 30'] },
      { code: 'P7.03', name: 'Stall Prevention',  unit: '', min: 0, max: 1, step: 1, def: 'On',  enum: ['Off', 'On'] },
      { code: 'P7.04', name: 'Phase-Loss Trip',   unit: '', min: 0, max: 1, step: 1, def: 'On',  enum: ['Off', 'On'] },
      { code: 'P7.05', name: 'Ground-Fault Trip', unit: '', min: 0, max: 1, step: 1, def: 'On',  enum: ['Off', 'On'] },
      { code: 'P7.06', name: 'Overtemp Trip °C',  unit: '°C', min: 60, max: 100, step: 1, def: 90 },
    ],
  },
  {
    id: 'P8',
    title: 'P8  Application (PID / Energy)',
    access: 'Op',
    rows: [
      { code: 'P8.01', name: 'PID Mode',          unit: '', min: 0, max: 1, step: 1, def: 'Off',     enum: ['Off', 'On'] },
      { code: 'P8.02', name: 'PID Setpoint',      unit: 'PSI', min: 0, max: 200, step: 0.1, def: 17.3 },
      { code: 'P8.03', name: 'PID Feedback Src',  unit: '', min: 0, max: 1, step: 1, def: 'AI2',     enum: ['AI1', 'AI2'] },
      { code: 'P8.04', name: 'PID Kp',            unit: '', min: 0, max: 10, step: 0.01, def: 1.50 },
      { code: 'P8.05', name: 'PID Ti',            unit: 's', min: 0, max: 600, step: 0.1, def: 12.0 },
      { code: 'P8.06', name: 'PID Td',            unit: 's', min: 0, max: 60,  step: 0.01, def: 0.0 },
      { code: 'P8.07', name: 'Energy Save Mode',  unit: '', min: 0, max: 1, step: 1, def: 'On',  enum: ['Off', 'On'] },
      { code: 'P8.08', name: 'Sleep Threshold',   unit: 'Hz', min: 0, max: 30, step: 0.5, def: 14.0 },
    ],
  },
];

/* ─── Fault history (typical YK / OptiSpeed VSD fault codes) ─────────────── */
type FaultRec = { t: string; d: string; code: string; desc: string; hz: string; amp: string; sev: 'F' | 'W' | 'I' };
const FAULT_LOG: FaultRec[] = [
  { t: '14:32', d: '08 NOV', code: '—',     desc: 'Drive Reset — Operator',          hz: ' 0.0', amp: '   0', sev: 'I' },
  { t: '14:31', d: '08 NOV', code: 'F-021', desc: 'Motor Overload (I²t)',            hz: '57.4', amp: ' 794', sev: 'F' },
  { t: '11:08', d: '06 NOV', code: 'W-103', desc: 'High Heatsink Temperature',       hz: '60.0', amp: ' 712', sev: 'W' },
  { t: '11:08', d: '06 NOV', code: '—',     desc: 'High Heatsink Temp — Cleared',    hz: '57.0', amp: ' 690', sev: 'I' },
  { t: '02:14', d: '04 NOV', code: 'W-211', desc: 'BACnet Comm Loss — Hold Last',    hz: '54.0', amp: ' 622', sev: 'W' },
  { t: '02:18', d: '04 NOV', code: '—',     desc: 'BACnet Comm Restored',            hz: '54.0', amp: ' 624', sev: 'I' },
  { t: '06:55', d: '01 NOV', code: 'F-008', desc: 'DC Bus Over-Voltage',             hz: '60.0', amp: ' 350', sev: 'F' },
  { t: '06:55', d: '01 NOV', code: '—',     desc: 'Drive Power-Up — Self-Test OK',   hz: ' 0.0', amp: '   0', sev: 'I' },
  { t: '17:43', d: '28 OCT', code: 'F-031', desc: 'Loss of Speed Reference (AI2)',   hz: '38.0', amp: ' 442', sev: 'F' },
  { t: '17:42', d: '28 OCT', code: 'W-031', desc: 'Speed Ref Out-of-Range Warning',  hz: '38.0', amp: ' 442', sev: 'W' },
  { t: '08:01', d: '25 OCT', code: '—',     desc: 'Drive Started — Auto/BACnet',     hz: ' 0.0', amp: '   0', sev: 'I' },
  { t: '20:12', d: '24 OCT', code: '—',     desc: 'Drive Stopped — Normal Ramp',     hz: ' 0.0', amp: '   0', sev: 'I' },
  { t: '14:00', d: '24 OCT', code: 'I-040', desc: 'Parameter Saved (P3.03=60.0)',    hz: '57.0', amp: ' 658', sev: 'I' },
  { t: '08:00', d: '24 OCT', code: '—',     desc: 'Drive Started — Auto/BACnet',     hz: ' 0.0', amp: '   0', sev: 'I' },
  { t: '20:30', d: '23 OCT', code: '—',     desc: 'Drive Stopped — Normal Ramp',     hz: ' 0.0', amp: '   0', sev: 'I' },
  { t: '08:00', d: '23 OCT', code: '—',     desc: 'Drive Started — Auto/BACnet',     hz: ' 0.0', amp: '   0', sev: 'I' },
];

/* ─── Stylesheet (scoped under .vfd-hmi-root) ────────────────────────────── */
const VFD_CSS = `
.vfd-hmi-root, .vfd-hmi-root * { box-sizing:border-box; margin:0; padding:0 }
.vfd-hmi-root {
  width:100%; height:100%;
  background:#0f1115;
  font-family:'Inter','Helvetica Neue',Arial,sans-serif;
  border:3px solid #1a1d24;
  display:flex; flex-direction:column;
  overflow:hidden; color:#dfe4ec;
}

/* ── HEADER STRIP ── */
.vfd-hmi-root .vh-top {
  display:flex; align-items:stretch;
  background:linear-gradient(180deg,#101521 0%,#0a0d14 100%);
  border-bottom:2px solid #1a5fb4;
  min-height:48px;
}
.vfd-hmi-root .vh-brand {
  display:flex; flex-direction:column; justify-content:center;
  padding:6px 14px; border-right:1px solid #1a1d24; min-width:200px;
}
.vfd-hmi-root .vh-brand .b1 { color:#e6ecff; font-weight:800; font-size:13px; letter-spacing:1px }
.vfd-hmi-root .vh-brand .b2 { color:#5fb6ff; font-weight:700; font-size:11px; letter-spacing:2px }
.vfd-hmi-root .vh-brand .b3 { color:#6e7588; font-size:9px; letter-spacing:1px; margin-top:2px }

.vfd-hmi-root .vh-status {
  flex:1; display:flex; align-items:center;
  padding:0 12px; gap:18px;
}
.vfd-hmi-root .vh-pill {
  display:inline-flex; align-items:center; gap:6px;
  border-radius:3px; padding:4px 10px;
  font-size:11px; font-weight:700; letter-spacing:1.2px;
  border:1px solid #2a3140;
}
.vfd-hmi-root .vh-pill .dot { width:8px; height:8px; border-radius:50%; background:#444 }
.vfd-hmi-root .vh-pill.run   { background:#06321a; border-color:#1ea83a; color:#7cffa4 }
.vfd-hmi-root .vh-pill.run   .dot { background:#1ea83a; box-shadow:0 0 6px #1ea83a }
.vfd-hmi-root .vh-pill.rdy   { background:#3a2810; border-color:#cc7700; color:#ffd485 }
.vfd-hmi-root .vh-pill.rdy   .dot { background:#cc7700 }
.vfd-hmi-root .vh-pill.flt   { background:#3a0a0a; border-color:#cc1818; color:#ffb3b3 }
.vfd-hmi-root .vh-pill.flt   .dot { background:#cc1818 }
.vfd-hmi-root .vh-pill.auto  { background:#0e2244; border-color:#1a5fb4; color:#9bc4ff }
.vfd-hmi-root .vh-pill.auto  .dot { background:#1a5fb4 }

.vfd-hmi-root .vh-clock {
  border-left:1px solid #1a1d24;
  padding:6px 14px;
  display:flex; flex-direction:column; align-items:flex-end; justify-content:center;
}
.vfd-hmi-root .vh-clock .c1 { color:#9aa3b6; font-size:10px; letter-spacing:1px }
.vfd-hmi-root .vh-clock .c2 { color:#e6ecff; font-size:14px; font-weight:700; letter-spacing:0.5px }

/* ── PAGE TABS ── */
.vfd-hmi-root .vh-tabs {
  display:flex;
  background:#0a0d14;
  border-bottom:1px solid #1a1d24;
}
.vfd-hmi-root .vh-tab {
  flex:1; padding:6px 3px; text-align:center;
  font-size:10px; font-weight:700; letter-spacing:1px;
  color:#6e7588; background:transparent;
  border:none; border-right:1px solid #1a1d24; cursor:pointer;
  transition:background 0.1s,color 0.1s;
}
.vfd-hmi-root .vh-tab:last-child { border-right:none }
.vfd-hmi-root .vh-tab:hover { color:#cad2e0; background:#101521 }
.vfd-hmi-root .vh-tab.on   { color:#5fb6ff; background:#0e2244; box-shadow:inset 0 -3px 0 #1a5fb4 }

/* ── BODY ── */
.vfd-hmi-root .vh-body { flex:1; overflow:hidden; position:relative; min-height:0 }
.vfd-hmi-root .vh-page {
  position:absolute; inset:0; padding:8px 10px; display:none; flex-direction:column; gap:6px;
  overflow:hidden; min-height:0;
}
.vfd-hmi-root .vh-page.vis { display:flex }

/* ── HOME ── */
.vfd-hmi-root .vh-bigrow { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px }
.vfd-hmi-root .vh-bigcell {
  background:linear-gradient(180deg,#101521 0%,#070a10 100%);
  border:1px solid #1a2030;
  padding:8px 10px;
}
.vfd-hmi-root .vh-bigcell .lbl { color:#7c8499; font-size:9px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase }
.vfd-hmi-root .vh-bigcell .val { color:#7cffa4; font-size:28px; font-weight:800; line-height:1.1; font-variant-numeric:tabular-nums; text-shadow:0 0 8px #1ea83a44; margin-top:2px }
.vfd-hmi-root .vh-bigcell .unit { color:#7c8499; font-size:11px; font-weight:600; letter-spacing:1px }
.vfd-hmi-root .vh-bigcell.amber .val { color:#ffd485; text-shadow:0 0 8px #cc770044 }
.vfd-hmi-root .vh-bigcell.cyan  .val { color:#9bdfff; text-shadow:0 0 8px #1a8acf44 }

.vfd-hmi-root .vh-microtrend {
  background:#070a10; border:1px solid #1a2030; padding:6px 8px;
  display:flex; flex-direction:column; gap:4px;
}
.vfd-hmi-root .vh-microtrend .ti { display:flex; justify-content:space-between; align-items:center }
.vfd-hmi-root .vh-microtrend .ti span { color:#7c8499; font-size:9px; letter-spacing:1px; font-weight:700 }
.vfd-hmi-root .vh-microtrend canvas { width:100%; height:62px; display:block; background:#040608 }

.vfd-hmi-root .vh-status-grid {
  display:grid; grid-template-columns:1fr 1fr; gap:6px;
}
.vfd-hmi-root .vh-statline {
  display:flex; justify-content:space-between; align-items:center;
  background:#0a0d14; border:1px solid #1a2030;
  padding:5px 9px; font-size:11px;
}
.vfd-hmi-root .vh-statline .k { color:#9aa3b6; font-weight:600 }
.vfd-hmi-root .vh-statline .v { color:#e6ecff; font-weight:700; font-variant-numeric:tabular-nums }
.vfd-hmi-root .vh-statline .v.ok { color:#7cffa4 }
.vfd-hmi-root .vh-statline .v.warn { color:#ffd485 }

/* ── METERS ── */
.vfd-hmi-root .vh-mgrid { display:grid; grid-template-columns:repeat(3,1fr); gap:4px }
.vfd-hmi-root .vh-meter {
  background:#070a10; border:1px solid #1a2030; padding:7px 9px;
}
.vfd-hmi-root .vh-meter .ml { color:#7c8499; font-size:9px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase }
.vfd-hmi-root .vh-meter .mv { color:#7cffa4; font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; margin-top:2px }
.vfd-hmi-root .vh-meter .mv .u { color:#7c8499; font-size:10px; font-weight:600; margin-left:3px }
.vfd-hmi-root .vh-meter.amb .mv { color:#ffd485 }
.vfd-hmi-root .vh-meter.blu .mv { color:#9bdfff }
.vfd-hmi-root .vh-meter.red .mv { color:#ff8a8a }
.vfd-hmi-root .vh-meter.wht .mv { color:#dfe4ec }

.vfd-hmi-root .vh-bartile {
  background:#070a10; border:1px solid #1a2030; padding:7px 9px;
  display:flex; flex-direction:column; gap:5px;
}
.vfd-hmi-root .vh-bartile .bl {
  display:flex; justify-content:space-between; font-size:10px; color:#9aa3b6; font-weight:700; letter-spacing:0.5px;
}
.vfd-hmi-root .vh-bartile .btr { height:8px; background:#040608; border:1px solid #1a2030; overflow:hidden }
.vfd-hmi-root .vh-bartile .bfl { height:100%; background:linear-gradient(90deg,#1ea83a,#7cffa4); transition:width 0.5s }
.vfd-hmi-root .vh-bartile .bfl.amb { background:linear-gradient(90deg,#cc7700,#ffd485) }
.vfd-hmi-root .vh-bartile .bfl.red { background:linear-gradient(90deg,#a01818,#ff6464) }

/* ── PARAMS ── */
.vfd-hmi-root .vh-pwrap { display:grid; grid-template-columns:132px 1fr; gap:5px; height:100%; min-height:0 }
.vfd-hmi-root .vh-pleft {
  display:flex; flex-direction:column; gap:2px;
  background:#0a0d14; border:1px solid #1a2030; padding:4px;
  overflow:hidden; min-height:0;
}
.vfd-hmi-root .vh-pgrp {
  background:#101521; border:1px solid #1a2030;
  color:#cad2e0; font-size:10px; font-weight:700; letter-spacing:0.5px;
  text-align:left; padding:5px 6px; cursor:pointer;
}
.vfd-hmi-root .vh-pgrp:hover { background:#162038; color:#fff }
.vfd-hmi-root .vh-pgrp.on   { background:#0e2244; color:#9bdfff; border-color:#1a5fb4 }
.vfd-hmi-root .vh-pgrp .ac  { display:block; color:#6e7588; font-size:8px; letter-spacing:1px; margin-top:2px }
.vfd-hmi-root .vh-pgrp.on .ac { color:#5fb6ff }

.vfd-hmi-root .vh-pright {
  background:#070a10; border:1px solid #1a2030; padding:6px 8px;
  overflow:hidden; min-height:0;
}
.vfd-hmi-root .vh-prow {
  display:grid; grid-template-columns:58px 1fr 142px;
  align-items:center;
  border-bottom:1px solid #14182a; padding:3px 0;
  font-size:10px;
}
.vfd-hmi-root .vh-prow:last-child { border-bottom:none }
.vfd-hmi-root .vh-prow .pcode { color:#5fb6ff; font-weight:700; font-family:'JetBrains Mono','Courier New',monospace; font-size:10.5px }
.vfd-hmi-root .vh-prow .pname { color:#cad2e0; font-weight:600 }
.vfd-hmi-root .vh-prow .pname .pmm { color:#6e7588; font-size:9px; font-weight:500; margin-left:5px }
.vfd-hmi-root .vh-pctl  { display:flex; align-items:center; gap:4px; justify-content:flex-end }
.vfd-hmi-root .vh-pctl .pinp {
  background:#040608; border:1px solid #1a5fb4;
  color:#7cffa4; font-family:'JetBrains Mono','Courier New',monospace;
  font-size:12px; font-weight:700; padding:3px 6px;
  width:80px; text-align:right; -moz-appearance:textfield;
}
.vfd-hmi-root .vh-pctl .pinp::-webkit-outer-spin-button,
.vfd-hmi-root .vh-pctl .pinp::-webkit-inner-spin-button { -webkit-appearance:none; margin:0 }
.vfd-hmi-root .vh-pctl .penum {
  background:#040608; border:1px solid #1a5fb4;
  color:#9bdfff; font-size:11px; font-weight:700;
  padding:3px 6px; min-width:80px; text-align:center;
}
.vfd-hmi-root .vh-pctl .punit { color:#7c8499; font-size:10px; min-width:32px; text-align:left }
.vfd-hmi-root .vh-pctl .parr {
  background:#101521; border:1px solid #2a3140;
  color:#cad2e0; font-size:11px; font-weight:700;
  padding:2px 7px; cursor:pointer;
}
.vfd-hmi-root .vh-pctl .parr:hover { background:#162038; color:#fff }

/* ── I/O ── */
.vfd-hmi-root .vh-iorow { display:grid; grid-template-columns:1fr 1fr; gap:8px }
.vfd-hmi-root .vh-iocard { background:#070a10; border:1px solid #1a2030; padding:8px 10px }
.vfd-hmi-root .vh-iocard h4 {
  color:#5fb6ff; font-size:10px; letter-spacing:2px; text-transform:uppercase;
  border-bottom:1px solid #14182a; padding-bottom:4px; margin-bottom:6px; font-weight:700;
}
.vfd-hmi-root .vh-iorow2 { display:flex; justify-content:space-between; align-items:center; padding:3px 0; font-size:11px }
.vfd-hmi-root .vh-iorow2 .ik { color:#9aa3b6; font-weight:600 }
.vfd-hmi-root .vh-iorow2 .iv { color:#7cffa4; font-weight:700; font-family:'JetBrains Mono','Courier New',monospace; font-size:11px }
.vfd-hmi-root .vh-led { width:11px; height:11px; border-radius:50%; background:#222; border:1px solid #333; display:inline-block; margin-right:6px; vertical-align:middle }
.vfd-hmi-root .vh-led.on  { background:#1ea83a; border-color:#7cffa4; box-shadow:0 0 5px #1ea83a }
.vfd-hmi-root .vh-led.amb { background:#cc7700; border-color:#ffd485; box-shadow:0 0 5px #cc7700 }
.vfd-hmi-root .vh-led.red { background:#cc1818; border-color:#ff8a8a; box-shadow:0 0 5px #cc1818 }

/* ── FAULTS ── */
.vfd-hmi-root .vh-faults { width:100%; border-collapse:collapse; font-size:11px }
.vfd-hmi-root .vh-faults th {
  color:#5fb6ff; font-size:8px; letter-spacing:1.2px; text-transform:uppercase;
  text-align:left; padding:4px 5px; border-bottom:1px solid #1a5fb4; font-weight:700;
}
.vfd-hmi-root .vh-faults td {
  color:#cad2e0; padding:3px 5px; border-bottom:1px solid #14182a;
  font-family:'JetBrains Mono','Courier New',monospace; font-size:9.5px;
}
.vfd-hmi-root .vh-faults tr:nth-child(even) td { background:#0a0d14 }
.vfd-hmi-root .vh-faults .sevF { color:#ff8a8a }
.vfd-hmi-root .vh-faults .sevW { color:#ffd485 }
.vfd-hmi-root .vh-faults .sevI { color:#9aa3b6 }
.vfd-hmi-root .vh-faults .sevB { color:#7cffa4 }

/* ── TREND ── */
.vfd-hmi-root .vh-trendwrap { flex:1; display:flex; flex-direction:column; gap:5px; min-height:0 }
.vfd-hmi-root .vh-trendlegend { display:flex; gap:14px; padding:4px 8px; font-size:10.5px; color:#9aa3b6 }
.vfd-hmi-root .vh-trendlegend .swatch { display:inline-block; width:22px; height:3px; vertical-align:middle; margin-right:5px }
.vfd-hmi-root .vh-trendcanvas {
  flex:1; background:#040608; border:1px solid #1a2030; position:relative; overflow:hidden;
}
.vfd-hmi-root .vh-trendcanvas canvas { position:absolute; inset:0; width:100%; height:100%; display:block }

/* ── FOOTER (soft keys / nav cluster) ── */
.vfd-hmi-root .vh-foot {
  display:flex; gap:4px;
  background:#0a0d14;
  border-top:1px solid #1a1d24; padding:5px 6px;
}
.vfd-hmi-root .vh-foot .sk {
  flex:1;
  background:linear-gradient(180deg,#1a5fb4 0%,#0e3a7a 100%);
  border:1px solid #5090e0;
  color:#fff; font-size:10px; font-weight:800; letter-spacing:1px;
  padding:6px 4px; cursor:pointer;
  text-shadow:0 1px 1px #00000088;
}
.vfd-hmi-root .vh-foot .sk:hover { background:linear-gradient(180deg,#2269c8 0%,#1a4a96 100%) }
.vfd-hmi-root .vh-foot .sk.tone-stop { background:linear-gradient(180deg,#a01818 0%,#680f0f 100%); border-color:#ff5050 }
.vfd-hmi-root .vh-foot .sk.tone-go   { background:linear-gradient(180deg,#1ea83a 0%,#0d6420 100%); border-color:#7cffa4 }
`;

let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('vfd-hmi-styles')) {
    stylesInjected = true;
    return;
  }
  const el = document.createElement('style');
  el.id = 'vfd-hmi-styles';
  el.textContent = VFD_CSS;
  document.head.appendChild(el);
  stylesInjected = true;
}

function jit(v: number, r: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v + (Math.random() - 0.5) * r));
}

const fmt = (v: number, dp = 1) => v.toFixed(dp);

/* ============================================================================
   VfdHMI — root component
============================================================================ */
export interface VfdHmiProps {
  /** When false, the drive shows "STOPPED — READY" and zeros most analog
   *  values; when true, the drive simulates loaded operation around 60 Hz. */
  running?: boolean;
}

export function VfdHMI({ running = true }: VfdHmiProps) {
  ensureStyles();

  const [page, setPage] = useState<PageKey>('home');
  const [activeGroup, setActiveGroup] = useState<string>('P1');
  const [paramVals, setParamVals] = useState<Record<string, number | string>>(() => {
    const o: Record<string, number | string> = {};
    for (const g of PARAM_GROUPS) for (const r of g.rows) o[r.code] = r.def;
    return o;
  });
  const [now, setNow] = useState(() => new Date());

  /* live clock */
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5_000);
    return () => clearInterval(id);
  }, []);
  const clk = useMemo(() => {
    const d = now;
    const dd = `${String(d.getDate()).padStart(2, '0')} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]}`;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return { date: dd, time: `${hh}:${mm}` };
  }, [now]);

  /* ─── live signal model ─────────────────────────────────────────────────
     This is the same simulation flavour as the chiller HMI: we keep a
     mutable "S" record that we jit per tick and push values into the DOM
     by querying [data-v="…"] under our scoped root. Avoids re-rendering
     the entire React tree at 5Hz. */
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const trendCvRef = useRef<HTMLCanvasElement>(null);
  const microTrendRef = useRef<HTMLCanvasElement>(null);

  /* Uniform scale: logical layout is always DESIGN_W×DESIGN_H px; fits the
     parent (3D Html) viewport without scrollbars or non-uniform squish. */
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / VFD_HMI_DESIGN_WIDTH, h / VFD_HMI_DESIGN_HEIGHT);
      setFitScale(s > 0 && Number.isFinite(s) ? s : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* trend rolling buffers, last 60s @ 5Hz = 300 samples */
  const trendBuf = useRef({
    hz: [] as number[],
    amp: [] as number[],
    kw: [] as number[],
  });
  const MAX_SAMPLES = 300;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const S = {
      hz:   running ? 60.0 : 0,
      ref:  60.0,
      amp:  running ? 342  : 0,
      kw:   running ? 252  : 0,
      vlt:  running ? 460  : 0,
      torq: running ? 78   : 0,
      rpm:  running ? 3565 : 0,
      bus:  running ? 658  : 612,
      hsT:  running ? 56.4 : 38.0,
      ambT: 32.0,
      pf:   running ? 0.91 : 0.0,
      sw:   2.0,
      runHrs: 4187,
      kwh:    18_482_460,
      tick: 0,
    };

    const setV = (id: string, value: string) => {
      const el = root.querySelector<HTMLElement>(`[data-v="${id}"]`);
      if (el) el.textContent = value;
    };
    const setBar = (id: string, pct: number, cls?: 'amb' | 'red') => {
      const el = root.querySelector<HTMLDivElement>(`[data-v="${id}"]`);
      if (el) {
        el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        el.className = 'bfl' + (cls ? ` ${cls}` : '');
      }
    };

    const tick = () => {
      S.tick++;
      if (running) {
        S.hz   = jit(S.hz,   0.05, 59.7, 60.2);
        S.amp  = jit(S.amp,  3,    310,  385);
        S.kw   = jit(S.kw,   2,    225,  295);
        S.vlt  = jit(S.vlt,  0.4,  455,  466);
        S.torq = jit(S.torq, 0.6,  72,   88);
        S.rpm  = Math.round(S.hz / 60 * 3600);
        S.bus  = jit(S.bus,  0.6,  650,  668);
        S.hsT  = jit(S.hsT,  0.12, 54.5, 60.5);
        S.pf   = jit(S.pf,   0.004, 0.89, 0.93);
        if (S.tick % 200 === 0) S.runHrs += 1;
        S.kwh  += S.kw / 3600 * 0.2;
      }

      /* HOME big-tile readouts */
      setV('home-hz',   running ? fmt(S.hz, 1) : '  0.0');
      setV('home-amp',  running ? String(Math.round(S.amp)) : '  0');
      setV('home-kw',   running ? String(Math.round(S.kw))  : '  0');
      setV('home-rpm',  running ? `${S.rpm} RPM`           : '  0 RPM');
      setV('home-pct',  running ? `${Math.round(S.amp / 720 * 100)}%`  : '0%');
      setV('home-mode', running ? 'AUTO · BACnet' : 'STOP · OPERATOR');
      setV('home-pf',   running ? S.pf.toFixed(2) : '0.00');
      setV('home-bus',  `${Math.round(S.bus)} V`);
      setV('home-hs',   `${S.hsT.toFixed(1)} °C`);
      setV('home-ref',  `${S.ref.toFixed(1)} Hz`);
      setV('home-trq',  running ? `${Math.round(S.torq)} %` : '0 %');
      setV('home-runhrs', `${S.runHrs.toLocaleString()} h`);

      /* METERS */
      setV('m-hz',     running ? fmt(S.hz, 2) : '0.00');
      setV('m-ref',    fmt(S.ref, 2));
      setV('m-amp',    running ? fmt(S.amp, 1) : '0.0');
      setV('m-vlt',    running ? String(Math.round(S.vlt)) : '0');
      setV('m-kw',     running ? fmt(S.kw, 1) : '0.0');
      setV('m-hp',     running ? String(Math.round(S.kw * 1.341)) : '0');
      setV('m-trq',    running ? fmt(S.torq, 1) : '0.0');
      setV('m-rpm',    running ? S.rpm.toString() : '0');
      setV('m-pf',     running ? S.pf.toFixed(2) : '0.00');
      setV('m-bus',    Math.round(S.bus).toString());
      setV('m-hsT',    fmt(S.hsT, 1));
      setV('m-ambT',   fmt(S.ambT, 1));
      setV('m-sw',     S.sw.toFixed(1));
      setV('m-runhrs', S.runHrs.toLocaleString());
      setV('m-kwh',    Math.round(S.kwh).toLocaleString());
      setV('m-load',   running ? `${(S.amp / 720 * 100).toFixed(1)}` : '0.0');

      setBar('m-bar-amp',  running ? S.amp / 720 * 100 : 0,
             S.amp / 720 > 1.05 ? 'red' : S.amp / 720 > 0.92 ? 'amb' : undefined);
      setBar('m-bar-kw',   running ? S.kw / 480 * 100  : 0);
      setBar('m-bar-trq',  running ? S.torq           : 0,
             S.torq > 95 ? 'red' : S.torq > 85 ? 'amb' : undefined);
      setBar('m-bar-bus',  ((S.bus - 460) / (820 - 460)) * 100,
             S.bus > 800 ? 'red' : S.bus > 760 ? 'amb' : undefined);
      setBar('m-bar-hs',   ((S.hsT) / 90) * 100,
             S.hsT > 85 ? 'red' : S.hsT > 75 ? 'amb' : undefined);

      /* I/O — live digitals + analogs */
      const di1 = running;       // run command
      const di2 = false;         // reset
      const di3 = false;         // e-stop pressed
      const di4 = false;         // jog
      const di5 = true;          // safety chain made
      const di6 = false;         // remote/local
      const ledClass = (on: boolean) => 'vh-led' + (on ? ' on' : '');
      ['di1','di2','di3','di4','di5','di6'].forEach((k, i) => {
        const el = root.querySelector<HTMLElement>(`[data-v="${k}"]`);
        if (el) el.className = ledClass([di1,di2,di3,di4,di5,di6][i]);
      });
      const do1 = running, do2 = false, do3 = running;
      ['do1','do2','do3'].forEach((k, i) => {
        const el = root.querySelector<HTMLElement>(`[data-v="${k}"]`);
        if (el) el.className = ledClass([do1,do2,do3][i]);
      });
      setV('ai1-v',  '7.42');  // 0-10V speed-ref
      setV('ai1-sc', running ? `${(7.42 / 10 * 60).toFixed(1)} Hz` : '0.0 Hz');
      setV('ai2-v',  '14.8');  // 4-20mA pressure
      setV('ai2-sc', `${((14.8 - 4) / 16 * 50).toFixed(1)} PSI`);
      setV('ao1-v',  running ? `${(S.hz / 60 * 10).toFixed(2)} V` : '0.00 V');
      setV('ao1-sc', running ? `${fmt(S.hz, 1)} Hz` : '0.0 Hz');
      setV('ao2-v',  running ? `${(S.amp / 720 * 16 + 4).toFixed(1)} mA` : '4.0 mA');
      setV('ao2-sc', running ? `${(S.amp / 720 * 100).toFixed(0)} %` : '0 %');

      /* HOME mini-trend redraw */
      const microCv = microTrendRef.current;
      if (microCv) {
        const ctx = microCv.getContext('2d');
        if (ctx) {
          const w = (microCv.width  = microCv.clientWidth  || 280);
          const h = (microCv.height = microCv.clientHeight || 78);
          ctx.fillStyle = '#040608'; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#0e2244'; ctx.lineWidth = 1;
          for (let i = 1; i < 6; i++) {
            const y = (h * i) / 6;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
          }
          const buf = trendBuf.current.hz;
          if (buf.length > 1) {
            ctx.strokeStyle = '#7cffa4'; ctx.lineWidth = 1.6; ctx.beginPath();
            for (let i = 0; i < buf.length; i++) {
              const x = (i / (MAX_SAMPLES - 1)) * w;
              const y = h - ((buf[i] - 0) / 70) * h;
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
      }

      /* TREND big chart */
      trendBuf.current.hz.push(S.hz);
      trendBuf.current.amp.push(S.amp);
      trendBuf.current.kw.push(S.kw);
      if (trendBuf.current.hz.length > MAX_SAMPLES) {
        trendBuf.current.hz.shift();
        trendBuf.current.amp.shift();
        trendBuf.current.kw.shift();
      }
      const cv = trendCvRef.current;
      if (cv && page === 'trend') {
        const ctx = cv.getContext('2d');
        if (ctx) {
          const w = (cv.width  = cv.clientWidth  || 600);
          const h = (cv.height = cv.clientHeight || 280);
          ctx.fillStyle = '#040608'; ctx.fillRect(0, 0, w, h);
          /* gridlines */
          ctx.strokeStyle = '#0e2244'; ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 1; i < 8; i++) {
            const y = (h * i) / 8;
            ctx.moveTo(0, y); ctx.lineTo(w, y);
          }
          for (let i = 1; i < 6; i++) {
            const x = (w * i) / 6;
            ctx.moveTo(x, 0); ctx.lineTo(x, h);
          }
          ctx.stroke();

          /* axis labels */
          ctx.fillStyle = '#3a4a6a'; ctx.font = '10px Inter, sans-serif';
          ctx.fillText('60s', 6, h - 6);
          ctx.fillText(' 0s', w - 30, h - 6);

          const drawLine = (
            arr: number[], min: number, max: number,
            color: string, lw = 1.8,
          ) => {
            if (arr.length < 2) return;
            ctx.strokeStyle = color; ctx.lineWidth = lw;
            ctx.beginPath();
            for (let i = 0; i < arr.length; i++) {
              const x = (i / (MAX_SAMPLES - 1)) * w;
              const v = (arr[i] - min) / (max - min);
              const y = h - v * h;
              if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
          };
          drawLine(trendBuf.current.hz,  0, 70,  '#7cffa4', 2.0);
          drawLine(trendBuf.current.amp, 0, 800, '#ffd485', 2.0);
          drawLine(trendBuf.current.kw,  0, 500, '#9bdfff', 2.0);
        }
      }
    };

    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running, page]);

  const adj = useCallback(
    (code: string, dir: 1 | -1) => {
      const row = PARAM_GROUPS.flatMap((g) => g.rows).find((r) => r.code === code);
      if (!row) return;
      setParamVals((cur) => {
        const v = cur[code];
        if (row.enum) {
          const i = row.enum.indexOf(String(v));
          const ni = (i + dir + row.enum.length) % row.enum.length;
          return { ...cur, [code]: row.enum[ni] };
        }
        const cv = typeof v === 'number' ? v : parseFloat(String(v));
        const nv = Math.max(row.min, Math.min(row.max, +(cv + dir * row.step).toFixed(4)));
        return { ...cur, [code]: nv };
      });
    },
    [],
  );

  const setEnumDirect = useCallback((code: string, value: string) => {
    setParamVals((cur) => ({ ...cur, [code]: value }));
  }, []);

  const setNumDirect = useCallback((code: string, value: string) => {
    const row = PARAM_GROUPS.flatMap((g) => g.rows).find((r) => r.code === code);
    if (!row) return;
    const n = parseFloat(value);
    if (Number.isFinite(n)) {
      const clamped = Math.max(row.min, Math.min(row.max, n));
      setParamVals((cur) => ({ ...cur, [code]: clamped }));
    }
  }, []);

  const grp = PARAM_GROUPS.find((g) => g.id === activeGroup) ?? PARAM_GROUPS[0];

  return (
    <div
      ref={viewportRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#040608',
      }}
    >
      <div
        style={{
          width: VFD_HMI_DESIGN_WIDTH * fitScale,
          height: VFD_HMI_DESIGN_HEIGHT * fitScale,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: VFD_HMI_DESIGN_WIDTH,
            height: VFD_HMI_DESIGN_HEIGHT,
            transform: `scale(${fitScale})`,
            transformOrigin: 'top left',
          }}
        >
          <div ref={rootRef} className="vfd-hmi-root">
      {/* HEADER */}
      <div className="vh-top">
        <div className="vh-brand">
          <div className="b1">YORK<span style={{ color:'#5fb6ff', marginLeft:6 }}>OptiSpeed™</span></div>
          <div className="b2">VARIABLE SPEED DRIVE</div>
          <div className="b3">VSD-1 · 480V 600HP · S/N OPS-2024-1187</div>
        </div>
        <div className="vh-status">
          <span className={'vh-pill ' + (running ? 'run' : 'rdy')}>
            <span className="dot" />{running ? 'RUNNING' : 'READY'}
          </span>
          <span className="vh-pill auto"><span className="dot" />AUTO</span>
          <span className="vh-pill" style={{ color:'#cad2e0' }}>
            <span className="dot" style={{ background: running ? '#1ea83a' : '#444' }} />
            {running ? 'AT SPEED' : 'STOPPED'}
          </span>
          <span className="vh-pill" style={{ color:'#9aa3b6' }}>
            FWD · 60.0 Hz REF
          </span>
        </div>
        <div className="vh-clock">
          <div className="c1">DATE / TIME</div>
          <div className="c2">{clk.date} · {clk.time}</div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="vh-tabs">
        {(Object.keys(PAGE_LABELS) as PageKey[]).map((k) => (
          <button
            key={k}
            className={'vh-tab' + (page === k ? ' on' : '')}
            onClick={(e) => { e.stopPropagation(); setPage(k); }}
          >
            {PAGE_LABELS[k]}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div className="vh-body">

        {/* HOME ─────────────────────────────────────────────────────── */}
        <div className={'vh-page' + (page === 'home' ? ' vis' : '')}>
          <div className="vh-bigrow">
            <div className="vh-bigcell">
              <div className="lbl">Output Frequency</div>
              <div className="val"><span data-v="home-hz">60.0</span> <span className="unit">Hz</span></div>
            </div>
            <div className="vh-bigcell amber">
              <div className="lbl">Motor Current</div>
              <div className="val"><span data-v="home-amp">342</span> <span className="unit">A</span></div>
            </div>
            <div className="vh-bigcell cyan">
              <div className="lbl">Motor Power</div>
              <div className="val"><span data-v="home-kw">252</span> <span className="unit">kW</span></div>
            </div>
          </div>

          <div className="vh-microtrend">
            <div className="ti">
              <span>OUTPUT FREQUENCY · 60s</span>
              <span style={{ color:'#7cffa4' }}>● Hz</span>
            </div>
            <canvas ref={microTrendRef} />
          </div>

          <div className="vh-status-grid">
            <div className="vh-statline"><span className="k">Mode</span><span className="v ok" data-v="home-mode">AUTO · BACnet</span></div>
            <div className="vh-statline"><span className="k">Speed Reference</span><span className="v" data-v="home-ref">60.0 Hz</span></div>
            <div className="vh-statline"><span className="k">Motor Speed</span><span className="v" data-v="home-rpm">3565 RPM</span></div>
            <div className="vh-statline"><span className="k">Motor Load (%FLA)</span><span className="v" data-v="home-pct">48%</span></div>
            <div className="vh-statline"><span className="k">Motor Torque</span><span className="v" data-v="home-trq">78 %</span></div>
            <div className="vh-statline"><span className="k">Power Factor</span><span className="v" data-v="home-pf">0.91</span></div>
            <div className="vh-statline"><span className="k">DC Bus Voltage</span><span className="v" data-v="home-bus">658 V</span></div>
            <div className="vh-statline"><span className="k">Heatsink Temp</span><span className="v" data-v="home-hs">56.4 °C</span></div>
            <div className="vh-statline"><span className="k">Run Time</span><span className="v" data-v="home-runhrs">4,187 h</span></div>
            <div className="vh-statline"><span className="k">Last Fault</span><span className="v warn">F-021 · 08 NOV</span></div>
          </div>
        </div>

        {/* METERS ───────────────────────────────────────────────────── */}
        <div className={'vh-page' + (page === 'meters' ? ' vis' : '')}>
          <div className="vh-mgrid">
            <div className="vh-meter"><div className="ml">Output Frequency</div><div className="mv"><span data-v="m-hz">60.00</span><span className="u">Hz</span></div></div>
            <div className="vh-meter blu"><div className="ml">Reference</div><div className="mv"><span data-v="m-ref">60.00</span><span className="u">Hz</span></div></div>
            <div className="vh-meter"><div className="ml">Motor Speed</div><div className="mv"><span data-v="m-rpm">3565</span><span className="u">RPM</span></div></div>
            <div className="vh-meter amb"><div className="ml">Motor Current</div><div className="mv"><span data-v="m-amp">342.0</span><span className="u">A</span></div></div>
            <div className="vh-meter wht"><div className="ml">Motor Voltage</div><div className="mv"><span data-v="m-vlt">460</span><span className="u">V</span></div></div>
            <div className="vh-meter blu"><div className="ml">Motor Power</div><div className="mv"><span data-v="m-kw">252.0</span><span className="u">kW</span></div></div>
            <div className="vh-meter blu"><div className="ml">Motor Power</div><div className="mv"><span data-v="m-hp">338</span><span className="u">HP</span></div></div>
            <div className="vh-meter"><div className="ml">Motor Torque</div><div className="mv"><span data-v="m-trq">78.0</span><span className="u">%</span></div></div>
            <div className="vh-meter wht"><div className="ml">Power Factor</div><div className="mv"><span data-v="m-pf">0.91</span></div></div>
            <div className="vh-meter wht"><div className="ml">DC Bus Voltage</div><div className="mv"><span data-v="m-bus">658</span><span className="u">V</span></div></div>
            <div className="vh-meter amb"><div className="ml">Heatsink Temp</div><div className="mv"><span data-v="m-hsT">56.4</span><span className="u">°C</span></div></div>
            <div className="vh-meter wht"><div className="ml">Ambient Temp</div><div className="mv"><span data-v="m-ambT">32.0</span><span className="u">°C</span></div></div>
            <div className="vh-meter"><div className="ml">Switching Freq</div><div className="mv"><span data-v="m-sw">2.0</span><span className="u">kHz</span></div></div>
            <div className="vh-meter"><div className="ml">Run Time</div><div className="mv"><span data-v="m-runhrs">4,187</span><span className="u">hrs</span></div></div>
            <div className="vh-meter blu"><div className="ml">Lifetime Energy</div><div className="mv"><span data-v="m-kwh">18,482,460</span><span className="u">kWh</span></div></div>
          </div>

          <div className="vh-bartile">
            <div className="bl"><span>MOTOR LOAD (% FLA)</span><span data-v="m-load">48</span></div>
            <div className="btr"><div className="bfl" data-v="m-bar-amp" style={{ width:'48%' }} /></div>
          </div>
          <div className="vh-bartile">
            <div className="bl"><span>OUTPUT POWER (% kW LIMIT)</span><span>53</span></div>
            <div className="btr"><div className="bfl" data-v="m-bar-kw" style={{ width:'53%' }} /></div>
          </div>
          <div className="vh-bartile">
            <div className="bl"><span>MOTOR TORQUE (% RATED)</span><span>78</span></div>
            <div className="btr"><div className="bfl" data-v="m-bar-trq" style={{ width:'78%' }} /></div>
          </div>
          <div className="vh-bartile">
            <div className="bl"><span>DC BUS (% OF OV TRIP)</span><span>55</span></div>
            <div className="btr"><div className="bfl" data-v="m-bar-bus" style={{ width:'55%' }} /></div>
          </div>
          <div className="vh-bartile">
            <div className="bl"><span>HEATSINK (% OF OT TRIP)</span><span>63</span></div>
            <div className="btr"><div className="bfl" data-v="m-bar-hs" style={{ width:'63%' }} /></div>
          </div>
        </div>

        {/* PARAMS ───────────────────────────────────────────────────── */}
        <div className={'vh-page' + (page === 'params' ? ' vis' : '')}>
          <div className="vh-pwrap">
            <div className="vh-pleft">
              {PARAM_GROUPS.map((g) => (
                <button
                  key={g.id}
                  className={'vh-pgrp' + (g.id === activeGroup ? ' on' : '')}
                  onClick={(e) => { e.stopPropagation(); setActiveGroup(g.id); }}
                >
                  {g.title}
                  <span className="ac">access · {g.access}</span>
                </button>
              ))}
            </div>

            <div className="vh-pright">
              {grp.rows.map((r) => {
                const v = paramVals[r.code];
                return (
                  <div className="vh-prow" key={r.code}>
                    <span className="pcode">{r.code}</span>
                    <span className="pname">
                      {r.name}
                      <span className="pmm">
                        {r.enum
                          ? `[${r.enum.length} options]`
                          : `[${r.min}…${r.max}${r.unit ? ' ' + r.unit : ''}]`}
                      </span>
                    </span>
                    <span className="vh-pctl">
                      <button className="parr" onClick={() => adj(r.code, -1)}>▼</button>
                      {r.enum ? (
                        <select
                          className="penum"
                          value={String(v)}
                          onChange={(e) => setEnumDirect(r.code, e.target.value)}
                        >
                          {r.enum.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="pinp"
                          type="number"
                          step={r.step}
                          min={r.min}
                          max={r.max}
                          value={typeof v === 'number' ? v : parseFloat(String(v))}
                          onChange={(e) => setNumDirect(r.code, e.target.value)}
                        />
                      )}
                      <span className="punit">{r.unit}</span>
                      <button className="parr" onClick={() => adj(r.code, +1)}>▲</button>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* I/O ──────────────────────────────────────────────────────── */}
        <div className={'vh-page' + (page === 'io' ? ' vis' : '')}>
          <div className="vh-iorow">
            <div className="vh-iocard">
              <h4>Digital Inputs</h4>
              {[
                ['DI1', 'Run/Stop',           'di1'],
                ['DI2', 'Reset',              'di2'],
                ['DI3', 'External E-Stop',    'di3'],
                ['DI4', 'Jog',                'di4'],
                ['DI5', 'Safety Chain',       'di5'],
                ['DI6', 'Remote/Local',       'di6'],
              ].map(([n, fn, k]) => (
                <div className="vh-iorow2" key={k}>
                  <span className="ik"><span className="vh-led" data-v={k} />{n} · {fn}</span>
                  <span className="iv">24 VDC</span>
                </div>
              ))}
            </div>
            <div className="vh-iocard">
              <h4>Digital Outputs</h4>
              {[
                ['DO1', 'Run',     'do1'],
                ['DO2', 'Fault',   'do2'],
                ['DO3', 'Ready',   'do3'],
              ].map(([n, fn, k]) => (
                <div className="vh-iorow2" key={k}>
                  <span className="ik"><span className="vh-led" data-v={k} />{n} · {fn}</span>
                  <span className="iv">RELAY · 250 VAC / 30 VDC, 5 A</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vh-iorow">
            <div className="vh-iocard">
              <h4>Analog Inputs</h4>
              <div className="vh-iorow2">
                <span className="ik">AI1 · 0-10V · Speed Reference</span>
                <span className="iv"><span data-v="ai1-v">7.42</span> V → <span data-v="ai1-sc">44.5 Hz</span></span>
              </div>
              <div className="vh-iorow2">
                <span className="ik">AI2 · 4-20 mA · CHW Pressure (PT-1)</span>
                <span className="iv"><span data-v="ai2-v">14.8</span> mA → <span data-v="ai2-sc">33.8 PSI</span></span>
              </div>
            </div>
            <div className="vh-iocard">
              <h4>Analog Outputs</h4>
              <div className="vh-iorow2">
                <span className="ik">AO1 · 0-10V · Output Frequency</span>
                <span className="iv"><span data-v="ao1-v">10.00 V</span> → <span data-v="ao1-sc">60.0 Hz</span></span>
              </div>
              <div className="vh-iorow2">
                <span className="ik">AO2 · 4-20 mA · Motor Load %</span>
                <span className="iv"><span data-v="ao2-v">11.6 mA</span> → <span data-v="ao2-sc">48 %</span></span>
              </div>
            </div>
          </div>

          <div className="vh-iocard">
            <h4>Communications</h4>
            <div className="vh-iorow2"><span className="ik">Protocol</span><span className="iv">BACnet/IP · port 47808</span></div>
            <div className="vh-iorow2"><span className="ik">Drive Address</span><span className="iv">17</span></div>
            <div className="vh-iorow2"><span className="ik">Last Comm</span><span className="iv">120 ms</span></div>
            <div className="vh-iorow2"><span className="ik">Comm Status</span><span className="iv" style={{ color:'#7cffa4' }}>HEALTHY</span></div>
          </div>
        </div>

        {/* FAULTS ───────────────────────────────────────────────────── */}
        <div className={'vh-page' + (page === 'faults' ? ' vis' : '')}>
          <div className="vh-iocard" style={{ flex:1, padding:'4px 0' }}>
            <table className="vh-faults">
              <thead>
                <tr>
                  <th style={{ width:55 }}>Time</th>
                  <th style={{ width:75 }}>Date</th>
                  <th style={{ width:60 }}>Code</th>
                  <th>Description</th>
                  <th style={{ width:60, textAlign:'right' }}>Hz</th>
                  <th style={{ width:60, textAlign:'right' }}>Amps</th>
                </tr>
              </thead>
              <tbody>
                {FAULT_LOG.map((f, i) => (
                  <tr key={i}>
                    <td>{f.t}</td>
                    <td>{f.d}</td>
                    <td className={'sev' + f.sev}>{f.code}</td>
                    <td className={'sev' + (f.sev === 'I' ? 'B' : f.sev)}>{f.desc}</td>
                    <td style={{ textAlign:'right' }}>{f.hz}</td>
                    <td style={{ textAlign:'right' }}>{f.amp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TREND ────────────────────────────────────────────────────── */}
        <div className={'vh-page' + (page === 'trend' ? ' vis' : '')}>
          <div className="vh-trendlegend">
            <span><span className="swatch" style={{ background:'#7cffa4' }} />Output Frequency  · 0–70 Hz</span>
            <span><span className="swatch" style={{ background:'#ffd485' }} />Motor Current     · 0–800 A</span>
            <span><span className="swatch" style={{ background:'#9bdfff' }} />Motor Power       · 0–500 kW</span>
            <span style={{ marginLeft:'auto', color:'#7c8499' }}>60s rolling · 5 Hz</span>
          </div>
          <div className="vh-trendwrap">
            <div className="vh-trendcanvas"><canvas ref={trendCvRef} /></div>
          </div>
        </div>
      </div>

      {/* FOOTER soft-key bar */}
      <div className="vh-foot">
        <button className="sk tone-go">▶ START</button>
        <button className="sk tone-stop">■ STOP</button>
        <button className="sk">RESET FAULT</button>
        <button className="sk">JOG</button>
        <button className="sk">LOCAL / REMOTE</button>
        <button className="sk">SAVE PARAMS</button>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
}
