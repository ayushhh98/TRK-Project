const mongoose = require('mongoose');

const emergencyLogSchema = new mongoose.Schema({
    emergencyId: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
    },
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
        enum: ['PAUSE_REQUESTED', 'PAUSE_APPROVED', 'PAUSE_ACTIVATED', 'RESUME_REQUESTED', 'RESUME_APPROVED', 'RESUME_ACTIVATED']
    },
    affectedModules: [{
        type: String
    }],
    reason: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    ipAddress: {
        type: String
    },
    blockchainRef: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    capped: { size: 5242880, max: 5000 } // Immutable-ish (fixed size, oldest entries removed if full)
});

module.exports = mongoose.model('EmergencyLog', emergencyLogSchema);
