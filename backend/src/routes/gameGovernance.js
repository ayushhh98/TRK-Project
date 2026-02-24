const express = require('express');
const router = express.Router();
const GameProtocol = require('../models/GameProtocol');
const GameLog = require('../models/GameLog');
const Game = require('../models/Game');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const { logger } = require('../utils/logger');

// GET /api/admin/games/protocol/dashboard
// Aggregates real-time engine status and recent logs
router.get('/dashboard', auth, requireAdmin, async (req, res) => {
    try {
        const protocols = await GameProtocol.find();
        const logs = await GameLog.find().sort({ timestamp: -1 }).limit(20);

        // Ensure all 5 nodes exist
        const nodeNames = ['rng', 'logic', 'liquidity', 'settlement', 'gateway'];
        const existingNodes = protocols.map(p => p.nodeName);

        for (const name of nodeNames) {
            if (!existingNodes.includes(name)) {
                await GameProtocol.create({ nodeName: name, status: 'RUNNING' });
            }
        }

        const finalProtocols = await GameProtocol.find();

        // Basic engine stats
        const stats = {
            totalRounds: await Game.countDocuments({ status: 'resolved' }),
            totalVolume: await Game.aggregate([{ $match: { status: 'resolved' } }, { $group: { _id: null, total: { $sum: '$betAmount' } } }]).then(res => res[0]?.total || 0),
            houseEdge: 2.5, // Standard protocol margin
            activeNodes: finalProtocols.filter(p => p.status === 'RUNNING').length
        };

        res.json({
            status: 'success',
            data: {
                protocols: finalProtocols,
                logs,
                stats
            }
        });
    } catch (error) {
        logger.error('Game dashboard error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch protocol status' });
    }
});

// POST /api/admin/games/protocol/pause
router.post('/pause', auth, requireAdmin, async (req, res) => {
    try {
        const { nodes, reason } = req.body;
        const adminId = req.user.id;

        for (const nodeName of nodes) {
            let protocol = await GameProtocol.findOne({ nodeName });
            if (!protocol) continue;

            if (protocol.status === 'PAUSED') continue;

            // Multi-sig logic
            if (protocol.pendingAction && protocol.pendingAction.action === 'PAUSE') {
                // Check if already approved by this admin
                const alreadyApproved = protocol.pendingAction.approvals.some(a => a.adminId === adminId);
                if (!alreadyApproved) {
                    protocol.pendingAction.approvals.push({ adminId, approvedAt: new Date() });
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
            }

            // Activate if threshold met
            if (protocol.pendingAction.approvals.length >= protocol.pendingAction.requiredApprovals) {
                protocol.status = 'PAUSED';
                protocol.lastChangedBy = adminId;
                protocol.lastReason = reason;
                protocol.lastChangedAt = new Date();
                protocol.pendingAction = null;

                await GameLog.create({
                    adminId,
                    role: req.user.role,
                    action: `PROTOCOL_PAUSE_ACTIVATED:${nodeName.toUpperCase()}`,
                    affectedNodes: [nodeName],
                    reason,
                    ipAddress: req.ip
                });
            } else {
                await GameLog.create({
                    adminId,
                    role: req.user.role,
                    action: `PAUSE_REQUEST:${nodeName.toUpperCase()}`,
                    affectedNodes: [nodeName],
                    reason: `Multi-sig required (${protocol.pendingAction.approvals.length}/2)`,
                    ipAddress: req.ip
                });
            }

            await protocol.save();
        }

        // Broadcast stats
        if (router.broadcastGameProtocolStats) router.broadcastGameProtocolStats();

        res.json({ status: 'success', message: 'Pause intervention recorded/activated' });
    } catch (error) {
        logger.error('Game pause error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to request pause' });
    }
});

// POST /api/admin/games/protocol/resume
router.post('/resume', auth, requireAdmin, async (req, res) => {
    try {
        const { nodes, reason } = req.body;
        const adminId = req.user.id;

        for (const nodeName of nodes) {
            let protocol = await GameProtocol.findOne({ nodeName });
            if (!protocol) continue;

            if (protocol.status === 'RUNNING') continue;

            if (protocol.pendingAction && protocol.pendingAction.action === 'RESUME') {
                const alreadyApproved = protocol.pendingAction.approvals.some(a => a.adminId === adminId);
                if (!alreadyApproved) {
                    protocol.pendingAction.approvals.push({ adminId, approvedAt: new Date() });
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
            }

            if (protocol.pendingAction.approvals.length >= protocol.pendingAction.requiredApprovals) {
                protocol.status = 'RUNNING';
                protocol.lastChangedBy = adminId;
                protocol.lastReason = reason;
                protocol.lastChangedAt = new Date();
                protocol.pendingAction = null;

                await GameLog.create({
                    adminId,
                    role: req.user.role,
                    action: `PROTOCOL_RESUME_ACTIVATED:${nodeName.toUpperCase()}`,
                    affectedNodes: [nodeName],
                    reason,
                    ipAddress: req.ip
                });
            } else {
                await GameLog.create({
                    adminId,
                    role: req.user.role,
                    action: `RESUME_REQUEST:${nodeName.toUpperCase()}`,
                    affectedNodes: [nodeName],
                    reason: `Multi-sig required (${protocol.pendingAction.approvals.length}/2)`,
                    ipAddress: req.ip
                });
            }

            await protocol.save();
        }

        if (router.broadcastGameProtocolStats) router.broadcastGameProtocolStats();

        res.json({ status: 'success', message: 'Resume intervention recorded/activated' });
    } catch (error) {
        logger.error('Game resume error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to request resume' });
    }
});

// GET /api/admin/games/protocol/logs
router.get('/logs', auth, requireAdmin, async (req, res) => {
    try {
        const logs = await GameLog.find().sort({ timestamp: -1 }).limit(50);
        res.json({ status: 'success', data: logs });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch logs' });
    }
});

router.initializeService = (socketIo) => {
    const adminRoutes = require('./admin');
    router.broadcastGameProtocolStats = adminRoutes.broadcastGameProtocolStats;
};

module.exports = router;
