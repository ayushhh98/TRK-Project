const mongoose = require('mongoose');

const guessRoundSchema = new mongoose.Schema({
    roundNumber: {
        type: Number,
        required: true,
        unique: true,
        index: true
    },
    gameVariant: {
        type: String,
        default: 'guess'
    },
    status: {
        type: String,
        enum: ['active', 'resolved'],
        default: 'active',
        index: true
    },
    luckyNumber: {
        type: Number
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Static: Get current active round
guessRoundSchema.statics.getCurrentRound = async function () {
    return this.findOne({ status: 'active' }).sort({ roundNumber: -1 });
};

// Static: Start new round
guessRoundSchema.statics.startNewRound = async function (durationSeconds = 60) {
    const latest = await this.findOne().sort({ roundNumber: -1 });
    const nextNumber = latest ? latest.roundNumber + 1 : 1;
    const now = new Date();

    return this.create({
        roundNumber: nextNumber,
        endTime: new Date(now.getTime() + durationSeconds * 1000)
    });
};

const GuessRound = mongoose.model('GuessRound', guessRoundSchema);

module.exports = GuessRound;
