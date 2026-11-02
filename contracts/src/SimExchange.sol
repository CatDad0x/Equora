// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IOracleHub} from "./interfaces/IOracleHub.sol";
import {IMintableToken} from "./interfaces/IMintableToken.sol";

/// @title SimExchange
/// @notice Oracle-priced execution venue standing in for real market makers on testnet.
/// Burns the input token from the caller and mints the output token at oracle price ± spread.
/// Equity trades revert while the US market is closed.
contract SimExchange is AccessControl {
    uint256 public constant BPS = 10_000;

    IOracleHub public immutable oracle;

    uint256 public spreadBps = 10; // 0.10% each way on equity trades
    uint256 public pegFeeBps = 0; // stable <-> stable within a currency group

    mapping(address => bytes32) public currencyOf; // local stable => "AUD" | "EUR" | "INR"
    mapping(address => bool) public isEquity;

    event EquityBought(address indexed trader, address localToken, address equity, uint256 localIn, uint256 equityOut);
    event EquitySold(address indexed trader, address equity, address localToken, uint256 equityIn, uint256 localOut);
    event StableSwapped(address indexed trader, address from, address to, uint256 amountIn, uint256 amountOut);

    error MarketClosed();
    error UnknownToken(address token);
    error CurrencyMismatch();
    error Slippage(uint256 out, uint256 minOut);

    constructor(IOracleHub oracle_, address admin) {
        oracle = oracle_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ------------------------------------------------------------------ admin

    function registerStable(address token, bytes32 currency) external onlyRole(DEFAULT_ADMIN_ROLE) {
        currencyOf[token] = currency;
    }

    function registerEquity(address token, bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isEquity[token] = enabled;
    }

    function setSpreadBps(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps <= 500, "spread too high");
        spreadBps = bps;
    }

    function setPegFeeBps(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps <= 100, "fee too high");
        pegFeeBps = bps;
    }

    // ------------------------------------------------------------------ quotes

    /// @notice Equity received for `localIn` of a local stable.
    function quoteBuy(address localToken, address equity, uint256 localIn) public view returns (uint256) {
        uint256 usd = localToUsd(localToken, localIn);
        (uint256 px,) = oracle.equityPriceUsd(equity);
        uint256 askPx = px * (BPS + spreadBps) / BPS;
        return usd * 1e18 / askPx; // equities are 18 dp
    }

    /// @notice Local stable received for selling `equityIn`.
    function quoteSell(address equity, address localToken, uint256 equityIn) public view returns (uint256) {
        (uint256 px,) = oracle.equityPriceUsd(equity);
        uint256 bidPx = px * (BPS - spreadBps) / BPS;
        uint256 usd = equityIn * bidPx / 1e18;
        return usdToLocal(localToken, usd);
    }

    /// @notice USD value (18 dp) of a local stable amount.
    function localToUsd(address localToken, uint256 amount) public view returns (uint256) {
        bytes32 ccy = _currency(localToken);
        (uint256 rate,) = oracle.usdPerLocal(ccy);
        return _to18(localToken, amount) * rate / 1e18;
    }

    /// @notice Local stable amount (token decimals) worth `usd` (18 dp).
    function usdToLocal(address localToken, uint256 usd) public view returns (uint256) {
        bytes32 ccy = _currency(localToken);
        (uint256 rate,) = oracle.usdPerLocal(ccy);
        return _from18(localToken, usd * 1e18 / rate);
    }

    // ------------------------------------------------------------------ trades

    function buyEquity(address localToken, address equity, uint256 localIn, uint256 minOut, address recipient)
        external
        returns (uint256 out)
    {
        if (!oracle.isMarketOpen()) revert MarketClosed();
        if (!isEquity[equity]) revert UnknownToken(equity);
        out = quoteBuy(localToken, equity, localIn);
        if (out < minOut) revert Slippage(out, minOut);
        IMintableToken(localToken).burn(msg.sender, localIn);
        IMintableToken(equity).mint(recipient, out);
        emit EquityBought(msg.sender, localToken, equity, localIn, out);
    }

    function sellEquity(address equity, address localToken, uint256 equityIn, uint256 minOut, address recipient)
        external
        returns (uint256 out)
    {
        if (!oracle.isMarketOpen()) revert MarketClosed();
        if (!isEquity[equity]) revert UnknownToken(equity);
        out = quoteSell(equity, localToken, equityIn);
        if (out < minOut) revert Slippage(out, minOut);
        IMintableToken(equity).burn(msg.sender, equityIn);
        IMintableToken(localToken).mint(recipient, out);
        emit EquitySold(msg.sender, equity, localToken, equityIn, out);
    }

    /// @notice Swap between stables of the same currency (e.g. mAUDM -> mAUDD) at par minus pegFeeBps.
    function swapStable(address from, address to, uint256 amountIn, address recipient) external returns (uint256 out) {
        if (_currency(from) != _currency(to)) revert CurrencyMismatch();
        out = _from18(to, _to18(from, amountIn)) * (BPS - pegFeeBps) / BPS;
        IMintableToken(from).burn(msg.sender, amountIn);
        IMintableToken(to).mint(recipient, out);
        emit StableSwapped(msg.sender, from, to, amountIn, out);
    }

    // ------------------------------------------------------------------ internal

    function _currency(address token) internal view returns (bytes32 c) {
        c = currencyOf[token];
        if (c == bytes32(0)) revert UnknownToken(token);
    }

    function _to18(address token, uint256 amount) internal view returns (uint256) {
        return amount * 10 ** (18 - IMintableToken(token).decimals());
    }

    function _from18(address token, uint256 amount) internal view returns (uint256) {
        return amount / 10 ** (18 - IMintableToken(token).decimals());
    }
}
