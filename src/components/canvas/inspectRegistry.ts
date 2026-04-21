/**
 * Component spec registry surfaced in the inspect HUD.
 *
 * Each entry maps a substring pattern that we look for in the mesh-hierarchy
 * path of a hover/click hit (e.g. `engine-room > electrical:VFD-CDWP-1 > door`)
 * to a {@link ComponentSpec} with tag, service, spec text, install note, and
 * the originating pid.json bullet.
 *
 * The registry is intentionally conservative: only items where pid.json
 * specifies a concrete tag, service or installation requirement are listed.
 * Lookups walk the registry in order and return the first pattern that occurs
 * anywhere in the path, so longer / more-specific patterns must come first.
 */
import type { ComponentSpec } from '../../store/useInspectStore';

interface RegistryEntry {
  pattern: string;
  spec: ComponentSpec;
}

const ENTRIES: RegistryEntry[] = [
  // ── Pumps ─────────────────────────────────────────────────────────────────
  {
    pattern: 'electrical:VFD-CDWP-1',
    spec: {
      tag: 'VFD-CDWP-1',
      service: 'Condenser-water pump variable-frequency drive',
      spec: 'ABB ACH580 / 480 V / ~300 HP / NEMA-12 floor cabinet',
      installNote: 'Free-standing on housekeeping pad, door faces pump; bypass cabinet to its right.',
      pidRef: 'electrical_system: VFDs for both pumps with local disconnects and bypass',
    },
  },
  {
    pattern: 'electrical:VFD-CHWP-1',
    spec: {
      tag: 'VFD-CHWP-1',
      service: 'Chilled-water pump variable-frequency drive',
      spec: 'ABB ACH580 / 480 V / ~300 HP / NEMA-12 floor cabinet',
      installNote: 'Free-standing on housekeeping pad, door faces pump; bypass cabinet to its right.',
      pidRef: 'electrical_system: VFDs for both pumps with local disconnects and bypass',
    },
  },
  {
    pattern: 'electrical:BYP-CDWP-1',
    spec: {
      tag: 'BYP-CDWP-1',
      service: 'Across-the-line bypass for CDWP VFD',
      spec: 'NEMA-12, Drive/Off/Bypass selector + line + bypass contactors',
      installNote: 'Adjacent to VFD-CDWP-1; select BYPASS to run pump direct-online when VFD is offline for service.',
      pidRef: 'electrical_system: VFDs for both pumps with local disconnects and bypass',
    },
  },
  {
    pattern: 'electrical:BYP-CHWP-1',
    spec: {
      tag: 'BYP-CHWP-1',
      service: 'Across-the-line bypass for CHWP VFD',
      spec: 'NEMA-12, Drive/Off/Bypass selector + line + bypass contactors',
      installNote: 'Adjacent to VFD-CHWP-1; select BYPASS to run pump direct-online when VFD is offline for service.',
      pidRef: 'electrical_system: VFDs for both pumps with local disconnects and bypass',
    },
  },
  // ── Electrical service ────────────────────────────────────────────────────
  {
    pattern: 'electrical:XFMR-MAIN',
    spec: {
      tag: 'XFMR-MAIN',
      service: 'Main step-down transformer',
      spec: 'Pad-mount oil-filled, primary 13.8 kV / secondary 480 V Δ',
      installNote: 'Located outside the engine-room electrical entry on a concrete pad with bollards.',
      pidRef: 'electrical_system: Main step-down transformer at engine room electrical entrance',
    },
  },
  {
    pattern: 'electrical:MAIN-BREAKER',
    spec: {
      tag: 'MCB-MAIN',
      service: 'Main service disconnect / breaker',
      spec: 'NEMA 3R, 480 V / 3Φ / 1200 A LSI breaker, lockable handle',
      installNote: 'Immediately downstream of the transformer; lockable in OFF for arc-flash safety.',
      pidRef: 'electrical_system: Main service disconnect/breaker right after transformer',
    },
  },
  {
    pattern: 'electrical:DS-CHILLER',
    spec: {
      tag: 'DS-CHILLER',
      service: 'Lockable disconnect at chiller',
      spec: 'NEMA-12, fused, 480 V / 3Φ',
      installNote: 'Mounted on engine-room wall within line-of-sight of the chiller starter cabinet.',
      pidRef: 'electrical_system: Individual lockable disconnect switches at chiller, CDWP, CHWP, cooling tower fan, and AHU/RTU',
    },
  },
  {
    pattern: 'electrical:DS-CT-FAN',
    spec: {
      tag: 'DS-CT-FAN',
      service: 'Cooling-tower fan motor disconnect',
      spec: 'NEMA 4X (rooftop), fused, 480 V / 3Φ',
      installNote: 'Mounted on tower casing within line-of-sight of the fan motor.',
      pidRef: 'electrical_system: Lockable disconnects at chiller, CDWP, CHWP, cooling tower fan, and AHU/RTU',
    },
  },
  {
    pattern: 'electrical:DS-AHU',
    spec: {
      tag: 'DS-AHU-1',
      service: 'AHU/RTU lockable fused safety switch',
      spec: 'NEMA 3R outdoor, side-operated handle, 480 V / 3Φ / 100 A FUSED, lockout staple for OSHA 1910.147 LOTO',
      installNote: 'Mounted on the −Z (back) face of the AHU fan section between the two VFDs, within sight of the supply-fan motors per NEC 430.102. Padlock-OFF the handle and verify zero energy before removing the belt guard or accessing the fan section.',
      pidRef: 'electrical_system: Lockable disconnects at chiller, CDWP, CHWP, cooling tower fan, and AHU/RTU',
    },
  },
  // ── AHU internal components ──────────────────────────────────────────────
  {
    pattern: 'ahu:FILT-AHU',
    spec: {
      tag: 'FILT-AHU-1',
      service: 'AHU final-filter bank (MERV 13 pleated cartridges)',
      spec: '4 rows × 8 cols of 24 × 24 × 12 in. MERV 13 pleated panel filters, kraft-board frame, aluminum-edge pleats, slide-in steel rack with spring-clip retainers',
      installNote: 'Slide cartridges in from the +Z access door; spring clips press each cartridge against the upstream sealing face. Replace at +1.0 in. w.c. across the bank (verify with the door-mounted Magnehelic DP gauge). Differential-pressure transmitter taps on the rack signal the BMS to alarm dirty-filter at the same setpoint.',
      pidRef: 'air_handling_unit: Pre-filter and final-filter sections with access doors and DP gauge',
    },
  },
  {
    pattern: 'ahu:COIL-AHU',
    spec: {
      tag: 'COIL-AHU-1',
      service: 'AHU chilled-water cooling coil (Cu tubes / Al fins)',
      spec: '8-row deep slab, 5/8" copper tubes on 1.5" × 1.25" stagger, 12 fpi corrugated aluminum fins, vertical supply/return copper headers with 180° hairpin returns on the opposite end, galvanized condensate drain pan with P-trapped 2" drain stub, ASME nameplate on supply end',
      installNote: 'CHWS enters the bottom header, leaves out the top — counter-flow against the air stream. Auto air vent at the top header crown (AAV-AHU-SUP) purges entrained air. Drain pan slope >1/8" per ft toward the trap; trap depth ≥ 2× upstream fan static.',
      pidRef: 'air_handling_unit: Chilled-water cooling coil section with sight-glass access doors',
    },
  },
  {
    pattern: 'ahu:BLW-AHU',
    spec: {
      tag: 'BLW-AHU-1',
      service: 'AHU supply blower — DWDI housed centrifugal',
      spec: 'Belt-drive double-width / dual-inlet centrifugal fan, ~36" wheel, forward-curved, ~760 RPM design, TEFC 60 HP / 480 V / 3Φ induction motor on slide-rail base, V-belt drive (4 × B-section belts), OSHA-yellow expanded-metal belt guard, neoprene-pad spring isolators (4) below base',
      installNote: 'Two units per AHU arranged across the cabinet width. Inlet bell-mouths face the cross-cabinet plenum; discharge collar exits +Y up into the discharge plenum, which then drops through the curb into the supply-air ductwork below. Belt tension: 1/64" deflection per inch of span. Inspect bearings + belts quarterly.',
      pidRef: 'air_handling_unit: Draw-through fan-array section with access doors',
    },
  },
  {
    pattern: 'ahu:OAD-AHU',
    spec: {
      tag: 'OAD-AHU-1',
      service: 'AHU outside-air modulating damper',
      spec: 'Aluminum extruded parallel-blade low-leak damper (≤8 cfm/ft² @ 1.0 in. w.c.), EPDM blade-edge seals, jamb seals, end-mounted Belimo AF24-MFT modulating actuator (24 VAC, 2-10 V control signal, 0–90° spring-return-to-close on power loss), bird-screen grille on OA face',
      installNote: 'Set immediately downstream of the OA hood louvers. Modulates between minimum-OA position (≈25%) and free-cooling position (≈100%) under BMS economizer logic; closes fully on shutdown to prevent freeze damage at the coil.',
      pidRef: 'air_handling_unit: Outside-air mixing box with modulating damper',
    },
  },
  {
    pattern: 'electrical:BMS-1',
    spec: {
      tag: 'BMS-1',
      service: 'Building Management System / BAS controller panel',
      spec: 'NEMA-12 enclosure, 7" color HMI, BACnet/MSTP + IP, cellular telemetry antenna',
      installNote: 'Wall-mount at eye level; routes analog (blue) signals from FT/TT/PT/PDI and digital (black) Modbus to the chiller PLC.',
      pidRef: 'electrical_system: Power and control wiring runs clearly routed along walls/ceiling/trays',
    },
  },
  // ── Makeup-water + chemical loops ─────────────────────────────────────────
  {
    pattern: 'makeup:RPZ-BFP',
    spec: {
      tag: 'RPZ-1',
      service: 'Reduced-pressure zone backflow preventer (makeup water)',
      spec: 'ASSE 1013, two independently-acting check valves + relief, 1-1/2"',
      installNote: 'Installed at building edge, downstream of isolation valve; relief discharges to a visible air gap on the roof.',
      pidRef: 'makeup_water_loop: Isolation valve + backflow preventer (RPZ)',
    },
  },
  {
    pattern: 'valve:PRV-MU',
    spec: {
      tag: 'PRV-MU',
      service: 'Pressure-reducing valve, makeup water',
      spec: 'Watts/Wilkins 1-1/2", spring bell housing, 50 psig downstream set',
      installNote: 'Immediately downstream of the RPZ. Reduces street pressure to plant-side house pressure before the air gap.',
      pidRef: 'makeup_water_loop / pressure_regulation: PRV station on makeup water',
    },
  },
  {
    pattern: 'valve:LC-CT',
    spec: {
      tag: 'LC-CT',
      service: 'Cooling-tower basin level control valve',
      spec: 'Float-operated bronze globe, 1-1/2" inlet, brass float arm + copper ball',
      installNote: 'Mounted on the makeup drop pipe at basin water-surface elevation; arm float keeps basin at design level.',
      pidRef: 'makeup_water_loop: Float-operated level control valve (LC) or solenoid with level switch',
    },
  },
  {
    pattern: 'chemical:POT-CT',
    spec: {
      tag: 'POT-CT',
      service: 'Bypass pot feeder, condenser-water (CWR slug-feed)',
      spec: '5-gal ASME pot · A53 steel, orange chemical-service paint, fill funnel + hinged cap, sight glass, vent + drain ball-cocks, top-mount pressure gauge',
      installNote: 'Tied across the engine-room CWR riser as a side-stream bypass loop. Open IN/OUT gates and close BYPASS gate to force CWR flow through the pot when slug-feeding. Sits on a bunded EPA SPCC pallet sized for ≥110% of vessel volume.',
      pidRef: 'chemical_treatment: Chemical fill tank / pot feeder in engine room near chiller',
    },
  },
  {
    pattern: 'chemical:DAY-TANKS',
    spec: {
      tag: 'CHEM-DT',
      service: 'Liquid chemical day tanks + diaphragm metering pumps',
      spec: '2 × 30-gal HDPE drums (BIOCIDE / INHIBITOR), each with LMI / ProMinent class diaphragm metering pump on top (stroke-length adjustable), foot-valve, calibration column ready',
      installNote: 'Continuous proportional dosing into the CWR chemical-feed line (downstream of the pot-feeder check valve). Drums sit on a shared bunded pallet for spill containment.',
      pidRef: 'chemical_treatment (best-practice add): metering pumps for continuous biocide / corrosion inhibitor dosing',
    },
  },
  {
    pattern: 'chemical:CONDUCTIVITY-CTRL',
    spec: {
      tag: 'COND-CT-1',
      service: 'Cooling-tower TDS / conductivity controller + blowdown',
      spec: 'Walchem / Pulsafeeder class controller, 0–10,000 µS/cm, NEMA-4X enclosure; toroidal probe in CWR, NC brass solenoid bleed valve, signal cable analog blue per pid color code',
      installNote: 'Probe inserted in CWR riser; controller compares µS/cm to setpoint (~3,000–4,500 µS/cm typ.) and opens the bleed solenoid to discharge concentrated water to the engine-room floor drain. Single most important chemical-treatment instrument — sets cycles of concentration.',
      pidRef: 'chemical_treatment (industry-standard add): TDS-based blowdown control for cooling tower water management',
    },
  },
  {
    pattern: 'chemical:SHOT-CHR',
    spec: {
      tag: 'SHOT-CHR',
      service: 'Closed-loop shot feeder, chilled-water side (CHR)',
      spec: '2-gal ASME pressure pot, hemispherical heads, top fill cap + vent, in/out isolation gates, bottom hose-bib drain',
      installNote: 'Mounted on a wall bracket directly under the CHR header. CHM-CHR-IN and CHM-CHR-OUT gates on the bypass branches; opening both forces a portion of CHR flow through the pot to dissolve the slug-fed chemical. Quarterly biocide / corrosion-inhibitor dosing for the closed loop.',
      pidRef: 'chemical_treatment: Separate shot feeder for closed chilled water loop connected to CHR line',
    },
  },
  {
    pattern: 'chemical:injection-CWR',
    spec: {
      tag: 'INJ-CWR',
      service: 'Chemical-feed line + injection quill into CWR',
      spec: '3/4" Sch 40 carbon-steel piping (orange chemical service); inline pot-side gate, pressure gauge, swing-check valve, ceiling-penetration sleeve, quill-side gate, corp-stop ball + 1/2" 316 SS lance reaching CWR centerline',
      installNote: 'Continuous run from pot-feeder discharge in engine room → vertical riser through ceiling sleeve → rooftop horizontal → corp-stop quill on rooftop CWR header. Check valve prevents CWR back-flow into pot; both gates allow in-service quill removal.',
      pidRef: 'chemical_treatment: Chemical feed line with isolation valves, check valve, and injection quill into cooling tower basin or CWR line',
    },
  },
  // ── Pressure regulation ───────────────────────────────────────────────────
  {
    pattern: 'hydronic:EXP-TANK-CHR',
    spec: {
      tag: 'EXP-1',
      service: 'Bladder expansion tank, chilled-water loop',
      spec: 'Pre-charged EPDM bladder, ASME, ~250 gal, mounted horizontal on legs',
      installNote: 'Tied into CHR header upstream of CHWP suction so net positive suction head stays positive.',
      pidRef: 'pressure_regulation: Bladder expansion tank on CHR suction line to CHWP',
    },
  },
  {
    pattern: 'valve:PSV-EXP',
    spec: {
      tag: 'PSV-EXP',
      service: 'Pressure relief valve on CHR expansion tank',
      spec: 'Bronze, set 75 psig, ASME Sec VIII Div 1, drip-pan elbow discharge',
      installNote: 'Top of expansion tank; discharge piped to floor drain.',
      pidRef: 'pressure_regulation: Pressure Relief Valve (PSV) on expansion tank',
    },
  },
  {
    pattern: 'valve:PSV-COND',
    spec: {
      tag: 'PSV-COND',
      service: 'Pressure relief valve on chiller condenser outlet',
      spec: 'Bronze, set 150 psig, ASME, vented overhead',
      installNote: 'Mounted on top of the condenser water box; protects against thermal lock-up when isolated.',
      pidRef: 'pressure_regulation: Pressure Relief Valve (PSV) on chiller condenser outlet',
    },
  },
  // ── Rooftop riser air vents ───────────────────────────────────────────────
  {
    pattern: 'vent:CWS-RISER-TOP',
    spec: {
      tag: 'AAV-CWS',
      service: 'Automatic air vent — CWS condenser supply riser top',
      spec: 'Caleffi / Spirotherm float-type auto air eliminator, 1/2" NPT, brass body, EPDM float',
      installNote: 'Installed at highest point of CWS vertical riser on rooftop; vents air pockets that accumulate at the crown.',
      pidRef: 'air_management: Automatic air vents at highest point of every vertical riser on rooftop',
    },
  },
  {
    pattern: 'vent:CWR-RISER-TOP',
    spec: {
      tag: 'AAV-CWR',
      service: 'Automatic air vent — CWR condenser return riser top',
      spec: 'Caleffi / Spirotherm float-type auto air eliminator, 1/2" NPT, brass body, EPDM float',
      installNote: 'Installed at highest point of CWR vertical riser on rooftop; allows air to escape without manual bleeding.',
      pidRef: 'air_management: Automatic air vents at highest point of every vertical riser on rooftop',
    },
  },
  {
    pattern: 'vent:CHS-RISER-TOP',
    spec: {
      tag: 'AAV-CHS',
      service: 'Automatic air vent — CHS chilled supply riser top',
      spec: 'Caleffi / Spirotherm float-type auto air eliminator, 1/2" NPT, stainless float — rated for chilled service',
      installNote: 'Top of CHS rooftop riser; critical to purge dissolved air from chilled water before it enters the AHU coil.',
      pidRef: 'air_management: Automatic air vents at highest point of every vertical riser on rooftop',
    },
  },
  {
    pattern: 'vent:CHR-RISER-TOP',
    spec: {
      tag: 'AAV-CHR',
      service: 'Automatic air vent — CHR chilled return riser top',
      spec: 'Caleffi / Spirotherm float-type auto air eliminator, 1/2" NPT, stainless float — rated for chilled service',
      installNote: 'Top of CHR rooftop riser; vents air drawn in at low-pressure suction side of the CHWP.',
      pidRef: 'air_management: Automatic air vents at highest point of every vertical riser on rooftop',
    },
  },
  {
    pattern: 'vent:AHU-COIL-SUP-TOP',
    spec: {
      tag: 'AAV-AHU-SUP',
      service: 'Automatic air vent — AHU coil supply header high point',
      spec: 'Caleffi float-type, 3/8" NPT, brass body, EPDM seat; located at coil top-header crown',
      installNote: 'Purges air from the top of the AHU cooling coil supply header; prevents air-bound coil and ensures full coil wetting.',
      pidRef: 'air_management: Automatic air vents at top of AHU coil and chiller heat exchangers',
    },
  },
  {
    pattern: 'vent:AHU-COIL-RET-TOP',
    spec: {
      tag: 'AAV-AHU-RET',
      service: 'Automatic air vent — AHU coil return header high point',
      spec: 'Caleffi float-type, 3/8" NPT, brass body, EPDM seat',
      installNote: 'Purges air from the top of the AHU cooling coil return header.',
      pidRef: 'air_management: Automatic air vents at top of AHU coil and chiller heat exchangers',
    },
  },
  // ── Header and AHU coil test ports ────────────────────────────────────────
  {
    pattern: 'test:CHWS-HDR-UP',
    spec: {
      tag: 'PP-CHWS-U',
      service: "Pete's plug / Schrader test port — CHWS header upstream of FT",
      spec: "Pete's plug, 1/4\" NPT core, rated 500 psig, ball valve isolation, bronze body",
      installNote: 'On the CHWS low-level header upstream of FT-CHWS; allows gauge or pitot-tube insertion without system shutdown.',
      pidRef: "pressure_test_ports: Pete's plugs / Schrader test ports at pump suction/discharge, chiller in/out, across strainers, and at AHU coil",
    },
  },
  {
    pattern: 'test:CHWS-HDR-DN',
    spec: {
      tag: 'PP-CHWS-D',
      service: "Pete's plug — CHWS header downstream of FT",
      spec: "Pete's plug, 1/4\" NPT core, rated 500 psig",
      installNote: 'Downstream of FT-CHWS; used to verify flow-meter calibration by temperature/pressure differential.',
      pidRef: "pressure_test_ports: Pete's plugs / Schrader test ports at pump suction/discharge, chiller in/out, across strainers, and at AHU coil",
    },
  },
  {
    pattern: 'test:CHWR-HDR-UP',
    spec: {
      tag: 'PP-CHWR-U',
      service: "Pete's plug — CHWR header upstream of strainer PDI",
      spec: "Pete's plug, 1/4\" NPT core, rated 500 psig",
      installNote: "On CHWR return header upstream of PDI-YST-CHW; used to verify differential-pressure reading across strainer.",
      pidRef: "pressure_test_ports: Pete's plugs / Schrader test ports across strainers",
    },
  },
  {
    pattern: 'test:CHWR-HDR-DN',
    spec: {
      tag: 'PP-CHWR-D',
      service: "Pete's plug — CHWR header downstream",
      spec: "Pete's plug, 1/4\" NPT core, rated 500 psig",
      installNote: 'Downstream test point on the CHW return main for balancing and commissioning checks.',
      pidRef: "pressure_test_ports: Pete's plugs / Schrader test ports across strainers",
    },
  },
  {
    pattern: 'test:AHU-COIL-SUP',
    spec: {
      tag: 'PP-AHU-SUP',
      service: "Pete's plug — AHU coil supply stub (rooftop)",
      spec: "Pete's plug, 1/4\" NPT core, rated 300 psig, stainless NEMA-4X cap (outdoor rated)",
      installNote: 'On the AHU chilled-water supply stub riser; used during Cx commissioning to verify coil pressure drop and flow balance.',
      pidRef: "pressure_test_ports: Pete's plugs at AHU coil",
    },
  },
  {
    pattern: 'test:AHU-COIL-RET',
    spec: {
      tag: 'PP-AHU-RET',
      service: "Pete's plug — AHU coil return stub (rooftop)",
      spec: "Pete's plug, 1/4\" NPT core, rated 300 psig, stainless NEMA-4X cap",
      installNote: 'On the AHU chilled-water return stub riser; used with PP-AHU-SUP to measure coil dP and verify design flow.',
      pidRef: "pressure_test_ports: Pete's plugs at AHU coil",
    },
  },
  // ── CT basin overflow / roof drain ────────────────────────────────────────
  {
    pattern: 'drain:CT-OVERFLOW-ROOF-DRAIN',
    spec: {
      tag: 'RD-CT-OVF',
      service: 'Cooling-tower basin overflow → rooftop roof drain',
      spec: 'Cast-iron flat-top roof drain, 4" outlet, removable dome strainer; overflow pipe 2" galv. steel Sch 40',
      installNote: 'Gravity-overflow pipe exits CT basin south face at basin weir elevation and routes to the roof drain; isolation gate valve allows temporary plugging for basin inspection. Roof drain sized for the combined overflow + makeup-water relief flow.',
      pidRef: 'makeup_water_loop: Basin overflow/drain line with isolation valve routed to roof drain',
    },
  },
  // ── Animated flow markers ─────────────────────────────────────────────────
  {
    pattern: 'flow:CWS-riser',
    spec: {
      tag: 'FLOW-CWS',
      service: 'CWS condenser supply — flow direction indicator',
      spec: 'Animated ASME A13.1 flow arrow — dark green, 1.2 m/s design velocity',
      installNote: 'Flows downward from cooling tower rooftop into CDWP suction. Arrow reversal indicates pump failure or inadvertent isolation.',
      pidRef: 'animation: Water flow animation in pipes (color-coded)',
    },
  },
  {
    pattern: 'flow:CHS-riser',
    spec: {
      tag: 'FLOW-CHS',
      service: 'CHS chilled supply — flow direction indicator',
      spec: 'Animated ASME A13.1 flow arrow — dark blue, 1.2 m/s design velocity',
      installNote: 'Flows upward from CHWP discharge through roof penetration to AHU coil supply.',
      pidRef: 'animation: Water flow animation in pipes (color-coded)',
    },
  },
  // ── Instruments ───────────────────────────────────────────────────────────
  {
    pattern: 'instrument:FT-CHWS',
    spec: {
      tag: 'FT-CHWS',
      service: 'Chilled-water supply flow transmitter',
      spec: 'Mag-meter, 4-20 mA, ductile-iron body, PTFE liner, 24" line size',
      installNote: 'Installed in straight pipe section ≥5D upstream / 3D downstream of fittings per AWWA.',
      pidRef: 'instruments: FT, TT, PT on CWS, CWR, CHS, CHR mains',
    },
  },
  {
    pattern: 'instrument:FT-CWS',
    spec: {
      tag: 'FT-CWS',
      service: 'Condenser-water supply flow transmitter',
      spec: 'Mag-meter, 4-20 mA, ductile-iron body, PTFE liner, 24" line size',
      installNote: 'Installed in straight pipe section ≥5D upstream / 3D downstream of fittings per AWWA.',
      pidRef: 'instruments: FT, TT, PT on CWS, CWR, CHS, CHR mains',
    },
  },
  {
    pattern: 'instrument:PDI-CDWP',
    spec: {
      tag: 'PDI-CDWP',
      service: 'CDWP differential-pressure transmitter (across pump)',
      spec: 'Rosemount 3051CD, 0-100 psid, 4-20 mA',
      installNote: 'Tapped to PG/TG nipples at pump suction and discharge; 5-valve manifold for in-service calibration.',
      pidRef: 'instruments: PDI across each pump and strainer',
    },
  },
  {
    pattern: 'instrument:PDI-CHWP',
    spec: {
      tag: 'PDI-CHWP',
      service: 'CHWP differential-pressure transmitter (across pump)',
      spec: 'Rosemount 3051CD, 0-100 psid, 4-20 mA',
      installNote: 'Tapped to PG/TG nipples at pump suction and discharge; 5-valve manifold for in-service calibration.',
      pidRef: 'instruments: PDI across each pump and strainer',
    },
  },
  {
    pattern: 'instrument:PDI-YST-CDW',
    spec: {
      tag: 'PDI-YST-CDW',
      service: 'CDW Y-strainer differential-pressure transmitter',
      spec: 'Rosemount 3051CD, 0-30 psid, 4-20 mA',
      installNote: 'High-side at strainer inlet, low-side at strainer outlet — alarms operator when ΔP > 5 psid (clean basket).',
      pidRef: 'instruments: PDI across each pump and strainer',
    },
  },
  {
    pattern: 'instrument:PDI-YST-CHW',
    spec: {
      tag: 'PDI-YST-CHW',
      service: 'CHW Y-strainer differential-pressure transmitter',
      spec: 'Rosemount 3051CD, 0-30 psid, 4-20 mA',
      installNote: 'High-side at strainer inlet, low-side at strainer outlet — alarms operator when ΔP > 5 psid (clean basket).',
      pidRef: 'instruments: PDI across each pump and strainer',
    },
  },
];

/**
 * Walk a path string (root → leaf, separated by ` > ` or ` / `) and return the
 * first registered spec whose pattern is a substring of the path. Returns
 * null when no entry matches.
 */
export function lookupComponentSpec(path: string | null | undefined): ComponentSpec | null {
  if (!path) return null;
  for (const e of ENTRIES) {
    if (path.includes(e.pattern)) return e.spec;
  }
  return null;
}
