"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { QRCodeCanvas } from "qrcode.react";
import { ShieldCheck, Wallet, X, RefreshCw, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { detectInjectedWallets } from "@/lib/walletProviders";

type WalletKey = "info" | "trust" | "metamask" | "ready" | "ledger";

interface WalletConnectPanelProps {
    onConnect: (walletType: "Trust Wallet" | "MetaMask" | "WalletConnect" | "Other") => Promise<void> | void;
    isLoading?: boolean;
    statusSlot?: ReactNode;
    closeHref?: string;
    qrPath?: string;
}

interface WalletOption {
    key: WalletKey;
    label: string;
    section: "installed" | "recommended";
}

const walletOptions: WalletOption[] = [
    { key: "trust", label: "Trust Wallet", section: "installed" },
    { key: "metamask", label: "MetaMask", section: "installed" },
    { key: "ready", label: "Ready", section: "recommended" },
    { key: "ledger", label: "Ledger", section: "recommended" }
];

const RECENT_WALLET_KEY = "trk_recent_wallet_type";

export function WalletConnectPanel({
    onConnect,
    isLoading = false,
    statusSlot,
    closeHref = "/",
    qrPath = "/auth?wallet=ready"
}: WalletConnectPanelProps) {
    const [activeWallet, setActiveWallet] = useState<WalletKey>("info");
    const [qrValue, setQrValue] = useState("");
    const [walletOptionsState, setWalletOptionsState] = useState<WalletOption[]>(walletOptions);
    const [recentWallet, setRecentWallet] = useState<WalletKey | null>(null);
    const announcedRef = useRef({ hasMetaMask: false, hasTrust: false });

    useEffect(() => {
        if (typeof window === "undefined") return;
        setQrValue(`${window.location.origin}${qrPath}`);

        // Restore last used wallet (for "Recent" label)
        const storedRecent = window.localStorage.getItem(RECENT_WALLET_KEY) as WalletKey | null;
        if (storedRecent && storedRecent !== "info") {
            setRecentWallet(storedRecent);
        }

        // Dynamic Wallet Detection
        const checkWallets = () => {
            const injected = detectInjectedWallets(window);
            const hasMetaMask = injected.hasMetaMask || announcedRef.current.hasMetaMask;
            const hasTrust = injected.hasTrust || announcedRef.current.hasTrust;

            const options: WalletOption[] = [
                {
                    key: "trust",
                    label: "Trust Wallet",
                    section: hasTrust ? "installed" : "recommended"
                },
                {
                    key: "metamask",
                    label: "MetaMask",
                    section: hasMetaMask ? "installed" : "recommended"
                },
                { key: "ready", label: "Ready", section: "recommended" },
                { key: "ledger", label: "Ledger", section: "recommended" }
            ];

            // Sort: Installed first, then Recommended
            setWalletOptionsState(options);
        };

        checkWallets();

        // Listen for injection events (rare but possible)
        window.addEventListener('ethereum#initialized', checkWallets);
        // EIP-6963 provider discovery (multi-wallet)
        const handleEip6963 = (event: Event) => {
            const detail = (event as CustomEvent).detail as any;
            const rdns = (detail?.info?.rdns || "").toString().toLowerCase();
            const name = (detail?.info?.name || "").toString().toLowerCase();
            if (rdns.includes("io.metamask") || name.includes("metamask")) {
                announcedRef.current.hasMetaMask = true;
            }
            if (rdns.includes("com.trustwallet") || name.includes("trust wallet") || name === "trust") {
                announcedRef.current.hasTrust = true;
            }
            checkWallets();
        };
        window.addEventListener('eip6963:announceProvider', handleEip6963 as EventListener);
        window.dispatchEvent(new Event('eip6963:requestProvider'));

        // Re-check shortly after mount to catch late injections
        const lateCheck = window.setTimeout(checkWallets, 600);

        return () => {
            window.removeEventListener('ethereum#initialized', checkWallets);
            window.removeEventListener('eip6963:announceProvider', handleEip6963 as EventListener);
            window.clearTimeout(lateCheck);
        };
    }, [qrPath]);

    const handleSelect = async (wallet: WalletKey) => {
        setActiveWallet(wallet);
        if (wallet !== "info") {
            setRecentWallet(wallet);
            if (typeof window !== "undefined") {
                window.localStorage.setItem(RECENT_WALLET_KEY, wallet);
            }
        }

        if (wallet === "trust") {
            await onConnect("Trust Wallet");
        }
        if (wallet === "metamask") {
            await onConnect("MetaMask");
        }
    };

    const handleWalletConnect = async () => {
        await onConnect("WalletConnect");
    };

    const handleOtherConnect = async () => {
        await onConnect("Other");
    };

    const renderWalletItem = (option: WalletOption) => {
        const isActive = activeWallet === option.key;
        const isInstalled = option.section === "installed";

        return (
            <button
                key={option.key}
                type="button"
                onClick={() => handleSelect(option.key)}
                className={cn(
                    "w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-left font-semibold transition-all duration-200",
                    isActive
                        ? "bg-yellow-400 text-black shadow-[0_10px_30px_rgba(0,0,0,0.35)] scale-[1.01]"
                        : isInstalled
                            ? "text-white hover:bg-white/[0.06] border border-transparent hover:border-white/5"
                            : "text-white/70 hover:bg-white/[0.03] hover:text-white"
                )}
            >
                <span className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                    isActive ? "" : "bg-gradient-to-br from-blue-600/10 to-cyan-500/10"
                )}>
                    {option.key === "trust" && (
                        <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
                            </svg>
                        </div>
                    )}
                    {option.key === "metamask" && (
                        <Image
                            src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                            width={20}
                            height={20}
                            className="h-5 w-5"
                            alt="MetaMask"
                            sizes="20px"
                        />
                    )}
                    {option.key === "ready" && (
                        <span className={cn("text-base font-bold", isActive ? "text-black" : "text-orange-400")}>
                            R
                        </span>
                    )}
                    {option.key === "ledger" && (
                        <span className={cn("text-base font-bold", isActive ? "text-black" : "text-white/50")}>
                            L
                        </span>
                    )}
                </span>
                <span className="flex flex-col leading-tight">
                    <span className="text-[15px]">{option.label}</span>
                    {recentWallet === option.key && (
                        <span className={cn(
                            "text-[10px] font-semibold uppercase tracking-wider",
                            isActive ? "text-black/70" : "text-yellow-400"
                        )}>
                            Recent
                        </span>
                    )}
                </span>
            </button>
        );
    };

    const isPureMobileBrowser = typeof window !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) &&
        !(window as any).ethereum;

    if (isPureMobileBrowser) {
        return (
            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0F1115] shadow-2xl p-10 flex flex-col items-center justify-center min-h-[450px]">
                {/* Cyber Background Accents */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 blur-[80px] rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 blur-[80px] rounded-full translate-x-1/2 translate-y/2" />

                <Link
                    href={closeHref}
                    className="absolute right-6 top-6 z-10 h-10 w-10 rounded-full bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-all group border border-white/5"
                    aria-label="Close"
                >
                    <X className="h-5 w-5 text-white/40 group-hover:text-white" />
                </Link>

                <div className="relative mb-10">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-pulse rounded-full" />
                    <div className="relative h-24 w-24 rounded-[30px] bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-400 flex items-center justify-center shadow-[0_20px_40px_rgba(37,99,235,0.3)] border border-white/20">
                        <Wallet className="h-10 w-10 text-white" />
                    </div>
                </div>

                <div className="text-center space-y-3 mb-10 relative z-10">
                    <h2 className="text-3xl font-black text-white tracking-tight">Mobile Protocol</h2>
                    <p className="text-white/40 text-sm max-w-[260px] leading-relaxed font-medium">
                        Securely connect via any Web3 wallet app like <span className="text-white/70">MetaMask</span> or <span className="text-white/70">Trust Wallet</span>.
                    </p>
                </div>

                <div className="w-full space-y-4 relative z-10">
                    <Button
                        onClick={() => handleSelect("trust")}
                        disabled={isLoading}
                        className="h-16 w-full rounded-2xl bg-[#3375BB] text-white hover:bg-[#2a629d] font-black text-lg shadow-[0_15px_30px_rgba(51,117,187,0.25)] border-t border-white/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <div className="h-6 w-6 rounded bg-white flex items-center justify-center">
                            <svg className="h-4 w-4 text-[#3375BB]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
                            </svg>
                        </div>
                        Connect Trust Wallet
                    </Button>

                    <Button
                        onClick={() => handleSelect("metamask")}
                        disabled={isLoading}
                        className="h-16 w-full rounded-2xl bg-[#F6851B] text-white hover:bg-[#e27613] font-black text-lg shadow-[0_15px_30px_rgba(246,133,27,0.25)] border-t border-white/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                        <div className="h-6 w-6 rounded bg-white flex items-center justify-center p-0.5">
                            <Image
                                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                                width={16}
                                height={16}
                                className="h-4 w-4"
                                alt="MetaMask"
                            />
                        </div>
                        Connect MetaMask
                    </Button>

                    <Button
                        onClick={handleWalletConnect}
                        disabled={isLoading}
                        className="h-14 w-full rounded-2xl bg-white/5 text-white/70 hover:bg-white/10 font-bold text-sm border border-white/10 transition-all active:scale-95"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 animate-spin" /> Authorizing...
                            </span>
                        ) : (
                            <span className="flex items-center gap-3">
                                <ShieldCheck className="h-4 w-4 opacity-40" /> Other Wallets
                            </span>
                        )}
                    </Button>

                    <div className="flex flex-col items-center gap-3 pt-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Don't have a mobile wallet?</p>
                        <a
                            href="https://trustwallet.com/download"
                            target="_blank"
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
                        >
                            Get Trust Wallet <ArrowUpRight className="h-3 w-3" />
                        </a>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="absolute bottom-8 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 opacity-50">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/60">Systems Active</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#17181b] shadow-2xl">
            <Link
                href={closeHref}
                className="absolute right-5 top-5 z-10 h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center transition group"
                aria-label="Close"
            >
                <X className="h-5 w-5 text-white/50 group-hover:text-white/80" />
            </Link>

            <div className="grid md:grid-cols-[320px_1fr] gap-0 min-h-[500px]">
                <div className="p-7 border-b md:border-b-0 md:border-r border-white/[0.08] bg-black/25">
                    <div className="space-y-1.5">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Connect a Wallet</h2>
                    </div>

                    <div className="mt-8 space-y-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-yellow-400/90">
                                Installed
                            </p>
                            <div className="space-y-1.5">
                                {walletOptionsState.filter((o) => o.section === "installed").map(renderWalletItem)}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                                Recommended
                            </p>
                            <div className="space-y-1.5">
                                {walletOptionsState.filter((o) => o.section === "recommended").map(renderWalletItem)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-10">
                    {statusSlot && <div className="mb-6">{statusSlot}</div>}

                    {activeWallet === "info" && (
                        <div className="space-y-6">
                            <h3 className="text-2xl font-black text-center text-white">What is a Wallet?</h3>

                            <div className="space-y-4">
                                <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                        <Wallet className="h-6 w-6 text-blue-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">A Home for your Digital Assets</p>
                                        <p className="text-xs text-white/60">
                                            Wallets are used to send, receive, store, and display digital assets like
                                            tokens and NFTs.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                        <ShieldCheck className="h-6 w-6 text-emerald-300" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">A New Way to Log In</p>
                                        <p className="text-xs text-white/60">
                                            Instead of creating new accounts and passwords, just connect your wallet.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-3 pt-2">
                                <a
                                    href="https://trustwallet.com/download"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 rounded-full bg-yellow-400 text-black text-xs font-bold hover:bg-yellow-300 transition"
                                >
                                    Get a Wallet
                                </a>
                                <a
                                    href="https://ethereum.org/en/wallets/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 rounded-full border border-white/20 text-white/70 text-xs font-bold hover:text-white hover:border-white/40 transition"
                                >
                                    Learn More
                                </a>
                            </div>
                        </div>
                    )}

                    {activeWallet === "trust" && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 min-h-[320px]">
                            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <svg className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xl font-black text-white">
                                    {isLoading ? "Opening Trust Wallet..." : "Trust Wallet"}
                                </p>
                                <p className="text-sm text-white/50">
                                    Confirm the connection request in your wallet.
                                </p>
                            </div>
                            {isLoading && (
                                <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                            )}
                        </div>
                    )}

                    {activeWallet === "metamask" && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 min-h-[320px]">
                            <div className="h-16 w-16 flex items-center justify-center">
                                <Image
                                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                                    width={64}
                                    height={64}
                                    className="h-16 w-16"
                                    alt="MetaMask"
                                    sizes="64px"
                                />
                            </div>
                            <div>
                                <p className="text-xl font-black text-white">
                                    {isLoading ? "Opening MetaMask..." : "MetaMask"}
                                </p>
                                <p className="text-sm text-white/50">
                                    Confirm the connection request in your wallet.
                                </p>
                            </div>
                            {isLoading && (
                                <div className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                            )}
                        </div>
                    )}

                    {activeWallet === "ready" && (
                        <div className="space-y-6 min-h-[320px]">
                            <div className="text-center space-y-2">
                                <p className="text-xl font-black text-white">Scan with Ready</p>
                                <p className="text-xs text-white/50">Open your Ready app and scan the QR code.</p>
                            </div>

                            <div className="mx-auto w-fit rounded-3xl bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                                {qrValue ? (
                                    <QRCodeCanvas value={qrValue} size={220} />
                                ) : (
                                    <div className="h-[220px] w-[220px] bg-white/80 animate-pulse rounded-2xl" />
                                )}
                            </div>

                            <div className="flex items-center justify-center">
                                <Button
                                    onClick={handleWalletConnect}
                                    className="h-11 rounded-xl bg-yellow-400 text-black hover:bg-yellow-300 font-bold"
                                >
                                    Open WalletConnect
                                </Button>
                            </div>
                        </div>
                    )}

                    {activeWallet === "ledger" && (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 min-h-[320px]">
                            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-white/70 text-xl font-black">
                                L
                            </div>
                            <div>
                                <p className="text-xl font-black text-white">Connect Ledger</p>
                                <p className="text-sm text-white/50">
                                    Open the wallet selector to connect a Ledger device.
                                </p>
                            </div>
                            <Button
                                onClick={handleOtherConnect}
                                className="h-11 rounded-xl bg-white text-black hover:bg-yellow-300 font-bold"
                            >
                                Open Wallet List
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
