const TRKGameABI = [
    "event UserRegistered(address indexed user, address indexed referrer, uint256 userId)",
    "event UserActivated(address indexed user, bool isPractice, bool isCash, uint256 bonus)",
    "event BetPlaced(address indexed player, uint256 indexed roundId, uint256 amount, uint256 prediction, bool isCash)",
    "event WinClaimed(address indexed winner, uint256 cashout, uint256 reinvest)",
    "event LuckyDrawPaid(address indexed winner, uint256 amount)",
    "event ReferralPaid(address indexed referrer, address indexed user, uint256 amount, uint256 level)",
    "event ClubBonusPaid(address indexed user, uint256 amount)",
    "event LossClaimed(address indexed loser, uint256 cashback, uint256 roiToReferrer)",
    "event RoundClosed(uint256 indexed roundId, uint256 winningNumber, bool isCash)"
];

module.exports = { TRKGameABI };
