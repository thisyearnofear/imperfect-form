# Naming — decision memo

Written and **decided 2026-11-02.** The product is the **Niggleometer**;
company/story layer is **Sandow**; the exhibit is **The Sandow Machine**.
This memo records the reasoning; the docs have been consolidated around the
decision. Remaining work is the migration itself (see the checklist at the
bottom) — the code surface still says _Imperfect Form_ until the rename pass
lands with the UI redesign.

## Why this is open now

1. **The domain moved.** `imperfectform.fun` is no longer the home; the app
   lives at `imperfectform.vercel.app`. A new domain must be bought
   regardless — the cheapest moment to reconsider a name is when the
   domain is already in play.
2. **The positioning research (2026-11-01, [POSITIONING.md](./POSITIONING.md))
   sharpened the problem.** The crowded lane is literally named Form*:
   FormLens, Formax, FormForge, formcheck ai, LiftSight. "Imperfect Form"
   files itself next to the clones it wants to counter-position; "Imperfect"
   does all the differentiation work, "Form" does all the clone-blending.
3. **The ICP has shifted.** POSITIONING.md says _solo home exerciser (home
   gym, dorm, garage)_. The ICP now in mind is **pain-adjacent**: someone
   whose trapezius / ankle / wrist nags enough to be a problem but not enough
   for a doctor — or someone mid-rehabilitation who needs nudges, milestones,
   and progress tracking to finish the journey well. They search Google and
   ask ChatGPT, and get generic text with no depth of feedback.
4. **The strategy bar is explicit:** strongest possible product, real moat,
   retention track, **painkiller not vitamin**.

## What the ICP shift does to the name question

Someone with a nagging wrist does not think they have a "form problem" —
"form" is gym vocabulary. If the pain-adjacent ICP is primary, the name must
speak to a _nag_, a _journey_, and _progress on it_, not to technique.

It must also pass the honesty filter harder than ever: this is precisely the
user who might mistake an assessment for a medical opinion. The name can
promise **measurement, tracking, adherence, milestones** — never treatment,
healing, diagnosis, or pain relief. Playful scope-signaling is protective:
nothing named whimsically is mistaken for a medical device.

## Naming criteria (from the research + ICP)

- Problem-state name for a searching user (painkiller pull)
- Honest instrument, not a verdict — "discovery, not diagnosis"
- Ownable: coined or uncommon, SEO greenfield, trademarkable
- Survives the radio test; British register a bonus (Sandow spine)
- Encodes or supports the retest ritual (the retention mechanic)
- No Form*/clone-shelf adjacency

## Candidates surveyed

| Direction             | Names                                                               | Verdict                                                            |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Keep + better TLD     | imperfectform.app/.coach                                            | Honesty asset survives; ICP mismatch remains                       |
| Watcher / second eyes | Spotter-family, Eyeline                                             | Right promise, wrong ICP — fitness framing                         |
| The fix               | One Rep Better, OneFix                                              | Rep-engine framing, narrows to form-check                          |
| Heritage              | Sandow, The Sandow Machine                                          | Strong for company/exhibit layer; doesn't self-explain the product |
| Movement intelligence | Baseline, Moveset, Kinema, Range, Arc                               | Right product layer, but ICP-neutral — none speak to the nag       |
| Pain-adjacent         | Mend / On the Mend, Niggle, Waymark, Steady, Supple, Onward, Return | Right ICP; best semantic hit                                       |

## Niggleometer — the decision

Coined from _niggle_ (the British word for exactly this pain) + _-ometer_
(measuring instrument).

**Organic usage already exists.** Couch-to-5K runners keep a literal weekly
"Niggleometer" column in public training diaries — `right knee: 4/10, left
calf: 2/10` — self-scored by hand, week over week. The ICP is already doing
the product manually; no brand owns the word.

**Why it fits:**

- **The name is the instrument.** A thermometer doesn't treat fever; a
  niggleometer reads your niggle. The "-ometer" suffix _is_ the honest
  claim — measurement and trajectory, never cure. It also forces discipline:
  a meter that overclaims is a broken meter.
- **It is the Victorian instrument register.** Brass gauges, seaside
  "Test Your Strength" machines, galvanometer-era science — the Sandow
  cabinet _is_ a Victorian -ometer. Product and heritage spine become the
  same object: satire with a steel core.
- **It answers the ChatGPT gap structurally.** A chatbot can talk about your
  niggle; an -ometer _measures_ it. The name stakes the depth-of-feedback
  claim.
- **It encodes retention.** A meter is a thing you return to — "check the
  niggleometer this week" is the retest ritual.
- **SEO greenfield.** Near-zero competition for the coined word; the
  "niggling X pain" long-tail cluster is winnable content territory.
- **Domains are free** (checked 2026-11-02 via RDAP — all unregistered):
  niggleometer.com / .app / .co.uk / .ai / .io.

**Honest risks:**

| Risk                                                       | Severity   | Mitigation                                                                                          |
| ---------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| Trivialization — "niggle" can read as dismissing real pain | Medium     | The instrument takes the niggle seriously. Tagline writes itself: _"Your niggle, taken seriously."_ |
| Length / radio test — 5 syllables, "nigulometer" typos     | Low–med    | "-ometer" is a known suffix; buy typo domains                                                       |
| US comprehension — "niggle" is rarer in American English   | Medium     | "Niggling injury" does appear in US sports writing; context teaches the word                        |
| Commits to the pain ICP                                    | Structural | Closes the fitness-without-pain front door — aligned with stated intent, but it is a door closing   |
| Sober buyer contexts (physio partners, NHS, corporate)     | Low        | Pre-clinical gap is the design; whimsy signals honest scope                                         |

## Brand architecture if committed

- **Sandow** — company / story layer / heritage (the Cræft narrative survives
  intact; it is about the practice — photo → grade → correct — not the brand)
- **Niggleometer** — the product
- **The Sandow Machine** — the exhibit (a cabinet-scale niggleometer)
- **"Your reading"** — the vocabulary word for an assessment result; the
  shareable artifact keeps its shipped name, **Movement Card**
- **"Check your niggle"** — the retest ritual / challenge phrasing
  ("Take the same test" remains the shipped CTA)

## Draft foyer copy (Niggleometer voice)

Mirrors `FoyerCopy` in `src/lib/brandPositioning.ts`.

```
STUDIO (day-0 doorway)
  brand:       Niggleometer
  line1:       Your niggle, measured.
  line2:       The camera reads how the joint moves today.
               Come back in a week and see what changed.
  provenance:  Britain invented the form-check in 1897. We finished it.
  loopLabel:   READING → RETEST
  invitation:  Name the niggle. Take the first reading.
  trust:       On-device · private · honest reads — Clear / Usable / Early
  hint:        A reading now · your trend over time
  cta:         Take a reading

ARCADE (Train register)
  brand:       THE NIGGLEOMETER
  line1:       STEP UP · BE READ
  line2:       THE CAMERA READS YOUR NIGGLE
  provenance:  BRITAIN INVENTED THE FORM-CHECK · 1897
  loopLabel:   PHOTO IN / READING OUT
  invitation:  One rep in. One reading out.
  trust:       ON-DEVICE · PRIVATE
  hint:        CHECK YOUR NIGGLE WEEKLY
  cta:         TAKE A READING

CRAFFT (Sandow Machine exhibit)
  brand:       THE SANDOW MACHINE
  line2:       A NIGGLEOMETER — 1897 SPEC, REBUILT WITH A ROBOT.
```

Tagline candidates: _"Your niggle, taken seriously."_ ·
_"Measure it. Watch it mend."_ · _"An honest meter for a nagging body."_

## Open questions (validation, post-decision)

1. **ICP decisiveness** — is the pain-adjacent user the _primary_ ICP
   (replacing the solo exerciser) or a layer under it? Niggleometer chooses
   the former; if both front doors must stay open, this name is wrong.
2. **Radio test** — say it aloud to 5 people; can they spell it?
3. **US comprehension** — does "niggle" land for American users, or does the
   product have to teach the word? (Teaching a word is a real cost.)
4. **Trivialization check** — show the name to people in genuine pain; does
   "niggle" feel like recognition or dismissal?
5. **Trademark** — UKIPO + USPTO search on NIGGLEOMETER in classes 9, 41, 44.
6. ~~POSITIONING.md rewrite~~ — done 2026-11-02; the ICP section, one-liner,
   and three-beat pitch now speak to the pain-adjacent user.

## Migration surfaces — the remaining checklist

- `src/lib/brandPositioning.ts` — `BRAND.name`, all `FoyerCopy` sets
- `package.json` name/description; `imf_*` localStorage keys (decide whether
  to migrate or accept the legacy prefix)
- `public/.well-known/farcaster.json` — ~~new domain → accountAssociation
  re-sign~~ **deprioritized: the Farcaster mini-app is paused** (2026-11-02);
  Self Protocol app identity likewise pending
- README + docs sweep (imperfect-form loop → the form-check loop phrasing)
- og-image.svg, sitemap, robots, `next.config.mjs` hostname, env templates
- Cræft submission draft: product-name references only; the Sandow story is
  untouched
