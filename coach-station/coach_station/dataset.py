"""Write coach-station trajectories as LeRobot episodes.

This is the piece that makes the SmolVLA ambition real. `recordings.py` only
fetches and logs Cyberwave recordings; `primitives.py` says in a comment that
those recordings "become the dataset you train SmolVLA on". Nothing wrote one.
This module does.

Pipeline:

    choreography -> interpolate_keyframes -> Episode -> gates -> LeRobotDataset

Everything is produced from the choreographer's own frame stream, which is
already fully labelled (`Keyframe.label`) and emitted at a known interval
(`choreography.TICK_DT`). Where the arm reported encoder positions — the
`measured_deg` that `arm.py` already threads through as the only ground-truth
signal in the system — the encoder value is recorded as `observation.state` and
the commanded value as `action`, so a policy learns to track the command rather
than to imitate a plan the arm never reached.

Output format: LeRobot v3.0, `robot_type="so101_follower"`, 30 fps, written with
`LeRobotDataset.create` so the root is a drop-in replacement for any other
SO-101 dataset in `lerobot-train`. See docs/COACH_DATA_SPEC.md for the gates.

Every accepted episode also gets provenance in `coach_episodes.json`: which
choreography produced it, whether it is the original plan or a retargeted copy,
whether encoders were read, and the exact safety envelope it was gated against.
A dataset without provenance cannot be audited later.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Optional, Sequence

from .choreography import (
    CHOREOGRAPHIES,
    TICK_DT,
    Choreography,
    Keyframe,
    cap_segment_duration,
    interpolate_keyframes,
)
from .gates import (
    DATASET_FPS,
    Episode,
    EpisodeFrame,
    accept_episode,
    format_gate_table,
    limits_summary,
)
from .safety import SafetyLimits, load_safety_limits

logger = logging.getLogger("coach_station.dataset")

#: Gripper travel in percent. Choreography poses command 0-100; a 0-1 value here
#: would silently mean "fully open" for every gripping pose.
GRIPPER_MAX = 100.0

#: Joint order for the LeRobot state/action vectors. Matches the SO-101 schema
#: keys in arm.py: _1 shoulder_pan .. _5 wrist_roll, _6 gripper.
JOINT_ORDER = (
    "shoulder_pan",
    "shoulder_lift",
    "elbow_flex",
    "wrist_flex",
    "wrist_roll",
    "gripper",
)

ROBOT_TYPE = "so101_follower"


# ─── Episode construction ───────────────────────────────────────────────────

def choreography_to_frames(
    choreography: Choreography,
    *,
    speed_scale: float = 1.0,
    measured: Optional[dict[float, float]] = None,
    limits: Optional[SafetyLimits] = None,
) -> list[EpisodeFrame]:
    """Flatten a choreography into a timed, labelled frame stream.

    Walks the keyframes exactly as `execute_choreography` does — interpolate at
    TICK_HZ, then hold — so the recorded episode has the same timing the arm
    would actually experience, including the safety stretch. Recording the
    *uncapped* plan instead would write a dataset that never happened.

    `measured` optionally maps elapsed seconds to the encoder-reported elbow
    angle; without it every frame is plan-only and the episode is marked as
    having no encoder ground truth.
    """
    limits = limits or load_safety_limits()
    frames: list[EpisodeFrame] = []
    t = 0.0
    current: dict[str, float] = {}
    dt = TICK_DT * speed_scale

    for repeat in range(max(1, choreography.repeats)):
        pose: dict[str, float] = dict(current)
        for index, keyframe in enumerate(choreography.keyframes):
            target = _full_pose(keyframe.joints)
            hold_ticks = max(0, int(round(keyframe.hold_s / dt))) if dt > 0 else 0

            duration = cap_segment_duration(
                pose,
                target,
                keyframe.duration_s * speed_scale,
                joint_easing=keyframe.joint_easing or None,
                default_easing=keyframe.easing,
                limits=limits,
            )

            interpolated = interpolate_keyframes(
                pose,
                target,
                duration,
                easing=keyframe.easing,
                joint_easing=keyframe.joint_easing,
            )
            # interpolate_keyframes skips the starting pose, which the previous
            # keyframe already emitted — correct for motion, but the very first
            # keyframe would then leave the episode with no t=0 frame. Emit it
            # before the first interpolation and never again, so timestamps stay
            # strictly increasing (the monotonic_time gate depends on it).
            if not frames:
                frames.append(
                    EpisodeFrame(
                        t=t,
                        joints=dict(pose),
                        label=_label_for(keyframe, index, repeat, choreography.repeats),
                        measured_deg=_lookup(measured, t),
                    )
                )
                t += dt

            for tick_pose in interpolated:
                # Repeat holds reuse the final pose at their own timestamps.
                frames.append(
                    EpisodeFrame(
                        t=t,
                        joints=dict(tick_pose),
                        label=_label_for(keyframe, index, repeat, choreography.repeats),
                        measured_deg=_lookup(measured, t),
                    )
                )
                t += dt

            for _ in range(hold_ticks):
                frames.append(
                    EpisodeFrame(
                        t=t,
                        joints=dict(target),
                        label=keyframe.label,
                        measured_deg=_lookup(measured, t),
                    )
                )
                t += dt

            pose = target
            current = target

    return frames


def _full_pose(joints: dict[str, float]) -> dict[str, float]:
    """Fill in every joint so interpolation has a complete start/end pose.

    A keyframe that omits a joint must hold its previous value, not snap to
    zero; interpolate_keyframes already defaults missing joints to the other
    side's value, but doing it here keeps the first frame complete.
    """
    pose = {joint: 0.0 for joint in JOINT_ORDER}
    pose.update(joints)
    return pose


def _label_for(keyframe: Keyframe, index: int, repeat: int, repeats: int) -> str:
    label = keyframe.label or f"keyframe_{index}"
    return f"{label} (rep {repeat + 1}/{repeats})" if repeats > 1 else label


def _lookup(measured: Optional[dict[float, float]], t: float) -> Optional[float]:
    """Nearest measured sample to time t, if any."""
    if not measured:
        return None
    nearest = min(measured.keys(), key=lambda k: abs(k - t))
    # Beyond one tick of drift the sample describes a different moment.
    return measured[nearest] if abs(nearest - t) <= TICK_DT else None


# ─── Vector conversion ─────────────────────────────────────────────────────

def frame_to_vector(frame: EpisodeFrame, *, use_measured: bool) -> list[float]:
    """One state/action vector in JOINT_ORDER.

    Gripper is clamped to 0-GRIPPER_MAX; a negative or >100 value would encode a
    joint travel the hardware cannot reach.
    """
    values: list[float] = []
    for joint in JOINT_ORDER:
        if use_measured and joint == "elbow_flex" and frame.measured_deg is not None:
            value = frame.measured_deg
        else:
            value = frame.joints.get(joint, 0.0)
        if joint == "gripper":
            value = max(0.0, min(GRIPPER_MAX, value))
        values.append(float(value))
    return values


def resample(
    frames: Sequence[EpisodeFrame],
    fps: int = DATASET_FPS,
    *,
    use_measured: bool = False,
) -> tuple[list[list[float]], list[list[float]]]:
    """Resample an episode to `fps`, returning (states, actions).

    The choreography is authored at TICK_HZ (50 by default) but the dataset is
    30 fps to match RoboHub's SO-101 root. Resampling by linear interpolation
    between neighbouring frames keeps the two roots interchangeable; it is not a
    claim that the arm was sampled at 30 Hz.
    """
    if len(frames) < 2:
        return [], []

    t0 = frames[0].t
    span = frames[-1].t - t0
    if span <= 0:
        return [], []

    count = max(2, int(round(span * fps)) + 1)
    states: list[list[float]] = []
    actions: list[list[float]] = []

    cursor = 0
    for index in range(count):
        t = t0 + index / fps
        while cursor + 1 < len(frames) - 1 and frames[cursor + 1].t < t:
            cursor += 1
        a, b = frames[cursor], frames[min(cursor + 1, len(frames) - 1)]
        span_ab = b.t - a.t
        ratio = 0.0 if span_ab <= 0 else max(0.0, min(1.0, (t - a.t) / span_ab))

        va = frame_to_vector(a, use_measured=use_measured)
        vb = frame_to_vector(b, use_measured=use_measured)
        actions.append([x + (y - x) * ratio for x, y in zip(va, vb)])

        # State uses measured where available, else the nearest commanded pose.
        if use_measured and a.measured_deg is not None and b.measured_deg is not None:
            measured_deg = a.measured_deg + (b.measured_deg - a.measured_deg) * ratio
            states.append(
                [
                    measured_deg if joint == "elbow_flex" else v
                    for joint, v in zip(JOINT_ORDER, actions[-1])
                ]
            )
        else:
            states.append(list(actions[-1]))

    return states, actions


# ─── LeRobot writing ───────────────────────────────────────────────────────

def _lerobot_available() -> bool:
    try:
        import lerobot  # noqa: F401
    except Exception:
        return False
    return True


def write_lerobot_dataset(
    episodes: Sequence[tuple[Episode, list[list[float]], list[list[float]]]],
    out_root: Path,
    *,
    fps: int = DATASET_FPS,
) -> dict:
    """Write episodes as a LeRobot v3.0 dataset.

    Imports lerobot lazily so the rest of the station (and the gates) work in an
    environment that has no training stack installed.
    """
    if not _lerobot_available():
        raise RuntimeError(
            "lerobot is not installed. Install the training extras to write a dataset; "
            "use --json to emit gate results without one."
        )

    from lerobot.datasets.lerobot_dataset import LeRobotDataset  # type: ignore

    root = Path(out_root)
    root.parent.mkdir(parents=True, exist_ok=True)

    dataset = LeRobotDataset.create(
        repo_id="imperfect-form/coach-station",
        fps=fps,
        robot_type=ROBOT_TYPE,
        features={
            "observation.state": {
                "dtype": "float32",
                "shape": (len(JOINT_ORDER),),
                "names": list(JOINT_ORDER),
            },
            "action": {
                "dtype": "float32",
                "shape": (len(JOINT_ORDER),),
                "names": list(JOINT_ORDER),
            },
        },
        root=str(root),
        use_videos=False,
        image_writer_threads=0,
        video_backend=None,
    )

    provenance = []
    for episode, states, actions in episodes:
        for state, action in zip(states, actions):
            dataset.add_frame(
                {
                    "observation.state": state,
                    "action": action,
                }
            )
        dataset.save_episode()
        provenance.append(
            {
                "episode": episode.name,
                "description": episode.description,
                "frames": len(states),
                "duration_s": round(episode.duration_s, 3),
                "authored_fps": round(episode.authored_fps or 0.0, 2),
                "has_measured_encoders": episode.has_measured,
                "retargeted": episode.retargeted,
                "affect": episode.affect,
                "speed_scale": episode.speed_scale,
                "repeats": episode.repeats,
            }
        )

    dataset.finalize()

    meta = {
        "schema": "imperfect-form.coach-station-dataset.v1",
        "robot_type": ROBOT_TYPE,
        "fps": fps,
        "joint_order": list(JOINT_ORDER),
        "gripper_units": f"0-{GRIPPER_MAX:g} percent of travel",
        "episodes": provenance,
        "safety_envelope": limits_summary(),
    }
    (root / "coach_episodes.json").write_text(json.dumps(meta, indent=2))
    return meta


# ─── CLI ───────────────────────────────────────────────────────────────────

def _build_episodes(
    names: Sequence[str],
    *,
    speed_scale: float,
    fps: int,
    limits: SafetyLimits,
) -> tuple[list[tuple[Episode, list[list[float]], list[list[float]]]], list[dict]]:
    accepted: list[tuple[Episode, list[list[float]], list[list[float]]]] = []
    reports: list[dict] = []

    for name in names:
        choreography = CHOREOGRAPHIES.get(name)
        if choreography is None:
            logger.warning("Unknown choreography %r; known: %s", name, ", ".join(CHOREOGRAPHIES))
            continue

        frames = choreography_to_frames(choreography, speed_scale=speed_scale)
        episode = Episode(
            name=choreography.name,
            frames=frames,
            description=choreography.description,
            speed_scale=speed_scale,
            repeats=choreography.repeats,
            affect="simulation",
            # Plan-only: no encoder read happened during offline flattening.
            has_measured=False,
            retargeted=False,
        )

        ok, rows, failure = accept_episode(episode, limits)
        states, actions = resample(frames, fps, use_measured=episode.has_measured)
        report = {
            "episode": episode.name,
            "accepted": ok,
            "gates": [
                {
                    "id": r.id,
                    "name": r.name,
                    "passed": r.passed,
                    "value": r.value,
                    "limit": r.limit,
                    "why": r.why,
                }
                for r in rows
            ],
            "first_failure": None if failure is None else failure.id,
            "resampled_frames": len(states),
        }
        reports.append(report)

        logger.info("[%s] %s", episode.name, "ACCEPTED" if ok else f"REJECTED ({failure.id if failure else '?'})")
        if not ok:
            logger.info("%s", format_gate_table(rows))
            continue

        if not states:
            logger.warning("[%s] resampled to zero frames; skipping", episode.name)
            continue

        accepted.append((episode, states, actions))

    return accepted, reports


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Write coach-station trajectories as a LeRobot dataset."
    )
    parser.add_argument(
        "--choreography",
        action="append",
        dest="choreographies",
        help="Choreography name; repeatable. Defaults to all of them.",
    )
    parser.add_argument("--out", default="data/coach-station", help="Output dataset root.")
    parser.add_argument("--fps", type=int, default=DATASET_FPS)
    parser.add_argument("--speed-scale", type=float, default=1.0)
    parser.add_argument(
        "--json",
        action="store_true",
        help="Only evaluate the gates and print the report; write no dataset.",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    names = args.choreographies or list(CHOREOGRAPHIES)
    limits = load_safety_limits()

    accepted, reports = _build_episodes(
        names, speed_scale=args.speed_scale, fps=args.fps, limits=limits
    )

    payload = {
        "schema": "imperfect-form.coach-station-gates.v1",
        "safety_envelope": limits_summary(),
        "episodes": reports,
    }
    print(json.dumps(payload, indent=2, default=str))

    if args.json:
        return 0 if accepted else 1

    if not accepted:
        print("No episode passed the gates; no dataset written.", file=sys.stderr)
        return 1

    meta = write_lerobot_dataset(accepted, Path(args.out), fps=args.fps)
    print(
        f"Wrote {len(meta['episodes'])} episode(s) to {args.out} "
        f"({meta['robot_type']}, {meta['fps']} fps)"
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())