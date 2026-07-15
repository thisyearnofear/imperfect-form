"""Coach station server: receives FormEvents from the web app over WebSocket
and turns them into physical demonstrations on the SO-101 ("Coach").

Run:  python -m coach_station          (console simulation)
      COACH_AFFECT=live python -m coach_station   (real arm via Cyberwave)

When a demo starts, the station emits a `demonstration` JSON event back to the
browser so voice narration can sync to the arm motion (provider-agnostic TTS
lives on the web client).
"""

import asyncio
import json
import logging
import os

import websockets
from pydantic import ValidationError

from .arm import create_arm
from .primitives import resolve_demonstration
from .schema import FormEvent, SessionEvent
from .trajectory import trajectory_duration_s

logger = logging.getLogger("coach_station")

HOST = os.environ.get("COACH_HOST", "127.0.0.1")
PORT = int(os.environ.get("COACH_PORT", "8765"))

# Don't repeat the same demonstration back-to-back; the coach isn't a parrot.
DEMO_COOLDOWN_S = 8.0


class CoachStation:
    def __init__(self) -> None:
        self.arm = create_arm()
        self._busy = asyncio.Lock()
        self._last_demo: dict[str, float] = {}

    async def handle_event(self, websocket, raw: str) -> None:
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            logger.warning("Ignoring non-JSON message")
            return

        event_type = payload.get("type")
        if event_type in ("session_start", "session_end"):
            try:
                session = SessionEvent.model_validate(payload)
            except ValidationError as exc:
                logger.warning("Bad session event: %s", exc)
                return
            logger.info("%s: mode=%s coach=%s", session.type, session.mode, session.personality)
            return

        try:
            event = FormEvent.model_validate(payload)
        except ValidationError as exc:
            logger.warning("Bad form event: %s", exc)
            return

        demo = resolve_demonstration(event)
        if demo is None:
            logger.debug("No demonstration for issue=%s mode=%s", event.issue, event.mode)
            return

        loop = asyncio.get_running_loop()
        last = self._last_demo.get(demo.name, 0.0)
        if loop.time() - last < DEMO_COOLDOWN_S:
            return
        if self._busy.locked():
            return  # one demonstration at a time; drop rather than queue stale corrections

        async with self._busy:
            self._last_demo[demo.name] = loop.time()
            duration = trajectory_duration_s(demo)
            logger.info(
                "Demonstrating %s for %s (%s, rep %d) · %.1fs · %s",
                demo.name,
                event.issue,
                event.personality,
                event.rep_count,
                duration,
                demo.narration,
            )
            # Voice sync cue — browser TTS speaks while the arm moves.
            try:
                await websocket.send(
                    json.dumps(
                        {
                            "type": "demonstration",
                            "name": demo.name,
                            "narration": demo.narration,
                            "personality": event.personality,
                            "duration_s": round(duration, 2),
                            "issue": event.issue,
                            "mode": event.mode,
                        }
                    )
                )
            except Exception as exc:
                logger.debug("Could not emit demonstration event: %s", exc)

            await self.arm.demonstrate(demo)

    async def handler(self, websocket) -> None:
        peer = websocket.remote_address
        logger.info("Web app connected: %s", peer)
        try:
            async for message in websocket:
                await self.handle_event(websocket, message)
        except websockets.ConnectionClosed:
            pass
        finally:
            logger.info("Web app disconnected: %s", peer)


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    station = CoachStation()
    async with websockets.serve(station.handler, HOST, PORT):
        logger.info("Coach station listening on ws://%s:%d", HOST, PORT)
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
