/* ============================================================================
   AbbAch580ControlPanel.tsx
   Faithful re-creation of the ABB ACH580 control panel — that is, the
   ABB ACH-AP-H Assistant Control Panel that ships with every ACH580 HVAC
   drive. Modelled after the official user's manual:

     `ACS-AP-I, -S, -W and ACH-AP-H, -W Assistant control panels User's
      manual`, document 3AUA0000085685 Rev G, 2024-07-12.

   Sections referenced (manual page numbers):
     • pp. 20–21  Display, keys and parts (physical layout)
     • pp. 22–23  Display elements (control location, status icon, drive
                  name, reference value, content area, softkey selections,
                  clock)
     • pp. 24–25  Keys (left/right softkey, arrow keys, help, start/stop,
                  Off/Hand/Auto, Loc/Rem, key shortcuts)
     • pp. 26     Status LED indications
     • p.  31     User interface overview (Home view, Menu, Options, Help,
                  Faults and warnings)
     • pp. 32–33  Control panel navigation, navigation memory, Home view
     • p.  38     Main Menu — Parameters · Assistants · Energy efficiency ·
                  Event log · History graphs · Backups · System info ·
                  Settings · Primary settings · I/O · Diagnostics
     • p.  61     Options menu — Reference · Direction change · Select
                  drive · Edit Home view · Active faults · Active warnings
     • pp. 90–92  Display specs — 240 × 160 monochrome STN LCD with LED
                  backlight (pale-grey "positive" mode background, dark
                  navy text). Dimensions ~75 mm × 145 mm portrait housing.

   Physical key layout (top → bottom), from the official diagram on
   pp. 20–21 of the manual:

     ┌──────────────────────────────────┐
     │ ┌──────────────────────────────┐ │
     │ │  Display (240 × 160 STN)      │ │
     │ └──────────────────────────────┘ │
     │   [ Left softkey ]  [ Right ]    │
     │   ●LED   [ ? ]   ▲              │
     │                ◄   ►              │
     │                  ▼               │
     │       [ ■ Stop ]  [ ▶ Start ]    │
     │   [ Off ]  [ Hand ]  [ Auto ]    │
     │              [ Loc/Rem ]          │
     └──────────────────────────────────┘

   Display contents (Home view, per pp. 22–23):

     ┌──────────────────────────────────┐
     │ Local            ACH580   58.3Hz │  ← control loc · drive name · ref
     │ ▶ ↻                              │  ← rotating status icon
     ├──────────────────────────────────┤
     │  SPEED        58.3 %             │  ← up to 3 signals
     │  CURRENT      156 A              │
     │  POWER         89 kW             │
     ├──────────────────────────────────┤
     │ Options              16:42  Menu │  ← softkey · clock · softkey
     └──────────────────────────────────┘
============================================================================ */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/* ─── Design canvas (PORTRAIT — matches real ACH-AP-H aspect ~1:1.89) ──── */
export const ABB_ACH580_PANEL_DESIGN_W = 380;
export const ABB_ACH580_PANEL_DESIGN_H = 720;
export const ABB_ACH580_PANEL_ASPECT   = ABB_ACH580_PANEL_DESIGN_W / ABB_ACH580_PANEL_DESIGN_H;

/* ─── Backwards-compat aliases (kept so any older 3D code still imports
   without breaking — the canonical names are the ABB_ACH580_PANEL_* ones). */
export const PUMP_VFD_HMI_DESIGN_W = ABB_ACH580_PANEL_DESIGN_W;
export const PUMP_VFD_HMI_DESIGN_H = ABB_ACH580_PANEL_DESIGN_H;

/* ─── ABB ACH-AP-H palette ──────────────────────────────────────────────
   The real assistant panel uses a light-grey RAL 7035 plastic shell, a
   black bezel around the LCD, and the corporate ABB-red accent. The LCD
   is a positive-mode monochrome STN (pale blue-grey background, dark navy
   text) with a green LED backlight. Selection highlight inverts to solid
   navy with white text. */
const C = {
  /* Housing (the plastic body around the LCD) */
  housing:       '#c9cac4',
  housingDk:     '#a3a49e',
  housingEdge:   '#5a5b58',
  housingShadow: '#65665f',
  bezel:         '#0c0d0f',
  bezelInset:    '#1c1e22',
  abbRed:        '#e60012',
  abbRedDk:      '#9a000c',

  /* Monochrome positive-mode STN LCD */
  lcdBg:         '#b9c8c4',   // pale teal-grey backlit panel
  lcdBgDim:      '#a4b2af',   // shadowed corner
  lcdGrid:       '#8a9794',   // separator lines
  lcdText:       '#0e1a25',   // dark navy printed pixels
  lcdTextDim:    '#3e4d5c',   // grey-out / inactive
  lcdInvBg:      '#0e1a25',   // inverted selection background
  lcdInvText:    '#e8eee8',   // inverted selection text
  lcdAccent:     '#0e1a25',   // status arrow / rotating indicator
  lcdWarn:       '#7e5e0c',   // warning text (mono displays drop saturation)
  lcdFault:      '#7a1c1a',   // fault text

  /* Physical buttons */
  keyCap:        '#2e3034',
  keyCapDn:      '#16181b',
  keyText:       '#e8e9ec',
  keyTextDim:    '#9ea1a6',
  keyShadow:     '#0a0b0d',
  /* HOA accents (per real ACH-AP-H: green Hand, red Off, white Auto) */
  hoaHandGreen:  '#1d8c2a',
  hoaHandGlow:   '#33ff44',
  hoaOffRed:     '#a01818',
  hoaOffGlow:    '#ff2230',
  hoaAutoBg:     '#dcdcd8',
  hoaAutoText:   '#1a1c20',
  /* Start (green) / Stop (red) — real local-control keys */
  startGreen:    '#1d8c2a',
  startGlow:     '#33ff44',
  stopRed:       '#a01818',
  stopGlow:      '#ff2230',

  /* Status LED (per p. 26 of manual)
       Continuous green: normal · Flickering green: USB transfer ·
       Flashing green: warning · Continuous red: fault · Flashing red:
       fault requiring stop+restart · Flashing blue: Bluetooth (W only) */
  ledGreen:      '#33ff44',
  ledGreenDk:    '#1d8c2a',
  ledRed:        '#ff2230',
  ledRedDk:      '#a00c14',
  ledBlue:       '#3aa1ff',
  ledOff:        '#1a1c20',
} as const;

/* ─── Page identifiers (mirror the manual's main Menu structure on p. 38) ── */
type PageKey =
  | 'home'
  | 'menu'
  | 'parameters'
  | 'assistants'
  | 'energy'
  | 'eventlog'
  | 'history'
  | 'backups'
  | 'systeminfo'
  | 'settings'
  | 'primary'
  | 'io'
  | 'diagnostics'
  | 'options'
  | 'help';

type ControlLocation = 'Local' | 'Remote';
type HoaMode = 'HAND' | 'OFF' | 'AUTO';

interface MenuEntry {
  key: PageKey;
  label: string;
  desc:  string;
}

/* Main Menu — mirrors the list on p. 38 of the manual exactly. */
const MAIN_MENU: MenuEntry[] = [
  { key: 'parameters',  label: 'Parameters',        desc: 'View and edit parameters' },
  { key: 'assistants',  label: 'Assistants',        desc: 'Launch an assistant' },
  { key: 'energy',      label: 'Energy efficiency', desc: 'kWh counters · savings' },
  { key: 'eventlog',    label: 'Event log',         desc: 'Faults · warnings · events' },
  { key: 'history',     label: 'History graphs',    desc: 'Trends · load profile' },
  { key: 'backups',     label: 'Backups',           desc: 'Save · restore parameters' },
  { key: 'systeminfo',  label: 'System info',       desc: 'Drive · panel · licenses' },
  { key: 'settings',    label: 'Settings',          desc: 'Time · language · display' },
  { key: 'primary',     label: 'Primary settings',  desc: 'Motor · PID · fieldbus' },
  { key: 'io',          label: 'I/O',               desc: 'DI · DO · AI · AO status' },
  { key: 'diagnostics', label: 'Diagnostics',       desc: 'Faults · warnings help' },
];

/* Options menu — mirrors p. 61 of the manual. */
const OPTIONS_MENU: MenuEntry[] = [
  { key: 'parameters',  label: 'Reference',         desc: 'Set the speed reference' },
  { key: 'parameters',  label: 'Direction change',  desc: 'FWD ↔ REV motor rotation' },
  { key: 'parameters',  label: 'Select drive',      desc: 'Multi-drive panel bus' },
  { key: 'parameters',  label: 'Edit Home view',    desc: 'Customize displayed signals' },
  { key: 'eventlog',    label: 'Active faults',     desc: 'View active faults' },
  { key: 'eventlog',    label: 'Active warnings',   desc: 'View active warnings' },
];

/* ─── Simulated live data ─────────────────────────────────────────────── */
function useLiveData(running: boolean, pumpTag: string) {
  const isCDW = pumpTag.startsWith('CDWP') || pumpTag.startsWith('CDW');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    if (!running) return {
      speedPct: 0, speedRpm: 0, freqHz: 0,
      flowGpm: 0, dpFt: 0,
      currentA: 0, voltageV: 480, powerKw: 0,
      energyKwh: isCDW ? 8_240 : 6_115,
      heatSinkC: 24, runHours: isCDW ? 11_842 : 9_631, starts: isCDW ? 1_204 : 987,
      dcBusV: 675, swFreqHz: 4,
      torqueNm: 0,
    };
    const t = tick * 0.5;
    const noise = Math.sin(t * 0.13) * 0.018 + Math.cos(t * 0.07) * 0.012;
    const speedPct  = (isCDW ? 87.4 : 79.6) + noise * 100;
    const speedRpm  = Math.round(speedPct / 100 * (isCDW ? 1775 : 1780));
    const freqHz    = +(speedPct / 100 * 60).toFixed(1);
    const flowGpm   = Math.round(speedPct / 100 * (isCDW ? 4_520 : 3_590) * (1 + noise * 0.3));
    const dpFt      = +(speedPct / 100 * (isCDW ? 78.4 : 65.2) * (1 + noise * 0.4)).toFixed(1);
    const currentA  = +(speedPct / 100 * (isCDW ? 312 : 248) * (1 + noise * 0.15)).toFixed(1);
    const voltageV  = +(480 * (1 + noise * 0.008)).toFixed(0);
    const powerKw   = +(currentA * voltageV * 1.732 * 0.87 / 1000).toFixed(1);
    const heatSinkC = +(42 + speedPct / 100 * 18 + noise * 3).toFixed(1);
    const torqueNm  = +(powerKw * 9550 / Math.max(speedRpm, 1)).toFixed(1);
    return {
      speedPct: +speedPct.toFixed(1),
      speedRpm, freqHz,
      flowGpm,  dpFt,
      currentA, voltageV, powerKw,
      energyKwh: isCDW ? 8_240 + Math.floor(tick * 0.8) : 6_115 + Math.floor(tick * 0.6),
      heatSinkC,
      runHours:  isCDW ? 11_842 : 9_631,
      starts:    isCDW ? 1_204 : 987,
      dcBusV:    +(675 + noise * 4).toFixed(0),
      swFreqHz:  4,
      torqueNm,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, running, isCDW]);
}

/* Real-time clock readout for the display bottom bar (per p. 23). */
function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5_000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ════════════════════════════════════════════════════════════════════════
   Display element primitives
   ════════════════════════════════════════════════════════════════════════ */

/** Top status pane of every screen (per pp. 22–23):
      • Control location text/icon ("Local" / "Remote" / blank in panel-bus
        non-selected mode)
      • Status icon (rotating animated arrow when running, ◼ when stopped,
        ⚠ blinking when faulted)
      • Drive name (default "ACH580")
      • Reference value with unit (right-justified)                     */
function LcdTopBar({
  controlLocation,
  driveName,
  referenceText,
  running,
  faulted = false,
}: {
  controlLocation: ControlLocation;
  driveName: string;
  referenceText: string;
  running: boolean;
  faulted?: boolean;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto auto',
      alignItems: 'center',
      gap: 6,
      padding: '4px 8px',
      borderBottom: `1px solid ${C.lcdGrid}`,
      fontSize: 10, color: C.lcdText, fontWeight: 700,
      fontFamily: '"Courier New", monospace',
      letterSpacing: '0.02em',
      flexShrink: 0,
    }}>
      <span>{controlLocation}</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        color: faulted ? C.lcdFault : C.lcdAccent,
      }}>
        <RotatingStatusIcon running={running} faulted={faulted} />
      </span>
      <span style={{ fontSize: 10, color: C.lcdText, fontWeight: 700 }}>{driveName}</span>
      <span style={{ fontSize: 12, color: C.lcdText, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {referenceText}
      </span>
    </div>
  );
}

/** Status icon — per p. 23 of the manual: rotating arrow when running,
    blinking when faulted or starting-inhibited. Implemented as an SVG
    that spins via CSS keyframes when active. */
function RotatingStatusIcon({ running, faulted }: { running: boolean; faulted: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24"
      style={{
        animation: running && !faulted ? 'abb-rotate 1.6s linear infinite' : faulted ? 'abb-blink 0.7s steps(2) infinite' : undefined,
      }}>
      <style>{`
        @keyframes abb-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes abb-blink  { 50% { opacity: 0.15; } }
      `}</style>
      {running ? (
        <path d="M12 3 a9 9 0 1 1 -8.485 6 M12 3 l-3 -3 M12 3 l-3 3" fill="none"
          stroke={faulted ? C.lcdFault : C.lcdAccent} strokeWidth="2" strokeLinecap="round" />
      ) : (
        <rect x="6" y="6" width="12" height="12" fill={faulted ? C.lcdFault : C.lcdAccent} />
      )}
    </svg>
  );
}

/** Soft-key labels printed inside the LCD bottom bar (per p. 22, item 7).
    The bottom bar also shows the current clock (per p. 22, item 8). */
function LcdSoftkeyBar({
  softLeft, softRight, clock,
}: {
  softLeft: string; softRight: string; clock: string;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '4px 8px',
      borderTop: `1px solid ${C.lcdGrid}`,
      background: C.lcdBgDim,
      fontSize: 10, color: C.lcdText, fontWeight: 700,
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      letterSpacing: '0.02em',
      flexShrink: 0,
      textTransform: 'uppercase',
    }}>
      <span style={{ textAlign: 'left' }}>{softLeft}</span>
      <span style={{
        fontSize: 10, color: C.lcdText, fontWeight: 700,
        fontFamily: '"Courier New", monospace', letterSpacing: '0.02em',
        padding: '0 8px',
      }}>
        {clock}
      </span>
      <span style={{ textAlign: 'right' }}>{softRight}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Page renderers — each fills the LCD content area between the top
   status bar and the soft-key/clock footer. Mirrors the page set
   defined in the manual's "Functions in the main Menu" chapter (p. 37+).
   ════════════════════════════════════════════════════════════════════════ */

interface LcdProps {
  d: ReturnType<typeof useLiveData>;
  running: boolean;
  pumpTag: string;
  controlLocation: ControlLocation;
  hoaMode: HoaMode;
  selectedIdx: number;
  setSelectedIdx: (i: number) => void;
}

/** HOME view — per pp. 33 of manual: monitors drive status with up to
    three signals per page. We render a single page with three signals
    plus the top status/reference bar. */
function HomeView({ d, running, pumpTag }: LcdProps) {
  return (
    <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[
        { label: 'SPEED',   value: d.speedPct.toFixed(1), unit: '%'   },
        { label: 'CURRENT', value: d.currentA.toFixed(0),  unit: 'A'   },
        { label: 'POWER',   value: d.powerKw.toFixed(1),   unit: 'kW'  },
      ].map((s) => (
        <div key={s.label} style={{
          borderBottom: `1px solid ${C.lcdGrid}`, paddingBottom: 4,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ fontSize: 11, color: C.lcdText, fontWeight: 700, letterSpacing: '0.04em' }}>
            {s.label}
          </span>
          <span style={{
            fontSize: 28, fontWeight: 700, color: C.lcdText,
            fontFamily: '"Courier New", monospace', fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}>
            {s.value}<span style={{ fontSize: 12, color: C.lcdTextDim, marginLeft: 4 }}>{s.unit}</span>
          </span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div style={{
        textAlign: 'center', fontSize: 9, color: C.lcdTextDim,
        fontFamily: '"Courier New", monospace',
      }}>
        {pumpTag} · FREQ {d.freqHz.toFixed(1)} Hz · {running ? 'RUNNING' : 'STOPPED'}
      </div>
    </div>
  );
}

/** A generic selectable list (Main Menu, Options menu, Backups, etc.).
    The selected row is rendered inverted (dark navy bg, white text) per
    standard ACH-AP-H convention. */
function SelectableList({
  title, items, selectedIdx,
}: { title: string; items: MenuEntry[]; selectedIdx: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageTitle>{title}</PageTitle>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {items.map((m, i) => {
          const sel = i === selectedIdx;
          return (
            <div key={`${m.label}-${i}`} style={{
              padding: '5px 10px',
              background: sel ? C.lcdInvBg : 'transparent',
              color:      sel ? C.lcdInvText : C.lcdText,
              borderBottom: `1px solid ${C.lcdGrid}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em' }}>
                {m.label}
              </div>
              <div style={{ fontSize: 8.5, opacity: 0.85, letterSpacing: '0.02em' }}>
                {m.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: C.lcdInvBg, color: C.lcdInvText,
      padding: '4px 10px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
      textTransform: 'uppercase',
      flexShrink: 0,
    }}>
      {children}
    </div>
  );
}

/** PARAMETERS — sample of common ACH580 HVAC parameter groups, in the
    "Complete list" view per p. 39. Read-only display; the user can scroll
    with ▲/▼ via the arrow pad. */
function ParametersPage({ d, selectedIdx }: LcdProps) {
  const params: Array<{ id: string; name: string; val: string }> = [
    { id: '01.01', name: 'Motor speed used',     val: `${d.speedRpm} rpm` },
    { id: '01.06', name: 'Output frequency',     val: `${d.freqHz.toFixed(1)} Hz` },
    { id: '01.07', name: 'Motor current',        val: `${d.currentA.toFixed(0)} A` },
    { id: '01.10', name: 'Motor torque',         val: `${d.torqueNm.toFixed(1)} Nm` },
    { id: '01.11', name: 'DC bus voltage',       val: `${d.dcBusV} V` },
    { id: '01.13', name: 'Output voltage',       val: `${d.voltageV} V` },
    { id: '01.14', name: 'Output power',         val: `${d.powerKw.toFixed(1)} kW` },
    { id: '01.18', name: 'Inverter GWh counter', val: `${(d.energyKwh / 1_000_000).toFixed(3)} GWh` },
    { id: '05.04', name: 'Fan on-time counter',  val: `${d.runHours.toLocaleString()} h` },
    { id: '22.21', name: 'Min speed',            val: '15.0 Hz' },
    { id: '22.22', name: 'Max speed',            val: '60.0 Hz' },
    { id: '40.07', name: 'PID set 1 setpoint',   val: '55.0 ft' },
    { id: '99.10', name: 'Motor nominal P',      val: '300 HP' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageTitle>Parameters · Complete list</PageTitle>
      <div style={{ flex: 1, overflowY: 'auto', fontFamily: '"Courier New", monospace' }}>
        {params.map((p, i) => {
          const sel = i === selectedIdx;
          return (
            <div key={p.id} style={{
              display: 'grid', gridTemplateColumns: '46px 1fr auto',
              padding: '3px 8px',
              gap: 4, fontSize: 10,
              background: sel ? C.lcdInvBg : 'transparent',
              color:      sel ? C.lcdInvText : C.lcdText,
              borderBottom: `1px solid ${C.lcdGrid}`,
            }}>
              <span>{p.id}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </span>
              <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** ASSISTANTS — per p. 45 of manual: list of assistants. */
function AssistantsPage({ selectedIdx }: LcdProps) {
  const items: MenuEntry[] = [
    { key: 'parameters', label: 'First start assistant', desc: 'Initial commissioning' },
    { key: 'parameters', label: 'Motor data assistant',  desc: 'Set 99.06–99.11' },
    { key: 'parameters', label: 'PID assistant',         desc: 'Tune dP control loop' },
    { key: 'parameters', label: 'Communications',        desc: 'BACnet · Modbus · LON' },
    { key: 'parameters', label: 'QR code',               desc: 'Generate drive QR' },
  ];
  return <SelectableList title="Assistants" items={items} selectedIdx={selectedIdx} />;
}

/** ENERGY EFFICIENCY — per p. 48 of manual. */
function EnergyPage({ d, running }: LcdProps) {
  const annualKwh = Math.round(d.energyKwh * 1.18);
  const savingsKwh = Math.round(annualKwh * 0.31);
  const co2 = (savingsKwh * 0.000_404).toFixed(2);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageTitle>Energy efficiency</PageTitle>
      <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: '"Courier New", monospace' }}>
        <Stat label="Energy used"        value={d.energyKwh.toLocaleString()} unit="kWh" />
        <Stat label="Annualized"          value={annualKwh.toLocaleString()}  unit="kWh/yr" />
        <Stat label="Saved vs. throttle"  value={savingsKwh.toLocaleString()} unit="kWh/yr" />
        <Stat label="CO2 avoided"         value={co2}                          unit="t/yr" />
        <Stat label="Run hours"           value={d.runHours.toLocaleString()}  unit="h" />
        <Stat label="Total starts"        value={d.starts.toLocaleString()}    unit="" />
        <div style={{
          textAlign: 'center', fontSize: 9, color: C.lcdTextDim, marginTop: 6,
          borderTop: `1px solid ${C.lcdGrid}`, paddingTop: 4,
        }}>
          {running ? 'Logging at 5 s intervals' : 'Counter paused — drive stopped'}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      borderBottom: `1px dotted ${C.lcdGrid}`, paddingBottom: 2,
    }}>
      <span style={{ fontSize: 10, color: C.lcdText }}>{label}</span>
      <span style={{ fontSize: 14, color: C.lcdText, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {value} {unit && <span style={{ fontSize: 9, color: C.lcdTextDim }}>{unit}</span>}
      </span>
    </div>
  );
}

/** EVENT LOG — per p. 48 of manual: faults, warnings, other events. */
const FAULT_LOG = [
  { code: 'OC1', desc: 'Overcurrent (accel)',  time: '2025-11-14 03:12', kind: 'F' },
  { code: 'UV1', desc: 'DC undervoltage',       time: '2025-09-02 18:45', kind: 'F' },
  { code: 'A2B0', desc: 'Speed feedback err',   time: '2025-08-22 11:02', kind: 'W' },
  { code: 'OH1', desc: 'Heatsink overtemp',     time: '2025-07-22 13:08', kind: 'F' },
  { code: 'A7E1', desc: 'Encoder noise',        time: '2025-07-04 04:30', kind: 'W' },
  { code: 'OL1', desc: 'Motor overload',        time: '2025-06-05 09:31', kind: 'F' },
  { code: 'EF',  desc: 'External fault DI4',    time: '2025-04-18 22:55', kind: 'F' },
];

function EventLogPage({ selectedIdx }: LcdProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageTitle>Event log · 7 events</PageTitle>
      <div style={{ flex: 1, overflowY: 'auto', fontFamily: '"Courier New", monospace' }}>
        {FAULT_LOG.map((f, i) => {
          const sel = i === selectedIdx;
          return (
            <div key={i} style={{
              padding: '4px 8px',
              background: sel ? C.lcdInvBg : 'transparent',
              color:      sel ? C.lcdInvText : C.lcdText,
              borderBottom: `1px solid ${C.lcdGrid}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                <span style={{ fontWeight: 700 }}>
                  [{f.kind}] {f.code}
                </span>
                <span style={{ fontSize: 8.5, opacity: 0.85 }}>{f.time}</span>
              </div>
              <div style={{ fontSize: 9, opacity: 0.9 }}>{f.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** HISTORY GRAPHS — per pp. 48–50 of manual. We show a simple speed
    histogram (Motor current logger style). */
function HistoryPage({ d }: LcdProps) {
  const bins = useMemo(() => Array.from({ length: 10 }).map((_, i) =>
    Math.round(20 + Math.sin(i * 0.6) * 25 + (i === Math.floor(d.speedPct / 10) ? 50 : 0))
  ), [d.speedPct]);
  const max = Math.max(...bins, 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageTitle>History · Motor current</PageTitle>
      <div style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 9, color: C.lcdText, fontFamily: '"Courier New", monospace' }}>
          Distribution histogram (last 24 h)
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'flex-end', gap: 3,
          borderLeft: `1px solid ${C.lcdText}`, borderBottom: `1px solid ${C.lcdText}`,
          padding: '4px 4px 0 4px',
        }}>
          {bins.map((v, i) => (
            <div key={i} style={{
              flex: 1, height: `${(v / max) * 100}%`,
              background: C.lcdInvBg, minHeight: 1,
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: C.lcdTextDim, fontFamily: '"Courier New", monospace' }}>
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>
    </div>
  );
}

/** BACKUPS — per pp. 50–51 of manual. */
function BackupsPage({ selectedIdx }: LcdProps) {
  const items: MenuEntry[] = [
    { key: 'parameters', label: 'Create backup',     desc: 'Save current parameters' },
    { key: 'parameters', label: 'Restore backup 1',  desc: '2025-08-12 · Commissioning' },
    { key: 'parameters', label: 'Restore backup 2',  desc: '2025-10-04 · Spring tune-up' },
    { key: 'parameters', label: 'Auto backup',       desc: '2025-11-12 · Auto' },
    { key: 'parameters', label: 'Factory restore',   desc: 'ABB HVAC defaults macro' },
  ];
  return <SelectableList title="Backups" items={items} selectedIdx={selectedIdx} />;
}

/** SYSTEM INFO — per p. 52 of manual. */
function SystemInfoPage({ d }: LcdProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageTitle>System info</PageTitle>
      <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 5,
        fontFamily: '"Courier New", monospace', fontSize: 10 }}>
        <KV k="Drive type"        v="ACH580-01-242A-4" />
        <KV k="Frame size"        v="R8" />
        <KV k="Power rating"      v="300 HP / 224 kW" />
        <KV k="Voltage class"     v="480 V · 3-phase" />
        <KV k="Drive FW ver"      v="3.24.1" />
        <KV k="Drive serial"      v="3AXD50-7702" />
        <KV k="Panel type"        v="ACH-AP-H" />
        <KV k="Panel HW ver"      v="C" />
        <KV k="Panel SW ver"      v="5.00" />
        <KV k="Run hours"         v={`${d.runHours.toLocaleString()} h`} />
        <KV k="Total starts"      v={`${d.starts.toLocaleString()}`} />
        <KV k="Total energy"      v={`${d.energyKwh.toLocaleString()} kWh`} />
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px dotted ${C.lcdGrid}`, paddingBottom: 1 }}>
      <span style={{ color: C.lcdText }}>{k}</span>
      <span style={{ color: C.lcdText, fontWeight: 700 }}>{v}</span>
    </div>
  );
}

/** SETTINGS — per p. 56 of manual. */
function SettingsPage({ selectedIdx }: LcdProps) {
  const items: MenuEntry[] = [
    { key: 'parameters', label: 'Language',          desc: 'English (US)' },
    { key: 'parameters', label: 'Date & time',       desc: 'NTP synced' },
    { key: 'parameters', label: 'Display contrast',  desc: '70%' },
    { key: 'parameters', label: 'Backlight bright',  desc: '85%' },
    { key: 'parameters', label: 'Panel passcode',    desc: 'Disabled' },
    { key: 'parameters', label: 'Edit texts',        desc: 'Drive name · units' },
    { key: 'parameters', label: 'Reset Home view',   desc: 'Defaults' },
  ];
  return <SelectableList title="Settings" items={items} selectedIdx={selectedIdx} />;
}

/** PRIMARY SETTINGS — per p. 57 of manual. */
function PrimaryPage({ selectedIdx }: LcdProps) {
  const items: MenuEntry[] = [
    { key: 'parameters', label: 'Motor',         desc: '300 HP · 480 V · 60 Hz' },
    { key: 'parameters', label: 'Application',   desc: 'HVAC · constant pressure' },
    { key: 'parameters', label: 'Macro',         desc: 'PID control' },
    { key: 'parameters', label: 'Start, stop, reference', desc: 'AI1 · DI1 · PID' },
    { key: 'parameters', label: 'Ramps',         desc: 'Accel 30 s · Decel 30 s' },
    { key: 'parameters', label: 'PID',           desc: 'KP 1.5 · TI 30 s' },
    { key: 'parameters', label: 'Fieldbus',      desc: 'BACnet/IP · Modbus TCP' },
    { key: 'parameters', label: 'Advanced functions', desc: 'Sleep · Boost' },
    { key: 'parameters', label: 'Clock, region, display', desc: 'UTC-5 · imperial' },
    { key: 'parameters', label: 'Reset to defaults', desc: 'HVAC macro' },
  ];
  return <SelectableList title="Primary settings" items={items} selectedIdx={selectedIdx} />;
}

/** I/O — per p. 59 of manual: terminal name, number, electrical status,
    logical meaning. */
function IoPage({ d, running, selectedIdx }: LcdProps) {
  const rows: Array<{ name: string; num: string; elec: string; logic: string }> = [
    { name: 'DI1', num: '13', elec: running ? '24V' : '0V',   logic: 'Run/Stop' },
    { name: 'DI2', num: '14', elec: '24V',                    logic: 'Permissive' },
    { name: 'DI3', num: '15', elec: '24V',                    logic: 'Interlock' },
    { name: 'DI4', num: '16', elec: '0V',                     logic: 'Reset' },
    { name: 'DI5', num: '17', elec: '0V',                     logic: 'Override' },
    { name: 'DI6', num: '18', elec: '0V',                     logic: 'Smoke ctrl' },
    { name: 'AI1', num: '2',  elec: `${(d.dpFt / 100 * 10).toFixed(2)} V`, logic: 'PID FB' },
    { name: 'AI2', num: '4',  elec: '5.50 V',                 logic: 'Setpoint' },
    { name: 'RO1', num: '22', elec: 'CL',                     logic: 'Ready' },
    { name: 'RO2', num: '24', elec: running ? 'CL' : 'OPN',   logic: 'Run' },
    { name: 'RO3', num: '26', elec: 'OPN',                    logic: 'Fault' },
    { name: 'AO1', num: '7',  elec: `${(d.freqHz / 60 * 10).toFixed(2)} V`, logic: 'Speed' },
    { name: 'AO2', num: '8',  elec: `${(d.powerKw / 224 * 10).toFixed(2)} V`, logic: 'Power' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageTitle>I/O · Terminals</PageTitle>
      <div style={{
        display: 'grid', gridTemplateColumns: '34px 28px 56px 1fr',
        gap: 2, padding: '3px 8px', fontSize: 9, color: C.lcdTextDim,
        borderBottom: `1px solid ${C.lcdGrid}`,
        fontFamily: '"Courier New", monospace', fontWeight: 700,
      }}>
        <span>NAME</span><span>NO</span><span>ELEC</span><span>LOGIC</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', fontFamily: '"Courier New", monospace' }}>
        {rows.map((r, i) => {
          const sel = i === selectedIdx;
          return (
            <div key={r.name} style={{
              display: 'grid', gridTemplateColumns: '34px 28px 56px 1fr',
              gap: 2, padding: '3px 8px', fontSize: 9.5,
              background: sel ? C.lcdInvBg : 'transparent',
              color:      sel ? C.lcdInvText : C.lcdText,
              borderBottom: `1px solid ${C.lcdGrid}`,
            }}>
              <span style={{ fontWeight: 700 }}>{r.name}</span>
              <span>{r.num}</span>
              <span style={{ fontWeight: 700 }}>{r.elec}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.logic}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** DIAGNOSTICS — per p. 60 of manual: faults, warnings and help to
    resolve. */
function DiagnosticsPage({ d, running }: LcdProps) {
  const hsPct = Math.min(100, (d.heatSinkC / 90) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageTitle>Diagnostics</PageTitle>
      <div style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
        fontFamily: '"Courier New", monospace' }}>
        <div style={{
          padding: '6px 8px', border: `1px solid ${C.lcdGrid}`,
          fontSize: 11, color: running ? C.lcdText : C.lcdTextDim, fontWeight: 700,
        }}>
          {running ? '> Running normally' : '> Stopped — Ready'}
        </div>
        <Bar label="Heatsink"  value={`${d.heatSinkC.toFixed(1)} C`} pct={hsPct} />
        <Bar label="DC bus"    value={`${d.dcBusV} V`}               pct={Math.min(100, d.dcBusV / 800 * 100)} />
        <Bar label="Load"      value={`${(d.currentA / 361 * 100).toFixed(0)} %`} pct={d.currentA / 361 * 100} />
        <Bar label="Speed"     value={`${d.speedPct.toFixed(0)} %`}  pct={d.speedPct} />
        <div style={{ borderTop: `1px solid ${C.lcdGrid}`, paddingTop: 4, fontSize: 9, color: C.lcdText }}>
          Active faults:    0<br />
          Active warnings:  0<br />
          Last fault:       —
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.lcdText, marginBottom: 2 }}>
        <span>{label}</span><span style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ border: `1px solid ${C.lcdText}`, height: 8, padding: 1 }}>
        <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: C.lcdInvBg }} />
      </div>
    </div>
  );
}

/** HELP — context-sensitive help (per p. 34). Triggered by ? key. */
function HelpPage({ contextLabel }: { contextLabel: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageTitle>Help · {contextLabel}</PageTitle>
      <div style={{ flex: 1, padding: 10, fontSize: 10, color: C.lcdText, lineHeight: 1.5,
        fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
        <p style={{ margin: '0 0 6px 0' }}>
          Use ▲ ▼ to highlight. Right softkey selects, left softkey exits.
        </p>
        <p style={{ margin: '0 0 6px 0' }}>
          Hold the left softkey to return to Home view from any screen.
        </p>
        <p style={{ margin: '0 0 6px 0' }}>
          In local control, press ▶ to start and ■ to stop the drive.
          The HAND key starts in local mode; AUTO selects remote control;
          OFF stops the drive in HAND or AUTO mode.
        </p>
        <p style={{ margin: '0 0 6px 0' }}>
          Press LOC/REM to toggle between control panel (Local) and
          remote (I/O or fieldbus) control sources.
        </p>
        <p style={{ margin: '0 0 0 0', color: C.lcdTextDim, fontSize: 8.5 }}>
          See ABB doc 3AUA0000085685 Rev G for the full manual.
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Physical-button render primitives
   ════════════════════════════════════════════════════════════════════════ */

/** A soft injection-moulded keycap — concave, dark grey, with a subtle
    inner highlight. Variants for HOA color accents and Start/Stop. */
function Key({
  label, sub, onClick, width = 50, height = 28, fontSize = 10,
  variant = 'default',
  active = false,
  glyph,
  shape = 'rounded',
}: {
  label?: string;
  sub?: string;
  onClick?: () => void;
  width?: number;
  height?: number;
  fontSize?: number;
  variant?: 'default' | 'hand' | 'off' | 'auto' | 'start' | 'stop' | 'help' | 'locrem';
  active?: boolean;
  glyph?: React.ReactNode;
  shape?: 'rounded' | 'pill' | 'circle' | 'square';
}) {
  const palette: Record<string, { bg: string; bgDn: string; fg: string; ring?: string }> = {
    default: { bg: C.keyCap, bgDn: C.keyCapDn, fg: C.keyText },
    hand:    { bg: active ? C.hoaHandGreen : C.keyCap,  bgDn: C.keyCapDn, fg: active ? '#fff' : C.keyText, ring: C.hoaHandGlow },
    off:     { bg: active ? C.hoaOffRed   : C.keyCap,  bgDn: C.keyCapDn, fg: active ? '#fff' : C.keyText, ring: C.hoaOffGlow  },
    auto:    { bg: active ? C.hoaAutoBg   : C.keyCap,  bgDn: C.keyCapDn, fg: active ? C.hoaAutoText : C.keyText },
    start:   { bg: C.startGreen, bgDn: C.startGreen, fg: '#fff', ring: C.startGlow },
    stop:    { bg: C.stopRed,    bgDn: C.stopRed,    fg: '#fff', ring: C.stopGlow  },
    help:    { bg: C.keyCap, bgDn: C.keyCapDn, fg: C.keyText },
    locrem:  { bg: C.keyCap, bgDn: C.keyCapDn, fg: C.keyText },
  };
  const p = palette[variant];
  const radius = shape === 'circle' ? width / 2
               : shape === 'pill'   ? height / 2
               : shape === 'square' ? 4
               :                      6;
  return (
    <button
      onClick={onClick}
      style={{
        width, height,
        padding: 0,
        border: '1px solid #0a0b0d',
        background: `linear-gradient(180deg, ${p.bg} 0%, ${p.bgDn} 100%)`,
        borderRadius: radius,
        boxShadow: active && p.ring
          ? `0 0 0 1px ${p.ring}88, inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.4)`
          : 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -2px 1px rgba(0,0,0,0.4), 0 1px 0 rgba(0,0,0,0.5)',
        color: p.fg,
        fontSize, fontWeight: 700,
        letterSpacing: '0.04em',
        fontFamily: '"Helvetica Neue", Arial, sans-serif',
        cursor: 'pointer', userSelect: 'none',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textTransform: 'uppercase',
      }}
    >
      {glyph}
      {label && <span style={{ lineHeight: 1.05 }}>{label}</span>}
      {sub && <span style={{ fontSize: fontSize * 0.65, opacity: 0.85, lineHeight: 1.05, marginTop: 1 }}>{sub}</span>}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   AbbAch580ControlPanel — root component
   ════════════════════════════════════════════════════════════════════════ */
export function AbbAch580ControlPanel({
  running: runningProp,
  pumpTag,
}: {
  running: boolean;
  pumpTag: string;
}) {
  const clock = useClock();

  /* ─── Drive state machine, mirrored on top of the parent's "running"
        prop. The parent simulator drives whether the pump is moving;
        the ACH-AP-H keys (HAND / OFF / AUTO / Start / Stop / Loc-Rem)
        manipulate this local state. We OR the two so AUTO mode follows
        the parent simulator, and HAND mode keeps the drive running even
        if the simulator is otherwise stopped. */
  const [hoaMode, setHoaMode]                 = useState<HoaMode>('AUTO');
  const [controlLocation, setControlLocation] = useState<ControlLocation>('Remote');
  const [localStarted, setLocalStarted]       = useState(false);
  const running =
      hoaMode === 'OFF'  ? false
    : hoaMode === 'HAND' ? localStarted
    : /* AUTO */           runningProp;
  const d = useLiveData(running, pumpTag);

  /* ─── Page navigation state machine with navigation memory (per p. 32) ─ */
  const [page, setPage]               = useState<PageKey>('home');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const historyRef = useRef<PageKey[]>([]);

  const goTo = useCallback((next: PageKey) => {
    historyRef.current.push(page);
    if (historyRef.current.length > 32) historyRef.current.shift();
    setPage(next);
    setSelectedIdx(0);
  }, [page]);

  const goBack = useCallback(() => {
    const h = historyRef.current;
    if (h.length === 0) {
      setPage('home');
    } else {
      const prev = h.pop()!;
      setPage(prev);
    }
    setSelectedIdx(0);
  }, []);

  /* Item count for the currently visible page (drives Up/Down behaviour). */
  const itemCount =
    page === 'menu'        ? MAIN_MENU.length :
    page === 'options'     ? OPTIONS_MENU.length :
    page === 'parameters'  ? 13 :
    page === 'eventlog'    ? FAULT_LOG.length :
    page === 'assistants'  ? 5 :
    page === 'backups'     ? 5 :
    page === 'settings'    ? 7 :
    page === 'primary'     ? 10 :
    page === 'io'          ? 13 :
    1;

  /* ─── Key handlers ─── */
  const onUp    = useCallback(() => setSelectedIdx((i) => Math.max(0, i - 1)),
                              []);
  const onDown  = useCallback(() => setSelectedIdx((i) => Math.min(itemCount - 1, i + 1)),
                              [itemCount]);
  /* Per p. 32: left/right arrow = navigation memory back / forward. */
  const onLeft  = useCallback(() => goBack(), [goBack]);
  const onRight = useCallback(() => {
    /* On menu pages, ► drills into the highlighted item (same as right
       softkey). On the home page, it adjusts the reference (we just
       tick the reference up by 0.5 Hz visually — non-functional). */
    if (page === 'menu')      goTo(MAIN_MENU[selectedIdx].key);
    if (page === 'options')   goTo(OPTIONS_MENU[selectedIdx].key);
  }, [page, selectedIdx, goTo]);

  /* Soft-key labels are page-context-sensitive (per p. 22, item 7). */
  let softLeft  = 'Options';
  let softRight = 'Menu';
  if (page === 'home') {
    softLeft  = 'Options';
    softRight = 'Menu';
  } else if (page === 'menu') {
    softLeft  = 'Exit';
    softRight = 'Select';
  } else if (page === 'options') {
    softLeft  = 'Back';
    softRight = 'Select';
  } else if (page === 'help') {
    softLeft  = 'Exit';
    softRight = '';
  } else {
    softLeft  = 'Back';
    softRight = 'Edit';
  }

  const onSoftLeft  = useCallback(() => {
    if (page === 'home') goTo('options');
    else                 goBack();
  }, [page, goTo, goBack]);

  const onSoftRight = useCallback(() => {
    if (page === 'home') {
      goTo('menu');
    } else if (page === 'menu') {
      goTo(MAIN_MENU[selectedIdx].key);
    } else if (page === 'options') {
      goTo(OPTIONS_MENU[selectedIdx].key);
    }
    /* For data pages (parameters, io, etc.) "Edit" is a no-op in this sim. */
  }, [page, selectedIdx, goTo]);

  const onHelp = useCallback(() => {
    if (page === 'help') goBack(); else goTo('help');
  }, [page, goTo, goBack]);

  /* HOA + Start/Stop + Loc/Rem (per pp. 24–25). */
  const onHand    = useCallback(() => { setHoaMode('HAND'); setLocalStarted(true);  setControlLocation('Local');  }, []);
  const onOff     = useCallback(() => { setHoaMode('OFF');  setLocalStarted(false); }, []);
  const onAuto    = useCallback(() => { setHoaMode('AUTO'); setControlLocation('Remote'); }, []);
  const onStart   = useCallback(() => { if (controlLocation === 'Local') setLocalStarted(true); }, [controlLocation]);
  const onStop    = useCallback(() => { if (controlLocation === 'Local') setLocalStarted(false); }, [controlLocation]);
  const onLocRem  = useCallback(() => {
    setControlLocation((l) => (l === 'Local' ? 'Remote' : 'Local'));
  }, []);

  /* LCD payload */
  const lcdProps: LcdProps = { d, running, pumpTag, controlLocation, hoaMode, selectedIdx, setSelectedIdx };

  /* Status LED indication per p. 26 of manual */
  const statusLedColor =
      false /* fault */         ? C.ledRed
    : false /* warning */       ? C.ledGreen   // flashing handled via animation
    : running                   ? C.ledGreen
    :                             C.ledGreen;
  const statusLedBright = running ? 1.0 : 0.35;

  /* ─── Layout ──────────────────────────────────────────────────────── */
  const rootStyle: React.CSSProperties = {
    width:  ABB_ACH580_PANEL_DESIGN_W,
    height: ABB_ACH580_PANEL_DESIGN_H,
    background: `linear-gradient(160deg, ${C.housing} 0%, ${C.housingDk} 100%)`,
    border: `2px solid ${C.housingEdge}`,
    borderRadius: 14,
    boxShadow: 'inset 0 0 12px rgba(0,0,0,0.18), 0 0 18px rgba(0,0,0,0.5)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontFamily: '"Helvetica Neue", Arial, sans-serif',
    overflow: 'hidden',
    userSelect: 'none',
    transformOrigin: '0 0',
    color: C.lcdText,
    boxSizing: 'border-box',
  };

  return (
    <div style={rootStyle}>
      {/* ════════ Top brand strip — ABB logo + ACH580 model designation ═══════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 4px', height: 22, flexShrink: 0,
      }}>
        <span style={{
          background: C.abbRed, color: '#fff',
          padding: '1px 8px', borderRadius: 1,
          fontSize: 14, fontWeight: 900, fontStyle: 'italic',
          letterSpacing: '0.02em',
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.25)',
        }}>
          ABB
        </span>
        <span style={{
          fontSize: 9, color: C.lcdText, fontWeight: 700, letterSpacing: '0.10em',
        }}>
          ACH580 CONTROL PANEL
        </span>
        <span style={{
          fontSize: 7, color: C.housingEdge, letterSpacing: '0.08em', fontWeight: 700,
        }}>
          ACH-AP-H
        </span>
      </div>

      {/* ════════ Display (240 × 160 STN LCD, positive mode, pale teal-grey) ═══ */}
      <div style={{
        height: 290,
        background: `linear-gradient(180deg, ${C.lcdBg} 0%, ${C.lcdBgDim} 100%)`,
        border: `2px solid ${C.bezel}`,
        borderRadius: 3,
        boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5), 0 0 6px rgba(132,180,170,0.10)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Top status bar (per pp. 22–23) */}
        <LcdTopBar
          controlLocation={controlLocation}
          driveName="ACH580"
          referenceText={page === 'home' ? `${d.freqHz.toFixed(1)} Hz` : ''}
          running={running}
          faulted={false}
        />

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {page === 'home'        && <HomeView         {...lcdProps} />}
          {page === 'menu'        && <SelectableList   title="Menu"    items={MAIN_MENU}    selectedIdx={selectedIdx} />}
          {page === 'options'     && <SelectableList   title="Options" items={OPTIONS_MENU} selectedIdx={selectedIdx} />}
          {page === 'parameters'  && <ParametersPage   {...lcdProps} />}
          {page === 'assistants'  && <AssistantsPage   {...lcdProps} />}
          {page === 'energy'      && <EnergyPage       {...lcdProps} />}
          {page === 'eventlog'    && <EventLogPage     {...lcdProps} />}
          {page === 'history'     && <HistoryPage      {...lcdProps} />}
          {page === 'backups'     && <BackupsPage      {...lcdProps} />}
          {page === 'systeminfo'  && <SystemInfoPage   {...lcdProps} />}
          {page === 'settings'    && <SettingsPage     {...lcdProps} />}
          {page === 'primary'     && <PrimaryPage      {...lcdProps} />}
          {page === 'io'          && <IoPage           {...lcdProps} />}
          {page === 'diagnostics' && <DiagnosticsPage  {...lcdProps} />}
          {page === 'help'        && <HelpPage         contextLabel={'navigation'} />}
        </div>

        {/* Bottom soft-key + clock bar (per p. 22, items 7 & 8) */}
        <LcdSoftkeyBar softLeft={softLeft} softRight={softRight} clock={clock} />
      </div>

      {/* ════════ Soft-key push-buttons (immediately under LCD) ═══════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
        <Key onClick={onSoftLeft}  glyph={<span style={{ fontSize: 16 }}>•</span>} width={70} height={24} fontSize={12} shape="rounded" />
        <Key onClick={onSoftRight} glyph={<span style={{ fontSize: 16 }}>•</span>} width={70} height={24} fontSize={12} shape="rounded" />
      </div>

      {/* ════════ Status LED · Help · 4-way arrow pad ════════════════════════════
            Per the manual diagram on pp. 20–21:
              4 = Status LED
              5 = Help (?)
              6 = Arrow keys (▲ ◄ ► ▼ — no centre OK key)              */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '46px 46px 1fr',
        alignItems: 'center', justifyItems: 'center',
        gap: 6, padding: '4px 0', flexShrink: 0,
      }}>
        {/* LED + Help column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: statusLedColor,
            opacity: statusLedBright,
            border: `1px solid #2a2c30`,
            boxShadow: running ? `0 0 8px ${statusLedColor}` : 'none',
          }} />
          <span style={{ fontSize: 7, color: C.housingEdge, fontWeight: 700, letterSpacing: '0.08em' }}>STATUS</span>
        </div>
        {/* Help (?) */}
        <Key onClick={onHelp} variant="help" label="?" width={36} height={36} fontSize={18} shape="circle" />
        {/* 4-way arrow pad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '34px 34px 34px',
          gridTemplateRows:    '24px 24px 24px',
          gap: 3,
        }}>
          <div /><Key onClick={onUp}    glyph="▲" width={34} height={24} fontSize={12} shape="square" /><div />
          <Key onClick={onLeft}  glyph="◄" width={34} height={24} fontSize={12} shape="square" />
          <div style={{
            width: 34, height: 24,
            border: `1px dashed ${C.housingShadow}`, borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, color: C.housingShadow, letterSpacing: '0.04em',
          }}>
            NAV
          </div>
          <Key onClick={onRight} glyph="►" width={34} height={24} fontSize={12} shape="square" />
          <div /><Key onClick={onDown}  glyph="▼" width={34} height={24} fontSize={12} shape="square" /><div />
        </div>
      </div>

      {/* ════════ Start (▶) + Stop (■) — local-control row (per p. 24) ════════ */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexShrink: 0 }}>
        <Key onClick={onStop}  variant="stop"  glyph={<span style={{ fontSize: 14 }}>■</span>} label="STOP" width={80} height={36} fontSize={9} shape="rounded" />
        <Key onClick={onStart} variant="start" glyph={<span style={{ fontSize: 14 }}>▶</span>} label="START" width={80} height={36} fontSize={9} shape="rounded" />
      </div>

      {/* ════════ HAND · OFF · AUTO function keys (per p. 25) ════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
        <Key onClick={onHand} variant="hand" active={hoaMode === 'HAND'}
          label="HAND"
          glyph={<span style={{ fontSize: 14 }}>✋</span>}
          width={70} height={42} fontSize={9} shape="rounded"
        />
        <Key onClick={onOff}  variant="off"  active={hoaMode === 'OFF'}
          label="OFF"
          glyph={<span style={{ fontSize: 14 }}>⏻</span>}
          width={70} height={42} fontSize={9} shape="rounded"
        />
        <Key onClick={onAuto} variant="auto" active={hoaMode === 'AUTO'}
          label="AUTO"
          glyph={<span style={{ fontSize: 14 }}>A</span>}
          width={70} height={42} fontSize={9} shape="rounded"
        />
      </div>

      {/* ════════ Loc/Rem key (per p. 25) ════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <Key onClick={onLocRem} variant="locrem"
          label={controlLocation === 'Local' ? 'LOC ' : 'REM '}
          sub="LOC/REM"
          width={120} height={28} fontSize={9} shape="rounded"
        />
      </div>

      {/* ════════ Bottom plate — RJ45 + USB + type code ══════════════════════ */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        padding: '0 4px', flexShrink: 0,
      }}>
        <span style={{
          fontSize: 7, color: C.housingEdge, letterSpacing: '0.05em', fontWeight: 700,
        }}>
          M/N: ACH-AP-H · 3AXD50000025964
        </span>
        <div style={{
          width: 30, height: 8,
          background: C.bezel, borderRadius: 2,
          border: `1px solid ${C.housingEdge}`,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)',
        }} />
      </div>
    </div>
  );
}

/* ─── Backwards-compat alias — older code may still import the previous
       symbol name. Both names render the same component. ───────────── */
export const PumpVfdHMI = AbbAch580ControlPanel;
