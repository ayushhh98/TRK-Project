"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { User, Copy, LogOut, Check, ShieldCheck, Wallet } from "lucide-react";
import { useWallet } from "@/components/providers/WalletProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileModalProps {
    children?: React.ReactNode;
    asChild?: boolean;
}

export function ProfileModal({ children, asChild }: ProfileModalProps) {
    const { address, user, disconnect } = useWallet();
    const [copiedAddress, setCopiedAddress] = useState(false);
    const [copiedRef, setCopiedRef] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleCopy = async (text: string, type: 'address' | 'ref' | 'id') => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'address') {
                setCopiedAddress(true);
                setTimeout(() => setCopiedAddress(false), 2000);
            } else if (type === 'ref') {
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
            } else {
                setCopiedId(true);
                setTimeout(() => setCopiedId(false), 2000);
            }
            toast.success("Copied to clipboard");
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    const handleLogout = () => {
        setIsOpen(false);
        disconnect();
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild={asChild}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg bg-gradient-to-b from-zinc-900 to-black border-white/10 text-white backdrop-blur-2xl p-0 overflow-hidden rounded-[2.5rem] shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                
                <div className="p-8 space-y-8 relative z-10">
                    <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                        <DialogTitle className="text-2xl font-display font-black uppercase tracking-[0.2em] flex items-center gap-3">
                            <div className="h-8 w-1 bg-amber-500 rounded-full" />
                            User <span className="text-amber-500">Profile</span>
                        </DialogTitle>
                    </DialogHeader>
    
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        {/* Header / Avatar Section */}
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-all duration-500" />
                                <div className="h-24 w-24 rounded-full bg-zinc-900 border-2 border-white/5 flex items-center justify-center relative z-10 overflow-hidden shadow-2xl">
                                    <ShieldCheck className="h-12 w-12 text-amber-500/40" />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-purple-500/10" />
                                </div>
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                    className="absolute -inset-1 border border-dashed border-amber-500/20 rounded-full" 
                                />
                            </div>
                            <div className="text-center">
                                <div className="text-xl font-black tracking-tight text-white mb-1 uppercase italic">{user?.email || "TRK Member"}</div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                                    <div className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                                    {user?.clubRank || "Standard Node"}
                                </div>
                            </div>
                        </div>
    
                        <div className="grid gap-4">
                            {/* User ID */}
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="space-y-2 group"
                            >
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-amber-500/50 transition-colors">Operational ID</span>
                                    <span className="text-[8px] font-mono text-zinc-700">STRICTLY_PRIVATE</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-amber-500/20 transition-all group/item">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 font-bold text-xs group-hover/item:text-amber-500 transition-colors">
                                        ID
                                    </div>
                                    <code className="text-xs font-mono text-zinc-400 group-hover/item:text-zinc-200 transition-colors truncate flex-1 tracking-tighter">
                                        {user?.id || "Loading..."}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white"
                                        onClick={() => user?.id && handleCopy(user.id, 'id')}
                                        disabled={!user?.id}
                                    >
                                        {copiedId ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </motion.div>
    
                            {/* Wallet Address */}
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-2 group"
                            >
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-emerald-500/50 transition-colors">Liquidity Node</span>
                                    <span className="text-[8px] font-mono text-zinc-700">BSC_NETWORK_VERIFIED</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 transition-all group/item">
                                    <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center text-emerald-500/40 group-hover/item:text-emerald-500 transition-all">
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                    <code className="text-xs font-mono text-zinc-400 group-hover/item:text-zinc-200 transition-colors truncate flex-1 tracking-tighter">
                                        {address || "No Wallet Connected"}
                                    </code>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white"
                                        onClick={() => address && handleCopy(address, 'address')}
                                        disabled={!address}
                                    >
                                        {copiedAddress ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </motion.div>
    
                            {/* Referral Code */}
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-2 group"
                            >
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-amber-500/50 transition-colors">Referral Protocol</span>
                                    <span className="text-[8px] font-mono text-zinc-700">ACTIVE_GROWTH_NODE</span>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-500/[0.03] border border-amber-500/10 hover:border-amber-500/30 transition-all group/item">
                                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-[10px] uppercase">
                                        Ref
                                    </div>
                                    <div className="flex-1 font-mono font-black text-amber-500 text-lg tracking-widest">
                                        {user?.referralCode || "Loading..."}
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 rounded-lg hover:bg-amber-500/10 text-amber-500/50 hover:text-amber-500"
                                        onClick={() => user?.referralCode && handleCopy(user.referralCode, 'ref')}
                                        disabled={!user?.referralCode}
                                    >
                                        {copiedRef ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </motion.div>
                        </div>
    
                        {/* Actions */}
                        <div className="pt-6">
                            <Button
                                onClick={handleLogout}
                                className="w-full bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-black border border-red-500/20 hover:border-red-500 h-16 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] transition-all duration-500 group/logout shadow-[0_0_20px_rgba(239,68,68,0.05)] hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                            >
                                <LogOut className="h-4 w-4 mr-3 group-hover:rotate-12 transition-transform" />
                                Terminate Session
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </DialogContent>

        </Dialog>
    );
}
