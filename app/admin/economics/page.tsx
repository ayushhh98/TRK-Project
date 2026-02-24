'use client';

import React, { useState, useEffect } from 'react';
import {
    ShieldAlert,
    ShieldCheck,
    Zap,
    Activity,
    Lock,
    Unlock,
    AlertTriangle,
    History,
    FileText,
    Users,
    Clock,
    Terminal,
    ChevronRight,
    Search,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    Trophy,
    Database,
    Network,
    Hash,
    Settings,
    Radio,
    TrendingUp,
    PieChart,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/Input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { cn } from "@/lib/utils";
import { getToken } from '@/lib/api';
import { format } from "date-fns";

interface EconomyProtocol {
    nodeName: string;
    status: 'RUNNING' | 'PAUSED';
    lastChangedBy?: string;
    lastReason?: string;
    lastChangedAt?: string;
    pendingAction?: {
        action: 'PAUSE' | 'RESUME';
        approvals: { adminId: string; approvedAt: string }[];
        requiredApprovals: number;
        reason: string;
    } | null;
}

interface EconomyLog {
    _id: string;
    adminId: string;
    role: string;
    action: string;
    affectedNodes: string[];
    reason: string;
    timestamp: string;
    ipAddress?: string;
}

interface EconomyStats {
    turnover: {
        today: number;
        total: number;
        deposited: number;
        withdrawn: number;
        withdrawalCount: number;
        netFlow: number;
    };
    pools: {
        clubPool: number;
        cashbackPool: number;
        directPool: number;
        jackpotPool: number;
        houseEdge: number;
        sustainabilityFees: number;
    };
    rates: {
        cashbackPhase1: number;
        cashbackPhase2: number;
        cashbackPhase3: number;
        activeRate: number;
        activePhase: string;
        referralMultiplierCap: number;
        sustainabilityFeePercent: number;
        maxDailyWithdrawal: number;
    };
    users: {
        total: number;
        phaseThreshold100k: number;
        phaseThreshold1M: number;
    };
    health: {
        sustainabilityRatio: string;
        healthStatus: string;
    };
    protocols: EconomyProtocol[];
}

const ECONOMY_NODES = [
    { id: 'vault', label: 'Vault', desc: 'Main Treasury & Inflow' },
    { id: 'yield', label: 'Yield', desc: 'Profitability & House Edge' },
    { id: 'pools', label: 'Pools', desc: 'Distribution & Allocation' },
    { id: 'ledger', label: 'Ledger', desc: 'Transaction Integrity' },
    { id: 'governance', label: 'Governance', desc: 'Policy & Multi-sig' }
];

export default function EconomicsOverhaul() {
    const [stats, setStats] = useState<EconomyStats | null>(null);
    const [logs, setLogs] = useState<EconomyLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Multi-sig Intervention State
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'PAUSE' | 'RESUME'>('PAUSE');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { connectionStatus } = useAdminSocket({
        onEconomicsUpdate: (data: EconomyStats) => {
            setStats(data);
        }
    });

    const fetchData = async () => {
        try {
            const token = getToken();
            const [dashRes, logsRes] = await Promise.all([
                fetch('/api/admin/economics/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/admin/economics/logs', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const dashData = await dashRes.json();
            const logsData = await logsRes.json();

            if (dashData.status === 'success') setStats(dashData.data);
            if (logsData.status === 'success') setLogs(logsData.data);
        } catch (error) {
            console.error('Failed to sync with Economics Core:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async () => {
        if (!reason) return;
        setSubmitting(true);
        try {
            const endpoint = actionType === 'PAUSE' ? '/api/admin/economics/pause' : '/api/admin/economics/resume';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ nodes: [selectedNode], reason })
            });
            const d = await res.json();
            if (d.status === 'success') {
                setIsActionModalOpen(false);
                setReason('');
                fetchData();
            }
        } catch (error) {
            console.error('Intervention failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const isSystemHealthy = stats?.health?.healthStatus === 'OPTIMAL';
    const activeProtocols = Array.isArray(stats?.protocols) ? stats.protocols : [];

    if (loading && !stats) return (
        <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="relative h-24 w-24">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-500/10 border-t-emerald-500" />
                <TrendingUp className="h-10 w-10 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-emerald-500 font-black tracking-[0.4em] text-[10px] uppercase animate-pulse">Synchronizing Economic Ledger...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white/90 p-8 space-y-10 pb-32">
            {/* Cybernetic Header */}
            <div className={cn(
                "relative group overflow-hidden rounded-[40px] border p-12 transition-all duration-700",
                isSystemHealthy ? "border-emerald-500/10 bg-emerald-500/5 shadow-[0_0_50px_rgba(16,185,129,0.05)]" : "border-red-500/30 bg-red-500/5 shadow-[0_0_50px_rgba(239,68,68,0.1)] shadow-red-500/20"
            )}>
                <div className={cn("absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2",
                    isSystemHealthy ? "bg-emerald-500/5" : "bg-red-500/10")} />

                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="space-y-6 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4">
                            <Badge variant="outline" className={cn(
                                "uppercase tracking-[0.4em] text-[10px] font-black py-2 px-6 rounded-full border-2",
                                isSystemHealthy ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/40 bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                            )}>
                                Economics_Protocol: {stats?.health?.healthStatus || 'OFFLINE'}
                            </Badge>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Activity className={cn("h-3 w-3", isSystemHealthy ? "text-emerald-500" : "text-red-500 animate-ping")} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Neural_Flow_Active</span>
                            </div>
                        </div>
                        <h1 className="text-8xl font-display font-black tracking-tighter italic uppercase leading-tight">
                            ECONOMY<span className={isSystemHealthy ? "text-emerald-500" : "text-red-500"}>{isSystemHealthy ? '_HUB' : '_LOCKED'}</span>
                        </h1>
                        <p className="text-white/40 font-mono text-[11px] uppercase tracking-[0.5em] max-w-xl leading-relaxed mx-auto lg:mx-0">
                            Macro-Financial Equilibrium Monitor // Multi-sig Liquidity Governance
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 bg-white/5 p-8 rounded-[32px] border border-white/10 backdrop-blur-xl">
                        <div className="text-center px-4 border-r border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Global Sustainability</div>
                            <div className="text-3xl font-display font-black italic text-emerald-400">{stats?.health?.sustainabilityRatio}%</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Total Turnover</div>
                            <div className="text-3xl font-display font-black italic text-emerald-400">${stats?.turnover?.total?.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Protocol Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {ECONOMY_NODES.map((n) => {
                    const protocol = activeProtocols.find(p => p.nodeName === n.id);
                    const isPaused = protocol?.status === 'PAUSED';
                    const isPending = !!protocol?.pendingAction;

                    return (
                        <Card key={n.id} className={cn(
                            "group bg-[#0a0a0a] border-white/5 transition-all duration-300 relative overflow-hidden",
                            isPaused ? "border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.1)]" : "hover:border-white/10 border-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                        )}>
                            {isPaused && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />}

                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                                        isPaused ? "bg-red-500/20 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                                    )}>
                                        {isPaused ? <Lock className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                                    </div>
                                    <Badge className={cn(
                                        "font-black uppercase tracking-[0.2em] text-[9px] px-3 py-1",
                                        isPaused ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"
                                    )}>
                                        {isPaused ? 'PAUSED' : 'RUNNING'}
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="text-lg font-black italic uppercase tracking-wider text-white/80">{n.label}</h3>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono mt-2">{n.desc}</p>
                                </div>

                                {isPending ? (
                                    <div className="space-y-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[9px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">
                                                <RefreshCcw className="h-3 w-3 animate-spin" />
                                                Intervention Required
                                            </div>
                                            <div className="text-[9px] font-mono text-white/40">
                                                {protocol?.pendingAction?.approvals?.length || 0}/{protocol?.pendingAction?.requiredApprovals || 2}
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div className="h-full bg-amber-500" initial={{ width: 0 }}
                                                animate={{ width: `${(protocol!.pendingAction!.approvals.length / protocol!.pendingAction!.requiredApprovals) * 100}%` }} />
                                        </div>
                                        <Button size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-[10px] font-black uppercase h-8"
                                            onClick={() => { setSelectedNode(n.id); setActionType(protocol!.pendingAction!.action); setIsActionModalOpen(true); }}>
                                            Confirm Multi-Sig
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="outline" className={cn(
                                        "w-full text-[10px] font-black uppercase h-10 tracking-[0.2em] border-white/5 bg-transparent transition-all",
                                        isPaused ? "hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30" : "hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                                    )} onClick={() => { setSelectedNode(n.id); setActionType(isPaused ? 'RESUME' : 'PAUSE'); setIsActionModalOpen(true); }}>
                                        Request {isPaused ? 'Resume' : 'Pause'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Financial Intelligence Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Turnover Stats */}
                <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black italic uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            Turnover Analytics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 group hover:border-emerald-500/30 transition-all">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">Today's Turnover</span>
                                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div className="text-4xl font-display font-black text-white italic">${stats?.turnover?.today?.toLocaleString()}</div>
                                <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[65%]" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] mb-1">Total Deposited</div>
                                    <div className="text-xl font-display font-black text-emerald-400 italic">${stats?.turnover?.deposited?.toLocaleString()}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] mb-1">Total Withdrawn</div>
                                    <div className="text-xl font-display font-black text-red-400 italic">${stats?.turnover?.withdrawn?.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                                <div>
                                    <div className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] mb-1">Daily Net Flow</div>
                                    <div className={cn("text-lg font-display font-black italic", (stats?.turnover?.netFlow || 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                                        ${stats?.turnover?.netFlow?.toLocaleString()}
                                    </div>
                                </div>
                                <Activity className="h-5 w-5 text-white/10" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pool Allocation */}
                <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black italic uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
                            <PieChart className="h-4 w-4 text-emerald-500" />
                            Liquidity Pools
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-4">
                        {[
                            { label: 'Club Rewards Pool', value: stats?.pools?.clubPool, color: 'text-purple-400' },
                            { label: 'Cashback Reserve', value: stats?.pools?.cashbackPool, color: 'text-blue-400' },
                            { label: 'Direct Incentive Pool', value: stats?.pools?.directPool, color: 'text-emerald-400' },
                            { label: 'Protocol House Edge', value: stats?.pools?.houseEdge, color: 'text-orange-400' }
                        ].map((pool, idx) => (
                            <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                <div>
                                    <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">{pool.label}</div>
                                    <div className={cn("text-xl font-display font-black italic mt-1", pool.color)}>${pool.value?.toLocaleString()}</div>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                    <ChevronRight className="h-4 w-4 text-white/40" />
                                </div>
                            </div>
                        ))}
                        <div className="mt-4 p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">Projected Annual Yield</div>
                            <div className="text-3xl font-display font-black italic text-emerald-400">14.2%</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Rate Parameters & Governance */}
                <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden flex flex-col">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black italic uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
                            <Cpu className="h-4 w-4 text-emerald-500" />
                            Rate Matrix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 flex-1 space-y-6">
                        <div className="p-6 rounded-[32px] bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)] text-black">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Active Cashback Phase</span>
                                <Badge className="bg-black text-white border-none text-[9px] font-black">{stats?.rates?.activePhase}</Badge>
                            </div>
                            <div className="text-6xl font-display font-black italic tracking-tighter">{stats?.rates?.activeRate}%</div>
                            <div className="mt-4 pt-4 border-t border-black/10 text-[10px] font-bold uppercase tracking-widest opacity-80 flex items-center gap-2">
                                <Users className="h-3 w-3" /> {stats?.users?.total?.toLocaleString()} / {stats?.users?.phaseThreshold100k?.toLocaleString()} USERS
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Growth Multiplier Cap</span>
                                <span className="text-xs font-black text-white">{stats?.rates?.referralMultiplierCap}x</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Sustainability Fee</span>
                                <span className="text-xs font-black text-white">{stats?.rates?.sustainabilityFeePercent}%</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Max Daily Withdrawal</span>
                                <span className="text-xs font-black text-white">${stats?.rates?.maxDailyWithdrawal?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/2 border border-white/5 border-dashed flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-white/80 uppercase">Liquidity Locked</div>
                                <div className="text-[9px] text-white/30 uppercase tracking-widest font-mono">HASH: 0x82...f92a</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Activities & Logs */}
            <div className="grid grid-cols-1 gap-8">
                <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-white/2 p-8 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Terminal className="h-6 w-6 text-white/40" />
                            <div>
                                <CardTitle className="text-xl font-black italic uppercase tracking-widest text-white/80">Chain Protocol Logs</CardTitle>
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-1 font-mono">Economic Security Interventions</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => fetchData()}>
                            <RefreshCcw className="h-4 w-4 text-white/20" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/2">
                                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Timestamp</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Action</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Nodes</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Admin</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="popLayout">
                                        {logs.map((log) => (
                                            <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={log._id}
                                                className="border-b border-white/5 hover:bg-white/[0.02] bg-transparent transition-colors group">
                                                <td className="px-8 py-6">
                                                    <div className="text-[11px] font-mono text-white/50">{format(new Date(log.timestamp), "MMM dd, HH:mm:ss")}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <Badge className={cn("font-black text-[9px] uppercase tracking-widest py-1 px-3",
                                                        log.action.includes('ACTIVATED') ? "bg-red-500/20 text-red-500" : "bg-white/5 text-white/40")}>
                                                        {log.action}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-wrap gap-2">
                                                        {(log.affectedNodes || []).map(n => (
                                                            <span key={n} className="text-[10px] font-black text-white/60 bg-white/5 px-2 py-0.5 rounded uppercase">{n}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-[10px] font-black text-white/80">{log.adminId.slice(0, 8)}...</div>
                                                    <div className="text-[8px] text-blue-400 uppercase tracking-widest">{log.role}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="text-[10px] text-white/40 max-w-xs">{log.reason}</div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Protocol Intervention Modal */}
            <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
                <DialogContent className="bg-[#0c0c0c] border-white/10 text-white max-w-md rounded-[32px] overflow-hidden">
                    <div className={cn("absolute top-0 left-0 w-full h-2", actionType === 'PAUSE' ? "bg-red-500" : "bg-emerald-500")} />
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-3xl font-display font-black italic uppercase tracking-tighter">Confirm Economic {actionType === 'PAUSE' ? 'Pause' : 'Resume'}</DialogTitle>
                        <DialogDescription className="text-white/40 text-xs uppercase tracking-widest font-mono mt-2">Administrative Multi-sig approval required for financial intervention.</DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Action Justification (Audit Required)</label>
                            <Input placeholder="Enter reason for this intervention..." className="bg-white/5 border-white/10 rounded-xl h-12 text-sm focus:border-emerald-500/50 transition-all" value={reason} onChange={(e) => setReason(e.target.value)} />
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Target Node</span>
                                <Badge className="bg-emerald-500/20 text-emerald-400 uppercase tracking-widest font-black text-[9px]">
                                    {ECONOMY_NODES.find(n => n.id === selectedNode)?.label}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Auth Key</span>
                                <span className="text-[10px] font-mono text-white/40 tracking-tighter">FIN_NODE_{selectedNode?.toUpperCase()}_SECURE</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="p-8 pt-0 flex gap-4">
                        <Button variant="ghost" className="flex-1 rounded-xl uppercase font-black text-[11px] tracking-widest h-12" onClick={() => setIsActionModalOpen(false)}>Abort</Button>
                        <Button className={cn("flex-1 rounded-xl uppercase font-black text-[11px] tracking-widest h-12 shadow-2xl",
                            actionType === 'PAUSE' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-black")}
                            disabled={!reason || submitting} onClick={handleAction}>
                            {submitting ? 'Transmitting...' : `Sign ${actionType}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
