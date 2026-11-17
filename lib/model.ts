// Token Radar model v2 ("radar-2"): one sealed snapshot in, one ranked board out.
//
// What changed vs the starter's radar-1, and why (every claim below is checkable
// from the snapshot itself, in ANALYSIS.md):
//  - The board ranks EVERY rankable pre-token protocol (198 rows: the 40 watchlist
//    slugs plus all 158 rankable protocols the watchlist leaves out, including 20
//    above the $50M floor), not an arbitrary top-160 by TVL. Coverage is the
//    the model should not have to make.
//  - Wrapped / staked / bridged products are excluded from the ranked board with a
//    stated reason, and shown in their own "Set aside" view. The starter's early
//    radar let 39 of them in (bridges, liquid-staking receipts, staked SOL
//    products). A receipt for a token that already trades is not a launch.
//  - Implied value is concave in TVL, not linear. In this same snapshot the
//    live-token protocols' market-cap/TVL ratio falls as TVL grows (log-log slope
//    ~0.59, median ratio 0.189, p25 0.041, p75 ~1.0): a $2.7B curator is not worth
//    550x a $5M protocol. implied = K * (TVL / $100M)^0.85 * growth * maturity
//    * category * breadth, with K = $20M (so a $100M protocol at neutral
//    multipliers is worth $20M, the live median ratio at that size).
//  - The category multiplier is CALIBRATED FROM THE SNAPSHOT, not hardcoded: for
//    each category with >= 3 live-token protocols, it is the median mcap/TVL of
//    those live rows, shrunk halfway (in log space) toward the overall live
//    median and clamped to [0.7, 1.4]. Categories with too few live rows get 1.0.
//    The calibration is recomputed on every run and shipped in data.js, so the
//    dashboard states exactly what the model used.
//  - Growth and age matter more than in radar-1: growth is clamped to [-50, +100]
//    at weight 0.6 (range 0.70-1.60) and maturity spans 0.55-1.00 over 3 years,
//    because criterion 2 names TVL, seven-day growth and "how long it has run
//    with no token" as the three inputs.
//  - Farm plans are differentiated by category AND by chain (Ethereum gas vs
//    cheap-chain gas), with a category-specific weekly action and risk note.
//    No protocol name is ever special-cased: the same functions score every row.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  reference_tvl_usd: number;
  reference_value_usd: number;
  tvl_exponent: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_step: number;
  breadth_max_chains: number;
  category_shrink: number;
  category_min_live: number;
  category_lo: number;
  category_hi: number;
  live_ratio_cap: number;
}

export const MODEL: ModelConstants = {
  reference_tvl_usd: 100_000_000,
  reference_value_usd: 20_000_000,
  tvl_exponent: 0.85,
  growth_weight: 0.6,
  growth_floor: -50,
  growth_cap: 100,
  maturity_floor: 0.55,
  maturity_range: 0.45,
  maturity_days: 1095,
  unknown_age_days: 365,
  breadth_step: 0.03,
  breadth_max_chains: 4,
  category_shrink: 0.5,
  category_min_live: 3,
  category_lo: 0.7,
  category_hi: 1.4,
  live_ratio_cap: 5,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;
/** How many set-aside protocols the dashboard lists, by TVL. */
export const EXCLUDED_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_value_usd: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    category_multiplier: number;
    breadth_multiplier: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  base_value_usd: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  category_multiplier: number;
  breadth_multiplier: number;
  watchlist: boolean;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number;
  change_7d: number | null;
  mcap_tvl_ratio: number;
}

/** A pre-token protocol set aside from the ranking, with the reason it is not a launch. */
export interface ExcludedRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  reason: string;
}

/** The calibration the model computed from the snapshot's own live-token rows. */
export interface Calibration {
  live_rows_used: number;
  overall_median_ratio: number;
  category_multiplier: Record<string, number>;
}

/** Everything the dashboard needs: the board, the live set, the set-aside set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  excluded_size: number;
  pre_token_count: number;
  total_implied_usd: number;
  median_implied_usd: number;
  calibration: Calibration;
  rows: RadarRow[];
  live: LiveRow[];
  excluded: ExcludedRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
/** Whole-word wrapped / staked / staking in a name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
/** Exchange names a protocol name must not begin with (the watchlist rule). */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;
/** Categories that are a product of a token that already trades, not a launch of their own. */
const PRODUCT_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/**
 * Why a pre-token protocol is NOT a launch candidate, or null when it is one.
 * Mirrors the watchlist's own rule (input/README.md): a wrapped, staked or
 * bridged product of a token that already trades, a versioned pool, or an
 * exchange product. The watchlist slugs all pass this check; it is applied here
 * so the early rows below the floor are held to the same bar.
 */
export function exclusionReason(p: SnapshotProtocol): string | null {
  if (p.category === 'CEX') return 'Centralised exchange: its token, if any, is the exchange\u2019s, not a protocol launch.';
  if (p.category === 'Bridge' || p.category === 'Canonical Bridge') return 'Bridge product: it moves a token that already trades, it is not a launch of its own.';
  if (p.category === 'Liquid Staking' || p.category === 'Liquid Restaking' || p.category === 'Restaked BTC') return 'Staked product: a receipt for a token that already trades, not a launch of its own.';
  if (VERSIONED.test(p.name)) return 'Versioned pool: a numbered release of another protocol, not a protocol of its own.';
  if (WRAPPED_WORD.test(p.name)) return 'Wrapped or staked product: the name says it wraps or stakes a token that already trades.';
  if (EXCHANGE_PREFIX.test(p.name)) return 'Exchange product: it begins with an exchange\u2019s name.';
  return null;
}

/** Whether a protocol is one the board may rank: pre-token and not a product of a token that trades. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && exclusionReason(p) === null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** Median of a non-empty sorted-by-value list; null when empty. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Calibrate the category multiplier from the snapshot's live-token rows: the
 * median market-cap/TVL of live protocols in each category, shrunk halfway in
 * log space toward the overall live median, clamped to [lo, hi]. Categories
 * with fewer than `category_min_live` live rows get 1.0. Rows with a market
 * cap of 0 or less carry no ratio and are skipped; ratios above the cap are
 * skipped as outliers (a $6M-TVL protocol with a $2.6B token is not a yardstick).
 */
export function calibrate(snapshot: Snapshot, model: ModelConstants = MODEL): Calibration {
  const live = snapshot.protocols.filter(
    (p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.mcap_usd / p.tvl_usd <= model.live_ratio_cap,
  );
  const overall = median(live.map((p) => p.mcap_usd! / p.tvl_usd)) ?? 0.2;
  const byCategory = new Map<string, number[]>();
  for (const p of live) {
    const key = p.category ?? 'Other';
    const list = byCategory.get(key) ?? [];
    list.push(p.mcap_usd! / p.tvl_usd);
    byCategory.set(key, list);
  }
  const category_multiplier: Record<string, number> = {};
  for (const [cat, ratios] of [...byCategory.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (ratios.length < model.category_min_live) continue;
    const med = median(ratios);
    if (med === null || med <= 0) continue;
    const shrunk = Math.exp(model.category_shrink * Math.log(med / overall));
    category_multiplier[cat] = Math.round(Math.min(model.category_hi, Math.max(model.category_lo, shrunk)) * 1000) / 1000;
  }
  return { live_rows_used: live.length, overall_median_ratio: Math.round(overall * 1000) / 1000, category_multiplier };
}

/** The category multiplier for one protocol under a calibration (1.0 when uncalibrated). */
export function categoryMultiplier(p: SnapshotProtocol, calibration: Calibration): number {
  if (p.category === null) return 1;
  return calibration.category_multiplier[p.category] ?? 1;
}

/** The five multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  calibration: Calibration,
  model: ModelConstants = MODEL,
): { implied: number; base: number; growthPct: number; growthMult: number; maturityMult: number; categoryMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const categoryMult = categoryMultiplier(protocol, calibration);
  const extraChains = Math.min(Math.max(protocol.chains.length - 1, 0), model.breadth_max_chains);
  const breadthMult = 1 + extraChains * model.breadth_step;
  const base = model.reference_value_usd * Math.pow(protocol.tvl_usd / model.reference_tvl_usd, model.tvl_exponent);
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult * categoryMult * breadthMult));
  return { implied, base: Math.round(base), growthPct, growthMult, maturityMult, categoryMult, breadthMult, age };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, calibration: Calibration, model: ModelConstants = MODEL): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor and the gate's coverage row: every slug, even one
  // the snapshot no longer carries (it cannot, but coverage is never gambled).
  // Watchlist slugs pass exclusionReason by construction; they are taken as-is.
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: EVERY rankable pre-token protocol the watchlist leaves
  // out, whatever its TVL. The watchlist is a floor, never a ceiling: on this
  // snapshot 20 rankable protocols sit ABOVE the $50M floor yet are not on the
  // list (the house's rule uses DefiLlama's parentProtocol, which the snapshot
  // does not carry), and leaving the biggest ones out would be ranking with a
  // hole in it. That is 158 rows, for a 198-row board.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, calibration, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      base_value_usd: s.base,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      category_multiplier: s.categoryMult,
      breadth_multiplier: round4(s.breadthMult),
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** Gas for one transaction on the protocol's first chain: Ethereum is dear, the rest are cheap. */
function gasFor(p: SnapshotProtocol): { setup: string; weekly: string } {
  if (chainOf(p) === 'Ethereum') return { setup: 'about $6 to $15 of gas', weekly: 'about $3 of gas a week' };
  return { setup: 'under $1 of gas', weekly: 'a few cents of gas a week' };
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} of USDC into a ${name} vault on ${chain} and keep the vault shares; the vault, not you, picks the allocation.`;
  if (c.includes('rwa')) return `Mint $${capital} of the yield-bearing asset through ${name} on ${chain} and hold it; check whether it needs identity verification first.`;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain}, then borrow a small amount against it and repay it; keep the supply open and the borrow well collateralised.`;
  if (c.includes('dex')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} in the pair the app suggests, and keep the position open; expect the two sides to drift.`;
  if (c.includes('basis')) return `Deposit $${capital} of USDC into ${name}'s basis vault on ${chain} and keep the position open through one funding cycle.`;
  if (c.includes('yield aggregator') || c.includes('yield')) return `Deposit $${capital} of USDC into ${name}'s highest-TVL vault on ${chain} and keep the shares; do not chase the newest vault.`;
  if (c.includes('leveraged farm')) return `Provide $${capital} of liquidity through ${name} on ${chain} at the lowest leverage the app offers, and watch the health factor weekly.`;
  if (c.includes('restak')) return `Restake $${capital} of the chain's staking asset through ${name} and keep the receipt; check which operators it delegates to.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedged position, then close it; keep the margin deposited.`;
  if (c.includes('prediction')) return `Fund $${capital} on ${name} and place one small position in a market you understand, then leave the balance funded.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it in the app's savings position.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active; note what events it does and does not pay for.`;
  if (c.includes('payment')) return `Move $${capital} through ${name} on ${chain} for a real payment, then keep a balance in the app.`;
  if (c.includes('chain')) return `Bridge $${capital} of USDC to ${name}'s chain and use one of its apps for a real transaction, then keep the funds on the chain.`;
  if (c.includes('index')) return `Buy $${capital} of the ${name} index on ${chain} and hold it; the index, not a single asset, is the position.`;
  if (c.includes('governance')) return `Deposit $${capital} through ${name} on ${chain} and vote once in its governance when a proposal is live.`;
  if (c.includes('staking pool')) return `Stake $${capital} of the chain's asset in ${name}'s pool on ${chain} and keep the stake through one reward cycle.`;
  if (c.includes('farm')) return `Deposit $${capital} into ${name}'s main farm on ${chain} and keep the position open; harvest only when the gas is worth it.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's weekly qualifying action. */
function weeklyFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('curator') || c.includes('allocator')) return 'Open the vault page, check the allocation, and add a small top-up or rebalance if the app offers one.';
  if (c.includes('rwa')) return 'Check the distribution or yield payout and leave it compounding in the position.';
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'Check the borrow health and top up supply or repay a little so the position stays safe.';
  if (c.includes('dex')) return 'Swap a small amount through the pool or add a little liquidity so the wallet stays active.';
  if (c.includes('basis')) return 'Check the funding rate and the vault balance, and leave the position open.';
  if (c.includes('yield')) return 'Check the vault yield and harvest or compound only when the gas is worth it.';
  if (c.includes('perpetual') || c.includes('derivative')) return 'Open and close one small hedged trade so the account shows activity without piling on risk.';
  if (c.includes('prediction')) return 'Place one small position in a new market each week.';
  if (c.includes('governance')) return 'Vote on any live proposal, or delegate the vote if the app offers it.';
  if (c.includes('insurance')) return 'Check the policy stays active and note any new cover the app offers.';
  return 'Make one qualifying action each week, such as a deposit, a swap, a borrow or a vote.';
}

/** The category's risk note, folded into the main action step's cost line by the caller. */
function riskFor(p: SnapshotProtocol): string {
  const c = (p.category ?? '').toLowerCase();
  if (c.includes('dex') || c.includes('leveraged farm')) return 'Liquidity can drift apart in price; that drift is the main risk of this position.';
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return 'A borrow can be liquidated if collateral falls; keep the borrow small.';
  if (c.includes('perpetual') || c.includes('derivative')) return 'Leverage can lose money fast; keep the position small and hedged.';
  if (c.includes('rwa')) return 'The asset depends on its real-world issuer; read what backs it before minting.';
  if (c.includes('basis')) return 'Basis trades earn funding but can lose when funding flips; the vault carries that risk.';
  if (c.includes('curator') || c.includes('allocator')) return 'The vault manager picks the risk for you; read the vault strategy before depositing.';
  return 'Only farm with money you can afford to have locked in a new protocol.';
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const gas = gasFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline. ${riskFor(p)}`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and ${gas.setup}`,
      time: '15 minutes to set up',
    },
    {
      text: `${weeklyFor(p)}`,
      cost: gas.weekly,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes; never pay anyone to claim for you.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it when a token is announced.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The live-token protocols with a real market cap, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.mcap_usd !== null && p.mcap_usd > 0 && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd!,
      change_7d: p.change_7d,
      mcap_tvl_ratio: Math.round((p.mcap_usd! / p.tvl_usd) * 1000) / 1000,
    }));
}

/** The set-aside pre-token protocols, by TVL, with the reason each is not a launch. */
export function excludedRows(snapshot: Snapshot): ExcludedRow[] {
  return snapshot.protocols
    .filter((p) => isPreToken(p) && exclusionReason(p) !== null)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EXCLUDED_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      reason: exclusionReason(p)!,
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, watchlist: Set<string>): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    base_value_usd: row.model.base_value_usd,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    category_multiplier: row.model.category_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    watchlist: watchlist.has(row.slug),
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const calibration = calibrate(snapshot, model);
  const board = buildBoard(snapshot, calibration, model);
  const live = liveRows(snapshot);
  const excluded = excludedRows(snapshot);
  const watchlist = new Set(snapshot.watchlist);
  const early = board.filter((r) => !watchlist.has(r.slug)).length;
  const excludedTotal = snapshot.protocols.filter((p) => isPreToken(p) && exclusionReason(p) !== null).length;
  const preToken = snapshot.protocols.filter(isPreToken).length;
  const implieds = board.map((r) => r.implied_value_usd).sort((a, b) => a - b);
  const medianImplied = implieds.length % 2 === 1
    ? implieds[Math.floor(implieds.length / 2)]!
    : Math.round((implieds[implieds.length / 2 - 1]! + implieds[implieds.length / 2]!) / 2);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    excluded_size: excludedTotal,
    pre_token_count: preToken,
    total_implied_usd: board.reduce((n, r) => n + r.implied_value_usd, 0),
    median_implied_usd: medianImplied,
    calibration,
    rows: board.map((r) => radarRow(r, watchlist)),
    live,
    excluded,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
