'use client';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { BiomechanicalState } from '@/types/mediapipe';
import '@/styles/agent-insights.css';

interface AgentInsightTrayProps {
  metrics: BiomechanicalState | null;
  mode: 'pushups' | 'squats';
  voiceEnabled: boolean;
  repCount: number;
}

type FeedbackType = 'warning' | 'perfect' | 'good' | 'neutral';

interface FeedbackState {
  message: string;
  type: FeedbackType;
}

const FEEDBACK_CONFIG: Record<FeedbackType, { icon: string; className: string }> = {
  warning: { icon: '⚠️', className: 'coachy-warning' },
  perfect: { icon: '✨', className: 'coachy-perfect' },
  good: { icon: '💪', className: 'coachy-good' },
  neutral: { icon: '🤖', className: 'coachy-neutral' },
};

// Single source of truth for feedback logic
const getFeedbackFromMetrics = (
  metrics: BiomechanicalState,
  mode: 'pushups' | 'squats'
): FeedbackState => {
  if (metrics.warnings.length > 0) {
    return { message: metrics.warnings[0], type: 'warning' };
  }
  if (metrics.depth > 0.9) {
    return { message: 'Perfect depth!', type: 'perfect' };
  }
  if (metrics.depth > 0.6) {
    return { message: mode === 'squats' ? 'Good depth!' : 'Great range!', type: 'good' };
  }
  if (metrics.depth > 0 && metrics.depth < 0.3) {
    return { message: mode === 'squats' ? 'Go deeper!' : 'Lower!', type: 'warning' };
  }
  return { message: 'Analyzing your form...', type: 'neutral' };
};

export const AgentInsightTray: React.FC<AgentInsightTrayProps> = ({
  metrics,
  mode,
  voiceEnabled,
  repCount,
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
  const [aiEnabled, setAiEnabled] = useState(true); // Toggle for AI coaching
  const [currentProvider, setCurrentProvider] = useState<string>('local');
  const [providerPreference, setProviderPreference] = useState<'gemini' | 'venice' | 'auto'>(
    'auto'
  );

  // Memoized depth percentage
  const depthPercent = useMemo(() => {
    if (!metrics) return 0;
    return Math.min(100, Math.max(0, Math.round(metrics.depth * 100)));
  }, [metrics?.depth]);

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

  // Single effect for feedback processing
  useEffect(() => {
    if (!metrics) return;

    const newFeedback = getFeedbackFromMetrics(metrics, mode);

    if (newFeedback.type === 'warning') {
      speak(newFeedback.message);
    }

    if (newFeedback.message !== lastMessageRef.current) {
      setFeedback(newFeedback);
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 400);
      lastMessageRef.current = newFeedback.message;
      return () => clearTimeout(timer);
    }
  }, [metrics, mode, speak]);

  // AI Coaching: Call Gemini API every 5 seconds for enhanced feedback
  useEffect(() => {
    if (!metrics || !aiEnabled) return;

    const now = Date.now();
    const timeSinceLastCall = now - lastAICallRef.current;

    // Throttle: Only call API every 5 seconds
    if (timeSinceLastCall < 5000) return;

    lastAICallRef.current = now;

    // Call live coach API
    fetch('/api/coach/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        metrics,
        repCount,
      }),
    })
      .then((res) => res.json())
      .then((data: { feedback: string; severity: string; shouldSpeak: boolean }) => {
        // Update feedback with AI response
        const aiType: FeedbackType =
          data.severity === 'critical' || data.severity === 'warning' ? 'warning' : 'good';

        setFeedback({ message: data.feedback, type: aiType });
        setPulse(true);
        setTimeout(() => setPulse(false), 400);

        // Speak if AI recommends it
        if (data.shouldSpeak) {
          speak(data.feedback);
        }
      })
      .catch((err) => {
        console.warn('AI coaching failed, using local feedback:', err);
        setCurrentProvider('local');
        // Fallback to local feedback on error
      });
  }, [metrics, mode, repCount, speak, aiEnabled]);

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
          <div className="coachy-trace-line">
            <select
              value={providerPreference}
              onChange={(e) =>
                setProviderPreference(e.target.value as 'gemini' | 'venice' | 'auto')
              }
              className="text-xs bg-black/50 border border-white/20 rounded px-2 py-1"
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
