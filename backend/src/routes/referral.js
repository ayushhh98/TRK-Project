const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Commission = require('../models/Commission');
const auth = require('../middleware/auth');
const { awardReferralSignupBonus } = require('../utils/referralBonus');
const { distributePracticeReferralBonuses } = require('../utils/practiceBonusDistributor');

const router = express.Router();

// PUBLIC: Validate referral code (no auth required - used before wallet connection)
router.post('/validate', async (req, res) => {
    try {
        const { referralCode } = req.body;

        if (!referralCode || typeof referralCode !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'Referral code is required'
            });
        }

        // Normalize code (uppercase, trim)
        const normalizedCode = referralCode.trim().toUpperCase();

        // Check if referral code exists
        const referrer = await User.findOne({ referralCode: normalizedCode })
            .select('walletAddress email referralCode')
            .lean();

        if (!referrer) {
            return res.status(404).json({
                status: 'error',
                message: 'Invalid referral code',
                valid: false
            });
        }

        // Return success with referrer info (masked for privacy)
        const maskedAddress = referrer.walletAddress
            ? `${referrer.walletAddress.slice(0, 6)}...${referrer.walletAddress.slice(-4)}`
            : null;

        return res.json({
            status: 'success',
            message: 'Valid referral code',
            valid: true,
            referrer: {
                address: maskedAddress,
                code: referrer.referralCode
            }
        });

    } catch (error) {
        console.error('Referral validation error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to validate referral code'
        });
    }
});


// Administrative Mock State for Practice Referral Rates (kept for reference/admin control)
let PRACTICE_REFERRAL_RATES = {
    1: { percent: 10, usdt: 10 },
    '2-5': { percent: 2, usdt: 2 },
    '6-10': { percent: 1, usdt: 1 },
    '11-15': { percent: 0.5, usdt: 0.5 },
    '16-50': { percent: 0.25, usdt: 0.25 },
    '51-100': { percent: 0.10, usdt: 0.10 }
};

const REAL_REFERRAL_COMMISSION_TYPES = ['deposit_commission'];

const getRateByLevel = (level) => {
    if (level === 1) return PRACTICE_REFERRAL_RATES[1];
    if (level >= 2 && level <= 5) return PRACTICE_REFERRAL_RATES['2-5'];
    if (level >= 6 && level <= 10) return PRACTICE_REFERRAL_RATES['6-10'];
    if (level >= 11 && level <= 15) return PRACTICE_REFERRAL_RATES['11-15'];
    if (level >= 16 && level <= 50) return PRACTICE_REFERRAL_RATES['16-50'];
    if (level >= 51 && level <= 100) return PRACTICE_REFERRAL_RATES['51-100'];
    return { percent: 0, usdt: 0 };
};

// Efficient BFS-based team calculation with Real Commission Data
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

    // 1. Fetch Real Commission Data Aggregated by Level AND Type
    const commissionStats = await Commission.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                status: 'credited',
                type: { $in: REAL_REFERRAL_COMMISSION_TYPES }
            }
        },
        {
            $group: {
                _id: { level: "$level", type: "$type" },
                totalEarned: { $sum: "$amount" }
            }
        }
    ]);

    // Create a map for quick lookup: { level: { total: 0, real: 0 } }
    const earningsMap = {};
    commissionStats.forEach(stat => {
        const lvl = stat._id.level;
        if (!earningsMap[lvl]) earningsMap[lvl] = { total: 0, real: 0 };

        earningsMap[lvl].total += stat.totalEarned;

        // Count as "Real" if NOT a signup bonus
        if (stat._id.type !== 'signup_bonus') {
            earningsMap[lvl].real += stat.totalEarned;
        }
    });

    // 2. BFS for Member Counts (Structure)
    let currentLevelIds = [userId];
    const visited = new Set();
    visited.add(userId.toString());

    for (let level = 1; level <= maxLevels; level++) {
        const nextLevelIds = [];
        const rate = getRateByLevel(level);

        // Use real earnings from Commission collection, default to 0
        const levelEarnings = earningsMap[level] || { total: 0, real: 0 };

        const levelData = {
            level,
            members: 0,
            active: 0,
            reward: rate.usdt, // Static info for UI
            percent: rate.percent, // Static info for UI
            totalEarned: levelEarnings.total, // Total (Bonus + Real)
            realEarned: levelEarnings.real    // Real Cash Only
        };

        const members = await User.find({ referredBy: { $in: currentLevelIds } })
            .select('_id lastLoginAt referralCode referrals walletAddress activation deposits');

        if (members.length === 0) break;

        for (const member of members) {
            const memberIdStr = member._id.toString();
            if (visited.has(memberIdStr)) continue;
            visited.add(memberIdStr);

            // "Total Team" Logic: Count ALL signups (active + inactive)
            // This ensures "Team Size" reflects everyone who joined, fulfilling user request
            levelData.members++;

            // Check active status (online today)
            const isOnline = member.lastLoginAt && member.lastLoginAt >= startOfDay;
            if (isOnline) {
                levelData.active++;
            }

            // Track activation tiers
            if (member.activation?.tier === 'tier1') stats.tier1Count++;
            if (member.activation?.tier === 'tier2') stats.tier2Count++;

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

const getLifetimeCommissionTotal = async (userId, types = []) => {
    const match = {
        user: userId,
        status: 'credited'
    };
    if (Array.isArray(types) && types.length > 0) {
        match.type = { $in: types };
    }

    const agg = await Commission.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    return agg.length > 0 ? Number(agg[0].total || 0) : 0;
};

// Get referral stats and growth data (Real-Time)
router.get('/stats', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        // Calculate real-time team stats
        const realStats = await getTeamStatsRealTime(user._id);

        // Calculate true lifetime referral earnings from credited commissions only.
        const referralEarningsAgg = await Commission.aggregate([
            {
                $match: {
                    user: user._id,
                    status: 'credited',
                    type: { $in: REAL_REFERRAL_COMMISSION_TYPES }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);
        const totalReferralEarnings = referralEarningsAgg.length > 0 ? referralEarningsAgg[0].total : 0;

        // Claimable on Referral page: direct referral wallet only.
        // Safety clamp prevents old legacy signup credits from appearing as real cash.
        const rawDirectBalance = Number(user.realBalances?.directLevel || 0);
        const lifetimeDirectCommission = await getLifetimeCommissionTotal(user._id, ['deposit_commission']);
        const claimableReferralBalance =
            lifetimeDirectCommission > 0
                ? Math.min(rawDirectBalance, lifetimeDirectCommission)
                : rawDirectBalance;

        // Calculate TRUE Real Earnings (excluding signup bonuses)
        const realEarningsAgg = await Commission.aggregate([
            {
                $match: {
                    user: user._id,
                    status: 'credited',
                    type: 'deposit_commission'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);
        const totalRealEarned = realEarningsAgg.length > 0 ? realEarningsAgg[0].total : 0;

        // Fetch detailed Level 1 data
        const level1Members = await User.find({ referredBy: user._id })
            .select('walletAddress activation createdAt lastLoginAt name email referralCode deposits')
            .limit(20);

        // Aggregate commissions earned from these specific Level 1 members
        const level1MemberIds = level1Members.map(m => m._id);
        const memberEarnings = await Commission.aggregate([
            {
                $match: {
                    user: user._id,
                    fromUser: { $in: level1MemberIds },
                    status: 'credited',
                    type: { $in: REAL_REFERRAL_COMMISSION_TYPES }
                }
            },
            {
                $group: {
                    _id: { user: "$fromUser", type: "$type" },
                    total: { $sum: "$amount" }
                }
            }
        ]);

        const earningsMap = {};
        memberEarnings.forEach(e => {
            if (!e._id.user) return; // Skip if no user linked
            const uid = e._id.user.toString();
            if (!earningsMap[uid]) earningsMap[uid] = { total: 0, real: 0, bonus: 0 };

            earningsMap[uid].total += e.total;

            if (e._id.type === 'signup_bonus') {
                earningsMap[uid].bonus += e.total;
            } else {
                // deposit_commission, winner_commission, roi_commission
                earningsMap[uid].real += e.total;
            }
        });

        const level1Details = level1Members.map(m => {
            const walletShort = m.walletAddress
                ? `${m.walletAddress.slice(0, 6)}...${m.walletAddress.slice(-4)}`
                : 'N/A';
            const email = m.email || '';
            const maskedEmail = email
                ? `${email.slice(0, 2)}***@${email.split('@')[1] || ''}`
                : '';

            // Calculate total deposited by this referral
            const totalDeposited = (m.deposits || []).reduce((sum, dep) => sum + (dep.amount || 0), 0);

            // Check online status from global map
            const isOnline = global.onlineUsers ? global.onlineUsers.has(m._id.toString()) : false;

            const earnings = earningsMap[m._id.toString()] || { total: 0, real: 0, bonus: 0 };

            return {
                id: m._id,
                name: m.name || '',
                email: maskedEmail,
                referralCode: m.referralCode || '',
                walletAddress: walletShort,
                tier: m.activation?.tier || 'none',
                joined: m.createdAt,
                lastActive: m.lastLoginAt,
                totalDeposited,
                commissionEarned: earnings.total,
                realCommissionEarned: earnings.real, // NEW: Only performance-based
                bonusEarned: earnings.bonus,         // NEW: Only signup bonus
                isOnline
            };
        });

        // Real Growth Data - Calculate from actual signups in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Aggregate daily signups from user's referral tree
        const dailySignups = await User.aggregate([
            {
                $match: {
                    referredBy: user._id,
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    newMembers: { $sum: 1 },
                    volume: { $sum: "$activation.totalDeposited" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing days with zeros to ensure 7-day chart
        const growthData = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            const dateStr = date.toISOString().split('T')[0];
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

            const existing = dailySignups.find(d => d._id === dateStr);
            growthData.push({
                date: dayName,
                newMembers: existing?.newMembers || 0,
                volume: existing?.volume || 0
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                referralCode: user.referralCode,
                referralLink: `https://trk.game/?ref=${user.referralCode}`,
                directReferrals: user.referrals?.length || 0,
                maxDirectReferrals: MAX_DIRECT_REFERRALS,
                totals: {
                    members: realStats.totalMembers,
                    active: realStats.activeToday,
                    totalEarned: totalReferralEarnings,
                    claimable: claimableReferralBalance,
                    realEarned: totalRealEarned,
                    tier1Percent: realStats.totalMembers > 0 ? Math.round((realStats.tier1Count / realStats.totalMembers) * 100) : 0,
                    tier2Percent: realStats.totalMembers > 0 ? Math.round((realStats.tier2Count / realStats.totalMembers) * 100) : 0
                },
                levelStats: realStats.levelStats,
                level1Details,
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
        res.status(500).json({
            status: 'error',
            message: 'Failed to get referral hub stats',
            debug: error.message
        });
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

        const io = req.app.get('io');
        await awardReferralSignupBonus({
            referrerId: referrer._id,
            referredUserId: user._id,
            io
        });
        await distributePracticeReferralBonuses(user._id, io);

        res.status(200).json({
            status: 'success',
            message: 'Referral successful',
            data: { referredBy: `${referrer.walletAddress?.slice(0, 6)}...${referrer.walletAddress?.slice(-4)}` }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to apply referral code' });
    }
});

// Get commissions history
router.get('/commissions', auth, async (req, res) => {
    try {
        const commissionsData = await Commission.find({ user: req.user.id })
            .populate('fromUser', 'walletAddress')
            .sort({ createdAt: -1 })
            .limit(50);

        const commissions = commissionsData.map(c => {
            // Calculate time ago
            const diff = Date.now() - new Date(c.createdAt).getTime();
            const minutes = Math.floor(diff / 60000);
            let timeAgo = 'Just now';
            if (minutes > 0) {
                if (minutes < 60) timeAgo = `${minutes}m ago`;
                else if (minutes < 1440) timeAgo = `${Math.floor(minutes / 60)}h ago`;
                else timeAgo = `${Math.floor(minutes / 1440)}d ago`;
            }

            return {
                user: c.fromUser ? `${c.fromUser.walletAddress?.slice(0, 6)}...${c.fromUser.walletAddress?.slice(-4)}` : 'Unknown',
                level: c.level,
                amount: c.amount,
                time: timeAgo,
                status: c.status.charAt(0).toUpperCase() + c.status.slice(1)
            };
        });

        res.status(200).json({ status: 'success', data: { commissions } });
    } catch (error) {
        console.error('Get commissions error:', error);
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

// Claim/Extract Referral Earnings to Main Wallet
router.post('/claim', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

        if (!user.realBalances) user.realBalances = {};

        // Referral page extraction claims only direct referral earnings.
        const rawDirectBalance = Number(user.realBalances.directLevel || 0);
        const lifetimeDirectCommission = await getLifetimeCommissionTotal(user._id, ['deposit_commission']);
        const pendingDirect =
            lifetimeDirectCommission > 0
                ? Math.min(rawDirectBalance, lifetimeDirectCommission)
                : rawDirectBalance;
        const totalClaimable = pendingDirect;

        if (totalClaimable <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No referral earnings to claim'
            });
        }

        // Migrate any legacy signup-credit residue from real direct wallet -> practice wallet.
        const migratedPracticeAmount = Math.max(0, rawDirectBalance - pendingDirect);
        if (migratedPracticeAmount > 0) {
            user.practiceBalance = (user.practiceBalance || 0) + migratedPracticeAmount;
        }

        // Move real claimable amount to Cash Balance (Main Wallet)
        user.realBalances.cash = (user.realBalances.cash || 0) + totalClaimable;

        // Reset direct referral wallet after extraction/migration
        user.realBalances.directLevel = 0;

        // Add transaction log if needed (omitted for brevity, can be added)

        await user.save();

        const io = req.app.get('io');
        if (io) {
            const eventPayload = {
                id: `ref_claim_${user._id.toString()}_${Date.now()}`,
                type: 'REFERRAL',
                user: {
                    walletAddress: user.walletAddress || '',
                    email: user.email || ''
                },
                amount: totalClaimable,
                txHash: null,
                status: 'COMPLETED',
                createdAt: new Date().toISOString(),
                note: 'referral_claim'
            };

            io.to(user._id.toString()).emit('balance_update', {
                type: 'referral_claim',
                amount: totalClaimable,
                newBalance: user.realBalances.cash
            });
            if (migratedPracticeAmount > 0) {
                io.to(user._id.toString()).emit('balance_update', {
                    type: 'referral_bonus',
                    walletType: 'practice',
                    amount: migratedPracticeAmount,
                    newBalance: user.practiceBalance || 0
                });
            }
            io.emit('transaction_created', eventPayload);
            io.emit('referral_commission_created', eventPayload);
        }

        const totalUnified =
            (user.realBalances.cash || 0) +
            (user.realBalances.game || 0) +
            (user.realBalances.cashback || 0) +
            (user.realBalances.lucky || 0) +
            (user.realBalances.directLevel || 0) +
            (user.realBalances.winners || 0) +
            (user.realBalances.roiOnRoi || 0) +
            (user.realBalances.club || 0) +
            (user.realBalances.teamWinners || 0) +
            (user.realBalances.walletBalance || 0) +
            (user.realBalances.luckyDrawWallet || 0);

        res.status(200).json({
            status: 'success',
            message: `Successfully claimed ${totalClaimable.toFixed(2)} USDT to Main Wallet`,
            data: {
                claimedAmount: totalClaimable,
                migratedPracticeAmount,
                newMainBalance: user.realBalances.cash,
                totalUnified,
                remainingReferralBalances: {
                    directLevel: user.realBalances.directLevel || 0,
                    teamWinners: user.realBalances.teamWinners || 0,
                    roiOnRoi: user.realBalances.roiOnRoi || 0,
                    club: user.realBalances.club || 0
                }
            }
        });

    } catch (error) {
        console.error('Claim error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to claim earnings' });
    }
});

module.exports = router;
