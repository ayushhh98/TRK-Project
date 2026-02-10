"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    ArrowLeft, Shield, TrendingUp, Users, Zap, Gift,
    CheckCircle2, Clock, AlertCircle, ChevronRight,
    Wallet, RefreshCcw, Award, Target, ArrowUpRight,
    Pause, Play, RotateCcw, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";

import { useReadContract } from "wagmi";
import { TRKGameABI } from "@/config/abis";
import { GAME_CONTRACT_ADDRESS } from "@/config/contracts";
import { formatUnits } from "viem";

// Cashback Phase Configuration
const cashbackPhases = [
    { id: 'phase1', name: 'Phase 1', maxUsers: '100,000', dailyRate: '0.50%', isCurrent: true },
    { id: 'phase2', name: 'Phase 2', maxUsers: '10 Lakh', dailyRate: '0.40%', isCurrent: false },
    { id: 'phase3', name: 'Phase 3', maxUsers: '10 Lakh+', dailyRate: '0.33%', isCurrent: false },
];

const boostTiers = [
    { minVolume: 0, multiplier: '1X', name: 'Standard', profitCap: '400%', color: 'gray' },
    { minVolume: 100, multiplier: '1.5X', name: 'Boost', profitCap: '500%', color: 'blue' },
    { minVolume: 500, multiplier: '2X', name: 'Double', profitCap: '600%', color: 'green' },
    { minVolume: 2000, multiplier: '3X', name: 'Triple', profitCap: '700%', color: 'purple' },
    { minVolume: 10000, multiplier: '4X', name: 'Quadruple', profitCap: '800%', color: 'primary' },
];

const advantages = [
    'No full capital wipe-outs',
    'Daily automatic recovery',
    'Predictable protection',
    'Sustainable ecosystem design',
    'Encourages smart, low-risk participation'
];

export default function CashbackPage() {
    const { address, user, claimLiquiditySync, refreshUser } = useWallet();
    const [showHistory, setShowHistory] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const [tickingCashback, setTickingCashback] = useState(0);

    // Fetch live user data from contract
    const { data: balanceData, isLoading: isBalancesLoading } = useReadContract({
        address: GAME_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRKGameABI,
        functionName: 'getUserBalances',
        args: [address as `0x${string}`],
        query: {
            enabled: !!address && (GAME_CONTRACT_ADDRESS as string) !== "0x0000000000000000000000000000000000000000"
        }
    }) as { data: any, isLoading: boolean };

    // Fetch unclaimed rounds
    const { data: unclaimedRoundsRaw } = useReadContract({
        address: GAME_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRKGameABI,
        functionName: 'getUnclaimedRounds',
        args: [address as `0x${string}`, true],
        query: {
            enabled: !!address && (GAME_CONTRACT_ADDRESS as string) !== "0x0000000000000000000000000000000000000000"
        }
    }) as { data: any };

    // Fetch Cashback Status from API
    const [apiStats, setApiStats] = useState<any>(null);

    useEffect(() => {
        const fetchCashbackStatus = async () => {
            try {
                const res = await fetch('/api/cashback/status', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const data = await res.json();
                if (data.status === 'success') {
                    setApiStats(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch cashback status", error);
            }
        };

        if (address) {
            fetchCashbackStatus();
        }
    }, [address, isSyncing]);

    const stats = useMemo(() => {
        if (apiStats && balanceData) {
            const totalDeposit = Number(formatUnits(balanceData[5] || 0n, 18));

            // Allow API to override contract data for advanced logic not yet on-chain
            return {
                isActivated: apiStats.isActivated,
                totalLosses: apiStats.totalLosses,
                totalRecovered: apiStats.recovery.totalRecovered,
                pendingCashback: apiStats.cashback.pending,
                dailyRate: apiStats.cashback.baseDailyRate,
                referralVolume: apiStats.boostTier.referralVolume,
                boostMultiplier: apiStats.boostTier.multiplier,
                sustainabilityCycle: {
                    hasReachedCap: apiStats.sustainabilityCycle.hasReachedCap,
                    currentCap: apiStats.sustainabilityCycle.currentCap,
                    capProgress: apiStats.sustainabilityCycle.capProgress,
                    remainingCap: apiStats.sustainabilityCycle.remainingCap,
                    userCount: apiStats.sustainabilityCycle.capInfo.currentUserCount,
                    threshold: apiStats.sustainabilityCycle.capInfo.activatedUserThreshold,
                    requiresRedeposit: apiStats.sustainabilityCycle.requiresRedeposit
                },
                boostTierName: apiStats.boostTier.name,
                currentPhase: apiStats.currentPhase
            };
        }
        return null;
    }, [apiStats, balanceData]);

    // Real-time Ticker Logic
    useEffect(() => {
        if (!stats) return;

        // Initial set
        setTickingCashback(stats.pendingCashback);

        const interval = setInterval(() => {
            setTickingCashback(prev => {
                const drip = 0.00001;
                return prev + drip;
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [stats]);

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await claimLiquiditySync();
            await refreshUser();
            setTickingCashback(0);
        } finally {
            setIsSyncing(false);
        }
    };

    if (isBalancesLoading || !stats) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="relative">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-2 border-green-500/20 border-t-green-500 rounded-full"
                    />
                    <Shield className="h-6 w-6 text-green-500 absolute inset-0 m-auto animate-pulse" />
                </div>
            </div>
        );
    }

    const recoveryProgress = stats.totalLosses > 0 ? (stats.totalRecovered / stats.totalLosses) * 100 : 0;
    const remainingLoss = Math.max(0, stats.totalLosses - stats.totalRecovered);
    const dailyCashback = stats.totalLosses * stats.dailyRate * stats.boostMultiplier;
    const daysToRecover = dailyCashback > 0 ? Math.ceil(remainingLoss / dailyCashback) : 0;

    return (
        <div className="min-h-screen bg-[#050505] text-white pb-20 selection:bg-green-500/30">
            {/* Cinematic Background FX */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-green-500/5 blur-[100px] rounded-full animate-pulse" />
                <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] bg-[length:40px_40px]" />
            </div>

            {/* Header */}
            <header className="border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group">
                            <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-white" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-green-400 fill-green-400/20" />
                                <span className="font-display font-black text-xl tracking-tight uppercase">Cybernetic <span className="text-green-400 font-normal">Shield</span></span>
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground tracking-[0.2em] uppercase opacity-50">Global Integrity v2.8</div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 space-y-16 relative">
                {/* Hero Section: The Shield Terminal */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-zinc-900/50 to-black border border-white/5 rounded-[40px] p-8 lg:p-16 relative overflow-hidden group shadow-2xl"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none" />

                    <div className="flex flex-col lg:flex-row items-center gap-16 relative z-10">
                        {/* Visual 1: Orbital Shield */}
                        <div className="relative w-80 h-80 flex-shrink-0">
                            <div className="absolute inset-0 bg-green-500/10 rounded-full blur-[80px] animate-pulse" />

                            {/* Rotating Rings */}
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border border-green-500/20 rounded-full border-dashed"
                            />
                            <motion.div
                                animate={{ rotate: -360 }}
                                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-6 border border-emerald-500/10 rounded-full"
                            />

                            {/* The Shield Core */}
                            <div className="absolute inset-12 rounded-full bg-gradient-to-t from-green-950/60 to-emerald-900/30 border border-green-500/40 flex flex-col items-center justify-center backdrop-blur-3xl shadow-[0_0_60px_rgba(34,197,94,0.15)]">
                                <div className="relative">
                                    <Shield className="h-20 w-20 text-green-400 absolute inset-0 blur-xl opacity-40" />
                                    <Shield className="h-20 w-20 text-green-400 relative z-10 fill-green-400/5" />
                                </div>
                                <div className="mt-4 text-center">
                                    <div className="text-4xl font-black text-white leading-none">{recoveryProgress.toFixed(1)}%</div>
                                    <div className="text-[10px] font-mono text-green-500/60 tracking-[0.3em] uppercase mt-2">Integrity</div>
                                </div>
                            </div>

                            {/* Data Nodes */}
                            {[0, 72, 144, 216, 288].map((deg, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_12px_rgba(34,197,94,1)]"
                                    style={{
                                        top: '50%',
                                        left: '50%',
                                        transform: `rotate(${deg}deg) translate(160px) rotate(-${deg}deg) translate(-50%, -50%)`
                                    }}
                                    animate={{
                                        opacity: [0.2, 1, 0.2],
                                        scale: [0.8, 1.2, 0.8]
                                    }}
                                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.6 }}
                                />
                            ))}
                        </div>

                        {/* Content: Status Terminal */}
                        <div className="flex-1 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-mono font-black border border-green-500/20 animate-pulse tracking-widest uppercase">
                                    PROTECTION_STABLE
                                </div>
                                <div className="h-px flex-1 bg-gradient-to-r from-green-500/20 to-transparent" />
                            </div>

                            <h2 className="text-5xl lg:text-7xl font-display font-black tracking-tighter text-white uppercase italic leading-[0.9]">
                                Automated <br />
                                <span className="text-green-400">Recovery</span>
                            </h2>

                            <p className="text-zinc-400 max-w-xl text-lg leading-relaxed font-medium">
                                Your capital is shielded by our high-frequency distribution engine. Daily recovery protocols ensure that no performance goes uncorrected.
                            </p>

                            <div className="grid grid-cols-2 gap-6 pt-4">
                                <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/5 hover:border-green-500/20 transition-all group">
                                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 group-hover:text-zinc-400">Total Net Exposure</div>
                                    <div className="text-3xl font-black text-white group-hover:text-red-400 transition-colors">${stats.totalLosses.toFixed(2)}</div>
                                </div>
                                <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/5 hover:border-green-500/20 transition-all group">
                                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 group-hover:text-zinc-400">Restored Cache</div>
                                    <div className="text-3xl font-black text-green-400 group-hover:scale-105 transition-all">${stats.totalRecovered.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Sustainability Metrics */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Multi-Level Progress Gauge */}
                    <Card className="bg-zinc-950/40 border-white/5 rounded-[32px] overflow-hidden relative group p-8 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/10">
                                <Zap className="h-6 w-6 text-green-400" />
                            </div>
                            <Info className="h-4 w-4 text-zinc-600 cursor-help" />
                        </div>
                        <div>
                            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Earnings Cap Gauge</div>
                            <div className="text-5xl font-black text-white tracking-tight">{stats.sustainabilityCycle.currentCap}</div>
                        </div>
                        <div className="space-y-4">
                            <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats.sustainabilityCycle.capProgress}%` }}
                                    className="h-full bg-gradient-to-r from-green-600 via-green-400 to-emerald-300"
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                                <span>UTILIZATION: {stats.sustainabilityCycle.capProgress.toFixed(1)}%</span>
                                <span>LIMIT: {stats.sustainabilityCycle.currentCap}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Phase Engine */}
                    <Card className="bg-zinc-950/40 border-white/5 rounded-[32px] overflow-hidden relative group p-8 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10">
                                <TrendingUp className="h-6 w-6 text-blue-400" />
                            </div>
                            <RefreshCcw className="h-4 w-4 text-zinc-600 animate-spin-slow" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Protocol Phase</div>
                                <div className="text-5xl font-black text-white tracking-tight">{stats.currentPhase.name.replace('Phase ', '0')}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-blue-400 leading-none">{(stats.dailyRate * 100).toFixed(2)}%</div>
                                <div className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">Daily_Yield</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <Users className="h-4 w-4 text-zinc-500" />
                            <div className="flex-1 flex justify-between items-center text-[10px] font-mono">
                                <span className="text-zinc-500">SYNC_COUNT</span>
                                <span className="text-white font-bold">{stats.sustainabilityCycle.userCount.toLocaleString('en-US')} / {stats.sustainabilityCycle.threshold.toLocaleString('en-US')}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Advantage Matrix */}
                    <Card className="bg-zinc-950/40 border-white/5 rounded-[32px] overflow-hidden relative group p-8 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                                    <Award className="h-6 w-6 text-emerald-400" />
                                </div>
                                <h4 className="font-display font-black text-white uppercase tracking-tight">Active Boost</h4>
                            </div>
                            <div className="text-6xl font-black text-white">{stats.boostMultiplier}X</div>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-mono border border-emerald-500/10">CAP_LOCK_{stats.sustainabilityCycle.currentCap}</span>
                                <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-[9px] font-mono border border-green-500/10">{stats.boostTierName}</span>
                            </div>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-600 mt-8 border-t border-white/5 pt-4">
                            REFERRAL_VOLUME: ${stats.referralVolume.toLocaleString('en-US')}
                        </div>
                    </Card>
                </section>

                {/* Tactical Footer */}
                <section className="grid lg:grid-cols-2 gap-12 items-start">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-1 bg-green-500 rounded-full" />
                            <h3 className="text-2xl font-black text-white uppercase">Operational <span className="text-green-500 font-normal">Manifesto</span></h3>
                        </div>
                        <div className="grid gap-3">
                            {advantages.map((adv, i) => (
                                <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-green-500/[0.03] hover:border-green-500/10 transition-all group cursor-defualt">
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-xs font-black text-zinc-500 group-hover:border-green-500/30 group-hover:text-green-500 transition-all">
                                        0{i + 1}
                                    </div>
                                    <span className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors">{adv}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/[0.08] to-emerald-500/[0.02] border border-green-500/20 rounded-[40px] p-10 relative overflow-hidden">
                        <Shield className="absolute -bottom-10 -right-10 h-64 w-64 text-green-500/[0.03] rotate-12" />

                        <div className="relative z-10 space-y-8">
                            <div>
                                <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">Integrity Sync</h4>
                                <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                                    A total of 80% of daily distritbutions go directly to your liquid recovery wallet. The remaining 20% fuels the decentralized Lucky Draw engine.
                                </p>
                            </div>

                            <div className="flex items-end justify-between border-t border-green-500/10 pt-8">
                                <div>
                                    <div className="text-[10px] font-mono text-green-500/60 uppercase tracking-widest mb-1">Estimated Sync Time</div>
                                    <div className="text-4xl font-black text-white">{daysToRecover} <span className="text-sm font-normal text-zinc-500 uppercase">Days</span></div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Daily Inflow</div>
                                    <div className="text-2xl font-black text-green-400">${dailyCashback.toFixed(2)}</div>
                                </div>
                            </div>


                            {stats.sustainabilityCycle.requiresRedeposit ? (
                                <Button
                                    onClick={async () => {
                                        // Redeposit Logic
                                        try {
                                            if (!address) return;
                                            // Ideally open DepositModal with forced 100 USDT, or Call redeposit API directly if balance exists
                                            // For now, simpler alert to use main deposit
                                            alert("Please deposit 100 USDT to reset your Sustainability Cycle.");
                                            // In full implementation: Trigger Deposit Contract -> Wait for Tx -> Call /api/cashback/redeposit
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }}
                                    className="w-full h-16 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl animate-pulse"
                                >
                                    ⚠️ Cycle Cap Reached - Re-Deposit 100 USDT
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSync}
                                    disabled={isSyncing || tickingCashback <= 0}
                                    className={cn(
                                        "w-full h-16 transition-all duration-500 font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl",
                                        isSyncing ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" :
                                            tickingCashback > 0 ? "bg-green-500 hover:bg-green-400 text-black shadow-green-500/10" :
                                                "bg-zinc-900 text-zinc-600 border border-white/5 cursor-not-allowed"
                                    )}
                                >
                                    {isSyncing ? (
                                        <div className="flex items-center gap-3">
                                            <RefreshCcw className="h-4 w-4 animate-spin" />
                                            SYNCING_LIQUIDITY...
                                        </div>
                                    ) : (
                                        `Claim Liquidity Sync ($${tickingCashback.toFixed(2)})`
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
