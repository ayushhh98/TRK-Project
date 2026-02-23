const cron = require('node-cron');
const User = require('../models/User');
const Game = require('../models/Game');
const { ethers } = require('ethers');
const { calculateUserRank, processDailyClubIncome } = require('../utils/clubIncomeUtils');
// const TRKGameABI = require('../contracts/TRKGameABI.json'); // Ensure this exists or use artifact
// NOTE: In a real deployment, you'd import the Contract Service to interact with the blockchain.
// For now, we will simulate the logic and update the Database state.

// Configuration
const DAILY_CASHBACK_PERCENT = 0.005; // 0.5%
const LUCKY_DRAW_AUTO_PERCENT = 0.20; // 20% of Cashback
const TICKET_PRICE = 10; // USDT

const startCronJobs = (io) => {
    console.log("⏰ Starting Server-Side Cron Jobs...");

    // 1. DAILY CASHBACK, ROI ON ROI & 30-DAY CLEANUP (Runs at 00:00 UTC every day)
    cron.schedule('0 0 * * *', async () => {
        console.log("🔄 Running Daily Maintenance Routine...");
        try {
            // A. CLEANUP: Delete practice accounts older than 30 days without activation
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const deleted = await User.deleteMany({
                'activation.tier': 'none',
                'activation.totalDeposited': 0,
                createdAt: { $lt: thirtyDaysAgo }
            });
            if (deleted.deletedCount > 0) {
                console.log(`🧹 Deleted ${deleted.deletedCount} inactive practice accounts older than 30 days.`);
            }

            // B. CASHBACK: Phase-based and Capping-based distribution
            const activationCount = await User.countDocuments({ 'activation.tier': { $ne: 'none' } });
            let cashbackRate = 0.005; // Phase 1: 0.5%
            if (activationCount > 100000) cashbackRate = 0.004; // Phase 2: 0.4%
            if (activationCount > 1000000) cashbackRate = 0.0033; // Phase 3: 0.33%

            const users = await User.find({
                'activation.cashbackActive': true,
                isActive: true,
                'cashbackStats.totalNetLoss': { $gt: 0 }
            });

            for (const user of users) {
                // Referral Qualification: Each referral must have 100+ USDT real volume OR 100+ USDT deposit
                // "each referred user maintains a minimum trading/deposit volume of 100 USDT"
                const qualifiedRefs = await User.countDocuments({
                    _id: { $in: user.referrals || [] },
                    $or: [
                        { 'activation.totalRealVolume': { $gte: 100 } },
                        { 'activation.totalDeposited': { $gte: 100 } }
                    ]
                });

                // Tier Benefits for Capping
                // Tier 1: 100% cap (0 refs)
                // Tier 2: 200% cap (5 refs)
                // Tier 3: 400% cap (10 refs) -> Down to 300% after 1Lakh users
                // Tier 4: 800% cap (20 refs) -> Down to 400% after 1Lakh users
                let capMultiplier = 1;
                if (qualifiedRefs >= 20) {
                    capMultiplier = activationCount > 100000 ? 4 : 8;
                } else if (qualifiedRefs >= 10) {
                    capMultiplier = activationCount > 100000 ? 3 : 4;
                } else if (qualifiedRefs >= 5) {
                    capMultiplier = 2;
                }

                const maxRecovery = user.activation.totalDeposited * capMultiplier;

                // Re-deposit check: "earnings pause... User must: Re-deposit minimum 100 USDT"
                // Verify if user has deposited since last cap reached
                if (user.cashbackStats.totalRecovered >= maxRecovery) {
                    console.log(`User ${user.walletAddress}: Cashback Cap Reached (${maxRecovery} USDT). Awaiting 100+ USDT re-deposit.`);
                    continue;
                }

                // Calculate daily recovery
                let dailyCashback = user.cashbackStats.totalNetLoss * cashbackRate;

                // Ensure we don't exceed max recovery or remaining net loss
                const remainingToCap = maxRecovery - user.cashbackStats.totalRecovered;
                const remainingLoss = user.cashbackStats.totalNetLoss - user.cashbackStats.totalRecovered;

                dailyCashback = Math.min(dailyCashback, remainingToCap, remainingLoss);

                if (dailyCashback > 0) {
                    // Update stats
                    user.cashbackStats.totalRecovered += dailyCashback;
                    user.cashbackStats.todayCashback = dailyCashback; // Basis for ROI on ROI

                    // 20% Auto-fund Lucky Draw from Daily Cashback
                    const luckyDrawFunding = dailyCashback * 0.20;
                    const netCashback = dailyCashback - luckyDrawFunding;

                    user.realBalances.cashback += netCashback;
                    user.realBalances.luckyDrawWallet = (user.realBalances.luckyDrawWallet || 0) + luckyDrawFunding;

                    await user.save();
                }
            }

            // C. ROI ON ROI: Distribute commissions based on today's cashback
            console.log("📈 Distributing ROI on ROI commissions...");
            const { processDailyRoi } = require('../utils/roiOnRoiUtils');
            await processDailyRoi(io);

        } catch (error) {
            console.error("Critical Maintenance Cron Error:", error);
        }
    });

    // 2. CLUB RANK UPDATE & INCOME DISTRIBUTION (Runs at 00:30 UTC every day)
    cron.schedule('30 0 * * *', async () => {
        console.log("🏆 Updating Club Ranks and Distributing Income...");
        try {
            const users = await User.find({ isActive: true });

            for (const user of users) {
                const newRank = calculateUserRank(user);

                if (newRank !== user.clubRank) {
                    const oldRank = user.clubRank;
                    user.clubRank = newRank;
                    await user.save();
                    console.log(`User ${user.walletAddress} promoted from ${oldRank} to ${newRank}`);

                    if (io) {
                        io.to(user._id.toString()).emit('balance_update', {
                            type: 'rank_up',
                            message: `Congratulations! You've reached ${newRank}!`,
                            newRank: newRank
                        });
                        io.emit('club_rank_updated', {
                            walletAddress: user.walletAddress || null,
                            previousRank: oldRank || null,
                            clubRank: newRank,
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            }

            // After ranks are updated, distribute the turnover pool
            await processDailyClubIncome(io);

        } catch (error) {
            console.error("Club Income Cron Error:", error);
        }
    });

    // 3. LUCKY DRAW AUTO-ENTRY (Runs every 1 hour)
    cron.schedule('0 * * * *', async () => {
        console.log("🎫 Checking Lucky Draw Auto-Entries...");
        try {
            const users = await User.find({
                'realBalances.luckyDrawWallet': { $gte: TICKET_PRICE },
                'settings.autoLuckyDraw': true
            });

            for (const user of users) {
                const walletBalance = user.realBalances.luckyDrawWallet;
                const ticketsToBuy = Math.floor(walletBalance / TICKET_PRICE);

                if (ticketsToBuy > 0) {
                    try {
                        const JackpotService = require('./jackpotService');
                        const jackpotService = new JackpotService(io);
                        await jackpotService.purchaseTickets(user._id, ticketsToBuy);

                        console.log(`User ${user.walletAddress}: Auto-bought ${ticketsToBuy} tickets via cron`);
                    } catch (error) {
                        console.error(`Lucky Draw Auto-Entry failed for ${user.walletAddress}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error("Lucky Draw Cron Error:", error);
        }
        // 4. PRACTICE GAME RESOLUTION (Runs every 1 hour alongside Lucky Draw)
        console.log("🎲 Resolving Pending Practice Games...");
        try {
            const pendingGames = await Game.find({ gameType: 'practice', status: 'pending' }).populate('user');
            
            if (pendingGames.length > 0) {
                // Generate the global lucky numbers for each variant
                const luckyNumbers = {
                    guess: Math.floor(Math.random() * 10), // 0-9
                    dice: Math.floor(Math.random() * 8) + 1, // 1-8
                    spin: Math.floor(Math.random() * 8) + 1 // 1-8
                };
                
                console.log(`Global Practice Draw: Guess[${luckyNumbers.guess}], Dice[${luckyNumbers.dice}], Spin[${luckyNumbers.spin}]`);

                const userUpdates = {}; // Map of user._id -> user document
                
                for (const game of pendingGames) {
                    if (!game.user) continue;

                    let isWin = false;
                    let luckyNumber = 'Simulated';
                    let multiplier = 8; // Default Practice Multiplier

                    if (game.gameVariant === 'guess') {
                        luckyNumber = luckyNumbers.guess;
                        isWin = game.pickedNumber === luckyNumber;
                    } else if (game.gameVariant === 'dice') {
                         luckyNumber = luckyNumbers.dice;
                         isWin = game.pickedNumber === luckyNumber;
                    } else if (game.gameVariant === 'spin') {
                         luckyNumber = luckyNumbers.spin;
                         isWin = game.pickedNumber === luckyNumber;
                    } else {
                         // Fallback
                         luckyNumber = Math.floor(Math.random() * 10);
                         isWin = game.pickedNumber === luckyNumber;
                    }

                    const payout = isWin ? game.betAmount * multiplier : 0;
                    
                    game.isWin = isWin;
                    game.luckyNumber = luckyNumber;
                    game.payout = payout;
                    game.multiplier = multiplier;
                    game.status = 'resolved';
                    game.resolvedAt = new Date();
                    
                    await game.save();

                    const userId = game.user._id.toString();

                    if (isWin) {
                        if (!userUpdates[userId]) {
                             userUpdates[userId] = await User.findById(userId);
                        }
                        if (userUpdates[userId]) {
                            userUpdates[userId].practiceBalance = (userUpdates[userId].practiceBalance || 0) + payout;
                            userUpdates[userId].gamesWon = (userUpdates[userId].gamesWon || 0) + 1;
                            userUpdates[userId].totalWinnings = (userUpdates[userId].totalWinnings || 0) + (payout - game.betAmount);
                        }
                    }
                    
                    if (typeof io !== 'undefined' && io) {
                        const currentBalance = userUpdates[userId] 
                            ? userUpdates[userId].practiceBalance 
                            : game.user.practiceBalance;

                        io.to(userId).emit('game_result', {
                            isWin,
                            payout,
                            luckyNumber,
                            gameType: 'practice',
                            gameVariant: game.gameVariant,
                            newBalance: currentBalance,
                            status: 'resolved',
                            pickedNumber: game.pickedNumber
                        });
                    }
                }
                
                // Save all batch-updated users
                let resolvedUsersCount = 0;
                for (const userId in userUpdates) {
                    if (userUpdates[userId]) {
                        await userUpdates[userId].save();
                        resolvedUsersCount++;
                    }
                }

                console.log(`Successfully resolved ${pendingGames.length} practice games.`);
            }
        } catch (error) {
            console.error("Practice Game Resolution Error:", error);
        }
    });
};

module.exports = { startCronJobs };
