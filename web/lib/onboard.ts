"use client";

import { useState } from "react";
import { useAccount, useBlock, useReadContract } from "wagmi";
import { faucetAbi } from "@equora/shared";
import { deployment } from "./config";
import { useCurrency } from "./currency";
import { useBalances, useSteps } from "./hooks";
import { num } from "./format";

/** Test-money balance in the home currency (all stables of that currency, at par) and the faucet claim. */
export function useTestMoney() {
  const { address } = useAccount();
  const { currency } = useCurrency();
  const stables = deployment.tokens.filter((t) => t.kind === "stable");
  const { balances, refetch } = useBalances(stables.map((t) => t.address));
  const { data: nextClaim } = useReadContract({
    address: deployment.faucet,
    abi: faucetAbi,
    functionName: "nextClaimAt",
    args: [address!],
    query: { enabled: !!address },
  });
  // Compare against chain time, not the browser clock.
  const { data: block } = useBlock({ watch: true });
  const now = block?.timestamp ?? BigInt(Math.floor(Date.now() / 1000));
  const claimedRecently = nextClaim !== undefined && (nextClaim as bigint) > now;
  const steps = useSteps();
  const [state, setState] = useState<{ busy: boolean; error?: string; ok?: boolean }>({ busy: false });

  const balance = stables.reduce((sum, t, i) => (t.currency === currency ? sum + num(balances[i], t.decimals) : sum), 0);

  async function claim(): Promise<boolean> {
    if (!address) return false;
    setState({ busy: true });
    const res = await fetch("/api/onboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address }),
    }).catch(() => null);
    if (res?.ok) {
      setState({ busy: false, ok: true });
      refetch();
      return true;
    }
    if (res && res.status !== 501) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setState({ busy: false, error: body.error ?? "We couldn't add your test money. Try again in a minute." });
      return false;
    }
    // Sponsorship unavailable: claim directly (needs a little test ETH for gas).
    const ok = await steps.run(
      [{ label: "Adding test money", address: deployment.faucet, abi: faucetAbi, functionName: "claim" }],
      "Test money added.",
    );
    setState({ busy: false, ok, error: ok ? undefined : steps.error ?? "We couldn't add your test money. Try again in a minute." });
    if (ok) refetch();
    return ok;
  }

  return { balance, claim, claimedRecently, busy: state.busy || steps.running, error: state.error, ok: state.ok, refetch };
}
