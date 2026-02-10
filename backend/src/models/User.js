const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        unique: true,
        lowercase: true,
        sparse: true // Allow nulls for unique index (e.g. email-only users)
    },
    linkedWallets: {
        type: [String],
        default: []
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        sparse: true,
        trim: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    role: {
        type: String,
        enum: ['player', 'admin', 'superadmin'],
        default: 'player'
    },
    permissions: {
        type: [String],
        default: []
    },
    name: String,
    picture: String,
    password: {
        type: String,
        select: false // Hide password by default
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailOtp: {
        type: String,
        select: false
    },
    emailOtpExpires: {
        type: Date,
        select: false
    },
    passwordResetOtp: {
        type: String,
        select: false
    },
    passwordResetOtpExpires: {
        type: Date,
        select: false
    },
    nonce: {
        type: String,
        required: function () { return !!this.walletAddress; }, // Required if wallet linked
        default: () => Math.floor(Math.random() * 1000000).toString()
    },
    // Sweepstakes Model: Virtual Currency System
    credits: {
        type: Number,
        default: 0 // Game Coins (GC) - For entertainment only, NO monetary value
    },
    rewardPoints: {
        type: Number,
        default: 0 // Sweepstakes Coins (SC) - Redeemable for prizes
    },
    redemptionOtp: {
        type: String,
        select: false
    },
    redemptionOtpExpires: {
        type: Date,
        select: false
    },
    redemptionHistory: [{
        pointsRedeemed: { type: Number, required: true },
        usdtAmount: { type: Number, required: true },
        status: { type: String, default: 'pending' }, // pending, completed, failed
        txHash: { type: String, default: null },
        redeemedAt: { type: Date, default: Date.now }
    }],
    freeCredits: {
        daily: { type: Number, default: 100 }, // Daily bonus amount
        lastClaimed: { type: Date, default: null },
        totalClaimed: { type: Number, default: 0 }
    },
    membershipLevel: {
        type: String,
        enum: ['none', 'starter', 'premium', 'vip'],
        default: 'none'
    },
    // Legacy fields - kept for compatibility but deprecated
    practiceBalance: { type: Number, default: 100 },
    practiceExpiry: { type: Date, default: null },

    // Tracking & Stats
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalRewardsWon: { type: Number, default: 0 }, // Replaces totalWinnings

    gameStats: {
        numberGuess: {
            dailyWins: { type: Number, default: 0 },
            lastPlayed: { type: Date }
        },
        spinWheel: {
            dailySpins: { type: Number, default: 0 },
            lastSpin: { type: Date }
        },
        dailyCapReset: { type: Date, default: Date.now }
    },

    settings: {
        autoLuckyDraw: { type: Boolean, default: true },
        emailNotifications: { type: Boolean, default: true }
    },

    deposits: [{
        amount: { type: Number, required: true }, // Package cost
        credits: { type: Number, required: true }, // GC received
        rewardPoints: { type: Number, required: true }, // SC received
        txHash: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],

    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    isRegisteredOnChain: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update activation tier based on total deposits
userSchema.methods.updateActivationTier = function (tier1Threshold = 10, tier2Threshold = 100) {
    const total = this.activation.totalDeposited;

    if (total >= tier2Threshold) {
        // Tier 2: Full activation
        this.activation.tier = 'tier2';
        if (!this.activation.tier2ActivatedAt) {
            this.activation.tier2ActivatedAt = new Date();
        }
        // Unlock all features
        this.activation.canWithdrawDirectLevel = true;
        this.activation.canWithdrawWinners = true;
        this.activation.canTransferPractice = true;
        this.activation.canWithdrawAll = true;
        this.activation.cashbackActive = true;
        this.activation.allStreamsUnlocked = true;
    } else if (total >= tier1Threshold) {
        // Tier 1: Basic activation
        this.activation.tier = 'tier1';
        if (!this.activation.tier1ActivatedAt) {
            this.activation.tier1ActivatedAt = new Date();
        }
        // Unlock Tier 1 features only
        this.activation.canWithdrawDirectLevel = true;
        this.activation.canWithdrawWinners = true;
        this.activation.canTransferPractice = false;
        this.activation.canWithdrawAll = false;
        this.activation.cashbackActive = false;
        this.activation.allStreamsUnlocked = false;
    } else {
        this.activation.tier = 'none';
        this.activation.canWithdrawDirectLevel = false;
        this.activation.canWithdrawWinners = false;
        this.activation.canTransferPractice = false;
        this.activation.canWithdrawAll = false;
        this.activation.cashbackActive = false;
        this.activation.allStreamsUnlocked = false;
    }

    return this.activation;
};

// Password hashing middleware
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }

    if (!this.referralCode && this.walletAddress) {
        this.referralCode = this.walletAddress.slice(2, 8).toUpperCase();
    } else if (!this.referralCode && this.email) {
        this.referralCode = this.email.split('@')[0].slice(0, 6).toUpperCase() + Math.floor(Math.random() * 1000).toString();
    }

    this.updatedAt = Date.now();
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Generate random nonce
userSchema.methods.generateNonce = function () {
    this.nonce = Math.floor(Math.random() * 1000000).toString();
    return this.nonce;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
