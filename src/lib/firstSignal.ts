/**
 * A first signal is a genuinely new first rep in an active session.
 * Keeping this pure makes duplicate detector callbacks harmless and testable.
 */
export function shouldCelebrateFirstSignal(
  count: number,
  previousCount: number,
  started: boolean
): boolean {
  return started && count === 1 && previousCount < 1;
}
