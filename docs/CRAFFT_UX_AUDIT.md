# Cræft Prize — Product Design & UX Audit

> How "Imperfect Form / The Sandow Machine" reads to a Cræft Prize judge from a
> product-design and UI/UX lens, and the prioritized moves to exceed expectations.
> Paired with the written submission draft in `CRAFFT_SUBMISSION_DRAFT.md`.

The prize reveres the **William Morris / Kelmscott Press** union of beauty and
utility, and the **Wedgwood** principle of technology extending craft at scale.
It is pro-technology, anti-slop, and judges on six criteria: **Ingenuity,
Cræft depth, Beauty, Usefulness & scalability, Integrity, Future heritage.**
It wants "serious, developed inventions," not early sketches. Our strongest
asset is that the app **already works** at imperfectform.fun — the design job is
to make the heritage + the working instrument **feel** like one crafted object.

## 1. Where you stand (per criterion, UX lens)

| Criterion | Read today | Lever |
|---|---|---|
| **Ingenuity** | Strong concept (closing a 130-yr loop with a robot) but it's argued in prose, not shown. | The **Loop plate** (now on `/lore`): the same loop, two columns, 1897 vs 2026. The visual *is* the argument. |
| **Cræft depth** | Real lineage (Sandow, arcade cabinet, open-hardware arm) but the exhibit leaned on pixel-arcade type — reads "techy game," not "craft." | Heritage **display serif** on the exhibit only; Manrope body; Press Start 2P kept as punctuation. Material/place/process alignment now visible in type. |
| **Beauty** | Disciplined tokens (teal/black studio + brass spine) — good, but the *exhibit* surface needs to feel like an artefact, not a marketing page. | Exhibit refined toward an **engraved instrument plate** register. |
| **Usefulness & scale** | Live app, multi-exercise engine, on-device pose — genuinely proven. | Surface this *on* `/lore` (the live "Try the machine" CTA already does). Keep the working-instrument proof one click away. |
| **Integrity** | On-device (no slop), open hardware, honest upper-body scope — excellent and on-message. | Already threaded through recap grade stamps, foyer trust line, and the exhibit's "artisanal intelligence" copy. Don't add claims; tighten. |

## 2. What I shipped this pass

1. **Heritage display serif (Fraunces), scoped to `/lore` only.** The exhibit
   now reads like a crafted Victorian document for headings, with Manrope for
   readable body and Press Start 2P reserved for the "INSERT COIN" punctuation.
   This is the single biggest "beauty / cræft depth" signal and it never
   touches the day-0 studio web door (`src/app/lore/layout.tsx`).
2. **The Loop plate** (`src/components/crafft/LoopPlate.tsx`) — a dual-column
   engraved instrument plate, 1897 vs 2026, four loop steps each. Now shown in
   **both** the default minimal view and the immersive provenance scroll, so a
   judge's first impression carries the whole ingenuity argument — shown, not
   argued.
3. **Exhibit type hierarchy refined** (`crafft-exhibit.css`) — display serif on
   headline, section titles, era titles, coda; the loop plate gets an
   engraved brass-rule treatment; mobile stacks gracefully.

Build + typecheck pass; `/lore` prerenders static.

## 3. Prioritized recommendations to exceed expectations

### P0 — do before submission
- **Film the 2–3 min video** to the script in `CRAFFT_SUBMISSION_DRAFT.md`.
  The video is the asset that makes "satire with a steel core" land: Sandow
  photo → Royal Mail loop → cut to the working machine → arm demonstrates. No
  other asset substitutes.
- ✅ **Produce a `/lore` OG / share image** carrying the Sandow lineage — DONE
  (see P1; moved up and implemented as a dynamic next/og route).
- **Cabinet fabrication evidence.** The prize requires UK manufacture and
  rewards *build-as-craft*. Even pre-finalist, a short build diary / workbench
  photo set on `/lore` (or linked from it) converts "is this craft?" doubt into
  "this is a workshop, not a software demo."

### P1 — raises the bar on "beauty that endures"
- ✅ **Refine the SandowCabinet gauge** into a real measurement instrument — DONE.
  Graduated brass tick scale under the readout, the value set in the heritage
  serif so a graded readout reads like an engraved certificate (not a pixel
  scoreboard), an `is-graded` fill sweep, and a "Graded vs. Sandow · 1897"
  caption. Idle cabinet now reads as an *empty instrument awaiting a subject*.
- ✅ **A `/lore` OG / share image carrying the Sandow lineage** — DONE (moved
  up from P0). `src/app/lore/opengraph-image.tsx` (next/og, edge) renders the
  1897-vs-2026 loop plate at 1200×630; auto-wired into both `og:image` and
  `twitter:image`. Verified: valid PNG, metadata present in `<head>`. A shared
  `/lore` link now spreads the lineage at first glance.
- ✅ **Mobile + heading-order pass on the exhibit** — DONE. `clamp()` sizes
  checked at 375px; loop plate stacks to one column ≤600px; reduced-motion
  honored on the gauge fill/sweep; one `h1` per view with `h2`→`h3`→`h4`
  hierarchy; minimal loop section given an `aria-label` for an accessible name.
- ✅ **SSR the provenance page** — DONE. Restructured so the wallet/boot
  provider stack (`ClientOnlyProviders`) lives in a `(shell)` route group for
  the interactive app routes, while `/lore`, `/collaborate`, and `/build`
  render straight from the root layout — so their content is server-rendered.
  Verified: crawlers/"view source" now see the real provenance, not the boot
  splash. The home page (`/`) boot flow is unchanged (still gates behind the
  splash, then hydrates) — confirmed via SSR check. Build + 219/219 tests pass.

### P2 — ecosystem / future-heritage depth
- ✅ **A "build diary" surface** — DONE. New `/build` route (server-rendered,
  heritage-exhibit register) makes the *making* legible: four levels of craft
  (calibration vs. Sandow's tables, open-hardware assembly, British cabinet
  fabrication, real-movement pose tuning) + an honest status section (live
  pose → sim/manual stage → upper-body hardware → SmolVLA after proof). Linked
  from `/lore` ("The Build"); added to `sitemap.ts`. This is the antidote to
  "is this craft?" — a workshop, not a software demo.
- **Map the lineage into the in-session recap** more deliberately — the
  "Graded vs. Sandow · 1897" stamp is already there; consider a one-line
  provenance tooltip so the heritage is felt during use, not only on `/lore`.

## 4. Risks to manage (honest)
- **"Is this craft?"** — mitigate with build evidence (P0), not more copy.
- **Upper-body only** — keep honest; the Sandow parallel (spring-grip
  corrected only grip) is the elegant defence. Don't soften the scope language.
- **The "AI" word** — keep "artisanal intelligence": on-device, the arm
  *teaches*, learns from real sessions. Never describe it as generative slop.
- **Font fetch at build** — Fraunces loads via `next/font/google` at build
  time (same pipeline as the existing Manrope/Press Start). Confirmed working
  in this environment; on CI, ensure font fetch isn't blocked.
| **Future heritage** | "Britain's next material culture of movement" — compelling. | The **Loop plate** + lineage timeline make "future heritage" legible: a *method* (photo→grade→correct) carried forward, not just a *material*. |