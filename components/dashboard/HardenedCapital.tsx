"use client";

import { useWallet } from "@/components/providers/WalletProvider";
import { Card, CardContent } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Shield, Lock, Wifi, Server, Activity, ArrowUpRight, Zap, CheckCircle, ShieldCheck } from "lucide-react";

export function HardenedCapital() {
    const { isConnected, isRegisteredOnChain, realBalances } = useWallet();

    const totalUnified = realBalances?.grandTotal || 0;
    const liquidityLevel = totalUnified > 1000 ? "Level_3" :
        totalUnified > 100 ? "Level_2" : "Level_1";

    const securityMetrics = [
        {
            label: "Withdrawal Status",
            value: isConnected && isRegisteredOnChain ? "Verified" : "Pending Handshake",
            status: isConnected && isRegisteredOnChain ? "nominal" : "warning",
            icon: CheckCircle
        },
        {
            label: "Auth Protocol",
            value: isConnected ? "Web3_ZKP_Shield" : "Guest_Mode_Limited",
            status: "default",
            icon: Shield
        },
        {
            label: "Risk Exposure",
            value: "$0.00 (Immune)",
            status: "nominal",
            icon: Server
        },
        {
            label: "Liquidity Depth",
            value: `${liquidityLevel} ($${totalUnified.toFixed(0)})`,
            status: "info",
            icon: Activity
        },
    ];

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'nominal': return "text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
            case 'warning': return "text-amber-400 border-amber-500/20 bg-amber-500/10";
            case 'info': return "text-blue-400 border-blue-500/20 bg-blue-500/10";
            default: return "text-white/60 border-white/10 bg-white/5";
        }
    };

    return (
        <Card className="h-full bg-black border border-white/10 rounded-[2.5rem] overflow-hidden relative group transition-all duration-500 hover:border-white/20">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.05),transparent_70%)]" />

            <CardContent className="p-8 relative z-10 flex flex-col h-full gap-8">
                {/* Header Container */}
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg group-hover:bg-white/10 transition-all duration-500">
                        <Lock className="h-6 w-6 text-white/40 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Hardened_Capital</h2>
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/30">
                                <ShieldCheck className="h-2.5 w-2.5" /> Secure
                            </span>
                        </div>
                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em] mt-1">Security_Interface_v4.2</p>
                    </div>
                </div>

                {/* Metrics Matrix */}
                <div className="space-y-3 flex-1">
                    {securityMetrics.map((metric, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 group/item"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center">
                                    <metric.icon className="h-4 w-4 text-white/30 group-hover/item:text-white transition-colors" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 group-hover/item:text-white/60 transition-colors">
                                    {metric.label}
                                </span>
                            </div>
                            <span className={cn(
                                "text-[10px] font-black uppercase px-3 py-1 rounded-lg border transition-all shadow-sm",
                                getStatusStyle(metric.status)
                            )}>
                                {metric.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Cybernetic Insight Card */}
                <div className="mt-auto relative overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 group/insight">
                    <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm group-hover/insight:opacity-20 transition-opacity">
                        <Zap className="h-12 w-12 text-blue-400" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-3 w-3 text-blue-400" />
                            <span className="text-[9px] font-black uppercase text-blue-400/60 tracking-[0.2em]">Strategy_Optimizer</span>
                        </div>

                        <p className="text-[11px] leading-relaxed text-white/40 font-medium">
                            System detected <span className="text-white font-bold">Optimal_Liquidity_Thresholds</span>. Recommendation: Protocol maintenance sequence scheduled for next Epoch.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
