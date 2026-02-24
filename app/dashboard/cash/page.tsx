"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/components/providers/WalletProvider";
import { WalletCard } from "@/components/cash/WalletCard";
import { DepositModal } from "@/components/cash/DepositModal";
import { WithdrawalModal } from "@/components/cash/WithdrawalModal";

import { DepositHistoryTable } from "@/components/cash/DepositHistoryTable";
import { WithdrawalHistoryTable } from "@/components/cash/WithdrawalHistoryTable";
import { BalanceAnimator } from "@/components/cash/BalanceAnimator";
import { ConfettiEffect } from "@/components/effects/ConfettiEffect";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, TrendingUp, Shield, Activity, Lock, Globe, ExternalLink, Zap, Smartphone, Landmark, Eye, EyeOff, Wallet, Repeat, Plus, CheckCircle2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useNotifications } from "@/components/providers/NotificationProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";

function CashDashboardContent() {
    const {
        realBalances, usdtBalance, nativeBalance,
        unclaimedRounds, claimWin, claimLoss, refetchUnclaimed, faucet,
        isConnected, isLoading, user, deposits, gameHistory, isRegisteredOnChain,
        address, connect, recentWallets, switchWallet, isSwitchingWallet, deposit
    } = useWallet();
    const { notifications, unreadCount, isPanelOpen, togglePanel, markAsRead, markAllAsRead } = useNotifications();
    const router = useRouter();
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [hideBalances, setHideBalances] = useState(false);
    const [latency, setLatency] = useState(12);
    const searchParams = useSearchParams();
    const activeWallet = address;
    const walletList = (() => {
        const list = [...(recentWallets || [])];
        if (activeWallet && !list.some((item) => item.toLowerCase() === activeWallet.toLowerCase())) {
            list.unshift(activeWallet);
        }
        const seen = new Set<string>();
        return list.filter((item) => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    })();
    const formatWallet = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`;

    // Authentication Guard
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

    // Live Latency Jitter
    useEffect(() => {
        const interval = setInterval(() => {
            setLatency(Math.floor(8 + Math.random() * 8));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (searchParams.get("deposit") === "true") {
            setIsDepositOpen(true);
        }
    }, [searchParams]);

    const handleDeposit = () => {
        setIsDepositOpen(true);
    };

    const executeDeposit = async (amount: number) => {
        await deposit(amount);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-white selection:bg-emerald-500/30 selection:text-emerald-200">
            {/* Cinematic Header */}
            <header className="border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="group flex items-center gap-3 text-white/40 hover:text-white transition-all">
                            <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/30 transition-colors">
                                <ArrowLeft className="h-4 w-4" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] hidden md:inline">SYSTEM_EXIT</span>
                        </Link>

                        <div className="h-8 w-px bg-white/10" />

                        <div className="flex flex-col">
                            <h1 className="text-xl font-display font-black tracking-tighter flex items-center gap-2">
                                <Shield className="h-5 w-5 text-emerald-500" />
                                CYBERNETIC<span className="text-emerald-500">_VAULT</span>
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                                    Protocol_Active // Tier_{user?.activation?.totalDeposited && user.activation.totalDeposited >= 50 ? "Alpha" : "Beta"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {parseFloat(nativeBalance) < 0.01 && (
                            <Link
                                href="https://testnet.binance.org/faucet-smart"
                                target="_blank"
                                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase animate-pulse"
                            >
                                <Zap className="h-3 w-3" />
                                Gas_Required
                            </Link>
                        )}
                        <Button
                            onClick={() => setHideBalances(!hideBalances)}
                            variant="ghost"
                            className="h-10 w-10 p-0 rounded-none border border-white/10 hover:bg-white/5 active:scale-95 transition-transform"
                        >
                            {hideBalances ? <EyeOff className="h-4 w-4 opacity-100 text-emerald-500" /> : <Eye className="h-4 w-4 opacity-40" />}
                        </Button>
                        <NotificationBell
                            unreadCount={unreadCount}
                            onClick={togglePanel}
                            pulse={unreadCount > 0}
                        />
                        <div className="hidden lg:flex flex-col items-end px-4 border-r border-white/10">
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">Global_Network_Latency</span>
                            <span className="text-[10px] font-mono font-bold text-emerald-500">{latency}ms</span>
                        </div>
                        <Button variant="ghost" className="h-10 w-10 p-0 rounded-none border border-white/10 hover:bg-white/5">
                            <Globe className="h-4 w-4 opacity-40" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
                {/* Unclaimed Profits Section */}
                {unclaimedRounds.length > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">UNCLAIMED_QUANTUM_REWARDS</h2>
                            </div>
                            <Button
                                onClick={() => refetchUnclaimed()}
                                variant="ghost"
                                className="text-[8px] font-black uppercase tracking-widest text-white/20 hover:text-white"
                            >
                                REFRESH_LEDGER
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {unclaimedRounds.map((roundId) => (
                                <Card key={roundId.toString()} className="bg-purple-500/5 border border-purple-500/20 p-6 relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="space-y-1">
                                            <div className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Protocol_ID</div>
                                            <div className="text-xs font-mono font-bold text-white">#{roundId.toString().slice(-8)}</div>
                                        </div>
                                        <div className="h-2 w-12 bg-purple-500/20 rounded-full overflow-hidden">
                                            <motion.div
                                                animate={{ x: ["-100%", "100%"] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="h-full w-1/2 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={() => claimWin(Number(roundId), true)}
                                            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[10px] uppercase tracking-widest py-4 h-auto rounded-none"
                                        >
                                            CLAIM_WIN
                                        </Button>
                                        <Button
                                            onClick={() => claimLoss(Number(roundId), true)}
                                            variant="outline"
                                            className="border-white/10 hover:bg-white/5 text-white/40 hover:text-white font-black text-[10px] uppercase tracking-widest py-4 h-auto rounded-none"
                                        >
                                            SETTLE_LOSS
                                        </Button>
                                    </div>

                                    <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-purple-500/5 blur-3xl rounded-full" />
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                <div className="h-px bg-white/5" />

                {/* 6-Wallet System: Unified Ecosystem Vault */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">6-WALLET_ECOSYSTEM_PROTOCOL</h2>
                        </div>
                        <div className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">
                            Total_Asset_Value: ${hideBalances ? "****" : (realBalances.grandTotal || 0).toFixed(2)} USDT
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* Column 1: EXTERNAL / ON-CHAIN (Wallets 1 & 3) */}
                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2 px-2">
                                <Globe className="h-3 w-3" /> ON-CHAIN_BALANCES
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Wallet 1: User Main Wallet */}
                                <Card className="bg-white/[0.02] border-white/10 p-5 rounded-2xl group/w hover:border-emerald-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 group-hover/w:text-emerald-400 transition-colors">
                                            <Wallet className="h-4 w-4" />
                                        </div>
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">Wallet_01</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">User_Main_External</div>
                                        <div className="text-xl font-mono font-black text-white">
                                            {hideBalances ? "****" : parseFloat(usdtBalance || "0").toFixed(2)} <span className="text-xs text-white/20">USDT</span>
                                        </div>
                                        <div className="text-[8px] font-mono text-white/20 truncate">{address || "Disconnected"}</div>
                                    </div>
                                </Card>

                                {/* Wallet 3: BD Wallet */}
                                <Card className="bg-white/[0.02] border-white/10 p-5 rounded-2xl group/w hover:border-blue-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 group-hover/w:text-blue-400 transition-colors">
                                            <Shield className="h-4 w-4" />
                                        </div>
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">Wallet_03</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">BD_System_Vault</div>
                                        <div className="text-xl font-mono font-black text-white/40">
                                            SECURED <span className="text-xs text-white/10">USDT</span>
                                        </div>
                                        <div className="text-[8px] font-mono text-white/20 truncate">0xBD_SYSTEM_CONTRACT</div>
                                    </div>
                                </Card>
                            </div>
                        </div>

                        {/* Column 2: INTERNAL / PROTOCOL (Wallets 2, 4, 5, 6) */}
                        <div className="space-y-4">
                            <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] flex items-center gap-2 px-2">
                                <Zap className="h-3 w-3" /> INTERNAL_LEDGER
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 gap-4">
                                {/* Wallet 2: Game Wallet */}
                                <Card className="bg-white/[0.02] border-white/10 p-5 rounded-2xl group/w hover:border-amber-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 box-content h-4 w-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                            <Zap className="h-4 w-4" />
                                        </div>
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">Wallet_02</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Game_Fuel_Internal</div>
                                        <div className="text-xl font-mono font-black text-white">
                                            {hideBalances ? "****" : (realBalances.game || 0).toFixed(2)} <span className="text-xs text-white/20">USDT</span>
                                        </div>
                                    </div>
                                </Card>

                                {/* Wallet 4: Cashback/ROI Wallet */}
                                <Card className="bg-white/[0.02] border-white/10 p-5 rounded-2xl group/w hover:border-emerald-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 box-content h-4 w-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                            <TrendingUp className="h-4 w-4" />
                                        </div>
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">Wallet_04</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Cashback_ROI_Vault</div>
                                        <div className="text-xl font-mono font-black text-white">
                                            {hideBalances ? "****" : (realBalances.cashbackROI || 0).toFixed(2)} <span className="text-xs text-white/20">USDT</span>
                                        </div>
                                    </div>
                                </Card>

                                {/* Wallet 5: Lucky Draw Entry Wallet */}
                                <Card className="bg-white/[0.02] border-white/10 p-5 rounded-2xl group/w hover:border-purple-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 box-content h-4 w-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500">
                                            <Repeat className="h-4 w-4" />
                                        </div>
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">Wallet_05</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Lucky_Draw_Entry</div>
                                        <div className="text-xl font-mono font-black text-white">
                                            {hideBalances ? "****" : (realBalances.luckyDrawWallet || 0).toFixed(2)} <span className="text-xs text-white/20">USDT</span>
                                        </div>
                                    </div>
                                </Card>

                                {/* Wallet 6: Practice Wallet */}
                                <Card className="bg-white/[0.02] border-white/10 p-5 rounded-2xl group/w hover:border-white/30 transition-all opacity-60">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 box-content h-4 w-4 rounded-xl bg-white/5 border border-white/10 text-white/40">
                                            <Activity className="h-4 w-4" />
                                        </div>
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">Wallet_06</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Practice_Simulation</div>
                                        <div className="text-xl font-mono font-black text-white">
                                            {hideBalances ? "****" : parseFloat(user?.practiceBalance?.toString() || "0").toFixed(2)} <span className="text-xs text-white/20">USDT</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Primary Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                        <Button
                            onClick={handleDeposit}
                            className="h-16 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                        >
                            <Plus className="mr-2 h-5 w-5" /> DEPOSIT_USDT_TO_GAME
                        </Button>
                        <Button
                            onClick={() => setIsWithdrawOpen(true)}
                            variant="outline"
                            className="h-16 border-white/10 hover:bg-white/5 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all"
                        >
                            <ArrowUpRight className="mr-2 h-5 w-5" /> WITHDRAW_INTERNAL_PROFIT
                        </Button>
                    </div>
                </div>


                {/* Earnings Nexus Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 bg-black/40 backdrop-blur-xl border border-white/5 rounded-none overflow-hidden relative group">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                        <div className="p-8">
                            <div className="flex items-center justify-between mb-12">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-emerald-400" />
                                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Yield_Synchronization</h2>
                                    </div>
                                    <p className="text-2xl font-display font-black tracking-tight underline decoration-emerald-500/30 underline-offset-8">EARNINGS_NEXUS_v2.0</p>
                                </div>

                                <div className="flex bg-white/5 border border-white/10 p-1">
                                    {['7D', '30D', 'ALL'].map((p) => (
                                        <button key={p} className={cn(
                                            "px-4 py-1.5 text-[10px] font-black transition-all",
                                            p === '30D' ? "bg-white text-black" : "text-white/40 hover:text-white"
                                        )}>
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-[350px] w-full relative">
                                <div className="absolute inset-0 grid grid-cols-7 gap-4 pointer-events-none">
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <div key={i} className="h-full border-x border-white/[0.02]" />
                                    ))}
                                </div>

                                <div className="relative h-full flex items-end justify-between gap-4">
                                    {(() => {
                                        // Generate 7 days of dynamic labels/data
                                        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                                        const today = new Date();
                                        const chartData = Array.from({ length: 7 }).map((_, i) => {
                                            const d = new Date();
                                            d.setDate(today.getDate() - (6 - i));
                                            const dayLabel = days[d.getDay()];
                                            const dateStr = d.toISOString().split('T')[0];

                                            // Aggregate total activity for this day
                                            const dayDeposits = deposits
                                                ?.filter(dep => dep.createdAt.startsWith(dateStr))
                                                .reduce((acc, dep) => acc + dep.amount, 0) || 0;

                                            const dayWins = gameHistory
                                                ?.filter(h => h.timestamp.startsWith(dateStr) && h.won)
                                                .reduce((acc, h) => acc + (h.payout - h.amount), 0) || 0;

                                            const totalDayYield = dayDeposits + dayWins;
                                            // Normalize to 0-100 range for visualization
                                            const height = Math.min(95, Math.max(5, (totalDayYield / 100) * 100));

                                            return { label: dayLabel, height, value: totalDayYield };
                                        });

                                        return chartData.map((d, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-6 group/bar">
                                                <div className="w-full relative h-[300px] flex items-end">
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${d.height}%` }}
                                                        transition={{ delay: i * 0.1, duration: 1.5, ease: [0.23, 1, 0.32, 1] }}
                                                        className="w-full bg-gradient-to-t from-emerald-500/5 via-emerald-500/20 to-emerald-400 rounded-sm relative"
                                                    >
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.5)]" />
                                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-all duration-300 pointer-events-none z-50">
                                                            <div className="bg-emerald-500 text-black text-[10px] font-black px-2 py-1 rounded shadow-xl whitespace-nowrap">
                                                                +${d.value.toFixed(2)}
                                                            </div>
                                                            <div className="w-0.5 h-4 bg-emerald-500 mx-auto" />
                                                        </div>
                                                    </motion.div>
                                                </div>
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest group-hover/bar:text-emerald-500 transition-colors">
                                                    {d.label}
                                                </span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-none p-8 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-white/40" />
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Security_Overview</h3>
                                </div>
                                <p className="text-3xl font-display font-black leading-tight">HARDENED_CAPITAL</p>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { label: "Withdrawal Status", value: user?.activation?.totalDeposited ? (user.activation.totalDeposited >= 50 ? "Verified" : "Pending") : "Restricted", color: user?.activation?.totalDeposited && user.activation.totalDeposited >= 50 ? "text-emerald-500" : "text-amber-500" },
                                    { label: "Auth Protocol", value: "ZKP_SHA256", color: "text-white/60" },
                                    { label: "Security Protocol", value: isRegisteredOnChain ? "Synchronized" : "Unpaired", color: isRegisteredOnChain ? "text-emerald-500" : "text-red-500" },
                                    { label: "Asset Reserve", value: `Tier ${user?.activation?.totalDeposited ? (user.activation.totalDeposited >= 50 ? "2" : "1") : "0"}`, color: "text-blue-500" }
                                ].map((stat) => (
                                    <div key={stat.label} className="flex justify-between items-center py-3 border-b border-white/5">
                                        <span className="text-[10px] font-bold text-white/20 uppercase">{stat.label}</span>
                                        <span className={cn("text-xs font-mono font-bold", stat.color)}>{stat.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-white/5 border border-white/10 space-y-3">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                <span className="text-[9px] font-black text-white/60 uppercase">Monthly_Optimization</span>
                            </div>
                            <p className="text-[10px] text-white/30 leading-relaxed font-medium">
                                System AI suggests consolidating <span className="text-white">Active_Capital</span> to maximize yield thresholds in the next Epoch.
                            </p>
                        </div>
                    </Card>
                </div>

                {/* External Liquidity Access - Enhanced for Exchange Transfers */}
                <div className="mt-12 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/5" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 whitespace-nowrap">EXTERNAL_LIQUIDITY_BRIDGES</h2>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                name: "Web3_Connect",
                                protocol: "Multi-Chain",
                                desc: "High-velocity asset bridging from Ethereum, Polygon or Solana into TRK.",
                                icon: Zap,
                                color: "text-blue-400",
                                link: "https://pancakeswap.finance"
                            },
                            {
                                name: "Binance_Direct",
                                protocol: "USDT-BEP20",
                                desc: "Direct injection from Binance Exchange via secure network protocol.",
                                icon: Landmark,
                                color: "text-amber-400",
                                link: "https://www.binance.com/en/my/wallet/account/main/withdrawal/crypto/USDT"
                            },
                            {
                                name: "Global_Bridge",
                                protocol: "Cross-Layer",
                                desc: "Institutional grade liquidity sync for high-volume cross-chain transfers.",
                                icon: Globe,
                                color: "text-emerald-400",
                                link: "https://stargate.finance/transfer"
                            }
                        ].map((bridge) => (
                            <Card key={bridge.name} className="bg-white/[0.02] border-white/5 p-6 group hover:bg-white/[0.04] transition-all relative overflow-hidden rounded-none">
                                <div className="relative z-10 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className={cn("p-3 bg-white/5 border border-white/10 group-hover:scale-110 transition-transform", bridge.color)}>
                                            <bridge.icon className="h-5 w-5" />
                                        </div>
                                        <a href={bridge.link} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 transition-colors">
                                            <ExternalLink className="h-4 w-4 text-white/20 group-hover:text-white" />
                                        </a>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">{bridge.name}</h3>
                                        <div className="text-[9px] font-mono text-white/40 uppercase">{bridge.protocol}</div>
                                    </div>
                                    <p className="text-[10px] text-white/30 leading-relaxed font-medium">
                                        {bridge.desc}
                                    </p>
                                </div>
                                <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-transparent to-white/[0.02] -mr-8 -mb-8 rotate-45" />
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Deposit History Section */}
                <div className="mt-12 space-y-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/50 whitespace-nowrap">INFLOW_LEDGER</h2>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <DepositHistoryTable />
                </div>

                {/* Withdrawal History Section */}
                <div className="mt-12 space-y-6">
                    <div className="flex items-center gap-3">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500/50 whitespace-nowrap">OUTFLOW_LEDGER</h2>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <WithdrawalHistoryTable />
                </div>
            </main>

            <AnimatePresence>
                {isDepositOpen && (
                    <DepositModal
                        isOpen={isDepositOpen}
                        onClose={() => setIsDepositOpen(false)}
                        onConfirm={executeDeposit}
                    />
                )}
                {isWithdrawOpen && (
                    <WithdrawalModal
                        isOpen={isWithdrawOpen}
                        onClose={() => setIsWithdrawOpen(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default function CashDashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#020202] flex items-center justify-center">
                <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
            </div>
        }>
            <CashDashboardContent />
        </Suspense>
    );
}
