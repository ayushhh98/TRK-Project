"use client";

import { useEffect, useState } from "react";
import {
    Activity, Users, TrendingUp, ShieldCheck, AlertCircle,
    Database, Network, Percent, PieChart, Wallet, Radio, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/api";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { cn } from "@/lib/utils";

function fmt(n?: number, d = 2) { return (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: d }); }

export default function RealTimeROIMonitor() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const { connectionStatus } = useAdminSocket({
        onROIUpdate: (d) => {
            setData(d);
            setLastUpdated(new Date());
            setLoading(false);
        }
    });

    // Fallback REST fetch on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/admin/roi/dashboard', {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                if (res.status === 401) { window.location.href = '/admin/login'; return; }
                const d = await res.json();
                if (d.status === 'success') setData({ summary: d.data, multipliers: d.data?.multipliers, roiOnRoi: d.data?.roiOnRoi, levelBreakdown: [] });
            } catch { }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading && !data) return (
        <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="relative h-24 w-24">
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-rose-500/10 border-b-rose-500"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-rose-500 animate-pulse" />
                </div>
            </div>
            <div className="text-rose-500 font-black italic uppercase tracking-[0.3em] text-[10px] animate-pulse">
                Initializing Yield Protocol Stabilizers...
            </div>
        </div>
    );

    const s = data?.summary;
    const mults = data?.multipliers ?? {};
    const roi2 = data?.roiOnRoi ?? {};

    return (
        <div className="min-h-screen bg-black text-white/90 space-y-10 pb-32">
            {/* Yield Stabilizer Header */}
            <div className="relative group overflow-hidden rounded-3xl border border-rose-500/10 bg-gradient-to-br from-[#0c0c0c] to-black p-10">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-rose-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/5 text-rose-400 uppercase tracking-[0.4em] text-[9px] font-black py-1.5 px-4 rounded-full">
                                Yield Control Node: PROTOCOL_ALPHA
                            </Badge>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <Activity className="h-3 w-3 text-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Flux_Stable</span>
                            </div>
                        </div>
                        <h1 className="text-7xl font-display font-black tracking-tighter italic flex items-center gap-6 uppercase">
                            YIELD<span className="text-rose-500">STABILIZER</span>
                        </h1>
                        <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em] max-w-2xl leading-relaxed">
                            Algorithmic Loss Recovery & Network Redistribution Governance Matrix
                        </p>
                    </div>

                    <div className="bg-black/60 backdrop-blur-xl border border-white/5 rounded-[32px] p-6 flex items-center gap-6 shadow-2xl">
                        <div className="text-right">
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Chain Connection</div>
                            <div className={cn("text-xs font-black italic uppercase tracking-widest flex items-center justify-end gap-2", connectionStatus === 'connected' ? "text-rose-400" : "text-red-500")}>
                                {connectionStatus === 'connected' ? 'MAINNET_SYNC_LIVE' : 'LINK_TERMINATED'}
                                <Radio className={cn("h-3 w-3", connectionStatus === 'connected' && "animate-pulse")} />
                            </div>
                            {lastUpdated && <div className="text-[8px] font-mono text-white/10 mt-1">L_UPD: {lastUpdated.toLocaleTimeString()}</div>}
                        </div>
                        <div className="h-12 w-[1px] bg-white/10" />
                        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.1)]">
                            <ShieldCheck className="h-8 w-8 text-rose-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* High-Level Yield Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Eligible Nodes", value: fmt(s?.totalEligibleUsers, 0), sub: "Active Protocol Wallets", icon: Users, color: "text-blue-400", bg: "bg-blue-500/5", border: "border-blue-500/20" },
                    { label: "Cashback Flow", value: `$${fmt(s?.totalCashbackDistributed)}`, sub: "Total Ecosystem Credits", icon: Wallet, color: "text-rose-400", bg: "bg-rose-500/5", border: "border-rose-500/20" },
                    { label: "Flux Pool", value: `$${fmt(s?.todaysCashbackPool)}`, sub: "Daily Turnover Allocation", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/5", border: "border-amber-500/20" },
                    { label: "Yield Velocity", value: `${fmt(s?.dailyCashbackPercent, 2)}%`, sub: s?.activePhase ?? "STABLE_IDLE", icon: Percent, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
                ].map((c) => (
                    <Card key={c.label} className="bg-[#0a0a0a] border-white/5 group hover:border-rose-500/30 transition-all overflow-hidden relative">
                        <div className={`absolute -top-10 -right-10 w-32 h-32 ${c.bg} blur-[60px] opacity-20 transition-opacity group-hover:opacity-40`} />
                        <CardContent className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em] font-mono">{c.label}</div>
                                <c.icon className={cn("h-6 w-6", c.color)} />
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={c.value}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="text-4xl font-display font-black text-white italic tracking-tighter"
                                >
                                    {c.value}
                                </motion.div>
                            </AnimatePresence>
                            <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em] mt-3 group-hover:text-white/20 transition-colors">{c.sub}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
                {/* Multiplier Scaling Matrix */}
                <Card className="lg:col-span-2 bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-blue-500/5 p-8 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Network className="h-6 w-6 text-blue-400" />
                            <div>
                                <CardTitle className="text-lg font-black italic uppercase tracking-widest text-white">Recovery Scaling Matrix</CardTitle>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Dynamic Referral Multipliers</p>
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-full border border-blue-500/20 bg-blue-500/10 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-4">
                        {[
                            { refs: "0", mult: "1x", cap: "100% Max Recovery", count: mults["1x"] ?? 0, color: "text-white/40", glow: "shadow-none", progress: 25 },
                            { refs: "5", mult: "2x", cap: "200% Max Recovery", count: mults["2x"] ?? 0, color: "text-blue-400", glow: "shadow-[0_0_20px_rgba(59,130,246,0.1)]", progress: 50 },
                            { refs: "10", mult: "4x", cap: "400% Max Recovery", count: mults["4x"] ?? 0, color: "text-purple-400", glow: "shadow-[0_0_20px_rgba(192,38,211,0.1)]", progress: 75 },
                            { refs: "20", mult: "8x", cap: "800% Max Recovery", count: mults["8x"] ?? 0, color: "text-rose-400", glow: "shadow-[0_0_20px_rgba(244,63,94,0.1)]", progress: 100 },
                        ].map((t) => (
                            <div key={t.mult} className={cn("relative group p-6 rounded-3xl border border-white/5 bg-black hover:border-white/10 transition-all cursor-default", t.glow)}>
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl italic border border-white/5 bg-white/[0.02]", t.color)}>
                                            {t.mult}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white italic uppercase tracking-widest">{t.cap}</div>
                                            <div className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-mono">REQ: {t.refs}+ VERIFIED_REFS</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={t.count}
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className={cn("text-3xl font-display font-black tracking-tighter", t.color)}
                                            >
                                                {t.count}
                                            </motion.div>
                                        </AnimatePresence>
                                        <div className="text-[9px] text-white/10 font-black uppercase tracking-widest font-mono">NODES_ALIGNED</div>
                                    </div>
                                </div>
                                <div className="mt-4 h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${t.progress}%` }}
                                        className={cn("h-full", t.color.replace('text', 'bg'))}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Yield Redistribution Log */}
                <Card className="lg:col-span-3 bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-rose-500/5 p-8 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <PieChart className="h-6 w-6 text-rose-400" />
                            <div>
                                <CardTitle className="text-lg font-black italic uppercase tracking-widest text-white">Yield Flux Distribution</CardTitle>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Daily Multi-Tier Network Allocation (50:50 Split)</p>
                            </div>
                        </div>
                        <div className="px-6 py-2 rounded-2xl bg-black border border-white/5 flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">Global Velocity</div>
                                <div className="text-lg font-black text-rose-400 font-mono">1.0X_CONST</div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10 space-y-10">
                        {/* Primary Split Visualization */}
                        <div className="grid grid-cols-2 gap-8 relative">
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black border border-white/10 flex items-center justify-center z-10">
                                <Activity className="h-5 w-5 text-white/20" />
                            </div>

                            <div className="group p-8 rounded-[32px] bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-all text-center space-y-4">
                                <div className="text-[10px] text-emerald-500/40 font-black uppercase tracking-[0.4em]">50% Direct Recovery</div>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={roi2.userRecovery}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="text-4xl font-display font-black text-emerald-400 italic tracking-tighter"
                                    >
                                        ${fmt(roi2.userRecovery)}
                                    </motion.div>
                                </AnimatePresence>
                                <div className="text-[9px] text-white/10 uppercase tracking-widest">PRIMARY_YIELD_LEDGER</div>
                            </div>

                            <div className="group p-8 rounded-[32px] bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/20 transition-all text-center space-y-4">
                                <div className="text-[10px] text-purple-500/40 font-black uppercase tracking-[0.4em]">50% Upline Redistribution</div>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={roi2.sharedToUplines}
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        className="text-4xl font-display font-black text-purple-400 italic tracking-tighter"
                                    >
                                        ${fmt(roi2.sharedToUplines)}
                                    </motion.div>
                                </AnimatePresence>
                                <div className="text-[9px] text-white/10 uppercase tracking-widest">NETWORK_GAS_ALLOC</div>
                            </div>
                        </div>

                        {/* Hierarchical Breakdown */}
                        <div className="rounded-[32px] border border-white/5 overflow-hidden bg-black/40">
                            <div className="flex bg-white/[0.02] p-6 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] font-mono">
                                <div className="flex-1">Network Depth</div>
                                <div className="w-32 text-center">Share %</div>
                                <div className="w-48 text-right">Governing Rule</div>
                            </div>
                            <div className="divide-y divide-white/[0.03]">
                                {[
                                    { level: "Protocol Layer 1", share: "20%", role: "Direct Sponsors / Anchor", color: "text-rose-400", bg: "bg-rose-500/10" },
                                    { level: "Protocol Layers 2–5", share: "10%", role: "Mid-Tier Cluster", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                                    { level: "Protocol Layers 6–10", share: "05%", role: "Extended Visibility", color: "text-blue-400", bg: "bg-blue-500/10" },
                                    { level: "Protocol Layers 11–15", share: "03%", role: "Legacy Network Sink", color: "text-purple-400", bg: "bg-purple-500/10" },
                                ].map((row) => (
                                    <div key={row.level} className="flex p-8 hover:bg-white/[0.01] transition-all items-center group">
                                        <div className="flex-1 flex items-center gap-4">
                                            <div className={cn("h-3 w-3 rounded-sm rotate-45 border border-white/10", row.color.replace('text', 'bg'))} />
                                            <div className="text-[13px] font-black text-white italic uppercase tracking-tight group-hover:text-rose-400 transition-colors">
                                                {row.level}
                                            </div>
                                        </div>
                                        <div className="w-32 text-center">
                                            <span className={cn("inline-block px-4 py-1.5 rounded-full text-sm font-black font-mono border border-white/5", row.color, row.bg)}>
                                                {row.share}
                                            </span>
                                        </div>
                                        <div className="w-48 text-right text-[10px] text-white/20 uppercase font-black tracking-widest group-hover:text-white/40 transition-colors">
                                            {row.role}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Multisig Verification & Integrity Layer */}
            <div className="p-12 rounded-[48px] bg-gradient-to-br from-[#080808] to-black border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-rose-500/5 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative flex flex-col md:flex-row items-center gap-12">
                    <div className="relative">
                        <div className="h-32 w-32 rounded-[40px] bg-white/[0.02] flex items-center justify-center border border-white/10 group-hover:rotate-6 transition-transform shadow-2xl">
                            <ShieldCheck className="h-16 w-16 text-rose-500/60" />
                        </div>
                        <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center border-4 border-black text-black font-black text-[10px]">
                            99%
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-4">
                            <h3 className="text-4xl font-display font-black text-white italic uppercase tracking-tighter">Yield Integrity Protocols</h3>
                            <div className="h-[1px] flex-1 bg-white/5" />
                        </div>
                        <p className="text-[12px] text-white/40 uppercase font-black leading-relaxed tracking-[0.2em] max-w-6xl">
                            The ROI Optimizer operates as an autonomous constraint engine. The platform does not
                            "manually distribute" funds; it monitors <span className="text-rose-400">Yield Velocity Boundaries</span>
                            defined by Losses, daily turnover, and hierarchical tiers. Once a node exceeds its recovery cap
                            (100% - 800%), the yield protocol is automatically nullified by the contract until re-activation.
                            Administrative oversight is strictly limited to <span className="text-white/70">Observability & Parameter Stabilisation</span>.
                            Manipulation of individual payout ledgers is physically impossible by design code.
                        </p>
                        <div className="flex gap-6">
                            {['AUDIT_LOCKED', 'MULTISIG_ACTIVE', 'IMMUTABLE_LOGS'].map(t => (
                                <div key={t} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-[0.3em] font-mono">{t}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
