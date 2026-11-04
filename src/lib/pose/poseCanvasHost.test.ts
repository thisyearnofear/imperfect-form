// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { cloneTransferredCanvasHost } from './poseCanvasHost';

function makeDeadCanvas(): { host: HTMLDivElement; dead: HTMLCanvasElement } {
  const host = document.createElement('div');
  const dead = document.createElement('canvas');
  dead.id = 'pose-overlay';
  dead.className = 'absolute top-0 left-0 w-full h-full z-10';
  dead.style.transform = 'scaleX(-1)';
  dead.width = 640;
  dead.height = 480;
  host.appendChild(dead);
  document.body.appendChild(host);
  return { host, dead };
}

describe('cloneTransferredCanvasHost', () => {
  it('clones id/class/style/attrs and slots in next to the dead host', () => {
    const { host, dead } = makeDeadCanvas();
    const fresh = cloneTransferredCanvasHost(dead);

    expect(fresh.id).toBe('pose-overlay');
    expect(fresh.className).toBe('absolute top-0 left-0 w-full h-full z-10');
    expect(fresh.style.transform).toBe('scaleX(-1)');
    expect(fresh.width).toBe(640);
    expect(fresh.height).toBe(480);

    // Inserted immediately before the dead element; dead stays attached so
    // React's keyed-remount/unmount deletion still finds its host node.
    expect(host.children.length).toBe(2);
    expect(host.children[0]).toBe(fresh);
    expect(host.children[1]).toBe(dead);
    expect(dead.parentNode).toBe(host);
    expect(fresh.parentNode).toBe(host);
  });

  it('produces a resizable, drawable host (the fallback-path contract)', () => {
    const { dead } = makeDeadCanvas();
    const fresh = cloneTransferredCanvasHost(dead);
    // A neutered canvas throws InvalidStateError here; the clone must not.
    expect(() => {
      fresh.width = 320;
      fresh.height = 240;
    }).not.toThrow();
    expect(fresh.width).toBe(320);
  });

  it('resets the transfer flag and carries _lastDimensions', () => {
    const { dead } = makeDeadCanvas();
    (dead as any)._isTransferred = true;
    (dead as any)._lastDimensions = { width: 640, height: 480, rectWidth: 320, rectHeight: 240 };
    const fresh = cloneTransferredCanvasHost(dead);
    expect((fresh as any)._isTransferred).toBe(false);
    expect((fresh as any)._lastDimensions).toEqual({
      width: 640,
      height: 480,
      rectWidth: 320,
      rectHeight: 240,
    });
  });

  it('still returns a usable canvas when the dead host is detached', () => {
    const dead = document.createElement('canvas');
    dead.className = 'z-10';
    const fresh = cloneTransferredCanvasHost(dead);
    expect(fresh.parentNode).toBeNull();
    expect(fresh.className).toBe('z-10');
    expect(() => (fresh.width = 100)).not.toThrow();
  });
});
