'use client';

import React from 'react';
import { CoachPersonality, getCoachInfo } from '@/lib/coachPersonalities';
import { PersonaIcon } from './PersonaIcon';

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
    <div className="lab-analysis-card studio-card studio-card--with-header">
      {/* Banner header - studio teal strip, coaching label, persona badge */}
      <div className="lab-analysis-card__header studio-card__header">
        <span className="lab-analysis-card__header-title">Coaching analysis</span>
        <span className="lab-analysis-card__badge studio-card__badge">
          <PersonaIcon personality={coach.personality} size={12} /> {coach.name}
        </span>
      </div>

      <div className="lab-analysis-card__body studio-card__body">
        {status === 'idle' && (
          <button onClick={onGenerate} className="studio-card__button">
            🧪 Run coaching analysis
          </button>
        )}

        {status === 'loading' && (
          <div className="lab-analysis-card__loading">Analyzing biomechanics…</div>
        )}

        {status === 'error' && (
          <div className="studio-card__item studio-card__item--error">
            <div className="text-2xl">❌</div>
            <div>
              <h4 className="font-bold text-xs m-0">Analysis unavailable right now</h4>
              <p className="text-xs studio-card__muted">Your session stats are still saved.</p>
            </div>
          </div>
        )}

        {status === 'ready' && report && (
          <>
            <p className="lab-analysis-card__summary">{report.summary}</p>

            {/* Metrics strip - mono register */}
            {Object.keys(report.metrics ?? {}).length > 0 && (
              <div className="lab-analysis-card__metrics studio-card__item">
                {Object.entries(report.metrics).map(([key, value]) => (
                  <span key={key} className="lab-analysis-card__metric">
                    {METRIC_LABELS[key] ?? key.toUpperCase()}{' '}
                    <span className="lab-analysis-card__metric-value">{Math.round(value)}</span>
                  </span>
                ))}
              </div>
            )}

            {report.strengths.length > 0 && (
              <div className="lab-analysis-card__section">
                <div className="lab-analysis-card__section-title lab-analysis-card__section-title--strengths studio-card__section-title">
                  Strengths
                </div>
                <ul className="lab-analysis-card__list">
                  {report.strengths.map((s, i) => (
                    <li key={`s-${i}`} className="lab-analysis-card__list-item">
                      <span className="lab-analysis-card__list-item-icon lab-analysis-card__list-item-icon--strength">
                        +
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.issues.length > 0 && (
              <div className="lab-analysis-card__section">
                <div className="lab-analysis-card__section-title lab-analysis-card__section-title--findings studio-card__section-title">
                  Findings
                </div>
                <ul className="lab-analysis-card__list">
                  {report.issues.map((s, i) => (
                    <li key={`i-${i}`} className="lab-analysis-card__list-item">
                      <span className="lab-analysis-card__list-item-icon lab-analysis-card__list-item-icon--finding">
                        !
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.recommendations.length > 0 && (
              <div className="lab-analysis-card__section">
                <div className="lab-analysis-card__section-title lab-analysis-card__section-title--protocol studio-card__section-title">
                  Protocol
                </div>
                <div className="lab-analysis-card__recommendations">
                  {report.recommendations.map((r, i) => (
                    <div key={`r-${i}`} className="lab-analysis-card__recommendation">
                      <span className="lab-analysis-card__step">{i + 1}</span>
                      <span className="lab-analysis-card__recommendation-text">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="lab-analysis-card__byline">
              — <PersonaIcon personality={coach.personality} size={12} /> {coach.name}, your{' '}
              {coach.theme} coach
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default LabAnalysisCard;
