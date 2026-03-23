const User = require('../models/User');

/**
 * Practice Referral Rewards Distribution System
 * Implements 15-100 level practice bonus structure from specification
 * 
 * Structure:
 * - Level 1: 10% (10 USDT)
 * - Level 2-5: 2% (2 USDT)
 * - Level 6-10: 1% (1 USDT)
 * - Level 11-15: 0.5% (0.5 USDT)
 * - Level 16-50: 0.25% (0.25 USDT)
 * - Level 51-100: 0.10% (0.10 USDT)
 * 
 * Limit: 20 Direct Referrals for practice bonus
 */

const PRACTICE_BASE_BONUS = 100; // 100 USDT practice balance

// Practice referral bonus structure (15-100 levels)
const PRACTICE_BONUS_RATES = {
    1: 10,        // Level 1: 10 USDT
    2: 2,         // Level 2-5: 2 USDT each
    3: 2,
    4: 2,
    5: 2,
    6: 1,         // Level 6-10: 1 USDT each
    7: 1,
    8: 1,
    9: 1,
    10: 1,
    11: 0.5,      // Level 11-15: 0.5 USDT each
    12: 0.5,
    13: 0.5,
    14: 0.5,
    15: 0.5,
    16: 0.25,     // Level 16-50: 0.25 USDT each
    17: 0.25,
    18: 0.25,
    19: 0.25,
    20: 0.25,
    21: 0.25,
    22: 0.25,
    23: 0.25,
    24: 0.25,
    25: 0.25,
    26: 0.25,
    27: 0.25,
    28: 0.25,
    29: 0.25,
    30: 0.25,
    31: 0.25,
    32: 0.25,
    33: 0.25,
    34: 0.25,
    35: 0.25,
    36: 0.25,
    37: 0.25,
    38: 0.25,
    39: 0.25,
    40: 0.25,
    41: 0.25,
    42: 0.25,
    43: 0.25,
    44: 0.25,
    45: 0.25,
    46: 0.25,
    47: 0.25,
    48: 0.25,
    49: 0.25,
    50: 0.25
};

// Levels 51-100: 0.10 USDT each
for (let i = 51; i <= 100; i++) {
    PRACTICE_BONUS_RATES[i] = 0.10;
}

/**
 * Award practice referral bonuses to upline (up to 100 levels)
 * Only awards to first 20 direct referrals per user
 * 
 * @param {ObjectId} newUserId - The newly registered user's ID
 * @param {Object} io - Socket.IO instance for real-time notifications
 * @returns {Object} Distribution summary
 */
async function distributePracticeReferralBonuses(newUserId, io) {
    try {
        const newUser = await User.findById(newUserId);
        if (!newUser || !newUser.referredBy) {
            return { success: false, reason: 'no_referrer' };
        }

        const bonusesAwarded = [];
        let currentUser = newUser;
        let level = 0;

        // Traverse upline up to 100 levels
        while (currentUser && currentUser.referredBy && level < 100) {
            level++;
            const upline = await User.findById(currentUser.referredBy);

            if (!upline) break;

            // Check if upline has exceeded 20 direct referral limit for practice bonuses
            const directReferralCount = upline.referrals?.length || 0;

            // Practice bonus only applies to first 20 direct referrals
            if (level === 1 && directReferralCount > 20) {
                console.log(`Upline ${upline._id} exceeded 20 direct practice bonus limit`);
                break;
            }

            // Get bonus amount for this level
            const bonusAmount = PRACTICE_BONUS_RATES[level] || 0;

            if (bonusAmount > 0) {
                // Award practice balance
                upline.practiceBalance = (upline.practiceBalance || 100) + bonusAmount;

                // Track practice volume for conversion eligibility
                if (!upline.activation) upline.activation = {};
                upline.activation.totalPracticeVolume = (upline.activation.totalPracticeVolume || 0) + bonusAmount;

                await upline.save();

                // Log simulation commission for Admin visibility
                try {
                    const PracticeCommission = require('../models/PracticeCommission');
                    await PracticeCommission.create({
                        user: upline._id,
                        fromUser: newUser._id,
                        amount: bonusAmount,
                        level: level
                    });
                } catch (err) {
                    console.error('Failed to log practice commission:', err);
                }

                // Real-time notification
                if (io) {
                    io.to(upline._id.toString()).emit('practice_bonus', {
                        type: 'referral_bonus',
                        level,
                        amount: bonusAmount,
                        fromUser: newUser.walletAddress || newUser.email,
                        newBalance: upline.practiceBalance,
                        timestamp: new Date()
                    });
                }

                bonusesAwarded.push({
                    userId: upline._id,
                    level,
                    amount: bonusAmount
                });
            }

            // Move to next upline
            currentUser = upline;
        }

        return {
            success: true,
            totalLevels: level,
            bonusesAwarded,
            totalDistributed: bonusesAwarded.reduce((sum, b) => sum + b.amount, 0)
        };

    } catch (error) {
        console.error('Practice bonus distribution error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get practice referral bonus structure (for info display)
 */
function getPracticeReferralStructure() {
    return {
        baseBonus: PRACTICE_BASE_BONUS,
        structure: [
            { levels: 'Level 1', percent: '10%', usdt: '10 USDT' },
            { levels: 'Level 2-5', percent: '2%', usdt: '2 USDT' },
            { levels: 'Level 6-10', percent: '1%', usdt: '1 USDT' },
            { levels: 'Level 11-15', percent: '0.5%', usdt: '0.5 USDT' },
            { levels: 'Level 16-50', percent: '0.25%', usdt: '0.25 USDT' },
            { levels: 'Level 51-100', percent: '0.10%', usdt: '0.10 USDT' }
        ],
        directReferralLimit: 20,
        conversionRequirement: {
            minimumPracticeVolume: 100,
            minimumDeposit: 100
        }
    };
}

/**
 * Check if user's practice balance is eligible for conversion to real cash
 * Requires: 100+ USDT total practice volume AND 100+ USDT deposit
 */
async function checkPracticeConversionEligibility(userId) {
    const user = await User.findById(userId);
    if (!user) return { eligible: false, reason: 'user_not_found' };

    const practiceVolume = user.activation?.totalPracticeVolume || 0;
    const totalDeposited = user.activation?.totalDeposited || 0;

    const eligible = practiceVolume >= 100 && totalDeposited >= 100;

    return {
        eligible,
        practiceVolume,
        totalDeposited,
        practiceBalance: user.practiceBalance,
        requirements: {
            practiceVolumeRequired: 100,
            practiceVolumeMet: practiceVolume >= 100,
            depositRequired: 100,
            depositMet: totalDeposited >= 100
        }
    };
}

module.exports = {
    distributePracticeReferralBonuses,
    getPracticeReferralStructure,
    checkPracticeConversionEligibility,
    PRACTICE_BASE_BONUS,
    PRACTICE_BONUS_RATES
};
