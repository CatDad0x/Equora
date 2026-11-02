"use client";

import Link from "next/link";
import { useCurrency } from "@/lib/currency";
import { useMemoVaults, useVaultStats, type VaultStats } from "@/lib/hooks";
import { money } from "@/lib/format";

export default function Vaults() {
  const { currency, meta } = useCurrency();
  const vaults = useMemoVaults(currency);
  const { stats } = useVaultStats(vaults);
  const find = (strategy: string, hedged: boolean) =>
    stats.find((s) => s.info.strategy === strategy && s.info.hedged === hedged);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Invest in {currency}</h1>
        <p className="lede">
          Two strategies, each offered unhedged or hedged against the US dollar. All four are valued in {currency} and
          accept {meta.stables.join(", ")}.
        </p>
      </div>

      <div className="matrix" role="table" aria-label={`${currency} vaults`}>
        <div role="row" className="matrix-head">
          <span role="columnheader" />
          <span role="columnheader">
            <strong>Unhedged</strong>
            <span className="small muted">Your currency&rsquo;s moves flow through</span>
          </span>
          <span role="columnheader">
            <strong>Hedged</strong>
            <span className="small muted">Moves against the US dollar are offset</span>
          </span>
        </div>
        {[
          { key: "index", title: "S&P 500", desc: "The 500 largest US companies in one holding." },
          { key: "basket", title: "US Tech", desc: "Apple, Microsoft, NVIDIA, Amazon and Alphabet, 20% each." },
        ].map((row) => (
          <div role="row" className="matrix-row" key={row.key}>
            <div role="rowheader" className="matrix-rowhead">
              <h3>{row.title}</h3>
              <p className="small muted">{row.desc}</p>
            </div>
            <Cell s={find(row.key, false)} symbol={meta.symbol} />
            <Cell s={find(row.key, true)} symbol={meta.symbol} />
          </div>
        ))}
      </div>

      <p className="hint">
        Share prices start at {meta.symbol}1.00 when each vault launches. Fees: 0.50% a year, plus the trading spread
        you pay when you enter and exit.
      </p>

      <style>{`
        .matrix { display: grid; border: 1px solid var(--line); border-radius: var(--radius-m); overflow: hidden; }
        .matrix-head, .matrix-row { display: grid; grid-template-columns: minmax(160px, 0.8fr) 1fr 1fr; }
        .matrix-head > span { padding: 14px 18px; display: grid; gap: 2px; border-bottom: 1px solid var(--line); }
        .matrix-head > span:nth-child(3) { background: var(--ink); color: var(--paper); }
        .matrix-head > span:nth-child(3) .muted { color: color-mix(in srgb, var(--paper) 70%, transparent); }
        .matrix-head > span:nth-child(2) { background: var(--gold-soft); }
        .matrix-row + .matrix-row { border-top: 1px solid var(--line); }
        .matrix-rowhead { padding: 18px; display: grid; gap: 4px; align-content: start; background: var(--paper-2); }
        .vcell { padding: 18px; display: grid; gap: 10px; text-decoration: none; border-left: 1px solid var(--line); }
        .vcell:hover { background: var(--paper-2); }
        .vcell-price { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em; }
        .mobile-only { display: none; }
        @media (max-width: 720px) {
          .mobile-only { display: inline-block; }
          .matrix-head { display: none; }
          .matrix-row { grid-template-columns: 1fr; }
          .vcell { border-left: 0; border-top: 1px solid var(--line); }
        }
      `}</style>
    </div>
  );
}

function Cell({ s, symbol }: { s?: VaultStats; symbol: string }) {
  if (!s) return <div className="vcell muted">Loading</div>;
  return (
    <Link href={`/vaults/${s.info.address}`} className="vcell">
      <div className="row spread">
        <span className="small muted">{s.info.symbol}</span>
        {s.info.hedged ? <span className="tag mobile-only">Hedged</span> : <span className="tag gold mobile-only">Unhedged</span>}
      </div>
      <div>
        <div className="vcell-price">{money(s.navPerShare, symbol, 4)}</div>
        <div className="small muted">per share</div>
      </div>
      <div className="row spread small">
        <span>Vault size {money(s.nav, symbol, 0)}</span>
        {s.userShares > 0n && <span className="tag green">You hold {money(s.userValue, symbol, 0)}</span>}
      </div>
    </Link>
  );
}
