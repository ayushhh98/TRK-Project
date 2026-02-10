"use client";

import { useState, useEffect, useRef } from "react";
import { BetControls } from "./BetControls";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Zap, ShieldCheck, TrendingUp, AlertCircle } from "lucide-react";

import { useWallet } from "@/components/providers/WalletProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CyberCrashProps {
    // Props are now optional
}

export function CyberCrash({ }: CyberCrashProps) {
    const {
        isRealMode,
        practiceBalance,
        realBalances,
        placeEntry,
        realEntry,
        participate,
        usdtBalance
    } = useWallet();
    const router = useRouter();

    const [amount, setAmount] = useState(0.5);
    const [isProcessing, setIsProcessing] = useState(false);
    const [multiplier, setMultiplier] = useState(1.0);
    const [isCrashed, setIsCrashed] = useState(false);
    const [status, setStatus] = useState<'idle' | 'running' | 'crashed' | 'cashed_out'>('idle');
    const [cashOutValue, setCashOutValue] = useState<number | null>(null);
    const [targetMultiplier, setTargetMultiplier] = useState<number>(2.0);

    const multiplierRef = useRef(1.0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const startRound = () => {
        if (isProcessing) return;

        if (amount < 0.5) {
            toast.warning("Minimum entry is 0.5 SC");
            return;
        }

        const currentBalance = isRealMode
            ? realBalances.game
            : parseFloat(practiceBalance);

        if (currentBalance < amount) {
            toast.error(`Insufficient ${isRealMode ? 'Sweepstakes Coins' : 'Gold Coins'}!`, {
                description: isRealMode ? "Your Reward Vault is low. Purchase a Membership Package?" : "Standard Play points depleted.",
                action: isRealMode ? {
                    label: "Deposit",
                    onClick: () => router.push("/dashboard/cash?deposit=true")
                } : undefined
            });
            return;
        }

        if (isRealMode) {
            participate(amount, targetMultiplier, 'crash').catch(console.error);
        } else {
            placeEntry(amount, targetMultiplier, 'crash').catch(console.error);
        }


        setIsProcessing(true);
        setIsCrashed(false);
        setMultiplier(1.0);
        multiplierRef.current = 1.0;
        setStatus('running');
        setCashOutValue(null);

        // Simulated Crash Point (1.0 to 10.0)
        // In real mode, this would be determined by the smart contract or backend VRF
        const crashPoint = 1 + Math.random() * (Math.random() > 0.8 ? 8 : 3);

        intervalRef.current = setInterval(() => {
            // Smoother, more dynamic climb
            const increment = 0.01 * Math.pow(multiplierRef.current, 0.5);
            multiplierRef.current += increment;
            setMultiplier(Number(multiplierRef.current.toFixed(2)));

            if (multiplierRef.current >= targetMultiplier && status === 'running') {
                cashOut('AUTO_TARGET_REACHED');
            }

            if (multiplierRef.current >= crashPoint) {
                crash();
            }
        }, 60); // Faster updates for smoother feel
    };

    const crash = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsCrashed(true);
        setStatus('crashed');
        setIsProcessing(false);
    };

    const cashOut = (reason: string = 'MANUAL_EXTRACTION') => {
        if (status !== 'running') return;
        if (intervalRef.current) clearInterval(intervalRef.current);

        setCashOutValue(multiplierRef.current);
        setStatus('cashed_out');
        setIsProcessing(false);

        if (reason === 'MANUAL_EXTRACTION') {
            toast.success("Manual Extraction Successful!", {
                description: `Cashed out at ${multiplierRef.current.toFixed(2)}x`
            });
        }
    };

    const currencyLabel = isRealMode ? "SC" : "GC";

    return (
        <div className="space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] mb-2",
                        isRealMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                    )}
                >
                    {isRealMode ? <ShieldCheck className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    {isRealMode ? "Promotional Play (Win SC)" : "Standard Play (Fun Only)"}
                </motion.div>
                <h1 className="text-5xl md:text-7xl font-display font-black italic uppercase tracking-tight text-white">
                    Cyber <span className="text-emerald-500 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">Crash</span>
                </h1>
                <p className="text-white/40 text-sm md:text-base leading-relaxed uppercase tracking-widest font-medium">
                    Watch the multiplier climb. Cash out {isRealMode ? "Sweepstakes Coins" : "Gold Coins"} before the <span className="text-red-500 font-bold">System Overload</span>.
                </p>
            </div>

            <div className="relative">
                <BetControls amount={amount} setAmount={setAmount} disabled={status === 'running'} currencyLabel={currencyLabel} />

                <div className="flex flex-col items-center gap-6 mb-10">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
                        <div className="h-1 w-8 rounded-full bg-white/5" />
                        Risk Matrix: <span className={isRealMode ? "text-emerald-500" : "text-blue-500"}>Dynamic</span>
                        <div className="h-1 w-8 rounded-full bg-white/5" />
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40 pl-4">Target:</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.1"
                                min="1.1"
                                value={targetMultiplier}
                                onChange={(e) => setTargetMultiplier(parseFloat(e.target.value) || 1.1)}
                                disabled={status === 'running'}
                                className="bg-transparent border-none text-white font-mono font-bold w-16 text-center focus:outline-none"
                            />
                            <span className="text-emerald-500 font-bold pr-2">X</span>
                        </div>
                        <button
                            onClick={() => setTargetMultiplier(2.0)}
                            disabled={status === 'running'}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all",
                                targetMultiplier === 2.0 ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-white/5 text-white/40 hover:text-white"
                            )}
                        >
                            2.0X
                        </button>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* The Multiplier Visualizer */}
                    <div className="relative aspect-[21/9] rounded-[3rem] bg-black/40 border-2 border-white/5 overflow-hidden flex flex-col items-center justify-center group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)] opacity-50" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px] opacity-20" />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={status}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative z-10 text-center"
                            >
                                <div className={cn(
                                    "text-8xl md:text-[10rem] font-mono font-black tracking-tighter transition-colors duration-300",
                                    status === 'crashed' ? "text-red-500" : status === 'cashed_out' ? "text-emerald-400" : "text-white"
                                )}>
                                    {multiplier.toFixed(2)}x
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 mt-4">
                                    {status === 'idle' && "STANDBY_READY"}
                                    {status === 'running' && "MULTIPLICATION_ACTIVE"}
                                    {status === 'crashed' && "SYSTEM_CRITICAL_FAILURE"}
                                    {status === 'cashed_out' && "EXTRACTION_SUCCESSFUL"}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        <div className="absolute inset-0 pointer-events-none">
                            <div className="h-1/2 w-full bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent animate-[scan_4s_linear_infinite]" />
                        </div>
                    </div>

                    {/* Action Controls */}
                    <div className="max-w-md mx-auto space-y-6">
                        {status === 'running' ? (
                            <Button
                                onClick={() => cashOut()}
                                className="w-full h-24 bg-emerald-500 text-black hover:bg-emerald-400 font-black text-xl uppercase tracking-widest rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.4)] transition-all active:scale-95"
                            >
                                Cash Out @ {(amount * multiplier).toFixed(1)} {currencyLabel}
                            </Button>
                        ) : (
                            <div className="space-y-4">
                                <Button
                                    onClick={startRound}
                                    disabled={isProcessing}
                                    className="w-full h-24 bg-white text-black hover:bg-emerald-500 font-black text-xl uppercase tracking-widest rounded-3xl transition-all active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                                >
                                    Start Sequence
                                </Button>
                                {status === 'cashed_out' && (
                                    <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                        <div className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-1">Profit Secured</div>
                                        <div className="text-2xl font-black text-white">+{(amount * (cashOutValue || 0)).toFixed(2)} {currencyLabel}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                                <AlertCircle className="h-3 w-3" /> Technical Analysis
                            </div>
                            <p className="text-[10px] text-white/40 leading-relaxed uppercase tracking-widest text-center">
                                Extract funds before the system crashes. Multipliers climb exponentially but risk increases every millisecond.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
