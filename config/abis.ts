// Game ABI for TRKGameFinalImpl
export const TRKGameABI = [
    {
        "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
        "name": "users",
        "outputs": [
            { "internalType": "uint256", "name": "userId", "type": "uint256" },
            { "internalType": "address", "name": "referrer", "type": "address" },
            { "internalType": "uint256", "name": "registrationTime", "type": "uint256" },
            { "internalType": "uint256", "name": "walletBalance", "type": "uint256" },
            { "internalType": "uint256", "name": "practiceBalance", "type": "uint256" },
            { "internalType": "uint256", "name": "cashGameBalance", "type": "uint256" },
            { "internalType": "uint256", "name": "totalDeposit", "type": "uint256" },
            { "internalType": "uint256", "name": "totalWithdrawn", "type": "uint256" },
            { "internalType": "uint256", "name": "directReferralIncome", "type": "uint256" },
            { "internalType": "uint256", "name": "winnerReferralIncome", "type": "uint256" },
            { "internalType": "uint256", "name": "practiceReferralIncome", "type": "uint256" },
            { "internalType": "uint256", "name": "cashbackIncome", "type": "uint256" },
            { "internalType": "uint256", "name": "lossReferralIncome", "type": "uint256" },
            { "internalType": "uint256", "name": "clubIncome", "type": "uint256" },
            { "internalType": "uint256", "name": "luckyDrawIncome", "type": "uint256" },
            { "internalType": "uint256", "name": "cumulativeDeposit", "type": "uint256" },
            { "internalType": "uint256", "name": "practiceGamesPlayedToday", "type": "uint256" },
            { "internalType": "uint256", "name": "cashGamesPlayedToday", "type": "uint256" },
            { "internalType": "uint256", "name": "lastGameDate", "type": "uint256" },
            { "internalType": "uint256", "name": "totalBets", "type": "uint256" },
            { "internalType": "uint256", "name": "totalWins", "type": "uint256" },
            { "internalType": "uint256", "name": "totalLosses", "type": "uint256" },
            { "internalType": "bool", "name": "isRegistered", "type": "bool" },
            { "internalType": "bool", "name": "isPracticePlayer", "type": "bool" },
            { "internalType": "bool", "name": "isCashPlayer", "type": "bool" },
            { "internalType": "uint256", "name": "directReferrals", "type": "uint256" },
            { "internalType": "uint256", "name": "teamVolume", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "_user", "type": "address" },
            { "internalType": "bool", "name": "_isCashGame", "type": "bool" }
        ],
        "name": "getUnclaimedRounds",
        "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }],
        "name": "getLevelIncomeBreakdown",
        "outputs": [
            { "internalType": "uint256[15]", "name": "direct", "type": "uint256[15]" },
            { "internalType": "uint256[15]", "name": "winner", "type": "uint256[15]" },
            { "internalType": "uint256[15]", "name": "practice", "type": "uint256[15]" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_referrer", "type": "address" }],
        "name": "register",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }],
        "name": "depositCashGame",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "_roundId", "type": "uint256" },
            { "internalType": "uint256", "name": "_prediction", "type": "uint256" },
            { "internalType": "uint256", "name": "_amount", "type": "uint256" }
        ],
        "name": "placeBetDirect",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "_roundId", "type": "uint256" },
            { "internalType": "uint256", "name": "_prediction", "type": "uint256" },
            { "internalType": "uint256", "name": "_amount", "type": "uint256" },
            { "internalType": "bool", "name": "_isCashGame", "type": "bool" }
        ],
        "name": "placeBet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "_roundId", "type": "uint256" },
            { "internalType": "bool", "name": "_isCashGame", "type": "bool" }
        ],
        "name": "claimWin",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "_roundId", "type": "uint256" },
            { "internalType": "bool", "name": "_isCashGame", "type": "bool" }
        ],
        "name": "claimLoss",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }],
        "name": "getUserBasicInfo",
        "outputs": [
            { "internalType": "uint256", "name": "userId", "type": "uint256" },
            { "internalType": "bool", "name": "isRegistered", "type": "bool" },
            { "internalType": "bool", "name": "isPractice", "type": "bool" },
            { "internalType": "bool", "name": "isCash", "type": "bool" },
            { "internalType": "uint256", "name": "directReferrals", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }],
        "name": "getUserBalances",
        "outputs": [
            { "internalType": "uint256", "name": "walletBalance", "type": "uint256" },
            { "internalType": "uint256", "name": "practiceBalance", "type": "uint256" },
            { "internalType": "uint256", "name": "cashGameBalance", "type": "uint256" },
            { "internalType": "uint256", "name": "cashbackIncome", "type": "uint256" },
            { "internalType": "uint256", "name": "teamVolume", "type": "uint256" },
            { "internalType": "uint256", "name": "totalDeposit", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "currentCashRoundId",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "currentPracticeRoundId",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;

export const GameABI = TRKGameABI;

export const TRKLuckyDrawABI = [
    {
        "inputs": [{ "internalType": "uint256", "name": "_quantity", "type": "uint256" }],
        "name": "buyTickets",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "ticketPrice",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalTickets",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "currentTicketCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "currentRound",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getProgress",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export const ERC20ABI = [
    {
        "constant": true,
        "inputs": [{ "name": "_owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "balance", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            { "name": "_spender", "type": "address" },
            { "name": "_value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "success", "type": "bool" }],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            { "name": "_owner", "type": "address" },
            { "name": "_spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "name": "remaining", "type": "uint256" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "faucet",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
] as const;
