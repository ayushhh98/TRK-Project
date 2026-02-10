const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL);
    const address = "0x306192901Be6eBc2B238aF8981b5FA6d7e6198d1";
    const balance = await provider.getBalance(address);
    console.log(`Balance of ${address}: ${ethers.formatEther(balance)} BNB`);
}

main().catch(console.error);
