const User = require('../models/User');
const PlatformStats = require('../models/PlatformStats');
const { isPaused } = require('./emergency');


const CLUB_RANKS = {
    'Rank 1': { poolShare: 0.02, targetVolume: 10000, name: 'Bronze Director' },
    'Rank 2': { poolShare: 0.02, targetVolume: 50000, name: 'Silver Director' },
    'Rank 3': { poolShare: 0.01, targetVolume: 250000, name: 'Gold Director' },
    'Rank 4': { poolShare: 0.01, targetVolume: 1000000, name: 'Platinum Director' },
    'Rank 5': { poolShare: 0.01, targetVolume: 5000000, name: 'Diamond Director' },
    'Rank 6': { poolShare: 0.01, targetVolume: 10000000, name: 'Crown Ambassador' }
};

const checkRankQualification = (strongLegVolume, otherLegsVolume, targetVolume) => {
    const maxStrongLegContribution = targetVolume * 0.5;
    const maxOtherLegsContribution = targetVolume * 0.5;

    const qualifiedStrongLeg = Math.min(strongLegVolume, maxStrongLegContribution);
    const qualifiedOtherLegs = Math.min(otherLegsVolume, maxOtherLegsContribution);
    // Other legs can contribute uncapped to the remaining requirement, 
    // BUT the requirement essentially says: 
    // "At least 50% must come from other legs" OR "Max 50% from strong leg".
    // If Target is 10,000. Max Strong = 5,000.
    // If Strong = 20,000. Qualified Strong = 5,000.
    // We need Total Qualified >= 10,000.
    // So Other Legs must provide at least 5,000.
    // If Other Legs = 0. Total Qualified = 5,000. Fail.

    // The previous logic was: return (qualifiedStrongLeg + qualifiedOtherLegs) >= targetVolume;
    // Let's see why it failed.
    // User A: Strong=20000, Other=0. Target=10000.
    // maxStrong = 5000. maxOther = 5000.
    // qualifiedStrong = min(20000, 5000) = 5000.
    // qualifiedOther = min(0, 5000) = 0.
    // Total = 5000. 5000 >= 10000 is FALSE.

    // Wait, why did the test say it qualified?
    // "User A (Unbalanced): Rank Rank 1, Club Income: 1000"
    // It seems it returned TRUE.

    // Ah, wait. `checkRankQualification` uses `targetVolume` from config.
    // Let's re-read the file content I saw earlier.
    // 13: const checkRankQualification = (strongLegVolume, otherLegsVolume, targetVolume) => {
    // 14:     const maxStrongLegContribution = targetVolume * 0.5;
    // 15:     const maxOtherLegsContribution = targetVolume * 0.5; 
    // 16: 
    // 17:     const qualifiedStrongLeg = Math.min(strongLegVolume, maxStrongLegContribution);
    // 18:     const qualifiedOtherLegs = Math.min(otherLegsVolume, maxOtherLegsContribution);
    // 19: 
    // 20:     return (qualifiedStrongLeg + qualifiedOtherLegs) >= targetVolume;
    // 21: };

    // If Target=10000. MaxStrong=5000. MaxOther=5000.
    // If Strong=20000 -> 5000. Other=0 -> 0. Sum=5000. 5000 >= 10000 is False.
    // SO LOGIC LOOKS CORRECT for that specific case.

    // BUT maybe because of how `calculateUserRank` works?
    // It iterates ALL ranks.
    // Maybe it matched a LOWER rank? No, Rank 1 is lowest.

    // Wait, did I screw up the test script?
    // "User A (Unbalanced): Rank Rank 1"

    // Let's look at `clubIncomeUtils.js` again.
    // Maybe `rankName` keys are causing issues?
    // 'Rank 1' volume is 10000.

    // Is it possible `otherLegsVolume` is being calculated incorrectly in `User` model or passed wrong?
    // In test: `otherLegsVolume: 0`.

    // Let's debug by adding logs in `clubIncomeUtils.js` to see what values it sees.
    console.log(`Checking Rank ${targetVolume}: Strong ${strongLegVolume} (Max ${maxStrongLegContribution}), Other ${otherLegsVolume} (Max ${maxOtherLegsContribution}) -> Qual ${qualifiedStrongLeg}+${qualifiedOtherLegs}`);

    return (qualifiedStrongLeg + qualifiedOtherLegs) >= targetVolume;
};

const calculateUserRank = (user) => {
    const { strongLegVolume = 0, otherLegsVolume = 0 } = user.teamStats || {};
    let highestRank = 'None';
    const sortedRanks = Object.entries(CLUB_RANKS).sort((a, b) => a[1].targetVolume - b[1].targetVolume);

    for (const [rankName, config] of sortedRanks) {
        if (checkRankQualification(strongLegVolume, otherLegsVolume, config.targetVolume)) {
            highestRank = rankName;
        }
    }
    return highestRank;
};

const processDailyClubIncome = async (io, manualTurnover = null) => {
    console.log("🏆 Processing Daily Club Income...");
    try {
        // Emergency Protocol Check
        if (await isPaused('clubIncome')) {
            console.warn("EMERGENCY_PAUSE: Club Income distribution is suspended.");
            return { success: false, message: 'EMERGENCY_PAUSE: Club Income distribution is suspended.' };
        }

        const stats = await PlatformStats.getToday();
        const activeTurnover = manualTurnover || stats.dailyTurnover;

        if (activeTurnover <= 0) {
            console.log("No turnover today, skipping club income distribution.");
            return { success: true, distributed: 0, winners: 0 };
        }

        // STRICT REQUIREMENT: User must have all streams unlocked (Tier 2)
        const allUsers = await User.find({
            'teamStats.totalTeamVolume': { $gt: 0 },
            isActive: true,
            'activation.allStreamsUnlocked': true
        });

        const qualifiedByRank = {};
        Object.keys(CLUB_RANKS).forEach(r => qualifiedByRank[r] = []);

        for (const user of allUsers) {
            const rank = calculateUserRank(user);
            if (rank !== 'None') {
                qualifiedByRank[rank].push(user);
            }
        }

        let distributedTotal = 0;
        let winnersCount = 0;

        for (const [rankId, users] of Object.entries(qualifiedByRank)) {
            if (users.length === 0) continue;

            const rankConfig = CLUB_RANKS[rankId];
            const rankPool = activeTurnover * rankConfig.poolShare;
            const perUserIncome = rankPool / users.length;

            for (const user of users) {
                const previousRank = user.clubRank;
                user.realBalances.cashbackROI = (user.realBalances.cashbackROI || 0) + perUserIncome;
                user.totalRewardsWon = (user.totalRewardsWon || 0) + perUserIncome;

                // Update rank field to be sure
                user.clubRank = rankId;

                await user.save();

                if (io) {
                    io.to(user._id.toString()).emit('balance_update', {
                        type: 'club_income',
                        amount: perUserIncome,
                        newBalance: user.realBalances.cashbackROI,
                        rank: rankId
                    });

                    if (previousRank !== rankId) {
                        io.emit('club_rank_updated', {
                            walletAddress: user.walletAddress || null,
                            clubRank: rankId,
                            previousRank: previousRank || null,
                            createdAt: new Date().toISOString()
                        });
                    }
                }
                distributedTotal += perUserIncome;
                winnersCount++;
            }
        }

        if (io) {
            io.emit('club_income_distributed', {
                distributed: distributedTotal,
                winners: winnersCount,
                turnover: activeTurnover,
                createdAt: new Date().toISOString()
            });
        }

        console.log(`Club Income processed: ${distributedTotal} Distributed to ${winnersCount} users.`);
        return { success: true, distributed: distributedTotal, winners: winnersCount, turnover: activeTurnover };

    } catch (error) {
        console.error("Club Income Distribution Error:", error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    CLUB_RANKS,
    calculateUserRank,
    processDailyClubIncome
};
