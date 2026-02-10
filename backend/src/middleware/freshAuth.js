const jwt = require('jsonwebtoken');

// Middleware to require fresh authentication (token must be less than 5 minutes old)
const requireFreshAuth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'Fresh authentication required for this operation'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify and decode token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Check if token was issued within last 5 minutes
        const now = Math.floor(Date.now() / 1000);
        const tokenAge = now - decoded.iat; // Token age in seconds

        const MAX_TOKEN_AGE = 5 * 60; // 5 minutes

        if (tokenAge > MAX_TOKEN_AGE) {
            return res.status(403).json({
                status: 'error',
                message: 'This operation requires fresh authentication. Please log in again.',
                code: 'TOKEN_TOO_OLD'
            });
        }

        // Token is fresh, proceed
        next();

    } catch (error) {
        console.error('Fresh auth check error:', error);
        return res.status(401).json({
            status: 'error',
            message: 'Authentication failed'
        });
    }
};

module.exports = { requireFreshAuth };
