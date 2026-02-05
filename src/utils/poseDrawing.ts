import { Keypoint } from '../types/mediapipe';

export function drawSkeleton(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  keypoints: Keypoint[],
  mode: 'pushups' | 'squats'
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
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const accentColor = mode === 'squats' ? '#00ffff' : '#00ff00';
  const connections = [
    [['left_shoulder', 'right_shoulder'], '#ffffff', 4],
    [['left_shoulder', 'left_hip'], '#ffffff', 4],
    [['right_shoulder', 'right_hip'], '#ffffff', 4],
    [['left_hip', 'right_hip'], '#ffffff', 4],
    // Arms
    [['left_shoulder', 'left_elbow'], mode === 'pushups' ? accentColor : '#ffffff', 6],
    [['left_elbow', 'left_wrist'], mode === 'pushups' ? accentColor : '#ffffff', 6],
    [['right_shoulder', 'right_elbow'], mode === 'pushups' ? accentColor : '#ffffff', 6],
    [['right_elbow', 'right_wrist'], mode === 'pushups' ? accentColor : '#ffffff', 6],
    // Legs
    [['left_hip', 'left_knee'], mode === 'squats' ? accentColor : '#ffffff', 6],
    [['left_knee', 'left_ankle'], mode === 'squats' ? accentColor : '#ffffff', 6],
    [['right_hip', 'right_knee'], mode === 'squats' ? accentColor : '#ffffff', 6],
    [['right_knee', 'right_ankle'], mode === 'squats' ? accentColor : '#ffffff', 6],
  ] as const;

  // Draw Glow
  if ('shadowBlur' in ctx) {
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
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
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
      ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
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
  let statusText = state === 'down' ? 'GO UP!' : state === 'up' ? 'GO DOWN!' : 'READY';
  let statusColor = state === 'down' ? '#ff3366' : state === 'up' ? '#00ffcc' : '#ffffff';

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
