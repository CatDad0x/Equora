// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPyth} from "../../src/interfaces/IPyth.sol";

/// @notice Test double for Pyth. Prices are set directly; staleness is enforced like the real contract.
contract MockPyth is IPyth {
    mapping(bytes32 => Price) internal _prices;
    uint256 public fee = 1;

    error StalePrice();
    error PriceFeedNotFound();

    function setPrice(bytes32 id, int64 price, int32 expo, uint256 publishTime) public {
        _prices[id] = Price(price, 0, expo, publishTime);
    }

    function setPriceWithConf(bytes32 id, int64 price, uint64 conf, int32 expo, uint256 publishTime) public {
        _prices[id] = Price(price, conf, expo, publishTime);
    }

    function getPriceUnsafe(bytes32 id) public view returns (Price memory p) {
        p = _prices[id];
        if (p.publishTime == 0) revert PriceFeedNotFound();
    }

    function getPriceNoOlderThan(bytes32 id, uint256 age) external view returns (Price memory p) {
        p = getPriceUnsafe(id);
        if (block.timestamp > p.publishTime + age) revert StalePrice();
    }

    function getUpdateFee(bytes[] calldata data) external view returns (uint256) {
        return fee * data.length;
    }

    function updatePriceFeeds(bytes[] calldata data) external payable {
        require(msg.value >= fee * data.length, "fee");
    }
}
