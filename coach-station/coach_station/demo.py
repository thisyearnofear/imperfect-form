"""Fire demonstration primitives against create_arm() without a browser.

Usage:
  uv run python -m coach_station.demo --demo curl
  uv run python -m coach_station.demo --demo all
  COACH_AFFECT=simulation uv run python -m coach_station.demo --demo extension
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import time

from .arm import create_arm
from .primitives import resolve_demonstration
from .schema import FormEvent

logger = logging.getLogger("coach_station.demo")

DEMOS: dict[str, FormEvent] = {
    "curl": FormEvent(
        mode="curls",
        issue="elbow_swing",
        severity="warning",
        cue="Pin your elbows",
        personality="RASTA",
        rep_count=3,
        timestamp_ms=0,
    ),
    "extension": FormEvent(
        mode="pullups",
        issue="partial_bottom_rom",
        severity="warning",
        current=150.0,
        target=155.0,
        cue="Full extension",
        personality="SNEL",
        rep_count=2,
        timestamp_ms=0,
    ),
    "tempo": FormEvent(
        mode="curls",
        issue="momentum",
        severity="warning",
        cue="Slow and controlled",
        personality="STEDDIE",
        rep_count=4,
        timestamp_ms=0,
    ),
    "asymmetry": FormEvent(
        mode="pullups",
        issue="asymmetry",
        severity="critical",
        current=90.0,
        target=130.0,
        cue="Pull evenly",
        personality="RASTA",
        rep_count=1,
        timestamp_ms=0,
    ),
}


async def run_demo(name: str) -> None:
    event = DEMOS[name].model_copy(update={"timestamp_ms": int(time.time() * 1000)})
    demo = resolve_demonstration(event)
    if demo is None:
        logger.error("No demonstration resolved for %s", name)
        return

    arm = create_arm()
    logger.info(
        "Running %s → %s (%.0f° → %.0f°, %s)",
        name,
        demo.name,
        demo.from_deg,
        demo.to_deg,
        demo.narration,
    )
    await arm.demonstrate(demo)
    logger.info("Done: %s", demo.name)


async def main_async(selected: list[str]) -> None:
    for name in selected:
        await run_demo(name)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Coach station demonstration CLI")
    parser.add_argument(
        "--demo",
        choices=[*DEMOS.keys(), "all"],
        default="curl",
        help="Which primitive to run (default: curl — cohort flagship)",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    selected = list(DEMOS.keys()) if args.demo == "all" else [args.demo]
    asyncio.run(main_async(selected))


if __name__ == "__main__":
    main()
