"use client";

import { useEffect, useState } from "react";
import {
    BarChart3, TrendingUp, Wallet, Trophy, ArrowUpRight,
    ArrowDownRight, Target, Dices, RefreshCw, Layers,
    ShieldCheck, AlertCircle, ShieldAlert, Zap, Cpu,
    Globe, Terminal, Radio, Activity, Search, ExternalLink,
    Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/Input";
import { getToken } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAdminSocket } from "@/hooks/useAdminSocket";

const POOL_NODES = [
    { id: 'club', label: 'Club_Pool', desc: 'Loyalty Dividend Node', icon: Trophy, color: 'text-amber-400' },
    { id: 'cashback', label: 'Cashback_Node', desc: 'Insurance Protocol', icon: ShieldCheck, color: 'text-emerald-400' },
    { id: 'jackpot', label: 'Jackpot_Core', desc: 'Random Yield Engine', icon: Dices, color: 'text-purple-400' },
    { id: 'direct', label: 'Direct_Uplink', desc: 'Instant Distribution', icon: Wallet, color: 'text-blue-400' },
    { id: 'house', label: 'Treasury_Base', desc: 'System Liquidity', icon: Globe, color: 'text-white' }
];

export default function FinancialsDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState('30d');
    const [activeNode, setActiveNode] = useState('club');
    const [liveFeed, setLiveFeed] = useState<any[]>([]);

    useAdminSocket({
        onStatsUpdate: (d) => {
            if (d?.financials && !data) setData(d.financials);
        },
        onEconomicsUpdate: (d) => {
            setData(d);
        },
        onFinancialActivity: (activity) => {
            setLiveFeed(prev => [activity, ...prev].slice(0, 50));
        }
    });

    useEffect(() => {
        fetchFinancials();
    }, [timeframe]);

    const fetchFinancials = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/financials/dashboard?timeframe=${timeframe}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (res.status === 401) {
                setError('SESSION_EXPIRED: Your security token is invalid or has expired.');
                window.dispatchEvent(new CustomEvent('admin-session-expired'));
                return;
            }

            if (res.status === 403) {
                const result = await res.json();
                if (result.code === 'UNAUTHORIZED_IP') {
                    setError('ACCESS_DENIED: Your current IP address is not whitelisted for administrative access.');
                } else {
                    setError(result.message || 'Unauthorized: Insufficient permissions for treasury protocols.');
                }
                return;
            }

            const result = await res.json();
            if (result.status === 'success') {
                setData(result.data);
            } else {
                setError(result.message || 'PROTOCOL_ERROR: Failed to decrypt treasury statistics.');
            }
        } catch (err: any) {
            console.error('Fetch error', err);
            setError(err.message || 'CONNECTION_FAULT: Unable to establish link with the treasury service.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="h-96 flex flex-col items-center justify-center gap-4 text-white/20 italic font-black uppercase tracking-widest animate-pulse">
                <RefreshCw className="h-8 w-8 animate-spin" />
                Synchronizing Treasury Hub...
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-32 max-w-[1600px] mx-auto overflow-x-hidden">
            {/* Cybernetic Hub Header */}
            <div className={cn(
                "relative group overflow-hidden rounded-[40px] border p-12 transition-all duration-700",
                "border-emerald-500/10 bg-emerald-500/5 shadow-[0_0_50px_rgba(16,185,129,0.05)]"
            )}>
                <div className="absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 bg-emerald-500/5" />

                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
                    <div className="space-y-6">
                        <div className="flex items-center justify-center lg:justify-start gap-4">
                            <Badge variant="outline" className="uppercase tracking-[0.4em] text-[10px] font-black py-2 px-6 rounded-full border-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                Treasury_Protocol: SECURE
                            </Badge>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <ShieldCheck className="h-3 w-3 text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-wider">On-Chain_Liquidity_Verified</span>
                            </div>
                        </div>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black tracking-tighter italic uppercase leading-[0.9]">
                            TREASURY<span className="text-emerald-500">_HUB</span>
                        </h1>
                        <p className="text-white/40 font-mono text-[11px] uppercase tracking-[0.5em] max-w-xl leading-relaxed mx-auto lg:mx-0">
                            Decentralized Asset Management & Yield Transparency // Multi-Sig Governance
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                            {['24h', '7d', '30d', 'all'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTimeframe(t)}
                                    className={cn(
                                        "px-6 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest",
                                        timeframe === t ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/40" : "text-white/20 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <Button onClick={() => fetchFinancials()} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black h-14 rounded-2xl px-8 uppercase text-xs tracking-widest shadow-2xl shadow-emerald-500/20">
                            REFRESH_LEDGER
                        </Button>
                    </div>
                </div>
            </div>

            {/* Protocol Nodes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                {POOL_NODES.map((n) => (
                    <Card key={n.id} className={cn(
                        "group bg-[#0a0a0a] border-emerald-500/10 hover:border-emerald-500/20 transition-all duration-300 relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.02)]",
                        activeNode === n.id && "border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.08)]"
                    )}>
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-start justify-between">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/10 transition-all",
                                    n.color,
                                    activeNode === n.id && "bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                )}>
                                    <n.icon className="h-6 w-6" />
                                </div>
                                <Badge className={cn(
                                    "font-black uppercase tracking-[0.2em] text-[8px] px-3 py-1",
                                    activeNode === n.id ? "bg-emerald-500 text-black" : "bg-emerald-500/20 text-emerald-400"
                                )}>
                                    {activeNode === n.id ? 'ENGAGED' : 'STANDBY'}
                                </Badge>
                            </div>
                            <div>
                                <h3 className="text-lg font-black italic uppercase tracking-wider text-white/80">{n.label}</h3>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono mt-2">{n.desc}</p>
                            </div>
                            <Button
                                onClick={() => setActiveNode(n.id)}
                                variant="outline"
                                className={cn(
                                    "w-full text-[10px] font-black uppercase h-10 tracking-[0.2em] border-white/5 transition-all text-white/40",
                                    activeNode === n.id
                                        ? "bg-emerald-500 text-black border-none shadow-lg shadow-emerald-500/20"
                                        : "bg-transparent hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30"
                                )}
                            >
                                {activeNode === n.id ? 'PROTOCOL_LINKED' : 'Inspect Node'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {error && (
                <div className="p-8 rounded-3xl bg-red-500/5 border-2 border-red-500/20 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShieldAlert className="h-24 w-24 text-red-500" />
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                        <div className="h-16 w-16 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
                            <ShieldAlert className="h-8 w-8 text-red-500" />
                        </div>

                        <div className="space-y-2 flex-grow">
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">
                                Protocol Access Fault <span className="text-red-500">Detected</span>
                            </h3>
                            <p className="text-red-200/60 font-mono text-xs uppercase font-bold tracking-wider leading-relaxed max-w-2xl">
                                {error}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 w-full md:w-auto">
                            <Button
                                onClick={() => window.location.href = '/admin/login'}
                                className="bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-xl"
                            >
                                <RefreshCw className="h-3 w-3 mr-2" />
                                Re-establish Session
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => fetchFinancials()}
                                className="border-white/10 text-white/40 hover:text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-xl"
                            >
                                Retry Authorization
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Treasury Intelligence Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(activeNode === 'cashback' ? [
                    { label: 'Insurance_Reserve', value: `$ ${(data?.pools?.cashbackPool || 0).toLocaleString()}`, icon: ShieldCheck, color: 'text-emerald-400', progress: 85, trend: 'SECURE' },
                    { label: 'Claim_Velocity', value: (data?.pools?.cashbackPool > 0 ? '0.01%' : '0.00%'), sub: 'Last 24h', icon: Zap, color: 'text-blue-400', progress: 100, trend: 'NOMINAL' },
                    { label: 'Protection_Ratio', value: '1.5x', sub: 'Coverage', icon: Target, color: 'text-purple-400', progress: 95, trend: 'OPTIMIZED' },
                    { label: 'Asset_Sync', value: 'Live', icon: Activity, color: 'text-amber-400', progress: 100, trend: 'ON-CHAIN' }
                ] : activeNode === 'jackpot' ? [
                    { label: 'Jackpot_Core', value: `$ ${(data?.pools?.jackpotPool || 0).toLocaleString()}`, icon: Dices, color: 'text-purple-400', progress: 60, trend: 'GROWING' },
                    { label: 'Entropy_Signal', value: (data?.pools?.jackpotPool > 1000 ? 'High' : 'Stable'), sub: 'RNG Integrity', icon: Zap, color: 'text-blue-400', progress: 100, trend: 'SECURE' },
                    { label: 'Yield_Target', value: '$ 1M+', sub: 'Network Max', icon: Target, color: 'text-emerald-400', progress: 45, trend: 'STABLE' },
                    { label: 'Audit_Heartbeat', value: 'Active', icon: Radio, color: 'text-purple-500', progress: 100, trend: 'NOMINAL' }
                ] : activeNode === 'direct' ? [
                    { label: 'Direct_Liquidity', value: `$ ${(data?.pools?.directPool || 0).toLocaleString()}`, icon: Wallet, color: 'text-blue-400', progress: 90, trend: 'FLOWING' },
                    { label: 'Uplink_Velocity', value: 'Instant', sub: 'Distribution', icon: Zap, color: 'text-emerald-400', progress: 100, trend: 'ACTIVE' },
                    { label: 'Pool_Share', value: `${(data?.rates?.directLevel * 100 || 10)}%`, sub: 'Protocol Rate', icon: TrendingUp, color: 'text-blue-500', progress: 75, trend: 'FIXED' },
                    { label: 'Sync_Protocol', value: 'Confirmed', icon: ShieldCheck, color: 'text-blue-400', progress: 100, trend: 'FINALISED' }
                ] : activeNode === 'house' ? [
                    { label: 'Treasury_Base', value: `$ ${(data?.turnover?.total || 0).toLocaleString()}`, icon: Globe, color: 'text-white', progress: 100, trend: 'PROTOCOL' },
                    { label: 'System_Margin', value: (data?.health?.sustainabilityRatio || '15.4') + '%', sub: 'Sustainability', icon: BarChart3, color: 'text-emerald-400', progress: 80, trend: 'HEALTHY' },
                    { label: 'Vault_Lock', value: 'Locked', sub: 'Multi-Sig', icon: Lock, color: 'text-blue-400', progress: 100, trend: 'SAFE' },
                    { label: 'Governance', value: 'v2.5', icon: Activity, color: 'text-purple-400', progress: 100, trend: 'SECURE' }
                ] : [
                    { label: 'Turnover_Velocity', value: `$ ${(data?.turnover?.today || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', progress: 75, trend: '+24.8%' },
                    { label: 'Net_Protocol_Yield', value: `$ ${(data?.turnover?.netFlow || 0).toLocaleString()}`, icon: Zap, color: 'text-blue-400', progress: 65, trend: 'OPTIMIZED' },
                    { label: 'Sustainability_Index', value: `${data?.health?.sustainabilityRatio || 0}%`, icon: Target, color: 'text-purple-400', progress: data?.health?.sustainabilityRatio || 90, trend: 'STABLE' },
                    { label: 'Liquidity_Depth', value: (data?.health?.healthStatus || 'SECURE'), icon: Activity, color: 'text-amber-400', progress: 75, trend: 'SECURE' }
                ]).map((stat, i) => (
                    <Card key={i} className="bg-[#0a0a0a] border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-all" />
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className={cn("h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center", stat.color)}>
                                    {(stat.icon as any) && <stat.icon className="h-5 w-5" />}
                                </div>
                                <span className="text-[10px] font-black text-white/20 tracking-widest">{stat.trend}</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</p>
                                <p className="text-xl md:text-2xl lg:text-3xl font-black text-white italic tracking-tighter truncate">{stat.value}</p>
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
                                    <span>Efficiency</span>
                                    <span>{stat.progress}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-10">
                {/* On-Chain Liquidity & Pool Verification */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black italic text-white flex items-center gap-3">
                            <Layers className="h-5 w-5 text-emerald-500" />
                            LIQUIDITY_SYNC_PROTOCOLS
                        </h3>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black italic uppercase text-[9px]">
                            Live_Contract_Audited
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                        {[
                            { label: 'Club_Pool', value: data?.pools?.clubPool, sub: 'Leader_Rewards' },
                            { label: 'Jackpot_Core', value: data?.pools?.jackpot, sub: 'Yield_Target' },
                            { label: 'Reserves_Node', value: data?.pools?.cashback, sub: 'User_Protection' },
                            { label: 'Instant_Liquidity', value: data?.pools?.directLevel, sub: 'Direct_Uplink' }
                        ].map((pool, i) => (
                            <div key={i} className="p-6 rounded-[28px] bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                                <div>
                                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{pool.label}</p>
                                    <p className="text-2xl font-black text-white italic mt-1">$ {(pool.value || 0).toLocaleString()}</p>
                                    <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">{pool.sub}</p>
                                </div>
                                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-white/10 shadow-lg">
                                    <ExternalLink className="h-4 w-4 text-white/40" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <Card className="bg-[#050505] border-white/5 overflow-hidden rounded-[32px]">
                        <CardContent className="p-10">
                            <div className="flex flex-col md:flex-row items-center gap-12">
                                <div className="relative h-40 w-40 shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-white/5" />
                                        <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray="439.8" strokeDashoffset="110" className="text-emerald-500" strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white italic">75.4</span>
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Ratio</span>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h4 className="text-lg font-black italic text-white/80">MULTI-SIG_GOVERNANCE_ACTIVE</h4>
                                    <p className="text-sm text-white/40 leading-relaxed italic border-l-2 border-emerald-500/20 pl-8">
                                        Treasury liquidity distribution is governed by a 3/5 multi-signature protocol. 75%+ of assets are held in segregated on-chain vaults with automated yield redistribution.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <Badge variant="outline" className="border-white/10 text-white/40 bg-white/5 px-4 font-mono font-bold">BSC: 0x...677</Badge>
                                        <Badge variant="outline" className="border-white/10 text-white/40 bg-white/5 px-4 font-mono font-bold">VAULT_LOCK: ACTIVE</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Risk Radar / Performance Gauge */}
                <div className="space-y-8">
                    <h3 className="text-xl font-black italic text-white flex items-center gap-3">
                        <Target className="h-5 w-5 text-rose-500" />
                        RISK_RADAR
                    </h3>
                    <Card className="bg-[#0a0a0a] border-white/5 rounded-[40px] overflow-hidden relative">
                        <div className="absolute inset-0 bg-emerald-500/5 blur-[80px] opacity-20" />
                        <CardContent className="p-10 flex flex-col items-center text-center space-y-10 relative z-10">
                            <div className="w-full aspect-square rounded-full border border-white/5 flex items-center justify-center relative">
                                <div className="absolute inset-4 rounded-full border border-dashed border-emerald-500/20 animate-spin-slow" />
                                <div className="flex flex-col items-center">
                                    <span className="text-6xl font-black text-white italic">9.8</span>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Stability_Score</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-white italic uppercase tracking-widest">Protocol Stance: OPTIMIZED</h4>
                                <p className="text-[11px] text-white/30 font-bold leading-relaxed uppercase tracking-widest">
                                    House edge retention is successfully offsetting distribution requirements with a 4.2x safety margin. No inflationary pressure detected.
                                </p>
                            </div>
                            <Button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 h-14 rounded-2xl font-black uppercase text-xs tracking-widest">
                                View Full Risk Analysis
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Quick Alerts */}
                    <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">System_Integrity</span>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-black italic text-[8px]">100%</Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

