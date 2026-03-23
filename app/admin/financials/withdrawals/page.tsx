"use client";

import { useEffect, useState } from "react";
import { 
    Activity, ShieldAlert, PauseCircle, PlayCircle, Wallet, 
    ArrowUpRight, AlertCircle, RefreshCw, Filter, Search, Ban, Unlock
} from "lucide-react";
import { toast } from "sonner";
import { getToken } from "@/lib/api";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function fmt(n?: number, d = 2) { return (n ?? 0).toLocaleString(undefined, { maximumFractionDigits: d }); }

export default function WithdrawalMonitoringDashboard() {
    const [analytics, setAnalytics] = useState<any>(null);
    const [withdrawals, setWithdrawals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [globalPause, setGlobalPause] = useState(false);
    
    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    useEffect(() => {
        fetchAnalytics();
        fetchWithdrawals();
    }, [page, search, statusFilter]);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/admin/withdrawals/analytics', {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const d = await res.json();
            if (d.status === 'success') {
                setAnalytics(d.data);
                setGlobalPause(d.data.globalPause);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/withdrawals/list?page=${page}&limit=20&search=${search}&status=${statusFilter}`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const d = await res.json();
            if (d.status === 'success') {
                setWithdrawals(d.data.withdrawals);
                setTotalPages(d.data.totalPages);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleGlobalPause = async () => {
        try {
            const newState = !globalPause;
            const res = await fetch('/api/admin/withdrawals/pause', {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ pause: newState })
            });
            const d = await res.json();
            if (d.status === 'success') {
                setGlobalPause(newState);
                toast.success(d.message);
            }
        } catch (e) {
            toast.error("Failed to toggle global pause");
        }
    };

    const toggleFreeze = async (userId: string, currentFreeze: boolean) => {
        try {
            const res = await fetch('/api/admin/withdrawals/freeze', {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ userId, freeze: !currentFreeze })
            });
            const d = await res.json();
            if (d.status === 'success') {
                toast.success(d.message);
                fetchWithdrawals(); // Refresh list
            }
        } catch (e) {
            toast.error("Failed to freeze user");
        }
    };

    return (
        <div className="min-h-screen bg-transparent text-white p-8 font-sans selection:bg-rose-500/30">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase flex items-center gap-4">
                        <Wallet className="w-10 h-10 text-rose-500" />
                        Withdrawal <span className="text-rose-500">Oversight</span>
                    </h1>
                    <p className="text-white/40 font-mono text-xs uppercase tracking-widest mt-2">
                        Transparent Automated Distribution Monitoring
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <Button 
                        onClick={toggleGlobalPause}
                        variant={globalPause ? "danger" : "outline"}
                        className={`gap-2 font-bold uppercase tracking-widest text-xs h-12 px-6 rounded-xl ${
                            globalPause 
                                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                                : "border-rose-500/20 hover:bg-rose-500/10 text-rose-400"
                        }`}
                    >
                        {globalPause ? <PlayCircle className="w-5 h-5" /> : <PauseCircle className="w-5 h-5" />}
                        {globalPause ? "Resume Smart Contract" : "Emergency Pause"}
                    </Button>
                </div>
            </div>

            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="text-white/40 text-xs font-mono tracking-widest uppercase mb-4">24h Outflow</div>
                    <div className="text-3xl font-black">{analytics ? `$${fmt(analytics.totalToday)}` : '...'}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="text-white/40 text-xs font-mono tracking-widest uppercase mb-4">Total Sent (All-Time)</div>
                    <div className="text-3xl font-black">{analytics ? `$${fmt(analytics.totalAllTime)}` : '...'}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="text-white/40 text-xs font-mono tracking-widest uppercase mb-4">Average TX Size</div>
                    <div className="text-3xl font-black">{analytics ? `$${fmt(analytics.avgSize || 0)}` : '...'}</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
                    <div className="text-white/40 text-xs font-mono tracking-widest uppercase mb-4">Withdrawal vs Deposit Ratio</div>
                    <div className="text-3xl font-black">{analytics ? `${analytics.withdrawalRatio || 0}%` : '...'}</div>
                </div>
            </div>

            {/* Data Table Area */}
            <div className="bg-black/40 border border-white/10 rounded-[32px] p-6 backdrop-blur-xl">
                {/* Filters */}
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 relative z-10">
                    <h2 className="text-xl font-bold italic tracking-wide">SMART CONTRACT LEDGER</h2>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <Input 
                                placeholder="Search Wallet..." 
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 w-64 text-sm focus-visible:ring-1 focus-visible:ring-rose-500/50"
                            />
                        </div>
                        <select 
                            className="bg-[#111] border border-white/10 text-white rounded-lg px-4 py-2 text-sm outline-none focus:border-rose-500/50"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Statuses</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                        </select>
                        <Button variant="outline" size="icon" onClick={() => { fetchAnalytics(); fetchWithdrawals(); }} className="border-white/10 hover:bg-white/10 text-white">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto relative z-0">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="text-xs uppercase font-mono text-white/40 border-b border-white/10">
                            <tr>
                                <th className="py-4 pl-4 font-normal">Wallet / ID</th>
                                <th className="py-4 font-normal text-right">Requested</th>
                                <th className="py-4 font-normal text-right">Fee (10%)</th>
                                <th className="py-4 font-normal text-right text-green-400">Net Sent</th>
                                <th className="py-4 font-normal text-center">Status</th>
                                <th className="py-4 font-normal text-center">Blockchain Proof</th>
                                <th className="py-4 font-normal">Date</th>
                                <th className="py-4 font-normal text-right pr-4">Oversight Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {withdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-white/30 font-mono">No transactions found</td>
                                </tr>
                            ) : (
                                withdrawals.map((w, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 pl-4">
                                            <div className="flex items-center gap-2">
                                                <div className="font-mono text-white/90 font-bold">{w.walletAddress?.slice(0, 6)}...{w.walletAddress?.slice(-4)}</div>
                                                {w.isFrozen && <Badge className="bg-red-500/20 text-red-500 border-none text-[10px]">FROZEN</Badge>}
                                            </div>
                                            <div className="text-[10px] text-white/30 mt-1 font-mono">{w.userId}</div>
                                        </td>
                                        <td className="py-4 text-right font-mono">${fmt(w.amountRequested)}</td>
                                        <td className="py-4 text-right font-mono text-rose-400">-${fmt(w.fee)}</td>
                                        <td className="py-4 text-right font-mono text-green-400 font-bold">${fmt(w.netAmount)}</td>
                                        <td className="py-4 text-center">
                                            {w.status === 'confirmed' 
                                                ? <Badge className="bg-green-500/10 text-green-400 border-green-500/20">SUCCESS</Badge>
                                                : w.status === 'pending'
                                                ? <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">PENDING</Badge>
                                                : <Badge className="bg-red-500/10 text-red-500 border-red-500/20">FAILED</Badge>
                                            }
                                        </td>
                                        <td className="py-4 text-center">
                                            {w.txHash ? (
                                                <a href={`https://bscscan.com/tx/${w.txHash}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-mono">
                                                    {w.txHash.slice(0, 8)}... <ArrowUpRight className="w-3 h-3" />
                                                </a>
                                            ) : (
                                                <span className="text-white/20 text-[10px] font-mono border border-white/10 px-2 py-1 rounded">PENDING_TX</span>
                                            )}
                                        </td>
                                        <td className="py-4 text-white/50 text-xs font-mono">
                                            {format(new Date(w.createdAt), 'MMM dd, yyyy HH:mm')}
                                        </td>
                                        <td className="py-4 text-right pr-4">
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => toggleFreeze(w.userId, w.isFrozen)}
                                                className={`text-xs h-8 ${w.isFrozen ? 'text-green-400 hover:text-green-300 hover:bg-green-500/10' : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'}`}
                                            >
                                                {w.isFrozen ? <Unlock className="w-3 h-3 mr-2" /> : <Ban className="w-3 h-3 mr-2" />}
                                                {w.isFrozen ? 'UNFREEZE' : 'FREEZE ACCT'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                        <div className="text-xs text-white/40 font-mono">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="border-white/10 text-white hover:bg-white/10">Prev</Button>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-white/10 text-white hover:bg-white/10">Next</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
