"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getWagmiConfig, projectId } from "@/config/wagmi";
import { ReactNode, useState, createContext, useContext, useEffect } from "react";
import { io, Socket } from "socket.io-client";

let web3ModalInstance: any = null;
let web3ModalInitPromise: Promise<any> | null = null;

const initWeb3Modal = async () => {
    if (web3ModalInstance) return web3ModalInstance;
    if (typeof window === "undefined") return null;

    if (!web3ModalInitPromise) {
        web3ModalInitPromise = import('@web3modal/wagmi/react').then(({ createWeb3Modal }) => {
            web3ModalInstance = createWeb3Modal({
                wagmiConfig: getWagmiConfig(),
                projectId,
                enableAnalytics: false,
                enableOnramp: true,
                allWallets: 'HIDE',
                enableEIP6963: true,
                themeVariables: {
                    '--w3m-accent': '#10b981', // Emerald 500
                    '--w3m-border-radius-master': '1px',
                    '--w3m-font-family': 'Inter, sans-serif'
                }
            });
            return web3ModalInstance;
        });
    }

    return web3ModalInitPromise;
};

export const openWeb3Modal = async () => {
    const modal = await initWeb3Modal();
    if (!modal) return;
    await modal.open();
};

// Create Socket Context
const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => useContext(SocketContext);

export let socket: Socket | null = null;

export function Web3Provider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());
    const [wagmiConfig] = useState(() => getWagmiConfig());
    const [socketReady, setSocketReady] = useState(false);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:5000";

        if (!socket) {
            socket = io(socketUrl, {
                withCredentials: true,
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                auth: (cb) => {
                    const token = localStorage.getItem('trk_token');
                    cb({ token });
                }
            });

            socket.on("connect", () => {
                console.log("🔌 Connected to Real-Time Feed:", socket?.id);
                setSocketReady(true);
            });

            socket.on("connect_error", (err) => {
                // If auth error, try reconnecting without token (guest mode) or refresh
                console.warn("🔌 Socket Connection Warning:", err.message);
            });

            socket.on("disconnect", (reason) => {
                if (reason === "io server disconnect") {
                    // the disconnection was initiated by the server, you need to reconnect manually
                    socket?.connect();
                }
            });
        }

        // Listen for storage changes (login/logout in other tabs)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'trk_token' && socket) {
                socket.auth = { token: e.newValue };
                socket.disconnect().connect();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Custom event for same-tab auth refresh
        const handleAuthChange = (e: Event) => {
            if (socket) {
                console.log("🔄 Re-syncing Socket Stream...");
                const freshToken = localStorage.getItem('trk_token');
                socket.auth = { token: freshToken };
                socket.disconnect().connect();
            }
        };
        window.addEventListener('trk_auth_change', handleAuthChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('trk_auth_change', handleAuthChange);
            if (socket) {
                socket.close();
                socket = null;
            }
        };
    }, []);

    // Also update when the local user state changes (handled by WalletProvider usually)
    // For now, let's just rely on the mount token and storage event.
    // If the user logs in, WalletProvider will set the token and we might need a refresh.

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <SocketContext.Provider value={socket}>
                    {children}
                </SocketContext.Provider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
