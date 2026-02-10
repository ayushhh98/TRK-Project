const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const AuditLogger = require('../utils/auditLogger');
const { sendRedemptionOtpEmail } = require('../utils/email');
const { logger } = require('../utils/logger');

/**
 * Reward Redemption Routes (Sweepstakes Model)
 * NOT "withdrawals" - these are PROMOTIONAL REWARDS
 */

const REDEMPTION_RATES = {
    pointsPerUSDT: 100, // 100 reward points = 1 USDT
    minimumPoints: 500, // Minimum 500 points (5 USDT) to redeem
    maximumPerDay: 10000, // Maximum 10000 points (100 USDT) per day
    processingFee: 0, // No fee (promotional reward)
    otpExpiryMinutes: 10,
    processingWindowHours: [24, 48]
};

/**
 * GET /rewards/balance
 * Get user's reward points balance
 */
router.get('/balance', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            data: {
                rewardPoints: user.rewardPoints,
                credits: user.credits,
                pointsPerUSDT: REDEMPTION_RATES.pointsPerUSDT,
                conversionRate: `${REDEMPTION_RATES.pointsPerUSDT} points = 1 USDT`,
                estimatedValue: (user.rewardPoints / REDEMPTION_RATES.pointsPerUSDT).toFixed(2),
                minimumRedemption: REDEMPTION_RATES.minimumPoints,
                dailyLimit: REDEMPTION_RATES.maximumPerDay,
                processingWindowHours: REDEMPTION_RATES.processingWindowHours
            }
        });
    } catch (error) {
        logger.error('Reward balance error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get reward balance'
        });
    }
});

/**
 * POST /rewards/request-otp
 * Request OTP for reward redemption
 */
router.post('/request-otp', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+email');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        if (!user.email) {
            return res.status(400).json({
                status: 'error',
                code: 'EMAIL_REQUIRED',
                message: 'Email is required to redeem rewards. Please add and verify your email.'
            });
        }

        if (!user.isEmailVerified) {
            return res.status(403).json({
                status: 'error',
                code: 'EMAIL_NOT_VERIFIED',
                message: 'Please verify your email before redeeming rewards.'
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + REDEMPTION_RATES.otpExpiryMinutes * 60 * 1000);

        user.redemptionOtp = otp;
        user.redemptionOtpExpires = expiresAt;
        await user.save();

        await sendRedemptionOtpEmail(user.email, otp);

        res.json({
            status: 'success',
            message: 'OTP sent to your email',
            data: {
                expiresInMinutes: REDEMPTION_RATES.otpExpiryMinutes
            }
        });
    } catch (error) {
        logger.error('Reward OTP error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to send OTP'
        });
    }
});

/**
 * POST /rewards/redeem
 * Redeem reward points for promotional crypto reward
 */
router.post('/redeem', auth, async (req, res) => {
    try {
        const { rewardPoints, otp } = req.body;
        const user = await User.findById(req.user.id).select('+redemptionOtp +redemptionOtpExpires');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Validation
        if (!rewardPoints || rewardPoints < 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid reward points amount'
            });
        }

        if (!otp) {
            return res.status(400).json({
                status: 'error',
                code: 'OTP_REQUIRED',
                message: 'OTP is required to redeem rewards'
            });
        }

        if (!user.redemptionOtp || !user.redemptionOtpExpires || new Date() > user.redemptionOtpExpires) {
            return res.status(400).json({
                status: 'error',
                code: 'OTP_EXPIRED',
                message: 'OTP expired. Please request a new OTP.'
            });
        }

        if (user.redemptionOtp !== otp) {
            return res.status(400).json({
                status: 'error',
                code: 'OTP_INVALID',
                message: 'Invalid OTP'
            });
        }

        // Minimum threshold
        if (rewardPoints < REDEMPTION_RATES.minimumPoints) {
            return res.status(400).json({
                status: 'error',
                code: 'BELOW_MINIMUM',
                message: `Minimum ${REDEMPTION_RATES.minimumPoints} reward points required`,
                minimumPoints: REDEMPTION_RATES.minimumPoints
            });
        }

        // Check balance
        if (user.rewardPoints < rewardPoints) {
            return res.status(400).json({
                status: 'error',
                code: 'INSUFFICIENT_POINTS',
                message: 'Insufficient reward points',
                available: user.rewardPoints,
                requested: rewardPoints
            });
        }

        // Check daily limit
        const today = new Date().toISOString().split('T')[0];
        const todayRedemptions = (user.redemptionHistory || []).filter(r =>
            r.redeemedAt.toISOString().split('T')[0] === today
        );
        const todayTotal = todayRedemptions.reduce((sum, r) => sum + r.pointsRedeemed, 0);

        if (todayTotal + rewardPoints > REDEMPTION_RATES.maximumPerDay) {
            return res.status(429).json({
                status: 'error',
                code: 'DAILY_LIMIT_EXCEEDED',
                message: 'Daily redemption limit exceeded',
                dailyLimit: REDEMPTION_RATES.maximumPerDay,
                usedToday: todayTotal,
                remaining: REDEMPTION_RATES.maximumPerDay - todayTotal
            });
        }

        // Calculate USDT amount (promotional reward)
        const usdtAmount = rewardPoints / REDEMPTION_RATES.pointsPerUSDT;

        // TODO: Process crypto reward transfer
        // await sendPromotionalReward(user.walletAddress, usdtAmount);

        // Deduct reward points
        user.rewardPoints -= rewardPoints;
        user.redemptionOtp = undefined;
        user.redemptionOtpExpires = undefined;

        // Record redemption
        if (!user.redemptionHistory) {
            user.redemptionHistory = [];
        }
        user.redemptionHistory.push({
            pointsRedeemed: rewardPoints,
            usdtAmount,
            status: 'pending', // pending, completed, failed
            txHash: null, // Will be updated after blockchain confirmation
            redeemedAt: new Date()
        });

        await user.save();

        // Audit log
        await AuditLogger.log({
            eventType: 'reward_redemption',
            severity: 'info',
            userId: user._id,
            walletAddress: user.walletAddress,
            action: 'promotional_reward_redeemed',
            details: {
                pointsRedeemed: rewardPoints,
                usdtAmount,
                remainingPoints: user.rewardPoints
            }
        });

        logger.info(`Reward redeemed: ${user.walletAddress} - ${rewardPoints} points → ${usdtAmount} USDT`);

        res.json({
            status: 'success',
            message: 'Promotional reward redemption initiated',
            data: {
                pointsRedeemed: rewardPoints,
                promotionalReward: `${usdtAmount} USDT`,
                remainingPoints: user.rewardPoints,
                status: 'pending',
                note: `This is a promotional reward, not a withdrawal. Processing may take ${REDEMPTION_RATES.processingWindowHours[0]}-${REDEMPTION_RATES.processingWindowHours[1]} hours.`
            }
        });
    } catch (error) {
        logger.error('Reward redemption error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process reward redemption'
        });
    }
});

/**
 * GET /rewards/history
 * Get redemption history
 */
router.get('/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            data: {
                redemptions: user.redemptionHistory || [],
                totalRedeemed: (user.redemptionHistory || []).reduce((sum, r) => sum + r.pointsRedeemed, 0),
                totalUSDT: (user.redemptionHistory || []).reduce((sum, r) => sum + r.usdtAmount, 0)
            }
        });
    } catch (error) {
        logger.error('Redemption history error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get redemption history'
        });
    }
});

module.exports = router;
