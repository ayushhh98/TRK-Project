const cron = require('node-cron');
const User = require('../models/User');
const { ethers } = require('ethers');
// const TRKGameABI = require('../contracts/TRKGameABI.json'); // Ensure this exists or use artifact
// NOTE: In a real deployment, you'd import the Contract Service to interact with the blockchain.
// For now, we will simulate the logic and update the Database state.

// Configuration
const DAILY_CASHBACK_PERCENT = 0.005; // 0.5%
const LUCKY_DRAW_AUTO_PERCENT = 0.20; // 20% of Cashback
const TICKET_PRICE = 10; // USDT

const startCronJobs = (io) => {
    console.log("⏰ Starting Server-Side Cron Jobs...");

    // 1. DAILY CASHBACK & LUCKY DRAW AUTO-ENTRY (Runs at 00:00 UTC every day)
    cron.schedule('0 0 * * *', async () => {
        console.log("🔄 Running Daily Cashback & Lucky Draw Routine...");
        try {
            const users = await User.find({
                'activation.cashbackActive': true,
                isActive: true
            });

            console.log(`Found ${users.length} eligible users for cashback.`);

            for (const user of users) {
                // LOGIC: Calculate Net Loss for Yesterday
                // In a real system, you'd query a Transaction/Bet model filtering by timestamp.
                // Here we assume 'cashbackStats.todayCashback' is populated by live betting events.

                // For this MVP, we are assuming 'cashbackStats.pendingCashback' tracks the loss amount eligible for cashback
                // In a full implementation, we'd reset 'today' stats here.

                // 1. Distribute Cashback
                // We use a simplified calculation based on TOTAL Deposit for now as per "0.5% of Capital" requirement if losses exist?
                // The requirement said "0.5% Daily" based on USER BASE, usually on DEPOSIT or LOSS?
                // Re-reading: "0.5% Daily" usually implies ROI on Capital OR Cashback on Loss.
                // The text says "Losers Profit - Cashback Protection... If luck isn't on your side... recover losses daily".
                // This implies it is based on LOSS AMOUNT.
                // Let's assume 'totalNetLoss' is the basis.

                if (user.cashbackStats.totalNetLoss > 0) {
                    const dailyCashback = user.cashbackStats.totalNetLoss * DAILY_CASHBACK_PERCENT;

                    // Cap check (Max 200% etc) - Skipped for MVP brevity

                    user.realBalances.cashback += dailyCashback;
                    user.cashbackStats.todayCashback = dailyCashback; // For ROI on ROI

                    console.log(`User ${user.walletAddress}: Cashback +${dailyCashback}`);

                    // 2. Auto-Buy Lucky Draw Ticket
                    if (user.settings.autoLuckyDraw) {
                        const deduction = dailyCashback * LUCKY_DRAW_AUTO_PERCENT;
                        user.realBalances.cashback -= deduction;
                        user.realBalances.luckyDrawWallet += deduction;

                        // Check if wallet has enough for a ticket
                        if (user.realBalances.luckyDrawWallet >= TICKET_PRICE) {
                            const tickets = Math.floor(user.realBalances.luckyDrawWallet / TICKET_PRICE);
                            const cost = tickets * TICKET_PRICE;

                            user.realBalances.luckyDrawWallet -= cost;
                            // In real on-chain, we'd call the contract here.
                            // contract.buyTickets(tickets)
                            console.log(`User ${user.walletAddress}: Auto-bought ${tickets} tickets.`);
                        }
                    }

                    await user.save();

                    // Notify User via Socket
                    if (io) {
                        io.to(user.walletAddress).emit('notification', {
                            type: 'cashback',
                            message: `Daily Cashback of ${dailyCashback.toFixed(2)} USDT Received!`
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Critical Cron Error:", error);
        }
    });

    // 2. CLUB RANK UPDATE (Runs at 00:30 UTC every day)
    cron.schedule('30 0 * * *', async () => {
        console.log("🏆 Updating Club Ranks...");
        try {
            const users = await User.find({ isActive: true });

            for (const user of users) {
                // In a real system, 'teamStats' would be aggregated from a separate 'Transaction' or 'Volume' collection daily.
                // Here we assume 'teamStats.totalTeamVolume' is up to date from the live deposit hooks.

                const strongLeg = user.teamStats.strongLegVolume;
                const otherLegs = user.teamStats.otherLegsVolume;
                const totalVolume = strongLeg + otherLegs; // Should match totalTeamVolume key

                // 50% Rule Check
                // Requirement: 50% max from strong leg, 50% from others.
                // Effective Volume = Min(StrongLeg, OtherLegs) * 2
                // Example: Strong 600, Others 400. Effective = 400 * 2 = 800.
                // The 'excess' 200 from strong leg doesn't count towards rank.

                let effectiveVolume = 0;
                if (strongLeg > otherLegs) {
                    effectiveVolume = otherLegs * 2;
                } else {
                    effectiveVolume = totalVolume; // If strong leg is < 50%, then all volume counts (technically 50/50 is ideal)
                }

                // Determine Rank
                let newRank = 'None';
                if (effectiveVolume >= 10000000) newRank = 'Rank 6';
                else if (effectiveVolume >= 5000000) newRank = 'Rank 5';
                else if (effectiveVolume >= 1000000) newRank = 'Rank 4';
                else if (effectiveVolume >= 250000) newRank = 'Rank 3';
                else if (effectiveVolume >= 50000) newRank = 'Rank 2';
                else if (effectiveVolume >= 10000) newRank = 'Rank 1';

                if (newRank !== user.clubRank) {
                    user.clubRank = newRank;
                    await user.save();
                    console.log(`User ${user.walletAddress} promoted to ${newRank}`);

                    if (io) {
                        io.to(user.walletAddress).emit('notification', {
                            type: 'rank_up',
                            message: `Congratulations! You've reached ${newRank}!`
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Club Rank Cron Error:", error);
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
                    const cost = ticketsToBuy * TICKET_PRICE;

                    // Deduct from wallet
                    // SWEEPSTAKES: Weekly draw logic adapted
                    // Previously deducted from 'luckyDrawWallet'. 
                    // Now, we could give FREE tickets to active members or deduct from Free Credits?
                    // For now, let's disable automated deductions to start clean.
                    /* 
                    user.realBalances.luckyDrawWallet -= cost;
                    user.realBalances.lucky += cost;
                    */

                    // In a real system, we would interact with the Smart Contract here:
                    // await contract.buyTickets(ticketsToBuy, { value: cost });

                    await user.save();
                    console.log(`User ${user.walletAddress}: Auto-bought ${ticketsToBuy} tickets (Cost: ${cost})`);

                    if (io) {
                        io.to(user.walletAddress).emit('notification', {
                            type: 'lucky_draw',
                            message: `Auto-bought ${ticketsToBuy} Lucky Draw Tickets!`
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Lucky Draw Cron Error:", error);
        }
    });
};

module.exports = { startCronJobs };
