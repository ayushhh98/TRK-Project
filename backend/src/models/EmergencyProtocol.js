const mongoose = require('mongoose');

const emergencyProtocolSchema = new mongoose.Schema({
    moduleName: {
        type: String,
        required: true,
        unique: true,
        enum: ['gameEngine', 'roi', 'jackpot', 'clubIncome', 'withdrawal']
    },
    status: {
        type: String,
        required: true,
        enum: ['RUNNING', 'PAUSED'],
        default: 'RUNNING'
    },
    lastChangedAt: {
        type: Date,
        default: Date.now
    },
    changedBy: {
        type: String, // Admin ID
        required: true,
        default: 'system'
    },
    reason: {
        type: String,
        required: true,
        default: 'System initialization'
    },
    pendingAction: {
        type: {
            action: { type: String, enum: ['PAUSE', 'RESUME'] },
            requestedBy: { type: String },
            requestedAt: { type: Date },
            approvals: [{ adminId: String, approvedAt: Date }],
            requiredApprovals: { type: Number, default: 2 },
            unlockAt: { type: Date }, // Timelock
            reason: { type: String }
        },
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('EmergencyProtocol', emergencyProtocolSchema);
