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
    XCircle
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

interface EmergencyModule {
    moduleName: string;
    status: 'RUNNING' | 'PAUSED';
    lastChangedBy?: string;
    lastReason?: string;
    lastChangedAt?: string;
    pendingAction?: {
        action: 'PAUSE' | 'RESUME';
        approvals: string[];
        requiredApprovals: number;
    } | null;
}

interface EmergencyLog {
    _id: string;
    adminId: string;
    role: string;
    action: string;
    affectedModules: string[];
    reason: string;
    timestamp: string;
    ipAddress?: string;
}

const MODULES = [
    { id: 'gameEngine', label: 'Game Engine', desc: 'Core Betting & Resolution' },
    { id: 'roi', label: 'ROI / Cashback', desc: 'Daily Yield Redistribution' },
    { id: 'jackpot', label: 'Jackpot', desc: 'Lucky Draw & Prize Pool' },
    { id: 'clubIncome', label: 'Club Income', desc: 'Global Turnover Dividends' },
    { id: 'withdrawal', label: 'Withdrawal', desc: 'Capital Outflow Gateway' }
];

export default function EmergencyProtocol() {
    const [protocols, setProtocols] = useState<EmergencyModule[]>([]);
    const [logs, setLogs] = useState<EmergencyLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedModule, setSelectedModule] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'PAUSE' | 'RESUME'>('PAUSE');
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { connectionStatus } = useAdminSocket({
        onEmergencyUpdate: (data: EmergencyModule[]) => {
            if (Array.isArray(data)) {
                setProtocols(data);
                fetchLogs();
            }
        }
    });

    const fetchData = async () => {
        try {
            const [statusRes, logsRes] = await Promise.all([
                fetch('/api/admin/emergency/status', { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch('/api/admin/emergency/logs', { headers: { Authorization: `Bearer ${getToken()}` } })
            ]);
            const statusData = await statusRes.json();
            const logsData = await logsRes.json();
            if (statusData.status === 'success' && Array.isArray(statusData.data)) {
                setProtocols(statusData.data);
            }
            if (logsData.status === 'success' && Array.isArray(logsData.data)) {
                setLogs(logsData.data);
            }
        } catch (error) {
            console.error('Failed to fetch emergency data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/admin/emergency/logs', { headers: { Authorization: `Bearer ${getToken()}` } });
            const d = await res.json();
            if (d.status === 'success') setLogs(d.data);
        } catch (error) { }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async () => {
        if (!reason) return;
        setSubmitting(true);
        try {
            const endpoint = actionType === 'PAUSE' ? '/api/admin/emergency/pause' : '/api/admin/emergency/resume';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({ modules: [selectedModule], reason })
            });
            const d = await res.json();
            if (d.status === 'success') {
                setIsActionModalOpen(false);
                setReason('');
                fetchData();
            }
        } catch (error) {
            console.error('Action failed:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const isSystemHealthy = Array.isArray(protocols) && protocols.every(p => p.status === 'RUNNING');

    if (loading) return (
        <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="relative h-24 w-24">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-red-500/10 border-t-red-500"
                />
                <ShieldAlert className="h-10 w-10 text-red-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="text-red-500 font-black tracking-[0.4em] text-[10px] uppercase animate-pulse">
                Engaging Security Node...
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white/90 p-8 space-y-10 pb-32">
            {/* Header: Security Status */}
            <div className={cn(
                "relative group overflow-hidden rounded-[40px] border p-12 transition-all duration-700",
                isSystemHealthy ? "border-emerald-500/10 bg-emerald-500/5 shadow-[0_0_50px_rgba(16,185,129,0.05)]" : "border-red-500/30 bg-red-500/5 shadow-[0_0_50px_rgba(239,68,68,0.1)] shadow-red-500/20"
            )}>
                <div className={cn(
                    "absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2",
                    isSystemHealthy ? "bg-emerald-500/5" : "bg-red-500/10"
                )} />

                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="space-y-6 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4">
                            <Badge variant="outline" className={cn(
                                "uppercase tracking-[0.4em] text-[10px] font-black py-2 px-6 rounded-full border-2",
                                isSystemHealthy ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/40 bg-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                            )}>
                                Protocol_Alpha: {isSystemHealthy ? 'HEALTHY' : 'EMERGENCY_ACTIVE'}
                            </Badge>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Activity className={cn("h-3 w-3", isSystemHealthy ? "text-emerald-500" : "text-red-500 animate-ping")} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Node_Sync_Live</span>
                            </div>
                        </div>
                        <h1 className="text-8xl font-display font-black tracking-tighter italic uppercase">
                            SYSTEM<span className={isSystemHealthy ? "text-emerald-500" : "text-red-500"}>{isSystemHealthy ? 'VAULT' : 'PAUSED'}</span>
                        </h1>
                        <p className="text-white/40 font-mono text-[11px] uppercase tracking-[0.5em] max-w-xl leading-relaxed mx-auto lg:mx-0">
                            Centralized Emergency Intervention Interface // Immutable Audit Governance Layer
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <div className={cn(
                            "h-40 w-40 rounded-full border-4 flex items-center justify-center transition-all duration-1000",
                            isSystemHealthy
                                ? "border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.1)]"
                                : "border-red-500/40 bg-red-500/10 shadow-[0_0_60px_rgba(239,68,68,0.3)] animate-pulse"
                        )}>
                            {isSystemHealthy ? <ShieldCheck className="h-20 w-20 text-emerald-500" /> : <ShieldAlert className="h-20 w-20 text-red-500" />}
                        </div>
                        <div className="text-center">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">Network Integrity</div>
                            <div className={cn("text-xs font-black tracking-widest", isSystemHealthy ? "text-emerald-500" : "text-red-500")}>
                                {isSystemHealthy ? 'FULL_PROTOCOL_RUNNING' : 'RESTRICTED_MODE_ENGAGED'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {(Array.isArray(protocols) ? protocols : []).length > 0 ? MODULES.map((m) => {
                    const protocol = Array.isArray(protocols) ? protocols.find(p => p.moduleName === m.id) : null;
                    const isPaused = protocol?.status === 'PAUSED';
                    const isPending = protocol?.pendingAction !== null;

                    return (
                        <Card key={m.id} className={cn(
                            "group bg-[#0a0a0a] border-white/5 transition-all duration-300 relative overflow-hidden",
                            isPaused ? "border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.1)]" : "hover:border-white/10"
                        )}>
                            {isPaused && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />}

                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className={cn(
                                        "h-12 w-12 rounded-2xl flex items-center justify-center transition-all",
                                        isPaused ? "bg-red-500/20 text-red-500" : "bg-white/5 text-white/20 group-hover:text-emerald-400 group-hover:bg-emerald-500/10"
                                    )}>
                                        {isPaused ? <Lock className="h-6 w-6" /> : <Unlock className="h-6 w-6" />}
                                    </div>
                                    <Badge className={cn(
                                        "font-black uppercase tracking-[0.2em] text-[9px] px-3 py-1",
                                        isPaused ? "bg-red-500/20 text-red-500" : "bg-emerald-500/20 text-emerald-500"
                                    )}>
                                        {isPaused ? 'PAUSED' : 'RUNNING'}
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="text-lg font-black italic uppercase tracking-wider text-white/80">{m.label}</h3>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono mt-2">{m.desc}</p>
                                </div>

                                {isPending ? (
                                    <div className="space-y-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[9px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-2">
                                                <RefreshCcw className="h-3 w-3 animate-spin" />
                                                Pending {protocol?.pendingAction?.action || 'Action'}
                                            </div>
                                            <div className="text-[9px] font-mono text-white/40">
                                                {protocol?.pendingAction?.approvals?.length || 0}/{protocol?.pendingAction?.requiredApprovals || 2}
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-amber-500"
                                                initial={{ width: 0 }}
                                                animate={{
                                                    width: protocol?.pendingAction
                                                        ? `${(protocol.pendingAction.approvals.length / protocol.pendingAction.requiredApprovals) * 100}%`
                                                        : '0%'
                                                }}
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-[10px] font-black uppercase h-8"
                                            onClick={() => {
                                                if (protocol?.pendingAction) {
                                                    setSelectedModule(m.id);
                                                    setActionType(protocol.pendingAction.action);
                                                    setIsActionModalOpen(true);
                                                }
                                            }}
                                        >
                                            Confirm Action
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full text-[10px] font-black uppercase h-10 tracking-[0.2em] border-white/5 bg-transparent",
                                            isPaused ? "hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30" : "hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                                        )}
                                        onClick={() => {
                                            setSelectedModule(m.id);
                                            setActionType(isPaused ? 'RESUME' : 'PAUSE');
                                            setIsActionModalOpen(true);
                                        }}
                                    >
                                        Request {isPaused ? 'Resume' : 'Pause'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                }) : (
                    <div className="col-span-full py-20 text-center bg-white/5 rounded-[32px] border border-white/5 border-dashed">
                        <div className="text-[10px] text-white/20 uppercase tracking-[0.4em] animate-pulse">Initializing Core Nodes...</div>
                    </div>
                )}
            </div>

            {/* Audit Logs Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-white/2 p-8 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Terminal className="h-6 w-6 text-white/40" />
                            <div>
                                <CardTitle className="text-xl font-black italic uppercase tracking-widest text-white/80">Blockchain Integrity Logs</CardTitle>
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-1 font-mono">Immutable Safety Trace</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={fetchLogs}>
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
                                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Modules</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Admin</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="popLayout">
                                        {logs.map((log) => (
                                            <motion.tr
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                key={log._id}
                                                className="border-b border-white/5 hover:bg-white/[0.02] bg-transparent transition-colors group"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="text-[11px] font-mono text-white/50">{new Date(log.timestamp).toLocaleString()}</div>
                                                    <div className="text-[9px] text-white/20 mt-1 uppercase tracking-tighter">IP: {log.ipAddress || 'unknown'}</div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <Badge className={cn(
                                                        "font-black text-[9px] uppercase tracking-widest py-1 px-3",
                                                        log.action?.includes('ACTIVATED') ? "bg-red-500/20 text-red-500" : "bg-white/5 text-white/40"
                                                    )}>
                                                        {log.action}
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-wrap gap-2">
                                                        {(log.affectedModules || []).map(m => (
                                                            <span key={m} className="text-[10px] font-black text-white/60 bg-white/5 px-2 py-0.5 rounded uppercase">
                                                                {m}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                            <Users className="h-3 w-3 text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-black text-white/80">{log.adminId.slice(0, 8)}...</div>
                                                            <div className="text-[8px] text-blue-400/60 uppercase">{log.role}</div>
                                                        </div>
                                                    </div>
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

                {/* Right Panel: Rules & Stats */}
                <div className="space-y-8">
                    <Card className="bg-gradient-to-br from-[#0c0c0c] to-black border-white/5">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="text-sm font-black italic uppercase tracking-[0.3em] text-white/40 flex items-center gap-3">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                Emergency Principles
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 pt-0 space-y-6">
                            {[
                                "Safety focus, not manual control",
                                "Zero manual fund movement",
                                "All actions fully transparent",
                                "Immutable blockchain audit trace",
                                "Multi-sig approval mandatory",
                                "User balances remain untouched"
                            ].map((rule, i) => (
                                <div key={i} className="flex items-center gap-4 group">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-500/40 group-hover:bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all" />
                                    <div className="text-[10px] font-black uppercase tracking-[0.1em] text-white/50 group-hover:text-white transition-colors">{rule}</div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden relative">
                        <div className="absolute inset-0 bg-blue-500/5 opacity-50" />
                        <CardContent className="p-8 relative space-y-6">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/60">Multisig Authority</div>
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    <Lock className="h-8 w-8 text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-3xl font-display font-black italic">2 OF 2</div>
                                    <div className="text-[9px] text-white/30 uppercase tracking-widest mt-1">Required Approvals</div>
                                </div>
                            </div>
                            <p className="text-[10px] text-white/20 font-mono leading-relaxed">
                                Timelock active: 60s delay enforced on all pause interventions for validation.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Action Modal */}
            <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
                <DialogContent className="bg-[#0c0c0c] border-white/10 text-white max-w-md rounded-[32px] overflow-hidden">
                    <div className={cn(
                        "absolute top-0 left-0 w-full h-2",
                        actionType === 'PAUSE' ? "bg-red-500" : "bg-emerald-500"
                    )} />

                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="text-3xl font-display font-black italic uppercase tracking-tighter">
                            Confirm {actionType === 'PAUSE' ? 'Security Pause' : 'Safety Resume'}
                        </DialogTitle>
                        <DialogDescription className="text-white/40 text-xs uppercase tracking-widest font-mono mt-2">
                            A second admin approval is required to activate this protocol.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Action Justification (Mandatory)</label>
                            <Input
                                placeholder="State the reason for this intervention..."
                                className="bg-white/5 border-white/10 rounded-xl h-12 text-sm focus:border-red-500/50 transition-all"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>

                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Affected Module</span>
                                <Badge className="bg-blue-500/20 text-blue-400 uppercase tracking-widest font-black text-[9px]">
                                    {MODULES.find(m => m.id === selectedModule)?.label}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Protocol ID</span>
                                <span className="text-[10px] font-mono text-white/40">SEC_PRT_{selectedModule?.toUpperCase() || 'UNKNOWN'}</span>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-0 flex gap-4">
                        <Button
                            variant="ghost"
                            className="flex-1 rounded-xl uppercase font-black text-[11px] tracking-widest"
                            onClick={() => setIsActionModalOpen(false)}
                        >
                            Abort
                        </Button>
                        <Button
                            className={cn(
                                "flex-1 rounded-xl uppercase font-black text-[11px] tracking-widest h-12 shadow-2xl",
                                actionType === 'PAUSE' ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-black"
                            )}
                            disabled={!reason || submitting}
                            onClick={handleAction}
                        >
                            {submitting ? 'Transmitting...' : `Submit ${actionType === 'PAUSE' ? 'Pause' : 'Resume'}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
