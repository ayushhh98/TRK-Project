"use client";

import { useEffect, useState } from "react";
import {
    Users,
    ShieldCheck,
    Activity,
    Zap,
    UserCheck,
    Lock,
    Unlock,
    AlertCircle,
    CheckCircle2,
    Database,
    Radio,
    Globe,
    BarChart3,
    Terminal,
    ArrowUpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/api";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { formatDistanceToNow } from "date-fns";

interface AdminNode {
    id: string;
    wallet: string;
    email: string;
    role: string;
    modules: string[];
    dailyActions: number;
    status: "Online" | "Offline" | "Suspended";
    lastSeen: string;
    joinedAt: string;
    nodeId: string;
}

interface TeamStats {
    roster: AdminNode[];
    accessMatrix: {
        id: string;
        title: string;
        purpose: string;
        allowed: string[];
        denied: string[];
    }[];
    systemHealth: {
        nodesActive: number;
        totalOperationsToday: number;
    };
    timestamp: string;
}

interface LiveActivity {
    id: string;
    type: string;
    adminWallet: string;
    adminEmail: string;
    action: string;
    severity: string;
    timestamp: string;
}

const ROLE_COLOR: Record<string, string> = {
    superadmin: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    admin: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    subadmin: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

const SEVERITY_COLOR: Record<string, string> = {
    info: "text-blue-400",
    warning: "text-amber-400",
    error: "text-red-400",
    critical: "text-red-500",
};

export default function TeamRosterAdmin() {
    const [stats, setStats] = useState<TeamStats | null>(null);
    const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedMatrix, setExpandedMatrix] = useState<string | null>(null);

    useAdminSocket({
        onTeamUpdate: (data) => {
            setStats(data);
            setLoading(false);
        },
        onTeamLiveActivity: (event) => {
            setLiveActivity(prev => [event, ...prev].slice(0, 30));
        }
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/admin/team/dashboard", {
                    headers: { Authorization: `Bearer ${getToken()}` },
                });
                if (res.status === 401) { window.location.href = "/admin/login"; return; }
                const data = await res.json();
                if (data.status === "success") {
                    setStats(data.data);
                }
            } catch (err) {
                console.error("Fetch error", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading && !stats) {
        return (
            <div className="h-screen bg-black flex flex-col items-center justify-center gap-6">
                <div className="relative h-24 w-24">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Activity className="h-8 w-8 text-blue-500 animate-pulse" />
                    </div>
                </div>
                <div className="text-blue-500 font-black italic uppercase tracking-[0.3em] text-[10px] animate-pulse">
                    Synchronizing Admin Node Cluster...
                </div>
            </div>
        );
    }

    const { roster = [], accessMatrix = [], systemHealth } = stats || {};
    const onlineCount = roster.filter(a => a.status === "Online").length;

    return (
        <div className="min-h-screen bg-black text-white/90 space-y-10 pb-32">
            {/* Command Header */}
            <div className="relative group overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-[#0a0a0a] to-black p-8">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className={`h-2 w-2 rounded-full ${onlineCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-white/10'}`} />
                            <span className="text-blue-400/60 font-black text-[10px] uppercase tracking-[0.4em]">Node Registry v3.1</span>
                        </div>
                        <h1 className="text-6xl font-display font-black tracking-tight italic flex items-center gap-4">
                            ADMIN<span className="text-blue-400">CLUSTER</span>
                            <Radio className="h-10 w-10 text-blue-500/40 animate-pulse" />
                        </h1>
                        <p className="text-white/40 font-mono text-[10px] uppercase tracking-[0.3em]">System Governance & Roster Oversight</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Active Nodes</div>
                                <div className="text-xl font-black text-emerald-400 italic">{onlineCount}</div>
                            </div>
                            <div className="h-10 w-[1px] bg-white/10" />
                            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Globe className="h-6 w-6 text-blue-500" />
                            </div>
                        </div>
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-[9px] font-black text-white/30 uppercase tracking-widest">Ops Today</div>
                                <div className="text-xl font-black text-yellow-500 italic">{systemHealth?.totalOperationsToday || 0}</div>
                            </div>
                            <div className="h-10 w-[1px] bg-white/10" />
                            <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                <Zap className="h-6 w-6 text-yellow-500" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Visual Roster Matrix */}
                <Card className="lg:col-span-2 bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 bg-blue-500/5 flex flex-row items-center justify-between p-6">
                        <div className="flex items-center gap-3">
                            <UserCheck className="h-5 w-5 text-blue-400" />
                            <CardTitle className="text-sm font-black italic uppercase tracking-widest text-blue-400/80">Authorized Node Roster</CardTitle>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400 border-none text-[8px] font-black uppercase">Master Registry</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="flex px-8 py-3 bg-black/40 border-b border-white/5 text-[9px] font-black uppercase text-white/20 tracking-widest">
                            <div className="flex-1">Node/Identity</div>
                            <div className="w-32 text-center">Role Profile</div>
                            <div className="w-24 text-center">Load Status</div>
                            <div className="w-32 text-right">Heartbeat</div>
                        </div>
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {roster.map((admin, i) => (
                                <motion.div
                                    key={admin.id || i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center px-8 py-6 hover:bg-white/[0.02] group transition-all"
                                >
                                    <div className="flex-1 min-w-0 flex items-center gap-4">
                                        <div className="relative">
                                            <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-[10px] text-white/20 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all uppercase italic">
                                                {admin.nodeId?.slice(-2) || 'SYS'}
                                            </div>
                                            {admin.status === 'Online' && (
                                                <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-black rounded-full animate-pulse" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-mono text-white/80 group-hover:text-white transition-colors truncate">{admin.email || admin.wallet}</div>
                                            <div className="text-[10px] font-black text-white/20 uppercase mt-1 tracking-widest">{admin.nodeId}</div>
                                        </div>
                                    </div>

                                    <div className="w-32 text-center">
                                        <Badge className={`border text-[9px] font-black uppercase tracking-widest ${ROLE_COLOR[admin.role] || 'text-white/40 bg-white/5 border-white/10'}`}>
                                            {admin.role}
                                        </Badge>
                                    </div>

                                    <div className="w-24 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-[12px] font-black font-mono ${admin.dailyActions > 0 ? 'text-yellow-400' : 'text-white/20'}`}>
                                                {admin.dailyActions} OPS
                                            </span>
                                            <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-yellow-500"
                                                    style={{ width: `${Math.min(100, (admin.dailyActions / 50) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-32 text-right space-y-1">
                                        <div className={`text-[10px] font-black uppercase ${admin.status === 'Online' ? 'text-emerald-400' : admin.status === 'Suspended' ? 'text-red-400' : 'text-white/20'}`}>
                                            {admin.status}
                                        </div>
                                        <div className="text-[9px] font-mono text-white/20">
                                            {admin.lastSeen ? formatDistanceToNow(new Date(admin.lastSeen), { addSuffix: true }) : 'OFFLINE'}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Activity Terminal */}
                <Card className="bg-black border-white/5 overflow-hidden flex flex-col h-full">
                    <CardHeader className="border-b border-white/5 bg-[#050505] p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Terminal className="h-4 w-4 text-emerald-400" />
                                <CardTitle className="text-[11px] font-black italic uppercase tracking-widest">Protocol Activity Terminal</CardTitle>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 bg-[#020202] font-mono text-[9px] relative ring-inset ring-1 ring-white/5">
                        <div className="h-[550px] overflow-y-auto custom-scrollbar p-6 space-y-4">
                            <AnimatePresence initial={false}>
                                {liveActivity.map((ev) => (
                                    <motion.div
                                        key={ev.id}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        className="border-l-2 border-white/10 pl-4 py-1 hover:border-blue-500/50 transition-all group"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white/20">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>
                                            <Badge className={`border-none text-[8px] font-black uppercase ${SEVERITY_COLOR[ev.severity] || 'text-white/40'} bg-white/5`}>
                                                {ev.type}
                                            </Badge>
                                        </div>
                                        <div className="text-white/70 group-hover:text-white transition-colors uppercase italic font-bold tracking-tight">
                                            {ev.action}
                                        </div>
                                        <div className="text-white/20 text-[8px] uppercase tracking-widest mt-1">
                                            EXECUTED_BY: {ev.adminEmail || ev.adminWallet?.slice(-12)}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {liveActivity.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center gap-4 py-20 opacity-20">
                                    <Database className="h-10 w-10 animate-pulse" />
                                    <div className="text-[10px] font-black italic uppercase tracking-[0.4em]">Listening for Node Broadcasts...</div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Access Matrix Matrix */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-blue-500 pl-4">
                    <ShieldCheck className="h-6 w-6 text-blue-500" />
                    <h2 className="text-2xl font-display font-black italic uppercase text-white tracking-tight">Access Control Matrix</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {accessMatrix.map((module) => (
                        <motion.div
                            key={module.id}
                            whileHover={{ scale: 1.02 }}
                            className={`rounded-2xl border transition-all overflow-hidden ${expandedMatrix === module.id ? 'border-blue-500/40 bg-blue-500/5 col-span-2' : 'border-white/5 bg-[#0a0a0a]'}`}
                            onClick={() => setExpandedMatrix(expandedMatrix === module.id ? null : module.id)}
                        >
                            <div className="p-5 flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="text-[12px] font-black uppercase text-white tracking-widest">{module.title}</div>
                                    <div className="text-[9px] text-white/30 uppercase tracking-[0.2em]">{module.purpose}</div>
                                </div>
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${expandedMatrix === module.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/20'}`}>
                                    {expandedMatrix === module.id ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                </div>
                            </div>

                            <AnimatePresence>
                                {expandedMatrix === module.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-5 pb-6 grid grid-cols-2 gap-6"
                                    >
                                        <div className="space-y-4">
                                            <div className="text-[10px] font-black uppercase text-emerald-500 flex items-center gap-2 tracking-[0.2em]">
                                                <CheckCircle2 className="h-3 w-3" /> ALLOWED_SCOPES
                                            </div>
                                            <div className="space-y-2">
                                                {module.allowed.map((item, i) => (
                                                    <div key={i} className="flex gap-2 text-[10px] text-white/50 font-mono leading-tight">
                                                        <span className="text-emerald-500/40">•</span> {item}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="text-[10px] font-black uppercase text-red-500 flex items-center gap-2 tracking-[0.2em]">
                                                <AlertCircle className="h-3 w-3" /> FORBIDDEN_SCOPES
                                            </div>
                                            <div className="space-y-2">
                                                {module.denied.map((item, i) => (
                                                    <div key={i} className="flex gap-2 text-[10px] text-white/30 font-mono leading-tight">
                                                        <span className="text-red-500/40">•</span> {item}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="px-5 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[8px] font-black uppercase text-white/20 tracking-widest italic font-mono transition-colors group-hover:text-blue-500/80">
                                    {expandedMatrix === module.id ? 'NODE_PERMISSION_MAP::CLOSE' : 'NODE_PERMISSION_MAP::READ'}
                                </span>
                                <ArrowUpCircle className={`h-3 w-3 text-white/10 transition-transform ${expandedMatrix === module.id ? 'rotate-180' : 'rotate-90'}`} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Security Protocol Footer */}
            <div className="p-8 rounded-[32px] bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-500/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity blur-[100px] pointer-events-none" />
                <div className="relative flex items-center gap-8">
                    <div className="h-20 w-20 shrink-0 rounded-[24px] bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                        <ShieldCheck className="h-10 w-10 text-blue-400" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-2xl font-display font-black text-blue-400 italic uppercase">Distributed Governance Integrity</h3>
                        <p className="text-[11px] text-white/40 uppercase font-black leading-relaxed tracking-widest max-w-5xl">
                            The Team Cluster Monitor provides real-time oversight of administrative activity across all nodes.
                            TRK employs a Strictly Partitioned Infrastructure where sub-admin nodes possess zero mutation capabilities over the
                            Primary Financial Ledger or Protocol Logic. Every action broadcast in the Live Activity stream is cryptographically logged
                            and cross-referenced by the system. Principle of Least Privilege (PoLP) is enforced at the kernel level to ensure
                            system-wide immunity to node-level compromise.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
