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
    Radio
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

interface JackpotProtocol {
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

interface JackpotLog {
    _id: string;
    adminId: string;
    role: string;
    action: string;
    affectedNodes: string[];
    reason: string;
    timestamp: string;
    ipAddress?: string;
}

interface JackpotStats {
    activeDraw: {
        id: number;
        ticketsSold: number;
        totalTickets: number;
        ticketPrice: number;
        totalPool: number;
        status: string;
        isActive: boolean;
    };
    previousDraw: {
        id: number;
        blockNumber: string;
        rngHash: string;
        executionTime: string;
        topWinnerWallet: string;
        topPrizePaid: number;
    } | null;
    autoEntry: {
        totalUsers: number;
        autoTicketsPurchased: number;
        isEnabledGlobally: boolean;
    };
    financials: {
        ticketRevenue: number;
        prizeReserved: number;
        totalHistoricalRevenue: number;
        totalHistoricalPrizes: number;
        platformSurplus: number;
    };
    protocols: JackpotProtocol[];
    distributionConfig: any[];
}

const JACKPOT_NODES = [
    { id: 'randomizer', label: 'Randomizer', desc: 'RNG Seed & Draw Logic' },
    { id: 'ledger', label: 'Ledger', desc: 'Ticket Sales & Accounting' },
    { id: 'cashback', label: 'Cashback', desc: '20% Routing Protocol' },
    { id: 'reserve', label: 'Reserve', desc: 'Prize Pool Liquidity' },
    { id: 'gateway', label: 'Gateway', desc: 'Winner Payout execution' }
];

export default function JackpotOverhaul() {
    const [stats, setStats] = useState<JackpotStats | null>(null);
    const [logs, setLogs] = useState<JackpotLog[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Multi-sig Intervention State
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'PAUSE' | 'RESUME'>('PAUSE');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Config Edit State
    const [editMode, setEditMode] = useState(false);
    const [configForm, setConfigForm] = useState({ ticketPrice: 0, ticketLimit: 0 });
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    const { connectionStatus } = useAdminSocket({
        onJackpotUpdate: (data: JackpotStats) => {
            if (data && data.activeDraw) {
                setStats(data);
                if (!editMode) {
                    setConfigForm({
                        ticketPrice: data.activeDraw.ticketPrice,
                        ticketLimit: data.activeDraw.totalTickets
                    });
                }
            }
        },
        onJackpotActivity: (log) => {
            if (log.adminId) {
                setLogs(prev => [log as JackpotLog, ...prev].slice(0, 100));
            }
            setEvents(prev => [log, ...prev].slice(0, 30));
        },
        onJackpotTicket: (data) => {
            setStats(prev => {
                if (!prev || !prev.activeDraw) return prev;
                return {
                    ...prev,
                    activeDraw: { ...prev.activeDraw, ticketsSold: data.ticketsSold }
                };
            });
        }
    });

    const fetchData = async () => {
        try {
            const token = getToken();
            const [dashRes, logsRes] = await Promise.all([
                fetch('/api/admin/jackpot/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
                fetch('/api/admin/jackpot/logs', { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const dashData = await dashRes.json();
            const logsData = await logsRes.json();

            if (dashData.status === 'success') {
                setStats(dashData.data);
                setConfigForm({
                    ticketPrice: dashData.data.activeDraw?.ticketPrice || 10,
                    ticketLimit: dashData.data.activeDraw?.totalTickets || 1000
                });
            }
            if (logsData.status === 'success') setLogs(logsData.data);
        } catch (error) {
            console.error('Failed to sync with Jackpot Core:', error);
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
            const endpoint = actionType === 'PAUSE' ? '/api/admin/jackpot/pause' : '/api/admin/jackpot/resume';
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

    const handleUpdateParams = async () => {
        setIsUpdating(true);
        try {
            const res = await fetch('/api/admin/jackpot/update-params', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketPrice: configForm.ticketPrice, ticketLimit: configForm.ticketLimit })
            });
            if ((await res.json()).status === 'success') setEditMode(false);
        } finally { setIsUpdating(false); }
    };

    const handleManualDraw = async () => {
        if (!confirm('Authorize immediate draw execution?')) return;
        setIsDrawing(true);
        try {
            await fetch('/api/admin/jackpot/execute-draw', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
        } finally { setIsDrawing(false); }
    };

    const isSystemHealthy = Array.isArray(stats?.protocols) && stats.protocols.every(p => p.status === 'RUNNING');
    const activeProtocols = Array.isArray(stats?.protocols) ? stats.protocols : [];

    if (loading && !stats) return (
        <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="relative h-24 w-24">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-purple-500/10 border-t-purple-500" />
                <Trophy className="h-10 w-10 text-purple-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-purple-500 font-black tracking-[0.4em] text-[10px] uppercase animate-pulse">Syncing Jackpot Ledger...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white/90 p-8 space-y-10 pb-32">
            {/* Cybernetic Header */}
            <div className={cn(
                "relative group overflow-hidden rounded-[40px] border p-12 transition-all duration-700",
                isSystemHealthy ? "border-purple-500/10 bg-purple-500/5 shadow-[0_0_50px_rgba(168,85,247,0.05)]" : "border-red-500/30 bg-red-500/5 shadow-[0_0_50px_rgba(239,68,68,0.1)] shadow-red-500/20"
            )}>
                <div className={cn("absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2",
                    isSystemHealthy ? "bg-purple-500/5" : "bg-red-500/10")} />

                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="space-y-6 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4">
                            <Badge variant="outline" className={cn(
                                "uppercase tracking-[0.4em] text-[10px] font-black py-2 px-6 rounded-full border-2",
                                isSystemHealthy ? "border-purple-500/30 bg-purple-500/10 text-purple-400" : "border-red-500/40 bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                            )}>
                                Jackpot_Protocol: {isSystemHealthy ? 'ONLINE' : 'RESTRICTED'}
                            </Badge>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Activity className={cn("h-3 w-3", isSystemHealthy ? "text-purple-500" : "text-red-500 animate-ping")} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Ledger_Sync_Live</span>
                            </div>
                        </div>
                        <h1 className="text-8xl font-display font-black tracking-tighter italic uppercase">
                            JACKPOT<span className={isSystemHealthy ? "text-purple-500" : "text-red-500"}>{isSystemHealthy ? 'NODE' : 'PAUSED'}</span>
                        </h1>
                        <p className="text-white/40 font-mono text-[11px] uppercase tracking-[0.5em] max-w-xl leading-relaxed mx-auto lg:mx-0">
                            Zero-Trust Draw Governance Interface // Provable Fairness Audit Node
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 bg-white/5 p-8 rounded-[32px] border border-white/10 backdrop-blur-xl">
                        <div className="text-center px-4 border-r border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Active Pool</div>
                            <div className="text-3xl font-display font-black italic text-emerald-400">${stats?.activeDraw?.totalPool?.toLocaleString() || '0'}</div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1">Tickets Sold</div>
                            <div className="text-3xl font-display font-black italic text-purple-400">{stats?.activeDraw?.ticketsSold?.toLocaleString() || '0'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Protocol Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {activeProtocols.length > 0 ? JACKPOT_NODES.map((n) => {
                    const protocol = activeProtocols.find(p => p.nodeName === n.id);
                    const isPaused = protocol?.status === 'PAUSED';
                    const isPending = !!protocol?.pendingAction;

                    return (
                        <Card key={n.id} className={cn(
                            "group bg-[#0a0a0a] border-white/5 transition-all duration-300 relative overflow-hidden",
                            isPaused ? "border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.1)]" : "hover:border-white/10 border-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.05)]"
                        )}>
                            {isPaused && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />}

                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                                        isPaused ? "bg-red-500/20 text-red-500" : "bg-purple-500/10 text-purple-500"
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
                }) : (
                    <div className="col-span-full py-20 text-center bg-white/5 rounded-[32px] border border-white/5 border-dashed">
                        <div className="text-[10px] text-white/20 uppercase tracking-[0.4em] animate-pulse">Initializing Jackpot Core Nodes...</div>
                    </div>
                )}
            </div>

            {/* Financial Overview & Real-time Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-white/2 p-8 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Terminal className="h-6 w-6 text-white/40" />
                            <div>
                                <CardTitle className="text-xl font-black italic uppercase tracking-widest text-white/80">Blockchain Integrity Logs</CardTitle>
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-1 font-mono">Jackpot Intervention Trace</p>
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

                {/* Platform Financials Layer */}
                <div className="space-y-8">
                    <Card className="bg-gradient-to-br from-[#0c0c0c] to-black border-white/5">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-sm font-black italic uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
                                <Database className="h-4 w-4 text-purple-500" />
                                Economic Indicators
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] mb-1">Total Revenue</div>
                                    <div className="text-xl font-display font-black text-white italic">${stats?.financials?.totalHistoricalRevenue?.toLocaleString()}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-[8px] text-white/20 font-black uppercase tracking-[0.2em] mb-1">Total Payouts</div>
                                    <div className="text-xl font-display font-black text-white italic">${stats?.financials?.totalHistoricalPrizes?.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] text-emerald-500 font-black uppercase tracking-[0.3em]">Platform Surplus</div>
                                    <div className="text-3xl font-display font-black italic text-emerald-400 mt-1">${stats?.financials?.platformSurplus?.toLocaleString()}</div>
                                </div>
                                <ShieldCheck className="h-10 w-10 text-emerald-500 opacity-20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden relative">
                        <div className="absolute inset-0 bg-purple-500/5 opacity-50" />
                        <CardContent className="p-8 relative space-y-4">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 flex items-center justify-between">
                                <span>Provable Fairness Execution</span>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px]">BLOCKCHAIN_VERIFIED</Badge>
                            </div>
                            <div className="p-4 rounded-xl bg-black border border-white/5 space-y-3">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-white/30 uppercase font-black">Block #</span>
                                    <span className="font-mono text-purple-400">{stats?.previousDraw?.blockNumber || '0x---'}</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-white/30 uppercase font-black text-[9px]">RNG Hash Layer</span>
                                    <span className="font-mono text-[9px] text-white/50 break-all">{stats?.previousDraw?.rngHash || '---'}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Global Rules Hub */}
            <div className="grid lg:grid-cols-4 gap-8">
                <Card className="lg:col-span-1 bg-[#0a0a0a] border-white/5">
                    <CardHeader className="p-6 border-b border-white/5">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-2">
                            <Settings className="h-3 w-3" /> Parameter Control
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Ticket Price (USDT)</label>
                                <Input disabled={!editMode} value={editMode ? configForm.ticketPrice : stats?.activeDraw?.ticketPrice}
                                    onChange={(e) => setConfigForm({ ...configForm, ticketPrice: Number(e.target.value) })}
                                    className="bg-white/5 border-white/10 rounded-xl mt-1 h-10 text-xs font-black" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Draw Limit (Tickets)</label>
                                <Input disabled={!editMode} value={editMode ? configForm.ticketLimit : stats?.activeDraw?.totalTickets}
                                    onChange={(e) => setConfigForm({ ...configForm, ticketLimit: Number(e.target.value) })}
                                    className="bg-white/5 border-white/10 rounded-xl mt-1 h-10 text-xs font-black" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button onClick={() => setEditMode(!editMode)} variant={editMode ? "primary" : "outline"} className="w-full text-[10px] font-black uppercase h-9">
                                {editMode ? 'Cancel Edit' : 'Edit Constraints'}
                            </Button>
                            {editMode && <Button onClick={handleUpdateParams} disabled={isUpdating} className="w-full bg-emerald-500 text-black text-[10px] font-black uppercase h-9">Deploy Params</Button>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-3 bg-[#0a0a0a] border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Trophy className="h-40 w-40" />
                    </div>
                    <CardHeader className="p-6 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Prize Allocation Mapping</CardTitle>
                            <Button onClick={handleManualDraw} disabled={isDrawing || stats?.activeDraw?.ticketsSold === 0}
                                variant="outline" className="border-amber-500/20 text-amber-500 text-[10px] font-black uppercase h-8 px-6 hover:bg-amber-500/10 transition-all">
                                {isDrawing ? 'Transmitting...' : 'Authorized Manual Draw'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {stats?.distributionConfig?.map((tier, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-all group">
                                    <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 group-hover:text-purple-400">{tier.rank} Tier</div>
                                    <div className="text-lg font-display font-black italic text-emerald-400">{tier.prize}</div>
                                    <div className="text-[9px] text-white/40 mt-1 uppercase font-black">{tier.winners} Winners</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Protocol Intervention Modal */}
            <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
                <DialogContent className="bg-[#0c0c0c] border-white/10 text-white max-w-md rounded-[32px] overflow-hidden">
                    <div className={cn("absolute top-0 left-0 w-full h-2", actionType === 'PAUSE' ? "bg-red-500" : "bg-emerald-500")} />
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-3xl font-display font-black italic uppercase tracking-tighter">Confirm Node {actionType === 'PAUSE' ? 'Pause' : 'Resume'}</DialogTitle>
                        <DialogDescription className="text-white/40 text-xs uppercase tracking-widest font-mono mt-2">Administrative Multi-sig approval required for intervention.</DialogDescription>
                    </DialogHeader>
                    <div className="p-8 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Action Justification (Audit Required)</label>
                            <Input placeholder="Enter reason for this intervention..." className="bg-white/5 border-white/10 rounded-xl h-12 text-sm focus:border-purple-500/50 transition-all" value={reason} onChange={(e) => setReason(e.target.value)} />
                        </div>
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Target Node</span>
                                <Badge className="bg-purple-500/20 text-purple-400 uppercase tracking-widest font-black text-[9px]">
                                    {JACKPOT_NODES.find(n => n.id === selectedNode)?.label}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Auth Key</span>
                                <span className="text-[10px] font-mono text-white/40 tracking-tighter">PRT_NODE_{selectedNode?.toUpperCase()}_INTERVENE</span>
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
