"""Multi-joint choreographies for the SO-101.

The existing primitives system is single-joint (elbow_flex only) for safety
and simplicity. Choreographies are multi-joint keyframe sequences that
coordinate the full arm to perform recognizable movements — a curl that
actually looks like a curl.

Joint mapping (SO-101 schema keys):
  _1 = shoulder_pan   (base rotation, left/right)
  _2 = shoulder_lift  (shoulder up/down — the "raise the arm" joint)
  _3 = elbow_flex     (the star — bicep curl joint)
  _4 = wrist_flex     (wrist up/down)
  _5 = wrist_roll     (wrist rotation)
  _6 = gripper        (0=open, 0.8=closed)

All angles in degrees for readability; converted to radians at the wire.
"""

from __future__ import annotations

import asyncio
import logging
import math
import os
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Literal, Optional

logger = logging.getLogger("coach_station.choreography")


def _env_tick_hz() -> float:
    """Command rate for choreography frames.

    50Hz (default) gives smooth motion against a local twin. Every frame is
    one MQTT publish through the Cyberwave broker — against a *cloud* sim twin
    the WAN can't sustain 50Hz, the publishes queue, and the arm arrives late
    and steppy. Set COACH_CHOREO_TICK_HZ=10 for cloud-sim demos; the easing
    curves are unaffected (they interpolate by duration, not by tick count).
    """
    try:
        return min(max(float(os.environ.get("COACH_CHOREO_TICK_HZ", "50")), 1.0), 50.0)
    except ValueError:
        return 50.0


# ─── Command rate ──────────────────────────────────────────────────────────
# 50Hz gives smooth, responsive motion. The Cyberwave MQTT broker and the
# SO-101 servos both handle this fine. 20ms between commands.
TICK_HZ = _env_tick_hz()
TICK_DT = 1.0 / TICK_HZ


# ─── Easing functions ──────────────────────────────────────────────────────
# Different phases of a curl need different velocity profiles.

def _ease_in_quad(t: float) -> float:
    """Accelerating from zero — explosive concentric start."""
    return t * t


def _ease_out_quad(t: float) -> float:
    """Decelerating to zero — braking at the top of a curl."""
    return 1.0 - (1.0 - t) * (1.0 - t)


def _ease_in_out_cubic(t: float) -> float:
    """Smooth S-curve — general purpose, less floaty than smooth-step."""
    if t < 0.5:
        return 4.0 * t * t * t
    else:
        return 1.0 - ((-2.0 * t + 2.0) ** 3) / 2.0


def _ease_out_cubic(t: float) -> float:
    """Fast start, long deceleration — controlled eccentric (lowering)."""
    return 1.0 - (1.0 - t) ** 3


def _ease_in_cubic(t: float) -> float:
    """Slow start, accelerating — picking up speed into a curl."""
    return t * t * t


def _linear(t: float) -> float:
    """No easing — snap or constant velocity."""
    return t


def _snap(t: float) -> float:
    """Instant — for gripper open/close."""
    return 1.0 if t > 0.1 else t * 10.0


EasingFn = Callable[[float], float]

EASING_MAP: dict[str, EasingFn] = {
    "linear": _linear,
    "snap": _snap,
    "ease_in": _ease_in_cubic,
    "ease_out": _ease_out_cubic,
    "ease_in_out": _ease_in_out_cubic,
    "ease_in_quad": _ease_in_quad,
    "ease_out_quad": _ease_out_quad,
    "concentric": _ease_out_quad,   # fast start, decel at top
    "eccentric": _ease_in_cubic,    # slow start, accel into stretch
}

EasingName = Literal[
    "linear", "snap", "ease_in", "ease_out", "ease_in_out",
    "ease_in_quad", "ease_out_quad", "concentric", "eccentric",
]


# ─── Data model ────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Keyframe:
    """A target pose with timing and per-joint easing control."""

    joints: dict[str, float]           # joint_name -> degrees
    duration_s: float                  # time to reach this pose from previous
    hold_s: float = 0.0               # pause at this pose
    easing: str = "ease_in_out"       # default easing for all joints in this keyframe
    joint_easing: dict[str, str] = field(default_factory=dict)  # per-joint override
    label: str = ""


@dataclass(frozen=True)
class Choreography:
    """A named sequence of multi-joint keyframes."""

    name: str
    description: str
    keyframes: list[Keyframe]
    repeats: int = 1


# ─── SO-101 Bicep Curl ────────────────────────────────────────────────────
#
# Biomechanics of a strict dumbbell curl:
# - Concentric (up): explosive, ~1s, bicep contracts
# - Peak contraction: brief squeeze, ~0.3s
# - Eccentric (down): slow, controlled, ~2s, resisting gravity
# - Bottom: brief pause at full extension, no bounce
#
# The shoulder stays PINNED. Any shoulder movement = cheating.
# Wrist stays neutral or slightly supinated at the top.

CURL_EXTENDED = {
    "shoulder_lift": 0.0,    # arm vertical, hanging
    "elbow_flex": 5.0,       # just off full lock (protects joint)
    "wrist_flex": 0.0,       # neutral
    "gripper": 0.0,          # open
}

CURL_CONTRACTED = {
    "shoulder_lift": 0.0,    # PINNED — no cheat
    "elbow_flex": 135.0,     # peak contraction
    "wrist_flex": 8.0,       # slight supination at top
    "gripper": 45.0,         # gripping
}

CURL_BOTTOM = {
    "shoulder_lift": 0.0,
    "elbow_flex": 5.0,       # full extension, controlled stop
    "wrist_flex": 0.0,
    "gripper": 45.0,
}

BICEP_CURL = Choreography(
    name="bicep_curl",
    description="Strict bicep curl — explosive up, controlled negative, 3 reps",
    keyframes=[
        # Setup
        Keyframe(
            joints=CURL_EXTENDED,
            duration_s=0.6,
            hold_s=0.2,
            easing="ease_out",
            label="hang — fully extended",
        ),
        Keyframe(
            joints={**CURL_EXTENDED, "gripper": 45.0},
            duration_s=0.15,
            hold_s=0.3,
            easing="linear",
            joint_easing={"gripper": "snap"},
            label="grip",
        ),
        # Rep 1
        Keyframe(
            joints=CURL_CONTRACTED,
            duration_s=0.9,
            hold_s=0.4,
            easing="concentric",
            joint_easing={"gripper": "linear", "wrist_flex": "ease_out"},
            label="rep 1 — curl up",
        ),
        Keyframe(
            joints=CURL_BOTTOM,
            duration_s=1.8,
            hold_s=0.15,
            easing="eccentric",
            joint_easing={"wrist_flex": "ease_in"},
            label="rep 1 — controlled negative",
        ),
        # Rep 2
        Keyframe(
            joints=CURL_CONTRACTED,
            duration_s=0.9,
            hold_s=0.4,
            easing="concentric",
            joint_easing={"gripper": "linear", "wrist_flex": "ease_out"},
            label="rep 2 — curl up",
        ),
        Keyframe(
            joints=CURL_BOTTOM,
            duration_s=1.8,
            hold_s=0.15,
            easing="eccentric",
            joint_easing={"wrist_flex": "ease_in"},
            label="rep 2 — controlled negative",
        ),
        # Rep 3
        Keyframe(
            joints=CURL_CONTRACTED,
            duration_s=1.0,
            hold_s=0.6,
            easing="concentric",
            joint_easing={"gripper": "linear", "wrist_flex": "ease_out"},
            label="rep 3 — curl up, extra squeeze",
        ),
        Keyframe(
            joints=CURL_BOTTOM,
            duration_s=2.2,
            hold_s=0.3,
            easing="eccentric",
            joint_easing={"wrist_flex": "ease_in"},
            label="rep 3 — slow negative, last rep",
        ),
        # Release
        Keyframe(
            joints=CURL_EXTENDED,
            duration_s=0.4,
            hold_s=0.0,
            easing="ease_out",
            joint_easing={"gripper": "snap"},
            label="release",
        ),
    ],
    repeats=1,
)

# Slow coaching version — exaggerated holds so the user can see the form
DEMO_CURL = Choreography(
    name="demo_curl_strict",
    description="Slow coaching curl — exaggerated squeeze and negative for demonstration",
    keyframes=[
        Keyframe(
            joints=CURL_EXTENDED,
            duration_s=0.8,
            hold_s=0.5,
            easing="ease_out",
            label="start — arm straight",
        ),
        Keyframe(
            joints={**CURL_EXTENDED, "gripper": 45.0},
            duration_s=0.15,
            hold_s=0.6,
            easing="linear",
            joint_easing={"gripper": "snap"},
            label="grip — ready",
        ),
        Keyframe(
            joints=CURL_CONTRACTED,
            duration_s=1.5,
            hold_s=1.5,
            easing="concentric",
            joint_easing={"wrist_flex": "ease_out"},
            label="curl up — HOLD and squeeze",
        ),
        Keyframe(
            joints=CURL_BOTTOM,
            duration_s=3.0,
            hold_s=0.8,
            easing="eccentric",
            label="3-second negative — resist gravity",
        ),
        Keyframe(
            joints=CURL_CONTRACTED,
            duration_s=1.5,
            hold_s=1.5,
            easing="concentric",
            label="again — feel the peak",
        ),
        Keyframe(
            joints=CURL_BOTTOM,
            duration_s=3.0,
            hold_s=0.5,
            easing="eccentric",
            label="controlled all the way down",
        ),
        Keyframe(
            joints=CURL_EXTENDED,
            duration_s=0.5,
            hold_s=0.0,
            easing="ease_out",
            joint_easing={"gripper": "snap"},
            label="done — release",
        ),
    ],
    repeats=1,
)

# Registry
CHOREOGRAPHIES: dict[str, Choreography] = {
    "bicep_curl": BICEP_CURL,
    "demo_curl": DEMO_CURL,
}


def choreography_duration_s(choreography: Choreography, speed_scale: float = 1.0) -> float:
    """Planned wall-clock duration: every keyframe sweep + hold, per repeat.

    The browser uses this to size narration windows and the demo-hero beat —
    a hardcoded guess here desyncs voice from arm when keyframes change.
    """
    if not choreography.keyframes:
        return 0.0
    per_rep = sum((kf.duration_s + kf.hold_s) for kf in choreography.keyframes)
    return round(per_rep * max(choreography.repeats, 1) * speed_scale, 2)


# ─── Interpolation engine ─────────────────────────────────────────────────

def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def interpolate_keyframes(
    start: dict[str, float],
    end: dict[str, float],
    duration_s: float,
    easing: str = "ease_in_out",
    joint_easing: dict[str, str] | None = None,
) -> list[dict[str, float]]:
    """Interpolate between two poses at TICK_HZ with per-joint easing.

    Each joint can have its own easing curve — the gripper snaps while
    the elbow follows a concentric/eccentric profile.
    """
    n_ticks = max(1, int(duration_s * TICK_HZ))
    frames: list[dict[str, float]] = []
    all_joints = set(start.keys()) | set(end.keys())

    # Resolve easing functions per joint
    joint_easing = joint_easing or {}
    default_fn = EASING_MAP.get(easing, _ease_in_out_cubic)
    joint_fns: dict[str, EasingFn] = {}
    for joint in all_joints:
        name = joint_easing.get(joint, easing)
        joint_fns[joint] = EASING_MAP.get(name, default_fn)

    for i in range(1, n_ticks + 1):
        raw_t = i / n_ticks
        pose: dict[str, float] = {}
        for joint in all_joints:
            a = start.get(joint, 0.0)
            b = end.get(joint, a)
            t = joint_fns[joint](raw_t)
            pose[joint] = _lerp(a, b, t)
        frames.append(pose)

    return frames


# ─── Executor ──────────────────────────────────────────────────────────────

AsyncJointSender = Callable[[dict[str, float]], Awaitable[None]]
KeyframeCallback = Callable[[int, Keyframe], Awaitable[None]]


async def execute_choreography(
    choreography: Choreography,
    send_joints: AsyncJointSender,
    *,
    speed_scale: float = 1.0,
    on_keyframe: KeyframeCallback | None = None,
) -> None:
    """Execute a choreography at TICK_HZ with per-joint easing.

    speed_scale < 1 = faster, > 1 = slower.

    Pacing is adaptive: each sleep subtracts the time the publish itself took,
    so a slow broker stretches the timeline by exactly its own latency instead
    of latency + tick. If the publish alone exceeds the tick, that's the
    transport's ceiling — log it once rather than spam per frame.
    """
    dt = TICK_DT * speed_scale
    warned_slow_publish = False

    async def _paced_send(tick_s: float, joints: dict[str, float]) -> None:
        """Publish one frame, then sleep only for the *remaining* tick budget.

        A slow broker then stretches the timeline by exactly its own latency
        instead of latency + tick. If the publish alone exceeds the tick, the
        transport has hit its ceiling — log once rather than spam per frame.
        """
        nonlocal warned_slow_publish
        started = time.monotonic()
        await send_joints(joints)
        elapsed = time.monotonic() - started
        if elapsed > tick_s and not warned_slow_publish:
            warned_slow_publish = True
            logger.warning(
                "Joint publish took %.1fms (tick budget %.1fms) — the transport "
                "cannot keep up at %sHz. Lower COACH_CHOREO_TICK_HZ or move the "
                "twin/broker closer (cloud sim adds WAN RTT to every frame).",
                elapsed * 1000,
                tick_s * 1000,
                TICK_HZ,
            )
        await asyncio.sleep(max(tick_s - elapsed, 0.0))

    for rep in range(choreography.repeats):
        # Initialize current pose from first keyframe
        current_pose: dict[str, float] = {}
        if choreography.keyframes:
            current_pose = dict(choreography.keyframes[0].joints)

        for idx, kf in enumerate(choreography.keyframes):
            # Interpolate from current to target
            duration = kf.duration_s * speed_scale
            if duration > 0.001:
                frames = interpolate_keyframes(
                    current_pose,
                    kf.joints,
                    duration,
                    easing=kf.easing,
                    joint_easing=kf.joint_easing if kf.joint_easing else None,
                )
                for frame in frames:
                    await _paced_send(dt, frame)
            else:
                # Instant snap (duration ~0)
                await send_joints(kf.joints)

            # Hold at keyframe pose
            if kf.hold_s > 0:
                # Keep sending the hold pose at a lower rate to maintain
                # position (some controllers droop without commands)
                hold_dt = TICK_DT * 4 * speed_scale
                hold_ticks = max(1, int((kf.hold_s * speed_scale) / hold_dt))
                for _ in range(hold_ticks):
                    await _paced_send(hold_dt, kf.joints)

            current_pose = dict(kf.joints)

            if on_keyframe:
                await on_keyframe(idx, kf)

            logger.info(
                "[CHOREO] %s rep=%d kf=%d/%d: %s",
                choreography.name,
                rep + 1,
                idx + 1,
                len(choreography.keyframes),
                kf.label,
            )
