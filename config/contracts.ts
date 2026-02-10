export const CONTRACTS = {
    56: { // BSC Mainnet
        USDT: "0x55d398326f99059fF775485246999027B3197955",
        GAME: "0xD03507EE1A28A5CA433D790E5F1a82848316BBd5",
        LUCKY_DRAW: "0x6789...abcd"
    },
    97: { // BSC Testnet
        USDT: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // Common Testnet USDT
        GAME: "0xD03507EE1A28A5CA433D790E5F1a82848316BBd5", // Assuming same for now, or replace with actual testnet deploy
        LUCKY_DRAW: "0x6789...abcd"
    }
} as const;

// Legacy exports for backward compatibility if needed, but we should migrate to dynamic access
export const USDT_ADDRESS = CONTRACTS[56].USDT;
export const GAME_CONTRACT_ADDRESS = CONTRACTS[56].GAME;
export const LUCKY_DRAW_ADDRESS = CONTRACTS[56].LUCKY_DRAW;
