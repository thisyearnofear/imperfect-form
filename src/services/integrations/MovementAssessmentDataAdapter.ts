import { getOfflineDataStore } from '@/services/OfflineDataStore';
import type { MovementAssessment } from '@/types/movementAssessment';

const MOVEMENT_ASSESSMENTS_KEY = 'movement-assessments:v1';

export interface StoredMovementAssessment {
  id: string;
  userId: string;
  sourceSessionId: string;
  savedAt: number;
  assessment: MovementAssessment;
}

function createId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `assessment-${Date.now()}`;
}

// The shared offline store exposes a fail-silent write API. Keep assessment
// read-modify-write operations ordered here so duplicate session callbacks do
// not lose records or create duplicate IDs.
let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite<T>(work: () => Promise<T>): Promise<T> {
  const operation = writeQueue.then(work, work);
  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );
  return operation;
}

async function saveAssessmentRecord(
  assessment: MovementAssessment,
  userId: string,
  sourceSessionId: string
): Promise<StoredMovementAssessment> {
  const store = getOfflineDataStore();
  const current = (await store.get<StoredMovementAssessment[]>(MOVEMENT_ASSESSMENTS_KEY)) ?? [];
  const existing = current.find(
    (record) => record.userId === userId && record.sourceSessionId === sourceSessionId
  );
  const savedAt = Math.max(Date.now(), (existing?.savedAt ?? 0) + 1);
  const record: StoredMovementAssessment = {
    id: existing?.id ?? createId(),
    userId,
    sourceSessionId,
    savedAt,
    assessment,
  };
  const next = [
    record,
    ...current.filter(
      (item) => !(item.userId === userId && item.sourceSessionId === sourceSessionId)
    ),
  ];

  await store.set(MOVEMENT_ASSESSMENTS_KEY, next.slice(0, 100));
  const persisted = await store.get<StoredMovementAssessment[]>(MOVEMENT_ASSESSMENTS_KEY);
  const persistedRecord = persisted?.find((item) => item.id === record.id);
  if (
    !persistedRecord ||
    persistedRecord.savedAt !== record.savedAt ||
    persistedRecord.userId !== record.userId ||
    persistedRecord.sourceSessionId !== record.sourceSessionId
  ) {
    throw new Error('Movement assessment could not be verified in local storage');
  }

  return record;
}

/** Save an assessment separately from workouts, wallet sync, and leaderboards. */
export function saveLocalMovementAssessment(
  assessment: MovementAssessment,
  userId: string,
  sourceSessionId: string
): Promise<StoredMovementAssessment> {
  return enqueueWrite(() => saveAssessmentRecord(assessment, userId, sourceSessionId));
}

export async function getLocalMovementAssessments(
  userId?: string
): Promise<StoredMovementAssessment[]> {
  const store = getOfflineDataStore();
  const records = (await store.get<StoredMovementAssessment[]>(MOVEMENT_ASSESSMENTS_KEY)) ?? [];
  return userId ? records.filter((record) => record.userId === userId) : records;
}

/** Re-key local assessment history when guest workouts are adopted by a wallet. */
export function migrateLocalMovementAssessments(
  fromUserId: string,
  toUserId: string,
  sourceSessionIds?: string[]
): Promise<number> {
  return enqueueWrite(async () => {
    if (!fromUserId || !toUserId || fromUserId === toUserId) return 0;

    const store = getOfflineDataStore();
    const current = (await store.get<StoredMovementAssessment[]>(MOVEMENT_ASSESSMENTS_KEY)) ?? [];
    const allowedSessions = sourceSessionIds ? new Set(sourceSessionIds) : null;
    let migrated = 0;
    const next = current.map((record) => {
      if (
        record.userId !== fromUserId ||
        (allowedSessions && !allowedSessions.has(record.sourceSessionId))
      ) {
        return record;
      }
      migrated += 1;
      return { ...record, userId: toUserId };
    });

    if (migrated > 0) await store.set(MOVEMENT_ASSESSMENTS_KEY, next);
    return migrated;
  });
}

export function clearLocalMovementAssessments(): Promise<void> {
  return enqueueWrite(async () => {
    await getOfflineDataStore().remove(MOVEMENT_ASSESSMENTS_KEY);
  });
}
