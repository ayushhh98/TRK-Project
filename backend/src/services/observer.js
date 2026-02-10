const { ethers } = require('ethers');
const { TRKGameABI } = require('../config/abis'); // Need to ensure this path exists or create it
const User = require('../models/User');

const GAME_CONTRACT_ADDRESS = "0xD03507EE1A28A5CA433D790E5F1a82848316BBd5";
const BSC_RPC_URL = process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/";

/**
 * On-Chain Event Observer
 * Listens for smart contract events on BSC Mainnet and broadcasts them via Socket.io
 */
const startObserver = (io) => {
    console.log('📡 Starting On-Chain Event Observer...');

    try {
        const provider = new ethers.JsonRpcProvider(BSC_RPC_URL);
        const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, TRKGameABI, provider);

        // 1. Listen for User Registrations
        contract.on("UserRegistered", async (userAddress, referrer, userId) => {
            console.log(`👤 New User Registered: ${userAddress} (Referrer: ${referrer})`);

            // Broadcast to all clients for live feed
            io.emit('live_activity', {
                type: 'REGISTRATION',
                user: userAddress,
                timestamp: new Date().toISOString()
            });

            // Sync with DB if needed (optional, depends on if frontend handles registration)
            // Note: Registration usually happens via frontend, but observers ensure redundancy.
        });

        // 2. Listen for Bets Placed
        contract.on("BetPlaced", async (userAddress, roundId, number, amount, isCash) => {
            const amountEth = ethers.formatEther(amount);
            console.log(`🎲 Bet Placed: ${userAddress} | Round: ${roundId} | Number: ${number} | Amount: ${amountEth} USDT`);

            io.emit('live_activity', {
                type: 'BET',
                user: userAddress,
                amount: amountEth,
                prediction: number.toString(),
                isCash,
                timestamp: new Date().toISOString()
            });
        });

        // 3. Listen for Wins Claimed
        contract.on("WinClaimed", async (userAddress, amount, roundId, isCash) => {
            const amountEth = ethers.formatEther(amount);
            console.log(`🏆 Win Claimed: ${userAddress} | Amount: ${amountEth} USDT`);

            io.emit('live_activity', {
                type: 'WIN',
                user: userAddress,
                amount: amountEth,
                isCash,
                timestamp: new Date().toISOString()
            });

            // Update user balance in DB in real-time if they are online
            // (Frontend will also refresh, but this ensures global sync)
        });

        // 4. Listen for Lucky Draw Wins
        contract.on("LuckyDrawPaid", async (winner, amount) => {
            const amountEth = ethers.formatEther(amount);
            console.log(`🎁 Lucky Draw Win: ${winner} | Amount: ${amountEth} USDT`);

            io.emit('live_activity', {
                type: 'LUCKY_DRAW',
                user: winner,
                amount: amountEth,
                timestamp: new Date().toISOString()
            });
        });

        provider.on("error", (tx) => {
            console.error("RPC Provider Error, restarting observer in 5s...", tx);
            setTimeout(() => startObserver(io), 5000);
        });

        console.log('✅ Observer initialized and listening for events on:', GAME_CONTRACT_ADDRESS);

    } catch (error) {
        console.error('❌ Failed to start observer:', error);
        setTimeout(() => startObserver(io), 10000);
    }
};

module.exports = { startObserver };
