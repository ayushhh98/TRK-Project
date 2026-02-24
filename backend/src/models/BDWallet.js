const mongoose = require('mongoose');

const bdWalletSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['TREASURY', 'BD', 'JACKPOT', 'MARKETING'],
        default: 'BD'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('BDWallet', bdWalletSchema);
