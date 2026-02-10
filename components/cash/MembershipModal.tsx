"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { X, ShieldCheck, Wallet, ArrowUpCircle, LucideIcon, Cpu, Fingerprint, Globe, Zap, Landmark, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet } from "@/components/providers/WalletProvider";
import { toast } from "sonner";

interface MembershipModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: number) => Promise<void>;
}

export function MembershipModal({ isOpen, onClose, onConfirm }: MembershipModalProps) {
    const { isConnected, address, connect, usdtBalance, currentChainId } = useWallet();
    const { addresses } = useWallet(); // Assuming I add addresses to the context or use CONTRACTS directly
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'input' | 'manual' | 'authorizing'>('input');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const copyAddress = () => {
        navigator.clipboard.writeText(addresses.GAME);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOneClickDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val < 1.5) {
            toast.warning("Minimum injection is 1.5 USDT");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Ensure Connection
            if (!isConnected) {
                toast.loading("Establishing Secure Link...", { id: "connect_toast" });
                await connect('MetaMask');
                // Wait a moment for state to settle
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // 2. Proceed to Deposit
            setStep('authorizing');
            await onConfirm(val);

            // 3. Success
            onClose();
            setAmount("");
        } catch (error) {
            console.error("Deposit flow failed", error);
            // If error, stay on input or go to manual?
            // For now, stay on input so they can retry or choose manual
            toast.dismiss("connect_toast");
            setStep('input');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg relative z-10"
            >
                <div className="absolute inset-0 bg-emerald-500/10 blur-3xl -z-10" />

                <Card className="border-0 bg-[#0A0A0A] ring-1 ring-white/10 rounded-none overflow-hidden">
                    <div className="relative border-b border-white/5 p-8 flex items-center justify-between overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />

                        <div className="relative z-10 flex items-center gap-4">
                            <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-1">Membership_Bridge</h2>
                                <h3 className="text-xl font-display font-black tracking-tighter">SECURE_PURCHASE</h3>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="h-10 w-10 border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors group"
                        >
                            <X className="h-4 w-4 text-white/40 group-hover:text-white transition-colors" />
                        </button>
                    </div>

                    <CardContent className="p-8">
                        <AnimatePresence mode="wait">
                            {step === 'manual' ? (
                                <motion.div
                                    key="manual"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="space-y-2 mb-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Backup_Link // Manual_Transfer</h4>
                                        <p className="text-sm font-bold text-white/80">Send <span className="text-emerald-500">{amount || "X"} USDT</span> (BSC BEP-20) to address below.</p>
                                    </div>

                                    <div className="flex flex-col items-center gap-6 p-8 bg-white/[0.02] border border-white/10 text-center">
                                        <div className="p-4 bg-white rounded-lg">
                                            {/* Static QR Placeholder - In a real app we'd use a QR library */}
                                            <div className="w-32 h-32 flex items-center justify-center border-2 border-dashed border-black/10">
                                                <QrCode className="h-16 w-16 text-black/20" />
                                            </div>
                                        </div>

                                        <div className="w-full space-y-4">
                                            <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Contract_Address</div>
                                            <div className="flex items-center gap-2 p-4 bg-black border border-white/10 font-mono text-[10px] break-all text-white/60">
                                                {addresses.GAME}
                                                <button
                                                    onClick={copyAddress}
                                                    className="p-2 hover:bg-white/10 transition-colors shrink-0"
                                                >
                                                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[8px] font-black uppercase tracking-widest leading-relaxed">
                                            WARNING: ONLY SEND USDT ON BINANCE SMART CHAIN (BEP-20). ASSETS ON OTHER NETWORKS WILL BE PERMANENTLY LOST.
                                        </div>
                                    </div>

                                    <Button
                                        onClick={onClose}
                                        className="w-full h-16 bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black text-xs tracking-[0.2em] uppercase rounded-none"
                                    >
                                        I_HAVE_SENT_FUNDS
                                    </Button>

                                    <button
                                        onClick={() => setStep('input')}
                                        className="w-full text-[8px] font-black uppercase text-white/20 hover:text-white transition-colors tracking-[0.2em]"
                                    >
                                        [Return_To_Auto_Deposit]
                                    </button>
                                </motion.div>
                            ) : step === 'input' ? (
                                <motion.form
                                    key="input"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleOneClickDeposit}
                                    className="space-y-8"
                                >
                                    <div className="p-4 bg-white/[0.02] border border-white/5 space-y-2">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Step_01 // Package_Selection</h4>
                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                                            Select membership value. Coins and Reward points will be credited upon verification.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Injection_Volume</label>
                                            <div className="text-right">
                                                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">External_Portfolio</div>
                                                <button
                                                    type="button"
                                                    onClick={() => setAmount(usdtBalance.replace(" USDT", ""))}
                                                    className="group flex items-center gap-2 ml-auto"
                                                >
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">{usdtBalance}</span>
                                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 group-hover:bg-emerald-500/20 transition-all">MAX</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            {[50, 100, 500, 1000].map((quickAmount) => (
                                                <button
                                                    key={quickAmount}
                                                    type="button"
                                                    onClick={() => setAmount(quickAmount.toString())}
                                                    className={cn(
                                                        "py-2 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10 hover:border-white/30",
                                                        amount === quickAmount.toString() ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500" : "text-white/40"
                                                    )}
                                                >
                                                    {quickAmount}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="relative group">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="h-16 bg-white/5 border-white/10 rounded-none text-2xl font-display font-black tracking-tight px-6 focus:ring-0 focus:border-emerald-500/50 transition-all"
                                                min="1"
                                                step="0.01"
                                                autoFocus
                                            />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-white/20">SC</div>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className={cn(
                                            "w-full h-16 transition-all font-black text-xs tracking-[0.2em] uppercase rounded-none group",
                                            isConnected ? "bg-emerald-500 text-black hover:bg-emerald-400" : "bg-purple-600 text-white hover:bg-purple-500"
                                        )}
                                        disabled={!amount || parseFloat(amount) <= 0 || isLoading}
                                    >
                                        {isLoading
                                            ? (isConnected ? "TRANSMITTING..." : "INITIALIZING...")
                                            : (isConnected ? "PURCHASE_PACKAGE" : "AUTHENTICATE_&_PURCHASE")}
                                        <ArrowUpCircle className="ml-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </Button>

                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2 opacity-30">
                                            <ShieldCheck className="h-3 w-3" />
                                            <span className="text-[8px] font-black tracking-widest uppercase">MetaMask_Secure</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStep('manual')}
                                            className="text-[8px] font-black uppercase text-white/20 hover:text-white transition-colors tracking-widest"
                                        >
                                            [Manual_Transfer_Link]
                                        </button>
                                    </div>
                                </motion.form>
                            ) : (
                                <motion.div
                                    key="authorizing"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 flex flex-col items-center gap-8"
                                >
                                    <div className="relative">
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                            className="w-24 h-24 border-2 border-dashed border-emerald-500/20 rounded-full"
                                        />
                                        <motion.div
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-0 -m-2 border-2 border-emerald-500/40 rounded-full border-t-transparent"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Cpu className="h-8 w-8 text-emerald-500 animate-pulse" />
                                        </div>
                                    </div>

                                    <div className="text-center space-y-2">
                                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500">Executing_Smart_Contract</h3>
                                        <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase animate-pulse">Requesting_USDT_Approval_&_Deposit_Auth...</p>
                                    </div>

                                    <div className="w-full max-w-xs h-1 bg-white/5 overflow-hidden">
                                        <motion.div
                                            initial={{ x: "-100%" }}
                                            animate={{ x: "100%" }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                            className="w-1/3 h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>

                </Card>
            </motion.div>
        </div>
    );
}
