/**
 * Offchain scenario maths used by the simulator. Mirrors the onchain model:
 * equities are USD-priced; the local value of USD = usd / usdPerLocal.
 * A hedge is short USD / long local, marked N * (1/K - 1/S) minus carry.
 */
export interface ScenarioInput {
  amount: number; // local currency invested
  equityMovePct: number; // e.g. 10 = +10% in USD
  fxMovePct: number; // move in USD-per-local, e.g. 10 = local currency strengthens 10%
  years: number; // horizon, for carry and fees
  carryBpsPerYear: number; // hedge cost (+) or benefit (-)
  feeBpsPerYear: number; // management fee
  cashBufferPct: number; // share kept in local cash
  spreadBps: number; // execution spread per side
  rebalanced: boolean; // hedge resized continuously (true) or set once at the start (false)
}

export interface ScenarioResult {
  unhedged: number;
  hedged: number;
  equityEffect: number; // local-currency P&L from the equity move (hedged vault)
  fxEffectUnhedged: number;
  hedgePnl: number;
  costs: number;
}

export function runScenario(i: ScenarioInput): ScenarioResult {
  const invested = i.amount * (1 - i.cashBufferPct / 100);
  const cash = i.amount - invested;
  const entry = invested * (i.spreadBps / 10_000);
  const eq0 = invested - entry; // local value of equities at entry
  const e = 1 + i.equityMovePct / 100;
  const f = 1 + i.fxMovePct / 100;

  const eq1 = (eq0 * e) / f; // local value after both moves
  const exit = eq1 * (i.spreadBps / 10_000);
  const fees = i.amount * (i.feeBpsPerYear / 10_000) * i.years;

  const unhedged = eq1 + cash - exit - fees;

  // Hedge notional: initial USD exposure (static) or current USD exposure (rebalanced).
  const notionalLocalAtK = i.rebalanced ? eq0 * e : eq0; // N / K, in local
  const hedgePnl = notionalLocalAtK * (1 - 1 / f);
  const carry = notionalLocalAtK * (i.carryBpsPerYear / 10_000) * i.years;
  const hedged = unhedged + hedgePnl - carry;

  return {
    unhedged,
    hedged,
    equityEffect: eq0 * (e - 1),
    fxEffectUnhedged: eq0 * e * (1 / f - 1),
    hedgePnl: hedgePnl - carry,
    costs: entry + exit + fees,
  };
}

export const WAD = 10n ** 18n;

export function formatMoney(value: number, symbol: string, digits = 0) {
  const sign = value < 0 ? "−" : "";
  return `${sign}${symbol}${Math.abs(value).toLocaleString("en-AU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}
