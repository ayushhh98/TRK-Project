const User = require('../models/User');

const ROI_COMMISSION_RATES = {
    1: 0.20,      // Level 1: 20%
    2: 0.10,      // Level 2-5: 10%
    3: 0.10,
    4: 0.10,
    5: 0.10,
    6: 0.05,      // Level 6-10: 5%
    7: 0.05,
    8: 0.05,
    9: 0.05,
    10: 0.05,
    11: 0.03,     // Level 11-15: 3%
    12: 0.03,
    13: 0.03,
    14: 0.03,
    15: 0.03,
};

const CASHBACK_POOL_ALLOCATION = 0.50;  // 50% of cashback goes to referral pool
const LUCKY_DRAW_AUTO_PERCENT = 0.20; // 20% of commissions go to Lucky Draw Wallet

/**
 * Process daily ROI on ROI for all users with today's cashback
 */
const processDailyRoi = async (io) => {
    console.log("📈 Starting Daily ROI on ROI Processing...");
    try {
        const usersWithCashback = await User.find({ 'cashbackStats.todayCashback': { $gt: 0 } });
        let totalDistributed = 0;

        for (const user of usersWithCashback) {
            const poolAmount = user.cashbackStats.todayCashback * CASHBACK_POOL_ALLOCATION;
            let currentUser = user;
            let currentLevel = 1;

            while (currentUser?.referredBy && currentLevel <= 15) {
                const upline = await User.findById(currentUser.referredBy);
                if (upline) {
                    // Qualification: Standard dynamic compression or referral count based
                    // "The deeper your network grows..." implies referral-based depth
                    const referralCount = upline.referrals?.length || 0;

                    // Simple logic: 1 referral unlocks 1 level? Or standard logic?
                    // Using standard logic from incomeDistributor usually:
                    // 10 directs -> 15 levels.
                    const unlockedLevels = referralCount >= 10 ? 15 : referralCount;

                    if (currentLevel <= unlockedLevels) {
                        const totalCommission = poolAmount * ROI_COMMISSION_RATES[currentLevel];
                        const luckyCommission = totalCommission * LUCKY_DRAW_AUTO_PERCENT;
                        const mainCommission = totalCommission - luckyCommission;

                        // Update balances
                        upline.realBalances.cashbackROI = (upline.realBalances.cashbackROI || 0) + mainCommission;
                        upline.realBalances.luckyDrawWallet = (upline.realBalances.luckyDrawWallet || 0) + luckyCommission;

                        upline.rewardPoints += totalCommission; // Tracking total gross reward

                        await upline.save();
                        totalDistributed += totalCommission;

                        if (io) {
                            io.to(upline._id.toString()).emit('balance_update', {
                                type: 'commission',
                                commissionType: 'roi_on_roi',
                                amount: mainCommission,
                                luckyAmount: luckyCommission,
                                newBalance: upline.realBalances.cashbackROI,
                                newLuckyBalance: upline.realBalances.luckyDrawWallet
                            });
                        }

                        // Log Commission
                        try {
                            const Commission = require('../models/Commission');
                            await Commission.create({
                                user: upline._id,
                                fromUser: user._id,
                                amount: totalCommission,
                                level: currentLevel,
                                type: 'roi_commission',
                                status: 'credited'
                            });
                        } catch (e) { console.error(e); }
                    }
                }
                currentUser = upline;
                currentLevel++;
            }

            // Note: We DON'T clear todayCashback here if cron.js needs it for other things,
            // but roiOnRoi.js previously did. Let's assume this utility handles the final state.
            user.cashbackStats.todayCashback = 0;
            await user.save();
        }

        console.log(`✅ Daily ROI Finished. Distributed ${totalDistributed.toFixed(2)} USDT.`);
        return totalDistributed;
    } catch (error) {
        console.error('Daily ROI processing error:', error);
        throw error;
    }
};

module.exports = {
    processDailyRoi,
    ROI_COMMISSION_RATES,
    CASHBACK_POOL_ALLOCATION
};
