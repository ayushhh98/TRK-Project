const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Game Configuration
const PLAY_COST = 10; // Credits (GC)
const REWARD = 50;    // Reward Points (SC)
const DAILY_CAP = 500; // Max SC allowed to win per day

// Helper: Check and reset daily stats
const checkDailyReset = (user) => {
    const now = new Date();
    const lastReset = user.gameStats?.dailyCapReset || new Date(0);

    // Check if new day (UTC)
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
        if (!user.gameStats) user.gameStats = {};
        if (!user.gameStats.numberGuess) user.gameStats.numberGuess = {};

        user.gameStats.numberGuess.dailyWins = 0;
        user.gameStats.dailyCapReset = now;
        return true; // Reset occurred
    }
    return false;
};

/**
 * @route   POST /api/game/number-guess
 * @desc    Play Number Guess Game (Safe Sweepstakes Mode)
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
    try {
        const { guess } = req.body;

        // Input Validation
        if (!guess || guess < 1 || guess > 10) {
            return res.status(400).json({ status: 'error', message: 'Please guess a number between 1 and 10' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

        // Credit Check
        if (user.credits < PLAY_COST) {
            return res.status(400).json({ status: 'error', message: 'Insufficient Credits' });
        }

        // Initialize stats if missing
        if (!user.gameStats) {
            user.gameStats = {
                numberGuess: { dailyWins: 0, lastPlayed: new Date() },
                dailyCapReset: new Date()
            };
        } else if (!user.gameStats.numberGuess) {
            user.gameStats.numberGuess = { dailyWins: 0, lastPlayed: new Date() };
        }

        // Check/Reset Daily Cap
        checkDailyReset(user);

        // Cap Check
        const currentDailyWinnings = user.gameStats.numberGuess.dailyWins * REWARD;
        if (currentDailyWinnings >= DAILY_CAP) {
            return res.status(400).json({
                status: 'error',
                message: 'Daily reward cap reached (500 SC). Try again tomorrow!'
            });
        }

        // Deduct Play Cost
        user.credits -= PLAY_COST;

        // Generate Result
        const systemNumber = Math.floor(Math.random() * 10) + 1;
        const isWin = parseInt(guess) === systemNumber;

        let rewardPointsEarned = 0;

        // Update Stats
        user.gameStats.numberGuess.lastPlayed = new Date();

        if (isWin) {
            // Cap check for this specific win (prevent overflow if close to cap)
            if (currentDailyWinnings + REWARD <= DAILY_CAP) {
                rewardPointsEarned = REWARD;
                user.rewardPoints += REWARD;
                user.totalRewardsWon = (user.totalRewardsWon || 0) + REWARD;
                user.gameStats.numberGuess.dailyWins += 1;
            } else {
                // Determine partial payout? Or just reject play earlier?
                // For simplicity, strict Reject was done above. 
                // Double check logic: if wins=9 (450), next win makes 500. Allowed.
                // Logic above `currentDailyWinnings >= DAILY_CAP` permits play until 500 is hit.

                rewardPointsEarned = REWARD;
                user.rewardPoints += REWARD;
                user.totalRewardsWon = (user.totalRewardsWon || 0) + REWARD;
                user.gameStats.numberGuess.dailyWins += 1;
            }
        }

        await user.save();

        res.json({
            status: 'success',
            result: isWin ? 'correct' : 'wrong',
            data: {
                systemNumber,
                userGuess: parseInt(guess),
                isWin,
                rewardPointsEarned,
                creditsLeft: user.credits,
                rewardPointsTotal: user.rewardPoints,
                dailyProgress: {
                    won: user.gameStats.numberGuess.dailyWins * REWARD,
                    cap: DAILY_CAP
                }
            }
        });

    } catch (error) {
        console.error('Number Guess Game Error:', error);
        res.status(500).json({ status: 'error', message: 'Server error during gameplay' });
    }
});

module.exports = router;
