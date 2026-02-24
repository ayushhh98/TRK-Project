const User = require('../models/User');
const Game = require('../models/Game');
const SystemConfig = require('../models/SystemConfig');
const Commission = require('../models/Commission');
const { logger } = require('../utils/logger');

/**
 * Practice Service
 * Handles real-time broadcasts and logic for the practice ecosystem
 */
class PracticeService {
    constructor(io) {
        this.io = io;
    }

    /**
     * broadcastStats
     * Calculates and emits global practice metrics to the admin dashboard
     */
    async broadcastStats() {
        try {
            if (!this.io) return;

            const now = new Date();
            const config = await SystemConfig.findOne({ key: 'default' });

            // 1. Global Practice Stats
            const totalPracticeUsers = await User.countDocuments({ role: 'player', practiceBalance: { $exists: true } });

            const activePracticeUsers = await User.countDocuments({
                role: 'player',
                practiceBalance: { $gt: 0 },
                practiceExpiry: { $gt: now }
            });

            const expiredPracticeUsers = await User.countDocuments({
                role: 'player',
                practiceBalance: { $exists: true },
                practiceExpiry: { $lt: now }
            });

            // Sum of all currently issued practice tokens
            const balanceResult = await User.aggregate([
                { $match: { role: 'player' } },
                { $group: { _id: null, total: { $sum: '$practiceBalance' } } }
            ]);
            const practiceBalanceIssued = balanceResult[0]?.total || 0;

            // 2. Game Logic Monitoring (Virtual)
            const practiceGames = await Game.aggregate([
                { $match: { gameType: 'practice', status: 'resolved' } },
                {
                    $group: {
                        _id: null,
                        totalPlayed: { $sum: 1 },
                        totalWins: { $sum: { $cond: ["$isWin", 1, 0] } },
                        totalLosses: { $sum: { $cond: ["$isWin", 0, 1] } },
                        totalBurned: { $sum: { $cond: [{ $eq: ["$isWin", false] }, "$betAmount", 0] } }
                    }
                }
            ]);
            const gameStats = practiceGames[0] || { totalPlayed: 0, totalWins: 0, totalLosses: 0, totalBurned: 0 };

            // 3. Real-Time MLM Actual Flow Aggregation
            const actualCommissionAgg = await Commission.aggregate([
                { $match: { status: 'credited', type: { $ne: 'signup_bonus' } } },
                {
                    $group: {
                        _id: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$level", 1] }, then: "lvl1" },
                                    { case: { $and: [{ $gte: ["$level", 2] }, { $lte: ["$level", 5] }] }, then: "lvl2_5" },
                                    { case: { $and: [{ $gte: ["$level", 6] }, { $lte: ["$level", 10] }] }, then: "lvl6_10" },
                                    { case: { $and: [{ $gte: ["$level", 11] }, { $lte: ["$level", 15] }] }, then: "lvl11_15" }
                                ],
                                default: "other"
                            }
                        },
                        totalAmount: { $sum: "$amount" }
                    }
                }
            ]);

            const actualFlow = {
                lvl1: 0,
                lvl2_5: 0,
                lvl6_10: 0,
                lvl11_15: 0,
                total: 0
            };

            actualCommissionAgg.forEach(item => {
                if (actualFlow.hasOwnProperty(item._id)) {
                    actualFlow[item._id] = item.totalAmount;
                    actualFlow.total += item.totalAmount;
                }
            });

            // 4. Conversion Funnel Tracker
            const eligibleForConversion = await User.countDocuments({ role: 'player', 'activation.tier': { $in: ['tier1', 'tier2'] }, practiceBalance: { $gt: 0 } });
            const convertedToRealCount = await User.countDocuments({ role: 'player', 'activation.tier': { $in: ['tier1', 'tier2'] } });

            const bonusAmount = config?.practice?.bonusAmount || 100;
            const maxUsers = config?.practice?.maxUsers || 100000;
            const expiryDays = config?.practice?.expiryDays || 30;

            const practicePayload = {
                globalStats: {
                    totalPracticeUsers,
                    activePracticeUsers,
                    expiredAccounts: expiredPracticeUsers,
                    practiceBalanceIssued,
                    burnedPracticePoints: gameStats.totalBurned
                },
                bonusControl: {
                    bonusAmount,
                    maxUsers,
                    creditType: 'Practice Wallet',
                    expiryWindowDays: expiryDays
                },
                gameLogic: {
                    practiceGamesPlayed: gameStats.totalPlayed,
                    practiceWins: gameStats.totalWins,
                    practiceLosses: gameStats.totalLosses
                },
                conversionFunnel: {
                    eligibleForConversion,
                    convertedToRealCount,
                    conversionRate: totalPracticeUsers > 0 ? ((convertedToRealCount / totalPracticeUsers) * 100).toFixed(2) : 0
                },
                mlmActualFlow: actualFlow,
                timestamp: now.toISOString()
            };

            this.io.emit('admin:practice_stats_update', practicePayload);
        } catch (error) {
            logger.error('Failed to broadcast practice stats:', error.message);
        }
    }
}

module.exports = PracticeService;
