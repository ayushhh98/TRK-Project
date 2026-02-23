"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { X, ArrowUpRight, ShieldAlert, BadgeCheck } from "lucide-react";
import { useWallet } from "@/components/providers/WalletProvider";
import { useSocket } from "@/components/providers/Web3Provider";
import { PausedOverlay } from "@/components/ui/PausedOverlay";
import { toast } from "sonner";

// Human-readable labels for wallet types
const WALLET_LABELS: Record<string, string> = {
    game: "Game Balance",
    cash: "Cash Balance",
    directLevel: "Direct Level Income",
    winners: "Winners Income",
    teamWinners: "Winners Level Income",
    cashback: "Losers Cashback",
    roiOnRoi: "Losers ROI on ROI",
    club: "Club Income",
    lucky: "Lucky Draw Income",
};

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedWallet?: string | null;
}

export function WithdrawalModal({ isOpen, onClose, preSelectedWallet }: WithdrawalModalProps) {
    const { withdraw, realBalances, user } = useWallet();
    const [amount, setAmount] = useState<string>("5");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedWallet, setSelectedWallet] = useState<string>(preSelectedWallet || "game");

    // Sync selectedWallet when the prop changes (e.g., user clicks EXTRACT on a different income stream)
    useEffect(() => {
        if (preSelectedWallet) {
            setSelectedWallet(preSelectedWallet);
        }
    }, [preSelectedWallet]);

    const maxAmount = realBalances[selectedWallet as keyof typeof realBalances] || 0;
    const walletLabel = WALLET_LABELS[selectedWallet] || selectedWallet;

    const socket = useSocket();
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (!socket) return;

        const handlePause = (data: { paused: boolean }) => {
            setIsPaused(data.paused);
            // Removed auto-close to show overlay instead
        };

        socket.on('system:withdrawals_paused', handlePause);
        return () => {
            socket.off('system:withdrawals_paused', handlePause);
        };
    }, [socket]);

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isPaused) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 5) {
            toast.error("Minimum withdrawal is 5 USDT");
            return;
        }
        if (numAmount > maxAmount) {
            toast.error("Insufficient balance");
            return;
        }

        const dailyUsed = user?.withdrawalLimits?.dailyWithdrawalTotal || 0;
        if (dailyUsed + numAmount > 5000) {
            toast.error(`Exceeds 5,000 USDT daily limit. Remaining: ${5000 - dailyUsed} USDT`);
            return;
        }

        setIsSubmitting(true);
        try {
            await withdraw(numAmount, selectedWallet);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="absolute inset-0 bg-red-500/10 blur-3xl -z-10" />

                <Card className="border-0 bg-[#0A0A0A] ring-1 ring-white/10 rounded-[2rem] overflow-hidden relative">
                    {isPaused && <PausedOverlay title="Withdrawals Paused" message="Withdrawals are temporarily suspended by the administrator." />}
                    <div className="relative border-b border-white/5 p-8 flex items-center justify-between overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent pointer-events-none" />

                        <div className="relative z-10 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center border border-red-500/30 bg-red-500/10 text-red-500">
                                <ArrowUpRight className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-1">Extraction_Node</h2>
                                <h3 className="text-xl font-display font-black tracking-tighter uppercase">USDT_WITHDRAWAL</h3>
                                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1">{walletLabel}</p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="h-10 w-10 border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors rounded-lg"
                        >
                            <X className="h-4 w-4 text-white/40" />
                        </button>
                    </div>

                    <CardContent className="p-8 space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Available_Assets</label>
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">{maxAmount.toFixed(2)} USDT</span>
                            </div>

                            <div className="relative group">
                                <Input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    max={maxAmount}
                                    className="h-16 bg-white/[0.03] border-white/10 rounded-2xl text-center text-2xl font-mono font-bold text-white focus:border-red-500/50 focus:ring-0 transition-all pr-16"
                                    placeholder="0.00"
                                />
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-white/20 uppercase tracking-widest">
                                    USDT
                                </div>
                                <button
                                    onClick={() => setAmount(maxAmount.toString())}
                                    className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors"
                                >
                                    MAX
                                </button>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                                <ShieldAlert className="h-3 w-3 text-amber-500" /> Extraction Protocol
                            </div>

                            <div className="space-y-1 text-[9px] font-bold text-white/30 uppercase tracking-tighter">
                                <div>• Minimum: 5.00 USDT</div>
                                <div>• Daily Max: 5,000.00 USDT</div>
                                <div>• Remaining Today: {Math.max(0, 5000 - (user?.withdrawalLimits?.dailyWithdrawalTotal || 0)).toFixed(2)} USDT</div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-white/5">
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-white/30">GROSS AMOUNT</span>
                                    <span className="text-white/60">{parseFloat(amount || "0").toFixed(2)} USDT</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold">
                                    <span className="text-white/30">SUSTAINABILITY FEE (10%)</span>
                                    <span className="text-red-500">-{(parseFloat(amount || "0") * 0.1).toFixed(2)} USDT</span>
                                </div>
                                <div className="flex justify-between text-xs font-black pt-2 border-t border-white/10">
                                    <span className="text-white/40 uppercase">ESTIMATED NET</span>
                                    <span className="text-emerald-500">{(parseFloat(amount || "0") * 0.9).toFixed(2)} USDT</span>
                                </div>
                            </div>

                            <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-widest pt-2">
                                Standard withdrawals are processed within 24 hours. Matrix & Reward extractions may require additional identity verification.
                            </p>
                        </div>

                        <Button
                            onClick={handleWithdraw}
                            disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > maxAmount || isPaused}
                            className={`w-full h-16 bg-white text-black hover:bg-red-500 hover:text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all active:scale-[0.98] shadow-2xl ${isPaused ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                        >
                            {isSubmitting ? "PROCESSING..." : isPaused ? "WITHDRAWALS PAUSED" : "REQUEST_EXTRACTION"}
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
