"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useCurrency } from "@/lib/currency";
import { useTestMoney } from "@/lib/onboard";
import { money } from "@/lib/format";
import { ConnectButton } from "@/components/ConnectButton";
import { Wordmark } from "@/components/Logo";

/** Sign in, then test money is added automatically. */
export default function Start() {
  const { isConnected } = useAccount();
  const { meta } = useCurrency();
  const tm = useTestMoney();
  const tried = useRef(false);

  // Add test money once, straight after sign-in, unless it was already claimed recently.
  useEffect(() => {
    if (isConnected && !tm.claimedRecently && !tried.current && tm.balance === 0) {
      tried.current = true;
      void tm.claim();
    }
  }, [isConnected, tm]);

  const ready = isConnected && (tm.ok || tm.claimedRecently || tm.balance > 0);

  return (
    <div className="signin">
      <div style={{ marginBottom: 32 }}>
        <Wordmark size={24} />
      </div>
      <div className="signin-card">
        {!isConnected && (
          <>
            <div style={{ display: "grid", gap: 8 }}>
              <h1 style={{ fontSize: 30 }}>Try Parallel</h1>
              <p className="muted">Sign in with your email or a passkey. No crypto wallet needed.</p>
            </div>
            <ConnectButton />
            <p className="small muted" style={{ textAlign: "center" }}>
              This is a demo on a test network. You&rsquo;ll get test money to try it. Nothing here is real money.
            </p>
          </>
        )}

        {isConnected && !ready && !tm.error && (
          <div role="status" style={{ display: "grid", justifyItems: "center", gap: 18, padding: "24px 0", textAlign: "center" }}>
            <svg className="spin" aria-hidden="true" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round">
              <path d="M36 20a16 16 0 1 1-16-16" />
            </svg>
            <strong style={{ fontSize: 22 }}>Setting up your account</strong>
            <span className="muted">Adding your test money…</span>
          </div>
        )}

        {isConnected && tm.error && !ready && (
          <div style={{ display: "grid", gap: 16 }}>
            <div role="alert" className="notice error">
              <strong>We couldn&rsquo;t add your test money.</strong> {tm.error} Nothing was charged.
            </div>
            <button className="btn block" onClick={() => tm.claim()} disabled={tm.busy}>
              Try again
            </button>
            <Link href="/home" className="small muted" style={{ textAlign: "center" }}>
              Look around first
            </Link>
          </div>
        )}

        {ready && (
          <div style={{ display: "grid", justifyItems: "center", gap: 18, textAlign: "center" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <span className="muted">You&rsquo;re in. You have</span>
              <strong style={{ fontSize: 44, letterSpacing: "-2px", lineHeight: 1 }}>{money(tm.balance, meta.symbol, 0)}</strong>
              <span className="muted">of test money to try investing, borrowing and earning.</span>
            </div>
            <Link href="/home" className="btn block">
              Let&rsquo;s go
            </Link>
          </div>
        )}
      </div>
      <span className="small muted" style={{ marginTop: 24 }}>
        Base Sepolia test network · not affiliated with any stablecoin issuer
      </span>
    </div>
  );
}
