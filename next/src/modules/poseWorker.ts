/// <reference lib="webworker" />
import '@tensorflow/tfjs-backend-webgl';
import { createDetector, SupportedModels, PoseDetector } from '@tensorflow-models/pose-detection';

let detector: PoseDetector;
let ctx: OffscreenCanvasRenderingContext2D;
let repState: 'up' | 'down' | 'middle' = 'middle';
let repCount = 0;
let mode: 'pushups' | 'squats' = 'pushups';

function calculateAngle(a: any, b: any, c: any) {
  if (!a || !b || !c) return 0;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function detectPushup(keypoints: any[]) {
  const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
  const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
  const leftElbow = keypoints.find(kp => kp.name === 'left_elbow');
  const rightElbow = keypoints.find(kp => kp.name === 'right_elbow');
  const leftWrist = keypoints.find(kp => kp.name === 'left_wrist');
  const rightWrist = keypoints.find(kp => kp.name === 'right_wrist');
  if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || !leftWrist || !rightWrist) return false;
  const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const avgAngle = (leftArmAngle + rightArmAngle) / 2;
  const isDown = avgAngle < 80;
  const isUp = avgAngle > 160;
  if (isDown && repState !== 'down') {
    repState = 'down';
    return false;
  }
  if (isUp && repState === 'down') {
    repState = 'up';
    return true;
  }
  return false;
}

function detectSquat(keypoints: any[]) {
  const leftHip = keypoints.find(kp => kp.name === 'left_hip');
  const rightHip = keypoints.find(kp => kp.name === 'right_hip');
  const leftKnee = keypoints.find(kp => kp.name === 'left_knee');
  const rightKnee = keypoints.find(kp => kp.name === 'right_knee');
  const leftAnkle = keypoints.find(kp => kp.name === 'left_ankle');
  const rightAnkle = keypoints.find(kp => kp.name === 'right_ankle');
  if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) return false;
  const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const avgAngle = (leftAngle + rightAngle) / 2;
  const isDown = avgAngle < 110;
  const isUp = avgAngle > 160;
  if (isDown && repState !== 'down') {
    repState = 'down';
    return false;
  }
  if (isUp && repState === 'down') {
    repState = 'up';
    return true;
  }
  return false;
}

self.addEventListener('message', async (event) => {
  const data = event.data;
  if (data.type === 'init') {
    const offscreen: OffscreenCanvas = data.canvas;
    mode = data.mode;
    offscreen.width = data.width;
    offscreen.height = data.height;
    ctx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D;
    detector = await createDetector(SupportedModels.MoveNet, { modelType: 'SINGLEPOSE_LIGHTNING' });
    repState = 'middle'; repCount = 0;
  } else if (data.type === 'frame') {
    const bitmap: ImageBitmap = data.bitmap;
    const poses = await detector.estimatePoses(bitmap);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (poses.length > 0) {
      const keypoints = poses[0].keypoints.map((kp: any) => ({ ...kp, name: kp.name || '' }));
      if ((mode === 'pushups' && detectPushup(keypoints)) || (mode === 'squats' && detectSquat(keypoints))) {
        repCount += 1;
        self.postMessage({ type: 'rep', count: repCount });
      }
      // draw skeleton
      ctx.strokeStyle = '#fcb131'; ctx.lineWidth = 2;
      poses[0].keypoints.forEach((kp: any) => {
        if (kp.score > 0.5) {
          ctx.beginPath(); ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#00ff00'; ctx.fill();
        }
      });
    }
    bitmap.close();
  }
});
