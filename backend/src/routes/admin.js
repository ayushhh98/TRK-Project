const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin, requireSuperAdmin, requirePermission } = require('../middleware/rbac');
const User = require('../models/User');
const Game = require('../models/Game');
const { logger } = require('../utils/logger');

/**
 * Admin Routes
 * Protected by role-based access control
 */

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /admin/users
 * List all users with pagination
 */
router.get('/users', auth, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, role, search } = req.query;

        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { walletAddress: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-__v')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await User.countDocuments(query);

        res.json({
            status: 'success',
            data: {
                users,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                total: count
            }
        });
    } catch (error) {
        logger.error('Admin users list error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch users'
        });
    }
});

/**
 * GET /admin/users/:id
 * Get detailed user information
 */
router.get('/users/:id', auth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Get user stats
        const totalGames = await Game.countDocuments({ user: user._id });
        const totalWagered = await Game.aggregate([
            { $match: { user: user._id } },
            { $group: { _id: null, total: { $sum: '$betAmount' } } }
        ]);

        res.json({
            status: 'success',
            data: {
                user,
                stats: {
                    totalGames,
                    totalWagered: totalWagered[0]?.total || 0
                }
            }
        });
    } catch (error) {
        logger.error('Admin user detail error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch user'
        });
    }
});

/**
 * PATCH /admin/users/:id/ban
 * Ban a user account
 */
router.patch('/users/:id/ban', auth, requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const targetUser = await User.findById(req.params.id);

        if (!targetUser) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Prevent banning other admins unless superadmin
        if (['admin', 'superadmin'].includes(targetUser.role) && req.user.role !== 'superadmin') {
            return res.status(403).json({
                status: 'error',
                message: 'Only superadmins can ban other admins'
            });
        }

        targetUser.isBanned = true;
        targetUser.banReason = reason || 'Banned by administrator';
        targetUser.bannedAt = new Date();
        targetUser.bannedBy = req.user._id;

        await targetUser.save();

        logger.warn(`User banned: ${targetUser.walletAddress} by ${req.user.walletAddress}`);

        res.json({
            status: 'success',
            message: 'User banned successfully',
            data: { user: targetUser }
        });
    } catch (error) {
        logger.error('Ban user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to ban user'
        });
    }
});

/**
 * PATCH /admin/users/:id/unban
 * Unban a user account
 */
router.patch('/users/:id/unban', auth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        user.isBanned = false;
        user.banReason = null;
        user.bannedAt = null;
        user.bannedBy = null;

        await user.save();

        logger.info(`User unbanned: ${user.walletAddress} by ${req.user.walletAddress}`);

        res.json({
            status: 'success',
            message: 'User unbanned successfully',
            data: { user }
        });
    } catch (error) {
        logger.error('Unban user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to unban user'
        });
    }
});

/**
 * PATCH /admin/users/:id/role
 * Update user role (superadmin only)
 */
router.patch('/users/:id/role', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { role } = req.body;

        if (!['player', 'admin', 'superadmin'].includes(role)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid role'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        const oldRole = user.role;
        user.role = role;
        await user.save();

        logger.warn(`Role changed: ${user.walletAddress} from ${oldRole} to ${role} by ${req.user.walletAddress}`);

        res.json({
            status: 'success',
            message: 'Role updated successfully',
            data: { user }
        });
    } catch (error) {
        logger.error('Update role error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update role'
        });
    }
});

// ============================================
// GAME MONITORING
// ============================================

/**
 * GET /admin/games
 * Monitor recent games
 */
router.get('/games', auth, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 100, gameType } = req.query;

        const query = {};
        if (gameType) query.gameType = gameType;

        const games = await Game.find(query)
            .populate('user', 'walletAddress role')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const count = await Game.countDocuments(query);

        res.json({
            status: 'success',
            data: {
                games,
                totalPages: Math.ceil(count / limit),
                currentPage: page,
                total: count
            }
        });
    } catch (error) {
        logger.error('Admin games list error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch games'
        });
    }
});

/**
 * GET /admin/analytics
 * Platform analytics and statistics
 */
router.get('/analytics', auth, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalGames = await Game.countDocuments();
        const bannedUsers = await User.countDocuments({ isBanned: true });

        const totalWagered = await Game.aggregate([
            { $group: { _id: null, total: { $sum: '$betAmount' } } }
        ]);

        const totalPayout = await Game.aggregate([
            { $match: { isWin: true } },
            { $group: { _id: null, total: { $sum: '$payout' } } }
        ]);

        const recentActivity = await Game.find()
            .populate('user', 'walletAddress')
            .limit(10)
            .sort({ createdAt: -1 });

        res.json({
            status: 'success',
            data: {
                totalUsers,
                totalGames,
                bannedUsers,
                totalWagered: totalWagered[0]?.total || 0,
                totalPayout: totalPayout[0]?.total || 0,
                houseEdge: totalWagered[0]?.total - (totalPayout[0]?.total || 0),
                recentActivity
            }
        });
    } catch (error) {
        logger.error('Admin analytics error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch analytics'
        });
    }
});

// ============================================
// SYSTEM MANAGEMENT
// ============================================

/**
 * GET /admin/system/status
 * Get system health status
 */
router.get('/system/status', auth, requireAdmin, async (req, res) => {
    try {
        const dbStatus = require('mongoose').connection.readyState;
        const uptime = process.uptime();

        res.json({
            status: 'success',
            data: {
                database: dbStatus === 1 ? 'connected' : 'disconnected',
                uptime,
                nodeEnv: process.env.NODE_ENV,
                realMoneyEnabled: process.env.REAL_MONEY_GAMES_ENABLED === 'true',
                version: '2.0.0'
            }
        });
    } catch (error) {
        logger.error('System status error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch system status'
        });
    }
});

module.exports = router;
