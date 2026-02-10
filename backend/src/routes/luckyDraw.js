const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================
// TRK BLOCKCHAIN LUCKY DRAW (LIVE)
// ============================================
// Automatic jackpot pools with guaranteed winners.
// 1 in 10 players wins. Total Prize Pool: 70,000 USDT.

const TICKETS_TOTAL = 10000;
const TICKET_PRICE = 10;
const TOTAL_WINNERS = 1000;

const PRIZE_CHART = [
    { rank: '1st', amount: 10000, winners: 1 },
    { rank: '2nd', amount: 5000, winners: 1 },
    { rank: '3rd', amount: 4000, winners: 1 },
    { rank: '4th - 10th', amount: 1000, winners: 7 },
    { rank: '11th - 50th', amount: 300, winners: 40 },
    { rank: '51st - 100th', amount: 120, winners: 50 },
    { rank: '101st - 500th', amount: 40, winners: 400 },
    { rank: '501st - 1000th', amount: 20, winners: 500 }
];

// Mock Global State
// Administrative Mock State
let ticketPrice = 10;
let totalTicketsLimit = 10000;
let currentTicketsSold = 1560;
let drawIsActive = true;
let totalSurplus = 0;

router.get('/status', async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            data: {
                totalTickets: totalTicketsLimit,
                ticketsSold: currentTicketsSold,
                ticketPrice: ticketPrice,
                totalWinners: TOTAL_WINNERS,
                winChance: '10%',
                totalPrizePool: 70000,
                prizes: PRIZE_CHART,
                drawIsActive,
                totalSurplus,
                recentWinners: [
                    { wallet: '0x71...3A2', prize: '$10,000', rank: '1st' },
                    { wallet: '0x49...1B5', prize: '$5,000', rank: '2nd' },
                    { wallet: '0xBC...E91', prize: '$4,000', rank: '3rd' }
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get jackpot status' });
    }
});

router.post('/buy-ticket', auth, async (req, res) => {
    try {
        if (!drawIsActive) {
            return res.status(403).json({ status: 'error', message: 'Lucky Draw is currently paused' });
        }

        const { quantity = 1 } = req.body;
        const user = await User.findById(req.user.id);

        const totalCost = quantity * ticketPrice;

        // SWEEPSTAKES: Buy tickets with Credits (GC)
        if (user.credits < totalCost) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient Credits'
            });
        }

        user.credits -= totalCost;
        // user.realBalances.cash -= totalCost;

        if (currentTicketsSold + quantity > totalTicketsLimit) {
            return res.status(400).json({ status: 'error', message: 'Exceeds round limit' });
        }

        // user.realBalances.cash -= totalCost; // This line was removed as per instruction
        currentTicketsSold += quantity;

        // Calculate surplus for this purchase (30% revenue)
        // 70,000 USDT payout vs 100,000 USDT collected at $10 price
        // Ratio is 0.3 if price is $10 and pool is 70k for 10k tickets.
        const surplusPerTicket = (ticketPrice * totalTicketsLimit - 70000) / totalTicketsLimit;
        totalSurplus += quantity * surplusPerTicket;

        const tickets = [];
        for (let i = 0; i < quantity; i++) {
            tickets.push({
                ticketId: `LKY-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
                purchasedAt: new Date()
            });
        }

        await user.save();

        if (currentTicketsSold >= totalTicketsLimit) {
            // Simulate draw execution with real users
            const allUsers = await User.find({ isActive: true }).select('walletAddress');
            if (allUsers.length > 0) {
                // Select 3 random winners for the real-time ticker demo
                const winners = [];
                for (let i = 0; i < 3; i++) {
                    const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
                    const prize = i === 0 ? "10,000" : i === 1 ? "5,000" : "4,000";
                    const rank = i === 0 ? "1st" : i === 1 ? "2nd" : "3rd";

                    const winnerData = {
                        wallet: randomUser.walletAddress,
                        prize: `${prize} USDT`,
                        rank: rank
                    };
                    winners.push(winnerData);

                    // Emit Real-Time Socket Event
                    const io = req.app.get('io');
                    if (io) {
                        io.emit('lucky_draw_winner', winnerData);
                    }
                }
                console.log('--- DRAW EXECUTED SUCCESSFULLY WITH REAL-TIME EMISSION ---');
            }
            currentTicketsSold = 0;
        }

        res.status(200).json({
            status: 'success',
            message: `Successfully purchased ${quantity} ticket(s)`,
            data: {
                tickets,
                newBalance: user.realBalances.cash,
                currentPoolProgress: `${((currentTicketsSold / totalTicketsLimit) * 100).toFixed(1)}%`
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to purchase tickets' });
    }
});

// Admin Control: Update Parameters
router.post('/admin/update-params', auth, async (req, res) => {
    try {
        // In product, check for admin role
        const { newPrice, newLimit } = req.body;
        if (currentTicketsSold > 0) {
            return res.status(400).json({ status: 'error', message: 'Cannot change parameters during an active round' });
        }

        if (newPrice) ticketPrice = newPrice;
        if (newLimit) totalTicketsLimit = newLimit;

        res.status(200).json({ status: 'success', message: 'Parameters updated', data: { ticketPrice, totalTicketsLimit } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update parameters' });
    }
});

// Admin Control: Toggle Pause
router.post('/admin/toggle-pause', auth, async (req, res) => {
    try {
        drawIsActive = !drawIsActive;
        res.status(200).json({ status: 'success', message: `Draw ${drawIsActive ? 'resumed' : 'paused'}`, data: { drawIsActive } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to toggle pause' });
    }
});

// Admin Control: Withdraw Surplus
router.post('/admin/withdraw-surplus', auth, async (req, res) => {
    try {
        const amount = totalSurplus;
        totalSurplus = 0;
        res.status(200).json({ status: 'success', message: `Withdrawn ${amount} USDT surplus`, data: { withdrawnAmount: amount } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to withdraw surplus' });
    }
});

router.get('/my-tickets', auth, async (req, res) => {
    try {
        res.status(200).json({
            status: 'success',
            data: {
                activeTickets: [
                    { ticketId: 'LKY-8A2B3C', purchasedAt: new Date(Date.now() - 3600000) },
                    { ticketId: 'LKY-1X9Y2Z', purchasedAt: new Date(Date.now() - 7200000) }
                ],
                pastDraws: [
                    { date: '2026-02-02', tickets: 5, won: 0 },
                    { date: '2026-02-01', tickets: 2, won: 20 }
                ]
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get tickets' });
    }
});

module.exports = router;
