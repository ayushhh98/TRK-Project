"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { X, ArrowRightLeft, Zap, ShieldCheck } from "lucide-react";
import { useWallet } from "@/components/providers/WalletProvider";
import { toast } from "sonner";
import { depositAPI } from "@/lib/api";

interface PracticeTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PracticeTransferModal({ isOpen, onClose }: PracticeTransferModalProps) {
    const { user, practiceBalance, refreshUser } = useWallet();
    const [amount, setAmount] = useState<string>("1.0");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const maxTransferable = (user?.activation?.totalPracticeVolume || 0) * 0.01;
    const canTransfer = user?.activation?.canTransferPractice;

    const handleTransfer = async () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error("Invalid amount");
            return;
        }

        if (numAmount > parseFloat(practiceBalance?.toString() || "0")) {
            toast.error("Insufficient practice balance");
            return;
        }

        if (numAmount > 10) {
            toast.error("Maximum 10 USDT per transfer");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await depositAPI.transferPractice(numAmount);
            if (res.status === 'success') {
                toast.success(`Successfully transferred ${numAmount} USDT to Game Wallet!`);
                await refreshUser();
                onClose();
            } else {
                toast.error(res.message || "Transfer failed");
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Transfer failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                <Card className="bg-[#0A0A0A] border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <ArrowRightLeft className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">Practice Bridge</h3>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">To Real Wallet</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <X className="h-4 w-4 text-white/40" />
                        </button>
                    </div>

                    <CardContent className="p-6 space-y-6">
                        {!canTransfer ? (
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold flex flex-col items-center text-center gap-3">
                                <ShieldCheck className="h-8 w-8 opacity-50" />
                                <p>Bridge Locked. Requires Tier 2 Activation and 100+ Practice Volume.</p>
                                <Button variant="outline" className="h-8 text-[10px] border-amber-500/30 text-amber-500" onClick={onClose}>
                                    CLOSE
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Practice Balance</span>
                                        <span className="text-[10px] font-black text-emerald-500">{parseFloat(practiceBalance?.toString() || "0").toFixed(2)} USDT</span>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="h-14 bg-white/5 border-white/10 rounded-xl text-center text-xl font-mono font-bold"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20">USDT</div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[1, 5, 10].map(val => (
                                            <button
                                                key={val}
                                                onClick={() => setAmount(val.toString())}
                                                className="h-8 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-white/60 hover:bg-white/10 transition-all"
                                            >
                                                {val} USDT
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                        <Zap className="h-3 w-3" /> Transfer Rules
                                    </div>
                                    <ul className="text-[9px] text-white/40 space-y-1 uppercase font-bold">
                                        <li>• Max Transfer: 1% of Practice Volume</li>
                                        <li>• Bridge Cap: 10.00 USDT / Transfer</li>
                                        <li>• Direct to Game Wallet</li>
                                    </ul>
                                </div>

                                <Button
                                    onClick={handleTransfer}
                                    disabled={isSubmitting || parseFloat(amount) <= 0}
                                    className="w-full h-14 bg-emerald-500 text-black hover:bg-emerald-400 font-black uppercase tracking-widest rounded-xl"
                                >
                                    {isSubmitting ? "BRIDGING..." : "INITIATE TRANSFER"}
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
