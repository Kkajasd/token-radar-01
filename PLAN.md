# Token Radar 01 — Entry plan (radar-2)

Bounty: make.fun `token-radar-01` — "Build the best token launch radar".
Prize: $1,325 total ($1,000 / $50×4 / $25×5), top 10. Ends Mon 2026-12-14 10:00 UTC.
Judging: AI judge (superbot, reasoning high) compares dossiers pairwise; win rate decides.
Dev phase: each valid entry is judged vs 4 fixed house dashboards + 8 adaptive games.
Final: screened at place 40 (dev interval), 3 Swiss rounds, playoff of top 12.
Limits: 5 submissions/day, 10 total, Force_Last (last submission counts). Free entry.

## What is built (this directory, 2026-11-15)

Working starter entry, radar-2 — NOT submitted (no repo, no keypair, no registration).

| File | What it is |
|---|---|
| `main.ts` | Entry program (Node 22 stdlib only). Reads snapshot, writes `board.json`, `data.js`, copies `dashboard/` + `screenshots/`, writes `dossier.json` via vendored `buildDossier`. |
| `lib/model.ts` | The radar-2 model: calibration, ranking, exclusion rule, farm plans. |
| `vendor/makefun-board.ts` | Kit's dossier library, byte-identical copy (vendored, not authored). |
| `dashboard/index.html` + `app.css` + `app.js` | Static dashboard, no network. 42.4 KB source total — fits whole inside the dossier's 65,536-byte text cap, so the judge reads all of it. |
| `screenshots/` | 3 shots (board / detail / filtered) — see status below. |
| `screenshots.mjs` | Playwright screenshot helper (1440×900, JPEG fallback if PNG > 400 KB). |
| `ANALYSIS.md` | Dataset counts, calibration, methodology. |
| `TESTS.md` | Validation results. |

## Ranking methodology (radar-2) — summary

`implied = round( $20M × (TVL/$100M)^0.85 × growth(0.70–1.60) × maturity(0.55–1.00) × category × breadth(≤1.12) )`

- Board: **198 rows** — all 40 watchlist slugs + all 158 other rankable pre-token
  protocols (incl. 20 above the $50M floor the watchlist leaves out). No arbitrary cap.
- **Excluded, with reasons, in their own view:** 144 pre-token protocols that are
  wrapped/staked/bridged products, versioned pools, CEX or exchange products.
  The starter ranked 39 of these; radar-2 sets them aside and says why.
- **Category multiplier calibrated per run** from the snapshot's own live-token rows
  (median mcap/TVL per category, shrunk halfway toward the overall median 0.189,
  clamped [0.7, 1.4]). No protocol name is hardcoded anywhere.
- **Concave TVL:** live mcap/TVL falls with size (log-log slope ~0.59); linear TVL
  overvalues giants. Rank 1 Steakhouse Financial $286M (ratio 0.10, inside the live IQR).
- **Farm plans:** 6 steps, category-specific action + weekly action + risk note,
  capital $50–$250 by TVL, hold 30–60 days by age, Ethereum vs cheap-chain gas.
- **Dashboard:** dark radar theme; search + category + chain filters + 5 sorts;
  Pre-token / Live token / Set-aside tabs; detail dialog per protocol with the full
  model breakdown, a page-side recomputation check ("same number board.json carries"),
  farm plan with cost/time, and a "records no token" disclaimer. Hash routing
  (`#p=<slug>`, `#category=…`) so each screenshot state is a link.

## Judging optimisation (why this should beat the starter = house anchor 2-plain)

Judge criteria in order: (1) working radar/coverage/code-screenshot agreement;
(2) value model from TVL + growth + age, not hardcoded names, live tokens separated;
(3) concrete farm plans with cost/time; (4) sortable/filterable, readable, detail view;
(5) looks made. Radar-2 attacks 1–3 directly:

1. Coverage: 198 rows vs starter 200 — but ours are the *whole rankable universe*,
   and the 39 junk rows are gone and named. The judge can see the exclusion logic
   in `exclusionReason` and the Set-aside tab.
2. Model: stated formula on the page + calibration table + per-row breakdown +
   recomputation check. The starter's flat 0.25×TVL is a TVL table with a haircut;
   ours is a model with evidence (live-token medians quoted on the page).
3. Farm plans: category/chain-specific instead of one generic template.
4. Page: more filters (chain, sort), three tabs, badges (WATCHLIST/EARLY), model
   panel with four explained cells, dark chosen palette.
5. Dossier size: dashboard source 42.4 KB (judge reads it whole); screenshots
   targeted at 300–350 KB each so the dossier stays well under 1.5 MiB
   (smaller dossier wins exact ties).

## Biggest risks

1. **Screenshots are done.** (Was the blocker; resolved 2026-11-15 — see TESTS.md §5.
   Stock Chrome for Testing lives at `~/chrome-test/chrome-linux64/chrome`; re-take
   with `CHROME_PATH=$HOME/chrome-test/chrome-linux64/chrome node screenshots.mjs`,
   then re-run `main.ts`. Minor: in the detail shot, farm steps 5–6 sit below the
   fold of the dialog — acceptable, but a tighter dialog could show all six.)
2. **Sentora Curator (#2, $2.76B TVL) is not on the watchlist.** Included as EARLY
   because the snapshot carries no `parentProtocol` and it passes every recomputable
   exclusion rule. If the house's hidden reason is that it is a product of another
   protocol, a judge could mark it down — but the README explicitly says a protocol
   the list leaves out is no worse a subject, and the dashboard labels it EARLY,
   never watchlist. Keep, but watch for any house clarification.
3. **Model plausibility is judged, not measured.** No ground truth exists for
   unlaunched tokens. The concave exponent (0.85) and K ($20M) are judgement calls
   anchored to live medians; a judge that expects linear TVL could prefer the
   starter's numbers. Mitigation: the model panel shows the calibration openly.
4. **Transcript gate (submission-time).** The parent must submit with transcripts of
   the agent sessions that built the code. This subagent session's work is the build;
   keep the session/transcript trail — do NOT hand-copy files into the submission
   repo in a way that breaks authored-coverage (the kit warns: have the agent write
   the files). Also: repo must be created after 2026-11-14, carry an OSI license
   (MIT included), and be public.
5. **Snapshot-copy rule.** A submission whose file snapshot is identical to an
   earlier submission is refused. Do not submit the starter unchanged, and do not
   submit this entry twice from two accounts.
6. **Force_Last + 10 total submissions.** The first submission should already be
   strong; save later submissions for real improvements, and keep a dev provisional
   rate in mind — a weak first entry still earns a dev rating that gates the final
   (screen line: place 40 by interval low; unrated entries enter at the line).

## Next improvements (in priority order, before submitting)

1. [x] Land screenshots, verify sizes/dimensions, re-run main.ts, validate dossier. (Done 2026-11-15; see TESTS.md §5–6.)
2. [ ] Visual QA of the three screenshots: table legible at 1440×900, detail dialog
   fully visible, filtered view obviously filtered (RWA badge/count visible).
3. [ ] Consider a second board-size experiment only if time allows: the judge's
   criterion 1 rewards coverage, but 198 rows already is the whole universe — do
   not add live-token or excluded rows to the ranked board (would break the model).
4. [ ] Polish pass on farm plans: spot-check 10 random rows for step quality
   (no step should read as generic for its category; check the Chain/Payments/Index
   branches, which have the fewest live examples).
5. [ ] Submit early (dev provisional rate + Feed cover) with this build, then use
   remaining submissions for iteration: if the dev rate is near the money line,
   iterate on the model panel wording and detail view, which the judge reads most.
6. [ ] Do NOT chase: adding external data (snapshot is sealed; the program runs
   with no network), predicting launch probability (rules forbid presenting it as
   a prediction), or hardcoding protocol names (criterion 2 explicitly penalises it).
