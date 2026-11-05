"use client";

import { deployment } from "./config";
import { useMarkets } from "./lending";
import { usePositions } from "./positions";

/** What the user is lending and borrowing across Morpho markets, converted to the home currency. */
export function useLendingTotals() {
  const { states } = useMarkets(deployment.markets);
  const { toHome } = usePositions();
  const currencyOf = (token: string) => deployment.tokens.find((t) => t.address === token)?.currency ?? "AUD";
  let earning = 0;
  let borrowed = 0;
  for (const s of states) {
    const c = currencyOf(s.m.loanToken);
    if (s.user.supplyAssets) earning += toHome(s.user.supplyAssets, c) || 0;
    if (s.user.borrowAssets) borrowed += toHome(s.user.borrowAssets, c) || 0;
  }
  return { earning, borrowed, states };
}
