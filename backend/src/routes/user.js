const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-nonce');

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: { user }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get user'
        });
    }
});

// Update user profile
router.patch('/me', auth, async (req, res) => {
    try {
        const allowedUpdates = ['isActive', 'isRegisteredOnChain'];
        const updates = Object.keys(req.body)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
                obj[key] = req.body[key];
                return obj;
            }, {});

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updates,
            { new: true, runValidators: true }
        ).select('-nonce');

        res.status(200).json({
            status: 'success',
            data: { user }
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update user'
        });
    }
});

// Get user stats
router.get('/stats', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        const stats = {
            practiceBalance: user.practiceBalance,
            realBalances: user.realBalances,
            gamesPlayed: user.gamesPlayed,
            gamesWon: user.gamesWon,
            winRate: user.gamesPlayed > 0
                ? ((user.gamesWon / user.gamesPlayed) * 100).toFixed(1)
                : 0,
            totalWinnings: user.totalWinnings,
            teamStats: user.teamStats,
            cashbackStats: user.cashbackStats,
            clubRank: user.clubRank,
            practiceExpiry: user.practiceExpiry
        };

        res.status(200).json({
            status: 'success',
            data: { stats }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get stats'
        });
    }
});

module.exports = router;
