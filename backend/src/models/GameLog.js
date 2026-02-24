const mongoose = require('mongoose');

const gameLogSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: 'admin'
    },
    action: {
        type: String,
        required: true
    },
    affectedNodes: [String],
    reason: {
        type: String,
        required: true
    },
    ipAddress: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GameLog', gameLogSchema);
