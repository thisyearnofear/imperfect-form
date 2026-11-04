/**
 * build-anatomy — fetch the Z-Anatomy shoulder meshes once, at build time,
 * and bake them into small lazy-loaded .glb parts for the JointPlate
 * "built" register.
 *
 * Source: Z-Anatomy (CC-BY-SA 4.0, derived from BodyParts3D © DBCLS,
 * CC-BY-SA 2.1 Japan) — the Unity project's monolithic per-system FBX
 * files. We parse them with three's FBXLoader in Node (DOM/FileReader
 * stubbed), keep only the right shoulder's six parts, merge each part's
 * sub-meshes, decimate with meshoptimizer, and export one .glb per part
 * into public/anatomy/ — fetched on demand by the built layer, never by
 * first load.
 *
 *   node scripts/build-anatomy.mjs
 *
 * The heavy FBX downloads land in cache/anatomy/ (gitignored) and are
 * reused on re-runs.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'cache', 'anatomy');
const OUT = join(ROOT, 'public', 'anatomy');

const FBX_BASE =
  'https://raw.githubusercontent.com/LluisV/Z-Anatomy/PC-Version/Z-Anatomy%20PC/Assets/Models/1.0%20Models';
const SOURCES = {
  muscle: `${FBX_BASE}/MuscularSystem100.fbx`,
  skeletal: `${FBX_BASE}/SkeletalSystem100.fbx`,
};

// The shoulder set — right side (Z-Anatomy's `r` name suffix), each part
// grouped to one peelable layer. Sub-mesh names match the FBX node names.
const PARTS = {
  trapezius: {
    from: 'muscle',
    match: /^(transverse|ascending|descending)_part_of_trapezius_muscler$/i,
    tris: 6000,
  },
  deltoid: {
    from: 'muscle',
    match: /^(clavicular|acromial|scapular_spinal)_part_of_deltoid_muscler$/i,
    tris: 5000,
  },
  levator: { from: 'muscle', match: /^levator_scapulaer$/i, tris: 3000 },
  scapula: { from: 'skeletal', match: /^scapular$/i, tris: 8000 },
  clavicle: { from: 'skeletal', match: /^clavicler$/i, tris: 1500 },
  humerus: { from: 'skeletal', match: /^humerusr$/i, tris: 4000 },
};

// —— Minimal browser stubs so three's loaders/exporters run in Node ————
globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = {
  createElementNS: () => ({
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    style: {},
  }),
  createElement: () => ({
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    getContext: () => null,
    style: {},
  }),
};
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((ab) => {
      this.result = ab;
      this.onloadend?.();
    });
  }
};

const THREE = await import('three');
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
const { mergeGeometries, mergeVertices } = await import(
  'three/examples/jsm/utils/BufferGeometryUtils.js'
);
const { MeshoptSimplifier } = await import('meshoptimizer');
await MeshoptSimplifier.ready;

async function fetchFbx(key) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${key}.fbx`);
  if (existsSync(file) && readFileSync(file).length > 1_000_000) {
    console.log(`· ${key}.fbx cached (${(readFileSync(file).length / 1048576).toFixed(1)} MB)`);
    return readFileSync(file);
  }
  console.log(`· downloading ${key}.fbx …`);
  const res = await fetch(SOURCES[key]);
  if (!res.ok) throw new Error(`download failed ${res.status}: ${SOURCES[key]}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  console.log(`  ${(buf.length / 1048576).toFixed(1)} MB → ${file}`);
  return buf;
}

/** Keep the attributes a stylized render needs — position only. */
function cleanGeometry(geo, matrixWorld) {
  const g = geo.clone();
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position') g.deleteAttribute(name);
  }
  g.applyMatrix4(matrixWorld);
  return g;
}

/** meshopt-simplify an indexed geometry down to ~targetTris. */
function simplify(geometry, targetTris) {
  const src = geometry.attributes.position.array;
  const triCount = geometry.index.count / 3;
  if (triCount <= targetTris) return geometry;
  const [outIdx, err] = MeshoptSimplifier.simplify(
    geometry.index.array,
    src,
    3,
    targetTris * 3,
    0.02,
    ['LockBorder']
  );
  // Compact: the simplified index references a sparse subset of verts —
  // remap so the .glb only ships what it draws.
  const remap = new Int32Array(src.length / 3).fill(-1);
  const pos = [];
  const idx = new Uint32Array(outIdx.length);
  for (let i = 0; i < outIdx.length; i++) {
    const old = outIdx[i];
    if (remap[old] === -1) {
      remap[old] = pos.length / 3;
      pos.push(src[old * 3], src[old * 3 + 1], src[old * 3 + 2]);
    }
    idx[i] = remap[old];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  console.log(
    `    decimated ${triCount} → ${outIdx.length / 3} tris, ${src.length / 3} → ${pos.length / 3} verts (err ${err.toFixed(4)})`
  );
  return g;
}

const parsed = {};
for (const key of Object.keys(SOURCES)) {
  const buf = await fetchFbx(key);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  parsed[key] = new FBXLoader().parse(ab, '');
  parsed[key].updateMatrixWorld(true);
}

mkdirSync(OUT, { recursive: true });
const manifest = { parts: {}, attribution: 'Z-Anatomy (CC-BY-SA 4.0), derived from BodyParts3D (© DBCLS, CC-BY-SA 2.1 Japan)' };

for (const [part, spec] of Object.entries(PARTS)) {
  const hits = [];
  parsed[spec.from].traverse((o) => {
    if (o.isMesh && spec.match.test(o.name)) hits.push(o);
  });
  if (hits.length === 0) throw new Error(`no meshes matched ${part}: ${spec.match}`);
  const geos = hits.map((m) => cleanGeometry(m.geometry, m.matrixWorld));
  // Weld position-identical verts so the simplifier sees real topology
  // (unwelded soup locks every edge as a border and won't collapse).
  let merged = mergeVertices(geos.length > 1 ? mergeGeometries(geos, false) : geos[0]);
  merged = simplify(merged, spec.tris);
  if (!merged.attributes.normal) merged.computeVertexNormals();
  const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial());
  mesh.name = part;
  const glb = await new GLTFExporter().parseAsync(mesh, { binary: true });
  const file = join(OUT, `${part}.glb`);
  writeFileSync(file, Buffer.from(glb));
  manifest.parts[part] = {
    file: `${part}.glb`,
    bytes: glb.byteLength,
    tris: (merged.index ? merged.index.count : merged.attributes.position.count) / 3,
    sha1: createHash('sha1').update(Buffer.from(glb)).digest('hex').slice(0, 10),
  };
  console.log(`  ${part}: ${(glb.byteLength / 1024).toFixed(0)} KB, ${manifest.parts[part].tris} tris`);
}

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(
  join(OUT, 'ATTRIBUTION.txt'),
  'Shoulder meshes: Z-Anatomy — the libre 3D atlas of anatomy (CC-BY-SA 4.0)\n' +
    'https://github.com/LluisV/Z-Anatomy\n' +
    'Derived from BodyParts3D, © The Database Center for Life Science (DBCLS),\n' +
    'CC-BY-SA 2.1 Japan. Decimated subsets for the Fig 1 "built" register.\n'
);
console.log('· manifest + attribution written to public/anatomy/');
