const JackpotRound = require('../models/JackpotRound');
const User = require('../models/User');
const crypto = require('crypto');
const { logger } = require('../utils/logger');
const system = require('../config/system');
const { isPaused } = require('../utils/emergency');

/**
 * Jackpot Service
 * Business logic for jackpot operations
 */

// Prize distribution chart
const PRIZE_CHART = [
    { rank: '1st', amount: 10000, winners: 1 },
    { rank: '2nd', amount: 5000, winners: 1 },
    { rank: '3rd', amount: 4000, winners: 1 },
    { rank: '4th - 10th', amount: 1000, winners: 7 },
    { rank: '11th - 50th', amount: 300, winners: 40 },
    { rank: '51st - 100th', amount: 120, winners: 50 },
    { rank: '101st - 500th', amount: 40, winners: 400 },
    { rank: '501st - 1000th', amount: 20, winners: 500 }
];

class JackpotService {
    constructor(io) {
        this.io = io; // Socket.IO instance
    }

    /**
     * Get current active round
     */
    async getActiveRound() {
        let round = await JackpotRound.getActiveRound();

        // Auto-create first round if none exists
        if (!round) {
            logger.info('No active jackpot round found, creating first round');
            round = await JackpotRound.createNewRound();
        }

        return round;
    }

    /**
     * Get round status for public display
     */
    async getRoundStatus() {
        const round = await this.getActiveRound();

        return {
            roundNumber: round.roundNumber,
            totalTickets: round.totalTickets,
            ticketsSold: round.ticketsSold,
            ticketPrice: round.ticketPrice,
            totalPrizePool: round.totalPrizePool,
            progress: round.progress,
            isFull: round.isFull,
            status: round.status,
            isActive: round.isActive,
            prizes: PRIZE_CHART,
            totalWinners: 1000,
            winChance: '10%',
            recentWinners: round.winners.slice(-3).map(w => ({
                wallet: this.maskWallet(w.walletAddress),
                prize: `$${w.prize.toLocaleString()}`,
                rank: w.rank
            }))
        };
    }

    /**
     * Purchase tickets
     */
    async purchaseTickets(userId, quantity = 1) {
        const round = await this.getActiveRound();

        // Validation
        if (!round.isActive) {
            throw new Error('Lucky Draw is currently paused');
        }

        if (round.ticketsSold + quantity > round.totalTickets) {
            throw new Error('Exceeds round ticket limit');
        }

        // Emergency Protocol Check
        if (await isPaused('jackpot')) {
            throw new Error('EMERGENCY_PAUSE: Jackpot operations are suspended by protocol.');
        }

        // Get user
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const totalCost = quantity * round.ticketPrice;

        // Check balance (using Game Balance or Lucky Wallet)
        const purchaseFrom = user.realBalances.luckyDrawWallet >= totalCost ? 'luckyDrawWallet' : 'game';

        if (user.realBalances[purchaseFrom] < totalCost) {
            throw new Error(`Insufficient ${purchaseFrom === 'game' ? 'Game Balance' : 'Lucky Wallet'}`);
        }

        // Deduct balance
        user.realBalances[purchaseFrom] -= totalCost;
        await user.save();

        // Add tickets to round
        const tickets = [];
        for (let i = 0; i < quantity; i++) {
            const ticketId = round.addTicket(userId, user.walletAddress, 1);
            tickets.push({
                ticketId,
                purchasedAt: new Date()
            });
        }

        // Calculate surplus
        round.calculateSurplus();
        await round.save();

        // Emit real-time events
        this.emitTicketPurchased(round, user.walletAddress, quantity);
        await this.broadcastStats(); // Real-time update for admin

        // Check if round is full - execute draw
        if (round.isFull) {
            logger.info(`Round ${round.roundNumber} is full, executing draw`);
            await this.executeDraw(round._id, null, 'automatic');
        }

        return {
            tickets,
            newBalance: user.realBalances[purchaseFrom],
            currentProgress: round.progress,
            roundNumber: round.roundNumber
        };
    }

    /**
     * Execute draw and select winners
     */
    async executeDraw(roundId, executedBy = null, method = 'automatic') {
        // Emergency Protocol Check
        if (await isPaused('jackpot')) {
            logger.warn(`EMERGENCY_PAUSE: Draw for round ${roundId} aborted.`);
            throw new Error('EMERGENCY_PAUSE: Jackpot operations are suspended.');
        }

        const round = await JackpotRound.findById(roundId);

        if (!round) {
            throw new Error('Round not found');
        }

        if (round.status !== 'active') {
            throw new Error('Round is not active');
        }

        // Update status
        round.status = 'drawing';
        await round.save();

        logger.info(`Executing draw for round ${round.roundNumber}`);

        try {
            // Generate provably fair seed
            const drawSeed = crypto.randomBytes(32).toString('hex');
            round.drawSeed = drawSeed;

            // Select winners using provably fair algorithm
            const winners = await this.selectWinners(round, drawSeed);

            // Set winners
            round.setWinners(winners);
            round.status = 'completed';
            round.drawExecutedAt = new Date();
            round.drawExecutedBy = executedBy;
            round.drawMethod = method;

            await round.save();

            // Emit winners
            this.emitDrawComplete(round, winners);

            // Distribute prizes to winners
            await this.distributePrizes(round);

            // Create new round
            await this.createNewRound();

            // Broadcast final results
            await this.broadcastStats();

            logger.info(`Draw completed for round ${round.roundNumber}, ${winners.length} winners selected`);

            return winners;
        } catch (error) {
            // Rollback on error
            round.status = 'active';
            await round.save();
            await this.broadcastStats();
            throw error;
        }
    }

    /**
     * Provably fair winner selection algorithm
     */
    async selectWinners(round, seed) {
        const allTickets = round.tickets;
        const winners = [];

        // Create deterministic random generator
        const rng = this.createSeededRNG(seed);

        // Shuffle tickets using Fisher-Yates with seeded RNG
        const shuffled = [...allTickets];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Select winners based on prize chart
        let currentIndex = 0;
        for (const prize of PRIZE_CHART) {
            for (let i = 0; i < prize.winners && currentIndex < shuffled.length; i++) {
                const ticket = shuffled[currentIndex];
                winners.push({
                    userId: ticket.userId,
                    walletAddress: ticket.walletAddress,
                    ticketId: ticket.ticketId,
                    rank: prize.rank,
                    prize: prize.amount
                });
                currentIndex++;
            }
        }

        return winners;
    }

    /**
     * Create seeded random number generator
     */
    createSeededRNG(seed) {
        let state = 0;
        for (let i = 0; i < seed.length; i++) {
            state = (state + seed.charCodeAt(i)) % 2147483647;
        }

        return function () {
            state = (state * 16807) % 2147483647;
            return (state - 1) / 2147483646;
        };
    }

    /**
     * Distribute prizes to winners
     */
    async distributePrizes(round) {
        for (const winner of round.winners) {
            try {
                const user = await User.findById(winner.userId);
                if (user) {
                    // Add prize to user's LUCKY balance (to enforce Lucky Draw withdrawal limits)
                    if (!user.realBalances) user.realBalances = {};
                    user.realBalances.lucky = (user.realBalances.lucky || 0) + winner.prize;
                    await user.save();

                    // Notify User of Win
                    if (this.io) {
                        this.io.to(user._id.toString()).emit('balance_update', {
                            type: 'lucky_win',
                            amount: winner.prize,
                            newBalance: user.realBalances.lucky
                        });
                    }

                    // Update winner status
                    winner.status = 'completed';
                    winner.claimedAt = new Date();

                    logger.info(`Prize distributed: ${winner.prize} USDT to ${winner.walletAddress}`);
                }
            } catch (error) {
                logger.error(`Failed to distribute prize to ${winner.walletAddress}:`, error);
                winner.status = 'failed';
            }
        }

        await round.save();
    }

    /**
     * Create new round
     */
    async createNewRound(config = {}) {
        const newRound = await JackpotRound.createNewRound(config);

        // Emit new round event
        this.emitNewRound(newRound);

        logger.info(`New jackpot round created: ${newRound.roundNumber}`);

        return newRound;
    }

    /**
     * Update round parameters
     */
    async updateParameters(roundId, newPrice, newLimit, updatedBy) {
        const round = await JackpotRound.findById(roundId);

        if (!round) {
            throw new Error('Round not found');
        }

        if (round.ticketsSold > 0) {
            throw new Error('Cannot change parameters during an active round with tickets sold');
        }

        // Track changes
        const changes = [];

        if (newPrice && newPrice !== round.ticketPrice) {
            changes.push({
                field: 'ticketPrice',
                oldValue: round.ticketPrice,
                newValue: newPrice,
                changedBy: updatedBy
            });
            round.ticketPrice = newPrice;
        }

        if (newLimit && newLimit !== round.totalTickets) {
            changes.push({
                field: 'totalTickets',
                oldValue: round.totalTickets,
                newValue: newLimit,
                changedBy: updatedBy
            });
            round.totalTickets = newLimit;
        }

        round.parameterChanges.push(...changes);
        round.updatedBy = updatedBy;

        await round.save();

        // Emit update
        this.emitStatusUpdate(round);
        await this.broadcastStats();

        return round;
    }

    /**
     * Toggle pause/resume
     */
    async togglePause(roundId) {
        const round = await this.getActiveRound();
        round.isActive = !round.isActive;
        await round.save();

        // Emit status change
        this.emitStatusUpdate(round);
        await this.broadcastStats();

        return round;
    }

    /**
     * Withdraw surplus
     */
    async withdrawSurplus(roundId, withdrawnBy) {
        const round = await JackpotRound.findById(roundId);

        if (!round || round.status !== 'completed') {
            throw new Error('Can only withdraw surplus from completed rounds');
        }

        if (round.surplusWithdrawn) {
            throw new Error('Surplus already withdrawn');
        }

        const amount = round.surplus;
        round.surplusWithdrawn = true;
        round.surplusWithdrawnAt = new Date();
        round.surplusWithdrawnBy = withdrawnBy;

        await round.save();

        logger.info(`Surplus withdrawn: ${amount} USDT from round ${round.roundNumber}`);
        await this.broadcastStats();

        return amount;
    }

    // ============================================
    // Real-Time Analytics Broadcast
    // ============================================

    async broadcastStats() {
        try {
            if (!this.io) return;

            const activeRound = await JackpotRound.findOne({ status: 'active' }).sort({ roundNumber: -1 });
            const previousRound = await JackpotRound.findOne({ status: 'completed' }).sort({ roundNumber: -1 });
            const SystemConfig = require('../models/SystemConfig');
            const config = await SystemConfig.findOne({ key: 'default' });

            // Calculate auto-entry stats
            const autoEntryUsersCount = await User.countDocuments({ 'settings.autoLuckyDraw': true });

            // Historical totals
            const historicalStats = await JackpotRound.aggregate([
                { $match: { status: 'completed' } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: { $multiply: ["$ticketPrice", "$ticketsSold"] } },
                        totalPrizes: { $sum: "$totalPrizePool" },
                        totalSurplus: { $sum: "$surplus" }
                    }
                }
            ]);

            const history = historicalStats[0] || { totalRevenue: 0, totalPrizes: 0, totalSurplus: 0 };

            const prizeDistribution = [
                { rank: '1st', prize: '10,000 USDT', winners: 1 },
                { rank: '2nd', prize: '5,000 USDT', winners: 1 },
                { rank: '3rd', prize: '4,000 USDT', winners: 1 },
                { rank: '4–10', prize: '1,000 USDT', winners: 7 },
                { rank: '11–50', prize: '300 USDT', winners: 40 },
                { rank: '51–100', prize: '120 USDT', winners: 50 },
                { rank: '101–500', prize: '40 USDT', winners: 400 },
                { rank: '501–1000', prize: '20 USDT', winners: 500 }
            ];

            const JackpotProtocol = require('../models/JackpotProtocol');
            const protocols = await JackpotProtocol.find().lean();

            // Map fields for frontend compatibility
            const mappedProtocols = protocols.map(p => ({
                ...p,
                lastChangedBy: p.changedBy,
                lastReason: p.reason
            }));

            const payload = {
                activeDraw: activeRound ? {
                    id: activeRound.roundNumber,
                    ticketsSold: activeRound.ticketsSold,
                    totalTickets: activeRound.totalTickets,
                    ticketPrice: activeRound.ticketPrice,
                    totalPool: activeRound.totalPrizePool,
                    status: activeRound.status,
                    progress: activeRound.progress
                } : null,
                previousDraw: previousRound ? {
                    id: previousRound.roundNumber,
                    blockNumber: previousRound.blockNumber || '0x00000',
                    rngHash: previousRound.drawSeed || '0x00000',
                    executionTime: previousRound.drawExecutedAt,
                    txHash: previousRound.winners[0]?.transactionHash || null,
                    topWinnerWallet: previousRound.winners[0]?.walletAddress,
                    topPrizePaid: previousRound.winners[0]?.prize
                } : null,
                autoEntry: {
                    totalUsers: autoEntryUsersCount,
                    autoTicketsPurchased: activeRound ? activeRound.ticketsSold : 0, // Using actual tickets sold
                    isEnabledGlobally: config?.luckyDraw?.autoEntryEnabled || false,
                },
                financials: {
                    ticketRevenue: activeRound ? activeRound.ticketPrice * activeRound.ticketsSold : 0,
                    prizeReserved: activeRound ? activeRound.totalPrizePool : 0,
                    totalHistoricalRevenue: history.totalRevenue,
                    totalHistoricalPrizes: history.totalPrizes,
                    platformSurplus: history.totalSurplus
                },
                protocols: mappedProtocols,
                distributionConfig: prizeDistribution,
                emergencyFlags: config?.emergencyFlags || {},
                timestamp: new Date().toISOString()
            };

            this.io.emit('admin:jackpot_stats_update', payload);
        } catch (error) {
            logger.error('Failed to broadcast jackpot stats:', error.message);
        }
    }

    /**
     * Broadcast administrative activity log
     */
    async broadcastActivity(log) {
        if (!this.io || !log) return;

        this.io.emit('admin:jackpot_activity', {
            ...log,
            timestamp: log.timestamp || new Date().toISOString()
        });
    }

    // ============================================
    // Socket.IO Event Emitters
    // ============================================

    emitTicketPurchased(round, walletAddress, quantity) {
        if (!this.io) return;

        this.io.emit('jackpot:ticket_sold', {
            roundNumber: round.roundNumber,
            ticketsSold: round.ticketsSold,
            totalTickets: round.totalTickets,
            progress: round.progress,
            buyer: this.maskWallet(walletAddress),
            quantity,
            timestamp: new Date()
        });

        // Use the new broadcastActivity pattern for ticket sales as well if needed
        this.io.emit('admin:jackpot_activity', {
            type: 'TICKET_PURCHASE',
            walletAddress,
            quantity,
            roundNumber: round.roundNumber,
            timestamp: new Date().toISOString()
        });
    }

    emitStatusUpdate(round) {
        if (!this.io) return;

        const isSystemPaused = system.get().emergencyFlags.pauseLuckyDraw;

        this.io.emit('jackpot:status_update', {
            roundNumber: round.roundNumber,
            ticketsSold: round.ticketsSold,
            totalTickets: round.totalTickets,
            ticketPrice: round.ticketPrice,
            isActive: round.isActive && !isSystemPaused,
            status: round.status,
            progress: round.progress
        });
    }

    emitDrawComplete(round, winners) {
        if (!this.io) return;

        this.io.emit('jackpot:draw_complete', {
            roundNumber: round.roundNumber,
            totalWinners: winners.length,
            topWinners: winners.slice(0, 3).map(w => ({
                wallet: this.maskWallet(w.walletAddress),
                prize: w.prize,
                rank: w.rank
            }))
        });

        // Emit individual winner announcements
        winners.forEach((winner, index) => {
            setTimeout(() => {
                this.io.emit('jackpot:winner_announced', {
                    wallet: this.maskWallet(winner.walletAddress),
                    prize: winner.prize,
                    rank: winner.rank
                });
            }, index * 1000); // Stagger announcements
        });
    }

    emitNewRound(round) {
        if (!this.io) return;

        this.io.emit('jackpot:new_round', {
            roundNumber: round.roundNumber,
            ticketPrice: round.ticketPrice,
            totalTickets: round.totalTickets,
            totalPrizePool: round.totalPrizePool
        });
    }

    // Utility: Mask wallet address
    maskWallet(address) {
        if (!address || address.length < 10) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }
}

module.exports = JackpotService;
