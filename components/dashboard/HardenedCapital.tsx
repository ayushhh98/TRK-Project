"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Shield, Lock, Wifi, Server, Activity, ArrowUpRight } from "lucide-react";

export function HardenedCapital() {
    const { isConnected, isRegisteredOnChain, realBalances } = useWallet();

    const liquidityLevel = realBalances.totalUnified > 1000 ? "Level 3" :
        realBalances.totalUnified > 100 ? "Level 2" : "Level 1";

    const securityMetrics = [
        {
            label: "Withdrawal Status",
            value: isConnected && isRegisteredOnChain ? "Verified" : "Pending Handshake",
            color: isConnected && isRegisteredOnChain ? "text-emerald-500" : "text-amber-500"
        },
        {
            label: "Auth Protocol",
            value: isConnected ? "Web3_ZKP" : "Guest_Mode",
            color: "text-white"
        },
        {
            label: "Assets at Risk",
            value: "$0.00",
            color: "text-emerald-500"
        },
        {
            label: "Liquidity Depth",
            value: `${liquidityLevel} ($${realBalances.totalUnified.toFixed(0)})`,
            color: "text-blue-400"
        },
    ];

    return (
        <Card className="h-full bg-black border border-white/10 rounded-[2rem] overflow-hidden relative">
            <CardContent className="p-8 relative z-10 flex flex-col h-full gap-8">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Lock className="h-4 w-4 text-white/30" />
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">Security_Overview</span>
                    </div>
                    <h2 className="text-3xl font-display font-black text-white uppercase tracking-tight">
                        Hardened_Capital
                    </h2>
                </div>

                {/* Metrics Grid */}
                <div className="space-y-6 flex-1">
                    {securityMetrics.map((metric, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 hover:bg-white/[0.02] transition-colors rounded-lg px-2 -mx-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                {metric.label}
                            </span>
                            <span className={cn("font-mono font-bold text-sm tracking-tight", metric.color)}>
                                {metric.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Monthly Optimization Card */}
                <div className="mt-auto bg-white/5 border border-white/5 rounded-xl p-5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-20">
                        <Activity className="h-10 w-10 text-emerald-500" />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUpIcon className="h-3 w-3 text-emerald-500" />
                        <span className="text-[9px] font-black uppercase text-white/50 tracking-widest">Monthly_Optimization</span>
                    </div>

                    <p className="text-xs text-white/40 leading-relaxed font-medium relative z-10">
                        System AI suggests consolidating <span className="text-white font-bold">Active_Capital</span> to maximize yield thresholds in the next Epoch.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

function TrendingUpIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    )
}
