import { NextRequest, NextResponse } from 'next/server';
import { AIProvider } from '@/config/aiProviders';
import { callAIProvider } from '@/lib/aiCoachProviders';
import { SessionSummary } from '@/services/sessionLogger';

type ReportRequest = {
  mode: 'pushups' | 'squats';
  sessionSummary: SessionSummary;
  preferredProvider?: AIProvider;
};

function generateLocalReport(summary: SessionSummary, mode: 'pushups' | 'squats') {
  const depth = Math.max(0, Math.min(1, summary.avgDepth || 0));
  const depthPct = Math.round(depth * 100);
  const warnings = summary.warningCount || 0;
  const duration = Math.round(summary.duration || 0);

  const strengths = [];
  if (summary.repCount >= 20) strengths.push('Consistent rep volume');
  if (depthPct >= 70) strengths.push('Solid depth');
  if (summary.maxTrunkLean < 30) strengths.push('Stable trunk position');

  const issues = [];
  if (summary.maxTrunkLean >= 40) issues.push('Excessive trunk lean');
  if (summary.maxKneeValgus >= 35) issues.push('Knee valgus noted');
  if (warnings >= 5) issues.push('Frequent form warnings');

  const recommendations = [];
  if (mode === 'squats' && depthPct < 60)
    recommendations.push('Aim for deeper hip crease below knee');
  if (mode === 'pushups' && summary.repCount < 10)
    recommendations.push('Focus on controlled tempo');
  if (summary.maxTrunkLean >= 40) recommendations.push('Engage core and keep chest proud');

  return {
    summary: `You completed ${summary.repCount} reps in ${duration}s. Depth was ${depthPct}% on average.`,
    strengths: strengths.length ? strengths : ['Good effort and consistency'],
    issues: issues.length ? issues : ['No major issues detected'],
    recommendations: recommendations.length ? recommendations : ['Keep training consistently'],
    metrics: {
      reps: summary.repCount,
      durationSeconds: duration,
      avgDepthPct: depthPct,
      maxTrunkLean: summary.maxTrunkLean,
      maxKneeValgus: summary.maxKneeValgus,
      warningCount: warnings,
    },
  };
}

function buildPrompt(summary: SessionSummary, mode: 'pushups' | 'squats') {
  return `
You are a concise fitness coach. Return ONLY valid JSON with the following shape:
{
  "summary": string,
  "strengths": string[],
  "issues": string[],
  "recommendations": string[],
  "metrics": {
    "reps": number,
    "durationSeconds": number,
    "avgDepthPct": number,
    "maxTrunkLean": number,
    "maxKneeValgus": number,
    "warningCount": number
  }
}

Mode: ${mode}
Session summary:
- reps: ${summary.repCount}
- durationSeconds: ${Math.round(summary.duration)}
- avgDepthPct: ${Math.round((summary.avgDepth || 0) * 100)}
- maxTrunkLean: ${Math.round(summary.maxTrunkLean)}
- maxKneeValgus: ${Math.round(summary.maxKneeValgus)}
- warningCount: ${summary.warningCount}

Provide 2-4 strengths, 2-4 issues (if any), and 2-4 recommendations.
`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json();
    const { mode, sessionSummary, preferredProvider } = body;

    if (!mode || !sessionSummary) {
      return NextResponse.json(
        { error: 'Missing required fields: mode, sessionSummary' },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(sessionSummary, mode);

    try {
      const { result, provider } = await callAIProvider(prompt, preferredProvider);
      return NextResponse.json({
        report: result,
        provider,
        fallback: false,
      });
    } catch (aiError) {
      const report = generateLocalReport(sessionSummary, mode);
      return NextResponse.json({
        report,
        provider: 'local',
        fallback: true,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
