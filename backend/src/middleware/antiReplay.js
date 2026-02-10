const GameCommitment = require('../models/GameCommitment');
const { logger } = require('../utils/logger');
const { getClientIp, normalizeIp } = require('../utils/ipUtils');

/**
 * Anti-Replay Middleware
 * Prevents duplicate bet submissions and replay attacks
 */

// In-memory cache for processed requests (use Redis in production)
const processedRequests = new Map();
const userBetTimestamps = new Map(); // Track by userId
const ipBetTimestamps = new Map();   // Track by IP
const compositeBetTimestamps = new Map(); // Track by userId+IP composite

// Environment-based rate limiting
const RATE_LIMIT_CONFIG = {
    development: 0,      // No rate limit for testing
    test: 0,            // No rate limit for automated tests
    staging: 2,         // 2 seconds for staging
    production: 5       // 5 seconds for production
};

const RATE_LIMIT_SECONDS = process.env.REAL_MONEY_BET_RATE_LIMIT_SECONDS
    ? parseInt(process.env.REAL_MONEY_BET_RATE_LIMIT_SECONDS)
    : (RATE_LIMIT_CONFIG[process.env.NODE_ENV] || RATE_LIMIT_CONFIG.production);

// Log rate limit configuration on startup
logger.info(`🎮 Real Money Bet Rate Limiting: ${RATE_LIMIT_SECONDS === 0 ? 'DISABLED (Testing Mode)' : `${RATE_LIMIT_SECONDS}s delay (User + IP)`}`);

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    const ttl = 300000; // 5 minutes

    // Clean processed requests
    for (const [requestId, timestamp] of processedRequests.entries()) {
        if (now - timestamp > 120000) { // 2 minutes
            processedRequests.delete(requestId);
        }
    }

    // Clean rate limit timestamps (5 minute TTL)
    for (const [userId, timestamp] of userBetTimestamps.entries()) {
        if (now - timestamp > ttl) {
            userBetTimestamps.delete(userId);
        }
    }

    for (const [ip, timestamp] of ipBetTimestamps.entries()) {
        if (now - timestamp > ttl) {
            ipBetTimestamps.delete(ip);
        }
    }

    for (const [composite, timestamp] of compositeBetTimestamps.entries()) {
        if (now - timestamp > ttl) {
            compositeBetTimestamps.delete(composite);
        }
    }

    logger.debug(`Cleanup: ${processedRequests.size} requests, ${userBetTimestamps.size} users, ${ipBetTimestamps.size} IPs in cache`);
}, 300000);

// Validate request ID format
function validateRequestId(requestId) {
    if (!requestId || typeof requestId !== 'string') {
        return false;
    }

    // Check format (should be UUID or similar)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const timestampedRegex = /^[0-9a-f]{32,64}$/i;

    return uuidRegex.test(requestId) || timestampedRegex.test(requestId);
}

// AntiReplay middleware for commit endpoint
const antiReplayCommit = async (req, res, next) => {
    try {
        const requestId = req.headers['x-request-id'] || req.body.requestId;
        const userId = req.user._id.toString();
        const { betData, timestamp, nonce } = req.body;

        // 1. Validate request ID
        if (!requestId) {
            return res.status(400).json({
                status: 'error',
                message: 'Request ID required',
                code: 'MISSING_REQUEST_ID'
            });
        }

        if (!validateRequestId(requestId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request ID format',
                code: 'INVALID_REQUEST_ID'
            });
        }

        // 2. Check for duplicate request ID (in-memory)
        const requestKey = `${userId}:${requestId}`;
        if (processedRequests.has(requestKey)) {
            return res.status(409).json({
                status: 'error',
                message: 'Duplicate request detected',
                code: 'DUPLICATE_REQUEST'
            });
        }

        // 3. Check if request exists in database
        const existingCommitment = await GameCommitment.findOne({ requestId, userId });
        if (existingCommitment) {
            return res.status(409).json({
                status: 'error',
                message: 'Request already processed',
                code: 'REQUEST_ALREADY_PROCESSED',
                data: {
                    commitmentId: existingCommitment._id,
                    status: existingCommitment.status
                }
            });
        }

        // 4. Validate timestamp
        if (timestamp) {
            const now = Date.now();
            const diff = Math.abs(now - timestamp);

            if (diff > 30000) { // 30 seconds
                return res.status(400).json({
                    status: 'error',
                    message: 'Request timestamp too old or in future',
                    code: 'INVALID_TIMESTAMP',
                    data: {
                        serverTime: now,
                        requestTime: timestamp,
                        difference: diff
                    }
                });
            }
        }

        // 5. Validate nonce format
        if (nonce !== undefined && (!Number.isInteger(nonce) || nonce < 0)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid nonce format',
                code: 'INVALID_NONCE'
            });
        }

        // 6. Rate limiting (only for real money games, environment-aware)
        // Check both user-based AND IP-based rate limits to prevent:
        // - Single user making rapid bets
        // - Multiple accounts from same IP making rapid bets
        // - Coordinated bot attacks
        if (RATE_LIMIT_SECONDS > 0 && betData?.gameType === 'real') {
            const now = Date.now();
            const clientIp = normalizeIp(getClientIp(req));
            const compositeKey = `${userId}:${clientIp}`;

            // Check 1: Per-user rate limit
            const lastUserBet = userBetTimestamps.get(userId);
            if (lastUserBet) {
                const timeSinceLastBet = now - lastUserBet;
                const requiredWaitMs = RATE_LIMIT_SECONDS * 1000;

                if (timeSinceLastBet < requiredWaitMs) {
                    const remainingMs = requiredWaitMs - timeSinceLastBet;
                    const remainingSeconds = Math.ceil(remainingMs / 1000);

                    return res.status(429).json({
                        status: 'error',
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: `Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} before placing another bet`,
                        retryAfterMs: remainingMs,
                        retryAfterSeconds: remainingSeconds,
                        rateLimitConfig: {
                            environment: process.env.NODE_ENV || 'production',
                            delaySeconds: RATE_LIMIT_SECONDS,
                            limitType: 'per-user'
                        }
                    });
                }
            }

            // Check 2: Per-IP rate limit (prevents multi-account abuse)
            const lastIpBet = ipBetTimestamps.get(clientIp);
            if (lastIpBet && clientIp !== 'localhost') { // Skip IP check for localhost
                const timeSinceLastBet = now - lastIpBet;
                const requiredWaitMs = RATE_LIMIT_SECONDS * 1000;

                if (timeSinceLastBet < requiredWaitMs) {
                    const remainingMs = requiredWaitMs - timeSinceLastBet;
                    const remainingSeconds = Math.ceil(remainingMs / 1000);

                    logger.warn(`IP rate limit triggered for ${clientIp} (user: ${userId})`);

                    return res.status(429).json({
                        status: 'error',
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: `Multiple bets detected from your network. Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`,
                        retryAfterMs: remainingMs,
                        retryAfterSeconds: remainingSeconds,
                        rateLimitConfig: {
                            environment: process.env.NODE_ENV || 'production',
                            delaySeconds: RATE_LIMIT_SECONDS,
                            limitType: 'per-ip'
                        }
                    });
                }
            }

            // Check 3: Composite rate limit (user+IP combination)
            const lastCompositeBet = compositeBetTimestamps.get(compositeKey);
            if (lastCompositeBet) {
                const timeSinceLastBet = now - lastCompositeBet;
                const requiredWaitMs = RATE_LIMIT_SECONDS * 1000;

                if (timeSinceLastBet < requiredWaitMs) {
                    const remainingMs = requiredWaitMs - timeSinceLastBet;
                    const remainingSeconds = Math.ceil(remainingMs / 1000);

                    return res.status(429).json({
                        status: 'error',
                        code: 'RATE_LIMIT_EXCEEDED',
                        message: `Please wait ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} before placing another bet`,
                        retryAfterMs: remainingMs,
                        retryAfterSeconds: remainingSeconds,
                        rateLimitConfig: {
                            environment: process.env.NODE_ENV || 'production',
                            delaySeconds: RATE_LIMIT_SECONDS,
                            limitType: 'composite'
                        }
                    });
                }
            }

            // Update all rate limit timestamps
            userBetTimestamps.set(userId, now);
            ipBetTimestamps.set(clientIp, now);
            compositeBetTimestamps.set(compositeKey, now);

            // Log for monitoring (debug level)
            logger.debug(`Rate limit updated: user=${userId}, ip=${clientIp}`);
        }

        // Mark request as processed
        processedRequests.set(requestKey, Date.now());

        // Attach to request for later use
        req.requestId = requestId;

        next();

    } catch (error) {
        logger.error('Anti-replay middleware error:', error);
        return res.status(500).json({
            status: 'error',
            message: `Failed to validate request: ${error.message}`
        });
    }
};

module.exports = { antiReplayCommit };
