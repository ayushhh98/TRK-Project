const User = require('../models/User');
const Commission = require('../models/Commission');

const DIRECT_LEVEL_RATES = {
    1: 0.05, 2: 0.02, 3: 0.01, 4: 0.01, 5: 0.01,
    6: 0.005, 7: 0.005, 8: 0.005, 9: 0.005, 10: 0.005,
    11: 0.005, 12: 0.005, 13: 0.005, 14: 0.005, 15: 0.005,
};

const WINNER_LEVEL_RATES = {
    1: 0.05, 2: 0.02, 3: 0.01, 4: 0.01, 5: 0.01,
    6: 0.005, 7: 0.005, 8: 0.005, 9: 0.005, 10: 0.005,
    11: 0.005, 12: 0.005, 13: 0.005, 14: 0.005, 15: 0.005,
};

/**
 * getPracticeRewardAmount:
 * Level 1: 10 USDT
 * Level 2-5: 2 USDT
 * Level 6-10: 1 USDT
 * Level 11-15: 0.5 USDT
 * Level 16-50: 0.25 USDT
 * Level 51-100: 0.10 USDT
 */
const getPracticeRewardAmount = (level) => {
    if (level === 1) return 10;
    if (level >= 2 && level <= 5) return 2;
    if (level >= 6 && level <= 10) return 1;
    if (level >= 11 && level <= 15) return 0.5;
    if (level >= 16 && level <= 50) return 0.25;
    if (level >= 51 && level <= 100) return 0.10;
    return 0;
};

const getUnlockedLevels = (directReferrals) => {
    if (directReferrals >= 10) return 15;
    return Math.min(directReferrals, 15);
};

const ensureRealBalances = (user) => {
    if (!user.realBalances) {
        user.realBalances = {
            game: 0,
            cashbackROI: 0,
            luckyDrawWallet: 0,
            directLevel: 0,
            winners: 0,
            cash: 0
        };
        return;
    }
    if (typeof user.realBalances.directLevel !== 'number') user.realBalances.directLevel = 0;
    if (typeof user.realBalances.winners !== 'number') user.realBalances.winners = 0;
    if (typeof user.realBalances.cashbackROI !== 'number') user.realBalances.cashbackROI = 0;
};

const emitAdminReferralTransaction = (payload) => {
    try {
        const io = require('../server').io;
        if (!io) return;
        io.emit('transaction_created', payload);
        io.emit('referral_commission_created', payload);
        io.emit('admin:commission_activity', payload);
    } catch (error) {
        // Avoid breaking commission distribution due to socket issues.
    }
};

const distributeDepositCommissions = async (userId, depositAmount) => {
    try {
        let currentUser = await User.findById(userId);
        // Real referral commission starts only after the depositing user is activated.
        if (!currentUser?.activation || !['tier1', 'tier2'].includes(currentUser.activation.tier)) {
            return;
        }
        let currentLevel = 1;

        while (currentUser?.referredBy && currentLevel <= 15) {
            const upline = await User.findById(currentUser.referredBy);
            if (!upline) break;

            // STRICT ACTIVATION CHECK: Must be at least Tier 1 to earn commissions
            if (upline.activation && (upline.activation.tier === 'tier1' || upline.activation.tier === 'tier2')) {
                const unlockedLevels = getUnlockedLevels(upline.referrals?.length || 0);
                if (currentLevel <= unlockedLevels) {
                    const rate = DIRECT_LEVEL_RATES[currentLevel] || 0;
                    const commission = depositAmount * rate;
                    ensureRealBalances(upline);
                    upline.rewardPoints += commission;
                    upline.realBalances.directLevel += commission;
                    await upline.save();

                    // Notify User of balance change
                    const io = require('../server').io;
                    if (io) {
                        io.to(upline._id.toString()).emit('balance_update', {
                            type: 'commission',
                            commissionType: 'deposit',
                            amount: commission,
                            newBalance: upline.realBalances.directLevel
                        });
                    }

                    // Log commission
                    try {
                        const commissionRecord = await Commission.create({
                            user: upline._id,
                            fromUser: userId,
                            amount: commission,
                            level: currentLevel,
                            type: 'deposit_commission',
                            recipientWallet: upline.walletAddress || null,
                            sourceWallet: currentUser.walletAddress || null,
                            status: 'credited'
                        });

                        emitAdminReferralTransaction({
                            id: commissionRecord._id.toString(),
                            type: 'REFERRAL',
                            user: {
                                walletAddress: upline.walletAddress || '',
                                email: upline.email || ''
                            },
                            fromWallet: currentUser.walletAddress || '',
                            amount: commission,
                            txHash: null,
                            status: 'COMPLETED',
                            createdAt: commissionRecord.createdAt,
                            note: `deposit_commission_l${currentLevel}`
                        });
                    } catch (logError) {
                        console.error('Failed to log deposit commission:', logError);
                    }
                }
            }
            currentUser = upline;
            currentLevel++;
        }
    } catch (error) {
        console.error('Distribute deposit commissions error:', error);
    }
};

const distributeWinnerCommissions = async (winnerId, winAmount) => {
    try {
        let currentUser = await User.findById(winnerId);
        let currentLevel = 1;

        while (currentUser?.referredBy && currentLevel <= 15) {
            const upline = await User.findById(currentUser.referredBy);
            if (!upline) break;

            // STRICT ACTIVATION CHECK: Must be at least Tier 1 to earn winner commissions
            if (upline.activation && (upline.activation.tier === 'tier1' || upline.activation.tier === 'tier2')) {
                const unlockedLevels = getUnlockedLevels(upline.referrals?.length || 0);
                if (currentLevel <= unlockedLevels) {
                    const rate = WINNER_LEVEL_RATES[currentLevel] || 0;
                    const commission = winAmount * rate;
                    ensureRealBalances(upline);
                    upline.rewardPoints += commission;
                    upline.realBalances.winners += commission;
                    await upline.save();

                    // Notify User of balance change
                    const io = require('../server').io;
                    if (io) {
                        io.to(upline._id.toString()).emit('balance_update', {
                            type: 'commission',
                            commissionType: 'winner',
                            amount: commission,
                            newBalance: upline.realBalances.winners
                        });
                    }

                    // Log commission
                    try {
                        const commissionRecord = await Commission.create({
                            user: upline._id,
                            fromUser: winnerId,
                            amount: commission,
                            level: currentLevel,
                            type: 'winner_commission',
                            recipientWallet: upline.walletAddress || null,
                            sourceWallet: currentUser.walletAddress || null,
                            status: 'credited'
                        });

                        emitAdminReferralTransaction({
                            id: commissionRecord._id.toString(),
                            type: 'REFERRAL',
                            user: {
                                walletAddress: upline.walletAddress || '',
                                email: upline.email || ''
                            },
                            fromWallet: currentUser.walletAddress || '',
                            amount: commission,
                            txHash: null,
                            status: 'COMPLETED',
                            createdAt: commissionRecord.createdAt,
                            note: `winner_commission_l${currentLevel}`
                        });
                    } catch (logError) {
                        console.error('Failed to log winner commission:', logError);
                    }
                }
            }
            currentUser = upline;
            currentLevel++;
        }
    } catch (error) {
        console.error('Distribute winner commissions error:', error);
    }
};

const distributePracticeRewards = async (newUserId, referrerId) => {
    try {
        if (!referrerId) return;

        // 1. Check Level 1 Referrer's limit (Limit: 20 Direct Referrals for this bonus)
        const referrer = await User.findById(referrerId);
        if (!referrer) return;

        // If referrer already has 20 referrals, they don't get Level 1 bonus, 
        // but the bonus might still flow up levels?
        // "Earn... for every person you introduce (Limit: 20 Direct Referrals for this bonus)"
        // This implies the reward distribution is triggered per introduction, capped at 20 for the L1.

        let currentLevel = 1;
        let currentUser = await User.findById(newUserId);

        while (currentUser?.referredBy && currentLevel <= 100) {
            const upline = await User.findById(currentUser.referredBy);
            if (!upline) break;

            // Apply Level 1 specific limit
            if (currentLevel === 1) {
                // If this is the 21st+ referral, skip L1 reward but allow flow up?
                // Usually these rewards are to encourage initial growth.
                if (upline.referrals && upline.referrals.length > 20) {
                    // Skip reward for this level
                } else {
                    const amount = getPracticeRewardAmount(currentLevel);
                    if (amount > 0) {
                        upline.practiceBalance = (upline.practiceBalance || 0) + amount;
                        await upline.save();
                    }
                }
            } else {
                // Levels 2-100
                const amount = getPracticeRewardAmount(currentLevel);
                if (amount > 0) {
                    upline.practiceBalance = (upline.practiceBalance || 0) + amount;
                    await upline.save();
                }
            }

            currentUser = upline;
            currentLevel++;
        }
    } catch (error) {
        console.error('Distribute practice rewards error:', error);
    }
};

module.exports = {
    distributeDepositCommissions,
    distributeWinnerCommissions,
    distributePracticeRewards,
    getUnlockedLevels
};
