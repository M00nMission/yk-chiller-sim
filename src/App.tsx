import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useState, useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import html2canvas from 'html2canvas';
import { Scene } from './components/canvas/Scene';
import { HMIPanel } from './components/ui/HMIPanel';
import { CxAlloyWidget, CxAlloyPanel } from './components/ui/CxAlloyPanel';
import { ControlPanelUI } from './components/ui/ControlPanelUI';

function EngineRoom() {
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

      {/* ── CHILLED WATER SUPPLY (CHWS) — Blue ── */}
      {/* Horizontal run from chiller to left wall */}
      <mesh position={[0, 0.8, -5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.35, 0.35, 60, 12]} />
        <meshStandardMaterial color="#3a6fa8" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Insulation — blue closed-cell foam jacket */}
      <mesh position={[0, 0.8, -5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.44, 0.44, 16, 12]} />
        <meshStandardMaterial color="#2255aa" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Pipe label marker */}
      <mesh position={[-15, 1.28, -5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.8, 12]} />
        <meshStandardMaterial color="#1144aa" roughness={0.8} />
      </mesh>
      {/* Vertical drop near chiller */}
      <mesh position={[-2.5, 1.4, -5]}>
        <cylinderGeometry args={[0.35, 0.35, 2.0, 12]} />
        <meshStandardMaterial color="#3a6fa8" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Vertical insulation */}
      <mesh position={[-2.5, 1.4, -5]}>
        <cylinderGeometry args={[0.44, 0.44, 2.0, 12]} />
        <meshStandardMaterial color="#2255aa" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Flange at chiller connection */}
      <mesh position={[-2.5, 2.5, -5]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      {/* Flange at wall penetration */}
      <mesh position={[-30, 0.8, -5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 12]} />
        <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Gate valve on supply line */}
      <group position={[-20, 0.8, -5]} rotation={[0, 0, Math.PI/2]}>
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

      {/* ── CHILLED WATER RETURN (CHWR) — Red ── */}
      <mesh position={[0, 0.8, -7]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.35, 0.35, 62, 12]} />
        <meshStandardMaterial color="#c04040" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Insulation — red closed-cell foam jacket */}
      <mesh position={[0, 0.8, -7]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.44, 0.44, 16, 12]} />
        <meshStandardMaterial color="#aa2020" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Pipe label marker */}
      <mesh position={[-15, 1.28, -7]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.36, 0.36, 0.8, 12]} />
        <meshStandardMaterial color="#aa2020" roughness={0.8} />
      </mesh>
      {/* Vertical drop near chiller */}
      <mesh position={[2.5, 1.4, -7]}>
        <cylinderGeometry args={[0.35, 0.35, 2.0, 12]} />
        <meshStandardMaterial color="#c04040" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Vertical insulation */}
      <mesh position={[2.5, 1.4, -7]}>
        <cylinderGeometry args={[0.44, 0.44, 2.0, 12]} />
        <meshStandardMaterial color="#aa2020" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Flange at chiller connection */}
      <mesh position={[2.5, 2.5, -7]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      {/* Flange at wall */}
      <mesh position={[-30, 0.8, -7]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 12]} />
        <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Gate valve on return line */}
      <group position={[-20, 0.8, -7]} rotation={[0, 0, Math.PI/2]}>
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

      {/* ── CONDENSER WATER SUPPLY (CDWS) — Green ── */}
      <mesh position={[0, 0.6, 5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.30, 0.30, 62, 12]} />
        <meshStandardMaterial color="#3a8a5a" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Insulation — green foam jacket */}
      <mesh position={[0, 0.6, 5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.40, 0.40, 14, 12]} />
        <meshStandardMaterial color="#226644" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Pipe label marker */}
      <mesh position={[15, 1.04, 5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.31, 0.31, 0.8, 12]} />
        <meshStandardMaterial color="#226644" roughness={0.8} />
      </mesh>
      {/* Vertical drop near chiller */}
      <mesh position={[-2.5, 1.1, 5]}>
        <cylinderGeometry args={[0.30, 0.30, 1.5, 12]} />
        <meshStandardMaterial color="#3a8a5a" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Vertical insulation */}
      <mesh position={[-2.5, 1.1, 5]}>
        <cylinderGeometry args={[0.40, 0.40, 1.5, 12]} />
        <meshStandardMaterial color="#226644" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Flange at chiller connection */}
      <mesh position={[-2.5, 1.9, 5]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.1, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      {/* Flange at wall */}
      <mesh position={[30, 0.6, 5]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.44, 0.44, 0.12, 12]} />
        <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Gate valve */}
      <group position={[20, 0.6, 5]} rotation={[0, 0, Math.PI/2]}>
        <mesh>
          <cylinderGeometry args={[0.30, 0.30, 0.15, 12]} />
          <meshStandardMaterial color="#3a8a5a" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.44, 0.44, 0.08, 12]} />
          <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
        </mesh>
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.2, 0.025, 8, 20]} />
          <meshStandardMaterial color="#2244cc" roughness={0.5} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.25, 0.2]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>

      {/* ── CONDENSER WATER RETURN (CDWR) — Brown ── */}
      <mesh position={[0, 0.6, 7]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.30, 0.30, 64, 12]} />
        <meshStandardMaterial color="#8a6040" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Insulation — brown/tan foam jacket */}
      <mesh position={[0, 0.6, 7]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.40, 0.40, 14, 12]} />
        <meshStandardMaterial color="#6a4422" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Pipe label marker */}
      <mesh position={[15, 1.04, 7]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.31, 0.31, 0.8, 12]} />
        <meshStandardMaterial color="#6a4422" roughness={0.8} />
      </mesh>
      {/* Vertical drop near chiller */}
      <mesh position={[2.5, 1.1, 7]}>
        <cylinderGeometry args={[0.30, 0.30, 1.5, 12]} />
        <meshStandardMaterial color="#8a6040" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Vertical insulation */}
      <mesh position={[2.5, 1.1, 7]}>
        <cylinderGeometry args={[0.40, 0.40, 1.5, 12]} />
        <meshStandardMaterial color="#6a4422" roughness={0.9} metalness={0.0} transparent opacity={0.85} />
      </mesh>
      {/* Flange at chiller connection */}
      <mesh position={[2.5, 1.9, 7]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.1, 12]} />
        <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
      </mesh>
      {/* Flange at wall */}
      <mesh position={[30, 0.6, 7]} rotation={[0, 0, Math.PI/2]}>
        <cylinderGeometry args={[0.44, 0.44, 0.12, 12]} />
        <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Gate valve */}
      <group position={[20, 0.6, 7]} rotation={[0, 0, Math.PI/2]}>
        <mesh>
          <cylinderGeometry args={[0.30, 0.30, 0.15, 12]} />
          <meshStandardMaterial color="#8a6040" roughness={0.7} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.44, 0.44, 0.08, 12]} />
          <meshStandardMaterial color="#b07030" roughness={0.2} metalness={1.0} />
        </mesh>
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI/2, 0, 0]}>
          <torusGeometry args={[0.2, 0.025, 8, 20]} />
          <meshStandardMaterial color="#2244cc" roughness={0.5} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.25, 0.2]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.4, 6]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>

      {/* ── PIPE IDENTIFICATION LABELS (on walls) ── */}
      {/* CHWS label on left wall */}
      <group position={[-34.2, 1.28, -5]} rotation={[0, Math.PI/2, 0]}>
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
      <group position={[-34.2, 1.28, -7]} rotation={[0, Math.PI/2, 0]}>
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
      <group position={[34.2, 1.04, 5]} rotation={[0, Math.PI/2, 0]}>
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
      <group position={[34.2, 1.04, 7]} rotation={[0, Math.PI/2, 0]}>
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
      {[[-10, -5], [-10, -7], [10, 5], [10, 7]].map(([x, z], i) => (
        <mesh key={`psclamp-${i}`} position={[x, 0.55, z]}>
          <boxGeometry args={[0.2, 0.8, 0.12]} />
          <meshStandardMaterial color="#555" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}

      {/* Chiller GLB model */}
      <ChillerModel position={[0, 0, 0]} />
    </group>
  );
}


function ChillerModel({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF('/models/Chiller_R2.glb');

  return (
    <group position={position}>
      <primitive
        object={scene}
        position={[0, 0.8, 0]}
        castShadow
        receiveShadow
      />
    </group>
  );
}

function HMIPanel3D({ onZoom }: { onZoom: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    // Load hmi2.html via fetch and render to canvas
    fetch('/hmi2.html')
      .then(r => r.text())
      .then(html => {
        // Create a hidden iframe to render the HTML
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;width:800px;height:600px;left:-9999px;top:0;border:none;';
        iframe.srcdoc = html;
        document.body.appendChild(iframe);

        iframe.onload = () => {
          setTimeout(() => {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (!iframeDoc) return;
              const iframeBody = iframeDoc.body;

              html2canvas(iframeBody, {
                width: 800,
                height: 600,
                scale: 1,
                useCORS: true,
                allowTaint: true,
                logging: false,
              }).then((captured: HTMLCanvasElement) => {
                const tex = new THREE.CanvasTexture(captured);
                if (matRef.current) {
                  matRef.current.map = tex;
                  matRef.current.needsUpdate = true;
                  textureRef.current = tex;
                }
              }).catch(() => {});
            } finally {
              document.body.removeChild(iframe);
            }
          }, 500);
        };
      })
      .catch(() => {});

    return () => {
      if (textureRef.current) textureRef.current.dispose();
    };
  }, []);

  return (
    <group position={[3.5, 2.5, 0]}>
      {/* Panel housing / bezel */}
      <mesh castShadow>
        <boxGeometry args={[1.22, 0.92, 0.06]} />
        <meshStandardMaterial color="#111111" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Screen — clickable */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0.04]}
        onClick={onZoom}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <planeGeometry args={[1.1, 0.8]} />
        <meshStandardMaterial
          ref={matRef}
          color="#1a2a1a"
          roughness={0.3}
          metalness={0.1}
          emissive="#001000"
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  );
}

function CameraController({ zoomed }: { zoomed: boolean }) {
  const { camera } = useThree();
  const activeRef = useRef(false);
  const progressRef = useRef(0);
  const lastZoomRef = useRef(zoomed);

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
      const fromPos = zoomed ? new THREE.Vector3(15, 10, 20) : new THREE.Vector3(5.5, 2.8, 3);
      const toPos = zoomed ? new THREE.Vector3(5.5, 2.8, 3) : new THREE.Vector3(15, 10, 20);
      camera.position.lerpVectors(fromPos, toPos, ease);
      if (zoomed) {
        camera.lookAt(3.5, 2.5, 0);
      }
    }
  });

  return null;
}

export default function App() {
  const [showCxAlloy, setShowCxAlloy] = useState(false);
  const [zoomedHMI, setZoomedHMI] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', position: 'relative', overflow: 'hidden' }}>
      <ControlPanelUI />

      {/* iPad widget */}
      <CxAlloyWidget onOpen={() => setShowCxAlloy(true)} />

      {/* CxAlloy full panel */}
      {showCxAlloy && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)' }}>
          <CxAlloyPanel onClose={() => setShowCxAlloy(false)} />
        </div>
      )}

      {/* HMI Panel — hidden when zoomed into 3D HMI */}
      {!zoomedHMI && <HMIPanel />}

      {/* 3D Canvas */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <Canvas
          shadows
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [15, 10, 20], fov: 45, near: 0.1, far: 200 }}
        >
          <Suspense fallback={null}>
            <Scene />
            <EngineRoom />

            {/* 3D HMI panel on chiller — click to zoom in */}
            <HMIPanel3D onZoom={() => setZoomedHMI(true)} />

            {/* Camera animation on HMI zoom */}
            <CameraController zoomed={zoomedHMI} />

            {/* Orbit controls — disable when zoomed */}
            <OrbitControls
              makeDefault
              target={[0, 3, 0]}
              minDistance={8}
              maxDistance={150}
              minPolarAngle={0.2}
              maxPolarAngle={Math.PI / 2 - 0.1}
              enableDamping
              dampingFactor={0.05}
              enabled={!zoomedHMI}
              onChange={() => {}}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Zoom overlay — click anywhere to exit zoom */}
      {zoomedHMI && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer' }}
          onClick={() => setZoomedHMI(false)}
        />
      )}
    </div>
  );
}