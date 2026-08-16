# The Cræft Prize — Submission Strategy

> **The pitch in one line:** Britain invented the AI form-check in 1897. It
> just used the Royal Mail instead of a camera. We finished the job — with a
> robot.

## The prize

The British Cræft Prize (Nation of Artisans, 2026) is a £60,000 award for
"future heritage" — inventions that fuse heritage craft with cutting-edge
technology. Six finalists get ~£5,000 to build an exhibit; one winner gets
£30,000. Judged on: Ingenuity, Cræft depth, Beauty, Usefulness & scalability,
Integrity, Future heritage.

Full brief: <https://nationofartisans.substack.com> (Open Call, Mar 2026).
Window closes 31 August 2026.

## Why we fit

The prize wants "radical, practical creations that prove heritage and
innovation can be dynamic partners" and is explicitly "pro-technology, but
against slop." Most entrants will fuse an old _material_ with a new _tool_
(3D-printed cob, CNC timber joinery). We fuse an old _method_ with a new
_medium_ — and the method is a British invention.

### The lineage (this is real, not a metaphor)

See [NORTH_STAR.md → "Heritage: the Sandow lineage"](./NORTH_STAR.md#heritage-the-sandow-lineage) for the full documented history. The short version: **Eugen Sandow** ran a postal form-grading loop in 1890s Britain — photos in, graded against ideal tables, corrective exercises + spring-grip dumbbell out. That is the imperfect-form loop, 130 years early. The SO-101 arm closes the same loop with a robot.

| Sandow (1897)           | Imperfect Form (2026)                   |
| ----------------------- | --------------------------------------- |
| Photo in (by post)      | Camera in (in-browser, on-device)       |
| Graded against an ideal | Pose estimation vs. joint-angle targets |
| Correction out (paper)  | AI coach voice + on-screen HUD          |
| Spring-grip dumbbell    | SO-101 robot arm demonstrates the fix   |
| Royal Mail (transport)  | WebSocket / browser (transport)         |

### The aesthetic lineage (also real)

The British seaside arcade tradition — "Test Your Strength" high-strikers,
penny-in-the-slot machines, end-of-pier amusements — is a genuine British
craft lineage for the cabinet. We already have an arcade register in the
codebase (`ARCADE_FOYER`, Press Start 2P, gold-on-black). The Cræft
submission leans into that: the machine looks like a Victorian seaside
strength-tester, but inside is a real SO-101 arm running real pose
estimation against Sandow's actual 1897 tables.

This is the "mad but completely real" register the organiser wants. It's
satire with a steel core — the surface is playful British arcade, the
substance is a working form-coaching instrument.

## The submission

**Product name:** "The Sandow Machine" (working title)

**What it is:** A Victorian-seaside-arcade cabinet housing an SO-101 robot
arm. You step up, the camera reads your form, the arm grades you against
Sandow's 1897 proportional tables, and physically demonstrates the
correction. Same loop Sandow ran by post — closed with a robot.

**The craft heritage:**

- Sandow's Institute of Physical Culture (London, 1897) — Britain invented
  photo-based form-grading.
- The spring-grip dumbbell (Royal Warrant, King Edward VII) — the first
  mechanical form-corrector.
- The seaside "Test Your Strength" high-striker — the British arcade
  cabinet lineage.

**The technology:**

- On-device pose estimation (MoveNet / TensorFlow.js) — no video leaves the
  device. The privacy story is itself a craft value: _your body is not slop_.
- SO-101 open-hardware arm as the physical correction (upper-body only —
  honest scope, matching Sandow's spring-grip which also corrected only
  grip).
- "Artisanal intelligence": the arm learns from real coaching sessions, not
  from a generative model producing infinite variations. This is the exact
  "AI as craft extension, not slop" framing the prize wants.

**The method (where we win on "Cræft depth"):**
The _process_ is the craft, not just the object. Document:

- Calibrating the arm's joint angles against Sandow's 1897 tables.
- Fabricating the cabinet in a British workshop (TBD — finalist grant).
- The pose model tuned on real human movement, not synthetic data.
- The SO-101 as open hardware — assembled, not mass-produced.

## Judging criteria — how we score

| Criterion          | Our answer                                                                |
| ------------------ | ------------------------------------------------------------------------- |
| Ingenuity          | Closing a 130-year-old loop (photo→grade→correct) with a robot arm.       |
| Cræft depth        | Sandow lineage + arcade cabinet fabrication + open-hardware arm assembly. |
| Beauty             | Victorian seaside cabinet aesthetic; teal-gold-night studio UI.           |
| Usefulness & scale | The app already works at imperfectform.fun; the cabinet is the exhibit.   |
| Integrity          | On-device pose (no slop); open hardware; honest upper-body scope.         |
| Future heritage    | Britain's next material culture of movement — AI form-coaching as craft.  |

## Risks (honest)

1. **"Is this craft?"** — The prize is materially rooted (Sheffield, Stoke,
   Northampton). Our defence: the _craft_ is the form-grading lineage
   (Sandow's physical culture had apprentices, schools, a Royal Warrant),
   and the _making_ is the arm + cabinet + pose model. The submission must
   document the **build** as a craft process, not a software demo.
2. **"Manufactured in the UK"** — Hard requirement. The SO-101 station must
   be in Britain for the finalist exhibit. The £5,000 grant is for this.
   Flag in the submission: cabinet fabricated in a UK workshop, arm is an
   open-hardware kit assembled in the UK.
3. **Upper-body only** — NORTH_STAR is honest: "Honest SO-101 scope:
   upper-body corrections only." Don't oversell. Sandow's spring-grip also
   corrected only grip. Honest scope + historical parallel > overclaiming.
4. **The "AI" word** — The prize is wary of soulless tech. Lean into
   "artisanal intelligence": on-device (no cloud slop), the arm _teaches_
   (not replaces), learns from real sessions. Not a generative model.

## Submission assets required

- [ ] Tweet-length pitch (a few options, different tones)
- [ ] 1500-word document (Sandow lineage → machine → craft depth → future heritage)
- [ ] 2–3 minute video (Sandow photo → Royal Mail loop → cut to our machine →
      arm demonstrates correction → arcade cabinet aesthetic)
- [ ] Multimedia (the live app, coach-station footage, cabinet renders)
- [ ] Physical exhibit in Britain (finalist phase)

## UI/UX implications

The arcade register already exists in the codebase but is currently an
_earned_ surface (post-first-session). For the Cræft submission, the Sandow
cabinet aesthetic becomes the **exhibit identity** — not the day-0 web door
(which stays studio/trust-first), but the physical cabinet's UI and the
submission's visual language.

The public provenance page is **`/lore`** (not `/crafft` — the route is named
for the user's need: provenance, trust, domain authority; the prize is
internal strategy, not a user-facing route name). The Sandow spine threads
through every app surface (boot splash, foyer lineage stamp, HUD brass gauge,
recap "Graded" + Royal Warrant stamp, earned-shell level nameplate) so the
lineage is cohesive, not siloed. See `src/styles/sandow-spine.css`.

See `docs/NORTH_STAR.md` → "Heritage: the Sandow lineage" for the theme spec,
and `src/lib/brandPositioning.ts` → `CRAFFT_FOYER` for the cabinet copy.

## Timeline

- **Now → Aug 2026:** Build the cabinet, film the demo, write the submission.
- **31 Aug 2026:** Application window closes.
- **Sep 2026:** Six finalists announced (~£5,000 each).
- **Finalist phase:** Build the UK exhibit.
- **Final judging:** One winner gets £30,000.
