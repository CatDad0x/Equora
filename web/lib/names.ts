import { deployment } from "./config";
import type { MarketInfo } from "@equora/shared";
import { CURRENCIES } from "@equora/shared";

/** Plain-language name for what secures a loan market. */
export function collateralName(m: MarketInfo) {
  const v = deployment.vaults.find((x) => x.address === m.collateralToken);
  if (!v) return { title: "S&P 500 tokens", note: "Mock S&P 500 tokens from your test money", vault: undefined };
  const product = v.strategy === "index" ? "S&P 500" : "US Tech";
  return { title: `${product} · ${v.hedged ? "protected" : "unprotected"}`, note: v.hedged ? "Your currency-protected shares" : "Your shares without currency protection", vault: v };
}

export function loanCurrency(m: MarketInfo) {
  const sym = deployment.tokens.find((t) => t.address === m.loanToken)?.symbol;
  return CURRENCIES.find((c) => c.stables[0] === sym)!;
}

export function marketsFor(currency: string) {
  const loan = deployment.tokens.find((t) => t.symbol === CURRENCIES.find((c) => c.code === currency)!.stables[0])!;
  return deployment.markets.filter((m) => m.loanToken === loan.address);
}

/** Loan safety from the health factor (1.00 = liquidation). */
export function safetyOf(hf: number) {
  if (!Number.isFinite(hf) || hf >= 1.35) return { label: "Comfortable", color: "var(--accent-text)", level: 0 };
  if (hf >= 1.1) return { label: "Getting close", color: "var(--amber)", level: 1 };
  return { label: "Near the limit", color: "var(--red)", level: 2 };
}
