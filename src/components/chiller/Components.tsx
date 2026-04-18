import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// PBR Material presets for realistic industrial equipment
export const materials = {
  stainlessSteel: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#b8c4c8"),
    metalness: 0.95,
    roughness: 0.30,
    envMapIntensity: 1.2,
  }),

  carbonSteel: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#6b7174"),
    metalness: 0.85,
    roughness: 0.45,
  }),

  // York brand green for compressor and vessel components
  yorkGreen: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1e5631"),
    metalness: 0.3,
    roughness: 0.6,
  }),

  // Steel gray for condenser/evaporator barrels (modern York style)
  vesselGray: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#7a7d7e"),
    metalness: 0.7,
    roughness: 0.4,
  }),

  copper: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#b87333"),
    metalness: 1.0,
    roughness: 0.25,
    envMapIntensity: 1.0,
  }),

  brass: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#d4af37"),
    metalness: 1.0,
    roughness: 0.20,
    envMapIntensity: 1.0,
  }),

  castIron: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#3a3a3a"),
    metalness: 0.6,
    roughness: 0.70,
  }),

  paintedPanel: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#e8e8e8"),
    metalness: 0.0,
    roughness: 0.60,
  }),

  darkPanel: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1a1d21"),
    metalness: 0.1,
    roughness: 0.5,
  }),

  rubber: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1a1a1a"),
    metalness: 0.0,
    roughness: 0.90,
  }),

  glass: new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#ffffff"),
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 0.5,
    ior: 1.5,
    transparent: true,
  }),

  gaugeFace: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f5f0e6"),
    metalness: 0.0,
    roughness: 0.10,
  }),

  insulation: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#e8e8e8"),
    metalness: 0.0,
    roughness: 0.85,
  }),

  aluminum: new THREE.MeshStandardMaterial({
    color: new THREE.Color("#d0d0d0"),
    metalness: 0.90,
    roughness: 0.35,
  }),
};

// Pipe segment with flanges
export function Pipe({ start, end, radius = 0.15, material = materials.copper }: {
  start: [number, number, number];
  end: [number, number, number];
  radius?: number;
  material?: THREE.Material;
}) {
  const { position, rotation, length } = useMemo(() => {
    const startV = new THREE.Vector3(...start);
    const endV = new THREE.Vector3(...end);
    const direction = new THREE.Vector3().subVectors(endV, startV);
    const len = direction.length();

    const midPoint = new THREE.Vector3().addVectors(startV, endV).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: [midPoint.x, midPoint.y, midPoint.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      length: len,
    };
  }, [start, end]);

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Pipe flanges at ends */}
      <mesh position={[0, length / 2, 0]} castShadow>
        <cylinderGeometry args={[radius * 1.8, radius * 1.8, 0.08, 16]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>
      <mesh position={[0, -length / 2, 0]} castShadow>
        <cylinderGeometry args={[radius * 1.8, radius * 1.8, 0.08, 16]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>
    </group>
  );
}

// Valve component (ball valve style)
export function Valve({
  position,
  rotation = [0, 0, 0],
  open = true,
  onClick,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  open?: boolean;
  onClick?: () => void;
}) {
  const handleRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (handleRef.current) {
      const targetRotation = open ? 0 : Math.PI / 2;
      handleRef.current.rotation.y = THREE.MathUtils.lerp(
        handleRef.current.rotation.y,
        targetRotation,
        0.1
      );
    }
  });

  return (
    <group position={position} rotation={rotation} onClick={onClick}>
      {/* Valve body */}
      <mesh castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>
      {/* Inlet */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.3, 12]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>
      {/* Outlet */}
      <mesh position={[0, -0.35, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.3, 12]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>
      {/* Handle */}
      <group ref={handleRef} position={[0.3, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.08, 0.08]} />
          <primitive object={materials.stainlessSteel} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

// Pressure vessel (shell-and-tube exchanger style)
export function PressureVessel({
  position,
  length = 4,
  radius = 1.2,
  material = materials.carbonSteel,
  headType = 'elliptical',
}: {
  position: [number, number, number];
  length?: number;
  radius?: number;
  material?: THREE.Material;
  headType?: 'elliptical' | 'hemispherical' | 'flanged';
}) {
  return (
    <group position={position}>
      {/* Shell cylinder */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, length, 32]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Tube bundle (simplified representation) */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius * 0.85, radius * 0.85, length - 0.2, 32]} />
        <primitive object={materials.copper} attach="material" />
      </mesh>

      {/* Heads based on type */}
      {headType === 'elliptical' && (
        <>
          <mesh position={[-length / 2, 0, 0]} castShadow>
            <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <primitive object={material} attach="material" />
          </mesh>
          <mesh position={[length / 2, 0, 0]} rotation={[Math.PI, 0, 0]} castShadow>
            <sphereGeometry args={[radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <primitive object={material} attach="material" />
          </mesh>
        </>
      )}

      {/* Waterboxes */}
      <mesh position={[-length / 2 - 0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.7, radius * 0.7, 0.5, 24]} />
        <primitive object={materials.aluminum} attach="material" />
      </mesh>
      <mesh position={[length / 2 + 0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.7, radius * 0.7, 0.5, 24]} />
        <primitive object={materials.aluminum} attach="material" />
      </mesh>

      {/* Waterbox covers (flanged) */}
      <mesh position={[-length / 2 - 0.8, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.75, radius * 0.75, 0.15, 24]} />
        <primitive object={materials.stainlessSteel} attach="material" />
      </mesh>
      <mesh position={[length / 2 + 0.8, 0, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.75, radius * 0.75, 0.15, 24]} />
        <primitive object={materials.stainlessSteel} attach="material" />
      </mesh>

      {/* Support legs */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * length * 0.3, -radius - 0.3, 0]} castShadow>
          <boxGeometry args={[0.3, 0.6, radius * 1.5]} />
          <primitive object={materials.carbonSteel} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// Compressor body (centrifugal style)
export function CompressorBody({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Main casing */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1.5, 32, 32]} />
        <primitive object={materials.castIron} attach="material" />
      </mesh>

      {/* Discharge nozzle */}
      <mesh position={[1.2, 0.5, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 1.2, 16]} />
        <primitive object={materials.castIron} attach="material" />
      </mesh>

      {/* Suction nozzle */}
      <mesh position={[-1.3, -0.3, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
        <cylinderGeometry args={[0.5, 0.4, 0.8, 16]} />
        <primitive object={materials.castIron} attach="material" />
      </mesh>

      {/* Motor housing */}
      <mesh position={[-1.8, 0, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.8, 2, 24]} />
        <primitive object={materials.paintedPanel} attach="material" />
      </mesh>

      {/* Coupling guard */}
      <mesh position={[-0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 1.5, 16]} />
        <primitive object={materials.stainlessSteel} attach="material" />
      </mesh>

      {/* Oil sump */}
      <mesh position={[0, -1.3, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.7, 0.4, 16]} />
        <primitive object={materials.castIron} attach="material" />
      </mesh>

      {/* Mounting base */}
      <mesh position={[0, -1.8, 0]} castShadow>
        <boxGeometry args={[3, 0.3, 2]} />
        <primitive object={materials.carbonSteel} attach="material" />
      </mesh>
    </group>
  );
}

// Oil reservoir with sight glass
export function OilSystem({
  position,
}: {
  position: [number, number, number];
}) {
  const heaterGlowRef = useRef<THREE.Mesh>(null);

  return (
    <group position={position}>
      {/* Oil reservoir body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.6, 1.2, 24]} />
        <primitive object={materials.carbonSteel} attach="material" />
      </mesh>

      {/* Sight glass with oil level */}
      <mesh position={[0.55, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.6, 0.4]} />
        <primitive object={materials.glass} attach="material" />
      </mesh>

      {/* Oil level indicator (amber colored) */}
      <mesh position={[0.56, -0.1, 0]}>
        <boxGeometry args={[0.06, 0.3, 0.3]} />
        <meshStandardMaterial
          color="#d4a020"
          emissive="#d4a020"
          emissiveIntensity={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Heater element (visible through glass when active) */}
      <mesh ref={heaterGlowRef} position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.4, 8]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff4400"
          emissiveIntensity={0}
        />
      </mesh>

      {/* Pipe connections */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>
      <mesh position={[0, -0.8, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>
    </group>
  );
}

// Bourdon tube pressure gauge
interface PressureGaugeProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  value?: number;
  maxValue?: number;
}

export function PressureGauge({
  position,
  rotation = [0, 0, 0],
  value = 60, // psig
  maxValue = 150,
}: PressureGaugeProps) {
  const needleRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (needleRef.current) {
      const targetAngle = (value / maxValue) * Math.PI * 2 - Math.PI / 2;
      needleRef.current.rotation.z = THREE.MathUtils.lerp(
        needleRef.current.rotation.z,
        -targetAngle,
        0.1
      );
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Gauge body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.35, 0.35, 0.15, 32]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>

      {/* Gauge face */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 32]} />
        <primitive object={materials.gaugeFace} attach="material" />
      </mesh>

      {/* Gauge bezel */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.32, 0.04, 8, 32]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>

      {/* Needle */}
      <group ref={needleRef} position={[0, 0.12, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
          <coneGeometry args={[0.03, 0.25, 4]} />
          <meshStandardMaterial color="#cc0000" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Center cap */}
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>
    </group>
  );
}

// Indicator light
export function IndicatorLight({
  position,
  color = 'red',
  active = false,
}: {
  position: [number, number, number];
  color?: 'red' | 'amber' | 'green';
  active?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const targetIntensity = active ? 2.0 : 0;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity, 0.1);
    }
  });

  const colorMap = {
    red: '#ff3b3b',
    amber: '#ffb84d',
    green: '#3bff6f',
  };

  return (
    <group position={position}>
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={colorMap[color]}
          emissive={colorMap[color]}
          emissiveIntensity={active ? 2.0 : 0}
        />
      </mesh>
      {/* Bezel */}
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
        <primitive object={materials.brass} attach="material" />
      </mesh>
    </group>
  );
}

// Digital display (7-segment style)
export function DigitalDisplay({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* Display housing */}
      <mesh>
        <boxGeometry args={[0.8, 0.4, 0.1]} />
        <primitive object={materials.darkPanel} attach="material" />
      </mesh>

      {/* Display screen */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[0.7, 0.3]} />
        <meshStandardMaterial
          color="#0a0f0a"
          emissive="#003300"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}
