// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ERC721AUpgradeable, ERC721AQueryableUpgradeable, IERC721AUpgradeable} from "erc721a-upgradeable/contracts/extensions/ERC721AQueryableUpgradeable.sol";

contract AirdroppedLicence is Initializable, ERC721AQueryableUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializerERC721A {}

    function mint(address account, uint256 quantity) external {
        _safeMint(account, quantity);
    }
}
