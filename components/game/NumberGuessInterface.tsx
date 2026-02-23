"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Dices, Trophy, XCircle, Timer, History as HistoryIcon } from "lucide-react";
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

    // Timer logic to sync with top of the hour
    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const nextHour = new Date(now);
            nextHour.setHours(now.getHours() + 1, 0, 0, 0);
            return Math.floor((nextHour.getTime() - now.getTime()) / 1000);
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate precision ring progress
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const progress = (timeLeft / 3600) * 100;
    const dashOffset = circumference - (progress / 100) * circumference;

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Timer Header */}
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                    {/* Glow effect matching screenshot */}
                    <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full" />

                    <div className="relative bg-[#0A0B0D] rounded-full h-40 w-40 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.1)]">
                        <div className="text-center z-10">
                            <Dices className="h-5 w-5 text-white/80 mx-auto mb-1 opacity-80" />
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#a855f7] mb-0.5">Next Draw</div>
                            <div className="text-4xl font-black text-yellow-400 font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                                {formatTime(timeLeft)}
                            </div>
                        </div>

                        {/* Ring Progress */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 p-1">
                            <defs>
                                <linearGradient id="purplePinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#a855f7" /> {/* Purple 500 */}
                                    <stop offset="100%" stopColor="#ec4899" /> {/* Pink 500 */}
                                </linearGradient>
                            </defs>
                            {/* Static Dashed Ring */}
                            <circle
                                cx="50%" cy="50%" r={radius}
                                stroke="url(#purplePinkGradient)" strokeWidth="3"
                                fill="transparent"
                                strokeDasharray="6 6"
                                className="opacity-60"
                            />
                            {/* Optional Progress Indicator Overlay (if needed) */}
                            {/* <circle
                                cx="50%" cy="50%" r={radius}
                                stroke="url(#purplePinkGradient)" strokeWidth="3"
                                fill="transparent"
                                className="transition-all duration-1000 ease-linear"
                                strokeDasharray={circumference}
                                strokeDashoffset={dashOffset}
                                strokeLinecap="round"
                            /> */}
                        </svg>
                    </div>
                </div>
            </div>

            {/* Game Board */}
            <div className="bg-[#0F1115] border border-white/5 rounded-3xl p-6 space-y-6 shadow-2xl">
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Select Winning Number</span>
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-5 gap-3">
                    {Array.from({ length: 10 }, (_, i) => i).map((num) => (
                        <motion.button
                            key={num}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => !isProcessing && setSelectedNumber(num)}
                            className={cn(
                                "aspect-square rounded-2xl font-black text-2xl flex items-center justify-center transition-all duration-300",
                                selectedNumber === num
                                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-110 z-10"
                                    : "bg-[#13161f] text-white hover:bg-[#1a1e2b] border border-transparent hover:border-white/5"
                            )}
                        >
                            {num}
                        </motion.button>
                    ))}
                </div>

                {/* Bet Input */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-[#0A0B0D] p-1.5 rounded-2xl border border-white/5">
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-transparent w-full px-4 text-white font-mono font-bold focus:outline-none"
                            placeholder="Amount"
                        />
                        <div className="flex gap-1">
                            {quickBets.map(val => (
                                <button
                                    key={val}
                                    onClick={() => setAmount(val.toString())}
                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-bold text-white/60 transition-colors"
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <Button
                    onClick={handlePlaceBet}
                    disabled={isProcessing || selectedNumber === null}
                    className={cn(
                        "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-300 shadow-lg",
                        isProcessing
                            ? "bg-white/10 text-white/20 cursor-wait"
                            : "bg-[#8a6a1c] hover:bg-[#a17a21] text-black shadow-[0_0_20px_rgba(138,106,28,0.2)]"
                    )}
                >
                    {isProcessing ? (
                        <span className="flex items-center gap-2 animate-pulse">
                            <Dices className="h-4 w-4 animate-spin" /> Processing Protocol...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Dices className="h-4 w-4" opacity={0.6} /> Place Bet
                        </span>
                    )}
                </Button>
            </div>

            {/* Recent Results Ribbon */}
            <div className="bg-[#0F1115] border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Recent Results</div>
                <div className="flex gap-2">
                    {lastResult && (
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border",
                            lastResult.won
                                ? "bg-green-500/10 border-green-500/30 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                                : "bg-pink-500/10 border-pink-500/30 text-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.2)]"
                        )}>
                            {lastResult.number}
                        </div>
                    )}
                    <div className="h-8 w-8 rounded-full bg-pink-500/5 border border-pink-500/20 flex items-center justify-center font-bold text-sm text-pink-500/50">1</div>
                </div>
            </div>

            {/* Your Recent Activity */}
            <div className="space-y-4">
                <div className="px-2 text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">Your Recent Activity</div>
                <div className="space-y-3">
                    {gameHistory.filter((h: any) => h.gameType === 'guess').slice(0, 5).map((historyItem: any, i: number) => (
                        <div key={i} className="bg-[#1A1D24] border border-white/5 rounded-3xl p-5 flex items-center justify-between shadow-lg">
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner",
                                    historyItem.won ? "bg-green-900/40 text-green-400" : "bg-[#13161f] text-white/50"
                                )}>
                                    {historyItem.pick ?? '-'}
                                </div>
                                <div className="space-y-1">
                                    <div className="text-[9px] uppercase font-black tracking-wider text-white/30">Round #{gameHistory.length - i}</div>
                                    <div className="text-base font-bold text-white flex gap-1.5 items-baseline">
                                        {historyItem.amount} <span className="text-white/40 text-[10px] font-bold">USDT</span>
                                    </div>
                                    <div className="flex gap-1.5 mt-2">
                                        {[1, 2, 9].map(n => (
                                            <div key={n} className="h-5 w-5 rounded-lg bg-black/40 flex items-center justify-center text-[9px] text-white/30 font-bold border border-white/5">{n}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className={cn(
                                "text-[10px] font-black uppercase tracking-[0.2em] px-4 text-right flex flex-col",
                                historyItem.status === 'pending'
                                    ? "text-yellow-500/80 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]"
                                    : historyItem.won ? "text-white/20" : "text-white/10"
                            )}>
                                {historyItem.status === 'pending'
                                    ? "Pending..."
                                    : (historyItem.won ? "Paid Out" : "Lost")}
                            </div>
                        </div>
                    ))}
                    {gameHistory.filter((h: any) => h.gameType === 'guess').length === 0 && (
                        <div className="text-center p-8 text-sm text-white/20 uppercase font-bold bg-[#1A1D24] rounded-3xl border border-white/5">No recent activity</div>
                    )}
                </div>
            </div>

        </div>
    );
}
