const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================
// CLUB INCOME - LEADERSHIP TURNOVER POOL
// ============================================
// Rewards top leaders with a share of the platform's total daily turnover.
// Pool Allocation: 8% of total company turnover distributed daily.

// Administrative Mock State
let CLUB_RANKS = {
    'Rank 1': { poolShare: 0.02, targetVolume: 10000, name: 'Bronze Director' },
    'Rank 2': { poolShare: 0.02, targetVolume: 50000, name: 'Silver Director' },
    'Rank 3': { poolShare: 0.01, targetVolume: 250000, name: 'Gold Director' },
    'Rank 4': { poolShare: 0.01, targetVolume: 1000000, name: 'Platinum Director' },
    'Rank 5': { poolShare: 0.01, targetVolume: 5000000, name: 'Diamond Director' },
    'Rank 6': { poolShare: 0.01, targetVolume: 10000000, name: 'Crown Ambassador' }
};

let dailyTurnover = 1250000; // Default mock turnover

// 50/50 Balanced Leg Rule Verification
const checkRankQualification = (strongLegVolume, otherLegsVolume, targetVolume) => {
    // 50% Strong Leg / 50% Other Legs Rule
    const maxStrongLegContribution = targetVolume * 0.5;
    const maxOtherLegsContribution = targetVolume * 0.5;

    const qualifiedStrongLeg = Math.min(strongLegVolume, maxStrongLegContribution);
    const qualifiedOtherLegs = Math.min(otherLegsVolume, maxOtherLegsContribution);

    return (qualifiedStrongLeg + qualifiedOtherLegs) >= targetVolume;
};

// Get current rank for a user based on their team volume
const calculateUserRank = (user) => {
    const { strongLegVolume = 0, otherLegsVolume = 0 } = user.teamStats || {};

    let highestRank = 'None';
    // Sort ranks by target volume to find highest
    const sortedRanks = Object.entries(CLUB_RANKS).sort((a, b) => a[1].targetVolume - b[1].targetVolume);

    for (const [rankName, config] of sortedRanks) {
        if (checkRankQualification(strongLegVolume, otherLegsVolume, config.targetVolume)) {
            highestRank = rankName;
        }
    }
    return highestRank;
};

// Get club income status
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const totalPool = dailyTurnover * 0.08; // 8% pool

        const currentRank = calculateUserRank(user);
        const rankConfig = CLUB_RANKS[currentRank] || { poolShare: 0 };

        // Mock distribution (in production, calculate from total qualified members per rank)
        const membersInRank = {
            'Rank 1': 100, 'Rank 2': 20, 'Rank 3': 5,
            'Rank 4': 2, 'Rank 5': 1, 'Rank 6': 0
        };

        const rankShare = rankConfig.poolShare ? (dailyTurnover * rankConfig.poolShare) / (membersInRank[currentRank] || 1) : 0;

        // Progress to next rank
        const nextRankEntry = Object.entries(CLUB_RANKS)
            .sort((a, b) => a[1].targetVolume - b[1].targetVolume)
            .find(([_, config]) => config.targetVolume > (CLUB_RANKS[currentRank]?.targetVolume || 0));

        const nextRankProgress = nextRankEntry ? {
            id: nextRankEntry[0],
            name: nextRankEntry[1].name,
            target: nextRankEntry[1].targetVolume,
            current: (user.teamStats?.strongLegVolume || 0) + (user.teamStats?.otherLegsVolume || 0),
            strongLeg: user.teamStats?.strongLegVolume || 0,
            otherLegs: user.teamStats?.otherLegsVolume || 0,
            strongLegReq: nextRankEntry[1].targetVolume * 0.5,
            otherLegsReq: nextRankEntry[1].targetVolume * 0.5
        } : null;

        res.status(200).json({
            status: 'success',
            data: {
                currentRank: currentRank !== 'None' ? { id: currentRank, ...CLUB_RANKS[currentRank] } : null,
                dailyPool: {
                    totalTurnover: dailyTurnover,
                    poolPercentage: '8%',
                    totalPoolAmount: totalPool
                },
                earnings: {
                    today: parseFloat(rankShare.toFixed(2)),
                    total: user.totalRewardsWon || 0
                },
                qualification: {
                    rule: '50/50 Balanced Leg',
                    strongLegVolume: user.teamStats?.strongLegVolume || 0,
                    otherLegsVolume: user.teamStats?.otherLegsVolume || 0
                },
                nextRank: nextRankProgress,
                rankBenefits: [
                    'Direct share of total company turnover',
                    'Calculated on Balanced Team Volume',
                    'Daily consistent payouts',
                    'Scalable with ecosystem growth'
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get club status' });
    }
});

// Admin Control: Update Rank Config
router.post('/admin/update-rank', auth, async (req, res) => {
    try {
        const { rankId, poolShare, targetVolume, name } = req.body;
        if (!CLUB_RANKS[rankId]) return res.status(404).json({ status: 'error', message: 'Rank not found' });

        if (poolShare !== undefined) CLUB_RANKS[rankId].poolShare = poolShare;
        if (targetVolume !== undefined) CLUB_RANKS[rankId].targetVolume = targetVolume;
        if (name !== undefined) CLUB_RANKS[rankId].name = name;

        res.status(200).json({ status: 'success', message: 'Rank configuration updated', data: CLUB_RANKS[rankId] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update rank' });
    }
});

// Admin Control: Set Global Turnover
router.post('/admin/set-turnover', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        dailyTurnover = amount;
        res.status(200).json({ status: 'success', message: 'Global turnover updated', data: { dailyTurnover } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to set turnover' });
    }
});

// Process daily club income distribution (Cron Job)
router.post('/process-daily', async (req, res) => {
    try {
        const { adminKey, turnover } = req.body;
        if (adminKey !== process.env.ADMIN_KEY) {
            return res.status(403).json({ status: 'error', message: 'Unauthorized' });
        }

        const activeTurnover = turnover || dailyTurnover;
        const allUsers = await User.find({ 'teamStats.strongLegVolume': { $gt: 0 } });

        const qualifiedByRank = {};
        Object.keys(CLUB_RANKS).forEach(r => qualifiedByRank[r] = []);

        for (const user of allUsers) {
            const rank = calculateUserRank(user);
            if (rank !== 'None') qualifiedByRank[rank].push(user);
        }

        let distributedTotal = 0;
        let winnersCount = 0;

        for (const [rankId, users] of Object.entries(qualifiedByRank)) {
            if (users.length === 0) continue;

            const rankConfig = CLUB_RANKS[rankId];
            const rankPool = activeTurnover * rankConfig.poolShare;
            const perUserIncome = rankPool / users.length;

            for (const user of users) {
                // SWEEPSTAKES: Club rewards paid in Reward Points (SC)
                user.rewardPoints += perUserIncome;
                // user.realBalances.club = (user.realBalances.club || 0) + perUserIncome;
                user.clubRank = rankId;
                await user.save();
                distributedTotal += perUserIncome;
                winnersCount++;
            }
        }

        res.status(200).json({
            status: 'success',
            message: 'Daily club income processed',
            data: { totalTurnover: activeTurnover, totalDistributed: distributedTotal, qualifiedUsers: winnersCount }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to process club income' });
    }
});

// Get rank structure info
router.get('/structure', async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            data: {
                ranks: Object.entries(CLUB_RANKS).map(([id, config]) => ({
                    id,
                    name: config.name,
                    poolShare: `${(config.poolShare * 100).toFixed(0)}%`,
                    target: config.targetVolume
                })),
                rules: [
                    '8% of company turnover is shared daily',
                    'Qualification requires 50/50 Balanced Volume',
                    '50% volume from Strongest Leg',
                    '50% volume from combined Other Legs'
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get structure' });
    }
});

module.exports = router;
