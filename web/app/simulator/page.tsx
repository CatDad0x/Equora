"use client";

import { Simulator } from "@/components/Simulator";

export default function SimulatorPage() {
  return (
    <div className="page">
      <div className="page-head">
        <h1>Simulator</h1>
        <p className="lede">
          See how share prices and your currency combine. &ldquo;Hedge kept in line&rdquo; resizes the hedge as your
          shares grow, the way the vault&rsquo;s keeper does. &ldquo;Hedge set once&rdquo; leaves it at the starting size.
        </p>
      </div>
      <Simulator />
      <div className="panel quiet stack small" style={{ maxWidth: "80ch" }}>
        <h3>Reading the result</h3>
        <p>
          The currency move shows what happens to the local value of your US shares. In the hedged column, the hedge
          result offsets it. If your currency weakens, the unhedged investor gains and the hedged investor gives that
          gain up: hedging reduces surprises in both directions.
        </p>
        <p>
          Hedging is not free. Its cost or benefit depends on the interest-rate gap between your currency and the US
          dollar. The figures here are illustrative, not market quotes.
        </p>
      </div>
    </div>
  );
}
