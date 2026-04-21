/* ============================================================================
   TechnicianController.tsx
   Minecraft-style first-person walking through the engine room + roof access
   ladder (W/S climb) to the rooftop deck.

   Controls (matches vanilla Minecraft as closely as possible)
     • W / A / S / D or arrow keys — move (camera-relative)
     • Mouse                       — look around (PointerLockControls in App.tsx)
     • Space (hold)                — jump; hold to auto-hop on each landing
     • Left Shift                  — sneak (slower, slight crouch)
     • Left Ctrl  -or-  double-tap W — sprint (any strafe still sprints while active)
     • Esc                         — release mouse (click canvas to resume)

   Roof ladder (back corner — see walkModeWorld.ts)
     • W / S — climb up / down at sprint speed while inside the ladder shaft
     • Press S near the hatch (within ~4.5 m) while on the roof to descend
     • Press W while facing the hatch (within ~4.5 m) on the roof to descend
     • Walk directly over the hatch opening to auto-drop into the shaft
============================================================================ */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWalkModeStore } from '../../store/useWalkModeStore';
import {
  MAIN_FLOOR_Y,
  ROOF_WALK_Y,
  OUTDOOR_BOUND,
  ROOF_MOVEMENT_BOUND,
  LADDER_ROOF_EXIT,
  LADDER_ROOF_ENTRY,
  LADDER_FLOOR_EXIT,
  LADDER_FLOOR_ENTRY,
  inLadderVolume,
  nearLadderHatch,
  nearLadderBase,
  canStandOnRoof,
  volumeBlockMain,
  volumeBlockRoof,
  PLAYER_COLLISION_HEIGHT,
  PLAYER_AIR_COLLISION_HEIGHT,
} from '../../world/walkModeWorld';

/* ─── Minecraft-matched movement tunables ──────────────────────────────── */
const WALK_SPEED   = 4.317;
/** Faster than vanilla MC sprint — tuned for snappier first-person movement */
const SPRINT_SPEED = 8.2;
const SNEAK_SPEED  = 1.295;
const AIR_CONTROL  = 0.85;
/** ~1.83 m apex @ GRAVITY=20 — clears low insulated headers with margin. */
const JUMP_VEL     = 8.55;
const GRAVITY      = 20.0;
const CLIMB_SPEED  = 3.15;  // m/s — fixed ladder climb

/* ─── view & world ─────────────────────────────────────────────────────── */
/** Camera height above feet (doubled from ~6′4″ eye level per user request). */
const EYE_HEIGHT   = 3.61;
const SNEAK_CROUCH = 0.48;

const SPRINT_DOUBLE_TAP_MS = 300;

function hasMovementKey(keys: Record<string, boolean>): boolean {
  return !!(
    keys['w'] || keys['arrowup'] ||
    keys['s'] || keys['arrowdown'] ||
    keys['a'] || keys['arrowleft'] ||
    keys['d'] || keys['arrowright']
  );
}

interface ControllerProps {
  enabled: boolean;
  /**
   * When `true`, the controller temporarily stops driving the camera and
   * stops listening for keyboard input — but unlike toggling `enabled`,
   * it does NOT run the mount/unmount restore that warps the camera back
   * to the pre-walk-mode pose. This is what the HMI/VFD zoom flow uses to
   * hand the camera off to <CameraController/> while the user is reading
   * an instrument panel, then quietly resumes player movement when the
   * zoom is exited.
   */
  paused?: boolean;
  spawnPosition?: [number, number, number];
}

export function TechnicianController({
  enabled,
  paused = false,
  spawnPosition = [10, 0, 12],
}: ControllerProps) {
  const posRef          = useRef(new THREE.Vector3(...spawnPosition));
  const yVelRef         = useRef(0);
  const onGroundRef     = useRef(true);
  const onRoofRef       = useRef(false);
  const keysRef         = useRef<Record<string, boolean>>({});
  const sprintStickyRef = useRef(false);
  const lastForwardTapRef = useRef(0);
  const bobPhaseRef     = useRef(0);
  const scratchRight    = useRef(new THREE.Vector3());
  /* Set to true when the player initiates a roof-to-ladder descent while W is
     held. Prevents W from being interpreted as climbUp until the key is
     released, eliminating the snap-in / pop-out flicker. */
  const descendingRef   = useRef(false);
  /* Set to true when the player exits the top of the ladder onto the roof.
     Blocks the descent-trigger until they've stepped far enough onto the deck
     that they couldn't accidentally fall straight back in. */
  const ascentLockRef   = useRef(false);

  const setStoreMotion = useWalkModeStore((s) => s.setMotionState);
  const motionStateRef = useRef<'idle' | 'walk' | 'run'>('idle');

  const { camera } = useThree();

  /* ─── keyboard listeners (only attached while walk mode is on AND not
         paused for an HMI zoom — when paused we both ignore key state and
         release any held keys so the player doesn't keep walking the
         instant the zoom is exited) ─── */
  useEffect(() => {
    if (!enabled || paused) {
      /* Drop any held keys so the camera doesn't lurch on resume. */
      keysRef.current = {};
      sprintStickyRef.current = false;
      return;
    }

    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const fresh = !e.repeat && !keysRef.current[k];

      if (fresh && (k === 'w' || k === 'arrowup')) {
        const now = performance.now();
        if (now - lastForwardTapRef.current < SPRINT_DOUBLE_TAP_MS) {
          sprintStickyRef.current = true;
        }
        lastForwardTapRef.current = now;
      }

      keysRef.current[k] = true;

      if (
        k === 'arrowup' || k === 'arrowdown' ||
        k === 'arrowleft' || k === 'arrowright' ||
        k === ' '
      ) {
        e.preventDefault();
      }
    };

    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = false;
      /* Double-tap sprint lasts until all movement keys are released (MC-style strafe sprint). */
      if (!hasMovementKey(keysRef.current)) sprintStickyRef.current = false;
    };

    const clearAll = () => {
      keysRef.current = {};
      sprintStickyRef.current = false;
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clearAll);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clearAll);
      clearAll();
    };
  }, [enabled, paused]);

  useEffect(() => {
    if (!enabled) return;

    const prevPos  = camera.position.clone();
    const prevQuat = camera.quaternion.clone();
    const isPersp  = camera instanceof THREE.PerspectiveCamera;
    const prevFov  = isPersp ? (camera as THREE.PerspectiveCamera).fov : null;

    posRef.current.set(...spawnPosition);
    yVelRef.current = 0;
    onGroundRef.current = true;
    onRoofRef.current = false;

    const eye = posRef.current.clone();
    eye.y += EYE_HEIGHT;
    camera.position.copy(eye);
    camera.lookAt(0, eye.y, 0);

    if (isPersp) {
      const persp = camera as THREE.PerspectiveCamera;
      /* Vertical FOV (Three.js): wider angle = more floor/ceiling in frame, less “short” */
      persp.fov = 78;
      persp.updateProjectionMatrix();
    }

    return () => {
      camera.position.copy(prevPos);
      camera.quaternion.copy(prevQuat);
      if (isPersp && prevFov !== null) {
        const persp = camera as THREE.PerspectiveCamera;
        persp.fov = prevFov;
        persp.updateProjectionMatrix();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, camera]);

  useFrame((_, dtRaw) => {
    if (!enabled) return;
    /* When paused (e.g. user zoomed into an HMI), stand completely still:
       skip player physics AND the camera write so <CameraController/> is
       the sole owner of the camera transform. Without this, this useFrame
       would clobber camera.position back to the player's eye every frame
       and the user would see the camera "break away" from the panel the
       instant the zoom tween completed. */
    if (paused) return;
    const delta = Math.min(dtRaw, 0.05);

    const x = posRef.current.x;
    const z = posRef.current.z;
    let y = posRef.current.y;

    const k = keysRef.current;
    const fwd = (k['arrowup']    || k['w']) ? 1 : 0;
    const bk  = (k['arrowdown']  || k['s']) ? 1 : 0;
    const lft = (k['arrowleft']  || k['a']) ? 1 : 0;
    const rgt = (k['arrowright'] || k['d']) ? 1 : 0;
    const sneak = !!k['shift'];
    const ctrlHeld = !!k['control'];

    const inX = rgt - lft;
    const inZ = fwd - bk;
    /* ── Intentional roof-to-ladder descent (S or W-toward-hatch near hatch) ─
       Snap into the shaft when either:
         • the player presses S (back) while near the hatch, OR
         • the player presses W (forward) while near the hatch AND their camera
           is pointing toward it (dot-product of camera-XZ-forward vs player→hatch
           is positive — i.e. W would walk them into the shaft).
       In both cases we place them at LADDER_ROOF_ENTRY (shaft centre, just below
       the lip) so the ladder-climb loop on the next frame takes control cleanly.

       ascentLockRef prevents descent from triggering the instant the player
       pops out the top — they must step away from the hatch first. The lock
       clears once they're more than 2 m from the shaft centre. */
    if (ascentLockRef.current && onRoofRef.current) {
      const hatchCxL = (27.35 + 28.65) / 2;
      const hatchCzL = (-32.15 + -30.05) / 2;
      const dxL = x - hatchCxL;
      const dzL = z - hatchCzL;
      if (dxL * dxL + dzL * dzL > 2.0 * 2.0) ascentLockRef.current = false;
    }

    if (
      !ascentLockRef.current &&
      onRoofRef.current &&
      y >= ROOF_WALK_Y - 0.12 &&
      !inLadderVolume(x, z) &&
      nearLadderHatch(x, z)
    ) {
      const hatchCx = (27.35 + 28.65) / 2;
      const hatchCz = (-32.15 + -30.05) / 2;

      const camFwd = new THREE.Vector3();
      camera.getWorldDirection(camFwd);
      camFwd.y = 0;
      camFwd.normalize();

      /* Vector from player feet to hatch centre (XZ only) */
      const toHatchX = hatchCx - x;
      const toHatchZ = hatchCz - z;
      const toHatchLen = Math.hypot(toHatchX, toHatchZ);
      const facingHatch =
        toHatchLen > 0.01 &&
        (camFwd.x * toHatchX + camFwd.z * toHatchZ) / toHatchLen > 0.45; // ~63° cone

      const wantDescend = !!bk || (!!fwd && facingHatch);

      if (wantDescend) {
        posRef.current.set(LADDER_ROOF_ENTRY[0], LADDER_ROOF_ENTRY[1], LADDER_ROOF_ENTRY[2]);
        onRoofRef.current = false;
        yVelRef.current = 0;
        /* Latch: if W triggered this descent, suppress climbUp for this descent
           so the shaft loop doesn't immediately bounce the player back out. */
        if (!!fwd && facingHatch) descendingRef.current = true;
        camera.position.set(
          LADDER_ROOF_ENTRY[0],
          LADDER_ROOF_ENTRY[1] + EYE_HEIGHT,
          LADDER_ROOF_ENTRY[2],
        );
        return;
      }
    }

    /* Step from rooftop deck into open shaft (hatch) — before ladder solve */
    if (
      onRoofRef.current &&
      y >= ROOF_WALK_Y - 0.12 &&
      inLadderVolume(x, z) &&
      !canStandOnRoof(x, z)
    ) {
      onRoofRef.current = false;
      y = ROOF_WALK_Y - 0.14;
      yVelRef.current = 0;
      posRef.current.y = y;
    }

    /* ── Ground-floor ladder entry ────────────────────────────────────────
       The south face of the shaft is now a solid AABB so the player bumps
       into the ladder rather than walking through it.  When W is pressed
       while standing close to that face and horizontally aligned with the
       opening, snap the player to the shaft centre and lift y just above
       the floor endpoint threshold so inShaft activates this frame. */
    if (
      !onRoofRef.current &&
      onGroundRef.current &&
      !!fwd &&
      nearLadderBase(x, z)
    ) {
      posRef.current.set(LADDER_FLOOR_ENTRY[0], LADDER_FLOOR_ENTRY[1], LADDER_FLOOR_ENTRY[2]);
      y = LADDER_FLOOR_ENTRY[1];
      onGroundRef.current = false;
      yVelRef.current = 0;
    }

    /* inShaft: true only while mid-ladder — never at the endpoints, so the
       player can walk freely the moment they reach the floor or the roof exit.
       At the floor: teleport already moves XZ clear, so inLadderVolume is
       already false; this guard is a belt-and-suspenders safety net.
       At the roof: the shaft block is treated as a wall by volumeBlockRoof, so
       the player can't walk back in; shaft mode must not re-engage here either. */
    const atEndpoint = y <= MAIN_FLOOR_Y + 0.05 || y >= ROOF_WALK_Y - 0.08;
    const inShaft = inLadderVolume(x, z) && y < ROOF_WALK_Y + 0.42 && !atEndpoint;

    /* ─── Ladder climb ──────────────────────────────────────────────────────
       Space (or W) climbs UP, S climbs DOWN — both at SPRINT_SPEED.
       descendingRef suppresses W-as-climbUp for the duration of a W-initiated
       descent so the player doesn't instantly pop back out through the hatch.
       The latch clears as soon as W is released. Idle (no input) slides down
       at a gentle 45 % of SPRINT_SPEED so hands-off descents feel controlled.
    ─────────────────────────────────────────────────────────────────────── */
    if (inShaft) {
      yVelRef.current = 0;
      let climb = 0;
      /* Clear the descend-latch as soon as W is released */
      if (!fwd) descendingRef.current = false;
      const climbUp = !descendingRef.current && !!(k[' '] || k['spacebar'] || fwd);
      const climbDown = !!bk;
      if (climbUp && !climbDown) climb = SPRINT_SPEED;
      else if (climbDown && !climbUp) climb = -SPRINT_SPEED;
      else climb = -SPRINT_SPEED * 0.45; /* idle = controlled slide-down */
      y += climb * delta;
      y = THREE.MathUtils.clamp(y, MAIN_FLOOR_Y, ROOF_WALK_Y + 0.01);

      if (climb > 0 && y >= ROOF_WALK_Y - 0.06) {
        posRef.current.set(LADDER_ROOF_EXIT[0], LADDER_ROOF_EXIT[1], LADDER_ROOF_EXIT[2]);
        onRoofRef.current = true;
        yVelRef.current = 0;
        onGroundRef.current = true;
        ascentLockRef.current = true; /* block descent until player steps away */
      } else if (y <= MAIN_FLOOR_Y + 0.02) {
        /* Teleport XZ clear of the shaft so inLadderVolume is false next frame
           and the player can walk freely without re-engaging the climb loop. */
        posRef.current.set(LADDER_FLOOR_EXIT[0], LADDER_FLOOR_EXIT[1], LADDER_FLOOR_EXIT[2]);
        onRoofRef.current = false;
        onGroundRef.current = true;
        descendingRef.current = false;
        camera.position.set(
          LADDER_FLOOR_EXIT[0],
          LADDER_FLOOR_EXIT[1] + EYE_HEIGHT,
          LADDER_FLOOR_EXIT[2],
        );
        return;
      } else {
        onGroundRef.current = false;
      }

      posRef.current.y = y;

      const moving = Math.abs(climb) > 1e-3;
      const next: 'idle' | 'walk' | 'run' = moving ? 'walk' : 'idle';
      if (next !== motionStateRef.current) {
        motionStateRef.current = next;
        setStoreMotion(next);
      }

      camera.position.set(
        posRef.current.x,
        posRef.current.y + EYE_HEIGHT,
        posRef.current.z,
      );
      return;
    }

    /* ─── Free movement (floor or roof) ───
       Forward + strafe from camera orientation: use Three.js camera basis so
       A/D match mouse-look (manual (fz,-fx) was inverted relative to camera). */
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);
    camForward.y = 0;
    if (camForward.lengthSq() > 1e-6) camForward.normalize();

    const right = scratchRight.current;
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    right.y = 0;
    if (right.lengthSq() > 1e-6) right.normalize();

    let dirX = camForward.x * inZ + right.x * inX;
    let dirZ = camForward.z * inZ + right.z * inX;
    const dirLen = Math.hypot(dirX, dirZ);
    const moving = dirLen > 1e-3;

    const sprintIntent =
      !sneak && (sprintStickyRef.current || ctrlHeld);
    const sprinting = sprintIntent && moving;

    let baseSpeed = WALK_SPEED;
    if (sneak)          baseSpeed = SNEAK_SPEED;
    else if (sprinting) baseSpeed = SPRINT_SPEED;

    const speed = onGroundRef.current ? baseSpeed : baseSpeed * AIR_CONTROL;

    const next: 'idle' | 'walk' | 'run' = moving
      ? (sprinting ? 'run' : 'walk')
      : 'idle';
    if (next !== motionStateRef.current) {
      motionStateRef.current = next;
      setStoreMotion(next);
    }

    const onRoof = onRoofRef.current;
    /* On the roof, the parapet limits walkable area. On the ground floor,
       the building walls are now solid AABBs so the bound just keeps the
       player inside the surrounding lawn (yard). */
    const xBound = onRoof ? ROOF_MOVEMENT_BOUND : OUTDOOR_BOUND;

    /* Jump before integration so lift-off velocity applies this same frame. */
    const jumpHeld = !!(k[' '] || k['spacebar']);
    if (jumpHeld && onGroundRef.current) {
      const feetYJump = posRef.current.y;
      const onMainSolid =
        feetYJump <= MAIN_FLOOR_Y + 0.07 &&
        feetYJump >= MAIN_FLOOR_Y - 0.02 &&
        !onRoofRef.current;
      const onRoofSolid =
        onRoofRef.current &&
        feetYJump >= ROOF_WALK_Y - 0.12 &&
        feetYJump <= ROOF_WALK_Y + 0.14 &&
        canStandOnRoof(posRef.current.x, posRef.current.z);
      if (onMainSolid || onRoofSolid) {
        yVelRef.current = JUMP_VEL;
        onGroundRef.current = false;
      }
    }

    yVelRef.current -= GRAVITY * delta;
    y = posRef.current.y + yVelRef.current * delta;

    const eps = 0.1;

    /* Land on roof slab */
    if (
      yVelRef.current <= 0 &&
      y <= ROOF_WALK_Y + eps &&
      y >= ROOF_WALK_Y - 1.2 &&
      canStandOnRoof(posRef.current.x, posRef.current.z)
    ) {
      y = ROOF_WALK_Y;
      yVelRef.current = 0;
      onGroundRef.current = true;
      onRoofRef.current = true;
    } else if (
      yVelRef.current <= 0 &&
      y <= MAIN_FLOOR_Y + eps
    ) {
      y = MAIN_FLOOR_Y;
      yVelRef.current = 0;
      onGroundRef.current = true;
      onRoofRef.current = false;
    } else {
      onGroundRef.current = false;
    }

    posRef.current.y = y;

    /* Physics first, then XZ: collision uses post-integration feet height.
       Airborne uses a shorter capsule (realistic vault / legs trail). */
    const collH = onGroundRef.current
      ? PLAYER_COLLISION_HEIGHT
      : PLAYER_AIR_COLLISION_HEIGHT;
    const blockFn = onRoof
      ? (px: number, pz: number) => volumeBlockRoof(px, pz, posRef.current.y, collH)
      : (px: number, pz: number) => volumeBlockMain(px, pz, posRef.current.y, collH);

    if (moving) {
      const sx = (dirX / dirLen) * speed * delta;
      const sz = (dirZ / dirLen) * speed * delta;

      let nx = THREE.MathUtils.clamp(posRef.current.x + sx, -xBound, xBound);
      let nz = THREE.MathUtils.clamp(posRef.current.z + sz, -xBound, xBound);

      if (blockFn(nx, nz)) {
        if (!blockFn(nx, posRef.current.z)) {
          nz = posRef.current.z;
        } else if (!blockFn(posRef.current.x, nz)) {
          nx = posRef.current.x;
        } else {
          nx = posRef.current.x;
          nz = posRef.current.z;
        }
      }
      posRef.current.x = nx;
      posRef.current.z = nz;
    }

    /* Walked or jumped past solid deck — no footing (fall to machine-room floor) */
    if (
      onRoofRef.current &&
      posRef.current.y <= ROOF_WALK_Y + 0.08 &&
      posRef.current.y >= ROOF_WALK_Y - 0.25 &&
      !canStandOnRoof(posRef.current.x, posRef.current.z)
    ) {
      onGroundRef.current = false;
      onRoofRef.current = false;
    }

    if (onRoofRef.current && posRef.current.y < ROOF_WALK_Y - 0.35) {
      onRoofRef.current = false;
    }

    let bob = 0;
    if (moving && onGroundRef.current) {
      const cadence = sprinting ? 10.0 : sneak ? 3.5 : 5.5;
      const bobAmt  = sprinting ? 0.05 : sneak ? 0.012 : 0.025;
      bobPhaseRef.current += delta * cadence;
      bob = Math.abs(Math.sin(bobPhaseRef.current)) * bobAmt;
    } else if (!moving) {
      bobPhaseRef.current = 0;
    }

    const crouch = sneak && onGroundRef.current ? -SNEAK_CROUCH : 0;

    camera.position.set(
      posRef.current.x,
      posRef.current.y + EYE_HEIGHT + bob + crouch,
      posRef.current.z,
    );
  });

  return null;
}
