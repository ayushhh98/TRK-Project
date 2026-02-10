const hre = require("hardhat");

async function main() {
    console.log("Starting deployment...");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const networkName = hre.network.name;
    let usdtAddress;

    // 1. Determine USDT Address
    if (networkName === "bscTestnet" || networkName === "localhost" || networkName === "hardhat") {
        console.log("Network is Testnet/Local. Deploying MockUSDT...");
        const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
        const mockUsdt = await MockUSDT.deploy();
        await mockUsdt.waitForDeployment();
        usdtAddress = await mockUsdt.getAddress();
        console.log(`MockUSDT deployed to: ${usdtAddress}`);
    } else {
        // Mainnet - BSC USDT
        console.log("Network is Mainnet. Using real USDT address.");
        usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
    }

    // 2. Set Wallets (Adjust these if you want different recipients)
    const CREATOR_WALLET = deployer.address;
    const FEW_WALLET = deployer.address;
    const BD_WALLETS = Array(20).fill(deployer.address);

    console.log("Deploying TRKGameFinal...");
    const TRKGameFinal = await hre.ethers.getContractFactory("TRKGameFinal");
    const contract = await TRKGameFinal.deploy(
        usdtAddress,
        CREATOR_WALLET,
        FEW_WALLET,
        BD_WALLETS
    );

    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("TRKGameFinal deployed to:", contractAddress);

    // Commands for the user to remember
    console.log("\nTo verify this contract run:");
    console.log(`npx hardhat verify --network ${networkName} ${contractAddress} "${usdtAddress}" "${CREATOR_WALLET}" "${FEW_WALLET}" '${JSON.stringify(BD_WALLETS)}'`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
