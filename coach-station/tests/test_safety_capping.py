"""Executor-level safety: the choreography path must respect the interlock.

These tests exist because `execute_choreography` originally had no speed cap at
all — `trajectory.py` guarded the single-joint path via `capped_speed_deg_s`,
but multi-joint keyframes interpolated by duration alone, so a keyframe could
plan a sweep faster than the arm is allowed to be driven. `bicep_curl` reached
285.7 deg/s against a 120 deg/s ceiling.

`cap_segment_duration` fixes that by stretching any segment whose easing curve
would peak above the limit. These tests pin the behaviour so it cannot silently
regress.
"""

from __future__ import annotations

import asyncio

import pytest

from coach_station.choreography import (
    CHOREOGRAPHIES,
    EASING_MAP,
    EASING_PEAK_SLOPE,
    Choreography,
    Keyframe,
    cap_segment_duration,
    execute_choreography,
    interpolate_keyframes,
    peak_slope,
)
from coach_station.safety import STEP_DT_S, SafetyLimits, load_safety_limits

SIM_LIMITS = load_safety_limits()
#: The live envelope, for the tighter-bound checks.
LIVE_LIMITS = SafetyLimits(
    elbow_min_deg=20.0, elbow_max_deg=160.0, max_speed_deg_s=45.0, max_step_deg=3.0
)


# ─── The peak-slope table must match the curves it describes ────────────────

def _measure_peak_slope(fn, n: int = 4000) -> float:
    """Peak |df/dt| over a normalized sweep, by forward difference."""
    worst = 0.0
    prev = 0.0
    for i in range(1, n + 1):
        value = fn(i / n)
        worst = max(worst, abs(value - prev) * n)
        prev = value
    return worst


@pytest.mark.parametrize("name", sorted(EASING_MAP))
def test_easing_peak_slopes_match_the_curves(name: str) -> None:
    """EASING_PEAK_SLOPE must be measured from the curves, not guessed.

    Guessing 1.5x for the cubics (a smoothstep assumption) under-estimated the
    peak by 2x and let both curls exceed the ceiling by ~50%.
    """
    measured = _measure_peak_slope(EASING_MAP[name])
    declared = peak_slope(name)
    # The table is rounded to one decimal; allow that much slack.
    assert declared >= measured * 0.95, (
        f"{name}: table says {declared} but the curve peaks at {measured:.3f} — "
        f"an under-estimate would let the arm be driven too fast"
    )
    assert declared <= measured * 1.05 + 0.01, (
        f"{name}: table says {declared} but the curve peaks at {measured:.3f} — "
        f"a large over-estimate needlessly slows every motion"
    )


def test_every_easing_name_has_a_declared_slope() -> None:
    assert set(EASING_MAP) == set(EASING_PEAK_SLOPE)


def test_unknown_easing_falls_back_to_the_steepest_curve() -> None:
    """A typo must slow the motion down, never speed it up."""
    assert peak_slope("no_such_curve") == max(EASING_PEAK_SLOPE.values())


# ─── cap_segment_duration ───────────────────────────────────────────────────

def test_a_legal_segment_is_left_alone() -> None:
    # 10 deg over 1s at linear is 10 deg/s, far under the ceiling.
    start = {"elbow_flex": 10.0}
    end = {"elbow_flex": 20.0}
    assert cap_segment_duration(start, end, 1.0, default_easing="linear", limits=SIM_LIMITS) == 1.0


def test_an_illegal_segment_is_stretched_to_the_ceiling() -> None:
    """130 deg at the 120 deg/s ceiling with a 3x cubic peak needs 3.25s."""
    start = {"elbow_flex": 5.0}
    end = {"elbow_flex": 135.0}
    capped = cap_segment_duration(
        start, end, 0.9, default_easing="concentric", limits=SIM_LIMITS
    )
    assert capped == pytest.approx(130 * 2.0 / 120.0, rel=1e-6)


def test_capping_never_speeds_a_segment_up() -> None:
    start = {"elbow_flex": 0.0}
    end = {"elbow_flex": 180.0}
    for duration in (0.001, 0.5, 2.0, 10.0):
        capped = cap_segment_duration(start, end, duration, limits=SIM_LIMITS)
        assert capped >= duration


def test_per_joint_easing_is_honoured() -> None:
    """The steepest curve over any moving joint governs the segment."""
    start = {"elbow_flex": 0.0, "gripper": 0.0}
    end = {"elbow_flex": 10.0, "gripper": 100.0}
    linear = cap_segment_duration(
        start, end, 1.0, default_easing="linear", limits=SIM_LIMITS
    )
    # A snap on the gripper (10x peak) forces a much longer segment.
    snapped = cap_segment_duration(
        start,
        end,
        1.0,
        joint_easing={"gripper": "snap"},
        default_easing="linear",
        limits=SIM_LIMITS,
    )
    assert snapped > linear


def test_tighter_limits_produce_longer_segments() -> None:
    start = {"elbow_flex": 0.0}
    end = {"elbow_flex": 100.0}
    sim = cap_segment_duration(start, end, 0.1, limits=SIM_LIMITS)
    live = cap_segment_duration(start, end, 0.1, limits=LIVE_LIMITS)
    assert live > sim


# ─── The executor actually applies the cap ──────────────────────────────────

def _run(choreography: Choreography, limits: SafetyLimits) -> list[dict[str, float]]:
    """Execute a choreography, capturing every published frame."""
    sent: list[dict[str, float]] = []

    async def capture(joints: dict[str, float]) -> None:
        sent.append(dict(joints))

    # execute_choreography reads limits from the environment, so point it at
    # this envelope rather than the default.
    import coach_station.choreography as choreo_mod

    original = choreo_mod.load_safety_limits
    choreo_mod.load_safety_limits = lambda **_: limits
    try:
        asyncio.run(execute_choreography(choreography, capture))
    finally:
        choreo_mod.load_safety_limits = original
    return sent


@pytest.mark.parametrize("name", sorted(CHOREOGRAPHIES))
def test_executor_never_exceeds_the_speed_ceiling(name: str) -> None:
    choreography = CHOREOGRAPHIES[name]
    sent = _run(choreography, SIM_LIMITS)
    assert len(sent) > 10, "the executor published almost nothing"

    # Frame timing follows the tick, so rate = step / TICK_DT.
    rate_ceiling = min(SIM_LIMITS.max_speed_deg_s, SIM_LIMITS.max_step_deg / STEP_DT_S)
    worst = 0.0
    for prev, cur in zip(sent, sent[1:]):
        step = abs(cur.get("elbow_flex", 0.0) - prev.get("elbow_flex", 0.0))
        worst = max(worst, step / STEP_DT_S)
    assert worst <= rate_ceiling + 1e-6, f"{name} peaked at {worst:.1f} deg/s"


@pytest.mark.parametrize("name", sorted(CHOREOGRAPHIES))
def test_executor_never_exceeds_the_step_limit(name: str) -> None:
    sent = _run(CHOREOGRAPHIES[name], SIM_LIMITS)
    worst = max(
        abs(cur.get("elbow_flex", 0.0) - prev.get("elbow_flex", 0.0))
        for prev, cur in zip(sent, sent[1:])
    )
    assert worst <= SIM_LIMITS.max_step_deg + 1e-6


@pytest.mark.parametrize("name", sorted(CHOREOGRAPHIES))
def test_executor_still_reaches_every_keyframe_pose(name: str) -> None:
    """Capping must slow the motion, never distort its destination."""
    choreography = CHOREOGRAPHIES[name]
    sent = _run(choreography, SIM_LIMITS)
    for keyframe in choreography.keyframes:
        for joint, target in keyframe.joints.items():
            reached = any(
                abs(frame.get(joint, target) - target) < 1e-6 for frame in sent
            )
            assert reached, f"{name} never reached {joint}={target} (label {keyframe.label!r})"


def test_a_single_fast_keyframe_is_capped_not_trusted() -> None:
    """The regression this whole change exists for."""
    fast = Choreography(
        name="illegal",
        description="one 180-degree sweep in 100ms",
        keyframes=[
            Keyframe(joints={"elbow_flex": 0.0}, duration_s=0.1, label="start"),
            Keyframe(joints={"elbow_flex": 180.0}, duration_s=0.1, label="sweep"),
        ],
    )
    sent = _run(fast, SIM_LIMITS)
    rate_ceiling = min(SIM_LIMITS.max_speed_deg_s, SIM_LIMITS.max_step_deg / STEP_DT_S)
    worst = max(
        abs(cur["elbow_flex"] - prev["elbow_flex"]) / STEP_DT_S
        for prev, cur in zip(sent, sent[1:])
        if "elbow_flex" in cur and "elbow_flex" in prev
    )
    assert worst <= rate_ceiling + 1e-6, f"unbounded keyframe peaked at {worst:.1f} deg/s"


def test_capping_lengthens_rather_than_truncates_the_episode() -> None:
    """A stretched segment produces more frames, not fewer."""
    fast = Choreography(
        name="short",
        description="",
        keyframes=[
            Keyframe(joints={"elbow_flex": 0.0}, duration_s=0.1, label="a"),
            Keyframe(joints={"elbow_flex": 90.0}, duration_s=0.1, label="b"),
        ],
    )
    sent = _run(fast, SIM_LIMITS)
    # 90 deg at 120 deg/s needs >= 0.75s, so >= ~37 ticks at 50Hz.
    assert len(sent) >= 30