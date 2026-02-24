const express = require('express');
const User = require('../models/User');
const Game = require('../models/Game');
const GameCommitment = require('../models/GameCommitment');
const GuessRound = require('../models/GuessRound');
const auth = require('../middleware/auth');
const { requireFreshAuth } = require('../middleware/freshAuth');
const { antiReplayCommit } = require('../middleware/antiReplay');
const { requireCaptchaIfSuspicious } = require('../middleware/botDetection');
const { requireFeature, featureFlags } = require('../config/featureFlags');
const AuditLogger = require('../utils/auditLogger');
const {
    generateServerSeed,
    hashSeed,
    generateClientSeed,
    generateResult,
    calculateOutcome,
    createBetDataHash
} = require('../utils/provablyFair');

const router = express.Router();

/**
 * PHASE 1: COMMIT BET
 * Client commits to a bet without revealing details
 * Server generates and hashes server seed
 * Middleware: auth → antiReplay → rate limit → bot detection
 */
router.post('/bet/commit', auth, antiReplayCommit, requireCaptchaIfSuspicious, async (req, res) => {
    try {
        const { betData, clientSeed, nonce, timestamp } = req.body;

        // Validate bet data structure
        if (!betData || !betData.gameType || !betData.gameVariant || !betData.betAmount || betData.pickedNumber === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid bet data structure',
                code: 'INVALID_BET_DATA'
            });
        }

        // Check feature flag for real money games
        if (betData.gameType === 'real' && !featureFlags.REAL_MONEY_GAMES_ENABLED) {
            return res.status(403).json({
                status: 'error',
                message: 'Real money games are currently disabled for security audit',
                code: 'REAL_MONEY_DISABLED'
            });
        }

        // Validate bet amount limits
        const maxBet = betData.gameType === 'real'
            ? featureFlags.MAX_BET_AMOUNT_REAL
            : featureFlags.MAX_BET_AMOUNT_PRACTICE;

        if (betData.betAmount < 1.0 || betData.betAmount > maxBet) {
            return res.status(400).json({
                status: 'error',
                message: `Bet amount must be between 1.0 and ${maxBet} USDT`,
                code: 'INVALID_BET_AMOUNT'
            });
        }

        // Validate variant-specific picked numbers
        if (!validatePickedNumber(betData.gameVariant, betData.pickedNumber)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid picked number for ${betData.gameVariant}`,
                code: 'INVALID_PICKED_NUMBER'
            });
        }

        const user = await User.findById(req.user.id);

        // Check balance (Sweepstakes Model)
        if (betData.gameType === 'practice') {
            if (user.practiceBalance < betData.betAmount) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Insufficient practice balance'
                });
            }
        } else {
            if (!user.realBalances) user.realBalances = { game: 0 };
            if ((user.realBalances.game || 0) < betData.betAmount) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Insufficient real balance. Please add funds.'
                });
            }
        }

        // Add roundNumber for 'guess' variant
        if (betData.gameVariant === 'guess') {
            let round = await GuessRound.getCurrentRound();
            if (!round) {
                round = await GuessRound.startNewRound(3600);
            }
            betData.roundNumber = round.roundNumber;
        }

        // Generate server seed and hash it
        const serverSeed = generateServerSeed();
        const serverSeedHash = hashSeed(serverSeed);

        // Use provided client seed or generate one
        const finalClientSeed = clientSeed || generateClientSeed();

        // Create bet data hash for tamper protection
        const betDataHash = createBetDataHash(betData);

        // Deduct balance to lock funds
        // In Sweepstakes model, we deduct GC immediately
        if (betData.gameType === 'practice') {
            user.practiceBalance -= betData.betAmount;
        } else {
            if (!user.realBalances) user.realBalances = { game: 0 };
            user.realBalances.game -= betData.betAmount;
        }

        await user.save();

        // Set expiration for the commitment (e.g., 5 minutes)
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const commitment = new GameCommitment({
            userId: user._id,
            gameId: betData.gameId || 'lucky-draw',
            serverSeedHash,
            betData: {
                ...betData,
                serverSeedHash
            },
            serverSeed, // Encrypted/Hashed in DB
            clientSeed: finalClientSeed,
            betDataHash,
            nonce,
            requestId: req.requestId,
            expiresAt,
            status: 'committed'
        });

        await commitment.save();

        res.status(200).json({
            status: 'success',
            data: {
                commitmentId: commitment._id,
                serverSeedHash,
                clientSeed: finalClientSeed,
                nonce,
                expiresAt
            }
        });

    } catch (error) {
        console.error('Bet commit error:', error);

        // Handle duplicate nonce error
        if (error.code === 11000 && error.keyPattern?.nonce) {
            return res.status(409).json({
                status: 'error',
                message: 'Nonce already used',
                code: 'DUPLICATE_NONCE'
            });
        }

        res.status(500).json({
            status: 'error',
            message: 'Failed to commit bet'
        });
    }
});

/**
 * PHASE 2: REVEAL BET
 * Client reveals bet, server calculates result using seeds
 */
router.post('/bet/reveal', auth, async (req, res) => {
    try {
        const { commitmentId } = req.body;

        if (!commitmentId) {
            return res.status(400).json({
                status: 'error',
                message: 'Commitment ID required'
            });
        }

        // Find commitment
        const commitment = await GameCommitment.findOne({
            _id: commitmentId,
            userId: req.user.id
        });

        if (!commitment) {
            return res.status(404).json({
                status: 'error',
                message: 'Commitment not found'
            });
        }

        // Check if already revealed
        if (commitment.status === 'revealed') {
            return res.status(400).json({
                status: 'error',
                message: 'Commitment already revealed',
                data: commitment.result
            });
        }

        // Check if expired
        if (commitment.status === 'expired' || new Date() > commitment.expiresAt) {
            commitment.status = 'expired';
            await commitment.save();

            // Refund bet amount
            const user = await User.findById(req.user.id);
            const isPractice = commitment.betData.gameType === 'practice';
            if (isPractice) {
                user.practiceBalance += commitment.betData.betAmount;
            } else {
                if (!user.realBalances) user.realBalances = { game: 0 };
                user.realBalances.game += commitment.betData.betAmount;
            }
            await user.save();

            return res.status(400).json({
                status: 'error',
                message: 'Commitment expired. Bet amount refunded.',
                code: 'COMMITMENT_EXPIRED'
            });
        }

        // Generate provably fair result
        const luckyNumber = generateResult(
            commitment.serverSeed,
            commitment.clientSeed,
            commitment.nonce,
            commitment.betData.gameVariant
        );

        // Calculate outcome
        const outcome = calculateOutcome(
            commitment.betData.gameVariant,
            commitment.betData.pickedNumber,
            luckyNumber,
            commitment.betData.betAmount
        );

        // Update user balance
        const user = await User.findById(req.user.id);

        if (commitment.betData.gameType === 'practice') {
            // Track practice volume (all bets count toward activation)
            user.activation.totalPracticeVolume = (user.activation.totalPracticeVolume || 0) + commitment.betData.betAmount;

            if (outcome.isWin) {
                user.practiceBalance += outcome.payout;
            }
        } else {
            if (!user.realBalances) user.realBalances = { game: 0, cash: 0 };
            if (!user.realBalances.cash) user.realBalances.cash = 0; // Ensure cash balance exists

            if (outcome.isWin) {
                // Winners 8X Income Logic: 2X (25%) Direct Cash, 6X (75%) Game/Compound
                const directPortion = outcome.payout * 0.25;
                const compoundPortion = outcome.payout * 0.75;

                user.realBalances.cash += directPortion;
                user.realBalances.game += compoundPortion;

                if (typeof user.totalRewardsWon === 'number') {
                    user.totalRewardsWon += outcome.payout;
                }

                // Trigger Winner Level Income (15 levels)
                try {
                    const { distributeWinnerCommissions } = require('../utils/incomeDistributor');
                    await distributeWinnerCommissions(user._id, outcome.payout);
                } catch (distError) {
                    console.error('Failed to distribute winner commissions:', distError);
                }
            }

            // Track Real Money Trading Volume for referral qualification
            user.activation.totalRealVolume = (user.activation.totalRealVolume || 0) + commitment.betData.betAmount;

            // Increment team volume for uplines
            if (user.referredBy) {
                await require('../models/User').findByIdAndUpdate(user.referredBy, {
                    $inc: { 'teamStats.totalTeamVolume': commitment.betData.betAmount }
                });
            }
        }

        // Update stats
        user.gamesPlayed += 1;
        if (outcome.isWin) {
            user.gamesWon += 1;
            user.totalWinnings += (outcome.payout - commitment.betData.betAmount);
        }

        // Recalculate activation tier in case volume requirement was met
        if (commitment.betData.gameType === 'practice') {
            user.updateActivationTier();
        }

        await user.save();

        // Create game record
        const game = new Game({
            user: user._id,
            gameType: commitment.betData.gameType,
            gameVariant: commitment.betData.gameVariant,
            betAmount: commitment.betData.betAmount,
            pickedNumber: commitment.betData.pickedNumber,
            luckyNumber: outcome.luckyNumber,
            isWin: outcome.isWin,
            payout: outcome.payout,
            multiplier: outcome.multiplier,
            // Add provably fair verification data
            serverSeedHash: commitment.serverSeedHash,
            nonce: commitment.nonce,
            roundNumber: commitment.betData.roundNumber
        });

        await game.save();

        // Update commitment with result
        commitment.result = outcome;
        commitment.status = 'revealed';
        commitment.revealedAt = new Date();
        await commitment.save();

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            // Live activity feed for admin/terminal views
            io.emit('live_activity', {
                type: outcome.isWin ? 'WIN' : 'BET',
                user: user.walletAddress || user.email || user._id?.toString(),
                amount: outcome.isWin ? outcome.payout : commitment.betData.betAmount,
                gameType: commitment.betData.gameVariant,
                multiplier: outcome.multiplier,
                timestamp: new Date().toISOString()
            });

            io.to(user._id.toString()).emit('game_result', {
                ...outcome,
                gameType: commitment.betData.gameType,
                gameVariant: commitment.betData.gameVariant,
                newBalance: commitment.betData.gameType === 'practice'
                    ? user.practiceBalance
                    : user.realBalances?.game || 0,
                provablyFair: {
                    serverSeed: commitment.serverSeed,
                    serverSeedHash: commitment.serverSeedHash,
                    clientSeed: commitment.clientSeed,
                    nonce: commitment.nonce
                }
            });

            if (commitment.betData.gameType === 'real' && outcome.isWin) {
                io.emit('global_win', {
                    player: user.walletAddress ? user.walletAddress.slice(0, 6) + '...' + user.walletAddress.slice(-4) : 'Anonymous',
                    amount: outcome.payout,
                    game: commitment.betData.gameVariant.toUpperCase()
                });
            }
        }

        res.status(200).json({
            status: 'success',
            data: {
                game: {
                    id: game._id,
                    pickedNumber: commitment.betData.pickedNumber,
                    ...outcome,
                    gameVariant: commitment.betData.gameVariant
                },
                newBalance: commitment.betData.gameType === 'practice'
                    ? user.practiceBalance
                    : (user.realBalances?.game || 0),
                provablyFair: {
                    serverSeed: commitment.serverSeed,
                    serverSeedHash: commitment.serverSeedHash,
                    clientSeed: commitment.clientSeed,
                    nonce: commitment.nonce
                }
            }
        });

    } catch (error) {
        console.error('Bet reveal error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to reveal bet'
        });
    }
});

// Helper function to validate picked number based on variant
function validatePickedNumber(variant, pickedNumber) {
    switch (variant) {
        case 'dice':
            return Number.isInteger(pickedNumber) && pickedNumber >= 1 && pickedNumber <= 8;

        case 'guess':
            return Number.isInteger(pickedNumber) && pickedNumber >= 0 && pickedNumber <= 9;

        case 'spin':
            if (Array.isArray(pickedNumber)) {
                return pickedNumber.every(n => Number.isInteger(n) && n >= 1 && n <= 8);
            }
            return Number.isInteger(pickedNumber) && pickedNumber >= 1 && pickedNumber <= 8;

        case 'matrix':
            return Number.isInteger(pickedNumber) && pickedNumber >= 1 && pickedNumber <= 95;

        case 'crash':
            const crashTarget = parseFloat(pickedNumber);
            return !isNaN(crashTarget) && crashTarget >= 1.0 && crashTarget <= 10.0;

        default:
            return true;
    }
}

/**
 * LEGACY: Simple bet endpoint (practice games only for backwards compatibility)
 * Real money games MUST use commit-reveal
 */
router.post('/bet', auth, async (req, res) => {
    try {
        const { gameType } = req.body;

        // Block real money games on legacy endpoint
        if (gameType === 'real') {
            return res.status(403).json({
                status: 'error',
                message: 'Real money games must use commit-reveal endpoints (/bet/commit and /bet/reveal)',
                code: 'USE_COMMIT_REVEAL'
            });
        }

        // Only allow if legacy endpoint is enabled
        if (!featureFlags.LEGACY_BET_ENDPOINT_ENABLED) {
            return res.status(403).json({
                status: 'error',
                message: 'Legacy bet endpoint disabled. Use commit-reveal flow.',
                code: 'LEGACY_ENDPOINT_DISABLED'
            });
        }

        // Continue with original simple logic for practice games...
        // (Keep existing implementation for practice mode)
        return res.status(501).json({
            status: 'error',
            message: 'Please use commit-reveal endpoints for better security'
        });

    } catch (error) {
        console.error('Legacy bet error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process bet'
        });
    }
});

// Get next nonce for user
router.get('/bet/nonce', auth, async (req, res) => {
    try {
        const nextNonce = await GameCommitment.getNextNonce(req.user.id);

        res.status(200).json({
            status: 'success',
            data: {
                nextNonce
            }
        });

    } catch (error) {
        console.error('Get nonce error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get nonce'
        });
    }
});

// Verify game fairness
router.post('/bet/verify', async (req, res) => {
    try {
        const { gameId } = req.body;

        const game = await Game.findById(gameId);
        if (!game) {
            return res.status(404).json({
                status: 'error',
                message: 'Game not found'
            });
        }

        const commitment = await GameCommitment.findOne({
            userId: game.user,
            nonce: game.nonce
        });

        if (!commitment) {
            return res.status(404).json({
                status: 'error',
                message: 'No commitment found for this game'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                serverSeed: commitment.serverSeed,
                serverSeedHash: commitment.serverSeedHash,
                clientSeed: commitment.clientSeed,
                nonce: commitment.nonce,
                luckyNumber: game.luckyNumber,
                canVerify: true
            }
        });

    } catch (error) {
        console.error('Verify game error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to verify game'
        });
    }
});

// Get game history (keep existing)
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

// Get live games (keep existing)
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
                gameVariant: round.gameVariant || 'guess'
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

module.exports = router;
