import { PerspectiveCamera } from '@react-three/drei';

function LightingRig() {
  return (
    <>
      {/* Bright ambient */}
      <ambientLight intensity={0.6} color="#c8d8e8" />
      {/* Main key light */}
      <directionalLight
        position={[20, 40, 15]}
        intensity={1.8}
        color="#fffaf0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-bias={-0.0003}
        shadow-radius={6}
      />
      {/* Fill light — warm */}
      <pointLight position={[-15, 15, 10]} intensity={1.2} color="#ffe8cc" />
      {/* Cool accent from opposite side */}
      <pointLight position={[15, 10, -15]} intensity={0.8} color="#cce8ff" />
      {/* Overhead fill */}
      <pointLight position={[0, 25, 0]} intensity={0.6} color="#ffffff" />
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
