const { logger } = require('../utils/logger');

/**
 * Role-Based Access Control Middleware
 * Protects routes based on user roles and permissions
 */

/**
 * Check if user has required role
 */
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                code: 'UNAUTHORIZED',
                message: 'Authentication required'
            });
        }

        // Check if user is banned
        if (req.user.isBanned) {
            return res.status(403).json({
                status: 'error',
                code: 'ACCOUNT_BANNED',
                message: req.user.banReason || 'Your account has been banned',
                bannedAt: req.user.bannedAt
            });
        }

        // Check if account is active
        if (!req.user.isActive) {
            return res.status(403).json({
                status: 'error',
                code: 'ACCOUNT_INACTIVE',
                message: 'Your account is inactive. Contact support.'
            });
        }

        // Check role
        if (!allowedRoles.includes(req.user.role)) {
            logger.warn(`Access denied: user=${req.user._id}, role=${req.user.role}, required=${allowedRoles.join(',')}`);

            return res.status(403).json({
                status: 'error',
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'You do not have permission to access this resource',
                requiredRole: allowedRoles,
                yourRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Check if user has specific permission
 */
const requirePermission = (...permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                code: 'UNAUTHORIZED',
                message: 'Authentication required'
            });
        }

        // Superadmins have all permissions
        if (req.user.role === 'superadmin') {
            return next();
        }

        // Check if user has any of the required permissions
        const hasPermission = permissions.some(permission =>
            req.user.permissions && req.user.permissions.includes(permission)
        );

        if (!hasPermission) {
            logger.warn(`Permission denied: user=${req.user._id}, permissions=${permissions.join(',')}`);

            return res.status(403).json({
                status: 'error',
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'You do not have the required permissions',
                requiredPermissions: permissions
            });
        }

        next();
    };
};

/**
 * Role Definitions & Mapping
 */
const ADMIN_ROLES = ['admin', 'superadmin', 'finance_admin', 'compliance_admin', 'support_admin', 'tech_admin'];

/**
 * Require admin role (any admin type)
 */
const requireAdmin = requireRole(...ADMIN_ROLES);

/**
 * Require superadmin role only
 */
const requireSuperAdmin = requireRole('superadmin');

/**
 * Combined role and permission check
 */
const requireRoleOrPermission = (roles, permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                code: 'UNAUTHORIZED',
                message: 'Authentication required'
            });
        }

        // Check role
        const hasRole = roles.includes(req.user.role);

        // Check permissions
        const hasPermission = req.user.role === 'superadmin' ||
            permissions.some(p => req.user.permissions && req.user.permissions.includes(p));

        if (hasRole || hasPermission) {
            return next();
        }

        logger.warn(`Access denied: user=${req.user._id}, role=${req.user.role}`);

        return res.status(403).json({
            status: 'error',
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Access denied',
            requiredRole: roles,
            requiredPermissions: permissions
        });
    };
};
/**
 * IP Whitelisting Middleware for Admin Routes
 */
const requireIpWhitelist = (req, res, next) => {
    const whitelistedIps = process.env.ADMIN_WHITELISTED_IPS ? process.env.ADMIN_WHITELISTED_IPS.split(',') : [];

    if (process.env.NODE_ENV === 'development' && whitelistedIps.length === 0) {
        return next();
    }

    if (whitelistedIps.length === 0 && (req.ip === '::1' || req.ip === '127.0.0.1')) {
        return next();
    }

    const clientIp = req.ip || req.connection.remoteAddress;

    if (whitelistedIps.some(ip => clientIp.includes(ip))) {
        return next();
    }

    logger.warn(`Admin access blocked: Unauthorized IP ${clientIp} for user ${req.user?._id}`);

    return res.status(403).json({
        status: 'error',
        code: 'UNAUTHORIZED_IP',
        message: 'Access denied: Your IP address is not whitelisted for administrative access'
    });
};

module.exports = {
    requireRole,
    requirePermission,
    requireAdmin,
    requireSuperAdmin,
    requireRoleOrPermission,
    requireIpWhitelist
};
