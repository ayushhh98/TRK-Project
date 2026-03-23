const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    walletAddress: { type: String, required: true, index: true },
    type: { 
        type: String, 
        enum: ['DEPOSIT', 'WITHDRAWAL', 'GAME_ENTRY', 'GAME_WIN', 'REFERRAL', 'CASHBACK', 'ROI_ON_ROI', 'LUCKY_DRAW_TICKET', 'LUCKY_DRAW_REWARD', 'COMMISSION', 'OTHER'], 
        required: true, 
        index: true 
    },
    amount: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['PENDING', 'COMPLETED', 'FAILED'], 
        default: 'COMPLETED',
        index: true
    },
    txHash: { type: String, index: true },
    source: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
}, {
    timestamps: true
});

transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ walletAddress: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
