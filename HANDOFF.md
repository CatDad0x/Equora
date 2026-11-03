# Handoff from the claude.ai chat (3 Nov 2026)

This summarises the planning conversation that produced this repo, so work can continue in Claude Code. Read it together with `CLAUDE.md`, `SPEC.md` and `README.md`.

## Who and why
- Owner: Akash (Brisbane). Prefers direct answers and working solutions over long technical explanations. Not a full-time Solidity dev, so explain steps plainly and do the work.
- Goal: a working **testnet demo** (not a deck) to show the **AUDD and AUDM** stablecoin teams. The pitch is "let's build this together". The demo must be usable by non-crypto people.
- Product: deposit a local-currency stablecoin (AUD, EUR, INR; deliberately no USD), invest in US equities (S&P 500 or a 5-stock US tech basket), hedged or unhedged against USD, and borrow against the position.

## Decisions made (with the reasons)
- **Name: Equora.** Checked: no finance/crypto conflicts, only a Saudi horse-riding app. "Parallel Markets" was rejected because Parallel Markets, Parallel Protocol and Parallel Finance already exist. Tagline idea: "equity exposure and liquidity, side by side".
- **Testnet only (Base Sepolia).** A live product with real money would be a managed investment scheme and lending would need an AFSL in Australia, so going live waits for a licensed partner.
- **Chain: Base.** Akash chose it.
- **12 vaults** = 3 currencies × (index, basket) × (hedged, unhedged), from one factory.
- **AUD deposit tokens:** mAUDD, mAUDM, mAUDC all feed the AUD vaults (converted at par to mAUDD).
- **Lending: Morpho Blue** (unmodified, self-deployed because there is no Base Sepolia deployment).
- **Prices:** keeper-simulated by default (DemoPyth), because Brisbane business hours = US night and Pyth Core now requires an API key. Real Pyth is a deploy-time option.
- **Access:** email login (Privy, optional) plus wallet connect, plus sponsored gas through the `/api/onboard` relayer.
- **Hedging is honest about its limits:** it is a simulation marked against live FX; in production it would be an institutional FX forward. The UI says so.

## External spec review (all addressed, see SPEC.md §13)
A reviewer flagged 10 issues: hedge P&L could be erased on adjust, a 3% cash buffer can't fund hedge losses, deposit/redeem costs were socialised, fees were double counted, the market-hours gate is bypassable, the 77% LLTV needed a different explanation, vault-share liquidations needed their own exit path, the oracle manipulation claims were too strong, the queue was underspecified, plus assorted inconsistencies. Every point is fixed in code or disclosed in the spec and UI.

## Pitch notes from the chat
- Lead the demo with the **hedged vault and simulator**, not lending. Lending is the "and then you can borrow against it" moment.
- The differentiator vs an ASX-listed hedged S&P ETF (e.g. IHVV): onchain, 24/7, settles in local stablecoin, and **vault shares work as loan collateral**.
- Be upfront that market-hours borrowing limits and opening-LTV caps are app-level only, and that all LTVs, rates and carry are illustrative.
- The 5-minute demo script is in SPEC.md §11.

## Where things stand
- Built and tested locally: contracts (83 tests), lending, deploy script, keeper (liquidates about 7 seconds after a shock), and the full web app (browser-tested end to end, including the closed-market queue).
- **Next:** deploy to Base Sepolia (README "Launch on Base Sepolia"), host the keeper (Railway/Render) and web app (Vercel), then rehearse the demo.
- **Open decision:** mAUDC shares a name with AUDC (the AUDD issuer). Ask Akash whether to rename or remove it before presenting to AUDD.

## Rules for working with Akash's keys
Never ask him to paste a private key into chat. Keys go in `contracts/.env`, `keeper/.env` and Vercel env vars, all gitignored. Stop and ask before any step that spends testnet funds or deploys.
