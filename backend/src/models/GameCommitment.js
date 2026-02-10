const mongoose = require('mongoose');

const gameCommitmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    nonce: {
        type: Number,
        required: true,
        index: true
    },
    // Server seed (hashed before game, revealed after)
    serverSeed: {
        type: String,
        required: true
    },
    serverSeedHash: {
        type: String,
        required: true,
        index: true
    },
    // Client seed for provably fair
    clientSeed: {
        type: String,
        required: true
    },
    // Encrypted bet data (amount, pickedNumber, variant)
    betDataHash: {
        type: String,
        required: true
    },
    betData: {
        gameType: {
            type: String,
            enum: ['practice', 'real'],
            required: true
        },
        gameVariant: {
            type: String,
            required: true
        },
        betAmount: {
            type: Number,
            required: true
        },
        pickedNumber: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        }
    },
    // Result
    result: {
        luckyNumber: mongoose.Schema.Types.Mixed,
        isWin: Boolean,
        payout: Number,
        multiplier: Number
    },
    // Status tracking
    status: {
        type: String,
        enum: ['committed', 'revealed', 'expired'],
        default: 'committed',
        index: true
    },
    // Request tracking for anti-replay
    requestId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    // Timestamps
    committedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    revealedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

// Compound index for user nonce uniqueness
gameCommitmentSchema.index({ userId: 1, nonce: 1 }, { unique: true });

// TTL index for automatic cleanup of expired commitments (single definition)
gameCommitmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to get next nonce for user
gameCommitmentSchema.statics.getNextNonce = async function (userId) {
    const lastCommitment = await this.findOne({ userId })
        .sort({ nonce: -1 })
        .select('nonce');

    return (lastCommitment?.nonce || 0) + 1;
};

// Static method to validate nonce sequence
gameCommitmentSchema.statics.validateNonce = async function (userId, nonce) {
    const lastCommitment = await this.findOne({ userId })
        .sort({ nonce: -1 })
        .select('nonce');

    const expectedNonce = (lastCommitment?.nonce || 0) + 1;
    return nonce === expectedNonce;
};

// Instance method to validate bet data hash
gameCommitmentSchema.methods.validateBetData = function (betData) {
    const crypto = require('crypto');
    const dataString = JSON.stringify({
        gameType: betData.gameType,
        gameVariant: betData.gameVariant,
        betAmount: betData.betAmount,
        pickedNumber: betData.pickedNumber
    });
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    return hash === this.betDataHash;
};

module.exports = mongoose.model('GameCommitment', gameCommitmentSchema);
