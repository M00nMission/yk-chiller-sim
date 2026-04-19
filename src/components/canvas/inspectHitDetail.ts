import type { Intersection } from 'three';
import * as THREE from 'three';

const _nw = new THREE.Vector3();
const _nl = new THREE.Vector3();
const _pl = new THREE.Vector3();

function fmt(n: number, d = 4): string {
  return Number.isFinite(n) ? n.toFixed(d) : String(n);
}

function fmtV3(v: THREE.Vector3, d = 4): string {
  return `(${fmt(v.x, d)}, ${fmt(v.y, d)}, ${fmt(v.z, d)})`;
}

function fmtV2(v: THREE.Vector2, d = 4): string {
  return `(${fmt(v.x, d)}, ${fmt(v.y, d)})`;
}

/** World-space unit normal → human-readable dominant axis (for “which way does this face point”). */
function dominantAxisLabel(n: THREE.Vector3): string {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ax >= ay && ax >= az) return n.x >= 0 ? '+X world' : '−X world';
  if (ay >= ax && ay >= az) return n.y >= 0 ? '+Y world' : '−Y world';
  return n.z >= 0 ? '+Z world' : '−Z world';
}

function materialLine(mesh: THREE.Mesh | THREE.SkinnedMesh, materialIndex: number): string {
  const m = mesh.material;
  if (Array.isArray(m)) {
    const mat = m[materialIndex] ?? m[0];
    if (!mat) return `Material slot: ${materialIndex} (missing)`;
    return `Material slot: ${materialIndex}  type: ${mat.type}  name: ${mat.name || '(unnamed)'}`;
  }
  const mat = m as THREE.Material;
  return `Material: ${mat.type}  name: ${mat.name || '(unnamed)'}  (single)`;
}

function geometryGroupLine(geometry: THREE.BufferGeometry, faceIndex: number | null | undefined): string | null {
  const groups = geometry.groups;
  if (!groups.length) return null;
  const index = geometry.index;
  const tri = faceIndex ?? 0;

  for (let g = 0; g < groups.length; g++) {
    const gr = groups[g];
    if (index) {
      const startTri = gr.start / 3;
      const endTri = (gr.start + gr.count) / 3;
      if (tri >= startTri && tri < endTri) {
        return `Geometry group #${g}  materialIndex: ${gr.materialIndex}  index elements [${gr.start}, ${gr.start + gr.count})  → triangles [${startTri}, ${endTri})`;
      }
    } else {
      const startTri = gr.start / 3;
      const endTri = (gr.start + gr.count) / 3;
      if (tri >= startTri && tri < endTri) {
        return `Geometry group #${g}  materialIndex: ${gr.materialIndex}  vertex span [${gr.start}, ${gr.start + gr.count})  → triangles [${startTri}, ${endTri})`;
      }
    }
  }
  return `Geometry groups: ${groups.length} (no group matched triangle ${tri})`;
}

/**
 * Rich, multi-line description of a mesh raycast hit (triangle / “face”, normals, UVs, etc.).
 */
export function buildInspectHitDetail(hit: Intersection): string {
  const obj = hit.object;
  if (!(obj instanceof THREE.Mesh) && !(obj instanceof THREE.SkinnedMesh)) {
    return '';
  }

  const mesh = obj as THREE.Mesh | THREE.SkinnedMesh;
  const geom = mesh.geometry as THREE.BufferGeometry;
  const lines: string[] = [];

  lines.push('── Triangle (mesh “face”) ──');
  if (hit.faceIndex != null && hit.faceIndex !== undefined) {
    lines.push(`Triangle index (faceIndex): ${hit.faceIndex}`);
  } else {
    lines.push('Triangle index (faceIndex): (not provided)');
  }

  const face = hit.face;
  if (face) {
    lines.push(`Vertex indices (position stream): ${face.a} / ${face.b} / ${face.c}`);
    lines.push(`Per-face materialIndex: ${face.materialIndex}`);
  } else {
    lines.push('Vertex indices: (not provided)');
  }

  const index = geom.index;
  lines.push(`Topology: ${index ? `indexed (index.count=${index.count})` : `non-indexed (position.count=${geom.attributes.position?.count ?? '?'})`}`);
  const pos = geom.attributes.position;
  if (pos) {
    const triCount = index ? index.count / 3 : pos.count / 3;
    lines.push(`Triangle count (approx): ${Math.round(triCount)}`);
  }

  const dr = geom.drawRange;
  lines.push(`Draw range: start=${dr.start} count=${dr.count === Infinity ? '∞' : dr.count}`);

  const gline = geometryGroupLine(geom, hit.faceIndex ?? null);
  if (gline) lines.push(gline);

  lines.push(materialLine(mesh, face?.materialIndex ?? 0));
  const mat = Array.isArray(mesh.material) ? mesh.material[face?.materialIndex ?? 0] : mesh.material;
  if (mat) {
    const s = mat.side;
    const sideName = s === THREE.DoubleSide ? 'DoubleSide' : s === THREE.BackSide ? 'BackSide' : 'FrontSide';
    lines.push(`Material.side: ${sideName}`);
  }

  lines.push('');
  lines.push('── Normals ──');
  if (hit.normal) {
    _nl.copy(hit.normal);
    lines.push(`Interpolated shading normal (geometry / mesh local): ${fmtV3(_nl)}`);
    _nw.copy(_nl).transformDirection(mesh.matrixWorld).normalize();
    lines.push(`Same normal in world space: ${fmtV3(_nw)}`);
    lines.push(`Dominant world axis (flat label): ${dominantAxisLabel(_nw)}`);
  } else if (face?.normal) {
    _nl.copy(face.normal);
    lines.push(`Flat triangle normal (geometry local): ${fmtV3(_nl)}`);
    _nw.copy(_nl).transformDirection(mesh.matrixWorld).normalize();
    lines.push(`Flat triangle normal (world): ${fmtV3(_nw)}`);
    lines.push(`Dominant world axis: ${dominantAxisLabel(_nw)}`);
  } else {
    lines.push('No normal attribute on hit (smooth / flat normals unavailable).');
  }

  lines.push('');
  lines.push('── Hit position ──');
  lines.push(`World: ${fmtV3(hit.point)}`);
  mesh.worldToLocal(_pl.copy(hit.point));
  lines.push(`Mesh-local: ${fmtV3(_pl)}`);

  lines.push('');
  lines.push('── UV / barycentric ──');
  if (hit.uv) lines.push(`Interpolated uv: ${fmtV2(hit.uv)}`);
  else lines.push('uv: (none on this geometry or hit)');
  if (hit.uv1) lines.push(`Interpolated uv1: ${fmtV2(hit.uv1)}`);
  if (hit.barycoord) lines.push(`Barycentric on △ (A,B,C): ${fmtV3(hit.barycoord)}`);

  if (hit.instanceId !== undefined) {
    lines.push('');
    lines.push('── Instancing ──');
    lines.push(`instanceId: ${hit.instanceId}`);
  }

  lines.push('');
  lines.push('── Ray ──');
  lines.push(`Distance along ray (world units): ${fmt(hit.distance, 5)}`);

  lines.push('');
  lines.push('── Geometry object ──');
  lines.push(`uuid: ${geom.uuid}`);
  if (geom.name) lines.push(`geometry.name: ${geom.name}`);

  return lines.join('\n');
}

export function inspectObjectPath(obj: THREE.Object3D): string {
  const parts: string[] = [];
  let o: THREE.Object3D | null = obj;
  while (o) {
    if (o.name) parts.unshift(o.name);
    o = o.parent;
  }
  return parts.length ? parts.join(' › ') : '(unnamed)';
}

export function isInspectableMeshHit(hit: Intersection): boolean {
  const o = hit.object;
  return (
    (o instanceof THREE.Mesh || o instanceof THREE.SkinnedMesh) &&
    o.visible &&
    !!o.geometry &&
    !o.userData?.inspectIgnore
  );
}

export function pickInspectMeshHit(
  scene: THREE.Scene,
  camera: THREE.Camera,
  ndc: THREE.Vector2,
  raycaster: THREE.Raycaster,
): Intersection | null {
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(scene.children, true);
  return hits.find(isInspectableMeshHit) ?? null;
}

/** Plain text for clipboard: mesh line, hierarchy, then full triangle/surface block. */
export function formatInspectClipboard(hit: Intersection): string {
  const name = hit.object.name || '(unnamed mesh)';
  const path = inspectObjectPath(hit.object);
  const detail = buildInspectHitDetail(hit);
  return [`Mesh: ${name}`, `Hierarchy: ${path}`, '', detail].join('\n');
}
