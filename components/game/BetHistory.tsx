"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Clock,
    History,
    ChevronRight,
    ExternalLink,
    Dices,
    TrendingUp,
    Disc,
    Gem,
    LayoutGrid,
    CheckCircle2,
    XCircle,
    Calendar,
    BrainCircuit
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDistanceToNow } from "date-fns";

interface HistoryItem {
    id: string;
    gameType: 'dice' | 'crash' | 'spin' | 'mines' | 'plinko' | 'matrix';
    amount: number;
    prediction: string | number;
    won: boolean;
    payout: number;
    timestamp: string;
    hash?: string;
}

interface BetHistoryProps {
    history: HistoryItem[];
    className?: string;
}

const gameIcons = {
    dice: { icon: Dices, color: 'text-primary' },
    crash: { icon: TrendingUp, color: 'text-emerald-500' },
    spin: { icon: Disc, color: 'text-purple-500' },
    mines: { icon: Gem, color: 'text-amber-500' },
    plinko: { icon: LayoutGrid, color: 'text-cyan-500' },
    matrix: { icon: BrainCircuit, color: 'text-indigo-500' },
};

export function BetHistory({ history, className }: BetHistoryProps) {
    // Filter history to only show last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentHistory = history.filter(item => new Date(item.timestamp) > thirtyDaysAgo);

    return (
        <div className={cn("space-y-6", className)}>
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <History className="h-5 w-5 text-white/60" />
                    </div>
                    <div>
                        <h3 className="text-xl font-display font-black italic uppercase text-white leading-tight">Extraction History</h3>
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Protocol Logs • Last 30 Days</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
                    <Calendar className="h-3 w-3 text-white/20" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Data Retention: 30D</span>
                </div>
            </div>

            <div className="grid gap-3">
                <AnimatePresence mode="popLayout">
                    {recentHistory.length > 0 ? (
                        recentHistory.map((item, idx) => {
                            const Meta = gameIcons[item.gameType as keyof typeof gameIcons] || gameIcons.dice;
                            return (
                                <motion.div
                                    key={item.id || idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    <div className="group relative overflow-hidden p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300">
                                        <div className="relative flex items-center justify-between gap-6">
                                            {/* Game Identification */}
                                            <div className="flex items-center gap-4 min-w-[180px]">
                                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 transition-all group-hover:scale-110", Meta.color)}>
                                                    <Meta.icon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Protocol</div>
                                                    <div className="text-sm font-display font-black italic uppercase text-white truncate max-w-[100px]">
                                                        {item.gameType} 6X
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Prediction/Node */}
                                            <div className="hidden md:block">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Target Node</div>
                                                <div className="text-sm font-mono font-bold text-white/60">
                                                    #{item.prediction}
                                                </div>
                                            </div>

                                            {/* Stake & Payout */}
                                            <div className="flex-1 max-w-[140px]">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1 text-center">Extraction Flow</div>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-sm font-mono font-bold text-white/40">{item.amount}</span>
                                                    <ChevronRight className="h-3 w-3 text-white/10" />
                                                    <span className={cn(
                                                        "text-sm font-mono font-bold",
                                                        item.won ? "text-primary drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]" : "text-white/20"
                                                    )}>
                                                        {item.won ? `+${item.payout}` : '0.00'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status & Hash */}
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Verification</div>
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
                                                        item.won ? "text-emerald-500" : "text-white/20"
                                                    )}>
                                                        {item.won ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                        {item.won ? 'SECURED' : 'DENIED'}
                                                    </div>
                                                </div>

                                                <div className="h-10 w-px bg-white/5 hidden sm:block" />

                                                <div className="text-right hidden sm:block min-w-[100px]">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">Timestamp</div>
                                                    <div className="text-[10px] font-mono text-white/30 flex items-center gap-1 justify-end">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                                    </div>
                                                </div>

                                                {item.hash && (
                                                    <a
                                                        href={`https://bscscan.com/tx/${item.hash}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 hover:border-white/20 text-white/20 hover:text-white transition-all"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Background Scanline Pattern */}
                                        <div className="absolute inset-0 bg-transparent bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] opacity-10 pointer-events-none" />
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="py-20 text-center space-y-4 rounded-[2.5rem] border-2 border-dashed border-white/5 bg-white/[0.01]">
                            <div className="h-20 w-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto opacity-20">
                                <History className="h-10 w-10" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase tracking-widest text-white/40">No Extractions Detected</h4>
                                <p className="text-[10px] text-white/20 font-medium uppercase tracking-widest">Protocol logs are clear. Begin your mission to generate data.</p>
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {recentHistory.length > 10 && (
                <div className="flex justify-center pt-4">
                    <button className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-primary hover:text-black transition-all">
                        Load Full Protocol Logs
                    </button>
                </div>
            )}
        </div>
    );
}
