const User = require('../models/User');
const Commission = require('../models/Commission');

const getReferralSignupBonus = () => {
    const bonus = Number(process.env.REFERRAL_SIGNUP_BONUS || 10);
    return Number.isFinite(bonus) ? bonus : 10;
};

const awardReferralSignupBonus = async ({ referrerId, referredUserId, io }) => {
    if (!referrerId || !referredUserId) return { awarded: false, reason: 'missing' };

    const referrer = await User.findById(referrerId);
    if (!referrer) return { awarded: false, reason: 'not_found' };

    if (!Array.isArray(referrer.referrals)) {
        referrer.referrals = [];
    }

    const referredIdStr = referredUserId.toString();
    const alreadyLinked = referrer.referrals.some((id) => id.toString() === referredIdStr);
    if (!alreadyLinked) {
        referrer.referrals.push(referredUserId);
        if (!referrer.teamStats) referrer.teamStats = {};
        if (typeof referrer.teamStats.totalMembers !== 'number') {
            referrer.teamStats.totalMembers = 0;
        }
        referrer.teamStats.totalMembers += 1;
    }

    const bonus = getReferralSignupBonus();

    await referrer.save();

    let commissionRecord = null;
    try {
        const referredUser = await User.findById(referredUserId).select('walletAddress').lean();
        commissionRecord = await Commission.create({
            user: referrer._id,
            fromUser: referredUserId,
            amount: bonus,
            level: 1,
            type: 'signup_bonus',
            recipientWallet: referrer.walletAddress || null,
            sourceWallet: referredUser?.walletAddress || null,
            status: 'credited'
        });
    } catch (error) {
        console.error('Failed to log signup bonus commission:', error);
    }

    if (io) {
        const emittedAt = new Date();
        io.to(referrer._id.toString()).emit('balance_update', {
            type: 'referral_bonus',
            walletType: 'practice',
            amount: bonus,
            newBalance: referrer.practiceBalance || 0
        });

        io.to(referrer._id.toString()).emit('referral_activity', {
            type: 'signup',
            userId: referredUserId,
            amount: bonus,
            userName: 'New referral',
            timestamp: emittedAt
        });

        const signupEvent = {
            id: commissionRecord?._id?.toString() || `signup_${referrer._id.toString()}_${Date.now()}`,
            type: 'REFERRAL',
            user: {
                walletAddress: referrer.walletAddress || '',
                email: referrer.email || ''
            },
            amount: bonus,
            txHash: null,
            status: 'COMPLETED',
            createdAt: commissionRecord?.createdAt || emittedAt,
            note: 'signup_bonus'
        };
        io.emit('transaction_created', signupEvent);
        io.emit('referral_commission_created', signupEvent);
    }

    return { awarded: true, bonus };
};

module.exports = {
    awardReferralSignupBonus,
    getReferralSignupBonus
};
