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
        enum: ['player', 'admin', 'superadmin', 'finance_admin', 'compliance_admin', 'support_admin', 'tech_admin', 'subadmin'],
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
    membershipLevel: {
        type: String,
        enum: ['none', 'starter', 'premium', 'vip'],
        default: 'none'
    },
    // Unified 6-Wallet System (4 Internal + 2 On-chain tracked)
    realBalances: {
        game: { type: Number, default: 0 },          // Wallet 2: Game Wallet (Internal)
        cashbackROI: { type: Number, default: 0 },   // Wallet 4: Cashback/ROI/ROI-on-ROI (Internal)
        luckyDrawWallet: { type: Number, default: 0 }, // Wallet 5: Lucky Draw Entry Wallet (Internal)

        // Tracking for on-chain flows (destined for Wallet 1)
        winners: { type: Number, default: 0 },       // Pending 2X Payouts/Prizes to be withdrawn to On-chain
        directLevel: { type: Number, default: 0 },   // Referral income pending withdrawal to On-chain

        // Operational balances (transitional)
        cash: { type: Number, default: 0 }           // General deposit transit wallet
    },
    // Legacy fields - kept for compatibility but deprecated
    practiceBalance: { type: Number, default: 100 },
    practiceExpiry: { type: Date, default: null },

    // Tracking & Stats
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalRewardsWon: { type: Number, default: 0 }, // Replaces totalWinnings
    totalWinnings: { type: Number, default: 0 },

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
        txHash: { type: String },
        createdAt: { type: Date, default: Date.now }
    }],

    withdrawals: [{
        amount: { type: Number, required: true },
        walletType: { type: String },
        txHash: { type: String },
        status: { type: String, default: 'confirmed' }, // confirmed, pending, etc.
        createdAt: { type: Date, default: Date.now }
    }],

    referralCode: { type: String, unique: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teamStats: {
        totalMembers: { type: Number, default: 0 },
        activeMembers: { type: Number, default: 0 },
        totalCommission: { type: Number, default: 0 },
        totalTeamVolume: { type: Number, default: 0 },
        strongLegVolume: { type: Number, default: 0 },
        otherLegsVolume: { type: Number, default: 0 },
        branchVolumes: { type: Map, of: Number, default: {} }
    },
    cashbackStats: {
        totalNetLoss: { type: Number, default: 0 },
        totalRecovered: { type: Number, default: 0 },
        pendingCashback: { type: Number, default: 0 },
        todayCashback: { type: Number, default: 0 },
        lastClaimedAt: { type: Date, default: null }
    },
    withdrawalLimits: {
        dailyWithdrawalTotal: { type: Number, default: 0 },
        lastWithdrawalDate: { type: Date, default: Date.now }
    },
    clubRank: { type: String, default: 'Rank 0' },

    isRegisteredOnChain: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    bannedAt: { type: Date, default: null },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    activation: {
        tier: { type: String, enum: ['none', 'tier1', 'tier2'], default: 'none' },
        totalDeposited: { type: Number, default: 0 },
        tier1ActivatedAt: { type: Date, default: null },
        tier2ActivatedAt: { type: Date, default: null },
        canWithdrawDirectLevel: { type: Boolean, default: false },
        canWithdrawWinners: { type: Boolean, default: false },
        canTransferPractice: { type: Boolean, default: false },
        canWithdrawAll: { type: Boolean, default: false },
        cashbackActive: { type: Boolean, default: false },
        allStreamsUnlocked: { type: Boolean, default: false },
        registrationTime: { type: Date, default: Date.now }, // Fixed for guest mode dashboard
        totalPracticeVolume: { type: Number, default: 0 },
        totalRealVolume: { type: Number, default: 0 }
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    lastActionAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update activation tier based on total deposits
// Update activation tier based on total deposits
userSchema.methods.updateActivationTier = function (tier1Threshold = 10, tier2Threshold = 100) {
    const total = this.activation.totalDeposited;

    if (total >= tier2Threshold) {
        // Tier 2: 100+ USDT Activation
        // Benefits: Transfer Practice, Withdraw All, Cashback Active, All Streams Unlocked
        this.activation.tier = 'tier2';
        if (!this.activation.tier2ActivatedAt) this.activation.tier2ActivatedAt = new Date();
        if (!this.activation.tier1ActivatedAt) this.activation.tier1ActivatedAt = new Date(); // Implicitly Tier 1 too

        this.activation.canWithdrawDirectLevel = true;
        this.activation.canWithdrawWinners = true;

        // Tier 2 Bridge to Cash: Require 100+ USDT Deposit AND 100+ USDT Practice Volume
        if (this.activation.totalPracticeVolume >= 100) {
            this.activation.canTransferPractice = true;
        } else {
            this.activation.canTransferPractice = false;
        }

        this.activation.canWithdrawAll = true; // Withdraw from Game, Cash, ROI, Club, etc.
        this.activation.cashbackActive = true;
        this.activation.allStreamsUnlocked = true;
    } else if (total >= tier1Threshold) {
        // Tier 1: 10+ USDT Activation
        // Benefits: Withdraw Direct Level & Winners Income ONLY
        this.activation.tier = 'tier1';
        if (!this.activation.tier1ActivatedAt) this.activation.tier1ActivatedAt = new Date();

        this.activation.canWithdrawDirectLevel = true;
        this.activation.canWithdrawWinners = true;
        this.activation.canTransferPractice = false;
        this.activation.canWithdrawAll = false;
        this.activation.cashbackActive = false;
        this.activation.allStreamsUnlocked = false;
    } else {
        // No Tier
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

const normalizeRealBalances = (user) => {
    if (!user.realBalances) user.realBalances = {};
    const defaults = {
        cash: 0,
        game: 0,
        cashbackROI: 0,
        luckyDrawWallet: 0,
        directLevel: 0,
        winners: 0
    };
    for (const key of Object.keys(defaults)) {
        if (typeof user.realBalances[key] !== 'number') {
            user.realBalances[key] = defaults[key];
        }
    }
};

const normalizeCashbackStats = (user) => {
    if (!user.cashbackStats) user.cashbackStats = {};
    const defaults = {
        totalNetLoss: 0,
        totalRecovered: 0,
        pendingCashback: 0,
        todayCashback: 0
    };
    for (const key of Object.keys(defaults)) {
        if (typeof user.cashbackStats[key] !== 'number') {
            user.cashbackStats[key] = defaults[key];
        }
    }
    if (user.cashbackStats.lastClaimedAt) {
        const ts = new Date(user.cashbackStats.lastClaimedAt).getTime();
        if (Number.isNaN(ts)) {
            user.cashbackStats.lastClaimedAt = null;
        }
    } else {
        user.cashbackStats.lastClaimedAt = null;
    }
};

const normalizeTeamStats = (user) => {
    if (!user.teamStats) user.teamStats = {};
    const defaults = {
        totalMembers: 0,
        activeMembers: 0,
        totalCommission: 0,
        totalTeamVolume: 0,
        strongLegVolume: 0,
        otherLegsVolume: 0
    };
    for (const key of Object.keys(defaults)) {
        if (typeof user.teamStats[key] !== 'number') {
            user.teamStats[key] = defaults[key];
        }
    }
    if (!user.teamStats.branchVolumes) {
        user.teamStats.branchVolumes = new Map();
    }
};

const buildWalletReferralBase = (walletAddress, length) => {
    if (!walletAddress) return '';
    const clean = walletAddress.toString().replace(/^0x/i, '');
    return clean.slice(-length).toUpperCase();
};

const pickStartDigit = (walletAddress) => {
    if (!walletAddress) return Math.floor(Math.random() * 10);
    const clean = walletAddress.toString().replace(/^0x/i, '');
    const last = clean.slice(-1);
    const parsed = parseInt(last, 16);
    if (Number.isNaN(parsed)) return Math.floor(Math.random() * 10);
    return parsed % 10;
};

const generateUniqueWalletReferralCode = async (user) => {
    const Model = user.constructor;
    const prefix = "TRK";

    for (let attempt = 0; attempt < 50; attempt++) {
        // Generate a 5-digit random number
        const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
        const code = `${prefix}${randomDigits}`;

        const exists = await Model.exists({ referralCode: code });
        if (!exists) return code;
    }

    // Fallback: extend slightly if needed (unlikely to collide 50 times with 5 digits)
    for (let attempt = 0; attempt < 10; attempt++) {
        const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
        const code = `${prefix}${randomDigits}`;
        const exists = await Model.exists({ referralCode: code });
        if (!exists) return code;
    }

    return null;
};

// Password hashing middleware
userSchema.pre('save', async function (next) {
    normalizeRealBalances(this);
    normalizeCashbackStats(this);
    normalizeTeamStats(this);

    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }

    if (!this.referralCode) {
        const code = await generateUniqueWalletReferralCode(this);
        if (code) this.referralCode = code;
    } else if (this.walletAddress) {
        // If legacy derived code, upgrade to TRK style
        const legacyCode = this.walletAddress.slice(2, 8).toUpperCase();
        const isLegacy = this.referralCode === legacyCode;
        const isDerived = !this.referralCode.startsWith('TRK');

        if (isLegacy || isDerived) {
            const code = await generateUniqueWalletReferralCode(this);
            if (code) this.referralCode = code;
        }
    }

    this.updatedAt = Date.now();
    next();
});

userSchema.post('init', function (doc) {
    normalizeRealBalances(doc);
    normalizeCashbackStats(doc);
    normalizeTeamStats(doc);
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

// Virtual properties for 6-Wallet display
userSchema.virtual('realBalances.grandTotal').get(function () {
    if (!this.realBalances) return 0;
    return (this.realBalances.game || 0) +
        (this.realBalances.cashbackROI || 0) +
        (this.realBalances.luckyDrawWallet || 0) +
        (this.realBalances.winners || 0) +
        (this.realBalances.directLevel || 0) +
        (this.realBalances.cash || 0);
});

userSchema.virtual('wallets').get(function () {
    return {
        main: this.walletAddress || 'Not Connected',
        game: this.realBalances.game || 0,
        practice: this.practiceBalance || 0,
        cashbackROI: this.realBalances.cashbackROI || 0,
        luckyDraw: this.realBalances.luckyDrawWallet || 0,
        bd: 'Managed by Smart Contract'
    };
});

// Enable virtuals in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });


const User = mongoose.model('User', userSchema);

module.exports = User;
