import { useEffect, useState, type CSSProperties } from 'react';
import './cxAlloyApp.css';

export const CXALLOY_DOC_W = 900;
export const CXALLOY_DOC_H = 1100;

type BadgeKind = 'pass' | 'prog' | 'none';

type BarSeg =
  | { kind: 'g' | 'r'; width: string }
  | { kind: 'gray' };

type TestItem = {
  badge: BadgeKind;
  segments: BarSeg[];
  num: string;
  name: string;
  meta: string;
};

const TEST_ITEMS: TestItem[] = [
  { badge: 'pass', segments: [{ kind: 'g', width: '88%' }], num: '#1', name: 'AHU-1', meta: '1 Attempt, ⚙ AHU-1, 👤 Jacob Terry' },
  { badge: 'prog', segments: [{ kind: 'g', width: '58%' }, { kind: 'r', width: '16%' }], num: '#28', name: 'AHU-1 - Boiler', meta: '1 Attempt, ⚙ AHU-1, 👤 Brent Hornilla' },
  { badge: 'none', segments: [{ kind: 'gray' }], num: '#54', name: 'AHU-1 - Chiller Test', meta: '1 Attempt, ⚙ AHU-1, 👤 Brady M' },
  { badge: 'pass', segments: [{ kind: 'g', width: '88%' }], num: '#4', name: 'AHU-2', meta: '1 Attempt, ⚙ AHU-2, 👤 Jacob Terry' },
  { badge: 'none', segments: [{ kind: 'gray' }], num: '#31', name: 'AHU-2 - Air Hander Unit Test', meta: '1 Attempt, ⚙ AHU-2, 👤 Brent Hornilla' },
  { badge: 'prog', segments: [{ kind: 'g', width: '62%' }, { kind: 'r', width: '18%' }], num: '#30', name: 'AHU-2 - Boiler', meta: '1 Attempt, ⚙ AHU-2, 👤 Brent Hornilla' },
  { badge: 'none', segments: [{ kind: 'gray' }], num: '#55', name: 'AHU-2 - Chiller Test', meta: '1 Attempt, ⚙ AHU-2, 👤 Brady M' },
  { badge: 'pass', segments: [{ kind: 'g', width: '88%' }], num: '#7', name: 'AHU-3', meta: '1 Attempt, ⚙ AHU-3, 👤 Jacob Terry' },
  { badge: 'none', segments: [{ kind: 'gray' }], num: '#33', name: 'AHU-3 - Air Hander Unit Test', meta: '1 Attempt, ⚙ AHU-3, 👤 Brent Hornilla' },
  { badge: 'prog', segments: [{ kind: 'g', width: '5%' }], num: '#32', name: 'AHU-3 - Boiler', meta: '1 Attempt, ⚙ AHU-3, 👤 Brent Hornilla' },
  { badge: 'pass', segments: [{ kind: 'g', width: '88%' }], num: '#10', name: 'AHU-4', meta: '1 Attempt, ⚙ AHU-4, 👤 Jacob Terry' },
  { badge: 'none', segments: [{ kind: 'gray' }], num: '#35', name: 'AHU-4 - Air Hander Unit Test', meta: '1 Attempt, ⚙ AHU-4, 👤 Brent Hornilla' },
  { badge: 'prog', segments: [{ kind: 'g', width: '4%' }], num: '#34', name: 'AHU-4 - Boiler', meta: '1 Attempt, ⚙ AHU-4, 👤 Brent Hornilla' },
];

function TestBadge({ kind }: { kind: BadgeKind }) {
  const cls = kind === 'pass' ? 'badge b-pass' : kind === 'prog' ? 'badge b-prog' : 'badge b-none';
  const label = kind === 'pass' ? 'PASSED' : kind === 'prog' ? 'IN PROGRESS' : 'NOT STARTED';
  return <span className={cls}>{label}</span>;
}

function ProgressBar({ segments }: { segments: BarSeg[] }) {
  return (
    <div className="pbar-wrap">
      {segments.map((s, i) =>
        s.kind === 'gray' ? (
          <div key={i} className="pbar-gray" />
        ) : (
          <div key={i} className={s.kind === 'g' ? 'pbar-g' : 'pbar-r'} style={{ width: s.width }} />
        ),
      )}
    </div>
  );
}

export function CxAlloyApp({ className, style }: { className?: string; style?: CSSProperties }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [yn, setYn] = useState<'yes' | 'no' | 'na'>('yes');
  const [line2Checked, setLine2Checked] = useState(true);

  const selected = TEST_ITEMS[selectedIndex]!;

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = () => setDropdownOpen(false);
    const id = window.requestAnimationFrame(() => {
      document.addEventListener('click', close);
    });
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener('click', close);
    };
  }, [dropdownOpen]);

  const rightStatusBadge =
    selected.badge === 'pass' ? (
      <span className="r-badge rb-pass">PASSED</span>
    ) : selected.badge === 'prog' ? (
      <span className="r-badge" style={{ background: '#ff9500', color: '#fff' }}>
        IN PROGRESS
      </span>
    ) : (
      <span className="r-badge" style={{ background: '#8e8e93', color: '#fff' }}>
        NOT STARTED
      </span>
    );

  const ynSelStyle = (k: 'yes' | 'no' | 'na'): CSSProperties | undefined => {
    if (yn !== k) return undefined;
    if (k === 'yes') return { background: '#007aff', color: '#fff' };
    if (k === 'no') return { background: '#ff3b30', color: '#fff' };
    return { background: '#8e8e93', color: '#fff' };
  };

  return (
    <div data-cxalloy="" className={className} style={style}>
      <div className="wrap">
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '3px 16px',
            fontSize: 13,
            fontWeight: 600,
            zIndex: 10,
            borderBottom: '0.5px solid #e5e5ea',
          }}
        >
          <span>8:47 AM</span>
          <span style={{ color: '#8e8e93', fontSize: 12 }}>Mon Dec 5</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <svg width="16" height="12" viewBox="0 0 16 12">
              <path
                d="M8 2.5C10.2 2.5 12.2 3.4 13.6 4.9L15 3.5C13.2 1.6 10.7 0.5 8 0.5C5.3 0.5 2.8 1.6 1 3.5L2.4 4.9C3.8 3.4 5.8 2.5 8 2.5Z"
                fill="#000"
              />
              <path
                d="M8 5.5C9.4 5.5 10.7 6.1 11.6 7L13 5.6C11.7 4.3 10 3.5 8 3.5C6 3.5 4.3 4.3 3 5.6L4.4 7C5.3 6.1 6.6 5.5 8 5.5Z"
                fill="#000"
              />
              <circle cx="8" cy="10" r="1.5" fill="#000" />
            </svg>
            <span>100%</span>
            <svg width="25" height="12" viewBox="0 0 25 12">
              <rect x="0" y="1" width="22" height="10" rx="2" fill="none" stroke="#000" strokeWidth="1" />
              <rect x="1" y="2" width="20" height="8" rx="1.5" fill="#000" />
              <rect x="22.5" y="4" width="2" height="4" rx="1" fill="#000" />
            </svg>
          </span>
        </div>

        <div className="left" style={{ marginTop: 22 }}>
          <div className="left-nav">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer', width: 28 }}>
              <span style={{ display: 'block', height: 2, background: '#007aff', borderRadius: 1 }} />
              <span style={{ display: 'block', height: 2, background: '#007aff', borderRadius: 1 }} />
              <span style={{ display: 'block', height: 2, background: '#007aff', borderRadius: 1, width: '60%' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 200, color: '#007aff', cursor: 'pointer' }}>+</span>
              <span style={{ fontSize: 17, color: '#007aff', cursor: 'pointer' }}>Select</span>
            </div>
          </div>
          <div className="left-title">Tests</div>
          <div className="test-list">
            {TEST_ITEMS.map((t, i) => (
              <div
                key={t.num}
                role="button"
                tabIndex={0}
                className={`ti${i === selectedIndex ? ' sel' : ''}`}
                onClick={() => setSelectedIndex(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedIndex(i);
                  }
                }}
              >
                <div className="ti-top">
                  <TestBadge kind={t.badge} />
                  <ProgressBar segments={t.segments} />
                  <span className="ti-num">{t.num}</span>
                </div>
                <div className="ti-name">{t.name}</div>
                <div className="ti-meta">{t.meta}</div>
              </div>
            ))}
          </div>
          <div className="left-footer">
            <button type="button" style={{ fontSize: 19, background: 'none', border: 'none', color: '#007aff', cursor: 'pointer' }}>
              ☰
            </button>
            <button type="button" style={{ fontSize: 19, background: 'none', border: 'none', color: '#007aff', cursor: 'pointer' }}>
              {'\u2637'}
            </button>
            <span style={{ fontSize: 14, color: '#000', marginLeft: 'auto' }}>29 Tests</span>
          </div>
        </div>

        <div className="right" style={{ marginTop: 22 }}>
          <div className="right-nav">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007aff',
                  fontSize: 18,
                  cursor: 'pointer',
                  transform: 'rotate(135deg)',
                  display: 'inline-block',
                }}
              >
                →
              </button>
              <button type="button" style={{ background: 'none', border: 'none', color: '#8e8e93', fontSize: 17, cursor: 'pointer' }}>
                ⌃
              </button>
              <button type="button" style={{ background: 'none', border: 'none', color: '#007aff', fontSize: 17, cursor: 'pointer' }}>
                ⌄
              </button>
            </div>
            <div className="rn-title">{selected.name}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" style={{ background: 'none', border: 'none', color: '#007aff', fontSize: 20, cursor: 'pointer' }}>
                ☰
              </button>
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#007aff',
                  fontSize: 22,
                  cursor: 'pointer',
                  letterSpacing: 2,
                  lineHeight: 1,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen((v) => !v);
                }}
              >
                ⋮
              </button>
            </div>
          </div>

          <div className="right-body">
            <div className="r-status">
              {rightStatusBadge}
              <div className="r-prog">
                <div className="r-prog-fill" />
              </div>
            </div>
            <div className="r-field">
              <div className="r-field-label">ASSET</div>
              <div className="r-field-val">
                <span style={{ fontSize: 14 }}>⚙</span> {selected.name}
              </div>
            </div>
            <div className="r-field">
              <div className="r-field-label">NOTES</div>
            </div>
            <div className="r-field">
              <div className="r-field-label">ESTIMATED TIME</div>
            </div>

            <div style={{ padding: '10px 14px 0' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#007aff',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: 8,
                }}
              >
                ATTEMPTS
              </div>
              <div className="attempt-card">
                <div className="ac-toprow">
                  <div className="ac-prog">
                    <div className="ac-prog-fill" />
                  </div>
                  <span className="ac-dots">⋮</span>
                </div>
                <div className="ac-title">Attempt 1</div>
                <div>
                  <span className="ac-badge">PASSED</span>
                </div>
                <div className="ac-date" style={{ marginTop: 4 }}>
                  Set on 11/09/2021
                </div>
              </div>
            </div>

            <div className="coll-row" style={{ marginTop: 10 }}>
              <span className="coll-label">ISSUES</span>
              <span className="coll-count">0</span>
              <span className="coll-chev">&gt;</span>
            </div>
            <div className="coll-row">
              <span className="coll-label">FILES</span>
              <span className="coll-count">3</span>
              <span className="coll-chev">&gt;</span>
            </div>
            <div className="coll-row">
              <span className="coll-label">CALLOUTS</span>
              <span className="coll-count">0</span>
              <span className="coll-chev">&gt;</span>
            </div>
            <div className="coll-row">
              <span className="coll-label">SIGNATURE BLOCKS</span>
              <span className="coll-count">0 of 1</span>
              <span className="coll-chev">&gt;</span>
            </div>

            <div className="lines-hdr">
              <span className="lines-lbl">LINES</span>
              <span className="lines-count">285</span>
              <span className="lines-chev">⌃</span>
            </div>

            <div className="line-item">
              <div className="li-main-row">
                <span className="li-num">1</span>
                <div className="li-radio" />
                <div className="li-body">
                  <div className="li-label">FAN HP (SUPPLY AND/OR RETURN/EXHAUST)</div>
                  <div className="li-title">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ marginTop: 2, flexShrink: 0 }}>
                      <path
                        d="M7 9L10.5 5.5M10.5 5.5H8M10.5 5.5V8"
                        stroke="#8e8e93"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6.5 4H4a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V8.5"
                        stroke="#8e8e93"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>- SUBMITTED</span>
                  </div>
                  <button type="button" className="add-val-btn">
                    Add Value
                  </button>
                  <div className="li-attr-note">Line with a long attribute title</div>
                </div>
              </div>
              <div className="li-actions">
                <button type="button" className="pencil-btn">
                  ✎
                </button>
                <button type="button" className="li-act-btn">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="1" width="14" height="14" rx="2" stroke="#8e8e93" strokeWidth="1.4" />
                    <line x1="4" y1="5.5" x2="12" y2="5.5" stroke="#8e8e93" strokeWidth="1.2" />
                    <line x1="4" y1="8" x2="12" y2="8" stroke="#8e8e93" strokeWidth="1.2" />
                    <line x1="4" y1="10.5" x2="9" y2="10.5" stroke="#8e8e93" strokeWidth="1.2" />
                  </svg>
                  0
                </button>
                <button type="button" className="li-act-btn">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
                      stroke="#8e8e93"
                      strokeWidth="1.4"
                    />
                    <path d="M5 6h6M5 9h4" stroke="#8e8e93" strokeWidth="1.2" />
                  </svg>
                  0
                </button>
              </div>
            </div>

            <div className="line-item">
              <div className="li-main-row">
                <span className="li-num">2</span>
                <button
                  type="button"
                  className={line2Checked ? 'li-checkbox' : undefined}
                  onClick={() => setLine2Checked((c) => !c)}
                  aria-pressed={line2Checked}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 5,
                    flexShrink: 0,
                    marginTop: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    cursor: 'pointer',
                    background: line2Checked ? '#34c759' : '#fff',
                    boxSizing: 'border-box',
                    border: line2Checked ? 'none' : '1.5px solid #c7c7cc',
                  }}
                >
                  {line2Checked ? (
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                      <path
                        d="M1.5 5.5L5.5 9.5L12.5 1.5"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
                <div className="li-body">
                  <div className="li-label">VERIFY PRE-FUNCTIONAL CHECKLIST</div>
                  <div className="yn-wrap">
                    <button type="button" className="yn-btn" style={ynSelStyle('yes')} onClick={() => setYn('yes')}>
                      YES
                    </button>
                    <button type="button" className="yn-btn" style={ynSelStyle('no')} onClick={() => setYn('no')}>
                      NO
                    </button>
                    <button type="button" className="yn-btn" style={ynSelStyle('na')} onClick={() => setYn('na')}>
                      N/A
                    </button>
                  </div>
                  <div className="li-verify">Verify pre-functional checklist is complete for the air handler.</div>
                  <div className="li-yoo">Yoo</div>
                </div>
              </div>
              <div className="li-actions">
                <button type="button" className="pencil-btn">
                  ✎
                </button>
                <button type="button" className="li-act-btn">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="1" width="14" height="14" rx="2" stroke="#8e8e93" strokeWidth="1.4" />
                    <line x1="4" y1="5.5" x2="12" y2="5.5" stroke="#8e8e93" strokeWidth="1.2" />
                    <line x1="4" y1="8" x2="12" y2="8" stroke="#8e8e93" strokeWidth="1.2" />
                    <line x1="4" y1="10.5" x2="9" y2="10.5" stroke="#8e8e93" strokeWidth="1.2" />
                  </svg>
                  0
                </button>
                <button type="button" className="li-act-btn blue-btn">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
                      stroke="#007aff"
                      strokeWidth="1.4"
                    />
                    <path d="M5 6h6M5 9h4" stroke="#007aff" strokeWidth="1.2" />
                  </svg>
                  3
                </button>
              </div>
            </div>

            <div className="setpoint-row">
              <span className="setpoint-lbl">SETPOINT VERIFICATION</span>
              <span style={{ fontSize: 14, color: '#8e8e93' }}>⌃</span>
            </div>
          </div>

          <div className="btoolbar">
            <button type="button" className="tb-btn">
              <svg width="24" height="22" viewBox="0 0 24 22" fill="none">
                <path
                  d="M9 3H15L16.5 5H21C21.6 5 22 5.4 22 6V19C22 19.6 21.6 20 21 20H3C2.4 20 2 19.6 2 19V6C2 5.4 2.4 5 3 5H7.5L9 3Z"
                  stroke="#8e8e93"
                  strokeWidth="1.5"
                />
                <circle cx="12" cy="12" r="4" stroke="#8e8e93" strokeWidth="1.5" />
              </svg>
              <span className="tb-lbl">PHOTO</span>
            </button>
            <button type="button" className="tb-btn">
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
                <circle cx="10" cy="7" r="4" stroke="#8e8e93" strokeWidth="1.5" />
                <path d="M2 21C2 17.1 5.6 14 10 14C14.4 14 18 17.1 18 21" stroke="#8e8e93" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="tb-lbl">ASSIGN</span>
            </button>
            <button type="button" className="tb-btn">
              <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
                <circle cx="9" cy="10" r="7.5" stroke="#8e8e93" strokeWidth="1.5" />
                <circle cx="19" cy="10" r="7.5" stroke="#8e8e93" strokeWidth="1.5" />
              </svg>
              <span className="tb-lbl">STATUS</span>
            </button>
          </div>

          <div className="dropdown" style={{ display: dropdownOpen ? 'block' : 'none' }}>
            <div className="dd-item">
              <span>Jump to Line</span>
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                <line x1="2" y1="3" x2="18" y2="3" stroke="#3a3a3c" strokeWidth="1.5" />
                <line x1="2" y1="8" x2="18" y2="8" stroke="#3a3a3c" strokeWidth="1.5" />
                <line x1="2" y1="13" x2="13" y2="13" stroke="#3a3a3c" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="dd-item">
              <span>Jump To Header</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                  <line x1="2" y1="3" x2="18" y2="3" stroke="#3a3a3c" strokeWidth="1.5" />
                  <line x1="2" y1="8" x2="18" y2="8" stroke="#3a3a3c" strokeWidth="1.5" />
                  <line x1="2" y1="13" x2="13" y2="13" stroke="#3a3a3c" strokeWidth="1.5" />
                </svg>
                <span className="dd-chev">&gt;</span>
              </div>
            </div>
            <div className="dd-item">
              <span>Expand Headers</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 3V15M9 3L5 7M9 3L13 7M9 15L5 11M9 15L13 11" stroke="#3a3a3c" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="dd-item">
              <span>Collapse Headers</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M5 4L9 8L13 4M5 14L9 10L13 14" stroke="#3a3a3c" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="dd-item">
              <span>Filter Lines</span>
              <svg width="18" height="16" viewBox="0 0 18 16" fill="none">
                <line x1="2" y1="4" x2="16" y2="4" stroke="#3a3a3c" strokeWidth="1.5" />
                <line x1="4" y1="8" x2="14" y2="8" stroke="#3a3a3c" strokeWidth="1.5" />
                <line x1="6" y1="12" x2="12" y2="12" stroke="#3a3a3c" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="dd-item dd-disabled">
              <span>Clear Filters</span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7.5" stroke="#d1d1d6" strokeWidth="1.2" />
                <line x1="6" y1="6" x2="12" y2="12" stroke="#d1d1d6" strokeWidth="1.5" />
                <line x1="12" y1="6" x2="6" y2="12" stroke="#d1d1d6" strokeWidth="1.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
