# Token Radar 01 — Data analysis (snapshot 2026-11-14)

Source: `kit/token-radar-01-kit/input/snapshot.json` — DefiLlama `https://api.llama.fi/protocols`,
fetched 2026-11-14T01:18:33Z. `as_of` 2026-11-14, floor $50,000,000. Read-only; every run reads the same bytes.

## Headline counts

| Set | Count |
|---|---|
| Protocols in snapshot (TVL ≥ $5M) | 758 |
| Watchlist (≥ $50M, no token on record, not a wrapped/staked/bridged product) | 40 |
| Pre-token (mcap, gecko_id, symbol all null) | 342 |
| Pre-token with TVL ≥ $50M | 132 |
| Pre-token, strict-rankable (see below) | 198 |
| Rankable above the $50M floor but NOT on the watchlist | 20 |
| Pre-token set aside (wrapped/staked/bridged/versioned/CEX/exchange product) | 144 |
| Live-token (a token on record) | 416 |
| Live-token with a usable market cap (mcap > 0) | 400 |
| Live-token rows used for calibration (0 < mcap/TVL ≤ 5) | 120 |

Total TVL: all protocols $465.7B; pre-token $135.8B; watchlist $12.9B; rankable $20.7B
(top 10 rankable hold 56.6% of rankable TVL — the board is unavoidably top-heavy).

## What "no token" and "wrapped product" mean here

- Pre-token = the snapshot records no token: `mcap_usd`, `gecko_id`, `symbol` all null.
  Say "records no token", never "has no token" — the record is DefiLlama's, not proof.
- The watchlist rule (input/README.md) additionally excludes: a `parentProtocol` on
  DefiLlama's record, category Bridge / Canonical Bridge / Liquid Staking /
  Liquid Restaking / Restaked BTC / CEX, a version-marker name (`\s(V\d+…|v\d+…|\d+\.\d+)$`),
  a whole word `wrapped`/`staked`/`staking` in the name, and names beginning with an
  exchange's name (Binance, Coinbase, Bybit, Kraken, Bitget, OKX, Bitfinex, Gemini).
  `parentProtocol` is NOT one of the snapshot's ten fields, so it cannot be recomputed
  from the file — the watchlist itself is the authoritative output of that rule.
- All 40 watchlist slugs pass the recomputable part of the rule (verified).
- The strict-rankable set applies the recomputable part to every pre-token protocol:
  198 pass, 144 are set aside. Excluded by reason (a protocol can match several):
  CEX 42, Liquid Staking 38, Bridge 28, wrapped/staked word 20, Canonical Bridge 15,
  exchange prefix 14, versioned name 11, Liquid Restaking 3, Restaked BTC 2.

## The starter's coverage hole (why radar-2 ranks 198, not 200)

The starter's early radar takes the top 160 pre-token protocols below the floor by TVL
with only a CEX + versioned filter. Two defects, both fixed in radar-2:

1. **39 of its 160 early rows are strict-excluded products** — bridges (Ink Bridge,
   SuiBridge, Polygon zkEVM Bridge), liquid-staking receipts (STKESOL, Bitget SOL,
   NodeDAO, Crypto.com Liquid Staking), staked-SOL products, Mantle Restaking, wTAO.
   Farming those farms a token that already trades.
2. **It misses 20 rankable protocols above the floor that are not on the watchlist**
   — e.g. Sentora Curator ($2.76B TVL, the #2 implied value in radar-2), Polymarket
   International ($320M), CIAN Yield Layer. The house says the floor is never a
   ceiling and a protocol the list leaves out is no worse a subject; the snapshot
   carries no `parentProtocol`, so the reason they are off the list is not visible
   in the file. Radar-2 ranks every rankable protocol regardless of TVL.

## Calibration: what live tokens are actually worth vs TVL

Live-token protocols in the same snapshot (mcap > 0, mcap/TVL ≤ 5, n = 120):

- Median mcap/TVL **0.189**; p25 0.041; p75 ~1.0. Mean is meaningless (outliers to 400x,
  e.g. a $6.6M-TVL protocol with a $2.6B token).
- Log-log regression mcap ~ TVL: slope **0.59** — market cap grows much slower than TVL.
  A linear 0.25×TVL (starter) overvalues giants: Steakhouse Financial ($2.75B TVL)
  would be $544M at the starter's model vs ~$89M on the fitted power law.
- By category (median mcap/TVL, live n ≥ 3): Basis Trading 0.482 (n=6), Dexs 0.342 (n=11),
  RWA 0.275 (n=9), Yield 0.191 (n=9), Lending 0.129 (n=13). Small-n categories are
  unreliable (Risk Curators n=1 at 2.975; Onchain Capital Allocator n=2 at 0.012).
- By age: median ratio peaks at 365–730 days (0.316) vs 0–180 days (0.068, n=3 — weak).
- By 7-day growth: positive-growth live rows sit higher (0–10%: 0.300) than deeply
  negative ones (−10% or worse: 0.177), but n is small above +10% (n=1).

Data quirks: 15 live-token rows have `mcap_usd == 0` and 1 is negative — they carry no
ratio and are skipped by the calibration and by the Live view. 24 rankable rows have
`listed_at == null` (age unknown) and 2 have `change_7d == null`.

## Watchlist composition (40)

Categories: Risk Curators 12, RWA 7, Onchain Capital Allocator 3, Basis Trading 2,
Lending 2, Chain 2, Yield 2, Restaking 1, Dexs 1, CeDeFi 1, Insurance 1, Payments 1,
Governance Incentives 1, Staking Pool 1, Stablecoin Wrapper 1, Collateral Markets 1, CDP 1.
Top chains: Ethereum 26, Monad 15, Base 12, Binance 11. TVL $51.3M (Firelight) to
$2.75B (Steakhouse Financial). Median 7-day change across rankable rows is −3.8%
(the snapshot week was broadly down — growth is a differentiator, not a tide).

## Ranking methodology (radar-2, lib/model.ts)

```
implied = round( $20M × (TVL / $100M)^0.85
                 × (1 + clamp(change_7d, −50, +100)/100 × 0.6)
                 × (0.55 + min(age_days, 1095)/1095 × 0.45)
                 × category_multiplier × (1 + min(chains−1, 4) × 0.03) )
```

- **Concave TVL (exponent 0.85, $20M at $100M):** a compromise between the linear
  median ratio (0.19×TVL) and the fitted power law (slope 0.59). At $100M it equals
  the live median; at $2.75B it gives $286M for Steakhouse (ratio 0.10, inside the
  live IQR) instead of the starter's $544M. The ranking is still TVL-led (top-10
  overlap with top-10-by-TVL is 9/10) — honest, because TVL spans 550× and the
  multipliers span ~0.5–2× — but category and growth now move names in and out
  (BitFi Basis enters the top 10 on a 1.4× Basis Trading multiple).
- **Category multiplier, calibrated per run from the snapshot:** median mcap/TVL of
  live-token protocols in the category, shrunk halfway in log space toward the
  overall live median 0.189, clamped to [0.7, 1.4]; 1.0 when fewer than 3 live rows.
  On this snapshot: Basis Trading 1.400, Dexs 1.348, RWA 1.207, Yield 1.007,
  CDP 0.946, Yield Aggregator 0.895, Lending 0.827. No protocol name is hardcoded.
- **Growth:** clamp [−50, +100], weight 0.6 → multiplier 0.70–1.60. Null growth = 0.
- **Maturity (age with no token):** 0.55–1.00 over 3 years; unknown listing date = 365 days.
- **Breadth:** +3% per extra chain, max +12% — more chains, more users to reward.
- **Farm plans:** 6 steps each, derived from category + first chain + TVL + age:
  category-specific main action and weekly action, capital $50/$100/$150/$250 by TVL,
  hold 30/45/60 days by age, Ethereum gas $6–$15 vs under $1 elsewhere, a risk note
  per category (impermanent loss, liquidation, leverage, issuer risk…), and the
  never-pay-to-claim + farm-log steps. No name is special-cased.

## Radar-2 board (verified by running main.ts)

- 198 rows (40 watchlist + 158 early), ranks 1–198, implied strictly non-increasing.
- Rank 1 Steakhouse Financial $286.2M; rank 2 Sentora Curator $265.9M; rank 3 Gauntlet
  $186.8M; rank 10 Bittensor dTAO $45.7M; rank 198 Monarq $0.82M.
- Total implied value $2.77B; median $4.34M.
- The dashboard page recomputes every row's implied value from the same formula;
  0 mismatches vs board.json (checked in Python, see TESTS.md).
