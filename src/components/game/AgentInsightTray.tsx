'use client';
import React, { useEffect, useState, useRef, useMemo, useCallback, useTransition } from 'react';
import { BiomechanicalState } from '@/types/mediapipe';
import { analyzeForm, CoachingAnalysis } from '@/lib/coachingEngine';
import { useCoachPersonality } from '@/hooks/useCoachPersonality';
import { coachStation } from '@/services/coachStation';
import '@/styles/agent-insights.css';

interface AgentInsightTrayProps {
  metrics: BiomechanicalState | null;
  mode: import('@/utils/biomechanics').ExerciseMode;
  voiceEnabled: boolean;
  repCount: number;
  userId?: string;
}

type FeedbackType = 'warning' | 'perfect' | 'good' | 'neutral';

interface FeedbackState {
  message: string;
  type: FeedbackType;
  analysis?: CoachingAnalysis;
}

const FEEDBACK_CONFIG: Record<FeedbackType, { icon: string; className: string }> = {
  warning: { icon: '⚠️', className: 'coachy-warning' },
  perfect: { icon: '✨', className: 'coachy-perfect' },
  good: { icon: '💪', className: 'coachy-good' },
  neutral: { icon: '🤖', className: 'coachy-neutral' },
};

/**
 * Convert coaching analysis to feedback state
 * Uses unified coaching engine (single source of truth)
 */
const getFeedbackFromAnalysis = (
  analysis: CoachingAnalysis,
  mode: import('@/utils/biomechanics').ExerciseMode
): FeedbackState => {
  // Determine UI type based on severity and issues
  let type: FeedbackType = 'neutral';

  if (analysis.primaryIssue) {
    if (analysis.primaryIssue.severity === 'critical') {
      type = 'warning';
    } else if (analysis.primaryIssue.severity === 'warning') {
      type = 'warning';
    } else {
      // Info-level issues (positive feedback)
      type = analysis.primaryIssue.cue.includes('Perfect') ? 'perfect' : 'good';
    }
  }

  return {
    message: analysis.summary,
    type,
    analysis,
  };
};

export const AgentInsightTray: React.FC<AgentInsightTrayProps> = ({
  metrics,
  mode,
  voiceEnabled,
  repCount,
  userId,
}) => {
  const [feedback, setFeedback] = useState<FeedbackState>({
    message: 'Analyzing your form...',
    type: 'neutral',
  });
  const [pulse, setPulse] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const lastMessageRef = useRef<string>('');
  const lastVoiceRef = useRef<number>(0);
  const lastAICallRef = useRef<number>(0);
  const lastMetricsHashRef = useRef<string>('');
  const metricsRef = useRef<BiomechanicalState | null>(metrics);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [currentProvider, setCurrentProvider] = useState<string>('local');
  const [providerPreference, setProviderPreference] = useState<'gemini' | 'venice' | 'auto'>(
    'auto'
  );
  const [, startTransition] = useTransition();
  const [personality] = useCoachPersonality();
  const aiMode = process.env.NEXT_PUBLIC_AI_COACHING?.toLowerCase() || 'post';
  const aiLiveEnabled = aiMode === 'live';
  const aiIntervalMs = process.env.NODE_ENV === 'development' ? 15000 : 5000;

  // Keep metrics ref in sync (non-blocking)
  useEffect(() => {
    metricsRef.current = metrics;
  }, [metrics]);

  // Memoized depth percentage
  const depthPercent = useMemo(() => {
    if (!metrics) return 0;
    return Math.min(100, Math.max(0, Math.round(metrics.depth * 100)));
  }, [metrics?.depth]);

  /**
   * Hash metrics to detect meaningful changes
   * Only analyze when metrics have moved significantly (>5% change)
   */
  const getMetricsHash = useCallback((m: BiomechanicalState | null): string => {
    if (!m) return '';
    return JSON.stringify({
      depth: Math.round(m.depth * 20), // 5% threshold
      trunkLean: Math.round(m.trunkLean / 5), // ~5° threshold
      kneeValgus: Math.round(m.kneeValgus / 5), // ~5px threshold
      isStable: m.isStable,
      warnings: m.warnings?.length ?? 0,
    });
  }, []);

  /**
   * Memoized metrics hash - only changes when metrics meaningfully change
   * This prevents expensive analyzeForm() calls on every frame
   */
  const metricsHash = useMemo(() => getMetricsHash(metrics), [metrics, getMetricsHash]);

  // Voice feedback with throttling
  const speak = useMemo(
    () =>
      (text: string): void => {
        if (typeof window === 'undefined' || !window.speechSynthesis || !voiceEnabled) return;
        const now = Date.now();
        if (now - lastVoiceRef.current < 3000) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
        lastVoiceRef.current = now;
      },
    [voiceEnabled]
  );

  // Local feedback: Debounced analysis (only when metrics meaningfully change)
  useEffect(() => {
    if (!metrics || !metricsHash) return;

    // Check if metrics hash is new (skip initial empty hash)
    if (metricsHash === lastMetricsHashRef.current) {
      return; // Same metrics, same feedback
    }

    // Update hash and trigger analysis
    lastMetricsHashRef.current = metricsHash;

    // Defer state updates to avoid blocking video render
    startTransition(() => {
      // Use unified coaching engine for local analysis
      const analysis = analyzeForm(metrics, mode);
      const newFeedback = getFeedbackFromAnalysis(analysis, mode);

      // Physical AI bridge: stream the primary form issue to the coach
      // station (SO-101) so the arm can demonstrate the correction.
      // No-op unless NEXT_PUBLIC_COACH_STATION is configured.
      if (analysis.primaryIssue) {
        coachStation.sendFormEvent({
          mode,
          issue: analysis.primaryIssue.type,
          severity: analysis.primaryIssue.severity,
          current: analysis.primaryIssue.current,
          target: analysis.primaryIssue.target,
          cue: analysis.primaryIssue.cue,
          personality,
          repCount,
        });
      }

      // Speak critical/warning issues (immediate, not deferred)
      if (newFeedback.analysis?.primaryIssue?.severity === 'critical') {
        speak(newFeedback.message);
      }

      // Update UI if feedback changed
      if (newFeedback.message !== lastMessageRef.current) {
        setFeedback(newFeedback);
        setPulse(true);
        setTimeout(() => setPulse(false), 400);
        lastMessageRef.current = newFeedback.message;
      }
    });
  }, [metricsHash, mode, personality, repCount, speak, startTransition]);

  // AI Coaching: Call API every 5 seconds for enhanced feedback (deferred, non-blocking)
  useEffect(() => {
    if (!metrics || !aiEnabled || !aiLiveEnabled) return;

    // Gate AI calls until pose is stable for a short window
    if (!metrics.isStable) return;

    const now = Date.now();
    const timeSinceLastCall = now - lastAICallRef.current;

    // Throttle: Only call API at configured interval
    if (timeSinceLastCall < aiIntervalMs) return;

    lastAICallRef.current = now;

    // Defer API call and state updates so they don't block video render
    startTransition(() => {
      // Call live coach API with userId for proper session management
      fetch('/api/coach/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          metrics: metricsRef.current,
          repCount,
          userId, // Pass userId for persistent sessions
          personality, // Coach persona drives feedback tone
        }),
      })
        .then((res) => res.json())
        .then(
          (data: {
            feedback: string;
            severity: string;
            shouldSpeak: boolean;
            issues?: any[];
            provider: string;
          }) => {
            // Update feedback with enhanced AI response
            const aiType: FeedbackType =
              data.severity === 'critical' || data.severity === 'warning' ? 'warning' : 'good';

            setFeedback((prev) => ({
              message: data.feedback,
              type: aiType,
              analysis: prev.analysis, // Preserve local analysis
            }));
            setPulse(true);
            setTimeout(() => setPulse(false), 400);
            setCurrentProvider(data.provider);

            // Speak if recommended
            if (data.shouldSpeak) {
              speak(data.feedback);
            }
          }
        )
        .catch((err) => {
          console.warn('AI coaching failed, using local feedback:', err);
          setCurrentProvider('local');
        });
    });
  }, [
    metricsHash,
    mode,
    repCount,
    personality,
    speak,
    aiEnabled,
    aiLiveEnabled,
    aiIntervalMs,
    startTransition,
  ]);

  const config = FEEDBACK_CONFIG[feedback.type];

  return (
    <div className="coachy-tray">
      <div className="coachy-main">
        <div className="coachy-avatar">
          <span className="coachy-icon">{config.icon}</span>
          <span className="coachy-label">Coachy</span>
        </div>

        <div className="coachy-feedback">
          <div className={`coachy-message ${config.className} ${pulse ? 'pulse' : ''}`}>
            {feedback.message}
          </div>

          <div className="coachy-progress">
            <div className="coachy-bar">
              <div
                className={`coachy-fill ${config.className}`}
                style={{ width: `${depthPercent}%` }}
              />
            </div>
            <span className="coachy-percent">{depthPercent}%</span>
          </div>
        </div>
      </div>

      {showTrace && metrics && (
        <div className="coachy-trace">
          <div className="coachy-trace-line">Mode: {mode.toUpperCase()}</div>
          <div className="coachy-trace-line">Depth: {metrics.depth.toFixed(2)}</div>
          <div className="coachy-trace-line">Lean: {metrics.trunkLean.toFixed(1)}°</div>
          <div className="coachy-trace-line">
            AI: {currentProvider === 'local' ? '❌ Offline' : `✅ ${currentProvider}`}
          </div>
          <div className="coachy-trace-line coachy-select-row">
            <span className="coachy-select-label">Model</span>
            <select
              value={providerPreference}
              onChange={(e) =>
                setProviderPreference(e.target.value as 'gemini' | 'venice' | 'auto')
              }
              className="coachy-select"
            >
              <option value="auto">Auto (Gemini → Venice)</option>
              <option value="gemini">Gemini Only</option>
              <option value="venice">Venice Only (Private)</option>
            </select>
          </div>
        </div>
      )}

      <button
        className="coachy-toggle"
        onClick={() => setShowTrace(!showTrace)}
        aria-label={showTrace ? 'Hide debug info' : 'Show debug info'}
      >
        {showTrace ? '−' : '···'}
      </button>
    </div>
  );
};
