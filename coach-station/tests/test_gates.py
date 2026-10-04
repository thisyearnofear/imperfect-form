"""Gates and the doc that documents them must agree.

RoboHub keeps docs/DATA-SPEC.md and gates.py SPEC in lockstep with a test that
fails when they drift. This is that test: every limit in SPEC, every derived
bound, and every gate id must appear in docs/COACH_DATA_SPEC.md.

If you change a threshold in coach_station/gates.py and this test fails, update
the doc — do not relax the assertion.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from coach_station import gates
from coach_station.choreography import CHOREOGRAPHIES, TICK_DT, TICK_HZ
from coach_station.dataset import GRIPPER_MAX, JOINT_ORDER, ROBOT_TYPE, choreography_to_frames
from coach_station.gates import Episode, EpisodeFrame, accept_episode, episode_gates
from coach_station.safety import STEP_DT_S, load_safety_limits

REPO = Path(__file__).resolve().parents[2]
DOC = REPO / "docs" / "COACH_DATA_SPEC.md"


@pytest.fixture(scope="module")
def doc() -> str:
    assert DOC.exists(), f"{DOC} is missing; it is the human-readable copy of SPEC"
    return DOC.read_text()


# ─── Doc / code agreement ───────────────────────────────────────────────────

def test_doc_lists_every_gate_id(doc: str) -> None:
    for gate_id in gates.gate_ids():
        assert gate_id in doc, f"gate {gate_id!r} is not documented in {DOC.name}"


def test_doc_states_every_spec_limit(doc: str) -> None:
    for key, value in gates.SPEC.items():
        assert str(value) in doc, f"SPEC[{key!r}] = {value} is not stated in {DOC.name}"


def test_doc_states_the_dataset_fps(doc: str) -> None:
    assert str(gates.DATASET_FPS) in doc


def test_doc_states_the_derived_rate_bound(doc: str) -> None:
    """The effective rate limit is min(speed, step/dt) and must be published."""
    limits = load_safety_limits()
    bound = min(limits.max_speed_deg_s, limits.max_step_deg / STEP_DT_S)
    assert f"{bound:.1f}" in doc, (
        f"the effective elbow rate bound {bound:.1f} deg/s is not stated in {DOC.name}"
    )


def test_effective_rate_bound_is_the_stricter_of_the_two_ceilings() -> None:
    """The step-derived ceiling alone would be looser than the speed limit."""
    limits = load_safety_limits()
    step_only = limits.max_step_deg / STEP_DT_S
    effective = min(limits.max_speed_deg_s, step_only)
    assert effective == limits.max_speed_deg_s
    assert step_only > effective


def test_doc_states_the_safety_envelope(doc: str) -> None:
    limits = load_safety_limits()
    for value in (limits.elbow_min_deg, limits.elbow_max_deg, limits.max_step_deg):
        assert str(int(value)) in doc or f"{value:g}" in doc


def test_doc_states_the_gripper_units(doc: str) -> None:
    assert str(int(GRIPPER_MAX)) in doc
    assert "gripper" in doc.lower()


def test_doc_states_the_robot_type_and_joint_order(doc: str) -> None:
    assert ROBOT_TYPE in doc
    for joint in JOINT_ORDER:
        assert joint in doc


def test_doc_does_not_publish_a_stale_gate_id(doc: str) -> None:
    """A gate id in the doc that no longer exists in code is drift."""
    documented = set(re.findall(r"`([a-z_]+)`", doc))
    known = set(gates.gate_ids())
    # Only ids in the gate table are load-bearing; other backticked snake_case
    # words are prose or JSON keys.
    unknown = {d for d in documented if d.endswith(("_frames", "_rate", "_time", "_joints", "_workspace"))} - known
    assert not unknown, f"{DOC.name} documents gates that no longer exist: {sorted(unknown)}"


# ─── Gate behaviour ─────────────────────────────────────────────────────────

def _episode(**overrides) -> Episode:
    # Long enough to clear the 0.5 s minimum, at the 50 Hz command rate.
    frames = [
        EpisodeFrame(t=i * 0.02, joints={"elbow_flex": 5.0 + i, "gripper": 45.0}, label="kf")
        for i in range(50)
    ]
    kwargs = {"name": "test", "frames": frames}
    kwargs.update(overrides)
    return Episode(**kwargs)


def test_accepts_a_well_formed_episode() -> None:
    ok, rows, failure = accept_episode(_episode())
    assert ok is True
    assert failure is None
    assert all(r.passed is True for r in rows)


def test_rejects_too_few_frames_and_says_so_first() -> None:
    episode = Episode(name="tiny", frames=[EpisodeFrame(t=0.0, joints={"elbow_flex": 5.0})])
    ok, _rows, failure = accept_episode(episode)
    assert ok is False
    assert failure is not None and failure.id == "frames"


def test_rejects_elbow_outside_the_envelope() -> None:
    limits = load_safety_limits()
    frames = [
        EpisodeFrame(t=i * 0.02, joints={"elbow_flex": limits.elbow_max_deg + 10.0})
        for i in range(50)
    ]
    ok, _rows, failure = accept_episode(Episode(name="out", frames=frames), limits)
    assert ok is False
    assert failure is not None and failure.id == "elbow_workspace"


def test_rejects_a_traverse_faster_than_the_interlock() -> None:
    """A plan that would be clamped at the wire must not pass as-is."""
    frames = [
        EpisodeFrame(t=i * 0.02, joints={"elbow_flex": 5.0 if i < 25 else 150.0})
        for i in range(50)
    ]
    ok, _rows, failure = accept_episode(Episode(name="fast", frames=frames))
    assert ok is False
    assert failure is not None and failure.id == "elbow_rate"


def test_rejects_non_finite_joint_values() -> None:
    frames = [EpisodeFrame(t=i * 0.02, joints={"elbow_flex": float("nan")}) for i in range(50)]
    rows = episode_gates(Episode(name="nan", frames=frames))
    finite = next(r for r in rows if r.id == "finite_joints")
    assert finite.passed is False


def test_rejects_non_monotonic_time() -> None:
    frames = [EpisodeFrame(t=0.02 * (i % 3), joints={"elbow_flex": 10.0}) for i in range(50)]
    rows = episode_gates(Episode(name="time", frames=frames))
    mono = next(r for r in rows if r.id == "monotonic_time")
    assert mono.passed is False


def test_an_empty_episode_reports_no_data_rather_than_passing() -> None:
    """An unevaluable gate is never a pass."""
    rows = episode_gates(Episode(name="empty", frames=[]))
    assert rows[0].id == "frames"
    assert rows[0].passed is False
    # With no frames the remaining gates cannot run at all.
    assert all(r.passed is None or r.id == "frames" for r in rows)


def test_only_the_first_failure_is_surfaced() -> None:
    # Two frames at the same timestamp: too few frames AND non-monotonic time.
    frames = [
        EpisodeFrame(t=0.0, joints={"elbow_flex": 10.0}),
        EpisodeFrame(t=0.0, joints={"elbow_flex": 10.0}),
    ]
    _ok, rows, failure = accept_episode(Episode(name="dup", frames=frames))
    failures = [r for r in rows if r.passed is not True]
    assert failure is not None
    assert failure.id == failures[0].id
    assert failure.why, "the surfaced failure must carry a reason"


def test_gate_table_marks_no_data_distinctly() -> None:
    rows = [
        gates.GateResult("a", "A", True, 1, "1", ""),
        gates.GateResult("b", "B", False, 0, "1", "too small"),
        gates.GateResult("c", "C", None, None, "1", "nothing to measure"),
    ]
    table = gates.format_gate_table(rows)
    assert "| a | A | PASS |" in table
    assert "| b | B | FAIL |" in table
    assert "| c | C | NO DATA |" in table
    assert "too small" in table


# ─── Shipped choreographies pass their own gates ───────────────────────────

@pytest.mark.parametrize("name", sorted(CHOREOGRAPHIES))
def test_shipped_choreographies_pass_the_gates(name: str) -> None:
    """Every shipped choreography must be gated, and the gates must accept it.

    These were all rejected on elbow_rate before the executor grew a speed cap:
    `execute_choreography` never applied `capped_speed_deg_s`, so a keyframe
    duration alone could plan a sweep the single-joint path would refuse.
    `bicep_curl` peaked at 285.7 deg/s against a 120 deg/s ceiling. The cap now
    stretches the offending segment, so the recorded episode is the one the arm
    would actually perform.
    """
    frames = choreography_to_frames(CHOREOGRAPHIES[name])
    ok, rows, failure = accept_episode(Episode(name=name, frames=frames))
    assert ok, (
        f"{name} rejected by {failure.id if failure else '?'}\n{gates.format_gate_table(rows)}"
    )


@pytest.mark.parametrize("name", sorted(CHOREOGRAPHIES))
def test_shipped_choreographies_stay_under_the_speed_ceiling(name: str) -> None:
    """Belt and braces: the measured peak rate must sit just under the limit."""
    frames = choreography_to_frames(CHOREOGRAPHIES[name])
    rows = {r.id: r for r in episode_gates(Episode(name=name, frames=frames))}
    assert rows["elbow_rate"].passed is True
    assert rows["elbow_step"].passed is True


def test_a_planted_speed_violation_is_still_caught() -> None:
    """The gate must remain capable of failing, not just of passing.

    If this cannot fail, the gate proves nothing about the capped episodes.
    """
    frames = [
        EpisodeFrame(t=i * 0.02, joints={"elbow_flex": 5.0 if i < 25 else 150.0})
        for i in range(50)
    ]
    ok, _rows, failure = accept_episode(Episode(name="fast", frames=frames))
    assert not ok
    assert failure is not None and failure.id == "elbow_rate"


def test_choreography_frames_start_at_zero_and_advance() -> None:
    frames = choreography_to_frames(CHOREOGRAPHIES["bicep_curl"])
    assert frames[0].t == 0.0
    assert all(b.t > a.t for a, b in zip(frames, frames[1:]))
    # Every frame carries a label, so the dataset is segmentable.
    assert all(f.label for f in frames)