const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================
// 7 INCOME STRUCTURE - CONFIGURATION
// ============================================

// 1. Winners 8X Income Configuration
const WINNERS_8X_CONFIG = {
    totalMultiplier: 8,
    directPayout: 2,      // 2X → Direct Wallet Payout
    autoCompound: 6,      // 6X → Auto Compound into Game Wallet
};

// 2. Direct Level Income (from team deposits)
// Requires 10 USDT activation
// Each direct opens ONE level (max 10 directs for all 15 levels)
const DIRECT_LEVEL_RATES = {
    1: 0.05,      // Level 1: 5%
    2: 0.02,      // Level 2: 2%
    3: 0.01,      // Level 3-5: 1%
    4: 0.01,
    5: 0.01,
    6: 0.005,     // Level 6-15: 0.5%
    7: 0.005,
    8: 0.005,
    9: 0.005,
    10: 0.005,
    11: 0.005,
    12: 0.005,
    13: 0.005,
    14: 0.005,
    15: 0.005,
};

// 3. Winner Level Income (15% total from team wins)
const WINNER_LEVEL_RATES = {
    1: 0.05,      // Level 1: 5%
    2: 0.02,      // Level 2: 2%
    3: 0.01,      // Level 3-5: 1%
    4: 0.01,
    5: 0.01,
    6: 0.005,     // Level 6-15: 0.5%
    7: 0.005,
    8: 0.005,
    9: 0.005,
    10: 0.005,
    11: 0.005,
    12: 0.005,
    13: 0.005,
    14: 0.005,
    15: 0.005,
};

// Calculate unlocked levels based on direct referrals
const getUnlockedLevels = (directReferrals) => {
    // Each direct opens ONE level, max 10 directs for all 15 levels
    if (directReferrals >= 10) return 15;
    return Math.min(directReferrals, 15);
};

// Get income structure overview
router.get('/structure', async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            data: {
                totalIncomeStreams: 7,
                activeIncome: [
                    {
                        id: 1,
                        name: 'Winners 8X Income',
                        description: 'Win the game and receive massive multiplier-based rewards',
                        details: {
                            totalMultiplier: '8X',
                            directPayout: '2X → Direct Wallet Payout',
                            autoCompound: '6X → Auto Compound into Game Wallet'
                        },
                        icon: '💎'
                    },
                    {
                        id: 2,
                        name: 'Direct Level Income',
                        description: 'Earn commissions from team deposits',
                        activation: '10 USDT activation mandatory',
                        condition: 'Each Direct opens ONE LEVEL. 10 Directs required for all 15 levels.',
                        rates: [
                            { levels: 'Level 1', rate: '5%' },
                            { levels: 'Level 2', rate: '2%' },
                            { levels: 'Level 3-5', rate: '1%' },
                            { levels: 'Level 6-15', rate: '0.5%' }
                        ],
                        icon: '👥'
                    },
                    {
                        id: 3,
                        name: 'Winner Level Income',
                        description: 'Earn when your team members win games',
                        totalCommission: '15%',
                        rates: [
                            { levels: 'Level 1', rate: '5%' },
                            { levels: 'Level 2', rate: '2%' },
                            { levels: 'Level 3-5', rate: '1%' },
                            { levels: 'Level 6-15', rate: '0.5%' }
                        ],
                        icon: '🏅'
                    }
                ],
                passiveIncome: [
                    {
                        id: 4,
                        name: 'Cashback Protection',
                        description: '1% daily on net losses until fully recovered',
                        icon: '🛡️'
                    },
                    {
                        id: 5,
                        name: 'Lucky Draw',
                        description: 'Daily lucky draw tickets from gameplay',
                        icon: '🎫'
                    },
                    {
                        id: 6,
                        name: 'Club Income',
                        description: 'Rank-based rewards from global pool',
                        icon: '🏆'
                    },
                    {
                        id: 7,
                        name: 'Practice Referral Rewards',
                        description: 'Earn from 100 levels of practice referrals',
                        icon: '🎁'
                    }
                ]
            }
        });
    } catch (error) {
        console.error('Get income structure error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get income structure'
        });
    }
});

// Get user's income dashboard
router.get('/dashboard', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const directReferrals = user.referrals?.length || 0;
        const unlockedLevels = getUnlockedLevels(directReferrals);
        const isActivated = user.activation?.tier !== 'none';

        // Income data (Real-time aggregation)
        const incomeData = {
            winners8X: {
                totalWins: user.gamesWon || 0,
                directPayout: user.realBalances?.winners || 0, // Simplified for dashboard
                autoCompound: 0,
                totalEarned: user.realBalances?.winners || 0
            },
            directLevel: {
                isActivated,
                directReferrals,
                unlockedLevels,
                requiredDirects: 10,
                levelBreakdown: [], // Future: Implement real per-level aggregation if needed
                totalEarned: user.realBalances?.directLevel || 0
            },
            winnerLevel: {
                isActivated,
                unlockedLevels,
                totalTeamWins: 0, // Future: Aggregation
                levelBreakdown: [],
                totalEarned: user.realBalances?.winners || 0
            }
        };

        res.status(200).json({
            status: 'success',
            data: {
                activation: {
                    tier: user.activation?.tier || 'none',
                    isActivated,
                    directReferrals,
                    unlockedLevels,
                    message: !isActivated
                        ? '10 USDT activation required to unlock Direct Level Income'
                        : directReferrals < 10
                            ? `Refer ${10 - directReferrals} more to unlock all 15 levels`
                            : 'All 15 levels unlocked!'
                },
                income: incomeData,
                totals: {
                    winners8X: incomeData.winners8X.totalEarned,
                    directLevel: incomeData.directLevel.totalEarned,
                    winnerLevel: incomeData.winnerLevel.totalEarned,
                    grandTotal: incomeData.winners8X.totalEarned +
                        incomeData.directLevel.totalEarned +
                        incomeData.winnerLevel.totalEarned
                }
            }
        });

    } catch (error) {
        console.error('Get income dashboard error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get income dashboard'
        });
    }
});

// Process winner payout (called when user wins a game)
router.post('/process-win', auth, async (req, res) => {
    try {
        const { betAmount, totalPayout } = req.body;
        const user = await User.findById(req.user.id);

        // Calculate 8X split
        const directPayoutMultiplier = WINNERS_8X_CONFIG.directPayout;  // 2X
        const compoundMultiplier = WINNERS_8X_CONFIG.autoCompound;      // 6X

        const directPayout = betAmount * directPayoutMultiplier;
        const autoCompound = betAmount * compoundMultiplier;

        // Add to balances
        // SWEEPSTAKES: Commissions paid in Reward Points (SC)
        // user.realBalances.cash += directPayout;    // Legacy
        // user.realBalances.game += autoCompound;    // Legacy

        user.rewardPoints += totalPayout; // Full amount to SC (Redeemable)

        await user.save();

        // Process winner level income for uplines
        await processWinnerLevelIncome(user._id, totalPayout);

        res.status(200).json({
            status: 'success',
            message: 'Winner payout processed',
            data: {
                betAmount,
                directPayout,
                autoCompound,
                totalPayout: directPayout + autoCompound,
                newBalances: {
                    cash: user.realBalances.cash,
                    game: user.realBalances.game
                }
            }
        });

    } catch (error) {
        console.error('Process win error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process winner payout'
        });
    }
});

// Helper function to process winner level income for uplines
async function processWinnerLevelIncome(winnerId, winAmount) {
    try {
        let currentUser = await User.findById(winnerId);
        let currentLevel = 1;

        while (currentUser?.referredBy && currentLevel <= 15) {
            const upline = await User.findById(currentUser.referredBy);

            if (upline && upline.activation?.tier !== 'none') {
                const unlockedLevels = getUnlockedLevels(upline.referrals?.length || 0);

                if (currentLevel <= unlockedLevels) {
                    const rate = WINNER_LEVEL_RATES[currentLevel] || 0;
                    const commission = winAmount * rate;

                    upline.rewardPoints += commission;
                    await upline.save();
                }
            }

            currentUser = upline;
            currentLevel++;
        }
    } catch (error) {
        console.error('Process winner level income error:', error);
    }
}

// Process direct level income (called when someone deposits)
router.post('/process-deposit-commission', auth, async (req, res) => {
    try {
        const { depositAmount } = req.body;
        const user = await User.findById(req.user.id);

        // Process commissions for uplines
        let currentUser = user;
        let currentLevel = 1;

        while (currentUser?.referredBy && currentLevel <= 15) {
            const upline = await User.findById(currentUser.referredBy);

            if (upline && upline.activation?.tier !== 'none') {
                const unlockedLevels = getUnlockedLevels(upline.referrals?.length || 0);

                if (currentLevel <= unlockedLevels) {
                    const rate = DIRECT_LEVEL_RATES[currentLevel] || 0;
                    const commission = depositAmount * rate;

                    upline.rewardPoints += commission;
                    await upline.save();
                }
            }

            currentUser = upline;
            currentLevel++;
        }

        res.status(200).json({
            status: 'success',
            message: 'Deposit commissions processed'
        });

    } catch (error) {
        console.error('Process deposit commission error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process deposit commissions'
        });
    }
});

module.exports = router;
