// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./IERC165.sol";

contract ERC165 is IERC165 {
    bytes4 private constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;

    mapping(bytes4 => bool) internal _supportedInterfaces;

    constructor() {
        _supportedInterfaces[_INTERFACE_ID_ERC165] = true;
    }

    function supportsInterface(bytes4 _interfaceId) external view returns (bool) {
        return _supportedInterfaces[_interfaceId];
    }

    function _registerInterface(bytes4 _interfaceId) internal {
        require(_interfaceId != 0xffffffff);
        _supportedInterfaces[_interfaceId] = true;
    }
}
