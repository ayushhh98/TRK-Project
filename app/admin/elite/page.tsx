"use client";

import { useEffect, useState } from "react";
import {
    Activity,
    Users,
    AlertCircle,
    CheckCircle2,
    ShieldCheck,
    Database,
    PieChart,
    Crown,
    Scale,
    Lock,
    Zap,
    Trophy,
    ArrowUpCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { getToken } from "@/lib/api";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { toast } from "sonner";

interface EliteStats {
    topSummary: {
        todaysTurnover: number;
        clubPool: number;
        qualifiedLeadersCount: number;
        distributionStatus: string;
    };
    clubPoolConfig: {
        allocation: string;
        frequency: string;
        rule: string;
    };
    rankStructure: {
        id: number;
        name: string;
        requiredVolume: number;
        slicePercent: number;
        members: number;
    }[];
    topProgressors: {
        wallet: string;
        currentRank: string;
        volume: number;
        strongLeg: number;
        otherLegs: number;
        progressToNext: string;
        nextRankGoal: string;
    }[];
    calculationPreview: {
        rank: string;
        poolPercent: string;
        totalSlice: number;
        members: number;
        sharePerMember: number;
    }[];
    auditTrail: {
        wallet: string;
        rank: string;
        totalVolume: number;
        strongLeg: number;
        otherLegs: number;
        ratio: string;
        status: string;
    }[];
}

export default function EliteClubAdmin() {
    const [stats, setStats] = useState<EliteStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [liveFeed, setLiveFeed] = useState<any[]>([]);

    useAdminSocket({
        onEliteUpdate: (data) => {
            setStats(data);
            setLoading(false);
        },
        onEliteLiveFeed: (event) => {
            setLiveFeed(prev => [event, ...prev].slice(0, 20));
        }
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/admin/elite/dashboard', {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (res.status === 401) { window.location.href = '/admin/login'; return; }
                const data = await res.json();
                if (data.status === 'success') {
                    setStats(data.data);
                    setError(null);
                }
            } catch (err) {
                console.error('Fetch error', err);
                setError('CONNECTION_FAULT: Data link unstable.');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !stats) {
        return (
            <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
                <div className="relative h-24 w-24">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-yellow-500/20 border-t-yellow-500"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-2 rounded-full border-2 border-blue-500/10 border-b-blue-500/50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Crown className="h-8 w-8 text-yellow-500 animate-pulse" />
                    </div>
                </div>
                <div className="text-yellow-500 font-black italic uppercase tracking-[0.3em] text-[10px] animate-pulse">
                    Aggregating Global Leadership Data...
                </div>
            </div>
        );
    }

    const { topSummary, rankStructure, calculationPreview, auditTrail, topProgressors } = stats || {};

    return (
        <div className="min-h-screen bg-black text-white/90 space-y-10 pb-32">
            {/* Immersive Header */}
            <div className="relative group overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#0a0a0a] to-black p-8">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                            <span className="text-yellow-500/60 font-black text-[10px] uppercase tracking-[0.4em]">Elite Protocol Node v2.5</span>
                        </div>
                        <h1 className="text-6xl font-display font-black tracking-tight italic flex items-center gap-4">
                            ELITE<span className="text-yellow-500">CLUB</span>
                            <Trophy className="h-10 w-10 text-yellow-500/40" />
                        </h1>
                        <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.3em]">Leadership Reward Distribution Oversight</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Qualifiers</div>
                                <div className="text-xl font-black text-yellow-500 italic">{topSummary?.qualifiedLeadersCount || 0}</div>
                            </div>
                            <div className="h-10 w-[1px] bg-white/10" />
                            <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                <Users className="h-6 w-6 text-yellow-500" />
                            </div>
                        </div>
                        <Button
                            className="h-16 rounded-2xl bg-yellow-500 text-black font-black px-10 hover:bg-yellow-400 active:scale-95 transition-all shadow-[0_0_50px_rgba(234,179,8,0.2)]"
                        >
                            <ShieldCheck className="h-5 w-5 mr-3" />
                            RUN_AUDIT
                        </Button>
                    </div>
                </div>
            </div>

            {/* Core Metrics: Turnover Rings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Daily Turnover", val: `$${topSummary?.todaysTurnover?.toLocaleString()}`, sub: "Live Protocol Volume", color: "text-emerald-400", bg: "emerald", icon: Activity },
                    { label: "Total Club Pool", val: `$${topSummary?.clubPool?.toLocaleString()}`, sub: "8% Turnover Slice", color: "text-yellow-500", bg: "yellow", icon: PieChart },
                    { label: "Next Payout", val: topSummary?.distributionStatus || "Pending", sub: "Automated Routine", color: "text-blue-400", bg: "blue", icon: Zap },
                    { label: "Avg Member Share", val: `$${fmt(calculationPreview?.[0]?.sharePerMember)}`, sub: "EST. Rank 1 Dist.", color: "text-purple-400", bg: "purple", icon: Crown },
                ].map((m, i) => (
                    <motion.div
                        key={`${m.label}-${i}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative group cursor-default"
                    >
                        <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden h-full">
                            <div className={`absolute top-0 right-0 w-24 h-24 -translate-y-8 translate-x-8 rounded-full blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity bg-${m.bg}-500`} />
                            <CardContent className="p-6 relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">{m.label}</div>
                                    <m.icon className={`h-4 w-4 ${m.color}`} />
                                </div>
                                <div className={`text-3xl font-display font-black italic tracking-tighter ${m.color}`}>
                                    {m.val}
                                </div>
                                <div className="text-[9px] font-black text-white/20 uppercase mt-2 tracking-widest">{m.sub}</div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Live Distribution Progress */}
                <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-yellow-500/5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-[11px] font-black italic uppercase tracking-widest text-yellow-500/80">Pool Saturation Monitor</CardTitle>
                            <Badge className="bg-yellow-500/20 text-yellow-500 border-none text-[8px] font-black uppercase">Active</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {calculationPreview?.slice(0, 3).map((p, i) => (
                            <div key={`${p.rank}-${i}`} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-white/60">{p.rank} Allocation</span>
                                    <span className="text-yellow-500">{p.poolPercent}</span>
                                </div>
                                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: p.poolPercent }}
                                        transition={{ duration: 1.5, delay: i * 0.2 }}
                                        className="h-full bg-yellow-500 relative"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                    </motion.div>
                                </div>
                                <div className="flex justify-between text-[9px] font-mono text-white/20">
                                    <span>${p.totalSlice.toLocaleString()} CAP</span>
                                    <span>{p.members} LEADERS</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Live Qualification Stream */}
                <Card className="lg:col-span-2 bg-black border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Zap className="h-4 w-4 text-blue-400 animate-pulse" />
                            <CardTitle className="text-[11px] font-black italic uppercase tracking-widest">Real-Time Event Stream</CardTitle>
                        </div>
                        <span className="text-[9px] font-black text-white/20 uppercase">Node Activity: ONLINE</span>
                    </CardHeader>
                    <CardContent className="p-0 bg-[#050505] font-mono text-[9px]">
                        <div className="h-[280px] overflow-y-auto custom-scrollbar p-6 space-y-3">
                            {liveFeed.map((ev, i) => (
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    key={`live-${i}`}
                                    className="flex items-center gap-4 group border-l-2 border-white/5 pl-4 py-1 hover:border-yellow-500/50 transition-all"
                                >
                                    <span className="text-white/20 shrink-0">[{new Date(ev.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.{new Date(ev.timestamp).getMilliseconds().toString().padStart(3, '0')}]</span>
                                    <Badge className={ev.type === 'RANK_ACHIEVED' ? 'bg-yellow-500 text-black border-none' : 'bg-blue-500/10 text-blue-400 border-none'}>
                                        {ev.type}
                                    </Badge>
                                    <span className="text-white/60 truncate italic">
                                        ID: {ev.wallet?.slice(-8)}... {ev.type === 'RANK_ACHIEVED' ? `DEPLOYED TO ${ev.rank}` : `INJECTED $${ev.amount}`}
                                    </span>
                                </motion.div>
                            ))}
                            {liveFeed.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
                                    <Database className="h-10 w-10 text-white/5 animate-pulse" />
                                    <div className="text-white/20 font-black italic uppercase tracking-[0.4em]">Listening for Protocol Signals...</div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Builder Progression Deck */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                    <h2 className="text-xl font-display font-black italic uppercase text-white tracking-tight">Active Progression Matrix</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {topProgressors?.slice(0, 8).map((up, i) => (
                        <Card key={`${up.wallet}-${i}`} className="bg-[#0a0a0a] border-white/5 hover:border-emerald-500/20 hover:bg-white/[0.02] transition-all group">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="bg-white/5 p-2 rounded-lg text-[10px] font-mono text-emerald-400/80 group-hover:text-emerald-400">
                                        {up.wallet?.slice(-6)}
                                    </div>
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black uppercase tracking-widest">{up.currentRank || "Rank 0"}</Badge>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase text-white/30">
                                        <span>To {up.nextRankGoal}</span>
                                        <span className="text-emerald-500">{up.progressToNext}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: up.progressToNext }}
                                            className="h-full bg-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 grid grid-cols-2 gap-2">
                                    <div className="bg-black p-2 rounded-lg border border-white/5">
                                        <div className="text-[7px] font-black text-white/20 uppercase tracking-widest">Strong</div>
                                        <div className="text-[10px] font-black text-white">${up.strongLeg.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black p-2 rounded-lg border border-white/5">
                                        <div className="text-[7px] font-black text-white/20 uppercase tracking-widest">Balanced</div>
                                        <div className="text-[10px] font-black text-blue-400">${up.otherLegs.toLocaleString()}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Immutability Enforcement Display */}
            <div className="p-8 rounded-[32px] bg-gradient-to-r from-yellow-500/5 to-transparent border border-yellow-500/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[100px] pointer-events-none" />
                <div className="relative flex items-center gap-8">
                    <div className="h-20 w-20 shrink-0 rounded-[24px] bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                        <Lock className="h-10 w-10 text-yellow-500" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-2xl font-display font-black text-yellow-500 italic uppercase">Immutable Governance Protocol</h3>
                        <p className="text-[11px] text-white/40 uppercase font-black leading-relaxed tracking-widest max-w-5xl">
                            Elite Club is an automated daily leadership reward pool derived from 8% of total gross platform turnover.
                            The system enforces a strictly auditable read-only state. Rank assignments, pool percentages, and leg balance
                            calculations are governed by the TRK Protocol Smart Contract. Administrative manual overrides are restricted
                            to maintaining zero-access integrity. Every qualification is cross-referenced with on-chain volume verification.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function fmt(n?: number, d = 0) {
    return (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: d });
}
