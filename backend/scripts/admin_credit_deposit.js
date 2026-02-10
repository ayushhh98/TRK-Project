const hre = require("hardhat");

async function main() {
    const [owner] = await hre.ethers.getSigners();
    console.log("Executing Admin Credit from account:", owner.address);

    // Configuration
    // REPLACE THIS WITH THE USER'S WALLET ADDRESS WHO IS MISSING FUNDS
    const TARGET_USER_ADDRESS = "0x306192901Be6eBc2B238aF8981b5FA6d7e6198d1";

    // REPLACE THIS WITH THE AMOUNT MISSED (e.g. "6" for 6 USDT)
    const AMOUNT_TO_CREDIT = "6";

    // Address of the deployed TRKGameFinal contract
    const GAME_CONTRACT_ADDRESS = "0xD03507EE1A28A5CA433D790E5F1a82848316BBd5";

    const TRKGameFinal = await hre.ethers.getContractFactory("TRKGameFinal");
    const game = TRKGameFinal.attach(GAME_CONTRACT_ADDRESS);

    console.log(`Crediting ${AMOUNT_TO_CREDIT} USDT to ${TARGET_USER_ADDRESS}...`);

    // Convert amount to 18 decimals (assuming USDT is 18 decimals in this testnet setup, 
    // if it's 6 decimals on mainnet, change utils.parseUnits(..., 6))
    const amountWei = hre.ethers.parseUnits(AMOUNT_TO_CREDIT, 18);

    try {
        const tx = await game.manualCreditDeposit(TARGET_USER_ADDRESS, amountWei);
        console.log("Transaction sent:", tx.hash);

        await tx.wait();
        console.log("✅ Deposit successfully credited!");

    } catch (error) {
        console.error("❌ Error executing credit:", error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
