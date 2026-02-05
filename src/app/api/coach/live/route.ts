import { NextRequest, NextResponse } from 'next/server';
import {
  CoachRequest,
  CoachResponse,
  AIProvider,
  getAvailableProviders,
  isProviderConfigured,
} from '@/config/aiProviders';
import {
  getCachedFeedback,
  cacheFeedback,
  hashMetrics,
  shouldSkipAPICall,
  recordCost,
  getSessionStats,
} from '@/lib/cacheManager';
import { analyzeForm, convertToLegacyFormat, CoachingAnalysis } from '@/lib/coachingEngine';
import { getOrCreateSessionId, updateSessionMetrics } from '@/lib/sessionManager';
import { callAIProvider } from '@/lib/aiCoachProviders';

/**
 * Multi-Provider Live Coach API
 *
 * Supports:
 * - Gemini 2.0 Flash (Primary)
 * - Venice AI (Fallback)
 *
 * Features:
 * - Automatic provider rotation on failure
 * - User preference support
 * - Privacy-first option
 * - Response caching with similarity detection
 * - Circuit breaker pattern for provider reliability
 * - Cost tracking and optimization
 */

/**
 * Generate feedback using unified coaching engine
 * Single source of truth for ALL feedback logic
 * Used when:
 * - API providers are unavailable
 * - Metrics haven't changed significantly
 * - Session budget exhausted
 */
function generateCoachingFeedback(
  metrics: any,
  mode: string
): { feedback: string; severity: string; shouldSpeak: boolean } {
  const analysis = analyzeForm(
    {
      ...metrics,
      trunkLean: metrics.trunkLean || 0,
      kneeValgus: metrics.kneeValgus || 0,
      ankleFlexion: metrics.ankleFlexion || 0,
      depth: metrics.depth || 0,
      symmetry: metrics.symmetry || 1,
      isStable: metrics.isStable ?? true,
      warnings: metrics.warnings || [],
    },
    mode as 'pushups' | 'squats'
  );

  return convertToLegacyFormat(analysis);
}

// callAIProvider moved to lib/aiCoachProviders (shared)

export async function POST(request: NextRequest) {
  try {
    const body: CoachRequest = await request.json();
    const { mode, metrics, repCount, preferredProvider, userId } = body;

    // Validate input
    if (!mode || !metrics) {
      return NextResponse.json(
        { error: 'Missing required fields: mode, metrics' },
        { status: 400 }
      );
    }

    // ===== SESSION MANAGEMENT =====
    // Use real user ID if available, otherwise fall back to unique identifier
    const effectiveUserId =
      userId || `anonymous-${request.headers.get('user-agent')?.substring(0, 20) || 'unknown'}`;

    const { sessionId, isNewSession } = getOrCreateSessionId(effectiveUserId, mode);
    const metricsHash = hashMetrics(metrics);

    // ===== STAGE 1: Check Cache =====
    const cached = getCachedFeedback(sessionId, metricsHash, true);
    if (cached) {
      console.log(`📦 Cache HIT (metrics hash: ${metricsHash.substring(0, 8)}...)`);

      // Update session metrics
      updateSessionMetrics(sessionId, { repsAnalyzed: repCount });

      return NextResponse.json({
        ...cached.response,
        provider: 'cached',
        cached: true,
      } as CoachResponse & { cached?: boolean });
    }

    // ===== STAGE 2: Check if should skip API call =====
    const skipDecision = shouldSkipAPICall(sessionId, metricsHash);
    if (skipDecision.skip) {
      console.log(`⏭️  Skipping API call: ${skipDecision.reason}`);

      // Use unified coaching engine for local feedback
      const analysis = analyzeForm(metrics, mode);
      const localFeedback = convertToLegacyFormat(analysis);

      const response: CoachResponse = {
        ...localFeedback,
        provider: 'local',
        latencyMs: 0,
        issues: analysis.issues,
        summary: analysis.summary,
        primaryIssue: analysis.primaryIssue,
      };

      // Cache for next similar request
      cacheFeedback(sessionId, metricsHash, response);

      // Update session
      updateSessionMetrics(sessionId, {
        repsAnalyzed: repCount,
        issuesRaised: analysis.issues.length,
      });

      return NextResponse.json({
        ...response,
        skipped: true,
        reason: skipDecision.reason,
      } as CoachResponse & { skipped?: boolean; reason?: string });
    }

    // ===== STAGE 3: Unified form analysis (local first) =====
    // Always run coaching engine for detailed analysis
    const analysis = analyzeForm(metrics, mode);

    // ===== STAGE 4: Try AI for enhanced feedback (optional) =====
    let finalResponse: CoachResponse;
    let provider: AIProvider | 'cached' = 'local';
    let latencyMs = 0;
    let estimatedCost = 0;

    // Only call AI if: form is acceptable (no critical issues) + AI enabled
    const hasCriticalIssues = analysis.issues.some((i) => i.severity === 'critical');

    if (!hasCriticalIssues) {
      try {
        // Build prompt for AI enhancement
        const COACHING_PROMPT = `You are Coachy, an expert biomechanics coach analyzing real-time exercise form.
Current Analysis:
- Mode: ${mode}
- Rep: ${repCount}
- Primary Issue: ${analysis.primaryIssue?.cue || 'Form looks good'}
- Issues Found: ${analysis.issues.length}

Current Metrics:
- Trunk Lean: ${metrics.trunkLean.toFixed(1)}° (ideal: ${mode === 'squats' ? '<30°' : '<15°'})
- Knee Valgus: ${metrics.kneeValgus.toFixed(1)}px (ideal: <30px)
- Depth: ${metrics.depth.toFixed(2)} (ideal: >0.8)
- Stability: ${metrics.isStable ? 'Stable' : 'Unstable'}

Provide CONCISE motivational enhancement (max 8 words). Respond with ONLY JSON:
{
  "feedback": "Your enhanced feedback here",
  "severity": "info" | "warning" | "critical",
  "shouldSpeak": false
}`;

        const startTime = Date.now();
        const aiResponse = await callAIProvider(COACHING_PROMPT, preferredProvider);
        latencyMs = Date.now() - startTime;
        estimatedCost = aiResponse.estimatedCost;
        provider = aiResponse.provider;

        // Merge AI feedback into analysis
        finalResponse = {
          feedback: aiResponse.result.feedback,
          severity: aiResponse.result.severity,
          shouldSpeak: aiResponse.result.shouldSpeak,
          provider,
          latencyMs,
          issues: analysis.issues,
          summary: aiResponse.result.feedback, // Use AI feedback as summary
          primaryIssue: analysis.primaryIssue,
        };

        recordCost(sessionId, estimatedCost, true);
      } catch (aiError) {
        console.warn('AI enhancement failed, using coaching engine analysis:', aiError);
        provider = 'local';

        // Fall back to coaching engine
        finalResponse = {
          ...convertToLegacyFormat(analysis),
          provider: 'local',
          latencyMs: 0,
          issues: analysis.issues,
          summary: analysis.summary,
          primaryIssue: analysis.primaryIssue,
        };

        recordCost(sessionId, 0, false);
      }
    } else {
      // Critical issues: use coaching engine, don't call AI
      finalResponse = {
        ...convertToLegacyFormat(analysis),
        provider: 'local',
        latencyMs: 0,
        issues: analysis.issues,
        summary: analysis.summary,
        primaryIssue: analysis.primaryIssue,
      };

      recordCost(sessionId, 0, true);
    }

    // ===== STAGE 5: Cache & Update Session =====
    cacheFeedback(sessionId, metricsHash, finalResponse);
    updateSessionMetrics(sessionId, {
      repsAnalyzed: repCount,
      issuesRaised: analysis.issues.length,
      totalCost: (getSessionStats(sessionId).costUSD || 0) + estimatedCost,
    });

    // ===== STAGE 6: Return Response =====
    const stats = getSessionStats(sessionId);
    const debugInfo = {
      sessionId,
      isNewSession,
      sessionStats: {
        repsAnalyzed: stats.totalCalls,
        cachedResponses: stats.cachedResponses,
        costUSD: stats.costUSD.toFixed(4),
        successRate:
          stats.totalCalls > 0 ? ((stats.successCount / stats.totalCalls) * 100).toFixed(1) : '0',
      },
    };

    return NextResponse.json({
      ...finalResponse,
      debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined,
    });
  } catch (error) {
    console.error('Live coach error:', error);

    // Final graceful fallback - still use coaching engine
    const analysis = analyzeForm(
      {
        trunkLean: 0,
        kneeValgus: 0,
        ankleFlexion: 0,
        depth: 0,
        symmetry: 1,
        isStable: true,
        warnings: [],
      },
      'pushups'
    );

    return NextResponse.json(
      {
        ...convertToLegacyFormat(analysis),
        provider: 'local',
        latencyMs: 0,
        issues: [],
      } as CoachResponse,
      { status: 200 }
    );
  }
}
