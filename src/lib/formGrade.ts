/** Letter grade + accent color for a 0–100 form score. */
export function getFormGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'A', color: '#4ade80' };
  if (score >= 80) return { grade: 'B', color: '#75e6b1' };
  if (score >= 70) return { grade: 'C', color: '#fbbf24' };
  if (score >= 60) return { grade: 'D', color: '#f97316' };
  return { grade: 'F', color: '#ef4444' };
}
