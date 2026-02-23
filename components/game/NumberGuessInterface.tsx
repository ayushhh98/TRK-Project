"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Dices, Trophy, XCircle, Timer, History as HistoryIcon, RefreshCw, ShieldCheck } from "lucide-react";
import { useWallet } from "@/components/providers/WalletProvider";

interface NumberGuessInterfaceProps {
    onPlaceEntry: (prediction: number, amount: number) => void;
    isProcessing: boolean;
    lastResult: { won: boolean; number: number; pick: number; hash: string; amount: number } | null;
    currencyLabel?: string;
}

export function NumberGuessInterface({ onPlaceEntry, isProcessing, lastResult, currencyLabel = "USDT" }: NumberGuessInterfaceProps) {
    const [selectedNumber, setSelectedNumber] = useState<number | null>(7); // Default to 7 like in screenshot
    const [amount, setAmount] = useState<string>("1");
    const { gameHistory } = useWallet();

    const quickBets = [1, 5, 10, 50];

    const handlePlaceBet = () => {
        if (selectedNumber === null || isProcessing) return;
        const betAmount = parseFloat(amount);
        if (isNaN(betAmount) || betAmount <= 0) return;
        onPlaceEntry(selectedNumber, betAmount);
    };

    const [timeLeft, setTimeLeft] = useState(0);
    const [currentRound, setCurrentRound] = useState<any>(null);

    // Fetch and sync round timer
    useEffect(() => {
        const fetchRound = async () => {
            try {
                const res = await apiRequest('/game/round');
                if (res.status === 'success') {
                    setCurrentRound(res.data);
                    const end = new Date(res.data.endTime).getTime();
                    const now = new Date().getTime();
                    setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)));
                }
            } catch (err) {
                console.error("Failed to fetch round:", err);
            }
        };

        fetchRound();
        const pollInterval = setInterval(fetchRound, 10000); // Poll every 10s to sync

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    fetchRound(); // Refresh when timer hits zero
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
            clearInterval(pollInterval);
        };
    }, []);

    const formatTime = (seconds: number) => {
        if (seconds <= 0) return "00:00:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate progress (based on 1 hour = 3600 seconds)
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, Math.min(100, (timeLeft / 3600) * 100));
    const dashOffset = circumference - (progress / 100) * circumference;

    const [roundsHistory, setRoundsHistory] = useState<any[]>([]);

    useEffect(() => {
        const fetchRoundsHistory = async () => {
            try {
                const res = await apiRequest('/game/rounds/history');
                if (res.status === 'success') {
                    setRoundsHistory(res.data.rounds || []);
                }
            } catch (err) {
                console.error("Failed to fetch rounds history:", err);
            }
        };

        fetchRoundsHistory();
        const interval = setInterval(fetchRoundsHistory, 30000); // Update history every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="max-w-3xl mx-auto space-y-10">
            {/* Phase 1: High-Performance Timer & Round Status */}
            <div className="flex flex-col items-center justify-center space-y-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-[#1A1D24]/80 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                >
                    <div className="relative">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping absolute inset-0" />
                        <div className="h-2 w-2 rounded-full bg-emerald-500 relative" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/80">
                        Protocol Round #{currentRound?.roundNumber || '...'} <span className="text-emerald-500/80 ml-1">Live</span>
                    </span>
                </motion.div>

                <div className="relative">
                    {/* Multi-layered Glow System */}
                    <div className="absolute inset-0 bg-purple-600/20 blur-[60px] rounded-full scale-110" />
                    <div className="absolute inset-0 bg-blue-500/10 blur-[40px] rounded-full" />

                    <div className="relative bg-[#0A0B0D] rounded-full h-52 w-52 flex items-center justify-center shadow-[inset_0_0_40px_rgba(168,85,247,0.1),0_20px_40px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden">
                        {/* Internal Cyber Grid bg */}
                        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />

                        <div className="text-center z-10">
                            <motion.div
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-[9px] font-black uppercase tracking-[0.4em] text-purple-400 mb-2"
                            >
                                Next Draw In
                            </motion.div>
                            <div className="text-5xl font-black text-yellow-400 font-mono tracking-tighter drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                                {formatTime(timeLeft)}
                            </div>
                            <div className="mt-2 h-1 w-12 bg-white/10 mx-auto rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-purple-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* High-Fidelity SVG Timer */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[0.85]">
                            <defs>
                                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#A855F7" />
                                    <stop offset="100%" stopColor="#3B82F6" />
                                </linearGradient>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            {/* Background Track */}
                            <circle
                                cx="50%" cy="50%" r={radius + 8}
                                stroke="rgba(255,255,255,0.03)" strokeWidth="6"
                                fill="transparent"
                            />
                            {/* Animated Progress */}
                            <motion.circle
                                cx="50%" cy="50%" r={radius + 8}
                                stroke="url(#timerGradient)" strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * (radius + 8)}
                                animate={{ strokeDashoffset: (2 * Math.PI * (radius + 8)) - (progress / 100) * 2 * Math.PI * (radius + 8) }}
                                transition={{ duration: 1, ease: "linear" }}
                                strokeLinecap="round"
                                filter="url(#glow)"
                            />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Main Interactive Core */}
            <div className="relative group">
                {/* Background Decorations */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-[44px] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000" />

                <div className="relative bg-[#0F1115] border border-white/10 rounded-[40px] p-10 space-y-10 shadow-2xl overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <Dices className="h-32 w-32 text-white -rotate-12" />
                    </div>

                    <div className="text-center space-y-1">
                        <h3 className="text-sm font-black uppercase tracking-[0.4em] text-white/20">Oracle Selection</h3>
                        <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent mx-auto" />
                    </div>

                    {/* Cyber Grid Keypad */}
                    <div className="grid grid-cols-5 gap-5">
                        {Array.from({ length: 10 }, (_, i) => i).map((num) => (
                            <motion.button
                                key={num}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => !isProcessing && setSelectedNumber(num)}
                                className={cn(
                                    "aspect-square rounded-[24px] font-black text-3xl flex items-center justify-center transition-all duration-500 relative overflow-hidden group/btn",
                                    selectedNumber === num
                                        ? "bg-yellow-400 text-black shadow-[0_15px_40px_rgba(250,204,21,0.4)] border-transparent"
                                        : "bg-[#16181D] text-white/40 border border-white/5 hover:border-white/20 hover:text-white"
                                )}
                            >
                                {selectedNumber === num && (
                                    <motion.div
                                        layoutId="activeGlow"
                                        className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-50"
                                    />
                                )}
                                <span className="relative z-10">{num}</span>
                            </motion.button>
                        ))}
                    </div>

                    {/* Wager Controls */}
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <Coins className="h-3 w-3 text-white/30" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Entry Amount</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                                <Zap className="h-3 w-3 text-emerald-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">10x Potential</span>
                            </div>
                        </div>

                        <div className="relative group/input">
                            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-focus-within/input:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-4 bg-[#0A0B0D] p-3 rounded-3xl border border-white/5 group-focus-within/input:border-white/10 transition-all">
                                <div className="pl-4 text-white/20 font-black text-xl">$</div>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="bg-transparent w-full text-white font-mono font-bold text-2xl focus:outline-none placeholder:text-white/5"
                                    placeholder="0.00"
                                />
                                <div className="flex gap-2 pr-1">
                                    {quickBets.map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setAmount(val.toString())}
                                            className="px-5 py-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-black text-white/40 hover:text-white transition-all active:scale-95 border border-white/5"
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Execution Interface */}
                    <Button
                        onClick={handlePlaceBet}
                        disabled={isProcessing || selectedNumber === null}
                        className={cn(
                            "w-full h-20 rounded-[28px] font-black uppercase tracking-[0.3em] text-sm transition-all duration-700 relative overflow-hidden group/exec",
                            isProcessing
                                ? "bg-white/5 text-white/10 cursor-wait"
                                : "bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black shadow-2xl hover:shadow-yellow-400/20"
                        )}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.3),transparent)] -translate-x-full group-hover/exec:animate-[shimmer_2s_infinite]" />

                        {isProcessing ? (
                            <span className="flex items-center gap-4">
                                <RefreshCw className="h-6 w-6 animate-spin opacity-50" />
                                <span className="animate-pulse">Authorizing Draw...</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-4">
                                <ShieldCheck className="h-6 w-6 opacity-40" />
                                <span>Initiate Entry Protocol</span>
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            {/* Historical Oracle Data */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <HistoryIcon className="h-3 w-3 text-white/30" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Past Oracles</span>
                        </div>
                    </div>

                    <div className="bg-[#0F1115]/50 border border-white/5 rounded-[32px] p-6 grid grid-cols-3 gap-3">
                        {roundsHistory.slice(0, 6).map((round, idx) => (
                            <div key={idx} className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center gap-2">
                                <span className="text-[8px] font-black text-white/10">#{round.roundNumber}</span>
                                <div className="text-lg font-black text-white">{round.luckyNumber ?? '?'}</div>
                            </div>
                        ))}
                        {roundsHistory.length === 0 && (
                            <div className="col-span-full py-10 text-center text-white/5 text-[9px] font-black uppercase tracking-[0.2em]">
                                Awaiting First Draw
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Trophy className="h-3 w-3 text-white/30" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Your Tickets</span>
                        </div>
                        <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">{gameHistory.length} Cycles</span>
                    </div>

                    <div className="space-y-4">
                        {gameHistory.filter((h: any) => h.gameVariant === 'guess' || h.gameType === 'guess').slice(0, 4).map((item: any, i: number) => (
                            <div key={i} className="bg-[#0F1115] border border-white/5 rounded-[32px] p-5 flex items-center justify-between group/ticket hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-xl border transition-all",
                                        item.status === 'pending'
                                            ? "bg-black/40 border-white/5 text-white/20"
                                            : item.won
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                : "bg-[#1A1D24] border-white/5 text-white/40"
                                    )}>
                                        {item.pickedNumber ?? item.prediction ?? '-'}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[8px] uppercase font-black tracking-widest text-white/10">
                                            R-{item.roundNumber || '??'} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div className="text-lg font-black text-white tracking-tight">
                                            {item.amount} <span className="text-white/20 text-[10px] ml-1">USDT</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                    item.status === 'pending'
                                        ? "bg-yellow-500/5 border-yellow-500/10 text-yellow-500/60 animate-pulse"
                                        : item.won
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                            : "bg-white/5 border-white/5 text-white/20"
                                )}>
                                    {item.status === 'pending' ? 'Orbiting' : item.won ? 'Winner' : 'Closed'}
                                </div>
                            </div>
                        ))}
                        {gameHistory.length === 0 && (
                            <div className="bg-[#0F1115]/50 border border-white/5 rounded-[32px] py-16 flex flex-col items-center justify-center space-y-4">
                                <div className="h-10 w-10 rounded-full border border-white/5 flex items-center justify-center">
                                    <HistoryIcon className="h-5 w-5 text-white/5" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10">Zero Active Tickets</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const Zap = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const Coins = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
