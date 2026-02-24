const mongoose = require('mongoose');

const bdTransactionSchema = new mongoose.Schema({
    txHash: {
        type: String,
        unique: true,
        index: true
    },
    type: {
        type: String,
        enum: ['INFLOW', 'OUTFLOW'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    module: {
        type: String,
        enum: ['Cashback', 'Jackpot', 'Club', 'Sustainability', 'Referral', 'Marketing', 'Treasury'],
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    blockNumber: {
        type: Number
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BDTransaction', bdTransactionSchema);
