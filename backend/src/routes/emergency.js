const express = require('express');
const router = express.Router();
const system = require('../config/system');
const auth = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin } = require('../middleware/rbac');
const { logger } = require('../utils/logger');

// Middleware to ensure admin access
// Note: server.js mounts this at /api/admin/emergency, 
// and logic in server.js or admin routes might already check auth. 
// But we should double check. 
// However, looking at server.js: app.use('/api/admin', adminRoutes);
// We will mount this NEW route likely as app.use('/api/admin/emergency', emergencyRoutes);
// So we need to include auth middleware here.

// GET /api/admin/emergency/status
router.get('/status', auth, requireAdmin, async (req, res) => {
    try {
        const config = system.get();
        // Frontend expects: { status: 'success', data: { emergencyFlags, lastUpdated, updatedBy, auditLog, activeSince } }
        // specific auditLog and activeSince might need to be fetched or stored in system.js
        // For now, let's return what system.js has.
        // The frontend code expects detailed audit logs which system.js doesn't seem to store in memory fully?
        // Let's check system.js again... it only has flags, lastUpdated, updatedBy.
        // Using SystemConfig model to fetch audit log if needed, or just return basic info.

        res.json({
            status: 'success',
            data: {
                emergencyFlags: config.emergencyFlags,
                lastUpdated: config.lastUpdated,
                updatedBy: config.updatedBy,
                // Mock or fetch these if strictly required by frontend to avoid crash
                auditLog: [],
                activeSince: {}
            }
        });
    } catch (error) {
        logger.error('Failed to fetch emergency status:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// Helper for toggle routes
const handleToggle = async (req, res, flagKey, actionName) => {
    try {
        const { enabled } = req.body; // true or false
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ status: 'error', message: 'Enabled field must be boolean' });
        }

        const updates = { [flagKey]: enabled };
        const newState = await system.update(updates, req.user);

        res.json({
            status: 'success',
            message: `${actionName} ${enabled ? 'activated' : 'deactivated'}`,
            data: {
                emergencyFlags: newState.emergencyFlags,
                lastUpdated: newState.lastUpdated,
                updatedBy: newState.updatedBy
            }
        });
    } catch (error) {
        logger.error(`Failed to toggle ${actionName}:`, error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

// POST /pause-registrations
router.post('/pause-registrations', auth, requireAdmin, (req, res) => {
    handleToggle(req, res, 'pauseRegistrations', 'Pause Registrations');
});

// POST /pause-deposits
router.post('/pause-deposits', auth, requireAdmin, (req, res) => {
    handleToggle(req, res, 'pauseDeposits', 'Pause Deposits');
});

// POST /pause-withdrawals
router.post('/pause-withdrawals', auth, requireAdmin, (req, res) => {
    handleToggle(req, res, 'pauseWithdrawals', 'Pause Withdrawals');
});

// POST /pause-lucky-draw
router.post('/pause-lucky-draw', auth, requireAdmin, (req, res) => {
    handleToggle(req, res, 'pauseLuckyDraw', 'Pause Lucky Draw');
});

// POST /maintenance-mode
// Usually requires SuperAdmin
router.post('/maintenance-mode', auth, requireSuperAdmin, (req, res) => {
    handleToggle(req, res, 'maintenanceMode', 'Maintenance Mode');
});

module.exports = router;
