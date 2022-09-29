// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';

interface IFlowers {
    function safeMint(
        address to,
        uint256 tokenId,
        uint256 bundle
    ) external;
}

interface IRandOracle {
    function getRandomValueFromRound(uint256 _round) external view returns (string memory);

    function getLastRound() external view returns (uint256);
}

contract Gallery is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    uint256 public totalUserBalance;
    mapping(address => uint256) public userBalances;

    IFlowers public flowers;
    uint24[] flowerTokenIds;
    bool tokenIdsSet;

    IRandOracle public randOracle;
    uint256 public nextRoundId;

    struct Bundle {
        uint256 biddingStartTime;
        uint256[10] flowersInBundle;
        uint256 highestBid;
        address highestBidder;
    }
    Bundle[] bundles;

    event BundleGenerated(uint256 timestamp, uint256 round, string randomness);
    event HighestBidIncreased(address bidder, uint256 amount);
    event AuctionEnded(uint256 indexed bundleIndex, address winner, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address owner,
        address _flowers,
        address _randOracle
    ) public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        transferOwnership(owner);
        flowers = IFlowers(_flowers);
        randOracle = IRandOracle(_randOracle);
        require(randOracle.getLastRound() > 0, 'Oracle is not running.');
        nextRoundId = randOracle.getLastRound() + 10;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setTokenIds() external {
        uint256 totalFlowers = flowerTokenIds.length;

        require(totalFlowers < 100000 && !tokenIdsSet, 'Only 100,000 flowers can be minted.');
        for (uint256 i = totalFlowers; i < totalFlowers + 100; i++) {
            flowerTokenIds.push(uint24(i));
            assert(flowerTokenIds[i] == i);
        }
    }

    function finalizeTokenIds() external {
        require(flowerTokenIds[flowerTokenIds.length - 1] == 99999, 'Index IDs have not been set.');
        tokenIdsSet = true;
    }

    function generateBundle() private returns (uint256[10] memory flowersInBundle) {
        require(tokenIdsSet, 'Index IDs have not been set.');

        uint256 roundId = nextRoundId;
        require(randOracle.getLastRound() >= roundId, 'Oracle round is not available yet.');
        string memory randomness = randOracle.getRandomValueFromRound(roundId);

        // flowerTokenIds.length % iterations == 0
        for (uint256 i = 0; i < 10; i++) {
            uint256 randNum = uint256(keccak256(abi.encode(randomness, i))) % flowerTokenIds.length;
            uint256 flowerTokenId = flowerTokenIds[randNum];
            flowerTokenIds[randNum] = flowerTokenIds[flowerTokenIds.length - 1];
            flowerTokenIds.pop();
            flowersInBundle[i] = flowerTokenId;
        }

        nextRoundId = randOracle.getLastRound() + 10;

        emit BundleGenerated(block.timestamp, roundId, randomness);
    }

    function listFirstBundles() external {
        require(bundles.length < 10, 'This function is only for the first ten bundles');

        if (bundles.length == 0) {
            require(owner() == msg.sender, 'Owner must initialize bundles');

            uint256[10] memory flowersInBundle = generateBundle();

            bundles.push(Bundle(block.timestamp, flowersInBundle, 0, address(0)));
        } else {
            require(
                bundles[bundles.length - 1].biddingStartTime + 10 hours > block.timestamp,
                'Use listBundle() if 10 hours pass.'
            );

            uint256[10] memory flowersInBundle = generateBundle();

            bundles.push(
                Bundle(bundles[bundles.length - 1].biddingStartTime, flowersInBundle, 0, address(0))
            );
        }
    }

    function listBundle() external {
        if (block.timestamp >= bundles[bundles.length - 1].biddingStartTime + 10 hours) {
            uint256[10] memory flowersInBundle = generateBundle();

            bundles.push(Bundle(block.timestamp, flowersInBundle, 0, address(0)));
        } else {
            if (bundles[bundles.length - 10].biddingStartTime + 10 hours < block.timestamp) {
                uint256[10] memory flowersInBundle = generateBundle();

                bundles.push(
                    Bundle(
                        bundles[bundles.length - 1].biddingStartTime,
                        flowersInBundle,
                        0,
                        address(0)
                    )
                );
            } else {
                require(
                    bundles[bundles.length - 10].biddingStartTime < block.timestamp,
                    'May only list bundles 10 hours in advance.'
                );

                uint256[10] memory flowersInBundle = generateBundle();

                bundles.push(
                    Bundle(
                        bundles[bundles.length - 10].biddingStartTime + 10 hours,
                        flowersInBundle,
                        0,
                        address(0)
                    )
                );
            }
        }
    }

    function bundleBid(uint256 bundleIndex) external payable {
        Bundle memory flowerBundle = bundles[bundleIndex];
        if (block.timestamp > flowerBundle.biddingStartTime + 10 hours) {
            require(
                flowerBundle.highestBidder == address(0),
                'This bundle has already been purchased.'
            );
            require(msg.value == (1 ether / 100), 'Bundle may be purchased with 0.01 ether');
            bundles[bundleIndex].highestBidder = msg.sender;
        } else {
            require(
                block.timestamp >= flowerBundle.biddingStartTime,
                'Bidding for this bundle has not started yet.'
            );
            require(
                msg.value > flowerBundle.highestBid,
                'Bid must be higher than the current highest bid'
            );
            if (flowerBundle.highestBid != 0) {
                totalUserBalance += flowerBundle.highestBid;
                userBalances[flowerBundle.highestBidder] += flowerBundle.highestBid;
            }
            bundles[bundleIndex].highestBidder = msg.sender;
            bundles[bundleIndex].highestBid = msg.value;
            emit HighestBidIncreased(msg.sender, msg.value);
        }
    }

    function claimBundle(uint256 bundleIndex) external {
        Bundle memory flowerBundle = bundles[bundleIndex];
        require(
            msg.sender == flowerBundle.highestBidder,
            'Only the highest bidder can claim this bundle.'
        );
        require(
            block.timestamp > flowerBundle.biddingStartTime + 10 hours,
            'Bidding has not ended yet.'
        );
        require(
            block.timestamp > flowerBundle.biddingStartTime + 10 hours + 15 minutes,
            'Please wait 15 minutes after bidding has ended before claiming your bundle'
        );

        emit AuctionEnded(bundleIndex, msg.sender, flowerBundle.highestBid);

        for (uint8 i; i < flowerBundle.flowersInBundle.length; i++) {
            flowers.safeMint(msg.sender, flowerBundle.flowersInBundle[i], bundleIndex);
        }
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

    function getTokenIdsLength() external view returns (uint256) {
        return flowerTokenIds.length;
    }

    function getBundleLength() external view returns (uint256) {
        return bundles.length;
    }

    function getBundle(uint256 index)
        external
        view
        returns (
            uint256 biddingStartTime,
            uint256[10] memory flowersInBundle,
            uint256 highestBid,
            address highestBidder
        )
    {
        Bundle memory bundle = bundles[index];
        return (
            bundle.biddingStartTime,
            bundle.flowersInBundle,
            bundle.highestBid,
            bundle.highestBidder
        );
    }
}
