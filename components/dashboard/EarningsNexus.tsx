"use client";

import { useState, useMemo, useEffect } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Activity, BarChart3, TrendingUp, Calendar, Zap,
    Shield, RefreshCw, AlertTriangle, CheckCircle,
    ArrowUpRight, Clock, Siren
} from "lucide-react";

type TimeRange = '7D' | '30D' | 'ALL';

interface LogEntry {
    type: string;
    amount: number;
    timestamp: string;
    status: 'COMPLETED' | 'PENDING';
    desc: string;
}

export function EarningsNexus() {
    const { gameHistory, isRealMode, isHistoryLoading, realBalances } = useWallet();
    const [range, setRange] = useState<TimeRange>('7D');
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        setIsLive(true);
        const timer = setTimeout(() => setIsLive(false), 2000);
        const interval = setInterval(() => {
            setIsLive(true);
            setTimeout(() => setIsLive(false), 2000);
        }, 15000);
        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, []);

    // Process Data for Chart & Efficiency
    const { chartData, logs, yieldEfficiency } = useMemo(() => {
        const now = new Date();
        const dataPoints: { label: string; value: number; date: Date }[] = [];
        const processedLogs: LogEntry[] = [];

        // 1. Initialize Buckets
        if (range === '7D') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() - i);
                dataPoints.push({
                    label: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
                    value: 0,
                    date: d
                });
            }
        } else if (range === '30D') {
            for (let i = 9; i >= 0; i--) {
                const d = new Date(now);
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() - (i * 3));
                dataPoints.push({
                    label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                    value: 0,
                    date: d
                });
            }
        } else {
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now);
                d.setHours(0, 0, 0, 0);
                d.setMonth(d.getMonth() - i);
                d.setDate(1);
                dataPoints.push({
                    label: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
                    value: 0,
                    date: d
                });
            }
        }

        // 2. Filter by Mode and Fill Data
        let totalWins = 0;
        let totalGames = 0;

        gameHistory.forEach(game => {
            const isPracticeGame = (game.hash || "").startsWith("PRACTICE");
            if (isRealMode && isPracticeGame) return;
            if (!isRealMode && !isPracticeGame) return;

            totalGames++;
            if (!game.won) return;
            totalWins++;

            const gameDate = new Date(game.timestamp);

            // Populate logs (last 5)
            if (processedLogs.length < 5) {
                processedLogs.push({
                    type: "REWARD_PROTOCOL",
                    amount: game.payout || 0,
                    timestamp: game.timestamp,
                    status: 'COMPLETED',
                    desc: "Yield Sequence Finalized"
                });
            }

            // Find matching bucket
            const bucket = dataPoints.find((p, idx) => {
                if (range === '7D') return p.date.toDateString() === gameDate.toDateString();
                if (range === '30D') {
                    const nextP = dataPoints[idx + 1];
                    const nextDate = nextP ? nextP.date : new Date(now.getTime() + 86400000);
                    return gameDate >= p.date && gameDate < nextDate;
                }
                return p.date.getMonth() === gameDate.getMonth() && p.date.getFullYear() === gameDate.getFullYear();
            });

            if (bucket) bucket.value += Number(game.payout || 0);
        });

        const efficiency = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

        return { chartData: dataPoints, logs: processedLogs, yieldEfficiency: efficiency };
    }, [gameHistory, range, isRealMode]);

    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    const totalYield = chartData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="h-full bg-black border border-white/10 rounded-[2.5rem] overflow-hidden relative group transition-all duration-500 hover:border-white/20">
            {/* Background Grid & Blur Highlights */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
            <div className={cn(
                "absolute -top-24 -right-24 w-64 h-64 blur-[120px] transition-colors duration-1000 opacity-20",
                isRealMode ? "bg-amber-500" : "bg-emerald-500"
            )} />

            <CardContent className="p-8 relative z-10 flex flex-col h-full gap-8">
                {/* Header System */}
                <div className="flex items-start justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-12 w-12 rounded-2xl border flex items-center justify-center shadow-lg transition-all duration-500",
                                isRealMode
                                    ? "bg-amber-500/10 border-amber-500/20 shadow-amber-500/5 group-hover:shadow-amber-500/10"
                                    : "bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5 group-hover:shadow-emerald-500/10"
                            )}>
                                <Activity className={cn("h-6 w-6 transition-all", isRealMode ? "text-amber-400" : "text-emerald-400", isHistoryLoading && "animate-spin")} />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-black text-white tracking-tight uppercase">Rewards_Nexus</h2>
                                    <span className={cn(
                                        "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-all duration-500",
                                        isLive
                                            ? isRealMode ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                                            : "text-white/20 border-white/10 bg-white/5"
                                    )}>
                                        <span className="relative flex h-2 w-2">
                                            {isLive && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isRealMode ? "bg-amber-400" : "bg-emerald-400")}></span>}
                                            <span className={cn("relative inline-flex rounded-full h-2 w-2", isLive ? (isRealMode ? "bg-amber-500" : "bg-emerald-500") : "bg-white/20")}></span>
                                        </span>
                                        {isLive ? "LIVE_SYNC" : "STANDBY"}
                                    </span>
                                </div>
                                <p className="text-[10px] text-white/40 mt-1 font-mono tracking-widest flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    Epoch_Data_{range} • {isHistoryLoading ? "Synchronizing..." : "Encrypted_Link"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/10 shadow-xl">
                        {(['7D', '30D', 'ALL'] as TimeRange[]).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    range === r
                                        ? "bg-white text-black shadow-lg"
                                        : "text-white/40 hover:text-white"
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Efficiency & Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className={cn(
                        "border rounded-[2rem] p-6 relative overflow-hidden transition-all duration-500",
                        isRealMode ? "bg-amber-500/5 border-amber-500/10" : "bg-emerald-500/5 border-emerald-500/10"
                    )}>
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="relative">
                                <svg className="w-20 h-20 transform -rotate-90">
                                    <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                                    <motion.circle
                                        initial={{ strokeDasharray: "0 220" }}
                                        animate={{ strokeDasharray: `${(yieldEfficiency || 50) * 2.2} 220` }}
                                        cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="6" fill="transparent"
                                        className={cn("transition-all duration-1000", isRealMode ? "text-amber-500" : "text-emerald-500")}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-lg font-black text-white">{Math.round(yieldEfficiency)}%</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Yield_Efficiency</p>
                                <p className={cn("text-xl font-black uppercase tracking-tight", isRealMode ? "text-amber-400" : "text-emerald-400")}>
                                    {yieldEfficiency >= 80 ? "Nominal" : yieldEfficiency >= 40 ? "Stable" : "Initializing"}
                                </p>
                                <p className="text-[10px] text-white/30 font-medium">Protocol optimization active</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Protocol Status</span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Verified</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-all">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                                    <TrendingUp className="h-4 w-4 text-blue-400" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-white/50 tracking-widest">Total_ROI_Epoch</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-white">${(totalYield || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Audit Logs / Activity */}
                <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                            <Shield className="h-3 w-3" /> Recent_Reward_Protocols
                        </h3>
                        {logs.length > 0 && <span className="text-[9px] font-mono text-white/20">LATEST_SEQUENCE: {new Date(logs[0].timestamp).toLocaleTimeString()}</span>}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {logs.length > 0 ? logs.map((log, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group/log flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5 bg-white/[0.02]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", isRealMode ? "text-amber-500 bg-amber-500" : "text-emerald-500 bg-emerald-500")} />
                                    <div>
                                        <p className="text-[11px] font-black text-white group-hover/log:text-white transition-colors">{log.type}</p>
                                        <p className="text-[9px] text-white/30 font-mono">{log.desc} • {new Date(log.timestamp).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <span className={cn("text-sm font-mono font-bold", isRealMode ? "text-amber-400" : "text-emerald-400")}>+${(log.amount || 0).toFixed(2)}</span>
                                    <span className="text-[8px] font-black text-white/20 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">Sequence_Verified</span>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-10 opacity-20 filter grayscale">
                                <Siren className="h-10 w-10 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No Sequences Detected</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer AI Insight */}
                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                            <Zap className={cn("h-5 w-5", isRealMode ? "text-amber-500" : "text-emerald-500")} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-white/30 tracking-[0.2em]">Neural_Analyzer_Insight</p>
                            <p className="text-xs font-medium text-white/50 italic">
                                "{totalYield > 0 ? `Detected high-efficiency patterns. Epoch sequence optimized at 99.8%.` : `Awaiting initial reward sequences for protocol calibration.`}"
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Protocol_Mode</div>
                        <div className={cn("text-[10px] font-black uppercase tracking-tight", isRealMode ? "text-amber-500" : "text-emerald-500")}>
                            {isRealMode ? "Production_Chain" : "Practice_Sim"}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
