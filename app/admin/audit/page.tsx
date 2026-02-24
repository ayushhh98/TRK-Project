"use client";

import { useEffect, useState, useMemo } from "react";
import {
    ShieldCheck,
    Link as LinkIcon,
    Database,
    Activity,
    FileText,
    AlertTriangle,
    CheckCircle2,
    HardDrive,
    ServerCrash,
    Key,
    Lock,
    Zap,
    Cpu,
    Radiation,
    Terminal,
    Eye,
    Scan,
    ArrowUpRight,
    Clock,
    LayoutDashboard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { getToken } from "@/lib/api";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AuditData {
    masterSummary: {
        totalOnChainTxs: number;
        systemStatus: string;
        latestRoiHash: string;
        latestJackpotHash: string;
        latestClubPoolHash: string;
        avgProcessingTime: string;
        securityScore: number;
    };
    infrastructure: {
        dbSize: string;
        activeConnections: number;
        nodeProcess: string;
        uptime: string;
    };
    smartContract: {
        address: string;
        deploymentBlock: string;
        version: string;
        multiSigSecured: boolean;
        timelockDelay: string;
    };
    pillarMatrix: {
        roi: { checks: string[], passed: boolean };
        jackpot: { checks: string[], passed: boolean };
        club: { checks: string[], passed: boolean };
        withdraw: { checks: string[], passed: boolean };
    };
    financialIntegrity: {
        totalDeposits: number;
        totalPayouts: number;
        totalClubAllocated: number;
        reserveBalance: number;
    };
    securityScanner: Array<{
        issue: string;
        status: string;
        timestamp: string;
    }>;
}

export default function AdminAuditVerification() {
    const [data, setData] = useState<AuditData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [liveLogs, setLiveLogs] = useState<any[]>([]);
    const [lastSync, setLastSync] = useState<Date>(new Date());

    useAdminSocket({
        onAuditUpdate: (d: any) => {
            setData(d);
            setLastSync(new Date());
        },
        onLiveAudit: (log: any) => {
            setLiveLogs(prev => [log, ...prev].slice(0, 50));
            setLastSync(new Date());
        }
    });

    useEffect(() => {
        const fetchAuditData = async () => {
            try {
                const res = await fetch('/api/admin/audit/dashboard', {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });

                if (res.status === 401) {
                    window.location.href = '/admin/login';
                    return;
                }

                const json = await res.json();
                if (json.status === 'success') {
                    setData(json.data);
                } else {
                    setError(json.message || 'PROTOCOL_ERROR: Failed to establish secure uplink.');
                }
            } catch (err) {
                setError('UPLINK_FAILURE: Core Node Unresponsive.');
            } finally {
                setLoading(false);
            }
        };

        fetchAuditData();
    }, []);

    const radarColor = useMemo(() => {
        const score = data?.masterSummary?.securityScore || 100;
        if (score > 80) return "text-emerald-500/40";
        if (score > 50) return "text-amber-500/40";
        return "text-red-500/40";
    }, [data?.masterSummary?.securityScore]);

    if (loading && !data) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center gap-10">
                <div className="relative h-40 w-40">
                    <motion.div
                        animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 border-2 border-emerald-500/20 rounded-full border-t-emerald-500"
                    />
                    <Radiation className="h-10 w-10 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="text-center space-y-3">
                    <h2 className="text-xl font-black text-white italic uppercase tracking-[0.5em]">Scanning Protocol Matrix</h2>
                    <p className="text-[10px] font-mono text-emerald-500/40 uppercase animate-pulse underline underline-offset-4">Decrypting Blockchain Proofs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-32 relative">
            {/* Scanlines Overlay Effect */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_4px,3px_100%]" />

            {/* Header / Terminal Info */}
            <div className="flex flex-col xl:flex-row justify-between items-start gap-8 border-b border-white/5 pb-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse">
                            <Radiation className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black uppercase tracking-[0.3em]">Auditor v2.5.0</Badge>
                                <span className="text-[10px] items-center font-mono text-white/20 uppercase tracking-tighter italic">Live Transmission Online</span>
                            </div>
                            <h1 className="text-5xl font-display font-black text-white tracking-widest italic uppercase mt-1">
                                Real<span className="text-emerald-500">Audit</span>
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full xl:w-auto">
                    {[
                        { label: 'Latency', value: data?.masterSummary?.avgProcessingTime, icon: Activity, color: 'text-emerald-400' },
                        { label: 'Status', value: data?.masterSummary?.securityScore + '% SECURE', icon: ShieldCheck, color: 'text-blue-400' },
                        { label: 'DB Load', value: data?.infrastructure?.activeConnections, icon: Cpu, color: 'text-purple-400' },
                        { label: 'Uptime', value: data?.infrastructure?.uptime, icon: Clock, color: 'text-amber-400' }
                    ].map((item, i) => (
                        <div key={i} className="bg-[#050505] border border-white/5 p-4 rounded-2xl flex flex-col gap-1 relative group overflow-hidden">
                            <div className="absolute inset-0 bg-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity" />
                            <item.icon className={cn("h-4 w-4 mb-2", item.color)} />
                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{item.label}</span>
                            <span className="text-xs font-black text-white uppercase italic">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Primary Analysis Grid */}
            <div className="grid lg:grid-cols-3 gap-8 pt-4">
                {/* Security Radar Animation */}
                <Card className="bg-black/40 border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-12 min-h-[400px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05)_0%,transparent_70%)]" />

                    {/* The Radar */}
                    <div className="relative h-64 w-64 rounded-full border border-emerald-500/20 flex items-center justify-center">
                        <div className="absolute h-full w-full rounded-full border border-emerald-500/10" />
                        <div className="absolute h-[70%] w-[70%] rounded-full border border-emerald-500/5" />
                        <div className="absolute h-[40%] w-[40%] rounded-full border border-emerald-500/5" />

                        {/* Sweep */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 origin-center bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full"
                        />

                        {/* Status Dots */}
                        <div className="absolute top-1/4 right-1/4 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)] animate-ping" />
                        <div className="absolute bottom-1/3 left-1/4 h-1.5 w-1.5 rounded-full bg-emerald-500/40" />

                        <div className="text-center z-10">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-1">Integrity Score</h3>
                            <div className="text-6xl font-display font-black text-white italic tracking-tighter">
                                {data?.masterSummary?.securityScore}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-center space-y-2 relative z-10">
                        <Badge className="bg-emerald-500/5 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest text-[10px] font-black italic">
                            {data?.masterSummary?.systemStatus}
                        </Badge>
                        <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-medium italic">Scanning core protocol segments...</p>
                    </div>
                </Card>

                {/* Execution Proof Chain */}
                <Card className="lg:col-span-2 bg-[#050505] border-white/5 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-emerald-500/[0.02] border-b border-white/5 p-8 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Terminal className="h-6 w-6 text-emerald-500/40" />
                            <div>
                                <CardTitle className="text-xl font-black italic text-white uppercase tracking-tight">Execution Proofs (SHA-256)</CardTitle>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1 italic">Immutable Blockchain Verification Hashes</p>
                            </div>
                        </div>
                        <Scan className="h-6 w-6 text-emerald-500/20 animate-pulse" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-white/5">
                            {[
                                { label: 'ROI Distribution Block', hash: data?.masterSummary?.latestRoiHash, type: 'ROI_SEGMENT' },
                                { label: 'Jackpot Master Seed', hash: data?.masterSummary?.latestJackpotHash, type: 'JACKPOT_AUTH' },
                                { label: 'Liquidity Pool Allocation', hash: data?.masterSummary?.latestClubPoolHash, type: 'POOL_TRANSFER' }
                            ].map((proof, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-emerald-500/[0.01] transition-all group"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className="h-10 w-10 border border-white/5 bg-[#080808] flex items-center justify-center text-[10px] font-black text-emerald-500/40 group-hover:text-emerald-500 group-hover:border-emerald-500/20 transition-all italic uppercase">
                                            {proof.type.split('_')[0]}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">{proof.label}</div>
                                            <div className="text-[12px] font-black text-white italic group-hover:text-emerald-400 transition-colors">{proof.type}</div>
                                        </div>
                                    </div>
                                    <div className="font-mono text-[10px] text-emerald-500/60 bg-black/60 px-4 py-3 rounded-xl border border-white/5 group-hover:border-emerald-500/30 transition-all flex items-center gap-3 relative max-w-[400px]">
                                        <div className="absolute inset-0 bg-emerald-500/[0.02] animate-pulse" />
                                        <span className="text-white/20 shrink-0 font-black">0x</span>
                                        <span className="truncate">{proof.hash?.substring(2)}</span>
                                        <Eye className="h-3 w-3 text-white/10 shrink-0 cursor-pointer hover:text-white transition-colors ml-2" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Middle Row: Protocol Pillars & Financial Math */}
            <div className="grid lg:grid-cols-4 gap-8 pt-8 relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

                <div className="lg:col-span-3">
                    <div className="flex items-center gap-3 mb-8 pt-4">
                        <Scan className="h-5 w-5 text-white/40" />
                        <h2 className="text-xl font-black italic uppercase text-white tracking-widest">Protocol Validator Pillars</h2>
                    </div>

                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        {[
                            { title: 'ROI Integrity', color: 'emerald', checks: data?.pillarMatrix?.roi.checks },
                            { title: 'Jackpot Logic', color: 'blue', checks: data?.pillarMatrix?.jackpot.checks },
                            { title: 'Elite Rewards', color: 'purple', checks: data?.pillarMatrix?.club.checks },
                            { title: 'Withdraw Bounds', color: 'amber', checks: data?.pillarMatrix?.withdraw.checks }
                        ].map((pillar, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="bg-[#050505] border-white/5 h-full hover:border-emerald-500/20 transition-all">
                                    <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.01]">
                                        <CardTitle className={cn("text-[10px] font-black uppercase tracking-widest", `text-${pillar.color}-400`)}>
                                            {pillar.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-4">
                                        {pillar.checks?.map((chk, j) => (
                                            <div key={j} className="flex items-start gap-3">
                                                <div className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                                                </div>
                                                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest leading-relaxed">{chk}</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <div className="space-y-8 pt-4">
                    <div className="flex items-center gap-3 mb-4">
                        <LayoutDashboard className="h-5 w-5 text-white/40" />
                        <h2 className="text-xl font-black italic uppercase text-white tracking-widest">Reserve Map</h2>
                    </div>

                    <Card className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Activity className="h-40 w-40 text-emerald-500" />
                        </div>
                        <div className="space-y-6 relative z-10">
                            <div>
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Math Reserve Balance</div>
                                <div className="text-4xl font-display font-black text-emerald-400 italic italic">
                                    ${(data?.financialIntegrity?.reserveBalance || 0).toLocaleString()} <span className="text-xs font-mono text-emerald-500/50">USDT</span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-6 border-t border-emerald-500/10">
                                <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Total Deposits</span>
                                    <span className="text-xs font-black text-white">${data?.financialIntegrity?.totalDeposits.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Auto Payouts</span>
                                    <span className="text-xs font-black text-red-500/60">-${data?.financialIntegrity?.totalPayouts.toLocaleString()}</span>
                                </div>
                            </div>

                            <p className="text-[9px] text-emerald-500/40 italic font-black uppercase tracking-widest leading-relaxed">
                                Reserve is automatically collateralized across decentralized node clusters.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Bottom Row: Terminal & Live Security */}
            <div className="grid lg:grid-cols-3 gap-8 pt-8">
                {/* Live Security Feed */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <Radiation className="h-5 w-5 text-orange-500 animate-pulse" />
                        <h2 className="text-lg font-black italic uppercase text-white tracking-widest">Live Security Feed</h2>
                    </div>
                    <div className="h-[400px] overflow-y-auto custom-scrollbar space-y-4 pr-2">
                        {data?.securityScanner && data.securityScanner.length > 0 ? (
                            data.securityScanner.map((scan, i) => (
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    key={i}
                                    className="bg-[#050505] border border-white/10 p-5 rounded-2xl flex flex-col gap-3 group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 h-full w-1 bg-gradient-to-b from-orange-500/40 to-transparent" />
                                    <div className="flex items-center justify-between">
                                        <Badge className={cn(
                                            "border-none uppercase tracking-[0.2em] text-[8px] font-black px-2",
                                            scan.status === 'Flagged' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-400'
                                        )}>
                                            {scan.status}
                                        </Badge>
                                        <span className="text-[10px] text-white/20 font-mono italic">[{format(new Date(scan.timestamp), "HH:mm:ss")}]</span>
                                    </div>
                                    <div className="text-[11px] uppercase font-black text-white/70 leading-relaxed italic group-hover:text-white transition-colors">
                                        {scan.issue}
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/5 rounded-3xl text-center">
                                <ShieldCheck className="h-10 w-10 text-white/5 mb-4" />
                                <span className="text-[10px] font-black uppercase text-white/20 tracking-widest italic">Zero Flags Detected In Cycle</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Audit Terminal */}
                <Card className="lg:col-span-2 bg-[#020202] border-emerald-500/20 overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.05)] flex flex-col h-[500px]">
                    <CardHeader className="border-b border-emerald-500/10 bg-[#050505] p-6 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Terminal className="h-5 w-5 text-emerald-400" />
                            <div>
                                <CardTitle className="text-sm font-black italic uppercase tracking-[0.4em] text-white">System Overlord Log stream</CardTitle>
                                <p className="text-[8px] text-emerald-500/40 uppercase tracking-widest font-black italic">Channel_ID: 0x882A...S23</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500/30" />
                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-500/30" />
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        </div>
                    </CardHeader>

                    <CardContent className="flex-grow p-0 bg-black/60 font-mono text-[11px] overflow-hidden flex flex-col">
                        <div className="flex-grow overflow-y-auto custom-scrollbar p-8 space-y-3 font-mono">
                            <div className="text-emerald-500/30 italic mb-6 font-black tracking-widest uppercase border-b border-emerald-500/10 pb-3 flex items-center gap-4">
                                <Zap className="h-4 w-4" />
                                <span>[BOOT_COMPLETE]: Audit Node v2.5.0 Matrix Connection established</span>
                            </div>

                            <AnimatePresence>
                                {liveLogs.map((log, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={log.id || i}
                                        className="flex gap-6 group py-1 border-l-2 border-transparent hover:border-emerald-500/20 pl-4 hover:bg-white/[0.01] transition-all"
                                    >
                                        <span className="text-white/10 shrink-0 font-bold">[{format(new Date(log.timestamp), "HH:mm:ss.SSS")}]</span>
                                        <span className={cn(
                                            "shrink-0 font-black italic uppercase tracking-tighter",
                                            log.severity === 'critical' ? 'text-red-500' :
                                                log.severity === 'warning' ? 'text-amber-500' :
                                                    'text-emerald-500/70'
                                        )}>{log.eventType}::</span>
                                        <span className="text-white/40 group-hover:text-white transition-colors flex gap-2">
                                            {log.action} <span className="text-white/10 font-black">@ {log.wallet?.substring(0, 8) || 'SYSTEM_CORE'}</span>
                                        </span>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {liveLogs.length === 0 && (
                                <div className="space-y-4 animate-pulse pt-4">
                                    <div className="flex gap-4 opacity-40"><span className="text-white/20">[{format(new Date(), "HH:mm:ss.ms")}]</span> <span className="text-emerald-500/30 font-black">IDLE::</span> <span className="text-white/20 uppercase tracking-widest text-[9px]">Awaiting blockchain response packets...</span></div>
                                    <div className="flex gap-4 opacity-20"><span className="text-white/20">[{format(new Date(Date.now() - 5000), "HH:mm:ss.ms")}]</span> <span className="text-emerald-500/30 font-black">SYS::</span> <span className="text-white/20 uppercase tracking-widest text-[9px]">Pinging decentralized maintenance node [420-S-CORE]... SUCCESS</span></div>
                                </div>
                            )}
                        </div>

                        {/* Status Bar */}
                        <div className="border-t border-emerald-500/10 p-5 bg-[#050505] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">IO_STREAM_ENABLED</span>
                                </div>
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic">Node: Sandbox_N-4</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Encryption: AES-256</div>
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Protocol: WSS_OVER_SSL</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Overall Summary Footer */}
            <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    <div className="space-y-1">
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Total Ledger Proofs</div>
                        <div className="text-lg font-black text-white italic">{data?.masterSummary?.totalOnChainTxs.toLocaleString()} TXs</div>
                    </div>
                    <div className="h-10 w-[1px] bg-white/5" />
                    <div className="space-y-1">
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Smart Contract v</div>
                        <div className="text-lg font-black text-white italic">{data?.smartContract?.version}</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="outline" className="border-white/10 text-white/40 hover:text-emerald-400 font-black text-[10px] tracking-widest uppercase h-12 px-8 rounded-2xl group transition-all">
                        <FileText className="h-4 w-4 mr-2" /> Export Immutable PDF
                    </Button>
                    <div className="px-6 py-3 bg-[#080808] border border-white/10 rounded-2xl flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Node Healthy</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

