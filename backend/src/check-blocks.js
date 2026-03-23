const { ethers } = require('ethers');

async function check() {
    const mainnet = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");
    const testnet = new ethers.JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545/");
    
    try {
        const m = await mainnet.getBlockNumber();
        const t = await testnet.getBlockNumber();
        console.log('Mainnet:', m);
        console.log('Testnet:', t);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

check();
