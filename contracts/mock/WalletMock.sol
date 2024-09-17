// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract WalletMock {
    error TransferFailed();

    receive() external payable {
        revert TransferFailed();
    }

    function callFunction(address target, bytes calldata data) external payable {
        (bool success, ) = target.call{value: msg.value}(data);
        if (!success) {
            revert TransferFailed();
        }
    }
}
