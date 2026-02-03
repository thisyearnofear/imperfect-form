'use client';
import React, { useEffect, useState, useRef } from 'react';
import { BiomechanicalState } from '@/types/mediapipe';
import '@/styles/agent-insights.css';

interface AgentInsightTrayProps {
  metrics: BiomechanicalState | null;
  mode: 'pushups' | 'squats';
}

export const AgentInsightTray: React.FC<AgentInsightTrayProps> = ({ metrics, mode }) => {
  const [insight, setInsight] = useState<string>('Analyzing your form...');
  const [reasoning, setReasoning] = useState<string[]>([]);
  const [pulse, setPulse] = useState(false);
  const lastWarningRef = useRef<string>('');
  const lastVoiceRef = useRef<number>(0);

  // Voice Feedback (Eyes-free coaching)
  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const now = Date.now();
    if (now - lastVoiceRef.current < 3000) return; // Throttling speech

    // Stop any current speech to prioritize newest instruction
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    lastVoiceRef.current = now;
  };

  useEffect(() => {
    if (!metrics) return;

    let newInsight = '';
    const newReasoning: string[] = [];

    // 1. Log internal reasoning (The "AI Thought Trace")
    newReasoning.push(`[DETECTION] Mode: ${mode.toUpperCase()}`);
    newReasoning.push(`[BIOMEC] Depth: ${(metrics.depth * 100).toFixed(1)}%`);
    newReasoning.push(`[BIOMEC] Trunk Lean: ${metrics.trunkLean.toFixed(1)}°`);
    if (mode === 'squats')
      newReasoning.push(`[BIOMEC] Knee Valgus: ${metrics.kneeValgus.toFixed(1)}px`);

    // 2. Logic Engine - Insight Prioritization
    if (metrics.warnings.length > 0) {
      newInsight = metrics.warnings[0];
      newReasoning.push(`[ALERT] ${newInsight}`);
      speak(newInsight); // Immediate voice warning
    } else if (metrics.depth < 0.3) {
      newInsight = mode === 'squats' ? 'Go deeper!' : 'Chest down!';
      newReasoning.push('[LOGIC] Range of motion insufficient');
    } else if (metrics.depth > 0.85) {
      newInsight = 'Perfect depth!';
      newReasoning.push('[LOGIC] High quality rep detected');
    } else {
      newInsight = 'Maintaining form.';
    }

    setReasoning(newReasoning);

    if (newInsight !== lastWarningRef.current) {
      setInsight(newInsight);
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 500);
      lastWarningRef.current = newInsight;
      return () => clearTimeout(timer);
    }
  }, [metrics, mode]);

  return (
    <div className="agent-insight-tray font-press">
      <div className="agent-avatar">
        <div className="ai-brain-icon">🧠</div>
        <div className="ai-status">COACH v1</div>
      </div>

      <div className="insight-content">
        <div className={`insight-message ${pulse ? 'pulse' : ''}`}>{insight}</div>

        <div className="reasoning-trace">
          {reasoning.map((line, i) => (
            <div key={i} className="reasoning-line">
              <span className="reasoning-prefix">{'>'}</span> {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
