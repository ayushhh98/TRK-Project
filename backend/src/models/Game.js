const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gameType: {
        type: String,
        enum: ['practice', 'real'],
        required: true
    },
    betAmount: {
        type: Number,
        required: true
    },
    pickedNumber: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    luckyNumber: {
        type: mongoose.Schema.Types.Mixed,
        required: false // Null until resolved for delayed bets
    },
    gameVariant: {
        type: String,
        default: 'dice'
    },
    status: {
        type: String,
        enum: ['pending', 'resolved'],
        default: 'resolved'
    },
    resolvedAt: {
        type: Date
    },
    isWin: {
        type: Boolean,
        required: false // Null until resolved for delayed bets
    },
    payout: {
        type: Number,
        default: 0
    },
    multiplier: {
        type: Number,
        default: 8
    },
    // Provably fair verification (for commit-reveal games)
    serverSeedHash: {
        type: String,
        index: true
    },
    nonce: {
        type: Number,
        index: true
    },
    txHash: {
        type: String,
        default: null // For real games with blockchain tx
    },
    roundNumber: {
        type: Number,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for querying user's game history
gameSchema.index({ user: 1, createdAt: -1 });
gameSchema.index({ gameType: 1, createdAt: -1 });
gameSchema.index({ status: 1, gameType: 1 }); // For cron jobs finding pending practice bets

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
