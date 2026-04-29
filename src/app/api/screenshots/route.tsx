/** @jsxImportSource react */
import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'workout-session';
    const mode = searchParams.get('mode') || 'squats';
    const reps = searchParams.get('reps') || '0';
    const level = searchParams.get('level') || '1';
    const xp = searchParams.get('xp') || '0';
    const kp = searchParams.get('kp');

    const width = 1284;
    const height = 2778;

    // Helper to render skeleton as SVG
    const renderSkeleton = (kpString: string | null, accentColor: string) => {
      if (!kpString) return null;

      const points = kpString.split(',').map(Number);
      if (points.length < 24) return null;

      const kpMap: Record<number, { x: number; y: number }> = {};
      const indices = [5, 6, 11, 12, 7, 8, 9, 10, 13, 14, 15, 16];
      for (let i = 0; i < indices.length; i++) {
        kpMap[indices[i]] = { x: points[i * 2], y: points[i * 2 + 1] };
      }

      const connections = [
        [5, 6],
        [5, 11],
        [6, 12],
        [11, 12], // Torso
        [5, 7],
        [7, 9], // Left arm
        [6, 8],
        [8, 10], // Right arm
        [11, 13],
        [13, 15], // Left leg
        [12, 14],
        [14, 16], // Right leg
      ];

      return (
        <svg
          width="800"
          height="800"
          viewBox="0 0 1000 1000"
          style={{ display: 'flex', marginBottom: '40px' }}
        >
          {connections.map(([i1, i2], idx) => {
            const p1 = kpMap[i1];
            const p2 = kpMap[i2];
            if (!p1 || !p2) return null;
            return (
              <line
                key={`l-${idx}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={accentColor}
                strokeWidth="16"
                strokeLinecap="round"
              />
            );
          })}
          {Object.entries(kpMap).map(([id, p]) => (
            <circle
              key={`c-${id}`}
              cx={p.x}
              cy={p.y}
              r="12"
              fill="white"
              stroke={accentColor}
              strokeWidth="4"
            />
          ))}
        </svg>
      );
    };

    // Different screenshot types
    const screenshots = {
      'workout-session': {
        title: 'Live Workout Session',
        subtitle: 'Real-time pose detection',
        content: '🏋️ 25 Squats Completed\n⏱️ 2:30 elapsed\n🎯 Perfect form detected',
        bgColor: '#1a1a1a',
        accentColor: '#10b981',
      },
      'highlight-card': {
        title: `${reps} ${mode.toUpperCase()} COMPLETED`,
        subtitle: `Level ${level} Athlete`,
        content: `+${xp} XP Earned`,
        bgColor: '#000000',
        accentColor: mode === 'squats' ? '#00ffff' : '#00ff00',
      },
      leaderboard: {
        title: 'Global Leaderboard',
        subtitle: 'Compete with athletes worldwide',
        content: '🥇 #1 Sarah - 1,250 reps\n🥈 #2 Mike - 1,180 reps\n🥉 #3 You - 1,050 reps',
        bgColor: '#1e1b4b',
        accentColor: '#fbbf24',
      },
      'pose-detection': {
        title: 'AI Pose Analysis',
        subtitle: 'Perfect your form',
        content: '✅ Knee alignment: Perfect\n✅ Back posture: Excellent\n⚠️ Depth: Go lower',
        bgColor: '#7c2d12',
        accentColor: '#f97316',
      },
    };

    const screenshot =
      screenshots[type as keyof typeof screenshots] || screenshots['workout-session'];

    return new ImageResponse(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: screenshot.bgColor,
          backgroundImage:
            'radial-gradient(circle at 25px 25px, rgba(255,255,255,0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255,255,255,0.05) 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          padding: '80px 60px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '60px',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            IMPERFECT FORM
          </div>
          <div
            style={{
              fontSize: '36px',
              color: '#fbbf24',
              textAlign: 'center',
            }}
          >
            ONCHAIN OLYMPIANS (in training)
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: '24px',
            padding: '60px',
            border: `4px solid ${screenshot.accentColor}`,
            marginBottom: '60px',
            width: '80%',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: screenshot.accentColor,
              textAlign: 'center',
              marginBottom: '24px',
            }}
          >
            {screenshot.title}
          </div>
          <div
            style={{
              fontSize: '32px',
              color: '#d1d5db',
              textAlign: 'center',
              marginBottom: '40px',
            }}
          >
            {screenshot.subtitle}
          </div>
          {type === 'highlight-card' && renderSkeleton(kp, screenshot.accentColor)}
          <div
            style={{
              fontSize: '36px',
              color: 'white',
              textAlign: 'center',
              lineHeight: '1.6',
              whiteSpace: 'pre-line',
            }}
          >
            {screenshot.content}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '28px',
            color: '#9ca3af',
          }}
        >
          🎯 AI-Powered • 🏆 Onchain Rewards • 🌍 Global Competition
        </div>
      </div>,
      {
        width,
        height,
      }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.log(`${message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
