"use client";

import { useState } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { DiceGame } from "@/components/game/DiceGame";
import { NeonSpin } from "@/components/game/NeonSpin";
import { BetHistory } from "@/components/game/BetHistory";
import { motion, AnimatePresence } from "framer-motion";
import { TransactionFeed } from "@/components/game/TransactionFeed";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { ArrowLeft, Wallet, Coins, Dices, Trophy, Zap, AlertTriangle, ShieldCheck, Check, ArrowUpCircle, TrendingUp, Disc, ListFilter, Gem, LayoutGrid, BrainCircuit, HelpCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MembershipModal } from '@/components/cash/MembershipModal';
import { ProbabilityMatrix } from "@/components/game/ProbabilityMatrix";
import NumberGuessGame from "@/components/game/NumberGuessGame";

type GameType = 'dice' | 'crash' | 'spin' | 'matrix' | 'guess' | 'lobby';

export default function PracticeGamePage() {
    const {
        realBalances, practiceBalance, faucet, isLoading, user,
        placeEntry, realEntry, purchaseMembership, practiceExpiry,
        gameHistory, claimWin, unclaimedRounds, refetchUnclaimed,
        isRealMode, setIsRealMode, usdtBalance, hasRealAccess
    } = useWallet();
    const [selectedGame, setSelectedGame] = useState<GameType>('lobby');
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Calculate stats
    const wins = gameHistory.filter((h: any) => h.won).length;

    const games = [
        { id: 'dice', name: 'Dice 6X', desc: 'Predict & Win 600%', icon: Dices, color: 'text-primary', bg: 'bg-primary/10' },
        { id: 'spin', name: 'Neon Spin', desc: 'Quantum Luck Wheel', icon: Disc, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { id: 'matrix', name: 'Probability Matrix', desc: 'Calibrate Risk Sequence', icon: BrainCircuit, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
        { id: 'guess', name: 'Number Guess', desc: 'Safe 1-10 Prediction', icon: HelpCircle, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    ];

    return (
        <div className="min-h-screen bg-background pb-20 selection:bg-primary/30">
            <header className="border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-50">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="group flex items-center gap-3 text-white/40 hover:text-white transition-all duration-300">
                            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-black group-hover:scale-110 transition-all">
                                <ArrowLeft className="h-5 w-5" />
                            </div>
                        </Link>
                        {selectedGame !== 'lobby' && (
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedGame('lobby')}
                                className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white gap-2"
                            >
                                <ListFilter className="h-3 w-3" /> Back to Lobby
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-white/5 p-1 rounded-full border border-white/10">
                            <button
                                onClick={() => setIsRealMode(false)}
                                className={cn("text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all", !isRealMode ? "bg-primary text-black shadow-lg" : "text-white/30 hover:text-white")}
                            >
                                Practice
                            </button>
                            <button
                                onClick={() => hasRealAccess && setIsRealMode(true)}
                                disabled={!hasRealAccess}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full transition-all",
                                    isRealMode ? "bg-green-500 text-black shadow-lg" : "text-white/30 hover:text-white",
                                    !hasRealAccess && "opacity-40 cursor-not-allowed hover:text-white/30"
                                )}
                            >
                                Real Money
                            </button>
                        </div>




                        <div className="flex items-center gap-3">
                            {/* Practice Balance */}
                            <div className={cn(
                                "h-12 flex items-center gap-1.5 px-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg transition-all duration-500",
                                !isRealMode && "border-primary/50 bg-primary/5 shadow-primary/20 scale-105"
                            )}>
                                <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center transition-colors", !isRealMode ? "bg-primary/20 text-primary" : "bg-white/10 text-white/20")}>
                                    <Zap className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col px-1 min-w-[70px]">
                                    <span className={cn("text-[8px] font-black uppercase leading-none", !isRealMode ? "text-primary/60" : "text-white/20")}>
                                        Practice
                                    </span>
                                    <span className={cn("text-xs font-mono font-bold leading-tight", !isRealMode ? "text-white" : "text-white/30")}>
                                        {practiceBalance} <small className="text-[7px]">GC</small>
                                    </span>
                                </div>
                            </div>

                            {/* Vault Balance (Internal) */}
                            <div className={cn(
                                "h-12 flex items-center gap-1.5 px-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg transition-all duration-500",
                                isRealMode && "border-emerald-500/50 bg-emerald-500/5 shadow-emerald-500/20 scale-105"
                            )}>
                                <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center transition-colors", isRealMode ? "bg-emerald-500/20 text-emerald-500" : "bg-white/10 text-white/20")}>
                                    <Coins className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col px-1 min-w-[70px]">
                                    <span className={cn("text-[8px] font-black uppercase leading-none", isRealMode ? "text-emerald-500/60" : "text-white/20")}>
                                        Vault
                                    </span>
                                    <span className={cn("text-xs font-mono font-bold leading-tight", isRealMode ? "text-white" : "text-white/30")}>
                                        {realBalances.game.toFixed(2)} <small className="text-[7px]">SC</small>
                                    </span>
                                </div>
                            </div>

                            {/* Quantum Asset Ticker (NEW) */}
                            <div className="h-12 hidden xl:flex items-center gap-6 px-6  bg-white/[0.02] border border-white/5 overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10 pointer-events-none" />
                                <motion.div
                                    animate={{ x: [0, -1000] }}
                                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                                    className="flex items-center gap-8 whitespace-nowrap"
                                >
                                    {[
                                        { symbol: 'BTC', price: '48,291.50', color: 'text-amber-500' },
                                        { symbol: 'BNB', price: '321.40', color: 'text-yellow-400' },
                                        { symbol: 'USDT', price: '1.00', color: 'text-emerald-500' },
                                        { symbol: 'ETH', price: '2,492.10', color: 'text-blue-400' },
                                    ].map((coin, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", coin.color.replace('text', 'bg'))} />
                                            <span className="text-[10px] font-black text-white/40">{coin.symbol}</span>
                                            <span className={cn("text-[10px] font-mono font-bold", coin.color)}>{coin.price}</span>
                                        </div>
                                    ))}
                                    {/* Duplicate for seamless loop */}
                                    {[
                                        { symbol: 'BTC', price: '48,291.50', color: 'text-amber-500' },
                                        { symbol: 'BNB', price: '321.40', color: 'text-yellow-400' },
                                        { symbol: 'USDT', price: '1.00', color: 'text-emerald-500' },
                                        { symbol: 'ETH', price: '2,492.10', color: 'text-blue-400' },
                                    ].map((coin, i) => (
                                        <div key={i + "dup"} className="flex items-center gap-2">
                                            <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", coin.color.replace('text', 'bg'))} />
                                            <span className="text-[10px] font-black text-white/40">{coin.symbol}</span>
                                            <span className={cn("text-[10px] font-mono font-bold", coin.color)}>{coin.price}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <MembershipModal
                isOpen={isDepositOpen}
                onClose={() => setIsDepositOpen(false)}
                onConfirm={async (val) => { await purchaseMembership(val); }}
            />

            <main className="container mx-auto px-6 py-10 md:py-16">
                <AnimatePresence mode="wait">
                    {selectedGame === 'lobby' ? (
                        <motion.div
                            key="lobby"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-7xl mx-auto space-y-16"
                        >
                            <div className="text-center space-y-4 max-w-2xl mx-auto">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                                    Multi-Protocol Interface
                                </div>
                                <h1 className="text-5xl md:text-7xl font-display font-black italic uppercase tracking-tight text-white focus:outline-none">
                                    MISSION <span className="text-primary">LOBBY</span>
                                </h1>
                                <p className="text-white/40 text-sm md:text-base leading-relaxed uppercase tracking-widest font-medium">
                                    Select your strategy. Dominate the ecosystem.
                                </p>
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {games.map((game) => (
                                    <motion.div
                                        key={game.id}
                                        whileHover={{ y: -10 }}
                                        onClick={() => setSelectedGame(game.id as GameType)}
                                        className="cursor-pointer"
                                    >
                                        <Card className="h-full bg-black/40 border-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden group hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_80px_rgba(255,255,255,0.05)]">
                                            <CardContent className="p-10 space-y-8 flex flex-col items-center text-center">
                                                <div className={cn("h-24 w-24 rounded-[2rem] flex items-center justify-center transition-all duration-500 group-hover:scale-110", game.bg, game.color)}>
                                                    <game.icon className="h-12 w-12" />
                                                </div>
                                                <div className="space-y-4">
                                                    <h3 className="text-3xl font-display font-black italic uppercase text-white">{game.name}</h3>
                                                    <p className="text-xs text-white/40 uppercase font-bold tracking-widest leading-relaxed">
                                                        {game.desc}
                                                    </p>
                                                </div>
                                                <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 group-hover:bg-white group-hover:text-black transition-all font-black uppercase tracking-widest text-xs">
                                                    Engage Protocol
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="game"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-7xl mx-auto space-y-16"
                        >
                            <div className="grid lg:grid-cols-12 gap-10">
                                <div className="lg:col-span-12 space-y-12">
                                    {selectedGame === 'dice' && <DiceGame />}
                                    {selectedGame === 'spin' && <NeonSpin />}
                                    {selectedGame === 'matrix' && <ProbabilityMatrix />}
                                    {selectedGame === 'guess' && <NumberGuessGame />}

                                    {/* Universal Bet History */}
                                    <div className="pt-20 border-t border-white/5">
                                        <BetHistory history={gameHistory} />
                                    </div>

                                    {/* Universal Info Cards */}
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] p-8 group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                                <TrendingUp className="h-24 w-24" />
                                            </div>

                                            <div className="flex items-center justify-between mb-8">
                                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", isRealMode ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary")}>
                                                    <Gem className="h-6 w-6" />
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Session_Intelligence</div>
                                                    <div className="text-xl font-mono font-bold text-white flex items-center gap-2 justify-end">
                                                        {practiceBalance}
                                                        <span className="text-[10px] text-primary font-black">CHIPS</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none">Yield_Status</div>
                                                    <div className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                                                        MODULATED
                                                    </div>
                                                </div>
                                                <div className="space-y-1 text-right">
                                                    <div className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none">Vault_Link</div>
                                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest">ACTIVE</div>
                                                </div>
                                            </div>

                                            <div className="mt-8 space-y-4">
                                                <div className="flex justify-between text-[10px] font-black uppercase text-white/20">
                                                    <span>Session Progress</span>
                                                    <span>{wins} Wins</span>
                                                </div>
                                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div className={cn("h-full bg-primary", isRealMode && "bg-emerald-500")} style={{ width: '45%' }} />
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="border-primary/20 bg-primary/[0.03] backdrop-blur-3xl rounded-[2.5rem] p-8">
                                            <h3 className="font-bold text-white uppercase tracking-wider mb-4">Ecosystem Benefits</h3>
                                            <ul className="space-y-2">
                                                {["Convert Practice to Real", "Earn Referral Rewards", "100% Protection"].map((b, i) => (
                                                    <li key={i} className="flex items-center gap-3 text-[10px] font-black uppercase text-white/50">
                                                        <Check className="h-3 w-3 text-green-500" /> {b}
                                                    </li>
                                                ))}
                                            </ul>
                                            <Button className="w-full mt-6 bg-white text-black font-black uppercase tracking-widest text-[10px] h-10 rounded-xl">Upgrade Access</Button>
                                        </Card>
                                    </div>

                                    <div className="flex items-center justify-center pt-10">
                                        <Card className="max-w-md border-white/5 bg-white/[0.02] p-8 rounded-[2.5rem] text-center space-y-4">
                                            <AlertTriangle className="h-6 w-6 text-white/20 mx-auto" />
                                            <p className="text-[10px] text-white/20 uppercase font-black leading-relaxed text-center">
                                                Fair Play Protocol Active. All sequences verified via Multi-Protocol VRF.
                                            </p>
                                        </Card>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
