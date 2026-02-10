"use client";

import { useState } from "react";
import { BetControls } from "./BetControls";
import { GameInterface } from "./GameInterface";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Dices, ShieldCheck } from "lucide-react";

import { useWallet } from "@/components/providers/WalletProvider";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DiceGameProps {
    // Props are now optional
}

export function DiceGame({ }: DiceGameProps) {
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
    const [lastResult, setLastResult] = useState<{ won: boolean; number: number; pick: number; hash: string; amount: number } | null>(null);

    const currencyLabel = isRealMode ? "SC" : "GC"; // SC = Sweepstakes Coins, GC = Gold Coins (Practice)

    const handlePlaceEntry = async (prediction: number) => {
        if (isProcessing) return;

        const currentBalance = isRealMode
            ? realBalances.totalUnified
            : parseFloat(practiceBalance);

        if (amount < 0.5) {
            toast.warning(`Minimum bet is 0.5 ${currencyLabel}`);
            return;
        }
        if (currentBalance < amount) {
            toast.error(`Insufficient ${isRealMode ? 'Sweepstakes Coins' : 'Gold Coins'}!`, {
                description: isRealMode ? "Get a Membership Package to earn more SC." : "Claim your Daily Free Credits.",
                action: isRealMode ? {
                    label: "Get Membership",
                    onClick: () => router.push("/membership")
                } : {
                    label: "Claim Free",
                    onClick: () => router.push("/free-credits")
                }
            });
            return;
        }

        setIsProcessing(true);
        setLastResult(null);

        try {
            let won = false;
            let hash = "";

            if (isRealMode) {
                // Internal Balance bet (Promotional Play)
                const res = await participate(amount, prediction, 'dice');
                won = res.won;
                hash = "PROMO_TX";
            } else {
                const res = await placeEntry(amount, prediction, 'dice');
                won = res.won;
                hash = res.hash;
            }

            let resultNumber = prediction;
            if (!won) {
                const others = [1, 2, 3, 4, 5, 6].filter(n => n !== prediction);
                resultNumber = others[Math.floor(Math.random() * others.length)];
            }

            setLastResult({ won, number: resultNumber, pick: prediction, hash, amount });
        } catch (e: any) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-16">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] mb-2",
                        isRealMode ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-primary/10 border-primary/20 text-primary"
                    )}
                >
                    {isRealMode ? <ShieldCheck className="h-3 w-3" /> : <Dices className="h-3 w-3" />}
                    {isRealMode ? "Promotional Play (Win SC)" : "Standard Play (Fun Only)"}
                </motion.div>

                <h1 className="text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/50">
                        Cyber
                    </span>
                    <span className="text-primary ml-4 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]">
                        Dice
                    </span>
                </h1>

                <p className="text-white/40 max-w-md mx-auto text-sm font-medium leading-relaxed">
                    Select your winning side. {isRealMode ? "Use Sweepstakes Coins (SC) to participate in promotional games." : "Play for fun with Gold Coins (GC). No purchase necessary."}
                </p>
            </div>

            <div className="relative">



                <div className="flex items-center justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-white/20 mb-10">
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-8 rounded-full bg-white/5" />
                        Min Entry: <span className={isRealMode ? "text-green-500" : "text-primary"}>0.5 SC</span>
                        <div className="h-1 w-8 rounded-full bg-white/5" />
                    </div>
                </div>

                <GameInterface
                    onPlaceEntry={handlePlaceEntry}
                    isProcessing={isProcessing}
                    lastResult={lastResult}
                />
            </div>
        </div>
    );
}
