"""Live-mode gate: never arm hardware without explicit confirm."""

from coach_station.arm import resolve_affect


class TestResolveAffect:
    def test_default_simulation(self, monkeypatch):
        monkeypatch.delenv("COACH_AFFECT", raising=False)
        monkeypatch.delenv("COACH_LIVE_CONFIRM", raising=False)
        assert resolve_affect() == "simulation"

    def test_live_without_confirm_falls_back(self, monkeypatch):
        monkeypatch.setenv("COACH_AFFECT", "live")
        monkeypatch.delenv("COACH_LIVE_CONFIRM", raising=False)
        assert resolve_affect() == "simulation"

    def test_live_with_confirm(self, monkeypatch):
        monkeypatch.setenv("COACH_AFFECT", "live")
        monkeypatch.setenv("COACH_LIVE_CONFIRM", "1")
        assert resolve_affect() == "live"

    def test_sim_alias(self, monkeypatch):
        monkeypatch.setenv("COACH_AFFECT", "sim")
        assert resolve_affect() == "simulation"
