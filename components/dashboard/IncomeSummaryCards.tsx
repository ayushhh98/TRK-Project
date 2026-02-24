"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import {
    Coins,
    TrendingUp,
    Gamepad2,
    RefreshCcw,
    Users,
    Trophy,
    ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
    label: string;
    value: number;
    icon: any;
    color: string;
    description: string;
    trend?: string;
}

const SummaryCard = ({ label, value, icon: Icon, color, description, trend }: SummaryCardProps) => (
    <Card className="bg-white/[0.02] border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.04] transition-all group relative overflow-hidden">
        <div className="flex justify-between items-start mb-4">
            <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform", color)}>
                <Icon className="h-5 w-5" />
            </div>
            {trend && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-500 tracking-tight">{trend}</span>
                </div>
            )}
        </div>
        <div className="space-y-1 relative z-10">
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{label}</div>
            <div className="text-3xl font-mono font-black text-white tracking-tighter">
                ${(value || 0).toFixed(2)}
            </div>
            <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-2">{description}</div>
        </div>
        {/* Decorative corner accent */}
        <div className="absolute -bottom-4 -right-4 h-16 w-16 bg-white/[0.02] rounded-full blur-2xl group-hover:bg-white/5 transition-all" />
    </Card>
);

interface IncomeSummaryCardsProps {
    stats: {
        totalEarnings: number;
        todayEarnings: number;
        gameProfit: number;
        cashbackEarned: number;
        teamIncome: number;
        jackpotWins: number;
    };
}

export function IncomeSummaryCards({ stats }: IncomeSummaryCardsProps) {
    const cards = [
        {
            label: "Total Earnings",
            value: stats.totalEarnings,
            icon: Coins,
            color: "text-amber-400",
            description: "All income till date",
            trend: "+12%"
        },
        {
            label: "Today's Income",
            value: stats.todayEarnings,
            icon: TrendingUp,
            color: "text-emerald-400",
            description: "Last 24h performance"
        },
        {
            label: "Game Profit",
            value: stats.gameProfit,
            icon: Gamepad2,
            color: "text-primary",
            description: "From 2x win payouts"
        },
        {
            label: "Cashback Earned",
            value: stats.cashbackEarned,
            icon: RefreshCcw,
            color: "text-rose-400",
            description: "Loss recovery income"
        },
        {
            label: "Team Income",
            value: stats.teamIncome,
            icon: Users,
            color: "text-blue-400",
            description: "Referral + Uni-level"
        },
        {
            label: "Jackpot Wins",
            value: stats.jackpotWins,
            icon: Trophy,
            color: "text-purple-400",
            description: "Lucky draw rewards"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {cards.map((card, idx) => (
                <SummaryCard key={idx} {...card} />
            ))}
        </div>
    );
}
