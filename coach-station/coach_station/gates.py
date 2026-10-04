"""Strict data gates for coach-station episodes.

docs/COACH_DATA_SPEC.md is the human-readable copy of SPEC; tests/test_gates.py
fails if this page and the code disagree.

The contract, borrowed from the RoboHub data spec:

  * every gate returns a row {id, name, passed, value, limit, why}
  * an episode is accepted only if EVERY gate passes
  * a rejection carries the first failing gate's reason, and that is the only
    reason shown

Gates are three-state, never two: ``None`` for `passed` means the gate could
not be evaluated (no measured samples, a sensor that never reported). An
unevaluable gate is NOT a pass. A dataset that silently treats missing
measurements as good measurements is worse than no dataset.

Why these numbers, and why they are NOT RoboHub's
------------------------------------------------
RoboHub gates a simulated SO-101 running a pick-and-place, and derives its
limits from the STS3215 servo's no-load speed (~4.7 rad/s at 7.4 V) plus
measured retargeted-human velocity/acceleration/jerk. Those rad/s figures are
specific to that arm, that scene, and that motion; carrying them here would be
importing numbers that were never measured on this hardware.

So every limit below is derived from something already measured *here*:

  * ``step_deg`` / ``max_step_deg`` come from safety.SafetyLimits, which is the
    interlock the live arm is actually clamped by.
  * The per-tick velocity limit is that step limit divided by the command
    interval, so a trajectory cannot pass the interlock on paper and then be
    refused at the wire.
  * Frame rate and episode length come from the choreography command rate
    (TICK_HZ) rather than an arbitrary 30.

`vel_deg_s` is therefore a *derived* bound, not an independent measurement. It
is a consistency check between the planned trajectory and the safety envelope,
not a claim about what the servo can physically do. Re-derive and re-measure
these against real telemetry before training anything on the result.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional, Sequence

from .safety import STEP_DT_S, SafetyLimits, load_safety_limits


# ─── SPEC ──────────────────────────────────────────────────────────────────

SPEC = {
    # Command rate. The writer resamples to DATASET_FPS; a trajectory authored
    # at a very different rate than recorded is resampled, not rejected.
    "authored_fps_min": 5.0,
    "authored_fps_max": 120.0,

    # Episode shape.
    "episode_s_min": 0.5,
    "episode_s_max": 60.0,

    # Per-tick command limits, derived from the safety interlock.
    # max_step_deg / TICK_DT gives the fastest legal traverse.
    "min_frames": 2,
}

#: Dataset frame rate. Matches RoboHub's SO-101 dataset so the two roots are
#: drop-in replacements for each other in lerobot-train.
DATASET_FPS = 30


@dataclass(frozen=True)
class GateResult:
    """One gate outcome. `passed` is True, False, or None when unevaluable."""

    id: str
    name: str
    passed: Optional[bool]
    value: object
    limit: str
    why: str

    @property
    def status(self) -> str:
        if self.passed is True:
            return "PASS"
        if self.passed is None:
            return "NO DATA"
        return "FAIL"


def _row(gid: str, name: str, passed: Optional[bool], value: object, limit: str, why: str = "") -> GateResult:
    """Build a gate row.

    A gate is downgraded to `None` (unevaluable) only when the caller supplied
    no value to judge. A caller's explicit `False` verdict is preserved even if
    the value is falsy — `0` or `False` are legitimate measurements, and
    swallowing them would turn a detected failure into a silent no-data.
    """
    if value is None and passed is None:
        passed = None
    return GateResult(
        id=gid,
        name=name,
        passed=passed,
        value=value,
        limit=limit,
        why="" if passed in (True, None) else why,
    )


# ─── Episode model ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class EpisodeFrame:
    """One commanded frame of a trajectory, in degrees."""

    t: float                    # seconds from episode start
    joints: dict[str, float]    # joint_name -> degrees
    label: str = ""             # keyframe label in force at this frame
    measured_deg: Optional[float] = None   # elbow_flex as observed, when available


@dataclass
class Episode:
    """A recorded trajectory plus the provenance needed to trust it."""

    name: str
    frames: list[EpisodeFrame]
    description: str = ""
    speed_scale: float = 1.0
    repeats: int = 1
    affect: str = "simulation"
    # Whether the arm actually reported encoder positions for these frames.
    has_measured: bool = False
    # Whether the frames are the choreographer's plan or a retargeted copy.
    retargeted: bool = False

    @property
    def duration_s(self) -> float:
        if len(self.frames) < 2:
            return 0.0
        return self.frames[-1].t - self.frames[0].t

    @property
    def authored_fps(self) -> Optional[float]:
        if len(self.frames) < 2:
            return None
        span = self.duration_s
        if span <= 0:
            return None
        return (len(self.frames) - 1) / span


# ─── Gates ─────────────────────────────────────────────────────────────────

def _finite(value: float) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(value)


def episode_gates(
    episode: Episode,
    limits: Optional[SafetyLimits] = None,
) -> list[GateResult]:
    """Run every gate on an episode.

    A gate that cannot be evaluated returns None rather than passing, so an
    episode with no measurable duration cannot be accepted.
    """
    limits = limits or load_safety_limits()
    frames = episode.frames
    rows: list[GateResult] = []

    # ── Shape ──
    n = len(frames)
    rows.append(
        _row(
            "frames",
            "frame count",
            n >= SPEC["min_frames"],
            n,
            f">= {SPEC['min_frames']}",
            f"Only {n} frame(s); a trajectory needs at least {SPEC['min_frames']} to have a direction.",
        )
    )
    if n < SPEC["min_frames"]:
        return rows

    duration = episode.duration_s
    rows.append(
        _row(
            "duration",
            "episode length",
            SPEC["episode_s_min"] <= duration <= SPEC["episode_s_max"],
            round(duration, 3),
            f"{SPEC['episode_s_min']}-{SPEC['episode_s_max']} s",
            f"Episode is {duration:.2f}s, outside {SPEC['episode_s_min']}-{SPEC['episode_s_max']}s.",
        )
    )

    fps = episode.authored_fps
    rows.append(
        _row(
            "authored_fps",
            "commanded frame rate",
            None if fps is None else (SPEC["authored_fps_min"] <= fps <= SPEC["authored_fps_max"]),
            None if fps is None else round(fps, 2),
            f"{SPEC['authored_fps_min']}-{SPEC['authored_fps_max']} fps",
            f"Commanded at {fps:.1f} fps, outside the authored range." if fps is not None else "",
        )
    )

    # ── Workspace ──
    # Every commanded joint must sit inside the interlock's elbow envelope.
    # The live arm clamps at the wire, but a plan outside the envelope means the
    # recorded trajectory is not the trajectory that would be executed.
    elbow_vals = [
        f.joints["elbow_flex"]
        for f in frames
        if "elbow_flex" in f.joints and _finite(f.joints["elbow_flex"])
    ]
    rows.append(
        _row(
            "elbow_workspace",
            "elbow inside safety envelope",
            None
            if not elbow_vals
            else all(limits.elbow_min_deg <= v <= limits.elbow_max_deg for v in elbow_vals),
            None
            if not elbow_vals
            else [round(min(elbow_vals), 2), round(max(elbow_vals), 2)],
            f"{limits.elbow_min_deg}-{limits.elbow_max_deg} deg",
            f"Commanded elbow left the {limits.elbow_min_deg}-{limits.elbow_max_deg} deg envelope.",
        )
    )

    # ── Rate ──
    # Two independent ceilings apply, and the stricter one wins:
    #   * max_speed_deg_s is the interlock's own speed limit
    #   * max_step_deg / STEP_DT_S bounds a per-tick traverse
    # A plan that exceeds either would be clamped at the wire, which means the
    # recorded trajectory is not the trajectory the arm would execute.
    speed_limit = float(limits.max_speed_deg_s)
    step_limit_deg_s = float(limits.max_step_deg) / STEP_DT_S
    rate_limit = min(speed_limit, step_limit_deg_s)

    worst_step = 0.0
    worst_step_t = None
    worst_rate = 0.0
    worst_rate_t = None
    for prev, cur in zip(frames, frames[1:]):
        dt = cur.t - prev.t
        if dt <= 0:
            continue
        j = prev.joints.get("elbow_flex")
        k = cur.joints.get("elbow_flex")
        if j is None or k is None or not (_finite(j) and _finite(k)):
            continue
        delta = abs(k - j)
        if delta > worst_step:
            worst_step, worst_step_t = delta, cur.t
        rate = delta / dt
        if rate > worst_rate:
            worst_rate, worst_rate_t = rate, cur.t

    rows.append(
        _row(
            "elbow_rate",
            "elbow traverse rate",
            None if worst_rate_t is None else worst_rate <= rate_limit,
            None if worst_rate_t is None else round(worst_rate, 2),
            f"<= {rate_limit:.1f} deg/s "
            f"(min of speed {speed_limit:g} and step {float(limits.max_step_deg):g}/{STEP_DT_S}s)",
            # Built only when there is a failure to explain; worst_rate_t is
            # None on a passing gate and must not be formatted into the message.
            (
                f"Elbow traversed at {worst_rate:.1f} deg/s at t={worst_rate_t:.2f}s, above "
                f"the {rate_limit:.1f} deg/s the interlock permits."
                if worst_rate_t is not None and worst_rate > rate_limit
                else ""
            ),
        )
    )

    rows.append(
        _row(
            "elbow_step",
            "elbow step per command",
            None if worst_step_t is None else worst_step <= float(limits.max_step_deg),
            None if worst_step_t is None else round(worst_step, 3),
            f"<= {float(limits.max_step_deg):g} deg",
            (
                f"Elbow moved {worst_step:.2f} deg in one command at t={worst_step_t:.2f}s, "
                f"above the {float(limits.max_step_deg):g} deg per-command limit."
                if worst_step_t is not None and worst_step > float(limits.max_step_deg)
                else ""
            ),
        )
    )

    # ── Every commanded joint must be finite ──
    nonfinite = sum(
        1
        for f in frames
        for v in f.joints.values()
        if not _finite(v)
    )
    rows.append(
        _row(
            "finite_joints",
            "all commanded angles finite",
            nonfinite == 0,
            nonfinite,
            "0 non-finite",
            f"{nonfinite} commanded joint value(s) were NaN or infinite.",
        )
    )

    # ── Monotonic time ──
    non_increasing = sum(1 for a, b in zip(frames, frames[1:]) if b.t <= a.t)
    rows.append(
        _row(
            "monotonic_time",
            "timestamps strictly increasing",
            non_increasing == 0,
            non_increasing,
            "0 non-increasing steps",
            f"{non_increasing} frame timestamp(s) did not advance.",
        )
    )

    return rows


def gate_ids() -> list[str]:
    """Stable gate ids, in evaluation order. Used by the doc-sync test."""
    return [
        "frames",
        "duration",
        "authored_fps",
        "elbow_workspace",
        "elbow_rate",
        "elbow_step",
        "finite_joints",
        "monotonic_time",
    ]


def accept_episode(
    episode: Episode,
    limits: Optional[SafetyLimits] = None,
) -> tuple[bool, list[GateResult], Optional[GateResult]]:
    """Return (accepted, rows, first_failure).

    Only the first failure's reason is surfaced: the earliest gate in the
    pipeline is usually the upstream cause of everything after it.
    """
    rows = episode_gates(episode, limits)
    first_failure = next((r for r in rows if r.passed is not True), None)
    accepted = first_failure is None
    return accepted, rows, first_failure


def format_gate_table(rows: Sequence[GateResult]) -> str:
    """Render gates as a markdown table, plus the single reason that matters."""
    lines = ["| id | gate | result | value | limit |", "| --- | --- | --- | --- | --- |"]
    for r in rows:
        lines.append(f"| {r.id} | {r.name} | {r.status} | {r.value} | {r.limit} |")
    failure = next((r for r in rows if r.passed is False), None)
    if failure is not None and failure.why:
        lines.append("")
        lines.append(failure.why)
    return "\n".join(lines)


def limits_summary(limits: Optional[SafetyLimits] = None) -> str:
    """One-line provenance of the envelope a dataset was gated against."""
    limits = limits or load_safety_limits()
    return (
        f"elbow {limits.elbow_min_deg:g}-{limits.elbow_max_deg:g} deg, "
        f"max step {limits.max_step_deg:g} deg per {STEP_DT_S}s, "
        f"max speed {limits.max_speed_deg_s:g} deg/s"
    )