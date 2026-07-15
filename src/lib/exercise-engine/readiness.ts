import { calculateAngle } from './poseMath';
import type { EngineExercise, EngineKeypoint } from './types';

/**
 * Progressive pose-readiness system. Ported from imperfectcoach.
 *
 * Scores how ready the user is to start (visibility 40%, positioning 25%,
 * stability 20%, exercise posture 15%) and produces actionable suggestions
 * instead of a binary ready/not-ready gate.
 */

export type ReadinessLevel = 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT' | 'READY';

export interface ReadinessScore {
  overall: ReadinessLevel;
  score: number; // 0-100
  issues: ReadinessIssue[];
  feedback: string;
  canProceed: boolean;
}

export interface ReadinessIssue {
  type: 'VISIBILITY' | 'POSITIONING' | 'STABILITY' | 'POSTURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  suggestion: string;
  fixable: boolean;
}

export interface ReadinessConfig {
  exercise: EngineExercise;
  adaptiveThresholds: boolean; // Learn from user over time
  strictMode: boolean; // For competitions vs casual use
  stabilityFrames: number; // How many frames to require stability
}

interface SubScore {
  score: number;
  issues: ReadinessIssue[];
}

export class PoseReadinessSystem {
  private frameHistory: EngineKeypoint[][] = [];
  private stabilityHistory: number[] = [];
  private userCalibrationData = new Map<string, number>();
  private readonly maxHistoryFrames = 30;

  constructor(private config: ReadinessConfig) {}

  public analyzePoseReadiness(
    keypoints: EngineKeypoint[],
    videoDimensions: { width: number; height: number }
  ): ReadinessScore {
    this.updatePoseHistory(keypoints);

    const issues: ReadinessIssue[] = [];
    let totalScore = 0;
    let weightSum = 0;

    const visibilityAnalysis = this.analyzeKeypointVisibility(keypoints);
    issues.push(...visibilityAnalysis.issues);
    totalScore += visibilityAnalysis.score * 0.4;
    weightSum += 0.4;

    const positioningAnalysis = this.analyzeBodyPositioning(keypoints, videoDimensions);
    issues.push(...positioningAnalysis.issues);
    totalScore += positioningAnalysis.score * 0.25;
    weightSum += 0.25;

    const stabilityAnalysis = this.analyzePoseStability();
    issues.push(...stabilityAnalysis.issues);
    totalScore += stabilityAnalysis.score * 0.2;
    weightSum += 0.2;

    const postureAnalysis = this.analyzeExercisePosture(keypoints);
    issues.push(...postureAnalysis.issues);
    totalScore += postureAnalysis.score * 0.15;
    weightSum += 0.15;

    const finalScore = weightSum > 0 ? totalScore / weightSum : 0;

    return {
      overall: this.scoreToReadinessLevel(finalScore),
      score: Math.round(finalScore),
      issues: issues.sort(
        (a, b) => this.severityToNumber(b.severity) - this.severityToNumber(a.severity)
      ),
      feedback: this.generateProgressiveFeedback(finalScore, issues),
      canProceed: this.canUserProceed(finalScore, issues),
    };
  }

  private analyzeKeypointVisibility(keypoints: EngineKeypoint[]): SubScore {
    const requiredKeypoints = this.getRequiredKeypoints();
    const issues: ReadinessIssue[] = [];
    let visibleCount = 0;
    let totalConfidence = 0;

    const keypointsMap = new Map(keypoints.map((k) => [k.name ?? '', k]));

    for (const keypointName of requiredKeypoints) {
      const keypoint = keypointsMap.get(keypointName);
      const confidence = keypoint?.score ?? 0;

      if (confidence > 0.25) {
        visibleCount++;
        totalConfidence += confidence;
      } else {
        const severity = confidence < 0.05 ? 'HIGH' : confidence < 0.15 ? 'MEDIUM' : 'LOW';
        issues.push({
          type: 'VISIBILITY',
          severity,
          message: `${keypointName.replace('_', ' ')} not clearly visible`,
          suggestion: this.getVisibilitySuggestion(keypointName, confidence),
          fixable: true,
        });
      }
    }

    const visibilityScore = (visibleCount / requiredKeypoints.length) * 100;
    const confidenceScore =
      requiredKeypoints.length > 0 ? (totalConfidence / requiredKeypoints.length) * 100 : 0;

    return {
      score: Math.min(visibilityScore, confidenceScore),
      issues,
    };
  }

  private analyzeBodyPositioning(
    keypoints: EngineKeypoint[],
    videoDimensions: { width: number; height: number }
  ): SubScore {
    const issues: ReadinessIssue[] = [];
    const keypointsMap = new Map(keypoints.map((k) => [k.name ?? '', k]));

    const leftShoulder = keypointsMap.get('left_shoulder');
    const rightShoulder = keypointsMap.get('right_shoulder');
    const leftAnkle = keypointsMap.get('left_ankle');
    const rightAnkle = keypointsMap.get('right_ankle');

    if (!leftShoulder || !rightShoulder || !leftAnkle || !rightAnkle) {
      return { score: 0, issues };
    }

    let positioningScore = 100;

    // Horizontal centering - progressive scoring instead of binary
    const bodyCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const frameCenterX = videoDimensions.width / 2;
    const horizontalOffset = Math.abs(bodyCenterX - frameCenterX);
    const horizontalOffsetRatio = horizontalOffset / (videoDimensions.width / 2);

    if (horizontalOffsetRatio > 0.6) {
      positioningScore -= 20;
      issues.push({
        type: 'POSITIONING',
        severity: 'MEDIUM',
        message: 'You need to be more centered in the frame',
        suggestion: `Move ${bodyCenterX < frameCenterX ? 'right' : 'left'} to center yourself`,
        fixable: true,
      });
    } else if (horizontalOffsetRatio > 0.4) {
      positioningScore -= 10;
      issues.push({
        type: 'POSITIONING',
        severity: 'LOW',
        message: 'Try to center yourself better in the frame',
        suggestion: `Move slightly ${bodyCenterX < frameCenterX ? 'right' : 'left'}`,
        fixable: true,
      });
    }

    // Body size in frame - progressive scoring
    const bodyHeight = Math.abs(leftShoulder.y - leftAnkle.y);
    const bodyHeightRatio = bodyHeight / videoDimensions.height;

    if (bodyHeightRatio < 0.2) {
      positioningScore -= 15;
      issues.push({
        type: 'POSITIONING',
        severity: 'MEDIUM',
        message: 'You appear too small in the frame',
        suggestion: 'Move closer to the camera',
        fixable: true,
      });
    } else if (bodyHeightRatio < 0.3) {
      positioningScore -= 5;
      issues.push({
        type: 'POSITIONING',
        severity: 'LOW',
        message: 'Consider moving a bit closer to the camera',
        suggestion: 'Step forward slightly for better detection',
        fixable: true,
      });
    } else if (bodyHeightRatio > 0.9) {
      positioningScore -= 10;
      issues.push({
        type: 'POSITIONING',
        severity: 'LOW',
        message: 'You appear too close to the camera',
        suggestion: 'Step back so your full body is visible',
        fixable: true,
      });
    }

    return {
      score: Math.max(0, positioningScore),
      issues,
    };
  }

  private analyzePoseStability(): SubScore {
    const issues: ReadinessIssue[] = [];

    if (this.frameHistory.length < 3) {
      return { score: 50, issues }; // Neutral score while gathering data
    }

    const recentFrames = this.frameHistory.slice(-5);
    const movements = this.calculateFrameToFrameMovement(recentFrames);
    const avgMovement = movements.reduce((a, b) => a + b, 0) / movements.length;

    let stabilityScore = 100;

    if (avgMovement > 40) {
      stabilityScore -= 25;
      issues.push({
        type: 'STABILITY',
        severity: 'MEDIUM',
        message: 'Try to stay more still',
        suggestion: 'Stand steady for a moment to calibrate',
        fixable: true,
      });
    } else if (avgMovement > 25) {
      stabilityScore -= 10;
      issues.push({
        type: 'STABILITY',
        severity: 'LOW',
        message: 'Almost steady - hold still a bit longer',
        suggestion: 'Minimize movement for better calibration',
        fixable: true,
      });
    }

    this.stabilityHistory.push(stabilityScore);
    if (this.stabilityHistory.length > 10) {
      this.stabilityHistory.shift();
    }

    return {
      score: Math.max(0, stabilityScore),
      issues,
    };
  }

  private analyzeExercisePosture(keypoints: EngineKeypoint[]): SubScore {
    const issues: ReadinessIssue[] = [];

    if (this.config.exercise === 'jumps') {
      return this.analyzeJumpPosture(keypoints, issues);
    }
    return this.analyzePullupPosture(keypoints, issues);
  }

  private analyzeJumpPosture(keypoints: EngineKeypoint[], issues: ReadinessIssue[]): SubScore {
    const keypointsMap = new Map(keypoints.map((k) => [k.name ?? '', k]));

    const leftHip = keypointsMap.get('left_hip');
    const rightHip = keypointsMap.get('right_hip');
    const leftKnee = keypointsMap.get('left_knee');
    const rightKnee = keypointsMap.get('right_knee');
    const leftAnkle = keypointsMap.get('left_ankle');
    const rightAnkle = keypointsMap.get('right_ankle');

    if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
      return { score: 0, issues };
    }

    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

    let postureScore = 100;

    const idealKneeAngle = this.config.adaptiveThresholds
      ? (this.userCalibrationData.get('preferred_knee_angle') ?? 140)
      : 140;

    if (avgKneeAngle < idealKneeAngle - 30) {
      postureScore -= 20;
      issues.push({
        type: 'POSTURE',
        severity: 'LOW',
        message: 'Stand up straighter for better jump detection',
        suggestion: 'Straighten your legs to a comfortable standing position',
        fixable: true,
      });
    } else if (avgKneeAngle < idealKneeAngle - 15) {
      postureScore -= 5;
      issues.push({
        type: 'POSTURE',
        severity: 'LOW',
        message: 'Try standing slightly straighter',
        suggestion: 'Relax into a natural standing posture',
        fixable: true,
      });
    }

    // Learn the user's preferred posture over time
    if (this.config.adaptiveThresholds && avgKneeAngle > 120) {
      this.userCalibrationData.set('preferred_knee_angle', avgKneeAngle);
    }

    return {
      score: Math.max(0, postureScore),
      issues,
    };
  }

  private analyzePullupPosture(keypoints: EngineKeypoint[], issues: ReadinessIssue[]): SubScore {
    const keypointsMap = new Map(keypoints.map((k) => [k.name ?? '', k]));

    const nose = keypointsMap.get('nose');
    const leftWrist = keypointsMap.get('left_wrist');
    const rightWrist = keypointsMap.get('right_wrist');
    const leftShoulder = keypointsMap.get('left_shoulder');
    const rightShoulder = keypointsMap.get('right_shoulder');
    const leftHip = keypointsMap.get('left_hip');
    const rightHip = keypointsMap.get('right_hip');
    const leftKnee = keypointsMap.get('left_knee');
    const rightKnee = keypointsMap.get('right_knee');
    const leftAnkle = keypointsMap.get('left_ankle');
    const rightAnkle = keypointsMap.get('right_ankle');

    if (
      !nose ||
      !leftWrist ||
      !rightWrist ||
      !leftShoulder ||
      !rightShoulder ||
      !leftHip ||
      !rightHip ||
      !leftKnee ||
      !rightKnee ||
      !leftAnkle ||
      !rightAnkle
    ) {
      return { score: 0, issues };
    }

    let postureScore = 100;
    const minConfidence = 0.4;

    const avgWristY = (leftWrist.y + rightWrist.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const isHanging = avgWristY < avgShoulderY;

    // Lower body visibility is critical for full-body tracking
    const lowerBodyPoints = [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle];
    const lowerBodyVisible = lowerBodyPoints.filter((p) => (p.score ?? 0) > minConfidence).length;

    if (lowerBodyVisible < 4) {
      postureScore -= 30;
      issues.push({
        type: 'VISIBILITY',
        severity: 'HIGH',
        message: 'Lower body not fully visible',
        suggestion: 'Step back so camera can see your full body from head to feet',
        fixable: true,
      });
    } else if (lowerBodyVisible < 6) {
      postureScore -= 15;
      issues.push({
        type: 'VISIBILITY',
        severity: 'MEDIUM',
        message: 'Some lower body points obscured',
        suggestion: 'Adjust camera angle to see your legs and feet clearly',
        fixable: true,
      });
    }

    const criticalPoints = [nose, leftWrist, rightWrist, leftShoulder, rightShoulder];
    const criticalVisible = criticalPoints.filter((p) => (p.score ?? 0) > minConfidence).length;

    if (criticalVisible < 4) {
      postureScore -= 40;
      issues.push({
        type: 'VISIBILITY',
        severity: 'HIGH',
        message: 'Cannot see key upper body points',
        suggestion: 'Make sure your head, shoulders, and hands are clearly visible',
        fixable: true,
      });
    }

    if (isHanging) {
      // In good side profile, wrist and shoulder widths should be similar
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      const wristWidth = Math.abs(leftWrist.x - rightWrist.x);
      const widthRatio = Math.min(shoulderWidth, wristWidth) / Math.max(shoulderWidth, wristWidth);

      if (widthRatio < 0.3) {
        postureScore -= 15;
        issues.push({
          type: 'POSITIONING',
          severity: 'LOW',
          message: 'Camera angle could be better',
          suggestion: 'Try positioning camera at 45° angle or side view for optimal tracking',
          fixable: true,
        });
      }
    } else {
      // Not hanging yet - gentle guidance without penalty
      issues.push({
        type: 'POSTURE',
        severity: 'LOW',
        message: 'Ready to start',
        suggestion: 'Hang from the bar when ready to begin',
        fixable: true,
      });
    }

    return {
      score: Math.max(0, postureScore),
      issues,
    };
  }

  private updatePoseHistory(keypoints: EngineKeypoint[]) {
    this.frameHistory.push(keypoints);
    if (this.frameHistory.length > this.maxHistoryFrames) {
      this.frameHistory.shift();
    }
  }

  private calculateFrameToFrameMovement(frames: EngineKeypoint[][]): number[] {
    if (frames.length < 2) return [0];

    const movements: number[] = [];
    const trackedKeypoints = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'];

    for (let i = 1; i < frames.length; i++) {
      const prevFrame = new Map(frames[i - 1].map((k) => [k.name ?? '', k]));
      const currFrame = new Map(frames[i].map((k) => [k.name ?? '', k]));

      let totalMovement = 0;
      let keypointCount = 0;

      for (const kpName of trackedKeypoints) {
        const prev = prevFrame.get(kpName);
        const curr = currFrame.get(kpName);

        if (prev && curr && (prev.score ?? 0) > 0.3 && (curr.score ?? 0) > 0.3) {
          const movement = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
          totalMovement += movement;
          keypointCount++;
        }
      }

      movements.push(keypointCount > 0 ? totalMovement / keypointCount : 0);
    }

    return movements;
  }

  private getRequiredKeypoints(): string[] {
    if (this.config.exercise === 'jumps') {
      return [
        'left_hip',
        'right_hip',
        'left_knee',
        'right_knee',
        'left_ankle',
        'right_ankle',
        'left_shoulder',
        'right_shoulder',
      ];
    }
    return [
      'left_wrist',
      'right_wrist',
      'left_elbow',
      'right_elbow',
      'left_shoulder',
      'right_shoulder',
    ];
  }

  private getVisibilitySuggestion(keypointName: string, confidence: number): string {
    const bodyPart = keypointName.replace('_', ' ');

    if (confidence < 0.1) {
      return `Make sure your ${bodyPart} is clearly visible and not blocked`;
    }
    if (confidence < 0.2) {
      return `Improve lighting or adjust position to see your ${bodyPart} better`;
    }
    return `Slight adjustment needed for ${bodyPart} visibility`;
  }

  private scoreToReadinessLevel(score: number): ReadinessLevel {
    if (score >= 70) return 'READY';
    if (score >= 55) return 'EXCELLENT';
    if (score >= 40) return 'GOOD';
    if (score >= 25) return 'FAIR';
    return 'POOR';
  }

  private severityToNumber(severity: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    switch (severity) {
      case 'HIGH':
        return 3;
      case 'MEDIUM':
        return 2;
      case 'LOW':
        return 1;
    }
  }

  private generateProgressiveFeedback(score: number, issues: ReadinessIssue[]): string {
    if (score >= 70) {
      return "Excellent! You're ready to start your workout.";
    }

    const highPriorityIssues = issues.filter((i) => i.severity === 'HIGH' && i.fixable);
    if (highPriorityIssues.length > 0) {
      return highPriorityIssues[0].suggestion;
    }

    const mediumPriorityIssues = issues.filter((i) => i.severity === 'MEDIUM' && i.fixable);
    if (mediumPriorityIssues.length > 0) {
      return mediumPriorityIssues[0].suggestion;
    }

    if (score >= 35) {
      return "Almost ready! Make small adjustments and you'll be set.";
    }

    if (score >= 20) {
      return "You're getting there! Follow the suggestions to improve.";
    }

    return "Let's get you set up properly. Follow the suggestions above.";
  }

  private canUserProceed(score: number, issues: ReadinessIssue[]): boolean {
    const hasHighSeverityIssues = issues.some((i) => i.severity === 'HIGH');

    if (this.config.strictMode) {
      return score >= 60 || !hasHighSeverityIssues;
    }
    return score >= 40 || !hasHighSeverityIssues;
  }

  public reset() {
    this.frameHistory = [];
    this.stabilityHistory = [];
  }
}
