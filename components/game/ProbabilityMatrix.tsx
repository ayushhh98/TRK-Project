"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet } from "@/components/providers/WalletProvider";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { Card } from "@/components/ui/Card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Zap, ShieldCheck, Activity, BrainCircuit, Terminal, Lock } from "lucide-react";
import { BetControls } from "./BetControls";

export function ProbabilityMatrix() {
    const { isRealMode, practiceBalance, realBalances, placeEntry, realEntry } = useWallet();

    // Risk Level: 10% to 90% (Represents pickedNumber)
    // Higher Risk = Higher Multiplier
    const [riskLevel, setRiskLevel] = useState(50);
    const [amount, setAmount] = useState(1.0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<{ won: boolean; payout: number; luckyNumber: string } | null>(null);
    const [matrixScan, setMatrixScan] = useState(false);

    const winChance = 100 - riskLevel;
    const multiplier = 98 / winChance;

    const currencyLabel = isRealMode ? "SC" : "GC"; // SC = Sweepstakes Coins, GC = Gold Coins

    const handleStartSequence = async () => {
        if (isProcessing) return;

        const currentBalance = isRealMode ? realBalances.totalUnified : parseFloat(practiceBalance);
        if (currentBalance < amount) {
            toast.error(`Insufficient ${isRealMode ? 'Sweepstakes Coins' : 'Gold Coins'}`, { description: "Get more coins to continue." });
            return;
        }

        setIsProcessing(true);
        setResult(null);
        setMatrixScan(true);

        // Simulate "Matrix Scan" delay for effect
        await new Promise(r => setTimeout(r, 1500));

        try {
            const betFn = isRealMode ? realEntry : placeEntry;
            const res = await betFn(amount, riskLevel, 'matrix');

            setMatrixScan(false);
            setResult({
                won: res.won,
                payout: res.payout || (res.won ? amount * multiplier : 0),
                luckyNumber: res.luckyNumber
            });

            if (res.won) {
                toast.success(`SEQUENCE SUCCESS: +${(res.payout || amount * multiplier).toFixed(2)} ${currencyLabel}`, {
                    description: `Risk Level: ${riskLevel}% | Multiplier: ${multiplier.toFixed(2)}x`
                });
            } else {
                toast.error("SEQUENCE FAILED", {
                    description: `Rolled: ${res.luckyNumber} | Needed < ${winChance}%`
                });
            }

        } catch (error: any) {
            console.error(error);
            setMatrixScan(false);
            toast.error("Sequence Error", { description: error.message || "Failed to initiate sequence." });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-12 max-w-7xl mx-auto w-full">
            <div className="text-center space-y-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] mb-2",
                        isRealMode ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-purple-500/10 border-purple-500/20 text-purple-500"
                    )}
                >
                    {isRealMode ? <ShieldCheck className="h-3 w-3" /> : <BrainCircuit className="h-3 w-3" />}
                    {isRealMode ? "Promotional Play (Win SC)" : "Standard Play (Fun Only)"}
                </motion.div>
                <h1 className="text-4xl md:text-6xl font-display font-black italic uppercase tracking-tight text-white">
                    Probability <span className={isRealMode ? "text-green-500" : "text-purple-500"}>Matrix</span>
                </h1>
                <p className="text-white/40 text-sm uppercase tracking-widest font-medium">
                    Calibrate Risk. Execute Sequence. Win {currencyLabel}.
                </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* Control Panel */}
                <Card className="bg-black/40 backdrop-blur-xl border-white/10 p-8 space-y-8 rounded-[2rem] relative overflow-hidden">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-white/50">
                                <span>Sequence Density (Risk)</span>
                                <span className={cn("text-lg", isRealMode ? "text-green-400" : "text-purple-400")}>{riskLevel}%</span>
                            </div>
                            <Slider
                                value={[riskLevel]}
                                onValueChange={(val: any) => setRiskLevel(val[0])}
                                min={10}
                                max={90}
                                step={1}
                                className={cn("py-4", isRealMode ? "[&_.absolute]:bg-green-500" : "[&_.absolute]:bg-purple-500")}
                            />
                            <div className="flex justify-between text-[10px] text-white/30 font-mono uppercase">
                                <span>10% (Safe)</span>
                                <span>90% (Volatile)</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="space-y-1 text-center">
                                <div className="text-[9px] uppercase tracking-widest text-white/30">Win Chance</div>
                                <div className="text-xl font-mono font-bold text-white">{winChance}%</div>
                            </div>
                            <div className="space-y-1 text-center border-l border-white/5">
                                <div className="text-[9px] uppercase tracking-widest text-white/30">Multiplier</div>
                                <div className={cn("text-xl font-mono font-bold", isRealMode ? "text-green-400" : "text-purple-400")}>
                                    {multiplier.toFixed(2)}x
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="text-xs font-black uppercase tracking-widest text-white/50">Sequence Input</div>
                        <BetControls
                            amount={amount}
                            setAmount={setAmount}
                            disabled={isProcessing}
                        />
                    </div>

                    <Button
                        onClick={handleStartSequence}
                        disabled={isProcessing}
                        className={cn(
                            "w-full h-16 text-lg font-black italic uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg relative overflow-hidden",
                            isRealMode
                                ? "bg-green-600 hover:bg-green-500 text-black shadow-green-500/20"
                                : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20"
                        )}
                    >
                        {isProcessing ? (
                            <span className="flex items-center gap-3 animate-pulse">
                                <Activity className="h-5 w-5 animate-spin" /> Executing...
                            </span>
                        ) : (
                            <span className="flex items-center gap-3">
                                <Zap className="h-5 w-5 fill-current" /> START SEQUENCE
                            </span>
                        )}
                    </Button>
                </Card>

                {/* Matrix Visualization / Result Terminal */}
                <div className="space-y-6">
                    <Card className="h-[400px] bg-black border-white/10 relative overflow-hidden rounded-[2rem] flex items-center justify-center group">
                        {/* Matrix Grid Background */}
                        <div className="absolute inset-0 opacity-20">
                            <div className={cn(
                                "w-full h-full",
                                matrixScan ? "animate-pulse" : "",
                                "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
                            )} />
                        </div>

                        {/* Scanner Beam */}
                        <AnimatePresence>
                            {matrixScan && (
                                <motion.div
                                    initial={{ top: "-10%" }}
                                    animate={{ top: "110%" }}
                                    transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                                    className={cn(
                                        "absolute left-0 right-0 h-20 blur-xl opacity-30 z-10",
                                        isRealMode ? "bg-green-500" : "bg-purple-500"
                                    )}
                                />
                            )}
                        </AnimatePresence>

                        {/* Active Result Display */}
                        <div className="relative z-20 text-center space-y-6">
                            {!result && !matrixScan && (
                                <div className="text-white/20 flex flex-col items-center gap-4">
                                    <Terminal className="h-16 w-16 opacity-50" />
                                    <div className="text-sm font-mono uppercase tracking-widest">Awaiting Sequence...</div>
                                </div>
                            )}

                            {matrixScan && (
                                <div className="font-mono text-white/60 animate-pulse text-lg tracking-widest">
                                    CALIBRATING PROBABILITY...
                                </div>
                            )}

                            {result && !matrixScan && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={cn(
                                        "p-8 rounded-2xl border-2 backdrop-blur-3xl",
                                        result.won
                                            ? "bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_50px_rgba(34,197,94,0.2)]"
                                            : "bg-red-500/10 border-red-500 text-red-500"
                                    )}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-[0.4em] mb-2 opacity-70">Result Terminal</div>
                                    <div className="text-5xl font-mono font-black tracking-tighter mb-2">
                                        {result.won ? "+" : "-"}{result.won ? result.payout.toFixed(2) : amount.toFixed(2)} <span className="text-2xl">USDT</span>
                                    </div>
                                    <div className="flex items-center justify-center gap-2 text-xs font-mono opacity-60">
                                        {result.won ? <Trophy className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                        {result.won ? "SEQUENCE VERIFIED" : "SEQUENCE REJECTED"}
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </Card>

                    {/* Instruction Data */}
                    <div className="grid grid-cols-3 gap-4">
                        {['Risk', 'Reward', 'Fairness'].map((label, i) => (
                            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                                <div className="text-[9px] uppercase tracking-widest text-white/30 mb-1">{label}</div>
                                <div className="text-xs font-bold text-white/60">
                                    {i === 0 ? "Adjustable" : i === 1 ? "Dynamic" : "Provable"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Trophy(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    )
}
