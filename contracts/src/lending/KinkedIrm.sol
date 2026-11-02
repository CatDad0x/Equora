// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IIrm} from "morpho-blue/interfaces/IIrm.sol";
import {MarketParams, Market} from "morpho-blue/interfaces/IMorpho.sol";

/// @title KinkedIrm
/// @notice Simple two-slope interest rate model for Morpho Blue (rates per second, WAD).
///   util <= kink : base + slope1 * util / kink
///   util >  kink : base + slope1 + slope2 * (util - kink) / (1 - kink)
/// Defaults (illustrative): 2% base, 8% at 80% utilisation, 60% at 100%.
contract KinkedIrm is IIrm {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant YEAR = 365 days;

    uint256 public immutable baseRate; // per second
    uint256 public immutable slope1;
    uint256 public immutable slope2;
    uint256 public immutable kink; // WAD

    constructor(uint256 baseApr, uint256 aprAtKink, uint256 aprAtMax, uint256 kink_) {
        require(kink_ > 0 && kink_ < WAD && aprAtKink >= baseApr && aprAtMax >= aprAtKink, "bad params");
        baseRate = baseApr / YEAR;
        slope1 = (aprAtKink - baseApr) / YEAR;
        slope2 = (aprAtMax - aprAtKink) / YEAR;
        kink = kink_;
    }

    function borrowRate(MarketParams memory mp, Market memory m) external view returns (uint256) {
        return borrowRateView(mp, m);
    }

    function borrowRateView(MarketParams memory, Market memory m) public view returns (uint256) {
        uint256 util = m.totalSupplyAssets == 0 ? 0 : uint256(m.totalBorrowAssets) * WAD / m.totalSupplyAssets;
        if (util > WAD) util = WAD;
        if (util <= kink) return baseRate + slope1 * util / kink;
        return baseRate + slope1 + slope2 * (util - kink) / (WAD - kink);
    }

    /// @notice Annualised borrow rate (WAD) at a given utilisation, for frontends.
    function aprAt(uint256 util) external view returns (uint256) {
        Market memory m;
        m.totalSupplyAssets = uint128(WAD);
        m.totalBorrowAssets = uint128(util > WAD ? WAD : util);
        MarketParams memory mp;
        return borrowRateView(mp, m) * YEAR;
    }
}
