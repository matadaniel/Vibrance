// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';

contract RandOracle is Ownable {
    mapping(uint256 => string) randValues;
    uint256 latestRound;

    event RandomValueSet(uint256 indexed round, string randomness);

    function setRandomValue(uint256 round, string memory randomness) external onlyOwner {
        require(round > latestRound, 'Round must be greater than latest round.');
        randValues[round] = randomness;
        latestRound = round;
        emit RandomValueSet(round, randomness);
    }

    function getRandomValueFromRound(uint256 _round) external view returns (string memory) {
        return randValues[_round];
    }

    function getLastRound() external view returns (uint256) {
        return latestRound;
    }
}
