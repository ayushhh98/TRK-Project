"use client";

import { useEffect, useState } from "react";
import {
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter,
    Wallet,
    Trophy,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Download,
    AlertCircle,
    ShieldAlert,
    RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { getToken } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

import { useAdminSocket } from "@/hooks/useAdminSocket";
import { BSCScanTransactions } from "@/components/admin/BSCScanTransactions";

export default function UnifiedTransactions() {
    const [activeTab, setActiveTab] = useState<'internal' | 'bsc'>('internal');
    const [txs, setTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Real-time updates
    const { connectionStatus } = useAdminSocket({
        onTransactionUpdate: (newTx) => {
            console.log("New real-time transaction:", newTx);
            // Prepend new transaction if it matches current search (or just always for simplicity)
            setTxs(prev => [newTx, ...prev].slice(0, 50));
            setTotal(prev => prev + 1);
        }
    });

    useEffect(() => {
        fetchTransactions();
    }, [page]);

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/transactions?page=${page}&q=${search}`, {
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
                    setError(data.message || 'Insufficient permissions to view transactions.');
                }
                return;
            }

            const data = await res.json();
            if (data.status === 'success') {
                setTxs(data.data.transactions);
                setTotal(data.data.total);
            } else {
                setError(data.message || 'Failed to fetch transactions');
            }
        } catch (err) {
            console.error('Fetch error', err);
            setError('Network error: Failed to connect to transaction service.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl p-6 mb-8 flex gap-4 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ShieldAlert className="h-24 w-24" />
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 relative z-10">
                        <h3 className="font-black uppercase tracking-widest text-xs italic">LEDGER FAULT DETECTED</h3>
                        <p className="text-sm font-medium opacity-80 uppercase leading-relaxed tracking-tight">
                            {error}
                        </p>
                        {error.includes('IP address') && (
                            <div className="mt-4 pt-4 border-t border-rose-500/10 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <span className="text-[10px] uppercase font-black opacity-60">
                                    Action Required: Contact the technical administrator to whitelist your current IP.
                                </span>
                            </div>
                        )}
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button
                                onClick={() => window.location.href = '/admin/login'}
                                className="bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl"
                            >
                                <RefreshCw className="h-3 w-3 mr-2" />
                                Re-establish Session
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => fetchTransactions()}
                                className="border-rose-500/20 text-rose-500 hover:bg-rose-500/5 font-black uppercase text-[10px] tracking-widest h-10 px-6 rounded-xl"
                            >
                                Retry Reconciliation
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 uppercase tracking-[0.2em] text-[10px] font-black">
                        Unified Ecosystem Ledger
                    </Badge>
                    <h1 className="text-4xl font-display font-black text-white tracking-tight italic">
                        TRANSACTION<span className="text-emerald-500 italic">MONITOR</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <Input
                            placeholder="Search Wallet or Tx Hash..."
                            className="bg-white/5 border-white/10 pl-12 h-12 rounded-xl focus:border-emerald-500/50 transition-all text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchTransactions()}
                        />
                    </div>
                    <Button onClick={() => fetchTransactions()} className="bg-emerald-600 text-white font-black h-12 rounded-xl px-6">
                        FILTER
                    </Button>
                    <Button variant="outline" className="border-white/10 h-12 w-12 rounded-xl p-0 hover:bg-white/5">
                        <Download className="h-4 w-4 text-white/40" />
                    </Button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-[#0f0f0f] border border-white/5 rounded-2xl p-1 mb-6">
                <button
                    onClick={() => setActiveTab('internal')}
                    className={cn(
                        "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                        activeTab === 'internal'
                            ? "bg-emerald-500/10 text-emerald-500 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"
                            : "text-white/40 hover:text-white/80 hover:bg-white/5"
                    )}
                >
                    Internal Ledger
                </button>
                <button
                    onClick={() => setActiveTab('bsc')}
                    className={cn(
                        "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300",
                        activeTab === 'bsc'
                            ? "bg-emerald-500/10 text-emerald-500 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]"
                            : "text-white/40 hover:text-white/80 hover:bg-white/5"
                    )}
                >
                    Smart Contract Ledger
                </button>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'internal' ? (
                        <Card className="bg-[#0f0f0f] border-white/5 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/[0.02]">
                                    <TableRow className="border-white/5">
                                        <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest">Type</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest">User / Wallet</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest">Amount</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest">Protocol Status</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest text-right">Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-white/20 italic font-black uppercase tracking-widest">
                                                Decrypting Ledger...
                                            </TableCell>
                                        </TableRow>
                                    ) : txs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-white/20 italic font-black uppercase tracking-widest">
                                                Absolute Silence in the Treasury
                                            </TableCell>
                                        </TableRow>
                                    ) : txs.map((tx) => (
                                        <TableRow key={tx.id} className="border-white/5 hover:bg-white/[0.01] transition-colors group">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-lg flex items-center justify-center",
                                                        tx.type === 'DEPOSIT' ? "bg-emerald-500/10 text-emerald-500" :
                                                            tx.type === 'WITHDRAWAL' ? "bg-red-500/10 text-red-500" :
                                                                "bg-blue-500/10 text-blue-400"
                                                    )}>
                                                        {tx.type === 'DEPOSIT' ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{tx.type}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <div className="text-xs font-bold text-white uppercase">
                                                        {(tx.user?.walletAddress || tx.walletAddress)?.slice(0, 10)}...
                                                    </div>
                                                    <div className="text-[8px] font-mono text-white/20 uppercase">ID: {tx.userId?.slice(-6) || tx.id?.slice(-6)}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-black text-white italic">
                                                    {tx.type === 'WITHDRAWAL' ? '-' : '+'}$ {tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn(
                                                    "text-[9px] font-black uppercase border-none",
                                                    tx.status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-500" :
                                                        tx.status === 'PENDING' ? "bg-amber-500/10 text-amber-500" :
                                                            "bg-red-500/10 text-red-500"
                                                )}>
                                                    {tx.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="text-[10px] font-bold text-white/60">{new Date(tx.createdAt).toLocaleDateString()}</div>
                                                    <div className="text-[8px] text-white/20 font-bold uppercase">{new Date(tx.createdAt).toLocaleTimeString()}</div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {!error && (
                                <div className="p-4 border-t border-white/5 flex items-center justify-between">
                                    <div className="text-xs text-white/40 font-bold uppercase tracking-widest">Registry: {total} Records</div>
                                    <div className="flex gap-2">
                                        <Button disabled={page === 1} onClick={() => setPage(page - 1)} variant="outline" size="sm" className="border-white/10 h-8 w-8 p-0 hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></Button>
                                        <div className="h-8 px-4 flex items-center bg-white/5 border border-white/10 rounded-lg text-xs font-black italic">{page}</div>
                                        <Button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(page + 1)} variant="outline" size="sm" className="border-white/10 h-8 w-8 p-0 hover:bg-white/5"><ChevronRight className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ) : (
                        <BSCScanTransactions />
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <div className="text-xs font-black text-white uppercase italic">Protocol Reconciliation</div>
                    <p className="text-[10px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">
                        This ledger aggregates data from the `Deposit`, `Withdrawal`, and `Commission` protocols. All entries are cryptographically linked to their respective on-chain events on the Binance Smart Chain.
                    </p>
                </div>
            </div>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
