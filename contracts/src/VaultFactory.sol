// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {EquoraVault} from "./EquoraVault.sol";
import {HedgeBook} from "./HedgeBook.sol";
import {IMintableToken} from "./interfaces/IMintableToken.sol";

/// @title VaultFactory
/// @notice Deploys EquoraVault clones from a single implementation and registers them with the
/// HedgeBook. Requires REGISTRAR_ROLE on the HedgeBook.
contract VaultFactory is AccessControl {
    address public immutable implementation;
    EquoraVault.Deps public deps;
    address public keeper;

    address[] internal _vaults;
    mapping(bytes32 => address[]) internal _byCurrency;

    event VaultCreated(address indexed vault, bytes32 indexed currency, string name, bool hedged);

    constructor(address implementation_, EquoraVault.Deps memory deps_, address keeper_, address admin) {
        implementation = implementation_;
        deps = deps_;
        keeper = keeper_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function createVault(
        IERC20 asset,
        string calldata name,
        string calldata symbol,
        EquoraVault.Config calldata cfg,
        address vaultAdmin
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (address vault) {
        vault = Clones.clone(implementation);
        EquoraVault(vault).initialize(asset, name, symbol, cfg, deps, vaultAdmin, keeper);
        deps.hedgeBook.registerVault(vault, cfg.currency, IMintableToken(address(asset)));
        _vaults.push(vault);
        _byCurrency[cfg.currency].push(vault);
        emit VaultCreated(vault, cfg.currency, name, cfg.hedged);
    }

    function setKeeper(address keeper_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        keeper = keeper_;
    }

    function vaults() external view returns (address[] memory) {
        return _vaults;
    }

    function vaultsByCurrency(bytes32 currency) external view returns (address[] memory) {
        return _byCurrency[currency];
    }
}
