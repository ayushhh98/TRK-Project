const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        default: 'default'
    },
    emergencyFlags: {
        pauseRegistrations: { type: Boolean, default: false },
        pauseDeposits: { type: Boolean, default: false },
        pauseWithdrawals: { type: Boolean, default: false },
        pauseLuckyDraw: { type: Boolean, default: false },
        maintenanceMode: { type: Boolean, default: false }
    },
    economics: {
        cashbackPhase1: { type: Number, default: 0.50 }, // <= 100k users
        cashbackPhase2: { type: Number, default: 0.40 }, // 100k - 1M users
        cashbackPhase3: { type: Number, default: 0.33 }, // > 1M users
        referralMultiplierCap: { type: Number, default: 8 }, // 8X max
        minReferralVolumeForMultiplier: { type: Number, default: 100 }, // 100 USDT
        clubPoolPercent: { type: Number, default: 8 }, // 8%
        jackpotPoolPercent: { type: Number, default: 2 }, // 2%
        directPoolPercent: { type: Number, default: 30 }, // 30%
    },
    practice: {
        bonusAmount: { type: Number, default: 100 },
        maxUsers: { type: Number, default: 100000 },
        expiryDays: { type: Number, default: 30 },
        autoCleanupEnabled: { type: Boolean, default: true }
    },
    activation: {
        minTier1: { type: Number, default: 10 },
        minTier2: { type: Number, default: 100 }
    },
    withdrawal: {
        minAmount: { type: Number, default: 5 },
        maxDailyAmount: { type: Number, default: 5000 },
        sustainabilityFee: { type: Number, default: 10 } // 10%
    },
    luckyDraw: {
        ticketPrice: { type: Number, default: 10 },
        maxTickets: { type: Number, default: 10000 },
        autoEntryEnabled: { type: Boolean, default: true }
    },
    governance: {
        ecosystemPhase: { type: String, enum: ['V1', 'V2'], default: 'V1' },
        tokenSupportEnabled: { type: Boolean, default: false },
        bdWalletAddress: { type: String, default: '0xBD_SYSTEM_WALLET_CONTRACT' }
    },
    lastUpdated: { type: Date, default: Date.now },
    updatedBy: { type: String, default: 'system' }
}, {
    timestamps: true
});

// Static method to get the singleton config
systemConfigSchema.statics.getConfig = async function () {
    let config = await this.findOne({ key: 'default' });
    if (!config) {
        config = await this.create({ key: 'default' });
    }
    return config;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
