"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    ArrowLeft, Trophy, Users, Coins, Shield, Gift, Ticket,
    Crown, ChevronRight, Lock, Unlock, TrendingUp, Zap,
    AlertCircle, Award, BarChart3, Activity, Layers, Target,
    Gamepad2, RefreshCcw, History, Globe, Network, Cpu, Database,
    PieChart, Wallet, Sparkles, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { WithdrawalModal } from "@/components/cash/WithdrawalModal";
import { IncomeSummaryCards } from "@/components/dashboard/IncomeSummaryCards";
import { apiRequest } from "@/lib/api";

// Visual accents for the cybernetic theme
const GlowBackground = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full" />
    </div>
);

export default function IncomePage() {
    const { address, user, isConnected, realBalances, unclaimedRounds, claimLiquiditySync } = useWallet();
    const [isLoaded, setIsLoaded] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [preSelectedWallet, setPreSelectedWallet] = useState<string | null>(null);
    const [gameHistory, setGameHistory] = useState<any[]>([]);
    const [cashbackStatus, setCashbackStatus] = useState<any>(null);
    const [jackpotHistory, setJackpotHistory] = useState<any[]>([]);
    const [clubStatus, setClubStatus] = useState<any>(null);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        setIsLoaded(true);
        fetchGameHistory();
        fetchCashbackStatus();
        fetchJackpotHistory();
        fetchClubStatus();
    }, [address]);

    const fetchGameHistory = async () => {
        if (!address) return;
        try {
            setLoadingHistory(true);
            const res = await apiRequest('/game/history?limit=10');
            if (res.status === 'success') {
                setGameHistory(res.data.games || []);
            }
        } catch (err) {
            console.error('Failed to fetch game history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchCashbackStatus = async () => {
        if (!address) return;
        try {
            const res = await apiRequest('/cashback/status');
            if (res.status === 'success') {
                setCashbackStatus(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch cashback status:', err);
        }
    };

    const fetchJackpotHistory = async () => {
        if (!address) return;
        try {
            const res = await apiRequest('/lucky-draw/my-tickets');
            if (res.status === 'success') {
                setJackpotHistory(res.data.pastDraws || []);
            }
        } catch (err) {
            console.error('Failed to fetch jackpot history:', err);
        }
    };

    const fetchClubStatus = async () => {
        if (!address) return;
        try {
            const res = await apiRequest('/club/status');
            if (res.status === 'success') {
                setClubStatus(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch club status:', err);
        }
    };

    const summaryStats = useMemo(() => {
        return {
            totalEarnings: realBalances.grandTotal || 0,
            todayEarnings: (realBalances.cashbackROI / 30) + (realBalances.game / 50) + 0.85,
            gameProfit: realBalances.winners || 0,
            cashbackEarned: realBalances.cashbackROI || 0,
            teamIncome: realBalances.directLevel || 0,
            jackpotWins: realBalances.luckyDrawWallet || 0
        };
    }, [realBalances]);

    return (
        <div className="min-h-screen bg-transparent relative selection:bg-primary/30">
            <GlowBackground />

            {/* Cyber Header */}
            <header className="sticky top-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-3xl">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard">
                            <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 group">
                                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <div className="h-10 w-px bg-white/10 mx-2" />
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <Activity className="h-4 w-4 text-primary animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 leading-none">Income_Nexus_v2.0</span>
                            </div>
                            <h1 className="text-2xl font-display font-black text-white tracking-tight italic uppercase">Earnings Control Hub</h1>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        {unclaimedRounds.length > 0 && (
                            <Button
                                onClick={claimLiquiditySync}
                                className="h-10 px-6 bg-primary text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-primary/80 shadow-[0_0_20px_rgba(var(--primary),0.3)] animate-pulse"
                            >
                                <Zap className="h-3 w-3 mr-2 fill-current" />
                                Sync_{unclaimedRounds.length}_Assets
                            </Button>
                        )}
                        <div className="px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none">
                                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "OFFLINE"}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 space-y-20 relative z-10">

                {/* 1. TOTAL INCOME SUMMARY */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] flex items-center gap-2">
                                <Database className="h-3 w-3" /> TOTAL_INCOME_SUMMARY
                            </h2>
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Real-time consolidated yield matrix</p>
                        </div>
                    </div>
                    <IncomeSummaryCards stats={summaryStats} />
                </section>

                {/* 2. GAME INCOME */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] flex items-center gap-2">
                                    <Gamepad2 className="h-3 w-3" /> GAME_INCOME_LOGS
                                </h2>
                                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Recent victory payouts & compounding status</p>
                            </div>
                        </div>

                        <Card className="bg-white/[0.01] border-white/5 rounded-[2rem] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">Round_ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest">Entry</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-center">Result</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-widest text-right">Income</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loadingHistory ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-white/20 font-mono text-xs animate-pulse lowercase tracking-widest italic">Syncing_Round_History...</td>
                                            </tr>
                                        ) : gameHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-white/20 font-mono text-xs">NO_RECENT_ROUNDS_DETECTED</td>
                                            </tr>
                                        ) : gameHistory.map((game, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-mono text-white/40">#{game._id?.slice(-6).toUpperCase() || "N/A"}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-mono font-bold text-white/60">{game.betAmount || 0} USDT</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={cn(
                                                        "px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest",
                                                        game.isWin ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                                    )}>
                                                        {game.isWin ? "🏆 WIN" : "❌ LOSS"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className={cn("text-sm font-mono font-black", game.isWin ? "text-emerald-400" : "text-white/20")}>
                                                            {game.isWin ? `+${(game.payout || 0).toFixed(2)}` : "0.00"}
                                                        </span>
                                                        {game.isWin && <span className="text-[8px] font-bold text-white/20 uppercase tracking-tight">Wallet_1_Target</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] flex items-center gap-2">
                                <Cpu className="h-3 w-3" /> PROTOCOL_LOGIC
                            </h2>
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Earnings distribution rules</p>
                        </div>
                        <Card className="bg-primary/5 border-primary/20 rounded-[2rem] p-8 space-y-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUp className="h-32 w-32 text-primary" />
                            </div>
                            <Award className="h-10 w-10 text-primary mb-2" />
                            <div className="space-y-4">
                                <h3 className="text-xl font-black text-white italic uppercase tracking-tight leading-none">8X Victory Split</h3>
                                <p className="text-sm text-white/50 leading-relaxed">
                                    "System automatically splits winnings: <span className="text-white font-bold underline">2X to Withdrawable</span> and <span className="text-primary font-bold underline">6X to Game Fuel</span>."
                                </p>
                            </div>
                            <div className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-white/30">Immediate_Liquidity</span>
                                        <span className="text-emerald-400">25% (2X)</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full w-[25%] bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                        <span className="text-white/30">Protocol_Compounding</span>
                                        <span className="text-primary">75% (6X)</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full w-[75%] bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </section>

                {/* 3. CASHBACK / ROI */}
                <section className="space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] flex items-center gap-2">
                            <RefreshCcw className="h-3 w-3" /> CASHBACK_RECOVERY_PROTOCOL
                        </h2>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Automated yield for detected account losses</p>
                    </div>

                    <Card className="bg-white/[0.01] border-white/5 rounded-[2.5rem] overflow-hidden p-10 relative group">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 pointer-events-none">
                            <Shield className="h-64 w-64 text-emerald-500 -rotate-12" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 relative z-10">
                            <div className="lg:col-span-3 space-y-12">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                                    <div className="space-y-3">
                                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Net_Loss_Base</div>
                                        <div className="text-4xl font-mono font-black text-rose-500/80">${(cashbackStatus?.totalLosses || 0).toFixed(2)}</div>
                                        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[8px] font-bold text-rose-400 tracking-wider uppercase italic">
                                            Protection_Active
                                        </div>
                                    </div>
                                    <div className="space-y-3 border-white/5 md:border-l md:pl-12">
                                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Yield_Execution_Rate</div>
                                        <div className="text-4xl font-mono font-black text-white italic">{cashbackStatus?.currentPhase?.dailyRate || "0.50%"}</div>
                                        <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{cashbackStatus?.currentPhase?.name || "PHASE_1"}</div>
                                    </div>
                                    <div className="space-y-3 border-white/5 md:border-l md:pl-12">
                                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Liquid_Recovery</div>
                                        <div className="text-4xl font-mono font-black text-emerald-400">${(cashbackStatus?.recovery?.totalRecovered || 0).toFixed(2)}</div>
                                        <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest italic animate-pulse">Syncing_RealTime...</div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-white lowercase tracking-widest italic opacity-50 uppercase">Sustainability Cycle Threshold</div>
                                            <div className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                                {cashbackStatus?.sustainabilityCycle?.currentCap || "400%"} <span className="text-primary text-sm font-black tracking-normal underline underline-offset-4 decoration-primary/30 ml-2">Protocol Cap</span>
                                            </div>
                                        </div>
                                        <div className="text-right space-y-1 group">
                                            <div className="text-2xl font-mono font-black text-primary group-hover:drop-shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all">{cashbackStatus?.recovery?.progress || 0}%</div>
                                            <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Compounding_Limit</div>
                                        </div>
                                    </div>
                                    <div className="h-6 w-full bg-white/[0.03] rounded-2xl border border-white/5 p-1.5 shadow-inner">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary via-emerald-400 to-primary rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.2)] transition-all duration-1000 relative overflow-hidden"
                                            style={{ width: `${cashbackStatus?.recovery?.progress || 0}%` }}
                                        >
                                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                                            <div className="absolute top-0 bottom-0 right-0 w-20 bg-gradient-to-r from-transparent to-white/20 animate-shimmer" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-10 flex flex-col justify-between space-y-10 shadow-2xl relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/20 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-1000" />
                                <div className="space-y-6 relative z-10">
                                    <div className="h-14 w-14 rounded-[1.25rem] bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_8px_16px_-4px_rgba(var(--primary),0.3)]">
                                        <Zap className="h-7 w-7 text-primary animate-pulse" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] leading-none mb-1">Yield_Today</div>
                                        <div className="text-4xl font-mono font-black text-white drop-shadow-sm">+${(cashbackStatus?.cashback?.boostedDailyCashback || 0).toFixed(2)}</div>
                                    </div>
                                </div>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest italic lowercase tracking-tight">Auto_Distribution_Active</span>
                                    </div>
                                    <Button className="w-full h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all">
                                        Full_Cycle_Report
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>

                {/* 4. REFERRAL & TEAM INCOME */}
                <section className="space-y-8">
                    <div className="space-y-1">
                        <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] flex items-center gap-2">
                            <Users className="h-3 w-3" /> TEAM_REVENUE_MATRIX
                        </h2>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Multi-level commissions & performance overrides</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                        {/* Commission Table */}
                        <Card className="bg-white/[0.01] border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                            <CardHeader className="p-10 border-b border-white/5 bg-white/[0.01]">
                                <CardTitle className="text-xl font-black text-white flex items-center gap-4 italic uppercase">
                                    <Network className="h-6 w-6 text-blue-500" />
                                    Active_Network_Yields
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-white/[0.01] border-b border-white/5">
                                            <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Stream_ID</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] text-center">Depth_Policy</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] text-right">Aggregated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[
                                            { type: "Direct Referrals", rate: "15_LEVELS", total: realBalances.directLevel, color: "text-blue-400", icon: Users },
                                            { type: "Winner Override", rate: "POI_15%", total: realBalances.winners, color: "text-emerald-400", icon: Trophy },
                                            { type: "Compounding Yield", rate: "1%_FLAT", total: realBalances.cashbackROI / 4, color: "text-purple-400", icon: TrendingUp }
                                        ].map((row, i) => (
                                            <tr key={i} className="hover:bg-white/[0.03] transition-all group">
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("h-10 w-10 rounded-xl bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover:border-white/20 transition-all", row.color)}>
                                                            <row.icon className="h-5 w-5" />
                                                        </div>
                                                        <span className="text-base font-bold text-white/80 group-hover:text-white transition-colors uppercase tracking-tight italic">{row.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 text-center">
                                                    <span className="inline-block px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[9px] font-black text-white/30 tracking-widest">{row.rate}</span>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-2xl font-mono font-black text-white tracking-tighter">${(row.total || 0).toFixed(2)}</span>
                                                        <span className={cn("text-[8px] font-black uppercase tracking-widest mt-1 opacity-50", row.color)}>Yield_Stable</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* Network Highlights */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <Card className="bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/10 rounded-[2.5rem] p-10 flex flex-col justify-between relative overflow-hidden group shadow-xl">
                                <Globe className="absolute -bottom-10 -right-10 h-48 w-48 text-blue-500/[0.03] group-hover:scale-125 group-hover:rotate-12 transition-all duration-1000" />
                                <div className="space-y-6 relative z-10">
                                    <div className="h-16 w-16 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg">
                                        <Users className="h-8 w-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-blue-400/50 uppercase tracking-[0.3em] leading-none">Active_Team_Size</div>
                                        <div className="text-5xl font-mono font-black text-white tracking-tighter italic">{user?.directReferrals || 0}</div>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-blue-500/5 flex items-center justify-between relative z-10">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Growth_Dynamics</span>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tight">Expanding</span>
                                    </div>
                                </div>
                            </Card>

                            <Card className="bg-gradient-to-br from-indigo-600/10 to-transparent border-indigo-500/10 rounded-[2.5rem] p-10 flex flex-col justify-between relative overflow-hidden group shadow-xl">
                                <Target className="absolute -bottom-10 -right-10 h-48 w-48 text-indigo-500/[0.03] group-hover:scale-125 group-hover:-rotate-12 transition-all duration-1000" />
                                <div className="space-y-6 relative z-10">
                                    <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-lg">
                                        <Target className="h-8 w-8" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black text-indigo-400/50 uppercase tracking-[0.3em] leading-none">Global_Override</div>
                                        <div className="text-5xl font-mono font-black text-white tracking-tighter italic">15%</div>
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-indigo-500/5 flex items-center justify-between relative z-10">
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Policy_Unlocked</span>
                                    <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* 5. ELITE CLUB & 6. JACKPOT */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Section 5: Elite Club */}
                    <section className="space-y-8">
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] flex items-center gap-2">
                                <Crown className="h-3 w-3" /> ELITE_CLUB_GOVERNANCE
                            </h2>
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Global pool participation & rank-based yields</p>
                        </div>

                        {user?.clubRank && user.clubRank !== "Elite None" && user.clubRank !== "Rank 0" ? (
                            <Card className="h-full bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 rounded-[2.5rem] p-12 relative overflow-hidden group shadow-2xl">
                                <div className="absolute -top-10 -right-10 h-64 w-64 bg-amber-500/10 blur-[80px] rounded-full group-hover:scale-110 transition-transform duration-1000" />
                                <div className="space-y-8 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="h-20 w-20 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shadow-[0_12px_24px_-8px_rgba(245,158,11,0.4)]">
                                            <Crown className="h-10 w-10 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Active_Rank</div>
                                            <div className="text-2xl font-black text-white italic uppercase tracking-tighter">{clubStatus?.currentRank?.name || user.clubRank}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">Club Payout Status</h3>
                                        <div className="grid grid-cols-2 gap-6 pt-4">
                                            <div className="space-y-1 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Pool_Share</div>
                                                <div className="text-2xl font-mono font-black text-amber-400">{clubStatus?.currentRank?.share ? `${(clubStatus.currentRank.share * 100).toFixed(2)}%` : "1.25%"}</div>
                                            </div>
                                            <div className="space-y-1 p-5 rounded-2xl bg-white/[0.03] border border-white/5">
                                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Total_Claimed</div>
                                                <div className="text-2xl font-mono font-black text-white">${(clubStatus?.earnings?.totalReceived || realBalances.club || 0).toFixed(2)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <Link href="/dashboard/club">
                                        <Button className="w-full h-14 bg-amber-500 text-black font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all">
                                            Go_To_Elite_Dashboard
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ) : (
                            <Card className="h-full bg-white/[0.01] border-white/5 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center space-y-8 group shadow-xl">
                                <div className="h-24 w-24 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-white/[0.05] transition-all duration-500 relative">
                                    <Lock className="h-10 w-10 text-white/10 group-hover:text-amber-500/40 group-hover:scale-110 transition-all duration-700" />
                                    <div className="absolute inset-0 border-2 border-dashed border-white/5 rounded-full animate-spin-slow opacity-20" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-white/50 uppercase italic tracking-tighter">Club Entry Restricted</h3>
                                    <p className="text-xs text-white/20 font-bold uppercase tracking-widest max-w-[240px] leading-relaxed">Increase network volume to unlock the Elite Global Pool</p>
                                </div>
                                <Link href="/dashboard/club">
                                    <Button className="h-12 px-8 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-500/20 transition-all">
                                        View_Qualifications
                                    </Button>
                                </Link>
                            </Card>
                        )}
                    </section>

                    {/* Section 6: Jackpot */}
                    <section className="space-y-8">
                        <div className="space-y-1">
                            <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] flex items-center gap-2">
                                <Ticket className="h-3 w-3" /> JACKPOT_EARNING_CENTURY
                            </h2>
                            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Recent lucky draw wins & entry history</p>
                        </div>

                        <Card className="h-full bg-white/[0.01] border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
                            <CardHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between">
                                <CardTitle className="text-xl font-black text-white flex items-center gap-4 italic uppercase">
                                    <Sparkles className="h-6 w-6 text-amber-400" />
                                    Personal_Draw_Log
                                </CardTitle>
                                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]" />
                            </CardHeader>
                            <CardContent className="p-0 flex-grow">
                                <div className="overflow-x-auto h-[320px] scrollbar-hide">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-white/[0.01] border-b border-white/5">
                                                <th className="px-10 py-5 text-[9px] font-black text-white/20 uppercase tracking-widest">Draw_#</th>
                                                <th className="px-10 py-5 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">Tickets</th>
                                                <th className="px-10 py-5 text-[9px] font-black text-white/20 uppercase tracking-widest text-right">Income_USDT</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {jackpotHistory.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-10 py-24 text-center">
                                                        <div className="flex flex-col items-center gap-4 opacity-10">
                                                            <Ticket className="h-12 w-12" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.5em]">NO_RECORDED_WINS</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : jackpotHistory.map((draw, i) => (
                                                <tr key={i} className="hover:bg-white/[0.03] transition-all group">
                                                    <td className="px-10 py-6">
                                                        <span className="text-sm font-mono font-black text-white/60">RD_{draw.roundNumber}</span>
                                                    </td>
                                                    <td className="px-10 py-6 text-center">
                                                        <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-500">{draw.tickets}X</span>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <span className="text-lg font-mono font-black text-amber-400">+${(draw.won || 0).toFixed(2)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-10 border-t border-white/5 bg-white/[0.01]">
                                    <Link href="/dashboard/lucky-draw">
                                        <Button variant="outline" className="w-full h-12 border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 rounded-xl transition-all group">
                                            Manage_Tickets <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                </div>

                {/* 7. WALLET-WISE INCOME SPLIT */}
                <section className="space-y-8 pb-20">
                    <div className="space-y-1">
                        <h2 className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] flex items-center gap-2">
                            <Layers className="h-3 w-3" /> ASSET_DISTRIBUTION_CHART
                        </h2>
                        <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Internal ledger vs real-time liquid balances</p>
                    </div>

                    <Card className="bg-white/[0.01] border-white/5 rounded-[3rem] p-12 overflow-hidden relative group shadow-2xl">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Internal Ledger Split</h3>
                                    <p className="text-sm text-white/30 font-bold uppercase tracking-widest leading-relaxed">Consolidated yields across all 6 modular wallets</p>
                                </div>

                                <div className="space-y-6">
                                    {[
                                        { label: "Wallet 1: Main (Withdrawable)", value: realBalances.winners + realBalances.directLevel + realBalances.cash, color: "bg-emerald-400", share: 45 },
                                        { label: "Wallet 2: Game Fuel (6X Side)", value: realBalances.game, color: "bg-primary", share: 35 },
                                        { label: "Wallet 4: Cashback (Recovery)", value: realBalances.cashbackROI, color: "bg-purple-500", share: 15 },
                                        { label: "Wallet 5: Lucky Entry", value: realBalances.luckyDrawWallet, color: "bg-amber-500", share: 5 }
                                    ].map((wallet, i) => (
                                        <div key={i} className="space-y-3 group/item">
                                            <div className="flex justify-between items-end">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]", wallet.color)} />
                                                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest group-hover/item:text-white transition-colors">{wallet.label}</span>
                                                </div>
                                                <span className="text-sm font-mono font-black text-white">${(wallet.value || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${wallet.share}%` }}
                                                    transition={{ duration: 1, ease: "easeOut", delay: i * 0.1 }}
                                                    className={cn("h-full rounded-full transition-all group-hover/item:brightness-125", wallet.color)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center relative">
                                <div className="h-80 w-80 rounded-full border border-white/5 relative flex items-center justify-center p-8 bg-white/[0.01]">
                                    <div className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin-slow opacity-20" />
                                    <div className="absolute inset-4 rounded-full border-b-4 border-emerald-400 animate-spin-reverse opacity-10" />

                                    <div className="text-center space-y-2 z-10">
                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Total_Consolidated</div>
                                        <div className="text-5xl font-mono font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] tracking-tighter italic">
                                            ${(realBalances.totalUnified || 0).toFixed(2)}
                                        </div>
                                        <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] animate-pulse">Live_Sync_OK</div>
                                    </div>

                                    {/* Abstract background shapes */}
                                    <div className="absolute -top-10 -left-10 h-32 w-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none" />
                                    <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-emerald-400/10 blur-[60px] rounded-full pointer-events-none" />
                                </div>

                                <div className="mt-12 flex gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 w-3 rounded-full bg-primary" />
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Compounding</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-3 w-3 rounded-full bg-emerald-400" />
                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Withdrawable</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </section>
            </main>

            <WithdrawalModal
                isOpen={isWithdrawOpen}
                onClose={() => setIsWithdrawOpen(false)}
                preSelectedWallet={preSelectedWallet}
            />
        </div>
    );
}
