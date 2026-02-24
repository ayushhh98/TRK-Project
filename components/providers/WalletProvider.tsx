"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authAPI, userAPI, gameAPI, depositAPI, packagesAPI, referralAPI, getToken, removeToken, getStoredUser, setStoredUser, setToken as setApiToken } from "@/lib/api";
import { useAccount, useConnect, useDisconnect, useSignMessage, useBalance, useSwitchChain, useWriteContract, useWalletClient, useReadContract, usePublicClient } from "wagmi";
import { openWeb3Modal } from "@/components/providers/Web3Provider";
import { toast } from "sonner";
import { bsc, bscTestnet } from "wagmi/chains";
import { TRKGameABI, ERC20ABI, TRKLuckyDrawABI } from "@/config/abis";
import { parseUnits, formatUnits, UserRejectedRequestError, isAddress, toHex } from "viem";
import { dedupeByKey, mergeUniqueByKey } from "@/lib/collections";

import { CONTRACTS } from "@/config/contracts";
import { socket } from "@/components/providers/Web3Provider";
import { useConfig, SystemConfig } from "@/hooks/useConfig";
import { motion, AnimatePresence } from "framer-motion";
import { Users, CheckCircle2, AlertCircle, ShieldCheck, Lock, Zap, History, TrendingUp, RefreshCw, WalletIcon, ArrowUpRight, ArrowDownLeft, Coins } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ReferralCodeModal } from "@/components/auth/ReferralCodeModal";


interface GameHistoryItem {
    id: string;
    hash: string;
    amount: number;
    prediction: string | number;
    won: boolean;
    payout: number;
    timestamp: string;
    createdAt?: string;
    gameType: 'dice' | 'crash' | 'spin' | 'mines' | 'plinko' | 'matrix' | 'guess';
    roundId?: string; // On-chain round ID for claiming
    roundNumber?: number;
    status?: string | null;
}

interface DepositItem {
    amount: number;
    txHash: string;
    createdAt: string;
}

interface WithdrawalItem {
    amount: number;
    walletType: string;
    txHash: string | null;
    status: string;
    createdAt: string;
}

interface RealBalances {
    game: number;          // Wallet 2
    cashbackROI: number;   // Wallet 4 (Internal)
    luckyDrawWallet: number; // Wallet 5 (Internal)

    // Tracking for Wallet 1 destination
    winners: number;
    directLevel: number;

    // Sub-balances for specific streams
    club: number;
    roiOnRoi: number;
    cashback: number;

    // Operational/Transit
    cash: number;

    totalUnified: number; // Sum of all internal
    grandTotal: number;    // Sum of all internal + External USDT
}

const DEFAULT_REAL_BALANCES: RealBalances = {
    game: 0,
    cashbackROI: 0,
    luckyDrawWallet: 0,
    winners: 0,
    directLevel: 0,
    club: 0,
    roiOnRoi: 0,
    cashback: 0,
    cash: 0,
    totalUnified: 0,
    grandTotal: 0
};

const toSafeNumber = (value: unknown): number => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    return Number.isFinite(num) ? num : 0;
};

const buildRealBalances = (
    raw?: Partial<RealBalances> & { teamWinners?: number } | null,
    externalUsdt = 0,
    overrides?: Partial<RealBalances>
): RealBalances => {
    const merged = {
        ...DEFAULT_REAL_BALANCES,
        ...(raw || {}),
        ...(overrides || {})
    };

    // Mapping legacy fields if present in raw data
    const normalized: RealBalances = {
        game: toSafeNumber(merged.game),
        club: toSafeNumber(merged.club),
        roiOnRoi: toSafeNumber(merged.roiOnRoi),
        cashback: toSafeNumber(merged.cashback),
        cashbackROI: toSafeNumber(merged.cashbackROI || (toSafeNumber(merged.cashback) + toSafeNumber(merged.roiOnRoi) + toSafeNumber(merged.club))),
        luckyDrawWallet: toSafeNumber(merged.luckyDrawWallet),
        winners: toSafeNumber(merged.winners || toSafeNumber(raw?.teamWinners)),
        directLevel: toSafeNumber(merged.directLevel),
        cash: toSafeNumber(merged.cash),
        totalUnified: 0,
        grandTotal: 0
    };

    normalized.totalUnified =
        normalized.game +
        normalized.cashbackROI +
        normalized.luckyDrawWallet +
        normalized.winners +
        normalized.directLevel +
        normalized.cash;

    normalized.grandTotal = normalized.totalUnified + toSafeNumber(externalUsdt);

    return normalized;
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
    totalPracticeVolume?: number;
    totalRealVolume?: number;
}

interface User {
    id: string;
    walletAddress: string;
    withdrawalLimits?: {
        dailyWithdrawalTotal: number;
        lastWithdrawalDate: string;
    };
    practiceBalance: number;
    practiceExpiry?: string | null;
    realBalances: RealBalances;
    referralCode: string;
    referredBy?: string;
    clubRank: string;
    activation?: Activation;
    deposits?: DepositItem[];
    withdrawals?: WithdrawalItem[];
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
    dailySpins: number;
    lastSpin: string;
    dailyCapReset: string;
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
    claimWin: (roundId: number, isCash: boolean) => Promise<string>;
    claimLoss: (roundId: number, isCash: boolean) => Promise<string>;
    claimLiquiditySync: () => Promise<void>;
    linkWallet: () => Promise<void>;
    registerOnChain: (providedCode?: string) => Promise<void>;
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
    withdrawals: WithdrawalItem[];
    loadMoreHistory: () => Promise<void>;
    hasMoreHistory: boolean;
    isHistoryLoading: boolean;
    totalProfit: number;

    // Referral Onboarding
    showReferralPrompt: boolean;
    setShowReferralPrompt: (show: boolean) => void;
    applyReferral: (code: string) => Promise<boolean>;
    topupLuckyWallet: (fromWallet: string, amount: number) => Promise<any>;

    // System Configuration
    systemConfig: SystemConfig | null;
    isConfigLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_HISTORY_KEY = "trk_recent_wallets";
const PREFERRED_WALLET_KEY = "trk_preferred_wallet";
const MAX_RECENT_WALLETS = 5;
const LOGIN_COOLDOWN_KEY = "trk_login_cooldown_until";
const LOGIN_THROTTLE_MS = 4000;
const LOGIN_SCOPE_KEY = "trk_login_scope";
const LOGIN_SESSION_SCOPE_KEY = "trk_login_session_scope";
const SIGNATURE_TIMEOUT_MS = 180000;
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

const mapGameVariant = (variant?: string): GameHistoryItem['gameType'] => {
    if (!variant) return 'dice';
    const v = variant.toLowerCase();
    if (v === 'spin-wheel' || v === 'spin') return 'spin';
    if (v === 'matrix' || v === 'probability-matrix') return 'matrix';
    if (v === 'crash') return 'crash';
    if (v === 'mines') return 'mines';
    if (v === 'plinko') return 'plinko';
    if (v === 'guess' || v === 'number-guess') return 'guess';
    return 'dice';
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
    const { address: wagmiAddress, isConnected: isWagmiConnected, chainId, connector: activeConnector } = useAccount();
    const { connectors, connectAsync } = useConnect();
    const { disconnect: wagmiDisconnect } = useDisconnect();
    const { signMessageAsync } = useSignMessage();
    const { switchChain, switchChainAsync } = useSwitchChain();
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const { config: systemConfig, isLoading: isConfigLoading } = useConfig();

    // Dynamic Address Helper
    const addresses = React.useMemo(() => {
        const chain = (chainId && CONTRACTS[chainId as keyof typeof CONTRACTS])
            ? chainId as keyof typeof CONTRACTS
            : 56; // Default to BSC Mainnet
        return CONTRACTS[chain];
    }, [chainId]);

    const normalizedWalletAddress = React.useMemo(() => {
        if (!wagmiAddress || !isAddress(wagmiAddress)) return undefined;
        return wagmiAddress as `0x${string}`;
    }, [wagmiAddress]);

    const gameContractAddress = React.useMemo(() => {
        if (!addresses?.GAME || !isAddress(addresses.GAME)) return undefined;
        return addresses.GAME as `0x${string}`;
    }, [addresses?.GAME]);

    const usdtContractAddress = React.useMemo(() => {
        if (!addresses?.USDT || !isAddress(addresses.USDT)) return undefined;
        return addresses.USDT as `0x${string}`;
    }, [addresses?.USDT]);

    const { data: balanceData } = useBalance({
        address: normalizedWalletAddress,
        query: { enabled: !!normalizedWalletAddress }
    });
    // Fetch USDT Balance explicitly via contract read to avoid wagmi version conflicts
    const { data: usdtBalanceRaw, refetch: refetchUsdt } = useReadContract({
        address: usdtContractAddress || ZERO_ADDRESS,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [normalizedWalletAddress || ZERO_ADDRESS],
        query: {
            enabled: !!normalizedWalletAddress && !!usdtContractAddress
        }
    });
    const { data: walletClient } = useWalletClient({
        query: { enabled: !!normalizedWalletAddress }
    });
    // openWeb3Modal is a safe helper that initializes Web3Modal on demand (client-only)

    const [user, setUser] = useState<User | null>(null);
    const [practiceBalance, setPracticeBalance] = useState("0.00");
    const [realBalances, setRealBalances] = useState<RealBalances>(DEFAULT_REAL_BALANCES);
    const [practiceExpiry, setPracticeExpiry] = useState<string | null>(null);
    const [showReferralGate, setShowReferralGate] = useState(false);
    const [referralGateInput, setReferralGateInput] = useState("");
    const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegisteredOnChain, setIsRegisteredOnChain] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [recentWallets, setRecentWallets] = useState<string[]>([]);
    const [isSwitchingWallet, setIsSwitchingWallet] = useState(false);
    const [unclaimedRounds, setUnclaimedRounds] = useState<bigint[]>([]);
    const [showReferralPrompt, setShowReferralPrompt] = useState(false);
    const [pendingReferralCode, setPendingReferralCode] = useState("");

    // History Pagination State
    const [historyPage, setHistoryPage] = useState(1);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const [isRealMode, setIsRealMode] = useState(false);
    const [totalProfit, setTotalProfit] = useState(0);

    const router = useRouter();
    const pathname = usePathname();
    const wagmiAddressRef = React.useRef<typeof wagmiAddress>(wagmiAddress);
    const wagmiConnectedRef = React.useRef(isWagmiConnected);
    const lastLoginAttemptRef = React.useRef(0);
    const onchainSyncInFlightRef = React.useRef(false);
    const lastOnchainSyncRef = React.useRef(0);
    const refreshInFlightRef = React.useRef(false);
    const lastRefreshAtRef = React.useRef(0);

    const isUserRejected = (error: any) => (
        error instanceof UserRejectedRequestError
        || error?.code === 4001
        || error?.cause?.code === 4001
        || /user rejected|user denied|rejected/i.test(error?.message || "")
    );

    const isPersonalSignFailure = (error: any) => {
        const message = (error?.message || "").toLowerCase();
        return (
            message.includes("personal_sign")
            || message.includes("method not found")
            || message.includes("not supported")
            || message.includes("is not available")
            || error?.code === -32601
            || error?.cause?.code === -32601
        );
    };

    const signMessageWithFallback = async (message: string, account: `0x${string}`) => {
        try {
            return await signMessageAsync({ message, account });
        } catch (error: any) {
            if (isUserRejected(error)) throw error;
            if (!isPersonalSignFailure(error) || !walletClient) throw error;

            try {
                // Some providers expect reversed personal_sign params.
                // Some providers expect reversed personal_sign params or hex message.
                return await walletClient.request({
                    // @ts-ignore
                    method: "personal_sign",
                    params: [toHex(message), account]
                }) as `0x${string}`;
            } catch (innerError: any) {
                if (isUserRejected(innerError)) throw innerError;
                try {
                    // Fallback for providers that only support eth_sign.
                    return await walletClient.request({
                        // @ts-ignore
                        method: "eth_sign",
                        params: [account, toHex(message)]
                    }) as `0x${string}`;
                } catch (ethSignError: any) {
                    throw error;
                }
            }
        }
    };

    const getLoginScope = () => {
        if (typeof window === "undefined") return "user";
        const path = window.location.pathname || "";
        if (path.startsWith("/admin")) return "admin";
        const scope = localStorage.getItem(LOGIN_SCOPE_KEY);
        return scope === "admin" ? "admin" : "user";
    };

    const setLoginScope = (scope: "admin" | "user") => {
        if (typeof window === "undefined") return;
        localStorage.setItem(LOGIN_SCOPE_KEY, scope);
    };

    const getSessionScope = () => {
        if (typeof window === "undefined") return "user";
        const scope = localStorage.getItem(LOGIN_SESSION_SCOPE_KEY);
        return scope === "admin" ? "admin" : "user";
    };

    const setSessionScope = (scope: "admin" | "user") => {
        if (typeof window === "undefined") return;
        localStorage.setItem(LOGIN_SESSION_SCOPE_KEY, scope);
    };

    const clearSessionScope = () => {
        if (typeof window === "undefined") return;
        localStorage.removeItem(LOGIN_SESSION_SCOPE_KEY);
    };

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!pathname) return;
        const nextScope = pathname.startsWith("/admin") ? "admin" : "user";
        setLoginScope(nextScope);
        // We do NOT clear session here. Admins should be able to visit user pages.
        // Component-level protection (AdminGuard) should handle access control.
    }, [pathname]);

    const hasRealAccess = React.useMemo(() => {
        const totalDeposited = user?.activation?.totalDeposited || 0;
        // Require at least 10 USDT deposit for real money mode
        return totalDeposited >= 10 || (realBalances.totalUnified || 0) >= 10;
    }, [user?.activation?.totalDeposited, realBalances.totalUnified]);

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

    // Hide referral prompt once a referral is claimed
    useEffect(() => {
        if (user?.referredBy) {
            setShowReferralPrompt(false);
            if (typeof window !== "undefined") {
                localStorage.removeItem("trk_referrer_code");
            }
        }
    }, [user?.referredBy]);

    // Sync practice expiry from backend user profile (do not reset on refresh)
    useEffect(() => {
        if (!user?.practiceExpiry) {
            setPracticeExpiry(null);
            return;
        }
        const parsed = new Date(user.practiceExpiry);
        if (Number.isNaN(parsed.getTime())) {
            setPracticeExpiry(null);
            return;
        }
        setPracticeExpiry(parsed.toISOString());
    }, [user?.practiceExpiry]);

    // Check Unclaimed Winnings
    const { data: unclaimedData, refetch: refetchUnclaimed } = useReadContract({
        address: gameContractAddress || ZERO_ADDRESS,
        abi: TRKGameABI,
        functionName: 'getUnclaimedRounds',
        args: [normalizedWalletAddress || ZERO_ADDRESS, true], // true = Cash Game
        query: {
            enabled: !!normalizedWalletAddress && !!gameContractAddress
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
        address: gameContractAddress || ZERO_ADDRESS,
        abi: TRKGameABI,
        functionName: 'getUserBalances',
        args: [normalizedWalletAddress || ZERO_ADDRESS],
        query: {
            enabled: !!normalizedWalletAddress && !!gameContractAddress,
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
            const [walletBal, _practiceBal, cashGameBal, cashback] = userBalancesData as any[];

            // HYBRID SYNC: Resolve conflict between On-Chain (Contract) and Off-Chain (Manual DB Credit).
            // We take the MAX value to ensure that if a manual credit exists in DB but not on legacy contract, it is shown.
            const onChainGame = Number(formatUnits(cashGameBal || 0n, 18));
            const backendGame = user?.realBalances?.game || 0;
            const finalGame = Math.max(onChainGame, backendGame);

            const onChainWalletBalance = Number(formatUnits(walletBal || 0n, 18));
            const gBal = finalGame;
            const onChainCashback = Number(formatUnits(cashback || 0n, 18));
            const externalUsdt = Number(formatUnits(usdtBalanceRaw || 0n, 18));

            if (onChainGame > backendGame) {
                maybeSyncOnchainBalance(onChainGame, backendGame);
            }

            const backendPractice = typeof user?.practiceBalance === "number" ? user.practiceBalance : 0;

            setRealBalances(prev => {
                const source = user?.realBalances || prev;
                const sourceCashbackROI = toSafeNumber(source.cashbackROI);

                return buildRealBalances(source, externalUsdt, {
                    game: gBal,
                    cashbackROI: Math.max(onChainCashback, sourceCashbackROI),
                    winners: source.winners // Winners/DirectLevel are usually off-chain credited pending claim
                });
            });
            setPracticeBalance(Number(backendPractice).toFixed(2));
        }
    }, [userBalancesData, usdtBalanceRaw, user?.realBalances, user?.practiceBalance]);


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
            const currentScope = getLoginScope();
            const sessionScope = getSessionScope();
            if (sessionScope && sessionScope !== currentScope) {
                removeToken();
                setUser(null);
                setToken(null);
                clearSessionScope();
            }

            const storedToken = getToken();
            const storedUser = getStoredUser();

            if (storedToken && storedUser) {
                try {
                    const response = await userAPI.getMe();
                    if (response.data?.user) {
                        setUser(response.data.user);
                        setPracticeBalance(response.data.user.practiceBalance?.toString() || "0.00");
                        if (response.data.user.realBalances) {
                            const externalUsdt = Number(formatUnits(usdtBalanceRaw || 0n, 18));
                            setRealBalances(buildRealBalances(response.data.user.realBalances, externalUsdt));
                        } else {
                            setRealBalances(DEFAULT_REAL_BALANCES);
                        }
                        setToken(storedToken);

                        // Fetch initial history
                        try {
                            const historyRes = await gameAPI.getHistory(undefined, 20, 1);

                            if (historyRes.status === 'success' && Array.isArray(historyRes.data?.games)) {
                                const mappedHistory: GameHistoryItem[] = historyRes.data.games.map((g: any) => ({
                                    id: g._id,
                                    hash: g.txHash || `GAME-${g._id.slice(-6)}`,
                                    amount: g.betAmount,
                                    prediction: g.pickedNumber,
                                    won: g.isWin,
                                    payout: g.payout,
                                    timestamp: g.createdAt || g.timestamp,
                                    createdAt: g.createdAt,
                                    gameType: mapGameVariant(g.gameVariant),
                                    roundId: g.roundId,
                                    roundNumber: g.roundNumber
                                }));
                                const deduped = dedupeByKey(mappedHistory, (h) => h.id || h.hash);
                                setGameHistory(deduped);
                                const total = Number(historyRes.data?.pagination?.total || deduped.length);
                                setHasMoreHistory(deduped.length < total);
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
                    const externalUsdt = Number(formatUnits(usdtBalanceRaw || 0n, 18));
                    setRealBalances(buildRealBalances(freshUser.realBalances, externalUsdt));
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

    // REAL-TIME REFERRAL LISTENERS
    useEffect(() => {
        if (!socket || !user) return;

        const handleStatusChange = (data: { userId: string, status: 'online' | 'offline' }) => {
            // Optional: Show status change info
            // console.log(`Referral ${data.userId} is ${data.status}`);
        };

        const handleActivity = (data: { type: string, amount: number, userName: string }) => {
            if (data.type === 'deposit') {
                toast.success(`${data.amount} USDT Deposit Incoming!`, {
                    description: `${data.userName} just added funds. Your commission is live.`,
                    icon: "ðŸ’°"
                });
                refreshUser();
            } else if (data.type === 'signup') {
                toast.success(`ðŸŽ‰ New Referral Joined!`, {
                    description: `${data.userName} just signed up with your code. +$${data.amount} bonus credited.`,
                    icon: "ðŸ¤",
                    duration: 6000
                });
                refreshUser();
            }
        };

        const handleBalanceUpdate = (data: any) => {
            console.log("ðŸ’° Real-Time Balance Update Received:", data);

            // Refresh user data immediately
            refreshUser();

            // Enhanced visual feedback based on update type
            if (data.type === 'deposit') {
                toast.success(`ðŸ’Ž Deposit Successful!`, {
                    description: `+${data.amount.toFixed(2)} USDT added to your balance. New Balance: ${data.newBalance.toFixed(2)} USDT`,
                    icon: "ðŸ’°",
                    duration: 5000
                });

                // Optional: Trigger confetti or celebration animation
                if (typeof window !== 'undefined') {
                    const event = new CustomEvent('deposit-success', {
                        detail: { amount: data.amount, newBalance: data.newBalance }
                    });
                    window.dispatchEvent(event);
                }
            } else if (data.type === 'practice_transfer') {
                toast.success(`ðŸš‰ Bridge Sync Successful!`, {
                    description: `Successfully moved ${data.amount.toFixed(2)} USDT from Practice to Game Wallet.`,
                    icon: "âš¡",
                    duration: 5000
                });
            } else if (data.type === 'commission') {
                toast.success(`âš¡ Commission Earned!`, {
                    description: `+$${data.amount.toFixed(2)} from ${data.commissionType || 'team activity'}`,
                    icon: "ðŸ’¸",
                    duration: 5000
                });
            } else if (data.type === 'club_income') {
                toast.success(`ðŸ¢ Club Income Received!`, {
                    description: `+$${data.amount.toFixed(2)} pool share for ${data.rank || 'your rank'}`,
                    icon: "ðŸŽ¯",
                    duration: 5000
                });
            } else if (data.type === 'lucky_win') {
                toast.success(`ðŸŽ° JACKPOT WIN!`, {
                    description: `ðŸŽ‰ You won $${data.amount.toFixed(2)} in the Lucky Draw!`,
                    icon: "ðŸ†",
                    duration: 10000
                });
            } else if (data.type === 'rank_up') {
                toast.success(`ðŸš€ RANK UPGRADED!`, {
                    description: data.message || `New Club Rank: ${data.newRank}`,
                    icon: "â­",
                    duration: 8000
                });
            } else if (data.type === 'withdrawal') {
                toast.success(`âœ… Withdrawal Processed`, {
                    description: `${data.amount.toFixed(2)} USDT sent to your wallet`,
                    icon: "ðŸ’³",
                    duration: 5000
                });
            } else if (data.type === 'referral_bonus') {
                toast.success(`Referral Practice Bonus Received`, {
                    description: `+${data.amount.toFixed(2)} added to your Practice Wallet.`,
                    icon: "ðŸŽ",
                    duration: 6000
                });
            } else {
                // Generic balance update
                toast.info(`Balance Updated`, {
                    description: `Your balance has been updated in real-time`,
                    icon: "ðŸ”„",
                    duration: 3000
                });
            }
        };

        const currentSocket = socket;
        currentSocket.on('referral_status_change', handleStatusChange);
        currentSocket.on('referral_activity', handleActivity);
        currentSocket.on('balance_update', handleBalanceUpdate);

        return () => {
            if (currentSocket) {
                currentSocket.off('referral_status_change', handleStatusChange);
                currentSocket.off('referral_activity', handleActivity);
                currentSocket.off('balance_update', handleBalanceUpdate);
            }
        };
    }, [user]);

    const applyReferral = async (referralCode: string) => {
        const activeToken = token || getToken();
        if (!activeToken) return false;
        const normalizedCode = referralCode.trim().toUpperCase();

        const finalizeReferralLink = async (linkedByHint?: string) => {
            let effectiveLinkedBy = linkedByHint || normalizedCode;
            let syncedUser: any = null;

            // Pull latest profile so frontend gate state matches backend immediately.
            try {
                const meRes = await userAPI.getMe();
                if (meRes?.data?.user) {
                    syncedUser = meRes.data.user;
                    setUser(syncedUser);
                    setStoredUser(syncedUser);
                    if (syncedUser.referredBy) {
                        effectiveLinkedBy = syncedUser.referredBy;
                    }
                }
            } catch {
                // Best effort: fallback to optimistic local update below.
            }

            if (!syncedUser) {
                if (user) {
                    const updatedUser = { ...user, referredBy: user.referredBy || effectiveLinkedBy };
                    setUser(updatedUser);
                    setStoredUser(updatedUser);
                } else {
                    const storedUser = getStoredUser();
                    if (storedUser) {
                        const updatedUser = { ...storedUser, referredBy: storedUser.referredBy || effectiveLinkedBy };
                        setUser(updatedUser);
                        setStoredUser(updatedUser);
                    }
                }
            }

            setShowReferralPrompt(false);
            setShowReferralGate(false);
            if (typeof window !== "undefined") {
                localStorage.removeItem("trk_referrer_code");
            }
            return true;
        };

        try {
            const res = await referralAPI.applyCode(normalizedCode);
            if (res.status === 'success') {
                toast.success("Referral Activated!", {
                    description: `You are now linked to ${res.data.referredBy}`
                });
                return await finalizeReferralLink(res.data?.referredBy);
            } else {
                toast.error(res.message || "Invalid referral code");
                return false;
            }
        } catch (err: any) {
            const msg = (err?.message || err?.data?.message || "").toString();
            if (/already referred/i.test(msg)) {
                toast.success("Registration Completed Successfully", {
                    description: "Your account is already connected to a referral."
                });
                return await finalizeReferralLink();
            }
            toast.error(err.message || "Failed to apply referral code");
            return false;
        }
    };

    // Flag to prevent auth attempts during logout
    const isDisconnectingRef = React.useRef(false);
    // Flag to prevent overlapping login calls
    const loginInProgressRef = React.useRef(false);

    const refreshUser = async () => {
        const activeToken = token || getToken();
        if (!activeToken) return;
        if (refreshInFlightRef.current) return;
        const now = Date.now();
        if (now - lastRefreshAtRef.current < 1500) return;
        refreshInFlightRef.current = true;
        lastRefreshAtRef.current = now;
        try {
            // 1. Sync backend session
            const response = await userAPI.getMe();
            if (response.data?.user) {
                setUser(response.data.user);

                // Force Mandatory Referral Gate if missing (for player role only)
                if (response.data.user.role === 'player' && !response.data.user.referredBy) {
                    console.log("[AUTH-REFRESH] Player missing referral. Activating Mandatory Gate. User:", response.data.user._id);
                    setShowReferralGate(true);
                } else if (showReferralGate && response.data.user.referredBy) {
                    console.log("[AUTH-REFRESH] Referral now present. Closing gate.");
                    setShowReferralGate(false);
                }

                // Note: We prioritize on-chain balances if they've been fetched,
                // otherwise fallback to backend values.
                if (!userBalancesData) {
                    setPracticeBalance(response.data.user.practiceBalance?.toString() || "0.00");
                    if (response.data.user.realBalances) {
                        const totalDeposited = response.data.user.activation?.totalDeposited || 0;
                        const externalUsdt = Number(formatUnits(usdtBalanceRaw || 0n, 18));
                        const hydrated = buildRealBalances(response.data.user.realBalances, externalUsdt);

                        setRealBalances(hydrated);
                        setTotalProfit(hydrated.totalUnified - totalDeposited);
                    }
                }
            }
            // 2. Clear on-chain refetch to ensure UI is fresh
            if (refetchOnChainBalances) await refetchOnChainBalances();
            if (refetchUsdt) await refetchUsdt();

            // 3. Fetch Game History
            setHistoryPage(1);
            const limit = 20;
            const historyRes = await gameAPI.getHistory(undefined, limit, 1);

            if (historyRes.status === 'success' && Array.isArray(historyRes.data?.games)) {
                // Map backend history to frontend model
                const mappedHistory: GameHistoryItem[] = historyRes.data.games.map((g: any) => ({
                    id: g._id,
                    hash: g.txHash || `GAME-${g._id.slice(-6)}`,
                    amount: g.betAmount,
                    prediction: g.pickedNumber,
                    won: g.isWin,
                    payout: g.payout,
                    timestamp: g.createdAt,
                    gameType: mapGameVariant(g.gameVariant),
                    roundId: g.roundId
                }));
                setGameHistory(dedupeByKey(mappedHistory, (h) => h.id || h.hash));
                // Check if more pages exist
                const total = Number(historyRes.data?.pagination?.total || mappedHistory.length);
                setHasMoreHistory(mappedHistory.length < total);
            }
        } catch (error) {
            console.error("Failed to refresh user:", error);
        } finally {
            refreshInFlightRef.current = false;
        }
    };

    // Handle Wagmi connection changes -> Login Flow
    const login = async (force: boolean = false) => {
        if (isDisconnectingRef.current || loginInProgressRef.current) {
            return;
        }

        const now = Date.now();
        if (!force && now - lastLoginAttemptRef.current < LOGIN_THROTTLE_MS) {
            console.log("[AUTH] Login throttled");
            return;
        }

        loginInProgressRef.current = true;
        setIsLoading(true);

        if (!isWagmiConnected || !wagmiAddress) {
            loginInProgressRef.current = false;
            setIsLoading(false);
            return;
        }

        const connectRequested = localStorage.getItem(WALLET_CONNECT_REQUEST_KEY) === "true";
        if (!force && !connectRequested && !isSwitchingWallet) {
            loginInProgressRef.current = false;
            setIsLoading(false);
            return;
        }

        lastLoginAttemptRef.current = now;

        let toastId: string | number | undefined;

        try {
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
            let effectiveToken = token || storedToken;
            let effectiveUser = user || storedUser;

            const loginScope = getLoginScope();
            const sessionScope = getSessionScope();

            if (sessionScope && sessionScope !== loginScope) {
                removeToken();
                setUser(null);
                setToken(null);
                clearSessionScope();
                effectiveToken = null;
                effectiveUser = null;
            }

            const requiresAdmin = loginScope === "admin";
            const isEffectiveAdmin = effectiveUser?.role === "admin" || effectiveUser?.role === "superadmin";

            if (requiresAdmin && effectiveUser && !isEffectiveAdmin) {
                removeToken();
                setUser(null);
                setToken(null);
                clearSessionScope();
                effectiveToken = null;
                effectiveUser = null;
            }

            const pendingReferralCode = localStorage.getItem("trk_referrer_code")?.trim() || "";
            const needsReferralApply = !!(effectiveUser && effectiveUser.role === 'player' && !effectiveUser.referredBy && pendingReferralCode);

            if (!force && showReferralGate && !pendingReferralCode) {
                setWalletConnectRequested(false);
                return;
            }

            if (effectiveToken && effectiveUser && !needsReferralApply) {
                if (effectiveUser.walletAddress?.toLowerCase() === wagmiAddress.toLowerCase()) {
                    if (!user || token !== effectiveToken) {
                        setUser(effectiveUser);
                        setToken(effectiveToken);

                        if (effectiveUser.practiceBalance !== undefined) {
                            setPracticeBalance(effectiveUser.practiceBalance.toString());
                        }
                        if (effectiveUser.realBalances) {
                            const externalUsdt = Number(formatUnits(usdtBalanceRaw || 0n, 18));
                            setRealBalances(buildRealBalances(effectiveUser.realBalances, externalUsdt));
                        }
                    }
                }

                if (!connectRequested && !isSwitchingWallet) {
                    setWalletConnectRequested(false);
                    return;
                }
            } else {
                if (!isSwitchingWallet && !connectRequested && !needsReferralApply) return;
            }

            toastId = toast.loading("Establishing Secure Uplink...");

            // 2. Network Enforcement (BSC)
            const bscChainId = 56;
            const targetChainId = process.env.NEXT_PUBLIC_CHAIN_ID ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) : bscChainId;

            if (chainId !== targetChainId) {
                toast.loading("Switching to Optimized Network...", { id: toastId });
                try {
                    await switchChainAsync({ chainId: targetChainId });
                    // Provide buffer for wallet providers to stabilize after chain switch
                    await new Promise(resolve => setTimeout(resolve, 1500));
                } catch (switchErr: any) {
                    if (switchErr instanceof UserRejectedRequestError || switchErr.code === 4001 || switchErr.message?.includes("User rejected")) {
                        toast.dismiss(toastId);
                        toast.info("Network switch cancelled", { description: "You rejected the network switch." });
                        return;
                    }
                    console.error("Network switch failed:", switchErr);
                    throw new Error("Network Mismatch: Please switch to Binance Smart Chain to proceed.");
                }
            }

            // 3. Fetch Nonce
            const referrerCode = localStorage.getItem("trk_referrer_code")?.trim();
            let nonceRes;
            try {
                nonceRes = await authAPI.getNonce(wagmiAddress, referrerCode || undefined);
            } catch (nonceError: any) {
                const nonceMsg = nonceError?.message || "";
                if (
                    nonceError?.data?.requiresReferral ||
                    nonceMsg.includes("Referral code is required") ||
                    nonceMsg.includes("referral code to join")
                ) {
                    if (toastId !== undefined) toast.dismiss(toastId);
                    toast.info("Referral Code Required", {
                        description: "Please enter a valid referral code to complete your registration."
                    });
                    setShowReferralGate(true);
                    return;
                }
                throw nonceError;
            }

            const effectiveNonceData = nonceRes.data || nonceRes;

            if (nonceRes.status !== 'success' || !effectiveNonceData.message) {
                console.error("Nonce Generation Error Detail:", nonceRes);
                throw new Error(nonceRes.message || "Security Handshake Failed: Unable to generate nonce.");
            }

            const nonceMessage = effectiveNonceData.message;

            // 4. Request Signature
            toast.loading("Awaiting Quantum Signature...", {
                id: toastId,
                description: "Please confirm the authentication request in your wallet."
            });

            // Small cooldown for provider stability after potential network switch
            await new Promise(resolve => setTimeout(resolve, 800));

            const signPromise = signMessageWithFallback(
                nonceMessage,
                wagmiAddress as `0x${string}`
            );

            let timeoutId: ReturnType<typeof setTimeout> | undefined;
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("Signature Request Timed Out")), SIGNATURE_TIMEOUT_MS);
            });

            // @ts-ignore
            const signature = await Promise.race([signPromise, timeoutPromise]);
            if (timeoutId) clearTimeout(timeoutId);

            // 5. Verification
            toast.loading("Decrypting Identity...", { id: toastId });

            const verifyRes = await authAPI.verify(wagmiAddress, signature as string);

            if (verifyRes.status !== 'success') {
                console.error('[DEBUG AUTH] Verification Error Detail:', verifyRes);
            }

            const verifiedToken = verifyRes.data?.accessToken || verifyRes.data?.token;
            if (verifyRes.status === 'success' && verifiedToken) {
                const newToken = verifiedToken;
                const userData = verifyRes.data.user;
                const currentScope = getLoginScope();
                const requiresAdminScope = currentScope === "admin";
                const isAdminRole = userData?.role === 'admin' || userData?.role === 'superadmin';
                const requiresReferralGate = userData?.role === 'player' && !userData?.referredBy;

                if (requiresAdminScope && !isAdminRole) {
                    removeToken();
                    setUser(null);
                    setToken(null);
                    clearSessionScope();
                    toast.error("Admin access required.", {
                        description: "This wallet is not authorized for admin login."
                    });
                    router.replace('/admin/login?reason=unauthorized');
                    return;
                }

                // Sync Internal State
                setToken(newToken);
                setUser(userData);
                setRealBalances(
                    buildRealBalances(
                        userData.realBalances,
                        Number(formatUnits(usdtBalanceRaw || 0n, 18))
                    )
                );
                setPracticeBalance(userData.practiceBalance?.toString() || "0.00");

                if (requiresReferralGate) {
                    setShowReferralGate(true);
                }

                // Sync API & Persistence
                setApiToken(newToken);
                setStoredUser(userData);
                localStorage.setItem("trk_wallet_address", wagmiAddress);
                setSessionScope(currentScope);

                window.dispatchEvent(new CustomEvent('trk_auth_change'));

                toast.dismiss(toastId);
                toast.success("Identity Verified. Access Granted.");
                setIsSwitchingWallet(false);
                localStorage.removeItem(PREFERRED_WALLET_KEY);
                setWalletConnectRequested(false);
                localStorage.removeItem(LOGIN_COOLDOWN_KEY);
                loginInProgressRef.current = false;

                const path = window.location.pathname;
                const isAdminLoginScope = currentScope === "admin";
                const isAuthGate = path === "/" || path === "/auth" || path === "/admin/login";

                if (isAdminRole) {
                    if (isAdminLoginScope) {
                        router.replace("/admin");
                    } else if (isAuthGate) {
                        router.replace("/");
                    } else {
                        refreshUser();
                    }
                } else {
                    if (requiresReferralGate) {
                        console.log("[AUTH] Referral required — keeping user here for referral gate.");
                    } else {
                        if (pendingReferralCode && userData?.role === 'player') {
                            toast.success("Registration Completed Successfully", {
                                description: "Referral code verified. Redirecting to dashboard."
                            });
                            localStorage.removeItem("trk_referrer_code");
                            setShowReferralGate(false);
                        }
                        router.replace("/dashboard");
                    }
                }
            } else {
                throw new Error(verifyRes.message || "Identity Verification Failed.");
            }
        } catch (error: any) {
            loginInProgressRef.current = false;
            setIsLoading(false);
            if (isDisconnectingRef.current) return;

            const isUserReject = error instanceof UserRejectedRequestError || error.code === 4001 || error.message?.includes("User rejected");
            const isNetworkErr = error.message?.includes("Gateway") || error.message?.includes("fetch");
            const isRateLimited = error.message?.toLowerCase().includes("too many requests") || error.message?.includes("429");
            const isSignatureTimeout = error.message?.includes("Signature Request Timed Out");

            if (!isUserReject) {
                console.error("Production Login Failure:", error);
            }

            if (isUserReject) {
                toast.dismiss(toastId);
                toast.info("Uplink Cancelled", { description: "You rejected the signature request." });
                setWalletConnectRequested(false);
            } else if (isSignatureTimeout) {
                toast.dismiss(toastId);
                toast.error("Signature timed out", {
                    description: "No signature received. Open your wallet and approve the request.",
                    action: {
                        label: "Open Wallet",
                        onClick: () => {
                            setWalletConnectRequested(true);
                            void openWeb3Modal().then(() => {
                                if (wagmiConnectedRef.current && wagmiAddressRef.current) {
                                    void login();
                                }
                            });
                        }
                    }
                });
            } else if (isRateLimited) {
                toast.dismiss(toastId);
                const cooldownMs = 15 * 60 * 1000;
                localStorage.setItem(LOGIN_COOLDOWN_KEY, String(Date.now() + cooldownMs));
                toast.error("Rate limit reached", { description: "Please wait 15 minutes before trying again." });
            } else if (isNetworkErr) {
                toast.dismiss(toastId);
                toast.error("Network Congestion", {
                    description: "Server is taking too long to respond. Check your connection.",
                    action: { label: "Retry", onClick: () => login() }
                });
            } else {
                toast.dismiss(toastId);
                toast.error("Authentication Error", {
                    description: error.message || "An unexpected error occurred. Please try again.",
                    action: { label: "Retry", onClick: () => login() }
                });

                const msg = error.message || "";
                if (error.data?.requiresReferral || msg.includes("Referral code is required") || msg.includes("referral code to join")) {
                    toast.info("Referral Code Required", { description: "Please enter a valid referral code to complete your registration." });
                    setShowReferralGate(true);
                    return;
                }
            }

            if (isSwitchingWallet) {
                setIsSwitchingWallet(false);
            }

            if (!token && !getToken()) {
                removeToken();
                setUser(null);
                setToken(null);
            }
        } finally {
            loginInProgressRef.current = false;
            setIsLoading(false);
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
        clearSessionScope();
        removeToken();
    }, []);

    const connect = async (walletType: string) => {
        // Prevent concurrent connection attempts
        if (loginInProgressRef.current) {
            toast.info("Login already in progress", {
                description: "Check your wallet for the signature request."
            });
            return;
        }

        if (typeof window !== "undefined") {
            const path = window.location.pathname || "";
            setLoginScope(path.startsWith("/admin") ? "admin" : "user");
        }

        setIsLoading(true);
        // console.log("Production Login Request:", walletType);
        setWalletConnectRequested(true);

        try {
            const activeConnectorName = activeConnector?.name?.toLowerCase() || "";
            const activeConnectorId = activeConnector?.id?.toLowerCase() || "";
            const activeConnectorType = activeConnector?.type?.toLowerCase() || "";
            const isMetaMaskActive = activeConnectorName.includes("metamask")
                || activeConnectorId.includes("metamask")
                || activeConnectorType === "metamask";
            const isTrustActive = activeConnectorName.includes("trust")
                || activeConnectorId.includes("trust")
                || activeConnectorId.includes("com.trustwallet")
                || activeConnectorType === "trust";

            const shouldReuseExisting =
                isWagmiConnected
                && wagmiAddress
                && (
                    (walletType === "MetaMask" && isMetaMaskActive) ||
                    (walletType === "Trust Wallet" && isTrustActive) ||
                    (walletType !== "MetaMask" && walletType !== "Trust Wallet")
                );

            // 0. Already connected with the requested wallet? Trigger auth directly and skip modal.
            if (shouldReuseExisting) {
                await login();
                return;
            }

            // 1. Explicit Modal/WalletConnect request
            if (walletType === 'Other' || walletType === 'WalletConnect') {
                await openWeb3Modal();
                // If a wallet is already connected, trigger auth explicitly.
                if (wagmiConnectedRef.current && wagmiAddressRef.current) {
                    await login();
                }
                return;
            }

            // If connected to a different wallet, disconnect first to avoid reusing the wrong provider.
            if (isWagmiConnected) {
                try {
                    wagmiDisconnect();
                } catch (err) {
                    console.warn("Failed to disconnect existing wallet before reconnecting.", err);
                }
            }

            // 2. Identify Connector - Simple Direct Matching
            console.log("=== WALLET CONNECTION DEBUG ===");
            console.log("Available Connectors:", connectors.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                uid: c.uid
            })));
            console.log("Requested Wallet Type:", walletType);

            // Synchronous Mobile Browser Check: Prevent iOS from blocking deep links by opening Web3Modal immediately
            // if we know there is no native injected provider, avoiding the long timeout of connectAsync.
            const isPureMobileBrowser = typeof window !== 'undefined' &&
                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) &&
                !(window as any).ethereum;

            if (isPureMobileBrowser && (walletType === 'MetaMask' || walletType === 'Trust Wallet')) {
                console.log("Pure Mobile Browser Detected. Bypassing custom connector search for Web3Modal.");
                toast.info(`Opening WalletConnect...`);
                await openWeb3Modal();

                // If a wallet connects immediately via cached session or modal action
                if (wagmiConnectedRef.current && wagmiAddressRef.current) {
                    await login();
                }
                return;
            }

            let connector;

            if (walletType === 'Trust Wallet') {
                // Try multiple matching strategies in order of preference
                connector = connectors.find(c => c.id === 'com.trustwallet.app') ||  // EIP-6963
                    connectors.find(c => c.name === 'Trust Wallet') ||         // Name match
                    connectors.find(c => c.id === 'trust') ||                   // ID match
                    connectors.find(c => c.name.toLowerCase().includes('trust')); // Fuzzy match

                console.log("Trust Wallet Selected Connector:", connector ? {
                    id: connector.id,
                    name: connector.name,
                    type: connector.type
                } : "NONE FOUND");

            } else if (walletType === 'MetaMask') {
                // Try multiple matching strategies in order of preference
                connector = connectors.find(c => c.id === 'io.metamask') ||           // EIP-6963
                    connectors.find(c => c.name === 'MetaMask') ||             // Name match
                    connectors.find(c => c.id === 'metaMask') ||                // ID match (camelCase)
                    connectors.find(c => c.name.toLowerCase().includes('metamask')); // Fuzzy match

                console.log("MetaMask Selected Connector:", connector ? {
                    id: connector.id,
                    name: connector.name,
                    type: connector.type
                } : "NONE FOUND");
            }

            console.log("=== END DEBUG ===");

            // 3. Connector Found? Connect.
            if (connector) {
                // Attempt Secure Handshake
                const toastId = toast.loading(`Connecting to ${walletType}...`);
                try {
                    await connectAsync({ connector });
                    toast.dismiss(toastId);
                } catch (err: any) {
                    toast.dismiss(toastId);
                    const isMissingProvider = err.name === 'ProviderNotFoundError' ||
                        err.message?.includes("Provider not found") ||
                        err.message?.includes("Connector not found");

                    if (err instanceof UserRejectedRequestError || err.code === 4001 || err.message?.includes("User rejected")) {
                        toast.info("Connection Cancelled");
                    } else if (isMissingProvider) {
                        const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                        if (isMobile) {
                            // Instead of manual deep linking which loses the handshake payload,
                            // we fallback to Web3Modal which natively handles mobile deep linking + WalletConnect
                            toast.info(`Opening Mobile Wallet...`);
                            await openWeb3Modal();

                            // If they connected successfully via modal, trigger auth
                            if (wagmiConnectedRef.current && wagmiAddressRef.current) {
                                await login();
                            }
                            return;
                        }

                        toast.error(`${walletType} extension not detected.`, {
                            description: `Please install the ${walletType} extension or try "Other Wallets".`
                        });
                        // Don't auto-open modal if they specifically clicked a wallet that is missing
                    } else {
                        console.error(`Connection Error (${walletType}):`, err);
                        toast.error(`Failed to connect to ${walletType}`, {
                            description: err.message || 'Unknown error'
                        });
                    }
                    return;
                }
            } else {
                // Connector not found - fallback to Web3Modal which can handle wallet selection better
                console.warn(`No connector found for ${walletType}. Available connectors:`,
                    connectors.map(c => ({ id: c.id, name: c.name }))
                );

                toast.info(`${walletType} connector not found`, {
                    description: 'Opening wallet selection modal...'
                });

                // Fallback to Web3Modal
                await openWeb3Modal();

                // If a wallet is already connected after modal, trigger auth
                if (wagmiConnectedRef.current && wagmiAddressRef.current) {
                    await login();
                }
                return;
            }

            // After connection attempt, authenticate

            // Should be handled by useEffect, but good to have fallback checks
            if (wagmiConnectedRef.current && wagmiAddressRef.current) {
                await login();
            }

        } catch (error: any) {
            if (error instanceof UserRejectedRequestError || error.code === 4001 || error.message?.includes("User rejected")) {
                toast.info("Connection Cancelled");
            } else {
                console.error("Critical Connection Error:", error);
                toast.error("Handshake Failed", { description: "The system could not initialize the wallet link." });
            }
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
        clearSessionScope();
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



    const loadMoreHistory = async () => {
        if (!token || !hasMoreHistory || isHistoryLoading) return;

        setIsHistoryLoading(true);
        try {
            const nextPage = historyPage + 1;
            const limit = 20;

            const historyRes = await gameAPI.getHistory(undefined, limit, nextPage);

            if (historyRes.status === 'success' && Array.isArray(historyRes.data?.games)) {
                const mappedHistory: GameHistoryItem[] = historyRes.data.games.map((g: any) => ({
                    id: g._id,
                    hash: g.txHash || `GAME-${g._id.slice(-6)}`,
                    amount: g.betAmount,
                    prediction: g.pickedNumber,
                    won: g.isWin,
                    payout: g.payout,
                    timestamp: g.createdAt,
                    gameType: mapGameVariant(g.gameVariant),
                    roundId: g.roundId,
                    status: g.status
                }));

                setGameHistory(prev => {
                    const next = mergeUniqueByKey(prev, mappedHistory, (h) => h.id || h.hash);
                    const total = Number(historyRes.data?.pagination?.total || next.length);
                    setHasMoreHistory(next.length < total);
                    return next;
                });
                setHistoryPage(nextPage);
            }
        } catch (e) {
            console.error("Failed to load more history", e);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const placeEntry = async (amount: number, prediction: any, gameType: GameHistoryItem['gameType'] = 'dice') => {
        if (!token || !user) {
            toast.error("Connection required", { description: "Please connect your wallet to play." });
            await openWeb3Modal();
            return { won: false, hash: "AUTH_REQUIRED", luckyNumber: null };
        }
        if (amount < 1.0) {
            toast.error("Minimum entry is 1.0 GC");
            return { won: false, hash: "INVALID_BET", luckyNumber: null };
        }

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
                const { isWin, payout, luckyNumber, id, status: gameStatus } = revealResponse.data.game;
                const newBal = revealResponse.data.newBalance;

                toast.dismiss(toastId);

                if (gameStatus === 'pending') {
                    toast.success("Entry Accepted - Pending Next Draw", {
                        description: "Results will resolve at the top of the hour."
                    });
                } else {
                    if (isWin) toast.success(`PRACTICE WIN! +${payout} TRK [Result: ${luckyNumber}]`);
                    else toast.info(`Practice Round Lost. [Result: ${luckyNumber}]`);
                }

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
                    createdAt: new Date().toISOString(),
                    gameType,
                    roundNumber: revealResponse.data.game.roundNumber,
                    status: gameStatus
                };

                setGameHistory((prev) =>
                    mergeUniqueByKey([historyItem], prev, (h) => h.id || h.hash).slice(0, 50)
                );
                refreshUser();

                return { won: isWin, payout, hash: historyItem.hash || "practice-tx", luckyNumber, status: gameStatus };
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
        if (!token || !user) {
            toast.error("Connection required", { description: "Please connect your wallet to play." });
            await openWeb3Modal();
            return { won: false, payout: 0, hash: "AUTH_REQUIRED", luckyNumber: null };
        }
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
        if (amount < 1.0) {
            toast.error("Minimum entry is 1.0 USDT");
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

                const historyItem: GameHistoryItem = {
                    id: id || Math.random().toString(36).slice(2, 9),
                    hash: (hash || id || "INTERNAL_TX").toString(),
                    amount,
                    prediction,
                    won: isWin,
                    payout,
                    timestamp: new Date().toISOString(),
                    createdAt: new Date().toISOString(),
                    gameType,
                    roundNumber: revealResponse.data.game.roundNumber
                };
                setGameHistory((prev) =>
                    mergeUniqueByKey([historyItem], prev, (h) => h.id || h.hash).slice(0, 50)
                );

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
        if (!token || !user || !wagmiAddress) {
            toast.error("Connection required", { description: "Please connect your wallet to play." });
            await openWeb3Modal();
            throw new Error("Connection required for on-chain betting");
        }

        // Check Network
        if (chainId !== bsc.id && chainId !== bscTestnet.id) {
            toast.error("Please switch to BSC Network");
            if (switchChain) switchChain({ chainId: bsc.id });
            throw new Error("Invalid Network context");
        }

        const toastId = toast.loading("Initializing Quantum Entry Core...");
        try {
            if (amount < 1.0) throw new Error("Minimum entry is 1.0 SC");

            const amountBig = parseUnits(amount.toString(), 18);

            // Unified internal balance check: cash + game (or other relevant tiers)
            const totalAvailable = realBalances.cash + realBalances.game;

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
                await gameAPI.recordOnchain({
                    txHash: betTx,
                    amount,
                    prediction: predictionValue.toString(),
                    gameType,
                    roundId: currentRoundId.toString()
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

    const topupLuckyWallet = async (fromWallet: string, amount: number) => {
        if (!user) throw new Error("Authentication required");
        const toastId = toast.loading(`Moving ${amount} USDT to Lucky Draw Wallet...`);

        try {
            const data = await depositAPI.luckyTopup(fromWallet, amount);
            if (data.status === 'success') {
                toast.success(data.message || "Top-up successful", { id: toastId });
                refreshUser();
                return data.data;
            } else {
                throw new Error(data.message || "Top-up failed");
            }
        } catch (error: any) {
            console.error("Top-up failed:", error);
            toast.error(error.message || "Top-up failed", { id: toastId });
            throw error;
        }
    };


    const redeem = async (walletType: keyof RealBalances, amount: number) => {
        if (amount < 5) {
            toast.error("Minimum withdrawal is 5 USDT");
            return false;
        }

        const fee = amount * 0.10; // 10% sustainability fee
        const netAmount = amount - fee;

        toast.loading(`Processing withdrawal (10% fee applied)...`, { id: "withdraw-toast" });

        const toastId = toast.loading(`Initiating extraction from ${walletType}...`);
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
                await depositAPI.withdraw(walletType, amount, undefined, tx);

                refreshUser();
                return true;
            } else {
                // For other internal-only balances (if any), use the legacy backend bridge
                const response = await depositAPI.withdraw(walletType, amount);
                if (response.status === 'success') {
                    toast.success(`Successfully extracted ${amount} USDT!`, { id: toastId });
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
        address: gameContractAddress || ZERO_ADDRESS,
        abi: TRKGameABI,
        functionName: 'users',
        args: [normalizedWalletAddress || ZERO_ADDRESS],
        query: {
            enabled: !!normalizedWalletAddress && !!gameContractAddress
        }
    }) as { data: any };

    useEffect(() => {
        if (contractUser) {
            setIsRegisteredOnChain(!!contractUser.isRegistered);
        }
    }, [contractUser]);

    const registerOnChain = async (providedCode?: string) => {
        if (!wagmiAddress || !user) return;
        const toastId = toast.loading("Checking referral records...");

        try {
            // 1. Resolve referrer full address from backend
            const refCode = providedCode || localStorage.getItem("trk_referrer_code");
            let referrerAddress = "0x0000000000000000000000000000000000000000";

            if (refCode) {
                try {
                    const res = await referralAPI.resolve(refCode);
                    if (res.status === 'success' && res.data?.walletAddress) {
                        const resolvedAddr = res.data.walletAddress;

                        // VERIFICATION: Check if this address is registered on-chain
                        const onChainReferrer = await publicClient?.readContract({
                            address: addresses.GAME as `0x${string}`,
                            abi: TRKGameABI,
                            functionName: 'users',
                            args: [resolvedAddr as `0x${string}`],
                        }) as any;

                        if (onChainReferrer && onChainReferrer.isRegistered) {
                            referrerAddress = resolvedAddr;
                        } else {
                            console.warn("Resolved referrer is NOT registered on-chain. Fallback will be triggered.");
                        }
                    }
                } catch (err) {
                    console.error("Referrer resolution or verification failed:", err);
                }
            }

            // CRITICAL FIX: If no valid/registered referrer found, fetch a valid default from contract
            if (referrerAddress === "0x0000000000000000000000000000000000000000") {
                referrerAddress = "0x0000000000000000000000000000000000000000";
                // Fallback to a known system address if needed, or just warn
                console.warn("No registry fallback available due to ABI discrepancy.");
                // Registry methods like idToAddress/owner not found in TRKGameABI
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
            const isUserRejection = error instanceof UserRejectedRequestError ||
                error.message?.includes("rejected") ||
                error.code === 4001;

            if (isUserRejection) {
                toast.warning("Blockchain Identity Sync: Pending", {
                    id: toastId,
                    description: "You can still access the dashboard, but some on-chain rewards may be delayed until sync is confirmed."
                });
                // Still allow user to proceed locally since backend is registered
                setIsRegisteredOnChain(true);
                return;
            }

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
            console.log("ðŸŽ² Real-Time Bet Result Detected:", data);
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
            const signature = await signMessageWithFallback(
                message,
                wagmiAddress as `0x${string}`
            );

            // 3. Submit to backend
            const res = await authAPI.linkWallet(wagmiAddress, signature as string);
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
        if (!wagmiAddress || !publicClient) {
            toast.info("Connect your wallet to continue", {
                description: "Wallet connection is required to deposit USDT."
            });
            void connect("Other");
            throw new Error("Wallet not connected");
        }

        // Check Gas (Native Token Balance) before starting
        if (balanceData?.value === undefined) {
            toast.info("Fetching wallet balance...", {
                description: "Please try again once your balance is loaded."
            });
            throw new Error("Balance not loaded");
        }

        if (balanceData.value === 0n) {
            const errorMsg = "Insufficient BNB for Network Fees (Gas). Please add BNB using the steps in the Dashboard header.";
            toast.error(errorMsg, { duration: 5000 });
            throw new Error("Insufficient gas");
        }

        const toastId = toast.loading(`Initializing Deposit for ${amount} USDT...`);
        try {
            const amountBig = parseUnits(amount.toString(), 18);
            const usdtAddress = addresses.USDT as `0x${string}`;
            const gameAddress = addresses.GAME as `0x${string}`;

            // 1. Validation
            if (!usdtAddress || !gameAddress || usdtAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error("System contracts not loaded. Please switch network or refresh.");
            }

            // 2. Check Allowance
            const allowance = await publicClient.readContract({
                address: usdtAddress,
                abi: ERC20ABI,
                functionName: 'allowance',
                args: [wagmiAddress as `0x${string}`, gameAddress]
            });

            if (allowance < amountBig) {
                toast.loading("Requesting USDT Approval...", { id: toastId });
                const approveTx = await writeContractAsync({
                    address: usdtAddress,
                    abi: ERC20ABI,
                    functionName: 'approve',
                    args: [gameAddress, amountBig]
                });
                toast.loading("Approval Pending...", { id: toastId });
                await publicClient.waitForTransactionReceipt({ hash: approveTx });
                toast.success("USDT Approved!", { id: toastId });
            }

            // 3. Deposit to Game Contract
            toast.loading("Depositing to Game Contract... Confirm in Wallet.", { id: toastId });
            const depositTx = await writeContractAsync({
                address: gameAddress,
                abi: TRKGameABI,
                functionName: 'depositCashGame',
                args: [amountBig]
            });
            console.log(`[Deposit] Tx Hash: ${depositTx}`);

            toast.loading("Waiting for confirmation...", { id: toastId });
            await publicClient.waitForTransactionReceipt({ hash: depositTx });

            // Small delay to allow backend RPC to sync
            await new Promise(r => setTimeout(r, 2000));

            // 4. Sync with Backend
            toast.loading("Syncing with Dashboard...", { id: toastId });
            const res = await depositAPI.deposit(amount, depositTx);

            if (res.status === 'success') {
                toast.success(`Successfully deposited ${amount} USDT`, { id: toastId });
                await refreshUser();
            } else {
                throw new Error(res.message || "Sync failed");
            }

        } catch (err: any) {
            console.error("Deposit failed:", err);
            if (err.message?.includes("User rejected") || err.name === 'UserRejectedRequestError') {
                toast.info("Transaction cancelled by user", { id: toastId });
            } else {
                toast.error(err.shortMessage || err.message || "Deposit failed", { id: toastId });
            }
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
    const safeAddress = React.useMemo(() => {
        if (user?.walletAddress && isAddress(user.walletAddress)) return user.walletAddress;
        if (wagmiAddress && isAddress(wagmiAddress)) return wagmiAddress;
        return null;
    }, [user?.walletAddress, wagmiAddress]);

    return (
        <WalletContext.Provider
            value={React.useMemo(() => ({
                isConnected: !!effectiveToken, // Avoid hydration mismatch by delaying localStorage reads
                address: safeAddress,
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
                withdrawals: user?.withdrawals || [],
                loadMoreHistory,
                hasMoreHistory,
                isHistoryLoading,
                totalProfit,
                showReferralPrompt,
                setShowReferralPrompt,
                applyReferral,
                topupLuckyWallet,
                systemConfig,
                isConfigLoading
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
                registerOnChain,
                faucet,
                usdtBalanceRaw,
                addresses,
                totalProfit,
                recentWallets,
                isSwitchingWallet,
                isWagmiConnected,
                showReferralPrompt,
                applyReferral,
                topupLuckyWallet,
                systemConfig,
                isConfigLoading
            ])}
        >
            {children}

            {/* Mandatory Referral Gate Modal */}
            <ReferralCodeModal
                isOpen={showReferralGate}
                onClose={() => {
                    // Strictly mandatory - do nothing on close or just show toast
                    toast.error("Referral code is mandatory to proceed.");
                }}
                onCodeValidated={async (code) => {
                    localStorage.setItem("trk_referrer_code", code);

                    // Prefer direct referral apply using state OR persisted auth session
                    // to avoid re-triggering nonce/login loops.
                    const activeToken = token || getToken();
                    const activeUser = user || getStoredUser();

                    if (activeToken) {
                        if (activeUser?.referredBy) {
                            toast.success("Registration Completed Successfully", {
                                description: "Your referral code is already linked."
                            });
                            setShowReferralGate(false);
                            router.replace('/dashboard');
                            return;
                        }

                        console.log("[AUTH] Applying referral code directly to active session...");
                        const success = await applyReferral(code);
                        if (success) {
                            toast.success("Registration Completed Successfully", {
                                description: "Referral code verified. Redirecting to dashboard."
                            });
                            console.log("[AUTH] Direct referral apply successful. Hard navigating to dashboard.");
                            // Small delay so success notification is visible before navigation.
                            setTimeout(() => {
                                window.location.href = '/dashboard';
                            }, 700);
                        } else {
                            setShowReferralGate(true);
                            console.error("[AUTH] Direct referral apply failed despite validation.");
                        }
                        return;
                    }

                    setShowReferralGate(false);
                    // Re-trigger login with the code now in localStorage, bypassing throttle
                    void login(true);
                }}
            />
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
}
