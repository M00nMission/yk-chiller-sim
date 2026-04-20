/* ============================================================================
   Technician.tsx
   A commercial HVAC field technician avatar built from primitive geometry.

   Outfit:
     • Yellow Class-E hard hat (cap-style w/ brim)
     • Dark wraparound safety glasses
     • Hi-vis ANSI Class-2 vest with two reflective bands
     • Long-sleeve shirt (carbon-blue) + work pants (charcoal)
     • Tool belt with two pouches and a steel buckle
     • Steel-toe leather work boots with metallic toe accent
     • Aluminum clipboard in right hand for inspection notes

   The model faces local +Z (so rotation.y = 0 ⇒ facing world +Z).
   Animation is driven by the `motionState` prop:
       'idle' → subtle breathing
       'walk' → moderate gait, arms counter-swing, slight bob
       'run'  → faster cadence, larger swing, heavier bob
============================================================================ */

import { forwardRef, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── palette ───────────────────────────────────────────────────────────── */
const SKIN              = '#dca586';
const HAIR              = '#3a2a1a';
const HARDHAT           = '#fcd116';   // safety yellow
const HARDHAT_RIDGE     = '#e6b912';
const GLASS_FRAME       = '#1a1a1a';
const GLASS_LENS        = '#1c2a3a';
const VEST              = '#ff8c00';   // hi-vis orange
const VEST_REFLECTIVE   = '#e8edf0';
const SHIRT             = '#1f3a5a';
const PANTS             = '#23272d';
const BELT              = '#1a1208';
const BUCKLE            = '#a8a8a8';
const POUCH             = '#3a2810';
const BOOT              = '#3a2412';
const BOOT_SOLE         = '#0e0a06';
const STEEL_TOE         = '#9a9a9a';
const CLIPBOARD         = '#cfb87c';
const CLIPBOARD_CLIP    = '#888';

/* ─── props ─────────────────────────────────────────────────────────────── */
export interface TechnicianProps {
  motionState?: 'idle' | 'walk' | 'run';
}

export const Technician = forwardRef<THREE.Group, TechnicianProps>(
  function Technician({ motionState = 'idle' }, ref) {
    const bodyRef     = useRef<THREE.Group>(null);
    const leftLegRef  = useRef<THREE.Group>(null);
    const rightLegRef = useRef<THREE.Group>(null);
    const leftArmRef  = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);
    const phaseRef    = useRef(0);

    // Lift entire body so the boot sole rests on world y = 0 when the
    // outer wrapper group is positioned at floor level.
    const BASE_Y = 0.10;

    useFrame((_, delta) => {
      if (motionState === 'idle') {
        phaseRef.current += delta * 1.2;
        const breathe = Math.sin(phaseRef.current) * 0.012;
        if (bodyRef.current) bodyRef.current.position.y = BASE_Y + breathe;
        // ease limbs back toward neutral
        const ease = (g: THREE.Group | null) => {
          if (g) g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, 0, 0.18);
        };
        ease(leftLegRef.current);
        ease(rightLegRef.current);
        ease(leftArmRef.current);
        ease(rightArmRef.current);
        return;
      }
      const cadence  = motionState === 'run' ? 9.5 : 5.5;
      const swing    = motionState === 'run' ? 0.85 : 0.5;
      const armSwing = motionState === 'run' ? 1.0  : 0.6;
      const bobAmt   = motionState === 'run' ? 0.07 : 0.035;
      phaseRef.current += delta * cadence;
      const phase = phaseRef.current;
      const bob = Math.abs(Math.sin(phase)) * bobAmt;
      if (bodyRef.current)     bodyRef.current.position.y     = BASE_Y + bob;
      if (leftLegRef.current)  leftLegRef.current.rotation.x  =  Math.sin(phase) * swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.sin(phase) * swing;
      if (leftArmRef.current)  leftArmRef.current.rotation.x  = -Math.sin(phase) * armSwing;
      if (rightArmRef.current) rightArmRef.current.rotation.x =  Math.sin(phase) * armSwing;
    });

    return (
      <group ref={ref} name="Technician">
        <group ref={bodyRef}>
          {/* ─────── LEGS & BOOTS ─────── */}
          {/* Left leg (character's left = world +X when facing +Z) */}
          <group ref={leftLegRef} position={[0.11, 0.92, 0]}>
            {/* upper leg */}
            <mesh position={[0, -0.22, 0]} castShadow>
              <cylinderGeometry args={[0.10, 0.085, 0.46, 12]} />
              <meshStandardMaterial color={PANTS} roughness={0.78} />
            </mesh>
            {/* knee */}
            <mesh position={[0, -0.46, 0]}>
              <sphereGeometry args={[0.085, 12, 8]} />
              <meshStandardMaterial color={PANTS} roughness={0.78} />
            </mesh>
            {/* lower leg */}
            <mesh position={[0, -0.66, 0]} castShadow>
              <cylinderGeometry args={[0.085, 0.075, 0.36, 12]} />
              <meshStandardMaterial color={PANTS} roughness={0.78} />
            </mesh>
            {/* boot */}
            <Boot position={[0, -0.88, 0]} />
          </group>

          {/* Right leg */}
          <group ref={rightLegRef} position={[-0.11, 0.92, 0]}>
            <mesh position={[0, -0.22, 0]} castShadow>
              <cylinderGeometry args={[0.10, 0.085, 0.46, 12]} />
              <meshStandardMaterial color={PANTS} roughness={0.78} />
            </mesh>
            <mesh position={[0, -0.46, 0]}>
              <sphereGeometry args={[0.085, 12, 8]} />
              <meshStandardMaterial color={PANTS} roughness={0.78} />
            </mesh>
            <mesh position={[0, -0.66, 0]} castShadow>
              <cylinderGeometry args={[0.085, 0.075, 0.36, 12]} />
              <meshStandardMaterial color={PANTS} roughness={0.78} />
            </mesh>
            <Boot position={[0, -0.88, 0]} />
          </group>

          {/* ─────── HIPS / TOOL BELT ─────── */}
          <mesh position={[0, 0.92, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.18, 14]} />
            <meshStandardMaterial color={PANTS} roughness={0.78} />
          </mesh>
          <mesh position={[0, 0.96, 0]}>
            <cylinderGeometry args={[0.232, 0.232, 0.07, 16]} />
            <meshStandardMaterial color={BELT} roughness={0.7} />
          </mesh>
          {/* belt buckle */}
          <mesh position={[0, 0.96, 0.232]}>
            <boxGeometry args={[0.10, 0.07, 0.018]} />
            <meshStandardMaterial color={BUCKLE} roughness={0.35} metalness={0.9} />
          </mesh>
          {/* pouches */}
          <ToolPouch position={[ 0.22, 0.86,  0.10]} />
          <ToolPouch position={[-0.22, 0.86, -0.05]} flip />
          {/* hammer loop on right hip */}
          <mesh position={[-0.27, 0.85, 0.12]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.04, 0.18, 0.04]} />
            <meshStandardMaterial color="#5a3a1a" roughness={0.7} />
          </mesh>
          <mesh position={[-0.30, 0.96, 0.13]} rotation={[0, 0, 0.2]}>
            <boxGeometry args={[0.06, 0.06, 0.10]} />
            <meshStandardMaterial color="#222" roughness={0.5} metalness={0.7} />
          </mesh>

          {/* ─────── TORSO (vest + shirt) ─────── */}
          <group position={[0, 1.32, 0]}>
            {/* shirt visible at neckline + sides */}
            <mesh castShadow>
              <cylinderGeometry args={[0.21, 0.22, 0.62, 14]} />
              <meshStandardMaterial color={SHIRT} roughness={0.78} />
            </mesh>
            {/* hi-vis vest body */}
            <mesh position={[0, -0.02, 0]} castShadow>
              <boxGeometry args={[0.49, 0.55, 0.33]} />
              <meshStandardMaterial
                color={VEST}
                roughness={0.65}
                emissive={VEST}
                emissiveIntensity={0.15}
              />
            </mesh>
            {/* upper reflective tape band */}
            <mesh position={[0, 0.10, 0]}>
              <boxGeometry args={[0.495, 0.055, 0.335]} />
              <meshStandardMaterial
                color={VEST_REFLECTIVE}
                roughness={0.25}
                metalness={0.45}
                emissive={VEST_REFLECTIVE}
                emissiveIntensity={0.18}
              />
            </mesh>
            {/* lower reflective tape band */}
            <mesh position={[0, -0.13, 0]}>
              <boxGeometry args={[0.495, 0.055, 0.335]} />
              <meshStandardMaterial
                color={VEST_REFLECTIVE}
                roughness={0.25}
                metalness={0.45}
                emissive={VEST_REFLECTIVE}
                emissiveIntensity={0.18}
              />
            </mesh>
            {/* center zipper / closure (shirt visible through gap) */}
            <mesh position={[0, -0.02, 0.171]}>
              <boxGeometry args={[0.04, 0.55, 0.005]} />
              <meshStandardMaterial color={SHIRT} roughness={0.7} />
            </mesh>
            {/* two upper-vest patch pockets */}
            <mesh position={[ 0.13, 0.04, 0.171]}>
              <boxGeometry args={[0.13, 0.13, 0.012]} />
              <meshStandardMaterial color="#cc6e00" roughness={0.6} />
            </mesh>
            <mesh position={[-0.13, 0.04, 0.171]}>
              <boxGeometry args={[0.13, 0.13, 0.012]} />
              <meshStandardMaterial color="#cc6e00" roughness={0.6} />
            </mesh>
            {/* radio mic clipped to upper-left vest pocket */}
            <mesh position={[0.13, 0.13, 0.18]} rotation={[0, 0, 0.3]}>
              <cylinderGeometry args={[0.018, 0.018, 0.07, 6]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.55} />
            </mesh>
          </group>

          {/* ─────── NECK & HEAD ─────── */}
          <mesh position={[0, 1.66, 0]}>
            <cylinderGeometry args={[0.075, 0.085, 0.12, 12]} />
            <meshStandardMaterial color={SKIN} roughness={0.75} />
          </mesh>

          <group position={[0, 1.83, 0]}>
            {/* head */}
            <mesh castShadow>
              <sphereGeometry args={[0.135, 18, 16]} />
              <meshStandardMaterial color={SKIN} roughness={0.75} />
            </mesh>
            {/* hair (peeking out under hat at sides/back) */}
            <mesh position={[0, -0.005, -0.01]} scale={[1.02, 0.6, 1.02]}>
              <sphereGeometry args={[0.135, 16, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5]} />
              <meshStandardMaterial color={HAIR} roughness={0.85} />
            </mesh>
            {/* ears */}
            <mesh position={[ 0.135, -0.01, 0]}>
              <sphereGeometry args={[0.028, 8, 6]} />
              <meshStandardMaterial color={SKIN} roughness={0.75} />
            </mesh>
            <mesh position={[-0.135, -0.01, 0]}>
              <sphereGeometry args={[0.028, 8, 6]} />
              <meshStandardMaterial color={SKIN} roughness={0.75} />
            </mesh>

            {/* ─── SAFETY GLASSES (wraparound) ─── */}
            {/* lens panel */}
            <mesh position={[0, 0.025, 0.118]}>
              <boxGeometry args={[0.225, 0.055, 0.018]} />
              <meshStandardMaterial
                color={GLASS_LENS}
                roughness={0.12}
                metalness={0.55}
                transparent
                opacity={0.78}
              />
            </mesh>
            {/* upper frame */}
            <mesh position={[0, 0.055, 0.121]}>
              <boxGeometry args={[0.235, 0.012, 0.022]} />
              <meshStandardMaterial color={GLASS_FRAME} roughness={0.4} metalness={0.3} />
            </mesh>
            {/* lower frame */}
            <mesh position={[0, -0.005, 0.121]}>
              <boxGeometry args={[0.235, 0.006, 0.022]} />
              <meshStandardMaterial color={GLASS_FRAME} roughness={0.4} metalness={0.3} />
            </mesh>
            {/* nose bridge */}
            <mesh position={[0, 0.012, 0.13]}>
              <boxGeometry args={[0.022, 0.025, 0.012]} />
              <meshStandardMaterial color={GLASS_FRAME} roughness={0.4} />
            </mesh>
            {/* temples */}
            <mesh position={[ 0.108, 0.028, 0.05]} rotation={[0, 0.32, 0]}>
              <boxGeometry args={[0.012, 0.012, 0.16]} />
              <meshStandardMaterial color={GLASS_FRAME} roughness={0.45} />
            </mesh>
            <mesh position={[-0.108, 0.028, 0.05]} rotation={[0, -0.32, 0]}>
              <boxGeometry args={[0.012, 0.012, 0.16]} />
              <meshStandardMaterial color={GLASS_FRAME} roughness={0.45} />
            </mesh>

            {/* mouth subtle line */}
            <mesh position={[0, -0.058, 0.125]}>
              <boxGeometry args={[0.045, 0.008, 0.005]} />
              <meshStandardMaterial color="#5a3424" roughness={0.7} />
            </mesh>

            {/* ─── HARDHAT (cap-style ANSI Type-I) ─── */}
            {/* main shell — half-sphere on top of head */}
            <mesh position={[0, 0.065, 0]} castShadow>
              <sphereGeometry args={[0.165, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={HARDHAT} roughness={0.42} metalness={0.08} />
            </mesh>
            {/* top center ridge (signature hardhat detail) */}
            <mesh position={[0, 0.215, 0]}>
              <boxGeometry args={[0.022, 0.03, 0.32]} />
              <meshStandardMaterial color={HARDHAT_RIDGE} roughness={0.5} />
            </mesh>
            {/* side ridges */}
            <mesh position={[ 0.10, 0.18, 0]} rotation={[0, 0, -0.45]}>
              <boxGeometry args={[0.018, 0.022, 0.30]} />
              <meshStandardMaterial color={HARDHAT_RIDGE} roughness={0.5} />
            </mesh>
            <mesh position={[-0.10, 0.18, 0]} rotation={[0, 0,  0.45]}>
              <boxGeometry args={[0.018, 0.022, 0.30]} />
              <meshStandardMaterial color={HARDHAT_RIDGE} roughness={0.5} />
            </mesh>
            {/* short rear/side brim ring */}
            <mesh position={[0, 0.062, 0]}>
              <cylinderGeometry args={[0.20, 0.20, 0.022, 22]} />
              <meshStandardMaterial color={HARDHAT} roughness={0.42} />
            </mesh>
            {/* extended front brim (cap-style) */}
            <mesh position={[0, 0.058, 0.13]} rotation={[-0.18, 0, 0]}>
              <boxGeometry args={[0.30, 0.022, 0.18]} />
              <meshStandardMaterial color={HARDHAT} roughness={0.42} />
            </mesh>
            {/* company logo decal on front of hat */}
            <mesh position={[0, 0.13, 0.17]} rotation={[-0.25, 0, 0]}>
              <planeGeometry args={[0.10, 0.05]} />
              <meshStandardMaterial color="#1a3a6a" roughness={0.5} />
            </mesh>
          </group>

          {/* ─────── ARMS ─────── */}
          {/* Left arm (character's left = +X side when facing +Z) */}
          <group ref={leftArmRef} position={[0.30, 1.55, 0]}>
            {/* shoulder (cap of vest) */}
            <mesh position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.085, 12, 10]} />
              <meshStandardMaterial color={VEST} roughness={0.65} />
            </mesh>
            {/* upper arm */}
            <mesh position={[0, -0.18, 0]} castShadow>
              <cylinderGeometry args={[0.062, 0.057, 0.34, 12]} />
              <meshStandardMaterial color={SHIRT} roughness={0.78} />
            </mesh>
            {/* elbow */}
            <mesh position={[0, -0.36, 0]}>
              <sphereGeometry args={[0.058, 10, 8]} />
              <meshStandardMaterial color={SHIRT} roughness={0.78} />
            </mesh>
            {/* forearm */}
            <mesh position={[0, -0.52, 0]} castShadow>
              <cylinderGeometry args={[0.057, 0.05, 0.30, 12]} />
              <meshStandardMaterial color={SHIRT} roughness={0.78} />
            </mesh>
            {/* hand */}
            <mesh position={[0, -0.69, 0]}>
              <sphereGeometry args={[0.062, 10, 8]} />
              <meshStandardMaterial color={SKIN} roughness={0.75} />
            </mesh>
          </group>

          {/* Right arm — holds clipboard */}
          <group ref={rightArmRef} position={[-0.30, 1.55, 0]}>
            <mesh position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.085, 12, 10]} />
              <meshStandardMaterial color={VEST} roughness={0.65} />
            </mesh>
            <mesh position={[0, -0.18, 0]} castShadow>
              <cylinderGeometry args={[0.062, 0.057, 0.34, 12]} />
              <meshStandardMaterial color={SHIRT} roughness={0.78} />
            </mesh>
            <mesh position={[0, -0.36, 0]}>
              <sphereGeometry args={[0.058, 10, 8]} />
              <meshStandardMaterial color={SHIRT} roughness={0.78} />
            </mesh>
            <mesh position={[0, -0.52, 0]} castShadow>
              <cylinderGeometry args={[0.057, 0.05, 0.30, 12]} />
              <meshStandardMaterial color={SHIRT} roughness={0.78} />
            </mesh>
            <mesh position={[0, -0.69, 0]}>
              <sphereGeometry args={[0.062, 10, 8]} />
              <meshStandardMaterial color={SKIN} roughness={0.75} />
            </mesh>
            {/* clipboard tucked under right arm — a 9x12 board with a metal clip */}
            <group position={[-0.05, -0.55, 0.18]} rotation={[Math.PI / 2.4, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.22, 0.30, 0.012]} />
                <meshStandardMaterial color={CLIPBOARD} roughness={0.85} />
              </mesh>
              {/* clip */}
              <mesh position={[0, 0.13, 0.012]}>
                <boxGeometry args={[0.16, 0.04, 0.013]} />
                <meshStandardMaterial color={CLIPBOARD_CLIP} roughness={0.35} metalness={0.9} />
              </mesh>
              {/* paper */}
              <mesh position={[0, 0, 0.011]}>
                <planeGeometry args={[0.18, 0.24]} />
                <meshStandardMaterial color="#f9f7e8" roughness={0.7} />
              </mesh>
              {/* pen attached */}
              <mesh position={[0.10, 0.05, 0.018]} rotation={[0, 0, -0.3]}>
                <cylinderGeometry args={[0.005, 0.005, 0.10, 6]} />
                <meshStandardMaterial color="#0a3a8a" roughness={0.5} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    );
  },
);

/* ─── steel-toe boot subcomponent ──────────────────────────────────────── */
function Boot({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* heel / ankle block */}
      <mesh position={[0, 0.02, -0.05]} castShadow>
        <boxGeometry args={[0.14, 0.16, 0.18]} />
        <meshStandardMaterial color={BOOT} roughness={0.6} />
      </mesh>
      {/* toe box (rounded protective front) */}
      <mesh position={[0, -0.005, 0.10]} castShadow>
        <boxGeometry args={[0.14, 0.13, 0.16]} />
        <meshStandardMaterial color={BOOT} roughness={0.55} />
      </mesh>
      {/* steel toe rim — visible metallic accent */}
      <mesh position={[0, -0.038, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.052, 0.052, 0.142, 14, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={STEEL_TOE} roughness={0.3} metalness={0.85} />
      </mesh>
      {/* sole */}
      <mesh position={[0, -0.085, 0.025]} castShadow>
        <boxGeometry args={[0.148, 0.035, 0.34]} />
        <meshStandardMaterial color={BOOT_SOLE} roughness={0.9} />
      </mesh>
      {/* heel block */}
      <mesh position={[0, -0.115, -0.10]}>
        <boxGeometry args={[0.13, 0.04, 0.10]} />
        <meshStandardMaterial color={BOOT_SOLE} roughness={0.9} />
      </mesh>
      {/* laces (three crossing rungs) */}
      {[0.04, 0, -0.04].map((y, i) => (
        <mesh key={i} position={[0, 0.06 + y, 0.05]}>
          <boxGeometry args={[0.10, 0.008, 0.015]} />
          <meshStandardMaterial color="#1a1208" roughness={0.7} />
        </mesh>
      ))}
      {/* tongue */}
      <mesh position={[0, 0.085, 0.04]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.08, 0.05, 0.10]} />
        <meshStandardMaterial color="#2a1a0a" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* ─── tool pouch subcomponent ──────────────────────────────────────────── */
function ToolPouch({
  position,
  flip = false,
}: {
  position: [number, number, number];
  flip?: boolean;
}) {
  return (
    <group position={position} rotation={[0, flip ? Math.PI : 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.11, 0.16, 0.09]} />
        <meshStandardMaterial color={POUCH} roughness={0.78} />
      </mesh>
      {/* flap */}
      <mesh position={[0, 0.04, 0.045]}>
        <boxGeometry args={[0.115, 0.07, 0.012]} />
        <meshStandardMaterial color={POUCH} roughness={0.78} />
      </mesh>
      {/* a screwdriver handle peeking out the top */}
      <mesh position={[-0.025, 0.10, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.07, 8]} />
        <meshStandardMaterial color="#bb1818" roughness={0.5} />
      </mesh>
      {/* a wire-nut handle */}
      <mesh position={[0.025, 0.10, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.06, 6]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
      </mesh>
    </group>
  );
}
