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

// GET /api/user/wallet/inflows?address=0x...&limit=20
// Proxies BSCScan to get USDT inflows for a wallet — avoids client-side getLogs RPC issues
router.get('/wallet/inflows', async (req, res) => {
    try {
        const { address, limit = 20 } = req.query;

        if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
            return res.status(400).json({ status: 'error', message: 'Invalid address' });
        }

        const usdtAddress = process.env.USDT_CONTRACT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955';
        const apiKey = process.env.BSCSCAN_API_KEY || '';
        const chainId = Number(process.env.CHAIN_ID || 56);
        const explorerBase = chainId === 97 ? 'https://api-testnet.bscscan.com/api' : 'https://api.bscscan.com/api';

        const params = new URLSearchParams({
            module: 'account',
            action: 'tokentx',
            contractaddress: usdtAddress,
            address: address,
            sort: 'desc',
            offset: String(Math.min(Number(limit), 50)),
            page: '1',
            ...(apiKey ? { apikey: apiKey } : {})
        });

        const response = await fetch(`${explorerBase}?${params.toString()}`);
        const data = await response.json();

        const isDeprecated = (data.message && (
            data.message.toLowerCase().includes('deprecated') ||
            data.message.toLowerCase().includes('v1 endpoint') ||
            data.message.toLowerCase().includes('upgrade your api plan') ||
            data.message.toLowerCase().includes('free api access')
        )) || (data.result && typeof data.result === 'string' && (
            data.result.toLowerCase().includes('deprecated') ||
            data.result.toLowerCase().includes('v1 endpoint') ||
            data.result.toLowerCase().includes('upgrade your api plan') ||
            data.result.toLowerCase().includes('free api access')
        ));

        if (data.status === '1' && Array.isArray(data.result)) {
            // Filter to only inflows (to == address)
            const inflows = data.result.filter(
                (tx) => tx.to?.toLowerCase() === address.toLowerCase()
            );
            return res.json({ status: 'success', transactions: inflows });
        }

        if (isDeprecated) {
            console.warn(`[BSCScan] Advisory received for user ${address}: API restricted/deprecated. Returning empty.`);
        }

        // BSCScan returned no results or error — return empty (not a server error)
        return res.json({ status: 'success', transactions: [] });

    } catch (error) {
        console.error('Wallet inflows error:', error);
        // Return empty rather than 500 — client handles gracefully
        res.json({ status: 'success', transactions: [] });
    }
});

module.exports = router;
