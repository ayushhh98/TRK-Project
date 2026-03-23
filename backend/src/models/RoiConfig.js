const mongoose = require('mongoose');

const RoiConfigSchema = new mongoose.Schema({
    rates: {
        phase1: { type: Number, default: 0.50 },
        phase2: { type: Number, default: 0.40 },
        phase3: { type: Number, default: 0.33 },
        phase1MaxUsers: { type: Number, default: 100000 },
        phase2MaxUsers: { type: Number, default: 1000000 }
    },
    lossEngine: {
        minLossThreshold: { type: Number, default: 100 },
        calculationMethod: { type: String, enum: ['net', 'total'], default: 'net' }
    },
    caps: {
        base: { type: Number, default: 100 }, // 100%
        refs5: { type: Number, default: 200 }, // 200%
        refs10: { type: Number, default: 400 }, // 400%
        refs20: { type: Number, default: 800 }, // 800%
        resetRuleEnabled: { type: Boolean, default: true }
    },
    distribution: {
        isActive: { type: Boolean, default: true },
        timeHours: { type: Number, default: 0 },
        timeMinutes: { type: Number, default: 0 }
    },
    roiOnRoi: {
        level1: { type: Number, default: 20 },
        level2to5: { type: Number, default: 10 },
        level6to10: { type: Number, default: 5 },
        level11to15: { type: Number, default: 3 }
    },
    eligibility: {
        minReferralVolume: { type: Number, default: 100 }
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Ensure single document pattern
RoiConfigSchema.statics.getConfig = async function () {
    let config = await this.findOne();
    if (!config) {
        config = await this.create({});
    }
    return config;
};

module.exports = mongoose.model('RoiConfig', RoiConfigSchema);
