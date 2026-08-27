import { ImageResponse } from 'next/og';

/**
 * Open Graph image for the /lore provenance exhibit.
 *
 * The Cræft Prize judge journey often starts with a shared link. This image
 * carries the Sandow lineage — not the generic app card — so a share spreads
 * the "Britain invented the form-check in 1897; we finished it with a robot"
 * argument at first glance. Brass-on-black, the Victorian-cabinet register,
 * with the dual-column loop plate (1897 vs 2026) as the visual core.
 *
 * Uses the next/og file convention: this segment's metadata picks it up
 * automatically. See docs/CRAFFT_PRIZE.md and CRAFFT_UX_AUDIT.md.
 */

export const runtime = 'edge';
export const alt =
  'The Sandow Machine — Britain invented the AI form-check in 1897. We finished it with a robot.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GOLD = '#fcb131';
const GOLD_DIM = '#c98c1a';
const BRASS = '#e6a72c';
const PAPER = '#f4ecd8';
const PAPER_DIM = '#c9bfa8';
const INK = '#0a0a0a';
const RULE = 'rgba(252,177,49,0.45)';

const STEPS_1897 = ['Photo in · by post', 'Graded · against the ideal', 'Correction out · on paper', 'Spring-grip dumbbell'];
const STEPS_2026 = ['Camera in · on-device', 'Graded · joint angles', 'Correction out · coach + HUD', 'SO-101 arm shows the fix'];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: INK,
          backgroundImage:
            'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(252,177,49,0.08), transparent 60%)',
          color: PAPER,
          fontFamily: 'Georgia, "Times New Roman", serif',
          padding: '56px 72px',
        }}
      >
        {/* Brass hairline frame */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 28,
            right: 28,
            bottom: 28,
            border: `1px solid ${RULE}`,
            borderRadius: 6,
            display: 'flex',
            flexDirection: 'column',
            padding: '40px 52px',
          }}
        >
          {/* Kicker + headline */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 6, color: BRASS, textTransform: 'uppercase' }}>
              1897 → 2026
            </div>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.05, marginTop: 14, color: PAPER }}>
              <span>The form-check, </span>
              <span style={{ fontStyle: 'italic', color: GOLD }}>finished.</span>
            </div>
            <div style={{ fontSize: 26, color: PAPER_DIM, marginTop: 14, maxWidth: 760 }}>
              Sandow graded photographs by post. We grade with a camera — and a robot shows the fix.
            </div>
          </div>

          {/* The loop plate */}
          <div style={{ display: 'flex', marginTop: 36, flex: 1, border: `1px solid ${RULE}`, borderRadius: 6, overflow: 'hidden' }}>
            {/* 1897 column */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '26px 30px', backgroundColor: 'rgba(252,177,49,0.02)' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: GOLD, letterSpacing: 3, marginBottom: 18 }}>1897 · SANDOW</div>
              {STEPS_1897.map((s) => (
                <div key={s} style={{ display: 'flex', fontSize: 22, color: PAPER_DIM, marginTop: 10, alignItems: 'center' }}>
                  <span style={{ color: BRASS, marginRight: 12 }}>✠</span>
                  {s}
                </div>
              ))}
            </div>
            {/* Divider + 2026 column */}
            <div style={{ width: 1, backgroundColor: RULE }} />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '26px 30px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: GOLD, letterSpacing: 3, marginBottom: 18 }}>2026 · IMPERFECT FORM</div>
              {STEPS_2026.map((s) => (
                <div key={s} style={{ display: 'flex', fontSize: 22, color: PAPER_DIM, marginTop: 10, alignItems: 'center' }}>
                  <span style={{ color: BRASS, marginRight: 12 }}>✠</span>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Footer stamp */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700, color: BRASS, letterSpacing: 3, textTransform: 'uppercase' }}>
              <span style={{ color: GOLD }}>✠</span>
              Graded vs. Sandow · 1897
            </div>
            <div style={{ fontSize: 20, color: PAPER_DIM, fontStyle: 'italic' }}>
              Same loop · new transport layer
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
