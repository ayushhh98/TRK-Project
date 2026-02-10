const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev-secret');

        // Check if user exists
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'User no longer exists.'
            });
        }

        // Verify session validity (revocation check)
        // JWT iat is in seconds, lastLoginAt.getTime() is in ms
        if (user.lastLoginAt && (decoded.iat * 1000) < (user.lastLoginAt.getTime() - 5000)) { // 5s grace for clock skew
            return res.status(401).json({
                status: 'error',
                message: 'Session expired or revoked. Please log in again.'
            });
        }

        // Attach user to request (include RBAC fields)
        req.user = {
            id: user._id,
            _id: user._id,
            walletAddress: user.walletAddress,
            email: user.email,
            role: user.role || 'player',
            permissions: user.permissions || [],
            isBanned: user.isBanned || false,
            banReason: user.banReason || null,
            bannedAt: user.bannedAt || null,
            isActive: user.isActive !== false
        };

        next();

    } catch (error) {
        console.error('Auth middleware error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Token expired'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Authentication failed'
        });
    }
};

module.exports = auth;
