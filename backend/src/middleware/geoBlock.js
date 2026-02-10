const { logger } = require('../utils/logger');

/**
 * Geographic Blocking Middleware
 * Blocks access from restricted countries based on IP geolocation headers.
 * Supported headers: 'cf-ipcountry' (Cloudflare), 'x-vercel-ip-country' (Vercel)
 */

const RESTRICTED_COUNTRIES = (process.env.RESTRICTED_COUNTRIES || 'IN,US,UK,AU').split(',').map(c => c.trim().toUpperCase());

const geoBlock = (req, res, next) => {
    // 1. Get country code from headers
    const countryCode = req.headers['cf-ipcountry'] ||
        req.headers['x-vercel-ip-country'] ||
        req.headers['x-country-code'];

    // 2. Logging (Debug only)
    if (process.env.NODE_ENV !== 'production') {
        logger.debug(`Geo Check: IP ${req.ip}, Country: ${countryCode || 'Unknown'}`);
    }

    // 3. Check against restricted list
    if (countryCode && RESTRICTED_COUNTRIES.includes(countryCode.toUpperCase())) {
        logger.warn(`Blocked access attempt from restricted country: ${countryCode} (IP: ${req.ip})`);

        return res.status(403).json({
            status: 'error',
            message: 'Service not available in your region due to jurisdictional restrictions.',
            code: 'GEO_RESTRICTED'
        });
    }

    next();
};

module.exports = geoBlock;
