// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "./IERC721.sol";
import "./ERC165.sol";

contract NFToken is IERC721, ERC165 {
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    mapping(uint256 => address) private _tokenToOwner;
    mapping(address => uint256) private _ownedTokensCount;

    mapping(uint256 => address) private _tokenToApproval;
    mapping(address => mapping(address => bool)) private _ownerToOperators;

    modifier isValidNFToken(uint256 _tokenId) {
        require(_tokenToOwner[_tokenId] != address(0));
        _;
    }

    modifier authorizeTokenTransfer(uint256 _tokenId) {
        address owner = _tokenToOwner[_tokenId];

        require(
            msg.sender == owner ||
                msg.sender == _tokenToApproval[_tokenId] ||
                _ownerToOperators[owner][msg.sender] == true
        );
        _;
    }

    constructor() {
        _registerInterface(_INTERFACE_ID_ERC721);
    }

    function balanceOf(address _owner) external view returns (uint256) {
        require(_owner != address(0));
        return _ownedTokensCount[_owner];
    }

    function ownerOf(uint256 _tokenId) external view isValidNFToken(_tokenId) returns (address) {
        return _tokenToOwner[_tokenId];
    }

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        bytes calldata data
    ) external isValidNFToken(_tokenId) authorizeTokenTransfer(_tokenId) {
        transferFrom(_from, _to, _tokenId);
    }

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external {}

    function transferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) public isValidNFToken(_tokenId) authorizeTokenTransfer(_tokenId) {
        require(_from == _tokenToOwner[_tokenId]);
        require(_to != address(0));

        _tokenToOwner[_tokenId] = _to;
        _ownedTokensCount[_from] -= 1;
        _ownedTokensCount[_to] += 1;
        
        if (_tokenToApproval[_tokenId] != address(0)) {
            _tokenToApproval[_tokenId] == address(0);
        }

        emit Transfer(_from, _to, _tokenId);
    }

    function approve(address _approved, uint256 _tokenId) external {}

    function setApprovalForAll(address _operator, bool _aproved) external {}

    function getApproved(uint256 _tokenId) external view returns (address) {}

    function isApprovedForAll(address _owner, address _operator) external view returns (bool) {}
}
