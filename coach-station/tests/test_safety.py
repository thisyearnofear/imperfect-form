"""Safety limits: sim vs live defaults + env overrides."""

from coach_station.primitives import resolve_demonstration
from coach_station.safety import capped_speed_deg_s, clamp_elbow_deg, load_safety_limits
from coach_station.schema import FormEvent
from coach_station.trajectory import iter_trajectory


def _curl_event():
    return FormEvent(
        type="form_event",
        mode="curls",
        issue="elbow_swing",
        severity="warning",
        current=160.0,
        target=50.0,
        cue="Pin",
        personality="RASTA",
        rep_count=1,
        timestamp_ms=0,
    )


class TestSafetyLimits:
    def test_sim_defaults_wide(self, monkeypatch):
        monkeypatch.delenv("COACH_AFFECT", raising=False)
        monkeypatch.delenv("COACH_LIVE_CONFIRM", raising=False)
        monkeypatch.delenv("COACH_ELBOW_MIN", raising=False)
        monkeypatch.delenv("COACH_ELBOW_MAX", raising=False)
        monkeypatch.delenv("COACH_MAX_SPEED_DEG_S", raising=False)
        limits = load_safety_limits(live=False)
        assert limits.elbow_min_deg == 0.0
        assert limits.elbow_max_deg == 180.0
        assert limits.max_speed_deg_s == 120.0

    def test_live_defaults_tighter(self, monkeypatch):
        monkeypatch.delenv("COACH_ELBOW_MIN", raising=False)
        monkeypatch.delenv("COACH_ELBOW_MAX", raising=False)
        monkeypatch.delenv("COACH_MAX_SPEED_DEG_S", raising=False)
        monkeypatch.delenv("COACH_MAX_STEP_DEG", raising=False)
        limits = load_safety_limits(live=True)
        assert limits.elbow_min_deg == 20.0
        assert limits.elbow_max_deg == 160.0
        assert limits.max_speed_deg_s == 45.0
        assert limits.max_step_deg == 3.0

    def test_env_overrides_live(self, monkeypatch):
        monkeypatch.setenv("COACH_ELBOW_MIN", "30")
        monkeypatch.setenv("COACH_ELBOW_MAX", "140")
        monkeypatch.setenv("COACH_MAX_SPEED_DEG_S", "25")
        monkeypatch.setenv("COACH_MAX_STEP_DEG", "2")
        limits = load_safety_limits(live=True)
        assert limits.elbow_min_deg == 30.0
        assert limits.elbow_max_deg == 140.0
        assert limits.max_speed_deg_s == 25.0
        assert limits.max_step_deg == 2.0

    def test_capped_speed_slows_rasta_in_live(self, monkeypatch):
        monkeypatch.delenv("COACH_MAX_SPEED_DEG_S", raising=False)
        monkeypatch.delenv("COACH_MAX_STEP_DEG", raising=False)
        limits = load_safety_limits(live=True)
        # RASTA profile is 80°/s — live max is 45, and step cap may be lower
        capped = capped_speed_deg_s(80.0, limits)
        assert capped <= limits.max_speed_deg_s
        assert capped <= limits.max_step_deg / 0.04 + 1e-6

    def test_live_trajectory_stays_in_workspace_and_step(self, monkeypatch):
        monkeypatch.delenv("COACH_ELBOW_MIN", raising=False)
        monkeypatch.delenv("COACH_ELBOW_MAX", raising=False)
        monkeypatch.delenv("COACH_MAX_STEP_DEG", raising=False)
        limits = load_safety_limits(live=True)
        demo = resolve_demonstration(_curl_event())
        assert demo is not None
        prev = None
        for deg, _ in iter_trajectory(demo, limits):
            assert limits.elbow_min_deg <= deg <= limits.elbow_max_deg
            if prev is not None:
                assert abs(deg - prev) <= limits.max_step_deg + 1e-3
            prev = deg

    def test_clamp_elbow(self):
        limits = load_safety_limits(live=True)
        assert clamp_elbow_deg(-10, limits) == limits.elbow_min_deg
        assert clamp_elbow_deg(200, limits) == limits.elbow_max_deg
