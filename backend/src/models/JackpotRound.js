const mongoose = require('mongoose');

/**
 * JackpotRound Model
 * Manages jackpot draw rounds with tickets, winners, and prize distribution
 */
const jackpotRoundSchema = new mongoose.Schema({
    // Round Configuration
    roundNumber: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    ticketPrice: {
        type: Number,
        required: true,
        default: 10,
        min: 1
    },
    totalTickets: {
        type: Number,
        required: true,
        default: 10000,
        min: 10
    },
    totalPrizePool: {
        type: Number,
        required: true,
        default: 70000
    },

    // Status
    status: {
        type: String,
        enum: ['pending', 'active', 'drawing', 'completed', 'cancelled'],
        default: 'active',
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Tickets
    ticketsSold: {
        type: Number,
        default: 0,
        min: 0
    },
    tickets: [{
        ticketId: {
            type: String,
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        walletAddress: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            default: 1
        },
        entrySource: {
            type: String,
            enum: ['manual', 'auto'],
            default: 'manual'
        },
        purchasedAt: {
            type: Date,
            default: Date.now
        },
        transactionHash: String
    }],

    // Winners
    winners: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        walletAddress: {
            type: String,
            required: true
        },
        ticketId: String,
        rank: {
            type: String,
            required: true
        },
        prize: {
            type: Number,
            required: true
        },
        claimedAt: Date,
        transactionHash: String,
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed'],
            default: 'pending'
        }
    }],

    // Financial
    totalRevenue: {
        type: Number,
        default: 0
    },
    totalPaidOut: {
        type: Number,
        default: 0
    },
    surplus: {
        type: Number,
        default: 0
    },
    surplusWithdrawn: {
        type: Boolean,
        default: false
    },
    surplusWithdrawnAt: Date,
    surplusWithdrawnBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Draw Execution
    drawExecutedAt: Date,
    drawExecutedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    drawMethod: {
        type: String,
        enum: ['automatic', 'manual'],
        default: 'automatic'
    },
    drawSeed: String, // For provably fair draws

    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    parameterChanges: [{
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        changedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Indexes for performance
jackpotRoundSchema.index({ status: 1, createdAt: -1 });
jackpotRoundSchema.index({ 'tickets.userId': 1 });
jackpotRoundSchema.index({ 'winners.userId': 1 });

// Virtual: Progress percentage
jackpotRoundSchema.virtual('progress').get(function () {
    return this.totalTickets > 0 ? (this.ticketsSold / this.totalTickets) * 100 : 0;
});

// Virtual: Is round full
jackpotRoundSchema.virtual('isFull').get(function () {
    return this.ticketsSold >= this.totalTickets;
});

// Method: Add ticket purchase
jackpotRoundSchema.methods.addTicket = function (userId, walletAddress, quantity = 1, entrySource = 'manual') {
    const ticketId = `TRK-DRAW-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    this.tickets.push({
        ticketId,
        userId,
        walletAddress,
        quantity,
        entrySource,
        purchasedAt: new Date()
    });

    this.ticketsSold += quantity;
    this.totalRevenue += this.ticketPrice * quantity;

    return ticketId;
};

// Method: Calculate surplus
jackpotRoundSchema.methods.calculateSurplus = function () {
    const revenue = this.ticketPrice * this.ticketsSold;
    this.surplus = revenue - this.totalPrizePool;
    return this.surplus;
};

// Method: Set winners
jackpotRoundSchema.methods.setWinners = function (winnersList) {
    this.winners = winnersList.map(w => ({
        userId: w.userId,
        walletAddress: w.walletAddress,
        ticketId: w.ticketId,
        rank: w.rank,
        prize: w.prize,
        status: 'pending'
    }));

    this.totalPaidOut = winnersList.reduce((sum, w) => sum + w.prize, 0);
};

// Static: Get active round
jackpotRoundSchema.statics.getActiveRound = async function () {
    return this.findOne({ status: 'active', isActive: true }).sort({ createdAt: -1 });
};

// Static: Create new round
jackpotRoundSchema.statics.createNewRound = async function (config = {}) {
    const latestRound = await this.findOne().sort({ roundNumber: -1 });
    const nextRoundNumber = latestRound ? latestRound.roundNumber + 1 : 1;

    return this.create({
        roundNumber: nextRoundNumber,
        ticketPrice: config.ticketPrice || 10,
        totalTickets: config.totalTickets || 10000,
        totalPrizePool: config.totalPrizePool || 70000,
        status: 'active',
        isActive: true,
        createdBy: config.createdBy
    });
};

// Ensure virtuals are included in JSON
jackpotRoundSchema.set('toJSON', { virtuals: true });
jackpotRoundSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('JackpotRound', jackpotRoundSchema);
