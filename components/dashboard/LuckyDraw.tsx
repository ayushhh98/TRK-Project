"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Gift, Zap, Users, Loader2, Sparkles, Trophy, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { socket } from "@/components/providers/Web3Provider";

interface Winner {
    wallet: string;
    prize: string;
    rank: string;
    timestamp?: string;
}

export function LuckyDraw() {
    const { token, realBalances, refreshUser } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<any>(null);
    const [winners, setWinners] = useState<Winner[]>([]);
    const [isBuying, setIsBuying] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
            const res = await fetch(`${apiBase}/api/lucky-draw/status`);
            const data = await res.json();
            if (data.status === 'success') {
                setStatus(data.data);
                setWinners(data.data.recentWinners || []);
            }
        } catch (error) {
            console.error("Failed to fetch Lucky Draw status", error);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Poll every 30s as fallback

        // Listen for Real-Time WINNER Events
        const s = socket;
        if (s) {
            const handleWinner = (winner: Winner) => {
                setWinners(prev => [winner, ...prev].slice(0, 10));
                toast.success(`JACKPOT! ${winner.wallet.slice(0, 6)}... won ${winner.prize}!`, {
                    icon: <Trophy className="h-5 w-5 text-amber-500" />
                });
                fetchStatus(); // Refresh progress
                refreshUser(); // Sync balance if user was the winner
            };

            s.on('lucky_draw_winner', handleWinner);
            return () => {
                s.off('lucky_draw_winner', handleWinner);
                clearInterval(interval);
            };
        }

        return () => clearInterval(interval);
    }, [fetchStatus, refreshUser]);

    const handleBuyTicket = async () => {
        if (!token) {
            toast.error("Authentication required to buy tickets.");
            return;
        }

        setIsBuying(true);
        try {
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
            const res = await fetch(`${apiBase}/api/lucky-draw/buy-ticket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ quantity: 1 })
            });

            const data = await res.json();
            if (data.status === 'success') {
                toast.success("Ticket Protocol Initiated! Good luck.");
                fetchStatus();
                refreshUser();
            } else {
                toast.error(data.message || "Purchase failed.");
            }
        } catch (error) {
            toast.error("Network instability detected.");
        } finally {
            setIsBuying(false);
        }
    };

    const progress = status ? (status.ticketsSold / status.totalTickets) * 100 : 0;

    return (
        <Card className="h-full bg-black/40 border-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden group hover:border-purple-500/50 transition-all duration-500 hover:shadow-[0_0_50px_rgba(168,85,247,0.15)] relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardContent className="p-8 space-y-6 relative z-10">
                <div className="flex justify-between items-start">
                    <div className="h-14 w-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                        <Gift className="h-7 w-7" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-mono font-bold text-purple-500 uppercase tracking-widest">
                            Round #{status?.currentRound || 142}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-bold animate-pulse">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            LIVE FEED ACTIVE
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-display font-bold text-white group-hover:text-purple-400 transition-colors">Lucky Draw</h3>
                        <Sparkles className="h-4 w-4 text-amber-500 animate-bounce" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Provably fair jackpots. <span className="text-white font-bold">1 in 10 Wins</span> guaranteed by the TRK protocol.
                    </p>
                </div>

                {/* Live Winner Ticker */}
                <div className="bg-black/60 border border-white/5 rounded-xl p-4 overflow-hidden h-[120px] relative">
                    <div className="absolute top-2 left-4 text-[9px] font-black uppercase text-white/30 tracking-widest flex items-center gap-1">
                        <History className="h-3 w-3" /> Recent Extractions
                    </div>
                    <div className="mt-4 space-y-2">
                        <AnimatePresence mode="popLayout">
                            {winners.length > 0 ? winners.slice(0, 3).map((w, i) => (
                                <motion.div
                                    key={w.wallet + i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center justify-between text-xs"
                                >
                                    <span className="font-mono text-purple-400">{w.wallet.slice(0, 6)}...{w.wallet.slice(-4)}</span>
                                    <span className="font-bold text-emerald-500">+{w.prize}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{w.rank}</span>
                                </motion.div>
                            )) : (
                                <div className="text-center py-4 text-white/20 text-[10px] italic">Scanning blockchain for winners...</div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                </div>

                {/* Progress Bar */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Jackpot Fill</div>
                            <div className="text-lg font-mono font-bold text-white">{status?.ticketsSold || 0} <span className="text-xs text-white/40">/ {status?.totalTickets || 10000}</span></div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Probability</div>
                            <div className="text-lg font-mono font-bold text-purple-500">10.0%</div>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <motion.div
                            className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1 }}
                        />
                    </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex gap-3">
                    <Button
                        onClick={handleBuyTicket}
                        disabled={isBuying}
                        className="flex-1 bg-purple-500 text-white hover:bg-purple-400 font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all"
                    >
                        {isBuying ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Get Ticket <Zap className="h-3 w-3 ml-2 fill-current" /></>}
                    </Button>
                    <div className="flex flex-col justify-center px-4 bg-white/5 rounded-xl border border-white/5">
                        <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">Entry</span>
                        <span className="text-xs font-mono font-bold text-white">{status?.ticketPrice || 10} <span className="text-[10px] text-purple-400">SC</span></span>
                    </div>
                </div>
            </CardContent>

            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </Card>
    );
}
