import type { NiggleJointId } from '@/lib/niggleIntents';

/**
 * Body zones → the keypoint chain the meter actually reads for that joint
 * (MoveNet 17-point model). This is the honesty contract for BodyPlate: the
 * figure may only light up what the camera can measure (docs/PHASE_B_PLAN).
 */
export interface BodyZone {
  joint: NiggleJointId;
  label: string;
  /** Keypoint names the protocol's read depends on. */
  keypoints: string[];
}

export const BODY_ZONES: Record<NiggleJointId, BodyZone> = {
  'neck-shoulders': {
    joint: 'neck-shoulders',
    label: 'Neck & shoulders',
    keypoints: ['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow'],
  },
  back: {
    joint: 'back',
    label: 'Lower back',
    keypoints: [
      'left_shoulder',
      'right_shoulder',
      'left_hip',
      'right_hip',
      'left_knee',
      'right_knee',
    ],
  },
  knee: {
    joint: 'knee',
    label: 'Knee',
    keypoints: ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'],
  },
  arm: {
    joint: 'arm',
    label: 'Arm & elbow',
    keypoints: [
      'left_shoulder',
      'right_shoulder',
      'left_elbow',
      'right_elbow',
      'left_wrist',
      'right_wrist',
    ],
  },
  'not-sure': {
    joint: 'not-sure',
    label: 'Full body',
    keypoints: [
      'nose',
      'left_shoulder',
      'right_shoulder',
      'left_hip',
      'right_hip',
      'left_knee',
      'right_knee',
      'left_ankle',
      'right_ankle',
    ],
  },
};
