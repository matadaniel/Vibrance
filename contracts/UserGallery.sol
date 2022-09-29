// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts/interfaces/IERC721.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol';

interface INFT is IERC721, IERC2981 {}

interface IAccounts {
    function setToken(
        address seller,
        address nft,
        uint256 tokenId
    ) external;

    function deleteToken(
        address seller,
        address nft,
        uint256 tokenId
    ) external;
}

contract UserGallery is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public totalUserBalance;
    mapping(address => uint256) public userBalances;

    IAccounts public accounts;

    struct Listing {
        address seller;
        uint256 price;
        bool onSale;
    }
    // mapping from NFT => tokenId => Listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    event TokenListed(
        address indexed NFT,
        uint256 indexed tokenId,
        uint256 price,
        address indexed seller
    );
    event TokenSold(
        address indexed NFT,
        uint256 indexed tokenId,
        uint256 price,
        address seller,
        address indexed buyer
    );
    event TokenRemoved(address indexed NFT, uint256 indexed tokenId, address indexed owner);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address owner, address _accounts) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        transferOwnership(owner);
        accounts = IAccounts(_accounts);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function createListing(
        address nft,
        uint256 tokenId,
        uint256 price
    ) external {
        bytes4 IERC165_ID = 0x01ffc9a7;
        bytes4 IERC721_ID = 0x80ac58cd;
        bytes4 IERC721Metadata_ID = 0x5b5e139f;
        INFT NFT = INFT(nft);
        require(
            NFT.supportsInterface(IERC165_ID) && !NFT.supportsInterface(0xffffffff),
            'Contract does not implement ERC-165.'
        );
        require(NFT.supportsInterface(IERC721_ID), 'Contract does not implement ERC-721.');
        require(
            NFT.supportsInterface(IERC721Metadata_ID),
            'Contract implements ERC-721 but not the metadata extension.'
        );
        require(NFT.ownerOf(tokenId) == msg.sender, 'Only owner of NFT can create listing.');
        require(NFT.getApproved(tokenId) == address(this), 'NFT has not approved this contract.');
        require(!listings[nft][tokenId].onSale, 'Listing already exists.');
        accounts.setToken(msg.sender, nft, tokenId);
        listings[nft][tokenId] = Listing(msg.sender, price, true);
        emit TokenListed(nft, tokenId, price, msg.sender);
    }

    function buy(address nft, uint256 tokenId) external payable {
        Listing memory listing = listings[nft][tokenId];
        require(listing.onSale == true, 'Token not on sale.');
        INFT NFT = INFT(nft);
        address owner = NFT.ownerOf(tokenId);

        if (NFT.getApproved(tokenId) != address(this) || owner != listing.seller) {
            accounts.deleteToken(listing.seller, nft, tokenId);
            delete listings[nft][tokenId];
            emit TokenRemoved(nft, tokenId, owner);
            return;
        }

        bytes4 IERC2981_ID = 0x2a55205a;
        uint256 marketplaceFee = (listing.price * 250) / 10000;

        if (NFT.supportsInterface(IERC2981_ID)) {
            (address creator, uint256 royalty) = NFT.royaltyInfo(tokenId, listing.price);
            require(
                msg.value == listing.price + royalty + marketplaceFee,
                "Value sent must equal the token's total price"
            );
            totalUserBalance += (listing.price + royalty);
            userBalances[creator] += royalty;
            userBalances[listing.seller] += listing.price;
            accounts.deleteToken(listing.seller, nft, tokenId);
            delete listings[nft][tokenId];
            NFT.safeTransferFrom(listing.seller, msg.sender, tokenId);
            emit TokenSold(nft, tokenId, msg.value, listing.seller, msg.sender);
        } else {
            require(
                msg.value == listing.price + marketplaceFee,
                "Value sent must equal the token's total price"
            );
            totalUserBalance += listing.price;
            userBalances[listing.seller] += listing.price;
            accounts.deleteToken(listing.seller, nft, tokenId);
            delete listings[nft][tokenId];
            NFT.safeTransferFrom(listing.seller, msg.sender, tokenId);
            emit TokenSold(nft, tokenId, msg.value, listing.seller, msg.sender);
        }
    }

    function removeListing(address nft, uint256 tokenId) public {
        // remove approval
        require(INFT(nft).ownerOf(tokenId) == msg.sender, 'Only owner of NFT can remove listing.');
        accounts.deleteToken(listings[nft][tokenId].seller, nft, tokenId);
        delete listings[nft][tokenId];
        emit TokenRemoved(nft, tokenId, msg.sender);
    }

    function withdrawFunds() external returns (bool) {
        uint256 amount = userBalances[msg.sender];
        if (amount > 0) {
            userBalances[msg.sender] = 0;
            totalUserBalance -= amount;
            if (!payable(msg.sender).send(amount)) {
                userBalances[msg.sender] = amount;
                totalUserBalance += amount;
                return false;
            }
        }
        return true;
    }

    function withdrawFundsAdmin() external onlyOwner {
        uint256 amount = userBalances[address(this)];
        userBalances[address(this)] = 0;
        totalUserBalance -= amount;
        bool sent = payable(msg.sender).send(address(this).balance - totalUserBalance + amount);
        require(sent, 'Withdrawal failed.');
    }
}
