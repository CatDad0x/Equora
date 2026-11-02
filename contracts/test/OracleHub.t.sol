// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {OracleHub} from "../src/OracleHub.sol";
import {MockPyth} from "./mocks/MockPyth.sol";

contract OracleHubTest is BaseTest {
    function test_equityPriceScaledTo18() public view {
        (uint256 p,) = oracle.equityPriceUsd(address(spy));
        assertEq(p, 600e18);
    }

    function test_fxDirectFeed() public view {
        (uint256 r,) = oracle.usdPerLocal(AUD);
        assertEq(r, 0.65e18);
    }

    function test_fxInvertedFeed() public view {
        (uint256 r,) = oracle.usdPerLocal(INR);
        assertEq(r, uint256(1e36) / 84e18); // USD per 1 INR
    }

    function test_overrideWinsAndExpires() public {
        oracle.setOverride(AUD, 0.7e18, uint64(block.timestamp + 1 hours));
        (uint256 r,) = oracle.usdPerLocal(AUD);
        assertEq(r, 0.7e18);

        vm.warp(block.timestamp + 1 hours);
        _setDefaultPrices(); // keep live feed fresh
        (r,) = oracle.usdPerLocal(AUD);
        assertEq(r, 0.65e18);
    }

    function test_shock() public {
        oracle.shock(oracle.equityKey(address(spy)), -2_000, 1 hours);
        (uint256 p,) = oracle.equityPriceUsd(address(spy));
        assertEq(p, 480e18);
        oracle.clearOverride(oracle.equityKey(address(spy)));
        (p,) = oracle.equityPriceUsd(address(spy));
        assertEq(p, 600e18);
    }

    function test_staleRevertsWhenOpen() public {
        vm.warp(block.timestamp + 16 minutes);
        vm.expectRevert(MockPyth.StalePrice.selector);
        oracle.equityPriceUsd(address(spy));
    }

    function test_staleAllowedWhenClosed() public {
        oracle.setMarketMode(OracleHub.MarketMode.FORCE_CLOSED);
        vm.warp(block.timestamp + 3 days);
        (uint256 p, uint256 t) = oracle.equityPriceUsd(address(spy));
        assertEq(p, 600e18);
        assertLt(t, block.timestamp);
    }

    function test_wideConfidenceRejected() public {
        pyth.setPriceWithConf(ID_SPY, 600e5, 13e5, -5, block.timestamp); // conf 2.17% > 2%
        vm.expectRevert(abi.encodeWithSelector(OracleHub.WideConfidence.selector, oracle.equityKey(address(spy))));
        oracle.equityPriceUsd(address(spy));
        pyth.setPriceWithConf(ID_SPY, 600e5, 6e5, -5, block.timestamp); // 1% ok
        (uint256 p,) = oracle.equityPriceUsd(address(spy));
        assertEq(p, 600e18);
    }

    function test_priceStatusFlags() public {
        (uint256 p,, bool open, bool overridden) = oracle.priceStatus(AUD);
        assertEq(p, 0.65e18);
        assertTrue(open);
        assertFalse(overridden);
        oracle.shock(AUD, 500, 1 hours);
        oracle.setMarketMode(OracleHub.MarketMode.FORCE_CLOSED);
        (p,, open, overridden) = oracle.priceStatus(AUD);
        assertEq(p, 0.6825e18);
        assertFalse(open);
        assertTrue(overridden);
    }

    function test_unknownFeedReverts() public {
        vm.expectRevert(abi.encodeWithSelector(OracleHub.UnknownFeed.selector, bytes32("JPY")));
        oracle.usdPerLocal("JPY");
    }

    function test_onlyAdminCanOverride() public {
        vm.prank(alice);
        vm.expectRevert();
        oracle.setOverride(AUD, 1e18, uint64(block.timestamp + 1));
    }

    function test_autoSchedule() public {
        oracle.setMarketMode(OracleHub.MarketMode.AUTO);
        // Monday 2026-11-02 15:00 UTC = 10:00 ET (EST, UTC-5) -> open
        vm.warp(1_793_632_800);
        assertTrue(oracle.isMarketOpen());
        // same day 21:30 UTC = 16:30 ET -> closed
        vm.warp(1_793_655_000);
        assertFalse(oracle.isMarketOpen());
        // Saturday 2026-11-07 15:00 UTC -> closed
        vm.warp(1_794_064_800);
        assertFalse(oracle.isMarketOpen());
        // holiday on the Monday
        vm.warp(1_793_632_800);
        uint256 etDay = uint256(int256(block.timestamp) - 5 hours) / 1 days;
        oracle.setHoliday(etDay, true);
        assertFalse(oracle.isMarketOpen());
    }

    function test_updatePricesRefundsExcess() public {
        bytes[] memory data = new bytes[](2);
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        oracle.updatePrices{value: 1 ether}(data);
        assertEq(alice.balance, 1 ether - 2);
    }
}
