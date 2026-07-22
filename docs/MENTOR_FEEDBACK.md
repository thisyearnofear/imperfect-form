# Mentor Feedback — Francesco De Pascale (Cyberwave)

Notes from a Q&A with Francesco De Pascale, founding engineer at Cyberwave working on robot control and vision-language-action models for the SO-101 platform.

## Context

Imperfect Form is moving from on-screen form feedback to a physical AI loop: an SO-101 robot arm (“Coach”) demonstrates the correction after the browser pose pipeline understands the user’s form. We asked Francesco three focused questions about real-world computer-vision robustness, the robotics roadmap, and edge performance for the pose model.

## 1. Pose robustness in non-controlled environments

**Question:** Our pose pipeline struggles with occlusion, bad lighting, and off-angle cameras. From your surveillance / smart-city CV work, what is one pre- or post-processing change that has given the biggest robustness win for real-time feedback?

**Answer (paraphrased):**

- A generative image-cleanup pass (he referenced a “nano banana” style model) can normalize the input before it ever reaches the pose estimator.
- Beyond occlusion, classical CV algorithms still work well for the lighting and angle problems: **camera calibration** and **exposure adjustment / night-mode processing** are the first things to try.
- Occlusion remains the hard case; lighting and angle are the tractable ones.

**Implication for us:**

MoveNet currently receives raw webcam frames. Adding a lightweight, on-device pre-processing stage (exposure normalization, white balance, lens undistortion) is lower-hanging fruit than retraining or swapping models. Generative cleanup is interesting but heavier; try classical fixes first, measure, then decide if a neural enhancement pass is worth the cost.

## 2. Robotics roadmap — from description to demonstration

**Question:** We have a manual stage → telemetry → hardware roadmap for taking the robot from “camera describes the fix” to “robot demonstrates the correction.” Given your work at Cyberwave training SmolVLA on user-collected data, what is the smallest step in that roadmap that you would trust to hold up, and what would the data pipeline for it look like?

**Answer (paraphrased):**

- **Do not jump directly into VLAs.** They are data-hungry and you will likely need to prepare the data yourself first.
- Convert **human poses to robot-achievable poses**, then move the robot through them: pose1 → pose2 → pose3. In doing so, you define the robot’s correct behavior.
- That movement generates its own data, which you can later save, revise, or use to train VLAs.
- You can use agents or build an small agentic layer to produce this mapping.
- Offered a follow-up call to dig into whether VLAs are even the right tool for this context.

**Implication for us:**

The first credible step is **not** a learned end-to-end policy. It is a deterministic or agentic pipeline that maps human joint angles to SO-101 joint angles, plays back safe trajectories, and records the resulting (pose stream, robot trajectory) pairs as LeRobot-format episodes. VLAs come only after that pipeline produces enough high-quality data.

## 3. Edge / tiny-model performance

**Question:** Pose detection is MoveNet running in-browser via TensorFlow.js — nothing leaves the device. Given your Sony work on tiny models (quantization, ONNX, IMX500, Raspberry Pi), if you had to pick one lever first for better mobile latency and battery life, would it be quantizing what we have, going smaller on architecture, or targeting a hardware-specific runtime?

**Answer (paraphrased):**

- There is no simple equation.
- **Quantization** works better when memory is the constraint, and it is generally more supported on mobile — but not always.
- Integer operations tend to be more efficient, so that is the high-level takeaway.
- The right balance is among **input size, model architecture, and quantization for hardware-aware support**.

**Implication for us:**

Do not start with quantization. Start by measuring the current MoveNet setup on real phones, then run controlled experiments: smaller input resolution first, then a smaller model variant, then quantization. Treat it as a three-knob optimization problem, not a single fix.

## Open follow-ups to schedule

1. **Robot pose mapping:** Should the robot mirror the human (left-to-left) or demonstrate from a third-person view? This changes the coordinate transform and the data format.
2. **Data collection cadence:** Record the full pose stream at full framerate and downsample later, or only capture the corrected keyframes?
3. **Edge quantization on TF.js mobile:** With TensorFlow.js on mobile Safari/Chrome, have you seen better real-world results from INT8 quantization or from shrinking input resolution first?
