"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    ArrowLeft, Wallet, Lock, Unlock, CheckCircle2, XCircle,
    ArrowUpRight, Shield, Zap, Gift, TrendingUp, Coins,
    ChevronRight, AlertCircle, RefreshCcw, Cpu, Crown, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function ActivationPage() {
    const { address, user, deposit } = useWallet();
    const [depositAmount, setDepositAmount] = useState('');
    const [isDepositing, setIsDepositing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const activation = {
        tier: user?.activation?.tier || 'none',
        totalDeposited: user?.activation?.totalDeposited || 0,
        canWithdrawDirectLevel: user?.activation?.canWithdrawDirectLevel || false,
        canWithdrawWinners: user?.activation?.canWithdrawWinners || false,
        canTransferPractice: user?.activation?.canTransferPractice || false,
        canWithdrawAll: user?.activation?.canWithdrawAll || false,
        cashbackActive: user?.activation?.cashbackActive || false,
        allStreamsUnlocked: user?.activation?.allStreamsUnlocked || false,
    };

    const tier1Threshold = 10;
    const tier2Threshold = 100;
    const tier1Progress = Math.min((activation.totalDeposited / tier1Threshold) * 100, 100);
    const tier2Progress = Math.min((activation.totalDeposited / tier2Threshold) * 100, 100);

    const handleDeposit = async () => {
        const amount = parseFloat(depositAmount);
        if (!amount || amount <= 0) return;

        setIsDepositing(true);
        try {
            await deposit(amount);
            setDepositAmount('');
        } catch (error) {
            console.error("Deposit flow failed:", error);
        } finally {
            setIsDepositing(false);
        }
    };

    const quickDeposits = [10, 50, 100, 500];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#080808] flex items-center justify-center">
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex flex-col items-center gap-4"
                >
                    <Cpu className="h-12 w-12 text-primary" />
                    <span className="font-mono text-[10px] text-zinc-500 tracking-[0.3em] uppercase">Initializing_Elite_Protocol</span>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#080808] text-zinc-300 pb-20 selection:bg-primary/30">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-primary/5 blur-[150px] rounded-full" />
                <div className="absolute -bottom-[20%] -left-[10%] w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.05]" />
            </div>

            {/* Header */}
            <header className="border-b border-white/5 bg-black/60 backdrop-blur-2xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all group border border-white/5">
                            <ArrowLeft className="h-5 w-5 text-zinc-500 group-hover:text-white" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <Crown className="h-5 w-5 text-primary" />
                                <span className="font-display font-black text-xl tracking-tight uppercase">Elite <span className="text-white">Terminal</span></span>
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500 tracking-[0.3em] uppercase opacity-50">Activation_Node_v4.2</div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 space-y-12 relative">
                {/* Hero: Account Identity */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group lg:col-span-12"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-blue-500/10 rounded-[40px] blur-3xl opacity-50 pointer-events-none" />
                    <Card className="bg-zinc-900/40 border-white/5 rounded-[40px] overflow-hidden relative backdrop-blur-3xl shadow-2xl">
                        <div className="p-8 lg:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-mono font-black border transition-all duration-500 ${activation.tier === 'tier2' ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.2)]' :
                                        activation.tier === 'tier1' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                            'bg-white/5 text-zinc-500 border-white/10'
                                        }`}>
                                        {activation.tier.toUpperCase()}_STATUS_ACTIVE
                                    </div>
                                    <Activity className="h-4 w-4 text-zinc-700 animate-pulse" />
                                </div>
                                <h1 className="text-4xl lg:text-6xl font-display font-black tracking-tighter text-white uppercase italic leading-none">
                                    Reality <span className="text-primary font-normal">Integration</span>
                                </h1>
                                <p className="text-zinc-500 max-w-lg text-lg leading-relaxed font-medium">
                                    Unlock your participation in the TRK Real Cash economy. Cumulative deposits secure your tier permanency and expand withdrawal pipelines.
                                </p>
                            </div>

                            <div className="relative group/stats">
                                <div className="absolute inset-0 bg-primary/20 rounded-[32px] blur-2xl opacity-0 group-hover/stats:opacity-100 transition-opacity duration-700" />
                                <div className="p-8 lg:p-10 rounded-[32px] bg-black/60 border border-white/5 relative z-10 text-center min-w-[280px] hover:border-primary/30 transition-colors">
                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 border border-primary/10 group-hover/stats:scale-110 transition-transform">
                                        <Wallet className="h-8 w-8 text-primary shadow-primary" />
                                    </div>
                                    <div className="text-5xl font-black text-white tracking-tighter mb-2">${activation.totalDeposited.toLocaleString('en-US')}</div>
                                    <div className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Aggregated_Liquidity_Volume</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Tactical Deposit Module */}
                <section className="grid lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-1 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.8)]" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Liquidity <span className="text-primary font-normal">Injection</span></h3>
                        </div>

                        <Card className="bg-zinc-950/40 border-white/5 rounded-[32px] p-8 lg:p-10 relative group overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                            <div className="space-y-8 relative z-10">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="relative flex-1 group/input">
                                        <Input
                                            type="number"
                                            placeholder="ENTER_USDT_QUANTITY"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            className="h-16 bg-black/40 border-white/5 rounded-2xl px-6 text-xl font-bold focus:border-primary/50 transition-all text-white placeholder:text-zinc-800"
                                        />
                                        <Zap className="absolute right-6 top-5 h-6 w-6 text-zinc-800 group-hover/input:text-primary transition-colors" />
                                    </div>
                                    <Button
                                        onClick={handleDeposit}
                                        disabled={isDepositing || !depositAmount}
                                        className="h-16 px-12 bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-primary/10 transition-all active:scale-95"
                                    >
                                        {isDepositing ? 'PROCESSING_SYNC...' : 'INITIALIZE_DEPOSIT'}
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {quickDeposits.map((amount) => (
                                        <button
                                            key={amount}
                                            onClick={() => setDepositAmount(amount.toString())}
                                            className="h-14 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/20 transition-all text-sm font-bold flex items-center justify-center gap-2 group/btn"
                                        >
                                            <span className="text-zinc-500 group-hover:text-primary transition-colors">$</span>
                                            {amount}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        {/* Feature Grid: Locked vs Unlocked */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4">
                            {[
                                { name: 'Direct Level', unlocked: activation.canWithdrawDirectLevel, icon: Coins, tier: 'TIER_01' },
                                { name: 'Winners Pool', unlocked: activation.canWithdrawWinners, icon: TrendingUp, tier: 'TIER_01' },
                                { name: 'Practice Transfer', unlocked: activation.canTransferPractice, icon: RefreshCcw, tier: 'TIER_02' },
                                { name: 'Full Profits', unlocked: activation.canWithdrawAll, icon: ArrowUpRight, tier: 'TIER_02' },
                                { name: 'Cashback Engine', unlocked: activation.cashbackActive, icon: Shield, tier: 'TIER_02' },
                                { name: 'All Streams', unlocked: activation.allStreamsUnlocked, icon: Zap, tier: 'TIER_02' },
                            ].map((feature, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`p-6 rounded-[24px] border transition-all duration-500 group relative ${feature.unlocked ? 'bg-primary/5 border-primary/20 shadow-[0_0_25px_rgba(var(--primary),0.05)]' : 'bg-zinc-950/60 border-white/5 opacity-60 grayscale'
                                        }`}
                                >
                                    <div className="flex flex-col items-center text-center gap-4">
                                        <div className={`p-4 rounded-2xl transition-all duration-500 ${feature.unlocked ? 'bg-primary/20 text-primary' : 'bg-white/5 text-zinc-700'
                                            }`}>
                                            {feature.unlocked ? <Unlock className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <div className={`text-xs font-black uppercase tracking-widest ${feature.unlocked ? 'text-white' : 'text-zinc-600'}`}>
                                                {feature.name}
                                            </div>
                                            <div className="text-[9px] font-mono text-zinc-500 mt-1">{feature.tier}</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-4 space-y-12">
                        <div className="flex items-center gap-4">
                            <div className="h-8 w-1 bg-blue-500 rounded-full" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Tier <span className="text-blue-500 font-normal">Hierarchy</span></h3>
                        </div>

                        {/* Progression Visuals */}
                        <div className="space-y-6">
                            {/* Tier 1 Card */}
                            <Card className={`rounded-[32px] p-8 border transition-all duration-700 relative overflow-hidden group ${activation.tier !== 'none' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-950/40 border-white/5'
                                }`}>
                                {activation.tier !== 'none' && (
                                    <div className="absolute top-4 right-4 animate-bounce">
                                        <CheckCircle2 className="h-5 w-5 text-blue-400" />
                                    </div>
                                )}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border transition-colors ${activation.tier !== 'none' ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' : 'bg-white/5 text-zinc-700 border-white/5'
                                            }`}>01</div>
                                        <div>
                                            <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Minimal Exposure</div>
                                            <div className="text-lg font-black text-white uppercase tracking-tight italic">Tier 01: Core</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-mono">
                                            <span className="text-zinc-500 uppercase">SYNC_PROGRESS</span>
                                            <span className="text-blue-400">${Math.min(activation.totalDeposited, 10)} / 10</span>
                                        </div>
                                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${tier1Progress}%` }}
                                                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-zinc-500 leading-relaxed italic">
                                        Unlocks immediate withdrawal from Referral Level & Profit Share streams.
                                    </div>
                                </div>
                            </Card>

                            {/* Tier 2 Card */}
                            <Card className={`rounded-[32px] p-8 border transition-all duration-700 relative overflow-hidden group ${activation.tier === 'tier2' ? 'bg-primary/10 border-primary/30' : 'bg-zinc-950/40 border-white/5'
                                }`}>
                                {activation.tier === 'tier2' && (
                                    <div className="absolute top-4 right-4 animate-bounce">
                                        <CheckCircle2 className="h-5 w-5 text-primary" />
                                    </div>
                                )}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border transition-colors ${activation.tier === 'tier2' ? 'bg-primary/20 text-primary border-primary/20' : 'bg-white/5 text-zinc-700 border-white/5'
                                            }`}>02</div>
                                        <div>
                                            <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Full Integration</div>
                                            <div className="text-lg font-black text-white uppercase tracking-tight italic">Tier 02: Elite</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-mono">
                                            <span className="text-zinc-500 uppercase">SYNC_PROGRESS</span>
                                            <span className="text-primary">${Math.min(activation.totalDeposited, 100)} / 100</span>
                                        </div>
                                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${tier2Progress}%` }}
                                                className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="text-[10px] text-zinc-500 leading-relaxed italic">
                                        Full economy access. Cashback protection enabled. Practice to Real balance tunneling authorized.
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Operational Notice */}
                        <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 relative overflow-hidden">
                            <AlertCircle className="absolute -bottom-4 -right-4 h-24 w-24 text-white/[0.02]" />
                            <div className="relative z-10 space-y-4">
                                <h4 className="text-sm font-black text-white uppercase tracking-widest">Protocol Sync</h4>
                                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                                    Deposits are cumulative and permanent. Funds are immediately diverted to your Game Liquidity wallet upon confirmation. Withdrawals of practice rewards require Tier 2 verification.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
