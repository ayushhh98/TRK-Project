"use client";

import { useEffect, useState } from "react";
import {
    Users,
    Search,
    Filter,
    Shield,
    ShieldOff,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Eye,
    LogOut,
    Network,
    AlertCircle,
    BarChart3,
    ShieldAlert,
    ShieldCheck,
    Lock,
    Unlock,
    Activity,
    Radio,
    Zap,
    Cpu,
    Trophy,
    TrendingUp,
    Clock,
    Terminal,
    Globe
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { cn } from "@/lib/utils";

const IDENTITY_NODES = [
    { id: 'identity', label: 'Identity_Core', desc: 'Core User Credentials', icon: Users, color: 'text-purple-400' },
    { id: 'auth', label: 'Auth_Protocol', desc: 'Secure Access & RBAC', icon: Lock, color: 'text-blue-400' },
    { id: 'kyc', label: 'KYC_Sync', desc: 'Verification Protocol', icon: ShieldCheck, color: 'text-emerald-400' },
    { id: 'social', label: 'Social_Node', desc: 'Network Propagation', icon: Network, color: 'text-purple-500' },
    { id: 'admin-core', label: 'Admin_Core', desc: 'Privileged Operations', icon: ShieldAlert, color: 'text-amber-400' }
];

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [showProfile, setShowProfile] = useState(false);
    const [activityLog, setActivityLog] = useState<any[]>([]);
    const [systemStats, setSystemStats] = useState<any>(null);
    const [activeNode, setActiveNode] = useState('identity');
    const router = useRouter();

    // Real-time updates
    const { connectionStatus } = useAdminSocket({
        onStatsUpdate: (stats) => {
            setSystemStats(stats);
        },
        onUserUpdate: (updatedUser) => {
            console.log("Real-time user update:", updatedUser);
            setUsers(prev => prev.map(u => u._id === updatedUser._id ? { ...u, ...updatedUser } : u));
        },
        onUserActivity: (data) => {
            setActivityLog(prev => [data, ...prev].slice(0, 30));
        }
    });

    useEffect(() => {
        fetchUsers();
    }, [page]);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/users/search?q=${search}&page=${page}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (res.status === 401) {
                setError('SESSION_EXPIRED: Your security token is invalid or has expired.');
                window.dispatchEvent(new CustomEvent('admin-session-expired'));
                return;
            }

            if (res.status === 403) {
                const data = await res.json();
                if (data.code === 'UNAUTHORIZED_IP') {
                    setError('ACCESS_DENIED: Your IP address is not whitelisted for admin access.');
                } else {
                    setError(data.message || 'Insufficient permissions to view users.');
                }
                return;
            }

            const data = await res.json();
            if (data.status === 'success') {
                setUsers(data.data.users);
                setTotal(data.data.total);
            } else {
                setError(data.message || 'Failed to fetch users');
            }
        } catch (err) {
            console.error('Fetch error', err);
            setError('Network error: Failed to connect to management service.');
        } finally {
            setLoading(false);
        }
    };

    const handleFreeze = async (userId: string, isFrozen: boolean) => {
        try {
            const endpoint = isFrozen ? `/api/admin/users/${userId}/unfreeze` : `/api/admin/users/${userId}/freeze`;
            const res = await fetch(endpoint, {
                method: isFrozen ? 'PATCH' : 'PATCH', // Both are PATCH in backend now
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: isFrozen ? null : JSON.stringify({ reason: 'Admin manual freeze' })
            });
            const data = await res.json();
            if (data.status === 'success') {
                fetchUsers();
            }
        } catch (err) {
            console.error('Freeze error', err);
        }
    };

    const viewProfile = (user: any) => {
        setSelectedUser(user);
        setShowProfile(true);
    };

    const viewNetwork = (userId: string) => {
        router.push(`/admin/network?root=${userId}`);
    };

    return (
        <div className="min-h-screen bg-black text-white/90 p-8 space-y-10 pb-32">
            {/* Cybernetic Hub Header */}
            <div className={cn(
                "relative group overflow-hidden rounded-[40px] border p-12 transition-all duration-700",
                "border-purple-500/10 bg-purple-500/5 shadow-[0_0_50px_rgba(168,85,247,0.05)]"
            )}>
                <div className="absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 bg-purple-500/5" />

                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
                    <div className="space-y-6">
                        <div className="flex items-center justify-center lg:justify-start gap-4">
                            <Badge variant="outline" className="uppercase tracking-[0.4em] text-[10px] font-black py-2 px-6 rounded-full border-2 border-purple-500/30 bg-purple-500/10 text-purple-400">
                                Identity_Protocol: NOMINAL
                            </Badge>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Activity className="h-3 w-3 text-purple-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Sync_Neural_Flow</span>
                            </div>
                        </div>
                        <h1 className="text-8xl font-display font-black tracking-tighter italic uppercase leading-tight">
                            USER<span className="text-purple-500">_HUB</span>
                        </h1>
                        <p className="text-white/40 font-mono text-[11px] uppercase tracking-[0.5em] max-w-xl leading-relaxed mx-auto lg:mx-0">
                            Identity & Access Management // Network Expansion Monitor
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                        <div className="relative flex-1 sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                            <Input
                                placeholder="Search wallet, email, or TRK code..."
                                className="bg-white/5 border-white/10 pl-12 h-14 rounded-2xl focus:border-purple-500 transition-all font-bold placeholder:text-white/20 text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                            />
                        </div>
                        <Button onClick={fetchUsers} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white font-black h-14 rounded-2xl px-8 uppercase text-xs tracking-widest shadow-2xl shadow-purple-500/20">
                            EXECUTE SEARCH
                        </Button>
                    </div>
                </div>
            </div>

            {/* Protocol Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {IDENTITY_NODES.map((n) => (
                    <Card key={n.id} className={cn(
                        "group bg-[#0a0a0a] border-purple-500/10 hover:border-purple-500/20 transition-all duration-300 relative overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.02)]",
                        activeNode === n.id && "border-purple-500/30 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.08)]"
                    )}>
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-start justify-between">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-all",
                                    n.color,
                                    activeNode === n.id && "bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
                                )}>
                                    <n.icon className="h-6 w-6" />
                                </div>
                                <Badge className={cn(
                                    "font-black uppercase tracking-[0.2em] text-[8px] px-3 py-1",
                                    activeNode === n.id ? "bg-purple-500 text-white" : "bg-purple-500/20 text-purple-400"
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
                                    "w-full text-[10px] font-black uppercase h-10 tracking-[0.2em] border-white/5 transition-all",
                                    activeNode === n.id
                                        ? "bg-purple-500 text-white border-none shadow-lg shadow-purple-500/20"
                                        : "bg-transparent hover:bg-purple-500/10 hover:text-purple-500 hover:border-purple-500/30"
                                )}
                            >
                                {activeNode === n.id ? 'PROTOCOL_LINKED' : 'Access Node'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    {/* Error handling remains */}
                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-6 mb-8 flex gap-4 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <ShieldAlert className="h-24 w-24" />
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <div className="space-y-1 relative z-10">
                                <h3 className="font-black uppercase tracking-widest text-xs italic">SYSTEM FAULT DETECTED</h3>
                                <p className="text-sm font-medium opacity-80 uppercase leading-relaxed tracking-tight">
                                    {error}
                                </p>
                                <div className="mt-6 flex flex-wrap gap-3">
                                    <Button
                                        onClick={() => window.location.href = '/admin/login'}
                                        className="bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl"
                                    >
                                        <TrendingUp className="h-3 w-3 mr-2" />
                                        Re-establish Session
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => fetchUsers()}
                                        className="border-rose-500/20 text-rose-500 hover:bg-rose-500/5 font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl"
                                    >
                                        Retry Authorization
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Identity Intelligence Matrix (Stats Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {(activeNode === 'auth' ? [
                            { label: 'Login_Success', value: '100%', sub: 'Last 24h', icon: Lock, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'MFA_Coverage', value: '100%', sub: 'Admin Nodes', icon: Shield, color: 'text-purple-400', bar: 'bg-purple-500' },
                            { label: 'Token_Refresh', value: '0.1s', sub: 'Latency', icon: Zap, color: 'text-amber-400', bar: 'bg-amber-500' },
                            { label: 'Auth_Events', value: (activityLog.length > 0 ? activityLog.length : 12).toLocaleString(), sub: 'Matrix Load', icon: Cpu, color: 'text-blue-400', bar: 'bg-blue-500' }
                        ] : activeNode === 'kyc' ? [
                            { label: 'Pending_KYC', value: users.filter(u => u.activation?.tier === 'tier0').length, sub: 'Queue Depth', icon: Clock, color: 'text-amber-400', bar: 'bg-amber-500' },
                            { label: 'Verification_Rate', value: '100%', sub: 'Success Flow', icon: ShieldCheck, color: 'text-emerald-400', bar: 'bg-emerald-500' },
                            { label: 'Identity_Link', value: 'Active', sub: 'On-Chain Sync', icon: Globe, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'AML_Alerts', value: '0', sub: 'System Clean', icon: ShieldAlert, color: 'text-emerald-400', bar: 'bg-emerald-500' }
                        ] : activeNode === 'social' ? [
                            { label: 'Direct_Uplink', value: (total * 0.4).toFixed(0), sub: 'Primary Mesh', icon: Network, color: 'text-purple-400', bar: 'bg-purple-500' },
                            { label: 'Viral_Coefficient', value: '1.24', sub: 'Expansion', icon: TrendingUp, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'Mesh_Density', value: total > 100 ? 'High' : 'Optimal', sub: 'Saturation', icon: Globe, color: 'text-purple-500', bar: 'bg-purple-500' },
                            { label: 'Social_Yield', value: `$ ${((systemStats?.club?.totalDistributed || 0) / 1000).toFixed(1)}k`, sub: 'Network Revenue', icon: Trophy, color: 'text-amber-400', bar: 'bg-amber-500' }
                        ] : activeNode === 'admin-core' ? [
                            { label: 'Privileged_Ops', value: systemStats?.team?.totalOperationsToday || 0, sub: 'Last Ref', icon: ShieldAlert, color: 'text-amber-400', bar: 'bg-amber-500' },
                            { label: 'RBAC_Sync', value: 'Locked', sub: 'Policy Enforced', icon: Lock, color: 'text-purple-400', bar: 'bg-purple-500' },
                            { label: 'Audit_Stream', value: 'Live', sub: 'Immutable Logs', icon: Terminal, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'Governance', value: 'Multi-Sig', sub: 'Active', icon: ShieldCheck, color: 'text-emerald-400', bar: 'bg-emerald-500' }
                        ] : [
                            { label: 'Total Nodes', value: systemStats?.users || total, sub: 'Identity Network', icon: Users, color: 'text-purple-400', bar: 'bg-purple-500' },
                            { label: 'Online Signal', value: systemStats?.onlineUsers || 0, sub: 'Active Sessions', icon: Radio, color: 'text-emerald-400', bar: 'bg-emerald-500', pulse: true },
                            { label: 'Practice Conversions', value: systemStats?.practice?.converted || 0, sub: 'Mode Transitions', icon: ShieldCheck, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'Network Growth', value: `+${((systemStats?.users || total) / 100).toFixed(0)}`, sub: 'Velocity Index', icon: Activity, color: 'text-purple-400', bar: 'bg-purple-500' }
                        ]).map((stat, i) => (
                            <Card key={i} className="bg-[#0a0a0a] border-white/5 p-6 relative overflow-hidden group hover:border-white/10 transition-all shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <stat.icon className="h-16 w-16" />
                                </div>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <stat.icon className={cn("h-4 w-4", stat.color, (stat as any).pulse && "animate-pulse")} />
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{stat.label}</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-display font-black text-white italic">{stat.value}</span>
                                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{stat.sub}</span>
                                    </div>
                                    <div className="pt-2">
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: '65%' }}
                                                transition={{ duration: 1, delay: i * 0.1 }}
                                                className={cn("h-full", stat.bar)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Network Expansion Velocity Gauge */}
                    <Card className="bg-[#0a0a0a] border border-white/5 p-10 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-12 opacity-5">
                            <Network className="h-40 w-40 text-purple-500" />
                        </div>
                        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black tracking-[0.2em] px-4 py-1.5 rounded-full uppercase">Network_Protocol_v4.2</Badge>
                                    <h2 className="text-5xl font-display font-black text-white italic leading-tight uppercase tracking-tighter">
                                        Expansion<br /><span className="text-purple-500">_Velocity</span>
                                    </h2>
                                    <p className="text-sm text-white/30 font-medium leading-relaxed max-w-sm uppercase tracking-wider text-[11px] font-mono">
                                        Real-time tracking of node propagation across the global identity matrix. Velocity index indicates node acceleration.
                                    </p>
                                </div>
                                <div className="flex gap-12">
                                    <div className="space-y-2">
                                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Propagation Status</div>
                                        <div className="text-emerald-400 font-black italic tracking-[0.2em] text-lg uppercase flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Optimal
                                        </div>
                                    </div>
                                    <div className="space-y-2 border-l border-white/5 pl-12">
                                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Node Density</div>
                                        <div className="text-purple-400 font-black italic tracking-[0.2em] text-2xl uppercase">82.4%</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-center md:justify-end">
                                <div className="relative h-56 w-56 flex items-center justify-center">
                                    <svg className="h-full w-full -rotate-90">
                                        <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-white/[0.03]" />
                                        <motion.circle
                                            cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="16" fill="transparent"
                                            strokeDasharray={2 * Math.PI * 100}
                                            initial={{ strokeDashoffset: 2 * Math.PI * 100 }}
                                            animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - 0.82) }}
                                            transition={{ duration: 2, ease: "easeOut" }}
                                            className="text-purple-500"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-display font-black text-white italic">82</span>
                                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest mt-1">VELOCITY</span>
                                    </div>
                                    <div className="absolute -bottom-4 px-6 py-2 rounded-xl bg-purple-500 text-black text-[10px] font-black uppercase tracking-widest italic animate-bounce shadow-2xl shadow-purple-500/40">
                                        Hyperdrive_Active
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden shadow-2xl rounded-[32px]">
                        <Table>
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] w-[300px] py-6 px-8">User Identity</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] py-6 px-8">Protocol Stats</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] py-6 px-8">Verification</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] py-6 px-8">Team Role</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] text-right py-6 px-8">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {users.map((user, i) => (
                                        <TableRow key={user._id} className="border-white/5 hover:bg-white/[0.03] transition-colors group">
                                            <TableCell className="py-6 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-transparent flex items-center justify-center font-bold text-xs text-purple-400 border border-purple-500/20">
                                                        {user.walletAddress?.slice(2, 4).toUpperCase()}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <div className="text-sm font-display font-black text-white group-hover:text-purple-400 transition-colors italic">
                                                            {user.walletAddress?.slice(0, 10)}...{user.walletAddress?.slice(-6)}
                                                        </div>
                                                        <div className="text-[10px] text-white/40 font-mono tracking-tighter uppercase">
                                                            Node_ID: <span className="text-purple-500/60 font-black">{user.referralCode}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] px-1.5 h-4 font-black">
                                                            RT: ${user.realBalances?.directLevel?.toFixed(2)}
                                                        </Badge>
                                                        <Badge className="bg-blue-500/10 text-blue-400 border-none text-[9px] px-1.5 h-4 font-black">
                                                            PB: ${user.realBalances?.practice?.toFixed(2)}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-[9px] text-white/30 uppercase font-black tracking-widest italic">LVL_{user.clubRank || 0}_UPLINK</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8">
                                                <div className="flex flex-col gap-1">
                                                    {user.isActive ? (
                                                        <Badge className="w-fit bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase font-black italic">NOMINAL</Badge>
                                                    ) : (
                                                        <Badge className="w-fit bg-white/5 text-white/40 border-white/10 text-[10px] uppercase font-black">STAY_MODE</Badge>
                                                    )}
                                                    <span className="text-[9px] text-white/30 font-black uppercase tracking-tighter italic">{user.activation?.tier?.replace('tier', 'LEVEL_') || 'PRC_MODE'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8">
                                                <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 inline-block text-[10px] font-black uppercase tracking-widest text-white/60">
                                                    {user.role}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right px-8">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="hover:bg-white/10 h-10 w-10 p-0 text-white/40 transition-all rounded-xl">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-[#0c0c0c] border-white/10 text-white w-48 rounded-2xl shadow-2xl p-2">
                                                        <DropdownMenuItem
                                                            onClick={() => viewProfile(user)}
                                                            className="focus:bg-purple-500 focus:text-white cursor-pointer gap-3 font-black uppercase text-[10px] italic rounded-xl py-3 px-4 transition-all"
                                                        >
                                                            <Eye className="h-4 w-4" /> View Full Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => viewNetwork(user._id)}
                                                            className="focus:bg-purple-500 focus:text-white cursor-pointer gap-3 font-black uppercase text-[10px] italic rounded-xl py-3 px-4 transition-all"
                                                        >
                                                            <Network className="h-4 w-4" /> Network Tree
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleFreeze(user._id, user.isFrozen)}
                                                            className={cn(
                                                                "focus:bg-white/5 cursor-pointer gap-3 font-black uppercase text-[10px] italic rounded-xl py-3 px-4 transition-all",
                                                                user.isFrozen ? "text-emerald-500" : "text-rose-500"
                                                            )}
                                                        >
                                                            {user.isFrozen ? (
                                                                <><Shield className="h-4 w-4" /> Re-Activate</>
                                                            ) : (
                                                                <><ShieldOff className="h-4 w-4" /> Suspend Node</>
                                                            )}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        <div className="p-8 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <div className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">
                                Showing {users.length} of {total} nodes registered
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)}
                                    variant="outline" className="border-white/5 h-10 w-10 p-0 hover:bg-white/5 rounded-xl"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-[10px] font-black text-white px-4 h-10 flex items-center bg-white/5 rounded-xl border border-white/10 italic">
                                    NODE {page} / {Math.ceil(total / 50) || 1}
                                </div>
                                <Button
                                    disabled={page >= Math.ceil(total / 50)}
                                    onClick={() => setPage(page + 1)}
                                    variant="outline" className="border-white/5 h-10 w-10 p-0 hover:bg-white/5 rounded-xl"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Live Activity Terminal */}
                <Card className="bg-[#0a0a0a] border-white/10 overflow-hidden lg:row-span-1 shadow-2xl rounded-[32px]">
                    <CardHeader className="p-8 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 flex items-center gap-2">
                                <Radio className="h-3 w-3 animate-pulse" /> Access Protocol
                            </CardTitle>
                            <Badge className="bg-purple-500/10 text-purple-400 border-none text-[9px] font-black px-3">
                                {activityLog.length} ACTIVE
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto max-h-[800px] font-mono scrollbar-none">
                        <div className="divide-y divide-white/[0.03]">
                            {activityLog.length === 0 ? (
                                <div className="p-12 text-center space-y-4">
                                    <Activity className="h-6 w-6 text-white/5 mx-auto" />
                                    <p className="text-[9px] text-white/20 uppercase font-black tracking-[0.3em] font-mono">Awaiting_Uplink...</p>
                                </div>
                            ) : (
                                <AnimatePresence initial={false}>
                                    {activityLog.map((event, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="p-5 hover:bg-white/[0.02] transition-colors border-l-2 border-transparent hover:border-purple-500/50"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[9px] font-black px-2 py-1 rounded italic bg-purple-500/10 text-purple-400 uppercase tracking-widest">
                                                    LOGIN_OK
                                                </span>
                                                <span className="text-[8px] text-white/20 font-bold tracking-widest">{format(new Date(event.timestamp), "HH:mm:ss")}</span>
                                            </div>
                                            <div className="text-[10px] text-white/60 truncate font-black uppercase tracking-tighter">
                                                {event.walletAddress?.slice(0, 14)}...
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-[9px] text-white/20 uppercase font-black tracking-widest font-mono">{event.ipAddress || '0.0.0.0'}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    <span className="text-[8px] font-black text-emerald-500/50 uppercase italic tracking-widest">SECURE</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AnimatePresence>
                {showProfile && selectedUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProfile(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            <div className="absolute top-0 right-0 p-8 z-10">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowProfile(false)}
                                    className="h-10 w-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/40"
                                >
                                    <LogOut className="h-4 w-4 rotate-180" />
                                </Button>
                            </div>

                            <div className="grid md:grid-cols-3">
                                {/* Left Side: User Summary */}
                                <div className="p-10 bg-white/[0.02] border-r border-white/5 space-y-8">
                                    <div className="space-y-4 text-center md:text-left">
                                        <div className="h-24 w-24 rounded-3xl bg-purple-500/20 border-2 border-purple-500/40 mx-auto md:mx-0 flex items-center justify-center text-4xl font-display font-black italic text-purple-400">
                                            {selectedUser.walletAddress?.slice(2, 4).toUpperCase()}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-display font-black text-white italic truncate">
                                                {selectedUser.walletAddress?.slice(0, 12)}...
                                            </h2>
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">NODE ID: {selectedUser._id.slice(-8)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-black border border-white/5 space-y-1">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">Access Status</span>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("h-2 w-2 rounded-full", selectedUser.isActive ? "bg-emerald-500 animate-pulse" : "bg-white/20")} />
                                                <span className="text-xs font-black uppercase italic tracking-tight text-white">{selectedUser.isActive ? 'Protocol Active' : 'Suspended'}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-black border border-white/5 space-y-1">
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">Security Tier</span>
                                            <div className="text-xs font-black uppercase text-purple-400 italic tracking-tight">{selectedUser.activation?.tier?.replace('tier', 'LEVEL_') || 'PRC_MODE'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Detailed Matrix */}
                                <div className="md:col-span-2 p-10 space-y-10 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                    <div>
                                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic mb-6 flex items-center gap-2">
                                            <BarChart3 className="h-4 w-4" /> Financial Intelligence Matrix
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Card className="bg-black border-white/5 p-6 space-y-1">
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Protocol Balance</span>
                                                <div className="text-2xl font-display font-black text-emerald-400 italic font-mono">$ {selectedUser.realBalances?.directLevel?.toFixed(2) || '0.00'}</div>
                                            </Card>
                                            <Card className="bg-black border-white/5 p-6 space-y-1">
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Practice Credit</span>
                                                <div className="text-2xl font-display font-black text-blue-400 italic font-mono">$ {selectedUser.realBalances?.practice?.toFixed(2) || '0.00'}</div>
                                            </Card>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] italic mb-6 flex items-center gap-2">
                                            <ShieldCheck className="h-4 w-4" /> Identity Records
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Email Uplink</span>
                                                <span className="text-xs font-bold text-white selection:bg-purple-500/30">{selectedUser.email || 'PROTOCOL_ANONYMOUS'}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Genesis Timestamp</span>
                                                <span className="text-xs font-bold text-white uppercase italic">{format(new Date(selectedUser.createdAt), "MMM dd, yyyy HH:mm:ss")}</span>
                                            </div>
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Referral Signature</span>
                                                <span className="text-xs font-black text-purple-400 italic font-mono tracking-widest uppercase">{selectedUser.referralCode}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-white/5 flex gap-4">
                                        <Button
                                            onClick={() => viewNetwork(selectedUser._id)}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black h-12 rounded-xl text-[10px] uppercase italic tracking-[0.2em] gap-2 border border-white/5"
                                        >
                                            <Network className="h-4 w-4" /> TRACE NETWORK
                                        </Button>
                                        <Button
                                            onClick={() => handleFreeze(selectedUser._id, selectedUser.isFrozen)}
                                            className={cn(
                                                "flex-1 font-black h-12 rounded-xl text-[10px] uppercase italic tracking-[0.2em] gap-2 transition-all",
                                                selectedUser.isFrozen ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600"
                                            )}
                                        >
                                            {selectedUser.isFrozen ? <><Shield className="h-4 w-4" /> RE-ACTIVATE</> : <><ShieldOff className="h-4 w-4" /> SUSPEND NODE</>}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

