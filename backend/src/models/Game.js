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
        required: true
    },
    gameVariant: {
        type: String,
        default: 'dice'
    },
    isWin: {
        type: Boolean,
        required: true
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for querying user's game history
gameSchema.index({ user: 1, createdAt: -1 });
gameSchema.index({ gameType: 1, createdAt: -1 });

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
