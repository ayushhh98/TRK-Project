"use client";

import { useState } from "react";
import { NumberGuessInterface } from "./NumberGuessInterface";
import { useWallet } from "@/components/providers/WalletProvider";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dices, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function PracticeGame() {
    const {
        isRealMode,
        practiceBalance,
        realBalances,
        placeEntry,
    } = useWallet();

    const [isProcessing, setIsProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<{ won: boolean; number: number; pick: number; hash: string; amount: number } | null>(null);

    const currencyLabel = "USDT"; // Practice mode visual is USDT

    const handlePlaceEntry = async (prediction: number, amount: number) => {
        if (isProcessing) return;

        const currentBalance = isRealMode
            ? realBalances.game // Use 'game' balance for real mode if enabled later
            : parseFloat(practiceBalance);

        if (amount < 1.0) {
            toast.warning(`Minimum bet is 1.0 ${currencyLabel}`);
            return;
        }

        if (currentBalance < amount) {
            toast.error(`Insufficient ${isRealMode ? 'Relay Balance' : 'Practice Points'}!`);
            return;
        }

        setIsProcessing(true);
        setLastResult(null);

        try {
            // Force gameType 'guess' which we added to backend
            const res = await placeEntry(amount, prediction, 'guess');

            setLastResult({
                won: res.won,
                number: res.luckyNumber ?? (prediction === 7 ? 0 : 7), // Fallback if null
                pick: prediction,
                hash: res.hash,
                amount
            });

        } catch (e: any) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-10 max-w-3xl mx-auto">
            {/* TRK Game Header & Practice Balance */}
            <div className="flex flex-col items-center justify-center space-y-6 pt-4">
                <h1 className="text-2xl md:text-3xl font-black text-yellow-400 tracking-wide">
                    TRK Game
                </h1>

                <div className="relative group">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-2xl group-hover:bg-blue-500/30 transition-all" />
                    <div className="relative border-2 border-blue-500/40 bg-black/50 backdrop-blur-md rounded-2xl px-8 py-3 flex flex-col items-center text-center shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-1">
                            <Dices className="h-3 w-3" />
                            <span>Practice Mode</span>
                        </div>
                        <div className="text-3xl font-black text-blue-400 flex items-baseline gap-2">
                            {parseFloat(practiceBalance || "0").toFixed(2)}
                            <span className="text-sm font-bold text-blue-400/60 uppercase tracking-widest">USDT</span>
                        </div>
                    </div>
                </div>
            </div>

            <NumberGuessInterface
                onPlaceEntry={handlePlaceEntry}
                isProcessing={isProcessing}
                lastResult={lastResult}
                currencyLabel={currencyLabel}
            />
        </div>
    );
}
