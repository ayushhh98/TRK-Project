const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================
// LOSERS ROI ON ROI - PASSIVE INCOME SYSTEM
// ============================================

// Administrative State for ROI Commission Rates (15 Levels)
let ROI_COMMISSION_RATES = {
    1: 0.20,      // Level 1: 20%
    2: 0.10,      // Level 2-5: 10%
    3: 0.10,
    4: 0.10,
    5: 0.10,
    6: 0.05,      // Level 6-10: 5%
    7: 0.05,
    8: 0.05,
    9: 0.05,
    10: 0.05,
    11: 0.03,     // Level 11-15: 3%
    12: 0.03,
    13: 0.03,
    14: 0.03,
    15: 0.03,
};

// Administrative State for Pool Allocation
let CASHBACK_POOL_ALLOCATION = 0.50;  // 50% of cashback goes to referral pool

// Admin Control: Update ROI Commission Rates
router.post('/admin/update-rates', auth, async (req, res) => {
    try {
        const { rates } = req.body; // Expecting an object { level: rate }

        if (rates && typeof rates === 'object') {
            Object.keys(rates).forEach(level => {
                if (ROI_COMMISSION_RATES[level] !== undefined) {
                    ROI_COMMISSION_RATES[level] = parseFloat(rates[level]);
                }
            });
        }

        res.status(200).json({ status: 'success', message: 'ROI rates updated', data: ROI_COMMISSION_RATES });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update ROI rates' });
    }
});

// Admin Control: Update Pool Allocation
router.post('/admin/update-allocation', auth, async (req, res) => {
    try {
        const { allocation } = req.body;
        if (allocation !== undefined) {
            CASHBACK_POOL_ALLOCATION = parseFloat(allocation);
        }
        res.status(200).json({ status: 'success', message: 'Pool allocation updated', data: CASHBACK_POOL_ALLOCATION });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update pool allocation' });
    }
});

// Get Yield Analytics (Daily/Weekly Trend)
router.get('/analytics', auth, async (req, res) => {
    try {
        // In production, this would pull from a daily stats collection
        const performanceData = [
            { day: 'Mon', value: 0, members: 0 },
            { day: 'Tue', value: 0, members: 0 },
            { day: 'Wed', value: 0, members: 0 },
            { day: 'Thu', value: 0, members: 0 },
            { day: 'Fri', value: 0, members: 0 },
            { day: 'Sat', value: 0, members: 0 },
            { day: 'Sun', value: 0, members: 0 },
        ];

        res.status(200).json({
            status: 'success',
            data: {
                performanceData,
                weeklyTotal: 0,
                growthRate: '0%'
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get yield analytics' });
    }
});

// Get ROI on ROI dashboard
router.get('/dashboard', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const teamStats = {
            totalTeamMembers: (user.referrals?.length || 0),
            activeMembers: user.teamStats?.activeMembers || 0,
            teamCashbackToday: user.cashbackStats?.todayCashback || 0,
            teamCashbackTotal: user.cashbackStats?.totalRecovered || 0,
        };

        const poolForDistribution = teamStats.teamCashbackToday * CASHBACK_POOL_ALLOCATION;

        const levelBreakdown = [];
        for (let level = 1; level <= 15; level++) {
            const rate = ROI_COMMISSION_RATES[level];
            levelBreakdown.push({
                level,
                rate: `${(rate * 100).toFixed(0)}%`,
                members: 0, // Placeholder for member count per level
                teamCashback: 0,
                poolShare: 0,
                yourEarning: 0,
                isUnlocked: level <= (user.referrals?.length || 0) + 2
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                overview: {
                    todayEarnings: 0,
                    totalEarnings: parseFloat((user.realBalances?.roiOnRoi || 0).toFixed(2)),
                    teamCashbackToday: teamStats.teamCashbackToday,
                    poolForDistribution: parseFloat(poolForDistribution.toFixed(2)),
                    poolAllocation: `${(CASHBACK_POOL_ALLOCATION * 100).toFixed(0)}%`,
                    unlockedLevels: Math.min(15, (user.referrals?.length || 0) + 2)
                },
                teamStats,
                levelBreakdown,
                commissionStructure: [
                    { range: 'Level 1', rate: `${(ROI_COMMISSION_RATES[1] * 100).toFixed(0)}%` },
                    { range: 'Level 2-5', rate: `${(ROI_COMMISSION_RATES[2] * 100).toFixed(0)}%` },
                    { range: 'Level 6-10', rate: `${(ROI_COMMISSION_RATES[6] * 100).toFixed(0)}%` },
                    { range: 'Level 11-15', rate: `${(ROI_COMMISSION_RATES[11] * 100).toFixed(0)}%` },
                ]
            }
        });

    } catch (error) {
        console.error('Get ROI dashboard error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get ROI dashboard' });
    }
});

// Get ROI earnings history
router.get('/history', auth, async (req, res) => {
    try {
        // For production, pull from real transaction logs
        res.status(200).json({
            status: 'success',
            data: { history: [] }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get ROI history' });
    }
});

// Process daily ROI on ROI (Triggered by Cron or Admin)
router.post('/process-daily', async (req, res) => {
    try {
        const { adminKey } = req.body;
        if (adminKey !== process.env.ADMIN_KEY && req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
            return res.status(403).json({ status: 'error', message: 'Unauthorized' });
        }

        const usersWithCashback = await User.find({ 'cashbackStats.todayCashback': { $gt: 0 } });
        let totalDistributed = 0;

        for (const user of usersWithCashback) {
            const poolAmount = user.cashbackStats.todayCashback * CASHBACK_POOL_ALLOCATION;
            let currentUser = user;
            let currentLevel = 1;

            while (currentUser?.referredBy && currentLevel <= 15) {
                const upline = await User.findById(currentUser.referredBy);
                if (upline) {
                    const commission = poolAmount * ROI_COMMISSION_RATES[currentLevel];
                    upline.realBalances.roiOnRoi = (upline.realBalances.roiOnRoi || 0) + commission;
                    await upline.save();
                    totalDistributed += commission;
                }
                currentUser = upline;
                currentLevel++;
            }
            user.cashbackStats.todayCashback = 0;
            await user.save();
        }

        res.status(200).json({
            status: 'success',
            message: 'Daily ROI processed',
            data: { totalDistributed: parseFloat(totalDistributed.toFixed(2)) }
        });
    } catch (error) {
        console.error('Daily ROI processing error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to process daily ROI' });
    }
});

module.exports = router;
