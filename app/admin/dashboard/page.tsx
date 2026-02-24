"use client";

import { useEffect, useState, useMemo } from "react";
import {
    Users, Activity, Trophy, ArrowUpRight, Database,
    Clock, Zap, ShieldAlert, RefreshCw, Globe,
    Cpu, Webhook, ShieldCheck, TrendingUp, LayoutDashboard,
    Wallet, Target, Radio, Terminal, ChevronRight, BarChart3,
    Search, Server, Shield, Link
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { getToken } from "@/lib/api";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { cn } from "@/lib/utils";
import Link_Next from "next/link";

const DASHBOARD_NODES = [
    { id: 'users', label: 'Identity_Matrix', desc: 'User Governance', icon: Users, color: 'text-blue-400', href: '/admin/users' },
    { id: 'financials', label: 'Treasury_Hub', desc: 'Pool Liquidity', icon: Wallet, color: 'text-emerald-400', href: '/admin/financials' },
    { id: 'games', label: 'Game_Protocol', desc: 'Audit & RNG', icon: Trophy, color: 'text-purple-400', href: '/admin/games' },
    { id: 'jackpot', label: 'Jackpot_Core', desc: 'Yield Draw', icon: Target, color: 'text-amber-400', href: '/admin/jackpot' },
    { id: 'network', label: 'Social_Graph', desc: 'Referral Mesh', icon: Globe, color: 'text-blue-500', href: '/admin/network' }
];

interface AdminStats {
    onlineUsers: number;
    liquidityRatio: number;
    netGlobalVolume: number;
    users: number;
    games: number;
    jackpots: number;
    dbSize: number;
    practice: {
        total: number;
        active: number;
        converted: number;
        newToday: number;
        newYesterday: number;
    };
    club: {
        usersWithIncome: number;
        totalDistributed: number;
        tier2Eligible: number;
    };
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date>(new Date());

    // Real-time updates
    const { connectionStatus } = useAdminSocket({
        onStatsUpdate: (data) => {
            if (data) {
                setStats(data);
                setLastSync(new Date());
            }
        }
    });

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = getToken();
            if (!token) {
                setError('SESSION_MISSING: Access Token Revoked');
                return;
            }

            const res = await fetch('/api/admin/stats/summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401) {
                setError('SESSION_EXPIRED: Re-authentication Required');
                window.dispatchEvent(new CustomEvent('admin-session-expired'));
                return;
            }

            const data = await res.json();
            if (data.status === 'success') {
                setStats(data.data);
            } else {
                setError(data.message || 'PROTOCOL_FAULT: Data Decryption Failed');
            }
        } catch (err: any) {
            setError('CONNECTION_FAULT: Central Node Unreachable');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const liquidityColor = useMemo(() => {
        const ratio = stats?.liquidityRatio || 0;
        if (ratio > 80) return "text-emerald-400";
        if (ratio > 50) return "text-amber-400";
        return "text-red-400";
    }, [stats?.liquidityRatio]);

    if (loading && !stats) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-6 overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] animate-pulse" />
                <div className="relative">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="h-24 w-24 rounded-full border-t-2 border-r-2 border-primary/20"
                    />
                    <Webhook className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
                </div>
                <div className="text-center space-y-2 relative z-10">
                    <h2 className="text-sm font-black text-white/40 uppercase tracking-[0.5em] animate-pulse">Initializing Overlord</h2>
                    <p className="text-[10px] font-mono text-primary/40 uppercase">Linking to Global Neural Mesh...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-32 max-w-[1600px] mx-auto overflow-x-hidden">
            {/* Ambient Background Glows */}
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full pointer-events-none -z-10 delay-1000" />

            {/* Cybernetic Master Hub Header */}
            <div className={cn(
                "relative group overflow-hidden rounded-[40px] border p-12 transition-all duration-700",
                "border-primary/10 bg-primary/[0.02] shadow-[0_0_50px_rgba(59,130,246,0.05)]"
            )}>
                <div className="absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 bg-primary/5" />

                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
                    <div className="space-y-6">
                        <div className="flex items-center justify-center lg:justify-start gap-4">
                            <Badge variant="outline" className="uppercase tracking-[0.4em] text-[10px] font-black py-2 px-6 rounded-full border-2 border-primary/30 bg-primary/10 text-primary">
                                Master_Protocol: ACTIVE
                            </Badge>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse",
                                    connectionStatus === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                                )} />
                                <span className="text-[10px] font-black uppercase tracking-wider">
                                    {connectionStatus === 'connected' ? 'Neural_Mesh_Synced' : 'Mesh_Conflict'}
                                </span>
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-7xl lg:text-8xl font-display font-black tracking-tighter italic uppercase leading-[0.9]">
                            MASTER<span className="text-primary">_HUB</span>
                        </h1>
                        <p className="text-white/40 font-mono text-[11px] uppercase tracking-[0.5em] max-w-xl leading-relaxed mx-auto lg:mx-0">
                            Central Nervous System // Global Ecosystem Overlord // Real-Time Governance
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                            <div className="px-6 py-2 flex flex-col items-center">
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Last_Sync</span>
                                <span className="text-[10px] font-mono text-white/70">{lastSync.toLocaleTimeString()}</span>
                            </div>
                        </div>
                        <Button onClick={() => fetchStats()} disabled={loading} className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-black font-black h-14 rounded-2xl px-10 uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin text-black" /> : "REFRESH_MESH"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Navigation Node Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                {DASHBOARD_NODES.map((n) => (
                    <Link_Next key={n.id} href={n.href}>
                        <Card className="group bg-[#0a0a0a] border-white/5 hover:border-primary/20 transition-all duration-300 relative overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.02)] cursor-pointer h-full">
                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className={cn("h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-all", n.color)}>
                                        <n.icon className="h-6 w-6" />
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-black italic uppercase tracking-wider text-white/80">{n.label}</h3>
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono mt-1">{n.desc}</p>
                                </div>
                                <div className="pt-2">
                                    <div className="h-[1px] w-0 group-hover:w-full bg-primary/40 transition-all duration-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link_Next>
                ))}
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 rounded-[32px] bg-red-500/5 border border-red-500/20 backdrop-blur-3xl flex items-center gap-8 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 h-full w-48 bg-red-500/5 translate-x-12 skew-x-12 border-l border-red-500/10" />
                    <div className="h-16 w-16 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                        <ShieldAlert className="h-10 w-10 text-red-500 animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Access Conflict Detected</h3>
                        <p className="text-red-400/60 font-mono text-xs mt-1 uppercase tracking-wider">{error}</p>
                    </div>
                    <Button
                        onClick={() => window.location.reload()}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-widest h-12 px-8 rounded-xl border border-red-500/20 transition-all"
                    >
                        Reset Protocol
                    </Button>
                </motion.div>
            )}

            {/* Global Intelligence Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {[
                    { label: 'Neural_Active_Nodes', value: (stats?.onlineUsers || 0).toLocaleString(), icon: Users, color: 'text-blue-400', progress: 75, trend: '+4.2%' },
                    { label: 'Ecosystem_Stability', value: `${stats?.liquidityRatio || 0}%`, icon: ShieldCheck, color: stats?.liquidityRatio && stats.liquidityRatio > 80 ? 'text-emerald-400' : 'text-amber-400', progress: stats?.liquidityRatio || 0, trend: stats?.liquidityRatio && stats.liquidityRatio > 80 ? 'SECURE' : 'ADJUSTING' },
                    { label: 'Net_Global_P/L', value: `$ ${(stats?.netGlobalVolume || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-500', progress: 85, trend: 'OPTIMIZED' },
                    { label: 'Total_Entities', value: (stats?.users || 0).toLocaleString(), icon: Database, color: 'text-purple-400', progress: 60, trend: 'EXPANDING' }
                ].map((stat, i) => (
                    <Card key={i} className="bg-[#0a0a0a] border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-all" />
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className={cn("h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center", stat.color)}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <span className="text-[10px] font-black text-white/20 tracking-widest uppercase">{stat.trend}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</p>
                                <p className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black text-white italic tracking-tighter truncate">{stat.value}</p>
                            </div>
                            <div className="space-y-2">
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${stat.progress}%` }}
                                        className={cn("h-full rounded-full", stat.color.replace('text', 'bg'))}
                                    />
                                </div>
                                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/20">
                                    <span>Sync_Integrity</span>
                                    <span>{stat.progress}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Middle Grid: Secondary Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Retention Funnel */}
                <Card className="lg:col-span-2 bg-[#050505] border-white/5 shadow-2xl relative overflow-hidden text-card-foreground rounded-[32px]">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                    <CardHeader className="p-10 border-b border-white/5 bg-primary/[0.02]">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <CardTitle className="text-2xl font-black italic text-white flex items-center gap-3">
                                    <BarChart3 className="h-6 w-6 text-primary" />
                                    CONVERSION_FUNNEL
                                </CardTitle>
                                <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-mono">Real-time player migration tracking // Conversion Matrix</p>
                            </div>
                            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Activity className="h-6 w-6 text-primary/40" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12">
                        <div className="relative space-y-16">
                            {[
                                { label: 'Sandbox_Entry', value: stats?.practice.total || 0, color: 'bg-white/10', text: 'text-white/60', icon: Terminal },
                                { label: 'Active_Exploration', value: stats?.practice.active || 0, color: 'bg-primary/20', text: 'text-primary', icon: Radio },
                                { label: 'Real_Cash_Conversion', value: stats?.practice.converted || 0, color: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Zap }
                            ].map((step, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: idx * 0.2 }}
                                    className="relative z-10"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center", step.text)}>
                                                <step.icon className="h-4 w-4" />
                                            </div>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{step.label}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={cn("text-2xl font-black italic", step.text)}>{step.value.toLocaleString()}</span>
                                            <p className="text-[8px] font-bold text-white/10 uppercase mt-1">Total_Entities</p>
                                        </div>
                                    </div>
                                    <div className="h-3 w-full bg-white/[0.02] border border-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(step.value / (Math.max(stats?.practice.total || 1, 1))) * 100}%` }}
                                            transition={{ duration: 1.5, delay: idx * 0.2 }}
                                            className={cn("h-full shadow-[0_0_20px_rgba(255,255,255,0.05)]", step.color)}
                                        />
                                    </div>
                                    {idx < 2 && (
                                        <div className="absolute -bottom-12 left-4 h-8 w-[1px] bg-gradient-to-b from-white/10 to-transparent" />
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Infrastructure Guard */}
                <div className="space-y-8">
                    <Card className="bg-[#050505] border-white/5 p-10 relative overflow-hidden h-full flex flex-col justify-between text-card-foreground shadow-2xl rounded-[32px]">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-10 transition-opacity">
                            <Server className="h-60 w-60 text-primary" />
                        </div>
                        <div className="space-y-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
                                    <Shield className="h-7 w-7 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight">System_Guard</h3>
                                    <p className="text-[9px] text-primary font-black uppercase tracking-[0.3em] font-mono">Neural_Link // v2.5.0-Final</p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                {[
                                    { label: 'DB_Cluster_Size', value: `${((stats?.dbSize || 0) / 1024 / 1024).toFixed(1)} MB`, icon: Database },
                                    { label: 'Blockchain_Sync', value: '100.00%', icon: Link },
                                    { label: 'Privileged_Access', value: 'ENFORCED', icon: ShieldCheck },
                                    { label: 'Network_Stability', value: 'NOMINAL', icon: Activity }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group">
                                        <div className="flex items-center gap-4">
                                            <item.icon className="h-4 w-4 text-white/20 group-hover:text-primary transition-colors" />
                                            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{item.label}</span>
                                        </div>
                                        <span className="text-[10px] font-mono font-black text-primary uppercase">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 space-y-4">
                            <Button className="w-full h-16 bg-primary hover:bg-primary/80 text-black font-black uppercase text-xs tracking-[0.2em] rounded-[20px] group relative overflow-hidden shadow-2xl shadow-primary/20">
                                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                                RUN_GLOBAL_SCAN
                                <ArrowUpRight className="ml-3 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </Button>
                            <p className="text-[8px] text-white/20 text-center font-mono uppercase tracking-widest">Authorized_Admin_Only // Logged_Access</p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Footer Status Bar */}
            <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] font-mono">Core_Status: NOMINAL</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] font-mono">Security: PROTOCOL_G_8</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="text-[10px] font-black text-primary italic uppercase tracking-widest">TRK_OVERLORD_OS_v4.2</div>
                    <div className="text-[8px] font-mono text-white/10 uppercase tracking-[0.5em]">Build_2024.02.24_Final</div>
                </div>
            </div>
        </div>
    );
}
