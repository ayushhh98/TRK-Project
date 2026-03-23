'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowDownLeft, ArrowUpRight, RefreshCcw, Search, Filter,
    ExternalLink, TrendingUp, TrendingDown, DollarSign, Activity,
    Ticket, Star, Users, BarChart3, Copy, CheckCircle2,
    Globe, RefreshCw, Layers, Cpu, Zap, Activity as ActivityIcon,
    Radio, ShieldCheck, Terminal, Search as SearchIcon, ExternalLink as ExternalIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/api';
import { format } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Transaction {
    id: string;
    type: string;
    walletAddress: string;
    amount: number;
    fee: number;
    netAmount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    txHash?: string;
    source?: string;
    createdAt: string;
}

interface Analytics {
    allTime: { inflow: number; outflow: number; netBalance: number; count: number };
    today: { inflow: number; outflow: number; count: number };
    byType: { _id: string; total: number; count: number }[];
    systemHealth: 'HEALTHY' | 'WARNING';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TX_TYPES = [
    { value: 'All', label: 'All Types' },
    { value: 'DEPOSIT', label: 'Deposits' },
    { value: 'WITHDRAWAL', label: 'Withdrawals' },
    { value: 'REFERRAL', label: 'Referral' },
    { value: 'CASHBACK', label: 'Cashback' },
    { value: 'ROI_ON_ROI', label: 'ROI on ROI' },
    { value: 'LUCKY_DRAW_TICKET', label: 'Lucky Draw Entry' },
    { value: 'LUCKY_DRAW_REWARD', label: 'Lucky Draw Win' },
    { value: 'GAME_WIN', label: 'Game Win' },
    { value: 'GAME_ENTRY', label: 'Game Entry' },
];

const DATE_RANGES = ['All', 'Today', '7d', '30d'];

const TYPE_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    DEPOSIT:           { color: 'text-emerald-400 bg-emerald-400/10', icon: ArrowDownLeft,  label: 'Deposit' },
    WITHDRAWAL:        { color: 'text-red-400 bg-red-400/10',         icon: ArrowUpRight,   label: 'Withdrawal' },
    REFERRAL:          { color: 'text-blue-400 bg-blue-400/10',       icon: Users,          label: 'Referral' },
    CASHBACK:          { color: 'text-amber-400 bg-amber-400/10',     icon: TrendingUp,     label: 'Cashback' },
    ROI_ON_ROI:        { color: 'text-cyan-400 bg-cyan-400/10',       icon: BarChart3,      label: 'ROI·ROI' },
    LUCKY_DRAW_TICKET: { color: 'text-purple-400 bg-purple-400/10',   icon: Ticket,         label: 'Lucky Draw' },
    LUCKY_DRAW_REWARD: { color: 'text-yellow-400 bg-yellow-400/10',   icon: Star,           label: 'Draw Win' },
    GAME_WIN:          { color: 'text-green-400 bg-green-400/10',     icon: TrendingUp,     label: 'Game Win' },
    GAME_ENTRY:        { color: 'text-orange-400 bg-orange-400/10',   icon: Activity,       label: 'Game Entry' },
};

const STATUS_CONFIG: Record<string, string> = {
    COMPLETED: 'text-emerald-400 bg-emerald-400/10',
    PENDING:   'text-amber-400 bg-amber-400/10',
    FAILED:    'text-red-400 bg-red-400/10',
};

function fmt(n: number) { return n?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'; }
function shortAddr(addr: string) { return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'; }

// ─── Component ───────────────────────────────────────────────────────────────

export default function MasterLedgerDashboard() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [dateRange, setDateRange] = useState('All');
    const [page, setPage] = useState(1);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // BscScan
    const [bscScanHistory, setBscScanHistory] = useState<any[]>([]);
    const [bscLoading, setBscLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'FORRENSIC' | 'BLOCKCHAIN'>('FORRENSIC');

    const token = getToken();

    const fetchAnalytics = useCallback(async () => {
        setAnalyticsLoading(true);
        try {
            const res = await fetch('/api/admin/transactions/analytics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const d = await res.json();
            if (d.status === 'success') setAnalytics(d.data);
        } catch (e) { console.error(e); } finally {
            setAnalyticsLoading(false);
        }
    }, [token]);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: '50',
                ...(typeFilter !== 'All' && { type: typeFilter }),
                ...(dateRange !== 'All' && { dateRange }),
                ...(search && { q: search }),
            });
            const res = await fetch(`/api/admin/transactions?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const d = await res.json();
            if (d.status === 'success') {
                setTransactions(d.data.transactions || []);
                setTotal(d.data.total || 0);
                setTotalPages(d.data.totalPages || 1);
            }
        } catch (e) { console.error(e); } finally {
            setLoading(false);
        }
    }, [token, page, typeFilter, dateRange, search]);

    const fetchBscScanHistory = useCallback(async () => {
        try {
            setBscLoading(true);
            const res = await fetch('/api/admin/financials/bscscan-history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.status === 'success') {
                setBscScanHistory(data.data);
            }
        } catch (e) {
            console.error('BscScan fetch error', e);
        } finally {
            setBscLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    useEffect(() => {
        fetchBscScanHistory();
        const timer = setInterval(fetchBscScanHistory, 30000);
        return () => clearInterval(timer);
    }, [fetchBscScanHistory]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const isHealthy = analytics?.systemHealth === 'HEALTHY';

    return (
        <div className="min-h-screen bg-black text-white/90 p-8 space-y-8 pb-32">
            {/* ── Header ── */}
            <div className={cn(
                "relative overflow-hidden rounded-[36px] border p-10 transition-all duration-700",
                isHealthy
                    ? "border-emerald-500/10 bg-emerald-500/5 shadow-[0_0_60px_rgba(52,211,153,0.04)]"
                    : "border-red-500/20 bg-red-500/5 shadow-[0_0_60px_rgba(239,68,68,0.08)]"
            )}>
                <div className={cn("absolute top-0 right-0 w-[600px] h-[600px] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 opacity-30",
                    isHealthy ? "bg-emerald-500/10" : "bg-red-500/10")} />
                <div className="relative flex flex-col lg:flex-row items-start gap-8 justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Badge className={cn("text-[10px] font-black uppercase tracking-[0.4em] px-4 py-1.5 rounded-full",
                                isHealthy ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/20 text-red-400 border-red-500/30")}>
                                Ledger_Protocol: {isHealthy ? 'HEALTHY' : 'WARNING'}
                            </Badge>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                <ActivityIcon className={cn("h-2.5 w-2.5", isHealthy ? "text-emerald-500" : "text-red-500 animate-ping")} />
                                <span className="text-[9px] font-black uppercase tracking-wider">Live_Sync</span>
                            </div>
                        </div>
                        <h1 className="text-6xl font-display font-black tracking-tighter italic uppercase">
                            MASTER<span className={isHealthy ? "text-emerald-400" : "text-red-400"}>LEDGER</span>
                        </h1>
                        <p className="text-white/30 font-mono text-[10px] uppercase tracking-[0.5em]">
                            Forensic Money Flow Audit // All Transactions
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-white/5 p-6 rounded-[24px] border border-white/10 backdrop-blur-xl">
                        <div className="text-center px-4 border-r border-white/10">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Net Balance</div>
                            <div className={cn("text-2xl font-display font-black italic", isHealthy ? "text-emerald-400" : "text-red-400")}>
                                ${analyticsLoading ? '—' : fmt(analytics?.allTime.netBalance || 0)}
                            </div>
                        </div>
                        <div className="text-center px-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Tx Count</div>
                            <div className="text-2xl font-display font-black italic text-white">
                                {analyticsLoading ? '—' : (analytics?.allTime.count || 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Analytics Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Inflow', value: analytics?.allTime.inflow, icon: ArrowDownLeft, color: 'text-emerald-400', bg: 'from-emerald-500/5 to-transparent border-emerald-500/10' },
                    { label: 'Total Outflow', value: analytics?.allTime.outflow, icon: ArrowUpRight, color: 'text-red-400', bg: 'from-red-500/5 to-transparent border-red-500/10' },
                    { label: "Today's Inflow", value: analytics?.today.inflow, icon: TrendingUp, color: 'text-blue-400', bg: 'from-blue-500/5 to-transparent border-blue-500/10' },
                    { label: "Today's Outflow", value: analytics?.today.outflow, icon: TrendingDown, color: 'text-orange-400', bg: 'from-orange-500/5 to-transparent border-orange-500/10' },
                ].map((card, i) => (
                    <Card key={i} className={cn("bg-gradient-to-br border", card.bg, "overflow-hidden relative")}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center bg-white/5")}>
                                    <card.icon className={cn("h-4 w-4", card.color)} />
                                </div>
                            </div>
                            <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">{card.label}</div>
                            <div className={cn("text-2xl font-display font-black italic", card.color)}>
                                ${analyticsLoading ? '—' : fmt(card.value || 0)}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-8 border-b border-white/5 pb-4">
                <button 
                    onClick={() => setActiveTab('FORRENSIC')}
                    className={cn(
                        "text-xs font-black uppercase tracking-[0.2em] pb-2 transition-all relative",
                        activeTab === 'FORRENSIC' ? "text-white" : "text-white/20 hover:text-white/40"
                    )}
                >
                    Forensic_Ledger
                    {activeTab === 'FORRENSIC' && <motion.div layoutId="tab-underline" className="absolute bottom-[-17px] left-0 right-0 h-1 bg-white" />}
                </button>
                <button 
                    onClick={() => setActiveTab('BLOCKCHAIN')}
                    className={cn(
                        "text-xs font-black uppercase tracking-[0.2em] pb-2 transition-all relative flex items-center gap-2",
                        activeTab === 'BLOCKCHAIN' ? "text-blue-400" : "text-white/20 hover:text-white/40"
                    )}
                >
                    <Globe className="h-3 w-3" />
                    BscScan_Live_Sync
                    {activeTab === 'BLOCKCHAIN' && <motion.div layoutId="tab-underline" className="absolute bottom-[-17px] left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />}
                </button>
            </div>

            {activeTab === 'FORRENSIC' ? (
                <>
                    {/* ── Filters Row ── */}
                    <Card className="bg-[#0a0a0a] border-white/5">
                        <CardContent className="p-6 flex flex-col lg:flex-row gap-4 items-center">
                            <div className="relative flex-1 w-full">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                                <Input
                                    placeholder="Search wallet, tx hash, or source..."
                                    className="pl-10 bg-white/5 border-white/10 rounded-xl focus:border-white/20 h-11"
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {DATE_RANGES.map(dr => (
                                    <Button key={dr} size="sm" onClick={() => { setDateRange(dr); setPage(1); }}
                                        className={cn("text-[10px] font-black uppercase h-9 px-4 rounded-lg",
                                            dateRange === dr ? "bg-white text-black" : "bg-white/5 border-white/10 border text-white/60 hover:bg-white/10"
                                        )}>
                                        {dr}
                                    </Button>
                                ))}
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => { fetchTransactions(); fetchAnalytics(); }}
                                className="h-9 w-9 p-0 rounded-lg border border-white/10">
                                <RefreshCcw className="h-4 w-4 text-white/40" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* ── Type Filter Chips ── */}
                    <div className="flex gap-2 flex-wrap">
                        {TX_TYPES.map(t => (
                            <button key={t.value} onClick={() => { setTypeFilter(t.value); setPage(1); }}
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all",
                                    typeFilter === t.value
                                        ? "bg-white text-black border-white"
                                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                                )}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Master Ledger Table ── */}
                    <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden">
                        <CardHeader className="border-b border-white/5 p-6 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-black italic uppercase tracking-widest text-white/70">
                                    Forensic Ledger
                                </CardTitle>
                                <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest mt-1">
                                    {total.toLocaleString()} records • Page {page}/{totalPages}
                                </p>
                            </div>
                            <Badge className={cn("text-[9px] font-black uppercase tracking-widest",
                                isHealthy ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                                {isHealthy ? 'LEDGER_V2' : 'LEGACY_MODE'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                            {['Type', 'Wallet', 'Amount', 'Fee', 'Net', 'Status', 'Hash', 'Date'].map(h => (
                                                <th key={h} className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-[0.3em] text-white/25">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AnimatePresence mode="popLayout">
                                            {loading ? (
                                                Array.from({ length: 8 }).map((_, i) => (
                                                    <tr key={i} className="border-b border-white/5">
                                                        {Array.from({ length: 8 }).map((_, j) => (
                                                            <td key={j} className="px-6 py-5">
                                                                <div className="h-3 bg-white/5 rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            ) : transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-6 py-20 text-center text-white/20 text-[11px] font-black uppercase tracking-widest">
                                                        No transactions found
                                                    </td>
                                                </tr>
                                            ) : transactions.map((tx) => {
                                                const cfg = TYPE_CONFIG[tx.type] || { color: 'text-white/50 bg-white/5', icon: DollarSign, label: tx.type };
                                                const Icon = cfg.icon;
                                                const isInflow = !['WITHDRAWAL', 'GAME_ENTRY', 'LUCKY_DRAW_TICKET'].includes(tx.type);
                                                return (
                                                    <motion.tr key={tx.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                                        <td className="px-6 py-5">
                                                            <div className={cn("flex items-center gap-2 px-2.5 py-1 rounded-lg w-fit text-[9px] font-black uppercase tracking-wider", cfg.color)}>
                                                                <Icon className="h-3 w-3" />
                                                                {cfg.label}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <button
                                                                onClick={() => copyToClipboard(tx.walletAddress || '', `wallet-${tx.id}`)}
                                                                className="flex items-center gap-1.5 font-mono text-[10px] text-white/70 hover:text-white transition-colors">
                                                                {shortAddr(tx.walletAddress || '')}
                                                                {copiedId === `wallet-${tx.id}` ? (
                                                                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className={cn("font-display font-black text-sm", isInflow ? "text-emerald-400" : "text-red-400")}>
                                                                {isInflow ? '+' : '-'}${fmt(tx.amount)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className="text-[11px] text-white/30 font-mono">${fmt(tx.fee || 0)}</span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className="text-[11px] text-white/60 font-mono font-black">${fmt(tx.netAmount || tx.amount)}</span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <Badge className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5",
                                                                STATUS_CONFIG[tx.status] || 'text-white/40 bg-white/5')}>
                                                                {tx.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            {tx.txHash ? (
                                                                <a href={`https://bscscan.com/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                                                                    className="flex items-center gap-1 text-[10px] font-mono text-blue-400 hover:text-blue-300">
                                                                    {tx.txHash.slice(0, 8)}...
                                                                    <ExternalIcon className="h-3 w-3" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-white/20 text-[10px]">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="text-[10px] font-mono text-white/40">
                                                                {format(new Date(tx.createdAt), 'MMM dd, HH:mm')}
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="border-t border-white/5 p-4 flex items-center justify-between">
                                <span className="text-[10px] text-white/30 font-mono uppercase tracking-wider">
                                    {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} of {total.toLocaleString()}
                                </span>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="border-white/10 bg-white/5 text-white/50 text-[10px] font-black h-8 px-3">
                                        ← Prev
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                        className="border-white/10 bg-white/5 text-white/50 text-[10px] font-black h-8 px-3">
                                        Next →
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </>
            ) : (
                <Card className="bg-[#0a0a0a] border-white/5 overflow-hidden">
                    <CardHeader className="border-b border-white/5 p-8 flex flex-row items-center justify-between bg-blue-500/[0.02]">
                        <div className="flex items-center gap-6">
                            <div className="h-16 w-16 rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                <Globe className="h-8 w-8 text-blue-400 animate-[spin_10s_linear_infinite]" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">
                                    ON-CHAIN_FLOW_PROXIMITY
                                </CardTitle>
                                <div className="flex items-center gap-3 mt-1">
                                    <Badge className="bg-blue-500/10 text-blue-400 border-none font-black italic text-[9px]">REAL_TIME_SEQUENCING</Badge>
                                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 font-mono text-[8px] text-white/40">
                                        <ActivityIcon className="h-2.5 w-2.5 text-blue-500" />
                                        POLLING_ACTIVE_30S
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchBscScanHistory}
                            disabled={bscLoading}
                            className="bg-white/5 border-white/10 text-white/60 font-black italic text-[10px] uppercase h-10 px-6 rounded-xl hover:bg-white/10"
                        >
                            {bscLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            Sync_Sequence
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/[0.02]">
                                        {['Hash', 'Block', 'From', 'To', 'Value (USDT)', 'Status'].map(h => (
                                            <th key={h} className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-[0.4em] text-white/20">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode="popLayout">
                                        {bscScanHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-32 text-center text-white/10 font-black italic uppercase tracking-[0.5em] text-sm">
                                                    {bscLoading ? 'Fetching Blockchain Sequence...' : 'No On-Chain Activity Detected'}
                                                </td>
                                            </tr>
                                        ) : (
                                            bscScanHistory.map((tx: any, idx: number) => (
                                                <motion.tr 
                                                    key={tx.hash + idx}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="border-b border-white/5 hover:bg-white/[0.01] transition-all group"
                                                >
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10 group-hover:border-blue-500/30 transition-all">
                                                                <ExternalIcon className="h-3.5 w-3.5" />
                                                            </div>
                                                            <a 
                                                                href={`https://bscscan.com/tx/${tx.hash}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-white/60 font-mono text-[11px] group-hover:text-blue-400 transition-colors"
                                                            >
                                                                {tx.hash.slice(0, 12)}...{tx.hash.slice(-10)}
                                                            </a>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <Badge variant="outline" className="border-white/5 bg-white/[0.02] text-white/40 font-mono text-[10px] px-3 py-1">
                                                            {tx.blockNumber}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="text-white/40 font-mono text-[10px]">{tx.from.slice(0, 8)}...{tx.from.slice(-6)}</div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="text-white/40 font-mono text-[10px]">{tx.to.slice(0, 8)}...{tx.to.slice(-6)}</div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xl font-display font-black italic text-white group-hover:text-emerald-400 transition-colors">
                                                                {(Number(tx.value) / 10**Number(tx.tokenDecimal)).toLocaleString()}
                                                            </span>
                                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-1">USDT</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Finalized</span>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
