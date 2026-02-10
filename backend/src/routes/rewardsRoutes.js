const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * @route   POST /api/rewards/redeem
 * @desc    Redeem Reward Points (SC) for Real Value (USDT)
 * @access  Private
 */
router.post('/redeem', auth, async (req, res) => {
    try {
        const { points, walletAddress } = req.body;

        if (!points || points <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid redemption amount'
            });
        }

        const user = await User.findById(req.user.id);

        if (user.rewardPoints < points) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient Reward Points'
            });
        }

        // Redemption Rate (Example: 100 SC = 1 USDT)
        // Adjust this based on your tokenomics
        const EXCHANGE_RATE = 1; // 1 SC = 1 USDT (Simpler for users?) 
        // Or 100 SC = 1 USDT. User said "100 rewardPoints = 1 USDT" in example.
        const RATE_DIVISOR = 100;

        const usdtAmount = points / RATE_DIVISOR;

        if (usdtAmount < 1) { // Minimum 1 USDT
            return res.status(400).json({
                status: 'error',
                message: `Minimum redemption is ${RATE_DIVISOR} points (1 USDT)`
            });
        }

        // Deduct Points LOCALLY first
        user.rewardPoints -= points;
        await user.save();

        // Check if user has explicit wallet address for redemption or use registered one via input
        const targetWallet = walletAddress || user.walletAddress;

        // In a real app, this would create a "Withdrawal Request" in DB for admin approval
        // For now, we simulate the request creation

        // TODO: Create Transaction/Withdrawal Record
        // const withdrawal = new Withdrawal({ ... });
        // await withdrawal.save();

        res.json({
            status: 'success',
            message: 'Redemption request submitted successfully',
            data: {
                pointsRedeemed: points,
                usdtValue: usdtAmount,
                remainingRewardPoints: user.rewardPoints,
                targetWallet
            }
        });

    } catch (error) {
        console.error('Redemption Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

module.exports = router;
