"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    ArrowLeft, Trophy, Users, Coins, Shield, Gift, Ticket,
    Crown, ChevronRight, Lock, Unlock, TrendingUp, Zap,
    AlertCircle, Award, BarChart3, Activity, Layers, Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useReadContract } from "wagmi";
import { TRKGameABI } from "@/config/abis";
import { GAME_CONTRACT_ADDRESS } from "@/config/contracts";
import { formatUnits } from "viem";
import { toast } from "sonner";
import { WithdrawalModal } from "@/components/cash/WithdrawalModal";

// Visual accents for the cybernetic theme
const GlowBackground = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full" />
    </div>
);

export default function IncomePage() {
    const { address, user, isConnected, realBalances, withdraw, unclaimedRounds, claimLiquiditySync } = useWallet();
    const { data: levelBreakdown } = useReadContract({
        address: GAME_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRKGameABI,
        functionName: 'getLevelIncomeBreakdown',
        args: [address as `0x${string}`],
        query: { enabled: !!address }
    });
    const [expandedStream, setExpandedStream] = useState<number | null>(1);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [preSelectedWallet, setPreSelectedWallet] = useState<string | null>(null);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    useEffect(() => {
        setIsLoaded(true);
    }, []);

    // Format blockchain data or fallback to context user/mock
    const incomeData = useMemo(() => {
        return {
            gamingBalance: realBalances.game || 0,
            withdrawableBalance: realBalances.cash || 0,
            winnersIncome: realBalances.winners || 0,
            directIncome: realBalances.directLevel || 0,
            cashbackIncome: realBalances.cashback || 0,
            totalPending: (realBalances.directLevel || 0) + (realBalances.winners || 0),
            totalUnified: realBalances.totalUnified || 0,
            directReferrals: user?.directReferrals || 0,
            unlockedLevels: user?.activation?.allStreamsUnlocked ? 15 : Math.min(user?.directReferrals || 0, 15),
            isActivated: user?.activation?.tier !== 'none',
            levelStats: levelBreakdown ? {
                direct: (levelBreakdown as any)[0].map((v: bigint) => Number(formatUnits(v, 18))),
                winner: (levelBreakdown as any)[1].map((v: bigint) => Number(formatUnits(v, 18)))
            } : null
        };
    }, [realBalances, user, levelBreakdown]);

    const handleWithdraw = (walletType: string = 'cash') => {
        setPreSelectedWallet(walletType);
        setIsWithdrawOpen(true);
    };

    const activeIncomeStreams = [
        {
            id: 1,
            name: "Winners 8X Protocol",
            icon: Trophy,
            color: "primary", // maps to primary/yellow
            description: "Advanced game reward system with 8X capital growth",
            earned: incomeData.winnersIncome,
            details: [
                { label: "Cash Output", value: "2X", subtext: "Direct to Wallet" },
                { label: "Growth Asset", value: "6X", subtext: "Auto-Reinvested" },
            ],
            requirement: "Strategic victory in active rounds",
            badge: "CORE_YIELD"
        },
        {
            id: 2,
            name: "Direct Network Commission",
            icon: Users,
            color: "blue",
            description: "High-velocity team growth incentives across 15 levels",
            earned: incomeData.directIncome,
            rates: [
                { levels: "Tier 1", rate: "5.0%" },
                { levels: "Tier 2", rate: "2.0%" },
                { levels: "Tier 3-5", rate: "1.0%" },
                { levels: "Tier 6-15", rate: "0.5%" },
            ],
            requirement: "Valid Direct Link Activation",
            badge: "NETWORK_NODE"
        },
        {
            id: 3,
            name: "Team Profit Share",
            icon: Award,
            color: "green",
            description: "Deep-level referral rewards from team-wide victories",
            earned: 0, // Placeholder
            rates: [
                { levels: "L1-L2", rate: "Hybrid" },
                { levels: "L3-L15", rate: "Fractional" },
            ],
            totalPool: "15% TOTAL",
            requirement: "Active team participation required",
            badge: "ELITE_OVERRIDE"
        }
    ];

    const passiveStreams = [
        { id: 4, name: "Loss Mitigation", icon: Shield, desc: "1% Loss recovery protocol", link: "/dashboard/cashback", status: "ACTIVE", earned: incomeData.cashbackIncome },
        { id: 5, name: "Lucky Node", icon: Ticket, desc: "Randomized jackpot cycles", link: "/dashboard/lucky-draw", status: "READY" },
        { id: 6, name: "Grand Club", icon: Crown, desc: "Global volume allocation", link: "/dashboard/club", status: "RANK_REQD" },
        { id: 7, name: "Practice Yield", icon: Gift, desc: "Infinite level referral node", link: "/dashboard/referral", status: "ALWAYS_ON" }
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

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
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 leading-none">Yield_Control_v4.2</span>
                            </div>
                            <h1 className="text-2xl font-display font-black text-white tracking-tight">Income Portfolio</h1>
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
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{address ? `${address.slice(0, 8)}...${address.slice(-8)}` : "NOT_CONNECTED"}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-12 space-y-12 relative z-10">
                {/* Executive Performance Overview */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 gap-6"
                >
                    <motion.div variants={item}>
                        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent rounded-[2rem] overflow-hidden group hover:border-emerald-500/40 transition-all duration-500 relative">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
                            <CardContent className="p-10 flex flex-col md:flex-row items-center justify-between gap-10">
                                <div className="space-y-4 text-center md:text-left">
                                    <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                            <Zap className="h-8 w-8" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Unified_Vault_Access</div>
                                            <h3 className="text-xl font-bold text-white tracking-tight">Prime Ecosystem Balance</h3>
                                        </div>
                                    </div>

                                    <div className="text-6xl font-mono font-black text-white tracking-tighter shadow-emerald-500/20 drop-shadow-lg">
                                        {incomeData.totalUnified.toFixed(2)} <span className="text-2xl text-emerald-400">USDT</span>
                                    </div>
                                    <div className="text-sm font-medium text-white/40 max-w-md leading-relaxed">
                                        Aggregated liquidity from Gaming, Network Commission, Winners Protocol, and Cashback reserves.
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4 w-full md:w-auto min-w-[200px]">
                                    <Link href="/dashboard/deposit" className="w-full">
                                        <Button
                                            className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black border border-emerald-500/20 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95"
                                        >
                                            INJECT_LIQUIDITY
                                        </Button>
                                    </Link>
                                    <Button
                                        onClick={() => handleWithdraw()}
                                        disabled={isWithdrawing || incomeData.withdrawableBalance < 5}
                                        className="w-full h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                                    >
                                        {isWithdrawing ? "SYNCING..." : "EXTRACT_FUNDS"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Status Bar */}
                {!incomeData.isActivated && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-1 rounded-3xl bg-gradient-to-r from-yellow-500/20 via-primary/20 to-yellow-500/20 border border-yellow-500/10"
                    >
                        <div className="bg-black/40 backdrop-blur-xl rounded-[1.4rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-6 text-center md:text-left">
                                <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                    <AlertCircle className="h-8 w-8 text-yellow-500" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white mb-1 tracking-tight">System_Activation_Required</h4>
                                    <p className="text-sm text-white/40 max-w-md">Deposit a minimum of 10 USDT to activate your yield node and unlock deep network multi-level commissions.</p>
                                </div>
                            </div>
                            <Link href="/dashboard/activation" className="w-full md:w-auto">
                                <Button size="lg" className="bg-yellow-500 hover:bg-yellow-400 text-black font-black w-full px-12 h-14 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95">
                                    ACTIVATE_CORE
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* Primary Intelligence Grid */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-1 flex bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.8)]" />
                        <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase tracking-wider">Active Stream Control</h2>
                    </div>

                    <div className="grid gap-6">
                        {activeIncomeStreams.map((stream, idx) => (
                            <motion.div
                                key={stream.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + idx * 0.1 }}
                            >
                                <Card
                                    className={cn(
                                        "rounded-[2.5rem] border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500 cursor-pointer group relative overflow-hidden",
                                        expandedStream === stream.id && "border-primary/20 bg-primary/[0.02]"
                                    )}
                                    onClick={() => setExpandedStream(expandedStream === stream.id ? null : stream.id)}
                                >
                                    <CardContent className="p-8">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                            <div className="flex items-center gap-8">
                                                <div className={cn(
                                                    "h-20 w-20 rounded-[1.8rem] flex items-center justify-center relative",
                                                    stream.color === 'primary' ? 'bg-primary/10 text-primary border border-primary/20' :
                                                        stream.color === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                            'bg-green-500/10 text-green-400 border border-green-500/20'
                                                )}>
                                                    <stream.icon className="h-10 w-10 relative z-10" />
                                                    <div className="absolute inset-0 rounded-[1.8rem] bg-current opacity-5 blur-xl group-hover:opacity-20 transition-opacity" />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-2xl font-black text-white tracking-tight">{stream.name}</h3>
                                                        <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black text-white/40 uppercase tracking-widest">{stream.badge}</span>
                                                    </div>
                                                    <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">{stream.description}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-12">
                                                <div className="text-right">
                                                    <div className="text-[10px] font-black uppercase text-white/20 mb-1 tracking-widest">Aggregated_Yield</div>
                                                    <div className={cn(
                                                        "text-3xl font-mono font-black",
                                                        stream.color === 'primary' ? 'text-primary' : stream.color === 'blue' ? 'text-blue-400' : 'text-green-400'
                                                    )}>
                                                        ${stream.earned.toFixed(2)}
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleWithdraw(stream.id === 1 ? 'winners' : stream.id === 2 ? 'directLevel' : 'club');
                                                        }}
                                                        className="mt-2 h-7 px-3 bg-white/10 hover:bg-white text-white hover:text-black font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                                                    >
                                                        EXTRACT
                                                    </Button>
                                                </div>
                                                <div className={cn(
                                                    "p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 group-hover:text-white transition-all",
                                                    expandedStream === stream.id && "rotate-90 text-primary border-primary/20 bg-primary/10"
                                                )}>
                                                    <ChevronRight className="h-6 w-6" />
                                                </div>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {expandedStream === stream.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-10 pt-10 border-t border-white/5 space-y-8">
                                                        {stream.details && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                {stream.details.map((detail, j) => (
                                                                    <div key={j} className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 relative group/detail">
                                                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                                                            <Activity className="h-8 w-8 text-primary" />
                                                                        </div>
                                                                        <div className="text-4xl font-mono font-black text-white mb-2 tracking-tighter">{detail.value}</div>
                                                                        <div className="text-lg font-black text-white/80">{detail.label}</div>
                                                                        <div className="text-xs font-mono text-primary uppercase tracking-widest mt-1">{detail.subtext}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {stream.rates && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                {stream.rates.map((rate, j) => (
                                                                    <div key={j} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between group/rate hover:bg-white/[0.05] transition-colors">
                                                                        <span className="text-xs font-black text-white/40 uppercase tracking-tighter">{rate.levels}</span>
                                                                        <span className={cn(
                                                                            "text-lg font-mono font-black",
                                                                            stream.color === 'blue' ? "text-blue-400" : "text-green-400"
                                                                        )}>{rate.rate}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {stream.id === 2 && incomeData.levelStats && (incomeData.levelStats as any).direct && (
                                                            <div className="space-y-4">
                                                                <div className="text-xs font-black text-white/20 uppercase tracking-widest mb-4">Live_Network_Earnings_By_Level</div>
                                                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                                                    {(incomeData.levelStats as any).direct.map((val: number, i: number) => (
                                                                        <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                                                            <div className="text-[8px] font-mono text-white/20 uppercase mb-1">LVL_{i + 1}</div>
                                                                            <div className="text-sm font-mono font-black text-blue-400">${val.toFixed(2)}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[2rem] bg-black/40 border border-white/5 shadow-inner">
                                                            <div className="flex items-center gap-6">
                                                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                                                    <Unlock className="h-6 w-6 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-black uppercase text-white/30 mb-0.5 tracking-widest">Protocol_Release_Condition</div>
                                                                    <div className="text-sm font-bold text-white/80">{stream.requirement}</div>
                                                                </div>
                                                            </div>
                                                            <Button className="w-full md:w-auto px-10 h-12 bg-white text-black font-black rounded-xl hover:bg-primary transition-colors uppercase tracking-widest text-xs">
                                                                Access_Ledger
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Satellite Passive Nodes */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-1 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                        <h2 className="text-2xl font-display font-black text-white tracking-tight uppercase tracking-wider">Secondary Yield Nodes</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {passiveStreams.map((stream, idx) => (
                            <motion.div
                                key={stream.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 + idx * 0.1 }}
                            >
                                <Link href={stream.link}>
                                    <Card className="h-full border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-primary/20 rounded-[2rem] transition-all duration-500 cursor-pointer group p-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                                            <stream.icon className="h-16 w-16 text-primary" />
                                        </div>

                                        <div className="flex items-center justify-between mb-8">
                                            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/40 group-hover:text-primary group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                                                <stream.icon className="h-6 w-6" />
                                            </div>
                                            <span className="text-[8px] font-mono p-1 px-2 rounded-md bg-white/5 border border-white/10 text-white/20 group-hover:text-primary/60 group-hover:border-primary/10 transition-all">{stream.status}</span>
                                        </div>

                                        <h3 className="text-xl font-black text-white mb-2 leading-none">{stream.name}</h3>
                                        {stream.earned !== undefined && stream.earned > 0 && (
                                            <div className="text-sm font-mono text-green-500 mb-1 font-bold">+${stream.earned.toFixed(2)} Realized</div>
                                        )}
                                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">{stream.desc}</p>

                                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Initialize</span>
                                            <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </Card>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Final Ecosystem Manifest */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <Card className="rounded-[3rem] border-primary/20 bg-gradient-to-r from-primary/10 via-transparent to-transparent overflow-hidden relative">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
                        <CardContent className="p-10">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="h-24 w-24 rounded-[2rem] bg-primary flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary),0.3)] shrink-0">
                                    <Zap className="h-12 w-12 text-black fill-current" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-3xl font-display font-black text-white mb-2 tracking-tight">TRK Hyper-Yield Architecture</h3>
                                    <p className="text-white/40 max-w-xl text-lg font-medium leading-relaxed">
                                        Your portfolio is dynamic. As the ecosystem expands, your node positions grow automatically across 7 sovereign income streams.
                                    </p>
                                </div>
                                <div className="text-center md:text-right shrink-0">
                                    <div className="text-[10px] font-black uppercase text-white/30 mb-2 tracking-[0.3em]">Combined_Net_Earning</div>
                                    <div className="text-5xl font-mono font-black text-primary tracking-tighter">
                                        ${(incomeData.gamingBalance + incomeData.withdrawableBalance + incomeData.totalPending).toFixed(2)}
                                    </div>
                                    <div className="mt-2 text-[10px] font-mono text-green-500 uppercase font-black">+12.4% AP_24H</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </main>

            {/* Custom Background Grid */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.02)_1px,transparent_0)] bg-[size:40px_40px]" />

            <WithdrawalModal
                isOpen={isWithdrawOpen}
                onClose={() => setIsWithdrawOpen(false)}
                preSelectedWallet={preSelectedWallet}
            />
        </div>
    );
}
