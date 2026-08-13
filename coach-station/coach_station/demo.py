"""Fire demonstration primitives against create_arm() without a browser.

Usage:
  uv run python -m coach_station.demo --demo curl
  uv run python -m coach_station.demo --demo all
  COACH_AFFECT=simulation uv run python -m coach_station.demo --demo extension

Multi-joint choreographies (the arm actually performs a full curl):
  uv run python -m coach_station.demo --choreo bicep_curl
  uv run python -m coach_station.demo --choreo demo_curl
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import time

from .arm import create_arm
from .choreography import CHOREOGRAPHIES
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


async def run_choreography(name: str) -> None:
    choreo = CHOREOGRAPHIES[name]
    arm = create_arm()
    logger.info(
        "Running choreography: %s — %s (%d keyframes)",
        choreo.name,
        choreo.description,
        len(choreo.keyframes),
    )
    await arm.run_choreography(choreo)
    logger.info("Done: %s", choreo.name)


async def main_async(selected: list[str], *, choreo: str | None = None) -> None:
    if choreo:
        await run_choreography(choreo)
    else:
        for name in selected:
            await run_demo(name)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Coach station demonstration CLI")
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--demo",
        choices=[*DEMOS.keys(), "all"],
        default=None,
        help="Single-joint primitive to run (legacy)",
    )
    group.add_argument(
        "--choreo",
        choices=[*CHOREOGRAPHIES.keys()],
        default=None,
        help="Multi-joint choreography: bicep_curl (normal) or demo_curl (slow coaching)",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

    if args.choreo:
        asyncio.run(main_async([], choreo=args.choreo))
    else:
        demo = args.demo or "curl"
        selected = list(DEMOS.keys()) if demo == "all" else [demo]
        asyncio.run(main_async(selected))


if __name__ == "__main__":
    main()
