"use client";

import { useState } from "react";
import { NumberGuessInterface } from "./NumberGuessInterface";
import { useWallet } from "@/components/providers/WalletProvider";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Dices, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function PracticeGame({ variant = 'dice' }: { variant?: "dice" | "crash" | "spin" | "mines" | "plinko" | "matrix" | "guess" }) {
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
            // Use the variant passed from the lobby
            const res = await placeEntry(amount, prediction, variant as any);

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
        <div className="max-w-3xl mx-auto pt-6">

            <NumberGuessInterface
                onPlaceEntry={handlePlaceEntry}
                isProcessing={isProcessing}
                lastResult={lastResult}
                currencyLabel={currencyLabel}
            />
        </div>
    );
}
