import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

/** Orbit / framing pivot near the chiller body (model sits on y ≈ 0.8). */
export const CHILLER_ORBIT_TARGET: [number, number, number] = [0, 2, 0];

/** Default “walk up” view: in front (+Z), elevated, looking at the chiller center. */
export const DEFAULT_SIM_CAMERA_POSITION: [number, number, number] = [0, 4.5, 18];

function ChillerFramedCamera() {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(
      DEFAULT_SIM_CAMERA_POSITION[0],
      DEFAULT_SIM_CAMERA_POSITION[1],
      DEFAULT_SIM_CAMERA_POSITION[2],
    );
    camera.lookAt(
      new THREE.Vector3(CHILLER_ORBIT_TARGET[0], CHILLER_ORBIT_TARGET[1], CHILLER_ORBIT_TARGET[2]),
    );
    camera.updateMatrixWorld();
  }, [camera]);
  return null;
}

/** Sun direction (azimuth from +X CCW, in world units) — also feeds <Sky> in App.tsx */
export const SUN_POSITION: [number, number, number] = [60, 80, 40];

function LightingRig() {
  return (
    <>
      {/* Outdoor sky/ground hemisphere ambient — warm sunlit sky vs. cool grass bounce */}
      <hemisphereLight args={['#cfe6ff', '#7a8a55', 0.85]} />
      {/* Soft ambient floor */}
      <ambientLight intensity={0.35} color="#e6ecf2" />
      {/* Sun — high noon-ish, casting long shadows across the deck and yard */}
      <directionalLight
        position={SUN_POSITION}
        intensity={3.2}
        color="#fff4dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-90}
        shadow-camera-right={90}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-camera-near={1}
        shadow-camera-far={250}
        shadow-bias={-0.0003}
        shadow-radius={8}
      />
      {/* Warm interior fill (windowless equipment shed reads dim without these) */}
      <pointLight position={[-25, 10, 15]} intensity={1.2} color="#ffe8cc" />
      <pointLight position={[25, 10, -25]} intensity={1.0} color="#cce8ff" />
      <pointLight position={[0, 11, 0]} intensity={0.9} color="#ffffff" />
    </>
  );
}

export function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault fov={45} near={0.1} far={500} />
      <ChillerFramedCamera />
      <LightingRig />
    </>
  );
}
