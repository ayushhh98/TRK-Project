"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/components/providers/WalletProvider";
import { WalletCard } from "@/components/cash/WalletCard";
import { RewardRedemptionModal } from "@/components/cash/RewardRedemptionModal";
import { MembershipModal } from "@/components/cash/MembershipModal";
import { DepositHistoryTable } from "@/components/cash/DepositHistoryTable";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, TrendingUp, Shield, Activity, Lock, Globe, ExternalLink, Zap, Smartphone, Landmark, Eye, EyeOff, Wallet, Repeat, Plus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";

function CashDashboardContent() {
    const {
        realBalances, usdtBalance, nativeBalance,
        unclaimedRounds, claimWin, claimLoss, refetchUnclaimed, faucet,
        isConnected, isLoading, user, deposits, gameHistory, isRegisteredOnChain, purchaseMembership,
        address, connect, recentWallets, switchWallet, isSwitchingWallet
    } = useWallet();
    const router = useRouter();
    const [isRewardRedeemOpen, setIsRewardRedeemOpen] = useState(false);
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [hideBalances, setHideBalances] = useState(false);
    const [latency, setLatency] = useState(12);
    const searchParams = useSearchParams();
    const rewardPoints = user?.rewardPoints || 0;
    const rewardUSDT = (rewardPoints / 100).toFixed(2);
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

    const handleMembership = () => {
        setIsDepositOpen(true);
    };

    const executeMembership = async (amount: number) => {
        await purchaseMembership(amount);
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
                        <Button
                            onClick={() => faucet?.()}
                            variant="outline"
                            className="hidden md:flex items-center gap-2 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-none"
                        >
                            <Zap className="h-3 w-3" />
                            Mint_Test_USDT
                        </Button>
                        <Link
                            href="https://testnet.binance.org/faucet-smart"
                            target="_blank"
                            className="hidden md:flex items-center justify-center gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest h-10 px-6"
                        >
                            <ExternalLink className="h-3 w-3" />
                            Gas_Refuel
                        </Link>
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

                {/* Unified Ecosystem Vault */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">UNIFIED_ECOSYSTEM_VAULT</h2>
                    </div>

                    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent rounded-[2rem] overflow-hidden group hover:border-emerald-500/40 transition-all duration-500 relative">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                        <CardContent className="p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                            <div className="space-y-4 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                        <Zap className="h-8 w-8" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Total_Asset_Value</div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">Main Wallet Balance</h3>
                                    </div>
                                </div>

                                <div className="text-6xl font-mono font-black text-white tracking-tighter shadow-emerald-500/20 drop-shadow-lg">
                                    {hideBalances ? "****" : (realBalances.totalUnified || 0).toFixed(2)} <span className="text-2xl text-emerald-400">SC</span>
                                </div>
                                <div className="text-sm font-medium text-white/40 max-w-md leading-relaxed">
                                    Your consolidated balance across all game protocols, cashback reserves, and referral income streams.
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                    Reward Points: <span className="text-white/70">{rewardPoints.toLocaleString()} SC</span> (~${rewardUSDT})
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-full md:w-auto min-w-[200px]">
                                <Button
                                    onClick={handleMembership}
                                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-500/20 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95"
                                >
                                    GET_MEMBERSHIP
                                </Button>
                                <Button
                                    onClick={() => setIsRewardRedeemOpen(true)}
                                    className="w-full h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                                >
                                    REDEEM_REWARDS
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Wallet Switch Matrix */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">WALLET_SWITCH_MATRIX</h2>
                    </div>

                    <Card className="bg-black/40 backdrop-blur-xl border border-white/5 rounded-none overflow-hidden">
                        <CardContent className="p-8 space-y-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                                        <Wallet className="h-4 w-4 text-emerald-400" />
                                        Active Wallet
                                    </div>
                                    <div className="text-lg font-mono font-bold text-white">
                                        {activeWallet ? formatWallet(activeWallet) : "No wallet connected"}
                                    </div>
                                    <div className="text-[10px] text-white/30 font-medium max-w-md">
                                        Connect multiple wallets and switch instantly without leaving the dashboard.
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        onClick={() => (isConnected ? switchWallet() : connect("Other"))}
                                        className="h-10 px-5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-widest rounded-none"
                                        disabled={isSwitchingWallet}
                                    >
                                        <Plus className="h-3 w-3 mr-2" />
                                        Connect Another
                                    </Button>
                                    <Button
                                        onClick={() => switchWallet()}
                                        variant="outline"
                                        className="h-10 px-5 border-white/10 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-none"
                                        disabled={isSwitchingWallet || !activeWallet}
                                    >
                                        <Repeat className="h-3 w-3 mr-2" />
                                        Switch Wallet
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {walletList.length === 0 ? (
                                    <div className="border border-white/10 bg-white/[0.02] p-4 text-[10px] text-white/30 uppercase tracking-widest">
                                        No wallet profiles connected yet.
                                    </div>
                                ) : (
                                    walletList.map((walletAddress) => {
                                        const isActive = activeWallet?.toLowerCase() === walletAddress.toLowerCase();
                                        return (
                                            <div key={walletAddress} className="border border-white/10 bg-white/[0.02] p-4 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Wallet Address</div>
                                                    <div className="text-sm font-mono font-bold text-white">{formatWallet(walletAddress)}</div>
                                                </div>
                                                {isActive ? (
                                                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Active
                                                    </div>
                                                ) : (
                                                    <Button
                                                        onClick={() => switchWallet(walletAddress)}
                                                        className="h-9 px-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-none"
                                                        disabled={isSwitchingWallet}
                                                    >
                                                        <Repeat className="h-3 w-3 mr-2" />
                                                        Switch
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {isSwitchingWallet && (
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                    <Repeat className="h-3 w-3 animate-spin" />
                                    Switching in progress — confirm the account inside your wallet.
                                </div>
                            )}
                        </CardContent>
                    </Card>
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
                                desc: "Bridge assets from Ethereum, Polygon or Solana into the TRK Ecosystem.",
                                icon: Zap,
                                color: "text-blue-400",
                                link: "https://pancakeswap.finance"
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
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 whitespace-nowrap">ACTIVITY_LEDGER</h2>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <DepositHistoryTable />
                </div>
            </main>

            <AnimatePresence>
                {isDepositOpen && (
                    <MembershipModal
                        isOpen={isDepositOpen}
                        onClose={() => setIsDepositOpen(false)}
                        onConfirm={executeMembership}
                    />
                )}
                {isRewardRedeemOpen && (
                    <RewardRedemptionModal
                        isOpen={isRewardRedeemOpen}
                        onClose={() => setIsRewardRedeemOpen(false)}
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
