# Equora — notes for Claude Code

Equora is a **testnet demo** protocol on Base Sepolia. Users deposit local-currency stablecoins (AUD, EUR, INR) into ERC-4626 vaults that hold tokenized US equities, optionally FX-hedged, and can borrow against positions via Morpho Blue. All assets are mock tokens. The goal is a working demo for the AUDD / AUDM teams, not a production protocol.

**Read `SPEC.md` first.** It is the source of truth (v0.2, revised after an external review). §13 lists what changed.

## Status
- **Phase 1 (core contracts): done.** See `contracts/`, with 66 tests (unit + fuzz) and ~91% line coverage.
- **Next: Phase 2.** Vault hardening (tracked internal balances), Morpho oracle adapters, Morpho deployment/config script, IRM, `EquoraRouter` (with `minShares`/`minAssets` and an interface-level borrow gate), and an end-to-end deposit → borrow → shock → liquidate test.

## Commands (from `contracts/`)
```bash
forge build
forge test                       # full suite
FOUNDRY_FUZZ_RUNS=2000 forge test
forge coverage --ir-minimum --report summary
forge fmt
```
`via_ir = true` is required (stack depth in the vault).

## Contracts
| File | Role |
|---|---|
| `src/tokens/MockToken.sol` | Mock stables (6 dp) and equities (18 dp). `MINTER_ROLE` can mint and burn. |
| `src/OracleHub.sol` | Pyth reads, 18 dp normalisation, inverted FX, confidence check, overrides/shocks, market-hours modes, `priceStatus`. |
| `src/SimExchange.sol` | Oracle-priced venue (burns input, mints output) with a spread. Equity trades revert when the market is closed. |
| `src/HedgeBook.sol` | Spot-based hedge simulation: short USD / long local, with carry. |
| `src/EquoraVault.sol` | ERC-4626 vault: NAV, entry/exit costs, async queue, rebalance, hedge sync, dilution fees. |
| `src/VaultFactory.sol` | EIP-1167 clones of the vault; registers each with the HedgeBook. |
| `src/Faucet.sol` | One-click mock token bundle with a cooldown. |

## Design rules (do not regress)
- **Price convention:** FX = USD per 1 local (18 dp). Equity = USD per token (18 dp).
- **Hedge rule:** every `HedgeBook.adjust` settles the *full* MTM into cash, then reopens at the new notional and spot strike. P&L is never erased. A roll keeps the vault hedged.
- **Hedge losses:** the vault sells equities (`_ensureCash`) before a loss is burned. Never rely on the cash buffer alone.
- **Costs:** entry cost = spread × invested fraction; exit cost = spread × equityValue/NAV. Transacting users pay their own costs. Previews must match execution exactly (tests enforce this).
- **Fees:** dilution only. Pending fee shares are included in pricing via `_effectiveSupply()`. Never add a fee deduction to `totalAssets`.
- **Queue:** pending deposits are excluded from NAV and `cash()`. Requests are all-or-nothing with owner cancellation and `min*` limits; a missed limit means a refund. This is not ERC-7540 compliant, so don't claim it.
- **Fail-closed:** stale prices while the market is open make valuation revert, which disables vault operations. Don't paper over this with try/catch in the contracts.
- **Market-hours borrow limits are interface-level only.** Always disclose that in the UI.
- `mint` and `withdraw` are intentionally unsupported on the vault.

## Open decisions
- **mAUDC:** AUDC is the AUDD issuer's company name. Drop the token, or keep it as a clearly fictional coin? Ask Akash before Phase 3.
- Pyth feed IDs on Base Sepolia, and whether Morpho Blue is already deployed there (SPEC §12).

## Local toolchain notes
The cloud workspace used a pinned local solc (`FOUNDRY_SOLC`). On a normal machine, `solc_version = "0.8.26"` in `foundry.toml` auto-installs. Library sources are vendored in `contracts/lib/` (OpenZeppelin v5.1.0, forge-std). You can convert them to git submodules if preferred.
