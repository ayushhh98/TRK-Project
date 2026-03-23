const mongoose = require('mongoose');
const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const { logger } = require('./logger');

/**
 * Standardized Admin Action Logging
 * Ensures mandatory hash chaining for investor-grade auditability
 */
const logAdminAction = async (actorId, eventType, action, targetId = null, details = {}) => {
    try {
        // Get last log for hash chaining
        const lastLog = await AuditLog.findOne().sort({ sequenceNumber: -1 });
        const sequenceNumber = (lastLog?.sequenceNumber || 0) + 1;
        const prevHash = lastLog?.hash || '0'.repeat(64);

        // Generate data for hashing
        const logDataString = JSON.stringify({
            actorId: String(actorId),
            targetId: String(targetId),
            eventType,
            action,
            details,
            sequenceNumber,
            prevHash,
            timestamp: new Date().toISOString()
        });

        const hash = crypto.createHash('sha256').update(logDataString).digest('hex');

        // Auto-extract request context if req is provided
        let ip = details.ip || '0.0.0.0';
        let ua = details.ua || 'unknown';
        
        if (details.req) {
            ip = details.req.ip || details.req.connection?.remoteAddress || ip;
            ua = details.req.headers?.['user-agent'] || ua;
            delete details.req; // Prevent circular JSON issues in DB
        }

        const log = await AuditLog.create({
            userId: actorId,
            eventType,
            action,
            targetId,
            details,
            severity: details.severity || 'info',
            walletAddress: details.walletAddress || '',
            ipAddress: ip,
            userAgent: ua
        });

        // Broadcast to admin dashboard if routes are initialized
        try {
            const adminRoutes = require('../routes/admin');
            if (adminRoutes.broadcastLiveAudit) {
                adminRoutes.broadcastLiveAudit(log);
            }
            // Stream admin actions to Team live feed
            if (adminRoutes.broadcastTeamLiveActivity) {
                const User = require('../models/User');
                const actor = await User.findById(actorId).select('walletAddress email role').lean();
                if (actor && ['admin', 'superadmin', 'subadmin'].includes(actor.role)) {
                    adminRoutes.broadcastTeamLiveActivity(actor, 'ACTION', {
                        action,
                        severity: details.severity || 'info'
                    });
                }
            }
        } catch (e) {
            // Silently skip if admin routes are not fully loaded
        }

        logger.info(`AuditLog: ${action} by ${actorId} on ${targetId}`);
    } catch (error) {
        logger.error('Failed to create AuditLog:', error);
    }
};

module.exports = { logAdminAction };
