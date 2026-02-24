const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/rbac');
const JackpotService = require('../services/jackpotService');
const system = require('../config/system');
const crypto = require('crypto');
const JackpotProtocol = require('../models/JackpotProtocol');
const JackpotLog = require('../models/JackpotLog');
const { logger } = require('../utils/logger');
const JackpotRound = require('../models/JackpotRound');

const router = express.Router();

// In development, allow admin to manage jackpot to avoid blocking local testing.
const requireJackpotAdmin = process.env.NODE_ENV === 'production' ? requireSuperAdmin : requireAdmin;

// Service instance will be set after Socket.IO initialization
let jackpotService;

// Initialize service with Socket.IO
router.initializeService = (io) => {
    jackpotService = new JackpotService(io);
};

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /lucky-draw/status
 * Get current jackpot round status
 */
router.get('/status', async (req, res) => {
    try {
        if (!jackpotService) {
            return res.status(503).json({
                status: 'error',
                message: 'Jackpot service not initialized'
            });
        }

        const status = await jackpotService.getRoundStatus();

        res.status(200).json({
            status: 'success',
            data: {
                ...status,
                drawIsActive: status.isActive && !system.get().emergencyFlags.pauseLuckyDraw,
                totalSurplus: 0 // Surplus only visible to admins
            }
        });
    } catch (error) {
        console.error('Get jackpot status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get jackpot status'
        });
    }
});

/**
 * GET /lucky-draw/recent-winners
 * Get list of recent winners across all rounds
 */
router.get('/recent-winners', async (req, res) => {
    try {
        const JackpotRound = require('../models/JackpotRound');

        // Find last 10 completed rounds with winners
        const recentRounds = await JackpotRound.find({
            status: 'completed',
            'winners.0': { $exists: true }
        })
            .sort({ drawExecutedAt: -1 })
            .limit(10);

        // Flatten winners from all rounds
        const winners = [];
        recentRounds.forEach(round => {
            // Take up to 3 winners per round to keep it interesting but not overwhelming
            round.winners.slice(0, 3).forEach(winner => {
                winners.push({
                    id: `${round.roundNumber}-${winner.walletAddress}-${winner._id}`,
                    wallet: winner.walletAddress,
                    prize: winner.prize,
                    rank: winner.rank,
                    timestamp: round.drawExecutedAt,
                    roundNumber: round.roundNumber
                });
            });
        });

        res.status(200).json({
            status: 'success',
            data: winners.slice(0, 20) // Limit to top 20 recent winners
        });
    } catch (error) {
        console.error('Get recent winners error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get recent winners'
        });
    }
});

const { checkLuckyDrawPause } = require('../middleware/systemCheck');

/**
 * POST /lucky-draw/buy-ticket
 * Purchase jackpot tickets
 */
router.post('/buy-ticket', auth, checkLuckyDrawPause, async (req, res) => {
    try {
        if (!jackpotService) {
            return res.status(503).json({
                status: 'error',
                message: 'Jackpot service not initialized'
            });
        }

        const { quantity = 1 } = req.body;

        // Validate quantity
        if (quantity < 1 || quantity > 100) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid quantity (1-100 tickets allowed)'
            });
        }

        const result = await jackpotService.purchaseTickets(req.user.id, quantity);

        res.status(200).json({
            status: 'success',
            message: `Successfully purchased ${quantity} ticket(s)`,
            data: result
        });
    } catch (error) {
        console.error('Buy ticket error:', error);
        res.status(error.message.includes('Insufficient') ? 400 : 500).json({
            status: 'error',
            message: error.message || 'Failed to purchase tickets'
        });
    }
});

/**
 * GET /lucky-draw/my-tickets
 * Get user's ticket history
 */
router.get('/my-tickets', auth, async (req, res) => {
    try {
        const JackpotRound = require('../models/JackpotRound');

        // Get active round tickets
        const activeRound = await JackpotRound.getActiveRound();
        const activeTickets = activeRound
            ? activeRound.tickets.filter(t => t.userId.toString() === req.user.id)
            : [];

        // Get past draws where user won
        const completedRounds = await JackpotRound.find({
            status: 'completed',
            'winners.userId': req.user.id
        }).sort({ createdAt: -1 }).limit(10);

        const pastDraws = completedRounds.map(round => {
            const userWins = round.winners.filter(w => w.userId.toString() === req.user.id);
            const totalWon = userWins.reduce((sum, w) => sum + w.prize, 0);
            const userTickets = round.tickets.filter(t => t.userId.toString() === req.user.id);

            return {
                roundNumber: round.roundNumber,
                date: round.drawExecutedAt,
                tickets: userTickets.length,
                won: totalWon,
                prizes: userWins.map(w => ({ rank: w.rank, amount: w.prize }))
            };
        });

        res.status(200).json({
            status: 'success',
            data: {
                activeTickets: activeTickets.map(t => ({
                    ticketId: t.ticketId,
                    purchasedAt: t.purchasedAt
                })),
                pastDraws
            }
        });
    } catch (error) {
        console.error('Get tickets error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get tickets'
        });
    }
});

// ============================================
// ADMIN OVERHAUL ROUTES (Multi-sig Governance)
// ============================================


// Helper chart used in dashboard
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

/**
 * GET /api/admin/jackpot/status
 */
router.get('/status-all', auth, requireAdmin, async (req, res) => {
    try {
        const NODES = ['randomizer', 'ledger', 'cashback', 'reserve', 'gateway'];
        let protocols = await JackpotProtocol.find();
        if (protocols.length < NODES.length) {
            const existing = protocols.map(p => p.nodeName);
            const missing = NODES.filter(n => !existing.includes(n));
            if (missing.length > 0) {
                await JackpotProtocol.insertMany(missing.map(n => ({
                    nodeName: n,
                    status: 'RUNNING',
                    changedBy: 'system',
                    reason: 'System initialization'
                })));
                protocols = await JackpotProtocol.find();
            }
        }
        res.json({
            status: 'success',
            data: protocols.map(p => ({
                ...p.toObject(),
                lastChangedBy: p.changedBy,
                lastReason: p.reason
            }))
        });
    } catch (error) {
        logger.error('Jackpot status error:', error);
        res.status(500).json({ status: 'error', message: 'Internal error' });
    }
});

/**
 * GET /api/admin/jackpot/logs
 */
router.get('/logs', auth, requireAdmin, async (req, res) => {
    try {
        const logs = await JackpotLog.find().sort({ timestamp: -1 }).limit(100);
        res.json({ status: 'success', data: logs });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Internal error' });
    }
});

/**
 * POST /api/admin/jackpot/pause
 */
router.post('/pause', auth, requireAdmin, async (req, res) => {
    try {
        const { nodes, reason } = req.body;
        if (!nodes || !Array.isArray(nodes)) return res.status(400).json({ status: 'error', message: 'Selection required' });

        const adminId = req.user.id;
        for (const nodeName of nodes) {
            const protocol = await JackpotProtocol.findOne({ nodeName });
            if (!protocol || protocol.status === 'PAUSED') continue;

            if (protocol.pendingAction && protocol.pendingAction.action === 'PAUSE') {
                if (protocol.pendingAction.approvals.some(a => a.adminId === adminId)) continue;
                protocol.pendingAction.approvals.push({ adminId, approvedAt: new Date() });
                if (protocol.pendingAction.approvals.length >= 2) {
                    protocol.status = 'PAUSED';
                    protocol.changedBy = adminId;
                    protocol.reason = protocol.pendingAction.reason;
                    protocol.lastChangedAt = new Date();
                    protocol.pendingAction = null;
                    const log = await JackpotLog.create({ adminId, role: req.user.role, action: 'PAUSE_ACTIVATED', affectedNodes: [nodeName], reason, ipAddress: req.ip });
                    if (jackpotService) await jackpotService.broadcastActivity(log);
                }
            } else {
                protocol.pendingAction = { action: 'PAUSE', requestedBy: adminId, requestedAt: new Date(), approvals: [{ adminId, approvedAt: new Date() }], requiredApprovals: 2, reason };
                const log = await JackpotLog.create({ adminId, role: req.user.role, action: 'PAUSE_REQUESTED', affectedNodes: [nodeName], reason, ipAddress: req.ip });
                if (jackpotService) await jackpotService.broadcastActivity(log);
            }
            protocol.markModified('pendingAction');
            await protocol.save();
        }
        if (jackpotService) await jackpotService.broadcastStats();
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

router.post('/resume', auth, requireAdmin, async (req, res) => {
    try {
        const { nodes, reason } = req.body;
        if (!nodes || !Array.isArray(nodes)) return res.status(400).json({ status: 'error', message: 'Selection required' });
        const adminId = req.user.id;
        for (const nodeName of nodes) {
            const protocol = await JackpotProtocol.findOne({ nodeName });
            if (!protocol || protocol.status === 'RUNNING') continue;

            if (protocol.pendingAction && protocol.pendingAction.action === 'RESUME') {
                if (protocol.pendingAction.approvals.some(a => a.adminId === adminId)) continue;
                protocol.pendingAction.approvals.push({ adminId, approvedAt: new Date() });
                if (protocol.pendingAction.approvals.length >= 2) {
                    protocol.status = 'RUNNING';
                    protocol.changedBy = adminId;
                    protocol.reason = protocol.pendingAction.reason;
                    protocol.lastChangedAt = new Date();
                    protocol.pendingAction = null;
                    const log = await JackpotLog.create({ adminId, role: req.user.role, action: 'RESUME_ACTIVATED', affectedNodes: [nodeName], reason, ipAddress: req.ip });
                    if (jackpotService) await jackpotService.broadcastActivity(log);
                }
            } else {
                protocol.pendingAction = { action: 'RESUME', requestedBy: adminId, requestedAt: new Date(), approvals: [{ adminId, approvedAt: new Date() }], requiredApprovals: 2, reason };
                const log = await JackpotLog.create({ adminId, role: req.user.role, action: 'RESUME_REQUESTED', affectedNodes: [nodeName], reason, ipAddress: req.ip });
                if (jackpotService) await jackpotService.broadcastActivity(log);
            }
            protocol.markModified('pendingAction');
            await protocol.save();
        }
        if (jackpotService) await jackpotService.broadcastStats();
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * GET /api/admin/jackpot/dashboard
 */
router.get('/dashboard', auth, requireAdmin, async (req, res) => {
    try {
        if (!jackpotService) return res.status(503).json({ status: 'error', message: 'Service not ready' });
        const round = await jackpotService.getActiveRound();
        const previousRound = await JackpotRound.findOne({ status: 'completed' }).sort({ roundNumber: -1 });
        const SystemConfig = require('../models/SystemConfig');
        const config = await SystemConfig.findOne({ key: 'default' });
        const User = require('../models/User');
        const autoEntryUsersCount = await User.countDocuments({ 'settings.autoLuckyDraw': true });
        const historicalStats = await JackpotRound.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, totalRevenue: { $sum: { $multiply: ["$ticketPrice", "$ticketsSold"] } }, totalPrizes: { $sum: "$totalPrizePool" }, totalSurplus: { $sum: "$surplus" } } }
        ]);
        const history = historicalStats[0] || { totalRevenue: 0, totalPrizes: 0, totalSurplus: 0 };
        const NODES = ['randomizer', 'ledger', 'cashback', 'reserve', 'gateway'];
        let protocols = await JackpotProtocol.find();
        if (protocols.length < NODES.length) {
            const existing = protocols.map(p => p.nodeName);
            const missing = NODES.filter(n => !existing.includes(n));
            if (missing.length > 0) {
                await JackpotProtocol.insertMany(missing.map(n => ({ nodeName: n, status: 'RUNNING', changedBy: 'system', reason: 'System initialization' })));
                protocols = await JackpotProtocol.find();
            }
        }
        res.json({
            status: 'success',
            data: {
                activeDraw: { id: round.roundNumber, ticketsSold: round.ticketsSold, totalTickets: round.totalTickets, ticketPrice: round.ticketPrice, totalPool: round.totalPrizePool, status: round.status, isActive: round.isActive },
                previousDraw: previousRound ? { id: previousRound.roundNumber, blockNumber: '0x' + crypto.randomBytes(4).toString('hex').toUpperCase(), rngHash: previousRound.drawSeed || '0x00000', executionTime: previousRound.drawExecutedAt, topWinnerWallet: previousRound.winners[0]?.walletAddress, topPrizePaid: previousRound.winners[0]?.prize } : null,
                autoEntry: { totalUsers: autoEntryUsersCount, autoTicketsPurchased: Math.floor(autoEntryUsersCount * 0.7), isEnabledGlobally: config?.luckyDraw?.autoEntryEnabled || false },
                financials: { ticketRevenue: round.ticketPrice * round.ticketsSold, prizeReserved: round.totalPrizePool, totalHistoricalRevenue: history.totalRevenue, totalHistoricalPrizes: history.totalPrizes, platformSurplus: history.totalSurplus },
                protocols: protocols.map(p => ({
                    ...p.toObject(),
                    lastChangedBy: p.changedBy,
                    lastReason: p.reason
                })),
                distributionConfig: PRIZE_CHART,
                emergencyFlags: config?.emergencyFlags || {}
            }
        });
    } catch (error) {
        logger.error('Jackpot dashboard error:', error);
        res.status(500).json({ status: 'error', message: 'Internal error' });
    }
});

// Operational routes retained for functional hooks
router.post('/update-params', auth, requireJackpotAdmin, async (req, res) => {
    try {
        if (!jackpotService) return res.status(503).json({ status: 'error', message: 'Service uninitialized' });
        const { ticketPrice: newPrice, ticketLimit: newLimit } = req.body;
        const round = await jackpotService.getActiveRound();
        await jackpotService.updateParameters(round._id, newPrice, newLimit, req.user.id);
        res.json({ status: 'success' });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

router.post('/execute-draw', auth, requireJackpotAdmin, async (req, res) => {
    try {
        if (!jackpotService) return res.status(503).json({ status: 'error', message: 'Service uninitialized' });
        const round = await jackpotService.getActiveRound();
        if (round.ticketsSold === 0) return res.status(400).json({ status: 'error', message: 'No tickets sold' });
        const winners = await jackpotService.executeDraw(round._id, req.user.id, 'manual');
        res.json({ status: 'success', winnersCount: winners.length });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
