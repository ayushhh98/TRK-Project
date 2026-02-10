const crypto = require('crypto');

// Generate device fingerprint from request
function generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress || '';

    return crypto
        .createHash('sha256')
        .update(`${userAgent}-${ip}`)
        .digest('hex');
}

// Verify device fingerprint matches
function verifyDeviceFingerprint(req, storedFingerprint) {
    const currentFingerprint = generateDeviceFingerprint(req);
    return currentFingerprint === storedFingerprint;
}

module.exports = {
    generateDeviceFingerprint,
    verifyDeviceFingerprint
};
