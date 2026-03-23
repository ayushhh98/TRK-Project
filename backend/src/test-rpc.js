const { ethers } = require('ethers');

async function check() {
    const rpcUrl = "https://bsc-dataseed.binance.org/";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    try {
        const block = await provider.getBlockNumber();
        console.log('Current Block:', block);
        
        const logs = await provider.getLogs({
            address: "0xdD3507ee1a28a5ca433d790e5f1a82048316bbd5",
            fromBlock: block - 5,
            toBlock: 'latest'
        });
        console.log('Logs found:', logs.length);
    } catch (err) {
        console.error('Error:', err.message);
        if (err.info) {
            console.error('Error Info:', JSON.stringify(err.info, null, 2));
        }
    }
}

check();
