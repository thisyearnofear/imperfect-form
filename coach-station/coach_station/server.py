"""Coach station server: receives FormEvents from the web app over WebSocket
and turns them into physical demonstrations on the SO-101 ("Coach").

Run:  python -m coach_station          (console simulation)
      COACH_AFFECT=live python -m coach_station   (real arm via Cyberwave)

When a demo starts, the station emits a `demonstration` JSON event back to the
browser so voice narration can sync to the arm motion (provider-agnostic TTS
lives on the web client).
"""

import asyncio
import inspect
import json
import logging
import os
import time
import uuid

import websockets
from pydantic import ValidationError

from .arm import ArmAdapter, create_arm
from .choreography import CHOREOGRAPHIES, Choreography, choreography_duration_s
from .primitives import resolve_demonstration, to_demonstration_intent
from .schema import (
    CommandResultV1,
    DemoSkippedV1,
    FormEvent,
    RobotStateV1,
    SessionEvent,
    TrajectoryProgressV1,
)
from .trajectory import trajectory_duration_s

logger = logging.getLogger("coach_station")

HOST = os.environ.get("COACH_HOST", "127.0.0.1")
PORT = int(os.environ.get("COACH_PORT", "8765"))

# Don't repeat the same demonstration back-to-back; the coach isn't a parrot.
DEMO_COOLDOWN_S = 8.0


class CoachStation:
    def __init__(self, arm: ArmAdapter | None = None) -> None:
        self.arm = arm or create_arm()
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
        since_last = loop.time() - last
        if since_last < DEMO_COOLDOWN_S or self._busy.locked():
            # Dropping is deliberate (one demo at a time; never queue stale
            # corrections) — but a silent drop reads as latency or a dead
            # bridge. Tell the browser so the UI can acknowledge the cue.
            reason = "busy" if self._busy.locked() else "cooldown"
            retry_in = 0.0 if reason == "busy" else round(DEMO_COOLDOWN_S - since_last, 1)
            logger.debug(
                "Skipping %s (%s) for %s — retry in %.1fs",
                demo.name, reason, event.issue, retry_in,
            )
            await self._send_json(websocket, DemoSkippedV1(
                reason=reason,
                name=demo.name,
                issue=event.issue,
                mode=event.mode,
                retry_in_s=retry_in,
                timestamp_ms=int(time.time() * 1000),
            ).model_dump())
            return

        # Route: choreography (multi-joint) or single-joint primitive?
        choreo = self._resolve_choreography(event)
        if choreo:
            await self._execute_choreography(websocket, event, demo, choreo)
        else:
            await self._execute_single_joint(websocket, event, demo)

    async def _send_json(self, websocket, payload: dict) -> None:
        try:
            await websocket.send(json.dumps(payload))
        except Exception as exc:
            logger.debug("Could not emit station feedback: %s", exc)

    async def _send_state(self, websocket, state: RobotStateV1) -> None:
        await self._send_json(websocket, state.model_dump())

    def _resolve_choreography(self, event: FormEvent) -> Choreography | None:
        """Route form events to multi-joint choreographies when available.

        Choreographies are the 'impressive' path — the arm performs the full
        movement rather than just sweeping a single joint. Falls back to None
        so the single-joint primitive handles it.
        """
        if event.issue == "elbow_swing" and event.mode == "curls":
            return CHOREOGRAPHIES["bicep_curl"]
        if event.issue == "momentum" and event.mode == "curls":
            return CHOREOGRAPHIES["demo_curl"]  # slow, exaggerated = tempo coaching
        return None

    async def _execute_choreography(
        self,
        websocket,
        event: FormEvent,
        demo,
        choreo: Choreography,
    ) -> None:
        """Execute a multi-joint choreography and emit UI events."""
        async with self._busy:
            command_id = uuid.uuid4().hex
            self._last_demo[demo.name] = asyncio.get_running_loop().time()

            logger.info(
                "Choreography %s for %s (%s, rep %d) · %s",
                choreo.name,
                event.issue,
                event.personality,
                event.rep_count,
                choreo.description,
            )

            # Tell the UI the robot is executing
            await self._send_state(websocket, RobotStateV1(
                status="executing",
                adapter=self.arm.name,
                affect=self.arm.affect,
                command_id=command_id,
                detail=choreo.name,
                updated_at_ms=int(time.time() * 1000),
            ))

            # Emit demonstration event for voice sync + UI
            total_keyframes = len(choreo.keyframes)
            try:
                await websocket.send(json.dumps({
                    "type": "demonstration",
                    "name": choreo.name,
                    "narration": demo.narration,
                    "personality": event.personality,
                    "duration_s": choreography_duration_s(choreo),
                    "issue": event.issue,
                    "mode": event.mode,
                    "command_id": command_id,
                    "version": "1.0",
                    "choreography": True,
                    "description": choreo.description,
                    "total_keyframes": total_keyframes,
                }))
            except Exception as exc:
                logger.debug("Could not emit choreography event: %s", exc)

            # Keyframe progress callback — emits to the browser on each keyframe
            async def on_keyframe(idx: int, kf) -> None:
                try:
                    await websocket.send(json.dumps({
                        "type": "choreography_progress",
                        "version": "1.0",
                        "command_id": command_id,
                        "keyframe_index": idx,
                        "total_keyframes": total_keyframes,
                        "progress_pct": round((idx + 1) / total_keyframes, 3),
                        "label": kf.label,
                        "timestamp_ms": int(time.time() * 1000),
                    }))
                except Exception as exc:
                    logger.debug("Could not emit choreography progress: %s", exc)

            # Execute the choreography
            started = time.monotonic()
            try:
                await self.arm.run_choreography(choreo, on_keyframe=on_keyframe)
                status = "succeeded"
                error = None
            except Exception as exc:
                logger.exception("Choreography %s failed", choreo.name)
                status = "aborted"
                error = str(exc)

            duration_s = round(time.monotonic() - started, 2)

            # Emit result
            result = CommandResultV1(
                command_id=command_id,
                status=status,
                adapter=self.arm.name,
                affect=self.arm.affect,
                duration_s=duration_s,
                error=error,
                completed_at_ms=int(time.time() * 1000),
            )
            await self._send_json(websocket, result.model_dump())

            if status != "succeeded":
                publish = getattr(self.arm, "publish_fault", None)
                if callable(publish):
                    try:
                        publish(
                            name=f"Choreography failed: {choreo.name}",
                            description=f"{status}: {error or 'unknown'}",
                        )
                    except Exception:
                        pass

            await self._send_state(websocket, RobotStateV1(
                status="idle" if status == "succeeded" else "error",
                adapter=self.arm.name,
                affect=self.arm.affect,
                command_id=command_id,
                detail=error,
                updated_at_ms=int(time.time() * 1000),
            ))

    async def _execute_single_joint(self, websocket, event: FormEvent, demo) -> None:
        """Execute a single-joint primitive (legacy path)."""
        async with self._busy:
            self._last_demo[demo.name] = asyncio.get_running_loop().time()
            duration = trajectory_duration_s(demo)
            intent = to_demonstration_intent(
                event,
                demo,
                command_id=uuid.uuid4().hex,
                duration_s=duration,
            )
            logger.info(
                "Demonstrating %s for %s (%s, rep %d) · %.1fs · %s",
                demo.name,
                event.issue,
                event.personality,
                event.rep_count,
                duration,
                demo.narration,
            )
            await self._send_state(websocket, RobotStateV1(
                status="executing",
                adapter=self.arm.name,
                affect=self.arm.affect,
                command_id=intent.command_id,
                detail=intent.name,
                updated_at_ms=int(time.time() * 1000),
            ))

            try:
                await websocket.send(intent.model_dump_json())
            except Exception as exc:
                logger.debug("Could not emit demonstration intent: %s", exc)

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
                            "command_id": intent.command_id,
                            "version": intent.version,
                        }
                    )
                )
            except Exception as exc:
                logger.debug("Could not emit demonstration event: %s", exc)

            async def on_progress(
                current_deg: float,
                progress_pct: float,
                measured_deg: float | None = None,
            ) -> None:
                await self._send_json(
                    websocket,
                    TrajectoryProgressV1(
                        command_id=intent.command_id,
                        joint=intent.joint,
                        current_deg=current_deg,
                        progress_pct=progress_pct,
                        timestamp_ms=int(time.time() * 1000),
                        measured_deg=measured_deg,
                    ).model_dump(),
                )

            try:
                execute_params = inspect.signature(self.arm.execute).parameters
                if "on_progress" in execute_params:
                    raw_result = await self.arm.execute(intent, on_progress=on_progress)
                else:
                    raw_result = await self.arm.execute(intent)
                result = CommandResultV1.model_validate(raw_result)
                if result.command_id != intent.command_id:
                    raise ValueError(
                        f"adapter returned command_id={result.command_id!r}; "
                        f"expected {intent.command_id!r}"
                    )
            except Exception as exc:
                logger.exception("Adapter %s failed for %s", self.arm.name, intent.name)
                result = CommandResultV1(
                    command_id=intent.command_id,
                    status="aborted",
                    adapter=self.arm.name,
                    affect=self.arm.affect,
                    error=str(exc),
                    completed_at_ms=int(time.time() * 1000),
                )
            await self._send_json(websocket, result.model_dump())
            if result.status != "succeeded":
                publish = getattr(self.arm, "publish_fault", None)
                if callable(publish):
                    try:
                        publish(
                            name=f"Demo failed: {intent.name}",
                            description=(
                                f"{result.status}: {result.error or 'unknown'} "
                                f"(adapter={result.adapter}, affect={result.affect}, "
                                f"command_id={result.command_id})"
                            ),
                        )
                    except Exception as exc:
                        logger.debug("publish_fault skipped: %s", exc)
            await self._send_state(websocket, RobotStateV1(
                status="idle" if result.status == "succeeded" else "error",
                adapter=result.adapter,
                affect=result.affect,
                command_id=result.command_id,
                detail=result.error,
                updated_at_ms=result.completed_at_ms,
            ))

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
