// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EnumerableMap} from "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

/**
 * @title Node sale contract for Node Terminal
 * @notice This is smart contract that is responsible for handling nodes sale using Node Terminal platform.
 * It collects payments in ERC-20 token (in particular USDT) and increases number of nodes assigned to the account. This data will be used for future NFT airdrop.
 */
contract NodesSale is AccessControlEnumerable, ReentrancyGuard {
    using EnumerableMap for EnumerableMap.AddressToUintMap;
    using SafeERC20 for IERC20;

    bytes32 public constant MASTER_ROLE = keccak256("MASTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 private constant BP_DIVISOR = 10000;

    /**
     * @notice Returns if sale is active
     */
    bool public isSaleActive;

    /**
     * @notice Returns number of purchased nodes
     */
    uint256 public nodeCount;

    /**
     * @notice Maximum number of nodes for sale
     */
    uint256 public maxSupply;

    /**
     * @notice Address of token used for payment
     */
    address public immutable paymentToken;

    /**
     * @notice Address of wallet that collects payments
     */
    address public immutable nodeProviderWallet;

    /**
     * @notice Address of wallet that collects commissions
     */
    address public immutable commissionsWallet;

    /**
     * @notice Commissions in basis points
     */
    uint256 public immutable ntCommissions;

    uint256 private pricePerNode;
    EnumerableMap.AddressToUintMap private purchasedNodes;

    /**
     * @notice Emitted when nodes are purchased
     * @param account Address of wallet that receives nodes
     * @param numberOfNodes Number of nodes
     */
    event NodesPurchased(address indexed account, uint256 numberOfNodes);

    /**
     * @notice Emitted when nodes are airdropped
     * @param account Address of wallet that receives nodes
     * @param numberOfNodes Number of nodes
     */
    event NodesAirdropped(address indexed account, uint256 numberOfNodes);

    /**
     * @notice Emitted when number of nodes are updated
     * @param account Address of wallet that receives nodes
     * @param numberOfNodes Number of nodes
     */
    event NumberOfNodesUpdated(address indexed account, uint256 numberOfNodes);

    /**
     * @notice Emitted when sale activation status is set
     * @param isActive New activation status
     */
    event SaleActivationSet(bool indexed isActive);

    /**
     * @notice Emitted when max supply is changed
     * @param account Address of wallet that changes max supply
     * @param newMaxSupply New max supply
     */
    event MaxSupplyChanged(address indexed account, uint256 indexed newMaxSupply);

    /**
     * @notice Emitted when node price is changed
     * @param account Address of wallet that changes node price
     * @param newPrice New node price
     */
    event NodePriceChanged(address indexed account, uint256 indexed newPrice);

    /**
     * @notice Raised when number of nodes exceeds the available ones
     */
    error NodesAllAllocated();

    /**
     * @notice Raised when address is zero address
     */
    error ZeroAddress();

    /**
     * @notice Raised when user balance is insufficient
     */
    error InsufficientBalance();

    /**
     * @notice Raised when user allowance for token is insufficient
     */
    error InsufficientAllowance();

    /**
     * @notice Raised invalid parameter passed
     */
    error InvalidParameter();

    /**
     * @notice Raised when sale is not active
     */
    error SaleNotActive();

    /**
     * @notice Initialize smart contract
     * @param owner Address of contract owner
     * @param erc20PaymentToken Address of payment token, if 0x0 then ETH is used
     * @param nodeProviderPaymentAddress Address of wallet that collects payment
     * @param ntPaymentAddress Address of wallet that collects commissions
     * @param maxAllowedNodes Maximum number of nodes put on sale
     * @param ntCommissionsInBp Commissions for NT in basis points
     * @param nodePrice Price per node
     */
    constructor(
        address owner,
        address erc20PaymentToken,
        address nodeProviderPaymentAddress,
        address ntPaymentAddress,
        uint256 maxAllowedNodes,
        uint256 ntCommissionsInBp,
        uint256 nodePrice
    ) {
        if (
            owner == address(0) ||
            nodeProviderPaymentAddress == address(0) ||
            ntPaymentAddress == address(0) ||
            maxAllowedNodes == 0 ||
            ntCommissionsInBp == 0 ||
            nodePrice == 0
        ) {
            revert InvalidParameter();
        }

        maxSupply = maxAllowedNodes;
        paymentToken = erc20PaymentToken;
        nodeProviderWallet = nodeProviderPaymentAddress;
        commissionsWallet = ntPaymentAddress;
        ntCommissions = ntCommissionsInBp;
        pricePerNode = nodePrice;

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
    }

    modifier saleIsActive() {
        if (!isSaleActive) {
            revert SaleNotActive();
        }
        _;
    }

    modifier haveEnoughToBuy(uint256 numberOfNodes) {
        if (numberOfNodes == 0) {
            revert InvalidParameter();
        }
        uint256 paymentAmount = numberOfNodes * getPricePerNode();
        if (paymentToken == address(0)) {
            if (msg.value < paymentAmount) {
                revert InsufficientBalance();
            }
        } else {
            if (IERC20(paymentToken).balanceOf(msg.sender) < paymentAmount) {
                revert InsufficientBalance();
            }
            if (IERC20(paymentToken).allowance(msg.sender, address(this)) < paymentAmount) {
                revert InsufficientAllowance();
            }
        }
        _;
    }

    /**
     * @notice Sets if sale is active
     * @dev Requires master role
     * @param state true or false
     */
    function setIsSaleActive(bool state) external onlyRole(MASTER_ROLE) {
        isSaleActive = state;
        emit SaleActivationSet(state);
    }

    /**
     * @notice Assigns number of nodes to account
     * @dev Requires default admin role
     * @param account Address of wallet that receives nodes
     * @param value New number of nodes
     */
    function setNumberOfNodes(address account, uint256 value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 userBalance = getNumberOfNodes(account);
        uint256 newNodeCount = value > userBalance
            ? nodeCount + (value - userBalance)
            : nodeCount - (userBalance - value);

        if (newNodeCount > maxSupply) {
            revert NodesAllAllocated();
        }

        nodeCount = newNodeCount;
        purchasedNodes.set(account, value);
        emit NumberOfNodesUpdated(account, value);
    }

    /**
     * @notice Adds nodes to account
     * @dev Requires admin role
     * @param account Address of wallet that receives nodes
     * @param numberOfNodes Number of nodes added
     */
    function addMultipleNodes(address account, uint256 numberOfNodes) external onlyRole(ADMIN_ROLE) {
        addNodes(account, numberOfNodes);
        emit NodesAirdropped(account, numberOfNodes);
    }

    /**
     * @notice Sets max supply
     * @dev Requires admin role
     * @param newMaxSupply New max supply
     */
    function setMaxSupply(uint256 newMaxSupply) external onlyRole(ADMIN_ROLE) {
        if (newMaxSupply < nodeCount) {
            revert InvalidParameter();
        }
        maxSupply = newMaxSupply;
        emit MaxSupplyChanged(msg.sender, newMaxSupply);
    }

    /**
     * @notice Sets price per node
     * @dev Requires admin role
     * @param newPrice New price per node
     */
    function setPricePerNode(uint256 newPrice) external onlyRole(ADMIN_ROLE) {
        if (newPrice == 0) {
            revert InvalidParameter();
        }
        pricePerNode = newPrice;
        emit NodePriceChanged(msg.sender, newPrice);
    }

    /**
     * @notice Returns node price
     */
    function getPricePerNode() public view returns (uint256 price) {
        return pricePerNode;
    }

    /**
     * @notice Returns number of purchased nodes by account
     * @param account Address of wallet
     */
    function getNumberOfNodes(address account) public view returns (uint256) {
        return purchasedNodes.contains(account) ? purchasedNodes.get(account) : 0;
    }

    /**
     * @notice Returns accounts addresses and corresponding number of purchased nodes
     */
    function getAccountsAndNumberOfNodes() external view returns (address[] memory accounts, uint256[] memory nodes) {
        uint256 nodesLength = purchasedNodes.length();
        accounts = new address[](nodesLength);
        nodes = new uint256[](nodesLength);

        for (uint256 i = 0; i < nodesLength; ) {
            (address account, uint256 value) = purchasedNodes.at(i);
            accounts[i] = account;
            nodes[i] = value;
            unchecked {
                i++;
            }
        }
        return (accounts, nodes);
    }

    /**
     * @notice Returns number of available nodes that can be purchased
     */
    function getAvailableNodes() external view returns (uint256 available) {
        return maxSupply - nodeCount;
    }

    /**
     * @notice Returns all accounts that purchased nodes
     */
    function getAccounts() external view returns (address[] memory accounts) {
        return purchasedNodes.keys();
    }

    /**
     * @notice Performs nodes purchase
     * @dev Requirements:
     * @dev - sale is active
     * @dev - account has sufficient balance
     * @dev - account has sufficient allowance
     * @param numberOfNodes Number of nodes purchased
     */
    function purchaseNodes(
        uint256 numberOfNodes
    ) external payable saleIsActive haveEnoughToBuy(numberOfNodes) nonReentrant {
        sendPayments(numberOfNodes);
        addNodes(msg.sender, numberOfNodes);
        emit NodesPurchased(msg.sender, numberOfNodes);
    }

    function sendPayments(uint256 numberOfNodes) internal {
        uint256 totalAmount = numberOfNodes * getPricePerNode();

        uint256 ntCommissionsAmount = (totalAmount * ntCommissions) / BP_DIVISOR;
        send(commissionsWallet, ntCommissionsAmount);

        uint256 providerAmount = totalAmount - ntCommissionsAmount;
        send(nodeProviderWallet, providerAmount);
    }

    function addNodes(address account, uint256 numberOfNodes) internal {
        uint256 newNodeCount = nodeCount + numberOfNodes;
        if (newNodeCount > maxSupply) {
            revert NodesAllAllocated();
        }
        nodeCount = newNodeCount;
        purchasedNodes.set(account, getNumberOfNodes(account) + numberOfNodes);
    }

    function send(address destination, uint256 amount) internal {
        if (paymentToken == address(0)) {
            payable(destination).transfer(amount);
        } else {
            IERC20(paymentToken).safeTransferFrom(msg.sender, destination, amount);
        }
    }
}
