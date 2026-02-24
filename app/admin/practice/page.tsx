"use client";

import { useEffect, useState } from "react";
import {
    Trash2, Users, TrendingUp, AlertCircle, Clock,
    CheckCircle2, RefreshCw, Database, ShieldCheck,
    Activity, Lock, Gamepad2, BarChart4, Network,
    Radio
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/api";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface PracticeStats {
    globalStats: {
        totalPracticeUsers: number;
        activePracticeUsers: number;
        expiredAccounts: number;
        practiceBalanceIssued: number;
        burnedPracticePoints: number;
    };
    bonusControl: {
        bonusAmount: number;
        maxUsers: number;
        creditType: string;
        expiryWindowDays: number;
    };
    gameLogic: {
        practiceGamesPlayed: number;
        practiceWins: number;
        practiceLosses: number;
    };
    conversionFunnel: {
        eligibleForConversion: number;
        convertedToRealCount: number;
        conversionRate: string;
    };
    mlmActualFlow: {
        lvl1: number;
        lvl2_5: number;
        lvl6_10: number;
        lvl11_15: number;
        total: number;
    };
}

export default function SandboxEcosystem() {
    const [stats, setStats] = useState<PracticeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [cleaning, setCleaning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updatingConfig, setUpdatingConfig] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [configForm, setConfigForm] = useState({
        bonusAmount: 100,
        maxUsers: 100000,
        expiryDays: 30
    });

    const { connectionStatus } = useAdminSocket({
        onPracticeUpdate: (data) => {
            setStats(data);
            setLastUpdated(new Date());
            setLoading(false);
            if (data.bonusControl) {
                setConfigForm({
                    bonusAmount: data.bonusControl.bonusAmount,
                    maxUsers: data.bonusControl.maxUsers,
                    expiryDays: data.bonusControl.expiryWindowDays
                });
            }
        },
        onConfigUpdate: (data) => {
            if (data.practice) {
                setConfigForm({
                    bonusAmount: data.practice.bonusAmount,
                    maxUsers: data.practice.maxUsers,
                    expiryDays: data.practice.expiryDays
                });
            }
        }
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/practice/dashboard', {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (res.status === 401) {
                window.location.href = '/admin/login';
                return;
            }

            const data = await res.json();
            if (data.status === 'success') {
                setStats(data.data);
                setError(null);
            } else {
                setError(data.message || 'Failed to sync with Sandbox Node.');
            }
        } catch (err) {
            console.error('Fetch error', err);
            setError('CONNECTION_FAULT: Unable to reach sandbox servers.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingConfig(true);
        try {
            const res = await fetch('/api/admin/config', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    practice: {
                        bonusAmount: Number(configForm.bonusAmount),
                        maxUsers: Number(configForm.maxUsers),
                        expiryDays: Number(configForm.expiryDays)
                    }
                })
            });
            const data = await res.json();
            if (data.status === 'success') {
                toast.success("Protocol updated on Sandbox Node");
                setError(null);
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Config update error', err);
            setError('Update failed: Network error.');
        } finally {
            setUpdatingConfig(false);
        }
    };

    const handleManualCleanup = async () => {
        setCleaning(true);
        try {
            const res = await fetch('/api/admin/practice/cleanup', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (data.status === 'success') {
                toast.success("Simulation buffer purged successfully");
                fetchStats();
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Cleanup error', err);
            setError('PURGE_FAULT: Failed to execute deletion routine.');
        } finally {
            setCleaning(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
                <div className="relative h-24 w-24">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Database className="h-8 w-8 text-amber-500 animate-pulse" />
                    </div>
                </div>
                <div className="text-amber-500 font-black italic uppercase tracking-[0.3em] text-[10px] animate-pulse">
                    Initializing Sandbox Simulation Metrics...
                </div>
            </div>
        );
    }

    const { globalStats, bonusControl, gameLogic, conversionFunnel } = stats || {};

    return (
        <div className="min-h-screen bg-black text-white/90 space-y-10 pb-32">
            {/* Simulation Header */}
            <div className="relative group overflow-hidden rounded-3xl border border-amber-500/10 bg-gradient-to-br from-[#0c0c0c] to-black p-8">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 text-amber-500 uppercase tracking-[0.3em] text-[9px] font-black py-1">
                                Isolated Virtual Economy Node
                            </Badge>
                        </div>
                        <h1 className="text-6xl font-display font-black tracking-tight italic flex items-center gap-4 uppercase">
                            SANDBOX<span className="text-amber-500">SYSTEM</span>
                            <Activity className="h-10 w-10 text-amber-500/40 animate-pulse" />
                        </h1>
                        <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.3em]">Simulation Oversight & Conversion Metrics</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Global Status</div>
                                <div className={cn("text-sm font-black italic uppercase tracking-widest", connectionStatus === 'connected' ? "text-amber-400" : "text-red-400")}>
                                    {connectionStatus === 'connected' ? 'NODE_SYNCED' : 'FAULT_DETECTED'}
                                </div>
                            </div>
                            <div className="h-10 w-[1px] bg-white/10" />
                            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                <Network className="h-6 w-6 text-amber-500 animate-pulse" />
                            </div>
                        </div>

                        <Button
                            onClick={handleManualCleanup}
                            disabled={cleaning}
                            className="bg-red-500/10 text-red-500 border border-red-500/20 font-black h-16 rounded-2xl px-10 hover:bg-red-500 hover:text-white transition-all group uppercase tracking-widest text-[11px] shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                        >
                            {cleaning ? <RefreshCw className="h-5 w-5 animate-spin mr-3" /> : <Trash2 className="h-5 w-5 mr-3 group-hover:rotate-12 transition-transform" />}
                            Purge Expired Buffers
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-500 font-black text-[11px] uppercase tracking-widest flex items-center gap-4 shadow-[0_0_40px_rgba(239,68,68,0.05)]"
                >
                    <AlertCircle className="h-5 w-5 animate-pulse" />
                    {error}
                </motion.div>
            )}

            {/* Core Metrics Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Active Learners", value: globalStats?.activePracticeUsers, sub: "Last 30-Day Window", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
                    { label: "Expired Buffers", value: globalStats?.expiredAccounts, sub: "Marked for Deletion", icon: Clock, color: "text-red-400", bg: "bg-red-500/10" },
                    { label: "Practice Issued", value: globalStats?.practiceBalanceIssued, sub: "Virtual Points Only", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                    { label: "System Burn", value: globalStats?.burnedPracticePoints, sub: "Protocol Nullified", icon: Activity, color: "text-rose-500", bg: "bg-rose-500/10" }
                ].map((s) => (
                    <Card key={s.label} className="bg-[#0a0a0a] border-white/5 group hover:border-amber-500/30 transition-all overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${s.bg} blur-[60px] opacity-20 -translate-y-1/2 translate-x-1/2`} />
                        <CardContent className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div className="text-[10px] font-black uppercase text-white/30 tracking-[0.3em] font-mono group-hover:text-white/60 transition-colors">{s.label}</div>
                                <s.icon className={cn("h-6 w-6 font-black", s.color)} />
                            </div>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={s.value}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={cn("text-4xl font-display font-black italic tracking-tighter transition-all", s.color)}
                                >
                                    {(s.value || 0).toLocaleString()}
                                </motion.div>
                            </AnimatePresence>
                            <div className="text-[9px] font-black tracking-[0.2em] uppercase mt-4 text-white/10 group-hover:text-white/20 transition-colors">{s.sub}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Conversion Funnel Card */}
                <Card className="lg:col-span-2 bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-amber-500/5 p-8 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <BarChart4 className="h-6 w-6 text-amber-500" />
                            <div>
                                <CardTitle className="text-lg font-black italic uppercase tracking-widest text-white">Conversion Pathway Monitor</CardTitle>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Practice Ledger → Activation Pipeline</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Success Rate</div>
                            <div className="text-2xl font-black text-amber-500 font-mono">{conversionFunnel?.conversionRate || '0.00'}%</div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10">
                        <div className="grid md:grid-cols-2 gap-10">
                            {/* Visual Funnel */}
                            <div className="space-y-8">
                                <div className="relative pt-2">
                                    <div className="flex justify-between items-end mb-4">
                                        <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">Real-Time Progression</div>
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <div className="h-16 w-full bg-white/5 rounded-2xl border border-white/10 overflow-hidden group">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: '100%' }}
                                                    className="h-full bg-white/5"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-between px-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Simulation Pool</span>
                                                    <span className="text-xl font-black italic">{(globalStats?.activePracticeUsers || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-center -my-2 relative z-10">
                                            <div className="h-6 w-[2px] bg-gradient-to-b from-white/20 to-amber-500/40" />
                                        </div>
                                        <div className="relative">
                                            <div className="h-16 w-[90%] mx-auto bg-amber-500/5 rounded-2xl border border-amber-500/20 overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.05)]">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, ((conversionFunnel?.eligibleForConversion || 0) / (globalStats?.activePracticeUsers || 1)) * 100)}%` }}
                                                    className="h-full bg-amber-500/10"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-between px-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">Eligible Nodes</span>
                                                    <span className="text-xl font-black italic text-amber-500">{(conversionFunnel?.eligibleForConversion || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-center -my-2 relative z-10">
                                            <div className="h-6 w-[2px] bg-gradient-to-b from-amber-500/40 to-emerald-500/40" />
                                        </div>
                                        <div className="relative">
                                            <div className="h-16 w-[80%] mx-auto bg-emerald-500/5 rounded-2xl border border-emerald-500/20 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, parseFloat(conversionFunnel?.conversionRate || '0'))}%` }}
                                                    className="h-full bg-emerald-500/20"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-between px-6">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Mainnet Switched</span>
                                                    <span className="text-xl font-black italic text-emerald-400">{(conversionFunnel?.convertedToRealCount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Logic Summary */}
                            <div className="flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div className="p-6 rounded-2xl border border-white/5 bg-black/40 space-y-2">
                                        <div className="text-[9px] font-black uppercase text-white/20 tracking-[0.3em]">Protocol Yield Forecast</div>
                                        <div className="text-xl font-black text-white italic uppercase tracking-tight">Active Conversion Buffer</div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed mt-2">
                                            Simulation nodes are analyzed for the 10+ USDT deposit threshold. Once triggered, the sandbox balance is burned and the user enters the Real Money lifecycle.
                                        </p>
                                    </div>
                                    <div className="p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 flex items-center gap-5">
                                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-emerald-400 italic">CONVERSION_STABLE</div>
                                            <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1">Verified Real-Time Influx</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Registry Saturation</span>
                                        <span className="text-[10px] font-black text-amber-500">
                                            {((globalStats?.totalPracticeUsers || 0) / (bonusControl?.maxUsers || 1) * 100).toFixed(1)}% LOADED
                                        </span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, ((globalStats?.totalPracticeUsers || 0) / (bonusControl?.maxUsers || 1)) * 100)}%` }}
                                            className="h-full bg-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Simulation Logic Card */}
                <Card className="bg-[#0a0a0a] border-white/5">
                    <CardHeader className="border-b border-white/5 bg-blue-500/5 p-8">
                        <div className="flex items-center gap-4">
                            <Gamepad2 className="h-6 w-6 text-blue-400" />
                            <div>
                                <CardTitle className="text-sm font-black italic uppercase tracking-widest text-white">Match Resolution Logic</CardTitle>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Simulated Multiplier Variance</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="p-6 rounded-2xl bg-black border border-white/5 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="text-xl font-black text-white italic">{(gameLogic?.practiceGamesPlayed || 0).toLocaleString()}</div>
                                <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Total Simulated Rounds</div>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-blue-500/5 flex items-center justify-center border border-white/10">
                                <Activity className="h-6 w-6 text-blue-500/40" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group hover:border-emerald-500/30 transition-all">
                                <div className="text-2xl font-black text-emerald-400 italic">{(gameLogic?.practiceWins || 0).toLocaleString()}</div>
                                <div className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest mt-2 font-mono">VIRTUAL_WINS</div>
                            </div>
                            <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 group hover:border-rose-500/30 transition-all">
                                <div className="text-2xl font-black text-rose-500 italic">{(gameLogic?.practiceLosses || 0).toLocaleString()}</div>
                                <div className="text-[9px] font-black text-rose-500/40 uppercase tracking-widest mt-2 font-mono">VIRTUAL_LOSSES</div>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-[#050505] border border-white/5 space-y-4">
                            <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">Protocol Attributes</div>
                            {[
                                { l: "Match Latency", v: "0.00ms (Local)", c: "text-emerald-400" },
                                { l: "Logic Type", v: "Randomized Virtual", c: "text-white/60" },
                                { l: "Persistence", v: "Temporary Ledger", c: "text-blue-400" }
                            ].map((row) => (
                                <div key={row.l} className="flex justify-between items-center py-1">
                                    <span className="text-[10px] text-white/20 uppercase tracking-widest">{row.l}</span>
                                    <span className={cn("text-[10px] font-black font-mono", row.c)}>{row.v}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Protocol Config Card */}
                <Card className="bg-[#0a0a0a] border-white/5">
                    <CardHeader className="border-b border-white/5 bg-amber-500/5 p-8">
                        <div className="flex items-center gap-4">
                            <Lock className="h-6 w-6 text-amber-500" />
                            <div>
                                <CardTitle className="text-sm font-black italic uppercase tracking-widest text-white">Bonus Control Protocol</CardTitle>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Direct Initialization Parameter Override</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <form onSubmit={handleUpdateConfig} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest font-mono">Bonus Amount (USDT)</label>
                                    <div className="relative group">
                                        <Input
                                            type="number"
                                            value={configForm.bonusAmount}
                                            onChange={(e) => setConfigForm({ ...configForm, bonusAmount: parseInt(e.target.value) })}
                                            className="bg-black border-white/10 text-emerald-400 font-black text-sm h-14 pl-6 rounded-2xl focus:ring-amber-500/20 group-hover:border-amber-500/30 transition-all font-mono"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20">VIRTUAL</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-white/30 tracking-widest font-mono">Purge Window (Days)</label>
                                    <Input
                                        type="number"
                                        value={configForm.expiryDays}
                                        onChange={(e) => setConfigForm({ ...configForm, expiryDays: parseInt(e.target.value) })}
                                        className="bg-black border-white/10 text-white font-black text-sm h-14 pl-6 rounded-2xl focus:ring-amber-500/20 hover:border-amber-500/30 transition-all font-mono"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-white/30 tracking-widest font-mono">Max Node Capacity</label>
                                <Input
                                    type="number"
                                    value={configForm.maxUsers}
                                    onChange={(e) => setConfigForm({ ...configForm, maxUsers: parseInt(e.target.value) })}
                                    className="bg-black border-white/10 text-blue-400 font-black text-sm h-14 pl-6 rounded-2xl focus:ring-amber-500/20 hover:border-amber-500/30 transition-all font-mono"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={updatingConfig}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black uppercase italic tracking-[0.3em] h-16 rounded-[24px] shadow-[0_10px_40px_rgba(245,158,11,0.2)] active:scale-[0.97] transition-all text-[11px]"
                            >
                                {updatingConfig ? <RefreshCw className="h-5 w-5 animate-spin mr-3" /> : <ShieldCheck className="h-5 w-5 mr-3" />}
                                Overwrite Protocol Parameters
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Hierarchical Yield Forecast */}
                <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-blue-500/5 p-8 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4 text-blue-400">
                            <Network className="h-6 w-6" />
                            <div>
                                <CardTitle className="text-sm font-black italic uppercase tracking-widest text-white">MLM Simulation Matrix</CardTitle>
                                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Layered Reward Structure Prediction</p>
                            </div>
                        </div>
                        <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 font-black text-[9px] uppercase tracking-widest py-1.5 px-4 rounded-full">
                            Live Hub Telemetry
                        </Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex px-8 py-5 border-b border-white/5 text-[10px] font-black uppercase text-white/20 tracking-[0.3em] bg-black/40">
                            <div className="flex-1">Network Hierarchy</div>
                            <div className="w-1/4 text-center">Reward %</div>
                            <div className="w-1/4 text-center">Simulation Flow</div>
                            <div className="w-1/4 text-right">Real-Time Actual</div>
                        </div>
                        <div className="divide-y divide-white/[0.03]">
                            {[
                                { lvl: 'Hierarchy 01 (Direct Sp.)', pct: '10.0%', factor: 0.1, key: 'lvl1' },
                                { lvl: 'Hierarchy 02 – 05', pct: '2.0%', factor: 0.02, key: 'lvl2_5' },
                                { lvl: 'Hierarchy 06 – 10', pct: '1.0%', factor: 0.01, key: 'lvl6_10' },
                                { lvl: 'Hierarchy 11 – 15', pct: '0.5%', factor: 0.005, key: 'lvl11_15' },
                            ].map((row, i) => (
                                <div key={i} className="flex px-10 py-6 hover:bg-white/[0.01] items-center transition-all group">
                                    <div className="flex-1 text-[12px] font-black uppercase tracking-widest text-white/70 group-hover:text-white transition-colors flex items-center gap-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500/40" />
                                        {row.lvl}
                                    </div>
                                    <div className="w-1/4 text-center text-[11px] font-mono font-black text-blue-500/60">{row.pct}</div>
                                    <div className="w-1/4 text-center text-sm font-mono font-black text-blue-400 tracking-tight italic">
                                        + {(configForm.bonusAmount * row.factor).toFixed(2)} USDT
                                    </div>
                                    <div className="w-1/4 text-right text-sm font-mono font-black text-emerald-400">
                                        {(stats?.mlmActualFlow?.[row.key as keyof typeof stats.mlmActualFlow] || 0).toFixed(2)} USDT
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="px-10 py-8 bg-blue-500/[0.03] border-t border-white/5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Total Simulation Liability</p>
                                <p className="text-xl font-display font-black text-blue-400 italic">
                                    + {(configForm.bonusAmount * 0.135).toFixed(2)} USDT
                                </p>
                            </div>
                            <div className="text-right space-y-1">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Live Network Incurred</p>
                                <p className="text-xl font-display font-black text-emerald-400 italic">
                                    {(stats?.mlmActualFlow?.total || 0).toFixed(2)} USDT
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-blue-500/[0.02] border-t border-white/5">
                            <div className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-400/40 text-center flex items-center justify-center gap-4">
                                <span className="h-[1px] flex-1 bg-blue-500/10" />
                                End of Simulation Matrix
                                <span className="h-[1px] flex-1 bg-blue-500/10" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Strict Protocol Footer */}
            <div className="p-10 rounded-[40px] bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[120px] pointer-events-none" />
                <div className="relative flex flex-col md:flex-row items-center gap-10">
                    <div className="h-28 w-28 shrink-0 rounded-[32px] bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.1)] group-hover:scale-105 transition-transform">
                        <ShieldCheck className="h-12 w-12 text-amber-500" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-3xl font-display font-black text-amber-500 italic uppercase tracking-tight">Isolated Sandbox Safety Protocols</h3>
                        <p className="text-[11px] text-white/40 uppercase font-bold leading-relaxed tracking-[0.2em] max-w-6xl">
                            The Sandbox Ecosystem acts as a strictly partitionable testing layer for potential users.
                            Practice balances possess <span className="text-amber-500/60">Zero Intrinsic Value</span> and are restricted from all
                            External Protocol Interactions. No Mainnet gateways exist for sandbox assets. Automated Data Burn routines
                            will neutralize simulation nodes failing the {bonusControl?.expiryWindowDays || 30}-day 10+ USDT Real-Money Activation challenge.
                            This is an Immutable Administrative Control Layer—balance modification is physically impossible by design.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
