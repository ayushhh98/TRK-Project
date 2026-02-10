const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Membership Packages Configuration
const MEMBERSHIP_PACKAGES = [
    {
        id: 'starter',
        name: 'Starter Pack',
        price: 10, // USDT
        credits: 1000, // GC
        rewardPoints: 10, // SC
        level: 'starter',
        benefits: ['Basic Support', 'Daily Daily Logins']
    },
    {
        id: 'premium',
        name: 'Premium Pack',
        price: 50,
        credits: 5500, // 10% Bonus GC
        rewardPoints: 52, // 4% Bonus SC
        level: 'premium',
        benefits: ['Priority Support', 'Weekly Bonus']
    },
    {
        id: 'vip',
        name: 'VIP Pack',
        price: 100,
        credits: 12000, // 20% Bonus GC
        rewardPoints: 105, // 5% Bonus SC
        level: 'vip',
        benefits: ['VIP Host', 'Exclusive Games', 'Instant Redemption']
    }
];

// Helper to update team volume (Legacy MLM logic adapted for Sales)
const updateTeamVolume = async (userId, amount, sourceUserId = null) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.referredBy) return;

        const upline = await User.findById(user.referredBy);
        if (!upline) return;

        // Ensure teamStats exists
        if (!upline.teamStats) upline.teamStats = { totalTeamVolume: 0, strongLegVolume: 0, otherLegsVolume: 0, branchVolumes: new Map() };
        if (!upline.teamStats.branchVolumes) upline.teamStats.branchVolumes = new Map();

        const branchHeadId = sourceUserId ? user._id.toString() : userId.toString();
        const currentBranchVolume = upline.teamStats.branchVolumes.get(branchHeadId) || 0;
        upline.teamStats.branchVolumes.set(branchHeadId, currentBranchVolume + amount);

        upline.teamStats.totalTeamVolume += amount;

        let maxVolume = 0;
        let totalVal = 0;
        for (const [branchId, volume] of upline.teamStats.branchVolumes) {
            if (volume > maxVolume) maxVolume = volume;
            totalVal += volume;
        }

        upline.teamStats.strongLegVolume = maxVolume;
        upline.teamStats.otherLegsVolume = totalVal - maxVolume;

        await upline.save();
        await updateTeamVolume(upline._id, amount, branchHeadId);

    } catch (error) {
        console.error('Error updating team volume:', error);
    }
};

/**
 * @route   GET /api/packages
 * @desc    Get available membership packages
 * @access  Private
 */
router.get('/', auth, (req, res) => {
    res.json({
        status: 'success',
        data: MEMBERSHIP_PACKAGES
    });
});

/**
 * @route   POST /api/packages/purchase
 * @desc    Purchase a membership package (formerly Deposit)
 * @access  Private
 */
router.post('/purchase', auth, async (req, res) => {
    try {
        const { packageId, txHash } = req.body; // In real app, verify txHash on-chain

        const pkg = MEMBERSHIP_PACKAGES.find(p => p.id === packageId);
        if (!pkg) {
            return res.status(400).json({ status: 'error', message: 'Invalid package ID' });
        }

        const user = await User.findById(req.user.id);

        // Update Balances
        user.credits += pkg.credits;
        user.rewardPoints += pkg.rewardPoints;

        // Update Membership Level if higher
        const levels = ['none', 'starter', 'premium', 'vip'];
        if (levels.indexOf(pkg.level) > levels.indexOf(user.membershipLevel)) {
            user.membershipLevel = pkg.level;
        }

        // Record Purchase
        user.deposits.push({
            amount: pkg.price,
            credits: pkg.credits,
            rewardPoints: pkg.rewardPoints,
            txHash: txHash || 'manual_entry',
            createdAt: new Date()
        });

        // Update Activation / Team Stats (MLM Logic)
        user.activation.totalDeposited += pkg.price;
        await user.updateActivationTier();

        await user.save();

        // Trigger MLM Volume Updates
        await updateTeamVolume(user._id, pkg.price);

        res.json({
            status: 'success',
            message: `Successfully purchased ${pkg.name}!`,
            data: {
                credits: user.credits,
                rewardPoints: user.rewardPoints,
                membershipLevel: user.membershipLevel
            }
        });

    } catch (error) {
        console.error('Package Purchase Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error' });
    }
});

module.exports = router;
