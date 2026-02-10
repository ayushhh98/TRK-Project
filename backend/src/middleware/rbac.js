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
 * Require admin role (admin or superadmin)
 */
const requireAdmin = requireRole('admin', 'superadmin');

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

module.exports = {
    requireRole,
    requirePermission,
    requireAdmin,
    requireSuperAdmin,
    requireRoleOrPermission
};
