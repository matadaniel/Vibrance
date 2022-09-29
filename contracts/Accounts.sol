// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

contract Accounts is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256('UPGRADER_ROLE');
    bytes32 public constant WRITER_ROLE = keccak256('WRITER_ROLE');

    struct Account {
        address[] NFTs;
        mapping(address => bool) NFTAdded;
        mapping(address => uint256) NFTIndex;
        mapping(address => uint256[]) tokenIds;
        mapping(address => mapping(uint256 => uint256)) tokenIdIndex;
    }
    mapping(address => Account) accounts;

    event TokenSet(address indexed NFT, uint256 indexed tokenId, address indexed seller);
    event TokenDeleted(address indexed NFT, uint256 indexed tokenId, address indexed seller);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    function setToken(
        address seller,
        address nft,
        uint256 tokenId
    ) external onlyRole(WRITER_ROLE) {
        Account storage account = accounts[seller];
        require(account.tokenIdIndex[nft][tokenId] == 0, 'Token ID already has an index.');
        if (account.tokenIds[nft].length > 0)
            require(account.tokenIds[nft][0] != tokenId, 'Token ID already has an index.');

        if (!account.NFTAdded[nft]) {
            account.NFTs.push(nft);
            account.NFTAdded[nft] = true;
            account.NFTIndex[nft] = account.NFTs.length - 1;
        }

        account.tokenIds[nft].push(tokenId);
        account.tokenIdIndex[nft][tokenId] = account.tokenIds[nft].length - 1;

        emit TokenSet(nft, tokenId, seller);
    }

    function deleteToken(
        address seller,
        address nft,
        uint256 tokenId
    ) external onlyRole(WRITER_ROLE) {
        Account storage account = accounts[seller];
        uint256 tokenIdIndex = account.tokenIdIndex[nft][tokenId];
        uint256 lastTokenIdIndex = account.tokenIds[nft].length - 1;
        uint256 lastTokenId = account.tokenIds[nft][lastTokenIdIndex];

        if (tokenIdIndex != lastTokenIdIndex) {
            account.tokenIds[nft][tokenIdIndex] = lastTokenId;
            account.tokenIdIndex[nft][lastTokenId] = tokenIdIndex;
        }
        delete account.tokenIdIndex[nft][tokenId];
        account.tokenIds[nft].pop();

        if (account.tokenIds[nft].length == 0) {
            uint256 NFTIndex = account.NFTIndex[nft];
            uint256 lastNFTIndex = account.NFTs.length - 1;
            address lastNFT = account.NFTs[lastNFTIndex];

            if (NFTIndex != lastNFTIndex) {
                account.NFTs[NFTIndex] = lastNFT;
                account.NFTIndex[lastNFT] = NFTIndex;
            }
            delete account.NFTIndex[nft];
            delete account.NFTAdded[nft];
            account.NFTs.pop();
        }

        emit TokenDeleted(nft, tokenId, seller);
    }

    function getNFTs(
        address seller,
        uint256 start,
        uint256 end
    ) external view returns (address[] memory NFTs) {
        require(end - start < 151, 'Range can be up to 150.');

        NFTs = new address[](end - start);

        for (uint256 i = start; i < end; i++) {
            NFTs[i - start] = accounts[seller].NFTs[i];
        }
    }

    function getNFTLength(address seller) external view returns (uint256 length) {
        return accounts[seller].NFTs.length;
    }

    function getTokenIds(
        address seller,
        address nft,
        uint256 start,
        uint256 end
    ) external view returns (uint256[] memory tokenIds) {
        require(end - start < 151, 'Range can be up to 150.');

        tokenIds = new uint256[](end - start);

        for (uint256 i = start; i < end; i++) {
            tokenIds[i - start] = accounts[seller].tokenIds[nft][i];
        }
    }

    function getTokenIdLength(address seller, address nft) external view returns (uint256 length) {
        return accounts[seller].tokenIds[nft].length;
    }
}
