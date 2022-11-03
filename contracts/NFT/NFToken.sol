// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./IERC721.sol";
import "./ERC165.sol";
import "./IERC721Metadata.sol";

contract NFToken is IERC721, ERC165, IERC721Metadata {
    using Strings for uint256;

    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    string private _name;
    string private _symbol;
    string private _tokenBaseURI;

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

    constructor(
        string memory name_,
        string memory symbol_,
        string memory tokenBaseURI_
    ) {
        _registerInterface(_INTERFACE_ID_ERC721);
        _name = name_;
        _symbol = symbol_;
        _tokenBaseURI = tokenBaseURI_;
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
        bytes memory _data
    ) public {
        transferFrom(_from, _to, _tokenId);
        require(_checkOnERC721Received(_from, _to, _tokenId, _data));
    }

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external {
        safeTransferFrom(_from, _to, _tokenId, "");
    }

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

    function approve(address _approved, uint256 _tokenId) external {
        address owner = _tokenToOwner[_tokenId];
        require(msg.sender == owner || _ownerToOperators[owner][msg.sender] == true);

        _tokenToApproval[_tokenId] = _approved;
        emit Approval(owner, _approved, _tokenId);
    }

    function setApprovalForAll(address _operator, bool _approved) external {
        _ownerToOperators[msg.sender][_operator] = _approved;
        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    function getApproved(uint256 _tokenId)
        external
        view
        isValidNFToken(_tokenId)
        returns (address)
    {
        return _tokenToApproval[_tokenId];
    }

    function isApprovedForAll(address _owner, address _operator) external view returns (bool) {
        return _ownerToOperators[_owner][_operator];
    }

    function name() external view returns (string memory) {
        return _name;
    }

    function _checkOnERC721Received(
        address _from,
        address _to,
        uint256 _tokenId,
        bytes memory _data
    ) private returns (bool) {
        if (_to.code.length == 0) {
            return true;
        }

        require(
            IERC721Receiver(_to).onERC721Received(msg.sender, _from, _tokenId, _data) ==
                IERC721Receiver.onERC721Received.selector
        );

        return true;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function tokenURI(uint256 _tokenId)
        external
        view
        isValidNFToken(_tokenId)
        returns (string memory)
    {
        return string(abi.encodePacked(_tokenBaseURI, _tokenId.toString()));
    }
}
