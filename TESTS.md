# Token Radar 01 — Validation (TESTS.md)

Run: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input kit/token-radar-01-kit/input/snapshot.json`
Node: v24.22.1 locally (grader uses Node 22; the program is erasable TypeScript,
stdlib only, same shape as the kit starter). Date run: 2026-11-15.

## 1. Program run

- `main.ts` parses the sealed snapshot (758 protocols, 40 watchlist) and builds the
  board without a `boardIssue` error.
- Determinism: two consecutive runs produce byte-identical `board.json` and `data.js`
  (`cmp` clean). (Full end-to-end determinism incl. `dossier.json` cannot be shown
  until screenshots exist — the dossier hashes the screenshots.)
- Exit code is 1 only because `screenshots/` is still empty (see §5); the board,
  `data.js` and `dashboard/` are written before that check, so the failure is
  isolated to the missing screenshots.

## 2. Gate-style checks on `out/board.json` (all pass)

| Check | Result |
|---|---|
| Rows | 198 (gate: 100–4,000) |
| Board size | 322,263 bytes (gate: ≤ 8 MiB) |
| Slugs all in snapshot, unique | yes |
| Watchlist coverage | 40/40 |
| Ranks exactly 1–198 | yes |
| `implied_value_usd` non-increasing with rank | yes |
| Implied values not all equal (max $286,236,711) | yes |
| Farm steps 3–12 per row, 20–600 chars each | 6 per row, 109–250 chars |
| All rows pre-token (`mcap_usd` null) | yes |
| Dashboard files | `index.html` + `app.css` + `app.js`, 42,399 bytes total (dossier text cap 65,536 — judge reads the whole source) |
| No `http://` / `https://` in any dashboard file | yes (0 occurrences) |
| Top 10 | Steakhouse Financial $286.2M, Sentora Curator $265.9M, Gauntlet $186.8M, Veda $178.4M, USDD $117.1M, Upshift $77.6M, Polymarket International $53.4M, OnRe $47.3M, BitFi Basis $45.8M, Bittensor dTAO $45.7M |
| Total / median implied | $2.77B / $4.34M |

## 3. Model agreement (page vs board)

The dashboard's `impliedOf` re-implements the model from the snapshot figures.
An independent Python replica of the formula was run over all 198 rows in `data.js`:
**0 mismatches** vs `board.json` implied values. The detail view shows this check
live ("the page recomputes this row as $X, the same number board.json carries").

## 4. Farm-plan spot checks

- Every row has 6 steps; step lengths 109–250 chars.
- Category branches exercised in this snapshot include Risk Curators/Allocator
  (vault), RWA (mint + identity check), Lending/CDP (supply + small borrow),
  Dexs (LP + drift warning), Basis Trading (funding cycle), Yield, Restaking,
  Perpetuals/Derivatives (hedged, small), Prediction Market, Insurance,
  Stablecoin Wrapper, Payments, Chain, Indexes, Governance, Staking Pool, Farm.
- Gas wording splits on first chain: Ethereum rows say "$6 to $15 of gas",
  all other chains "under $1 of gas". Verified for Steakhouse (Base first chain →
  cheap) and USDD (Tron first chain → cheap); Ethereum-first rows (e.g. Gauntlet
  lists Base first — check a pure-Ethereum row in visual QA).

## 5. Screenshots — DONE (2026-11-15)

Three 1440×900 PNGs in `screenshots/`, taken with `node screenshots.mjs`
(Playwright + stock Chrome for Testing 159, `CHROME_PATH=$HOME/chrome-test/chrome-linux64/chrome`):

| File | View | Bytes | Visual check |
|---|---|---|---|
| `1-board.png` | Board | 160,188 | Hero + facts + filters + ranks 1–6, badges, bars — legible |
| `2-detail.png` | Detail, rank 1 Steakhouse Financial (`#p=steakhouse-financial`) | 224,024 | Dialog open: full model breakdown, recompute line, farm plan steps 1–4 visible (5–6 below the fold; dialog scrolls) |
| `3-filtered.png` | Filtered, RWA (`#category=RWA`) | 152,675 | "RWA (16)" selected, "16 rows shown", ranks 8/11/13/22… |

All ≤ 512 KiB, long side 1440, short side 900. Total dossier 759,613 bytes (< 1.5 MiB).

What was tried before this worked:
- `/opt/meta-chromium/chrome` (the VM's bundled Chromium 157) refuses to start
  from exec: `Hatch WebGL domain policy is required for browser startup`, with
  `--headless=new`, `--headless=old`, `--disable-webgl`, `--use-angle=swiftshader`.
  It is the managed Muse browser binary, not a free-standing one.
- Playwright's own Chromium download timed out after 30 s (egress); a direct
  `curl` of the same Chrome-for-Testing zip (199 MB) succeeded in ~18 s. The
  stock binary lives at `~/chrome-test/chrome-linux64/chrome` (414 MB after the
  zip was deleted) — keep it for re-takes, delete it if disk is ever tight.
- First screenshot run produced three identical images: `page.goto()` to a URL
  differing only in hash is a same-document navigation and never reloads.
  Fixed in `screenshots.mjs` (fresh page per shot + `waitForSelector('dialog[open]')`).
- `/tmp` is a 512 MB tmpfs: the download filled it mid-extraction. Extract
  browsers under `$HOME`, never `/tmp`.

## 6. End-to-end validation (after screenshots)

- `main.ts` exit 0: `758 protocols, 40 on the watchlist, 198 rows scored
  (158 early, 144 pre-token set aside, 24 live shown)`.
- `dossier.json`: schema `makefun/dossier/v1`, cover 0, 3 PNG images, 759,613 bytes
  (≤ 1.5 MiB); text 42,663 bytes (≤ 65,536, **not cut** — all 3 dashboard files
  shown whole); re-running `buildDossier` on `out/` reproduces it **byte-identical**.
- Full-run determinism: two separate `MAKEFUN_OUTPUT_DIR` runs produce
  byte-identical `board.json`, `data.js` and `dossier.json` (grader runs the
  program twice and requires identical bytes).
- Live browser check (headless Chrome): 198 table rows render, clicking a row
  opens the detail dialog, **zero console errors**.
- `out/` in this directory is the verified build output (gitignored).

## 7. Not yet verified (needs submission — parent's step)

- [ ] Grader run in a Node 22 sandbox (no network): the program uses only
  `node:fs`, `node:path`, `node:url`, `node:crypto` — no install step.
- [ ] Dev provisional rate after first submission.
- [ ] Transcript gate: submission must carry the agent sessions that built the code.
