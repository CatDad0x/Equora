// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IOracleHub} from "./interfaces/IOracleHub.sol";
import {IMintableToken} from "./interfaces/IMintableToken.sol";

/// @title HedgeBook
/// @notice Simulated FX forward book. Each hedged vault holds one position: SHORT USD / LONG local.
///
///   mtmLocal = N * (1/K - 1/S_t) - carry
///
/// where N = USD notional, K = strike (USD per local at entry), S_t = current USD per local.
/// When the local currency strengthens (S rises) the hedge gains, offsetting the fall in the
/// local value of USD-priced equities.
///
/// Carry models the interest-rate differential embedded in forward points: positive
/// `carryBpsPerYear` is a cost to the hedger, negative is a benefit.
///
/// Every `adjust` realises the full MTM into the vault's cash (mint on gain, burn on loss) and
/// re-strikes the whole position at spot. This is economically equivalent to a rolling forward
/// and keeps accounting simple. In production this book would be an institutional FX counterparty.
contract HedgeBook is AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    uint256 public constant BPS = 10_000;
    uint256 public constant YEAR = 365 days;

    struct Position {
        bytes32 currency;
        IMintableToken asset; // local stable the vault accounts in
        uint256 notionalUsd; // 18 dp
        uint256 strike; // USD per local, 18 dp
        uint64 lastAccrual;
        bool registered;
    }

    IOracleHub public immutable oracle;

    mapping(address => Position) public positions;
    mapping(bytes32 => int256) public carryBpsPerYear; // per currency

    event VaultRegistered(address indexed vault, bytes32 currency, address asset);
    event HedgeAdjusted(
        address indexed vault, uint256 oldNotional, uint256 newNotional, uint256 strike, int256 realisedLocal
    );
    event CarrySet(bytes32 indexed currency, int256 bpsPerYear);

    error NotRegistered(address vault);

    constructor(IOracleHub oracle_, address admin) {
        oracle = oracle_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ------------------------------------------------------------------ admin

    function registerVault(address vault, bytes32 currency, IMintableToken asset) external onlyRole(REGISTRAR_ROLE) {
        Position storage p = positions[vault];
        p.currency = currency;
        p.asset = asset;
        p.registered = true;
        p.lastAccrual = uint64(block.timestamp);
        emit VaultRegistered(vault, currency, address(asset));
    }

    function setCarry(bytes32 currency, int256 bpsPerYear) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bpsPerYear > -2_000 && bpsPerYear < 2_000, "carry out of range");
        carryBpsPerYear[currency] = bpsPerYear;
        emit CarrySet(currency, bpsPerYear);
    }

    // ------------------------------------------------------------------ views

    /// @notice Signed mark-to-market in local currency, 18 dp.
    function mtmLocal18(address vault) public view returns (int256) {
        Position memory p = positions[vault];
        if (p.notionalUsd == 0) return 0;
        (uint256 s,) = oracle.usdPerLocal(p.currency);
        int256 atStrike = int256(p.notionalUsd * 1e18 / p.strike);
        int256 atSpot = int256(p.notionalUsd * 1e18 / s);
        return atStrike - atSpot - _pendingCarry(p);
    }

    /// @notice Signed mark-to-market in the vault's asset units (token decimals).
    function mtmAssets(address vault) external view returns (int256) {
        int256 m = mtmLocal18(vault);
        uint256 scale = 10 ** (18 - positions[vault].asset.decimals());
        return m / int256(scale);
    }

    function notionalOf(address vault) external view returns (uint256) {
        return positions[vault].notionalUsd;
    }

    // ------------------------------------------------------------------ vault actions

    /// @notice Realise all P&L into the vault's cash and re-strike at spot for `newNotionalUsd`.
    /// Losses are burned from the vault, which must hold enough local stable.
    function adjust(uint256 newNotionalUsd) external returns (int256 realised) {
        Position storage p = positions[msg.sender];
        if (!p.registered) revert NotRegistered(msg.sender);

        int256 pnl18 = mtmLocal18(msg.sender);
        uint256 scale = 10 ** (18 - p.asset.decimals());
        realised = pnl18 / int256(scale);
        if (realised > 0) p.asset.mint(msg.sender, uint256(realised));
        else if (realised < 0) p.asset.burn(msg.sender, uint256(-realised));

        (uint256 s,) = oracle.usdPerLocal(p.currency);
        uint256 old = p.notionalUsd;
        p.notionalUsd = newNotionalUsd;
        p.strike = s;
        p.lastAccrual = uint64(block.timestamp);

        emit HedgeAdjusted(msg.sender, old, newNotionalUsd, s, realised);
    }

    // ------------------------------------------------------------------ internal

    function _pendingCarry(Position memory p) internal view returns (int256) {
        int256 bps = carryBpsPerYear[p.currency];
        if (bps == 0 || p.notionalUsd == 0) return 0;
        int256 localNotional = int256(p.notionalUsd * 1e18 / p.strike);
        int256 dt = int256(block.timestamp - p.lastAccrual);
        return localNotional * bps * dt / int256(BPS * YEAR);
    }
}
