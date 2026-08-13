import { describe, expect, it } from 'vitest';
import { averageFormScore, getFormGrade } from './formGrade';

describe('form grade', () => {
  it('maps scores onto a Sandow-style letter grade', () => {
    expect(getFormGrade(94).grade).toBe('A');
    expect(getFormGrade(81).grade).toBe('B');
    expect(getFormGrade(70).grade).toBe('C');
    expect(getFormGrade(60).grade).toBe('D');
    expect(getFormGrade(40).grade).toBe('F');
  });

  it('averages a session of per-rep scores for the recap stamp', () => {
    expect(averageFormScore([90, 80, 70])).toBe(80);
    expect(averageFormScore([])).toBeNull();
    expect(averageFormScore(undefined)).toBeNull();
  });
});
