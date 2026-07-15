"""Demonstration primitives - form issue -> physical demonstration.

Phase 1 is deliberately "dumb": a lookup from issue type to a scripted
demonstration, parameterized by target angle and persona motion profile.
The recordings these produce (via Cyberwave) become SmolVLA training data.
"""

from dataclasses import dataclass
from typing import Optional

from .schema import CoachPersonality, FormEvent


@dataclass(frozen=True)
class MotionProfile:
    """How a persona moves the arm."""

    speed_deg_s: float  # sweep speed
    pause_s: float  # hold at the demonstrated position
    repeats: int  # how many times to demonstrate


# The coach trio as motion character: slow-deliberate / smooth-centered /
# fast-energetic. Same demonstration, different delivery.
PERSONA_PROFILES: dict[CoachPersonality, MotionProfile] = {
    "SNEL": MotionProfile(speed_deg_s=30.0, pause_s=1.5, repeats=1),
    "STEDDIE": MotionProfile(speed_deg_s=45.0, pause_s=1.0, repeats=2),
    "RASTA": MotionProfile(speed_deg_s=80.0, pause_s=0.5, repeats=2),
}


@dataclass(frozen=True)
class Demonstration:
    """A resolved demonstration ready to send to the arm."""

    name: str
    joint: str  # SO-101 joint to articulate (elbow_flex is the star)
    from_deg: float
    to_deg: float
    profile: MotionProfile
    narration: str


def resolve_demonstration(event: FormEvent) -> Optional[Demonstration]:
    """Map a form event to a demonstration, or None if the arm can't help.

    Elbow-joint corrections are the flagship (pull-ups, push-ups): a desk arm
    can literally perform them. Lower-body issues return None - the on-screen
    coach handles those.
    """
    profile = PERSONA_PROFILES[event.personality]
    current = event.current if event.current is not None else 90.0
    target = event.target if event.target is not None else 155.0

    if event.issue == "elbow_swing" and event.mode == "curls":
        # The flagship demo: the SO-101 performs a strict pinned-elbow curl.
        return Demonstration(
            name="demonstrate_strict_curl",
            joint="elbow_flex",
            from_deg=160.0,
            to_deg=50.0,
            profile=profile,
            narration="Elbow pinned - only the forearm moves. Like this.",
        )

    if event.issue == "depth" and event.mode == "curls":
        return Demonstration(
            name="demonstrate_full_curl",
            joint="elbow_flex",
            from_deg=current,
            to_deg=50.0,
            profile=profile,
            narration=f"Curl all the way up - from {current:.0f}° to 50°.",
        )

    if event.issue in ("partial_bottom_rom", "depth") and event.mode in ("pullups", "pushups"):
        return Demonstration(
            name="demonstrate_extension",
            joint="elbow_flex",
            from_deg=current,
            to_deg=target,
            profile=profile,
            narration=f"Watch: extend from {current:.0f}° to {target:.0f}° like this.",
        )

    if event.issue == "partial_top_rom" and event.mode == "pullups":
        return Demonstration(
            name="demonstrate_full_pull",
            joint="elbow_flex",
            from_deg=155.0,
            to_deg=60.0,
            profile=profile,
            narration="Watch: pull all the way through, chin over the bar.",
        )

    if event.issue in ("asymmetry", "symmetry"):
        return Demonstration(
            name="mirror_asymmetry",
            joint="elbow_flex",
            from_deg=current,
            to_deg=target,
            profile=profile,
            narration="Both sides together - watch the even tempo.",
        )

    if event.issue in ("momentum", "stability"):
        return Demonstration(
            name="demonstrate_tempo",
            joint="elbow_flex",
            from_deg=150.0,
            to_deg=70.0,
            profile=MotionProfile(
                speed_deg_s=profile.speed_deg_s * 0.6,
                pause_s=profile.pause_s,
                repeats=profile.repeats,
            ),
            narration="Slow and controlled - match this tempo.",
        )

    # trunk_lean, knee_valgus, ankle_flexion etc.: out of a desk arm's reach
    return None
