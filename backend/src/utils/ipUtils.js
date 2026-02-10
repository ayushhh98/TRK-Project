/**
 * IP Address Extraction Utility
 * Safely extracts real client IP from various headers
 */

/**
 * Get client IP address from request
 * Handles proxies, load balancers, and CDNs
 * 
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
    // Check various headers in order of trust
    // X-Forwarded-For: May contain multiple IPs (client, proxy1, proxy2)
    // X-Real-IP: Set by nginx and other reverse proxies
    // CF-Connecting-IP: Cloudflare
    // X-Client-IP: Some proxies
    // req.ip: Express default (often ::1 or 127.0.0.1 in development)

    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
        // Take the first one (original client)
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return ips[0];
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return realIp;
    }

    const cfConnectingIp = req.headers['cf-connecting-ip'];
    if (cfConnectingIp) {
        return cfConnectingIp;
    }

    const xClientIp = req.headers['x-client-ip'];
    if (xClientIp) {
        return xClientIp;
    }

    // Fallback to Express's req.ip
    return req.ip || req.connection.remoteAddress || 'unknown';
}

/**
 * Normalize IPv6 addresses to consistent format
 * Converts ::ffff:127.0.0.1 to 127.0.0.1
 * 
 * @param {string} ip - IP address
 * @returns {string} Normalized IP
 */
function normalizeIp(ip) {
    if (!ip) return 'unknown';

    // Convert IPv6-mapped IPv4 to IPv4
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }

    // Convert localhost variations
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
        return 'localhost';
    }

    return ip;
}

/**
 * Check if IP is from a trusted proxy/CDN
 * Useful for rate limiting decisions
 * 
 * @param {string} ip - IP address
 * @returns {boolean} True if trusted
 */
function isTrustedProxy(ip) {
    // Cloudflare IP ranges (simplified - use full list in production)
    const cloudflareRanges = [
        '173.245.48.0/20',
        '103.21.244.0/22',
        '103.22.200.0/22',
        // Add more Cloudflare ranges
    ];

    // Private IP ranges
    const privateRanges = [
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '127.0.0.0/8'
    ];

    // For now, simple check for localhost
    return ip === 'localhost' || ip === '127.0.0.1' || ip === '::1';
}

module.exports = {
    getClientIp,
    normalizeIp,
    isTrustedProxy
};
