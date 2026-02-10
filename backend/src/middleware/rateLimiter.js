const rateLimit = require('express-rate-limit');

// Auth endpoints rate limiter (5 requests per 15 minutes per IP)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        status: 'error',
        message: 'Too many authentication attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests from counting
    skipSuccessfulRequests: false
});

// Withdrawal endpoints rate limiter (3 requests per hour per user)
const withdrawalLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        status: 'error',
        message: 'Too many withdrawal requests. Please try again in 1 hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use user ID as key instead of IP
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    }
});

// Refresh token limiter (10 refreshes per hour per IP)
const refreshLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        status: 'error',
        message: 'Too many token refresh attempts. Please log in again.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    authLimiter,
    withdrawalLimiter,
    refreshLimiter
};
