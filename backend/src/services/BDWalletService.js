const BDTransaction = require('../models/BDTransaction');
const BDWallet = require('../models/BDWallet');
const SystemConfig = require('../models/SystemConfig');
const { logger } = require('../utils/logger');
const { ethers } = require('ethers');

class BDWalletService {
    constructor(io) {
        this.io = io;
        this.rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
        this.usdtAddress = process.env.USDT_CONTRACT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955';
        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
        this.usdtAbi = [
            "function balanceOf(address account) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];
        this.usdtContract = new ethers.Contract(this.usdtAddress, this.usdtAbi, this.provider);
        this.bscScanApiKey = process.env.BSCSCAN_API_KEY;
        this.lastSyncTime = 0;
        this.syncInterval = 5 * 60 * 1000; // 5 minutes throttle

        // Initial seed check
        this.seedFromEnv().catch(err => logger.error('BDWallet seeding failed:', err));
    }

    async seedFromEnv() {
        const count = await BDWallet.countDocuments();
        if (count === 0 && process.env.BD_WALLETS) {
            try {
                const wallets = JSON.parse(process.env.BD_WALLETS);
                await BDWallet.insertMany(wallets.map(w => ({
                    name: w.name,
                    address: w.address,
                    type: w.type || 'BD',
                    isActive: true
                })));
                logger.info(`Seeded ${wallets.length} BD wallets from .env`);
            } catch (error) {
                logger.error('Failed to parse BD_WALLETS from .env:', error);
            }
        }
    }

    async fetchRealBalance(address) {
        try {
            const balance = await this.usdtContract.balanceOf(address);
            const decimals = await this.usdtContract.decimals();
            return parseFloat(ethers.formatUnits(balance, decimals));
        } catch (error) {
            logger.error(`Failed to fetch balance for ${address}:`, error);
            return 0;
        }
    }

    async getStats() {
        try {
            const wallets = await BDWallet.find({ isActive: true });
            const now = new Date();
            const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Fetch real balances in parallel
            const walletBalances = await Promise.all(wallets.map(async (w) => {
                const balance = await this.fetchRealBalance(w.address);
                return {
                    ...w.toObject(),
                    currentBalance: balance
                };
            }));

            const totalBalance = walletBalances.reduce((sum, w) => sum + w.currentBalance, 0);

            const aggregation = await BDTransaction.aggregate([
                { $match: { timestamp: { $gt: dayAgo } } },
                {
                    $group: {
                        _id: '$type',
                        total: { $sum: '$amount' }
                    }
                }
            ]);

            const stats = {
                wallets: walletBalances,
                totalBalance,
                dayInflow: aggregation.find(a => a._id === 'INFLOW')?.total || 0,
                dayOutflow: aggregation.find(a => a._id === 'OUTFLOW')?.total || 0,
                isActive: true,
                network: 'BEP-20 (BSC)',
                timestamp: now.toISOString()
            };

            return stats;
        } catch (error) {
            logger.error('BD Wallet Service getStats error:', error);
            throw error;
        }
    }

    async broadcastStats() {
        if (!this.io) return;
        try {
            const stats = await this.getStats();
            this.io.emit('admin:bd_wallet_stats', stats);
        } catch (error) {
            logger.error('BD Wallet Service broadcast error:', error);
        }
    }

    async getTransactionHistory(limit = 20) {
        try {
            // Trigger sync if needed (throttled)
            const now = Date.now();
            if (now - this.lastSyncTime > this.syncInterval) {
                this.syncTransactions().catch(err => logger.error('Auto-sync failed:', err));
            }
            return await BDTransaction.find().sort({ timestamp: -1 }).limit(limit);
        } catch (error) {
            logger.error('BD Wallet Service getHistory error:', error);
            throw error;
        }
    }

    async syncTransactions() {
        if (!this.bscScanApiKey) {
            logger.warn('BSCSCAN_API_KEY not found, skipping sync');
            return;
        }

        try {
            this.lastSyncTime = Date.now();
            const wallets = await BDWallet.find({ isActive: true });
            logger.info(`Starting on-chain sync for ${wallets.length} wallets...`);

            const moduleMap = {
                'TREASURY': 'Treasury',
                'BD': 'Club',
                'JACKPOT': 'Jackpot',
                'MARKETING': 'Marketing'
            };

            for (const wallet of wallets) {
                const url = `https://api.etherscan.io/v2/api?chainid=56&module=account&action=tokentx&contractaddress=${this.usdtAddress}&address=${wallet.address}&page=1&offset=50&startblock=0&endblock=999999999&sort=desc&apikey=${this.bscScanApiKey}`;
                logger.info(`Syncing wallet: ${wallet.name} (${wallet.address})`);

                const response = await fetch(url);
                const data = await response.json();

                if (data.status !== '1') {
                    logger.warn(`BscScan API warning/error for ${wallet.name}: ${data.message} - ${data.result}`);
                }

                if (data.status === '1' && Array.isArray(data.result)) {
                    logger.info(`Found ${data.result.length} transfers for ${wallet.name}`);
                    const ops = data.result.map(tx => {
                        const amount = parseFloat(ethers.formatUnits(tx.value, parseInt(tx.tokenDecimal || "18")));
                        const type = tx.to.toLowerCase() === wallet.address.toLowerCase() ? 'INFLOW' : 'OUTFLOW';

                        return {
                            updateOne: {
                                filter: { txHash: tx.hash },
                                update: {
                                    $setOnInsert: {
                                        txHash: tx.hash,
                                        type,
                                        amount,
                                        module: moduleMap[wallet.type] || 'Treasury',
                                        reason: `On-Chain ${wallet.type} Sync`,
                                        blockNumber: parseInt(tx.blockNumber),
                                        timestamp: new Date(parseInt(tx.timeStamp) * 1000)
                                    }
                                },
                                upsert: true
                            }
                        };
                    });

                    if (ops.length > 0) {
                        await BDTransaction.bulkWrite(ops);
                    }
                }
                // Avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            logger.info('On-chain sync completed');
            this.broadcastStats(); // Update frontend with new aggregated data
        } catch (error) {
            logger.error('BD Wallet Service sync error:', error);
            throw error;
        }
    }
}

module.exports = BDWalletService;
