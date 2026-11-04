'use client';

/**
 * BuiltShoulder — the joint figure's `built` register: the shoulder as a
 * peelable 3D model inside Fig 1's frame. Earned, lazy — this module is
 * only ever imported after the `built` notch is tapped (next/dynamic,
 * ssr:false), so three.js and the meshes cost nothing on first load.
 *
 * Meshes: real Z-Anatomy parts (CC-BY-SA 4.0, derived from BodyParts3D ©
 * DBCLS, CC-BY-SA 2.1 Japan), extracted and decimated at build time by
 * scripts/build-anatomy.mjs into public/anatomy/*.glb — ~670 KB total,
 * fetched here on demand.
 *
 * Register: dark teal surfaces, brass edge overlay, hairline labels.
 * Orbit is drag-rotate only (no zoom, no pan); reduced motion kills the
 * damping and makes peels instant. Tapping a mesh — or its engraved
 * label — peels it away to show what's underneath.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type BuiltPartId = 'trapezius' | 'deltoid' | 'levator' | 'scapula' | 'clavicle' | 'humerus';

const PARTS: ReadonlyArray<{ id: BuiltPartId; label: string; muscle: boolean }> = [
  { id: 'trapezius', label: 'trapezius', muscle: true },
  { id: 'deltoid', label: 'deltoid', muscle: true },
  { id: 'levator', label: 'levator scapulae', muscle: true },
  { id: 'scapula', label: 'scapula', muscle: false },
  { id: 'clavicle', label: 'clavicle', muscle: false },
  { id: 'humerus', label: 'humerus', muscle: false },
];

const TEAL_SURFACE_MUSCLE = 0x10403c; // dark teal — soft tissue
const TEAL_SURFACE_BONE = 0x174c46; // a breath lighter — bone under it
const BRASS = 0xfcb131;

type LoadState = 'loading' | 'ready' | 'failed';

export default function BuiltShoulder() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [peeled, setPeeled] = useState<ReadonlySet<BuiltPartId>>(new Set());
  const peelRef = useRef<(id: BuiltPartId) => void>(() => {});

  // —— The scene — one effect, everything disposed on unmount ————————
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        // Cheap on a plate-sized canvas; lets the DOM/tests read the frame.
        preserveDrawingBuffer: true,
      });
    } catch {
      setState('failed');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    stage.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = !reduced;
    if (!reduced) controls.dampingFactor = 0.08;

    // Studio light: soft teal ambient, one brass-keyed directional.
    scene.add(new THREE.HemisphereLight(0x9fd9cf, 0x061013, 0.85));
    const key = new THREE.DirectionalLight(0xffe9c4, 1.1);
    key.position.set(2.2, 3.4, 4.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7aebd8, 0.35);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    // —— Parts: load each .glb, dress in our materials, keep records ——
    type PartRecord = {
      id: BuiltPartId;
      root: THREE.Object3D;
      mats: THREE.Material[];
      opacity: number;
      target: number;
    };
    const records = new Map<BuiltPartId, PartRecord>();
    const loader = new GLTFLoader();
    const holder = new THREE.Group();
    scene.add(holder);
    let cancelled = false;

    Promise.all(
      PARTS.map(
        (part) =>
          new Promise<void>((resolve, reject) => {
            loader.load(
              `/anatomy/${part.id}.glb`,
              (gltf) => {
                const mats: THREE.Material[] = [];
                const root = gltf.scene;
                root.traverse((o) => {
                  if ((o as THREE.Mesh).isMesh) {
                    const mesh = o as THREE.Mesh;
                    const surface = new THREE.MeshStandardMaterial({
                      color: part.muscle ? TEAL_SURFACE_MUSCLE : TEAL_SURFACE_BONE,
                      roughness: 0.82,
                      metalness: 0.18,
                      transparent: true,
                    });
                    mesh.material = surface;
                    surface.userData.base = 1;
                    mats.push(surface);
                    // Brass edge overlay — the engraved wire of the register.
                    const edges = new THREE.LineSegments(
                      new THREE.EdgesGeometry(mesh.geometry, 24),
                      new THREE.LineBasicMaterial({
                        color: BRASS,
                        transparent: true,
                        opacity: 0.34,
                      })
                    );
                    (edges.material as THREE.Material).userData.base = 0.34;
                    mats.push(edges.material as THREE.Material);
                    mesh.add(edges);
                  }
                });
                holder.add(root);
                records.set(part.id, {
                  id: part.id,
                  root,
                  mats,
                  opacity: 1,
                  target: 1,
                });
                resolve();
              },
              undefined,
              reject
            );
          })
      )
    )
      .then(() => {
        if (cancelled) return;
        // Frame the shoulder: center on the parts' shared bounds, sit the
        // camera for a three-quarter posterolateral read — the trapezius
        // is a back muscle, the plate should meet it there.
        const box = new THREE.Box3().setFromObject(holder);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
        holder.position.sub(center);
        camera.position.set(radius * 1.7, radius * 0.35, radius * -2.6);
        controls.target.set(0, 0, 0);
        controls.update();
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });

    // —— Peel: label taps and mesh taps both reach here ————————————
    peelRef.current = (id: BuiltPartId) => {
      const rec = records.get(id);
      if (!rec) return;
      const peeling = rec.target > 0;
      rec.target = peeling ? 0 : 1;
      rec.root.visible = true;
      if (reduced) {
        rec.opacity = rec.target;
        rec.root.visible = rec.target > 0;
        rec.mats.forEach((m) => (m.opacity = (m.userData.base ?? 1) * rec.opacity));
      }
      setPeeled((cur) => {
        const next = new Set(cur);
        if (peeling) next.add(id);
        else next.delete(id);
        return next;
      });
    };

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      const d = down;
      down = null;
      if (!d || performance.now() - d.t > 400 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6)
        return; // a drag is an orbit, not a peel
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      ray.setFromCamera(ndc, camera);
      // Peel what the tap actually touches — nearest hit across parts.
      let hit: BuiltPartId | null = null;
      let dist = Infinity;
      records.forEach((rec) => {
        if (!rec.root.visible) return;
        const first = ray.intersectObject(rec.root, true)[0];
        if (first && first.distance < dist) {
          dist = first.distance;
          hit = rec.id;
        }
      });
      if (hit) peelRef.current(hit);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    // —— Size to the stage ————————————————————————————————————
    const fit = () => {
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // Peel fades — instant under reduced motion (handled above).
      records.forEach((rec) => {
        if (Math.abs(rec.opacity - rec.target) > 0.001) {
          rec.opacity += (rec.target - rec.opacity) * 0.14;
          const vis = rec.opacity > 0.02;
          rec.root.visible = vis;
          rec.mats.forEach((m) => {
            m.opacity = (m.userData.base ??= m.opacity || 1) * Math.max(0, rec.opacity);
          });
        }
      });
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) =>
            m.dispose()
          );
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const toggle = (id: BuiltPartId) => peelRef.current(id);

  return (
    <div className="jp-built">
      <div
        className="jp-built__stage"
        ref={stageRef}
        role="img"
        aria-label="Peelable 3D model of the shoulder — trapezius, deltoid and levator over scapula, clavicle and humerus. Drag to turn; tap a part or its label to peel it away."
      >
        {state === 'loading' && <span className="jp-built__status">etching the model ···</span>}
        {state === 'failed' && (
          <span className="jp-built__status">
            the built view needs WebGL — the anatomy register still shows the parts
          </span>
        )}
      </div>
      <div className="jp-built__side">
        <p className="jp-built__eyebrow">peel</p>
        <ul className="jp-built__parts">
          {PARTS.map((part) => (
            <li key={part.id}>
              <button
                type="button"
                className={`jp-built__part${peeled.has(part.id) ? ' is-off' : ''}`}
                aria-pressed={peeled.has(part.id)}
                onClick={() => toggle(part.id)}
              >
                {part.label}
              </button>
            </li>
          ))}
        </ul>
        <p className="jp-built__credit">
          meshes · Z-Anatomy · CC-BY-SA
          <br />
          derived from BodyParts3D · DBCLS
        </p>
      </div>
    </div>
  );
}
