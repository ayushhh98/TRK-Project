"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, Trophy, XCircle, Copy, CheckCheck, AlertTriangle } from "lucide-react";
import { DiceFace } from "./DiceFace";

interface GameInterfaceProps {
    onPlaceEntry: (prediction: number) => void;
    isProcessing: boolean;
    lastResult: { won: boolean; number: number; pick: number; hash: string; amount: number } | null;
    currencyLabel?: string;
}

export function GameInterface({ onPlaceEntry, isProcessing, lastResult, currencyLabel = "SC" }: GameInterfaceProps) {
    const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSelect = (num: number) => {
        if (isProcessing) return;
        setSelectedNumber(num);
        onPlaceEntry(num);
    };

    const handleCopy = () => {
        if (lastResult?.hash) {
            navigator.clipboard.writeText(lastResult.hash);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-10">
            {/* Immersive Game Board */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                {Array.from({ length: 6 }, (_, i) => i + 1).map((num) => (
                    <motion.div
                        key={num}
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <button
                            className={cn(
                                "group relative w-full aspect-square md:aspect-auto md:h-36 rounded-3xl border-2 transition-all duration-500 overflow-hidden",
                                selectedNumber === num
                                    ? "border-primary bg-primary/20 shadow-[0_0_50px_rgba(251,191,36,0.3)]"
                                    : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                            )}
                            onClick={() => handleSelect(num)}
                            disabled={isProcessing}
                        >
                            {/* Inner Glow */}
                            <div className={cn(
                                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700",
                                selectedNumber === num ? "bg-gradient-to-t from-primary/20 to-transparent opacity-100" : "bg-gradient-to-t from-white/10 to-transparent"
                            )} />

                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-3 z-10">
                                <DiceFace
                                    value={num}
                                    className={cn(
                                        "w-12 h-12 md:w-16 md:h-16 rounded-xl transition-all duration-500 group-hover:rotate-12",
                                        selectedNumber === num
                                            ? "bg-primary shadow-2xl scale-110"
                                            : "bg-white/90 group-hover:bg-white"
                                    )}
                                />
                                <span className={cn(
                                    "text-[10px] font-black tracking-widest uppercase transition-colors",
                                    selectedNumber === num ? "text-primary" : "text-white/20 group-hover:text-white/40"
                                )}>
                                    Side {num}
                                </span>
                            </div>
                        </button>
                    </motion.div>
                ))}
            </div>

            {/* Result Display & Rolling State */}
            <AnimatePresence mode="wait">
                {isProcessing ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="relative h-64 flex flex-col items-center justify-center rounded-[2.5rem] bg-white/[0.02] border border-white/5 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                        <div className="relative">
                            <motion.div
                                animate={{
                                    rotateX: [0, 360, 720],
                                    rotateY: [0, 360, 720],
                                    scale: [1, 1.2, 1]
                                }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                className="relative z-10"
                            >
                                <Dices className="h-20 w-20 text-primary drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
                            </motion.div>

                            {/* Motion Blur Particles */}
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute inset-0 text-primary/20"
                                    animate={{
                                        x: [0, (i - 2.5) * 40, 0],
                                        y: [0, Math.sin(i) * 40, 0],
                                        opacity: [0, 1, 0],
                                        rotate: [0, 360]
                                    }}
                                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                                >
                                    <Dices className="h-10 w-10 opacity-30" />
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-8 space-y-1 text-center">
                            <h3 className="text-xl font-bold text-white uppercase tracking-[0.3em]">Randomizing</h3>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Generating VRF Proof</p>
                        </div>
                    </motion.div>
                ) : lastResult ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={cn(
                            "relative overflow-hidden rounded-[2.5rem] border-2 p-1",
                            lastResult.won ? "border-green-500/20 shadow-[0_0_80px_rgba(34,197,94,0.15)]" : "border-red-500/20 shadow-[0_0_80px_rgba(239,68,68,0.15)]"
                        )}
                    >
                        <div className={cn(
                            "relative z-10 p-8 md:p-12 rounded-[2.3rem] flex flex-col md:flex-row items-center justify-between gap-10",
                            lastResult.won ? "bg-gradient-to-br from-green-500/10 to-transparent" : "bg-gradient-to-br from-red-500/10 to-transparent"
                        )}>
                            <div className="space-y-6 text-center md:text-left">
                                <div className="space-y-2">
                                    <div className={cn(
                                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        lastResult.won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                    )}>
                                        {lastResult.won ? <Trophy className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                        Roll Outcome
                                    </div>
                                    <h2 className={cn(
                                        "text-6xl md:text-8xl font-display font-black italic uppercase",
                                        lastResult.won ? "text-green-400" : "text-red-400"
                                    )}>
                                        {lastResult.won ? "Victory" : "Loss"}
                                    </h2>
                                </div>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Your Asset Change</div>
                                        <div className={cn(
                                            "text-3xl font-mono font-bold",
                                            lastResult.won ? "text-green-400" : "text-red-400"
                                        )}>
                                            {lastResult.won ? "+" : "-"}{lastResult.won ? (lastResult.amount * 6).toFixed(2) : lastResult.amount.toFixed(2)} <span className="text-xs">{currencyLabel}</span>
                                        </div>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Entry Verification ID</div>
                                        <button onClick={handleCopy} className="flex items-center gap-2 group/id">
                                            <span className="text-sm font-mono text-white/60 group-hover/id:text-white transition-colors">{lastResult.hash.slice(0, 10)}...</span>
                                            {copied ? <CheckCheck className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-white/20 group-hover/id:text-white" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="flex items-center gap-6">
                                    <div className="space-y-3 text-center">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30">Pick</div>
                                        <div className="w-20 h-20 md:w-24 md:h-24">
                                            <DiceFace value={lastResult.pick} className="bg-white/10 border border-white/20 backdrop-blur-2xl rounded-2xl shadow-2xl p-4" />
                                        </div>
                                    </div>
                                    <div className="text-4xl font-black text-white/10">vs</div>
                                    <div className="space-y-3 text-center">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-white/30 font-primary">Lucky</div>
                                        <div className="w-20 h-20 md:w-24 md:h-24">
                                            <DiceFace
                                                value={lastResult.number}
                                                className={cn(
                                                    "rounded-2xl shadow-2xl p-4 transition-all duration-700",
                                                    lastResult.won ? "bg-green-400 scale-110" : "bg-primary"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {lastResult.won && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute -top-4 -right-4 bg-yellow-500 text-black h-10 w-10 rounded-full flex items-center justify-center font-black shadow-xl"
                                    >
                                        6X
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                        <Dices className="h-12 w-12 text-white/5 mb-4" />
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-white/10">Select a side to roll</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
