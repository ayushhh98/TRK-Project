const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireSuperAdmin, requireIpWhitelist } = require('../middleware/rbac');
const SystemConfig = require('../models/SystemConfig');
const RoiConfig = require('../models/RoiConfig');
const { logAdminAction } = require('../utils/audit');
const { logger } = require('../utils/logger');

// Protocol Governance Controls - Strict Super Admin Only
router.use(requireIpWhitelist);
router.use(auth);
router.use(requireSuperAdmin);

/**
 * GET /api/admin/system/config
 * Master Key Dashboard data for Super Admins
 */
router.get('/config', async (req, res) => {
    try {
        const [sysConfig, roiConfig] = await Promise.all([
            SystemConfig.getConfig(),
            RoiConfig.findOne() || RoiConfig.create({})
        ]);
        
        res.json({
            status: 'success',
            data: {
                system: sysConfig,
                roi: roiConfig
            }
        });
    } catch (error) {
        logger.error('Failed to get master config:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch protocol configuration' });
    }
});

/**
 * PUT /api/admin/system/config/economics
 * Update macro-economics (referral, limits)
 */
router.put('/config/economics', async (req, res) => {
    try {
        const updates = req.body;
        const config = await SystemConfig.findOneAndUpdate(
            {}, 
            { $set: updates }, 
            { new: true, upsert: true }
        );

        await logAdminAction(req.user._id, 'admin_action', 'Update Macro-Economics Configuration', null, { 
            updates, severity: 'critical', req
        });

        res.json({ status: 'success', data: config });
    } catch (error) {
        logger.error('Error updating macro-economics config:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update economics configuration' });
    }
});

/**
 * PUT /api/admin/system/config/roi
 * Update ROI Engine
 */
router.put('/config/roi', async (req, res) => {
    try {
        const updates = req.body;
        const roiConfig = await RoiConfig.findOneAndUpdate(
            {}, 
            { $set: updates }, 
            { new: true, upsert: true }
        );

        await logAdminAction(req.user._id, 'admin_action', 'Update ROI Configuration', null, { 
            updates, severity: 'critical', req
        });

        res.json({ status: 'success', data: roiConfig });
    } catch (error) {
        logger.error('Error updating ROI config:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update ROI configuration' });
    }
});

module.exports = router;
