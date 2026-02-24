const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { isPaused } = require('../utils/emergency');

const router = express.Router();

// ============================================
// LOSERS PROFIT - CASHBACK PROTECTION SYSTEM
// ============================================

// Cashback Tier Configuration based on total user base (Dynamic State)
let CASHBACK_PHASES = {
    phase1: {
        name: 'Phase 1',
        maxUsers: 100000,           // Up to 100,000 Users
        dailyRate: 0.005,           // 0.50% Daily
        description: 'Early adopter phase'
    },
    phase2: {
        name: 'Phase 2',
        maxUsers: 1000000,          // 100,001 – 10 Lakh Users
        dailyRate: 0.004,           // 0.40% Daily
        description: 'Growth phase'
    },
    phase3: {
        name: 'Phase 3',
        maxUsers: Infinity,         // After 10 Lakh Users
        dailyRate: 0.0033,          // 0.33% Daily
        description: 'Mature phase'
    }
};

// Activation thresholds (Dynamic State)
let ACTIVATION_THRESHOLD = 100;          // 100 USDT total losses to activate
let REDEPOSIT_AMOUNT = 100;              // 100 USDT re-deposit when cap reached
const ONE_LAKH_THRESHOLD = 100000;       // Reference for reduced caps

// ============================================
// SUSTAINABILITY CYCLE CONFIGURATION
// ============================================
// Earnings caps change after 1 Lakh users activation
// Before 1 Lakh: 400% - 800% cap
// After 1 Lakh: 300% - 400% cap

const getEarningsCap = async (boostTierMultiplier) => {
    try {
        const totalUsers = await User.countDocuments({
            isActive: true,
            'activation.totalDeposited': { $gte: 10 }  // Min 10 USDT per ID
        });

        const isAfterOneLakh = totalUsers >= ONE_LAKH_THRESHOLD;

        // Base caps per boost tier (multiplier based)
        // Before 1 Lakh: 400% base, 800% max (4X tier)
        // After 1 Lakh: 300% base, 400% max (4X tier)
        if (isAfterOneLakh) {
            // Reduced caps after 1 Lakh users
            return {
                baseCap: 3,         // 300%
                maxCap: 4,          // 400% (was 800%)
                currentCap: Math.min(3 * boostTierMultiplier, 4),  // Scale with boost, max 400%
                isReduced: true,
                userCount: totalUsers
            };
        } else {
            // Standard caps before 1 Lakh users
            return {
                baseCap: 4,         // 400%
                maxCap: 8,          // 800%
                currentCap: Math.min(4 * boostTierMultiplier, 8),  // Scale with boost, max 800%
                isReduced: false,
                userCount: totalUsers
            };
        }
    } catch (error) {
        return { baseCap: 4, maxCap: 8, currentCap: 4, isReduced: false, userCount: 0 };
    }
};

// Referral Cashback Boost tiers (Based on qualified referral count)
// Specification-compliant caps: 100%, 200%, 400%, 800%
const REFERRAL_BOOST_TIERS = [
    { minReferrals: 0, multiplier: 1, name: 'Tier 1X', baseProfitCap: 1 },       // 0 Referrals: 1X (100%)
    { minReferrals: 5, multiplier: 2, name: 'Tier 2X', baseProfitCap: 2 },       // 5 Referrals: 2X (200%)
    { minReferrals: 10, multiplier: 4, name: 'Tier 4X', baseProfitCap: 4 },      // 10 Referrals: 4X (400%)
    { minReferrals: 20, multiplier: 8, name: 'Tier 8X', baseProfitCap: 8 },      // 20 Referrals: 8X (800%)
];

// Get current phase based on user count
const getCurrentPhase = async () => {
    try {
        const totalUsers = await User.countDocuments({ isActive: true });

        if (totalUsers <= CASHBACK_PHASES.phase1.maxUsers) {
            return { ...CASHBACK_PHASES.phase1, userCount: totalUsers, phase: 'phase1' };
        } else if (totalUsers <= CASHBACK_PHASES.phase2.maxUsers) {
            return { ...CASHBACK_PHASES.phase2, userCount: totalUsers, phase: 'phase2' };
        } else {
            return { ...CASHBACK_PHASES.phase3, userCount: totalUsers, phase: 'phase3' };
        }
    } catch (error) {
        return { ...CASHBACK_PHASES.phase1, userCount: 0, phase: 'phase1' };
    }
};

// Get referral boost tier for a user
const getReferralBoostTier = (referralCount) => {
    let tier = REFERRAL_BOOST_TIERS[0];
    for (const t of REFERRAL_BOOST_TIERS) {
        if (referralCount >= t.minReferrals) {
            tier = t;
        }
    }
    return tier;
};

const computeClaimableCashback = (user, boostTier, currentPhase, earningsCapStatus) => {
    const totalLosses = user.cashbackStats?.totalNetLoss || 0;
    if (totalLosses <= 0) return 0;
    if (earningsCapStatus?.hasReachedCap) return 0;

    const boostedDailyCashback = totalLosses * currentPhase.dailyRate * boostTier.multiplier;
    if (!Number.isFinite(boostedDailyCashback) || boostedDailyCashback <= 0) return 0;

    const lastClaimedAt = user.cashbackStats?.lastClaimedAt
        ? new Date(user.cashbackStats.lastClaimedAt)
        : new Date();
    const lastTs = lastClaimedAt.getTime();
    const now = Date.now();
    const elapsedMs = Math.max(0, now - (Number.isNaN(lastTs) ? now : lastTs));
    const accrued = boostedDailyCashback * (elapsedMs / (24 * 60 * 60 * 1000));
    const remainingCap = earningsCapStatus?.remainingCap ?? accrued;

    return Math.max(0, Math.min(accrued, remainingCap));
};

// Check if user has reached their earnings cap
const checkEarningsCap = async (user, boostTier) => {
    const capInfo = await getEarningsCap(boostTier.multiplier);
    const totalLosses = user.cashbackStats?.totalNetLoss || 0;
    const totalRecovered = user.cashbackStats?.totalRecovered || 0;

    const maxEarnings = totalLosses * capInfo.currentCap;
    const hasReachedCap = totalRecovered >= maxEarnings;
    const remainingCap = Math.max(0, maxEarnings - totalRecovered);
    const capPercentage = (totalRecovered / maxEarnings) * 100;

    return {
        hasReachedCap,
        maxEarnings,
        remainingCap,
        capPercentage: Math.min(capPercentage, 100),
        currentCap: `${(capInfo.currentCap * 100).toFixed(0)}%`,
        capInfo,
        requiresRedeposit: hasReachedCap,
        redepositAmount: REDEPOSIT_AMOUNT
    };
};

// Get cashback status for user
router.get('/status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const currentPhase = await getCurrentPhase();

        // Calculate REAL referral count (Referrals with >= 100 USDT total volume)
        const referrals = await User.find({ _id: { $in: user.referrals } });

        let qualifiedReferralCount = 0;
        let totalReferralVolume = 0;

        for (const ref of referrals) {
            const userTotalDeposits = ref.deposits?.reduce((dSum, d) => dSum + d.amount, 0) || 0;
            totalReferralVolume += userTotalDeposits;
            if (userTotalDeposits >= 100) {
                qualifiedReferralCount++;
            }
        }

        const boostTier = getReferralBoostTier(qualifiedReferralCount);

        // Check activation status
        const totalLosses = user.cashbackStats?.totalNetLoss || 0;
        const isActivated = totalLosses >= ACTIVATION_THRESHOLD;
        if (isActivated && !user.cashbackStats.lastClaimedAt) {
            user.cashbackStats.lastClaimedAt = new Date();
            await user.save();
        }

        // Get sustainability cycle / earnings cap info
        const earningsCapStatus = await checkEarningsCap(user, boostTier);

        // Calculate daily cashback (paused if cap reached)
        const baseDailyCashback = earningsCapStatus.hasReachedCap ? 0 : totalLosses * currentPhase.dailyRate;
        const boostedDailyCashback = baseDailyCashback * boostTier.multiplier;

        // Calculate recovery progress
        const totalRecovered = user.cashbackStats?.totalRecovered || 0;
        const recoveryProgress = totalLosses > 0
            ? Math.min((totalRecovered / totalLosses) * 100, 100)
            : 0;

        // Estimate days to full recovery (or cap)
        const remainingToCap = earningsCapStatus.remainingCap;
        const daysToRecover = boostedDailyCashback > 0
            ? Math.ceil(remainingToCap / boostedDailyCashback)
            : 0;

        const claimableCashback = computeClaimableCashback(user, boostTier, currentPhase, earningsCapStatus);

        res.status(200).json({
            status: 'success',
            data: {
                // Activation
                isActivated,
                activationThreshold: ACTIVATION_THRESHOLD,
                totalLosses,

                // Phase info
                currentPhase: {
                    name: currentPhase.name,
                    dailyRate: `${(currentPhase.dailyRate * 100).toFixed(2)}%`,
                    userCount: currentPhase.userCount,
                    description: currentPhase.description
                },

                // Boost tier
                boostTier: {
                    name: boostTier.name,
                    multiplier: boostTier.multiplier,
                    baseProfitCap: boostTier.baseProfitCap,
                    referralCount: qualifiedReferralCount,
                    totalVolume: totalReferralVolume,
                    nextTier: REFERRAL_BOOST_TIERS.find(t => t.minReferrals > qualifiedReferralCount) || null
                },
                // Sustainability Cycle - Earnings Cap
                sustainabilityCycle: {
                    hasReachedCap: earningsCapStatus.hasReachedCap,
                    earningsPaused: earningsCapStatus.hasReachedCap,
                    currentCap: earningsCapStatus.currentCap,
                    maxEarnings: parseFloat(earningsCapStatus.maxEarnings.toFixed(2)),
                    totalRecovered,
                    remainingCap: parseFloat(earningsCapStatus.remainingCap.toFixed(2)),
                    capProgress: parseFloat(earningsCapStatus.capPercentage.toFixed(2)),
                    requiresRedeposit: earningsCapStatus.requiresRedeposit,
                    redepositAmount: REDEPOSIT_AMOUNT,
                    isReducedCap: earningsCapStatus.capInfo.isReduced,
                    capInfo: {
                        beforeOneLakh: { baseCap: '400%', maxCap: '800%' },
                        afterOneLakh: { baseCap: '300%', maxCap: '400%' },
                        currentUserCount: earningsCapStatus.capInfo.userCount,
                        activatedUserThreshold: ONE_LAKH_THRESHOLD
                    }
                },

                // Cashback amounts
                cashback: {
                    baseDailyRate: currentPhase.dailyRate,
                    boostedDailyRate: currentPhase.dailyRate * boostTier.multiplier,
                    baseDailyCashback: parseFloat(baseDailyCashback.toFixed(2)),
                    boostedDailyCashback: parseFloat(boostedDailyCashback.toFixed(2)),
                    pending: parseFloat(claimableCashback.toFixed(4)),
                    isPaused: earningsCapStatus.hasReachedCap
                },

                // Recovery progress
                recovery: {
                    totalRecovered,
                    remainingToCap: parseFloat(remainingToCap.toFixed(2)),
                    progress: parseFloat(recoveryProgress.toFixed(2)),
                    daysToRecover,
                    isFullyRecovered: earningsCapStatus.hasReachedCap
                },

                // Phase structure info
                phases: Object.entries(CASHBACK_PHASES).map(([key, phase]) => ({
                    id: key,
                    name: phase.name,
                    maxUsers: phase.maxUsers === Infinity ? '10 Lakh+' : phase.maxUsers.toLocaleString(),
                    dailyRate: `${(phase.dailyRate * 100).toFixed(2)}%`,
                    isCurrent: key === currentPhase.phase
                })),

                // Boost tiers info
                boostTiers: REFERRAL_BOOST_TIERS.map(tier => ({
                    ...tier,
                    minCount: tier.minReferrals,
                    isActive: qualifiedReferralCount >= tier.minReferrals
                })),

                // System advantages
                advantages: [
                    'No full capital wipe-outs',
                    'Daily automatic recovery',
                    'Predictable protection',
                    'Sustainable ecosystem design',
                    'Encourages smart, low-risk participation'
                ]
            }
        });

    } catch (error) {
        console.error('Get cashback status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get cashback status'
        });
    }
});


// Claim accrued cashback in real-time
router.post('/claim', auth, async (req, res) => {
    try {
        // Emergency Protocol Check
        if (await isPaused('roi')) {
            return res.status(503).json({ status: 'error', code: 'EMERGENCY_PAUSE', message: 'ROI/Cashback claims are currently suspended for safety protocols.' });
        }
        const user = await User.findById(req.user.id);
        const currentPhase = await getCurrentPhase();

        // Calculate REAL referral count
        const referrals = await User.find({ _id: { $in: user.referrals } });
        let qualifiedReferralCount = 0;
        for (const ref of referrals) {
            const userTotalDeposits = ref.deposits?.reduce((dSum, d) => dSum + d.amount, 0) || 0;
            if (userTotalDeposits >= 100) qualifiedReferralCount++;
        }

        const boostTier = getReferralBoostTier(qualifiedReferralCount);
        const earningsCapStatus = await checkEarningsCap(user, boostTier);

        const claimable = computeClaimableCashback(user, boostTier, currentPhase, earningsCapStatus);
        if (!Number.isFinite(claimable) || claimable <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No cashback available to claim yet.'
            });
        }

        user.cashbackStats.totalRecovered += claimable;
        user.realBalances.cashback += claimable;
        user.cashbackStats.pendingCashback = 0;
        user.cashbackStats.lastClaimedAt = new Date();
        user.cashbackStats.todayCashback = (user.cashbackStats.todayCashback || 0) + claimable;

        await user.save();

        return res.status(200).json({
            status: 'success',
            message: 'Cashback claimed successfully',
            data: {
                claimedAmount: parseFloat(claimable.toFixed(4)),
                cashbackBalance: parseFloat(user.realBalances.cashback.toFixed(4)),
                totalRecovered: parseFloat(user.cashbackStats.totalRecovered.toFixed(4))
            }
        });
    } catch (error) {
        console.error('Cashback claim error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to claim cashback'
        });
    }
});

// Get cashback history
router.get('/history', auth, async (req, res) => {
    try {
        // In production, fetch from daily_cashback_logs or similar collection
        res.status(200).json({
            status: 'success',
            data: {
                history: [],
                summary: {
                    totalDays: 0,
                    totalCredited: 0,
                    totalPending: 0
                }
            }
        });

    } catch (error) {
        console.error('Get cashback history error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get cashback history'
        });
    }
});

// Process daily cashback (would be called by a cron job)
router.post('/process-daily', async (req, res) => {
    try {
        // Emergency Protocol Check
        if (await isPaused('roi')) {
            return res.status(503).json({ status: 'error', code: 'EMERGENCY_PAUSE', message: 'ROI/Cashback distribution is currently suspended for safety protocols.' });
        }
        const { adminKey } = req.body;

        // Simple admin key check (use proper auth in production)
        if (adminKey !== process.env.ADMIN_KEY) {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized'
            });
        }

        const currentPhase = await getCurrentPhase();

        // Find all users with losses >= 100 USDT and not fully recovered
        const eligibleUsers = await User.find({
            'cashbackStats.totalNetLoss': { $gte: ACTIVATION_THRESHOLD },
            $expr: { $lt: ['$cashbackStats.totalRecovered', '$cashbackStats.totalNetLoss'] }
        });

        let processedCount = 0;
        let totalDistributed = 0;

        for (const user of eligibleUsers) {
            // Need to fetch referrals for accurate boost
            const referrals = await User.find({ _id: { $in: user.referrals } });
            let qualifiedReferralCount = 0;
            for (const ref of referrals) {
                const dep = ref.deposits?.reduce((s, d) => s + d.amount, 0) || 0;
                if (dep >= 100) qualifiedReferralCount++;
            }

            const boostTier = getReferralBoostTier(qualifiedReferralCount);

            const remainingLoss = user.cashbackStats.totalNetLoss - user.cashbackStats.totalRecovered;
            const maxRecoveryCap = user.cashbackStats.totalNetLoss * boostTier.baseProfitCap; // Fixed prop name
            const maxRecoverable = maxRecoveryCap - user.cashbackStats.totalRecovered;

            if (maxRecoverable <= 0) continue;

            const dailyCashback = Math.min(
                user.cashbackStats.totalNetLoss * currentPhase.dailyRate * boostTier.multiplier,
                remainingLoss,
                maxRecoverable
            );

            // 80/20 Split: 80% for recovery, 20% for Lucky Draw Wallet
            const toCashbackWallet = dailyCashback * 0.8;
            const toLuckyDrawWallet = dailyCashback * 0.2;

            user.cashbackStats.totalRecovered += dailyCashback;

            // SWEEPSTAKES: Cashback credited as Reward Points (SC)
            user.rewardPoints += toCashbackWallet;

            // Lucky Draw Wallet Logic (Convert to Credits)
            if (toLuckyDrawWallet > 0) {
                user.credits += toLuckyDrawWallet * 10;
            }

            // Store today's cashback for ROI distribution
            user.cashbackStats.todayCashback = dailyCashback;

            await user.save();

            processedCount++;
            totalDistributed += dailyCashback;
        }

        res.status(200).json({
            status: 'success',
            message: 'Daily cashback processed',
            data: {
                phase: currentPhase.name,
                rate: `${(currentPhase.dailyRate * 100).toFixed(2)}%`,
                processedUsers: processedCount,
                totalDistributed: parseFloat(totalDistributed.toFixed(2))
            }
        });

    } catch (error) {
        console.error('Process daily cashback error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process daily cashback'
        });
    }
});

// Record a loss (called when user loses a game)
router.post('/record-loss', auth, async (req, res) => {
    try {
        const { lossAmount } = req.body;
        const user = await User.findById(req.user.id);

        if (!user.cashbackStats) {
            user.cashbackStats = {
                totalNetLoss: 0,
                totalRecovered: 0,
                pendingCashback: 0,
                todayCashback: 0
            };
        }

        if (user.realBalances.luckyDrawWallet === undefined) {
            user.realBalances.luckyDrawWallet = 0;
        }

        user.cashbackStats.totalNetLoss += lossAmount;

        const isNowActivated = user.cashbackStats.totalNetLoss >= ACTIVATION_THRESHOLD;
        if (isNowActivated && !user.cashbackStats.lastClaimedAt) {
            user.cashbackStats.lastClaimedAt = new Date();
        }

        await user.save();

        res.status(200).json({
            status: 'success',
            message: 'Loss recorded',
            data: {
                lossAmount,
                totalNetLoss: user.cashbackStats.totalNetLoss,
                isActivated: isNowActivated
            }
        });
    } catch (error) {
        console.error('Record loss error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to record loss'
        });
    }
});

module.exports = router;
