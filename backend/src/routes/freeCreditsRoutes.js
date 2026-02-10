const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * @route   POST /api/free-credits/claim
 * @desc    Claim daily free credits (No Purchase Necessary)
 * @access  Private
 */
router.post('/claim', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const today = new Date();
        const lastClaimed = user.freeCredits.lastClaimed ? new Date(user.freeCredits.lastClaimed) : null;

        // Check if already claimed today (UTC based or Server Time)
        if (lastClaimed &&
            lastClaimed.getDate() === today.getDate() &&
            lastClaimed.getMonth() === today.getMonth() &&
            lastClaimed.getFullYear() === today.getFullYear()) {

            return res.status(400).json({
                status: 'error',
                message: 'Free credits already claimed today. Please try again tomorrow.'
            });
        }

        const DAILY_AMOUNT = 100; // 100 GC

        user.credits += DAILY_AMOUNT;
        user.freeCredits.lastClaimed = today;
        user.freeCredits.totalClaimed += DAILY_AMOUNT;

        // Reset practice balance too if needed, or keep separate
        // user.practiceBalance = 100; 

        await user.save();

        res.json({
            status: 'success',
            message: `Claimed ${DAILY_AMOUNT} Free Credits!`,
            data: {
                credits: user.credits,
                rewardPoints: user.rewardPoints,
                nextClaim: new Date(today.setHours(24, 0, 0, 0)) // Rough estimate
            }
        });

    } catch (error) {
        console.error('Free Credits Claim Error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Server error'
        });
    }
});

module.exports = router;
