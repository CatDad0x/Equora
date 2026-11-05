"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { CURRENCIES } from "@equora/shared";
import { useCurrency } from "@/lib/currency";
import { useTestMoney } from "@/lib/onboard";
import { money } from "@/lib/format";
import { Wordmark, Mark } from "./Logo";
import { ConnectButton } from "./ConnectButton";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/invest", label: "Invest" },
  { href: "/borrow", label: "Borrow" },
  { href: "/lend", label: "Earn" },
  { href: "/portfolio", label: "Portfolio" },
];

export function Sidebar() {
  const path = usePathname();
  const { isConnected } = useAccount();
  const { currency, setCurrency, meta } = useCurrency();
  const tm = useTestMoney();

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Link href="/home" aria-label="Parallel Markets home" style={{ textDecoration: "none" }}>
          <Wordmark />
        </Link>
        <span className="demo-tag">Demo</span>
      </div>

      <nav className="side-nav" aria-label="Main">
        {NAV.map((n) => {
          const active = path === n.href || path.startsWith(n.href + "/");
          return (
            <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}>
              {active && <Mark />}
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="side-foot">
        <div style={{ display: "grid", gap: 6 }}>
          <span className="label">Your currency</span>
          <div className="currency-seg" role="group" aria-label="Your currency">
            {CURRENCIES.map((c) => (
              <button key={c.code} aria-pressed={currency === c.code} onClick={() => setCurrency(c.code)}>
                {c.symbol}
              </button>
            ))}
          </div>
        </div>

        {isConnected ? (
          <>
            <div style={{ display: "grid", gap: 2 }}>
              <span className="label">Test money</span>
              <span className="side-balance">{money(tm.balance, meta.symbol, 0)}</span>
            </div>
            <button className="btn ghost small" onClick={() => tm.claim()} disabled={tm.busy || tm.claimedRecently}>
              <Mark />
              {tm.busy ? "Adding…" : tm.claimedRecently ? "Added today" : "Add test money"}
            </button>
            {tm.error && <span className="small" style={{ color: "var(--red)" }}>{tm.error}</span>}
          </>
        ) : null}

        <ConnectButton />

        <div className="side-links">
          <Link href="/admin" aria-current={path.startsWith("/admin") ? "page" : undefined}>
            Advanced (for partner teams)
          </Link>
          <span>Base Sepolia test network · not affiliated with any stablecoin issuer</span>
        </div>
      </div>
    </aside>
  );
}
