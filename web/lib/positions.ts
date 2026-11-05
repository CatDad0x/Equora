"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useReadContracts } from "wagmi";
import { decodeEventLog, parseAbiItem, type Address, type Hex } from "viem";
import { morphoAbi, routerAbi, marketParams, CURRENCIES, type VaultInfo } from "@equora/shared";
import { deployment } from "./config";
import { useCurrency } from "./currency";
import { useFx, useVaultStats, type VaultStats } from "./hooks";

/** Friendly product names; the vault and token names stay as deployed. */
export function productName(v: VaultInfo) {
  return v.strategy === "index" ? "S&P 500" : "US Tech";
}
export function productOf(v: VaultInfo) {
  return v.strategy === "index" ? "the S&P 500" : "US Tech";
}
export function protectionLabel(v: VaultInfo) {
  return v.hedged ? "Currency protected" : "No currency protection";
}
export function symbolOf(currency: string) {
  return CURRENCIES.find((c) => c.code === currency)!.symbol;
}

const ev = {
  deposit: parseAbiItem("event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)"),
  withdraw: parseAbiItem("event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)"),
  settledD: parseAbiItem("event DepositSettled(uint256 indexed id, address indexed receiver, uint256 assets, uint256 shares)"),
  settledR: parseAbiItem("event RedeemSettled(uint256 indexed id, address indexed receiver, uint256 shares, uint256 assets)"),
  routed: parseAbiItem("event DepositedWith(address indexed user, address indexed vault, address token, uint256 amount, uint256 shares)"),
  nav: parseAbiItem("event NavSnapshot(uint256 nav, uint256 navPerShare, uint256 equityValue, int256 hedgeMtm, uint256 cash, uint256 usdPerLocal, uint256 timestamp)"),
};

interface Basis {
  net: number; // local currency deposited minus withdrawn
  fx0?: number; // usdPerLocal at first deposit
}

/** Net contributions per vault from onchain events, plus the FX rate at the user's first deposit. */
export function useBasis(user?: Address) {
  const client = usePublicClient();
  const [basis, setBasis] = useState<Record<string, Basis>>({});
  useEffect(() => {
    if (!client || !user) return;
    (async () => {
      const latest = await client.getBlockNumber();
      const start = latest > 60_000n ? latest - 60_000n : 0n;
      const out: Record<string, Basis & { firstTx?: Hex; firstBlock?: bigint }> = {};
      const add = (v: string, amt: number, tx?: Hex, block?: bigint) => {
        const b = (out[v.toLowerCase()] ??= { net: 0 });
        b.net += amt;
        if (amt > 0 && tx && (b.firstBlock === undefined || (block ?? 0n) < b.firstBlock)) {
          b.firstTx = tx;
          b.firstBlock = block;
        }
      };
      const vaults = deployment.vaults.map((v) => v.address);
      for (let f = start; f <= latest; f += 9_000n) {
        const to = f + 8_999n > latest ? latest : f + 8_999n;
        const [d, w, sd, sr, r] = await Promise.all([
          client.getLogs({ address: vaults, event: ev.deposit, args: { owner: user }, fromBlock: f, toBlock: to }),
          client.getLogs({ address: vaults, event: ev.withdraw, args: { owner: user }, fromBlock: f, toBlock: to }),
          client.getLogs({ address: vaults, event: ev.settledD, args: { receiver: user }, fromBlock: f, toBlock: to }),
          client.getLogs({ address: vaults, event: ev.settledR, args: { receiver: user }, fromBlock: f, toBlock: to }),
          client.getLogs({ address: deployment.router, event: ev.routed, args: { user }, fromBlock: f, toBlock: to }),
        ]);
        // Router deposits emit Deposit(owner=user) and DepositedWith; count router flows once via DepositedWith.
        d.filter((l) => l.args.sender!.toLowerCase() !== deployment.router.toLowerCase()).forEach((l) =>
          add(l.address, Number(l.args.assets) / 1e6, l.transactionHash, l.blockNumber),
        );
        r.forEach((l) => add(l.args.vault!, Number(l.args.amount) / 1e6, l.transactionHash, l.blockNumber));
        sd.forEach((l) => add(l.address, Number(l.args.assets) / 1e6, l.transactionHash, l.blockNumber));
        w.forEach((l) => add(l.address, -Number(l.args.assets) / 1e6));
        sr.forEach((l) => add(l.address, -Number(l.args.assets) / 1e6));
      }
      // FX at first deposit = the NavSnapshot emitted in that transaction.
      await Promise.all(
        Object.entries(out).map(async ([v, b]) => {
          if (!b.firstTx) return;
          const rc = await client.getTransactionReceipt({ hash: b.firstTx });
          for (const lg of rc.logs) {
            if (lg.address.toLowerCase() !== v) continue;
            try {
              const dec = decodeEventLog({ abi: [ev.nav], data: lg.data, topics: lg.topics });
              b.fx0 = Number(dec.args.usdPerLocal) / 1e18;
            } catch {}
          }
        }),
      );
      setBasis(out);
    })().catch(() => {});
  }, [client, user]);
  return basis;
}

export interface PositionRow {
  s: VaultStats;
  shares: number;
  value: number;
  pnl: number;
  fxEffect: number;
  hedge: number;
  equityEffect: number;
  collateralShares: bigint;
  b?: Basis;
}

/** Holdings (including vault shares posted as loan collateral), gain attribution and loans. Same maths as before the redesign. */
export function usePositions() {
  const { address } = useAccount();
  const { currency } = useCurrency();
  const fx = useFx();
  const { stats, loading } = useVaultStats(deployment.vaults);
  const basis = useBasis(address);

  const allMarkets = deployment.markets;
  const { data: posData } = useReadContracts({
    contracts: allMarkets.flatMap((m) => [
      { address: deployment.morpho, abi: morphoAbi, functionName: "position", args: [m.id, address!] },
      { address: deployment.router, abi: routerAbi, functionName: "healthFactor", args: [marketParams(m), address!] },
    ]),
    query: { enabled: !!address },
  });
  const posOf = (i: number) => posData?.[i * 2]?.result as readonly [bigint, bigint, bigint] | undefined;

  const toHome = (v: number, from: string) => {
    if (from === currency) return v;
    const a = fx[from]?.usdPerLocal;
    const b = fx[currency]?.usdPerLocal;
    return a && b ? (v * a) / b : NaN;
  };

  const rows: PositionRow[] = stats
    .map((s) => {
      const mIdx = allMarkets.findIndex((m) => m.collateralToken === s.info.address);
      const collateralShares = mIdx >= 0 ? posOf(mIdx)?.[2] ?? 0n : 0n;
      const shares = Number(s.userShares + collateralShares) / 1e18;
      const value = shares * s.navPerShare;
      const b = basis[s.info.address.toLowerCase()];
      const pnl = b ? value - b.net : NaN;
      // Estimated attribution: equity sleeve (user's share) re-valued at the starting FX rate.
      const userEq = s.supply > 0 ? (shares / s.supply) * s.equityValue : 0;
      const fxNow = fx[s.info.currency]?.usdPerLocal;
      const fxEffect = b?.fx0 && fxNow ? userEq * (1 - fxNow / b.fx0) : 0;
      const hedge = s.info.hedged && s.supply > 0 ? (shares / s.supply) * s.hedgeMtm : 0;
      const equityEffect = Number.isFinite(pnl) ? pnl - fxEffect - hedge : NaN;
      return { s, shares, value, pnl, fxEffect, hedge, equityEffect, collateralShares, b };
    })
    .filter((r) => r.shares > 0);

  const sumHome = (pick: (r: PositionRow) => number) =>
    rows.reduce((a, r) => a + (Number.isFinite(pick(r)) ? toHome(pick(r), r.s.info.currency) : 0), 0);

  const debts = allMarkets
    .map((m, i) => ({ m, pos: posOf(i), hf: posData?.[i * 2 + 1]?.result as bigint | undefined }))
    .filter((x) => x.pos && x.pos[1] > 0n);

  return {
    rows,
    loading,
    debts,
    toHome,
    total: sumHome((r) => r.value),
    pnl: sumHome((r) => r.pnl),
    equityEffect: sumHome((r) => r.equityEffect),
    fxEffect: sumHome((r) => r.fxEffect),
    hedge: sumHome((r) => r.hedge),
    invested: sumHome((r) => r.b?.net ?? NaN),
  };
}

