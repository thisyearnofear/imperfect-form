"""Unit tests for FormEvent → Demonstration mapping and trajectories.

No Cyberwave SDK required — pure pydantic + primitives + trajectory math.
"""

from __future__ import annotations

import time

import pytest

from coach_station.primitives import PERSONA_PROFILES, resolve_demonstration
from coach_station.schema import FormEvent
from coach_station.trajectory import clamp_deg, elbow_limits, iter_trajectory, trajectory_duration_s


def _event(**overrides) -> FormEvent:
    base = {
        "type": "form_event",
        "mode": "pullups",
        "issue": "partial_bottom_rom",
        "severity": "warning",
        "cue": "test",
        "personality": "RASTA",
        "rep_count": 1,
        "timestamp_ms": int(time.time() * 1000),
    }
    base.update(overrides)
    return FormEvent.model_validate(base)


class TestResolveDemonstration:
    def test_flagship_curl_elbow_swing(self):
        demo = resolve_demonstration(
            _event(mode="curls", issue="elbow_swing", cue="Pin your elbows")
        )
        assert demo is not None
        assert demo.name == "demonstrate_strict_curl"
        assert demo.joint == "elbow_flex"
        assert demo.from_deg == 160.0
        assert demo.to_deg == 50.0

    def test_demonstrate_extension_pullup_rom(self):
        demo = resolve_demonstration(
            _event(
                mode="pullups",
                issue="partial_bottom_rom",
                current=150.0,
                target=155.0,
                cue="Full extension",
            )
        )
        assert demo is not None
        assert demo.name == "demonstrate_extension"
        assert demo.from_deg == 150.0
        assert demo.to_deg == 155.0

    def test_demonstrate_tempo_slows_persona(self):
        demo = resolve_demonstration(
            _event(mode="curls", issue="momentum", personality="RASTA", cue="Slow down")
        )
        assert demo is not None
        assert demo.name == "demonstrate_tempo"
        base = PERSONA_PROFILES["RASTA"]
        assert demo.profile.speed_deg_s == pytest.approx(base.speed_deg_s * 0.6)

    def test_mirror_asymmetry(self):
        demo = resolve_demonstration(
            _event(
                mode="pullups",
                issue="asymmetry",
                current=100.0,
                target=120.0,
                cue="Pull evenly",
            )
        )
        assert demo is not None
        assert demo.name == "mirror_asymmetry"
        assert demo.from_deg == 100.0
        assert demo.to_deg == 120.0

    def test_lower_body_returns_none(self):
        assert (
            resolve_demonstration(
                _event(mode="squats", issue="knee_valgus", cue="Knees out")
            )
            is None
        )

    def test_persona_profiles_snel_slower_than_rasta(self):
        assert PERSONA_PROFILES["SNEL"].speed_deg_s < PERSONA_PROFILES["RASTA"].speed_deg_s
        snel = resolve_demonstration(
            _event(mode="curls", issue="elbow_swing", personality="SNEL")
        )
        rasta = resolve_demonstration(
            _event(mode="curls", issue="elbow_swing", personality="RASTA")
        )
        assert snel is not None and rasta is not None
        assert snel.profile.speed_deg_s < rasta.profile.speed_deg_s


class TestTrajectory:
    def test_duration_matches_sweep_over_speed(self):
        demo = resolve_demonstration(
            _event(mode="curls", issue="elbow_swing", personality="SNEL")
        )
        assert demo is not None
        # One repeat: out + pause + back + half-pause
        sweep = abs(demo.to_deg - demo.from_deg)
        one_way = sweep / demo.profile.speed_deg_s
        expected = demo.profile.repeats * (
            one_way + demo.profile.pause_s + one_way + demo.profile.pause_s * 0.5
        )
        assert trajectory_duration_s(demo) == pytest.approx(expected, rel=0.05)

    def test_clamp_respects_env_limits(self, monkeypatch):
        monkeypatch.setenv("COACH_ELBOW_MIN", "10")
        monkeypatch.setenv("COACH_ELBOW_MAX", "90")
        assert elbow_limits() == (10.0, 90.0)
        assert clamp_deg(-5.0) == 10.0
        assert clamp_deg(120.0) == 90.0
        assert clamp_deg(45.0) == 45.0

    def test_waypoints_stay_within_limits(self, monkeypatch):
        monkeypatch.setenv("COACH_ELBOW_MIN", "20")
        monkeypatch.setenv("COACH_ELBOW_MAX", "100")
        demo = resolve_demonstration(_event(mode="curls", issue="elbow_swing"))
        assert demo is not None
        for deg, _ in iter_trajectory(demo):
            assert 20.0 <= deg <= 100.0

    def test_tempo_slower_than_strict_curl_for_same_persona(self):
        curl = resolve_demonstration(
            _event(mode="curls", issue="elbow_swing", personality="STEDDIE")
        )
        tempo = resolve_demonstration(
            _event(mode="curls", issue="momentum", personality="STEDDIE")
        )
        assert curl and tempo
        assert tempo.profile.speed_deg_s < curl.profile.speed_deg_s


class TestDemonstrationVoicePayload:
    """Shape the browser expects for voice sync (coachStation.parseDemonstration)."""

    def test_flagship_curl_has_narration_and_duration(self):
        from coach_station.trajectory import trajectory_duration_s

        demo = resolve_demonstration(
            _event(mode="curls", issue="elbow_swing", personality="RASTA")
        )
        assert demo is not None
        assert demo.narration
        duration = trajectory_duration_s(demo)
        assert duration > 0
        payload = {
            "type": "demonstration",
            "name": demo.name,
            "narration": demo.narration,
            "personality": "RASTA",
            "duration_s": round(duration, 2),
            "issue": "elbow_swing",
            "mode": "curls",
        }
        assert payload["type"] == "demonstration"
        assert "Elbow" in payload["narration"] or "elbow" in payload["narration"].lower()
