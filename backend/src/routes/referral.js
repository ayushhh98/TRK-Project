const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Administrative Mock State for Practice Referral Rates
let PRACTICE_REFERRAL_RATES = {
    1: { percent: 10, usdt: 10 },
    '2-5': { percent: 2, usdt: 2 },
    '6-10': { percent: 1, usdt: 1 },
    '11-15': { percent: 0.5, usdt: 0.5 },
    '16-50': { percent: 0.25, usdt: 0.25 },
    '51-100': { percent: 0.10, usdt: 0.10 }
};

const getRateByLevel = (level) => {
    if (level === 1) return PRACTICE_REFERRAL_RATES[1];
    if (level >= 2 && level <= 5) return PRACTICE_REFERRAL_RATES['2-5'];
    if (level >= 6 && level <= 10) return PRACTICE_REFERRAL_RATES['6-10'];
    if (level >= 11 && level <= 15) return PRACTICE_REFERRAL_RATES['11-15'];
    if (level >= 16 && level <= 50) return PRACTICE_REFERRAL_RATES['16-50'];
    if (level >= 51 && level <= 100) return PRACTICE_REFERRAL_RATES['51-100'];
    return { percent: 0, usdt: 0 };
};

// Efficient BFS-based team calculation
const getTeamStatsRealTime = async (userId, maxLevels = 100) => {
    const stats = {
        totalMembers: 0,
        activeToday: 0,
        tier1Count: 0,
        tier2Count: 0,
        levelStats: []
    };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let currentLevelIds = [userId];
    const visited = new Set();
    visited.add(userId.toString());

    for (let level = 1; level <= maxLevels; level++) {
        const nextLevelIds = [];
        const rate = getRateByLevel(level);
        const levelData = {
            level,
            members: 0,
            active: 0,
            reward: rate.usdt,
            percent: rate.percent,
            totalEarned: 0 // This would be calculated from transactions in production
        };

        const members = await User.find({ referredBy: { $in: currentLevelIds } })
            .select('_id lastLoginAt referralCode referrals walletAddress activation');

        if (members.length === 0) break;

        for (const member of members) {
            const memberIdStr = member._id.toString();
            if (visited.has(memberIdStr)) continue;
            visited.add(memberIdStr);

            levelData.members++;
            if (member.lastLoginAt && member.lastLoginAt >= startOfDay) {
                levelData.active++;
            }
            // Track activation tiers
            if (member.activation?.tier === 'tier1') stats.tier1Count++;
            if (member.activation?.tier === 'tier2') stats.tier2Count++;

            // Mocking the 'reward' earned from this member's practice activation for visualization
            levelData.totalEarned += rate.usdt;

            nextLevelIds.push(member._id);
        }

        stats.totalMembers += levelData.members;
        stats.activeToday += levelData.active;
        stats.levelStats.push(levelData);

        currentLevelIds = nextLevelIds;
        if (currentLevelIds.length === 0) break;
    }

    return stats;
};

const MAX_DIRECT_REFERRALS = 20;

// Get referral stats and growth data (Real-Time)
router.get('/stats', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        // Calculate real-time team stats
        const realStats = await getTeamStatsRealTime(user._id);

        // Calculate real-time total earnings from all referral-based streams
        // Simplified for Sweeps model (Reward Points)
        const totalReferralEarnings = user.totalRewardsWon || 0;

        // Fetch detailed Level 1 data
        const level1Members = await User.find({ referredBy: user._id })
            .select('walletAddress activation createdAt lastLoginAt')
            .limit(20);

        // Real Growth Data (Mocking last 7 days but can be derived from team member createdAt)
        const growthData = [
            { date: 'Mon', newMembers: 2, volume: 200 },
            { date: 'Tue', newMembers: 5, volume: 500 },
            { date: 'Wed', newMembers: 3, volume: 300 },
            { date: 'Thu', newMembers: 8, volume: 800 },
            { date: 'Fri', newMembers: 12, volume: 1200 },
            { date: 'Sat', newMembers: 15, volume: 1500 },
            { date: 'Sun', newMembers: 10, volume: 1000 }
        ];

        res.status(200).json({
            status: 'success',
            data: {
                referralCode: user.referralCode,
                referralLink: `https://trk.game/ref/${user.referralCode}`,
                directReferrals: user.referrals?.length || 0,
                maxDirectReferrals: MAX_DIRECT_REFERRALS,
                totals: {
                    members: realStats.totalMembers,
                    active: realStats.activeToday,
                    totalEarned: totalReferralEarnings,
                    tier1Percent: realStats.totalMembers > 0 ? Math.round((realStats.tier1Count / realStats.totalMembers) * 100) : 0,
                    tier2Percent: realStats.totalMembers > 0 ? Math.round((realStats.tier2Count / realStats.totalMembers) * 100) : 0
                },
                levelStats: realStats.levelStats,
                level1Details: level1Members.map(m => ({
                    address: `${m.walletAddress.slice(0, 6)}...${m.walletAddress.slice(-4)}`,
                    tier: m.activation?.tier || 'none',
                    joined: m.createdAt,
                    active: m.lastLoginAt && (new Date() - m.lastLoginAt < 24 * 60 * 60 * 1000)
                })),
                growthData,
                practiceRewardStructure: Object.entries(PRACTICE_REFERRAL_RATES).map(([key, val]) => ({
                    levels: key === '1' ? 'Level 1' : `Level ${key}`,
                    percent: `${val.percent}%`,
                    usdt: `$${val.usdt}`
                }))
            }
        });
    } catch (error) {
        console.error('Referral Stats Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get referral hub stats' });
    }
});

// Admin Control: Update Rates
router.post('/admin/update-rates', auth, async (req, res) => {
    try {
        const { key, percent, usdt } = req.body;
        if (!PRACTICE_REFERRAL_RATES[key]) return res.status(404).json({ status: 'error', message: 'Rate tier not found' });

        if (percent !== undefined) PRACTICE_REFERRAL_RATES[key].percent = percent;
        if (usdt !== undefined) PRACTICE_REFERRAL_RATES[key].usdt = usdt;

        res.status(200).json({ status: 'success', message: 'Referral rates updated', data: PRACTICE_REFERRAL_RATES[key] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update rates' });
    }
});

// Apply referral code
router.post('/apply', auth, async (req, res) => {
    try {
        const { referralCode } = req.body;
        const user = await User.findById(req.user.id);

        if (user.referredBy) return res.status(400).json({ status: 'error', message: 'Already referred' });

        const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
        if (!referrer) return res.status(404).json({ status: 'error', message: 'Invalid code' });
        if (referrer._id.equals(user._id)) return res.status(400).json({ status: 'error', message: 'Self-referral not allowed' });

        user.referredBy = referrer._id;
        await user.save();

        referrer.referrals.push(user._id);
        referrer.teamStats.totalMembers += 1;
        await referrer.save();

        res.status(200).json({
            status: 'success',
            message: 'Referral successful',
            data: { referredBy: `${referrer.walletAddress.slice(0, 6)}...${referrer.walletAddress.slice(-4)}` }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to apply referral code' });
    }
});

// Get commissions history
router.get('/commissions', auth, async (req, res) => {
    try {
        const commissions = [
            { user: '0x7a3...9f2', level: 1, amount: 10.00, time: '2h ago', status: 'Credited' },
            { user: '0x8b4...3e1', level: 2, amount: 2.00, time: '5h ago', status: 'Credited' },
            { user: '0x2c5...7d8', level: 1, amount: 10.00, time: '8h ago', status: 'Credited' },
            { user: '0x9e6...4a2', level: 3, amount: 2.00, time: '1d ago', status: 'Credited' },
            { user: '0x1f7...5c3', level: 2, amount: 2.00, time: '2d ago', status: 'Credited' }
        ];
        res.status(200).json({ status: 'success', data: { commissions } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get commissions' });
    }
});

// Resolve referral code to wallet address
router.get('/resolve/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const user = await User.findOne({ referralCode: code.toUpperCase() }).select('walletAddress referralCode');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'Referral code not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                walletAddress: user.walletAddress,
                referralCode: user.referralCode
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to resolve referral code' });
    }
});

module.exports = router;
