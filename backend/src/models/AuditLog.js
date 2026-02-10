const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Audit Log Schema
 * Tamper-resistant logging with hash chain verification
 */
const auditLogSchema = new mongoose.Schema({
    // Event metadata
    eventType: {
        type: String,
        required: true,
        enum: [
            'bet_failed',
            'bet_success',
            'rate_limit_violation',
            'seed_exposure',
            'admin_action',
            'user_banned',
            'user_unbanned',
            'role_changed',
            'captcha_required',
            'captcha_failed',
            'withdrawal',
            'deposit',
            'auth_failed',
            'auth_success',
            'suspicious_activity',
            'system_error'
        ]
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'error', 'critical'],
        default: 'info'
    },

    // Actor (who performed the action)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    walletAddress: String,
    userRole: String,
    ipAddress: String,
    userAgent: String,

    // Target (what was affected)
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    targetResource: String,

    // Event details
    action: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Game-specific (for bet logs)
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game'
    },
    commitmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GameCommitment'
    },
    betAmount: Number,
    gameType: String,
    gameVariant: String,

    // Security
    requestId: String,
    sessionId: String,

    // Tamper resistance (hash chain)
    previousHash: {
        type: String,
        default: null
    },
    currentHash: {
        type: String,
        required: true
    },
    sequenceNumber: {
        type: Number,
        required: true
    },

    // Read-only enforcement
    immutable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for efficient queries
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ sequenceNumber: 1 }, { unique: true });

// Generate hash for tamper resistance
auditLogSchema.methods.generateHash = function () {
    const data = JSON.stringify({
        eventType: this.eventType,
        userId: this.userId,
        action: this.action,
        details: this.details,
        timestamp: this.createdAt,
        previousHash: this.previousHash,
        sequenceNumber: this.sequenceNumber
    });

    return crypto.createHash('sha256').update(data).digest('hex');
};

// Prevent modifications after creation
auditLogSchema.pre('save', async function (next) {
    if (!this.isNew && this.immutable) {
        throw new Error('Audit logs are immutable and cannot be modified');
    }

    if (this.isNew) {
        // Get sequence number
        const lastLog = await this.constructor.findOne().sort({ sequenceNumber: -1 });
        this.sequenceNumber = lastLog ? lastLog.sequenceNumber + 1 : 1;

        // Get previous hash for chain
        this.previousHash = lastLog ? lastLog.currentHash : null;

        // Generate current hash
        this.currentHash = this.generateHash();
    }

    next();
});

// Prevent deletion
auditLogSchema.pre('remove', function (next) {
    next(new Error('Audit logs cannot be deleted'));
});

// Verify hash chain integrity
auditLogSchema.statics.verifyIntegrity = async function (startSequence, endSequence) {
    const logs = await this.find({
        sequenceNumber: { $gte: startSequence, $lte: endSequence }
    }).sort({ sequenceNumber: 1 });

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Verify hash
        const expectedHash = log.generateHash();
        if (log.currentHash !== expectedHash) {
            return {
                valid: false,
                tampered: true,
                sequence: log.sequenceNumber,
                message: 'Hash mismatch detected'
            };
        }

        // Verify chain
        if (i > 0) {
            const prevLog = logs[i - 1];
            if (log.previousHash !== prevLog.currentHash) {
                return {
                    valid: false,
                    tampered: true,
                    sequence: log.sequenceNumber,
                    message: 'Hash chain broken'
                };
            }
        }
    }

    return { valid: true, tampered: false, verified: logs.length };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
