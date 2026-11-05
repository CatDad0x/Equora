"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useCurrency } from "@/lib/currency";
import { useTestMoney } from "@/lib/onboard";
import { usePositions, productName, protectionLabel, symbolOf } from "@/lib/positions";
import { useLendingTotals } from "@/lib/lendingTotals";
import { money, pct, signedMoney } from "@/lib/format";
import { Mark } from "@/components/Logo";

const ACTIONS = [
  { title: "Invest", sub: "US shares in your own currency, with currency protection.", cta: "Start investing", href: "/invest" },
  { title: "Borrow", sub: "Get cash against your investments without selling.", cta: "See how much", href: "/borrow" },
  { title: "Earn", sub: "Lend your stablecoins and earn interest.", cta: "See rates", href: "/lend" },
];

export default function HomePage() {
  const { isConnected } = useAccount();
  const { meta } = useCurrency();
  const tm = useTestMoney();
  const pos = usePositions();
  const { earning, borrowed } = useLendingTotals();
  const total = pos.total + tm.balance + earning - borrowed;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <section aria-label="Your total" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 24, padding: "40px 0 32px" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <h1 className="section-title" style={{ fontSize: 14 }}>
            <Mark />
            Your total
          </h1>
          <strong style={{ fontWeight: 600, fontSize: 72, letterSpacing: "-0.05em", lineHeight: 0.95, fontFeatureSettings: '"tnum" 1' }}>
            {isConnected ? money(total, meta.symbol, 0) : "—"}
          </strong>
          {isConnected && Number.isFinite(pos.pnl) && pos.rows.length > 0 && (
            <span className={pos.pnl >= 0 ? "pos" : "neg"} style={{ fontWeight: 600, fontSize: 14 }}>
              {signedMoney(pos.pnl, meta.symbol, 0)} on your investments
            </span>
          )}
          {!isConnected && (
            <Link href="/start" className="btn" style={{ justifySelf: "start" }}>
              Sign in to start
            </Link>
          )}
        </div>
        {isConnected && (
          <div className="cells" style={{ gridTemplateColumns: "repeat(4, minmax(112px, 1fr))" }}>
            <div><span className="label">Invested</span><strong>{money(pos.total, meta.symbol, 0)}</strong></div>
            <div><span className="label">Test money</span><strong>{money(tm.balance, meta.symbol, 0)}</strong></div>
            <div><span className="label">Earning</span><strong>{money(earning, meta.symbol, 0)}</strong></div>
            <div><span className="label">Borrowed</span><strong>{borrowed > 0 ? "−" : ""}{money(borrowed, meta.symbol, 0)}</strong></div>
          </div>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", border: "1px solid var(--line)", borderRadius: "var(--radius-m)", overflow: "hidden", background: "var(--surface)" }}>
        {ACTIONS.map((a, i) => (
          <Link
            key={a.href}
            href={a.href}
            style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 170, padding: "26px 28px", color: "var(--ink)", textDecoration: "none", borderLeft: i ? "1px solid var(--line)" : undefined }}
          >
            <span className="section-title" style={{ fontSize: 22, letterSpacing: "-0.6px" }}>
              <Mark />
              {a.title}
            </span>
            <span className="muted" style={{ flex: 1, fontSize: 14, lineHeight: 1.5 }}>{a.sub}</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--accent-text)" }}>{a.cta} →</span>
          </Link>
        ))}
      </div>

      <section aria-labelledby="h-inv" style={{ display: "grid", gap: 12, padding: "28px 0 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h2 id="h-inv" className="section-title">
            <Mark />
            Your investments
          </h2>
          <Link href="/portfolio" style={{ fontWeight: 700, fontSize: 14, color: "var(--accent-text)" }}>
            See portfolio
          </Link>
        </div>
        {pos.rows.length === 0 ? (
          <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span className="muted">You don&rsquo;t own any investments yet.</span>
            <Link href="/invest" className="btn small">Invest</Link>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-m)", background: "var(--surface)" }}>
            {pos.rows.map((r, i) => {
              const sym = symbolOf(r.s.info.currency);
              const change = r.b?.net ? (r.pnl / r.b.net) * 100 : NaN;
              return (
                <div key={r.s.info.address} style={{ display: "flex", alignItems: "center", gap: 14, minHeight: 64, padding: "0 18px", borderTop: i ? "1px solid var(--line-2)" : undefined }}>
                  <div style={{ display: "grid", gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <strong>{productName(r.s.info)}</strong>
                      <span className="small" style={{ color: "var(--faint)" }}>{r.s.info.symbol}</span>
                    </span>
                    <span className="small muted">
                      {protectionLabel(r.s.info)}
                      {r.collateralShares > 0n ? " · securing your loan" : ""}
                    </span>
                  </div>
                  <div style={{ display: "grid", justifyItems: "end", gap: 2 }}>
                    <strong style={{ fontFeatureSettings: '"tnum" 1' }}>{money(r.value, sym, 0)}</strong>
                    {Number.isFinite(change) && <span className={`small ${change >= 0 ? "pos" : "neg"}`} style={{ fontWeight: 600 }}>{pct(change, 1, true)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="small" style={{ color: "var(--faint)" }}>Share prices can fall. Test money only; currency protection is simulated and figures are illustrative.</p>
      </section>
    </div>
  );
}
