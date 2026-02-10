// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


/**
 * @title TRKGameFinal - REAL CASH GAME Platform (Full Features)
 * @notice Implements all 7 Income Types: 
 * 1. Win Income
 * 2. Direct Level Income
 * 3. Winner Level Income
 * 4. Losers Cashback (New)
 * 5. Losers ROI on ROI (Referral Cashback) (New)
 * 6. Club Income (New)
 * 7. Lucky Draw (New)
 */
contract TRKGameFinal is Ownable, ReentrancyGuard {
    IERC20 public usdtToken;

    // ==================== WALLET ADDRESSES ====================
    address public treasuryWallet;             // Combined 12% (Creator 2% + Few 5% + BD 5%)
    
    // ==================== CONFIGURABLE SETTINGS ====================
    uint256 public MIN_ACTIVATION = 10 * 10**18;          
    uint256 public SIGNUP_BONUS = 100 * 10**18;           
    uint256 public BONUS_USER_LIMIT = 100000;             
    uint256 public MIN_REFERRAL_PAYOUT = 100 * 10**18;    
    uint256 public PRACTICE_GAMES_PER_DAY = 24;
    uint256 public CASH_GAMES_PER_DAY = 24;
    uint256 public MIN_WITHDRAWAL = 5 * 10**18;           
    uint256 public MIN_BET = 5 * 10**17;                  // 0.5 USDT Min Bet
    
    // Distribution percentages (Total 44% deducted, 56% to Game Pool)
    uint256 public TREASURY_PERCENT = 12;                  
    uint256 public REFERRAL_PERCENT = 15;                  
    uint256 public CLUB_PERCENT = 5;       // New
    uint256 public LUCKY_PERCENT = 2;      // New
    uint256 public PROTECTION_PERCENT = 10; // New (For Cashback + ROI)
    
    // Win multipliers
    uint256 public WIN_CASHOUT_MULTIPLIER = 2;             
    uint256 public WIN_REINVEST_MULTIPLIER = 6;            
    uint256 public WINNER_REFERRAL_PERCENT = 15;           
    
    // Loss Compensation
    uint256 public LOSS_CASHBACK_PERCENT = 5;  // 5% of bet amount back to loser
    uint256 public LOSS_REFERRAL_PERCENT = 1;  // 1% of bet amount to referrer
    
    bool public isPaused;
    
    // Global Stats
    uint256 public totalUsers;
    uint256 public totalVolume;
    uint256 public totalWithdrawnGlobal;
    uint256 public totalBetsGlobal;
    uint256 public totalWinsGlobal;
    uint256 public totalLossesGlobal;
    
    // Level Percentages (in basis points: 500 = 5%)
    uint256[15] public LEVEL_PERCENTS = [uint256(500), 200, 100, 100, 100, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50];

    enum CommissionType { DIRECT, WINNER, PRACTICE }
    
    // ==================== STRUCTS ====================
    struct User {
        uint256 userId;
        address referrer;
        uint256 registrationTime;
        
        // Balances
        uint256 walletBalance;            
        uint256 practiceBalance;          
        uint256 cashGameBalance;          
        
        // Deposits & Withdrawals
        uint256 totalDeposit;             
        uint256 totalWithdrawn;           
        
        // Income Tracking
        uint256 directReferralIncome;     
        uint256 winnerReferralIncome;     
        uint256 practiceReferralIncome;   // Practice referral earnings
        uint256 cashbackIncome;           // New
        uint256 lossReferralIncome;       // New
        uint256 clubIncome;               // New
        uint256 luckyDrawIncome;          // New
        
        // Level-wise Income Breakdown (L1-L15)
        uint256[15] directReferralIncomeByLevel;
        uint256[15] winnerReferralIncomeByLevel;
        uint256[15] practiceReferralIncomeByLevel;
        
        uint256 cumulativeDeposit;        
        
        // Game Stats
        uint256 practiceGamesPlayedToday;
        uint256 cashGamesPlayedToday;
        uint256 lastGameDate;
        uint256 totalBets;
        uint256 totalWins;
        uint256 totalLosses;
        
        // Status
        bool isRegistered;
        bool isPracticePlayer;            
        bool isCashPlayer;                
        
        uint256 directReferrals;
        uint256 teamVolume;               // For Club Ranks
    }
    
    struct Round {
        uint256 roundId;
        uint256 startTime;
        uint256 endTime;
        uint256 totalPool;
        uint256 winningNumber;
        bool isClosed;
        bool isCashGame;
    }
    
    struct Bet {
        address player;
        uint256 amount;
        uint256 prediction;
        bool claimed;     // Won or Lost Claimed
    }
    
    struct BetRecord {
        uint256 roundId;
        uint256 betAmount;
        uint256 prediction;
        uint256 winningNumber;
        bool won;
        uint256 payout;
        uint256 timestamp;
        bool isCashGame;
    }
    
    struct DistributionRecord {
        uint256 roundId;
        address winner;
        uint256 totalPayout;
        uint256 timestamp;
    }

    // Stack Optimization Struct
    struct DistributionStackVars {
        uint256 remaining;
        uint256 creatorAmt;
        uint256 bdTotal;
        uint256 bdEach;
        uint256 fewAmt;
        uint256 refAmt;
        uint256 paidRef;
        uint256 diff;
        uint256 half;
        uint256 clubAmt;
        uint256 luckyAmt;
        uint256 protectAmt;
    }
    
    // ==================== STATE VARIABLES ====================
    uint256 public userCounter;
    uint256 public currentPracticeRoundId;
    uint256 public currentCashRoundId;
    uint256 public totalBonusesGiven;
    
    // Pools
    uint256 public gamePoolBalance;
    uint256 public clubPoolBalance;
    uint256 public luckyDrawBalance;
    uint256 public protectionPoolBalance; // Stores funds for Cashback + ROI
    
    mapping(address => User) public users;
    mapping(uint256 => Round) public practiceRounds;
    mapping(uint256 => Round) public cashRounds;
    mapping(address => mapping(uint256 => Bet)) public practiceBets;
    mapping(address => mapping(uint256 => Bet)) public cashBets;
    mapping(address => uint256[]) public userPlayedPracticeRounds;
    mapping(address => uint256[]) public userPlayedCashRounds;
    mapping(address => address[]) public directReferralsList;
    
    mapping(address => string) public addressToReferralCode;
    mapping(string => address) public referralCodeToAddress;
    mapping(uint256 => address) public idToAddress;
    
    // Admin roles
    mapping(address => bool) public isSuperAdmin;
    mapping(address => bool) public isViewAdmin;
    
    // NEW: Bet History and Tracking
    mapping(address => BetRecord[]) public userBetHistory;
    DistributionRecord[] public distributionHistory;
    
    // NEW: Round-level bet tracking (roundId => number => data)
    mapping(uint256 => mapping(uint256 => uint256)) public practiceBetTotalsByNumber;  // roundId => number => total USDT
    mapping(uint256 => mapping(uint256 => uint256)) public cashBetTotalsByNumber;
    mapping(uint256 => mapping(uint256 => address[])) public practiceBettersByNumber;  // roundId => number => addresses
    mapping(uint256 => mapping(uint256 => address[])) public cashBettersByNumber;
    mapping(uint256 => mapping(address => uint256)) public practiceUserBetAmounts;  // roundId => user => amount
    mapping(uint256 => mapping(address => uint256)) public cashUserBetAmounts;
    
    // NEW: Winner tracking
    mapping(uint256 => address[]) public practiceRoundWinners;  // roundId => winners
    mapping(uint256 => address[]) public cashRoundWinners;
    mapping(uint256 => mapping(address => uint256)) public practiceWinnerPayouts;  // roundId => winner => payout
    mapping(uint256 => mapping(address => uint256)) public cashWinnerPayouts;
    
    // Last result tracking for game page
    uint256 public lastCashRoundClosed;
    uint256 public lastPracticeRoundClosed;
    
    // ==================== EVENTS ====================
    event UserRegistered(address indexed user, address indexed referrer, uint256 userId);
    event UserActivated(address indexed user, bool isPractice, bool isCash, uint256 bonus);
    event Deposited(address indexed user, uint256 amount);
    event BetPlaced(address indexed player, uint256 indexed roundId, uint256 amount, uint256 prediction, bool isCash);
    event RoundClosed(uint256 indexed roundId, uint256 winningNumber, bool isCash);
    event WinClaimed(address indexed winner, uint256 cashout, uint256 reinvest);
    event LossClaimed(address indexed loser, uint256 cashback, uint256 roiToReferrer);
    event ReferralPaid(address indexed referrer, address indexed user, uint256 amount, uint256 level);
    event ClubBonusPaid(address indexed user, uint256 amount);
    event LuckyDrawPaid(address indexed winner, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event DistributionMade(address indexed wallet, uint256 amount, string walletType);
    
    // ==================== MODIFIERS ====================
    modifier onlyAdmin() {
        require(isSuperAdmin[msg.sender] || msg.sender == owner(), "Not admin");
        _;
    }
    
    modifier whenNotPaused() {
        require(!isPaused, "Contract is paused");
        _;
    }
    
    // ==================== CONSTRUCTOR ====================
    constructor(
        address _usdtToken,
        address _treasuryWallet
    ) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Invalid USDT");
        require(_treasuryWallet != address(0), "Invalid Treasury");
        
        usdtToken = IERC20(_usdtToken);
        treasuryWallet = _treasuryWallet;
        
        isSuperAdmin[msg.sender] = true;
        
        currentPracticeRoundId = 1;
        currentCashRoundId = 1;
        
        _initRound(1, false);
        _initRound(1, true);
    }
    
    function _initRound(uint256 _id, bool _isCash) private {
        Round memory newRound = Round({
            roundId: _id,
            startTime: block.timestamp,
            endTime: 0,
            totalPool: 0,
            winningNumber: 0,
            isClosed: false,
            isCashGame: _isCash
        });
        
        if (_isCash) cashRounds[_id] = newRound;
        else practiceRounds[_id] = newRound;
    }
    
    // ==================== USER FUNCTIONS ====================
    
    function register(address _referrer) external whenNotPaused {
        _internalRegister(msg.sender, _referrer);
    }

    function _internalRegister(address _user, address _referrer) internal {
        require(!users[_user].isRegistered, "Already registered");
        
        if (userCounter > 0) {
            // If no referrer provided for auto-registration, fallback to the first user (Owner/Admin)
            if (_referrer == address(0)) {
                _referrer = idToAddress[1] != address(0) ? idToAddress[1] : owner();
            }
            require(_referrer != address(0) && _referrer != _user && users[_referrer].isRegistered, "Invalid referrer");
        } else {
            _referrer = address(0);
        }
        
        userCounter++;
        uint256 bonus = 0;
        
        if (userCounter <= BONUS_USER_LIMIT) {
            bonus = SIGNUP_BONUS;
            totalBonusesGiven += bonus;
        }
        
        users[_user].userId = userCounter;
        users[_user].referrer = _referrer;
        users[_user].registrationTime = block.timestamp;
        users[_user].practiceBalance = bonus;
        users[_user].isRegistered = true;
        users[_user].isPracticePlayer = true;
        
        totalUsers++;
        
        if (_referrer != address(0)) {
            directReferralsList[_referrer].push(_user);
            users[_referrer].directReferrals++;
            if (bonus > 0) _distributeMultiLevelCommission(_user, bonus, CommissionType.DIRECT);
        }
        
        idToAddress[userCounter] = _user;
        string memory refCode = _generateReferralCode(userCounter, _user);
        addressToReferralCode[_user] = refCode;
        referralCodeToAddress[refCode] = _user;
        
        emit UserRegistered(_user, _referrer, userCounter);
        emit UserActivated(_user, true, false, bonus);
    }
    
    function _generateReferralCode(uint256 _userId, address _user) internal view returns (string memory) {
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, _user, _userId)));
        return string(abi.encodePacked("TRK", _uint2str((seed % 90000) + 10000)));
    }

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function depositCashGame(uint256 _amount) external nonReentrant whenNotPaused {
        if (!users[msg.sender].isRegistered) {
            _internalRegister(msg.sender, address(0)); 
        }
        require(_amount > 0, "Amount required");
        
        require(usdtToken.transferFrom(msg.sender, address(this), _amount), "Transfer failed");
        
        users[msg.sender].totalDeposit += _amount;
        users[msg.sender].cumulativeDeposit += _amount;
        users[msg.sender].cashGameBalance += _amount; // FIX: Credit the playable balance
        totalVolume += _amount;
        users[msg.sender].isCashPlayer = true;
        users[msg.sender].practiceBalance = 0; // Clear practice on real activation
        
        // Update Team Volume for Upline (Club Income)
        address upline = users[msg.sender].referrer;
        while(upline != address(0)) {
            users[upline].teamVolume += _amount;
            upline = users[upline].referrer;
        }
        
        _distributeDeposit(_amount);
        
        emit Deposited(msg.sender, _amount);
        emit UserActivated(msg.sender, false, true, 0);
    }

    /**
     * @notice Place bet using USDT directly from wallet
     * Bypasses manual deposit by performing transferFrom + _distributeDeposit internally
     */
    function placeBetDirect(uint256 _roundId, uint256 _prediction, uint256 _amount) external nonReentrant whenNotPaused {
        if (!users[msg.sender].isRegistered) {
            _internalRegister(msg.sender, address(0)); 
        }
        require(_prediction <= 9, "Invalid prediction (0-9)");
        require(_amount > 0, "Amount required");
        
        // 1. Transfer USDT from wallet
        require(usdtToken.transferFrom(msg.sender, address(this), _amount), "USDT transfer failed");
        
        // 2. Distribute ecosystem cut
        _distributeDeposit(_amount);
        
        // 3. Activate Cash Player status automatically
        users[msg.sender].isCashPlayer = true;
        users[msg.sender].practiceBalance = 0; 

        // 4. Temporarily credit the balance to reuse internal betting logic
        // This is safe because _executeBet will immediately subtract it again
        users[msg.sender].cashGameBalance += _amount; 

        // 5. Execute Betting Logic internally (bypassing public nonReentrant guard)
        _executeBet(_roundId, _prediction, _amount, true, msg.sender);
    }

    
    function _distributeDeposit(uint256 _amount) private {
        DistributionStackVars memory v;
        v.remaining = _amount;
        
        // 1. Treasury (12% Combined Creator, BD, FEW)
        {
            uint256 treasuryAmt = (_amount * TREASURY_PERCENT) / 100;
            if (treasuryWallet != address(0)) {
                usdtToken.transfer(treasuryWallet, treasuryAmt);
                v.remaining -= treasuryAmt;
            }
        }
        
        // 4. Referral (15%)
        {
            v.refAmt = (_amount * REFERRAL_PERCENT) / 100;
            v.paidRef = _distributeMultiLevelCommission(msg.sender, v.refAmt, CommissionType.DIRECT);
            v.remaining -= v.paidRef;
            
            // Split remainder of referral: 50% FEW, 50% GamePool
            if(v.refAmt > v.paidRef) {
                v.diff = v.refAmt - v.paidRef;
                v.half = v.diff / 2;
                if (treasuryWallet != address(0)) {
                    usdtToken.transfer(treasuryWallet, v.half);
                    gamePoolBalance += (v.diff - v.half);
                } else {
                    gamePoolBalance += v.diff;
                }
                v.remaining -= v.diff;
            }
        }
        
        // 5. Club Pool (5%)
        {
            v.clubAmt = (_amount * CLUB_PERCENT) / 100;
            clubPoolBalance += v.clubAmt;
            v.remaining -= v.clubAmt;
        }
        
        // 6. Lucky Draw (2%)
        {
            v.luckyAmt = (_amount * LUCKY_PERCENT) / 100;
            luckyDrawBalance += v.luckyAmt;
            v.remaining -= v.luckyAmt;
        }
        
        // 7. Protection Pool (Cashback + ROI) (10%)
        {
            v.protectAmt = (_amount * PROTECTION_PERCENT) / 100;
            protectionPoolBalance += v.protectAmt;
            v.remaining -= v.protectAmt;
        }
        
        // 8. Game Pool (Remainder)
        gamePoolBalance += v.remaining;
        
        // Safety check for solvency
        require(usdtToken.balanceOf(address(this)) >= (gamePoolBalance + clubPoolBalance + luckyDrawBalance + protectionPoolBalance), "Accounting error");
    }
    
    function _distributeMultiLevelCommission(address _user, uint256 _amount, CommissionType _type) private returns (uint256) {
        address current = users[_user].referrer;
        uint256 totalPaid = 0;
        
        for (uint256 i = 0; i < 15 && current != address(0); i++) {
            uint256 comm = (_amount * LEVEL_PERCENTS[i]) / 10000;
            
            if (_type == CommissionType.PRACTICE) {
                users[current].practiceBalance += comm;
                users[current].practiceReferralIncome += comm;
                users[current].practiceReferralIncomeByLevel[i] += comm;
            } else if (users[current].cumulativeDeposit >= MIN_REFERRAL_PAYOUT) {
                if (_type == CommissionType.DIRECT) {
                    users[current].directReferralIncome += comm;
                    users[current].directReferralIncomeByLevel[i] += comm;
                } else {
                    users[current].winnerReferralIncome += comm;
                    users[current].winnerReferralIncomeByLevel[i] += comm;
                }
                users[current].walletBalance += comm;
                totalPaid += comm;
                emit ReferralPaid(current, _user, comm, i + 1);
            } else {
                users[current].practiceBalance += comm;
                users[current].practiceReferralIncomeByLevel[i] += comm;
            }
            current = users[current].referrer;
        }
        return totalPaid;
    }
    
    // Helper function to update bet history with results
    function _updateBetHistory(
        address _user,
        uint256 _roundId,
        bool _isCashGame,
        bool _won,
        uint256 _payout,
        uint256 _winningNumber
    ) private {
        BetRecord[] storage history = userBetHistory[_user];
        for (uint256 i = history.length; i > 0; i--) {
            uint256 idx = i - 1;
            if (history[idx].roundId == _roundId && history[idx].isCashGame == _isCashGame) {
                history[idx].won = _won;
                history[idx].payout = _payout;
                history[idx].winningNumber = _winningNumber;
                break;
            }
        }
    }
    
    // Unified bet and claim functions are used (placeBet and claimWin)

    
    // ==================== ADMIN: CLUB & LUCKY DRAW ====================
    
    /**
     * @notice Distribute Club Bonus
     * Admin calculates eligible users based on Team Volume off-chain or on-chain logic
     * Here we use a direct distribution from the accumulated Club Pool
     */
    function distributeClubBonus(address[] calldata _recipients, uint256[] calldata _amounts) external onlyAdmin {
        uint256 total = 0;
        for(uint256 i=0; i<_recipients.length; i++) total += _amounts[i];
        
        require(clubPoolBalance >= total, "Insufficient Club Pool");
        clubPoolBalance -= total;
        
        for(uint256 i=0; i<_recipients.length; i++) {
            users[_recipients[i]].walletBalance += _amounts[i];
            users[_recipients[i]].clubIncome += _amounts[i];
            emit ClubBonusPaid(_recipients[i], _amounts[i]);
        }
    }
    
    /**
     * @notice Execute Lucky Draw
     */
    function executeLuckyDraw(address[] calldata _winners, uint256[] calldata _amounts) external onlyAdmin {
        uint256 total = 0;
        for(uint256 i=0; i<_winners.length; i++) total += _amounts[i];
        
        require(luckyDrawBalance >= total, "Insufficient Lucky Pool");
        luckyDrawBalance -= total;
        
        for(uint256 i=0; i<_winners.length; i++) {
            users[_winners[i]].walletBalance += _amounts[i];
            users[_winners[i]].luckyDrawIncome += _amounts[i];
            emit LuckyDrawPaid(_winners[i], _amounts[i]);
        }
    }
    
    // ==================== ADMIN OPERATIONS ====================
    
    function closeRound(uint256 _winningNumber, bool _isCashGame) external onlyAdmin {
        require(_winningNumber <= 9, "Invalid number");
        
        if (_isCashGame) {
            cashRounds[currentCashRoundId].winningNumber = _winningNumber;
            cashRounds[currentCashRoundId].isClosed = true;
            cashRounds[currentCashRoundId].endTime = block.timestamp;
            lastCashRoundClosed = currentCashRoundId; // Track last result
            emit RoundClosed(currentCashRoundId, _winningNumber, true);
            
            currentCashRoundId++;
            _initRound(currentCashRoundId, true);
        } else {
            practiceRounds[currentPracticeRoundId].winningNumber = _winningNumber;
            practiceRounds[currentPracticeRoundId].isClosed = true;
            practiceRounds[currentPracticeRoundId].endTime = block.timestamp;
            lastPracticeRoundClosed = currentPracticeRoundId; // Track last result
            emit RoundClosed(currentPracticeRoundId, _winningNumber, false);
            
            currentPracticeRoundId++;
            _initRound(currentPracticeRoundId, false);
        }
    }
    
    // ==================== GAME FUNCTIONS ====================
    
    function placeBet(uint256 _roundId, uint256 _prediction, uint256 _amount, bool _isCashGame) external nonReentrant whenNotPaused {
        _executeBet(_roundId, _prediction, _amount, _isCashGame, msg.sender);
    }

    function _executeBet(uint256 _roundId, uint256 _prediction, uint256 _amount, bool _isCashGame, address _player) internal {
        require(users[_player].isRegistered, "Not registered");
        require(_prediction <= 9, "Invalid prediction (0-9)");
        require(_amount > 0, "Amount required");
        
        Round storage round = _isCashGame ? cashRounds[_roundId] : practiceRounds[_roundId];
        require(!round.isClosed, "Round closed");
        require(round.roundId == _roundId, "Invalid round");
        
        // Check if user already bet in this round
        Bet storage existingBet = _isCashGame ? cashBets[_player][_roundId] : practiceBets[_player][_roundId];
        require(existingBet.amount == 0, "Already bet in this round");
        
        // Check daily limits
        if (block.timestamp / 1 days != users[_player].lastGameDate / 1 days) {
            users[_player].practiceGamesPlayedToday = 0;
            users[_player].cashGamesPlayedToday = 0;
            users[_player].lastGameDate = block.timestamp;
        }
        
        if (_isCashGame) {
            require(users[_player].isCashPlayer, "Not cash player");
            require(users[_player].cashGamesPlayedToday < 24, "Daily limit reached");
            require(_amount >= MIN_BET, "Below minimum bet");
            
            // Flexible balance usage: try cashGameBalance first, then walletBalance
            if (users[_player].cashGameBalance >= _amount) {
                users[_player].cashGameBalance -= _amount;
            } else {
                uint256 remainder = _amount - users[_player].cashGameBalance;
                require(users[_player].walletBalance >= remainder, "Insufficient unified balance");
                users[_player].cashGameBalance = 0;
                users[_player].walletBalance -= remainder;
            }
            users[_player].cashGamesPlayedToday++;
        } else {
            require(users[_player].isPracticePlayer, "Not practice player");
            require(users[_player].practiceGamesPlayedToday < 24, "Daily limit reached");
            require(users[_player].practiceBalance >= _amount, "Insufficient balance");
            
            users[_player].practiceBalance -= _amount;
            users[_player].practiceGamesPlayedToday++;
        }
        
        // Store bet
        Bet memory newBet = Bet({
            player: _player,
            amount: _amount,
            prediction: _prediction,
            claimed: false
        });
        
        if (_isCashGame) {
            cashBets[_player][_roundId] = newBet;
            userPlayedCashRounds[_player].push(_roundId);
            
            // Track bet by number
            cashBetTotalsByNumber[_roundId][_prediction] += _amount;
            cashBettersByNumber[_roundId][_prediction].push(_player);
            cashUserBetAmounts[_roundId][_player] = _amount;
        } else {
            practiceBets[_player][_roundId] = newBet;
            userPlayedPracticeRounds[_player].push(_roundId);
            
            // Track bet by number
            practiceBetTotalsByNumber[_roundId][_prediction] += _amount;
            practiceBettersByNumber[_roundId][_prediction].push(_player);
            practiceUserBetAmounts[_roundId][_player] = _amount;
        }
        
        // Add to round pool
        round.totalPool += _amount;
        
        // Add to user bet history
        userBetHistory[_player].push(BetRecord({
            roundId: _roundId,
            betAmount: _amount,
            prediction: _prediction,
            winningNumber: 999, // Not set yet
            won: false,
            payout: 0,
            timestamp: block.timestamp,
            isCashGame: _isCashGame
        }));
        
        // Increment counters
        users[_player].totalBets++;
        totalBetsGlobal++;
        
        emit BetPlaced(_player, _roundId, _amount, _prediction, _isCashGame);
    }
    
    function claimWin(uint256 _roundId, bool _isCashGame) external nonReentrant whenNotPaused {
        Round storage round = _isCashGame ? cashRounds[_roundId] : practiceRounds[_roundId];
        require(round.isClosed, "Round not closed");
        
        Bet storage bet = _isCashGame ? cashBets[msg.sender][_roundId] : practiceBets[msg.sender][_roundId];
        require(bet.amount > 0, "No bet found");
        require(!bet.claimed, "Already claimed");
        require(bet.prediction == round.winningNumber, "Not a winner");
        
        bet.claimed = true;
        
        // Calculate payouts
        uint256 cashout = bet.amount * WIN_CASHOUT_MULTIPLIER;
        uint256 reinvest = bet.amount * WIN_REINVEST_MULTIPLIER;
        
        if (_isCashGame) {
            users[msg.sender].cashGameBalance += reinvest;
            users[msg.sender].walletBalance += cashout;
            
            // Winner Referral (15% of cashout distributed to upline)
            uint256 refPool = (cashout * WINNER_REFERRAL_PERCENT) / 100;
            _distributeMultiLevelCommission(msg.sender, refPool, CommissionType.WINNER);
            
            // Track winner
            cashRoundWinners[_roundId].push(msg.sender);
            cashWinnerPayouts[_roundId][msg.sender] = cashout;
            
            // Record distribution
            _recordDistribution(_roundId, msg.sender, cashout);
        } else {
            users[msg.sender].practiceBalance += (reinvest + cashout);
            
            // Practice Winner Referral (15% of cashout distributed to upline as practice balance)
            uint256 practiceRefPool = (cashout * WINNER_REFERRAL_PERCENT) / 100;
            _distributeMultiLevelCommission(msg.sender, practiceRefPool, CommissionType.PRACTICE);
            
            // Track winner
            practiceRoundWinners[_roundId].push(msg.sender);
            practiceWinnerPayouts[_roundId][msg.sender] = cashout;
            
            // Record distribution
            _recordDistribution(_roundId, msg.sender, cashout);
        }
        
        // Update bet history
        for (uint256 i = 0; i < userBetHistory[msg.sender].length; i++) {
            if (userBetHistory[msg.sender][i].roundId == _roundId && 
                userBetHistory[msg.sender][i].isCashGame == _isCashGame) {
                userBetHistory[msg.sender][i].winningNumber = round.winningNumber;
                userBetHistory[msg.sender][i].won = true;
                userBetHistory[msg.sender][i].payout = cashout;
                break;
            }
        }
        
        // Increment win counter
        users[msg.sender].totalWins++;
        totalWinsGlobal++;
        
        emit WinClaimed(msg.sender, cashout, reinvest);
    }
    
    function claimLoss(uint256 _roundId, bool _isCashGame) external nonReentrant whenNotPaused {
        Round storage round = _isCashGame ? cashRounds[_roundId] : practiceRounds[_roundId];
        require(round.isClosed, "Round not closed");
        
        Bet storage bet = _isCashGame ? cashBets[msg.sender][_roundId] : practiceBets[msg.sender][_roundId];
        require(bet.amount > 0, "No bet found");
        require(!bet.claimed, "Already claimed");
        require(bet.prediction != round.winningNumber, "You won, use claimWin");
        
        bet.claimed = true;
        
        if (_isCashGame) {
            // 5% cashback to loser
            uint256 cashback = (bet.amount * LOSS_CASHBACK_PERCENT) / 100;
            users[msg.sender].walletBalance += cashback;
            users[msg.sender].cashbackIncome += cashback;
            protectionPoolBalance -= cashback;
            
            // 1% to referrer
            if (users[msg.sender].referrer != address(0)) {
                uint256 refBonus = (bet.amount * LOSS_REFERRAL_PERCENT) / 100;
                users[users[msg.sender].referrer].walletBalance += refBonus;
                users[users[msg.sender].referrer].lossReferralIncome += refBonus;
                protectionPoolBalance -= refBonus;
            }
        }
        
        // Update bet history
        for (uint256 i = 0; i < userBetHistory[msg.sender].length; i++) {
            if (userBetHistory[msg.sender][i].roundId == _roundId && 
                userBetHistory[msg.sender][i].isCashGame == _isCashGame) {
                userBetHistory[msg.sender][i].winningNumber = round.winningNumber;
                userBetHistory[msg.sender][i].won = false;
                userBetHistory[msg.sender][i].payout = 0;
                break;
            }
        }
        
        // Increment loss counter
        users[msg.sender].totalLosses++;
        totalLossesGlobal++;
    }
    
    function _recordDistribution(uint256 _roundId, address _winner, uint256 _totalPayout) private {
        distributionHistory.push(DistributionRecord({
            roundId: _roundId,
            winner: _winner,
            totalPayout: _totalPayout,
            timestamp: block.timestamp
        }));
    }
    
    function withdraw(uint256 _amount) external nonReentrant whenNotPaused {
        require(users[msg.sender].walletBalance >= _amount, "Insufficient balance");
        users[msg.sender].walletBalance -= _amount;
        users[msg.sender].totalWithdrawn += _amount;
        totalWithdrawnGlobal += _amount;
        require(usdtToken.transfer(msg.sender, _amount), "Transfer failed");
        emit Withdrawn(msg.sender, _amount);
    }
    
    // View Functions
    function getUserBasicInfo(address _user) external view returns (
        uint256 userId, bool isRegistered, bool isPractice, bool isCash, uint256 directReferrals
    ) {
        User storage u = users[_user];
        return (u.userId, u.isRegistered, u.isPracticePlayer, u.isCashPlayer, u.directReferrals);
    }
    
    function getUserBalances(address _user) external view returns (
        uint256 walletBalance, uint256 practiceBalance, uint256 cashGameBalance,
        uint256 cashbackIncome, uint256 teamVolume, uint256 totalDeposit
    ) {
        User storage u = users[_user];
        return (u.walletBalance, u.practiceBalance, u.cashGameBalance, u.cashbackIncome, u.teamVolume, u.totalDeposit);
    }
    
    function getUserStats() external view returns (uint256, uint256, uint256, uint256) {
        return (totalUsers, totalUsers, totalVolume, totalWithdrawnGlobal);
    }
    
    function getPools() external view returns (uint256, uint256, uint256, uint256) {
        return (gamePoolBalance, clubPoolBalance, luckyDrawBalance, protectionPoolBalance);
    }
    
    // ==================== ADMIN VIEW FUNCTIONS ====================
    
    // Get bet totals for each number (0-9) in a round
    function getRoundBetTotals(uint256 _roundId, bool _isCashGame) external view returns (uint256[10] memory) {
        uint256[10] memory totals;
        for (uint256 i = 0; i < 10; i++) {
            totals[i] = _isCashGame ? cashBetTotalsByNumber[_roundId][i] : practiceBetTotalsByNumber[_roundId][i];
        }
        return totals;
    }
    
    // Get detailed bets for a specific number in a round
    function getRoundBetsByNumber(uint256 _roundId, uint256 _number, bool _isCashGame) external view returns (
        address[] memory betters,
        uint256[] memory amounts
    ) {
        address[] memory addrs = _isCashGame ? cashBettersByNumber[_roundId][_number] : practiceBettersByNumber[_roundId][_number];
        uint256[] memory amts = new uint256[](addrs.length);
        
        for (uint256 i = 0; i < addrs.length; i++) {
            amts[i] = _isCashGame ? cashUserBetAmounts[_roundId][addrs[i]] : practiceUserBetAmounts[_roundId][addrs[i]];
        }
        
        return (addrs, amts);
    }
    
    // Get winners for a round
    function getRoundWinners(uint256 _roundId, bool _isCashGame) external view returns (
        address[] memory winners,
        uint256[] memory payouts
    ) {
        address[] memory addrs = _isCashGame ? cashRoundWinners[_roundId] : practiceRoundWinners[_roundId];
        uint256[] memory pays = new uint256[](addrs.length);
        
        for (uint256 i = 0; i < addrs.length; i++) {
            pays[i] = _isCashGame ? cashWinnerPayouts[_roundId][addrs[i]] : practiceWinnerPayouts[_roundId][addrs[i]];
        }
        
        return (addrs, pays);
    }
    
    // Get user bet history with pagination
    function getUserBetHistory(address _user, uint256 _offset, uint256 _limit) external view returns (
        BetRecord[] memory records
    ) {
        uint256 total = userBetHistory[_user].length;
        if (_offset >= total) {
            return new BetRecord[](0);
        }
        
        uint256 end = _offset + _limit > total ? total : _offset + _limit;
        uint256 size = end - _offset;
        
        BetRecord[] memory result = new BetRecord[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = userBetHistory[_user][_offset + i];
        }
        
        return result;
    }
    
    // Get distribution history with pagination
    function getDistributionHistory(uint256 _offset, uint256 _limit) external view returns (
        DistributionRecord[] memory records
    ) {
        uint256 total = distributionHistory.length;
        if (_offset >= total) {
            return new DistributionRecord[](0);
        }
        
        uint256 end = _offset + _limit > total ? total : _offset + _limit;
        uint256 size = end - _offset;
        
        DistributionRecord[] memory result = new DistributionRecord[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = distributionHistory[_offset + i];
        }
        
        return result;
    }
    
    // Get level-wise income breakdown for a user
    function getLevelIncomeBreakdown(address _user) external view returns (
        uint256[15] memory directByLevel,
        uint256[15] memory winnerByLevel,
        uint256[15] memory practiceByLevel
    ) {
        return (
            users[_user].directReferralIncomeByLevel,
            users[_user].winnerReferralIncomeByLevel,
            users[_user].practiceReferralIncomeByLevel
        );
    }
    
    // NEW: Get all rounds where user has a pending claim (win or loss)
    function getUnclaimedRounds(address _user, bool _isCashGame) external view returns (uint256[] memory) {
        uint256[] storage userRounds = _isCashGame ? userPlayedCashRounds[_user] : userPlayedPracticeRounds[_user];
        uint256 count = 0;
        
        // First pass: count unclaimed
        for (uint256 i = 0; i < userRounds.length; i++) {
            uint256 rid = userRounds[i];
            Bet storage bet = _isCashGame ? cashBets[_user][rid] : practiceBets[_user][rid];
            Round storage round = _isCashGame ? cashRounds[rid] : practiceRounds[rid];
            
            if (round.isClosed && !bet.claimed) {
                count++;
            }
        }
        
        uint256[] memory unclaimed = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < userRounds.length; i++) {
            uint256 rid = userRounds[i];
            Bet storage bet = _isCashGame ? cashBets[_user][rid] : practiceBets[_user][rid];
            Round storage round = _isCashGame ? cashRounds[rid] : practiceRounds[rid];
            
            if (round.isClosed && !bet.claimed) {
                unclaimed[index] = rid;
                index++;
            }
        }
        return unclaimed;
    }
    
    // Get BD wallets
    function getBDWallets() external view returns (address[20] memory) {
        return bdWallets;
    }
    
    // Get user bet history count
    function getUserBetHistoryCount(address _user) external view returns (uint256) {
        return userBetHistory[_user].length;
    }
    
    // Get total distribution records count
    function getDistributionHistoryCount() external view returns (uint256) {
        return distributionHistory.length;
    }
    // ==================== EMERGENCY / RECOVERY ====================
    
    /**
     * @notice Recover tokens sent exclusively to the contract logic
     * Allows admin to rescue tokens including USDT if they are "stuck" (not allocated)
     */
    function recoverERC20(address _token, uint256 _amount) external onlyAdmin {
        IERC20(_token).transfer(msg.sender, _amount);
    }

    /**
     * @notice Manually credit a user (e.g. for fixing direct transfers)
     * Checks if contract has surplus balance and credits user
     */
    function manualCreditDeposit(address _user, uint256 _amount) external onlyAdmin {
        // Ensure we only credit what is actually physically in the contract but unaccounted for
        uint256 allocated = gamePoolBalance + clubPoolBalance + luckyDrawBalance + protectionPoolBalance;
        require(usdtToken.balanceOf(address(this)) >= (allocated + _amount), "No surplus funds detected");
        
        if (!users[_user].isRegistered) {
            _internalRegister(_user, address(0)); 
        }

        users[_user].totalDeposit += _amount;
        users[_user].cumulativeDeposit += _amount;
        users[_user].cashGameBalance += _amount; // Credit as playable
        users[_user].isCashPlayer = true;
        users[_user].practiceBalance = 0;
        
        // Update upline volume
        address upline = users[_user].referrer;
        while(upline != address(0)) {
            users[upline].teamVolume += _amount;
            upline = users[upline].referrer;
        }
        
        // Run standard distribution (allocates the surplus to pools)
        _distributeDeposit(_amount);
        
        emit Deposited(_user, _amount);
    }
    // Setters
    function setTreasuryWallet(address _newTreasury) external onlyAdmin {
        require(_newTreasury != address(0), "Invalid address");
        treasuryWallet = _newTreasury;
    }
}
