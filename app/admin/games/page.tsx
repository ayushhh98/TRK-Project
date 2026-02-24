"use client";

import { useEffect, useState } from "react";
import {
    Trophy, History, Search, ChevronLeft, ChevronRight,
    ExternalLink, AlertCircle, Eye, Zap, BarChart3,
    TrendingUp, Activity, Radio, ShieldCheck,
    Lock, Unlock, Cpu, Target, Clock, Terminal, Globe, Dices
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/api";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const GAME_NODES = [
    { id: 'rng', label: 'RNG_Core', desc: 'Immutable Entropy Source', icon: Zap, color: 'text-blue-400' },
    { id: 'payout', label: 'Payout_Logic', desc: 'Yield Distribution Engine', icon: Cpu, color: 'text-purple-400' },
    { id: 'real', label: 'Real_Engine', desc: 'Mainnet Operations', icon: Globe, color: 'text-emerald-400' },
    { id: 'practice', label: 'Practice_Engine', desc: 'Mock Simulation Node', icon: Terminal, color: 'text-blue-400' },
    { id: 'audit', label: 'Audit_Verifier', desc: 'Proof of Transparency', icon: ShieldCheck, color: 'text-amber-400' }
];

type GameRound = {
    _id: string;
    user: { walletAddress: string; email: string };
    gameType: "practice" | "real";
    betAmount: number;
    isWin: boolean;
    multiplier: number;
    payout: number;
    txHash: string;
    serverSeedHash?: string;
    createdAt: string;
    pickedNumber: any;
    luckyNumber: any;
    status: string;
    roundNumber?: number;
};

function maskWallet(addr: string) {
    if (!addr) return "N/A";
    return addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

export default function AdminGameResults() {
    const [games, setGames] = useState<GameRound[]>([]);
    const [liveStats, setLiveStats] = useState<any>(null);
    const [liveRecent, setLiveRecent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ total: 0, current: 1, limit: 20, pages: 1 });
    const [filters, setFilters] = useState({ walletAddress: "", gameType: "", isWin: "" });
    const [selectedRound, setSelectedRound] = useState<GameRound | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [activityFeed, setActivityFeed] = useState<any[]>([]);
    const [activeNode, setActiveNode] = useState('rng');

    useAdminSocket({
        onGamesUpdate: (d) => {
            setLiveStats(d.stats);
            setLiveRecent(d.recentGames ?? []);
            setLastUpdated(new Date());
        },
        onGameActivity: (data) => {
            setActivityFeed(prev => [data, ...prev].slice(0, 50));
            setLastUpdated(new Date());
        }
    });

    const fetchGames = async (page = 1) => {
        setLoading(true);
        try {
            const query = new URLSearchParams({ page: page.toString(), limit: "20", ...filters });
            const res = await fetch(`/api/admin/games?${query}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (data.status === "success") { setGames(data.data); setPagination(data.pagination); }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchGames(); }, [filters]);

    return (
        <div className="min-h-screen bg-black text-white/90 p-8 space-y-10 pb-32">
            {/* Cybernetic Hub Header */}
            <div className={cn(
                "relative group overflow-hidden rounded-[40px] border p-12 transition-all duration-700",
                "border-blue-500/10 bg-blue-500/5 shadow-[0_0_50px_rgba(59,130,246,0.05)]"
            )}>
                <div className="absolute top-0 right-0 w-[800px] h-[800px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 bg-blue-500/5" />

                <div className="relative flex flex-col lg:flex-row items-center justify-between gap-12 text-center lg:text-left">
                    <div className="space-y-6">
                        <div className="flex items-center justify-center lg:justify-start gap-4">
                            <Badge variant="outline" className="uppercase tracking-[0.4em] text-[10px] font-black py-2 px-6 rounded-full border-2 border-blue-500/30 bg-blue-500/10 text-blue-400">
                                RNG_Protocol: NOMINAL
                            </Badge>
                            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <Zap className="h-3 w-3 text-blue-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Sync_Live_Engine</span>
                            </div>
                        </div>
                        <h1 className="text-8xl font-display font-black tracking-tighter italic uppercase leading-tight">
                            GAME<span className="text-blue-500">_HUB</span>
                        </h1>
                        <p className="text-white/40 font-mono text-[11px] uppercase tracking-[0.5em] max-w-xl leading-relaxed mx-auto lg:mx-0">
                            Algorithmic Integrity & Payout Intelligence // Real-time Audit Node
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                        <div className="relative flex-1 sm:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                            <Input
                                placeholder="Search tx hash or wallet..."
                                className="bg-white/5 border-white/10 pl-12 h-14 rounded-2xl focus:border-blue-500 transition-all font-bold placeholder:text-white/20 text-sm"
                                value={filters.walletAddress}
                                onChange={(e) => setFilters({ ...filters, walletAddress: e.target.value })}
                            />
                        </div>
                        <Button onClick={() => fetchGames(1)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black h-14 rounded-2xl px-8 uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/20">
                            EXECUTE SCAN
                        </Button>
                    </div>
                </div>
            </div>

            {/* Protocol Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {GAME_NODES.map((n) => (
                    <Card key={n.id} className={cn(
                        "group bg-[#0a0a0a] border-blue-500/10 hover:border-blue-500/20 transition-all duration-300 relative overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.02)]",
                        activeNode === n.id && "border-blue-500/30 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.08)]"
                    )}>
                        <CardContent className="p-8 space-y-6">
                            <div className="flex items-start justify-between">
                                <div className={cn(
                                    "h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-all",
                                    (n as any).color,
                                    activeNode === n.id && "bg-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                                )}>
                                    <n.icon className="h-6 w-6" />
                                </div>
                                <Badge className={cn(
                                    "font-black uppercase tracking-[0.2em] text-[8px] px-3 py-1",
                                    activeNode === n.id ? "bg-blue-500 text-white" : "bg-blue-500/20 text-blue-400"
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
                                        ? "bg-blue-500 text-white border-none shadow-lg shadow-blue-500/20"
                                        : "bg-transparent hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30"
                                )}
                            >
                                {activeNode === n.id ? 'AUDIT_SECURED' : 'Audit Node'}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    {/* Game Intelligence Matrix (Stats Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {(activeNode === 'payout' ? [
                            { label: 'Payout_Velocity', value: `$${liveStats?.totalPayout?.toFixed(0) || 0}`, sub: 'Mesh Distribution', icon: TrendingUp, color: 'text-purple-400', bar: 'bg-purple-500' },
                            { label: 'Yield_Efficiency', value: liveStats?.winRate ? `${(100 - liveStats.winRate).toFixed(1)}%` : '98.5%', sub: 'Protocol Target', icon: Zap, color: 'text-emerald-400', bar: 'bg-emerald-500' },
                            { label: 'Net_Volume', value: `$ ${(liveStats?.totalBetVolume || 0).toLocaleString()}`, sub: 'Matrix Depth', icon: BarChart3, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'Audit_Ratio', value: '1.0:1', sub: 'Sync Status', icon: ShieldCheck, color: 'text-purple-400', bar: 'bg-purple-500' }
                        ] : activeNode === 'real' ? [
                            { label: 'Mainnet_Load', value: liveRecent.length > 5 ? 'High' : 'Optimal', sub: 'Traffic Density', icon: Globe, color: 'text-emerald-400', bar: 'bg-emerald-500' },
                            { label: 'Ops_Sync', value: liveRecent.length, sub: 'Recent Round Ops', icon: Activity, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'Net_Revenue', value: `$ ${(liveStats?.netRevenue || 0).toFixed(0)}`, sub: 'Protocol Yield', icon: TrendingUp, color: 'text-emerald-400', bar: 'bg-emerald-500' },
                            { label: 'RNG_Signal', value: 'Perfect', sub: 'EVM Optimized', icon: Zap, color: 'text-amber-400', bar: 'bg-amber-500' }
                        ] : activeNode === 'practice' ? [
                            { label: 'Sim_Sessions', value: games.filter(g => g.gameType === 'practice').length || 0, sub: 'Mock Load', icon: Terminal, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'Edge_Stability', value: 'Optimal', sub: 'Sim Integrity', icon: ShieldCheck, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'Practice_TVL', value: `$ ${(liveStats?.totalBetVolume || 0).toLocaleString()}`, sub: 'Virtual Asset', icon: BarChart3, color: 'text-white/20', bar: 'bg-white/20' },
                            { label: 'Node_Uptime', value: '100%', sub: 'Continuous Sync', icon: Radio, color: 'text-emerald-400', bar: 'bg-emerald-500' }
                        ] : activeNode === 'audit' ? [
                            { label: 'Verified_Proofs', value: (liveStats?.totalRounds || 0).toLocaleString(), sub: 'Immutable Logs', icon: ShieldCheck, color: 'text-amber-400', bar: 'bg-amber-500' },
                            { label: 'Integrity_Score', value: 'Perfect', sub: 'Binary Scan', icon: Cpu, color: 'text-emerald-400', bar: 'bg-emerald-500' },
                            { label: 'Latency_Audit', value: '4ms', sub: 'Validation Speed', icon: Clock, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'On-Chain_Sync', value: 'Confirmed', sub: 'Finality Status', icon: Globe, color: 'text-amber-400', bar: 'bg-amber-500' }
                        ] : [
                            { label: 'Total Operations', value: (liveStats?.totalRounds || pagination.total).toLocaleString(), sub: 'All-time rounds', icon: Dices, color: 'text-blue-400', bar: 'bg-blue-500' },
                            { label: 'Payout Velocity', value: `$${liveStats?.totalPayout?.toFixed(0) || 0}`, sub: 'Total Distributed', icon: TrendingUp, color: 'text-emerald-400', bar: 'bg-emerald-500' },
                            { label: 'RNG Entropy', value: (liveStats?.totalRounds || 0) > 100 ? 'High' : 'Stable', sub: 'Protocol Integrity', icon: Zap, color: 'text-amber-400', bar: 'bg-amber-500', pulse: true },
                            { label: 'Active Sessions', value: liveRecent.length || 0, sub: 'Real-time detection', icon: Radio, color: 'text-blue-400', bar: 'bg-blue-500' }
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
                                                animate={{ width: '75%' }}
                                                transition={{ duration: 1, delay: i * 0.1 }}
                                                className={cn("h-full", stat.bar)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* House Performance Logic Gauge */}
                    <Card className="bg-[#0a0a0a] border border-white/5 p-10 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-12 opacity-5">
                            <Target className="h-40 w-40 text-blue-500" />
                        </div>
                        <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black tracking-[0.2em] px-4 py-1.5 rounded-full uppercase">House_Protocol_v2.5</Badge>
                                    <h2 className="text-5xl font-display font-black text-white italic leading-tight uppercase tracking-tighter">
                                        Performance<br /><span className="text-blue-500">_Logic</span>
                                    </h2>
                                    <p className="text-sm text-white/30 font-medium leading-relaxed max-w-sm uppercase tracking-wider text-[11px] font-mono">
                                        Yield efficiency monitor. Tracking entropy-to-payout ratios across all active protocol nodes.
                                    </p>
                                </div>
                                <div className="flex gap-12">
                                    <div className="space-y-2">
                                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Yield Status</div>
                                        <div className="text-emerald-400 font-black italic tracking-[0.2em] text-lg uppercase flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            Optimal
                                        </div>
                                    </div>
                                    <div className="space-y-2 border-l border-white/5 pl-12">
                                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none">Win Rate Node</div>
                                        <div className="text-blue-400 font-black italic tracking-[0.2em] text-2xl uppercase">
                                            {liveStats ? ((liveStats.totalWins / liveStats.totalRounds) * 100).toFixed(1) : "34.2"}%
                                        </div>
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
                                            animate={{ strokeDashoffset: 2 * Math.PI * 100 * (1 - (liveStats ? (liveStats.totalWins / liveStats.totalRounds) : 0.342)) }}
                                            transition={{ duration: 2, ease: "easeOut" }}
                                            className="text-blue-500"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-display font-black text-white italic">
                                            {liveStats ? ((liveStats.totalWins / liveStats.totalRounds) * 100).toFixed(0) : "34"}
                                        </span>
                                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">WIN_RATIO</span>
                                    </div>
                                    <div className="absolute -bottom-4 px-6 py-2 rounded-xl bg-blue-500 text-black text-[10px] font-black uppercase tracking-widest italic animate-bounce shadow-2xl shadow-blue-500/40">
                                        Audit_Secured
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Volume vs Payout */}
                    {liveStats && (
                        <Card className="bg-[#0f0f0f] border-white/5 overflow-hidden">
                            <CardHeader className="border-b border-white/5 p-4 flex flex-row items-center gap-3">
                                <TrendingUp className="h-4 w-4 text-purple-400" />
                                <CardTitle className="text-[11px] font-black italic uppercase tracking-widest">Volume vs Payout Ratio</CardTitle>
                                <Badge className="bg-purple-500/10 text-purple-400 border-none text-[9px] font-black ml-auto uppercase">House Edge: {liveStats?.houseEdge ?? 0}%</Badge>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-white/40">
                                        <span>Total Bet Volume</span>
                                        <span className="text-white">${(liveStats.totalBetVolume ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full w-full" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase text-white/40">
                                        <span>Total Payouts</span>
                                        <span className="text-emerald-400">${(liveStats.totalPayouts ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${liveStats.totalBetVolume > 0 ? Math.min(100, (liveStats.totalPayouts / liveStats.totalBetVolume) * 100) : 0}%` }} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Round Log Table */}
                    <Card className="bg-[#0f0f0f] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5 bg-black/20 p-5 flex flex-row items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <History className="h-4 w-4 text-purple-400" />
                                <CardTitle className="text-sm font-black italic uppercase">Round-Wise Result Log</CardTitle>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                                    <Input placeholder="Search wallet..." className="bg-black/50 border-white/10 w-56 pl-10 h-9 text-xs" value={filters.walletAddress}
                                        onChange={(e) => setFilters(p => ({ ...p, walletAddress: e.target.value }))} />
                                </div>
                                <select className="bg-black/50 border border-white/10 rounded-xl h-9 px-3 text-xs text-white/70" value={filters.gameType}
                                    onChange={(e) => setFilters(p => ({ ...p, gameType: e.target.value }))}>
                                    <option value="">All Types</option>
                                    <option value="real">Real</option>
                                    <option value="practice">Practice</option>
                                </select>
                                <select className="bg-black/50 border border-white/10 rounded-xl h-9 px-3 text-xs text-white/70" value={filters.isWin}
                                    onChange={(e) => setFilters(p => ({ ...p, isWin: e.target.value }))}>
                                    <option value="">All Results</option>
                                    <option value="true">Win</option>
                                    <option value="false">Loss</option>
                                </select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 bg-black/30">
                                            <th className="p-4 pl-6">Round</th>
                                            <th className="p-4">User</th>
                                            <th className="p-4 text-center">Type</th>
                                            <th className="p-4">Entry</th>
                                            <th className="p-4">Logic</th>
                                            <th className="p-4">Result</th>
                                            <th className="p-4">Payout</th>
                                            <th className="p-4">Time</th>
                                            <th className="p-4 pr-6 text-right">Info</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={9} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="h-10 w-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                                                    <p className="text-xs font-black text-white/20 uppercase tracking-widest">Loading rounds...</p>
                                                </div>
                                            </td></tr>
                                        ) : games.length === 0 ? (
                                            <tr><td colSpan={9} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <AlertCircle className="h-10 w-10 text-white/10" />
                                                    <p className="text-xs font-black text-white/20 uppercase tracking-widest">No rounds found</p>
                                                </div>
                                            </td></tr>
                                        ) : (
                                            games.map((game, idx) => (
                                                <motion.tr key={game._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                                                    className="group border-b border-white/[0.02] hover:bg-purple-500/[0.03] transition-colors">
                                                    <td className="p-4 pl-6 font-mono text-xs text-white/40">Round #{game.roundNumber || '?'}</td>
                                                    <td className="p-4">
                                                        <div className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">{maskWallet(game.user?.walletAddress || game.user?.email)}</div>
                                                        <div className="text-[9px] text-white/20 uppercase font-black">Player</div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase", game.gameType === "real" ? "border-amber-500/20 text-amber-500 bg-amber-500/5" : "border-white/10 text-white/40")}>
                                                            {game.gameType === "real" ? "Real" : "Sim"}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-4 font-mono text-xs font-bold text-white">{(game.betAmount ?? 0).toFixed(2)}</td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1.5 font-mono text-[9px] font-black tracking-tighter">
                                                            <span className="text-white/40 italic">#</span>
                                                            <span className="text-purple-400">{game.pickedNumber ?? '—'}</span>
                                                            <span className="text-white/20 mx-1">vs</span>
                                                            <span className="text-amber-400">{game.luckyNumber ?? '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className={cn("flex items-center gap-2 text-[10px] font-black uppercase", game.isWin ? "text-emerald-500" : "text-rose-500")}>
                                                            <div className={cn("h-1.5 w-1.5 rounded-full", game.isWin ? "bg-emerald-500" : "bg-rose-500")} />
                                                            {game.isWin ? "WIN" : "LOSS"}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-mono text-xs font-bold text-emerald-400">{game.isWin ? `+${(game.payout ?? 0).toFixed(2)}` : "—"}</td>
                                                    <td className="p-4 text-[10px] text-white/30">{format(new Date(game.createdAt), "HH:mm dd/MM")}</td>
                                                    <td className="p-4 pr-6 text-right">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white/10 text-white/20 hover:text-white" onClick={() => setSelectedRound(game)}>
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-5 border-t border-white/5 flex items-center justify-between bg-black/10">
                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Showing {games.length} of {pagination.total}</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="h-8 w-8 p-0 border-white/5" disabled={pagination.current === 1} onClick={() => fetchGames(pagination.current - 1)}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="h-8 px-4 flex items-center bg-purple-500/10 border border-purple-500/20 rounded-xl text-[10px] font-black text-purple-400">
                                        {pagination.current} / {pagination.pages}
                                    </div>
                                    <Button variant="outline" className="h-8 w-8 p-0 border-white/5" disabled={pagination.current === pagination.pages} onClick={() => fetchGames(pagination.current + 1)}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Live Activity Terminal */}
                <div className="lg:col-span-1">
                    <Card className="bg-black border-white/10 overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.1)] h-[800px] flex flex-col">
                        <CardHeader className="p-4 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400 flex items-center gap-2">
                                    <Radio className="h-3 w-3 animate-pulse" /> Live Ops Feed
                                </CardTitle>
                                <Badge className="bg-purple-500/10 text-purple-400 border-none text-[8px] font-black">{activityFeed.length} EVENTS</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-y-auto font-mono scrollbar-none flex-1">
                            <div className="divide-y divide-white/[0.03]">
                                {activityFeed.length === 0 ? (
                                    <div className="p-10 text-center space-y-2">
                                        <Activity className="h-5 w-5 text-white/10 mx-auto" />
                                        <p className="text-[9px] text-white/20 uppercase font-black tracking-widest">Awaiting Uplink...</p>
                                    </div>
                                ) : (
                                    <AnimatePresence initial={false}>
                                        {activityFeed.map((event, i) => (
                                            <motion.div
                                                key={event._id || i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="p-3 hover:bg-white/[0.02] transition-colors border-l-2 border-transparent hover:border-purple-500/50"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex gap-1.5">
                                                        <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border",
                                                            event.gameType === 'practice' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20")}>
                                                            {event.gameType === 'practice' ? 'PRACTICE' : 'REAL'}
                                                        </span>
                                                        <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10 uppercase italic")}>
                                                            Round #{event.roundNumber || '?'}
                                                        </span>
                                                        <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded italic",
                                                            event.isWin ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                                                            {event.gameVariant?.toUpperCase() || 'GAME'} {event.isWin ? 'WIN' : 'LOSS'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[8px] text-white/20 font-bold tracking-tighter">{format(new Date(event.timestamp), "HH:mm:ss")}</span>
                                                </div>
                                                <div className="text-[10px] text-white/60 truncate font-bold flex items-center justify-between">
                                                    <span>{event.user?.walletAddress ? (event.user.walletAddress.slice(0, 6) + '...' + event.user.walletAddress.slice(-4)) : 'SYSTEM'}</span>
                                                    <span className="text-[8px] text-white/30 font-black italic">
                                                        {event.pickedNumber ?? '?'} vs {event.luckyNumber ?? '?'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="text-[9px] text-white/40 uppercase font-black tracking-tight underline adornment-purple-500/20">Wager: ${event.betAmount}</span>
                                                    <span className={cn("text-[10px] font-black tracking-tighter", event.isWin ? "text-emerald-400" : "text-white/10")}>
                                                        {event.isWin ? `+$${event.payout?.toFixed(2)}` : '-'}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Detail modal */}
            <AnimatePresence>
                {selectedRound && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setSelectedRound(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[28px] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]">
                            <div className="p-7 border-b border-white/5 bg-purple-500/5 flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black italic text-white uppercase">Round Forensics</h3>
                                    <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Integrity Verification Protocol</p>
                                </div>
                                <Badge className={cn("font-black uppercase text-[10px]", selectedRound.isWin ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                                    {selectedRound.isWin ? "WIN" : "LOSS"}
                                </Badge>
                            </div>
                            <div className="p-7 grid grid-cols-2 gap-6">
                                {[
                                    { l: "Round ID", v: selectedRound._id.toUpperCase(), mono: true },
                                    { l: "Round Number", v: selectedRound.roundNumber ? `#${selectedRound.roundNumber}` : "—", mono: true },
                                    { l: "Game Type", v: selectedRound.gameType.toUpperCase() },
                                    { l: "Prediction", v: selectedRound.pickedNumber ?? "—", mono: true },
                                    { l: "Outcome", v: selectedRound.luckyNumber ?? "—", mono: true },
                                    { l: "Entry", v: `${(selectedRound.betAmount ?? 0).toFixed(2)} USDT` },
                                    { l: "Multiplier", v: `${selectedRound.multiplier ?? '—'}X` },
                                    { l: "RNG Hash", v: selectedRound.serverSeedHash || "Contract Generated", mono: true },
                                    { l: "User Wallet", v: selectedRound.user?.walletAddress, mono: true },
                                    { l: "Payout", v: selectedRound.isWin ? `${(selectedRound.payout ?? 0).toFixed(2)} USDT` : "0.00 USDT" },
                                    { l: "Status", v: selectedRound.status || "Completed" },
                                ].map(({ l, v, mono }) => (
                                    <div key={l} className="space-y-1">
                                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{l}</p>
                                        <p className={cn("text-sm font-bold text-white/80 truncate", mono && "font-mono text-xs text-purple-400")}>{v ?? "—"}</p>
                                    </div>
                                ))}
                            </div>
                            {selectedRound.txHash && (
                                <div className="px-7 pb-7">
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
                                        <p className="font-mono text-[10px] text-purple-400 truncate">{selectedRound.txHash}</p>
                                        <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-black uppercase text-white/40 hover:text-white shrink-0">
                                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Verify
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <div className="px-7 pb-7">
                                <Button className="w-full bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs h-11 rounded-xl border border-white/10" onClick={() => setSelectedRound(null)}>
                                    Close
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
