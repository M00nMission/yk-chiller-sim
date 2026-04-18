import { PerspectiveCamera } from '@react-three/drei';

function LightingRig() {
  return (
    <>
      <ambientLight intensity={0.25} color="#b0c0d0" />
      <directionalLight
        position={[20, 30, 10]}
        intensity={0.9}
        color="#fff8f0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0002}
        shadow-radius={4}
      />
      <pointLight position={[-10, 8, -5]} intensity={0.3} color="#ffdd99" />
      <pointLight position={[10, 5, 8]} intensity={0.25} color="#99ccff" />
    </>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial
        color="#2a2a2a"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

function GridLines() {
  return (
    <gridHelper args={[60, 60, "#333333", "#222222"]} position={[0, 0.01, 0]} />
  );
}

export function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault fov={45} near={0.1} far={200} />
      <LightingRig />
      <Floor />
      <GridLines />
    </>
  );
}
