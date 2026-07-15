import type { EngineKeypoint } from './types';

/**
 * Calculates the angle in degrees between three keypoints.
 * @param a - The first keypoint (e.g., shoulder).
 * @param b - The second keypoint (the vertex, e.g., elbow).
 * @param c - The third keypoint (e.g., wrist).
 * @returns The angle in degrees (0-180).
 */
export const calculateAngle = (a: EngineKeypoint, b: EngineKeypoint, c: EngineKeypoint): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
};

// Base conversion: assume 1 pixel ≈ 0.5cm at typical camera distance
const PIXELS_TO_CM = 0.5;

export type HeightUnit = 'cm' | 'inches' | 'feet' | 'meters';

export const convertHeight = (pixels: number, unit: HeightUnit): number => {
  const cm = pixels * PIXELS_TO_CM;

  switch (unit) {
    case 'cm':
      return cm;
    case 'meters':
      return cm / 100;
    case 'inches':
      return cm / 2.54;
    case 'feet':
      return cm / 30.48;
  }
};

export const formatHeight = (pixels: number, unit: HeightUnit): string => {
  const value = convertHeight(pixels, unit);

  switch (unit) {
    case 'cm':
      return `${Math.round(value)}cm`;
    case 'meters':
      return `${value.toFixed(2)}m`;
    case 'inches':
      return `${value.toFixed(1)}"`;
    case 'feet': {
      const feet = Math.floor(value);
      const inches = (value - feet) * 12;
      return feet > 0 ? `${feet}'${inches.toFixed(1)}"` : `${inches.toFixed(1)}"`;
    }
  }
};
