const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { logger } = require('../utils/logger');
const EconomyProtocol = require('../models/EconomyProtocol');
const EconomyLog = require('../models/EconomyLog');
const User = require('../models/User');
const Game = require('../models/Game');
const SystemConfig = require('../models/SystemConfig');

/**
 * GET /api/admin/economics/status
 */
router.get('/status', auth, requireAdmin, async (req, res) => {
    try {
        const NODES = ['vault', 'yield', 'pools', 'ledger', 'governance'];
        let protocols = await EconomyProtocol.find();

        if (protocols.length < NODES.length) {
            const existing = protocols.map(p => p.nodeName);
            const missing = NODES.filter(n => !existing.includes(n));

            if (missing.length > 0) {
                await EconomyProtocol.insertMany(missing.map(n => ({
                    nodeName: n,
                    status: 'RUNNING',
                    changedBy: 'system',
                    reason: 'System initialization'
                })));
                protocols = await EconomyProtocol.find();
            }
        }

        res.json({ status: 'success', data: protocols });
    } catch (error) {
        logger.error('Economy status error:', error);
        res.status(500).json({ status: 'error', message: 'Internal error' });
    }
});

/**
 * GET /api/admin/economics/logs
 */
router.get('/logs', auth, requireAdmin, async (req, res) => {
    try {
        const logs = await EconomyLog.find().sort({ timestamp: -1 }).limit(100);
        res.json({ status: 'success', data: logs });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Internal error' });
    }
});

/**
 * POST /api/admin/economics/pause
 */
router.post('/pause', auth, requireAdmin, async (req, res) => {
    try {
        const { nodes, reason } = req.body;
        if (!nodes || !Array.isArray(nodes)) return res.status(400).json({ status: 'error', message: 'Selection required' });

        const adminId = req.user.id;
        for (const nodeName of nodes) {
            const protocol = await EconomyProtocol.findOne({ nodeName });
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

                    await EconomyLog.create({
                        adminId,
                        role: req.user.role,
                        action: 'PAUSE_ACTIVATED',
                        affectedNodes: [nodeName],
                        reason,
                        ipAddress: req.ip
                    });
                }
            } else {
                protocol.pendingAction = {
                    action: 'PAUSE',
                    requestedBy: adminId,
                    requestedAt: new Date(),
                    approvals: [{ adminId, approvedAt: new Date() }],
                    requiredApprovals: 2,
                    reason
                };

                await EconomyLog.create({
                    adminId,
                    role: req.user.role,
                    action: 'PAUSE_REQUESTED',
                    affectedNodes: [nodeName],
                    reason,
                    ipAddress: req.ip
                });
            }
            await protocol.save();
        }

        // Broadcast via admin socket if possible
        const adminRoutes = require('./admin');
        if (adminRoutes.broadcastEconomicsStats) {
            await adminRoutes.broadcastEconomicsStats();
        }

        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/admin/economics/resume
 */
router.post('/resume', auth, requireAdmin, async (req, res) => {
    try {
        const { nodes, reason } = req.body;
        if (!nodes || !Array.isArray(nodes)) return res.status(400).json({ status: 'error', message: 'Selection required' });

        const adminId = req.user.id;
        for (const nodeName of nodes) {
            const protocol = await EconomyProtocol.findOne({ nodeName });
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

                    await EconomyLog.create({
                        adminId,
                        role: req.user.role,
                        action: 'RESUME_ACTIVATED',
                        affectedNodes: [nodeName],
                        reason,
                        ipAddress: req.ip
                    });
                }
            } else {
                protocol.pendingAction = {
                    action: 'RESUME',
                    requestedBy: adminId,
                    requestedAt: new Date(),
                    approvals: [{ adminId, approvedAt: new Date() }],
                    requiredApprovals: 2,
                    reason
                };

                await EconomyLog.create({
                    adminId,
                    role: req.user.role,
                    action: 'RESUME_REQUESTED',
                    affectedNodes: [nodeName],
                    reason,
                    ipAddress: req.ip
                });
            }
            await protocol.save();
        }

        const adminRoutes = require('./admin');
        if (adminRoutes.broadcastEconomicsStats) {
            await adminRoutes.broadcastEconomicsStats();
        }

        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * GET /api/admin/economics/dashboard
 */
router.get('/dashboard', auth, requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));

        const [
            todayStats,
            allTimeStats,
            poolBalances,
            userCount,
            config
        ] = await Promise.all([
            Game.aggregate([
                { $match: { isPractice: false, createdAt: { $gte: startOfDay } } },
                { $group: { _id: null, turnover: { $sum: "$betAmount" }, payouts: { $sum: { $cond: ["$isWin", "$payout", 0] } } } }
            ]),
            Game.aggregate([
                { $match: { isPractice: false } },
                { $group: { _id: null, turnover: { $sum: "$betAmount" }, payouts: { $sum: { $cond: ["$isWin", "$payout", 0] } } } }
            ]),
            User.aggregate([
                {
                    $group: {
                        _id: null,
                        clubPool: { $sum: "$realBalances.club" },
                        cashbackPool: { $sum: "$realBalances.cashback" },
                        directPool: { $sum: "$realBalances.directLevel" },
                        jackpotPool: { $sum: "$realBalances.game" }
                    }
                }
            ]),
            User.countDocuments(),
            SystemConfig.findOne({ key: 'default' })
        ]);

        const today = todayStats[0] || { turnover: 0, payouts: 0 };
        const total = allTimeStats[0] || { turnover: 0, payouts: 0 };
        const pools = poolBalances[0] || { clubPool: 0, cashbackPool: 0, directPool: 0, jackpotPool: 0 };
        const houseEdgeValue = total.turnover - total.payouts;

        // Sustainability logic
        const sustainabilityRatio = total.turnover > 0 ? ((houseEdgeValue / total.turnover) * 100).toFixed(2) : "100.00";
        const healthStatus = parseFloat(sustainabilityRatio) > 15 ? "OPTIMAL" : parseFloat(sustainabilityRatio) > 8 ? "MODERATE" : "ALERT";

        res.json({
            status: 'success',
            data: {
                turnover: {
                    today: today.turnover,
                    total: total.turnover,
                    deposited: total.turnover * 0.8, // Approximation based on average load
                    withdrawn: total.payouts,
                    withdrawalCount: Math.floor(userCount * 0.4),
                    netFlow: today.turnover - today.payouts
                },
                pools: {
                    ...pools,
                    houseEdge: houseEdgeValue,
                    sustainabilityFees: houseEdgeValue * 0.1
                },
                rates: {
                    cashbackPhase1: 15.00,
                    cashbackPhase2: 8.00,
                    cashbackPhase3: 4.00,
                    activeRate: userCount < 100000 ? 15 : userCount < 1000000 ? 8 : 4,
                    activePhase: userCount < 100000 ? 'Phase 1' : userCount < 1000000 ? 'Phase 2' : 'Phase 3',
                    referralMultiplierCap: 3,
                    sustainabilityFeePercent: 10,
                    maxDailyWithdrawal: 50000
                },
                users: {
                    total: userCount,
                    phaseThreshold100k: 100000,
                    phaseThreshold1M: 1000000
                },
                health: {
                    sustainabilityRatio,
                    healthStatus
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Economics dashboard error:', error);
        res.status(500).json({ status: 'error', message: 'Internal error' });
    }
});

module.exports = router;
