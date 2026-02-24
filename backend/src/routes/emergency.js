const express = require('express');
const router = express.Router();
const system = require('../config/system');
const auth = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/rbac');
const { logger } = require('../utils/logger');
const EmergencyProtocol = require('../models/EmergencyProtocol');
const EmergencyLog = require('../models/EmergencyLog');

// Helper to map protocol fields for frontend
const mapProtocol = (p) => ({
    ...p,
    lastChangedBy: p.changedBy,
    lastReason: p.reason
});

// GET /api/admin/emergency/status
router.get('/status', auth, requireAdmin, async (req, res) => {
    try {
        const MODULES = ['gameEngine', 'roi', 'jackpot', 'clubIncome', 'withdrawal'];

        // Ensure all modules exist
        let protocols = await EmergencyProtocol.find();
        if (protocols.length < MODULES.length) {
            const existing = protocols.map(p => p.moduleName);
            const missing = MODULES.filter(m => !existing.includes(m));

            if (missing.length > 0) {
                await EmergencyProtocol.insertMany(missing.map(m => ({
                    moduleName: m,
                    status: 'RUNNING',
                    changedBy: 'system',
                    reason: 'System initialization'
                })));
                protocols = await EmergencyProtocol.find();
            }
        }

        res.json({
            status: 'success',
            data: protocols.map(p => mapProtocol(p.toObject ? p.toObject() : p))
        });
    } catch (error) {
        logger.error('Failed to fetch emergency status:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// GET /api/admin/emergency/logs
router.get('/logs', auth, requireAdmin, async (req, res) => {
    try {
        const logs = await EmergencyLog.find().sort({ timestamp: -1 }).limit(100);
        res.json({
            status: 'success',
            data: logs
        });
    } catch (error) {
        logger.error('Failed to fetch emergency logs:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// POST /api/admin/emergency/pause
router.post('/pause', auth, requireAdmin, async (req, res) => {
    try {
        const { modules, reason } = req.body;
        if (!modules || !Array.isArray(modules) || modules.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Module selection required' });
        }

        const adminId = req.user.id || req.user.walletAddress;
        const results = [];

        for (const moduleName of modules) {
            const protocol = await EmergencyProtocol.findOne({ moduleName });
            if (!protocol) continue;

            if (protocol.status === 'PAUSED') {
                results.push({ moduleName, status: 'already_paused' });
                continue;
            }

            // High-fidelity Multi-sig logic
            if (protocol.pendingAction && protocol.pendingAction.action === 'PAUSE') {
                const alreadyApproved = protocol.pendingAction.approvals.some(a => a.adminId === adminId);
                if (alreadyApproved) {
                    results.push({ moduleName, status: 'pending_approval' });
                    continue;
                }

                protocol.pendingAction.approvals.push({ adminId, approvedAt: new Date() });

                if (protocol.pendingAction.approvals.length >= 2) {
                    protocol.status = 'PAUSED';
                    protocol.changedBy = adminId;
                    protocol.reason = protocol.pendingAction.reason;
                    protocol.lastChangedAt = new Date();
                    protocol.pendingAction = null;

                    await EmergencyLog.create({
                        adminId,
                        role: req.user.role,
                        action: 'PAUSE_ACTIVATED',
                        affectedModules: [moduleName],
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

                await EmergencyLog.create({
                    adminId,
                    role: req.user.role,
                    action: 'PAUSE_REQUESTED',
                    affectedModules: [moduleName],
                    reason,
                    ipAddress: req.ip
                });
            }

            protocol.markModified('pendingAction');
            await protocol.save();
            results.push({ moduleName, status: protocol.status, pending: !!protocol.pendingAction });
        }

        const adminRoutes = require('./admin');
        const io = req.app.get('io');
        if (adminRoutes.broadcastEmergencyStats) {
            await adminRoutes.broadcastEmergencyStats(io);
        }

        res.json({ status: 'success', data: results });
    } catch (error) {
        logger.error('Pause request failed:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// POST /api/admin/emergency/resume
router.post('/resume', auth, requireAdmin, async (req, res) => {
    try {
        const { modules, reason } = req.body;
        if (!modules || !Array.isArray(modules) || modules.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Module selection required' });
        }

        const adminId = req.user.id || req.user.walletAddress;
        const results = [];

        for (const moduleName of modules) {
            const protocol = await EmergencyProtocol.findOne({ moduleName });
            if (!protocol) continue;

            if (protocol.status === 'RUNNING') {
                results.push({ moduleName, status: 'already_running' });
                continue;
            }

            if (protocol.pendingAction && protocol.pendingAction.action === 'RESUME') {
                const alreadyApproved = protocol.pendingAction.approvals.some(a => a.adminId === adminId);
                if (alreadyApproved) {
                    results.push({ moduleName, status: 'pending_approval' });
                    continue;
                }

                protocol.pendingAction.approvals.push({ adminId, approvedAt: new Date() });

                if (protocol.pendingAction.approvals.length >= 2) {
                    protocol.status = 'RUNNING';
                    protocol.changedBy = adminId;
                    protocol.reason = protocol.pendingAction.reason;
                    protocol.lastChangedAt = new Date();
                    protocol.pendingAction = null;

                    await EmergencyLog.create({
                        adminId,
                        role: req.user.role,
                        action: 'RESUME_ACTIVATED',
                        affectedModules: [moduleName],
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

                await EmergencyLog.create({
                    adminId,
                    role: req.user.role,
                    action: 'RESUME_REQUESTED',
                    affectedModules: [moduleName],
                    reason,
                    ipAddress: req.ip
                });
            }

            protocol.markModified('pendingAction');
            await protocol.save();
            results.push({ moduleName, status: protocol.status, pending: !!protocol.pendingAction });
        }

        const adminRoutes = require('./admin');
        const io = req.app.get('io');
        if (adminRoutes.broadcastEmergencyStats) {
            await adminRoutes.broadcastEmergencyStats(io);
        }

        res.json({ status: 'success', data: results });
    } catch (error) {
        logger.error('Resume request failed:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
