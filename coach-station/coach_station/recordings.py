"""Fetch Cyberwave twin recordings for recent coaching demonstrations.

The Cyberwave SDK has no programmatic start/stop for recordings — capture is
driven from the dashboard (Live Mode → Start Recording). This CLI is the
companion: given a station session window, it pulls the twin's robot
actuation telemetry (joints-so-101 `elbow_flex` over time) back down from
Cyberwave so you can inspect/trim it into episodes.

Why this exists: even in simulation the twin records actuation; under
`affect=live` those recordings become the dataset you train SmolVLA on
(cloth-folding tutorial pattern).

Run:
    uv run python -m coach_station.recordings --since 2026-08-03
    uv run python -m coach_station.recordings --since 2026-08-03T14:00:00Z \\
        --until 2026-08-03T15:00:00Z --inspect

Requires: uv sync --extra cyberwave, CYBERWAVE_API_KEY, and recordings to
exist for the configured `COACH_TWIN` (default the-robot-studio/so101) in
that window. Fail-silent: exits 0 with a log line when nothing applies.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys

logger = logging.getLogger("coach_station.recordings")


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="coach_station.recordings",
        description="Fetch + inspect Cyberwave twin recordings for coaching demos",
    )
    p.add_argument(
        "--since",
        default=None,
        help="ISO 8601 date or datetime; paired with --until. Both required together.",
    )
    p.add_argument(
        "--until",
        default=None,
        help="End of the window. Required iff --since is set.",
    )
    p.add_argument(
        "--inspect",
        action="store_true",
        help="Download the latest recording and print joint summary (requires cyberwave[data])",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Max recordings to list",
    )
    return p.parse_args(argv)


def _fetch(since: str | None, until: str | None, limit: int) -> list:
    """List robot/actuation recordings in the window on the configured twin."""
    from cyberwave import Cyberwave

    from .arm import SO101_TWIN

    cw = Cyberwave()
    twin = cw.twin(SO101_TWIN)
    kwargs: dict = {}
    if since and until:
        kwargs["start"] = since
        kwargs["end"] = until
    return twin.recordings.list(**kwargs)[:limit]


def _inspect(twin_slug: str) -> int:
    """Download latest robot recording and print a cheap joint summary."""
    from cyberwave import Cyberwave

    cw = Cyberwave()
    twin = cw.twin(twin_slug)
    items = twin.recordings.list(filter=[twin.recordings.types.ROBOT])
    if not items:
        logger.info("No robot-stream recordings on %s yet.", twin_slug)
        return 0
    rec = twin.recordings.get(items[0])
    try:
        table = rec.read_robot()
        logger.info("Recording %s — robot columns: %s", rec, table.schema.names)
        # Cheap summary for elbow_flex if present
        if "elbow_flex" in table.schema.names:
            col = table.column("elbow_flex")
            values = col.to_pylist()
            logger.info(
                "elbow_flex: %d samples, min=%.1f°, max=%.1f°",
                len(values),
                min(values),
                max(values),
            )
    finally:
        rec.close()
    return 0


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    args = _parse_args(argv)

    if bool(args.since) ^ bool(args.until):
        logger.error("--since and --until must be provided together.")
        return 2

    if os.environ.get("CYBERWAVE_API_KEY", "") == "":
        logger.error(
            "CYBERWAVE_API_KEY not set — fetch via Cyberwave SDK auth. "
            "See https://cyberwave.com/profile → API Tokens."
        )
        return 2

    twin_slug = os.environ.get("COACH_TWIN", "the-robot-studio/so101")
    try:
        items = _fetch(args.since, args.until, args.limit)
    except Exception as exc:
        logger.error("recordings.list failed: %s", exc)
        return 1

    logger.info("Found %d recording(s) on %s:", len(items), twin_slug)
    for item in items:
        # Item schemas from recordings.list carry uuid + created_at + types.
        logger.info("  %s", item)

    if args.inspect:
        try:
            return _inspect(twin_slug)
        except Exception as exc:
            logger.error("inspect failed: %s", exc)
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
