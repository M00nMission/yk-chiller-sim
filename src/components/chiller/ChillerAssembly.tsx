import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulationStore } from '../../store/useSimulationStore';
import {
  materials,
  Pipe,
  Valve,
  PressureVessel,
  CompressorBody,
  OilSystem,
  PressureGauge,
  IndicatorLight,
} from './Components';

export function ChillerAssembly() {
  return (
    <group position={[0, 0, 0]}>
      <CompressorAssembly position={[-3, 2, 0]} />
      <CondenserAssembly position={[0, 2, 0]} />
      <EvaporatorAssembly position={[3, 2, 0]} />
      <OilSystemAssembly position={[-5, 1.5, 0]} />
      <PipingNetwork />
      <InstrumentationPanel position={[0, 4.5, 3]} />
    </group>
  );
}

export function CompressorAssembly({ position }: { position: [number, number, number] }) {
  const impellerRef = useRef<THREE.Group>(null);
  const { state } = useSimulationStore();

  useFrame((_, delta) => {
    if (impellerRef.current && state.compressorRunning) {
      impellerRef.current.rotation.z += delta * 15;
    }
  });

  return (
    <group position={position}>
      <CompressorBody position={[0, 0, 0]} />

      {/* Impeller animation wrapper */}
      <group ref={impellerRef} position={[0, 0, 0]}>
        <mesh visible={false}>
          <sphereGeometry args={[0.01]} />
        </mesh>
      </group>

      {/* Coupling guard detail */}
      <mesh position={[-0.5, 0, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 0.05]} />
        <primitive object={materials.stainlessSteel} attach="material" />
      </mesh>

      {/* Discharge line connection */}
      <Pipe
        start={[1.5, 0.8, 0]}
        end={[2.5, 1.5, 0]}
        radius={0.2}
        material={materials.copper}
      />
    </group>
  );
}

export function CondenserAssembly({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <PressureVessel
        position={[0, 0, 0]}
        length={5}
        radius={1.2}
        material={materials.carbonSteel}
        headType="elliptical"
      />

      {/* Condenser waterbox labels */}
      <mesh position={[-3, 0.8, 0]}>
        <boxGeometry args={[0.1, 0.3, 0.1]} />
        <primitive object={materials.aluminum} attach="material" />
      </mesh>
      <mesh position={[3, 0.8, 0]}>
        <boxGeometry args={[0.1, 0.3, 0.1]} />
        <primitive object={materials.aluminum} attach="material" />
      </mesh>

      {/* Water connections */}
      <mesh position={[0, 1.2, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
        <primitive object={materials.copper} attach="material" />
      </mesh>
      <mesh position={[0, 1.2, -0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
        <primitive object={materials.copper} attach="material" />
      </mesh>

      {/* Vent valve */}
      <group position={[2.5, 1.5, 0]}>
        <Valve position={[0, 0, 0]} open={true} />
      </group>
    </group>
  );
}

export function EvaporatorAssembly({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <PressureVessel
        position={[0, 0, 0]}
        length={5}
        radius={1.2}
        material={materials.carbonSteel}
        headType="elliptical"
      />

      {/* Refrigerant sight glass */}
      <group position={[0, -1.5, 1.2]}>
        <mesh>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
          <primitive object={materials.glass} attach="material" />
        </mesh>
        {/* Bubble indicator */}
        <mesh position={[0, 0, 0.06]}>
          <circleGeometry args={[0.08, 8]} />
          <meshStandardMaterial
            color="#aaddff"
            emissive="#88ccff"
            emissiveIntensity={0.3}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>

      {/* Water connections */}
      <mesh position={[0, 1.2, 0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
        <primitive object={materials.copper} attach="material" />
      </mesh>
      <mesh position={[0, 1.2, -0.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
        <primitive object={materials.copper} attach="material" />
      </mesh>
    </group>
  );
}

export function OilSystemAssembly({ position }: { position: [number, number, number] }) {
  const { state } = useSimulationStore();
  const heaterRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (heaterRef.current) {
      const mat = heaterRef.current.material as THREE.MeshStandardMaterial;
      const targetIntensity = state.oilHeaterOn ? 1.5 : 0;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetIntensity, 0.1);
    }
  });

  return (
    <group position={position}>
      <OilSystem position={[0, 0, 0]} />

      {/* Oil heater glow */}
      <mesh ref={heaterRef} position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.3, 8]} />
        <meshStandardMaterial
          color="#ff4400"
          emissive="#ff2200"
          emissiveIntensity={0}
        />
      </mesh>

      {/* Oil lines */}
      <Pipe
        start={[0.6, 0.5, 0]}
        end={[2, 1, 0]}
        radius={0.08}
        material={materials.brass}
      />
      <Pipe
        start={[0.6, -0.5, 0]}
        end={[2, -1, 0]}
        radius={0.08}
        material={materials.brass}
      />
    </group>
  );
}

export function PipingNetwork() {
  const { valves, toggleValve } = useSimulationStore();

  return (
    <group>
      {/* Discharge line: Compressor to Condenser */}
      <Pipe
        start={[-1.5, 2.8, 0]}
        end={[0, 3.5, 0]}
        radius={0.25}
        material={materials.copper}
      />

      {/* Suction line: Evaporator to Compressor */}
      <Pipe
        start={[1.5, 2.8, 0]}
        end={[1, 2.5, 0]}
        radius={0.35}
        material={materials.copper}
      />

      {/* Liquid line: Condenser to Evaporator (with expansion device) */}
      <Pipe
        start={[0, 3.2, 0.8]}
        end={[1.5, 3.2, 0.8]}
        radius={0.15}
        material={materials.copper}
      />

      {/* Expansion device representation */}
      <group position={[0.8, 3.2, 0.8]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.4, 12]} />
          <primitive object={materials.brass} attach="material" />
        </mesh>
        {/* Sensing bulb */}
        <mesh position={[0.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
          <primitive object={materials.copper} attach="material" />
        </mesh>
      </group>

      {/* Oil return line */}
      <Pipe
        start={[-4.5, 2, 0]}
        end={[-3, 2.5, 0]}
        radius={0.06}
        material={materials.brass}
      />

      {/* Interactive valves */}
      {valves.filter(v => v.id === 'discharge').map((valve) => (
        <group key={valve.id} position={[-2, 3, 0]} onClick={() => toggleValve('discharge')}>
          <Valve position={[0, 0, 0]} open={valve.open} />
        </group>
      ))}

      {valves.filter(v => v.id === 'suction').map((valve) => (
        <group key={valve.id} position={[1.5, 3, 0]} onClick={() => toggleValve('suction')}>
          <Valve position={[0, 0, 0]} open={valve.open} />
        </group>
      ))}

      {valves.filter(v => v.id === 'liquidLine').map((valve) => (
        <group key={valve.id} position={[2.5, 3.2, 0.8]} onClick={() => toggleValve('liquidLine')}>
          <Valve position={[0, 0, 0]} open={valve.open} />
        </group>
      ))}
    </group>
  );
}

export function InstrumentationPanel({ position }: { position: [number, number, number] }) {
  const { state } = useSimulationStore();

  return (
    <group position={position}>
      {/* Panel frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[4, 2, 0.3]} />
        <primitive object={materials.darkPanel} attach="material" />
      </mesh>

      {/* Panel mounting posts */}
      {[[-1.8, -0.8], [1.8, -0.8], [-1.8, 0.8], [1.8, 0.8]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, -0.2]}>
          <boxGeometry args={[0.1, 0.1, 0.3]} />
          <primitive object={materials.carbonSteel} attach="material" />
        </mesh>
      ))}

      {/* Suction Pressure Gauge */}
      <group position={[-1.3, 0.4, 0.2]}>
        <PressureGauge position={[0, 0, 0]} value={state.suctionPressure} maxValue={150} />
      </group>

      {/* Discharge Pressure Gauge */}
      <group position={[0, 0.4, 0.2]}>
        <PressureGauge position={[0, 0, 0]} value={state.dischargePressure} maxValue={300} />
      </group>

      {/* Oil Pressure Gauge */}
      <group position={[1.3, 0.4, 0.2]}>
        <PressureGauge position={[0, 0, 0]} value={state.oilPressure} maxValue={200} />
      </group>

      {/* Status LEDs */}
      <group position={[-1.3, -0.4, 0.2]}>
        <IndicatorLight position={[-0.3, 0, 0]} color="green" active={state.compressorRunning} />
        <IndicatorLight position={[0, 0, 0]} color="amber" active={state.oilHeaterOn} />
        <IndicatorLight position={[0.3, 0, 0]} color="red" active={state.highDischargePressureTrip} />
      </group>

      {/* Panel nameplate */}
      <mesh position={[0, -0.8, 0.16]}>
        <boxGeometry args={[1.2, 0.25, 0.02]} />
        <primitive object={materials.paintedPanel} attach="material" />
      </mesh>
    </group>
  );
}
