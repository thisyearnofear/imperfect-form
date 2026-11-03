'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getNiggleJoint,
  NIGGLE_KEY,
  NIGGLE_LOCAL_EVENT,
  parseStoredNiggle,
  storeNiggle,
  type NiggleJoint,
  type NiggleContextDef,
  type StoredNiggle,
} from '@/lib/niggleIntents';
import { usePainIntent } from '@/hooks/usePainIntent';
import type { PainIntent } from '@/lib/painIntents';

const LOCAL_EVENT = NIGGLE_LOCAL_EVENT;

/**
 * Niggle intake ("name the niggle") — persisted {joint, context}, default
 * none. Mirrors usePainIntent's sync semantics (storage events + same-tab
 * custom event). Selecting a joint resolves to its first context so one tap
 * always produces a full read; picking a context refines it.
 *
 * Legacy: a stored pain intent (imf_painIntent_v1) still personalizes copy
 * when no niggle is stored — nothing breaks for returning users.
 */
export function useNiggle() {
  const [stored, setStored] = useState<StoredNiggle | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { painIntent } = usePainIntent();

  const readAll = useCallback(() => {
    setStored(parseStoredNiggle(localStorage.getItem(NIGGLE_KEY)));
  }, []);

  useEffect(() => {
    readAll();
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === NIGGLE_KEY) readAll();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_EVENT, readAll);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_EVENT, readAll);
    };
  }, [readAll]);

  const persist = useCallback((next: StoredNiggle | null) => {
    storeNiggle(next);
  }, []);

  const setJoint = useCallback(
    (id: NiggleJoint['id'] | null) => {
      const joint = getNiggleJoint(id);
      persist(joint ? { joint: joint.id, context: joint.contexts[0].id } : null);
    },
    [persist]
  );

  const setContext = useCallback(
    (contextId: string) => {
      const joint = getNiggleJoint(stored?.joint);
      if (!joint) return;
      const context = joint.contexts.some((c) => c.id === contextId)
        ? contextId
        : joint.contexts[0].id;
      persist({ joint: joint.id, context });
    },
    [stored, persist]
  );

  const joint = getNiggleJoint(stored?.joint);
  const context: NiggleContextDef | null = joint
    ? (joint.contexts.find((c) => c.id === stored?.context) ?? joint.contexts[0])
    : null;

  /** PainIntent-shaped copy object — resolved in usePainIntent (niggle wins
      over any legacy pain-intent chip). */
  const niggleIntent: PainIntent | null = painIntent;

  return { joint, context, niggleIntent, setJoint, setContext, hydrated };
}
