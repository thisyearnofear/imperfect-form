'use client';

import React from 'react';
import { CoachPersonality, getCoachInfo } from '@/lib/coachPersonalities';

/**
 * The "lab register" post-workout analysis card - the clinical counterpoint
 * to the arcade UI ("The Arcade and the Lab"). Purple = premium AI, readable
 * sans-serif body, mono for data, numbered protocol steps, persona byline.
 */

export interface CoachReport {
  summary: string;
  strengths: string[];
  issues: string[];
  recommendations: string[];
  metrics: Record<string, number>;
}

export type ReportStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LabAnalysisCardProps {
  report: CoachReport | null;
  status: ReportStatus;
  personality: CoachPersonality;
  onGenerate: () => void;
}

const METRIC_LABELS: Record<string, string> = {
  reps: 'REPS',
  durationSeconds: 'TIME(S)',
  avgDepthPct: 'DEPTH%',
  maxTrunkLean: 'LEAN°',
  maxKneeValgus: 'VALGUS',
  warningCount: 'WARN',
};

const LabAnalysisCard: React.FC<LabAnalysisCardProps> = ({
  report,
  status,
  personality,
  onGenerate,
}) => {
  const coach = getCoachInfo(personality);

  return (
    <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 overflow-hidden text-left">
      {/* Banner header - solid strip, clinical label, persona badge */}
      <div className="bg-purple-600/80 px-4 py-2 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-white">
          AI Clinical Review
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-100 bg-white/20 rounded-full px-2 py-0.5">
          {coach.emoji} {coach.name}
        </span>
      </div>

      <div className="p-4 space-y-3 font-sans">
        {status === 'idle' && (
          <button
            onClick={onGenerate}
            className="w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-xs font-bold tracking-wide transition-all"
          >
            ⚗️ Run Clinical Analysis
          </button>
        )}

        {status === 'loading' && (
          <div className="text-xs text-purple-200/80 animate-pulse font-mono">
            Analyzing biomechanics…
          </div>
        )}

        {status === 'error' && (
          <div className="text-xs text-red-300">
            Analysis unavailable right now — your session stats are still saved.
          </div>
        )}

        {status === 'ready' && report && (
          <>
            <p className="text-sm text-purple-50/90 leading-relaxed">{report.summary}</p>

            {/* Metrics strip - mono register */}
            {Object.keys(report.metrics ?? {}).length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-black/30 border border-white/5 px-3 py-2">
                {Object.entries(report.metrics).map(([key, value]) => (
                  <span key={key} className="font-mono text-[10px] text-purple-200/70">
                    {METRIC_LABELS[key] ?? key.toUpperCase()}{' '}
                    <span className="text-purple-100">{Math.round(value)}</span>
                  </span>
                ))}
              </div>
            )}

            {report.strengths.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-green-300 font-bold mb-1">
                  Strengths
                </div>
                <ul className="space-y-0.5">
                  {report.strengths.map((s, i) => (
                    <li key={`s-${i}`} className="text-xs text-gray-200 leading-relaxed">
                      <span className="text-green-400 mr-1.5">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.issues.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-1">
                  Findings
                </div>
                <ul className="space-y-0.5">
                  {report.issues.map((s, i) => (
                    <li key={`i-${i}`} className="text-xs text-gray-200 leading-relaxed">
                      <span className="text-amber-400 mr-1.5">!</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.recommendations.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-purple-300 font-bold mb-1.5">
                  Protocol
                </div>
                <div className="space-y-1.5">
                  {report.recommendations.map((r, i) => (
                    <div key={`r-${i}`} className="flex items-start gap-2">
                      <span className="w-5 h-5 shrink-0 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-100 text-[10px] font-mono flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-xs text-gray-200 leading-relaxed">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] italic text-purple-200/50 pt-1">
              — {coach.emoji} {coach.name}, your {coach.theme} coach
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default LabAnalysisCard;
