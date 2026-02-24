const mongoose = require('mongoose');

const jackpotLogSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['PAUSE_REQUESTED', 'PAUSE_ACTIVATED', 'RESUME_REQUESTED', 'RESUME_ACTIVATED', 'PARAMS_UPDATED', 'DRAW_TRIGGERED']
    },
    affectedNodes: [{
        type: String
    }],
    reason: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('JackpotLog', jackpotLogSchema);
