import { http, createConfig, cookieStorage, createStorage } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { metaMask, walletConnect, injected } from 'wagmi/connectors';

// WalletConnect Project ID (Load from Env or use public fallback)
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c57ca95b47569778a828d19178114f4d';

let cachedConfig: ReturnType<typeof createConfig> | null = null;

export const getWagmiConfig = () => {
    if (cachedConfig) return cachedConfig;

    const isBrowser = typeof window !== 'undefined';
    const connectors = isBrowser
        ? [
            metaMask({
                dappMetadata: {
                    name: 'TRK Cybernetic',
                    url: 'https://trk-game.com',
                }
            }),
            walletConnect({
                projectId,
                showQrModal: false,
                metadata: {
                    name: 'TRK Cybernetic',
                    description: 'TRK Blockchain Platform',
                    url: 'https://trk-game.com',
                    icons: ['https://trk-game.com/icon.png']
                }
            }),
            injected({ shimDisconnect: true }),
        ]
        : [];

    cachedConfig = createConfig({
        chains: [bsc, bscTestnet],
        ssr: true,
        storage: createStorage({
            storage: cookieStorage
        }),
        connectors,
        transports: {
            [bsc.id]: http('https://bsc-dataseed.binance.org/'),
            [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545/'),
        },
    });

    return cachedConfig;
};
