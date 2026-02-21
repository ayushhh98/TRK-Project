const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { ethers } = require('ethers');
const { requireAdmin, requireSuperAdmin, requirePermission } = require('../middleware/rbac');
const User = require('../models/User');
const Game = require('../models/Game');
const Poster = require('../models/Poster');
const { LegalContent, LEGAL_TYPES } = require('../models/LegalContent');
const { logger } = require('../utils/logger');
const JackpotService = require('../services/jackpotService');

// Service state
let ioInstance;
let observerInterval;
let jackpotService;

// Initialize service with Socket.IO
router.initializeService = (io) => {
    ioInstance = io;
    jackpotService = new JackpotService(io); // Initialize JackpotService for admin use

    // Clear existing interval if re-initialized
    if (observerInterval) clearInterval(observerInterval);

    // Broadcast stats every 10 seconds
    observerInterval = setInterval(async () => {
        try {
            const now = new Date();
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);

            const practiceBaseQuery = { role: 'player', practiceBalance: { $gt: 0 } };
            const activePracticeQuery = { ...practiceBaseQuery, practiceExpiry: { $gt: now } };
            const practiceTodayQuery = { role: 'player', createdAt: { $gte: todayStart } };
            const practiceYesterdayQuery = {
                role: 'player',
                createdAt: { $gte: yesterdayStart, $lt: todayStart }
            };
            const clubIncomeQuery = { role: 'player', 'realBalances.club': { $gt: 0 } };

            const [
                totalUsers,
                totalGames,
                totalJackpots,
                totalAudits,
                dbStats,
                practiceTotal,
                practiceActive,
                practiceConverted,
                practiceNewToday,
                practiceNewYesterday,
                usersWithClubIncome,
                tier2Users,
                clubIncomeAgg
            ] = await Promise.all([
                mongoose.connection.db.collection('users').countDocuments(),
                mongoose.connection.db.collection('games').countDocuments(),
                mongoose.connection.db.collection('jackpotrounds').countDocuments(),
                mongoose.connection.db.collection('auditlogs').countDocuments(),
                mongoose.connection.db.command({ dbStats: 1 }),
                mongoose.connection.db.collection('users').countDocuments(practiceBaseQuery),
                mongoose.connection.db.collection('users').countDocuments(activePracticeQuery),
                mongoose.connection.db.collection('users').countDocuments({
                    ...practiceBaseQuery,
                    'activation.tier': { $in: ['tier1', 'tier2'] }
                }),
                mongoose.connection.db.collection('users').countDocuments(practiceTodayQuery),
                mongoose.connection.db.collection('users').countDocuments(practiceYesterdayQuery),
                mongoose.connection.db.collection('users').countDocuments(clubIncomeQuery),
                mongoose.connection.db.collection('users').countDocuments({ role: 'player', 'activation.tier': 'tier2' }),
                mongoose.connection.db.collection('users').aggregate([
                    { $match: { role: 'player' } },
                    { $group: { _id: null, total: { $sum: '$realBalances.club' } } }
                ]).toArray()
            ]);

            const stats = {
                users: totalUsers,
                games: totalGames,
                jackpots: totalJackpots,
                audits: totalAudits,
                dbSize: dbStats.dataSize,
                practice: {
                    total: practiceTotal,
                    active: practiceActive,
                    converted: practiceConverted,
                    newToday: practiceNewToday,
                    newYesterday: practiceNewYesterday
                },
                club: {
                    usersWithIncome: usersWithClubIncome,
                    totalDistributed: clubIncomeAgg?.[0]?.total || 0,
                    tier2Eligible: tier2Users
                }
            };
            io.emit('admin:stats_update', stats);
        } catch (error) {
            console.error('Failed to broadcast admin stats:', error.message);
        }
    }, 10000); // 10 seconds
};

const toAdminRealtimeUser = (user) => ({
    _id: user?._id?.toString?.() || user?._id || '',
    email: user?.email || '',
    walletAddress: user?.walletAddress || '',
    role: user?.role || 'player',
    isBanned: Boolean(user?.isBanned),
    isFrozen: Boolean(user?.isFrozen),
    isActive: user?.isActive !== false,
    credits: typeof user?.practiceBalance === 'number' ? user.practiceBalance : 0,
    rewardPoints: typeof user?.rewardPoints === 'number' ? user.rewardPoints : 0,
    realBalances: user?.realBalances || {},
    activation: user?.activation || { tier: 'none', totalDeposited: 0 },
    referralCode: user?.referralCode || '',
    createdAt: user?.createdAt || new Date()
});

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
        const { page = 1, limit = 50, role, search, tier } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

        const query = {};
        if (role) query.role = role;
        if (tier && tier !== 'all') query['activation.tier'] = tier;
        if (search) {
            query.$or = [
                { walletAddress: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('walletAddress email role isBanned isFrozen isActive practiceBalance rewardPoints realBalances activation referralCode createdAt')
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .sort({ createdAt: -1 })
            .lean();

        const count = await User.countDocuments(query);
        const normalizedUsers = users.map((user) => ({
            ...user,
            credits: typeof user.practiceBalance === 'number' ? user.practiceBalance : 0
        }));

        res.json({
            status: 'success',
            data: {
                users: normalizedUsers,
                totalPages: Math.ceil(count / limitNum),
                currentPage: pageNum,
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
        if (ioInstance) {
            ioInstance.emit('admin:user_updated', toAdminRealtimeUser(targetUser));
        }

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
        if (ioInstance) {
            ioInstance.emit('admin:user_updated', toAdminRealtimeUser(user));
        }

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
        if (ioInstance) {
            ioInstance.emit('admin:user_updated', toAdminRealtimeUser(user));
        }

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
                newUsersToday: await User.countDocuments({ role: 'player', createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
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

/**
 * GET /admin/analytics/history
 * Get historical analytics data for charts
 */
router.get('/analytics/history', auth, requireAdmin, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        const history = await Game.aggregate([
            {
                $match: {
                    createdAt: { $gte: daysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    wagered: { $sum: "$betAmount" },
                    payout: {
                        $sum: {
                            $cond: [{ $eq: ["$isWin", true] }, "$payout", 0]
                        }
                    },
                    gamesCount: { $sum: 1 },
                    uniqueUsers: { $addToSet: "$user" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing dates
        const result = [];
        for (let i = 0; i < parseInt(days); i++) {
            const d = new Date();
            d.setDate(d.getDate() - (parseInt(days) - 1 - i));
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const found = history.find(h => h._id === dateStr);
            if (found) {
                result.push({
                    date: dateStr,
                    name: dayName,
                    wagered: found.wagered,
                    payout: found.payout,
                    users: found.uniqueUsers.length,
                    games: found.gamesCount
                });
            } else {
                result.push({
                    date: dateStr,
                    name: dayName,
                    wagered: 0,
                    payout: 0,
                    users: 0,
                    games: 0
                });
            }
        }

        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        logger.error('Admin analytics history error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch analytics history'
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

const BDWallet = require('../models/BDWallet');

/**
 * GET /admin/wallets
 * Get BD / Treasury wallet balances
 */
router.get('/wallets', auth, requireAdmin, async (req, res) => {
    try {
        // Fetch wallets from DB
        let wallets = await BDWallet.find({ isActive: true }).sort({ createdAt: 1 }).lean();

        // If no wallets in DB, check env for initial seeding (migration path)
        if (wallets.length === 0 && process.env.BD_WALLETS) {
            const walletConfig = process.env.BD_WALLETS;
            let seedWallets = [];
            try {
                const parsed = JSON.parse(walletConfig);
                if (Array.isArray(parsed)) {
                    seedWallets = parsed;
                }
            } catch {
                seedWallets = walletConfig.split(',').map((entry, idx) => {
                    const [name, address, type] = entry.split(':').map(v => v?.trim());
                    return {
                        name: name || `Wallet ${idx + 1}`,
                        address: address || entry.trim(),
                        type: type || 'BD'
                    };
                });
            }

            // Persist seeded wallets
            if (seedWallets.length > 0) {
                await BDWallet.insertMany(seedWallets.map(w => ({
                    name: w.name,
                    address: w.address,
                    type: w.type || 'BD'
                })));
                wallets = await BDWallet.find({ isActive: true }).sort({ createdAt: 1 }).lean();
            }
        }

        const rpcUrl = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/";
        const usdtAddress = process.env.USDT_CONTRACT_ADDRESS || "0x55d398326f99059fF775485246999027B3197955";
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
        const usdt = new ethers.Contract(usdtAddress, erc20Abi, provider);

        let decimals = 18;
        try {
            decimals = await usdt.decimals();
        } catch (err) {
            console.warn("Failed to read USDT decimals, defaulting to 18", err?.message || err);
        }

        const data = await Promise.all(
            wallets
                .filter(w => w?.address && ethers.isAddress(w.address))
                .map(async (wallet) => {
                    let balance = "0.00";
                    try {
                        const normalizedAddress = ethers.getAddress(wallet.address);
                        const rawBalance = await usdt.balanceOf(normalizedAddress);
                        const fmt = ethers.formatUnits(rawBalance, decimals);
                        balance = Number(fmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    } catch (e) {
                        console.warn(`Failed to fetch balance for ${wallet.address}:`, e.message);
                        balance = "Error";
                    }

                    return {
                        _id: wallet._id,
                        name: wallet.name,
                        address: wallet.address,
                        type: wallet.type || 'BD',
                        balance
                    };
                })
        );

        res.json({ status: 'success', data });
    } catch (error) {
        if (error.stack) logger.error(error.stack); // ADDED DEBUGGING
        logger.error('Fetch wallets error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch wallet balances', details: error.message });
    }
});

/**
 * POST /admin/wallets
 * Add a new BD wallet
 */
router.post('/wallets', auth, requireAdmin, async (req, res) => {
    try {
        const { name, address, type } = req.body;

        if (!name || !address) {
            return res.status(400).json({ status: 'error', message: 'Name and address are required' });
        }

        if (!ethers.isAddress(address)) {
            return res.status(400).json({ status: 'error', message: 'Invalid wallet address' });
        }

        const existing = await BDWallet.findOne({ address: address.toLowerCase() });
        if (existing) {
            return res.status(400).json({ status: 'error', message: 'Wallet already exists' });
        }

        const newWallet = await BDWallet.create({
            name,
            address,
            type: type || 'BD'
        });

        res.json({ status: 'success', data: newWallet });
    } catch (error) {
        logger.error('Add wallet error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to add wallet' });
    }
});

/**
 * DELETE /admin/wallets/:id
 * Remove a BD wallet
 */
router.delete('/wallets/:id', auth, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await BDWallet.findByIdAndDelete(id);
        res.json({ status: 'success', message: 'Wallet removed' });
    } catch (error) {
        logger.error('Delete wallet error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete wallet' });
    }
});

/**
 * GET /admin/contract/transactions
 * Fetch end-to-end contract transactions (BSCScan integration)
 */
router.get('/contract/transactions', auth, requireAdmin, async (req, res) => {
    try {
        const contractAddress = process.env.GAME_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS;
        if (!contractAddress || !ethers.isAddress(contractAddress)) {
            return res.status(400).json({ status: 'error', message: 'Invalid or missing contract address' });
        }

        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const offset = Math.min(Math.max(1, parseInt(req.query.offset || '100', 10)), 10000);
        const sort = req.query.sort === 'asc' ? 'asc' : 'desc';
        const mode = req.query.mode === 'txlist' ? 'txlist' : 'tokentx';

        const timeAgo = (timestamp) => {
            const diff = Date.now() - Number(timestamp) * 1000;
            const minutes = Math.floor(diff / 60000);
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes}m ago`;
            const hours = Math.floor(minutes / 60);
            if (hours < 24) return `${hours}h ago`;
            const days = Math.floor(hours / 24);
            return `${days}d ago`;
        };

        const explorerApiKey = process.env.ETHERSCAN_API_KEY || process.env.BSCSCAN_API_KEY;
        const chainId = Number(process.env.CHAIN_ID || 56);
        const defaultExplorerBase = 'https://api.etherscan.io/v2/api';
        const explorerBase = process.env.ETHERSCAN_API_URL || process.env.BSCSCAN_API_URL || defaultExplorerBase;

        if (explorerApiKey) {
            const params = new URLSearchParams({
                chainid: String(chainId),
                module: 'account',
                action: mode,
                address: contractAddress,
                startblock: '0',
                endblock: '99999999',
                page: String(page),
                offset: String(offset),
                sort,
                apikey: explorerApiKey
            });

            if (mode === 'tokentx') {
                const usdtAddress = process.env.USDT_CONTRACT_ADDRESS;
                if (usdtAddress && ethers.isAddress(usdtAddress)) {
                    params.set('contractaddress', usdtAddress);
                }
            }

            const response = await fetch(`${explorerBase}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`Explorer API request failed (${response.status})`);
            }

            const payload = await response.json();
            const isNoTx = payload?.message && payload.message.toLowerCase().includes('no transactions');
            if (payload?.status !== '1' && !isNoTx) {
                throw new Error(payload?.result || payload?.message || 'Explorer API error');
            }

            const rows = Array.isArray(payload?.result) ? payload.result : [];
            const transactions = rows.map((tx) => {
                const decimals = mode === 'tokentx' ? Number(tx.tokenDecimal || 18) : 18;
                const symbol = mode === 'tokentx' ? (tx.tokenSymbol || 'USDT') : 'BNB';
                let amount = '0.00';
                try {
                    amount = Number(ethers.formatUnits(BigInt(tx.value || '0'), decimals)).toFixed(2);
                } catch {
                    amount = '0.00';
                }

                const method =
                    tx.functionName?.split('(')[0] ||
                    (tx.methodId && tx.methodId !== '0x' ? tx.methodId : (mode === 'tokentx' ? 'Token Transfer' : 'Contract Tx'));

                const status = tx.isError === '1' || tx.txreceipt_status === '0' ? 'Failed' : 'Confirmed';

                return {
                    hash: tx.hash,
                    method,
                    status,
                    amount,
                    symbol,
                    time: timeAgo(tx.timeStamp || tx.timeStamp === 0 ? tx.timeStamp : 0),
                    from: tx.from,
                    to: tx.to
                };
            });

            return res.json({
                status: 'success',
                source: 'explorer',
                pagination: {
                    page,
                    offset,
                    hasMore: rows.length === offset
                },
                data: transactions
            });
        }

        // Fallback to RPC (limited recent logs)
        const rpcUrl = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/";
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const latestBlock = await provider.getBlockNumber();
        let logs = [];

        try {
            logs = await provider.getLogs({
                address: contractAddress,
                fromBlock: latestBlock - 50,
                toBlock: 'latest'
            });
        } catch (logError) {
            console.warn('Initial RPC log fetch failed (range may be too large), trying last 10 blocks...', logError.message);
            logs = await provider.getLogs({
                address: contractAddress,
                fromBlock: latestBlock - 10,
                toBlock: 'latest'
            });
        }

        const recentLogs = logs.slice(-20).reverse();
        const transactions = await Promise.all(recentLogs.map(async (log) => {
            const block = await provider.getBlock(log.blockNumber);
            let method = 'Contract Interaction';
            let amount = "Checking...";
            const abiCoder = ethers.AbiCoder.defaultAbiCoder();

            try {
                if (log.topics[0] === ethers.id("BetPlaced(address,uint256,uint256,uint256,bool)")) {
                    method = 'PlaceBet';
                    const decoded = abiCoder.decode(['uint256', 'uint256', 'bool'], log.data);
                    amount = ethers.formatUnits(decoded[0], 18);
                } else if (log.topics[0] === ethers.id("Transfer(address,address,uint256)")) {
                    method = 'Transfer';
                    const decoded = abiCoder.decode(['uint256'], log.data);
                    amount = ethers.formatUnits(decoded[0], 18);
                } else if (log.topics[0] === ethers.id("WinClaimed(address,uint256,uint256)")) {
                    method = 'WinClaimed';
                    const decoded = abiCoder.decode(['uint256', 'uint256'], log.data);
                    amount = ethers.formatUnits(decoded[0], 18);
                }
            } catch (parseError) {
                console.warn('Failed to parse log data:', parseError.message);
            }

            let from = '';
            let to = '';
            try {
                const txDetails = await provider.getTransaction(log.transactionHash);
                if (txDetails) {
                    from = txDetails.from;
                    to = txDetails.to;
                }
            } catch (err) { }

            return {
                hash: log.transactionHash,
                method,
                status: 'Confirmed',
                amount: amount === "Checking..." ? "-" : parseFloat(amount).toFixed(2),
                symbol: 'USDT',
                time: block ? timeAgo(block.timestamp) : 'Recent',
                from,
                to
            };
        }));

        return res.json({
            status: 'success',
            source: 'rpc',
            pagination: {
                page: 1,
                offset: transactions.length,
                hasMore: false
            },
            data: transactions
        });
    } catch (error) {
        console.error('Contract Transaction Fetch Error:', error);
        res.status(500).json({
            status: 'error',
            message: error?.message || 'Failed to fetch contract transactions'
        });
    }
});

// ============================================
// DATABASE & SYSTEM TOOLS
// ============================================

/**
 * GET /admin/db/stats
 * Get collection counts and DB size
 */
router.get('/db/stats', auth, requireAdmin, async (req, res) => {
    try {
        const stats = {
            users: await mongoose.connection.db.collection('users').countDocuments(),
            games: await mongoose.connection.db.collection('games').countDocuments(),
            jackpots: await mongoose.connection.db.collection('jackpotrounds').countDocuments(),
            audits: await mongoose.connection.db.collection('auditlogs').countDocuments(),
            dbSize: (await mongoose.connection.db.command({ dbStats: 1 })).dataSize,
            collections: (await mongoose.connection.db.listCollections().toArray()).length
        };

        res.json({
            status: 'success',
            data: stats
        });
    } catch (error) {
        logger.error('Admin DB stats error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch DB stats' });
    }
});

// ============================================
// POSTER MANAGEMENT
// ============================================

/**
 * POST /admin/posters
 * Create a new poster
 */
router.post('/posters', auth, requireAdmin, async (req, res) => {
    try {
        const { type, title, description, link, stats, isActive, imageUrl } = req.body || {};

        if (!type || !['promo', 'launch'].includes(type)) {
            return res.status(400).json({ status: 'error', message: 'Invalid poster type' });
        }
        if (!title || !description) {
            return res.status(400).json({ status: 'error', message: 'Title and description are required' });
        }

        const payload = {
            type,
            title,
            description,
            link: link || '/dashboard',
            isActive: typeof isActive === 'boolean' ? isActive : true,
            imageUrl: imageUrl || ''
        };

        if (Array.isArray(stats)) {
            payload.stats = stats
                .filter(s => s && (s.label || s.value))
                .map(s => ({ label: s.label || '', value: s.value || '' }));
        }

        const poster = await Poster.create(payload);

        res.json({
            status: 'success',
            data: poster
        });
    } catch (error) {
        logger.error('Admin poster create error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create poster' });
    }
});

/**
 * GET /admin/posters
 * List all posters
 */
router.get('/posters', auth, requireAdmin, async (req, res) => {
    try {
        let posters = await Poster.find().sort({ type: 1 });

        // Seed default posters if none exist
        if (posters.length === 0) {
            posters = await Poster.create([
                {
                    type: 'promo',
                    title: 'Become The Protocol Owner',
                    description: 'Unlock governance rights, revenue sharing, and elite tier withdrawal limits.',
                    link: '/dashboard',
                    isActive: true
                },
                {
                    type: 'launch',
                    title: 'Lucky Draw Jackpot',
                    description: 'Enter the next draw and secure a share of the protocol prize pool.',
                    link: '/dashboard/lucky-draw',
                    stats: [
                        { label: 'Prize Pool', value: '$25,000' },
                        { label: 'Tickets', value: 'Unlimited' },
                        { label: 'Draw', value: 'Daily' }
                    ],
                    isActive: true
                }
            ]);
        }

        res.json({
            status: 'success',
            data: posters
        });
    } catch (error) {
        logger.error('Admin posters list error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch posters' });
    }
});

/**
 * PUT /admin/posters/:id
 * Update poster
 */
router.put('/posters/:id', auth, requireAdmin, async (req, res) => {
    try {
        const poster = await Poster.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!poster) {
            return res.status(404).json({ status: 'error', message: 'Poster not found' });
        }
        res.json({
            status: 'success',
            data: poster
        });
    } catch (error) {
        logger.error('Admin poster update error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update poster' });
    }
});

// ============================================
// ENHANCED USER MANAGEMENT
// ============================================

/**
 * PATCH /admin/users/:id/freeze
 * Freeze a user account (read-only mode, different from ban)
 */
router.patch('/users/:id/freeze', auth, requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const targetUser = await User.findById(req.params.id);
        if (!targetUser) return res.status(404).json({ status: 'error', message: 'User not found' });
        if (['admin', 'superadmin'].includes(targetUser.role) && req.user.role !== 'superadmin') {
            return res.status(403).json({ status: 'error', message: 'Only superadmins can freeze admin accounts' });
        }
        targetUser.isFrozen = true;
        targetUser.freezeReason = reason || 'Frozen pending investigation';
        targetUser.frozenAt = new Date();
        targetUser.frozenBy = req.user._id;
        await targetUser.save();
        if (ioInstance) {
            ioInstance.emit('admin:user_updated', toAdminRealtimeUser(targetUser));
        }
        logger.warn(`User frozen: ${targetUser.walletAddress} by ${req.user.walletAddress}`);
        res.json({ status: 'success', message: 'Account frozen successfully', data: { user: targetUser } });
    } catch (error) {
        logger.error('Freeze user error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to freeze user' });
    }
});

/**
 * PATCH /admin/users/:id/unfreeze
 * Unfreeze a user account
 */
router.patch('/users/:id/unfreeze', auth, requireAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
        user.isFrozen = false;
        user.freezeReason = null;
        user.frozenAt = null;
        user.frozenBy = null;
        await user.save();
        if (ioInstance) {
            ioInstance.emit('admin:user_updated', toAdminRealtimeUser(user));
        }
        res.json({ status: 'success', message: 'Account unfrozen successfully', data: { user } });
    } catch (error) {
        logger.error('Unfreeze user error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to unfreeze user' });
    }
});

/**
 * GET /admin/users/search
 * Enhanced user search by wallet, ID, referral code, email
 */
router.get('/users/search', auth, requireAdmin, async (req, res) => {
    try {
        const { q, tier, status, page = 1, limit = 50 } = req.query;
        const query = {};

        if (q) {
            query.$or = [
                { walletAddress: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { referralCode: { $regex: q, $options: 'i' } },
                { referredBy: { $regex: q, $options: 'i' } }
            ];
            // Try ObjectId match
            if (mongoose.Types.ObjectId.isValid(q)) {
                query.$or.push({ _id: new mongoose.Types.ObjectId(q) });
            }
        }

        if (tier && tier !== 'all') query['activation.tier'] = tier;
        if (status === 'banned') query.isBanned = true;
        else if (status === 'frozen') query.isFrozen = true;
        else if (status === 'active') { query.isBanned = false; query.isFrozen = { $ne: true }; }

        const users = await User.find(query)
            .select('walletAddress email role isBanned isFrozen isActive activation referralCode referredBy realBalances createdAt lastLoginAt')
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);
        res.json({ status: 'success', data: { users, total, totalPages: Math.ceil(total / limit), currentPage: parseInt(page) } });
    } catch (error) {
        logger.error('User search error:', error);
        res.status(500).json({ status: 'error', message: 'Search failed' });
    }
});

/**
 * GET /admin/users/duplicates
 * Detect potential duplicate accounts (one-account policy enforcement)
 */
router.get('/users/duplicates', auth, requireAdmin, async (req, res) => {
    try {
        // Find users who share the same referredBy code and were created within 24h (suspicious)
        const suspiciousGroups = await User.aggregate([
            { $match: { referredBy: { $exists: true, $ne: null } } },
            { $group: { _id: '$referredBy', count: { $sum: 1 }, users: { $push: { id: '$_id', wallet: '$walletAddress', createdAt: '$createdAt' } } } },
            { $match: { count: { $gt: 5 } } }, // Flag referrers with >5 direct referrals in short time
            { $sort: { count: -1 } },
            { $limit: 50 }
        ]);
        res.json({ status: 'success', data: { suspiciousGroups, total: suspiciousGroups.length } });
    } catch (error) {
        logger.error('Duplicate detection error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to detect duplicates' });
    }
});

// ============================================
// UNIFIED TRANSACTION MONITOR (READ-ONLY)
// ============================================

/**
 * GET /admin/transactions
 * Unified read-only view of all financial activity
 */
router.get('/transactions', auth, requireAdmin, async (req, res) => {
    try {
        const { type, page = 1, limit = 50, startDate, endDate, walletAddress, dateRange } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);

        // Support frontend dateRange filter: Today | 7d | 30d | All
        if (!startDate && dateRange && dateRange !== 'All') {
            const now = new Date();
            if (dateRange === 'Today') {
                const todayStart = new Date(now);
                todayStart.setHours(0, 0, 0, 0);
                dateFilter.$gte = todayStart;
            } else if (dateRange === '7d') {
                dateFilter.$gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (dateRange === '30d') {
                dateFilter.$gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
        }

        const hasDateFilter = Object.keys(dateFilter).length > 0;
        const transactions = [];

        // ---- 1) DEPOSITS ----
        // Try deposits[] subdocuments first, then fall back to activation data
        if (!type || type === 'deposit') {
            const userQuery = {};
            if (walletAddress) userQuery.walletAddress = { $regex: walletAddress, $options: 'i' };

            // First try: deposits[] subdocument array
            const usersWithSubDeps = await User.find({ ...userQuery, 'deposits.0': { $exists: true } })
                .select('walletAddress email deposits')
                .lean();

            if (usersWithSubDeps.length > 0) {
                for (const user of usersWithSubDeps) {
                    for (const dep of (user.deposits || [])) {
                        const depDate = new Date(dep.createdAt || dep.timestamp || 0);
                        if (hasDateFilter && dateFilter.$gte && depDate < dateFilter.$gte) continue;
                        if (hasDateFilter && dateFilter.$lte && depDate > dateFilter.$lte) continue;
                        transactions.push({
                            id: String(dep._id || dep.txHash || Math.random().toString(36)),
                            type: 'deposit',
                            walletAddress: user.walletAddress || user.email || '',
                            amount: dep.amount || 0,
                            txHash: dep.txHash || null,
                            status: 'confirmed',
                            timestamp: depDate,
                            note: ''
                        });
                    }
                }
            } else {
                // Fallback logic for activation deposits removed to show only real-time deposits.
            }
        }

        // ---- 2) REFERRAL & CASHBACK COMMISSIONS ----
        if (!type || type === 'referral' || type === 'cashback') {
            try {
                const Commission = require('../models/Commission');
                const commQuery = hasDateFilter ? { createdAt: dateFilter } : {};
                const commissions = await Commission.find(commQuery)
                    .populate('user', 'walletAddress email')
                    .populate('fromUser', 'walletAddress email')
                    .sort({ createdAt: -1 })
                    .limit(500)
                    .lean();

                // Resolve any unresolved user references
                const unresolvedIds = new Set();
                for (const c of commissions) {
                    if (c.user && !c.user.walletAddress && typeof c.user !== 'string') {
                        const id = c.user._id ? c.user._id.toString() : (typeof c.user === 'object' ? '' : String(c.user));
                        if (id) unresolvedIds.add(id);
                    }
                    if (c.fromUser && !c.fromUser.walletAddress && typeof c.fromUser !== 'string') {
                        const id = c.fromUser._id ? c.fromUser._id.toString() : '';
                        if (id) unresolvedIds.add(id);
                    }
                }
                const walletMap = new Map();
                if (unresolvedIds.size > 0) {
                    const resolved = await User.find({ _id: { $in: Array.from(unresolvedIds) } })
                        .select('walletAddress email').lean();
                    for (const u of resolved) walletMap.set(u._id.toString(), u.walletAddress || u.email || '');
                }

                for (const c of commissions) {
                    // Determine type: cashback vs referral
                    const commType = (c.type || '').toLowerCase();
                    const isCashback = commType.includes('cashback') || commType.includes('roi');
                    const txType = isCashback ? 'cashback' : 'referral';

                    // Skip if filtering by specific type and this doesn't match
                    if (type && type !== txType) continue;

                    const recipientWallet = c.user?.walletAddress || c.user?.email ||
                        c.recipientWallet ||
                        (c.user?._id ? walletMap.get(c.user._id.toString()) : '') || 'Unknown';
                    const sourceWallet = c.fromUser?.walletAddress || c.fromUser?.email ||
                        c.sourceWallet ||
                        (c.fromUser?._id ? walletMap.get(c.fromUser._id.toString()) : '') || 'Unknown';

                    if (recipientWallet === 'Unknown') continue;

                    transactions.push({
                        id: String(c._id),
                        type: txType,
                        walletAddress: recipientWallet,
                        amount: c.amount || 0,
                        txHash: null,
                        status: c.status === 'failed' ? 'failed' : 'confirmed',
                        timestamp: new Date(c.createdAt),
                        note: sourceWallet !== 'Unknown'
                            ? `${c.type || 'commission'} L${c.level || 0} from ${sourceWallet}`
                            : (c.type || 'commission')
                    });
                }
            } catch (e) { /* Commission model may not exist */ }
        }

        // ---- 3) LUCKY DRAW WINNERS ----
        if (!type || type === 'lucky_draw') {
            try {
                const JackpotRound = require('../models/JackpotRound');
                const jkQuery = { status: 'completed', winner: { $exists: true } };
                if (hasDateFilter) jkQuery.completedAt = dateFilter;
                const rounds = await JackpotRound.find(jkQuery)
                    .populate('winner', 'walletAddress email').limit(100).lean();

                for (const r of rounds) {
                    if (!r.winner) continue;
                    transactions.push({
                        id: String(r._id),
                        type: 'lucky_draw',
                        walletAddress: r.winner?.walletAddress || r.winner?.email || 'Unknown',
                        amount: r.prizeAmount || r.jackpotAmount || 0,
                        txHash: r.txHash || null,
                        status: 'confirmed',
                        timestamp: new Date(r.completedAt || r.updatedAt || 0),
                        note: `Lucky Draw Round #${r.roundNumber || r._id}`
                    });
                }
            } catch (e) { /* JackpotRound model may not exist */ }
        }

        // ---- 4) WITHDRAWALS (from AuditLog if available) ----
        if (!type || type === 'withdrawal') {
            try {
                const AuditLog = require('../models/AuditLog');
                const auditQuery = { eventType: 'withdrawal' };
                if (hasDateFilter) auditQuery.createdAt = dateFilter;
                const withdrawals = await AuditLog.find(auditQuery)
                    .populate('userId', 'walletAddress email')
                    .sort({ createdAt: -1 }).limit(200).lean();

                for (const w of withdrawals) {
                    transactions.push({
                        id: String(w._id),
                        type: 'withdrawal',
                        walletAddress: w.userId?.walletAddress || w.userId?.email || w.walletAddress || '',
                        amount: w.details?.amount || w.betAmount || 0,
                        txHash: w.details?.txHash || null,
                        status: 'confirmed',
                        timestamp: new Date(w.createdAt),
                        note: w.action || 'withdrawal'
                    });
                }
            } catch (e) { /* AuditLog may not have withdrawal entries */ }
        }

        // Apply wallet filter across all transactions
        let filteredTransactions = transactions;
        if (walletAddress) {
            const wq = walletAddress.toLowerCase();
            filteredTransactions = transactions.filter(tx =>
                (tx.walletAddress || '').toLowerCase().includes(wq)
            );
        }

        // Sort by timestamp descending
        filteredTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Aggregate summary for dashboard cards
        const summary = { deposits: 0, withdrawals: 0, referrals: 0, cashbacks: 0, total: 0 };
        for (const tx of filteredTransactions) {
            const amount = Number(tx.amount || 0);
            if (tx.type === 'deposit') summary.deposits += amount;
            if (tx.type === 'withdrawal') summary.withdrawals += amount;
            if (tx.type === 'referral') summary.referrals += amount;
            if (tx.type === 'cashback') summary.cashbacks += amount;
            if (tx.type === 'lucky_draw') summary.total += amount;
            summary.total += amount;
        }
        // Fix double-counting: total already accumulates lucky_draw separately
        summary.total = summary.deposits + summary.withdrawals + summary.referrals + summary.cashbacks +
            filteredTransactions.filter(t => t.type === 'lucky_draw').reduce((s, t) => s + (t.amount || 0), 0);

        // Paginate
        const total = filteredTransactions.length;
        const start = (parseInt(page) - 1) * parseInt(limit);
        const paginated = filteredTransactions.slice(start, start + parseInt(limit));

        res.json({
            status: 'success',
            data: {
                transactions: paginated,
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
                currentPage: parseInt(page),
                summary,
                readOnly: true
            }
        });
    } catch (error) {
        logger.error('Transaction monitor error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch transactions' });
    }
})

// ============================================
// SYSTEM CONFIGURATION
// ============================================



// ============================================
// EMERGENCY CONTROLS
// ============================================

const system = require('../config/system');

/**
 * POST /admin/emergency/:action
 * Toggle emergency flags (superadmin only)
 */
router.post('/emergency/:action', auth, requireAdmin, async (req, res) => {
    try {
        const { action } = req.params;
        const { enabled } = req.body;

        const validActions = {
            'pause-registrations': 'pauseRegistrations',
            'pause-deposits': 'pauseDeposits',
            'pause-withdrawals': 'pauseWithdrawals',
            'pause-lucky-draw': 'pauseLuckyDraw',
            'maintenance-mode': 'maintenanceMode'
        };

        if (!validActions[action]) {
            return res.status(400).json({ status: 'error', message: 'Invalid emergency action' });
        }

        const flagKey = validActions[action];
        const updates = { [flagKey]: Boolean(enabled) };

        await system.update(updates, req.user);

        // Real-time frontend updates for all emergency controls (handled by system.update)
        // Specific logic for lucky draw pause - Force emission of status update
        if (flagKey === 'pauseLuckyDraw' && jackpotService) {
            const round = await jackpotService.getActiveRound();
            jackpotService.emitStatusUpdate(round);
        }

        res.json({
            status: 'success',
            data: system.get()
        });
    } catch (error) {
        logger.error('Emergency toggle error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update emergency flag' });
    }
});

/**
 * GET /admin/emergency/status
 * Get current emergency status
 */
router.get('/emergency/status', auth, requireAdmin, async (req, res) => {
    try {
        const config = system.get();
        // Fetch audit log from DB if needed, or returning simplified status
        // For now returning the config state which matches frontend expectation
        res.json({
            status: 'success',
            data: config
        });
    } catch (error) {
        logger.error('Emergency status error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch status' });
    }
});


// ============================================
// PRACTICE SYSTEM STATS
// ============================================

/**
 * GET /admin/practice/stats
 * Get practice system statistics
 */
router.get('/practice/stats', auth, requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        const expiryDays = systemConfig.practiceExpiryDays || 30;
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        const practiceBaseQuery = { role: 'player', practiceBalance: { $gt: 0 } };
        const activePracticeQuery = { ...practiceBaseQuery, practiceExpiry: { $gt: now } };
        const convertedQuery = { ...practiceBaseQuery, 'activation.tier': { $in: ['tier1', 'tier2'] } };
        // FIX: Count ALL new users, not just those with practice balance
        const newTodayQuery = { role: 'player', createdAt: { $gte: todayStart } };
        const newYesterdayQuery = { role: 'player', createdAt: { $gte: yesterdayStart, $lt: todayStart } };

        const totalPractice = await User.countDocuments(practiceBaseQuery);
        const activePractice = await User.countDocuments(activePracticeQuery);
        const convertedToReal = await User.countDocuments(convertedQuery);
        const newToday = await User.countDocuments(newTodayQuery);
        const newYesterday = await User.countDocuments(newYesterdayQuery);
        const totalUsers = await User.countDocuments();

        res.json({
            status: 'success',
            data: {
                totalPracticeUsers: totalPractice,
                activePracticeUsers: activePractice,
                expiredPracticeUsers: totalPractice - activePractice,
                convertedToReal,
                conversionRate: totalPractice > 0 ? ((convertedToReal / totalPractice) * 100).toFixed(1) : 0,
                maxPracticeUsers: systemConfig.maxPracticeUsers,
                practiceBonus: systemConfig.practiceBonus,
                practiceExpiryDays: expiryDays,
                capacityUsed: totalPractice > 0 ? ((totalPractice / systemConfig.maxPracticeUsers) * 100).toFixed(1) : 0,
                totalUsers,
                newToday,
                newYesterday
            }
        });
    } catch (error) {
        logger.error('Practice stats error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch practice stats' });
    }
});

// ============================================
// ANALYTICS HISTORY (CHARTS)
// ============================================

/**
 * GET /admin/analytics/history
 * Get historical data for charts (last 7 days by default)
 */
router.get('/analytics/history', auth, requireAdmin, async (req, res) => {
    try {
        const requestedDays = parseInt(req.query.days, 10) || 7;
        const days = Math.min(Math.max(requestedDays, 1), 90);

        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(startDate.getDate() - (days - 1));

        const [userGrowth, gameVolume] = await Promise.all([
            User.aggregate([
                { $match: { role: 'player', createdAt: { $gte: startDate, $lte: endDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        users: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            Game.aggregate([
                { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        wagered: { $sum: "$betAmount" },
                        payout: {
                            $sum: {
                                $cond: [{ $eq: ["$isWin", true] }, "$payout", 0]
                            }
                        }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        const usersByDate = new Map(userGrowth.map(entry => [entry._id, entry.users]));
        const volumeByDate = new Map(gameVolume.map(entry => [entry._id, entry]));

        const chartData = [];
        for (let i = 0; i < days; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            const dateStr = currentDay.toISOString().split('T')[0];
            const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'short' });
            const volumeEntry = volumeByDate.get(dateStr);
            chartData.push({
                name: dayName,
                date: dateStr,
                users: usersByDate.get(dateStr) || 0,
                wagered: Number(volumeEntry?.wagered || 0),
                payout: Number(volumeEntry?.payout || 0)
            });
        }

        res.json({
            status: 'success',
            data: chartData
        });
    } catch (error) {
        logger.error('Analytics history error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch analytics history' });
    }
});

// ============================================
// CLUB INCOME & RANK MONITORING
// ============================================

/**
 * GET /admin/club/overview
 * Club income and rank monitoring dashboard
 */
router.get('/club/overview', auth, requireAdmin, async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        const playerMatch = { role: 'player' };
        const rankMatch = { ...playerMatch, clubRank: { $exists: true, $ne: null } };

        // Rank distribution (real player data)
        const rawRankDistribution = await User.aggregate([
            { $match: rankMatch },
            { $project: { normalizedRank: { $ifNull: ['$clubRank', 'Rank 0'] } } },
            { $group: { _id: '$normalizedRank', count: { $sum: 1 } } }
        ]);

        const rankOrder = (rank) => {
            const match = /Rank\s*(\d+)/i.exec(rank || '');
            return match ? Number(match[1]) : 999;
        };
        const rankDistribution = rawRankDistribution.sort((a, b) => rankOrder(a._id) - rankOrder(b._id));

        const [
            usersWithClubIncome,
            clubIncomeAgg,
            recentRankUpgradeRows,
            tier1Users,
            tier2Users,
            topEarnersRows,
            newToday,
            newYesterday
        ] = await Promise.all([
            User.countDocuments({ ...playerMatch, 'realBalances.club': { $gt: 0 } }),
            User.aggregate([
                { $match: playerMatch },
                { $group: { _id: null, total: { $sum: '$realBalances.club' } } }
            ]),
            User.find({ ...playerMatch, clubRank: { $ne: 'Rank 0', $exists: true } })
                .select('walletAddress email clubRank createdAt updatedAt')
                .sort({ updatedAt: -1 })
                .limit(20)
                .lean(),
            User.countDocuments({ ...playerMatch, 'activation.tier': 'tier1' }),
            User.countDocuments({ ...playerMatch, 'activation.tier': 'tier2' }),
            User.find({ ...playerMatch, 'realBalances.club': { $gt: 0 } })
                .select('walletAddress email clubRank realBalances')
                .sort({ 'realBalances.club': -1, updatedAt: -1 })
                .limit(10)
                .lean(),
            User.countDocuments({ ...playerMatch, createdAt: { $gte: todayStart } }),
            User.countDocuments({ ...playerMatch, createdAt: { $gte: yesterdayStart, $lt: todayStart } })
        ]);

        const totalClubIncome = clubIncomeAgg[0]?.total || 0;

        const resolveWalletLabel = (row) =>
            row.walletAddress || row.email || `user-${String(row._id).slice(-6)}`;

        const recentRankUpgrades = recentRankUpgradeRows.map((row) => ({
            walletAddress: resolveWalletLabel(row),
            clubRank: row.clubRank || 'Rank 0',
            createdAt: row.updatedAt || row.createdAt || now.toISOString()
        }));

        const topEarners = topEarnersRows.map((row) => ({
            walletAddress: resolveWalletLabel(row),
            clubIncome: Number(row.realBalances?.club || 0),
            clubRank: row.clubRank || 'Rank 0'
        }));

        res.json({
            status: 'success',
            data: {
                rankDistribution,
                usersWithClubIncome,
                totalClubIncome,
                recentRankUpgrades,
                tier1Users,
                tier2Users,
                topEarners,
                newToday,
                newYesterday,
                clubPoolPercent: 8, // 8% of turnover goes to club pool
                note: 'Admin role: Observer + Auditor only. Rank upgrades are automatic.'
            }
        });
    } catch (error) {
        logger.error('Club overview error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch club overview' });
    }
});

// ============================================
// ENHANCED ANALYTICS & EXPORT
// ============================================

/**
 * GET /admin/analytics/comprehensive
 * Comprehensive analytics with DAU, deposits, withdrawals, cashback, referral growth
 */
router.get('/analytics/comprehensive', auth, requireAdmin, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        const [
            totalUsers,
            newUsers,
            tier1Users,
            tier2Users,
            bannedUsers,
            frozenUsers,
            totalDeposited,
            totalClubIncome,
            totalDirectLevel,
            totalCashback
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: daysAgo } }),
            User.countDocuments({ 'activation.tier': 'tier1' }),
            User.countDocuments({ 'activation.tier': 'tier2' }),
            User.countDocuments({ isBanned: true }),
            User.countDocuments({ isFrozen: true }),
            User.aggregate([{ $group: { _id: null, total: { $sum: '$activation.totalDeposited' } } }]),
            User.aggregate([{ $group: { _id: null, total: { $sum: '$realBalances.club' } } }]),
            User.aggregate([{ $group: { _id: null, total: { $sum: '$realBalances.directLevel' } } }]),
            User.aggregate([{ $group: { _id: null, total: { $sum: '$realBalances.cashback' } } }])
        ]);

        // User growth by day
        const userGrowth = await User.aggregate([
            { $match: { createdAt: { $gte: daysAgo } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            status: 'success',
            data: {
                overview: {
                    totalUsers,
                    newUsers,
                    tier1Users,
                    tier2Users,
                    bannedUsers,
                    frozenUsers: frozenUsers || 0,
                    totalDeposited: totalDeposited[0]?.total || 0,
                    totalClubIncome: totalClubIncome[0]?.total || 0,
                    totalDirectLevel: totalDirectLevel[0]?.total || 0,
                    totalCashback: totalCashback[0]?.total || 0,
                    sustainabilityScore: tier2Users > 0 ? Math.min(100, (tier2Users / Math.max(1, totalUsers)) * 1000).toFixed(1) : 0
                },
                userGrowth,
                period: `${days} days`
            }
        });
    } catch (error) {
        logger.error('Comprehensive analytics error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch analytics' });
    }
});

/**
 * GET /admin/analytics/export
 * Export analytics data as CSV
 */
router.get('/analytics/export', auth, requireAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select('walletAddress email role activation realBalances clubRank createdAt isBanned isFrozen lastLoginAt')
            .lean();

        const csvRows = [
            ['Wallet Address', 'Email', 'Role', 'Tier', 'Total Deposited', 'Club Rank', 'Direct Level Balance', 'Game Balance', 'Cash Balance', 'Banned', 'Frozen', 'Joined', 'Last Login'].join(',')
        ];

        for (const u of users) {
            csvRows.push([
                u.walletAddress || '',
                u.email || '',
                u.role || 'player',
                u.activation?.tier || 'none',
                u.activation?.totalDeposited || 0,
                u.clubRank || 'Rank 0',
                u.realBalances?.directLevel || 0,
                u.realBalances?.game || 0,
                u.realBalances?.cash || 0,
                u.isBanned ? 'Yes' : 'No',
                u.isFrozen ? 'Yes' : 'No',
                u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '',
                u.lastLoginAt ? new Date(u.lastLoginAt).toISOString().split('T')[0] : ''
            ].join(','));
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="trk-users-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvRows.join('\n'));
    } catch (error) {
        logger.error('Export error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to export data' });
    }
});

// ============================================
// SUB-ADMIN MANAGEMENT
// ============================================

/**
 * GET /admin/sub-admins
 * List all admin and sub-admin users
 */
router.get('/sub-admins', auth, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } })
            .select('walletAddress email role adminPermissions createdAt lastLoginAt isActive')
            .sort({ createdAt: -1 });
        res.json({ status: 'success', data: { admins, total: admins.length } });
    } catch (error) {
        logger.error('Sub-admin list error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch admins' });
    }
});

/**
 * PATCH /admin/sub-admins/:id/permissions
 * Update sub-admin permissions (superadmin only)
 */
router.patch('/sub-admins/:id/permissions', auth, requireSuperAdmin, async (req, res) => {
    try {
        const { permissions } = req.body;
        const validPerms = ['view_users', 'manage_users', 'view_finance', 'manage_config', 'view_transactions', 'manage_jackpot', 'view_analytics'];

        if (!Array.isArray(permissions) || !permissions.every(p => validPerms.includes(p))) {
            return res.status(400).json({ status: 'error', message: 'Invalid permissions', validPerms });
        }

        const user = await User.findByIdAndUpdate(req.params.id, { adminPermissions: permissions }, { new: true });
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

        logger.warn(`Permissions updated for ${user.walletAddress} by ${req.user.walletAddress}: ${permissions.join(', ')}`);
        res.json({ status: 'success', message: 'Permissions updated', data: { user } });
    } catch (error) {
        logger.error('Permission update error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update permissions' });
    }
});

/**
 * DELETE /admin/sub-admins/:id
 * Remove sub-admin (demote to player)
 */
router.delete('/sub-admins/:id', auth, requireSuperAdmin, async (req, res) => {
    try {
        const user = await mongoose.model('User').findByIdAndUpdate(
            req.params.id,
            { role: 'player', adminPermissions: [] },
            { new: true }
        );

        if (!user) return res.status(404).json({ status: 'error', message: 'Admin not found' });

        logger.warn(`Sub-admin ${user.walletAddress} REMOVED by ${req.user.walletAddress}`);

        if (ioInstance) {
            ioInstance.emit('admin:admin_removed', { id: user._id, walletAddress: user.walletAddress });
            ioInstance.emit('admin:action', {
                action: 'ADMIN_REMOVAL',
                message: `Admin ${user.walletAddress.slice(0, 8)}... demoted to player`
            });
        }

        res.json({ status: 'success', message: 'Admin demoted to player' });
    } catch (error) {
        logger.error('Admin removal error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to remove admin' });
    }
});

// ============================================
// LEGAL CONTENT MANAGEMENT
// ============================================

const EMPTY_LEGAL_SECTION = Object.freeze({
    content: '',
    version: 0,
    lastUpdated: null,
    updatedBy: null
});

const buildLegalPayload = (documents = []) => {
    const docMap = new Map();
    for (const doc of documents) {
        docMap.set(doc.type, doc);
    }

    const payload = {};
    for (const type of LEGAL_TYPES) {
        const doc = docMap.get(type);
        payload[type] = doc
            ? {
                content: doc.content || '',
                version: doc.version || 0,
                lastUpdated: doc.lastUpdated || doc.updatedAt || null,
                updatedBy: doc.updatedBy || null
            }
            : { ...EMPTY_LEGAL_SECTION };
    }
    return payload;
};

/**
 * GET /admin/legal
 * List all legal content sections
 */
router.get('/legal', auth, requireAdmin, async (req, res) => {
    try {
        const documents = await LegalContent.find({ type: { $in: LEGAL_TYPES } }).lean();
        res.json({ status: 'success', data: buildLegalPayload(documents) });
    } catch (error) {
        logger.error('Legal content fetch error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch legal content' });
    }
});

/**
 * PUT /admin/legal/:type
 * Update legal content (superadmin only)
 */
router.put('/legal/:type', auth, requireAdmin, async (req, res) => {
    try {
        const { type } = req.params;
        const { content } = req.body;

        if (!LEGAL_TYPES.includes(type)) {
            return res.status(400).json({ status: 'error', message: 'Invalid content type', validTypes: LEGAL_TYPES });
        }
        if (typeof content !== 'string') {
            return res.status(400).json({ status: 'error', message: 'Content is required' });
        }

        const now = new Date();
        const existing = await LegalContent.findOne({ type }).select('version').lean();
        const nextVersion = (existing?.version || 0) + 1;

        const updatedDocument = await LegalContent.findOneAndUpdate(
            { type },
            {
                type,
                content,
                version: nextVersion,
                lastUpdated: now,
                updatedBy: req.user.walletAddress
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        const sectionPayload = {
            content: updatedDocument.content || '',
            version: updatedDocument.version || 0,
            lastUpdated: updatedDocument.lastUpdated || updatedDocument.updatedAt || now,
            updatedBy: updatedDocument.updatedBy || null
        };

        logger.warn(`Legal content "${type}" updated by ${req.user.walletAddress}`);
        if (ioInstance) {
            ioInstance.emit('admin:legal_updated', {
                type,
                section: sectionPayload
            });
        }
        res.json({ status: 'success', message: 'Legal content updated', data: sectionPayload });
    } catch (error) {
        logger.error('Legal content update error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update legal content' });
    }
});

module.exports = router;
