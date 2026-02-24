"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Gift, Zap, Users, Loader2, Sparkles, Trophy, History, Lock, ShieldCheck, Activity, Globe, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { gameAPI, apiRequest } from "@/lib/api";
import { dedupeByKey, mergeUniqueByKey } from "@/lib/collections";
import { useJackpotSocket } from "@/hooks/useJackpotSocket";
import { cn } from "@/lib/utils";

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
    const [hasMounted, setHasMounted] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const [statusData, winnersData] = await Promise.all([
                gameAPI.getLuckyDrawStatus(),
                apiRequest('/lucky-draw/recent-winners')
            ]);

            if (statusData.status === 'success') {
                setStatus(statusData.data);
            }

            if (winnersData.status === 'success' && Array.isArray(winnersData.data)) {
                setWinners(dedupeByKey(winnersData.data, (w: any) => `${w.wallet}-${w.rank}-${w.timestamp}`));
            }
        } catch (error) {
            console.error("Failed to fetch Lucky Draw data", error);
        }
    }, []);

    const { isConnected } = useJackpotSocket({
        onStatusUpdate: (data) => {
            setStatus((prev: any) => ({
                ...prev,
                ...data,
                recentWinners: data.recentWinners || prev?.recentWinners || []
            }));
            if (Array.isArray(data?.recentWinners)) {
                setWinners(prev =>
                    mergeUniqueByKey(data.recentWinners, prev, (w) => `${w.wallet}-${w.rank}-${w.timestamp}`)
                        .slice(0, 10)
                );
            }

            if (data.drawIsActive !== undefined && status) {
                if (data.drawIsActive && !status.drawIsActive) {
                    toast.success("Jackpot System Online", { icon: <Zap className="h-4 w-4 text-emerald-500" /> });
                } else if (!data.drawIsActive && status.drawIsActive) {
                    toast.warning("Jackpot System Paused", { icon: <Loader2 className="h-4 w-4 text-amber-500" /> });
                }
            }
        },
        onTicketSold: (data) => {
            setStatus((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    ticketsSold: data.ticketsSold,
                };
            });
        },
        onWinnerAnnounced: (winner) => {
            setWinners(prev =>
                mergeUniqueByKey([winner], prev, (w) => `${w.wallet}-${w.rank}-${w.timestamp}`)
                    .slice(0, 10)
            );
            toast.success(`JACKPOT! ${winner.wallet.slice(0, 6)}... won ${winner.prize}!`, {
                icon: <Trophy className="h-5 w-5 text-amber-500" />,
                duration: 8000
            });
            fetchStatus();
            refreshUser();
        },
        onNewRound: (data) => {
            toast.info(`Round ${data.roundNumber} Started!`, { icon: <Sparkles className="h-4 w-4 text-purple-500" /> });
            fetchStatus();
        }
    });

    useEffect(() => {
        setHasMounted(true);
        fetchStatus();
        if (isConnected) return;
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchStatus, isConnected]);

    const handleBuyTicket = async () => {
        if (!token) {
            toast.error("Authentication required to buy tickets.");
            return;
        }

        setIsBuying(true);
        try {
            const data = await gameAPI.buyLuckyDrawTickets(1);
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
        <Card className="h-full bg-black border border-white/10 rounded-[2.5rem] overflow-hidden group hover:border-amber-500/30 transition-all duration-500 shadow-2xl relative font-mono">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,215,0,0.02),rgba(0,255,255,0.01),rgba(255,165,0,0.02))] bg-[length:100%_4px,3px_100%] opacity-40 group-hover:opacity-60 transition-opacity" />

            <CardContent className="p-8 space-y-6 relative z-10">
                {/* Header Section */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all duration-300">
                            <Trophy className="h-8 w-8 animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-white uppercase tracking-[0.1em]">Jackpot_Interface</h3>
                                <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20 text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
                                    Prot_Active
                                </span>
                            </div>
                            <div className="text-[9px] text-white/30 tracking-widest uppercase mt-0.5 flex items-center gap-2">
                                <Globe className="h-2 w-2" /> Protocol: TRK_LUCKY_V2
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="px-3 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-[10px] font-black text-white/60 uppercase tracking-widest">
                            Round #{status?.currentRound ?? "---"}
                        </div>
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border transition-all",
                            isConnected
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse"
                        )}>
                            <div className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500")} />
                            {isConnected ? (status?.drawIsActive ? 'Live_Feed_Active' : 'System_Halted') : 'Syncing_Uplink'}
                        </div>
                    </div>
                </div>

                {/* Primary Prize Display */}
                <div className="relative group/prize">
                    <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent blur-2xl rounded-[2rem] opacity-0 group-hover/prize:opacity-100 transition-all duration-700" />
                    <div className="relative bg-white/[0.02] border border-white/5 rounded-2xl p-5 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3 text-amber-500" />
                                <span className="text-[9px] font-black uppercase text-white/30 tracking-[0.2em]">Estimated_Pool_Value</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">High_Yield</span>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                {status?.totalPrizePool ? status.totalPrizePool.toLocaleString() : "70,000"}
                            </span>
                            <span className="text-xl font-black text-amber-500/80">USDT</span>
                        </div>

                        {/* Progress Indicator */}
                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
                                <span className="text-white/30">Pool_Saturation</span>
                                <span className="text-amber-500">{Math.round(progress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/[0.02] rounded-full overflow-hidden border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 bg-[length:200%_100%] animate-shimmer"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit-Log Winner Stream */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 space-y-4 relative overflow-hidden h-[160px]">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                            <History className="h-4 w-4 text-white/20" />
                            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Audit_Winner_Stream</span>
                        </div>
                        <div className="text-[8px] font-mono text-white/10 uppercase">v2.4.0_LIVE</div>
                    </div>

                    <div className="space-y-2 overflow-y-auto scrollbar-hide h-full">
                        <AnimatePresence initial={false}>
                            {winners.length > 0 ? winners.slice(0, 4).map((w, i) => (
                                <motion.div
                                    key={`${w.wallet}-${i}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between group/row hover:bg-white/[0.02] p-1 rounded transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-1 h-4 rounded-full",
                                            w.rank === '1st' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-white/10"
                                        )} />
                                        <div>
                                            <div className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">
                                                [{hasMounted ? new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : "--:--"}]
                                            </div>
                                            <div className="text-[10px] font-mono text-white/70 group-hover/row:text-white transition-colors">
                                                {w.wallet.slice(0, 6)}...{w.wallet.slice(-4)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-[10px] font-black text-emerald-400">+{w.prize}</div>
                                        <div className="text-[7px] font-black uppercase tracking-widest text-white/20 bg-white/5 px-1 rounded">{w.rank}</div>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-4 space-y-2 opacity-20">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span className="text-[8px] uppercase tracking-widest font-black">Scanning_Protocol...</span>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black to-transparent pointer-events-none" />
                </div>

                {/* Interaction Terminal */}
                <div className="pt-4 space-y-4">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
                        <span>Prob_Sequence: 10.0%</span>
                        <span>Entry_Val: {status?.ticketPrice ?? "5.00"} USDT</span>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            onClick={handleBuyTicket}
                            disabled={isBuying || (status && !status.drawIsActive)}
                            className={cn(
                                "flex-1 h-14 rounded-xl border font-black uppercase tracking-[0.2em] text-xs transition-all relative overflow-hidden group/btn",
                                status && !status.drawIsActive
                                    ? "bg-amber-500/5 border-amber-500/20 text-amber-500/40 cursor-not-allowed"
                                    : "bg-white text-black hover:scale-[1.02] active:scale-0.98 shadow-xl"
                            )}
                        >
                            {isBuying ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : status && !status.drawIsActive ? (
                                <span className="flex items-center gap-2">Protocol_Paused <Lock className="h-3 w-3" /></span>
                            ) : (
                                <span className="flex items-center gap-2 relative z-10">
                                    <Zap className="h-4 w-4 fill-black" />
                                    Initiate_Draw
                                </span>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                        </Button>

                        <div className="w-20 h-14 bg-white/[0.03] border border-white/10 rounded-xl flex flex-col items-center justify-center">
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-tighter">Tickets</span>
                            <span className="text-sm font-black text-white">{status?.ticketsSold ?? "0"}</span>
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Bottom Status Bar */}
            <div className="px-8 py-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between relative z-30">
                <div className="flex items-center gap-4 text-[7px] font-black uppercase tracking-[0.3em] text-white/20">
                    <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-2 w-2 text-emerald-500/40" />
                        Sec_Verified
                    </span>
                    <span className="flex items-center gap-1.5">
                        <DollarSign className="h-2 w-2 text-amber-500/40" />
                        Liq_Proof
                    </span>
                </div>
                <div className="text-[7px] text-white/10 font-mono">
                    SEQ_ID: TRK-{hasMounted ? (Math.floor(Math.random() * 90000) + 10000) : "00000"}
                </div>
            </div>

            {/* Paused Overlay */}
            <AnimatePresence>
                {status && !status.drawIsActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8"
                    >
                        <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center border border-amber-500/20 mb-6 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
                            <Lock className="w-10 h-10 text-amber-500 animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-3">Protocol_Suspended</h3>
                        <p className="text-xs text-white/40 max-w-[240px] leading-relaxed font-mono">
                            The Lucky Draw smart-link has been temporarily detached by administration. Monitoring for resumption signal...
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}
