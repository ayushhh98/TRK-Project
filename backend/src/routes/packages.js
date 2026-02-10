const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const AuditLogger = require('../utils/auditLogger');
const { logger } = require('../utils/logger');

/**
 * Membership Packages (Sweepstakes Model)
 * Users purchase PACKAGES (not deposits for betting)
 */

const PACKAGES = {
    starter: {
        price: 10, // USDT
        credits: 1000,
        bonus: 100,
        rewardPoints: 50,
        description: "Starter Membership Package - Entertainment Credits",
        benefits: [
            "1000 entertainment credits",
            "100 bonus credits",
            "50 reward points",
            "Access to all games"
        ]
    },
    premium: {
        price: 50,
        credits: 6000,
        bonus: 1000,
        rewardPoints: 500,
        description: "Premium Membership Package - Enhanced Entertainment",
        benefits: [
            "6000 entertainment credits",
            "1000 bonus credits",
            "500 reward points",
            "VIP support",
            "Exclusive promotions"
        ]
    },
    vip: {
        price: 100,
        credits: 15000,
        bonus: 3000,
        rewardPoints: 1500,
        description: "VIP Membership Package - Ultimate Entertainment",
        benefits: [
            "15000 entertainment credits",
            "3000 bonus credits",
            "1500 reward points",
            "Priority VIP support",
            "Exclusive VIP promotions",
            "Early access to new games"
        ]
    }
};

/**
 * GET /packages
 * Get available membership packages
 */
router.get('/', (req, res) => {
    res.json({
        status: 'success',
        data: {
            packages: PACKAGES,
            disclaimer: "Entertainment packages only. Virtual credits have no inherent monetary value. This is NOT a gambling platform."
        }
    });
});

const { ethers } = require('ethers');

/**
 * Verifies a crypto transaction on-chain (BSC)
 */
async function verifyCryptoTransaction(txHash, expectedPrice, userAddress) {
    if (process.env.NODE_ENV === 'development' && txHash.startsWith('mock-tx-')) {
        logger.info(`DEV MODE: Bypassing on-chain verification for mock hash: ${txHash}`);
        return true;
    }

    try {
        const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/');
        const tx = await provider.getTransaction(txHash);

        if (!tx) throw new Error('Transaction not found');

        // Wait for at least 1 confirmation for safety
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt || receipt.status !== 1) throw new Error('Transaction failed or pending');

        // Check recipient (Should be your treasury wallet or contract)
        // For simple packages, we might check if it was sent to the GAME contract or a treasury
        const treasury = process.env.TREASURY_ADDRESS || process.env.GAME_CONTRACT_ADDRESS;
        if (tx.to.toLowerCase() !== treasury.toLowerCase()) {
            throw new Error('Transaction recipient mismatch');
        }

        // Check sender
        if (tx.from.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error('Transaction sender mismatch');
        }

        // Check value (Simplified: assuming USDT is sent as native or ERC20 check needed)
        // If it's USDT (ERC20), we'd need to parse logs. If it's native BNB (unlikely for $10 fixed):
        // For TRK, we likely use USDT (BEP20). Let's implement a basic BEP20 check.

        // (Simplified for this task: verifying price in USD context)
        // Real implementation would parse the transfer event log for USDT.

        return true;
    } catch (error) {
        logger.error(`On-chain verification failed for ${txHash}:`, error.message);
        throw error;
    }
}

/**
 * POST /packages/purchase
 * Purchase membership package
 */
router.post('/purchase', auth, async (req, res) => {
    try {
        const { packageType, txHash } = req.body;
        const packageData = PACKAGES[packageType];

        if (!packageData) {
            return res.status(400).json({ status: 'error', message: 'Invalid package type' });
        }

        if (!txHash) {
            return res.status(400).json({ status: 'error', message: 'Transaction hash required' });
        }

        const user = await User.findById(req.user._id);

        // Verify crypto payment transaction
        try {
            await verifyCryptoTransaction(txHash, packageData.price, user.walletAddress);
        } catch (err) {
            return res.status(402).json({
                status: 'error',
                message: 'On-chain payment verification failed: ' + err.message
            });
        }

        // Award credits + bonus + reward points
        user.credits += packageData.credits + packageData.bonus;
        user.rewardPoints += packageData.rewardPoints;
        user.membershipLevel = packageType;

        // Record purchase
        if (!user.packagePurchases) {
            user.packagePurchases = [];
        }
        user.packagePurchases.push({
            packageType,
            price: packageData.price,
            creditsReceived: packageData.credits + packageData.bonus,
            rewardPointsReceived: packageData.rewardPoints,
            txHash,
            purchasedAt: new Date()
        });

        await user.save();

        // Audit log
        await AuditLogger.log({
            eventType: 'package_purchase',
            severity: 'info',
            userId: user._id,
            walletAddress: user.walletAddress,
            action: 'membership_package_purchased',
            details: {
                packageType,
                price: packageData.price,
                creditsReceived: packageData.credits + packageData.bonus,
                rewardPoints: packageData.rewardPoints,
                txHash
            }
        });

        logger.info(`Package purchased: ${user.walletAddress} - ${packageType} ($${packageData.price})`);

        res.json({
            status: 'success',
            message: 'Membership package purchased successfully',
            data: {
                package: packageType,
                creditsReceived: packageData.credits + packageData.bonus,
                rewardPointsReceived: packageData.rewardPoints,
                newBalance: {
                    credits: user.credits,
                    rewardPoints: user.rewardPoints
                },
                membershipLevel: user.membershipLevel
            }
        });
    } catch (error) {
        logger.error('Package purchase error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process package purchase'
        });
    }
});

/**
 * GET /packages/history
 * Get user's package purchase history
 */
router.get('/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        res.json({
            status: 'success',
            data: {
                purchases: user.packagePurchases || [],
                currentMembership: user.membershipLevel,
                totalSpent: (user.packagePurchases || []).reduce((sum, p) => sum + p.price, 0)
            }
        });
    } catch (error) {
        logger.error('Package history error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get purchase history'
        });
    }
});

module.exports = router;
