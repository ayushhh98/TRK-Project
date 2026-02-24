const mongoose = require('mongoose');

const gameProtocolSchema = new mongoose.Schema({
    nodeName: {
        type: String,
        required: true,
        unique: true,
        enum: ['rng', 'logic', 'liquidity', 'settlement', 'gateway']
    },
    status: {
        type: String,
        required: true,
        enum: ['RUNNING', 'PAUSED'],
        default: 'RUNNING'
    },
    pendingAction: {
        type: {
            action: { type: String, enum: ['PAUSE', 'RESUME'] },
            requestedBy: { type: String },
            requestedAt: { type: Date },
            approvals: [{ adminId: String, approvedAt: Date }],
            requiredApprovals: { type: Number, default: 2 },
            reason: { type: String }
        },
        default: null
    },
    lastChangedBy: String,
    lastReason: String,
    lastChangedAt: Date
}, {
    timestamps: true
});

module.exports = mongoose.model('GameProtocol', gameProtocolSchema);
