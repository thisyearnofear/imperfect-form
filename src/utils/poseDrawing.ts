import { Keypoint } from '../types/mediapipe';
import type { ExerciseMode } from './biomechanics';

/**
 * Pose skeleton renderer — the on-canvas proof that the AI sees you.
 *
 * Design: studio palette (teal skeleton, brass correction joint), tapered
 * bones, soft outer glow, and a short motion trail so movement leaves a
 * ghost. One palette for all modes — no per-mode arcade colours.
 *
 * The skeleton is always-on (it's the trust proof). Ghost traces (PB races)
 * render at low alpha through the same path.
 */

// Studio palette — single source of truth for the skeleton.
const SKELETON_TEAL = '#56d9c3';
const SKELETON_TEAL_SOFT = 'rgba(86, 217, 195, 0.55)';
const JOINT_CORE = '#effcf9';
const JOINT_RING = SKELETON_TEAL;
const GHOST_INK = 'rgba(220, 240, 236, 0.5)';

// Motion trail — last N keypoint frames at low alpha.
const TRAIL_LENGTH = 4;
const trailFrames: { keypoints: Keypoint[]; t: number }[] = [];

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function drawSkeleton(
  ctx: Ctx,
  keypoints: Keypoint[],
  _mode: ExerciseMode,
  isGhost: boolean = false
) {
  const confidenceThreshold = 0.3;
  const keypointMap = keypoints.reduce(
    (map, kp) => {
      if (kp.name) map[kp.name] = kp;
      return map;
    },
    {} as Record<string, Keypoint>
  );

  ctx.save();
  if (isGhost) {
    ctx.globalAlpha = 0.28;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Normalized (0–1) vs pixel coords — MoveNet returns normalized.
  const sampleKeypoints = Object.values(keypointMap).slice(0, 5);
  const isNormalized =
    sampleKeypoints.length > 0 &&
    sampleKeypoints.every((kp) => kp.score > confidenceThreshold && kp.x <= 1.5 && kp.y <= 1.5);
  const scaleX = isNormalized ? ctx.canvas.width : 1;
  const scaleY = isNormalized ? ctx.canvas.height : 1;

  const boneColor = isGhost ? GHOST_INK : SKELETON_TEAL;
  const jointColor = isGhost ? GHOST_INK : JOINT_CORE;

  // Bone connections — uniform teal, tapered via two passes (wide soft + thin core).
  const connections: [string, string][] = [
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_shoulder', 'left_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_shoulder', 'right_elbow'],
    ['right_elbow', 'right_wrist'],
    ['left_hip', 'left_knee'],
    ['left_knee', 'left_ankle'],
    ['right_hip', 'right_knee'],
    ['right_knee', 'right_ankle'],
  ];

  // Motion trail (live only, not ghost) — fading echoes of recent frames.
  if (!isGhost) {
    trailFrames.push({ keypoints, t: performance.now() });
    if (trailFrames.length > TRAIL_LENGTH) trailFrames.shift();
    trailFrames.slice(0, -1).forEach((frame, i) => {
      const alpha = (i / TRAIL_LENGTH) * 0.12;
      ctx.globalAlpha = alpha;
      drawBones(
        ctx,
        frame.keypoints,
        connections,
        keypointMap,
        scaleX,
        scaleY,
        SKELETON_TEAL_SOFT,
        3,
        confidenceThreshold
      );
    });
    ctx.globalAlpha = isGhost ? 0.28 : 1;
  }

  // Bones: wide soft pass (the glow) + thin core pass (the line).
  drawBones(
    ctx,
    keypoints,
    connections,
    keypointMap,
    scaleX,
    scaleY,
    boneColor,
    6,
    confidenceThreshold,
    !isGhost
  );
  drawBones(
    ctx,
    keypoints,
    connections,
    keypointMap,
    scaleX,
    scaleY,
    jointColor,
    2,
    confidenceThreshold
  );

  // Joints — teal ring + paper core. Active joints (wrists, ankles, knees, elbows) slightly larger.
  const activeJoints = new Set([
    'left_elbow',
    'right_elbow',
    'left_wrist',
    'right_wrist',
    'left_knee',
    'right_knee',
    'left_ankle',
    'right_ankle',
  ]);

  keypoints.forEach((kp) => {
    if (kp.score <= confidenceThreshold) return;
    const x = kp.x * scaleX;
    const y = kp.y * scaleY;
    const r = activeJoints.has(kp.name ?? '') ? 5.5 : 4;

    // Soft outer ring (the glow) — replaces the hard shadowBlur.
    if (!isGhost) {
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
      ctx.fillStyle = SKELETON_TEAL_SOFT;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = isGhost ? 0.28 : 1;
    }

    // Teal ring
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = jointColor;
    ctx.fill();
    ctx.strokeStyle = JOINT_RING;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.restore();
}

/** Draw the bone connections with a given style. Two passes = tapered glow. */
function drawBones(
  ctx: Ctx,
  keypoints: Keypoint[],
  connections: [string, string][],
  keypointMap: Record<string, Keypoint>,
  scaleX: number,
  scaleY: number,
  color: string,
  width: number,
  confidenceThreshold: number,
  glow = false
) {
  if (glow && 'shadowBlur' in ctx) {
    (ctx as CanvasRenderingContext2D).shadowBlur = 8;
    (ctx as CanvasRenderingContext2D).shadowColor = color;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  connections.forEach(([p1Name, p2Name]) => {
    const p1 = keypointMap[p1Name];
    const p2 = keypointMap[p2Name];
    if (p1 && p2 && p1.score > confidenceThreshold && p2.score > confidenceThreshold) {
      ctx.beginPath();
      ctx.moveTo(p1.x * scaleX, p1.y * scaleY);
      ctx.lineTo(p2.x * scaleX, p2.y * scaleY);
      ctx.stroke();
    }
  });
  if (glow && 'shadowBlur' in ctx) {
    (ctx as CanvasRenderingContext2D).shadowBlur = 0;
  }
}

// Canvas feedback (GO UP! / depth bar / warnings) was removed — coaching cues
// live in the DOM HUD (LiveCoachingStatus) and the depth indicator lives in
// GameHUD. The canvas renders only the skeleton + ghost, keeping the studio
// aesthetic clean. If on-canvas feedback is needed again, add it to GameHUD,
// not here.
