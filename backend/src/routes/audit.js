const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const AuditLogger = require('../utils/auditLogger');
const AuditLog = require('../models/AuditLog');

/**
 * Audit Log Routes
 * Admin access to tamper-resistant audit logs
 */

/**
 * GET /audit/logs
 * Query audit logs with filters
 */
router.get('/logs', auth, requireAdmin, async (req, res) => {
    try {
        const {
            eventType,
            severity,
            userId,
            startDate,
            endDate,
            page = 1,
            limit = 100
        } = req.query;

        const filters = {};
        if (eventType) filters.eventType = eventType;
        if (severity) filters.severity = severity;
        if (userId) filters.userId = userId;
        if (startDate || endDate) {
            filters.createdAt = {};
            if (startDate) filters.createdAt.$gte = new Date(startDate);
            if (endDate) filters.createdAt.$lte = new Date(endDate);
        }

        const result = await AuditLogger.query(filters, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Audit log query error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to query audit logs'
        });
    }
});

/**
 * GET /audit/logs/:id
 * Get specific audit log
 */
router.get('/logs/:id', auth, requireAdmin, async (req, res) => {
    try {
        const log = await AuditLog.findById(req.params.id)
            .populate('userId', 'walletAddress role')
            .populate('targetUserId', 'walletAddress role');

        if (!log) {
            return res.status(404).json({
                status: 'error',
                message: 'Audit log not found'
            });
        }

        res.json({
            status: 'success',
            data: { log }
        });
    } catch (error) {
        console.error('Audit log fetch error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch audit log'
        });
    }
});

/**
 * GET /audit/verify
 * Verify hash chain integrity
 */
router.get('/verify', auth, requireAdmin, async (req, res) => {
    try {
        const { startSequence, endSequence } = req.query;

        if (!startSequence || !endSequence) {
            return res.status(400).json({
                status: 'error',
                message: 'startSequence and endSequence required'
            });
        }

        const result = await AuditLogger.verifyIntegrity(
            parseInt(startSequence),
            parseInt(endSequence)
        );

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Integrity verification error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to verify integrity'
        });
    }
});

/**
 * GET /audit/stats
 * Get audit log statistics
 */
router.get('/stats', auth, requireAdmin, async (req, res) => {
    try {
        const totalLogs = await AuditLog.countDocuments();

        const byEventType = await AuditLog.aggregate([
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const bySeverity = await AuditLog.aggregate([
            { $group: { _id: '$severity', count: { $sum: 1 } } }
        ]);

        const recentCritical = await AuditLog.find({ severity: 'critical' })
            .populate('userId', 'walletAddress')
            .limit(10)
            .sort({ createdAt: -1 });

        res.json({
            status: 'success',
            data: {
                totalLogs,
                byEventType,
                bySeverity,
                recentCritical
            }
        });
    } catch (error) {
        console.error('Audit stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch audit stats'
        });
    }
});

/**
 * GET /audit/user/:userId
 * Get audit logs for specific user
 */
router.get('/user/:userId', auth, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query;

        const result = await AuditLogger.query(
            { userId: req.params.userId },
            { page: parseInt(page), limit: parseInt(limit) }
        );

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('User audit logs error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user audit logs'
        });
    }
});

module.exports = router;
