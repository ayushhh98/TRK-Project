const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const PlatformStats = require('../models/PlatformStats');
const system = require('../config/system');
const { checkDepositPause, checkWithdrawalPause } = require('../middleware/systemCheck');
const { isPaused } = require('../utils/emergency');

const router = express.Router();
const Notification = require('../models/Notification');
const SystemConfig = require('../models/SystemConfig');

const emitAdminFinancialActivity = (req, user, type, amount, status = 'COMPLETED', metadata = {}) => {
    const io = req.app.get('io');
    if (!io) return;

    const payload = {
        type,
        user: {
            walletAddress: user.walletAddress,
            email: user.email
        },
        amount,
        status,
        ...metadata,
        timestamp: new Date().toISOString()
    };

    io.emit('admin:financial_activity', payload);
};

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
            'Withdraw from DIRECT LEVEL INCOME',
            'Withdraw from WINNERS INCOME'
        ]
    },
    tier2: {
        minDeposit: 100,
        benefits: [
            'Transfer Practice Balance',
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
router.post('/deposit', auth, checkDepositPause, async (req, res) => {
    try {
        // middleware handles system check

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

        // Update Direct Level Commissions (Referral Income Logic)
        const { distributeDepositCommissions } = require('../utils/incomeDistributor');
        await distributeDepositCommissions(user._id, amount);

        // Update Global Turnover in PlatformStats
        const updatedStats = await PlatformStats.incrementTurnover(amount);

        // Notify User of balance change and broadcast turnover update
        const io = req.app.get('io');
        if (io) {
            const nowIso = new Date().toISOString();
            io.emit('platform:turnover_update', {
                dailyTurnover: updatedStats.dailyTurnover,
                totalTurnover: updatedStats.totalTurnover
            });

            // Broadcast Elite Club Live Metrics
            const adminRoutes = require('./admin');
            adminRoutes.broadcastEliteStats();
            adminRoutes.broadcastEliteLiveFeed(user, 'VOLUME_INFLUX', { amount });

            const depositEvent = {
                id: txHash || `dep_${user._id.toString()}_${Date.now()}`,
                type: 'DEPOSIT',
                user: {
                    walletAddress: user.walletAddress || '',
                    email: user.email || ''
                },
                amount: Number(amount) || 0,
                txHash: txHash || null,
                status: 'COMPLETED',
                createdAt: nowIso,
                note: `tier_${user.activation?.tier || 'none'}_deposit`
            };
            io.emit('transaction_created', depositEvent);
            io.emit('new_deposit', depositEvent);
            emitAdminFinancialActivity(req, user, 'DEPOSIT', amount, 'COMPLETED', { txHash, tier: user.activation?.tier });

            // 1. Balance Update
            io.to(user._id.toString()).emit('balance_update', {
                type: 'deposit',
                amount: amount,
                newBalance: user.realBalances.game
            });

            // 2. Deposit Confirmed (Triggers ActivationPage refresh)
            io.to(user._id.toString()).emit('deposit_confirmed', {
                amount: amount,
                txHash: txHash,
                newTotalDeposited: user.activation.totalDeposited
            });

            // 3. Activation/Tier Update
            io.to(user._id.toString()).emit('activation_update', {
                tier: user.activation.tier,
                totalDeposited: user.activation.totalDeposited,
                newTier: user.activation.tier !== 'none' ? user.activation.tier : null
            });

            // Create notification record
            const notification = await Notification.createNotification({
                userId: user._id,
                type: 'deposit',
                category: 'transaction',
                title: `Deposit of ${amount.toFixed(2)} USDT`,
                message: `credited to your vault.`,
                icon: 'coins',
                metadata: {
                    amount,
                    balance: user.realBalances.game,
                    tier: user.activation.tier
                }
            });

            // Emit notification event
            io.to(user._id.toString()).emit('notification', {
                notification: notification.toObject(),
                unreadCount: await Notification.getUnreadCount(user._id)
            });

            // Notify Referrer via Socket.io
            if (user.referredBy) {
                io.to(user.referredBy.toString()).emit('referral_activity', {
                    type: 'deposit',
                    userId: user._id,
                    amount: amount,
                    userName: user.name || 'A friend',
                    timestamp: new Date()
                });
            }
        }

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

        // Notify User of balance change
        const io = req.app.get('io');
        if (io) {
            io.to(user._id.toString()).emit('balance_update', {
                type: 'transfer_practice',
                amount: amount,
                newBalance: user.realBalances.game
            });
            emitAdminFinancialActivity(req, user, 'PRACTICE_TRANSFER', amount, 'COMPLETED');
        }

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
router.post('/withdraw', auth, requireFreshAuth, withdrawalLimiter, checkWithdrawalPause, async (req, res) => {
    try {
        // Emergency Protocol Check
        if (await isPaused('withdrawal')) {
            return res.status(503).json({ status: 'error', code: 'EMERGENCY_PAUSE', message: 'Withdrawals are currently suspended for safety protocols.' });
        }
        // middleware handles system check

        const { walletType, amount, toAddress } = req.body;
        const user = await User.findById(req.user.id);

        const validWalletTypes = ['cash', 'game', 'cashback', 'lucky', 'directLevel', 'winners', 'roiOnRoi', 'club', 'teamWinners'];

        if (!validWalletTypes.includes(walletType)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid wallet type'
            });
        }

        const floatAmount = parseFloat(amount);
        if (isNaN(floatAmount) || floatAmount < 5) {
            return res.status(400).json({ status: 'error', message: 'Minimum withdrawal amount is 5 USDT' });
        }

        // Daily Limit Check
        const today = new Date().toISOString().split('T')[0];
        const lastWD = user.withdrawalLimits?.lastWithdrawalDate?.toISOString().split('T')[0];

        if (lastWD !== today) {
            user.withdrawalLimits.dailyWithdrawalTotal = 0;
            user.withdrawalLimits.lastWithdrawalDate = new Date();
        }

        if ((user.withdrawalLimits.dailyWithdrawalTotal + floatAmount) > 5000) {
            return res.status(400).json({
                status: 'error',
                message: `Exceeds daily withdrawal limit. Remaining for today: ${Math.max(0, 5000 - user.withdrawalLimits.dailyWithdrawalTotal)} USDT`
            });
        }

        // Tier Checks
        if (walletType === 'directLevel' && !user.activation?.canWithdrawDirectLevel) {
            return res.status(403).json({ status: 'error', message: 'Direct Level withdrawal requires Tier 1 activation' });
        }
        if (walletType === 'winners' && !user.activation?.canWithdrawWinners) {
            return res.status(403).json({ status: 'error', message: 'Winners Income withdrawal requires Tier 1 activation' });
        }
        const tier2Wallets = ['cash', 'game', 'cashback', 'lucky', 'roiOnRoi', 'club', 'teamWinners'];
        if (tier2Wallets.includes(walletType) && !user.activation?.canWithdrawAll) {
            return res.status(403).json({ status: 'error', message: `Withdrawal from ${walletType} requires Tier 2 activation` });
        }

        // Check balance
        if (user.realBalances[walletType] < floatAmount) {
            return res.status(400).json({ status: 'error', message: 'Insufficient balance' });
        }

        // Apply Configurable Sustainability Fee
        const config = await SystemConfig.getConfig();
        const feePercent = config.withdrawal?.sustainabilityFee || 10;
        const fee = floatAmount * (feePercent / 100);
        const netAmount = floatAmount - fee;

        // Process withdrawal
        user.realBalances[walletType] -= floatAmount;
        user.withdrawalLimits.dailyWithdrawalTotal += floatAmount;

        // Update Platform Stats
        const PlatformStats = require('../models/PlatformStats');
        const stats = await PlatformStats.getToday();
        stats.todayWithdrawals += floatAmount;
        stats.sustainabilityFees += fee;
        await stats.save();

        // Record the withdrawal
        user.withdrawals = user.withdrawals || [];
        user.withdrawals.push({
            amount,
            walletType,
            txHash: null,
            status: 'pending', // Usually pending until admin/contract processes it
            createdAt: new Date()
        });

        await user.save();

        // Notify User of balance change
        const io = req.app.get('io');
        if (io) {
            const withdrawalEvent = {
                id: `wd_${user._id.toString()}_${Date.now()}`,
                type: 'WITHDRAWAL',
                user: {
                    walletAddress: user.walletAddress || '',
                    email: user.email || ''
                },
                amount: Number(amount) || 0,
                txHash: null,
                status: 'COMPLETED',
                createdAt: new Date().toISOString(),
                note: `${walletType}_withdrawal`
            };
            io.emit('transaction_created', withdrawalEvent);
            io.emit('withdrawal_processed', withdrawalEvent);
            emitAdminFinancialActivity(req, user, 'WITHDRAWAL', amount, 'COMPLETED', { walletType, toAddress });

            io.to(user._id.toString()).emit('balance_update', {
                type: 'withdrawal',
                walletType: walletType,
                amount: amount,
                remainingBalance: user.realBalances[walletType]
            });
        }

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

/**
 * POST /deposit/lucky-topup
 * Manually top up Lucky Draw Wallet from other balances
 */
router.post('/lucky-topup', auth, async (req, res) => {
    try {
        const { fromWallet, amount } = req.body;
        const user = await User.findById(req.user.id);

        const validSources = ['cash', 'game', 'cashback', 'winners', 'directLevel', 'roiOnRoi', 'club', 'teamWinners'];

        if (!validSources.includes(fromWallet)) {
            return res.status(400).json({ status: 'error', message: 'Invalid source wallet' });
        }

        const floatAmount = parseFloat(amount);
        if (isNaN(floatAmount) || floatAmount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid amount' });
        }

        if (user.realBalances[fromWallet] < floatAmount) {
            return res.status(400).json({ status: 'error', message: 'Insufficient balance in source wallet' });
        }

        // Transfer funds
        user.realBalances[fromWallet] -= floatAmount;
        user.realBalances.luckyDrawWallet = (user.realBalances.luckyDrawWallet || 0) + floatAmount;

        await user.save();

        // Notify UI
        const io = req.app.get('io');
        if (io) {
            io.to(user._id.toString()).emit('balance_update', {
                type: 'lucky_topup',
                from: fromWallet,
                amount: floatAmount,
                newLuckyBalance: user.realBalances.luckyDrawWallet,
                newSourceBalance: user.realBalances[fromWallet]
            });
            emitAdminFinancialActivity(req, user, 'LUCKY_TOPUP', floatAmount, 'COMPLETED', { fromWallet });
        }

        res.status(200).json({
            status: 'success',
            message: `Successfully topped up Lucky Draw Wallet with ${floatAmount} USDT`,
            data: {
                luckyDrawWallet: user.realBalances.luckyDrawWallet,
                sourceBalance: user.realBalances[fromWallet]
            }
        });
    } catch (error) {
        console.error('Lucky top-up error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to process top-up' });
    }
});

// POST /deposit/transfer-practice
// Allows Tier 2 users to transfer practice earnings to real game balance
router.post('/transfer-practice', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findById(req.user.id);

        if (!user.activation?.canTransferPractice) {
            return res.status(403).json({
                status: 'error',
                message: 'Practice transfer requires Tier 2 activation and 100+ practice volume'
            });
        }

        const floatAmount = parseFloat(amount);
        if (isNaN(floatAmount) || floatAmount <= 0) {
            return res.status(400).json({ status: 'error', message: 'Invalid amount' });
        }

        // Limit: Max 1% of practice earnings or fixed cap?
        // Let's implement a 1% of totalPracticeVolume as the max transferable to keep it "Limited"
        const maxTransferable = user.activation.totalPracticeVolume * 0.01;

        // Track transferred amount to avoid abuse? 
        // For now, let's just check against balance.
        if (user.practiceBalance < floatAmount) {
            return res.status(400).json({ status: 'error', message: 'Insufficient practice balance' });
        }

        // Simple cap for now (e.g. max 10 USDT per transfer)
        if (floatAmount > 10) {
            return res.status(400).json({ status: 'error', message: 'Maximum transfer per transaction is 10 USDT' });
        }

        // Deduct from practice, add to real game balance
        user.practiceBalance -= floatAmount;
        user.realBalances.game = (user.realBalances.game || 0) + floatAmount;

        await user.save();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(user._id.toString()).emit('balance_update', {
                type: 'practice_transfer',
                amount: floatAmount,
                newPracticeBalance: user.practiceBalance,
                newRealBalance: user.realBalances.game
            });
        }

        res.status(200).json({
            status: 'success',
            message: `Successfully transferred ${floatAmount} USDT to Game Wallet`,
            data: {
                practiceBalance: user.practiceBalance,
                gameBalance: user.realBalances.game
            }
        });
    } catch (error) {
        console.error('Practice transfer error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to process transfer' });
    }
});

module.exports = router;
