// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

contract Flowers is ERC721Royalty, AccessControl {
    using Strings for uint256;

    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');
    mapping(uint256 => uint256) public idToBundleMap;

    constructor(address admin) ERC721('Flowers', 'FLWR') {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setDefaultRoyalty(admin, 250);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), 'ERC721Metadata: URI query for nonexistent token');

        return
            string(
                abi.encodePacked(
                    'ipfs://QmXxMweCFsnEKej6PfxRiNUKPkPdNvVCYr82ju9v98Besq/',
                    (tokenId % 64).toString(),
                    '.json'
                )
            );
    }

    function safeMint(
        address to,
        uint256 tokenId,
        uint256 bundle
    ) external onlyRole(MINTER_ROLE) {
        idToBundleMap[tokenId] = bundle;
        _safeMint(to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Royalty, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
