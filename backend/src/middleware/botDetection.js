const { logger } = require('../utils/logger');
const { getClientIp, normalizeIp } = require('../utils/ipUtils');

/**
 * Bot Detection & CAPTCHA Challenge System
 * Tracks suspicious patterns and triggers CAPTCHA when needed
 */

// In-memory tracking (use Redis in production)
const userRiskScores = new Map();      // Track risk score per user
const ipRiskScores = new Map();        // Track risk score per IP
const failedAttempts = new Map();      // Track failed auth/bet attempts
const captchaChallenges = new Map();   // Track issued CAPTCHA challenges
const patternDetection = new Map();    // Track betting patterns

// Risk score thresholds
const RISK_THRESHOLDS = {
    LOW: 20,        // Email notification
    MEDIUM: 40,     // Require CAPTCHA
    HIGH: 60,       // Temporary ban (5 min)
    CRITICAL: 80    // Account review required
};

// Suspicious patterns
const SUSPICIOUS_PATTERNS = {
    RAPID_BETS: 5,              // 5+ bets in 30 seconds
    RATE_LIMIT_VIOLATIONS: 3,   // 3+ rate limit hits
    FAILED_ATTEMPTS: 5,         // 5+ failed attempts
    IDENTICAL_BETS: 10,         // 10+ identical bet amounts
    ROUND_NUMBERS_ONLY: 15      // Only betting round numbers
};

/**
 * Calculate risk score based on user behavior
 */
function calculateRiskScore(userId, ip, behaviorData) {
    let riskScore = 0;
    const reasons = [];

    // Check 1: Rapid betting pattern
    if (behaviorData.betsInLast30Seconds >= SUSPICIOUS_PATTERNS.RAPID_BETS) {
        riskScore += 15;
        reasons.push(`Rapid betting: ${behaviorData.betsInLast30Seconds} bets in 30s`);
    }

    // Check 2: Rate limit violations
    const rateLimitViolations = failedAttempts.get(`ratelimit:${userId}`) || 0;
    if (rateLimitViolations >= SUSPICIOUS_PATTERNS.RATE_LIMIT_VIOLATIONS) {
        riskScore += 20;
        reasons.push(`Rate limit violations: ${rateLimitViolations}`);
    }

    // Check 3: Failed authentication attempts
    const authFailures = failedAttempts.get(`auth:${userId}`) || 0;
    if (authFailures >= SUSPICIOUS_PATTERNS.FAILED_ATTEMPTS) {
        riskScore += 25;
        reasons.push(`Failed auth attempts: ${authFailures}`);
    }

    // Check 4: Identical bet amounts (bot-like behavior)
    const identicalBets = behaviorData.identicalBetCount || 0;
    if (identicalBets >= SUSPICIOUS_PATTERNS.IDENTICAL_BETS) {
        riskScore += 15;
        reasons.push(`Identical bets: ${identicalBets} consecutive`);
    }

    // Check 5: Only round numbers (bot pattern)
    if (behaviorData.onlyRoundNumbers && behaviorData.totalBets > 15) {
        riskScore += 10;
        reasons.push('Only betting round numbers');
    }

    // Check 6: Multiple accounts from same IP
    const ipActivity = ipRiskScores.get(ip) || { userCount: 0 };
    if (ipActivity.userCount > 3) {
        riskScore += 20;
        reasons.push(`Multiple accounts from IP: ${ipActivity.userCount}`);
    }

    // Check 7: New account with large bets
    if (behaviorData.accountAge < 3600000 && behaviorData.averageBet > 100) { // < 1 hour old
        riskScore += 15;
        reasons.push('New account with large bets');
    }

    return { riskScore, reasons };
}

/**
 * Track betting pattern for bot detection
 */
function trackBettingPattern(userId, betAmount) {
    const key = `pattern:${userId}`;
    let pattern = patternDetection.get(key) || {
        bets: [],
        lastBetTime: null,
        identicalBetCount: 0,
        roundNumberCount: 0,
        totalBets: 0
    };

    const now = Date.now();
    const isRoundNumber = betAmount % 10 === 0;

    // Add bet to history
    pattern.bets.push({ amount: betAmount, timestamp: now });
    pattern.totalBets++;

    // Keep only last 50 bets
    if (pattern.bets.length > 50) {
        pattern.bets = pattern.bets.slice(-50);
    }

    // Count bets in last 30 seconds
    const betsInLast30Seconds = pattern.bets.filter(
        bet => now - bet.timestamp < 30000
    ).length;

    // Count identical consecutive bets
    const lastBets = pattern.bets.slice(-10);
    const allSame = lastBets.every(bet => bet.amount === betAmount);
    pattern.identicalBetCount = allSame ? lastBets.length : 0;

    // Track round numbers
    if (isRoundNumber) {
        pattern.roundNumberCount++;
    }

    pattern.lastBetTime = now;
    pattern.betsInLast30Seconds = betsInLast30Seconds;
    pattern.onlyRoundNumbers = pattern.roundNumberCount === pattern.totalBets;

    patternDetection.set(key, pattern);

    return pattern;
}

/**
 * Record failed attempt
 */
function recordFailedAttempt(type, identifier) {
    const key = `${type}:${identifier}`;
    const count = (failedAttempts.get(key) || 0) + 1;
    failedAttempts.set(key, count);

    // Auto-expire after 15 minutes
    setTimeout(() => {
        const current = failedAttempts.get(key) || 0;
        if (current > 0) {
            failedAttempts.set(key, current - 1);
        }
    }, 900000);

    return count;
}

/**
 * Generate CAPTCHA challenge token
 */
function generateCaptchaChallenge(userId, ip) {
    const challengeId = require('crypto').randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 300000; // 5 minutes

    captchaChallenges.set(challengeId, {
        userId,
        ip,
        expiresAt,
        attempts: 0
    });

    // Auto-cleanup after expiry
    setTimeout(() => {
        captchaChallenges.delete(challengeId);
    }, 300000);

    logger.warn(`CAPTCHA challenge issued: user=${userId}, ip=${ip}, challengeId=${challengeId}`);

    return challengeId;
}

/**
 * Verify CAPTCHA response (Google reCAPTCHA v3 or hCaptcha)
 */
async function verifyCaptcha(captchaToken, challengeId) {
    try {
        // Option 1: Google reCAPTCHA v3
        if (process.env.RECAPTCHA_SECRET_KEY) {
            const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`
            });

            const data = await response.json();

            if (data.success && data.score >= 0.5) {
                logger.info(`CAPTCHA verified: score=${data.score}`);
                return { valid: true, score: data.score };
            }

            logger.warn(`CAPTCHA failed: score=${data.score || 'N/A'}`);
            return { valid: false, score: data.score || 0 };
        }

        // Option 2: hCaptcha
        if (process.env.HCAPTCHA_SECRET_KEY) {
            const response = await fetch('https://hcaptcha.com/siteverify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `secret=${process.env.HCAPTCHA_SECRET_KEY}&response=${captchaToken}`
            });

            const data = await response.json();

            if (data.success) {
                logger.info('hCaptcha verified successfully');
                return { valid: true, score: 1.0 };
            }

            logger.warn(`hCaptcha failed: ${data['error-codes']?.join(', ')}`);
            return { valid: false, score: 0 };
        }

        // For development: simulate CAPTCHA validation
        if (process.env.NODE_ENV === 'development') {
            logger.debug('DEV MODE: CAPTCHA auto-passed');
            return { valid: true, score: 1.0 };
        }

        throw new Error('No CAPTCHA service configured');

    } catch (error) {
        logger.error('CAPTCHA verification error:', error);
        return { valid: false, score: 0, error: error.message };
    }
}

/**
 * Middleware: Check if CAPTCHA is required
 */
const requireCaptchaIfSuspicious = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString();
        const clientIp = normalizeIp(getClientIp(req));
        const { betData } = req.body;

        // Skip CAPTCHA for practice games
        if (betData?.gameType !== 'real') {
            return next();
        }

        // Track betting pattern
        const pattern = trackBettingPattern(userId, betData?.betAmount || 0);

        // Calculate risk score
        const behaviorData = {
            betsInLast30Seconds: pattern.betsInLast30Seconds,
            identicalBetCount: pattern.identicalBetCount,
            onlyRoundNumbers: pattern.onlyRoundNumbers,
            totalBets: pattern.totalBets,
            accountAge: Date.now() - (req.user?.createdAt?.getTime() || 0),
            averageBet: betData?.betAmount || 0
        };

        const { riskScore, reasons } = calculateRiskScore(userId, clientIp, behaviorData);

        // Update risk scores
        userRiskScores.set(userId, { score: riskScore, reasons, updatedAt: Date.now() });

        // Log suspicious activity
        if (riskScore >= RISK_THRESHOLDS.LOW) {
            logger.warn(`Suspicious activity detected: user=${userId}, ip=${clientIp}, score=${riskScore}, reasons=${reasons.join('; ')}`);
        }

        // CRITICAL: Temporary ban
        if (riskScore >= RISK_THRESHOLDS.CRITICAL) {
            return res.status(403).json({
                status: 'error',
                code: 'ACCOUNT_UNDER_REVIEW',
                message: 'Your account has been flagged for suspicious activity. Please contact support.',
                riskScore,
                reasons
            });
        }

        // HIGH: 5-minute cooldown
        if (riskScore >= RISK_THRESHOLDS.HIGH) {
            return res.status(429).json({
                status: 'error',
                code: 'SUSPICIOUS_ACTIVITY_COOLDOWN',
                message: 'Too many suspicious activities detected. Please wait 5 minutes.',
                retryAfterSeconds: 300,
                riskScore
            });
        }

        // MEDIUM: Require CAPTCHA
        if (riskScore >= RISK_THRESHOLDS.MEDIUM) {
            const captchaToken = req.headers['x-captcha-token'] || req.body.captchaToken;

            if (!captchaToken) {
                const challengeId = generateCaptchaChallenge(userId, clientIp);

                return res.status(403).json({
                    status: 'error',
                    code: 'CAPTCHA_REQUIRED',
                    message: 'Please complete the CAPTCHA verification',
                    challengeId,
                    riskScore,
                    reasons
                });
            }

            // Verify CAPTCHA
            const verification = await verifyCaptcha(captchaToken, null);

            if (!verification.valid) {
                return res.status(403).json({
                    status: 'error',
                    code: 'CAPTCHA_FAILED',
                    message: 'CAPTCHA verification failed. Please try again.',
                    score: verification.score
                });
            }

            // CAPTCHA passed - reduce risk score
            userRiskScores.set(userId, { score: Math.max(0, riskScore - 30), reasons: [], updatedAt: Date.now() });
            logger.info(`CAPTCHA passed for user ${userId}, risk score reduced`);
        }

        // LOW: Just log
        if (riskScore >= RISK_THRESHOLDS.LOW) {
            logger.info(`Low-risk activity: user=${userId}, score=${riskScore}`);
        }

        next();

    } catch (error) {
        logger.error('Bot detection middleware error:', error);
        // Don't block on errors in development
        if (process.env.NODE_ENV === 'development') {
            return next();
        }
        return res.status(500).json({
            status: 'error',
            message: `Failed to validate request: ${error.message}`
        });
    }
};

/**
 * Cleanup old data every 10 minutes
 */
setInterval(() => {
    const now = Date.now();
    const ttl = 3600000; // 1 hour

    // Clean old risk scores
    for (const [key, data] of userRiskScores.entries()) {
        if (now - data.updatedAt > ttl) {
            userRiskScores.delete(key);
        }
    }

    for (const [key, data] of ipRiskScores.entries()) {
        if (now - data.updatedAt > ttl) {
            ipRiskScores.delete(key);
        }
    }

    // Clean old patterns
    for (const [key, pattern] of patternDetection.entries()) {
        if (pattern.lastBetTime && now - pattern.lastBetTime > ttl) {
            patternDetection.delete(key);
        }
    }

    logger.debug(`Bot detection cleanup: ${userRiskScores.size} users, ${ipRiskScores.size} IPs tracked`);
}, 600000);

module.exports = {
    requireCaptchaIfSuspicious,
    recordFailedAttempt,
    verifyCaptcha,
    calculateRiskScore,
    trackBettingPattern,
    RISK_THRESHOLDS
};
