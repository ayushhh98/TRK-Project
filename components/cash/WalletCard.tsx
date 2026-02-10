"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowUpRight, Wallet, RefreshCw, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletCardProps {
    type: "cash" | "game" | "cashback" | "lucky" | "external";
    balance: number | string;
    onWithdraw?: () => void;
    onDeposit?: () => void;
    labelOverride?: string;
    tagOverride?: string;
    hideBalance?: boolean;
}

export function WalletCard({ type, balance, onWithdraw, onDeposit, labelOverride, tagOverride, hideBalance }: WalletCardProps) {
    const config = {
        cash: {
            label: "Reward_Vault",
            color: "text-emerald-400",
            glow: "bg-emerald-500/20",
            border: "border-emerald-500/30",
            icon: Wallet,
            tag: "Redeemable"
        },
        game: {
            label: "Active_Capital",
            color: "text-blue-400",
            glow: "bg-blue-500/20",
            border: "border-blue-500/30",
            icon: Zap,
            tag: "In_Play"
        },
        cashback: {
            label: "Recovery_Pool",
            color: "text-indigo-400",
            glow: "bg-indigo-500/20",
            border: "border-indigo-500/30",
            icon: RefreshCw,
            tag: "Protection"
        },
        lucky: {
            label: "Jackpot_Buffer",
            color: "text-amber-400",
            glow: "bg-amber-500/20",
            border: "border-amber-500/30",
            icon: ShieldCheck,
            tag: "Auto_Fund"
        },
        external: {
            label: labelOverride || "External_Wallet",
            color: "text-white",
            glow: "bg-white/10",
            border: "border-white/20",
            icon: Wallet,
            tag: tagOverride || "On-Chain"
        }
    };

    const theme = config[type];
    const Icon = theme.icon;

    return (
        <motion.div
            whileHover={{ y: -5, scale: 1.02 }}
            className="group relative"
        >
            {/* Background Glow */}
            <div className={cn("absolute inset-0 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10 rounded-3xl", theme.glow)} />

            <Card className={cn(
                "relative overflow-hidden bg-black/40 backdrop-blur-3xl border-0 ring-1 ring-white/10 transition-all duration-500",
                "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/5 before:to-transparent",
                "after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent"
            )}>
                {/* Metallic Border Overlay */}
                <div className={cn("absolute inset-0 opacity-20 group-hover:opacity-50 transition-opacity border-l border-t", theme.border)} />

                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Icon className={cn("h-4 w-4", theme.color)} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{theme.label}</span>
                            </div>
                            <h3 className="text-xs font-bold text-white/20 font-mono tracking-tighter">PROTO_ID_{type.toUpperCase()}_v1</h3>
                        </div>
                        <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest bg-white/5 border border-white/10", theme.color)}>
                            {theme.tag}
                        </div>
                    </div>

                    <div className="relative mb-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-baseline gap-2"
                        >
                            <span className="text-3xl font-display font-black text-white tracking-tighter leading-none">
                                {hideBalance ? "••••" : (typeof balance === 'number'
                                    ? balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : balance
                                )}
                            </span>
                            {!balance.toString().includes('USDT') && !balance.toString().includes('BNB') && !balance.toString().includes('SC') && !balance.toString().includes('GC') && (
                                <span className="text-xs font-bold text-white/30 uppercase tracking-widest">
                                    {type === 'cash' || type === 'external' ? 'USDT' : 'SC'}
                                </span>
                            )}
                        </motion.div>

                        {/* Interactive scanline effect on hover */}
                        <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-white/5 overflow-hidden">
                            <motion.div
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className={cn("w-1/2 h-full opacity-50", theme.color === "text-emerald-400" ? "bg-emerald-500" : theme.color === "text-blue-400" ? "bg-blue-500" : theme.color === "text-indigo-400" ? "bg-indigo-500" : "bg-amber-500")}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 relative z-10">
                        {onDeposit && (
                            <Button
                                onClick={onDeposit}
                                className="flex-1 h-10 bg-white text-black hover:bg-white/90 font-black text-[10px] tracking-widest uppercase rounded-none transition-transform active:scale-95"
                            >
                                Re_Deposit
                            </Button>
                        )}
                        {onWithdraw && (
                            <Button
                                onClick={onWithdraw}
                                disabled={typeof balance === 'number' ? balance <= 0 : false}
                                variant="outline"
                                className="flex-1 h-10 border-white/10 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] tracking-widest uppercase rounded-none transition-transform active:scale-95 disabled:opacity-30"
                            >
                                Redeem
                                <ArrowUpRight className="ml-2 h-3 w-3 opacity-50" />
                            </Button>
                        )}
                    </div>
                </CardContent>

                {/* Cybernetic Accent */}
                <div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none opacity-10">
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
                        <path d="M0 100 L100 0 L100 100 Z" />
                    </svg>
                </div>
            </Card>
        </motion.div>
    );
}
