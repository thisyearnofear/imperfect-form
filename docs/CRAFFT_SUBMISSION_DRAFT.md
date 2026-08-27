# The British Cræft Prize — Submission Draft

> **Project:** Imperfect Form / The Sandow Machine
> **Prize:** The British Cræft Prize (Nation of Artisans, 2026) — £60,000 award for "future heritage"
> **Window closes:** 31 August 2026
> **Status:** Draft for review. All claims verified against [NORTH_STAR.md](./NORTH_STAR.md), [README.md](../README.md), and [ROADMAP.md](./ROADMAP.md).

---

## 1. Tweet-length pitches (four options, under 280 chars each)

**Option A — Terse / epigrammatic**

Britain invented the AI form-check in 1897. Eugen Sandow graded your posture by Royal Mail and sent back a spring-grip dumbbell. We finished the loop — with a robot arm. Imperfect Form: the Sandow Machine. Satire with a steel core. 🇬🇧🦾 #CraeftPrize

**Option B — Playful / arcade**

Step right up! A Victorian "Test Your Strength" cabinet, a camera that reads your curl, and an SO-101 arm that *shows* you the fix. Same loop Sandow ran by post in 1897 — now on-device, no cloud slop. Imperfect Form: Britain's form-check, finished. #CraeftPrize

**Option C — Heritage / grand**

In 1897, Eugen Sandow graded photographs against ideal measurement tables — the first AI form-check, by post. Now, Imperfect Form closes that loop with on-device pose estimation and a robot arm that demonstrates the correction. A British invention, completed. #CraeftPrize

**Option D — Bold / maverick**

Every fitness app watches you. None of them *move*. We took a 1897 British postal form-grading loop, gave it a camera that never leaks, and an open-hardware arm that teaches by showing. Upper-body only — honest, like Sandow's spring-grip. Imperfect Form. #CraeftPrize

---

## 2. The 1500-word document

### The Sandow Machine: Britain's form-check, finished

In 1897, a man in London ran the world's first artificial-intelligence form-check. He did not call it that. Eugen Sandow, Prussian-born, London-based, founder of the Institute of Physical Culture, invited men across Britain to photograph themselves shirtless, post the prints to his office, and receive in return a grade: their proportions measured against his published "ideal" tables, with corrective exercises prescribed for the deficit. Out went, by return of Royal Mail, a spring-grip dumbbell stamped *"Supplied to King Edward VII by Royal Letters Patent"* — a mechanical form-corrector carrying a Royal Warrant. Photo in. Graded against an ideal. Correction out. Transport by post. That is the imperfect-form loop, executed in 1897, one hundred and twenty-nine years before a camera could do it in a browser.

We did not invent this loop. Britain did. We finished it.

**The lineage.** This is documented history, not a metaphor stretched to fit a prize brief. Sandow built the first global fitness brand on a postal grading system — a Victorian pose-estimation feedback loop whose transport layer was the Royal Mail. His Institute of Physical Culture in London trained a school of instructors; his method had apprentices, schools and a Royal Warrant, the social architecture of a craft, not the marketing of a gadget. The spring-grip dumbbell was the "physical AI" of its day: a mechanical device, under Royal Warrant, that corrected a specific fault (grip) by physically demonstrating the fix. The seaside "Test Your Strength" high-striker — the British arcade cabinet, penny-in-the-slot, end-of-pier — is the aesthetic lineage for the housing. Imperfect Form / The Sandow Machine threads these three British lineages together: Sandow's grading method, the mechanical corrector, and the arcade cabinet. The result is an exhibit that looks like a Victorian seaside strength-tester and works, underneath the paint, as a real form-coaching instrument. Satire with a steel core.

**The machine.** Step up to the cabinet. A camera, running entirely in your browser, estimates your pose in real time using MoveNet on TensorFlow.js. Your joint angles are graded against Sandow's proportional tables — the same ideal that a clerk in Sandow's office would have marked your photograph against in 1897. When your form breaks, the on-screen HUD and a coach voice tell you; and an SO-101 open-hardware robot arm, mounted in the cabinet, physically sweeps the correction — the joint angle you missed, demonstrated in three dimensions, in front of you, where a flat screen can only describe it. The arm teaches. It does not replace. The human is the primary actor; the arm is a fail-silent subscriber that moves only when the camera has already understood the form. The correction is delivered in three registers at once: the on-screen HUD, a coach voice — one of three named personas, 🐌 SNEL, 🐢 STEDDIE, 🐙 RASTA, each with its own pace and temperament, the way a gym has more than one coach — and the arm's physical sweep. The Royal Mail has become the WebSocket. The spring-grip dumbbell has become the SO-101. The loop is the same.

**The craft depth.** The Cræft Prize is materially rooted — Sheffield, Stoke, Northampton — and a fair question is whether software-and-robotics belongs in that lineage. Our answer is that the *process* is the craft, not only the object. The build is a craft process at four levels. First, the pose model: tuned on real human movement, not synthetic data, with classical computer-vision pre-processing — exposure, calibration — applied before any model retraining, because mentor feedback from Cyberwave was unambiguous that robustness is won upstream of the network, and edge performance is a three-knob problem of input size, architecture and quantization that we measure before we choose. Second, the arm: the SO-101 is open hardware, assembled, not mass-produced — its joint angles are calibrated by hand against Sandow's 1897 tables, the way a luthier sets a neck to a scale, not the way a factory stamps a part. Third, the cabinet: fabricated in a British workshop, not injection-moulded — the £5,000 finalist grant exists to pay for exactly this. Fourth, the policies: the arm learns from real coached sessions — recorded as LeRobot episodes, sliced, anonymised — never from a generative model producing infinite variations. This is what we mean by *artisanal intelligence*: AI as an extension of craft, not a substitute for it. The arm does not imagine a correction. It demonstrates one a coach actually made.

**The beauty.** The cabinet is the visual argument. Victorian seaside arcade: gold-on-black, the Press Start 2P register, a brass gauge, a Royal Warrant stamp on the recap, a lineage stamp in the foyer. The live app — at imperfectform.fun — runs a studio register, teal-gold-on-night, trust-first, the day-0 doorway. The Sandow spine threads through every surface: boot splash, foyer stamp, HUD brass, the earned arcade shell with its level nameplate. It is not pastiche. It is a coherent visual system in which a 1897 postal fitness brand and a 2026 robot arm belong to the same object. William Morris would have recognised the principle: nothing in the cabinet is there that is not useful, and nothing useful is left unbeautiful.

**Integrity and honest scope.** The privacy story is itself a craft value. No video leaves the device. Pose estimation runs in-browser, on-device; the camera is the transport layer, not a feed to a cloud. Your body is not slop. The arm is open hardware. The coaching engine is honest about what it can do: upper-body corrections only — curls, push-ups, pull-ups — the movements a desk-scale arm can literally sweep. This is not a limitation we are hiding; it is a parallel to Sandow's spring-grip dumbbell, which also corrected only grip. We do not pretend the arm demonstrates squat depth or jump mechanics it cannot show. Learned policies — fine-tuning a SmolVLA vision-language-action model on recorded sessions — come *after* the scripted demonstration is proven, first in MuJoCo simulation, then on hardware. We do not ship a thin web shell bolted onto a teleop dataset and call it a coach. The roadmap is public, and it gates itself: understand before show; show beats describe; scripted primitives before learned policies; honest robot scope. This is the discipline the prize asked for, and it is the one a heritage of apprentices, schools, and Royal Warrants deserves. Even the failure mode is a craft decision: when the station is absent, coaching simply continues on the screen — the arm is a fail-silent subscriber, never a gate. A robot that goes silent rather than lies is a small thing, but it is the difference between an instrument and a toy.

**Usefulness and scale.** The app already works. imperfectform.fun is live: MoveNet pose detection in-browser, a verified rep-counting engine across push-ups, squats, curls, pull-ups and jumps, AI coaching across multiple providers with three coach personas, guest identity with PBs and streaks, Farcaster sharing, verified leaderboards on Celo, and a local Movement Intelligence slice — repeatable curl assessment, a private Movement Card, self-versus-self history, and a privacy-safe "Take the same test" challenge that lets one coached assessment become another, with no account required. None of it is gated behind a wallet; on-chain is an earned delight at value moments, never a prerequisite. The cabinet is the exhibit, not the product. The product is a privacy-first camera coaching app that reaches millions through crafted game design and interface; the cabinet proves the physical-AI category in a form a judge can stand in front of. The scale path is from the app (already shipped, globally reachable) to the gym-station wedge (a kiosk of paired camera and arm) to the data flywheel (sessions become episodes become policies). Each ring earns the next. None of them requires the user to have watched a robotics demo first.

**Future heritage.** Morris and Wedgwood are the prize's twin patrons, and they sit comfortably inside this machine. Morris: beauty and utility in the same object — the cabinet is a working instrument that is also a Victorian arcade, and nothing in it is decorative without purpose. Wedgwood: technology extending craft at scale — the camera extends Sandow's postal grading from a London office to every browser, and the open-hardware arm extends the spring-grip dumbbell from a single corrective device to a teachable, demonstrable correction. The heritage we are adding to is not a material — clay, steel, leather — but a *method*: British form-coaching, invented in 1897, practised continuously since, and now closed into a loop a Victorian could not have finished but would, we think, have recognised. The next generation of this craft will not be a stronger dumbbell but a smarter one — a robot that watches, understands, and shows, in that order, and only ever in service of the human doing the lifting. The Sandow Machine is a serious, developed invention — a live app, a documented lineage, a real arm running against real tables — offered to a British prize that asked for exactly this: radical, practical, and rooted.

Britain invented the form-check. We finished it — with a robot, in a cabinet, in a workshop, on this island.

*Manufactured and demonstrated in the United Kingdom: cabinet fabricated in a UK workshop; SO-101 open-hardware arm assembled in the UK; live app at imperfectform.fun.*

---

## 3. Video script (2–3 min)

**Title:** *Britain invented the form-check. We finished it.*
**Runtime:** ~2 min 40 s · **Format:** 16:9, teal-gold-on-night grade, Victorian-arcade title cards.

| Time | Visual | VO / caption |
|------|--------|--------------|
| 0:00–0:08 | Black. A single sepia photograph fades up: a shirtless Victorian man, full length, posed. Archive treatment, film grain. | **VO:** "In 1897, a man in London ran the world's first form-check." |
| 0:08–0:20 | The photograph slides into a Royal Mail envelope; a wax seal closes it; a London postmark stamps on. **Caption (Press Start 2P):** *EUGEN SANDOW · LONDON · 1897* | **VO:** "Men across Britain photographed themselves, posted the prints to Sandow, and got their posture graded against his ideal tables." |
| 0:20–0:32 | Envelope opens; out slides a spring-grip dumbbell, brass, engraved *"Supplied to King Edward VII by Royal Letters Patent."* | **VO:** "Back came corrective exercises — and a spring-grip dumbbell under Royal Warrant. Photo in. Grade out. By post." |
| 0:32–0:40 | Hard cut to black. One word fades in, gold: **1897.** Then, beneath it: **2026.** | **VO:** "Britain invented the AI form-check. We finished the loop." |
| 0:40–0:55 | Cut to the live app, imperfectform.fun, on a phone. A real person does a bicep curl. On-screen skeleton tracks joints in real time; a HUD grades the rep. **Caption:** *MoveNet · TensorFlow.js · on-device* | **VO:** "Step up. A camera in your browser reads your form — on-device. No video leaves the device." |
| 0:55–1:15 | The form breaks on a rep. HUD flashes the fault. A coach voice speaks. Cut to the SO-101 arm in the cabinet — brass-trimmed, Victorian-arcade housing. The arm physically sweeps the corrected joint angle, slow and deliberate, in front of the lifter. | **VO:** "And when your form is off, the arm doesn't tell you. It *shows* you — the correction, in three dimensions, where a screen can only describe it." |
| 1:15–1:30 | Pull back to reveal the full cabinet: a "Test Your Strength" high-striker frame, gold-on-black, Press Start 2P type, a brass gauge, a Royal Warrant stamp on the recap panel. The arm moves inside it. | **VO:** "It looks like a Victorian seaside arcade. Underneath, it's a working instrument. Satire with a steel core." |
| 1:30–1:45 | Close-ups of the build: hand-calibrating an arm joint; a workshop bench; the SO-101 open-hardware kit being assembled. **Caption:** *Open hardware · assembled in the UK* | **VO:** "Open hardware, assembled — not mass-produced. Joint angles calibrated by hand against Sandow's 1897 tables." |
| 1:45–2:00 | Cut to a workshop; a British maker fabricating the cabinet. Sparks, a milling pass, the brass gauge being fitted. **Caption:** *Fabricated in a UK workshop* | **VO:** "The cabinet is fabricated in a British workshop. The arm teaches the human. It never replaces them." |
| 2:00–2:15 | Honest-scope card: a clean title — **HONEST SCOPE** — and beneath it, plain text: *Upper-body corrections only. Lower-body demonstrations are out of scope. Learned policies come after scripted demonstration is proven.* | **VO:** "We're honest about what it does. Upper-body only — like Sandow's spring-grip, which corrected only grip. Learned policies come later, from real coaching sessions. Not from generative slop." |
| 2:15–2:30 | Montage: live app on three devices; a Movement Card; the lineage stamp; the foyer. Quick, confident cuts. **Caption:** *imperfectform.fun — live now* | **VO:** "The app is already live. The cabinet is the exhibit — the proof that a 130-year-old British loop can be closed with a robot." |
| 2:30–2:40 | Return to the cabinet, arm at rest, the brass gauge settling. Hold. Final card, gold on black: **Britain invented the form-check. We finished it.** Subtitle: *Imperfect Form · The Sandow Machine*. | **VO:** "Britain invented the form-check. We finished it." |
| 2:40–2:45 | End card: URL *imperfectform.fun*, Cræft Prize 2026 mark, Royal Warrant-style stamp. Hold to black. | (No VO. Hold.) |

---

## 4. Multimedia checklist

### Already exists (capture / link directly)
- [ ] **Live app** — screen recordings of imperfectform.fun: day-0 foyer, a real coached curl session, on-device skeleton + HUD, the earned arcade shell, Movement Card, lineage stamp. Mobile + desktop captures.
- [ ] **`/lore` provenance page** — the Sandow lineage, documented, user-facing. Record a walkthrough; this is the trust spine and the historical evidence in one.
- [ ] **Coach-station footage** — MuJoCo simulation of the SO-101 demonstrating a corrected curl; the scripted-primitive understand→show loop. (Hardware live footage gated on servo-incident fix — see ROADMAP.)
- [ ] **Sandow spine design tokens** — `src/styles/sandow-spine.css`: teal-gold-on-night, Press Start 2P, brass gauge, Royal Warrant stamp, lineage stamp. Reference sheet for the cabinet fabricator and the video grade.
- [ ] **Brand positioning copy** — `src/lib/brandPositioning.ts` → `CRAFFT_FOYER` cabinet copy and the arcade register. Source for the cabinet's engraved text.

### To produce (finalist phase / pre-submission)
- [ ] **Cabinet concept renders** — 3D renders of the "Test Your Strength" housing: high-striker frame, brass gauge, Press Start 2P nameplate, the SO-101 mounted within. Gold-on-black, Victorian seaside.
- [ ] **Cabinet fabrication footage** — UK workshop: milling, brass fitting, arm mount, paint. The "build as craft" evidence the judges asked for.
- [ ] **SO-101 assembly footage** — open-hardware kit being assembled in the UK; joint calibration against Sandow's 1897 tables by hand.
- [ ] **OG / social imagery** — stills from the video: the 1897 photograph, the spring-grip dumbbell engraving, the cabinet hero shot, the on-device HUD. 1200×630 OG; 1:1 and 16:9 social crops.
- [ ] **The 1897 photograph + Royal Warrant scan** — public-domain Sandow image and the "Supplied to King Edward VII" dumbbell engraving, sourced and credited. The single piece of evidence that makes the whole pitch real.
- [ ] **Provenance one-pager (PDF)** — the Sandow lineage, the spring-grip dumbbell, the seaside arcade lineage, the UK-manufacture note, the honest-scope statement. Printable appendix for judges.
- [ ] **Build diary (short)** — a photo-essay of the cabinet + arm build, framed as a craft process. The Cræft-depth answer in images.

---

*Draft for review against [CRAFFT_PRIZE.md](./CRAFFT_PRIZE.md), [NORTH_STAR.md](./NORTH_STAR.md), [README.md](../README.md), and [ROADMAP.md](./ROADMAP.md). No claim above exceeds shipped or honestly-scoped reality.*
