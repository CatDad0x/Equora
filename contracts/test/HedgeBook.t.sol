// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseTest} from "./Base.t.sol";
import {HedgeBook} from "../src/HedgeBook.sol";
import {IMintableToken} from "../src/interfaces/IMintableToken.sol";

contract HedgeBookTest is BaseTest {
    address fakeVault = makeAddr("fakeVault");

    function setUp() public override {
        super.setUp();
        hedgeBook.grantRole(hedgeBook.REGISTRAR_ROLE(), admin);
        hedgeBook.registerVault(fakeVault, AUD, IMintableToken(address(audd)));
        audd.mint(fakeVault, 1_000_000e6);
    }

    function test_mtmZeroAtEntry() public {
        vm.prank(fakeVault);
        hedgeBook.adjust(65_000e18); // short US$65k
        assertEq(hedgeBook.mtmLocal18(fakeVault), 0);
    }

    function test_audStrengthensHedgeGains() public {
        vm.prank(fakeVault);
        hedgeBook.adjust(65_000e18); // = A$100,000 at 0.65
        _move(ID_AUD, 1_000); // AUD +10% -> 0.715
        // N*(1/K - 1/S) = 100,000 - 90,909.09
        assertApproxEqAbs(hedgeBook.mtmLocal18(fakeVault), 9_090.909090909e18, 1e9);
    }

    function test_audWeakensHedgeLoses() public {
        vm.prank(fakeVault);
        hedgeBook.adjust(65_000e18);
        _move(ID_AUD, -1_000); // 0.585
        assertApproxEqAbs(hedgeBook.mtmLocal18(fakeVault), -11_111.111111111e18, 1e9);
    }

    /// Fuzz: MTM matches the closed form N*(1/K - 1/S).
    function testFuzz_mtmClosedForm(uint96 notional, int16 moveBps) public {
        uint256 n = bound(uint256(notional), 1e18, 1e30);
        int256 m = bound(int256(moveBps), -5_000, 5_000);
        vm.prank(fakeVault);
        hedgeBook.adjust(n);
        _move(ID_AUD, m);
        (uint256 s,) = oracle.usdPerLocal(AUD);
        int256 expected = int256(n * 1e18 / 0.65e18) - int256(n * 1e18 / s);
        assertApproxEqAbs(hedgeBook.mtmLocal18(fakeVault), expected, 2);
    }

    function test_adjustRealisesGainIntoCash() public {
        vm.prank(fakeVault);
        hedgeBook.adjust(65_000e18);
        _move(ID_AUD, 1_000);
        uint256 before = audd.balanceOf(fakeVault);
        vm.prank(fakeVault);
        int256 realised = hedgeBook.adjust(65_000e18);
        assertGt(realised, 0);
        assertEq(audd.balanceOf(fakeVault), before + uint256(realised));
        assertEq(hedgeBook.mtmLocal18(fakeVault), 0); // re-struck at spot
    }

    function test_adjustBurnsLoss() public {
        vm.prank(fakeVault);
        hedgeBook.adjust(65_000e18);
        _move(ID_AUD, -1_000);
        uint256 before = audd.balanceOf(fakeVault);
        vm.prank(fakeVault);
        int256 realised = hedgeBook.adjust(0);
        assertLt(realised, 0);
        assertEq(audd.balanceOf(fakeVault), before - uint256(-realised));
        assertEq(hedgeBook.notionalOf(fakeVault), 0);
    }

    function test_carryCostAccrues() public {
        hedgeBook.setCarry(AUD, 100); // 1% p.a. cost
        vm.prank(fakeVault);
        hedgeBook.adjust(65_000e18); // A$100k
        vm.warp(block.timestamp + 365 days);
        _setDefaultPrices();
        assertApproxEqAbs(hedgeBook.mtmLocal18(fakeVault), -1_000e18, 1e9);
    }

    function test_onlyRegisteredVault() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(HedgeBook.NotRegistered.selector, alice));
        hedgeBook.adjust(1e18);
    }
}
