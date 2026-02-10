"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { X, ShieldCheck, Lock, Fingerprint, LucideIcon, Cpu, Wallet, AlertCircle, ChevronDown, Check, TrendingUp, Award } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/components/providers/WalletProvider";
import { cn } from "@/lib/utils";

interface RedemptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedWallet?: string | null;
}

const WALLET_TYPES = [
    { id: 'cash', label: 'Reward Hub', tier: 2, icon: Wallet },
    { id: 'game', label: 'Entertainment Vault', tier: 2, icon: Cpu },
    { id: 'winners', label: 'SC Pool', tier: 1, icon: Lock },
    { id: 'directLevel', label: 'Promotion Level', tier: 1, icon: Fingerprint },
    { id: 'roiOnRoi', label: 'Yield Nexus', tier: 2, icon: TrendingUp },
    { id: 'club', label: 'Club Rewards', tier: 2, icon: Award },
    { id: 'cashback', label: 'Rebate Reserve', tier: 2, icon: ShieldCheck },
    { id: 'lucky', label: 'Sweepstakes Treasury', tier: 2, icon: AlertCircle },
] as const;

export function RedemptionModal({ isOpen, onClose, preSelectedWallet }: RedemptionModalProps) {
    const { realBalances, redeem, user } = useWallet();
    const [amount, setAmount] = useState("");
    const [selectedWallet, setSelectedWallet] = useState<typeof WALLET_TYPES[number]>(WALLET_TYPES[0]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'input' | 'authorizing'>('input');

    // Handle pre-selection
    useEffect(() => {
        if (isOpen && preSelectedWallet) {
            const found = WALLET_TYPES.find(w => w.id === preSelectedWallet);
            if (found) setSelectedWallet(found);
        }
    }, [isOpen, preSelectedWallet]);

    // Reset state on close
    useEffect(() => {
        if (!isOpen) {
            setAmount("");
            setStep('input');
            setIsLoading(false);
        }
    }, [isOpen]);

    const balance = realBalances[selectedWallet.id] || 0;
    const activation = user?.activation;

    const isUnlocked = useMemo(() => {
        if (!activation) return false;
        if (selectedWallet.tier === 1) return activation.canWithdrawDirectLevel || activation.canWithdrawWinners;
        if (selectedWallet.tier === 2) return activation.canWithdrawAll;
        return false;
    }, [activation, selectedWallet]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (!val || val <= 0) return;

        if (val < 1) {
            toast.error("Minimum redemption volume is 1 SC");
            return;
        }

        if (val > balance) {
            toast.error("Insufficient depth in selected module");
            return;
        }

        if (!isUnlocked) {
            toast.error(`Tier ${selectedWallet.tier} activation required for this module`);
            return;
        }

        setStep('authorizing');
        setIsLoading(true);

        try {
            const success = await redeem(selectedWallet.id as any, parseFloat(amount));
            if (success) {
                setStep('input');
                onClose();
                setAmount("");
            } else {
                setStep('input');
            }
        } catch (error) {
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
                className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-lg relative z-10"
            >
                {/* Advanced Border Glow */}
                <div className={cn(
                    "absolute inset-0 blur-3xl -z-10 transition-colors duration-500",
                    isUnlocked ? "bg-emerald-500/10" : "bg-red-500/10"
                )} />

                <Card className="border-0 bg-[#0A0A0A] ring-1 ring-white/10 rounded-[2rem] overflow-hidden">
                    {/* Header Protocol */}
                    <div className="relative border-b border-white/5 p-8 flex items-center justify-between overflow-hidden">
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-r pointer-events-none opacity-20",
                            isUnlocked ? "from-emerald-500/20 to-transparent" : "from-red-500/20 to-transparent"
                        )} />

                        <div className="relative z-10 flex items-center gap-4">
                            <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center border transition-colors duration-500",
                                isUnlocked ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-red-500/10 border-red-500/30 text-red-500"
                            )}>
                                <selectedWallet.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-1">Redemption_Engine_{selectedWallet.id.toUpperCase()}</h2>
                                <h3 className="text-xl font-display font-black tracking-tighter uppercase whitespace-nowrap">
                                    {isUnlocked ? "SECURE_PROTOCOL_ACTIVE" : "UPGRADE_REQUIRED"}
                                </h3>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="h-10 w-10 border border-white/10 hover:bg-white/5 flex items-center justify-center transition-colors group rounded-lg"
                        >
                            <X className="h-4 w-4 text-white/40 group-hover:text-white transition-colors" />
                        </button>
                    </div>

                    <CardContent className="p-8">
                        <AnimatePresence mode="wait">
                            {step === 'input' ? (
                                <motion.form
                                    key="input"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleSubmit}
                                    className="space-y-8"
                                >
                                    {/* Wallet Selector */}
                                    <div className="relative">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 block">Source_Module</label>
                                        <button
                                            type="button"
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="w-full h-16 bg-white/5 border border-white/10 px-6 flex items-center justify-between group hover:border-white/20 transition-all rounded-xl"
                                        >
                                            <div className="flex items-center gap-4">
                                                <selectedWallet.icon className="h-5 w-5 text-emerald-500" />
                                                <div className="text-left">
                                                    <div className="text-sm font-bold text-white uppercase tracking-tight">{selectedWallet.label}</div>
                                                    <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                                                        Balance: <span className="text-emerald-500">{balance.toFixed(2)}</span> SC
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronDown className={cn("h-4 w-4 text-white/20 group-hover:text-white transition-all", isDropdownOpen && "rotate-180")} />
                                        </button>

                                        <AnimatePresence>
                                            {isDropdownOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-[calc(100%+8px)] inset-x-0 bg-black border border-white/10 rounded-2xl overflow-hidden z-20 shadow-2xl backdrop-blur-3xl"
                                                >
                                                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                                        {WALLET_TYPES.map((type) => {
                                                            const typeBalance = realBalances[type.id] || 0;
                                                            return (
                                                                <button
                                                                    key={type.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedWallet(type);
                                                                        setIsDropdownOpen(false);
                                                                    }}
                                                                    className={cn(
                                                                        "w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0",
                                                                        selectedWallet.id === type.id && "bg-white/10"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center gap-4">
                                                                        <type.icon className={cn("h-4 w-4", selectedWallet.id === type.id ? "text-emerald-500" : "text-white/40")} />
                                                                        <div>
                                                                            <div className="text-xs font-bold text-white uppercase tracking-tight">{type.label}</div>
                                                                            <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">Available: {typeBalance.toFixed(2)} SC</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={cn(
                                                                            "px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter",
                                                                            type.tier === 1 ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                                                        )}>
                                                                            Tier {type.tier}
                                                                        </div>
                                                                        {selectedWallet.id === type.id && <Check className="h-3 w-3 text-emerald-500" />}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Amount Input */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Package_Value</label>
                                            <button
                                                type="button"
                                                onClick={() => setAmount(balance.toString())}
                                                className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 transition-colors underline underline-offset-4"
                                            >
                                                MAX_CAPACITY
                                            </button>
                                        </div>

                                        <div className="relative group">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="h-20 bg-white/5 border-white/10 rounded-2xl text-3xl font-display font-black tracking-tight px-8 focus:ring-0 focus:border-emerald-500/50 transition-all text-white placeholder:text-white/10"
                                                min="1"
                                                max={balance}
                                                step="0.01"
                                            />
                                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-black text-white/10 tracking-widest">SC</div>
                                        </div>
                                    </div>

                                    {!isUnlocked && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                                            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                                            <div className="space-y-1">
                                                <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest">Access_Denied</h4>
                                                <p className="text-[10px] font-bold text-red-500/60 leading-relaxed uppercase tracking-widest">
                                                    Tier {selectedWallet.tier} activation required. Acquire {selectedWallet.tier === 1 ? '10+' : '100+'} SC via Membership to unlock redemption from this module.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        className={cn(
                                            "w-full h-20 font-black text-xs tracking-[0.3em] uppercase rounded-2xl group transition-all",
                                            isUnlocked && balance >= 1
                                                ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                                                : "bg-white/5 text-white/20 border border-white/10 cursor-not-allowed"
                                        )}
                                        disabled={!amount || parseFloat(amount) < 1 || parseFloat(amount) > balance || !isUnlocked || isLoading}
                                    >
                                        {isUnlocked ? "INITIATE_AUTH_SEQUENCE" : `SEC_CLEARANCE_L${selectedWallet.tier}_REQUIRED`}
                                        <Fingerprint className="ml-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                                    </Button>

                                    <div className="flex items-center gap-2 justify-center opacity-30">
                                        <ShieldCheck className="h-3 w-3" />
                                        <span className="text-[8px] font-black tracking-widest uppercase">Encrypted_End_To_End // 256bit_AES</span>
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
                                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500">Processing_Redemption</h3>
                                        <p className="text-[10px] font-bold text-white/30 tracking-widest uppercase animate-pulse">Synchronizing_With_Ecosystem_Ledger...</p>
                                    </div>

                                    <div className="w-full max-w-xs h-1 bg-white/5 overflow-hidden rounded-full">
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
