// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IOracleHub {
    /// @return price USD per equity token, 18 decimals
    function equityPriceUsd(address token) external view returns (uint256 price, uint256 updatedAt);

    /// @return rate USD per 1 unit of local currency, 18 decimals
    function usdPerLocal(bytes32 currency) external view returns (uint256 rate, uint256 updatedAt);

    function isMarketOpen() external view returns (bool);
}
