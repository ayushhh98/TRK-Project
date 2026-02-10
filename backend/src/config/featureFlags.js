/**
 * Feature Flags Configuration
 * Controls which features are enabled/disabled
 */

// Load from environment or use defaults
const featureFlags = {
    // Real money games (DISABLED by default until security audit complete)
    REAL_MONEY_GAMES_ENABLED: process.env.REAL_MONEY_GAMES_ENABLED === 'true',

    // Practice games (always enabled)
    PRACTICE_GAMES_ENABLED: process.env.PRACTICE_GAMES_ENABLED !== 'false',

    // Provably fair system (enabled)
    PROVABLY_FAIR_ENABLED: process.env.PROVABLY_FAIR_ENABLED !== 'false',

    // Legacy bet endpoint (for backwards compatibility)
    LEGACY_BET_ENDPOINT_ENABLED: process.env.LEGACY_BET_ENDPOINT_ENABLED === 'true',

    // Security version
    MIN_SECURITY_VERSION: process.env.GAME_SECURITY_VERSION || '2.0.0',

    // Rate limiting
    MAX_BET_AMOUNT_REAL: parseFloat(process.env.MAX_BET_AMOUNT_REAL) || 1000,
    MAX_BET_AMOUNT_PRACTICE: parseFloat(process.env.MAX_BET_AMOUNT_PRACTICE) || 10000,
    RATE_LIMIT_BET_WINDOW_MS: parseInt(process.env.RATE_LIMIT_BET_WINDOW) || 5000, // 5 seconds

    // Commitment expiry (how long player has to reveal bet)
    COMMITMENT_EXPIRY_MS: parseInt(process.env.COMMITMENT_EXPIRY_MS) || 60000 // 1 minute
};

// Validation helper
function isFeatureEnabled(featureName) {
    return featureFlags[featureName] === true;
}

// Get all flags (for admin/debug endpoint)
function getAllFlags() {
    return { ...featureFlags };
}

// Middleware to check feature flag
function requireFeature(featureName) {
    return (req, res, next) => {
        if (!isFeatureEnabled(featureName)) {
            return res.status(403).json({
                status: 'error',
                message: `Feature "${featureName}" is currently disabled`,
                code: 'FEATURE_DISABLED'
            });
        }
        next();
    };
}

module.exports = {
    featureFlags,
    isFeatureEnabled,
    getAllFlags,
    requireFeature
};
