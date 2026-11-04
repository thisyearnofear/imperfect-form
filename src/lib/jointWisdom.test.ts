import { describe, expect, it } from 'vitest';
import {
  JOINT_MORSELS,
  morselForToday,
  morselSharePath,
  morselsForJoint,
  stretchForEaseMove,
} from '@/lib/jointWisdom';
import { STRETCHES } from '@/lib/recovery/recoveryContent';

const DAY = 86_400_000;

describe('the morsel deck', () => {
  it('serves 14 neck-shoulders morsels', () => {
    expect(morselsForJoint('neck-shoulders')).toHaveLength(14);
  });

  it('serves ~5 morsels for each other joint', () => {
    for (const joint of ['back', 'knee', 'arm'] as const) {
      expect(morselsForJoint(joint).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('keeps ids unique and lines engravable (≤140 chars)', () => {
    const ids = new Set<string>();
    for (const morsel of JOINT_MORSELS) {
      expect(ids.has(morsel.id)).toBe(false);
      ids.add(morsel.id);
      expect(morsel.line.length).toBeLessThanOrEqual(140);
      expect(morsel.figureTitle).toMatch(/^Fig \d+ · /);
    }
  });

  it('keeps every easeMoveId pointing at a real stretch', () => {
    const pointed = JOINT_MORSELS.filter((m) => m.easeMoveId);
    expect(pointed.length).toBeGreaterThan(0);
    for (const morsel of pointed) {
      const target = stretchForEaseMove(morsel.easeMoveId);
      expect(target).not.toBeNull();
      expect(STRETCHES[target!.mode][target!.index]).toBe(target!.stretch);
      // The pointer stays inside the joint's own protocol mode.
      expect(morsel.easeMoveId).toMatch(/^(reach|squats|curls):\d+$/);
    }
  });
});

describe('morselForToday', () => {
  it('rotates deterministically — the same plate all day', () => {
    const morning = Date.UTC(2026, 0, 15, 8);
    const evening = Date.UTC(2026, 0, 15, 21);
    expect(morselForToday('neck-shoulders', morning)).toEqual(
      morselForToday('neck-shoulders', evening)
    );
  });

  it('advances one plate per day, wrapping the finite deck', () => {
    const deck = morselsForJoint('neck-shoulders');
    const day = Date.UTC(2026, 0, 15, 12);
    const index = Math.floor(day / DAY) % deck.length;
    expect(morselForToday('neck-shoulders', day)).toBe(deck[index]);
    expect(morselForToday('neck-shoulders', day + DAY)).toBe(deck[(index + 1) % deck.length]);
    expect(morselForToday('neck-shoulders', day + deck.length * DAY)).toBe(deck[index]);
  });

  it('falls back to the neck-shoulders deck for not-sure and unknown joints', () => {
    const now = Date.UTC(2026, 0, 15, 12);
    const expected = morselForToday('neck-shoulders', now);
    expect(morselForToday('not-sure', now)).toBe(expected);
    expect(morselForToday('bogus', now)).toBe(expected);
    expect(morselForToday(null, now)).toBe(expected);
  });
});

describe('morselSharePath', () => {
  const morsel = JOINT_MORSELS.find((m) => m.joint === 'knee')!;

  /** Parse the built `/?…` path back into its params, the way the foyer does. */
  const paramsOf = (href: string) => new URLSearchParams(href.split('?')[1]);

  it('carries the morsel line as &note= and the joint+context as ?niggle=', () => {
    const { href, contextId } = morselSharePath(morsel, {
      context: 'stairs',
      senderName: 'Udi',
    });
    const params = paramsOf(href);
    expect(params.get('niggle')).toBe('knee:stairs');
    expect(params.get('note')).toBe(morsel.line);
    expect(params.get('from')).toBe('Udi');
    expect(contextId).toBe('stairs');
  });

  it('resolves a foreign or absent context to the joint’s first', () => {
    for (const context of ['desk', 'bogus', null, undefined]) {
      const { href, contextId } = morselSharePath(morsel, { context });
      expect(paramsOf(href).get('niggle')).toBe('knee:stairs');
      expect(contextId).toBe('stairs');
    }
  });

  it('shares without &from= when no name is remembered', () => {
    for (const senderName of [null, undefined, '', '   ', '<>']) {
      const { href } = morselSharePath(morsel, { senderName });
      const params = paramsOf(href);
      expect(params.get('from')).toBeNull();
      // …and the line alone still reads as care.
      expect(params.get('note')).toBe(morsel.line);
    }
  });

  it('keeps the note inside the receiving cap for every morsel in the deck', () => {
    for (const m of JOINT_MORSELS) {
      const params = paramsOf(morselSharePath(m).href);
      expect(params.get('note')).toBe(m.line);
      expect(params.get('niggle')).toMatch(/^[a-z-]+:[a-z-]+$/);
    }
  });
});

describe('stretchForEaseMove', () => {
  it('resolves a valid pointer', () => {
    expect(stretchForEaseMove('reach:2')).toEqual({
      mode: 'reach',
      index: 2,
      stretch: STRETCHES.reach[2],
    });
  });

  it('rejects missing, malformed, and out-of-range pointers', () => {
    expect(stretchForEaseMove(undefined)).toBeNull();
    expect(stretchForEaseMove('')).toBeNull();
    expect(stretchForEaseMove('reach')).toBeNull();
    expect(stretchForEaseMove('reach:99')).toBeNull();
    expect(stretchForEaseMove('bogus:0')).toBeNull();
    expect(stretchForEaseMove('reach:-1')).toBeNull();
  });
});
