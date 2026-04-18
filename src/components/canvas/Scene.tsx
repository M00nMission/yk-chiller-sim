import { PerspectiveCamera } from '@react-three/drei';

function LightingRig() {
  return (
    <>
      {/* Strong ambient */}
      <ambientLight intensity={0.8} color="#d0d8e0" />
      {/* Main key light */}
      <directionalLight
        position={[20, 50, 20]}
        intensity={2.5}
        color="#fffaf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0003}
        shadow-radius={8}
      />
      {/* Fill light — warm */}
      <pointLight position={[-25, 20, 15]} intensity={1.8} color="#ffe8cc" />
      {/* Cool accent from opposite side */}
      <pointLight position={[25, 15, -25]} intensity={1.5} color="#cce8ff" />
      {/* Overhead fill */}
      <pointLight position={[0, 30, 0]} intensity={1.2} color="#ffffff" />
    </>
  );
}

export function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault fov={45} near={0.1} far={500} />
      <LightingRig />
    </>
  );
}
