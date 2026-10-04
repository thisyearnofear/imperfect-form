import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';

/**
 * Workout share card.
 *
 * This previously rendered "Onchain Olympians" in Press Start 2P — a second
 * product's branding inside this shell, in a register docs/NORTH_STAR.md
 * explicitly rejects ("not a generic workout share"). It told a non-user
 * nothing about the premise: no camera, no coach, no arm, no one fix.
 *
 * It now renders the studio register and the same framing as the modern share
 * copy: one useful movement signal, taken from a real set, with nothing
 * uploaded.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const reps = searchParams.get('reps') || '0';
  const repCount = parseInt(reps, 10);
  const exerciseMode = (searchParams.get('exerciseMode') || 'squats').toLowerCase();

  const one = repCount === 1;
  const label =
    exerciseMode === 'curls'
      ? one
        ? 'Curl'
        : 'Curls'
      : exerciseMode.startsWith('push')
        ? one
          ? 'Pushup'
          : 'Pushups'
        : exerciseMode.startsWith('pull')
          ? one
            ? 'Pull-up'
            : 'Pull-ups'
          : exerciseMode.startsWith('jump')
            ? one
              ? 'Jump'
              : 'Jumps'
            : one
              ? 'Squat'
              : 'Squats';

  const timeSpent = searchParams.get('timeSpent') || '0 seconds';
  const formattedTime = timeSpent.includes(':')
    ? timeSpent
    : timeSpent.endsWith('s')
      ? timeSpent
      : `${timeSpent} seconds`;

  // Teal says private; brass says graded. Same doctrine as the app itself.
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        backgroundColor: '#071013',
        color: '#e9fffa',
        padding: '56px 64px',
        fontFamily: 'Manrope, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontSize: '20px',
            letterSpacing: '6px',
            color: '#56d9c3',
            textTransform: 'uppercase',
          }}
        >
          Imperfect Form
        </span>
        <span
          style={{
            marginTop: '14px',
            fontSize: '34px',
            color: '#f0c05a',
            letterSpacing: '3px',
          }}
        >
          ONE REP / ONE FIX
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '28px' }}>
          <span style={{ fontSize: '150px', fontWeight: 700, color: '#56d9c3', lineHeight: 1 }}>
            {reps}
          </span>
          <span style={{ fontSize: '54px', color: '#e9fffa' }}>{label}</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '2px solid rgba(86,217,195,0.28)',
          paddingTop: '26px',
        }}
      >
        <span style={{ fontSize: '26px', color: '#9bb5b1' }}>
          One useful movement signal · {formattedTime}
        </span>
        <span style={{ fontSize: '24px', color: '#9bb5b1' }}>imperfectform.fun</span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
