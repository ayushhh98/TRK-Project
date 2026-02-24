const mongoose = require('mongoose');

const economyLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['PAUSE_REQUESTED', 'PAUSE_ACTIVATED', 'RESUME_REQUESTED', 'RESUME_ACTIVATED', 'CONFIG_CHANGE', 'EMERGENCY_OVERRIDE']
    },
    affectedNodes: [{
        type: String,
        enum: ['vault', 'yield', 'pools', 'ledger', 'governance']
    }],
    reason: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('EconomyLog', economyLogSchema);
