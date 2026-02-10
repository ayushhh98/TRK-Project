const express = require('express');
const User = require('../models/User');
const Game = require('../models/Game');
const auth = require('../middleware/auth');

const router = express.Router();

// Place a bet (practice or real)
router.post('/bet', auth, async (req, res) => {
    try {
        const { gameType, betAmount, pickedNumber, gameVariant = 'dice' } = req.body;

        // Validation
        if (!gameType || !['practice', 'real'].includes(gameType)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid game type. Must be "practice" or "real"'
            });
        }

        if (!betAmount || betAmount < 0.5) {
            return res.status(400).json({
                status: 'error',
                message: 'Minimum bet amount is 0.5 USDT'
            });
        }

        // RELAXED VALIDATION for pickedNumber depending on gameVariant
        if (gameVariant === 'dice') {
            if (!pickedNumber || pickedNumber < 1 || pickedNumber > 8) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Picked number must be between 1 and 8'
                });
            }
        } else if (pickedNumber === undefined || pickedNumber === null) {
            return res.status(400).json({
                status: 'error',
                message: 'Prediction data is required'
            });
        }

        const user = await User.findById(req.user.id);

        // Check balance
        if (gameType === 'practice') {
            if (user.practiceBalance < betAmount) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Insufficient practice balance'
                });
            }
        } else {
            console.log(`[REAL BET] User: ${user.walletAddress}, Amount: ${betAmount}, Variant: ${gameVariant}`);
            if (user.realBalances.game < betAmount) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Insufficient game balance'
                });
            }
        }

        // MULTI-GAME WIN LOGIC
        let isWin = false;
        let luckyNumber = 'Simulated';
        let multiplier = 2; // Default for other games

        if (gameVariant === 'dice') {
            luckyNumber = Math.floor(Math.random() * 8) + 1;
            isWin = pickedNumber === luckyNumber;
            multiplier = 8;
        } else if (gameVariant === 'spin') {
            // NeonSpin Simulation
            const outcomes = [0, 2, 0, 5, 0, 10, 0, 2];
            const idx = Math.floor(Math.random() * outcomes.length);
            const segmentNumber = idx + 1; // 1-8

            luckyNumber = segmentNumber;

            // Handle both single number selection and multiple segment selection (Probability Matrix)
            if (Array.isArray(pickedNumber)) {
                isWin = pickedNumber.includes(segmentNumber);
                multiplier = isWin ? outcomes[idx] : 0;
            } else if (typeof pickedNumber === 'number' && pickedNumber >= 1 && pickedNumber <= 8) {
                isWin = pickedNumber === segmentNumber;
                multiplier = outcomes[idx];
            } else {
                // Legacy "RANDOM" behavior
                multiplier = outcomes[idx];
                isWin = multiplier > 0;
            }
        } else if (gameVariant === 'crash') {
            const crashPoint = 1 + Math.random() * (Math.random() > 0.8 ? 8 : 3);
            const targetMultiplier = parseFloat(pickedNumber) || 2.0;

            isWin = crashPoint >= targetMultiplier;
            multiplier = isWin ? targetMultiplier : 0;
            luckyNumber = `${crashPoint.toFixed(2)}x`;
            luckyNumber = `${crashPoint.toFixed(2)}x`;
        } else if (gameVariant === 'matrix') {
            // PROBABILITY MATRIX LOGIC
            // pickedNumber = Risk Level (10-90)
            // Win Chance = (100 - Risk)%
            // Multiplier = 98 / (100 - Risk)

            const riskLevel = parseInt(pickedNumber);
            if (isNaN(riskLevel) || riskLevel < 1 || riskLevel > 95) {
                // Return immediate error if invalid
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid Matrix Sequence (Risk 1-95)'
                });
            }

            const winChance = 100 - riskLevel;
            const calculatedMultiplier = 98 / winChance;

            // Roll the dice (0-100)
            const roll = Math.random() * 100;
            isWin = roll < winChance;

            // If win, use calculated multiplier. If loss, 0.
            multiplier = isWin ? parseFloat(calculatedMultiplier.toFixed(2)) : 0;
            luckyNumber = `${roll.toFixed(2)}%`; // Show roll for transparency
        } else {
            // Generic Fallback
            isWin = Math.random() > 0.5;
            luckyNumber = 'Generic';
        }

        const payout = isWin ? betAmount * multiplier : 0;

        // Update balances
        if (gameType === 'practice') {
            user.practiceBalance -= betAmount;
            if (isWin) {
                user.practiceBalance += payout;
            }
        } else {
            user.realBalances.game -= betAmount;
            if (isWin) {
                user.realBalances.game += payout;
            } else {
                user.cashbackStats.totalNetLoss += betAmount;
            }
        }

        // Update stats
        user.gamesPlayed += 1;
        if (isWin) {
            user.gamesWon += 1;
            user.totalWinnings += (payout - betAmount);
        }

        await user.save();

        // Create game record
        const game = new Game({
            user: user._id,
            gameType,
            gameVariant,
            betAmount,
            pickedNumber,
            luckyNumber,
            isWin,
            payout,
            multiplier
        });

        await game.save();

        // Emit Real-Time Socket Event
        const io = req.app.get('io');
        if (io) {
            io.to(user._id.toString()).emit('game_result', {
                isWin,
                payout,
                luckyNumber,
                gameType,
                gameVariant,
                newBalance: gameType === 'practice' ? user.practiceBalance : user.realBalances.game
            });
            if (gameType === 'real' && isWin) {
                io.emit('global_win', {
                    player: user.walletAddress.slice(0, 6) + '...' + user.walletAddress.slice(-4),
                    amount: payout,
                    game: gameVariant.toUpperCase()
                });
            }
        }

        res.status(200).json({
            status: 'success',
            data: {
                game: {
                    id: game._id,
                    pickedNumber,
                    luckyNumber,
                    isWin,
                    payout,
                    multiplier,
                    gameVariant
                },
                newBalance: gameType === 'practice' ? user.practiceBalance : user.realBalances.game
            }
        });

    } catch (error) {
        console.error('Bet error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process bet'
        });
    }
});

// Get game history
router.get('/history', auth, async (req, res) => {
    try {
        const { gameType, limit = 20, page = 1 } = req.query;

        const query = { user: req.user.id };
        if (gameType) {
            query.gameType = gameType;
        }

        const games = await Game.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Game.countDocuments(query);

        res.status(200).json({
            status: 'success',
            data: {
                games,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get game history'
        });
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
            player: g.user?.walletAddress
                ? `${g.user.walletAddress.slice(0, 6)}...${g.user.walletAddress.slice(-4)}`
                : 'Anonymous',
            betAmount: g.betAmount,
            isWin: g.isWin,
            payout: g.payout,
            createdAt: g.createdAt
        }));

        res.status(200).json({
            status: 'success',
            data: { games: sanitizedGames }
        });

    } catch (error) {
        console.error('Get live games error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get live games'
        });
    }
});

module.exports = router;
