const hre = require("hardhat");

async function main() {
    const GAME_CONTRACT_ADDRESS = "0xD03507EE1A28A5CA433D790E5F1a82848316BBd5";
    const TARGET_USER_ADDRESS = "0x306192901Be6eBc2B238aF8981b5FA6d7e6198d1"; // The user

    const TRKGameFinal = await hre.ethers.getContractFactory("TRKGameFinal");
    const game = TRKGameFinal.attach(GAME_CONTRACT_ADDRESS);

    console.log(`Checking balance for ${TARGET_USER_ADDRESS}...`);

    const balances = await game.getUserBalances(TARGET_USER_ADDRESS);

    // Destructure based on ABI
    // walletBalance, practiceBalance, cashGameBalance, cashbackIncome, teamVolume, totalDeposit
    const walletBal = hre.ethers.formatUnits(balances[0], 18);
    const practiceBal = hre.ethers.formatUnits(balances[1], 18);
    const cashGameBal = hre.ethers.formatUnits(balances[2], 18);
    const totalDeposit = hre.ethers.formatUnits(balances[5], 18);

    console.log("--- ON-CHAIN BALANCES ---");
    console.log("Wallet Balance (Withdrawable):", walletBal);
    console.log("Cash Game Balance (Playable):", cashGameBal);
    console.log("Total Deposit:", totalDeposit);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
