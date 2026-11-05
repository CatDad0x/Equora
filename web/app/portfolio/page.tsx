"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useCurrency } from "@/lib/currency";
import { deployment } from "@/lib/config";
import { usePositions, productName, protectionLabel, symbolOf } from "@/lib/positions";
import { useLendingTotals } from "@/lib/lendingTotals";
import { money, pct, signedMoney } from "@/lib/format";
import { PendingRequests } from "@/components/PendingRequests";
import { Mark } from "@/components/Logo";

function safety(hf: number) {
  if (!Number.isFinite(hf)) return { label: "Comfortable", color: "var(--accent-text)", level: 0 };
  if (hf >= 1.35) return { label: "Comfortable", color: "var(--accent-text)", level: 0 };
  if (hf >= 1.1) return { label: "Getting close", color: "var(--amber)", level: 1 };
  return { label: "Near the limit", color: "var(--red)", level: 2 };
}

export default function Portfolio() {
  const { address } = useAccount();
  const { currency, meta } = useCurrency();
  const pos = usePositions();
  const { states } = useLendingTotals();
  const sym = meta.symbol;

  if (!address)
    return (
      <div style={{ padding: "40px 0", display: "grid", gap: 16 }}>
        <h1>Portfolio</h1>
        <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span className="muted">Sign in to see what you own.</span>
          <Link href="/start" className="btn small">Sign in</Link>
        </div>
      </div>
    );

  const parts = [
    { label: "Share performance", value: pos.equityEffect },
    { label: "Currency effect", value: pos.fxEffect },
    { label: "Hedge result", value: pos.hedge },
  ];
  const maxAbs = Math.max(1, ...parts.map((p) => Math.abs(p.value || 0)));
  const loans = states.filter((s) => s.user.borrowAssets > 0);
  const lending = states.filter((s) => s.user.supplyAssets > 0);
  const loanSym = (token: string) => symbolOf(deployment.tokens.find((t) => t.address === token)?.currency ?? currency);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <section style={{ display: "flex", flexWrap: "wrap", margin: "0 -32px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ flex: "1 1 320px", display: "grid", gap: 10, alignContent: "end", padding: "36px 32px 30px" }}>
          <h1 className="section-title" style={{ fontSize: 14 }}><Mark />Your investments are worth</h1>
          <strong style={{ fontWeight: 600, fontSize: 64, letterSpacing: "-0.05em", lineHeight: 0.95, fontFeatureSettings: '"tnum" 1' }}>
            {money(pos.total, sym, 0)}
          </strong>
          {pos.rows.length > 0 && Number.isFinite(pos.pnl) && (
            <span className="muted" style={{ fontSize: 14 }}>
              <strong className={pos.pnl >= 0 ? "pos" : "neg"}>{signedMoney(pos.pnl, sym, 0)}</strong> since you started
              {Number.isFinite(pos.invested) && pos.invested > 0 ? ` · you put in ${money(pos.invested, sym, 0)}` : ""}
            </span>
          )}
        </div>
        {pos.rows.length > 0 && (
          <div style={{ flex: "1 1 380px", display: "grid", gap: 4, padding: "30px 32px", borderLeft: "1px solid var(--line)", background: "var(--surface)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, paddingBottom: 6 }}>Where the {signedMoney(pos.pnl, sym, 0)} came from</span>
            {parts.map((p) => {
              const w = ((Math.abs(p.value || 0) / maxAbs) * 50).toFixed(1);
              const up = (p.value || 0) >= 0;
              return (
                <div key={p.label} style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr) 84px", alignItems: "center", gap: 12, minHeight: 34 }}>
                  <span className="small muted">{p.label}</span>
                  <div style={{ position: "relative", height: 10 }} aria-hidden="true">
                    <span style={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: 1, background: "var(--border)" }} />
                    <span style={{ position: "absolute", top: 0, height: 10, borderRadius: 2, width: `${w}%`, ...(up ? { left: "50%", background: "var(--accent)" } : { right: "50%", background: "#c98a7e" }) }} />
                  </div>
                  <strong className={`small ${up ? "pos" : "neg"}`} style={{ textAlign: "right", fontFeatureSettings: '"tnum" 1' }}>{signedMoney(p.value || 0, sym, 0)}</strong>
                </div>
              );
            })}
            <span className="small" style={{ paddingTop: 8, lineHeight: 1.5, color: "var(--faint)" }}>
              An estimate. Fees and trading costs are inside share performance. The hedge result offsets most of the currency effect.
            </span>
          </div>
        )}
      </section>

      <section aria-labelledby="h-hold" style={{ display: "grid", gap: 12, padding: "26px 0" }}>
        <h2 id="h-hold" className="section-title"><Mark />What you own</h2>
        {pos.rows.length === 0 ? (
          <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span className="muted">You don&rsquo;t own any investments yet.</span>
            <Link href="/invest" className="btn small">Invest</Link>
          </div>
        ) : (
          <div className="table-scroll" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-m)", background: "var(--surface)" }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 18 }}>Investment</th>
                  <th>Protection</th>
                  <th className="num">Value</th>
                  <th className="num">Gain</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pos.rows.map((r) => {
                  const s = symbolOf(r.s.info.currency);
                  const locked = r.collateralShares > 0n;
                  const change = r.b?.net ? (r.pnl / r.b.net) * 100 : NaN;
                  return (
                    <tr key={r.s.info.address}>
                      <td style={{ paddingLeft: 18 }}>
                        <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                          <strong>{productName(r.s.info)}</strong>
                          <span className="small" style={{ color: "var(--faint)" }}>{r.s.info.symbol}</span>
                        </span>
                        <span className="small muted">{r.shares.toLocaleString("en-AU", { maximumFractionDigits: 4 })} shares</span>
                      </td>
                      <td className="small">
                        {protectionLabel(r.s.info)}
                        {locked && (
                          <div><span className="tag" style={{ background: "var(--amber-soft)", color: "#6b3d12", marginTop: 4 }}>Securing your loan</span></div>
                        )}
                      </td>
                      <td className="num"><strong>{money(r.value, s, 0)}</strong></td>
                      <td className={`num ${change >= 0 ? "pos" : "neg"}`}>{Number.isFinite(change) ? pct(change, 1, true) : "—"}</td>
                      <td className="num" style={{ whiteSpace: "nowrap", paddingRight: 18 }}>
                        <Link href={`/vaults/${r.s.info.address}`} className="btn ghost small" style={{ marginRight: 6 }}>Sell</Link>
                        <Link href="/invest" className="btn ghost small">Buy</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(loans.length > 0 || lending.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, paddingBottom: 26 }}>
          {loans.map((l) => {
            const sf = safety(l.user.hf);
            const s = loanSym(l.m.loanToken);
            return (
              <section key={l.m.id} className="panel" style={{ flex: "1 1 340px", display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <h2 className="section-title"><Mark />Your loan</h2>
                  <span className="small muted">{l.m.label}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <div style={{ display: "grid", gap: 2 }}><span className="small muted">Borrowed</span><strong style={{ fontSize: 20 }}>{money(l.user.borrowAssets, s, 0)}</strong></div>
                  <div style={{ display: "grid", gap: 2 }}><span className="small muted">Interest</span><strong style={{ fontSize: 20 }}>{pct(l.borrowApr * 100, 1)}</strong><span className="small" style={{ color: "var(--faint)" }}>a year, variable</span></div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <span className="small muted">Safety</span>
                    <strong style={{ color: sf.color }}>{sf.label}</strong>
                    <span aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
                      {[0, 1, 2].map((i) => <span key={i} style={{ height: 5, borderRadius: 3, background: i <= sf.level ? sf.color : "var(--line-2)" }} />)}
                    </span>
                  </div>
                </div>
                <div><Link href="/borrow" className="btn ghost small"><Mark />Manage loan</Link></div>
              </section>
            );
          })}
          {lending.map((l) => (
            <section key={l.m.id} className="panel" style={{ flex: "1 1 280px", display: "grid", gap: 14 }}>
              <h2 className="section-title"><Mark />Earning</h2>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
                <div style={{ display: "grid", gap: 2 }}>
                  <span className="small muted">Lent · {l.m.label}</span>
                  <strong style={{ fontSize: 20 }}>{money(l.user.supplyAssets, loanSym(l.m.loanToken))}</strong>
                </div>
                <span className="small muted">{pct(l.supplyApr * 100, 1)} a year</span>
              </div>
              <Link href="/lend" className="btn ghost small"><Mark />Withdraw</Link>
            </section>
          ))}
        </div>
      )}

      <section style={{ display: "grid", gap: 12, maxWidth: 460, paddingBottom: 16 }}>
        {deployment.vaults.map((v) => <PendingRequests key={v.address} vault={v.address} />)}
      </section>

      <p className="small" style={{ color: "var(--faint)", paddingBottom: 40 }}>
        Values in {currency}. Positions in other currencies are converted at today&rsquo;s rate. Share prices can fall; currency protection is simulated and figures are illustrative.
      </p>
    </div>
  );
}
