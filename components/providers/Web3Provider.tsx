"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getWagmiConfig, projectId } from "@/config/wagmi";
import { getApiBase } from "@/lib/api";
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
                allWallets: 'SHOW',
                includeWalletIds: [
                    // Trust Wallet (WalletConnect Explorer ID)
                    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0'
                ],
                featuredWalletIds: [
                    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0'
                ],
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

export function Web3Provider({ children, initialState }: { children: ReactNode, initialState?: any }) {
    const [queryClient] = useState(() => new QueryClient());
    const [wagmiConfig] = useState(() => getWagmiConfig());
    const [socketState, setSocketState] = useState<Socket | null>(null);

    useEffect(() => {
        const originalWarn = console.warn;
        console.warn = (...args: any[]) => {
            const text = args
                .map(arg => (typeof arg === "string" ? arg : ""))
                .join(" ");
            if (text.includes("w3m-connecting") || text.includes("lit.dev/msg/change-in-update")) {
                return;
            }
            originalWarn(...args);
        };

        const socketUrl = getApiBase() || (process.env.NODE_ENV === 'production' ? "https://trk-backend.onrender.com" : "http://localhost:5000");

        if (socket) {
            setSocketState(socket);
        }

        if (!socket) {
            socket = io(socketUrl, {
                withCredentials: true,
                transports: ['websocket', 'polling'],
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                forceNew: true,
                auth: (cb) => {
                    const token = localStorage.getItem('trk_token');
                    cb({ token });
                }
            });
            setSocketState(socket);

            socket.on("connect", () => {
                console.log("🔌 Connected to Real-Time Feed:", socket?.id);
            });

            socket.on("connect_error", (err) => {
                console.warn("🔌 Socket Connection Warning:", err.message);
                // Attempt transport fallback if websocket fails
                const transports = socket?.io?.opts?.transports || [];
                const hasWebsocket = transports.some((transport: any) =>
                    typeof transport === "string"
                        ? transport === "websocket"
                        : transport?.name === "websocket"
                );
                const ioOptions = socket?.io?.opts;
                if (hasWebsocket && ioOptions) {
                    ioOptions.transports = ['polling'];
                }
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
            console.warn = originalWarn;
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('trk_auth_change', handleAuthChange);
            if (socket) {
                socket.close();
                socket = null;
                setSocketState(null);
            }
        };
    }, []);

    return (
        <WagmiProvider config={wagmiConfig} initialState={initialState}>
            <QueryClientProvider client={queryClient}>
                <SocketContext.Provider value={socketState}>
                    {children}
                </SocketContext.Provider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
