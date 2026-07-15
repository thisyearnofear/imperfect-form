#!/usr/bin/env bash
# Cohort dry-run — software gate before camera-on stage.
# Usage: from repo root → ./scripts/cohort-dry-run.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== vitest: coach station + TTS =="
pnpm exec vitest run src/services/coachStation.test.ts src/config/ttsProviders.test.ts

echo "== pytest: coach-station =="
cd coach-station
uv sync --extra dev --quiet
COACH_ARM=console uv run pytest -q

echo "== demo CLI (console): all primitives =="
COACH_ARM=console uv run python -m coach_station.demo --demo all

echo ""
echo "Software dry-run OK."
echo "Manual stage (when ready):"
echo "  1. Terminal A:  cd coach-station && uv run python -m coach_station"
echo "  2. Terminal B:  NEXT_PUBLIC_COACH_STATION=ws://localhost:8765 pnpm dev"
echo "  3. Browser: Train intent → curls → dirty form → watch [SIM]/narration"
echo "  4. Optional Cyberwave sim: uv sync --extra cyberwave && COACH_AFFECT=simulation …"
echo "  5. Never COACH_AFFECT=live without COACH_LIVE_CONFIRM=1 + physical dead-man"
