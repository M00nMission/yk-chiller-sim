import { Canvas } from '@react-three/fiber';
import { Suspense, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { Scene } from './components/canvas/Scene';
import { HMIPanel } from './components/ui/HMIPanel';
import { CxAlloyWidget, CxAlloyPanel } from './components/ui/CxAlloyPanel';
import { ControlPanelUI } from './components/ui/ControlPanelUI';

function EngineRoom() {
  return (
    <group>
      {/* ─── FLOOR ─── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Floor grid lines */}
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh key={`gx-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[i * 2 - 17, 0.002, 0]}>
          <planeGeometry args={[0.025, 40]} />
          <meshStandardMaterial color="#3d3d3d" roughness={0.95} />
        </mesh>
      ))}
      {Array.from({ length: 18 }).map((_, i) => (
        <mesh key={`gz-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, i * 2 - 17]}>
          <planeGeometry args={[40, 0.025]} />
          <meshStandardMaterial color="#3d3d3d" roughness={0.95} />
        </mesh>
      ))}

      {/* Safety stripe perimeter */}
      {[-3.8, 3.8].map((z, i) => (
        <mesh key={`ss-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, z]}>
          <planeGeometry args={[8.5, 0.12]} />
          <meshStandardMaterial color="#c8a830" roughness={0.6} metalness={0.2} />
        </mesh>
      ))}
      {[-3.8, 3.8].map((x, i) => (
        <mesh key={`ssl-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.003, 0]}>
          <planeGeometry args={[0.12, 7.7]} />
          <meshStandardMaterial color="#c8a830" roughness={0.6} metalness={0.2} />
        </mesh>
      ))}

      {/* Chiller GLB model */}
      <ChillerModel position={[0, 0, 0]} />

      {/* Anchor bolts */}
      {[[-2.5, -3], [-2.5, 3], [2.5, -3], [2.5, 3]].map(([x, z], i) => (
        <group key={`bolt-${i}`} position={[x, 0.02, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.1, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.04, 0.08, 8]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Floor drains */}
      {[[-6, -5], [-6, 5], [6, -5], [6, 5]].map(([x, z], i) => (
        <group key={`drain-${i}`} position={[x, 0.005, z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.18, 0.28, 12]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.95} metalness={0.3} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.18, 12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Floor grating sections */}
      <mesh position={[7, 0.02, -9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 2]} />
        <meshStandardMaterial color="#383838" roughness={0.95} metalness={0.5} />
      </mesh>
      <mesh position={[-7, 0.02, 9]}>
        {[0, 0.1, 0.2, 0.3, 0.4].map((ox, i) => (
          <mesh key={`gr-${i}`} position={[ox, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.04, 2, 0.02]} />
            <meshStandardMaterial color="#555" roughness={0.8} metalness={0.6} />
          </mesh>
        ))}
      </mesh>

      {/* ─── CEILING ─── */}
      {/* Main ceiling beams */}
      {[-9, -3, 3, 9].map((x, i) => (
        <group key={`cbeam-${i}`} position={[x, 9.6, 0]}>
          <mesh><boxGeometry args={[0.35, 0.7, 28]} /><meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.8} /></mesh>
          <mesh position={[0, -0.38, 0]}><boxGeometry args={[0.45, 0.08, 28]} /><meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.8} /></mesh>
        </group>
      ))}
      {[-6, 0, 6].map((z, i) => (
        <mesh key={`mbm-${i}`} position={[0, 9.7, z]}><boxGeometry args={[28, 0.25, 0.25]} /><meshStandardMaterial color="#555" roughness={0.5} metalness={0.8} /></mesh>
      ))}

      {/* Purlins between beams */}
      {[-7, -4, -1, 2, 5, 8].map((x, i) => (
        <mesh key={`pur-${i}`} position={[x, 9.3, 0]}><boxGeometry args={[0.06, 0.04, 26]} /><meshStandardMaterial color="#444" roughness={0.6} metalness={0.7} /></mesh>
      ))}

      {/* ─── HANGING LIGHT FIXTURES ─── */}
      {[-9, -3, 3, 9].map((x, xi) =>
        [-6, 0, 6].map((z, zi) => (
          <group key={`lf-${xi}-${zi}`} position={[x, 9.4, z]}>
            <mesh position={[0, -0.3, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.5, 4]} />
              <meshStandardMaterial color="#333" roughness={0.8} metalness={0.6} />
            </mesh>
            <mesh>
              <boxGeometry args={[1.4, 0.12, 0.35]} />
              <meshStandardMaterial color="#555" roughness={0.5} metalness={0.7} />
            </mesh>
            <mesh position={[0, -0.08, 0]}>
              <boxGeometry args={[1.2, 0.04, 0.2]} />
              <meshStandardMaterial color="#ffeecc" emissive="#ffeeaa" emissiveIntensity={3.0} />
            </mesh>
          </group>
        ))
      )}

      {/* ─── PIPES ON BACK WALL ─── */}
      {/* Main horizontal pipes */}
      <mesh position={[0, 8.5, -13.8]}>
        <cylinderGeometry args={[0.12, 0.12, 26, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 7, -13.8]}>
        <cylinderGeometry args={[0.1, 0.1, 26, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 5.5, -13.8]}>
        <cylinderGeometry args={[0.14, 0.14, 26, 10]} />
        <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[0, 3.5, -13.8]}>
        <cylinderGeometry args={[0.1, 0.1, 26, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.5, -13.8]}>
        <cylinderGeometry args={[0.08, 0.08, 26, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Vertical drops */}
      {[-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10].map((x, i) => (
        <mesh key={`vdrop-${i}`} position={[x, 5, -13.8]}>
          <cylinderGeometry args={[0.05, 0.05, 6, 8]} />
          <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* Pipe flanges on back wall */}
      {[-8, 0, 8].map((x, i) => (
        <group key={`pvr-${i}`} position={[x, 6.5, -13.8]}>
          <mesh>
            <sphereGeometry args={[0.14, 10, 10]} />
            <meshStandardMaterial color="#c4833a" roughness={0.2} metalness={1.0} />
          </mesh>
          <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 6]} />
            <meshStandardMaterial color="#999" roughness={0.3} metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Pipe flanges at wall penetration */}
      {[[-12, 8.5], [-12, 5.5], [12, 7], [12, 3]].map(([x, y], i) => (
        <mesh key={`flng-${i}`} position={[x, y, -13.7]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.06, 12]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.8} />
        </mesh>
      ))}

      {/* ─── PIPES ON RIGHT WALL ─── */}
      <mesh position={[13.8, 5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 28, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[13.8, 6.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 28, 8]} />
        <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[13.8, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 28, 10]} />
        <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[13.8, 1, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 28, 8]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Right wall flanges */}
      {[[13.8, 8.5], [13.8, 6.5], [13.8, 3]].map(([x, y], i) => (
        <mesh key={`rflng-${i}`} position={[x, y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.06, 10]} />
          <meshStandardMaterial color="#999" roughness={0.35} metalness={0.8} />
        </mesh>
      ))}

      {/* ─── PIPES ON LEFT WALL ─── */}
      <mesh position={[-13.8, 5.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 28, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[-13.8, 7, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 28, 8]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[-13.8, 4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 28, 10]} />
        <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[-13.8, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 28, 8]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Left wall flanges */}
      {[[-13.8, 5.5], [-13.8, 4]].map(([x, y], i) => (
        <mesh key={`lflng-${i}`} position={[x, y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.06, 10]} />
          <meshStandardMaterial color="#999" roughness={0.35} metalness={0.8} />
        </mesh>
      ))}

      {/* ─── PIPES ON FRONT WALL ─── */}
      <mesh position={[0, 7, 13.8]}>
        <cylinderGeometry args={[0.1, 0.1, 26, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 5, 13.8]}>
        <cylinderGeometry args={[0.12, 0.12, 26, 10]} />
        <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[0, 2.5, 13.8]}>
        <cylinderGeometry args={[0.08, 0.08, 26, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* ─── CEILING PIPE RUNS ─── */}
      {[[-8, 9.0, 0], [0, 9.0, 0], [8, 9.0, 0]].map(([x, y, z], i) => (
        <mesh key={`cpipe-${i}`} position={[x, y, z]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 20, 8]} />
          <meshStandardMaterial color="#5a7a5a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* Pipe hangers from ceiling */}
      {[-8, -4, 0, 4, 8].map((x, i) => (
        <group key={`ph-${i}`} position={[x, 8.5, -6]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 1, 4]} />
            <meshStandardMaterial color="#555" roughness={0.7} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.06, 0.04, 0.06]} />
            <meshStandardMaterial color="#666" roughness={0.6} metalness={0.8} />
          </mesh>
        </group>
      ))}
      {[-8, -4, 0, 4, 8].map((x, i) => (
        <group key={`ph2-${i}`} position={[x, 8.5, 6]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 1, 4]} />
            <meshStandardMaterial color="#555" roughness={0.7} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.06, 0.04, 0.06]} />
            <meshStandardMaterial color="#666" roughness={0.6} metalness={0.8} />
          </mesh>
        </group>
      ))}

      {/* ─── SUPPORT COLUMNS ─── */}
      {[[-9, -9], [-9, 9], [9, -9], [9, 9]].map(([x, z], i) => (
        <group key={`col-${i}`} position={[x, 0, z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.5, 10, 0.5]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.7} metalness={0.4} />
          </mesh>
          <mesh position={[0, 5, 0]}>
            <boxGeometry args={[0.6, 0.25, 0.6]} />
            <meshStandardMaterial color="#666" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.1, 0]}>
            <boxGeometry args={[0.7, 0.1, 0.7]} />
            <meshStandardMaterial color="#444" roughness={0.5} metalness={0.8} />
          </mesh>
          {[1, 3, 5, 7].map((y, si) => (
            <mesh key={`cs-${si}`} position={[0.27, y, 0]}>
              <boxGeometry args={[0.02, 1.2, 0.5]} />
              <meshStandardMaterial color="#c8a830" roughness={0.6} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Column base plates */}
      {[[-9, -9], [-9, 9], [9, -9], [9, 9]].map(([x, z], i) => (
        <mesh key={`bp-${i}`} position={[x, 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.05]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.7} metalness={0.6} />
        </mesh>
      ))}

      {/* ─── CONTROL PANELS ─── */}
      {/* Main control panel on back wall */}
      <group position={[0, 3.5, -13.7]}>
        <mesh>
          <boxGeometry args={[4, 2.5, 0.12]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.5, 0.08]}>
          <planeGeometry args={[2.5, 1.3]} />
          <meshStandardMaterial color="#001a00" emissive="#003300" emissiveIntensity={0.6} />
        </mesh>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={`led-${i}`} position={[-1.5 + (i % 4) * 1, 0.8 - Math.floor(i / 4) * 0.3, 0.08]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? '#ff3333' : i % 3 === 1 ? '#ffaa22' : '#33ff66'}
              emissive={i % 3 === 0 ? '#ff0000' : i % 3 === 1 ? '#ff8800' : '#00cc44'}
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
        <mesh position={[-1.2, -0.7, 0.08]}>
          <planeGeometry args={[1, 0.7]} />
          <meshStandardMaterial color="#222" roughness={0.6} />
        </mesh>
        {[[-1, -0.9], [-1, -0.7], [-1, -0.5], [0, -0.9], [0, -0.7], [0, -0.5]].map(([x, y], bi) => (
          <mesh key={`key-${bi}`} position={[x, y, 0.1]}>
            <boxGeometry args={[0.15, 0.1, 0.04]} />
            <meshStandardMaterial color="#444" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Left wall panel */}
      <group position={[-13.7, 3.5, -4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[3, 2, 0.1]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.35, 0.07]}>
          <planeGeometry args={[1.8, 1]} />
          <meshStandardMaterial color="#001100" emissive="#003300" emissiveIntensity={0.5} />
        </mesh>
        {[-0.6, -0.3, 0, 0.3, 0.6].map((x, bi) => (
          <mesh key={`btn2-${bi}`} position={[x, -0.55, 0.07]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 8]} />
            <meshStandardMaterial color={bi === 0 ? '#cc2222' : bi === 4 ? '#22cc44' : '#555'} roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
        {[-0.8, 0, 0.8].map((x, gi) => (
          <group key={`gg-${gi}`} position={[x, -0.5, 0.07]}>
            <mesh>
              <cylinderGeometry args={[0.14, 0.14, 0.04, 16]} />
              <meshStandardMaterial color="#c4833a" roughness={0.2} metalness={1.0} />
            </mesh>
            <mesh position={[0, 0.03, 0]}>
              <circleGeometry args={[0.11, 16]} />
              <meshStandardMaterial color="#f5f0e6" roughness={0.1} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─── WATER PUMPS ─── */}
      {/* Pump 1 */}
      <group position={[-11, 0, -11]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.7, 0.7, 1.8, 20]} />
          <meshStandardMaterial color="#6a6a6a" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 1.2, 16]} />
          <meshStandardMaterial color="#4a6a4a" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 2.1, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.4, 8]} />
          <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
        </mesh>
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[1.6, 0.25, 1.6]} />
          <meshStandardMaterial color="#444" roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.95, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.2, 12]} />
          <meshStandardMaterial color="#999" roughness={0.3} metalness={0.9} />
        </mesh>
        {/* Motor coupling */}
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>
      {/* Pump 2 */}
      <group position={[-11, 0, -7]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.6, 1.6, 20]} />
          <meshStandardMaterial color="#6a6a6a" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 1.1, 16]} />
          <meshStandardMaterial color="#4a6a4a" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[1.4, 0.2, 1.4]} />
          <meshStandardMaterial color="#444" roughness={0.8} metalness={0.2} />
        </mesh>
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.4, 14]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
      </group>

      {/* Pump pipes */}
      <mesh position={[-11, 2.1, -9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 4, 10]} />
        <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[-11, 3.5, -9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 4, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[-11, 2.1, -9]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 5, 10]} />
        <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
      </mesh>

      {/* Pump strainers */}
      <group position={[-13.5, 1.5, -9]}>
        <mesh>
          <cylinderGeometry args={[0.2, 0.25, 0.5, 12]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 0.08, 12]} />
          <meshStandardMaterial color="#aaa" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* ─── EXPANSION TANK ─── */}
      <group position={[11, 0, -11]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.5, 0.5, 2.5, 16]} />
          <meshStandardMaterial color="#cccccc" roughness={0.4} metalness={0.7} />
        </mesh>
        {[-0.7, 0.7].map((lx, li) => (
          <mesh key={`etl-${li}`} position={[lx, 0, 0]}>
            <boxGeometry args={[0.06, 2.5, 0.06]} />
            <meshStandardMaterial color="#666" roughness={0.5} metalness={0.8} />
          </mesh>
        ))}
        {/* Tank legs */}
        {[[0.35, -1.1], [-0.35, -1.1]].map(([lx, ly], li) => (
          <mesh key={`etleg-${li}`} position={[lx, ly, 0]}>
            <boxGeometry args={[0.06, 0.5, 0.5]} />
            <meshStandardMaterial color="#555" roughness={0.6} metalness={0.7} />
          </mesh>
        ))}
      </group>

      {/* ─── AIR HANDLING / DUCTWORK ─── */}
      <mesh position={[0, 9.5, -8]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.7, 26, 0.5]} />
        <meshStandardMaterial color="#aaaaaa" roughness={0.5} metalness={0.5} />
      </mesh>
      {[-9, -3, 3, 9].map((x, i) => (
        <group key={`branch-${i}`} position={[x, 9.2, -8]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.4]} />
            <meshStandardMaterial color="#aaaaaa" roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, 9.0, -8]}>
            <cylinderGeometry args={[0.25, 0.15, 0.1, 10]} />
            <meshStandardMaterial color="#cccccc" roughness={0.4} metalness={0.6} />
          </mesh>
          {[0, 1, 2, 3, 4].map((_, vi) => (
            <mesh key={`van-${i}-${vi}`} position={[0, 8.95, -8]} rotation={[0, (vi * Math.PI * 2) / 5, 0]}>
              <boxGeometry args={[0.2, 0.02, 0.03]} />
              <meshStandardMaterial color="#aaaaaa" roughness={0.4} metalness={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* More ductwork */}
      <mesh position={[0, 9.4, 4]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.5, 12, 0.4]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 9.4, 8]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.4, 8, 0.3]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* ─── CABLE TRAYS & CONDUIT ─── */}
      <mesh position={[0, 9.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.06, 0.12, 22]} />
        <meshStandardMaterial color="#606060" roughness={0.4} metalness={0.9} />
      </mesh>
      <mesh position={[-8, 9.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.06, 0.12, 22]} />
        <meshStandardMaterial color="#606060" roughness={0.4} metalness={0.9} />
      </mesh>
      <mesh position={[8, 9.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.06, 0.12, 22]} />
        <meshStandardMaterial color="#606060" roughness={0.4} metalness={0.9} />
      </mesh>

      {/* Vertical cable tray runs */}
      {[[-13.5, 3], [-13.5, 7]].map(([x, y], i) => (
        <mesh key={`vtray-${i}`} position={[x, y, 2]}>
          <boxGeometry args={[0.04, 0.08, 4]} />
          <meshStandardMaterial color="#555" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}

      {/* Conduit on walls */}
      {[[-13.5, 9.0], [13.5, 9.0]].map(([x, y], i) => (
        <mesh key={`wallcond-${i}`} position={[x, y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 20, 6]} />
          <meshStandardMaterial color="#444" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}

      {/* ─── FIRE SAFETY ─── */}
      {/* Fire alarm panel */}
      <group position={[-13.7, 2, -10]}>
        <mesh>
          <boxGeometry args={[0.5, 0.7, 0.2]} />
          <meshStandardMaterial color="#cc2222" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.12]}>
          <planeGeometry args={[0.38, 0.55]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>

      {/* Fire extinguisher */}
      <group position={[-13.5, 0.9, -6]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.7, 10]} />
          <meshStandardMaterial color="#cc2222" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.15, 6]} />
          <meshStandardMaterial color="#555" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>

      {/* Sprinkler heads */}
      {[[-6, 9.4, -6], [0, 9.4, -6], [6, 9.4, -6], [-6, 9.4, 0], [6, 9.4, 0], [-6, 9.4, 6], [0, 9.4, 6], [6, 9.4, 6]].map(([x, y, z], i) => (
        <group key={`sprink-${i}`} position={[x, y, z]}>
          <mesh>
            <cylinderGeometry args={[0.025, 0.025, 0.15, 6]} />
            <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial color="#cc2222" roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      ))}

      {/* Safety shower */}
      <group position={[13.5, 0, -11]}>
        <mesh position={[0, 3.5, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 7, 8]} />
          <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
        </mesh>
        <mesh position={[0, 7, 0]}>
          <cylinderGeometry args={[0.15, 0.08, 0.15, 10]} />
          <meshStandardMaterial color="#999" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, 1, 0]}>
          <cylinderGeometry args={[0.28, 0.32, 0.4, 14]} />
          <meshStandardMaterial color="#dddddd" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.3, 5.5, 0]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.015, 0.015, 0.5, 5]} />
          <meshStandardMaterial color="#ff4444" roughness={0.5} metalness={0.5} />
        </mesh>
      </group>

      {/* ─── DRY COOLER ─── */}
      <group position={[11, 0, 4]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 2, 2]} />
          <meshStandardMaterial color="#5a6a5a" roughness={0.7} metalness={0.4} />
        </mesh>
        <mesh position={[0, 1.2, 1.05]}>
          <cylinderGeometry args={[0.7, 0.7, 0.15, 20]} />
          <meshStandardMaterial color="#666" roughness={0.5} metalness={0.7} />
        </mesh>
        {[-0.6, -0.2, 0.2, 0.6].map((x, i) => (
          <mesh key={`lvr-${i}`} position={[x, 0.5, 1.05]}>
            <boxGeometry args={[0.08, 0.8, 0.02]} />
            <meshStandardMaterial color="#555" roughness={0.6} metalness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, -0.15, 0]}>
          <boxGeometry args={[3.2, 0.2, 2.2]} />
          <meshStandardMaterial color="#444" roughness={0.8} metalness={0.2} />
        </mesh>
        {/* Fan motors */}
        {[-0.8, 0, 0.8].map((x, fi) => (
          <mesh key={`fm-${fi}`} position={[x, -0.2, 0.8]}>
            <cylinderGeometry args={[0.15, 0.15, 0.3, 12]} />
            <meshStandardMaterial color="#555" roughness={0.5} metalness={0.7} />
          </mesh>
        ))}
      </group>
      <mesh position={[11, 2.5, -1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 8, 10]} />
        <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
      </mesh>
      <mesh position={[11, 3.5, -1]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 8, 10]} />
        <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* ─── STORAGE TANK ─── */}
      <group position={[11, 0, 10]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.8, 0.8, 3, 20]} />
          <meshStandardMaterial color="#666666" roughness={0.6} metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.08, 20]} />
          <meshStandardMaterial color="#444" roughness={0.5} metalness={0.8} />
        </mesh>
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.08, 20]} />
          <meshStandardMaterial color="#444" roughness={0.5} metalness={0.8} />
        </mesh>
        {[-0.9, 0.9].map((lx, li) => (
          <mesh key={`stl-${li}`} position={[lx, 1.5, 0]}>
            <boxGeometry args={[0.08, 3, 0.08]} />
            <meshStandardMaterial color="#555" roughness={0.5} metalness={0.8} />
          </mesh>
        ))}
      </group>
      <mesh position={[11, 4.5, 2]} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 18, 10]} />
        <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
      </mesh>

      {/* ─── WORK PLATFORM ─── */}
      <group position={[6, 0, 0]}>
        <mesh position={[0, 2.5, 0]} castShadow>
          <boxGeometry args={[2, 0.08, 3]} />
          <meshStandardMaterial color="#c8a830" roughness={0.6} metalness={0.3} />
        </mesh>
        {[[0, 2.8, 1.5], [0, 2.8, -1.5], [1, 2.8, 0], [-1, 2.8, 0]].map(([px, py, pz], i) => (
          <mesh key={`gr-${i}`} position={[px, py, pz]}>
            <boxGeometry args={[i < 2 ? 2 : 0.04, 0.04, i < 2 ? 0.04 : 3]} />
            <meshStandardMaterial color="#999" roughness={0.5} metalness={0.7} />
          </mesh>
        ))}
        {[[-1, 1.5], [-1, -1.5], [1, 1.5], [1, -1.5]].map(([x, z], i) => (
          <mesh key={`post-${i}`} position={[x, 1.2, z]}>
            <boxGeometry args={[0.06, 2.4, 0.06]} />
            <meshStandardMaterial color="#777" roughness={0.5} metalness={0.8} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={`step-${i}`} position={[1.5, 0.7 + i * 0.6, 0]}>
            <boxGeometry args={[0.5, 0.05, 0.8]} />
            <meshStandardMaterial color="#c8a830" roughness={0.6} metalness={0.3} />
          </mesh>
        ))}
      </group>

      {/* ─── WALL-MOUNTED CABINETS ─── */}
      {/* Electric cabinet right wall */}
      <group position={[13.5, 2, -2]}>
        <mesh>
          <boxGeometry args={[0.8, 1.8, 0.6]} />
          <meshStandardMaterial color="#4a4a4a" roughness={0.6} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.32]}>
          <planeGeometry args={[0.6, 1.4]} />
          <meshStandardMaterial color="#333" roughness={0.7} />
        </mesh>
        <mesh position={[0.3, 0.6, 0.33]}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
          <meshStandardMaterial color="#888" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0.3, -0.2, 0.33]}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
          <meshStandardMaterial color="#888" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Instrument panel left wall */}
      <group position={[-13.5, 5, 6]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <boxGeometry args={[1.5, 1, 0.1]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.6} metalness={0.4} />
        </mesh>
        {[-0.4, -0.2, 0, 0.2, 0.4].map((x, gi) => (
          <group key={`gauge-${gi}`} position={[x, 0.15, 0.07]}>
            <mesh>
              <cylinderGeometry args={[0.1, 0.1, 0.04, 16]} />
              <meshStandardMaterial color="#c4833a" roughness={0.2} metalness={1.0} />
            </mesh>
            <mesh position={[0, 0.03, 0]}>
              <circleGeometry args={[0.08, 16]} />
              <meshStandardMaterial color="#f5f0e6" roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.015, 0.08, 4]} />
              <meshStandardMaterial color="#cc0000" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ─── JUNCTION BOXES ─── */}
      {[[-12, 7], [-12, 3.5], [-12, 0], [12, 7], [12, 3.5], [12, 0], [12, -3], [12, -7]].map(([x, y], i) => (
        <group key={`jb-${i}`} position={[x > 0 ? 13.5 : -13.5, y, x > 0 ? 0 : y]}>
          <mesh rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <boxGeometry args={[0.4, 0.4, 0.08]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.05]} rotation={[0, x > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>
            <planeGeometry args={[0.25, 0.25]} />
            <meshStandardMaterial color="#333" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* ─── EXHAUST VENTS ─── */}
      <group position={[13.5, 8.5, -6]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.8, 0.8, 0.1]} />
          <meshStandardMaterial color="#555" roughness={0.6} metalness={0.6} />
        </mesh>
        {[-0.3, 0, 0.3].map((offset, i) => (
          <mesh key={`exh-${i}`} position={[0, offset, 0.06]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.05, 0.6]} />
            <meshStandardMaterial color="#333" roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* ─── ELECTRICAL PANELS ─── */}
      {[-10, -7, -4].map((x, i) => (
        <group key={`ep-${i}`} position={[x, 4, -13.7]}>
          <mesh>
            <boxGeometry args={[1.2, 1.5, 0.08]} />
            <meshStandardMaterial color="#4a4a4a" roughness={0.5} metalness={0.7} />
          </mesh>
          {[0.5, 0.3, 0.1, -0.1, -0.3, -0.5].map((y, bi) => (
            <mesh key={`brk-${i}-${bi}`} position={[0, y, 0.05]}>
              <boxGeometry args={[0.4, 0.1, 0.02]} />
              <meshStandardMaterial color="#333" roughness={0.4} metalness={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ─── MISC EQUIPMENT ─── */}
      {/* Oil filter */}
      <group position={[-9.5, 1.5, -7]}>
        <mesh>
          <cylinderGeometry args={[0.18, 0.2, 0.6, 12]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.06, 12]} />
          <meshStandardMaterial color="#aaa" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Butterfly valve on pipe */}
      <group position={[8, 5.5, -13.5]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.08, 12]} />
          <meshStandardMaterial color="#c4833a" roughness={0.25} metalness={1.0} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.4, 0.06, 0.06]} />
          <meshStandardMaterial color="#999" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Thermometer well on pipe */}
      <group position={[5, 5.5, -13.5]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
          <meshStandardMaterial color="#999" roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <sphereGeometry args={[0.06, 6, 6]} />
          <meshStandardMaterial color="#cc3333" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>

      {/* Pipe support clamps */}
      {[[-5, 7], [3, 7], [-3, 5.5], [6, 5.5]].map(([x, y], i) => (
        <mesh key={`pclamp-${i}`} position={[x, y, -13.5]}>
          <boxGeometry args={[0.15, 0.08, 0.06]} />
          <meshStandardMaterial color="#666" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}

      {/* Pressure gauge on left wall */}
      <group position={[-13.5, 2, 2]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.12, 0.12, 0.06, 16]} />
          <meshStandardMaterial color="#c4833a" roughness={0.2} metalness={1.0} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.1, 16]} />
          <meshStandardMaterial color="#f5f0e6" roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.015, 0.1, 4]} />
          <meshStandardMaterial color="#cc0000" roughness={0.3} metalness={0.8} />
        </mesh>
      </group>

      {/* Wall clock */}
      <group position={[13.5, 8, 4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.25, 0.25, 0.04, 24]} />
          <meshStandardMaterial color="#888" roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.23, 24]} />
          <meshStandardMaterial color="#f5f0e6" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.02, 0.18, 0.015]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 3]}>
          <boxGeometry args={[0.015, 0.12, 0.015]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
      </group>

      {/* Warning signs */}
      {[[-13.6, 6, -8], [13.6, 6, 8], [0, 9.2, -13.5]].map(([x, y, z], i) => (
        <group key={`sign-${i}`} position={[x, y, z]} rotation={[0, i === 0 ? -Math.PI / 2 : i === 1 ? Math.PI / 2 : 0, 0]}>
          <mesh>
            <boxGeometry args={[0.5, 0.3, 0.02]} />
            <meshStandardMaterial color="#c8a830" roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.015]}>
            <planeGeometry args={[0.44, 0.24]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Additional pipe on ceiling run */}
      <mesh position={[5, 9.2, -4]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 14, 6]} />
        <meshStandardMaterial color="#5a7a5a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Water filter housing */}
      <group position={[-7, 1.8, -13.5]}>
        <mesh>
          <cylinderGeometry args={[0.15, 0.15, 0.8, 12]} />
          <meshStandardMaterial color="#aaa" roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.06, 12]} />
          <meshStandardMaterial color="#888" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* Short stub pipes on floor */}
      {[[8, 0, 10], [8, 0, 8], [-8, 0, 10]].map(([x, y, z], i) => (
        <mesh key={`stub-${i}`} position={[x, y, z]}>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
          <meshStandardMaterial color="#5a8a5a" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* Valve handwheels on pipes */}
      {[[-4, 8.5], [4, 7], [-8, 5.5], [8, 3]].map(([x, y], i) => (
        <group key={`hw-${i}`} position={[x, y, -13.6]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
            <meshStandardMaterial color="#666" roughness={0.4} metalness={0.8} />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.25, 0.03, 0.03]} />
            <meshStandardMaterial color="#555" roughness={0.5} metalness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Floor markings / hatch */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshStandardMaterial color="#3d3d00" roughness={0.9} />
      </mesh>

      {/* Pipe identification bands */}
      {[[-12, 8.5, 0], [12, 7, 0], [0, 5.5, -13.8]].map(([x, y, z], i) => (
        <mesh key={`band-${i}`} position={[x, y, z]} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.03, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}
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

export default function App() {
  const [showCxAlloy, setShowCxAlloy] = useState(false);

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

      {/* HMI Panel */}
      <HMIPanel />

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
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}