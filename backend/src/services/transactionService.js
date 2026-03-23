const Transaction = require('../models/Transaction');
const { logger } = require('../utils/logger');

class TransactionService {
    /**
     * Record a transaction in the master ledger system.
     */
    static async logTransaction({
        userId,
        walletAddress,
        type,
        amount,
        fee = 0,
        status = 'COMPLETED',
        txHash = null,
        source = null,
        metadata = {}
    }) {
        try {
            const netAmount = amount - fee;
            
            const tx = new Transaction({
                userId,
                walletAddress,
                type,
                amount,
                fee,
                netAmount,
                status,
                txHash,
                source: source ? String(source) : undefined,
                metadata
            });
            
            await tx.save();
            return tx;
        } catch (error) {
            logger.error(`Critical ledger explicitly failed to trace ${type} for ${walletAddress}`, error);
        }
    }
}

module.exports = TransactionService;
