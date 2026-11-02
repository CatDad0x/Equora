# Equora

**Local-currency access to US equities, with optional FX hedging and borrowing against your position.**

> ⚠️ Testnet demo · mock assets · not a live financial product · not affiliated with or endorsed by any stablecoin issuer.

Deposit AUD, EUR or INR stablecoins. Invest in an S&P 500 index or a US tech basket, hedged or unhedged against USD. See everything valued in your own currency. Borrow against your position.

## Repository
```
equora/
├─ SPEC.md        build spec (v0.2): architecture, contracts, flows, phases
├─ CLAUDE.md      working notes for Claude Code
└─ contracts/     Foundry project (Phase 1: core contracts + tests)
```
Planned per SPEC §9: `keeper/`, `indexer/`, `web/`, `packages/shared/`.

## Quick start
```bash
# requires Foundry: https://getfoundry.sh
cd contracts
forge build
forge test
```

## What the tests demonstrate
- AUD +10% with flat equities: the **hedged** vault holds its value (within 0.5%), while the **unhedged** equity sleeve loses about 9.09%.
- A static hedge vs a rebalanced hedge when equities and AUD both rise.
- Deposit/redeem round trips cost only the execution spread, and existing holders are never diluted by other users' trades.
- A hedge loss far larger than the cash buffer (AUD −30%) is funded by selling equities, so redemptions still work.
- Market-closed queue: escrow excluded from NAV, cancellation, slippage limits with refunds, settlement at the next open.
- Fuzzing: the NAV identity, FX neutrality of the hedge, no free round trips, and every holder can exit after arbitrary moves.

## Status
| Phase | | |
|---|---|---|
| 1 | Core contracts | ✅ done (66 tests, ~91% line coverage) |
| 2 | Lending integration (Morpho, adapters, router) | next |
| 3 | Deploy and seed on Base Sepolia | |
| 4 | Keeper and indexer | |
| 5 | Frontend | |
| 6 | Demo polish | |
