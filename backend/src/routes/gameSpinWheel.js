const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Configuration
const SPIN_COST = 50; // 50 GC (Credits) to spin
const DAILY_SPIN_LIMIT = 5; // Max 5 spins per day to prevent spam/addiction

// Prizes & Weights
const PRIZES = [
    { id: '1sc', type: 'sc', amount: 1, label: '1 SC', weight: 30, color: '#FFD700' },
    { id: '2sc', type: 'sc', amount: 2, label: '2 SC', weight: 15, color: '#C0C0C0' },
    { id: '5sc', type: 'sc', amount: 5, label: '5 SC', weight: 5, color: '#CD7F32' },
    { id: '10sc', type: 'sc', amount: 10, label: '10 SC', weight: 1, color: '#E5E4E2' },
    { id: '50gc', type: 'gc', amount: 50, label: '50 GC', weight: 20, color: '#00FF00' },
    { id: '100gc', type: 'gc', amount: 100, label: '100 GC', weight: 10, color: '#00FFFF' },
    { id: 'empty', type: 'none', amount: 0, label: 'Try Again', weight: 19, color: '#FF0000' }
];

// Helper: Select prize based on weights
const spinWheel = () => {
    const totalWeight = PRIZES.reduce((acc, prize) => acc + prize.weight, 0);
    let random = Math.random() * totalWeight;

    for (const prize of PRIZES) {
        if (random < prize.weight) return prize;
        random -= prize.weight;
    }
    return PRIZES[PRIZES.length - 1];
};

/**
 * @route   POST /api/game/spin-wheel
 * @desc    Play Spin Wheel
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 1. Reset Daily Stats if needed
        const now = new Date();
        const lastReset = user.gameStats.dailyCapReset || new Date(0);
        const isNewDay = now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth();

        if (isNewDay) {
            user.gameStats.dailyCapReset = now;
            user.gameStats.numberGuess.dailyWins = 0;
            user.gameStats.spinWheel.dailySpins = 0;
        }

        // 2. Check Limits
        if (user.gameStats.spinWheel.dailySpins >= DAILY_SPIN_LIMIT) {
            return res.status(400).json({
                status: 'error',
                message: 'Daily spin limit reached. Come back tomorrow!'
            });
        }

        // 3. Deduct Cost
        if (user.credits < SPIN_COST) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient Game Credits (GC).',
                action: 'buy_credits'
            });
        }

        user.credits -= SPIN_COST;

        // 4. Spin Result
        const prize = spinWheel();

        // 5. Award Prize
        let message = `You won ${prize.label}!`;

        if (prize.type === 'sc') {
            user.rewardPoints += prize.amount;
            user.totalRewardsWon = (user.totalRewardsWon || 0) + prize.amount;
        } else if (prize.type === 'gc') {
            user.credits += prize.amount;
        } else {
            message = "Better luck next time!";
        }

        // 6. Update Stats
        user.gameStats.spinWheel.dailySpins += 1;
        user.gameStats.spinWheel.lastSpin = now;

        await user.save();

        res.json({
            status: 'success',
            data: {
                prize,
                result: prize.label,
                message,
                newBalance: {
                    credits: user.credits,
                    rewardPoints: user.credits
                },
                spinsRemaining: DAILY_SPIN_LIMIT - user.gameStats.spinWheel.dailySpins
            }
        });

    } catch (err) {
        console.error("Spin Wheel Error:", err);
        res.status(500).json({ status: 'error', message: 'Server error processing spin' });
    }
});

module.exports = router;
