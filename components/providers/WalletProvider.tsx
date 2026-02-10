"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI, userAPI, gameAPI, depositAPI, packagesAPI, getToken, removeToken, getStoredUser, setStoredUser, setToken as setApiToken } from "@/lib/api";
import { useAccount, useConnect, useDisconnect, useSignMessage, useBalance, useSwitchChain, useWriteContract, useWalletClient, useReadContract, usePublicClient } from "wagmi";
import { openWeb3Modal } from "@/components/providers/Web3Provider";
import { toast } from "sonner";
import { bsc, bscTestnet } from "wagmi/chains";
import { TRKGameABI, ERC20ABI, TRKLuckyDrawABI } from "@/config/abis";
import { parseUnits, formatUnits } from "viem";

import { CONTRACTS } from "@/config/contracts";
import { socket } from "@/components/providers/Web3Provider";


interface GameHistoryItem {
    id: string;
    hash: string;
    amount: number;
    prediction: string | number;
    won: boolean;
    payout: number;
    timestamp: string;
    gameType: 'dice' | 'crash' | 'spin' | 'mines' | 'plinko' | 'matrix';
    roundId?: string; // On-chain round ID for claiming
}

interface DepositItem {
    amount: number;
    txHash: string;
    createdAt: string;
}

interface RealBalances {
    cash: number;
    game: number;
    cashback: number;
    lucky: number;
    directLevel: number;
    winners: number;
    roiOnRoi: number;
    club: number;
    walletBalance: number;
    totalUnified: number; // Aggregated balance for UI
}

const DEFAULT_REAL_BALANCES: RealBalances = {
    cash: 0,
    game: 0,
    cashback: 0,
    lucky: 0,
    directLevel: 0,
    winners: 0,
    roiOnRoi: 0,
    club: 0,
    walletBalance: 0,
    totalUnified: 0
};

interface Activation {
    tier: 'none' | 'tier1' | 'tier2';
    totalDeposited: number;
    canWithdrawDirectLevel: boolean;
    canWithdrawWinners: boolean;
    canTransferPractice: boolean;
    canWithdrawAll: boolean;
    cashbackActive: boolean;
    allStreamsUnlocked: boolean;
}

interface User {
    id: string;
    walletAddress: string;
    practiceBalance: number;
    realBalances: RealBalances;
    referralCode: string;
    clubRank: string;
    activation?: Activation;
    deposits?: DepositItem[];
    directReferrals?: number;
    isEmailVerified?: boolean;
    email?: string;
    isRegisteredOnChain?: boolean;
    role?: 'player' | 'admin' | 'superadmin';
    permissions?: string[];
    isBanned?: boolean;
    isActive?: boolean;
    teamStats?: {
        totalCommission: number;
        activeMembers: number;
        totalMembers: number;
    };
    cashbackStats?: {
        totalRecovered: number;
    };
    totalWinnings?: number;
    credits?: number;
    rewardPoints?: number;
    membershipLevel?: 'none' | 'starter' | 'premium' | 'vip';
    gameStats?: {
        dailySpins: number;
        lastSpin: string;
        dailyCapReset: string;
    };
    nonce?: string;
}

interface WalletContextType {
    isConnected: boolean;
    address: string | null;
    user: User | null;
    practiceBalance: string;
    realBalances: RealBalances;
    practiceExpiry: string | null;
    gameHistory: GameHistoryItem[];
    token: string | null;
    connect: (walletType: string) => Promise<void>;
    disconnect: () => void;
    recentWallets: string[];
    switchWallet: (targetAddress?: string) => Promise<void>;
    isSwitchingWallet: boolean;
    isWalletConnected: boolean;
    placeEntry: (amount: number, prediction: any, gameType?: GameHistoryItem['gameType']) => Promise<{ won: boolean, hash: string, payout?: number, luckyNumber?: any }>;
    realEntry: (amount: number, prediction: any, gameType?: GameHistoryItem['gameType']) => Promise<{ won: boolean, hash: string, payout?: number, luckyNumber?: any }>;
    redeem: (walletType: keyof RealBalances, amount: number) => Promise<boolean>;
    refreshUser: () => Promise<void>;
    switchNetwork: (chainId: number) => void;
    currentChainId: number | undefined;
    nativeBalance: string;
    usdtBalance: string;
    isLoading: boolean;
    purchaseMembership: (amount: number, packageType?: 'starter' | 'premium' | 'vip') => Promise<string>;
    claimWin: (roundId: number, isCash: boolean) => Promise<string>;
    claimLoss: (roundId: number, isCash: boolean) => Promise<string>;
    claimLiquiditySync: () => Promise<void>;
    linkWallet: () => Promise<void>;
    registerOnChain: () => Promise<void>;
    deposit: (amount: number) => Promise<void>;
    withdraw: (amount: number, type: string) => Promise<void>;

    isRegisteredOnChain: boolean;
    login: () => Promise<void>;
    unclaimedRounds: bigint[];
    refetchUnclaimed: () => void;
    buyLuckyDrawTickets: (quantity: number) => Promise<any>;
    buyTicketsWithGameBalance: (quantity: number) => Promise<any>;
    isRealMode: boolean;
    setIsRealMode: (mode: boolean) => void;
    hasRealAccess: boolean;
    participate: (amount: number, prediction: any, gameType: GameHistoryItem['gameType']) => Promise<{ won: boolean, payout: number, hash: string, luckyNumber?: any }>;
    faucet: () => Promise<any>;
    addresses: { USDT: string, GAME: string, LUCKY_DRAW: string };
    deposits: DepositItem[];
    loadMoreHistory: () => Promise<void>;
    hasMoreHistory: boolean;
    isHistoryLoading: boolean;
    totalProfit: number;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_HISTORY_KEY = "trk_recent_wallets";
const PREFERRED_WALLET_KEY = "trk_preferred_wallet";
const MAX_RECENT_WALLETS = 5;
const LOGIN_COOLDOWN_KEY = "trk_login_cooldown_until";
const LOGIN_THROTTLE_MS = 4000;
const WALLET_CONNECT_REQUEST_KEY = "trk_wallet_connect_requested";

const normalizeWalletList = (items: unknown[]) => {
    const seen = new Set<string>();
    const next: string[] = [];
    for (const item of items) {
        if (typeof item !== "string") continue;
        const trimmed = item.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(trimmed);
    }
    return next.slice(0, MAX_RECENT_WALLETS);
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const { address: wagmiAddress, isConnected: isWagmiConnected, chainId } = useAccount();
    const { connectors, connectAsync } = useConnect();
    const { disconnect: wagmiDisconnect } = useDisconnect();
    const { signMessageAsync } = useSignMessage();
    const { switchChain, switchChainAsync } = useSwitchChain();
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();

    // Dynamic Address Helper
    const addresses = React.useMemo(() => {
        const chain = (chainId && CONTRACTS[chainId as keyof typeof CONTRACTS])
            ? chainId as keyof typeof CONTRACTS
            : 56; // Default to BSC Mainnet
        return CONTRACTS[chain];
    }, [chainId]);

    const { data: balanceData } = useBalance({ address: wagmiAddress });
    // Fetch USDT Balance explicitly via contract read to avoid wagmi version conflicts
    const { data: usdtBalanceRaw, refetch: refetchUsdt } = useReadContract({
        address: addresses.USDT as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [wagmiAddress as `0x${string}`],
        query: {
            enabled: !!wagmiAddress
        }
    });
    const { data: walletClient } = useWalletClient({ account: wagmiAddress });
    // openWeb3Modal is a safe helper that initializes Web3Modal on demand (client-only)

    const [user, setUser] = useState<User | null>(null);
    const [practiceBalance, setPracticeBalance] = useState("0.00");
    const [realBalances, setRealBalances] = useState<RealBalances>(DEFAULT_REAL_BALANCES);
    const [practiceExpiry, setPracticeExpiry] = useState<string | null>(null);
    const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegisteredOnChain, setIsRegisteredOnChain] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [recentWallets, setRecentWallets] = useState<string[]>([]);
    const [isSwitchingWallet, setIsSwitchingWallet] = useState(false);
    const [unclaimedRounds, setUnclaimedRounds] = useState<bigint[]>([]);

    // History Pagination State
    const [historyPage, setHistoryPage] = useState(1);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const [isRealMode, setIsRealMode] = useState(false);
    const [totalProfit, setTotalProfit] = useState(0);

    const router = useRouter();
    const wagmiAddressRef = React.useRef<typeof wagmiAddress>(wagmiAddress);
    const wagmiConnectedRef = React.useRef(isWagmiConnected);
    const lastLoginAttemptRef = React.useRef(0);
    const onchainSyncInFlightRef = React.useRef(false);
    const lastOnchainSyncRef = React.useRef(0);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const hasRealAccess = React.useMemo(() => {
        const totalDeposited = user?.activation?.totalDeposited || 0;
        const realTotal = (realBalances.game || 0) + (realBalances.walletBalance || 0) + (realBalances.cash || 0);
        return totalDeposited > 0 || realTotal > 0;
    }, [user?.activation?.totalDeposited, realBalances.game, realBalances.walletBalance, realBalances.cash]);

    // Load mode preference from storage (default to practice until real access is unlocked)
    useEffect(() => {
        const savedMode = localStorage.getItem("trk_game_mode");
        if (savedMode === "real") {
            setIsRealMode(hasRealAccess);
        } else if (savedMode === "practice") {
            setIsRealMode(false);
        } else {
            setIsRealMode(hasRealAccess);
        }
    }, [hasRealAccess]);

    const handleSetIsRealMode = (mode: boolean) => {
        if (mode && !hasRealAccess) {
            toast.error("Deposit required", {
                description: "Add funds to unlock real money gameplay."
            });
            return;
        }
        setIsRealMode(mode);
        localStorage.setItem("trk_game_mode", mode ? "real" : "practice");
        toast.info(mode ? "Switched to REAL MONEY mode" : "Switched to PRACTICE mode");
    };

    const setWalletConnectRequested = (value: boolean) => {
        if (value) {
            localStorage.setItem(WALLET_CONNECT_REQUEST_KEY, "true");
        } else {
            localStorage.removeItem(WALLET_CONNECT_REQUEST_KEY);
        }
    };

    const upsertRecentWallet = React.useCallback((address: string) => {
        const normalized = address.toLowerCase();
        setRecentWallets(prev => {
            const next = normalizeWalletList([address, ...prev.filter(item => item.toLowerCase() !== normalized)]);
            localStorage.setItem(WALLET_HISTORY_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    // Load recent wallets from storage
    useEffect(() => {
        const stored = localStorage.getItem(WALLET_HISTORY_KEY);
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                const cleaned = normalizeWalletList(parsed);
                setRecentWallets(cleaned);
                localStorage.setItem(WALLET_HISTORY_KEY, JSON.stringify(cleaned));
            }
        } catch (err) {
            console.warn("Failed to parse recent wallet history", err);
        }
    }, []);

    // Update recent wallets when address changes
    useEffect(() => {
        if (wagmiAddress) {
            upsertRecentWallet(wagmiAddress);
        }
    }, [wagmiAddress, upsertRecentWallet]);

    useEffect(() => {
        wagmiAddressRef.current = wagmiAddress;
    }, [wagmiAddress]);

    useEffect(() => {
        wagmiConnectedRef.current = isWagmiConnected;
    }, [isWagmiConnected]);

    useEffect(() => {
        if (!isSwitchingWallet) {
            localStorage.removeItem(PREFERRED_WALLET_KEY);
        }
    }, [isSwitchingWallet]);

    // Sync isRegisteredOnChain when user loads
    useEffect(() => {
        if (user?.isRegisteredOnChain) {
            setIsRegisteredOnChain(true);
        }
    }, [user]);

    // Check Unclaimed Winnings
    const { data: unclaimedData, refetch: refetchUnclaimed } = useReadContract({
        address: addresses.GAME as `0x${string}`,
        abi: TRKGameABI,
        functionName: 'getUnclaimedRounds',
        args: [wagmiAddress as `0x${string}`, true], // true = Cash Game
        query: {
            enabled: !!wagmiAddress
        }
    });

    useEffect(() => {
        if (unclaimedData) {
            // @ts-ignore
            const rounds = Array.isArray(unclaimedData) ? unclaimedData : [];
            setUnclaimedRounds(rounds);

            if (rounds.length > 0) {
                toast.info(`${rounds.length} Assets Pending Sync`, {
                    id: "unclaimed-sync-notif",
                    description: "Winnings or protection detected on-chain. Sync now in Income Dashboard.",
                    action: {
                        label: "Sync Now",
                        onClick: () => router.push("/dashboard/income")
                    }
                });
            }
        }
    }, [unclaimedData]);

    // Fetch Dual Balances (Gaming + Withdrawable)
    const { data: userBalancesData, refetch: refetchOnChainBalances } = useReadContract({
        address: addresses.GAME as `0x${string}`,
        abi: TRKGameABI,
        functionName: 'getUserBalances',
        args: [wagmiAddress as `0x${string}`],
        query: {
            enabled: !!wagmiAddress,
            refetchInterval: 10000,
        }
    });

    useEffect(() => {
        const maybeSyncOnchainBalance = async (onChainGame: number, backendGame: number) => {
            if (!token || !user) return;
            const diff = Number((onChainGame - backendGame).toFixed(2));
            if (diff < 1.5) return;
            const now = Date.now();
            if (onchainSyncInFlightRef.current || (now - lastOnchainSyncRef.current) < 60000) return;

            onchainSyncInFlightRef.current = true;
            lastOnchainSyncRef.current = now;
            try {
                await depositAPI.deposit(diff, `onchain-sync-${now}`);
                await refreshUser();
            } catch (err) {
                console.warn("On-chain balance sync failed:", err);
            } finally {
                onchainSyncInFlightRef.current = false;
            }
        };

        if (userBalancesData && Array.isArray(userBalancesData)) {
            const [walletBal, practiceBal, cashGameBal, cashback, volume, deposit] = userBalancesData as any[];

            // HYBRID SYNC: Resolve conflict between On-Chain (Contract) and Off-Chain (Manual DB Credit).
            // We take the MAX value to ensure that if a manual credit exists in DB but not on legacy contract, it is shown.
            const onChainGame = Number(formatUnits(cashGameBal || 0n, 18));
            const backendGame = user?.realBalances?.game || 0;
            const finalGame = Math.max(onChainGame, backendGame);

            if (onChainGame > backendGame) {
                maybeSyncOnchainBalance(onChainGame, backendGame);
            }

            setRealBalances(prev => {
                const wBal = Number(formatUnits(walletBal || 0n, 18));
                const gBal = finalGame;
                return {
                    ...prev,
                    cash: wBal,
                    game: gBal,
                    cashback: Number(formatUnits(cashback || 0n, 18)),
                    practice: Number(formatUnits(practiceBal || 0n, 18)),
                    walletBalance: wBal,
                    totalUnified: gBal + wBal
                };
            });
            const formattedPractice = formatUnits(practiceBal || 0n, 18);
            setPracticeBalance(Number(formattedPractice).toFixed(2));
        }
    }, [userBalancesData, usdtBalanceRaw, user?.realBalances?.game]);


    // SYNC: When network changes, refresh all data immediately
    useEffect(() => {
        if (isWagmiConnected && chainId) {
            console.log("Chain change detected, refreshing context...");
            refreshUser();
        }
    }, [chainId, isWagmiConnected]);

    // Check for existing session on mount
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = getToken();
            const storedUser = getStoredUser();

            if (storedToken && storedUser) {
                try {
                    const response = await userAPI.getMe();
                    if (response.data?.user) {
                        setUser(response.data.user);
                        setPracticeBalance(response.data.user.practiceBalance?.toString() || "0.00");
                        setRealBalances(response.data.user.realBalances || {
                            cash: 0, game: 0, cashback: 0, lucky: 0, directLevel: 0, winners: 0, roiOnRoi: 0, club: 0, walletBalance: 0, totalUnified: 0
                        });
                        setToken(storedToken);

                        // Fetch initial history
                        try {
                            const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
                            const historyRes = await fetch(`${apiBase}/api/game/history?limit=20&page=1`, {
                                headers: { 'Authorization': `Bearer ${storedToken}` }
                            }).then(r => r.json());

                            if (historyRes.status === 'success' && Array.isArray(historyRes.data.games)) {
                                const mappedHistory: GameHistoryItem[] = historyRes.data.games.map((g: any) => ({
                                    id: g._id,
                                    hash: g.txHash || `GAME-${g._id.slice(-6)}`,
                                    amount: g.betAmount,
                                    prediction: g.pickedNumber,
                                    won: g.isWin,
                                    payout: g.payout,
                                    timestamp: g.createdAt,
                                    gameType: g.gameVariant || 'dice',
                                    roundId: g.roundId
                                }));
                                setGameHistory(mappedHistory);
                                setHasMoreHistory(mappedHistory.length < historyRes.data.pagination.total);
                            }
                        } catch (hErr) {
                            console.error("Failed to load initial history:", hErr);
                        }
                    }
                } catch (error) {
                    console.error("Session validation failed", error);
                }
            }
            setIsLoading(false);
        };
        initAuth();

        // Listen for external auth changes (e.g. from Email Login)
        const handleAuthChange = () => {
            const freshToken = getToken();
            const freshUser = getStoredUser();
            if (freshToken && freshUser) {
                setToken(freshToken);
                setUser(freshUser);
                setPracticeBalance(freshUser.practiceBalance?.toString() || "0.00");
                if (freshUser.realBalances) {
                    setRealBalances({
                        ...freshUser.realBalances,
                        totalUnified: (freshUser.realBalances.cash || 0) + (freshUser.realBalances.game || 0)
                    });
                }
                refreshUser();
            } else {
                setToken(null);
                setUser(null);
            }
        };

        window.addEventListener('trk_auth_change', handleAuthChange);
        return () => window.removeEventListener('trk_auth_change', handleAuthChange);
    }, []);

    // REAL-TIME POLLING: Sync balances from blockchain every 10 seconds
    useEffect(() => {
        if (!wagmiAddress || !isWagmiConnected) return;

        const syncBalances = async () => {
            try {
                // We use a direct fetch logic here instead of useReadContract for the interval
                // This is simpler for periodic updates in a provider
                const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

                // In a production app, we'd use ethers/viem provider directly.
                // For now, let's trigger a refresh via our existing helper.
                await refreshUser();

            } catch (err) {
                console.error("Polling sync failed", err);
            }
        };

        const interval = setInterval(syncBalances, 8000); // 8 second sync
        return () => clearInterval(interval);
    }, [wagmiAddress, isWagmiConnected]);

    // Flag to prevent auth attempts during logout
    const isDisconnectingRef = React.useRef(false);
    // Flag to prevent overlapping login calls
    const loginInProgressRef = React.useRef(false);

    // Handle Wagmi connection changes -> Login Flow
    const login = async () => {
        // 0. Safeguards
        if (isDisconnectingRef.current || loginInProgressRef.current) return;
        if (!isWagmiConnected || !wagmiAddress) return;

        const connectRequested = localStorage.getItem(WALLET_CONNECT_REQUEST_KEY) === "true";
        if (!connectRequested && !isSwitchingWallet) {
            return;
        }

        const now = Date.now();
        if (now - lastLoginAttemptRef.current < LOGIN_THROTTLE_MS) {
            return;
        }
        lastLoginAttemptRef.current = now;

        const cooldownUntil = Number(localStorage.getItem(LOGIN_COOLDOWN_KEY) || 0);
        if (cooldownUntil && now < cooldownUntil) {
            return;
        }

        const preferredWallet = localStorage.getItem(PREFERRED_WALLET_KEY);
        if (isSwitchingWallet && preferredWallet && preferredWallet.toLowerCase() !== wagmiAddress.toLowerCase()) {
            toast.error("Selected wallet mismatch.", {
                id: "wallet-switch-mismatch",
                description: "Switch to the chosen wallet address and try again."
            });
            return;
        }

        // ALREADY AUTHENTICATED CHECK (state or persisted)
        const storedToken = getToken();
        const storedUser = getStoredUser();
        const effectiveToken = token || storedToken;
        const effectiveUser = user || storedUser;

        // If we have a token and user, check if we need to do anything
            if (effectiveToken && effectiveUser) {
                // If the valid session matches the connected wallet, we are good.
                if (effectiveUser.walletAddress?.toLowerCase() === wagmiAddress.toLowerCase()) {
                    setWalletConnectRequested(false);
                    return;
                }

            // CRITICAL FIX: If we are logged in via Email (or another wallet), 
            // DO NOT auto-attempt to login with the new wallet and overwrite/fail the session.
            // Just return and let the user decide if they want to Link or Switch accounts manually.
                console.log("Valid session exists for different user/address. Skipping auto-wallet-login.");
                setWalletConnectRequested(false);
                return;
            }

        loginInProgressRef.current = true;
        const toastId = toast.loading("Establishing Secure Uplink...");

        try {
            // 1. Context Stability Check
            if (!walletClient) {
                console.log("Waiting for wallet client...");
                loginInProgressRef.current = false;
                toast.dismiss(toastId);
                return;
            }

            // 2. Network Enforcement (BSC)
            const bscChainId = 56;
            const testnetChainId = 97;
            const targetChainId = process.env.NEXT_PUBLIC_CHAIN_ID ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) : bscChainId;

            if (chainId !== targetChainId) {
                toast.loading("Switching to Optimized Network...", { id: toastId });
                try {
                    await switchChainAsync({ chainId: targetChainId });
                } catch (switchErr: any) {
                    // User might have rejected or network not added
                    console.error("Network switch failed:", switchErr);
                    throw new Error("Network Mismatch: Please switch to Binance Smart Chain to proceed.");
                }
            }

            // 3. Fetch Nonce
            console.log("Fetching security nonce...");
            const referrerCode = localStorage.getItem("trk_referrer_code");

            const nonceRes = await authAPI.getNonce(wagmiAddress, referrerCode || undefined);

            if (nonceRes.status !== 'success' || !nonceRes.data?.message) {
                throw new Error(nonceRes.message || "Security Handshake Failed: Unable to generate nonce.");
            }

            // 4. Request Signature
            console.log("Requesting signature...");
            toast.loading("Awaiting Quantum Signature...", {
                id: toastId,
                description: "Please confirm the authentication request in your wallet."
            });

            // Small cooldown for provider stability after potential network switch
            await new Promise(resolve => setTimeout(resolve, 500));

            const signature = await signMessageAsync({
                message: nonceRes.data.message,
                account: wagmiAddress as `0x${string}`,
            });

            // 5. Verification
            console.log("Verifying signature...");
            toast.loading("Decrypting Identity...", { id: toastId });

            const verifyRes = await authAPI.verify(wagmiAddress, signature);

            const verifiedToken = verifyRes.data?.accessToken || verifyRes.data?.token;
            if (verifyRes.status === 'success' && verifiedToken) {
                const newToken = verifiedToken;
                const userData = verifyRes.data.user;

                // Sync Internal State
                setToken(newToken);
                setUser(userData);
                setRealBalances({
                    ...userData.realBalances,
                    totalUnified: (userData.realBalances?.cash || 0) + (userData.realBalances?.walletBalance || 0)
                });
                setPracticeBalance(userData.practiceBalance?.toString() || "0.00");

                // Sync API & Persistence
                setApiToken(newToken);
                setStoredUser(userData);
                localStorage.setItem("trk_wallet_address", wagmiAddress);

                // Notify other modules (Socket, etc)
                window.dispatchEvent(new CustomEvent('trk_auth_change'));

                toast.dismiss(toastId);
                toast.success("Identity Verified. Access Granted.");
                setIsSwitchingWallet(false);
                localStorage.removeItem(PREFERRED_WALLET_KEY);
                setWalletConnectRequested(false);
                localStorage.removeItem(LOGIN_COOLDOWN_KEY);

                // For production stability, we trigger a soft refresh of the dashboard data
                // instead of a hard location reload if we're already on a dashboard-like page,
                // otherwise we navigate.
                const path = window.location.pathname;
                if (path === '/' || path === '/auth') {
                    router.push('/dashboard');
                } else {
                    refreshUser();
                }
            } else {
                throw new Error(verifyRes.message || "Identity Verification Failed.");
            }
        } catch (error: any) {
            // Graceful exit for common user actions or expected races
            if (isDisconnectingRef.current) return;

            console.error("Production Login Failure:", error);
            toast.dismiss(toastId);

            // Categorize Errors
            const isUserReject = error.code === 4001 || error.message?.includes("User rejected");
            const isNetworkErr = error.message?.includes("Gateway") || error.message?.includes("fetch");
            const isRateLimited = error.message?.toLowerCase().includes("too many requests")
                || error.message?.includes("429");

            if (isUserReject) {
                toast.info("Uplink Cancelled", { description: "You rejected the signature request." });
                setWalletConnectRequested(false);
            } else if (isRateLimited) {
                const cooldownMs = 15 * 60 * 1000;
                localStorage.setItem(LOGIN_COOLDOWN_KEY, String(Date.now() + cooldownMs));
                toast.error("Rate limit reached", {
                    description: "Please wait 15 minutes before trying again."
                });
            } else if (isNetworkErr) {
                toast.error("Network Congestion", {
                    description: "Server is taking too long to respond. Check your connection.",
                    action: {
                        label: "Retry",
                        onClick: () => login()
                    }
                });
            } else {
                toast.error("Authentication Error", {
                    description: error.message || "An unexpected error occurred. Please try again.",
                    action: {
                        label: "Retry",
                        onClick: () => login()
                    }
                });
            }

            if (isSwitchingWallet) {
                setIsSwitchingWallet(false);
            }

            // Cleanup partial state - ONLY IF WE DON'T HAVE A TOKEN ALREADY
            // If we failed to switch wallets, don't kill the existing session!
            if (!effectiveToken) {
                removeToken();
                setUser(null);
                setToken(null);
            }
        } finally {
            loginInProgressRef.current = false;
            setWalletConnectRequested(false);
        }
    };



    // Handle Wagmi connection changes -> Login Flow
    useEffect(() => {
        login();
    }, [isWagmiConnected, wagmiAddress, token, walletClient]);

    const resetSessionForSwitch = React.useCallback(() => {
        setUser(null);
        setToken(null);
        setPracticeBalance("0.00");
        setRealBalances({ ...DEFAULT_REAL_BALANCES });
        setPracticeExpiry(null);
        setGameHistory([]);
        setIsRegisteredOnChain(false);
        setUnclaimedRounds([]);
        setTotalProfit(0);
        setHistoryPage(1);
        setHasMoreHistory(true);
        setIsHistoryLoading(false);
        removeToken();
    }, []);

    const connect = async (walletType: string) => {
        // Prevent concurrent connection attempts
        if (isLoading || loginInProgressRef.current) return;

        setIsLoading(true);
        console.log("Production Login Request:", walletType);
        setWalletConnectRequested(true);

        try {
            // Already connected? Trigger auth directly.
            if (isWagmiConnected && wagmiAddress) {
                await login();
                return;
            }

            // WalletConnect / Modal Fallback
            if (walletType === 'Other' || walletType === 'WalletConnect') {
                await openWeb3Modal();
                return;
            }

            // Precise Connector Selection
            let connector = connectors.find(c => c.id === 'metaMask' || c.id === 'io.metamask');
            if (!connector) connector = connectors.find(c => c.id === 'injected');

            if (!connector) {
                console.warn("Direct connector not found. Using discovery modal.");
                await openWeb3Modal();
                return;
            }

            // Attempt Secure Handshake
            const toastId = toast.loading(`Connecting to ${walletType}...`);
            try {
                await connectAsync({ connector });
                // We don't call login() here because the useEffect on isWagmiConnected will trigger it
            } catch (err: any) {
                toast.dismiss(toastId);
                if (err.code === 4001 || err.message?.includes("User rejected")) {
                    toast.info("Connection Cancelled");
                } else {
                    console.error("Connector link failed. Falling back to universal modal.", err);
                    await openWeb3Modal();
                }
            }
        } catch (error) {
            console.error("Critical Connection Error:", error);
            toast.error("Handshake Failed", { description: "The system could not initialize the wallet link." });
            setWalletConnectRequested(false);
        } finally {
            setIsLoading(false);
        }
    };

    const switchWallet = async (targetAddress?: string) => {
        if (isLoading || loginInProgressRef.current) return;

        if (targetAddress && wagmiAddress && targetAddress.toLowerCase() === wagmiAddress.toLowerCase()) {
            toast.info("Wallet already active.");
            return;
        }

        const startAddress = wagmiAddressRef.current;
        const startConnected = wagmiConnectedRef.current;

        setIsSwitchingWallet(true);
        setWalletConnectRequested(true);
        resetSessionForSwitch();

        if (targetAddress) {
            localStorage.setItem(PREFERRED_WALLET_KEY, targetAddress);
        } else {
            localStorage.removeItem(PREFERRED_WALLET_KEY);
        }

        const toastId = toast.loading("Switching wallet...", {
            description: "Select the wallet account you want to use."
        });

        try {
            await openWeb3Modal();
        } catch (error) {
            console.error("Wallet switch failed:", error);
            toast.error("Unable to open wallet selector.", { id: toastId });
            setIsSwitchingWallet(false);
        } finally {
            toast.dismiss(toastId);
            const endAddress = wagmiAddressRef.current;
            const endConnected = wagmiConnectedRef.current;
            const didChange = startConnected !== endConnected
                || (startAddress?.toLowerCase() !== endAddress?.toLowerCase());

            if (!didChange && !loginInProgressRef.current) {
                setIsSwitchingWallet(false);
            }
        }
    };

    const logout = () => {
        // Set protection flag to prevent login effects from re-triggering during logout
        isDisconnectingRef.current = true;
        setIsAuthenticating(false);
        toast.dismiss(); // Immediately clear any pending/active toasts

        try {
            wagmiDisconnect();
        } catch (e) {
            console.error("Wagmi disconnect failed:", e);
        }

        // Hard clear wallet connection state (WalletConnect / Wagmi / Web3Modal)
        if (typeof window !== "undefined") {
            try {
                const shouldClearKey = (key: string) => {
                    const k = key.toLowerCase();
                    return (
                        k.startsWith("wagmi") ||
                        k.startsWith("wc@") ||
                        k.startsWith("walletconnect") ||
                        k.startsWith("w3m") ||
                        k.includes("web3modal") ||
                        k.includes("walletconnect")
                    );
                };

                const localKeys: string[] = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && shouldClearKey(key)) localKeys.push(key);
                }
                localKeys.forEach((key) => localStorage.removeItem(key));

                const sessionKeys: string[] = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    if (key && shouldClearKey(key)) sessionKeys.push(key);
                }
                sessionKeys.forEach((key) => sessionStorage.removeItem(key));

                document.cookie.split(";").forEach((cookie) => {
                    const name = cookie.split("=")[0]?.trim();
                    if (!name) return;
                    if (shouldClearKey(name)) {
                        document.cookie = `${name}=; Max-Age=0; path=/`;
                        document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}`;
                    }
                });
            } catch (e) {
                console.warn("Wallet storage cleanup failed:", e);
            }
        }

        setUser(null);
        setToken(null);
        setGameHistory([]);
        setPracticeBalance("0.00");
        setIsSwitchingWallet(false);
        setWalletConnectRequested(false);
        removeToken();
        localStorage.removeItem("trk_wallet_address");

        toast.info("Logged out successfully");
        router.push("/");

        // Allow states to settle before re-enabling authentication logic
        setTimeout(() => {
            isDisconnectingRef.current = false;
        }, 2000);
    };

    const switchNetwork = async (targetChainId: number) => {
        if (switchChainAsync) {
            try {
                await switchChainAsync({ chainId: targetChainId });
            } catch (error: any) {
                if (error.code === 4001 || error.message?.includes("User rejected")) {
                    toast.info("Network switch cancelled");
                } else {
                    console.error("Network switch failed", error);
                    toast.error("Failed to switch network");
                }
            }
        } else {
            toast.error("Network switching not supported by wallet");
        }
    };

    const refreshUser = async () => {
        if (!token) return;
        try {
            // 1. Sync backend session
            const response = await userAPI.getMe();
            if (response.data?.user) {
                setUser(response.data.user);
                // Note: We prioritize on-chain balances if they've been fetched,
                // otherwise fallback to backend values.
                if (!userBalancesData) {
                    setPracticeBalance(response.data.user.practiceBalance?.toString() || "0.00");
                    if (response.data.user.realBalances) {
                        const gBalance = response.data.user.realBalances?.game || 0;
                        const wBalance = response.data.user.realBalances?.cash || 0;
                        const currentPractice = response.data.user.practiceBalance || 0;
                        const totalDeposited = response.data.user.activation?.totalDeposited || 0;

                        const unified = Number(gBalance) + Number(wBalance);
                        setRealBalances({
                            ...response.data.user.realBalances,
                            practice: currentPractice,
                            cash: wBalance,
                            game: gBalance,
                            totalUnified: unified
                        });
                        setTotalProfit(unified - totalDeposited);
                    }
                }
            }
            // 2. Clear on-chain refetch to ensure UI is fresh
            if (refetchOnChainBalances) await refetchOnChainBalances();
            if (refetchUsdt) await refetchUsdt();

            // 3. Fetch Game History
            setHistoryPage(1);
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
            const limit = 20;
            const historyRes = await fetch(`${apiBase}/api/game/history?limit=${limit}&page=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());

            if (historyRes.status === 'success' && Array.isArray(historyRes.data.games)) {
                // Map backend history to frontend model
                const mappedHistory: GameHistoryItem[] = historyRes.data.games.map((g: any) => ({
                    id: g._id,
                    hash: g.txHash || `GAME-${g._id.slice(-6)}`,
                    amount: g.betAmount,
                    prediction: g.pickedNumber,
                    won: g.isWin,
                    payout: g.payout,
                    timestamp: g.createdAt,
                    gameType: 'dice', // Default for now, or g.gameVariant if available
                    roundId: g.roundId
                }));
                setGameHistory(mappedHistory);
                // Check if more pages exist
                const total = historyRes.data.pagination.total;
                setHasMoreHistory(mappedHistory.length < total);
            }
        } catch (error) {
            console.error("Failed to refresh user:", error);
        }
    };

    const loadMoreHistory = async () => {
        if (!token || !hasMoreHistory || isHistoryLoading) return;

        setIsHistoryLoading(true);
        try {
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
            const nextPage = historyPage + 1;
            const limit = 20;

            const historyRes = await fetch(`${apiBase}/api/game/history?limit=${limit}&page=${nextPage}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json());

            if (historyRes.status === 'success' && Array.isArray(historyRes.data.games)) {
                const mappedHistory: GameHistoryItem[] = historyRes.data.games.map((g: any) => ({
                    id: g._id,
                    hash: g.txHash || `GAME-${g._id.slice(-6)}`,
                    amount: g.betAmount,
                    prediction: g.pickedNumber,
                    won: g.isWin,
                    payout: g.payout,
                    timestamp: g.createdAt,
                    gameType: 'dice',
                    roundId: g.roundId
                }));

                setGameHistory(prev => [...prev, ...mappedHistory]);
                setHistoryPage(nextPage);

                // Check if more pages exist
                const total = historyRes.data.pagination.total;
                setHasMoreHistory((gameHistory.length + mappedHistory.length) < total);
            }
        } catch (e) {
            console.error("Failed to load more history", e);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const placeEntry = async (amount: number, prediction: any, gameType: GameHistoryItem['gameType'] = 'dice') => {
        if (amount < 0.5) {
            toast.error("Minimum entry is 0.5 GC");
            return { won: false, hash: "INVALID_BET", luckyNumber: null };
        }
        if (!token) throw new Error("Authentication required");

        // Validation for client-side balance check (optional, backend checks too)
        if (parseFloat(practiceBalance) < amount) {
            toast.error("Insufficient practice balance");
            throw new Error("Insufficient balance");
        }

        const toastId = toast.loading("Simulating Quantum Entry...");
        try {
            // MAP FRONTEND FIELDS TO BACKEND EXPECTATIONS
            const numericPrediction = typeof prediction === 'string' && !isNaN(Number(prediction))
                ? parseInt(prediction)
                : prediction;

            // 1. COMMIT PHASE (PRACTICE)
            const commitResponse = await gameAPI.commitBet({
                gameType: 'practice',
                gameVariant: gameType,
                betAmount: amount,
                pickedNumber: numericPrediction
            });

            if (commitResponse.status !== 'success') {
                throw new Error(commitResponse.message || "Bet commit failed");
            }

            const { commitmentId } = commitResponse.data;
            toast.loading("Reveal Phase: Verifying Result...", { id: toastId });

            // 2. REVEAL PHASE
            const revealResponse = await gameAPI.revealBet(commitmentId);

            if (revealResponse.status === 'success') {
                const { isWin, payout, luckyNumber, id } = revealResponse.data.game;
                const newBal = revealResponse.data.newBalance;

                toast.dismiss(toastId);
                if (isWin) toast.success(`PRACTICE WIN! +${payout} TRK [Result: ${luckyNumber}]`);
                else toast.info(`Practice Round Lost. [Result: ${luckyNumber}]`);

                // Update Balance immediately
                setPracticeBalance(Number(newBal).toFixed(2));

                // Add to History State
                const historyItem: GameHistoryItem = {
                    id: id || Math.random().toString(36).slice(2, 9),
                    hash: `PRACTICE-${Math.random().toString(16).slice(2, 8)}`, // Mock hash for practice
                    amount,
                    prediction,
                    won: isWin,
                    payout,
                    timestamp: new Date().toISOString(),
                    gameType
                };

                setGameHistory((prev) => [historyItem, ...prev].slice(0, 50));
                refreshUser();

                return { won: isWin, payout, hash: historyItem.hash || "practice-tx", luckyNumber };
            } else {
                throw new Error(revealResponse.message || "Entry reveal failed");
            }
        } catch (error: any) {
            console.error("Practice bet failed:", error);
            const msg = error.shortMessage || error.message || "Failed to process bet";
            toast.error(msg, { id: toastId });
            throw error;
        }
    };

    const participate = async (amount: number, prediction: any, gameType: GameHistoryItem['gameType'] = 'dice') => {
        if (!token) throw new Error("Authentication required");
        if (!hasRealAccess) {
            toast.error("Real money mode locked", {
                description: "Add funds to unlock real gameplay."
            });
            throw new Error("Real mode locked");
        }
        if (realBalances.game < amount) {
            toast.error("Insufficient real balance", {
                description: "Add funds to continue playing real games."
            });
            throw new Error("Insufficient balance");
        }
        if (amount < 0.5) {
            toast.error("Minimum entry is 0.5 SC");
            return { won: false, payout: 0, hash: "INVALID_BET", luckyNumber: null };
        }

        const toastId = toast.loading("Secure Commit: Encrypting Entry...");
        try {
            // MAP FRONTEND FIELDS TO BACKEND EXPECTATIONS
            const numericPrediction = typeof prediction === 'string' && !isNaN(Number(prediction))
                ? parseInt(prediction)
                : prediction;

            // 1. COMMIT PHASE
            const commitResponse = await gameAPI.commitBet({
                gameType: 'real',
                gameVariant: gameType,
                betAmount: amount,
                pickedNumber: numericPrediction
            });

            if (commitResponse.status !== 'success') {
                throw new Error(commitResponse.message || "Bet commit failed");
            }

            const { commitmentId } = commitResponse.data;
            toast.loading("Reveal Phase: Verifying Result...", { id: toastId });

            // 2. REVEAL PHASE
            const revealResponse = await gameAPI.revealBet(commitmentId);

            if (revealResponse.status === 'success') {
                const { isWin, payout, luckyNumber, hash, id } = revealResponse.data.game;

                toast.dismiss(toastId);
                if (isWin) toast.success(`SYSTEM WIN! +${payout} SC [Result: ${luckyNumber}]`);
                else toast.info(`Bet Lost. [Result: ${luckyNumber}]`);

                refreshUser(); // Sync balance
                return { won: isWin, payout, hash: (hash || id || "INTERNAL_TX").toString(), luckyNumber };
            } else {
                throw new Error(revealResponse.message || "Entry reveal failed");
            }
        } catch (error: any) {
            console.error("Real entry failed:", error);
            const msg = error.shortMessage || error.message || "Failed to process entry";
            toast.error(msg, { id: toastId });
            throw error;
        }
    };

    const ensureAllowance = async (spender: string, amount: bigint) => {
        if (!wagmiAddress) return;

        const allowance = await publicClient?.readContract({
            address: addresses.USDT as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'allowance',
            args: [wagmiAddress as `0x${string}`, spender as `0x${string}`],
        }) as bigint;

        if (allowance < amount) {
            toast.loading("Increasing USDT Security Allowance...", { id: "allowance" });
            const hash = await writeContractAsync({
                address: addresses.USDT as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'approve',
                args: [spender as `0x${string}`, amount],
            });
            toast.success("Allowance Secure.", { id: "allowance" });
            return hash;
        }
    };

    const realEntry = async (amount: number, prediction: number | string, gameType: GameHistoryItem['gameType'] = 'dice') => {
        if (!user || !wagmiAddress) throw new Error("Connection required for on-chain betting");

        // Check Network
        if (chainId !== bsc.id && chainId !== bscTestnet.id) {
            toast.error("Please switch to BSC Network");
            if (switchChain) switchChain({ chainId: bsc.id });
            throw new Error("Invalid Network context");
        }

        const toastId = toast.loading("Initializing Quantum Entry Core...");
        try {
            if (amount < 0.5) throw new Error("Minimum entry is 0.5 SC");

            const amountBig = parseUnits(amount.toString(), 18);

            // Unified internal balance check: cash + wallet
            const totalAvailable = realBalances.cash + realBalances.walletBalance;

            // If internal balance is enough, we could potentially call a different contract function 
            // but the user wants to NOT open transaction popup. 
            // For on-chain betting (realBet), it performs a transaction.
            // To avoid popups, we should encourage them to use the "Main Balance" (cash/wallet) 
            // which usually goes through the backend API (placeRealMoneyBet).

            // Fix prediction: Must be uint256 (0-9 according to contract)
            let predictionValue = 0n;
            if (typeof prediction === 'number') {
                predictionValue = BigInt(prediction);
            } else if (typeof prediction === 'string') {
                const parsed = parseInt(prediction);
                // Map strings like "RANDOM" or "auto" to 0, otherwise use parsed digit
                predictionValue = isNaN(parsed) ? 0n : BigInt(parsed % 10);
            }

            // 1. Get current round ID from contract (Required for placeBet)
            toast.loading("Fetching Active Round Protocol...", { id: toastId });
            const currentRoundId = await publicClient?.readContract({
                address: addresses.GAME as `0x${string}`,
                abi: TRKGameABI,
                functionName: 'currentCashRoundId',
            }) as bigint;

            if (!currentRoundId) throw new Error("Could not sync with Round Protocol");

            // 2. Ensure USDT Allowance for Direct Transfer
            await ensureAllowance(addresses.GAME, amountBig);

            // 3. Place Entry on Chain (Directly from Wallet)
            toast.loading("Broadcasting Entry to Ledger...", { id: toastId });
            const betTx = await writeContractAsync({
                address: addresses.GAME as `0x${string}`,
                abi: TRKGameABI,
                functionName: 'placeBetDirect', // Use the new direct-transfer function
                args: [currentRoundId, predictionValue, amountBig],
            });

            toast.success("Protocol Accepted! Round synchronization required.", {
                id: toastId,
                description: "Check 'Extraction Log' below to sync after round closes."
            });

            // Backend record
            try {
                const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
                await fetch(`${apiBase}/api/game/record-onchain`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        txHash: betTx,
                        amount,
                        prediction: predictionValue.toString(),
                        gameType,
                        roundId: currentRoundId.toString()
                    })
                });
            } catch (e) {
                console.warn("Backend sync failed, but transaction is live:", e);
            }

            // Note: Since this is a pool-based bet, we return won: true to simulate result in UI 
            // but the real result will be claimed later via claimWin after admin closes round.
            return { won: true, hash: betTx, luckyNumber: null };
        } catch (error: any) {
            console.error("Entry Protocol Error:", error);
            const message = error.shortMessage || error.message || "Execution Failed";
            if (message.includes("User rejected")) {
                toast.dismiss(toastId);
                toast.info("Transaction Aborted.");
            } else {
                toast.error(message, { id: toastId });
            }
            throw error;
        }
    };

    const purchaseMembership = async (amount: number, packageType?: 'starter' | 'premium' | 'vip') => {
        if (!user) throw new Error("User not logged in");
        const toastId = toast.loading("Initiating Membership Purchase...");

        try {
            const amountBig = parseUnits(amount.toString(), 18);

            // 1. Approve USDT
            toast.loading("Requesting USDT Approval...", { id: toastId });
            await writeContractAsync({
                address: addresses.USDT as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'approve',
                args: [addresses.GAME as `0x${string}`, amountBig],
            });

            // 2. Deposit
            toast.loading("Confirming Deposit...", { id: toastId });
            const tx = await writeContractAsync({
                address: addresses.GAME as `0x${string}`,
                abi: TRKGameABI,
                functionName: 'depositCashGame',
                args: [amountBig],
            });

            try {
                await depositAPI.deposit(amount, tx);
            } catch (syncErr) {
                console.warn("Backend deposit sync failed:", syncErr);
            }

            // If this deposit matches a membership package, award GC/SC instantly
            const inferPackageType = () => {
                if (packageType) return packageType;
                const rounded = Math.round(amount * 100) / 100;
                if (Math.abs(rounded - 10) < 0.01) return 'starter';
                if (Math.abs(rounded - 50) < 0.01) return 'premium';
                if (Math.abs(rounded - 100) < 0.01) return 'vip';
                return null;
            };

            const resolvedPackage = inferPackageType();
            let packageAwarded = false;
            if (resolvedPackage) {
                try {
                    const pkgRes = await packagesAPI.purchase(resolvedPackage, tx);
                    if (pkgRes?.status === 'success') {
                        const newBalance = pkgRes.data?.newBalance;
                        const nextMembership = pkgRes.data?.membershipLevel;
                        if (newBalance && user) {
                            const updatedUser = {
                                ...user,
                                credits: newBalance.credits ?? user.credits,
                                rewardPoints: newBalance.rewardPoints ?? user.rewardPoints,
                                membershipLevel: nextMembership || user.membershipLevel
                            };
                            setUser(updatedUser);
                            setStoredUser(updatedUser);
                        }
                        packageAwarded = true;
                    } else {
                        toast.warning(pkgRes?.message || "Package reward sync failed");
                    }
                } catch (pkgErr: any) {
                    console.warn("Package award failed:", pkgErr);
                    toast.warning(pkgErr?.message || "Package reward sync failed");
                }
            }

            toast.success(packageAwarded ? "Membership acquired. GC/SC credits added." : "Membership acquired!", { id: toastId });
            refreshUser();
            return tx;
        } catch (error: any) {
            console.error("Deposit failed:", error);
            toast.error(error.message || "Deposit failed", { id: toastId });
            throw error;
        }
    };

    const buyLuckyDrawTickets = async (quantity: number) => {
        if (!user) throw new Error("User not logged in");
        const toastId = toast.loading("Processing Ticket Purchase...");

        try {
            // 1. Get Ticket Price
            // In a real app we'd fetch this from contract, let's assume 10 USDT
            const pricePerTicket = parseUnits("10", 18);
            const totalCost = pricePerTicket * BigInt(quantity);

            // 2. Approve USDT for Lucky Draw Contract
            toast.loading("Requesting USDT Approval...", { id: toastId });
            await writeContractAsync({
                address: addresses.USDT as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'approve',
                args: [addresses.LUCKY_DRAW as `0x${string}`, totalCost],
            });

            // 3. Buy Tickets
            toast.loading("Confirming Ticket Purchase...", { id: toastId });
            const tx = await writeContractAsync({
                address: addresses.LUCKY_DRAW as `0x${string}`,
                abi: TRKLuckyDrawABI,
                functionName: 'buyTickets',
                args: [BigInt(quantity)],
            });

            toast.success(`Successfully purchased ${quantity} tickets!`, { id: toastId });
            refreshUser();
            return tx;
        } catch (error: any) {
            console.error("Jackpot Purchase Failed:", error);
            toast.error(error.message || "Purchase failed", { id: toastId });
            throw error;
        }
    };

    const buyTicketsWithGameBalance = async (quantity: number) => {
        if (!user) throw new Error("User not logged in");
        const toastId = toast.loading("Processing Game Balance Entry...");

        try {
            // 1. Calculate Cost
            const pricePerTicket = parseUnits("10", 18);
            const totalCost = pricePerTicket * BigInt(quantity);

            // 2. Check Game Balance
            const gameBalance = realBalances.game;
            const costNum = Number(formatUnits(totalCost, 18));

            if (gameBalance < costNum) {
                throw new Error("Insufficient Entry Vault balance. Please acquire a membership package.");
            }

            // 3. Withdraw from Game Contract to Wallet
            toast.loading("Moving rewards to wallet...", { id: toastId });
            await redeem('game', costNum);

            // 4. Buy Tickets
            toast.loading("Purchasing tickets...", { id: toastId });
            const tx = await buyLuckyDrawTickets(quantity);

            toast.success(`Jackpot Entry Successful!`, { id: toastId });
            return tx;
        } catch (error: any) {
            console.error("Game Balance Purchase Failed:", error);
            toast.error(error.message || "Entry failed", { id: toastId });
            throw error;
        }
    };

    const claimWin = async (roundId: number, isCash: boolean) => {
        const toastId = toast.loading("Claiming Win...");
        try {
            const tx = await writeContractAsync({
                address: addresses.GAME as `0x${string}`,
                abi: TRKGameABI,
                functionName: 'claimWin',
                args: [BigInt(roundId), isCash],
            });
            toast.success("Win claimed successfully!", { id: toastId });
            refreshUser();
            return tx;
        } catch (error: any) {
            console.error("Claim failed:", error);
            toast.error(error.message || "Claim failed", { id: toastId });
            throw error;
        }
    };

    const claimLoss = async (roundId: number, isCash: boolean) => {
        const toastId = toast.loading("Claiming Loss Compensation...");
        try {
            const tx = await writeContractAsync({
                address: addresses.GAME as `0x${string}`,
                abi: TRKGameABI,
                functionName: 'claimLoss',
                args: [BigInt(roundId), isCash],
            });
            toast.success("Loss compensation claimed!", { id: toastId });
            refreshUser();
            return tx;
        } catch (error: any) {
            console.error("Claim failed:", error);
            toast.error(error.message || "Claim failed", { id: toastId });
            throw error;
        }
    };

    const claimLiquiditySync = async () => {
        if (!wagmiAddress || unclaimedRounds.length === 0) {
            toast.info("No unclaimed payloads detected.");
            return;
        }

        const toastId = toast.loading(`Initiating Auto-Sync for ${unclaimedRounds.length} rounds...`);

        try {
            // Intelligent sequential claim protocol
            for (let i = 0; i < unclaimedRounds.length; i++) {
                const roundId = unclaimedRounds[i];
                toast.loading(`Syncing Protocol ${i + 1}/${unclaimedRounds.length}...`, { id: toastId });

                try {
                    // 1. Attempt Win Extraction (Highest Priority)
                    await writeContractAsync({
                        address: addresses.GAME as `0x${string}`,
                        abi: TRKGameABI,
                        functionName: 'claimWin',
                        args: [roundId, true], // isCashGame = true
                    });
                    toast.success(`Win Secured for Round #${roundId}`, { id: `win-${roundId}` });
                } catch (winError: any) {
                    // 2. If Win fails (Not a winner), attempt Loss Cashback
                    try {
                        await writeContractAsync({
                            address: addresses.GAME as `0x${string}`,
                            abi: TRKGameABI,
                            functionName: 'claimLoss',
                            args: [roundId, true],
                        });
                        toast.info(`Loss Protection applied for #${roundId}`, { id: `loss-${roundId}` });
                    } catch (lossError: any) {
                        console.warn(`Round #${roundId} sync failed completely:`, lossError);
                    }
                }

                // Small tactical delay between transactions
                if (i < unclaimedRounds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            }

            toast.success("Ecosystem Sync Complete!", { id: toastId });
            refetchUnclaimed();
            refetchUsdt();
            await refreshUser();
        } catch (error: any) {
            console.error("Auto-sync failed:", error);
            toast.error("Auto-sync interrupted: " + (error.shortMessage || error.message), { id: toastId });
        }
    };

    const redeem = async (walletType: keyof RealBalances, amount: number) => {
        if (amount < 10) {
            toast.error("Minimum redemption amount is 10 SC");
            return false;
        }

        const toastId = toast.loading(`Initiating redemption from ${walletType}...`);
        try {
            // For the Extraction Vault (on-chain walletBalance), we perform a REAL blockchain transaction
            // 'game' is the primary on-chain balance where deposits go
            if (walletType === 'cash' || walletType === 'game') {
                const amountBig = parseUnits(amount.toString(), 18);

                toast.loading("Sign Security Protocol in Wallet...", { id: toastId });

                const tx = await writeContractAsync({
                    address: addresses.GAME as `0x${string}`,
                    abi: TRKGameABI,
                    functionName: 'withdraw',
                    args: [amountBig],
                });

                toast.success(`Redemption Protocol Broadcasting! (TX: ${tx.slice(0, 10)}...)`, { id: toastId });

                // Update backend sync
                const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
                await fetch(`${apiBase}/api/deposit/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ walletType, amount, onChainTx: tx })
                });

                refreshUser();
                return true;
            } else {
                // For other internal-only balances (if any), use the legacy backend bridge
                const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
                const response = await fetch(`${apiBase}/api/deposit/withdraw`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ walletType, amount })
                }).then(res => res.json());

                if (response.status === 'success') {
                    toast.success(`Successfully redeemed ${amount} SC!`, { id: toastId });
                    refreshUser();
                    return true;
                } else {
                    throw new Error(response.message || "Extraction failed");
                }
            }
        } catch (error: any) {
            console.error("Withdrawal failed:", error);
            const msg = error.shortMessage || error.message || "Extraction failed";
            toast.error(msg, { id: toastId });
            return false;
        }
    };

    // Check on-chain registration status
    const { data: contractUser } = useReadContract({
        address: addresses.GAME as `0x${string}`,
        abi: TRKGameABI,
        functionName: 'users',
        args: [wagmiAddress as `0x${string}`],
        query: {
            enabled: !!wagmiAddress
        }
    }) as { data: any };

    useEffect(() => {
        if (contractUser) {
            setIsRegisteredOnChain(!!contractUser.isRegistered);
        }
    }, [contractUser]);

    const registerOnChain = async () => {
        if (!wagmiAddress || !user) return;
        const toastId = toast.loading("Checking referral records...");

        try {
            // 1. Resolve referrer full address from backend
            const refCode = localStorage.getItem("trk_referrer_code");
            let referrerAddress = "0x0000000000000000000000000000000000000000";

            if (refCode) {
                const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
                const res = await fetch(`${apiBase}/api/referral/resolve/${refCode}`).then(r => r.json());
                if (res.status === 'success' && res.data?.walletAddress) {
                    referrerAddress = res.data.walletAddress;
                }
            }

            toast.loading("Synchronizing Identity on Blockchain...", { id: toastId });

            await writeContractAsync({
                address: addresses.GAME as `0x${string}`,
                abi: TRKGameABI,
                functionName: 'register',
                args: [referrerAddress as `0x${string}`],
            });

            toast.success("Identity Secured on Chain!", { id: toastId });

            // Persist to backend immediately
            await userAPI.updateProfile({ isRegisteredOnChain: true });

            setIsRegisteredOnChain(true);
            await refreshUser();
        } catch (error: any) {
            toast.error("Chain Identity Sync Failed: " + (error.shortMessage || error.message), { id: toastId });
        }
    };

    const faucet = async () => {
        if (!wagmiAddress) return;
        const toastId = toast.loading("Requesting 100 USDT from Faucet...");

        try {
            const tx = await writeContractAsync({
                address: addresses.USDT as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'faucet',
            });
            toast.success("100 USDT minted to your wallet!", { id: toastId });
            refetchUsdt();
            return tx;
        } catch (error: any) {
            toast.error("Faucet failed: " + (error.shortMessage || error.message), { id: toastId });
        }
    };

    useEffect(() => {
        const handleBetResult = (data: any) => {
            console.log("🎲 Real-Time Bet Result Detected:", data);
            refreshUser();
            // Optional: Auto-switch to REAL mode if it was an on-chain event?
            // No, let users stay in their current mode.
        };

        if (socket) {
            socket.on("game_result", handleBetResult);
            socket.on("onchain_bet_recorded", handleBetResult);
            return () => {
                if (socket) {
                    socket.off("game_result", handleBetResult);
                    socket.off("onchain_bet_recorded", handleBetResult);
                }
            };
        }
    }, [refreshUser]);

    // Handle Wagmi account changes for linking
    useEffect(() => {
        if (isWagmiConnected && wagmiAddress && token && user && !user.walletAddress) {
            // If connected to Wagmi, logged in with email, and no wallet linked yet,
            // prompt or automatically try to link.
            // For now, we'll just ensure the address is available for manual linking.
            // A more advanced implementation might auto-trigger linkWallet here.
        }
    }, [isWagmiConnected, wagmiAddress, token, user]);

    const linkWallet = async () => {
        if (!token || !user) {
            toast.error("Please log in with email first.");
            return;
        }
        if (user.walletAddress) {
            toast.info("Wallet already linked.");
            return;
        }
        if (!isWagmiConnected || !wagmiAddress) {
            await connect('Other');
            return;
        }

        const toastId = toast.loading("Linking Wallet Identity...");
        try {
            // 1. Get a fresh server nonce for linking (prevents signature mismatch)
            const nonceRes = await authAPI.getLinkWalletNonce();
            if (nonceRes?.status !== 'success' || !nonceRes?.data?.message) {
                throw new Error("Unable to fetch link nonce. Please retry.");
            }
            const message = nonceRes.data.message as string;

            // 2. Sign a message to prove ownership
            const signature = await signMessageAsync({
                message,
                account: wagmiAddress as `0x${string}`,
            });

            // 3. Submit to backend
            const res = await authAPI.linkWallet(wagmiAddress, signature);
            if (res.status === 'success') {
                toast.success("Wallet linked successfully!", { id: toastId });

                // Update local state
                const updatedUser = { ...user, walletAddress: wagmiAddress };
                setUser(updatedUser);
                setStoredUser(updatedUser);
                localStorage.setItem("trk_wallet_address", wagmiAddress);

                refreshUser();
            } else {
                throw new Error(res.message || "Linking failed");
            }
        } catch (err: any) {
            console.error("Wallet link failed:", err);
            toast.error(err.message || "Failed to link wallet", { id: toastId });
        }
    };

    const deposit = async (amount: number) => {
        const toastId = toast.loading(`Initializing Deposit for ${amount} USDT...`);
        try {
            // This is usually handled by the DepositModal calling the contract
            // But we can add a helper logic here if needed for tracking
            console.log("Deposit request processed for:", amount);
            toast.success("Deposit Protocol Initialized.", { id: toastId });
        } catch (err: any) {
            toast.error("Deposit initialization failed.", { id: toastId });
        }
    };

    const withdraw = async (amount: number, type: string) => {
        const toastId = toast.loading(`Initializing Withdrawal of ${amount} ${type}...`);
        try {
            // Mapping 'type' to 'walletType' expected by depositAPI.withdraw
            const res = await depositAPI.withdraw(type, amount);
            if (res.status === 'success') {
                toast.success("Withdrawal request submitted successfully.", { id: toastId });
                refreshUser();
            } else {
                throw new Error(res.message);
            }
        } catch (err: any) {
            toast.error(err.message || "Withdrawal failed.", { id: toastId });
        }
    };

    const effectiveToken = isHydrated ? (token || getToken()) : token;

    return (
        <WalletContext.Provider
            value={React.useMemo(() => ({
                isConnected: !!effectiveToken, // Avoid hydration mismatch by delaying localStorage reads
                address: user?.walletAddress || wagmiAddress || null,
                user,
                practiceBalance,
                realBalances,
                practiceExpiry,
                gameHistory,
                token: effectiveToken,
                connect,
                disconnect: logout,
                recentWallets,
                switchWallet,
                isSwitchingWallet,
                isWalletConnected: isWagmiConnected,
                placeEntry,
                realEntry: participate, // Consistent naming
                redeem,
                refreshUser,
                switchNetwork,
                currentChainId: chainId,
                nativeBalance: balanceData?.value ? formatUnits(balanceData.value, balanceData.decimals) : "0",
                usdtBalance: usdtBalanceRaw ? formatUnits(usdtBalanceRaw as bigint, 18) : "0",
                isLoading,
                purchaseMembership,
                claimWin,
                claimLoss,
                claimLiquiditySync,
                registerOnChain,
                linkWallet, // Exported now
                deposit,
                withdraw,
                isRegisteredOnChain,
                login,
                unclaimedRounds,
                refetchUnclaimed,
                buyLuckyDrawTickets,
                buyTicketsWithGameBalance,
                isRealMode,
                setIsRealMode: handleSetIsRealMode,
                hasRealAccess,
                participate,
                faucet,
                addresses,
                deposits: user?.deposits || [],
                loadMoreHistory,
                hasMoreHistory,
                isHistoryLoading,
                totalProfit
            }), [
                user,
                practiceBalance,
                realBalances,
                practiceExpiry,
                gameHistory,
                effectiveToken,
                isLoading,
                balanceData,
                chainId,
                isRegisteredOnChain,
                wagmiAddress,
                unclaimedRounds,
                buyLuckyDrawTickets,
                buyTicketsWithGameBalance,
                isRealMode,
                hasRealAccess,
                user,
                registerOnChain,
                faucet,
                usdtBalanceRaw,
                addresses,
                totalProfit,
                recentWallets,
                isSwitchingWallet,
                isWagmiConnected,
                effectiveToken
            ])
            }
        >
            {children}
        </WalletContext.Provider >
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
}
