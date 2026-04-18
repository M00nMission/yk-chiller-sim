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

      {/* Concrete slab sections */}
      {[[-30, -30], [-30, 0], [-30, 30], [0, -30], [0, 0], [0, 30], [30, -30], [30, 0], [30, 30]].map(([x, z], i) => (
        <mesh key={`slab-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.03, z]}>
          <planeGeometry args={[59.9, 59.9]} />
          <meshStandardMaterial color="#8c8780" roughness={0.98} metalness={0.01} />
        </mesh>
      ))}

      {/* Traction grooves */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;
        const len = 0.5 + Math.random() * 1.5;
        const angle = (Math.random() - 0.5) * Math.PI;
        return (
          <mesh key={`groove-${i}`} rotation={[-Math.PI / 2, 0, angle]} position={[x, -0.02, z]}>
            <planeGeometry args={[len, 0.04]} />
            <meshStandardMaterial color="#7a756e" roughness={1.0} />
          </mesh>
        );
      })}

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