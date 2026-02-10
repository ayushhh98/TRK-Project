const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to update team volume recursively up the tree
const updateTeamVolume = async (userId, depositAmount, sourceUserId = null) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.referredBy) return;

        const upline = await User.findById(user.referredBy);
        if (!upline) return;

        // Ensure teamStats exists
        if (!upline.teamStats) upline.teamStats = { totalTeamVolume: 0, strongLegVolume: 0, otherLegsVolume: 0, branchVolumes: new Map() };
        if (!upline.teamStats.branchVolumes) upline.teamStats.branchVolumes = new Map();

        // 1. Update branch volume for the direct downline that this deposit came from
        // If the deposit came directly from the user (sourceUserId is null), 'user' is the branch head
        const branchHeadId = sourceUserId ? user._id.toString() : userId.toString();

        const currentBranchVolume = upline.teamStats.branchVolumes.get(branchHeadId) || 0;
        upline.teamStats.branchVolumes.set(branchHeadId, currentBranchVolume + depositAmount);

        // 2. Update Total Team Volume
        upline.teamStats.totalTeamVolume += depositAmount;

        // 3. Recalculate Strong Leg vs Other Legs
        let maxVolume = 0;
        let totalVal = 0;

        for (const [branchId, volume] of upline.teamStats.branchVolumes) {
            if (volume > maxVolume) maxVolume = volume;
            totalVal += volume;
        }

        upline.teamStats.strongLegVolume = maxVolume;
        upline.teamStats.otherLegsVolume = totalVal - maxVolume;

        await upline.save();

        // 4. Recurse up the tree, keeping the MUST branch as the direct downline of THIS upline
        await updateTeamVolume(upline._id, depositAmount, branchHeadId);

    } catch (error) {
        console.error('Error updating team volume:', error);
    }
};

// Deposit tiers configuration
// Deposit tiers configuration (Dynamic State)
let TIER_CONFIG = {
    tier1: {
        minDeposit: 10,
        benefits: [
            'Withdraw from Direct Level Income',
            'Withdraw from Winners Income'
        ]
    },
    tier2: {
        minDeposit: 100,
        benefits: [
            'Transfer Practice Balance to Real',
            'Withdraw All Real Profits',
            'Cashback Protection Active',
            'All Income Streams Unlocked'
        ]
    }
};

// Get activation status
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const activationStatus = {
            tier: user.activation?.tier || 'none',
            totalDeposited: user.activation?.totalDeposited || 0,
            tier1Threshold: TIER_CONFIG.tier1.minDeposit,
            tier2Threshold: TIER_CONFIG.tier2.minDeposit,
            tier1Progress: Math.min(((user.activation?.totalDeposited || 0) / TIER_CONFIG.tier1.minDeposit) * 100, 100),
            tier2Progress: Math.min(((user.activation?.totalDeposited || 0) / TIER_CONFIG.tier2.minDeposit) * 100, 100),
            unlockedFeatures: {
                canWithdrawDirectLevel: user.activation?.canWithdrawDirectLevel || false,
                canWithdrawWinners: user.activation?.canWithdrawWinners || false,
                canTransferPractice: user.activation?.canTransferPractice || false,
                canWithdrawAll: user.activation?.canWithdrawAll || false,
                cashbackActive: user.activation?.cashbackActive || false,
                allStreamsUnlocked: user.activation?.allStreamsUnlocked || false
            },
            tier1Benefits: TIER_CONFIG.tier1.benefits,
            tier2Benefits: TIER_CONFIG.tier2.benefits,
            deposits: user.deposits || []
        };

        res.status(200).json({
            status: 'success',
            data: activationStatus
        });

    } catch (error) {
        console.error('Get activation status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get activation status'
        });
    }
});

// Make a deposit
router.post('/deposit', auth, async (req, res) => {
    try {
        const { amount, txHash } = req.body;

        if (!amount || amount < 1.5) {
            return res.status(400).json({
                status: 'error',
                message: 'Minimum deposit amount is 1.5 USDT'
            });
        }

        const user = await User.findById(req.user.id);

        // Initialize activation if not exists
        if (!user.activation) {
            user.activation = {
                totalDeposited: 0,
                tier: 'none',
                canWithdrawDirectLevel: false,
                canWithdrawWinners: false,
                canTransferPractice: false,
                canWithdrawAll: false,
                cashbackActive: false,
                allStreamsUnlocked: false
            };
        }

        // Add deposit
        user.deposits = user.deposits || [];
        user.deposits.push({
            amount,
            txHash: txHash, // Requires real txHash in production
            createdAt: new Date()
        });

        // Update total deposited
        user.activation.totalDeposited += amount;

        // Add to game balance
        user.realBalances.game += amount;

        // Update activation tier
        user.updateActivationTier(TIER_CONFIG.tier1.minDeposit, TIER_CONFIG.tier2.minDeposit);

        await user.save();

        // Update Team Volume recursively (Club Income Logic)
        await updateTeamVolume(user._id, amount);

        // Determine what was unlocked
        const newlyUnlocked = [];
        if (user.activation.tier === 'tier1' && user.activation.totalDeposited >= 10 && user.activation.totalDeposited < 100) {
            newlyUnlocked.push('Direct Level Income Withdrawal', 'Winners Income Withdrawal');
        } else if (user.activation.tier === 'tier2') {
            if (user.activation.totalDeposited - amount < 100) {
                newlyUnlocked.push('Practice Balance Transfer', 'All Withdrawals', 'Cashback Protection', 'All Income Streams');
            }
        }

        res.status(200).json({
            status: 'success',
            message: `Successfully deposited ${amount} USDT`,
            data: {
                depositAmount: amount,
                totalDeposited: user.activation.totalDeposited,
                newTier: user.activation.tier,
                newlyUnlocked,
                gameBalance: user.realBalances.game,
                activation: {
                    tier: user.activation.tier,
                    canWithdrawDirectLevel: user.activation.canWithdrawDirectLevel,
                    canWithdrawWinners: user.activation.canWithdrawWinners,
                    canTransferPractice: user.activation.canTransferPractice,
                    canWithdrawAll: user.activation.canWithdrawAll,
                    cashbackActive: user.activation.cashbackActive,
                    allStreamsUnlocked: user.activation.allStreamsUnlocked
                }
            }
        });

    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process deposit'
        });
    }
});

// Transfer practice balance to real (Tier 2 only)
router.post('/transfer-practice', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user.id);

        // Check if Tier 2 activated
        if (!user.activation?.canTransferPractice) {
            return res.status(403).json({
                status: 'error',
                message: 'Practice transfer requires Tier 2 activation (100+ USDT deposit)'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid transfer amount'
            });
        }

        if (user.practiceBalance < amount) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient practice balance'
            });
        }

        // Transfer from practice to real game balance
        user.practiceBalance -= amount;
        user.realBalances.game += amount;

        await user.save();

        res.status(200).json({
            status: 'success',
            message: `Successfully transferred ${amount} USDT from practice to real balance`,
            data: {
                transferredAmount: amount,
                practiceBalance: user.practiceBalance,
                gameBalance: user.realBalances.game
            }
        });

    } catch (error) {
        console.error('Transfer practice error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to transfer practice balance'
        });
    }
});

const { withdrawalLimiter } = require('../middleware/rateLimiter');
const { requireFreshAuth } = require('../middleware/freshAuth');

// Withdraw funds (Protected: Requires fresh authentication + rate limiting)
router.post('/withdraw', auth, requireFreshAuth, withdrawalLimiter, async (req, res) => {
    try {
        const { walletType, amount, toAddress } = req.body;
        const user = await User.findById(req.user.id);

        const validWalletTypes = ['cash', 'game', 'cashback', 'lucky', 'directLevel', 'winners', 'roiOnRoi', 'club'];

        if (!validWalletTypes.includes(walletType)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid wallet type'
            });
        }

        if (!amount || amount < 1) {
            return res.status(400).json({
                status: 'error',
                message: 'Minimum withdrawal amount is 1 USDT'
            });
        }

        // Check activation requirements
        if (walletType === 'directLevel' && !user.activation?.canWithdrawDirectLevel) {
            return res.status(403).json({
                status: 'error',
                message: 'Direct Level withdrawal requires minimum 10 USDT deposit (Tier 1)'
            });
        }

        if (walletType === 'winners' && !user.activation?.canWithdrawWinners) {
            return res.status(403).json({
                status: 'error',
                message: 'Winners Income withdrawal requires minimum 10 USDT deposit (Tier 1)'
            });
        }

        // For other profit wallets, require Tier 2
        const tier2Wallets = ['cash', 'game', 'cashback', 'lucky', 'roiOnRoi', 'club'];
        if (tier2Wallets.includes(walletType) && !user.activation?.canWithdrawAll) {
            return res.status(403).json({
                status: 'error',
                message: `Full withdrawal access for ${walletType} requires minimum 100 USDT deposit (Tier 2)`
            });
        }

        // Check balance
        if (user.realBalances[walletType] < amount) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient balance'
            });
        }

        // Process withdrawal
        user.realBalances[walletType] -= amount;
        await user.save();

        res.status(200).json({
            status: 'success',
            message: `Successfully withdrew ${amount} USDT from ${walletType} wallet`,
            data: {
                withdrawnAmount: amount,
                walletType,
                remainingBalance: user.realBalances[walletType],
                txHash: null // Will be updated by processor
            }
        });

    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process withdrawal'
        });
    }
});

// ============================================
// ADMIN: TIER SETTINGS
// ============================================

// Update tier thresholds
router.post('/admin/update-tier-thresholds', async (req, res) => {
    try {
        const { adminKey, tier1Threshold, tier2Threshold } = req.body;
        if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

        if (tier1Threshold !== undefined) TIER_CONFIG.tier1.minDeposit = tier1Threshold;
        if (tier2Threshold !== undefined) TIER_CONFIG.tier2.minDeposit = tier2Threshold;

        res.status(200).json({
            status: 'success',
            message: 'Tier thresholds updated',
            data: TIER_CONFIG
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Add a helper to export current TIER_CONFIG for other modules
router.getTierConfig = () => TIER_CONFIG;

module.exports = router;
