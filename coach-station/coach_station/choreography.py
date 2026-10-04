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
  _6 = gripper        (0=open, 100=closed, percent of travel)

All angles in degrees for readability; converted to radians at the wire.

Gripper units: 0-100 percent of travel, NOT 0-1. The module docstring
previously claimed "0=open, 0.8=closed", which contradicted every pose in this
file (they command 45.0 to grip). poses use the 0-100 percent convention, which
is also what LeRobot's so101_follower `action` expects, so the docstring was the
wrong one. Normalise with coach_station.dataset.GRIPPER_MAX.
"""

from __future__ import annotations

import asyncio
import logging
import math
import os
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Literal, Optional

from .safety import STEP_DT_S, load_safety_limits

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


# ─── Safety capping ────────────────────────────────────────────────────────
#
# Keyframe durations alone do not bound joint speed: an easing curve's *peak
# slope* is what matters. Every cubic curve here peaks at 3x its mean rate, so a
# sweep can be perfectly legal on average and still demand a speed the arm must
# not be asked for.
#
# trajectory.py already guards the single-joint path via capped_speed_deg_s;
# the choreography path had no equivalent, so a keyframe duration could plan a
# sweep the single-joint path would have refused. cap_segment_duration uses the
# measured peak slopes below to stretch any segment that would exceed the
# interlock's limit.

#: Peak d(t)/dt of each easing curve relative to the mean rate, MEASURED from
#: the functions above rather than assumed. These are cubic curves, not the
#: quadratic/C1-smoothstep shapes the names suggest, so several peak at 3.0x,
#: not 1.5x — assuming 1.5x let the curls exceed the ceiling by ~50%.
#:
#: Guarded by tests/test_safety.py::test_easing_peak_slopes_match_the_curves,
#: which differentiates every curve and fails if this table drifts.
EASING_PEAK_SLOPE: dict[str, float] = {
    "linear": 1.0,
    "snap": 10.0,          # step function: jumps to full travel at t=0.1
    "ease_in": 3.0,        # t^3
    "ease_out": 3.0,       # 1-(1-t)^3
    "ease_in_out": 3.0,    # 4t^3 / mirrored cubic
    "ease_in_quad": 2.0,   # t^2
    "ease_out_quad": 2.0,  # 1-(1-t)^2
    "concentric": 2.0,     # alias of ease_out_quad
    "eccentric": 3.0,      # alias of ease_in_cubic
}

#: Fallback for an unknown easing name: assume the steepest curve we ship, so a
#: typo makes a motion slower rather than faster.
_UNKNOWN_PEAK_SLOPE = 10.0


def peak_slope(easing: str) -> float:
    """Peak slope factor of an easing curve, 1.0 meaning constant rate."""
    return EASING_PEAK_SLOPE.get(easing, _UNKNOWN_PEAK_SLOPE)


def cap_segment_duration(
    start: dict[str, float],
    end: dict[str, float],
    duration_s: float,
    *,
    joint_easing: dict[str, str] | None = None,
    default_easing: str = "ease_in_out",
    limits=None,
) -> float:
    """Return a duration long enough to keep every joint inside the limits.

    Two ceilings apply and the stricter wins:
      * per-tick step:  max_step_deg / STEP_DT_S
      * joint speed:    max_speed_deg_s, divided by the easing curve's peak slope

    The result is never shorter than `duration_s` — this only ever slows a
    segment down, never speeds it up.
    """
    if duration_s <= 0:
        return duration_s

    limits = limits or load_safety_limits()
    joint_easing = joint_easing or {}
    rate_ceiling = max(
        min(limits.max_speed_deg_s, limits.max_step_deg / max(STEP_DT_S, 1e-3)),
        1e-6,
    )
    required = duration_s

    for joint, target in end.items():
        source = start.get(joint, target)
        travel = abs(float(target) - float(source))
        if travel <= 0:
            continue
        easing = joint_easing.get(joint, default_easing)
        required = max(required, travel * peak_slope(easing) / rate_ceiling)

    return required


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
    # Resolved once per run so every segment is capped against the same
    # envelope (and so a mid-run env change cannot split the limits).
    limits = load_safety_limits()

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
            # Interpolate from current to target, stretching the segment if its
            # easing curve would peak above the interlock's speed or step limit.
            # Without this a keyframe duration alone could plan a sweep faster
            # than the arm is allowed to be driven — the single-joint path has
            # always guarded this via capped_speed_deg_s.
            planned = kf.duration_s * speed_scale
            duration = cap_segment_duration(
                current_pose,
                kf.joints,
                planned,
                joint_easing=kf.joint_easing or None,
                default_easing=kf.easing,
                limits=limits,
            )
            if duration > planned * 1.001:
                logger.info(
                    "[CHOREO] %s kf=%d: stretched %.3fs -> %.3fs to respect "
                    "%.0f deg/s / %.1f deg per %.2fs",
                    choreography.name,
                    idx + 1,
                    planned,
                    duration,
                    limits.max_speed_deg_s,
                    limits.max_step_deg,
                    STEP_DT_S,
                )
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
