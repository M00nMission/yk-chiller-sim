// Inspect Chiller_R2.glb mesh objects: names, world positions, world bounding boxes.
// Usage: node scripts/inspect-chiller.mjs
//
// Mirrors the runtime placement in App.tsx:
//   <ChillerModel position={[0,0,0]}>
//     <primitive object={scene} position={[0, 0.8, 0]} />
//
// So the world Y offset for the model interior is +0.8.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Minimal DOM-ish polyfills for GLTFLoader running in plain Node.
globalThis.self = globalThis;
globalThis.window = globalThis;
class FakeImage {
  set src(v) { this._src = v; this.width = 1; this.height = 1; queueMicrotask(() => this.onload && this.onload()); }
  get src() { return this._src; }
  addEventListener(t, fn) { if (t === 'load') this.onload = fn; if (t === 'error') this.onerror = fn; }
}
globalThis.Image = FakeImage;
globalThis.HTMLCanvasElement = class {};
globalThis.document = { createElementNS: () => ({ width: 0, height: 0, getContext: () => null }) };
globalThis.URL = globalThis.URL || class { static createObjectURL() { return ''; } static revokeObjectURL() {} };

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GLB = path.resolve(__dirname, '..', 'public', 'models', 'chiller-r2', 'Chiller_R2.glb');
const Y_OFFSET = 0.8;

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}
function fmt(v, w = 7) {
  return (v >= 0 ? ' ' : '') + v.toFixed(3).padStart(w, ' ');
}

const buf = await fs.readFile(GLB);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
const gltf = await new Promise((resolve, reject) => {
  loader.parse(ab, '', resolve, reject);
});

const root = gltf.scene;

// Apply same transform as in <primitive position={[0,0.8,0]} />
root.position.set(0, Y_OFFSET, 0);
root.updateMatrixWorld(true);

const meshes = [];
root.traverse((o) => {
  if (o.isMesh) meshes.push(o);
});

console.log(`# Chiller_R2.glb — ${meshes.length} meshes (world coords, model y-offset = +${Y_OFFSET})\n`);

// All meshes table
console.log(
  pad('name', 36),
  pad('center.x', 10),
  pad('center.y', 10),
  pad('center.z', 10),
  pad('size.x', 9),
  pad('size.y', 9),
  pad('size.z', 9),
);
console.log('-'.repeat(110));

const rows = meshes.map((m) => {
  const box = new THREE.Box3().setFromObject(m);
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  return { mesh: m, name: m.name || '(unnamed)', center: c, size: s, box };
});

rows.sort((a, b) => a.name.localeCompare(b.name));
for (const r of rows) {
  console.log(
    pad(r.name, 36),
    fmt(r.center.x),
    fmt(r.center.y),
    fmt(r.center.z),
    fmt(r.size.x),
    fmt(r.size.y),
    fmt(r.size.z),
  );
}

// Heuristic: barrels = large horizontal cylinders along Z axis (size.z >> size.x ≈ size.y, sizes substantial).
console.log('\n# Barrel candidates (size.z largest, ~circular X/Y cross-section):');
const barrels = rows
  .filter((r) => r.size.z > 4 && r.size.x > 1 && r.size.y > 1 && Math.abs(r.size.x - r.size.y) < r.size.x * 0.6)
  .sort((a, b) => b.size.z - a.size.z);

for (const r of barrels) {
  const minZ = r.box.min.z;
  const maxZ = r.box.max.z;
  const minX = r.box.min.x;
  const maxX = r.box.max.x;
  const minY = r.box.min.y;
  const maxY = r.box.max.y;
  console.log(
    pad(r.name, 36),
    `cx=${fmt(r.center.x)} cy=${fmt(r.center.y)} cz=${fmt(r.center.z)}`,
    `r≈${fmt(Math.max(r.size.x, r.size.y) / 2, 5)}`,
    `len=${fmt(r.size.z, 6)}`,
    `Z∈[${fmt(minZ)},${fmt(maxZ)}]  X∈[${fmt(minX)},${fmt(maxX)}]  Y∈[${fmt(minY)},${fmt(maxY)}]`,
  );
}

console.log('\n# Top-level scene bounding box:');
const sceneBox = new THREE.Box3().setFromObject(root);
const sc = sceneBox.getCenter(new THREE.Vector3());
const ss = sceneBox.getSize(new THREE.Vector3());
console.log(`  center=(${fmt(sc.x)}, ${fmt(sc.y)}, ${fmt(sc.z)})  size=(${fmt(ss.x)}, ${fmt(ss.y)}, ${fmt(ss.z)})`);
console.log(`  X∈[${fmt(sceneBox.min.x)},${fmt(sceneBox.max.x)}]  Y∈[${fmt(sceneBox.min.y)},${fmt(sceneBox.max.y)}]  Z∈[${fmt(sceneBox.min.z)},${fmt(sceneBox.max.z)}]`);
