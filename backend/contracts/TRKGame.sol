// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TRKGame is Ownable, ReentrancyGuard {
    IERC20 public usdt;

    event GameResult(address indexed player, uint256 amount, bool won, uint256 payout, uint256 prediction, uint256 outcome);

    constructor(address _usdt) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
    }

    // 1 in 8 chance to win 8x
    function bet(uint256 _amount, uint256 _prediction) external nonReentrant {
        require(_amount > 0, "Bet amount must be greater than 0");
        require(_prediction >= 1 && _prediction <= 8, "Prediction must be between 1 and 8");
        
        // Transfer USDT from player to contract
        require(usdt.transferFrom(msg.sender, address(this), _amount), "USDT transfer failed");

        // Generate random outcome (Pseudo-random for demo - Use Chainlink VRF in prod)
        uint256 outcome = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao))) % 8) + 1;
        
        bool won = (_prediction == outcome);
        uint256 payout = 0;

        if (won) {
            payout = _amount * 8;
            require(usdt.balanceOf(address(this)) >= payout, "Insufficient contract balance");
            require(usdt.transfer(msg.sender, payout), "Payout transfer failed");
        }

        emit GameResult(msg.sender, _amount, won, payout, _prediction, outcome);
    }

    function withdrawFunds(uint256 _amount) external onlyOwner {
        require(usdt.transfer(msg.sender, _amount), "Transfer failed");
    }
}
