const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const AuditLogger = require('../utils/auditLogger');
const { logger } = require('../utils/logger');

/**
 * Sweepstakes Model Routes
 * Legal compliance: Free play option (MANDATORY)
 */

/**
 * POST /free-credits/claim
 * Claim daily free credits (NO PURCHASE NECESSARY - REQUIRED BY LAW)
 */
router.post('/claim', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const now = Date.now();
        const lastClaim = user.freeCredits.lastClaimed;

        // Check 24-hour cooldown
        if (lastClaim) {
            const timeSinceLastClaim = now - lastClaim.getTime();
            const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours

            if (timeSinceLastClaim < cooldownMs) {
                const remainingMs = cooldownMs - timeSinceLastClaim;
                const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

                return res.status(429).json({
                    status: 'error',
                    code: 'COOLDOWN_ACTIVE',
                    message: `Free credits available in ${remainingHours} hour(s)`,
                    retryAfterMs: remainingMs
                });
            }
        }

        // Award free credits
        const freeCreditsAmount = user.freeCredits.daily;
        user.credits += freeCreditsAmount;
        user.freeCredits.lastClaimed = new Date();
        user.freeCredits.totalClaimed += freeCreditsAmount;

        await user.save();

        // Audit log
        await AuditLogger.log({
            eventType: 'free_credits_claimed',
            severity: 'info',
            userId: user._id,
            walletAddress: user.walletAddress,
            action: 'daily_free_credits_claimed',
            details: {
                amount: freeCreditsAmount,
                newBalance: user.credits
            }
        });

        logger.info(`Free credits claimed: ${user.walletAddress} (+${freeCreditsAmount})`);

        res.json({
            status: 'success',
            message: 'Free credits claimed successfully',
            data: {
                creditsAwarded: freeCreditsAmount,
                newBalance: user.credits,
                nextClaimAvailable: new Date(now + 24 * 60 * 60 * 1000)
            }
        });
    } catch (error) {
        logger.error('Free credits claim error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to claim free credits'
        });
    }
});

/**
 * GET /free-credits/status
 * Check free credits status
 */
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const now = Date.now();
        const lastClaim = user.freeCredits.lastClaimed;

        let canClaim = true;
        let nextClaimTime = null;
        let remainingCooldown = 0;

        if (lastClaim) {
            const timeSinceLastClaim = now - lastClaim.getTime();
            const cooldownMs = 24 * 60 * 60 * 1000;

            if (timeSinceLastClaim < cooldownMs) {
                canClaim = false;
                remainingCooldown = cooldownMs - timeSinceLastClaim;
                nextClaimTime = new Date(lastClaim.getTime() + cooldownMs);
            }
        }

        res.json({
            status: 'success',
            data: {
                canClaim,
                dailyAmount: user.freeCredits.daily,
                lastClaimed: lastClaim,
                nextClaimTime,
                remainingCooldownMs: remainingCooldown,
                totalClaimed: user.freeCredits.totalClaimed,
                currentCredits: user.credits
            }
        });
    } catch (error) {
        logger.error('Free credits status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get free credits status'
        });
    }
});

module.exports = router;
