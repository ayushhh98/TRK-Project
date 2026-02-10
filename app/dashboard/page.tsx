"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CountdownTimer } from "@/components/dashboard/CountdownTimer";
import { CyberneticTerminal } from "@/components/dashboard/CyberneticTerminal";
import { Trophy, Play, LogOut, Copy, CheckCheck, Coins, Users, TrendingUp, Gift, Dices, Zap, Twitter, Send, MessageCircle, ShieldAlert, ShieldCheck, Wallet, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import { cn } from "@/lib/utils";
import { GlobalPulse } from "@/components/dashboard/GlobalPulse";
import { DepositModal } from "@/components/cash/DepositModal";
import { WithdrawalModal } from "@/components/cash/WithdrawalModal";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { EarningsNexus } from "@/components/dashboard/EarningsNexus";
import { HardenedCapital } from "@/components/dashboard/HardenedCapital";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { LuckyDraw } from "@/components/dashboard/LuckyDraw";
import { PromoPoster } from "@/components/dashboard/PromoPoster";

export default function DashboardPage() {
    const {
        isConnected, address, user, practiceBalance, practiceExpiry,
        gameHistory, disconnect, isLoading, isRegisteredOnChain, registerOnChain,
        nativeBalance, usdtBalance, isRealMode, setIsRealMode, realBalances,
        refreshUser, linkWallet, deposit, isSwitchingWallet, hasRealAccess
    } = useWallet();
    const [copied, setCopied] = useState(false);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const router = useRouter();

    // Redirect to auth if not connected
    useEffect(() => {
        if (isLoading || isSwitchingWallet) return;
        if (typeof window !== "undefined") {
            const hasToken = !!localStorage.getItem("trk_token");
            if (hasToken) return;
        }
        if (!isConnected) {
            router.push("/auth");
        }
    }, [isConnected, isLoading, isSwitchingWallet, router]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // Calculate stats from history
    const gamesPlayed = gameHistory.length;
    const wins = gameHistory.filter(h => h.won).length;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    const netChange = gameHistory.reduce((acc, h) => acc + (h.won ? h.amount * 6 : -h.amount), 0);

    // Calculate days left
    const daysLeft = practiceExpiry
        ? Math.max(0, Math.ceil((new Date(practiceExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 30;

    const referralLink = address
        ? `https://trk.game/ref/${address.slice(2, 8)}`
        : "Loading...";
    const displayReferralLink = isClient ? referralLink : "Loading...";

    // Format address for display
    const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not Connected";
    const displayAddress = isClient ? shortAddress : "Not Connected";
    const avatarChar = (isClient && address) ? address.charAt(address.length - 1).toUpperCase() : "P";

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasWallet = isClient && !!address;
    const needsEmailVerification = isClient && !!user?.walletAddress && (!user?.email || !user?.isEmailVerified);
    const needsWalletLink = isClient && !!user?.email && !hasWallet;

    const handleVerifyEmail = async () => {
        // Log out to allow email registration/verification flow
        try {
            await disconnect();
        } finally {
            router.push("/auth");
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="bg-transparent pb-32">
            <main className="container mx-auto px-4 py-8 space-y-10">
                {/* Executive Control Header (Poster Effect) */}
                <div className="relative rounded-[2.5rem] overflow-hidden bg-black border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.6)] group mb-10">
                    {/* Living Background Mesh */}
                    {/* Living Background Mesh */}
                    <div className={cn(
                        "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--gradient-color),transparent_60%)] transition-colors duration-700",
                        isRealMode ? "[--gradient-color:rgba(245,158,11,0.15)]" : "[--gradient-color:rgba(16,185,129,0.15)]"
                    )} />
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)] z-0" />
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 p-10 md:p-12">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                            <div className={cn(
                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black tracking-widest uppercase shadow-[0_0_20px_rgba(0,0,0,0.1)] backdrop-blur-md transition-colors duration-500",
                                isRealMode
                                    ? "bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isRealMode ? "bg-amber-500" : "bg-emerald-500")} />
                                Ecosystem Control Center
                            </div>
                            <h1 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter drop-shadow-2xl">
                                DASHBOARD
                            </h1>
                            <p className="text-lg text-white/40 font-medium max-w-md leading-relaxed">
                                Manage your assets, track real-time performance, and oversee your empire's growth from a single command node.
                            </p>
                        </motion.div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 lg:gap-4 mb-[70px]">
                            {/* Asset Module & Mode Toggle */}
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className={cn(
                                    "flex items-center gap-5 p-5 pr-8 rounded-2xl backdrop-blur-sm transition-all duration-500 group/asset border",
                                    isRealMode
                                        ? "bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10"
                                        : "bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10"
                                )}>
                                    <div className={cn(
                                        "h-14 w-14 rounded-xl flex items-center justify-center border group-hover/asset:scale-110 transition-transform",
                                        isRealMode
                                            ? "bg-amber-500/20 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                                            : "bg-emerald-500/20 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                                    )}>
                                        {isRealMode ? <ShieldCheck className="h-7 w-7 text-amber-500 animate-pulse" /> : <Coins className="h-7 w-7 text-emerald-500" />}
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">{isRealMode ? "Total Assets" : "Practice Assets"}</div>
                                        <div className="text-3xl font-mono font-bold text-white tracking-tight flex items-baseline gap-2">
                                            {isRealMode ? (realBalances.totalUnified || 0).toFixed(2) : practiceBalance}
                                            <span className={cn("text-sm font-bold", isRealMode ? "text-amber-500" : "text-emerald-500")}>USDT</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Mode Switcher Toggle */}
                                <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-2xl shadow-xl">
                                    <button
                                        onClick={() => setIsRealMode(false)}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                            !isRealMode ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "text-white/40 hover:text-white"
                                        )}
                                    >
                                        Practice
                                    </button>
                                    <button
                                        onClick={() => hasRealAccess && setIsRealMode(true)}
                                        disabled={!hasRealAccess}
                                        className={cn(
                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                                            isRealMode ? "bg-primary text-black shadow-[0_0_20px_rgba(var(--primary),0.4)]" : "text-white/40 hover:text-white",
                                            !hasRealAccess && "opacity-40 cursor-not-allowed hover:text-white/40"
                                        )}
                                    >
                                        <ShieldCheck className={cn("h-3 w-3", isRealMode ? "text-black" : "text-white/40")} />
                                        Real
                                    </button>
                                </div>

                                {/* Transaction Quick Actions - MOVED TO FOOTER */}
                            </div>

                            {/* Separator */}
                            <div className="hidden sm:block w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-4" />

                            {/* Timer Module */}
                            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full sm:w-auto">
                                <CountdownTimer expiryDate={practiceExpiry} />
                            </motion.div>
                        </div>
                    </div>

                    {/* Connected Wallet Bar (New Addition) */}
                    <div className="absolute bottom-0 inset-x-0 bg-white/5 border-t border-white/5 backdrop-blur-md px-10 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-20">
                        <div className="flex items-center gap-4">
                            <div className={cn("h-2 w-2 rounded-full animate-pulse", isRealMode ? "bg-amber-500" : "bg-emerald-500")} />
                            <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Secure Connection Active</span>
                        </div>
                        <div className="flex items-center gap-6">
                            {/* Consolidated Wallet View - No separate USDT display */}
                            {isRealMode && (
                                <div className="flex items-center gap-3 mr-4">
                                    <Button
                                        onClick={() => setIsDepositOpen(true)}
                                        size="sm"
                                        className="h-8 px-4 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 font-bold uppercase tracking-wider text-[10px]"
                                    >
                                        <ArrowUpRight className="h-3 w-3 mr-1.5" />
                                        Deposit
                                    </Button>
                                    <Button
                                        onClick={() => setIsWithdrawOpen(true)}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-4 rounded-lg border-white/10 text-white hover:bg-white/5 font-bold uppercase tracking-wider text-[10px]"
                                    >
                                        <ArrowDownRight className="h-3 w-3 mr-1.5" />
                                        Withdraw
                                    </Button>
                                </div>
                            )}

                            <div className="h-8 w-px bg-white/10" />
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-medium text-white/50">{displayAddress}</span>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-white/30 hover:text-white" onClick={handleCopy}>
                                    {copied ? <CheckCheck className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Real Money Mode Unlock Banner */}
                {!hasRealAccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative rounded-[2rem] overflow-hidden bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] group hover:shadow-[0_0_60px_rgba(245,158,11,0.25)] transition-all duration-500"
                    >
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.1),transparent_50%)]" />
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 md:p-8">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                                    <ShieldCheck className="h-7 w-7 text-amber-500 animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">Action Required</div>
                                    </div>
                                    <div className="text-xl md:text-2xl font-black text-white">Unlock Real Money Mode</div>
                                    <p className="text-sm text-white/60 mt-1">
                                        Make your first deposit to activate real money gaming and start earning rewards.
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={() => setIsDepositOpen(true)}
                                className="bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-widest text-xs h-14 px-8 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:scale-105 transition-all whitespace-nowrap"
                            >
                                <Wallet className="h-4 w-4 mr-2" />
                                Make First Deposit
                            </Button>
                        </div>

                        {/* Scanline Effect */}
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </motion.div>
                )}

                {/* Account Verification / Wallet Link Alerts */}
                {(needsEmailVerification || needsWalletLink) && (
                    <div className="space-y-4">
                        {needsEmailVerification && (
                            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">Email Verification Required</div>
                                    <div className="text-lg font-bold text-white">Verify your email to unlock rewards redemption.</div>
                                    <p className="text-xs text-white/50 mt-1">
                                        If your account was created with wallet only, log out and complete email verification.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleVerifyEmail}
                                    className="bg-amber-500 text-black hover:bg-amber-400 font-black uppercase tracking-widest text-xs h-12 px-6"
                                >
                                    Verify Email
                                </Button>
                            </div>
                        )}

                        {needsWalletLink && (
                            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-300">Wallet Link Required</div>
                                    <div className="text-lg font-bold text-white">Connect your wallet to enable Web3 earnings.</div>
                                    <p className="text-xs text-white/50 mt-1">
                                        Link your wallet to access on-chain features and real-time payouts.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => linkWallet()}
                                    className="bg-blue-600 text-white hover:bg-blue-500 font-black uppercase tracking-widest text-xs h-12 px-6"
                                >
                                    Connect Wallet
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* ANALYTICS & SECURITY MATRIX (New Addition) */}
                <div className="grid lg:grid-cols-3 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2 h-[400px]"
                    >
                        <EarningsNexus />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-1 h-[400px]"
                    >
                        <HardenedCapital />
                    </motion.div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8">
                    {/* Left Column - Profile & Game */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Unified Player Profile */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="relative w-full rounded-[2.5rem] overflow-hidden bg-black border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] group">
                                {/* Cinematic Background Poster Effect */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.1),transparent_70%)]" />
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0)_40%,rgba(56,189,248,0.05)_50%,rgba(0,0,0,0)_60%)] bg-[length:200%_200%] animate-[shimmer_8s_infinite_linear] opacity-30" />

                                {/* Grid Overlay */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:32px_32px] opacity-20" />

                                <div className="relative z-10 p-8 md:p-12 flex flex-col gap-10">
                                    {/* Command Header */}
                                    <div className="flex flex-col lg:flex-row lg:items-start items-center justify-between gap-6">
                                        <div className="flex items-center lg:items-start gap-8 w-full lg:w-auto min-w-0">
                                            {/* Holographic Avatar Core */}
                                            <div className="relative h-32 w-32 group-hover:scale-105 transition-transform duration-500">
                                                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-[spin_10s_linear_infinite]" />
                                                <div className="absolute inset-2 rounded-full border border-primary/50 border-dashed animate-[spin_15s_linear_infinite_reverse]" />

                                                <div className="absolute inset-4 rounded-full bg-black flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(var(--primary),0.3)]">
                                                    <span className="text-5xl font-black text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                                                        {avatarChar}
                                                    </span>
                                                    {/* Scanning Effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent h-1/2 animate-[scan_3s_ease-in-out_infinite]" />
                                                </div>

                                                {/* Level Badge */}
                                                <div className="absolute -bottom-2 -right-2 bg-primary text-black text-xs font-black px-3 py-1 rounded-full border-2 border-black shadow-lg">
                                                    LVL 1
                                                </div>
                                            </div>

                                            {/* Player Dossier */}
                                            <div className="space-y-3 text-center md:text-left">
                                                <div>
                                                    <div className="flex items-center gap-3 justify-center md:justify-start mb-1">
                                                        <h2 className="text-4xl md:text-5xl font-display font-black text-white tracking-tighter uppercase drop-shadow-2xl">
                                                            {hasWallet ? shortAddress : (user?.email?.split('@')[0] || "Operator")}
                                                        </h2>
                                                        <div className="hidden md:flex h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                                                        <span className="px-3 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-white/60 uppercase tracking-widest">
                                                            ID: {user?.referralCode || user?.id?.slice(-6) || "N/A"}
                                                        </span>
                                                        <span className="px-3 py-1 rounded bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary uppercase tracking-widest shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                                                            {hasWallet ? "WEB3_ENABLED" : "EMAIL_AUTH"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Stats Row */}
                                                <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start text-sm font-medium text-white/50">
                                                    <div className="flex items-center gap-2">
                                                        <Trophy className="h-4 w-4 text-yellow-500" />
                                                        <span className="text-white">Rank: <span className="font-bold text-yellow-500">Bronze</span></span>
                                                    </div>
                                                    <div className="h-4 w-px bg-white/10" />
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                                        <span className="text-white">Active Streams: <span className="font-bold text-green-500">{hasWallet ? "All" : "Limited"}</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Primary Action Module */}
                                        <div className="flex flex-col gap-4 w-full lg:w-auto items-stretch lg:items-end">
                                            {isClient && !hasWallet && (
                                                <Button
                                                    onClick={() => linkWallet()}
                                                    className="h-16 px-8 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.3)] animate-pulse w-full"
                                                >
                                                    <Wallet className="mr-3 h-6 w-6" />
                                                    CONNECT WALLET TO EARN
                                                </Button>
                                            )}
                                            <Link href="/dashboard/practice" className="w-full lg:w-auto">
                                                <Button className="h-16 px-10 bg-white text-black text-lg font-black uppercase tracking-widest hover:bg-primary hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] rounded-2xl flex items-center gap-4 w-full">
                                                    Resume Mission
                                                    <Play className="h-5 w-5 fill-current" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Status & Alerts Bar */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-8 border-t border-white/5">
                                        {/* Account Status */}
                                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                                            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                                <ShieldAlert className="h-5 w-5 text-orange-500" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Protocol Status</div>
                                                <div className="text-sm font-bold text-white">
                                                    {hasWallet ? "Full Web3 Access" : "Web2 Sandbox Mode"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Poster Module */}
                                        <div className="flex items-center justify-between gap-4 border border-purple-500/30 p-4 rounded-xl relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-black/50 to-black/80">
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.2),transparent_60%)] opacity-60 pointer-events-none" />
                                            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(168,85,247,0.12),transparent_45%)] opacity-70 pointer-events-none" />
                                            <div className="relative z-10 flex items-center gap-4 min-w-0">
                                                <div className="relative h-16 w-12 rounded-lg border border-purple-500/30 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(0,0,0,0.6))] shadow-[0_0_20px_rgba(168,85,247,0.25)]">
                                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1),transparent_60%)]" />
                                                    <div className="relative z-10 p-1.5 space-y-1">
                                                        <div className="text-[8px] font-black uppercase tracking-widest text-white/80">Poster</div>
                                                        <div className="text-[9px] font-mono text-white/60">S1</div>
                                                        <div className="text-[8px] font-semibold text-purple-200/90">Elite</div>
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] font-black uppercase text-white/60 tracking-widest">Poster Drop</div>
                                                    <div className="text-sm font-bold text-white truncate">Elite Protocol Brief</div>
                                                    <div className="text-[10px] text-white/40 truncate">Mission-grade visual brief</div>
                                                </div>
                                            </div>
                                            <Link href="/dashboard/activation" className="relative z-10 shrink-0">
                                                <Button
                                                    size="sm"
                                                    className="bg-white text-black hover:bg-purple-100 font-extrabold uppercase text-[10px] tracking-widest px-4"
                                                >
                                                    View
                                                </Button>
                                            </Link>
                                        </div>

                                        {/* Activation Up-Sell / Wallet Link Prompt */}
                                        <div className={cn(
                                            "flex items-center justify-between gap-4 border p-4 rounded-xl relative overflow-hidden group/alert cursor-pointer",
                                            hasWallet
                                                ? "bg-gradient-to-r from-blue-600/20 to-blue-900/20 border-blue-500/30"
                                                : "bg-gradient-to-r from-primary/20 to-amber-900/20 border-primary/30"
                                        )}>
                                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/alert:opacity-100 transition-opacity" />
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-lg flex items-center justify-center shadow-lg",
                                                    hasWallet ? "bg-blue-500" : "bg-primary"
                                                )}>
                                                    <Zap className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase text-white/60 tracking-widest">
                                                        {hasWallet ? "System Active" : "Action Required"}
                                                    </div>
                                                    <div className="text-sm font-bold text-white">
                                                        {hasWallet ? "Unlock Full Ecosystem" : "Link Wallet to Play & Earn"}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => {
                                                    if (!hasWallet) linkWallet();
                                                    else if (!hasRealAccess) setIsDepositOpen(true);
                                                    else if (!isRealMode) setIsRealMode(true);
                                                    else router.push('/dashboard/cash');
                                                }}
                                                size="sm"
                                                className="relative z-10 bg-white text-black hover:bg-primary font-extrabold uppercase text-[10px] tracking-widest px-4"
                                            >
                                                {!hasWallet ? "Link Now" : (hasRealAccess ? (isRealMode ? "Add Funds" : "Activate") : "Add Funds")}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Performance Command Center (Phase 12) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <PerformanceMetrics />
                        </motion.div>

                        {/* Income Stream Grid (Cybernetic Modules) */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Massive Winners Income */}
                            <motion.div variants={itemVariants}>
                                <Card className="h-full bg-black/40 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-orange-500/50 transition-all duration-500 hover:shadow-[0_0_50px_rgba(249,115,22,0.15)] relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <CardContent className="p-8 space-y-6 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="h-14 w-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-black transition-all duration-300">
                                                <Trophy className="h-7 w-7" />
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono font-bold text-orange-500 uppercase tracking-widest">
                                                Module_01
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-display font-bold text-white group-hover:text-orange-400 transition-colors">Winners Income</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">Win <span className="text-white font-bold">2X Instantly</span>. Reinvest 6X automatically for sustainable ecosystem growth.</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Multiplier</span>
                                                <span className="text-lg font-mono font-bold text-orange-500">8.0x</span>
                                            </div>
                                            <Link href="/dashboard/income">
                                                <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-500 hover:bg-orange-500 hover:text-black group-hover:translate-x-1 transition-all">
                                                    Access Module
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                    {/* Scanline Decoration */}
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </Card>
                            </motion.div>

                            {/* Referral Level Income */}
                            <motion.div variants={itemVariants}>
                                <Card className="h-full bg-black/40 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-emerald-500/50 transition-all duration-500 hover:shadow-[0_0_50px_rgba(16,185,129,0.15)] relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <CardContent className="p-8 space-y-6 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-black transition-all duration-300">
                                                <Users className="h-7 w-7" />
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-500 uppercase tracking-widest">
                                                Module_02
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-display font-bold text-white group-hover:text-emerald-400 transition-colors">Referral Levels</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">Build your network. Earn from <span className="text-white font-bold">10 Dynamic Levels</span> of deep volume.</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Network Depth</span>
                                                <span className="text-lg font-mono font-bold text-emerald-500">L1-L10</span>
                                            </div>
                                            <Link href="/dashboard/referral">
                                                <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-black group-hover:translate-x-1 transition-all">
                                                    Access Module
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </Card>
                            </motion.div>

                            {/* Lucky Draw Income (Phase 13: Real-Time Engine) */}
                            <motion.div variants={itemVariants}>
                                <LuckyDraw />
                            </motion.div>

                            {/* Cashback System */}
                            <motion.div variants={itemVariants}>
                                <Card className="h-full bg-black/40 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-cyan-500/50 transition-all duration-500 hover:shadow-[0_0_50px_rgba(6,182,212,0.15)] relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <CardContent className="p-8 space-y-6 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-300">
                                                <Zap className="h-7 w-7" />
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono font-bold text-cyan-500 uppercase tracking-widest">
                                                Module_04
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h3 className="text-2xl font-display font-bold text-white group-hover:text-cyan-400 transition-colors">Cashback Cycle</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">Sustainable safety net. <span className="text-white font-bold">100% Sustainability</span> for every roll.</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Protocol</span>
                                                <span className="text-lg font-mono font-bold text-cyan-500">Auto-Return</span>
                                            </div>
                                            <Link href="/dashboard/cashback">
                                                <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-500 hover:bg-cyan-500 hover:text-black group-hover:translate-x-1 transition-all">
                                                    Access Module
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                </Card>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right Column - Activity & Referral */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Recruitment Console (Referral) */}
                        <motion.div variants={itemVariants}>
                            <Card className="border-white/5 bg-black/40 backdrop-blur-3xl rounded-[2rem] overflow-hidden group relative">
                                {/* Ambient Background Animation */}
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(6,182,212,0.1),transparent_50%)]" />
                                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-cyan-500/10 border-dashed animate-[spin_20s_linear_infinite]" />

                                <CardContent className="p-8 relative z-10 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono font-bold text-cyan-500 uppercase tracking-widest">
                                                Network_Module
                                            </div>
                                            <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-display font-bold text-white mb-2">Recruitment Console</h3>
                                            <p className="text-sm text-muted-foreground">Expand your digital influence. Override default protocols.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative group/input">
                                            <div className="absolute inset-0 bg-cyan-500/5 blur-xl opacity-0 group-hover/input:opacity-100 transition-opacity" />
                                            <div className="relative flex items-center gap-2 p-1 rounded-xl bg-black/40 border border-white/10 group-hover/input:border-cyan-500/50 transition-colors">
                                                <div className="flex-1 px-4 py-3 font-mono text-xs text-cyan-200 truncate">
                                                    {displayReferralLink}
                                                </div>
                                                <Button
                                                    onClick={handleCopy}
                                                    size="icon"
                                                    className={cn(
                                                        "h-10 w-10 rounded-lg transition-all",
                                                        copied ? "bg-green-500 text-black" : "bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500 hover:text-black"
                                                    )}
                                                >
                                                    {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                onClick={() => {
                                                    const text = encodeURIComponent("Join me on TRK Game! 🚀");
                                                    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralLink)}`, "_blank");
                                                }}
                                                className="bg-white/5 hover:bg-[#1DA1F2]/20 text-white hover:text-[#1DA1F2] border border-white/5 hover:border-[#1DA1F2]/50"
                                            >
                                                <Twitter className="h-4 w-4 mr-2" />
                                                Twitter
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    const text = encodeURIComponent("Join me on TRK Game! 🚀");
                                                    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`, "_blank");
                                                }}
                                                className="bg-white/5 hover:bg-[#0088cc]/20 text-white hover:text-[#0088cc] border border-white/5 hover:border-[#0088cc]/50"
                                            >
                                                <Send className="h-4 w-4 mr-2" />
                                                Telegram
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5">
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <div className="text-[10px] font-black uppercase text-white/30 mb-1">Total Invites</div>
                                                <div className="text-xl font-bold text-white">{user?.directReferrals || 0}</div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                                <div className="text-[10px] font-black uppercase text-white/30 mb-1">On-Chain Status</div>
                                                <div className={cn(
                                                    "text-[10px] font-bold uppercase",
                                                    isRegisteredOnChain ? "text-emerald-500" : "text-amber-500"
                                                )}>
                                                    {isRegisteredOnChain ? "Verified Identity" : "Pending Registration"}
                                                </div>
                                            </div>
                                        </div>

                                        {!isRegisteredOnChain && (
                                            <Button
                                                onClick={registerOnChain}
                                                className="w-full h-12 bg-amber-500/20 hover:bg-amber-500 text-amber-500 hover:text-black border border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Secure On-Chain Identity
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* Promo Poster (New) */}
                        <div className="mb-8">
                            <PromoPoster />
                        </div>

                        {/* Global Pulse (Real-time Ecosystem Monitor) */}
                        <div className="mb-8">
                            <GlobalPulse />
                        </div>

                        <div className="min-h-[500px] relative w-full">
                            <CyberneticTerminal />
                        </div>
                    </div>
                </div>
            </main >

            {/* Modals */}
            <DepositModal
                isOpen={isDepositOpen}
                onClose={() => setIsDepositOpen(false)}
                onConfirm={async (amount: number) => {
                    await deposit(amount);
                }}
            />
            <WithdrawalModal
                isOpen={isWithdrawOpen}
                onClose={() => setIsWithdrawOpen(false)}
            />
        </div >
    );
}
