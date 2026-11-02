// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.19;

// Compiles the unmodified Morpho Blue core (GPL-2.0-or-later) so tests and deploy scripts can
// deploy it with `deployCode("Morpho.sol:Morpho", ...)` on networks without a canonical deployment.
import {Morpho} from "morpho-blue/Morpho.sol";
