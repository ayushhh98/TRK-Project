const AuditLog = require('../models/AuditLog');
const { logger } = require('./logger');
const { normalizeIp, getClientIp } = require('./ipUtils');

/**
 * Centralized Audit Logging Service
 * All security-critical events are logged here
 */

class AuditLogger {
    /**
     * Log a security event
     */
    static async log(eventData) {
        try {
            const auditLog = new AuditLog({
                eventType: eventData.eventType,
                severity: eventData.severity || 'info',
                userId: eventData.userId,
                walletAddress: eventData.walletAddress,
                userRole: eventData.userRole,
                ipAddress: eventData.ipAddress,
                userAgent: eventData.userAgent,
                targetUserId: eventData.targetUserId,
                targetResource: eventData.targetResource,
                action: eventData.action,
                details: eventData.details || {},
                metadata: eventData.metadata || {},
                gameId: eventData.gameId,
                commitmentId: eventData.commitmentId,
                betAmount: eventData.betAmount,
                gameType: eventData.gameType,
                gameVariant: eventData.gameVariant,
                requestId: eventData.requestId,
                sessionId: eventData.sessionId
            });

            await auditLog.save();

            // Also log to console in development
            if (process.env.NODE_ENV === 'development') {
                logger.info(`AUDIT: ${eventData.eventType} - ${eventData.action}`);
            }

            return auditLog;
        } catch (error) {
            // Critical: audit logging failed
            logger.error('CRITICAL: Audit logging failed:', error);
            console.error('AUDIT LOG FAILURE:', eventData, error);
            throw error;
        }
    }

    /**
     * Log failed bet
     */
    static async logFailedBet(req, betData, error) {
        return this.log({
            eventType: 'bet_failed',
            severity: 'warning',
            userId: req.user?._id,
            walletAddress: req.user?.walletAddress,
            userRole: req.user?.role,
            ipAddress: normalizeIp(getClientIp(req)),
            userAgent: req.headers['user-agent'],
            action: 'bet_commit_failed',
            details: {
                betAmount: betData?.betAmount,
                gameType: betData?.gameType,
                gameVariant: betData?.gameVariant,
                error: error.message,
                errorCode: error.code
            },
            betAmount: betData?.betAmount,
            gameType: betData?.gameType,
            gameVariant: betData?.gameVariant,
            requestId: req.headers['x-request-id']
        });
    }

    /**
     * Log successful bet
     */
    static async logSuccessfulBet(req, game, commitment) {
        return this.log({
            eventType: 'bet_success',
            severity: 'info',
            userId: req.user?._id,
            walletAddress: req.user?.walletAddress,
            ipAddress: normalizeIp(getClientIp(req)),
            action: 'bet_completed',
            details: {
                betAmount: game.betAmount,
                isWin: game.isWin,
                payout: game.payout,
                result: game.result
            },
            gameId: game._id,
            commitmentId: commitment._id,
            betAmount: game.betAmount,
            gameType: game.gameType,
            gameVariant: game.gameVariant,
            requestId: req.headers['x-request-id']
        });
    }

    /**
     * Log rate limit violation
     */
    static async logRateLimitViolation(req, limitType, retryAfter) {
        return this.log({
            eventType: 'rate_limit_violation',
            severity: 'warning',
            userId: req.user?._id,
            walletAddress: req.user?.walletAddress,
            ipAddress: normalizeIp(getClientIp(req)),
            userAgent: req.headers['user-agent'],
            action: 'rate_limit_exceeded',
            details: {
                limitType,
                retryAfterSeconds: retryAfter,
                endpoint: req.path,
                method: req.method
            },
            requestId: req.headers['x-request-id']
        });
    }

    /**
     * Log server seed exposure (reveal)
     */
    static async logSeedExposure(req, commitment, game) {
        return this.log({
            eventType: 'seed_exposure',
            severity: 'info',
            userId: req.user?._id,
            walletAddress: req.user?.walletAddress,
            ipAddress: normalizeIp(getClientIp(req)),
            action: 'server_seed_revealed',
            details: {
                commitmentId: commitment._id,
                serverSeedHash: commitment.serverSeedHash,
                clientSeed: commitment.clientSeed,
                nonce: commitment.nonce,
                gameResult: game.result,
                provablyFairVerified: true
            },
            gameId: game._id,
            commitmentId: commitment._id,
            requestId: req.headers['x-request-id']
        });
    }

    /**
     * Log admin action
     */
    static async logAdminAction(req, action, targetUser, details = {}) {
        return this.log({
            eventType: 'admin_action',
            severity: 'warning',
            userId: req.user?._id,
            walletAddress: req.user?.walletAddress,
            userRole: req.user?.role,
            ipAddress: normalizeIp(getClientIp(req)),
            targetUserId: targetUser?._id,
            action,
            details
        });
    }

    /**
     * Log user ban
     */
    static async logUserBan(req, targetUser, reason) {
        return this.log({
            eventType: 'user_banned',
            severity: 'critical',
            userId: req.user?._id,
            walletAddress: req.user?.walletAddress,
            userRole: req.user?.role,
            ipAddress: normalizeIp(getClientIp(req)),
            targetUserId: targetUser._id,
            action: 'user_banned',
            details: {
                targetWallet: targetUser.walletAddress,
                reason,
                bannedBy: req.user?.walletAddress
            }
        });
    }

    /**
     * Log CAPTCHA requirement
     */
    static async logCaptchaRequired(req, riskScore, reasons) {
        return this.log({
            eventType: 'captcha_required',
            severity: 'warning',
            userId: req.user?._id,
            walletAddress: req.user?.walletAddress,
            ipAddress: normalizeIp(getClientIp(req)),
            action: 'captcha_challenge_issued',
            details: {
                riskScore,
                reasons
            }
        });
    }

    /**
     * Log suspicious activity
     */
    static async logSuspiciousActivity(req, activityType, details) {
        return this.log({
            eventType: 'suspicious_activity',
            severity: 'critical',
            userId: req.user?._id,
            walletAddress: req.user?.walletAddress,
            ipAddress: normalizeIp(getClientIp(req)),
            userAgent: req.headers['user-agent'],
            action: activityType,
            details
        });
    }

    /**
     * Query audit logs
     */
    static async query(filters = {}, options = {}) {
        const { page = 1, limit = 100, sort = { createdAt: -1 } } = options;

        const logs = await AuditLog.find(filters)
            .populate('userId', 'walletAddress role')
            .populate('targetUserId', 'walletAddress role')
            .limit(limit)
            .skip((page - 1) * limit)
            .sort(sort);

        const total = await AuditLog.countDocuments(filters);

        return {
            logs,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }

    /**
     * Verify log integrity
     */
    static async verifyIntegrity(startSequence, endSequence) {
        return AuditLog.verifyIntegrity(startSequence, endSequence);
    }
}

module.exports = AuditLogger;
