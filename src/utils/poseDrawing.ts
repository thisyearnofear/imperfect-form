import { Keypoint } from '../types/mediapipe';
import type { ExerciseMode } from './biomechanics';

const MODE_ACCENT: Record<ExerciseMode, string> = {
  pushups: '#00ff00',
  squats: '#00ffff',
  pullups: '#fcb131',
  jumps: '#ff69b4',
};

export function drawSkeleton(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  keypoints: Keypoint[],
  mode: ExerciseMode,
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

  // Styles
  ctx.save();
  if (isGhost) {
    ctx.globalAlpha = 0.3;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const accentColor = isGhost ? '#c0c0c0' : MODE_ACCENT[mode];
  const jointColor = isGhost ? '#e0e0e0' : '#ffffff';
  // Arm-driven modes highlight the arms; leg-driven modes highlight the legs
  const armsAccented = mode === 'pushups' || mode === 'pullups';
  const legsAccented = mode === 'squats' || mode === 'jumps';

  // Check if coordinates are normalized (0.0 to 1.0)
  // If all visible keypoints have values <= 1.5, assume normalized
  const sampleKeypoints = Object.values(keypointMap).slice(0, 5);
  const isNormalized =
    sampleKeypoints.length > 0 &&
    sampleKeypoints.every((kp) => kp.score > confidenceThreshold && kp.x <= 1.5 && kp.y <= 1.5);

  // Scale factor for normalized coordinates
  const scaleX = isNormalized ? ctx.canvas.width : 1;
  const scaleY = isNormalized ? ctx.canvas.height : 1;

  const connections = [
    [['left_shoulder', 'right_shoulder'], jointColor, 4],
    [['left_shoulder', 'left_hip'], jointColor, 4],
    [['right_shoulder', 'right_hip'], jointColor, 4],
    [['left_hip', 'right_hip'], jointColor, 4],
    // Arms
    [['left_shoulder', 'left_elbow'], armsAccented ? accentColor : jointColor, 6],
    [['left_elbow', 'left_wrist'], armsAccented ? accentColor : jointColor, 6],
    [['right_shoulder', 'right_elbow'], armsAccented ? accentColor : jointColor, 6],
    [['right_elbow', 'right_wrist'], armsAccented ? accentColor : jointColor, 6],
    // Legs
    [['left_hip', 'left_knee'], legsAccented ? accentColor : jointColor, 6],
    [['left_knee', 'left_ankle'], legsAccented ? accentColor : jointColor, 6],
    [['right_hip', 'right_knee'], legsAccented ? accentColor : jointColor, 6],
    [['right_knee', 'right_ankle'], legsAccented ? accentColor : jointColor, 6],
  ] as const;

  // Draw Glow
  if (!isGhost && 'shadowBlur' in ctx) {
    (ctx as any).shadowBlur = 15;
    (ctx as any).shadowColor = accentColor;
  }

  connections.forEach(([[p1Name, p2Name], color, width]) => {
    const p1 = keypointMap[p1Name];
    const p2 = keypointMap[p2Name];
    if (p1 && p2 && p1.score > confidenceThreshold && p2.score > confidenceThreshold) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.moveTo(p1.x * scaleX, p1.y * scaleY);
      ctx.lineTo(p2.x * scaleX, p2.y * scaleY);
      ctx.stroke();
    }
  });

  if ('shadowBlur' in ctx) {
    (ctx as any).shadowBlur = 0;
  }

  // Draw Keypoints
  keypoints.forEach((kp) => {
    if (kp.score > confidenceThreshold) {
      ctx.beginPath();
      ctx.arc(kp.x * scaleX, kp.y * scaleY, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });

  ctx.restore();
}

export function drawFeedback(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  mode: string,
  state: string,
  progress: number,
  warnings: string[]
) {
  ctx.save();
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  // IMPORTANT: The main canvas is mirrored with CSS scaleX(-1), which makes text appear reversed.
  // To counteract this, we flip the canvas horizontally when drawing text.
  ctx.setTransform(-1, 0, 0, 1, width, 0);

  // Rep State Text
  const statusText = state === 'down' ? 'GO UP!' : state === 'up' ? 'GO DOWN!' : 'READY';
  const statusColor = state === 'down' ? '#ff3366' : state === 'up' ? '#00ffcc' : '#ffffff';

  const statusBoxX = 20;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(statusBoxX, 20, 150, 45, 10);
  } else {
    ctx.rect(statusBoxX, 20, 150, 45);
  }
  ctx.fill();

  ctx.fillStyle = statusColor;
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(statusText, statusBoxX + 75, 52);

  // Depth Gauge
  const barWidth = 12;
  const barHeight = 200;
  const barX = width - 42;
  const barY = (height - barHeight) / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(barX, barY, barWidth, barHeight, 6);
  } else {
    ctx.rect(barX, barY, barWidth, barHeight);
  }
  ctx.fill();

  const cappedProgress = Math.max(0, Math.min(1, progress));
  const fillHeight = barHeight * cappedProgress;

  const gradient = ctx.createLinearGradient(0, barY + barHeight, 0, barY);
  gradient.addColorStop(0, '#00ffcc');
  gradient.addColorStop(1, '#ff3366');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(barX, barY + (barHeight - fillHeight), barWidth, fillHeight, 6);
  } else {
    ctx.rect(barX, barY + (barHeight - fillHeight), barWidth, fillHeight);
  }
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = 'bold 12px Outfit, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('DEPTH', barX - 5, barY - 15);

  // Warnings
  if (warnings.length > 0) {
    ctx.font = 'bold 16px Outfit, sans-serif';
    ctx.textAlign = 'right';
    warnings.forEach((msg, i) => {
      const textWidth = ctx.measureText(msg).width;
      const boxX = width - textWidth - 40;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(boxX, height - 40 - i * 30, textWidth + 20, 25, 5);
      } else {
        ctx.rect(boxX, height - 40 - i * 30, textWidth + 20, 25);
      }
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.fillText(`! ${msg}`, boxX + 10, height - 23 - i * 30);
    });
  }

  ctx.restore();
}
