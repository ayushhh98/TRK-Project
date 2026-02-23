const mongoose = require('mongoose');

const platformStatsSchema = new mongoose.Schema({
    date: {
        type: String, // YYYY-MM-DD
        unique: true,
        index: true
    },
    dailyTurnover: {
        type: Number,
        default: 0
    },
    totalTurnover: {
        type: Number,
        default: 0
    },
    todayDeposits: {
        type: Number,
        default: 0
    },
    todayWithdrawals: {
        type: Number,
        default: 0
    },
    sustainabilityFees: {
        type: Number,
        default: 0
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

platformStatsSchema.statics.getToday = async function () {
    const today = new Date().toISOString().split('T')[0];
    let stats = await this.findOne({ date: today });
    if (!stats) {
        stats = await this.create({ date: today });
    }
    return stats;
};

platformStatsSchema.statics.incrementTurnover = async function (amount) {
    const today = new Date().toISOString().split('T')[0];
    return await this.findOneAndUpdate(
        { date: today },
        {
            $inc: { dailyTurnover: amount, totalTurnover: amount, todayDeposits: 1 },
            $set: { updatedAt: new Date() }
        },
        { upsert: true, new: true }
    );
};

module.exports = mongoose.model('PlatformStats', platformStatsSchema);
