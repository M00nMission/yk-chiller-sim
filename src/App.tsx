import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useState, useRef, useEffect, useLayoutEffect, type MutableRefObject } from 'react';
import { useGLTF, Text, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Scene, CHILLER_ORBIT_TARGET, DEFAULT_SIM_CAMERA_POSITION } from './components/canvas/Scene';
import { InspectRaycaster } from './components/canvas/InspectRaycaster';
import { CxAlloyWidget, CxAlloyHtmlMaximized } from './components/ui/CxAlloyPanel';
import { ControlPanelUI } from './components/ui/ControlPanelUI';

function EngineRoom({
  onHmiZoom,
  hmiLookAtRef,
}: {
  onHmiZoom: () => void;
  hmiLookAtRef: MutableRefObject<THREE.Vector3>;
}) {
  /* Chiller_R2.glb heat exchanger shells: two parallel barrels along ±Z; centers x≈0 and −2.09 */
  const CHW_X_SUPPLY = -2.09;
  const CHW_X_RETURN = 0;
  const CHW_Z_SUPPLY = -4.82;
  const CHW_Z_RETURN = -4.62;
  const CHW_Y_FLANGE = 2.42;
  const CW_X_SUPPLY = 0.33;
  const CW_X_RETURN = -2.05;
  const CW_Z_SUPPLY = 4.78;
  const CW_Z_RETURN = 4.58;
  const CW_TOWER_Z = (CW_Z_SUPPLY + CW_Z_RETURN) / 2;
  /** Toward compressor / motor end of shells (between barrel −Z head and machine center) */
  const CHW_STUB_Z_IN = -2.0;
  const CW_STUB_Z_IN = 2.15;

  return (
    <group>
      {/* ─── CONCRETE FLOOR SLAB ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#9a958e" roughness={0.97} metalness={0.01} />
      </mesh>

      {/* Slab section marks */}
      {[[-30, -30], [-30, 0], [-30, 30], [0, -30], [0, 0], [0, 30], [30, -30], [30, 0], [30, 30]].map(([x, z], i) => (
        <mesh key={`slab-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.03, z]}>
          <planeGeometry args={[59.9, 59.9]} />
          <meshStandardMaterial color="#8c8780" roughness={0.98} metalness={0.01} />
        </mesh>
      ))}

      {/* ─── CEILING BEAMS ─── */}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <mesh key={`beam-${i}`} position={[x, 12, 0]}>
          <boxGeometry args={[0.5, 1.0, 80]} />
          <meshStandardMaterial color="#4a4a48" roughness={0.6} metalness={0.7} />
        </mesh>
      ))}
      {[-30, -15, 0, 15, 30].map((z, i) => (
        <mesh key={`xbeam-${i}`} position={[0, 12, z]}>
          <boxGeometry args={[80, 0.4, 0.4]} />
          <meshStandardMaterial color="#555553" roughness={0.6} metalness={0.7} />
        </mesh>
      ))}

      {/* ─── HANGING LIGHT FIXTURES ─── */}
      {[-20, -10, 0, 10, 20].map((x, xi) =>
        [-30, -15, 0, 15, 30].map((z, zi) => (
          <group key={`light-${xi}-${zi}`} position={[x, 11.5, z]}>
            <mesh>
              <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
              <meshStandardMaterial color="#333" roughness={0.8} metalness={0.6} />
            </mesh>
            <mesh position={[0, -0.45, 0]}>
              <boxGeometry args={[1.6, 0.12, 0.4]} />
              <meshStandardMaterial color="#555" roughness={0.5} metalness={0.7} />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <boxGeometry args={[1.4, 0.05, 0.25]} />
              <meshStandardMaterial color="#fff8e0" emissive="#ffeecc" emissiveIntensity={2.5} />
            </mesh>
          </group>
        ))
      )}

      {/* ─── WALLS ─── */}
      {/* Back wall */}
      <mesh position={[0, 6, -35]}>
        <boxGeometry args={[80, 12, 0.5]} />
        <meshStandardMaterial color="#7a7570" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Left wall */}
      <mesh position={[-35, 6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[80, 12, 0.5]} />
        <meshStandardMaterial color="#7a7570" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Right wall */}
      <mesh position={[35, 6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[80, 12, 0.5]} />
        <meshStandardMaterial color="#7a7570" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* ─── PIPES ON BACK WALL ─── */}
      <mesh position={[0, 10, -34.5]}>
        <cylinderGeometry args={[0.2, 0.2, 70, 12]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 8, -34.5]}>
        <cylinderGeometry args={[0.15, 0.15, 70, 12]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 6, -34.5]}>
        <cylinderGeometry args={[0.25, 0.25, 70, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[0, 3.5, -34.5]}>
        <cylinderGeometry args={[0.12, 0.12, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.5, -34.5]}>
        <cylinderGeometry args={[0.1, 0.1, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Vertical pipe drops on back wall */}
      {[-25, -15, -5, 5, 15, 25].map((x, i) => (
        <mesh key={`vdrop-${i}`} position={[x, 6, -34.5]}>
          <cylinderGeometry args={[0.06, 0.06, 8, 8]} />
          <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* Pipe flanges on back wall */}
      {[-20, 0, 20].map((x, i) => (
        <group key={`flng-${i}`} position={[x, 8, -34.5]}>
          <mesh>
            <cylinderGeometry args={[0.22, 0.22, 0.1, 12]} />
            <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
          </mesh>
          <mesh position={[0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
            <meshStandardMaterial color="#999" roughness={0.3} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ─── PIPES ON LEFT WALL ─── */}
      <mesh position={[-34.5, 9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[-34.5, 6.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 70, 10]} />
        <meshStandardMaterial color="#b07030" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[-34.5, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 70, 12]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[-34.5, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* ─── PIPES ON RIGHT WALL ─── */}
      <mesh position={[34.5, 9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[34.5, 6.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 70, 10]} />
        <meshStandardMaterial color="#b07030" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[34.5, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 70, 12]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[34.5, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 70, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* ─── CEILING PIPE RUNS ─── */}
      {[[-25, 11, 0], [0, 11, 0], [25, 11, 0]].map(([x, y, z], i) => (
        <mesh key={`cpr-${i}`} position={[x, y, z]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 60, 8]} />
          <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* Pipe hangers */}
      {[-20, -10, 0, 10, 20].map((x, i) => (
        <group key={`ph-${i}`} position={[x, 10, -20]}>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 2, 5]} />
            <meshStandardMaterial color="#555" roughness={0.7} metalness={0.7} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.08, 0.06, 0.08]} />
            <meshStandardMaterial color="#666" roughness={0.6} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ─── SUPPORT COLUMNS ─── */}
      {[[-25, -25], [-25, 25], [25, -25], [25, 25]].map(([x, z], i) => (
        <group key={`col-${i}`} position={[x, 0, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.8, 12, 0.8]} />
            <meshStandardMaterial color="#6a6a68" roughness={0.7} metalness={0.5} />
          </mesh>
          {/* Column base plate */}
          <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[1.2, 1.2, 0.1]} />
            <meshStandardMaterial color="#4a4a48" roughness={0.7} metalness={0.6} />
          </mesh>
          {/* Column cap */}
          <mesh position={[0, 6.1, 0]}>
            <boxGeometry args={[0.9, 0.2, 0.9]} />
            <meshStandardMaterial color="#555" roughness={0.5} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ─── WATER PUMPS ─── */}
      {/* Pump 1 — left front */}
      <group position={[-22, 0, -22]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.0, 1.0, 2.5, 20]} />
          <meshStandardMaterial color="#5a5a58" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 1.6, 16]} />
          <meshStandardMaterial color="#4a6a4a" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.7, 0]}>
          <boxGeometry args={[2.2, 0.35, 2.2]} />
          <meshStandardMaterial color="#444" roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh position={[0, 3.0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.7, 16]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>

      {/* Pump 2 — left rear */}
      <group position={[-22, 0, 22]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.9, 0.9, 2.2, 20]} />
          <meshStandardMaterial color="#5a5a58" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.4, 0]} castShadow>
          <cylinderGeometry args={[0.65, 0.65, 1.4, 16]} />
          <meshStandardMaterial color="#4a6a4a" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.6, 0]}>
          <boxGeometry args={[2.0, 0.3, 2.0]} />
          <meshStandardMaterial color="#444" roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh position={[0, 2.7, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.6, 16]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>

      {/* ─── WATER TANKS ─── */}
      {/* Vertical tank — right rear */}
      <group position={[22, 0, -22]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.4, 1.4, 5.5, 20]} />
          <meshStandardMaterial color="#5a5a58" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[1.5, 1.2, 0.8, 20]} />
          <meshStandardMaterial color="#4a4a48" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, -3.1, 0]}>
          <cylinderGeometry args={[1.5, 1.4, 0.6, 20]} />
          <meshStandardMaterial color="#4a4a48" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Legs */}
        {[0, Math.PI/2, Math.PI, 3*Math.PI/2].map((a, li) => (
          <mesh key={`leg-${li}`} position={[Math.cos(a)*1.6, -4.2, Math.sin(a)*1.6]}>
            <cylinderGeometry args={[0.08, 0.08, 1.8, 8]} />
            <meshStandardMaterial color="#555" roughness={0.6} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Horizontal bladder tank — right front */}
      <group position={[22, 0, 22]}>
        <mesh castShadow receiveShadow rotation={[0, Math.PI/2, 0]}>
          <cylinderGeometry args={[1.1, 1.1, 3.5, 20]} />
          <meshStandardMaterial color="#6a6a68" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0, 2.1]} rotation={[0, Math.PI/2, 0]}>
          <cylinderGeometry args={[1.15, 1.15, 0.1, 20]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0, -2.1]} rotation={[0, Math.PI/2, 0]}>
          <cylinderGeometry args={[1.15, 1.15, 0.1, 20]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Saddle supports */}
        <mesh position={[0, -1.4, 0.8]}>
          <boxGeometry args={[0.3, 2.0, 0.3]} />
          <meshStandardMaterial color="#555" roughness={0.6} metalness={0.6} />
        </mesh>
        <mesh position={[0, -1.4, -0.8]}>
          <boxGeometry args={[0.3, 2.0, 0.3]} />
          <meshStandardMaterial color="#555" roughness={0.6} metalness={0.6} />
        </mesh>
      </group>

      {/* ─── DUCTWORK ─── */}
      {/* Main supply duct */}
      <mesh position={[0, 11.5, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.8, 0.8, 70, 12]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Branch ducts */}
      <mesh position={[0, 10.5, 20]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 35, 10]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh position={[0, 10.5, -20]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 35, 10]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Duct reducers */}
      <mesh position={[0, 11.0, 20]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.8, 1.0, 10]} />
        <meshStandardMaterial color="#999999" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* ─── CABLE TRAY ─── */}
      <mesh position={[0, 11, -28]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[0.6, 0.1, 70]} />
        <meshStandardMaterial color="#4a8a4a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 11, 28]} rotation={[0, Math.PI/2, 0]}>
        <boxGeometry args={[0.6, 0.1, 70]} />
        <meshStandardMaterial color="#4a8a4a" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Cable tray vertical drops */}
      {[-25, -15, -5, 5, 15, 25].map((x, i) => (
        <mesh key={`ctv-${i}`} position={[x, 9, -28]}>
          <boxGeometry args={[0.12, 4, 0.08]} />
          <meshStandardMaterial color="#4a8a4a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* ─── ELECTRIC CABINETS ─── */}
      <group position={[22, 0, 8]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.5, 2.8, 0.9]} />
          <meshStandardMaterial color="#3a3a38" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.47]}>
          <planeGeometry args={[1.2, 2.4]} />
          <meshStandardMaterial color="#2a2a28" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0.5, 0, 0.5]}>
          <boxGeometry args={[0.08, 0.5, 0.06]} />
          <meshStandardMaterial color="#888" roughness={0.3} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.5, 0.48]}>
          <planeGeometry args={[0.8, 0.5]} />
          <meshStandardMaterial color="#001100" emissive="#003300" emissiveIntensity={0.8} />
        </mesh>
        {[[-0.3, 0.3], [0.3, 0.3], [-0.3, 0], [0.3, 0], [-0.3, -0.3], [0.3, -0.3]].map(([x, y], ci) => (
          <mesh key={`cled-${ci}`} position={[x, y, 0.5]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#00ff00" emissive="#00cc00" emissiveIntensity={1.2} />
          </mesh>
        ))}
      </group>

      {/* ─── CONTROL PANEL ─── */}
      <group position={[-28, 0, 0]} rotation={[0, Math.PI/2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[5, 3, 0.15]} />
          <meshStandardMaterial color="#2a2a28" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.4, 0.1]}>
          <planeGeometry args={[3.2, 1.6]} />
          <meshStandardMaterial color="#001400" emissive="#002800" emissiveIntensity={0.6} />
        </mesh>
        {Array.from({ length: 16 }).map((_, i) => (
          <mesh key={`led-${i}`} position={[-2 + (i % 4) * 1.3, 0.8 - Math.floor(i/4) * 0.35, 0.1]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? '#ff3333' : i % 3 === 1 ? '#ffaa22' : '#33ff66'}
              emissive={i % 3 === 0 ? '#ff0000' : i % 3 === 1 ? '#ff8800' : '#00cc44'}
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
        <mesh position={[-1.5, -0.9, 0.1]}>
          <planeGeometry args={[1.2, 0.8]} />
          <meshStandardMaterial color="#222" roughness={0.6} />
        </mesh>
        {[[-1.2, -1.0], [-1.2, -0.75], [-1.2, -0.5], [0, -1.0], [0, -0.75], [0, -0.5]].map(([x, y], bi) => (
          <mesh key={`key-${bi}`} position={[x, y, 0.12]}>
            <boxGeometry args={[0.18, 0.12, 0.05]} />
            <meshStandardMaterial color="#444" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/* ─── INSTRUMENT PANEL ─── */}
      <group position={[15, 0, -34]}>
        <mesh castShadow>
          <boxGeometry args={[1.0, 1.8, 0.4]} />
          <meshStandardMaterial color="#2a2a28" roughness={0.5} metalness={0.4} />
        </mesh>
        {[0, 0.6, 1.2].map((y, gi) => (
          <group key={`g-${gi}`} position={[0, y - 0.4, 0.22]}>
            <mesh>
              <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
              <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
            </mesh>
            <mesh>
              <circleGeometry args={[0.12, 16]} />
              <meshStandardMaterial color="#f0ede6" roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI/3]}>
              <coneGeometry args={[0.015, 0.12, 4]} />
              <meshStandardMaterial color="#cc0000" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─── FIRE SAFETY ─── */}
      {/* Fire extinguisher 1 */}
      <group position={[8, 0, -30]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.85, 10]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.12, 0.08, 0.2, 8]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
      {/* Fire extinguisher 2 */}
      <group position={[-8, 0, -30]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 0.85, 10]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.12, 0.08, 0.2, 8]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>

      {/* Fire alarm panel */}
      <group position={[-33, 4, 10]} rotation={[0, Math.PI/2, 0]}>
        <mesh>
          <boxGeometry args={[0.8, 1.0, 0.1]} />
          <meshStandardMaterial color="#333" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[0.6, 0.8]} />
          <meshStandardMaterial color="#220000" emissive="#440000" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.35, 0.06]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2.0} />
        </mesh>
      </group>

      {/* ─── SPRINKLER SYSTEM ─── */}
      <mesh position={[0, 11.8, 0]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.06, 0.06, 70, 6]} />
        <meshStandardMaterial color="#cc3333" roughness={0.5} metalness={0.6} />
      </mesh>
      {[[-20, -15], [-10, -15], [0, -15], [10, -15], [20, -15],
        [-20, 0], [-10, 0], [0, 0], [10, 0], [20, 0],
        [-20, 15], [-10, 15], [0, 15], [10, 15], [20, 15]].map(([x, z], i) => (
        <group key={`spr-${i}`} position={[x, 11.3, z]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
            <meshStandardMaterial color="#cc3333" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, -0.4, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.12, 8]} />
            <meshStandardMaterial color="#dd4444" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ─── CONDUIT ON WALLS ─── */}
      <mesh position={[-33.5, 5, -15]} rotation={[0, Math.PI/2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 40, 6]} />
        <meshStandardMaterial color="#555" roughness={0.7} metalness={0.5} />
      </mesh>
      <mesh position={[-33.5, 7, 5]} rotation={[0, Math.PI/2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 40, 6]} />
        <meshStandardMaterial color="#555" roughness={0.7} metalness={0.5} />
      </mesh>

      {/* ─── FLOOR DRAINS ─── */}
      {[[-15, -15], [-15, 15], [15, -15], [15, 15]].map(([x, z], i) => (
        <group key={`drain-${i}`} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.25, 0.4, 12]} />
            <meshStandardMaterial color="#3a3a38" roughness={0.95} metalness={0.3} />
          </mesh>
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.01, 0]}>
            <circleGeometry args={[0.25, 12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ─── SAFETY SHOWER ─── */}
      <group position={[10, 0, 30]}>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <planeGeometry args={[2.0, 2.0]} />
          <meshStandardMaterial color="#2a2a28" roughness={0.95} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[0.2, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 2.5, 8]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 2.1, 0]} rotation={[Math.PI, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.06, 0.2, 10]} />
          <meshStandardMaterial color="#888" roughness={0.3} metalness={0.9} />
        </mesh>
      </group>

      {/* ─── PIPE IDENTIFICATION BANDS ─── */}
      {[[-25, 10, -34.5], [0, 6, -34.5], [25, 8, -34.5]].map(([x, y, z], i) => (
        <mesh key={`band-${i}`} position={[x, y, z]} rotation={[0, Math.PI/2, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.04, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}

      {/* ─── CHILLER ANCHOR BOLTS ─── */}
      {[[-2.5, -3], [-2.5, 3], [2.5, -3], [2.5, 3]].map(([x, z], i) => (
        <group key={`bolt-${i}`} position={[x, 0, z]}>
          <mesh rotation={[-Math.PI/2, 0, 0]}>
            <circleGeometry args={[0.12, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[0.05, 0.1, 8]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ─── WALL CLOCK ─── */}
      <group position={[33, 10, -10]} rotation={[0, Math.PI/2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.06, 24]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[0.32, 24]} />
          <meshStandardMaterial color="#f0ede6" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <boxGeometry args={[0.03, 0.22, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, Math.PI/3]}>
          <boxGeometry args={[0.025, 0.16, 0.02]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
      </group>

      {/* ─── WARNING SIGNS ─── */}
      {[[-33, 7, -20], [33, 7, -20], [0, 7, -33.5]].map(([x, y, z], i) => (
        <group key={`sign-${i}`} position={[x, y, z]} rotation={[0, i === 0 ? Math.PI/2 : i === 1 ? -Math.PI/2 : 0, 0]}>
          <mesh>
            <boxGeometry args={[0.6, 0.4, 0.03]} />
            <meshStandardMaterial color="#c8a830" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[0.5, 0.3]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        </group>
      ))}


      {/* ═══════════════════════════════════════════════
          CHILLED WATER & CONDENSER WATER PIPING
      ═══════════════════════════════════════════════ */}

      {/* ── CHILLED WATER SUPPLY (CHWS) — Blue — aligned to −X barrel head at z≈−4.76 ── */}
      {/* Horizontal run from chiller to left wall */}
      <mesh position={[0, 0.8, CHW_Z_SUPPLY]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.35, 0.35, 60, 12]} />
        <meshStandardMaterial color="#3a6fa8" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Insulation — blue closed-cell foam jacket */}
      <mesh position={[0, 0.8, CHW_Z_SUPPLY]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.44, 0.44, 16, 12]} />
        <meshStandardMaterial color="#2255aa" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Pipe label marker */}
      <mesh position={[-15, 1.28, CHW_Z_SUPPLY]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.8, 12]} />
        <meshStandardMaterial color="#1144aa" roughness={0.8} />
      </mesh>
      {/* Vertical drop near chiller */}
      <mesh position={[CHW_X_SUPPLY, 1.4, CHW_Z_SUPPLY]}>
        <cylinderGeometry args={[0.35, 0.35, 2.0, 12]} />
        <meshStandardMaterial color="#3a6fa8" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Vertical insulation */}
      <mesh position={[CHW_X_SUPPLY, 1.4, CHW_Z_SUPPLY]}>
        <cylinderGeometry args={[0.44, 0.44, 2.0, 12]} />
        <meshStandardMaterial color="#2255aa" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Flange at chiller connection */}
      <mesh position={[CHW_X_SUPPLY, CHW_Y_FLANGE, CHW_Z_SUPPLY]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      {/* Flange at wall penetration */}
      <mesh position={[-30, 0.8, CHW_Z_SUPPLY]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 12]} />
        <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Gate valve on supply line */}
      <group position={[-20, 0.8, CHW_Z_SUPPLY]} rotation={[0, 0, Math.PI/2]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.15, 12]} />
          <meshStandardMaterial color="#3a6fa8" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.52, 0.52, 0.08, 12]} />
          <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
        </mesh>
        {/* Handwheel */}
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.2, 0.025, 8, 20]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.25, 0.2]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>

      {/* ── CHILLED WATER RETURN (CHWR) — Red — aligned to center barrel head ── */}
      <mesh position={[0, 0.8, CHW_Z_RETURN]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.35, 0.35, 62, 12]} />
        <meshStandardMaterial color="#c04040" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Insulation — red closed-cell foam jacket */}
      <mesh position={[0, 0.8, CHW_Z_RETURN]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.44, 0.44, 16, 12]} />
        <meshStandardMaterial color="#aa2020" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Pipe label marker */}
      <mesh position={[-15, 1.28, CHW_Z_RETURN]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.8, 12]} />
        <meshStandardMaterial color="#aa2020" roughness={0.8} />
      </mesh>
      {/* Vertical drop near chiller */}
      <mesh position={[CHW_X_RETURN, 1.4, CHW_Z_RETURN]}>
        <cylinderGeometry args={[0.35, 0.35, 2.0, 12]} />
        <meshStandardMaterial color="#c04040" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Vertical insulation */}
      <mesh position={[CHW_X_RETURN, 1.4, CHW_Z_RETURN]}>
        <cylinderGeometry args={[0.44, 0.44, 2.0, 12]} />
        <meshStandardMaterial color="#aa2020" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Flange at chiller connection */}
      <mesh position={[CHW_X_RETURN, CHW_Y_FLANGE, CHW_Z_RETURN]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      {/* Flange at wall */}
      <mesh position={[-30, 0.8, CHW_Z_RETURN]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 12]} />
        <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Gate valve on return line */}
      <group position={[-20, 0.8, CHW_Z_RETURN]} rotation={[0, 0, Math.PI/2]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.35, 0.15, 12]} />
          <meshStandardMaterial color="#c04040" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.52, 0.52, 0.08, 12]} />
          <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
        </mesh>
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.2, 0.025, 8, 20]} />
          <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.25, 0.2]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>

      {/* ─── ROOFTOP DECK (above machine room walls, y≈12) ─── */}
      <group position={[0, 12.05, 0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[72, 0.38, 72]} />
          <meshStandardMaterial color="#8c8880" roughness={0.92} metalness={0.04} />
        </mesh>
        {/* Parapet */}
        <mesh position={[0, 0.32, -36.1]}>
          <boxGeometry args={[74, 0.65, 0.35]} />
          <meshStandardMaterial color="#6a6862" roughness={0.9} metalness={0.06} />
        </mesh>
        <mesh position={[0, 0.32, 36.1]}>
          <boxGeometry args={[74, 0.65, 0.35]} />
          <meshStandardMaterial color="#6a6862" roughness={0.9} metalness={0.06} />
        </mesh>
        <mesh position={[-36.1, 0.32, 0]}>
          <boxGeometry args={[0.35, 0.65, 74]} />
          <meshStandardMaterial color="#6a6862" roughness={0.9} metalness={0.06} />
        </mesh>
        <mesh position={[36.1, 0.32, 0]}>
          <boxGeometry args={[0.35, 0.65, 74]} />
          <meshStandardMaterial color="#6a6862" roughness={0.9} metalness={0.06} />
        </mesh>
        {/* Roof curb around tower footprint */}
        <mesh position={[25, 0.28, CW_TOWER_Z]}>
          <boxGeometry args={[5.2, 0.45, 5.2]} />
          <meshStandardMaterial color="#5a5854" roughness={0.88} metalness={0.08} />
        </mesh>
        <mesh position={[25, 0.32, CW_TOWER_Z]}>
          <boxGeometry args={[4.4, 0.35, 4.4]} />
          <meshStandardMaterial color="#7a7670" roughness={0.9} metalness={0.05} />
        </mesh>
      </group>
      {/* Roof penetrations (sleeves) */}
      <mesh position={[CW_X_SUPPLY, 12.02, CW_Z_SUPPLY]}>
        <cylinderGeometry args={[0.48, 0.52, 0.45, 12]} />
        <meshStandardMaterial color="#555" roughness={0.65} metalness={0.5} />
      </mesh>
      <mesh position={[CW_X_RETURN, 12.02, CW_Z_RETURN]}>
        <cylinderGeometry args={[0.48, 0.52, 0.45, 12]} />
        <meshStandardMaterial color="#555" roughness={0.65} metalness={0.5} />
      </mesh>

      {/* ── COOLING TOWER (rooftop) — basin bottom flush with deck top y≈12.24 ── */}
      <group position={[25, 14.68, CW_TOWER_Z]}>
        {/* Concrete housekeeping pad */}
        <mesh position={[0, -2.52, 0]} receiveShadow>
          <boxGeometry args={[4.2, 0.22, 4.2]} />
          <meshStandardMaterial color="#9a958e" roughness={0.95} metalness={0.02} />
        </mesh>
        {/* Guardrail around pad */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a, gi) => (
          <group key={`ct-rail-${gi}`} position={[Math.cos(a) * 2.15, -2.35, Math.sin(a) * 2.15]} rotation={[0, a, 0]}>
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[1.2, 0.08, 0.08]} />
              <meshStandardMaterial color="#c8a030" roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.7, 0]}>
              <boxGeometry args={[1.2, 0.06, 0.06]} />
              <meshStandardMaterial color="#c8a030" roughness={0.5} metalness={0.4} />
            </mesh>
            <mesh position={[-0.55, 0.35, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.75, 6]} />
              <meshStandardMaterial color="#b8a028" roughness={0.45} metalness={0.5} />
            </mesh>
            <mesh position={[0.55, 0.35, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.75, 6]} />
              <meshStandardMaterial color="#b8a028" roughness={0.45} metalness={0.5} />
            </mesh>
          </group>
        ))}
        {/* Main tower shell — galvanized steel */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.8, 1.6, 5, 16]} />
          <meshStandardMaterial color="#707070" roughness={0.6} metalness={0.8} />
        </mesh>
        {/* Louvered air inlet band */}
        <mesh position={[0, -1.35, 0]}>
          <cylinderGeometry args={[1.82, 1.78, 1.1, 20]} />
          <meshStandardMaterial color="#4a4a48" roughness={0.75} metalness={0.35} />
        </mesh>
        {/* Tower top cap / fan ring */}
        <mesh position={[0, 2.6, 0]}>
          <cylinderGeometry args={[1.9, 1.8, 0.3, 16]} />
          <meshStandardMaterial color="#505050" roughness={0.5} metalness={0.9} />
        </mesh>
        {/* Fan motor housing */}
        <mesh position={[0, 2.9, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.6, 12]} />
          <meshStandardMaterial color="#404040" roughness={0.4} metalness={0.8} />
        </mesh>
        {/* Fan blades */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a, i) => (
          <mesh key={`blade-${i}`} position={[Math.cos(a) * 0.7, 2.9, Math.sin(a) * 0.7]} rotation={[0, a, 0]}>
            <boxGeometry args={[1.2, 0.08, 0.25]} />
            <meshStandardMaterial color="#888888" roughness={0.4} metalness={0.9} />
          </mesh>
        ))}
        {/* Distribution basin at top — water enters here */}
        <mesh position={[0, 2.2, 0]}>
          <cylinderGeometry args={[1.6, 1.7, 0.4, 16]} />
          <meshStandardMaterial color="#606060" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Basin distribution holes / nozzles */}
        {[[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8], [0.5, 0.5], [-0.5, -0.5]].map(([dx, dz], ni) => (
          <mesh key={`nozzle-${ni}`} position={[dx, 2.0, dz]}>
            <cylinderGeometry args={[0.06, 0.06, 0.3, 6]} />
            <meshStandardMaterial color="#888" roughness={0.3} metalness={0.9} />
          </mesh>
        ))}
        {/* Fill media section — structured packing inside */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[1.55, 1.55, 3.2, 16]} />
          <meshStandardMaterial color="#3a5a3a" roughness={0.9} metalness={0.1} transparent opacity={0.7} />
        </mesh>
        {/* Cold water basin at bottom */}
        <mesh position={[0, -2.2, 0]}>
          <cylinderGeometry args={[1.7, 1.6, 0.5, 16]} />
          <meshStandardMaterial color="#505050" roughness={0.6} metalness={0.7} />
        </mesh>
        {/* Basin screen / drift eliminator */}
        <mesh position={[0, -1.8, 0]}>
          <cylinderGeometry args={[1.55, 1.55, 0.15, 16]} />
          <meshStandardMaterial color="#4a6a4a" roughness={0.9} metalness={0.2} />
        </mesh>
        {/* Tower leg supports — bearing on pad */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a, li) => (
          <mesh key={`tower-leg-${li}`} position={[Math.cos(a) * 1.4, -2.6, Math.sin(a) * 1.4]}>
            <cylinderGeometry args={[0.1, 0.12, 0.35, 8]} />
            <meshStandardMaterial color="#555" roughness={0.5} metalness={0.8} />
          </mesh>
        ))}
        {/* Ladder access */}
        <mesh position={[-1.9, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 6, 6]} />
          <meshStandardMaterial color="#666" roughness={0.6} metalness={0.7} />
        </mesh>
        {[0.5, 1.5, 2.5, 3.5, 4.5].map((yoff, ri) => (
          <mesh key={`rung-${ri}`} position={[-1.9, yoff - 2.6, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
            <meshStandardMaterial color="#777" roughness={0.5} metalness={0.8} />
          </mesh>
        ))}
        {/* Tower label */}
        <Text position={[0, 3.4, 0]} fontSize={0.35} color="#ffffff" anchorX="center" anchorY="middle">
          COOLING TOWER
        </Text>
      </group>

      {/* ── CDWS: Condenser Water Supply — riser from +Z barrel nozzle line (x≈0.33) ── */}
      <mesh position={[CW_X_SUPPLY, 7.14, CW_Z_SUPPLY]}>
        <cylinderGeometry args={[0.3, 0.3, 10.48, 12]} />
        <meshStandardMaterial color="#3a8a5a" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[CW_X_SUPPLY, 7.14, CW_Z_SUPPLY]}>
        <cylinderGeometry args={[0.42, 0.42, 8.2, 12]} />
        <meshStandardMaterial color="#226644" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      <mesh position={[CW_X_SUPPLY, 12.38, CW_Z_SUPPLY]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.08, 8, 12, Math.PI / 2]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      <mesh position={[11.915, 12.38, CW_Z_SUPPLY]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 23.17, 12]} />
        <meshStandardMaterial color="#3a8a5a" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[11.915, 12.38, CW_Z_SUPPLY]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 16, 12]} />
        <meshStandardMaterial color="#226644" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      <mesh position={[23.5, 14.63, CW_Z_SUPPLY]}>
        <cylinderGeometry args={[0.3, 0.3, 4.5, 12]} />
        <meshStandardMaterial color="#3a8a5a" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[23.5, 12.38, CW_Z_SUPPLY]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.08, 8, 12, Math.PI / 2]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      <mesh position={[CW_X_SUPPLY, 1.9, CW_Z_SUPPLY]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.1, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      <mesh position={[23.5, 12.38, CW_Z_SUPPLY]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.44, 0.44, 0.12, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      <Text position={[8, 13.05, CW_Z_SUPPLY]} fontSize={0.22} color="#226644" anchorX="center" anchorY="bottom" rotation={[0, 0, Math.PI / 2]}>
        CDWS
      </Text>

      {/* ── CDWR: Condenser Water Return — offset barrel centerline (x≈−2.05) ── */}
      <mesh position={[CW_X_RETURN, 7.14, CW_Z_RETURN]}>
        <cylinderGeometry args={[0.3, 0.3, 10.48, 12]} />
        <meshStandardMaterial color="#8a6040" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[CW_X_RETURN, 7.14, CW_Z_RETURN]}>
        <cylinderGeometry args={[0.42, 0.42, 8.2, 12]} />
        <meshStandardMaterial color="#6a4422" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      <mesh position={[CW_X_RETURN, 12.38, CW_Z_RETURN]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.08, 8, 12, Math.PI / 2]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      <mesh position={[10.725, 12.32, CW_Z_RETURN]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 25.55, 12]} />
        <meshStandardMaterial color="#8a6040" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[10.725, 12.32, CW_Z_RETURN]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.42, 0.42, 17, 12]} />
        <meshStandardMaterial color="#6a4422" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      <mesh position={[23.5, 14.55, CW_Z_RETURN]}>
        <cylinderGeometry args={[0.3, 0.3, 4.34, 12]} />
        <meshStandardMaterial color="#8a6040" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[23.5, 12.32, CW_Z_RETURN]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.08, 8, 12, Math.PI / 2]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      <mesh position={[CW_X_RETURN, 1.9, CW_Z_RETURN]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.1, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      <mesh position={[23.5, 12.32, CW_Z_RETURN]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.44, 0.44, 0.12, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      <Text position={[8, 12.95, CW_Z_RETURN]} fontSize={0.22} color="#6a4422" anchorX="center" anchorY="bottom" rotation={[0, 0, Math.PI / 2]}>
        CDWR
      </Text>

      {/* ── PIPE IDENTIFICATION LABELS ── */}
      {/* CHWS — Blue */}
      <Text position={[-15, 1.4, CHW_Z_SUPPLY]} fontSize={0.2} color="#3a6fa8" anchorX="center" anchorY="middle">
        CHWS
      </Text>
      {/* CHWR — Red */}
      <Text position={[15, 1.4, CHW_Z_RETURN]} fontSize={0.2} color="#c04040" anchorX="center" anchorY="middle">
        CHWR
      </Text>
      {/* ── PIPE IDENTIFICATION LABELS (on walls) ── */}
      {/* CHWS label on left wall */}
      <group position={[-34.2, 1.28, CHW_Z_SUPPLY]} rotation={[0, Math.PI/2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.2, 0.04]} />
          <meshStandardMaterial color="#1144cc" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.52, 0.14]} />
          <meshStandardMaterial color="#ffffff" roughness={1.0} />
        </mesh>
      </group>
      {/* CHWR label on left wall */}
      <group position={[-34.2, 1.28, CHW_Z_RETURN]} rotation={[0, Math.PI/2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.2, 0.04]} />
          <meshStandardMaterial color="#aa2020" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.52, 0.14]} />
          <meshStandardMaterial color="#ffffff" roughness={1.0} />
        </mesh>
      </group>
      {/* CDWS label on right wall */}
      <group position={[34.2, 1.04, CW_Z_SUPPLY]} rotation={[0, Math.PI/2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.2, 0.04]} />
          <meshStandardMaterial color="#226644" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.52, 0.14]} />
          <meshStandardMaterial color="#ffffff" roughness={1.0} />
        </mesh>
      </group>
      {/* CDWR label on right wall */}
      <group position={[34.2, 1.04, CW_Z_RETURN]} rotation={[0, Math.PI/2, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.2, 0.04]} />
          <meshStandardMaterial color="#6a4422" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.52, 0.14]} />
          <meshStandardMaterial color="#ffffff" roughness={1.0} />
        </mesh>
      </group>

      {/* ── PIPE SUPPORT CLAMPS on horizontal runs ── */}
      {[[-10, CHW_Z_SUPPLY], [-10, CHW_Z_RETURN], [10, CW_Z_SUPPLY], [10, CW_Z_RETURN]].map(([x, z], i) => (
        <mesh key={`psclamp-${i}`} position={[x, 0.55, z]}>
          <boxGeometry args={[0.2, 0.8, 0.12]} />
          <meshStandardMaterial color="#555" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}

      {/* Chiller GLB model + HMI mounted on Cube.001_Baked */}
      <ChillerModel position={[0, 0, 0]} onHmiZoom={onHmiZoom} hmiLookAtRef={hmiLookAtRef} />

      {/* Lateral tie-ins from chiller barrels (−Z heads) to CHWS / CHWR headers */}
      <group>
        <mesh
          position={[CHW_X_SUPPLY, CHW_Y_FLANGE, (CHW_STUB_Z_IN + CHW_Z_SUPPLY) * 0.5]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.35, 0.35, Math.abs(CHW_STUB_Z_IN - CHW_Z_SUPPLY), 12]} />
          <meshStandardMaterial color="#3a6fa8" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[CHW_X_SUPPLY, 1.12, CHW_Z_SUPPLY]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.35, 0.08, 8, 12, Math.PI / 2]} />
          <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
        </mesh>
        <mesh
          position={[CHW_X_RETURN, CHW_Y_FLANGE, (CHW_STUB_Z_IN + CHW_Z_RETURN) * 0.5]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.35, 0.35, Math.abs(CHW_STUB_Z_IN - CHW_Z_RETURN), 12]} />
          <meshStandardMaterial color="#c04040" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[CHW_X_RETURN, 1.12, CHW_Z_RETURN]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.35, 0.08, 8, 12, Math.PI / 2]} />
          <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
        </mesh>
      </group>
      {/* Condenser water: +Z barrel runs to risers (nozzle region ~z 3.6) */}
      <group>
        <mesh position={[CW_X_SUPPLY, 2.05, (CW_STUB_Z_IN + CW_Z_SUPPLY) * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, CW_Z_SUPPLY - CW_STUB_Z_IN, 12]} />
          <meshStandardMaterial color="#3a8a5a" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[CW_X_SUPPLY, 2.05, (CW_STUB_Z_IN + CW_Z_SUPPLY) * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, (CW_Z_SUPPLY - CW_STUB_Z_IN) * 0.65, 12]} />
          <meshStandardMaterial color="#226644" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
        </mesh>
        <mesh position={[CW_X_RETURN, 2.05, (CW_STUB_Z_IN + CW_Z_RETURN) * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, CW_Z_RETURN - CW_STUB_Z_IN, 12]} />
          <meshStandardMaterial color="#8a6040" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[CW_X_RETURN, 2.05, (CW_STUB_Z_IN + CW_Z_RETURN) * 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.4, 0.4, (CW_Z_RETURN - CW_STUB_Z_IN) * 0.65, 12]} />
          <meshStandardMaterial color="#6a4422" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
        </mesh>
      </group>
    </group>
  );
}

const HMI_PANEL_BASE = 0.17;

function findCube001Baked(root: THREE.Object3D): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  root.traverse((o) => {
    if (found || !(o instanceof THREE.Mesh)) return;
    const n = o.name;
    if (n === 'Cube.001_Baked' || n === 'Cube001_Baked') {
      found = o;
    }
  });
  return found;
}

function ChillerModel({
  position,
  onHmiZoom,
  hmiLookAtRef,
}: {
  position: [number, number, number];
  onHmiZoom: () => void;
  hmiLookAtRef: MutableRefObject<THREE.Vector3>;
}) {
  const { scene } = useGLTF('/models/Chiller_R2.glb');
  const hmiMountRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const g = hmiMountRef.current;
    if (!g) return;

    const mesh = findCube001Baked(scene);
    if (!mesh) {
      g.position.set(3.5, 2.5, 0);
      g.rotation.set(0, Math.PI / 2, 0);
      g.scale.setScalar(HMI_PANEL_BASE);
      hmiLookAtRef.current.set(3.5, 2.5, 0);
      return;
    }

    mesh.add(g);
    const geom = mesh.geometry;
    if (!geom.boundingBox) geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    const sx = bb.max.x - bb.min.x;
    const sy = bb.max.y - bb.min.y;
    const sz = bb.max.z - bb.min.z;
    const cx = (bb.min.x + bb.max.x) * 0.5;
    const cy = (bb.min.y + bb.max.y) * 0.5;
    const bump = 0.015 * Math.max(sx, sy, sz);
    const cz = bb.max.z + bump;

    const panelW = 1.22;
    const panelH = 0.92;
    const fit = (0.9 * Math.min(sx, sy)) / Math.max(panelW, panelH);

    g.position.set(cx, cy, cz);
    g.rotation.set(0, 0, 0);
    g.scale.setScalar(Math.max(0.02, fit) * HMI_PANEL_BASE);

    mesh.updateWorldMatrix(true, true);
    const face = new THREE.Vector3(cx, cy, cz);
    mesh.localToWorld(face);
    hmiLookAtRef.current.copy(face);

    return () => {
      mesh.remove(g);
    };
  }, [scene, hmiLookAtRef]);

  return (
    <group position={position}>
      <primitive
        object={scene}
        position={[0, 0.8, 0]}
        castShadow
        receiveShadow
      />
      <group ref={hmiMountRef}>
        <HMIPanel3D onZoom={onHmiZoom} />
      </group>
    </group>
  );
}

function HMIPanel3D({ onZoom }: { onZoom: () => void }) {
  const hmiMeshSrc = `${import.meta.env.BASE_URL}hmi.html?mesh=1`;

  /* Parent group in ChillerModel is on Cube.001_Baked +Z face; panel in XY faces +Z outward. */
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[1.22, 0.92, 0.06]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, -0.04]}>
        <planeGeometry args={[1.1, 0.8]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.35} metalness={0.15} />
      </mesh>
      <Html
        transform
        position={[0, 0, -0.045]}
        distanceFactor={4.35}
        zIndexRange={[28, 1]}
        style={{
          width: '680px',
          height: '495px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 'inset 0 0 0 2px #1a1a1a',
          }}
        >
          <iframe
            title="York HMI (3D)"
            src={hmiMeshSrc}
            scrolling="no"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              background: '#3a2e18',
              overflow: 'hidden',
            }}
          />
          <button
            type="button"
            aria-label="Focus camera on HMI"
            onClick={(e) => {
              e.stopPropagation();
              onZoom();
            }}
            onPointerEnter={() => {
              document.body.style.cursor = 'pointer';
            }}
            onPointerLeave={() => {
              document.body.style.cursor = 'auto';
            }}
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              zIndex: 2,
              padding: '4px 8px',
              fontSize: 11,
              fontFamily: 'system-ui, sans-serif',
              color: '#ddd',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid #555',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Focus
          </button>
        </div>
      </Html>
    </group>
  );
}

function CameraController({
  zoomed,
  hmiLookAtRef,
}: {
  zoomed: boolean;
  hmiLookAtRef: MutableRefObject<THREE.Vector3>;
}) {
  const { camera } = useThree();
  const activeRef = useRef(false);
  const progressRef = useRef(0);
  const lastZoomRef = useRef(zoomed);
  const closeCamScratch = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (zoomed !== lastZoomRef.current) {
      lastZoomRef.current = zoomed;
      activeRef.current = true;
      progressRef.current = 0;
    }

    if (activeRef.current && progressRef.current < 1) {
      progressRef.current = Math.min(progressRef.current + delta * 1.2, 1);
      const t = progressRef.current;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const wide = new THREE.Vector3(
        DEFAULT_SIM_CAMERA_POSITION[0],
        DEFAULT_SIM_CAMERA_POSITION[1],
        DEFAULT_SIM_CAMERA_POSITION[2],
      );
      const close = closeCamScratch.current
        .copy(hmiLookAtRef.current)
        .add(new THREE.Vector3(1.35, 0.35, 1.35));
      const fromPos = zoomed ? wide : close;
      const toPos = zoomed ? close : wide;
      camera.position.lerpVectors(fromPos, toPos, ease);
      if (zoomed) {
        camera.lookAt(hmiLookAtRef.current);
      } else {
        camera.lookAt(
          CHILLER_ORBIT_TARGET[0],
          CHILLER_ORBIT_TARGET[1],
          CHILLER_ORBIT_TARGET[2],
        );
      }
    }
  });

  return null;
}

export default function App() {
  const [showCxAlloy, setShowCxAlloy] = useState(false);
  const [zoomedHMI, setZoomedHMI] = useState(false);
  const hmiLookAtRef = useRef(new THREE.Vector3(0, 2.5, 0));

  // Keep browser page-zoom (Ctrl/Cmd + wheel, trackpad pinch) from scaling the chrome
  // (top bar, iPad widget). OrbitControls still receives the wheel event for dolly.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    const onGesture = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('gesturestart', onGesture, { capture: true });
    window.addEventListener('gesturechange', onGesture, { capture: true });
    window.addEventListener('gestureend', onGesture, { capture: true });
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('gesturestart', onGesture, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('gesturechange', onGesture, { capture: true } as AddEventListenerOptions);
      window.removeEventListener('gestureend', onGesture, { capture: true } as AddEventListenerOptions);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
      <ControlPanelUI />

      {/* iPad widget */}
      <CxAlloyWidget onOpen={() => setShowCxAlloy(true)} />

      {/* CxAlloy — full interactive HTML from the iPad widget */}
      {showCxAlloy && <CxAlloyHtmlMaximized onClose={() => setShowCxAlloy(false)} />}

      {/* 3D Canvas */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas
          shadows
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{
            position: DEFAULT_SIM_CAMERA_POSITION,
            fov: 45,
            near: 0.1,
            far: 500,
          }}
        >
          <Suspense fallback={null}>
            <Scene />
            <EngineRoom onHmiZoom={() => setZoomedHMI(true)} hmiLookAtRef={hmiLookAtRef} />
            <InspectRaycaster />

            {/* Camera animation on HMI zoom (HMI lives under ChillerModel on Cube.001_Baked) */}
            <CameraController zoomed={zoomedHMI} hmiLookAtRef={hmiLookAtRef} />

            <OrbitControls
              makeDefault
              target={CHILLER_ORBIT_TARGET}
              minDistance={8}
              maxDistance={150}
              minPolarAngle={0.2}
              maxPolarAngle={Math.PI / 2 - 0.1}
              enableDamping
              dampingFactor={0.05}
              enabled={!zoomedHMI}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Zoom overlay — click anywhere to exit zoom */}
      {zoomedHMI && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 60, cursor: 'pointer' }}
          onClick={() => setZoomedHMI(false)}
        />
      )}
    </div>
  );
}