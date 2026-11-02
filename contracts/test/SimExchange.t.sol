// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {OracleHub} from "../src/OracleHub.sol";
import {SimExchange} from "../src/SimExchange.sol";

contract SimExchangeTest is BaseTest {
    function test_buyAtAskWithSpread() public {
        // 6,500 AUD = 4,225 USD; ask = 600 * 1.001 = 600.6 -> 7.0346... SPY
        vm.prank(alice);
        uint256 out = exchange.buyEquity(address(audd), address(spy), 6_500e6, 0, alice);
        assertEq(out, uint256(4_225e18) * 1e18 / 600.6e18);
        assertEq(spy.balanceOf(alice), out);
        assertEq(audd.balanceOf(alice), 1_000_000e6 - 6_500e6);
    }

    function test_roundTripLosesTwoSpreads() public {
        vm.startPrank(alice);
        uint256 q = exchange.buyEquity(address(audd), address(spy), 10_000e6, 0, alice);
        uint256 back = exchange.sellEquity(address(spy), address(audd), q, 0, alice);
        vm.stopPrank();
        // ~20 bps round trip
        assertApproxEqRel(back, 10_000e6 * (10_000 - 20) / 10_000, 0.0001e18);
    }

    function test_closedMarketReverts() public {
        oracle.setMarketMode(OracleHub.MarketMode.FORCE_CLOSED);
        vm.prank(alice);
        vm.expectRevert(SimExchange.MarketClosed.selector);
        exchange.buyEquity(address(audd), address(spy), 1e6, 0, alice);
    }

    function test_slippageGuard() public {
        vm.prank(alice);
        vm.expectRevert();
        exchange.buyEquity(address(audd), address(spy), 1_000e6, 100e18, alice);
    }

    function test_swapStableAtPar() public {
        audm.grantRole(audm.MINTER_ROLE(), admin);
        audm.mint(alice, 500e6);
        vm.prank(alice);
        uint256 out = exchange.swapStable(address(audm), address(audd), 500e6, alice);
        assertEq(out, 500e6);
        assertEq(audm.balanceOf(alice), 0);
    }

    function test_swapStableCurrencyMismatch() public {
        vm.prank(alice);
        vm.expectRevert(SimExchange.CurrencyMismatch.selector);
        exchange.swapStable(address(audd), address(eurc), 1e6, alice);
    }

    function test_cannotBurnOthersFunds() public {
        // trader can only spend their own balance
        vm.prank(bob);
        exchange.buyEquity(address(audd), address(spy), 1e6, 0, bob);
        assertEq(audd.balanceOf(alice), 1_000_000e6);
    }

    function test_usdLocalConversionsINR() public view {
        // 8,400 INR = 100 USD
        assertApproxEqRel(exchange.localToUsd(address(inr), 8_400e6), 100e18, 1e9); // inverted-feed rounding
        assertApproxEqAbs(exchange.usdToLocal(address(inr), 100e18), 8_400e6, 1);
    }
}
