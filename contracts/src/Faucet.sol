// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IMintableToken} from "./interfaces/IMintableToken.sol";

/// @title Faucet
/// @notice One-click bundle of testnet mock tokens. Requires MINTER_ROLE on each token.
contract Faucet is AccessControl {
    struct Drip {
        IMintableToken token;
        uint256 amount;
    }

    Drip[] internal _drips;
    uint256 public cooldown = 1 days;
    mapping(address => uint256) public lastClaim;

    event Claimed(address indexed account);

    error CoolingDown(uint256 availableAt);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function claim() external {
        _claimFor(msg.sender);
    }

    /// @notice Sponsored claims (e.g. a relayer onboarding an email-login user).
    function claimFor(address account) external {
        _claimFor(account);
    }

    function nextClaimAt(address account) public view returns (uint256) {
        uint256 last = lastClaim[account];
        return last == 0 ? 0 : last + cooldown;
    }

    function drips() external view returns (Drip[] memory) {
        return _drips;
    }

    function setDrips(Drip[] calldata drips_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        delete _drips;
        for (uint256 i; i < drips_.length; ++i) {
            _drips.push(drips_[i]);
        }
    }

    function setCooldown(uint256 cooldown_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        cooldown = cooldown_;
    }

    function _claimFor(address account) internal {
        uint256 next = nextClaimAt(account);
        if (block.timestamp < next) revert CoolingDown(next);
        lastClaim[account] = block.timestamp;
        for (uint256 i; i < _drips.length; ++i) {
            _drips[i].token.mint(account, _drips[i].amount);
        }
        emit Claimed(account);
    }
}
