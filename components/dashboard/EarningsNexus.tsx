"use client";

import { useState, useMemo } from "react";
import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Activity, BarChart3, TrendingUp, Calendar, Zap } from "lucide-react";

type TimeRange = '7D' | '30D' | 'ALL';

export function EarningsNexus() {
    const { gameHistory, isRealMode, isHistoryLoading } = useWallet();
    const [range, setRange] = useState<TimeRange>('7D');

    // Process Data for Chart
    const chartData = useMemo(() => {
        const now = new Date();
        const dataPoints: { label: string; value: number; date: Date }[] = [];

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
        gameHistory.forEach(game => {
            // Filter by Mode
            const isPracticeGame = (game.hash || "").startsWith("PRACTICE");
            if (isRealMode && isPracticeGame) return;
            if (!isRealMode && !isPracticeGame) return;

            if (!game.won) return;
            const gameDate = new Date(game.timestamp);

            // Find matching bucket
            const bucket = dataPoints.find((p, idx) => {
                if (range === '7D') {
                    return p.date.toDateString() === gameDate.toDateString();
                }
                if (range === '30D') {
                    const nextP = dataPoints[idx + 1];
                    const nextDate = nextP ? nextP.date : new Date(now.getTime() + 86400000);
                    return gameDate >= p.date && gameDate < nextDate;
                }
                // ALL (Monthly)
                return p.date.getMonth() === gameDate.getMonth() && p.date.getFullYear() === gameDate.getFullYear();
            });

            if (bucket) {
                bucket.value += Number(game.payout || 0);
            }
        });

        return dataPoints;
    }, [gameHistory, range, isRealMode]);

    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    const totalYield = chartData.reduce((acc, curr) => acc + curr.value, 0);

    return (
        <Card className="h-full bg-black border border-white/10 rounded-[2rem] overflow-hidden relative group">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />

            <CardContent className="p-8 relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className={cn("h-4 w-4", isHistoryLoading ? "text-amber-500 animate-spin" : "text-emerald-500 animate-pulse")} />
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                                {isHistoryLoading ? "Synchronizing_Ledger..." : "Reward_Synchronization"}
                            </span>
                        </div>
                        <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                            Rewards_Nexus_v2.0
                        </h2>
                        <div className={cn(
                            "h-1 w-24 mt-2 rounded-full transition-all duration-500",
                            isRealMode ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        )} />
                    </div>

                    {/* Time Selector */}
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                        {(['7D', '30D', 'ALL'] as TimeRange[]).map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={cn(
                                    "px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                                    range === r
                                        ? "bg-white text-black shadow-lg scale-105"
                                        : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 flex items-end justify-between gap-2 md:gap-4 min-h-[200px] w-full pt-8 relative">
                    {chartData.map((point, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3 group/bar h-full justify-end">
                            <div className="w-full relative flex items-end justify-center h-full">
                                {/* The Bar */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(point.value / maxValue) * 100}%` }}
                                    transition={{ duration: 1, delay: i * 0.1, ease: "circOut" }}
                                    className={cn(
                                        "w-full rounded-t-sm shadow-[0_0_20px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-300 group-hover/bar:brightness-125",
                                        isRealMode
                                            ? "bg-gradient-to-t from-amber-900/40 via-amber-500 to-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                                            : "bg-gradient-to-t from-emerald-900/40 via-emerald-500 to-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                                    )}
                                >
                                    {/* Top Highlight */}
                                    <div className="absolute top-0 inset-x-0 h-1 bg-white/50 blur-[1px]" />

                                    {/* Tooltip on Hover */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-black border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-white whitespace-nowrap z-20 pointer-events-none">
                                        ${point.value.toFixed(2)}
                                    </div>
                                </motion.div>
                            </div>

                            {/* Label */}
                            <span className="text-[9px] font-black font-mono text-white/20 uppercase tracking-widest rotate-0 md:rotate-0">
                                {point.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Footer Insight */}
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                            <Zap className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">System AI Insight</div>
                            <div className="text-[11px] font-medium text-white/60">
                                {totalYield > 0
                                    ? `Total rewards detected: $${totalYield.toFixed(2)}. Ecosystem efficiency at 98.4%.`
                                    : "No active rewards detected in the current epoch. Awaiting gameplay sequences."}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-black uppercase text-white/30 tracking-widest">Mode</div>
                        <div className={cn("text-[10px] font-black", isRealMode ? "text-amber-500" : "text-emerald-500")}>
                            {isRealMode ? "PRODUCTION_CHAIN" : "PRACTICE_SIMULATION"}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
