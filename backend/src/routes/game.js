const express = require('express');
const User = require('../models/User');
const Game = require('../models/Game');
const GuessRound = require('../models/GuessRound');
const auth = require('../middleware/auth');
const PracticeService = require('../services/practiceService');
const { isPaused } = require('../utils/emergency');

const emitAdminGameActivity = (req, game, user) => {
    const io = req.app.get('io');
    if (!io) return;

    const payload = {
        _id: game._id,
        user: {
            walletAddress: user.walletAddress,
            email: user.email
        },
        gameType: game.gameType,
        gameVariant: game.gameVariant,
        betAmount: game.betAmount,
        payout: game.payout,
        isWin: game.isWin,
        luckyNumber: game.luckyNumber,
        pickedNumber: game.pickedNumber,
        multiplier: game.multiplier,
        status: game.status,
        roundNumber: game.roundNumber,
        timestamp: game.createdAt || new Date()
    };

    io.emit('admin:game_activity', payload);
};

const router = express.Router();

/**
 * POST /api/game/bet
 * Handles both practice and real bets.
 * 'guess' variant is round-based (1 minute).
 * Other variants are immediate.
 */
router.post('/bet', auth, async (req, res) => {
    try {
        const { gameType, betAmount, pickedNumber, gameVariant = 'dice' } = req.body;

        // 1. Validation
        if (!gameType || !['practice', 'real'].includes(gameType)) {
            return res.status(400).json({ status: 'error', message: 'Invalid game type. Must be "practice" or "real"' });
        }

        if (!betAmount || betAmount < 1.0) {
            return res.status(400).json({ status: 'error', message: 'Minimum bet amount is 1.0 USDT' });
        }

        if (gameVariant === 'dice') {
            if (!pickedNumber || pickedNumber < 1 || pickedNumber > 8) {
                return res.status(400).json({ status: 'error', message: 'Picked number must be between 1 and 8' });
            }
        } else if (pickedNumber === undefined || pickedNumber === null) {
            return res.status(400).json({ status: 'error', message: 'Prediction data is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

        // 2. Handle Practice Mode
        if (gameType === 'practice') {
            if (user.practiceBalance < betAmount) {
                return res.status(400).json({ status: 'error', message: 'Insufficient practice balance' });
            }

            // A. immediate Practice (All Variants including Guess)
            user.practiceBalance -= betAmount;
            let isWin = false;
            let luckyNumber = 0;
            let multiplier = 8;
            let roundNumber = null;

            if (gameVariant === 'guess') {
                const round = await GuessRound.getCurrentRound() || await GuessRound.startNewRound(3600);
                roundNumber = round.roundNumber;
                luckyNumber = Math.floor(Math.random() * 10);
                isWin = pickedNumber === luckyNumber;
                multiplier = 10;
            } else if (gameVariant === 'dice') {
                luckyNumber = Math.floor(Math.random() * 8) + 1;
                isWin = pickedNumber === luckyNumber;
            } else if (gameVariant === 'spin') {
                luckyNumber = Math.floor(Math.random() * 8) + 1;
                isWin = pickedNumber === luckyNumber;
            } else {
                luckyNumber = Math.floor(Math.random() * 10);
                isWin = pickedNumber === luckyNumber;
            }

            const payout = isWin ? betAmount * multiplier : 0;
            const game = new Game({
                user: user._id,
                gameType,
                gameVariant,
                betAmount,
                pickedNumber,
                luckyNumber,
                isWin,
                payout,
                multiplier,
                status: 'resolved',
                resolvedAt: new Date(),
                roundNumber
            });

            await game.save();
            user.gamesPlayed = (user.gamesPlayed || 0) + 1;
            if (isWin) user.gamesWon = (user.gamesWon || 0) + 1;
            await user.save();

            const io = req.app.get('io');
            if (io) {
                io.to(user._id.toString()).emit('game_result', {
                    isWin, payout, luckyNumber, gameType, gameVariant,
                    newBalance: user.practiceBalance
                });

                // Trigger real-time stats update for admin
                const practiceService = new PracticeService(io);
                await practiceService.broadcastStats();
            }
            emitAdminGameActivity(req, game, user);

            return res.status(200).json({
                status: 'success',
                data: {
                    game: { id: game._id, pickedNumber, luckyNumber, isWin, payout, multiplier, gameVariant, status: 'resolved' },
                    newBalance: user.practiceBalance
                }
            });
        }

        // 3. Handle Real Money Mode
        if (user.realBalances.game < betAmount) {
            return res.status(400).json({ status: 'error', message: 'Insufficient game balance' });
        }

        // Emergency Protocol Check
        if (await isPaused('gameEngine')) {
            return res.status(503).json({ status: 'error', code: 'EMERGENCY_PAUSE', message: 'Game Engine is currently suspended for safety protocols.' });
        }

        // A. Round-Based Real (Guess Variant)
        if (gameVariant === 'guess') {
            let round = await GuessRound.getCurrentRound();
            if (!round) {
                round = await GuessRound.startNewRound(3600);
            }

            user.realBalances.game -= betAmount;
            const game = new Game({
                user: user._id,
                gameType,
                gameVariant,
                betAmount,
                pickedNumber,
                multiplier: 10,
                status: 'pending',
                roundNumber: round.roundNumber
            });

            await game.save();
            await user.save();
            emitAdminGameActivity(req, game, user);

            return res.status(200).json({
                status: 'success',
                message: 'Bet placed for current round',
                data: {
                    game: {
                        id: game._id,
                        pickedNumber,
                        gameVariant,
                        status: 'pending',
                        roundNumber: round.roundNumber,
                        endTime: round.endTime
                    },
                    newBalance: user.realBalances.game
                }
            });
        }

        // B. Immediate Real (Other Variants)
        let isWin = false;
        let luckyNumber = null;
        let multiplier = 2;

        if (gameVariant === 'dice') {
            luckyNumber = Math.floor(Math.random() * 8) + 1;
            isWin = pickedNumber === luckyNumber;
            multiplier = 8;
        } else if (gameVariant === 'spin') {
            const outcomes = [0, 2, 0, 5, 0, 10, 0, 2];
            const idx = Math.floor(Math.random() * outcomes.length);
            luckyNumber = idx + 1;
            if (Array.isArray(pickedNumber)) {
                isWin = pickedNumber.includes(luckyNumber);
                multiplier = isWin ? outcomes[idx] : 0;
            } else {
                isWin = pickedNumber === luckyNumber;
                multiplier = outcomes[idx];
            }
        } else if (gameVariant === 'crash') {
            const crashPoint = 1 + Math.random() * (Math.random() > 0.8 ? 8 : 3);
            const targetMultiplier = parseFloat(pickedNumber) || 2.0;
            isWin = crashPoint >= targetMultiplier;
            multiplier = isWin ? targetMultiplier : 0;
            luckyNumber = `${crashPoint.toFixed(2)}x`;
        } else if (gameVariant === 'matrix') {
            const riskLevel = parseInt(pickedNumber);
            if (isNaN(riskLevel) || riskLevel < 1 || riskLevel > 95) {
                return res.status(400).json({ status: 'error', message: 'Invalid Matrix Sequence (Risk 1-95)' });
            }
            const winChance = 100 - riskLevel;
            const roll = Math.random() * 100;
            isWin = roll < winChance;
            multiplier = isWin ? parseFloat((98 / winChance).toFixed(2)) : 0;
            luckyNumber = `${roll.toFixed(2)}%`;
        } else {
            isWin = Math.random() > 0.5;
            luckyNumber = 'Generic';
            multiplier = 2;
        }

        const payout = isWin ? betAmount * multiplier : 0;

        // Update balances
        user.realBalances.game -= betAmount;
        if (isWin) {
            // Winners 8X Split: 2X to Winners Wallet, 6X to Game Wallet
            const directPayout = betAmount * 2;
            const compoundPayout = betAmount * 6;
            user.realBalances.winners += directPayout;
            user.realBalances.game += compoundPayout;
            user.totalRewardsWon += payout;
        }

        user.gamesPlayed = (user.gamesPlayed || 0) + 1;
        if (isWin) {
            user.gamesWon = (user.gamesWon || 0) + 1;
            user.totalWinnings = (user.totalWinnings || 0) + (payout - betAmount);
        }

        // Auto-Entry Lucky Draw Check
        if (user.settings?.autoLuckyDraw && user.realBalances.luckyDrawWallet >= 10) {
            try {
                const JackpotService = require('../services/jackpotService');
                const jackpotService = new JackpotService(req.app.get('io'));
                await jackpotService.purchaseTickets(user._id, 1);
            } catch (luckyError) {
                console.warn("Auto-Lucky Draw failed:", luckyError.message);
            }
        }

        await user.save();

        if (isWin) {
            const { distributeWinnerCommissions } = require('../utils/incomeDistributor');
            await distributeWinnerCommissions(user._id, payout).catch(e => console.error("Commission Error:", e));
        }

        const game = new Game({
            user: user._id,
            gameType,
            gameVariant,
            betAmount,
            pickedNumber,
            luckyNumber,
            isWin,
            payout,
            multiplier,
            status: 'resolved',
            resolvedAt: new Date()
        });
        await game.save();

        // Emit Socket Events
        const io = req.app.get('io');
        if (io) {
            io.to(user._id.toString()).emit('game_result', {
                isWin, payout, luckyNumber, gameType, gameVariant,
                newBalance: user.realBalances.game
            });

            if (isWin) {
                io.to(user._id.toString()).emit('balance_update', {
                    type: 'win',
                    amount: betAmount * 2,
                    newBalance: user.realBalances.winners
                });
                io.emit('global_win', {
                    player: user.walletAddress.slice(0, 6) + '...' + user.walletAddress.slice(-4),
                    amount: payout,
                    game: gameVariant.toUpperCase()
                });
            }
        }
        emitAdminGameActivity(req, game, user);

        return res.status(200).json({
            status: 'success',
            data: {
                game: { id: game._id, pickedNumber, luckyNumber, isWin, payout, multiplier, gameVariant, status: 'resolved' },
                newBalance: user.realBalances.game
            }
        });

    } catch (error) {
        console.error('Bet error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to process bet' });
    }
});

// Get game history
router.get('/history', auth, async (req, res) => {
    try {
        const { gameType, limit = 20, page = 1 } = req.query;
        const query = { user: req.user.id };
        if (gameType) query.gameType = gameType;

        const games = await Game.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Game.countDocuments(query);

        res.status(200).json({
            status: 'success',
            data: {
                games,
                pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
            }
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get game history' });
    }
});

// Get current game round info
router.get('/round', async (req, res) => {
    try {
        let round = await GuessRound.getCurrentRound();
        if (!round) {
            round = await GuessRound.startNewRound(3600);
        }
        res.status(200).json({
            status: 'success',
            data: {
                roundNumber: round.roundNumber,
                endTime: round.endTime,
                startTime: round.startTime,
                gameVariant: round.gameVariant
            }
        });
    } catch (error) {
        console.error('Get round error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get round info' });
    }
});

// Get recent resolved rounds (history)
router.get('/rounds/history', async (req, res) => {
    try {
        const rounds = await GuessRound.find({ status: 'resolved' })
            .sort({ roundNumber: -1 })
            .limit(10);
        res.status(200).json({
            status: 'success',
            data: { rounds }
        });
    } catch (error) {
        console.error('Get rounds history error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get rounds history' });
    }
});

// Get recent global games (for live feed)
router.get('/live', async (req, res) => {
    try {
        const games = await Game.find({ gameType: 'real' })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('user', 'walletAddress');

        const sanitizedGames = games.map(g => ({
            id: g._id,
            player: g.user?.walletAddress ? `${g.user.walletAddress.slice(0, 6)}...${g.user.walletAddress.slice(-4)}` : 'Anonymous',
            betAmount: g.betAmount,
            isWin: g.isWin,
            payout: g.payout,
            createdAt: g.createdAt
        }));

        res.status(200).json({ status: 'success', data: { games: sanitizedGames } });
    } catch (error) {
        console.error('Get live games error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get live games' });
    }
});

module.exports = router;
