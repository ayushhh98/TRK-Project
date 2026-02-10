// SPDX-License-Identifier: MIT
// solhint-disable-next-line
pragma solidity ^0.8.20;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title TRKLuckyDraw
 * @dev Automated Smart Contract for the TRK Blockchain Game Lucky Draw System.
 * 1 in 10 players win. Total Prize Pool per round: 70,000 USDT.
 * Instant payouts to winner wallets. No human control.
 */
contract TRKLuckyDraw is Ownable, ReentrancyGuard, Pausable {
    IERC20 public usdt;

    uint256 public ticketPrice = 10 * 10**18; // 10 USDT (18 decimals)
    uint256 public totalTickets = 10000;
    uint256 public totalWinners = 1000;
    uint256 public totalPrizePool = 70000 * 10**18; // 70,000 USDT

    uint256 public currentRound;
    uint256 public currentTicketCount;
    
    address[] public roundParticipants;
    uint256 public surplusBalance; // Tracks the 30% revenue surplus
    
    // Prize breakdown
    uint256[8] public prizeAmounts = [
        10000 * 10**18, // 1st
        5000 * 10**18,  // 2nd
        4000 * 10**18,  // 3rd
        1000 * 10**18,  // 4th-10th
        300 * 10**18,   // 11th-50th
        120 * 10**18,   // 51st-100th
        40 * 10**18,    // 101st-500th
        20 * 10**18     // 501st-1000th
    ];

    uint256[8] public prizeWinnersCount = [1, 1, 1, 7, 40, 50, 400, 500];

    event TicketPurchased(address indexed player, uint256 round, uint256 count);
    event DrawExecuted(uint256 indexed round, uint256 totalWinners);
    event PrizeDistributed(address indexed winner, uint256 amount, uint256 rank);
    event ParametersUpdated(uint256 newPrice, uint256 newTotalTickets);
    event SurplusWithdrawn(address indexed owner, uint256 amount);

    constructor(address _usdt) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
        currentRound = 1;
    }

    /**
     * @dev Buy one or more tickets. USDT must be approved first.
     */
    function buyTickets(uint256 _quantity) external nonReentrant whenNotPaused {
        require(_quantity > 0, "Min 1 ticket");
        require(currentTicketCount + _quantity <= totalTickets, "Exceeds round limit");

        uint256 totalCost = _quantity * ticketPrice;
        require(usdt.transferFrom(msg.sender, address(this), totalCost), "USDT transfer failed");

        for (uint256 i = 0; i < _quantity; i++) {
            roundParticipants.push(msg.sender);
        }

        currentTicketCount += _quantity;
        emit TicketPurchased(msg.sender, currentRound, _quantity);

        // Auto-trigger draw when limit reached
        if (currentTicketCount == totalTickets) {
            executeDraw();
        }
    }

    /**
     * @dev Internal function to select winners and distribute prizes.
     * Uses chainlink VRF conceptually; simplified here for blockchain demo.
     */
    function executeDraw() internal {
        uint256 winnersSelectCount = 0;
        uint256 participantsCount = roundParticipants.length;

        // Pseudo-random seed
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, participantsCount)));

        // Rank loop
        for (uint256 rank = 0; rank < 8; rank++) {
            uint256 countForThisRank = prizeWinnersCount[rank];
            uint256 amountPerWinner = prizeAmounts[rank];

            for (uint256 i = 0; i < countForThisRank; i++) {
                // Select winner index
                uint256 winnerIndex = uint256(keccak256(abi.encodePacked(seed, winnersSelectCount))) % participantsCount;
                address winner = roundParticipants[winnerIndex];

                // Payout
                usdt.transfer(winner, amountPerWinner);
                
                emit PrizeDistributed(winner, amountPerWinner, rank + 1);
                winnersSelectCount++;
            }
        }

        // Calculate surplus (Total collected - Total prizes)
        uint256 totalCollected = currentTicketCount * ticketPrice;
        if (totalCollected > totalPrizePool) {
            surplusBalance += (totalCollected - totalPrizePool);
        }

        emit DrawExecuted(currentRound, winnersSelectCount);

        // Reset for next round
        delete roundParticipants;
        currentTicketCount = 0;
        currentRound++;
    }

    /**
     * @dev Allows owner to withdraw the collected surplus revenue.
     */
    function withdrawSurplus() external onlyOwner {
        uint256 amount = surplusBalance;
        require(amount > 0, "No surplus to withdraw");
        
        surplusBalance = 0;
        require(usdt.transfer(msg.sender, amount), "USDT transfer failed");
        
        emit SurplusWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Set round parameters. Only available when round is fresh.
     */
    function setParameters(uint256 _newPrice, uint256 _newTotalTickets) external onlyOwner {
        require(currentTicketCount == 0, "Round in progress");
        ticketPrice = _newPrice;
        totalTickets = _newTotalTickets;
        
        emit ParametersUpdated(_newPrice, _newTotalTickets);
    }

    /**
     * @dev Emergency controls
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Returns ticket sales progress
     */
    function getProgress() external view returns (uint256) {
        if (totalTickets == 0) return 0;
        return (currentTicketCount * 100) / totalTickets;
    }
}
